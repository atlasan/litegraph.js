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
        canvas.graph_mouse[0] = 500; canvas.graph_mouse[1] = 500; // the press
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
        expect(Array.from(reroute.pos)).toEqual([540, 530]); // moved by the whole drag from the press
        expect(graph.history.actionHistory[graph.history.actionHistoryVersions.at(-1)].actionName).toBe('rerouteMove');
    } finally { LiteGraph.actionHistory_enabled = prev; canvas.dispose(); }
});

test('groupSelected wraps nodes, groups and reroutes in one undo step', () => {
    const { graph, canvas, node, reroute } = setup();
    const prev = LiteGraph.actionHistory_enabled;
    LiteGraph.actionHistory_enabled = true;
    try {
        graph.transact('baseline', () => graph.onGraphChanged({ action: 'baseline' }));
        const groups = graph._groups.length;
        canvas.selectItem(node);
        canvas.selectItem(reroute, true);
        const group = canvas.groupSelected('Wrapped');
        expect(graph._groups).toHaveLength(groups + 1);
        expect(group.title).toBe('Wrapped');
        const nb = node.getBounding();
        expect(group._bounding[0]).toBeLessThanOrEqual(nb[0]);
        expect(group._bounding[0] + group._bounding[2]).toBeGreaterThanOrEqual(reroute.pos[0]);
        graph.actionHistoryBack();
        expect(graph._groups).toHaveLength(groups);
        canvas.deselectAllNodes();
        expect(canvas.groupSelected()).toBeNull();
    } finally { LiteGraph.actionHistory_enabled = prev; canvas.dispose(); }
});

describe('clipboard fragments', () => {
    test('copy and paste: nodes, internal links, reroutes and groups with fresh ids, one undo step', () => {
        const { graph, canvas, a, b, group, reroute } = setup();
        const prev = LiteGraph.actionHistory_enabled;
        LiteGraph.actionHistory_enabled = true;
        try {
            graph.transact('baseline', () => graph.onGraphChanged({ action: 'baseline' }));
            canvas.selectNodes([a, b]);
            canvas.selectItem(group, true);
            const fragment = canvas.serializeSelection();
            expect(fragment.nodes).toHaveLength(2);
            expect(fragment.links).toHaveLength(1);
            expect(fragment.links[0][5].map((r) => r.id)).toEqual([reroute.id]);
            expect(fragment.groups).toHaveLength(1);
            const counts = { nodes: graph._nodes.length, groups: graph._groups.length, links: Object.keys(graph.links).length, reroutes: graph.reroutes.size };
            const { nodes, groups } = canvas.insertFragment(fragment, [1000, 1000]);
            expect(nodes).toHaveLength(2);
            expect(nodes.every((n) => n.id !== a.id && n.id !== b.id)).toBe(true);
            expect(groups).toHaveLength(1);
            expect(Object.keys(graph.links)).toHaveLength(counts.links + 1);
            expect(graph.reroutes.size).toBe(counts.reroutes + 1);
            const pastedLink = graph.links[nodes[1].inputs[0].link];
            expect(pastedLink.origin_id).toBe(nodes[0].id);
            const newReroute = graph.reroutes.get(pastedLink.parentId);
            expect(newReroute).toBeTruthy();
            expect(newReroute).not.toBe(reroute);
            // the whole fragment sits at the insertion point
            const minX = Math.min(...nodes.map((n) => n.pos[0]), ...groups.map((g) => g.pos[0]));
            expect(minX).toBeCloseTo(1000);
            expect(canvas.selectedItems).toEqual(expect.arrayContaining([...nodes, ...groups]));
            expect(graph.validateLinks().ok).toBe(true);
            graph.actionHistoryBack(); // one step removes everything pasted
            expect(graph._nodes).toHaveLength(counts.nodes);
            expect(graph._groups).toHaveLength(counts.groups);
            expect(graph.reroutes.size).toBe(counts.reroutes);
        } finally { LiteGraph.actionHistory_enabled = prev; canvas.dispose(); }
    });

    test('links from unselected nodes are kept only with connectUnselected (Ctrl+Shift+V)', () => {
        const { graph, canvas, a, b } = setup();
        canvas.selectNodes([b]); // its input comes from a, which is not selected
        const fragment = canvas.serializeSelection();
        expect(fragment.links[0][0]).toBeNull();
        const plain = canvas.insertFragment(fragment, [0, 600]);
        expect(plain.nodes[0].inputs[0].link).toBeNull();
        const connected = canvas.insertFragment(fragment, [0, 800], { connectUnselected: true });
        expect(connected.nodes[0].getInputNode(0)).toBe(a);
        void graph;
        canvas.dispose();
    });

    test('stale relative ids from an earlier copy no longer pull unselected nodes in', () => {
        const { canvas, a, b } = setup();
        canvas.selectNodes([a, b]);
        canvas.serializeSelection();
        canvas.selectNodes([b]);
        const fragment = canvas.serializeSelection();
        expect(fragment.nodes).toHaveLength(1);
        expect(fragment.links[0][0]).toBeNull(); // a is outside this copy
        canvas.dispose();
    });

    test('the older clipboard format (nodes + 5-element links) still pastes', () => {
        const { graph, canvas } = setup();
        const legacy = {
            nodes: [{ type: 'sel/box', pos: [10, 10], size: [80, 40], flags: {}, mode: 0, inputs: [{ name: 'in', type: 'number', link: null }], outputs: [{ name: 'out', type: 'number', links: null }], properties: {} },
                    { type: 'sel/box', pos: [200, 10], size: [80, 40], flags: {}, mode: 0, inputs: [{ name: 'in', type: 'number', link: null }], outputs: [{ name: 'out', type: 'number', links: null }], properties: {} }],
            links: [[0, 0, 1, 0, 99]],
        };
        const { nodes } = canvas.insertFragment(legacy, [400, 400]);
        expect(nodes).toHaveLength(2);
        expect(nodes[1].getInputNode(0)).toBe(nodes[0]);
        void graph;
        canvas.dispose();
    });
});
