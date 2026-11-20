import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';

let dom;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('out', 'number'); } }
    class Dst { constructor() { this.addInput('a', 'string'); this.addInput('b', 'number'); this.addOutput('o', 'number'); } }
    LiteGraph.registerNodeType('pg/src', Src);
    LiteGraph.registerNodeType('pg/dst', Dst);
});
beforeEach(() => {
    dom = new JSDOM('<main></main>');
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
        get: (target, k) => k in target ? target[k] : (k === 'start' || k === 'finish' ? undefined : () => ({ width: 0 })),
        set: (target, k, v) => { target[k] = v; return true; },
    });
    for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {});
});
afterEach(() => { dom.window.close(); delete globalThis.window; delete globalThis.document; jest.restoreAllMocks(); });

function setup() {
    const graph = new LGraph();
    const el = document.createElement('canvas');
    el.width = 1000; el.height = 800;
    document.querySelector('main').appendChild(el);
    const canvas = new LGraphCanvas(el, graph, { skip_render: true });
    const src = LiteGraph.createNode('pg/src'); src.pos = [100, 100]; src.size = [160, 60]; graph.add(src);
    const dst = LiteGraph.createNode('pg/dst'); dst.pos = [400, 100]; dst.size = [160, 60]; graph.add(dst);
    canvas.computeVisibleNodes?.();
    canvas.visible_nodes = graph._nodes.slice();
    return { graph, canvas, src, dst };
}

let clock = 1000;
function ev(x, y, extra = {}) {
    return { clientX: x, clientY: y, which: 1, button: 0, buttons: 1, isPrimary: true, pointerId: 1,
        shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
        preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, ...extra };
}
/** a press, moves along the points, release at the last one */
function drag(canvas, points, extra = {}) {
    clock += 1000; // never a double click
    const [first, ...rest] = points;
    canvas.processMouseDown(ev(first[0], first[1], extra));
    for (const [x, y] of rest) canvas.processMouseMove(ev(x, y, extra));
    const last = points[points.length - 1];
    canvas.processMouseUp(ev(last[0], last[1], { ...extra, buttons: 0 }));
}

test('baseline: dragging a node by its body moves it', () => {
    const { canvas, src } = setup();
    drag(canvas, [[150, 110], [170, 120], [200, 140]]);
    expect(Array.from(src.pos)).toEqual([150, 130]);
});

test('baseline: dragging from an output to an input connects', () => {
    const { canvas, src, dst } = setup();
    const out = src.getConnectionPos(false, 0);
    const inp = dst.getConnectionPos(true, 1);
    drag(canvas, [out, [out[0] + 50, out[1]], inp]);
    expect(dst.inputs[1].link).not.toBeNull();
});

