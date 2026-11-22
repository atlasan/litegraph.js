
This fork takes the 2011-2014 code for LiteGraph and renews it.

# Unreleased: Wave 6 (events and execution models)

Plan: `agents/plans/2026-11-22-events-execution.md`.

## Fixed

* **Errors in event chains are reported (B9):** an action, trigger or execution that throws outside a step emits `node-error {error, node, path}` on the root graph and sets the failing node's execution state to `error`, as `runStep` does. The error is still rethrown to the caller.
* **`onStart` reaches every node that can run (B10),** not only ALWAYS nodes. NEVER nodes still get none.
* **Inner graphs share their parent's clock (B13):** a subgraph's `starttime` is the root's, so `getTime()`-based nodes inside agree with the outside, and the first inner step no longer measures from the clock origin.
* **ForEach `break` stops the loop (B5),** and ForEach no longer reads its `do` action input as data.
* **Payload and call options are forwarded (B15)** by WaitAll (the completing event's payload), Semaphore, Once and Stepper. Sequence no longer changes its caller's `options` object.
* **Six `html/*` nodes start in ON_EVENT mode (B11)** (`event_listener`, `event_listener_remove`, `create_element`, `append_child`, `remove_element`, `apply_element_css`); they set the undefined `LiteGraph.ON_ACTION` and so ran every step.
* A forced pull (`getInputData(slot, true, true)`) no longer logs a "CHECK THIS" warning on every call; the unused `LiteGraph.allowMultiOutputForEvents` flag is gone (B16; `allow_multi_output_for_events` is the real one).

# 0.18.0-dev.1 (2026-11-22): first dev pre-release

This is a pre-release for testers, tagged `v0.18.0-dev.1`; nothing is published to npm. It contains roadmap Waves 0–5 (sections below, newest first):
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
