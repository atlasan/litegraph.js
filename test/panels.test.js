import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { PanelBuilder, defaultPanelEditors } from '../src/panels.js';
import { SettingsRegistry } from '../src/settings.js';

let dom;
beforeAll(async () => { LiteGraph.initialize(); await LiteGraph.LibraryManager.ready; });
beforeEach(() => {
    dom = new JSDOM('<main style="position:relative"></main>');
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    globalThis.Event = dom.window.Event;
    for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {});
    dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
        get: (target, key) => key in target ? target[key] : (key === 'start' || key === 'finish' ? undefined : () => ({ width: 0 })),
        set: (target, key, value) => { target[key] = value; return true; },
    });
    // the panel settings are kept in memory per test
    LiteGraph.settings.setStorage({ load: () => ({}), save: () => {} });
});
afterEach(() => {
    dom.window.close(); delete globalThis.window; delete globalThis.document; delete globalThis.Event;
    jest.restoreAllMocks();
});

function makeCanvas(graph = new LGraph()) {
    const el = document.createElement('canvas');
    document.querySelector('main').appendChild(el);
    return new LGraphCanvas(el, graph, { skip_render: true });
}
const rowOf = (panel, name) => panel.querySelector(`.lg-row[data-property="${name}"]`);
const input = (row, selector = 'input, textarea, select') => row.querySelector(selector);
function type(el, value) {
    el.focus?.();
    el.value = value;
    el.dispatchEvent(new dom.window.Event('input'));
    el.dispatchEvent(new dom.window.Event('blur'));
}
function change(el, value) {
    el.value = value;
    el.dispatchEvent(new dom.window.Event('change'));
}

class PanelProbe {
    constructor() {
        this.addInput('in', 'number');
        this.addOutput('out', 'number');
        this.addProperty('gain', 0.5, 'number', { min: 0, max: 2, tooltip: 'Multiplier', description: 'Scales the input.', examples: ['0.5', '2'] });
        this.addProperty('count', 3, 'int');
        this.addProperty('offset', [0, 0, 0], 'vec3', { section: 'Transform' });
        this.addProperty('tint', '#ff0000', 'color');
        this.addProperty('mode', 'a', 'enum', { values: ['a', 'b', 'c'] });
        this.addProperty('level', 1, 'enum', { values: { low: 1, high: 2 } });
        this.addProperty('label', 'hi', 'string');
        this.addProperty('data', [1, 2], 'array');
        this.addProperty('secret', 'x', 'string', { hidden: true });
        this.addProperty('custom', 1, 'number');
        this.addWidget('slider', 'amount', 0.2, () => {}, { min: 0, max: 1 });
        this.addWidget('toggle', 'enabled', true);
    }
}
PanelProbe.title = 'Probe';
class PanelSource { constructor() { this.addOutput('out', 'number'); } }
PanelSource.title = 'Source';
beforeAll(() => LiteGraph.registerNodeType('panel/source', PanelSource));
/** runs fn with the action history on, after a first saved change (see AGENTS.md, undo history) */
function withHistory(graph, fn) {
    const prev = LiteGraph.actionHistory_enabled;
    LiteGraph.actionHistory_enabled = true;
    try {
        graph.transact('baseline', () => graph.add(LiteGraph.createNode('panel/source')));
        return fn();
    } finally { LiteGraph.actionHistory_enabled = prev; }
}
PanelProbe.desc = '<img src=x onerror="window.__xss=1">desc';
beforeAll(() => LiteGraph.registerNodeType('panel/probe', PanelProbe));

