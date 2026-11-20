# Codebase map

> **Updated** 2026-11-19 · **Kind** reference · **Status** living · **Base** `LG/dev` after Wave 1

This is a map for finding things, not a contract; contracts are in [docs/development.md](../../../docs/development.md). Paths are relative to the repository root. The [node runtime catalog](node-runtime-catalog.md) covers node families in depth.

## Layout

| Path | What it is |
|---|---|
| `src/` | The library, as ES modules |
| `src/nodes/` | Node catalog: 23 files in the standard build, plus 3 Node-only files in `nodejs_only/` |
| `src/extensions/` | `autoconnect`, `renamer`, `keyboard_helper` (registered extensions); `comfy_interop` (ComfyUI JSON import and export) |
| `build/`, `build_node/` | Committed bundles: 6 ESM and 6 CJS (see Build and test) |
| `editor/` | Demo editor. `index.html` loads `src/` without extensions; `editor_build.html` loads the bundle with extensions |
| `editor_tester/` | Browser tester that generates per-node scenarios |
| `headless/graphrunner/` | WebSocket runner: Express + `ws`, one worker per graph |
| `headless/examples/` | Node scripts that run graphs from `build_node/` |
| `experiments/` | Bounded probes (`comfy-interop/`) |
| `tools/` | Gate scripts (`check-build`, `check-types`), node:test suites, fixtures |
| `test/` | Jest suites |
| `csharp/` | Experimental C#/Unity port, untouched since 2023 |

## Core modules

Listed in build order (`build.py` `lib_js_files`):

| Module | Role |
|---|---|
| `global.js` | Global object access; runtime detection: `isBrowser`, `isNode`, `isBun` |
| `litegraph.js` | `LiteGraphClass`: constants, node registry, factory, platform setup; the global singleton (`:1504`) |
| `callbackhandler.js` | Prioritised multi-handler hooks ([callbacks](../../../docs/callbacks.md)) |
| `eventtarget.js` | `LGraphEventTarget`: typed events with `on` / `once` / `off` / `dispatch` |
| `commands.js`, `keybindings.js`, `settings.js`, `menus.js`, `extensionregistry.js` | Wave 1 platform registries |
| `contextmenu.js`, `curveeditor.js` | DOM menus; curve widget helper |
| `dragandscale.js`, `canvaspointer.js`, `linkconnector.js`, `reroute.js` | View transform, pointer gestures, link-drag state machine, reroutes |
| `lgraph.js`, `lgraphnode.js`, `llink.js`, `lgraphgroup.js`, `subgraph.js` | The graph model |
| `lgraphcanvas.js` | Rendering and interaction, about 9.5k lines |
| `librarymanager.js` | Optional library loading and manifest |
| `widgets.js` | `BaseWidget` and its subclasses; the safe arithmetic parser |
| `init_litegraph.js` | Calls `LiteGraph.initialize()`; last in the build, so bundles initialize themselves |
| `litegraph-editor.js` | `Editor` shell; included in full builds only |
| `*.d.ts`, `*.d.cts` | Type declarations. `litegraph.d.cts` is the core one, checked for parity with runtime exports |

## Initialization

1. The constructor of `LiteGraphClass` does not initialize anything.
2. `initialize()` (`litegraph.js:253`) sets up callbacks, attaches the class references, then creates the `LibraryManager`, then calls `setupPlatform()`. That creates `commands`, `keybindings`, `settings`, `menus`, `widget_types` and `extensions`.
3. Finally it registers the `graph/*` subgraph types.
4. A bundle and `src/` imports in one page share **one** global `LiteGraph`.

## Graph model

- **LGraph**
  - **Contents:** `_nodes`, `_groups`, `links` (an object keyed by id), `reroutes` (a Map), `state.last*Id`, `revision`.
  - **Serialization:** `serialize()` writes `version: 0.4` and keeps unknown top-level fields. Reroutes go to `extra.reroutes`, in ComfyUI form.
  - **Transactions:** `transact(label, fn, {rollback})` records one history entry. Undo history (`actionHistory*`) records only when `LiteGraph.actionHistory_enabled` is set; it is off in the core and on in the editor defaults.
  - **Repair:** `validateLinks({repair})` repairs dangling links and back-pointers, for the current graph only.
- **LGraphNode**
  - **Slots:** `addInput` / `addOutput`, `connect`, `connectByType`, `disconnect*`, `findInputSlot*`.
  - **Widgets:** `addWidget(type, name, value, cb, options)` returns a `BaseWidget`. `options.socket` / `addWidgetInput` create a widget input. `serialize_widgets` controls whether values are saved.
  - **Readiness:** `ready`, `initialization_state`, `libraries`, `requiredLibraries`, `onPostConstruct`.
- **LLink:** serialized as a 6-element array; `parentId` points at the reroute chain.
- **LGraphGroup:** a Float32Array bounding box; nested `_nodes` and `_groups`.
- **Reroute:** `id`, `pos`, `parentId`. Its design is credited to Comfy-Org standalone (MIT).
- **Subgraph:**
  - **Model:** inline. The node owns an `LGraph`, and `graph/input` / `graph/output` nodes map to the host's slots.
  - **Conversion:** `buildFromNodes` is **unfinished**; it creates no nodes. Conversion is planned for Wave 2 and subgraph v2 for Wave 3 (ADR 0001).

## Execution

- **`runStep`** (`lgraph.js:472`) does three things per node, in execution order:
  1. drains deferred actions (`executePendingActions`)
  2. runs `doExecute()` for **ALWAYS** nodes only
  3. emits `execution-step`
  - On error it emits `node-error`, stops, and rethrows (`throw_errors` is true by default).
