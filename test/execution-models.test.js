// Execution models (Wave 6b, plan steps 7-11): where the model comes from, the ancestors
// semantics, subgraph boundaries, event-dropped reasons, and the strict and event models.
import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { ComfyInterop } from '../src/extensions/comfy_interop.js';
import '../src/nodes/base.js';
import '../src/nodes/events.js';
import '../src/nodes/logic.js';
import '../src/nodes/math.js';

let clock;
let flagValues;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    flagValues = { ...LiteGraph._legacy_flag_values };
    class Src { constructor() { this.addOutput('go', LiteGraph.EVENT); } onExecute() {} }
    class Pure { constructor() { this.addInput('a', 'number'); this.addOutput('o', 'number'); this.runs = 0; this.params = []; } onExecute(param) { this.runs++; this.params.push(param); this.setOutputData(0, (this.getInputData(0) ?? 0) + 1); } }
    class Sink { constructor() { this.addInput('v', 'number'); this.seen = []; } onExecute() { this.seen.push(this.getInputData(0)); } }
    class PullSink { constructor() { this.addInput('v', 'number'); this.seen = []; } onExecute() { this.seen.push(this.getInputData(0, true, true)); } }
    class Rec { constructor() { this.addInput('in', LiteGraph.ACTION); this.addInput('v', 0); this.addInput('w', 0); this.log = []; } onExecute() {} onAction() { this.log.push([this.getInputData(1), this.getInputData(2)]); } }
    class Plain { constructor() { this.addInput('in', LiteGraph.ACTION); } }
    class Loop { constructor() { this.addInput('in', LiteGraph.ACTION); this.addInput('back', LiteGraph.ACTION); this.addOutput('out', LiteGraph.EVENT); this.n = 0; } onExecute() {} onAction() { this.n++; this.triggerSlot(0); } }
    class Reenter { constructor() { this.runs = 0; } onExecute() { this.runs++; this.doExecute(); } }
    class Trig { constructor() { this.addInput('onTrigger', LiteGraph.ACTION); this.runs = 0; } onExecute() { this.runs++; } }
    class Emitter { constructor() { this.addInput('a', 'number'); this.addOutput('ev', LiteGraph.EVENT); this.addOutput('o', 'number'); } onExecute() { this.triggerSlot(0); this.setOutputData(1, 1); } }
    for (const [name, cls] of Object.entries({ src: Src, pure: Pure, sink: Sink, pullsink: PullSink, rec: Rec, plain: Plain, loop: Loop, reenter: Reenter, trig: Trig, emitter: Emitter })) {
        LiteGraph.registerNodeType(`exm/${name}`, cls);
    }
});
beforeEach(() => {
    clock = 1000;
    jest.spyOn(LiteGraph, 'getTime').mockImplementation(() => clock);
    for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {});
    jest.spyOn(LiteGraph, 'log_warn').mockImplementation(() => {});
    // a project that assigned no legacy flag and no default model
    LiteGraph._legacy_flags_assigned.clear();
    LiteGraph._default_execution_model_set = false;
    LiteGraph._default_execution_model = 'ancestors';
});
afterEach(() => {
    Object.assign(LiteGraph._legacy_flag_values, flagValues);
    jest.restoreAllMocks();
});

function graph(model) {
    const g = new LGraph();
    if (model) g.config.execution = model;
    return g;
}
function make(g, type, props = {}, mode) {
    const node = LiteGraph.createNode(type);
    Object.assign(node.properties, props);
    if (mode !== undefined) node.mode = mode;
    g.add(node);
    return node;
}
function step(g, ms = 10) { clock += ms; g.runStep(1); }
const innerBack = (loop) => loop.graph._nodes.find((n) => n.type === 'exm/loop' && n !== loop);
function dropped(g) {
    const events = [];
    g.events.on('event-dropped', (e) => events.push(e.detail));
    return events;
}

