// Node catalog (FLW-23): every shipped node type is created, described, and listed once in the
// generated node reference. Runs against build/litegraph_nodejs.full.js (every bundled pack).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, buildReference, createForReference } from '../node-reference.mjs';

for (const level of ['log', 'info', 'debug', 'warn', 'error']) console[level] = () => {}; // failures are asserted below
const { LiteGraph } = await loadCatalog();
const reference = await buildReference(LiteGraph);
const types = Object.keys(LiteGraph.registered_node_types).sort();

test('every registered type is created (browser types with jsdom, Web Audio and WebGL stand-ins)', async () => {
    assert.ok(types.length > 250, `only ${types.length} types loaded`);
    const failed = [];
    for (const type of types) {
        const node = await createForReference(LiteGraph, type);
        if (!node) failed.push(`${type} [${LiteGraph.getNodeDefinition(type).capabilities.join(',')}]`);
    }
    assert.deepEqual(failed, []);
});

test('every type has a title and a description, and belongs to a builtin pack with a description', () => {
    const missing = [];
    for (const type of types) {
        const def = LiteGraph.getNodeDefinition(type);
        if (!def.title?.trim()) missing.push(`${type}: title`);
        if (!def.description?.trim()) missing.push(`${type}: description`);
        if (!def.pack) missing.push(`${type}: pack`);
    }
    for (const pack of LiteGraph.packs.list()) {
        if (pack.builtin && !pack.description.trim()) missing.push(`${pack.id}: pack description`);
    }
    assert.deepEqual(missing, []);
});

test('the reference lists each registered type once, with its definition', () => {
    const listed = reference.json.nodes.map((n) => n.type);
    assert.deepEqual(listed, types);
    for (const entry of reference.json.nodes) {
        const def = LiteGraph.getNodeDefinition(entry.type);
        assert.equal(entry.title, def.title, entry.type);
        assert.equal(entry.description, def.description, entry.type);
        assert.equal(entry.usage, def.usage, entry.type);
        assert.equal(entry.category, def.category, entry.type);
        assert.equal(entry.pack, def.pack?.id ?? null, entry.type);
        assert.equal(!!entry.execution, !!def.execution, entry.type);
        assert.ok(Array.isArray(entry.inputs) && Array.isArray(entry.outputs), `${entry.type}: slots are known`);
    }
    // JSON round trip: plain data only
    assert.deepEqual(JSON.parse(JSON.stringify(reference.json)), reference.json);
});

test('pages: one per pack with nodes, linked from the README, one table per category', () => {
    const { json, pages } = reference;
    assert.ok(pages['README.md'].includes(`${json.nodes.length} node types`));
    for (const pack of json.packs) {
        assert.ok(pages[pack.file], pack.file);
        assert.ok(pages['README.md'].includes(`](${pack.file})`), `README links ${pack.file}`);
        for (const category of pack.categories) assert.ok(pages[pack.file].includes(`## ${category}`), `${pack.file}: ${category}`);
    }
    assert.equal(Object.keys(pages).length, json.packs.length + 1);
    // a known row: math/operation shows its slots and its declaration
    const math = pages['math.md'];
    assert.match(math, /\| `math\/operation` \| Operation \| .* \| A:number,array,object, B:number \| =:number \| pure; default ancestors: On Request/);
    assert.match(pages['events.md'], /\| `events\/timer` \|.*ticks/);
});
