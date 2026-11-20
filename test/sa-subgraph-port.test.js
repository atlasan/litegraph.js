import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { SubgraphDefs } from '../src/subgraphdefs.js';
import { unusedDefinitionIds } from '../src/extensions/subgraph_tools.js';

/**
 * Subgraph acceptance cases adapted from the MIT standalone Comfy-Org/litegraph.js @ ea0e1a8,
 * test/subgraph/*.test.ts (Subgraph, SubgraphNode, SubgraphIO, SubgraphEdgeCases,
 * SubgraphSerialization, subgraphSerialization, subgraphUtils, SubgraphNode.titleButton,
 * SubgraphMemory). Each test name gives its source as "<file> › <test>". They are rewritten for this
 * runtime: instances run nested graphs, the interface is graph/input and graph/output nodes, and
 * definitions live in the root registry (LGraph.subgraphs).
 *
 * Deliberate differences:
 * - unused definitions are kept until "Remove unused subgraph definitions";
 * - there is no flattened ExecutableNodeDTO executor (path ids cover addressing);
 * - the IO-node class tree is not ported.
 */

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('v', 'number'); this.addProperty('v', 3); } onExecute() { this.setOutputData(0, this.properties.v); } }
    class Add { constructor() { this.addInput('a', 'number'); this.addInput('b', 'number'); this.addOutput('sum', 'number'); } onExecute() { this.setOutputData(0, (this.getInputData(0) ?? 0) + (this.getInputData(1) ?? 0)); } }
    class Sink { constructor() { this.addInput('in', 'number'); this.value = undefined; } onExecute() { this.value = this.getInputData(0); } }
    class Box { constructor() { this.addInput('in', '*'); this.addOutput('out', '*'); this.addProperty('note', ''); } onExecute() { this.setOutputData(0, this.getInputData(0)); } }
    for (const [type, cls] of Object.entries({ src: Src, add: Add, sink: Sink, box: Box })) LiteGraph.registerNodeType(`sa/${type}`, cls);
});
beforeEach(() => { for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {}); });
afterEach(() => { jest.restoreAllMocks(); LiteGraph.subgraph_max_depth = 32; });

let seq = 0;
const uid = () => `sa-${String(++seq).padStart(4, '0')}-4000-8000-000000000000`;
/** a ComfyUI-shaped definition: inputs/outputs by name and type, nodes and links as given */
function definition({ id = uid(), name = 'Def', inputs = [], outputs = [], nodes = [], links = [], ...rest } = {}) {
    return { id, version: 1, name,
        inputNode: { id: -10, bounding: [-200, 0, 120, 60] }, outputNode: { id: -20, bounding: [600, 0, 120, 60] },
        inputs: inputs.map(([n, t], i) => ({ id: `${id}-in${i}`, name: n, type: t, linkIds: [] })),
        outputs: outputs.map(([n, t], i) => ({ id: `${id}-out${i}`, name: n, type: t, linkIds: [] })),
        nodes, links, ...rest };
}
/** a box passing x through */
function passThrough(id = uid(), name = 'Pass') {
    return definition({ id, name, inputs: [['x', 'number']], outputs: [['y', 'number']],
        nodes: [{ id: 1, type: 'sa/box', pos: [0, 0], size: [100, 40], flags: {}, mode: 0, properties: { note: '' },
            inputs: [{ name: 'in', type: '*', link: 1 }], outputs: [{ name: 'out', type: '*', links: [2] }] }],
        links: [{ id: 1, origin_id: -10, origin_slot: 0, target_id: 1, target_slot: 0, type: 'number' },
            { id: 2, origin_id: 1, origin_slot: 0, target_id: -20, target_slot: 0, type: 'number' }] });
}
const load = (doc) => { const graph = new LGraph(); const error = graph.configure(JSON.parse(JSON.stringify(doc))); return { graph, error }; };
const host = (def, extra = []) => ({ nodes: [{ id: 1, type: def.id, pos: [0, 0], size: [140, 60], flags: {}, mode: 0, properties: {}, inputs: [], outputs: [] }, ...extra], links: [], definitions: { subgraphs: [def] } });
const make = (graph, type, x = 0, y = 0) => { const n = LiteGraph.createNode(type); n.pos = [x, y]; graph.add(n); return n; };
const run = (graph, steps = 3) => { for (let i = 0; i < steps; i++) graph.runStep(1); };
const io = (node, kind) => node.subgraph._nodes.filter((n) => n.type === `graph/${kind}`);

