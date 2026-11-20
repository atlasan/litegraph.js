import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { SubgraphDefs } from '../src/subgraphdefs.js';

/** Linked subgraph instances (Wave 3a, step 3): commit, refresh, make unique, paste. */

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('v', 'number'); this.addProperty('v', 3); } onExecute() { this.setOutputData(0, this.properties.v); } }
    class Mul { constructor() { this.addInput('x', 'number'); this.addOutput('y', 'number'); this.addProperty('k', 2); } onExecute() { this.setOutputData(0, (this.getInputData(0) ?? 0) * this.properties.k); } }
    class Add { constructor() { this.addInput('a', 'number'); this.addInput('b', 'number'); this.addOutput('sum', 'number'); } onExecute() { this.setOutputData(0, (this.getInputData(0) ?? 0) + (this.getInputData(1) ?? 0)); } }
    class Sink { constructor() { this.addInput('in', 'number'); this.value = undefined; } onExecute() { this.value = this.getInputData(0); } }
    for (const [type, cls] of Object.entries({ src: Src, mul: Mul, add: Add, sink: Sink })) LiteGraph.registerNodeType(`sgl/${type}`, cls);
});
beforeEach(() => { for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {}); });
afterEach(() => { jest.restoreAllMocks(); LiteGraph.actionHistory_enabled = false; LiteGraph.settings.set?.('LiteGraph.Subgraph.PasteLinked', true); });

const make = (graph, type, x = 0, y = 0) => { const n = LiteGraph.createNode(`sgl/${type}`); n.pos = [x, y]; graph.add(n); return n; };
const run = (graph, steps = 3) => { for (let i = 0; i < steps; i++) graph.runStep(1); };
const inner = (sub, type) => sub.subgraph._nodes.find((n) => n.type === type);

/** two sources, each through a linked instance of [x * k] into its own sink */
function twins() {
    const graph = new LGraph();
    const a = make(graph, 'src', 0, 0), b = make(graph, 'src', 0, 200);
    a.properties.v = 5; b.properties.v = 7;
    const mul = make(graph, 'mul', 200, 0);
    const sinkA = make(graph, 'sink', 500, 0), sinkB = make(graph, 'sink', 500, 200);
    a.connect(0, mul, 0); mul.connect(0, sinkA, 0);
    const first = graph.convertToSubgraph([mul]);
    graph.serialize(); // registers the definition
    const second = first.clone();
    second.pos = [200, 200];
    graph.add(second);
    b.connect(0, second, 0); second.connect(0, sinkB, 0);
    return { graph, first, second, sinkA, sinkB };
}

describe('linked instances', () => {
    test('a clone shares the definition and the document stores it once', () => {
        const { graph, first, second, sinkA, sinkB } = twins();
        expect(second.properties.subgraph_id).toBe(first.properties.subgraph_id);
        expect(graph.findSubgraphInstances(first.properties.subgraph_id)).toEqual([first, second]);
        run(graph);
        expect([sinkA.value, sinkB.value]).toEqual([10, 14]);
        expect(graph.serialize({ format: 'definitions' }).definitions.subgraphs.length).toBe(1);
    });

    test('commit: an edit in one instance reaches the other; outer links stay', () => {
        const { graph, first, second, sinkA, sinkB } = twins();
        inner(first, 'sgl/mul').properties.k = 10;
        first.subgraph.onGraphChanged({ action: 'edit' });
        expect(first.commitDefinition()).toBe(true);
        expect(inner(second, 'sgl/mul').properties.k).toBe(10);
        expect(second.inputs[0].link).not.toBeNull();
        expect(second.outputs[0].links.length).toBe(1);
        run(graph);
        expect([sinkA.value, sinkB.value]).toEqual([50, 70]);
        expect(first.getDefinition().revision).toBeGreaterThanOrEqual(1);
        expect(first.commitDefinition()).toBe(false); // nothing new
    });

    test('commit is one root undo step that restores both instances', () => {
        LiteGraph.actionHistory_enabled = true;
        const { graph, first, second, sinkA, sinkB } = twins();
        graph.onGraphChanged({ action: 'baseline' }); // history has no empty baseline
        inner(first, 'sgl/mul').properties.k = 4;
        first.commitDefinition();
        run(graph);
        expect([sinkA.value, sinkB.value]).toEqual([20, 28]);
        graph.actionHistoryBack();
        const [one, two] = graph._nodes.filter((n) => n.type === 'graph/subgraph');
        expect([inner(one, 'sgl/mul').properties.k, inner(two, 'sgl/mul').properties.k]).toEqual([2, 2]);
        expect(graph.subgraphs.get(one.properties.subgraph_id).nodes[0].properties.k).toBe(2);
        run(graph);
        expect(graph._nodes.filter((n) => n.type === 'sgl/sink').map((n) => n.value)).toEqual([10, 14]);
    });

    test('renaming an interface input keeps the other instance\'s outer link', () => {
        const { graph, first, second, sinkB } = twins();
        inner(first, 'graph/input').setProperty('name', 'amount');
        first.commitDefinition();
        expect(second.inputs.map((i) => i.name)).toEqual(['amount']);
        expect(second.inputs[0].link).not.toBeNull();
        run(graph);
        expect(sinkB.value).toBe(14);
    });

    test('refresh follows a reordered interface by slot id and remaps outer links', () => {
        const graph = new LGraph();
        const a = make(graph, 'src', 0, 0), b = make(graph, 'src', 0, 100);
        a.properties.v = 1; b.properties.v = 100;
        const add = make(graph, 'add', 200, 0), sink = make(graph, 'sink', 400, 0);
        a.connect(0, add, 0); b.connect(0, add, 1); add.connect(0, sink, 0);
        const sub = graph.convertToSubgraph([add]);
        graph.serialize();
        const id = sub.properties.subgraph_id;
        const definition = LiteGraph.cloneObject(graph.subgraphs.get(id));
        const [first, second] = definition.inputs;
        definition.inputs = [second, first];
        for (const link of definition.links) if (link.origin_id === -10) link.origin_slot = 1 - link.origin_slot;
        graph.subgraphs.set(id, definition);
        sub.refreshFromDefinition();
        expect(sub.inputs.map((i) => i.name)).toEqual([second.name, first.name]);
        expect(graph.links[sub.inputs[0].link].origin_id).toBe(b.id);
        expect(graph.links[sub.inputs[0].link].target_slot).toBe(0);
        run(graph);
        expect(sink.value).toBe(101);
        expect(graph.validateLinks().ok).toBe(true);
    });

    test('make unique: a new definition; edits no longer reach the other', () => {
        const { graph, first, second, sinkA, sinkB } = twins();
        const id = first.properties.subgraph_id;
        const fresh = second.makeUnique();
        expect(fresh).not.toBe(id);
        expect(graph.subgraphs.has(fresh)).toBe(true);
        inner(first, 'sgl/mul').properties.k = 3;
        first.commitDefinition();
        run(graph);
        expect([sinkA.value, sinkB.value]).toEqual([15, 14]);
        expect(graph.serialize({ format: 'definitions' }).definitions.subgraphs.length).toBe(2);
    });
});