describe('where the model comes from (step 7)', () => {
    test('new LGraph() runs under ancestors and saves it', () => {
        const g = graph();
        expect(LiteGraph.default_execution_model).toBe('ancestors');
        expect(g.executionModel).toBe('ancestors');
        expect(g.serialize().config.execution).toBe('ancestors');
        expect(new LGraph(g.serialize()).executionModel).toBe('ancestors');
    });

    test('a document without the field loads as legacy and saves without it', () => {
        const doc = graph().serialize();
        delete doc.config.execution;
        const g = new LGraph(doc);
        expect(g.executionModel).toBe('legacy');
        expect(g.serialize().config.execution).toBeUndefined();
        g.clear(); // a new document again
        expect(g.executionModel).toBe('ancestors');
    });

    test('assigning a legacy flag makes the default resolve to legacy', () => {
        LiteGraph.use_deferred_actions = true; // same value, still an assignment
        expect(LiteGraph.default_execution_model).toBe('legacy');
        expect(graph().executionModel).toBe('legacy');
        expect(graph().serialize().config.execution).toBe('legacy');
        LiteGraph.default_execution_model = 'ancestors'; // an explicit default wins
        expect(graph().executionModel).toBe('ancestors');
    });

    test('LiteGraph.default_execution_model = "legacy" opts out', () => {
        LiteGraph.default_execution_model = 'legacy';
        expect(graph().executionModel).toBe('legacy');
    });

    test('the model survives save/load and the Comfy round trip; inner graphs use the root model', () => {
        const g = graph('strict');
        const sg = make(g, 'graph/subgraph');
        expect(sg.subgraph.executionModel).toBe('strict');
        expect(new LGraph(g.serialize()).executionModel).toBe('strict');
        const comfy = JSON.parse(JSON.stringify(ComfyInterop.exportWorkflow(g)));
        expect(comfy.config.execution).toBe('strict');
        const again = new LGraph();
        ComfyInterop.importWorkflow(again, comfy);
        expect(again.executionModel).toBe('strict');
    });

    test('an unknown model name runs as legacy; setExecutionModel refuses it', () => {
        const g = graph('future-model');
        expect(g.executionModel).toBe('legacy');
        expect(() => g.setExecutionModel('nope')).toThrow(/unknown execution model "nope"; known: legacy, ancestors, step, strict, event/);
    });

    test('setExecutionModel is one undo step', () => {
        LiteGraph.actionHistory_enabled = true;
        try {
            const g = graph('step');
            make(g, 'basic/const'); // the first saved change becomes the first history entry
            g.setExecutionModel('event');
            expect(g.executionModel).toBe('event');
            g.actionHistoryBack();
            expect(g.executionModel).toBe('step');
            g.actionHistoryForward();
            expect(g.executionModel).toBe('event');
        } finally {
            LiteGraph.actionHistory_enabled = false;
        }
    });

    test('registerExecutionModel adds a model; legacy cannot be replaced', () => {
        LiteGraph.registerExecutionModel('test-push', { delivery: 'immediate' });
        expect(LiteGraph.listExecutionModels().map((m) => m.name)).toContain('test-push');
        expect(graph('test-push').getExecutionRules().delivery).toBe('immediate');
        expect(() => LiteGraph.registerExecutionModel('legacy', {})).toThrow(/built in/);
        expect(() => LiteGraph.registerExecutionModel('bad', { delivery: 'later' })).toThrow(/delivery/);
        LiteGraph.ExecutionEngine.models.delete('test-push');
    });
});

