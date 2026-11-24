#!/usr/bin/env node
// Local CI: runs the GitHub workflow's steps (and optional extra steps) on any ref in a clean
// throwaway clone under .lg/ci/work/, several refs in parallel, and writes a proof report to
// .lg/ci/runs/<sha>-<time>/. Never touches the working tree it is started from.
// Usage: npm run ci:local -- [refs...] [options]; node tools/ci/ci.mjs help; lg ci ...
// Plan: agents/plans/2026-11-24-local-ci.md. Docs: docs/development.md#local-ci.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  HELP, CORE_STEPS, EXTRA_STEPS, REPORT_SCHEMA, UsageError, parseArgs, parseJest, parseNodeTest, parseBunTest,
  parseAudit, parseComfy, parseFresh, runId, summaryLine, overallResult, renderMarkdown, commentCommand,
  githubCommand, githubState, shellQuote, repositoryRoot,
} from './core.mjs';

const SELF = fileURLToPath(import.meta.url);
const SMOKE = path.join(path.dirname(SELF), 'pack-smoke.mjs');
// the steps run on Node even when the runner itself runs on Bun (lg ci under Bun)
const NODE = process.versions.bun ? 'node' : process.execPath;

export function ciDir(env = process.env, root = repositoryRoot) {
  return path.resolve(env.LG_CI_DIR || path.join(root, '.lg', 'ci'));
}

function git(args, cwd = repositoryRoot) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function version(command, args = ['--version']) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0 || result.error) return null;
  return (result.stdout || result.stderr).trim().split('\n')[0].replace(/^(Python|git version) /, '');
}

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** The environment for steps: no npm settings inherited from an outer `npm run`, CI=true like GitHub, a private TMPDIR. */
function stepEnv(tmp) {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('npm_') || key === 'INIT_CWD' || key.startsWith('LG_CI_')) continue;
    env[key] = value;
  }
  return { ...env, CI: 'true', NO_COLOR: '1', FORCE_COLOR: '0', TMPDIR: tmp, TMP: tmp, TEMP: tmp };
}

/** Runs one command, appending stdout and stderr to the log. Resolves with the exit code. */
function exec(argv, { cwd, env, log }) {
  return new Promise((resolve) => {
    fs.appendFileSync(log, `$ ${shellQuote(argv)}\n`);
    const out = fs.openSync(log, 'a');
    const child = spawn(argv[0], argv.slice(1), { cwd, env, stdio: ['ignore', out, out] });
    child.on('error', (error) => { fs.appendFileSync(log, `\n${error.message}\n`); fs.closeSync(out); resolve(127); });
    child.on('close', (code, signal) => { fs.closeSync(out); resolve(code ?? (signal ? 128 : 1)); });
  });
}

/** Claims a fresh run directory; two runs of one commit in the same second get -2, -3, ... */
function claimRunDir(runsDir, id) {
  fs.mkdirSync(runsDir, { recursive: true });
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? id : `${id}-${n}`;
    try { fs.mkdirSync(path.join(runsDir, candidate)); return candidate; }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
}

function writeReport(runDir, report) {
  report.result = overallResult(report.steps);
  report.summary = summaryLine(report);
  fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(runDir, 'report.md'), renderMarkdown(report));
  fs.writeFileSync(path.join(runDir, 'summary.txt'), report.summary + '\n');
}

/** Resolves a ref in the repository to its commit. */
export function resolveRef(ref, root = repositoryRoot) {
  const commit = git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], root);
  return { ref, commit, tree: git(['rev-parse', `${commit}^{tree}`], root), subject: git(['log', '-1', '--format=%s', commit], root), branches: git(['branch', '--format=%(refname:short)', '--points-at', commit], root).split('\n').filter(Boolean) };
}

/**
 * Runs the CI for one ref. Returns the report.
 * @param {object} o  ref, extras, keep, root (repository), dir (ci dir), progress(line)
 */
