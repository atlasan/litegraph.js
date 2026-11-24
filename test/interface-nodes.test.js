// widget/number shows its value with the decimals of its step, also after loading a document
// (the precision was only set when the step property was edited, so 0.7 with step 0.1 showed "1").
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import '../src/nodes/interface.js';

beforeAll(() => { LiteGraph.initialize(); });

function drawnText(node) {
    const texts = [];
    const ctx = { beginPath() {}, moveTo() {}, lineTo() {}, fill() {}, fillText: (t) => texts.push(t) };
    node.onDrawForeground(ctx);
    return texts;
}

test('a loaded widget/number shows the decimals of its step', () => {
    const source = new LGraph();
    const node = LiteGraph.createNode('widget/number');
    source.add(node);
    node.properties.step = 0.1;
    node.properties.value = 0.7;
    const graph = new LGraph();
    graph.configure(source.serialize());
    expect(drawnText(graph._nodes[0])).toEqual(['0.7']);
});

test('the precision follows the step', () => {
    const node = LiteGraph.createNode('widget/number');
    node.properties.value = 2.5;
    expect(drawnText(node)).toEqual(['3']); // step 1: no decimals (toFixed rounds 2.5 up)
    node.properties.step = 0.25;
    expect(drawnText(node)).toEqual(['2.50']);
});

test('toggle and combo set their value output before their change event (no frame needed)', () => {
    const graph = new LGraph();
    graph.setExecutionModel('event');
    const toggle = LiteGraph.createNode('widget/toggle');
    const combo = LiteGraph.createNode('widget/combo');
    graph.add(toggle); graph.add(combo);
    const seen = [];
    toggle.trigger = () => seen.push(['toggle', toggle.getOutputData(0)]);
    combo.triggerSlot = () => seen.push(['combo', combo.getOutputData(0)]);
    toggle.onAction('toggle');
    combo.widget.callback('C');
    expect(seen).toEqual([['toggle', true], ['combo', 'C']]);
});

test('an H.Slider that was never drawn outputs its value property, not -1', () => {
    const slider = LiteGraph.createNode('widget/hslider');
    slider.properties.value = 0.6;
    slider.onExecute();
    expect(slider.getOutputData(0)).toBeCloseTo(0.6);
});
