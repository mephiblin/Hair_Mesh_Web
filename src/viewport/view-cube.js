export const VIEW_CUBE_HOME_DIRECTION = Object.freeze([1, 0.65, 1]);

const FACE_VIEWS = Object.freeze({
  '1,0,0': 'right',
  '-1,0,0': 'left',
  '0,1,0': 'top',
  '0,-1,0': 'bottom',
  '0,0,1': 'front',
  '0,0,-1': 'back'
});

const VIEW_DIRECTIONS = Object.freeze({
  perspective: VIEW_CUBE_HOME_DIRECTION,
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
  front: [0, 0, 1],
  back: [0, 0, -1]
});

const LABELS = Object.freeze({
  x: ['Left', 'Right'],
  y: ['Bottom', 'Top'],
  z: ['Back', 'Front']
});

function signedComponent(value, maximum, threshold) {
  return Math.abs(value) >= maximum * threshold ? Math.sign(value) || 1 : 0;
}

export function viewCubeTargetFromPoint(point, threshold = 0.7) {
  const values = [Number(point?.[0]) || 0, Number(point?.[1]) || 0, Number(point?.[2]) || 0];
  const absoluteValues = values.map(Math.abs);
  const maximum = Math.max(...absoluteValues);
  if (maximum <= 1e-9) return null;
  const direction = values.map(value => signedComponent(value, maximum, threshold));
  if (!direction.some(Boolean)) {
    const maximumIndex = absoluteValues.indexOf(maximum);
    direction[maximumIndex] = Math.sign(values[maximumIndex]) || 1;
  }
  const dimensions = direction.filter(Boolean).length;
  const parts = [];
  if (direction[1]) parts.push(LABELS.y[direction[1] > 0 ? 1 : 0]);
  if (direction[2]) parts.push(LABELS.z[direction[2] > 0 ? 1 : 0]);
  if (direction[0]) parts.push(LABELS.x[direction[0] > 0 ? 1 : 0]);
  return {
    direction,
    kind: dimensions === 1 ? 'face' : dimensions === 2 ? 'edge' : 'corner',
    label: parts.join(' '),
    viewName: dimensions === 1 ? FACE_VIEWS[direction.join(',')] || null : null
  };
}

export function viewCubeDirectionForView(viewName) {
  return [...(VIEW_DIRECTIONS[viewName] || VIEW_CUBE_HOME_DIRECTION)];
}

export function viewCubeUpVector(direction) {
  const [x = 0, y = 0, z = 0] = direction || [];
  if (y > 0 && !x && !z) return [0, 0, -1];
  if (y < 0 && !x && !z) return [0, 0, 1];
  return [0, 1, 0];
}

export function viewCubeDragRotation(deltaX, deltaY, sensitivity = 0.012) {
  const safeSensitivity = Math.max(0, Number(sensitivity) || 0);
  return {
    theta: -(Number(deltaX) || 0) * safeSensitivity,
    phi: -(Number(deltaY) || 0) * safeSensitivity
  };
}
