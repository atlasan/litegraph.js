import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphNode } from '../src/lgraphnode.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { LGraphGroup } from '../src/lgraphgroup.js';
import { CallbackHandler } from '../src/callbackhandler.js';
import { ListenerList } from '../src/eventtarget.js';

// Wave 7: hooks and typed events on one listener core (audit 2026-11-22-event-handling, E1-E13).

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Box { constructor() { this.addInput('in', 'number'); this.addOutput('out', 'number'); } }
    LiteGraph.registerNodeType('hooks/box', Box);
});
beforeEach(() => {
    for (const level of ['info', 'debug', 'log', 'warn', 'error']) jest.spyOn(console, level).mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const make = () => new CallbackHandler({ name: 'owner' });

describe('legacy onX assignment stays the default callback', () => {
    test('assigned before or after handlers, replaced, or from the prototype', () => {
        const order = [];
        class Proto { onExecute() { order.push('proto'); } }
        LiteGraph.registerNodeType('hooks/proto', Proto);
        const node = LiteGraph.createNode('hooks/proto');
        const run = () => node.processCallbackHandlers('onExecute', { def_cb: node.onExecute }, 1);
        run();
        node.registerCallbackHandler('onExecute', () => { order.push('hi'); }, { priority: 1 });
        node.registerCallbackHandler('onExecute', () => { order.push('lo'); }, { priority: -1 });
        run();
        node.onExecute = function (param) { order.push(['own', param, this === node]); }; // direct replacement
        run();
        expect(order).toEqual(['proto', 'hi', 'proto', 'lo', 'hi', ['own', 1, true], 'lo']);
    });

    test('LiteGraph-level and canvas prototype callbacks keep working', () => {
        const seen = [];
        LiteGraph.onNodeTypeRegistered = (type) => seen.push(type);
        class Late {}
        LiteGraph.registerNodeType('hooks/late', Late);
        delete LiteGraph.onNodeTypeRegistered;
        expect(seen).toEqual(['hooks/late']);
    });

    test('the handler registry is created when first needed, and cb_handler stays readable and assignable', () => {
        const node = LiteGraph.createNode('hooks/box');
        node.onResize = () => 7;
        expect(node.processCallbackHandlers('onResize', { def_cb: node.onResize })).toBe(7);
        expect(node._cb_handler).toBeFalsy(); // dispatching alone allocates nothing
        node.onHook('onResize', () => {});
        expect(node._cb_handler).toBeInstanceOf(CallbackHandler);
        // direct reads, as before: every host has a CallbackHandler on cb_handler
        for (const host of [new LGraph(), LiteGraph.createNode('hooks/box'), new LGraphGroup('G'), LiteGraph]) {
            expect(host.cb_handler).toBeInstanceOf(CallbackHandler);
            expect(host.cb_handler.ob_ref).toBe(host);
            expect(host.cb_handler.callbacks_handlers).toEqual(expect.any(Object));
        }
        // the old setup pattern still works: assigning a handler and registering on it directly
        const graph = new LGraph();
        graph.cb_handler = new CallbackHandler(graph);
        const seen = [];
        graph.cb_handler.registerCallbackHandler('onNodeAdded', (info, added) => seen.push(added.type));
        graph.add(LiteGraph.createNode('hooks/box'));
        expect(seen).toEqual(['hooks/box']);
    });

    test('an overridden processCallbackHandlers on the handler (a tracing wrapper) still runs', () => {
        const node = LiteGraph.createNode('hooks/box');
        const traced = [];
        const original = node.cb_handler.processCallbackHandlers;
        node.cb_handler.processCallbackHandlers = function (name, ...rest) { traced.push(name); return original.call(this, name, ...rest); };
        node.onResize = () => 'r';
        expect(node.processCallbackHandlers('onResize', { def_cb: node.onResize })).toBe('r');
        expect(traced).toEqual(['onResize']);
    });

    test('a handler list replaced by a plain {last_id, handlers} object keeps working', () => {
        const h = make();
        const fn = jest.fn();
        h.callbacks_handlers.ev = { last_id: 3, handlers: [] };
        expect(h.registerCallbackHandler('ev', fn)).toBe(3);
        expect(h.hasCallbackHandlers('ev')).toBe(true);
        h.processCallbackHandlers('ev', {});
        expect(fn).toHaveBeenCalledTimes(1);
    });
});

describe('results are unchanged with or without handlers', () => {
    const cases = [undefined, null, false, 0, true, 'x', { return_value: true }, { return_value: false, result_priority: 2 }];
    test.each(cases.map((value) => [JSON.stringify(value) ?? 'undefined', value]))('default returning %s', (_label, value) => {
        const bare = make();
        const withNoop = make();
        withNoop.registerCallbackHandler('ev', () => undefined, { priority: 1 });
        const seen = [];
        const opts = { def_cb: () => value, on_result: (r) => seen.push(r) };
        const expected = value === undefined ? null : value;
        expect(bare.processCallbackHandlers('ev', opts)).toBe(expected);
        expect(withNoop.processCallbackHandlers('ev', opts)).toBe(expected);
        expect(seen).toEqual([value, undefined, value]);
    });

    test('no default and no handler gives null', () => {
        expect(make().processCallbackHandlers('ev', {})).toBeNull();
        expect(make().processCallbackHandlers('ev')).toBeNull();
    });
});

describe('robustness (E1, E2)', () => {
    test('a handler registered during a dispatch runs from the next dispatch (E1)', () => {
        const h = make();
        const order = [];
        let once = false;
        h.registerCallbackHandler('ev', () => {
            order.push('a');
            if (!once) { once = true; h.registerCallbackHandler('ev', () => order.push('new'), { priority: 9 }); }
        }, { priority: 1 });
        h.registerCallbackHandler('ev', () => order.push('b'));
        h.processCallbackHandlers('ev', {});
        expect(order).toEqual(['a', 'b']);
        h.processCallbackHandlers('ev', {});
        expect(order).toEqual(['a', 'b', 'new', 'a', 'b']);
    });

    test('registering on every call terminates (E1)', () => {
        const h = make();
        h.registerCallbackHandler('ev', () => { h.registerCallbackHandler('ev', () => {}, { priority: 9 }); }, { priority: 1 });
        h.processCallbackHandlers('ev', {});
        expect(h.callbacks_handlers.ev.size).toBe(2);
    });

    test('a throwing handler does not stop the chain; the first error is rethrown after it (E2)', () => {
        const h = make();
        const order = [];
        const first = new Error('first');
        h.registerCallbackHandler('ev', () => { throw first; }, { priority: 2 });
        h.registerCallbackHandler('ev', () => { throw new Error('second'); }, { priority: 1 });
        h.registerCallbackHandler('ev', () => order.push('after'), { priority: -1 });
        const logged = jest.spyOn(LiteGraph, 'log_error').mockImplementation(() => {});
        expect(() => h.processCallbackHandlers('ev', { def_cb: () => order.push('default') })).toThrow(first);
        expect(order).toEqual(['default', 'after']);
        expect(logged).toHaveBeenCalledWith('hook', 'ev', 'handler failed', expect.objectContaining({ message: 'second' }));
    });

    test('a throwing default callback without handlers propagates as before', () => {
        expect(() => make().processCallbackHandlers('ev', { def_cb() { throw new Error('boom'); } })).toThrow('boom');
    });
});

describe('disposers, signal, once, introspection', () => {
    test('a re-entrant dispatch does not run a once handler twice (hooks and typed events)', () => {
        const h = make();
        const runs = { a: 0, b: 0 };
        h.registerCallbackHandler('ev', () => { runs.a++; h.processCallbackHandlers('ev', {}); }, { priority: 1, once: true });
        h.registerCallbackHandler('ev', () => { runs.b++; }, { once: true });
        h.processCallbackHandlers('ev', {});
        expect(runs).toEqual({ a: 1, b: 1 });
        const graph = new LGraph();
        const typed = { a: 0, b: 0 };
        graph.events.once('changed', () => { typed.a++; graph.events.dispatch('changed', {}); }, { priority: 1 });
        graph.events.once('changed', () => { typed.b++; });
        graph.events.dispatch('changed', {});
        expect(typed).toEqual({ a: 1, b: 1 });
    });

    test('removing a listener detaches it from its AbortSignal', () => {
        let added = 0;
        let removed = 0;
        const signal = { aborted: false, addEventListener: () => { added++; }, removeEventListener: () => { removed++; } };
        const graph = new LGraph();
        for (let i = 0; i < 5; i++) graph.events.on('changed', () => {}, { signal })();
        const node = LiteGraph.createNode('hooks/box');
        for (let i = 0; i < 5; i++) node.onHook('onResize', () => {}, { signal })();
        expect([added, removed]).toEqual([10, 10]);
    });

    test('changing the options object after on() does not change the listener', () => {
        const graph = new LGraph();
        const options = { once: false };
        const fn = jest.fn();
        graph.events.on('changed', fn, options);
        options.once = true;
        graph.events.dispatch('changed', {});
        graph.events.dispatch('changed', {});
        expect(fn).toHaveBeenCalledTimes(2);
    });

    test('onHook returns a disposer; signal and once unregister', () => {
        const node = LiteGraph.createNode('hooks/box');
        const calls = [];
        const off = node.onHook('onResize', () => calls.push('off'));
        const controller = new AbortController();
        node.onHook('onResize', () => calls.push('signal'), { signal: controller.signal });
        node.onHook('onResize', () => calls.push('once'), { once: true });
        expect(node.hasCallbackHandlers('onResize')).toBe(true);
        node.processCallbackHandlers('onResize', {});
        off();
        controller.abort();
        node.processCallbackHandlers('onResize', {});
        expect(calls).toEqual(['off', 'signal', 'once']);
        expect(node.hasCallbackHandlers('onResize')).toBe(false);
        expect(() => node.onHook('onResize', 'nope')).toThrow(TypeError);
        expect(node.registerCallbackHandler('onResize', 'nope')).toBe(false);
    });

    test('ids stay numeric and per name; the storage keeps its {handlers, last_id} shape', () => {
        const h = make();
        expect([h.registerCallbackHandler('a', () => {}), h.registerCallbackHandler('a', () => {}), h.registerCallbackHandler('b', () => {})]).toEqual([0, 1, 0]);
        expect(h.callbacks_handlers.a).toBeInstanceOf(ListenerList);
        expect(h.callbacks_handlers.a.handlers.map((e) => e.id)).toEqual([0, 1]);
        expect(h.callbacks_handlers.a.last_id).toBe(2);
        expect(h.unregisterCallbackHandler('missing', 0)).toBe(false);
    });
});

describe('result helpers', () => {
    test.each([
        [true, { isTrue: true, isFalse: false, handled: true, value: true }],
        [false, { isTrue: false, isFalse: true, handled: false, value: false }],
        [null, { isTrue: false, isFalse: false, handled: false, value: null }],
        [1, { isTrue: false, isFalse: false, handled: false, value: 1 }],
        [{ return_value: true }, { isTrue: true, isFalse: false, handled: true, value: true }],
        [{ return_value: 1 }, { isTrue: false, isFalse: false, handled: true, value: 1 }],
        [{ return_value: false }, { isTrue: false, isFalse: true, handled: false, value: false }],
        [{ prevent_default: true }, { isTrue: false, isFalse: false, handled: false, value: undefined }],
    ])('%j', (result, expected) => {
        expect({
            isTrue: CallbackHandler.is(result, true),
            isFalse: CallbackHandler.is(result, false),
            handled: CallbackHandler.handled(result),
            value: CallbackHandler.valueOf(result),
        }).toEqual(expected);
    });
});

describe('typed events', () => {
    test('LiteGraph.events reports node types and new graphs', () => {
        const seen = [];
        const offAll = LiteGraph.events.on('*', (event) => seen.push(event.type));
        class Typed {}
        class Typed2 {}
        LiteGraph.registerNodeType('hooks/typed', Typed);
        LiteGraph.registerNodeType('hooks/typed', Typed2);
        LiteGraph.unregisterNodeType('hooks/typed');
        new LGraph();
        offAll();
        expect(seen).toEqual(['node-type-registered', 'node-type-registered', 'node-type-replaced', 'node-type-unregistered', 'graph-created']);
    });

    test('priority orders listeners; "*" runs after the type listeners; a throwing listener is isolated', () => {
        const graph = new LGraph();
        const order = [];
        graph.events.on('node-added', () => order.push('normal'));
        graph.events.on('node-added', () => { throw new Error('isolated'); });
        graph.events.on('node-added', () => order.push('first'), { priority: 5 });
        graph.events.on('*', (event) => order.push(`*:${event.type}`));
        jest.spyOn(LiteGraph, 'log_error').mockImplementation(() => {});
        graph.add(LiteGraph.createNode('hooks/box'));
        expect(order.filter((entry) => !entry.startsWith('*:') || entry === '*:node-added')).toEqual(['first', 'normal', '*:node-added']);
    });

    test('groups emit group-added and group-removed', () => {
        const graph = new LGraph();
        const seen = [];
        graph.events.on('group-added', (e) => seen.push(['added', e.detail.group.title]));
        graph.events.on('group-removed', (e) => seen.push(['removed', e.detail.group.title]));
        const group = new LGraphGroup('G');
        graph.add(group);
        graph.remove(group);
        expect(seen).toEqual([['added', 'G'], ['removed', 'G']]);
    });
});

describe('extension context', () => {
    test('ctx.listen routes hook names to hooks and other names to typed events, both disposed', () => {
        const graph = new LGraph();
        const seen = [];
        const dispose = LiteGraph.registerExtension({
            name: 'hooks.listen',
            setup(ctx) {
                ctx.listen(graph, 'onNodeAdded', (info, node) => seen.push(['hook', node.type]));
                ctx.listen(graph, 'node-added', (event) => seen.push(['event', event.detail.node.type]));
            },
        });
        graph.add(LiteGraph.createNode('hooks/box'));
        dispose();
        graph.add(LiteGraph.createNode('hooks/box'));
        expect(seen).toEqual([['hook', 'hooks/box'], ['event', 'hooks/box']]);
        expect(graph.hasCallbackHandlers('onNodeAdded')).toBe(false);
        expect(graph.events.has('node-added')).toBe(false);
    });
});

describe('canvas fixes', () => {
    let dom;
    beforeEach(() => {
        dom = new JSDOM('<main></main>');
        globalThis.window = dom.window; globalThis.document = dom.window.document;
        dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
            get: (target, k) => k in target ? target[k] : () => ({ width: 0 }),
            set: (target, k, v) => { target[k] = v; return true; },
        });
    });
    afterEach(() => { dom.window.close(); delete globalThis.window; delete globalThis.document; });

    const setup = () => {
        const graph = new LGraph();
        const el = document.createElement('canvas');
        document.querySelector('main').appendChild(el);
        const canvas = new LGraphCanvas(el, graph, { skip_render: true });
        const node = LiteGraph.createNode('hooks/box');
        node.pos = [100, 100];
        graph.add(node);
        return { graph, canvas, node };
    };

    test('dropping on a node without onDropItem no longer throws (E12)', () => {
        const { canvas } = setup();
        const e = { clientX: 120, clientY: 120, preventDefault() {}, dataTransfer: { types: [], files: [] } };
        expect(() => canvas.processDrop(e)).not.toThrow();
    });

    test('mouse down runs the canvas onMouse hook, not onClear (E13)', () => {
        const { canvas } = setup();
        const onClear = jest.fn();
        canvas.onHook('onClear', onClear);
        canvas.onMouse = jest.fn(() => false); // a false result still vetoes the press
        canvas.processMouseDown({ type: 'pointerdown', clientX: 600, clientY: 500, which: 1, button: 0, buttons: 1, isPrimary: true, pointerId: 1,
            shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} });
        expect(canvas.onMouse).toHaveBeenCalledTimes(1);
        expect(onClear).not.toHaveBeenCalled();
    });

    test('selecting a group fires onSelectionChange as well as selection-changed', () => {
        const { graph, canvas } = setup();
        const group = new LGraphGroup('G');
        graph.add(group);
        const hook = jest.fn();
        const event = jest.fn();
        canvas.onSelectionChange = hook;
        canvas.events.on('selection-changed', event);
        canvas.selectItem(group, true); // add: no deselect-all first
        canvas.deselectItem(group);
        expect(hook).toHaveBeenCalledTimes(2);
        expect(event).toHaveBeenCalledTimes(2);
    });

    test('a legacy onAddPropertyToPanel returning an element still replaces the default row', () => {
        const { canvas, node } = setup();
        node.properties = { label: 'x', other: 'y' };
        node.onAddPropertyToPanel = jest.fn((name) => name === 'label' ? document.createElement('div') : undefined); // truthy object, no return_value
        const panel = canvas.showShowNodePanel(node);
        try {
            expect(node.onAddPropertyToPanel).toHaveBeenCalledWith('label', panel, 'x', expect.anything(), expect.any(Function));
            expect(panel.querySelector('.lg-row[data-property="label"]')).toBeNull();
            expect(panel.querySelector('.lg-row[data-property="other"]')).not.toBeNull();
        } finally { panel.close(); }
    });

    test('a registered onAddPropertyToPanel handler counts by its return_value', () => {
        const { canvas, node } = setup();
        node.properties = { label: 'x', other: 'y' };
        const off = node.onHook('onAddPropertyToPanel', (info, name) => ({ return_value: name === 'label' }));
        const panel = canvas.showShowNodePanel(node);
        try {
            expect(panel.querySelector('.lg-row[data-property="label"]')).toBeNull();
            expect(panel.querySelector('.lg-row[data-property="other"]')).not.toBeNull();
        } finally { panel.close(); off(); }
    });

    test('registered node classes receive the hook API from LGraphNode', () => {
        const node = LiteGraph.createNode('hooks/box');
        expect(node).not.toBeInstanceOf(LGraphNode);
        expect(typeof node.onHook).toBe('function');
    });
});

