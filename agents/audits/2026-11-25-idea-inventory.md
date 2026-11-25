# Complete idea and card inventory, 2026-11-25

> **Date** 2026-11-25 · **Kind** audit · **Status** final · **Base** `LG/dev` @ `a14c29a`

All **276 catalog IDs** and **15 card files** are collected here. The [capability audit](2026-11-25-capabilities-and-gaps.md) gives current evidence and uncatalogued gaps; the [priority proposal](../plans/2026-11-25-priority-refresh.md) defines T1–T10. The [JSON snapshot](2026-11-25-capability-inventory.json) preserves every idea field and all 273 node capability records.

**Delivery is separate from maturity.** `promoted` means linked to a plan, not that the entire card shipped. `candidate` means the entry and its overlap were reviewed, but absence of an implementation was not individually proven. `delivered baseline` still allows explicitly recorded follow-ups. All ranking/grouping is a proposal **[I]**, not accepted work.

| Assessment | Count |
|---|---|
| candidate | 227 |
| partial | 24 |
| delivered baseline | 15 |
| parked | 1 |
| open, source checked | 9 |

## Every catalog entry

### X

| ID | Idea | Maturity | Delivery now | Group | Evidence / remaining scope |
|---|---|---|---|---|---|
| X-01 | Public, versioned runner API: durable jobs, idempotent submit, snapshot SSE, `/features`, assets | sketched | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:21)) |
| X-02 | Host services for widgets: asset store with hash dedupe and GC, upload, file picker, sanitized markdown, modal editor contract, panels and toasts | sketched | partial | T8 | Panels exist; shared assets/pickers/markdown/modal services incomplete ([source](../../src/panels.js:409)) |
| X-03 | Documented graph-change stream and an external-model reconcile mode (the canvas as a projection) | sketched | partial | T8 | Graph-change stream exists; external-model reconcile remains ([source](../../src/lgraph.js:3111)) |
| X-04 | Validated loader for untrusted graphs: type allowlist, size and coordinate bounds, unknown runtime fields dropped; shared by the editor and the runner | sketched | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:24)) |
| X-05 | Schema-generated node packs: JSON Schema, zod, OpenAPI, MCP tools, backend operator catalogs, other-language decorators | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:25)) |
| X-06 | Exporter and code-generation registry (`exportAs(format)`) | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:26)) |
| X-07 | Node-type aliases and migrations for renamed types | promoted | delivered baseline | Retain | Replacement mappings and aliases ([source](../../src/packs.js:415)) |
| X-08 | Accessibility: keyboard traversal of nodes and slots, ARIA live region, screen-reader outline of the graph | seed | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:28)) |
| X-09 | Touch and mobile gestures on `CanvasPointer` (pinch zoom, long-press menu, touch-sized hit areas) | seed | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:29)) |
| X-10 | Runner health and metrics endpoint (runs, step time, worker memory) | seed | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:30)) |
| X-11 | Node property presets: named value sets per node type, stored as a setting | seed | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:31)) |
| X-12 | Settings export, import and profiles on `LiteGraph.settings` | seed | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:32)) |
| X-13 | Movable, dockable and configurable panels: floating and docked panels, stacks and tabs, saved layouts, built on `PanelHost` | seed | partial | T6 | Side docking and width exist; floating/stacks/saved layouts remain ([source](../../src/panels.js:971)) |
| X-14 | Inspector for multiple nodes, groups and reroutes; mixed values and one edit transaction | sketched | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:34)) |
| X-15 | Graph document tabs with independent dirty/draft/resource ownership | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:35)) |
| X-16 | Higher-order graph/map and subgraph-definition references as values | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:36)) |
| X-17 | Live synchronization of linked subgraphs while editing | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:37)) |
| X-18 | Optional subgraph IO rails over stable interface slots | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:38)) |
| X-19 | UI conversion between input slots and widgets with link/fallback preservation | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:39)) |
| X-20 | Virtual/broadcast links with explicit scope and serialization | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:40)) |
| X-21 | Remote pack discovery/registry with provenance and explicit installation boundaries | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:41)) |

### USE

