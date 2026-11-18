import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('out', 'number'); } }
    class Dst { constructor() { this.addInput('in', 'number'); } }
    LiteGraph.registerNodeType('fmt/src', Src);
    LiteGraph.registerNodeType('fmt/dst', Dst);
});

const roundTrip = (data) => JSON.parse(JSON.stringify(data));

function foreignDocument() {
    return {
        id: 'b7c1a0f2-0000-4000-8000-000000000001',
        revision: 3,
        last_node_id: 2,
        last_link_id: 1,
        nodes: [
            { id: 1, type: 'fmt/src', pos: [10, 20], size: [100, 40], flags: {}, order: 0, mode: 0,
                outputs: [{ name: 'out', type: 'number', links: [1] }], properties: {} },
            { id: 2, type: 'Foreign/Unknown', pos: [200, 20], size: [140, 60], flags: {}, order: 1, mode: 0,
                inputs: [{ name: 'in', type: 'number', link: 1, widget: { name: 'w' } }],
                outputs: [{ name: 'res', type: 'IMAGE', links: null }],
                properties: { 'Node name for S&R': 'Foreign/Unknown' },
                widgets_values: [42, 'euler', true], cnr_id: 'comfy-core' },
        ],
        links: [[1, 1, 0, 2, 0, 'number']],
        groups: [{ title: 'G', bounding: [0, 0, 400, 200], color: '#3f789e', font_size: 24, locked: false }],
        config: {},
        extra: { ds: { scale: 1, offset: [0, 0] }, reroutes: [{ id: 1, pos: [5, 5], linkIds: [1] }] },
        floatingLinks: [],
        version: 0.4,
    };
}

test('serialize writes a numeric schema version and the library version separately', () => {
    const graph = new LGraph();
    graph.add(LiteGraph.createNode('fmt/src'));
    const data = graph.serialize();
    expect(data.version).toBe(0.4);
    expect(typeof data.version).toBe('number');
    expect(data.litegraph_version).toBe(LiteGraph.VERSION);
    graph.clear();
});

test('pos, size and group bounding serialize as plain JSON arrays', () => {
    const graph = new LGraph();
    const node = LiteGraph.createNode('fmt/src');
    graph.add(node); // add() may snap to the grid
    node.pos = [12.5, 30];
    const group = new LiteGraph.LGraphGroup();
    group.configure({ title: 'g', bounding: [1, 2, 300, 400] });
    graph.add(group);
    const json = roundTrip(graph.serialize());
    expect(json.nodes[0].pos).toEqual([12.5, 30]);
    expect(Array.isArray(json.nodes[0].size)).toBe(true);
    expect(json.groups[0].bounding).toEqual([1, 2, 300, 400]);
    graph.clear();
});

test('unknown top-level fields survive configure and serialize', () => {
    const graph = new LGraph();
    graph.configure(foreignDocument());
    const out = roundTrip(graph.serialize());
    expect(out.id).toBe('b7c1a0f2-0000-4000-8000-000000000001');
    expect(out.revision).toBe(3);
    expect(out.floatingLinks).toEqual([]);
    expect(out.extra.reroutes).toEqual([{ id: 1, pos: [5, 5], linkIds: [1] }]);
    // a second configure with a plain document must not leak the previous foreign fields
    graph.configure({ nodes: [], links: [], version: 0.4 });
    const plain = graph.serialize();
    expect(plain.id).toBeUndefined();
    expect(plain.revision).toBeUndefined();
    expect(graph.id).toBeUndefined();
    graph.clear();
});

test('foreign fields never overwrite graph members', () => {
    const graph = new LGraph();
    const doc = foreignDocument();
    doc.status = 'bogus';
    graph.configure(doc);
    // status is a runtime member, copied as before (legacy behaviour), and not duplicated as foreign
    expect(graph.serialize().status).toBeUndefined();
    graph.clear();
});

test('edits to placeholder nodes of unknown types persist and keep unmodelled data', () => {
    const graph = new LGraph();
    graph.configure(foreignDocument());
    const placeholder = graph.getNodeById(2);
    expect(placeholder.has_errors).toBe(true);
    placeholder.pos = [500, 600];
    placeholder.title = 'renamed';
    let out = roundTrip(graph.serialize()).nodes.find((n) => n.id === 2);
    expect(out.type).toBe('Foreign/Unknown');
    expect(out.pos).toEqual([500, 600]);
    expect(out.title).toBe('renamed');
    expect(out.widgets_values).toEqual([42, 'euler', true]);
    expect(out.cnr_id).toBe('comfy-core');
    expect(out.inputs[0].widget).toEqual({ name: 'w' });
    expect(out.properties['Node name for S&R']).toBe('Foreign/Unknown');

    // disconnecting leaves no dangling link reference in the saved document
    placeholder.disconnectInput(0);
    const saved = roundTrip(graph.serialize());
    out = saved.nodes.find((n) => n.id === 2);
    expect(out.inputs[0].link).toBeNull();
    expect(saved.links).toHaveLength(0);
    expect(saved.nodes.find((n) => n.id === 1).outputs[0].links ?? []).toHaveLength(0);
    graph.clear();
});

test('placeholder round-trip without edits reproduces the stored node', () => {
    const graph = new LGraph();
    const doc = foreignDocument();
    graph.configure(doc);
    const out = roundTrip(graph.serialize()).nodes.find((n) => n.id === 2);
    const { order: _o1, ...expected } = doc.nodes[1];
    const { order: _o2, ...actual } = out;
    expect(actual).toEqual(expected);
    graph.clear();
});

test('id counters advance past loaded ids when the document lacks or understates them', () => {
    const graph = new LGraph();
    const doc = foreignDocument();
    delete doc.last_node_id;
    delete doc.last_link_id;
    doc.nodes[1].id = 9;
    doc.links[0][3] = 9;
    doc.links[0][0] = 7;
    doc.nodes[0].outputs[0].links = [7];
    doc.nodes[1].inputs[0].link = 7;
    graph.configure(doc);
    expect(graph.last_node_id).toBe(9);
    expect(graph.last_link_id).toBe(7);
    const added = LiteGraph.createNode('fmt/dst');
    graph.add(added);
    expect(added.id).toBe(10);
    graph.getNodeById(1).connect(0, added, 0);
    expect(Object.keys(graph.links).map(Number)).toContain(8);
    graph.clear();
});

test('documents still load when version is the legacy library string', () => {
    const graph = new LGraph();
    const doc = foreignDocument();
    doc.version = 'a0.11.1';
    expect(graph.configure(doc)).toBe(true); // placeholder present -> error flag, but links loaded
    expect(Object.keys(graph.links)).toHaveLength(1);
    graph.clear();
});
