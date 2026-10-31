import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let checked = 0;
for (const dir of ['build', 'build_node']) {
  for (const file of fs.readdirSync(path.join(root, dir)).filter((name) => /\.(cjs|js)$/.test(name))) {
    const target = path.join(root, dir, file);
    assert.ok(fs.statSync(target).size > 1000, `${file} is empty`);
    const syntax = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
    assert.equal(syntax.status, 0, syntax.stderr);
    const code = `const m = await import(${JSON.stringify(new URL(target, 'file:').href)}); const lg=m.LiteGraph || m.default?.LiteGraph; if(!lg?.LGraph || !lg.registered_node_types['graph/subgraph']) throw Error('Missing initialized exports'); const g=new lg.LGraph(); g.runStep(); g.clear();`;
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
console.log(`Validated ${checked} build artifacts, package contents, and ESM/CommonJS entry points.`);