export async function runOne({ ref, extras = [], keep = null, root = repositoryRoot, dir = ciDir(), progress = () => {}, versions }) {
  const target = resolveRef(ref, root);
  const id = claimRunDir(path.join(dir, 'runs'), runId(target.commit.slice(0, 7)));
  const runDir = path.join(dir, 'runs', id);
  const logs = path.join(runDir, 'logs');
  const work = path.join(dir, 'work', id);
  const checkout = path.join(work, 'repo');
  const tmp = path.join(work, 'tmp');
  fs.mkdirSync(logs, { recursive: true });
  fs.mkdirSync(tmp, { recursive: true });
  const env = stepEnv(tmp);
  const started = Date.now();
  const report = {
    schema: REPORT_SCHEMA, id, ref, ...target, dirty: null,
    startedAt: new Date(started).toISOString(), finishedAt: null, durationMs: null,
    host: { platform: os.platform(), release: os.release(), arch: os.arch(), cpus: os.cpus().length, hostname: os.hostname() },
    versions, runner: { commit: git(['rev-parse', 'HEAD'], root), changed: git(['status', '--porcelain', '--', 'tools/ci'], root) !== '', sha256: sha256(SELF), pid: process.pid },
    workDir: path.relative(root, work), counts: { jest: null, integration: null },
    steps: [
      { name: 'clone', title: 'git clone --local, checkout --detach', advisory: false },
      ...CORE_STEPS.map(({ name, title }) => ({ name, title, advisory: false })),
      ...extras.map((name) => ({ name, title: EXTRA_STEPS[name].title, advisory: EXTRA_STEPS[name].advisory })),
    ].map((step) => ({ ...step, status: 'pending', exitCode: null, durationMs: null, log: `logs/${step.name}.log`, logSha256: null, counts: null })),
    result: 'running', summary: '',
  };
  writeReport(runDir, report);
  const label = `${id} ${ref}`;
  let blocked = false;

  const runStep = async (name, body) => {
    const step = report.steps.find((s) => s.name === name);
    const log = path.join(runDir, step.log);
    fs.writeFileSync(log, '');
    if (blocked) {
      Object.assign(step, { status: 'skip', reason: 'an earlier step failed' });
      fs.appendFileSync(log, 'skipped: an earlier step failed\n');
    } else {
      step.status = 'running';
      writeReport(runDir, report);
      progress(`${label}: ${name} ...`);
      const t0 = Date.now();
      let outcome;
      try { outcome = await body(log, step); }
      catch (error) { fs.appendFileSync(log, `\n${error.stack || error.message}\n`); outcome = { exitCode: 1 }; }
      step.durationMs = Date.now() - t0;
      step.exitCode = outcome.exitCode ?? null;
      step.status = outcome.skip ? 'skip' : outcome.exitCode === 0 ? 'pass' : 'fail';
      if (outcome.skip) step.reason = outcome.skip;
      if (outcome.counts) step.counts = outcome.counts;
      if (step.status === 'fail' && !step.advisory && ['clone', 'install'].includes(name)) blocked = true;
      progress(`${label}: ${name} ${step.status}${step.advisory && step.status === 'fail' ? ' (advisory)' : ''} (${(step.durationMs / 1000).toFixed(1)} s)`);
    }
    step.logSha256 = sha256(log);
    writeReport(runDir, report);
  };

  await runStep('clone', async (log) => {
    let code = await exec(['git', 'clone', '--quiet', '--local', '--no-checkout', root, checkout], { cwd: work, env, log });
    if (code === 0) code = await exec(['git', '-c', 'advice.detachedHead=false', 'checkout', '--quiet', '--detach', target.commit], { cwd: checkout, env, log });
    if (code === 0) {
      const status = git(['status', '--porcelain'], checkout);
      report.dirty = status !== '';
      fs.appendFileSync(log, `HEAD ${git(['rev-parse', 'HEAD'], checkout)}\nclean: ${!report.dirty}\n`);
      if (report.dirty) code = 1;
    }
    return { exitCode: code };
  });

  await runStep('install', async (log) => ({ exitCode: await exec(CORE_STEPS[0].command, { cwd: checkout, env, log }) }));

  await runStep('check', async (log) => {
    const exitCode = await exec(CORE_STEPS[1].command, { cwd: checkout, env, log });
    const text = fs.readFileSync(log, 'utf8');
    report.counts.jest = parseJest(text);
    report.counts.integration = parseNodeTest(text);
    return { exitCode, counts: { jest: report.counts.jest, integration: report.counts.integration } };
  });

  await runStep('fresh', async (log) => {
    // the workflow's step, plus files the build added that git diff does not see
    let exitCode = await exec(CORE_STEPS[2].command, { cwd: checkout, env, log });
    const untracked = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'build', 'build_node'], { cwd: checkout, encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
    const counts = parseFresh(fs.readFileSync(log, 'utf8'));
    if (untracked.length) {
      fs.appendFileSync(log, `untracked or changed:\n${untracked.join('\n')}\n`);
      counts.ok = false;
      counts.files = [...new Set([...counts.files, ...untracked.map((line) => line.slice(3))])];
      exitCode ||= 1;
    }
    return { exitCode, counts };
  });

  for (const name of extras) await runStep(name, (log, step) => EXTRA[name]({ checkout, env, log, root, tmp, step, report }));

  report.finishedAt = new Date().toISOString();
  report.durationMs = Date.now() - started;
  const passed = overallResult(report.steps) === 'pass';
  const keepWork = keep ?? !passed;
  report.workDir = keepWork ? report.workDir : null;
  writeReport(runDir, report);
  if (!keepWork) fs.rmSync(work, { recursive: true, force: true });
  progress(`${label}: ${report.summary}`);
  return { report, runDir };
}

