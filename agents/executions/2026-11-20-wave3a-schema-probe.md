# Wave 3a: ComfyUI schema probe, definitions by default

> **Date** 2026-11-20 · **Kind** execution · **Status** final · **Base** `LG/wave3_subgraphs` @ `5281171` · **Plan** [Wave 3: subgraph system](../plans/2026-11-20-wave3-subgraph-system.md) · **Supersedes** the Left open of [Wave 3a](2026-11-20-wave3a-subgraph-definitions.md)

This run closes 3a. Subgraph documents were validated with ComfyUI's own workflow schema, and the content check found two losses, now fixed. `LiteGraph.subgraph_format` now defaults to `"definitions"`, and [ADR 0001](../memories/decisions/0001-subgraph-document-format.md) is accepted.

## Setup

These files are local only and never committed. The folders are git-ignored in `experiments/comfy-interop/`:
- ComfyUI_frontend @ `e10b6bf97d` (GPL-3.0):
  - `packages/graph-model/src/workflowSchema.ts`, with its `widgets` / `linkId` / `rerouteId` helpers (relative imports given `.ts`);
  - the 41 subgraph workflows in `browser_tests/assets/**` whose names contain "subgraph".
- `zod@4.1.12`, with `zod-validation-error` stubbed.

The probe scripts are committed:
- `probe_subgraphs.mjs`: schema validity;
- `probe_subgraph_content.mjs`: what each round trip keeps.

## Changes

- Instance nodes keep the fields this runtime does not model (`Subgraph.kept_fields`). This includes ComfyUI's `widgets_values` of promoted widgets, which were lost before.
- The wildcard `"*"` keeps its spelling; it used to be rewritten to `""`.
- `LiteGraph.subgraph_format` defaults to `"definitions"`.
- New tests:
  - Jest `comfy-interop` (+1): kept fields and wildcard types.
  - Integration `runner` (+1): a definitions workflow opens, starts, runs iterations and syncs back in the definitions form.
- ADR 0001 is accepted. `experiments/comfy-interop/.gitignore` added.

## Verification

| Check | Result |
|---|---|
| Schema, our exports (simple, nested, event ports, function plus linked; 0.4 and 1) | 8/8 pass |
| Schema, ComfyUI fixtures valid as given (33): import → export, and import → edit (move an inner node, commit) → export | 63/63 pass (the 8 fixtures with no subgraph instance have no edit check) |
| Schema, fixtures invalid as given (8, non-GUID test ids) | Round trips add no new issues (8/8) |
| Content, all 41 fixtures | <ul><li>Before the fix, 38 lost instance `widgets_values` or got `"*"` → `""`.</li><li>After it, 0 lose content.</li><li>26 interface slots missing from instances are appended, as ComfyUI does on load</li></ul> |
| `npm run check` | lint clean, 12 builds, strict types, **423/423 Jest**, **94/94 integration**, package check |

## Left open

- 3b and 3c, as planned. Promoted widgets in 3b should read the kept `widgets_values`.
