import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { PackRegistry } from '../src/packs.js';
import '../src/nodes/base.js';
import '../src/nodes/math.js';

/** Packs, provenance, missing nodes and replacement mappings (Wave 4a, plan steps 1-5). */

class Src { constructor() { this.addOutput('v', 'number'); this.addProperty('v', 3); } onExecute() { this.setOutputData(0, this.properties.v); } }
class Sink { constructor() { this.addInput('in', 'number'); this.value = undefined; } onExecute() { this.value = this.getInputData(0); } }
class OldScale { constructor() { this.addInput('x', 'number'); this.addInput('extra', 'number'); this.addOutput('y', 'number'); this.addProperty('factor', 2); this.addWidget('number', 'factor', 2, null, { property: 'factor' }); } }
class NewScale {
    constructor() { this.addInput('value', 'number'); this.addOutput('out', 'number'); this.addProperty('k', 1); this.addProperty('mode', 'linear'); }
    onExecute() { this.setOutputData(0, (this.getInputData(0) ?? 0) * this.properties.k); }
}

const disposers = [];
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    LiteGraph.registerNodeType('pk/src', Src);
    LiteGraph.registerNodeType('pk/sink', Sink);
});
beforeEach(() => { for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {}); });
afterEach(() => {
    jest.restoreAllMocks();
    LiteGraph.actionHistory_enabled = false;
    while (disposers.length) disposers.pop()();
    for (const id of ['LiteGraph.Packs.Stamp', 'LiteGraph.Packs.AutoReplace', 'LiteGraph.Packs.AllowIncompatible', 'LiteGraph.Packs.Disabled']) LiteGraph.settings.reset?.(id);
    LiteGraph.settings.set('LiteGraph.Packs.Stamp', true);
    LiteGraph.settings.set('LiteGraph.Packs.AutoReplace', true);
    LiteGraph.settings.set('LiteGraph.Packs.AllowIncompatible', false);
    LiteGraph.settings.set('LiteGraph.Packs.Disabled', []);
});

const make = (graph, type, x = 0, y = 0) => { const n = LiteGraph.createNode(type); n.pos = [x, y]; graph.add(n); return n; };
const acme = (extra = {}) => ({ id: 'acme', version: '1.2.0', requires: { litegraph: '>=0.10.0' }, ...extra });

describe('version ranges', () => {
    test.each([
        ['0.10.10', '>=0.10.0', true], ['0.10.10', '<0.10.10', false], ['0.10.10', '^0.10.2', true], ['0.11.0', '^0.10.2', false],
        ['1.4.0', '^1.2', true], ['2.0.0', '^1.2', false], ['1.2.9', '~1.2.3', true], ['1.3.0', '~1.2.3', false],
        ['0.10.10', '0.10', true], ['0.10.10', '0.10.x', true], ['0.10.10', '*', true], ['0.10.10', '>=0.9 <0.11', true],
        ['0.12.0', '<0.11 || >=0.12', true], ['1.0.0-beta.1', '>=1.0.0', false], ['1.0.0', '>=1.0.0-beta.1', true], ['0.10.10', 'nonsense', false],
    ])('%s satisfies %s: %s', (version, range, expected) => {
        expect(PackRegistry.satisfiesVersion(version, range)).toBe(expected);
    });
});

