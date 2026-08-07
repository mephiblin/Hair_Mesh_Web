export function canEditCurve(curve) {
  return Boolean(curve && curve.visible !== false && curve.locked !== true);
}

export function hasReadyMesh({ enabled, status, hasTopology } = {}) {
  return Boolean(enabled && status === 'ready' && hasTopology);
}
