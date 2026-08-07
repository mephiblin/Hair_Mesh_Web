export const MIN_LINE_POINTS = 2;

export function canFinishLine(pointCount) {
  return Number.isFinite(pointCount) && pointCount >= MIN_LINE_POINTS;
}

export function lineCreationExitAction(pointCount, requestedMode = 'orbit') {
  if (!canFinishLine(pointCount)) return 'cancel';
  return requestedMode === 'edit' ? 'finish-edit' : 'finish';
}
