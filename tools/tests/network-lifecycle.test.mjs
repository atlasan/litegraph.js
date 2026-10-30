import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import dgram from 'node:dgram';
import { WebSocket } from 'ws';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { LiteGraph, LGraph } = require('../../build_node/litegraph_nodejs.full.cjs');
LiteGraph.logging_set_level(0);

async function fixture(type) {
    const graph = new LGraph();
    const node = LiteGraph.createNode(type);
    assert.ok(node, type);
    node.log = node.warn = node.error = () => {};
    node.properties.port = 0;
    node.properties.host = '127.0.0.1';
    graph.add(node);
    await graph.whenReady();
    return { graph, node };
}

test('graph stop closes WebSocket server and connected clients; graph can restart', { timeout: 5000 }, async () => {
    const { graph, node } = await fixture('server/network/websocketserver');
    let client;
    try {
        graph.start(100);
        node.startServer();
        const server = node.server;
        await once(server, 'listening');
        client = new WebSocket(`ws://127.0.0.1:${server.address().port}`);
        await once(client, 'open');
        const closed = once(server, 'close');
        const disconnected = once(client, 'close');
        graph.stop();
        await Promise.all([closed, disconnected]);
        assert.equal(node.server, null);
        assert.equal(node.status, 'stopped');
        assert.equal(node._clients.size, 0);
        graph.start(100);
        node.startServer();
        const replacement = node.server;
        await once(replacement, 'listening');
        const removed = once(replacement, 'close');
        graph.clear();
        await removed;
        assert.equal(node.server, null);
    } finally { client?.terminate(); graph.clear(); }
});

test('UDP node receives loopback data and graph stop releases the socket', { timeout: 5000 }, async () => {
    const { graph, node } = await fixture('nodejs/network/UDP_server');
    const sender = dgram.createSocket('udp4');
    try {
        graph.start(100);
        node.startServer();
        const server = node.server;
        await once(server, 'listening');
        const received = once(server, 'message');
        sender.send(Buffer.from('{"value":42}'), server.address().port, '127.0.0.1');
        await received;
        assert.deepEqual(node.getOutputData(node.findOutputSlot('dataOut')), { value: 42 });
        assert.equal(node.status, 'running');
        const closed = once(server, 'close');
        graph.stop();
        await closed;
        assert.equal(node.server, null);
        assert.equal(node._retryTimer, null);
    } finally { sender.close(); graph.clear(); }
});

test('stop and removal cancel a failed server retry', { timeout: 5000 }, async () => {
    for (const cleanup of ['stop', 'clear']) {
        const { graph, node } = await fixture('server/network/websocketserver');
        let attempts = 0;
        node.properties.retryTimeout = 25;
        node._createServer = () => { attempts++; throw new Error('simulated bind failure'); };
        try {
            graph.start(100);
            node.startServer();
            assert.ok(node._retryTimer);
            graph[cleanup]();
            await new Promise((resolve) => setTimeout(resolve, 60));
            assert.equal(attempts, 1);
            assert.equal(node._retryTimer, null);
            assert.equal(node.server, null);
        } finally { graph.clear(); }
    }
});

test('Socket.IO server constructor is independent of a loaded client global', { timeout: 5000 }, async () => {
    await LiteGraph.LibraryManager.loadLibrary('io');
    const { graph, node } = await fixture('nodejs/network/SocketIO_server');
    try {
        node.startServer();
        assert.ok(node.server instanceof LiteGraph.LibraryManager.getLib('socket.io'));
        const httpServer = node.server.httpServer;
        if (!httpServer.listening) await once(httpServer, 'listening');
        const closed = once(httpServer, 'close');
        graph.clear();
        await closed;
        assert.equal(node.server, null);
    } finally { graph.clear(); }
});