describe('createPanel compatibility contract', () => {
    test('keeps the former element API and the addWidget callback order', () => {
        const canvas = makeCanvas();
        let opened = false, closed = false;
        const panel = canvas.createPanel('T', { closable: true, onOpen: () => { opened = true; }, onClose: () => { closed = true; } });
        for (const key of ['content', 'alt_content', 'footer', 'title_element']) expect(panel[key]).toBeTruthy();
        for (const fn of ['close', 'clear', 'addHTML', 'addButton', 'addSeparator', 'toggleAltContent', 'toggleFooterVisibility', 'addWidget']) expect(typeof panel[fn]).toBe('function');
        expect(panel.classList.contains('litegraph')).toBe(true);
        expect(panel.classList.contains('dialog')).toBe(true);
        expect(panel.title_element.textContent).toBe('T');
        expect(opened).toBe(true);

        const calls = [];
        const options = { callback: (...args) => calls.push(['options', ...args]) };
        const row = panel.addWidget('number', 'n', 1, options, (...args) => calls.push(['callback', ...args]));
        expect(row.classList.contains('property')).toBe(true);
        expect(row.querySelector('.property_name').textContent).toContain('n');
        expect(row.querySelector('.property_value')).toBeTruthy();
        expect(row.dataset.property).toBe('n');
        expect(row.dataset.type).toBe('number');
        expect(row.options).toBe(options);
        type(input(row), '2*3');
        expect(calls).toEqual([['options', 'n', 6, options], ['callback', 'n', 6, options]]);
        expect(row.value).toBe(6);

        const bool = panel.addWidget('boolean', 'b', false, {}, () => {});
        bool.click(); // the whole row toggles, as before
        expect(bool.classList.contains('bool-on')).toBe(true);
        expect(bool.value).toBe(true);

        const combo = panel.addWidget('combo', 'c', 2, { values: { low: 1, high: 2 } }, (name, value) => calls.push(['combo', value]));
        change(input(combo, 'select'), '0');
        expect(calls.at(-1)).toEqual(['combo', 1]); // a {label: value} map stores the value

        panel.addHTML('<b>x</b>', 'extra');
        expect(panel.content.querySelector('.extra b')).toBeTruthy();
        panel.toggleAltContent(true);
        expect(panel.alt_content.style.display).toBe('block');
        panel.toggleFooterVisibility(false);
        expect(panel.footer.style.display).toBe('none');
        document.querySelector('main').append(panel);
        panel.close();
        expect(closed).toBe(true);
        expect(panel.isConnected).toBe(false);
    });

    test('unknown and undefined types: undefined edits as text, an unknown type is read-only with an explanation', () => {
        const panel = makeCanvas().createPanel('T');
        const text = panel.addWidget('undefined', 'u', 'v', {}, () => {});
        expect(text.dataset.editor).toBe('string');
        // an unknown type edits by the JS type of its value; with nothing to go by it is read-only
        expect(panel.addWidget('mystery', 'n', 5, {}, () => {}).dataset.editor).toBe('number');
        const odd = panel.addWidget('mystery', 'm', null, {}, () => {});
        expect(odd.dataset.editor).toBe('readonly');
        expect(odd.querySelector('.lg-readonly').title).toMatch(/No editor is registered for type "mystery"/);
    });
});

