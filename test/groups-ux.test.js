import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { LGraphGroup } from '../src/lgraphgroup.js';
import { KeybindingRegistry } from '../src/keybindings.js';

// Group UX: title band / body / toggle hit-testing, body drag rules, space panning, title size by zoom.

let dom;
let calls;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Box { constructor() { this.addOutput('out', 'number'); } }
    LiteGraph.registerNodeType('gux/box', Box);
});
beforeEach(() => {
    dom = new JSDOM('<main></main>');
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    calls = [];
    dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
        get: (target, k) => k in target ? target[k] : (k === 'start' || k === 'finish' ? undefined : (...args) => { calls.push([k, ...args]); return { width: 0 }; }),
        set: (target, k, v) => { target[k] = v; return true; },
    });
    for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {});
});
const SETTINGS = ['BodyDrag', 'TitleScale', 'TitleMinPx', 'TitleMaxPx', 'HeaderToggle'];
afterEach(() => {
    for (const name of SETTINGS) LiteGraph.settings.reset?.('LiteGraph.Group.' + name);
    dom.window.close(); delete globalThis.window; delete globalThis.document; jest.restoreAllMocks();
});
const setGroup = (name, value) => LiteGraph.settings.set('LiteGraph.Group.' + name, value);

function setup() {
    const graph = new LGraph();
    const el = document.createElement('canvas');
    el.width = 1000; el.height = 800;
    document.querySelector('main').appendChild(el);
    const canvas = new LGraphCanvas(el, graph, { skip_render: true });
    const node = LiteGraph.createNode('gux/box'); node.pos = [120, 120]; node.size = [100, 40]; graph.add(node);
    const group = new LGraphGroup('Group title'); group.pos = [80, 40]; group.size = [400, 300]; graph.add(group);
    canvas.visible_nodes = graph._nodes.slice();
    return { graph, canvas, node, group };
}

function ev(x, y, extra = {}) {
    return { clientX: x, clientY: y, which: 1, button: 0, buttons: 1, isPrimary: true, pointerId: 1,
        shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
        preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, ...extra };
}
function drag(canvas, points, extra = {}) {
    canvas.pointer.lastClick = null;
    const [first, ...rest] = points;
    canvas.processMouseDown(ev(first[0], first[1], extra));
    for (const [x, y] of rest) canvas.processMouseMove(ev(x, y, extra));
    const last = points[points.length - 1];
    canvas.processMouseUp(ev(last[0], last[1], { ...extra, buttons: 0 }));
}
function key(canvas, type) {
    canvas.processKey({ type, key: ' ', code: 'Space', keyCode: 32, target: canvas.canvas,
        ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, repeat: false,
        preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} });
}

describe('hit-testing', () => {
    test('title band, body and toggle', () => {
        const { canvas, group } = setup();
        expect(canvas.isOverGroupTitle(group, 100, 50)).toBe(true);
        expect(canvas.isOverGroupTitle(group, 100, 40 + 24 * 1.4 + 1)).toBe(false);
        expect(canvas.isOverGroupTitle(group, 100, 200)).toBe(false);
        const [x, y, w, h] = canvas.getGroupToggleRect(group);
        expect([w, h]).toEqual([10, 10]); // node-pin size at scale 1
        expect(x + w).toBeLessThan(group.pos[0] + group.size[0]);
        expect(y).toBeGreaterThan(group.pos[1]);
        expect(y + h).toBeLessThan(group.pos[1] + canvas.getGroupTitleHeight(group));
    });

    test('the toggle is capped on screen and hidden when tiny', () => {
        const { canvas, group } = setup();
        canvas.ds.scale = 3;
        expect(canvas.getGroupToggleRect(group)[2] * 3).toBeCloseTo(14);
        canvas.ds.scale = 0.7;
        expect(canvas.getGroupToggleRect(group)[2] * 0.7).toBeCloseTo(7);
        canvas.ds.scale = 0.5;
        expect(canvas.getGroupToggleRect(group)).toBeNull();
        canvas.ds.scale = 1;
        setGroup('HeaderToggle', false);
        expect(canvas.getGroupToggleRect(group)).toBeNull();
    });

    test('the title is clipped left of the toggle', () => {
        const { canvas, group } = setup();
        canvas.visible_area = new Float32Array([-1e4, -1e4, 2e4, 2e4]);
        calls.length = 0;
        canvas.drawGroups(canvas.canvas, canvas.ctx);
        const toggle = canvas.getGroupToggleRect(group);
        const clip = calls.find(([k, x, y, w]) => k === 'rect' && x === group.pos[0] && y === group.pos[1] && w < group.size[0]);
        expect(clip).toBeTruthy();
        expect(clip[1] + clip[3]).toBeLessThan(toggle[0]);
    });
});

