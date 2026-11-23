// Characterization of the flow nodes under each event and execution configuration (Wave 6).
// Plan: agents/plans/2026-11-22-events-execution.md. A test marked `test.failing` documents a
// finding that is still wrong in that configuration; its name carries the finding id.
import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import '../src/nodes/base.js';
import '../src/nodes/events.js';
import '../src/nodes/logic.js';

const FLAGS = ['use_deferred_actions', 'refreshAncestorsOnActions', 'refreshAncestorsOnTriggers', 'ensureUniqueExecutionAndActionCall', 'throw_errors'];
const PRESETS = {
    // legacy: documents and projects that use the flags
    defaults: {},
    event_based: { use_deferred_actions: false, refreshAncestorsOnActions: true, refreshAncestorsOnTriggers: true, ensureUniqueExecutionAndActionCall: true },
    // execution models (config.execution)
    ancestors: { model: 'ancestors' },
    step: { model: 'step' },
    strict: { model: 'strict' },
    event: { model: 'event' },
};
const DEFERRED = ['defaults', 'step', 'strict'];
/** where each finding is still wrong; the test is `test.failing` there */
const KNOWN = {
    // legacy keeps today's behaviour (bugs included); the models fix them through the engine and the declarations
    B1: ['defaults'],
    // WHILE re-runs its condition within the frame: the strict model refuses that (WHILE declares strict invalid)
    B2: ['defaults', 'strict'],
    B4: ['defaults'],
    B6: ['defaults'],
    B8: ['defaults', 'event_based', 'step', 'strict'],
    // A1 is the ancestors model's frame pull
    A1: ['defaults', 'event_based', 'step', 'strict', 'event'],
    A2: ['defaults', 'event_based'],
    A3: ['event_based'],
};
const TIMER_TICKS = 5; // 250 ms at 100 ms, plus a double tick at start: time stays 0 after the first tick
let saved;
let clock;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    saved = Object.fromEntries(FLAGS.map((key) => [key, LiteGraph[key]]));
    class Src { constructor() { this.addOutput('go', LiteGraph.EVENT); } onExecute() {} }
    class Rec { constructor() { this.addInput('in', LiteGraph.ACTION); this.addInput('v', 0); this.log = []; } onExecute() {} onAction(_a, param) { this.log.push(this.getInputData(1)); this.params ??= []; this.params.push(param); } }
    class RecNoExec { constructor() { this.addInput('in', LiteGraph.ACTION); this.addInput('v', 0); this.log = []; } onAction(_a, param) { this.log.push(this.getInputData(1)); this.params ??= []; this.params.push(param); } }
    class Lt { constructor() { this.addInput('a', 'number'); this.addOutput('lt', 'boolean'); } onExecute() { this.setOutputData(0, (this.getInputData(0) ?? 0) < 3); } }
    class Pure { constructor() { this.addInput('a', 'number'); this.addOutput('o', 'number'); this.runs = 0; } onExecute() { this.runs++; this.setOutputData(0, (this.getInputData(0) ?? 0) + 1); } }
    class Sink { constructor() { this.addInput('v', 'number'); this.seen = []; } onExecute() { this.seen.push(this.getInputData(0)); } }
    class PullSink { constructor() { this.addInput('v', 'number'); this.seen = []; } onExecute() { this.seen.push(this.getInputData(0, true, true)); } }
    class Tag { constructor() { this.addInput('in', LiteGraph.ACTION); this.properties = { tag: 0 }; } onExecute() {} onAction() { Tag.order.push(this.properties.tag); } }
    Tag.order = [];
    class Boom { constructor() { this.addInput('in', LiteGraph.ACTION); } onAction() { throw new Error('boom'); } }
    class Starter { onExecute() {} onStart() { Starter.seen.push(this.mode); } }
    Starter.seen = [];
    for (const [name, cls] of Object.entries({ src: Src, rec: Rec, recNoExec: RecNoExec, lt: Lt, pure: Pure, sink: Sink, pullsink: PullSink, tag: Tag, boom: Boom, starter: Starter })) {
        LiteGraph.registerNodeType(`evm/${name}`, cls);
    }
});
beforeEach(() => {
    clock = 1000;
    jest.spyOn(LiteGraph, 'getTime').mockImplementation(() => clock);
    for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {});
    LiteGraph.registered_node_types['evm/tag'].order = [];
    LiteGraph.registered_node_types['evm/starter'].seen = [];
});
afterEach(() => { Object.assign(LiteGraph, saved); jest.restoreAllMocks(); });

