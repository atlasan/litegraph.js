import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { LiteGraph, LGraph } = require('../../build_node/litegraph_nodejs.full.cjs');
LiteGraph.logging_set_level(0);

test('built-in file node waits for fs and reads a temporary fixture', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'litegraph-file-node-'));
    const graph = new LGraph();
    try {
        const fixture = path.join(temp, 'fixture.txt');
        fs.writeFileSync(fixture, 'readiness fixture');
        const node = LiteGraph.createNode('sys/fileRead');
        graph.add(node);
        node.properties.filePath = fixture;
        await graph.whenReady();
        await node.handleFileOperation();
        assert.equal(node.getOutputData(node.findOutputSlot('fileContent')), 'readiness fixture');
        assert.equal(node.initialization_state, 'ready');
    } finally { graph.clear(); fs.rmSync(temp, { recursive: true, force: true }); }
});

test('network library registrations expose usable constructors without connecting', async () => {
    const manager = LiteGraph.LibraryManager;
    for (const key of ['io', 'socket.io', 'osc-js', 'ws', 'dgram']) await manager.loadLibrary(key);
    assert.equal(typeof manager.getLib('io'), 'function');
    assert.equal(typeof manager.getLib('socket.io'), 'function');
    assert.equal(typeof manager.getLib('osc-js'), 'function');
    assert.equal(typeof manager.getLib('osc-js').BridgePlugin, 'function');
    assert.equal(typeof manager.getLib('ws').WebSocketServer, 'function');
    assert.equal(typeof manager.getLib('dgram').createSocket, 'function');
});
