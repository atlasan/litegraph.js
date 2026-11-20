# Codebase map

> **Updated** 2026-11-20 · **Kind** reference · **Status** living · **Base** `LG/dev` after Wave 4d

This is a map for finding things, not a contract; contracts are in [docs/development.md](../../../docs/development.md). Paths are relative to the repository root. The [node runtime catalog](node-runtime-catalog.md) covers node families in depth.

## Layout

| Path | What it is |
|---|---|
| `src/` | The library, as ES modules |
| `src/nodes/` | Node catalog: 23 files in the standard build, plus 3 Node-only files in `nodejs_only/` |
| `src/extensions/` | `autoconnect`, `renamer`, `keyboard_helper`, `quick_connect`, `subgraph_tools`, `node_packs`, `view_tools` (registered extensions); `comfy_interop` (ComfyUI JSON import and export) |
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
| `nodesearch.js` | `NodeSearch` (`LiteGraph.nodeSearch`): query parsing (`i:` `o:` `c:` `s:`), ranking, definition filters; used by the search box |
| `contextmenu.js`, `curveeditor.js` | DOM menus; curve widget helper |
| `dragandscale.js`, `canvaspointer.js`, `linkconnector.js`, `reroute.js` | View transform, pointer gestures, link-drag state machine, reroutes |
| `lgraph.js`, `lgraphnode.js`, `llink.js`, `lgraphgroup.js`, `subgraph.js`, `subgraphdefs.js` | The graph model |
| `lgraphcanvas.js` | Rendering and interaction, about 9.5k lines |
| `librarymanager.js` | Optional library loading and manifest |
| `executionstate.js` | `ExecutionState` (`LiteGraph.ExecutionState`): the v1 execution-state messages (`create`, `isMessage`, `apply` by path, `applyToNode`, `clear`) (Wave 4b) |
| `linkrender.js`, `minimap.js` | `RenderLink`, `LinkRouterRegistry` (`LiteGraph.linkRouters`), `LinkStyleRegistry` (`LiteGraph.linkStyles`); `MiniMap` (Wave 4c) |
| `layout.js`, `palette.js` | `LayoutRegistry` (`LiteGraph.layout`: dagre via LibraryManager, layered, ELK adapter); `NodePalette` (`LiteGraph.palette`) (Wave 4d) |
| `packs.js` | `PackRegistry` (`LiteGraph.packs`): pack manifests, type attribution, index, version ranges, replacement mappings; `replaceNodeInGraph` (Wave 4a) |
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
  - **Contents:** `_nodes`, `_groups`, `links` (an object keyed by id), `reroutes` (a Map), `floating_links` (a Map), `state.last*Id`, `revision`.
  - **Serialization:** `serialize()` writes `version: 0.4` and keeps unknown top-level fields. Reroutes go to `extra.reroutes`, in ComfyUI form; floating links go to `floatingLinks`, and the reroutes only they use carry `floating: {slotType}`.
  - **Floating links:** `LGraphNode._disconnectLinks` keeps a removed link's reroute chain on the remaining end (`_keepFloatingLink`); `routeLink(link, parentId)` re-attaches it. Conversion and unpack suspend this (`_withoutFloatingLinks`).
  - **Transactions:** `transact(label, fn, {rollback})` records one history entry. Undo history (`actionHistory*`) records only when `LiteGraph.actionHistory_enabled` is set; it is off in the core and on in the editor defaults.
  - **Repair:** `validateLinks({repair})` repairs dangling links and back-pointers, for the current graph only.
- **LGraphNode**
  - **Slots:** `addInput` / `addOutput`, `connect`, `connectByType`, `disconnect*`, `findInputSlot*`.
  - **Widgets:** `addWidget(type, name, value, cb, options)` returns a `BaseWidget`. `options.socket` / `addWidgetInput` create a widget input. `serialize_widgets` controls whether values are saved.
  - **Readiness:** `ready`, `initialization_state`, `libraries`, `requiredLibraries`, `onPostConstruct`.
