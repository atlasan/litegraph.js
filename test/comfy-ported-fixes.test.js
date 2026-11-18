// Regression tests for fixes ported from Comfy-Org/litegraph.js (MIT); commit ids in each test name.
import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { DragAndScale } from '../src/dragandscale.js';
import { ContextMenu } from '../src/contextmenu.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Plain { constructor() { this.addOutput('out', 'number'); } }
    LiteGraph.registerNodeType('ported/plain', Plain);
});

let dom;
beforeEach(() => {
    dom = new JSDOM('<main></main>');
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
});
afterEach(() => {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    jest.restoreAllMocks();
});

test('e25c210: pos setter keeps a two-component position', () => {
    const node = LiteGraph.createNode('ported/plain');
    delete node._pos;
    node.pos = [3, 4];
    expect(Array.from(node.pos)).toEqual([3, 4]);
});

test('a0b50dc: pin works before the node is added to a graph', () => {
    const node = LiteGraph.createNode('ported/plain');
    expect(() => node.pin()).not.toThrow();
    expect(node.flags.pinned).toBe(true);
    node.pin(false);
    expect(node.flags.pinned).toBe(false);
});

test('c5db2d8: typed number widget values are clamped to the widget range', () => {
    expect(LGraphCanvas.clampWidgetNumber(50, { min: 0, max: 10 })).toBe(10);
    expect(LGraphCanvas.clampWidgetNumber(-5, { min: 0, max: 10 })).toBe(0);
    expect(LGraphCanvas.clampWidgetNumber(5, { min: 0, max: 10 })).toBe(5);
    expect(LGraphCanvas.clampWidgetNumber(500, {})).toBe(500);
    expect(LGraphCanvas.clampWidgetNumber(500)).toBe(500);
});

test('11ce8e0: NODE_DEFAULT_SHAPE accepts constants and names and defaults to round', () => {
    expect(LGraphCanvas.resolveShape(LiteGraph.NODE_DEFAULT_SHAPE, -1)).toBe(LiteGraph.ROUND_SHAPE);
    expect(LGraphCanvas.resolveShape('box', -1)).toBe(LiteGraph.BOX_SHAPE);
    expect(LGraphCanvas.resolveShape('card', -1)).toBe(LiteGraph.CARD_SHAPE);
    expect(LGraphCanvas.resolveShape(LiteGraph.CIRCLE_SHAPE, -1)).toBe(LiteGraph.CIRCLE_SHAPE);
    expect(LGraphCanvas.resolveShape('nonsense', 7)).toBe(7);
});

test('0b161c1: context menu scale is rounded to quarter steps', () => {
    const menu = new ContextMenu(['a', 'b'], { scale: 1.13, event: { clientX: 10, clientY: 10, target: document.body } }, window);
    expect(menu.root.style.transform).toBe('scale(1.25)');
    ContextMenu.closeAll?.(window);
});

test('getGroupOnPos returns the group whose top is nearest the point', () => {
    const graph = new LGraph();
    const far = new LiteGraph.LGraphGroup();
    far.configure({ title: 'far', bounding: [0, 0, 500, 500] });
    const near = new LiteGraph.LGraphGroup();
    near.configure({ title: 'near', bounding: [0, 180, 500, 300] });
    graph.add(far);
    graph.add(near);
    expect(graph.getGroupOnPos(50, 200).title).toBe('near');
    graph._groups.reverse();
    expect(graph.getGroupOnPos(50, 200).title).toBe('near');
    graph.clear();
});

function fakeCanvas(width, height) {
    const canvas = Object.create(LGraphCanvas.prototype);
    canvas.canvas = document.createElement('canvas');
    canvas.bgcanvas = document.createElement('canvas');
    canvas.canvas.width = width;
    canvas.canvas.height = height;
    canvas.ds = new DragAndScale();
    canvas.pixel_ratio = 1;
    canvas.setDirty = () => {};
    return canvas;
}

test('49944a0: resize allocates a device-pixel backing store and keeps CSS sizes', () => {
    window.devicePixelRatio = 2;
    const canvas = fakeCanvas(10, 10);
    canvas.resize(300, 200);
    expect([canvas.canvas.width, canvas.canvas.height]).toEqual([600, 400]);
    expect([canvas.bgcanvas.width, canvas.bgcanvas.height]).toEqual([600, 400]);
    expect(canvas.canvas.style.width).toBe('300px');
    expect([canvas.cssWidth, canvas.cssHeight]).toEqual([300, 200]);
    expect(canvas.ds.pixel_ratio).toBe(2);

    canvas.ds.element = canvas.canvas;
    expect(canvas.ds.computeVisibleArea()).toEqual([-0, -0, 300, 200]);
});

test('high-DPI sizing can be disabled and is a no-op at ratio 1', () => {
    window.devicePixelRatio = 2;
    LiteGraph.canvas_high_dpi = false;
    try {
        const canvas = fakeCanvas(10, 10);
        canvas.resize(300, 200);
        expect([canvas.canvas.width, canvas.cssWidth, canvas.pixel_ratio]).toEqual([300, 300, 1]);
        expect(canvas.canvas.style.width).toBe('');
    } finally {
        LiteGraph.canvas_high_dpi = true;
    }
    window.devicePixelRatio = 1;
    const plain = fakeCanvas(10, 10);
    plain.resize(120, 80);
    expect([plain.canvas.width, plain.canvas.style.width]).toEqual([120, '']);
});

test('DragAndScale wheel zoom keeps the point under the cursor fixed', () => {
    const element = document.createElement('canvas');
    element.width = 400;
    element.height = 300;
    element.getBoundingClientRect = () => ({ left: 100, top: 50, width: 400, height: 300 });
    const ds = new DragAndScale();
    ds.element = element;
    const cursor = [150, 100]; // element-relative
    const before = ds.convertCanvasToOffset(cursor);
    ds.onWheel({ deltaY: -30, clientX: 100 + cursor[0], clientY: 50 + cursor[1] });
    expect(ds.scale).not.toBe(1);
    const after = ds.convertCanvasToOffset(cursor);
    expect(after[0]).toBeCloseTo(before[0], 5);
    expect(after[1]).toBeCloseTo(before[1], 5);
});
