import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { localBuildRoot as root } from './local-build.mjs';

if (process.argv.includes('--snapshot')) {
  const snapshot = fileURLToPath(new URL('../', import.meta.url));
  for (const dir of ['build', 'build_node']) {
    const localFiles = fs.readdirSync(path.join(root, dir)).sort();
    assert.deepEqual(fs.readdirSync(path.join(snapshot, dir)).sort(), localFiles, `${dir} snapshot file list differs`);
    for (const file of localFiles) {
      const relative = path.join(dir, file);
      assert.ok(fs.readFileSync(path.join(root, relative)).equals(fs.readFileSync(path.join(snapshot, relative))), `Milestone snapshot differs: ${relative}`);
    }
  }
  console.log('The milestone snapshot matches the local build.');
  process.exit(0);
}

let checked = 0;
for (const dir of ['build', 'build_node']) {
  for (const file of fs.readdirSync(path.join(root, dir)).filter((name) => /\.(cjs|js)$/.test(name))) {
    const target = path.join(root, dir, file);
    assert.ok(fs.statSync(target).size > 1000, `${file} is empty`);
    const syntax = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
    assert.equal(syntax.status, 0, syntax.stderr);
    const code = `const m = await import(${JSON.stringify(pathToFileURL(target).href)}); const lg=m.LiteGraph || m.default?.LiteGraph; if(!lg?.LGraph || !lg.registered_node_types['graph/subgraph']) throw Error('Missing initialized exports'); const g=new lg.LGraph(); g.runStep(); g.clear();`;
    const smoke = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: root, encoding: 'utf8', timeout: 20000 });
    assert.equal(smoke.status, 0, `${file}: ${smoke.stderr}\n${smoke.stdout}`);
    if (file.includes('.mini.')) {
      const plain = path.join(root, dir, file.replace('.mini.', '.'));
      assert.ok(fs.statSync(target).size < fs.statSync(plain).size, `${file} was not minified`);
    }
    checked++;
  }
}
const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'litegraph-pack-'));
const packed = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts', '--cache', cache], { cwd: root, encoding: 'utf8' });
fs.rmSync(cache, { recursive: true, force: true });
assert.ifError(packed.error);
assert.equal(packed.status, 0, packed.stderr);
const files = JSON.parse(packed.stdout)[0].files.map((entry) => entry.path);
assert.ok(files.includes('build_node/litegraph.cjs'));
for (const file of ['src/litegraph.d.ts', 'src/litegraph.d.cts', 'src/litegraph.full.d.cts', 'src/litegraph.core.d.ts', 'src/litegraph.node.d.cts']) assert.ok(files.includes(file), `Missing declaration: ${file}`);
assert.ok(files.includes('build_node/litegraph_nodejs.full.cjs'));
for (const code of ["const m=require('@litegraph/litegraph'); if(!m.LiteGraph) throw Error('CJS entry');", "import {LiteGraph} from '@litegraph/litegraph'; if(!LiteGraph) throw Error('ESM entry');"]) {
  const result = spawnSync(process.execPath, [code.startsWith('import') ? '--input-type=module' : '--input-type=commonjs', '-e', code], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
for (const subpath of ['@litegraph/litegraph/core', '@litegraph/litegraph/node']) {
  for (const esm of [true, false]) {
    const code = esm ? `import {LGraph} from '${subpath}'; new LGraph().clear();` : `const {LGraph}=require('${subpath}'); new LGraph().clear();`;
    const result = spawnSync(process.execPath, [esm ? '--input-type=module' : '--input-type=commonjs', '-e', code], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
}
// exports: no wildcard (except css), every artifact listed by its path, every target present
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const exportKeys = Object.keys(manifest.exports);
assert.deepEqual(exportKeys.filter((key) => key.includes('*') && key !== './css/*'), [], 'Export wildcards make every file public API');
for (const dir of ['build', 'build_node']) {
  for (const file of fs.readdirSync(path.join(root, dir))) {
    assert.equal(manifest.exports[`./${dir}/${file}`], `./${dir}/${file}`, `Artifact not in the exports map: ${dir}/${file}`);
  }
}
const targets = (value) => typeof value === 'string' ? [value] : Object.values(value).flatMap(targets);
for (const key of exportKeys) {
  for (const target of targets(manifest.exports[key])) {
    if (!target.includes('*')) assert.ok(fs.existsSync(path.join(root, target)), `Export ${key} points at a missing file: ${target}`);
  }
}
for (const subpath of ['@litegraph/litegraph/build/litegraph.full.js', '@litegraph/litegraph/build_node/litegraph.full.cjs']) {
  const esm = subpath.endsWith('.js');
  const code = esm ? `import {LiteGraph} from '${subpath}'; if(!LiteGraph) throw Error('deep import');` : `const {LiteGraph}=require('${subpath}'); if(!LiteGraph) throw Error('deep import');`;
  const result = spawnSync(process.execPath, [esm ? '--input-type=module' : '--input-type=commonjs', '-e', code], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
// library builds carry no editor or debug defaults: script evaluation stays off
for (const file of ['build/litegraph.full.js', 'build_node/litegraph.full.cjs', 'build_node/litegraph_nodejs.full.cjs']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(!/LiteGraph\.allow_scripts\s*=\s*true/.test(source), `${file} turns script evaluation on`);
}
// runtime dependencies: the library needs none; integrations are optional
assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0, 'The library must not have required dependencies (integrations are optionalDependencies)');
console.log(`Validated ${checked} build artifacts, package contents, exports, and ESM/CommonJS entry points.`);
