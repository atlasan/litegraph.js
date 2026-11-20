import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import '../src/extensions/subgraph_tools.js';

/** Components and blueprints (Wave 3c, steps 10-11). */

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('v', 'number'); this.addProperty('v', 3); } onExecute() { this.setOutputData(0, this.properties.v); } }
    class Mul { constructor() { this.addInput('x', 'number'); this.addOutput('y', 'number'); this.addProperty('k', 2); } onExecute() { this.setOutputData(0, (this.getInputData(0) ?? 0) * this.properties.k); } }
    class Sink { constructor() { this.addInput('in', 'number'); this.value = undefined; } onExecute() { this.value = this.getInputData(0); } }
    for (const [type, cls] of Object.entries({ src: Src, mul: Mul, sink: Sink })) LiteGraph.registerNodeType(`sgc/${type}`, cls);
});
beforeEach(() => { for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {}); });
afterEach(() => {
    jest.restoreAllMocks();
    LiteGraph.actionHistory_enabled = false;
    for (const type of ['sgc/times', 'sgc/outer']) {
        if (LiteGraph.registered_node_types[type]) LiteGraph.unregisterNodeType(type);
        LiteGraph.subgraph_components.delete(type);
    }
});

/** a definition [x * k] (ComfyUI shape) */
function times(k, id = 'times-0000-4000-8000-000000000001', name = 'Times') {
    return {
        id, version: 1, name, category: 'math',
        inputNode: { id: -10, bounding: [-200, 0, 120, 60] }, outputNode: { id: -20, bounding: [400, 0, 120, 60] },
        inputs: [{ id: 'in-x', name: 'x', type: 'number', linkIds: [1] }], outputs: [{ id: 'out-y', name: 'y', type: 'number', linkIds: [2] }],
        nodes: [{ id: 5, type: 'sgc/mul', pos: [0, 0], size: [140, 60], flags: {}, mode: 0, properties: { k },
            inputs: [{ name: 'x', type: 'number', link: 1 }], outputs: [{ name: 'y', type: 'number', links: [2] }] }],
        links: [{ id: 1, origin_id: -10, origin_slot: 0, target_id: 5, target_slot: 0, type: 'number' },
            { id: 2, origin_id: 5, origin_slot: 0, target_id: -20, target_slot: 0, type: 'number' }],
    };
}
const make = (graph, type, x = 0, y = 0) => { const n = LiteGraph.createNode(type); n.pos = [x, y]; graph.add(n); return n; };
const run = (graph, steps = 3) => { for (let i = 0; i < steps; i++) graph.runStep(1); };
const kOf = (node) => node.subgraph._nodes.find((n) => n.type === 'sgc/mul').properties.k;

/** src(3) -> [component] -> sink, twice */
function withTwoInstances() {
    const graph = new LGraph();
    const src = make(graph, 'sgc/src');
    const a = make(graph, 'sgc/times', 200, 0), b = make(graph, 'sgc/times', 200, 200);
    const sinkA = make(graph, 'sgc/sink', 400, 0), sinkB = make(graph, 'sgc/sink', 400, 200);
    src.connect(0, a, 0); src.connect(0, b, 0); a.connect(0, sinkA, 0); b.connect(0, sinkB, 0);
    return { graph, a, b, sinkA, sinkB };
}

