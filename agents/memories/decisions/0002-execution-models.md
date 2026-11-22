# 0002: Execution models, with ancestors as the default

> **Date** 2026-11-22 · **Kind** decision · **Status** accepted

## Context

The [events and execution audit](../../plans/2026-11-22-events-execution.md) found seven overlapping event and execution mechanisms (step loop, immediate and deferred actions, the ancestors refresh, guards, subgraph boundaries, reporting), switched by process-wide `LiteGraph` flags that documents did not save. One workflow behaved differently in the editor, on the `event_based` page, in the runner and inside subgraphs, and FOR, WHILE and Sequence broke silently under the core defaults. The user decided (2026-11-22) that the ancestors approach becomes the default, other models stay available, nodes may declare per-model validity, the model is shown and changed in the graph info, and old graphs keep working.

## Options

| Option | For | Against |
|---|---|---|
| A: keep the global flags, fix nodes one by one | no new concepts | the root cause (process-wide switches) stays; nodes keep needing workarounds per configuration |
| B: one fixed new engine for everyone | simplest model | breaks every saved document and project tuned to today's flags |
| C: named execution models chosen per document; `legacy` reproduces today's code; `ancestors` the default for new graphs | documents carry their semantics; old documents unchanged; new models can be added (trace, token, behaviour trees) | two code paths in the core until `legacy` is retired; new code-built graphs change behaviour (one documented change) |

## Decision

**Option C** (Wave 6), with the plan's recommendations for its open decisions:

- **Scope:** per document, in the root graph's `config.execution`; subgraph definitions do not carry their own model.
- **Default:** `LiteGraph.default_execution_model = "ancestors"` for `new LGraph()` and new editor documents. Documents without the field load as `legacy`. Assigning any legacy flag makes the default resolve to `legacy` (the flags are accessors that note assignment; deprecated, removed no earlier than 0.20).
- **Ancestors semantics:** immediate delivery; ON_REQUEST data ancestors pulled before actions, triggers and each ALWAYS node's turn; a pulled node runs at most once per frame or call and again only on a newer link data version; ALWAYS nodes are never re-run by a pull (an ALWAYS node that never ran gives its first value). Forced pulls (`getInputData(slot, true)`) are memoized too (user decision during implementation; the plan's decision 4 and its A2 acceptance check disagreed).
- **Engine shape:** `src/execution.js` (`ExecutionEngine`, model registry). The core methods keep today's code under `legacy` and delegate to the engine otherwise, so `legacy` is identical by construction; compatibility golden snapshots guard it.
- **Declarations:** `static def.execution` (or `LiteGraph.declareNodeExecution`); undeclared types are valid everywhere and start ALWAYS. Mode restrictions are on by default and lifted by `LiteGraph.Execution.AllowAnyMode`, which every refusal names.
- **Reporting:** every refusal emits `event-dropped` with a reason (and the setting for limits); event-chain errors are reported like step errors; outside `legacy` they are rethrown only when `LiteGraph.throw_errors`; only errors inside `runStep` stop the graph. Queued actions while stopped are kept and reported once (`stop({dropQueued: true})` clears them).

## Consequences

- Saved documents and projects that set flags behave as before; new code-built graphs deliver actions immediately (one `CHANGES.md` entry, one-line opt-out).
- Node authors can rely on loops, Sequence and pulls behaving the same in the editor, the runner and subgraphs, and can declare what their nodes need.
- The core carries the legacy paths until the flags are removed (0.20 at the earliest); removing them means deleting the `rules.legacy` branches and migrating documents without `config.execution`.
- Further models (execution trace USE-34, token mode BUN-02, behaviour trees USE-13, await CFY-22) register through `LiteGraph.registerExecutionModel`.
