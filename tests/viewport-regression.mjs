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

  await page.evaluate(() => document.getElementById('createSphereProxyBtn').click());
  await page.evaluate(() => document.getElementById('addFfd2Btn').click());
  assert.equal((await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__)).mode, 'ffd');
  await page.mouse.click(600, 400);
  runtime = await page.evaluate(() => globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__);
  assert.equal(runtime.selectedProxyName, 'Box001', 'click-only FFD region input must fall through to Proxy object picking');
  assert.equal(runtime.mode, 'orbit', 'selecting a Proxy without FFD must leave FFD mode safely');

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

  console.log(`PASS viewport regression · self-test ${selfTest.tests.length}/${selfTest.tests.length} · Axis Lines/gizmo split · Proxy drag/Undo · FFD→Proxy pick · 1024px layout`);
} finally {
  if (browser) await browser.close();
  await stopServer(server);
}