describe('pack registry (step 1)', () => {
    test('types registered in setup belong to the pack; the disposer unregisters them', () => {
        const dispose = LiteGraph.packs.register(acme(), ({ registerNodeType }) => {
            registerNodeType('acme/scale', NewScale);
            LiteGraph.registerNodeType('acme/old', OldScale);
        });
        expect(LiteGraph.getNodeDefinition('acme/scale').pack).toEqual({ id: 'acme', version: '1.2.0', builtin: false });
        expect(LiteGraph.packs.packOf('acme/old')?.id).toBe('acme');
        expect(LiteGraph.packs.typesOf('acme').sort()).toEqual(['acme/old', 'acme/scale']);
        expect(LiteGraph.packs.describe().find((p) => p.id === 'acme')).toEqual(expect.objectContaining({ state: 'active', types: ['acme/old', 'acme/scale'] }));
        dispose();
        expect(LiteGraph.registered_node_types['acme/scale']).toBeUndefined();
        expect(LiteGraph.packs.get('acme')).toBeNull();
    });

    test('manifest nodes claim types registered before or after the manifest', () => {
        LiteGraph.registerNodeType('acme/early', NewScale);
        disposers.push(LiteGraph.packs.register(acme({ nodes: ['acme/early', 'acme/late'] })));
        LiteGraph.registerNodeType('acme/late', NewScale);
        expect(LiteGraph.getNodeDefinition('acme/early').pack?.id).toBe('acme');
        expect(LiteGraph.getNodeDefinition('acme/late').pack?.id).toBe('acme');
    });

    test('an incompatible pack is refused naming the setting, and registers with it', () => {
        const manifest = acme({ requires: { litegraph: '>=99' } });
        expect(() => LiteGraph.packs.register(manifest)).toThrow(/LiteGraph\.Packs\.AllowIncompatible/);
        LiteGraph.settings.set('LiteGraph.Packs.AllowIncompatible', true);
        const setup = jest.fn();
        disposers.push(LiteGraph.packs.register(manifest, setup));
        expect(setup).not.toHaveBeenCalled();
        expect(LiteGraph.packs.describe().find((p) => p.id === 'acme')).toEqual(expect.objectContaining({ state: 'incompatible' }));
    });

    test('a disabled pack is recorded but its setup does not run', () => {
        LiteGraph.settings.set('LiteGraph.Packs.Disabled', ['acme']);
        const setup = jest.fn();
        disposers.push(LiteGraph.packs.register(acme(), setup));
        expect(setup).not.toHaveBeenCalled();
        expect(LiteGraph.packs.describe().find((p) => p.id === 'acme').state).toBe('disabled');
    });

    test('invalid manifests are refused', () => {
        expect(() => LiteGraph.packs.register({ version: '1.0.0' })).toThrow(/invalid id/);
        expect(() => LiteGraph.packs.register({ id: 'x', version: 'one' })).toThrow(/invalid version/);
    });

    test('the index names packs without running anything', () => {
        disposers.push(LiteGraph.packs.index([{ id: 'far', version: '3.0.0', nodes: ['far/thing'] }]));
        expect(LiteGraph.packs.findPackForType('far/thing')).toEqual({ id: 'far', version: '3.0.0', installed: false });
        expect(LiteGraph.packs.describe().find((p) => p.id === 'far').state).toBe('indexed');
        expect(LiteGraph.registered_node_types['far/thing']).toBeUndefined();
    });
});

describe('builtin packs (step 2)', () => {
    test('node files declare builtin packs; built-in nodes are not stamped', () => {
        expect(LiteGraph.getNodeDefinition('math/operation').pack).toEqual({ id: 'litegraph/math', version: LiteGraph.VERSION, builtin: true });
        expect(LiteGraph.getNodeDefinition('basic/const').pack?.id).toBe('litegraph/basic');
        expect(LiteGraph.getNodeDefinition('graph/subgraph').pack?.id).toBe('litegraph/core');
        const graph = new LGraph();
        const node = make(graph, 'math/operation');
        expect(node.properties.pack).toBeUndefined();
        expect(JSON.stringify(graph.serialize())).not.toMatch(/pack_ver/);
    });
});

describe('provenance stamping (step 3)', () => {
    test('a pack node is stamped; a loaded node keeps its stored stamp; the setting turns it off', () => {
        disposers.push(LiteGraph.packs.register(acme(), () => LiteGraph.registerNodeType('acme/scale', NewScale)));
        const graph = new LGraph();
        const node = make(graph, 'acme/scale');
        expect(node.properties).toEqual(expect.objectContaining({ pack: 'acme', pack_ver: '1.2.0' }));

        const data = graph.serialize();
        data.nodes[0].properties.pack_ver = '1.0.0';
        const loaded = new LGraph();
        loaded.configure(data);
        expect(loaded._nodes[0].properties.pack_ver).toBe('1.0.0');

        LiteGraph.settings.set('LiteGraph.Packs.Stamp', false);
        expect(make(new LGraph(), 'acme/scale').properties.pack).toBeUndefined();
    });
});

/** a document: src -> [type] -> sink, with the middle node of a type that may be missing */
function documentWith(type, properties = { factor: 5, pack: 'acme', pack_ver: '0.9.0' }) {
    const graph = new LGraph();
    const src = make(graph, 'pk/src');
    const sink = make(graph, 'pk/sink', 400);
    LiteGraph.registerNodeType(type, OldScale);
    const mid = make(graph, type, 200);
    Object.assign(mid.properties, properties);
    mid.widgets[0].value = 5;
    mid.title = 'My scale';
    src.connect(0, mid, 0);
    mid.connect(0, sink, 0);
    const data = graph.serialize();
    LiteGraph.unregisterNodeType(type);
    return data;
}

