# Execution flows: events, pure values, lifecycles and graph profiles

> **Updated** 2026-11-22 · **Kind** idea area · **Status** living

Ideas `FLW-01`–`FLW-24`.

**Question:** how do other node systems run their graphs? That covers exec pins against dataflow, when a value node is evaluated again, lifecycle and custom events, loops and latent nodes, and debugging. Which of their concepts fit this fork, and in which kind of graph?

**Method:**
- A survey of the documentation of 15 node systems, 2026-11-22. Each claim links its source; facts from memory are marked **[I]**.
- The fork's current system is in the [event flows audit](../../audits/2026-11-22-event-flows-audit.md), and the call-scope question is in the [research note](../../memories/research/2026-11-22-call-scopes-and-pure-nodes.md).
- **Not done:** the KHR_interactivity specification text could not be fetched (GitHub was unreachable); its details come from search excerpts and the Babylon.js docs and are marked [I].

**Reuse rule:** most donors are proprietary or copyleft, so they are design reference only (`ref`). Only Pure Data (BSD-3), Node-RED (Apache-2.0), Rete.js (MIT), Cables.gl (MIT) and Babylon.js FlowGraph (Apache-2.0) allow adapting code, with attribution. The [provenance rule](../../../AGENTS.md#rules) applies.

## Flow categories

Every node system mixes the same few flow styles. This fork's default (`ancestors`, Wave 6) is **mixed**: events, realtime steps and on-request data in one graph.

| Category | What drives it | Value evaluation | Typical graphs | Donors | This fork today |
|---|---|---|---|---|---|
| **Event scripting** (blueprint) | Exec pins: lifecycle, input and custom events push along a line | Pulled when an exec node runs | Game logic, UI behaviour, automation | UE Blueprints, Unity Script Graph, KHR_interactivity, Cables triggers | EVENT/ACTION slots, `ancestors` pull, loops, Sequence; no lifecycle or custom-event nodes |
| **Dataflow** (material) | An output node, or a compile step, pulls the whole graph | Pure, cached until an input changes | Shaders, materials, data pipelines, AI image pipelines | UE Material, Unity Shader Graph, Blender GN, ComfyUI, Rete Dataflow | ON_REQUEST plus `pure`; `glshaders` code generation |
| **Realtime** (media) | A frame or audio clock; every node every frame | Every frame, sometimes in blocks at signal rate | Audio, video, WebGL, animation | TouchDesigner, vvvv, Web Audio, UE AnimGraph, Max/Pd `~` | ALWAYS plus `runStep`; `ticks` declarations; audio nodes |
| **Stepped** (simulation) | Explicit discrete steps | Once per step, deterministic | Simulations, cellular automata, teaching | Houdini DOPs, Blender simulation zones | `strict` and `step` models |
| **Reactive** (UI) | User or device events only; no frame loop | On change | Forms, dashboards, IoT | Node-RED, Cables `onChange`, Pd messages | `event` model |
| **State machine and behaviour tree** | The active state or branch, with enter, update and exit | Per tick while active | Characters, AI, workflows | UE AnimGraph SM and Behavior Trees, Unity State Graph | none (USE-13 seed) |
| **Mixed** (default) | All of the above in one document | Per the node's declaration | General use | — | `ancestors` (decision 0002) |

## Donors

### Unreal Engine Blueprints (`ref`: proprietary EULA)
- **Exec and pure:**
  - Impure nodes chain along exec pins (push), and their data pins are pulled when they run ([functions](https://dev.epicgames.com/documentation/en-us/unreal-engine/functions-in-unreal-engine)).
  - A **pure node keeps no cached output**. It runs again for each impure node that consumes it, but only once per consuming node's gather step ([analysis](https://raharuu.github.io/unreal/blueprint-pure-functions-complicated/), [evaluation](https://zomgmoz.tv/unreal/Blueprints/How-blueprint-evaluation-works)).
- **The ForEach pitfall:** the ForEach macro reads Length and Get on every iteration. A pure array source then runs about twice per iteration; one measurement counted 21 calls for 6 elements ([source](https://celdevs.com/unreal-engine-and-the-hidden-pitfalls-of-blueprints/)).
- **Functions, macros, collapsed graphs:**
  - Functions have one exec input and contain no latent nodes.
  - Macros are inlined, may have several exec pins, and may contain latent nodes.
  - Collapsed graphs are cosmetic.
  - Sources: [macros](https://dev.epicgames.com/documentation/en-us/unreal-engine/macros-in-unreal-engine), [collapsing](https://dev.epicgames.com/documentation/en-us/unreal-engine/collapsing-graphs-in-unreal-engine).
- **Events:**
  - BeginPlay, Tick (with DeltaSeconds) and EndPlay (with a reason).
  - **Custom Events:** named entry points with parameters ([custom events](https://dev.epicgames.com/documentation/en-us/unreal-engine/custom-events-in-unreal-engine)).
  - **Event Dispatchers:** multicast delegates with Bind, Unbind, Unbind All and Call. "Assign" creates the bind node and a matching custom event in one step ([dispatchers](https://dev.epicgames.com/documentation/en-us/unreal-engine/event-dispatchers-in-unreal-engine)).
  - **Interfaces:** a message to any object; objects that do not implement it ignore it ([interfaces](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-interface-in-unreal-engine)).
- **Latent and async nodes:**
  - Delay and the async actions suspend the line and resume on a later frame.
  - Async actions have several exec outputs (OnSuccess, OnFail).
  - Latent nodes are allowed in event graphs and macros only [I].
- **Sequence and loops:**
  - Sequence fires Then 0..N in one frame.
  - ForLoop, WhileLoop and ForEach are macros that finish within one frame, with a project-wide cap on loop iterations [I].
- **Debugging:** breakpoints, step over and into, pin watches, and animated exec wires ([debugging](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-debugging-in-unreal-engine)).

### Other Unreal Engine graphs (`ref`)
- **Material Editor:** pure dataflow compiled to HLSL; only nodes that reach the output are emitted ([materials](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-materials)).
- **Anim Blueprint:**
  - The EventGraph is a Blueprint.
  - The AnimGraph is a pose dataflow evaluated every frame, with state machines whose transition rules are small pure graphs.
  - Its thread-safe update reads game data through Property Access ([graphing](https://dev.epicgames.com/documentation/en-us/unreal-engine/graphing-in-animation-blueprints-in-unreal-engine), [optimization](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-optimization-in-unreal-engine)).
- **Behavior Trees:**
  - Composites (Selector, Sequence, Simple Parallel), Tasks, Decorators (conditions that can abort branches), Services (interval ticks while their branch is active), and a Blackboard.
  - Event-driven, not re-evaluated every tick ([overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview)).
- **Niagara:** module stacks in fixed stages (spawn, update, events, simulation stages), compiled to a VM or the GPU ([Niagara](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-niagara-effects-for-unreal-engine)).
- **PCG:** a dataflow over point data, run when content is generated, with a cache and a debug view per node ([PCG](https://dev.epicgames.com/documentation/en-us/unreal-engine/procedural-content-generation-overview)).

### Unity Visual Scripting and Shader Graph (`ref`: Unity Companion License)
- **Graph and port types:**
  - Script Graphs (flow) and State Graphs, whose states run a script graph with On Enter, On Update and On Exit.
  - Control ports and value ports. Control **fan-in** is allowed and control **fan-out** is not: Sequence makes the order explicit ([graph types](https://docs.unity3d.com/Packages/com.unity.visualscripting@1.9/manual/vs-graph-types.html), [nodes](https://docs.unity3d.com/Packages/com.unity.visualscripting@1.8/manual/vs-nodes.html)).
- **Lazy values:** a value output is a lambda over the flow, pulled when read ([custom node](https://docs.unity3d.com/Packages/com.unity.visualscripting@1.7/manual/vs-create-custom-node.html)).
- **Events:** Custom Event and Trigger Custom Event take a name and arguments [I].
- **Shader Graph:** dataflow compiled to shaders, with sub-graphs as functions ([Shader Graph](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/index.html)).

### Godot VisualScript (MIT, legacy; the lesson matters more than the code)
- Removed in Godot 4.0. Few users made it their main language, and it was the same API as GDScript drawn as boxes, with no high-level building blocks ([announcement](https://godotengine.org/article/godot-4-will-discontinue-visual-scripting/)).
- **Lesson:** domain-level nodes, events, latent nodes and macros make a visual language worth using; one-to-one API wrappers do not.

### Blender Geometry Nodes (`ref`: GPL)
- **Lazy evaluation:** node groups become lazy-function graphs that compute only the inputs that are needed. They run single-threaded first and become multi-threaded when slow ([lazy functions](https://projects.blender.org/blender/blender/commit/5c81d3bd469)).
- **Fields:** deferred expressions evaluated per element ([fields](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/fields.html)).
- **Zones:**
  - Repeat zones are their own lazy functions ([repeat zones](https://projects.blender.org/blender/blender/pulls/109029)).
  - Simulation zones carry state from frame to frame and can be baked ([3.6 notes](https://developer.blender.org/docs/release_notes/3.6/nodes_physics/)).
- **Debugging:** the Viewer node, and socket tooltips with the last value.

### Houdini (`ref`: proprietary)
- **Cook on demand:**
  - Display or render pulls the graph.
  - A changed parameter or input marks the node **dirty**, downstream too.
  - Badges show "needs cook" and "time dependent" ([badges](https://www.sidefx.com/docs/houdini/network/badges.html)).
- **Cook API:** `needsToCook()`, `cook(force)` and `isTimeDependent()` ([HOM](https://www.sidefx.com/docs/houdini/hom/hou/TopNode.html)).
- **Lock flag:** freezes a node's output ([lock](https://www.sidefx.com/docs/houdini/model/lock_nodes.html)).
- **Contexts:** DOPs step simulations; TOPs/PDG schedule work items ([TOPs](https://www.sidefx.com/docs/houdini/tops/intro.html)).

### TouchDesigner (`ref`: proprietary)
- **Pull:** a node cooks only when something downstream asks, and only if an input cooked or another reason applies. Displays pull every frame ([cook](https://docs.derivative.ca/Cook)).
- **Push:** events and the Execute DATs ([event](https://derivative.ca/UserGuide/Event), [CHOP Execute](https://docs.derivative.ca/CHOP_Execute_DAT)).
- **Families:** CHOP, TOP, SOP, DAT, MAT, COMP.
- **Debugging:** cook counts per node, and a performance monitor.

### Max/MSP (`ref`) and Pure Data (`adapt`: BSD-3)
- **Hot and cold inlets:** the left inlet is hot and triggers output; the other inlets are cold and only store ([tutorial](http://www.pd-tutorial.com/english/ch02s02.html)).
- **Depth-first messages:**
  - Each branch finishes before the next one starts.
  - Outlets fire right to left.
  - The order of fan-out connections is undefined in practice, so `[trigger]` makes it explicit ([Pd manual 2.3](https://msp.ucsd.edu/Pd_documentation/x2.htm)).
- **Rates:** a bang is a valueless "do it". `~` objects run at signal rate in blocks, apart from control messages.

### Node-RED (`adapt`: Apache-2.0, with NOTICE)
- **Messages:** async objects (`msg.payload`, `msg.topic`, `_msgid`) ([messages](https://nodered.org/docs/user-guide/messages)).
- **Node API:** `on('input', (msg, send, done))`, where `done(err)` feeds the Complete and Catch nodes ([node API](https://nodered.org/docs/creating-nodes/node-js)).
- **Reuse and context:** subflows, Link in/out/call (virtual wires), and context at node, flow and global scope.

### ComfyUI (`ref`: GPL-3.0)
- A DAG run from its output nodes, cached by **input signature**. `IS_CHANGED`/`fingerprint_inputs` adds to the key, and NaN means "always rerun" ([V3 migration](https://docs.comfy.org/custom-nodes/v3_migration)).
- **Lazy inputs:** `check_lazy_status` names the inputs still needed ([lazy evaluation](https://docs.comfy.org/custom-nodes/backend/lazy_evaluation)).

### Rete.js v2 (`adapt`: MIT)
- **DataflowEngine:** pull with `fetch(id)`, a cache per node, and `reset(id)` ([engine API](https://retejs.org/docs/api/rete-engine/), [dataflow](https://retejs.org/docs/guides/processing/dataflow/)).
- **ControlFlowEngine:** push with `execute`. Both engines run on one graph, separated by port filters ([engine](https://retejs.org/docs/concepts/engine/)).

### glTF KHR_interactivity (open standard; Babylon.js FlowGraph `adapt`, Apache-2.0)
- **When a node executes:** an input flow socket fires, an output value socket is read, or an event happens. Output values persist until a flow node runs ([spec](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_interactivity/Specification.adoc), via excerpts [I]).
- **Events and flow nodes:**
  - `event/onStart`, `event/onTick`, and `event/send`/`event/receive` for declared custom events ([Babylon typedoc](https://doc.babylonjs.com/typedoc/interfaces/_babylonjs_loaders.GLTF2.InteractivityEvent)).
  - `flow/sequence`, `flow/for`, `flow/while`, `flow/doN`, `flow/multiGate`, `flow/waitAll`, `flow/throttle`, and `flow/setDelay`/`flow/cancelDelay` ([rename](https://github.com/KhronosGroup/glTF-InteractivityGraph-AuthoringTool/pull/132)).
- This maps almost one-to-one onto this fork's events: see [3D-01](../cards/3D-01-gltf-khr-interactivity.md).

### Web Audio API (W3C specification)
- The audio graph renders on its own thread in 128-frame quanta, apart from control code ([spec](https://www.w3.org/TR/webaudio/)).
- **AudioParam:** a-rate or k-rate, with scheduled automation (`setValueAtTime`, ramps, `cancelScheduledValues`) ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam)).

### vvvv gamma (`ref`: proprietary editor; the LGPL-3.0 libraries are also reference only)
- **Frame dataflow:** the whole patch updates every frame ([gray book](https://thegraybook.vvvv.org/)).
- **Nodes:** *process* nodes are stateful, with Create and Update; *operation* nodes are stateless.
- **Regions:** ForEach, Repeat, If, Cache (reruns only when its inputs change) and Delegate, with splicers and accumulators on the border ([download and licenses](https://vvvv.org/download/), [VL.StandardLibs](https://github.com/vvvv/VL.StandardLibs)).

### Cables.gl (`adapt`: MIT)
- Trigger ports (execution) and value ports (data), with `onTrigger` and `onChange`. The MainLoop op triggers its downstream once per frame ([callbacks](https://cables.gl/docs/5_writing_ops/dev_callbacks/dev_callbacks), [ports](https://cables.gl/docs/5_writing_ops/dev_creating_ports/dev_creating_ports)).

## Concept matrix

"Here" is this fork on `LG/dev` @ `a5604d8`; the evidence is in the [audit](../../audits/2026-11-22-event-flows-audit.md).

| Concept | UE BP | UE Anim/BT/PCG | Unity VS | Blender GN | Houdini | TD | Max/Pd | Node-RED | ComfyUI | Rete | KHR | vvvv | Cables | **Here** | Idea |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Exec/flow pins | yes | EventGraph | control ports | — | — | events via DATs | bang | wires = messages | — | ControlFlow | flow sockets | — | trigger ports | EVENT/ACTION; `onTrigger`/`onExecuted` behind a global flag | FLW-07 |
| Pure values | pure functions | AnimGraph, Material | value lambda | all | all | all | — | — | all | Dataflow | value ops | operations | value ports | ON_REQUEST + `pure` | FLW-01 |
| Re-evaluation | per consumer | per frame | on pull | by need | dirty only | pull if changed | hot inlet | per message | signature | until reset | on access | every frame | onChange | per frame or call, plus data stamp | FLW-01, FLW-02 |
| Volatile values | (always fresh) | — | — | — | time dependent | — | — | — | NaN fingerprint | — | — | — | — | rand and noise stay ALWAYS | FLW-02 |
| Property invalidation | — | — | — | yes | dirty | yes | — | — | signature | reset | — | — | onChange | no | FLW-04 |
| Lifecycle events | BeginPlay, Tick, EndPlay | Update | Start, Update | — | — | Execute DATs | loadbang | inject | — | — | onStart, onTick | Create, Update | MainLoop | `onStart`/`onStop` callbacks only | FLW-05 |
| Custom events, dispatch | custom event, dispatchers | BT messages | custom event | — | — | — | send, receive | link nodes | — | — | send, receive | channels | trigger send | subgraph IO by name only | FLW-06 |
| Hot/cold inputs | — | — | — | — | — | — | yes | — | — | — | — | — | — | — | FLW-09 |
| Latent/async | Delay, async actions | BT tasks | wait units | — | work items | — | delay | async | async nodes | async data | setDelay | async regions | timers | `events/delay` (ticks) | FLW-10 |
| Loops | macros (one frame) | — | For, While | repeat zone | for-each | — | until | split/join | — | — | for, while, doN | regions | repeat | FOR, ForEach, WHILE (Wave 6) | FLW-01, FLW-14 |
| State machines | — | Anim SM | State Graph | — | — | — | — | — | — | — | — | — | — | — | FLW-11 |
| Behaviour trees | — | yes | — | — | — | — | — | — | — | — | — | — | — | — | FLW-11 (USE-13) |
| Signal vs control rate | — | — | — | — | — | CHOP rates | `~` vs messages | — | — | — | — | — | — | audio nodes, untyped | FLW-12 |
| Cook on demand, dirty | — | PCG cache | — | lazy | yes | yes | — | — | yes | reset | — | Cache region | onChange | pull per frame or call | FLW-13 |
| Subgraph/function/macro | function, macro | modules | subgraph | groups | HDAs | COMPs | abstractions | subflows | subgraphs | modules | — | patches | subpatches | subgraph, `graph/function` | FLW-15 |
| Debugging | breakpoints, watch, wire trace | debug views | live values | viewer | badges | cook counts | print | debug node | progress | — | — | tooltips | — | `execution-state`, badge, `event-dropped` | FLW-16 (USE-34, USE-42) |

## Ideas

| ID | Idea | Fit here |
|---|---|---|
| FLW-01 | **Call scopes**: one hierarchical scope id (call → Sequence branch → loop iteration) for the memo and the legacy dedupe | Replaces the two ids (`_call`, `action_call`); [card](../cards/FLW-01-call-scopes-and-pure-semantics.md) |
| FLW-02 | **Volatile pure**: `pure: "volatile"` runs once per scope; rand, noise and time can then be ON_REQUEST | Within FLW-01's card |
| FLW-03 | **A `refresh` input** on any ON_REQUEST node: invalidate its memo and re-run it explicitly | "Use execution to regenerate"; within FLW-01's card |
| FLW-04 | **Property and widget invalidation**: `_props_version` in the memo key | Within FLW-01's card |
| FLW-05 | **Lifecycle nodes**: `events/on_start`, `on_stop`, `on_tick(dt, time)`, `on_pause`/`on_resume`; KHR names as aliases | [card](../cards/FLW-05-lifecycle-and-custom-events.md) |
| FLW-06 | **Custom events and dispatchers**: `custom_event`, `call_event`, `dispatcher` (bind, unbind, unbind all, call) and an "Assign" helper | [card](../cards/FLW-05-lifecycle-and-custom-events.md) |
| FLW-07 | **Exec pins per document**: the `onTrigger`/`onExecuted` slots turned on by the document's profile, not by a global flag | FLW-08 profile `blueprint` |
| FLW-08 | **Graph profiles**: model + mode defaults + UI options + packs + palette per document (mixed, blueprint, dataflow, realtime, stepped, reactive) | [card](../cards/FLW-08-graph-profiles.md); absorbs X-12 for documents |
| FLW-09 | **Hot and cold inputs**: a cold data input stores a value, and a hot one runs the node; plus a Trigger node for ordered fan-out | Pd semantics (BSD-3) |
| FLW-10 | **Latent nodes**: a resumable line (`setDelay`/`cancelDelay`, async actions with success and fail outputs); refused where the model forbids it | `events/delay` today |
| FLW-11 | **State-machine and behaviour-tree runners** over the same node model: states with enter, update and exit sub-graphs | Absorbs USE-13 |
| FLW-12 | **Signal and control rates**: a slot rate or type for audio and video streams, apart from control events | Absorbs JS-04 |
| FLW-13 | **Cook on demand**: dirty propagation, cook only what an observed output needs, and "needs cook" / "time dependent" badges | Extends the `ancestors` memo |
| FLW-14 | **Loop pitfall lint**: `checkExecution` warns when a volatile source feeds a loop's collection or count input | UE ForEach pitfall |
| FLW-15 | **Functions vs macros**: `graph/function` (one exec in, no latent nodes) against an inlined macro subgraph (several exec pins, latent allowed) | Subgraph system (Wave 3) |
| FLW-16 | **Flow debugger**: exec breakpoints, step, pin watches, animated exec wires, cook counts and times | Absorbs USE-34, USE-42 |
| FLW-17 | **Signature cache with a fingerprint hook**: cache outputs by input signature; a node's `fingerprint()` returning NaN means always rerun | ComfyUI design, re-implemented; CFY-29 |
| FLW-18 | **Lazy inputs**: a node asks for an input only when it needs it, so unused branches never run | ComfyUI and Blender design |
| FLW-19 | **Zones**: paired frame nodes for loops, caches and per-frame state | Blender, vvvv |
| FLW-20 | **Completion and error side channel**: Catch and Complete event nodes fed by node errors and completions | Node-RED (Apache-2.0); `node-error` exists |
| FLW-21 | **Scheduled parameter automation**: value + time ramps instead of setting values every frame | Web Audio AudioParam |
| FLW-22 | **Examples library**: a manifest with categories (one per flow category) and a test that runs them all | [card](../cards/FLW-22-node-reference-and-examples.md) |
| FLW-23 | **Node reference per library**: generated from `describeNodeType`, grouped by pack and category, with usage | Promotes USE-06; same card as FLW-22 |
| FLW-24 | **Profile-aware palette and new-graph templates**: the palette filters by profile; a new graph starts from a profile template | `src/palette.js`, pack `templates[]` (CFY-43) |

## Strongest directions

1. **FLW-01 to FLW-04 together:** one scope id, plus volatile and deterministic pure nodes, gives UE's freshness without its per-consumer cost and its random-differs-per-consumer pitfall.
2. **FLW-05 and FLW-06 with KHR names:** lifecycle and custom events make the blueprint style complete. Naming them as KHR_interactivity does makes 3D-01 (import and export) cheap.
3. **FLW-08 profiles:** one switch per document instead of global flags. This is how the categories above reach users.
4. **FLW-22 and FLW-23 first:** every new node lands documented and in a runnable example.
