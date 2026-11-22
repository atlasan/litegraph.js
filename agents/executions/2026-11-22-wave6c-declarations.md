# Wave 6c: node execution declarations

> **Date** 2026-11-22 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `01cd29c` · **Plan** [events and execution](../plans/2026-11-22-events-execution.md)

Steps 12–14 on `LG/wave6c_declarations`. Node types can declare their execution needs (`static def.execution`, or `LiteGraph.declareNodeExecution` for whole packs); mode changes check them and name the setting that lifts the restriction; new nodes get the model's declared default mode. The flow nodes were fixed for the models (loops, Sequence, Switch, IF, DataStore, Timer, Delay), and `graph.checkExecution()` with a badge reports what does not fit. Every finding marked `test.failing` in 6a now passes under the models that fix it; `legacy` keeps today's behaviour and the golden snapshots are unchanged.

## Changes

- `df5162b` `feat:`
  - **Step 12:** `describeNodeType` → `definition.execution` (`ExecutionEngine.normalizeDeclaration`); `LiteGraph.declareNodeExecution`, `getValidNodeModes`; `changeMode` refusal (`node.mode_refusal`, names `LiteGraph.Execution.AllowAnyMode`); the node panel and Mode menu list only valid modes; `LGraphGroup.setNodesMode` returns the changed nodes with a non-enumerable `skipped`, and the group menu shows `canvas.showExecutionNotice`. `createNode` records `_constructed_mode`; `LGraph.add` applies `declaredDefaultMode` outside configure. `graph.applyExecutionModelModes()` (one transaction).
  - **Step 13:** declarations for events (TriggerEvent modes, Sequence `emit`, Timer/Delay `ticks` + ALWAYS/NEVER), logic (FOR/ForEach/WHILE `emit`, `loop`, `immediate_inputs: ["break"]`, ON_EVENT default; WHILE `models: {strict: false}`; IF modes; pure AND/OR/NOT/CompareBool/selector), base (pure array/table readers, cast, CompareValues), math (23 pure types; rand, noise, spikes, average, tendTo, accumulate and formula stay ALWAYS), strings (all pure), `graph/function` (ON_EVENT). Loops gained `completed`; WHILE reports `properties.cycleLimit`; IF branches on change when stepped in ALWAYS; Switch fires on a changed selection; DataStore reads its input on the action.
  - **Step 14:** `ExecutionEngine.check` / `graph.checkExecution()` (codes `invalid-model`, `invalid-mode`, `ticks-not-stepped` incl. inside non-ALWAYS subgraph nodes, `on-request-emitter`, `loop-without-body`, `pure-always`); `execution-check {report, reason}` after a root configure (with listeners); badge provider behind `LiteGraph.Node.ExecutionBadge` (default on in the Editor class).
  - Types, guide (declarations, loops), `CHANGES.md`, codebase map.
- `f40fca6` `build:` regenerated distributions.

## Verification

| Check | Result |
|---|---|
| `npm run check` | 797 Jest (26 snapshots unchanged), 97 integration, 12 builds, types parity |
| `test/event-models.test.js` | known-wrong only under `legacy` (B1, B2, B4, B6, B8, A1–A3 as before) plus B2 under `strict` (declared invalid) and B8 / A1 under the deferred and push models by design |
| `node-definitions.test.js` (+4), `execution-models.test.js` (+5) | declarations without an instance, refusal text, AllowAnyMode, group skipped list, default modes on add vs load, FOR `completed` + `break` under `step`, WHILE cycleLimit report, DataStore, checkExecution codes, `execution-check`, badge |
| Browser: `editor_build.html` (8001) | Timer's context menu Mode lists only Always and Never; group → Edit Group → Mode for all nodes → On Event changed the Const and showed "1 node(s) kept their mode (Timer) … Setting LiteGraph.Execution.AllowAnyMode allows any mode."; a loaded `ancestors` document with Delay in On Event shows the "⚠ exec" badge |

## Notes

- `graph/input` and `graph/output` are not declared: the boundary refreshes data inputs on entry (6b), and an action `graph/input` must not be flagged as an ON_REQUEST emitter.
- A badge is dropped by the existing title layout when the title leaves no room (seen on TriggerEvent); the provider still reports it (`nodeBadges.collect`).
- `subgraph.js` cannot read `LiteGraph.ON_EVENT` while its class body is evaluated (import cycle); the function node's declaration uses the literal 1.

## Left open

- The Editor still assigns legacy flags in `apps/editor/js/defaults.js`, so its new documents are `legacy` until 6d (step 15).
