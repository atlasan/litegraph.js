# Development state and validation

Start with the [2026-10-30 investigation](2026-10-30-study.md) for history, upstream/fork comparisons, branch selection, and baseline failures. The older `agents/analysis` material is historical, not a guarantee of tested behavior.

## Setup and commands

Validated with Node.js 22.23.4, Python 3, and the installed npm lockfile dependencies. From the repository root:

```sh
npm ci --ignore-scripts
npm run check
npm run editor
npm run graphrunner
```

`npm run check` rejects ESLint errors, builds all twelve artifacts, compiles strict TypeScript consumers, runs Jest and integration regressions, checks JavaScript syntax and initialized exports for every artifact, and verifies npm package contents plus ESM/CommonJS entry points. `--ignore-scripts` avoids installing native integration bindings during core validation; optional native integrations may require their normal installation steps. GitHub Actions runs this gate on Node 22/Linux. The CI workflow has been added; a remote run is not claimed.

Individual checks:

```sh
npm test -- --runInBand
npm run test:integration
npm run check:build
npm run check:types
npm run lint
```

Lint now passes with zero errors. `npm run check` runs it with `--quiet` to enforce errors without flooding CI output. `npm run lint` also shows the remaining style/unused-variable warnings; those remain a maintenance backlog and have not been broadly suppressed. Browser GPU/audio/MIDI nodes and optional external services are not covered by the automated gate.

The builder now finds local npm executables, runs them without shell argument loss, fails on missing sources/tool failures, and emits exported variables in CJS. The Node network nodes no longer overwrite the complete bundle's module.exports. Regenerated bundles include previously stale source changes and formatting; inspect source/build-script changes separately from generated diffs. The custom regular-expression transformer still only supports this repository's known source patterns.

## Library entry points

```js
import { LiteGraph, LGraph } from '@litegraph/litegraph';
const graph = new LGraph();
const constant = LiteGraph.createNode('basic/const');
graph.add(constant);
graph.runStep();
graph.clear();
```

CommonJS: `const { LiteGraph, LGraph } = require('@litegraph/litegraph')`.
Node-specific nodes: `require('@litegraph/litegraph/node')` or ESM import from that subpath. Browser consumers can use `/build/litegraph.js` directly. Direct source imports require initialization after classes load (`src/init_litegraph.js`); bundled entry points initialize themselves. Both `build/` and `build_node/` ship in the npm file list. No version bump or publication has been performed; package 0.10.10 and runtime a0.11.1 remain historical version identifiers pending a release decision.

## TypeScript and version policy

Use named imports from `@litegraph/litegraph` for the standard node catalog, `@litegraph/litegraph/core` for graph classes without the catalog, or `@litegraph/litegraph/node` for Node-specific nodes. All three support ESM and CommonJS with TypeScript `module`/`moduleResolution: "NodeNext"`. The core entry point is initialized and ready for custom node registration.

```ts
import { LiteGraph, LGraph, LGraphNode } from '@litegraph/litegraph/core';
class Counter extends LGraphNode {
    count = 0;
    onExecute() { this.count++; }
}
LiteGraph.registerNodeType('example/counter', Counter);
const graph = new LGraph();
const counter = LiteGraph.createNode<Counter>('example/counter');
if (counter) graph.add(counter);
await graph.whenReady();
graph.runStep(1, true);
await graph.clearAsync();
```

Prefer named imports: the historical ESM default export is the `LibraryManager` constructor, whereas the CommonJS default imported from ESM is the module namespace object. The `/node` entry uses CommonJS under both import styles. Its exported browser editor still requires a DOM; exporting a class does not make its runtime dependencies available in Node.

