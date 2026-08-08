function normalizedPointCount(pointCount) {
  return Number.isFinite(Number(pointCount)) ? Math.max(0, Math.trunc(Number(pointCount))) : 0;
}

export function normalizePointSelection(indices, pointCount, fallbackIndex = null) {
  const count = normalizedPointCount(pointCount);
  const normalized = new Set();
  for (const value of indices || []) {
    const index = Number(value);
    if (Number.isInteger(index) && index >= 0 && index < count) normalized.add(index);
  }
  if (!normalized.size && Number.isInteger(fallbackIndex) && fallbackIndex >= 0 && fallbackIndex < count) {
    normalized.add(fallbackIndex);
  }
  return normalized;
}

export function allPointIndices(pointCount) {
  const count = normalizedPointCount(pointCount);
  return Array.from({ length: count }, (_value, index) => index);
}

export function selectedPointIndices(selection, pointCount, fallbackIndex = null) {
  return [...normalizePointSelection(selection, pointCount, fallbackIndex)].sort((a, b) => a - b);
}

export function togglePointSelection(selection, pointIndex, pointCount) {
  const normalized = normalizePointSelection(selection, pointCount);
  const index = Number(pointIndex);
  if (!Number.isInteger(index) || index < 0 || index >= normalizedPointCount(pointCount)) return normalized;
  if (normalized.has(index)) normalized.delete(index);
  else normalized.add(index);
  return normalized;
}