describe('ancestors semantics (step 8)', () => {
    test('A1: an ALWAYS consumer sees an ON_REQUEST producer\'s value every frame', () => {
        const g = graph('ancestors');
        const c = make(g, 'basic/const', { value: 5 });
        const p = make(g, 'exm/pure', {}, LiteGraph.ON_REQUEST);
        const s = make(g, 'exm/sink');
        c.connect(0, p, 0); p.connect(0, s, 0);
        for (let i = 0; i < 3; i++) step(g);
        expect(s.seen).toEqual([6, 6, 6]);
        expect(p.runs).toBe(3);
        expect(p.params).toEqual([undefined, undefined, undefined]); // A6: no fake param
    });

    test('A2: two consumers pulling one ON_REQUEST node run it once per frame', () => {
        const g = graph('ancestors');
        const c = make(g, 'basic/const', { value: 1 });
        const p = make(g, 'exm/pure', {}, LiteGraph.ON_REQUEST);
        const s1 = make(g, 'exm/pullsink');
        const s2 = make(g, 'exm/pullsink');
        c.connect(0, p, 0); p.connect(0, s1, 0); p.connect(0, s2, 0);
        step(g);
        expect(p.runs).toBe(1);
        step(g);
        expect(p.runs).toBe(2);
        expect([s1.seen, s2.seen]).toEqual([[2, 2], [2, 2]]);
    });

    test('A3: actions do not advance a counter or a timer upstream', () => {
        const g = graph('ancestors');
        const src = make(g, 'exm/src');
        const counter = make(g, 'events/counter', { doCountExecution: true });
        const timer = make(g, 'events/timer', { interval: 1 });
        const rec = make(g, 'exm/rec');
        src.connect(0, rec, 0); counter.connect(1, rec, 1); timer.connect(0, counter, 0);
        step(g);
        const before = [counter.num, timer.time];
        src.triggerSlot(0); src.triggerSlot(0);
        expect([counter.num, timer.time]).toEqual(before);
        expect(rec.log).toHaveLength(2);
    });

    test('A5: FOR through an ON_REQUEST node gives [0,1,2]; only changed nodes re-run', () => {
        const g = graph('ancestors');
        const src = make(g, 'exm/src');
        const start = make(g, 'basic/const', { value: 0 });
        const n = make(g, 'basic/const', { value: 3 });
        const f = make(g, 'logic/CycleFOR');
        const byIndex = make(g, 'exm/pure', {}, LiteGraph.ON_REQUEST);
        const constant = make(g, 'exm/pure', {}, LiteGraph.ON_REQUEST);
        const ten = make(g, 'basic/const', { value: 10 });
        const rec = make(g, 'exm/rec');
        start.connect(0, f, 0); n.connect(0, f, 1); src.connect(0, f, 2);
        f.connect(0, rec, 0); f.connect(1, byIndex, 0); byIndex.connect(0, rec, 1);
        ten.connect(0, constant, 0); constant.connect(0, rec, 2);
        step(g);
        byIndex.runs = 0; constant.runs = 0;
        src.triggerSlot(0);
        expect(rec.log).toEqual([[1, 11], [2, 11], [3, 11]]);
        expect(byIndex.runs).toBe(3); // its input changed every iteration
        expect(constant.runs).toBe(1); // once for the call
    });

    test('an ON_REQUEST chain is pulled in order before an action', () => {
        const g = graph('ancestors');
        const src = make(g, 'exm/src');
        const c = make(g, 'basic/const', { value: 1 });
        const a = make(g, 'exm/pure', {}, LiteGraph.ON_REQUEST);
        const b = make(g, 'exm/pure', {}, LiteGraph.ON_REQUEST);
        const rec = make(g, 'exm/rec');
        c.connect(0, a, 0); a.connect(0, b, 0); b.connect(0, rec, 1); src.connect(0, rec, 0);
        step(g); // the const (ALWAYS) runs in steps only
        a.runs = 0; b.runs = 0;
        src.triggerSlot(0);
        expect(rec.log).toEqual([[3, null]]);
        expect([a.runs, b.runs]).toEqual([1, 1]); // a new call: pulled once each
    });
});