| ID | Idea | Maturity | Delivery now | Group | Evidence / remaining scope |
|---|---|---|---|---|---|
| USE-01 | Watch nodes attached during a run | seed | candidate | T9 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:49)) |
| USE-02 | Schedule-when-ready parallel execution | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:50)) |
| USE-03 | Streamed partial output into node bodies | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:51)) |
| USE-04 | Publish a saved graph as an endpoint or MCP tool | sketched | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:52)) |
| USE-05 | Editor / manager / runner application split | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:53)) |
| USE-06 | Node reference generated from the registry, searchable by agents (→ FLW-23) | promoted | delivered baseline | Retain | Generated node reference and JSON index ([source](../../tools/node-reference.mjs:171)) |
| USE-07 | Recent-nodes palette | seed | delivered baseline | Retain | Recent nodes already in the palette ([source](../../src/palette.js:157)) |
| USE-08 | Code-generation targets (LangGraph, JS, server steps) | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:56)) |
| USE-09 | Headless-Chromium smoke test of built bundles in the gate | seed | candidate | T2 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:57)) |
| USE-10 | Domain-object slot type and host-plugin embedding | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:58)) |
| USE-11 | MaterialX / OpenPBR import and view | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:59)) |
| USE-12 | Compile to a shader with live preview, plus starter recipes | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:60)) |
| USE-13 | Behaviour-tree execution mode (→ FLW-11) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:61)) |
| USE-14 | Per-node link policies and in-node warnings | seed | partial | T8 | Connection hooks exist; uniform policy/warning UX remains ([source](../../src/lgraphnode.js:1)) |
| USE-15 | Progressive palette unlock | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:63)) |
| USE-16 | Canvas as a projection of an external model, reconciled by diff | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:64)) |
| USE-17 | Nodes generated from compiled DSP code | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:65)) |
| USE-18 | Host-protected nodes (delete and edit policy hook) | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:66)) |
| USE-19 | Deploy by URL; BroadcastChannel nodes | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:67)) |
| USE-20 | Dashboards generated from UI nodes | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:68)) |
| USE-21 | Per-node log stream and device-status badge | seed | candidate | T9 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:69)) |
| USE-22 | Hardware-protocol test-case graphs | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:70)) |
| USE-23 | Validated loader for untrusted graphs | sketched | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:71)) |
| USE-24 | Nodes from a backend operator catalog with inline validation | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:72)) |
| USE-25 | Canvas as a Jupyter notebook widget | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:73)) |
| USE-26 | OpenAPI node-pack generator | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:74)) |
| USE-27 | Data size on wires | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:75)) |
| USE-28 | Two-way mapping between graph and domain workflow document | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:76)) |
| USE-29 | One module per node for UI and runtime; agent-oriented authoring guide | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:77)) |
| USE-30 | Run graphs from a job queue | seed | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:78)) |
| USE-31 | Share a graph through a compressed URL | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:79)) |
| USE-32 | Pub/sub nodes between users' graphs | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:80)) |
| USE-33 | Optimistic save conflicts (ETag / If-Match) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:81)) |
| USE-34 | Per-node execution trace (→ FLW-16; base: the dispatch tap, `LiteGraph.setDispatchTap`) | seed | candidate | T9 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:82)) |
| USE-35 | Runaway-node watchdog and deployment limits | seed | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:83)) |
| USE-36 | Portable-format conformance fixtures for other runtimes | seed | candidate | T2 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:84)) |
| USE-37 | Graph lint before run | seed | partial | T7 | checkExecution exists; general graph lint remains ([source](../../src/execution.js:1)) |
| USE-38 | Content-hash result cache | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:86)) |
| USE-39 | Desktop host template (WebView, Tauri or Electron) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:87)) |
| USE-40 | Type rejection at connect time, with conversions | seed | partial | T8 | Connection compatibility exists; conversion contract remains ([source](../../src/lgraphnode.js:1)) |
| USE-41 | Fields: lazily evaluated per-element values | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:89)) |
| USE-42 | Breakpoints with value inspection (→ FLW-16) | seed | candidate | T9 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:90)) |
| USE-43 | Pinned test data per node | seed | candidate | T9 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:91)) |
| USE-44 | Live viewer in every node | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:92)) |
| USE-45 | Two-way visual and text editing | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:93)) |

### CFY

