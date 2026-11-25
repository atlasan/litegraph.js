# Fresh priorities after the capability and backlog review

> **Date** 2026-11-25 · **Kind** plan · **Status** proposed · **Base** `LG/dev` @ `a14c29a`

Propose the next work from the current implementation rather than old wishlist maturity. The user requested a complete recheck/collection and fresh priorities, then asked to finish it. This record proposes implementation; it does not authorize it or promote an entire new wave.

## Context

The [audit](../audits/2026-11-25-capabilities-and-gaps.md), [complete inventory](../audits/2026-11-25-idea-inventory.md) and [machine-readable snapshot](../audits/2026-11-25-capability-inventory.json) collect **276 ideas**, **15 cards**, **273 shipped node types**, **27 registered manifests / 25 node-bearing packs**, and remaining gaps. Eleven older uncatalogued wishes are now indexed; original maturity is preserved for the other 265.

The [codebase map](../memories/codebase/README.md) and owning source show a completed authoring/runtime foundation and a released `0.18.0-dev.2`. The priority changes are driven by a reproduced stale-property read, sparse pack metadata (86 execution declarations, 9 usage texts, zero static slot declarations or templates), and the user's example/pack-creation direction. External ecosystem/licence claims remain historical; reverify them before adopting dependencies or donor code.

## Scope

- In: consolidate delivered/partial/candidate work; rank narrow follow-ups by observed user impact, correctness, reuse, evidence and dependencies; define acceptance before implementation.
- Outside this proposal: implementation, dependency upgrades, publication, remote settings, automatic scheduling, a new renderer/runtime, or a commitment to every catalog entry.
- `T1`–`T10` are proposal groups used by the complete inventory, not wave numbers or dates. They do not replace current roadmap decisions.

## Recommended priorities [I]

| Order | Group | First useful slice | Why here / acceptance |
|---|---|---|---|
| 1 | **T1 — execution correctness** | Property/widget invalidation and scope characterization, then hierarchical call/branch/iteration scopes, volatile semantics and explicit refresh (FLW-01–04, FLW-14) | Current source reproduces `[1,1]` after a property becomes `2`. Read/edit/read must give `[1,2]`; two consumers share a value per scope, new iterations/branches refresh volatile values, legacy goldens stay fixed. Measure current performance first (DEV-02) |
| 2 | **T2 — confidence in real UI and cleanup** | Repeatable built-editor smoke fixtures, then a small stable visual set (USE-09, DEV-03); targeted race/cleanup checks | Canvas behaviour is otherwise mostly unit/stub/manual evidence. Exercise open/edit/connect/undo, groups/space, subgraph round-trip and dispose in a browser. Keep the runner local; add checks through local CI only. Collect DEV-07/08 docs/tester leftovers as small follow-ups |
| 3 | **T3 — pack creators and discoverable examples** | Add author metadata and a real template for Basic/events, fit example views (HMD-08), link explanations from features/packs; extend the existing starter generator and guides (HMD-01–07, FLW-28, CFY-43, DEV-06) | Builds on the user's strongest direction and measured gaps. Preview common types without constructing them, open one pack recipe with steps/expected output, and visibly cover additions to a pack. Keep metadata suggestions explicit; prove editing/export/undo before write-back or generated-graph reconciliation |
| 4 | **T4 — lifecycle and custom events** | Start/tick/stop sources, named event entry/call and documented lookup/cleanup; add dispatchers after that (FLW-05/06, FLW-20) | Broadly useful for games, apps, education and devices; depends on T1's call semantics. Start/stop/restart and nested graphs must not duplicate handlers; missing names and errors are observable |
| 5 | **T5 — minimal document profiles** | A saved choice over existing execution models, allowed UI/palette defaults and templates (FLW-08/24, remaining FLW-07) | Example labels already exist but there is no profile API. Profile switch is one undo step, old documents remain unchanged, unknown profiles have a defined fallback, and save/load/runner parity holds. Advanced cook/signal-rate engines are separate |
| 6 | **T6 — configurable, accessible everyday authoring** | Settings import/export UI and property presets (X-11/12), mixed-value inspector (X-14), keyboard/ARIA traversal (X-08); then touch, theme and larger panel layouts | Existing settings/value-type/panel APIs make bounded improvements possible. Round-trip a settings profile; edit common properties of a selection in one undo step; reach and identify nodes/slots without a pointer. Current side docking stays the foundation for X-13 |
| 7 | **T7 — bounded loading and runner contracts** | Shared structural validation/limits (X-04, USE-23/35), then `/features`/health and a versioned run contract (X-01/X-10, CFY-32/33) | This is preparation for broader use, not a claim of a new security failure. Preserve Host/Origin/recursive policy/script defaults; reject malformed/deep/oversized graphs consistently, bound runaway workers, and document run/session identity and authentication before expanded exposure |
| 8 | **T8 — reusable pack/host interfaces** | Settle metadata/schema and host-service contracts, then one narrow schema-to-pack adapter (X-05, JS-19; X-02/03/06 and related entries) | Metadata and starter-workflow work should establish real requirements first. One reference pack must load in editor and runner with type/default/validation parity. SVG assets, resource pickers, slot/widget conversion (X-19) and code/export adapters each need their own bounded slice |
| 9 | **T9 — trace before breakpoint machinery** | Use the existing dispatch tap and execution state for a bounded node/path/scope trace (USE-34/42, FLW-16); write the missing debugger card | Make execution explainable before changing pause/resume semantics. A trace has bounded memory and reports nested scopes/errors with listeners disposed; any true pause engine follows its own design decision |
| 10 | **T10 — select a domain experiment** | Choose one: headless 3D interactivity probe (3D-01–04), runtime-neutral durable process proof (BUN-01–16), or a narrow data/device/MCP adapter | These solve different user problems. Each needs a real target user, protocol/host assumptions, provenance recheck and one end-to-end example. Existing Bun app support is already delivered and is not a durable scheduler |

