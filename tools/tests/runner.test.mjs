import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { once } from 'node:events';
import { WebSocket } from 'ws';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'litegraph-runner-'));
process.env.WORKFLOWS_DIR = path.join(temp, 'workflows');
fs.mkdirSync(process.env.WORKFLOWS_DIR);
const workflow = { nodes: [], links: [], groups: [], config: {}, extra: {}, version: 0.4 };
fs.writeFileSync(path.join(process.env.WORKFLOWS_DIR, 'empty.json'), JSON.stringify(workflow));
fs.writeFileSync(path.join(process.env.WORKFLOWS_DIR, 'invalid.json'), '{}');
fs.writeFileSync(path.join(process.env.WORKFLOWS_DIR, 'file-node.json'), JSON.stringify({ ...workflow, nodes: [{ id: 1, type: 'sys/fileRead', properties: { filePath: '' } }] }));
fs.writeFileSync(path.join(temp, 'outside.json'), JSON.stringify(workflow));
fs.symlinkSync(path.join(temp, 'outside.json'), path.join(process.env.WORKFLOWS_DIR, 'escape.json'));
const manager = await import('../../headless/graphrunner/server/graphManager.js');
const logger = { error() {}, info() {}, warn() {} };

test('worker lifecycle, execution updates, validation, and unload', async () => {
  try {
    for (const file of ['../outside.json', path.join(temp, 'outside.json'), 'escape.json', 'invalid.json', 'missing.json', null]) {
      assert.ok((await manager.openGraph(file, logger)).error, String(file));
    }
    assert.deepEqual(manager.getCurrentProcesses(), []);
    const dependent = await manager.openGraph('file-node.json', logger);
    assert.equal(dependent.status, 'stopped', dependent.error);
    assert.equal((await manager.controlGraph('file-node.json', 'start', logger)).status, 'running');
    await manager.unloadGraph('file-node.json', logger);
    const opened = await manager.openGraph('empty.json', logger);
    assert.equal(opened.status, 'stopped', opened.error);
    assert.equal(manager.isGraphRunning('empty.json'), false);
    await manager.openGraph('empty.json', logger);
    assert.equal(manager.getCurrentProcesses().length, 1);
    assert.equal((await manager.controlGraph('empty.json', 'start', logger)).status, 'running');
    assert.equal(manager.isGraphRunning('empty.json'), true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.ok((await manager.controlGraph('empty.json', 'status', logger)).iteration > 0);
    const updated = { ...workflow, extra: { marker: 'worker-update' }, nodes: [{ id: 1, type: 'basic/const', pos: [0, 0], size: [180, 30], flags: {}, mode: 0, properties: { value: 42 }, outputs: [{ name: 'value', type: 'number', links: null }] }] };
    const result = await manager.updateGraph('empty.json', updated, logger);
    assert.equal(result.status, 'running', result.error);
    const synced = await manager.requestSync('empty.json', logger);
    assert.equal(synced.serializedGraph.nodes[0].properties.value, 42);
    assert.equal(synced.serializedGraph.extra.marker, 'worker-update');
    assert.ok((await manager.updateGraph('empty.json', { nodes: [{ type: 'missing/type' }], links: [] }, logger)).error);
    assert.equal((await manager.requestSync('empty.json', logger)).serializedGraph.nodes.length, 1);
    assert.ok((await manager.controlGraph('empty.json', 'invalid', logger)).error);
    await manager.stopAllGraphs(logger);
    assert.equal(manager.getGraphStatus('empty.json'), 'stopped');
    assert.equal((await manager.unloadGraph('empty.json', logger)).status, 'unloaded');
    assert.deepEqual(manager.getCurrentProcesses(), []);
    assert.ok((await manager.requestSync('empty.json', logger)).error);
    assert.equal((await manager.openGraph('empty.json', logger)).serializedGraph.nodes.length, 0);
  } finally { await manager.unloadAllGraphs(logger); }
});

test('worker stop/update acknowledgments wait for bound ports to be released', { timeout: 10000 }, async () => {
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const file = 'server.json';
  const configured = { ...workflow, nodes: [{ id: 1, type: 'server/network/websocketserver', properties: { port, should_autoconnect: true, retryTimeout: 10 } }] };
  fs.writeFileSync(path.join(process.env.WORKFLOWS_DIR, file), JSON.stringify(configured));
  const clients = [];
  const connect = async () => {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const client = new WebSocket(`ws://127.0.0.1:${port}`);
      try { await once(client, 'open'); clients.push(client); return client; }
      catch { client.terminate(); await new Promise((resolve) => setTimeout(resolve, 20)); }
    }
    throw new Error('Worker server did not become reachable');
  };
  try {
    assert.equal((await manager.openGraph(file, logger)).status, 'stopped');
    assert.equal((await manager.controlGraph(file, 'start', logger)).status, 'running');
    await connect();
    const replacement = await manager.updateGraph(file, configured, logger);
    assert.equal(replacement.status, 'running', replacement.error);
    await connect();
    const stopped = await manager.controlGraph(file, 'stop', logger);
    assert.equal(stopped.status, 'stopped', stopped.error);
    // Rebind immediately after the acknowledgement, without a settling delay.
    const probe = net.createServer();
    try {
      probe.listen(port, '127.0.0.1');
      await once(probe, 'listening');
    } finally { await new Promise((resolve) => probe.close(resolve)); }
  } finally {
    for (const client of clients) client.terminate();
    await manager.unloadAllGraphs(logger);
  }
});

test('HTTP and WebSocket protocol on an ephemeral port', async () => {
  const { createRunnerServer } = await import('../../headless/graphrunner/server/index.js');
  const runner = createRunnerServer();
  runner.server.listen(0, '127.0.0.1');
  await once(runner.server, 'listening');
  const address = `127.0.0.1:${runner.server.address().port}`;
  const ws = new WebSocket(`ws://${address}`);
  const messages = [];
  ws.on('message', (raw) => messages.push(JSON.parse(raw)));
  const waitFor = async (predicate) => {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const index = messages.findIndex(predicate);
      if (index !== -1) return messages.splice(index, 1)[0];
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('Timed out waiting for WebSocket response');
  };
  try {
    await once(ws, 'open');
    const listed = await fetch(`http://${address}/api/list_files`).then((r) => r.json());
    assert.ok(listed.includes('empty.json'));
    assert.ok(!listed.includes('escape.json'));
    assert.equal((await fetch(`http://${address}/build/litegraph.full.js`)).status, 200);
    ws.send('null');
    assert.match((await waitFor((m) => m.type === 'error')).data.message, /Invalid message/);
    ws.send(JSON.stringify({ type: 'open_graph', data: { file: 'empty.json' } }));
    ws.send(JSON.stringify({ type: 'control_graph', data: { graphId: 'empty.json', action: 'start' } }));
    assert.equal((await waitFor((m) => m.type === 'graph_opened')).data.status, 'stopped');
    await waitFor((m) => m.type === 'graph_status' && m.data.status === 'running');
    messages.length = 0;
    ws.send(JSON.stringify({ type: 'stop_all_graphs' }));
    await waitFor((m) => m.type === 'active_graphs' && m.data.graphs[0]?.status === 'stopped');
    ws.send(JSON.stringify({ type: 'unload_graph', data: { graphId: 'empty.json' } }));
    await waitFor((m) => m.type === 'graph_status' && m.data.status === 'unloaded');
  } finally { ws.terminate(); await runner.close(); fs.rmSync(temp, { recursive: true, force: true }); }
});
