export const REFERENCE_OBJECT_MATERIAL_MODES = Object.freeze([
  'inherit',
  'auto',
  'original',
  'default-lit',
  'studio-clay',
  'red-wax',
  'silver',
  'normal-check',
  'classic-teal',
  'texture'
]);

export function normalizeReferenceObjectMaterialMode(value) {
  return REFERENCE_OBJECT_MATERIAL_MODES.includes(value) ? value : 'inherit';
}

export function referenceOriginalNeedsFallback(descriptors = [], darknessThreshold = 0.035) {
  if (!Array.isArray(descriptors) || descriptors.length === 0) return true;
  return descriptors.every(descriptor => {
    if (descriptor?.hasColorTexture || descriptor?.hasEmissiveTexture) return false;
    const colorLuminance = Number(descriptor?.colorLuminance);
    const emissiveLuminance = Number(descriptor?.emissiveLuminance);
    const visibleLight = (Number.isFinite(colorLuminance) ? colorLuminance : 1)
      + (Number.isFinite(emissiveLuminance) ? emissiveLuminance : 0);
    return visibleLight < darknessThreshold;
  });
}

export function resolveReferenceMaterialMode({ objectMode, globalPreset, hasTexture, originalNeedsFallback } = {}) {
  const selected = normalizeReferenceObjectMaterialMode(objectMode);
  const effective = selected === 'inherit' ? globalPreset : selected;
  if (effective === 'texture') return hasTexture ? 'texture' : 'default-lit';
  if (effective === 'auto') return originalNeedsFallback ? 'default-lit' : 'original';
  return effective || 'default-lit';
}
