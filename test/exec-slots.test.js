// The built-in exec slots `onTrigger` / `onExecuted`: the marker, their placement by layout, and the
// per-model rule that creates them (plan agents/plans/2026-11-23-node-pin-modes-exec-slots.md, track B).
import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphNode } from '../src/lgraphnode.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { ExecutionEngine } from '../src/execution.js';
import '../src/nodes/events.js';
import '../src/nodes/logic.js';

const TITLE = () => LiteGraph.NODE_TITLE_HEIGHT;
let flagValues;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    flagValues = { ...LiteGraph._legacy_flag_values };
    class Work {
        constructor() { this.addInput('a', 'number'); this.addInput('b', 'number'); this.addOutput('y', 'number'); this.size = [140, 80]; this.runs = 0; }
        onExecute() { this.runs++; }
    }
    class Emit { constructor() { this.addOutput('ev', LiteGraph.EVENT); } onExecute() {} }
    LiteGraph.registerNodeType('exs/work', Work);
    LiteGraph.registerNodeType('exs/emit', Emit);
});
beforeEach(() => {
    for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {});
    LiteGraph._legacy_flags_assigned.clear();
    LiteGraph._default_execution_model_set = false;
    LiteGraph._default_execution_model = 'ancestors';
});
afterEach(() => {
    Object.assign(LiteGraph._legacy_flag_values, flagValues);
    LiteGraph.do_add_triggers_slots = undefined;
    LiteGraph.exec_slot_layout = null;
    LiteGraph.settings.set('LiteGraph.Node.ExecSlots', 'auto');
    LiteGraph.settings.set('LiteGraph.Node.ExecSlotLayout', 'rows');
    jest.restoreAllMocks();
});

function graph(model) {
    const g = new LGraph();
    g.config.execution = model;
    return g;
}
function work(g, withExec = true) {
    const node = LiteGraph.createNode('exs/work');
    node.pos = [100, 200];
    g.add(node);
    if (withExec) { node.addOnTriggerInput(); node.addOnExecutedOutput(); }
    return node;
}
const rel = (node, isInput, slot) => {
    const p = node.getConnectionPos(isInput, slot);
    return [p[0] - node.pos[0], p[1] - node.pos[1]];
};

describe('marker', () => {
    test('the helpers append marked slots; the indices of the other slots stay', () => {
        const node = work(new LGraph());
        expect(node.inputs.map((s) => s.name)).toEqual(['a', 'b', 'onTrigger']);
        expect(node.outputs.map((s) => s.name)).toEqual(['y', 'onExecuted']);
        expect(node.inputs[2].exec).toBe('trigger');
        expect(node.outputs[1].exec).toBe('executed');
        expect(LGraphNode.isExecSlot(node.inputs[2])).toBe('trigger');
        expect(LGraphNode.isExecSlot(node.inputs[0])).toBeNull();
    });

    test('slots saved before the marker are recognised; a declared onTrigger input is not an exec slot', () => {
        expect(LGraphNode.isExecSlot({ name: 'onTrigger', type: LiteGraph.EVENT, nameLocked: true, removable: true })).toBe('trigger');
        expect(LGraphNode.isExecSlot({ name: 'onExecuted', type: LiteGraph.ACTION, nameLocked: true, removable: true })).toBe('executed');
        const branch = LiteGraph.createNode('logic/IF');
        expect(branch.inputs[0].name).toBe('onTrigger');
        expect(LGraphNode.isExecSlot(branch.inputs[0])).toBeNull();
    });
});

