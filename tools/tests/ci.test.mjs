// Local CI (tools/ci): argument parsing, log parsing, the summary and reports, the GitHub switch
// with a fake gh, and real runs on a tiny repository (clean clone, parallel runs, freshness).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  parseArgs, parseJest, parseNodeTest, parseBunTest, parseAudit, parseComfy, parseFresh, runId, summaryLine,
  overallResult, renderMarkdown, commentCommand, githubCommand, githubState, shellQuote, UsageError,
} from '../ci/core.mjs';
import { main, runMany, listRuns, findRun } from '../ci/ci.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'litegraph-ci-'));
test.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
const posix = process.platform !== 'win32';

/** Captures main()'s output. */
function capture() {
  const lines = { log: [], error: [] };
  return { out: { log: (s) => lines.log.push(String(s)), error: (s) => lines.error.push(String(s)) }, lines };
}

/** A fake gh that records its arguments and answers `variable list`. */
function fakeGh(listOutput = '[]', exitCode = 0, stderr = '') {
  const dir = fs.mkdtempSync(path.join(tempRoot, 'gh-'));
  const record = path.join(dir, 'calls.txt');
  const script = path.join(dir, 'gh');
  fs.writeFileSync(script, `#!/bin/sh\nprintf '%s\\n' "$*" >> '${record}'\nif [ "$2" = list ]; then printf '%s' '${listOutput}'; fi\nprintf '%s' '${stderr}' >&2\nexit ${exitCode}\n`);
  fs.chmodSync(script, 0o755);
  return { env: { ...process.env, LG_CI_GH: script }, calls: () => (fs.existsSync(record) ? fs.readFileSync(record, 'utf8').trim().split('\n') : []) };
}

test('parseArgs: commands, refs, steps and options', () => {
  assert.deepEqual(parseArgs([]).command, 'run');
  assert.deepEqual(parseArgs([]).args, []);
  const run = parseArgs(['LG/dev', 'HEAD~1', '-j', '3', '--pack', '--with', 'audit,bun', '--note', '--pr', '11']);
  assert.equal(run.command, 'run');
  assert.deepEqual(run.args, ['LG/dev', 'HEAD~1']);
  assert.equal(run.options.jobs, 3);
  assert.deepEqual(run.options.extras, ['audit', 'pack', 'bun'], 'in the fixed step order');
  assert.equal(run.options.pr, 11);
  assert.deepEqual(parseArgs(['--full']).options.extras, ['audit', 'pack', 'comfy', 'bun']);
  assert.equal(parseArgs(['status']).command, 'list');
  assert.equal(parseArgs(['run', 'list']).args[0], 'list', 'a ref named like a command after run');
  assert.equal(parseArgs(['--keep']).options.keep, true);
  assert.equal(parseArgs(['clean', '--keep', '5']).options.keepRuns, 5);
  assert.equal(parseArgs([], { LG_CI_JOBS: '4' }).options.jobs, 4);
  assert.deepEqual(parseArgs(['github', 'on', '--dry-run', '--repo', 'a/b']).args, ['on']);
  assert.throws(() => parseArgs(['--with', 'lint']), /Unknown step lint/);
  assert.throws(() => parseArgs(['--post']), /--post needs --pr N or --issue N/);
  assert.throws(() => parseArgs(['--pr', '1', '--issue', '2']), /pick one/);
  assert.throws(() => parseArgs(['github', 'maybe']), /status, on or off/);
  assert.throws(() => parseArgs(['comment']), /--pr N or --issue N/);
  assert.throws(() => parseArgs(['-j', '0']), UsageError);
  assert.throws(() => parseArgs(['--frobnicate']), /Unknown option/);
});

