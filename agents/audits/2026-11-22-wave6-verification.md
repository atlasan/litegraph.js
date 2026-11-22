# Wave 6 verification

> **Date** 2026-11-22 · **Kind** audit · **Status** final · **Base** `LG/dev` @ `2ade48f`

An independent check of Wave 6 (events and execution, parts 6a–6e), done by the main session after the Wave 6 session reported done. Checked by reading and by running:
- the gate in the main checkout;
- the records against the [plan](../plans/2026-11-22-events-execution.md);
- a browser run on `editor_build.html`.

## Checks

| Check | Result |
|---|---|
| `LG/dev` history | Five `--no-ff` merges on top of `c80bd2b`: 6a `16a5dcb`, 6b `01cd29c`, 6c `c98b482`, 6d `6078744`, 6e `2ade48f`. `package.json` and the lockfile are unchanged |
| `npm run check` (main checkout) | Exit 0: 803/803 Jest (43 suites), 99/99 node:test, 12 builds, types, package check |
| `npm run check:fresh` | Exit 0: the committed builds match a fresh build |
| Records | One execution record per sub-wave, each with a "Left open" section. The plan's status is done |
| Known-wrong markers | `test/event-models.test.js` marks no finding as failing under the default `ancestors` model. The remaining markers apply to `legacy` presets (by design, decision 0002), plus B2 and B8 under `strict` and the deferred models |
| Browser: editor defaults | `LiteGraph.VERSION` 0.18.0-dev.1; `default_execution_model` `ancestors`; a new graph resolves to `ancestors` and serializes `config.execution` |
| Browser: `checkExecution` | A FOR loop whose `do` output was unconnected reported `loop-without-body`. After wiring the body, no issues were reported |
| Browser: loop run (real clicks) | Button → FOR (start 0, n 3) → Console, with the index going through an ON_REQUEST `math/operation` (×10) into the body's data input. Play, then a click on the button: the body saw `[0, 10, 20]`, one fresh pull per iteration |
| Undo of a model switch | Covered by `test/execution-models.test.js:549` and by the 6d record's browser check. A live check here could not show it: the editor page ships with `actionHistory_enabled = false`, and turning history on at runtime leaves no baseline entry (AGENTS.md gotcha) |
| Runner parity | Covered by the node:test run (99/99) and the 6d record's runner page check |

## Findings

| # | Severity | Finding | Evidence (`path:line`) | Since |
|---|---|---|---|---|
| 1 | low | `graph.executionModel` is a getter with no setter. Assigning it does nothing in sloppy-mode scripts (it throws in modules). `setExecutionModel(name)` is the API | `src/lgraph.js:2569` | open |
| 2 | low | The default editor page has undo history off (`actionHistory_enabled = false`). Without the `debug` preset, the "one undo step" model switch cannot be undone there. This predates Wave 6 | `apps/editor/js/defaults.js:39` | open |

## Verdict

Wave 6 is verified. The gate and the freshness check pass in the main checkout. Under the new default model, a loop with a pulled ON_REQUEST node behaves as the plan specifies. The two findings are low and do not block the pre-release. A setter for `executionModel` that calls `setExecutionModel`, and undo on by default in the editor, are candidates for the ideas catalog.
