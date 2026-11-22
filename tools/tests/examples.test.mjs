// Examples library (FLW-22): every non-wip example of apps/editor/examples/index.json loads without
// missing nodes, checks clean under "ancestors" after "Apply the model's node modes", runs a few
// steps without errors or dropped events, and its link data matches a stored snapshot. Examples that
// `need` the network or audio files load and check without running.
// Runs against src/ (like the editor pages) with the editor's demo nodes (apps/editor/js/demos.js).
// Update the snapshot on purpose with: UPDATE_EXAMPLE_SNAPSHOTS=1 npm run test:integration
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserStubs } from '../node-reference.mjs';
import { exampleGroups } from '../../apps/editor/js/examples.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EXAMPLES = path.join(ROOT, 'apps/editor/examples');
const SNAPSHOT = path.join(ROOT, 'tools/fixtures/examples-outputs.json');
const STEPS = 5;

for (const level of ['log', 'info', 'debug', 'warn', 'error']) console[level] = () => {};
new Function(fs.readFileSync(path.join(ROOT, 'vendor/gl-matrix-min.js'), 'utf8')).call(globalThis);
const { LiteGraph } = await import('../../src/litegraph.js');
const { LGraph } = await import('../../src/lgraph.js');
LiteGraph.initialize(); // libraries.js uses LiteGraph.LibraryManager at import
// the node files of the main bundle (build.py lib_nodes_files) except the WebGL packs (gltextures, glshaders,
// glfx, geometry: vendor/litegl.js needs a window at import, and no runnable example uses them), then the
// editor's demo nodes
for (const file of ['base', 'events', 'interface', 'input', 'math', 'math3d', 'strings', 'logic', 'graphics',
    'midi', 'audio', 'network', 'objects', 'libraries', 'html', 'watch', 'litegraph_nodes', 'libraries/socketio', 'others']) {
    await import(`../../src/nodes/${file}.js`);
}
await import('../../apps/editor/js/demos.js');
await LiteGraph.LibraryManager.ready;

const manifest = JSON.parse(fs.readFileSync(path.join(EXAMPLES, 'index.json'), 'utf8'));
const runnable = manifest.examples.filter((ex) => ex.category !== 'wip');
const stored = fs.existsSync(SNAPSHOT) ? JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')) : {};
const snapshots = {};

function picture(value, depth = 0) {
    if (value === undefined) return '<undefined>';
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 1e6) / 1e6 : String(value);
    if (typeof value === 'function') return '<function>';
    if (ArrayBuffer.isView(value)) return Array.from(value.slice(0, 8), (v) => picture(v, depth + 1));
    if (depth > 2) return `<${value.constructor?.name ?? 'object'}>`;
    if (Array.isArray(value)) return value.slice(0, 16).map((v) => picture(v, depth + 1));
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return `<${value.constructor?.name ?? 'object'}>`;
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, picture(value[key], depth + 1)]));
}
function linkData(graph) {
    const out = {};
    for (const [id, link] of Object.entries(graph.links ?? {})) if (link) out[id] = picture(link.data);
    for (const node of graph._nodes) if (node.subgraph && node.subgraph !== graph) out[`subgraph ${node.id}`] = linkData(node.subgraph);
    return out;
}

test('the manifest lists every example file once, with the fields the menu and the tests use', () => {
    const files = [];
    (function walk(dir) {
        for (const name of fs.readdirSync(dir)) {
            const full = path.join(dir, name);
            if (fs.statSync(full).isDirectory()) walk(full); else if (name !== 'index.json') files.push(path.relative(EXAMPLES, full).split(path.sep).join('/'));
        }
    })(EXAMPLES);
    assert.deepEqual(manifest.examples.map((ex) => ex.file).sort(), files.sort());
    const categories = new Set(manifest.categories.map((c) => c.id));
    const ids = new Set();
    for (const ex of manifest.examples) {
        for (const field of ['id', 'file', 'title', 'description', 'category', 'level']) assert.equal(typeof ex[field], 'string', `${ex.id}: ${field}`);
        for (const field of ['tags', 'packs']) assert.ok(Array.isArray(ex[field]), `${ex.id}: ${field}`);
        assert.ok(categories.has(ex.category), `${ex.id}: category ${ex.category}`);
        assert.ok(!ids.has(ex.id), `duplicate id ${ex.id}`); ids.add(ex.id);
        if (ex.category !== 'wip') assert.ok(ex.profile && ex.flow, `${ex.id}: profile and flow`);
    }
});

