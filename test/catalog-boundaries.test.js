import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import '../src/nodes/base.js';
import '../src/nodes/watch.js';
import '../src/nodes/html.js';

/** Catalog cleanup and reroutes across subgraph boundaries (Wave 4e, plan steps 17-18). */

class Src { constructor() { this.addOutput('v', 'number'); this.addProperty('v', 3); } onExecute() { this.setOutputData(0, this.properties.v); } }
class Mid { constructor() { this.addInput('in', 'number'); this.addOutput('out', 'number'); } onExecute() { this.setOutputData(0, (this.getInputData(0) ?? 0) * 2); } }
class Sink { constructor() { this.addInput('in', 'number'); } onExecute() { this.value = this.getInputData(0); } }

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    LiteGraph.registerNodeType('cb/src', Src);
    LiteGraph.registerNodeType('cb/mid', Mid);
    LiteGraph.registerNodeType('cb/sink', Sink);
});
beforeEach(() => { for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {}); });
afterEach(() => { jest.restoreAllMocks(); LiteGraph.actionHistory_enabled = false; });

const make = (graph, type, x = 0, y = 0) => { const n = LiteGraph.createNode(type); n.pos = [x, y]; graph.add(n); return n; };
const doc = (nodes, links = []) => ({ last_node_id: 9, last_link_id: 9, nodes, links, groups: [], config: {}, version: 0.4 });

describe('catalog cleanup (step 17)', () => {
    test('old type names are gone from the registry and load as the new types, without a load error', () => {
        for (const old of ['basic/watch_advanced', 'watch/value']) {
            expect(LiteGraph.registered_node_types[old]).toBeUndefined();
            expect(LiteGraph.getNodeReplacement(old)).toEqual(expect.objectContaining({ auto: true }));
        }
        expect(LiteGraph.getNodeReplacement('jquery/select')).toEqual(expect.objectContaining({ new_type: 'html/dom_selector', auto: false }));

        const graph = new LGraph();
        const error = graph.configure(doc([
            { id: 1, type: 'cb/src', pos: [0, 0], size: [100, 40], flags: {}, mode: 0, outputs: [{ name: 'v', type: 'number', links: [1, 2] }], properties: { v: 3 } },
            { id: 2, type: 'basic/watch_advanced', pos: [200, 0], size: [140, 60], flags: {}, mode: 0, inputs: [{ name: 'value', type: 0, link: 1 }], properties: { font_family: 'Courier', font_size: 18, clip: true } },
            { id: 3, type: 'watch/value', pos: [200, 100], size: [140, 60], flags: {}, mode: 0, inputs: [{ name: 'data', type: '', link: 2 }], properties: { clip_area: false } },
        ], [[1, 1, 0, 2, 0, 'number'], [2, 1, 0, 3, 0, 'number']]));
        expect(error).toBe(false);
        expect(graph.getMissingNodes()).toEqual([]);
        const text = graph.getNodeById(2), tree = graph.getNodeById(3);
        expect([text.type, text.properties.display, text.properties.font_family, text.properties.font_size]).toEqual(['basic/watch', 'text', 'Courier', 18]);
        expect([tree.type, tree.properties.display, tree.properties.clip_area]).toEqual(['basic/watch', 'tree', false]);
        expect(Array.from(text.size)).toEqual([140, 60]); // the saved size is kept
        expect(text.inputs[0].link).toBe(1);
        expect(tree.inputs[0].link).toBe(2);
        const saved = JSON.stringify(graph.serialize());
        expect(saved).not.toMatch(/watch_advanced|watch\/value/);
    });

    test('the watch displays run and draw: value, text, tree', () => {
        const graph = new LGraph();
        const src = make(graph, 'cb/src');
        const watches = ['value', 'text', 'tree'].map((display, i) => {
            const watch = make(graph, 'basic/watch', 200, i * 100);
            watch.setProperty('display', display);
            src.connect(0, watch, 0);
            return watch;
        });
        graph.runStep(2);
        const calls = [];
        const ctx = new Proxy({}, {
            get: (t, k) => (k in t ? t[k] : (...args) => { calls.push(k); return { width: 10 }; }),
            set: (t, k, v) => { t[k] = v; return true; },
        });
        for (const watch of watches) watch.onDrawBackground(ctx, null, null, [0, 0]);
        expect(watches[0].inputs[0].label).toBe('3.000');
        expect(watches[1].value).toBe('3.000');
        expect(watches[1].properties.font_size).toBe(14);
        expect(watches[2].value).toBe(3);
        expect(calls.filter((c) => c === 'fillText').length).toBeGreaterThan(1); // text and tree draw text
        expect(watches[1].getExtraMenuOptions(null).map((o) => o?.content)).toContain('Toggle full');
        expect(watches[0].getExtraMenuOptions(null)).toEqual([]);
    });
});

