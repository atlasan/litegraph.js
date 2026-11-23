// Launcher (tools/lg, lg.sh): argument parsing, runtime choice, configuration, state records,
// status logic and colours as unit tests; one integration test starts and stops the editor server
// on a free port through the CLI. Runs on Node (npm run test:integration) and Bun (bun test).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  APPS, SERVERS, UsageError, parseArgs, serverOf, serversFor, currentRuntime, chooseRuntime,
  runtimeExecutable, loadConfig, appUrl, serverEnv, stateDir, repositoryRoot,
} from '../lg/core.mjs';
import { readRecord, writeRecord, removeRecord, isAlive, classify, serverStatus, isPortFree, tail, stopServer } from '../lg/state.mjs';
import { useColor, useUnicode, painter, stripAnsi, table } from '../lg/term.mjs';

const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const helper = path.join(root, 'tools', 'lg', 'lg.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'litegraph-lg-'));
const freshDir = (name) => fs.mkdtempSync(path.join(tempRoot, name + '-'));

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

/** A pid that certainly belongs to no process: a child that has already exited. */
function deadPid() {
  const result = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' });
  return Number(result.stdout);
}

/** Runs the CLI on this test's runtime; resolves with {code, stdout, stderr}. */
function lg(args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [helper, ...args], { cwd: root, env: { ...process.env, NO_COLOR: '1', LG_NO_BROWSER: '1', ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test('parseArgs: commands, aliases, targets and options', () => {
  assert.deepEqual(parseArgs([]).command, 'menu');
  assert.deepEqual(parseArgs(['start']), { command: 'start', target: 'all', options: { json: false, color: null, browser: true, runtime: null, lines: 40, yes: false } });
  assert.equal(parseArgs(['up', 'editor']).command, 'start');
  assert.equal(parseArgs(['down']).target, 'all');
  assert.equal(parseArgs(['--help']).command, 'help');
  assert.equal(parseArgs(['-v']).command, 'version');
  assert.equal(parseArgs(['st']).command, 'status');
  const parsed = parseArgs(['open', 'docs', '--no-browser', '--runtime', 'bun', '--no-color']);
  assert.equal(parsed.target, 'docs');
  assert.equal(parsed.options.browser, false);
  assert.equal(parsed.options.runtime, 'bun');
  assert.equal(parsed.options.color, false);
  assert.equal(parseArgs(['status', '--runtime=node', '--json']).options.runtime, 'node');
  assert.equal(parseArgs(['logs', 'tester', '-n', '5']).options.lines, 5);
  for (const [argv, message] of [
    [['launch'], /Unknown command "launch"/],
    [['start', 'nope'], /Unknown app "nope"/],
    [['open'], /needs an app/],
    [['open', 'nope'], /Unknown app/],
    [['status', 'editor'], /takes no app/],
    [['start', 'editor', 'runner'], /Unexpected argument "runner"/],
    [['status', '--bogus'], /Unknown option --bogus/],
    [['start', '--runtime', 'deno'], /--runtime must be one of bun, node/],
    [['start', '--runtime'], /--runtime needs a value/],
    [['logs', 'editor', '--lines', '0'], /positive whole number/],
  ]) assert.throws(() => parseArgs(argv), (error) => error instanceof UsageError && message.test(error.message), argv.join(' '));
});

test('app table: pages map to their server; targets expand to servers', () => {
  assert.deepEqual(SERVERS, ['editor', 'runner']);
  assert.equal(serverOf('tester'), 'editor');
  assert.equal(serverOf('docs'), 'editor');
  assert.equal(serverOf('runner'), 'runner');
  assert.equal(serverOf('nope'), undefined);
  assert.deepEqual(serversFor('all'), ['editor', 'runner']);
  assert.deepEqual(serversFor('tester'), ['editor']);
  for (const name of SERVERS) assert.ok(fs.existsSync(path.join(root, APPS[name].script)), APPS[name].script);
});

test('runtime choice: --runtime, then LG_RUNTIME, then the launcher runtime', () => {
  assert.equal(currentRuntime({ bun: '1.4.4', node: '24.0.0' }), 'bun');
  assert.equal(currentRuntime({ node: '22.0.0' }), 'node');
  assert.deepEqual(chooseRuntime({ option: 'node', env: { LG_RUNTIME: 'bun' }, current: 'bun' }), { name: 'node', source: '--runtime' });
  assert.deepEqual(chooseRuntime({ env: { LG_RUNTIME: ' Bun ' }, current: 'node' }), { name: 'bun', source: 'LG_RUNTIME' });
  assert.deepEqual(chooseRuntime({ env: {}, current: 'bun' }), { name: 'bun', source: 'launcher' });
  assert.throws(() => chooseRuntime({ env: { LG_RUNTIME: 'deno' } }), /LG_RUNTIME must be one of/);
  // the launcher's own runtime is its executable; another one is looked up on PATH
  assert.deepEqual(runtimeExecutable('bun', { current: 'bun', execPath: '/x/bun', versions: { bun: '1.4.4' } }), { command: '/x/bun', version: '1.4.4' });
  assert.deepEqual(runtimeExecutable('bun', { current: 'node', probe: () => '1.4.4' }), { command: 'bun', version: '1.4.4' });
  assert.throws(() => runtimeExecutable('bun', { current: 'node', probe: () => null }), /bun was not found on PATH; install it from https:\/\/bun.sh or use --runtime node/);
  assert.throws(() => runtimeExecutable('node', { current: 'bun', probe: () => null }), /use --runtime bun/);
});

test('configuration: defaults, config.json, then environment; invalid ports are refused', () => {
  const dir = freshDir('config');
  assert.equal(stateDir({}, '/repo'), path.resolve('/repo/.lg'));
  assert.equal(stateDir({ LG_STATE_DIR: dir }, '/repo'), dir);
  assert.deepEqual(loadConfig({ env: {}, dir }).ports, { editor: 8000, runner: 3000 });
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ ports: { editor: 8100 } }));
  assert.deepEqual(loadConfig({ env: {}, dir }).ports, { editor: 8100, runner: 3000 });
  assert.deepEqual(loadConfig({ env: { LG_RUNNER_PORT: '3100', LG_EDITOR_PORT: '8200' }, dir }).ports, { editor: 8200, runner: 3100 });
  assert.throws(() => loadConfig({ env: { LG_EDITOR_PORT: '70000' }, dir }), /LG_EDITOR_PORT must be a port number/);
  fs.writeFileSync(path.join(dir, 'config.json'), '{ nope');
  assert.throws(() => loadConfig({ env: {}, dir }), /config.json is not valid JSON/);
  const config = { ports: { editor: 8001, runner: 3001 }, host: '127.0.0.1', stateDir: dir };
  assert.equal(appUrl('docs', config), 'http://127.0.0.1:8001/docs/api/index.html');
  assert.equal(appUrl('runner', config), 'http://127.0.0.1:3001/');
  // servers get their port; the runner keeps the caller's security settings and logs into the state folder
  const env = serverEnv('runner', config, { RUNNER_ALLOW_TYPES: '@servers', PORT: '1' });
  assert.equal(env.PORT, '3001');
  assert.equal(env.HOST, '127.0.0.1');
  assert.equal(env.RUNNER_ALLOW_TYPES, '@servers');
  assert.equal(env.LOG_FILE, path.join(dir, 'logs', 'runner.winston.log'));
  assert.equal(serverEnv('editor', config, {}).LOG_FILE, undefined);
});

test('state records, alive checks and status classification', async () => {
  const dir = freshDir('state');
  assert.equal(readRecord(dir, 'editor'), null);
  writeRecord(dir, { app: 'editor', pid: process.pid, port: 1 });
  assert.equal(readRecord(dir, 'editor').pid, process.pid);
  removeRecord(dir, 'editor');
  assert.equal(readRecord(dir, 'editor'), null);
  removeRecord(dir, 'editor'); // removing twice is fine

  assert.equal(isAlive(process.pid), true);
  assert.equal(isAlive(deadPid()), false);
  assert.equal(isAlive(0), false);
  assert.equal(isAlive(undefined), false);

  const record = { pid: 1 };
  assert.equal(classify({ record, alive: true, healthy: true }), 'running');
  assert.equal(classify({ record, alive: true, healthy: false }), 'starting');
  assert.equal(classify({ record, alive: false, healthy: false }), 'stale');
  assert.equal(classify({ record, alive: false, healthy: true }), 'foreign');
  assert.equal(classify({ record: null, alive: false, healthy: true }), 'foreign');
  assert.equal(classify({ record: null, alive: false, healthy: false }), 'stopped');

  // a record whose process is gone is reported once as stale and removed
  const port = await freePort();
  const config = { ports: { editor: port, runner: port }, host: '127.0.0.1', stateDir: dir };
  writeRecord(dir, { app: 'editor', pid: deadPid(), port, runtime: 'node' });
  assert.equal((await serverStatus('editor', config)).state, 'stale');
  assert.equal(readRecord(dir, 'editor'), null);
  assert.equal((await serverStatus('editor', config)).state, 'stopped');
  assert.deepEqual(await stopServer('editor', { config }), { app: 'editor', result: 'not-running' });

  // a port held by something else
  const blocker = net.createServer().listen(port, '127.0.0.1');
  await new Promise((resolve) => blocker.once('listening', resolve));
  assert.equal(await isPortFree(port), false);
  await new Promise((resolve) => blocker.close(resolve));
  assert.equal(await isPortFree(port), true);

  fs.writeFileSync(path.join(dir, 'log.txt'), 'a\nb\nc\n\n');
  assert.equal(tail(path.join(dir, 'log.txt'), 2), 'b\nc');
  assert.equal(tail(path.join(dir, 'missing.txt')), '');
});

test('colours and symbols switch off cleanly', () => {
  assert.equal(useColor({ option: false, env: { FORCE_COLOR: '1' }, isTTY: true }), false);
  assert.equal(useColor({ option: true, env: { NO_COLOR: '1' }, isTTY: false }), true);
  assert.equal(useColor({ env: { NO_COLOR: '1' }, isTTY: true }), false);
  assert.equal(useColor({ env: { NO_COLOR: '' }, isTTY: true }), true, 'an empty NO_COLOR does not count');
  assert.equal(useColor({ env: { FORCE_COLOR: '1' }, isTTY: false }), true);
  assert.equal(useColor({ env: { FORCE_COLOR: '0' }, isTTY: true }), false);
  assert.equal(useColor({ env: { TERM: 'dumb' }, isTTY: true }), false);
  assert.equal(useColor({ env: {}, isTTY: false }), false);
  assert.equal(useColor({ env: {}, isTTY: true }), true);
  assert.equal(useUnicode({ env: {}, platform: 'linux' }), true);
  assert.equal(useUnicode({ env: { TERM: 'linux' }, platform: 'linux' }), false, 'the Linux text console');
  assert.equal(useUnicode({ env: {}, platform: 'win32' }), false, 'classic Windows console');
  assert.equal(useUnicode({ env: { WT_SESSION: 'x' }, platform: 'win32' }), true, 'Windows Terminal');
  assert.equal(useUnicode({ env: { LG_ASCII: '1' }, platform: 'darwin' }), false);
  assert.equal(painter(false).green('ok'), 'ok');
  assert.equal(painter(true).green('ok'), '\x1b[32mok\x1b[39m');
  assert.equal(stripAnsi(painter(true).bold('x')), 'x');
  assert.equal(table([[painter(true).red('a'), 'b'], ['ccc', 'd']]), '\x1b[31ma\x1b[39m    b\nccc  d');
});

test('CLI: usage errors exit 2; help, version and JSON status without a terminal', async () => {
  const env = { LG_STATE_DIR: freshDir('cli'), LG_EDITOR_PORT: String(await freePort()), LG_RUNNER_PORT: String(await freePort()) };
  const bad = await lg(['launch'], env);
  assert.equal(bad.code, 2);
  assert.match(bad.stderr, /Unknown command "launch"/);
  assert.match((await lg(['help'], env)).stdout, /Usage: lg <command>/);
  assert.equal((await lg(['version'], env)).stdout.trim(), JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version);
  const status = await lg(['status', '--json'], env);
  assert.equal(status.code, 0, status.stderr);
  assert.deepEqual(JSON.parse(status.stdout).map((entry) => [entry.app, entry.state]), [['editor', 'stopped'], ['runner', 'stopped']]);
  // no TTY: the menu prints help and status instead of waiting for input
  const menu = await lg([], env);
  assert.equal(menu.code, 0);
  assert.match(menu.stdout, /Usage: lg/);
  assert.match(menu.stdout, /editor +o stopped|editor +○ stopped/);
  assert.doesNotMatch(menu.stdout, /\x1b\[/, 'NO_COLOR output has no escape codes');
  const info = JSON.parse((await lg(['info', '--json'], env)).stdout);
  assert.equal(info.launcher.runtime, currentRuntime());
  assert.equal(info.ports.editor, Number(env.LG_EDITOR_PORT));
  assert.equal(info.stateDir, env.LG_STATE_DIR);
  assert.equal(path.resolve(info.repository), path.resolve(repositoryRoot));
});

test('lg.sh picks Bun, else Node, else prints install hints', { skip: process.platform === 'win32' && 'POSIX shell wrapper' }, () => {
  const bin = freshDir('bin');
  const sh = path.join(root, 'lg.sh');
  const run = (pathValue, env = {}) => spawnSync('/bin/sh', [sh, 'info', '--json'], { encoding: 'utf8', env: { PATH: pathValue, HOME: os.homedir(), LG_STATE_DIR: path.join(bin, 'state'), ...env } });
  const systemPath = '/usr/bin:/bin';
  const hasSystemRuntime = ['node', 'bun'].some((name) => spawnSync('/bin/sh', ['-c', `command -v ${name}`], { env: { PATH: systemPath } }).status === 0);
  if (!hasSystemRuntime) {
    const none = run(systemPath);
    assert.equal(none.status, 127);
    assert.match(none.stderr, /neither Bun nor Node.js was found on PATH/);
    assert.match(none.stderr, /https:\/\/bun\.sh/);
  }
  // only this test's runtime on PATH, under its own name
  const name = currentRuntime();
  fs.symlinkSync(process.execPath, path.join(bin, name));
  const only = run(`${bin}:${systemPath}`);
  assert.equal(only.status, 0, only.stderr);
  assert.equal(JSON.parse(only.stdout).launcher.runtime, name);
  const other = name === 'bun' ? 'node' : 'bun';
  if (!hasSystemRuntime) {
    const missing = run(`${bin}:${systemPath}`, { LG_RUNTIME: other });
    assert.equal(missing.status, 127);
    assert.match(missing.stderr, new RegExp(`LG_RUNTIME=${other}, but ${other} was not found`));
  }
  const invalid = run(`${bin}:${systemPath}`, { LG_RUNTIME: 'deno' });
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /LG_RUNTIME must be bun or node/);
});

test('CLI: start, status, open and stop the editor server on a free port', { timeout: 60000 }, async () => {
  const dir = freshDir('editor');
  const env = { LG_STATE_DIR: dir, LG_EDITOR_PORT: String(await freePort()), LG_RUNNER_PORT: String(await freePort()) };
  const port = Number(env.LG_EDITOR_PORT);
  try {
    const started = await lg(['start', 'editor'], env);
    assert.equal(started.code, 0, started.stdout + started.stderr);
    assert.match(started.stdout, new RegExp(`editor running http://127.0.0.1:${port}/editor/editor_build.html`));
    const record = readRecord(dir, 'editor');
    assert.equal(record.runtime, currentRuntime(), 'the server runs on the launcher runtime');
    assert.equal(isAlive(record.pid), true);

    const status = JSON.parse((await lg(['status', '--json'], env)).stdout);
    assert.deepEqual(status.map((entry) => [entry.app, entry.state]), [['editor', 'running'], ['runner', 'stopped']]);

    // the editor server serves the apps and docs/, from the repository root
    for (const urlPath of ['/editor/editor_build.html', '/apps/tester/index.html', '/docs/getting-started.md', '/build/litegraph.js']) {
      const response = await fetch(`http://127.0.0.1:${port}${urlPath}`);
      assert.equal(response.status, 200, urlPath);
    }
    const opened = await lg(['open', 'docs'], env);
    assert.equal(opened.code, 0, opened.stderr);
    assert.match(opened.stdout, new RegExp(`open docs: http://127.0.0.1:${port}/docs/api/index.html`));
    assert.equal(readRecord(dir, 'editor').pid, record.pid, 'open reuses the running server');

    const again = await lg(['start', 'editor'], env);
    assert.match(again.stdout, /already running/);

    // a second launcher with another state folder refuses the busy port and names the setting
    const clash = await lg(['start', 'editor'], { ...env, LG_STATE_DIR: freshDir('other') });
    assert.equal(clash.code, 1);
    assert.match(clash.stderr, /port \d+ is in use by another process.*LG_EDITOR_PORT=<port>/);

    const logs = await lg(['logs', 'tester'], env);
    assert.match(logs.stdout, /lg start editor/);

    const stopped = await lg(['stop'], env);
    assert.equal(stopped.code, 0, stopped.stderr);
    assert.match(stopped.stdout, new RegExp(`editor stopped \\(pid ${record.pid}\\)`));
    assert.match(stopped.stdout, /runner was not running/);
    assert.equal(readRecord(dir, 'editor'), null);
    const deadline = Date.now() + 5000;
    while (isAlive(record.pid) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(isAlive(record.pid), false);
    assert.equal(await isPortFree(port), true);
  } finally {
    await lg(['stop'], env);
  }
});

test.after?.(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
