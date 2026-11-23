// Launcher state: one JSON record per started server under <state>/run/, one log per server under
// <state>/logs/, plus alive, health and port checks, detached start and stop.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { APPS, repositoryRoot } from './core.mjs';

const isWindows = process.platform === 'win32';

export function runDir(dir) { return path.join(dir, 'run'); }
export function logDir(dir) { return path.join(dir, 'logs'); }
export function recordFile(dir, name) { return path.join(runDir(dir), `${name}.json`); }
export function logFile(dir, name) { return path.join(logDir(dir), `${name}.log`); }

export function readRecord(dir, name) {
  try { return JSON.parse(fs.readFileSync(recordFile(dir, name), 'utf8')); }
  catch { return null; }
}

export function writeRecord(dir, record) {
  fs.mkdirSync(runDir(dir), { recursive: true });
  const file = recordFile(dir, record.app);
  fs.writeFileSync(file + '.tmp', JSON.stringify(record, null, 2) + '\n');
  fs.renameSync(file + '.tmp', file);
}

export function removeRecord(dir, name) {
  fs.rmSync(recordFile(dir, name), { force: true });
}

/** True when a process with this pid exists (EPERM: it exists but belongs to someone else). */
export function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code === 'EPERM'; }
}

/** GET http://host:port/path; resolves to the status code, or 0 when nothing answers in time. */
export function probeHttp(host, port, urlPath = '/', timeoutMs = 1500) {
  return new Promise((resolve) => {
    const request = http.get({ host, port, path: urlPath, timeout: timeoutMs, headers: { Host: `${host}:${port}` } }, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });
    request.on('timeout', () => { request.destroy(); resolve(0); });
    request.on('error', () => resolve(0));
  });
}

/** True when nothing listens on host:port (a test listen succeeds). */
export function isPortFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, host, () => server.close(() => resolve(true)));
  });
}

/**
 * The state of one server from its record, whether its pid lives and whether its port answers.
 * - running: our process, answering
 * - starting: our process, not answering yet (or not answering at all)
 * - stale: a record whose process is gone
 * - foreign: no live record, but something answers on the port
 * - stopped: nothing
 */
export function classify({ record, alive, healthy }) {
  if (record && alive) return healthy ? 'running' : 'starting';
  if (record && !alive) return healthy ? 'foreign' : 'stale';
  return healthy ? 'foreign' : 'stopped';
}

/** Status of a server; removes a stale record (reported once as `stale`). */
export async function serverStatus(name, config) {
  const record = readRecord(config.stateDir, name);
  const port = record?.port ?? config.ports[name];
  const alive = record ? isAlive(record.pid) : false;
  const code = await probeHttp(config.host, port, APPS[name].health);
  const healthy = code > 0 && code < 500;
  const state = classify({ record, alive, healthy });
  if (record && !alive) removeRecord(config.stateDir, name);
  return { app: name, state, port, pid: alive ? record.pid : null, runtime: record?.runtime ?? null, runtimeVersion: record?.runtimeVersion ?? null, startedAt: record?.startedAt ?? null, log: logFile(config.stateDir, name), http: code || null };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The last `lines` lines of a file ('' when it does not exist). */
export function tail(file, lines = 40) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return ''; }
  const all = text.replace(/\s+$/, '').split(/\r?\n/);
  return all.slice(-lines).join('\n');
}

/**
 * Starts a server detached, logging to <state>/logs/<name>.log, and waits until its health path
 * answers. Throws with the log tail when the process exits or the wait times out.
 * @returns {Promise<object>} the record
 */
export async function startServer(name, { config, runtime, env }) {
  const app = APPS[name];
  const port = config.ports[name];
  fs.mkdirSync(logDir(config.stateDir), { recursive: true });
  const log = logFile(config.stateDir, name);
  const fd = fs.openSync(log, 'a');
  fs.writeSync(fd, `\n--- ${new Date().toISOString()} lg start ${name}: ${runtime.command} ${app.script} (port ${port}) ---\n`);
  let child;
  try {
    child = spawn(runtime.command, [path.join(repositoryRoot, app.script)], {
      cwd: repositoryRoot,
      env,
      stdio: ['ignore', fd, fd],
      detached: true, // own process group on POSIX, so stop reaches its children; no console window on Windows
      windowsHide: true,
    });
  } finally {
    fs.closeSync(fd);
  }
  let exited = null;
  child.once('exit', (code, signal) => { exited = { code, signal }; });
  const spawnError = new Promise((resolve) => child.once('error', resolve));
  child.unref();
  const record = { app: name, pid: child.pid, port, runtime: runtime.name, runtimeVersion: runtime.version, command: runtime.command, script: app.script, startedAt: new Date().toISOString(), log };
  if (!child.pid) {
    const error = await spawnError;
    throw new Error(`Could not start ${name} with ${runtime.command}: ${error?.message ?? 'unknown error'}`);
  }
  writeRecord(config.stateDir, record);
  const deadline = Date.now() + config.startTimeoutMs;
  while (Date.now() < deadline) {
    if (exited) break;
    const code = await probeHttp(config.host, port, app.health, 1000);
    if (code > 0 && code < 500) return record;
    await sleep(200);
  }
  removeRecord(config.stateDir, name);
  if (!exited) killTree(child.pid, true);
  const why = exited ? `exited (${exited.signal ?? 'code ' + exited.code})` : `did not answer on port ${port} within ${config.startTimeoutMs} ms (LG_START_TIMEOUT)`;
  const error = new Error(`${name} ${why}. Last lines of ${log}:\n${tail(log, 15)}`);
  error.log = log;
  throw error;
}

/** Signals a process and its group (POSIX) or tree (Windows). */
export function killTree(pid, force = false) {
  if (isWindows) {
    const result = spawnSync('taskkill', ['/pid', String(pid), '/T', ...(force ? ['/F'] : [])], { windowsHide: true, encoding: 'utf8' });
    if (result.status !== 0 && !force) spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true });
    return;
  }
  const signal = force ? 'SIGKILL' : 'SIGTERM';
  try { process.kill(-pid, signal); }
  catch { try { process.kill(pid, signal); } catch { /* already gone */ } }
}

/**
 * Stops a server started by the launcher: SIGTERM to its group, then SIGKILL after `graceMs`.
 * @returns {Promise<{app: string, result: 'stopped'|'not-running', pid?: number}>}
 */
export async function stopServer(name, { config, graceMs = 5000 }) {
  const record = readRecord(config.stateDir, name);
  if (!record || !isAlive(record.pid)) {
    removeRecord(config.stateDir, name);
    return { app: name, result: 'not-running' };
  }
  killTree(record.pid, false);
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline && isAlive(record.pid)) await sleep(100);
  if (isAlive(record.pid)) {
    killTree(record.pid, true);
    const hard = Date.now() + 2000;
    while (Date.now() < hard && isAlive(record.pid)) await sleep(100);
  }
  removeRecord(config.stateDir, name);
  return { app: name, result: 'stopped', pid: record.pid };
}
