import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { CallbackHandler } from '../src/callbackhandler.js';
import { ListenerList } from '../src/eventtarget.js';

// Wave 7 step 13 (state audit N-1): the old hook-registry names keep working and log once per
// name per process. The order of the tests matters: the library's own use comes first, while
// nothing has been logged yet.

const NAMES = ['callbacks_handlers', 'cb_handler', 'callbackhandler_setup'];
let warn;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Box { constructor() { this.addInput('in', 'number'); this.addOutput('out', 'number'); } }
    LiteGraph.registerNodeType('dep/box', Box);
});
beforeEach(() => {
    for (const level of ['info', 'debug', 'log', 'warn', 'error']) jest.spyOn(console, level).mockImplementation(() => {});
    warn = jest.spyOn(LiteGraph, 'log_warn');
});
afterEach(() => jest.restoreAllMocks());

/** the deprecation lines logged for name since the spy was set */
const logged = (name) => warn.mock.calls.filter((args) => args[0] === 'deprecated' && args.slice(1).join(' ').includes(name));

test('the library itself never uses the deprecated names', () => {
    LiteGraph.setupPlatform(); // initialize() ran in beforeAll; the callbackhandler_setup test shows it logged nothing
    const graph = new LGraph();
    const a = LiteGraph.createNode('dep/box'); graph.add(a);
    const b = LiteGraph.createNode('dep/box'); graph.add(b);
    const seen = [];
    const off = a.onHook('onConnectOutput', () => { seen.push('hook'); });
    graph.registerCallbackHandler('onNodeAdded', () => {});
    LiteGraph.registerCallbackHandler('onNodeTypeRegistered', () => {});
    a.connect(0, b, 0);
    expect(a.hasCallbackHandlers('onConnectOutput')).toBe(true);
    off();
    graph.runStep(1);
    graph.serialize();
    expect(seen).toEqual(['hook']);
    for (const name of NAMES) expect(logged(name)).toEqual([]);
});

test('host.cb_handler: same handler as before, assignable, logged once', () => {
    const graph = new LGraph();
    const first = graph.cb_handler;
    expect(first).toBeInstanceOf(CallbackHandler);
    expect(first.ob_ref).toBe(graph);
    expect(graph.cb_handler).toBe(first);
    const replacement = new CallbackHandler(graph);
    graph.cb_handler = replacement;
    expect(graph.cb_handler).toBe(replacement);
    const seen = [];
    replacement.registerCallbackHandler('onNodeAdded', () => seen.push('added'));
    graph.add(LiteGraph.createNode('dep/box'));
    expect(seen).toEqual(['added']);
    expect(logged('cb_handler')).toHaveLength(1);
    expect(logged('cb_handler')[0].join(' ')).toMatch(/registerCallbackHandler|onHook/);
});

test('handler.callbacks_handlers: the live per-name record, logged once', () => {
    const handler = new CallbackHandler({});
    handler.registerCallbackHandler('ev', () => 1);
    const record = handler.callbacks_handlers;
    expect(record.ev).toBeInstanceOf(ListenerList);
    expect(record.ev.size).toBe(1);
    // a replaced entry still works, as before
    handler.callbacks_handlers.other = { last_id: 3, handlers: [] };
    expect(handler.registerCallbackHandler('other', () => 2)).toBe(3);
    expect(handler.processCallbackHandlers('other', {})).toBe(2);
    expect(new CallbackHandler({}).callbacks_handlers).toEqual({});
    expect(logged('callbacks_handlers')).toHaveLength(1);
});

test('host.callbackhandler_setup(): returns the handler, logged once', () => {
    const graph = new LGraph();
    const handler = graph.callbackhandler_setup();
    expect(handler).toBeInstanceOf(CallbackHandler);
    expect(graph.callbackhandler_setup()).toBe(handler);
    LiteGraph.callbackhandler_setup();
    expect(logged('callbackhandler_setup')).toHaveLength(1);
});

test('after the first time, no name logs again', () => {
    const graph = new LGraph();
    void graph.cb_handler.callbacks_handlers;
    graph.callbackhandler_setup();
    expect(warn.mock.calls.filter((args) => args[0] === 'deprecated')).toEqual([]);
});
