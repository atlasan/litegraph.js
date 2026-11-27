# Event flows audit: the current system and its gaps

> **Date** 2026-11-22 · **Kind** audit · **Status** final · **Base** `LG/dev` @ `a5604d8`

**Scope:** the event and execution system after Wave 6, read against the flow styles of other node systems (Unreal Engine as the main donor). It answers three questions:
- What runs nodes, and when?
- How are values refreshed?
- What is declared, and what is missing for each flow category?

**Who and how:** the main session, with two subagents, by reading the code and running probes.
- **The registry:** every `src/nodes` file was imported in Node, with jsdom and gl-matrix for the browser packs. Each type was created and its slots and declarations were read.
- **Examples:** the 34 editor examples were run under the five models.
- **Probe:** a call-id probe under `ancestors`.
- **Scripts:** the probe scripts were throwaway, in the session scratchpad. The probe's set-up is described in the [research note](../memories/research/2026-11-22-call-scopes-and-pure-nodes.md) so it can be rebuilt as a test.
- **Spot checks:** a sample of the line references was re-read by the main session.

**Related records:**
- The [event handling audit](2026-11-22-event-handling.md) covers the host callback channels (legacy `onX`, CallbackHandler, typed events) and leads to the proposed Wave 7; this audit covers how the graph runs.
- The donor survey and the FLW ideas are in [execution flows](../ideas/landscape/execution-flows.md).
- The proposed direction is in the [flows direction plan](../plans/2026-11-22-flows-direction.md).

## 1. The system by layer

