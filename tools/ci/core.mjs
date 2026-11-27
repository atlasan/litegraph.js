// Local CI core: argument parsing, the step table, log parsing, the summary line and the reports.
// No dependencies and no processes, so tests can check it directly. The runner is ci.mjs.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
export const REPORT_SCHEMA = 1;
export const COMMANDS = ['run', 'list', 'show', 'note', 'comment', 'clean', 'github', 'help'];
const ALIASES = { status: 'list', ls: 'list', '-h': 'help', '--help': 'help' };

/** Optional steps, by name. `advisory` steps are reported but never fail a run. */
export const EXTRA_STEPS = {
  audit: { title: 'npm audit --omit=dev', advisory: false },
  pack: { title: 'npm pack, installed with --omit=optional, entries checked', advisory: false },
  comfy: { title: 'ComfyUI probes (experiments/comfy-interop, when present)', advisory: false },
  bun: { title: 'Bun: bun test tools/tests and the launcher', advisory: true },
};

/** The steps the GitHub workflow runs (.github/workflows/validate.yml), in its order. */
export const CORE_STEPS = [
  { name: 'install', title: 'npm ci --ignore-scripts', command: ['npm', 'ci', '--ignore-scripts', '--prefer-offline', '--no-audit', '--no-fund'] },
  { name: 'check', title: 'npm run check', command: ['npm', 'run', 'check'] },
  { name: 'fresh', title: 'git diff --exit-code --stat -- build build_node', command: ['git', 'diff', '--exit-code', '--stat', '--', 'build', 'build_node'] },
];

export class UsageError extends Error {}

export const HELP = `Usage: node tools/ci/ci.mjs [command] [refs...] [options]   (npm run ci:local -- ..., lg ci ...)

Commands:
  run [refs...]          check out each ref (default HEAD) into a clean clone under .lg/ci/work/ and
                         run the workflow's steps there; the default command
  list                   recent runs and their results (alias: status)
  show [run]             a run's report (default: the latest); --md, --json or --summary
  note [run]             attach the run's summary to its commit as a git note (refs/notes/ci)
  comment [run]          print the gh command that posts report.md to --pr N or --issue N;
                         posts only with --post (outward-facing: agents ask the user first)
  clean                  remove leftover work clones and all but the newest --keep N runs (20)
  github status|on|off   the GitHub workflow switch: the repository variable LG_GITHUB_CI.
                         on/off change a GitHub setting; only the repository owner runs them
  help

Run options:
  --jobs N, -j N         refs run at the same time (default 2)
  --audit --pack --comfy --bun, or --with audit,pack,...   optional steps; --full for all of them
  --keep                 keep the work clone (default: removed when the run passes, kept when it fails)
  --note                 also add the git note; --pr N / --issue N print the comment command
  --post                 with --pr / --issue: post the comment with gh
  --json                 machine-readable output (run, list, show)
  --quiet                no per-step progress

Other options:
  --dry-run              github on/off, comment --post, note: print the commands, change nothing
  --repo OWNER/NAME      github, comment: the repository (default: gh's, from the git remote)
  --keep N               clean: runs to keep; --all removes every run

Settings (environment): LG_CI_DIR (.lg/ci), LG_CI_GH (the gh executable), LG_CI_JOBS.
Reports: .lg/ci/runs/<sha>-<time>/ with report.json, report.md, summary.txt and logs/.`;

