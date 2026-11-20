import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { CommandRegistry } from '../src/commands.js';
import { KeybindingRegistry } from '../src/keybindings.js';
import { SettingsRegistry } from '../src/settings.js';
import { ExtensionRegistry } from '../src/extensionregistry.js';
import { keyboardHelperExtension } from '../src/extensions/keyboard_helper.js';
import { renamerExtension } from '../src/extensions/renamer.js';
import { autoconnectExtension } from '../src/extensions/autoconnect.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Box { constructor() { this.addInput('in', 'number'); this.addOutput('out', 'number'); } }
    LiteGraph.registerNodeType('platform/box', Box);
});

const key = (key, extra = {}) => ({ key, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, repeat: false, target: { localName: 'canvas' }, ...extra });

describe('CommandRegistry', () => {
    test('register, replace, restore, enable and execute', () => {
        const commands = new CommandRegistry();
        const runs = [];
        const disposeA = commands.register({ id: 'x', run: () => runs.push('a') });
        const disposeB = commands.register({ id: 'x', run: () => runs.push('b'), when: (ctx) => ctx.ok });
        expect(commands.execute('x', { ok: false })).toEqual({ executed: false });
        expect(commands.execute('x', { ok: true }).executed).toBe(true);
        disposeB();
        commands.execute('x');
        expect(runs).toEqual(['b', 'a']);
        disposeA();
        expect(commands.has('x')).toBe(false);
        expect(() => commands.register({ id: '', run() {} })).toThrow();
        expect(() => commands.register({ id: 'y' })).toThrow();
    });

    test('graph-mutating commands are one undo step and close the transaction on error', () => {
        const commands = new CommandRegistry();
        const graph = new LGraph();
        const prev = LiteGraph.actionHistory_enabled;
        LiteGraph.actionHistory_enabled = true;
        try {
            commands.register({ id: 'add2', mutatesGraph: true, run: (ctx) => { ctx.graph.add(LiteGraph.createNode('platform/box')); ctx.graph.add(LiteGraph.createNode('platform/box')); } });
            commands.register({ id: 'boom', mutatesGraph: true, run: () => { throw new Error('boom'); } });
            graph.transact('baseline', () => graph.add(LiteGraph.createNode('platform/box')));
            commands.execute('add2', { graph });
            expect(graph._nodes).toHaveLength(3);
            graph.actionHistoryBack(); // both additions are one step
            expect(graph._nodes).toHaveLength(1);
            expect(() => commands.execute('boom', { graph })).toThrow('boom');
            expect(graph.isInTransaction).toBe(false);
        } finally { LiteGraph.actionHistory_enabled = prev; }
    });
});

describe('KeybindingRegistry', () => {
    test('normalizes combos and reads events', () => {
        expect(KeybindingRegistry.normalize('Shift+Ctrl+K')).toBe('ctrl+shift+k');
        expect(KeybindingRegistry.normalize('control+option+Space')).toBe('ctrl+alt+ ');
        expect(KeybindingRegistry.normalize('ctrl++')).toBe('ctrl++');
        expect(() => KeybindingRegistry.normalize('ctrl+shift')).toThrow();
        expect(() => KeybindingRegistry.normalize('a+b')).toThrow();
        expect(KeybindingRegistry.fromEvent(key('K', { ctrlKey: true, shiftKey: true }))).toBe('ctrl+shift+k');
        expect(KeybindingRegistry.fromEvent(key('Shift', { shiftKey: true }))).toBeNull();
    });

    test('layers: latest default wins, user overrides and unbinds, unset hides a default', () => {
        const commands = new CommandRegistry();
        const runs = [];
        for (const id of ['one', 'two', 'three']) commands.register({ id, run: () => runs.push(id) });
        const keys = new KeybindingRegistry(commands);
        keys.add({ combo: 'k', commandId: 'one' });
        const disposeTwo = keys.add({ combo: 'k', commandId: 'two' });
        keys.handleKeyDown(key('k'));
        disposeTwo();
        keys.handleKeyDown(key('k'));
        keys.setUserBinding('k', 'three');
        keys.handleKeyDown(key('k'));
        keys.setUserBinding('k', null);
        expect(keys.handleKeyDown(key('k'))).toBe(false);
        keys.clearUserBinding('k');
        keys.unsetDefault('k', 'one');
        expect(keys.handleKeyDown(key('k'))).toBe(false);
        expect(runs).toEqual(['two', 'one', 'three']);
        const layer = keys.exportUserLayer();
        const other = new KeybindingRegistry(commands);
        other.importUserLayer(JSON.parse(JSON.stringify(layer)));
        expect(other.exportUserLayer()).toEqual(layer);
    });

    test('skips text entry, repeats unless allowed, and disabled commands fall through', () => {
        const commands = new CommandRegistry();
        const runs = [];
        commands.register({ id: 'off', when: () => false, run: () => runs.push('off') });
        commands.register({ id: 'on', run: () => runs.push('on') });
        const keys = new KeybindingRegistry(commands);
        keys.add({ combo: 'x', commandId: 'on' });
        keys.add({ combo: 'x', commandId: 'off' });
        expect(keys.handleKeyDown(key('x'))).toBe(true);
        expect(keys.handleKeyDown(key('x', { repeat: true }))).toBe(false);
        expect(keys.handleKeyDown(key('x', { target: { localName: 'textarea' } }))).toBe(false);
        expect(keys.handleKeyDown(key('x', { target: { localName: 'div', isContentEditable: true } }))).toBe(false);
        expect(runs).toEqual(['on']);
        expect(keys.combosFor('on')).toEqual(['x']);
    });
});

