// Regression tests for bugs reported on jagenjo/litegraph.js that also affected this fork.
// Issue numbers refer to https://github.com/jagenjo/litegraph.js/issues. Runs against the build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LiteGraph, LGraph, LGraphNode, LGraphCanvas } from '../../.lg/local-build/build/litegraph.js';

for (const level of ['log', 'warn', 'debug', 'info']) console[level] = () => {};

class TwoOut extends LGraphNode {
    constructor(title) { super(title); this.addOutput('a', 'number'); this.addOutput('b', 'number'); }
}
class TwoIn extends LGraphNode {
    constructor(title) { super(title); this.addInput('x', 'number'); this.addInput('y', 'string'); }
}
class ThreeIn extends LGraphNode {
    constructor(title) { super(title); for (const n of ['in1', 'in2', 'in3']) this.addInput(n, 'number'); }
}
LiteGraph.registerNodeType('issues/two_out', TwoOut);
LiteGraph.registerNodeType('issues/two_in', TwoIn);
LiteGraph.registerNodeType('issues/three_in', ThreeIn);

test('#527 events/waitAll waits for every input', () => {
    const node = LiteGraph.createNode('events/waitAll');
    assert.ok(node.inputs.length >= 2);
    let fired = 0;
    node.triggerSlot = () => fired++;
    node.onAction('action', null, {}, 0);
    assert.equal(fired, 0, 'one input is not all of them');
    for (let i = 1; i < node.inputs.length; ++i) node.onAction('action', null, {}, i);
    assert.equal(fired, 1);
});

test('#529 cloning a subgraph with a nested subgraph under use_uuids', () => {
    const saved = LiteGraph.use_uuids;
    LiteGraph.use_uuids = true;
    try {
        const outer = LiteGraph.createNode('graph/subgraph');
        outer.subgraph.add(LiteGraph.createNode('graph/subgraph'));
        const copy = outer.clone();
        const innerIds = (graph) => graph._nodes.map((n) => n.id);
        assert.notDeepEqual(innerIds(copy.subgraph), innerIds(outer.subgraph), 'nested ids are reassigned');
    } finally {
        LiteGraph.use_uuids = saved;
    }
});

test('#528 clone after removing inputs keeps only the remaining ones', () => {
    const node = LiteGraph.createNode('issues/three_in');
    node.removeInput(2);
    node.removeInput(1);
    assert.deepEqual(node.clone().inputs.map((i) => i.name), ['in1']);
});

test('#481 configure reports the output slot index, not the link index', () => {
    const graph = new LGraph();
    const src = LiteGraph.createNode('issues/two_out');
    const a = LiteGraph.createNode('issues/two_in');
    const b = LiteGraph.createNode('issues/two_in');
    [src, a, b].forEach((n) => graph.add(n));
    src.connect(1, a, 0);
    src.connect(1, b, 0);
    const data = graph.serialize();
    const slots = [];
    const proto = LiteGraph.registered_node_types['issues/two_out'].prototype;
    proto.onConnectionsChange = (type, slot) => { if (type === LiteGraph.OUTPUT) slots.push(slot); };
    try {
        new LGraph().configure(data);
    } finally {
        delete proto.onConnectionsChange;
    }
    assert.deepEqual(slots, [1, 1]);
});

test('#530 onBeforeConnectInput can redirect a connection to another slot', () => {
    const graph = new LGraph();
    const src = new LGraphNode();
    src.addOutput('out', 'string');
    const target = new LGraphNode();
    target.addInput('slot_num', 'number');
    target.addInput('slot_str', 'string');
    let received;
    target.onBeforeConnectInput = (slot) => { received = slot; return 1; };
    graph.add(src);
    graph.add(target);
    const link = src.connect(0, target, 0);
    assert.equal(received, 0, 'the hook gets the requested slot');
    assert.ok(link, 'connected');
    assert.equal(link.target_slot, 1);
    assert.equal(target.inputs[1].link, link.id);
    assert.equal(target.inputs[0].link, null);

    target.onBeforeConnectInput = () => false;
    assert.equal(src.connect(0, target, 0), null, 'false refuses');
});

test('#430 graph actions without arguments reach the canvas', () => {
    const graph = new LGraph();
    const calls = [];
    graph.list_of_graphcanvas = [{
        selected_nodes: {},
        clear: () => calls.push('clear'),
        checkPanels: () => calls.push('checkPanels'),
        onBeforeChange: (g) => calls.push(g === graph ? 'onBeforeChange(graph)' : 'onBeforeChange(?)'),
    }];
    const node = LiteGraph.createNode('basic/const');
    graph.add(node);
    graph.remove(node);
    graph.clear();
    graph.sendActionToCanvas('onBeforeChange', graph);
    assert.ok(calls.includes('checkPanels'));
    assert.ok(calls.includes('clear'));
    assert.ok(calls.includes('onBeforeChange(graph)'), 'a single argument is passed as is');
});

test('#451 graph.add keeps a size set by the caller or by the node class', () => {
    const graph = new LGraph();
    const set = LiteGraph.createNode('basic/const');
    set.size = [400, 300];
    graph.add(set);
    assert.deepEqual([...set.size], [400, 300]);

    const frame = LiteGraph.createNode('graphics/frame');
    const classSize = [...frame.size];
    graph.add(frame);
    assert.deepEqual([...frame.size], classSize, 'graphics/frame keeps its 200x200');

    const fresh = LiteGraph.createNode('issues/three_in');
    graph.add(fresh);
    assert.deepEqual([...fresh.size], [...fresh.computeSize()], 'default-sized nodes are still auto sized');
});

