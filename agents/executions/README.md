# Executions

What was done and how it was verified. Plans say what *will* happen; executions record what *did*. New records start from the [execution template](../_templates/execution.md).

## Index

| Date | Record | Status |
|---|---|---|
| 2026-11-22 | [Flows track, declarations](2026-11-22-flows-declarations.md): pure, ticks and ON_EVENT defaults for 36 more types (86 of 273), volatile types commented, host `actionDo` pulls under `ancestors` | final |
| 2026-11-22 | [Wave 7: event integration, the core](2026-11-22-wave7-event-core.md): one listener core for hooks and typed events, compatible `onX`, fast path, isolated errors, `LiteGraph.events`, `ctx.listen`, E12/E13 fixed | final |
| 2026-11-22 | [Flows track, reference](2026-11-22-flows-reference.md): `npm run docs:nodes` node reference, pack descriptions, `def.usage`, descriptions for every bundled type, catalog test of 273 types | final |
| 2026-11-01 | [Baseline validation](2026-11-01-baseline-validation.md): setup, contracts, editor, tester and runner acceptance | final |
| 2026-11-01 | [Readiness checklist](2026-11-01-readiness-checklist.md): verified foundation and remaining acceptance work | snapshot |
| 2026-11-22 | [Pre-release 0.18.0-dev.1](2026-11-22-pre-release-0.18.0-dev.1.md): all planned waves done, release checks (clean clone, packed install, probes, browser), version bump | final; push/PR/tag pending |
| 2026-11-22 | [Wave 5c: apps move](2026-11-22-wave5c-apps-move.md): apps/, vendor/, old URLs kept, one defaults module, runner prefix fix | final |
| 2026-11-21 | [Wave 5a–5b: packaging, CI, docs](2026-11-21-wave5ab-packaging-ci-docs.md): dependency advisories, no required dependencies, explicit exports, no debug defaults in builds, build freshness in CI, getting started and architecture docs | final |
| 2026-11-20 | [Integrate LG/dev and align master](2026-11-20-integrate-dev-and-master.md): joined the records and runner lines, then opened PR #8 to `master` | final |
| 2026-11-21 | [Wave 4e: catalog and boundaries](2026-11-21-wave4e-catalog-boundaries.md): one watch node, network and process renames with mappings, jQuery file removed, reroutes across subgraph boundaries; Wave 4 complete | final |
| 2026-11-20 | [Wave 4d: layout and palette](2026-11-20-wave4d-layout-palette.md): auto-layout adapter (dagre on demand, layered, ELK), node palette API and Editor panel | final |
| 2026-11-20 | [Wave 4c: links and view](2026-11-20-wave4c-links-view.md): RenderLink and routers, link styles, minimap, pan as a pointer gesture | final |
| 2026-11-20 | [Wave 4b: workspace state and execution](2026-11-20-wave4b-workspace.md): change stream, dirty flag, draft autosave, execution-state protocol, overlays and title icons | final |
| 2026-11-20 | [Wave 4a: packs and missing nodes](2026-11-20-wave4a-packs.md): pack manifests and registry, builtin packs, provenance stamping, missing-nodes report and panel, replacement mappings | final |
| 2026-11-20 | [Wave 3c: components](2026-11-20-wave3c-components.md): registered subgraph components with updates, blueprints, 43 SA acceptance cases; Wave 3 complete | final |
| 2026-11-20 | [Wave 3b: subgraph authoring](2026-11-20-wave3b-subgraph-authoring.md): breadcrumb, subgraph commands, interface editing, promoted widgets, path ids | final |
| 2026-11-20 | [Wave 3a: schema probe](2026-11-20-wave3a-schema-probe.md): ComfyUI schema validation (79/79), content kept, definitions by default, ADR 0001 accepted | final |
| 2026-11-20 | [Wave 3a: subgraph definitions](2026-11-20-wave3a-subgraph-definitions.md): ComfyUI-form definitions, registry, linked instances, function node, runner policy, interop | final; probe closed in the next record |
| 2026-11-20 | [Wave 2a: authoring operations](2026-11-20-wave2a-authoring.md): subgraph convert/unpack, groups, clipboard fragments, ranked search | final |
| 2026-11-20 | [Wave 2b: links and pointer](2026-11-20-wave2b-links.md): link snapping and events, quick connect, drags as pointer gestures, floating reroutes, badges and title buttons | final |

## Waves

| Wave | Branches | Record |
|---|---|---|
| 0 Safety | `LG/wave0_safety` ([PR #5](https://github.com/atlasan/litegraph.js/pull/5)) | [roadmap](../plans/roadmap.md#wave-0-safety-and-correctness-done), [review](../audits/2026-11-19-wave0-pr5-review.md), `CHANGES.md` |
| 1 Platform | `LG/wave1_platform`, `LG/wave1_finish` | [roadmap](../plans/roadmap.md#wave-1-platform-layer-done), `CHANGES.md` |
| 2a Authoring operations | `LG/wave2_authoring` | [execution](2026-11-20-wave2a-authoring.md), [plan](../plans/2026-11-20-wave2-authoring-core.md) |
| 2b Links and pointer | `LG/wave2_links` | [execution](2026-11-20-wave2b-links.md), [plan](../plans/2026-11-20-wave2-authoring-core.md) |
| 4a Packs and missing nodes | `LG/wave4a_packs` | [execution](2026-11-20-wave4a-packs.md), [plan](../plans/2026-11-20-wave4-ecosystem-workspace.md) |
| 4b Workspace state and execution | `LG/wave4b_workspace` | [execution](2026-11-20-wave4b-workspace.md), [plan](../plans/2026-11-20-wave4-ecosystem-workspace.md) |
| 4c Links and view | `LG/wave4c_links` | [execution](2026-11-20-wave4c-links-view.md), [plan](../plans/2026-11-20-wave4-ecosystem-workspace.md) |
| 4d Layout and palette | `LG/wave4d_layout` | [execution](2026-11-20-wave4d-layout-palette.md), [plan](../plans/2026-11-20-wave4-ecosystem-workspace.md) |
| 4e Catalog and boundaries | `LG/wave4e_catalog` | [execution](2026-11-21-wave4e-catalog-boundaries.md), [plan](../plans/2026-11-20-wave4-ecosystem-workspace.md) |
| 6a Event characterization and fixes | `LG/wave6a_ensure` | [execution](2026-11-22-wave6a-ensure.md), [plan](../plans/2026-11-22-events-execution.md) |
| 6b Execution engine and models | `LG/wave6b_engine` | [execution](2026-11-22-wave6b-engine.md), [plan](../plans/2026-11-22-events-execution.md) |
| 6c Node execution declarations | `LG/wave6c_declarations` | [execution](2026-11-22-wave6c-declarations.md), [plan](../plans/2026-11-22-events-execution.md) |
| 6d Graph info, reporting, runner | `LG/wave6d_graphinfo` | [execution](2026-11-22-wave6d-graphinfo-runner.md), [plan](../plans/2026-11-22-events-execution.md) |
| 6e Deprecations, docs, Wave 6 summary | `LG/wave6e_polish` | [execution](2026-11-22-wave6e-polish.md), [plan](../plans/2026-11-22-events-execution.md), [decision 0002](../memories/decisions/0002-execution-models.md) |

From Wave 2 on, each wave gets a dated execution record: what changed, the gate result, browser checks, and what was left open.

**Evidence:** capture screenshots or logs only when they prove something a test cannot. Store them in `evidence/YYYY-MM-DD-topic/`, next to the record that cites them. The 2026-10 screenshots were dropped as outdated.