describe('missing-nodes report (step 4)', () => {
    test('stamp, index and ComfyUI sources; nested paths; one event on configure', () => {
        const data = documentWith('acme/old');
        disposers.push(LiteGraph.packs.index({ id: 'gone', version: '2.0.0', nodes: ['gone/node'] }));
        data.nodes.push({ id: 50, type: 'gone/node', pos: [0, 300], size: [100, 40], flags: {}, mode: 0, properties: {} });
        data.nodes.push({ id: 51, type: 'KSamplerX', pos: [0, 400], size: [100, 40], flags: {}, mode: 0, properties: { cnr_id: 'comfy-pack', ver: '1.1.0' } });

        const graph = new LGraph();
        const seen = jest.fn();
        graph.events.on('missing-nodes', (event) => seen(event.detail.report, event.detail.reason));
        graph.configure(data);
        expect(seen).toHaveBeenCalledTimes(1);
        expect(seen.mock.calls[0][1]).toBe('load');
        const report = seen.mock.calls[0][0];
        const byType = Object.fromEntries(report.map((entry) => [entry.type, entry]));
        expect(byType['acme/old']).toEqual(expect.objectContaining({ count: 1, available: false, pack: { id: 'acme', version: '0.9.0', source: 'stamp' }, replacement: null }));
        expect(byType['gone/node'].pack).toEqual({ id: 'gone', version: '2.0.0', source: 'index', installed: false });
        expect(byType.KSamplerX.pack).toEqual({ id: 'comfy-pack', version: '1.1.0', source: 'comfy' });

        // nested: the placeholder inside a subgraph has a path
        const outer = new LGraph();
        const sub = make(outer, 'graph/subgraph');
        sub.subgraph.configure({ nodes: [{ id: 7, type: 'acme/old', pos: [0, 0], size: [100, 40], flags: {}, mode: 0, properties: {} }], links: [] });
        expect(outer.getMissingNodes()[0].nodes).toEqual([{ id: 7, path: `${sub.id}:7` }]);
        expect(outer.getMissingNodes({ deep: false })).toEqual([]);
    });

    test('a clean document fires no event', () => {
        const graph = new LGraph();
        make(graph, 'pk/src');
        const data = graph.serialize();
        const seen = jest.fn();
        const loaded = new LGraph();
        loaded.events.on('missing-nodes', seen);
        loaded.configure(data);
        expect(seen).not.toHaveBeenCalled();
    });
});