describe('subgraph and function boundaries (step 9)', () => {
    function innerLoop(model, mode) {
        const g = graph(model);
        const sg = make(g, 'graph/subgraph');
        const gi = LiteGraph.createNode('graph/input');
        sg.subgraph.add(gi);
        gi.setProperty('name', 'go'); gi.setProperty('type', 'action');
        const loop = LiteGraph.createNode('exm/loop');
        const back = LiteGraph.createNode('exm/loop');
        sg.subgraph.add(loop); sg.subgraph.add(back);
        gi.connect(0, loop, 0); loop.connect(0, back, 0); back.connect(0, loop, 1);
        sg.mode = mode;
        const src = make(g, 'exm/src');
        src.connect(0, sg, sg.findInputSlot('go'));
        return { g, sg, src, loop };
    }

    test('B6: a subgraph node in ON_EVENT mode delivers inner actions (deferred model)', () => {
        const g = graph('step');
        const sg = make(g, 'graph/subgraph');
        const gi = LiteGraph.createNode('graph/input');
        sg.subgraph.add(gi);
        gi.setProperty('name', 'go'); gi.setProperty('type', 'action');
        const rec = LiteGraph.createNode('exm/rec');
        sg.subgraph.add(rec);
        gi.connect(0, rec, 0);
        sg.mode = LiteGraph.ON_EVENT;
        const src = make(g, 'exm/src');
        src.connect(0, sg, sg.findInputSlot('go'));
        src.triggerSlot(0); // queued for the subgraph node's turn (step model)
        step(g);
        expect(rec.log).toHaveLength(1);
    });

    test('reaching MaxEventPasses emits event-dropped max-passes naming the setting', () => {
        const { g, src, loop } = innerLoop('step', LiteGraph.ON_EVENT);
        const events = dropped(g);
        src.triggerSlot(0);
        step(g);
        expect(loop.n + innerBack(loop).n).toBe(LiteGraph.settings.get('LiteGraph.Execution.MaxEventPasses'));
        const drop = events.find((e) => e.reason === 'max-passes');
        expect(drop.setting).toBe('LiteGraph.Execution.MaxEventPasses');
        expect(drop.message).toMatch(/LiteGraph\.Execution\.MaxEventPasses/);
    });

    test('an inner action reads fresh interface data in an ON_EVENT subgraph node', () => {
        const g = graph('ancestors');
        const sg = make(g, 'graph/subgraph');
        const go = LiteGraph.createNode('graph/input');
        sg.subgraph.add(go);
        go.setProperty('name', 'go'); go.setProperty('type', 'action');
        const val = LiteGraph.createNode('graph/input');
        sg.subgraph.add(val);
        val.setProperty('name', 'val'); val.setProperty('type', 'number');
        const rec = LiteGraph.createNode('exm/rec');
        sg.subgraph.add(rec);
        go.connect(0, rec, 0); val.connect(0, rec, 1);
        sg.mode = LiteGraph.ON_EVENT;
        const c = make(g, 'basic/const', { value: 7 });
        const src = make(g, 'exm/src');
        c.connect(0, sg, sg.findInputSlot('val'));
        src.connect(0, sg, sg.findInputSlot('go'));
        step(g);
        src.triggerSlot(0);
        expect(rec.log).toEqual([[7, null]]);
    });
});

describe('event-dropped reasons (step 10)', () => {
    test('reentry', () => {
        const g = graph('ancestors');
        const events = dropped(g);
        const n = make(g, 'exm/reenter');
        step(g);
        expect(n.runs).toBe(1);
        expect(events.map((e) => [e.reason, e.path])).toEqual([['reentry', n.getPath()]]);
    });

    test('refreshing: an event emitter pulled as ON_REQUEST cannot fire', () => {
        const g = graph('ancestors');
        const events = dropped(g);
        const e = make(g, 'exm/emitter', {}, LiteGraph.ON_REQUEST);
        const sink = make(g, 'exm/sink');
        const plain = make(g, 'exm/plain');
        e.connect(1, sink, 0); e.connect(0, plain, 0);
        step(g);
        expect(sink.seen).toEqual([1]);
        expect(events.map((x) => x.reason)).toEqual(['refreshing']);
    });

    test('no-handler and mode', () => {
        const g = graph('ancestors');
        const events = dropped(g);
        const src = make(g, 'exm/src');
        const plain = make(g, 'basic/const');
        const never = make(g, 'exm/rec', {}, LiteGraph.NEVER);
        plain.addInput('in', LiteGraph.ACTION);
        src.connect(0, plain, 0); src.connect(0, never, 0);
        src.triggerSlot(0);
        expect(events.map((x) => x.reason).sort()).toEqual(['mode', 'no-handler']);
        expect(never.log).toEqual([]);
    });

    test('stopped-queue is reported once per node; stop({dropQueued}) clears it (B12)', () => {
        const g = graph('step');
        const events = dropped(g);
        const src = make(g, 'exm/src');
        const rec = make(g, 'exm/rec');
        src.connect(0, rec, 0);
        src.triggerSlot(0); src.triggerSlot(0);
        expect(rec._waiting_actions).toHaveLength(2);
        expect(events.map((x) => x.reason)).toEqual(['stopped-queue']);
        expect(events[0].message).toMatch(/dropQueued/);
        g.stop({ dropQueued: true });
        expect(rec._waiting_actions).toHaveLength(0);
    });

    test('max-depth names its setting', () => {
        const g = graph('ancestors');
        const events = dropped(g);
        const src = make(g, 'exm/src');
        const ping = make(g, 'exm/loop');
        const pong = make(g, 'exm/loop');
        src.connect(0, ping, 0); ping.connect(0, pong, 0); pong.connect(0, ping, 1);
        src.triggerSlot(0);
        expect(ping.n + pong.n).toBe(LiteGraph.settings.get('LiteGraph.Execution.MaxEventDepth'));
        const drop = events.find((e) => e.reason === 'max-depth');
        expect(drop.setting).toBe('LiteGraph.Execution.MaxEventDepth');
    });

    test('cycle: an ON_REQUEST loop is pulled once and reported', () => {
        const g = graph('ancestors');
        const events = dropped(g);
        const a = make(g, 'exm/pure', {}, LiteGraph.ON_REQUEST);
        const b = make(g, 'exm/pure', {}, LiteGraph.ON_REQUEST);
        const sink = make(g, 'exm/sink');
        a.connect(0, b, 0); b.connect(0, a, 0); b.connect(0, sink, 0);
        step(g);
        expect(events.map((x) => x.reason)).toContain('cycle');
        expect(sink.seen).toHaveLength(1);
    });

    test('nothing is dispatched when no one listens', () => {
        const g = graph('ancestors');
        const spy = jest.spyOn(g, '_emit');
        const src = make(g, 'exm/src');
        const plain = make(g, 'exm/plain', {}, LiteGraph.NEVER);
        src.connect(0, plain, 0);
        src.triggerSlot(0);
        expect(spy.mock.calls.filter(([type]) => type === 'event-dropped')).toEqual([]);
    });
});