test('log parsers: Jest, node:test (spec and TAP), bun test, audit, ComfyUI probes, freshness', () => {
  const jest = 'Test Suites: 1 failed, 59 passed, 60 total\nTests:       2 failed, 1 skipped, 1013 passed, 1016 total\nSnapshots:   0 total';
  assert.deepEqual(parseJest(jest), { passed: 1013, failed: 2, skipped: 1, total: 1016, suites: 60 });
  assert.deepEqual(parseJest('\x1b[1mTests:\x1b[22m       \x1b[32m5 passed\x1b[39m, 5 total'), { passed: 5, failed: 0, skipped: 0, total: 5, suites: null });
  assert.equal(parseJest('no summary'), null);
  assert.deepEqual(parseNodeTest('ℹ tests 151\nℹ suites 0\nℹ pass 150\nℹ fail 1\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0'), { passed: 150, failed: 1, skipped: 0, total: 151, suites: 0 });
  assert.deepEqual(parseNodeTest('1..3\n# tests 3\n# suites 0\n# pass 3\n# fail 0\n# skipped 0\n# todo 0'), { passed: 3, failed: 0, skipped: 0, total: 3, suites: 0 });
  assert.equal(parseNodeTest('# Subtest: x'), null);
  assert.deepEqual(parseBunTest(' 150 pass\n 1 fail\nRan 151 tests across 21 files. [6.59s]'), { passed: 150, failed: 1, skipped: 0, total: 151, files: 21 });
  assert.deepEqual(parseAudit('found 0 vulnerabilities'), { vulnerabilities: 0 });
  assert.deepEqual(parseAudit('# npm audit report\n...\n3 high severity vulnerabilities'), { vulnerabilities: 3 });
  assert.deepEqual(parseComfy('PASS x\n\n79/79 pass\n26 interface slots appended\n0 files with content differences of 41'), { schema: { passed: 79, total: 79 }, content: { differing: 0, total: 41 } });
  assert.deepEqual(parseFresh('$ git diff\n'), { ok: true, files: [] });
  assert.deepEqual(parseFresh(' build/litegraph.js | 2 +-\n 1 file changed'), { ok: false, files: ['build/litegraph.js'] });
});

function sampleReport(overrides = {}) {
  const step = (name, status, extra = {}) => ({ name, title: name, status, advisory: false, exitCode: status === 'pass' ? 0 : 1, durationMs: 1000, log: `logs/${name}.log`, logSha256: 'a'.repeat(64), counts: null, ...extra });
  return {
    id: 'f944f3d-20261124T120016Z', ref: 'LG/dev', commit: 'f944f3df5f53190e3ea360b815ce6bd7f91d828e', tree: 'b'.repeat(40), subject: 'chore: x', branches: ['LG/dev'], dirty: false,
    startedAt: '2026-11-24T12:00:16.000Z', finishedAt: '2026-11-24T12:03:00.000Z', durationMs: 164000,
    host: { platform: 'linux', release: '7.0.0', arch: 'x64', cpus: 8 }, versions: { node: 'v22.23.4', npm: '10.9.9', python: '3.12.3', git: '2.43.0', bun: '1.4.4' },
    runner: { commit: 'c'.repeat(40), sha256: 'd'.repeat(64) },
    counts: { jest: { passed: 1016, failed: 0, total: 1016, suites: 60 }, integration: { passed: 151, failed: 0, total: 151 } },
    steps: [step('clone', 'pass'), step('install', 'pass'), step('check', 'pass'), step('fresh', 'pass', { counts: { ok: true, files: [] } })],
    ...overrides,
  };
}

