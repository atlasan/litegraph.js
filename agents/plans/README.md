# Plans

What will change, and its status. What exists today is in [docs/](../../docs/) and the [codebase map](../memories/codebase/README.md); what was done is in [executions/](../executions/README.md).

**Start here:** the [roadmap](roadmap.md) has the current waves, the branch model and the open decisions.

## Lifecycle

**Idea → proposal → plan → done**, or deferred, rejected, superseded.

| Stage | Where | Content |
|---|---|---|
| Idea | [ideas/](../ideas/README.md) | Problem or opportunity, purpose, source |
| Proposal | here, `Status: proposed` | Alternatives, tradeoffs, compatibility, a recommendation |
| Plan | here, `Status: accepted` | Outcome, scope, steps with acceptance checks |
| Wave | [roadmap](roadmap.md) | Accepted work in order |
| Decision | [memories/decisions](../memories/decisions/) | A durable architectural choice |
| Done | [executions/](../executions/README.md) | What ran and how it was verified |

New plans start from the [plan template](../_templates/plan.md).

## Index

| Date | Plan | Status |
|---|---|---|
| 2026-11-23 | [Pre-release 0.18.0-dev.2](2026-11-23-pre-release-0.18.0-dev.2.md): everything on `LG/dev`; records hygiene, three pre-release fixes, version, release checks, PR and tag | accepted |
| 2026-11-22 | [Flows track: node reference, declarations, examples](2026-11-22-flows-reference-examples.md): `docs:nodes` reference from the registry, pack descriptions and `def.usage`, a catalog test, the declaration pass, the examples manifest and Demo menu, an examples test (steps 1–3 of the flows direction) | done |
| 2026-11-22 | [Flows direction](2026-11-22-flows-direction.md): node reference, declarations, examples, call scopes, lifecycle and custom events, graph profiles (from the event flows audit) | proposed; steps 1–3 promoted |
| 2026-11-22 | [Event integration](2026-11-22-event-integration.md): one listener engine for hooks (intercept) and typed events (observe), with a fixed order, compatible API and new event targets (Wave 7) | accepted; done except generated doc tables, deprecation logs and async hooks |
| 2026-11-22 | [Panels and widgets](2026-11-22-panels-options-node-details.md): value types (one type → canvas widget and panel editor registry), a Graph/Canvas/Settings options panel with search, categories and sorting, a node details panel with sections, tooltips and one undo step per edit; branch `LG/dev_panel_and_widget` | done, merged into `LG/dev` |
| 2026-11-22 | [Events and execution](2026-11-22-events-execution.md): audit of the event mechanisms; execution models per document with `ancestors` as the default, node execution declarations, `legacy` compatibility (Wave 6) | done |
| 2026-11-21 | [Wave 5: repository and packaging](2026-11-21-wave5-repository-packaging.md): dependencies, exports, CI build freshness, docs, apps move | done, except the generated API docs out of the authored tree and one tester controller |
| 2026-11-20 | [Pre-release 0.18.0-dev.1](2026-11-20-pre-release-0.18.0-dev.1.md): wave audit, open items, release steps (tag only) | accepted; in progress |
| 2026-11-20 | [Wave 4: ecosystem and workspace](2026-11-20-wave4-ecosystem-workspace.md): packs and missing nodes (4a), workspace state and execution (4b), links and view (4c), layout and palette (4d), catalog and boundaries (4e) | done |
| 2026-11-20 | [Wave 3: subgraph system](2026-11-20-wave3-subgraph-system.md): definitions in ComfyUI's format, linked instances, function node, promoted widgets, components | done |
| 2026-11-20 | [Wave 2: authoring core](2026-11-20-wave2-authoring-core.md): subgraph convert/unpack, groups, clipboard, search (2a); links and pointer (2b) | done |
| 2026-11-19 | [Feature harvest and priorities](2026-11-19-feature-harvest-and-priorities.md): idea catalog and wave proposal | accepted; the basis of the roadmap |
| 2026-11-18 | [Repository review and roadmap](2026-11-18-repo-review-and-roadmap.md): bugs B1–B15, phase plan | superseded by the roadmap |
| 2026-11-01 | [Workspace structure and memory](2026-11-01-workspace-structure-and-memory.md): repository and documentation model | accepted; `agents/` and `docs/` are done, the app moves were done in Wave 5c |
| 2026-11-01 | [Ecosystem study plan](2026-11-01-ecosystem-study-plan.md): research scope | done |
| 2024-05-05 | [Goals for 1.0](2024-05-05-goals-for-1-0.md): the former root `TODO.md` | historical |