describe('paste and save', () => {
    test('pasting the same content links; different content under the same id forks', () => {
        const { graph, first } = twins();
        const forks = [];
        graph.events.on('subgraph-forked', (e) => forks.push(e.detail));
        const data = LiteGraph.cloneObject(first.serialize());
        delete data.id;
        const same = LiteGraph.createNode('graph/subgraph'); same.configure(LiteGraph.cloneObject(data)); graph.add(same);
        expect(same.properties.subgraph_id).toBe(first.properties.subgraph_id);
        data.subgraph.nodes.find((n) => n.type === 'sgl/mul').properties.k = 9; // another document's edit
        const other = LiteGraph.createNode('graph/subgraph'); other.configure(data); graph.add(other);
        expect(other.properties.subgraph_id).not.toBe(first.properties.subgraph_id);
        expect(graph.subgraphs.get(other.properties.subgraph_id).nodes[0].properties.k).toBe(9);
        expect(graph.subgraphs.get(first.properties.subgraph_id).nodes[0].properties.k).toBe(2);
        expect(forks).toEqual([expect.objectContaining({ from: first.properties.subgraph_id, to: other.properties.subgraph_id })]);
    });

    test('with LiteGraph.Subgraph.PasteLinked off, a clone is a copy', () => {
        const { first } = twins();
        LiteGraph.settings.set('LiteGraph.Subgraph.PasteLinked', false);
        expect(first.clone().properties.subgraph_id).not.toBe(first.properties.subgraph_id);
    });

    test('an edit made by code without a commit is saved', () => {
        const { graph, first } = twins();
        inner(first, 'sgl/mul').properties.k = 6;
        first.subgraph.onGraphChanged({ action: 'edit' }); // a user-level change bumps the revision
        const doc = graph.serialize({ format: 'definitions' });
        expect(doc.definitions.subgraphs[0].nodes[0].properties.k).toBe(6);
        // without a revision change (execution state), the registry wins
        inner(first, 'sgl/mul').properties.k = 8;
        expect(graph.serialize({ format: 'definitions' }).definitions.subgraphs[0].nodes[0].properties.k).toBe(6);
        expect(SubgraphDefs.canonical(doc.definitions.subgraphs[0])).toBe(SubgraphDefs.canonical(graph.subgraphs.get(first.properties.subgraph_id)));
    });
});

test('leaving a subgraph on the canvas commits it to the linked instances', () => {
    const dom = new JSDOM('<main></main>');
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
        get: (target, k) => k in target ? target[k] : () => ({ width: 0 }),
        set: (target, k, v) => { target[k] = v; return true; },
    });
    try {
        const { graph, first, second } = twins();
        const el = document.createElement('canvas');
        document.querySelector('main').appendChild(el);
        const canvas = new LGraphCanvas(el, graph, { skip_render: true });
        canvas.openSubgraph(first.subgraph);
        inner(first, 'sgl/mul').properties.k = 5;
        canvas.closeSubgraph();
        expect(canvas.graph).toBe(graph);
        expect(inner(second, 'sgl/mul').properties.k).toBe(5);
    } finally {
        dom.window.close(); delete globalThis.window; delete globalThis.document;
    }
});