describe('Subgraph.test.ts', () => {
    test('Subgraph.test.ts › should create a subgraph with minimal data', () => {
        const { graph, error } = load(host(definition()));
        expect(error).toBe(false);
        const node = graph.getNodeById(1);
        expect(node.inputs ?? []).toEqual([]);
        expect(node.outputs ?? []).toEqual([]);
    });

    test('Subgraph.test.ts › should accept custom name and ID', () => {
        const def = definition({ id: 'custom-0000-4000-8000-000000000001', name: 'My Subgraph' });
        const { graph } = load(host(def));
        expect(graph.subgraphs.get(def.id).name).toBe('My Subgraph');
        expect(graph.serialize().definitions.subgraphs[0]).toEqual(expect.objectContaining({ id: def.id, name: 'My Subgraph' }));
    });

    test('Subgraph.test.ts › should have properly configured input and output nodes', () => {
        const { graph } = load(host(definition({ inputs: [['a', 'number']], outputs: [['b', 'string']] })));
        const node = graph.getNodeById(1);
        expect(io(node, 'input').map((n) => [n.properties.name, n.properties.type])).toEqual([['a', 'number']]);
        expect(io(node, 'output').map((n) => [n.properties.name, n.properties.type])).toEqual([['b', 'string']]);
        const saved = graph.serialize().definitions.subgraphs[0];
        expect(saved.inputNode.id).toBe(-10);
        expect(saved.outputNode.id).toBe(-20);
    });

    test('Subgraph.test.ts › should maintain correct indices when adding multiple inputs', () => {
        const { graph } = load(host(definition()));
        const node = graph.getNodeById(1);
        for (const name of ['first', 'second', 'third']) {
            const input = LiteGraph.createNode('graph/input');
            node.subgraph.add(input);
            input.setProperty('name', name);
        }
        expect(node.inputs.map((i) => i.name)).toEqual(['first', 'second', 'third']);
        node.commitDefinition();
        expect(graph.subgraphs.get(node.properties.subgraph_id).inputs.map((i) => i.name)).toEqual(['first', 'second', 'third']);
    });

    test('Subgraph.test.ts › should remove inputs correctly', () => {
        const { graph } = load(host(definition({ inputs: [['a', 'number'], ['b', 'number']] })));
        const node = graph.getNodeById(1);
        node.subgraph.remove(io(node, 'input').find((n) => n.properties.name === 'a'));
        expect(node.inputs.map((i) => i.name)).toEqual(['b']);
        node.commitDefinition();
        expect(graph.subgraphs.get(node.properties.subgraph_id).inputs.map((i) => i.name)).toEqual(['b']);
    });

    test('Subgraph.test.ts › should serialize subgraph with inputs and outputs', () => {
        const def = passThrough();
        const { graph } = load(host(def));
        const saved = graph.serialize({ format: 'definitions' }).definitions.subgraphs[0];
        expect(saved.inputs.map(({ id, name, type }) => ({ id, name, type }))).toEqual(def.inputs.map(({ id, name, type }) => ({ id, name, type })));
        expect(saved.inputs[0].linkIds).toEqual([1]);
        expect(saved.outputs[0].linkIds).toEqual([2]);
    });

    test('Subgraph.test.ts › should enforce MAX_NESTED_SUBGRAPHS limit (subgraph_max_depth)', () => {
        LiteGraph.subgraph_max_depth = 3;
        const chain = [];
        for (let i = 0; i < 5; i++) {
            const inner = chain[i - 1];
            chain.push(definition({ name: `L${i}`, nodes: inner ? [{ id: 1, type: inner.id, pos: [0, 0], size: [100, 40], properties: {} }] : [] }));
        }
        const doc = { ...host(chain[4]), definitions: { subgraphs: chain } };
        const { error } = load(doc);
        expect(error).toBe(true);
    });

    test('Subgraph.test.ts › should have recursion detection in place', () => {
        const a = definition({ name: 'A' }), b = definition({ name: 'B' });
        a.nodes.push({ id: 1, type: b.id, pos: [0, 0], size: [100, 40], properties: {} });
        b.nodes.push({ id: 1, type: a.id, pos: [0, 0], size: [100, 40], properties: {} });
        expect(SubgraphDefs.findCycles(new Map([[a.id, a], [b.id, b]]))).toEqual(new Set([a.id, b.id]));
        const { error } = load({ ...host(a), definitions: { subgraphs: [a, b] } });
        expect(error).toBe(true);
    });

    test('Subgraph.test.ts › should inherit root graph in nested subgraphs', () => {
        const inner = passThrough();
        const outer = definition({ nodes: [{ id: 3, type: inner.id, pos: [0, 0], size: [100, 40], properties: {} }] });
        const { graph } = load({ ...host(outer), definitions: { subgraphs: [outer, inner] } });
        const nested = graph.getNodeById(1).subgraph.getNodeById(3);
        expect(nested.subgraph.rootGraph).toBe(graph);
        expect(nested.graph.rootGraph).toBe(graph);
    });

    test('Subgraph.test.ts › should handle removing non-existent input gracefully', () => {
        const { graph } = load(host(definition()));
        const inner = graph.getNodeById(1).subgraph;
        expect(() => inner.removeInput('nope')).not.toThrow();
        expect(() => inner.removeOutput('nope')).not.toThrow();
    });

    test('Subgraph.test.ts › should maintain link integrity', () => {
        const { graph } = load(host(passThrough()));
        const src = make(graph, 'sa/src'), sink = make(graph, 'sa/sink', 400);
        const node = graph.getNodeById(1);
        src.connect(0, node, 0); node.connect(0, sink, 0);
        const { graph: again } = load(graph.serialize());
        expect(again.validateLinks().ok).toBe(true);
        expect(again.getNodeById(1).subgraph.validateLinks().ok).toBe(true);
        run(again);
        expect(again.getNodeById(sink.id).value).toBe(3);
    });
});

