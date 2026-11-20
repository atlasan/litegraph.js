
This fork takes the 2011-2014 code for LiteGraph and renews it.

# Unreleased (0.10.x): Wave 1, platform layer

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

# Unreleased (0.10.x): Wave 0, safety and correctness

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
