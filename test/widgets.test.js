import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { BaseWidget, NumberWidget, SliderWidget, ComboWidget, ToggleWidget, TextWidget, ButtonWidget, widgetImplementation, evaluateMathExpression } from '../src/widgets.js';

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
});

class Host { constructor() { this.addInput('in', 'number'); } }
beforeAll(() => LiteGraph.registerNodeType('wdg/host', Host));

test('addWidget returns class instances with the same fields; plain objects still resolve by type', () => {
    const node = LiteGraph.createNode('wdg/host');
    const expected = { number: NumberWidget, slider: SliderWidget, combo: ComboWidget, toggle: ToggleWidget, text: TextWidget, button: ButtonWidget };
    for (const [type, cls] of Object.entries(expected)) {
        const w = node.addWidget(type, type, type === 'combo' ? 'a' : 1, () => {}, type === 'combo' ? { values: ['a', 'b'] } : { min: 0, max: 10 });
        expect(w).toBeInstanceOf(cls);
        expect(w).toMatchObject({ type, name: type });
        expect(typeof w.callback).toBe('function');
        expect(widgetImplementation(w)).toBe(w);
    }
    const plain = { type: 'slider', name: 'p', value: 1, options: { min: 0, max: 1 } };
    expect(widgetImplementation(plain)).toBe(SliderWidget.prototype);
    const custom = { type: 'mine', draw() {}, mouse() {} };
    expect(widgetImplementation(custom)).toBeNull();
    expect(node.addWidget('unknowntype', 'u', 1)).not.toBeInstanceOf(BaseWidget);
});

test('registerWidgetType: custom classes are used by addWidget and the dispatcher', () => {
    class Stars extends BaseWidget { draw() { this.drawn = true; } onPointer() { this.clicked = true; } }
    LiteGraph.registerWidgetType('stars', Stars);
    const node = LiteGraph.createNode('wdg/host');
    const w = node.addWidget('stars', 'rating', 3);
    expect(w).toBeInstanceOf(Stars);
    expect(() => LiteGraph.registerWidgetType('bad', class {})).toThrow(/BaseWidget/);
});

function pointerEnv(node, widget, extra = {}) {
    const changes = [];
    const canvas = { dirty_canvas: false, ds: { scale: 1 }, prompt: jest.fn(), last_mouseclick: 5 };
    return { changes, canvas, env: { canvas, node, x: 100, y: 0, pos: [0, 0], widget_width: 200, old_value: widget.value, ref_window: {}, changed: (w, value, old) => changes.push([w.name, value, old]), ...extra } };
}

test('pointer behaviour matches the former switch: number arrows, slider step, toggle, combo arrows', async () => {
    const node = LiteGraph.createNode('wdg/host');
    const num = node.addWidget('number', 'n', 5, null, { min: 0, max: 6, step: 1 });
    let { changes, env } = pointerEnv(node, num, { x: 190 });
    num.onPointer({ type: 'pointerdown' }, env);
    num.onPointer({ type: 'pointerdown' }, { ...env, old_value: 6 });
    expect(num.value).toBe(6); // clamped at max
    const slider = node.addWidget('slider', 's', 0, null, { min: 0, max: 10, step: 5 });
    ({ changes, env } = pointerEnv(node, slider, { x: 15 + 170 * 0.7 }));
    slider.onPointer({ type: 'pointermove' }, env);
    expect(slider.value).toBe(5); // 7 snapped to the step
    const toggle = node.addWidget('toggle', 't', false);
    const t = pointerEnv(node, toggle);
    toggle.onPointer({ type: 'pointerdown' }, t.env);
    const combo = node.addWidget('combo', 'c', 'a', null, { values: ['a', 'b', 'c'] });
    const c = pointerEnv(node, combo, { x: 190 });
    combo.onPointer({ type: 'pointerdown' }, c.env);
    expect(combo.value).toBe('b');
    expect(c.canvas.last_mouseclick).toBe(0);
    await new Promise((resolve) => setTimeout(resolve, 60)); // widgets report changes after 20 ms
    expect(t.changes).toEqual([['t', true, false]]);
    expect(c.changes).toEqual([['c', 'b', 'a']]);
});

