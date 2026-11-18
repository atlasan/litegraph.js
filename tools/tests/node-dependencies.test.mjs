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

test('process-info node initializes os before exposing its output', async () => {
    const graph = new LGraph();
    try {
        const node = LiteGraph.createNode('server/process/NodeProcessInfo');
        assert.ok(node, 'process-info must construct');
        graph.add(node); await graph.whenReady(); graph.runStep(1, true);
        const info = node.getOutputData(0);
        assert.equal(info.platform, process.platform);
        assert.equal(info.arch, process.arch);
        assert.ok(Number.isInteger(info.cpuCores) && info.cpuCores > 0);
        assert.ok(info.totalMemory > 0); assert.ok(info.freeMemory >= 0);
    } finally { await graph.clearAsync(); }
});

test('service nodes wait for their platform adapter and surface missing adapters', async () => {
    if (!['win32','linux'].includes(process.platform)) return;
    const manager = LiteGraph.LibraryManager;
    const originalLoad = manager.loadLibrary, originalGet = manager.getLib;
    const key = process.platform === 'win32' ? 'node-windows' : 'node-linux-systemd';
    const adapter = {};
    let loaded = false, loadCount = 0;
    manager.loadLibrary = async requested => { assert.equal(requested, key); loadCount++; await Promise.resolve(); loaded = true; };
    manager.getLib = requested => { assert.equal(requested, key); assert.equal(loaded, true); return adapter; };
    try {
        for (const type of ['sys/serviceManager','sys/serviceList']) {
            loaded = false;
            const node = LiteGraph.createNode(type);
            assert.deepEqual(node.libraries, [key]);
            await node.ready;
            assert.equal(process.platform === 'win32' ? node.windowsService : node.linuxService, adapter);
        }
        assert.equal(loadCount, 2);
        manager.loadLibrary = async () => { throw new Error('fixture adapter missing'); };
        const node = LiteGraph.createNode('sys/serviceManager');
        await assert.rejects(node.ready, /fixture adapter missing/);
        assert.equal(node.initialization_state, 'error');
    } finally { manager.loadLibrary = originalLoad; manager.getLib = originalGet; }
});

test('Node-only process and service nodes reject a browser runtime before dependency loading', async () => {
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const manager = LiteGraph.LibraryManager, original = manager.loadLibrary;
    let loads = 0;
    globalThis.window = {}; globalThis.document = {};
    manager.loadLibrary = async () => { loads++; };
    try {
        for (const type of ['server/process/NodeProcessInfo','sys/serviceManager','sys/serviceList']) {
            const node = LiteGraph.createNode(type);
            assert.ok(node);
            await assert.rejects(node.ready, /cannot run in browser/);
            assert.equal(node.wrong_environment, true);
            assert.equal(node.mode, LiteGraph.NEVER);
        }
        assert.equal(loads, 0);
    } finally {
        manager.loadLibrary = original;
        if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else delete globalThis.window;
        if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument); else delete globalThis.document;
    }
});
