import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { Editor } from '../src/litegraph-editor.js';
import { renderExampleHelp } from '../apps/editor/js/examples.js';
import '../src/nodes/base.js';

beforeAll(async () => { LiteGraph.initialize(); await LiteGraph.LibraryManager.ready; });
beforeEach(() => {
    for (const level of ['log', 'info', 'debug', 'warn', 'error']) jest.spyOn(console, level).mockImplementation(() => {});
});
afterEach(() => { jest.restoreAllMocks(); LiteGraph.actionHistory_enabled = false; });

const add = (g, type) => { const node = LiteGraph.createNode(type); g.add(node); return node; };

test('starter preview has no constructor effects, filters scopes and reports skipped or failed types', () => {
    let constructions = 0;
    class Plain { constructor() { constructions++; this.addOutput('value', 'number'); } }
    class Device { static capabilities = ['network']; constructor() { throw new Error('must not construct'); } }
    class Broken { constructor() { throw new Error('cannot create'); } }
    LiteGraph.packs.register({ id: 'hmd-test', version: '1.0.0' }, () => {
        LiteGraph.registerNodeType('hmd/plain', Plain);
        LiteGraph.registerNodeType('hmd/device', Device);
        LiteGraph.registerNodeType('hmd/broken', Broken);
    });
    const entries = LiteGraph.palette.starterPreview({ pack: 'hmd-test', category: 'hmd' });
    expect(entries).toHaveLength(3);
    expect(constructions).toBe(0);
    expect(entries.find((e) => e.type === 'hmd/device').reason).toMatch(/network/);
    expect(entries.find((e) => e.type === 'hmd/plain').suggestedDescription).toContain('Explore');
    expect(LiteGraph.palette.starterPreview({ pack: 'hmd-test', category: 'other' })).toEqual([]);
    const graph = new LGraph();
    const result = LiteGraph.palette.insertStarter({ graph }, { pack: 'hmd-test' });
    expect(result.nodes.map((n) => n.type)).toEqual(['hmd/plain']);
    expect(result.skipped.map((e) => e.type).sort()).toEqual(['hmd/broken', 'hmd/device']);
    expect(constructions).toBe(1);
    expect(Object.keys(graph.links)).toHaveLength(0);
    expect(graph._groups).toHaveLength(1);
    expect(Array.from(graph._groups[0].size).every(Number.isFinite)).toBe(true);
    class NewNode {}
    LiteGraph.packs.register({ id: 'hmd-test-new', version: '1.0.0' }, () => LiteGraph.registerNodeType('hmd/new', NewNode));
    expect(LiteGraph.palette.starterPreview({ category: 'hmd' })).toHaveLength(4);
});

test('starter append preserves existing content, round trips and undoes as one operation', () => {
    const graph = new LGraph();
    LiteGraph.actionHistory_enabled = true;
    const existing = LiteGraph.createNode('basic/const');
    existing.pos = [100, 1000]; existing.setProperty('value', 9); graph.add(existing);
    const before = JSON.stringify(graph.serialize());
    const result = LiteGraph.palette.insertStarter({ graph }, { category: 'hmd', pack: 'hmd-test-new' });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].pos[1]).toBeGreaterThan(1100);
    const loaded = new LGraph(); loaded.configure(graph.serialize());
    expect(loaded._nodes.map((n) => n.type)).toEqual(graph._nodes.map((n) => n.type));
    graph.actionHistoryBack();
    expect(graph._nodes).toHaveLength(1);
    expect(graph._groups).toHaveLength(0);
    expect(JSON.stringify(graph.serialize())).toEqual(before);
    graph.status = LGraph.STATUS_RUNNING;
    expect(() => LiteGraph.palette.insertStarter({ graph }, {})).toThrow(/Stop/);
    graph.status = LGraph.STATUS_STOPPED;
    expect(() => LiteGraph.palette.insertStarter({ graph, read_only: true }, {})).toThrow(/editable/);
});

test('boolean value, widget, action and saved state agree', () => {
    const graph = new LGraph(); const node = add(graph, 'basic/boolean');
    node.setProperty('value', false);
    expect(node.widget.value).toBe(false);
    node.onAction(); node.onExecute(); node.onDrawBackground();
    expect([node.properties.value, node.widget.value, node.getOutputData(0), node.outputs[0].label]).toEqual([true, true, true, 'true']);
    const saved = node.serialize(); saved.widgets_values = [false];
    const copy = LiteGraph.createNode('basic/boolean'); copy.configure(saved);
    expect([copy.properties.value, copy.widget.value]).toEqual([true, true]);
});

