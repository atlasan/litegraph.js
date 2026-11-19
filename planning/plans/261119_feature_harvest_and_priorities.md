# Feature harvest and priorities: ComfyUI LiteGraph, the litegraph plugin ecosystem, and this fork

Date: 2026-11-19. Base: `master` @ `01cb4ea`. Status: **proposal**. Nothing in this document has been implemented.

This builds on three earlier documents and does not repeat them:
- the [ecosystem study](../../docs/development/ecosystem-study/README.md) (2026-11-01)
- the [ComfyUI relationship study](../../docs/development/ecosystem-study/comfyui-litegraph-relationship.md) (2026-11-18)
- the [roadmap](261118_repo_review_and_roadmap.md) (2026-11-18)

**Labels:**
- **[V]** verified in source; **[I]** inferred.
- **SA** is the archived MIT standalone `Comfy-Org/litegraph.js` @ `ea0e1a8`.
- **FE** is `Comfy-Org/ComfyUI_frontend` @ `4f26f4d` (2026-11-19).
- **MIT✓** means the feature already existed in SA, so it can be adapted with attribution.
- **Effort:** S is under 1 day, M is a few days, L is a week or more.

## 0. In one paragraph

The research found **about 60 portable ideas**. Most cluster around a small set of missing **platform pieces**:
- one ordered, vetoable hook pipe with an extension registry
- commands, keybindings and settings
- one selection/pointer/widget/slot model
- declarative node metadata
- a pack manifest

Plugins in the Comfy ecosystem monkey-patch the same ten places again and again (§3). That is the strongest signal of what core should own. **Build the platform layer first** (Wave 1). After that, almost every feature in the lists below becomes a small, isolated plugin or PR instead of another edit to the 9.5k-line `lgraphcanvas.js`. Most of the core mechanics we want already exist under MIT in SA:
- widget classes
- widget-input sockets
- the `Positionable` selection model
- the `CanvasPointer` gesture pattern
- the full `LinkConnector`
- floating reroutes
- group children
- badges and title buttons
- `convertToSubgraph`

## 1. Where we stand (delta since 11-18) [V]

| Status | Items |
|---|---|
| **Done** | Bug B1 (slot menu), B4 (nested uuid clone), B5 (`param_bind`), B9 (pointercancel / `ref_window`); Comfy C0–C3 (serializer hygiene, interop extension, reroutes, transactions, typed events, state counters); upstream issue triage; WebGL/input guards. Tests: about 150 Jest and 82 node:test. |
| **Moot** | B13: `extensions/options_panel.js` is unbuilt and duplicates core, so it should be deleted. |
| **Open bugs** | B2/B3: subgraph conversion is a stub and leaves an orphan node. B6: CallbackHandler `result_priority` is a no-op, the default callback runs after `stop_replication`, and `call_once` can run twice. B7: `setCanvas` rebind leak. B8: `tabIndex`. B10: no `LGraphCanvas.dispose()`. B11: parent view is lost on `closeSubgraph`. B12: search box leaves the transaction open and the timer running. B14: the callback handler is created twice. B15: version strings are inconsistent. |
| **New bugs** | `getTopGraph()` throws when no subgraph was ever opened (`lgraphcanvas.js:281`). The runner type-checks only top-level nodes, so a subgraph bypasses any allowlist (`graphRunner.js:20`). |
| **P0 security (open)** | Graph-runner WebSocket: no Origin/token check, and `sys/runCommand` is exposed. LibraryManager: shell-interpolated `npm` calls, `vm` treated as a sandbox, endless polling. `ws` 8.18. |
| **Partial** | Transactions: not yet used for rename, arrow-move, search-insert, groups, widget edits or reroute add. No-undef enforcement is a test, not lint. Build freshness is not checked in CI. |

## 2. Licensing and provenance rule (unchanged, re-verified)

