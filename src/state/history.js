export function createHistory({ capture, restore, onChange = () => {}, maxEntries = 100 }) {
  const undoStack = [];
  const redoStack = [];
  let transaction = null;
  let restoring = false;

  const signature = state => JSON.stringify(state);
  const notify = () => onChange({
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoLabel: undoStack.at(-1)?.label ?? '',
    redoLabel: redoStack.at(-1)?.label ?? ''
  });

  const begin = label => {
    if (restoring || transaction) return false;
    const state = capture();
    transaction = { label, state, signature: signature(state) };
    return true;
  };

  const commit = () => {
    if (restoring || !transaction) return false;
    const pending = transaction;
    transaction = null;
    const current = capture();
    if (pending.signature === signature(current)) return false;
    undoStack.push({ label: pending.label, state: pending.state });
    if (undoStack.length > maxEntries) undoStack.shift();
    redoStack.length = 0;
    notify();
    return true;
  };

  const cancel = () => { transaction = null; };

  const apply = (source, destination, prefix) => {
    if (transaction) commit();
    const entry = source.pop();
    if (!entry) return false;
    destination.push({ label: entry.label, state: capture() });
    restoring = true;
    try { restore(entry.state); }
    finally { restoring = false; }
    notify();
    return `${prefix}: ${entry.label}`;
  };

  const clear = () => {
    transaction = null;
    undoStack.length = 0;
    redoStack.length = 0;
    notify();
  };

  notify();
  return {
    begin,
    commit,
    cancel,
    clear,
    undo: () => apply(undoStack, redoStack, 'Undo'),
    redo: () => apply(redoStack, undoStack, 'Redo'),
    get active() { return transaction !== null; },
    get restoring() { return restoring; }
  };
}
