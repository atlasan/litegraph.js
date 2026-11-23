// The node pin (title box): core geometry, style registry and quick-menu routing, and the node_pin
// and graph_status extensions (plan agents/plans/2026-11-23-node-pin-modes-exec-slots.md, track C).
import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { modesPinStyle, nodePinExtension, NODE_PIN_RUN_GLOW_MS } from '../src/extensions/node_pin.js';
import { graphStatusExtension, graphStatusLabel, graphStatusMenu, drawGraphStatus, isOverGraphStatus, GRAPH_STATUS_SETTING } from '../src/extensions/graph_status.js';
import '../src/nodes/events.js';

let dom;
let clock;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Box { constructor() { this.addInput('in', 'number'); this.addOutput('out', 'number'); this.runs = 0; } onExecute() { this.runs++; this.setOutputData(0, 1); } }
    LiteGraph.registerNodeType('pin/box', Box);
});
beforeEach(() => {
    clock = 1000;
    jest.spyOn(LiteGraph, 'getTime').mockImplementation(() => clock);
    dom = new JSDOM('<main></main>', { pretendToBeVisual: true });
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    dom.window.HTMLCanvasElement.prototype.getContext = () => recorder();
    for (const level of ['info', 'debug', 'log', 'warn', 'error']) jest.spyOn(console, level).mockImplementation(() => {});
});
afterEach(() => {
    LiteGraph.settings.set('LiteGraph.Node.PinStyle', 'classic');
    LiteGraph.settings.set('LiteGraph.Node.TitleQuickMenu', false);
    LiteGraph.node_box_coloured_by_mode = false;
    LiteGraph.node_box_coloured_when_on = false;
    dom.window.close(); delete globalThis.window; delete globalThis.document;
    jest.restoreAllMocks();
});

/** a 2D context that records method calls by name */
function recorder() {
    const target = { calls: [], globalAlpha: 1, lineWidth: 1 };
    return new Proxy(target, {
        get: (t, key) => key in t ? t[key] : (key === 'start' || key === 'finish' ? undefined : (...args) => { t.calls.push(key); return { width: 10, addColorStop() {} }; }),
        set: (t, key, value) => { t[key] = value; return true; },
    });
}

function setup() {
    const graph = new LGraph();
    const el = document.createElement('canvas');
    el.width = 800; el.height = 600;
    document.querySelector('main').appendChild(el);
    const canvas = new LGraphCanvas(el, graph, { skip_render: true });
    LGraphCanvas.active_canvas = canvas;
    canvas.background_image = null;
    const node = LiteGraph.createNode('pin/box'); node.pos = [100, 100]; graph.add(node);
    const other = LiteGraph.createNode('pin/box'); other.pos = [400, 100]; graph.add(other);
    canvas.visible_nodes = graph._nodes;
    return { graph, canvas, node, other };
}
const T = () => LiteGraph.NODE_TITLE_HEIGHT;
const captureMenu = () => {
    const menus = [];
    jest.spyOn(LiteGraph, 'ContextMenu').mockImplementation((entries, options) => { menus.push({ entries, options }); });
    return menus;
};
/** the extensions register themselves on import; the core tests run without them */
function useExtensions(on) {
    for (const def of [nodePinExtension, graphStatusExtension]) {
        const has = LiteGraph.extensions.has(def.name);
        if (on && !has) LiteGraph.registerExtension(def);
        if (!on && has) LiteGraph.extensions.unregister(def.name);
    }
}

