# Purposes: what node graphs are for

> **Updated** 2026-11-20 · **Kind** idea taxonomy · **Status** living

This taxonomy is the **first axis** of the ideas database. Each idea serves one or more purposes. The [catalog](catalog.md) is the second axis (one row per idea), and the [landscape](README.md#landscape-investigations) documents are the evidence.

A purpose describes **what the user is trying to make**, not a technology. Each purpose has five parts:
- **Builds:** what people produce.
- **Seen in:** projects in the [census](landscape/litegraph-census.md) and other studies.
- **Needs from the host:** what a litegraph host must provide.
- **This fork today:** existing node families and runtime.
- **Key ideas:** the most relevant catalog IDs.

## P1: Generative AI and media pipelines

- **Builds:** image, video and audio generation and processing graphs that run on a GPU backend.
- **Seen in:** ComfyUI and its ecosystem ([comfyui-world](landscape/comfyui-world.md)), FiftyComfy.
- **Needs from the host:**
  - rich value widgets (curve, range, bbox, mask)
  - media previews and output history
  - large asset references
  - result caching
  - a submit-and-follow runner API
- **This fork today:** a ComfyUI JSON interop experiment and no GPU backend. litegraph is the editor here; the backend is someone else's.
- **Key ideas:** CFY-01 to CFY-16, CFY-27 to CFY-30, CFY-37, CFY-39, USE-38, JS-24, JS-25, X-01, X-02.

## P2: Real-time graphics: shaders, materials, textures, FX

- **Builds:** shader and material graphs, texture generators, post-processing chains, procedural meshes.
- **Seen in:**
  - WebGLStudio/LiteScene ([webglstudio-litescene](landscape/webglstudio-litescene.md))
  - bevy-shader-effects-graph, LightUSD (MaterialX), HDR4EU
  - non-litegraph: Babylon NME, three.js TSL, Godot, cables.gl ([3d-libraries](landscape/3d-libraries.md))
- **Needs from the host:**
  - code generation (graph → shader or TSL)
  - a live preview per node
  - uniform widgets that update without recompiling
  - type-aware slots (vec2/3/4, textures)
- **This fork today:** `glshaders.js`, `gltextures.js`, `glfx.js` (litegl), `geometry.js`, `math3d.js`.
- **Key ideas:** 3D-05 to 3D-11, 3D-19, 3D-20, WGS-06 to WGS-08, WGS-10, USE-11, USE-12, USE-41, USE-44, FLW-08 (dataflow and realtime profiles), FLW-12, FLW-13, FLW-21.
- **Decision this purpose raises:** keep the litegl families, or move to TSL? See [3d-libraries §3](landscape/3d-libraries.md#3-directions-worth-deciding).

## P3: Scene and game logic, behaviours

- **Builds:** logic attached to 3D or 2D scene objects, interactive glTF, behaviour trees, game rules, editors for game data.
- **Seen in:**
  - LiteScene GraphComponent, behaviour-planner.js, density-function-editor, Trade Bots
  - the KHR_interactivity standard, the nunuStudio stub ([nunustudio](landscape/nunustudio.md))
- **Needs from the host:**
  - a host scene contract (lifecycle, find object, property paths)
  - event/action flows
  - per-object graph instances from shared templates
  - timelines
- **This fork today:** `threejs.js` (22 types), event slots, subgraphs.
- **Key ideas:** 3D-01 to 3D-04, 3D-12 to 3D-17, 3D-22, WGS-01 to WGS-05, WGS-09, NUN-01 to NUN-06, USE-13, JS-20, JS-30, FLW-01 to FLW-11, FLW-14, FLW-15 ([execution flows](landscape/execution-flows.md)).

## P4: Audio, music and live performance

- **Builds:** synth patches, effect routing, MIDI and OSC control, show automation (OBS, lights).
- **Seen in:** web-synth, AudioX, cyperus-litegraph, graph-scene-switcher; TouchDesigner as a comparison.
- **Needs from the host:**
  - an audio-rate engine separate from the tick loop
  - a model-as-source-of-truth view
  - DSP code as nodes
  - low-latency event I/O
- **This fork today:** `audio.js`, `midi.js`, OSC/UDP/Socket.IO libraries.
- **Key ideas:** JS-04 to JS-08, USE-16, USE-17, USE-19, WGS-09, FLW-05, FLW-09, FLW-12, FLW-21.

## P5: Devices, IoT and robotics

- **Builds:** home automation, sensor and actuator flows, robot and microcontroller topologies, protocol test benches.
- **Seen in:** MyNodes.NET, Dexter DDE, DIVER, Bittly, mujoco-mojo; Node-RED as a comparison.
- **Needs from the host:**
  - a long-running headless runner
  - hardware triggers (MQTT, serial, MIDI, UDP)
  - dashboards
  - per-node status and logs
  - host-owned nodes that users cannot delete
- **This fork today:** the Node runner, Node-only `sys`, `network` and `process` families, OSC and UDP.
- **Key ideas:** JS-08, JS-09, USE-18, USE-20 to USE-22, BUN-05, BUN-17, BUN-18.

## P6: Data processing, ETL and science

- **Builds:** table transforms, analysis pipelines, geo and genomics workflows, API orchestration.
- **Seen in:** BentoViz, HiCT, geo-engine, Chaldene, oapi-nodegen, MarkLogic Pipes, Datagrok Flow.
- **Needs from the host:**
  - table slot types
  - data size on wires
  - nodes generated from schemas or operator catalogs
  - notebook embedding
  - result caching
  - safe loading
- **This fork today:** `base`, `math`, `strings`, `objects`; `mysql/*` on Node.
- **Key ideas:** JS-10 to JS-13, JS-23, JS-27 to JS-29, USE-08, USE-10, USE-24 to USE-27, X-05.

## P7: LLM agents and tool orchestration

- **Builds:** prompt chains, agent loops, RAG pipelines, graphs exposed as tools.
- **Seen in:** GraphLLM, Bespoke Automata, Talemate, langgraph-editor, graphai-litegraph, NodeGrade; ComfyUI MCP servers.
- **Needs from the host:**
  - streaming output in nodes
  - loops and schedule-when-ready execution
  - MCP client and server
  - credential handling
  - publishing a graph as an endpoint
- **This fork today:** nothing specific; the runner and command registry are the base.
- **Key ideas:** JS-01 to JS-03, USE-01 to USE-04, USE-06, CFY-41, CFY-42, X-01.

## P8: Process automation and durable workflows

- **Builds:** triggered business and ops processes with retries, waits, approvals and history.
- **Seen in:** netsocket, NSE, RackHD, DisFlow; Node-RED, n8n, Windmill, Temporal, BPMN as comparisons ([bun-process-runner](landscape/bun-process-runner.md)).
- **Needs from the host:**
  - a process execution mode
  - a durable journal
  - triggers
  - a credential vault
  - capability grants
  - an executions panel
  - a public runner API
- **This fork today:** a secured Node runner without persistence.
- **Key ideas:** BUN-01 to BUN-22, USE-28 to USE-30, USE-35, USE-43, CFY-22, X-01.

## P9: Education and visual programming

- **Builds:** teaching sandboxes, guided lessons, games that teach logic, calculators.
- **Seen in:** ETH.Build, NodeGrade, Trade Bots, Irminsul.
- **Needs from the host:**
  - sharing by URL
  - tours and annotations
  - progressive palettes
  - starter recipes
  - generated node references
- **This fork today:** the editor and demo graphs.
- **Key ideas:** USE-06, USE-12, USE-15, USE-31, USE-32, CFY-19, 3D-17, FLW-05, FLW-06, FLW-08, FLW-14, FLW-22, FLW-23.

## P10: The host itself (platform and editor)

- **Builds:** this is what every other purpose needs from the library.
- **Seen in:** every project above; the reasons for leaving litegraph ([census §2](landscape/litegraph-census.md#2-projects-that-left-litegraph)).
- **Needs from the host:**
  - a reliable change stream
  - typed connect-time rejection
  - safe loading
  - widget host services
  - themes
  - key-binding hygiene
  - collaboration
  - the code editor
  - a portable format
- **This fork today:** the Wave 1 platform layer: commands, keybindings, settings, menus, extensions, widget classes, typed events, `transact`.
- **Key ideas:** X-02 to X-07, CFY-45 to CFY-55, USE-14, USE-16, USE-23, USE-33 to USE-40, USE-42, JS-14 to JS-19, JS-21, JS-22, JS-34, FLW-07, FLW-08, FLW-16, FLW-24.

## Purpose × kind at a glance

Counts of catalog rows on 2026-11-22 (236 ideas). An idea that serves several purposes is counted once for each. Regenerate the table from [catalog.md](catalog.md) when rows change.

| Purpose | node | widget | ext | io | runtime | core | proto | app | Total |
|---|---|---|---|---|---|---|---|---|---|
| P1 AI media | 4 | 11 | 2 | 1 | 4 | 8 | 4 | 2 | 36 |
| P2 Graphics | 6 | 6 | 2 | 6 | 3 | 6 |  |  | 29 |
| P3 Scene logic | 9 | 3 | 4 | 3 | 4 | 11 |  | 6 | 40 |
| P4 Audio | 6 | 4 | 2 | 1 | 2 | 4 |  |  | 19 |
| P5 Devices | 5 |  | 2 |  |  | 1 |  |  | 8 |
| P6 Data | 7 | 4 | 1 | 5 | 1 | 4 |  | 1 | 23 |
| P7 LLM | 3 | 1 |  | 3 | 7 | 2 | 2 |  | 18 |
| P8 Process | 11 | 1 | 4 | 6 | 12 | 6 | 6 | 3 | 49 |
| P9 Education | 5 | 1 | 7 | 4 |  | 7 |  | 5 | 29 |
| P10 Host |  | 9 | 18 | 4 | 11 | 37 | 3 | 6 | 88 |

**What the counts suggest [I]:**
- **P10 is where the core work is:** 37 core hooks, and most other purposes depend on them.
- **P8 is the largest application area,** because the Bun runner investigation decomposed it in detail.
- **P5 Devices is under-explored** compared with the existing OSC, UDP and MIDI families. It is a candidate for the next investigation.
