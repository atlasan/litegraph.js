# agents/

The working space for people and coding agents. Product lives elsewhere: code and apps; [docs/](../docs/), which holds only the generated API and reference pages; and [AGENTS.md](../AGENTS.md), which has the operating rules.

## One meaning per folder

| Folder | Holds | Question it answers |
|---|---|---|
| [memories/](memories/README.md) | Codebase map, decisions (ADRs), research | What is true, what was decided, what was learned? |
| [plans/](plans/README.md) | Roadmap and dated plans | What will change, in which order, with which checks? |
| [executions/](executions/README.md) | Run records: what was done and how it was verified | What happened? |
| [audits/](audits/README.md) | Independent reviews at a stated commit | What did a reviewer find? |
| [ideas/](ideas/README.md) | Idea catalog by purpose, outside the pipeline | What could we do? |
| [_templates/](_templates/) | One template per kind of record | How do I write one? |

```
ideas ──promote──► plans ──execute──► executions
  ▲                  ▲                    │
  └── research ── memories ◄── audits ◄───┘
```

## File names

| Kind | Pattern | Example |
|---|---|---|
| Dated record (plan, execution, audit, research) | `YYYY-MM-DD-kebab-topic.md` | `plans/2026-11-19-feature-harvest-and-priorities.md` |
| Series of research | `research/<series>/YYYY-MM-DD-topic.md` + `README.md` | `research/ecosystem-study/` |
| Decision | `NNNN-kebab-topic.md` | `decisions/0001-subgraph-document-format.md` |
| Idea card | `<ID>-kebab-topic.md` | `ideas/cards/3D-01-gltf-khr-interactivity.md` |
| Living document (updated in place) | `kebab-name.md` | `plans/roadmap.md`, `ideas/catalog.md` |
| Folder index | `README.md` | every folder |
| Evidence (only when it proves something) | `executions/evidence/YYYY-MM-DD-topic/` | screenshots, logs |

The date is the day the record was **written**, not the day it was last touched.

## Header

Every record starts with its title and one metadata line:

```
# Title

> **Date** 2026-11-19 · **Kind** audit · **Status** final · **Base** `master` @ `01cb4ea`
```

- Living documents use **Updated** instead of **Date**.
- **Base** (branch and/or commit) is required whenever the record describes code.

| Kind | Status values |
|---|---|
| plan | proposed · accepted · done · superseded · historical |
| roadmap, reference, idea area, idea catalog | living |
| execution, audit, research | final (an audit's later fixes go only in its **Since** column) |
| decision | proposed · accepted · rejected · superseded by NNNN |

## Writing rules

- **Use the template:** start from the one in [_templates/](_templates/) for the kind of record.
- **Index it:** add a row to the folder's `README.md` in the same change.
- **One home per subject:** indexes link to records and never copy them. When a record is replaced, mark the old one `superseded` and link forward.
- **Evidence:** link every claim (`path:line`, a commit, a URL) and mark inferences **[I]**. Save screenshots only when they prove something a test cannot.
- **Keep it tight:** tables and short paragraphs, no filler, no timelines or budgets. Records are read by agents, so precise beats long.
- **History:** the 2025 automated analysis was replaced by the [codebase map](memories/codebase/README.md) and the [improvements ledger](audits/2026-11-19-improvements-ledger.md). The originals are in git at `41d3de5`.
