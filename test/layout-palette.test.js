import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { LayoutRegistry } from '../src/layout.js';
import '../src/nodes/base.js';
import '../src/nodes/math.js';
import '../src/extensions/view_tools.js';

/** Auto-layout and the node palette (Wave 4d, plan steps 15-16). */

class Src { constructor() { this.addOutput('v', 'number'); } }
class Mid { constructor() { this.addInput('in', 'number'); this.addOutput('out', 'number'); } }
class Sink { constructor() { this.addInput('in', 'number'); } }

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    LiteGraph.registerNodeType('ly/src', Src);
    LiteGraph.registerNodeType('ly/mid', Mid);
    LiteGraph.registerNodeType('ly/sink', Sink);
});
beforeEach(() => { for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {}); });
afterEach(() => {
    jest.restoreAllMocks();
    LiteGraph.actionHistory_enabled = false;
    LiteGraph.settings.set('LiteGraph.Palette.Favorites', []);
    LiteGraph.settings.set('LiteGraph.Palette.Recent', []);
});

const make = (graph, type, x = 0, y = 0) => { const n = LiteGraph.createNode(type); n.pos = [x, y]; graph.add(n); return n; };

/** a chain src → mid → sink placed badly, plus a lone node */
function chain() {
    const graph = new LGraph();
    const src = make(graph, 'ly/src', 500, 400);
    const mid = make(graph, 'ly/mid', 100, 100);
    const sink = make(graph, 'ly/sink', 300, 50);
    src.connect(0, mid, 0);
    mid.connect(0, sink, 0);
    return { graph, src, mid, sink };
}

describe('auto-layout (step 15)', () => {
    test.each(['dagre', 'layered'])('%s orders a chain left to right as one undo step', async (engine) => {
        const { graph, src, mid, sink } = chain();
        LiteGraph.actionHistory_enabled = true;
        make(graph, 'ly/src', 0, 600); // an earlier change, so undo has a baseline
        const before = graph._nodes.map((n) => [n.id, ...n.pos]);
        const result = await graph.autoLayout({ engine });
        expect(result).toEqual({ engine, moved: 4 });
        expect(src.pos[0]).toBeLessThan(mid.pos[0]);
        expect(mid.pos[0]).toBeLessThan(sink.pos[0]);
        // nothing overlaps
        const boxes = graph._nodes.map((n) => [n.pos[0], n.pos[1] - LiteGraph.NODE_TITLE_HEIGHT, n.size[0], n.size[1] + LiteGraph.NODE_TITLE_HEIGHT]);
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
            const [a, b] = [boxes[i], boxes[j]];
            expect(a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]).toBe(false);
        }
        graph.actionHistoryBack();
        expect(graph._nodes.map((n) => [n.id, ...n.pos])).toEqual(before);
    });

    test('selection scope moves only the selection, anchored at its corner; pinned nodes stay; reroutes and groups follow', async () => {
        const { graph, src, mid, sink } = chain();
        const other = make(graph, 'ly/src', 900, 900);
        const reroute = graph.addReroute([200, 300], graph.links[mid.inputs[0].link]);
        const group = new LiteGraph.LGraphGroup();
        graph.add(group);
        group.resizeTo([src, mid]);
        const corner = [Math.min(src.pos[0], mid.pos[0]), Math.min(src.pos[1], mid.pos[1])];
        sink.flags.pinned = true;
        await graph.autoLayout({ engine: 'layered', nodes: [src, mid, sink] });
        expect(other.pos).toEqual(expect.objectContaining({ 0: 900, 1: 900 }));
        expect(Array.from(sink.pos)).toEqual([300, 50]);
        expect(Math.min(src.pos[0], mid.pos[0])).toBe(corner[0]);
        expect(Math.min(src.pos[1], mid.pos[1])).toBe(corner[1]);
        expect(src.pos[0]).toBeLessThan(mid.pos[0]);
        expect(Array.from(reroute.pos)).not.toEqual([200, 300]);
        expect(group.pos[0]).toBeLessThanOrEqual(src.pos[0]);
        expect(group.pos[0] + group.size[0]).toBeGreaterThanOrEqual(mid.pos[0] + mid.size[0]);
    });

    test('engines: register, ELK adapter, unknown engine and a library that cannot load name the way out', async () => {
        const { graph, src, mid } = chain();
        const elk = { layout: jest.fn(async (g) => ({ children: g.children.map((c, i) => ({ id: c.id, x: i * 300, y: 0 })) })) };
        const off = LiteGraph.layout.register('elk', LayoutRegistry.elkEngine(elk));
        await graph.autoLayout({ engine: 'elk', direction: 'TB' });
        expect(elk.layout.mock.calls[0][0].layoutOptions['elk.direction']).toBe('DOWN');
        expect(elk.layout.mock.calls[0][0].edges).toHaveLength(2);
        expect(mid.pos[0] - src.pos[0]).toBe(300);
        off();
        await expect(graph.autoLayout({ engine: 'nope' })).rejects.toThrow(/unknown layout engine nope/);
        const offBroken = LiteGraph.layout.register('broken', { library: 'no-such-lib', layout: () => ({ positions: {} }) });
        await expect(graph.autoLayout({ engine: 'broken' })).rejects.toThrow(/could not be loaded.*"layered"/);
        offBroken();
        expect(() => LiteGraph.layout.register('x', {})).toThrow(/layout/);
    });

    test('the command arranges the selection or everything', async () => {
        const { graph, src, mid, sink } = chain();
        LiteGraph.settings.set('LiteGraph.Layout.Engine', 'layered');
        const ctx = { graph, canvas: null, selectedNodes: [] };
        expect(LiteGraph.commands.get('litegraph.layout.auto').label(ctx)).toBe('Arrange all nodes');
        const { result } = LiteGraph.commands.execute('litegraph.layout.auto', ctx);
        expect(await result).toEqual({ engine: 'layered', moved: 3 });
        expect(src.pos[0]).toBeLessThan(mid.pos[0]);
        expect(mid.pos[0]).toBeLessThan(sink.pos[0]);
        LiteGraph.settings.set('LiteGraph.Layout.Engine', 'dagre');
    });
});