/** The optional steps. Each returns {exitCode, counts} or {skip: reason}. */
const EXTRA = {
  async audit({ checkout, env, log }) {
    const exitCode = await exec(['npm', 'audit', '--omit=dev'], { cwd: checkout, env, log });
    return { exitCode, counts: parseAudit(fs.readFileSync(log, 'utf8')) };
  },

  async pack({ checkout, env, log, tmp }) {
    const dest = path.join(tmp, 'pack');
    const project = path.join(tmp, 'pack-install');
    fs.mkdirSync(dest, { recursive: true });
    fs.mkdirSync(project, { recursive: true });
    const jsonLog = path.join(tmp, 'pack.json');
    const packed = spawnSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', dest], { cwd: checkout, env, encoding: 'utf8' });
    fs.appendFileSync(log, `$ npm pack --ignore-scripts --json --pack-destination ${dest}\n${packed.stderr}`);
    if (packed.status !== 0) { fs.appendFileSync(log, packed.stdout); return { exitCode: packed.status ?? 1 }; }
    fs.writeFileSync(jsonLog, packed.stdout);
    const info = JSON.parse(packed.stdout)[0];
    fs.appendFileSync(log, `${info.filename}: ${info.entryCount} files, ${info.size} bytes packed, ${info.unpackedSize} unpacked\n`);
    fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ name: 'pack-smoke', private: true, version: '0.0.0' }) + '\n');
    let exitCode = await exec(['npm', 'install', '--omit=optional', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline', path.join(dest, info.filename)], { cwd: project, env, log });
    let counts = { files: info.entryCount, size: `${(info.size / 1e6).toFixed(1)} MB` };
    if (exitCode === 0) {
      exitCode = await exec([NODE, SMOKE, info.version], { cwd: project, env, log });
      const last = fs.readFileSync(log, 'utf8').trim().split('\n').pop();
      try { const result = JSON.parse(last); counts = { ...counts, passed: result.passed, total: result.total, version: info.version }; }
      catch { /* the log has the details */ }
    }
    return { exitCode, counts };
  },

  async comfy({ checkout, env, log, root }) {
    const source = path.join(root, 'experiments', 'comfy-interop');
    if (!fs.existsSync(path.join(source, 'schema')) || !fs.existsSync(path.join(source, 'node_modules'))) {
      fs.appendFileSync(log, `skipped: ${source} with schema/ and node_modules/ is not present (git-ignored; see its README)\n`);
      return { skip: 'experiments/comfy-interop not present' };
    }
    // the probes load ../../build_node and ../../src, so they run inside the checkout
    const target = path.join(checkout, 'experiments', 'comfy-interop');
    fs.cpSync(source, target, { recursive: true, filter: (file) => !file.startsWith(path.join(source, 'node_modules')) });
    fs.symlinkSync(path.join(source, 'node_modules'), path.join(target, 'node_modules'), 'dir');
    let exitCode = 0;
    for (const probe of ['probe_subgraphs.mjs', 'probe_subgraph_content.mjs']) {
      const code = await exec([NODE, '--experimental-strip-types', '--no-warnings', probe], { cwd: target, env, log });
      exitCode ||= code;
    }
    const counts = parseComfy(fs.readFileSync(log, 'utf8'));
    if (!counts?.schema || counts.schema.passed !== counts.schema.total) exitCode ||= 1;
    return { exitCode, counts };
  },

  async bun({ checkout, env, log, report }) {
    if (!report.versions.bun) { fs.appendFileSync(log, 'skipped: bun is not installed\n'); return { skip: 'bun not installed' }; }
    let exitCode = await exec(['bun', 'test', 'tools/tests'], { cwd: checkout, env, log });
    const counts = parseBunTest(fs.readFileSync(log, 'utf8')) ?? {};
    const launcher = await exec(['bun', 'tools/lg/lg.mjs', 'version'], { cwd: checkout, env, log });
    counts.launcher = launcher === 0 ? 'ok' : 'FAIL';
    exitCode ||= launcher;
    return { exitCode, counts };
  },
};