describe('creating them (ExecutionEngine.execSlotsFor)', () => {
    test('on under ancestors, off under the other models and legacy', () => {
        expect(ExecutionEngine.execSlotsFor(graph('ancestors'))).toBe(true);
        for (const model of ['step', 'strict', 'event', 'legacy']) expect(ExecutionEngine.execSlotsFor(graph(model))).toBe(false);
    });

    test('an assigned do_add_triggers_slots wins over the model; the setting wins over both', () => {
        LiteGraph.do_add_triggers_slots = false;
        expect(ExecutionEngine.execSlotsFor(graph('ancestors'))).toBe(false);
        LiteGraph.do_add_triggers_slots = true;
        expect(ExecutionEngine.execSlotsFor(graph('step'))).toBe(true);
        LiteGraph.settings.set('LiteGraph.Node.ExecSlots', 'off');
        expect(ExecutionEngine.execSlotsFor(graph('step'))).toBe(false);
        LiteGraph.settings.set('LiteGraph.Node.ExecSlots', 'on');
        LiteGraph.do_add_triggers_slots = undefined;
        expect(ExecutionEngine.execSlotsFor(graph('legacy'))).toBe(true);
    });

    test('ancestors: an event link dropped on a node creates both slots and switches it to ON_TRIGGER', () => {
        const g = graph('ancestors');
        const emit = LiteGraph.createNode('exs/emit');
        g.add(emit);
        const target = work(g, false);
        const link = emit.connect(0, target, LiteGraph.EVENT);
        expect(link).toBeTruthy();
        expect(target.mode).toBe(LiteGraph.ON_TRIGGER);
        expect(target.inputs.at(-1).exec).toBe('trigger');
        expect(target.outputs.at(-1).exec).toBe('executed');
        emit.triggerSlot(0);
        expect(target.runs).toBe(1);
    });

    test('step: no slots are created and the drop connects nothing', () => {
        const g = graph('step');
        const emit = LiteGraph.createNode('exs/emit');
        g.add(emit);
        const target = work(g, false);
        expect(emit.connect(0, target, LiteGraph.EVENT)).toBeNull();
        expect(target.inputs).toHaveLength(2);
    });

    test('a type that refuses ON_TRIGGER keeps its mode but still gets onTrigger', () => {
        const g = graph('ancestors');
        const emit = LiteGraph.createNode('exs/emit');
        g.add(emit);
        const timer = LiteGraph.createNode('events/timer'); // valid modes: ALWAYS, NEVER, BYPASS
        g.add(timer);
        expect(emit.connect(0, timer, LiteGraph.EVENT)).toBeTruthy();
        expect(timer.mode).toBe(LiteGraph.ALWAYS);
        expect(LGraphNode.isExecSlot(timer.inputs.at(-1))).toBe('trigger');
    });
});