| ID | Idea | Maturity | Delivery now | Group | Evidence / remaining scope |
|---|---|---|---|---|---|
| CFY-01 | Value-schema widget catalogue | sketched | partial | T6 | Value type/editor registry exists; broader schema catalogue remains ([source](../../src/valuetypes.js:1)) |
| CFY-02 | Curve widget (canvas-drawn, headless evaluator) | sketched | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:102)) |
| CFY-03 | Points and path widget with background image | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:103)) |
| CFY-04 | Range widget (dual thumb, gradient) | seed | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:104)) |
| CFY-05 | Colour, palette and vecN widgets | seed | partial | T6 | Colour/vector widgets exist; wider palette/widget catalogue remains ([source](../../src/widgets.js:1)) |
| CFY-06 | Bounding-box list widget | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:106)) |
| CFY-07 | Multi-select combo | seed | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:107)) |
| CFY-08 | Async options provider for combos | sketched | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:108)) |
| CFY-09 | Viewer as a UI-only extension (A/B, probe, gallery) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:109)) |
| CFY-10 | Timeline / keyed-segment widget | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:110)) |
| CFY-11 | Capture and upload widget family | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:111)) |
| CFY-12 | Widget value as an asset reference | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:112)) |
| CFY-13 | Modal editor contract with host-owned mutation | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:113)) |
| CFY-14 | Per-widget blob store with GC and scoped undo | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:114)) |
| CFY-15 | 3D viewport widget with model adapters | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:115)) |
| CFY-16 | Keypoint-graph widget | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:116)) |
| CFY-17 | Code widget tied to `allow_scripts` | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:117)) |
| CFY-18 | Sanitized markdown service and note node | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:118)) |
| CFY-19 | Annotation layer and guided tours | seed | candidate | T3 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:119)) |
| CFY-20 | Completion provider hook on text widgets | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:120)) |
| CFY-21 | XY pad; precision-typed number output | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:121)) |
| CFY-22 | Human-in-the-loop await (runner pauses, editor answers) | sketched | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:122)) |
| CFY-23 | Host file and folder picker | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:123)) |
| CFY-24 | Output history and gallery panel | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:124)) |
| CFY-25 | Display-only widgets that serialize nothing | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:125)) |
| CFY-26 | Embedded app (iframe or DOM) as editor widget | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:126)) |
| CFY-27 | Runner public API v2 | sketched | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:127)) |
| CFY-28 | Content-addressed assets | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:128)) |
| CFY-29 | Two serializations: editor document and execution plan | sketched | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:129)) |
| CFY-30 | Graph provenance embedded in output files | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:130)) |
| CFY-31 | Namespaced runner → editor custom events | seed | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:131)) |
| CFY-32 | `/features` handshake and `/userdata` store | seed | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:132)) |
| CFY-33 | Node definitions as a cross-host contract | seed | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:133)) |
| CFY-34 | Graph ↔ code round trip | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:134)) |
| CFY-35 | Exporter registry `exportAs(format)` | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:135)) |
| CFY-36 | Runner output sinks and asset/model manifest | seed | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:136)) |
| CFY-37 | App manifest node: graph → form-based app | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:137)) |
| CFY-38 | Host-application plugins driving a runner | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:138)) |
| CFY-39 | Streaming frame-processor mode | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:139)) |
| CFY-40 | Distributed regions dispatched to worker runners | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:140)) |
| CFY-41 | Editor commands and runner as MCP tools | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:141)) |
| CFY-42 | Agent edit policy (human document wins) | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:142)) |
| CFY-43 | Template pack format | sketched | partial | T3 | Pack template contract/menu exists; zero shipped templates measured ([source](../../src/packs.js:354)) |
| CFY-44 | Graph-declared asset dependencies | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:144)) |
| CFY-45 | Theme token set with fallbacks | sketched | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:145)) |
| CFY-46 | Palettes as pack assets | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:146)) |
| CFY-47 | Panel contributions, toasts with ids, contribution provenance | sketched | partial | T6 | Panel sections exist; broader toasts/provenance ownership remains ([source](../../src/panels.js:1)) |
| CFY-48 | Key-binding conflict and prefix validation | sketched | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:148)) |
| CFY-49 | Stable ids on menu items | sketched | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:149)) |
| CFY-50 | Owned UI layers | seed | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:150)) |
| CFY-51 | Resizable widget rows; unknown-widget fallback | seed | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:151)) |
| CFY-52 | Late extension loading when idle | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:152)) |
| CFY-53 | i18n hook for names, menus and search | seed | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:153)) |
| CFY-54 | Gestures: shake to detach, swap in place, fill connections | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:154)) |
| CFY-55 | Pack manifest extras: editor range, platform tags | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:155)) |

### WGS

| ID | Idea | Maturity | Delivery now | Group | Evidence / remaining scope |
|---|---|---|---|---|---|
| WGS-01 | Locator property node (get/set any scene property by path) | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:163)) |
| WGS-02 | Graph component with `on_event` modes | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:164)) |
| WGS-03 | Shared graph templates instanced per object | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:165)) |
| WGS-04 | Drag a scene object or property onto the canvas | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:166)) |
| WGS-05 | Object actions and events as slots | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:167)) |
| WGS-06 | Graph material: uniforms and properties derived from the graph | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:168)) |
| WGS-07 | Revive shader lighting outputs | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:169)) |
| WGS-08 | FX graph nodes (SSAO, motion blur, upscale, volumetric) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:170)) |
| WGS-09 | Timeline and animation-track panel | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:171)) |
| WGS-10 | litegl upstream check (pin, update or replace) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:172)) |

### NUN