describe('editors', () => {
    let panel;
    beforeEach(() => { panel = makeCanvas().createPanel('E'); });

    test('number: clamps to min/max, refuses NaN with a message and keeps the old value; int rounds', () => {
        const seen = [];
        const row = panel.addRow({ name: 'g', value: 1, info: { type: 'number', min: 0, max: 2 }, commit: (v) => seen.push(v) });
        type(input(row), '5');
        expect(seen).toEqual([2]);
        type(input(row), 'abc');
        expect(seen).toEqual([2]);
        expect(row.querySelector('.lg-row-error').hidden).toBe(false);
        expect(input(row).value).toBe('2');
        const int = panel.addRow({ name: 'i', value: 1, info: { type: 'INT' }, commit: (v) => seen.push(v) });
        type(input(int), '2.6');
        expect(seen.at(-1)).toBe(3);
    });

    test('vector: edits one component; colour: picker keeps alpha; json: a parse error keeps the old value', () => {
        const seen = [];
        const vec = panel.addRow({ name: 'v', value: [1, 2, 3], info: { type: 'vec3' }, commit: (v) => seen.push(v) });
        const fields = vec.querySelectorAll('input');
        expect(fields).toHaveLength(3);
        type(fields[1], '7');
        expect(seen.at(-1)).toEqual([1, 7, 3]);
        const color = panel.addRow({ name: 'c', value: '#11223380', info: { type: 'color' }, commit: (v) => seen.push(v) });
        change(color.querySelector('input[type=color]'), '#445566');
        expect(seen.at(-1)).toBe('#44556680');
        const json = panel.addRow({ name: 'j', value: [1], info: { type: 'array' }, commit: (v) => seen.push(v) });
        const before = seen.length;
        type(input(json), '[1,');
        expect(seen).toHaveLength(before);
        expect(json.querySelector('.lg-row-error').textContent).not.toBe('');
        type(input(json), '[4, 5]');
        expect(seen.at(-1)).toEqual([4, 5]);
    });

    test('combo with a {value: label} widget map stores the key; a value outside the list stays selected', () => {
        const seen = [];
        const row = panel.addRow({ name: 'w', value: 'b', info: { type: 'combo', values: { a: 'Alpha', b: 'Beta' }, map_stores: 'key' }, commit: (v) => seen.push(v) });
        const select = input(row, 'select');
        expect([...select.options].map((o) => o.textContent)).toEqual(['Alpha', 'Beta']);
        expect(select.value).toBe('1');
        change(select, '0');
        expect(seen).toEqual(['a']);
        const odd = panel.addRow({ name: 'o', value: 'zzz', info: { type: 'enum', values: ['a'] } });
        expect(input(odd, 'select').selectedOptions[0].textContent).toMatch(/zzz/);
    });

    test('help, reset to default and the modified marker', () => {
        const seen = [];
        const row = panel.addRow({ name: 'g', value: 1, defaultValue: 0.5, info: { type: 'number', tooltip: 'Gain', description: 'Scales.', examples: ['0.5'] }, commit: (v) => seen.push(v) });
        expect(row.classList.contains('lg-modified')).toBe(true);
        expect(row.querySelector('.property_name').title).toContain('Gain');
        const help = row.querySelector('.lg-row-help');
        expect(help.hidden).toBe(true);
        row.querySelector('.lg-help-btn').click();
        expect(help.hidden).toBe(false);
        expect(help.textContent).toContain('Scales.');
        expect(help.textContent).toContain('0.5');
        row.querySelector('.lg-reset').click();
        expect(seen).toEqual([0.5]);
        expect(row.classList.contains('lg-modified')).toBe(false);
    });

    test('registerPanelEditor: a custom editor is chosen by info.editor and by a value type', () => {
        const created = [];
        const dispose = LiteGraph.registerPanelEditor('stars', { create(ctx) { created.push(ctx.value); const el = document.createElement('span'); return { element: el, set() {} }; } });
        const disposeType = LiteGraph.registerValueType('rating', { base: 'int', editor: 'stars' });
        panel.addRow({ name: 'a', value: 3, info: { editor: 'stars' } });
        panel.addRow({ name: 'b', value: 4, info: { type: 'rating' } });
        expect(created).toEqual([3, 4]);
        dispose(); disposeType();
        expect(LiteGraph.panel_editors.stars).toBeUndefined();
    });

    test('every built-in editor creates an element', () => {
        for (const [name, editor] of Object.entries(defaultPanelEditors())) {
            const handle = editor.create({ doc: document, name, value: name === 'vector' ? [1, 2] : 1, options: { size: 2, values: ['a'] }, info: {}, type: null, commit() {}, preview() {} });
            expect(handle.element).toBeTruthy();
            expect(typeof handle.set).toBe('function');
        }
    });
});