test('number widget input reads the link without overwriting the saved fallback', () => {
    const graph = new LGraph();
    const source = add(graph, 'basic/const'), target = add(graph, 'basic/const');
    source.setProperty('value', 7); target.setProperty('value', 2);
    target.addWidgetInput('value', 'number'); source.connect(0, target, 0);
    const watch = add(graph, 'basic/watch'); target.connect(0, watch, 0);
    graph.runStep(2);
    expect(target.getOutputData(0)).toBe(7);
    expect(target.properties.value).toBe(2);
    target.disconnectInput(0); graph.runStep();
    expect(target.getOutputData(0)).toBe(2);
});

test('automatic watch distinguishes declared and observed types and bounds object inspection', () => {
    const graph = new LGraph(); const source = add(graph, 'basic/const'), watch = add(graph, 'basic/watch');
    watch.setProperty('display', 'auto'); watch.onExecute();
    expect(watch.auto_status).toBe('No input connected');
    source.connect(0, watch, 0);
    const getter = jest.fn(() => { throw new Error('getter ran'); });
    const object = { flag: true, values: Array.from({ length: 100 }, (_, i) => i) }; object.self = object;
    Object.defineProperty(object, 'secret', { enumerable: true, get: getter });
    source.setOutputData(0, object); watch.onExecute();
    expect(watch.auto_status).toBe('number → object · type mismatch');
    expect(watch.auto_preview).toContain('[Circular]');
    expect(watch.auto_preview).toContain('[Accessor]');
    expect(watch.auto_preview).toContain('+92');
    expect(watch.auto_preview.length).toBeLessThanOrEqual(600);
    expect(getter).not.toHaveBeenCalled();
    source.setOutputData(0, undefined); watch.onExecute();
    expect(watch.auto_status).toContain('undefined');
    const copy = new LGraph(); copy.configure(graph.serialize());
    expect(copy._nodes.find((n) => n.type === 'basic/watch').properties.display).toBe('auto');
});

test('glyph slot modes share sizing/drawing labels, preserve names and fall back to text', () => {
    const node = LiteGraph.createNode('basic/const');
    const slot = node.outputs[0]; slot.label_icon = '🔢'; slot.name = 'original'; slot.label = 'Value';
    expect(LiteGraph.getSlotLabel(node, slot)).toBe('🔢 Value');
    node.properties.slot_label_mode = 'icon';
    expect(LiteGraph.getSlotLabel(node, slot, 'text')).toBe('🔢');
    slot.label_mode = 'text';
    expect(LiteGraph.getSlotLabel(node, slot)).toBe('Value');
    slot.label_mode = 'icon'; slot.label_icon = { unsupported: true };
    expect(LiteGraph.getSlotLabel(node, slot)).toBe('Value');
    slot.label_icon = '🔢';
    const copy = LiteGraph.createNode('basic/const'); copy.configure(node.serialize());
    expect(copy.outputs[0]).toEqual(expect.objectContaining({ name: 'original', label: 'Value', label_icon: '🔢', label_mode: 'icon' }));
    const label = jest.spyOn(LiteGraph, 'getSlotLabel'); copy.computeSize();
    expect(label).toHaveBeenCalled();
    expect(typeof LGraphCanvas.prototype.drawNodeTitleText).toBe('function');
});

test('starter panel uses text-only metadata, scope selection, insertion and refresh', () => {
    const dom = new JSDOM('<main></main>');
    const previous = globalThis.document; globalThis.document = dom.window.document;
    try {
        const graph = new LGraph();
        const editor = { graphcanvas: { graph }, content: document.querySelector('main') };
        const panel = Editor.prototype.showStarterGenerator.call(editor);
        const [pack, category] = panel.querySelectorAll('select');
        category.value = 'hmd'; category.dispatchEvent(new dom.window.Event('change'));
        expect(panel.textContent).toContain('4 types in scope');
        pack.value = 'hmd-test-new'; pack.dispatchEvent(new dom.window.Event('change'));
        const insert = [...panel.querySelectorAll('button')].find((b) => b.textContent === 'Add nodes to workflow');
        insert.click(); expect(graph._nodes.map((n) => n.type)).toEqual(['hmd/new']);
        panel.querySelector('button').click(); expect(editor.starter_panel).toBeNull();
    } finally { globalThis.document = previous; dom.window.close(); }
});

test('example help displays instructions and treats author metadata as text', () => {
    const dom = new JSDOM('<details></details>'); const element = dom.window.document.querySelector('details');
    renderExampleHelp(element, { title: '<img src=x>', description: 'Description', guide: { steps: ['Step'], expected: 'Result', settings: ['Value'] } });
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('li').textContent).toBe('Step');
    expect(element.textContent).toContain('Expected: Result');
    renderExampleHelp(element, null); expect(element.hidden).toBe(true);
    dom.window.close();
});
