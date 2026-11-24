# Memories

Durable knowledge. **Codebase** documents are living: correct them in place whenever the code changes. **Decisions** and **research** are dated records: write them once, and replace them with a new record instead of rewriting them.

## Codebase (living)

| Document | Holds |
|---|---|
| [Codebase map](codebase/README.md) | Layout, initialization, model, execution, platform, canvas, runner, build, traps |
| [Node runtime catalog](codebase/node-runtime-catalog.md) | Node families, their dependencies and runtimes, evidence |

## Decisions

Template: [decision](../_templates/decision.md).

| Record | Status |
|---|---|
| [0001 Subgraph document format](decisions/0001-subgraph-document-format.md) | **accepted** 2026-11-20 (option B, litegraph runtime kept) |
| [0002 Execution models](decisions/0002-execution-models.md) | **accepted** 2026-11-22 (named models per document, `ancestors` default, `legacy` for old documents) |
| [0003 Event pipe](decisions/0003-event-pipe.md) | **accepted** 2026-11-22 (one listener core for hooks and typed events; `onX` stays the default callback; handler errors isolated, the first rethrown) |
| [0004 Mode 4 is BYPASS](decisions/0004-mode-4-bypass.md) | **accepted** 2026-11-23 (BYPASS = 4 as in ComfyUI, ON_REQUEST = 5; documents migrated on load by their `litegraph_version` / `litegraph_modes` markers; pass-through execution; supersedes D5) |

## Research

Template: [research](../_templates/research.md). Research that yields *ideas* goes to [ideas/](../ideas/README.md); research that yields *knowledge* belongs here.

| Date | Record |
|---|---|
| 2026-11-22 | [Call scopes and pure nodes](research/2026-11-22-call-scopes-and-pure-nodes.md): when an on-request value is computed again; three options compared, scoped and versioned recommended, with tests |
| 2026-11-19 | [Upstream issue triage](research/2026-11-19-upstream-issue-triage.md): 50 upstream defects checked against this fork |
| 2026-11-01 → 11-19 | [Ecosystem study](research/ecosystem-study/README.md) (series): ComfyUI, LiteGraph-TSX, plugin UIs, the relationship with Comfy |
| 2026-10-30 | [Fork investigation](research/2026-10-30-fork-investigation.md): history, upstream and forks, branch choice, baseline defects |
