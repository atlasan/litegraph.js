// network/websocket: a socket closed on purpose (node removed, disconnected or reconnected to a
// new url) must not reconnect; a socket that drops by itself still does (auto_reconnect).
import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';
import { LGraph } from '../src/lgraph.js';
import '../src/nodes/network.js';

class FakeSocket {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    static created = [];
    constructor(url) { this.url = url; this.readyState = FakeSocket.CONNECTING; FakeSocket.created.push(this); }
    close() { this.readyState = FakeSocket.CLOSED; queueMicrotask(() => this.onclose?.()); }
    drop() { this.readyState = FakeSocket.CLOSED; this.onclose?.(); }
}

let realWebSocket;
beforeAll(() => { LiteGraph.initialize(); });
beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['performance', 'queueMicrotask'] });
    realWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = FakeSocket;
    FakeSocket.created = [];
    for (const level of ['log', 'info', 'debug']) jest.spyOn(console, level).mockImplementation(() => {});
});
afterEach(() => {
    globalThis.WebSocket = realWebSocket;
    jest.useRealTimers();
    jest.restoreAllMocks();
});

function connectedNode() {
    const graph = new LGraph();
    const node = LiteGraph.createNode('network/websocket');
    node.properties.runOnServerToo = true;
    node.properties.reconnectInterval = 100;
    graph.add(node);
    node.connectSocket();
    return { graph, node };
}

test('a removed node does not reconnect', async () => {
    const { graph, node } = connectedNode();
    expect(FakeSocket.created).toHaveLength(1);
    graph.remove(node);
    await Promise.resolve(); // the close event
    jest.advanceTimersByTime(1000);
    expect(FakeSocket.created).toHaveLength(1);
});

test('reconnecting to a new url closes the old socket without a second reconnect', async () => {
    const { node } = connectedNode();
    node.connectSocket();
    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    expect(FakeSocket.created).toHaveLength(2);
    expect(node._ws).toBe(FakeSocket.created[1]);
});

test('a socket that drops by itself reconnects once per drop', () => {
    const { node } = connectedNode();
    FakeSocket.created[0].drop();
    jest.advanceTimersByTime(100);
    expect(FakeSocket.created).toHaveLength(2);
    expect(node._ws).toBe(FakeSocket.created[1]);
    node.disconnectSocket();
});
