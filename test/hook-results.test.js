import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';

/**
 * Per-site result rules (event integration plan, step 2). Every canvas and node call site that
 * reads a hook result is driven through its legacy `onX` with the same set of results, and the
 * snapshot records what the site made of each: "default" when it behaved as with no result,
 * otherwise what changed. The snapshot pins each site's own rule (CallbackHandler.is / handled /
 * valueOf / objectOf); it must stay identical unless a rule is changed on purpose (decision 2).
 */

const ITEM = { content: 'From hook' };
const RESULTS = {
    'true': true,
    '1': 1,
    '{return_value: true}': { return_value: true },
    '{return_value: 1}': { return_value: 1 },
    'false': false,
};
// sites that read menus or slot lists also get list results
const LIST_RESULTS = (list) => ({ '[list]': list, '{return_value: [list]}': { return_value: list }, '{return_value: null}': { return_value: null } });

let dom;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Box {
        constructor() { this.addInput('in', 'number'); this.addInput('in2', 'number'); this.addOutput('out', 'number'); this.addProperty('k', 1); }
    }
    LiteGraph.registerNodeType('hres/box', Box);
});
beforeEach(() => {
    dom = new JSDOM('<main></main>', { pretendToBeVisual: true });
    globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.FileReader = dom.window.FileReader;
    dom.window.HTMLCanvasElement.prototype.getContext = () => recorder();
    mute();
});
const mute = () => { for (const level of ['info', 'debug', 'log', 'warn', 'error']) jest.spyOn(console, level).mockImplementation(() => {}); };
afterEach(() => { dom.window.close(); delete globalThis.window; delete globalThis.document; delete globalThis.FileReader; jest.restoreAllMocks(); });