export function collectVersions() {
  return {
    node: process.versions.bun ? version('node') : process.version, npm: version('npm'), python: version('python3'), git: version('git'),
    bun: version('bun'), os: `${os.type()} ${os.release()}`,
  };
}

/** Runs refs with at most `jobs` at a time. */
export async function runMany(refs, { jobs = 2, ...options }) {
  const queue = refs.map((ref, index) => ({ ref, index }));
  const results = new Array(refs.length);
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try { results[item.index] = await runOne({ ...options, ref: item.ref }); }
      catch (error) { results[item.index] = { error, ref: item.ref }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, refs.length) }, worker));
  return results;
}

// ---------- reading runs ----------

export function listRuns(dir = ciDir()) {
  const runs = path.join(dir, 'runs');
  if (!fs.existsSync(runs)) return [];
  return fs.readdirSync(runs).map((id) => {
    try { return { id, ...JSON.parse(fs.readFileSync(path.join(runs, id, 'report.json'), 'utf8')), dir: path.join(runs, id) }; }
    catch { return { id, result: 'unreadable', dir: path.join(runs, id), startedAt: '' }; }
  }).sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)) || b.id.localeCompare(a.id));
}

/** A run by id, id prefix, commit prefix, or `latest`/none. */
export function findRun(key, dir = ciDir()) {
  const runs = listRuns(dir);
  if (!key || key === 'latest') return runs[0] ?? null;
  return runs.find((run) => run.id === key) ?? runs.find((run) => run.id.startsWith(key) || run.commit?.startsWith(key)) ?? null;
}

/** A running run whose runner process is gone is reported as interrupted. */
function liveResult(run) {
  if (run.result !== 'running') return run.result;
  try { process.kill(run.runner.pid, 0); return 'running'; } catch { return 'interrupted'; }
}

// ---------- commands ----------

function ghExecutable(env) { return env.LG_CI_GH || 'gh'; }

function runGh(argv, env) {
  const result = spawnSync(ghExecutable(env), argv, { encoding: 'utf8', env });
  if (result.error) throw new Error(`${ghExecutable(env)}: ${result.error.message} (is the GitHub CLI installed? LG_CI_GH points at another one)`);
  return result;
}

