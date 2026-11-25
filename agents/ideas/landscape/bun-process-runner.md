# Bun process designer and runner

> **Updated** 2026-11-25 · **Kind** idea area · **Status** living

Ideas `BUN-01`–`BUN-22`. The concept design is in [card BUN-01](../cards/BUN-01-process-runner-on-bun.md).

**Question:** litegraph already designs graphs in the browser and runs them headless on Node (`headless/graphrunner`). What would it take to turn that into a **process designer and runner**? Such a runner has triggers, durable steps, retries, waits and human approvals. Which parts does Bun make cheap?

**Baseline:** Bun **1.4.4** (2026-10-22). 1.4.5 was released on 2026-11-19 as a security fix and is excluded by the two-week dependency rule in [AGENTS.md](../../../AGENTS.md#rules). Re-check every row here before promoting an idea.

## 1. Where the runner is today

These facts are from reading the code on `LG/dev`.

**Server:**
- Express plus `ws`.
- `verifyClient` applies the Origin and Host checks (`server/security.js`).
- `maxPayload` is 4 MiB (`server/wsHandler.js`).

**Execution:**
- Each graph gets one `worker_threads` Worker, with a 10 s command timeout (`server/graphManager.js`).
- The worker loads `build_node/litegraph_nodejs.full.cjs`.
- It sets `LiteGraph.allow_scripts` from `RUNNER_ALLOW_SYS`.
- It applies the recursive denylist from `nodePolicy.js`.

**Commands:** start, stop, clear, status, sync, update.

**Missing:** run history, persistence, secrets, retries, triggers and waits.

**[I]** Worker threads isolate faults, not privileges. The denylist is the only security control today.

## 2. What Bun offers

| Bun feature | State in ≤ 1.4.4 | Use here | Source |
|---|---|---|---|
| `Bun.serve` WebSockets | Topics (`subscribe`/`publish`), per-socket data, backpressure; built on uWebSockets | One topic per run and per graph; the editor subscribes | [docs](https://bun.com/docs/runtime/http/websockets) |
| `ws` npm module | Native port of ws 8.22.0 in 1.4.4; default `maxPayload` 100 MiB | The current `wsHandler.js` should run unchanged; keep the 4 MiB cap explicit | [1.4.4](https://bun.com/blog/bun-v1.4.4) |
| `Bun.spawn` | `timeout`, `maxBuffer`; Linux `cgroup`, `terminal` PTY, `--no-orphans` (1.4) | Process steps with limits; one cgroup per run; terminal widget | [1.3](https://bun.com/blog/bun-v1.3), [1.4](https://bun.com/blog/bun-v1.4) |
| `Bun.$` shell | Stable API | Shell step; must stay denylisted like `sys/*` | [APIs](https://bun.com/docs/runtime/bun-apis) |
| Workers | Compat page says `resourceLimits` is ignored; the 1.4 notes say it was added. **Conflict, needs a test** | Per-run executor | [compat](https://bun.com/docs/runtime/nodejs-compat), [1.4](https://bun.com/blog/bun-v1.4) |
| `bun:sqlite` | Custom functions, row change hooks (1.4.4) | Run journal; change hooks feed live streaming | [1.4.4](https://bun.com/blog/bun-v1.4.4) |
| `Bun.SQL` | One client for Postgres, MySQL, SQLite; cancel, COPY streaming | `sql/*` family to supersede `mysql/*` | [1.3](https://bun.com/blog/bun-v1.3) |
| `Bun.redis`, `Bun.s3` | Redis: 66 commands and pub/sub, no cluster or streams. S3: works with R2 and MinIO | Queue, pub/sub and storage nodes; artifact store | [1.3](https://bun.com/blog/bun-v1.3), [S3Client](https://bun.com/reference/bun/S3Client) |
| `Bun.secrets` | OS keychain get/set | Local credential vault | [1.3](https://bun.com/blog/bun-v1.3) |
| `Bun.cron` | In-process `Bun.cron(expr, fn)` (no overlap, `stop`, `unref`, `tz`); OS-level form writes crontab, launchd or Task Scheduler | Cron trigger node; "install as OS schedule" export | [1.4](https://bun.com/blog/bun-v1.4) |
| `bun build --compile` | Cross-compile; workers as extra entrypoints; `--asset` embeds directories; an embedded SQLite DB is in-memory only | Single-binary runner with the editor embedded; keep the DB as an external file | [executables](https://bun.com/docs/compiler/executables) |
| Code-generation lockdown | `--disallow-code-generation-from-strings=strict` in compiled binaries | Enforces "scripts off" below the library | [1.4.4](https://bun.com/blog/bun-v1.4.4) |
| `Bun.WebView`, `Bun.Image` | Headless browser with CDP; image API | Browser automation and image nodes | [1.4](https://bun.com/blog/bun-v1.4) |
| `bun:ffi` | Experimental, not for production | Avoid | [ffi](https://bun.com/docs/runtime/ffi) |
| **Permissions** | **None.** Tracked upstream, unmerged | Sandboxing must come from the OS: cgroups, users, containers. Node has `--permission` | [#25929](https://github.com/oven-sh/bun/issues/25929), [Node](https://nodejs.org/api/permissions.html) |

**Compatibility of the existing Node families** ([compat page](https://bun.com/docs/runtime/nodejs-compat)):
- `dgram`: full, so UDP and OSC should work.
- `node:http`: full.
- `child_process`: partial.
- socket.io: runs through the `node:http` polyfill, or through `@socket.io/bun-engine` 0.1.x ([npm](https://www.npmjs.com/package/@socket.io/bun-engine)).
- Untested [I]: the legacy `mysql` package, and loading `build_node/*.cjs` under Bun.

## 3. Concepts borrowed from workflow tools

| Tool | Concept | Borrow as | License class | Source |
|---|---|---|---|---|
| Node-RED | Context at node, flow and global scope, with pluggable stores | Run, graph and global context store | Apache-2.0, `adapt` | [context](https://nodered.org/docs/user-guide/context) |
| n8n | Retry on fail; error output; error-trigger workflow; executions log; re-run with original or current workflow; encrypted credentials | Retry policy, error slot, executions panel, credential references | Sustainable Use License, `ref` | [errors](https://docs.n8n.io/flow-logic/error-handling/), [license](https://docs.n8n.io/n8n-community-license) |
| Windmill | Suspend steps with resume, cancel and approval URLs; resume payload | Approval node with a token and a form | AGPL core, `ref` | [approval](https://www.windmill.dev/docs/flows/flow_approval) |
| Temporal | Event history; deterministic replay; activity results recorded once | Per-run journal; replay tests | MIT, `adapt` (concept only) | [event history](https://docs.temporal.io/encyclopedia/event-history) |
| Inngest | `step.run` memoization, stable step IDs, retries per step, size caps | Step key = node id + loop index; journal caps | concept | [execution](https://www.inngest.com/docs/learn/how-functions-are-executed) |
| Trigger.dev | Wait tokens, completed by a URL | Wait-for-token node | concept | [wait](https://trigger.dev/docs/wait) |
| BPMN / bpmn-js | Exclusive and parallel gateways, boundary events, call activities. bpmn-js requires a visible watermark | Gateway, boundary and sub-process node semantics; do not embed bpmn-js | bpmn.io License, `ref` | [license](https://bpmn.io/license/) |
| Airflow | DAG of tasks, schedules, retries | Static DAG check before a run | Apache-2.0 | [DAGs](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html) |
| GitHub Actions | `needs`, matrix, `if`, YAML as code | YAML export; matrix fan-out node | concept | [syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions) |

## 4. Ideas

| ID | Idea | Kind | Effort | Notes |
|---|---|---|---|---|
| BUN-01 | **Process runner on Bun**: the umbrella concept ([card](../cards/BUN-01-process-runner-on-bun.md)) | runtime | XL | Composes BUN-02 to BUN-14 |
| BUN-02 | **Process execution mode**: a run is a token moving along EVENT/ACTION links; each node runs once per activation; data links carry payloads | core | L | Reuses existing slot types and modes; use mode constants; BYPASS = 4 and ON_REQUEST = 5 since decision 0004 |
| BUN-03 | **Durable step journal**: `(runId, stepKey, attempt) → output` in SQLite; resume by walking from the trigger and skipping completed steps; pin a graph hash per run | runtime | L | Simpler than Temporal because topology is data [I] |
| BUN-04 | **Retry, backoff, timeout and idempotency-key** properties on steps, with an editor widget | node | M | Non-idempotent side effects |
| BUN-05 | **Cron and timer triggers**; timers persisted so waits survive restarts | node | S | Time zones; missed ticks while down |
| BUN-06 | **Webhook trigger and HTTP response** node on `Bun.serve` routes | node | M | Authentication; exposure beyond loopback |
| BUN-07 | **Approval / wait-for-token** step: resume URL, optional form, expiry | node | M | Token leakage |
| BUN-08 | **Executions panel**: list runs, inspect each step's input and output, re-run from a step with the original or current graph | ext | L | Pairs with roadmap Wave 4 "shared execution-state protocol" |
| BUN-09 | **Live run overlay**: step events published per run topic; node state badges and link payload inspection | ext | M | Needs H2 node adornments; volume and backpressure |
| BUN-10 | **Context store** with run, graph and global scope | runtime | M | Concurrent writes |
| BUN-11 | **Credential vault**: nodes hold a credential id; values resolve only in the executor; logs and journal redacted | runtime | M | Key backup; Linux keychain on headless hosts |
| BUN-12 | **Capability grants** replace the denylist: graphs declare what they need (`declareCapabilities`), and the operator grants it per graph | core | M | Related to open decision D1 in the roadmap |
| BUN-13 | **Versioned sub-process call**: call a graph by id and pinned version | node | M | Version drift; relates to Wave 3 definitions |
| BUN-14 | **Gateways, error boundary and compensation**: if/switch, parallel fork, join (all or any), catch group, saga undo links | node | M | Semantic complexity |
| BUN-15 | **Single-binary runner**: `bun build --compile` with the editor as an asset | app | M | Worker entrypoints, binary size |
| BUN-16 | **Runtime adapter interface** (serve/ws, worker, kv/sql, cron) so the process engine runs on Node and Bun | runtime | M | Keep Node as the reference and CI baseline |
| BUN-17 | **`sql/*` family on `Bun.SQL`** (Postgres, MySQL, SQLite), superseding `mysql/*`; a `"bun"` capability | node | M | Needs a Node fallback |
| BUN-18 | **Redis and S3 nodes** for queues, pub/sub and artifacts | node | S | No Redis cluster or streams |
| BUN-19 | **PTY terminal widget** for interactive shell steps | widget | M | Security; denylisted by default |
| BUN-20 | **Browser automation nodes** on `Bun.WebView` | node | M | Abuse potential; needs Chrome |
| BUN-21 | **Export a process**: to GitHub-Actions-style YAML, or as an OS schedule (`Bun.cron` OS form) | io | M | Lossy mapping |
| BUN-22 | **BPMN XML import and export** for interop with process tooling | io | XL | Lossy; do not ship bpmn-js |

Related ideas in other areas: MCP tools as nodes and graphs as MCP servers (`JS-01`, `JS-02`), LLM steps (`JS-03`), MQTT and serial triggers (`JS-08`).

## 5. Open checks before building on Bun

1. Does `worker_threads` `resourceLimits` work on Bun 1.4.4?
2. Do `build_node/litegraph_nodejs.full.cjs` and the `mysql` package load under Bun?
3. Does `Bun.secrets` work on headless Linux?
4. What is the status of Bun's permission model upstream?

These four checks fit one script in `experiments/bun-runner/`. That script is the smallest experiment for [BUN-01](../cards/BUN-01-process-runner-on-bun.md).
