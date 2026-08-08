export function selectionRectangle(startX, startY, endX, endY) {
  return {
    left:Math.min(startX, endX),
    top:Math.min(startY, endY),
    right:Math.max(startX, endX),
    bottom:Math.max(startY, endY),
    crossing:endX < startX
  };
}

export function controlsInSelectionRectangle(controls, rectangle) {
  return (controls || []).filter(control => {
    const radius = Math.max(0, Number(control.radius) || 0);
    if (rectangle.crossing) {
      return control.x + radius >= rectangle.left
        && control.x - radius <= rectangle.right
        && control.y + radius >= rectangle.top
        && control.y - radius <= rectangle.bottom;
    }
    return control.x - radius >= rectangle.left
      && control.x + radius <= rectangle.right
      && control.y - radius >= rectangle.top
      && control.y + radius <= rectangle.bottom;
  }).map(control => control.index);
}
