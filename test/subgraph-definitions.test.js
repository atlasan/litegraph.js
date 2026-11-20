import { jest } from '@jest/globals';
import fs from 'node:fs';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { SubgraphDefs } from '../src/subgraphdefs.js';

/**
 * Subgraph definitions (Wave 3a, steps 1-2): the ComfyUI document form (definitions.subgraphs,
 * -10/-20 links, stable slot ids) on top of the nested runtime.
 * The SA fixture set is adapted from Comfy-Org/litegraph.js @ ea0e1a8 (MIT),
 * test/subgraph/fixtures/testSubgraphs.json.
 */

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('v', 'number'); this.addProperty('v', 3); } onExecute() { this.setOutputData(0, this.properties.v); } }
    class Double { constructor() { this.addInput('x', 'number'); this.addOutput('y', 'number'); } onExecute() { this.setOutputData(0, (this.getInputData(0) ?? 0) * 2); } }
    class Sink { constructor() { this.addInput('in', 'number'); this.value = undefined; } onExecute() { this.value = this.getInputData(0); } }
    class Ev { constructor() { this.addOutput('ev', LiteGraph.EVENT); } fire(v) { this.triggerSlot(0, v); } }
    class Act { constructor() { this.addInput('do', LiteGraph.ACTION); this.calls = []; } onAction(name, param) { this.calls.push(param); } }
    for (const [type, cls] of Object.entries({ src: Src, double: Double, sink: Sink, ev: Ev, act: Act })) LiteGraph.registerNodeType(`sgd/${type}`, cls);
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => { LiteGraph.subgraph_format = 'definitions'; });

const make = (graph, type, x = 0) => { const n = LiteGraph.createNode(`sgd/${type}`); n.pos = [x, 0]; graph.add(n); return n; };
const run = (graph, steps = 3) => { for (let i = 0; i < steps; i++) graph.runStep(1); };
const reload = (data) => { const graph = new LGraph(); const error = graph.configure(JSON.parse(JSON.stringify(data))); return { graph, error }; };
const byType = (graph, type) => graph._nodes.filter((n) => n.type === type);

/** src -> [double] -> sink, with the middle converted to a subgraph */
function doubled() {
    const graph = new LGraph();
    const src = make(graph, 'src'), dbl = make(graph, 'double', 200), sink = make(graph, 'sink', 400);
    src.connect(0, dbl, 0); dbl.connect(0, sink, 0);
    const sub = graph.convertToSubgraph([dbl]);
    return { graph, src, sub, sink };
}

