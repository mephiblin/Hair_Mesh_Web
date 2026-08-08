import assert from 'node:assert/strict';
import { createHistory } from '../src/state/history.js';
import { canFinishLine, lineCreationExitAction } from '../src/state/line-creation-policy.js';
import { allPointIndices, normalizePointSelection, selectedPointIndices, togglePointSelection } from '../src/state/point-selection.js';
import { activeCurveId, normalizeCurveSelection, selectedCurveIds, toggleCurveSelection } from '../src/state/curve-selection.js';
import { applyControlSelection, controlSelectionOperation, orderedControlSelection } from '../src/state/control-selection.js';
import { controlsInSelectionRectangle, selectionRectangle } from '../src/viewport/region-selection.js';
import { normalizeMeshBudget } from '../src/geometry/mesh-limits.js';
import {
  buildProxyTopology,
  defaultProxySettings,
  normalizeProxySettings,
  proxyTopologyStats
} from '../src/geometry/proxy-primitives.js';
import {
  applyFfdModifier,
  createFfdModifier,
  evaluateFfdStack,
  ffdControlPointPositions,
  ffdLatticeIndex,
  ffdPointCount,
  normalizeFfdModifier,
  normalizeFfdResolution,
  setFfdControlPointPosition
} from '../src/geometry/ffd-lattice.js';
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
  matchedOrthographicHeight,
  normalizeViewportSettings,
  standardViewProjection
} from '../src/viewport/viewport-settings.js';
import {
  REFERENCE_WIRE_DEFAULTS,
  normalizeReferenceWireColor,
  normalizeReferenceWireMode,
  referenceWireUsesSurfaceDepthBias
} from '../src/viewport/reference-wireframe.js';
import { canInteractWithAxisGuides, canPickViewportObject, shouldShowTransformHelper } from '../src/viewport/interaction-policy.js';
import {
  DEFAULT_REFERENCE_IMAGE_SETTINGS,
  normalizeReferenceImageSettings,
  referenceImagePlaneLayout
} from '../src/viewport/reference-images.js';
import { contextMenuPosition } from '../src/ui/context-menu.js';

const tests = [];
function test(name, run) { tests.push({ name, run }); }

test('line creation requires two points', () => {
  assert.equal(canFinishLine(1), false);
  assert.equal(canFinishLine(2), true);
  assert.equal(lineCreationExitAction(1, 'edit'), 'cancel');
  assert.equal(lineCreationExitAction(2, 'edit'), 'finish-edit');
});

test('viewport context menu keeps its bounds inside the window', () => {
  assert.deepEqual(contextMenuPosition({
    clientX:980,
    clientY:740,
    menuWidth:240,
    menuHeight:320,
    viewportWidth:1024,
    viewportHeight:768
  }), { left:776, top:440 });
});

