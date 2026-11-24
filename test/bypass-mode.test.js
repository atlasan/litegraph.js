// Mode numbering 2: BYPASS = 4 (as in ComfyUI), ON_REQUEST = 5; the document migration and the
// pass-through execution (plan agents/plans/2026-11-23-node-pin-modes-exec-slots.md, track A).
import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { ExecutionEngine } from '../src/execution.js';
import '../src/nodes/events.js';
import '../src/nodes/logic.js';

let clock;
let flagValues;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    flagValues = { ...LiteGraph._legacy_flag_values };
    class Num { constructor() { this.addOutput('n', 'number'); this.properties = { value: 5 }; this.runs = 0; } onExecute() { this.runs++; this.setOutputData(0, this.properties.value); } }
    class Double { constructor() { this.addInput('x', 'number'); this.addOutput('y', 'number'); this.runs = 0; } onExecute() { this.runs++; this.setOutputData(0, (this.getInputData(0) ?? 0) * 2); } }
    class Mixed { constructor() { this.addInput('s', 'string'); this.addInput('n', 'number'); this.addOutput('out', 'number'); this.addOutput('label', 'boolean'); this.runs = 0; } onExecute() { this.runs++; } }
    class Sink { constructor() { this.addInput('v', 'number'); this.seen = []; } onExecute() { this.seen.push(this.getInputData(0)); } }
    class Emit { constructor() { this.addOutput('ev', LiteGraph.EVENT); } onExecute() {} }
    class Relay { constructor() { this.addInput('in', LiteGraph.ACTION); this.addOutput('out', LiteGraph.EVENT); this.actions = []; } onExecute() {} onAction(name, param) { this.actions.push(param); this.triggerSlot(0, param); } }
    class Act { constructor() { this.addInput('in', LiteGraph.ACTION); this.addInput('v', 'number'); this.seen = []; } onExecute() {} onAction(name, param) { this.seen.push([param, this.getInputData(1)]); } }
    for (const [name, cls] of Object.entries({ num: Num, double: Double, mixed: Mixed, sink: Sink, emit: Emit, relay: Relay, act: Act })) {
        LiteGraph.registerNodeType(`byp/${name}`, cls);
    }
});
beforeEach(() => {
    clock = 1000;
    jest.spyOn(LiteGraph, 'getTime').mockImplementation(() => clock);
    for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {});
    LiteGraph._legacy_flags_assigned.clear();
    LiteGraph._default_execution_model_set = false;
    LiteGraph._default_execution_model = 'ancestors';
});
afterEach(() => {
    Object.assign(LiteGraph._legacy_flag_values, flagValues);
    LiteGraph.settings.set('LiteGraph.Compat.UnmarkedMode4', 'bypass');
    jest.restoreAllMocks();
});

function graph(model) {
    const g = new LGraph();
    g.config.execution = model;
    return g;
}
function make(g, type, mode) {
    const node = LiteGraph.createNode(type);
    if (mode !== undefined) node.mode = mode;
    g.add(node);
    return node;
}
function step(g, n = 1) { clock += 10; g.runStep(n); }

describe('constants', () => {
    test('BYPASS is 4, ON_REQUEST is 5, the names follow the numbers', () => {
        expect(LiteGraph.BYPASS).toBe(4);
        expect(LiteGraph.ON_REQUEST).toBe(5);
        expect(LiteGraph.MODES_VERSION).toBe(2);
        expect(LiteGraph.NODE_MODES[LiteGraph.BYPASS]).toBe('Bypass');
        expect(LiteGraph.NODE_MODES[LiteGraph.ON_REQUEST]).toBe('On Request');
        expect(LiteGraph.NODE_MODES_COLORS).toHaveLength(LiteGraph.NODE_MODES.length);
    });

    test('BYPASS is valid under every model, also for declared types', () => {
        for (const model of ['ancestors', 'step', 'strict', 'event', 'legacy']) {
            const g = graph(model);
            const timer = make(g, 'events/timer');
            expect(timer.changeMode(LiteGraph.BYPASS)).toBe(true);
            expect(timer.mode).toBe(LiteGraph.BYPASS);
        }
    });

    test('a saved document carries the numbering', () => {
        expect(new LGraph().serialize().litegraph_modes).toBe(2);
    });
});

