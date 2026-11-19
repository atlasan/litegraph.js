# Census: what other projects build on litegraph

Date: 2026-11-19. Status: **investigation**, living. Ideas `USE-01`–`USE-45`.

**Question:** who builds on litegraph (jagenjo's original, Comfy-Org's standalone, litegraph.ts, litegraph-tsx and other forks)? For which purpose, and what did they add on top?

**Method:**
- GitHub code search: `"litegraph.js"` in `package.json` found about 217 repositories; `@comfyorg/litegraph` was also searched.
- Targeted searches for `LGraphCanvas` with domain words.
- The [dependents page](https://github.com/jagenjo/litegraph.js/network/dependents), about 298 repositories.
- jagenjo's README list.
- Licenses come from the GitHub API, and activity is the last push.

**Coverage:** ComfyUI is excluded here (see [comfyui-world](comfyui-world.md) and the ecosystem study). Projects marked [I] were read only through paths or descriptions. About a third have **no license** (`none`), which makes them design references only.

## 1. Projects by purpose

### P7: LLM, agents and AI workflows

| Project | License, activity | What they built | Ideas |
|---|---|---|---|
| [GraphLLM](https://github.com/matteoserva/GraphLLM) | none, 2026 | Python engine. Loops and conditionals that change the topology; parallel nodes; streamed LLM output; watch nodes attached during a run; nested graphs | USE-01, USE-02, USE-03 |
| [Bespoke Automata](https://github.com/C0deMunk33/bespoke_automata) | GPL-3.0, 2026 | Each saved graph is served as an API endpoint and as an MCP tool, with a schema taken from its inputs and outputs. Editor, Manager and Runner tabs | USE-04, USE-05 |
| [Talemate](https://github.com/vegu-ai/talemate) | AGPL-3.0, 2026 | Python node registry; recent nodes; reference for 400+ nodes that a help agent can search; **aliases for renamed node types** | USE-06, USE-07, X-07 |
| [langgraph-editor](https://github.com/Erickrus/langgraph-editor) | MIT, 2024 | A graph compiled to LangGraph Python code | USE-08 |
| [zihuan-next](https://github.com/FredYakumo/zihuan-next) | AGPL-3.0, 2026 | Rust agent platform; registry, history, layout, widget system, node UIs rendered from templates | — |
| [graphai-litegraph](https://github.com/receptron/graphai-litegraph) | none, 2026 | Vue builder for GraphAI agent graphs; the built bundle is tested in headless Chromium | USE-09 |
| [FiftyComfy](https://github.com/harpreetsahota204/FiftyComfy) | none, 2026 | FiftyOne plugin; every link carries a dataset view; a Python executor runs the graph in topological order | USE-10 |

### P2 and P3: 3D, real-time graphics, shaders, game logic

| Project | License, activity | What they built | Ideas |
|---|---|---|---|
| [WebGLStudio](https://github.com/jagenjo/webglstudio.js) / [LiteScene](https://github.com/jagenjo/litescene.js) | MIT; archived | Graph components, shader and FX graphs: see [webglstudio-litescene](webglstudio-litescene.md) | WGS-* |
| [HDR4EU](https://github.com/upf-gti/HDR4EU) | MIT, 2025 | Scene and atmosphere nodes for lighting matching | — |
| [LightUSD](https://github.com/lighttransport/LightUSD) | NOASSERTION, 2026 | **MaterialX / OpenPBR graph viewer** with typed sockets | USE-11 |
| [bevy-shader-effects-graph](https://github.com/saschb2b/bevy-shader-effects-graph) | MIT, 2026 | React, litegraph and a WebGPU live preview; compiles to a Bevy shader; starter recipes of 2–3 nodes | USE-12 |
| [SM-Engine](https://github.com/MEDELBOU3/SM-Engine) | MIT, 2026 | three.js editor; graph tools beside timeline, rigging and plugin manifests | — |
| MOI Elephant ([site](http://moiscript.weebly.com/elephant-systegraveme-nodal.html)) | unverified | Nodal scripting inside the MoI 3D CAD program | — |
| [behaviour-planner.js](https://github.com/upf-gti/behaviour-planner.js) | none, 2022 | **Hybrid behaviour trees** (selector, sequencer, parallel, timeline intent, NLP compare, HTTP nodes) | USE-13 |
| [density-function-editor](https://github.com/jacobsjo/density-function-editor) | MIT, 2024 | Minecraft world-generation JSON; outputs limited to one link; warning widgets | USE-14 |
| [Trade Bots](https://github.com/cinqmarsmedia/Trade-Bots-Algorithmic-Trading-Game) | MPL-2.0, 2025 | A Steam game where players wire trading bots | USE-15 |
| [Irminsul](https://github.com/lambdv/Irminsul) | none, 2026 | A game calculator embedded in a Next.js app | — |

### P4: Audio, music and live performance

| Project | License, activity | What they built | Ideas |
|---|---|---|---|
| [web-synth](https://github.com/Ameobea/web-synth) | effectively GPL (Faust), 2026 | **Redux owns the patch network; litegraph is a view reconciled by diffing.** Faust and Soul DSP compiled to WebAssembly nodes; WebMIDI | USE-16, USE-17 |
| [AudioX](https://github.com/wk1093/audiox) | GPL-3.0, 2026 | Routing graph for a Raspberry Pi audio engine; wraps `graph.remove` so host-owned nodes cannot be deleted | USE-18 |
| [cyperus-litegraph](https://github.com/petrichorsystems/cyperus-litegraph) | MIT, 2025 | Fork used as the editor of an audio server [I] | — |
| [graph-scene-switcher](https://github.com/UUoocl/graph-scene-switcher) | ISC (package.json only), 2026 | OBS automation with SSE and BroadcastChannel event nodes; **`?deploy=` loads and starts a graph** | USE-19 |

### P5: IoT, hardware and robotics

| Project | License, activity | What they built | Ideas |
|---|---|---|---|
| [MyNodes.NET](https://github.com/dy-sh/MyNodes.NET) | GPL-3.0, 2022 | Home automation over Arduino and NRF24; a C# controller runs graphs; **dashboards built from UI nodes** | USE-20 |
| [Dexter DDE](https://github.com/cfry/dde) | GPL-3.0, 2025 | Robot-arm environment; logic-gate palette; a comparison with Node-RED | — |
| [DIVER / CoralinkerHost](https://github.com/artheru/DIVER) | none, 2026 | Microcontroller topology as nodes; status, version and a log stream per node | USE-21 |
| [mujoco-mojo](https://github.com/Hydrowelder/mujoco-mojo) | Apache-2.0, 2026 | MuJoCo trial orchestration [I] | — |
| [Bittly](https://github.com/sige5193/bittly) | GPL-2.0, 2023 | Serial, Modbus and MQTT functional test flows | USE-22 |

### P6: Data, ETL and science

| Project | License, activity | What they built | Ideas |
|---|---|---|---|
| [MarkLogic Pipes](https://github.com/marklogic-community/pipes) | Apache-2.0, 2021 | Generates server-side code for Data Hub steps | USE-08 |
| [BentoViz](https://github.com/akhenakh/bentoviz) | MIT, 2026 | **Nodes generated from Bento's JSON Schema**; deploy over REST; YAML export | X-05 |
| [HiCT WebUI](https://github.com/ctlab/HiCT_WebUI) | MIT, 2026 | **Validated loader**: allowlisted types, at most 1024 nodes, bounded coordinates, no arbitrary runtime fields | USE-23, X-04 |
| [geo-engine workflow-editor](https://github.com/geo-engine/workflow-editor) | Apache-2.0, 2024 | Nodes from backend operator definitions; inline validation summaries | USE-24 |
| [Chaldene](https://github.com/Max-ChenFei/Chaldene) | NOASSERTION, 2023 | Visual image processing inside Jupyter ([paper](https://ieeexplore.ieee.org/document/9832910)) | USE-25 |
| [oapi-litegraph-nodegen](https://github.com/soldarlabs/oapi-litegraph-nodegen) | MIT, 2024 | **Callable nodes generated from OpenAPI specs** | USE-26 |
| [Datagrok Flow](https://github.com/datagrok-ai/public/tree/master/packages/Flow) | MIT, 2026 | v1 on litegraph, now on Rete with a migration script; data size shown on wires | USE-27 |

### P8: Process automation and infrastructure

| Project | License, activity | What they built | Ideas |
|---|---|---|---|
| [RackHD on-web-ui](https://github.com/RackHD/on-web-ui) | none, 2020 | Bare-metal task graphs; `onConnectionsChange` writes dependencies back into the workflow document | USE-28 |
| [netsocket](https://github.com/strayfade/netsocket) | conflicting license | Docker automation; **one module per node exports both the UI definition and the server function**; node-writing guide for agents | USE-29 |
| [NSE](https://github.com/domingosl/nse) | none, 2022 | Blockchain event listener; graphs run from an Agenda job queue | USE-30 |
| [DisFlow](https://github.com/DisFlowTeam/disflow) | none, 2026 | Discord bot builder; graph → generated JavaScript | USE-08 |

### P9: Education

| Project | License, activity | What they built | Ideas |
|---|---|---|---|
| [ETH.Build](https://github.com/austintgriffith/eth.build) | MIT, 2024 | Module nodes wrap subgraphs and keep ports in sync; pub/sub and IPFS nodes; **graphs shared as compressed URLs**; video lessons mapped to graphs | USE-31, USE-32 |
| [NodeGrade](https://github.com/HASKI-RAK/NodeGrade) | MIT, 2026 | LLM grading; **one node library shared by browser and server**; Socket.IO execution; saves with ETag/If-Match; per-node traces; LTI integration | USE-33, USE-34 |

### Engines, forks and embedding hosts

| Project | License, activity | What they built | Ideas |
|---|---|---|---|
| [graphexec](https://github.com/mcejp/graphexec) | MIT, 2022 | Python executes; Python decorators generate JS stub nodes | X-05 |
| [litegraph_native](https://github.com/jagenjo/litegraph_native) | MIT, 2022 | C++ runtime for JSON graphs made in the JS editor | USE-36 |
| [litegraph-fp](https://github.com/zuma/litegraph-fp) | MIT, 2026 | Headless, immutable graphs, pure nodes, a watchdog for runaway nodes | USE-35 |
| [hybrid-litegraph](https://github.com/499940913/hybrid-litegraph) | MIT, 2026 | WPF WebView host with Electron, Node and Python backends | USE-39 |
| [Pyxis-Effector](https://github.com/Mandholine/Pyxis-Effector) | GPL-3.0, 2026 | AST validation before generation; loops over text units; SHA-256 result cache | USE-37, USE-38 |

## 2. Projects that left litegraph

| Project | What they said |
|---|---|
| [ThingStudio](https://github.com/mkarliner/ThingStudio) (Apache-2.0) | litegraph 0.7.18 had "no reliable graph changed callback", so they polled every second ([decision](https://github.com/mkarliner/ThingStudio/blob/main/docs/working-notes/archive/rete-migration-decision.md)). Rete won on type checks where links are made, multi-output sockets and the property panel ([POC](https://github.com/mkarliner/ThingStudio/blob/main/pocs/poc-rete/README.md)). Only about 190 lines of their code depended on litegraph. |
| [T2AutoTron](https://github.com/gregtee2/T2AutoTron) | The litegraph editor is now "legacy"; the current one uses Rete ([changelog](https://github.com/gregtee2/T2AutoTron/blob/main/CHANGELOG.md)). |
| Datagrok Flow | Moved to Rete v2 with a migration script. |
| [XROps](https://github.com/smin0136/XROps) | Still lists litegraph in package.json, but the frontend is Rete ([arXiv](https://arxiv.org/abs/2507.10043)). |

**Lesson:** what decides whether an application stays on litegraph:
- a reliable change event
- type rejection at connect time
- DOM node bodies

Wave 1 delivered typed events and `graph.transact`. Documenting them as *the* "graph changed" API is cheap and directly answers the main reason given for leaving [I] (X-03).

## 3. Other node editors to compare

| Editor | Distinctive feature | Idea |
|---|---|---|
| [Node-RED](https://nodered.org/docs/user-guide/editor/workspace/subflows) | Subflows with instance properties; deploy full, modified flows or modified nodes | BUN-* |
| [Rete.js](https://retejs.org/docs) | Plugin pipeline independent of the render framework; separate dataflow and control-flow engines | USE-40 |
| [BaklavaJS](https://baklava.tech) | Typed interfaces with conversions; Vue node bodies | USE-40 |
| [xyflow / React Flow](https://reactflow.dev) | DOM nodes, state controlled by the application, sub-flows | USE-16 |
| [cables.gl](https://cables.gl/docs) | Trigger versus value ports; versioned, documented ops | 3D-18 |
| [Blender Geometry Nodes](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/fields.html) | Fields: values evaluated lazily per element; socket shape shows a field | USE-41 |
| [Unreal Blueprints](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprints-visual-scripting-in-unreal-engine) | Execution pins vs data pins; breakpoints with value inspection | USE-42 |
| [Houdini HDAs](https://www.sidefx.com/docs/houdini/assets/index.html) | Versioned digital assets with promoted parameters | Wave 3 |
| [TouchDesigner](https://docs.derivative.ca/Operator) | Operator families by data type, pull evaluation, a live viewer in every node | USE-44 |
| [n8n](https://docs.n8n.io/data/data-pinning/) | Item-based execution, pinned test data, execution history | USE-43 |
| [Enso](https://enso.org) | Two-way visual/text editing; live data views per node | USE-45 |

## 4. Ideas

| ID | Idea | Purpose | Kind | Effort |
|---|---|---|---|---|
| USE-01 | **Watch nodes attached during a run** without restarting it | P7, P10 | runtime | M |
| USE-02 | **Schedule-when-ready execution**: a node runs as soon as its inputs are ready, in parallel where possible | P7, P8 | runtime | L |
| USE-03 | **Streamed partial output** into node bodies (tokens, progress, previews) | P7 | widget | M |
| USE-04 | **Publish a saved graph as an endpoint or MCP tool**, with a schema taken from its inputs and outputs | P7, P8 | runtime | M |
| USE-05 | **Editor, manager and runner split** in the application shell | P8 | app | M |
| USE-06 | **Node reference generated from the registry**, searchable by people and agents | P9, P10 | ext | S |
| USE-07 | **Recent-nodes palette** | P10 | ext | S |
| USE-08 | **Code-generation targets**: compile a graph to LangGraph, JavaScript, server steps (see X-06) | P6, P7, P8 | io | L |
| USE-09 | **Smoke-test the built bundles in headless Chromium** as part of the release gate | P10 | runtime | S |
| USE-10 | **Domain object slot type** for apps where one object flows through every link, plus embedding as a plugin inside a host app | P6 | core | M |
| USE-11 | **MaterialX / OpenPBR import and view** | P2 | io | L |
| USE-12 | **Compile to a shader with a live preview**, plus starter recipes | P2, P9 | io | L |
| USE-13 | **Behaviour-tree execution mode** (selector, sequencer, parallel, decorators) | P3, P7 | runtime | L |
| USE-14 | **Per-node link policies** (single output link, maximum fan-in) and in-node warnings | P10 | core | S |
| USE-15 | **Progressive palette unlock** for games and courses | P9 | ext | S |
| USE-16 | **Canvas as a projection of an external model**, reconciled by diff (see X-03) | P4, P10 | core | L |
| USE-17 | **Nodes generated from compiled DSP code** (see JS-06) | P4 | node | M |
| USE-18 | **Host-protected nodes**: a deletion and edit policy hook instead of wrapping `graph.remove` | P5, P10 | core | S |
| USE-19 | **Deploy by URL** (`?deploy=`) and **BroadcastChannel nodes** between tabs | P4, P8 | ext | S |
| USE-20 | **Dashboards generated from UI nodes** | P5 | ext | L |
| USE-21 | **Per-node log stream and device-status badge** | P5 | ext | M |
| USE-22 | **Hardware-protocol test-case graphs** (read, write, if, loop, delay against serial, Modbus, MQTT) | P5 | node | M |
| USE-23 | **Validated loader for untrusted graphs** (see X-04) | P10 | core | M |
| USE-24 | **Nodes from a backend operator catalog** with inline validation summaries (see X-05) | P6 | io | M |
| USE-25 | **Notebook widget**: the canvas embedded in Jupyter (anywidget) | P6, P9 | app | M |
| USE-26 | **OpenAPI node-pack generator** | P6, P8 | io | M |
| USE-27 | **Data size on wires** (rows × columns, bytes) | P6 | ext | S |
| USE-28 | **Two-way mapping** between a graph and a domain workflow document | P8 | io | M |
| USE-29 | **One module per node** for UI definition and runtime function; node-writing guide for agents | P8, P10 | core | M |
| USE-30 | **Run graphs from a job queue** | P8 | runtime | M |
| USE-31 | **Share a graph through a compressed URL** | P9 | ext | S |
| USE-32 | **Pub/sub nodes between users' graphs** | P9 | node | M |
| USE-33 | **Optimistic save conflicts** (ETag / If-Match) for stored graphs | P10 | runtime | S |
| USE-34 | **Per-node execution trace** | P10 | runtime | M |
| USE-35 | **Runaway-node watchdog** and execution limits for a deployment | P8 | runtime | M |
| USE-36 | **Portable graph format conformance**: a fixture suite so other runtimes (C++, Python) can check they execute our JSON the same way | P10 | proto | M |
| USE-37 | **Graph lint before run**: type, reachability and policy checks with results on the nodes | P10 | ext | M |
| USE-38 | **Content-hash result cache**: skip nodes whose inputs did not change | P1, P6 | runtime | M |
| USE-39 | **Desktop host template** (WebView, Tauri or Electron) with a local runner | P10 | app | M |
| USE-40 | **Type rejection at connect time with conversions**, as in Rete and Baklava | P10 | core | M |
| USE-41 | **Fields**: values evaluated lazily per element, shown by socket shape | P2 | core | XL |
| USE-42 | **Breakpoints with value inspection** | P10 | runtime | L |
| USE-43 | **Pinned test data per node**, to edit downstream without re-running upstream | P8 | ext | M |
| USE-44 | **Live viewer in every node**, optional per node (see 3D-10) | P2, P4 | widget | L |
| USE-45 | **Two-way visual and text editing** (see CFY-34) | P9, P10 | io | XL |
