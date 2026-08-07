export const MESH_LIMITS = Object.freeze({
  segmentsMin: 2,
  segmentsMax: 512,
  radialMin: 3,
  radialMax: 64
});

function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  const finite = Number.isFinite(parsed) ? Math.round(parsed) : fallback;
  return Math.min(max, Math.max(min, finite));
}

export function normalizeMeshBudget({ segments, radial } = {}) {
  return {
    segments: clampInteger(segments, 32, MESH_LIMITS.segmentsMin, MESH_LIMITS.segmentsMax),
    radial: clampInteger(radial, 8, MESH_LIMITS.radialMin, MESH_LIMITS.radialMax)
  };
}