test('summary line, result and report.md', () => {
  const report = sampleReport();
  report.result = overallResult(report.steps);
  assert.equal(report.result, 'pass');
  report.summary = summaryLine(report);
  assert.equal(report.summary, 'Local-CI: pass f944f3d node22.23.4 jest 1016/1016 int 151/151 fresh ok');
  const md = renderMarkdown(report);
  assert.match(md, /^### Local CI ✅ pass: `f944f3df5f53` \(LG\/dev\)/);
  assert.match(md, /Local-CI: pass f944f3d/);
  assert.match(md, /tree `b{40}`/);
  assert.match(md, /checkout clean: yes/);

  // extras, an advisory failure, and a real failure
  const extras = sampleReport();
  extras.steps.push(
    { name: 'audit', status: 'pass', advisory: false, counts: { vulnerabilities: 0 } },
    { name: 'pack', status: 'pass', advisory: false, counts: { passed: 9, total: 9, files: 21 } },
    { name: 'comfy', status: 'skip', advisory: false, reason: 'not present' },
    { name: 'bun', status: 'fail', advisory: true, counts: { passed: 150, total: 151, failed: 1 } },
  );
  extras.result = overallResult(extras.steps);
  assert.equal(extras.result, 'pass', 'an advisory failure does not fail the run');
  assert.equal(summaryLine(extras), 'Local-CI: pass f944f3d node22.23.4 jest 1016/1016 int 151/151 fresh ok audit 0 pack 9/9 comfy skip bun 150/151 (advisory)');

  const stale = sampleReport();
  stale.steps[3] = { ...stale.steps[3], status: 'fail', counts: { ok: false, files: ['build/litegraph.js'] } };
  stale.result = overallResult(stale.steps);
  assert.equal(stale.result, 'fail');
  assert.equal(summaryLine(stale), 'Local-CI: fail f944f3d node22.23.4 jest 1016/1016 int 151/151 fresh FAIL failed: fresh');
  assert.match(renderMarkdown({ ...stale, summary: summaryLine(stale) }), /differs: build\/litegraph\.js/);

  assert.equal(overallResult([{ status: 'pass' }, { status: 'running' }]), 'running');
  assert.match(runId('abc1234', new Date('2026-11-24T12:00:16.789Z')), /^abc1234-20261124T120016Z$/);
});

test('gh command builders and quoting', () => {
  assert.deepEqual(githubCommand('on'), ['variable', 'set', 'LG_GITHUB_CI', '--body', 'on']);
  assert.deepEqual(githubCommand('off', 'atlasan/litegraph.js'), ['variable', 'delete', 'LG_GITHUB_CI', '--repo', 'atlasan/litegraph.js']);
  assert.deepEqual(githubCommand('status'), ['variable', 'list', '--json', 'name,value']);
  assert.deepEqual(githubState('[{"name":"OTHER","value":"x"},{"name":"LG_GITHUB_CI","value":"on"}]'), { value: 'on', on: true });
  assert.deepEqual(githubState('[]'), { value: null, on: false });
  assert.deepEqual(githubState('[{"name":"LG_GITHUB_CI","value":"yes"}]'), { value: 'yes', on: false }, 'only "on" switches it on, as in the workflow');
  assert.deepEqual(commentCommand({ pr: 11, issue: null, bodyFile: '/r/report.md' }), ['pr', 'comment', '11', '--body-file', '/r/report.md']);
  assert.deepEqual(commentCommand({ pr: null, issue: 3, repo: 'a/b', bodyFile: 'x' }), ['issue', 'comment', '3', '--body-file', 'x', '--repo', 'a/b']);
  assert.equal(shellQuote(['git', 'notes', '-m', "it's ok"]), `git notes -m 'it'\\''s ok'`);
});

test('the workflow is kept and gated off by the LG_GITHUB_CI variable', () => {
  const workflow = fs.readFileSync(new URL('../../.github/workflows/validate.yml', import.meta.url), 'utf8');
  assert.match(workflow, /^\s+if: vars\.LG_GITHUB_CI == 'on' \|\| github\.event_name == 'workflow_dispatch'$/m);
  assert.match(workflow, /workflow_dispatch:/);
  for (const step of ['npm ci --ignore-scripts', 'npm run check', 'git diff --exit-code --stat -- build build_node']) assert.ok(workflow.includes(`run: ${step}`), step);
});

test('github switch: status, on, off and dry runs call gh with the expected arguments', { skip: !posix }, async () => {
  const off = fakeGh('[]');
  let { out, lines } = capture();
  assert.equal(await main(['github', 'status'], off.env, out), 0);
  assert.match(lines.log[0], /GitHub CI: off \(LG_GITHUB_CI unset\)/);
  assert.deepEqual(off.calls(), ['variable list --json name,value']);

  const on = fakeGh('[{"name":"LG_GITHUB_CI","value":"on"}]');
  ({ out, lines } = capture());
  assert.equal(await main(['github', '--json', '--repo', 'a/b'], on.env, out), 0);
  assert.deepEqual(JSON.parse(lines.log[0]), { variable: 'LG_GITHUB_CI', value: 'on', on: true });
  assert.deepEqual(on.calls(), ['variable list --json name,value --repo a/b']);

  const dry = fakeGh();
  ({ out, lines } = capture());
  assert.equal(await main(['github', 'on', '--dry-run'], dry.env, out), 0);
  assert.match(lines.log[0], /would run: .*gh variable set LG_GITHUB_CI --body on/);
  assert.deepEqual(dry.calls(), [], 'a dry run calls nothing');

  const sw = fakeGh();
  ({ out } = capture());
  assert.equal(await main(['github', 'on'], sw.env, out), 0);
  assert.equal(await main(['github', 'off'], sw.env, out), 0);
  assert.deepEqual(sw.calls(), ['variable set LG_GITHUB_CI --body on', 'variable delete LG_GITHUB_CI']);

  const missing = fakeGh('[]', 1, 'HTTP 404: Not Found');
  ({ out, lines } = capture());
  assert.equal(await main(['github', 'off'], missing.env, out), 0, 'off when already off is fine');
  assert.match(lines.log[0], /already off/);

  const denied = fakeGh('[]', 1, 'HTTP 403: Resource not accessible');
  ({ out, lines } = capture());
  assert.equal(await main(['github', 'on'], denied.env, out), 1);
  assert.match(lines.error[0], /403/);
});

// ---------- real runs on a tiny repository ----------

function tinyRepo() {
  const repo = fs.mkdtempSync(path.join(tempRoot, 'repo-'));
  const sh = (...args) => { const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
  sh('init', '--quiet', '--initial-branch=main');
  sh('config', 'user.email', 'ci@test.invalid'); sh('config', 'user.name', 'ci test'); sh('config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ name: 'tiny', version: '1.0.0', private: true, scripts: { check: 'node check.js' } }));
  fs.writeFileSync(path.join(repo, 'package-lock.json'), JSON.stringify({ name: 'tiny', version: '1.0.0', lockfileVersion: 3, requires: true, packages: { '': { name: 'tiny', version: '1.0.0' } } }));
  // "check" prints Jest and node:test summaries, records where it ran and what TMPDIR was, and "builds"
  fs.writeFileSync(path.join(repo, 'check.js'), [
    "const fs = require('fs');",
    "fs.writeFileSync('ran-here.txt', JSON.stringify({ cwd: process.cwd(), tmp: process.env.TMPDIR, ci: process.env.CI }));",
    "fs.writeFileSync('build/out.js', fs.readFileSync('src.js'));",
    "console.log('Test Suites: 1 passed, 1 total'); console.log('Tests:       2 passed, 2 total');",
    "console.log('# tests 3'); console.log('# pass 3'); console.log('# fail 0');",
  ].join('\n'));
  fs.mkdirSync(path.join(repo, 'build'));
  fs.writeFileSync(path.join(repo, 'src.js'), 'one\n');
  fs.writeFileSync(path.join(repo, 'build', 'out.js'), 'one\n');
  fs.writeFileSync(path.join(repo, '.gitignore'), 'ran-here.txt\nnode_modules/\n.lg/\n');
  sh('add', '.'); sh('commit', '--quiet', '-m', 'fresh');
  // a branch whose committed build is stale
  sh('checkout', '--quiet', '-b', 'stale');
  fs.writeFileSync(path.join(repo, 'src.js'), 'two\n');
  sh('commit', '--quiet', '-am', 'stale build');
  sh('checkout', '--quiet', 'main');
  // an uncommitted change in the working tree must not reach the runs
  fs.writeFileSync(path.join(repo, 'src.js'), 'uncommitted\n');
  return { repo, sh };
}

test('runs: clean clones, two at once, freshness, reports, notes; the working tree is untouched', { skip: !posix, timeout: 120000 }, async () => {
  const { repo, sh } = tinyRepo();
  const dir = path.join(repo, '.lg', 'ci');
  const before = sh('status', '--porcelain');
  const lines = [];
  const results = await runMany(['main', 'stale'], { jobs: 2, dir, root: repo, progress: (line) => lines.push(line), versions: { node: process.version, npm: '10', python: null, git: null, bun: null } });
  const [fresh, stale] = results.map((r) => { assert.ok(!r.error, r.error?.stack); return r; });

  // both ran at the same time, in their own directories
  assert.notEqual(fresh.report.id, stale.report.id);
  const startedBeforeOtherFinished = Date.parse(fresh.report.startedAt) < Date.parse(stale.report.finishedAt) && Date.parse(stale.report.startedAt) < Date.parse(fresh.report.finishedAt);
  assert.ok(startedBeforeOtherFinished, 'the two runs overlapped');

  assert.equal(fresh.report.result, 'pass', JSON.stringify(fresh.report.steps));
  assert.equal(fresh.report.dirty, false);
  assert.equal(fresh.report.commit, sh('rev-parse', 'main'));
  assert.equal(fresh.report.tree, sh('rev-parse', 'main^{tree}'));
  assert.deepEqual(fresh.report.counts.jest, { passed: 2, failed: 0, skipped: 0, total: 2, suites: 1 });
  assert.equal(fresh.report.counts.integration.total, 3);
  assert.match(fresh.report.summary, /^Local-CI: pass [0-9a-f]{7} node\S+ jest 2\/2 int 3\/3 fresh ok$/);
  assert.equal(fs.readFileSync(path.join(fresh.runDir, 'summary.txt'), 'utf8').trim(), fresh.report.summary);
  assert.match(fs.readFileSync(path.join(fresh.runDir, 'report.md'), 'utf8'), /Local CI ✅ pass/);
  for (const step of fresh.report.steps) {
    const log = path.join(fresh.runDir, step.log);
    assert.ok(fs.existsSync(log), step.log);
    assert.equal(step.logSha256.length, 64);
  }
  assert.equal(fresh.report.workDir, null, 'a passing run removes its clone');
  assert.ok(!fs.existsSync(path.join(dir, 'work', fresh.report.id)));

  assert.equal(stale.report.result, 'fail');
  assert.deepEqual(stale.report.steps.find((s) => s.name === 'fresh').counts, { ok: false, files: ['build/out.js'] });
  assert.match(stale.report.summary, /fresh FAIL failed: fresh$/);
  // a failing run keeps its clone; the check ran there, with its own TMPDIR, CI=true and no outer npm settings
  const where = JSON.parse(fs.readFileSync(path.join(dir, 'work', stale.report.id, 'repo', 'ran-here.txt'), 'utf8'));
  assert.equal(where.cwd, path.join(dir, 'work', stale.report.id, 'repo'));
  assert.equal(where.tmp, path.join(dir, 'work', stale.report.id, 'tmp'));
  assert.equal(where.ci, 'true');
  assert.equal(fs.readFileSync(path.join(dir, 'work', stale.report.id, 'repo', 'src.js'), 'utf8'), 'two\n', 'the commit, not the working tree');

  // the working tree is untouched
  assert.equal(sh('status', '--porcelain'), before);
  assert.equal(fs.readFileSync(path.join(repo, 'src.js'), 'utf8'), 'uncommitted\n');
  assert.ok(!fs.existsSync(path.join(repo, 'ran-here.txt')));
  assert.ok(lines.some((line) => line.includes('check pass')));

  // list, show, find
  assert.equal(listRuns(dir).length, 2);
  assert.equal(findRun(stale.report.commit.slice(0, 7), dir).id, stale.report.id);
  assert.equal(findRun(fresh.report.id, dir).result, 'pass');
});

test('CLI: show, note (dry run), comment without --post, clean', { skip: !posix, timeout: 120000 }, async () => {
  const { repo } = tinyRepo();
  const dir = path.join(repo, '.lg', 'ci');
  const [{ report }] = await runMany(['main'], { dir, root: repo, keep: true, versions: { node: process.version, npm: '10' } });
  const env = { ...process.env, LG_CI_DIR: dir, LG_CI_GH: '/nonexistent/gh' };

  let { out, lines } = capture();
  assert.equal(await main(['show', '--summary'], env, out), 0);
  assert.equal(lines.log[0], report.summary);
  ({ out, lines } = capture());
  assert.equal(await main(['show', report.id, '--json'], env, out), 0);
  assert.equal(JSON.parse(lines.log[0]).commit, report.commit);
  ({ out, lines } = capture());
  assert.equal(await main(['list', '--json'], env, out), 0);
  assert.equal(JSON.parse(lines.log[0])[0].id, report.id);

  ({ out, lines } = capture());
  assert.equal(await main(['note', '--dry-run'], env, out), 0);
  assert.match(lines.log[0], /^would run: git notes --ref=ci append -m '.*Local-CI: pass/s);

  // without --post: prints the command, runs nothing (the gh path does not even exist)
  ({ out, lines } = capture());
  assert.equal(await main(['comment', '--pr', '11'], env, out), 0);
  assert.match(lines.log[0], /agents ask the user first.*gh pr comment 11 --body-file .*report\.md/);
  ({ out, lines } = capture());
  assert.equal(await main(['comment', '--issue', '4', '--post', '--dry-run'], env, out), 0);
  assert.match(lines.log[0], /^would run: .*gh issue comment 4/);
  // with --post: gh is called
  const gh = fakeGh();
  ({ out } = capture());
  assert.equal(await main(['comment', '--pr', '11', '--post', '--repo', 'a/b'], { ...env, LG_CI_GH: gh.env.LG_CI_GH }, out), 0);
  assert.match(gh.calls()[0], /^pr comment 11 --body-file .*report\.md --repo a\/b$/);

  assert.ok(fs.existsSync(path.join(dir, 'work', report.id)), '--keep kept the clone');
  ({ out, lines } = capture());
  assert.equal(await main(['clean', '--all'], env, out), 0);
  assert.match(lines.log[0], /removed 1 work clone\(s\) and 1 run\(s\)/);
  assert.deepEqual(listRuns(dir), []);
});