/** Parses `ci.mjs [command] [args] [options]`. */
export function parseArgs(argv, env = {}) {
  const options = {
    jobs: env.LG_CI_JOBS ? Number(env.LG_CI_JOBS) : 2, extras: [], keep: null, note: false, pr: null, issue: null,
    post: false, json: false, quiet: false, dryRun: false, repo: null, all: false, md: false, summary: false, keepRuns: 20,
  };
  const positional = [];
  let command = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [flag, inline] = arg.startsWith('--') && arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined];
    const value = () => {
      if (inline !== undefined) return inline;
      if (i + 1 >= argv.length) throw new UsageError(`${flag} needs a value`);
      return argv[++i];
    };
    const whole = (name, text) => {
      const n = Number(text);
      if (!Number.isInteger(n) || n < 1) throw new UsageError(`${name} expects a positive whole number`);
      return n;
    };
    switch (flag) {
      case '--jobs': case '-j': options.jobs = whole(flag, value()); break;
      case '--audit': case '--pack': case '--comfy': case '--bun': options.extras.push(flag.slice(2)); break;
      case '--with': options.extras.push(...value().split(',').map((s) => s.trim()).filter(Boolean)); break;
      case '--full': options.extras.push(...Object.keys(EXTRA_STEPS)); break;
      case '--keep': {
        // `--keep` alone keeps the work clone; `--keep N` (clean) is a run count
        const next = inline ?? argv[i + 1];
        if (next !== undefined && /^\d+$/.test(next)) { options.keepRuns = Number(next); if (inline === undefined) i++; }
        else options.keep = true;
        break;
      }
      case '--no-keep': options.keep = false; break;
      case '--note': options.note = true; break;
      case '--pr': options.pr = whole(flag, value()); break;
      case '--issue': options.issue = whole(flag, value()); break;
      case '--post': options.post = true; break;
      case '--json': options.json = true; break;
      case '--quiet': case '-q': options.quiet = true; break;
      case '--dry-run': options.dryRun = true; break;
      case '--repo': options.repo = value(); break;
      case '--all': options.all = true; break;
      case '--md': options.md = true; break;
      case '--summary': options.summary = true; break;
      default:
        if (flag in ALIASES && command === null && positional.length === 0) { command = ALIASES[flag]; break; }
        if (flag.startsWith('-')) throw new UsageError(`Unknown option ${flag} (see ci.mjs help)`);
        if (command === null && positional.length === 0 && (COMMANDS.includes(flag) || flag in ALIASES)) command = ALIASES[flag] ?? flag;
        else positional.push(flag);
    }
  }
  command ??= 'run';
  const unknown = options.extras.filter((name) => !(name in EXTRA_STEPS));
  if (unknown.length) throw new UsageError(`Unknown step ${unknown.join(', ')}; optional steps: ${Object.keys(EXTRA_STEPS).join(', ')}`);
  options.extras = Object.keys(EXTRA_STEPS).filter((name) => options.extras.includes(name));
  if (options.pr !== null && options.issue !== null) throw new UsageError('--pr and --issue: pick one');
  if (options.post && options.pr === null && options.issue === null) throw new UsageError('--post needs --pr N or --issue N');
  if (command === 'github' && !['status', 'on', 'off'].includes(positional[0] ?? 'status')) throw new UsageError('github expects status, on or off');
  if (command === 'comment' && options.pr === null && options.issue === null) throw new UsageError('comment needs --pr N or --issue N');
  return { command, args: positional, options };
}

// ---------- log parsing ----------

const strip = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');

/** Jest's summary: `Tests: 2 failed, 1014 passed, 1016 total` and `Test Suites: 60 passed, 60 total`. */
export function parseJest(log) {
  const text = strip(log);
  const line = (label) => {
    const match = [...text.matchAll(new RegExp(`^${label}:\\s+(.*)$`, 'gm'))].pop();
    if (!match) return null;
    const count = (word) => Number((match[1].match(new RegExp(`(\\d+) ${word}`)) ?? [])[1] ?? 0);
    return { passed: count('passed'), failed: count('failed'), skipped: count('skipped') + count('todo'), total: count('total') };
  };
  const tests = line('Tests');
  if (!tests) return null;
  return { ...tests, suites: line('Test Suites')?.total ?? null };
}

/** node:test's summary, from the spec (`ℹ tests 151`) or TAP (`# tests 151`) reporter. */
export function parseNodeTest(log) {
  const text = strip(log);
  const count = (word) => {
    const match = [...text.matchAll(new RegExp(`^(?:#|ℹ)\\s*${word} (\\d+)\\s*$`, 'gm'))].pop();
    return match ? Number(match[1]) : null;
  };
  const total = count('tests');
  if (total === null) return null;
  return { passed: count('pass') ?? 0, failed: count('fail') ?? 0, skipped: (count('skipped') ?? 0) + (count('todo') ?? 0), total, suites: count('suites') };
}

