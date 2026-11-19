import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphGroup } from '../src/lgraphgroup.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Box { constructor() { this.addOutput('out', 'number'); this.addInput('in', 'number'); } }
    LiteGraph.registerNodeType('grp/box', Box);
});

function groupWith(graph, bounding) {
    const group = new LGraphGroup('G');
    graph.add(group);
    group._bounding.set(bounding);
    return group;
}

describe('LGraphGroup', () => {
    test('membership: nodes overlapping the group and nested groups, never itself', () => {
        const graph = new LGraph();
        const inside = LiteGraph.createNode('grp/box'); inside.pos = [50, 60]; graph.add(inside);
        const outside = LiteGraph.createNode('grp/box'); outside.pos = [900, 900]; graph.add(outside);
        const outer = groupWith(graph, [0, 0, 400, 300]);
        const inner = groupWith(graph, [20, 20, 100, 100]);
        outer.recomputeInsideNodes();
        expect(outer._nodes).toContain(inside);
        expect(outer._nodes).not.toContain(outside);
        expect(outer._groups).toContain(inner);
        expect(outer._groups).not.toContain(outer);
    });

    test('move shifts the group, its nodes and nested groups exactly once', () => {
        const graph = new LGraph();
        const node = LiteGraph.createNode('grp/box'); node.pos = [50, 60]; graph.add(node);
        const outer = groupWith(graph, [0, 0, 400, 300]);
        const inner = groupWith(graph, [20, 20, 100, 100]);
        outer.recomputeInsideNodes();
        outer.move(10, -5);
        expect(Array.from(outer.pos)).toEqual([10, -5]);
        expect(Array.from(inner.pos)).toEqual([30, 15]);
        expect(Array.from(node.pos)).toEqual([60, 55]);
        outer.move(1, 1, true);
        expect(Array.from(node.pos)).toEqual([60, 55]);
    });

    test('serialize/configure round trip keeps id, title, bounding, color and unknown fields', () => {
        const graph = new LGraph();
        const group = groupWith(graph, [5, 6, 300, 200]);
        group.title = 'Named'; group.color = '#abc';
        const data = { ...group.serialize(), flags: { pinned: true } };
        const copy = new LGraphGroup();
        copy.configure(data);
        expect(copy.serialize()).toEqual(data);
        const reloaded = new LGraph();
        reloaded.configure(graph.serialize());
        expect(reloaded._groups.map((g) => g.serialize())).toEqual(graph._groups.map((g) => g.serialize()));
    });
});

describe('graph history', () => {
    test('undo and redo restore node additions and removals', () => {
        const graph = new LGraph();
        const prev = LiteGraph.actionHistory_enabled;
        LiteGraph.actionHistory_enabled = true;
        try {
            const a = LiteGraph.createNode('grp/box');
            graph.transaction?.('add', () => graph.add(a)) ?? graph.add(a);
            const b = LiteGraph.createNode('grp/box');
            graph.transaction?.('add', () => graph.add(b)) ?? graph.add(b);
            expect(graph._nodes).toHaveLength(2);
            expect(graph.actionHistoryBack()).not.toBe(false);
            expect(graph._nodes).toHaveLength(1);
            expect(graph.actionHistoryForward()).not.toBe(false);
            expect(graph._nodes).toHaveLength(2);
        } finally { LiteGraph.actionHistory_enabled = prev; }
    });
});
