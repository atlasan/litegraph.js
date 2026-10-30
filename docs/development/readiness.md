# Library, core, tools, and runner readiness

Goal: have the full library, core, tester, and runner working well enough to use and develop confidently. A green focused suite is evidence for the paths it covers, not completion of this goal. Branch: `codex/litegraph-study-stabilization`, based on verified origin/master `f7f0c4a`.

## Verified foundation

- Repository/history/upstream/fork investigation and branch rationale are recorded in [the study](2026-10-30-study.md).
- Twelve ESM/CommonJS artifacts build, parse, initialize, and package correctly; package entry points work.
- Registration preserves inherited overrides; connected execution, limits, ON_REQUEST ancestor refresh, deferred actions, event-cycle guards, repeated steps, exception recovery, and nested data/event serialization have fixtures.
- Node dependencies and hooks initialize once; graph/worker/tester await readiness and report initialization failures.
- Runner open/start/stop/update/sync/stop-all/unload/reopen is acknowledged by the worker, with path confinement and shutdown checks. Loopback tests verify WebSocket client/server teardown and restart, UDP reception/closure, retry cancellation, and separate Socket.IO client/server constructors.
- Tester starts in the browser, generates selected scenarios, awaits initialization, injects real inputs, times out asynchronous tests, and reports validation/cleanup errors.
- Latest complete local gate: 55 core tests, 22 integration tests, 12 distribution artifacts. Browser `math/abs`: 4/4 scenarios.

## Remaining acceptance work

| Area | Required evidence before calling it ready |
| --- | --- |
| Core execution | The named regression fixtures now pass; preserve these invariants in the developer gate. |
| Resource lifecycle | Cleanup continues across throwing callbacks and retry timers are canceled. Awaitable cleanup and worker replacement/acknowledgment barriers now pass generic and immediate-port-rebind tests. Remaining: loading/removal races and connection-callback failures during removal. |
| Built-in nodes | Catalog runtime/dependency requirements; focused pure-node checks and loopback network fixtures; clearly identify native/browser hardware requirements and surface unsupported use. |
| Canvas/editor | Add/connect/edit/delete, serialize/reload, subgraph navigation and representative widgets/HTML nodes verified in the browser; no new console errors. |
| Tester | Review legacy custom scenarios, stress/performance modes, cancellation semantics, result/coverage accuracy, export escaping, and visible progress/status controls. |
| Runner UX | Empty/loading/error states, reconnect behavior, edit/apply/sync clarity, and state after worker failure; verify resource-bearing graph lifecycle. |
| Developer API | Type declarations compile for supported ESM/CJS examples and reflect current APIs; version metadata policy documented; setup works from the lockfile. |
| Maintenance gate | Complete: zero ESLint errors; lint errors are enforced by `npm run check`/CI. Style warnings remain visible through `npm run lint`; no blanket rule suppression was added. |

## Scope boundaries

The runner is a local trusted-workflow development tool. Public authentication/hosting and sandboxing arbitrary graph code are separate product requirements. Hardware-dependent GPU/audio/MIDI behavior needs appropriate devices; a missing device should be distinguished from a library defect. Arbitrary user JavaScript cannot be forcibly canceled in the current in-page tester. These boundaries must be visible in usage documentation, not hidden by generic pass counts.

Continue with developer API/lint gates, remaining lifecycle edge cases, and browser/tool UX validation. Update this checklist with concrete evidence as each area is completed.
