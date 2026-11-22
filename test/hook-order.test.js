import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { LGraphGroup } from '../src/lgraphgroup.js';

/**
 * Order golden for every point that fires a hook and a typed event (event integration plan,
 * step 3; pairs from the event handling audit, §3). Each case records, in order: the hook
 * handler with priority 1, the legacy `onX`, the handler with priority -1, and every typed
 * event on the graph, canvas and LiteGraph targets ("*" listeners). Events that arrive after the
 * current task are marked "later". A change to this snapshot is an ordering change: list it in
 * CHANGES.md with its reason.
 */

let dom;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Box { constructor() { this.addInput('in', 'number'); this.addOutput('out', 'number'); this.addProperty('k', 1); } }
    LiteGraph.registerNodeType('hord/box', Box);
});
beforeEach(() => {
    dom = new JSDOM('<main></main>', { pretendToBeVisual: true });
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
        get: (target, k) => k in target ? target[k] : (k === 'start' || k === 'finish' ? undefined : () => ({ width: 0 })),
        set: (target, k, v) => { target[k] = v; return true; },
    });
    for (const level of ['info', 'debug', 'log', 'warn', 'error']) jest.spyOn(console, level).mockImplementation(() => {});
});
afterEach(() => { dom.window.close(); delete globalThis.window; delete globalThis.document; jest.restoreAllMocks(); });

const element = () => {
    const el = document.createElement('canvas');
    el.width = 800; el.height = 600;
    document.querySelector('main').appendChild(el);
    return el;
};

/** a recording session: hooks and listeners are removed when it ends */
function tracer() {
    const seq = [];
    const abort = new AbortController();
    const legacy = [];
    let phase = '';
    const api = {
        seq,
        /** registers handlers +1 / -1 and a legacy onX that returns `result` */
        hook(host, label, name, result) {
            host.onHook(name, () => { seq.push(`${phase}${label}.${name} handler +1`); }, { priority: 1, signal: abort.signal });
            host.onHook(name, () => { seq.push(`${phase}${label}.${name} handler -1`); }, { priority: -1, signal: abort.signal });
            const own = Object.prototype.hasOwnProperty.call(host, name);
            legacy.push([host, name, own, host[name]]);
            host[name] = function () { seq.push(`${phase}${label}.${name} onX`); return result; };
        },
        /** records every typed event of a target */
        events(target, label) {
            target.events.on('*', (event) => seq.push(`${phase}${label} event ${event.type}`), { signal: abort.signal });
        },
        async end() {
            phase = 'later: ';
            await new Promise((resolve) => setTimeout(resolve, 0));
            abort.abort();
            for (const [host, name, own, value] of legacy.reverse()) {
                if (own) host[name] = value; else delete host[name];
            }
            return seq;
        },
    };
    return api;
}

function scene() {
    const graph = new LGraph();
    const node = LiteGraph.createNode('hord/box'); node.pos = [100, 100]; graph.add(node);
    const other = LiteGraph.createNode('hord/box'); other.pos = [400, 100]; graph.add(other);
    return { graph, node, other };
}
const withCanvas = () => {
    const env = scene();
    env.canvas = new LGraphCanvas(element(), env.graph, { skip_render: true });
    return env;
};

