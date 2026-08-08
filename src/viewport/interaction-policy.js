const CONTROL_PICK_MODES = new Set(['orbit', 'edit', 'transform']);

export function canPickVisibleControl(mode) {
  return CONTROL_PICK_MODES.has(mode);
}

export function modeAfterControlPick() {
  return 'edit';
}

export function canPickViewportObject(object) {
  return Boolean(object && object.visible !== false && object.locked !== true);
}

export function canInteractWithAxisGuides({ enabled, visible, dragging, operation }) {
  return Boolean(enabled && visible && !dragging && operation === 'translate');
}

export function shouldShowTransformHelper({ operation }) {
  return ['translate', 'rotate', 'scale'].includes(operation);
}