describe('toolbar, sections and tabs', () => {
    test('search filters rows, counts results, highlights, and shows an empty state', () => {
        const panel = makeCanvas().createPanel('F', { id: 'f' });
        panel.addToolbar({ sorts: [{ id: 'declared', label: 'Declared' }, { id: 'az', label: 'A-Z' }] });
        panel.addSection('One', { id: 'one' });
        panel.addRow({ name: 'zeta shadow', value: true, info: { type: 'boolean' } });
        panel.addRow({ name: 'alpha', value: true, info: { type: 'boolean' }, defaultValue: false });
        panel.addSection('Two', { id: 'two' });
        panel.addRow({ name: 'beta', value: 1, info: { type: 'number', tooltip: 'contains shadow word' } });
        const search = panel.search_input;
        type(search, 'shadow');
        expect([...panel.querySelectorAll('.lg-row')].filter((r) => !r.hidden).map((r) => r.dataset.property)).toEqual(['zeta shadow', 'beta']);
        expect(panel.querySelector('[data-section="one"] .lg-section-count').textContent).toBe('1/2');
        expect(rowOf(panel, 'zeta shadow').querySelector('mark').textContent).toBe('shadow');
        type(search, 'nothing-like-this');
        expect(panel.empty_element.hidden).toBe(false);
        type(search, '');
        panel.modified_input.checked = true;
        panel.modified_input.dispatchEvent(new dom.window.Event('change'));
        expect([...panel.querySelectorAll('.lg-row')].filter((r) => !r.hidden).map((r) => r.dataset.property)).toEqual(['alpha']);
        panel.filter_state.modified = false;
        panel.filter_state.sort = 'az';
        panel.applySort();
        expect([...panel.querySelector('[data-section="one"] .lg-section-body').children].map((r) => r.dataset.property)).toEqual(['alpha', 'zeta shadow']);
    });

    test('a collapsed section is remembered per panel id', () => {
        const canvas = makeCanvas();
        const panel = canvas.createPanel('C', { id: 'remember' });
        const section = panel.addSection('Things', { id: 'things' });
        section.open = false;
        section.dispatchEvent(new dom.window.Event('toggle'));
        expect(LiteGraph.settings.get('LiteGraph.Panel.Collapsed')).toEqual({ remember: { things: true } });
        const again = canvas.createPanel('C', { id: 'remember' }).addSection('Things', { id: 'things' });
        expect(again.open).toBe(false);
    });
});