/**
 * The browser smoke test (tools/browser/smoke.mjs, in npm run check): `browser smoke: 9/9 passed (firefox 141.0)`,
 * `browser smoke: skipped: <why>` or `browser smoke: FAIL: <why>`. null when the log has none (older commits).
 */
export function parseBrowser(log) {
  const text = strip(log);
  const counted = [...text.matchAll(/^browser smoke: (\d+)\/(\d+) passed( FAIL)?(?: \((\S+) ([^)]*)\))?\s*$/gm)].pop();
  if (counted) {
    const [, passed, total, fail, browser, version] = counted;
    return { passed: Number(passed), total: Number(total), failed: fail ? 1 : 0, skipped: false, browser: browser && version !== 'n/a' ? `${browser} ${version}` : null };
  }
  const other = [...text.matchAll(/^browser smoke: (skipped|FAIL): (.*)$/gm)].pop();
  if (!other) return null;
  return other[1] === 'skipped' ? { skipped: true, reason: other[2].trim() } : { passed: 0, total: 0, failed: 1, skipped: false, reason: other[2].trim() };
}

/** The Node parity cases also run when Firefox is skipped. */
export function parseExecutionParity(log) {
  const text = strip(log);
  const failure = text.match(/^execution parity: FAIL: (.+)$/m);
  if (failure) return { failed: true, reason: failure[1] };
  const pass = text.match(/^execution parity: (\d+)\/(\d+) cases passed \((browser and Node|Node only)\)$/m);
  if (!pass) return null;
  return {
    passed: Number(pass[1]), total: Number(pass[2]), failed: false, browser: pass[3] === 'browser and Node',
    browserSkipReason: text.match(/^execution parity: browser skipped: (.+)$/m)?.[1] ?? null,
  };
}

/** bun test's summary: ` 150 pass`, ` 1 fail`, `Ran 151 tests across 21 files.` */
export function parseBunTest(log) {
  const text = strip(log);
  const ran = text.match(/^Ran (\d+) tests? across (\d+) files?/m);
  if (!ran) return null;
  const count = (word) => Number((text.match(new RegExp(`^\\s*(\\d+) ${word}\\s*$`, 'm')) ?? [])[1] ?? 0);
  return { passed: count('pass'), failed: count('fail'), skipped: count('skip') + count('todo'), total: Number(ran[1]), files: Number(ran[2]) };
}

/** `npm audit`: `found 0 vulnerabilities` or `N vulnerabilities (...)`. */
export function parseAudit(log) {
  const text = strip(log);
  if (/found 0 vulnerabilities/.test(text)) return { vulnerabilities: 0 };
  const match = text.match(/^(\d+) (?:[a-z ]+ )?vulnerabilit(?:y|ies)/m);
  return match ? { vulnerabilities: Number(match[1]) } : null;
}

/** The ComfyUI probes: `79/79 pass` and `0 files with content differences of 41`. */
export function parseComfy(log) {
  const text = strip(log);
  const schema = text.match(/^(\d+)\/(\d+) pass\s*$/m);
  const content = text.match(/^(\d+) files? with content differences of (\d+)/m);
  if (!schema && !content) return null;
  return {
    schema: schema ? { passed: Number(schema[1]), total: Number(schema[2]) } : null,
    content: content ? { differing: Number(content[1]), total: Number(content[2]) } : null,
  };
}

/** The `fresh` step's `--stat` output: files that differ from the committed build. */
export function parseFresh(log) {
  const files = strip(log).split('\n').map((line) => line.match(/^\s*(\S+)\s+\|/)).filter(Boolean).map((match) => match[1]);
  return { ok: files.length === 0, files };
}

// ---------- ids, summary, reports ----------

/** `<shortsha>-<UTC time>`, e.g. `f944f3d-20261124T120016Z`. */
export function runId(shortSha, date = new Date()) {
  return `${shortSha}-${date.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`;
}

const pair = (counts) => (counts ? `${counts.passed}/${counts.total}` : 'n/a');

/**
 * The one-line proof, usable as a commit trailer:
 * `Local-CI: pass f944f3d node22.23.4 jest 1016/1016 int 151/151 fresh ok`.
 */
