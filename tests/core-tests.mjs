import assert from 'node:assert/strict';
import { createHistory } from '../src/state/history.js';
import { canFinishLine, lineCreationExitAction } from '../src/state/line-creation-policy.js';
import { allPointIndices, normalizePointSelection, selectedPointIndices, togglePointSelection } from '../src/state/point-selection.js';
import { activeCurveId, normalizeCurveSelection, selectedCurveIds, toggleCurveSelection } from '../src/state/curve-selection.js';
import { normalizeMeshBudget } from '../src/geometry/mesh-limits.js';
import { canEditCurve, hasReadyMesh } from '../src/state/curve-policy.js';
import {
  PROJECT_FORMAT,
  PROJECT_VERSION,
  createProjectDocument,
  parseProjectDocument,
  serializeProjectDocument
} from '../src/state/project-format.js';
import {
  HAIR_MATERIAL_FALLBACK,
  REFERENCE_MATERIAL_FALLBACK,
  normalizeViewportMaterialPreset,
  viewportMaterialDefinition
} from '../src/viewport/material-presets.js';
import {
  DEFAULT_DIRECTIONAL_LIGHT,
  directionalLightPosition,
  normalizeDirectionalLightSettings
} from '../src/viewport/lighting.js';
import {
  normalizeReferenceObjectMaterialMode,
  referenceOriginalNeedsFallback,
  resolveReferenceMaterialMode
} from '../src/viewport/reference-object-policy.js';
import {
  DEFAULT_VIEWPORT_SETTINGS,
  normalizeViewportSettings
} from '../src/viewport/viewport-settings.js';
import {
  REFERENCE_WIRE_DEFAULTS,
  normalizeReferenceWireColor,
  normalizeReferenceWireMode,
  referenceWireUsesSurfaceDepthBias
} from '../src/viewport/reference-wireframe.js';
import { canInteractWithAxisGuides, shouldShowTransformHelper } from '../src/viewport/interaction-policy.js';
import {
  DEFAULT_REFERENCE_IMAGE_SETTINGS,
  alignedReferenceImageView,
  normalizeReferenceImageSettings,
  referenceImagePlaneLayout
} from '../src/viewport/reference-images.js';

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

test('command-click point selection toggles indices within one curve', () => {
  let selection = new Set([1]);
  selection = togglePointSelection(selection, 3, 5);
  assert.deepEqual(selectedPointIndices(selection, 5), [1, 3]);
  selection = togglePointSelection(selection, 1, 5);
  assert.deepEqual(selectedPointIndices(selection, 5), [3]);
  selection = togglePointSelection(selection, 3, 5);
  assert.deepEqual(selectedPointIndices(selection, 5), []);
  assert.deepEqual(selectedPointIndices(togglePointSelection(selection, 9, 5), 5), []);
});

