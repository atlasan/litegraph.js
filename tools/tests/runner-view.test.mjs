import test from 'node:test';
import assert from 'node:assert/strict';
import { selectGraphView } from '../../apps/runner/public/graph-view-state.js';

test('tab navigation preserves detached drafts and edit mode, including reselecting the current tab', () => {
    const store = { a:{serializedGraph:{value:1}}, b:{serializedGraph:{value:2}} };
    let state = { value:73 }, loads = 0;
    const viewer = {
        graph: { serialize: () => state }, editor:{ read_only:false },
        loadGraph(graph) { state = JSON.parse(JSON.stringify(graph)); this.editor.read_only = true; loads++; },
    };
    assert.equal(selectGraphView(viewer, store, 'a', 'a'), 'a');
    assert.equal(loads, 0); assert.equal(state.value, 73);
    const previous = state;
    assert.equal(selectGraphView(viewer, store, 'a', 'b'), 'b');
    previous.value = 999;
    assert.equal(store.a.serializedGraph.value, 73);
    assert.equal(viewer.editor.read_only, true);
    state.value = 22;
    assert.equal(selectGraphView(viewer, store, 'b', 'a'), 'a');
    assert.equal(state.value, 73); assert.equal(viewer.editor.read_only, false);
    assert.equal(store.b.serializedGraph.value, 22);
});

test('execution states are kept per graph, reset by a reset, and re-applied to a view (Wave 6)', async () => {
    const { recordExecutionState, applyExecutionStates } = await import('../../apps/runner/public/execution-view-state.js');
    const store = { a: { serializedGraph: {} } };
    const status = { v: 1, kind: 'status', path: '3', status: 'done', time: 1 };
    const progress = { v: 1, kind: 'progress', path: '3', value: 1, max: 2, time: 2 };
    assert.equal(recordExecutionState(store, 'missing', status), false);
    assert.equal(recordExecutionState(store, 'a', status), true);
    assert.equal(recordExecutionState(store, 'a', progress), true);
    assert.equal(recordExecutionState(store, 'a', { v: 1, kind: 'status', path: null }), false);
    const applied = [];
    const graph = { applyExecutionState: (message) => { applied.push(message.kind); return message.path === '3' ? {} : null; } };
    assert.equal(applyExecutionStates(graph, store.a), 2);
    assert.deepEqual(applied, ['status', 'progress']);
    recordExecutionState(store, 'a', { v: 1, kind: 'reset', path: null });
    assert.equal(applyExecutionStates(graph, store.a), 0);
    assert.equal(applyExecutionStates(null, store.a), 0);
});
