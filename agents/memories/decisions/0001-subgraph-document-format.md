# 0001: Subgraph document format (inline vs ComfyUI-style definitions)

**Status:** Proposed on 2026-11-18. It is to be **accepted or rejected when subgraph authoring (roadmap Phase 4.3) starts**, together with the conversion work it depends on.

**Context documents:**
- [ComfyUI LiteGraph relationship](../research/ecosystem-study/comfyui-litegraph-relationship.md), §3 "Semantic collisions" and §6 "C4".
- [Repository roadmap](../../plans/261118_repo_review_and_roadmap.md).

## Context

**Our format today (`src/subgraph.js`, `graph/subgraph`):**
- Every subgraph node stores its whole inner graph inline: `nodes[i].subgraph = LGraph.serialize()`.
- Inside it, `graph/input` and `graph/output` nodes form the boundary.
- Event and action links (type `-1`) and ON_REQUEST pulls cross that boundary through those nodes.
- Copies are independent, and two instances never share edits.
- Converting a selection into a subgraph (`buildFromNodes`) is unfinished and throws.

**ComfyUI's format (workflow schema version 1; `packages/graph-model/src/workflowSchema.ts` at ComfyUI_frontend `e10b6bf97d`, read for reference only):**
- Each graph has `definitions.subgraphs[]`, recursive.
- Each definition is a full graph document plus:
  - `id` (guid), `revision`, `name`, `description`, `category`;
  - `inputNode` and `outputNode`: positions of virtual IO nodes, with links using the reserved node ids `-10` and `-20`;
  - ordered `inputs` and `outputs` with stable guid slot ids and `linkIds`;
  - `widgets` exposed on the instance.
- An instance node's `type` is the definition `id`. Instances of one definition share it; ComfyUI's blueprints copy it when inserted.

**What this fork has since gained:**
- Graph `id`, `revision` and id-counter `state`.
- Transactions.
- Reroutes in ComfyUI's form.
- A ComfyUI interop extension that already preserves `definitions` verbatim.

Only subgraphs remain mutually unreadable between the two formats.

## Options

| Option | Interop | Our semantics | Cost | Risk |
|---|---|---|---|---|
| **A. Keep inline only** | ComfyUI ignores our subgraphs; we keep theirs only as opaque data | Unchanged | None | Subgraph authoring is built on a format that cannot express shared definitions, stable interface slot ids or promoted widgets |
| **B. Adopt the definition shape as our subgraph v2** (inline still loads) | Bidirectional at document level; interface, IO positions and exposed widgets map 1:1 | Needs explicit rules for shared definitions, event/action ports and ON_REQUEST across `-10`/`-20` | L: model, conversion, canvas navigation, migration, tests | Execution routing through virtual IO nodes; definition sharing changes edit semantics |
| **C. Inline, plus an export/import adapter only** | One-way conversion in the interop extension; no shared definitions | Unchanged | M | Two subgraph models to keep in sync; lossy for shared definitions and exposed widgets |

## Proposed decision

**Adopt B, in stages, as the document format for subgraph v2.** Do it only as part of the subgraph authoring work, and only after its acceptance criteria below are met. Until then, nothing changes.

Reasons:
1. Option B gives us a schema that a large ecosystem already validates and edits. Every other document feature (ids, state, reroutes, groups) now already matches it.
2. Stable interface slot ids and exposed widgets are exactly what component authoring needs: promoted controls and renaming without breaking links. Inventing a parallel shape would cost the same work and lose interop.
3. Shared definitions are optional in practice. Inserting a definition always copies it (new guid), as ComfyUI blueprints do. Linking instances becomes an explicit later choice, never an implicit side effect.

Keep from our model:
- The runtime still executes a nested `LGraph` per instance. A definition is the document; an instance materializes it.
- `graph/input` and `graph/output` remain the runtime boundary. Load and save map them to and from `inputNode`/`outputNode` + `inputs`/`outputs` (`-10`/`-20` link endpoints).
- Event/action ports and ON_REQUEST semantics are preserved. Our own fields record them (for example `litegraph_mode`, as the interop extension already does).
- Inline v1 subgraphs load forever. They are written in the new form only after a document is saved by a version that supports it.

## Acceptance criteria (all required before accepting)

1. **Conversion works:**
   - `buildFromNodes` converts a selection into a subgraph, and unpacking reverses it.
   - It is one transaction (one undo step).
   - Boundary links, events and ON_REQUEST inputs survive in both directions.
   - Node resources are not torn down and recreated without a defined policy.
2. **Round trip:**
   - Our inline fixtures load, run, save as v2 and reload with identical execution results.
   - ComfyUI subgraph fixtures load, edit and save, and still validate against ComfyUI's schema (probe as in `experiments/comfy-interop`).
3. **Identity:**
   - Definition guids, interface slot ids, node ids within a definition, and graph-path identity for nested instances are stable across save and load.
   - Inserting a definition always gets a new guid unless linking is requested explicitly.
4. **Execution:**
   - Data, events and ON_REQUEST cross nested boundaries with the existing fixtures, in the browser and in the Node runner.
5. **Compatibility:**
   - Documents that contain both inline and definition subgraphs load.
   - Older readers fall back to preserving `definitions` verbatim; the core already keeps unknown fields.

## Consequences

**If accepted:**
- The subgraph code moves to definition and instance types.
- The canvas gains interface editing (ordered inputs/outputs, rename without relinking) and later promoted widgets.
- The interop extension maps definitions directly instead of passing them through.

**If rejected (A or C):**
- Record why.
- Keep `definitions` opaque, as the core already does.
- Build authoring on the inline model, accepting that ComfyUI interop stops at top-level graphs.

## Provenance

- ComfyUI's schema was read as a specification only.
- No ComfyUI_frontend code (GPL-3.0 repository, license-ambiguous litegraph subtree) is copied.
- Any code adapted later must come from the MIT Comfy-Org/litegraph.js standalone at or before `ea0e1a8`, with attribution.