/** src → [r1 (outside), r2 (inside)] → mid → [r3 (inside), r4 (outside)] → sink; mid and r2, r3 inside the selection box */
function routed() {
    const graph = new LGraph();
    const src = make(graph, 'cb/src', 0, 100);
    const mid = make(graph, 'cb/mid', 400, 100);
    const sink = make(graph, 'cb/sink', 900, 100);
    const a = src.connect(0, mid, 0);
    const b = mid.connect(0, sink, 0);
    graph.addReroute([200, 300], a);
    graph.addReroute([390, 150], a);
    graph.addReroute([440, 110], b);
    graph.addReroute([700, 300], b);
    return { graph, src, mid, sink };
}
const chainPos = (graph, link) => graph.getRerouteChain(link).map((r) => Array.from(r.pos));

describe('reroutes across subgraph boundaries (step 18)', () => {
    test('convert keeps each reroute on the side where it is; unpack joins them again; one undo step', () => {
        const { graph, src, mid, sink } = routed();
        LiteGraph.actionHistory_enabled = true;
        make(graph, 'cb/src', 0, 600); // an earlier change, so undo has a baseline
        const sub = graph.convertToSubgraph([mid]);
        const inLink = graph.links[sub.inputs[0].link];
        const outLink = graph.links[sink.inputs[0].link];
        expect(chainPos(graph, inLink)).toEqual([[200, 300]]);
        expect(chainPos(graph, outLink)).toEqual([[700, 300]]);
        const inner = sub.subgraph;
        const innerMid = inner._nodes.find((n) => n.type === 'cb/mid');
        expect(chainPos(inner, inner.links[innerMid.inputs[0].link])).toEqual([[390, 150]]);
        expect(chainPos(inner, inner.links[innerMid.outputs[0].links[0]])).toEqual([[440, 110]]);
        expect(graph.reroutes.size).toBe(2); // the inside ones left the parent graph
        graph.runStep(2);
        expect(graph.getNodeById(sink.id).value).toBe(6);

        // unpack: one link each way again, through all four points in order
        const [unpacked] = graph.unpackSubgraph(sub);
        const a = graph.links[unpacked.inputs[0].link];
        const b = graph.links[unpacked.outputs[0].links[0]];
        const shift = [unpacked.pos[0] - 400, unpacked.pos[1] - 100];
        expect(chainPos(graph, a)).toEqual([[200, 300], [390 + shift[0], 150 + shift[1]]]);
        expect(chainPos(graph, b)).toEqual([[440 + shift[0], 110 + shift[1]], [700, 300]]);
        expect(graph.reroutes.size).toBe(4);

        // each was one undo step
        graph.actionHistoryBack();
        expect(graph._nodes.some((n) => n.type === 'graph/subgraph')).toBe(true);
        graph.actionHistoryBack();
        expect(graph._nodes.some((n) => n.type === 'graph/subgraph')).toBe(false);
        const restored = graph._nodes.find((n) => n.type === 'cb/mid');
        expect(chainPos(graph, graph.links[restored.inputs[0].link])).toEqual([[200, 300], [390, 150]]);
        expect(src.id).toBeDefined();
    });

    test('an internal link keeps its reroutes inside', () => {
        const graph = new LGraph();
        const a = make(graph, 'cb/src', 0, 0);
        const b = make(graph, 'cb/sink', 300, 0);
        const link = a.connect(0, b, 0);
        graph.addReroute([150, 80], link);
        const sub = graph.convertToSubgraph([a, b]);
        const inner = sub.subgraph;
        const innerLink = Object.values(inner.links).find(Boolean);
        expect(chainPos(inner, innerLink)).toEqual([[150, 80]]);
        expect(graph.reroutes.size).toBe(0);
    });
});