describe('strict and event models (step 11)', () => {
    test('strict: a node triggered twice in one frame runs once and reports once-per-frame', () => {
        const g = graph('strict');
        const events = dropped(g);
        const src = make(g, 'exm/src');
        const t = make(g, 'exm/trig', {}, LiteGraph.ON_TRIGGER);
        src.connect(0, t, 0);
        step(g);
        src.triggerSlot(0); src.triggerSlot(0);
        expect(t.runs).toBe(1);
        expect(events.map((x) => x.reason)).toEqual(['once-per-frame']);
        step(g);
        src.triggerSlot(0);
        expect(t.runs).toBe(2);
    });

    test('event: delivers immediately without a refresh', () => {
        const g = graph('event');
        const src = make(g, 'exm/src');
        const c = make(g, 'basic/const', { value: 1 });
        const p = make(g, 'exm/pure', {}, LiteGraph.ON_REQUEST);
        const rec = make(g, 'exm/rec');
        c.connect(0, p, 0); p.connect(0, rec, 1); src.connect(0, rec, 0);
        step(g);
        src.triggerSlot(0);
        expect(rec.log).toEqual([[undefined, null]]);
        expect(p.runs).toBe(0);
    });

    test('step: an action waits for the node\'s turn', () => {
        const g = graph('step');
        const src = make(g, 'exm/src');
        const rec = make(g, 'exm/rec');
        src.connect(0, rec, 0);
        src.triggerSlot(0);
        expect(rec.log).toHaveLength(0);
        step(g);
        expect(rec.log).toHaveLength(1);
    });

    test('errors in event chains follow LiteGraph.throw_errors outside legacy (decision 5)', () => {
        const g = graph('event');
        const errors = [];
        g.events.on('node-error', (e) => errors.push(e.detail.path));
        class Boom { constructor() { this.addInput('in', LiteGraph.ACTION); } onAction() { throw new Error('boom'); } }
        LiteGraph.registerNodeType('exm/boom', Boom);
        const src = make(g, 'exm/src');
        const b = make(g, 'exm/boom');
        src.connect(0, b, 0);
        const throwErrors = LiteGraph.throw_errors;
        try {
            LiteGraph.throw_errors = false;
            expect(() => src.triggerSlot(0)).not.toThrow();
            LiteGraph.throw_errors = true;
            expect(() => src.triggerSlot(0)).toThrow('boom');
        } finally {
            LiteGraph.throw_errors = throwErrors;
        }
        expect(errors).toEqual([b.getPath(), b.getPath()]);
    });
});

