// Catalog cleanup (Wave 4e): renamed node types load as their new names in the Node bundle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { bundlePath } from '../local-build.mjs';

const require = createRequire(import.meta.url);
const { LiteGraph, LGraph } = require(bundlePath('build_node/litegraph_nodejs.full.cjs'));

const RENAMED = {
    'server/network/websocketserver': 'network/server/websocket',
    'nodejs/network/SocketIO_server': 'network/server/socketio',
    'network/SocketIO': 'network/socketio',
    'server/process/NodeProcessInfo': 'sys/processInfo',
    'basic/watch_advanced': 'basic/watch',
    'watch/value': 'basic/watch',
};

test('every renamed type has an automatic mapping to a registered type, and old documents load without errors', async () => {
    await LiteGraph.LibraryManager.ready;
    for (const [oldType, newType] of Object.entries(RENAMED)) {
        assert.equal(LiteGraph.registered_node_types[oldType], undefined, `${oldType} is no longer registered`);
        assert.equal(LiteGraph.getNodeReplacement(oldType)?.new_type, newType, oldType);
        assert.equal(LiteGraph.getNodeReplacement(oldType)?.auto, true, oldType);
        assert.ok(LiteGraph.registered_node_types[newType], `${newType} is registered`);
    }
    const graph = new LGraph();
    const nodes = Object.keys(RENAMED).map((type, i) => ({ id: i + 1, type, pos: [0, i * 80], size: [140, 40], flags: {}, mode: 0, properties: {} }));
    const error = graph.configure({ last_node_id: nodes.length, last_link_id: 0, nodes, links: [], groups: [], config: {}, version: 0.4 });
    assert.equal(error, false);
    assert.deepEqual(graph._nodes.map((n) => n.type), Object.values(RENAMED));
    await graph.clearAsync?.();
});
