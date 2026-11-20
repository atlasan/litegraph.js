# BUN-01: Process runner on Bun

| Field | Value |
|---|---|
| Purpose | P8 Process automation; also P5 Devices and P7 LLM agents (see [purposes](../purposes.md)) |
| Kind | runtime + app |
| Area | [Bun process designer and runner](../landscape/bun-process-runner.md) |
| Inspiration | Inngest and Temporal (journaling), n8n (executions, retries), Windmill and Trigger.dev (approval tokens), Node-RED (context), BPMN (gateways); Bun 1.4.4 |
| License of the inspiration | Concepts only; no code reuse planned. n8n, Windmill and bpmn-js are `ref` |
| Effort | XL, decomposed into BUN-02 to BUN-16 |
| Maturity | investigated |
| Depends on | BUN-02 (process mode), BUN-12 (capability grants), roadmap Wave 4 (shared execution-state protocol), H2 (node adornments) |
| Last reviewed | 2026-11-19 |

## Why

Today the runner executes graphs pushed from the editor and holds them in memory. That is enough for live dataflow, but processes need more:
- triggers
- runs that survive restarts
- retries
- waits and human approvals
- a history of what happened

litegraph already provides the designer, EVENT/ACTION slots, subgraphs, capability declarations and a secured runner. Bun provides the server, WebSocket pub/sub, SQLite, cron, secrets and single-binary packaging in one runtime. Those are the pieces a process runner needs.

## What it would look like here

### Graph semantics (BUN-02)

- **Dataflow mode:** the existing `onExecute` tick loop, unchanged.
- **Process mode:** a run is a token that enters at a trigger and follows EVENT/ACTION links. Each node runs once per activation; data links carry payloads.
- **Node kinds:**
  - **Triggers:** manual, cron, webhook, WebSocket topic, file glob or watch, MQTT, OSC, UDP.
  - **Steps:** have policy properties `{retries, backoff, timeoutMs, idempotencyKey}`.
  - **Gateways:** if/switch, parallel fork, and join (all or any).
  - **Waits:** a timer, or a token (approval or signal).
  - **Sub-process:** calls a graph by id at a pinned version.
- **Errors:** each step has an error output. A catch group acts as a boundary event, and compensation links give saga-style undo.

### Durability (BUN-03)

- **Journal:** every completed step is stored as `(runId, stepKey, attempt) → output`, where `stepKey` is the node id plus a loop index.
- **Resume:** the engine walks from the trigger and returns journaled outputs instead of re-executing those steps.
- **Determinism:** the graph is data, so pinning a graph hash per run is enough for deterministic replay [I].

### Runner architecture

```
┌────────── lg-runner (Bun) ─────────────────────────────────────────┐
│ Bun.serve: HTTP · WS pub/sub (run:<id>, graph:<id>) · webhooks     │
│            · editor assets; Origin/Host checks on upgrade          │
│ scheduler: Bun.cron + timers table restored on start               │
│ policy:    capability grants (evolves nodePolicy.js; recursive)    │
│ store:     bun:sqlite WAL                                          │
│            runs · steps · timers · waits · events (append-only)    │
│ secrets:   credential ids → Bun.secrets / env vault (redacted)     │
└──┬─────────────────────────────────────────────────────────────────┘
   │ one executor per run
   ├─ Worker            (trusted graphs, no sys capability)
   └─ Bun.spawn child   (sys graphs: --no-orphans, cgroup, timeout,
                         --disallow-code-generation-from-strings)
```

### Protocol

The existing messages stay. The new messages are `run_started`, `step_event`, `run_waiting`, `resume`, `list_runs` and `get_run`. The editor subscribes to `run:<id>` and overlays node state (BUN-09).

### Relationship to the Node runner

- The Node runner stays the reference implementation and the CI baseline.
- Both runners share the protocol, `nodePolicy.js` and the node bundle.
- A runtime adapter (BUN-16) keeps the process engine runtime-agnostic.
- Bun-only nodes declare a `"bun"` capability.

## Prior art

See section 3 of the [area document](../landscape/bun-process-runner.md#3-concepts-borrowed-from-workflow-tools).

## Open questions

- Should process mode be a graph-level flag, a node mode, or a subgraph type?
- How do process steps coexist with dataflow nodes inside one graph? For example, could a data subgraph be evaluated synchronously inside a step [I]?
- What cap on journal size per step and per run? Inngest uses 4 MiB per step and 32 MiB per run.
- Which state belongs to the run, the graph version, or the context store?
- Capability grants: what is the user experience for an operator who approves a graph?
- Sandboxing without a Bun permission model: are cgroups plus a dedicated OS user enough, or is a container required?

## Smallest experiment

`experiments/bun-runner/`:
1. Run the four open checks in the [area document](../landscape/bun-process-runner.md#5-open-checks-before-building-on-bun).
2. Build a 150-line prototype: a cron trigger → two steps → a SQLite journal. Kill the process mid-run, restart it, and show that the completed step is not re-executed.

## History

- 2026-11-19: created from the Bun and workflow-tools investigation.
