export const HANDLE_MODE = Object.freeze({
  BEZIER_CORNER: 'bezierCorner',
  BEZIER: 'bezier',
  CORNER: 'corner',
  SMOOTH: 'smooth'
});

export const HANDLE_TYPE = Object.freeze({
  FREE: 'free',
  VECTOR: 'vector',
  ALIGNED: 'aligned',
  AUTO: 'auto'
});

const EPSILON_SQ = 1e-12;
const VALID_TYPES = new Set(Object.values(HANDLE_TYPE));

export function normalizeHandleMode(mode) {
  if (mode === HANDLE_MODE.BEZIER_CORNER || mode === 'broken') return HANDLE_MODE.BEZIER_CORNER;
  if (mode === HANDLE_MODE.CORNER || mode === HANDLE_MODE.SMOOTH) return mode;
  return HANDLE_MODE.BEZIER;
}

function typeForMode(mode) {
  if (mode === HANDLE_MODE.BEZIER_CORNER) return HANDLE_TYPE.FREE;
  if (mode === HANDLE_MODE.CORNER) return HANDLE_TYPE.VECTOR;
  if (mode === HANDLE_MODE.SMOOTH) return HANDLE_TYPE.AUTO;
  return HANDLE_TYPE.ALIGNED;
}

function modeForTypes(inType, outType) {
  if (inType === HANDLE_TYPE.AUTO && outType === HANDLE_TYPE.AUTO) return HANDLE_MODE.SMOOTH;
  if (inType === HANDLE_TYPE.ALIGNED && outType === HANDLE_TYPE.ALIGNED) return HANDLE_MODE.BEZIER;
  if (inType === HANDLE_TYPE.VECTOR && outType === HANDLE_TYPE.VECTOR) return HANDLE_MODE.CORNER;
  return HANDLE_MODE.BEZIER_CORNER;
}

export function ensureHandleTypes(point) {
  if (!point) return point;
  const fallback = typeForMode(normalizeHandleMode(point.handleMode));
  if (!VALID_TYPES.has(point.inHandleType)) point.inHandleType = fallback;
  if (!VALID_TYPES.has(point.outHandleType)) point.outHandleType = fallback;
  point.handleMode = modeForTypes(point.inHandleType, point.outHandleType);
  return point;
}

export function hasEditableHandles(point) {
  ensureHandleTypes(point);
  return point?.handleMode === HANDLE_MODE.BEZIER || point?.handleMode === HANDLE_MODE.BEZIER_CORNER;
}

function finiteVector(vector) {
  return vector
    && Number.isFinite(vector.x)
    && Number.isFinite(vector.y)
    && Number.isFinite(vector.z);
}

function safeDirection(vector) {
  if (finiteVector(vector) && vector.lengthSq() > EPSILON_SQ) return vector.normalize();
  return vector.set(0, 1, 0);
}

function neighborData(points, index) {
  const point = points[index];
  const previous = points[index - 1] || null;
  const next = points[index + 1] || null;
  return { point, previous, next };
}

function calculateTargets(points, index) {
  const { point, previous, next } = neighborData(points, index);
  if (!point) return null;

  const smoothDirection = point.position.clone();
  if (previous && next) smoothDirection.copy(next.position).sub(previous.position);
  else if (next) smoothDirection.copy(next.position).sub(point.position);
  else if (previous) smoothDirection.copy(point.position).sub(previous.position);
  else smoothDirection.set(0, 1, 0);
  safeDirection(smoothDirection);

  const previousLength = previous ? point.position.distanceTo(previous.position) / 3 : null;
  const nextLength = next ? point.position.distanceTo(next.position) / 3 : null;
  const inLength = previousLength ?? nextLength ?? 1 / 3;
  const outLength = nextLength ?? previousLength ?? 1 / 3;

  const smoothIn = smoothDirection.clone().multiplyScalar(-inLength);
  const smoothOut = smoothDirection.clone().multiplyScalar(outLength);
  const vectorIn = previous
    ? previous.position.clone().sub(point.position).multiplyScalar(1 / 3)
    : smoothIn.clone();
  const vectorOut = next
    ? next.position.clone().sub(point.position).multiplyScalar(1 / 3)
    : smoothOut.clone();
  return { smoothIn, smoothOut, vectorIn, vectorOut };
}

function alignOppositeHandle(point, movedKind) {
  const moved = movedKind === 'in' ? point.inTangent : point.outTangent;
  const opposite = movedKind === 'in' ? point.outTangent : point.inTangent;
  if (!finiteVector(moved) || moved.lengthSq() <= EPSILON_SQ) return false;

  const oppositeLength = finiteVector(opposite) && opposite.lengthSq() > EPSILON_SQ
    ? opposite.length()
    : moved.length();
  opposite.copy(moved).normalize().multiplyScalar(-oppositeLength);
  return true;
}

/** Recalculate only automatic/vector sides; manual Free/Aligned values survive. */
export function refreshDependentHandle(point, targets) {
  ensureHandleTypes(point);
  let changed = false;
  if (point.inHandleType === HANDLE_TYPE.AUTO) {
    point.inTangent.copy(targets.smoothIn);
    changed = true;
  } else if (point.inHandleType === HANDLE_TYPE.VECTOR) {
    point.inTangent.copy(targets.vectorIn);
    changed = true;
  }
  if (point.outHandleType === HANDLE_TYPE.AUTO) {
    point.outTangent.copy(targets.smoothOut);
    changed = true;
  } else if (point.outHandleType === HANDLE_TYPE.VECTOR) {
    point.outTangent.copy(targets.vectorOut);
    changed = true;
  }
  return changed;
}

