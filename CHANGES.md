
This fork takes the 2011-2014 code for LiteGraph and renews it.

# Unreleased

Plan: `agents/plans/2026-11-25-next-priorities-after-0.18.0-dev.2.md`. Each track adds its entries under the headings below.

## Added

* **Compatibility charter** (`docs/compatibility.md`, linked from `AGENTS.md`): the targets (this library's API and documents, the original LiteGraph API, ComfyUI workflows, WebGLStudio and other hosts), how far each is kept, how each is checked, and the rules for compatibility changes ([decision 0008](agents/memories/decisions/0008-legacy-compatibility-scope.md)).
* **Call scopes** (flows step 4, FLW-01 to FLW-04, FLW-14; [plan](agents/plans/2026-11-25-call-scopes.md), [decision 0009](agents/memories/decisions/0009-call-scopes.md)). Outside `legacy`:
  * Every run belongs to a call scope: a root scope per frame and per outer event, and a child scope per Sequence output, loop iteration (FOR, ForEach, WHILE) and `graph/function` call. `ExecutionEngine.scopeId`, `ExecutionEngine.iterate(node, k, fn)`, and the `branches` declaration.
  * `pure: "volatile"` declares a node that reads time, randomness or outside state: ON_REQUEST by default under `ancestors`, run once per call scope. Declared by `math/rand`, `math/formula` and `basic/time`.
  * A **refresh input** (Inputs menu of an ON_REQUEST node, `ExecutionEngine.addRefreshInput`) runs the node again and restamps its outputs.
  * `checkExecution` reports `volatile-loop-input`: a loop input fed by a volatile ON_REQUEST node.

## Changed

* **Development environment:** Node.js 22 is pinned in `.nvmrc` (`nvm use`); Bun is the preferred script and app runner (`bun run check`, `editor:bun`, `graphrunner:bun`); installs stay on `npm ci` and `package-lock.json`.
* **`no-undef` is an error in `eslint.config.js`:** browser and Node globals come from the `globals` package (new dev dependency, 13.24.0, already in the lock through ESLint), and the scripts in `src/nodes/nodejs_only/` and `src/nodes/libraries/` get the `LiteGraph` script-scope globals. `tools/tests/undeclared-names.test.mjs` now checks that the config keeps the rule on and that `src/` is clean.
* **Pulled values under `ancestors` and the newer models** (call scopes; `legacy` and its golden snapshots unchanged):
  * a deterministic pure node (`pure: true`) keeps its value across frames and calls, and runs again only on newer input data, a property change or a graph edit (it used to run once per frame);
  * volatile and **undeclared** ON_REQUEST nodes run once per call scope, so a loop iteration or a Sequence output gets a fresh value (it used to be once per frame or outer call);
  * `setProperty` inside a call is seen by the next pull in the same call;
  * `options.action_call` is the call scope id (`call_3/7.s1`); Sequence no longer builds ids with `Math.random`, and triggers no longer draw a uuid;
  * a volatile node saved in ALWAYS mode keeps it: no `pure-always` warning, and "Apply the model's node modes" leaves it;
  * the `random-console` example keeps Rand ALWAYS, so the Watch and the log show the compared value.

## Fixed

* **Event flows audit findings 1–4:** ON_REQUEST random, time and state readers were stale across loop iterations and Sequence outputs; a property edit inside one call was not seen; two call ids existed; `graph/function` ran in its caller's scope (see call scopes above).

# 0.18.0-dev.2 (2026-11-23): dev pre-release

This is a pre-release for testers, tagged `v0.18.0-dev.2` on `master` (2026-11-24); nothing is published to npm. It contains everything on `LG/dev`: roadmap Waves 0–7, the flows track, the panels track, the editor examples, the launcher, the node pin and mode numbering 2, and the group UX (sections below, newest first). It supersedes `0.18.0-dev.1`, which was prepared but never tagged; that content is kept below and ships in this release.

**Upgrade notes:**
- **Mode numbering 2:** `LiteGraph.BYPASS` is now 4, as in ComfyUI, and `LiteGraph.ON_REQUEST` moved from 4 to 5 ([decision 0004](agents/memories/decisions/0004-mode-4-bypass.md)).
  - **Code** that uses the constants keeps working; code that writes the number 4 for ON_REQUEST must use `LiteGraph.ON_REQUEST`.
  - **Saved documents** carry `litegraph_modes: 2`, and older ones are renumbered on load:
    - a document with `litegraph_version` (saved since 2026-11-18) has its 4 turned into 5;
    - a document without it is read as ComfyUI does, with 4 meaning BYPASS.
  - **Files from builds older than 2026-11-18:** set `LiteGraph.Compat.UnmarkedMode4` to `"on_request"`, or rewrite them with `node tools/migrate-modes.mjs --unmarked=on_request file.json`.
  - **Older builds** do not know mode 5.
- **Execution model:** new graphs (`new LGraph()` and new editor documents) run under the `ancestors` execution model: an action reaches a node with an `onExecute` at once, and ON_REQUEST inputs are pulled before it. Opt out with `LiteGraph.default_execution_model = "legacy";`. Documents saved without `config.execution` load as `legacy`, and projects that assign a legacy flag get `legacy` automatically.
- **Deprecated legacy flags:** `use_deferred_actions`, `refreshAncestorsOnActions`, `refreshAncestorsOnTriggers`, `ensureUniqueExecutionAndActionCall`, `ensureNodeSingleExecution`, `ensureNodeSingleAction` and `preventAncestorRecalculation` still work for `legacy` documents and log once when assigned. Removal no earlier than 0.20.
- **Hook errors:** a throwing hook handler no longer stops the chain. The other handlers and the default `onX` run, then the first error is rethrown to the caller (Wave 7).
- **`onShowNodePanel` returning `false`** no longer suppresses the built-in node panel; return a truthy value (such as `true`) to replace it.
- **New APIs:** `LiteGraph.events` and the listener options (`onHook`, `once`, `signal`, `"*"`, `priority`, `ctx.listen`); execution models (`graph.setExecutionModel`, `LiteGraph.registerExecutionModel`) and node execution declarations; value types (`LiteGraph.valueTypes`, `registerValueType`) and the panels (`registerPanelEditor`, `registerPanelSection`, `PanelBuilder`).
- **Optional dependencies:** the package has no required dependencies. Network and system integrations are optional, and a missing one is reported with its install command.
- **From 0.18.0-dev.1** (below): subgraphs are saved as definitions (`LiteGraph.subgraph_format = "inline"` for older builds); full bundles no longer turn on `allow_scripts`, debug logging or the editor UX flags; exports list each bundle by path; apps live in `apps/`; some node types were renamed, with automatic replacements on load.

# 0.18.0-dev.2: launcher, node pin and modes, groups, essentials

Plans: `agents/plans/2026-11-23-launcher-and-bun.md`, `agents/plans/2026-11-23-node-pin-modes-exec-slots.md`. Records: `agents/executions/2026-11-24-groups-ux.md`.

## Added

* **Editor starter workflows:** preview all registered types in a selected pack/category without constructing nodes, then insert available nodes in category groups as one transaction. Report setup-sensitive/unsupported types and creation failures; export inventory metadata and refresh from the registry as packs expand. No automatic execution or wiring.
* **Explained essentials:** six new Demo examples (boolean/actions, structured watch, text watch, linked number widget, bypass and slot icons), with collapsible instructions, expected results and settings; editor toolbar controls stay reachable beside playback controls.
* **Automatic Watch display:** opt-in `auto` on canonical `basic/watch`, with declared/observed type feedback and bounded, cycle-aware object previews that do not invoke getters. Existing displays/defaults remain available.
* **Glyph slot labels:** optional `label_icon` and `label_mode`, node and canvas defaults, shared drawing/measurement text, original name/type in socket menus. SVG asset management is deferred.
* **Everyday values:** boolean search aliases, usage, explicit true/false slot feedback and saved-property/widget agreement; linked `basic/const` widgets use the link while preserving their local fallback.
* **Launcher:** `lg.sh` and `lg.bat` run `tools/lg/lg.mjs` on Bun when it is installed, else on Node.js (`LG_RUNTIME` picks one). Commands `start`, `stop`, `restart`, `status`, `open <editor|tester|runner|docs>`, `logs`, `info`, and a coloured menu without arguments. Servers run in the background with a pid record and a log in the git-ignored `.lg/`; ports from `LG_EDITOR_PORT` / `LG_RUNNER_PORT` or `.lg/config.json`. See `docs/getting-started.md#the-launcher`.
* **npm scripts:** `lg`, `editor:bun`, `graphrunner:bun`.
* **Bypass mode** (`LiteGraph.BYPASS`, 4): the node's code does not run.
  * Each data output takes the value of the input whose type fits.
  * Events go on to its event outputs at once.
  * It is valid under every execution model.
  * `ExecutionEngine.passThrough` and `bypassSource` implement it.
* **Exec slot layouts:** the built-in `onTrigger` / `onExecuted` slots can sit on the node edges.
  * Setting `LiteGraph.Node.ExecSlotLayout`: `rows` is the default, as before. `edges` puts them on the line between title and body at both ends; on vertical nodes they go above the pin and at the bottom.
  * Custom layouts use anchors plus offsets (`LiteGraph.registerExecSlotLayout`, `node.exec_slot_layout`).
  * One geometry is used by links, rows, sizes and hit tests: `LGraphNode.getExecSlotPos`, `getSlotDir`, `isExecSlot`.
  * Slot indices never change.
* **Exec slots per execution model:** dropping an event link on a node creates its exec slots under `ancestors` (model rule `exec_slots`).
  * The setting `LiteGraph.Node.ExecSlots` (`auto` / `on` / `off`) overrides the rule, and so does an assigned `LiteGraph.do_add_triggers_slots`.
  * `ExecutionEngine.execSlotsFor(graph)` resolves it.
* **Node pin (the title box):**
  * Core:
    * `LGraphCanvas.drawNodePin`, `isOverNodePin` and the style registry (`LiteGraph.registerNodePinStyle`, setting `LiteGraph.Node.PinStyle`; `classic` is the look of before);
    * `node.last_run_time`;
    * the menu location `"node-pin"` (`LiteGraph.menus.has`), opened by a right-click on the pin, or on the title with `LiteGraph.Node.TitleQuickMenu`, with "More…" for the full menu.
  * The `node_pin` extension:
    * the `modes` style: a shape and colour per mode, run-state rings, a run glow;
    * the quick menu: Mode, Bypass, Mute, Rename, Collapse, Run now, Info;
    * the commands `litegraph.node.setMode`, `toggleBypass` (Ctrl+B), `toggleMute` (Ctrl+M), `collapse`, `run`, `info`.
* **Graph status chip** (`graph_status` extension, setting `LiteGraph.Canvas.GraphStatus`): the execution model and run state on the canvas; a click switches the model or starts and stops the graph.
* **Editor:** the `modes` pin style and the graph status chip are on by default.
* **Mode migration:** `LGraph.migrateModes`, the setting `LiteGraph.Compat.UnmarkedMode4`, and `tools/migrate-modes.mjs` (`--check`, `--unmarked`). The examples and test fixtures are migrated.
* **Group settings:** `LiteGraph.Group.BodyDrag` (`pan` / `move`), `LiteGraph.Group.TitleScale`, `TitleMinPx`, `TitleMaxPx`; `LGraphGroup.opts.toggle_size`, `toggle_max_px`, `toggle_min_px`; `LGraphCanvas.getGroupTitleFontSize`, `getGroupTitleHeight`, `isOverGroupTitle`, `groupPressMoves`. See the guide's Groups section.
* **The editor server serves `/docs`** (the generated API and the reference pages) and resolves its paths from the repository root, so it starts from any working directory.

## Changed

* **ComfyUI interop:**
  * mode 4 imports and exports as native BYPASS instead of NEVER plus `extra.comfy_bypassed`;
  * ON_REQUEST exports as ALWAYS with `litegraph_mode: 5`;
  * an older `litegraph_mode: 4` marker still reads as ON_REQUEST.
* **Groups:**
  * a drag on a group's empty body pans the view; the title bar or Alt+drag moves the group (`LiteGraph.Group.BodyDrag = "move"` for the old behaviour);
  * group titles keep a readable size at every zoom, 12 to 48 px on screen (`LiteGraph.Group.TitleScale` off for the old behaviour);
  * the header toggle looks like the node pin, is at most 14 px on screen, hides when tiny, and the title no longer runs under it.
* **Repository: local CI, GitHub CI off by default.** `npm run ci:local` (`tools/ci/ci.mjs`, also `lg ci`) runs the workflow's steps (`npm ci --ignore-scripts`, `check`, build freshness) in a clean clone of any commit, several refs in parallel, with optional `npm audit`, packed-install, ComfyUI-probe and Bun steps, and writes a proof report (`report.json`, `report.md`, logs with hashes, a `Local-CI: pass <sha> ...` line for commit trailers, git notes and PR comments). `.github/workflows/validate.yml` is kept, its job gated on the repository variable `LG_GITHUB_CI` = `on`; `npm run ci:github -- on|off|status` is the switch. `npm run check:all` (`check` plus `check:fresh`) runs both in the working tree.
* **Bypassed nodes get no `onStart`**, like NEVER nodes. **`checkExecution` skips them.**
* **`LiteGraph.do_add_triggers_slots` is unassigned by default**, so the document's model decides; the editor no longer sets it to false.
  * A type that refuses ON_TRIGGER still gets `onTrigger` when an event link is dropped on it; before, the drop failed silently.
  * Slots made by the helpers carry `exec: "trigger" | "executed"`.

## Fixed

* **Space-bar panning works again.** The key binding lookup threw on the space key (`KeybindingRegistry.fromEvent` gave `" "`, which `normalize` refused), so the canvas never saw it. Space plus a press now pans as a pointer gesture, over nodes and groups too; space plus a move pans as before, and losing focus ends it (state audit N-4).
* **The node menu no longer throws** when exec slots are on and a `getMenuOptions` hook returns its own short list (it set `options[1].disabled`).
* **Node types declared `runtime = "node"` (or `executionEnvironment = "node"`) also run on Bun**, which implements the Node.js APIs they use; before, they were disabled with "cannot run in bun". A `"bun"` declaration still means Bun only. `LGraphNode.runtimeMatches(declared, runtime)` holds the rule.

# 0.18.0-dev.2: editor examples

Audit: `agents/audits/2026-11-23-editor-examples.md`; record: `agents/executions/2026-11-23-editor-examples.md`.

## Changed

* **Every editor example states its execution model** (`config.execution`, `ancestors` except "Stepped accumulate" under `strict` and "Reactive form" under `event`) with the model's node modes applied, nodes at least as large as `computeSize()`, and a note that says what it shows and what to click. Before, all of them loaded as `legacy`.
* **Rewritten examples:** "Node execution modes" (one box per mode, including BYPASS and NEVER, and a note on the models), "WHILE loop", "Event chain reads fresh values" (its variable was never set, so the branch always took false) and "Timer, random and branch" (under `legacy` the logged value was not the one compared). "Copy and paste", "Autoconnect" and the others keep their content, resized and laid out, with notes.
* **New examples:** a **Basics** category (Widgets to Watch, Button, counter and watch, Sequence and branch, FOR loop, WHILE loop, Strings, Objects and JSON) and one example per flow category (Numbers and math for dataflow, Realtime wave, Stepped accumulate, Reactive form).
* **The examples test is stricter** (`tools/tests/examples.test.mjs`): explicit model, modes applied, no `checkExecution()` issue under the document's own model, no node smaller than `computeSize()`, a note in each example, 20 steps plus a press on every Button without errors, outputs snapshotted; and every flow category has an example.

## Fixed

* **A removed `network/websocket` node kept reconnecting** every few seconds (also after loading another document): only the current socket reconnects now.
* **`applyExecutionModelModes()` changes inside subgraph instances were lost on save:** the subgraph definition was written from the registry, unchanged. The instance now counts as edited, so its definition is synced.
* **`basic/jsonparse` did nothing on its `parse` action before the graph ran,** and fired `done` before setting its object output. It now reads the text when the action arrives and sets the object first.
* **`widget/toggle` and `widget/combo` fired their change event before updating their value output,** so under the `event` model (no frames) a Watch triggered by the event showed the old value.
* **`widget/number` showed 0.7 as "1" after loading** (its decimals were only set when the step was edited); **`widget/hslider` output -1** until it had been drawn.
* **Group titles wrapped past the group's right edge and under its header toggle.**
* Debug output removed: `console.warn("DBG", "WidgetButton", ...)` on every button click, a warning per audio input connection, and a `console.warn` on double-clicking a Number widget.

# 0.18.0-dev.2: pre-release fixes

Plan: `agents/plans/2026-11-23-pre-release-0.18.0-dev.2.md`; audit: `agents/audits/2026-11-23-state-audit.md`.

## Fixed

* **The editor turned scripts back on after its presets (D-1):** `apps/editor/js/code.js` set `LiteGraph.allow_scripts = true` after `js/defaults.js`, overriding the `mobile` and `event_based` presets. `js/defaults.js` is now the only place (on for the default page, off for those presets).
* **`apps/editor/editor_event_based.html` did not load (D-2):** it loaded ES modules as classic scripts and a missing jQuery file. It now loads modules like `index.html`, with the `event_based` preset.
* **The generated API docs (`docs/api`) were stale (D-3):** regenerated with `npm run docs`; they now cover every `src/` module and the execution models. The `LGraphCanvas` class comment is attached to the class again, so its page is generated.
* **`graph.triggerInput(name, value)` threw and bypassed the engine (D-5):** it called `onTrigger` on the nodes with that title, a method no bundled node has. It now runs each of them as a trigger does (`doExecute(value)`: model rules, execution state, `node-error`), drops NEVER nodes with `event-dropped` (`mode`), and still calls a node's own `onTrigger` method.
* **Assigning `graph.executionModel` was silently ignored (D-6):** it now calls `setExecutionModel(name)` (one undo step; an unknown name throws).
* **The `o:` and `i:` search filters missed types without `def` slots that were never created (D-8):** such a type is now probed once (`new Class()`, cached per class).
* **`npm run docs` exited 1** on TypeScript-style type expressions: the plugin `docs/jsdoc-ts-types.cjs` turns them into types JSDoc accepts and keeps the original text in the description.

## Added

* **Library badges:** a node waiting for its libraries shows "loading libraries", one whose libraries failed shows "library error" with the message. Setting `LiteGraph.Node.LibraryBadge` (default on).

# 0.18.0-dev.2: panels and widgets

Plan: `agents/plans/2026-11-22-panels-options-node-details.md`.

## Added

* **Value types** (`LiteGraph.valueTypes`, `src/valuetypes.js`): one registry maps each type to its canvas widget, panel editor, default options, coercion, validation, formatting and help, with aliases (`INT`, `FLOAT`, `COMBO`, `COLOR`, …) and base types. Also `LiteGraph.registerValueType` / `getValueType`, and `ctx.valueTypes.register` in extensions.
* **`addWidget` for any value type:** `int`, `float`, `color`, `vec2`/`vec3`/`vec4`, `text`, `resource`, and the ComfyUI-style names. Two new canvas widgets: `ColorWidget` (swatch and colour picker) and `VectorWidget` (one drag field per component).
* **`LGraphCanvas.applyWidgetValue(node, widget, value)`**: the shared widget write path (value-type coercion, callbacks, bound property, history, `widget-changed`).
* **Options panel:** Graph, Canvas and Settings tabs. Canvas options have labels, tooltips and categories (`LGraphCanvas.optionInfo`), host-added options appear under Other, and "Save canvas as defaults" saves to the `LiteGraph.Canvas.Defaults` setting. Every `LiteGraph.settings` definition can now be edited there. Search covers all tabs.
* **Node details panel:**
  - a header and sections: General, Properties (`section`, `order`, `hidden`), Widgets, Inputs, Outputs, Execution, Advanced;
  - an editor that fits each value, with tooltip, description, examples, reset and a modified marker;
  - one undo step per edit, live refresh, and follow selection (`LiteGraph.Panel.FollowSelection`, on in the Editor).
* **Both panels:** search, sorting, a modified-only filter, remembered collapsed sections, a resizable width and a docking side (settings `LiteGraph.Panel.*`).
* **Panel API:** `LiteGraph.registerPanelEditor`, `LiteGraph.registerPanelSection` (also `ctx.panels` in extensions), `PanelBuilder`, `PanelHost`, `defaultPanelEditors`; `createPanel` gains `addRow`, `addSection`, `addTabs`, `addToolbar` and `addNote`.
* `apps/editor/server.js` reads `PORT`.

## Fixed

* A `graph/input` switched to `boolean` drew and behaved as a number widget. A number input reset its value to 0 on every load.
* The node panel inserted the node type and description as HTML. They are now set as text.
* `vec3`, `color`, `text`, `array` and `resource` properties could not be edited in the node panel. `min` and `max` were ignored there.
* The property dialog refused `vec3`, `color`, `int` and the other value types ("unknown type").
* Node panel edits used `beforeChange`/`afterChange` without a transaction. They are now one undo step each, and those hooks still fire.

# 0.18.0-dev.2: Wave 7 (event integration)

Plan: `agents/plans/2026-11-22-event-integration.md`; audit: `agents/audits/2026-11-22-event-handling.md`.

Hooks (CallbackHandler) and typed events now run on one listener core (`ListenerList` in `src/eventtarget.js`). Assigning `onX` callbacks (`node.onExecute = fn`, prototype methods, `LiteGraph.onNodeTypeRegistered = fn`) works exactly as before: it is the default callback of the hook chain. `registerCallbackHandler` still returns a numeric id, and `processCallbackHandlers` returns the same values.

## Changed

* **A throwing hook handler no longer stops the chain.** The remaining handlers and the default `onX` still run, then the first error is rethrown to the caller; later errors are logged. Before, the chain stopped at the throw and the default did not run.
* **Registering a handler during a dispatch takes effect from the next dispatch.** Before, it re-ran earlier handlers, and a handler that registered on every call never returned.
* **Groups and reroutes:** selecting or deselecting one now also fires the canvas `onSelectionChange` hook, as `selection-changed` already did.
* **Ordering changes** (the order golden, `test/hook-order.test.js`, pins the rest; every point that has a hook and a typed event fires the hook chain, then the legacy `onX` in its place, then the event):
  * **The node property dialog** (`showEditPropertyValue`) now fires `node-property-changed` after `onPropertyChanged`, as `setProperty` does; it fired no event before.
  * **The property dialog records its history entry after `onPropertyChanged`, and none when the hook vetoes** (returns `false`). Before, the entry was recorded before the hook, so a vetoed edit left an undo step, and `changed` / `graph-changed` fired before the hook.
* **A vetoable hook that vetoes skips its typed event** (open decision 3): `setProperty` and the property dialog (`onPropertyChanged` → `node-property-changed`), and `connect` (`onConnectInput` / `onConnectOutput` → `link-connected`), which already behaved so. Hooks whose result is not a veto (`onSelectionChange`, `onOpenSubgraph`, `onNodeAdded`, ...) always fire their event.
* **`onShowNodePanel` returning `false` no longer counts as handled:** the built-in node panel opens, as with no result (`openNodePanel` reads the result with `CallbackHandler.valueOf`). Before, any non-null result, `false` included, suppressed it.
* **`selection-changed` always carries `items`** (nodes, groups and reroutes); before, only group and reroute selection set it.
* **Hosts share one hook implementation** (`installHooks`). The handler registry is created when first needed: reading `cb_handler` (still a `CallbackHandler`, still assignable) or registering a handler. Nodes and graphs that nobody hooks no longer allocate one. A dispatch with no handler only calls `onX`: about 4× faster than before (`runStep` on `benchmark.json` about 15% faster). `callbacks_handlers[name]` exists only for names that had a handler registered; before, every dispatched name created an empty entry.

## Added

* `obj.onHook(name, fn, opts)` returns a disposer; `hasCallbackHandlers(name)`; handler options `once` (alias of `call_once`) and `signal` (unregister on abort).
* `CallbackHandler.is(result, value)`, `CallbackHandler.handled(result)` and `CallbackHandler.valueOf(result)` read hook results the way the library does.
* `CallbackHandler.objectOf(result, fallback, arrays)`: the rule of the menu and slot-list hooks (`getMenuOptions`, `getExtraMenuOptions`, `getSlotMenuOptions`, `onGetInputs`, `onGetOutputs`, `onMenuNodeInputs`, `onMenuNodeOutputs`); those sites use it, unchanged in behaviour (`test/hook-results.test.js` pins every result-reading site).
* `CallbackHandler.fireHookThenEvent(owner, name, args, emitter, type, detail, {veto})`: fires a hook and then its typed event in the documented order, skipping the event after a veto.
* **Dispatch tap:** `LiteGraph.setDispatchTap(fn)` calls `fn({owner, name, phase, ms, error})` after every hook dispatch (`phase: "hook"`) and typed event dispatch (`"event"`), for tracing and profiling (a per-node execution trace: `name === "onExecute"`). Unset, a dispatch pays one null check.
* **Typed hook names** in `litegraph.d.cts`: `LiteGraphHooks`, `LGraphHooks`, `LGraphNodeHooks`, `LGraphCanvasHooks`, `LGraphGroupHooks`. `registerCallbackHandler` and `onHook` infer the handler arguments per host; unknown names still compile. `npm run check:types` fails when a hook dispatched in `src/` is not declared.
* **`LiteGraph.events`:** `node-type-registered`, `node-type-replaced`, `node-type-unregistered`, `graph-created`, `canvas-created`.
* Graph events `group-added` and `group-removed`.
* Typed events: a `priority` option, and `"*"` listeners that receive every event of a target.
* Extension context: `ctx.listen(target, name, fn, opts)` registers a hook for hook names (`onX`, `on_x`, `getXMenuOptions`) and a typed listener otherwise; disposed with the extension.
* `onAddPropertyToPanel` and `onShowCustomPanelInfo` (node panel) are hooks too.
* `npm run check:types` also fails when a typed event is emitted but not declared; `blueprint-error`, `link-drag-start` and `link-drag-end` are now declared on the canvas.

## Fixed

* **Dropping on a node without `onDropItem` threw** a TypeError (a `null` hook result was read as an object).
* **Mouse down ran the canvas `onClear` hook** (with `onMouse` as its default); it now runs the `onMouse` hook.
* **A `once` / `call_once` handler could run twice** when a handler dispatched the same name again (hooks and typed events).
* **Removed listeners stayed attached to their `AbortSignal`**, so a long-lived signal kept them alive.

# 0.18.0-dev.2: flows track (node reference, declarations, examples)

Plan: `agents/plans/2026-11-22-flows-reference-examples.md`.

## Changed

* **An ALWAYS node with a connected event output is no longer pulled for its first value** (`ancestors`). Running it inside a pull dropped its events as `refreshing`; it now runs at its turn (audit finding 10).
* **`ancestors/check_subgraph.JSON`:** its root counter was saved in ON_REQUEST mode with connected event outputs. It is now ALWAYS, so the example checks clean and drops no events. The golden tests read frozen copies of their examples (`test/fixtures/golden-examples/`), so their snapshots are unchanged.
* **New constants are ON_REQUEST under `ancestors`:** a new `basic/const`, `boolean`, `string`, `data` or `array` node, like the pure math nodes, runs when a consumer pulls it. `legacy` documents and loaded nodes keep their modes; "Apply the model's node modes" converts an old document.
* **A ticking node is never re-run by a pull:** this covers `math/accumulate` and `math/average`, among others. Before, under the `event` and `step` models, a forced pull from an event re-ran them, so they advanced more than once per step.
* **`node.actionDo(action)` called from host code pulls the node's ON_REQUEST inputs first under `ancestors`**, as a delivered event does. The guide's loop example now calls `loop.actionDo("do")`.

## Added

* **Node reference:** `npm run docs:nodes` (`tools/node-reference.mjs`) writes `docs/nodes/README.md`, one page per pack and `nodes.json` from the registry. The pages are generated locally and git-ignored; committing them is an open decision (D9).
* **`def.usage`** (or a static `usage`): a short how-to for a node type, returned by `getNodeDefinition(type).usage`. The FOR, ForEach, WHILE, IF, Sequence, Timer, Delay and Function nodes have one.
* **Every builtin pack has a `description`**, and every bundled node type has a description. New titles: Spikes, Process info, File read/write/delete/exists/list.
* **Declaration pass:** 36 more node types declare their execution needs (86 of 273 bundled types):
  * pure: the basic constants and conversions, `logic/sequence`, `math/noise`, the math3d nodes;
  * ticks: `math/average`, `tendTo`, `spikes`, `accumulate`, `audio/adsr`, `texture/temporal_smooth`, `linear_avg_smooth`;
  * ON_EVENT by default: `events/once`, `waitAll`, `filter`, `log`, `basic/alert`.

  Volatile nodes (time, random, widgets) stay ALWAYS, with a comment, until FLW-02.
* **Examples library:** `apps/editor/examples/index.json` describes all 34 example files: `id`, `file`, `title`, `description`, `category`, `profile`, `flow`, `tags`, `packs`, `level`, plus `needs` for network and audio. The editor's Demo menu is built from it, with one group per category (flows, subgraphs, editor and widgets, audio, graphics, network); `wip` examples are hidden. The example files keep their paths.
* **`LiteGraph.packs.listTemplates()`:** the templates of the active packs (manifest `templates[]`, with a `url` or inline `data`). The Demo menu lists them in their category.
* **Examples test** (`tools/tests/examples.test.mjs`): every non-wip example loads without missing nodes and checks clean under `ancestors` after the model's modes are applied. It runs 5 steps without errors or dropped events, and its link data matches `tools/fixtures/examples-outputs.json`. Network and audio examples load and check only.
* **Catalog test** (`tools/tests/node-catalog.test.mjs`): every bundled type is created (browser types with jsdom, Web Audio and WebGL stand-ins), described, in a described pack, and listed once in the reference.

# 0.18.0-dev.2: Wave 6 (events and execution models)

Plan: `agents/plans/2026-11-22-events-execution.md`.

## Changed

* **New graphs run under the `ancestors` execution model.** A graph created in code (`new LGraph()`) or a new document in the editor delivers actions immediately and pulls ON_REQUEST data before them. **The one behaviour change:** an action reaches a node that has an `onExecute` at once, not at its next turn in the step. Opt out with one line: `LiteGraph.default_execution_model = "legacy";`. Projects that assign any legacy flag (`use_deferred_actions`, `refreshAncestorsOnActions`, …) get `legacy` automatically.
* **Editor pages** set `LiteGraph.default_execution_model = "ancestors"` instead of assigning the legacy flags (`js/defaults.js` and its `debug`, `mobile` and `event_based` presets).
* **Documents keep their behaviour:** a document saved without `config.execution` loads as `legacy` and is saved without the field. New documents save the model they run under.

## Deprecated

* **The legacy execution flags** `use_deferred_actions`, `refreshAncestorsOnActions`, `refreshAncestorsOnTriggers`, `ensureUniqueExecutionAndActionCall`, `ensureNodeSingleExecution`, `ensureNodeSingleAction` and `preventAncestorRecalculation`: still readable and writable, used by `legacy` documents; each logs once when assigned, naming its replacement model. Removal no earlier than 0.20.

## Added

* **Execution models** (`src/execution.js`): `ancestors`, `step`, `strict`, `event` and `legacy`, chosen per document in `config.execution`. `graph.executionModel`, `graph.setExecutionModel(name)` (one undo step), `LiteGraph.registerExecutionModel(name, rules)`, `getExecutionModel`, `listExecutionModels`, `LiteGraph.ExecutionEngine`.
* **`event-dropped {node, path, reason, setting?, message}`** on the root graph for every refused event (`reentry`, `refreshing`, `no-handler`, `mode`, `stopped-queue`, `max-passes`, `max-depth`, `cycle`, `once-per-frame`), plus one warning per node and reason.
* Settings `LiteGraph.Execution.MaxEventDepth` (256) and `LiteGraph.Execution.MaxEventPasses` (64, was a fixed 64 in the function node); reaching either is reported and names the setting.
* `graph.stop({dropQueued: true})` clears actions waiting for deferred delivery.
* **Node execution declarations:** `static def.execution` (or `LiteGraph.declareNodeExecution(types, decl)`) with `models`, `modes`, `default_mode`, `emit: "immediate"`, `ticks`, `pure`, `loop`, `immediate_inputs`; read through `getNodeDefinition(type).execution`. The events, logic, base, math and strings packs and `graph/function` declare theirs.
* **Mode restrictions:** `changeMode`, the node panel, the Mode menu and the group's "Mode for all nodes" refuse modes a type declares invalid (Timer and Delay: Always or Never; TriggerEvent: not On Request). The message names `LiteGraph.Execution.AllowAnyMode`, which lifts it; a group change lists the nodes it skipped. `LiteGraph.getValidNodeModes(node)`.
* **New nodes get the model's default mode** when their type declares one (pure math, logic and string nodes are On Request under `ancestors`; loops On Event). Loaded nodes keep their modes; `graph.applyExecutionModelModes()` applies the defaults in one undo step.
* **`graph.checkExecution()`**, `execution-check {report}` after a load, and an execution badge (setting `LiteGraph.Node.ExecutionBadge`, on in the Editor).
* FOR, ForEach and WHILE have a `completed` output.
* **Graph info:** the canvas menu's "Options (execution: <model>)" (with `LiteGraph.showCanvasOptions`, on in the Editor) opens the Options panel with an "Execution model" combo (one undo step) and an optional "Apply the model's node modes (N)" button (one more undo step).
* **Execution state for event runs:** a node run by an action, a trigger or a pull reports `running` then `done`, once per change. The runner page draws the streamed `execution_state` on the open workflow and keeps it per workflow.

## Fixed

* **Errors in event chains are reported (B9):** an action, trigger or execution that throws outside a step emits `node-error {error, node, path}` on the root graph and sets the failing node's execution state to `error`, as `runStep` does. The error is still rethrown to the caller.
* **`onStart` reaches every node that can run (B10),** not only ALWAYS nodes. NEVER nodes still get none.
* **Inner graphs share their parent's clock (B13):** a subgraph's `starttime` is the root's, so `getTime()`-based nodes inside agree with the outside, and the first inner step no longer measures from the clock origin.
* **ForEach `break` stops the loop (B5),** and ForEach no longer reads its `do` action input as data.
* **Payload and call options are forwarded (B15)** by WaitAll (the completing event's payload), Semaphore, Once and Stepper. Sequence no longer changes its caller's `options` object.
* **Six `html/*` nodes start in ON_EVENT mode (B11)** (`event_listener`, `event_listener_remove`, `create_element`, `append_child`, `remove_element`, `apply_element_css`); they set the undefined `LiteGraph.ON_ACTION` and so ran every step.
* **Loops and Sequence under deferred models (B1, B2, B4, B5):** FOR, ForEach, WHILE and Sequence deliver their events immediately in every model but `legacy`, so the body sees each index, WHILE stops on its condition and Sequence keeps its slot order; `break` reaches a running loop. A WHILE stopped by `properties.cycleLimit` reports it.
* **Switch and IF no longer fire on every step (B14):** `events/switch` fires when its selection changes; `logic/IF` in ALWAYS mode branches when its condition changes (triggered, it always branches).
* **DataStore stores the input value at the time of the event (B15).**
* **Subgraph nodes in any mode deliver inner events (B6)** under the `step` and `strict` models (and `ancestors` / `event`, which deliver immediately); events entering a subgraph see fresh interface data.
* A forced pull (`getInputData(slot, true, true)`) no longer logs a "CHECK THIS" warning on every call; the unused `LiteGraph.allowMultiOutputForEvents` flag is gone (B16; `allow_multi_output_for_events` is the real one).

# 0.18.0-dev.1 (2026-11-22): never tagged, superseded by 0.18.0-dev.2

This pre-release was prepared but never pushed or tagged; its content ships in 0.18.0-dev.2. It contains roadmap Waves 0–5 (sections below, newest first):
- the runner lockdown;
- the platform layer;
- authoring ports from the MIT standalone;
- the subgraph system;
- packs and the workspace;
- packaging and the apps layout.

**Upgrade notes:**
- **Saved documents:** subgraphs are saved as ComfyUI-style definitions (`LiteGraph.subgraph_format = "definitions"`). Set `"inline"` if older builds must read the files.
- **Full bundles:** they no longer enable `LiteGraph.allow_scripts`, debug logging or the editor's UX flags. Set them yourself if you relied on them.
- **Dependencies:** the package has no required dependencies. Network and system integrations are optional, and a missing one is reported with its install command.
- **Exports:** they list each bundle by its path; the `./build/*` wildcards are gone.
- **Apps:** they live in `apps/`. Old URLs and the old runner path keep working.
- **Node types:** some were renamed (watch nodes, `network/server/*`). Old documents load through automatic replacements.

# 0.18.0-dev.1: Wave 5 and pre-release fixes

## Changed

* **Apps:**
  * The editor, tester and runner moved to `apps/editor`, `apps/tester` and `apps/runner`. Old URLs (`/editor/…`, `/editor_tester/…`) and `node headless/graphrunner/server/index.js` keep working.
  * Third-party browser libraries moved to `vendor/`.
  * The editor pages share one defaults module (`js/defaults.js?preset=…`).
* **Runner:** old type prefixes in `RUNNER_ALLOW_TYPES` / `RUNNER_DENY_TYPES` cover exactly the types they covered before the catalog cleanup.

* **Packaging:**
  * The package has no required dependencies. Network and system integrations (`socket.io`, `socket.io-client`, `ws`, `osc-js`, `ps-list`, `diskusage`, `node-os-utils`, `node-windows`, `chalk`, `node-fetch`) are `optionalDependencies`. A node that needs a missing one names it and the install command.
  * Exports list each bundle by its path; the `./build/*` and `./build_node/*` wildcards are gone.
* **Full builds no longer include the editor's debug defaults:** script evaluation (`LiteGraph.allow_scripts`), debug logging and the editor UX flags stay at the library defaults. Set them yourself if you relied on them.
* Ctrl+drag on a group's title moves the group without its nodes; Ctrl on the group body still box-selects.

## Added

* "Insert subgraph › From file…" (`canvas.pickBlueprintFile`).
* `npm run check:fresh`; CI fails on stale committed builds.
* Docs: `docs/getting-started.md`, `docs/architecture.md`.

## Fixed

* Runtime dependency advisories (12, 10 of them high) are resolved: `engine.io`, `engine.io-client`, `socket.io-adapter`, `socket.io-parser`, nested `ws`, `brace-expansion`, `cross-spawn`, `js-cookie`.

# 0.18.0-dev.1: Wave 4e, catalog and boundaries

## Changed

* One watch node: `basic/watch` with a `display` property (`value`, `text`, `tree`); `basic/watch_advanced` and `watch/value` load as it.
* Network and process type names: servers under `network/server/*`, `network/socketio`, `sys/processInfo`; the old names load through automatic replacement mappings, and the runner's `RUNNER_ALLOW_TYPES` / `RUNNER_DENY_TYPES` still accept them.
* Converting to a subgraph and unpacking keep reroutes on both sides of the boundary.
* A node replacement keeps the node's size (grown if the new type needs more room).

## Removed

* `src/nodes/jquery.js` (never in a build); `jquery/select` is offered as `html/dom_selector`.

## Fixed

* A document whose missing types were all replaced automatically no longer reports a load error (`configure` returned true, so the runner refused it).

# 0.18.0-dev.1: Wave 4d, layout and palette

## Added

* `graph.autoLayout({engine, nodes, direction, spacing})`: one undo step; engines in `LiteGraph.layout` (`dagre`, loaded on demand; `layered`, built in; `LayoutRegistry.elkEngine` for elkjs); setting `LiteGraph.Layout.Engine`; command `litegraph.layout.auto` in the canvas menu.
* `LiteGraph.palette` (`NodePalette`): groups by pack and category, search, favourites (`LiteGraph.Palette.Favorites`), recent types, previews, `insert`; dropping `LGraphCanvas.NODE_DRAG_MIME` data on the canvas inserts a node.
* The Editor's node palette panel ("Nodes" button, `NodePalettePanel`, setting `LiteGraph.Editor.Palette`).
* Development dependency `@dagrejs/dagre` 3.1.3 (MIT) for the Node layout test; the library is registered as an optional LibraryManager library.

# 0.18.0-dev.1: Wave 4c, links and view

## Added

* `RenderLink`, link routers (`LiteGraph.linkRouters`, `canvas.link_router`; "spline", "linear", "straight" built in) and link styles (`LiteGraph.linkStyles`, setting `LiteGraph.Canvas.LinkStyles`: `spotlight`, `dim-by-type`, `hidden`, `labelled`; `LiteGraph.Canvas.HiddenLinkTypes`).
* `MiniMap` (`canvas.showMinimap` / `hideMinimap` / `toggleMinimap`) with decoration layers, redrawn on events only.
* The `view_tools` extension: `litegraph.canvas.toggleMinimap` (Alt+M, setting `LiteGraph.Canvas.Minimap`) and `litegraph.links.spotlight` / `dimByType` / `labels` / `hidden`, also in the canvas menu.
* `DragAndScale.unbindEvents()`.

## Changed

* `renderLink` draws through the active router and styles; the three render modes draw the same paths as before. Hidden links are not hit-testable.
* Panning the canvas is a `CanvasPointer` gesture.

# 0.18.0-dev.1: Wave 4b, workspace state and execution

## Added

* `graph-changed {kind, kinds, action, revision}` (one per recorded change, code edits coalesced; bubbles from subgraphs with kind `subgraph`) and the canvas event `viewport-changed`.
* `graph.isModified`, `markSaved()`, `markModified()` and `modified-changed`; the Editor shows "• modified".
* Draft autosave in the Editor (`DraftAutosave`, settings `LiteGraph.Editor.Autosave` / `AutosaveDelay`) with a restore offer after a reload.
* The execution-state protocol `LiteGraph.ExecutionState` (v1), `graph.reportExecutionState`, `graph.applyExecutionState`, `node.reportProgress`, `node.setExecutionStatus`, the `execution-state` event; the runner broadcasts `execution_state`.
* Canvas overlays for node status, progress and errors (setting `LiteGraph.Canvas.ExecutionOverlays`); node and definition `icon` drawn before the title (`drawNodeTitleText`).

## Changed

* A widget bound to a property writes the property before the change is recorded, so the history entry includes it.

# 0.18.0-dev.1: Wave 4a, packs and missing nodes

## Added

* `LiteGraph.packs` (`PackRegistry`): pack manifests (`id`, `version`, `requires.litegraph`, `nodes`, `extensions`, `libraries`, …), attribution of node types registered in a pack's `setup`, an index of known packs that are not installed, version ranges, and the settings `LiteGraph.Packs.AllowIncompatible` and `LiteGraph.Packs.Disabled`. `getNodeDefinition(type).pack`.
* Built-in node files declare builtin packs `litegraph/<family>`.
* Provenance stamping: `properties.pack` / `properties.pack_ver` on new nodes of non-builtin packs (setting `LiteGraph.Packs.Stamp`).
* `graph.getMissingNodes()` and the `missing-nodes` event; placeholders show their missing type as the title.
* `LiteGraph.registerNodeReplacement(mapping)`, `graph.replaceNode(node, mapping)` and `graph.replaceNodes()` (one undo step); `auto` mappings apply while loading (setting `LiteGraph.Packs.AutoReplace`); `node-replaced` event.
* The `node_packs` extension: the missing-nodes panel (opened by the Editor after a load), commands `litegraph.nodes.showMissing`, `litegraph.nodes.replaceMissing`, `litegraph.nodes.replace`, and "Replace with …" in the node menu.

## Changed

* The runner checks the type an automatic replacement loads as against its denylist (`assertAllowedGraph(..., {replacedType})`).

# 0.18.0-dev.1: Wave 3c, components and blueprints

## Added

* `LiteGraph.registerSubgraphType(type, definition, options)`: subgraph components as node types, with an "update" badge, `updateFromSource` and the command `litegraph.subgraph.updateFromSource` for newer registered revisions.
* `graph.insertDefinition(definition | id, {pos, linked, definitions})` and `graph.insertBlueprint(json)`; "Insert subgraph" in the canvas menu.
* 43 subgraph acceptance tests adapted from the MIT Comfy-Org/litegraph.js standalone.

## Fixed

* Loaded subgraph definitions with empty `linkIds` or without `version`, `name`, `widgets` or IO boxes are completed on load.

# 0.18.0-dev.1: Wave 3b, subgraph authoring

## Added

* A clickable subgraph breadcrumb (`closeSubgraphTo`, `getBreadcrumb`, `getBreadcrumbAt`).
* The `subgraph_tools` extension: `litegraph.subgraph.open/close/closeAll/convert/unpack/makeUnique/removeUnusedDefinitions`.
* Interface editing: "Add subgraph input/output" from a link release (`exposeSlot`), "Move up/down in the interface" (`moveInterfaceSlot`), and refusal of duplicate interface names.
* Promoted widgets: `promoteWidget` / `unpromoteWidget` / `isWidgetPromoted` and the matching node menu entries. Values belong to each instance, and ComfyUI `widgets_values` load into them.
* `node.getPath()`, `graph.resolvePath(path)`, and `path` in `node-error` events.

## Changed

* Leaving a subgraph on the canvas commits it only after an edit.

## Fixed

* `node-error` named no node (`node` was `false`); it now names the innermost failing node, also from inside subgraphs.
* The subgraph path at the top of the canvas never showed.

# 0.18.0-dev.1: Wave 3a, subgraph definitions

## Added

* Subgraph definitions in the ComfyUI form: `definitions.subgraphs`, interface links through `-10`/`-20`, stable slot ids. `SubgraphDefs` converts documents (pure JSON).
* `graph.subgraphs` (the definition registry), `graph.rootGraph`, `graph.serialize({format})`, `LiteGraph.subgraph_format` and `LiteGraph.subgraph_max_depth`.
* Linked subgraph instances: `commitDefinition` (leaving a subgraph on the canvas commits it), `refreshFromDefinition`, `makeUnique` ("Make unique" in the node menu), the setting `LiteGraph.Subgraph.PasteLinked`, and the graph events `subgraph-definition-changed` / `subgraph-forked`.
* `graph/function` rebuilt: it calls a definition (`call` / `done`), keeps its own state and passes events through. Older documents migrate.

## Changed

* Documents are saved with subgraphs as definitions by default (`LiteGraph.subgraph_format = "definitions"`). Set it to `"inline"` for readers older than this release.
* Subgraph instances keep stored fields they do not model, such as ComfyUI's `widgets_values`.
* ComfyUI export writes subgraphs as definitions and maps modes inside them. Documents written by this runtime are no longer detected as ComfyUI workflows.
* The runner's node policy checks every subgraph definition, used or not.

## Fixed

* Opening a subgraph in `editor_build.html` threw (`attachCanvas` refused the editor's canvas).

## Removed

* `input.hard_coded_value` / `output.hard_coded_output`, only used by the old function node.

# 0.18.0-dev.1: Wave 2b, links and pointer

## Added

* Link dragging:
  * A link dropped on a node body connects to the highlighted compatible slot, a free one first (`LiteGraph.snap_link_to_slot`).
  * The canvas events `link-drag-start` and `link-drag-end` (`outcome`: connected, rejected, dropped, cancelled).
  * Shift-drag from a reroute starts a new link routed through it. Dragging a link's center marker moves the link.
  * `canvas.showLinkReleaseAction(action, dropped, e)`.
* The `quick_connect` extension: the settings `LiteGraph.LinkRelease.Action` / `ShiftAction`, and the command `litegraph.link.chainSelection`.
* Node, group, reroute and link drags are `CanvasPointer` gestures, one undo step per drag. Selected reroutes move with the selection.
* Floating reroutes:
  * ComfyUI `floatingLinks` are modelled (`graph.floating_links`).
  * Removing a routed link keeps its reroutes on the remaining end (`LiteGraph.keep_floating_reroutes`).
  * `graph.routeLink(link, parentId)`.
* Node badges (`LiteGraph.nodeBadges`, `node.badges`; id, source and lifecycle badges behind settings) and title buttons (`node.addTitleButton`, `onTitleButtonClick`).
* Group header toggle: mutes or unmutes the group's nodes (`LiteGraph.Group.HeaderToggle`).

## Fixes

* Pressing an already selected node dropped the rest of the selection (or toggled the node off with Shift), so a multi-selection could not be dragged.
* Clicking a reroute or a group title selected it, then cleared the selection on release.
* Reroute drags lost the movement inside the click tolerance.
* The group corner handle did not work when the canvas options omitted its size.

# 0.18.0-dev.1: Wave 2a, authoring operations

## Added

* `LGraph.convertToSubgraph(nodes)` and `LGraph.unpackSubgraph(node)` (B2, B3):
  * Conversion creates one input per outside source and one output per inside source. Event links become event ports, and internal links are kept.
  * Unpack bridges links that pass straight through.
  * Each is one undo step, and a failed conversion is rolled back.
  * The node menu offers "Convert to subgraph" and "Unpack subgraph"; the canvas menu offers "Convert selection to subgraph".
* Groups:
  * `LGraphGroup.resizeTo(items, padding)`, `fitToContents()` and `setNodesMode(mode)`.
  * The group menu offers "Fit to contents" and "Mode for all nodes".
  * `canvas.groupSelected()` wraps the selection in a group; it is in the canvas menu and on Ctrl+G.
* Clipboard fragments:
  * `canvas.serializeSelection()` captures the nodes, their links, reroute chains and the selected groups.
  * `canvas.insertFragment(fragment, pos, {select, connectUnselected})` inserts a fragment as one undo step, with fresh ids.
  * Copy and paste keep groups and reroutes. Ctrl+Shift+V reconnects inputs from unselected nodes.
* Node search (`LiteGraph.nodeSearch`, `src/nodesearch.js`):
  * Results are ranked.
  * Filters: `i:`, `o:`, `c:`, `s:`.
  * A definition-filter registry. Deprecated nodes are hidden unless `LiteGraph.Search.ShowDeprecated` is on.

## Fixes

* `Subgraph.buildFromNodes` threw, and "Convert to subgraph" left an empty subgraph node behind.
* Copying marked nodes with a `_relative_id` that was never cleared. A node left over from an earlier copy could then be treated as part of a later selection.
* `registerNodeAndSlotType` stored `undefined` when it was given a class or a type string.
* "Add Group" can now be undone.

# 0.18.0-dev.1: Wave 1, platform layer

## Added

* Widget classes (`src/widgets.js`):
  * `BaseWidget` with Button, Toggle, Slider, Number, Combo and Text widgets; `LiteGraph.registerWidgetType` adds custom types.
  * `addWidget` returns class instances. Plain-object widgets and custom `draw`/`mouse` widgets keep working.
* Widget inputs:
  * `node.addWidgetInput(widget)`, or `addWidget(..., {socket: true})`, puts the input on the widget's row. While it is linked the widget is disabled, and `node.getWidgetValue(name)` returns the link's value.
  * Dropping a link anywhere on the row connects it.
* Unified selection:
  * `canvas.selectedItems` covers nodes, groups and reroutes.
  * `selectItem`, `deselectItem` and `isItemSelected` manage it; `moveSelected` and `deleteSelected` are one undo step each.
  * Clicking a group title or a reroute selects it. Rectangle selection, Delete and the keyboard moves include groups and reroutes.
* `CanvasPointer` gesture handlers (`onClick`, `onDoubleClick`, `onDragStart`, `onDrag`, `onDragEnd`, `finally`). Reroute dragging uses them.
* `LiteGraph.menus`: canvas and node context-menu contributions. Extensions get `menus` and `ctx.onEvent`.
* `LiteGraph.persistPlatformState(storage)`: settings and user key bindings survive reloads. The Editor turns it on unless `skip_persistence` is set.
* `LibraryManager.describeLibraries()` and `probeLibraries()`.
* Typed events: `link-connected`, `link-removed`, `node-property-changed`, `widget-changed`, `execution-step`, `node-error` and `selection-changed`.

* `LiteGraph.commands` (CommandRegistry): named operations with `when()`. A command marked `mutatesGraph` runs in `graph.transact()`, so it is one undo step.
* `LiteGraph.keybindings` (KeybindingRegistry): default, user and unset layers. Text entry is ignored. `LGraphCanvas.processKey` runs bound combos first.
* `LiteGraph.settings` (SettingsRegistry): declared settings with defaults, migrations, `onChange`, binding onto existing flags, and a storage adapter (`SettingsRegistry.localStorageAdapter`).
* `LiteGraph.registerExtension(def)` / `LiteGraph.extensions`: everything an extension registers (commands, bindings, settings, hooks) is removed by the returned disposer. It also has a disabled list, `requires`, and per-canvas hooks through `onCanvas`.
* Node definitions:
  * `LiteGraph.getNodeDefinition(type)` / `listNodeDefinitions(filter)`, built from an optional `static def` plus the classic statics. They are readable without creating a node.
  * `LiteGraph.declareCapabilities(selector, caps)`, `getRuntimeCapabilities`, `getMissingCapabilities`, `isNodeTypeSupported`. Every node family declares what it needs: webgl, audio, midi, dom, node, sys or network.

## Changed

* The renamer, autoconnect and keyboard_helper extensions are built on commands and key bindings. A keyboard move or a rename is one undo step, and autoconnect switches itself off after one click. The `registerExtension_*` helpers remain.
* The search box matches titles, aliases and descriptions as well as the type.

## Fixes

* Number entry no longer runs `eval()` on the typed text. A regex was supposed to guard it, but it let `1;alert(1)` through. A small arithmetic parser replaces it.
* Text widgets reported their old value as the new one, and toggles reported no previous value. Both now report the right values.
* `SettingsRegistry.setStorage` now reports changed values to `onChange`.
* A widget gesture (click, or a drag until pointer up) is one undo step, instead of one full-graph snapshot per value change.
* Inserting a node from the search box can be undone, also when nothing gets connected.
* Dragging a group by whole units is recorded in history.
* The canvas receiving key events becomes `LGraphCanvas.active_canvas`, and `prompt()` uses its own canvas. F2 and Shift+→ no longer fail before the first pointer input.
* Runner (found in the Wave 0 review): script nodes are disabled unless `RUNNER_ALLOW_SYS=1`, `geometry/eval` is refused, and the Host check accepts IPv6 `HOST` and default-port origins.

# 0.18.0-dev.1: Wave 0, safety and correctness

## Security

* Graph runner: the WebSocket accepts only same-origin browser pages (Origin check) and the runner's own host names (Host check against DNS rebinding); HTTP requests with a foreign Host get 403. Extra names: `RUNNER_ALLOWED_HOSTS`.
* Graph runner: node types that run commands, read, write or delete files (`sys/fileRead`, `sys/fileWrite`, `sys/fileDelete`), control processes/services, open listening network servers (WebSocket, Socket.IO, OSC, UDP), or load remote libraries are refused at any subgraph depth unless `RUNNER_ALLOW_SYS=1`. `RUNNER_ALLOW_TYPES` allows chosen types, prefixes or families again (e.g. `@outbound,sys/fileRead`); `RUNNER_DENY_TYPES` adds more.
* Graph runner: the rest of decision D1 is denied by default too, in named families: `@host-read` (`sys/fileList`, `sys/fileExists`, `sys/processList`, `sys/serviceList`, `sys/info`, `server/process/NodeProcessInfo`, besides `sys/fileRead`), `@outbound` (`network/httprequest`, `network/websocket`, `network/SocketIO`, `network/webrtc`, `basic/file`) and `@databases` (`mysql/*`). Refusals suggest the family, the startup log shows each family's state, and an unknown family stops the runner with the list of valid ones.
* Graph runner: script nodes (`math/formula`, `basic/script`, `objects/evaluate`) no longer evaluate code (`LiteGraph.allow_scripts` is off) unless `RUNNER_ALLOW_SCRIPTS=1` (or `RUNNER_ALLOW_SYS=1`); a workflow that contains them gets a note in the runner log saying so. `geometry/eval` is refused.
* Graph runner: every refusal says how to allow it. A refused workflow lists all its refused types with a ready `RUNNER_ALLOW_TYPES=…` value; refused hosts and origins name `RUNNER_ALLOWED_HOSTS` / `RUNNER_ALLOWED_ORIGINS`; the active policy is logged at startup.
* Graph runner: `RUNNER_ALLOWED_ORIGINS` lets chosen pages (e.g. the editor at `http://127.0.0.1:8000`) open the WebSocket.
* LibraryManager: `allowAnyPackageSpec` lets `npmInstall` take git, URL and path specs from trusted sources; specs starting with `-` (npm flags) and, on Windows, shell metacharacters stay refused.
* Graph runner: IPv6 `HOST`/`RUNNER_ALLOWED_HOSTS` entries without brackets are accepted, and an Origin matches a Host that spells out the default port.
* LibraryManager: `npmInstall` runs without a shell and only accepts plain package specs; remote server scripts (`server.remote`) are refused unless `allowServerRemoteCode` is set, because `vm` is not a sandbox.
* `ws` raised to 8.22.1.

## Fixes

* CallbackHandler: `stop_replication` also stops the default callback; `result_priority` works; `is_default` handlers are skipped by `prevent_default`; `call_once` handlers run exactly once.
* LGraphCanvas: the constructor no longer replaces its CallbackHandler halfway through (handlers registered during construction were lost).
* LGraphCanvas: `getTopGraph()` no longer throws before a subgraph was opened; closing a subgraph restores the parent view; `setCanvas` moves listeners to the new element; the canvas is focusable (`tabIndex`); a stop/start no longer leaves two render loops.
* Search box: a failed insertion still closes its change (`afterChange`), and its refresh timer is cleared on close.
* LGraphGroup: `getBounding` returns the group rectangle, so nested groups are found and move with their parent; a group is no longer its own child.
* `LibraryManager.waitAllLibrariesLoaded()` rejects on failure or timeout instead of polling forever.
* `LiteGraph.VERSION` now equals the package version; `build.py --update-version` matches the class field and accepts `--patch`.

## Added

* `LGraphCanvas.dispose()`: stops rendering, detaches the graph, unbinds listeners; used by the editor's mini-window and multiview.
* `LGraph.validateLinks({repair})`: reports and repairs inconsistent link tables and slot references.

## Removed

* `server.js` (unused static server on all interfaces), the unused runner `server/logger.js`, `.eslintignore`, and the unbuilt `extensions/options_panel.js`.

# For 0.8.x "The Middle Class":

## Non-Breaking

* Replacing/revising alot of old event handler code
* Cleaned up alot of loops and condition logic
* Fixed over 400 linting errors

## Breaking

* Replaced the IIFE with ES6 modules
* Replaced ES5 classes with ES6 ones
* Replaced LiteGraph.*class* with just *class*
* SubgraphOutput's location on screen is glitched

# For 0.9.x "On Lint Bunnies":

## Non-Breaking

* Fixed multiscreen
* Fixed fullscreen close button
* Fixed low FPS handling
* Fixed dialog CSS mistake
* HttpRequestNode input is acknowledged
* Fix links sometimes not being correct when copy pasting nodes
* Added favicon
* Fixed SubgraphOutput location glitch
* ESLint down to 24 errors so far

## Breaking

* Removed LiteGraph.closeAllContextMenus in favor of ContextMenu.closeAll()
* Removed LiteGraph.pointerAddListener in favor of addEventListener()
* Removed LiteGraph.pointerRemoveListener in favor of removeEventListener()
* Removed some unused/blank methods
* Removed Mesh.compile in favor of Mesh.upload

* Removed LiteGraph.pointerevents_method
* that was a property ("mouse"|"pointer") intended for retrocompatibility moving towards verified stable
* used trickly like : e.type == LiteGraph.pointerevents_method+"down" : mousedown pointerdown
* ? what does this break ?

* All mouse events are now *pointer* events

# For 0.10.x/master

## Breaking

* Integrated Atlasan's fork
