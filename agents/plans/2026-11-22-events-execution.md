# Events and execution: execution models, with ancestors as the default

> **Date** 2026-11-22 · **Kind** plan · **Status** accepted · **Base** `LG/dev` @ `12ef719`

The fork has seven overlapping event and execution mechanisms, switched by process-wide flags that are not saved with the graph. Because of this, one workflow behaves differently in the editor, on the `event_based` page, in the runner and inside subgraphs. Under the core defaults, the loop nodes and the order of Sequence break silently.

This plan makes **execution models** explicit, chosen per document in the graph info:
- **The default for new graphs is the `ancestors` model.** It keeps a steady step-frame and runs pure nodes (ON_REQUEST) only when something pulls them. Events are delivered immediately, and refreshing data ancestors lets loops and advanced logic and event nodes re-execute what they need.
- **Other models are opt-in:** `step`, `strict` (one execution per node per frame) and `event`.
- **Saved graphs without the field load as `legacy`,** with exactly today's behaviour.
- **Node definitions may declare** which models and modes they support.

## Context

- **Where things are:** the [codebase map](../memories/codebase/README.md#execution) (Execution section) and [docs/guide.md](../../docs/guide.md#execution) (Execution and Events).
- **Related ideas:** USE-34 (execution trace), BUN-02 (token mode), USE-13 (behaviour trees), CFY-22 (await), WGS-02 (`on_event` modes). The model registry is designed so these can be added later as models.
- **Decided with the user (2026-11-22):**
  1. The ancestors model is the default. Loops and the extended logic and event nodes are built for it, and nodes in it are ON_REQUEST unless they need something else.
  2. Other models remain available.
  3. Nodes can declare whether they are valid in each model.
  4. The model is shown in the graph info and can be changed there.
  5. Old graphs and other projects keep working. Bugs are fixed separately.
  6. `new LGraph()` uses ancestors too, unless the project has set any legacy flag or `LiteGraph.default_execution_model = "legacy"`.
  7. Node types that declare nothing keep **ALWAYS**.
- **How findings were checked:** probes ran read-only against the committed `build_node/litegraph.full.cjs`. The scripts are in the session notes folder `/home/bp/.config/Claude/side-session-notes/local_ad321100-6eb0-4777-b744-6692ba4169e3/events-audit-probes/` (`probe.cjs`, `probe2.cjs`, `probe3.cjs`). Step 1 turns them into tests. **(probe)** marks a reproduced result; the other findings come from reading the code.

## Audit findings

### A. The mechanisms today

| # | Mechanism | Where | Switch | What it guarantees |
|---|---|---|---|---|
| M1 | **Step loop:** `runStep` runs ALWAYS nodes in topological and priority order | `src/lgraph.js:616-667`, order `:694-825`, executable list `:676-681` | always on | One forward pass per step. Only nodes with an `onExecute` take part |
| M2 | **Immediate actions:** `triggerSlot` → `actionDo` → `onAction`, synchronous and depth-first | `src/lgraphnode.js:1105-1207`, `:1042-1066` | `use_deferred_actions=false`, or a target without `onExecute` (`:1191`) | Emission order is kept. The data the action reads may be from the previous step |
| M3 | **Deferred actions:** queued in `_waiting_actions`, drained at the start of the target's turn in the step | push at `lgraphnode.js:1191-1194`; drain at `lgraph.js:633` and `lgraphnode.js:973-983` | `use_deferred_actions=true` (**core default**, `src/litegraph.js:184`) | Upstream data is fresh. Order follows execution order. Nothing is delivered while the graph is stopped |
| M4 | **Ancestor refresh (pull):** runs ALWAYS and ON_REQUEST data ancestors before an action or trigger, or on a forced read | `lgraphnode.js:2925-2976` (modes `:2959-2960`), `lgraph.js:833-921`, `lgraphnode.js:1172-1173`, `:1185-1188`, `:657-668` | `refreshAncestorsOnActions` / `refreshAncestorsOnTriggers` (off, `litegraph.js:252-253`), or `getInputData(slot, true, true)` | Fresh data on immediate delivery. The step loop never pulls; see A1 |
| M5 | **Guards:** re-entry drop (always on); once per step; once per call; `preventAncestorRecalculation`; triggers suppressed while ancestors refresh | `lgraphnode.js:995-997`, `:1046-1047`, `:2937-2941`, `:1137-1140`; reset per step `lgraph.js:619-624` | only `nodes_executing` is always on; the others are off (`litegraph.js:254`, `:270-272`) | Breaks synchronous cycles. Every guard drops events **silently** |
| M6 | **Subgraph boundaries:** `Subgraph.onAction` → `graph.onAction` → `GraphInput.actionDo`. On the way out, `GraphOutput.onAction` → `graph.trigger` → `onSubgraphTrigger`. A function node flushes inner queues up to 64 passes | `src/subgraph.js:112-139`, `:254-260`, `:1302-1309`, `:1483-1491`, `:1621-1653`; `lgraph.js:1375-1400` | inherits M2/M3 | Payload and `action_call` cross the boundary (`test/execution-lifecycle.test.js:300`). Inner queues drain only when the subgraph node is stepped |
| M7 | **Reporting:** `node-error {node, path}`, `execution-state` | `lgraph.js:637`, `:648-658`, `:502`; `src/executionstate.js`; runner `apps/runner/graphRunners/graphRunner.js:33-40` | always on | Covered only inside `runStep`. Only ALWAYS nodes get "done" |

**How the mechanisms combine.** Strategies are chosen per *target node*:
- M3 applies only to targets that have an `onExecute`.
- An ON_TRIGGER target, or an input named `onTrigger`, calls `doExecute` and skips `onAction` (`lgraphnode.js:1168-1177`).
- M4 suppresses every trigger fired by an ancestor while it refreshes.

There are three flag sets in use:
- the core and editor defaults: M1 + M3 (`apps/editor/js/defaults.js:47-54`);
- the `debug`, `mobile` and `event_based` presets: M2 + M4 + the per-call guard (`defaults.js:63-112`). This is the **ancestors approach**, but without a pull in the step loop;
- the runner, which always uses the core defaults (`graphRunner.js:8`).

The flags are fields of the `LiteGraph` singleton, so a graph authored on `editor_event_based.html` runs differently in the runner. **This is the root cause of "nodes that only work in one mode".**

### B. What the ancestors approach is missing today (to become the default)

| # | Finding | Evidence |
|---|---|---|
| A1 | **The step loop never pulls ON_REQUEST producers.** An ALWAYS consumer that reads normally sees `null`, and the producer never runs | Probe: a sink saw `[null,null,null]`, and the ON_REQUEST node ran 0 times. `runStep` only runs ALWAYS nodes (`lgraph.js:634`) |
| A2 | **A pull runs the producer twice, and there is no memo per frame.** `getInputData(…, true, true)` refreshes the ancestors, which include the producer, then calls `doExecute` on it again | `lgraphnode.js:657-668`. Probe: two consumers pulling in one step ran a pure node **4 times** |
| A3 | **The refresh re-runs stateful ALWAYS ancestors:** timers advance twice, counters count twice | `lgraphnode.js:2958-2969`. Probe: a counter went from 1 to 3 after two actions |
| A4 | **An event emitter set to ON_REQUEST never fires.** The refresh suppresses triggers, and nothing else pulls it. A declaration must mark such nodes invalid as ON_REQUEST | `lgraphnode.js:1137-1140`. Probe: TriggerEvent in ON_REQUEST mode never fired |
| A5 | **What works today:** with the `event_based` flags, a FOR body fed through an ON_REQUEST node sees `[1,2,3]`, with one run per iteration. Ancestors + immediate delivery is the right base | Probe `for_body_via_on_request` |
| A6 | The refresh passes a fake `param` (`"<id>_ancestors"`) to every ancestor's `onExecute(param)`. 14 nodes in `src/nodes` read an `onExecute` parameter | `lgraphnode.js:2946-2947`, `:2967` |
| A7 | The refresh stops at ON_EVENT and ON_TRIGGER nodes and does not cross into the parent graph. A GraphInput reads `graph.inputs`, which are pushed only by `Subgraph.onExecute` | `lgraphnode.js:2959`; `subgraph.js:117-128`, `:1311-1320` |

### C. Correctness findings (all models)

| # | Finding | Evidence | Severity |
|---|---|---|---|
| B1 | **FOR is broken under the defaults.** Its `do` input is deferred, then its body actions are deferred and all read the last index | `src/nodes/logic.js:256-291` + `lgraphnode.js:1191`. Probe: `[2,2,2]` one step late (defaults) vs `[0,1,2]` (`event_based`) | high |
| B2 | **WHILE runs to `cycleLimit` (999) under the defaults,** without stopping on the condition and without reporting it | `logic.js:376-410`, `:401`. Probe: counter 999 vs 3 | high |
| B3 | = A3 (re-execution of stateful nodes) | | high |
| B4 | **Sequence order depends on the model.** Sequence also mutates its caller's `options` object | `src/nodes/events.js:88-104`, `:94-101`. Probe: `[2,1,0]` vs `[0,1,2]` | medium |
| B5 | **`break` cannot reach FOR or WHILE under deferral.** In ForEach, `break` never works (`return` inside `forEach`), and ForEach reads an action slot as data | `logic.js:322-326`, `:313` | medium |
| B6 | **A subgraph node not in ALWAYS mode never delivers inner deferred actions.** The function node works around this with a 64-pass flush that stops silently | `subgraph.js:117-128`, `:1648-1652`. Probe: the inner action was still queued after 3 steps | medium |
| B7 | **Timer and Delay need ALWAYS mode and a running graph.** In ON_EVENT mode, Delay keeps events forever | `events.js:390-420`, `:460-484`. Probe: `pending 1, delivered 0` | medium |
| B8 | **Silent drops:**<br>- re-entry (`lgraphnode.js:995`);<br>- triggers fired during a refresh (`:1137`);<br>- a target without `onAction` (`:1201-1205`);<br>- an ON_TRIGGER target sends every action input to `onExecute`. FOR in ON_TRIGGER mode runs its body **0** times (`:1168`) | code; probe `for_on_trigger_body_runs: 0` | medium |
| B9 | **Errors outside a step are not reported:** no `node-error` and no `execution-state` for actions from widgets, the canvas or `trigger` | `lgraph.js:648-658` is the only reporter. Probe: 0 events | medium |
| B10 | **`onStart` reaches only ALWAYS nodes, while `onStop` reaches all** | `lgraph.js:493` + `:998` vs `:553`. Probe: only mode 0 got `onStart` | medium |
| B11 | **Six html nodes set the undefined `LiteGraph.ON_ACTION`, so they become ALWAYS** | `src/nodes/html.js:370, 434, 564, 608, 643, 679`; `litegraph.js:1104` | low |
| B12 | **Deferred actions sent while the graph is stopped wait, unreported, for the next start** | `lgraphnode.js:1191`. Probe: `queued 1` | low |
| B13 | **Inner graphs keep `starttime = 0`.** Their `getTime()` / `globaltime` are relative to the clock origin, and the first inner step's `elapsed_time` covers everything since then | `lgraph.js:314-315`, `:617-618`, `:663`. Probe: `inner_starttime 0` | low |
| B14 | **Nodes that fire every step in ALWAYS mode:** `events/switch` (`events.js:628-647`, plus `console.debug`), `logic/IF` after a mode change (`logic.js:226-234`), and the automatic `onExecuted` output (`lgraphnode.js:923-929`) | code | low |
| B15 | **Payload and identity are lost** by WaitAll, Semaphore, Once and Stepper (`events.js:154`, `:525`, `:553`, `:223`). DataStore stores the previous step's value (`:577-584`) | code | low |
| B16 | **Dead and duplicate surface:**<br>- `allowMultiOutputForEvents` is unused, next to `allow_multi_output_for_events` (`litegraph.js:274` / `:232`);<br>- `graph.triggerInput` calls `onTrigger` on nodes that rarely define it (`lgraph.js:1671-1676`);<br>- the forced pull logs a "CHECK THIS" warning on every call (`lgraphnode.js:658`);<br>- `connect` changes the target's mode when `do_add_triggers_slots` is set (`:2410-2414`) | code | low |
| B17 | **The docs give the wrong pull call:** they say `getInputData(slot, false, true)`, but a refresh needs `force_update=true` | `docs/guide.md:85`; codebase map "Execution"; `lgraphnode.js:642-663` | low |

### D. Node definitions, graph info and tests

- **Node definitions:** `describeNodeType` (`src/litegraph.js:384-408`) reads `static def` (title, capabilities, slots, lifecycle) but has no execution field. No node in `src/nodes` declares `static def` yet. Badges (`litegraph.js:601-620`) and `getMissingCapabilities` (`:505-513`) are ready-made places to report unmet needs.
- **Graph info:** the canvas Options panel (`src/lgraphcanvas.js:9007-9085`) edits only canvas fields. `graph.config` is serialized (`lgraph.js:27`, `:2477`), so it is the right home for `config.execution`.
- **Tests:**
  - What exists: `test/execution-lifecycle.test.js` (15), `test/subgraph-function.test.js` (7), `tools/tests/upstream-issues.test.mjs:22` (WaitAll with a stubbed trigger), `test/node-input-guards.test.js:202` (one ON_TRIGGER case), `test/comfy-interop.test.js:86` (mode 4).
  - Gaps: no flow node runs in a graph under any model; no step-frame pull test; no comparison between models; nothing covers errors outside `runStep`, `onStart` by mode, or subgraph nodes in other modes.
  - Compatibility corpus: `apps/editor/examples/{features,benchmark,subgraph,midi_generation}.json` and `test/fixtures/sa-subgraphs.json`.

## Recommended direction

### 1. Execution models: named, registered, chosen per document

A model is a named set of rules, registered with `LiteGraph.registerExecutionModel(name, rules)`:

| Rule | Values |
|---|---|
| `delivery` | `deferred` \| `immediate` |
| `refresh` | `none` \| `ancestors` |
| `frame_pull` | whether ALWAYS nodes pull ON_REQUEST inputs |
| `once_per_frame` | each node runs at most once per frame |
| `default_mode` | mode given to new nodes of undeclared types |

Built-in models:

| Model | `delivery` | `refresh` | `frame_pull` | `once_per_frame` | New core nodes | Purpose |
|---|---|---|---|---|---|---|
| **`ancestors`** (default for new graphs) | immediate | ancestors | yes | no (memo per frame and per call) | as declared: pure → ON_REQUEST, sources, sinks and timers → ALWAYS, event flow → ON_EVENT / ON_TRIGGER | a steady frame, execution only when needed, loops and re-execution |
| `step` | deferred | none | no | no | ALWAYS | today's core default |
| `strict` | deferred | none | no | yes | ALWAYS | one execution per node per frame |
| `event` | immediate | none | no | no | ON_EVENT where declared | pure push and wiring |
| `legacy` | from the global flags | | | | today's behaviour | documents without the field; projects that set flags |

**Where the model comes from:**
- **From the document:** the root's `graph.config.execution` is saved with the document and applies to all its subgraphs.
- **When loading** a document without the field: `legacy`.
- **For `new LGraph()` and new documents in the editor:** `LiteGraph.default_execution_model`, which is `"ancestors"`. It resolves to `"legacy"` if the project has assigned any legacy flag (the flags become accessors that note the assignment).
- **Changing it:** the graph info (Options panel, "Execution model" combo) changes it in one transaction. An optional "Apply the model's node modes" button changes modes in one more undoable step, and is never automatic.

### 2. Ancestors semantics

- **Frame.** Each step has a frame id. For each ALWAYS node in execution order, the engine first pulls its ON_REQUEST data ancestors, then executes it. Each ON_REQUEST node runs **at most once per frame** for these pulls (fixes A1 and A2).
- **Events.** Events are delivered immediately and depth-first. Before an `onAction` or a trigger runs, the target's ON_REQUEST ancestors are refreshed under the call id. A node already computed in this frame or call re-runs only if one of its input links has a newer data version. `setOutputData` bumps a per-link version. Loops therefore re-execute exactly the body inputs that changed (A5 kept).
- **ALWAYS ancestors are never re-run by a refresh.** They provide this frame's value (fixes A3). ON_EVENT and ON_TRIGGER nodes run only on events.
- The refresh passes no fake `param` (A6).

### 3. One engine

A new `src/execution.js` holds `ExecutionEngine` plus the model registry. It owns:
- delivery, the queues, call and frame ids, the memo and link data versions;
- the guards and the refresh;
- the boundary crossings.

`triggerSlot`, `actionDo`, `doExecute`, `getInputData(force)`, `refreshAncestors`, `executePendingActions`, `runStep` and the subgraph and function paths delegate to it. The `legacy` model reproduces today's code paths exactly, with today's bugs.

Every refusal emits a typed `event-dropped {node, path, reason}` (nothing is created when no one listens), plus a `log_warn` once per node.

### 4. Nodes declare their needs (optional)

`static def.execution` is read into `definition.execution`:

| Field | Meaning | Examples |
|---|---|---|
| `models` | `{ <model>: false \| { default_mode, modes } }`. An absent model means valid | |
| `modes` | Modes that are always valid | Timer `[ALWAYS, NEVER]`; TriggerEvent without ON_REQUEST (A4) |
| `emit: "immediate"` | Delivered synchronously, with a refresh before each emission, in every model | FOR, ForEach, WHILE, Sequence |
| `ticks: true` | Needs the step loop. Never re-run by a refresh | Timer, Delay, the counter's Count Executions |
| `pure: true` | Safe to re-run, so it is ON_REQUEST by default in `ancestors` | math, logic, strings |

- **Undeclared types are valid everywhere and get ALWAYS.** This keeps compatibility.
- `changeMode` and the mode menus refuse an invalid mode. The message names `LiteGraph.Execution.AllowAnyMode`, the setting that lifts it.
- `graph.checkExecution()` returns diagnostics (invalid model or mode, a `ticks` node in a non-ALWAYS mode, an ON_REQUEST emitter, a loop body with no path), shown as an opt-in badge.

### 5. Reporting on every path

Errors from event chains report `node-error` and `execution-state` the same way the step loop does. Nodes run by actions or pulls report `running` → `done` once per change.

## Compatibility rules (bugs aside)

1. **A document without `config.execution` runs as `legacy`:** identical to today under the same global flags. Saving it does not add the field until the user picks a model.
2. **Projects that set any legacy flag** get `legacy` for new graphs. A project can always force it with `LiteGraph.default_execution_model = "legacy"`.
3. **Undeclared third-party node types:** valid in every model, ALWAYS by default, with today's callbacks and signatures.
4. **Public API unchanged:** `triggerSlot`, `trigger`, `actionDo`, `doExecute`, `refreshAncestors`, `getAncestors` and `getInputData(slot, force, refresh)` keep their signatures. The legacy flags stay readable and writable (deprecated, removed no earlier than 0.20).
5. **Mode 4 stays ON_REQUEST.** `comfy_interop.js` keeps its mapping. Check that `config.execution` survives the Comfy export and import.
6. **The one documented change:** new graphs created in code without legacy flags use `ancestors`. In it, an action reaches an undeclared node that has an `onExecute` immediately, instead of at its next turn. This goes in `CHANGES.md`, with the one-line opt-out.

## Scope

- **In:**
  - the model registry and the engine;
  - the `ancestors` default, plus `step`, `strict`, `event` and `legacy`;
  - node declarations;
  - the model in the graph info;
  - fixes for A1–A7 and B1–B17;
  - updates to the flow nodes; diagnostics and reporting;
  - runner parity and compatibility golden tests;
  - deprecations and docs.
- **Out:** merging CallbackHandler with typed events; parallel or async scheduling (USE-02); token mode (BUN-02); behaviour trees (USE-13); await (CFY-22); any change to mode 4.

## Steps

Proposed as **Wave 6**, on branches `LG/wave6<x>_<topic>` cut from `LG/dev`. Every commit passes `npm run check`, and the build is regenerated in its own commit.

| # | Step | Acceptance check |
|---|---|---|
| **6a: ensure** | | |
| 1 | `test/event-models.test.js`: characterization of FOR, ForEach, WHILE, Sequence, Delay, Timer, Counter, IF, Branch, WaitAll, Stepper, Switch and a subgraph node, under the flag sets `defaults` and `event_based`, plus A1, A2 and A4. Known-wrong results are marked `test.failing` with the finding id | Jest passes. Every finding marked (probe) has a test |
| 2 | Compatibility golden tests: run each example document and `sa-subgraphs.json` for N steps under the current flags and snapshot the output data and node state. **They must stay identical through the whole wave** | Snapshots are committed. They are re-run in every later step |
| 3 | Flag-independent fixes:<br>- B5: ForEach `break` and the unused read;<br>- B10: `onStart` to every non-NEVER node;<br>- B11: `ON_EVENT` instead of `ON_ACTION`;<br>- B13: inner graphs inherit the parent's timing;<br>- B15: forward `param` and `options`, and Sequence copies `options`;<br>- B16: drop the dead flag and the warning noise | Matching tests pass. Golden tests are unchanged, or a changed snapshot is justified by a finding id |
| 4 | Report errors from event chains (B9) with a shared `_reportNodeError`, used by `runStep` and the event entry points | A test: an action that throws outside a step emits `node-error` with its path and sets `status: "error"`. A runner test sees it |
| 5 | Fix the docs (B17): guide and codebase map | Docs review |
| **6b: engine and models** | | |
| 6 | `src/execution.js` (in `build.py` before `lgraphnode.js`): `ExecutionEngine`, `registerExecutionModel`, and the built-in models. `legacy` reproduces today's paths, and the core methods delegate to the engine | All existing tests, step 1's passing tests and the golden tests are identical. `check:types` passes |
| 7 | `graph.config.execution`, resolved from the root. `LiteGraph.default_execution_model = "ancestors"`. Legacy flags as accessors that note an explicit assignment, which makes the default resolve to `legacy`. Loading without the field gives `legacy` | Tests:<br>- a document without the field gives `legacy`;<br>- `new LGraph()` gives `ancestors`;<br>- after `LiteGraph.use_deferred_actions = true` is set explicitly, `new LGraph()` gives `legacy`;<br>- the field survives save/load and the Comfy round trip |
| 8 | The ancestors semantics: frame pull before ALWAYS nodes, memo per frame and per call, link data versions, no re-run of ALWAYS ancestors, no fake `param` | Tests:<br>- A1: the sink sees values;<br>- A2: one run per frame for two consumers;<br>- A3: a counter and a timer are not advanced by actions;<br>- A5: FOR through an ON_REQUEST math node gives `[0,1,2]`, with only the changed nodes re-run |
| 9 | Subgraph and function boundaries in the engine: any non-NEVER subgraph node delivers inner events (B6). The 64-pass cap becomes the setting `LiteGraph.Execution.MaxEventPasses`, and reaching it is reported. Recursion depth cap: `LiteGraph.Execution.MaxEventDepth`, reusing `subgraph_max_depth` at boundaries | Tests: an inner action with the subgraph node in ON_EVENT mode; reaching the cap emits `event-dropped` with reason `max-passes`, and the message names the setting |
| 10 | `event-dropped` for every refusal path (B8, B12), with the reasons `reentry`, `refreshing`, `no-handler`, `mode`, `stopped-queue`, `max-passes`, `max-depth`, `cycle`. Add it to the typed-events list | One test per reason |
| 11 | The `strict` and `event` models | Tests: in `strict`, a node triggered twice in one frame runs once and the second run reports `event-dropped` with reason `once-per-frame`; `event` delivers immediately with no refresh |
| **6c: node declarations** | | |
| 12 | `static def.execution` in `describeNodeType` and `.d.cts`. `changeMode`, the node panel and the group "Mode for all nodes" check validity and name `LiteGraph.Execution.AllowAnyMode` in the refusal. When a node is added to a graph and its mode was not set explicitly, it gets the model's default mode. A loaded node keeps its stored mode | `node-definitions.test.js`: declarations are readable without an instance. Refusal text. A group mode change reports the nodes it skipped. A configured graph keeps its modes |
| 13 | Declare the needs of the events, logic, base, math, strings and graph (input/output/subgraph/function) packs. Rewrite FOR, ForEach and WHILE for `ancestors` with `emit:"immediate"`:<br>- a `completed` output;<br>- reaching `cycleLimit` reports, naming `properties.cycleLimit`;<br>- `break` takes effect within the same loop.<br>Sequence keeps slot order (B4). Switch and IF stop firing every step (B14). DataStore reads at action time (B15). Timer and Delay declare `ticks` | The tests marked `test.failing` in step 1 pass under `ancestors`. Nodes that declare `emit:"immediate"` also pass under `step`. Golden tests still pass under `legacy` |
| 14 | `graph.checkExecution()`, an `execution-check {report}` event on root configure, and a badge behind the setting `LiteGraph.Node.ExecutionBadge` (on in the editor) | Tests for an ON_REQUEST emitter (A4), Delay in ON_EVENT, and a `ticks` node in an ON_EVENT subgraph. A browser check on `editor_build.html` |
| **6d: graph info, reporting, runner** | | |
| 15 | Graph info: "Execution model" combo in the Options panel (`lgraphcanvas.js:9007`), changed in a transaction, plus the optional "Apply model node modes" (one undo step). The editor presets set the model on new documents instead of setting flags | Browser check: switching the model is one undo step, and applying modes is another. Its test uses `graph.transact` |
| 16 | `execution-state` for nodes run by actions or pulls. The runner page draws `execution_state` (open item from Wave 4) | A runner integration test streams statuses. Browser check of the runner page |
| 17 | Runner parity: `tools/tests/runner.test.mjs` runs an `ancestors` workflow with FOR and WHILE, and a `legacy` example. Results match Jest | node:test passes |
| **6e: polish** | | |
| 18 | Deprecations: each legacy flag logs once and has `@deprecated` in `.d.cts` naming its replacement. Removal no earlier than 0.20 | A test for the one-time log. `check:types` passes |
| 19 | Docs:<br>- guide: rewrite Execution / Events (models table, ancestors frame, declarations, compatibility, a loop example);<br>- `callbacks.md`: `event-dropped`, `execution-check`;<br>- the codebase map's Execution section; `CHANGES.md` (the one change, and the opt-out);<br>- roadmap row for Wave 6; one execution record per sub-wave;<br>- decision record `agents/memories/decisions/NNNN-execution-models.md` | Docs review. Index rows are added in the same commits |

## Risks

- **Compatibility:**
  - `legacy` must match today exactly. The golden tests (step 2) and the identical-results gate (step 6) enforce it.
  - New code-built graphs change behaviour (rule 6). Mitigations: legacy-flag detection, a one-line opt-out, and `CHANGES.md`.
  - Third-party nodes that read the flags directly keep working through the accessors.
- **Ancestors cost:** a pull per ALWAYS node every frame. Mitigations: cache the ancestor lists per node and invalidate them on `updateExecutionOrder`; keep the memo per frame. Benchmark `runStep` on `benchmark.json` and on a 1k-node graph before and after step 8.
- **Link data versions:** nodes that mutate an output object in place, without calling `setOutputData`, won't bump the version. Re-run when a pull is forced, and document it.
- **Deep recursion** with immediate delivery (WHILE in nested subgraphs): capped by named settings, and each refusal names its setting.
- **Provenance:** a new design. The MIT `Comfy-Org/litegraph.js` ≤ `ea0e1a8` has the same old engine, so there is nothing to adapt. ComfyUI_frontend is a design reference only.

## Open decisions (each with a recommendation)

1. ~~The model for `new LGraph()`~~. **Decided:** `ancestors`, with legacy-flag detection and the opt-out.
2. ~~The mode of undeclared node types in `ancestors`~~. **Decided:** ALWAYS. `checkExecution` suggests ON_REQUEST where a node is `pure`.
3. **Model scope.** Recommend: per document (the root's `config`), not per subgraph definition, to avoid mixed-model boundaries.
4. **Re-run policy inside a call.** Recommend: link data versions (re-run only on changed inputs), and a forced pull always re-runs. The alternative, re-running on every new call id, is simpler but repeats work in loops.
5. **Does an error in an event chain stop a running graph?** Recommend: report it everywhere, rethrow according to `LiteGraph.throw_errors`, and stop only for errors inside `runStep`, as today.
6. **Queued actions while stopped (`step` / `legacy`).** Recommend: keep the queue and report `stopped-queue` once per node; `stop({dropQueued: true})` clears it.
7. **Mode restrictions.** Recommend: on by default; `LiteGraph.Execution.AllowAnyMode` lifts them, and every refusal names it.
8. **When to remove the deprecated flags.** Recommend: not before 0.20, with an entry in `CHANGES.md`.

## Verification (whole wave)

- `npm run check` on every commit (lint, 12 builds, `check:types`, Jest, node:test, package check).
- The `event-models` matrix: every flow node × every model × root and inside a subgraph node.
- The compatibility golden tests stay identical under `legacy`.
- Runner parity (step 17).
- Browser checks on `editor_build.html` (port 8000): model combo, badge, mode refusal, loop demo. Also the runner page's status overlay.

## History

- 2026-11-22: proposed (read-only audit at `12ef719`).
- 2026-11-22: revised after the user's review: `ancestors` is the default model, the other models are opt-in, nodes may declare per-model validity, the model is in the graph info, and compatibility is kept through `legacy`.
- 2026-11-22: accepted.