- **LLink:** serialized as a 6-element array; `parentId` points at the reroute chain.
- **LGraphGroup:** a Float32Array bounding box; nested `_nodes` and `_groups`; `resizeTo(items)`, `fitToContents()`, `setNodesMode(mode)`.
- **Reroute:** `id`, `pos`, `parentId`. Its design is credited to Comfy-Org standalone (MIT).
- **Subgraph** (`subgraph.js`, `subgraphdefs.js`; [Wave 3 plan](../../plans/2026-11-20-wave3-subgraph-system.md)):
  - **Runtime:** each instance owns its own `LGraph` (`node.subgraph`); `graph/input` / `graph/output` nodes map to the host's slots by name and carry `properties.slot_id`.
  - **Definitions:** `rootGraph.subgraphs` (Map id → definition, ComfyUI shape) is the source for linked content; an instance names its definition in `properties.subgraph_id`. `SubgraphDefs` (pure JSON) converts between inline instances and `definitions.subgraphs` (`-10`/`-20` links). `LGraph.configure` builds the inner graph of every instance that references a definition; `serialize({format})` writes the registry, and in `"definitions"` format (ComfyUI; the default, `LiteGraph.subgraph_format`) references instead of inline graphs. Instances keep stored fields they do not model (`kept_fields`, e.g. ComfyUI `widgets_values`). History snapshots stay inline.
  - **Linked instances:** `commitDefinition` (the canvas calls it on `closeSubgraph`) refreshes the others (`refreshFromDefinition`: outer slots matched by slot id, then name); `makeUnique`; `Subgraph.onAdded` links equal inserted content and forks different content under a known id. A root save takes instances edited by code (inner `revision` moved since `_definition_revision`).
  - **Authoring (3b):** canvas `drawBreadcrumb` / `getBreadcrumbAt` / `closeSubgraphTo` (front canvas); `Subgraph.exposeSlot` (link release menu), `moveInterfaceSlot` (IO node menu); promoted widgets: `_findPromotions` (interface input → inner widget input), `_syncPromotedWidgets` (instance widgets, values from `widgets_values`), `_applyPromoted` (writes the inner widget and property), `serialize` restores inner defaults. `closeSubgraph` commits only when the inner revision moved. Commands in `extensions/subgraph_tools.js`.
  - **Components and blueprints (3c):** `LiteGraph.registerSubgraphType` → `Subgraph.componentClass` (inner graph from the definition; instances serialize as `graph/subgraph` with `properties.component`); `LiteGraph.subgraph_components`; `updateFromSource` / `hasSourceUpdate` and an update badge provider. `LGraph.insertDefinition` (copy or linked; `_addDefinitionCopy` remaps nested ids) and `insertBlueprint`; canvas "Insert subgraph" (`LGraphCanvas.onMenuInsertSubgraph`).
  - **Paths:** `LGraphNode.getPath()` ("3:7:2"), `LGraph.resolvePath`; `doExecute` attaches the failing node to the error, and `node-error` carries `{node, path}`.
  - **Function node:** `graph/function` (`NodeFunction extends Subgraph`) calls a definition: `call` → inputs, one step, outputs → `done`; own copy per node; recursion refused, `NodeFunction._depth` limited by `LiteGraph.subgraph_max_depth`.
  - **Change stream and saved state (Wave 4b):** `_emit` notes the kind of typed change events (`CHANGE_KINDS`); a recorded change (`onGraphChanged` with doSave, once per transaction) calls `_reportChange` → `graph-changed`, bubbled to the root with kind `subgraph`. Changes no history entry records are flushed once in a microtask (`_scheduleChangeFlush`) and set `_modifiedExtra`. Call sites that record and then emit use `_markChange(kind)` + `_emit(..., {recorded: true})`. `isModified` = revision ≠ `_savedRevision` or `_modifiedExtra`; configure (reason load) sets the saved revision.
  - **Execution state (Wave 4b):** `runStep` calls `reportExecutionState(node, "status", {status: "done"})` when a node's state is not already done; the catch reports `error` on the failing node; root `start()` reports `reset`. `node.execution_state` is runtime only. The canvas draws it in `drawNodeShape` (title-box colour, `drawNodeExecutionOverlay`); the title text goes through `drawNodeTitleText` (icon first).
  - **Auto-layout (Wave 4d):** `autoLayout` builds a model (`LayoutRegistry.buildModel`: boxes with titles, links between nodes in scope), awaits the engine (loading its library first), then applies positions anchored at the old top-left in one `transact("autoLayout")`; reroutes move by the mean shift of their link's ends; groups wholly made of moved nodes are fitted. `LiteGraph.registerBuiltinLibraries()` (called by `initialize`) registers `dagre`.
  - **Missing types and replacement (Wave 4a):** a missing type loads as a plain `LGraphNode` placeholder (`has_errors`, `last_serialization`, title = type) that serializes back unchanged. `getMissingNodes({deep})`; root `configure` emits `missing-nodes {report, reason}` (`reason` "history" / "rollback" when undo or a failed transaction reloads). `replaceNode` / `replaceNodes` run `PackRegistry.replaceNodeInGraph` in a transaction: same id, link objects moved to mapped slots (ids and reroutes kept), unplaceable links removed and returned as `dropped`. `_applyAutoReplacements` runs `auto` mappings during configure inside a discarded transaction (no history, no revision).
  - **Conversion:** `LGraph.convertToSubgraph(nodes)` / `unpackSubgraph(node)` (on `Subgraph.buildFromNodes` / `unpack`): one undo step, rolled back on failure.

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
| `LiteGraph.packs` (Wave 4a) | `register(manifest, setup)` attributes types registered in `setup` (and those in `manifest.nodes`) via `_onTypeRegistered`, called by `registerNodeType`; `open`/`close` do the same for built-in node files (`litegraph/<family>`, `builtin: true`); `index` (known, not installed); `packOf`, `findPackForType`, `describe`; `stampFor` (used by `createNode`); `registerReplacement` (`LiteGraph.registerNodeReplacement`). Settings `LiteGraph.Packs.*` |
| Widgets | `LiteGraph.registerWidgetType(type, BaseWidget subclass)`. Built-in: button, toggle, slider, number, combo, text; aliases boolean, enum, string |

