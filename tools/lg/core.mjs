// Launcher core: argument parsing, runtime choice, configuration and the app table.
// No dependencies; runs on Bun and Node. Pure functions where possible, so tests need no processes.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

export const COMMANDS = ['start', 'stop', 'restart', 'status', 'info', 'open', 'logs', 'help', 'menu', 'version'];
const ALIASES = { up: 'start', down: 'stop', st: 'status', ls: 'status', log: 'logs', '-h': 'help', '--help': 'help', '-v': 'version', '--version': 'version' };
export const RUNTIMES = ['bun', 'node'];

/**
 * The apps the launcher knows. A *server* has a script and a port; a *page* is served by a server.
 * `health` is the path probed over HTTP; `url` the path opened in the browser.
 */
export const APPS = {
  editor: { kind: 'server', script: 'apps/editor/server.js', port: 8000, portEnv: 'LG_EDITOR_PORT', health: '/editor/index.html', url: '/editor/editor_build.html', title: 'Editor (also serves the tester and /docs)' },
  runner: { kind: 'server', script: 'apps/runner/server/index.js', port: 3000, portEnv: 'LG_RUNNER_PORT', health: '/', url: '/', title: 'Graph runner' },
  tester: { kind: 'page', server: 'editor', url: '/apps/tester/index.html', title: 'Tester' },
  docs: { kind: 'page', server: 'editor', url: '/docs/api/index.html', title: 'API docs' },
};
export const SERVERS = Object.keys(APPS).filter((name) => APPS[name].kind === 'server');

export class UsageError extends Error {}

/**
 * Parses `lg <command> [app] [options]`.
 * @returns {{command: string, target: string|null, options: object}}
 */
export function parseArgs(argv) {
  const options = { json: false, color: null, browser: true, runtime: null, lines: 40, yes: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [flag, inline] = arg.startsWith('--') && arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined];
    const value = () => {
      if (inline !== undefined) return inline;
      if (i + 1 >= argv.length) throw new UsageError(`${flag} needs a value`);
      return argv[++i];
    };
    switch (flag) {
      case '--json': options.json = true; break;
      case '--no-color': options.color = false; break;
      case '--color': options.color = true; break;
      case '--no-browser': options.browser = false; break;
      case '--runtime': options.runtime = value(); break;
      case '--lines': case '-n': {
        const n = Number(value());
        if (!Number.isInteger(n) || n < 1) throw new UsageError(`${flag} expects a positive whole number`);
        options.lines = n;
        break;
      }
      default:
        if (flag.startsWith('-') && !(flag in ALIASES)) throw new UsageError(`Unknown option ${flag} (see lg help)`);
        positional.push(flag);
    }
  }
  if (options.runtime !== null && !RUNTIMES.includes(options.runtime)) throw new UsageError(`--runtime must be one of ${RUNTIMES.join(', ')}`);
  let command = positional.shift() ?? 'menu';
  command = ALIASES[command] ?? command;
  if (!COMMANDS.includes(command)) throw new UsageError(`Unknown command "${command}" (commands: ${COMMANDS.join(', ')})`);
  let target = positional.shift() ?? null;
  if (positional.length) throw new UsageError(`Unexpected argument "${positional[0]}"`);
  if (['start', 'stop', 'restart'].includes(command)) {
    target = target ?? 'all';
    if (target !== 'all' && !(target in APPS)) throw new UsageError(`Unknown app "${target}" (apps: ${Object.keys(APPS).join(', ')}, all)`);
  } else if (command === 'open' || command === 'logs') {
    if (!target) throw new UsageError(`lg ${command} needs an app: ${command === 'open' ? Object.keys(APPS).join(', ') : SERVERS.join(', ')}`);
    if (command === 'open' && !(target in APPS)) throw new UsageError(`Unknown app "${target}" (apps: ${Object.keys(APPS).join(', ')})`);
    if (command === 'logs' && !SERVERS.includes(serverOf(target) ?? target)) throw new UsageError(`No log for "${target}" (servers: ${SERVERS.join(', ')})`);
  } else if (target) {
    throw new UsageError(`lg ${command} takes no app`);
  }
  return { command, target, options };
}

/** The server that serves an app (itself for a server), or undefined. */
export function serverOf(app) {
  const entry = APPS[app];
  if (!entry) return undefined;
  return entry.kind === 'server' ? app : entry.server;
}