/** a 2D context that counts its calls */
function recorder() {
    const target = { calls: 0, globalAlpha: 1, lineWidth: 1 };
    return new Proxy(target, {
        get: (t, key) => key in t ? t[key] : (key === 'start' || key === 'finish' ? undefined : () => { t.calls++; return { width: 10, addColorStop() {} }; }),
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
    canvas.background_image = null; // jsdom has no Image
    const node = LiteGraph.createNode('hres/box'); node.pos = [100, 100]; graph.add(node);
    const other = LiteGraph.createNode('hres/box'); other.pos = [400, 100]; graph.add(other);
    canvas.visible_nodes = graph._nodes; // normally computed while drawing
    return { graph, canvas, node, other };
}

const pointer = (x, y, extra = {}) => ({ type: 'pointerdown', clientX: x, clientY: y, which: 1, button: 0, buttons: 1, isPrimary: true, pointerId: 1,
    shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, ...extra });
const key = () => ({ type: 'keydown', keyCode: 81, key: 'q', code: 'KeyQ', target: { localName: 'canvas' },
    shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, preventDefault: jest.fn(), stopPropagation() {}, stopImmediatePropagation() {} });
const drop = (files = []) => ({ clientX: 120, clientY: 120, preventDefault() {}, stopPropagation() {}, dataTransfer: { types: [], files } });
const captureMenu = () => {
    const menus = [];
    jest.spyOn(LiteGraph, 'ContextMenu').mockImplementation((entries) => { menus.push(entries); });
    return menus;
};
const contents = (entries) => entries?.map((item) => item?.content ?? (Array.isArray(item) ? item[0] : item)) ?? null;
/** how a menu came out, independent of the built-in items */
const menu = (entries) => {
    if (!entries) return null;
    const items = contents(entries);
    if (items[0] === ITEM.content) return items.length === 1 ? 'only the hook items' : 'hook items first';
    if (items.includes(ITEM.content)) return 'built-in, then the hook items';
    return items.at(-1) === null ? 'built-in, then null' : 'built-in';
};
const drawCalls = (canvas, fn) => { const ctx = recorder(); fn(ctx); return ctx.calls; };

/**
 * name: [hook, where its default lives ('node' | 'canvas'), driver(env) => observable, list?]
 * The driver runs the site once; the observable is compared with the run without a result.
 */
const SITES = {
    'canvas onMouse (pointer down)': ['onMouse', 'canvas', ({ canvas, graph }) => {
        const spy = jest.spyOn(graph, 'getRerouteOnPos');
        canvas.processMouseDown(pointer(700, 500));
        return spy.mock.calls.length ? 'continued' : 'stopped';
    }],
    'node onMouseDown (pointer down on the body)': ['onMouseDown', 'node', ({ canvas }) => {
        const drag = jest.spyOn(canvas, '_dragNodesGesture');
        canvas.processMouseDown(pointer(160, 140));
        return drag.mock.calls.length ? 'drag started' : 'drag blocked';
    }],
    'node onDblClick (double click on a selected node)': ['onDblClick', 'node', ({ canvas, node }) => {
        canvas.selectNode(node);
        const panel = jest.spyOn(canvas, 'processNodeDblClicked').mockImplementation(() => {});
        jest.spyOn(canvas.pointer, 'down').mockReturnValue({ isDoubleClick: true });
        canvas.processMouseDown(pointer(160, 140));
        return panel.mock.calls.length ? 'canvas double click' : 'node handled';
    }],
    'node onKeyDown (selected node)': ['onKeyDown', 'node', ({ canvas, node }) => {
        canvas.selectNode(node);
        const e = key();
        canvas.processKey(e);
        return e.preventDefault.mock.calls.length ? 'default blocked' : 'passed on';
    }],
    'canvas onKeyDown': ['onKeyDown', 'canvas', ({ canvas }) => {
        const e = key();
        canvas.processKey(e);
        return e.preventDefault.mock.calls.length ? 'default blocked' : 'passed on';
    }],
    'canvas onRenderBackground': ['onRenderBackground', 'canvas', ({ canvas }) => {
        canvas.bgctx = recorder();
        canvas.drawBackCanvas();
        return canvas.bgctx.calls;
    }],
    'node onDrawCollapsed': ['onDrawCollapsed', 'node', ({ canvas, node }) => {
        node.flags.collapsed = true;
        return drawCalls(canvas, (ctx) => canvas.drawNode(node, ctx));
    }],
    'node onDrawTitleBar': ['onDrawTitleBar', 'node', ({ canvas, node }) =>
        drawCalls(canvas, (ctx) => canvas.drawNodeShape(node, ctx, [140, 60], '#888', '#333', false, false))],
    'node onDrawTitleBox': ['onDrawTitleBox', 'node', ({ canvas, node }) =>
        drawCalls(canvas, (ctx) => canvas.drawNodeShape(node, ctx, [140, 60], '#888', '#333', false, false))],
    'canvas onDrawLinkTooltip': ['onDrawLinkTooltip', 'canvas', ({ canvas, node, other }) => {
        const link = node.connect(0, other, 0);
        link.data = 1.5; link._pos = [10, 10];
        return drawCalls(canvas, (ctx) => canvas.drawLinkTooltip(ctx, link));
    }],
    'node onGetInputs (optional inputs menu)': ['onGetInputs', 'node', ({ node }) => {
        const menus = captureMenu();
        node.optional_inputs = [['opt', 'number']];
        LGraphCanvas.showMenuNodeOptionalInputs(null, {}, {}, null, node);
        return contents(menus[0]);
    }, [['hooked', 'number']]],
    'node onMenuNodeInputs': ['onMenuNodeInputs', 'node', ({ node }) => {
        const menus = captureMenu();
        node.optional_inputs = [['opt', 'number']];
        LGraphCanvas.showMenuNodeOptionalInputs(null, {}, {}, null, node);
        return contents(menus[0]);
    }, [ITEM]],
    'node onGetOutputs (optional outputs menu)': ['onGetOutputs', 'node', ({ node }) => {
        const menus = captureMenu();
        node.optional_outputs = [['opt', 'number']];
        LGraphCanvas.showMenuNodeOptionalOutputs(null, {}, {}, null, node);
        return contents(menus[0]);
    }, [['hooked', 'number']]],
    'node onMenuNodeOutputs': ['onMenuNodeOutputs', 'node', ({ node }) => {
        const menus = captureMenu();
        node.optional_outputs = [['opt', 'number']];
        LGraphCanvas.showMenuNodeOptionalOutputs(null, {}, {}, null, node);
        return contents(menus[0]);
    }, [ITEM]],
    'canvas getMenuOptions': ['getMenuOptions', 'canvas', ({ canvas }) => menu(canvas.getCanvasMenuOptions()), [ITEM]],
    'canvas getExtraMenuOptions': ['getExtraMenuOptions', 'canvas', ({ canvas }) => menu(canvas.getCanvasMenuOptions()), [ITEM]],
    'node getMenuOptions': ['getMenuOptions', 'node', ({ canvas, node }) => menu(canvas.getNodeMenuOptions(node)), [ITEM]],
    'node getExtraMenuOptions': ['getExtraMenuOptions', 'node', ({ canvas, node }) => menu(canvas.getNodeMenuOptions(node)), [ITEM]],
    'node getSlotMenuOptions': ['getSlotMenuOptions', 'node', ({ canvas, node }) => {
        const menus = captureMenu();
        jest.spyOn(node, 'getSlotInPosition').mockReturnValue({ input: node.inputs[0], slot: 0, link_pos: [0, 0] });
        canvas.processContextMenu(node, { canvasX: 100, canvasY: 120, clientX: 0, clientY: 0 });
        return menu(menus[0]);
    }, [ITEM]],
    'node onBeforeConnectInput (redirect or refuse)': ['onBeforeConnectInput', 'other', ({ node, other }) => {
        const link = node.connect(0, other, 0);
        return link ? `target slot ${link.target_slot}` : 'refused';
    }],
    'node onConnectOutput': ['onConnectOutput', 'node', ({ node, other }) => (node.connect(0, other, 0) ? 'connected' : 'refused')],
    'node onConnectInput': ['onConnectInput', 'other', ({ node, other }) => (node.connect(0, other, 0) ? 'connected' : 'refused')],
    'node onPropertyChanged (setProperty)': ['onPropertyChanged', 'node', ({ node }) => {
        node.setProperty('k', 2);
        return `k = ${node.properties.k}`;
    }],
    'node onSerialize': ['onSerialize', 'node', ({ node }) => {
        const warn = jest.spyOn(LiteGraph, 'log_warn');
        node.serialize();
        return warn.mock.calls.some((args) => args[1] === 'onSerialize shouldnt return anything, data should be stored in the object pass in the first parameter') ? 'warned' : 'quiet';
    }],
    'node onGetPropertyInfo': ['onGetPropertyInfo', 'node', ({ node }) => JSON.stringify(node.getPropertyInfo('k')) ?? 'undefined'],
    'canvas onSearchBoxSelection': ['onSearchBoxSelection', 'canvas', ({ canvas, graph }) => {
        const before = graph._nodes.length;
        canvas.showSearchBox(pointer(200, 200, { type: 'dblclick', target: canvas.canvas }));
        const input = canvas.search_box?.querySelector('input');
        input.value = 'hres/box';
        input.dispatchEvent(new window.KeyboardEvent('keydown', { keyCode: 13 }));
        canvas.search_box?.close?.();
        return graph._nodes.length > before ? 'node inserted' : 'handled';
    }],
    'canvas onShowNodePanel': ['onShowNodePanel', 'canvas', ({ canvas, node }) => {
        const panel = jest.spyOn(canvas, 'showShowNodePanel').mockImplementation(() => {});
        canvas.processNodeDblClicked(node);
        return panel.mock.calls.length ? 'default panel' : 'handled';
    }],
    'node onAddPropertyToPanel': ['onAddPropertyToPanel', 'node', ({ canvas, node }) => {
        // records the default rows the node panel adds (addRow, or addWidget on a custom panel)
        const added = [];
        const create = canvas.createPanel.bind(canvas);
        jest.spyOn(canvas, 'createPanel').mockImplementation((...args) => {
            const panel = create(...args);
            for (const method of ['addRow', 'addWidget']) {
                const original = panel[method]?.bind(panel);
                if (original) panel[method] = (first, ...rest) => { added.push(typeof first === 'object' ? first?.name : rest[0]); return original(first, ...rest); };
            }
            return panel;
        });
        try { canvas.showShowNodePanel(node); } catch { /* the rest of the panel may need more DOM */ }
        return added.includes('k') ? 'default row' : 'handled';
    }],
    'node onDropItem': ['onDropItem', 'node', ({ canvas }) => String(canvas.processDrop(drop()))],
    'canvas onDropItem (drop on the background)': ['onDropItem', 'canvas', ({ canvas }) => {
        const check = jest.spyOn(canvas, 'checkDropItem').mockImplementation(() => {});
        const e = drop(); e.clientX = 700; e.clientY = 500;
        canvas.processDrop(e);
        return check.mock.calls.length ? 'default drop' : 'handled';
    }],
    'node onDropFile': ['onDropFile', 'node', ({ canvas }) => {
        const read = jest.spyOn(window.FileReader.prototype, 'readAsText').mockImplementation(() => {});
        canvas.processDrop(drop([{ name: 'a.txt', type: 'text/plain' }]));
        return read.mock.calls.length ? 'read as data' : 'handled';
    }],
};

function outcome([hook, where, driver], result, hasResult) {
    const env = setup();
    const host = where === 'canvas' ? env.canvas : env[where];
    if (hasResult) host[hook] = () => result;
    try {
        return driver(env);
    } catch (error) {
        return `throws ${error.constructor.name}`;
    } finally {
        jest.restoreAllMocks(); // spies count per run
        mute();
    }
}

test('each site keeps its own rule for a hook result', () => {
    const table = {};
    for (const [name, site] of Object.entries(SITES)) {
        const base = outcome(site, null, false);
        const results = { ...RESULTS, ...(site[3] ? LIST_RESULTS(site[3]) : {}) };
        const row = { 'no result': base };
        for (const [label, result] of Object.entries(results)) {
            const seen = outcome(site, result, true);
            row[label] = JSON.stringify(seen) === JSON.stringify(base) ? 'default' : (typeof seen === 'number' ? 'handled' : seen);
        }
        if (typeof base === 'number') row['no result'] = 'drawn';
        table[name] = row;
    }
    expect(table).toMatchSnapshot();
});
