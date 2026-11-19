
This fork takes the 2011-2014 code for LiteGraph and renews it.

# Unreleased (0.10.x): Wave 0, safety and correctness

## Security

* Graph runner: the WebSocket accepts only same-origin browser pages (Origin check) and the runner's own host names (Host check against DNS rebinding); HTTP requests with a foreign Host get 403. Extra names: `RUNNER_ALLOWED_HOSTS`.
* Graph runner: node types that run commands, read, write or delete files (`sys/fileRead`, `sys/fileWrite`, `sys/fileDelete`), control processes/services, open listening network servers (WebSocket, Socket.IO, OSC, UDP), or load remote libraries are refused at any subgraph depth unless `RUNNER_ALLOW_SYS=1`. `RUNNER_ALLOW_TYPES` allows chosen types or prefixes again (e.g. `sys/fileRead,nodejs/network/`); `RUNNER_DENY_TYPES` adds more.
* Graph runner: script nodes (`math/formula`, `basic/script`, `objects/evaluate`) no longer evaluate code (`LiteGraph.allow_scripts` is off) unless `RUNNER_ALLOW_SYS=1`; `geometry/eval` is refused.
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