describe('legacy refusals are reported too (step 10)', () => {
    test('stopped-queue, mode and no-handler under legacy flags, behaviour unchanged', () => {
        LiteGraph.use_deferred_actions = true;
        const g = graph();
        expect(g.executionModel).toBe('legacy');
        const events = dropped(g);
        const src = make(g, 'exm/src');
        const rec = make(g, 'exm/rec');
        const never = make(g, 'exm/rec', {}, LiteGraph.NEVER);
        const plain = make(g, 'basic/const');
        plain.addInput('in', LiteGraph.ACTION);
        src.connect(0, rec, 0); src.connect(0, never, 0); src.connect(0, plain, 0);
        src.triggerSlot(0);
        expect(rec._waiting_actions).toHaveLength(1);
        expect(events.map((x) => x.reason).sort()).toEqual(['mode', 'no-handler', 'stopped-queue']);
    });
});

describe('flow nodes under the models (step 13)', () => {
    test('FOR fires completed after its body; break stops it within the loop (step model)', () => {
        const g = graph('step');
        const src = make(g, 'exm/src');
        const n = make(g, 'basic/const', { value: 5 });
        const f = make(g, 'logic/CycleFOR');
        expect(f.mode).toBe(LiteGraph.ON_EVENT); // the declared default outside legacy
        const body = make(g, 'exm/loop'); // fires its output on every action
        const done = make(g, 'exm/rec');
        n.connect(0, f, 1); src.connect(0, f, 2);
        f.connect(0, body, 0); body.connect(0, f, 3); // body -> break after the first iteration
        f.connect(f.findOutputSlot('completed'), done, 0);
        step(g);
        src.triggerSlot(0);
        step(g); // FOR's "do" waits for its turn in the step model
        expect(body.n).toBe(1);
        expect(done.log).toHaveLength(1);
    });

    test('WHILE stopped by cycleLimit reports and names properties.cycleLimit', () => {
        const g = graph('ancestors');
        const events = dropped(g);
        const src = make(g, 'exm/src');
        const yes = make(g, 'basic/boolean', { value: true });
        const w = make(g, 'logic/CycleWHILE', { cycleLimit: 5 });
        const body = make(g, 'exm/rec');
        src.connect(0, w, 0); yes.connect(0, w, 1); w.connect(0, body, 0);
        step(g);
        src.triggerSlot(0);
        expect(body.log).toHaveLength(5);
        const drop = events.find((e) => e.node === w);
        expect(drop.setting).toBe('properties.cycleLimit');
        expect(drop.message).toMatch(/raise properties\.cycleLimit/);
    });

    test('DataStore stores the value on its input when the event arrives (B15)', () => {
        const g = graph('ancestors');
        const src = make(g, 'exm/src');
        const c = make(g, 'basic/const', { value: 1 });
        const p = make(g, 'exm/pure', {}, LiteGraph.ON_REQUEST);
        const store = make(g, 'basic/data_store');
        c.connect(0, p, 0); p.connect(0, store, 0); src.connect(0, store, 1);
        step(g);
        c.properties.value = 41; step(g); // the const's new value reaches the link
        src.triggerSlot(0);
        expect(store.properties.data).toBe(42);
    });
});