Core declarations live in `src/litegraph.d.cts`, shared by the ESM facades and catalog declarations to preserve class identity. `npm run check:types` uses pinned TypeScript 5.4.5, strict checking with `skipLibCheck: false`, ESM/CommonJS consumer fixtures, and a temporary consumer containing only the published declarations. It also compares value exports with the built main/core/Node modules and rejects phantom singleton members. Run `npm run build` first after runtime changes. This verifies covered graph/readiness/callback workflows and export shape; it is not exhaustive proof of every legacy method signature. Optional LiteGL objects remain `unknown` where this package cannot supply their types.

Package version `0.10.10` and runtime `a0.11.1` are historical identifiers, not a new release guarantee. Identify development builds by branch and commit. A future release should choose and align version metadata explicitly, rebuild, run the full gate, and review compatibility before publishing; this stabilization work does not publish or change version numbers.

## Initialization and dependencies

`LiteGraph.createNode()` remains synchronous. Nodes without dependencies complete initialization before it returns. Every node exposes `ready: Promise<LGraphNode>`, `initialization_state` (`loading`, `ready`, or `error`), and `initialization_error` on failure. Standalone registered classes and subclasses of `LGraphNode` both initialize once; constructor-registered callbacks survive. Direct subclass construction defers hooks until the subclass constructor has finished.

Declare `libraries` and/or `requiredLibraries` as arrays of registered library keys in the constructor. Both lists are deduplicated and loaded before the synchronous `onPostConstruct` hook. `onAdded` and `configure` remain synchronous and should not assume dependencies have loaded. Put resource acquisition in execution/start hooks after readiness, and release resources in stop/removal hooks. Initialization belongs to the node and does not cancel arbitrary library imports or custom asynchronous code. Removing a loading node releases graph readiness waits immediately; its own `ready` still settles independently. Moving it to another graph transfers which graph must wait for that node. Dependency failures on detached nodes do not prevent the remaining graph from starting.

```js
const node = LiteGraph.createNode('sys/fileRead'); // use the /node entry point
const graph = new LGraph();
graph.add(node);
try {
    await graph.whenReady(); // includes nested subgraphs
    await graph.startAsync(20); // true if started, false if canceled by stop/clear
} finally {
    graph.clear();
}
```

`start()` preserves immediate startup for ready graphs, but returns a Promise when dependencies are pending or failed. Use `startAsync()` when the caller needs a consistent awaitable result. Dependency failures reject startup and keep execution stopped. Manual `runStep()` skips loading/failed nodes; await `whenReady()` for a deterministic first step. Unsupported runtimes leave an inspectable disabled node whose `ready` rejects. Recreate a failed node after correcting its dependencies.

LibraryManager shares concurrent loads and propagates errors. Ordered local/npm dependency groups fall back to ordered remote groups; a group succeeds only when all its entries load. `defaultExport: true` selects the default export; a string selects a named export. `waitForLib()` initiates loading and rejects on load failure or its timeout. Failed library loads can be retried. Browser module detection remains heuristic; external service/native binding compatibility is not established by core checks.

## Execution and cleanup

`runStep(n)` advances `iteration` once per completed cycle. Per-cycle action/ancestor tracking is reset between cycles and after errors. The single-execution option also applies to iteration zero. Deferred actions run through `actionDo` and registered callbacks; actions queued while a node is draining its queue remain for the next cycle. A failing deferred action is consumed once, leaving the unprocessed queue available for recovery. Disabled nodes do not receive queued actions.

ON_REQUEST ancestors are refreshed in dependency order when explicitly requested or when the ancestor-refresh options are enabled. Ancestor refresh restores event delivery even if a node throws. The optional unique action-call guard breaks synchronous event cycles using the same action identity. Nested graph ports preserve both data and event payloads, including action identity.

