import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';

let dom;
beforeAll(async () => { LiteGraph.initialize(); await LiteGraph.LibraryManager.ready; });
beforeEach(() => {
    dom = new JSDOM('<main></main>');
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {});
    // jsdom has no 2D context; drawing is outside these lifecycle tests
    dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
        get: (target, key) => key in target ? target[key] : (key === 'start' || key === 'finish' ? undefined : () => ({ width: 0 })),
        set: (target, key, value) => { target[key] = value; return true; },
    });
});
afterEach(() => {
    dom.window.close(); delete globalThis.window; delete globalThis.document;
    jest.restoreAllMocks();
});

function element() {
    const el = document.createElement('canvas');
    document.querySelector('main').appendChild(el);
    return el;
}
function listenerSpy(el) {
    const live = new Map();
    const add = el.addEventListener.bind(el), remove = el.removeEventListener.bind(el);
    el.addEventListener = (type, fn, opts) => { live.set(type + ':' + (fn?.name || ''), (live.get(type + ':' + (fn?.name || '')) || 0) + 1); add(type, fn, opts); };
    el.removeEventListener = (type, fn, opts) => { const k = type + ':' + (fn?.name || ''); live.set(k, (live.get(k) || 0) - 1); remove(type, fn, opts); };
    return () => [...live.values()].reduce((a, b) => a + b, 0);
}

test('getTopGraph works before any subgraph was opened', () => {
    const graph = new LGraph();
    const canvas = new LGraphCanvas(element(), graph, { skip_render: true });
    expect(canvas.getTopGraph()).toBe(graph);
    canvas.dispose();
});

test('canvas is focusable without HTML help, keeping an author-set tabindex', () => {
    const plain = new LGraphCanvas(element(), new LGraph(), { skip_render: true });
    expect(plain.canvas.tabIndex).toBe(0);
    const el = element(); el.setAttribute('tabindex', '5');
    const authored = new LGraphCanvas(el, new LGraph(), { skip_render: true });
    expect(authored.canvas.tabIndex).toBe(5);
    plain.dispose(); authored.dispose();
});

test('setCanvas moves listeners from the old element to the new one', () => {
    const first = element(), second = element();
    const countFirst = listenerSpy(first), countSecond = listenerSpy(second);
    const canvas = new LGraphCanvas(first, new LGraph(), { skip_render: true });
    expect(countFirst()).toBeGreaterThan(0);
    canvas.setCanvas(second);
    expect(countFirst()).toBe(0);
    expect(countSecond()).toBeGreaterThan(0);
    expect(first.data).toBeUndefined();
    expect(second.data).toBe(canvas);
    canvas.dispose();
    expect(countSecond()).toBe(0);
});

test('dispose stops rendering, detaches the graph and is idempotent', () => {
    jest.spyOn(LGraphCanvas.prototype, 'draw').mockImplementation(() => {});
    const raf = jest.fn(() => 7), caf = jest.fn();
    window.requestAnimationFrame = raf; window.cancelAnimationFrame = caf;
    const graph = new LGraph();
    const canvas = new LGraphCanvas(element(), graph);
    expect(canvas.is_rendering).toBe(true);
    const disposed = jest.fn();
    canvas.events.on('disposed', disposed);
    canvas.dispose();
    canvas.dispose();
    expect(canvas.is_rendering).toBe(false);
    expect(caf).toHaveBeenCalledWith(7);
    expect(graph.list_of_graphcanvas ?? []).not.toContain(canvas);
    expect(canvas.canvas).toBeNull();
    expect(disposed).toHaveBeenCalledTimes(1);
});

test('restarting rendering does not leave two animation-frame loops', () => {
    const draw = jest.spyOn(LGraphCanvas.prototype, 'draw').mockImplementation(() => {});
    const frames = [];
    window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
    window.cancelAnimationFrame = () => {};
    const canvas = new LGraphCanvas(element(), new LGraph());
    canvas.stopRendering(); canvas.startRendering();
    draw.mockClear();
    const pending = frames.splice(0);
    for (const fn of pending) fn();
    expect(frames).toHaveLength(1); // only the current loop rescheduled itself
    expect(draw).toHaveBeenCalledTimes(1);
    canvas.dispose();
});

test('closing a subgraph restores the parent view', () => {
    const graph = new LGraph();
    const canvas = new LGraphCanvas(element(), graph, { skip_render: true });
    const node = LiteGraph.createNode('graph/subgraph');
    graph.add(node);
    canvas.ds.offset = [123, -45]; canvas.ds.scale = 0.75;
    canvas.openSubgraph(node.subgraph);
    expect(canvas.getTopGraph()).toBe(graph);
    canvas.ds.offset = [0, 0]; canvas.ds.scale = 2;
    canvas.closeSubgraph();
    expect(canvas.graph).toBe(graph);
    expect(canvas.ds.offset).toEqual([123, -45]);
    expect(canvas.ds.scale).toBe(0.75);
    canvas.dispose();
});

test('a wrapped group title stays inside the group (4 px on each side) and clear of its toggle', () => {
    const graph = new LGraph();
    const canvas = new LGraphCanvas(element(), graph, { skip_render: true });
    const group = new LiteGraph.LGraphGroup('A caption long enough to wrap');
    group.pos = [10, 20]; group.size = [200, 80];
    graph.add(group);
    canvas.visible_area = new Float32Array([0, 0, 1000, 1000]);
    canvas.options.groups_title_wrap = true; // an options object passed to the constructor replaces the defaults
    const wrap = jest.spyOn(LiteGraph, 'canvasFillTextMultiline');
    canvas.drawGroups(canvas.canvas, canvas.ctx);
    // the stub context is a Proxy that answers every key, so compare the arguments after it
    const [, text, x, , maxWidth] = wrap.mock.calls[0];
    const toggle = canvas.getGroupToggleRect(group); // the header toggle keeps its own corner free
    expect(toggle).not.toBeNull();
    expect([text, x]).toEqual([group.title, 14]);
    expect(maxWidth).toBeGreaterThan(0);
    expect(x + maxWidth).toBeLessThan(toggle[0]); // ends left of the toggle, inside the group
});
