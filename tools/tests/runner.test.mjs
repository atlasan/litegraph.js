import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { Worker } from 'node:worker_threads';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'litegraph-runner-'));
process.env.WORKFLOWS_DIR = path.join(temp, 'workflows');
// fixtures below use default-denied types: the dependent node and the port-binding server
process.env.RUNNER_ALLOW_TYPES = 'sys/fileRead,server/network/websocketserver';
fs.mkdirSync(process.env.WORKFLOWS_DIR);
const workflow = { nodes: [], links: [], groups: [], config: {}, extra: {}, version: 0.4 };
fs.writeFileSync(path.join(process.env.WORKFLOWS_DIR, 'empty.json'), JSON.stringify(workflow));
fs.writeFileSync(path.join(process.env.WORKFLOWS_DIR, 'invalid.json'), '{}');
fs.writeFileSync(path.join(process.env.WORKFLOWS_DIR, 'file-node.json'), JSON.stringify({ ...workflow, nodes: [{ id: 1, type: 'sys/fileRead', properties: { filePath: '' } }] }));
fs.writeFileSync(path.join(temp, 'outside.json'), JSON.stringify(workflow));
fs.symlinkSync(path.join(temp, 'outside.json'), path.join(process.env.WORKFLOWS_DIR, 'escape.json'));
const manager = await import('../../apps/runner/server/graphManager.js');
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

test('oversized and malformed workflows are refused with a structured report (validated loader)', async () => {
  const many = Array.from({ length: 10001 }, (_, i) => ({ id: i + 1, type: 'basic/const' }));
  fs.writeFileSync(path.join(process.env.WORKFLOWS_DIR, 'oversized.json'), JSON.stringify({ ...workflow, nodes: many }));
  const malformedLinks = { ...workflow, nodes: [{ id: 1, type: 'basic/const', outputs: [{ name: 'value', type: 'number', links: [1] }] }], links: [[1, 1, 0, 99, 0, 'number'], [2, 1, 0.5]] };
  fs.writeFileSync(path.join(process.env.WORKFLOWS_DIR, 'malformed.json'), JSON.stringify(malformedLinks));
  const longString = { ...workflow, nodes: [{ id: 1, type: 'basic/const', properties: { value: 'x'.repeat(1048577) } }] };
  const hijack = JSON.parse(JSON.stringify({ ...workflow, runStep: 'boom', nodes: [{ id: 1, type: 'basic/const', onExecute: 'x', graph: { nodes: [] } }] }));
  try {
    const oversized = await manager.openGraph('oversized.json', logger);
    assert.match(oversized.error ?? '', /too-many-nodes/);
    assert.equal(oversized.report?.ok, false);
    assert.deepEqual(oversized.report.issues.filter((i) => i.severity === 'error').map((i) => i.code), ['too-many-nodes']);
    assert.equal(oversized.report.issues[0].limit, 10000);
    const malformed = await manager.openGraph('malformed.json', logger);
    assert.match(malformed.error ?? '', /bad-link at \$\.links\[1\]/);
    assert.equal(malformed.report.issues.find((i) => i.code === 'dangling-link').severity, 'warning', 'a link to nothing is reported too');
    assert.deepEqual(manager.getCurrentProcesses(), [], 'refused workflows leave no worker behind');
    // a loaded graph refuses a bad update with a report and keeps running the old one
    assert.equal((await manager.openGraph('empty.json', logger)).status, 'stopped');
    const refused = await manager.updateGraph('empty.json', longString, logger);
    assert.match(refused.error ?? '', /string-too-long/);
    assert.equal(refused.report.issues[0].path, '$.nodes[0].properties.value');
    assert.equal((await manager.requestSync('empty.json', logger)).serializedGraph.nodes.length, 0);
    // runtime-only fields are dropped, not executed or assigned
    const cleaned = await manager.updateGraph('empty.json', hijack, logger);
    assert.equal(cleaned.status, 'stopped', cleaned.error);
    assert.equal((await manager.controlGraph('empty.json', 'start', logger)).status, 'running');
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.ok((await manager.controlGraph('empty.json', 'status', logger)).iteration > 0);
    // the type policy plugs into the loader: refusals keep the policy's message and carry the report
    const denied = await manager.updateGraph('empty.json', { ...workflow, nodes: [{ id: 4, type: 'sys/runCommand' }] }, logger);
    assert.match(denied.error ?? '', /not allowed in the runner: sys\/runCommand \(node 4\)/);
    assert.equal(denied.report.issues.find((i) => i.code === 'type-refused').node, 4);
  } finally { await manager.unloadAllGraphs(logger); }
});