| Source | Use |
|---|---|
| SA `Comfy-Org/litegraph.js` ≤ `ea0e1a8` | **MIT.** Adapt module by module into our ES6 classes, with attribution, as was done for `reroute.js` and `linkconnector.js`. |
| FE `src/lib/litegraph` | The LICENSE file is still MIT, but post-merge changes are of ambiguous status, and the repository root is GPL-3.0. **Design reference only.** |
| FE app code, `packages/*` | GPL-3.0. Design and data shapes only. |
| rgthree, pysssss, quick-connections, LinkSpotlight, TraceLinks, N-Sidebar, workspace-manager, Crystools, SwarmUI, bentoviz | MIT. Code reusable with attribution. |
| cg-use-everywhere | Apache-2.0. Compatible; keep its NOTICE. |
| Impact-Pack, Group Assistant, NodeAligner, ComfyBox, VariadicNode | GPL-3.0. Behaviour reference only. |
| LinkFX, OliverCrosby minimap, focus-mode, gausszhou/litegraph | No license. Ideas only. |
| ELK (used by auto-layout) | EPL-2.0. Optional plugin only, never in core. |

## 3. The monkey-patch signal: hooks core must own

These are the places plugins patch, counted across the surveyed repos. Each row is one core API that would retire those patches.

| # | Patched today | Plugins doing it | Core API to provide |
|---|---|---|---|
| H1 | `renderLink`, `drawConnections`, `_renderAllLinkSegments` | LinkSpotlight, TraceLinks, LinkFX, Use-Everywhere, quick-connections | **Link style resolver** `(link, ctx) → {visible, alpha, color, width, dash, animate}`; **link router/painter split**; **extra-links provider** for virtual links |
| H2 | `drawNode`, `drawFrontCanvas`, `onDrawForeground` wraps | Impact, Use-Everywhere, Crystools | **Node adornments**: badges, status pill, progress, title buttons; per-node and per-group dim factor |
| H3 | `drawGroups`, `LGraphGroup.move` / `recomputeInsideNodes` | Group Assistant, rgthree, ComfyBox | `onDrawGroup`, group title widgets, **membership policy** (geometric or explicit), `onGroupMembershipChange` |
| H4 | `getCanvasMenuOptions`, `getExtraMenuOptions`, replacing `ContextMenu` | rgthree, pysssss, 0246 | **Menu contribution registry** (`menus.canvas(ctx)`, `menus.node(node)`), auto-nesting long menus |
| H5 | `processMouseDown`/`Up`, `connecting_links`, toggling `release_link_on_empty_shows_menu` | quick-connections, rgthree | **Link-drag lifecycle events** (start, move with candidate slots, drop, cancel); `findCompatibleSlots(link)` |
| H6 | `pasteFromClipboard`, localStorage hijack | workspace-manager | **`canvas.insertFragment(data, pos, {select, remapIds})`**; `before-paste` / `after-paste` |
| H7 | `LGraph.serialize` / `configure` wraps | Use-Everywhere, Crystools | **Serialize/export pipeline**: `onBeforeSerialize(ctx) → restore`; load-time migrations |
| H8 | stack-sniffing in `onConnectionsChange`, patched `connectByType` | Impact | **`reason` on connection callbacks** (user, configure, undo, convert, api); wildcard type-resolution policy |
| H9 | `setInterval` polling, keystroke dirty heuristics | minimap, rgthree, workspace-manager | **`graph-changed{kind}`**, **`viewport-changed`**, and a reliable dirty flag that includes widget edits |
| H10 | home-made `hijack()` interception framework | 0246 | Evolve CallbackHandler into **one ordered, vetoable, async-aware pipe**, as in Rete v2's signal pipe |

## 4. Idea catalog by area

Priority key:
- **P1:** foundation, or high value and cheap.
- **P2:** high value, needs a foundation first.
- **P3:** nice to have.

### 4.1 Extensions and plugin platform

| Idea | Source | MIT✓ | Effort | Pri |
|---|---|---|---|---|
| `LiteGraph.registerExtension({name, version, requires, priority, hooks, contributions})` returns a **disposer**. Every registration made through the extension context is tracked and undone on dispose. Supports a disabled list. | FE extension service (design); our CallbackHandler gives priority and veto, which FE lacks | n/a | M | **P1** |
| Hook set: `init`, `setup`, `beforeRegisterNodeType(ctor, type)`, `nodeCreated`, `nodeLoaded`, `beforeConfigure(data, missingTypes)`, `afterConfigure`, `beforeSerialize` | FE hooks | n/a | S (on top of the above) | **P1** |
| **Commands registry**: `{id, label, run(ctx), when?, mutatesGraph}`, where `run` executes inside `graph.transaction(label)` and so makes one undo entry | FE commandStore | n/a | S | **P1** |
| **Keybindings**: layered defaults/user/unset, ignored while typing, conflict warnings. Port `keyboard_helper` and `renamer` to it and replace `keyCode` with `e.key`. | FE keybindingStore | n/a | S | **P1** |
| **Settings registry**: `{id, type, default, options, migrate, onChange}` with a persistence adapter (localStorage in the editor, JSON in headless). Wrap the existing `LiteGraph.*` flags as proxied settings. | FE settingStore | n/a | M | **P1** |
| Port the existing 4 extensions to the registry and delete `options_panel.js` | ours | | S | **P1** |
| Fix the CallbackHandler semantics (B6), unify it with `LGraphEventTarget`, and make `callbackhandler_setup` one mixin (B14) | inventory | | M | **P1** |