/** Discard manual edits and rebuild tangents for the current 3ds Max-style knot type. */
export function recalculateHandles(points, index) {
  const point = points[index];
  const targets = calculateTargets(points, index);
  if (!point || !targets) return false;
  ensureHandleTypes(point);
  const mode = normalizeHandleMode(point.handleMode);
  const type = typeForMode(mode);
  point.handleMode = mode;
  point.inHandleType = type;
  point.outHandleType = type;
  point.inTangent.copy(mode === HANDLE_MODE.CORNER ? targets.vectorIn : targets.smoothIn);
  point.outTangent.copy(mode === HANDLE_MODE.CORNER ? targets.vectorOut : targets.smoothOut);
  return true;
}

/** Apply one of the four 3ds Max-style knot presets. */
export function applyHandleMode(points, index, mode) {
  const point = points[index];
  const targets = calculateTargets(points, index);
  if (!point || !targets) return false;
  const normalizedMode = normalizeHandleMode(mode);
  const type = typeForMode(normalizedMode);
  point.handleMode = normalizedMode;
  point.inHandleType = type;
  point.outHandleType = type;

  if (normalizedMode === HANDLE_MODE.CORNER) {
    point.inTangent.copy(targets.vectorIn);
    point.outTangent.copy(targets.vectorOut);
    return true;
  }
  if (normalizedMode === HANDLE_MODE.SMOOTH) {
    point.inTangent.copy(targets.smoothIn);
    point.outTangent.copy(targets.smoothOut);
    return true;
  }

  if (normalizedMode === HANDLE_MODE.BEZIER_CORNER) {
    const inValid = finiteVector(point.inTangent) && point.inTangent.lengthSq() > EPSILON_SQ;
    const outValid = finiteVector(point.outTangent) && point.outTangent.lengthSq() > EPSILON_SQ;
    if (!inValid) point.inTangent.copy(targets.smoothIn);
    if (!outValid) point.outTangent.copy(targets.smoothOut);
    return true;
  }

  const inValid = finiteVector(point.inTangent) && point.inTangent.lengthSq() > EPSILON_SQ;
  const outValid = finiteVector(point.outTangent) && point.outTangent.lengthSq() > EPSILON_SQ;
  if (!inValid && !outValid) {
    point.inTangent.copy(targets.smoothIn);
    point.outTangent.copy(targets.smoothOut);
  } else {
    alignOppositeHandle(point, outValid ? 'out' : 'in');
  }
  return true;
}

/**
 * Apply the exact type transition after a handle is moved.
 * Auto becomes Aligned/Bezier. Vector becomes Free/Bezier Corner on the moved side.
 */
export function constrainMovedHandle(point, movedKind) {
  if (!point) return { constrained: false, modeChanged: false };
  ensureHandleTypes(point);
  const movedTypeKey = movedKind === 'in' ? 'inHandleType' : 'outHandleType';
  const previousMode = point.handleMode;
  const movedType = point[movedTypeKey];

  if (movedType === HANDLE_TYPE.AUTO) {
    point.inHandleType = HANDLE_TYPE.ALIGNED;
    point.outHandleType = HANDLE_TYPE.ALIGNED;
    alignOppositeHandle(point, movedKind);
  } else if (movedType === HANDLE_TYPE.VECTOR) {
    point[movedTypeKey] = HANDLE_TYPE.FREE;
  } else if (
    movedType === HANDLE_TYPE.ALIGNED
    && point.inHandleType === HANDLE_TYPE.ALIGNED
    && point.outHandleType === HANDLE_TYPE.ALIGNED
  ) {
    alignOppositeHandle(point, movedKind);
  }

  point.handleMode = modeForTypes(point.inHandleType, point.outHandleType);
  return {
    constrained: point.handleMode === HANDLE_MODE.BEZIER,
    modeChanged: point.handleMode !== previousMode
  };
}

/** Recalculate Auto/Vector sides affected by an anchor topology or position change. */
export function refreshDependentNeighborhood(points, changedIndex) {
  const changed = [];
  for (let index = changedIndex - 1; index <= changedIndex + 1; index += 1) {
    const point = points[index];
    const targets = calculateTargets(points, index);
    if (!point || !targets) continue;
    if (refreshDependentHandle(point, targets)) changed.push(index);
  }
  return changed;
}

/** Averaging is manual below factor 1 and fully automatic at factor 1. */
export function setAveragedHandleTypes(point, factor) {
  const type = factor >= 1 - Number.EPSILON ? HANDLE_TYPE.AUTO : HANDLE_TYPE.ALIGNED;
  point.inHandleType = type;
  point.outHandleType = type;
  point.handleMode = modeForTypes(type, type);
}

export function markPointHandlesTransformed(point) {
  ensureHandleTypes(point);
  for (const key of ['inHandleType', 'outHandleType']) {
    if (point[key] === HANDLE_TYPE.AUTO) point[key] = HANDLE_TYPE.ALIGNED;
    else if (point[key] === HANDLE_TYPE.VECTOR) point[key] = HANDLE_TYPE.FREE;
  }
  point.handleMode = modeForTypes(point.inHandleType, point.outHandleType);
}

/** Preserve a shape-changing topology edit without leaving stale automatic types. */
export function markHandleSideManual(point, side) {
  ensureHandleTypes(point);
  const key = side === 'in' ? 'inHandleType' : 'outHandleType';
  if (point[key] === HANDLE_TYPE.AUTO) point[key] = HANDLE_TYPE.ALIGNED;
  else if (point[key] === HANDLE_TYPE.VECTOR) point[key] = HANDLE_TYPE.FREE;
  point.handleMode = modeForTypes(point.inHandleType, point.outHandleType);
}

export function handlesAreFinite(point) {
  return finiteVector(point?.inTangent) && finiteVector(point?.outTangent);
}