test('a workflow with subgraph definitions opens, runs and syncs back in the definitions form', async () => {
  const id = 'a7f1c2d3-0000-4000-8000-0000000000aa';
  const doc = { ...workflow, nodes: [
    { id: 1, type: 'basic/const', pos: [0, 0], size: [180, 30], flags: {}, mode: 0, properties: { value: 6 }, outputs: [{ name: 'value', type: 'number', links: [1] }] },
    { id: 2, type: id, pos: [250, 0], size: [200, 46], flags: {}, mode: 0, properties: {}, inputs: [{ name: 'x', type: 'number', link: 1 }], outputs: [{ name: 'y', type: 'number', links: null }] },
  ], links: [[1, 1, 0, 2, 0, 'number']], definitions: { subgraphs: [{
    id, version: 1, name: 'Square', inputNode: { id: -10, bounding: [-200, 0, 120, 60] }, outputNode: { id: -20, bounding: [400, 0, 120, 60] },
    inputs: [{ id: 'in-x', name: 'x', type: 'number', linkIds: [5, 6] }], outputs: [{ id: 'out-y', name: 'y', type: 'number', linkIds: [7] }],
    nodes: [{ id: 3, type: 'math/operation', pos: [0, 0], size: [100, 60], flags: {}, mode: 0, properties: { A: 1, B: 1, OP: '*' },
      inputs: [{ name: 'A', type: 'number,array,object', link: 5 }, { name: 'B', type: 'number', link: 6 }], outputs: [{ name: '=', type: 'number', links: [7] }] }],
    links: [{ id: 5, origin_id: -10, origin_slot: 0, target_id: 3, target_slot: 0, type: 'number' }, { id: 6, origin_id: -10, origin_slot: 0, target_id: 3, target_slot: 1, type: 'number' },
      { id: 7, origin_id: 3, origin_slot: 0, target_id: -20, target_slot: 0, type: 'number' }],
  }] } };
  fs.writeFileSync(path.join(process.env.WORKFLOWS_DIR, 'definitions.json'), JSON.stringify(doc));
  const states = [];
  manager.setExecutionStateCallback((graphId, message) => states.push({ graphId, message }));
  try {
    const opened = await manager.openGraph('definitions.json', logger);
    assert.equal(opened.status, 'stopped', opened.error);
    assert.equal((await manager.controlGraph('definitions.json', 'start', logger)).status, 'running');
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.ok((await manager.controlGraph('definitions.json', 'status', logger)).iteration > 0);
    const synced = (await manager.requestSync('definitions.json', logger)).serializedGraph;
    assert.equal(synced.nodes.find((n) => n.id === 2).type, id);
    assert.equal(synced.nodes.find((n) => n.id === 2).subgraph, undefined);
    assert.deepEqual(synced.definitions.subgraphs.map((d) => d.id), [id]);
    assert.equal(synced.definitions.subgraphs[0].nodes[0].properties.OP, '*');
    // execution state (protocol v1): a reset at start, then one "done" per node, by path (inside the subgraph: "2:3")
    const messages = states.filter((s) => s.graphId === 'definitions.json').map((s) => s.message);
    assert.deepEqual(messages[0] && { v: messages[0].v, kind: messages[0].kind, path: messages[0].path }, { v: 1, kind: 'reset', path: null });
    const done = messages.filter((m) => m.kind === 'status' && m.status === 'done').map((m) => m.path);
    assert.ok(done.includes('2:3'), `inner node reported by path: ${JSON.stringify(done)}`);
    assert.equal(done.filter((p) => p === '2:3').length, 1, 'one message per change, not per step');
  } finally { manager.setExecutionStateCallback(null); await manager.unloadAllGraphs(logger); }
});

