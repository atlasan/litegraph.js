import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';
import { ExecutionState } from '../src/executionstate.js';
import { DraftAutosave } from '../src/litegraph-editor.js';

/** Workspace state and execution (Wave 4b, plan steps 6-10). */

class Src { constructor() { this.addOutput('v', 'number'); this.addProperty('v', 3); } onExecute() { this.setOutputData(0, this.properties.v); } }
class Sink { constructor() { this.addInput('in', 'number'); } onExecute() { this.value = this.getInputData(0); } }
class Boom { constructor() { this.addInput('in', 'number'); } onExecute() { if (this.getInputData(0) === 3) throw new Error('boom at 3'); } }

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
    LiteGraph.registerNodeType('ws/src', Src);
    LiteGraph.registerNodeType('ws/sink', Sink);
    LiteGraph.registerNodeType('ws/boom', Boom);
});
beforeEach(() => { for (const level of ['info', 'debug', 'log', 'warn', 'error']) jest.spyOn(console, level).mockImplementation(() => {}); });
afterEach(() => {
    jest.restoreAllMocks();
    LiteGraph.actionHistory_enabled = false;
    LiteGraph.throw_errors = true;
});

const make = (graph, type, x = 0) => { const n = LiteGraph.createNode(type); n.pos = [x, 0]; graph.add(n); return n; };

const stubContext = (dom) => {
    dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
        get: (target, key) => key in target ? target[key] : (key === 'start' || key === 'finish' ? undefined : () => ({ width: 0 })),
        set: (target, key, value) => { target[key] = value; return true; },
    });
};

describe('graph-changed (step 6)', () => {
    test('one event per edit with its kind; one per transaction; code edits are reported once after the step', async () => {
        const graph = new LGraph();
        const seen = [];
        graph.events.on('graph-changed', (e) => seen.push(e.detail.kinds));
        const a = make(graph, 'ws/src');
        const b = make(graph, 'ws/sink', 200);
        expect(seen).toEqual([['node-added'], ['node-added']]);
        a.connect(0, b, 0);
        expect(seen).toEqual([['node-added'], ['node-added'], ['link']]);
        // setProperty and widget values set from code record no history entry: reported once, after the step
        a.setProperty('v', 5);
        a.setProperty('v', 7);
        expect(seen).toHaveLength(3);
        await Promise.resolve();
        expect(seen).toEqual([['node-added'], ['node-added'], ['link'], ['property']]);
        graph.markSaved();
        a.setProperty('v', 6);
        await Promise.resolve();
        expect(graph.isModified).toBe(true);

        seen.length = 0;
        graph.transact('two things', () => { make(graph, 'ws/src', 400); a.disconnectOutput(0); });
        expect(seen).toHaveLength(1);
        expect(seen[0]).toEqual(expect.arrayContaining(['node-added', 'link']));
    });

    test('an edit inside a subgraph also reaches the root with kind subgraph; configure reports a load', () => {
        const root = new LGraph();
        const sub = make(root, 'graph/subgraph');
        const seen = [];
        root.events.on('graph-changed', (e) => seen.push(e.detail));
        make(sub.subgraph, 'ws/src');
        expect(seen.at(-1)).toEqual(expect.objectContaining({ kind: 'subgraph', graph: sub.subgraph }));
        const loaded = new LGraph();
        const kinds = [];
        loaded.events.on('graph-changed', (e) => kinds.push([e.detail.kind, e.detail.reason]));
        loaded.configure(root.serialize());
        expect(kinds).toEqual([['configure', 'load']]);
    });

    test('viewport-changed fires once per drawn change, not on the first frame', () => {
        const dom = new JSDOM('<main></main>');
        globalThis.window = dom.window; globalThis.document = dom.window.document;
        stubContext(dom);
        try {
            const element = document.createElement('canvas');
            const canvas = new LGraphCanvas(element, new LGraph(), { skip_render: true });
            const seen = [];
            canvas.events.on('viewport-changed', (e) => seen.push(e.detail));
            canvas._checkViewportChanged();
            canvas._checkViewportChanged();
            expect(seen).toHaveLength(0);
            canvas.ds.offset[0] += 10;
            canvas.ds.scale = 2;
            canvas._checkViewportChanged();
            canvas._checkViewportChanged();
            expect(seen).toEqual([expect.objectContaining({ scale: 2 })]);
        } finally {
            dom.window.close(); delete globalThis.window; delete globalThis.document;
        }
    });
});

