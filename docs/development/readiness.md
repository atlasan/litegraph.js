# Library, core, tools, and runner readiness

Goal: have the full library, core, tester, and runner working well enough to use and develop confidently. A green focused suite is evidence for the paths it covers, not completion of this goal. Branch: `codex/litegraph-study-stabilization`, based on verified origin/master `f7f0c4a`.

## Verified foundation

- Repository/history/upstream/fork investigation and branch rationale are recorded in [the study](2026-10-30-study.md).
- Twelve ESM/CommonJS artifacts build, parse, initialize, and package correctly; main/core/Node package entry points work. Strict ESM/CommonJS consumer fixtures compile against isolated published declarations and verify runtime export parity.
- Registration preserves inherited overrides; connected execution, limits, ON_REQUEST ancestor refresh, deferred actions, event-cycle guards, repeated steps, exception recovery, and nested data/event serialization have fixtures.
- Node dependencies and hooks initialize once; graph/worker/tester await readiness and report initialization failures.
- Runner open/start/stop/update/sync/stop-all/unload/reopen is acknowledged by the worker, with path confinement and shutdown checks. Loopback tests verify WebSocket client/server teardown and restart, UDP reception/closure, retry cancellation, and separate Socket.IO client/server constructors.
- Tester starts in the browser, generates selected scenarios, awaits initialization, injects real inputs, times out asynchronous tests, and reports validation/cleanup errors.
- Latest complete local gate: 71 core/DOM tests, 32 integration tests, strict TypeScript consumers/export parity, zero lint errors, and 12 distribution artifacts. Browser `math/abs`: 4/4 scenarios with visible progress and 0.4% executed-node coverage.

## Remaining acceptance work

| Area | Required evidence before calling it ready |
| --- | --- |
| Core execution | The named regression fixtures now pass; preserve these invariants in the developer gate. |
| Resource lifecycle | Cleanup continues across throwing callbacks and retry timers are canceled. Awaitable cleanup and worker replacement/acknowledgment barriers now pass generic and immediate-port-rebind tests. Loading-node removal/movement, detached dependency failures, clear during startup, connection-callback failures, multi-target disconnection, and reentrant node removal now have passing fixtures. |
| Built-in nodes | Catalog runtime/dependency requirements; focused pure-node checks and loopback network fixtures; clearly identify native/browser hardware requirements and surface unsupported use. |
| Canvas/editor | Browser add/connect/edit/step/delete/save/reload, subgraph entry/return, and slider/toggle/text widgets passed on 2026-10-31 without captured console errors. HTML property editing/deletion/save/reload passed on 2026-11-01; DOM fixtures cover overlay removal/reinsertion, handler disposal, nested visibility, and scaling. Broader optional-node interactions remain outside this acceptance sample. |
| Tester | Cancellation now reaches all active cases, waits for bounded cleanup, and reports canceled cases as skipped. Legacy cases use private graphs and await readiness; missing expected exceptions fail. Current-run coverage, HTML/CSV/XML escaping, JSON maps, and visible progress have regressions. Stress/performance contracts, retries, and wider node-specific scenarios remain to review. |
| Runner UX | Empty/loading/acknowledgment states and disabled disconnected controls verified in browser. Reconnect refreshes inventory without replaying edits; transport fixtures cover matching replies and timeouts. Resource-bearing worker replacement and immediate port reuse already pass. Full edit/apply/sync and worker-crash browser workflows remain to verify. |
| Developer API | Strict TypeScript 5.4.5 ESM/CJS graph, readiness, callback, and library examples pass against workspace and isolated published declarations. Main/core/Node value exports match runtime; version policy is documented. Setup was validated from the lockfile; optional native bindings remain separate. Legacy signatures outside these fixtures are not exhaustively audited. |
| Maintenance gate | Complete: zero ESLint errors; lint errors are enforced by `npm run check`/CI. Style warnings remain visible through `npm run lint`; no blanket rule suppression was added. |

## Scope boundaries

The runner is a local trusted-workflow development tool. Public authentication/hosting and sandboxing arbitrary graph code are separate product requirements. Hardware-dependent GPU/audio/MIDI behavior needs appropriate devices; a missing device should be distinguished from a library defect. Arbitrary user JavaScript cannot be forcibly canceled in the current in-page tester. These boundaries must be visible in usage documentation, not hidden by generic pass counts.

Continue with node runtime requirements, tester stress/performance contracts, and the remaining runner browser workflows. Update this checklist with concrete evidence as each area is completed.
