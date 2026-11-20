import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { ComfyInterop } from '../src/extensions/comfy_interop.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Num { constructor() { this.addOutput('n', 'number'); } }
    LiteGraph.registerNodeType('interop/num', Num);
});

const json = (value) => JSON.parse(JSON.stringify(value));

// Hand-written fixture in the shape of a ComfyUI 0.4 workflow (types are just strings here).
function workflow04() {
    return {
        id: '6c2b1d3e-1111-4222-8333-444455556666',
        revision: 0,
        last_node_id: 3,
        last_link_id: 2,
        nodes: [
            { id: 1, type: 'CheckpointLoaderSimple', pos: [0, 0], size: [315, 98], flags: {}, order: 0, mode: 0,
                outputs: [{ name: 'MODEL', type: 'MODEL', links: [1], slot_index: 0 }, { name: 'CLIP', type: 'CLIP', links: [2], slot_index: 1 }],
                properties: { 'Node name for S&R': 'CheckpointLoaderSimple' }, widgets_values: ['model.safetensors'] },
            { id: 2, type: 'KSampler', pos: [400, 0], size: [315, 262], flags: {}, order: 1, mode: 4,
                inputs: [{ name: 'model', type: 'MODEL', link: 1 }],
                outputs: [{ name: 'LATENT', type: 'LATENT', links: null }],
                properties: { 'Node name for S&R': 'KSampler' }, widgets_values: [156680208700286, 'randomize', 20, 8, 'euler', 'normal', 1] },
            { id: 3, type: 'CLIPTextEncode', pos: [400, 300], size: [400, 200], flags: { collapsed: true }, order: 2, mode: 0,
                inputs: [{ name: 'clip', type: 'CLIP', link: 2 }],
                outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: null }],
                properties: {}, widgets_values: ['a photo'], cnr_id: 'comfy-core', ver: '0.3.0' },
        ],
        links: [[1, 1, 0, 2, 0, 'MODEL'], [2, 1, 1, 3, 0, 'CLIP']],
        groups: [{ id: 1, title: 'Load', bounding: [-10, -40, 340, 150], color: '#3f789e', font_size: 24, flags: {} }],
        config: {},
        extra: { ds: { scale: 1, offset: [0, 0] }, reroutes: [{ id: 1, pos: [350, 50], linkIds: [1] }],
            linkExtensions: [{ id: 1, parentId: 1 }] },
        version: 0.4,
    };
}

test('detects ComfyUI workflows', () => {
    expect(ComfyInterop.isComfyWorkflow(workflow04())).toBe(true);
    const ours = new LGraph();
    ours.add(LiteGraph.createNode('interop/num'));
    expect(ComfyInterop.isComfyWorkflow(ours.serialize())).toBe(false);
    ours.clear();
});

test('imports unknown types as hidden placeholders and re-exports 0.4 without loss', () => {
    const graph = new LGraph();
    const original = workflow04();
    const result = ComfyInterop.importWorkflow(graph, original);
    expect(result.error).toBe(false);
    expect(result.placeholderTypes).toEqual(expect.arrayContaining(['KSampler', 'CheckpointLoaderSimple', 'CLIPTextEncode']));
    expect(LiteGraph.registered_node_types.KSampler.skip_list).toBe(true);
    expect(graph._nodes).toHaveLength(3);
    expect(Object.keys(graph.links)).toHaveLength(2);

    const out = json(ComfyInterop.exportWorkflow(graph));
    expect(out.version).toBe(0.4);
    const strip = (doc) => doc.nodes.map(({ order: _order, ...node }) => node);
    expect(strip(out)).toEqual(strip(original));
    expect(out.links).toEqual(original.links);
    expect(out.groups).toEqual(original.groups);
    expect(out.id).toBe(original.id);
    expect(out.extra.reroutes).toEqual(original.extra.reroutes);
    expect(out.extra.linkExtensions).toEqual(original.extra.linkExtensions);
    expect(out.extra.comfy_bypassed).toBeUndefined();
    graph.clear();
});

test('Comfy BYPASS maps to NEVER and back; changed modes are kept', () => {
    const graph = new LGraph();
    const { bypassed } = ComfyInterop.importWorkflow(graph, workflow04());
    expect(bypassed).toEqual([2]);
    expect(graph.getNodeById(2).mode).toBe(LiteGraph.NEVER);
    expect(ComfyInterop.exportWorkflow(graph).nodes.find((n) => n.id === 2).mode).toBe(4);

    graph.getNodeById(2).mode = LiteGraph.ALWAYS; // user re-enabled it
    expect(ComfyInterop.exportWorkflow(graph).nodes.find((n) => n.id === 2).mode).toBe(0);
    graph.clear();
});

