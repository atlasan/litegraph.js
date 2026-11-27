# Call scopes and pure semantics (flows step 4)

> **Date** 2026-11-25 · **Kind** plan · **Status** done ([execution](../executions/2026-11-25-call-scopes.md)) · **Base** `LG/dev` @ `a1eb082`

Under `ancestors` and the newer models, an ON_REQUEST node that reads randomness, time or outside state gives a fresh value in each loop iteration and each Sequence branch; a property edit made inside a call is seen; and one call id is used. `legacy` stays byte-identical (decision [0002](../memories/decisions/0002-execution-models.md), kept with no removal date by [0008](../memories/decisions/0008-legacy-compatibility-scope.md)). This is step 4 of the [flows direction](2026-11-22-flows-direction.md), accepted as DEC-5 in the [next priorities plan](2026-11-25-next-priorities-after-0.18.0-dev.2.md); track branch `LG/dev_flows_call_scopes`.

## Context

- **Today:** the memo in `src/execution.js` (`isFresh`, `remember`) keys an ON_REQUEST node on the frame or the outer call (`ExecutionEngine._call`, set by `runStep` and `_dispatchEvent`) and on its input data stamps. Loops, Sequence outputs and `graph/function` calls do not open a new scope; Sequence makes its own `action_call` with `Math.random`, which the memo never reads.
- **Evidence:** [event flows audit](../audits/2026-11-22-event-flows-audit.md) findings 1–4; the [research note](../memories/research/2026-11-22-call-scopes-and-pure-nodes.md) (option C and tests 1–7).
- **Ideas:** [FLW-01 to FLW-04](../ideas/cards/FLW-01-call-scopes-and-pure-semantics.md), FLW-14 (loop lint).

## Design choices (recommendation taken)

| # | Choice | Options | Taken |
|---|---|---|---|
| 1 | Scope identity | a. string id compared by value; b. a scope object per opening, the string id for display | **b.** Two openings never collide (the same loop run twice in one call, or two loops with the same iteration number), and the id stays readable: `call_12/7.s1/5.i3` |
| 2 | Which nodes memoize per scope | a. only declared `volatile`; b. declared `volatile` **and** undeclared ON_REQUEST nodes | **b.** An undeclared node may read state; only a `pure: true` declaration promises determinism. Undeclared nodes re-run once per scope, which is correct and only costs more inside loops |
| 3 | Deterministic memo key | a. frame or call as today; b. `{input stamp, property version, graph change version}` across calls | **b.** (research test 3). The graph's change counter (`graph._version`, bumped by `onGraphChanged`) covers rewiring and widget edits, so a rewired pure node is never stale |
| 4 | Property version | `_props_version`, bumped by `setProperty` on an accepted change | in the memo key of every node; a deterministic memo also keeps the property values, so a direct write to `node.properties` is seen at the next pull (within one call scope, only `setProperty` is) |
| 5 | Volatile declaration | `pure: "volatile"` (also `{pure: true, volatile: true}`); normalized to `pure: true, volatile: true` | declared now on `math/rand`, `math/formula`, `basic/time`. `basic/variable` is a setter too (input connected), so not pure. `widget/*`, `input/gamepad`, `audio/analyser`, texture and object readers stay ALWAYS until checked in a browser. A volatile node saved in ALWAYS mode keeps it: no `pure-always` warning, and "Apply the model's node modes" leaves it (new nodes start ON_REQUEST) |
| 6 | Branches beyond Sequence | Sequence only, or also Switch, IF, `waitAll` | **Sequence only**, through a `branches: true` declaration that the engine reads in `triggerSlot`; IF fires one branch, so it needs none |
| 7 | Scopes under `step`, `strict`, `event` | model-independent, or `ancestors` only | **model-independent**; only `legacy` ignores scopes |
| 8 | Mutators restamp objects (`objects/set_property`, `basic/set_array`) | now, or later | **later** (a separate change; `objects/get_property` stays undeclared, so it already re-runs per scope when set ON_REQUEST) |
| 9 | The `refresh` input | by name, or a marked slot | an ACTION slot named `refresh` with `refresh: true`, offered in the node's Inputs menu for ON_REQUEST nodes outside `legacy`; `ExecutionEngine.refresh(node)` |
| 10 | `options.action_call` | keep per-trigger uuids, or alias the scope | outside `legacy` it defaults to the scope id; IF's "stepped" test uses `graph._step_node` there. `legacy` keeps its uuids and Sequence's `Math.random` ids (the goldens mock `Math.random`) |
| 11 | Decision record | extend 0002 in place, or a new record | new record [0009](../memories/decisions/0009-call-scopes.md) (0003 is taken by the event pipe) |

## Scope

- In: scope ids (root per step and outer call, children per Sequence output, loop iteration and `graph/function` call); the volatile declaration; the property version; the `refresh` input; the `volatile-loop-input` check (FLW-14); one call id; docs, `CHANGES.md`, the roadmap, the codebase map.
- Out: flows steps 5–7 (lifecycle and custom events, profiles, flow docs); mutators restamping objects; the scope id in `execution-state`; a scope badge in the canvas.

## Steps

| # | Step | Acceptance check |
|---|---|---|
| 1 | Regression tests for audit findings 1–4 and research tests 1–7 (`test/call-scopes.test.js`) | they fail on `a1eb082` |
| 2 | Scope objects in `ExecutionEngine`; `runStep`, `_dispatchEvent`, `ensureFresh`, `triggerSlot` on them | tests 1, 2, 6 pass |
| 3 | Memo key: scope for volatile and undeclared, `{stamp, props, graph version}` for pure; `_props_version` | tests 3, 4 pass |
| 4 | `refresh` input and menu entry; `volatile-loop-input` check | test 5 and the lint test pass |
| 5 | Declarations; docs (`docs/guide.md` execution, generated node reference), `CHANGES.md`, roadmap, codebase map | `bun run check` (incl. `check:fresh`) |
| 6 | Benchmark | `runStep` on `benchmark.json` within 5% of the base |
| 7 | Merge `LG/dev`, gate, local CI, execution record | `Local-CI: pass` on the head |

## Risks and open questions

- **Hot path:** `isFresh` gains two comparisons; the scope opening is one object per Sequence output, loop iteration and function call. Measured before and after (step 6).
- **Behaviour change under `ancestors`:** undeclared ON_REQUEST nodes re-run per loop iteration and Sequence branch; deterministic pure nodes stop re-running every frame when nothing changed. Both are listed in `CHANGES.md`.
- **A graph change during a call** (`onGraphChanged`) invalidates pure memos; consumers in the same scope may then see a newer value. Accepted: an edit is a change.

## History

- 2026-11-25: written and accepted with the track (DEC-5).
- 2026-11-27: during implementation, `basic/variable` left out of the volatile list (it also writes); volatile nodes in ALWAYS kept as saved; deterministic memos also compare the property values, so a direct write to `node.properties` is seen at the next pull.
