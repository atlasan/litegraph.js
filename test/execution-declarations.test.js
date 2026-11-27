// Declaration pass (flows track, part B): the execution needs of the node types the event flows
// audit (§2) found undeclared. pure → ON_REQUEST for new nodes under "ancestors"; ticks → advanced
// by the step loop only, never by a pull; ON_EVENT default for event-only nodes. Since flows step 4
// (FLW-02) time and randomness readers are declared volatile (pure, memoized per call scope); the
// other volatile nodes (outside state, scripts, widgets) stay undeclared, so ALWAYS.
import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import '../src/nodes/base.js';
import '../src/nodes/events.js';
import '../src/nodes/logic.js';
import '../src/nodes/math.js';
import '../src/nodes/math3d.js';
import '../src/nodes/interface.js';
import '../src/nodes/objects.js';

const PURE = [
    'basic/const', 'basic/boolean', 'basic/string', 'basic/data', 'basic/array', 'basic/length', 'basic/not',
    'logic/sequence', 'math/noise',
    'math3d/vec3-scale', 'math3d/vec3-length', 'math3d/vec3-normalize', 'math3d/vec3-lerp', 'math3d/vec3-dot', 'math3d/operation',
];
const TICKS = ['math/average', 'math/tendTo', 'math/spikes', 'math/accumulate'];
const ON_EVENT = ['events/once', 'events/waitAll', 'events/filter', 'events/log', 'basic/alert'];
const DECLARED_VOLATILE = ['basic/time', 'math/rand', 'math/formula'];
const VOLATILE = [
    'basic/variable', 'basic/object', 'basic/script', 'objects/evaluate',
    'widget/button', 'widget/toggle', 'widget/number', 'widget/combo', 'widget/knob', 'widget/hslider', 'widget/internal_slider',
];
// stateful or side effects: they keep their ALWAYS behaviour (a mode change would stop them)
const STATEFUL = ['basic/set_array', 'basic/array_append', 'objects/set_property', 'objects/merge_objects', 'events/counter', 'basic/data_store'];

let clock;
beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
});
beforeEach(() => {
    clock = 1000;
    jest.spyOn(LiteGraph, 'getTime').mockImplementation(() => clock);
    for (const level of ['info', 'debug', 'log', 'warn']) jest.spyOn(console, level).mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const decl = (type) => LiteGraph.getNodeDefinition(type)?.execution;
function graph(model = 'ancestors') { const g = new LGraph(); g.setExecutionModel?.(model); g.config.execution = model; return g; }
function make(g, type, props = {}, mode) { const n = LiteGraph.createNode(type); Object.assign(n.properties, props); if (mode !== undefined) n.mode = mode; g.add(n); return n; }

describe('declarations', () => {
    test('pure types', () => {
        for (const type of PURE) expect([type, decl(type)?.pure]).toEqual([type, true]);
    });
    test('ticking types', () => {
        for (const type of TICKS) expect([type, decl(type)?.ticks, decl(type)?.pure]).toEqual([type, true, false]);
    });
    test('event-only types default to ON_EVENT outside legacy', () => {
        for (const type of ON_EVENT) expect([type, decl(type)?.default_mode]).toEqual([type, LiteGraph.ON_EVENT]);
    });
    test('time and randomness readers are declared volatile (flows step 4)', () => {
        for (const type of DECLARED_VOLATILE) expect([type, decl(type)?.pure, decl(type)?.volatile]).toEqual([type, true, true]);
    });
    test('the other volatile and stateful types stay undeclared (ALWAYS everywhere)', () => {
        for (const type of [...VOLATILE, ...STATEFUL]) expect([type, decl(type)]).toEqual([type, null]);
    });
});

describe('effect on new nodes', () => {
    test('under ancestors: pure and declared volatile → On Request, event-only → On Event, ticking and undeclared → Always', () => {
        const g = graph('ancestors');
        expect(make(g, 'basic/const').mode).toBe(LiteGraph.ON_REQUEST);
        expect(make(g, 'events/once').mode).toBe(LiteGraph.ON_EVENT);
        expect(make(g, 'math/average').mode).toBe(LiteGraph.ALWAYS);
        expect(make(g, 'math/rand').mode).toBe(LiteGraph.ON_REQUEST);
        expect(make(g, 'objects/evaluate').mode).toBe(LiteGraph.ALWAYS);
    });
    test('under legacy nothing changes: every new node starts Always', () => {
        const g = graph('legacy');
        for (const type of ['basic/const', 'events/once', 'math/average']) expect([type, make(g, type).mode]).toEqual([type, LiteGraph.ALWAYS]);
    });
    test('under step (no refresh): pure keeps Always; event-only gets On Event', () => {
        const g = graph('step');
        expect(make(g, 'basic/const').mode).toBe(LiteGraph.ALWAYS);
        expect(make(g, 'events/once').mode).toBe(LiteGraph.ON_EVENT);
    });
});

describe('behaviour (changed results, with the reason)', () => {
    // reason: a ticking node advances once per step. Before the declaration, a forced pull
    // (getInputData(slot, true)) from an event outside the step re-ran it in the new call scope,
    // so the accumulator counted once more per event (models without the ancestors refresh).
    test('a forced pull from an event does not advance math/accumulate (event model)', () => {
        const g = graph('event');
        class Src { constructor() { this.addOutput('go', LiteGraph.EVENT); } }
        class Reader { constructor() { this.addInput('in', LiteGraph.ACTION); this.addInput('v', 'number'); this.seen = []; } onAction() { this.seen.push(this.getInputData(1, true)); } }
        LiteGraph.registerNodeType('decl/src', Src);
        LiteGraph.registerNodeType('decl/reader', Reader);
        const src = make(g, 'decl/src');
        const acc = make(g, 'math/accumulate', { increment: 1, value: 0 });
        const reader = make(g, 'decl/reader');
        src.connect(0, reader, 0);
        acc.connect(0, reader, 1);
        clock += 10; g.runStep(1);
        src.triggerSlot(0);
        src.triggerSlot(0);
        expect(acc.properties.value).toBe(1); // advanced by the step only
        expect(reader.seen).toEqual([1, 1]);
    });

    // reason: pure nodes run when needed; the ALWAYS consumer still sees the value every frame
    test('a new basic/const feeding a watch is pulled every frame under ancestors', () => {
        const g = graph('ancestors');
        const c = make(g, 'basic/const', { value: 7 });
        const w = make(g, 'basic/watch');
        c.connect(0, w, 0);
        expect(c.mode).toBe(LiteGraph.ON_REQUEST);
        clock += 10; g.runStep(1);
        expect(w.value ?? w.getInputData(0)).toBe(7);
        expect(g.checkExecution().issues).toEqual([]);
    });

    test('an old document with a const saved in ALWAYS mode reports pure-always until the modes are applied', () => {
        const g = graph('ancestors');
        const c = make(g, 'basic/const', { value: 1 });
        c.mode = LiteGraph.ALWAYS; // as saved by an older editor
        const w = make(g, 'basic/watch');
        c.connect(0, w, 0);
        expect(g.checkExecution().issues.map((i) => i.code)).toEqual(['pure-always']);
        g.applyExecutionModelModes();
        expect(c.mode).toBe(LiteGraph.ON_REQUEST);
        expect(g.checkExecution().issues).toEqual([]);
    });
});