- **Order:** topological levels, with ties broken by `priority`. Only nodes with an `onExecute` take part.
- **Other modes:**
  - **ON_EVENT:** receives actions only.
  - **ON_TRIGGER:** executes when `triggerSlot` reaches it.
  - **ON_REQUEST (4):** runs only through `refreshAncestors`, triggered by `getInputData(slot, false, true)` or the `refreshAncestorsOn*` flags.
- **Event and action slots:** `EVENT` and `ACTION` both equal -1. Actions on a node that has an `onExecute` are deferred to its next execution unless `use_deferred_actions` is off.
- **Optional guards** (all off by default): `ensureUniqueExecutionAndActionCall`, `ensureNodeSingleExecution`, `ensureNodeSingleAction`.
- **Two hook systems coexist:** the CallbackHandler (about 100 hook names) and typed events. Merging them into one pipe is planned for Wave 2.

## Platform layer (Wave 1)

| API | Shape |
|---|---|
| `LiteGraph.commands` | `register({id, run(ctx), label, category, when, mutatesGraph})` returns a disposer. Also `execute`, `list`, `isEnabled` |
| `LiteGraph.keybindings` | Default, user and unset layers. `add({combo, commandId})`, `setUserBinding`, `export/importUserLayer`. The canvas checks bindings first |
| `LiteGraph.settings` | `define({id, default, bind, migrate, onChange})`, `get`, `set`, `setStorage` |
| `LiteGraph.menus` | `register("canvas" or "node", provider)`; items may be `{command: id}` |
| `LiteGraph.registerExtension` | `{name, requires, setup(ctx)}`. `ctx` offers `commands`, `keybindings`, `settings`, `menus`, `on`, `onEvent`, `onTarget`, `onCanvas`, `addDisposer`. Disposal runs in reverse order |
| Node definitions | `static def` merged with the classic statics. `getNodeDefinition`, `listNodeDefinitions`, `declareCapabilities`, `isNodeTypeSupported`, `getNodeSearchText` |
| `LibraryManager` | `registerLibrary({key, version, globalObject, browser, server})`, `loadLibrary`, `waitForLib`. Manifest: `describeLibraries`, `probeLibraries`. Remote server code is off by default |
| Widgets | `LiteGraph.registerWidgetType(type, BaseWidget subclass)`. Built-in: button, toggle, slider, number, combo, text; aliases boolean, enum, string |

## Canvas

- **Owned objects:** `ds` (DragAndScale), `pointer` (CanvasPointer), `linkConnector`. The `connecting_*` fields are accessors over `linkConnector`.
- **Input:** `processMouseDown`, `processMouseMove`, `processMouseUp`, `processMouseWheel` and `processKey`.
- **Gestures:**
  - Only the reroute drag uses `pointer.onDrag*` handlers so far (`_dragRerouteGesture`).
  - Node, group and link drags move in Wave 2.
- **Selection:** `selectedItems` covers nodes, groups and reroutes. Also `selectItem`, `moveSelected`, `deleteSelected`, and the event `selection-changed`.
- **Drawing:**
  - `drawBackCanvas`: background, groups, links.
  - `drawFrontCanvas`: nodes, overlays, tooltips.
  - Widgets are drawn by `drawNodeWidgets`; changes emit `widget-changed`.
- **Search and menus:** `showSearchBox` matches titles, aliases and descriptions. The canvas and node menus collect `LiteGraph.menus` contributions.

## Runner

- **Workers:** each graph runs in a `worker_threads` worker (`graphManager.js`), which loads `build_node/litegraph_nodejs.full.cjs`.
- **Security:**
  - `security.js` checks Origin and Host.
  - `nodePolicy.js` refuses `sys/runCommand`, `sys/fileWrite`, `sys/fileDelete`, `sys/processControl`, `sys/serviceManager`, `libraries/load`, `libraries/register`, `libraries/search_CDN_lib` and `geometry/eval`, recursively up to depth 64.
  - Scripts are off unless `RUNNER_ALLOW_SYS=1`.
- **Protocol:** see [docs/development.md](../../../docs/development.md#graph-runner).

## Build and test

| Output (`build/*.js` and `build_node/*.cjs`) | Contents | Registered types under Node |
|---|---|---|
| `litegraph.core` | Core only | 4 (`graph/*`) |
| `litegraph`, `litegraph.mini` | Core + nodes | 249 |
| `litegraph.full`, `litegraph.full.mini` | + editor, extensions, `defaults_debug.js` | 249 |
| `litegraph_nodejs.full` | + `nodejs_only` | 267 |

- **Minification:** `mini` builds are `uglifyjs -c`; the others are beautified. CJS is produced by a regex conversion in `build.py`.
- **Package exports:** `.`, `./core`, `./node` (ESM and CJS), plus `./build/*` wildcards that Wave 5 removes.
- **Tests:**
  - Jest: 25 files, 344 tests, in `test/`.
  - node:test: 16 files, 88 tests, in `tools/tests/`; covers the runner, tester, network lifecycle, upstream issues and undeclared names.

## Known traps

- **`allow_scripts`:** false in the core, **true in every `*.full*` bundle** (because `defaults_debug.js` is part of the build), and toggleable from the `math/formula` widget. The runner resets it.
- **Unbuilt node files:** six node files are in no build: `device`, `jquery`, `threejs`, `libraries/osc`, `libraries/udp`, `nodejs_mysql`.
- **Gated families:** geometry, glfx and math3d register fewer types without `GL` or `glMatrix`.
- **`instanceof LGraphNode` is unreliable**, because registration copies methods. Use `LGraphCanvas.isNodeItem`.
- **`active_canvas`** is set on pointer down and on keydown. Prefer `this`.
- See also the gotchas in [AGENTS.md](../../../AGENTS.md#gotchas).