describe('components', () => {
    test('a registered definition is a node type: definition, search, slots', () => {
        LiteGraph.registerSubgraphType('sgc/times', times(2), { revision: 1 });
        const def = LiteGraph.getNodeDefinition('sgc/times');
        expect(def).toEqual(expect.objectContaining({ title: 'Times', category: 'math', source: 'subgraph' }));
        expect(def.inputs).toEqual([{ name: 'x', type: 'number' }]);
        expect(LiteGraph.nodeSearch.search('times i:number').map((r) => r.type)).toContain('sgc/times');
        const node = LiteGraph.createNode('sgc/times');
        expect(node.inputs.map((i) => i.name)).toEqual(['x']);
        expect(node.outputs.map((o) => o.name)).toEqual(['y']);
        expect(node.properties.component).toEqual({ type: 'sgc/times', revision: 1 });
    });

    test('instances in a document share one definition and save as plain subgraph instances', () => {
        LiteGraph.registerSubgraphType('sgc/times', times(2), { revision: 1 });
        const { graph, a, b, sinkA, sinkB } = withTwoInstances();
        expect(a.properties.subgraph_id).toBe(b.properties.subgraph_id);
        expect(graph.subgraphs.size).toBe(1);
        run(graph);
        expect([sinkA.value, sinkB.value]).toEqual([6, 6]);
        const doc = graph.serialize({ format: 'definitions' });
        const saved = doc.nodes.filter((n) => n.properties?.component);
        expect(saved.map((n) => n.type)).toEqual([a.properties.subgraph_id, a.properties.subgraph_id]);
        expect(graph.serialize({ format: 'inline' }).nodes.find((n) => n.id === a.id).type).toBe('graph/subgraph');
        // loads where the component is not registered
        LiteGraph.unregisterNodeType('sgc/times');
        LiteGraph.subgraph_components.delete('sgc/times');
        const loaded = new LGraph();
        expect(loaded.configure(JSON.parse(JSON.stringify(doc)))).toBe(false);
        run(loaded);
        expect(loaded._nodes.filter((n) => n.type === 'sgc/sink').map((n) => n.value)).toEqual([6, 6]);
        expect(loaded.getNodeById(a.id).hasSourceUpdate()).toBe(false);
    });

    test('a newer registered revision shows an update badge; updating refreshes every instance, one undo step', () => {
        LiteGraph.registerSubgraphType('sgc/times', times(2), { revision: 1 });
        LiteGraph.actionHistory_enabled = true;
        const { graph, a, b, sinkA, sinkB } = withTwoInstances();
        graph.onGraphChanged({ action: 'baseline' });
        expect(a.hasSourceUpdate()).toBe(false);
        LiteGraph.registerSubgraphType('sgc/times', times(5), { revision: 2 });
        expect(a.hasSourceUpdate()).toBe(true);
        expect(LiteGraph.nodeBadges.collect(a).map((badge) => badge.text)).toContain('update');
        const ctx = { ...LiteGraph.commands.contextFor(null), graph, selectedNodes: [a] };
        expect(LiteGraph.commands.isEnabled('litegraph.subgraph.updateFromSource', ctx)).toBe(true);
        LiteGraph.commands.execute('litegraph.subgraph.updateFromSource', ctx);
        expect([kOf(a), kOf(b)]).toEqual([5, 5]);
        expect(a.properties.component.revision).toBe(2);
        expect(b.hasSourceUpdate()).toBe(false);
        expect(a.inputs[0].link).not.toBeNull();
        run(graph);
        expect([sinkA.value, sinkB.value]).toEqual([15, 15]);
        graph.actionHistoryBack();
        const restored = graph._nodes.filter((n) => n.properties?.component);
        expect(restored.map(kOf)).toEqual([2, 2]);
        expect(restored[0].hasSourceUpdate()).toBe(true);
    });

    test('a component that contains itself is refused', () => {
        const loop = times(2, 'loop-0000-4000-8000-000000000009');
        loop.nodes.push({ id: 6, type: loop.id, pos: [0, 100], size: [100, 40], properties: {} });
        expect(() => LiteGraph.registerSubgraphType('sgc/loop', loop)).toThrow(/contains itself/);
    });

    test('a component with a nested definition', () => {
        const inner = times(3, 'inner-0000-4000-8000-000000000002', 'Inner');
        const outer = times(2, 'outer-0000-4000-8000-000000000003', 'Outer');
        outer.nodes[0] = { ...outer.nodes[0], type: inner.id, properties: { subgraph_id: inner.id } };
        LiteGraph.registerSubgraphType('sgc/outer', outer, { definitions: [inner] });
        const graph = new LGraph();
        const src = make(graph, 'sgc/src'), node = make(graph, 'sgc/outer', 200), sink = make(graph, 'sgc/sink', 400);
        src.connect(0, node, 0); node.connect(0, sink, 0);
        run(graph, 4);
        expect(sink.value).toBe(9);
        expect([...graph.subgraphs.keys()].sort()).toEqual([inner.id, outer.id].sort());
    });
});

