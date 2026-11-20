import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('v', 'number'); this.addProperty('v', 3); } onExecute() { this.setOutputData(0, this.properties.v); } }
    class Double { constructor() { this.addInput('x', 'number'); this.addOutput('y', 'number'); } onExecute() { this.setOutputData(0, (this.getInputData(0) ?? 0) * 2); } }
    class Add { constructor() { this.addInput('a', 'number'); this.addInput('b', 'number'); this.addOutput('sum', 'number'); } onExecute() { this.setOutputData(0, (this.getInputData(0) ?? 0) + (this.getInputData(1) ?? 0)); } }
    class Sink { constructor() { this.addInput('in', 'number'); this.value = undefined; } onExecute() { this.value = this.getInputData(0); } }
    class Ev { constructor() { this.addOutput('ev', LiteGraph.EVENT); } }
    class Act { constructor() { this.addInput('do', LiteGraph.ACTION); } }
    for (const [type, cls] of Object.entries({ src: Src, double: Double, add: Add, sink: Sink, ev: Ev, act: Act })) LiteGraph.registerNodeType(`sga/${type}`, cls);
    jest.spyOn(console, 'info').mockImplementation(() => {});
});

const make = (graph, type, x = 0) => { const n = LiteGraph.createNode(`sga/${type}`); n.pos = [x, 0]; graph.add(n); return n; };
const run = (graph, steps = 3) => { for (let i = 0; i < steps; i++) graph.runStep(1); };

test('convert keeps the data flowing: src -> [double] -> sink', () => {
    const graph = new LGraph();
    const src = make(graph, 'src'), dbl = make(graph, 'double', 200), sink = make(graph, 'sink', 400);
    src.connect(0, dbl, 0); dbl.connect(0, sink, 0);
    run(graph); expect(sink.value).toBe(6);
    const sub = graph.convertToSubgraph([dbl]);
    expect(sub.type).toBe('graph/subgraph');
    expect(graph.getNodeById(dbl.id)).toBeFalsy(); // the original left the graph
    expect(sub.inputs.map((i) => i.name)).toEqual(['x']);
    expect(sub.outputs.map((o) => o.name)).toEqual(['y']);
    const inner = sub.subgraph;
    expect(inner._nodes.map((n) => n.type).sort()).toEqual(['graph/input', 'graph/output', 'sga/double']);
    expect(graph.validateLinks().ok).toBe(true);
    expect(inner.validateLinks().ok).toBe(true);
    sink.value = undefined;
    src.properties.v = 5;
    run(graph);
    expect(sink.value).toBe(10);
});

test('one input per outside source (fan-out), internal links kept, names made unique', () => {
    const graph = new LGraph();
    const src = make(graph, 'src'), d1 = make(graph, 'double', 200), d2 = make(graph, 'double', 200), add = make(graph, 'add', 400), sink = make(graph, 'sink', 600);
    const other = make(graph, 'src'); other.properties.v = 1;
    src.connect(0, d1, 0); src.connect(0, d2, 0); // same source feeds two inner nodes
    d1.connect(0, add, 0); d2.connect(0, add, 1);  // internal links
    add.connect(0, sink, 0);
    run(graph); expect(sink.value).toBe(12);
    const sub = graph.convertToSubgraph([d1, d2, add]);
    expect(sub.inputs.map((i) => i.name)).toEqual(['x']);
    expect(Object.keys(sub.subgraph.links)).toHaveLength(2 + 2 + 1); // 2 internal + input fan-out 2 + output 1
    sink.value = undefined; run(graph); expect(sink.value).toBe(12);
    // two different sources into same-named inputs -> unique names
    const g2 = new LGraph();
    const a = make(g2, 'src'), b = make(g2, 'src'), x1 = make(g2, 'double', 200), x2 = make(g2, 'double', 200);
    a.connect(0, x1, 0); b.connect(0, x2, 0);
    const sub2 = g2.convertToSubgraph([x1, x2]);
    expect(sub2.inputs.map((i) => i.name)).toEqual(['x', 'x_2']);
    expect(sub2.outputs).toEqual([]); // nothing outside reads them
    void other;
});

