#!/usr/bin/env node
// Install smoke test for the packed library, used by the local CI's `pack` step (tools/ci/ci.mjs).
// Run with the working directory set to a project where the tarball is installed:
//   node pack-smoke.mjs <expected-version>
// Every entry is loaded in its own process, because all bundles share one global LiteGraph.
// Prints one JSON object ({ok, checks: [...]}) and exits 1 when a check fails.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const expected = process.argv[2];
const cwd = process.cwd();
const checks = [];

function run(label, type, code) {
  const result = spawnSync(process.execPath, [`--input-type=${type}`, '-e', code], { cwd, encoding: 'utf8', timeout: 30000 });
  let value = null;
  try { value = JSON.parse(result.stdout.trim().split('\n').pop()); } catch { /* reported below */ }
  return { label, status: result.status, value, stderr: result.stderr.trim().split('\n').slice(-3).join('\n') };
}

function record(label, ok, detail) { checks.push({ label, ok: Boolean(ok), detail }); }

const probe = (lg) => `JSON.stringify({version: ${lg}.VERSION, allow_scripts: ${lg}.allow_scripts, subgraph_format: ${lg}.subgraph_format, model: new ${lg}.LGraph().executionModel})`;
const entries = [
  ['ESM .', 'module', `import { LiteGraph } from '@litegraph/litegraph'; console.log(${probe('LiteGraph')});`],
  ['ESM /core', 'module', `import { LiteGraph } from '@litegraph/litegraph/core'; console.log(${probe('LiteGraph')});`],
  ['ESM build/litegraph.full.js', 'module', `const m = await import('@litegraph/litegraph/build/litegraph.full.js'); const LiteGraph = m.LiteGraph ?? m.default?.LiteGraph; console.log(${probe('LiteGraph')});`],
  ['CJS .', 'commonjs', `const { LiteGraph } = require('@litegraph/litegraph'); console.log(${probe('LiteGraph')});`],
  ['CJS /node', 'commonjs', `const { LiteGraph } = require('@litegraph/litegraph/node'); console.log(${probe('LiteGraph')});`],
];
for (const [label, type, code] of entries) {
  const r = run(label, type, code);
  const v = r.value ?? {};
  const ok = r.status === 0 && v.version === expected && v.allow_scripts === false && v.model === 'ancestors' && (label.includes('/core') || v.subgraph_format === 'definitions');
  record(label, ok, r.status === 0 ? v : r.stderr);
}

// a graph runs: const -> watch
{
  const r = run('graph run', 'module', `import { LiteGraph, LGraph } from '@litegraph/litegraph'; const g = new LGraph(); const a = LiteGraph.createNode('basic/const'); const w = LiteGraph.createNode('basic/watch'); g.add(a); g.add(w); a.setValue(1); a.connect(0, w, 0); g.runStep(); console.log(JSON.stringify({value: w.value}));`);
  record('graph run (const -> watch)', r.status === 0 && r.value?.value === 1, r.status === 0 ? r.value : r.stderr);
}

// src/ is not exported
for (const [label, type, code] of [
  ['src/ not exported (ESM)', 'module', `try { await import('@litegraph/litegraph/src/litegraph.js'); console.log(JSON.stringify({code: null})); } catch (e) { console.log(JSON.stringify({code: e.code})); }`],
  ['src/ not exported (CJS)', 'commonjs', `try { require('@litegraph/litegraph/src/litegraph.js'); console.log(JSON.stringify({code: null})); } catch (e) { console.log(JSON.stringify({code: e.code})); }`],
]) {
  const r = run(label, type, code);
  record(label, r.value?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED', r.value ?? r.stderr);
}

// no runtime dependencies were installed (optional ones are omitted)
{
  const modules = path.join(cwd, 'node_modules');
  // packages, not folders: npm can leave empty @scope folders behind for omitted optional packages
  const names = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => !name.startsWith('.')) : []);
  const installed = names(modules).flatMap((name) => (name.startsWith('@') ? names(path.join(modules, name)).map((sub) => `${name}/${sub}`) : [name])).filter((name) => !name.startsWith('@litegraph/'));
  record('no dependencies installed', installed.length === 0, installed);
}

const ok = checks.every((check) => check.ok);
for (const check of checks) process.stderr.write(`${check.ok ? 'ok  ' : 'FAIL'} ${check.label}: ${JSON.stringify(check.detail)}\n`);
console.log(JSON.stringify({ ok, passed: checks.filter((check) => check.ok).length, total: checks.length, checks }));
process.exitCode = ok ? 0 : 1;