export function summaryLine(report) {
  const step = (name) => report.steps.find((s) => s.name === name);
  const parts = [`Local-CI: ${report.result}`, report.commit.slice(0, 7), `node${report.versions.node.replace(/^v/, '')}`];
  parts.push(`jest ${pair(report.counts.jest)}`, `int ${pair(report.counts.integration)}`);
  const browser = report.counts.browser;
  if (browser) parts.push(`browser ${browser.skipped ? 'skip' : browser.failed ? `FAIL ${pair(browser)}` : pair(browser)}`);
  const executionParity = report.counts.executionParity;
  if (executionParity) parts.push(`execution parity ${executionParity.failed ? 'FAIL' : `${pair(executionParity)}${executionParity.browser ? '' : ' (Node only)'}`}`);
  const fresh = step('fresh');
  const waiting = (s) => s.status === 'pending' || s.status === 'running';
  parts.push(`fresh ${!fresh || fresh.status === 'skip' ? 'n/a' : waiting(fresh) ? '…' : fresh.status === 'pass' ? 'ok' : 'FAIL'}`);
  for (const name of Object.keys(EXTRA_STEPS)) {
    const s = step(name);
    if (!s) continue;
    if (s.status === 'skip' || waiting(s)) { parts.push(`${name} ${s.status === 'skip' ? 'skip' : '…'}`); continue; }
    let detail = s.status === 'pass' ? 'ok' : 'FAIL';
    if (name === 'audit' && s.counts) detail = `${s.counts.vulnerabilities}`;
    if (name === 'pack' && s.counts) detail = `${s.counts.passed}/${s.counts.total}`;
    if (name === 'comfy' && s.counts?.schema) detail = `${s.counts.schema.passed}/${s.counts.schema.total}`;
    if (name === 'bun' && s.counts) detail = `${s.counts.passed}/${s.counts.total}${s.status === 'pass' ? '' : ' (advisory)'}`;
    parts.push(`${name} ${detail}`);
  }
  if (report.result !== 'pass') {
    const failed = report.steps.filter((s) => s.status === 'fail' && !s.advisory).map((s) => s.name);
    if (failed.length) parts.push(`failed: ${failed.join(',')}`);
  }
  return parts.join(' ');
}

/** Pass when every non-advisory step passed or was skipped on purpose. */
export function overallResult(steps) {
  if (steps.some((s) => s.status === 'running' || s.status === 'pending')) return 'running';
  return steps.every((s) => s.advisory || s.status === 'pass' || s.status === 'skip') ? 'pass' : 'fail';
}

const seconds = (ms) => (ms == null ? '' : `${(ms / 1000).toFixed(1)} s`);

function stepDetail(step) {
  const c = step.counts;
  if (step.status === 'skip') return step.reason ?? 'skipped';
  if (!c) return '';
  switch (step.name) {
    case 'check': return [
      c.jest && `Jest ${pair(c.jest)} in ${c.jest.suites} suites`, c.integration && `integration ${pair(c.integration)}`,
      c.browser && (c.browser.skipped ? `browser smoke skipped (${c.browser.reason})` : `browser smoke ${pair(c.browser)}${c.browser.browser ? ` on ${c.browser.browser}` : ''}${c.browser.reason ? ` (${c.browser.reason})` : ''}`),
      c.executionParity && (c.executionParity.failed ? `execution parity failed (${c.executionParity.reason})`
        : `execution parity ${pair(c.executionParity)} (${c.executionParity.browser ? 'browser and Node' : `Node only: ${c.executionParity.browserSkipReason}`})`),
    ].filter(Boolean).join(', ');
    case 'fresh': return c.ok ? 'build/ and build_node/ match the sources' : `differs: ${c.files.join(', ')}`;
    case 'audit': return `${c.vulnerabilities} vulnerabilities`;
    case 'pack': return `${pair(c)} checks; ${c.files ?? '?'} files, ${c.size ?? '?'}`;
    case 'comfy': return [c.schema && `schema ${pair(c.schema)}`, c.content && `${c.content.differing} of ${c.content.total} fixtures with a content difference`].filter(Boolean).join('; ');
    case 'bun': return `bun test ${pair(c)}${c.failed ? ` (${c.failed} failing; advisory)` : ''}${c.launcher ? `, launcher ${c.launcher}` : ''}`;
    default: return '';
  }
}

