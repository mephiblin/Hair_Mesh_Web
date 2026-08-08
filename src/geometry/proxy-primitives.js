export const PROXY_TYPES = Object.freeze(['box', 'sphere', 'quad-sphere', 'cylinder']);

export const PROXY_LIMITS = Object.freeze({
  dimension: Object.freeze({ min:0.001, max:10000 }),
  boxSegments: Object.freeze({ min:1, max:128 }),
  sphereSegments: Object.freeze({ min:3, max:256 }),
  sphereRings: Object.freeze({ min:2, max:128 }),
  quadSphereSegments: Object.freeze({ min:1, max:64 }),
  cylinderSides: Object.freeze({ min:3, max:256 }),
  cylinderHeightSegments: Object.freeze({ min:1, max:128 }),
  cylinderCapSegments: Object.freeze({ min:1, max:128 })
});

const DEFAULTS = Object.freeze({
  box: Object.freeze({
    width:1,
    height:1,
    depth:1,
    widthSegments:1,
    heightSegments:1,
    depthSegments:1,
    smooth:false,
    showEdges:true
  }),
  sphere: Object.freeze({
    radius:0.5,
    segments:24,
    rings:16,
    smooth:true,
    showEdges:true
  }),
  'quad-sphere': Object.freeze({
    radius:0.5,
    segments:4,
    smooth:true,
    showEdges:true
  }),
  cylinder: Object.freeze({
    radius:0.5,
    height:1,
    sides:24,
    heightSegments:1,
    capSegments:1,
    smooth:true,
    showEdges:true
  })
});

function clampNumber(value, fallback, limits) {
  const parsed = Number(value);
  const finite = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(limits.max, Math.max(limits.min, finite));
}

function clampInteger(value, fallback, limits) {
  return Math.round(clampNumber(value, fallback, limits));
}

export function normalizeProxyType(value) {
  return PROXY_TYPES.includes(value) ? value : 'box';
}

export function defaultProxySettings(type = 'box') {
  return { ...DEFAULTS[normalizeProxyType(type)] };
}

export function normalizeProxySettings(type, settings = {}) {
  const normalizedType = normalizeProxyType(type);
  const defaults = DEFAULTS[normalizedType];
  const common = {
    smooth: settings.smooth == null ? defaults.smooth : settings.smooth !== false,
    showEdges: settings.showEdges !== false
  };
  if (normalizedType === 'box') return {
    width:clampNumber(settings.width, defaults.width, PROXY_LIMITS.dimension),
    height:clampNumber(settings.height, defaults.height, PROXY_LIMITS.dimension),
    depth:clampNumber(settings.depth, defaults.depth, PROXY_LIMITS.dimension),
    widthSegments:clampInteger(settings.widthSegments, defaults.widthSegments, PROXY_LIMITS.boxSegments),
    heightSegments:clampInteger(settings.heightSegments, defaults.heightSegments, PROXY_LIMITS.boxSegments),
    depthSegments:clampInteger(settings.depthSegments, defaults.depthSegments, PROXY_LIMITS.boxSegments),
    ...common
  };
  if (normalizedType === 'sphere') return {
    radius:clampNumber(settings.radius, defaults.radius, PROXY_LIMITS.dimension),
    segments:clampInteger(settings.segments, defaults.segments, PROXY_LIMITS.sphereSegments),
    rings:clampInteger(settings.rings, defaults.rings, PROXY_LIMITS.sphereRings),
    ...common
  };
  if (normalizedType === 'quad-sphere') return {
    radius:clampNumber(settings.radius, defaults.radius, PROXY_LIMITS.dimension),
    segments:clampInteger(settings.segments, defaults.segments, PROXY_LIMITS.quadSphereSegments),
    ...common
  };
  return {
    radius:clampNumber(settings.radius, defaults.radius, PROXY_LIMITS.dimension),
    height:clampNumber(settings.height, defaults.height, PROXY_LIMITS.dimension),
    sides:clampInteger(settings.sides, defaults.sides, PROXY_LIMITS.cylinderSides),
    heightSegments:clampInteger(settings.heightSegments, defaults.heightSegments, PROXY_LIMITS.cylinderHeightSegments),
    capSegments:clampInteger(settings.capSegments, defaults.capSegments, PROXY_LIMITS.cylinderCapSegments),
    ...common
  };
}

