import {
  applyHandleMode,
  constrainMovedHandle,
  hasEditableHandles,
  handlesAreFinite,
  markPointHandlesTransformed,
  recalculateHandles,
  refreshDependentNeighborhood,
  setAveragedHandleTypes
} from '../geometry/bezier-handles.js';
import { buildSweepFrames } from '../geometry/sweep-frames.js';
import { canPickVisibleControl, modeAfterControlPick } from '../viewport/interaction-policy.js';
import { canFinishLine, lineCreationExitAction } from '../state/line-creation-policy.js';

function finiteQuaternion(quaternion) {
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w].every(Number.isFinite);
}

export function runCoreSelfChecks(THREE) {
  const tests = [];
  const check = (name, passed, detail = '') => tests.push({ name, passed: Boolean(passed), detail });
  const point = (x, y, z) => ({
    position: new THREE.Vector3(x, y, z),
    inTangent: new THREE.Vector3(),
    outTangent: new THREE.Vector3(),
    handleMode: 'bezier',
    inHandleType: 'aligned',
    outHandleType: 'aligned'
  });

  check(
    'Visible points remain selectable in Select, Edit, and Root Transform modes',
    ['orbit', 'edit', 'transform'].every(canPickVisibleControl)
      && !canPickVisibleControl('draw')
      && !canPickVisibleControl('insert')
      && modeAfterControlPick() === 'edit'
  );

  check(
    'Empty and one-point Line sessions cancel instead of materializing an object',
    !canFinishLine(0)
      && !canFinishLine(1)
      && lineCreationExitAction(0, 'orbit') === 'cancel'
      && lineCreationExitAction(1, 'edit') === 'cancel'
  );
  check(
    'Two-point Line sessions distinguish Finish from Finish & Edit',
    canFinishLine(2)
      && lineCreationExitAction(2, 'orbit') === 'finish'
      && lineCreationExitAction(2, 'edit') === 'finish-edit'
  );

  const points = [point(-1, 0, 0), point(0, 1, 0), point(2, 0, 1)];
  applyHandleMode(points, 1, 'smooth');
  check(
    'Smooth creates finite Auto handles',
    points[1].handleMode === 'smooth'
      && points[1].inHandleType === 'auto'
      && points[1].outHandleType === 'auto'
      && handlesAreFinite(points[1])
  );

  points[1].outTangent.set(1, 0.2, 0.4);
  constrainMovedHandle(points[1], 'out');
  check(
    'Manual Smooth edit becomes aligned Bezier',
    points[1].handleMode === 'bezier'
      && points[1].inHandleType === 'aligned'
      && points[1].outHandleType === 'aligned'
      && points[1].inTangent.clone().cross(points[1].outTangent).length() < 1e-9
  );

  applyHandleMode(points, 1, 'bezierCorner');
  const independentIn = points[1].inTangent.clone();
  points[1].outTangent.set(0.5, -0.25, 0.75);
  constrainMovedHandle(points[1], 'out');
  check(
    'Bezier Corner exposes independent Free handles',
    points[1].handleMode === 'bezierCorner'
      && points[1].inHandleType === 'free'
      && points[1].outHandleType === 'free'
      && independentIn.distanceTo(points[1].inTangent) < 1e-12
      && hasEditableHandles(points[1])
  );
  recalculateHandles(points, 1);
  check(
    'Reset Tangents preserves Bezier Corner type and restores finite handles',
    points[1].handleMode === 'bezierCorner'
      && points[1].inHandleType === 'free'
      && points[1].outHandleType === 'free'
      && handlesAreFinite(points[1])
  );

  applyHandleMode(points, 1, 'corner');
  points[1].outTangent.set(0.25, 0.75, -0.5);
  constrainMovedHandle(points[1], 'out');
  const manualOut = points[1].outTangent.clone();
  points[2].position.set(10, 4, -3);
  refreshDependentNeighborhood(points, 2);
  check(
    'Editing a Corner vector converts it to Bezier Corner and preserves the manual side',
    points[1].handleMode === 'bezierCorner'
      && points[1].inHandleType === 'vector'
      && points[1].outHandleType === 'free'
      && manualOut.distanceTo(points[1].outTangent) < 1e-12
  );

  setAveragedHandleTypes(points[1], 0.5);
  check(
    'Partial handle average is manual Aligned',
    points[1].handleMode === 'bezier'
      && points[1].inHandleType === 'aligned'
      && points[1].outHandleType === 'aligned'
  );
  setAveragedHandleTypes(points[1], 1);
  check(
    'Full handle average is automatic Smooth',
    points[1].handleMode === 'smooth'
      && points[1].inHandleType === 'auto'
      && points[1].outHandleType === 'auto'
  );
  markPointHandlesTransformed(points[1]);
  check(
    'Transforming Auto handles makes their result manual Aligned',
    points[1].handleMode === 'bezier'
      && points[1].inHandleType === 'aligned'
      && points[1].outHandleType === 'aligned'
  );
  applyHandleMode(points, 1, 'corner');
  markPointHandlesTransformed(points[1]);
  check(
    'Transforming Corner vectors produces a Bezier Corner',
    points[1].handleMode === 'bezierCorner'
      && points[1].inHandleType === 'free'
      && points[1].outHandleType === 'free'
      && hasEditableHandles(points[1])
  );

  const degeneratePath = {
    getUtoTmapping: () => Number.NaN,
    getTangent: (_value, target = new THREE.Vector3()) => target.set(0, 0, 0),
    getPoint: (_value, target = new THREE.Vector3()) => target.set(1, 1, 1)
  };
  const degenerateFrames = buildSweepFrames(THREE, degeneratePath, 16, { twistCorrection: true });
  check(
    'Zero-tangent sweep produces finite fallback frames',
    degenerateFrames.diagnostics.fallbackTangents === 17
      && degenerateFrames.quaternions.every(finiteQuaternion),
    JSON.stringify(degenerateFrames.diagnostics)
  );

  const reversingPath = {
    getUtoTmapping: value => value,
    getTangent: (value, target = new THREE.Vector3()) => target.set(0, value < 0.5 ? 1 : -1, 0),
    getPoint: (value, target = new THREE.Vector3()) => target.set(0, value < 0.5 ? value : 1 - value, 0)
  };
  const reversingFrames = buildSweepFrames(THREE, reversingPath, 8, { twistCorrection: true });
  check(
    'Opposite tangents use a finite 180-degree transport fallback',
    reversingFrames.diagnostics.oppositeTurns >= 1
      && reversingFrames.quaternions.every(finiteQuaternion),
    JSON.stringify(reversingFrames.diagnostics)
  );

  const sCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2, 0, 0),
    new THREE.Vector3(-1, 1, 0.5),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, -1, -0.5),
    new THREE.Vector3(2, 0, 0)
  ]);
  const sFrames = buildSweepFrames(THREE, sCurve, 64, { twistCorrection: true });
  let minimumAdjacentDot = 1;
  for (let index = 1; index < sFrames.quaternions.length; index += 1) {
    minimumAdjacentDot = Math.min(
      minimumAdjacentDot,
      sFrames.quaternions[index - 1].dot(sFrames.quaternions[index])
    );
  }
  check(
    'S-curve sweep keeps finite quaternion continuity',
    sFrames.quaternions.every(finiteQuaternion) && minimumAdjacentDot >= 0,
    `minimum adjacent quaternion dot: ${minimumAdjacentDot}`
  );

  return {
    passed: tests.every(test => test.passed),
    passedCount: tests.filter(test => test.passed).length,
    totalCount: tests.length,
    tests
  };
}
