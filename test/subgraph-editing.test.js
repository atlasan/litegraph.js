import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import '../src/extensions/subgraph_tools.js';
import { unusedDefinitionIds } from '../src/extensions/subgraph_tools.js';

/** Subgraph authoring on the canvas (Wave 3b, steps 6-7): breadcrumb, commands, interface editing. */

let dom;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('v', 'number'); this.addProperty('v', 3); } onExecute() { this.setOutputData(0, this.properties.v); } }
    class Sub { constructor() { this.addInput('a', 'number'); this.addInput('b', 'number'); this.addOutput('d', 'number'); } onExecute() { this.setOutputData(0, (this.getInputData(0) ?? 0) - (this.getInputData(1) ?? 0)); } }
    class Sink { constructor() { this.addInput('in', 'number'); this.value = undefined; } onExecute() { this.value = this.getInputData(0); } }
    for (const [type, cls] of Object.entries({ src: Src, sub: Sub, sink: Sink })) LiteGraph.registerNodeType(`sge/${type}`, cls);
});
beforeEach(() => {
    dom = new JSDOM('<main></main>');
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
        get: (target, k) => k in target ? target[k] : (k === 'measureText' ? (text) => ({ width: String(text).length * 10 }) : () => ({ width: 0 })),
        set: (target, k, v) => { target[k] = v; return true; },
    });
    for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {});
});
afterEach(() => { dom.window.close(); delete globalThis.window; delete globalThis.document; jest.restoreAllMocks(); });

const make = (graph, type, x = 0, y = 0) => { const n = LiteGraph.createNode(`sge/${type}`); n.pos = [x, y]; graph.add(n); return n; };
const run = (graph, steps = 3) => { for (let i = 0; i < steps; i++) graph.runStep(1); };
const ioNodes = (sub, type) => sub.subgraph._nodes.filter((n) => n.type === type);

function canvasFor(graph) {
    const el = document.createElement('canvas');
    el.width = 1000; el.height = 800;
    document.querySelector('main').appendChild(el);
    return new LGraphCanvas(el, graph, { skip_render: true });
}

/** a - b computed in a subgraph: two sources 10 and 3, one sink */
function difference() {
    const graph = new LGraph();
    const a = make(graph, 'src', 0, 0), b = make(graph, 'src', 0, 100);
    a.properties.v = 10;
    const sub = make(graph, 'sub', 200, 0), sink = make(graph, 'sink', 400, 0);
    a.connect(0, sub, 0); b.connect(0, sub, 1); sub.connect(0, sink, 0);
    const node = graph.convertToSubgraph([sub]);
    graph.serialize();
    return { graph, a, b, node, sink };
}

describe('breadcrumb', () => {
    test('shows the open path; clicking an outer level leaves down to it and commits', () => {
        const { graph, node } = difference();
        node.title = 'Outer';
        const inner = node.subgraph.convertToSubgraph([node.subgraph._nodes.find((n) => n.type === 'sge/sub')]);
        inner.title = 'Inner';
        const canvas = canvasFor(graph);
        expect(canvas.getBreadcrumb()).toEqual([]);
        canvas.openSubgraph(node.subgraph);
        canvas.openSubgraph(inner.subgraph);
        expect(canvas.getBreadcrumb().map((s) => s.title)).toEqual(['Root', 'Outer', 'Inner']);
        canvas.drawBreadcrumb(canvas.canvas.getContext('2d'));
        const rects = canvas._breadcrumb_rects;
        expect(rects.map((r) => r.level)).toEqual([0, 1]); // the current level is not a button
        const [x, y, w, h] = rects[0].rect;
        expect(canvas.getBreadcrumbAt(x + w / 2, y + h / 2)).toBe(0);
        expect(canvas.getBreadcrumbAt(x - 50, y + h / 2)).toBeNull();
        const commit = jest.spyOn(node, 'commitDefinition');
        canvas.processMouseDown({ clientX: x + w / 2, clientY: y + h / 2, which: 1, button: 0, buttons: 1, isPrimary: true, pointerId: 1,
            preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} });
        expect(canvas.graph).toBe(graph);
        expect(commit).toHaveBeenCalled();
    });
});