describe('migration (LGraph.migrateModes, run by configure)', () => {
    const doc = (fields, modes = [4, 2, 0]) => ({
        ...fields,
        nodes: modes.map((mode, i) => ({ id: i + 1, type: 'byp/double', pos: [0, i * 50], size: [80, 30], flags: {}, mode, properties: {} })),
        links: [],
    });

    test('current numbering: nothing changes', () => {
        const data = doc({ litegraph_version: '0.18.0', litegraph_modes: 2 });
        expect(LGraph.migrateModes(data)).toEqual({ numbering: 'current', changed: 0 });
        expect(data.nodes.map((n) => n.mode)).toEqual([4, 2, 0]);
    });

    test('written by this library before numbering 2: 4 becomes 5, nested graphs included', () => {
        const data = doc({ litegraph_version: '0.18.0-dev.1' });
        data.nodes[2].subgraph = doc({}, [4, 4]);
        data.definitions = { subgraphs: [doc({ id: 'def-1' }, [4, 1])] };
        expect(LGraph.migrateModes(data)).toEqual({ numbering: 'old', changed: 4 });
        expect(data.nodes.map((n) => n.mode)).toEqual([5, 2, 0]);
        expect(data.nodes[2].subgraph.nodes.map((n) => n.mode)).toEqual([5, 5]);
        expect(data.definitions.subgraphs[0].nodes.map((n) => n.mode)).toEqual([5, 1]);
        expect(data.litegraph_modes).toBe(2);
        // a second pass is a no-op
        expect(LGraph.migrateModes(data)).toEqual({ numbering: 'current', changed: 0 });
    });

    test('unmarked documents keep 4 as BYPASS unless LiteGraph.Compat.UnmarkedMode4 says on_request', () => {
        const kept = doc({});
        expect(LGraph.migrateModes(kept)).toEqual({ numbering: 'unmarked', changed: 0 });
        expect(kept.nodes[0].mode).toBe(LiteGraph.BYPASS);

        LiteGraph.settings.set('LiteGraph.Compat.UnmarkedMode4', 'on_request');
        const renumbered = doc({});
        expect(LGraph.migrateModes(renumbered)).toEqual({ numbering: 'unmarked', changed: 1 });
        expect(renumbered.nodes[0].mode).toBe(LiteGraph.ON_REQUEST);

        // an explicit option wins over the setting
        const explicit = doc({});
        LGraph.migrateModes(explicit, { unmarked: 'bypass' });
        expect(explicit.nodes[0].mode).toBe(LiteGraph.BYPASS);
    });

    test('configure migrates the root once; loaded nodes get the new numbers', () => {
        const g = new LGraph();
        g.configure(doc({ litegraph_version: '0.17.0' }));
        expect(g._nodes.map((n) => n.mode)).toEqual([LiteGraph.ON_REQUEST, LiteGraph.NEVER, LiteGraph.ALWAYS]);
        const again = new LGraph();
        again.configure(g.serialize());
        expect(again._nodes.map((n) => n.mode)).toEqual([LiteGraph.ON_REQUEST, LiteGraph.NEVER, LiteGraph.ALWAYS]);
    });
});

describe('pass-through', () => {
    for (const model of ['ancestors', 'step', 'event', 'legacy']) {
        test(`${model}: a bypassed node passes its input value on and its code does not run`, () => {
            const g = graph(model);
            const num = make(g, 'byp/num');
            const dbl = make(g, 'byp/double', LiteGraph.BYPASS);
            const sink = make(g, 'byp/sink');
            num.connect(0, dbl, 0);
            dbl.connect(0, sink, 0);
            step(g, 3);
            expect(dbl.runs).toBe(0);
            expect(sink.seen.at(-1)).toBe(5);
            dbl.mode = LiteGraph.ALWAYS;
            step(g, 2);
            expect(sink.seen.at(-1)).toBe(10);
        });

        test(`${model}: an event passes through a bypassed node at once`, () => {
            const g = graph(model);
            const emit = make(g, 'byp/emit');
            const relay = make(g, 'byp/relay', LiteGraph.BYPASS);
            const act = make(g, 'byp/act');
            emit.connect(0, relay, 0);
            relay.connect(0, act, 0);
            emit.triggerSlot(0, 'ping');
            expect(relay.actions).toEqual([]); // its onAction does not run
            // deferred models queue the action for the final target (the bypass itself never waits)
            step(g);
            expect(act.seen.map(([param]) => param)).toEqual(['ping']);
        });
    }

    test('the input whose type fits: the same index first, then the first fitting one; none gives undefined', () => {
        const g = graph('ancestors');
        const mixed = make(g, 'byp/mixed', LiteGraph.BYPASS);
        expect(ExecutionEngine.bypassSource(mixed, 0)).toBe(1); // out:number <- n (index 1; index 0 is a string)
        expect(ExecutionEngine.bypassSource(mixed, 1)).toBe(-1); // label:boolean has no boolean input
        const num = make(g, 'byp/num');
        num.connect(0, mixed, 1);
        const sink = make(g, 'byp/sink');
        mixed.connect(0, sink, 0);
        step(g, 2);
        expect(mixed.runs).toBe(0);
        expect(sink.seen.at(-1)).toBe(5);
        expect(mixed.outputs[1]._data).toBeUndefined();
    });

    test('ancestors: an action pulls through a bypassed node to an ON_REQUEST source', () => {
        const g = graph('ancestors');
        const num = make(g, 'byp/num', LiteGraph.ON_REQUEST);
        const dbl = make(g, 'byp/double', LiteGraph.BYPASS);
        const emit = make(g, 'byp/emit');
        const act = make(g, 'byp/act');
        num.connect(0, dbl, 0);
        dbl.connect(0, act, 1);
        emit.connect(0, act, 0);
        num.properties.value = 7;
        emit.triggerSlot(0, 'go');
        expect(act.seen).toEqual([['go', 7]]);
        expect(dbl.runs).toBe(0);
    });

    test('exec slots: a bypassed node forwards a trigger to onExecuted', () => {
        const g = graph('ancestors');
        const emit = make(g, 'byp/emit');
        const dbl = make(g, 'byp/double');
        dbl.addOnTriggerInput();
        dbl.addOnExecutedOutput();
        dbl.mode = LiteGraph.BYPASS;
        const act = make(g, 'byp/act');
        emit.connect(0, dbl, dbl.findInputSlot('onTrigger'));
        dbl.connect(dbl.findOutputSlot('onExecuted'), act, 0);
        emit.triggerSlot(0, 'tick');
        expect(dbl.runs).toBe(0);
        expect(act.seen.map(([param]) => param)).toEqual(['tick']);
    });

    test('checkExecution ignores bypassed nodes, like NEVER ones', () => {
        const g = graph('ancestors');
        make(g, 'logic/CycleFOR', LiteGraph.BYPASS); // a loop without a body would be reported
        expect(g.checkExecution().issues.filter((i) => i.code === 'loop-without-body')).toEqual([]);
    });
});