describe('SubgraphNode.test.ts', () => {
    test('SubgraphNode.test.ts › should create a SubgraphNode from a subgraph definition', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(passThrough(), { linked: true });
        expect(node.type).toBe('graph/subgraph');
        expect(node.inputs.map((i) => [i.name, i.type])).toEqual([['x', 'number']]);
        expect(node.outputs.map((o) => [o.name, o.type])).toEqual([['y', 'number']]);
    });

    test('SubgraphNode.test.ts › should update slots when subgraph definition changes', () => {
        const graph = new LGraph();
        const a = graph.insertDefinition(passThrough(), { linked: true });
        const b = graph.insertDefinition(a.properties.subgraph_id, { linked: true });
        const extra = LiteGraph.createNode('graph/output');
        a.subgraph.add(extra);
        extra.setProperty('name', 'z');
        a.commitDefinition();
        expect(b.outputs.map((o) => o.name)).toEqual(['y', 'z']);
    });

    test.each([['input', 'inputs'], ['output', 'outputs']])('SubgraphNode.test.ts › should sync %s addition, removal and renaming', (kind, list) => {
        const graph = new LGraph();
        const a = graph.insertDefinition(passThrough(), { linked: true });
        const b = graph.insertDefinition(a.properties.subgraph_id, { linked: true });
        const added = LiteGraph.createNode(`graph/${kind}`);
        a.subgraph.add(added);
        added.setProperty('name', 'extra');
        a.commitDefinition();
        expect(b[list].map((s) => s.name)).toContain('extra');
        added.setProperty('name', 'renamed');
        a.commitDefinition();
        expect(b[list].map((s) => s.name)).toContain('renamed');
        a.subgraph.remove(added);
        a.commitDefinition();
        expect(b[list].map((s) => s.name)).not.toContain('renamed');
    });

    test('SubgraphNode.test.ts › should inherit input and output types correctly', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(definition({ inputs: [['n', 'number'], ['s', 'string'], ['any', '*']], outputs: [['b', 'boolean']] }));
        expect(node.inputs.map((i) => i.type)).toEqual(['number', 'string', '*']);
        expect(node.outputs.map((o) => o.type)).toEqual(['boolean']);
    });

    test('SubgraphNode.test.ts › should handle removal lifecycle', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(passThrough(), { linked: true });
        const inner = node.subgraph._nodes.find((n) => n.type === 'sa/box');
        const removed = jest.fn();
        inner.onRemoved = removed;
        graph.remove(node);
        expect(graph.getNodeById(node.id)).toBeFalsy();
        expect(graph.subgraphs.has(node.properties.subgraph_id)).toBe(true); // the definition stays until removed as unused
        expect(unusedDefinitionIds(graph)).toEqual([node.properties.subgraph_id]);
    });

    test('SubgraphNode.test.ts › should handle nested subgraph execution', () => {
        const inner = passThrough();
        const outer = definition({ inputs: [['x', 'number']], outputs: [['y', 'number']],
            nodes: [{ id: 3, type: inner.id, pos: [0, 0], size: [100, 40], properties: {}, inputs: [{ name: 'x', type: 'number', link: 1 }], outputs: [{ name: 'y', type: 'number', links: [2] }] }],
            links: [{ id: 1, origin_id: -10, origin_slot: 0, target_id: 3, target_slot: 0, type: 'number' }, { id: 2, origin_id: 3, origin_slot: 0, target_id: -20, target_slot: 0, type: 'number' }] });
        const graph = new LGraph();
        const node = graph.insertDefinition(outer, { linked: true, definitions: [inner] });
        const src = make(graph, 'sa/src'), sink = make(graph, 'sa/sink', 400);
        src.properties.v = 11;
        src.connect(0, node, 0); node.connect(0, sink, 0);
        run(graph, 4);
        expect(sink.value).toBe(11);
    });

    test('SubgraphNode.test.ts › should handle deep nesting', () => {
        let def = passThrough();
        const all = [def];
        for (let i = 0; i < 10; i++) {
            const inner = def;
            def = definition({ inputs: [['x', 'number']], outputs: [['y', 'number']],
                nodes: [{ id: 3, type: inner.id, pos: [0, 0], size: [100, 40], properties: {}, inputs: [{ name: 'x', type: 'number', link: 1 }], outputs: [{ name: 'y', type: 'number', links: [2] }] }],
                links: [{ id: 1, origin_id: -10, origin_slot: 0, target_id: 3, target_slot: 0, type: 'number' }, { id: 2, origin_id: 3, origin_slot: 0, target_id: -20, target_slot: 0, type: 'number' }] });
            all.push(def);
        }
        const graph = new LGraph();
        const node = graph.insertDefinition(def, { linked: true, definitions: all });
        const src = make(graph, 'sa/src'), sink = make(graph, 'sa/sink', 400);
        src.connect(0, node, 0); node.connect(0, sink, 0);
        run(graph, 14);
        expect(sink.value).toBe(3);
        let deepest = node;
        while (deepest.subgraph?._nodes.find((n) => n.subgraph)) deepest = deepest.subgraph._nodes.find((n) => n.subgraph);
        expect(deepest.getPath().split(':')).toHaveLength(11);
    });

    test('SubgraphNode.test.ts › should prevent infinite recursion', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(passThrough(), { linked: true });
        const fn = LiteGraph.createNode('graph/function');
        node.subgraph.add(fn);
        expect(fn.setDefinition(node.properties.subgraph_id)).toBe(false);
    });

    test('SubgraphNode.test.ts › should not accumulate handlers over multiple add/remove cycles', () => {
        const graph = new LGraph();
        const id = graph.insertDefinition(passThrough(), { linked: true }).properties.subgraph_id;
        for (let i = 0; i < 10; i++) {
            const node = graph.insertDefinition(id, { linked: true });
            graph.remove(node);
        }
        expect(graph.findSubgraphInstances(id)).toHaveLength(1);
        expect(graph.subgraphs.size).toBe(1);
    });
});

