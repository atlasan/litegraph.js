import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';

/**
 * Promoted widgets (Wave 3b, step 8): an interface input linked to an inner widget input shows that
 * widget on the subgraph node; the value belongs to the instance. Cases adapted from the ideas of
 * Comfy-Org/litegraph.js @ ea0e1a8 (MIT), test/subgraph/SubgraphWidgetPromotion.test.ts.
 */

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('v', 'number'); this.addProperty('v', 3); } onExecute() { this.setOutputData(0, this.properties.v); } }
    // reads its property (not getWidgetValue): the promoted value must reach it anyway
    class Scale {
        constructor() { this.addInput('x', 'number'); this.addOutput('y', 'number'); this.addProperty('k', 2); this.addWidget('number', 'k', 2, null, { property: 'k', precision: 0 }); }
        onExecute() { this.setOutputData(0, (this.getInputData(0) ?? 0) * this.properties.k); }
    }
    class Sink { constructor() { this.addInput('in', 'number'); this.value = undefined; } onExecute() { this.value = this.getInputData(0); } }
    for (const [type, cls] of Object.entries({ src: Src, scale: Scale, sink: Sink })) LiteGraph.registerNodeType(`sgp/${type}`, cls);
});
beforeEach(() => { for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());

const make = (graph, type, x = 0, y = 0) => { const n = LiteGraph.createNode(type.includes('/') ? type : `sgp/${type}`); n.pos = [x, y]; graph.add(n); return n; };
const run = (graph, steps = 3) => { for (let i = 0; i < steps; i++) graph.runStep(1); };
const scaleOf = (sub) => sub.subgraph._nodes.find((n) => n.type === 'sgp/scale');

/** two linked instances of [x * k], each fed by 3, each into a sink */
function twins() {
    const graph = new LGraph();
    const src = make(graph, 'src'), scale = make(graph, 'scale', 200), sinkA = make(graph, 'sink', 400);
    src.connect(0, scale, 0); scale.connect(0, sinkA, 0);
    const a = graph.convertToSubgraph([scale]);
    graph.serialize();
    const b = a.clone(); b.pos = [200, 300]; graph.add(b);
    const sinkB = make(graph, 'sink', 400, 300);
    src.connect(0, b, 0); b.connect(0, sinkB, 0);
    return { graph, src, a, b, sinkA, sinkB };
}

test('promoting an inner widget shows it on the instance; its value drives the inner node', () => {
    const { graph, a, sinkA } = twins();
    expect(a.promoteWidget(scaleOf(a), 'k')).toBe(true);
    expect(a.isWidgetPromoted(scaleOf(a), 'k')).toBe(true);
    expect(a.inputs.map((i) => i.name)).toEqual(['x', 'k']);
    expect(a.inputs[1].widget).toEqual({ name: 'k' });
    const widget = a.widgets.find((w) => w.name === 'k');
    expect(widget.type).toBe('number');
    expect(widget.value).toBe(2);
    widget.value = 5;
    run(graph);
    expect(sinkA.value).toBe(15);
    expect(a.promoteWidget(scaleOf(a), 'k')).toBe(false); // already promoted
});

test('linked instances each own their value; the definition keeps the default', () => {
    const { graph, a, b, sinkA, sinkB } = twins();
    a.promoteWidget(scaleOf(a), 'k');
    a.widgets.find((w) => w.name === 'k').value = 5;
    a.commitDefinition();
    const wb = b.widgets.find((w) => w.name === 'k');
    expect(wb.value).toBe(2);
    run(graph);
    expect([sinkA.value, sinkB.value]).toEqual([15, 6]);
    const definition = graph.subgraphs.get(a.properties.subgraph_id);
    const inner = definition.nodes.find((n) => n.type === 'sgp/scale');
    expect(inner.properties.k).toBe(2);
    const doc = graph.serialize({ format: 'definitions' });
    expect(doc.nodes.find((n) => n.id === a.id).widgets_values).toEqual([5]);
    expect(doc.nodes.find((n) => n.id === b.id).widgets_values).toEqual([2]);
    const loaded = new LGraph();
    loaded.configure(JSON.parse(JSON.stringify(doc)));
    expect(loaded.getNodeById(a.id).widgets.find((w) => w.name === 'k').value).toBe(5);
    run(loaded);
    expect(loaded._nodes.filter((n) => n.type === 'sgp/sink').map((n) => n.value)).toEqual([15, 6]);
});

test('a link into the promoted input wins over the widget', () => {
    const { graph, src, a, sinkA } = twins();
    a.promoteWidget(scaleOf(a), 'k');
    a.widgets.find((w) => w.name === 'k').value = 5;
    const four = make(graph, 'src', 0, 500); four.properties.v = 4;
    four.connect(0, a, a.findInputSlot('k'));
    run(graph);
    expect(sinkA.value).toBe(12);
    void src;
});

test('unpromoting removes the widget and the interface input', () => {
    const { a } = twins();
    a.promoteWidget(scaleOf(a), 'k');
    expect(a.unpromoteWidget(scaleOf(a), 'k')).toBe(true);
    expect(a.widgets?.some((w) => w.name === 'k')).toBe(false);
    expect(a.inputs.map((i) => i.name)).toEqual(['x']);
    expect(a.isWidgetPromoted(scaleOf(a), 'k')).toBe(false);
});

test('a ComfyUI-style instance applies its stored widgets_values', () => {
    const id = 'promo-0000-4000-8000-000000000001';
    const doc = {
        nodes: [{ id: 1, type: id, pos: [0, 0], size: [200, 80], flags: {}, mode: 0, properties: {},
            inputs: [{ name: 'k', type: 'number', link: null, widget: { name: 'k' } }], outputs: [{ name: 'y', type: 'number', links: null }], widgets_values: [7] }],
        links: [],
        definitions: { subgraphs: [{
            id, version: 1, name: 'Scaled', inputNode: { id: -10, bounding: [-200, 0, 120, 60] }, outputNode: { id: -20, bounding: [400, 0, 120, 60] },
            inputs: [{ id: 'in-k', name: 'k', type: 'number', linkIds: [3] }], outputs: [{ id: 'out-y', name: 'y', type: 'number', linkIds: [4] }],
            nodes: [{ id: 2, type: 'sgp/scale', pos: [0, 0], size: [140, 60], flags: {}, mode: 0, properties: { k: 2 }, widgets_values: [2],
                inputs: [{ name: 'x', type: 'number', link: null }, { name: 'k', type: 'number', link: 3, widget: { name: 'k' } }], outputs: [{ name: 'y', type: 'number', links: [4] }] }],
            links: [{ id: 3, origin_id: -10, origin_slot: 0, target_id: 2, target_slot: 1, type: 'number' }, { id: 4, origin_id: 2, origin_slot: 0, target_id: -20, target_slot: 0, type: 'number' }],
        }] },
    };
    const graph = new LGraph();
    expect(graph.configure(JSON.parse(JSON.stringify(doc)))).toBe(false);
    const node = graph.getNodeById(1);
    expect(node.widgets.map((w) => [w.name, w.value])).toEqual([['k', 7]]);
    expect(graph.serialize({ format: 'definitions' }).nodes[0].widgets_values).toEqual([7]);
    expect(graph.serialize({ format: 'definitions' }).definitions.subgraphs[0].nodes[0].properties.k).toBe(2);
});

test('a function node keeps its own widgets first; promoted values round-trip', () => {
    const { graph, a } = twins();
    a.promoteWidget(scaleOf(a), 'k');
    a.commitDefinition();
    const fn = make(graph, 'graph/function', 0, 600);
    fn.setDefinition(a.properties.subgraph_id);
    expect(fn.widgets.map((w) => w.name)).toEqual(['function', 'call', 'k']);
    fn.widgets.find((w) => w.name === 'k').value = 10;
    const loaded = new LGraph();
    loaded.configure(JSON.parse(JSON.stringify(graph.serialize())));
    const copy = loaded.getNodeById(fn.id);
    expect(copy.widgets.find((w) => w.name === 'k').value).toBe(10);
    loaded.getNodeById(graph._nodes.find((n) => n.type === 'sgp/src').id).connect(0, copy, copy.findInputSlot('x'));
    loaded.runStep(1);
    copy.call();
    expect(copy.getOutputData(copy.findOutputSlot('y'))).toBe(30);
});

test('inside a subgraph, the node menu offers to promote and unpromote widgets', () => {
    const dom = new JSDOM('<main></main>');
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => k in t ? t[k] : () => ({ width: 0 }), set: (t, k, v) => { t[k] = v; return true; } });
    try {
        const { graph, a } = twins();
        const el = document.createElement('canvas'); document.querySelector('main').appendChild(el);
        const canvas = new LGraphCanvas(el, graph, { skip_render: true });
        canvas.openSubgraph(a.subgraph);
        const entry = canvas.getNodeMenuOptions(scaleOf(a)).find((o) => o?.content === 'Promote widget "k"');
        expect(entry).toBeTruthy();
        entry.callback();
        expect(a.widgets.some((w) => w.name === 'k')).toBe(true);
        expect(canvas.getNodeMenuOptions(scaleOf(a)).some((o) => o?.content === 'Unpromote widget "k"')).toBe(true);
    } finally { dom.window.close(); delete globalThis.window; delete globalThis.document; }
});