describe('core', () => {
    beforeEach(() => useExtensions(false));
    test('the classic style is the colour chain of before', () => {
        const { canvas, node } = setup();
        expect(canvas.classicNodePinStyle(node, LiteGraph.ROUND_SHAPE)).toEqual({ shape: 'circle', fill: LiteGraph.NODE_DEFAULT_BOXCOLOR });
        expect(canvas.classicNodePinStyle(node, LiteGraph.BOX_SHAPE).shape).toBe('square');
        node.mode = LiteGraph.ON_EVENT;
        LiteGraph.node_box_coloured_by_mode = true;
        expect(canvas.classicNodePinStyle(node).fill).toBe(LiteGraph.NODE_MODES_COLORS[LiteGraph.ON_EVENT]);
        LiteGraph.node_box_coloured_when_on = true;
        node.execute_triggered = 2;
        expect(canvas.classicNodePinStyle(node).fill).toBe('#AAA');
        node.boxcolor = '#123';
        expect(canvas.classicNodePinStyle(node).fill).toBe('#123');
        node.execution_state = { status: 'error' };
        expect(canvas.classicNodePinStyle(node).fill).toBe(LGraphCanvas.EXECUTION_STATUS_COLORS.error);
    });

    test('a registered style is used when the setting names it; unknown or failing styles fall back to classic', () => {
        const { canvas, node } = setup();
        const dispose = LiteGraph.registerNodePinStyle('test', () => ({ shape: 'diamond', fill: '#0f0' }));
        expect(canvas.resolveNodePinStyle(node, LiteGraph.ROUND_SHAPE).shape).toBe('circle'); // setting still classic
        LiteGraph.settings.set('LiteGraph.Node.PinStyle', 'modes'); // not registered here
        expect(canvas.resolveNodePinStyle(node).fill).toBe(LiteGraph.NODE_DEFAULT_BOXCOLOR);
        dispose();
        const disposeBad = LiteGraph.registerNodePinStyle('modes', () => { throw new Error('boom'); });
        expect(canvas.resolveNodePinStyle(node).fill).toBe(LiteGraph.NODE_DEFAULT_BOXCOLOR);
        disposeBad();
        expect(() => LiteGraph.registerNodePinStyle('classic', () => null)).toThrow(TypeError);
    });

    test('drawNodePin draws every shape and mark, in low quality as a square', () => {
        const { canvas, node } = setup();
        const ctx = recorder();
        for (const shape of ['circle', 'square', 'diamond', 'triangle']) {
            for (const mark of [null, 'slash', 'bar', 'dot']) {
                const dispose = LiteGraph.registerNodePinStyle('modes', () => ({ shape, mark, fill: '#fff', stroke: '#000', glow: { color: '#fff' } }));
                LiteGraph.settings.set('LiteGraph.Node.PinStyle', 'modes');
                canvas.drawNodePin(ctx, node, T(), LiteGraph.ROUND_SHAPE, false);
                dispose();
            }
        }
        expect(ctx.calls).toContain('fill');
        expect(ctx.calls).toContain('stroke');
        const low = recorder();
        canvas.drawNodePin(low, node, T(), LiteGraph.ROUND_SHAPE, true);
        expect(low.calls).toEqual(['fillRect', 'fillRect']);
    });

    test('the pin is the title square; a click there still collapses the node', () => {
        const { canvas, node } = setup();
        expect(canvas.isOverNodePin(node, 105, 100 - T() + 5)).toBe(true);
        expect(canvas.isOverNodePin(node, 100 + T() + 5, 100 - 5)).toBe(false);
    });

    test('right-click: the pin opens the quick menu when something is contributed; More… opens the node menu', () => {
        const { canvas, node } = setup();
        const menus = captureMenu();
        const event = { canvasX: 110, canvasY: 100 - T() * 0.5 };
        expect(canvas.isNodePinMenuEvent(node, event)).toBe(false); // nothing contributed: the node menu
        const dispose = LiteGraph.menus.register('node-pin', (ctx) => [{ content: `pin of ${ctx.node.id}` }]);
        expect(canvas.isNodePinMenuEvent(node, event)).toBe(true);
        canvas.processContextMenu(node, event);
        const quick = menus.at(-1).entries;
        expect(quick[0].content).toBe(`pin of ${node.id}`);
        expect(quick.at(-1).content).toBe('More…');
        quick.at(-1).callback(null, null, event);
        expect(menus.at(-1).entries.some((item) => item?.content === 'Mode')).toBe(true);
        // the title only with the setting
        const onTitle = { canvasX: 160, canvasY: 100 - T() * 0.5 };
        expect(canvas.isNodePinMenuEvent(node, onTitle)).toBe(false);
        LiteGraph.settings.set('LiteGraph.Node.TitleQuickMenu', true);
        expect(canvas.isNodePinMenuEvent(node, onTitle)).toBe(true);
        dispose();
    });

    test('a run stamps node.last_run_time', () => {
        const { graph, node } = setup();
        clock = 5000;
        graph.runStep(1);
        expect(node.last_run_time).toBe(5000);
    });
});

