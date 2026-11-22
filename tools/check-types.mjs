import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const compiler = path.join(root, 'node_modules/typescript/bin/tsc');
function compile(config) {
    const result = spawnSync(process.execPath, [compiler, '-p', config], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
}
compile(path.join(root, 'tools/types/tsconfig.json'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'litegraph-types-'));
try {
    // Reproduce a consumer that has only the declarations selected for publication.
    const installed = path.join(temporary, 'node_modules/@litegraph/litegraph');
    fs.mkdirSync(path.join(installed, 'src'), { recursive: true });
    fs.copyFileSync(path.join(root, 'package.json'), path.join(installed, 'package.json'));
    for (const file of manifest.files.filter((name) => /\.d\.(cts|ts)$/.test(name))) {
        fs.copyFileSync(path.join(root, file), path.join(installed, file));
    }
    for (const file of fs.readdirSync(path.join(root, 'tools/types'))) {
        fs.copyFileSync(path.join(root, 'tools/types', file), path.join(temporary, file));
    }
    compile(path.join(temporary, 'tsconfig.json'));
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }

async function checkExports(declaration, artifact, singleton = false) {
    const file = path.join(root, declaration);
    const program = ts.createProgram([file], { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext });
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(file);
    const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(source));
    const resolve = (symbol) => symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const names = exports.filter((symbol) => resolve(symbol).flags & ts.SymbolFlags.Value).map((symbol) => symbol.name).sort();
    const imported = await import(new URL(artifact, import.meta.url));
    const runtime = artifact.endsWith('.cjs') ? imported.default : imported;
    assert.deepEqual(names, Object.keys(runtime).sort(), `Declared/runtime exports differ: ${artifact}`);
    if (singleton) {
        const symbol = resolve(exports.find((symbol) => symbol.name === 'LiteGraph'));
        const fields = checker.getTypeOfSymbolAtLocation(symbol, source).getProperties();
        assert.deepEqual(fields.map((field) => field.name).filter((name) => !(name in runtime.LiteGraph)), [], 'Declared LiteGraph members missing at runtime');
    }
}
await checkExports('src/litegraph.d.ts', '../build/litegraph.js', true);
await checkExports('src/litegraph.core.d.ts', '../build/litegraph.core.js');
await checkExports('src/litegraph.full.d.cts', '../build_node/litegraph.cjs');
await checkExports('src/litegraph.node.d.cts', '../build_node/litegraph_nodejs.full.cjs');

// every typed event emitted in src/ is declared in one of the event maps
const declarations = fs.readFileSync(path.join(root, 'src/litegraph.d.cts'), 'utf8');
const declared = new Set();
for (const [, body] of declarations.matchAll(/export interface (?:LGraphEventMap|LGraphCanvasEventMap|LiteGraphEventMap) \{([\s\S]*?)\n\}/g)) {
    for (const [, name] of body.matchAll(/^ {4}"?([a-z][a-z-]*)"?\??:/gm)) declared.add(name);
}
const emitted = new Set();
for (const file of fs.readdirSync(path.join(root, 'src')).filter((name) => name.endsWith('.js'))) {
    for (const [, name] of fs.readFileSync(path.join(root, 'src', file), 'utf8').matchAll(/_emit\??\.?\(\s*"([a-z][a-z-]*)"/g)) emitted.add(name);
}
assert.deepEqual([...emitted].filter((name) => !declared.has(name)).sort(), [], 'Typed events emitted but not declared in an event map');

console.log('Validated strict ESM/CJS consumers, isolated published declarations, runtime export parity and declared typed events.');
