import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { LGraphGroup } from '../src/lgraphgroup.js';

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

function ev(x, y, extra = {}) {
    return { clientX: x, clientY: y, which: 1, button: 0, buttons: 1, isPrimary: true, pointerId: 1,
        shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
        preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, ...extra };
}
/** a press, moves along the points, release at the last one */
function drag(canvas, points, extra = {}) {
    canvas.pointer.lastClick = null; // never a double click
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
        canvas.pointer.lastClick = null;
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

describe('gestures on CanvasPointer (wave 2b)', () => {
    const history = (graph) => graph.history.actionHistoryVersions.length;
    let historyWas;
    beforeEach(() => { historyWas = LiteGraph.actionHistory_enabled; LiteGraph.actionHistory_enabled = true; });
    afterEach(() => { LiteGraph.actionHistory_enabled = historyWas; });

    test('dragging selected nodes moves them all (not pinned ones) as one undo step', () => {
        const { canvas, graph, src, dst } = setup();
        const pinned = LiteGraph.createNode('pg/src'); pinned.pos = [100, 400]; pinned.size = [160, 60]; graph.add(pinned);
        pinned.flags.pinned = true;
        canvas.visible_nodes = graph._nodes.slice();
        graph.onGraphChanged({ action: 'seed', doSave: true }); // history has no empty baseline
        canvas.selectNodes([src, dst, pinned]);
        const before = history(graph);
        const moved = [];
        canvas.onNodeMoved = (node) => moved.push(node);
        drag(canvas, [[480, 130], [490, 140], [520, 170]]); // a press on a selected node keeps the selection
        expect(Array.from(src.pos)).toEqual([140, 140]);
        expect(Array.from(dst.pos)).toEqual([440, 140]);
        expect(Array.from(pinned.pos)).toEqual([100, 400]);
        expect(moved).toEqual([dst]);
        expect(history(graph) - before).toBe(1);
        expect(canvas.node_dragged).toBeNull();
        expect(Object.values(canvas.selected_nodes)).toHaveLength(3);
        drag(canvas, [[480, 140], [480, 140]]); // a click on a selected node selects only it
        expect(Object.values(canvas.selected_nodes)).toEqual([dst]);
        graph.actionHistoryBack();
        expect(Array.from(graph.getNodeById(src.id).pos)).toEqual([100, 100]);
    });

    test('a click on a node is not a move; a cancelled drag ends cleanly', () => {
        const { canvas, graph, src } = setup();
        graph.onGraphChanged({ action: 'seed', doSave: true });
        const before = history(graph);
        const moved = jest.fn();
        canvas.onNodeMoved = moved;
        drag(canvas, [[150, 130], [150, 130]]);
        expect(moved).not.toHaveBeenCalled();
        expect(history(graph)).toBe(before);
        canvas.pointer.lastClick = null;
        canvas.processMouseDown(ev(150, 130));
        canvas.processMouseMove(ev(190, 150));
        canvas.processPointerCancel({ isPrimary: true });
        expect(graph.isInTransaction).toBe(false);
        expect(canvas.node_dragged).toBeNull();
        expect(Array.from(src.pos)).toEqual([140, 120]);
    });

    test('dragging a group moves its nodes as one undo step', () => {
        const { canvas, graph, src } = setup();
        const group = new LGraphGroup('G'); group.pos = [80, 40]; group.size = [220, 160]; graph.add(group);
        graph.onGraphChanged({ action: 'seed', doSave: true });
        const before = history(graph);
        drag(canvas, [[90, 60], [100, 70], [120, 90]]);
        expect(Array.from(group.pos)).toEqual([110, 70]);
        expect(Array.from(src.pos)).toEqual([130, 130]);
        expect(history(graph) - before).toBe(1);
        expect(canvas.selected_group).toBeNull();
    });

    test('clicking a group title selects the group and keeps it selected', () => {
        const { canvas, graph } = setup();
        const group = new LGraphGroup('G'); group.pos = [600, 400]; group.size = [200, 150]; graph.add(group);
        drag(canvas, [[620, 410], [620, 410]]);
        expect(canvas.selectedItems).toContain(group);
    });

    test('resizing a group from its corner', () => {
        const { canvas, graph } = setup();
        const group = new LGraphGroup('G'); group.pos = [600, 400]; group.size = [200, 150]; graph.add(group);
        drag(canvas, [[799, 549], [820, 570], [850, 600]]);
        expect(Array.from(group.size)).toEqual([250, 200]);
        expect(Array.from(group.pos)).toEqual([600, 400]);
    });

    test('a press on an output released without dragging creates no link', () => {
        const { canvas, graph, src } = setup();
        const ends = [];
        canvas.events.on('link-drag-end', (event) => ends.push(event.detail.outcome));
        const out = src.getConnectionPos(false, 0);
        drag(canvas, [out, out]);
        expect(Object.keys(graph.links)).toHaveLength(0);
        expect(ends).toEqual(['cancelled']);
        expect(canvas.linkConnector.isConnecting).toBe(false);
    });
});

describe('floating reroutes on the canvas', () => {
    test('a link moved off its input leaves a floating chain; shift-drag from it reconnects through it', () => {
        const { canvas, src, dst, graph } = setup();
        const link = src.connect(0, dst, 1);
        const reroute = graph.addReroute([300, 250], link);
        const inp = dst.getConnectionPos(true, 1);
        drag(canvas, [inp, [inp[0] - 40, inp[1]], [700, 600]], { shiftKey: true }); // move the link to empty space
        expect(dst.inputs[1].link).toBeNull();
        expect(graph.floating_links.size).toBe(1);
        const calls = [];
        canvas.renderLinkPath = (ctx, points) => calls.push(points.length);
        canvas.drawFloatingLinks({ save() {}, restore() {}, setLineDash() {} });
        expect(calls).toEqual([2]); // output slot -> reroute
        drag(canvas, [[300, 250], [330, 280], dst.getConnectionPos(true, 1)], { shiftKey: true });
        const created = graph.links[dst.inputs[1].link];
        expect(created.parentId).toBe(reroute.id);
        expect(graph.floating_links.size).toBe(0);
    });

    test('cancelling a move restores the route and leaves nothing floating', () => {
        const { canvas, src, dst, graph } = setup();
        const link = src.connect(0, dst, 1);
        const reroute = graph.addReroute([300, 250], link);
        const inp = dst.getConnectionPos(true, 1);
        canvas.pointer.lastClick = null;
        canvas.processMouseDown(ev(inp[0], inp[1], { shiftKey: true }));
        canvas.processMouseMove(ev(inp[0] - 40, inp[1], { shiftKey: true }));
        expect(graph.floating_links.size).toBe(1);
        canvas.processPointerCancel({ isPrimary: true });
        expect(graph.links[dst.inputs[1].link].parentId).toBe(reroute.id);
        expect(graph.floating_links.size).toBe(0);
    });
});

describe('node badges and title buttons', () => {
    test('badges come from the node and from providers; built-in id badge follows its setting', () => {
        const { src } = setup();
        src.badges = [{ text: 'mine' }, (node) => ({ text: `t:${node.type}` }), () => null];
        const dispose = LiteGraph.nodeBadges.register(() => [{ text: 'p1' }, { text: '' }]);
        try {
            expect(LiteGraph.nodeBadges.collect(src).map((b) => b.text)).toEqual(['mine', 't:pg/src', 'p1']);
            LiteGraph.settings.set('LiteGraph.Node.IdBadge', true);
            expect(LiteGraph.nodeBadges.collect(src).map((b) => b.text)).toContain(`#${src.id}`);
        } finally {
            LiteGraph.settings.set('LiteGraph.Node.IdBadge', false);
            dispose();
        }
        expect(LiteGraph.nodeBadges.collect(src).map((b) => b.text)).toEqual(['mine', 't:pg/src']);
    });

    test('a title button click runs it and does not drag the node; layout is right-aligned, buttons outermost', () => {
        const { canvas, src } = setup();
        const clicks = [];
        src.addTitleButton({ name: 'run', text: '▶', onClick: (node) => clicks.push(['button', node]) });
        src.onTitleButtonClick = (button) => clicks.push(['node', button.name]);
        src.badges = [{ text: 'b' }];
        const layout = canvas.getNodeTitleDecorations(src);
        const [{ rect }] = layout.buttons;
        expect(rect[0] + rect[2]).toBe(src.size[0] - 4);
        expect(layout.badges[0].rect[0] + layout.badges[0].rect[2]).toBeLessThan(rect[0]);
        const at = [src.pos[0] + rect[0] + rect[2] / 2, src.pos[1] + rect[1] + rect[3] / 2];
        drag(canvas, [at, at]);
        expect(clicks).toEqual([['button', src], ['node', 'run']]);
        drag(canvas, [at, [at[0] + 30, at[1] + 30]]); // a drag on the button does nothing
        expect(Array.from(src.pos)).toEqual([100, 100]);
        expect(clicks).toHaveLength(2);
        expect(src.removeTitleButton('run')).toBe(true);
        expect(canvas.getNodeTitleButtonAt(src, rect[0] + 2, rect[1] + 2)).toBeNull();
        expect(src.serialize().title_buttons).toBeUndefined();
    });

    test('badges that would cover the title are left out; buttons always fit', () => {
        const { canvas, src } = setup();
        src.title = 'A rather long title for a narrow node';
        src.size = [120, 60];
        src.badges = [{ text: 'v2' }];
        src.addTitleButton({ name: 'x', text: 'x' });
        const layout = canvas.getNodeTitleDecorations(src);
        expect(layout.badges).toEqual([]);
        expect(layout.buttons).toHaveLength(1);
    });

    test('drawing renders badges and buttons in the title bar', () => {
        const { canvas, src } = setup();
        src.addTitleButton({ name: 'x', text: 'x' });
        src.badges = [{ text: 'v2' }];
        const texts = [];
        const ctx = { save() {}, restore() {}, beginPath() {}, roundRect() {}, fill() {}, measureText: (t) => ({ width: t.length * 6 }), fillText: (t) => texts.push(t) };
        canvas.drawNodeTitleDecorations(src, ctx, LiteGraph.NODE_TITLE_HEIGHT);
        expect(texts).toEqual(['v2', 'x']);
        expect(src._title_decorations.buttons[0].rect[2]).toBe(16);
    });
});

describe('group header toggle, lifecycle badges, reroute multi-select', () => {
    test('the group header toggle mutes and unmutes the group nodes, one undo step each', () => {
        const { canvas, graph, src, dst } = setup();
        const group = new LGraphGroup('G'); group.pos = [80, 40]; group.size = [520, 200]; graph.add(group);
        const rect = canvas.getGroupToggleRect(group);
        expect(rect).not.toBeNull();
        const at = [rect[0] + rect[2] / 2, rect[1] + rect[3] / 2];
        drag(canvas, [at, at]);
        expect([src.mode, dst.mode]).toEqual([LiteGraph.NEVER, LiteGraph.NEVER]);
        expect(canvas.isGroupMuted(group)).toBe(true);
        expect(Array.from(group.pos)).toEqual([80, 40]);
        drag(canvas, [at, at]);
        expect([src.mode, dst.mode]).toEqual([LiteGraph.ALWAYS, LiteGraph.ALWAYS]);
        LiteGraph.settings.set('LiteGraph.Group.HeaderToggle', false);
        try { expect(canvas.getGroupToggleRect(group)).toBeNull(); } finally { LiteGraph.settings.set('LiteGraph.Group.HeaderToggle', true); }
    });

    test('deprecated and experimental nodes get a lifecycle badge', () => {
        class Old { constructor() { this.addOutput('o', 'number'); } }
        Old.deprecated = true;
        LiteGraph.registerNodeType('pg/old', Old);
        const node = LiteGraph.createNode('pg/old');
        expect(LiteGraph.nodeBadges.collect(node).map((b) => b.text)).toEqual(['deprecated']);
        LiteGraph.settings.set('LiteGraph.Node.LifecycleBadge', false);
        try { expect(LiteGraph.nodeBadges.collect(node)).toEqual([]); } finally { LiteGraph.settings.set('LiteGraph.Node.LifecycleBadge', true); }
    });

    test('selected reroutes move with a node drag, and a reroute drag moves the whole selection', () => {
        const { canvas, graph, src, dst } = setup();
        const link = src.connect(0, dst, 1);
        const r1 = graph.addReroute([300, 300], link);
        const r2 = graph.addReroute([340, 300], link);
        canvas.selectNodes([src]);
        canvas.selectItem(r1, true);
        canvas.selectItem(r2, true);
        drag(canvas, [[150, 130], [160, 140], [170, 150]]);
        expect(Array.from(src.pos)).toEqual([120, 120]);
        expect([Array.from(r1.pos), Array.from(r2.pos)]).toEqual([[320, 320], [360, 320]]);
        drag(canvas, [[320, 320], [330, 330], [340, 340]]); // press on a selected reroute
        expect([Array.from(r1.pos), Array.from(r2.pos), Array.from(src.pos)]).toEqual([[340, 340], [380, 340], [140, 140]]);
        drag(canvas, [[340, 340], [340, 340]]); // a click selects only it
        expect(canvas.selectedItems).toEqual([r1]);
    });
});
