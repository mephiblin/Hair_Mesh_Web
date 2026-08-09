export const DEFAULT_SOFT_SELECTION_SETTINGS = Object.freeze({
  enabled:false,
  falloff:1
});

export const SOFT_SELECTION_LIMITS = Object.freeze({
  falloffMin:0.001,
  falloffMax:10000,
  segmentSamples:12,
  weightEpsilon:1e-4
});

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function vector3(value) {
  if (Array.isArray(value)) return [finiteNumber(value[0], 0), finiteNumber(value[1], 0), finiteNumber(value[2], 0)];
  return [finiteNumber(value?.x, 0), finiteNumber(value?.y, 0), finiteNumber(value?.z, 0)];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function cubicPoint(a, b, c, d, t) {
  const oneMinusT = 1 - t;
  const aWeight = oneMinusT ** 3;
  const bWeight = 3 * oneMinusT ** 2 * t;
  const cWeight = 3 * oneMinusT * t ** 2;
  const dWeight = t ** 3;
  return [
    a[0] * aWeight + b[0] * bWeight + c[0] * cWeight + d[0] * dWeight,
    a[1] * aWeight + b[1] * bWeight + c[1] * cWeight + d[1] * dWeight,
    a[2] * aWeight + b[2] * bWeight + c[2] * cWeight + d[2] * dWeight
  ];
}

export function normalizeSoftSelectionSettings(settings = {}) {
  const falloff = finiteNumber(settings.falloff, DEFAULT_SOFT_SELECTION_SETTINGS.falloff);
  return {
    enabled:settings.enabled === true,
    falloff:Math.min(SOFT_SELECTION_LIMITS.falloffMax, Math.max(SOFT_SELECTION_LIMITS.falloffMin, falloff))
  };
}

export function approximateBezierSegmentLength(startPoint, endPoint, samples = SOFT_SELECTION_LIMITS.segmentSamples) {
  const start = vector3(startPoint?.position);
  const end = vector3(endPoint?.position);
  const controlA = add(start, vector3(startPoint?.outTangent));
  const controlB = add(end, vector3(endPoint?.inTangent));
  const sampleCount = Math.max(2, Math.trunc(finiteNumber(samples, SOFT_SELECTION_LIMITS.segmentSamples)));
  let length = 0;
  let previous = start;
  for (let index = 1; index <= sampleCount; index += 1) {
    const current = cubicPoint(start, controlA, controlB, end, index / sampleCount);
    length += distance(previous, current);
    previous = current;
  }
  return length;
}

export function curvePointDistances(points = []) {
  const distances = new Array(points.length).fill(0);
  for (let index = 1; index < points.length; index += 1) {
    distances[index] = distances[index - 1] + approximateBezierSegmentLength(points[index - 1], points[index]);
  }
  return distances;
}

export function softSelectionWeight(distanceFromSelection, falloff) {
  const safeFalloff = normalizeSoftSelectionSettings({ falloff }).falloff;
  const distanceValue = Math.max(0, finiteNumber(distanceFromSelection, safeFalloff));
  if (distanceValue >= safeFalloff) return 0;
  const remaining = 1 - distanceValue / safeFalloff;
  return remaining * remaining * (3 - 2 * remaining);
}

export function curveSoftSelectionWeights(points = [], selectedIndices = [], settings = DEFAULT_SOFT_SELECTION_SETTINGS) {
  const normalized = normalizeSoftSelectionSettings(settings);
  const selected = new Set([...selectedIndices || []]
    .map(Number)
    .filter(index => Number.isInteger(index) && index >= 0 && index < points.length));
  const weights = new Array(points.length).fill(0);
  if (!selected.size) return weights;
  selected.forEach(index => { weights[index] = 1; });
  if (!normalized.enabled) return weights;

  const distances = curvePointDistances(points);
  for (let index = 0; index < points.length; index += 1) {
    if (selected.has(index)) continue;
    let nearest = Infinity;
    selected.forEach(selectedIndex => {
      nearest = Math.min(nearest, Math.abs(distances[index] - distances[selectedIndex]));
    });
    weights[index] = softSelectionWeight(nearest, normalized.falloff);
  }
  return weights;
}

export function softSelectedPointIndices(weights = [], epsilon = SOFT_SELECTION_LIMITS.weightEpsilon) {
  const threshold = Math.max(0, finiteNumber(epsilon, SOFT_SELECTION_LIMITS.weightEpsilon));
  return weights.flatMap((weight, index) => finiteNumber(weight, 0) > threshold ? [index] : []);
}