describe('blueprints', () => {
    test('insert a copy, or linked; copies get a new id', () => {
        const graph = new LGraph();
        const copy = graph.insertDefinition(times(4), { pos: [10, 20] });
        expect(copy.properties.subgraph_id).not.toBe(times(4).id);
        expect(Array.from(copy.pos)).toEqual([10, 20]);
        expect(kOf(copy)).toBe(4);
        expect(copy.title).toBe('Times');
        const linked = graph.insertDefinition(copy.properties.subgraph_id, { linked: true });
        expect(linked.properties.subgraph_id).toBe(copy.properties.subgraph_id);
        const second = graph.insertDefinition(copy.properties.subgraph_id); // a copy of a document definition
        expect(second.properties.subgraph_id).not.toBe(copy.properties.subgraph_id);
        expect(graph.subgraphs.size).toBe(2);
        expect(() => graph.insertDefinition('missing', { linked: true })).toThrow(/no definition/);
    });

    test('a blueprint document: identical nested definitions are shared, differing ones get new ids', () => {
        const graph = new LGraph();
        const inner = times(3, 'inner-0000-4000-8000-000000000002', 'Inner');
        graph.insertDefinition(inner, { linked: true }); // the document already has Inner
        const outer = times(2, 'outer-0000-4000-8000-000000000003', 'Outer');
        outer.nodes[0] = { ...outer.nodes[0], type: inner.id, properties: { subgraph_id: inner.id } };
        const file = { nodes: [{ id: 1, type: outer.id, pos: [0, 0], size: [100, 40], properties: {} }], links: [],
            definitions: { subgraphs: [outer, graph.subgraphs.get(inner.id)] } };
        const node = graph.insertBlueprint(JSON.parse(JSON.stringify(file)));
        const copied = graph.subgraphs.get(node.properties.subgraph_id);
        expect(copied.nodes[0].type).toBe(inner.id); // shared
        const changed = JSON.parse(JSON.stringify(file));
        changed.definitions.subgraphs[1].nodes[0].properties.k = 7;
        const other = graph.insertBlueprint(changed);
        const otherDef = graph.subgraphs.get(other.properties.subgraph_id);
        expect(otherDef.nodes[0].type).not.toBe(inner.id);
        expect(graph.subgraphs.get(otherDef.nodes[0].type).nodes[0].properties.k).toBe(7);
        expect(graph.subgraphs.get(inner.id).nodes[0].properties.k).toBe(3); // untouched
    });

    test('the canvas menu lists the document definitions to insert', () => {
        const dom = new JSDOM('<main></main>');
        globalThis.window = dom.window; globalThis.document = dom.window.document;
        dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => k in t ? t[k] : () => ({ width: 0 }), set: (t, k, v) => { t[k] = v; return true; } });
        const original = LiteGraph.ContextMenu;
        try {
            const graph = new LGraph();
            const el = document.createElement('canvas'); document.querySelector('main').appendChild(el);
            const canvas = new LGraphCanvas(el, graph, { skip_render: true });
            expect(canvas.getCanvasMenuOptions().some((o) => o?.content === 'Insert subgraph')).toBe(false);
            const first = graph.insertDefinition(times(2));
            const entry = canvas.getCanvasMenuOptions().find((o) => o?.content === 'Insert subgraph');
            let captured;
            LiteGraph.ContextMenu = (options, settings) => { captured = { options, settings }; return {}; };
            LGraphCanvas.active_canvas = canvas;
            entry.callback(null, {}, {}, null);
            expect(captured.options.map((o) => o.content)).toEqual(['Times', 'Times (copy)']);
            captured.settings.callback(captured.options[0]);
            expect(graph._nodes.filter((n) => n.properties?.subgraph_id === first.properties.subgraph_id).length).toBe(2);
        } finally { LiteGraph.ContextMenu = original; dom.window.close(); delete globalThis.window; delete globalThis.document; }
    });
});
