# Planning

What may change, and its status. Behaviour that exists today is documented under [docs/](../docs/); this folder holds intentions.

**Start here:** [roadmap.md](roadmap.md) has the current waves, their status, the branch model and the open decisions.

## Lifecycle

**Idea → proposal → accepted plan → completed work**. An item may also be deferred, rejected or superseded.

- **Idea:** a problem or opportunity, why it matters, where it came from.
- **Proposal:** alternatives, tradeoffs, compatibility impact, a recommendation.
- **Plan:** the accepted outcome, its boundaries, dependencies, acceptance checks and status.
- **Decision record:** a durable architectural choice and its consequences. These live in [docs/development/decisions](../docs/development/decisions/).

Status belongs in the record itself, or in the roadmap for waves. Indexes link to records rather than copying them.

## Plans

| File | Date | Kind | Status |
|---|---|---|---|
| [261119_feature_harvest_and_priorities.md](plans/261119_feature_harvest_and_priorities.md) | 2026-11-19 | Idea catalog and wave proposal | Accepted as the basis of the [roadmap](roadmap.md); Waves 0–1 delivered |
| [261118_repo_review_and_roadmap.md](plans/261118_repo_review_and_roadmap.md) | 2026-11-18 | Repository review (bugs B1–B15, P0) and phase plan | Mostly superseded by the roadmap; its bug list is tracked in the [inventory audit](../docs/development/audits/2026-11-19-fork-inventory.md) |
| [261101_litegraph_ecosystem_study.md](plans/261101_litegraph_ecosystem_study.md) | 2026-11-01 | Research plan | Completed; findings in the [ecosystem study](../docs/development/ecosystem-study/README.md) |
| [261101_workspace_structure_and_memory.md](plans/261101_workspace_structure_and_memory.md) | 2026-11-01 | Workspace and documentation model | Accepted direction; implementation is Wave 5 (this folder layout and `AGENTS.md` follow it) |

## Decisions

| Record | Status |
|---|---|
| [0001 Subgraph document format](../docs/development/decisions/0001-subgraph-document-format.md) | Proposed; decision D2 in the roadmap |

## Evidence

- [Ecosystem study](../docs/development/ecosystem-study/README.md): ComfyUI, LiteGraph-TSX and plugin research.
- [Audits](../docs/development/audits/README.md): dated code reviews.
- [Development state](../docs/development/README.md): setup, gate, contracts.
