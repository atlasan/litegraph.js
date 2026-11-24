# Wave 6d: graph info, event-run reporting, runner

> **Date** 2026-11-22 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `c98b482` · **Plan** [events and execution](../plans/2026-11-22-events-execution.md)

Steps 15–17 on `LG/wave6d_graphinfo`. The document's execution model is shown and changed in the graph info (canvas menu "Options (execution: …)"), with an optional button that applies the model's node modes; each is one undo step. The Editor pages set the model instead of the legacy flags. Nodes run by actions, triggers or pulls report `running` → `done`, and the runner page draws the streamed execution state (open since Wave 4). Two parity fixtures run the same in Jest and in a runner worker.

## Changes

- `5092921` `feat:`
  - **Step 15:** `LiteGraph.showCanvasOptions` (now a declared field, on in the Editor) brings back the canvas menu's Options entry, labelled with the model; `showShowGraphOptionsPanel` gained the "Execution model" combo and "Apply the model's node modes (N)". `apps/editor/js/defaults.js` sets `default_execution_model = "ancestors"` (base and the `debug`, `mobile`, `event_based` presets) instead of the four flags.
  - **Step 16:** `doExecute` outside the node's own step turn (`graph._step_node`) and `actionDo` report `running` → `done` once per change. `apps/runner/public/execution-view-state.js` records messages per workflow; `app.js` applies them to the open view and re-applies them after tab switches, opens and syncs.
  - **Step 17:** `test/fixtures/runner-parity-{ancestors,legacy}.json` (Timer → Once → FOR ×3 and WHILE while count < 3, results in DataStores) with `runner-parity.expected.json`; checked in-process (`execution-models.test.js`) and in a worker (`tools/tests/runner.test.mjs`), which also checks the streamed `running`, `done` for an action-run counter.
  - **Found while building the fixture:** under `ancestors`, an event fired during the first frame reached FOR before the constants feeding it had their first turn, so FOR read nothing. A pull now also runs an ALWAYS origin that never ran (its first value; `ticks` nodes excluded).
- `86880a8` `build:` regenerated distributions.

## Verification

| Check | Result |
|---|---|
| `npm run check` | 801 Jest (26 snapshots unchanged), 99 integration, 12 builds, types parity |
| Browser: `editor_build.html` (8001), a pre-Wave-6 document (no `config.execution`) loaded | the editor assigns no legacy flag (`default_execution_model` "ancestors"); the document is `legacy`; canvas menu shows "Options (execution: legacy)"; the combo switched it to `ancestors` and showed "Apply the model's node modes (1)"; clicking it set `math/operation` to On Request; history `nodeDrag`, `executionModel`, `executionModelModes`; Ctrl+Z → modes back (model still ancestors), Ctrl+Z → `legacy` |
| Browser: runner page (port 3001, `WORKFLOWS_DIR` with the parity fixtures), open `runner-parity-ancestors.json`, Start Execution | status "running"; every node of the view has `execution_state` done (FOR and WHILE run by actions, the ON_REQUEST condition by pulls); title boxes drawn green |

## Notes

- The Options panel's menu entry had been commented out upstream ("removing canvasoptionspanel"); the plan names that panel as the graph info, so it is back behind the existing `showCanvasOptions` switch.
- In the editor, the first right-click after a node drag does not open the canvas menu (seen while testing; not changed here).

## Left open

- B9's runner side is covered through the shared root listeners (`node-error`, `execution-state`); no allowed node throws on an action, so the runner test checks streamed statuses rather than an event-chain error.