| ID | Idea | Maturity | Delivery now | Group | Evidence / remaining scope |
|---|---|---|---|---|---|
| NUN-01 | `LiteGraphScript` object for nunuStudio | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:180)) |
| NUN-02 | NodeEditor tab hosting `LGraphCanvas` | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:181)) |
| NUN-03 | Graph → `ShaderMaterial` material editor | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:182)) |
| NUN-04 | three.js version adapter (instance from the host) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:183)) |
| NUN-05 | Generic host scene contract | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:184)) |
| NUN-06 | Upstream offer to fill nunu's `NodeScript` stub | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:185)) |

### 3D

| ID | Idea | Maturity | Delivery now | Group | Evidence / remaining scope |
|---|---|---|---|---|---|
| 3D-01 | KHR_interactivity import | investigated | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:193)) |
| 3D-02 | KHR_interactivity export with validation | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:194)) |
| 3D-03 | KHR conformance runner | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:195)) |
| 3D-04 | glTF JSON-pointer nodes | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:196)) |
| 3D-05 | litegraph → TSL compiler | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:197)) |
| 3D-06 | TSL uniform widgets | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:198)) |
| 3D-07 | Render-pipeline (frame graph) family | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:199)) |
| 3D-08 | Babylon NME JSON importer | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:200)) |
| 3D-09 | Procedural mesh family | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:201)) |
| 3D-10 | Offscreen preview in node bodies | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:202)) |
| 3D-11 | WebGPU texture preview widget | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:203)) |
| 3D-12 | three.js upgrade and `three/webgpu` manifest entry | sketched | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:204)) |
| 3D-13 | Scene-inspector nodes | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:205)) |
| 3D-14 | three.js editor graph-script bridge | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:206)) |
| 3D-15 | A-Frame adapter | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:207)) |
| 3D-16 | React-three-fiber adapter | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:208)) |
| 3D-17 | model-viewer widget node | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:209)) |
| 3D-18 | Trigger-port conventions and op documentation schema | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:210)) |
| 3D-19 | regl or twgl backend replacing litegl | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:211)) |
| 3D-20 | Per-stage shader subgraphs and an expression node | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:212)) |
| 3D-21 | PlayCanvas script-attribute bridge | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:213)) |
| 3D-22 | Physics bound to scene objects | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:214)) |

### JS

| ID | Idea | Maturity | Delivery now | Group | Evidence / remaining scope |
|---|---|---|---|---|---|
| JS-01 | MCP tools as nodes | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:222)) |
| JS-02 | Graph as MCP server | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:223)) |
| JS-03 | LLM chat and agent family | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:224)) |
| JS-04 | Web Audio graph mode (→ FLW-12) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:225)) |
| JS-05 | Tone.js family | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:226)) |
| JS-06 | Faust DSP node | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:227)) |
| JS-07 | Elementary compile | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:228)) |
| JS-08 | MQTT, Web Serial and MIDI I/O | seed | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:229)) |
| JS-09 | Thin Firmata node | seed | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:230)) |
| JS-10 | Chart widgets (uPlot) | seed | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:231)) |
| JS-11 | Plot-spec node (Vega-Lite, Observable Plot) | seed | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:232)) |
| JS-12 | Dataframe family (Arquero) | seed | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:233)) |
| JS-13 | DuckDB SQL node | seed | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:234)) |
| JS-14 | CodeMirror 6 code widget | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:235)) |
| JS-15 | Monaco side panel | seed | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:236)) |
| JS-16 | Multiplayer graphs with Yjs | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:237)) |
| JS-17 | Branchable graph history with Automerge | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:238)) |
| JS-18 | Force layout command (d3-force) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:239)) |
| JS-19 | Schema → node definitions (zod, JSON Schema, Ajv) | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:240)) |
| JS-20 | Statechart subgraph (XState) | seed | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:241)) |
| JS-21 | Observable slot type (RxJS) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:242)) |
| JS-22 | Extism plugin nodes | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:243)) |
| JS-23 | Pyodide script node | seed | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:244)) |
| JS-24 | transformers.js pipeline nodes | seed | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:245)) |
| JS-25 | Generic ONNX inference node | seed | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:246)) |
| JS-26 | MediaPipe landmark nodes | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:247)) |
| JS-27 | OpenCV.js filter family | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:248)) |
| JS-28 | Video frames (WebCodecs, ffmpeg) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:249)) |
| JS-29 | Map widget and geo nodes | seed | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:250)) |
| JS-30 | Physics world-step node | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:251)) |
| JS-31 | Pixi canvas renderer | parked | parked | Parked | Keep the recorded parked decision; no new rationale established ([source](../ideas/catalog.md)) |
| JS-32 | Image annotation widget (Konva, fabric) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:253)) |
| JS-33 | TensorFlow.js model nodes | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:254)) |
| JS-34 | Lazy library loading UX (size, license, progress) | sketched | candidate | T8 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:255)) |

### BUN

