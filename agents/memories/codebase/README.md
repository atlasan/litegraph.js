# Codebase map

> **Updated** 2026-11-24 · **Kind** reference · **Status** living · **Base** `LG/dev` after Wave 4e

This is a map for finding things, not a contract; contracts are in [docs/development.md](../../../docs/development.md). Paths are relative to the repository root. The [node runtime catalog](node-runtime-catalog.md) covers node families in depth.

## Layout

| Path | What it is |
|---|---|
| `src/` | The library, as ES modules |
| `src/nodes/` | Node catalog: 23 files in the standard build, plus 3 Node-only files in `nodejs_only/` |
| `src/extensions/` | `autoconnect`, `renamer`, `keyboard_helper`, `quick_connect`, `subgraph_tools`, `node_packs`, `view_tools`, `node_pin` (pin style by mode and state, pin quick menu, node mode commands), `graph_status` (execution model chip) (registered extensions); `comfy_interop` (ComfyUI JSON import and export) |
| `build/`, `build_node/` | Committed bundles: 6 ESM and 6 CJS (see Build and test) |
| `lg.sh`, `lg.bat`, `tools/lg/` | Launcher: the wrappers pick Bun, else Node (`LG_RUNTIME`), and run `tools/lg/lg.mjs` (commands, menu); `core.mjs` (arguments, runtime choice, ports, app table), `state.mjs` (pid records, health, detached start, stop), `term.mjs` (colours, symbols). State in the git-ignored `.lg/` (`LG_STATE_DIR`) |
| `apps/editor/` | Demo editor (served at `/editor/` and `/apps/editor/` by `apps/editor/server.js`, which also serves `/docs` and `createEditorApp()`; runs on Node and Bun). `index.html` loads `src/` without extensions; `editor_build.html` loads the bundle with extensions; `js/defaults.js?preset=debug|mobile|event_based` is the one defaults module. `examples/index.json` is the examples manifest; `js/examples.js` builds the Demo menu and collapsible example explanations from it and `LiteGraph.packs.listTemplates()`; `examples/essentials/` holds six focused lessons |
| `apps/tester/` | Browser tester that generates per-node scenarios (also served at `/editor_tester/`) |
| `apps/runner/` | WebSocket runner: Express + `ws`, one worker per graph, on Node or Bun; `headless/graphrunner/server/index.js` is a shim that starts it |
| `vendor/` | Third-party browser libraries (litegl, gl-matrix, audiosynth, midi-parser, dds, sillyclient), formerly `editor/js/libs/`; the GL nodes use the global `gl` |
| `headless/examples/` | Node scripts that run graphs from `build_node/` |
| `experiments/` | Bounded probes (`comfy-interop/`) |
| `tools/ci/`, `.github/workflows/validate.yml` | Local CI (`npm run ci:local`, `lg ci`): `ci.mjs` (clean clones under `.lg/ci/work/`, parallel runs, steps, reports in `.lg/ci/runs/`, notes, PR comments, the GitHub switch), `core.mjs` (arguments, step table, log parsers, summary line, `report.md`), `pack-smoke.mjs` (the packed-install checks). The workflow is gated on the repository variable `LG_GITHUB_CI` = `on` (off by default) |
| `tools/` | Gate scripts (`check-build`, `check-types`), node:test suites, fixtures; `node-reference.mjs` (`npm run docs:nodes`: the node reference in `docs/nodes/`, and the catalog loader the catalog test uses); `hook-docs.mjs` (`npm run docs:callbacks`: the generated hook and event tables of `docs/callbacks.md`) |
| `test/` | Jest suites |
| `csharp/` | Experimental C#/Unity port, untouched since 2023 |

## Core modules

Listed in build order (`build.py` `lib_js_files`):

