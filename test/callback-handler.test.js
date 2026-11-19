import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { CallbackHandler } from '../src/callbackhandler.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
});

const make = () => new CallbackHandler({ name: 'owner' });

describe('CallbackHandler chain semantics', () => {
    test('handlers run by priority, default between >= 0 and < 0, `this` is the owner', () => {
        const h = make();
        const order = [];
        h.registerCallbackHandler('ev', function () { order.push(['low', this.name]); }, { priority: -1 });
        h.registerCallbackHandler('ev', () => { order.push('high'); }, { priority: 5 });
        h.registerCallbackHandler('ev', () => { order.push('zero'); });
        h.processCallbackHandlers('ev', { def_cb() { order.push(['default', this.name]); } });
        expect(order).toEqual(['high', 'zero', ['default', 'owner'], ['low', 'owner']]);
    });

    test('stop_replication stops later handlers and the default callback', () => {
        const h = make();
        const order = [];
        h.registerCallbackHandler('ev', () => { order.push('first'); return { stop_replication: true, return_value: 1 }; }, { priority: 1 });
        h.registerCallbackHandler('ev', () => { order.push('later'); });
        const ret = h.processCallbackHandlers('ev', { def_cb: () => order.push('default') });
        expect(order).toEqual(['first']);
        expect(ret.return_value).toBe(1);
    });

    test('prevent_default skips the default callback and handlers registered as default', () => {
        const h = make();
        const order = [];
        h.registerCallbackHandler('ev', () => ({ prevent_default: true }), { priority: 2 });
        h.registerCallbackHandler('ev', () => { order.push('registered-default'); }, { priority: 1, is_default: true });
        h.registerCallbackHandler('ev', () => { order.push('normal'); }, { priority: -1 });
        h.processCallbackHandlers('ev', { def_cb: () => order.push('default') });
        expect(order).toEqual(['normal']);
    });

    test('result_priority keeps a higher-priority result from being overridden', () => {
        const h = make();
        h.registerCallbackHandler('ev', () => ({ return_value: 'important', result_priority: 10 }), { priority: 3 });
        h.registerCallbackHandler('ev', () => ({ return_value: 'ordinary' }), { priority: 2 });
        h.registerCallbackHandler('ev', () => 'plain', { priority: 1 });
        expect(h.processCallbackHandlers('ev', {}).return_value).toBe('important');
        const later = make();
        later.registerCallbackHandler('ev', () => ({ return_value: 'a' }), { priority: 2 });
        later.registerCallbackHandler('ev', () => ({ return_value: 'b', result_priority: 1 }), { priority: 1 });
        expect(later.processCallbackHandlers('ev', {}).return_value).toBe('b');
        const plain = make();
        plain.registerCallbackHandler('ev', () => 'x', { priority: 2 });
        plain.registerCallbackHandler('ev', () => 'y', { priority: 1 });
        expect(plain.processCallbackHandlers('ev', {})).toBe('y'); // unchanged legacy behaviour
    });

    test('call_once handlers run once, even when they stop the chain or re-enter', () => {
        const h = make();
        let calls = 0;
        h.registerCallbackHandler('ev', () => {
            calls++;
            h.processCallbackHandlers('ev', {}); // re-entrant dispatch must not run it again
            return { stop_replication: true };
        }, { call_once: true });
        h.processCallbackHandlers('ev', {});
        h.processCallbackHandlers('ev', {});
        expect(calls).toBe(1);
    });

    test('unregister by id', () => {
        const h = make();
        const fn = jest.fn();
        const id = h.registerCallbackHandler('ev', fn);
        expect(h.unregisterCallbackHandler('ev', id)).toBe(true);
        h.processCallbackHandlers('ev', {});
        expect(fn).not.toHaveBeenCalled();
        expect(h.unregisterCallbackHandler('ev', id)).toBe(false);
    });
});