| ID | Idea | Maturity | Delivery now | Group | Evidence / remaining scope |
|---|---|---|---|---|---|
| BUN-01 | Process runner on Bun | investigated | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:263)) |
| BUN-02 | Process execution mode (token along event links) | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:264)) |
| BUN-03 | Durable step journal with resume | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:265)) |
| BUN-04 | Retry, backoff, timeout and idempotency-key properties | sketched | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:266)) |
| BUN-05 | Cron and persisted timer triggers | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:267)) |
| BUN-06 | Webhook trigger and HTTP response node | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:268)) |
| BUN-07 | Approval / wait-for-token step | sketched | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:269)) |
| BUN-08 | Executions panel | sketched | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:270)) |
| BUN-09 | Live run overlay | sketched | delivered baseline | Retain | Live graph execution-state overlay; durable run history is separate ([source](../../apps/runner/public/execution-view-state.js:1)) |
| BUN-10 | Context store (run, graph, global) | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:272)) |
| BUN-11 | Credential vault | sketched | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:273)) |
| BUN-12 | Capability grants replacing the denylist | sketched | candidate | T7 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:274)) |
| BUN-13 | Versioned sub-process call | seed | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:275)) |
| BUN-14 | Gateways, error boundary and compensation | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:276)) |
| BUN-15 | Single-binary runner (`bun build --compile`) | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:277)) |
| BUN-16 | Runtime adapter interface (Node and Bun) | sketched | candidate | T10 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:278)) |
| BUN-17 | `sql/*` family on `Bun.SQL` | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:279)) |
| BUN-18 | Redis and S3 nodes | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:280)) |
| BUN-19 | PTY terminal widget | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:281)) |
| BUN-20 | Browser automation nodes | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:282)) |
| BUN-21 | Export to Actions-style YAML or an OS schedule | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:283)) |
| BUN-22 | BPMN XML import and export | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:284)) |

### FLW

| ID | Idea | Maturity | Delivery now | Group | Evidence / remaining scope |
|---|---|---|---|---|---|
| FLW-01 | Call scopes: one hierarchical scope id (call → Sequence branch → loop iteration → function call) for the memo and the legacy dedupe | investigated | open, source checked | T1 | Scope/property versioning absent; same-call stale read reproduced ([source](../../src/execution.js:174)) |
| FLW-02 | Volatile pure: `pure: "volatile"` runs once per scope, shared by its consumers; rand, time and state readers can be ON_REQUEST | investigated | open, source checked | T1 | Scope/property versioning absent; same-call stale read reproduced ([source](../../src/execution.js:174)) |
| FLW-03 | `refresh` action input on ON_REQUEST nodes: invalidate and re-run explicitly | investigated | open, source checked | T1 | Scope/property versioning absent; same-call stale read reproduced ([source](../../src/execution.js:174)) |
| FLW-04 | Property and widget version in the memo key | investigated | open, source checked | T1 | Scope/property versioning absent; same-call stale read reproduced ([source](../../src/execution.js:174)) |
| FLW-05 | Lifecycle event nodes: `on_start`, `on_tick(dt, time)`, `on_stop`, `on_pause`/`on_resume` (KHR names as aliases) | sketched | open, source checked | T4 | Current registry/engine lacks the proposed lifecycle/events/profile contract ([source](../../src/execution.js:40)) |
| FLW-06 | Custom events and dispatchers: `custom_event`, `call_event`, `dispatcher` (bind, unbind, unbind all, call), `bind_event`, an "Assign" helper | sketched | open, source checked | T4 | Current registry/engine lacks the proposed lifecycle/events/profile contract ([source](../../src/execution.js:40)) |
| FLW-07 | Exec pins per document (`onTrigger`/`onExecuted`), set by the profile instead of a global flag | promoted | partial | T5 | Per-model exec slots exist; profile-owned configuration remains ([source](../../src/execution.js:107)) |
| FLW-08 | Graph profiles: model + mode defaults + UI + packs + palette per document (mixed, blueprint, dataflow, realtime, stepped, reactive) | sketched | open, source checked | T5 | Current registry/engine lacks the proposed lifecycle/events/profile contract ([source](../../src/execution.js:40)) |
| FLW-09 | Hot and cold data inputs, plus a Trigger node for ordered fan-out | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:300)) |
| FLW-10 | Latent nodes: a resumable line (`setDelay`/`cancelDelay`, async actions with success and fail outputs) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:301)) |
| FLW-11 | State-machine and behaviour-tree runners over the same node model | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:302)) |
| FLW-12 | Signal and control rates: a slot rate for audio and video streams, apart from control events | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:303)) |
| FLW-13 | Cook on demand: dirty propagation, cook only what an observed output needs, "needs cook" and "time dependent" badges | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:304)) |
| FLW-14 | Loop pitfall lint: warn when a volatile source feeds a loop's count or collection | seed | open, source checked | T1 | Scope/property versioning absent; same-call stale read reproduced ([source](../../src/execution.js:174)) |
| FLW-15 | Functions vs macros: `graph/function` (one exec in, no latent nodes) against an inlined macro subgraph (several exec pins, latent allowed) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:306)) |
| FLW-16 | Flow debugger: exec breakpoints, step, pin watches, animated exec wires, cook counts and times | seed | candidate | T9 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:307)) |
| FLW-17 | Signature cache with a per-node fingerprint hook (NaN = always rerun) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:308)) |
| FLW-18 | Lazy inputs: a node asks for an input only when it needs it | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:309)) |
| FLW-19 | Zones: paired frame nodes for loops, caches and per-frame state | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:310)) |
| FLW-20 | Completion and error side channel: Catch and Complete event nodes | seed | candidate | T4 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:311)) |
| FLW-21 | Scheduled parameter automation: value + time ramps | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:312)) |
| FLW-22 | Examples library: a manifest with flow categories and profiles, a Demo menu built from it, a test that runs every example | promoted | delivered baseline | Retain | Manifest, menu and runnable examples checks ([source](../../tools/tests/examples.test.mjs:1)) |
| FLW-23 | Node reference per library, generated from `describeNodeType`, with pack descriptions and usage | promoted | delivered baseline | Retain | Generated node reference; publication policy is D9 ([source](../../tools/node-reference.mjs:171)) |
| FLW-24 | Profile-aware palette and new-graph templates | seed | open, source checked | T5 | Current registry/engine lacks the proposed lifecycle/events/profile contract ([source](../../src/execution.js:40)) |
| FLW-25 | Node pin as mode and state indicator, with a quick menu (mode, bypass, mute, rename, run, info) | promoted | delivered baseline | Retain | Mode/state node pin and quick menu ([source](../../src/extensions/node_pin.js:1)) |
| FLW-26 | Graph status chip: the execution model and run state on the canvas, click to switch | promoted | delivered baseline | Retain | Graph model/run-state chip ([source](../../src/extensions/graph_status.js:1)) |
| FLW-27 | Native BYPASS mode (pass-through), as ComfyUI's mode 4 | promoted | delivered baseline | Retain | Native bypass and document migration ([source](../../src/execution.js:351)) |
| FLW-28 | Guided example workflows: one example guide per editor feature, extension and node pack, opened from the feature (menu, panel, pack info) and walking the user through it step by step (dynamic: highlight, wait for the action, go on) | seed | candidate | T3 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:319)) |