test('LiteGraph ON_REQUEST exports as ALWAYS with a marker and imports back', () => {
    const graph = new LGraph();
    const node = LiteGraph.createNode('interop/num');
    graph.add(node);
    node.mode = LiteGraph.ON_REQUEST;
    const out = json(ComfyInterop.exportWorkflow(graph));
    expect(out.nodes[0].mode).toBe(0);
    expect(out.nodes[0].litegraph_mode).toBe(LiteGraph.ON_REQUEST);

    const again = new LGraph();
    ComfyInterop.importWorkflow(again, out);
    expect(again.getNodeById(node.id).mode).toBe(LiteGraph.ON_REQUEST);
    expect(again.serialize().nodes[0].litegraph_mode).toBeUndefined();
    graph.clear();
    again.clear();
});

test('edits on placeholders persist and stale link extensions are dropped', () => {
    const graph = new LGraph();
    ComfyInterop.importWorkflow(graph, workflow04());
    const sampler = graph.getNodeById(2);
    sampler.pos = [999, 111];
    sampler.disconnectInput(0); // removes link 1, which had a reroute parent
    const out = json(ComfyInterop.exportWorkflow(graph));
    const saved = out.nodes.find((n) => n.id === 2);
    expect(saved.pos).toEqual([999, 111]);
    expect(saved.widgets_values).toEqual([156680208700286, 'randomize', 20, 8, 'euler', 'normal', 1]);
    expect(saved.inputs[0].link).toBeNull();
    expect(out.links.map((l) => l[0])).toEqual([2]);
    expect(out.extra.linkExtensions).toBeUndefined();
    graph.clear();
});

test('exports version 1 with object links, state, group ids and top-level reroutes', () => {
    const graph = new LGraph();
    ComfyInterop.importWorkflow(graph, workflow04());
    const v1 = json(ComfyInterop.exportWorkflow(graph, { version: 1 }));
    expect(v1.version).toBe(1);
    expect(v1.last_node_id).toBeUndefined();
    expect(v1.state).toEqual({ lastGroupId: 1, lastNodeId: 3, lastLinkId: 2, lastRerouteId: 1 });
    expect(v1.links[0]).toEqual({ id: 1, origin_id: 1, origin_slot: 0, target_id: 2, target_slot: 0, type: 'MODEL', parentId: 1 });
    expect(v1.links[1].parentId).toBeUndefined();
    expect(v1.reroutes).toEqual([{ id: 1, pos: [350, 50], linkIds: [1] }]);
    expect(v1.extra.reroutes).toBeUndefined();
    expect(v1.groups[0].id).toBe(1);

    // and version 1 imports back, keeping reroute parents
    const again = new LGraph();
    ComfyInterop.importWorkflow(again, v1);
    expect(Object.keys(again.links)).toHaveLength(2);
    const back = json(ComfyInterop.exportWorkflow(again, { version: 1 }));
    expect(back.links).toEqual(v1.links);
    expect(back.state).toEqual(v1.state);
    expect(back.reroutes).toEqual(v1.reroutes);
    const back04 = json(ComfyInterop.exportWorkflow(again));
    expect(back04.links).toEqual(workflow04().links);
    expect(back04.extra.linkExtensions).toEqual([{ id: 1, parentId: 1 }]);
    expect(back04.extra.reroutes).toEqual(workflow04().extra.reroutes);
    expect(back04.state).toBeUndefined();
    graph.clear();
    again.clear();
});

test('our graphs export to the 0.4 shape ComfyUI validates', () => {
    const graph = new LGraph();
    const a = LiteGraph.createNode('interop/num');
    graph.add(a);
    const group = new LiteGraph.LGraphGroup();
    group.configure({ title: 'g', bounding: [0, 0, 200, 100] });
    graph.add(group);
    const out = json(ComfyInterop.exportWorkflow(graph));
    expect(typeof out.version).toBe('number');
    expect(typeof out.last_link_id).toBe('number');
    for (const node of out.nodes) {
        expect(node).toEqual(expect.objectContaining({ flags: expect.any(Object), order: expect.any(Number), mode: expect.any(Number), properties: expect.any(Object) }));
        expect(node.pos).toHaveLength(2);
        expect(node.size).toHaveLength(2);
    }
    expect(out.groups[0].bounding).toHaveLength(4);
    graph.clear();
});

test('uuid link ids are rejected with an explanation', () => {
    const graph = new LGraph();
    graph.configure({ nodes: [], links: [['a-uuid', 1, 0, 2, 0, 'number']], version: 0.4 });
    expect(() => ComfyInterop.exportWorkflow(graph)).toThrow(/numeric link ids/);
    graph.clear();
});