describe('checkExecution and the badge (step 14)', () => {
    test('reports an ON_REQUEST emitter, Delay in ON_EVENT and a ticks node in an ON_EVENT subgraph', () => {
        const g = graph('ancestors');
        const trig = make(g, 'events/trigger', {}, LiteGraph.ON_REQUEST);
        const rec = make(g, 'exm/rec');
        trig.connect(0, rec, 0);
        const delay = make(g, 'events/delay', {}, LiteGraph.ON_EVENT);
        const sg = make(g, 'graph/subgraph');
        sg.mode = LiteGraph.ON_EVENT;
        const timer = LiteGraph.createNode('events/timer');
        sg.subgraph.add(timer);
        const f = make(g, 'logic/CycleFOR');
        const report = g.checkExecution();
        const codes = (node) => report.issues.filter((i) => i.node === node).map((i) => i.code).sort();
        expect(report.model).toBe('ancestors');
        expect(codes(trig)).toEqual(['invalid-mode', 'on-request-emitter']);
        expect(codes(delay)).toEqual(['invalid-mode', 'ticks-not-stepped']);
        expect(codes(timer)).toEqual(['ticks-not-stepped']);
        expect(report.issues.find((i) => i.node === timer).path).toBe(timer.getPath());
        expect(codes(f)).toEqual(['loop-without-body']);
    });

    test('execution-check on root configure, and the badge behind LiteGraph.Node.ExecutionBadge', () => {
        const source = graph('ancestors');
        make(source, 'events/delay', {}, LiteGraph.ON_EVENT);
        const doc = source.serialize();
        const g = new LGraph();
        const reports = [];
        g.events.on('execution-check', (e) => reports.push(e.detail.report));
        g.configure(doc);
        expect(reports).toHaveLength(1);
        expect(reports[0].issues.map((i) => i.code)).toContain('ticks-not-stepped');
        const delay = g._nodes[0];
        expect(LiteGraph.nodeBadges.collect(delay).some((b) => b.text === '⚠ exec')).toBe(false);
        LiteGraph.settings.set('LiteGraph.Node.ExecutionBadge', true);
        try {
            const badge = LiteGraph.nodeBadges.collect(delay).find((b) => b.text === '⚠ exec');
            expect(badge.title).toMatch(/needs the step loop/);
        } finally {
            LiteGraph.settings.set('LiteGraph.Node.ExecutionBadge', false);
        }
    });
});

describe('graph info, reporting and runner parity (steps 15-17)', () => {
    test('switching the model is one undo step and applying its modes is another', () => {
        LiteGraph.actionHistory_enabled = true;
        try {
            const g = graph('legacy');
            const op = make(g, 'math/operation'); // legacy keeps ALWAYS; also the first history entry
            expect(op.mode).toBe(LiteGraph.ALWAYS);
            g.transact('switch model', () => g.setExecutionModel('ancestors'));
            expect(g.applyExecutionModelModes()).toBe(1);
            expect(g.getNodeById(op.id).mode).toBe(LiteGraph.ON_REQUEST);
            g.actionHistoryBack();
            expect([g.executionModel, g.getNodeById(op.id).mode]).toEqual(['ancestors', LiteGraph.ALWAYS]);
            g.actionHistoryBack();
            expect([g.executionModel, g.getNodeById(op.id).mode]).toEqual(['legacy', LiteGraph.ALWAYS]);
            expect(g.applyExecutionModelModes()).toBe(0); // legacy declares no defaults
        } finally {
            LiteGraph.actionHistory_enabled = false;
        }
    });

    test('nodes run by actions or pulls report running then done, once per change', () => {
        const g = graph('ancestors');
        const messages = [];
        g.events.on('execution-state', (e) => messages.push(e.detail.message));
        const src = make(g, 'exm/src');
        const c = make(g, 'basic/const', { value: 1 });
        const p = make(g, 'exm/pure', {}, LiteGraph.ON_REQUEST);
        const rec = make(g, 'exm/rec');
        c.connect(0, p, 0); p.connect(0, rec, 1); src.connect(0, rec, 0);
        src.triggerSlot(0); src.triggerSlot(0);
        const statuses = (node) => messages.filter((m) => m.path === node.getPath()).map((m) => m.status);
        expect(statuses(rec)).toEqual(['running', 'done']);
        expect(statuses(p)).toEqual(['running', 'done']);
        step(g); // its own step turn: ALWAYS nodes report done once, as before
        expect(statuses(c)).toEqual(['running', 'done']); // pulled for its first value, then stepped
        expect(statuses(rec)).toEqual(['running', 'done']);
    });

    test.each(['runner-parity-ancestors.json', 'runner-parity-legacy.json'])('runner parity fixture %s (in-process side)', async (name) => {
        const fs = await import('node:fs');
        const read = (file) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
        const expected = read('runner-parity.expected.json')[name];
        const g = new LGraph(read(name));
        expect(g.executionModel).toBe(expected.model);
        g.starttime = g.last_update_time = clock;
        for (let i = 0; i < 10; i++) step(g, 20);
        const data = (title) => g._nodes.find((n) => n.title === title).properties.data;
        expect({ 'FOR result': data('FOR result'), 'WHILE result': data('WHILE result') })
            .toEqual({ 'FOR result': expected['FOR result'], 'WHILE result': expected['WHILE result'] });
    });
});