describe('dirty flag (step 7)', () => {
    test('edit → modified; markSaved → clean; undo back to the saved revision → clean', () => {
        const graph = new LGraph();
        LiteGraph.actionHistory_enabled = true;
        const flips = [];
        graph.events.on('modified-changed', (e) => flips.push(e.detail.modified));
        expect(graph.isModified).toBe(false);
        make(graph, 'ws/src');
        expect(graph.isModified).toBe(true);
        graph.markSaved();
        expect(graph.isModified).toBe(false);
        make(graph, 'ws/sink', 200);
        expect(graph.isModified).toBe(true);
        graph.actionHistoryBack();
        expect(graph.isModified).toBe(false);
        expect(flips).toEqual([true, false, true, false]);
    });

    test('a loaded document is clean; widget and subgraph edits count; markModified', () => {
        const source = new LGraph();
        const sub = make(source, 'graph/subgraph');
        const graph = new LGraph();
        graph.configure(source.serialize());
        expect(graph.isModified).toBe(false);
        make(graph.getNodeById(sub.id).subgraph, 'ws/src');
        expect(graph.isModified).toBe(true);
        graph.markSaved();
        graph.markModified();
        expect(graph.isModified).toBe(true);
    });
});

describe('draft autosave (step 8)', () => {
    const memory = () => {
        const data = new Map();
        return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
    };

    test('a modified document is written after the delay; markSaved removes the draft; load returns it', () => {
        jest.useFakeTimers({ doNotFake: ['performance'] });
        try {
            const graph = new LGraph();
            const storage = memory();
            const autosave = new DraftAutosave(graph, { storage, delay: 500 }).start();
            make(graph, 'ws/src');
            make(graph, 'ws/sink', 200);
            expect(storage.data.size).toBe(0);
            jest.advanceTimersByTime(499);
            expect(storage.data.size).toBe(0);
            jest.advanceTimersByTime(1);
            const draft = autosave.load();
            expect(draft.doc.nodes).toHaveLength(2);
            expect(draft.id).toBe(graph.id);
            graph.markSaved();
            expect(autosave.load()).toBeNull();
            autosave.dispose();
        } finally {
            jest.useRealTimers();
        }
    });

    test('a clean document writes nothing; a broken draft reads as none', () => {
        const storage = memory();
        const autosave = new DraftAutosave(new LGraph(), { storage });
        expect(autosave.save()).toBe(false);
        storage.setItem(DraftAutosave.KEY, '{not json');
        expect(autosave.load()).toBeNull();
    });
});

describe('execution-state protocol (step 9)', () => {
    test('messages: create, validate, apply by path, reset', () => {
        const root = new LGraph();
        const sub = make(root, 'graph/subgraph');
        const inner = make(sub.subgraph, 'ws/src');
        const message = ExecutionState.create('progress', inner.getPath(), { value: 2, max: 4, time: 1 });
        expect(message).toEqual({ v: 1, kind: 'progress', path: `${sub.id}:${inner.id}`, status: 'running', value: 2, max: 4, time: 1 });
        expect(ExecutionState.isMessage(message)).toBe(true);
        expect(ExecutionState.isMessage({ ...message, v: 2 })).toBe(false);
        expect(() => ExecutionState.create('nope', null)).toThrow(/unknown kind/);

        const remote = [];
        root.events.on('execution-state', (e) => remote.push(e.detail.remote));
        expect(root.applyExecutionState(message)).toBe(inner);
        expect(inner.execution_state).toEqual({ status: 'running', time: 1, value: 2, max: 4 });
        root.applyExecutionState(ExecutionState.create('reset', null));
        expect(inner.execution_state).toBeUndefined();
        expect(remote).toEqual([true, true]);
        expect(root.applyExecutionState(ExecutionState.create('status', '999', { status: 'done' }))).toBeNull();
    });

    test('runStep sends one "done" per node, not per step; start resets; errors carry the path', () => {
        const root = new LGraph();
        const src = make(root, 'ws/src');
        const sub = make(root, 'graph/subgraph');
        const boom = make(sub.subgraph, 'ws/boom');
        const input = make(sub.subgraph, 'graph/input');
        input.setProperty('name', 'x'); input.setProperty('type', 'number');
        input.connect(0, boom, 0);
        const messages = [];
        root.events.on('execution-state', (e) => messages.push(e.detail.message));

        root.runStep(3);
        const done = messages.filter((m) => m.kind === 'status' && m.status === 'done').map((m) => m.path);
        expect(done.filter((p) => p === String(src.id))).toHaveLength(1);
        expect(src.execution_state.status).toBe('done');

        // feed 3 into the subgraph: the inner node fails
        src.connect(0, sub, sub.findInputSlot('x'));
        messages.length = 0;
        expect(() => root.runStep(1)).toThrow(/boom at 3/);
        const errors = messages.filter((m) => m.kind === 'error');
        expect(errors).toEqual([expect.objectContaining({ path: `${sub.id}:${boom.id}`, status: 'error', message: 'boom at 3' })]);
        expect(boom.execution_state).toEqual(expect.objectContaining({ status: 'error', message: 'boom at 3' }));

        messages.length = 0;
        root.start(1000);
        root.stop();
        expect(messages[0]).toEqual(expect.objectContaining({ kind: 'reset', path: null }));
        expect(boom.execution_state).toBeUndefined();
    });

    test('nodes report progress and status; without listeners no path is computed', () => {
        const graph = new LGraph();
        const node = make(graph, 'ws/src');
        const spy = jest.spyOn(node, 'getPath');
        node.reportProgress(1, 4);
        expect(spy).not.toHaveBeenCalled();
        expect(node.execution_state).toEqual(expect.objectContaining({ status: 'running', value: 1, max: 4 }));
        const seen = [];
        graph.events.on('execution-state', (e) => seen.push(e.detail.message));
        node.setExecutionStatus('queued');
        node.setExecutionStatus(null);
        expect(seen.map((m) => [m.kind, m.path, m.status])).toEqual([['status', String(node.id), 'queued'], ['reset', String(node.id), undefined]]);
        expect(node.execution_state).toBeUndefined();
    });
});