/** a fresh graph under a flag preset (flags are assigned, as a project does) or an execution model */
function setup(preset) {
    const { model, ...flags } = PRESETS[preset];
    Object.assign(LiteGraph, saved, flags);
    const graph = new LGraph();
    if (model) graph.config.execution = model;
    return graph;
}
function make(graph, type, props = {}, mode) {
    const node = LiteGraph.createNode(type);
    Object.assign(node.properties, props);
    if (mode !== undefined) node.mode = mode;
    graph.add(node);
    return node;
}
/** one step with the clock advanced by `ms` */
function step(graph, ms = 10) { clock += ms; graph.runStep(1); }

function forGraph(preset, recType = 'evm/rec', mode) {
    const g = setup(preset);
    const src = make(g, 'evm/src');
    const start = make(g, 'basic/const', { value: 0 });
    const n = make(g, 'basic/const', { value: 3 });
    const f = make(g, 'logic/CycleFOR', {}, mode);
    const r = make(g, recType);
    start.connect(0, f, 0); n.connect(0, f, 1); src.connect(0, f, 2);
    f.connect(0, r, 0); f.connect(1, r, 1);
    step(g);
    return { g, src, f, r };
}

function whileGraph(preset) {
    const g = setup(preset);
    const src = make(g, 'evm/src');
    const w = make(g, 'logic/CycleWHILE');
    const c = make(g, 'events/counter');
    // under the ancestors model, the condition is a pure ON_REQUEST node that the loop pulls
    const lt = make(g, 'evm/lt', {}, preset === 'ancestors' ? LiteGraph.ON_REQUEST : undefined);
    src.connect(0, w, 0); w.connect(0, c, 0); c.connect(1, lt, 0); lt.connect(0, w, 1);
    step(g);
    return { g, src, w, c };
}

function sequenceGraph(preset) {
    const g = setup(preset);
    const src = make(g, 'evm/src');
    const seq = make(g, 'events/sequence');
    // added in reverse so the execution order differs from the slot order
    const tags = [2, 1, 0].map((tag) => { const t = make(g, 'evm/tag', { tag }); t.priority = -tag; return t; });
    g.updateExecutionOrder();
    src.connect(0, seq, 0);
    for (const t of tags) seq.connect(t.properties.tag, t, 0);
    step(g);
    return { g, src, seq };
}

