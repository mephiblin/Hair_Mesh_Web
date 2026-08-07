const CONTROL_PICK_MODES = new Set(['orbit', 'edit', 'transform']);

export function canPickVisibleControl(mode) {
  return CONTROL_PICK_MODES.has(mode);
}

export function modeAfterControlPick() {
  return 'edit';
}
