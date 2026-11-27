// Node-type policy for graphs executed by the runner.
//
// Some Node.js node types run shell commands, read or change the file system, inspect the host,
// open listening servers, make outbound requests, reach databases, or load remote code. A workflow
// pushed over the WebSocket must not be able to use them unless the operator opts in. The check is
// recursive: inline subgraphs (`node.subgraph`) are inspected too.
//
// Script evaluation: nodes such as `math/formula`, `basic/script` and `objects/evaluate` compile code
// from their properties when `LiteGraph.allow_scripts` is true, which the Node.js build turns on by
// default. That code runs with full process rights, so the runner turns it off (see scriptsAllowed).
//
// Configuration (environment):
// - RUNNER_ALLOW_SYS=1: allow every registered type and script evaluation (trusted, local-only use).
// - RUNNER_ALLOW_SCRIPTS=1: let script nodes evaluate their code, without allowing the other types.
// - RUNNER_ALLOW_TYPES: comma-separated default-denied types to allow again. Entries can be
//   - a type: "sys/fileRead";
//   - a prefix ending in "/": "network/server/";
//   - a family from DENIED_FAMILIES: "@outbound", "@host-read", ...
//   e.g. RUNNER_ALLOW_TYPES=@outbound,sys/fileRead
// - RUNNER_DENY_TYPES: comma-separated extra types to deny; an entry ending in "/" denies a prefix.
//   It wins over RUNNER_ALLOW_TYPES.
// Types renamed by the catalog cleanup (RENAMED_TYPES) are still understood in both settings and in
// workflows (they load as the new type, which is the one checked).

/** Default-denied node types, by family; `@<family>` in RUNNER_ALLOW_TYPES re-allows a whole family. */
export const DENIED_FAMILIES = Object.freeze({
  'commands': { description: 'run shell commands, control processes and services', types: [
    'sys/runCommand', 'sys/processControl', 'sys/serviceManager',
  ] },
  'file-write': { description: 'write or delete files', types: ['sys/fileWrite', 'sys/fileDelete'] },
  'host-read': { description: 'read files and inspect the runner host', types: [
    'sys/fileRead', 'sys/fileList', 'sys/fileExists', 'sys/processList', 'sys/serviceList', 'sys/info',
    'sys/processInfo',
  ] },
  'servers': { description: 'open listening network servers on the runner host', types: [
    'network/server/websocket', 'network/server/socketio', 'network/server/osc',
    'network/server/udp', 'network/server/osc_bridge',
  ] },
  'outbound': { description: 'make requests from the runner host (HTTP, WebSocket, Socket.IO, WebRTC)', types: [
    'network/httprequest', 'network/websocket', 'network/socketio', 'network/webrtc', 'basic/file',
  ] },
  'databases': { description: 'connect to databases with credentials from the workflow', types: [
    'mysql/connection', 'mysql/query', 'mysql/insert', 'mysql/update', 'mysql/delete', 'mysql/transaction',
  ] },
  'remote-code': { description: 'load or register remote code, or compile code without allow_scripts', types: [
    'libraries/load', 'libraries/register', 'libraries/search_CDN_lib', 'geometry/eval',
  ] },
});

/** Old type names → current ones (catalog cleanup, Wave 4e); old prefixes map as prefixes. */
export const RENAMED_TYPES = Object.freeze({
  'server/network/websocketserver': 'network/server/websocket',
  'nodejs/network/SocketIO_server': 'network/server/socketio',
  'nodejs/network/OSC_server': 'network/server/osc',
  'nodejs/network/UDP_server': 'network/server/udp',
  'nodejs/network/osc_bridge': 'network/server/osc_bridge',
  'network/SocketIO': 'network/socketio',
  'server/process/NodeProcessInfo': 'sys/processInfo',
});

/**
 * Old prefixes → the exact current types they covered. A setting keeps its old meaning: allowing
 * `nodejs/network/` never also allows `network/server/websocket`, which was never under it.
 */
export const RENAMED_PREFIXES = Object.freeze({
  'nodejs/network/': ['network/server/socketio', 'network/server/osc', 'network/server/udp', 'network/server/osc_bridge'],
  'server/network/': ['network/server/websocket'],
  'server/process/': ['sys/processInfo'],
});

