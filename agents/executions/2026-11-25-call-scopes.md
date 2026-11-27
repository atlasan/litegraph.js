# Call scopes and pure semantics (flows step 4)

> **Date** 2026-11-25 (finished 2026-11-27) · **Kind** execution · **Status** final · **Base** `LG/dev` @ `a1eb082` · **Plan** [call scopes](../plans/2026-11-25-call-scopes.md)

Tier 1 step 2 of the [next priorities](../plans/2026-11-25-next-priorities-after-0.18.0-dev.2.md) (D-4, DEC-5), on `LG/dev_flows_call_scopes`. Outside `legacy`, every run now belongs to a hierarchical call scope:
- a root per frame and per outer event;
- a child per Sequence output, loop iteration and `graph/function` call.

What changed in the memo:
- Volatile (`pure: "volatile"`) and undeclared ON_REQUEST nodes give fresh values per scope.
- Deterministic pure nodes keep their value until their data, properties or graph change.
- `setProperty` is seen within a call.
- `options.action_call` is the scope id.

FLW-03 (refresh input) and FLW-14 (`volatile-loop-input`) are in. `legacy` and its golden snapshots are unchanged. [Decision 0009](../memories/decisions/0009-call-scopes.md) records the semantics.

## Changes

- `0017f54` `docs:` the plan record, with the design choices and the recommendation taken for each.
- `6b1ffde` `test:` `test/call-scopes.test.js`: audit findings 1–4 and research tests 1–6 (26 tests across `ancestors`, `step` and `event`, plus one `legacy` test). On the base, 24 failed for the expected reasons; the rewiring and `legacy` tests passed, and are kept as guards. Research test 7 is `test/execution-golden.test.js`, unchanged.
- `50b58fd` `feat:` the implementation.
  - **`src/execution.js`:** scope objects (`_scope`, `scopeId`, `openRoot`, `scopeFor`, `inScope`, `iterate`).
  - **The memo** (`isFresh`, `remember`) has these keys: input stamp, `_props_version`, `graph._version`, then the scope object or, for deterministic nodes, the property values (`sameValues`).
  - **Refresh:** `touch`, `isRefreshInput`, `offersRefresh`, `addRefreshInput`, `refresh`.
  - **Delivery:** `triggerSlot` → `deliver`, with branch scopes and the refresh intercept.
  - **Declarations:** `pure: "volatile"`, `volatile` and `branches`.
  - **`check`:** `pure-always` skips volatile nodes, and the new `volatile-loop-input` code (`volatileSource`) is added. `modelModes` keeps a volatile node that is saved ALWAYS.
  - **`lgraph.js` `runStep`** and **`lgraphnode.js` `_dispatchEvent`** open the root scopes. `doExecute` and `actionDo` use the scope id as `action_call` outside `legacy`, and `actionDo` handles refresh inputs. `setProperty` bumps the property version.
  - **Nodes:** Sequence (`branches`; its `legacy` path keeps the `Math.random` ids), FOR, ForEach and WHILE (`iterate`; WHILE evaluates its condition in the iteration's scope), logic/IF (its step turn is told by `graph._step_node` outside `legacy`), and `NodeFunction.call` (`<id>.fK`).
  - **Volatile declarations:** `math/rand`, `math/formula`, `basic/time`.
  - **Editor:** the Inputs menu offers "Refresh" for ON_REQUEST nodes.
  - **Supporting files:** `litegraph.d.cts`; `tools/node-reference.mjs` (shows `volatile` and `branches`).
  - **Updated tests:** declarations, node definitions, and A5 (it now uses a declared pure type for the "runs once" assertion and checks that an undeclared one runs per iteration).
  - **Example `random-console`:** Rand ALWAYS, plus its text and the seeded snapshot.
- `efe65a7` `docs:` the guide (Execution: the ancestors frame, call scopes, property edits, the refresh input, declarations, loops), `CHANGES.md` (Unreleased: Added, Changed, Fixed), the roadmap, the codebase map, decision 0009, the catalog and the FLW-01 card (promoted), and audit findings 1–4 (fixed).
- `0d4454a` `build:` regenerated distributions.
- `b708c45` `perf:` `ensureFresh` records the memo once, since `doExecute` already does.
- `cc2a532` `build:` regenerated distributions.

## Verification

| Check | Result |
|---|---|
| New tests on the base (`a1eb082` + tests) | 24 of 26 fail as expected (one value per call in loops and branches, in-call edits not seen, Math.random and uuid ids, no refresh API, no lint) |
| `bun run check` @ `cc2a532` | pass: lint, 12 builds, types, Jest 1043/1043 (61 suites; legacy goldens unchanged), integration 160/160 (examples 39/39), package check |
| Local CI | `Local-CI: pass cc2a532 node22.23.5 jest 1043/1043 int 160/160 fresh ok` (report `.lg/ci/runs/cc2a532-20261127T083806Z/report.md`); an earlier run passed on `0d4454a` |
| Benchmark (`src/`, Node 22, 300 steps, 7 rounds, 5 interleaved base/head runs; median of medians; machine shared with parallel sessions) | `benchmark.json` `ancestors`: 113.4 → 68.5 µs/step (−40%: pure nodes no longer re-run every frame). `legacy`: 111.6 → 110.6 (−1%). Stress: a 900-node pure ON_REQUEST chain restamped every frame: `math/operation` best min 3078 → 3188 (+3.6%), `math/bypass` 2864 → 2864. Before the `perf:` commit the chain was +8–16% |
| Browser | not run; the Inputs menu "Refresh" entry and the example were checked only through Jest and the examples test |

## Notes

- **Design choices** (all from the plan's recommendations): scope objects, so that two openings never share a memo. Undeclared ON_REQUEST nodes are per scope, because only `pure: true` promises determinism. Scopes apply in every model but `legacy`. `branches` is on Sequence only. Mutators restamping objects comes later.
- **Changed during implementation:**
  - `basic/variable` is not declared volatile: with its input connected it writes, and the `check-frame-value` example uses it ON_TRIGGER as a setter.
  - Deterministic memos compare the property values, because a direct `node.properties.x = …` write (the B15 DataStore test, and host code) would otherwise be missed across calls.
  - A volatile node saved ALWAYS keeps its mode.
- **`random-console`:** its text promised that Watch and Console show the compared value, but an ON_REQUEST Rand now gives each Sequence output a new value. Rand is now ALWAYS, as the text now says.
- **Seeded snapshots:** triggers outside `legacy` no longer call `uuidv4` (which draws `Math.random`). Seeded snapshots of non-legacy runs can therefore shift; only `random-console` did.
- **Internal API:** `ExecutionEngine._call` is gone; use `ExecutionEngine.scopeId`.

## Left open

- Declare the remaining volatile readers (`widget/*`, `input/gamepad`, `audio/analyser`, texture and object readers) after a browser check.
- Mutators restamping objects (`objects/set_property`, `basic/set_array`).
- `branches` on Switch or `waitAll`.
- The scope id in `execution-state` (FLW-16).
- A browser pass of the Refresh menu entry.
- Flows steps 5–7 stay proposed.