describe('graph options panel', () => {
    test('tabs, categorized canvas options with labels, host-added options under Other, and search across tabs', () => {
        const canvas = makeCanvas();
        LiteGraph.availableCanvasOptions.push('my_host_flag');
        canvas.my_host_flag = true;
        try {
            const panel = canvas.showShowGraphOptionsPanel();
            expect(panel.id).toBe('option-panel');
            expect(canvas.options_panel).toBe(panel);
            expect(canvas.OPTIONPANEL_IS_OPEN).toBe(true);
            expect([...panel.querySelectorAll('.lg-tab')].map((t) => t.textContent)).toEqual(['Graph', 'Canvas', 'Settings']);
            const shadows = rowOf(panel, 'render_shadows');
            expect(shadows.querySelector('.lg-label').textContent).toBe('Node shadows');
            expect(shadows.closest('.lg-section').dataset.section).toBe('canvas-rendering');
            expect(rowOf(panel, 'my_host_flag').closest('.lg-section').dataset.section).toBe('canvas-other');
            expect(input(rowOf(panel, 'links_render_mode'), 'select').selectedOptions[0].textContent).toBe(LiteGraph.LINK_RENDER_MODES[canvas.links_render_mode]);
            // search shows matches from every tab
            type(panel.search_input, 'shadow');
            const shown = [...panel.querySelectorAll('.lg-row')].filter((r) => !r.hidden).map((r) => r.dataset.property);
            expect(shown).toEqual(expect.arrayContaining(['render_shadows', 'render_connections_shadows']));
            expect(panel.classList.contains('lg-filtering')).toBe(true);
            type(panel.search_input, 'execution model');
            expect(rowOf(panel, 'Execution model').hidden).toBe(false);
            // a change applies to the canvas and shows the modified marker
            type(panel.search_input, '');
            const box = input(rowOf(panel, 'render_shadows'));
            box.checked = false;
            box.dispatchEvent(new dom.window.Event('change'));
            expect(canvas.render_shadows).toBe(false);
            panel.modified_input.checked = true;
            panel.modified_input.dispatchEvent(new dom.window.Event('change'));
            expect([...panel.querySelectorAll('.lg-tab-pane[data-tab="canvas"] .lg-row')].filter((r) => !r.hidden).map((r) => r.dataset.property)).toEqual(['render_shadows']);
            panel.close();
            expect(canvas.options_panel).toBeNull();
        } finally {
            LiteGraph.availableCanvasOptions.pop();
        }
    });

    test('settings rows: an extension setting appears under its category and edits persist; disposing removes it', () => {
        const saved = [];
        LiteGraph.settings.setStorage({ load: () => ({}), save: (values) => saved.push(values) });
        const dispose = LiteGraph.registerExtension({ name: 'test.panels', settings: [{ id: 'Tests.Panels.Speed', name: 'Speed', default: 2, tooltip: 'How fast' }] });
        const canvas = makeCanvas();
        let panel = canvas.showShowGraphOptionsPanel();
        const row = rowOf(panel, 'Tests.Panels.Speed');
        expect(row.closest('.lg-section').querySelector('.lg-section-name').textContent).toBe('Tests / Panels');
        type(input(row), '5');
        expect(LiteGraph.settings.get('Tests.Panels.Speed')).toBe(5);
        expect(saved.at(-1)['Tests.Panels.Speed']).toBe(5);
        dispose();
        panel = canvas.showShowGraphOptionsPanel();
        expect(rowOf(panel, 'Tests.Panels.Speed')).toBeNull();
        // hidden settings are not listed
        expect(rowOf(panel, 'LiteGraph.Panel.Collapsed')).toBeNull();
    });

    test('a model change is one undo step; canvas defaults are saved on request and applied to new canvases', () => {
        const graph = new LGraph();
        const canvas = makeCanvas(graph);
        withHistory(graph, () => {
            const panel = canvas.showShowGraphOptionsPanel();
            const first = graph.executionModel;
            const model = input(rowOf(panel, 'Execution model'), 'select');
            const other = [...model.options].find((o) => o.textContent !== first);
            change(model, other.value);
            expect(graph.executionModel).toBe(other.textContent);
            graph.actionHistoryBack();
            expect(graph.executionModel).toBe(first);
        });
        const panel = canvas.showShowGraphOptionsPanel();
        canvas.showExecutionNotice = () => null; // its 2.5 s timer would outlive the test
        canvas.render_shadows = false;
        [...panel.footer.querySelectorAll('button')].find((b) => b.textContent.startsWith('Save canvas')).click();
        expect(LiteGraph.settings.get('LiteGraph.Canvas.Defaults').render_shadows).toBe(false);
        expect(makeCanvas().render_shadows).toBe(false);
    });
});

