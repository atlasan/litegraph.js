import { parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { format } from 'node:util';
import { assertAllowedGraph } from '../nodePolicy.js';

const require = createRequire(import.meta.url);
const { LiteGraph, LGraph } = require('../../../build_node/litegraph_nodejs.full.cjs');
LiteGraph.logging_set_level(process.env.LOG_LEVEL === 'debug' ? 4 : 2);

for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  console[level] = (...args) => parentPort.postMessage({
    event: 'console', level: level === 'log' ? 'info' : level, message: format(...args),
  });
}

async function configure(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.nodes) || !Array.isArray(data.links)) {
    throw new Error('Workflow must contain nodes and links arrays');
  }
  assertAllowedGraph(data, (type) => Object.hasOwn(LiteGraph.registered_node_types, type));
  const candidate = new LGraph();
  try {
    if (candidate.configure(data)) throw new Error('Workflow contains unsupported nodes');
    await candidate.whenReady();
    return candidate;
  } catch (error) {
    try { await candidate.clearAsync(); } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], `Workflow configuration failed: ${error.message}; cleanup failed: ${cleanupError.message}`);
    }
    throw error;
  }
}

let graph = await configure(JSON.parse(fs.readFileSync(workerData, 'utf8')));
const status = () => graph.status === LGraph.STATUS_RUNNING ? 'running' : 'stopped';

let commands = Promise.resolve();
parentPort.on('message', (message) => {
  commands = commands.then(() => handleCommand(message));
});

async function handleCommand({ requestId, action, serializedGraph }) {
  try {
    let data = {};
    switch (action) {
      case 'start': await graph.startAsync(); break;
      case 'stop': await graph.stopAsync(); break;
      case 'clear': await graph.clearAsync(); break;
      case 'status': break;
      case 'sync': data.serializedGraph = graph.serialize(); break;
      case 'update': {
        const replacement = await configure(serializedGraph);
        const wasRunning = status() === 'running';
        try { await graph.clearAsync(); }
        catch (error) {
          await replacement.clearAsync();
          throw error;
        }
        graph = replacement;
        if (wasRunning) await graph.startAsync();
        data.serializedGraph = graph.serialize();
        break;
      }
      default: throw new Error(`Unknown command: ${action}`);
    }
    parentPort.postMessage({ requestId, status: status(), iteration: graph.iteration, ...data });
  } catch (error) {
    parentPort.postMessage({ requestId, error: error.message, status: status() });
  }
}