/** Servers named by a start/stop/restart target, deduplicated, in table order. */
export function serversFor(target) {
  if (target === 'all') return [...SERVERS];
  return [serverOf(target)];
}

/** The runtime running this script. */
export function currentRuntime(versions = process.versions) {
  return versions.bun ? 'bun' : 'node';
}

/**
 * Which runtime starts the apps: the --runtime option, else LG_RUNTIME, else the launcher's own.
 * @returns {{name: string, source: string}}
 */
export function chooseRuntime({ option = null, env = process.env, current = currentRuntime() } = {}) {
  if (option) return { name: option, source: '--runtime' };
  const fromEnv = (env.LG_RUNTIME || '').trim().toLowerCase();
  if (fromEnv) {
    if (!RUNTIMES.includes(fromEnv)) throw new UsageError(`LG_RUNTIME must be one of ${RUNTIMES.join(', ')} (got "${env.LG_RUNTIME}")`);
    return { name: fromEnv, source: 'LG_RUNTIME' };
  }
  return { name: current, source: 'launcher' };
}

/**
 * The executable for a runtime: this process's own executable when it is that runtime, else the
 * name looked up on PATH. `probe` returns a version string or null (injectable for tests).
 * @returns {{command: string, version: string}}
 */
export function runtimeExecutable(name, { current = currentRuntime(), execPath = process.execPath, versions = process.versions, probe = probeVersion } = {}) {
  if (name === current) return { command: execPath, version: name === 'bun' ? versions.bun : process.version.replace(/^v/, '') };
  const version = probe(name);
  if (!version) {
    const hint = name === 'bun' ? 'install it from https://bun.sh or use --runtime node' : 'install it from https://nodejs.org or use --runtime bun';
    throw new UsageError(`${name} was not found on PATH; ${hint}`);
  }
  return { command: name, version };
}

/** `<runtime> --version`, or null when it is not on PATH. */
export function probeVersion(name) {
  try {
    const result = spawnSync(name, ['--version'], { encoding: 'utf8', timeout: 5000, windowsHide: true });
    if (result.status !== 0 || !result.stdout) return null;
    return result.stdout.trim().replace(/^v/, '');
  } catch { return null; }
}

/** The state folder: LG_STATE_DIR, else `.lg/` in the repository. */
export function stateDir(env = process.env, root = repositoryRoot) {
  return path.resolve(root, env.LG_STATE_DIR || '.lg');
}

function readConfigFile(dir) {
  const file = path.join(dir, 'config.json');
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { throw new UsageError(`${file} is not valid JSON: ${error.message}`); }
}

function validPort(value, origin) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new UsageError(`${origin} must be a port number from 1 to 65535 (got "${value}")`);
  return port;
}

/**
 * Ports and host of each server: defaults, then `<state>/config.json` ({"ports": {"editor": 8001}}),
 * then LG_EDITOR_PORT / LG_RUNNER_PORT.
 */
export function loadConfig({ env = process.env, dir = stateDir(env) } = {}) {
  const file = readConfigFile(dir);
  const ports = {};
  for (const name of SERVERS) {
    const app = APPS[name];
    let port = app.port;
    if (file.ports?.[name] !== undefined) port = validPort(file.ports[name], `ports.${name} in ${path.join(dir, 'config.json')}`);
    if (env[app.portEnv]) port = validPort(env[app.portEnv], app.portEnv);
    ports[name] = port;
  }
  return { ports, host: '127.0.0.1', stateDir: dir, startTimeoutMs: Number(env.LG_START_TIMEOUT) || 20000 };
}

/** The URL of an app (server or page) under a config. */
export function appUrl(app, config) {
  const server = serverOf(app);
  return `http://${config.host}:${config.ports[server]}${APPS[app].url}`;
}

/** The environment a server is started with: the caller's, plus its port and log settings. */
export function serverEnv(name, config, env = process.env) {
  const result = { ...env, PORT: String(config.ports[name]) };
  if (name === 'runner') {
    result.HOST = env.HOST || config.host;
    // the runner's winston file log goes next to the launcher's log, not into the repository root
    result.LOG_FILE = env.LOG_FILE || path.join(config.stateDir, 'logs', 'runner.winston.log');
  }
  return result;
}

export function packageVersion(root = repositoryRoot) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version; }
  catch { return 'unknown'; }
}