describe('node details panel', () => {
    function setup() {
        const graph = new LGraph();
        const canvas = makeCanvas(graph);
        graph.add(LiteGraph.createNode('panel/source'));
        const node = LiteGraph.createNode('panel/probe');
        graph.add(node);
        return { graph, canvas, node };
    }

    test('header and description are text, never markup; sections and editors per property type', () => {
        const { canvas, node } = setup();
        const panel = canvas.showShowNodePanel(node);
        expect(panel.id).toBe('node-panel');
        expect(canvas.node_panel).toBe(panel);
        expect(panel.node).toBe(node);
        expect(panel.querySelector('img')).toBeNull();
        expect(window.__xss).toBeUndefined();
        expect(panel.querySelector('.node_desc').textContent).toContain('<img');
        expect([...panel.querySelectorAll('.lg-section')].map((s) => s.dataset.section)).toEqual(['general', 'properties', 'widgets', 'inputs', 'outputs', 'execution', 'advanced']);
        const editors = Object.fromEntries([...panel.querySelectorAll('[data-section="properties"] .lg-row')].map((r) => [r.dataset.property, r.dataset.editor]));
        expect(editors).toMatchObject({ gain: 'number', count: 'number', offset: 'vector', tint: 'color', mode: 'combo', level: 'combo', label: 'string', data: 'json' });
        expect(editors.secret).toBeUndefined(); // info.hidden
        expect(panel.querySelector('.lg-subsection-title').textContent).toBe('Transform');
        expect(rowOf(panel, 'amount').dataset.editor).toBe('slider');
        expect(rowOf(panel, 'enabled').dataset.editor).toBe('boolean');
    });

    test('a property edit is one undo step; beforeChange/afterChange still fire; min/max apply', () => {
        let { graph, canvas, node } = setup(); // eslint-disable-line prefer-const
        const hooks = [];
        graph.onBeforeChange = () => hooks.push('before');
        graph.onAfterChange = () => hooks.push('after');
        withHistory(graph, () => {
            const panel = canvas.showShowNodePanel(node);
            type(input(rowOf(panel, 'gain')), '9');
            expect(node.properties.gain).toBe(2);
            expect(hooks).toEqual(['before', 'after']);
            graph.actionHistoryBack();
            expect(graph.getNodeById(node.id).properties.gain).toBe(0.5);
        });
        const panel = canvas.showShowNodePanel(graph.getNodeById(node.id));
        node = graph.getNodeById(node.id);
        type(input(rowOf(panel, 'tint'), 'input[type=text]'), 'F80');
        expect(node.properties.tint).toBe('#ff8800');
        change(input(rowOf(panel, 'level'), 'select'), '1');
        expect(node.properties.level).toBe(2);
    });

    test('previews (a drag) and their commit are one undo step', () => {
        const { graph, canvas, node } = setup();
        withHistory(graph, () => {
            const panel = canvas.showShowNodePanel(node);
            const range = rowOf(panel, 'amount').querySelector('input[type=range]');
            for (const v of ['0.3', '0.4', '0.5']) { range.value = v; range.dispatchEvent(new dom.window.Event('input')); }
            range.dispatchEvent(new dom.window.Event('change'));
            expect(node.widgets.find((w) => w.name === 'amount').value).toBe(0.5);
            expect(graph._transaction).toBeFalsy();
            graph.actionHistoryBack(); // the whole drag is one step
            expect(graph.getNodeById(node.id).widgets.find((w) => w.name === 'amount').value).toBe(0.2);
        });
    });

    test('onAddPropertyToPanel takes over a row; onShowCustomPanelInfo runs; block_delete hides Delete', () => {
        const { canvas, node } = setup();
        node.onAddPropertyToPanel = (name, panel) => {
            if (name !== 'custom') return false;
            panel.addHTML('<span class="mine">custom row</span>');
            return true;
        };
        node.onShowCustomPanelInfo = (panel) => panel.addHTML('<i class="info-hook">x</i>');
        node.block_delete = true;
        const panel = canvas.showShowNodePanel(node);
        expect(rowOf(panel, 'custom')).toBeNull();
        expect(panel.querySelector('[data-section="properties"] .mine')).toBeTruthy();
        expect(panel.querySelector('.info-hook')).toBeTruthy();
        expect([...panel.footer.querySelectorAll('button')].map((b) => b.textContent)).not.toContain('Delete');
    });

    test('live refresh: a canvas widget change and a property change update the open panel; removal closes it', async () => {
        const { graph, canvas, node } = setup();
        const panel = canvas.showShowNodePanel(node);
        const amount = node.widgets.find((w) => w.name === 'amount');
        canvas.applyWidgetValue(node, amount, 0.9);
        expect(input(rowOf(panel, 'amount'), 'input[type=text]').value).toBe('0.9');
        node.setProperty('count', 7);
        expect(input(rowOf(panel, 'count')).value).toBe('7');
        graph.remove(node);
        expect(panel.isConnected).toBe(false);
        expect(canvas.node_panel).toBeNull();
    });

    test('follow selection switches the panel to the newly selected node', () => {
        const { graph, canvas, node } = setup();
        const other = LiteGraph.createNode('panel/probe');
        other.title = 'Other';
        graph.add(other);
        canvas.showShowNodePanel(node);
        canvas.processNodeSelected(other);
        expect(canvas.node_panel.node).toBe(node); // off by default
        LiteGraph.settings.set('LiteGraph.Panel.FollowSelection', true);
        canvas.processNodeSelected(other);
        expect(canvas.node_panel.node).toBe(other);
        LiteGraph.settings.set('LiteGraph.Panel.FollowSelection', false);
    });

    test('slot rows link to the connected node; the Execution section lists this node\'s issues', () => {
        const { graph, canvas, node } = setup();
        const source = graph._nodes.find((n) => n.type === 'panel/source');
        source.connect(0, node, 0);
        const panel = canvas.showShowNodePanel(node);
        const link = panel.querySelector('[data-section="inputs"] .lg-link-btn');
        expect(link.textContent).toContain(source.title);
        link.click();
        expect(canvas.selected_nodes[source.id]).toBe(source);
        expect(panel.querySelector('[data-section="execution"]').textContent).toMatch(/Status/);
    });

    test('a node class that does not extend LGraphNode works, and the former fUpdate still edits', () => {
        const { canvas, node } = setup();
        expect(node instanceof LiteGraph.LGraphNode).toBe(false);
        const panel = canvas.showShowNodePanel(node);
        panel.fUpdate('Title', 'Renamed');
        expect(node.title).toBe('Renamed');
        panel.fUpdate('Color', 'red');
        expect(node.color).toBe(LGraphCanvas.node_colors.red.color);
    });
});