| Layer | What exists | Evidence |
|---|---|---|
| **Models** | `ancestors` (default), `step`, `strict`, `event`, plus the built-in `legacy`. The rules are `delivery`, `refresh`, `frame_pull`, `once_per_frame` and `default_mode`. Chosen per document by `config.execution` on the root graph | `src/execution.js:25`, `:52`, `:440-459`; `src/lgraph.js:2569-2592` |
| **Running a step** | `runStep` sets the scope `frame_N` (non-legacy, no outer call), drains pending actions, pulls ancestors before ALWAYS nodes when `frame_pull` is set, then `doExecute` | `src/lgraph.js:656`, `:679`, `:687-689` |
| **Starting a graph** | `graph.start` sends `onStart` to nodes in every mode except NEVER. It then loops with `requestAnimationFrame` when the interval is 0 and there is a window, otherwise `setInterval`. The runner has no window, so it uses `setInterval` | `src/lgraph.js:486`, `:497`, `:509-535`; `apps/runner/graphRunners/graphRunner.js:65` |
| **Event entries** | `doExecute`, `actionDo` and `triggerSlot` outside any dispatch go through `_dispatchEvent`, which opens the scope `call_N` and reports errors as `node-error` | `src/lgraphnode.js:1008`, `:1060-1079`, `:1129`, `:1187` |
| **Delivery** | Non-legacy `triggerSlot`: an event fired while ancestors are being pulled is dropped (`refreshing`). Before delivery, ancestors are pulled under `refresh: "ancestors"` or when the source has `emit: "immediate"`. Under deferred delivery the action is queued, unless the source has `emit: "immediate"` or the input is in `immediate_inputs`. Legacy uses its flags | `src/execution.js:223-260`; `src/lgraphnode.js:1220-1290` |
| **Pull and memo** | `pull` → `ensureFresh` runs ON_REQUEST origins (and an ALWAYS origin that has not run yet). A node is fresh when its memo has the same frame or call **and** no newer input stamp. `setOutputData` stamps links | `src/execution.js:134`, `:144-169`, `:177-221`; `src/lgraphnode.js:575` |
| **Call ids** | Two of them: the engine scope `_call` (`frame_N`/`call_N`, used by the memo) and `options.action_call` (legacy dedupe only). Sequence makes one `action_call` per output, but **no new scope**. Loops make none | `src/execution.js:40`, `:156`, `:242-247`; `src/lgraphnode.js:1012`, `:1063`; `src/nodes/events.js:95-97` |
| **Declarations** | `static def.execution` or `declareNodeExecution`: per-model `modes`/`default_mode`, `emit`, `ticks`, `pure`, `loop`, `immediate_inputs` | `src/execution.js:322-376`; `src/litegraph.js:384-418` |
| **Guards and reports** | Re-entry, `once_per_frame` and depth guards. `event-dropped` with reasons. `checkExecution` codes: `invalid-model`, `invalid-mode`, `ticks-not-stepped`, `on-request-emitter`, `loop-without-body`, `pure-always`. Settings: `MaxEventDepth` 256, `MaxEventPasses` 64, `AllowAnyMode` | `src/execution.js:21`, `:125`, `:267`, `:407`; `src/litegraph.js:641-644` |
| **Subgraph boundary** | An outer event reaches the inner GraphInput through `graph.onAction`.<ul><li>**legacy:** no fresh interface data, no flush;</li><li>**ancestors/event:** `enterBoundary` first, immediate delivery;</li><li>**step/strict:** inner actions are queued, then `flushInner` drains them unless the subgraph node is ALWAYS.</li></ul>An inner GraphOutput event goes back out through `graph.trigger`, in the same scope | `src/subgraph.js:113-136`, `:1504-1508`; `src/execution.js:289`, `:304`; `src/lgraph.js:1438`, `:1457` |
| **Functions** | `graph/function` `call`: pushes its inputs (new stamps), runs the inner `runStep(1)` **in the caller's scope**, copies the outputs, then fires `done`. Other event inputs always go through `flushInner`, legacy included | `src/subgraph.js:1645-1674` |
| **Lifecycle** | Callbacks `onAdded`, `onRemoved`, `onStart`, `onStop`. No node turns them into an event line. `onPause`/`onUnpause` are defined in audio but nothing sends them | `src/lgraphnode.js:26-32`; `src/nodes/audio.js:331` |
| **Named events** | Only subgraph IO by name (`graph.onAction`, `graph.trigger`). `graph.triggerInput` calls `onTrigger` on nodes found by title and **bypasses the engine** | `src/lgraph.js:1438`, `:1457`, `:1734-1737` |
| **Exec pins** | `onTrigger`/`onExecuted` slots behind the global `do_add_triggers_slots` (false by default; true in the three editor presets) | `src/litegraph.js:237`; `src/lgraphnode.js:914-940`, `:2428`, `:2502`; `apps/editor/js/defaults.js:31`, `:70` |
| **Outside the engine** | Audio wires Web Audio in `onConnectionsChange`. glshaders builds code with `onGetCode`. Button widgets call back through `setTimeout(…, 20)`, which is a new `call_N`. Network, html, midi and sys callbacks are outer entries (54 trigger sites) | `src/nodes/audio.js:158`; `src/nodes/glshaders.js:390`, `:409`; `src/widgets.js:88`; `src/nodes/interface.js:63-75` |
| **Legacy flags** | Assigned only in tests. No app, example or tool assigns them. The generated `docs/api/*.html` still shows the old flag code | `src/litegraph.js:1747`, `:1763`; `test/execution-*.test.js` |

## 2. The registry (293 types loaded)

The types are counted by event role and by whether they declare their execution needs:
- *Sources* have EVENT outputs only.
- *Sinks* have ACTION inputs only.
- *Pass-through* nodes have both.
- Slots that exist only through `onGetInputs`/`onGetOutputs` (audio source, webcam) are not counted.