Execution failures stop the graph and clear execution guards; propagation follows `do_not_catch_errors`/`LiteGraph.throw_errors`. `stop()` releases its timer before notifications and visits all nodes, including non-ALWAYS modes and disabled subgraphs. `clear()` detaches nodes/groups and clears queued actions and link references even when stop/removal hooks fail. Cleanup still reports failures: one error is rethrown, multiple errors are collected in `AggregateError`. Removing a node preserves graph indexes after failing connection or removal hooks; recursive removal hooks run once. Disconnection removes all selected links before notifying endpoints, continues notifications across endpoint failures, and reports errors after structural cleanup. Removal still runs and awaits resource hooks after connection errors. Connections to nodes currently being removed are rejected. Remove a node from its current graph before adding it to another.

Built-in server nodes close their servers on stop/removal and cancel pending retries. WebSocket teardown terminates connected clients, and UDP binds the configured host. The synchronous `stop()`, `clear()`, and `remove()` methods initiate cleanup immediately. Use `await graph.stopAsync()`, `await graph.clearAsync()`, or `await graph.removeAsync(node)` to also wait for Promise-returning stop/removal hooks. `whenIdle()` waits for cleanup already initiated, including nested graphs and work queued by pending cleanup. All registered/default hook promises are observed, even if later callbacks replace their return values. Asynchronous failures reject the awaitable APIs after other cleanup settles; `cleanup_error` retains the observed failure. Custom asynchronous cleanup must return its Promise.

Startup waits for pending cleanup. Runner stop/clear/update and unload now await these barriers; graph replacement starts only after the previous graph releases its resources. The manager's command timeout remains the fallback for a cleanup hook that never settles, and unload terminates the worker after a failed/timed-out clear.

## Editor and tester

- Editor: http://127.0.0.1:8000/
- Tester: http://127.0.0.1:8000/editor_tester/

The tester imports one initialized bundle, initializes once, and uses UIManager for main controls and node selection. It generates scenarios on demand, rather than constructing every registered node at startup. Filter for `basic/const`, click **Test**, and inspect the results. Test definitions produced by the generator run through TestFramework; basic-only generation no longer silently includes stress/performance scenarios. Input injection uses actual graph links. The framework awaits node readiness before setup/execution and uses linked inputs in its default path too. Async timeouts remain active until settlement, failed custom validation is reflected in status, and cleanup runs on failure.

Browser acceptance on 2026-10-31 covered node search/add, dragging connections, editing a numeric widget, stepping `-7 → abs → 7`, deleting the middle node, and restoring the saved graph. Subgraph entry/return and slider/toggle/text widgets also passed with no captured browser errors. See [reload evidence](evidence/editor-reload.jpg) and [widget evidence](evidence/editor-widgets.jpg). HTML node property editing, deletion, and save/reload also passed on 2026-11-01; [HTML evidence](evidence/editor-html.jpg). Tester `math/abs` passed all four scenarios with completed progress and 0.4% coverage; [tester evidence](evidence/tester-progress.jpg).

HTML and JSON-viewer overlays release their canvas callbacks and DOM elements on removal, recreate bindings when reinserted, preserve visibility through nested subgraph navigation, and position their content below scaled slots. Their default size reserves a visible content area. DOM lifecycle fixtures cover repeated removal, movement between canvas hosts, nested visibility, and scaling. HTML content is rendered as markup through the existing `html` property.

Generated and legacy scenarios now run through the same readiness/timeout/cleanup path, each in its own graph. **Stop Tests** aborts all active asynchronous phases, skips later validation and queued cases, and keeps the run active until cleanup settles or times out. Canceled cases are `skipped`; cleanup failures remain failures. Custom setup/execute callbacks receive `{ signal }` as a third argument, and custom validation receives it as a fourth argument. Cleanup is deliberately not aborted. Cases that never started have no result record.

Coverage counts distinct registered node types with a passed or failed result in the current run, excluding canceled/skipped cases; it is not code coverage. Progress measures processed node groups separately from pass rate. HTML result text is escaped, CSV fields are quoted and formula-like text neutralized, JSON preserves statistics maps, and JUnit marks skipped cases and escapes XML text. Markdown formatting is outside this escaping audit.