test('runner parity (Wave 6): ancestors and legacy workflows give the in-process results and stream statuses', { timeout: 10000 }, async () => {
  const fixtures = new URL('../../test/fixtures/', import.meta.url);
  const expected = JSON.parse(fs.readFileSync(new URL('runner-parity.expected.json', fixtures), 'utf8'));
  const states = [];
  manager.setExecutionStateCallback((graphId, message) => states.push({ graphId, message }));
  try {
    for (const name of ['runner-parity-ancestors.json', 'runner-parity-legacy.json']) {
      fs.copyFileSync(new URL(name, fixtures), path.join(process.env.WORKFLOWS_DIR, name));
      const opened = await manager.openGraph(name, logger);
      assert.equal(opened.status, 'stopped', opened.error);
      assert.equal((await manager.controlGraph(name, 'start', logger)).status, 'running');
      await new Promise((resolve) => setTimeout(resolve, 300));
      const synced = (await manager.requestSync(name, logger)).serializedGraph;
      const data = (title) => synced.nodes.find((n) => n.title === title).properties.data;
      assert.deepEqual({ model: synced.config.execution ?? 'legacy', 'FOR result': data('FOR result'), 'WHILE result': data('WHILE result') }, expected[name], name);
      await manager.unloadGraph(name, logger);
    }
    // nodes run by actions report running -> done (once per change), by path
    const counter = (name) => states.filter((s) => s.graphId === name && s.message.path === '6').map((s) => s.message.status);
    assert.deepEqual(counter('runner-parity-ancestors.json'), ['running', 'done']);
  } finally { manager.setExecutionStateCallback(null); await manager.unloadAllGraphs(logger); }
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

test('unexpected worker exit rejects an outstanding command and permits reopening', {timeout:5000}, async () => {
  const original = Worker.prototype.postMessage;
  let holdSync = false, sent;
  const held = new Promise(resolve => { sent = resolve; });
  const statuses = [];
  manager.setStatusCallback((graphId, status) => statuses.push({graphId, status}));
  Worker.prototype.postMessage = function(message, ...rest) {
    if (holdSync && message.action === 'sync') { sent(this); return; }
    return original.call(this, message, ...rest);
  };
  try {
    assert.equal((await manager.openGraph('empty.json', logger)).status, 'stopped');
    holdSync = true;
    const pending = manager.requestSync('empty.json', logger);
    const worker = await held;
    await worker.terminate();
    assert.match((await pending).error, /Worker exited/);
    assert.deepEqual(manager.getCurrentProcesses(), []);
    assert.deepEqual(statuses.at(-1), {graphId:'empty.json', status:'error'});
    holdSync = false;
    assert.equal((await manager.openGraph('empty.json', logger)).status, 'stopped');
  } finally {
    Worker.prototype.postMessage = original;
    manager.setStatusCallback(null);
    await manager.unloadAllGraphs(logger);
  }
});

test('HTTP and WebSocket protocol on an ephemeral port', async () => {
  const { createRunnerServer } = await import('../../apps/runner/server/index.js');
  const runner = createRunnerServer();
  runner.server.listen(0, '127.0.0.1');
  await once(runner.server, 'listening');
  const address = `127.0.0.1:${runner.server.address().port}`;
  const ws = new WebSocket(`ws://${address}`);
  const peer = new WebSocket(`ws://${address}`);
  const peerMessages = [];
  peer.on('message', raw => peerMessages.push(JSON.parse(raw)));
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
    await Promise.all([once(ws, 'open'), once(peer, 'open')]);
    const foreign = new WebSocket(`ws://${address}`, { origin: 'https://evil.example' });
    foreign.on('error', () => {});
    const [, rejection] = await once(foreign, 'unexpected-response');
    assert.equal(rejection.statusCode, 401, 'cross-origin WebSocket upgrade is refused');
    rejection.destroy();
    const reboundStatus = await new Promise((resolve, reject) => {
      const request = http.request({ host: '127.0.0.1', port: runner.server.address().port, path: '/api/list_files', headers: { host: 'evil.example' } }, (response) => { response.resume(); resolve(response.statusCode); });
      request.on('error', reject);
      request.end();
    });
    assert.equal(reboundStatus, 403, 'foreign Host header is refused');
    const listed = await fetch(`http://${address}/api/list_files`).then((r) => r.json());
    assert.ok(listed.includes('empty.json'));
    assert.ok(!listed.includes('escape.json'));
    assert.equal((await fetch(`http://${address}/build/litegraph.full.js`)).status, 200);
    ws.send('null');
    assert.match((await waitFor((m) => m.type === 'error')).data.message, /Invalid message/);
    ws.send(JSON.stringify({ type: 'open_graph', requestId: 'open-fixture', data: { file: 'empty.json' } }));
    ws.send(JSON.stringify({ type: 'control_graph', data: { graphId: 'empty.json', action: 'start' } }));
    const openedReply = await waitFor((m) => m.type === 'graph_opened');
    assert.equal(openedReply.requestId, 'open-fixture');
    assert.equal(openedReply.data.status, 'stopped');
    ws.send(JSON.stringify({ type: 'update_graph', requestId: 'denied-fixture', data: { graphId: 'empty.json', serializedGraph: { ...workflow, nodes: [{ id: 1, type: 'sys/runCommand' }] } } }));
    assert.match((await waitFor((m) => m.requestId === 'denied-fixture')).data.message, /not allowed in the runner: sys\/runCommand/);
    ws.send(JSON.stringify({ type: 'update_graph', requestId: 'malformed-fixture', data: { graphId: 'empty.json', serializedGraph: { ...workflow, nodes: [{ id: 1, type: 'basic/const' }, { id: 1, type: 'basic/const' }] } } }));
    const malformedReply = await waitFor((m) => m.requestId === 'malformed-fixture');
    assert.equal(malformedReply.type, 'error');
    assert.match(malformedReply.data.message, /duplicate-node-id/);
    assert.deepEqual(malformedReply.data.report.issues.map((i) => i.code), ['duplicate-node-id'], 'the WebSocket error carries the report');
    // script nodes must not evaluate pushed code: a formula that would write a file stays inert
    const marker = path.join(temp, 'formula-ran');
    const formula = `process.getBuiltinModule('fs').writeFileSync(${JSON.stringify(marker)}, 'x')`;
    ws.send(JSON.stringify({ type: 'update_graph', requestId: 'script-fixture', data: { graphId: 'empty.json', serializedGraph: { ...workflow, nodes: [{ id: 1, type: 'math/formula', pos: [0, 0], size: [100, 50], properties: { formula } }] } } }));
    assert.equal((await waitFor((m) => m.requestId === 'script-fixture')).type, 'graph_updated');
    ws.send(JSON.stringify({type:'unsupported', requestId:'error-fixture'}));
    assert.equal((await waitFor(m => m.type === 'error')).requestId, 'error-fixture');
    await waitFor((m) => m.type === 'graph_status' && m.data.status === 'running');
    await new Promise((resolve) => setTimeout(resolve, 300)); // let the formula graph run a few steps
    assert.equal(fs.existsSync(marker), false, 'math/formula evaluated pushed code');
    const peerUpdate = new Promise(resolve => {
      const receive = raw => {
        const packet = JSON.parse(raw);
        if (packet.type === 'graph_updated') { peer.off('message', receive); resolve(packet); }
      };
      peer.on('message', receive);
    });
    ws.send(JSON.stringify({type:'update_graph', requestId:'update-fixture', data:{graphId:'empty.json', serializedGraph:{...workflow, extra:{marker:'peer-update'}}}}));
    const ownUpdate = await waitFor(m => m.type === 'graph_updated');
    const broadcast = await peerUpdate;
    assert.equal(ownUpdate.requestId, 'update-fixture');
    assert.equal(broadcast.requestId, undefined);
    assert.equal(broadcast.data.serializedGraph.extra.marker, 'peer-update');
    messages.length = 0;
    ws.send(JSON.stringify({ type: 'stop_all_graphs' }));
    await waitFor((m) => m.type === 'active_graphs' && m.data.graphs[0]?.status === 'stopped');
    ws.send(JSON.stringify({ type: 'unload_graph', data: { graphId: 'empty.json' } }));
    await waitFor((m) => m.type === 'graph_status' && m.data.status === 'unloaded');
    assert.ok(peerMessages.some(m => m.type === 'graph_status' && m.data.status === 'running'));
  } finally { ws.terminate(); peer.terminate(); await runner.close(); fs.rmSync(temp, { recursive: true, force: true }); }
});