describe('fireHookThenEvent: hook chain, then the typed event', () => {
    test('order, the returned result, and a veto that skips the event', () => {
        const graph = new LGraph();
        const seq = [];
        graph.onHook('onThing', () => { seq.push('hi'); }, { priority: 1 });
        graph.onHook('onThing', () => { seq.push('lo'); }, { priority: -1 });
        graph.onThing = (value) => { seq.push(['onX', value]); return value === 'no' ? false : undefined; };
        graph.events.on('thing', (event) => seq.push(['event', event.detail.value]));
        const fire = (value) => CallbackHandler.fireHookThenEvent(graph, 'onThing', [value], graph, 'thing', () => ({ value }), { veto: false });
        expect(fire('yes')).toBeNull(); // as processCallbackHandlers: null when nothing returned a value
        expect(fire('no')).toBe(false);
        expect(seq).toEqual(['hi', ['onX', 'yes'], 'lo', ['event', 'yes'], 'hi', ['onX', 'no'], 'lo']);
    });

    test('a {return_value: false} veto counts; without veto the event always fires; a null detail skips it', () => {
        const graph = new LGraph();
        const seen = [];
        graph.events.on('thing', (event) => seen.push(event.detail));
        graph.onHook('onThing', () => ({ return_value: false }));
        CallbackHandler.fireHookThenEvent(graph, 'onThing', [], graph, 'thing', { a: 1 }, { veto: false });
        CallbackHandler.fireHookThenEvent(graph, 'onThing', [], graph, 'thing', { a: 2 });
        CallbackHandler.fireHookThenEvent(graph, 'onThing', [], graph, 'thing', () => null);
        CallbackHandler.fireHookThenEvent(graph, 'onThing', [], null, 'thing', { a: 3 }); // no emitter
        expect(seen).toEqual([{ a: 2 }]);
    });

    test('a vetoed setProperty is reverted and fires no event (the property dialog: see hook-order)', () => {
        const graph = new LGraph();
        const node = LiteGraph.createNode('hooks/box');
        node.properties = { k: 1 };
        graph.add(node);
        const events = [];
        graph.events.on('node-property-changed', (event) => events.push(event.detail.value));
        graph.events.on('changed', () => events.push('changed'));
        node.onPropertyChanged = (name, value) => (value === 9 ? false : undefined);
        node.setProperty('k', 9);
        node.setProperty('k', 2);
        expect(node.properties.k).toBe(2);
        expect(events).toEqual([2]);
    });
});

