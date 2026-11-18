import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphNode } from '../src/lgraphnode.js';

let graphs;
beforeAll(async () => { LiteGraph.initialize(); await LiteGraph.LibraryManager.ready; });
beforeEach(() => { graphs = []; });
afterEach(() => {
    for (const graph of graphs) { try { graph.clear(); } catch {} }
    jest.restoreAllMocks();
});
const makeGraph = () => { const graph = new LGraph(); graphs.push(graph); return graph; };
const add = (graph) => { const node = new LGraphNode(); graph.add(node); return node; };
function pair(graph) {
    const source = add(graph); source.addOutput('unused', 'number'); source.addOutput('value', 'number');
    const target = add(graph); target.addInput('value', 'number');
    source.connect(1, target, 0);
    return { source, target };
}

test('removal finishes all links and resource hooks despite failing connection callbacks', async () => {
    const graph = makeGraph();
    const { source, target } = pair(graph);
    const other = add(graph); other.addInput('value', 'number');
    source.connect(1, other, 0);
    const notified = jest.fn(); other.onConnectionsChange = notified;
    target.onConnectionsChange = () => { throw new Error('disconnect callback failed'); };
    let released = false;
    source.onRemoved = async () => { await Promise.resolve(); released = true; };
    await expect(graph.removeAsync(source)).rejects.toThrow('disconnect callback failed');
    expect(released).toBe(true);
    expect(notified).toHaveBeenCalledTimes(1);
    expect(source.graph).toBeNull();
    expect(graph.getNodeById(source.id)).toBeUndefined();
    expect(graph._nodes_in_order).not.toContain(source);
    expect(graph.links).toEqual({});
    expect(source.outputs[1].links).toBeNull();
    expect(target.inputs[0].link).toBeNull();
    expect(other.inputs[0].link).toBeNull();
});

test('input removal reports multiple errors after completing cleanup and notifies the actual output slot', () => {
    const graph = makeGraph();
    const { source, target } = pair(graph);
    const sourceChanged = jest.fn(); source.onConnectionsChange = sourceChanged;
    const graphChanged = jest.fn(); graph.onNodeConnectionChange = graphChanged;
    target.onConnectionsChange = () => { throw new Error('input callback failed'); };
    target.onRemoved = () => { throw new Error('remove callback failed'); };
    expect(() => graph.remove(target)).toThrow(AggregateError);
    expect(sourceChanged).toHaveBeenCalledWith(LiteGraph.OUTPUT, 1, false, expect.any(Object), source.outputs[1]);
    expect(graphChanged).toHaveBeenCalledWith(LiteGraph.OUTPUT, source, 1, target, 0);
    expect(target.graph).toBeNull();
    expect(graph.links).toEqual({});
    expect(source.outputs[1].links).toEqual([]);
});

test('disconnecting multiple targets is structurally complete before callbacks and supports reentrant removal', () => {
    const graph = makeGraph();
    const { source, target } = pair(graph);
    const other = add(graph); other.addInput('value', 'number'); source.connect(1, other, 0);
    target.onConnectionsChange = () => {
        expect(graph.links).toEqual({});
        graph.remove(source);
    };
    expect(() => source.disconnectOutput(1)).not.toThrow();
    expect(source.graph).toBeNull();
    expect(other.inputs[0].link).toBeNull();
});

test('removal callbacks cannot reconnect a node that is being removed', () => {
    const graph = makeGraph(); const { source, target } = pair(graph);
    let attempted;
    target.onConnectionsChange = (_direction, _slot, connected) => {
        if (!connected) attempted = source.connect(1, target, 0);
    };
    graph.remove(source);
    expect(attempted).toBeNull();
    expect(graph.links).toEqual({});
    expect(target.inputs[0].link).toBeNull();
});

test('disconnectInput removes orphaned link records even when the origin is missing', () => {
    const graph = makeGraph(); const { source, target } = pair(graph);
    delete graph._nodes_by_id[source.id];
    expect(target.disconnectInput(0)).toBe(true);
    expect(graph.links).toEqual({});
    expect(target.inputs[0].link).toBeNull();
});