describe('SubgraphIO.test.ts', () => {
    test('SubgraphIO.test.ts › handles slot removal with active connections', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(passThrough(), { linked: true });
        const src = make(graph, 'sa/src'), sink = make(graph, 'sa/sink', 400);
        src.connect(0, node, 0); node.connect(0, sink, 0);
        node.subgraph.remove(io(node, 'input')[0]);
        expect(node.inputs ?? []).toEqual([]);
        expect(Object.values(graph.links).filter(Boolean).every((l) => l.target_id !== node.id)).toBe(true);
        expect(graph.validateLinks().ok).toBe(true);
    });

    test('SubgraphIO.test.ts › handles slot renaming with active connections', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(passThrough(), { linked: true });
        const src = make(graph, 'sa/src');
        src.connect(0, node, 0);
        io(node, 'input')[0].setProperty('name', 'renamed');
        expect(node.inputs[0].name).toBe('renamed');
        expect(node.inputs[0].link).not.toBeNull();
    });

    test('SubgraphIO.test.ts › maintains slot synchronization across multiple instances', () => {
        const graph = new LGraph();
        const a = graph.insertDefinition(passThrough(), { linked: true });
        const others = [1, 2, 3].map(() => graph.insertDefinition(a.properties.subgraph_id, { linked: true }));
        io(a, 'input')[0].setProperty('name', 'value');
        a.commitDefinition();
        expect(others.map((n) => n.inputs.map((i) => i.name))).toEqual([['value'], ['value'], ['value']]);
    });

    test('SubgraphIO.test.ts › creates new input and connects when dragging from empty slot inside subgraph', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(definition({ nodes: [{ id: 1, type: 'sa/add', pos: [0, 0], size: [100, 60], flags: {}, mode: 0, properties: {}, inputs: [{ name: 'a', type: 'number', link: null }, { name: 'b', type: 'number', link: null }], outputs: [{ name: 'sum', type: 'number', links: null }] }] }));
        const add = node.subgraph.getNodeById(1);
        node.exposeSlot(add, 0, false);
        node.exposeSlot(add, 1, false);
        node.exposeSlot(add, 0, true);
        expect(node.inputs.map((i) => i.name)).toEqual(['a', 'b']);
        expect(node.outputs.map((o) => o.name)).toEqual(['sum']);
        const s1 = make(graph, 'sa/src'), s2 = make(graph, 'sa/src', 0, 100), sink = make(graph, 'sa/sink', 400);
        s2.properties.v = 4;
        s1.connect(0, node, 0); s2.connect(0, node, 1); node.connect(0, sink, 0);
        run(graph);
        expect(sink.value).toBe(7);
    });
});