### DEV

| ID | Idea | Maturity | Delivery now | Group | Evidence / remaining scope |
|---|---|---|---|---|---|
| DEV-01 | Coverage report in the gate, with a floor threshold | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:327)) |
| DEV-02 | Large-graph benchmarks (`runStep` and draw at 1k and 10k nodes) with a regression budget, plus a performance guide | seed | candidate | T1 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:328)) |
| DEV-03 | Canvas visual-regression snapshots of `editor_build.html` fixtures | seed | candidate | T2 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:329)) |
| DEV-04 | Source maps for `build/` bundles | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:330)) |
| DEV-05 | Release workflow: version alignment checklist, tag-triggered publish after `npm run check` | seed | partial | Later | Local CI, release/tag and package smoke shipped; automated publication not accepted ([source](../executions/2026-11-24-release-0.18.0-dev.2-merge.md:1)) |
| DEV-06 | Node and extension scaffolder (template, test stub, declaration entry) | seed | candidate | T3 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:332)) |
| DEV-07 | Generated hook/event reference and compatibility deprecation diagnostics ([backlog](../ideas/landscape/remaining-platform-gaps.md)) | sketched | candidate | T2 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:333)) |
| DEV-08 | One tester controller for progress, cancellation and cleanup ([backlog](../ideas/landscape/remaining-platform-gaps.md)) | sketched | candidate | T2 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:334)) |

### LCH

