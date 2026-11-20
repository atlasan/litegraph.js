import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { RenderLink, LinkRouterRegistry, LinkStyleRegistry } from '../src/linkrender.js';
import { MiniMap } from '../src/minimap.js';
import { DragAndScale } from '../src/dragandscale.js';
import '../src/extensions/view_tools.js';

/** Links and view (Wave 4c, plan steps 11-14). */

class Src { constructor() { this.addOutput('v', 'number'); } }
class Sink { constructor() { this.addInput('in', 'number'); } }
class Txt { constructor() { this.addOutput('s', 'string'); } }
class TxtSink { constructor() { this.addInput('in', 'string'); } }

let dom;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    LiteGraph.registerNodeType('lv/src', Src);
    LiteGraph.registerNodeType('lv/sink', Sink);
    LiteGraph.registerNodeType('lv/txt', Txt);
    LiteGraph.registerNodeType('lv/tsink', TxtSink);
});
beforeEach(() => {
    for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {});
    dom = new JSDOM('<main><div id="host" style="position:relative"></div></main>');
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    dom.window.HTMLCanvasElement.prototype.getContext = () => recorder().ctx;
});
afterEach(() => {
    dom.window.close(); delete globalThis.window; delete globalThis.document;
    jest.restoreAllMocks();
    LiteGraph.settings.set('LiteGraph.Canvas.LinkStyles', []);
    LiteGraph.settings.set('LiteGraph.Canvas.HiddenLinkTypes', []);
    LiteGraph.settings.set('LiteGraph.Canvas.Minimap', false);
});

/** a 2D context that records calls */
function recorder() {
    const calls = [];
    const target = { calls, globalAlpha: 1, lineWidth: 1 };
    const ctx = new Proxy(target, {
        get: (t, key) => key in t ? t[key] : (...args) => { calls.push([key, ...args]); return { width: 10 }; },
        set: (t, key, value) => { t[key] = value; calls.push(['set', key, value]); return true; },
    });
    return { ctx, calls };
}

function makeCanvas(graph = new LGraph()) {
    const element = document.createElement('canvas');
    element.width = 800; element.height = 600;
    document.getElementById('host').appendChild(element);
    return new LGraphCanvas(element, graph, { skip_render: true });
}

const make = (graph, type, x = 0, y = 0) => { const n = LiteGraph.createNode(type); n.pos = [x, y]; graph.add(n); return n; };

/** the path the pre-4c renderLink drew for each mode (reference copy of the old code) */
function oldPath(mode, a, b, sd, ed) {
    const out = [];
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const off = (d, k) => [d == LiteGraph.LEFT ? -k : d == LiteGraph.RIGHT ? k : 0, d == LiteGraph.UP ? -k : d == LiteGraph.DOWN ? k : 0];
    if (mode == LiteGraph.SPLINE_LINK) {
        const s = off(sd, dist * 0.25), e = off(ed, dist * 0.25);
        out.push(['moveTo', a[0], a[1]], ['bezierCurveTo', a[0] + s[0], a[1] + s[1], b[0] + e[0], b[1] + e[1], b[0], b[1]]);
    } else if (mode == LiteGraph.LINEAR_LINK) {
        const s = off(sd, 15), e = off(ed, 15);
        out.push(['moveTo', a[0], a[1]], ['lineTo', a[0] + s[0], a[1] + s[1]], ['lineTo', b[0] + e[0], b[1] + e[1]], ['lineTo', b[0], b[1]]);
    } else {
        let sx = a[0], sy = a[1], ex = b[0], ey = b[1];
        if (sd == LiteGraph.RIGHT) sx += 10; else sy += 10;
        if (ed == LiteGraph.LEFT) ex -= 10; else ey -= 10;
        out.push(['moveTo', a[0], a[1]], ['lineTo', sx, sy], ['lineTo', (sx + ex) * 0.5, sy], ['lineTo', (sx + ex) * 0.5, ey], ['lineTo', ex, ey], ['lineTo', b[0], b[1]]);
    }
    return out;
}

