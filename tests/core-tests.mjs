import assert from 'node:assert/strict';
import { createHistory } from '../src/state/history.js';
import { canFinishLine, lineCreationExitAction } from '../src/state/line-creation-policy.js';
import { allPointIndices, normalizePointSelection, selectedPointIndices } from '../src/state/point-selection.js';
import { normalizeMeshBudget } from '../src/geometry/mesh-limits.js';
import { canEditCurve, hasReadyMesh } from '../src/state/curve-policy.js';
import {
  PROJECT_FORMAT,
  PROJECT_VERSION,
  createProjectDocument,
  parseProjectDocument,
  serializeProjectDocument
} from '../src/state/project-format.js';

const tests = [];
function test(name, run) { tests.push({ name, run }); }

test('line creation requires two points', () => {
  assert.equal(canFinishLine(1), false);
  assert.equal(canFinishLine(2), true);
  assert.equal(lineCreationExitAction(1, 'edit'), 'cancel');
  assert.equal(lineCreationExitAction(2, 'edit'), 'finish-edit');
});

test('point selection normalizes invalid and duplicate indices', () => {
  const selection = normalizePointSelection([3, 1, 3, -1, 99], 4, 0);
  assert.deepEqual(selectedPointIndices(selection, 4), [1, 3]);
  assert.deepEqual(allPointIndices(4), [0, 1, 2, 3]);
});

test('mesh budget clamps direct values and normalizes fallback values', () => {
  assert.deepEqual(normalizeMeshBudget({ segments: 100000, radial: -2 }), { segments: 512, radial: 3 });
  assert.deepEqual(normalizeMeshBudget({ segments: 'bad', radial: undefined }), { segments: 32, radial: 8 });
});

test('curve policy rejects hidden/locked edits and dishonest live state', () => {
  assert.equal(canEditCurve({ visible: true, locked: false }), true);
  assert.equal(canEditCurve({ visible: false, locked: false }), false);
  assert.equal(canEditCurve({ visible: true, locked: true }), false);
  assert.equal(hasReadyMesh({ enabled: true, status: 'ready', hasTopology: true }), true);
  assert.equal(hasReadyMesh({ enabled: true, status: 'error', hasTopology: false }), false);
});

test('history groups a mutation and restores both directions', () => {
  let state = { value: 1 };
  const history = createHistory({ capture: () => ({ ...state }), restore: next => { state = { ...next }; } });
  history.begin('change'); state.value = 2; history.commit();
  assert.equal(history.undo(), 'Undo: change');
  assert.equal(state.value, 1);
  assert.equal(history.redo(), 'Redo: change');
  assert.equal(state.value, 2);
});

test('project document round-trips versioned application state', () => {
  const appState = { nextCurveId: 2, curves: [{ id: 1, name: 'HairCard' }] };
  const encoded = serializeProjectDocument(createProjectDocument(appState, { projectName: 'test' }));
  const decoded = parseProjectDocument(encoded);
  assert.equal(decoded.format, PROJECT_FORMAT);
  assert.equal(decoded.version, PROJECT_VERSION);
  assert.deepEqual(decoded.appState, appState);
});

test('project parser rejects unrelated and future documents', () => {
  assert.throws(() => parseProjectDocument('{}'), /Hair Mesh Web/);
  assert.throws(
    () => parseProjectDocument({ format: PROJECT_FORMAT, version: PROJECT_VERSION + 1, appState: { curves: [] } }),
    /더 새로운 프로젝트 버전/
  );
});

let passed = 0;
for (const item of tests) {
  try {
    item.run();
    passed += 1;
    console.log(`PASS ${item.name}`);
  } catch (error) {
    console.error(`FAIL ${item.name}`);
    console.error(error);
  }
}

console.log(`${passed}/${tests.length} tests passed`);
if (passed !== tests.length) process.exitCode = 1;
