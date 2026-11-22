# Wave 6a: characterization, golden tests and flag-independent event fixes

> **Date** 2026-11-22 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `c80bd2b` · **Plan** [events and execution](../plans/2026-11-22-events-execution.md)

Steps 1–5 of the plan on `LG/wave6a_ensure`. The flow nodes now have a characterization matrix under the `defaults` and `event_based` flag presets, with every known-wrong result marked `test.failing` and its finding id. The example documents and the SA fixtures have compatibility golden snapshots that the rest of the wave must keep. The flag-independent findings (B5, B9, B10, B11, B13, B15, B16, B17) are fixed; the golden snapshots did not change.

## Changes

- `5b3c46d` `test:` `test/event-models.test.js` (FOR, ForEach, WHILE, Sequence, Delay, Timer, Counter, IF, Branch, WaitAll, Stepper, Switch, a subgraph node, A1, A2, A3, A4, B12 under both presets) and `test/execution-golden.test.js` (8 example documents + 5 SA fixtures, 30 steps on a fixed clock with seeded `Math.random`, two button presses; link data and node state at steps 1, 4, 11 and 30; 26 snapshots).
- `ff87634` `fix:`
  - **B9:** `LGraph._reportNodeError` is shared by `runStep` and the event entry points. `triggerSlot`, `actionDo` and `doExecute` called outside a step or another event go through `LGraphNode._dispatchEvent`, which reports `node-error {error, node, path}` on the root graph and the `error` execution state, then rethrows (`LiteGraph._dispatch_depth` counts the nesting; `actionDo` now tags `error.node` like `doExecute`).
  - **B10:** `start()` sends `onStart` to every non-NEVER node (`sendEventToAllNodes` accepts a list of modes).
  - **B13:** `start()` shares `starttime` with inner graphs (`_shareTiming`), and an inner `runStep` adopts its parent's clock origin.
  - **B5, B15, B11, B16, B17:** ForEach, WaitAll, Semaphore, Once, Stepper, Sequence, the six html nodes, the dead flag, the warning noise, and the pull call in the guide and the codebase map.
- `aad3fa9` `build:` regenerated distributions.

## Verification

| Check | Result |
|---|---|
| `npm run check` | 648 Jest (26 snapshots), 97 integration, 12 builds, types parity |
| Golden snapshots | unchanged by the fixes |
| Browser: `editor_build.html` on port 8001, a `widget/button` wired to a node whose `onAction` throws; graph stopped; real click on the button | `node-error` with path `"2"`, the node's title box red with "boom from action" under it |
| Browser: `html/create_element` added | mode "On Event" |

## Notes

- **Decision 5 (errors in event chains):** in this part the error is always rethrown, as before. Rethrowing according to `LiteGraph.throw_errors` would change `legacy` behaviour (an existing test expects the throw with `throw_errors = false`), so it applies only to the new models (6b).
- **Runner (B9 acceptance):** the runner listens to `node-error` and `execution-state` on its root graph, which is where both reporters emit. The runner integration test is in 6d (step 16), where action-run nodes also report.
- The Timer characterization records a double tick at start (its `time` is still 0 after the first tick); not a plan finding, left as is.

## Left open

- The `test.failing` markers for B1, B2, B4 (order), B6, B7, B8, B14, A1, A2 and A3 are resolved by 6b and 6c.