describe('commands', () => {
    test('convert, open, close, make unique, unpack and remove unused definitions', () => {
        const graph = new LGraph();
        const a = make(graph, 'src', 0, 0), sub = make(graph, 'sub', 200, 0), sink = make(graph, 'sink', 400, 0);
        a.connect(0, sub, 0); sub.connect(0, sink, 0);
        const canvas = canvasFor(graph);
        const exec = (id) => LiteGraph.commands.execute(id, LiteGraph.commands.contextFor(canvas));
        const enabled = (id) => LiteGraph.commands.isEnabled(id, LiteGraph.commands.contextFor(canvas));
        canvas.selectNodes([sub]);
        exec('litegraph.subgraph.convert');
        const node = graph._nodes.find((n) => n.type === 'graph/subgraph');
        expect(node).toBeTruthy();
        canvas.selectNodes([node]);
        expect(enabled('litegraph.subgraph.makeUnique')).toBe(false); // not linked to anything
        exec('litegraph.subgraph.open');
        expect(canvas.graph).toBe(node.subgraph);
        expect(enabled('litegraph.subgraph.close')).toBe(true);
        exec('litegraph.subgraph.closeAll');
        expect(canvas.graph).toBe(graph);
        const twin = node.clone(); graph.add(twin);
        canvas.selectNodes([twin]);
        exec('litegraph.subgraph.makeUnique');
        expect(twin.properties.subgraph_id).not.toBe(node.properties.subgraph_id);
        graph.remove(twin);
        expect(unusedDefinitionIds(graph)).toEqual([twin.properties.subgraph_id]);
        exec('litegraph.subgraph.removeUnusedDefinitions');
        expect([...graph.subgraphs.keys()]).toEqual([node.properties.subgraph_id]);
        canvas.selectNodes([node]);
        exec('litegraph.subgraph.unpack');
        expect(graph._nodes.some((n) => n.type === 'graph/subgraph')).toBe(false);
        expect(graph._nodes.some((n) => n.type === 'sge/sub')).toBe(true);
    });
});