test('text widgets report the new value and the old one (used to report the stale value)', () => {
    const graph = new LGraph();
    const node = LiteGraph.createNode('wdg/host');
    graph.add(node);
    const text = node.addWidget('text', 'label', 'old');
    const seen = [];
    graph.events.on('widget-changed', (event) => seen.push([event.detail.value, event.detail.previous]));
    const canvas = {
        allow_interaction: true,
        getCanvasWindow: () => ({}),
        prompt: (title, value, callback) => callback('new'),
        processNodeWidgets: LiteGraph.LGraphCanvas.prototype.processNodeWidgets,
    };
    text.last_y = 10;
    node.pos = [0, 0];
    canvas.processNodeWidgets(node, [50, 15], { type: 'pointerdown' });
    expect(text.value).toBe('new');
    expect(seen).toEqual([['new', 'old']]);
});

test('evaluateMathExpression computes arithmetic and executes nothing else', () => {
    expect(evaluateMathExpression('2*8+1')).toBe(17);
    expect(evaluateMathExpression('(1 + 2) * -3')).toBe(-9);
    expect(evaluateMathExpression('2 ** 3 % 5')).toBe(3);
    expect(evaluateMathExpression('.5 + 1.25e1')).toBe(13);
    expect(evaluateMathExpression('pi')).toBeCloseTo(Math.PI);
    for (const bad of ['1;alert(1)', 'process.exit()', '2+', '(1', '1 2', '', 'constructor']) {
        expect(evaluateMathExpression(bad)).toBeNaN();
    }
});

describe('widget inputs', () => {
    class Amp {
        constructor() {
            this.addInput('signal', 'number');
            this.addWidget('number', 'gain', 2, null, { socket: true });
            this.addOutput('out', 'number');
        }
        onExecute() { this.setOutputData(0, (this.getInputData(0) ?? 1) * this.getWidgetValue('gain')); }
    }
    class Num { constructor() { this.addOutput('v', 'number'); this.addProperty('v', 10); } onExecute() { this.setOutputData(0, this.properties.v); } }
    beforeAll(() => { LiteGraph.registerNodeType('wdg/amp', Amp); LiteGraph.registerNodeType('wdg/num', Num); });

    test('a widget input lives on the widget row, outside the slot rows', () => {
        const amp = LiteGraph.createNode('wdg/amp');
        amp.pos = [100, 100];
        const gain = amp.widgets[0];
        const input = amp.getSlotFromWidget(gain);
        expect(input).toMatchObject({ name: 'gain', type: 'number', widget: { name: 'gain' } });
        expect(amp.getWidgetFromSlot(input)).toBe(gain);
        expect(amp.addWidgetInput('gain')).toBe(input); // idempotent
        // slot rows: only "signal" counts
        expect(amp.getSlotsHeight()).toBe(Math.max(1, 1) * LiteGraph.NODE_SLOT_HEIGHT + 10);
        gain.last_y = 40;
        const pos = amp.getConnectionPos(true, 1);
        expect(pos[1]).toBe(100 + 40 + LiteGraph.NODE_WIDGET_HEIGHT * 0.5);
        expect(LiteGraph.LGraphNode.isWidgetInputSlot(amp.inputs[0])).toBe(false);
    });

    test('a linked widget input drives the value used in execution and disables the widget', () => {
        const graph = new LGraph();
        const amp = LiteGraph.createNode('wdg/amp');
        const num = LiteGraph.createNode('wdg/num');
        graph.add(amp); graph.add(num);
        graph.runStep(1);
        expect(amp.getOutputData(0)).toBe(2); // widget value
        num.connect(0, amp, 1);
        expect(amp.isWidgetLinked(amp.widgets[0])).toBe(true);
        graph.runStep(1);
        expect(amp.getOutputData(0)).toBe(10); // link value wins
        // a linked widget does not react to pointer input
        amp.widgets[0].last_y = 30; amp.pos = [0, 0];
        const canvas = { allow_interaction: true, getCanvasWindow: () => ({}), processNodeWidgets: LiteGraph.LGraphCanvas.prototype.processNodeWidgets };
        expect(canvas.processNodeWidgets(amp, [100, 35], { type: 'pointerdown' })).toBeNull();
        amp.disconnectInput(1);
        graph.runStep(1);
        expect(amp.getOutputData(0)).toBe(2);
    });

    test('a link dropped anywhere on the widget row targets the widget input', () => {
        const amp = LiteGraph.createNode('wdg/amp');
        amp.pos = [0, 0]; amp.size = [200, 120];
        amp.widgets[0].last_y = 50;
        const over = LiteGraph.LGraphCanvas.prototype.isOverNodeInput.call({}, amp, 150, 55);
        expect(over).toBe(1);
    });
});