test('#457 link midpoints follow LINEAR and STRAIGHT links', () => {
    const at = (mode, t) => LGraphCanvas.prototype.computeConnectionPoint.call(
        { links_render_mode: mode, getLinkPolyline: LGraphCanvas.prototype.getLinkPolyline },
        [0, 0], [100, 100], t, LiteGraph.RIGHT, LiteGraph.LEFT);
    // LINEAR: (0,0) -> (15,0) -> (85,100) -> (100,100); the middle of the long segment
    const mid = at(LiteGraph.LINEAR_LINK, 0.5);
    assert.ok(Math.abs(mid[0] - 50) < 1e-9 && Math.abs(mid[1] - 50) < 1e-9, String(mid));
    // STRAIGHT: the vertical run sits at x = 50
    const quarter = at(LiteGraph.STRAIGHT_LINK, 0.5);
    assert.ok(Math.abs(quarter[0] - 50) < 1e-9, String(quarter));
    assert.deepEqual(at(LiteGraph.LINEAR_LINK, 0), [0, 0]);
    assert.deepEqual(at(LiteGraph.LINEAR_LINK, 1), [100, 100]);
});

test('#111 cloning a subgraph keeps inputs added on the outer node', () => {
    const graph = new LGraph();
    const sg = LiteGraph.createNode('graph/subgraph');
    graph.add(sg);
    const gin = LiteGraph.createNode('graph/input');
    sg.subgraph.add(gin);
    gin.setProperty('name', 'EV');
    gin.setProperty('type', 'number');
    sg.addInput('enabled', 'boolean');
    const copy = sg.clone();
    assert.deepEqual(copy.inputs.map((i) => i.name), sg.inputs.map((i) => i.name));
    assert.ok(copy.inputs.every((i) => i.link == null), 'links are not copied');
});

test('#266 addInputs accepts a single slot name', () => {
    const node = new LGraphNode();
    node.addInputs('foo');
    assert.equal(node.inputs.at(-1).name, 'foo');
});

test('getNodeOnPos does not reorder the node list', () => {
    const graph = new LGraph();
    const a = LiteGraph.createNode('basic/const');
    const b = LiteGraph.createNode('basic/const');
    graph.add(a);
    graph.add(b);
    a.pos = [0, 0];
    b.pos = [0, 0];
    const order = graph._nodes.map((n) => n.id);
    assert.equal(graph.getNodeOnPos(5, 5), b, 'top-most (last drawn) wins');
    assert.equal(graph.getNodeOnPos(5, 5), b, 'and keeps winning');
    assert.deepEqual(graph._nodes.map((n) => n.id), order);
});

test('deselectNode removes the node from selected_nodes', () => {
    const node = LiteGraph.createNode('basic/const');
    node.id = 7;
    node.is_selected = true;
    const canvas = { selected_nodes: { 7: node }, current_node: node, highlighted_links: {},
        processCallbackHandlers() {} };
    LGraphCanvas.prototype.deselectNode.call(canvas, node);
    assert.deepEqual(Object.keys(canvas.selected_nodes), []);
    assert.equal(canvas.current_node, null);
});

test('unregisterNodeType removes the class from LiteGraph.Nodes', () => {
    class IssuesTemp extends LGraphNode {}
    LiteGraph.registerNodeType('issues/temp', IssuesTemp);
    assert.equal(LiteGraph.Nodes.IssuesTemp, IssuesTemp);
    LiteGraph.unregisterNodeType('issues/temp');
    assert.equal(LiteGraph.Nodes.IssuesTemp, undefined);
    assert.equal(LiteGraph.registered_node_types['issues/temp'], undefined);
});

test('node.console keeps at most LGraphNode.MAX_CONSOLE messages', () => {
    const node = new LGraphNode();
    for (let i = 0; i < LGraphNode.MAX_CONSOLE + 20; ++i) node.trace(String(i));
    assert.equal(node.console.length, LGraphNode.MAX_CONSOLE);
});

test('#377 fitText trims long text to the width with an ellipsis', () => {
    const ctx = { measureText: (s) => ({ width: s.length * 10 }) };
    assert.equal(LGraphCanvas.fitText(ctx, 'short', 100), 'short');
    assert.equal(LGraphCanvas.fitText(ctx, 'abcdefghijklmnop', 60), 'abcde…');
    assert.equal(LGraphCanvas.fitText(ctx, 'abc', 0), '');
});

test('removing a node only closes panels of nodes that left the graph', () => {
    const graph = new LGraph();
    const a = LiteGraph.createNode('basic/const');
    const b = LiteGraph.createNode('basic/const');
    graph.add(a);
    graph.add(b);
    const closed = [];
    const panel = (node) => ({ node, close: () => closed.push(node) });
    const panels = [panel(a), panel(b)];
    const canvas = { graph, selected_nodes: {}, canvas: { parentNode: { querySelectorAll: () => panels } } };
    canvas.checkPanels = LGraphCanvas.prototype.checkPanels;
    graph.list_of_graphcanvas = [canvas];
    graph.remove(b);
    assert.deepEqual(closed, [b], "a's panel stays open");
});