describe('document form', () => {
    test('an instance becomes a reference; the definition has -10/-20 links and slot ids', () => {
        const { graph, sub } = doubled();
        const doc = graph.serialize({ format: 'definitions' });
        const instance = doc.nodes.find((n) => n.id === sub.id);
        const id = sub.properties.subgraph_id;
        expect(instance.type).toBe(id);
        expect(instance.subgraph).toBeUndefined();
        expect(doc.definitions.subgraphs.map((d) => d.id)).toEqual([id]);
        const def = doc.definitions.subgraphs[0];
        expect(def.version).toBe(1);
        expect(def.nodes.map((n) => n.type)).toEqual(['sgd/double']); // IO nodes are not stored
        expect(def.inputs).toEqual([expect.objectContaining({ name: 'x', type: 'number', linkIds: [expect.any(Number)] })]);
        expect(def.outputs).toEqual([expect.objectContaining({ name: 'y', type: 'number' })]);
        const ioIn = sub.subgraph._nodes.find((n) => n.type === 'graph/input');
        expect(def.inputs[0].id).toBe(ioIn.properties.slot_id);
        expect(def.links.some((l) => l.origin_id === -10 && l.origin_slot === 0)).toBe(true);
        expect(def.links.some((l) => l.target_id === -20 && l.target_slot === 0)).toBe(true);
        expect(def.inputNode).toEqual({ id: -10, bounding: expect.any(Array) });
    });

    test('save, reload, save: same result, same execution, stable ids', () => {
        const { graph, src, sink } = doubled();
        src.properties.v = 7;
        run(graph);
        expect(sink.value).toBe(14);
        const first = graph.serialize({ format: 'definitions' });
        const { graph: loaded, error } = reload(first);
        expect(error).toBe(false);
        const sub = byType(loaded, 'graph/subgraph')[0];
        expect(sub.properties.subgraph_id).toBe(first.definitions.subgraphs[0].id);
        expect(sub.subgraph._nodes.map((n) => n.id).sort((a, b) => a - b)).toEqual([-2000, -1000, first.definitions.subgraphs[0].nodes[0].id]);
        run(loaded);
        expect(byType(loaded, 'sgd/sink')[0].value).toBe(14);
        const second = loaded.serialize({ format: 'definitions' });
        expect(SubgraphDefs.canonical(second.definitions.subgraphs[0])).toBe(SubgraphDefs.canonical(first.definitions.subgraphs[0]));
        expect(second.nodes).toEqual(first.nodes);
    });

    test('inline format keeps inner graphs for older readers and also writes the registry', () => {
        const { graph, sub } = doubled();
        LiteGraph.subgraph_format = 'inline';
        const doc = graph.serialize();
        const instance = doc.nodes.find((n) => n.id === sub.id);
        expect(instance.type).toBe('graph/subgraph');
        expect(instance.subgraph.nodes.length).toBe(3);
        expect(doc.definitions.subgraphs[0].id).toBe(sub.properties.subgraph_id);
        LiteGraph.subgraph_format = 'definitions'; // the default
        expect(graph.serialize().nodes.find((n) => n.id === sub.id).type).toBe(sub.properties.subgraph_id);
    });

    test('event ports: written as "event" with litegraph_type, events still cross after reload', () => {
        const graph = new LGraph();
        const ev = make(graph, 'ev'), act = make(graph, 'act', 300);
        ev.connect(0, act, 0);
        graph.convertToSubgraph([act]);
        const doc = graph.serialize({ format: 'definitions' });
        expect(doc.definitions.subgraphs[0].inputs[0]).toEqual(expect.objectContaining({ type: 'event', litegraph_type: LiteGraph.EVENT }));
        const { graph: loaded } = reload(doc);
        const inner = byType(loaded, 'graph/subgraph')[0].subgraph;
        byType(loaded, 'sgd/ev')[0].fire('ping');
        loaded.runStep(1); // events into a node with onExecute are deferred to the next step
        expect(byType(inner, 'sgd/act')[0].calls).toEqual(['ping']);
    });

    test('nested subgraphs are flattened into the root list and run after reload', () => {
        const { graph, src, sub, sink } = doubled();
        const innerDouble = byType(sub.subgraph, 'sgd/double')[0];
        const nested = sub.subgraph.convertToSubgraph([innerDouble]);
        src.properties.v = 4;
        run(graph, 4);
        expect(sink.value).toBe(8);
        const doc = graph.serialize({ format: 'definitions' });
        const ids = doc.definitions.subgraphs.map((d) => d.id).sort();
        expect(ids).toEqual([sub.properties.subgraph_id, nested.properties.subgraph_id].sort());
        const outer = doc.definitions.subgraphs.find((d) => d.id === sub.properties.subgraph_id);
        expect(outer.nodes.map((n) => n.type)).toEqual([nested.properties.subgraph_id]);
        const { graph: loaded } = reload(doc);
        run(loaded, 4);
        expect(byType(loaded, 'sgd/sink')[0].value).toBe(8);
        expect(loaded.subgraphs.size).toBe(2);
    });

    test('linked instances share one definition; unused definitions are kept', () => {
        const { graph, sub } = doubled();
        const twin = sub.clone();
        graph.add(twin);
        expect(twin.properties.subgraph_id).toBe(sub.properties.subgraph_id);
        graph.subgraphs.set('unused-1', { id: 'unused-1', name: 'Unused', nodes: [], links: [], inputs: [], outputs: [] });
        const doc = graph.serialize({ format: 'definitions' });
        expect(doc.definitions.subgraphs.map((d) => d.id).sort()).toEqual([sub.properties.subgraph_id, 'unused-1'].sort());
        expect(doc.nodes.filter((n) => n.type === sub.properties.subgraph_id).length).toBe(2);
        const { graph: loaded } = reload(doc);
        expect(byType(loaded, 'graph/subgraph').length).toBe(2);
        expect(loaded.subgraphs.has('unused-1')).toBe(true);
    });

    test('a document saved before definitions loads and gets a registry entry', () => {
        const { graph, sub } = doubled();
        const old = graph.serialize({ format: 'inline' });
        delete old.definitions;
        const instance = old.nodes.find((n) => n.id === sub.id);
        delete instance.properties.subgraph_id;
        instance.subgraph.nodes.forEach((n) => delete n.properties.slot_id);
        const { graph: loaded, error } = reload(old);
        expect(error).toBe(false);
        const node = byType(loaded, 'graph/subgraph')[0];
        expect(typeof node.properties.subgraph_id).toBe('string');
        expect(loaded.subgraphs.has(node.properties.subgraph_id)).toBe(true);
        expect(node.subgraph._nodes.every((n) => !n.type.startsWith('graph/') || typeof n.properties.slot_id === 'string')).toBe(true);
    });
});

