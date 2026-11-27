// Auto-layout with the real dagre package, loaded on demand through the LibraryManager (Wave 4d).
import test from 'node:test';
import assert from 'node:assert/strict';
import { LiteGraph, LGraph } from '../../.lg/local-build/build/litegraph.js';

test('graph.autoLayout loads @dagrejs/dagre on first use and arranges a chain left to right', async () => {
    await LiteGraph.LibraryManager.ready;
    assert.equal(LiteGraph.LibraryManager.describeLibraries().find((l) => l.key === 'dagre')?.state, 'not_loaded', 'not loaded before it is needed');
    const graph = new LGraph();
    const nodes = ['basic/const', 'math/operation', 'basic/watch'].map((type, i) => {
        const node = LiteGraph.createNode(type);
        node.pos = [600 - i * 250, 300 * i];
        graph.add(node);
        return node;
    });
    nodes[0].connect(0, nodes[1], 0);
    nodes[1].connect(0, nodes[2], 0);
    const result = await graph.autoLayout();
    assert.deepEqual(result, { engine: 'dagre', moved: 3 });
    assert.equal(LiteGraph.LibraryManager.getLibraryState('dagre'), 'loaded');
    assert.ok(nodes[0].pos[0] < nodes[1].pos[0] && nodes[1].pos[0] < nodes[2].pos[0], nodes.map((n) => n.pos.join(',')).join(' '));
});