test('event links become event ports', () => {
    const graph = new LGraph();
    const ev = make(graph, 'ev'), act = make(graph, 'act', 200);
    ev.connect(0, act, 0);
    const sub = graph.convertToSubgraph([act]);
    expect(sub.inputs[0].type).toBe(LiteGraph.EVENT);
    const io = sub.subgraph._nodes.find((n) => n.type === 'graph/input');
    expect(io.outputs[0].type).toBe(LiteGraph.EVENT);
    expect(sub.inputs[0].link).not.toBeNull();
});

test('unpack restores the nodes with their connections; pass-through links are bridged', () => {
    const graph = new LGraph();
    const src = make(graph, 'src'), dbl = make(graph, 'double', 200), sink = make(graph, 'sink', 400);
    src.connect(0, dbl, 0); dbl.connect(0, sink, 0);
    const sub = graph.convertToSubgraph([dbl]);
    const nodes = graph.unpackSubgraph(sub);
    expect(nodes.map((n) => n.type)).toEqual(['sga/double']);
    expect(graph.getNodeById(sub.id)).toBeFalsy();
    expect(graph._nodes.map((n) => n.type).sort()).toEqual(['sga/double', 'sga/sink', 'sga/src']);
    expect(graph.validateLinks().ok).toBe(true);
    run(graph); expect(sink.value).toBe(6);
    // a subgraph whose input goes straight to its output
    const g2 = new LGraph();
    const s2 = make(g2, 'src'), d2 = make(g2, 'double', 200), k2 = make(g2, 'sink', 400);
    s2.connect(0, d2, 0); d2.connect(0, k2, 0);
    const sub2 = g2.convertToSubgraph([d2]);
    const inner = sub2.subgraph;
    const innerDouble = inner._nodes.find((n) => n.type === 'sga/double');
    inner.remove(innerDouble);
    inner._nodes.find((n) => n.type === 'graph/input').connect(0, inner._nodes.find((n) => n.type === 'graph/output'), 0);
    expect(g2.unpackSubgraph(sub2)).toEqual([]);
    expect(k2.getInputNode(0)).toBe(s2); // bridged
});

test('convert and unpack are one undo step each', () => {
    const graph = new LGraph();
    const prev = LiteGraph.actionHistory_enabled;
    LiteGraph.actionHistory_enabled = true;
    try {
        let src, dbl, sink;
        graph.transact('setup', () => {
            src = make(graph, 'src'); dbl = make(graph, 'double', 200); sink = make(graph, 'sink', 400);
            src.connect(0, dbl, 0); dbl.connect(0, sink, 0);
        });
        graph.convertToSubgraph([dbl]);
        expect(graph._nodes.map((n) => n.type).sort()).toEqual(['graph/subgraph', 'sga/sink', 'sga/src']);
        graph.actionHistoryBack();
        expect(graph._nodes.map((n) => n.type).sort()).toEqual(['sga/double', 'sga/sink', 'sga/src']);
        expect(graph.validateLinks().ok).toBe(true);
    } finally { LiteGraph.actionHistory_enabled = prev; }
});

test('a failing conversion leaves the graph as it was (rollback)', () => {
    const graph = new LGraph();
    const src = make(graph, 'src'), dbl = make(graph, 'double', 200);
    src.connect(0, dbl, 0);
    const before = JSON.stringify(graph.serialize().nodes.map((n) => n.type));
    const original = LiteGraph.createNode.bind(LiteGraph);
    const spy = jest.spyOn(LiteGraph, 'createNode').mockImplementation((type, ...rest) => type === 'sga/double' ? null : original(type, ...rest));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => graph.convertToSubgraph([dbl])).toThrow(/cannot create a node of type sga\/double/);
    spy.mockRestore();
    expect(JSON.stringify(graph.serialize().nodes.map((n) => n.type))).toBe(before);
    expect(graph._nodes.some((n) => n.type === 'graph/subgraph')).toBe(false); // no orphan (B3)
});