/** case name: async (t) => void; the trace is the snapshot */
const CASES = {
    'onNodeAdded / node-added': (t) => {
        const { graph } = scene();
        t.hook(graph, 'graph', 'onNodeAdded'); t.events(graph, 'graph');
        graph.add(LiteGraph.createNode('hord/box'));
    },
    'onNodeRemoved / node-removed': (t) => {
        const { graph, node } = scene();
        t.hook(graph, 'graph', 'onNodeRemoved'); t.events(graph, 'graph');
        graph.remove(node);
    },
    'onConfigure / configured': (t) => {
        const { graph } = scene();
        const data = graph.serialize();
        t.hook(graph, 'graph', 'onConfigure'); t.events(graph, 'graph');
        graph.configure(data);
    },
    'onPropertyChanged / node-property-changed (setProperty)': (t) => {
        const { graph, node } = scene();
        t.hook(node, 'node', 'onPropertyChanged'); t.events(graph, 'graph');
        node.setProperty('k', 2);
    },
    'onPropertyChanged vetoed / node-property-changed (setProperty)': (t) => {
        const { graph, node } = scene();
        t.hook(node, 'node', 'onPropertyChanged', false); t.events(graph, 'graph');
        node.setProperty('k', 2);
    },
    'onPropertyChanged / node-property-changed (property dialog)': (t) => {
        const { graph, canvas, node } = withCanvas();
        t.hook(node, 'node', 'onPropertyChanged'); t.events(graph, 'graph');
        const dialog = canvas.showEditPropertyValue(node, 'k');
        dialog.querySelector('input').value = '5';
        dialog.querySelector('button').click();
    },
    'onPropertyChanged vetoed / node-property-changed (property dialog)': (t) => {
        const { graph, canvas, node } = withCanvas();
        t.hook(node, 'node', 'onPropertyChanged', false); t.events(graph, 'graph');
        const dialog = canvas.showEditPropertyValue(node, 'k');
        dialog.querySelector('input').value = '5';
        dialog.querySelector('button').click();
    },
    'onWidgetChanged / widget-changed (canvas widget)': (t) => {
        const { graph, canvas, node } = withCanvas();
        const text = node.addWidget('text', 'label', 'old');
        text.last_y = 10;
        canvas.prompt = (title, value, callback) => callback('new');
        t.hook(node, 'node', 'onWidgetChanged'); t.events(graph, 'graph');
        canvas.processNodeWidgets(node, [node.pos[0] + 50, node.pos[1] + 15], { type: 'pointerdown' });
    },
    'onSelectionChange / selection-changed (selectNodes, deselectNode, deselectAllNodes)': (t) => {
        const { canvas, node, other } = withCanvas();
        t.hook(canvas, 'canvas', 'onSelectionChange'); t.events(canvas, 'canvas');
        canvas.selectNodes([node]);
        canvas.deselectNode(node);
        canvas.selectNodes([other]);
        canvas.deselectAllNodes();
    },
    'onSelectionChange / selection-changed (group selectItem, deselectItem)': (t) => {
        const { graph, canvas } = withCanvas();
        const group = new LGraphGroup('G'); graph.add(group);
        t.hook(canvas, 'canvas', 'onSelectionChange'); t.events(canvas, 'canvas');
        canvas.selectItem(group, true);
        canvas.deselectItem(group);
    },
    'onOpenSubgraph, onCloseSubgraph / subgraph-opened, subgraph-closed': (t) => {
        const { graph, canvas } = withCanvas();
        const sub = LiteGraph.createNode('graph/subgraph'); graph.add(sub);
        t.hook(canvas, 'canvas', 'onOpenSubgraph'); t.hook(canvas, 'canvas', 'onCloseSubgraph'); t.events(canvas, 'canvas');
        canvas.openSubgraph(sub.subgraph);
        canvas.closeSubgraph();
    },
    'onExecuteStep, onAfterExecute / execution-step (runStep)': (t) => {
        const { graph } = scene();
        t.hook(graph, 'graph', 'onExecuteStep'); t.hook(graph, 'graph', 'onAfterExecute'); t.events(graph, 'graph');
        graph.runStep(1);
    },
    'onConnectOutput, onConnectInput / link-connected': (t) => {
        const { graph, node, other } = scene();
        t.hook(node, 'origin', 'onConnectOutput'); t.hook(other, 'target', 'onConnectInput'); t.events(graph, 'graph');
        node.connect(0, other, 0);
    },
    'onConnectInput vetoed / link-connected': (t) => {
        const { graph, node, other } = scene();
        t.hook(node, 'origin', 'onConnectOutput'); t.hook(other, 'target', 'onConnectInput', false); t.events(graph, 'graph');
        node.connect(0, other, 0);
    },
    'onConnectOutput vetoed / link-connected': (t) => {
        const { graph, node, other } = scene();
        t.hook(node, 'origin', 'onConnectOutput', false); t.hook(other, 'target', 'onConnectInput'); t.events(graph, 'graph');
        node.connect(0, other, 0);
    },
    'onNodeTypeRegistered, onNodeTypeReplaced / node-type-registered, node-type-replaced': (t) => {
        class Once {}
        class Twice {}
        t.hook(LiteGraph, 'LiteGraph', 'onNodeTypeRegistered'); t.hook(LiteGraph, 'LiteGraph', 'onNodeTypeReplaced'); t.events(LiteGraph, 'LiteGraph');
        LiteGraph.registerNodeType('hord/replaced', Once);
        LiteGraph.registerNodeType('hord/replaced', Twice);
    },
    'on_lgraph_construct / graph-created': (t) => {
        t.hook(LiteGraph, 'LiteGraph', 'on_lgraph_construct'); t.events(LiteGraph, 'LiteGraph');
        new LGraph();
    },
    'on_lgraphcanvas_construct / canvas-created': (t) => {
        const graph = new LGraph();
        t.hook(LiteGraph, 'LiteGraph', 'on_lgraphcanvas_construct'); t.events(LiteGraph, 'LiteGraph');
        new LGraphCanvas(element(), graph, { skip_render: true });
    },
};

test.each(Object.keys(CASES))('%s', async (name) => {
    const t = tracer();
    try {
        CASES[name](t);
    } finally {
        expect(await t.end()).toMatchSnapshot();
    }
});
