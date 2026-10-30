import { parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { format } from 'node:util';

const require = createRequire(import.meta.url);
const { LiteGraph, LGraph } = require('../../../build_node/litegraph_nodejs.full.cjs');
LiteGraph.logging_set_level(process.env.LOG_LEVEL === 'debug' ? 4 : 2);

for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  console[level] = (...args) => parentPort.postMessage({
    event: 'console', level: level === 'log' ? 'info' : level, message: format(...args),
  });
}

function configure(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.nodes) || !Array.isArray(data.links)) {
    throw new Error('Workflow must contain nodes and links arrays');
  }
  for (const node of data.nodes) {
    if (!node || !Object.hasOwn(LiteGraph.registered_node_types, node.type)) {
      throw new Error(`Unknown node type: ${node?.type}`);
    }
  }
  const candidate = new LGraph();
  try {
    if (candidate.configure(data)) throw new Error('Workflow contains unsupported nodes');
    return candidate;
  } catch (error) {
    candidate.clear();
    throw error;
  }
}

let graph = configure(JSON.parse(fs.readFileSync(workerData, 'utf8')));
const status = () => graph.status === LGraph.STATUS_RUNNING ? 'running' : 'stopped';

parentPort.on('message', ({ requestId, action, serializedGraph }) => {
  try {
    let data = {};
    switch (action) {
      case 'start': graph.start(); break;
      case 'stop': graph.stop(); break;
      case 'clear': graph.clear(); break;
      case 'status': break;
      case 'sync': data.serializedGraph = graph.serialize(); break;
      case 'update': {
        const replacement = configure(serializedGraph);
        const wasRunning = status() === 'running';
        graph.clear();
        graph = replacement;
        if (wasRunning) graph.start();
        data.serializedGraph = graph.serialize();
        break;
      }
      default: throw new Error(`Unknown command: ${action}`);
    }
    parentPort.postMessage({ requestId, status: status(), iteration: graph.iteration, ...data });
  } catch (error) {
    parentPort.postMessage({ requestId, error: error.message, status: status() });
  }
});
