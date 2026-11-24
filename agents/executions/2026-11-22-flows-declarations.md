# Flows track, declarations: execution needs for undeclared node types

> **Date** 2026-11-22 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `8e6ddf3` · **Plan** [flows reference and examples](../plans/2026-11-22-flows-reference-examples.md)

Steps B1–B2 of the plan, on `LG/dev_flows_declarations`. This is the declaration pass over the types that the [event flows audit](../audits/2026-11-22-event-flows-audit.md) §2 found undeclared, pack by pack. Declared types in the bundled catalog went from 50 to 86 of 273 (`npm run docs:nodes`). No new declaration kind was added.

## Changes

| Pack | Declared | Kept undeclared (comment in the file) |
|---|---|---|
| basic | pure: `const`, `boolean`, `string`, `data`, `array`, `length`, `not`; ON_EVENT default: `alert` | volatile: `time`, `variable`, `object`, `script`, `file`. Side effects or state: `set_array`, `array_append`, `console`, `download`, `jsonparse`, `data_store`, `watch` |
| events | ON_EVENT default: `once`, `waitAll`, `filter`, `log` (no `onExecute`) | `counter`, `semaphore`, `stepper`, `switch`, `branch`: their `onExecute` reads data or counts steps |
| logic | pure: `logic/sequence` | — |
| math | pure: `math/noise` (its table is filled once); ticks: `average`, `tendTo`, `spikes`, `accumulate` | volatile: `rand`, `formula` (TIME) |
| math3d | pure: all 15 (8 exist only with gl-matrix) | — |
| interface, input | — | volatile: every `widget/*`, `input/gamepad` |
| objects | — | volatile: `evaluate`, `event_function`, `method_widget`, `property_widget`, `json_editor`. Pure-ish: `get_property`, `object_keys`, `properties`. Side effects: `set_property`, `merge_objects` |
| gltextures | ticks: `temporal_smooth`, `linear_avg_smooth` | the filters, until they are checked in a browser; volatile: `operation`, `shader`, `canvas2D`, `average`, `webcam` |
| audio | ticks: `adsr` | volatile: `analyser`; the rest run outside the engine (audit finding 9) |

**Engine:** `LGraphNode.actionDo` called from host code, outside a dispatch, now pulls the node's ON_REQUEST inputs first under `refresh: "ancestors"`, as a delivered event does (`src/lgraphnode.js`).

## Changed results, with their reasons and tests

1. **The guide's loop example** (`test/execution-models.test.js`): its constants became pure, so ON_REQUEST, and `runStep` no longer computed them. The example called `loop.onAction("do")` directly, which bypasses the engine, so FOR read no data.
   - **Reason:** a host call should behave like an event.
   - **Fix:** `actionDo` pulls first, and the guide and the test call `loop.actionDo("do")`.
   - **New test:** a host `actionDo` pulls under `ancestors` and not under `event`.
2. **`math/accumulate` under `event`** (`test/execution-declarations.test.js`): a forced pull from an event re-ran it in the new call scope. It reached 3 after one step and two events; now it stays at 1.
   - **Reason:** a ticking node advances once per step.
   - **Check:** the test fails when the declaration is removed (checked).
3. **`node-definitions.test.js`** used `basic/const` as its example of an undeclared type; it now uses `basic/time`.

## Verification

| Check | Result |
|---|---|
| `npm run check` | lint clean; 12 builds; types parity; 814 Jest (26 golden snapshots unchanged); 103 node:test; package check |
| `test/execution-declarations.test.js` | 10 tests: declarations per class; volatile and stateful types stay undeclared; default modes under `ancestors`, `legacy` and `step`; the changed results above; `pure-always` until "Apply the model's node modes" |
| `legacy` goldens | unchanged (26 snapshots) |

## Left open

- `volatile` as a declaration kind, and call scopes (FLW-01, FLW-02): step 4 of the direction plan.
- Media packs (texture filters, glshaders, glfx, audio wiring, midi, geometry): declare them after a browser check.
- `checkExecution` on the examples after applying modes: covered in the examples part.