function emptyTopology(source) {
  return { positions:[], faces:[], uvs:[], faceUvs:[], source };
}

function addGridFace(topology, origin, uVector, vVector, uSegments, vSegments, vertexForPoint = null) {
  const indices = [];
  for (let v = 0; v <= vSegments; v++) {
    const row = [];
    for (let u = 0; u <= uSegments; u++) {
      const point = [
        origin[0] + uVector[0] * (u / uSegments) + vVector[0] * (v / vSegments),
        origin[1] + uVector[1] * (u / uSegments) + vVector[1] * (v / vSegments),
        origin[2] + uVector[2] * (u / uSegments) + vVector[2] * (v / vSegments)
      ];
      const index = vertexForPoint ? vertexForPoint(point) : topology.positions.push(point) - 1;
      row.push(index);
    }
    indices.push(row);
  }
  for (let v = 0; v < vSegments; v++) {
    for (let u = 0; u < uSegments; u++) {
      topology.faces.push([indices[v][u], indices[v][u + 1], indices[v + 1][u + 1], indices[v + 1][u]]);
      topology.faceUvs.push(null);
    }
  }
}

function buildBox(settings) {
  const s = normalizeProxySettings('box', settings);
  const topology = emptyTopology('proxy:box');
  const x = s.width / 2, y = s.height / 2, z = s.depth / 2;
  addGridFace(topology, [-x,-y, z], [s.width,0,0], [0,s.height,0], s.widthSegments, s.heightSegments);
  addGridFace(topology, [ x,-y,-z], [-s.width,0,0], [0,s.height,0], s.widthSegments, s.heightSegments);
  addGridFace(topology, [ x,-y, z], [0,0,-s.depth], [0,s.height,0], s.depthSegments, s.heightSegments);
  addGridFace(topology, [-x,-y,-z], [0,0,s.depth], [0,s.height,0], s.depthSegments, s.heightSegments);
  addGridFace(topology, [-x, y, z], [s.width,0,0], [0,0,-s.depth], s.widthSegments, s.depthSegments);
  addGridFace(topology, [-x,-y,-z], [s.width,0,0], [0,0,s.depth], s.widthSegments, s.depthSegments);
  return topology;
}

function buildSphere(settings) {
  const s = normalizeProxySettings('sphere', settings);
  const topology = emptyTopology('proxy:sphere');
  const top = topology.positions.push([0, s.radius, 0]) - 1;
  const rings = [];
  for (let ring = 1; ring < s.rings; ring++) {
    const theta = Math.PI * ring / s.rings;
    const y = Math.cos(theta) * s.radius;
    const radius = Math.sin(theta) * s.radius;
    const row = [];
    for (let segment = 0; segment < s.segments; segment++) {
      const phi = Math.PI * 2 * segment / s.segments;
      row.push(topology.positions.push([Math.cos(phi) * radius, y, Math.sin(phi) * radius]) - 1);
    }
    rings.push(row);
  }
  const bottom = topology.positions.push([0, -s.radius, 0]) - 1;
  const first = rings[0];
  for (let i = 0; i < s.segments; i++) {
    const next = (i + 1) % s.segments;
    topology.faces.push([top, first[next], first[i]]);
    topology.faceUvs.push(null);
  }
  for (let ring = 0; ring < rings.length - 1; ring++) {
    const upper = rings[ring], lower = rings[ring + 1];
    for (let i = 0; i < s.segments; i++) {
      const next = (i + 1) % s.segments;
      topology.faces.push([upper[i], upper[next], lower[next], lower[i]]);
      topology.faceUvs.push(null);
    }
  }
  const last = rings[rings.length - 1];
  for (let i = 0; i < s.segments; i++) {
    const next = (i + 1) % s.segments;
    topology.faces.push([bottom, last[i], last[next]]);
    topology.faceUvs.push(null);
  }
  return topology;
}

