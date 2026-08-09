import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const projectRoot = new URL('../', import.meta.url);

function startServer() {
  const server = spawn('python3', ['-u', 'launch_server.py', '--no-browser', '--port', '0'], {
    cwd:projectRoot,
    stdio:['ignore', 'pipe', 'pipe']
  });
  server.stdout.setEncoding('utf8');
  server.stderr.setEncoding('utf8');
  let output = '';
  const url = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server start timeout\n${output}`)), 10000);
    const inspect = chunk => {
      output += chunk;
      const match = output.match(/Open: (http:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    };
    server.stdout.on('data', inspect);
    server.stderr.on('data', inspect);
    server.once('exit', code => {
      clearTimeout(timer);
      reject(new Error(`server exited before startup (${code})\n${output}`));
    });
  });
  return { server, url };
}

async function stopServer(server) {
  if (server.exitCode != null) return;
  server.kill('SIGINT');
  await Promise.race([
    new Promise(resolve => server.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, 3000))
  ]);
  if (server.exitCode == null) server.kill('SIGTERM');
}

const { server, url:serverUrl } = startServer();
let browser;

try {
  const url = await serverUrl;
  browser = await chromium.launch({ headless:true });
  const page = await browser.newPage({ viewport:{ width:1600, height:900 } });
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`${url}?selftest=1`, { waitUntil:'networkidle' });

  const selfTest = await page.evaluate(() => globalThis.__CURVE_TOOL_SELF_TEST__);
  assert.equal(selfTest.passed, true, 'browser core self-test must pass');

  const curvePage = await browser.newPage({ viewport:{ width:1600, height:900 } });
  await curvePage.addInitScript(() => localStorage.clear());
  await curvePage.goto(`${url}?selftest=1`, { waitUntil:'networkidle' });
  await curvePage.evaluate(() => document.getElementById('newCurveBtn').click());
  await curvePage.mouse.click(350, 220);
  await curvePage.mouse.click(650, 220);
  await curvePage.mouse.click(500, 460);
  await curvePage.evaluate(() => document.getElementById('createEditBtn').click());
  let curveRuntime = await curvePage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  const curveControls = curveRuntime.selectedCurveControlScreenPositions;
  await curvePage.mouse.click(curveControls[0].x, curveControls[0].y);
  await curvePage.keyboard.down('Control');
  await curvePage.mouse.click(curveControls[2].x, curveControls[2].y);
  await curvePage.keyboard.up('Control');
  curveRuntime = await curvePage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.deepEqual(curveRuntime.selectedCurvePointIndices, [0, 2], 'Ctrl-click must keep both Curve anchors selected');

  await curvePage.keyboard.press('E');
  await curvePage.waitForTimeout(50);
  curveRuntime = await curvePage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(curveRuntime.pointTool, 'pointRotate');
  assert.deepEqual(curveRuntime.gizmoPointIndices, [0, 2], 'Point Rotate must target every selected Curve anchor');
  const pointPositionsBeforeRotate = curveRuntime.selectedCurvePointPositions;
  const rotateGizmo = curveRuntime.gizmoScreenPosition;
  await curvePage.mouse.move(rotateGizmo.x + 90, rotateGizmo.y);
  await curvePage.mouse.down();
  await curvePage.mouse.move(rotateGizmo.x, rotateGizmo.y - 90, { steps:18 });
  await curvePage.mouse.up();
  curveRuntime = await curvePage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  const pointPositionsAfterRotate = curveRuntime.selectedCurvePointPositions;
  assert.ok(pointPositionsAfterRotate[0].some((value, axis) => Math.abs(value - pointPositionsBeforeRotate[0][axis]) > 1e-5), 'Rotate gizmo drag must move the first selected Anchor');
  assert.ok(pointPositionsAfterRotate[2].some((value, axis) => Math.abs(value - pointPositionsBeforeRotate[2][axis]) > 1e-5), 'Rotate gizmo drag must move the second selected Anchor');
  assert.ok(pointPositionsAfterRotate[1].every((value, axis) => Math.abs(value - pointPositionsBeforeRotate[1][axis]) < 1e-8), 'Rotate gizmo drag must leave an unselected Anchor unchanged');
  assert.ok(pointPositionsAfterRotate[0].map((value, axis) => (value + pointPositionsAfterRotate[2][axis]) * .5).every((value, axis) => Math.abs(value - (pointPositionsBeforeRotate[0][axis] + pointPositionsBeforeRotate[2][axis]) * .5) < 1e-8), 'Rotate gizmo drag must preserve the shared selection center');
  await curvePage.keyboard.press('Control+z');
  curveRuntime = await curvePage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.ok(curveRuntime.selectedCurvePointPositions.flatMap((point, index) => point.map((value, axis) => Math.abs(value - pointPositionsBeforeRotate[index][axis]))).every(delta => delta < 1e-8), 'one Undo must restore the multi-Point rotation');
  await curvePage.keyboard.press('Control+y');
  curveRuntime = await curvePage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.ok(curveRuntime.selectedCurvePointPositions.flatMap((point, index) => point.map((value, axis) => Math.abs(value - pointPositionsAfterRotate[index][axis]))).every(delta => delta < 1e-8), 'one Redo must restore the multi-Point rotation');
  await curvePage.keyboard.press('Control+z');

  await curvePage.keyboard.press('R');
  await curvePage.waitForTimeout(50);
  curveRuntime = await curvePage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(curveRuntime.pointTool, 'pointScale');
  assert.deepEqual(curveRuntime.gizmoPointIndices, [0, 2], 'Point Scale must target every selected Curve anchor');
  const pointPositionsBeforeScale = curveRuntime.selectedCurvePointPositions;
  const scaleGizmo = curveRuntime.gizmoScreenPosition;
  await curvePage.mouse.move(scaleGizmo.x + 58, scaleGizmo.y + 18);
  await curvePage.mouse.down();
  await curvePage.mouse.move(scaleGizmo.x + 110, scaleGizmo.y + 35, { steps:18 });
  await curvePage.mouse.up();
  curveRuntime = await curvePage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  const pointPositionsAfterScale = curveRuntime.selectedCurvePointPositions;
  assert.ok(pointPositionsAfterScale[0].some((value, axis) => Math.abs(value - pointPositionsBeforeScale[0][axis]) > 1e-5), 'Scale gizmo drag must move the first selected Anchor');
  assert.ok(pointPositionsAfterScale[2].some((value, axis) => Math.abs(value - pointPositionsBeforeScale[2][axis]) > 1e-5), 'Scale gizmo drag must move the second selected Anchor');
  assert.ok(pointPositionsAfterScale[1].every((value, axis) => Math.abs(value - pointPositionsBeforeScale[1][axis]) < 1e-8), 'Scale gizmo drag must leave an unselected Anchor unchanged');
  assert.ok(pointPositionsAfterScale[0].map((value, axis) => (value + pointPositionsAfterScale[2][axis]) * .5).every((value, axis) => Math.abs(value - (pointPositionsBeforeScale[0][axis] + pointPositionsBeforeScale[2][axis]) * .5) < 1e-8), 'Scale gizmo drag must preserve the shared selection center');
  await curvePage.keyboard.press('Control+z');
  curveRuntime = await curvePage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.ok(curveRuntime.selectedCurvePointPositions.flatMap((point, index) => point.map((value, axis) => Math.abs(value - pointPositionsBeforeScale[index][axis]))).every(delta => delta < 1e-8), 'one Undo must restore the multi-Point scale');
  await curvePage.keyboard.press('Control+y');
  curveRuntime = await curvePage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.ok(curveRuntime.selectedCurvePointPositions.flatMap((point, index) => point.map((value, axis) => Math.abs(value - pointPositionsAfterScale[index][axis]))).every(delta => delta < 1e-8), 'one Redo must restore the multi-Point scale');
  await curvePage.keyboard.press('Control+z');
  await curvePage.close();

  const softPage = await browser.newPage({ viewport:{ width:1600, height:900 } });
  const softRuntimeErrors = [];
  softPage.on('pageerror', error => softRuntimeErrors.push(error.message));
  softPage.on('console', message => { if (message.type() === 'error') softRuntimeErrors.push(message.text()); });
  await softPage.addInitScript(() => localStorage.clear());
  await softPage.goto(`${url}?selftest=1`, { waitUntil:'networkidle' });
  await softPage.evaluate(() => document.getElementById('newCurveBtn').click());
  for (const x of [300, 420, 540, 660, 780]) await softPage.mouse.click(x, 300);
  await softPage.evaluate(() => document.getElementById('createEditBtn').click());
  let softRuntime = await softPage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  const softControls = softRuntime.selectedCurveControlScreenPositions;
  await softPage.mouse.click(softControls[2].x, softControls[2].y);
  await softPage.locator('button.rollout-header', { hasText:'Soft Selection' }).click();
  await softPage.locator('#softSelectionEnabled').click();
  softRuntime = await softPage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  const initialSoftWeights = softRuntime.softSelectionWeights;
  assert.equal(softRuntime.softSelectionSettings.enabled, true);
  assert.equal(initialSoftWeights[2], 1, 'hard-selected Curve Anchor must keep weight 1');
  assert.ok(initialSoftWeights[1] > 0 && initialSoftWeights[1] < 1 && initialSoftWeights[3] > 0 && initialSoftWeights[3] < 1, 'adjacent Curve Anchors must receive partial soft-selection weights');
  assert.equal(initialSoftWeights[0], 0);
  assert.equal(initialSoftWeights[4], 0);
  assert.deepEqual(softRuntime.gizmoAffectedPointIndices, [1, 2, 3], 'Point Move must include hard and soft-selected Anchors');
  assert.equal(softRuntime.selectedCurveControlColors[2], 0xffff8a, 'hard selection must retain the yellow active color');
  assert.notEqual(softRuntime.selectedCurveControlColors[1], 0x6da6ff, 'soft-selected Anchors must expose a visible weight color');
  assert.match(softRuntime.softSelectionSummary, /1 Hard · 2 Soft/);
  await softPage.locator('#softSelectionFalloff').fill('0.5');
  await softPage.locator('#softSelectionFalloff').press('Tab');
  softRuntime = await softPage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.deepEqual(softRuntime.softSelectionWeights, [0, 0, 1, 0, 0], 'reducing Falloff must remove Anchors outside the Curve-length range');
  await softPage.locator('#softSelectionFalloff').fill('1');
  await softPage.locator('#softSelectionFalloff').press('Tab');
  await softPage.locator('#softSelectionEnabled').click();
  softRuntime = await softPage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.deepEqual(softRuntime.softSelectionWeights, [0, 0, 1, 0, 0], 'Soft Selection OFF must leave only the hard selection weighted');
  await softPage.locator('#softSelectionEnabled').click();
  softRuntime = await softPage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.ok(softRuntime.softSelectionWeights[1] > 0 && softRuntime.softSelectionWeights[3] > 0, 'Soft Selection ON must restore the derived neighboring weights');
  if (process.env.HAIR_MESH_QA_SCREENSHOTS) await softPage.screenshot({ path:'/tmp/hair-mesh-soft-selection-1600.png', scale:'css' });

  await softPage.locator('button.rollout-header', { hasText:'Live Curve → Mesh' }).click();
  await softPage.locator('#enableLiveMesh').click();
  softRuntime = await softPage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(softRuntime.selectedCurveMeshEnabled, true, 'Soft Selection transforms must be exercised with Live Mesh enabled');

  const positionsBeforeSoftMove = softRuntime.selectedCurvePointPositions;
  await softPage.mouse.move(softControls[2].x, softControls[2].y);
  await softPage.mouse.down();
  await softPage.mouse.move(softControls[2].x, softControls[2].y - 80, { steps:12 });
  await softPage.mouse.up();
  softRuntime = await softPage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  const moveDeltas = softRuntime.selectedCurvePointPositions.map((point, index) => Math.hypot(...point.map((value, axis) => value - positionsBeforeSoftMove[index][axis])));
  assert.ok(moveDeltas[2] > moveDeltas[1] && moveDeltas[1] > 0, 'soft Point Move must diminish away from the hard selection');
  assert.ok(Math.abs(moveDeltas[1] - moveDeltas[3]) < 1e-8, 'equal Curve distances must receive equal Move influence');
  assert.equal(moveDeltas[0], 0);
  assert.equal(moveDeltas[4], 0);
  await softPage.keyboard.press('Control+z');
  softRuntime = await softPage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(softRuntime.softSelectionSettings.enabled, true, 'Undoing geometry must preserve the enabled Soft Selection tool state');
  assert.ok(softRuntime.selectedCurvePointPositions.flatMap((point, index) => point.map((value, axis) => Math.abs(value - positionsBeforeSoftMove[index][axis]))).every(delta => delta < 1e-8), 'one Undo must restore the weighted Point Move');
  await softPage.keyboard.press('Control+y');
  softRuntime = await softPage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.ok(softRuntime.selectedCurvePointPositions[1].some((value, axis) => Math.abs(value - positionsBeforeSoftMove[1][axis]) > 1e-5), 'one Redo must restore the weighted Point Move');
  await softPage.keyboard.press('Control+z');

  await softPage.keyboard.press('E');
  await softPage.waitForTimeout(50);
  softRuntime = await softPage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  const positionsBeforeSoftRotate = softRuntime.selectedCurvePointPositions;
  const softRotateGizmo = softRuntime.gizmoScreenPosition;
  assert.deepEqual(softRuntime.gizmoAffectedPointIndices, [1, 2, 3], 'Point Rotate must keep the same soft influence set');
  await softPage.mouse.move(softRotateGizmo.x + 90, softRotateGizmo.y);
  await softPage.mouse.down();
  await softPage.mouse.move(softRotateGizmo.x, softRotateGizmo.y - 90, { steps:18 });
  await softPage.mouse.up();
  softRuntime = await softPage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  const rotateDeltas = softRuntime.selectedCurvePointPositions.map((point, index) => Math.hypot(...point.map((value, axis) => value - positionsBeforeSoftRotate[index][axis])));
  assert.ok(rotateDeltas[1] > 1e-5 && rotateDeltas[3] > 1e-5, 'soft Point Rotate must move both influenced neighbors');
  assert.ok(rotateDeltas[2] < 1e-8, 'the hard-selected Anchor at the rotation pivot must remain in place');
  assert.equal(rotateDeltas[0], 0);
  assert.equal(rotateDeltas[4], 0);
  await softPage.keyboard.press('Control+z');

  await softPage.keyboard.press('R');
  await softPage.waitForTimeout(50);
  softRuntime = await softPage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  const positionsBeforeSoftScale = softRuntime.selectedCurvePointPositions;
  const softScaleGizmo = softRuntime.gizmoScreenPosition;
  assert.deepEqual(softRuntime.gizmoAffectedPointIndices, [1, 2, 3], 'Point Scale must keep the same soft influence set');
  await softPage.mouse.move(softScaleGizmo.x + 58, softScaleGizmo.y + 18);
  await softPage.mouse.down();
  await softPage.mouse.move(softScaleGizmo.x + 110, softScaleGizmo.y + 35, { steps:18 });
  await softPage.mouse.up();
  softRuntime = await softPage.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  const scaleDeltas = softRuntime.selectedCurvePointPositions.map((point, index) => Math.hypot(...point.map((value, axis) => value - positionsBeforeSoftScale[index][axis])));
  assert.ok(scaleDeltas[1] > 1e-5 && scaleDeltas[3] > 1e-5, 'soft Point Scale must move both influenced neighbors');
  assert.ok(scaleDeltas[2] < 1e-8, 'the hard-selected Anchor at the scale pivot must remain in place');
  assert.equal(scaleDeltas[0], 0);
  assert.equal(scaleDeltas[4], 0);
  assert.equal(softRuntime.selectedCurveMeshEnabled, true, 'weighted Rotate/Scale must keep Live Mesh enabled and rebuilt');
  await softPage.keyboard.press('Control+z');
  await softPage.setViewportSize({ width:1024, height:768 });
  const softPanel = await softPage.locator('#softSelectionEnabled').evaluate(element => {
    const body = element.closest('.rollout-body').getBoundingClientRect();
    const input = element.getBoundingClientRect();
    return { bodyLeft:body.left, bodyRight:body.right, inputLeft:input.left, inputRight:input.right };
  });
  assert.ok(softPanel.inputLeft >= softPanel.bodyLeft && softPanel.inputRight <= softPanel.bodyRight, 'Soft Selection controls must remain inside the compact Modify panel');
  if (process.env.HAIR_MESH_QA_SCREENSHOTS) await softPage.screenshot({ path:'/tmp/hair-mesh-soft-selection-1024.png', scale:'css' });
  assert.deepEqual(softRuntimeErrors, [], 'Soft Selection browser flow must not report runtime errors');
  await softPage.close();

  await page.keyboard.press('T');
  let runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.activeStandardView, 'top', 'T must open the 3ds Max Top view');
  assert.equal(runtime.cameraProjection, 'orthographic');
  await page.keyboard.press('B');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.activeStandardView, 'bottom', 'B must open the 3ds Max Bottom view');
  await page.keyboard.press('F');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.activeStandardView, 'front', 'F must open the 3ds Max Front view');
  await page.keyboard.press('L');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.activeStandardView, 'left', 'L must open the 3ds Max Left view');
  const leftDirection = runtime.cameraDirection;
  await page.keyboard.press('P');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.activeStandardView, 'perspective', 'P must switch to Perspective');
  assert.equal(runtime.cameraProjection, 'perspective');
  assert.ok(runtime.cameraDirection.every((value, index) => Math.abs(value - leftDirection[index]) < 1e-6), 'P must preserve the current viewing angle');
  await page.keyboard.press('U');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.activeStandardView, 'user', 'U must switch to a User orthographic view');
  assert.equal(runtime.cameraProjection, 'orthographic');
  await page.keyboard.press('V');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.viewportViewMenuVisible, true, 'V must open the Viewport Views menu');
  assert.equal(runtime.viewportViewMenuItems.length, 8);
  await page.keyboard.press('K');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.viewportViewMenuVisible, false, 'a V-menu choice must close the menu');
  assert.equal(runtime.activeStandardView, 'back', 'V then K must open Back view');
  assert.equal(runtime.cameraProjection, 'orthographic');
  await page.keyboard.press('V');
  await page.locator('[data-viewport-view="right"]').click();
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.activeStandardView, 'right', 'Right view must remain available as a V-menu click target');
  await page.keyboard.press('P');
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.id = 'shortcutTypingProbe';
    input.type = 'text';
    document.body.appendChild(input);
    input.focus();
  });
  await page.keyboard.press('T');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.activeStandardView, 'perspective', 'view shortcuts must not fire while typing in an input');
  await page.evaluate(() => document.getElementById('shortcutTypingProbe')?.remove());
  await page.locator('#viewport').click({ position:{ x:300, y:160 } });

  const viewCube = page.getByRole('button', { name:/ViewCube/ });
  assert.equal(await viewCube.isVisible(), true, 'ViewCube must be visible in the viewport corner');
  await page.evaluate(() => document.getElementById('viewFrontBtn').click());
  await page.waitForTimeout(50);
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.activeStandardView, 'front');
  assert.equal(runtime.cameraProjection, 'orthographic', 'ViewCube face views must honor Ortho Views');
  assert.ok(runtime.cameraDirection.every((value, index) => Math.abs(value - [0, 0, 1][index]) < 1e-6));
  const viewCubeBox = await viewCube.boundingBox();
  assert.ok(viewCubeBox, 'ViewCube canvas must be measurable');
  const selectionBadge = page.locator('#viewportBadge');
  assert.equal(await selectionBadge.textContent(), 'No Selection', 'empty scene must expose the selection status clearly');
  const selectionBadgeBox = await selectionBadge.boundingBox();
  assert.ok(selectionBadgeBox && selectionBadgeBox.y > viewCubeBox.y + viewCubeBox.height + 40, 'selection status must remain visually separate below the ViewCube');
  await page.mouse.move(viewCubeBox.x + viewCubeBox.width / 2, viewCubeBox.y + viewCubeBox.height / 2);
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.viewCubeHoverKind, 'face', 'ViewCube center hover must resolve a face');
  assert.equal(runtime.viewCubeHoverLabel, 'Front');
  await page.mouse.click(viewCubeBox.x + viewCubeBox.width / 2, viewCubeBox.y + viewCubeBox.height / 2);
  assert.equal((await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__)).activeStandardView, 'front', 'clicking the Front face must snap to Front');
  await viewCube.focus();
  assert.equal(await viewCube.evaluate(element => getComputedStyle(element).boxShadow), 'none', 'focused ViewCube must not draw a white canvas border');
  await page.keyboard.press('ArrowRight');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.activeStandardView, 'right', 'ViewCube ArrowRight must snap to Right');
  assert.equal(runtime.cameraProjection, 'orthographic');
  assert.ok(runtime.cameraDirection.every((value, index) => Math.abs(value - [1, 0, 0][index]) < 1e-6));
  await page.mouse.move(viewCubeBox.x + viewCubeBox.width / 2, viewCubeBox.y + viewCubeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(viewCubeBox.x + viewCubeBox.width / 2 - 24, viewCubeBox.y + viewCubeBox.height / 2 + 14, { steps:6 });
  await page.mouse.up();
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.activeStandardView, 'custom', 'ViewCube drag from a face view must enter a free camera view');
  assert.equal(runtime.cameraProjection, 'orthographic', 'ViewCube drag must preserve an orthographic projection');
  await page.keyboard.press('Enter');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.activeStandardView, 'perspective', 'ViewCube Enter must restore Perspective Home');
  assert.equal(runtime.cameraProjection, 'perspective');

  await page.evaluate(() => document.getElementById('createBoxProxyBtn').click());
  const directionBeforeViewCubeDrag = (await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__)).cameraDirection;
  await page.mouse.move(viewCubeBox.x + viewCubeBox.width / 2, viewCubeBox.y + viewCubeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(viewCubeBox.x + viewCubeBox.width / 2 + 38, viewCubeBox.y + viewCubeBox.height / 2 - 22, { steps:8 });
  await page.mouse.up();
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.activeStandardView, 'custom', 'dragging the ViewCube must enter a free camera view');
  assert.equal(runtime.cameraProjection, 'perspective', 'ViewCube drag must preserve the current projection');
  assert.equal(runtime.selectedProxyName, 'Box001', 'ViewCube drag must not change object selection');
  assert.ok(runtime.cameraDirection.some((value, index) => Math.abs(value - directionBeforeViewCubeDrag[index]) > 1e-3), 'ViewCube drag must rotate the camera');
  await viewCube.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+G');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.axisGuidesEnabled, false, 'Axis Lines must be OFF');
  assert.equal(runtime.axisGuidesVisible, false, 'long axis guides must be hidden');
  assert.equal(runtime.transformHelperVisible, true, 'standard XYZ gizmo must remain visible');
  assert.equal(runtime.transformHelperEnabled, true, 'standard XYZ gizmo must remain interactive');
  assert.equal(runtime.transformOperation, 'translate');

  await page.mouse.move(600, 430);
  await page.mouse.down();
  await page.mouse.move(450, 430, { steps:12 });
  await page.mouse.up();
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.ok(runtime.selectedProxyPosition.some(value => Math.abs(value) > 1e-8), 'Proxy surface drag must move the root object');
  await page.keyboard.press('Control+z');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.ok(runtime.selectedProxyPosition.every(value => Math.abs(value) < 1e-8), 'one Undo must restore the Proxy position');

  const canvas = await page.locator('#viewport > canvas').boundingBox();
  assert.ok(canvas, 'viewport canvas must be measurable');
  await page.mouse.click(canvas.x + canvas.width - 24, canvas.y + canvas.height - 24);
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.selectedProxyName, null, 'clicking empty object-mode viewport space must clear Proxy selection');
  assert.equal(runtime.selectedCurveName, null, 'empty viewport selection must not fall back to a Curve');
  assert.equal(runtime.mode, 'orbit', 'clearing object selection must return to Select/Camera mode');
  assert.equal(runtime.transformHelperVisible, false, 'clearing object selection must detach the transform gizmo');
  assert.equal(await page.locator('#viewportBadge').textContent(), 'No Selection');
  assert.equal(await page.locator('#modifyObjectType').textContent(), 'NONE');
  assert.equal(await page.locator('.scene-row.active-selection').count(), 0, 'Scene Explorer must show no active yellow row');
  await page.mouse.click(600, 430);
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.selectedProxyName, 'Box001', 'an object must remain selectable after clearing the selection');

  await page.mouse.click(600, 430, { button:'right' });
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.contextMenuVisible, true, 'right-clicking a Proxy must open the viewport context menu');
  assert.equal(runtime.contextMenuKind, 'proxy');
  assert.ok(runtime.contextMenuCommands.some(item => item.command === 'proxy-add-ffd-2' && !item.disabled));
  assert.ok(runtime.contextMenuCommands.some(item => item.command === 'proxy-smooth'));
  assert.ok(runtime.contextMenuCommands.some(item => item.command === 'proxy-show-edges'));
  await page.locator('[data-context-command="proxy-add-ffd-2"]').click();
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.mode, 'ffd', 'Add FFD from the context menu must enter FFD editing');
  assert.equal(runtime.ffdLatticeVisible, true);
  assert.equal(runtime.editFfdButtonLabel, 'Finish Editing');
  assert.equal(runtime.editFfdButtonActive, true);

  const secondControl = runtime.ffdControlScreenPositions[1];
  await page.keyboard.down('Control');
  await page.mouse.click(secondControl.x, secondControl.y);
  await page.keyboard.up('Control');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.deepEqual(runtime.selectedFfdControlIndices, [0, 1], 'Ctrl-click must add an FFD control to the selection');
  assert.ok(runtime.selectedFfdControlColors.every(color => color === 0xffff8a), 'every selected FFD control must use the yellow active color');
  assert.ok(runtime.selectedFfdControlScales.every(scale => scale > 1), 'selected FFD controls must be visibly enlarged');

  await page.mouse.move(secondControl.x, secondControl.y);
  await page.mouse.down();
  await page.mouse.move(secondControl.x + 24, secondControl.y - 10, { steps:8 });
  await page.mouse.up();
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.ok(runtime.selectedFfdControlOffsets.every(offset => offset.some(value => Math.abs(value) > 1e-8)), 'direct drag must move every selected FFD control');
  assert.ok(runtime.selectedFfdControlColors.every(color => color === 0xffff8a), 'FFD selection highlight must survive direct drag');
  const draggedOffsets = runtime.selectedFfdControlOffsets;
  await page.keyboard.press('Control+z');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.ok(runtime.selectedFfdControlOffsets.every(offset => offset.every(value => Math.abs(value) < 1e-8)), 'one Undo must restore every selected FFD control');
  assert.ok(runtime.selectedFfdControlColors.every(color => color === 0xffff8a), 'FFD selection highlight must survive Undo restore');
  await page.keyboard.press('Control+y');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.deepEqual(runtime.selectedFfdControlOffsets, draggedOffsets, 'one Redo must restore the multi-control FFD drag');

  await page.evaluate(() => document.getElementById('editFfdPointsBtn').click());
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.mode, 'orbit', 'pressing Edit Control Points again must exit FFD editing');
  assert.equal(runtime.ffdLatticeVisible, false, 'exiting FFD editing must hide the lattice');
  assert.equal(runtime.editFfdButtonLabel, 'Edit Control Points');
  assert.equal(runtime.editFfdButtonActive, false);
  await page.evaluate(() => document.getElementById('editFfdPointsBtn').click());
  assert.equal((await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__)).ffdLatticeVisible, true, 'Edit Control Points must reopen the lattice');

  await page.mouse.click(600, 430, { button:'right' });
  await page.locator('[data-context-command="proxy-edit-ffd"]').click();
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.mode, 'orbit', 'Proxy context menu must also exit FFD editing');
  assert.equal(runtime.ffdLatticeVisible, false);
  await page.evaluate(() => document.getElementById('editFfdPointsBtn').click());

  await page.mouse.click(600, 430, { button:'right' });
  await page.locator('[data-context-command="proxy-reset-ffd"]').click();
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.ok(runtime.selectedFfdControlOffsets.every(offset => offset.every(value => Math.abs(value) < 1e-8)), 'Reset FFD from the context menu must clear offsets');
  await page.mouse.click(600, 430, { button:'right' });
  await page.locator('[data-context-command="proxy-show-edges"]').click();
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.selectedProxyShowEdges, false, 'Show Edges context toggle must update Proxy settings');
  assert.equal(runtime.selectedProxyWireVisible, false, 'Show Edges context toggle must update the viewport');
  await page.mouse.click(600, 430, { button:'right' });
  await page.locator('[data-context-command="proxy-smooth"]').click();
  assert.equal((await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__)).selectedProxySmooth, true, 'Smooth Shading context toggle must update Proxy settings');
  await page.mouse.click(600, 430, { button:'right' });
  await page.locator('[data-context-command="proxy-remove-ffd"]').click();
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.mode, 'orbit', 'removing the last FFD must leave FFD mode');
  assert.equal(runtime.ffdLatticeVisible, false);

  await page.evaluate(() => document.getElementById('createSphereProxyBtn').click());
  await page.evaluate(() => document.getElementById('addFfd2Btn').click());
  assert.equal((await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__)).mode, 'ffd');
  await page.mouse.click(600, 400);
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.selectedProxyName, 'Box001', 'click-only FFD region input must fall through to Proxy object picking');
  assert.equal(runtime.mode, 'orbit', 'selecting a Proxy without FFD must leave FFD mode safely');

  await page.keyboard.press('Delete');
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.selectedProxyName, null, 'deleting one Proxy must not force-select another Proxy');
  assert.equal(runtime.selectedCurveName, null, 'deleting one Proxy must leave a valid empty selection');
  await page.locator('#proxyList .scene-row-main').click();
  await page.keyboard.press('Delete');
  await page.evaluate(() => document.getElementById('newCurveBtn').click());
  await page.mouse.click(350, 150);
  await page.mouse.click(550, 150);
  await page.evaluate(() => document.getElementById('createEditBtn').click());
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  const curveMidpoint = runtime.selectedCurveMidpointScreenPosition;
  await page.mouse.click(curveMidpoint.x, curveMidpoint.y, { button:'right' });
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.contextMenuKind, 'curve', 'right-clicking a Curve must open the Curve context menu');
  assert.ok(runtime.contextMenuCommands.some(item => item.command === 'curve-average-both' && !item.disabled));
  assert.ok(runtime.contextMenuCommands.some(item => item.command === 'curve-object-move'));
  assert.ok(runtime.contextMenuCommands.some(item => item.command === 'curve-live-mesh' && !item.checked));
  await page.locator('[data-context-command="curve-live-mesh"]').click();
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.selectedCurveMeshEnabled, true, 'Curve context menu must toggle Live Mesh in the viewport');

  const lockedCurveName = runtime.selectedCurveName;
  const lockedCurveMidpoint = runtime.selectedCurveMidpointScreenPosition;
  await page.locator('#curveList .scene-lock').click();
  await page.evaluate(() => document.getElementById('createBoxProxyBtn').click());
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  const lockedProxyScreenPosition = runtime.selectedProxyScreenPosition;
  await page.mouse.click(lockedCurveMidpoint.x, lockedCurveMidpoint.y);
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.selectedCurveName, null, 'LMB must not select an edit-locked Curve in the viewport');
  await page.mouse.click(lockedCurveMidpoint.x, lockedCurveMidpoint.y, { button:'right' });
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.notEqual(runtime.contextMenuKind, 'curve', 'RMB must not target an edit-locked Curve even when an editable object is behind it');

  await page.locator('#proxyList .scene-lock').click();
  await page.locator('#curveList .scene-row-main').click();
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.selectedCurveName, lockedCurveName, 'Scene Explorer must remain available for inspecting or unlocking a locked Curve');
  await page.mouse.click(lockedProxyScreenPosition.x, lockedProxyScreenPosition.y);
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.selectedProxyName, null, 'LMB must not select an edit-locked Proxy in the viewport');
  assert.equal(runtime.selectedCurveName, null, 'clicking an unpickable locked Proxy must clear the previous root selection');
  await page.mouse.click(lockedProxyScreenPosition.x, lockedProxyScreenPosition.y, { button:'right' });
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.contextMenuVisible, false, 'RMB must not target an edit-locked Proxy');
  assert.equal(runtime.selectedCurveName, null);

  await page.setViewportSize({ width:1024, height:768 });
  const shell = await page.locator('.editor-shell').evaluate(element => ({
    scrollWidth:element.scrollWidth,
    clientWidth:element.clientWidth,
    scrollHeight:element.scrollHeight,
    clientHeight:element.clientHeight
  }));
  assert.equal(shell.scrollWidth, shell.clientWidth, '1024px layout must not overflow horizontally');
  assert.equal(shell.scrollHeight, shell.clientHeight, '1024px layout must not overflow vertically');
  const compactViewport = await page.locator('#viewport').boundingBox();
  const compactViewCube = await viewCube.boundingBox();
  assert.ok(compactViewport && compactViewCube);
  assert.ok(compactViewCube.x >= compactViewport.x && compactViewCube.y >= compactViewport.y, 'ViewCube must remain inside the compact viewport');
  assert.ok(compactViewCube.x + compactViewCube.width <= compactViewport.x + compactViewport.width + 1);
  assert.deepEqual(runtimeErrors, [], 'browser runtime must not report errors');

  console.log(`PASS viewport regression · self-test ${selfTest.tests.length}/${selfTest.tests.length} · Curve Soft Selection Move/Rotate/Scale + Undo/Redo · 3ds T/B/F/L/P/U + V/K views · ViewCube face/drag/keyboard/Home · separate selection badge · empty object selection · Axis/gizmo split · Curve multi-point Rotate/Scale targeting · FFD highlight/drag/toggle · context menus · locked object pick exclusion · 1024px layout`);
} finally {
  if (browser) await browser.close();
  await stopServer(server);
}
