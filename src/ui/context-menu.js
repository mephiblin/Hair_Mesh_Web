export const CONTEXT_MENU_MARGIN = 8;

export function contextMenuPosition({
  clientX = 0,
  clientY = 0,
  menuWidth = 0,
  menuHeight = 0,
  viewportWidth = 0,
  viewportHeight = 0,
  margin = CONTEXT_MENU_MARGIN
} = {}) {
  const safeMargin = Math.max(0, Number(margin) || 0);
  const maxX = Math.max(safeMargin, (Number(viewportWidth) || 0) - (Number(menuWidth) || 0) - safeMargin);
  const maxY = Math.max(safeMargin, (Number(viewportHeight) || 0) - (Number(menuHeight) || 0) - safeMargin);
  return {
    left:Math.min(Math.max(Number(clientX) || 0, safeMargin), maxX),
    top:Math.min(Math.max(Number(clientY) || 0, safeMargin), maxY)
  };
}