describe.each(Object.keys(PRESETS))('configuration %s', (preset) => {
    const deferred = DEFERRED.includes(preset);
    const known = (finding) => (KNOWN[finding]?.includes(preset) ? test.failing : test);

    known('B1')('B1: FOR delivers its body with each index, during the trigger', () => {
        const { g, src, r } = forGraph(preset);
        src.triggerSlot(0);
        step(g); step(g);
        expect(r.log).toEqual([0, 1, 2]);
    });

    test('FOR: characterization of when the body runs', () => {
        const { g, src, r } = forGraph(preset);
        src.triggerSlot(0);
        const during = r.log.slice();
        step(g); step(g);
        // legacy defaults defer the body too; the step and strict models defer only FOR's "do"
        if (preset === 'defaults') { expect(during).toEqual([]); expect(r.log).toEqual([2, 2, 2]); }
        else if (deferred) { expect(during).toEqual([]); expect(r.log).toEqual([0, 1, 2]); }
        else { expect(during).toEqual([0, 1, 2]); expect(r.log).toEqual([0, 1, 2]); }
    });

    known('B8')('B8: FOR in ON_TRIGGER mode runs its body', () => {
        const { src, r } = forGraph(preset, 'evm/recNoExec', LiteGraph.ON_TRIGGER);
        src.triggerSlot(0);
        expect(r.log.length).toBe(3);
    });

    known('B2')('B2: WHILE stops on its condition', () => {
        const { g, src, c } = whileGraph(preset);
        src.triggerSlot(0);
        step(g);
        expect(c.num).toBe(3);
    });

    test('WHILE: characterization of the iteration count', () => {
        const { g, src, c } = whileGraph(preset);
        src.triggerSlot(0);
        step(g);
        expect(c.num).toBe(preset === 'defaults' || preset === 'strict' ? 999 : 3);
    });

    test('B5: ForEach break stops the loop', () => {
        const g = setup(preset);
        const src = make(g, 'evm/src');
        const arr = make(g, 'basic/const');
        const fe = make(g, 'logic/CycleForEach');
        const seen = [];
        fe.onAfterExecuteNode = () => {};
        const body = make(g, 'evm/recNoExec');
        body.onAction = () => { seen.push(fe.outputs[2]._data); if (seen.length === 2) fe.onAction('break'); };
        arr.setOutputData = () => {};
        src.connect(0, fe, 1); fe.connect(0, body, 0);
        fe.getInputData = (slot) => (slot === 0 ? [1, 2, 3] : undefined);
        step(g);
        src.triggerSlot(0);
        step(g);
        expect(seen).toEqual([1, 2]);
    });

    known('B4')('B4: Sequence fires its outputs in slot order', () => {
        const { g, src } = sequenceGraph(preset);
        src.triggerSlot(0);
        step(g);
        expect(LiteGraph.registered_node_types['evm/tag'].order).toEqual([0, 1, 2]);
    });

    test('B4: Sequence does not mutate its caller options', () => {
        const { seq } = sequenceGraph(preset);
        const options = { action_call: 'caller' };
        seq.onAction('', null, options);
        expect(options.action_call).toBe('caller');
    });

    test('Delay in ALWAYS mode delivers once its time elapsed', () => {
        const g = setup(preset);
        const src = make(g, 'evm/src');
        const d = make(g, 'events/delay', { time_in_ms: 25 });
        const r = make(g, 'evm/recNoExec');
        src.connect(0, d, 0); d.connect(0, r, 0);
        step(g);
        src.triggerSlot(0, 'payload');
        for (let i = 0; i < 5; i++) step(g);
        expect(r.params).toEqual(['payload']);
    });

    test('B7: Delay in ON_EVENT mode delivers (or is refused as a mode)', () => {
        const g = setup(preset);
        const src = make(g, 'evm/src');
        const d = make(g, 'events/delay', { time_in_ms: 1 });
        expect(d.changeMode(LiteGraph.ON_EVENT)).toBe(false); // Delay ticks: ALWAYS only
        expect(d.mode_refusal).toMatch(/LiteGraph\.Execution\.AllowAnyMode/);
        const r = make(g, 'evm/recNoExec');
        src.connect(0, d, 0); d.connect(0, r, 0);
        step(g); src.triggerSlot(0);
        for (let i = 0; i < 5; i++) step(g);
        expect(r.log.length).toBe(1);
    });

    test('Timer ticks in ALWAYS mode', () => {
        const g = setup(preset);
        const t = make(g, 'events/timer', { interval: 100 });
        const r = make(g, 'evm/recNoExec');
        t.connect(0, r, 0);
        g.last_update_time = clock;
        for (let i = 0; i < 25; i++) step(g, 10);
        expect(r.log.length).toBe(TIMER_TICKS); // characterization
    });

    test('Counter counts actions', () => {
        const g = setup(preset);
        const src = make(g, 'evm/src');
        const c = make(g, 'events/counter');
        src.connect(0, c, 0);
        step(g);
        src.triggerSlot(0); src.triggerSlot(0);
        step(g);
        expect(c.num).toBe(2);
    });

    known('A3')('A3/B3: an action does not re-run a stateful ALWAYS ancestor', () => {
        const g = setup(preset);
        const src = make(g, 'evm/src');
        const c = make(g, 'events/counter', { doCountExecution: true });
        const r = make(g, 'evm/rec');
        src.connect(0, r, 0); c.connect(1, r, 1);
        step(g);
        const before = c.num;
        src.triggerSlot(0); src.triggerSlot(0);
        expect(c.num).toBe(before);
    });

    test('logic/IF branches on its condition when triggered', () => {
        const g = setup(preset);
        const src = make(g, 'evm/src');
        const cond = make(g, 'basic/boolean', { value: true });
        const iff = make(g, 'logic/IF');
        const yes = make(g, 'evm/recNoExec');
        const no = make(g, 'evm/recNoExec');
        src.connect(0, iff, 0); cond.connect(0, iff, 1); iff.connect(0, yes, 0); iff.connect(1, no, 0);
        step(g);
        src.triggerSlot(0);
        step(g);
        expect([yes.log.length, no.log.length]).toEqual([1, 0]);
    });

    test('B14: logic/IF in ALWAYS mode does not fire every step', () => {
        const g = setup(preset);
        const iff = make(g, 'logic/IF', {}, LiteGraph.ALWAYS);
        const no = make(g, 'evm/recNoExec');
        iff.connect(1, no, 0);
        for (let i = 0; i < 3; i++) step(g);
        expect(no.log.length).toBeLessThanOrEqual(1); // once for the first condition, then on changes
    });

    test('events/branch reads its condition at action time', () => {
        const g = setup(preset);
        const src = make(g, 'evm/src');
        const cond = make(g, 'basic/boolean', { value: false });
        const br = make(g, 'events/branch');
        const yes = make(g, 'evm/recNoExec');
        const no = make(g, 'evm/recNoExec');
        src.connect(0, br, 0); cond.connect(0, br, 1); br.connect(0, yes, 0); br.connect(1, no, 0);
        step(g);
        src.triggerSlot(0);
        step(g);
        expect([yes.log.length, no.log.length]).toEqual([0, 1]);
    });

    test('WaitAll fires once both inputs arrived', () => {
        const g = setup(preset);
        const a = make(g, 'evm/src');
        const b = make(g, 'evm/src');
        const w = make(g, 'events/waitAll');
        const r = make(g, 'evm/recNoExec');
        a.connect(0, w, 0); b.connect(0, w, 1); w.connect(0, r, 0);
        step(g);
        a.triggerSlot(0); step(g);
        expect(r.log.length).toBe(0);
        b.triggerSlot(0, 'last'); step(g);
        expect(r.log.length).toBe(1);
    });

    test('B15: WaitAll forwards the payload of the completing event', () => {
        const g = setup(preset);
        const a = make(g, 'evm/src');
        const b = make(g, 'evm/src');
        const w = make(g, 'events/waitAll');
        const r = make(g, 'evm/recNoExec');
        a.connect(0, w, 0); b.connect(0, w, 1); w.connect(0, r, 0);
        a.triggerSlot(0, 'first'); b.triggerSlot(0, 'last');
        step(g);
        expect(r.params).toEqual(['last']);
    });

    test('Stepper triggers its outputs in turn', () => {
        const g = setup(preset);
        const src = make(g, 'evm/src');
        const s = make(g, 'events/stepper');
        const outs = [make(g, 'evm/recNoExec'), make(g, 'evm/recNoExec'), make(g, 'evm/recNoExec')];
        src.connect(0, s, 1);
        outs.forEach((r, i) => s.connect(i + 1, r, 0));
        step(g);
        for (let i = 0; i < 4; i++) { src.triggerSlot(0); step(g); }
        expect(outs.map((r) => r.log.length)).toEqual([2, 1, 1]);
    });

    test('B14: Switch in ALWAYS mode does not fire every step', () => {
        const g = setup(preset);
        const sw = make(g, 'events/switch');
        const r = make(g, 'evm/recNoExec');
        sw.connect(0, r, 0);
        for (let i = 0; i < 3; i++) step(g);
        expect(r.log.length).toBeLessThanOrEqual(1);
    });

    known('B6')('B6: a subgraph node in ON_EVENT mode delivers inner actions', () => {
        const g = setup(preset);
        const sg = make(g, 'graph/subgraph');
        const gi = LiteGraph.createNode('graph/input');
        sg.subgraph.add(gi);
        gi.setProperty('name', 'go'); gi.setProperty('type', 'action');
        const r = LiteGraph.createNode('evm/rec');
        sg.subgraph.add(r);
        gi.connect(0, r, 0);
        sg.mode = LiteGraph.ON_EVENT;
        const src = make(g, 'evm/src');
        src.connect(0, sg, sg.findInputSlot('go'));
        step(g);
        src.triggerSlot(0);
        for (let i = 0; i < 3; i++) step(g);
        expect(r.log.length).toBe(1);
    });

    known('A1')('A1: an ALWAYS consumer sees the value of an ON_REQUEST producer', () => {
        const g = setup(preset);
        const c = make(g, 'basic/const', { value: 5 });
        const p = make(g, 'evm/pure', {}, LiteGraph.ON_REQUEST);
        const s = make(g, 'evm/sink');
        c.connect(0, p, 0); p.connect(0, s, 0);
        for (let i = 0; i < 3; i++) step(g);
        expect(s.seen).toEqual([6, 6, 6]);
    });

    known('A2')('A2: two consumers pulling one ON_REQUEST node run it once per frame', () => {
        const g = setup(preset);
        const c = make(g, 'basic/const', { value: 1 });
        const p = make(g, 'evm/pure', {}, LiteGraph.ON_REQUEST);
        const s1 = make(g, 'evm/pullsink');
        const s2 = make(g, 'evm/pullsink');
        c.connect(0, p, 0); p.connect(0, s1, 0); p.connect(0, s2, 0);
        step(g);
        expect(p.runs).toBe(1);
    });

    test('A4: an event emitter in ON_REQUEST mode never fires', () => {
        const g = setup(preset);
        const c = make(g, 'basic/const', { value: 1 });
        const t = make(g, 'events/trigger', { only_on_change: false }, LiteGraph.ON_REQUEST);
        const r = make(g, 'evm/rec');
        const s = make(g, 'evm/pullsink');
        c.connect(0, t, 0); t.connect(0, r, 0); c.connect(0, s, 0);
        step(g); step(g);
        expect(r.log.length).toBe(0);
    });

    test('B9: an action that throws outside a step reports node-error', () => {
        LiteGraph.throw_errors = true;
        const g = setup(preset);
        LiteGraph.use_deferred_actions = false;
        const errors = [];
        g.events.on('node-error', (e) => errors.push(e.detail.path));
        const src = make(g, 'evm/src');
        const b = make(g, 'evm/boom');
        src.connect(0, b, 0);
        expect(() => src.triggerSlot(0)).toThrow('boom');
        expect(errors).toEqual([b.getPath()]);
        expect(b.execution_state?.status).toBe('error');
    });

    test('B10: onStart reaches every node that is not NEVER or BYPASS', () => {
        const g = setup(preset);
        const { ALWAYS, ON_EVENT, NEVER, ON_TRIGGER, BYPASS, ON_REQUEST } = LiteGraph;
        for (const mode of [ALWAYS, ON_EVENT, NEVER, ON_TRIGGER, BYPASS, ON_REQUEST]) make(g, 'evm/starter', {}, mode);
        g.start(1000); g.stop();
        expect(LiteGraph.registered_node_types['evm/starter'].seen.sort()).toEqual([ALWAYS, ON_EVENT, ON_TRIGGER, ON_REQUEST].sort());
    });

    test('B12: a deferred action sent while stopped waits in the queue', () => {
        const g = setup(preset);
        const src = make(g, 'evm/src');
        const r = make(g, 'evm/rec');
        src.connect(0, r, 0);
        src.triggerSlot(0);
        if (deferred) { expect(r.log.length).toBe(0); expect(r._waiting_actions.length).toBe(1); }
        else expect(r.log.length).toBe(1);
    });

    test('B13: an inner graph shares its parent timing', () => {
        const g = setup(preset);
        const sg = make(g, 'graph/subgraph');
        g.start(1000); g.stop();
        expect(sg.subgraph.starttime).toBe(g.starttime);
    });
});

