export const CONTROL_SELECTION_OPERATION = Object.freeze({
  REPLACE:'replace',
  ADD:'add',
  REMOVE:'remove'
});

function validIndex(value, count) {
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 && index < count;
}

export function normalizeControlSelection(values, count) {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  return new Set([...values || []].filter(value => validIndex(value, safeCount)));
}

export function controlSelectionOperation({ ctrlKey = false, metaKey = false, altKey = false } = {}) {
  if (altKey) return CONTROL_SELECTION_OPERATION.REMOVE;
  if (ctrlKey || metaKey) return CONTROL_SELECTION_OPERATION.ADD;
  return CONTROL_SELECTION_OPERATION.REPLACE;
}

export function applyControlSelection(current, affected, count, operation = CONTROL_SELECTION_OPERATION.REPLACE) {
  const selected = normalizeControlSelection(current, count);
  const hits = normalizeControlSelection(affected, count);
  if (operation === CONTROL_SELECTION_OPERATION.REPLACE) return hits;
  if (operation === CONTROL_SELECTION_OPERATION.ADD) hits.forEach(index => selected.add(index));
  else if (operation === CONTROL_SELECTION_OPERATION.REMOVE) hits.forEach(index => selected.delete(index));
  return selected;
}

export function orderedControlSelection(values, count) {
  return [...normalizeControlSelection(values, count)].sort((a, b) => a - b);
}