describe('node palette (step 16)', () => {
    test('groups by pack and category, searches, favourites and recent persist as settings', () => {
        const palette = LiteGraph.palette;
        const groups = palette.groups();
        const math = groups.find((g) => g.pack.id === 'litegraph/math');
        expect(math.pack.title).toBe('Math');
        expect(math.categories.some((c) => c.items.some((d) => d.type === 'math/operation'))).toBe(true);
        expect(palette.list({ query: 'operation' }).map((d) => d.type)).toContain('math/operation');
        expect(palette.list().some((d) => d.type === 'graph/input')).toBe(false);

        expect(palette.toggleFavorite('math/operation')).toBe(true);
        expect(LiteGraph.settings.get('LiteGraph.Palette.Favorites')).toEqual(['math/operation']);
        expect(palette.list({ favoritesOnly: true }).map((d) => [d.type, d.favorite])).toEqual([['math/operation', true]]);
        palette.toggleFavorite('math/operation');
        expect(palette.favorites()).toEqual([]);

        for (let i = 0; i < 30; i++) palette.recordUse(i % 2 ? 'ly/src' : `x/${i}`);
        expect(palette.recent()[0]).toBe('ly/src');
        expect(palette.recent()).toHaveLength(LiteGraph.palette.constructor.RECENT_LIMIT);
        expect(palette.recent().filter((t) => t === 'ly/src')).toHaveLength(1);
    });

    test('preview from slots; insert is one undo step, selects and records; a drop on the canvas inserts', () => {
        const preview = LiteGraph.palette.preview('ly/mid');
        expect(preview).toEqual(expect.objectContaining({ title: expect.any(String), inputs: [{ name: 'in', type: 'number' }], outputs: [{ name: 'out', type: 'number' }] }));
        const dom = new JSDOM('<main></main>');
        globalThis.window = dom.window; globalThis.document = dom.window.document;
        dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => k in t ? t[k] : () => ({ width: 0 }), set: (t, k, v) => { t[k] = v; return true; } });
        try {
            const graph = new LGraph();
            const element = document.createElement('canvas');
            document.querySelector('main').appendChild(element);
            const canvas = new LGraphCanvas(element, graph, { skip_render: true });
            LiteGraph.actionHistory_enabled = true;
            make(graph, 'ly/src');
            const node = LiteGraph.palette.insert(canvas, 'ly/sink', [120.4, 80.6]);
            expect(Number.isInteger(node.pos[0]) && Number.isInteger(node.pos[1])).toBe(true);
            expect(Math.abs(node.pos[0] - 120) + Math.abs(node.pos[1] - 81)).toBeLessThanOrEqual(1);
            expect(Object.values(canvas.selected_nodes)).toEqual([node]);
            expect(LiteGraph.palette.recent()[0]).toBe('ly/sink');
            graph.actionHistoryBack();
            expect(graph._nodes.some((n) => n.type === 'ly/sink')).toBe(false);

            const data = new Map([[LGraphCanvas.NODE_DRAG_MIME, 'ly/mid']]);
            const drop = { clientX: 50, clientY: 40, preventDefault() {}, stopPropagation() {}, dataTransfer: { types: [...data.keys()], getData: (k) => data.get(k) ?? '', files: [] } };
            expect(canvas.processDrop(drop)).toBe(true);
            expect(graph._nodes.some((n) => n.type === 'ly/mid')).toBe(true);
        } finally {
            dom.window.close(); delete globalThis.window; delete globalThis.document;
        }
    });
});
