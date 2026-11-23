#!/usr/bin/env node
// litegraph launcher: start, stop and open the repository's apps on Bun or Node.
// Usually run through ./lg.sh or lg.bat (they pick Bun, else Node); `node tools/lg/lg.mjs` and
// `bun tools/lg/lg.mjs` work too. See docs/getting-started.md#the-launcher.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import {
  APPS, SERVERS, UsageError, parseArgs, serverOf, serversFor, currentRuntime, chooseRuntime,
  runtimeExecutable, probeVersion, loadConfig, appUrl, serverEnv, packageVersion, repositoryRoot, stateDir,
} from './core.mjs';
import { serverStatus, startServer, stopServer, isPortFree, tail, logFile } from './state.mjs';
import { useColor, useUnicode, terminal, table } from './term.mjs';

const HELP = `Usage: lg <command> [app] [options]

Commands:
  (none)               interactive menu (on a terminal); help and status otherwise
  start [app|all]      start servers in the background (default: all)
  stop [app|all]       stop servers started by lg (default: all)
  restart [app|all]    stop, then start
  status               state, URL, pid and runtime of each server
  open <app>           open an app in the browser, starting its server if needed
  logs <app>           last lines of a server's log
  info                 versions, runtimes, ports, URLs, state folder
  help, version

Apps: editor, runner (servers); tester, docs (pages of the editor server)

Options:
  --runtime bun|node   runtime for the servers (default: the launcher's; env LG_RUNTIME)
  --json               machine-readable status and info
  --no-browser         print the URL instead of opening a browser (env LG_NO_BROWSER=1)
  --no-color, --color  force colours off or on (env NO_COLOR, FORCE_COLOR)
  -n, --lines N        lines for logs (default 40)

Settings (environment): LG_EDITOR_PORT (8000), LG_RUNNER_PORT (3000), LG_RUNTIME,
LG_STATE_DIR (.lg), LG_START_TIMEOUT (ms, 20000). Ports can also be set in .lg/config.json:
{"ports": {"editor": 8001, "runner": 3001}}. The runner keeps its own security settings
(RUNNER_ALLOW_TYPES, RUNNER_ALLOW_SYS, RUNNER_ALLOWED_ORIGINS, ...).`;

/** A path relative to the working directory when it is inside it, else absolute. */
function displayPath(file) {
  const relative = path.relative(process.cwd(), file);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative : file;
}

function stateLabel(term, state) {
  const { t, s } = term;
  switch (state) {
    case 'running': return t.green(`${s.dot} running`);
    case 'starting': return t.yellow(`${s.dot} starting`);
    case 'foreign': return t.magenta(`${s.dot} other process`);
    case 'stale': return t.gray(`${s.off} stopped (stale record removed)`);
    default: return t.gray(`${s.off} stopped`);
  }
}

