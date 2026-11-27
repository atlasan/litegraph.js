import { parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { format } from 'node:util';
import { assertAllowedGraph, graphPolicyNotes, scriptsAllowed, renamedType, typePolicy } from '../nodePolicy.js';
import { bundlePath } from '../../../tools/local-build.mjs';

const require = createRequire(import.meta.url);
const { LiteGraph, LGraph, GraphLoader } = require(bundlePath('build_node/litegraph_nodejs.full.cjs'));
LiteGraph.logging_set_level(process.env.LOG_LEVEL === 'debug' ? 4 : 2);
// the Node.js build enables script nodes (math/formula, basic/script, ...); a pushed workflow must
// not run arbitrary code unless the operator opts in (RUNNER_ALLOW_SCRIPTS=1 or RUNNER_ALLOW_SYS=1)
LiteGraph.allow_scripts = scriptsAllowed();

for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  console[level] = (...args) => parentPort.postMessage({
    event: 'console', level: level === 'log' ? 'info' : level, message: format(...args),
  });
}

async function configure(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.nodes) || !Array.isArray(data.links)) {
    throw new Error('Workflow must contain nodes and links arrays');
  }
  // automatic replacement mappings (renamed types) change types while loading: check what loads
  const replacedType = (type) => {
    const mapping = LiteGraph.getNodeReplacement?.(type);
    return mapping?.auto && LiteGraph.settings?.get('LiteGraph.Packs.AutoReplace') !== false ? mapping.new_type : renamedType(type);
  };
  const isRegistered = (type) => Object.hasOwn(LiteGraph.registered_node_types, type);
  // validated loader: bounds, runtime-only fields, malformed links and the type policy, before
  // anything is constructed; a refusal carries the structured report to the client
  const checked = LiteGraph.validateGraphData(data, { allowType: typePolicy(isRegistered, { replacedType }) });
  if (!checked.ok) {
    let message = `Workflow refused: ${GraphLoader.formatReport(checked.report)}`;
    // type refusals keep the policy's message, with the settings that enable each type
    if (checked.report.issues.some((issue) => issue.code === 'type-refused')) {
      try { assertAllowedGraph(data, isRegistered, { replacedType }); } catch (error) { message = error.message; }
    }
    throw Object.assign(new Error(message), { report: checked.report });
  }
  data = checked.data;
  if (checked.report.issues.length) console.warn(`Workflow loaded with notes: ${GraphLoader.formatReport(checked.report, 10)}`);
  assertAllowedGraph(data, isRegistered, { replacedType }); // defence in depth: unchanged policy check
  for (const note of graphPolicyNotes(data)) console.warn(note); // shown in the runner page log
  const candidate = new LGraph();
  // execution errors name the failing node by its path ("3:7:2" inside subgraphs)
  candidate.events.on('node-error', (event) => {
    const { node, path, error } = event.detail;
    console.error(`Node error at ${path ?? '?'}${node?.type ? ` (${node.type})` : ''}: ${error?.message ?? error}`);
  });
  // node status, progress and errors in the shared execution-state shape (one message per change)
  candidate.events.on('execution-state', (event) => {
    parentPort.postMessage({ event: 'execution-state', message: event.detail.message });
  });
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

// a workflow that fails to load is reported to the first command (with its report), not thrown
let graph = null;
let loadError = null;
try { graph = await configure(JSON.parse(fs.readFileSync(workerData, 'utf8'))); }
catch (error) { loadError = error; }
const status = () => !graph ? 'error' : graph.status === LGraph.STATUS_RUNNING ? 'running' : 'stopped';

let commands = Promise.resolve();
parentPort.on('message', (message) => {
  commands = commands.then(() => handleCommand(message));
});

async function handleCommand({ requestId, action, serializedGraph, dropQueued }) {
  if (loadError) {
    parentPort.postMessage({ requestId, error: loadError.message, ...(loadError.report ? { report: loadError.report } : {}), status: 'error' });
    return;
  }
  try {
    let data = {};
    switch (action) {
      case 'start': {
        const reason = graph.getExecutionBlockReason();
        if (reason) throw new Error(reason);
        await graph.startAsync();
        break;
      }
      case 'stop': await graph.stopAsync({ dropQueued: dropQueued === true }); break;
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
        if (wasRunning && !graph.getExecutionBlockReason()) await graph.startAsync();
        data.serializedGraph = graph.serialize();
        break;
      }
      default: throw new Error(`Unknown command: ${action}`);
    }
    const executionBlocked = graph.getExecutionBlockReason();
    if (executionBlocked) data.executionBlocked = executionBlocked;
    parentPort.postMessage({ requestId, status: status(), iteration: graph.iteration, ...data });
  } catch (error) {
    parentPort.postMessage({ requestId, error: error.message, ...(error.report ? { report: error.report } : {}), status: status() });
  }
}
