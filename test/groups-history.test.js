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

describe('group authoring', () => {
    test('resizeTo encloses items with padding and title room; fitToContents follows the contents', () => {
        const graph = new LGraph();
        const a = LiteGraph.createNode('grp/box'); a.pos = [100, 100]; graph.add(a);
        const b = LiteGraph.createNode('grp/box'); b.pos = [300, 200]; graph.add(b);
        const group = new LGraphGroup('G'); graph.add(group);
        expect(group.resizeTo([a, b], 10)).toBe(true);
        const ba = a.getBounding(), bb = b.getBounding();
        const title = group.font_size * 1.4;
        expect(group._bounding[0]).toBeCloseTo(ba[0] - 10);
        expect(group._bounding[1]).toBeCloseTo(ba[1] - 10 - title);
        expect(group._bounding[0] + group._bounding[2]).toBeCloseTo(bb[0] + bb[2] + 10);
        expect(group._bounding[1] + group._bounding[3]).toBeCloseTo(bb[1] + bb[3] + 10);
        expect(group.resizeTo([], 10)).toBe(false);
        b.pos = [150, 120]; // move inside, then shrink to fit
        expect(group.fitToContents(5)).toBe(true);
        expect(group._bounding[2]).toBeLessThan(260);
    });

    test('setNodesMode changes every node inside the group', () => {
        const graph = new LGraph();
        const inside = LiteGraph.createNode('grp/box'); inside.pos = [50, 80]; graph.add(inside);
        const outside = LiteGraph.createNode('grp/box'); outside.pos = [900, 900]; graph.add(outside);
        const group = new LGraphGroup('G'); graph.add(group); group._bounding.set([0, 0, 300, 200]);
        expect(group.setNodesMode(LiteGraph.NEVER)).toEqual([inside]);
        expect(inside.mode).toBe(LiteGraph.NEVER);
        expect(outside.mode).toBe(LiteGraph.ALWAYS);
        expect(group.setNodesMode(LiteGraph.NEVER)).toEqual([]); // already
    });
});