function buildQuadSphere(settings) {
  const s = normalizeProxySettings('quad-sphere', settings);
  const topology = emptyTopology('proxy:quad-sphere');
  const vertices = new Map();
  const vertexForPoint = point => {
    const key = point.map(value => value.toFixed(12)).join(':');
    if (vertices.has(key)) return vertices.get(key);
    const length = Math.hypot(point[0], point[1], point[2]) || 1;
    const projected = point.map(value => value / length * s.radius);
    const index = topology.positions.push(projected) - 1;
    vertices.set(key, index);
    return index;
  };
  const n = s.segments;
  addGridFace(topology, [-1,-1, 1], [2,0,0], [0,2,0], n, n, vertexForPoint);
  addGridFace(topology, [ 1,-1,-1], [-2,0,0], [0,2,0], n, n, vertexForPoint);
  addGridFace(topology, [ 1,-1, 1], [0,0,-2], [0,2,0], n, n, vertexForPoint);
  addGridFace(topology, [-1,-1,-1], [0,0,2], [0,2,0], n, n, vertexForPoint);
  addGridFace(topology, [-1, 1, 1], [2,0,0], [0,0,-2], n, n, vertexForPoint);
  addGridFace(topology, [-1,-1,-1], [2,0,0], [0,0,2], n, n, vertexForPoint);
  return topology;
}

function addCylinderCap(topology, settings, y, top) {
  const center = topology.positions.push([0, y, 0]) - 1;
  let inner = null;
  for (let ring = 1; ring <= settings.capSegments; ring++) {
    const radius = settings.radius * ring / settings.capSegments;
    const current = [];
    for (let side = 0; side < settings.sides; side++) {
      const phi = Math.PI * 2 * side / settings.sides;
      current.push(topology.positions.push([Math.cos(phi) * radius, y, Math.sin(phi) * radius]) - 1);
    }
    for (let side = 0; side < settings.sides; side++) {
      const next = (side + 1) % settings.sides;
      const face = inner
        ? top
          ? [inner[side], inner[next], current[next], current[side]]
          : [inner[side], current[side], current[next], inner[next]]
        : top
          ? [center, current[next], current[side]]
          : [center, current[side], current[next]];
      topology.faces.push(face);
      topology.faceUvs.push(null);
    }
    inner = current;
  }
}

function buildCylinder(settings) {
  const s = normalizeProxySettings('cylinder', settings);
  const topology = emptyTopology('proxy:cylinder');
  const rings = [];
  for (let heightSegment = 0; heightSegment <= s.heightSegments; heightSegment++) {
    const y = -s.height / 2 + s.height * heightSegment / s.heightSegments;
    const ring = [];
    for (let side = 0; side < s.sides; side++) {
      const phi = Math.PI * 2 * side / s.sides;
      ring.push(topology.positions.push([Math.cos(phi) * s.radius, y, Math.sin(phi) * s.radius]) - 1);
    }
    rings.push(ring);
  }
  for (let heightSegment = 0; heightSegment < s.heightSegments; heightSegment++) {
    const lower = rings[heightSegment], upper = rings[heightSegment + 1];
    for (let side = 0; side < s.sides; side++) {
      const next = (side + 1) % s.sides;
      topology.faces.push([lower[side], upper[side], upper[next], lower[next]]);
      topology.faceUvs.push(null);
    }
  }
  addCylinderCap(topology, s, s.height / 2, true);
  addCylinderCap(topology, s, -s.height / 2, false);
  return topology;
}

export function buildProxyTopology(type, settings = {}) {
  const normalizedType = normalizeProxyType(type);
  if (normalizedType === 'box') return buildBox(settings);
  if (normalizedType === 'sphere') return buildSphere(settings);
  if (normalizedType === 'quad-sphere') return buildQuadSphere(settings);
  return buildCylinder(settings);
}

export function proxyTopologyStats(topology) {
  const faces = topology?.faces?.length || 0;
  return {
    vertices:topology?.positions?.length || 0,
    faces,
    triangles:(topology?.faces || []).reduce((total, face) => total + Math.max(0, face.length - 2), 0),
    quads:(topology?.faces || []).filter(face => face.length === 4).length
  };
}