describe('replacement mappings (step 5)', () => {
    const mapping = { old_type: 'acme/old', new_type: 'acme/scale', inputs: { x: 'value' }, outputs: { 0: 'out' }, properties: { factor: 'k' }, set: { properties: { mode: 'log' } } };

    test('replacing a missing node keeps id, title, links (ids) and mapped values; one undo step', () => {
        disposers.push(LiteGraph.packs.register(acme(), () => LiteGraph.registerNodeType('acme/scale', NewScale)));
        disposers.push(LiteGraph.registerNodeReplacement(mapping));
        const data = documentWith('acme/old');
        const graph = new LGraph();
        graph.configure(data);
        LiteGraph.actionHistory_enabled = true;
        graph.add(LiteGraph.createNode('pk/src')); // an earlier change, so undo has a baseline
        const placeholder = graph._nodes.find((n) => n.has_errors);
        const linkIds = [placeholder.inputs[0].link, placeholder.outputs[0].links[0]];
        expect(graph.getMissingNodes()[0].replacement).toEqual({ type: 'acme/scale', auto: false, available: true });

        const { node, dropped } = graph.replaceNode(placeholder);
        expect(dropped).toEqual([]);
        expect(node.type).toBe('acme/scale');
        expect(node.id).toBe(placeholder.id);
        expect(node.title).toBe('My scale');
        expect(node.properties).toEqual(expect.objectContaining({ k: 5, mode: 'log', pack: 'acme', pack_ver: '1.2.0' }));
        expect(node.properties.factor).toBeUndefined();
        expect([node.inputs[0].link, node.outputs[0].links[0]]).toEqual(linkIds);
        expect(graph.links[linkIds[0]].target_slot).toBe(0);
        expect(graph.getMissingNodes()).toEqual([]);

        for (let i = 0; i < 3; i++) graph.runStep(1);
        expect(graph._nodes.find((n) => n.type === 'pk/sink').value).toBe(15);

        const reasons = [];
        graph.events.on('missing-nodes', (event) => reasons.push(event.detail.reason));
        graph.actionHistoryBack();
        expect(graph._nodes.find((n) => n.id === node.id).has_errors).toBe(true);
        expect(reasons).toEqual(['history']);
    });

    test('a linked slot the mapping cannot place is reported and its link removed', () => {
        disposers.push(LiteGraph.packs.register(acme(), () => LiteGraph.registerNodeType('acme/scale', NewScale)));
        const graph = new LGraph();
        LiteGraph.registerNodeType('acme/old', OldScale);
        const src = make(graph, 'pk/src');
        const old = make(graph, 'acme/old', 200);
        src.connect(0, old, 1); // "extra" has no counterpart
        const { node, dropped } = graph.replaceNode(old, { old_type: 'acme/old', new_type: 'acme/scale', inputs: { x: 'value' } });
        LiteGraph.unregisterNodeType('acme/old');
        expect(dropped).toEqual([expect.objectContaining({ kind: 'input', slot: 1, name: 'extra' })]);
        expect(Object.keys(graph.links)).toHaveLength(0);
        expect(src.outputs[0].links ?? []).toHaveLength(0);
        expect(node.inputs[0].link).toBeNull();
    });

    test('auto mappings apply on load, are listed, and the setting keeps the placeholder', () => {
        disposers.push(LiteGraph.packs.register(acme(), () => LiteGraph.registerNodeType('acme/scale', NewScale)));
        disposers.push(LiteGraph.registerNodeReplacement({ ...mapping, auto: true }));
        const data = documentWith('acme/old');
        const graph = new LGraph();
        const configured = jest.fn();
        const missing = jest.fn();
        graph.events.on('configured', (event) => configured(event.detail.replaced));
        graph.events.on('missing-nodes', missing);
        graph.configure(data);
        expect(configured.mock.calls[0][0]).toEqual([expect.objectContaining({ from: 'acme/old', to: 'acme/scale', dropped: [] })]);
        expect(missing).not.toHaveBeenCalled();
        expect(graph._nodes.some((n) => n.type === 'acme/scale')).toBe(true);
        expect(graph.revision).toBe(data.revision ?? 0);

        LiteGraph.settings.set('LiteGraph.Packs.AutoReplace', false);
        const kept = new LGraph();
        kept.configure(documentWith('acme/old'));
        expect(kept.getMissingNodes().map((e) => e.type)).toEqual(['acme/old']);
    });

    test('replaceNodes rebuilds placeholders whose type is registered later, and skips the rest', () => {
        const data = documentWith('acme/old');
        data.nodes.push({ id: 60, type: 'never/there', pos: [0, 300], size: [100, 40], flags: {}, mode: 0, properties: {} });
        const graph = new LGraph();
        graph.configure(data);
        LiteGraph.registerNodeType('acme/old', OldScale);
        try {
            const result = graph.replaceNodes();
            expect(result.replaced).toEqual([expect.objectContaining({ from: 'acme/old', to: 'acme/old' })]);
            expect(result.skipped).toEqual([expect.objectContaining({ type: 'never/there', reason: 'no replacement registered' })]);
            const rebuilt = graph._nodes.find((n) => n.type === 'acme/old');
            expect(rebuilt.has_errors).toBeFalsy();
            expect(rebuilt.widgets[0].value).toBe(5);
            expect(rebuilt.inputs[0].link).not.toBeNull();
        } finally {
            LiteGraph.unregisterNodeType('acme/old');
        }
    });

    test('replaceNode refuses without a mapping or an unregistered target', () => {
        const graph = new LGraph();
        const src = make(graph, 'pk/src');
        expect(() => graph.replaceNode(src)).toThrow(/no replacement is registered for pk\/src/);
        expect(() => graph.replaceNode(src, 'nope/nope')).toThrow(/nope\/nope is not registered/);
        expect(() => LiteGraph.registerNodeReplacement({ old_type: 'a' })).toThrow(/new_type/);
    });
});

describe('commands and node menu (step 5)', () => {
    test('replaceMissing, replace and the node menu entry', async () => {
        await import('../src/extensions/node_packs.js');
        disposers.push(LiteGraph.packs.register(acme(), () => LiteGraph.registerNodeType('acme/scale', NewScale)));
        disposers.push(LiteGraph.registerNodeReplacement({ old_type: 'acme/old', new_type: 'acme/scale', inputs: { x: 'value' } }));
        const graph = new LGraph();
        graph.configure(documentWith('acme/old'));
        const placeholder = graph._nodes.find((n) => n.has_errors);
        const ctx = { graph, canvas: null, selectedNodes: [], node: placeholder };
        const items = LiteGraph.menus.collect('node', ctx);
        expect(items.map((item) => item?.content)).toContain('Replace with acme/scale');
        expect(LiteGraph.commands.isEnabled('litegraph.nodes.replaceMissing', { graph })).toBe(true);
        const result = LiteGraph.commands.execute('litegraph.nodes.replaceMissing', { graph });
        expect(result.executed).toBe(true);
        expect(result.result.replaced).toHaveLength(1);
        expect(LiteGraph.commands.isEnabled('litegraph.nodes.replaceMissing', { graph })).toBe(false);
        expect(LiteGraph.menus.collect('node', { graph, node: graph.getNodeById(placeholder.id) })).toEqual([]);
    });
});

test('a placeholder shows its missing type as title and saves without one', () => {
    const graph = new LGraph();
    graph.configure({ nodes: [{ id: 4, type: 'far/thing', pos: [0, 0], size: [100, 40], flags: {}, mode: 0, properties: {} }], links: [] });
    expect(graph.getNodeById(4).title).toBe('far/thing');
    expect(graph.serialize().nodes[0].title).toBeUndefined();
});