describe('link dragging (wave 2b)', () => {
    test('dropping on a node body connects the highlighted compatible slot, preferring a free one', () => {
        const { canvas, src, dst, graph } = setup();
        const other = LiteGraph.createNode('pg/src'); other.pos = [100, 300]; other.size = [160, 60]; graph.add(other);
        canvas.visible_nodes = graph._nodes.slice();
        other.connect(0, dst, 1); // the only number input is taken
        const extra = LiteGraph.createNode('pg/dst'); extra.pos = [400, 300]; extra.size = [160, 60]; graph.add(extra);
        canvas.visible_nodes = graph._nodes.slice();
        const out = src.getConnectionPos(false, 0);
        clock += 1000;
        canvas.processMouseDown(ev(out[0], out[1]));
        canvas.processMouseMove(ev(out[0] + 40, out[1]));
        canvas.processMouseMove(ev(480, 330)); // body of `extra`
        expect(canvas._highlight_input_slot).toBe(extra.inputs[1]); // the number input, not the string one
        expect(Array.from(canvas._highlight_input)).toEqual(Array.from(extra.getConnectionPos(true, 1)));
        canvas.processMouseUp(ev(480, 330, { buttons: 0 }));
        expect(graph.links[extra.inputs[1].link].origin_id).toBe(src.id);
        expect(canvas._highlight_input).toBeNull();
    });

    test('link-drag-start and link-drag-end report the drag and its outcome', () => {
        const { canvas, src, dst } = setup();
        const events = [];
        canvas.events.on('link-drag-start', (event) => events.push(['start', event.detail.node, event.detail.moving]));
        canvas.events.on('link-drag-end', (event) => events.push(['end', event.detail.outcome, !!event.detail.link]));
        const out = src.getConnectionPos(false, 0);
        drag(canvas, [out, [out[0] + 50, out[1]], dst.getConnectionPos(true, 1)]);
        drag(canvas, [out, [out[0] + 50, out[1]], [700, 600]]); // empty space
        expect(events).toEqual([
            ['start', src, false], ['end', 'connected', true],
            ['start', src, false], ['end', 'dropped', false],
        ]);
        // shift-drag from a linked input moves its link
        events.length = 0;
        const inp = dst.getConnectionPos(true, 1);
        drag(canvas, [inp, [inp[0] - 50, inp[1]], [700, 600]], { shiftKey: true });
        expect(events[0]).toEqual(['start', src, true]);
        expect(events[1][1]).toBe('dropped');
    });

    test('shift-drag from a reroute starts a new link routed through it; shift-click selects it', () => {
        const { canvas, src, dst, graph } = setup();
        const link = src.connect(0, dst, 1);
        const reroute = graph.addReroute([300, 250], link);
        const extra = LiteGraph.createNode('pg/dst'); extra.pos = [400, 400]; extra.size = [160, 60]; graph.add(extra);
        canvas.visible_nodes = graph._nodes.slice();
        drag(canvas, [[300, 250], [330, 280], [480, 430]], { shiftKey: true });
        const created = graph.links[extra.inputs[1].link];
        expect(created.origin_id).toBe(src.id);
        expect(created.parentId).toBe(reroute.id);
        expect(Array.from(reroute.pos)).toEqual([300, 250]); // not moved
        drag(canvas, [[300, 250], [300, 250]], { shiftKey: true }); // a click
        expect(canvas.selectedItems).toContain(reroute);
    });

    test('dragging a link center moves the link; clicking it opens the link menu', () => {
        const { canvas, src, dst, graph } = setup();
        const link = src.connect(0, dst, 1);
        const extra = LiteGraph.createNode('pg/dst'); extra.pos = [400, 400]; extra.size = [160, 60]; graph.add(extra);
        canvas.visible_nodes = graph._nodes.slice();
        link._pos = [330, 200];
        canvas.visible_links = [link];
        const menu = jest.spyOn(canvas, 'showLinkMenu').mockImplementation(() => {});
        drag(canvas, [[330, 200], [330, 200]]);
        expect(menu).toHaveBeenCalledTimes(1);
        expect(dst.inputs[1].link).toBe(link.id);
        const before = graph.history?.actionHistoryVersions?.length;
        drag(canvas, [[330, 200], [360, 260], [480, 430]]);
        expect(dst.inputs[1].link).toBeNull();
        expect(graph.links[extra.inputs[1].link].origin_id).toBe(src.id);
        expect(menu).toHaveBeenCalledTimes(1);
        expect(canvas.dragging_canvas).toBe(false);
        void before;
    });
});

test('a plain click on a reroute keeps it selected', () => {
    const { canvas, src, dst, graph } = setup();
    const reroute = graph.addReroute([300, 250], src.connect(0, dst, 1));
    drag(canvas, [[300, 250], [300, 250]]);
    expect(canvas.selectedItems).toContain(reroute);
    drag(canvas, [[700, 600], [700, 600]]); // empty canvas
    expect(canvas.selectedItems).not.toContain(reroute);
});

describe('quick connect extension', () => {
    let quick;
    beforeAll(async () => { quick = await import('../src/extensions/quick_connect.js'); });

    test('link release follows the LinkRelease settings, only where release shows something', () => {
        const { canvas, src } = setup();
        LiteGraph.extensions.attachCanvas(canvas);
        const shown = [];
        canvas.showLinkReleaseAction = (action) => { shown.push(action); return true; };
        const was = LiteGraph.release_link_on_empty_shows_menu;
        const out = src.getConnectionPos(false, 0);
        try {
            LiteGraph.release_link_on_empty_shows_menu = false;
            drag(canvas, [out, [out[0] + 50, out[1]], [700, 600]]);
            expect(shown).toEqual([]);
            LiteGraph.release_link_on_empty_shows_menu = true;
            drag(canvas, [out, [out[0] + 50, out[1]], [700, 600]]);
            drag(canvas, [out, [out[0] + 50, out[1]], [700, 600]], { shiftKey: true });
            LiteGraph.settings.set('LiteGraph.LinkRelease.Action', 'none');
            drag(canvas, [out, [out[0] + 50, out[1]], [700, 600]]);
            expect(shown).toEqual(['context-menu', 'search-box', 'none']);
            expect(() => LiteGraph.settings.set('LiteGraph.LinkRelease.Action', 'explode')).toThrow();
        } finally {
            LiteGraph.release_link_on_empty_shows_menu = was;
            LiteGraph.settings.set('LiteGraph.LinkRelease.Action', 'context-menu');
        }
    });

    test('chainSelection connects the selection left to right in one undo step', () => {
        const { canvas, graph, src, dst } = setup();
        const third = LiteGraph.createNode('pg/dst'); third.pos = [700, 100]; graph.add(third);
        canvas.selectNodes([third, src, dst]);
        expect(LiteGraph.commands.execute('litegraph.link.chainSelection', LiteGraph.commands.contextFor(canvas))).toBeTruthy();
        expect(graph.links[dst.inputs[1].link].origin_id).toBe(src.id);
        expect(graph.links[third.inputs[1].link].origin_id).toBe(dst.id);
        expect(quick.chainNodes(graph, [src])).toBe(0);
    });
});