Groups are ordered for a balanced library/editor direction. T2's baseline measurement and T3's fit/metadata slice can be developed independently of T1; engine declarations involving volatility must wait for T1. Accessibility is a cross-cutting acceptance criterion for new UI, not something to omit until every earlier group is finished.

## Concrete next proposals to accept

| Proposal | Bounded scope | Completion evidence |
|---|---|---|
| **A. Scoped freshness** (recommended first) | Reproduce/property invalidation, establish scope boundaries, then explicit volatile/refresh semantics. Preserve the user's “refresh only on need” direction | Regression fixtures for property edits, shared consumers, loop/Sequence/function scopes; old-mode goldens; measured before/after benchmark; docs and migration/error semantics |
| **B. Author-ready Basic/events packs** (visible companion) | Fit on example load; usage and static slots for representative common nodes; one template per selected pack; link a guide from the pack UI. No automatic wiring or edits to an existing starter | Zero-constructor metadata preview, real pack template in Demo, readable on narrow viewport, fresh node-reference metadata, one-step insert/undo, a test for adding one type |
| **C. Reproducible editor acceptance** | Small deterministic browser fixture set for the already delivered authoring features; retain targeted lifecycle/runner fixtures | Clean-clone local CI produces browser evidence and an unambiguous pass/fail report; first baselines reviewed before enabling regressions |

Choose A for correctness, B for immediate creator/user value, and C to make the UI changes repeatably verifiable. The default recommendation is **A, with C's baseline established before engine changes, then B**. Further implementation still needs deliberate promotion; this request only asked for a fresh proposal.

## Dependencies and open decisions

- Break the FLW-05 ↔ FLW-08 card cycle: lifecycle nodes do not require a profile API; a minimal profile uses current models and need not promise lifecycle nodes or a new cook engine.
- Scope/property versions precede volatility declarations, function/map semantics, trace scope grouping and a durable run design. Keep mode constants and ADR 0004 numbering; old wording saying ON_REQUEST is mode 4 is historical.
- D3/D4: clarify provenance/porting and node-metadata direction before any large generator or external donor port. Avoid constructing arbitrary third-party nodes merely to discover their schema.
- D8: uniform handled/async/per-node event rules remain explicit API decisions. Neither a new trace nor a dispatcher implicitly accepts async hooks.
- D9: choose generated node-reference publication/freshness only when its content is settled. Do not quietly add it to CI against the existing postponement.
- Runner before broader exposure: settle run versus live-session identity, limits, authentication and capabilities without weakening current guards. Capability tags are not sandbox grants.
- Cross-OS launcher/local-CI acceptance remains a validation gap; the recorded Bun top-level-await test difference is advisory, not proof of complete parity.

## Keep deferred [I]

Renderer/TypeScript/bundler migrations without a demonstrated need; collaboration/CRDT history; distributed execution; a remote pack marketplace/install system (X-21); virtual links (X-20); automatic publishing; large shader/3D/AI catalog expansions; dynamic graph reconciliation and broad SVG/schema/asset services. JS-31 stays parked. Host application mode and tabs (CFY-37, X-15) wait for a concrete document/product workflow. These stay searchable in the inventory, not silently dropped.

## Validation of this review

- Collected all 276 unique IDs, all 15 cards and all 12 landscape files; all ideas have a delivery assessment and proposal grouping. The JSON also preserves original fields and all 273 node records.
- Recounted maturity and delivery categories from the data; checked local Markdown file targets, catalog-to-card coverage and missing-ID references. New backlog rows are `sketched`, not promoted.
- Ran source/bundle metadata and stale-property probes described by the audit; used existing release local-CI proof as historical evidence only. No new full gate or browser run is claimed.
- Changes are documentation/data only. Leave the work on `LG/dev_priorities_refresh` for review. If later merged into `LG/dev`, first commit, run `npm run ci:local -- <commit>`, then include its actual `Local-CI:` summary in the merge/execution record. Do not post reports, push notes or switch GitHub CI under this proposal.

## History

- 2026-11-25: proposed after repository-wide inventory, capability measurements and source/record reconciliation; user asked to finish the review and proposal.