### 4.2 Library, node-pack and dependency management

| Idea | Source | Effort | Pri |
|---|---|---|---|
| **LibraryManager security pass**: `execFile` with an argument array, no `vm`-as-sandbox, timeouts and error states in `waitAllLibrariesLoaded`, and a single object-form `registerLibrary` | inventory P0 | M | **P1** |
| **Library manifest table** (osc, socketio, ws, threejs, os, systemd…) in one declarative file, so the editor and runner can report missing optional dependencies. Delete the 171 commented lines in `nodes/libraries.js` and `NodeJsSysHelper.getLib`. | inventory | S | **P1** |
| **Pack manifest** `{id, version, requires:{litegraph}, nodes[], extensions[], libraries[], templates, locales, docs}`, loaded by a `PackageManager` layered on LibraryManager. Enable/disable list stored as a setting. | FE registry / pyproject design | M | P2 |
| **Stamp provenance on save**: `properties.pack` and `properties.pack_ver`. On load, resolve missing types through a type → pack index and show an actionable "missing nodes" report. | ComfyUI-Manager `workflow-metadata.js` | S | P2 |
| **Node replacement mappings as data**: `registerNodeReplacement({old, new, input_mapping, output_mapping, set_value})` plus a "replace missing/deprecated" command that runs as one transaction. It also covers our own renames (watch ×3, network family names). | FE nodeReplacement, backend `NodeReplace` | M | P2 |
| Templates and blueprints from a pack folder (`templates/*.json` with a thumbnail; `subgraphs/*.json` registered under a "Blueprints" category and inserted as copies) | FE / Manager | M | P3 |
| Remote registry, install queue, environment snapshots | Manager | L | defer |

### 4.3 Node types and registry

| Idea | Source | Effort | Pri |
|---|---|---|---|
| **Optional `static def`** on node classes: `display_name`, `description`, `category`, `search_aliases`, input/output specs (type, widget, default, min, max, step, options, tooltip, optional, advanced, hidden), `deprecated`, `experimental`, `source`. Collected into a definition store at registration time, so it is readable **without instantiating a node**. | FE node definition V1/V2, backend V3 `io.Schema` | M | **P1** |
| **Capabilities metadata** `capabilities: ["webgl", "node", "browser", "network", "sys"]`, read by the registry, search, tester and runner allowlist. This replaces the scattered `isNode`/WebGL checks. | inventory | S | **P1** |
| `LiteGraph.defineNodeType(type, def, impl)`: generate a class plus widgets from a definition through a widget-constructor registry. Also a **JSON Schema → node type factory**. | FE `registerNodeDef`, bentoviz | M | P2 |
| Node-definition **filter registry** (deprecated, experimental or dev-only predicates toggled by settings) | FE | S | P2 |
| Node lifecycle and deprecation badges (`[DEPR]`, `[BETA]`, pack/source badge) | FE nodeSource | S (after 4.6 badges) | P2 |
| `onNodeTypeRegistered` / `onNodeTypeReplaced` hooks; `warnDeprecated` (warn once) helper | SA `LiteGraphGlobal` | S | P2 |
| **Editor-only (virtual) node flag**: excluded from execution and export (watch, notes, bookmarks) | Crystools, rgthree | S | P2 |
| i18n sidecars `locales/<lang>/nodeDefs.json` | FE | M | P3 |
| **Catalog cleanup**: watch ×3 → 1; `jquery/*` → `html/*`; one `network/{client,server}/{ws,socketio,osc,udp}` scheme with aliases; normalise category roots (`string`/`strings`, `Device`) | inventory | M | P2 |

### 4.4 Widgets