test('viewport context menu honors a safe margin at the top-left', () => {
  assert.deepEqual(contextMenuPosition({
    clientX:-20,
    clientY:2,
    menuWidth:240,
    menuHeight:320,
    viewportWidth:1024,
    viewportHeight:768
  }), { left:8, top:8 });
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

test('3ds Max control selection replaces, adds, and removes with modifier keys', () => {
  let selected = applyControlSelection([], [1, 2], 8, controlSelectionOperation());
  selected = applyControlSelection(selected, [4], 8, controlSelectionOperation({ ctrlKey:true }));
  selected = applyControlSelection(selected, [2], 8, controlSelectionOperation({ altKey:true }));
  assert.deepEqual(orderedControlSelection(selected, 8), [1, 4]);
});

test('selection drag uses window left-to-right and crossing right-to-left', () => {
  const controls = [{ index:0, x:20, y:20, radius:3 }, { index:1, x:31, y:20, radius:3 }];
  assert.deepEqual(controlsInSelectionRectangle(controls, selectionRectangle(10, 10, 30, 30)), [0]);
  assert.deepEqual(controlsInSelectionRectangle(controls, selectionRectangle(30, 30, 10, 10)), [0, 1]);
});

test('mesh budget clamps direct values and normalizes fallback values', () => {
  assert.deepEqual(normalizeMeshBudget({ segments: 100000, radial: -2 }), { segments: 512, radial: 3 });
  assert.deepEqual(normalizeMeshBudget({ segments: 'bad', radial: undefined }), { segments: 32, radial: 8 });
});

test('proxy primitive settings clamp dimensions and subdivision budgets', () => {
  assert.deepEqual(normalizeProxySettings('box', {
    width:-4,
    height:'bad',
    widthSegments:999,
    heightSegments:0
  }), {
    ...defaultProxySettings('box'),
    width:0.001,
    widthSegments:128,
    heightSegments:1
  });
  assert.equal(normalizeProxySettings('sphere', { segments:2, rings:999 }).segments, 3);
  assert.equal(normalizeProxySettings('sphere', { segments:2, rings:999 }).rings, 128);
  assert.equal(normalizeProxySettings('quad-sphere', { segments:999 }).segments, 64);
  assert.equal(normalizeProxySettings('cylinder', { sides:2, capSegments:0 }).sides, 3);
});

test('proxy primitives generate predictable logical polygon topology', () => {
  const box = proxyTopologyStats(buildProxyTopology('box', { widthSegments:2, heightSegments:3, depthSegments:4 }));
  assert.deepEqual(box, { vertices:94, faces:52, triangles:104, quads:52 });
  const sphere = proxyTopologyStats(buildProxyTopology('sphere', { segments:8, rings:4 }));
  assert.deepEqual(sphere, { vertices:26, faces:32, triangles:48, quads:16 });
  const quadSphere = buildProxyTopology('quad-sphere', { segments:3 });
  assert.deepEqual(proxyTopologyStats(quadSphere), { vertices:56, faces:54, triangles:108, quads:54 });
  assert.equal(quadSphere.faces.every(face => face.length === 4), true);
  quadSphere.positions.forEach(position => assert.ok(Math.abs(Math.hypot(...position) - .5) < 1e-10));
  const cylinder = proxyTopologyStats(buildProxyTopology('cylinder', { sides:8, heightSegments:2, capSegments:2 }));
  assert.deepEqual(cylinder, { vertices:58, faces:48, triangles:80, quads:32 });
});

test('proxy primitive face winding points away from each primitive center', () => {
  for (const type of ['box', 'sphere', 'quad-sphere', 'cylinder']) {
    const topology = buildProxyTopology(type);
    topology.faces.forEach((face, faceIndex) => {
      const points = face.map(index => topology.positions[index]);
      const center = points.reduce((sum, point) => sum.map((value, axis) => value + point[axis]), [0, 0, 0]).map(value => value / points.length);
      const [a, b, c] = points;
      const ab = b.map((value, axis) => value - a[axis]);
      const ac = c.map((value, axis) => value - a[axis]);
      const normal = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      const outward = normal[0] * center[0] + normal[1] * center[1] + normal[2] * center[2];
      assert.ok(outward > 0, `${type} face ${faceIndex} must face outward`);
    });
  }
});

test('FFD modifiers normalize supported lattice sizes and finite offsets', () => {
  assert.equal(normalizeFfdResolution(4), 4);
  assert.equal(normalizeFfdResolution(3), 2);
  assert.equal(ffdPointCount(8), 512);
  const modifier = normalizeFfdModifier({ id:7, resolution:4, offsets:[[Infinity, 2, 'bad']] });
  assert.equal(modifier.offsets.length, 64);
  assert.deepEqual(modifier.offsets[0], [0, 2, 0]);
});

test('FFD identity and moved control layer evaluate with trivariate Bernstein weights', () => {
  const base = buildProxyTopology('box');
  const identity = createFfdModifier(1, 2);
  assert.deepEqual(applyFfdModifier(base, identity).positions, base.positions);
  const moved = createFfdModifier(1, 2);
  for (let z = 0; z < 2; z++) for (let x = 0; x < 2; x++) moved.offsets[ffdLatticeIndex(x, 1, z, 2)] = [.5, 0, 0];
  const result = applyFfdModifier(base, moved);
  base.positions.forEach((position, index) => {
    const expectedX = position[0] + (position[1] > 0 ? .5 : 0);
    assert.ok(Math.abs(result.positions[index][0] - expectedX) < 1e-10);
  });
});

test('FFD control edits and modifier stacks preserve ordered non-destructive evaluation', () => {
  const base = buildProxyTopology('box');
  let first = createFfdModifier(11, 2);
  const firstInputControl = ffdControlPointPositions(base, first)[ffdLatticeIndex(1, 1, 1, 2)];
  first = setFfdControlPointPosition(base, first, ffdLatticeIndex(1, 1, 1, 2), [firstInputControl[0] + .5, firstInputControl[1], firstInputControl[2]]);
  const second = createFfdModifier(12, 4);
  second.offsets = second.offsets.map(() => [0, .25, 0]);
  const firstOnly = evaluateFfdStack(base, [first, second], { stopBeforeId:12 });
  const stacked = evaluateFfdStack(base, [first, second]);
  assert.notDeepEqual(firstOnly.positions, base.positions);
  stacked.positions.forEach((position, index) => assert.ok(Math.abs(position[1] - firstOnly.positions[index][1] - .25) < 1e-10));
  second.enabled = false;
  assert.deepEqual(evaluateFfdStack(base, [first, second]).positions, firstOnly.positions);
});

test('curve policy rejects hidden/locked edits and dishonest live state', () => {
  assert.equal(canEditCurve({ visible: true, locked: false }), true);
  assert.equal(canEditCurve({ visible: false, locked: false }), false);
  assert.equal(canEditCurve({ visible: true, locked: true }), false);
  assert.equal(hasReadyMesh({ enabled: true, status: 'ready', hasTopology: true }), true);
  assert.equal(hasReadyMesh({ enabled: true, status: 'error', hasTopology: false }), false);
});

test('viewport object picking excludes hidden and edit-locked roots', () => {
  assert.equal(canPickViewportObject({ visible:true, locked:false }), true);
  assert.equal(canPickViewportObject({ visible:false, locked:false }), false);
  assert.equal(canPickViewportObject({ visible:true, locked:true }), false);
  assert.equal(canPickViewportObject(null), false);
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
  const appState = {
    nextCurveId:2,
    nextProxyId:2,
    nextProxyModifierId:2,
    selectedObjectKind:'proxy',
    selectedProxyId:1,
    curves:[{ id:1, name:'HairCard' }],
    proxies:[{
      id:1,
      name:'QuadSphere001',
      type:'quad-sphere',
      settings:{ radius:.5, segments:4 },
      modifiers:[createFfdModifier(1, 4)],
      activeModifierId:1,
      lastFfdControlIndex:63
    }]
  };
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
  assert.deepEqual(normalizeViewportSettings({ background:'#A0b1C2', cameraFov:200 }), { background:'#a0b1c2', cameraFov:120, orthographicStandardViews:true });
  assert.deepEqual(normalizeViewportSettings({ background:'black', cameraFov:'bad' }), DEFAULT_VIEWPORT_SETTINGS);
  assert.equal(normalizeViewportSettings({ cameraFov:5 }).cameraFov, 15);
  assert.equal(normalizeViewportSettings({ orthographicStandardViews:false }).orthographicStandardViews, false);
  assert.equal(standardViewProjection('front', true), 'orthographic');
  assert.equal(standardViewProjection('top', false), 'perspective');
  assert.equal(standardViewProjection('perspective', true), 'perspective');
  assert.ok(Math.abs(matchedOrthographicHeight(10, 45) - 8.284271247) < 1e-8);
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

test('disabled axis guides hide only guide lines and preserve the transform gizmo', () => {
  assert.equal(canInteractWithAxisGuides({ enabled:true, visible:true, dragging:false, operation:'translate' }), true);
  assert.equal(canInteractWithAxisGuides({ enabled:false, visible:true, dragging:false, operation:'translate' }), false);
  assert.equal(canInteractWithAxisGuides({ enabled:true, visible:false, dragging:false, operation:'translate' }), false);
  assert.equal(canInteractWithAxisGuides({ enabled:true, visible:true, dragging:true, operation:'translate' }), false);
  assert.equal(canInteractWithAxisGuides({ enabled:true, visible:true, dragging:false, operation:'rotate' }), false);
  assert.equal(shouldShowTransformHelper({ axisGuidesEnabled:false, operation:'translate' }), true);
  assert.equal(shouldShowTransformHelper({ axisGuidesEnabled:true, operation:'translate' }), true);
  assert.equal(shouldShowTransformHelper({ axisGuidesEnabled:false, operation:'rotate' }), true);
  assert.equal(shouldShowTransformHelper({ axisGuidesEnabled:false, operation:'scale' }), true);
});

test('reference image settings normalize optional project fields without embedding image data', () => {
  const settings = normalizeReferenceImageSettings({
    opacity: 9,
    layer: 'overlay',
    frame: { center:[4, 5, 6], size:[2, -4, 0] },
    views: { front:{
      scaleX:0,
      offsetY:99,
      rotation:400,
      mirror:true,
      backfaceCulling:false,
      transform:{ position:[1, 2, 3], rotation:[10, 20, 30], scale:[-2, 3, 99] },
      fileName:'front.png'
    } }
  });
  assert.equal(settings.opacity, 1);
  assert.equal(settings.layer, 'overlay');
  assert.deepEqual(settings.frame, { center:[4, 5, 6], size:[2, 4, 0.0001] });
  assert.equal(settings.views.front.scaleX, 0.01);
  assert.equal(settings.views.front.offsetY, 10);
  assert.equal(settings.views.front.rotation, 180);
  assert.equal(settings.views.front.backfaceCulling, false);
  assert.deepEqual(settings.views.front.transform, { position:[1, 2, 3], rotation:[10, 20, 30], scale:[2, 3, 1] });
  assert.equal(settings.views.front.fileName, 'front.png');
  assert.equal('dataUrl' in settings.views.front, false);
  assert.deepEqual(normalizeReferenceImageSettings(), {
    opacity: DEFAULT_REFERENCE_IMAGE_SETTINGS.opacity,
    layer: DEFAULT_REFERENCE_IMAGE_SETTINGS.layer,
    frame: { center:[0, 0, 0], size:[2, 2, 2] },
    views: {
      front:{ visible:true, scaleX:1, scaleY:1, offsetX:0, offsetY:0, rotation:0, mirror:false, backfaceCulling:true, transform:null, fileName:'' },
      left:{ visible:true, scaleX:1, scaleY:1, offsetX:0, offsetY:0, rotation:0, mirror:false, backfaceCulling:true, transform:null, fileName:'' },
      back:{ visible:true, scaleX:1, scaleY:1, offsetX:0, offsetY:0, rotation:0, mirror:false, backfaceCulling:true, transform:null, fileName:'' }
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
  assert.equal(front.backfaceCulling, true);
  assert.equal(front.transform, null);
});

test('reference image layout preserves an arbitrary 3D plane transform for perspective editing', () => {
  const transform = { position:[3, 4, 5], rotation:[12, 34, 56], scale:[7, 8, 1] };
  const layout = referenceImagePlaneLayout('left', normalizeReferenceImageSettings({ views:{ left:{ transform } } }), 1.5);
  assert.deepEqual(layout.transform, transform);
  assert.equal(layout.visible, true);
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
