# 0005: Port borrowed modules by hand into ES6, with attribution

> **Date** 2026-11-25 · **Kind** decision · **Status** accepted (roadmap D3; DEC-3 in the [state audit](../../audits/2026-11-23-state-audit.md))

## Context

Waves 2–4 borrowed modules from the MIT-licensed standalone `Comfy-Org/litegraph.js` (at or before `ea0e1a8`): `reroute.js`, `linkconnector.js`, `CanvasPointer`, the subgraph acceptance cases. Each was ported by hand, but the [feature harvest](../../plans/2026-11-19-feature-harvest-and-priorities.md#7-decisions-needed) question 3 was never marked decided.

## Options

| Option | For | Against |
|---|---|---|
| A. Port each module by hand into ES6 classes, with attribution | No TypeScript toolchain; code reads like the rest of the library; the license boundary is visible per file | Later upstream fixes must be ported by hand too |
| B. Vendor the TypeScript sources behind a build step | Cheaper to follow upstream | A second language and build step; mixed styles; the GPL-adjacent frontend tree is easy to pull in by mistake |

## Decision

**A** (user, 2026-11-25, as recommended). It records what Waves 2–4 already did. The provenance rule in `AGENTS.md` stays the boundary: adapt only from the MIT standalone at or before `ea0e1a8`, name the source commit in the file header, and use the ComfyUI frontend as a design reference only.

## Consequences

- Each port is reviewed like our own code, and has tests (the SA acceptance cases set the pattern).
- Upstream fixes are tracked as catalog rows and ported one at a time.
- A later TypeScript migration (roadmap Deferred) would need its own proposal and would not reverse this decision for already ported files.