| Idea | Source | MIT✓ | Effort | Pri |
|---|---|---|---|---|
| **Widget class hierarchy**: `BaseWidget`, Number, Combo, Slider, Toggle, Text, Button, Knob; `LegacyWidget` wraps old `{draw, mouse}` objects; `toConcreteWidget`. Replaces the twin `switch(w.type)` blocks (`lgraphcanvas.js:5259`, `:5500`). | SA `widgets/*` | ✓ | M | **P1** |
| **Widget-input sockets**: a slot with `widget:{name}` is drawn on the widget's row; when the slot is linked, the widget is disabled and the link wins; dragging a link over a widget highlights the slot. Ports and widgets become one interface concept (as in Baklava). | SA `LGraphNode.ts:3657-3822` | ✓ | M | **P1** |
| **Layout via `computeLayoutSize` and `distributeSpace`** (needed for multiline and DOM widgets) | SA | ✓ | S | P2 |
| **DOM widget kind** under the same registry: our `html.js` overlay becomes a widget with mount/update/resize/visibility/focus/dispose, plus `hideOnZoom` with a placeholder at low LOD | ours + FE design | | M | P2 |
| `curve` widget built from `curveeditor.js`; Color widget; async options provider for combos | ours, FE, Impact | | S each | P3 |
| Name-keyed `widgets_values` alongside the positional array, for robust loading when widgets move | FE `restoredWidgetValue` | | S | P2 |
| Safe math expressions in number entry (`2*pi`, `+ - * / %`) | FE `mathParser` (reimplement) | | S | P3 |
| Widget edits go through transactions (one undo entry per edit) | roadmap | | S | **P1** |

### 4.5 Linking and reroutes

| Idea | Source | MIT✓ | Effort | Pri |
|---|---|---|---|---|
| **Full `LinkConnector` plus RenderLink polymorphism**: shift-drag moves all output links; drag from a reroute or a link segment; `dropOnNode`/`dropOnReroute`/`dropOnNothing`; typed events (`before-drop-links`, `dropped-on-canvas`, …). Move hit-testing and highlighting out of the canvas. | SA `canvas/LinkConnector.ts` and `*RenderLink.ts` | ✓ | M–L | **P1** |
| **Snap and highlight to a compatible slot** while dragging over a node body or a widget row | SA `LGraphCanvas.ts:2890-2955` | ✓ | S | **P1** |
| **Quick-connect candidate dots**: an overlay listing compatible slots on nearby nodes. Works on vanilla litegraph. | niknah/quick-connections (MIT) | | S–M (on H5) | P2 |
| **Floating links and reroute slots**, start a link from a reroute, reroutes in transactions and multi-select | SA `Reroute.ts`, `connectFloatingReroute` | ✓ | M | P2 |
| **Link style resolver** (H1): spotlight on selection, dim by type with a legend, hide individual links shown as slot badges, link labels | LinkSpotlight, TraceLinks (MIT); FE `linkVisibility` (design) | | M | P2 |
| **Link router plug-in**: orthogonal "circuit board" routing that avoids obstacles; cached and invalidated on move | quick-connections (MIT) | | M | P3 |
| **Link integrity check and repair**: `graph.validateLinks({repair})`, run on configure in debug mode | rgthree `link_fixer` (MIT), FE dedup (design) | | S | **P1** |
| **Connection `reason`** plus wildcard (`*`) type propagation and **variadic slots** (`addVarInput`, growing on connect) | Impact, VariadicNode (behaviour), rgthree | | M | P2 |
| Delete a node while keeping links (`connectInputToOutput` bridge); cut-links gesture; middle-click a slot to add its default node | SA, Blender, pysssss | ✓/– | S each | P3 |
| **Virtual / broadcast links** (Use-Everywhere-style, with restrictions, priority, visualisation and "materialise to real links") | cg-use-everywhere (Apache) | | L, needs runtime semantics | P3 |
| Named link-in / link-out nodes (Node-RED) as a simpler first step toward virtual links | Node-RED | | M | P3 |

### 4.6 Rendering and visuals

