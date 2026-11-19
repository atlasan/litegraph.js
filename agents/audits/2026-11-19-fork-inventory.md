# Fork inventory and gap analysis

Date: 2026-11-19. Base: `master` @ `01cb4ea`. Status: **audit**, read-only when it was written. Several items have since been fixed; see the **Since** column and the [roadmap](../plans/roadmap.md). Citations are `file:line` at `01cb4ea` and may have drifted.

## 1. 11-18 roadmap items at `01cb4ea`

| Item | At `01cb4ea` | Since |
|---|---|---|
| B1 slot menu `_slot` | done | |
| B2 `buildFromNodes` stub | open | open (Wave 2) |
| B3 orphan subgraph on "Convert to subgraph" | open | open (Wave 2) |
| B4 nested clone with uuids | done | |
| B5 `param_bind` `outputData` | done | |
| B6 CallbackHandler semantics | open | **fixed, Wave 0** |
| B7 `setCanvas` rebind | open | **fixed, Wave 0** |
| B8 `tabIndex` | open | **fixed, Wave 0** |
| B9 pointercancel / `ref_window` | done | |
| B10 `LGraphCanvas.dispose()` | open | **added, Wave 0** |
| B11 `closeSubgraph` view | open | **fixed, Wave 0** |
| B12 search box change/timer | open | **fixed, Wave 0** |
| B13 `options_panel` patch | moot (dead file) | **deleted, Wave 0** |
| B14 double `callbackhandler_setup` | open | **fixed, Wave 0** |
| B15 version | open | **fixed, Wave 0** |
| P0 runner Origin/token/sys allowlist | open | **fixed, Wave 0** (plus the script-node lockdown found in review) |
| P0 dead `server.js`, runner logger, `.eslintignore` | open | **removed, Wave 0** |
| P0 `ws` | 8.18 | **8.22.1, Wave 0** |
| P0 LibraryManager shell / vm / polling | open | **fixed, Wave 0** |
| Ph3.2 transactions on every edit path | partial | **mostly done, Wave 1** (keyboard, rename, search insert, widget gesture, group drag) |
| Ph4.1 commands/contributions | open | **done, Wave 1** |
| Comfy C0–C3 | done | |
| Comfy C4 (subgraph format) | proposed | open |

**Bugs found by this audit:**
- `getTopGraph()` threw before any subgraph was opened. Fixed in Wave 0.
- The runner type-checked only top-level nodes. Fixed in Wave 0: the check is now recursive.

## 2. Per-area inventory (at `01cb4ea`)

| Area | Files | Maturity | Overlap / gaps |
|---|---|---|---|
| Graph core / execution | `lgraph.js` | solid | process-global config flags; cycles untested |
| Node | `lgraphnode.js` | solid | mixes `on*` callbacks, CallbackHandler and widget logic |
| Registry | `litegraph.js` | solid but flat | had no capability metadata (**added, Wave 1**); inconsistent category roots (`string` vs `strings`, `Device`, network prefixes) |
| Links | `llink.js`, `linkconnector.js`, canvas | partial→solid | legacy `connecting_*` shim; drop/hit-test still in canvas; connect code duplicated in paste and node replacement |
| Reroutes | `reroute.js`, `lgraph.js` | partial | no drag-from-reroute, no multi-select, no floating reroutes |
| Subgraphs | `subgraph.js` | partial | conversion broken (B2/B3), no unpack, format decision 0001 pending |
| Widgets | `lgraphcanvas.js` (draw and input `switch` blocks) | partial | no widget classes; parallels `interface.js` widget nodes, `html.js` overlays and `curveeditor.js` |
| HTML overlays | `nodes/html.js` | partial | repositions only when drawn; no focus/zoom policy; `jquery.js` duplicates it |
| Groups | `lgraphgroup.js` | partial | nested groups were never detected (**fixed, Wave 0**) |
| Rendering | `lgraphcanvas.js` (9.5k lines) | solid | one huge class |
| Input / pointer | `canvaspointer.js`, canvas flags, `dragandscale.js` | partial | three holders of gesture state |
| Menus / search | `contextmenu.js`, canvas | partial | ranking tied to the DOM; mix of `keyCode` and `key` |
| History | `lgraph.js` | partial | three change paths (before/after hooks, `onGraphChanged`, transactions) |
| Events | `callbackhandler.js`, `eventtarget.js`, legacy `on*` | partial | three systems |
| Serialization | `lgraph.js`, `comfy_interop.js` | solid | double counters (`last_*_id` and `state`) |
| Library management | `librarymanager.js`, `nodes/libraries.js` (171 lines commented out), `NodeJsSysHelper.getLib` | partial + security debt | two registration signatures; registrations scattered |
| Extensions | `extensions/*.js` | stub→partial | no registry (**added, Wave 1**) |
| Node catalog | 25 files, ~330 types | mixed | watch implemented 3×; `jquery` vs `html`; `udp.js` registers nothing; `mysql` is an IIFE |
| Node-only nodes | `nodejs_only/*` | partial | `sys/*` in the default Node build |
| Headless runner | `headless/graphrunner` | partial | security fixed in Wave 0; rejects Comfy documents |
| Editor | `litegraph-editor.js`, `editor/` | partial | 4 near-identical `defaults*.js` |
| Editor tester | `editor_tester/js` | partial | two controllers (`app.js`, `ui-manager.js`) |
| Tests | `test/`, `tools/tests/` | partial | had no group, undo or CallbackHandler tests (**added, Wave 0**) |