describe('placement', () => {
    test('rows (default): exec slots stay in the slot rows, as before', () => {
        const node = work(new LGraph());
        expect(node.getExecSlotLayout()).toBeNull();
        expect(node.getExecSlotPos(true, 2)).toBeNull();
        const row = (i) => (i + 0.7) * LiteGraph.NODE_SLOT_HEIGHT;
        expect(rel(node, true, 2)[1]).toBeCloseTo(row(2));
        expect(rel(node, false, 1)[1]).toBeCloseTo(row(1));
        expect(node.getSlotsHeight()).toBe(3 * LiteGraph.NODE_SLOT_HEIGHT + 10);
    });

    test('edges: on the line between title and body, at both ends; they take no row', () => {
        LiteGraph.settings.set('LiteGraph.Node.ExecSlotLayout', 'edges');
        const node = work(new LGraph());
        expect(rel(node, true, 2)).toEqual([0, 0]);
        expect(rel(node, false, 1)).toEqual([140, 0]);
        // the other slots keep their rows; onTrigger / onExecuted take none
        expect(rel(node, true, 1)[1]).toBeCloseTo(1.7 * LiteGraph.NODE_SLOT_HEIGHT);
        expect(node.getSlotsHeight()).toBe(2 * LiteGraph.NODE_SLOT_HEIGHT + 10);
        expect(node.getSlotDir(true, 2)).toBe(LiteGraph.LEFT);
        expect(node.getSlotDir(false, 1)).toBe(LiteGraph.RIGHT);
        // hit testing finds them there
        expect(node.getSlotInPosition(node.pos[0] + 1, node.pos[1] + 1)?.slot).toBe(2);
        expect(node.getSlotInPosition(node.pos[0] + 139, node.pos[1] - 1)?.output?.name).toBe('onExecuted');
    });

    test('edges, vertical nodes: onTrigger above the pin, onExecuted at the bottom at the same offset', () => {
        LiteGraph.exec_slot_layout = 'edges';
        const node = work(new LGraph());
        node.horizontal = true;
        expect(rel(node, true, 2)).toEqual([TITLE() * 0.5, -TITLE()]);
        expect(rel(node, false, 1)).toEqual([TITLE() * 0.5, 80]);
        expect(node.getSlotDir(true, 2)).toBe(LiteGraph.UP);
        expect(node.getSlotDir(false, 1)).toBe(LiteGraph.DOWN);
        // a drop just above the title, on the onTrigger arrow, finds the node and the slot
        const top = [node.pos[0] + TITLE() * 0.5, node.pos[1] - TITLE() - 3];
        expect(node.isPointInside(top[0], top[1])).toBe(true);
        expect(node.getSlotInPosition(top[0], top[1])?.slot).toBe(2);
        // a and b share the width right of the pin column, which onTrigger keeps
        const rest = 140 - TITLE();
        expect(rel(node, true, 0)[0]).toBeCloseTo(TITLE() + rest * 0.25);
        expect(rel(node, true, 1)[0]).toBeCloseTo(TITLE() + rest * 0.75);
        // the single output, too
        expect(rel(node, false, 0)[0]).toBeCloseTo(TITLE() + rest * 0.5);
        node.exec_slot_layout = 'rows';
        expect(node.isPointInside(top[0], top[1])).toBe(false);
    });

    test('a node or class layout, with anchors and offsets in units or percent', () => {
        const node = work(new LGraph());
        node.size = [140, 80]; // adding the slots in the rows layout widened it
        node.exec_slot_layout = { normal: { trigger: { x: 'center', y: 'top', dx: '10%', dy: -5, dir: LiteGraph.UP } } };
        expect(rel(node, true, 2)).toEqual([70 + 14, -TITLE() - 5]);
        expect(node.getExecSlotPos(false, 1)).toBeNull(); // executed not placed: back in the rows
        const dispose = LiteGraph.registerExecSlotLayout('mine', { normal: { executed: { x: 'right', y: 'middle' } } });
        node.exec_slot_layout = 'mine';
        expect(rel(node, false, 1)).toEqual([140, 40]);
        dispose();
        expect(LiteGraph.resolveExecSlotLayout('mine')).toBeNull();
    });

    test('saving and loading keeps every index and link', () => {
        LiteGraph.settings.set('LiteGraph.Node.ExecSlotLayout', 'edges');
        const g = graph('ancestors');
        const emit = LiteGraph.createNode('exs/emit');
        g.add(emit);
        const node = work(g);
        emit.connect(0, node, 2);
        const again = new LGraph(g.serialize());
        const loaded = again.getNodeById(node.id);
        expect(loaded.inputs.map((s) => s.name)).toEqual(['a', 'b', 'onTrigger']);
        expect(again.links[loaded.inputs[2].link].target_slot).toBe(2);
        expect(loaded.inputs[2].exec).toBe('trigger');
    });

    test('arrows point along the flow', () => {
        expect(LGraphCanvas.slotFlow(true, LiteGraph.LEFT)).toEqual([1, -0]);
        expect(LGraphCanvas.slotFlow(true, LiteGraph.UP)).toEqual([-0, 1]);
        expect(LGraphCanvas.slotFlow(false, LiteGraph.DOWN)).toEqual([0, 1]);
        expect(LGraphCanvas.slotFlow(false)).toEqual([1, 0]);
    });
});
