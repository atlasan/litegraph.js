import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocketClient } from '../../apps/runner/public/connection.js';

class Socket {
  static instances = [];
  constructor() { this.sent = []; Socket.instances.push(this); }
  send(packet) { this.sent.push(JSON.parse(packet)); }
  close() { this.onclose?.(); }
  open() { this.onopen(); }
  message(packet) { this.onmessage({ data: JSON.stringify(packet) }); }
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function client(options = {}) {
  const errors = [], states = [], messages = [];
  const connection = new WebSocketClient('ws://fixture', message => messages.push(message), {
    Socket, reconnectDelay: 5, timeout: 30,
    onError: message => errors.push(message), onState: (...state) => states.push(state), ...options,
  });
  connection.connect();
  return { connection, errors, states, messages, socket: connection.ws };
}

test('only the matching acknowledgment releases a pending runner command', () => {
  const { connection, socket, states } = client();
  try {
    assert.equal(connection.send('open_graph'), false);
    socket.open(); assert.equal(socket.sent[0].type, 'get_active_graphs');
    assert.equal(connection.send('open_graph', {file:'example.json'}), true);
    const id = socket.sent.at(-1).requestId;
    socket.message({type:'graph_status', data:{status:'running'}});
    assert.equal(connection.pending.size, 1);
    assert.equal(connection.send('control_graph'), false);
    socket.message({type:'graph_opened', requestId:id, data:{}});
    assert.equal(connection.pending.size, 0);
    assert.deepEqual(states.at(-1), ['connected', 0]);
  } finally { connection.close(); }
});

test('disconnect clears pending commands and reconnect requests inventory without replaying edits', async () => {
  const { connection, socket, errors } = client();
  try {
    socket.open(); connection.send('update_graph', { graphId:'example.json' });
    socket.close(); assert.equal(connection.pending.size, 0);
    assert.match(errors.at(-1), /outcome is unknown/);
    await delay(15);
    const replacement = connection.ws; assert.notEqual(replacement, socket);
    replacement.open(); assert.deepEqual(replacement.sent.map(packet => packet.type), ['get_active_graphs']);
    socket.message({ type:'graph_updated', data:{} }); // Ignore the previous connection.
  } finally { connection.close(); }
});

test('acknowledgment timeout reports uncertainty and requests a fresh inventory', async () => {
  const { connection, socket, errors } = client();
  try {
    socket.open(); connection.send('control_graph'); await delay(50);
    assert.equal(connection.pending.size, 0);
    assert.match(errors.at(-1), /timed out.*outcome is unknown/);
    assert.equal(socket.sent.at(-1).type, 'get_active_graphs');
    socket.message({type:'error', data:{message:'failure'}});
  } finally { connection.close(); }
});
