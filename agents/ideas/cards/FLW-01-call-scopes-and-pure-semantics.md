# FLW-01 to FLW-04: call scopes and pure-node semantics

| Field | Value |
|---|---|
| Purpose | P3 Scene logic; P2 Graphics; P10 The host itself (see [purposes](../purposes.md)) |
| Kind | core (execution engine) |
| Area | [execution flows](../landscape/execution-flows.md) |
| Inspiration | UE Blueprints pure nodes (re-run per consumer); Houdini dirty flags and time dependency; ComfyUI `IS_CHANGED` (NaN = always rerun); Rete DataflowEngine `reset` |
| License of the inspiration | UE, Houdini: proprietary; ComfyUI: GPL-3.0. Design reference only. Rete: MIT (adaptable, nothing needed) |
| Effort | M |
| Maturity | investigated (the [research note](../../memories/research/2026-11-22-call-scopes-and-pure-nodes.md) compares the options and gives tests) |
| Depends on | Wave 6 (`src/execution.js` memo, stamps, `_dispatchEvent`); decision 0002 |
| Last reviewed | 2026-11-22 |

## Why

The [audit](../../audits/2026-11-22-event-flows-audit.md) probe found three problems under `ancestors`:
- An ON_REQUEST random node returns the same value in every FOR iteration and on both Sequence outputs.
- A property edit inside one call is not seen.

Because of this, `math/rand`, time readers and state readers must stay ALWAYS, so they cannot be pulled where they are needed. There are also two call ids with different meanings (`_call` for the memo, `action_call` for the legacy dedupe).

## What it would look like here

| ID | Piece | Change |
|---|---|---|
| FLW-01 | **Scope id** | `ExecutionEngine` owns one hierarchical id. A root scope opens per step (`frame_N`) and per outer entry (`call_N`); a child scope opens per Sequence output (`/sK`, from a `branches` declaration on the node) and per loop iteration (`/iK`, `ExecutionEngine.iterate()` called by FOR, ForEach and WHILE). `graph/function` `call` opens a child scope (`/fK`). `options.action_call` is the scope id, kept as an alias |
| FLW-02 | **Volatile pure** | `pure: "volatile"` makes a node memoize per scope: every consumer in a scope shares the value, and a new scope gets a new one. `pure: true` (deterministic) memoizes by data version only, across calls |
| FLW-03 | **`refresh` input** | An optional ACTION input (offered by the node menu on ON_REQUEST nodes) that invalidates the memo and re-runs the node, restamping its outputs. This is "use execution to regenerate" |
| FLW-04 | **Property version** | `_props_version`, bumped by `setProperty` and widget changes, is part of the memo key |

**The memo key:**
- deterministic: `{stamp, props}`;
- volatile: `{scope, stamp, props}`.

**`checkExecution`** gains FLW-14: a warning when a volatile node feeds a loop's count or collection input (the UE ForEach pitfall).

**Compatibility:**
- `legacy` keeps today's paths, and the goldens must not change.
- Under `ancestors`, results change only for volatile nodes (newly declared) and for property edits within a call. Both are fixes.

## Prior art

- **UE:** pure nodes keep no cache, and a pure array source feeding ForEach costs about two runs per iteration ([analysis](https://raharuu.github.io/unreal/blueprint-pure-functions-complicated/), [pitfall](https://celdevs.com/unreal-engine-and-the-hidden-pitfalls-of-blueprints/)).
- **Houdini:** dirty flags and time-dependent nodes ([badges](https://www.sidefx.com/docs/houdini/network/badges.html)). This is the model for `volatile`, plus a badge.
- **ComfyUI:** `IS_CHANGED`/`fingerprint_inputs` returning NaN means always rerun ([V3](https://docs.comfy.org/custom-nodes/v3_migration)). This is the model for a per-node fingerprint (FLW-17), which is later work.
- **vvvv:** the Cache region re-runs only when its inputs change ([gray book](https://thegraybook.vvvv.org/)).

## Open questions

- **Which nodes are volatile:** the [audit](../../audits/2026-11-22-event-flows-audit.md#2-the-registry-293-types-loaded) lists the candidates. `objects/get_property` reads an object that may be mutated: should it be volatile, or should mutators restamp it? Proposed: mutators (`objects/set_property`, `basic/set_array`) restamp the object's link.
- **Under `step` and `strict`:** do loops open child scopes too? Proposed: yes; the scope is model-independent, only `legacy` ignores it.
- **The `branches` declaration:** Sequence only, or also Switch, IF and `waitAll` outputs?
- **Showing the scope:** should `execution-state` carry the scope id, so that a trace (FLW-16) can group runs?

## Smallest experiment

A branch with only FLW-01 and FLW-02, `math/rand` declared volatile, and tests 1–3 and 7 from the [research note](../../memories/research/2026-11-22-call-scopes-and-pure-nodes.md#tests-that-would-prove-c). Measure the `runStep` time on `apps/editor/examples/benchmark.json` before and after.

## History

- 2026-11-22: created from the event flows audit probe. The user's position: ON_REQUEST, refreshing only when needed, is the usual want; use execution to regenerate otherwise.