test('command-click curve selection toggles rows and resolves an active curve', () => {
  let selection = normalizeCurveSelection([1, 99], [1, 2, 3]);
  selection = toggleCurveSelection(selection, 2, [1, 2, 3]);
  assert.deepEqual(selectedCurveIds(selection, [1, 2, 3]), [1, 2]);
  assert.equal(activeCurveId(selection, 2), 2);
  selection = toggleCurveSelection(selection, 2, [1, 2, 3]);
  assert.deepEqual(selectedCurveIds(selection, [1, 2, 3]), [1]);
  assert.equal(activeCurveId(selection, 2), 1);
  assert.deepEqual(selectedCurveIds([], [1, 2, 3], 3), [3]);
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

test('viewport material presets keep hair and imported reference fallbacks distinct', () => {
  assert.equal(normalizeViewportMaterialPreset('red-wax'), 'red-wax');
  assert.equal(normalizeViewportMaterialPreset('original'), HAIR_MATERIAL_FALLBACK);
  assert.equal(normalizeViewportMaterialPreset('unknown'), HAIR_MATERIAL_FALLBACK);
  assert.equal(REFERENCE_MATERIAL_FALLBACK, 'auto');
  assert.equal(normalizeViewportMaterialPreset('auto', { allowOriginal: true, allowAuto: true }), 'auto');
  assert.equal(normalizeViewportMaterialPreset('original', { allowOriginal: true, allowAuto: true }), 'original');
  assert.equal(viewportMaterialDefinition('default-lit').kind, 'standard');
  assert.equal(viewportMaterialDefinition('silver').kind, 'matcap');
  assert.equal(viewportMaterialDefinition('normal-check').kind, 'normal');
});

test('directional lighting clamps controls and maps default angles near the legacy position', () => {
  const normalized = normalizeDirectionalLightSettings({ azimuth: 900, elevation: -200, intensity: -4 });
  assert.deepEqual(normalized, { azimuth: 180, elevation: -89, intensity: 0, fillIntensity: DEFAULT_DIRECTIONAL_LIGHT.fillIntensity, distance: DEFAULT_DIRECTIONAL_LIGHT.distance });
  const position = directionalLightPosition(DEFAULT_DIRECTIONAL_LIGHT);
  assert.ok(Math.abs(position.x - 3) < 0.02);
  assert.ok(Math.abs(position.y - 5) < 0.001);
  assert.ok(Math.abs(position.z - 4) < 0.02);
});

test('reference object material policy keeps textured originals and brightens untextured black materials', () => {
  assert.equal(normalizeReferenceObjectMaterialMode('texture'), 'texture');
  assert.equal(normalizeReferenceObjectMaterialMode('invalid'), 'inherit');
  assert.equal(referenceOriginalNeedsFallback([{ colorLuminance:0, emissiveLuminance:0 }]), true);
  assert.equal(referenceOriginalNeedsFallback([{ colorLuminance:0, hasColorTexture:true }]), false);
  assert.equal(referenceOriginalNeedsFallback([{ colorLuminance:.4 }]), false);
  assert.equal(resolveReferenceMaterialMode({ objectMode:'inherit', globalPreset:'auto', originalNeedsFallback:true }), 'default-lit');
  assert.equal(resolveReferenceMaterialMode({ objectMode:'inherit', globalPreset:'auto', originalNeedsFallback:false }), 'original');
  assert.equal(resolveReferenceMaterialMode({ objectMode:'texture', hasTexture:true }), 'texture');
  assert.equal(resolveReferenceMaterialMode({ objectMode:'texture', hasTexture:false }), 'default-lit');
  assert.equal(resolveReferenceMaterialMode({ objectMode:'silver', globalPreset:'original' }), 'silver');
});

test('viewport settings normalize background color and clamp camera FOV', () => {
  assert.deepEqual(normalizeViewportSettings({ background:'#A0b1C2', cameraFov:200 }), { background:'#a0b1c2', cameraFov:120 });
  assert.deepEqual(normalizeViewportSettings({ background:'black', cameraFov:'bad' }), DEFAULT_VIEWPORT_SETTINGS);
  assert.equal(normalizeViewportSettings({ cameraFov:5 }).cameraFov, 15);
});

test('reference wireframe accepts only owned modes and six-digit colors', () => {
  assert.equal(normalizeReferenceWireMode('overlay'), 'overlay');
  assert.equal(normalizeReferenceWireMode('material-wire'), REFERENCE_WIRE_DEFAULTS.mode);
  assert.equal(normalizeReferenceWireColor('#A0b1C2'), '#a0b1c2');
  assert.equal(normalizeReferenceWireColor('red'), REFERENCE_WIRE_DEFAULTS.color);
  assert.equal(referenceWireUsesSurfaceDepthBias('overlay'), true);
  assert.equal(referenceWireUsesSurfaceDepthBias('wire'), false);
  assert.equal(referenceWireUsesSurfaceDepthBias('off'), false);
});

test('disabled axis guides cannot render an interactive pick target', () => {
  assert.equal(canInteractWithAxisGuides({ enabled:true, visible:true, dragging:false, operation:'translate' }), true);
  assert.equal(canInteractWithAxisGuides({ enabled:false, visible:true, dragging:false, operation:'translate' }), false);
  assert.equal(canInteractWithAxisGuides({ enabled:true, visible:false, dragging:false, operation:'translate' }), false);
  assert.equal(canInteractWithAxisGuides({ enabled:true, visible:true, dragging:true, operation:'translate' }), false);
  assert.equal(canInteractWithAxisGuides({ enabled:true, visible:true, dragging:false, operation:'rotate' }), false);
  assert.equal(shouldShowTransformHelper({ axisGuidesEnabled:false, operation:'translate' }), false);
  assert.equal(shouldShowTransformHelper({ axisGuidesEnabled:true, operation:'translate' }), true);
  assert.equal(shouldShowTransformHelper({ axisGuidesEnabled:false, operation:'rotate' }), true);
  assert.equal(shouldShowTransformHelper({ axisGuidesEnabled:false, operation:'scale' }), true);
});

test('reference image settings normalize optional project fields without embedding image data', () => {
  const settings = normalizeReferenceImageSettings({
    opacity: 9,
    layer: 'overlay',
    frame: { center:[4, 5, 6], size:[2, -4, 0] },
    views: { front:{ scaleX:0, offsetY:99, rotation:400, mirror:true, fileName:'front.png' } }
  });
  assert.equal(settings.opacity, 1);
  assert.equal(settings.layer, 'overlay');
  assert.deepEqual(settings.frame, { center:[4, 5, 6], size:[2, 4, 0.0001] });
  assert.equal(settings.views.front.scaleX, 0.01);
  assert.equal(settings.views.front.offsetY, 10);
  assert.equal(settings.views.front.rotation, 180);
  assert.equal(settings.views.front.fileName, 'front.png');
  assert.equal('dataUrl' in settings.views.front, false);
  assert.deepEqual(normalizeReferenceImageSettings(), {
    opacity: DEFAULT_REFERENCE_IMAGE_SETTINGS.opacity,
    layer: DEFAULT_REFERENCE_IMAGE_SETTINGS.layer,
    frame: { center:[0, 0, 0], size:[2, 2, 2] },
    views: {
      front:{ visible:true, scaleX:1, scaleY:1, offsetX:0, offsetY:0, rotation:0, mirror:false, fileName:'' },
      left:{ visible:true, scaleX:1, scaleY:1, offsetX:0, offsetY:0, rotation:0, mirror:false, fileName:'' },
      back:{ visible:true, scaleX:1, scaleY:1, offsetX:0, offsetY:0, rotation:0, mirror:false, fileName:'' }
    }
  });
});

test('reference image planes map each screen axis and stay behind the fitted frame', () => {
  const settings = normalizeReferenceImageSettings({
    opacity:.6,
    frame:{ center:[10, 20, 30], size:[4, 8, 6] },
    views:{
      front:{ offsetX:.5, offsetY:-.25, scaleX:1.2, scaleY:.8 },
      left:{ offsetX:.5 },
      back:{ offsetX:.5 }
    }
  });
  const front = referenceImagePlaneLayout('front', settings, .5);
  const left = referenceImagePlaneLayout('left', settings, .5);
  const back = referenceImagePlaneLayout('back', settings, .5);
  assert.deepEqual(front.position.slice(0, 2), [12, 19]);
  assert.ok(front.position[2] < 27);
  assert.ok(left.position[0] > 12);
  assert.equal(left.position[2], 32);
  assert.equal(back.position[0], 8);
  assert.ok(back.position[2] > 33);
  assert.equal(front.width, 4.8);
  assert.equal(front.height, 6.4);
});

test('reference images appear only when camera is aligned to Front, Left, or Back', () => {
  assert.equal(alignedReferenceImageView([0, 0, 5], [0, 0, 0]), 'front');
  assert.equal(alignedReferenceImageView([-5, 0, 0], [0, 0, 0]), 'left');
  assert.equal(alignedReferenceImageView([0, 0, -5], [0, 0, 0]), 'back');
  assert.equal(alignedReferenceImageView([3, 2, 4], [0, 0, 0]), null);
  assert.equal(alignedReferenceImageView([0, 5, 0], [0, 0, 0]), null);
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