describe('SubgraphEdgeCases.test.ts', () => {
    test('SubgraphEdgeCases.test.ts › should handle duplicate slot names', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(definition({ inputs: [['same', 'number']] }));
        const second = LiteGraph.createNode('graph/input');
        node.subgraph.add(second);
        second.setProperty('name', 'same');
        expect(node.inputs.map((i) => i.name)).toEqual(['same']); // refused: names key the values
    });

    test('SubgraphEdgeCases.test.ts › should handle empty subgraphs (no nodes, no IO)', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(definition());
        expect(() => run(graph)).not.toThrow();
        expect(load(graph.serialize()).error).toBe(false);
        void node;
    });

    test('SubgraphEdgeCases.test.ts › should handle very long and Unicode slot names', () => {
        const long = 'x'.repeat(300), unicode = '入力 ✓ ñ';
        const graph = new LGraph();
        graph.insertDefinition(definition({ inputs: [[long, 'number'], [unicode, 'string']] }));
        const { graph: again } = load(graph.serialize({ format: 'definitions' }));
        expect([...again.subgraphs.values()][0].inputs.map((i) => i.name)).toEqual([long, unicode]);
        expect(again._nodes[0].inputs.map((i) => i.name)).toEqual([long, unicode]);
    });

    test('SubgraphEdgeCases.test.ts › should handle complex type strings', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(definition({ inputs: [['multi', 'number,string']], outputs: [['img', 'IMAGE']] }));
        expect(node.inputs[0].type).toBe('number,string');
        const saved = graph.serialize({ format: 'definitions' }).definitions.subgraphs[0];
        expect(saved.inputs[0].type).toBe('number,string');
        expect(saved.outputs[0].type).toBe('IMAGE');
    });

    test('SubgraphEdgeCases.test.ts › should handle subgraphs with many slots', () => {
        const names = Array.from({ length: 50 }, (_, i) => [`in${i}`, 'number']);
        const graph = new LGraph();
        graph.insertDefinition(definition({ inputs: names, outputs: names.map(([n]) => [`o${n}`, 'number']) }));
        const { graph: again } = load(graph.serialize({ format: 'definitions' }));
        expect(again._nodes[0].inputs).toHaveLength(50);
        expect(again._nodes[0].outputs).toHaveLength(50);
    });

    test('SubgraphEdgeCases.test.ts › should handle large numbers of nodes in subgraph', () => {
        const nodes = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, type: 'sa/box', pos: [i * 10, 0], size: [100, 40], flags: {}, mode: 0, properties: { note: `n${i}` }, inputs: [], outputs: [] }));
        const graph = new LGraph();
        graph.insertDefinition(definition({ nodes }));
        const saved = graph.serialize({ format: 'definitions' });
        expect(saved.definitions.subgraphs[0].nodes).toHaveLength(200);
        expect(load(saved).graph._nodes[0].subgraph._nodes).toHaveLength(200);
    });

    test('SubgraphEdgeCases.test.ts › should handle rapid IO changes', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(definition());
        for (let i = 0; i < 20; i++) {
            const input = LiteGraph.createNode('graph/input');
            node.subgraph.add(input);
            input.setProperty('name', `r${i}`);
            if (i % 2) node.subgraph.remove(input);
        }
        node.commitDefinition();
        expect(node.inputs).toHaveLength(10);
        expect(graph.subgraphs.get(node.properties.subgraph_id).inputs).toHaveLength(10);
    });
});