/** The current name of a renamed type, or null. */
export function renamedType(type) {
  return !type.endsWith('/') && Object.hasOwn(RENAMED_TYPES, type) ? RENAMED_TYPES[type] : null;
}

/** A setting entry or type with its renamed form (both are kept, so either name matches). */
const withRenames = (entry) => (RENAMED_PREFIXES[entry] ? [entry, ...RENAMED_PREFIXES[entry]]
  : RENAMED_TYPES[entry] ? [entry, RENAMED_TYPES[entry]] : [entry]);

export const DEFAULT_DENIED_TYPES = Object.freeze(Object.values(DENIED_FAMILIES).flatMap((family) => family.types));

const familyOf = (type) => Object.keys(DENIED_FAMILIES).find((name) => DENIED_FAMILIES[name].types.includes(type));

/** Node types that compile code from their properties only when `LiteGraph.allow_scripts` is true. */
export const SCRIPT_NODE_TYPES = Object.freeze(['math/formula', 'basic/script', 'objects/evaluate']);

/** Whether nodes may compile code from their properties (`LiteGraph.allow_scripts`) in the runner. */
export function scriptsAllowed(env = process.env) {
  return env.RUNNER_ALLOW_SYS === '1' || env.RUNNER_ALLOW_SCRIPTS === '1';
}

function unknownFamily(entry) {
  throw new Error(`RUNNER_ALLOW_TYPES: unknown family ${entry}; known: ${Object.keys(DENIED_FAMILIES).map((name) => '@' + name).join(', ')}`);
}

const listOf = (value) => (value || '').split(',').map((type) => type.trim()).filter(Boolean);

export function deniedTypes(env = process.env) {
  if (env.RUNNER_ALLOW_SYS === '1') return [];
  const allowed = listOf(env.RUNNER_ALLOW_TYPES).flatMap((entry) => entry.startsWith('@')
    ? (DENIED_FAMILIES[entry.slice(1)]?.types ?? unknownFamily(entry))
    : withRenames(entry));
  const defaults = DEFAULT_DENIED_TYPES.filter((type) => !isDenied(type, allowed));
  return [...defaults, ...listOf(env.RUNNER_DENY_TYPES).flatMap(withRenames)];
}

function isDenied(type, denied) {
  return denied.some((entry) => entry.endsWith('/') ? type.startsWith(entry) : type === entry);
}

