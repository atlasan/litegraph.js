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

`npm run check` builds all twelve artifacts, runs Jest and integration regressions, checks JavaScript syntax and initialized exports for every artifact, and verifies npm package contents plus ESM/CommonJS entry points. `--ignore-scripts` avoids installing native integration bindings during core validation; optional native integrations may require their normal installation steps. GitHub Actions runs this gate on Node 22/Linux. The CI workflow has been added; a remote run is not claimed.

Individual checks:

```sh
npm test -- --runInBand
npm run test:integration
npm run check:build
npm run lint
```

Lint is a separate diagnostic because the baseline had 55 errors and 1,906 warnings (the current follow-up has 50 errors and 1,879 warnings). The stabilization changes do not claim to resolve the repository-wide lint backlog. Browser GPU/audio/MIDI nodes and optional external services are not covered by the automated gate.

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

## Initialization and dependencies

`LiteGraph.createNode()` remains synchronous. Nodes without dependencies complete initialization before it returns. Every node exposes `ready: Promise<LGraphNode>`, `initialization_state` (`loading`, `ready`, or `error`), and `initialization_error` on failure. Standalone registered classes and subclasses of `LGraphNode` both initialize once; constructor-registered callbacks survive. Direct subclass construction defers hooks until the subclass constructor has finished.

Declare `libraries` and/or `requiredLibraries` as arrays of registered library keys in the constructor. Both lists are deduplicated and loaded before the synchronous `onPostConstruct` hook. `onAdded` and `configure` remain synchronous and should not assume dependencies have loaded. Put resource acquisition in execution/start hooks after readiness, and release resources in stop/removal hooks. Initialization does not cancel arbitrary library imports or custom asynchronous code.

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

## Editor and tester

- Editor: http://127.0.0.1:8000/
- Tester: http://127.0.0.1:8000/editor_tester/

The tester imports one initialized bundle, initializes once, and uses UIManager for main controls and node selection. It generates scenarios on demand, rather than constructing every registered node at startup. Filter for `basic/const`, click **Test**, and inspect the results. Test definitions produced by the generator run through TestFramework; basic-only generation no longer silently includes stress/performance scenarios. Input injection uses actual graph links. The framework awaits node readiness before setup/execution and uses linked inputs in its default path too. Async timeouts remain active until settlement, failed custom validation is reflected in status, and cleanup runs on failure.

The generic scenarios are exploratory checks, not assertions that all node types share identical input/error contracts. A failing scenario needs node-specific review. A timeout cannot cancel arbitrary user JavaScript or stop a synchronous infinite loop; a timed-out async callback can still finish later. The legacy custom scenario runner and complex stress/cancellation behavior require further work before treating the tool as a general isolation harness.

## Worker runner

The default address is http://127.0.0.1:3000/. It binds loopback by default. Optional environment settings are shown in `headless/graphrunner/.env.example`; copy to `.env` to override. `WORKFLOWS_DIR` is absolute or relative to `headless/graphrunner`, independent of the launch directory. An example constant-to-absolute-value graph ships in `workflows/example.json`.

1. Open `example.json` in the file list. Its worker is loaded and **stopped**.
2. **Start Execution** and **Stop Execution** wait for worker acknowledgments.
3. **Toggle Edit Mode**, edit the graph, then **Apply Edits** to replace the worker configuration. **Sync from Runner** retrieves the executing worker's serialized graph.
4. **Stop All** pauses loaded workers. **Unload** clears and terminates one worker; reopening reloads its file.

Edits are in memory and are not saved to the workflow file. Serialization returns graph configuration/properties, not a full live stream of slot values. Worker status responses include the execution iteration count. The HTTP list currently shows top-level JSON files only; protocol paths may address nested files within the root. Absolute paths, traversal and symlink escapes are rejected. Treat workflows as trusted programs: filesystem/process/network nodes are not sandboxed. There is no authentication or public-hosting support in this development runner.

The WebSocket address follows the browser host and protocol. Commands are ordered per connection and within each worker, and responses come from the worker. Initial load and replacement await node dependencies before acknowledgment; start awaits graph readiness. Errors and unexpected worker exits update clients rather than claiming successful execution. Shutdown waits for graph cleanup, with worker termination after a failed/timed-out clear command.

Protocol requests retain `{ "type": "...", "data": { ... } }`:

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

The report records the pre-change baseline. Final verification results are recorded at the bottom of the investigation. The [readiness checklist](readiness.md) tracks the broader completion goal. Priority follow-up: graph-specific ON_REQUEST/deferred-action fixtures, cleanup after throwing callbacks, canvas interaction tests, real network/resource lifecycle fixtures, declarations/version parity, and remaining tester scenario contracts. Reproduce relevant upstream/fork defects locally before considering a port.