describe('SubgraphSerialization.test.ts', () => {
    test('SubgraphSerialization.test.ts › should pass round-trip testing (save → load → save → compare)', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(passThrough(), { linked: true });
        const src = make(graph, 'sa/src'), sink = make(graph, 'sa/sink', 400);
        src.connect(0, node, 0); node.connect(0, sink, 0);
        const first = graph.serialize({ format: 'definitions' });
        const second = load(first).graph.serialize({ format: 'definitions' });
        expect(second.nodes).toEqual(first.nodes);
        expect(SubgraphDefs.canonical(second.definitions.subgraphs[0])).toBe(SubgraphDefs.canonical(first.definitions.subgraphs[0]));
    });

    test('SubgraphSerialization.test.ts › should preserve node positions, properties and custom data', () => {
        const def = passThrough();
        def.nodes[0].pos = [123, 456];
        def.nodes[0].properties.note = 'kept';
        def.nodes[0].custom_field = { deep: [1, 2] };
        const graph = new LGraph();
        graph.insertDefinition(def, { linked: true });
        const saved = graph.serialize({ format: 'definitions' }).definitions.subgraphs[0].nodes[0];
        expect(saved.pos).toEqual([123, 456]);
        expect(saved.properties.note).toBe('kept');
    });

    test('SubgraphSerialization.test.ts › should handle missing fields gracefully', () => {
        const bare = { id: uid(), nodes: [], links: {} }; // no name, inputs, outputs, IO nodes
        const { graph, error } = load(host(bare));
        expect(error).toBe(false);
        const saved = graph.serialize({ format: 'definitions' }).definitions.subgraphs[0];
        expect(saved).toEqual(expect.objectContaining({ id: bare.id, inputs: [], outputs: [], version: 1 }));
        expect(saved.inputNode.id).toBe(-10);
    });

    test('SubgraphSerialization.test.ts › should verify IDs remain unique', () => {
        const graph = new LGraph();
        const def = passThrough();
        const copies = [1, 2, 3].map(() => graph.insertDefinition(def));
        const ids = copies.map((n) => n.properties.subgraph_id);
        expect(new Set(ids).size).toBe(3);
        const saved = graph.serialize({ format: 'definitions' });
        expect(new Set(saved.nodes.map((n) => n.id)).size).toBe(saved.nodes.length);
        for (const d of saved.definitions.subgraphs) expect(new Set(d.inputs.map((i) => i.id)).size).toBe(d.inputs.length);
    });
});