function eachNode(data, visitNode, maxDepth = 64) {
  // subgraph definitions (ComfyUI form): every one is checked, used or not
  const definitionIds = new Set();
  const visit = (graph, depth, path) => {
    if (depth > maxDepth) throw new Error('Workflow subgraphs are nested too deeply');
    if (!graph || typeof graph !== 'object' || !Array.isArray(graph.nodes)) {
      if (depth === 0) throw new Error('Workflow must contain nodes and links arrays');
      throw new Error(`Subgraph ${path} must contain a nodes array`);
    }
    for (const definition of graph.definitions?.subgraphs ?? []) {
      if (definition && typeof definition.id === 'string') definitionIds.add(definition.id);
    }
    for (const definition of graph.definitions?.subgraphs ?? []) {
      visit(definition, depth + 1, `definition ${definition?.id}`);
    }
    for (const node of graph.nodes) {
      visitNode(node, path ? `${path}/${node?.id}` : String(node?.id), definitionIds);
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
 * @param {{env?: object, maxDepth?: number, replacedType?: (type: string) => string|null}} [options]
 *   replacedType: the type a node of `type` becomes while loading (an automatic replacement
 *   mapping), or null. The resulting type must be registered and allowed as well.
 * @throws {Error} on an unknown node type, or listing every denied type
 */
export function assertAllowedGraph(data, isRegistered, { env = process.env, maxDepth = 64, replacedType = renamedType } = {}) {
  const denied = deniedTypes(env);
  const extraDenied = listOf(env.RUNNER_DENY_TYPES).flatMap(withRenames);
  const refused = new Map(); // type -> node paths
  eachNode(data, (node, where, definitionIds) => {
    const type = node?.type;
    if (typeof type === 'string' && definitionIds.has(type)) return; // an instance of a checked definition
    const loadsAs = typeof type === 'string' ? replacedType(type) : null;
    if (typeof type !== 'string' || !(isRegistered(type) || (loadsAs && isRegistered(loadsAs)))) throw new Error(`Unknown node type: ${type} (node ${where})`);
    for (const checked of loadsAs ? [type, loadsAs] : [type]) {
      if (isDenied(checked, denied)) refused.set(checked, [...(refused.get(checked) ?? []), where]);
    }
  }, maxDepth);
  if (!refused.size) return;
  const list = [...refused].map(([type, nodes]) => `${type} (node ${nodes.join(', ')})`).join('; ');
  const byDenyList = [...refused.keys()].filter((type) => isDenied(type, extraDenied));
  const enable = [...refused.keys()].filter((type) => !byDenyList.includes(type));
  const hints = [];
  if (enable.length) {
    const families = [...new Set(enable.map(familyOf).filter(Boolean))];
    const familyHint = families.length ? `, or whole families with RUNNER_ALLOW_TYPES=${families.map((name) => '@' + name).join(',')}` : '';
    hints.push(`to enable, start the runner with RUNNER_ALLOW_TYPES=${enable.join(',')}${familyHint} (or RUNNER_ALLOW_SYS=1 to allow every restricted type)`);
  }
  if (byDenyList.length) hints.push(`${byDenyList.join(', ')} ${byDenyList.length > 1 ? 'are' : 'is'} refused by RUNNER_DENY_TYPES; remove ${byDenyList.length > 1 ? 'them' : 'it'} there`);
  throw new Error(`Node type not allowed in the runner: ${list}. ${hints.join('; ')}.`);
}

/**
 * The runner's type policy as a hook for the validated loader (`LiteGraph.validateGraphData`
 * option `allowType`): every node type the loader meets, at any depth, is checked against the
 * same denylist as assertAllowedGraph. The runner still runs assertAllowedGraph afterwards.
 * @param {(type: string) => boolean} isRegistered
 * @param {{env?: object, replacedType?: (type: string) => string|null}} [options]
 * @returns {(type: string) => true|string} true, or why the type is refused
 */
export function typePolicy(isRegistered, { env = process.env, replacedType = renamedType } = {}) {
  const denied = deniedTypes(env);
  return (type) => {
    const loadsAs = replacedType(type);
    if (!(isRegistered(type) || (loadsAs && isRegistered(loadsAs)))) return 'unknown node type';
    const refused = (loadsAs ? [type, loadsAs] : [type]).find((checked) => isDenied(checked, denied));
    if (!refused) return true;
    const family = familyOf(refused);
    return `${refused} is not allowed in the runner (RUNNER_ALLOW_TYPES=${family ? '@' + family : refused} enables it)`;
  };
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

/** Summary of the active policy, logged when the runner starts: one line per family. */
export function describePolicy(env = process.env) {
  if (env.RUNNER_ALLOW_SYS === '1') return 'Runner policy: RUNNER_ALLOW_SYS=1, every node type and script evaluation is allowed.';
  const denied = deniedTypes(env);
  const lines = ['Runner policy (allow with RUNNER_ALLOW_TYPES=<type>,<prefix/>,@<family>, or everything with RUNNER_ALLOW_SYS=1):'];
  for (const [name, family] of Object.entries(DENIED_FAMILIES)) {
    const refused = family.types.filter((type) => denied.includes(type));
    const state = refused.length === family.types.length ? 'refused'
      : refused.length ? `partly allowed (refused: ${refused.join(', ')})` : 'allowed';
    lines.push(`  @${name}: ${state}; ${family.description} (${family.types.join(', ')})`);
  }
  const extra = listOf(env.RUNNER_DENY_TYPES);
  if (extra.length) lines.push(`  RUNNER_DENY_TYPES: ${extra.join(', ')}`);
  lines.push(scriptsAllowed(env)
    ? '  scripts: allowed (RUNNER_ALLOW_SCRIPTS=1)'
    : '  scripts: off; math/formula, basic/script, objects/evaluate output nothing (enable with RUNNER_ALLOW_SCRIPTS=1)');
  return lines.join('\n');
}