describe('loading definitions', () => {
    const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/sa-subgraphs.json', import.meta.url), 'utf8'));
    const host = (definition, extra = []) => ({
        nodes: [{ id: 1, type: definition.id, pos: [0, 0], size: [140, 60], flags: {}, mode: 0, inputs: [], outputs: [], properties: {} }, ...extra],
        links: [], definitions: { subgraphs: [definition] },
    });

    test.each(Object.keys(fixtures))('SA fixture %s loads as an instance with its interface', (name) => {
        const definition = fixtures[name];
        const { graph } = reload(host(definition));
        const node = byType(graph, 'graph/subgraph')[0];
        expect(node).toBeTruthy();
        expect(node.properties.subgraph_id).toBe(definition.id);
        expect(byType(node.subgraph, 'graph/input').map((n) => n.properties.name)).toEqual(definition.inputs.map((i) => i.name));
        expect(byType(node.subgraph, 'graph/output').map((n) => n.properties.name)).toEqual(definition.outputs.map((o) => o.name));
        expect(graph.subgraphs.size).toBe(1 + (definition.definitions?.subgraphs?.length ?? 0));
        // unknown inner node types are kept (error nodes) and written back
        const saved = graph.serialize({ format: 'definitions' });
        expect(saved.definitions.subgraphs.find((d) => d.id === definition.id).nodes.map((n) => n.type)).toEqual(definition.nodes.map((n) => n.type));
    });

    test('a definition that contains itself loads as an error node, keeping its data', () => {
        const loop = { id: 'loop-1', name: 'Loop', nodes: [{ id: 5, type: 'loop-1', pos: [0, 0], size: [100, 40], properties: {} }], links: [], inputs: [], outputs: [] };
        const { graph, error } = reload(host(loop));
        expect(error).toBe(true);
        const inner = byType(graph, 'graph/subgraph')[0].subgraph;
        expect(inner._nodes[0].has_errors).toBe(true);
        expect(SubgraphDefs.findCycles(graph.subgraphs)).toEqual(new Set(['loop-1']));
        expect(graph.serialize({ format: 'definitions' }).definitions.subgraphs[0].nodes[0].type).toBe('loop-1');
    });

    test('pure transforms: toInline then toDefinitions gives back the same document', () => {
        const { graph } = doubled();
        const doc = graph.serialize({ format: 'definitions' });
        const inline = SubgraphDefs.toInline(doc);
        expect(inline.errors).toEqual([]);
        expect(inline.doc.nodes.find((n) => n.type === 'graph/subgraph').subgraph.nodes.length).toBe(3);
        const again = SubgraphDefs.toDefinitions(inline.doc);
        expect(again.nodes).toEqual(doc.nodes);
        expect(SubgraphDefs.canonical(again.definitions.subgraphs[0])).toBe(SubgraphDefs.canonical(doc.definitions.subgraphs[0]));
    });
});
