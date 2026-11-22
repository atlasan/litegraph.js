# Wave 6b: execution engine and models

> **Date** 2026-11-22 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `16a5dcb` · **Plan** [events and execution](../plans/2026-11-22-events-execution.md)

Steps 6–11 on `LG/wave6b_engine`. `src/execution.js` holds `ExecutionEngine` and the model registry with the built-in `ancestors`, `step`, `strict` and `event` models; `legacy` keeps today's code paths. The model lives in the root graph's `config.execution`. New graphs default to `ancestors`; documents without the field and projects that assign a legacy flag get `legacy`. The ancestors semantics (frame pull, memo per frame and call, link data versions), the subgraph boundaries, `event-dropped` and the `strict` / `event` models are in. All existing tests and the 26 golden snapshots are unchanged.

## Changes

- `b019e9e` `feat:`
  - **Engine (step 6):** `ExecutionEngine.registerModel/getModel/listModels/rulesFor/resolveDefaultModel`; `LiteGraph.registerExecutionModel`, `getExecutionModel`, `listExecutionModels`, `LiteGraph.ExecutionEngine`. `triggerSlot`, `actionDo`, `doExecute`, `getInputData(force)`, `runStep` and `Subgraph.onAction` keep the old code under `legacy` and call the engine otherwise. `build.py` lists `execution.js` after `litegraph.js`.
  - **Model source (step 7):** the legacy flags are prototype accessors (`LEGACY_EXECUTION_FLAGS` in `litegraph.js`) that note assignments; `LiteGraph.default_execution_model` resolves to `legacy` after one unless it was set itself. `configure` marks the document (`_execution_from_document`); `_serializeConfig` writes the resolved model for new root documents and always returns a copy (history snapshots shared the live config object). `graph.executionModel`, `getExecutionRules()`, `setExecutionModel(name)` (one transaction, `execution-model-changed`).
  - **Ancestors (step 8):** `setOutputData` stamps `link._data_version`; a non-legacy run records `node._exec_memo`; `pull` / `ensureFresh` run ON_REQUEST data ancestors depth-first, once per frame or call unless an input is newer; `runStep` pulls before each ALWAYS node (`frame_pull`); actions and triggers pull before delivery; triggers during a pull are dropped (`refreshing`); no fake `param`. Forced pulls are memoized (user decision); under `ancestors` they never re-run ALWAYS origins, under the other models they run the origin once per frame or call.
  - **Boundaries (step 9):** `Subgraph.onAction` (non-legacy) pushes inputs and refreshes data `graph/input` nodes, then flushes inner queues when the node does not step (B6), bounded by `subgraph_max_depth`. The function node's 64-pass loop is `ExecutionEngine.flushInner` with `LiteGraph.Execution.MaxEventPasses`; reaching it is reported.
  - **`event-dropped` (step 10):** `ExecutionEngine.drop` emits on the root (only with listeners) and warns once per node and reason (not for `mode`). Reported on the legacy paths too: `reentry`, `refreshing`, `mode`, `no-handler`, `stopped-queue`. `graph.stop({dropQueued: true})`. Typed-events list in `docs/callbacks.md` and `.d.cts`.
  - **Models (step 11):** `strict` drops a second execution in a frame (`once-per-frame`); `event` delivers immediately with no refresh. Outside `legacy`, an event-chain error is rethrown only when `LiteGraph.throw_errors` (decision 5).
  - Docs: guide (execution models table), architecture, codebase map, `CHANGES.md` (the one behaviour change and its opt-out).
- `2e5824a` `build:` regenerated distributions.

## Verification

| Check | Result |
|---|---|
| `npm run check` | 788 Jest (26 snapshots unchanged), 97 integration, 12 builds, types parity |
| `test/event-models.test.js` | the matrix now covers `defaults`, `event_based`, `ancestors`, `step`, `strict`, `event` (171 tests); A1, A2, A3, B6 and B8 pass under the models that fix them |
| `test/execution-models.test.js` | 28 tests: model source (7 incl. undo and Comfy round trip), ancestors A1/A2/A3/A5, boundaries, one test per drop reason, strict, event, decision 5, legacy reporting |
| Benchmark (`build_node`, 300 steps) | `benchmark.json` 185–390 µs/step and a 900-node ALWAYS chain 4–9 ms/step under both `legacy` and `ancestors`, within run-to-run noise of the `c80bd2b` build (390 µs, 8.1 ms); a 900-node ON_REQUEST chain pulled every frame 3.5 ms/step |
| Browser: `editor_build.html` (8001) | the editor resolves `legacy` (its defaults assign flags; 6d changes this); after `setExecutionModel("ancestors")`, a real click on a button wired to FOR (`nElements` 3) → Counter shows 3 at once with the graph stopped |

## Notes

- `MAX_NUMBER_OF_NODES` (1000) caps a graph; the plan's 1k-node benchmark uses 900 nodes.
- A legacy-path `log_warn` per node and reason is new console output; behaviour is unchanged.

## Left open

- The B1, B2, B4, B7, B14 markers under the deferred models are resolved by node declarations in 6c.
