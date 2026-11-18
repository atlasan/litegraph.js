// Regression tests for node crashes found by the editor tester's invalid-input and
// property-change scenarios. Each node gets the inputs that used to throw.
import { jest } from '@jest/globals';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import '../src/nodes/base.js';
import '../src/nodes/strings.js';
import '../src/nodes/logic.js';
import '../src/nodes/math.js';
import '../src/nodes/graphics.js';
import '../src/nodes/geometry.js';
import '../src/nodes/html.js';
import '../src/nodes/audio.js';

const BAD_VALUES = [null, undefined, NaN, Infinity, -Infinity, {}, [], ''];

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    // math3d registers its nodes only when gl-matrix is present, as in the editor.
    // The UMD build attaches vec3/quat/... to `this`; bind it to this test realm's global.
    new Function(fs.readFileSync(new URL('../editor/js/libs/gl-matrix-min.js', import.meta.url), 'utf8')).call(globalThis);
    await import('../src/nodes/math3d.js');
});
beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

// Runs onExecute with fixed input values, the way the tester drives a node.
function runWith(node, values) {
    node.getInputData = (slot) => values[slot];
    node.onExecute();
    return node;
}
function outputsOf(node) {
    const out = [];
    node.setOutputData = (slot, value) => { out[slot] = value; };
    return out;
}

describe.each([
    ['basic/CompareValues', [0, 1]],
    ['string/contains', [0, 1]],
    ['string/toTable', [0]],
    ['logic/selector', [0]],
    ['color/palette', [0]],
    ['graphics/drawRectangle', [0]],
    ['geometry/connectPoints', [0]],
    ['math3d/quat_to_euler', [0]],
    ['math3d/mat4', [0, 1, 2]],
    ['math3d/remap_range', [0]],
    ['logic/sequence', [0, 1]],
    ['graphics/drawImage', [0, 1]],
])('%s tolerates invalid inputs', (type, slots) => {
    test.each([...BAD_VALUES, 'test', 42, true].map((v) => [String(v && typeof v === 'object' ? JSON.stringify(v) : v), v]))('input %s', (_label, value) => {
        const node = LiteGraph.createNode(type);
        expect(node).toBeTruthy();
        const values = [];
        for (const slot of slots) values[slot] = value;
        expect(() => runWith(node, values)).not.toThrow();
    });
});

test('logic/sequence accepts arrays and wraps its index into range', () => {
    const node = LiteGraph.createNode('logic/sequence');
    const out = outputsOf(node);
    runWith(node, [-1, 'A,B,C']);
    expect(out[0]).toBe('C');
    runWith(node, [1, ['x', 'y']]);
    expect(out[0]).toBe('y');
    runWith(node, [NaN, 42]);
    expect(out[0]).toBe('x');
});

test('math3d/quat_to_euler has one input named quat', () => {
    const node = LiteGraph.createNode('math3d/quat_to_euler');
    expect(node.inputs.map((i) => [i.name, i.type])).toEqual([['quat', 'quat']]);
});

test('CompareValues compares null against objects instead of throwing', () => {
    const node = LiteGraph.createNode('basic/CompareValues');
    const out = outputsOf(node);
    runWith(node, [null, {}]);
    expect(out).toEqual([false, true]);
    runWith(node, [null, null]);
    expect(out).toEqual([true, false]);
    runWith(node, [{ a: 1 }, { a: 1 }]);
    expect(out).toEqual([true, false]);
    // A null input persisted into properties must not break a later property change.
    node.properties.A = null;
    node.properties.B = 2;
    expect(() => runWith(node, [])).not.toThrow();
});

test('string/contains only matches strings', () => {
    const node = LiteGraph.createNode('string/contains');
    const out = outputsOf(node);
    runWith(node, ['litegraph', 'graph']);
    expect(out[0]).toBe(true);
    runWith(node, [null, 'graph']);
    expect(out[0]).toBe(false);
    runWith(node, ['abc123', 123]);
    expect(out[0]).toBe(true);
});

test('logic/selector wraps negative and non-finite selectors into range', () => {
    const node = LiteGraph.createNode('logic/selector');
    const out = outputsOf(node);
    runWith(node, [-1, 'A', 'B', 'C', 'D']);
    expect(node.selected).toBe(3);
    expect(out[0]).toBe('D');
    runWith(node, [Infinity, 'A', 'B', 'C', 'D']);
    expect(node.selected).toBe(0);
    expect(out[0]).toBe('A');
});

test('color/palette falls back to the midpoint for non-numeric input', () => {
    const node = LiteGraph.createNode('color/palette');
    const out = outputsOf(node);
    runWith(node, [{}]);
    const fromObject = [...out[0]];
    runWith(node, [0.5]);
    expect(fromObject).toEqual([...out[0]]);
    expect(fromObject.every(Number.isFinite)).toBe(true);
});

test('math/operation keeps working after OP is set to an unknown value', () => {
    const node = LiteGraph.createNode('math/operation');
    const out = outputsOf(node);
    node.setProperty('OP', '+_modified');
    expect(() => runWith(node, [3, 4])).not.toThrow();
    expect(out[0]).toBe(3);
    node.setProperty('OP', '*');
    runWith(node, [3, 4]);
    expect(out[0]).toBe(12);
});