## Canvas

- **Owned objects:** `ds` (DragAndScale), `pointer` (CanvasPointer), `linkConnector` (made by `_createLinkConnector`, which re-emits its `link-drag-start` / `link-drag-end`). The `connecting_*` fields are accessors over `linkConnector`.
- **Input:** `processMouseDown`, `processMouseMove`, `processMouseUp`, `processMouseWheel` and `processKey`.
- **Gestures:** drags are `pointer` handlers set at pointer down: `_dragNodesGesture`, `_dragGroupGesture`, `_dragRerouteGesture`, `_linkDragGesture` (drop in `_dropLink`), `_linkCenterGesture`. While handlers are set, `processMouseMove` returns early; `processMouseUp` skips the empty-canvas deselect and node `onMouseUp` for a handled gesture. The legacy `node_dragged` / `connecting_*` move and up paths remain for code that sets those fields directly.
- **Title decorations:** `getNodeTitleDecorations` lays out title buttons (`node.title_buttons`) and badges (`LiteGraph.nodeBadges.collect`); `drawNodeTitleDecorations` caches it on `node._title_decorations` for hit testing. Group header toggle: `getGroupToggleRect`, `toggleGroupMuted`.
- **Selection:** `selectedItems` covers nodes, groups and reroutes. Also `selectItem`, `moveSelected`, `deleteSelected`, `groupSelected`, and the event `selection-changed`.
- **Clipboard:** `serializeSelection()` produces a fragment (nodes, links, reroute chains, groups). `insertFragment(fragment, pos)` inserts one with fresh ids in one undo step; copy and paste use both.
- **Links (Wave 4c):** `renderLinkPath` resolves one style per link (`resolveLinkStyle`, context cached per frame) and passes it to each segment; `renderLink(ctx, a, b, link, …, num_sublines, {style, source})` builds a `RenderLink`, skips hidden links (not pushed to `visible_links`), and draws through `getLinkRouter()` (`link_router` name, else `links_render_mode`). `computeConnectionPoint` and `getLinkPolyline` use the router too.
- **Minimap and pan (Wave 4c):** `showMinimap` creates a `MiniMap` in the canvas's parent element; `dispose` removes it. Panning is `_dragCanvasGesture` (left drag on empty canvas, middle drag); when another gesture already owns the pointer (a group) only the legacy flag is set. Space-key panning still uses `dragging_canvas`.
- **Drop:** `processDrop` inserts a node for `LGraphCanvas.NODE_DRAG_MIME` data through `LiteGraph.palette.insert` before the file-drop handling (Wave 4d). The Editor's `NodePalettePanel` (in `litegraph-editor.js`) uses it.
- **Drawing:**
  - `drawBackCanvas`: background, groups, links.
  - `drawFrontCanvas`: nodes, overlays, tooltips.
  - Widgets are drawn by `drawNodeWidgets`; changes emit `widget-changed`.
- **Search and menus:** `showSearchBox` matches titles, aliases and descriptions. The canvas and node menus collect `LiteGraph.menus` contributions.

## Runner

- **Workers:** each graph runs in a `worker_threads` worker (`graphManager.js`), which loads `build_node/litegraph_nodejs.full.cjs`.
- **Security:**
  - `security.js` checks Origin and Host.
  - `nodePolicy.js` refuses `sys/runCommand`, `sys/fileWrite`, `sys/fileDelete`, `sys/processControl`, `sys/serviceManager`, `libraries/load`, `libraries/register`, `libraries/search_CDN_lib` and `geometry/eval`, recursively up to depth 64, plus the D1 families (see `describePolicy`). The type an `auto` replacement mapping loads as is checked too (`replacedType`, Wave 4a).
  - Scripts are off unless `RUNNER_ALLOW_SYS=1`.
- **Protocol:** see [docs/development.md](../../../docs/development.md#graph-runner). Workers post `execution-state` messages; `graphManager.setExecutionStateCallback` → `wsHandler` broadcasts `execution_state {graphId, message}` (Wave 4b).

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