| ID | Idea | Maturity | Delivery now | Group | Evidence / remaining scope |
|---|---|---|---|---|---|
| LCH-01 | Cross-OS launcher: `lg.sh` / `lg.bat` → one JS helper on Bun or Node; start, stop, restart, status, info, open, logs and a menu | promoted | delivered baseline | Retain | Launcher implemented; cross-OS acceptance remains ([source](../../tools/lg/lg.mjs:1)) |
| LCH-02 | Process state: pid and port records, HTTP health checks, a log per app, in a git-ignored state folder | promoted | delivered baseline | Retain | Process state, ports and health checks ([source](../../tools/lg/state.mjs:1)) |
| LCH-03 | Bun as an optional runtime for the apps (`--runtime`, `LG_RUNTIME`); npm scripts stay on Node | promoted | delivered baseline | Retain | Node/Bun app runtime choice ([source](../../tools/lg/core.mjs:1)) |
| LCH-04 | `lg doctor`: runtimes, `node_modules`, free ports, build freshness, runner opt-ins in effect | seed | candidate | T6 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:345)) |
| LCH-05 | `lg logs <app>` (follow mode later) | promoted | delivered baseline | Retain | Logs command; following logs remains later ([source](../../tools/lg/lg.mjs:1)) |
| LCH-06 | The launcher as a single executable (`bun build --compile`) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:347)) |
| LCH-07 | Launcher profiles: apps, ports and runner opt-ins per named profile | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:348)) |
| LCH-08 | Shell completions (bash, zsh, fish, PowerShell) | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:349)) |
| LCH-09 | Watch mode in the launcher (`node --watch` / `bun --watch`) replacing nodemon | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:350)) |

### GRP

| ID | Idea | Maturity | Delivery now | Group | Evidence / remaining scope |
|---|---|---|---|---|---|
| GRP-01 | Title-only group drag; a press in the body selects or pans (a setting) | seed | delivered baseline | Retain | Title/body drag rule and setting shipped ([source](../executions/2026-11-24-groups-ux.md:24)) |
| GRP-02 | Nested groups: containment tree, moving a group moves its child groups, depth drawing order | seed | partial | Later | Contained groups move; explicit containment tree/depth drawing remains ([source](../../src/lgraphgroup.js:203)) |
| GRP-03 | Group modes: bypass, mute or disable the contained nodes from the header (BYPASS is native since decision 0004) | seed | delivered baseline | Retain | Group mode API and menu shipped ([source](../../src/lgraphcanvas.js:9718)) |
| GRP-04 | Group styling: palette colour, title font and size, alignment, kind (frame, note, region) | seed | partial | Later | Colour/font/title layout exists; frame/note kind contract remains ([source](../../src/lgraphgroup.js:1)) |
| GRP-05 | Groups as comments: multiline text or sanitized markdown body, a mode that captures no nodes | seed | candidate | Later | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:362)) |
| GRP-06 | Better drag and resize: handles on every edge and corner, snapping, fit to nodes, locked groups | seed | partial | Later | Corner resize and fit exist; full edge handles/locking remain ([source](../../src/lgraphcanvas.js:9707)) |
| GRP-07 | Reroute audit: ComfyUI 0.4 and 1.0 round trips, legacy `Reroute` nodes, reroutes in subgraphs, tests | seed | partial | Later | Interop/boundary fixtures exist; full requested reroute matrix not revalidated here ([source](../../test/catalog-boundaries.test.js:1)) |
| GRP-08 | Group actions: collapse, select contents, convert to subgraph, align contents | seed | partial | Later | Some selection/subgraph/layout actions exist; group collapse remains ([source](../../src/lgraphcanvas.js:1)) |

### HMD

| ID | Idea | Maturity | Delivery now | Group | Evidence / remaining scope |
|---|---|---|---|---|---|
| HMD-01 | Broader example coverage across features, settings, common nodes, packs and execution models; bounded first pass ([plan](../plans/2026-11-23-hmd-usability-first-pass.md)) | promoted | partial | T3 | Bounded first pass shipped; broader card scope remains ([source](../executions/2026-11-24-hmd-usability-first-pass.md:1)) |
| HMD-02 | Examples that explain features, settings and nodes through concise interactive presentation; bounded first pass ([plan](../plans/2026-11-23-hmd-usability-first-pass.md)) | promoted | partial | T3 | Bounded first pass shipped; broader card scope remains ([source](../executions/2026-11-24-hmd-usability-first-pass.md:1)) |
| HMD-03 | Everyday base-node upgrade, starting with boolean/toggle usability and consistent defaults; bounded first pass ([plan](../plans/2026-11-23-hmd-usability-first-pass.md)) | promoted | partial | T3 | Bounded first pass shipped; broader card scope remains ([source](../executions/2026-11-24-hmd-usability-first-pass.md:1)) |
| HMD-04 | Adaptive watch displays for simple and structured values, type awareness and explicit validation; bounded first pass ([plan](../plans/2026-11-23-hmd-usability-first-pass.md)) | promoted | partial | T3 | Bounded first pass shipped; broader card scope remains ([source](../executions/2026-11-24-hmd-usability-first-pass.md:1)) |
| HMD-05 | Optional slot `label_icon`, icon+text or compact icon-only labels, name/type disclosure; bounded first pass ([plan](../plans/2026-11-23-hmd-usability-first-pass.md)) | promoted | partial | T3 | Bounded first pass shipped; broader card scope remains ([source](../executions/2026-11-24-hmd-usability-first-pass.md:1)) |
| HMD-06 | Editor/runner auto workflow generator: add all nodes from sections/packs, propose organization/descriptions/metadata, seed and refresh starter workflows; bounded first pass ([plan](../plans/2026-11-23-hmd-usability-first-pass.md)) | promoted | partial | T3 | Bounded first pass shipped; broader card scope remains ([source](../executions/2026-11-24-hmd-usability-first-pass.md:1)) |
| HMD-07 | Shared native, SVG and emoji icon contract for nodes, slots and app surfaces; bounded first pass ([plan](../plans/2026-11-23-hmd-usability-first-pass.md)) | promoted | partial | T3 | Bounded first pass shipped; broader card scope remains ([source](../executions/2026-11-24-hmd-usability-first-pass.md:1)) |
| HMD-08 | Fit or restore the viewport when loading an example ([backlog](../ideas/landscape/remaining-platform-gaps.md)) | sketched | candidate | T3 | Inventory and overlap reviewed; full implementation status not individually proven ([source](../ideas/catalog.md:380)) |