| Idea | Source | MIT✓ | Effort | Pri |
|---|---|---|---|---|
| **Badges, title buttons and icons**, with title drawing split into overridable parts (`drawTitleBarBackground`/`Box`/`Text`) | SA `LGraphBadge`, `LGraphButton`, `LGraphIcon` | ✓ | S–M | **P1** |
| **LOD threshold based on font size** (DPR-aware and cached) instead of a fixed zoom value | FE `LGraphCanvas.ts:815-940` (reimplement) | | S | P2 |
| Geometry utilities `Rectangle` and `measure`; `fitToBounds` / `animateToBounds` with easing | SA | ✓ | S | P2 |
| **Minimap** with decoration layers, driven by `viewport-changed` / `graph-changed` events (no polling) | FE design, OliverCrosby idea | | M | P2 |
| Snap guide (ghost outline while dragging) | SA `drawSnapGuide`, pysssss | ✓ | S | P3 |
| **`LGraphCanvas.dispose()`** and the `setCanvas` rebind fix (B7, B10) | inventory | | S | **P1** |
| Workflow image export (PNG/SVG with embedded JSON) | pysssss (MIT) | | M | P3 |
| Animated or physics wires | LinkFX (no license) | | – | skip |

### 4.7 Groups, layout and selection

| Idea | Source | MIT✓ | Effort | Pri |
|---|---|---|---|---|
| **One `Positionable` selection model** (`selectedItems: Set`) covering nodes, groups, reroutes and IO nodes; generic move, delete and copy | SA `interfaces.ts:67`, `processSelect` | ✓ | M | **P1** (enabler) |
| **`CanvasPointer` callback-assignment pattern** (`onClick`/`onDragStart`/`onDrag`/`onDragEnd`/`finally` set at pointerdown), absorbing `pointer_is_down`, `last_mouseclick` and DragAndScale's listeners; pointer capture (fixes iframe hosts like SwarmUI) | SA `CanvasPointer.ts` | ✓ | M | **P1** (enabler) |
| **Group children and nesting** (centre-inside rule; nested groups draw parent first), `resizeTo(children, padding)` auto-fit, "group selected", group color/pin | SA `LGraphGroup` | ✓ | S–M | **P1** |
| Membership policy (geometric or explicit), **group header toggles** (mode for all nodes in the group) | Group Assistant (behaviour), rgthree (MIT), Blender frames | | M | P2 |
| **Clipboard with links, reroutes, groups and subgraphs**; Ctrl+Shift+V reconnects inputs; `insertFragment(data, pos)` (H6) | SA `copyToClipboard` / `_pasteFromClipboard` | ✓ | M | **P1** |
| **Grid-aware align and distribute** (detects rows and columns), equal size; snap to grid on drag end | NodeAligner (behaviour), SA `arrange.ts` | ✓ partial | S–M | P2 |
| **Auto-layout adapter**: export `{nodes, edges with ports, groups}`, apply positions in one transaction, scoped to the selection; dagre built-in, ELK as an optional plugin | auto-nodes-layout | | M | P2 |
| Bookmarks (viewport anchors with hotkeys); follow-execution navigation | rgthree, Crystools | | S | P3 |
| Focus view / app mode (published parameters rendered as a form; a view filter that does not mutate saved positions) | SwarmUI (MIT), Comfy linear mode, focus-mode | | L | P3 |

### 4.8 Subgraphs

ADR 0001 proposes option B: ComfyUI-style definitions as subgraph v2.

| Idea | Source | MIT✓ | Effort | Pri |
|---|---|---|---|---|
| **Finish conversion now** on the current inline model: create `graph/input`/`graph/output`, move nodes in one transaction, reconnect, remove the orphan path (B2/B3), plus **unpack** | ours, SA `getBoundaryLinks` | ✓ | M | **P1** |
| Per-level view memory and breadcrumbs (B11), cancellable `subgraph-opening` events, title button "enter subgraph"; fix the `getTopGraph()` crash | SA, FE (design) | ✓ partial | S | **P1** |
| **Decide ADR 0001**, then implement `Subgraph extends LGraph` definitions, virtual IO nodes (`-10`/`-20`), and stable slot ids. Inserting a definition copies it; linked instances are an explicit opt-in later. | SA `subgraph/*` | ✓ | L | P2 |
| **Promoted widgets** with host-owned values (instance value ownership) | SA copy model; FE ownership rule (design) | partial | M | P2 |
| **Rebind host slots by id, then signature, then name** (safe when ports are renamed or reordered) | FE `_rebindInputSubgraphSlots` (reimplement) | | S | P2 |
| Path ids `"1:2:3"` and the `ExecutableNodeDTO` resolver, for the inspector and the runner allowlist (recursive type check) | SA | ✓ | M | P2 |
| Port SA's 14 subgraph test files as acceptance cases | SA `test/subgraph/*` | ✓ | M | P2 |
| Blueprints from a folder (§4.2) | FE | | M | P3 |

