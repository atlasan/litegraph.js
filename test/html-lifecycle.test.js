import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { CallbackHandler } from '../src/callbackhandler.js';
import '../src/nodes/html.js';

let dom, graphs;
beforeAll(async () => { LiteGraph.initialize(); await LiteGraph.LibraryManager.ready; });
beforeEach(() => {
    dom = new JSDOM('<main></main>');
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    graphs = [];
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
});
afterEach(() => {
    for (const graph of graphs) graph.clear();
    dom.window.close(); delete globalThis.window; delete globalThis.document;
    jest.restoreAllMocks();
});
function attachedGraph() {
    const graph = new LGraph(); graphs.push(graph);
    // Rendering is outside this DOM lifecycle fixture; use the canvas host contract.
    const element = document.createElement('canvas'); document.querySelector('main').appendChild(element);
    const canvas = { canvas: element, graph, ds: { scale: 1 }, selected_nodes: {}, convertOffsetToCanvas: (pos) => pos };
    const callbacks = new CallbackHandler(canvas);
    canvas.registerCallbackHandler = callbacks.registerCallbackHandler.bind(callbacks);
    canvas.unregisterCallbackHandler = callbacks.unregisterCallbackHandler.bind(callbacks);
    canvas.processCallbackHandlers = callbacks.processCallbackHandlers.bind(callbacks);
    graph.list_of_graphcanvas = [canvas];
    return { graph, canvas, callbacks };
}
const handlerCount = (callbacks) => Object.values(callbacks.callbacks_handlers).reduce((sum, entry) => sum + entry.handlers.length, 0);

test.each(['html/node_html', 'html/json_viewer'])('%s releases overlays and canvas handlers through repeated removal', (type) => {
    const { graph, callbacks } = attachedGraph();
    for (let i = 0; i < 3; i++) {
        const node = LiteGraph.createNode(type); graph.add(node); node.onExecute();
        expect(document.querySelectorAll('.lg-html-element')).toHaveLength(1);
        expect(handlerCount(callbacks)).toBe(2);
        graph.remove(node);
        expect(document.querySelectorAll('.lg-html-element')).toHaveLength(0);
        expect(handlerCount(callbacks)).toBe(0);
    }
});

test('a removed HTML node recreates its content and bindings on a different canvas', () => {
    const first = attachedGraph(); const second = attachedGraph();
    const node = LiteGraph.createNode('html/node_html');
    first.graph.add(node); node.setProperty('html', '<strong>Restored content</strong>'); node.onExecute();
    const oldElement = node._el;
    first.graph.remove(node); second.graph.add(node); node.onExecute();
    expect(node._el).not.toBe(oldElement);
    expect(node._el.isConnected).toBe(true);
    expect(node._el_cont.textContent).toBe('Restored content');
    expect(handlerCount(first.callbacks)).toBe(0);
    expect(handlerCount(second.callbacks)).toBe(2);
});

test('nested subgraph navigation restores the original HTML display style', () => {
    const { graph, canvas } = attachedGraph();
    const node = LiteGraph.createNode('html/node_html'); graph.add(node); node.onExecute();
    node._el.style.display = 'flex';
    canvas.processCallbackHandlers('onOpenSubgraph', {}, new LGraph(), graph);
    expect(node._el.style.display).toBe('none');
    canvas.processCallbackHandlers('onOpenSubgraph', {}, new LGraph(), graph);
    canvas.processCallbackHandlers('onCloseSubgraph', {}, graph);
    expect(node._el.style.display).toBe('flex');
});

test('HTML overlays retain a visible content area and align below scaled slots', () => {
    const { graph, canvas } = attachedGraph();
    const node = LiteGraph.createNode('html/node_html'); graph.add(node); node.onExecute();
    expect(parseFloat(node._el.style.height)).toBeGreaterThan(0);
    node.pos = [100, 80]; canvas.ds.scale = 0.5;
    canvas.convertOffsetToCanvas = (pos) => [pos[0] * 0.5, pos[1] * 0.5];
    node.htmlRefreshElement();
    expect(node._el.style.top).toBe('55px');
    expect(node._el.style.left).toBe('50px');
    expect(node._el.style.height).toBe('50px');
});