| Pack (file) | Types | Sources | Sinks | Pass-through | Declared | Undeclared |
|---|---|---|---|---|---|---|
| base | 25 | 0 | 3 | 1 | 5 | 20 |
| math (with 6 `math3d/vec*`) | 30 | 0 | 0 | 0 | 23 | 7 |
| logic | 10 | 0 | 0 | 4 | 9 | 1 |
| strings | 8 | 0 | 0 | 0 | 8 | 0 |
| objects | 10 | 1 | 1 | 1 | 0 | 10 |
| events | 14 | 3 | 2 | 9 | 4 | 10 |
| input, interface, device | 13 | 3 | 0 | 1 | 0 | 13 |
| math3d (15), geometry (7 of 14 without GL), graphics (11) | 33 | 0 | 1 | 0 | 0 | 33 |
| midi | 12 | 1 | 2 | 8 | 0 | 12 |
| network, libraries, osc, socketio | 9 | 0 | 1 | 8 | 0 | 9 |
| audio | 15 | 0 | 0 | 0 | 0 | 15 |
| html | 12 | 0 | 5 | 1 | 0 | 12 |
| gltextures, glfx, glshaders | 61 | 0 | 0 | 0 | 0 | 61 |
| threejs | 21 | 0 | 0 | 4 | 0 | 21 |
| litegraph_nodes | 2 | 0 | 0 | 1 | 0 | 2 |
| nodejs_only (sys, network, process) | 18 | 1 | 0 | 13 | 0 | 18 |
| **Total** | **293** | **9** | **15** | **51** | **49** | **244** |

**Not loaded or not counted:**
- `nodejs_mysql` (6 types) reads `global.LiteGraph` and was not loaded.
- `watch.js`, `others.js` and `libraries/udp.js` register nothing.
- 8 audio types throw in `createNode` without an AudioContext.

**Declared today:**
- `pure`: `math.js:1434` (23 types), `base.js:1334` (5), `logic.js:438` (5), `strings.js:148` (8).
- In-class declarations:
  - `logic/IF` (`logic.js:217`);
  - the loops (`LOOP_EXECUTION`, `logic.js:246`; WHILE is invalid under `strict`, `logic.js:389`);
  - `events/trigger` (`events.js:31`) and `events/sequence` (`:69`);
  - `events/delay` and `events/timer` (`ticks`, `:379`, `:436`);
  - `graph/function` (`subgraph.js:1555`).

**Undeclared, grouped by what they should declare** (the evidence is in the line references):

| Class | Types (examples) | Evidence |
|---|---|---|
| pure | `basic/const`, `boolean`, `string`, `data`, `array`; `logic/sequence`; texture filters (color, gradient, mix, edges, blur: deterministic, but they reuse their output texture) | `base.js:40`, `:89`, `:120`, `:303`, `:340`; `logic.js:59`; `gltextures.js:2800-3518` |
| volatile (reads time, randomness or outside state) | `basic/time`, `basic/variable`, `basic/object`, `basic/script`; `math/rand`, `math/formula` (TIME); `objects/evaluate`; `widget/*`; `input/gamepad`; `audio/analyser`; `texture/operation`, `shader`, `canvas2D`, `average`, `webcam` | `base.js:18`, `:584-594`; `math.js:239`, `:1208`; `objects.js:512`; `audio.js:712`; `gltextures.js:709`, `:1029`, `:1832`, `:5531` |
| ticks (time-based or frame history) | `math/spikes`, `average`, `tendTo`; `audio/adsr`; `texture/temporal_smooth`, `linear_avg_smooth` | `math.js:345`, `:595`, `:653`; `audio.js:1053`; `gltextures.js:2032`, `:2119` |
| stateful or side effects (not pure; ON_EVENT candidates) | `math/accumulate`; `basic/set_array`, `array_append`, `console`, `alert`, `download`, `jsonparse`; `objects/set_property`, `merge_objects`; `events/counter`, `once`, `semaphore`, `stepper`, `waitAll`, `data_store`, `switch`, `filter`, `branch`; Web Audio wiring | `math.js:1025`; `base.js:441`, `:495`, `:625`, `:1064`, `:1112`; `objects.js:695`, `:724`; `events.js:107-602` |
| pure-ish (pure, but read an object that may be mutated) | `math/noise` (a table filled once); `objects/get_property`, `object_keys` | `math.js:281`; `objects.js:635`, `:676` |