/** report.md: ready to paste into a PR body, an issue or a comment. */
export function renderMarkdown(report) {
  const icon = { pass: '✅', fail: '❌', skip: '⏭️', running: '⏳', pending: '⏳' };
  const lines = [];
  lines.push(`### Local CI ${report.result === 'pass' ? '✅ pass' : report.result === 'fail' ? '❌ fail' : '⏳ ' + report.result}: \`${report.commit.slice(0, 12)}\` (${report.ref})`);
  lines.push('');
  lines.push('```');
  lines.push(report.summary);
  lines.push('```');
  lines.push('');
  lines.push('| Step | Result | Time | Details |');
  lines.push('|---|---|---|---|');
  for (const step of report.steps) {
    lines.push(`| \`${step.title}\` | ${icon[step.status] ?? ''} ${step.status}${step.advisory ? ' (advisory)' : ''}${step.exitCode != null && step.exitCode !== 0 ? `, exit ${step.exitCode}` : ''} | ${seconds(step.durationMs)} | ${stepDetail(step)} |`);
  }
  lines.push('');
  const v = report.versions;
  lines.push(`<details><summary>Environment and provenance</summary>`);
  lines.push('');
  lines.push(`- **Commit** \`${report.commit}\`, tree \`${report.tree}\`${report.branches.length ? `, branches ${report.branches.map((b) => `\`${b}\``).join(', ')}` : ''}; checkout clean: ${report.dirty ? 'no' : 'yes'} (a fresh clone)`);
  lines.push(`- **Subject** ${report.subject}`);
  lines.push(`- **Host** ${report.host.platform} ${report.host.release} ${report.host.arch}, ${report.host.cpus} CPUs`);
  lines.push(`- **Runtimes** Node ${v.node}, npm ${v.npm}, Python ${v.python ?? 'n/a'}, git ${v.git ?? 'n/a'}, Bun ${v.bun ?? 'n/a'}`);
  lines.push(`- **Run** \`${report.id}\`, ${report.startedAt} to ${report.finishedAt ?? '…'} (${seconds(report.durationMs)}), runner \`${report.runner.commit.slice(0, 12)}\`${report.runner.changed ? ' with uncommitted tools/ci changes' : ''} (\`tools/ci/ci.mjs\` sha256 \`${report.runner.sha256.slice(0, 16)}\`)`);
  lines.push(`- **Logs** (sha256): ${report.steps.filter((s) => s.logSha256).map((s) => `\`${s.log}\` \`${s.logSha256.slice(0, 16)}\``).join(', ')}`);
  lines.push('');
  lines.push('</details>');
  lines.push('');
  lines.push(`<sub>Generated by \`tools/ci/ci.mjs\` (local CI, roadmap D10). Same steps as \`.github/workflows/validate.yml\`.</sub>`);
  return lines.join('\n') + '\n';
}

/** The gh command that posts a report as a comment (argv, not a shell string). */
export function commentCommand({ pr, issue, repo, bodyFile }) {
  const argv = [pr !== null && pr !== undefined ? 'pr' : 'issue', 'comment', String(pr ?? issue), '--body-file', bodyFile];
  if (repo) argv.push('--repo', repo);
  return argv;
}

/** The gh commands behind `github status|on|off`. */
export function githubCommand(action, repo) {
  const tail = repo ? ['--repo', repo] : [];
  switch (action) {
    case 'on': return ['variable', 'set', 'LG_GITHUB_CI', '--body', 'on', ...tail];
    case 'off': return ['variable', 'delete', 'LG_GITHUB_CI', ...tail];
    default: return ['variable', 'list', '--json', 'name,value', ...tail];
  }
}

/** Reads `gh variable list --json name,value` output. */
export function githubState(listJson) {
  const list = JSON.parse(listJson || '[]');
  const entry = list.find((item) => item.name === 'LG_GITHUB_CI');
  return { value: entry?.value ?? null, on: entry?.value === 'on' };
}

/** Quotes an argv for display (POSIX shell). */
export function shellQuote(argv) {
  return argv.map((arg) => (/^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${String(arg).replace(/'/g, `'\\''`)}'`)).join(' ');
}