describe('node_pin extension', () => {
    beforeEach(() => useExtensions(true));
    test('the modes style: one shape per mode, state rings, a glow that fades after a run', () => {
        const { canvas, node } = setup();
        const shapes = [LiteGraph.ALWAYS, LiteGraph.ON_EVENT, LiteGraph.ON_TRIGGER, LiteGraph.ON_REQUEST, LiteGraph.NEVER, LiteGraph.BYPASS]
            .map((mode) => { node.mode = mode; const s = modesPinStyle(node, canvas); return [s.shape, !!s.fill, s.mark]; });
        expect(new Set(shapes.map((s) => s.join())).size).toBe(6);
        node.mode = LiteGraph.ALWAYS;
        node.execution_state = { status: 'running' };
        expect(modesPinStyle(node, canvas).lineWidth).toBeGreaterThan(2);
        node.execution_state = null;
        node.last_run_time = clock;
        expect(modesPinStyle(node, canvas).glow.alpha).toBeGreaterThan(0.5);
        expect(modesPinStyle(node, canvas).redraw).toBe(true);
        clock += NODE_PIN_RUN_GLOW_MS + 1;
        expect(modesPinStyle(node, canvas).glow).toBeUndefined();
        LiteGraph.settings.set('LiteGraph.Node.PinStyle', 'modes');
        expect(canvas.resolveNodePinStyle(node).shape).toBe('circle');
    });

    test('commands: bypass and mute toggle the node and the rest of the selection as one undo step', () => {
        const history = LiteGraph.actionHistory_enabled;
        LiteGraph.actionHistory_enabled = true;
        const { graph, canvas, node, other } = setup();
        graph.add(LiteGraph.createNode('pin/box')); // an earlier change, so undo has a baseline
        canvas.selectNodes([node, other]);
        const ctx = LiteGraph.commands.contextFor(canvas, { node });
        LiteGraph.commands.execute('litegraph.node.toggleBypass', ctx);
        expect([node.mode, other.mode]).toEqual([LiteGraph.BYPASS, LiteGraph.BYPASS]);
        expect(LiteGraph.commands.get('litegraph.node.toggleBypass').label(ctx)).toBe('✓ Bypass');
        graph.actionHistoryBack(); // reloads the graph: look the nodes up again
        const [a, b] = [graph.getNodeById(node.id), graph.getNodeById(other.id)];
        expect([a.mode, b.mode]).toEqual([LiteGraph.ALWAYS, LiteGraph.ALWAYS]);
        LiteGraph.commands.execute('litegraph.node.toggleMute', LiteGraph.commands.contextFor(canvas, { node: a }));
        expect(a.mode).toBe(LiteGraph.NEVER);
        LiteGraph.commands.execute('litegraph.node.toggleMute', LiteGraph.commands.contextFor(canvas, { node: a }));
        expect(a.mode).toBe(LiteGraph.ALWAYS);
        LiteGraph.actionHistory_enabled = history;
    });

    test('a refused mode is reported; run now executes the node', () => {
        const { graph, canvas, node } = setup();
        const timer = LiteGraph.createNode('events/timer'); // valid: ALWAYS, NEVER, BYPASS
        graph.add(timer);
        const notice = jest.spyOn(canvas, 'showExecutionNotice').mockImplementation(() => null);
        LiteGraph.commands.execute('litegraph.node.setMode', { ...LiteGraph.commands.contextFor(canvas, { node: timer }), mode: LiteGraph.ON_EVENT });
        expect(timer.mode).toBe(LiteGraph.ALWAYS);
        expect(notice).toHaveBeenCalledWith(expect.stringContaining('LiteGraph.Execution.AllowAnyMode'));
        LiteGraph.commands.execute('litegraph.node.run', LiteGraph.commands.contextFor(canvas, { node }));
        expect(node.runs).toBe(1);
    });

    test('the pin menu: mode, bypass, mute, collapse, run, info, then More…', () => {
        const { canvas, node } = setup();
        const items = canvas.getNodePinMenuOptions(node).map((item) => item?.content ?? null);
        expect(items[0]).toBe('Mode: Always');
        expect(items).toEqual(expect.arrayContaining(['Bypass', 'Mute (Never)', 'Collapse', 'Run now', 'Info…', 'More…']));
    });
});

describe('graph_status extension', () => {
    beforeEach(() => useExtensions(true));
    test('the chip shows the model and opens a menu that switches it or starts and stops', () => {
        LiteGraph.settings.set(GRAPH_STATUS_SETTING, true);
        const { graph, canvas } = setup();
        expect(graphStatusLabel(graph)).toBe(LiteGraph.ExecutionEngine.getModel('ancestors').title);
        const ctx = recorder();
        drawGraphStatus(canvas, ctx);
        expect(isOverGraphStatus(canvas, 15, 15)).toBe(true);
        expect(isOverGraphStatus(canvas, 500, 500)).toBe(false);
        const menu = graphStatusMenu(canvas);
        expect(menu.find((item) => item?.content.startsWith('✓ '))?.content).toContain('Ancestors');
        menu.find((item) => item?.content === 'Step (deferred actions)').callback();
        expect(graph.config.execution).toBe('step');
        expect(graphStatusMenu(canvas).at(-1).content).toBe('Start');
        LiteGraph.settings.set(GRAPH_STATUS_SETTING, false);
        drawGraphStatus(canvas, recorder());
        expect(isOverGraphStatus(canvas, 15, 15)).toBe(false);
    });
});