## 3. The examples under each model

Each of the 34 editor examples was run with `setExecutionModel`, then `checkExecution()` and `runStep(3)`, without starting the graph.

| Result | Examples |
|---|---|
| Clean in all five models | 7: `ancestors/check_frame_value`, `cdn_libraries/test_load`, `doc/LG_docs`, and the 4 `wip_testing` object and lib tests |
| `pure-always` warnings under `ancestors` only (pure nodes saved in ALWAYS mode; "Apply the model's node modes" fixes them) | 13, e.g. `node_execution_modes`, `html_nodes_simple`, `functions/function_replication` (×3), `conditionals/while_console_test` (×6) |
| `stopped-queue` drops under `legacy`, `step` and `strict` (actions queued while the graph was not started; an artefact of the probe) | `midi_generation` (×13), `subgraph` (×2), `testing_subgraph_as_function` (×3) |
| `ancestors/check_subgraph` | `on-request-emitter` in every model, plus 4 `pure-always` and **3 `refreshing` drops** under `ancestors` |
| `conditionals/while_console_test` under `strict` | `invalid-model` (WHILE declares `strict` invalid) |
| Not runnable here | audio ×3 (no AudioContext), `graphics/image_fade` (no 2D context); 7 use types that are not registered (`features/*` from `apps/editor/js/demos.js:251`, `jquery/*`, old `nodejs/network/*` names) |

## 4. The call-id probe (`ancestors`)

The set-up and the options are in the [research note](../memories/research/2026-11-22-call-scopes-and-pure-nodes.md).

| Case | Result |
|---|---|
| FOR ×3; body reads `index × 10` (ON_REQUEST) | 0, 10, 20: the index output is restamped each iteration |
| FOR ×3; body reads `math/rand` and a test random node set to ON_REQUEST | **the same value in all three iterations**; the random node ran once. The same result from an external trigger and inside `runStep` |
| Sequence, two outputs read the same ON_REQUEST random | **the same value on both**; the per-output `action_call` does not reach the memo |
| `setProperty` between two external calls, or between two `runStep`s | re-runs (a new `call_N` or `frame_N`) |
| `setProperty` within one call (Sequence: read, edit, read) | **does not re-run**: the memo checks input stamps only |

## Findings

