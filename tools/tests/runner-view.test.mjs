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
