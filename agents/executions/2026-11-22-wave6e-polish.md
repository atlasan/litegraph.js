# Wave 6e: deprecations and documentation; Wave 6 closing summary

> **Date** 2026-11-22 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `6078744` · **Plan** [events and execution](../plans/2026-11-22-events-execution.md)

Steps 18–19 on `LG/wave6e_polish`, and the summary of Wave 6. The legacy flags are deprecated (one log per flag on assignment, `@deprecated` in the declarations, removal no earlier than 0.20). The guide's Execution and Events sections were rewritten around the execution models; callbacks, architecture, the codebase map, `CHANGES.md` and [decision 0002](../memories/decisions/0002-execution-models.md) record the design.

## Changes

- `b69aba6` `feat:` deprecation logging in the flag setters (`LEGACY_EXECUTION_FLAGS[name].replacement`); `@deprecated` JSDoc on the seven flags in `litegraph.d.cts`; tests for the one-time log and for the guide's loop example.
- `341ddd6` `build:` regenerated distributions.
- `5d26759` `docs:` guide (models table, the ancestors frame, where the model comes from and the opt-out, graph info, declarations, loops with a tested example, delivery / subgraphs / refusals / errors), `callbacks.md` (`execution-check`), `architecture.md`, codebase map (runStep, delivery, legacy guards, test counts), decision 0002 with its index row.

## Verification

| Check | Result |
|---|---|
| `npm run check` | 803 Jest (26 golden snapshots unchanged since 6a), 99 integration, 12 builds, types parity |
| Browser: `editor_event_based.html` (8001) | no legacy flag assigned at load, `default_execution_model` "ancestors"; assigning `use_deferred_actions` twice logged one deprecation naming the "step" model; the default stayed "ancestors" (set explicitly by the preset) |

## Wave 6 summary

| Part | Branch | Merged into `LG/dev` | Record |
|---|---|---|---|
| 6a characterization, golden tests, flag-independent fixes | `LG/wave6a_ensure` | `16a5dcb` | [record](2026-11-22-wave6a-ensure.md) |
| 6b engine and models | `LG/wave6b_engine` | `01cd29c` | [record](2026-11-22-wave6b-engine.md) |
| 6c node declarations | `LG/wave6c_declarations` | `c98b482` | [record](2026-11-22-wave6c-declarations.md) |
| 6d graph info, reporting, runner | `LG/wave6d_graphinfo` | `6078744` | [record](2026-11-22-wave6d-graphinfo-runner.md) |
| 6e deprecations, docs | `LG/wave6e_polish` | this merge | this record |

**Delivered:** every plan step (1–19); findings A1–A7 and B1–B17 fixed under the execution models (B5, B9, B10, B11, B13, B15, B16, B17 also under `legacy`); `legacy` keeps today's behaviour otherwise, enforced by 26 golden snapshots that never changed. Decisions: open decisions 3–8 as recommended; forced pulls memoized (user choice).

**Verified:** `npm run check` before every code commit; browser checks per part on `editor_build.html` / `editor_event_based.html` (port 8001) and the runner page (port 3001); runner parity in a worker.

## Left open

- `legacy` documents still show today's bugs (B1, B2, B4, B6, B8, A1–A3 under the flag presets), by design; switching a document to `ancestors` in the graph info fixes them.
- WHILE is invalid under `strict`; B8 (FOR in ON_TRIGGER mode receiving its body synchronously) stays under the deferred models.
- No allowed runner node throws on an action, so B9's runner coverage is through the shared root listeners and the streamed statuses.
- A badge is dropped when a node's title leaves no room (existing layout); the first right-click after a node drag does not open the canvas menu (seen while testing).
- Removing the legacy flags and the `legacy` code paths: not before 0.20 (decision 0002).
- Nothing pushed; no PR or tag.