// A ComfyUI-shaped workflow with one subgraph definition (shape after ComfyUI's documented schema).
function workflowWithSubgraph() {
    const id = 'a7f1c2d3-0000-4000-8000-000000000001';
    return {
        id: '6c2b1d3e-2222-4222-8333-444455556666', revision: 0, last_node_id: 2, last_link_id: 1,
        nodes: [
            { id: 1, type: 'EmptyLatentImage', pos: [0, 0], size: [315, 106], flags: {}, order: 0, mode: 0,
                outputs: [{ name: 'LATENT', type: 'LATENT', links: [1] }], properties: {}, widgets_values: [512, 512, 1] },
            { id: 2, type: id, pos: [400, 0], size: [200, 46], flags: {}, order: 1, mode: 0,
                inputs: [{ name: 'latent', type: 'LATENT', link: 1 }], outputs: [{ name: 'IMAGE', type: 'IMAGE', links: null }], properties: {}, widgets_values: [] },
        ],
        links: [[1, 1, 0, 2, 0, 'LATENT']],
        groups: [], config: {}, extra: { ds: { scale: 1, offset: [0, 0] } }, version: 0.4,
        definitions: { subgraphs: [{
            id, version: 1, revision: 0, name: 'Decode and sharpen',
            state: { lastNodeId: 6, lastLinkId: 7, lastGroupId: 0, lastRerouteId: 0 }, config: {},
            inputNode: { id: -10, bounding: [-200, 100, 120, 60] }, outputNode: { id: -20, bounding: [700, 100, 120, 60] },
            inputs: [{ id: 'in-latent-uuid', name: 'latent', type: 'LATENT', linkIds: [5] }],
            outputs: [{ id: 'out-image-uuid', name: 'IMAGE', type: 'IMAGE', linkIds: [7] }],
            widgets: [],
            nodes: [
                { id: 5, type: 'VAEDecode', pos: [0, 100], size: [210, 46], flags: {}, order: 0, mode: 0,
                    inputs: [{ name: 'samples', type: 'LATENT', link: 5 }], outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [6] }], properties: {} },
                { id: 6, type: 'ImageSharpen', pos: [300, 100], size: [315, 106], flags: {}, order: 1, mode: 4,
                    inputs: [{ name: 'image', type: 'IMAGE', link: 6 }], outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [7] }], properties: {}, widgets_values: [1, 1, 0.5] },
            ],
            groups: [],
            links: [
                { id: 5, origin_id: -10, origin_slot: 0, target_id: 5, target_slot: 0, type: 'LATENT' },
                { id: 6, origin_id: 5, origin_slot: 0, target_id: 6, target_slot: 0, type: 'IMAGE' },
                { id: 7, origin_id: 6, origin_slot: 0, target_id: -20, target_slot: 0, type: 'IMAGE' },
            ],
            extra: {},
        }] },
    };
}

test('a ComfyUI subgraph imports as an instance; inner placeholders and modes; exports back', () => {
    const graph = new LGraph();
    const original = workflowWithSubgraph();
    const result = ComfyInterop.importWorkflow(graph, original);
    expect(result.error).toBe(false);
    const definition = original.definitions.subgraphs[0];
    expect(result.placeholderTypes).toEqual(expect.arrayContaining(['EmptyLatentImage', 'VAEDecode', 'ImageSharpen']));
    expect(result.placeholderTypes).not.toContain(definition.id);
    const instance = graph.getNodeById(2);
    expect(instance.type).toBe('graph/subgraph');
    expect(instance.properties.subgraph_id).toBe(definition.id);
    const sharpen = instance.subgraph.getNodeById(6);
    expect(sharpen.mode).toBe(LiteGraph.NEVER); // BYPASS inside the definition

    const out = json(ComfyInterop.exportWorkflow(graph));
    expect(out.litegraph_version).toBeUndefined();
    expect(ComfyInterop.isComfyWorkflow(out)).toBe(true);
    expect(out.nodes.find((n) => n.id === 2).type).toBe(definition.id);
    const back = out.definitions.subgraphs[0];
    expect(back.id).toBe(definition.id);
    expect(back.inputs.map(({ id, name, type, linkIds }) => ({ id, name, type, linkIds }))).toEqual(definition.inputs);
    expect(back.outputs.map(({ id, name, type, linkIds }) => ({ id, name, type, linkIds }))).toEqual(definition.outputs);
    expect(back.inputNode).toEqual(definition.inputNode);
    expect(back.outputNode).toEqual(definition.outputNode);
    expect(back.links).toEqual(definition.links);
    const strip = (nodes) => nodes.map(({ order: _order, ...node }) => node);
    expect(strip(back.nodes)).toEqual(strip(definition.nodes));
    expect(back.extra?.comfy_bypassed).toBeUndefined();
    graph.clear();
});

test('our own documents with subgraphs are not taken for ComfyUI workflows', () => {
    const graph = new LGraph();
    const a = LiteGraph.createNode('interop/num'); graph.add(a);
    graph.convertToSubgraph([a]);
    const doc = graph.serialize();
    expect(doc.definitions.subgraphs.length).toBe(1);
    expect(ComfyInterop.isComfyWorkflow(doc)).toBe(false);
    graph.clear();
});
