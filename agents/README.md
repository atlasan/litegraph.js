# agents/

The working space for people and coding agents: what we know, what we intend, what we did, what we checked, and what we might do.

The rest of the repository is product:
- `src/`, apps, tests.
- [docs/](../docs/), which holds only reference pages and the generated API.
- [AGENTS.md](../AGENTS.md), which has the operational rules.

| Folder | Question it answers | Lifecycle |
|---|---|---|
| [memories/](memories/README.md) | What is true, what was decided, what was learned? Codebase map, decisions (ADRs), research | Correct in place; date every record |
| [plans/](plans/README.md) | What will change, and in which order? [Roadmap](plans/roadmap.md) and dated plans | Idea → proposal → plan → done |
| [executions/](executions/README.md) | What was done and how was it verified? Wave records, validation runs, evidence | Append one record per run or wave |
| [audits/](audits/README.md) | What did an independent review find at a given commit? | Dated; fixes noted afterwards |
| [ideas/](ideas/README.md) | What could we do? 212 ideas by purpose, outside the pipeline | Living database; promote to `plans/` |

## Flow

```
ideas ──promote──► plans ──execute──► executions
  ▲                  ▲                    │
  └── research ── memories ◄── audits ◄───┘
```

## Conventions

- **File names:** dated records are `YYYY-MM-DD-topic.md`. Plans keep their `YYMMDD_topic.md` names. Decisions are `NNNN-topic.md`.
- **Evidence:** every claim links a source (`path:line`, a commit, a URL). Inferences are marked **[I]**.
- **One home per subject:** indexes link to records instead of copying them.
- **History:** the 2025 automated analysis was replaced by the [codebase map](memories/codebase/README.md) and the [improvements ledger](audits/2026-11-19-improvements-ledger.md). The originals are in git history at `41d3de5`.
