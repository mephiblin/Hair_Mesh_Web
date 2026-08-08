export const REFERENCE_WIRE_DEFAULTS = Object.freeze({
  mode: 'off',
  color: '#70d7ff'
});

export const REFERENCE_WIRE_MODES = Object.freeze(['off', 'wire', 'overlay']);

export function normalizeReferenceWireMode(value, fallback = REFERENCE_WIRE_DEFAULTS.mode) {
  return REFERENCE_WIRE_MODES.includes(value) ? value : fallback;
}

export function normalizeReferenceWireColor(value, fallback = REFERENCE_WIRE_DEFAULTS.color) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

export function referenceWireUsesSurfaceDepthBias(value) {
  return normalizeReferenceWireMode(value) === 'overlay';
}