The generic scenarios are exploratory checks, not assertions that all node types share identical input/error contracts. A failing scenario needs node-specific review. Cancellation and timeouts cannot stop arbitrary user JavaScript or a synchronous infinite loop; an async callback that ignores its signal can still finish after cleanup. Stress/performance contracts, retries, and broad legacy scenario semantics still need review before treating the tool as a general isolation harness.

## Worker runner

The default address is http://127.0.0.1:3000/. It binds loopback by default. Optional environment settings are shown in `headless/graphrunner/.env.example`; copy to `.env` to override. `WORKFLOWS_DIR` is absolute or relative to `headless/graphrunner`, independent of the launch directory. An example constant-to-absolute-value graph ships in `workflows/example.json`.

1. Open `example.json` in the file list. Its worker is loaded and **stopped**.
2. **Start Execution** and **Stop Execution** wait for worker acknowledgments.
3. **Toggle Edit Mode**, edit the graph, then **Apply Edits** to replace the worker configuration. **Sync from Runner** retrieves the executing worker's serialized graph.
4. **Stop All** pauses loaded workers. **Unload** clears and terminates one worker; reopening reloads its file.

Edits are in memory and are not saved to the workflow file. Serialization returns graph configuration/properties, not a full live stream of slot values. Worker status responses include the execution iteration count. The HTTP list currently shows top-level JSON files only; protocol paths may address nested files within the root. Absolute paths, traversal and symlink escapes are rejected. Treat workflows as trusted programs: filesystem/process/network nodes are not sandboxed. There is no authentication or public-hosting support in this development runner.

The WebSocket address follows the browser host and protocol. Commands are ordered per connection and within each worker, and responses come from the worker. Initial load and replacement await node dependencies before acknowledgment; start awaits graph readiness. Errors and unexpected worker exits update clients rather than claiming successful execution. Shutdown waits for graph cleanup, with worker termination after a failed/timed-out clear command.

The browser displays connection state and allows one outstanding command at a time. A matching acknowledgment releases the controls; unrelated status broadcasts do not. After 15 seconds without an acknowledgment, it reports an unknown outcome and refreshes worker inventory. On disconnect, worker statuses become unknown and execution controls disable. Reconnect refreshes statuses and workflows without replaying commands or replacing the current local graph view. Sync retrieves worker configuration and can replace local edits; Apply sends the local configuration. Neither writes the JSON file.

Browser checks verified empty/loading states, open/start/stop acknowledgments, disconnect disabling, and reconnection after server restart. [Runner evidence](evidence/runner-reconnect.jpg) shows an acknowledged stopped worker. The runner bundle still warns when optional glmatrix is absent; this pure-node example does not validate Math3D behavior.

Protocol requests accept `{ "type": "...", "data": { ... }, "requestId": "optional-client-id" }`. Replies and errors echo the top-level request ID to the requester; legacy requests without IDs still work:

| Request | Payload | Response |
| --- | --- | --- |
| open_graph | file | graph_opened |
| control_graph | graphId, action: start/stop/status/clear | graph_status |
| update_graph | graphId, serializedGraph | graph_updated |
| request_sync | graphId | graph_sync |
| unload_graph | graphId | graph_status: unloaded |
| get_active_graphs | — | active_graphs |
| stop_all_graphs | — | active_graphs |

Server-side manager methods now return Promises; callers must await them. Successful status is `running`/`stopped`, not the command string `start`/`stop`. Failure responses remain `{ error }` internally and WebSocket `error` messages externally.

## Evidence and follow-up

The report records the pre-change baseline. Final verification results are recorded at the bottom of the investigation. The [readiness checklist](readiness.md) tracks the broader completion goal. Priority follow-up: node runtime/dependency documentation, optional integration fixtures, tester stress/performance contracts, and runner edit/apply/sync and worker-crash browser validation. Reproduce relevant upstream/fork defects locally before considering a port.
