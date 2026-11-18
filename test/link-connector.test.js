import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LinkConnector } from '../src/linkconnector.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('out', 'number'); } }
    class Dst { constructor() { this.addInput('a', 'number'); this.addInput('b', 'number'); } }
    LiteGraph.registerNodeType('lc/src', Src);
    LiteGraph.registerNodeType('lc/dst', Dst);
});

let historyWas;
beforeEach(() => { historyWas = LiteGraph.actionHistory_enabled; LiteGraph.actionHistory_enabled = true; });
afterEach(() => { LiteGraph.actionHistory_enabled = historyWas; });

function setup() {
    const graph = new LGraph();
    const [s1, s2] = [LiteGraph.createNode('lc/src'), LiteGraph.createNode('lc/src')];
    const [d1, d2] = [LiteGraph.createNode('lc/dst'), LiteGraph.createNode('lc/dst')];
    for (const node of [s1, s2, d1, d2]) graph.add(node);
    return { graph, s1, s2, d1, d2 };
}
const linkOf = (node, slot) => node.graph.links[node.inputs[slot].link];
const entries = (graph) => graph.history.actionHistoryVersions.length;

test('a new link from an output connects to the slot it is dropped on', () => {
    const { graph, s1, d1 } = setup();
    const lc = new LinkConnector().startFromOutput(s1, 0);
    expect(lc.isConnecting).toBe(true);
    expect(lc.type).toBe('number');
    lc.dropOnNode(d1, 1);
    expect(linkOf(d1, 1).origin_id).toBe(s1.id);
    expect(lc.isConnecting).toBe(false);
    graph.clear();
});

test('dropping on a node without a slot picks a compatible one', () => {
    const { graph, s1, d1 } = setup();
    new LinkConnector().startFromOutput(s1, 0).dropOnNode(d1, -1);
    expect(linkOf(d1, 0).origin_id).toBe(s1.id);
    const fromInput = new LinkConnector().startFromInput(d1, 1);
    fromInput.dropOnNode(s1, -1);
    expect(linkOf(d1, 1).origin_id).toBe(s1.id);
    graph.clear();
});

test('moving an input link to another input is one undo step', () => {
    const { graph, s1, d1, d2 } = setup();
    s1.connect(0, d1, 0);
    const before = entries(graph);
    const lc = new LinkConnector();
    expect(lc.moveInputLink(d1, 0)).toBe(true);
    expect(d1.inputs[0].link).toBeNull(); // detached while dragging
    expect(graph.isInTransaction).toBe(true);
    lc.dropOnNode(d2, 0);
    expect(graph.isInTransaction).toBe(false);
    expect(linkOf(d2, 0).origin_id).toBe(s1.id);
    expect(entries(graph) - before).toBe(1);

    graph.actionHistoryBack(); // undo the whole move
    expect(graph.getNodeById(d1.id).inputs[0].link).not.toBeNull();
    expect(graph.getNodeById(d2.id).inputs[0].link).toBeNull();
    graph.clear();
});

test('cancelling a move restores the original link', () => {
    const { graph, s1, d1 } = setup();
    s1.connect(0, d1, 1);
    const lc = new LinkConnector();
    lc.moveInputLink(d1, 1);
    expect(d1.inputs[1].link).toBeNull();
    lc.cancel();
    expect(linkOf(d1, 1).origin_id).toBe(s1.id);
    expect(graph.isInTransaction).toBe(false);
    expect(lc.isConnecting).toBe(false);
    graph.clear();
});

test('moving all links of an output reconnects every target to the new output', () => {
    const { graph, s1, s2, d1, d2 } = setup();
    s1.connect(0, d1, 0);
    s1.connect(0, d2, 1);
    const lc = new LinkConnector();
    expect(lc.moveOutputLinks(s1, 0)).toBe(true);
    expect(lc.movingInputs).toHaveLength(2);
    expect(s1.outputs[0].links ?? []).toHaveLength(0);
    lc.dropOnNode(s2, 0);
    expect(linkOf(d1, 0).origin_id).toBe(s2.id);
    expect(linkOf(d2, 1).origin_id).toBe(s2.id);
    graph.clear();
});

test('dropping a moved link on empty space disconnects it and reports what was dragged', () => {
    const { graph, s1, d1 } = setup();
    s1.connect(0, d1, 0);
    const lc = new LinkConnector();
    lc.moveInputLink(d1, 0);
    const dropped = lc.dropOnEmpty();
    expect(dropped).toEqual(expect.objectContaining({ node: s1, slot: 0, type: 'number' }));
    expect(dropped.output).toBe(s1.outputs[0]);
    expect(d1.inputs[0].link).toBeNull();
    expect(Object.keys(graph.links)).toHaveLength(0);
    expect(graph.isInTransaction).toBe(false);
    graph.clear();
});

test('nothing to move returns false and stays idle', () => {
    const { graph, s1, d1 } = setup();
    const lc = new LinkConnector();
    expect(lc.moveInputLink(d1, 0)).toBe(false);
    expect(lc.moveOutputLinks(s1, 0)).toBe(false);
    expect(lc.isConnecting).toBe(false);
    expect(graph.isInTransaction).toBe(false);
    graph.clear();
});

test('canvas connecting_* fields read and write the connector', () => {
    const { graph, s1 } = setup();
    const canvas = Object.create(LGraphCanvas.prototype);
    canvas.linkConnector = new LinkConnector();
    canvas.linkConnector.startFromOutput(s1, 0);
    expect(canvas.connecting_node).toBe(s1);
    expect(canvas.connecting_output).toBe(s1.outputs[0]);
    expect(canvas.connecting_slot).toBe(0);
    expect(canvas.connecting).toBe(false);
    canvas.connecting = { inputs: [{ node: s1, slot: 0 }] };
    expect(canvas.linkConnector.movingInputs).toHaveLength(1);
    canvas.connecting_node = null;
    expect(canvas.linkConnector.isConnecting).toBe(false);
    graph.clear();
});

test('moved and restored links keep their reroutes', () => {
    const { graph, s1, d1, d2 } = setup();
    s1.connect(0, d1, 0);
    const reroute = graph.addReroute([50, 50], linkOf(d1, 0));

    const move = new LinkConnector();
    move.moveInputLink(d1, 0);
    move.dropOnNode(d2, 0);
    expect(linkOf(d2, 0).parentId).toBe(reroute.id);

    const cancel = new LinkConnector();
    cancel.moveInputLink(d2, 0);
    cancel.cancel();
    expect(linkOf(d2, 0).parentId).toBe(reroute.id);
    expect(graph.getRerouteLinkIds().get(reroute.id)).toEqual([linkOf(d2, 0).id]);
    graph.clear();
});
