# 0008: Legacy compatibility scope

> **Date** 2026-11-25 · **Kind** decision · **Status** accepted (DEC-4 in the [state audit](../../audits/2026-11-23-state-audit.md), roadmap D11; launcher candidate C-4; [next priorities](../../plans/2026-11-25-next-priorities-after-0.18.0-dev.2.md) step 15)

## Context

- [Decision 0002](0002-execution-models.md) kept a `legacy` execution model and deprecated seven flags, with removal "no earlier than 0.20".
- The [1.0 goals](../../plans/2024-05-05-goals-for-1-0.md) ask for drop-in API compatibility with the original LiteGraph.
- Projects in the same family still use old builds: `webglstudio.js` vendors LiteGraph 0.4 (`editor/js/extra/litegraph.js`), and nunuStudio has an empty slot for LiteGraph scripts (ideas NUN-01, NUN-06).
- There is no classic-script bundle that exposes a global `LiteGraph`.

## Options

| Option | For | Against |
|---|---|---|
| A. Remove `legacy` in 0.20 | One code path | Breaks saved documents and projects tuned to the flags |
| B. Keep `legacy` for now, decide later; offer the old global names in a classic-script bundle; old behaviour only through the `legacy` model | Old projects keep working; webglstudio and nunuStudio can load the new library | Two execution paths in the core for longer |
| C. Also reproduce 0.4 behaviour in detail | Closest drop-in | Unbounded: 0.4 quirks conflict with fixed bugs |

## Decision

**B** (user, 2026-11-25):
- **`legacy` stays.** The deprecated flags keep working and logging once; no removal date. Revisit when the compatibility charter's targets are met.
- **Scope of old-API compatibility:** the old global names (`LiteGraph`, `LGraph`, `LGraphNode`, `LGraphCanvas`, … on `window`) in a classic-script bundle, plus the `legacy` execution model. Old behaviour beyond that is not reproduced.
- **A compatibility charter** (C-4) states the targets and this scope in one page: `docs/compatibility.md`, linked from `AGENTS.md`.

## Consequences

- Tier 5 of the next-priorities plan is on hold.
- The classic-script bundle is a Tier 4 track, tested with webglstudio graphs as fixtures.
- New features land for every model; `legacy`-only fixes are accepted when they don't change documented behaviour.