describe('reporting and flag-independent fixes', () => {
    test('B9: an event error inside a subgraph is reported once on the root, with the inner path', () => {
        const g = setup('event_based');
        const errors = [];
        g.events.on('node-error', (e) => errors.push(e.detail.path));
        const sg = make(g, 'graph/subgraph');
        const gi = LiteGraph.createNode('graph/input');
        sg.subgraph.add(gi);
        gi.setProperty('name', 'go'); gi.setProperty('type', 'action');
        const boom = LiteGraph.createNode('evm/boom');
        sg.subgraph.add(boom);
        gi.connect(0, boom, 0);
        const src = make(g, 'evm/src');
        src.connect(0, sg, sg.findInputSlot('go'));
        expect(() => src.triggerSlot(0)).toThrow('boom');
        expect(errors).toEqual([boom.getPath()]);
        expect(boom.execution_state?.status).toBe('error');
        expect(LiteGraph._dispatch_depth).toBe(0);
    });

    test('B9: an error inside a step is reported once', () => {
        const g = setup('event_based');
        LiteGraph.throw_errors = false;
        const errors = [];
        g.events.on('node-error', (e) => errors.push(e.detail.path));
        const timer = make(g, 'events/timer');
        const boom = make(g, 'evm/boom');
        timer.connect(0, boom, 0);
        g.runStep(1);
        expect(errors).toEqual([boom.getPath()]);
        expect(LiteGraph._dispatch_depth).toBe(0);
    });

    test('B16: the unused allowMultiOutputForEvents flag is gone and a forced pull does not warn', () => {
        expect('allowMultiOutputForEvents' in LiteGraph).toBe(false);
        const warn = jest.spyOn(LiteGraph, 'log_warn');
        const g = setup('defaults');
        const c = make(g, 'basic/const', { value: 2 });
        const s = make(g, 'evm/pullsink');
        c.connect(0, s, 0);
        step(g);
        expect(s.seen).toEqual([2]);
        expect(warn).not.toHaveBeenCalled();
    });
});
