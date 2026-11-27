# 0009: Call scopes and pure-node memo semantics

> **Date** 2026-11-27 · **Kind** decision · **Status** accepted

## Context

[Decision 0002](0002-execution-models.md) made an ON_REQUEST node run at most once per frame or call, again only on newer input data. The [event flows audit](../../audits/2026-11-22-event-flows-audit.md) (findings 1–4) and the [research note](../research/2026-11-22-call-scopes-and-pure-nodes.md) showed what that misses: randomness, time and state readers are stale across loop iterations and Sequence outputs, an in-call property edit is not seen, two call ids exist, and `graph/function` runs in its caller's scope. The user's position (2026-11-22): ON_REQUEST shares a value and refreshes only when needed; where that is not wanted, an execution regenerates it. DEC-5 (2026-11-25) accepted flows step 4, which carries this; [decision 0008](0008-legacy-compatibility-scope.md) keeps `legacy` unchanged with no removal date. The [plan](../../plans/2026-11-25-call-scopes.md) lists the choices.

## Options

| Option | For | Against |
|---|---|---|
| A: keep once per frame or call | cheapest, no change | the audit's stale values; readers must stay ALWAYS |
| B: Unreal style, no cache, run per consuming exec node | always fresh | repeated work; two readers of one random in one step disagree |
| C: hierarchical call scopes; volatile nodes memoized per scope, deterministic pure nodes by data, property and graph version | fresh where needed, cheapest for deterministic nodes, readers in one scope agree, one call id | a new declaration kind; undeclared ON_REQUEST nodes cost more in loops |

## Decision

**Option C**, outside `legacy` and independent of the model (`ancestors`, `step`, `strict`, `event`):

- **Scopes:** a root scope per frame (`frame_N`) and per outer event chain (`call_N`); a child per Sequence output (the `branches` declaration), per loop iteration (`ExecutionEngine.iterate`; WHILE evaluates its condition in the iteration's scope) and per `graph/function` call. Each opening is a new object; the readable id (`call_3/7.s1/5.i2`) is `options.action_call`.
- **Memo:** every node's memo holds its property version (`setProperty`) and the graph change version (`onGraphChanged`), plus its input stamp. A **deterministic** node (`pure: true`) stays valid across scopes while its property values are unchanged (so a direct write to `node.properties` is seen at the next pull). A **volatile** node (`pure: "volatile"`) and any **undeclared** ON_REQUEST node are valid within one scope only: only a `pure: true` declaration promises determinism.
- **Volatile declarations:** `math/rand`, `math/formula`, `basic/time`. A volatile node saved ALWAYS keeps it (no `pure-always`, not changed by "Apply the model's node modes").
- **Regenerate on purpose:** a `refresh` ACTION input (`refresh: true`) runs the node again and restamps its outputs.
- **Lint:** `volatile-loop-input` when a loop input comes from a volatile ON_REQUEST node.

## Consequences

- Loops and Sequence can pull random, time and state readers; consumers in one iteration or output agree.
- Deterministic pure chains stop re-running every frame when nothing changed (`benchmark.json` under `ancestors` is faster); undeclared ON_REQUEST nodes re-run per iteration.
- Examples that relied on one shared value across Sequence outputs must keep the reader ALWAYS (`random-console` was changed).
- Open for later: mutators restamping objects (`objects/set_property`, `basic/set_array`); `branches` on Switch or `waitAll`; the scope id in `execution-state` (FLW-16); declaring the widget, gamepad, audio and texture readers volatile after a browser check.