function loadingNode(graph) {
    let resolve, reject;
    const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
    jest.spyOn(LiteGraph.LibraryManager, 'loadLibrary').mockReturnValue(pending);
    class Slow { constructor() { this.libraries = ['test/slow']; } }
    LiteGraph.registerNodeType('mutation/slow', Slow);
    const node = LiteGraph.createNode('mutation/slow'); graph.add(node);
    return { node, resolve, reject };
}

// Bound tests that must complete without resolving the removed node's library.
const promptly = (promise) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('still waiting on a removed node')), 500);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
});

test('removing a loading node releases a graph readiness wait without canceling node readiness', async () => {
    const graph = makeGraph(); const pending = loadingNode(graph);
    const ready = graph.whenReady(); graph.remove(pending.node);
    await expect(promptly(ready)).resolves.toBe(graph);
    expect(pending.node.initialization_state).toBe('loading');
    pending.reject(new Error('detached dependency failed'));
    await expect(pending.node.ready).rejects.toThrow('detached dependency failed');
    await expect(graph.whenReady()).resolves.toBe(graph);
});

test('a removed failed dependency does not reject startup for the remaining graph', async () => {
    const graph = makeGraph(); const pending = loadingNode(graph);
    const started = graph.startAsync(100);
    await Promise.resolve(); await Promise.resolve();
    graph.remove(pending.node);
    pending.reject(new Error('removed dependency failed'));
    await expect(started).resolves.toBe(true);
    expect(graph.status).toBe(LGraph.STATUS_RUNNING);
});

test('clear cancels pending startup without waiting for a detached library', async () => {
    const graph = makeGraph(); const pending = loadingNode(graph);
    const started = graph.startAsync(100);
    await Promise.resolve(); await Promise.resolve();
    graph.clear();
    await expect(promptly(started)).resolves.toBe(false);
    pending.resolve(); await pending.node.ready;
    expect(pending.node.graph).toBeNull();
    expect(graph.status).toBe(LGraph.STATUS_STOPPED);
});

test('concurrent readiness waits include a replacement loading node', async () => {
    const graph = makeGraph(); const first = loadingNode(graph);
    const one = graph.whenReady(); const two = graph.whenReady();
    graph.remove(first.node);
    const second = loadingNode(graph);
    let settled = false;
    one.then(() => { settled = true; });
    first.resolve(); await first.node.ready;
    await Promise.resolve(); await Promise.resolve();
    expect(settled).toBe(false);
    second.resolve();
    await expect(one).resolves.toBe(graph);
    await expect(two).resolves.toBe(graph);
});

test('a loading node moved between graphs belongs to its new graph readiness', async () => {
    const graph = makeGraph(); const other = makeGraph(); const pending = loadingNode(graph);
    const oldReady = graph.whenReady();
    graph.remove(pending.node); other.add(pending.node);
    const newReady = other.whenReady();
    await expect(promptly(oldReady)).resolves.toBe(graph);
    pending.reject(new Error('new graph dependency failed'));
    await expect(newReady).rejects.toThrow('new graph dependency failed');
    expect(pending.node.graph).toBe(other);
});

test('targeted disconnection leaves the other links intact and accepts UUID IDs', () => {
    const graph = makeGraph(); const { source, target } = pair(graph);
    const other = new LGraphNode(); other.id = 'target-uuid'; graph.add(other);
    other.addInput('value', 'number'); source.connect(1, other, 0);
    expect(source.disconnectOutput('value', other.id)).toBe(true);
    expect(other.inputs[0].link).toBeNull();
    expect(source.outputs[1].links).toEqual([target.inputs[0].link]);
    expect(Object.values(graph.links)).toHaveLength(1);
    expect(source.disconnectOutput(1, 'missing-target')).toBe(false);
});
