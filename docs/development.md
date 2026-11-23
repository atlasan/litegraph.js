# Development

Setup, the validation gate and the package contracts. The full stabilization record, including acceptance runs and screenshots, is in [agents/executions](../agents/executions/README.md). Working rules are in [AGENTS.md](../AGENTS.md).

## Setup

Requires Node.js 22 and Python 3.

```sh
npm ci --ignore-scripts
npm run check        # the gate: run before every commit that touches code
npm run editor       # http://127.0.0.1:8000/  (editor_build.html loads the extensions)
npm run graphrunner  # http://127.0.0.1:3000/
```

| Command | What it does |
|---|---|
| `npm run check` | Lint errors, all 12 builds, strict type consumers, Jest, node:test integration, package check. CI runs it on Node 22 / Linux |
| `npm run build` | `build.py`: regenerates `build/` and `build_node/`. Commit the output separately |
| `npm test` / `npm run test:integration` | Jest (`test/`) / node:test (`tools/tests/`) |
| `npm run check:fresh` | Rebuilds and fails when `build/` or `build_node/` differ from what is committed. CI runs the same check after `npm run check` |
| `npm run check:types` | Strict ESM and CJS consumers against `src/litegraph.d.cts`, plus export parity with the built modules |
| `npm run lint` | ESLint, with warnings (the gate fails on errors only) |
| `npm run docs` | JSDoc from `src/` into [docs/api](api/index.html); the plugin `docs/jsdoc-ts-types.cjs` turns TypeScript-style types JSDoc cannot parse into `function` / `Object` / `*` and keeps the original in the description |

`--ignore-scripts` skips native integration bindings. Browser GPU, audio and MIDI nodes, and external services, are outside the gate.

## Entry points

| Import | Contents |
|---|---|
| `@litegraph/litegraph` | Graph classes and the standard node catalog |
| `@litegraph/litegraph/core` | Graph classes only, initialized and ready for registration |
| `@litegraph/litegraph/node` | Adds Node-only nodes (`sys`, `process`, `network`); CommonJS under both import styles |
| `build/litegraph.js` | Browser bundle |

All three package entries support ESM and CommonJS (`moduleResolution: "NodeNext"`). Prefer named imports: the historical ESM default export is `LibraryManager`.

Importing directly from `src/` requires initialization after the classes load (`src/init_litegraph.js`). Bundles initialize themselves.

```js
import { LiteGraph, LGraph } from '@litegraph/litegraph';
const graph = new LGraph();
graph.add(LiteGraph.createNode('basic/const'));
await graph.whenReady();
graph.runStep();
```

**Versions:** `LiteGraph.VERSION` equals the package version (`0.18.0-dev.2`); `build.py --update-version` keeps them in step. Identify development builds by branch and commit. A release needs an explicit version decision.

**Scripts:** `LiteGraph.allow_scripts` is off in every bundle (since Wave 5a no library build includes editor defaults; `check:build` enforces it). The editor app turns it on for its own pages; the runner keeps it off unless `RUNNER_ALLOW_SCRIPTS=1`.

## Contracts

### Initialization

- `createNode()` is synchronous.
- Each node exposes `ready` (a Promise), `initialization_state` (`loading`, `ready` or `error`) and `initialization_error`.
- Libraries listed in a node's `libraries` / `requiredLibraries` load before `onPostConstruct`. `onAdded` and `configure` must not assume they are loaded.
- `graph.whenReady()` waits for every node, including nodes in nested subgraphs.
- `startAsync()` resolves `true` once the graph has started, or `false` if `stop()` or `clear()` cancelled the start.
- A dependency failure rejects startup.
- `runStep()` skips nodes that are still loading or have failed.

### Execution

- `runStep(n)` advances `iteration` once per cycle.
- **Actions:** deferred actions drain through `actionDo`. Actions queued while a node is draining its queue run in the next cycle.
- **ON_REQUEST:** ancestors refresh in dependency order. An optional guard breaks synchronous event cycles.
- **Errors:** an error stops the graph. `LiteGraph.throw_errors` decides whether it propagates.

### Cleanup

- `stop()`, `clear()` and `remove()` start cleanup immediately.
- `stopAsync()`, `clearAsync()`, `removeAsync()` and `whenIdle()` also wait for cleanup hooks that return a Promise.
- Cleanup continues past hooks that throw. One error is rethrown; several are combined into an `AggregateError`.

### Edits and undo

- Wrap user edits in `graph.transact(label, fn)`, so that each one is one undo step.
- `beforeChange` / `afterChange` are hooks only.

### Platform

Introduced in Wave 1:
- **Registries:** `LiteGraph.commands`, `keybindings`, `settings` and `menus`.
- **Extensions:** `LiteGraph.registerExtension` (with disposal).
- **Widgets:** `LiteGraph.registerWidgetType`.
- **Node definitions:** `static def`, `getNodeDefinition`, `declareCapabilities`.
- **Libraries:** `describeLibraries()` and `probeLibraries()`.

[CHANGES.md](../CHANGES.md) lists them.

## Graph runner

`apps/runner` (formerly `headless/graphrunner`) executes graphs pushed from its browser page. Each graph runs in its own worker. The runner binds to loopback by default. Settings are in `.env.example`: `WORKFLOWS_DIR`, `RUNNER_ALLOWED_HOSTS`, `RUNNER_DENY_TYPES`, `RUNNER_ALLOW_SYS`.

**Security:**
- **Connections:** the WebSocket accepts only same-origin pages and the runner's own host names.
- **Node types:** workflows containing shell, file-write, process or service, or remote-library nodes are refused at any subgraph depth (`nodePolicy.js`).
- **Scripts:** script evaluation is off.
- **Trusted use:** `RUNNER_ALLOW_SYS=1` lifts the node-type and script restrictions.
- **Not covered:** there is no authentication. Treat workflows as trusted programs. Decision D1 in the [roadmap](../agents/plans/roadmap.md) covers stricter defaults.

Requests have the form `{type, data, requestId?}`. Replies echo `requestId`.

| Request | Payload | Response |
|---|---|---|
| `open_graph` | `file` | `graph_opened` |
| `control_graph` | `graphId`, `action`: start / stop / status / clear | `graph_status` |
| `update_graph` | `graphId`, `serializedGraph` | `graph_updated` |
| `request_sync` | `graphId` | `graph_sync` |
| `unload_graph` | `graphId` | `graph_status: unloaded` |
| `get_active_graphs` / `stop_all_graphs` | — | `active_graphs` |

Broadcasts, without a request: `graph_status`, `active_graphs`, `console {graphId, level, message}`, and `execution_state {graphId, message}`. The message is the shared execution-state shape (`LiteGraph.ExecutionState`, protocol `v: 1`): `{v, kind: status | progress | error | reset, path, status, value?, max?, message?, time}`, one per change of a node's state; `path` is the node's path ("3:7" inside a subgraph). An editor applies one with `graph.applyExecutionState(message)`; the runner page does so for the open workflow and keeps the states per workflow (`apps/runner/public/execution-view-state.js`), so a tab switch redraws them. Nodes run by actions or pulls send `running` then `done`.

Edits are applied in memory only; nothing is written back to the workflow file.

## Editor and tester

| Page | Notes |
|---|---|
| `apps/editor/index.html` | Loads `src/` modules without the extensions |
| `apps/editor/editor_build.html` | Loads the built bundle with extensions, commands and key bindings |
| `apps/tester/` | Generates per-node scenarios, with optional performance and stress runs. Coverage counts node types, not code |