## Card coverage

The first column is the card file; grouped cards cover several IDs. Historical wording stays in the original cards; current delivery is reconciled in the tables above.

| Card | IDs covered |
|---|---|
| [3D-01-gltf-khr-interactivity.md](../ideas/cards/3D-01-gltf-khr-interactivity.md) | 3D-01 |
| [BUN-01-process-runner-on-bun.md](../ideas/cards/BUN-01-process-runner-on-bun.md) | BUN-01 |
| [FLW-01-call-scopes-and-pure-semantics.md](../ideas/cards/FLW-01-call-scopes-and-pure-semantics.md) | FLW-01, FLW-02, FLW-03, FLW-04 |
| [FLW-05-lifecycle-and-custom-events.md](../ideas/cards/FLW-05-lifecycle-and-custom-events.md) | FLW-05, FLW-06 |
| [FLW-08-graph-profiles.md](../ideas/cards/FLW-08-graph-profiles.md) | FLW-08 |
| [FLW-22-node-reference-and-examples.md](../ideas/cards/FLW-22-node-reference-and-examples.md) | FLW-22, FLW-23 |
| [HMD-01-example-coverage.md](../ideas/cards/HMD-01-example-coverage.md) | HMD-01 |
| [HMD-02-explained-examples.md](../ideas/cards/HMD-02-explained-examples.md) | HMD-02 |
| [HMD-03-everyday-base-nodes.md](../ideas/cards/HMD-03-everyday-base-nodes.md) | HMD-03 |
| [HMD-04-adaptive-watch.md](../ideas/cards/HMD-04-adaptive-watch.md) | HMD-04 |
| [HMD-05-slot-label-icons.md](../ideas/cards/HMD-05-slot-label-icons.md) | HMD-05 |
| [HMD-06-workflow-builder-runner.md](../ideas/cards/HMD-06-workflow-builder-runner.md) | HMD-06 |
| [HMD-07-shared-icons.md](../ideas/cards/HMD-07-shared-icons.md) | HMD-07 |
| [LCH-01-cross-os-launcher.md](../ideas/cards/LCH-01-cross-os-launcher.md) | LCH-01 |
| [X-01-runner-public-api.md](../ideas/cards/X-01-runner-public-api.md) | X-01 |

## Landscape and older source coverage

All 12 landscape files, the ecosystem-study index, the improvements ledger, the current roadmap, source ownership map, latest state/examples audits and subsequent execution records were used to reconcile overlaps. External ecosystem/licence assertions remain historical snapshots, not fresh web verification. No donor code reuse is authorized by this review.

| Area | Landscape |
|---|---|
| 3d-libraries | [3d-libraries.md](../ideas/landscape/3d-libraries.md) |
| bun-process-runner | [bun-process-runner.md](../ideas/landscape/bun-process-runner.md) |
| comfyui-world | [comfyui-world.md](../ideas/landscape/comfyui-world.md) |
| execution-flows | [execution-flows.md](../ideas/landscape/execution-flows.md) |
| groups-annotations | [groups-annotations.md](../ideas/landscape/groups-annotations.md) |
| human-feedback-usability | [human-feedback-usability.md](../ideas/landscape/human-feedback-usability.md) |
| js-libraries | [js-libraries.md](../ideas/landscape/js-libraries.md) |
| launcher-cli | [launcher-cli.md](../ideas/landscape/launcher-cli.md) |
| litegraph-census | [litegraph-census.md](../ideas/landscape/litegraph-census.md) |
| nunustudio | [nunustudio.md](../ideas/landscape/nunustudio.md) |
| remaining-platform-gaps | [remaining-platform-gaps.md](../ideas/landscape/remaining-platform-gaps.md) |
| webglstudio-litescene | [webglstudio-litescene.md](../ideas/landscape/webglstudio-litescene.md) |
