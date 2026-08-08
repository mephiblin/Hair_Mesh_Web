export const FFD_RESOLUTIONS = Object.freeze([2, 4, 8]);

function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeFfdResolution(value, fallback = 2) {
  const parsed = Math.round(finiteNumber(value, fallback));
  return FFD_RESOLUTIONS.includes(parsed) ? parsed : FFD_RESOLUTIONS.includes(fallback) ? fallback : 2;
}

export function ffdPointCount(resolution) {
  const size = normalizeFfdResolution(resolution);
  return size * size * size;
}

export function ffdLatticeIndex(x, y, z, resolution) {
  const size = normalizeFfdResolution(resolution);
  return x + size * (y + size * z);
}

export function ffdLatticeCoordinates(index, resolution) {
  const size = normalizeFfdResolution(resolution);
  const safe = Math.min(Math.max(Math.round(finiteNumber(index)), 0), size ** 3 - 1);
  const z = Math.floor(safe / (size * size));
  const rest = safe - z * size * size;
  const y = Math.floor(rest / size);
  return [rest - y * size, y, z];
}

export function createFfdModifier(id, resolution = 2) {
  const size = normalizeFfdResolution(resolution);
  return {
    id:Math.max(1, Math.round(finiteNumber(id, 1))),
    type:'ffd',
    name:`FFD ${size}×${size}×${size}`,
    resolution:size,
    enabled:true,
    offsets:Array.from({ length:size ** 3 }, () => [0, 0, 0])
  };
}

export function normalizeFfdModifier(modifier = {}, fallbackId = 1) {
  const resolution = normalizeFfdResolution(modifier.resolution);
  const count = resolution ** 3;
  const offsets = Array.from({ length:count }, (_, index) => {
    const source = modifier.offsets?.[index];
    return [finiteNumber(source?.[0]), finiteNumber(source?.[1]), finiteNumber(source?.[2])];
  });
  return {
    id:Math.max(1, Math.round(finiteNumber(modifier.id, fallbackId))),
    type:'ffd',
    name:String(modifier.name || `FFD ${resolution}×${resolution}×${resolution}`),
    resolution,
    enabled:modifier.enabled !== false,
    offsets
  };
}

export function cloneFfdModifier(modifier, id = modifier?.id) {
  return normalizeFfdModifier({ ...modifier, id, offsets:modifier?.offsets?.map(offset => [...offset]) }, id);
}

export function topologyBounds(topology) {
  const positions = topology?.positions || [];
  if (!positions.length) return { min:[0, 0, 0], max:[0, 0, 0], size:[0, 0, 0] };
  const min = [...positions[0]], max = [...positions[0]];
  positions.forEach(position => {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], position[axis]);
      max[axis] = Math.max(max[axis], position[axis]);
    }
  });
  return { min, max, size:max.map((value, axis) => value - min[axis]) };
}

function cloneTopology(topology, positions = topology?.positions || []) {
  return {
    ...topology,
    positions:positions.map(position => [...position]),
    faces:(topology?.faces || []).map(face => [...face]),
    uvs:(topology?.uvs || []).map(uv => [...uv]),
    faceUvs:(topology?.faceUvs || []).map(face => face ? [...face] : null)
  };
}

function binomial(n, k) {
  let value = 1;
  for (let i = 1; i <= k; i++) value = value * (n - k + i) / i;
  return value;
}

function bernsteinWeights(resolution, parameter) {
  const degree = resolution - 1;
  const t = Math.min(1, Math.max(0, parameter));
  return Array.from({ length:resolution }, (_, index) => binomial(degree, index) * (t ** index) * ((1 - t) ** (degree - index)));
}

function activeOffsets(modifier) {
  return modifier.offsets.flatMap((offset, index) => {
    if (Math.abs(offset[0]) + Math.abs(offset[1]) + Math.abs(offset[2]) < 1e-14) return [];
    return [{ index, offset, coordinates:ffdLatticeCoordinates(index, modifier.resolution) }];
  });
}

export function ffdControlPointPositions(topology, rawModifier) {
  const modifier = normalizeFfdModifier(rawModifier);
  const bounds = topologyBounds(topology);
  const denominator = modifier.resolution - 1;
  return modifier.offsets.map((offset, index) => {
    const coordinates = ffdLatticeCoordinates(index, modifier.resolution);
    return coordinates.map((coordinate, axis) => bounds.min[axis] + bounds.size[axis] * (coordinate / denominator + offset[axis]));
  });
}

export function setFfdControlPointPosition(topology, rawModifier, pointIndex, position) {
  const modifier = normalizeFfdModifier(rawModifier);
  const index = Math.min(Math.max(Math.round(finiteNumber(pointIndex)), 0), modifier.offsets.length - 1);
  const bounds = topologyBounds(topology);
  const coordinates = ffdLatticeCoordinates(index, modifier.resolution);
  const denominator = modifier.resolution - 1;
  modifier.offsets[index] = coordinates.map((coordinate, axis) => {
    const size = Math.abs(bounds.size[axis]) > 1e-12 ? bounds.size[axis] : 1;
    const base = bounds.min[axis] + bounds.size[axis] * coordinate / denominator;
    return (finiteNumber(position?.[axis], base) - base) / size;
  });
  return modifier;
}

export function applyFfdModifier(topology, rawModifier) {
  const modifier = normalizeFfdModifier(rawModifier);
  if (!modifier.enabled) return cloneTopology(topology);
  const moved = activeOffsets(modifier);
  if (!moved.length) return cloneTopology(topology);
  const bounds = topologyBounds(topology);
  const positions = (topology?.positions || []).map(position => {
    const parameters = position.map((value, axis) => Math.abs(bounds.size[axis]) > 1e-12 ? (value - bounds.min[axis]) / bounds.size[axis] : .5);
    const weights = parameters.map(parameter => bernsteinWeights(modifier.resolution, parameter));
    const displacement = [0, 0, 0];
    moved.forEach(({ offset, coordinates }) => {
      const weight = weights[0][coordinates[0]] * weights[1][coordinates[1]] * weights[2][coordinates[2]];
      for (let axis = 0; axis < 3; axis++) displacement[axis] += weight * offset[axis] * (Math.abs(bounds.size[axis]) > 1e-12 ? bounds.size[axis] : 1);
    });
    return position.map((value, axis) => value + displacement[axis]);
  });
  return cloneTopology(topology, positions);
}

export function evaluateFfdStack(baseTopology, modifiers = [], { stopBeforeId = null } = {}) {
  let topology = cloneTopology(baseTopology);
  for (const rawModifier of modifiers) {
    const modifier = normalizeFfdModifier(rawModifier);
    if (modifier.id === stopBeforeId) break;
    topology = applyFfdModifier(topology, modifier);
  }
  return topology;
}
