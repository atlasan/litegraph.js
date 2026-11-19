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
// - RUNNER_ALLOW_SCRIPTS=1: let script nodes evaluate their code, without allowing the other types.
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

/** Node types that compile code from their properties only when `LiteGraph.allow_scripts` is true. */
export const SCRIPT_NODE_TYPES = Object.freeze(['math/formula', 'basic/script', 'objects/evaluate']);

/** Whether nodes may compile code from their properties (`LiteGraph.allow_scripts`) in the runner. */
export function scriptsAllowed(env = process.env) {
  return env.RUNNER_ALLOW_SYS === '1' || env.RUNNER_ALLOW_SCRIPTS === '1';
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

function eachNode(data, visitNode, maxDepth = 64) {
  const visit = (graph, depth, path) => {
    if (depth > maxDepth) throw new Error('Workflow subgraphs are nested too deeply');
    if (!graph || typeof graph !== 'object' || !Array.isArray(graph.nodes)) {
      if (depth === 0) throw new Error('Workflow must contain nodes and links arrays');
      throw new Error(`Subgraph ${path} must contain a nodes array`);
    }
    for (const node of graph.nodes) {
      visitNode(node, path ? `${path}/${node?.id}` : String(node?.id));
      if (node?.subgraph !== undefined && node?.subgraph !== null) visit(node.subgraph, depth + 1, path ? `${path}/${node.id}` : String(node.id));
    }
  };
  visit(data, 0, '');
}

/**
 * Validate every node in a serialized graph, including nested inline subgraphs.
 * All refused types are reported together, with the setting that enables them.
 * @param {object} data serialized graph
 * @param {(type: string) => boolean} isRegistered
 * @param {{env?: object, maxDepth?: number}} [options]
 * @throws {Error} on an unknown node type, or listing every denied type
 */
export function assertAllowedGraph(data, isRegistered, { env = process.env, maxDepth = 64 } = {}) {
  const denied = deniedTypes(env);
  const extraDenied = listOf(env.RUNNER_DENY_TYPES);
  const refused = new Map(); // type -> node paths
  eachNode(data, (node, where) => {
    const type = node?.type;
    if (typeof type !== 'string' || !isRegistered(type)) throw new Error(`Unknown node type: ${type} (node ${where})`);
    if (isDenied(type, denied)) refused.set(type, [...(refused.get(type) ?? []), where]);
  }, maxDepth);
  if (!refused.size) return;
  const list = [...refused].map(([type, nodes]) => `${type} (node ${nodes.join(', ')})`).join('; ');
  const byDenyList = [...refused.keys()].filter((type) => isDenied(type, extraDenied));
  const enable = [...refused.keys()].filter((type) => !byDenyList.includes(type));
  const hints = [];
  if (enable.length) hints.push(`to enable, start the runner with RUNNER_ALLOW_TYPES=${enable.join(',')} (or RUNNER_ALLOW_SYS=1 to allow every restricted type)`);
  if (byDenyList.length) hints.push(`${byDenyList.join(', ')} ${byDenyList.length > 1 ? 'are' : 'is'} refused by RUNNER_DENY_TYPES; remove ${byDenyList.length > 1 ? 'them' : 'it'} there`);
  throw new Error(`Node type not allowed in the runner: ${list}. ${hints.join('; ')}.`);
}

/**
 * Notes for a graph that loads but will not do everything it could, e.g. script nodes while
 * script evaluation is off. Each note says how to turn the feature on.
 * @returns {string[]}
 */
export function graphPolicyNotes(data, env = process.env) {
  if (scriptsAllowed(env)) return [];
  const found = new Map();
  try {
    eachNode(data, (node, where) => {
      if (SCRIPT_NODE_TYPES.includes(node?.type)) found.set(node.type, [...(found.get(node.type) ?? []), where]);
    });
  } catch { return []; }
  if (!found.size) return [];
  const list = [...found].map(([type, nodes]) => `${type} (node ${nodes.join(', ')})`).join('; ');
  return [`Script evaluation is off in the runner, so these nodes output nothing: ${list}. To enable, start the runner with RUNNER_ALLOW_SCRIPTS=1 (their code then runs with the runner's full rights).`];
}

/** One-line summary of the active policy, logged when the runner starts. */
export function describePolicy(env = process.env) {
  if (env.RUNNER_ALLOW_SYS === '1') return 'Runner policy: RUNNER_ALLOW_SYS=1, every node type and script evaluation is allowed.';
  const denied = deniedTypes(env);
  const allowed = DEFAULT_DENIED_TYPES.filter((type) => !denied.includes(type));
  return [
    `Runner policy: ${denied.length} node types refused (${denied.join(', ')}).`,
    allowed.length ? `Re-allowed by RUNNER_ALLOW_TYPES: ${allowed.join(', ')}.` : 'Enable chosen ones with RUNNER_ALLOW_TYPES=<type,prefix/>, or all with RUNNER_ALLOW_SYS=1.',
    scriptsAllowed(env) ? 'Script nodes evaluate code (RUNNER_ALLOW_SCRIPTS=1).' : 'Script nodes (math/formula, basic/script, objects/evaluate) are off; enable with RUNNER_ALLOW_SCRIPTS=1.',
  ].join(' ');
}