## 3. Unify / join

1. **One event pipe.** `CallbackHandler` (167 call sites), `LGraphEventTarget` and the legacy `on*` callbacks should become one prioritised, vetoable pipe that also emits typed events. B6 is fixed and the extension registry is built on CallbackHandler (Wave 1); merging the systems is open.
2. **One change path.** `beforeChange`/`afterChange`, `onGraphChanged` and transactions should converge. `before`/`after` cannot simply map onto transactions: the pointer paths open and close them asymmetrically. See the roadmap.
3. **One gesture owner.** `CanvasPointer`, the canvas pointer flags and DragAndScale's listeners should become one `CanvasPointer`.
4. **Link-drag logic.** Move it into `LinkConnector`, with one connect-in-transaction helper.
5. **Widgets.** One class registry, with a DOM-widget kind and a `curve` widget.
6. **Library management.** One LibraryManager with a manifest table. Delete the commented-out manager.
7. ~~`options_panel.js`~~ was deleted in Wave 0.
8. **Duplicate node families.** watch ×3 → 1; `jquery/*` → `html/*`; one network naming scheme.
9. **`callbackhandler_setup` copies** (5×) should become one mixin.
10. **Editor defaults.** One module with overrides; stop bundling `defaults_debug.js`.
11. **Tester controllers.** One controller plus a view.
12. ~~Runner loggers~~: one logger since Wave 0.
13. **ID counters.** `state` is the source of truth; `last_*_id` is derived on serialize.

## 4. Expand (close to done)

- **Transactions.** Mostly done in Wave 1.
- **Typed events.** Add `node-property-changed`, `link-connected/removed`, `selection-changed`, `widget-changed`, `execution-step` and `node-error`.
- **Reroutes.** Drag from a reroute, delete from its menu, floating reroutes, multi-select.
- **Subgraphs.** Finish `buildFromNodes`, add unpack, then decide C4.
- **ComfyInterop.** Wire it into the editor's open/save and the runner's `configure`.
- **LibraryManager.** Show library state in the node UI.
- **Capability metadata.** Done in Wave 1.
- **Extensions.** Done in Wave 1.
- **Runner.** An execution status stream.

## 5. Top risks (at `01cb4ea`)

1. Runner RCE. **Fixed** in Wave 0, including the script-node path found in the [PR review](2026-11-19-wave0-pr5-review.md).
2. LibraryManager executing untrusted input. **Fixed** in Wave 0.
3. CallbackHandler correctness. **Fixed** in Wave 0, with tests.
4. Subgraph conversion broken and visible to users. **Open.**
5. Leaks and multi-canvas ambiguity. `dispose` was added in Wave 0; `active_canvas` still has 25+ references.
6. Packaging truthfulness: `./build/*` wildcard exports, placeholder dependencies, no build-freshness check in CI. **Open.**
7. Interactive behaviour of C0–C3 untested in a browser. Partly covered by the Wave 0/1 browser checks.
8. Concentration in `lgraphcanvas.js` (9.5k lines). **Open**; the Wave 1/2 ports reduce it.