### 4.9 Search and discovery

| Idea | Source | Effort | Pri |
|---|---|---|---|
| Separate the **search index** from the search UI (fix B12 while doing so); index over `def` metadata without instantiating nodes | ecosystem study | M | **P1** |
| Filter prefixes `i:` `o:` `c:` `s:` (input, output, category, source); aliases; strict type matches before wildcard matches; recency and usage tiebreak | FE nodeSearchService | M | P2 |
| **Hover preview from the definition** (detached node drawn on an offscreen canvas) | FE NodePreview, N-Sidebar | M | P2 |
| **Docked node palette**: drag a type to the canvas, favourites as a setting (`"Folder/"` encoding), fuzzy search | N-Sidebar (MIT), FE bookmarks | M | P2 |
| `dropped-on-canvas` from a link drag opens search pre-filtered by the link's type | SA LinkConnector event | S | P2 |

### 4.10 Execution, inspection and runner

| Idea | Source | Effort | Pri |
|---|---|---|---|
| **Runner lockdown**: Origin/token check, recursive type allowlist (no `sys/*` by default), `ws` ≥ 8.23 | roadmap P0 | S–M | **P0** |
| **Shared execution-state protocol** between editor and runner: `{run_id, node_path, state: pending\|running\|finished\|error, value, max, timing, error}` | FE executionStore vocabulary | M | P2 |
| Node status pill and progress, error overlay, "click to centre on the running node" | Impact, Crystools, Node-RED status | S (on badges) | P2 |
| Run a subset (ancestors of the selected sink only) | rgthree "queue this output" | M | P3 |
| Comfy workflows runnable in the runner (wire `comfy_interop` into runner `configure`) | inventory | S | P3 |

### 4.11 Editor and workspace

| Idea | Source | Effort | Pri |
|---|---|---|---|
| **Dirty flag** (modified vs saved, based on `revision`), including widget edits | FE changeTracker | S | P2 |
| Draft autosave with an LRU index; recovery on reload | FE persistence V2 | S–M | P2 |
| Graph tabs (one history per graph) | FE workflowStore | M–L | P3 |
| Merge `editor/js/defaults*.js` (4 near-copies); merge the duplicated tester controllers (`app.js` and `ui-manager.js`) | inventory | S each | P2 |

## 5. Unify / join list (our own code)

| Today | Becomes |
|---|---|
| `CallbackHandler` + `LGraphEventTarget` + legacy `on*` | One prioritised, vetoable pipe that also dispatches typed events; legacy `on*` stays as the default callback (§4.1) |
| `beforeChange`/`afterChange` + `onGraphChanged` + transactions + `_version` | `before`/`after` open and commit a transaction; `revision` is the only counter |
| `CanvasPointer` + `pointer_is_down`/`last_mouseclick` + DragAndScale's own listeners | One `CanvasPointer` gesture owner (§4.7) |
| Canvas link-drag code + `linkconnector.js` + duplicated reconnect paths in paste and node replacement | `LinkConnector` owns drag and drop; a single connect-in-transaction helper |
| Twin widget `switch` blocks + `interface.js` widget nodes + `html.js` overlays + `curveeditor.js` | Widget class registry with a DOM-widget kind and a curve widget |
| `librarymanager.js` + commented-out legacy manager + `NodeJsSysHelper.getLib` + scattered library registrations | One LibraryManager plus a manifest table (and later a PackageManager) |
| Five copies of `callbackhandler_setup` | One mixin (also fixes B14) |
| `last_node_id`/`last_link_id` + `state` | `state` as the source of truth; the legacy fields are derived on serialize |
| `server/logger.js` + `logger.js`; `defaults*.js` ×4; tester controllers ×2 | One of each |

## 6. Proposed waves (priority order)

Each wave is independently shippable. Within a wave, items touching different files can run in parallel.

**Wave 0: safety and correctness (S–M, do first).**
- Runner lockdown and the LibraryManager security pass.
- Bugs B6, B7, B8, B10, B11, B12, B14, B15 and `getTopGraph`.
- Delete `options_panel.js`.
- `validateLinks({repair})`.
- Tests for groups, undo and CallbackHandler semantics.