| Module | Role |
|---|---|
| `global.js` | Global object access; runtime detection: `isBrowser`, `isNode`, `isBun` |
| `litegraph.js` | `LiteGraphClass`: constants, node registry, factory, platform setup; the global singleton (`:1504`) |
| `callbackhandler.js` | Prioritised, vetoable hooks around the `onX` callbacks; `installHooks(Class)` gives LiteGraph, graphs, nodes, groups and canvases the hook API ([callbacks](../../../docs/callbacks.md)) |
| `eventtarget.js` | `ListenerList` (the listener core: priority order, copy-on-write, `signal`; the dispatch tap) and `LGraphEventTarget` (typed events: `on` / `once` / `off` / `dispatch`, `"*"`) |
| `commands.js`, `keybindings.js`, `settings.js`, `menus.js`, `extensionregistry.js` | Wave 1 platform registries |
| `nodesearch.js` | `NodeSearch` (`LiteGraph.nodeSearch`): query parsing (`i:` `o:` `c:` `s:`), ranking, definition filters; used by the search box |
| `contextmenu.js`, `curveeditor.js` | DOM menus; curve widget helper |
| `dragandscale.js`, `canvaspointer.js`, `linkconnector.js`, `reroute.js` | View transform, pointer gestures, link-drag state machine, reroutes |
| `lgraph.js`, `lgraphnode.js`, `llink.js`, `lgraphgroup.js`, `subgraph.js`, `subgraphdefs.js` | The graph model |
| `graphloader.js` | `GraphLoader` (`LiteGraph.validateGraphData`): the validated loader for untrusted documents (pure JSON): count, nesting, size and coordinate bounds (`LiteGraph.Loader.*` settings), runtime-only fields dropped, link checks, `allowType` hook, `{ok, data, report}`; `graph.configureValidated` and `graph.load()` use it |
| `lgraphcanvas.js` | Rendering and interaction, about 9.5k lines |
| `librarymanager.js` | Optional library loading and manifest |
| `executionstate.js` | `ExecutionState` (`LiteGraph.ExecutionState`): the v1 execution-state messages (`create`, `isMessage`, `apply` by path, `applyToNode`, `clear`) (Wave 4b) |
| `linkrender.js`, `minimap.js` | `RenderLink`, `LinkRouterRegistry` (`LiteGraph.linkRouters`), `LinkStyleRegistry` (`LiteGraph.linkStyles`); `MiniMap` (Wave 4c) |
| `layout.js`, `palette.js` | `LayoutRegistry` (`LiteGraph.layout`: dagre via LibraryManager, layered, ELK adapter); `NodePalette` (`LiteGraph.palette`): palette plus definition-only `starterPreview` and grouped, transactional `insertStarter` (HMD first pass) |
| `packs.js` | `PackRegistry` (`LiteGraph.packs`): pack manifests, type attribution, index, version ranges, replacement mappings; `replaceNodeInGraph` (Wave 4a) |
| `widgets.js` | `BaseWidget` and its subclasses (`ColorWidget`, `VectorWidget` included); `widgetImplementation` (follows a changed `type` on built-in instances; a plain object's own `draw`/`mouse` wins for types without a pre-value-types class); the safe arithmetic parser |
| `valuetypes.js` | `ValueTypeRegistry` (`LiteGraph.valueTypes`): type → canvas widget, panel editor, options, coerce / validate / format / parse, help; aliases and base types; `resolveEditor`, `resolveWidgetClass` |
| `panels.js` | `PanelBuilder` (what `createPanel` returns: sections, tabs, toolbar, typed rows; `showGraphOptions`, `showNode`), `PanelHost` (dock side, width, resize), `defaultPanelEditors`; contributed sections (`LiteGraph.panel_sections`) |
| `init_litegraph.js` | Calls `LiteGraph.initialize()`; last in the build, so bundles initialize themselves |
| `litegraph-editor.js` | `Editor` shell, including `showStarterGenerator` (pack/category preview, insertion and metadata export); included in full builds only |
| `*.d.ts`, `*.d.cts` | Type declarations. `litegraph.d.cts` is the core one, checked for parity with runtime exports |

## Initialization

1. The constructor of `LiteGraphClass` does not initialize anything.
2. `initialize()` (`litegraph.js:253`) attaches the class references (hook registries are created when a handler is first registered), then creates the `LibraryManager`, then calls `setupPlatform()`. That creates `commands`, `keybindings`, `settings`, `menus`, `widget_types` and `extensions`.
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
  - **Execution state (Wave 4b):** `runStep` calls `reportExecutionState(node, "status", {status: "done"})` when a node's state is not already done; the catch reports `error` on the failing node; root `start()` reports `reset`. `node.execution_state` is runtime only. The canvas draws it in `drawNodeShape` (the pin through `drawNodePin`, `drawNodeExecutionOverlay`); the title text goes through `drawNodeTitleText` (icon first).
  - **Auto-layout (Wave 4d):** `autoLayout` builds a model (`LayoutRegistry.buildModel`: boxes with titles, links between nodes in scope), awaits the engine (loading its library first), then applies positions anchored at the old top-left in one `transact("autoLayout")`; reroutes move by the mean shift of their link's ends; groups wholly made of moved nodes are fitted. `LiteGraph.registerBuiltinLibraries()` (called by `initialize`) registers `dagre`.
  - **Missing types and replacement (Wave 4a):** a missing type loads as a plain `LGraphNode` placeholder (`has_errors`, `last_serialization`, title = type) that serializes back unchanged. `getMissingNodes({deep})`; root `configure` emits `missing-nodes {report, reason}` (`reason` "history" / "rollback" when undo or a failed transaction reloads). `replaceNode` / `replaceNodes` run `PackRegistry.replaceNodeInGraph` in a transaction: same id, link objects moved to mapped slots (ids and reroutes kept), unplaceable links removed and returned as `dropped`. `_applyAutoReplacements` runs `auto` mappings during configure inside a discarded transaction (no history, no revision).
  - **Reroutes across the boundary (Wave 4e):** `buildFromNodes` captures the chains of links touching the selection, keeps the points outside the selection's box on the outer links (reusing the reroute objects) and recreates the inside points in the inner graph (`subgraphAppendReroutes`, no history entry); unused outer reroutes are dropped. `unpack` joins the outer chain before an input, the inner chain (offset, created once per inner link) and the outer chain after an output.
  - **Conversion:** `LGraph.convertToSubgraph(nodes)` / `unpackSubgraph(node)` (on `Subgraph.buildFromNodes` / `unpack`): one undo step, rolled back on failure.

## Execution

- **Execution models (Wave 6b):** `src/execution.js` holds `ExecutionEngine` and the model registry (`registerModel`; built in `ancestors`, `step`, `strict`, `event`, plus `legacy`). `ExecutionEngine.rulesFor(graph)` resolves the root's `config.execution`; a document loaded without it (`_execution_from_document`) is `legacy`, a new graph uses `resolveDefaultModel()` (`LiteGraph.default_execution_model`, `legacy` once a legacy flag was assigned: the flags are prototype accessors defined in `litegraph.js` with `LEGACY_EXECUTION_FLAGS`, noting assignments in `_legacy_flags_assigned`). New root documents write the resolved model on serialize (`_serializeConfig`). `graph.setExecutionModel(name)` is one transaction.
  - **Delegation:** `triggerSlot`, `actionDo`, `doExecute`, `getInputData(force)`, `runStep`, `Subgraph.onAction` keep the old code for `legacy` and use the engine otherwise (`ExecutionEngine.triggerSlot`, `enter`, `pull`/`ensureFresh`, `enterBoundary`, `flushInner`).
  - **Call scopes (flows step 4):** `ExecutionEngine._scope` is `{id, parent}`, a new object per opening. Roots: `runStep` (`frame_N`, per step, unless a scope is open) and `_dispatchEvent` (`call_N`, `openRoot`). Children (`scopeFor(node, tag)` + `inScope`): `triggerSlot` per output of a node declaring `branches` (Sequence, `<id>.sK`), `iterate(node, k, fn)` in FOR/ForEach/WHILE (`<id>.iK`), `NodeFunction.call` (`<id>.fK`). Outside legacy `options.action_call` defaults to `scopeId`; logic/IF tells its own step turn by `graph._step_node`. Legacy opens no child scope and keeps its uuid and Sequence `Math.random` ids.
  - **Ancestors memo:** `setOutputData` stamps `link._data_version` (global counter); a run records `node._exec_memo {scope, stamp, props, graph, values}` (`remember`). `isFresh`: same `_props_version` (bumped by `setProperty` through `ExecutionEngine.touch`) and same `graph._version` (`onGraphChanged`), no newer input stamp, then same scope object, or deterministic (`pure` and not `volatile`) with the same property values (`values`, `sameValues`). `refresh(node)` drops the memo and runs `ensureFresh`; a refresh input (`refresh: true` ACTION slot) is intercepted in `ExecutionEngine.deliver` and `actionDo`. `_pulling` drops triggers fired during a pull (`refreshing`).
  - **Declarations (Wave 6c):** `describeNodeType` normalizes `static def.execution` / `base_class.execution` (`ExecutionEngine.normalizeDeclaration`); packs declare in bulk with `LiteGraph.declareNodeExecution` at the end of their file. `ExecutionEngine.validModes` / `isModeValid` / `modeRefusal` back `changeMode` (sets `node.mode_refusal`), the panel and menus (`LiteGraph.getValidNodeModes`) and `LGraphGroup.setNodesMode` (non-enumerable `skipped`). `createNode` records `_constructed_mode`; `LGraph.add` (not while configuring) applies `declaredDefaultMode`. `emit: "immediate"` and `immediate_inputs` are honoured in `ExecutionEngine.triggerSlot`/`deliver`; `ticks` blocks forced re-runs; `pure: "volatile"` normalizes to `pure: true, volatile: true` (memo per scope; skipped by `pure-always` and by `modelModes` when ALWAYS); `branches` opens a scope per output. `check` also reports `volatile-loop-input` (`volatileSource`). `ExecutionEngine.check` → `graph.checkExecution()` (cached on the root as `_execution_issues` for the badge provider in `setupPlatform`). `LGraphCanvas.showExecutionNotice` shows refusals.
  - **Graph info and event-run states (Wave 6d):** the canvas menu's "Options (execution: …)" (`LiteGraph.showCanvasOptions`) opens `showShowGraphOptionsPanel` with the model combo (`setExecutionModel`) and "Apply the model's node modes" (`applyExecutionModelModes`). `doExecute` (outside the node's own step turn, `graph._step_node`) and `actionDo` report `running` → `done` once per change (`_reportRunStart` / `_reportRunDone`). A pull also runs an ALWAYS origin that never ran (`requestOrigins`, first value).
  - **Reporting:** `ExecutionEngine.drop(node, reason, {setting})` emits `event-dropped` on the root (only with listeners) and warns once per node and reason. Errors from event entry points go through `LGraphNode._dispatchEvent` → `LGraph._reportNodeError` (Wave 6a).
- **`runStep`** (`lgraph.js`) increments `graph._frame`, sets `_stepping` and (outside legacy, when no scope is open) a root call scope, then per node in execution order:
  1. drains queued actions (`executePendingActions`): under `legacy` when `use_deferred_actions`, otherwise under a deferred model or when a queue exists
  2. under `ancestors`, pulls the node's ON_REQUEST inputs (`ExecutionEngine.pull`)
  3. runs `doExecute()` for **ALWAYS** nodes only (`graph._step_node` marks its own turn), reporting `done` once per change
  4. emits `execution-step`
  - On error it reports through `_reportNodeError` (`node-error` + `error` state), stops, and rethrows (`throw_errors` is true by default).
- **Order:** topological levels, with ties broken by `priority`. Only nodes with an `onExecute` take part.
- **Other modes:**
  - **ON_EVENT:** receives actions only.
  - **ON_TRIGGER:** executes when `triggerSlot` reaches it.
  - **BYPASS (4):** the node's code does not run.
    - `doExecute` and `actionDo` call `ExecutionEngine.passThrough` instead: data outputs take their fitting input, and `actionDo` also forwards the event to the event outputs.
    - Events to a bypassed node are delivered at once.
    - It takes its step turn and is pulled through.
  - **ON_REQUEST (5; 4 before mode numbering 2):** under `legacy`, runs only through `refreshAncestors` (`getInputData(slot, true, true)` or the `refreshAncestorsOn*` flags); under the models, through the engine's pulls.
  - **Mode numbering:** `LGraph.migrateModes`, called by root `configure`, renumbers documents from before numbering 2 by their `litegraph_version` / `litegraph_modes` markers ([decision 0004](../decisions/0004-mode-4-bypass.md)).
- **Exec slots** (`onTrigger` / `onExecuted`, `LGraphNode.isExecSlot`):
  - **Placement:** they are appended and placed by the exec-slot layout (`LiteGraph.execSlotLayouts`, setting `LiteGraph.Node.ExecSlotLayout`). `getExecSlotPos` feeds `getConnectionPos`, the row counts, `getSlotsHeight`, `computeSize`, `getSlotDir` (link curves) and `isPointInside`, which adds a half-slot margin.
  - **Creation:** `ExecutionEngine.execSlotsFor(graph)` decides whether an event drop creates them: the setting `LiteGraph.Node.ExecSlots`, then an assigned `do_add_triggers_slots`, then the model rule `exec_slots`, which is on for `ancestors`.
- **Event and action slots:** `EVENT` and `ACTION` both equal -1. Under `legacy`, actions on a node that has an `onExecute` are deferred to its next execution unless `use_deferred_actions` is off; under the models, the model's `delivery` decides (`emit: "immediate"` and `immediate_inputs` override it).
- **Legacy guards** (flags, all off by default, deprecated): `ensureUniqueExecutionAndActionCall`, `ensureNodeSingleExecution`, `ensureNodeSingleAction`, `preventAncestorRecalculation`.
- **Hooks and typed events share one core (Wave 7):**
  - **Hooks intercept.** About 100 `onX` names; the assigned `onX` is the default handler. `CallbackHandler.run` calls only `onX` when no handler is registered, isolates handler errors and rethrows the first one after the chain. Read results with `CallbackHandler.is` / `handled` / `valueOf` / `objectOf` (menus); the 8 lenient "handled" sites go through `CallbackHandler.handledAt(name, r, legacy)`, strict when the setting `LiteGraph.Hooks.StrictHandled` is on, otherwise warning once per hook (decision 0007). `test/hook-results.test.js` pins each site's rule in both modes. Hook names and arguments per host are declared in the `*Hooks` maps of `litegraph.d.cts` (`check:types` fails on an undeclared dispatched name); the tables in `docs/callbacks.md` are generated from them and from the event maps (`tools/hook-docs.mjs`, freshness test `tools/tests/hook-docs.test.mjs`). The registry lives in `host._cb_handler` / `handler._lists`; the old names `cb_handler`, `callbacks_handlers` and `callbackhandler_setup()` still work and log once (deprecated).
  - **Typed events observe.** `LiteGraph.events`, `graph.events` and `canvas.events`.
  - **Points with both** fire the hook chain, then the event; `CallbackHandler.fireHookThenEvent` does it where the two are adjacent (selection, property changes, type registration, construct hooks) and skips the event after a veto. `test/hook-order.test.js` is the order golden.
  - **Dispatch tap:** `LiteGraph.setDispatchTap(fn)` (stored as `ListenerList.tap`) sees every hook and event dispatch with its duration.
  - Both are built on `ListenerList`. See the [event handling audit](../../audits/2026-11-22-event-handling.md) and the [event integration plan](../../plans/2026-11-22-event-integration.md).

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
- **Node pin (title box):**
  - **Drawing:** `drawNodePin` draws the spec from `resolveNodePinStyle`, which is the style named by `LiteGraph.Node.PinStyle` from `LiteGraph.nodePinStyles`, or `classicNodePinStyle`. The registry lives on `LiteGraph`, not on the canvas class, because pages that mix the bundle and `src/` load two copies of the classes.
  - **Clicks:** `isOverNodePin` collapses on click.
  - **Right-click:** `processContextMenu` opens `getNodePinMenuOptions` (menu location `"node-pin"`) when `isNodePinMenuEvent`. Its `{full: true}` option gives the node menu.
- **Title decorations:** `getNodeTitleDecorations` lays out title buttons (`node.title_buttons`) and badges (`LiteGraph.nodeBadges.collect`); `drawNodeTitleDecorations` caches it on `node._title_decorations` for hit testing. Groups: `getGroupTitleFontSize` / `getGroupTitleHeight` / `isOverGroupTitle` (title size by zoom, settings `LiteGraph.Group.TitleScale`, `TitleMinPx`, `TitleMaxPx`), `groupPressMoves` (title or Alt moves, body pans; `LiteGraph.Group.BodyDrag`), header toggle `getGroupToggleRect` (capped by `LGraphGroup.opts.toggle_*`), `toggleGroupMuted`. Space panning: `_space_pan` set by `processKey`, a press pans through `_dragCanvasGesture`, `_endSpacePan` on keyup and blur.
- **Selection:** `selectedItems` covers nodes, groups and reroutes. Also `selectItem`, `moveSelected`, `deleteSelected`, `groupSelected`, and the event `selection-changed`.
- **Clipboard:** `serializeSelection()` produces a fragment (nodes, links, reroute chains, groups). `insertFragment(fragment, pos)` inserts one with fresh ids in one undo step; copy and paste use both.
- **Links (Wave 4c):** `renderLinkPath` resolves one style per link (`resolveLinkStyle`, context cached per frame) and passes it to each segment; `renderLink(ctx, a, b, link, …, num_sublines, {style, source})` builds a `RenderLink`, skips hidden links (not pushed to `visible_links`), and draws through `getLinkRouter()` (`link_router` name, else `links_render_mode`). `computeConnectionPoint` and `getLinkPolyline` use the router too.
- **Minimap and pan (Wave 4c):** `showMinimap` creates a `MiniMap` in the canvas's parent element; `dispose` removes it. Panning is `_dragCanvasGesture` (left drag on empty canvas, middle drag); when another gesture already owns the pointer (a group) only the legacy flag is set. Space-key panning still uses `dragging_canvas`.
- **Drop:** `processDrop` inserts a node for `LGraphCanvas.NODE_DRAG_MIME` data through `LiteGraph.palette.insert` before the file-drop handling (Wave 4d). The Editor's `NodePalettePanel` (in `litegraph-editor.js`) uses it.
- **Drawing:**
  - `drawBackCanvas`: background, groups, links.
  - `drawFrontCanvas`: nodes, overlays, tooltips.
  - Widgets are drawn by `drawNodeWidgets`; changes emit `widget-changed`.
- **Panels:** `createPanel`, `showShowGraphOptionsPanel` and `showShowNodePanel` delegate to `src/panels.js`. `openNodePanel(node)` runs the `onShowNodePanel` callback first (double click, follow selection in `processNodeSelected`). The widget write path is `applyWidgetValue` (pointer edits and the node panel). `LGraphCanvas.optionInfo` describes the canvas options. The constructor applies the `LiteGraph.Canvas.Defaults` setting.
- **Search and menus:** `showSearchBox` matches titles, aliases and descriptions. The canvas and node menus collect `LiteGraph.menus` contributions.

## Runner

- **Workers:** each graph runs in a `worker_threads` worker (`graphManager.js`), which loads `build_node/litegraph_nodejs.full.cjs`.
- **Security:**
  - `security.js` checks Origin and Host.
  - `nodePolicy.js` refuses `sys/runCommand`, `sys/fileWrite`, `sys/fileDelete`, `sys/processControl`, `sys/serviceManager`, `libraries/load`, `libraries/register`, `libraries/search_CDN_lib` and `geometry/eval`, recursively up to depth 64, plus the D1 families (see `describePolicy`). The type an `auto` replacement mapping loads as is checked too (`replacedType`, Wave 4a).
  - Scripts are off unless `RUNNER_ALLOW_SYS=1`.
  - **Validated loader:** `graphRunner.js` runs `LiteGraph.validateGraphData` (strict, with `nodePolicy.typePolicy` as `allowType`) before building a graph, then `assertAllowedGraph` on the cleaned copy. A refusal's `report` travels worker → `graphManager` (`{error, report}`) → `wsHandler` (`error` message `data.report`). A failed first load answers the first command instead of crashing the worker.
- **Protocol:** see [docs/development.md](../../../docs/development.md#graph-runner). Workers post `execution-state` messages; `graphManager.setExecutionStateCallback` → `wsHandler` broadcasts `execution_state {graphId, message}` (Wave 4b). The page (`public/app.js`) records them per workflow (`execution-view-state.js`) and applies them to the open view (Wave 6d).

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
  - Jest: 45 files, 856 tests (26 golden snapshots, documents frozen in `test/fixtures/golden-examples/`), in `test/`. Wave 6: `event-models.test.js` (flow nodes × every model), `execution-models.test.js`, `execution-golden.test.js` (snapshots that must stay identical under `legacy`).
  - node:test: 23 files, in `tools/tests/`; covers the launcher (`launcher`, also under `bun test`), the local CI (`ci`: parsers, reports, the GitHub switch with a fake `gh`, parallel runs on a tiny repository), the node catalog (`node-catalog`), the examples library (`examples`), the generated callback tables (`hook-docs`), the runner (incl. Wave 6 parity fixtures), tester, network lifecycle, upstream issues and undeclared names.

## Known traps

- **`allow_scripts`:** false in the core, **true in every `*.full*` bundle** (because `defaults_debug.js` is part of the build), and toggleable from the `math/formula` widget. The runner resets it.
- **Unbuilt node files:** five node files are in no build: `device`, `threejs`, `libraries/osc`, `libraries/udp`, `nodejs_mysql` (`jquery.js` was removed in Wave 4e).
- **Renamed types (Wave 4e):** old names load through automatic replacement mappings registered next to the new types (`basic/watch_advanced`, `watch/value` → `basic/watch` with a `display`; network servers → `network/server/*`; `network/SocketIO` → `network/socketio`; `server/process/NodeProcessInfo` → `sys/processInfo`). `nodePolicy.RENAMED_TYPES` keeps the same table for runner settings.
- **Gated families:** geometry, glfx and math3d register fewer types without `GL` or `glMatrix`.
- **Bun:** `getRuntime()` returns `"bun"` there; a node's `runtime` / `executionEnvironment` of `"node"` matches Bun too (`LGraphNode.runtimeMatches`). Code that branches on `getRuntime() === "node"` alone misses Bun; use `isNode() || isBun()` as `getRuntimeCapabilities` does.
- **`instanceof LGraphNode` is unreliable**, because registration copies methods. Use `LGraphCanvas.isNodeItem`.
- **`active_canvas`** is set on pointer down and on keydown. Prefer `this`.
- See also the gotchas in [AGENTS.md](../../../AGENTS.md#gotchas).

## Human feedback usability additions

The [first-pass plan](../../plans/2026-11-23-hmd-usability-first-pass.md) adds canonical Watch `auto` inspection in `src/nodes/base.js`, boolean state/usage improvements and linked-number widget fallback. `LiteGraph.getSlotLabel` resolves optional glyph labels for both `LGraphCanvas` drawing and `LGraphNode.computeSize`; precedence is slot, node property, canvas. UI/docs: [examples reference](../../../docs/examples.md).
