import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Out { constructor() { this.addOutput('o', 'number'); } }
    class In { constructor() { this.addInput('i', 'number'); } }
    LiteGraph.registerNodeType('tx/out', Out);
    LiteGraph.registerNodeType('tx/in', In);
});

let historyWas;
beforeEach(() => { historyWas = LiteGraph.actionHistory_enabled; LiteGraph.actionHistory_enabled = true; });
afterEach(() => { LiteGraph.actionHistory_enabled = historyWas; });

const entries = (graph) => graph.history.actionHistoryVersions.length;

test('changes inside a transaction make one history entry and one revision', () => {
    const graph = new LGraph();
    const before = entries(graph);
    const revision = graph.revision;
    graph.transact('build', () => {
        const a = LiteGraph.createNode('tx/out');
        const b = LiteGraph.createNode('tx/in');
        graph.add(a);
        graph.add(b);
        a.connect(0, b, 0);
    });
    expect(entries(graph) - before).toBe(1);
    expect(graph.revision - revision).toBe(1);
    const last = graph.history.actionHistory[graph.history.actionHistoryPtr];
    expect(last.actionName).toBe('build');
    expect(last.graphSave.nodes).toHaveLength(2);
    expect(last.graphSave.links).toHaveLength(1);
    graph.clear();
});

test('without a transaction each change is its own entry (unchanged behaviour)', () => {
    const graph = new LGraph();
    const before = entries(graph);
    graph.add(LiteGraph.createNode('tx/out'));
    graph.add(LiteGraph.createNode('tx/out'));
    expect(entries(graph) - before).toBe(2);
    graph.clear();
});

test('nested transactions record once, at the outermost commit, with its label', () => {
    const graph = new LGraph();
    const before = entries(graph);
    expect(graph.beginTransaction('outer')).toBe(1);
    graph.add(LiteGraph.createNode('tx/out'));
    expect(graph.beginTransaction('inner')).toBe(2);
    graph.add(LiteGraph.createNode('tx/out'));
    expect(graph.commitTransaction()).toBe(false);
    expect(graph.isInTransaction).toBe(true);
    expect(entries(graph)).toBe(before);
    expect(graph.commitTransaction()).toBe(true);
    expect(graph.isInTransaction).toBe(false);
    expect(entries(graph) - before).toBe(1);
    expect(graph.history.actionHistory[graph.history.actionHistoryPtr].actionName).toBe('outer');
    graph.clear();
});

test('an empty transaction records nothing; a stray commit is harmless', () => {
    const graph = new LGraph();
    const before = entries(graph);
    graph.transact('nothing', () => {});
    expect(entries(graph)).toBe(before);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(graph.commitTransaction()).toBe(false);
    jest.restoreAllMocks();
});

test('a throwing transaction still ends; rollback restores the previous graph', () => {
    const graph = new LGraph();
    const keep = LiteGraph.createNode('tx/out');
    graph.add(keep);
    expect(() => graph.transact('fails', () => {
        graph.add(LiteGraph.createNode('tx/out'));
        throw new Error('boom');
    })).toThrow('boom');
    expect(graph.isInTransaction).toBe(false);
    expect(graph._nodes).toHaveLength(2); // no rollback requested

    expect(() => graph.transact('fails', () => {
        graph.add(LiteGraph.createNode('tx/out'));
        graph.add(LiteGraph.createNode('tx/out'));
        throw new Error('boom');
    }, { rollback: true })).toThrow('boom');
    expect(graph.isInTransaction).toBe(false);
    expect(graph._nodes).toHaveLength(2);
    graph.clear();
});

test('undo after a grouped paste-like operation returns to the state before it', () => {
    const graph = new LGraph();
    graph.add(LiteGraph.createNode('tx/out')); // entry: 1 node
    graph.transact('paste', () => {
        for (let i = 0; i < 4; i++) graph.add(LiteGraph.createNode('tx/out'));
    });
    expect(graph._nodes).toHaveLength(5);
    expect(graph.actionHistoryBack()).toBe(true);
    expect(graph._nodes).toHaveLength(1);
    expect(graph.actionHistoryForward()).toBe(true);
    expect(graph._nodes).toHaveLength(5);
    graph.clear();
});

test('alignNodes is one undoable change', () => {
    const graph = new LGraph();
    const nodes = [0, 1, 2].map((i) => {
        const node = LiteGraph.createNode('tx/out');
        graph.add(node);
        node.pos = [i * 50, i * 30];
        return node;
    });
    const before = entries(graph);
    const spy = jest.spyOn(graph, 'commitTransaction');
    LGraphCanvas.alignNodes(nodes, 'left');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(entries(graph) - before).toBe(1);
    expect(new Set(nodes.map((n) => n.pos[0])).size).toBe(1);
    graph.clear();
});