describe('panel contributions', () => {
    test('a section registered by an extension renders when its when() is true and is gone after dispose', () => {
        const { graph, canvas, node } = (() => {
            const graph = new LGraph();
            const canvas = makeCanvas(graph);
            const node = LiteGraph.createNode('panel/probe');
            graph.add(node);
            return { graph, canvas, node };
        })();
        const dispose = LiteGraph.registerExtension({
            name: 'test.panel-section',
            setup(ctx) {
                ctx.panels.registerSection({
                    id: 'stats', panel: 'node', title: 'Stats', order: 1,
                    when: (target) => target.type === 'panel/probe',
                    render: (section, c) => c.panel.addRow({ name: 'inputs-count', value: c.node.inputs.length, info: { type: 'int', readonly: true } }),
                });
                ctx.panels.registerSection({ id: 'opt-extra', panel: 'options', tab: 'canvas', title: 'Extra', render: (section, c) => c.panel.addNote('extra note') });
            },
        });
        let panel = canvas.showShowNodePanel(node);
        expect(panel.querySelector('[data-section="x-stats"]')).toBeTruthy();
        expect(rowOf(panel, 'inputs-count').querySelector('.lg-readonly').textContent).toBe('1'); // read-only values read as text
        const options = canvas.showShowGraphOptionsPanel();
        expect(options.querySelector('.lg-tab-pane[data-tab="canvas"] [data-section="x-opt-extra"]')).toBeTruthy();
        dispose();
        panel = canvas.showShowNodePanel(node);
        expect(panel.querySelector('[data-section="x-stats"]')).toBeNull();
        expect(graph).toBeTruthy();
    });
});

test('SettingsRegistry is untouched by the panels (smoke)', () => {
    expect(new SettingsRegistry().list()).toEqual([]);
    expect(PanelBuilder.highlight).toBeInstanceOf(Function);
});
