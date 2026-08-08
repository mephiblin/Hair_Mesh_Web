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

  await page.evaluate(() => document.getElementById('createBoxProxyBtn').click());
  await page.keyboard.press('Shift+G');
  let runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
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
  const unlockedProxyName = runtime.selectedProxyName;
  const lockedProxyScreenPosition = runtime.selectedProxyScreenPosition;
  await page.mouse.click(lockedCurveMidpoint.x, lockedCurveMidpoint.y);
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.selectedProxyName, unlockedProxyName, 'LMB must not select an edit-locked Curve in the viewport');
  await page.mouse.click(lockedCurveMidpoint.x, lockedCurveMidpoint.y, { button:'right' });
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.contextMenuVisible, false, 'RMB must not target an edit-locked Curve');
  assert.equal(runtime.selectedProxyName, unlockedProxyName);

  await page.locator('#proxyList .scene-lock').click();
  await page.locator('#curveList .scene-row-main').click();
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.selectedCurveName, lockedCurveName, 'Scene Explorer must remain available for inspecting or unlocking a locked Curve');
  await page.mouse.click(lockedProxyScreenPosition.x, lockedProxyScreenPosition.y);
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.selectedCurveName, lockedCurveName, 'LMB must not select an edit-locked Proxy in the viewport');
  await page.mouse.click(lockedProxyScreenPosition.x, lockedProxyScreenPosition.y, { button:'right' });
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.contextMenuVisible, false, 'RMB must not target an edit-locked Proxy');
  assert.equal(runtime.selectedCurveName, lockedCurveName);

  await page.setViewportSize({ width:1024, height:768 });
  const shell = await page.locator('.editor-shell').evaluate(element => ({
    scrollWidth:element.scrollWidth,
    clientWidth:element.clientWidth,
    scrollHeight:element.scrollHeight,
    clientHeight:element.clientHeight
  }));
  assert.equal(shell.scrollWidth, shell.clientWidth, '1024px layout must not overflow horizontally');
  assert.equal(shell.scrollHeight, shell.clientHeight, '1024px layout must not overflow vertically');
  assert.deepEqual(runtimeErrors, [], 'browser runtime must not report errors');

  console.log(`PASS viewport regression · self-test ${selfTest.tests.length}/${selfTest.tests.length} · Axis/gizmo split · FFD highlight/drag/toggle · context menus · locked object pick exclusion · 1024px layout`);
} finally {
  if (browser) await browser.close();
  await stopServer(server);
}
