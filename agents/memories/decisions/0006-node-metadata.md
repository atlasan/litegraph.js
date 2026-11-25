# 0006: Node metadata stays on `static def`; `defineNodeType` later as a factory

> **Date** 2026-11-25 · **Kind** decision · **Status** accepted (roadmap D4; DEC-3 in the [state audit](../../audits/2026-11-23-state-audit.md))

## Context

Node classes describe themselves with an optional `static def` plus the classic statics (`title`, `desc`, slots). `getNodeDefinition` / `listNodeDefinitions`, search aliases, `def.execution` (Wave 6c), `def.usage` and the node reference (flows track) all read it. The [feature harvest](../../plans/2026-11-19-feature-harvest-and-priorities.md#7-decisions-needed) question 4 asked whether to move to a definition-first `LiteGraph.defineNodeType(type, def, impl)`, which would also let node packs be generated from JSON Schema, OpenAPI or MCP tool lists (idea X-05).

## Options

| Option | For | Against |
|---|---|---|
| A. Hybrid: classes with an optional `static def` | Every existing node and pack keeps working; already in place | Two ways to state a slot (statics and `def`) |
| B. Definition-first `defineNodeType` only | One data shape; schema-generated packs | Rewrites every node class; breaks third-party classes |
| C. A, plus `defineNodeType` added later as a factory that produces a class with the same `static def` | Both ways stay valid and read the same; X-05 becomes possible without breaking anything | The factory must keep producing exactly what `getNodeDefinition` reads |

## Decision

**C** (user, 2026-11-25, as recommended). `static def` is the single stored format. `defineNodeType` is not scheduled; when it is built (with X-05), it generates a class whose `static def` is the input definition, so every consumer stays unchanged.

## Consequences

- New metadata fields go into `static def` and `getNodeDefinition`, never into a second structure.
- A future `defineNodeType` needs a test that its classes and hand-written classes give equal `getNodeDefinition` output.