describe('title with icon and overlays (step 10)', () => {
    const recorder = () => {
        const calls = [];
        const ctx = new Proxy({ calls }, {
            get: (target, key) => key in target ? target[key] : (...args) => { calls.push([key, ...args]); return { width: 10 }; },
            set: (target, key, value) => { target[key] = value; calls.push(['set', key, value]); return true; },
        });
        return { ctx, calls };
    };

    test('the icon is drawn before the title; overlays draw outline, progress and error text', () => {
        const dom = new JSDOM('<main></main>');
        globalThis.window = dom.window; globalThis.document = dom.window.document;
        stubContext(dom);
        try {
            const graph = new LGraph();
            const canvas = new LGraphCanvas(document.createElement('canvas'), graph, { skip_render: true });
            const node = make(graph, 'ws/src');
            node.icon = '★';
            const { ctx, calls } = recorder();
            canvas.drawNodeTitleText(node, ctx, 30, false);
            const texts = calls.filter((c) => c[0] === 'fillText');
            expect(texts.map((c) => [c[1], c[2]])).toEqual([['★', 30], [node.title, 44]]);

            node.execution_state = { status: 'error', message: 'bad input', time: 0 };
            const overlay = recorder();
            canvas.drawNodeExecutionOverlay(node, overlay.ctx, node.size, 30, LiteGraph.BOX_SHAPE, false);
            expect(overlay.calls.some((c) => c[0] === 'stroke')).toBe(true);
            expect(overlay.calls.some((c) => c[0] === 'fillText' && c[1] === 'bad input')).toBe(true);

            node.execution_state = { status: 'running', value: 1, max: 2, time: 0 };
            const progress = recorder();
            canvas.drawNodeExecutionOverlay(node, progress.ctx, node.size, 30, LiteGraph.BOX_SHAPE, false);
            expect(progress.calls.filter((c) => c[0] === 'fillRect').at(-1)).toEqual(['fillRect', 0, -3, node.size[0] / 2, 3]);

            LiteGraph.settings.set('LiteGraph.Canvas.ExecutionOverlays', false);
            expect(canvas.executionOverlaysEnabled()).toBe(false);
            LiteGraph.settings.set('LiteGraph.Canvas.ExecutionOverlays', true);
        } finally {
            dom.window.close(); delete globalThis.window; delete globalThis.document;
        }
    });

    test('a definition icon is used when the node has none', () => {
        class WithIcon { static def = { icon: '⚙' }; constructor() { this.addOutput('o', 'number'); } }
        LiteGraph.registerNodeType('ws/icon', WithIcon);
        expect(LiteGraph.getNodeDefinition('ws/icon').icon).toBe('⚙');
        const node = LiteGraph.createNode('ws/icon');
        expect(LGraphCanvas.prototype.getNodeIcon.call({}, node)).toBe('⚙');
        LiteGraph.unregisterNodeType('ws/icon');
    });
});
