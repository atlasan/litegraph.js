# Call scopes and pure nodes: when should an on-request value be computed again?

> **Date** 2026-11-22 · **Kind** research · **Status** final · **Base** `LG/dev` @ `a5604d8`

**Question:** under the `ancestors` model, an ON_REQUEST (pure) node runs at most once per frame or call, unless one of its inputs has newer data. Is that the right rule against Unreal's "a pure node runs for every exec node that reads it"? And how should call ids be created: per execution line, a new one on purpose in Sequence, and a new one for every loop iteration?

**Method:**
- Read the engine (`src/execution.js`, `src/lgraphnode.js`, `src/lgraph.js`, `src/nodes/events.js`, `src/nodes/logic.js`, `src/subgraph.js`).
- Ran a probe in Node under `ancestors` (set-up below).
- Compared with the donors in the [execution flows landscape](../../ideas/landscape/execution-flows.md).
- **Not done:** no change to the code; no measurement of the cost of re-running.

**User's position (2026-11-22):** ON_REQUEST, refreshing data only when needed, is what we usually want. When it is not, use execution to regenerate or re-execute.

## Findings

### How call ids are made today

| Id | Made where | Used for | New per |
|---|---|---|---|
| Engine scope `ExecutionEngine._call` | `runStep` sets `frame_N` (`src/lgraph.js:679`); `_dispatchEvent` sets `call_N` at an outer entry (`src/lgraphnode.js:1063`); nested dispatches keep the outer one | The memo: `isFresh` compares the memo's frame or call with the current one (`src/execution.js:156-163`) | step, outer event (a button click, a network message, a timer) |
| `options.action_call` | `doExecute` (`src/lgraphnode.js:1012`), `triggerSlot` (`src/execution.js:242-247`); Sequence makes one per output with a `Math.random` suffix (`src/nodes/events.js:95-97`) | Only the legacy dedupe flags (`ensureUniqueExecutionAndActionCall`, `src/lgraphnode.js:1019`, `:1121`) | trigger, Sequence output |

So **an execution line keeps its scope**: a chain of actions shares one `call_N`. This matches "a line execution has the same id". But **Sequence outputs and loop iterations do not open a new scope**. The id that Sequence makes "on purpose" is the legacy one, which the memo never reads.

`graph/function` runs its inner step in the caller's scope (`src/subgraph.js:1645-1663`); its inner nodes are refreshed only through the new stamps on the pushed inputs.

### What the probe showed

**The set-up:** a fresh `LGraph` set to `ancestors`, with these test node types:
- a source with an EVENT output;
- a sink with an ACTION input and three number inputs that records their values on each action;
- a random node (`Math.random` in `onExecute`) and `math/rand`, both set to ON_REQUEST;
- `basic/const` (5) → `math/operation` (`+1`, ON_REQUEST).

Cases: FOR with start 0 and count 3; Sequence with two outputs; `setProperty` between calls and within one call.

| Case | Result | Why |
|---|---|---|
| FOR: body reads `index × 10` | 0, 10, 20 | `setOutputData(index)` restamps the link (`src/execution.js:134`) |
| FOR: body reads a constant `+1` | 6, 6, 6; computed once | deterministic: correct and cheap |
| FOR: body reads ON_REQUEST random | the same value three times; computed once | same scope, no newer input stamp |
| Sequence: both outputs read the same random | the same value | Sequence's `action_call` is not the scope |
| `setProperty(B)` between two calls or two steps | re-runs | a new `call_N`/`frame_N` |
| `setProperty(B)` inside one call (read, edit, read) | does not re-run | the memo has no property version |

### Options

| | A. Shared per call (today) | B. Unreal: per consuming exec node | C. Scoped and versioned (proposed) |
|---|---|---|---|
| Rule | Once per frame or call; again only on a newer input stamp | No cache: run again for each exec node that reads it, once per that node's gather | **Deterministic pure:** again only when an input stamp or its own property version changes, across calls too. **Volatile pure:** once per *scope*, shared by every consumer in it. **Explicit:** a `refresh` action re-runs it |
| Scope | frame or outer call | each exec node | hierarchical: `call_12` → `call_12/s1` (Sequence output 1) → `call_12/s1/i3` (loop iteration 3) |
| Deterministic nodes | correct, cheap | correct, repeated work (UE ForEach: 21 calls for 6 elements) | correct, cheapest (no re-run across calls when nothing changed) |
| Random and time nodes | stale in loops and branches, so they must stay ALWAYS | fresh, but **two consumers of one random in one step can disagree** (a known UE pitfall) | fresh per iteration and branch; consumers in one scope agree |
| State-reading nodes (objects, variables) | stale inside a call | fresh | fresh per scope if declared `volatile`; otherwise needs `refresh` |
| Property and widget edits | seen only at the next call | seen | seen at once (property version) |
| Determinism and debugging | high | low (evaluation count depends on wiring) | high (a value is tied to a scope id you can show) |
| Cost | lowest | highest | low; volatile nodes cost one run per scope |
| Compatibility | — | breaks ancestors results; legacy unchanged | changes only the volatile cases and in-call property edits under `ancestors`; legacy unchanged |

**Recommendation: C.** It keeps the user's "refresh only on need" for everything deterministic, makes the needed cases explicit (`volatile`, `refresh`), and gives call ids one meaning:
- **One id per execution line**, inherited by every node on the line.
- **A new child scope on purpose** for each Sequence output and each loop iteration.
- **A new root scope** for each outer entry and each step.

`options.action_call` becomes an alias of the scope id, so the legacy dedupe keeps working.

### Tests that would prove C
1. FOR ×3 with an ON_REQUEST `volatile` random read by two consumers in the body: three different values across iterations, and equal values within an iteration.
2. Sequence with two outputs reading one `volatile` node: different values per output; one run per output.
3. A deterministic pure node read in five consecutive steps with unchanged inputs: one run in total.
4. `setProperty` inside one call: the next read in the same call re-runs.
5. The `refresh` action re-runs the node and restamps its outputs; downstream pure nodes follow.
6. `graph/function` called twice in one call: its inner volatile nodes run once per call (each call opens a child scope).
7. Every `legacy` golden snapshot (`test/execution-golden.test.js`) is unchanged.

## Consequences for this fork

- **Ideas:** [FLW-01](../../ideas/cards/FLW-01-call-scopes-and-pure-semantics.md) (scopes), FLW-02 (volatile), FLW-03 (`refresh` input), FLW-04 (property version), FLW-14 (loop lint) in the [catalog](../../ideas/catalog.md).
- **Declarations to add with it:** `volatile` on `math/rand`, `basic/time`, `math/formula`, `objects/evaluate`, `basic/variable`, `widget/*`, `input/gamepad`, `audio/analyser` and the time-driven texture nodes ([audit §2](../../audits/2026-11-22-event-flows-audit.md#2-the-registry-293-types-loaded)).
- **A new decision record** (`0003`) would extend [decision 0002](../decisions/0002-execution-models.md) when this is promoted.