test('menu groups: manifest order, wip hidden, pack templates in their category', () => {
    const templates = [{ pack: 'acme', id: 'synth', title: 'Synth', description: '', category: 'audio', url: 't.json', data: null },
        { pack: 'acme', id: 'own', title: 'Own', description: '', category: 'acme/custom', url: null, data: { nodes: [] } }];
    const groups = exampleGroups(manifest, templates);
    const ids = groups.map((g) => g.id);
    assert.ok(!ids.includes('wip'));
    assert.deepEqual(ids.slice(-1), ['acme/custom']); // unknown categories come last
    assert.deepEqual(groups.find((g) => g.id === 'audio').items.at(-1), { id: 'acme:synth', title: 'Synth', description: '', url: 't.json', data: null, pack: 'acme' });
    assert.equal(groups.find((g) => g.id === 'subgraphs').items[0].url, 'examples/subgraph.json'); // old paths kept
    assert.ok(exampleGroups(manifest, [], { includeHidden: true }).some((g) => g.id === 'wip'));
});

for (const ex of runnable) {
    test(`example ${ex.id} (${ex.file})`, async () => {
        let seed = 42;
        const random = Math.random, getTime = LiteGraph.getTime;
        let clock = 1000;
        Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
        LiteGraph.getTime = () => clock;
        try {
            await withBrowserStubs(() => {
                const doc = JSON.parse(fs.readFileSync(path.join(EXAMPLES, ex.file), 'utf8'));
                const graph = new LGraph();
                const problems = [];
                graph.events.on('event-dropped', (e) => problems.push(`dropped ${e.detail?.reason ?? e.reason}: ${e.detail?.message ?? e.message}`));
                graph.events.on('node-error', (e) => problems.push(`error: ${(e.detail ?? e).error?.message ?? 'node error'}`));
                assert.equal(graph.configure(doc), false, 'configure');
                assert.deepEqual(graph.getMissingNodes().map((m) => m.type), [], 'missing nodes');
                graph.setExecutionModel('ancestors');
                graph.applyExecutionModelModes();
                assert.deepEqual(graph.checkExecution().issues.map((i) => `${i.node.type} ${i.code}`), [], 'checkExecution after applying modes');
                // loads and checks only: running would open connections (network) or fetch sound files (audio)
                if (ex.needs?.some((need) => need === 'network' || need === 'audio')) return;
                graph.catch_errors = true;
                graph.starttime = graph.last_update_time = clock;
                for (let i = 0; i < STEPS; i++) { clock += 16; graph.runStep(1); }
                assert.deepEqual(problems.filter((p) => !p.startsWith('dropped no-handler') && !p.startsWith('dropped mode')), [], 'errors and dropped events');
                snapshots[ex.id] = linkData(graph);
                if (!process.env.UPDATE_EXAMPLE_SNAPSHOTS) assert.deepEqual(snapshots[ex.id], stored[ex.id], 'link data snapshot (UPDATE_EXAMPLE_SNAPSHOTS=1 to rewrite)');
                graph.clear();
            });
        } finally {
            Math.random = random;
            LiteGraph.getTime = getTime;
        }
    });
}

test.after(() => {
    if (process.env.UPDATE_EXAMPLE_SNAPSHOTS) fs.writeFileSync(SNAPSHOT, JSON.stringify(snapshots, null, 1) + '\n');
});