describe('SettingsRegistry', () => {
    test('defaults, persistence, migration, onChange, combo options and binding to a flag', () => {
        let saved = { 'App.Old': 'v1', 'App.Later': 42 };
        const storage = { load: () => saved, save: (values) => { saved = values; } };
        const settings = new SettingsRegistry(storage);
        const changes = [];
        settings.define({ id: 'App.Flag', default: true, onChange: (value, previous) => changes.push([value, previous]) });
        expect(settings.get('App.Flag')).toBe(true);
        expect(settings.set('App.Flag', false)).toBe(true);
        expect(saved['App.Flag']).toBe(false);
        expect(changes).toEqual([[true, undefined], [false, true]]);
        settings.define({ id: 'App.Old', default: 'v2', migrate: (value) => value === 'v1' ? 'v2-migrated' : value });
        expect(settings.get('App.Old')).toBe('v2-migrated');
        expect(saved['App.Old']).toBe('v2-migrated');
        expect(settings.get('App.Later')).toBe(42); // kept before definition
        settings.define({ id: 'App.Mode', type: 'combo', default: 'a', options: ['a', { value: 'b', text: 'B' }] });
        settings.set('App.Mode', 'b');
        expect(() => settings.set('App.Mode', 'z')).toThrow(RangeError);
        const target = { flag: 3 };
        settings.define({ id: 'App.Bound', bind: { target, key: 'flag' } });
        expect(settings.get('App.Bound')).toBe(3);
        settings.set('App.Bound', 7);
        expect(target.flag).toBe(7);
        settings.reset('App.Bound');
        expect(target.flag).toBe(3);
        expect(() => settings.define({ id: 'App.Flag', default: 1 })).toThrow();
        expect(settings.list('App.').map((def) => def.id)).toEqual(['App.Flag', 'App.Old', 'App.Mode', 'App.Bound']);
    });
});

describe('ExtensionRegistry', () => {
    test('dispose removes every contribution; failed setup leaves nothing behind', () => {
        const host = { cb_handler: null };
        LiteGraph.CallbackHandler && Object.assign(host, {
            commands: new CommandRegistry(),
            settings: new SettingsRegistry(),
        });
        host.keybindings = new KeybindingRegistry(host.commands);
        const handler = new LiteGraph.CallbackHandler(host);
        host.registerCallbackHandler = handler.registerCallbackHandler.bind(handler);
        host.unregisterCallbackHandler = handler.unregisterCallbackHandler.bind(handler);
        host.processCallbackHandlers = handler.processCallbackHandlers.bind(handler);
        const registry = new ExtensionRegistry(host);
        const hookCalls = [];
        const cleanup = jest.fn();
        const dispose = registry.register({
            name: 'ext',
            commands: [{ id: 'ext.cmd', run() {} }],
            keybindings: [{ combo: 'q', commandId: 'ext.cmd' }],
            settings: [{ id: 'Ext.On', default: true }],
            setup(ctx) { ctx.on('someHook', () => hookCalls.push('hook')); return cleanup; },
        });
        host.processCallbackHandlers('someHook', {});
        expect(registry.list()).toEqual(['ext']);
        expect(() => registry.register({ name: 'ext' })).toThrow(/already/);
        dispose();
        dispose();
        host.processCallbackHandlers('someHook', {});
        expect(hookCalls).toEqual(['hook']);
        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(host.commands.has('ext.cmd')).toBe(false);
        expect(host.keybindings.resolve('q')).toEqual([]);
        expect(host.settings.has('Ext.On')).toBe(false);
        expect(registry.has('ext')).toBe(false);

        expect(() => registry.register({ name: 'bad', commands: [{ id: 'bad.cmd', run() {} }], setup() { throw new Error('nope'); } })).toThrow('nope');
        expect(host.commands.has('bad.cmd')).toBe(false);
        expect(registry.has('bad')).toBe(false);
        expect(() => registry.register({ name: 'needs', requires: ['missing'] })).toThrow(/requires missing/);
        registry.disabled.add('off');
        registry.register({ name: 'off', commands: [{ id: 'off.cmd', run() {} }] })();
        expect(host.commands.has('off.cmd')).toBe(false);
    });
});