describe('interface editing', () => {
    test('exposing an inner slot adds an interface input; linked instances get it on commit', () => {
        const graph = new LGraph();
        const a = make(graph, 'src', 0, 0), sub = make(graph, 'sub', 200, 0), sink = make(graph, 'sink', 400, 0);
        a.connect(0, sub, 0); sub.connect(0, sink, 0);
        const node = graph.convertToSubgraph([sub]);
        graph.serialize();
        const twin = node.clone(); graph.add(twin);
        const inner = node.subgraph._nodes.find((n) => n.type === 'sge/sub');
        const io = node.exposeSlot(inner, 1, false);
        expect(io.type).toBe('graph/input');
        expect(io.properties.name).toBe('b');
        expect(node.inputs.map((i) => i.name)).toEqual(['a', 'b']);
        node.commitDefinition();
        expect(twin.inputs.map((i) => i.name)).toEqual(['a', 'b']);
        // an output named like an existing one gets a unique name
        const out = node.exposeSlot(inner, 0, true);
        expect(out.properties.name).toBe('d_2');
    });

    test('reordering interface inputs keeps outer links; the linked instance follows on commit', () => {
        const { graph, a, b, node, sink } = difference();
        const twin = node.clone(); twin.pos = [200, 300]; graph.add(twin);
        const sink2 = make(graph, 'sink', 400, 300);
        a.connect(0, twin, 0); b.connect(0, twin, 1); twin.connect(0, sink2, 0);
        run(graph);
        expect([sink.value, sink2.value]).toEqual([7, 7]);
        const names = node.inputs.map((i) => i.name);
        expect(node.moveInterfaceSlot(true, names[1], -1)).toBe(true);
        expect(node.inputs.map((i) => i.name)).toEqual([names[1], names[0]]);
        expect(graph.links[node.inputs[0].link].origin_id).toBe(b.id);
        expect(graph.links[node.inputs[0].link].target_slot).toBe(0);
        expect(node.moveInterfaceSlot(true, names[1], -1)).toBe(false); // already first
        node.commitDefinition();
        expect(twin.inputs.map((i) => i.name)).toEqual([names[1], names[0]]);
        expect(graph.links[twin.inputs[0].link].origin_id).toBe(b.id);
        run(graph);
        expect([sink.value, sink2.value]).toEqual([7, 7]);
        expect(graph.validateLinks().ok).toBe(true);
        expect(graph.serialize({ format: 'definitions' }).definitions.subgraphs[0].inputs.map((i) => i.name)).toEqual([names[1], names[0]]);
    });

    test('an interface name used by another slot is refused', () => {
        const { node } = difference();
        const [first, second] = ioNodes(node, 'graph/input');
        second.setProperty('name', first.properties.name);
        expect(second.properties.name).not.toBe(first.properties.name);
        expect(node.inputs.map((i) => i.name).sort()).toEqual([first.properties.name, second.properties.name].sort());
    });

    test('inside a subgraph, the link release menu offers to expose the slot', () => {
        const graph = new LGraph();
        const sub = make(graph, 'sub', 200, 0);
        const node = graph.convertToSubgraph([sub]);
        const canvas = canvasFor(graph);
        canvas.openSubgraph(node.subgraph);
        const inner = node.subgraph._nodes.find((n) => n.type === 'sge/sub');
        let captured;
        const original = LiteGraph.ContextMenu;
        LiteGraph.ContextMenu = (options, settings) => { captured = { options, settings }; return {}; };
        try {
            canvas.showConnectionMenu({ nodeFrom: inner, slotFrom: inner.outputs[0], e: { canvasX: 600, canvasY: 50 } });
        } finally { LiteGraph.ContextMenu = original; }
        expect(captured.options).toContain('Add subgraph output');
        captured.settings.callback('Add subgraph output', {}, {});
        expect(node.outputs.map((o) => o.name)).toEqual(['d']);
        expect(Array.from(ioNodes(node, 'graph/output')[0].pos)).toEqual([600, 50]);
    });
});

describe('path ids', () => {
    test('getPath and resolvePath address nodes across levels', () => {
        const { graph, node } = difference();
        const innerSub = node.subgraph._nodes.find((n) => n.type === 'sge/sub');
        const nested = node.subgraph.convertToSubgraph([innerSub]);
        const deepest = nested.subgraph._nodes.find((n) => n.type === 'sge/sub');
        expect(node.getPath()).toBe(String(node.id));
        expect(deepest.getPath()).toBe(`${node.id}:${nested.id}:${deepest.id}`);
        expect(graph.resolvePath(deepest.getPath())).toBe(deepest);
        expect(nested.subgraph.resolvePath(deepest.getPath())).toBe(deepest); // always from the root
        expect(graph.resolvePath(`${node.id}:999`)).toBeNull();
        expect(graph.resolvePath('')).toBeNull();
    });

    test('an error inside a subgraph reaches the outer graph with the inner node and its path', () => {
        const { graph, node } = difference();
        const inner = node.subgraph._nodes.find((n) => n.type === 'sge/sub');
        inner.onExecute = () => { throw new Error('boom'); };
        const seen = [];
        graph.events.on('node-error', (e) => seen.push(e.detail));
        expect(() => graph.runStep(1, true)).toThrow('boom');
        expect(seen).toHaveLength(1);
        expect(seen[0].node).toBe(inner);
        expect(seen[0].path).toBe(`${node.id}:${inner.id}`);
    });
});