export function github(action, options, env = process.env, out = console) {
  const argv = githubCommand(action, options.repo);
  const display = `${ghExecutable(env)} ${shellQuote(argv)}`;
  if (action === 'status') {
    const result = runGh(argv, env);
    if (result.status !== 0) { out.error(result.stderr.trim()); return 1; }
    const state = githubState(result.stdout);
    if (options.json) out.log(JSON.stringify({ variable: 'LG_GITHUB_CI', ...state }));
    else out.log(state.on
      ? 'GitHub CI: ON (repository variable LG_GITHUB_CI=on): pushes and pull requests run .github/workflows/validate.yml on GitHub runners'
      : `GitHub CI: off (LG_GITHUB_CI ${state.value === null ? 'unset' : `= ${JSON.stringify(state.value)}`}): the workflow's job is skipped; the local CI (npm run ci:local) is the proof`);
    return 0;
  }
  if (options.dryRun) { out.log(`would run: ${display}`); return 0; }
  const result = runGh(argv, env);
  if (result.status !== 0) {
    // deleting a variable that does not exist leaves it off: not an error for the switch
    if (action === 'off' && /not found|404/i.test(result.stderr)) { out.log('GitHub CI: already off (LG_GITHUB_CI was not set)'); return 0; }
    out.error(result.stderr.trim());
    return 1;
  }
  out.log(action === 'on'
    ? 'GitHub CI: ON. Every push and pull request now runs the workflow on GitHub runners. Turn it off with: npm run ci:github -- off'
    : 'GitHub CI: off. The workflow stays in the repository; its job is skipped.');
  return 0;
}

function addNote(run, options, root, out) {
  const message = `${run.summary}\nReport: .lg/ci/runs/${run.id}/report.md (local, not pushed)`;
  const argv = ['notes', '--ref=ci', 'append', '-m', message, run.commit];
  if (options.dryRun) { out.log(`would run: git ${shellQuote(argv)}`); return 0; }
  const result = spawnSync('git', argv, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) { out.error(result.stderr.trim()); return 1; }
  out.log(`note added to ${run.commit.slice(0, 7)} (refs/notes/ci; git log --notes=ci shows it; not pushed)`);
  return 0;
}

function comment(run, options, env, out) {
  const argv = commentCommand({ pr: options.pr, issue: options.issue, repo: options.repo, bodyFile: path.join(run.dir, 'report.md') });
  const display = `${ghExecutable(env)} ${shellQuote(argv)}`;
  if (!options.post || options.dryRun) {
    out.log(`${options.post ? 'would run' : 'to post the report (outward-facing; agents ask the user first)'}: ${display}`);
    return 0;
  }
  const result = runGh(argv, env);
  if (result.status !== 0) { out.error(result.stderr.trim()); return 1; }
  out.log(result.stdout.trim() || `posted to ${options.pr !== null ? 'PR' : 'issue'} ${options.pr ?? options.issue}`);
  return 0;
}

function printList(runs, options, out) {
  if (options.json) { out.log(JSON.stringify(runs.map(({ id, ref, commit, result, summary, startedAt, durationMs, dir }) => ({ id, ref, commit, result, summary, startedAt, durationMs, dir })), null, 2)); return; }
  if (!runs.length) { out.log('no local CI runs yet (npm run ci:local)'); return; }
  for (const run of runs.slice(0, 20)) {
    const result = liveResult(run);
    out.log(`${result.padEnd(11)} ${run.id.padEnd(26)} ${String(run.ref ?? '').padEnd(22)} ${run.durationMs ? `${Math.round(run.durationMs / 1000)}s`.padStart(5) : '     '}  ${run.summary ?? ''}`);
  }
}