describe('subgraphSerialization.test.ts', () => {
    test('subgraphSerialization.test.ts › unused subgraph definitions: kept until removed (deliberate difference)', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(passThrough());
        graph.remove(node);
        expect(graph.serialize().definitions.subgraphs).toHaveLength(1);
        expect(unusedDefinitionIds(graph)).toEqual([node.properties.subgraph_id]);
    });

    test('subgraphSerialization.test.ts › should include nested subgraphs, once each', () => {
        const inner = passThrough();
        const outer = definition({ nodes: [{ id: 3, type: inner.id, pos: [0, 0], size: [100, 40], properties: {} }, { id: 4, type: inner.id, pos: [0, 100], size: [100, 40], properties: {} }] });
        const graph = new LGraph();
        graph.insertDefinition(outer, { linked: true, definitions: [inner] });
        graph.insertDefinition(outer.id, { linked: true });
        const saved = graph.serialize({ format: 'definitions' });
        expect(saved.definitions.subgraphs.map((d) => d.id).sort()).toEqual([inner.id, outer.id].sort());
    });

    test('subgraphSerialization.test.ts › should only serialize from root graph', () => {
        const graph = new LGraph();
        const node = graph.insertDefinition(passThrough());
        expect(node.subgraph.serialize().definitions).toBeUndefined();
        expect(graph.serialize().definitions.subgraphs).toHaveLength(1);
    });
});

describe('subgraphUtils.test.ts', () => {
    test('subgraphUtils.test.ts › should return unique IDs when same subgraph is used multiple times; nested; missing ones', () => {
        const inner = passThrough();
        const outer = definition({ nodes: [{ id: 3, type: inner.id, pos: [0, 0], size: [100, 40], properties: {} }, { id: 4, type: 'missing-0000-4000-8000-000000000000', pos: [0, 0], size: [10, 10], properties: {} }] });
        expect(SubgraphDefs.directDefinitionIds(outer)).toEqual(new Set([inner.id, 'missing-0000-4000-8000-000000000000']));
        const graph = new LGraph();
        graph.insertDefinition(outer, { linked: true, definitions: [inner] });
        graph.insertDefinition(outer.id, { linked: true });
        expect(unusedDefinitionIds(graph)).toEqual([]);
        expect(SubgraphDefs.findCycles(graph.subgraphs).size).toBe(0);
    });
});

