# X-01: A public, versioned runner API

| Field | Value |
|---|---|
| Purpose | P8 Process automation, P7 LLM agents, P1 AI pipelines (see [purposes](../purposes.md)) |
| Kind | proto |
| Area | Cross-cutting: [ComfyUI world](../landscape/comfyui-world.md) (CFY-27 to CFY-32), [Bun runner](../landscape/bun-process-runner.md) (BUN-08, BUN-09), [JS libraries](../landscape/js-libraries.md) (JS-02) |
| Inspiration | [Comfy API v2 SDK design](https://docs.comfy.org/development/api-development/sdks-design.md), [v2 SSE stream](https://docs.comfy.org/api-reference/v2/jobs/live-event-stream-sse.md), [comfy-api-proxy](https://github.com/Comfy-Org/comfy-api-proxy) (MIT), Inngest and Temporal run models |
| License of the inspiration | Public documentation and an MIT proxy: `adapt` for concepts |
| Effort | L |
| Maturity | sketched |
| Depends on | Roadmap Wave 4 "shared execution-state protocol"; CFY-29 (execution plan); BUN-12 (capability grants) |
| Last reviewed | 2026-11-19 |

## Why

`headless/graphrunner` speaks an internal WebSocket protocol to its own editor page:
- start, stop, clear, status, sync, update

Several ideas need a **stable, documented, external** contract instead:
- host-application plugins (CFY-38)
- MCP tools (JS-02, CFY-41)
- process triggers (BUN-06)
- executions panels (BUN-08)
- distributed regions (CFY-40)

Comfy API v2 shows what a mature one looks like.

## What it would look like here

**Resources:**
- `POST /v1/jobs`: submit a graph or a graph reference plus inputs, with an `Idempotency-Key` header. Returns `{id, links}`.
- `GET /v1/jobs/{id}`: the authoritative state. Clients poll this first.
- `GET /v1/jobs/{id}/events`: an SSE stream. It sends a full snapshot on connect, and each progress event is a full snapshot, so there is no replay to manage.
- `POST /v1/jobs/{id}/resume`: answer an await or approval (CFY-22, BUN-07).
- `GET /v1/features`: capability handshake, covering runtime (`node` / `bun`), granted capabilities and versions (CFY-32).
- `GET /v1/nodes`: node definitions (CFY-33).
- `/v1/assets`: content-addressed upload, with an existence check by hash (CFY-28).

**Namespaced custom events** (CFY-31) let node families publish their own messages to subscribed editors.

**Versioning:** additive changes only within `v1`. Breaking changes go to `v2`.

**Security:** keep today's Origin and Host checks. Add token authentication for non-loopback use, plus per-graph capability grants (BUN-12).

**Relationship to today's protocol:** the editor's live WebSocket stays for live dataflow editing. The public API covers *runs*. A thin adapter in the style of comfy-api-proxy can provide both from one server.

## Open questions

- Does a "job" mean a dataflow session (start/stop) or a process run (BUN-02), or both with a `kind`?
- Should the job body carry the editor document or the execution plan (CFY-29)?
- What are the size limits for inline inputs and outputs, given the 4 MiB WebSocket cap today?

## Smallest experiment

Write an OpenAPI sketch for the endpoints above. Then implement `POST /jobs` + `GET /jobs/{id}` on the existing Express runner for a pure-node graph. Check idempotent resubmission in `node:test`.

## History

- 2026-11-19: created from the ComfyUI world and Bun runner investigations.
