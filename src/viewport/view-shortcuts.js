const DIRECT_VIEW_SHORTCUTS = Object.freeze({
  t:'top',
  b:'bottom',
  f:'front',
  l:'left',
  p:'perspective',
  u:'user'
});

const VIEW_MENU_SHORTCUTS = Object.freeze({
  ...DIRECT_VIEW_SHORTCUTS,
  k:'back'
});

export function viewportViewFromShortcut(key, { menuOpen = false } = {}) {
  const normalizedKey = String(key || '').toLowerCase();
  return (menuOpen ? VIEW_MENU_SHORTCUTS : DIRECT_VIEW_SHORTCUTS)[normalizedKey] || null;
}

export const VIEWPORT_VIEW_MENU_ITEMS = Object.freeze([
  Object.freeze({ viewName:'perspective', label:'Perspective', shortcut:'P' }),
  Object.freeze({ viewName:'user', label:'Orthographic', shortcut:'U' }),
  Object.freeze({ viewName:'top', label:'Top', shortcut:'T' }),
  Object.freeze({ viewName:'bottom', label:'Bottom', shortcut:'B' }),
  Object.freeze({ viewName:'front', label:'Front', shortcut:'F' }),
  Object.freeze({ viewName:'back', label:'Back', shortcut:'K' }),
  Object.freeze({ viewName:'left', label:'Left', shortcut:'L' }),
  Object.freeze({ viewName:'right', label:'Right', shortcut:null })
]);
