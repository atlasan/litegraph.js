# Flows direction: from the event flows audit to a later wave

> **Date** 2026-11-22 · **Kind** plan · **Status** proposed; steps 1–3 promoted ([plan](2026-11-22-flows-reference-examples.md)) · **Base** `LG/dev` @ `9926717`

**Outcome, if accepted:** LiteGraph offers the main flow styles of node editors as named, documented and exemplified choices per document:
- event scripting (blueprint);
- dataflow (material);
- realtime (media);
- stepped;
- reactive;
- mixed (the default).

Every node is described in a generated reference, and every flow style has runnable examples.

**Why this is a proposal:**
- **The ideas rule:** ideas enter the [roadmap](roadmap.md) only by promotion.
- **What it collects:** this record turns the [event flows audit](../audits/2026-11-22-event-flows-audit.md), the [execution flows landscape](../ideas/landscape/execution-flows.md) and the FLW ideas into one candidate sequence.
- **Next step:** the user decides what to promote.

## Relation to Wave 7 (event integration)

The roadmap's proposed [Wave 7](roadmap.md#wave-7-event-integration-proposed) ([plan](2026-11-22-event-integration.md), [audit](../audits/2026-11-22-event-handling.md)) is about the **host** channels: legacy `onX`, CallbackHandler hooks and typed events on one listener engine. This proposal is about the **graph's** execution flows. The two touch in two places:
- **Dispatchers (step 5):** they should run on Wave 7's listener engine rather than a second registry.
- **`execution-state`, `event-dropped` and new flow events:** they are typed events, so they follow Wave 7's order and error policy (D8).

The proposed sequence therefore assumes that Wave 7 lands first, or at least its listener engine; steps 1 to 3 do not depend on it.

## What the user decided (2026-11-22)

- **Flow types reach users as graph profiles** ([FLW-08](../ideas/cards/FLW-08-graph-profiles.md)), not as bare models.
- **Order:** the node reference and examples first, so that new nodes land documented; then the engine features.
- **ON_REQUEST stays shared and refreshes only when needed.** Where that is not wanted, an execution regenerates the value. The analysis in the [research note](../memories/research/2026-11-22-call-scopes-and-pure-nodes.md) supports this, with scopes for loop iterations and Sequence branches, and `volatile` as the explicit exception.

## Candidate sequence

| # | Step | Promotes | Acceptance checks | Decisions needed |
|---|---|---|---|---|
| 1 | **Node reference:** `tools/node-reference.mjs` → `docs/nodes/` (README, a page per pack, `nodes.json`); a `description` on every builtin pack; `def.usage`; a catalog test that creates every type | FLW-23 (USE-06) | Catalog test passes; `check:fresh` covers `docs/nodes`; the pages are read by a reviewer | Commit the generated pages, or generate in CI only (proposed: commit) |
| 2 | **Declaration pass:** declare `pure`, `ticks` and the default modes for the undeclared types in the [audit §2](../audits/2026-11-22-event-flows-audit.md#2-the-registry-293-types-loaded) (244 of 293 today), pack by pack | (audit finding 5) | The goldens are unchanged under `legacy`; `checkExecution` is clean on the examples after "Apply the model's node modes" | — |
| 3 | **Examples library:** `apps/editor/examples/index.json` with categories and profiles; the Demo menu built from it; old URLs kept; an examples test | FLW-22 | Every non-`wip` example loads, checks and runs; the browser shows the grouped menu | Examples in the app only, or also in pack `templates[]` |
| 4 | **Call scopes and pure semantics:** one scope id; `volatile`; property version; a `refresh` input; loop lint | FLW-01 to FLW-04, FLW-14 | Tests 1–7 of the research note; `legacy` goldens unchanged; `runStep` time on the benchmark within 5% | The volatile list; mutators restamp objects; `branches` beyond Sequence; decision record 0003 |
| 5 | **Lifecycle and custom events** (after Wave 7's listener engine): `on_start`, `on_tick`, `on_stop`, `on_pause`/`on_resume`; `custom_event`, `call_event`, `dispatcher`, `bind_event`; "Assign"; `graph.triggerInput` through the engine | FLW-05, FLW-06 | Tests across a subgraph boundary; `event-dropped` `no-event`/`unbound`; a blueprint example in the browser | Name scope (proposed: root-wide, local first); handler order; `on_tick` under `event` |
| 6 | **Graph profiles and exec pins per document:** `registerGraphProfile`, `setProfile` (one undo step), the six built-in profiles, a profile-aware palette, New graph from a profile; media pack declarations | FLW-07, FLW-08, FLW-24 | Switching profile is one undo step; the palette filters; the runner runs a `realtime` and a `dataflow` example | Store the name or a snapshot (proposed: the name); subgraphs inherit |
| 7 | **Docs and examples per flow:** a guide chapter "Flows and profiles" with the Unreal mapping table; one general example per profile and a specific example per pack | — | Every example in the manifest names a profile; links checked | — |

**Later, as separate proposals:**
- hot and cold inputs (FLW-09);
- latent nodes (FLW-10);
- state machines and behaviour trees (FLW-11);
- signal rate (FLW-12);
- cook on demand (FLW-13);
- functions against macros (FLW-15);
- the flow debugger (FLW-16);
- the signature cache and lazy inputs (FLW-17, FLW-18);
- zones (FLW-19);
- Catch/Complete (FLW-20);
- automation (FLW-21);
- the KHR_interactivity import and export ([3D-01](../ideas/cards/3D-01-gltf-khr-interactivity.md)), which steps 4 and 5 make cheaper by using KHR names.

## Compatibility rules

These are the same as the [Wave 6 plan](2026-11-22-events-execution.md#compatibility-rules-bugs-aside):
- `legacy` documents behave as today, and the golden snapshots must not change.
- Every new restriction has a named setting to lift it, and its refusal names that setting.
- Mode 4 stays ON_REQUEST.

## Risks

- **The declaration pass is wide** (244 types). Do it pack by pack, with tests per pack, and keep the media packs' declarations conservative (`ticks` rather than `pure`) until they are tested in a browser.
- **Scope ids touch the hot path** (`triggerSlot`, `ensureFresh`). Measure them on `benchmark.json` before and after.
- **Profiles could grow into a second settings system.** Keep a profile to the model, the mode defaults, a few UI switches, and the palette lists; user settings stay with X-12.

## History

- 2026-11-22: proposed from the [event flows audit](../audits/2026-11-22-event-flows-audit.md). The user asked for audit, ideas and documentation before any implementation.
- 2026-11-22: steps 1–3 promoted to the [flows reference and examples plan](2026-11-22-flows-reference-examples.md) (flows track, branches `LG/dev_flows_*`, no wave number). Steps 4–7 stay proposed.
- 2026-11-22: steps 1–3 done in `LG/dev` (flows track records: reference, declarations, examples). Audit finding 10 fixed; findings 5, 11 and 12 addressed.