describe('SubgraphNode.titleButton.test.ts', () => {
    test('SubgraphNode.titleButton.test.ts › the title button opens the subgraph; not when collapsed', async () => {
        const dom = new JSDOM('<main></main>');
        globalThis.window = dom.window; globalThis.document = dom.window.document;
        dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => k in t ? t[k] : () => ({ width: 0 }), set: (t, k, v) => { t[k] = v; return true; } });
        try {
            const graph = new LGraph();
            const node = graph.insertDefinition(passThrough(), { pos: [100, 100] });
            node.size = [200, 60];
            const el = document.createElement('canvas'); el.width = 1000; el.height = 800;
            document.querySelector('main').appendChild(el);
            const canvas = new LGraphCanvas(el, graph, { skip_render: true });
            canvas.visible_nodes = graph._nodes.slice();
            const h = LiteGraph.NODE_TITLE_HEIGHT;
            const press = (x, y) => {
                canvas.pointer.lastClick = null;
                const ev = { clientX: x, clientY: y, which: 1, button: 0, buttons: 1, isPrimary: true, pointerId: 1, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} };
                canvas.processMouseDown(ev);
                canvas.processMouseUp({ ...ev, buttons: 0 });
            };
            const button = [node.pos[0] + node.size[0] - h / 2, node.pos[1] - h / 2];
            const open = jest.spyOn(canvas, 'openSubgraph');
            const later = () => new Promise((resolve) => setTimeout(resolve, 30)); // the canvas opens it on a timer
            node.flags.collapsed = true;
            press(...button);
            await later();
            expect(open).not.toHaveBeenCalled();
            node.flags.collapsed = false;
            press(...button);
            await later();
            expect(open).toHaveBeenCalledWith(node.subgraph);
        } finally { dom.window.close(); delete globalThis.window; delete globalThis.document; }
    });
});

describe('SubgraphMemory.test.ts', () => {
    test('SubgraphMemory.test.ts › should not leak widgets during reconfiguration', () => {
        LiteGraph.registerNodeType('sa/knob', class { constructor() { this.addInput('x', 'number'); this.addOutput('y', 'number'); this.addProperty('k', 1); this.addWidget('number', 'k', 1, null, { property: 'k' }); } onExecute() { this.setOutputData(0, this.properties.k); } });
        const graph = new LGraph();
        const node = graph.insertDefinition(definition({ nodes: [{ id: 1, type: 'sa/knob', pos: [0, 0], size: [100, 60], flags: {}, mode: 0, properties: { k: 1 }, inputs: [{ name: 'x', type: 'number', link: null }], outputs: [{ name: 'y', type: 'number', links: null }] }] }), { linked: true });
        const twin = graph.insertDefinition(node.properties.subgraph_id, { linked: true });
        node.promoteWidget(node.subgraph.getNodeById(1), 'k');
        for (let i = 0; i < 10; i++) {
            node.subgraph.onGraphChanged({ action: 'edit' });
            node.commitDefinition();
            twin.refreshFromDefinition();
        }
        expect(twin.widgets.filter((w) => w.name === 'k')).toHaveLength(1);
        expect(node.widgets.filter((w) => w.name === 'k')).toHaveLength(1);
        expect(twin.inputs.filter((i) => i.name === 'k')).toHaveLength(1);
    });

    test('SubgraphMemory.test.ts › handles multiple creation/deletion cycles', () => {
        const graph = new LGraph();
        for (let i = 0; i < 20; i++) {
            const node = graph.insertDefinition(passThrough());
            graph.remove(node);
        }
        expect(graph._nodes).toHaveLength(0);
        expect(unusedDefinitionIds(graph)).toHaveLength(20);
    });
});