describe('dispatch tap (USE-34 base)', () => {
    afterEach(() => LiteGraph.setDispatchTap(null));

    test('reports hooks and typed events with owner, name, phase, ms and error', () => {
        const graph = new LGraph();
        const node = LiteGraph.createNode('hooks/box');
        node.onExecute = () => {};
        graph.add(node);
        graph.events.on('node-added', () => { throw new Error('listener'); });
        const records = [];
        expect(LiteGraph.setDispatchTap((record) => records.push(record))).toBeNull();
        graph.runStep(1);
        graph.add(LiteGraph.createNode('hooks/box'));
        LiteGraph.setDispatchTap(null);
        node.processCallbackHandlers('onExecute', { def_cb: node.onExecute });
        const execute = records.filter((r) => r.name === 'onExecute');
        expect(execute).toHaveLength(1); // a per-node execution trace
        expect(execute[0]).toMatchObject({ owner: node, phase: 'hook', error: null });
        expect(typeof execute[0].ms).toBe('number');
        const added = records.find((r) => r.name === 'node-added');
        expect(added).toMatchObject({ owner: graph, phase: 'event' });
        expect(added.error.message).toBe('listener');
    });

    test('a throwing hook is reported and still thrown; the tap\'s own dispatches and failures stay out', () => {
        const node = LiteGraph.createNode('hooks/box');
        node.onHook('onBoom', () => { throw new Error('boom'); });
        const records = [];
        LiteGraph.setDispatchTap((record) => {
            records.push(record.name);
            node.processCallbackHandlers('onInsideTap', {}); // not reported
            throw new Error('tap failed'); // logged, never thrown to the dispatcher
        });
        expect(() => node.processCallbackHandlers('onBoom', {})).toThrow('boom');
        expect(node.processCallbackHandlers('onQuiet', { def_cb: () => 3 })).toBe(3);
        expect(records).toEqual(['onBoom', 'onQuiet']);
    });
});

test('CallbackHandler.objectOf: the menu hooks\' rule', () => {
    const list = [{ content: 'x' }];
    expect(CallbackHandler.objectOf({ return_value: list }, 'fb')).toBe(list);
    expect(CallbackHandler.objectOf({ return_value: null }, 'fb')).toBeNull();
    expect(CallbackHandler.objectOf(list, 'fb')).toBe('fb'); // a plain array only with arrays = true
    expect(CallbackHandler.objectOf(list, 'fb', true)).toBe(list);
    for (const result of [null, true, 1, false, { return_value: 1 }]) expect(CallbackHandler.objectOf(result, 'fb', true)).toBe('fb');
});
