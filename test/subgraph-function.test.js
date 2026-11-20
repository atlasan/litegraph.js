import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { NodeFunction } from '../src/subgraph.js';

/** graph/function on subgraph definitions (Wave 3a, step 4). */

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('v', 'number'); this.addProperty('v', 3); } onExecute() { this.setOutputData(0, this.properties.v); } }
    class Acc { constructor() { this.addInput('x', 'number'); this.addOutput('total', 'number'); this.total = 0; } onExecute() { this.total += this.getInputData(0) ?? 0; this.setOutputData(0, this.total); } }
    class Sink { constructor() { this.addInput('in', 'number'); this.value = undefined; } onExecute() { this.value = this.getInputData(0); } }
    class Ev { constructor() { this.addOutput('ev', LiteGraph.EVENT); } fire(v) { this.triggerSlot(0, v); } }
    class Relay { constructor() { this.addInput('in', LiteGraph.ACTION); this.addOutput('out', LiteGraph.EVENT); } onAction(_a, param) { this.triggerSlot(0, `relayed ${param}`); } }
    class Log { constructor() { this.addInput('do', LiteGraph.ACTION); this.calls = []; } onAction(_a, param) { this.calls.push(param); } }
    for (const [type, cls] of Object.entries({ src: Src, acc: Acc, sink: Sink, ev: Ev, relay: Relay, log: Log })) LiteGraph.registerNodeType(`sgf/${type}`, cls);
});
beforeEach(() => { for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {}); });
afterEach(() => { jest.restoreAllMocks(); NodeFunction._depth = 0; });

const make = (graph, type, x = 0, y = 0) => { const n = LiteGraph.createNode(type.includes('/') ? type : `sgf/${type}`); n.pos = [x, y]; graph.add(n); return n; };

/** a graph with an accumulator subgraph [x -> acc -> total] and its definition registered */
function withAccumulator() {
    const graph = new LGraph();
    const src = make(graph, 'src'), acc = make(graph, 'acc', 200), sink = make(graph, 'sink', 400);
    src.connect(0, acc, 0); acc.connect(0, sink, 0);
    const sub = graph.convertToSubgraph([acc]);
    graph.serialize(); // registers it
    return { graph, src, sub, sink, id: sub.properties.subgraph_id };
}

function callable(graph, id, x = 0, y = 300) {
    const fn = make(graph, 'graph/function', x, y);
    expect(fn.setDefinition(id)).toBe(true);
    return fn;
}

test('one definition used by a subgraph node and two function nodes, each with its own state', () => {
    const { graph, src, sub, id } = withAccumulator();
    const f1 = callable(graph, id), f2 = callable(graph, id, 300);
    expect(f1.inputs.map((i) => i.name)).toEqual(['call', 'x']);
    expect(f1.outputs.map((o) => o.name)).toEqual(['done', 'total']);
    expect(f1.title).toBe(sub.getDefinition().name);
    src.connect(0, f1, 1); src.connect(0, f2, 1);
    const sinkTotal = make(graph, 'sink', 600, 300); f1.connect(1, sinkTotal, 0);
    graph.runStep(1); // ordinary steps do not run the functions
    expect(f1.getOutputData(1)).toBeUndefined();
    f1.call(); f1.call(); f2.call();
    expect(f1.getOutputData(1)).toBe(6);
    expect(f2.getOutputData(1)).toBe(3);
    expect(graph.findSubgraphInstances(id)).toEqual([sub, f1, f2]);
});

test('call pushes inputs, runs, pulls outputs, then fires done', () => {
    const { graph, src, id } = withAccumulator();
    const fn = callable(graph, id);
    src.connect(0, fn, 1);
    const log = make(graph, 'log', 400, 300);
    fn.connect(0, log, 0);
    log.onAction = () => log.calls.push(fn.getOutputData(1)); // the output is ready when done fires
    graph.runStep(1);
    fn.actionDo('call', null, {});
    graph.runStep(1); // deliveries to nodes with onExecute are deferred to the next step
    expect(log.calls).toEqual([3]);
});