describe('math3d euler/quat conversion', () => {
    let saved;
    beforeEach(() => {
        // quat.toEuler / quat.fromEuler come from litegl; stub them to pass values through.
        saved = { toEuler: quat.toEuler, fromEuler: quat.fromEuler };
        quat.toEuler = (out, q) => vec3.set(out, q[0], q[1], q[2]);
        quat.fromEuler = (out, v) => quat.set(out, v[0], v[1], v[2], 1);
    });
    afterEach(() => Object.assign(quat, saved));

    test('quat_to_euler outputs degrees instead of NaN', () => {
        const node = LiteGraph.createNode('math3d/quat_to_euler');
        const out = outputsOf(node);
        runWith(node, [[Math.PI / 2, 0, 0, 1]]);
        expect(out[0][0]).toBeCloseTo(90);
        expect(node.constructor.title).toBe('Quat->Euler');
    });

    test('euler_to_quat converts degree input to radians instead of NaN', () => {
        const node = LiteGraph.createNode('math3d/euler_to_quat');
        const out = outputsOf(node);
        runWith(node, [[180, 0, 0]]);
        expect(out[0][0]).toBeCloseTo(Math.PI);
    });

    test('both nodes skip silently when litegl is not loaded', () => {
        delete quat.toEuler;
        delete quat.fromEuler;
        for (const [type, input] of [['math3d/quat_to_euler', [0, 0, 0, 1]], ['math3d/euler_to_quat', [0, 0, 0]]]) {
            const node = LiteGraph.createNode(type);
            const out = outputsOf(node);
            expect(() => runWith(node, [input])).not.toThrow();
            expect(out).toEqual([]);
        }
    });
});

describe('html nodes with a DOM', () => {
    let dom;
    beforeEach(() => {
        dom = new JSDOM('<main><p class="x"></p></main>');
        globalThis.window = dom.window; globalThis.document = dom.window.document;
    });
    afterEach(() => { dom.window.close(); delete globalThis.window; delete globalThis.document; });

    test('dom_selector_all returns null for invalid selectors', () => {
        const node = LiteGraph.createNode('html/dom_selector_all');
        const out = outputsOf(node);
        for (const bad of [{}, [], 'p[', 42]) {
            expect(() => runWith(node, [bad])).not.toThrow();
            expect(out[0]).toBeNull();
        }
        runWith(node, ['.x']);
        expect(out[0]).toHaveLength(1);
    });

    test('event_listener ignores non-element inputs and runs in ON_TRIGGER mode', () => {
        const node = LiteGraph.createNode('html/event_listener');
        for (const bad of BAD_VALUES) expect(() => runWith(node, [bad])).not.toThrow();
        node.mode = LiteGraph.ON_TRIGGER;
        expect(() => runWith(node, [document.querySelector('p')])).not.toThrow();
    });
});

// Audio nodes need an AudioContext to construct, so these drive the registered
// classes' handlers against fake audio nodes.
describe('audio nodes guard AudioParam and AudioNode writes', () => {
    class FakeAudioParam { constructor(v = 0.5) { this.value = v; } }
    const proto = (type) => LiteGraph.registered_node_types[type].prototype;
    beforeEach(() => { globalThis.AudioParam = FakeAudioParam; });
    afterEach(() => { delete globalThis.AudioParam; });

    test('audio/gain ignores non-finite gain from inputs and properties', () => {
        const self = { audionode: { gain: new FakeAudioParam() } };
        for (const bad of [NaN, Infinity, -Infinity, {}, null, '1']) {
            expect(() => proto('audio/gain').onPropertyChanged.call(self, 'gain', bad)).not.toThrow();
        }
        expect(self.audionode.gain.value).toBe(0.5);
        proto('audio/gain').onPropertyChanged.call(self, 'gain', 0.8);
        expect(self.audionode.gain.value).toBe(0.8);

        self.inputs = [{ name: 'in', link: 1 }, { name: 'gain', link: 2 }];
        self.getInputData = () => Infinity;
        expect(() => proto('audio/gain').onExecute.call(self)).not.toThrow();
        expect(self.audionode.gain.value).toBe(0.8);
    });

    test('audio/source keeps its gain on non-finite input', () => {
        const self = { audionode: { gain: new FakeAudioParam() }, _audionodes: [], properties: {},
            inputs: [{ name: 'gain', link: 1 }], getInputData: () => NaN };
        expect(() => proto('audio/source').onExecute.call(self)).not.toThrow();
        expect(self.audionode.gain.value).toBe(0.5);
    });

    test('audio/dynamicsCompressor skips the read-only reduction field', () => {
        const self = { audionode: { get reduction() { return -20; }, ratio: new FakeAudioParam(12) } };
        const onPropertyChanged = proto('audio/dynamicsCompressor').onPropertyChanged;
        expect(() => onPropertyChanged.call(self, 'reduction', -19)).not.toThrow();
        expect(self.audionode.reduction).toBe(-20);
        onPropertyChanged.call(self, 'ratio', 13);
        expect(self.audionode.ratio.value).toBe(13);
    });

    test('audio/analyser rejects values the browser range-checks', () => {
        const audionode = { _fft: 2048,
            get fftSize() { return this._fft; },
            set fftSize(v) { if (Math.log2(v) % 1) throw new RangeError('not a power of two'); this._fft = v; } };
        const self = { audionode };
        const onPropertyChanged = proto('audio/analyser').onPropertyChanged;
        expect(() => onPropertyChanged.call(self, 'fftSize', 2049)).not.toThrow();
        expect(audionode.fftSize).toBe(2048);
        onPropertyChanged.call(self, 'fftSize', 1024);
        expect(audionode.fftSize).toBe(1024);
    });
});
