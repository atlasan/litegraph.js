# Remaining platform gaps collected from earlier records

> **Updated** 2026-11-25 · **Kind** idea area · **Status** living · **Base** `LG/dev` @ `a14c29a`

The [fresh inventory audit](../../audits/2026-11-25-capabilities-and-gaps.md) found eleven existing wishes in plans/executions/the roadmap that had no dedicated catalog row. These sketches collect that backlog; they do not accept implementation or revive ideas explicitly dropped in the improvements ledger.

| ID | Consideration and smallest useful outcome | Owning evidence |
|---|---|---|
| HMD-08 | Fit or restore the viewport when opening an example; opt-out for hosts and preserve intentional saved views. Show a wide lesson fully on a narrow canvas. | [Examples follow-ups](../../executions/2026-11-23-editor-examples.md#left-open), `apps/editor/js/code.js` |
| X-14 | Inspector sections for multiple selected nodes, groups and reroutes. Start with shared properties and one transaction; distinguish mixed values. | [Panel follow-ups](../../plans/2026-11-22-panels-options-node-details.md#out-of-scope-follow-ups) |
| X-15 | Document tabs/workspace: graph identity, dirty state and draft ownership per tab; switching must dispose or retain resources explicitly. | [Roadmap deferred list](../../plans/roadmap.md#deferred-each-needs-its-own-proposal) |
| X-16 | Higher-order `graph/map` and definition references as values. First prove per-item inputs, outputs, scope and cleanup using one saved definition. | [Subgraph later list](../../plans/2026-11-20-wave3-subgraph-system.md#11-later-ideas-not-in-this-wave) |
| X-17 | Live synchronization while editing linked subgraphs, beyond commit-on-leave. Characterize conflicts and undo before sharing mutations across instances. | [Subgraph later list](../../plans/2026-11-20-wave3-subgraph-system.md#11-later-ideas-not-in-this-wave) |
| X-18 | Optional subgraph IO rails as a different presentation of existing IO. Stable slot IDs and saved definitions remain authoritative. ComfyUI is a design reference only. | [Subgraph later list](../../plans/2026-11-20-wave3-subgraph-system.md#11-later-ideas-not-in-this-wave) |
| X-19 | Input-slot ↔ widget conversion from the UI, preserving type, fallback value, links and undo. Existing widget inputs are the foundation, not evidence that conversion is complete. | [Panel follow-ups](../../plans/2026-11-22-panels-options-node-details.md#out-of-scope-follow-ups), `src/lgraphnode.js` |
| X-20 | Virtual/broadcast links with an explicit name scope, diagnostics and portable serialization. Relate to custom events (FLW-06) without treating the concepts as interchangeable. | [Roadmap deferred list](../../plans/roadmap.md#deferred-each-needs-its-own-proposal) |
| X-21 | Remote pack discovery/registry, with provenance, compatibility and explicit install boundaries. Keep installed manifests separate from remote data. | [Roadmap deferred list](../../plans/roadmap.md#deferred-each-needs-its-own-proposal), `src/packs.js` |
| DEV-07 | Generate hook/event reference tables from declarations and add the promised compatibility deprecation diagnostics. Preserve documented error/order/veto semantics. | [Wave 7 leftovers](../../plans/roadmap.md#wave-7-event-integration-done-two-leftovers-open), `src/callbackhandler.js` |
| DEV-08 | Consolidate the tester's two run paths under one controller. Preserve cancellation, progress and cleanup; remove the unused path only after coverage proves equivalence. | [Wave 5c follow-up](../../plans/2026-11-21-wave5-repository-packaging.md), `apps/tester/js/app.js:564`, `apps/tester/js/ui-manager.js:396` |

Prioritization and dependencies are proposals **[I]** in the [priority refresh](../../plans/2026-11-25-priority-refresh.md). These rows remain `sketched` until deliberately promoted.
