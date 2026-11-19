
This fork takes the 2011-2014 code for LiteGraph and renews it.

# Unreleased (0.10.x): Wave 1, platform layer

## Added

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

* A widget gesture (click, or a drag until pointer up) is one undo step, instead of one full-graph snapshot per value change.
* Inserting a node from the search box can be undone, also when nothing gets connected.
* Dragging a group by whole units is recorded in history.
* The canvas receiving key events becomes `LGraphCanvas.active_canvas`, and `prompt()` uses its own canvas. F2 and Shift+→ no longer fail before the first pointer input.
* Runner (found in the Wave 0 review): script nodes are disabled unless `RUNNER_ALLOW_SYS=1`, `geometry/eval` is refused, and the Host check accepts IPv6 `HOST` and default-port origins.

# Unreleased (0.10.x): Wave 0, safety and correctness

## Security

* Graph runner: the WebSocket accepts only same-origin browser pages (Origin check) and the runner's own host names (Host check against DNS rebinding); HTTP requests with a foreign Host get 403. Extra names: `RUNNER_ALLOWED_HOSTS`.
* Graph runner: node types that run commands, write or delete files, control processes/services, or load remote libraries are refused at any subgraph depth unless `RUNNER_ALLOW_SYS=1`; `RUNNER_DENY_TYPES` adds more.
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