function uptime(startedAt) {
  if (!startedAt) return '';
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(startedAt)) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}`;
}

async function statuses(config) {
  return Promise.all(SERVERS.map((name) => serverStatus(name, config)));
}

async function printStatus(ctx, list) {
  const { term, config } = ctx;
  const { t } = term;
  list ??= await statuses(config);
  const rows = [[t.bold('app'), t.bold('state'), t.bold('url'), t.bold('pid'), t.bold('runtime'), t.bold('up')]];
  for (const status of list) {
    rows.push([status.app, stateLabel(term, status.state), t.cyan(appUrl(status.app, { ...config, ports: { ...config.ports, [status.app]: status.port } })), status.pid ? String(status.pid) : '', status.runtime ? `${status.runtime} ${status.runtimeVersion ?? ''}`.trim() : '', status.state === 'running' ? uptime(status.startedAt) : '']);
  }
  term.print(table(rows));
  const pages = Object.keys(APPS).filter((name) => APPS[name].kind === 'page').map((name) => `${name} ${t.cyan(appUrl(name, config))}`);
  term.print(t.gray(`pages of the editor: ${pages.join(', ')}`));
  return list;
}

async function startOne(ctx, name) {
  const { term, config, options } = ctx;
  const { t } = term;
  const status = await serverStatus(name, config);
  const url = appUrl(name, config);
  if (status.state === 'running' || status.state === 'starting') {
    term.ok(`${name} is already ${status.state} ${t.cyan(url)} ${t.gray(`(pid ${status.pid})`)}`);
    return true;
  }
  if (status.state === 'foreign' || !(await isPortFree(config.ports[name], config.host))) {
    term.fail(`${name}: port ${config.ports[name]} is in use by another process. Stop it, or pick another port with ${APPS[name].portEnv}=<port>.`);
    return false;
  }
  const runtimeChoice = chooseRuntime({ option: options.runtime });
  const runtime = { name: runtimeChoice.name, ...runtimeExecutable(runtimeChoice.name) };
  term.print(t.gray(`starting ${name} on ${runtime.name} ${runtime.version} (port ${config.ports[name]}) ...`));
  try {
    const record = await startServer(name, { config, runtime, env: serverEnv(name, config) });
    term.ok(`${name} running ${t.cyan(url)} ${t.gray(`(pid ${record.pid}, ${runtime.name} ${runtime.version}, log ${displayPath(record.log)})`)}`);
    return true;
  } catch (error) {
    term.fail(error.message);
    return false;
  }
}

async function stopOne(ctx, name) {
  const { term } = ctx;
  const result = await stopServer(name, { config: ctx.config });
  if (result.result === 'stopped') term.ok(`${name} stopped ${term.t.gray(`(pid ${result.pid})`)}`);
  else {
    const status = await serverStatus(name, ctx.config);
    if (status.state === 'foreign') term.warn(`${name}: not started by lg; another process answers on port ${status.port} (lg does not stop it)`);
    else term.print(term.t.gray(`${name} was not running`));
  }
  return true;
}

function openBrowser(url, env = process.env) {
  if (env.LG_NO_BROWSER) return false;
  let command;
  let args;
  if (process.platform === 'win32') { command = 'rundll32'; args = ['url.dll,FileProtocolHandler', url]; }
  else if (process.platform === 'darwin') { command = 'open'; args = [url]; }
  else {
    if (!env.DISPLAY && !env.WAYLAND_DISPLAY) return false;
    command = 'xdg-open'; args = [url];
  }
  try {
    const child = spawn(command, args, { stdio: 'ignore', detached: true, windowsHide: true });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch { return false; }
}

async function openApp(ctx, app) {
  const { term, config, options } = ctx;
  const server = serverOf(app);
  const status = await serverStatus(server, config);
  if (status.state === 'foreign') term.warn(`${server}: port ${status.port} is served by a process lg did not start; opening it anyway`);
  else if (status.state !== 'running' && status.state !== 'starting') {
    term.print(term.t.gray(`${app} needs the ${server} server; starting it first`));
    if (!(await startOne(ctx, server))) return false;
  }
  const url = appUrl(app, config);
  const opened = options.browser && openBrowser(url);
  term.ok(`${opened ? 'opened' : 'open'} ${app}: ${term.t.cyan(url)}`);
  return true;
}

async function info(ctx) {
  const { term, config, options } = ctx;
  const { t } = term;
  const current = currentRuntime();
  let appsRuntime;
  try { appsRuntime = chooseRuntime({ option: options.runtime }); } catch (error) { appsRuntime = { name: 'invalid', source: error.message }; }
  const found = { bun: current === 'bun' ? process.versions.bun : probeVersion('bun'), node: current === 'node' ? process.version.replace(/^v/, '') : probeVersion('node') };
  const data = {
    version: packageVersion(),
    launcher: { runtime: current, version: found[current], platform: `${process.platform}-${process.arch}` },
    runtimes: found,
    appsRuntime,
    repository: repositoryRoot,
    stateDir: config.stateDir,
    nodeModules: fs.existsSync(path.join(repositoryRoot, 'node_modules', 'express')),
    ports: config.ports,
    urls: Object.fromEntries(Object.keys(APPS).map((name) => [name, appUrl(name, config)])),
    runnerSettings: Object.fromEntries(['RUNNER_ALLOW_TYPES', 'RUNNER_DENY_TYPES', 'RUNNER_ALLOW_SYS', 'RUNNER_ALLOW_SCRIPTS', 'RUNNER_ALLOWED_ORIGINS', 'RUNNER_ALLOWED_HOSTS'].filter((key) => process.env[key]).map((key) => [key, process.env[key]])),
  };
  if (options.json) { term.print(JSON.stringify(data, null, 2)); return true; }
  const missing = (value) => value ?? t.gray('not found');
  term.print(table([
    [t.bold('litegraph'), data.version],
    ['launcher', `${current} ${data.launcher.version} on ${data.launcher.platform}`],
    ['runtimes', `bun ${missing(found.bun)}, node ${missing(found.node)}`],
    ['apps run on', `${appsRuntime.name} ${t.gray(`(${appsRuntime.source})`)}`],
    ['repository', data.repository],
    ['state', `${data.stateDir} ${t.gray('(run/, logs/, config.json)')}`],
    ['dependencies', data.nodeModules ? 'installed' : t.yellow('missing: run npm ci (or bun install)')],
    ...Object.entries(data.urls).map(([name, url]) => [name, t.cyan(url)]),
    ['runner opt-ins', Object.keys(data.runnerSettings).length ? Object.entries(data.runnerSettings).map(([key, value]) => `${key}=${value}`).join(' ') : t.gray('none (safe defaults)')],
  ]));
  return true;
}

async function logs(ctx, app) {
  const file = logFile(ctx.config.stateDir, serverOf(app));
  const text = tail(file, ctx.options.lines);
  if (!text) { ctx.term.print(ctx.term.t.gray(`no log yet at ${file}`)); return true; }
  ctx.term.print(ctx.term.t.gray(`${file}:`));
  ctx.term.print(text);
  return true;
}

async function runCommand(ctx, command, target) {
  switch (command) {
    case 'help': ctx.term.print(HELP); return true;
    case 'version': ctx.term.print(packageVersion()); return true;
    case 'status': {
      const list = await statuses(ctx.config);
      if (ctx.options.json) ctx.term.print(JSON.stringify(list, null, 2));
      else await printStatus(ctx, list);
      return true;
    }
    case 'start': {
      let ok = true;
      for (const name of serversFor(target)) ok = (await startOne(ctx, name)) && ok;
      return ok;
    }
    case 'stop': {
      for (const name of serversFor(target)) await stopOne(ctx, name);
      return true;
    }
    case 'restart': {
      let ok = true;
      for (const name of serversFor(target)) {
        await stopOne(ctx, name);
        ok = (await startOne(ctx, name)) && ok;
      }
      return ok;
    }
    case 'open': return openApp(ctx, target);
    case 'logs': return logs(ctx, target);
    case 'info': return info(ctx);
    case 'menu': return menu(ctx);
    default: throw new UsageError(`Unknown command ${command}`);
  }
}

const MENU = [
  ['1', 'Start all', ['start', 'all']],
  ['2', 'Stop all', ['stop', 'all']],
  ['3', 'Restart all', ['restart', 'all']],
  ['e', 'Open editor', ['open', 'editor']],
  ['t', 'Open tester', ['open', 'tester']],
  ['r', 'Open runner', ['open', 'runner']],
  ['d', 'Open docs', ['open', 'docs']],
  ['s', 'Status', ['status', null]],
  ['l', 'Logs: editor', ['logs', 'editor']],
  ['k', 'Logs: runner', ['logs', 'runner']],
  ['i', 'Info', ['info', null]],
  ['q', 'Quit', null],
];

async function menu(ctx) {
  const { term } = ctx;
  const { t, s } = term;
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    // no terminal to ask on (a pipe, CI, an IDE task): show what a menu would, and exit
    term.print(HELP);
    term.print('');
    await printStatus(ctx);
    return true;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let closed = false;
  rl.on('close', () => { closed = true; });
  try {
    while (!closed) {
      term.print('');
      term.print(`${t.bold(t.cyan('litegraph'))} ${t.gray(`${packageVersion()} ${s.line} launcher on ${currentRuntime()}`)}`);
      await printStatus(ctx);
      term.print('');
      const half = Math.ceil(MENU.length / 2);
      const cell = ([key, label]) => `${t.bold(t.yellow(key))} ${label}`;
      term.print(table(MENU.slice(0, half).map((item, i) => ['  ' + cell(item), MENU[half + i] ? cell(MENU[half + i]) : '']), 4));
      let answer;
      try { answer = (await rl.question(`${t.bold(s.arrow)} `)).trim().toLowerCase(); }
      catch { break; } // Ctrl+C / Ctrl+D
      const item = MENU.find(([key, label]) => key === answer || label.toLowerCase() === answer);
      if (!item) { term.warn(`unknown choice "${answer}"`); continue; }
      if (!item[2]) break;
      try { await runCommand(ctx, ...item[2]); }
      catch (error) { term.fail(error.message); }
    }
  } finally {
    rl.close();
  }
  term.print(t.gray('bye; started servers keep running (lg stop stops them)'));
  return true;
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  let parsed;
  try { parsed = parseArgs(argv); }
  catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`lg: ${error.message}\n`);
    return 2;
  }
  const { command, target, options } = parsed;
  if (env.LG_NO_BROWSER) options.browser = false;
  const term = terminal({ color: useColor({ option: options.color, env }), unicode: useUnicode({ env }) });
  try {
    const config = loadConfig({ env, dir: stateDir(env) });
    const ok = await runCommand({ term, config, options }, command, target);
    return ok ? 0 : 1;
  } catch (error) {
    if (error instanceof UsageError) { term.fail(error.message); return 2; }
    term.fail(error.stack || error.message);
    return 1;
  }
}

function invokedDirectly() {
  try { return Boolean(process.argv[1]) && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
}
if (invokedDirectly()) {
  // a closed pipe (lg status | head) ends the output quietly
  for (const stream of [process.stdout, process.stderr]) stream.on('error', (error) => { if (error.code === 'EPIPE') process.exit(process.exitCode ?? 0); else throw error; });
  main().then((code) => { process.exitCode = code; });
}
