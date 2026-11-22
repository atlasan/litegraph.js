# Ideas catalog

> **Updated** 2026-11-20 · **Kind** idea catalog · **Status** living

One row per idea. The [README](README.md#conventions) defines the IDs, fields and lifecycle, and [purposes.md](purposes.md) defines P1 to P10. Details are in each idea's area document.

Rows are grouped by area and sorted by ID. Keep the columns as they are, because the table is meant to be parsed. Before relying on any count derived from it, regenerate the count with a script.

**Columns:**
- **Reuse:** `adapt` / `ref` / `none` / `—`, where `—` means our own concept or an open standard.
- **Maturity:** `seed` / `sketched` / `investigated` / `ready` / `promoted` / `parked` / `rejected`.

## Cross-cutting (`X`)

These ideas recur across several areas, so each one also absorbs related area ideas.

| ID | Idea | Purpose | Kind | Effort | Reuse | Maturity | Absorbs / links |
|---|---|---|---|---|---|---|---|
| X-01 | Public, versioned runner API: durable jobs, idempotent submit, snapshot SSE, `/features`, assets ([card](cards/X-01-runner-public-api.md)) | P1 P7 P8 | proto | L | adapt | sketched | CFY-27 to CFY-32, BUN-08, JS-02 |
| X-02 | Host services for widgets: asset store with hash dedupe and GC, upload, file picker, sanitized markdown, modal editor contract, panels and toasts | P1 P10 | core | L | adapt | sketched | CFY-11 to CFY-14, CFY-18, CFY-23, CFY-28, CFY-47 |
| X-03 | Documented graph-change stream and an external-model reconcile mode (the canvas as a projection) | P10 | core | M | — | sketched | USE-16, H9; the main reason apps left for Rete |
| X-04 | Validated loader for untrusted graphs: type allowlist, size and coordinate bounds, unknown runtime fields dropped; shared by the editor and the runner | P10 P8 | core | M | adapt | sketched | USE-23, runner `nodePolicy.js` |
| X-05 | Schema-generated node packs: JSON Schema, zod, OpenAPI, MCP tools, backend operator catalogs, other-language decorators | P6 P7 P10 | io | L | adapt | sketched | JS-01, JS-19, USE-24, USE-26, CFY-33 |
| X-06 | Exporter and code-generation registry (`exportAs(format)`) | P6 P8 P2 | io | M | adapt | sketched | CFY-35, USE-08, 3D-02, 3D-05, BUN-21, BUN-22 |
| X-07 | Node-type aliases and migrations for renamed types | P10 | core | S | — | promoted | Roadmap Wave 4 "replacement mappings as data"; USE evidence: Talemate |
| X-08 | Accessibility: keyboard traversal of nodes and slots, ARIA live region, screen-reader outline of the graph | P10 P9 | core | L | — | seed | 2025 improvements ledger |
| X-09 | Touch and mobile gestures on `CanvasPointer` (pinch zoom, long-press menu, touch-sized hit areas) | P10 P9 | core | M | — | seed | Retires `editor_mobile.html` defaults |
| X-10 | Runner health and metrics endpoint (runs, step time, worker memory) | P8 | proto | S | — | seed | Fold into X-01 `/features` |
| X-11 | Node property presets: named value sets per node type, stored as a setting | P10 | ext | S | — | seed | 2025 improvements ledger |
| X-12 | Settings export, import and profiles on `LiteGraph.settings` | P10 | ext | S | — | seed | 2025 improvements ledger |
| X-13 | Movable, dockable and configurable panels: floating and docked panels, stacks and tabs, saved layouts, built on `PanelHost` | P10 | core | M | ref | seed | Follow-up of the [panels and widgets plan](../plans/2026-11-22-panels-options-node-details.md); CFY-47 |

## Census of litegraph users (`USE`)

[landscape/litegraph-census.md](landscape/litegraph-census.md)

| ID | Idea | Purpose | Kind | Effort | Reuse | Maturity |
|---|---|---|---|---|---|---|
| USE-01 | Watch nodes attached during a run | P7 P10 | runtime | M | none | seed |
| USE-02 | Schedule-when-ready parallel execution | P7 P8 | runtime | L | none | seed |
| USE-03 | Streamed partial output into node bodies | P7 | widget | M | none | seed |
| USE-04 | Publish a saved graph as an endpoint or MCP tool | P7 P8 | runtime | M | ref | sketched |
| USE-05 | Editor / manager / runner application split | P8 | app | M | ref | seed |
| USE-06 | Node reference generated from the registry, searchable by agents | P9 P10 | ext | S | ref | seed |
| USE-07 | Recent-nodes palette | P10 | ext | S | ref | seed |
| USE-08 | Code-generation targets (LangGraph, JS, server steps) | P6 P7 P8 | io | L | adapt | seed |
| USE-09 | Headless-Chromium smoke test of built bundles in the gate | P10 | runtime | S | none | seed |
| USE-10 | Domain-object slot type and host-plugin embedding | P6 | core | M | none | seed |
| USE-11 | MaterialX / OpenPBR import and view | P2 | io | L | ref | seed |
| USE-12 | Compile to a shader with live preview, plus starter recipes | P2 P9 | io | L | adapt | seed |
| USE-13 | Behaviour-tree execution mode | P3 P7 | runtime | L | none | seed |
| USE-14 | Per-node link policies and in-node warnings | P10 | core | S | adapt | seed |
| USE-15 | Progressive palette unlock | P9 | ext | S | ref | seed |
| USE-16 | Canvas as a projection of an external model, reconciled by diff | P4 P10 | core | L | ref | sketched |
| USE-17 | Nodes generated from compiled DSP code | P4 | node | M | ref | seed |
| USE-18 | Host-protected nodes (delete and edit policy hook) | P5 P10 | core | S | ref | seed |
| USE-19 | Deploy by URL; BroadcastChannel nodes | P4 P8 | ext | S | adapt | seed |
| USE-20 | Dashboards generated from UI nodes | P5 | ext | L | ref | seed |
| USE-21 | Per-node log stream and device-status badge | P5 | ext | M | none | seed |
| USE-22 | Hardware-protocol test-case graphs | P5 | node | M | ref | seed |
| USE-23 | Validated loader for untrusted graphs | P10 | core | M | adapt | sketched |
| USE-24 | Nodes from a backend operator catalog with inline validation | P6 | io | M | adapt | seed |
| USE-25 | Canvas as a Jupyter notebook widget | P6 P9 | app | M | ref | seed |
| USE-26 | OpenAPI node-pack generator | P6 P8 | io | M | adapt | seed |
| USE-27 | Data size on wires | P6 | ext | S | adapt | seed |
| USE-28 | Two-way mapping between graph and domain workflow document | P8 | io | M | none | seed |
| USE-29 | One module per node for UI and runtime; agent-oriented authoring guide | P8 P10 | core | M | ref | seed |
| USE-30 | Run graphs from a job queue | P8 | runtime | M | none | seed |
| USE-31 | Share a graph through a compressed URL | P9 | ext | S | adapt | seed |
| USE-32 | Pub/sub nodes between users' graphs | P9 | node | M | adapt | seed |
| USE-33 | Optimistic save conflicts (ETag / If-Match) | P10 | runtime | S | adapt | seed |
| USE-34 | Per-node execution trace | P10 | runtime | M | adapt | seed |
| USE-35 | Runaway-node watchdog and deployment limits | P8 | runtime | M | adapt | seed |
| USE-36 | Portable-format conformance fixtures for other runtimes | P10 | proto | M | adapt | seed |
| USE-37 | Graph lint before run | P10 | ext | M | ref | seed |
| USE-38 | Content-hash result cache | P1 P6 | runtime | M | ref | seed |
| USE-39 | Desktop host template (WebView, Tauri or Electron) | P10 | app | M | adapt | seed |
| USE-40 | Type rejection at connect time, with conversions | P10 | core | M | adapt | seed |
| USE-41 | Fields: lazily evaluated per-element values | P2 | core | XL | ref | seed |
| USE-42 | Breakpoints with value inspection | P10 | runtime | L | ref | seed |
| USE-43 | Pinned test data per node | P8 | ext | M | ref | seed |
| USE-44 | Live viewer in every node | P2 P4 | widget | L | ref | seed |
| USE-45 | Two-way visual and text editing | P9 P10 | io | XL | ref | seed |

## ComfyUI world (`CFY`)

[landscape/comfyui-world.md](landscape/comfyui-world.md)

| ID | Idea | Purpose | Kind | Effort | Reuse | Maturity |
|---|---|---|---|---|---|---|
| CFY-01 | Value-schema widget catalogue | P1 P10 | core | M | ref | sketched |
| CFY-02 | Curve widget (canvas-drawn, headless evaluator) | P1 P2 | widget | S | adapt | sketched |
| CFY-03 | Points and path widget with background image | P1 | widget | M | ref | seed |
| CFY-04 | Range widget (dual thumb, gradient) | P1 P10 | widget | S | ref | seed |
| CFY-05 | Colour, palette and vecN widgets | P1 P2 | widget | M | adapt | seed |
| CFY-06 | Bounding-box list widget | P1 | widget | M | ref | seed |
| CFY-07 | Multi-select combo | P10 | widget | S | ref | seed |
| CFY-08 | Async options provider for combos | P1 P10 | widget | M | ref | sketched |
| CFY-09 | Viewer as a UI-only extension (A/B, probe, gallery) | P1 | ext | M | adapt | seed |
| CFY-10 | Timeline / keyed-segment widget | P1 P3 | widget | L | adapt | seed |
| CFY-11 | Capture and upload widget family | P1 | widget | M | ref | seed |
| CFY-12 | Widget value as an asset reference | P1 P10 | core | M | adapt | sketched |
| CFY-13 | Modal editor contract with host-owned mutation | P1 P10 | core | M | ref | sketched |
| CFY-14 | Per-widget blob store with GC and scoped undo | P1 | core | M | adapt | seed |
| CFY-15 | 3D viewport widget with model adapters | P1 P3 | widget | L | adapt | seed |
| CFY-16 | Keypoint-graph widget | P1 P4 | widget | M | adapt | seed |
| CFY-17 | Code widget tied to `allow_scripts` | P10 | widget | M | adapt | seed |
| CFY-18 | Sanitized markdown service and note node | P9 P10 | ext | S | adapt | seed |
| CFY-19 | Annotation layer and guided tours | P9 | ext | M | ref | seed |
| CFY-20 | Completion provider hook on text widgets | P7 P10 | core | M | adapt | seed |
| CFY-21 | XY pad; precision-typed number output | P4 P10 | widget | S | ref | seed |
| CFY-22 | Human-in-the-loop await (runner pauses, editor answers) | P1 P8 | proto | M | adapt | sketched |
| CFY-23 | Host file and folder picker | P10 | ext | S | adapt | seed |
| CFY-24 | Output history and gallery panel | P1 | ext | M | adapt | seed |
| CFY-25 | Display-only widgets that serialize nothing | P6 P10 | widget | S | ref | seed |
| CFY-26 | Embedded app (iframe or DOM) as editor widget | P4 P10 | widget | M | none | seed |
| CFY-27 | Runner public API v2 | P1 P8 | proto | L | adapt | sketched |
| CFY-28 | Content-addressed assets | P1 | proto | M | — | seed |
| CFY-29 | Two serializations: editor document and execution plan | P8 P10 | core | M | — | sketched |
| CFY-30 | Graph provenance embedded in output files | P1 | io | M | — | seed |
| CFY-31 | Namespaced runner → editor custom events | P8 P10 | proto | S | — | seed |
| CFY-32 | `/features` handshake and `/userdata` store | P8 | proto | S | — | seed |
| CFY-33 | Node definitions as a cross-host contract | P10 | proto | M | ref | seed |
| CFY-34 | Graph ↔ code round trip | P7 P9 | io | L | adapt | seed |
| CFY-35 | Exporter registry `exportAs(format)` | P10 | io | S | adapt | sketched |
| CFY-36 | Runner output sinks and asset/model manifest | P1 P8 | runtime | M | adapt | seed |
| CFY-37 | App manifest node: graph → form-based app | P1 P8 P9 | app | L | adapt | sketched |
| CFY-38 | Host-application plugins driving a runner | P1 | app | L | ref | seed |
| CFY-39 | Streaming frame-processor mode | P1 P4 | runtime | L | adapt | seed |
| CFY-40 | Distributed regions dispatched to worker runners | P1 P8 | runtime | XL | adapt | seed |
| CFY-41 | Editor commands and runner as MCP tools | P7 | proto | M | adapt | sketched |
| CFY-42 | Agent edit policy (human document wins) | P7 P10 | core | M | ref | seed |
| CFY-43 | Template pack format | P9 P10 | io | S | adapt | sketched |
| CFY-44 | Graph-declared asset dependencies | P1 | core | M | adapt | seed |
| CFY-45 | Theme token set with fallbacks | P10 | core | M | ref | sketched |
| CFY-46 | Palettes as pack assets | P10 | ext | S | adapt | seed |
| CFY-47 | Panel contributions, toasts with ids, contribution provenance | P10 | core | M | ref | sketched |
| CFY-48 | Key-binding conflict and prefix validation | P10 | core | S | ref | sketched |
| CFY-49 | Stable ids on menu items | P10 | core | S | ref | sketched |
| CFY-50 | Owned UI layers | P10 | core | S | ref | seed |
| CFY-51 | Resizable widget rows; unknown-widget fallback | P10 | core | M | ref | seed |
| CFY-52 | Late extension loading when idle | P10 | core | S | ref | seed |
| CFY-53 | i18n hook for names, menus and search | P10 | core | M | none | seed |
| CFY-54 | Gestures: shake to detach, swap in place, fill connections | P10 | ext | M | ref | seed |
| CFY-55 | Pack manifest extras: editor range, platform tags | P10 | core | S | — | seed |

## WebGLStudio, LiteScene and litegl (`WGS`)

[landscape/webglstudio-litescene.md](landscape/webglstudio-litescene.md)

| ID | Idea | Purpose | Kind | Effort | Reuse | Maturity |
|---|---|---|---|---|---|---|
| WGS-01 | Locator property node (get/set any scene property by path) | P3 | node | S | adapt | sketched |
| WGS-02 | Graph component with `on_event` modes | P3 | ext | M | adapt | sketched |
| WGS-03 | Shared graph templates instanced per object | P3 P10 | core | M | adapt | sketched |
| WGS-04 | Drag a scene object or property onto the canvas | P3 P10 | ext | S | adapt | seed |
| WGS-05 | Object actions and events as slots | P3 | core | S | adapt | seed |
| WGS-06 | Graph material: uniforms and properties derived from the graph | P2 | ext | M | adapt | sketched |
| WGS-07 | Revive shader lighting outputs | P2 | node | M | adapt | seed |
| WGS-08 | FX graph nodes (SSAO, motion blur, upscale, volumetric) | P2 | node | M | adapt | seed |
| WGS-09 | Timeline and animation-track panel | P3 P4 | ext | L | adapt | seed |
| WGS-10 | litegl upstream check (pin, update or replace) | P2 | runtime | S | adapt | seed |

## nunuStudio (`NUN`)

[landscape/nunustudio.md](landscape/nunustudio.md)

| ID | Idea | Purpose | Kind | Effort | Reuse | Maturity |
|---|---|---|---|---|---|---|
| NUN-01 | `LiteGraphScript` object for nunuStudio | P3 | app | M | adapt | sketched |
| NUN-02 | NodeEditor tab hosting `LGraphCanvas` | P3 P10 | app | M | adapt | sketched |
| NUN-03 | Graph → `ShaderMaterial` material editor | P2 | io | L | adapt | seed |
| NUN-04 | three.js version adapter (instance from the host) | P3 | core | M | — | seed |
| NUN-05 | Generic host scene contract | P3 | core | M | — | sketched |
| NUN-06 | Upstream offer to fill nunu's `NodeScript` stub | P3 | app | S | adapt | seed |

## 3D libraries and standards (`3D`)

[landscape/3d-libraries.md](landscape/3d-libraries.md)

| ID | Idea | Purpose | Kind | Effort | Reuse | Maturity |
|---|---|---|---|---|---|---|
| 3D-01 | KHR_interactivity import ([card](cards/3D-01-gltf-khr-interactivity.md)) | P3 | io | L | adapt | investigated |
| 3D-02 | KHR_interactivity export with validation | P3 | io | L | adapt | sketched |
| 3D-03 | KHR conformance runner | P3 | runtime | M | adapt | sketched |
| 3D-04 | glTF JSON-pointer nodes | P3 | node | M | — | sketched |
| 3D-05 | litegraph → TSL compiler | P2 | io | XL | adapt | sketched |
| 3D-06 | TSL uniform widgets | P2 | widget | S | adapt | seed |
| 3D-07 | Render-pipeline (frame graph) family | P2 | node | L | adapt | seed |
| 3D-08 | Babylon NME JSON importer | P2 | io | L | adapt | seed |
| 3D-09 | Procedural mesh family | P2 P3 | node | M | adapt | seed |
| 3D-10 | Offscreen preview in node bodies | P2 P10 | widget | L | — | sketched |
| 3D-11 | WebGPU texture preview widget | P2 | widget | M | adapt | seed |
| 3D-12 | three.js upgrade and `three/webgpu` manifest entry | P2 P3 | runtime | S | adapt | sketched |
| 3D-13 | Scene-inspector nodes | P3 | node | S | adapt | seed |
| 3D-14 | three.js editor graph-script bridge | P3 | io | M | adapt | seed |
| 3D-15 | A-Frame adapter | P3 | app | M | adapt | seed |
| 3D-16 | React-three-fiber adapter | P3 | app | M | adapt | seed |
| 3D-17 | model-viewer widget node | P3 P9 | widget | S | adapt | seed |
| 3D-18 | Trigger-port conventions and op documentation schema | P10 | core | S | adapt | seed |
| 3D-19 | regl or twgl backend replacing litegl | P2 | runtime | L | adapt | seed |
| 3D-20 | Per-stage shader subgraphs and an expression node | P2 | node | M | adapt | seed |
| 3D-21 | PlayCanvas script-attribute bridge | P3 | app | M | adapt | seed |
| 3D-22 | Physics bound to scene objects | P3 | node | M | adapt | seed |

## Other JS libraries (`JS`)

[landscape/js-libraries.md](landscape/js-libraries.md)

| ID | Idea | Purpose | Kind | Effort | Reuse | Maturity |
|---|---|---|---|---|---|---|
| JS-01 | MCP tools as nodes | P7 | node | L | adapt | sketched |
| JS-02 | Graph as MCP server | P7 P8 | runtime | M | adapt | sketched |
| JS-03 | LLM chat and agent family | P7 | node | M | adapt | sketched |
| JS-04 | Web Audio graph mode | P4 | runtime | L | — | seed |
| JS-05 | Tone.js family | P4 | node | M | adapt | seed |
| JS-06 | Faust DSP node | P4 | node | M | ref | seed |
| JS-07 | Elementary compile | P4 | io | L | adapt | seed |
| JS-08 | MQTT, Web Serial and MIDI I/O | P5 | node | M | adapt | seed |
| JS-09 | Thin Firmata node | P5 | node | M | adapt | seed |
| JS-10 | Chart widgets (uPlot) | P6 | widget | M | adapt | seed |
| JS-11 | Plot-spec node (Vega-Lite, Observable Plot) | P6 | node | M | adapt | seed |
| JS-12 | Dataframe family (Arquero) | P6 | node | M | adapt | seed |
| JS-13 | DuckDB SQL node | P6 | node | M | adapt | seed |
| JS-14 | CodeMirror 6 code widget | P10 | widget | M | adapt | sketched |
| JS-15 | Monaco side panel | P10 | ext | M | adapt | seed |
| JS-16 | Multiplayer graphs with Yjs | P10 | ext | XL | adapt | seed |
| JS-17 | Branchable graph history with Automerge | P10 | ext | L | adapt | seed |
| JS-18 | Force layout command (d3-force) | P10 | ext | S | adapt | seed |
| JS-19 | Schema → node definitions (zod, JSON Schema, Ajv) | P10 | core | M | adapt | sketched |
| JS-20 | Statechart subgraph (XState) | P3 P8 | node | L | adapt | seed |
| JS-21 | Observable slot type (RxJS) | P10 | core | L | adapt | seed |
| JS-22 | Extism plugin nodes | P10 | runtime | L | adapt | seed |
| JS-23 | Pyodide script node | P6 P9 | node | L | adapt | seed |
| JS-24 | transformers.js pipeline nodes | P1 P7 | node | L | adapt | seed |
| JS-25 | Generic ONNX inference node | P1 | node | M | adapt | seed |
| JS-26 | MediaPipe landmark nodes | P4 P9 | node | M | adapt | seed |
| JS-27 | OpenCV.js filter family | P6 | node | L | adapt | seed |
| JS-28 | Video frames (WebCodecs, ffmpeg) | P1 P6 | node | L | ref | seed |
| JS-29 | Map widget and geo nodes | P6 | widget | M | adapt | seed |
| JS-30 | Physics world-step node | P3 | node | M | adapt | seed |
| JS-31 | Pixi canvas renderer | P10 | core | XL | adapt | parked |
| JS-32 | Image annotation widget (Konva, fabric) | P1 P6 | widget | M | adapt | seed |
| JS-33 | TensorFlow.js model nodes | P1 | node | M | adapt | seed |
| JS-34 | Lazy library loading UX (size, license, progress) | P10 | ext | S | — | sketched |

## Bun process designer and runner (`BUN`)

[landscape/bun-process-runner.md](landscape/bun-process-runner.md)

| ID | Idea | Purpose | Kind | Effort | Reuse | Maturity |
|---|---|---|---|---|---|---|
| BUN-01 | Process runner on Bun ([card](cards/BUN-01-process-runner-on-bun.md)) | P8 | runtime | XL | — | investigated |
| BUN-02 | Process execution mode (token along event links) | P8 | core | L | — | sketched |
| BUN-03 | Durable step journal with resume | P8 | runtime | L | — | sketched |
| BUN-04 | Retry, backoff, timeout and idempotency-key properties | P8 | node | M | ref | sketched |
| BUN-05 | Cron and persisted timer triggers | P8 P5 | node | S | — | sketched |
| BUN-06 | Webhook trigger and HTTP response node | P8 | node | M | ref | sketched |
| BUN-07 | Approval / wait-for-token step | P8 | node | M | ref | sketched |
| BUN-08 | Executions panel | P8 | ext | L | ref | sketched |
| BUN-09 | Live run overlay | P8 P10 | ext | M | adapt | sketched |
| BUN-10 | Context store (run, graph, global) | P8 | runtime | M | adapt | sketched |
| BUN-11 | Credential vault | P8 P7 | runtime | M | ref | sketched |
| BUN-12 | Capability grants replacing the denylist | P8 P10 | core | M | — | sketched |
| BUN-13 | Versioned sub-process call | P8 | node | M | — | seed |
| BUN-14 | Gateways, error boundary and compensation | P8 | node | M | ref | sketched |
| BUN-15 | Single-binary runner (`bun build --compile`) | P8 | app | M | — | sketched |
| BUN-16 | Runtime adapter interface (Node and Bun) | P8 P10 | runtime | M | — | sketched |
| BUN-17 | `sql/*` family on `Bun.SQL` | P6 P8 | node | M | — | seed |
| BUN-18 | Redis and S3 nodes | P8 | node | S | — | seed |
| BUN-19 | PTY terminal widget | P8 | widget | M | — | seed |
| BUN-20 | Browser automation nodes | P8 | node | M | — | seed |
| BUN-21 | Export to Actions-style YAML or an OS schedule | P8 | io | M | — | seed |
| BUN-22 | BPMN XML import and export | P8 | io | XL | ref | seed |

## Repository tooling (`DEV`)

From the [2025 improvements ledger](../audits/2026-11-19-improvements-ledger.md): tooling gaps that are not product features.

| ID | Idea | Purpose | Kind | Effort | Reuse | Maturity |
|---|---|---|---|---|---|---|
| DEV-01 | Coverage report in the gate, with a floor threshold | P10 | runtime | S | — | seed |
| DEV-02 | Large-graph benchmarks (`runStep` and draw at 1k and 10k nodes) with a regression budget, plus a performance guide | P10 | runtime | M | — | seed |
| DEV-03 | Canvas visual-regression snapshots of `editor_build.html` fixtures | P10 | runtime | M | — | seed |
| DEV-04 | Source maps for `build/` bundles | P10 | runtime | S | — | seed |
| DEV-05 | Release workflow: version alignment checklist, tag-triggered publish after `npm run check` | P10 | app | S | — | seed |
| DEV-06 | Node and extension scaffolder (template, test stub, declaration entry) | P10 P9 | app | S | — | seed |
