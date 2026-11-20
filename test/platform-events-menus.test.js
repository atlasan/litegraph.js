import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { MenuRegistry } from '../src/menus.js';
import { CommandRegistry } from '../src/commands.js';
import { SettingsRegistry } from '../src/settings.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    class Src { constructor() { this.addOutput('out', 'number'); this.addProperty('k', 1); } onExecute() { this.setOutputData(0, 1); } }
    class Dst { constructor() { this.addInput('in', 'number'); } }
    class Boom { onExecute() { throw new Error('boom'); } }
    LiteGraph.registerNodeType('ev2/src', Src);
    LiteGraph.registerNodeType('ev2/dst', Dst);
    LiteGraph.registerNodeType('ev2/boom', Boom);
});

test('graph emits link, property, step and error events', () => {
    const graph = new LGraph();
    const seen = [];
    for (const type of ['link-connected', 'link-removed', 'node-property-changed', 'execution-step', 'node-error']) {
        graph.events.on(type, (event) => seen.push([type, event.detail]));
    }
    const a = LiteGraph.createNode('ev2/src'), b = LiteGraph.createNode('ev2/dst');
    graph.add(a); graph.add(b);
    const link = a.connect(0, b, 0);
    a.setProperty('k', 2);
    a.setProperty('k', 2); // unchanged: no event
    b.disconnectInput(0);
    graph.runStep(1);
    const prevThrow = LiteGraph.throw_errors;
    LiteGraph.throw_errors = false;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
        graph.add(LiteGraph.createNode('ev2/boom'));
        graph.runStep(1);
    } finally { LiteGraph.throw_errors = prevThrow; }
    const types = seen.map(([type]) => type);
    expect(types).toEqual(['link-connected', 'node-property-changed', 'link-removed', 'execution-step', 'node-error']);
    expect(seen[0][1]).toMatchObject({ link, origin: a, originSlot: 0, target: b, targetSlot: 0 });
    expect(seen[1][1]).toMatchObject({ node: a, name: 'k', value: 2, previous: 1 });
    expect(seen[2][1].link.id).toBe(link.id);
    expect(seen[4][1].error.message).toBe('boom');
    jest.restoreAllMocks();
});

test('menu contributions: providers, command items, separators, failures isolated, disposal', () => {
    const commands = new CommandRegistry();
    const runs = [];
    commands.register({ id: 'm.ok', label: 'Do it', run: (ctx) => runs.push(ctx.node) });
    commands.register({ id: 'm.off', label: 'Off', when: () => false, run() {} });
    const menus = new MenuRegistry(commands);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dispose = menus.register('node', (ctx) => [null, { command: 'm.ok' }, { command: 'm.off' }, { command: 'm.missing' }, { content: 'Plain', callback() {} }]);
    menus.register('node', () => { throw new Error('bad provider'); });
    const options = [{ content: 'Built-in' }];
    menus.contribute('node', { node: 'N' }, options);
    expect(options.map((item) => item?.content ?? null)).toEqual(['Built-in', null, 'Do it', 'Off', 'Plain']);
    expect(options[3].disabled).toBe(true);
    options[2].callback();
    expect(runs).toEqual(['N']);
    dispose();
    expect(menus.collect('node', {})).toEqual([]);
    expect(() => menus.register('nowhere', () => [])).toThrow();
    jest.restoreAllMocks();
});

test('extensions contribute menus and typed listeners, both removed on dispose', () => {
    const graph = new LGraph();
    const heard = [];
    const dispose = LiteGraph.registerExtension({
        name: 'test.menus-events',
        menus: { canvas: () => [{ content: 'From extension' }] },
        setup(ctx) { ctx.onEvent(graph, 'node-added', (event) => heard.push(event.detail.node.type)); },
    });
    expect(LiteGraph.menus.collect('canvas', {}).map((item) => item.content)).toContain('From extension');
    graph.add(LiteGraph.createNode('ev2/src'));
    dispose();
    graph.add(LiteGraph.createNode('ev2/src'));
    expect(heard).toEqual(['ev2/src']);
    expect(LiteGraph.menus.collect('canvas', {}).map((item) => item.content)).not.toContain('From extension');
});

test('persistPlatformState saves settings and the user key-binding layer, and restores them', () => {
    const store = { saved: {} };
    const storage = { load: () => store.saved, save: (values) => { store.saved = JSON.parse(JSON.stringify(values)); } };
    LiteGraph.persistPlatformState(storage);
    LiteGraph.keybindings.setUserBinding('ctrl+alt+p', 'litegraph.rename');
    expect(store.saved['LiteGraph.Keybindings.UserLayer'].bindings['ctrl+alt+p']).toBe('litegraph.rename');
    // a fresh load reads the stored layer back
    LiteGraph.keybindings.importUserLayer({ bindings: {}, unset: [] });
    LiteGraph.persistPlatformState(storage);
    expect(LiteGraph.keybindings.resolve('ctrl+alt+p')[0]?.commandId).toBe('litegraph.rename');
    LiteGraph.keybindings.clearUserBinding('ctrl+alt+p');
    expect(store.saved['LiteGraph.Keybindings.UserLayer'].bindings).toEqual({});
    LiteGraph.settings.setStorage(null);
    expect(new SettingsRegistry().get('x')).toBeUndefined();
});
