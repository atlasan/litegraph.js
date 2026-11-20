import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { LGraphGroup } from '../src/lgraphgroup.js';
import { CanvasPointer } from '../src/canvaspointer.js';

let dom;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Box { constructor() { this.addInput('in', 'number'); this.addOutput('out', 'number'); } }
    LiteGraph.registerNodeType('sel/box', Box);
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
    document.querySelector('main').appendChild(el);
    const canvas = new LGraphCanvas(el, graph, { skip_render: true });
    const node = LiteGraph.createNode('sel/box'); node.pos = [300, 300]; graph.add(node);
    const inner = LiteGraph.createNode('sel/box'); inner.pos = [40, 80]; graph.add(inner);
    const group = new LGraphGroup('G'); graph.add(group); group._bounding.set([0, 0, 250, 200]);
    const a = LiteGraph.createNode('sel/box'), b = LiteGraph.createNode('sel/box');
    graph.add(a); graph.add(b);
    const link = a.connect(0, b, 0);
    const reroute = graph.addReroute([500, 500], link);
    return { graph, canvas, node, inner, group, reroute, a, b };
}

test('one selection holds nodes, groups and reroutes; deselectAll clears everything', () => {
    const { canvas, node, group, reroute } = setup();
    const changes = [];
    canvas.events.on('selection-changed', (event) => changes.push(event.detail.items?.length ?? event.detail.nodes.length));
    canvas.selectItem(node);
    canvas.selectItem(group, true);
    canvas.selectItem(reroute, true);
    expect(canvas.selectedItems).toEqual([node, group, reroute]);
    expect([canvas.isItemSelected(group), group.selected, reroute.selected]).toEqual([true, true, true]);
    canvas.deselectItem(group);
    expect(canvas.selectedItems).toEqual([node, reroute]);
    canvas.selectItem(group); // without add: replaces the selection
    expect(canvas.selectedItems).toEqual([group]);
    canvas.deselectAllNodes();
    expect(canvas.selectedItems).toEqual([]);
    expect(group.selected).toBe(false);
    expect(changes.length).toBeGreaterThan(3);
    expect(LGraphCanvas.isNodeItem(node)).toBe(true); // registered class does not extend LGraphNode
    expect(LGraphCanvas.isNodeItem(group)).toBe(false);
    canvas.dispose();
});

test('moveSelected moves every item once (group children are carried) as one undo step', () => {
    const { graph, canvas, node, inner, group, reroute } = setup();
    const prev = LiteGraph.actionHistory_enabled;
    LiteGraph.actionHistory_enabled = true;
    try {
        graph.transact('baseline', () => graph.onGraphChanged({ action: 'baseline' }));
        canvas.selectItem(group);
        canvas.selectItem(inner, true); // also inside the group: must not move twice
        canvas.selectItem(node, true);
        canvas.selectItem(reroute, true);
        canvas.moveSelected(10, 20);
        expect(Array.from(group.pos)).toEqual([10, 20]);
        expect(Array.from(inner.pos)).toEqual([50, 100]);
        expect(Array.from(node.pos)).toEqual([310, 320]);
        expect(Array.from(reroute.pos)).toEqual([510, 520]);
        graph.actionHistoryBack();
        expect(Array.from(graph.getNodeById(node.id).pos)).toEqual([300, 300]);
        expect(Array.from(graph.reroutes.get(reroute.id).pos)).toEqual([500, 500]);
    } finally { LiteGraph.actionHistory_enabled = prev; canvas.dispose(); }
});

test('deleteSelected removes nodes, groups and reroutes together', () => {
    const { graph, canvas, node, group, reroute } = setup();
    canvas.selectItem(node);
    canvas.selectItem(group, true);
    canvas.selectItem(reroute, true);
    canvas.deleteSelected();
    expect(graph.getNodeById(node.id)).toBeFalsy();
    expect(graph._groups).not.toContain(group);
    expect(graph.reroutes.has(reroute.id)).toBe(false);
    expect(canvas.selectedItems).toEqual([]);
    canvas.dispose();
});

test('rectangle helper finds reroutes inside and groups fully inside', () => {
    const { canvas, group, reroute } = setup();
    expect(canvas._itemsInRectangle([-10, -10, 600, 600])).toEqual(expect.arrayContaining([group, reroute]));
    expect(canvas._itemsInRectangle([100, 100, 50, 50])).toEqual([]);
    canvas.dispose();
});

describe('CanvasPointer gesture handlers', () => {
    const at = (x, y) => ({ clientX: x, clientY: y, button: 0 });
    test('drag: onDragStart once, onDrag per move, onDragEnd, finally; handlers cleared', () => {
        const p = new CanvasPointer();
        const calls = [];
        p.down(at(0, 0), 0);
        p.onDragStart = () => calls.push('start');
        p.onDrag = () => calls.push('drag');
        p.onDragEnd = () => calls.push('end');
        p.onClick = () => calls.push('click');
        p.finally = () => calls.push('finally');
        expect(p.hasHandlers).toBe(true);
        p.move(at(2, 0));
        p.move(at(20, 0));
        p.move(at(30, 0));
        expect(p.up(at(30, 0), 50).handled).toBe(true);
        expect(calls).toEqual(['start', 'drag', 'drag', 'drag', 'end', 'finally']);
        expect(p.hasHandlers).toBe(false);
    });
    test('click and double click handlers; cancel runs finally only; a throwing handler does not break the gesture', () => {
        const p = new CanvasPointer();
        const calls = [];
        p.down(at(0, 0), 0);
        p.onClick = () => { calls.push('click'); throw new Error('handler bug'); };
        p.finally = () => calls.push('finally');
        jest.spyOn(console, 'error').mockImplementation(() => {});
        p.up(at(0, 0), 10);
        p.down(at(1, 1), 100);
        p.onDoubleClick = () => calls.push('double');
        p.up(at(1, 1), 110);
        p.down(at(0, 0), 1000);
        p.onDragEnd = () => calls.push('never');
        p.finally = () => calls.push('cancel-finally');
        p.cancel();
        expect(calls).toEqual(['click', 'finally', 'double', 'cancel-finally']);
    });
});

test('dragging a reroute on the canvas is a pointer gesture and one undo step', () => {
    const { graph, canvas, reroute } = setup();
    const prev = LiteGraph.actionHistory_enabled;
    LiteGraph.actionHistory_enabled = true;
    try {
        graph.transact('baseline', () => graph.onGraphChanged({ action: 'baseline' }));
        canvas._dragRerouteGesture(reroute);
        const p = canvas.pointer;
        const ev = (x, y) => ({ clientX: x, clientY: y, canvasX: x, canvasY: y, button: 0 });
        p.isDown = true; p.downEvent = { x: 500, y: 500, time: 0, button: 0, isDoubleClick: false };
        p.move(ev(510, 500)); // becomes a drag
        p.move(ev(540, 530));
        expect(canvas.dragging_reroute).toBe(reroute);
        expect(graph.isInTransaction).toBe(true);
        p.up(ev(540, 530), 100);
        expect(canvas.dragging_reroute).toBeNull();
        expect(graph.isInTransaction).toBe(false);
        expect(Array.from(reroute.pos)).toEqual([530, 530]); // moved by the drag delta, snapped to the grid
        expect(graph.history.actionHistory[graph.history.actionHistoryVersions.at(-1)].actionName).toBe('rerouteMove');
    } finally { LiteGraph.actionHistory_enabled = prev; canvas.dispose(); }
});