function clean(options, dir, out) {
  let removed = 0;
  const work = path.join(dir, 'work');
  const active = new Set(listRuns(dir).filter((run) => liveResult(run) === 'running').map((run) => run.id));
  if (fs.existsSync(work)) {
    for (const id of fs.readdirSync(work)) {
      if (active.has(id)) continue;
      fs.rmSync(path.join(work, id), { recursive: true, force: true });
      removed++;
    }
  }
  const runs = listRuns(dir).filter((run) => !active.has(run.id));
  const drop = options.all ? runs : runs.slice(options.keepRuns);
  for (const run of drop) fs.rmSync(run.dir, { recursive: true, force: true });
  out.log(`removed ${removed} work clone(s) and ${drop.length} run(s); kept ${runs.length - drop.length} run(s)${active.size ? `, ${active.size} running` : ''}`);
  return 0;
}

export async function main(argv = process.argv.slice(2), env = process.env, out = console) {
  let parsed;
  try { parsed = parseArgs(argv, env); }
  catch (error) {
    if (!(error instanceof UsageError)) throw error;
    out.error(`ci: ${error.message}`);
    return 2;
  }
  const { command, args, options } = parsed;
  const dir = ciDir(env);
  switch (command) {
    case 'help': out.log(HELP); return 0;
    case 'github': return github(args[0] ?? 'status', options, env, out);
    case 'list': printList(listRuns(dir), options, out); return 0;
    case 'clean': return clean(options, dir, out);
    case 'show': case 'note': case 'comment': {
      const run = findRun(args[0], dir);
      if (!run) { out.error(`ci: no run ${args[0] ?? ''} (npm run ci:local -- list)`.trim()); return 1; }
      if (command === 'note') return addNote(run, options, repositoryRoot, out);
      if (command === 'comment') return comment(run, options, env, out);
      if (options.json) out.log(fs.readFileSync(path.join(run.dir, 'report.json'), 'utf8').trim());
      else if (options.summary) out.log(run.summary);
      else out.log(fs.readFileSync(path.join(run.dir, 'report.md'), 'utf8').trim());
      return 0;
    }
    case 'run': {
      const refs = args.length ? args : ['HEAD'];
      for (const ref of refs) {
        try { resolveRef(ref); }
        catch { out.error(`ci: unknown ref ${ref}`); return 2; }
      }
      const versions = collectVersions();
      const progress = options.quiet || options.json ? () => {} : (line) => out.log(`[ci] ${line}`);
      progress(`${refs.length} run(s), ${Math.min(options.jobs, refs.length)} at a time, steps: clone, ${CORE_STEPS.map((s) => s.name).join(', ')}${options.extras.length ? ', ' + options.extras.join(', ') : ''}; reports in ${path.relative(process.cwd(), path.join(dir, 'runs')) || '.'}`);
      const results = await runMany(refs, { jobs: options.jobs, extras: options.extras, keep: options.keep, dir, progress, versions });
      let code = 0;
      const summaries = [];
      for (const result of results) {
        if (result.error) { out.error(`ci: ${result.ref}: ${result.error.message}`); code = 1; continue; }
        const { report, runDir } = result;
        if (report.result !== 'pass') code = 1;
        summaries.push({ id: report.id, ref: report.ref, result: report.result, summary: report.summary, report: path.join(runDir, 'report.md') });
        const run = { ...report, dir: runDir };
        if (options.note) addNote(run, options, repositoryRoot, out);
        if (options.pr !== null || options.issue !== null) comment(run, options, env, out);
      }
      if (options.json) out.log(JSON.stringify(summaries, null, 2));
      else for (const s of summaries) out.log(`${s.summary}\n  report: ${path.relative(process.cwd(), s.report)}`);
      return code;
    }
    default: out.error(`ci: unknown command ${command}`); return 2;
  }
}

function invokedDirectly() {
  try { return Boolean(process.argv[1]) && fs.realpathSync(process.argv[1]) === fs.realpathSync(SELF); }
  catch { return false; }
}
if (invokedDirectly()) {
  for (const stream of [process.stdout, process.stderr]) stream.on('error', (error) => { if (error.code === 'EPIPE') process.exit(process.exitCode ?? 0); else throw error; });
  main().then((code) => { process.exitCode = code; });
}