describe('drag rules', () => {
    test('the body pans the view by default', () => {
        const { canvas, group, node } = setup();
        drag(canvas, [[300, 250], [320, 260], [340, 270]]);
        expect(Array.from(group.pos)).toEqual([80, 40]);
        expect(Array.from(node.pos)).toEqual([120, 120]);
        expect(Array.from(canvas.ds.offset)).toEqual([40, 20]);
    });

    test('the title bar moves the group with its nodes', () => {
        const { canvas, group, node } = setup();
        drag(canvas, [[150, 50], [170, 60], [190, 70]]);
        expect(Array.from(group.pos)).toEqual([120, 60]);
        expect(Array.from(node.pos)).toEqual([160, 140]);
        expect(Array.from(canvas.ds.offset)).toEqual([0, 0]);
    });

    test('Alt on the body moves the group', () => {
        const { canvas, group, node } = setup();
        drag(canvas, [[300, 250], [320, 260], [340, 270]], { altKey: true });
        expect(Array.from(group.pos)).toEqual([120, 60]);
        expect(Array.from(node.pos)).toEqual([160, 140]);
    });

    test('BodyDrag "move" restores the legacy body drag', () => {
        const { canvas, group } = setup();
        setGroup('BodyDrag', 'move');
        drag(canvas, [[300, 250], [320, 260], [340, 270]]);
        expect(Array.from(group.pos)).toEqual([120, 60]);
        expect(Array.from(canvas.ds.offset)).toEqual([0, 0]);
    });

    test('Ctrl on the title moves the group alone; Ctrl on the body box-selects', () => {
        const { canvas, group, node } = setup();
        drag(canvas, [[150, 50], [170, 60], [190, 70]], { ctrlKey: true });
        expect(Array.from(group.pos)).toEqual([120, 60]);
        expect(Array.from(node.pos)).toEqual([120, 120]);
        drag(canvas, [[100, 100], [200, 150], [260, 200]], { ctrlKey: true });
        expect(Array.from(group.pos)).toEqual([120, 60]);
        expect(canvas.selectedItems).toContain(node);
    });

    test('the resize corner still resizes from the body', () => {
        const { canvas, group } = setup();
        drag(canvas, [[478, 338], [500, 360], [520, 380]]);
        expect(Array.from(group.size)).toEqual([440, 340]);
    });
});

describe('space panning', () => {
    test('the space key combo survives normalize', () => {
        expect(KeybindingRegistry.fromEvent({ key: ' ' })).toBe('space');
        expect(KeybindingRegistry.normalize(' ')).toBe(' ');
        expect(KeybindingRegistry.normalize('ctrl+space')).toBe('ctrl+ ');
    });

    test('space held: moving pans, a press pans even on a group title, release stops', () => {
        const { canvas, group } = setup();
        canvas.processMouseMove(ev(10, 10, { buttons: 0 })); // the pointer is somewhere
        key(canvas, 'keydown');
        expect(canvas.dragging_canvas).toBe(true);
        canvas.processMouseMove(ev(30, 20, { buttons: 0 }));
        expect(Array.from(canvas.ds.offset)).toEqual([20, 10]);
        drag(canvas, [[150, 50], [170, 60], [190, 70]]);
        expect(Array.from(group.pos)).toEqual([80, 40]);
        expect(Array.from(canvas.ds.offset)).toEqual([60, 30]);
        expect(canvas.dragging_canvas).toBe(true); // still held
        key(canvas, 'keyup');
        expect(canvas.dragging_canvas).toBe(false);
        canvas.processMouseMove(ev(60, 60, { buttons: 0 }));
        expect(Array.from(canvas.ds.offset)).toEqual([60, 30]);
    });

    test('losing focus ends space panning', () => {
        const { canvas } = setup();
        key(canvas, 'keydown');
        canvas.canvas.dispatchEvent(new dom.window.FocusEvent('blur'));
        expect(canvas.dragging_canvas).toBe(false);
    });
});

describe('title size by zoom', () => {
    test.each([[0.25, 48], [0.5, 24], [1, 24], [2, 24], [4, 12]])('scale %p: %p graph units (12..48 px)', (scale, size) => {
        const { canvas, group } = setup();
        canvas.ds.scale = scale;
        expect(canvas.getGroupTitleFontSize(group)).toBeCloseTo(size);
    });

    test('limits and the legacy setting', () => {
        const { canvas, group } = setup();
        canvas.ds.scale = 0.25;
        setGroup('TitleMinPx', 8);
        expect(canvas.getGroupTitleFontSize(group)).toBeCloseTo(32);
        setGroup('TitleScale', false);
        expect(canvas.getGroupTitleFontSize(group)).toBe(24);
        canvas.ds.scale = 4;
        expect(canvas.getGroupTitleFontSize(group)).toBe(24);
    });

    test('the title band follows the drawn size', () => {
        const { canvas, group } = setup();
        canvas.ds.scale = 0.25;
        expect(canvas.isOverGroupTitle(group, 100, 40 + 60)).toBe(true); // 48 * 1.4 = 67
        canvas.ds.scale = 1;
        expect(canvas.isOverGroupTitle(group, 100, 40 + 60)).toBe(false);
    });
});