test('inner event outputs and event inputs pass through a function', () => {
    const graph = new LGraph();
    const ev = make(graph, 'ev'), relay = make(graph, 'relay', 200), log = make(graph, 'log', 400);
    ev.connect(0, relay, 0); relay.connect(0, log, 0);
    const sub = graph.convertToSubgraph([relay]);
    graph.serialize();
    const fn = callable(graph, sub.properties.subgraph_id);
    const eventIn = fn.findInputSlot(sub.inputs[0].name), eventOut = fn.findOutputSlot(sub.outputs[0].name);
    const log2 = make(graph, 'log', 600, 300);
    fn.connect(eventOut, log2, 0);
    fn.actionDo(fn.inputs[eventIn].name, 'ping', {});
    expect(log2.calls).toEqual(['relayed ping']);
});

test('a function cannot call the definition it is inside of; the call depth is limited', () => {
    const { graph, sub, id } = withAccumulator();
    const inner = LiteGraph.createNode('graph/function');
    sub.subgraph.add(inner);
    expect(inner.setDefinition(id)).toBe(false);
    const fn = callable(graph, id);
    NodeFunction._depth = LiteGraph.subgraph_max_depth;
    expect(() => fn.call()).toThrow(/LiteGraph\.subgraph_max_depth/);
});

test('committing the definition refreshes function nodes too', () => {
    const { graph, sub, id } = withAccumulator();
    const fn = callable(graph, id);
    sub.subgraph._nodes.find((n) => n.type === 'graph/input').setProperty('name', 'amount');
    sub.commitDefinition();
    expect(fn.inputs.map((i) => i.name)).toEqual(['call', 'amount']);
});

test('definitions format: a function keeps its type and loads its copy from the definition', () => {
    const { graph, src, id } = withAccumulator();
    const fn = callable(graph, id);
    src.connect(0, fn, 1);
    const empty = make(graph, 'graph/function', 0, 600); // nothing picked: no inner graph written
    const doc = graph.serialize({ format: 'definitions' });
    const saved = doc.nodes.find((n) => n.id === fn.id);
    expect(saved.type).toBe('graph/function');
    expect(saved.properties.subgraph_id).toBe(id);
    expect(saved.subgraph).toBeUndefined();
    expect(doc.nodes.find((n) => n.id === empty.id).subgraph).toBeUndefined();
    expect(doc.definitions.subgraphs.length).toBe(1);
    const loaded = new LGraph();
    expect(loaded.configure(JSON.parse(JSON.stringify(doc)))).toBe(false);
    const copy = loaded.getNodeById(fn.id);
    loaded.runStep(1); // the source computes its output
    copy.call();
    expect(copy.getOutputData(copy.findOutputSlot('total'))).toBe(3);
});

test('an older document (func_subgraph_id: a subgraph node id) migrates to that node\'s definition', () => {
    const { graph, sub, src } = withAccumulator();
    const old = graph.serialize({ format: 'inline' });
    delete old.definitions;
    old.nodes.push({ id: 99, type: 'graph/function', pos: [0, 400], size: [200, 80], flags: {}, mode: 0,
        inputs: [{ name: 'x', type: 'number', link: null }], outputs: [{ name: 'total', type: 'number', links: null }],
        properties: { func_subgraph_id: sub.id } });
    const loaded = new LGraph();
    loaded.configure(JSON.parse(JSON.stringify(old)));
    const fn = loaded.getNodeById(99);
    const host = loaded.getNodeById(sub.id);
    fn.call(); // migrates
    loaded.getNodeById(src.id).connect(0, fn, fn.findInputSlot('x'));
    loaded.runStep(1);
    fn.call();
    expect(fn.properties.subgraph_id).toBe(host.properties.subgraph_id);
    expect(fn.properties.func_subgraph_id).toBeUndefined();
    expect(fn.inputs.map((i) => i.name)).toEqual(['call', 'x']);
    expect(fn.outputs.map((o) => o.name)).toEqual(['done', 'total']);
    expect(fn.getOutputData(fn.findOutputSlot('total'))).toBe(3);
});
