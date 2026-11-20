# Other JS libraries: node families, widgets and runtimes

> **Updated** 2026-11-19 · **Kind** idea area · **Status** living

Ideas `JS-01`–`JS-34`.

**Question:** which JavaScript libraries would make good node families, widgets, extensions or alternative runtimes for litegraph? What does each cost in weight, license and runtime support?

**How they plug in here:**
- **Optional dependencies** are declared in the library manifest (`LiteGraph.LibraryManager.registerLibrary`, `describeLibraries`, `probeLibraries`). They load lazily, like `threejs` in `src/nodes/threejs.js`.
- **Node families** declare `declareCapabilities` (`browser`, `node`, `network`, `sys`, and later `bun`).
- **Widgets** register with `LiteGraph.registerWidgetType`.
- **Editor features** register with `LiteGraph.registerExtension`.

Weights marked [I] are estimates. Re-verify licenses before promoting an idea.

## 1. Library survey

| Domain | Library | License | Weight and runtimes | Idea | Source |
|---|---|---|---|---|---|
| Audio | Tone.js | MIT | Browser | Synth, effect and transport nodes; transport synced with the graph clock | [repo](https://github.com/Tonejs/Tone.js) |
| Audio | AudioWorklet | Web standard | Browser | "Audio graph" mode that mirrors litegraph links onto AudioNodes [I] | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet) |
| Audio | @grame/faustwasm | LGPL-2.1+; faust-ui is GPL-3 | Large wasm [I]; browser and Node | Faust DSP node with a code widget, compiled to a worklet | [npm](https://www.npmjs.com/package/@grame/faustwasm) |
| Audio | Elementary | MIT | WASM; web and offline Node renderer | Compile a subgraph into an `el.*` tree [I] | [repo](https://github.com/elemaudio/elementary) |
| I/O | Web MIDI | Web standard; Firefox prompts for an add-on | Browser | MIDI in/out and a learn widget; this fork has `midi.js` already | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API) |
| I/O | Web Serial | Web standard; Chromium 89+, Firefox 151+, no Safari | Browser; `serialport` on Node | Serial port nodes | [Mozilla](https://hacks.mozilla.org/2026/05/web-serial-support-in-firefox/) |
| I/O | Johnny-Five | MIT | Node; inactive for 5 years | Skip; write a thin Firmata node instead | [npm](https://www.npmjs.com/package/johnny-five) |
| I/O | MQTT.js | MIT | Node, Bun [I], browser over WebSocket | Subscribe trigger and publish step | [repo](https://github.com/mqttjs/MQTT.js) |
| Viz | D3, d3-force | ISC | Modular | Custom node faces; force layout command | [d3](https://github.com/d3/d3) |
| Viz | Observable Plot | ISC | Moderate [I] | Plot-spec node rendering SVG into the node body | [repo](https://github.com/observablehq/plot) |
| Viz | Vega-Lite | BSD-3 | Heavy [I]; portable JSON spec | Spec-as-data node and exporter | [repo](https://github.com/vega/vega-lite) |
| Viz | Apache ECharts | Apache-2.0 | Heavy [I] | Dashboard panel | [repo](https://github.com/apache/echarts) |
| Viz | uPlot | MIT | Very small [I] | Live time-series widget | [repo](https://github.com/leeoniya/uPlot) |
| ML | TensorFlow.js | Apache-2.0 | Browser and Node | Model load and infer nodes | [repo](https://github.com/tensorflow/tfjs) |
| ML | ONNX Runtime Web | MIT | WASM/WebGPU; Node | Generic ONNX inference node | [repo](https://github.com/microsoft/onnxruntime) |
| ML | transformers.js v4 | Apache-2.0 | WebGPU, Node, Bun, Deno | Embed, classify and ASR pipeline nodes with a download-progress widget | [blog](https://huggingface.co/blog/transformersjs-v4) |
| ML | MediaPipe | Apache-2.0 | Browser | Camera → pose, hand or face landmark nodes | [repo](https://github.com/google-ai-edge/mediapipe) |
| LLM | OpenAI-compatible SDK | Apache-2.0 | All | One chat node with a `baseURL` setting covering OpenAI, Ollama, vLLM, LM Studio [I] | [repo](https://github.com/openai/openai-node) |
| LLM | Anthropic SDK | MIT | All | Provider adapter | [repo](https://github.com/anthropics/anthropic-sdk-typescript) |
| LLM | ollama-js | MIT | All | Local model list widget | [repo](https://github.com/ollama/ollama-js) |
| LLM | Vercel AI SDK | Apache-2.0 | Node 22+, ESM | Agent/tool-loop node; heavier abstraction than needed [I] | [docs](https://vercel.com/docs/ai-sdk) |
| LLM | Model Context Protocol | Spec MIT; TS SDK v2 Apache-2.0, v1 MIT | Spec 2026-07-28 is stateless | MCP client (tools → nodes) and server (graphs → tools) | [SDK](https://github.com/modelcontextprotocol/typescript-sdk) |
| Data | Arquero | BSD-3 | Light [I]; Arrow | Verb nodes on a `table` slot type | [repo](https://github.com/uwdata/arquero) |
| Data | DuckDB-WASM | MIT | About 34–39 MB wasm (about 7 MB brotli) | Lazy SQL-over-tables node | [jsDelivr](https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm/dist/) |
| Data | Danfo.js | MIT | Inactive | Skip; use Arquero | [Snyk](https://security.snyk.io/package/npm/danfojs) |
| Editors | CodeMirror 6 | MIT | Modular, light [I] | In-node code widget | [repo](https://github.com/codemirror/dev) |
| Editors | Monaco | MIT | Heavy, needs workers [I] | Full-screen code panel | [repo](https://github.com/microsoft/monaco-editor) |
| Collab | Yjs | MIT | All | Multiplayer graphs via a Y.Doc; awareness cursors | [repo](https://github.com/yjs/yjs) |
| Collab | Automerge | MIT | WASM | Graph history with branch and merge | [repo](https://github.com/automerge/automerge) |
| Collab | Liveblocks | Client Apache-2.0, server AGPL | SaaS | Optional adapter only | [blog](https://liveblocks.io/blog/open-sourcing-the-liveblocks-sync-engine-and-dev-server) |
| Layout | dagre | MIT | Light | Auto-arrange command | [repo](https://github.com/dagrejs/dagre) |
| Layout | elkjs | EPL-2.0 or GPL-3.0 | About 1.5 MB, in a worker | Optional port-aware layout with its notice shipped | [repo](https://github.com/kieler/elkjs) |
| Image | OpenCV.js | Apache-2.0 | Heavy WASM [I] | CV filter nodes | [repo](https://github.com/opencv/opencv) |
| Image | Pixi, Konva, fabric | MIT | Moderate [I] | Pixi as an alternative WebGL renderer for the canvas [I]; Konva or fabric for annotation widgets | [pixi](https://github.com/pixijs/pixijs), [konva](https://github.com/konvajs/konva) |
| Video | WebCodecs | Web standard | Browser | Frame decode and encode nodes | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API) |
| Video | ffmpeg.wasm | Wrapper MIT, core GPL-2.0+ | About 31 MB | Lazy transcode node; on a runner, spawn native ffmpeg | [docs](https://ffmpegwasm.netlify.app/docs/overview/) |
| Maps | Leaflet, MapLibre | BSD-2, BSD-3 | Moderate, heavy [I] | Map widget and geo nodes | [leaflet](https://github.com/Leaflet/Leaflet), [maplibre](https://github.com/maplibre/maplibre-gl-js) |
| Physics | Rapier, cannon-es | Apache-2.0, MIT | WASM, JS | World-step node ticking with the graph | [rapier](https://github.com/dimforge/rapier.js), [cannon-es](https://github.com/pmndrs/cannon-es) |
| Schema | zod 4, Ajv | MIT | Light | `z.toJSONSchema()` → node definition; Ajv validation | [zod](https://zod.dev/v4?id=json-schema-conversion), [ajv](https://github.com/ajv-validator/ajv) |
| State | XState v5 | MIT | Light | Statechart subgraph type and exporter | [repo](https://github.com/statelyai/xstate) |
| Reactive | RxJS; TC39 Signals | Apache-2.0; Stage 1 | — | Observable-backed slot type for push-based execution [I]; Signals are not ready | [rxjs](https://github.com/ReactiveX/rxjs) |
| WASM | Extism JS SDK | BSD-3 | Browser, Node, Deno, Bun (WASI limited) | Sandboxed plugin nodes in any language | [repo](https://github.com/extism/js-sdk) |
| Python | Pyodide | MPL-2.0 | About 13 MB core; 200 MB+ full | Python script node in a worker | [docs](https://pyodide.org/en/0.28.3/usage/downloading-and-deploying.html) |

## 2. Ideas

| ID | Idea | Purpose | Kind | Effort | Risks |
|---|---|---|---|---|---|
| JS-01 | **MCP tools as nodes**: connect to an MCP server, list its tools, generate node definitions from their input schemas | P7 | node | L | Two SDK lines; untrusted servers need capability grants (BUN-12) |
| JS-02 | **Graph as MCP server**: expose a graph, or a subgraph's interface, as a tool that agents can call | P7, P8 | runtime | M | Authorization; runner exposure |
| JS-03 | **LLM chat and agent family**: one OpenAI-compatible node plus provider adapters; streaming output; tool calls as EVENT outputs | P7 | node | M | Cost; keys need the vault (BUN-11) |
| JS-04 | **Web Audio graph mode**: litegraph links map onto AudioNodes; parameters are automated by data links | P4 | runtime | L | Audio timing versus the tick loop |
| JS-05 | **Tone.js family**: synths, effects and transport synced with the graph clock | P4 | node | M | Overlaps the existing `audio.js` |
| JS-06 | **Faust DSP node**: DSP code in a code widget, compiled to an AudioWorklet | P4 | node | M | LGPL/GPL packages; size |
| JS-07 | **Elementary compile**: compile an audio subgraph to an Elementary tree for offline rendering on Node | P4 | io | L | Concept mismatch |
| JS-08 | **MQTT, Web Serial and MIDI I/O**, usable as process triggers on the runner | P5 | node | M | Browser support gaps |
| JS-09 | **Thin Firmata node** instead of Johnny-Five | P5 | node | M | Hardware testing |
| JS-10 | **Chart widgets**: uPlot for live series; telemetry from the runner | P6 | widget | M | Bundle weight |
| JS-11 | **Plot-spec node**: Vega-Lite or Observable Plot spec as data, rendered into the node body or a panel | P6 | node | M | Heavy libraries, so lazy-load |
| JS-12 | **Dataframe family**: Arquero verbs on a `table` slot type | P6 | node | M | Large payloads in links |
| JS-13 | **DuckDB SQL node** on tables; native DuckDB or `bun:sqlite` on the runner | P6 | node | M | WASM size |
| JS-14 | **CodeMirror 6 code widget** for script, shader, SQL and prompt nodes | P10 | widget | M | Keyboard conflicts with canvas bindings |
| JS-15 | **Monaco side panel** for large code bodies | P10 | ext | M | Weight; workers |
| JS-16 | **Multiplayer graphs with Yjs**: nodes, links and groups in a Y.Doc; awareness cursors; reconcile Y.UndoManager with `graph.transact` | P10 | ext | XL | Undo semantics; id allocation |
| JS-17 | **Branchable graph history with Automerge** | P10 | ext | L | Overlap with JS-16 |
| JS-18 | **Force layout command** with d3-force, beside the dagre/ELK layouts in roadmap Wave 4 | P10 | ext | S | — |
| JS-19 | **Schema → node definitions**: generate inputs, outputs and widgets from JSON Schema or zod; validate links with Ajv | P10 | core | M | Schema features with no mapping |
| JS-20 | **Statechart subgraph**: XState-backed control state; export to and import from XState JSON | P3, P8 | node | L | Statecharts versus dataflow concepts |
| JS-21 | **Observable slot type**: push-based links backed by RxJS for event-heavy graphs | P10 | core | L | Mixing with pull execution |
| JS-22 | **Extism plugin nodes**: sandboxed WASM nodes in any language with explicit host functions | P10 | runtime | L | WASI gaps on Bun |
| JS-23 | **Pyodide script node** in a worker | P6, P9 | node | L | 13 MB+ load; MPL notice |
| JS-24 | **transformers.js pipeline nodes**: embed, classify, ASR, with model download progress | P1, P7 | node | L | Model downloads; GPU variance |
| JS-25 | **Generic ONNX inference node** | P1 | node | M | Tensor slot types |
| JS-26 | **MediaPipe landmarks**: camera → pose, hands, face, for creative coding | P4, P9 | node | M | Browser only |
| JS-27 | **OpenCV.js filter family** | P6 | node | L | WASM weight |
| JS-28 | **Video frames**: WebCodecs decode and encode; ffmpeg.wasm lazily, native ffmpeg on the runner | P1, P6 | node | L | GPL core |
| JS-29 | **Map widget and geo nodes** (Leaflet or MapLibre) | P6 | widget | M | Tile servers |
| JS-30 | **Physics world-step node** (Rapier or cannon-es) | P3 | node | M | Fixed timestep versus graph timing |
| JS-31 | **Pixi canvas renderer**: an alternative WebGL backend for drawing the graph itself | P10 | core | XL | The renderer is deferred in the roadmap |
| JS-32 | **Image annotation widget** (boxes, points, masks) on Konva or fabric | P1, P6 | widget | M | Overlaps with CFY widget ideas |
| JS-33 | **TensorFlow.js model nodes** | P1 | node | M | Overlaps JS-25 |
| JS-34 | **Lazy library loading UX**: show size, license and load progress before loading an optional library; one setting per library | P10 | ext | S | Needs manifest fields for size and license |

Ideas JS-14, JS-19 and JS-34 serve many other ideas. They are good first candidates if any of this area is promoted [I].