describe('routers and RenderLink (step 11)', () => {
    test.each([['spline', LiteGraph.SPLINE_LINK], ['linear', LiteGraph.LINEAR_LINK], ['straight', LiteGraph.STRAIGHT_LINK]])('%s draws the same path as before', (name, mode) => {
        const canvas = makeCanvas();
        canvas.links_render_mode = mode;
        expect(LinkRouterRegistry.nameForMode(mode)).toBe(name);
        for (const [a, b, sd, ed] of [[[0, 0], [200, 80], LiteGraph.RIGHT, LiteGraph.LEFT], [[50, 300], [10, 20], LiteGraph.DOWN, LiteGraph.UP]]) {
            const { ctx, calls } = recorder();
            canvas.renderLink(ctx, a, b, null, true, 0, '#fff', sd, ed);
            const path = calls.filter((c) => ['moveTo', 'lineTo', 'bezierCurveTo'].includes(c[0]));
            const expected = oldPath(mode, a, b, sd, ed);
            expect(path).toHaveLength(expected.length);
            path.forEach((call, i) => call.slice(1).forEach((v, j) => expect(v).toBeCloseTo(expected[i][j + 1], 9)));
        }
    });

    test('a registered router draws; the link centre follows it; the disposer restores the built-in', () => {
        const canvas = makeCanvas();
        const dispose = LiteGraph.linkRouters.register('diagonal', {
            path(ctx, rl) { ctx.moveTo(rl.a[0], rl.a[1]); ctx.lineTo(rl.b[0], rl.b[1]); },
            point(rl, t) { return [rl.a[0] + (rl.b[0] - rl.a[0]) * t, rl.a[1] + (rl.b[1] - rl.a[1]) * t]; },
        });
        canvas.link_router = 'diagonal';
        const link = { id: 9, type: 'number', _pos: new Float32Array(2) };
        const { ctx, calls } = recorder();
        canvas.renderLink(ctx, [0, 0], [100, 50], link, true, 0, null);
        expect(calls.filter((c) => c[0] === 'lineTo')).toEqual([['lineTo', 100, 50]]);
        expect(Array.from(link._pos)).toEqual([50, 25]);
        expect(canvas.computeConnectionPoint([0, 0], [100, 0], 0.25)).toEqual([25, 0]);
        dispose();
        expect(LiteGraph.linkRouters.get('diagonal')).toBeNull();
        expect(canvas.getLinkRouter()).toBe(LiteGraph.linkRouters.get('spline')); // unknown name falls back to the mode
        expect(() => LiteGraph.linkRouters.register('bad', {})).toThrow(/path/);
        expect(new RenderLink({ a: [0, 0], b: [3, 4] }).length).toBe(5);
    });
});

describe('link styles (step 12)', () => {
    test('composition: alpha multiplies, later fields win, hidden wins', () => {
        const styles = new LinkStyleRegistry();
        styles.register('half', () => ({ alpha: 0.5, color: '#f00' }));
        styles.register('blue', () => ({ alpha: 0.5, color: '#00f', width: 5 }));
        styles.register('gone', () => ({ visible: false }));
        const rl = new RenderLink({ a: [0, 0], b: [1, 1], link: { id: 1, type: 'number' } });
        expect(styles.resolve(rl, {}, ['half', 'blue'])).toEqual({ visible: true, alpha: 0.25, color: '#00f', width: 5 });
        expect(styles.resolve(rl, {}, ['half', 'gone']).visible).toBe(false);
        expect(styles.resolve(rl, {}, ['missing'])).toBeNull();
    });

    test('hidden links are neither drawn nor hit-testable; spotlight and labels on the canvas', () => {
        const graph = new LGraph();
        const canvas = makeCanvas(graph);
        const a = make(graph, 'lv/src'), b = make(graph, 'lv/sink', 300);
        const t = make(graph, 'lv/txt', 0, 200), c = make(graph, 'lv/tsink', 300, 200);
        const numberLink = a.connect(0, b, 0);
        const textLink = t.connect(0, c, 0);
        expect(textLink).toBeTruthy();
        canvas.visible_area.set([-1000, -1000, 4000, 4000]);

        LiteGraph.settings.set('LiteGraph.Canvas.LinkStyles', ['hidden']);
        LiteGraph.settings.set('LiteGraph.Canvas.HiddenLinkTypes', ['string']);
        canvas.frame++;
        canvas.visible_links.length = 0;
        canvas.drawConnections(recorder().ctx);
        expect(canvas.visible_links).toEqual([numberLink]);

        LiteGraph.settings.set('LiteGraph.Canvas.LinkStyles', ['spotlight', 'labelled']);
        canvas.selectNodes([a]);
        canvas.frame++;
        expect(canvas.resolveLinkStyle(new RenderLink({ a: [0, 0], b: [1, 1], link: numberLink }))).toEqual(expect.objectContaining({ alpha: 1, label: 'number' }));
        expect(canvas.resolveLinkStyle(new RenderLink({ a: [0, 0], b: [1, 1], link: textLink }))).toEqual(expect.objectContaining({ alpha: 0.15, label: 'string' }));
        const { ctx, calls } = recorder();
        canvas.renderLink(ctx, [0, 0], [200, 0], numberLink, true, 0, null);
        expect(calls.some((c) => c[0] === 'fillText' && c[1] === 'number')).toBe(true);
    });

    test('dim-by-type uses the focused type; the view commands toggle the setting', () => {
        const canvas = makeCanvas();
        LiteGraph.settings.set('LiteGraph.Canvas.LinkStyles', ['dim-by-type']);
        canvas.link_type_focus = 'number';
        canvas.frame++;
        expect(canvas.resolveLinkStyle(new RenderLink({ a: [0, 0], b: [1, 1], link: { id: 1, type: 'string' } }))?.alpha).toBe(0.2);
        expect(canvas.resolveLinkStyle(new RenderLink({ a: [0, 0], b: [1, 1], link: { id: 2, type: 'number' } }))).toBeNull();
        const ctx = LiteGraph.commands.contextFor(canvas);
        LiteGraph.commands.execute('litegraph.links.spotlight', ctx);
        expect(LiteGraph.settings.get('LiteGraph.Canvas.LinkStyles')).toEqual(['dim-by-type', 'spotlight']);
        LiteGraph.commands.execute('litegraph.links.spotlight', ctx);
        expect(LiteGraph.settings.get('LiteGraph.Canvas.LinkStyles')).toEqual(['dim-by-type']);
    });
});

