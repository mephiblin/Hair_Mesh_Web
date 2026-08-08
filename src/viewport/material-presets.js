export const HAIR_MATERIAL_FALLBACK = 'studio-clay';
export const REFERENCE_MATERIAL_FALLBACK = 'original';

const PRESETS = {
  original: {
    label: 'Original Imported',
    kind: 'original',
    preview: { highlight: '#f4d98a', base: '#527f8b', shadow: '#242b31' }
  },
  'classic-teal': {
    label: 'Classic Teal',
    kind: 'standard',
    color: '#8fc7c7',
    roughness: 0.55,
    metalness: 0,
    preview: { highlight: '#d9ffff', base: '#71aeb0', shadow: '#1d3b41' }
  },
  'studio-clay': {
    label: 'MatCap · Studio Clay',
    kind: 'matcap',
    base: '#a58f7d',
    keyColor: '#ffe8c9',
    fill: '#8393a7',
    shadow: '#241f22',
    specular: '#fffaf1',
    ambient: 0.2,
    keyStrength: 0.78,
    fillStrength: 0.22,
    rimStrength: 0.12,
    specularStrength: 0.42,
    specularPower: 34,
    preview: { highlight: '#fff3dc', base: '#a58f7d', shadow: '#292329' }
  },
  'red-wax': {
    label: 'MatCap · Red Wax',
    kind: 'matcap',
    base: '#841f19',
    keyColor: '#ffb095',
    fill: '#7d4e61',
    shadow: '#210308',
    specular: '#ffe9d6',
    ambient: 0.17,
    keyStrength: 0.78,
    fillStrength: 0.18,
    rimStrength: 0.2,
    specularStrength: 0.48,
    specularPower: 42,
    preview: { highlight: '#ffcab1', base: '#8f241d', shadow: '#210308' }
  },
  silver: {
    label: 'MatCap · Silver',
    kind: 'matcap',
    base: '#78818b',
    keyColor: '#f5fbff',
    fill: '#7897bb',
    shadow: '#121820',
    specular: '#ffffff',
    ambient: 0.16,
    keyStrength: 0.62,
    fillStrength: 0.25,
    rimStrength: 0.24,
    specularStrength: 0.78,
    specularPower: 64,
    preview: { highlight: '#ffffff', base: '#8793a0', shadow: '#17202b' }
  },
  'normal-check': {
    label: 'Normal Check',
    kind: 'normal',
    preview: { highlight: '#88f2ff', base: '#9a63dc', shadow: '#ea557e' }
  }
};

export const VIEWPORT_MATERIAL_PRESETS = Object.freeze(
  Object.fromEntries(Object.entries(PRESETS).map(([key, value]) => [key, Object.freeze(value)]))
);

export function normalizeViewportMaterialPreset(value, { allowOriginal = false, fallback } = {}) {
  const defaultValue = fallback || (allowOriginal ? REFERENCE_MATERIAL_FALLBACK : HAIR_MATERIAL_FALLBACK);
  if (typeof value !== 'string' || !Object.hasOwn(VIEWPORT_MATERIAL_PRESETS, value)) return defaultValue;
  if (!allowOriginal && value === 'original') return defaultValue;
  return value;
}

export function viewportMaterialDefinition(value, options = {}) {
  const key = normalizeViewportMaterialPreset(value, options);
  return { id: key, ...VIEWPORT_MATERIAL_PRESETS[key] };
}