**Wave 1: the platform layer (M each).**
These are the enablers and change little visible behaviour.
1. A unified hook pipe built from CallbackHandler and EventTarget, plus `registerExtension` with disposal; port the 4 extensions.
2. Commands, keybindings and settings registries. Commands run inside transactions. Wrap the `LiteGraph.*` flags.
3. The `Positionable` selection model and the `CanvasPointer` gesture pattern (from SA).
4. Widget classes with `LegacyWidget`, plus widget-input sockets (from SA).
5. Node `static def` and `capabilities` metadata, a definition store, and the library manifest table.
6. Transactions everywhere: rename, move, insert, groups, widgets, reroutes.

**Wave 2: authoring core (M each, mostly SA ports).**
- Full LinkConnector with snap and highlight.
- Clipboard with `insertFragment`.
- Group children with auto-fit.
- Badges and title buttons.
- Subgraph conversion and unpack on the current model, plus view memory.
- A search index with filter prefixes and `dropped-on-canvas` search.

**Wave 3: subgraph v2 and components (L).**
- Accept or reject ADR 0001.
- Definitions, IO nodes and stable slot ids.
- Promoted widgets and rebind by id.
- Path ids, the recursive runner allowlist and SA subgraph tests.
- Blueprints.

**Wave 4: ecosystem and workspace (M each, as plugins on Wave 1 hooks).**
- Pack manifest, provenance stamping, the missing-nodes report and replacement mappings.
- Link style resolver (spotlight and dim), quick-connect, and the auto-layout adapter.
- Minimap, the execution-state protocol with status badges, and the node palette with preview.
- Dirty flag and autosave.

**Deferred (each needs its own proposal):**
- virtual / broadcast links
- link routers
- app mode / published parameters
- graph tabs
- remote registry
- TypeScript migration
- renderer change

## 7. Decisions needed

1. **Order:** platform first (Wave 1 before visible features), or a visible quick win first (for example, SA widgets plus snap and highlight)?
2. **ADR 0001:** decide now (definitions, option B) or after inline conversion works?
3. **Porting style:** adapt SA modules one by one into ES6 with attribution (recommended), or vendor SA TypeScript behind a build step?
4. **Node metadata:** an optional `static def` on classes (hybrid, recommended), or a full definition-first `defineNodeType`?
5. **Mode 4 collision:** keep BYPASS as interop-only (current behaviour), or add a native BYPASS as a new mode number (5)?
6. **Scope of the node catalog:** keep the large built-in catalog in core, or split it into packs once the manifest exists?

## 8. Sources (snapshots of 2026-11-19)

- Comfy standalone (MIT): `Comfy-Org/litegraph.js` @ `ea0e1a8`.
- Comfy frontend (reference): `Comfy-Org/ComfyUI_frontend` @ `4f26f4d`; `comfyanonymous/ComfyUI` @ `d5d59c40`; `Comfy-Org/docs` @ `bff417cc`; `Comfy-Org/ComfyUI-Manager` @ `5688993b`.
- Plugins:
  - cg-use-everywhere @ `ffc99037`
  - ComfyUI-Impact-Pack @ `51b170a9`
  - ComfyUI-0246 @ `d09cb3fe`
  - ComfyUI-Crystools @ `2f18256c`
  - ComfyUI-N-Sidebar @ `bddcfb6d`
  - comfyui-workspace-manager @ `dfc92186`
  - comfyui-auto-nodes-layout @ `bc0c8cf0`
  - quick-connections @ `12fc2b61`
  - ComfyUI-LinkSpotlight @ `8fa15af8`
  - ComfyUI-TraceLinks @ `c4de0a37`
  - comfyui_group_assistant @ `a233ed5d`
  - ComfyUI-NodeAligner @ `4a891a11`
  - rgthree-comfy @ `bc48c6aa`
  - ComfyUI-Custom-Scripts @ `609f3afa`
- Other apps and forks:
  - SwarmUI @ `d347f306`
  - ComfyBox @ `abd31401`
  - space-nuko/litegraph.ts @ `29a7877f`
  - bentoviz
  - LiteGraph-VariadicNode
- Interaction references (ideas only): Rete.js v2, Baklava.js, Node-RED, Blender node editor, Unreal Blueprints.

These were shallow clones read without execution. No browser comparison was run, and interaction claims come from source and READMEs.