describe('canvas integration', () => {
    let dom;
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
        return { graph, canvas, el };
    }
    const press = (el, k, extra = {}) => {
        const event = new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra });
        el.dispatchEvent(event);
        return event;
    };

    test('ported extensions are registered and act through key bindings', () => {
        expect(LiteGraph.extensions.list()).toEqual(expect.arrayContaining([keyboardHelperExtension.name, renamerExtension.name, autoconnectExtension.name]));
        const { graph, canvas, el } = setup();
        expect(LiteGraph.extensions.canvases).toContain(canvas);
        const node = LiteGraph.createNode('platform/box');
        node.pos = [100, 100];
        graph.add(node);
        canvas.selectNodes([node]);
        const before = [...node.pos];
        const event = press(el, 'ArrowRight');
        expect(event.defaultPrevented).toBe(true);
        expect(node.pos[0]).toBe(Math.round(before[0] / LiteGraph.CANVAS_GRID_SIZE) * LiteGraph.CANVAS_GRID_SIZE + LiteGraph.CANVAS_GRID_SIZE);
        canvas.deselectAllNodes();
        expect(press(el, 'ArrowRight').defaultPrevented).toBe(false); // nothing selected: not handled
        canvas.dispose();
        expect(LiteGraph.extensions.canvases).not.toContain(canvas);
    });

    test('autoconnect: "a" then click target connects the selection in one undo step', () => {
        const { graph, canvas, el } = setup();
        const prev = LiteGraph.actionHistory_enabled;
        LiteGraph.actionHistory_enabled = true;
        try {
            const a = LiteGraph.createNode('platform/box'); a.pos = [0, 0]; graph.add(a);
            const b = LiteGraph.createNode('platform/box'); b.pos = [300, 0]; graph.add(b);
            canvas.selectNodes([a]);
            press(el, 'a');
            jest.spyOn(graph, 'getNodeOnPos').mockReturnValue(b);
            canvas.processCallbackHandlers('onMouseDown', {}, { canvasX: 310, canvasY: 10 });
            expect(b.inputs[0].link).not.toBeNull();
            canvas.processCallbackHandlers('onMouseDown', {}, { canvasX: 310, canvasY: 10 }); // disarmed after one use
            expect(Object.keys(graph.links)).toHaveLength(1);
        } finally { LiteGraph.actionHistory_enabled = prev; canvas.dispose(); }
    });

    test('keyboard input makes the canvas active, and F2 opens its rename prompt without pointer input', () => {
        const { graph, canvas, el } = setup();
        const node = LiteGraph.createNode('platform/box'); graph.add(node);
        canvas.selectNodes([node]);
        LGraphCanvas.active_canvas = undefined;
        jest.spyOn(canvas, 'getMouseCoordinates').mockReturnValue([0, 0]);
        jest.spyOn(canvas, 'convertOffsetToEditorArea').mockReturnValue([0, 0]);
        press(el, 'F2');
        expect(LGraphCanvas.active_canvas).toBe(canvas);
        const dialog = document.querySelector('.graphdialog');
        expect(dialog?.querySelector('input')?.value).toBe(node.title); // jsdom lacks innerText for the label
        dialog.querySelector('input').value = 'Renamed';
        dialog.querySelector('button').click();
        expect(node.title).toBe('Renamed');
        canvas.dispose();
    });

    test('a disposed extension stops responding to its keys', () => {
        const { graph, canvas, el } = setup();
        const runs = [];
        const dispose = LiteGraph.registerExtension({ name: 'test.temp', commands: [{ id: 'test.temp.cmd', run: () => runs.push(1) }], keybindings: [{ combo: 'ctrl+alt+j', commandId: 'test.temp.cmd' }] });
        press(el, 'j', { ctrlKey: true, altKey: true });
        dispose();
        press(el, 'j', { ctrlKey: true, altKey: true });
        expect(runs).toEqual([1]);
        canvas.dispose();
    });
});
