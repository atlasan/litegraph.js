// Node-type policy for graphs executed by the runner.
//
// Some Node.js node types run shell commands, read or change the file system, control processes and
// services, open listening network servers, or load remote code. A workflow pushed over the WebSocket
// must not be able to use them unless the operator opts in. The check is recursive: inline subgraphs
// (`node.subgraph`) are inspected too.
//
// Script evaluation: nodes such as `math/formula`, `basic/script` and `objects/evaluate` compile code
// from their properties when `LiteGraph.allow_scripts` is true, which the Node.js build turns on by
// default. That code runs with full process rights, so the runner turns it off (see scriptsAllowed).
//
// Configuration (environment):
// - RUNNER_ALLOW_SYS=1: allow every registered type and script evaluation (trusted, local-only use).
// - RUNNER_ALLOW_TYPES: comma-separated default-denied types to allow again, e.g.
//   "sys/fileRead,nodejs/network/OSC_server"; an entry ending in "/" allows a prefix
//   ("nodejs/network/" allows every network server node).
// - RUNNER_DENY_TYPES: comma-separated extra types to deny; an entry ending in "/" denies a prefix.
//   It wins over RUNNER_ALLOW_TYPES.

export const DEFAULT_DENIED_TYPES = Object.freeze([
  // shell commands, file system changes, process and service control
  'sys/runCommand',
  'sys/fileWrite',
  'sys/fileDelete',
  'sys/processControl',
  'sys/serviceManager',
  // reads any file the runner user can read
  'sys/fileRead',
  // open listening network servers on the runner host
  'server/network/websocketserver',
  'nodejs/network/SocketIO_server',
  'nodejs/network/OSC_server',
  'nodejs/network/UDP_server',
  'nodejs/network/osc_bridge',
  // load or register remote code
  'libraries/load',
  'libraries/register',
  'libraries/search_CDN_lib',
  'geometry/eval', // compiles its `code` property without checking LiteGraph.allow_scripts
]);

/** Whether nodes may compile code from their properties (`LiteGraph.allow_scripts`) in the runner. */
export function scriptsAllowed(env = process.env) {
  return env.RUNNER_ALLOW_SYS === '1';
}

const listOf = (value) => (value || '').split(',').map((type) => type.trim()).filter(Boolean);

export function deniedTypes(env = process.env) {
  if (env.RUNNER_ALLOW_SYS === '1') return [];
  const allowed = listOf(env.RUNNER_ALLOW_TYPES);
  const defaults = DEFAULT_DENIED_TYPES.filter((type) => !isDenied(type, allowed));
  return [...defaults, ...listOf(env.RUNNER_DENY_TYPES)];
}

function isDenied(type, denied) {
  return denied.some((entry) => entry.endsWith('/') ? type.startsWith(entry) : type === entry);
}

/**
 * Validate every node in a serialized graph, including nested inline subgraphs.
 * @param {object} data serialized graph
 * @param {(type: string) => boolean} isRegistered
 * @param {{env?: object, maxDepth?: number}} [options]
 * @throws {Error} on the first unknown or denied node type
 */
export function assertAllowedGraph(data, isRegistered, { env = process.env, maxDepth = 64 } = {}) {
  const denied = deniedTypes(env);
  const visit = (graph, depth, path) => {
    if (depth > maxDepth) throw new Error('Workflow subgraphs are nested too deeply');
    if (!graph || typeof graph !== 'object' || !Array.isArray(graph.nodes)) {
      if (depth === 0) throw new Error('Workflow must contain nodes and links arrays');
      throw new Error(`Subgraph ${path} must contain a nodes array`);
    }
    for (const node of graph.nodes) {
      const type = node?.type;
      const where = path ? `${path}/${node?.id}` : String(node?.id);
      if (typeof type !== 'string' || !isRegistered(type)) throw new Error(`Unknown node type: ${type} (node ${where})`);
      if (isDenied(type, denied)) {
        throw new Error(`Node type not allowed in the runner: ${type} (node ${where}); set RUNNER_ALLOW_SYS=1 to permit it`);
      }
      if (node.subgraph !== undefined && node.subgraph !== null) visit(node.subgraph, depth + 1, where);
    }
  };
  visit(data, 0, '');
}