| # | Severity | Finding | Evidence (`path:line`) | Since |
|---|---|---|---|---|
| 1 | medium | ON_REQUEST nodes that read randomness, time or outside state are stale across loop iterations and Sequence branches. This is why `math/rand` and friends must stay ALWAYS and cannot be pulled | `src/execution.js:156-163`; probe §4 | Fixed in `50b58fd` (flows step 4, call scopes; [plan](../plans/2026-11-25-call-scopes.md)); was: open: [FLW-01](../ideas/cards/FLW-01-call-scopes-and-pure-semantics.md), FLW-02 |
| 2 | medium | A property or widget edit inside one call does not invalidate an ON_REQUEST node's memo | `src/execution.js:144-169` | Fixed in `50b58fd` (flows step 4, call scopes; [plan](../plans/2026-11-25-call-scopes.md)); was: open: FLW-04 |
| 3 | low | Two call ids exist with different meanings: the engine scope (memo) and `action_call` (legacy dedupe); Sequence builds its ids with `Math.random` | `src/lgraphnode.js:1012`, `:1063`; `src/nodes/events.js:97` | Fixed in `50b58fd` (flows step 4, call scopes; [plan](../plans/2026-11-25-call-scopes.md)); was: open: FLW-01 |
| 4 | low | `graph/function` `call` runs in the caller's scope; the inner memo relies on the pushed input stamps only | `src/subgraph.js:1645-1663` | Fixed in `50b58fd` (flows step 4, call scopes; [plan](../plans/2026-11-25-call-scopes.md)); was: open: FLW-01 |
| 5 | medium | 244 of 293 types declare no execution needs, including obvious pure (`basic/const`), volatile (`basic/time`, widgets) and ticks (`math/average`, `audio/adsr`) nodes. `checkExecution` and the profiles can only be as good as the declarations | §2 | Partly fixed in `f475c9c` (flows track: 36 more types declared, 86 of 273); `math/rand`, `math/formula` and `basic/time` declared volatile in `50b58fd` (FLW-02), the other volatile types stay undeclared until checked in a browser; was: open: the declaration pass in the [direction plan](../plans/2026-11-22-flows-direction.md) |
| 6 | medium | No lifecycle event nodes (start, tick, stop, pause); `onPause`/`onUnpause` are never sent | `src/lgraph.js:486`, `:577`; `src/nodes/audio.js:331` | open: [FLW-05](../ideas/cards/FLW-05-lifecycle-and-custom-events.md) |
| 7 | medium | No custom events, dispatchers, bind or unbind. `graph.triggerInput` finds nodes by title and bypasses the engine (no scope, no error report, no `event-dropped`) | `src/lgraph.js:1734-1737` | open: FLW-06 |
| 8 | low | Exec pins (`onTrigger`/`onExecuted`) are a global flag, set per editor page, not per document | `src/litegraph.js:237`; `apps/editor/js/defaults.js:70` | open: FLW-07, [FLW-08](../ideas/cards/FLW-08-graph-profiles.md) |
| 9 | low | Media packs run outside the engine (audio wiring in `onConnectionsChange`, glshaders `onGetCode`) and declare nothing, so a realtime profile cannot tell their sources from their filters | `src/nodes/audio.js:158`; `src/nodes/glshaders.js:409` | open: FLW-12, FLW-08 |
| 10 | low | `ancestors/check_subgraph` drops 3 events as `refreshing` under `ancestors`: an event fired while ancestors were being pulled | §3 | Fixed in `40df00a` (flows track, examples); was: open: investigate with the example |
| 11 | low | Old examples saved in ALWAYS mode raise `pure-always` under `ancestors` until "Apply the model's node modes" is used; most examples are not in the Demo menu, and none states its flow style | §3; `apps/editor/js/code.js:124` | Fixed in `40df00a` (flows track: examples manifest, Demo menu by category); was: open: [FLW-22](../ideas/cards/FLW-22-node-reference-and-examples.md) |
| 12 | low | No node reference (USE-06); builtin packs have no description; no test creates every type | `src/litegraph.js:384`; `src/packs.js` | Fixed in `879761a` (flows track: `npm run docs:nodes`, pack descriptions, catalog test); was: open: FLW-23 |
| 13 | low | `docs/api/*.html` (generated) still shows the legacy flag code | `docs/api/litegraph.js.html:134` | Fixed in the 0.18.0-dev.2 pre-release (D-3: `docs/api` regenerated) |

## Verdict

**What holds up:** Wave 6 gives a sound engine:
- per-document models;
- a pull with data stamps;
- declarations, guards and reports;
- legacy compatibility.

The FOR loop with a pulled index works as specified.

**The gaps are in four places:**
1. **The freshness rule for non-deterministic and state-reading nodes** (findings 1–4). It needs one scope id that loop iterations and Sequence branches open, plus a `volatile` declaration and property invalidation.
2. **Coverage of the declarations** (finding 5).
3. **The event-scripting vocabulary** that other editors take for granted: lifecycle, custom events and dispatchers (findings 6–7).
4. **How flow styles reach users:** exec pins per document, profiles, examples and the node reference (findings 8–12).

**Where to go:** none of these changes `legacy`. The proposed order is in the [flows direction plan](../plans/2026-11-22-flows-direction.md).