describe('minimap (step 13)', () => {
    test('redraws on events (coalesced per frame), not on a timer; layers; click centres the view', () => {
        const frames = [];
        dom.window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
        const graph = new LGraph();
        const canvas = makeCanvas(graph);
        canvas.ds.computeVisibleArea(canvas.viewport);
        make(graph, 'lv/src', 0, 0);
        make(graph, 'lv/sink', 1000, 600);
        jest.useFakeTimers({ doNotFake: ['performance', 'requestAnimationFrame'] });
        try {
            const minimap = canvas.showMinimap({ width: 200, height: 120 });
            expect(minimap.element.parentNode).toBe(document.getElementById('host'));
            const base = minimap.redraws;
            jest.advanceTimersByTime(10000);
            expect(minimap.redraws).toBe(base); // no timer
            make(graph, 'lv/src', 500, 300);
            canvas.ds.offset[0] += 50; canvas._checkViewportChanged();
            expect(frames).toHaveLength(1); // two events, one frame
            frames.shift()();
            expect(minimap.redraws).toBe(base + 1);

            const seen = [];
            const off = minimap.addLayer('probe', (ctx, map) => seen.push(map.toMap([0, 0])));
            frames.shift()();
            expect(seen).toHaveLength(1);
            off();

            const target = minimap.toMap([1000, 600]);
            minimap.centerOnMapPoint(target[0], target[1]);
            canvas.ds.computeVisibleArea(canvas.viewport);
            const area = canvas.visible_area;
            expect(area[0] + area[2] / 2).toBeCloseTo(1000, 0);
            expect(area[1] + area[3] / 2).toBeCloseTo(600, 0);

            canvas.hideMinimap();
            expect(document.querySelector('.litegraph-minimap')).toBeNull();
        } finally {
            jest.useRealTimers();
        }
    });

    test('the toggle command remembers the choice; dispose removes the minimap', () => {
        const canvas = makeCanvas();
        const ctx = LiteGraph.commands.contextFor(canvas);
        LiteGraph.commands.execute('litegraph.canvas.toggleMinimap', ctx);
        expect(canvas.minimap).toBeInstanceOf(MiniMap);
        expect(LiteGraph.settings.get('LiteGraph.Canvas.Minimap')).toBe(true);
        canvas.dispose();
        expect(document.querySelector('.litegraph-minimap')).toBeNull();
    });
});

describe('pointer (step 14)', () => {
    test('panning is a CanvasPointer gesture; a click on empty canvas still deselects', () => {
        const graph = new LGraph();
        const canvas = makeCanvas(graph);
        const node = make(graph, 'lv/src', 100, 100);
        canvas.selectNodes([node]);
        const ev = (type, x, y) => ({ type, clientX: x, clientY: y, which: 1, button: 0, buttons: type === 'pointerup' ? 0 : 1, isPrimary: true, pointerId: 1,
            shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} });
        canvas.pointer.lastClick = null;
        canvas.processMouseDown(ev('pointerdown', 600, 500));
        expect(canvas.pointer.hasHandlers).toBe(true);
        const start = Array.from(canvas.ds.offset);
        canvas.processMouseMove(ev('pointermove', 640, 520));
        canvas.processMouseMove(ev('pointermove', 660, 530));
        canvas.processMouseUp(ev('pointerup', 660, 530));
        expect(canvas.ds.offset[0] - start[0]).toBeCloseTo(60 / canvas.ds.scale, 5);
        expect(canvas.ds.offset[1] - start[1]).toBeCloseTo(30 / canvas.ds.scale, 5);
        expect(canvas.dragging_canvas).toBe(false);
        expect(Object.keys(canvas.selected_nodes)).toHaveLength(1); // a drag keeps the selection

        canvas.pointer.lastClick = null;
        canvas.processMouseDown(ev('pointerdown', 600, 500));
        canvas.processMouseUp(ev('pointerup', 600, 500));
        expect(Object.keys(canvas.selected_nodes)).toHaveLength(0);
    });

    test('DragAndScale listeners are removable and the canvas binds none', () => {
        const element = document.createElement('div');
        const added = [], removedBySignal = [];
        const add = element.addEventListener.bind(element);
        element.addEventListener = (type, fn, options) => { added.push(type); options?.signal?.addEventListener('abort', () => removedBySignal.push(type)); add(type, fn, options); };
        const ds = new DragAndScale(element);
        expect(added).toEqual(['pointerdown', 'wheel']);
        ds.unbindEvents();
        expect(removedBySignal).toEqual(['pointerdown', 'wheel']);
        const canvas = makeCanvas();
        expect(canvas.ds._events ?? null).toBeNull();
    });
});
