# Library, core, tools, and runner readiness

Goal: have the full library, core, tester, and runner working well enough to use and develop confidently. A green focused suite is evidence for the paths it covers, not completion of this goal. Branch: `codex/litegraph-study-stabilization`, based on verified origin/master `f7f0c4a`.

## Verified foundation

- Repository/history/upstream/fork investigation and branch rationale are recorded in [the study](2026-10-30-study.md).
- Twelve ESM/CommonJS artifacts build, parse, initialize, and package correctly; package entry points work.
- Registration preserves inherited overrides; connected execution, limits and serialization have fixtures.
- Node dependencies and hooks initialize once; graph/worker/tester await readiness and report initialization failures.
- Runner open/start/stop/update/sync/stop-all/unload/reopen is acknowledged by the worker, with path confinement and shutdown checks.
- Tester starts in the browser, generates selected scenarios, awaits initialization, injects real inputs, times out asynchronous tests, and reports validation/cleanup errors.
- Latest complete local gate: 28 core tests, 17 integration tests, 12 distribution artifacts. Browser `math/abs`: 4/4 scenarios.

## Remaining acceptance work

| Area | Required evidence before calling it ready |
| --- | --- |
| Core execution | ON_REQUEST/ancestor refresh, action ordering/deferred actions, repeated steps, nested subgraphs and exception recovery fixtures. |
| Resource lifecycle | Throwing stop/removal callbacks cannot prevent cleanup of other nodes; loading/removal races and retry timers do not leave live resources. |
| Built-in nodes | Catalog runtime/dependency requirements; focused pure-node checks and loopback network fixtures; clearly identify native/browser hardware requirements and surface unsupported use. |
| Canvas/editor | Add/connect/edit/delete, serialize/reload, subgraph navigation and representative widgets/HTML nodes verified in the browser; no new console errors. |
| Tester | Review legacy custom scenarios, stress/performance modes, cancellation semantics, result/coverage accuracy, export escaping, and visible progress/status controls. |
| Runner UX | Empty/loading/error states, reconnect behavior, edit/apply/sync clarity, and state after worker failure; verify resource-bearing graph lifecycle. |
| Developer API | Type declarations compile for supported ESM/CJS examples and reflect current APIs; version metadata policy documented; setup works from the lockfile. |
| Maintenance gate | Resolve lint errors with focused fixes, document warning policy, and retain useful CI checks without blanket suppressions. |

## Scope boundaries

The runner is a local trusted-workflow development tool. Public authentication/hosting and sandboxing arbitrary graph code are separate product requirements. Hardware-dependent GPU/audio/MIDI behavior needs appropriate devices; a missing device should be distinguished from a library defect. Arbitrary user JavaScript cannot be forcibly canceled in the current in-page tester. These boundaries must be visible in usage documentation, not hidden by generic pass counts.

Continue with core action/subgraph and resource lifecycle regression fixtures, then the corresponding fixes. Update this checklist with concrete evidence as each area is completed.
