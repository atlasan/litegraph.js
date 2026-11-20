# Wave 3a: subgraph definitions, linked instances, function node

> **Date** 2026-11-20 · **Kind** execution · **Status** final; the schema probe and the default flip are left open · **Base** `LG/wave3_subgraphs` @ `5d66f00` · **Plan** [Wave 3: subgraph system](../plans/2026-11-20-wave3-subgraph-system.md)

Part 3a of Wave 3 was built on `LG/wave3_subgraphs`, cut from `LG/dev` @ `5ca9750`. It delivered plan steps 1–5:
- Subgraphs are now stored as ComfyUI-style definitions. Each instance still runs its own nested graph.
- A root registry holds the definitions, and instances that share a definition stay linked.
- `graph/function` was rebuilt on top of definitions.
- The runner's denylist now checks every definition.
- The ComfyUI interop maps definitions directly.

The writer default stays `"inline"`. It flips to `"definitions"` once the ComfyUI schema probe passes (see Left open).

## Changes

- `1218ad4` `feat:` definitions and the registry (steps 1–2):
  - `src/subgraphdefs.js` (`SubgraphDefs`) holds pure JSON transforms between inline subgraphs and `definitions.subgraphs`:
    - `-10`/`-20` interface links;
    - stable slot ids (`slot_id` on `graph/input` / `graph/output`);
    - event ports written as `"event"` plus `litegraph_type`;
    - nested definitions flattened;
    - loose documents normalized;
    - cycles and depth refused.
  - `LGraph.subgraphs` (the registry) and `rootGraph`.
  - `configure` builds the inner graph of every instance that references a definition.
  - `serialize({format})` always writes the registry. The `"definitions"` format also replaces instances by references.
  - History and rollback snapshots stay inline.
  - New flags: `LiteGraph.subgraph_format`, `subgraph_max_depth`.
  - Security: `nodePolicy` visits every definition (used or not) and accepts instance types.
- `bafaf11` `feat:` linked instances (step 3):
  - `commitDefinition` (the canvas commits when it leaves a subgraph) refreshes the other linked instances as one root undo step.
  - `refreshFromDefinition` matches outer slots by slot id, then by name.
  - `makeUnique`.
  - Paste rules: equal content links; the same id with different content forks (`subgraph-forked`); setting `LiteGraph.Subgraph.PasteLinked`.
  - A root save picks up instances edited by code since their last sync.
- `0314979` `fix:` `attachCanvas` accepts a canvas from another copy of the library. Before this, opening any subgraph in `editor_build.html` threw.
- `663bf00` `feat:` `graph/function` on definitions (step 4):
  - `call` → inputs, one step, outputs → `done`.
  - Each function node has its own copy of the definition, which keeps state.
  - Interface events pass through.
  - Recursion is refused, and calls are limited in depth.
  - Older documents (`func_subgraph_id`) migrate.
  - The `hard_coded_value` / `hard_coded_output` hooks are removed.
- `e067387` `feat:` ComfyUI interop (step 5):
  - Exports are written in the definitions form.
  - Modes and placeholders are mapped inside definitions.
  - Our own documents (`litegraph_version`) are no longer taken for ComfyUI workflows, which would have read mode 4 as BYPASS.
  - Loaded IO boxes are written back unchanged.
- Each `feat:` / `fix:` commit has a `build:` commit after it.

### Design changes made while building (the plan is updated)

- **The registry is the source for linked content.** A save writes each definition from the registry, not from one instance's runtime, so execution state such as counters and property drift is never saved. Content changes reach the registry in three ways:
  - by commit;
  - when an instance is first registered;
  - at a root save, for instances whose inner graph `revision` moved since their last sync (edits made by code).
- **No forking at save.** Forking happens only when content is inserted: a paste or insert brings an id that is already known, with different content.
- **The inline format also writes the registry.** Older readers keep `definitions` verbatim and still run the inline instances, and undo snapshots restore the registry along with the instances.

## Verification

| Check | Result |
|---|---|
| `npm run check` | lint clean, 12 builds, strict types, **422/422 Jest** (up from 389), **93/93 integration** (up from 92), package check |
| Whole Jest suite with `subgraph_format = "definitions"` as the default | 403/403 (one-off run before step 3) |
| New tests | <ul><li>`subgraph-definitions` (14): form, round trips, event ports, nesting, linking, old documents, the 5 SA fixtures, cycles, pure transforms</li><li>`subgraph-linked` (10): commit, undo, rename, reorder, make unique, paste link/fork, setting, sync on save, commit on canvas close</li><li>`subgraph-function` (7)</li><li>`comfy-interop` (+2)</li><li>`runner-security` (+1)</li></ul> |
| SA fixtures | `test/fixtures/sa-subgraphs.json`, from Comfy-Org/litegraph.js @ `ea0e1a8` (MIT): all 5 load with their interface |
| Browser `editor_build.html` | <ul><li>Const 5 → [Square] → Watch, plus a `graph/function` that picked "Square · …" from its combo.</li><li>A real click on its `call` button gave 25, and the node did not move.</li><li>A real double-click opened Square; `*` was changed to `+`, then the subgraph was closed.</li><li>Both watches show 10; the definitions save has one definition, and the instance type is its guid</li></ul> |
| Browser findings fixed | <ul><li>The function node's `call` button overflowed the node (`computeSize` now counts widgets, with a minimum width of 220).</li><li>Opening a subgraph in `editor_build.html` threw (`0314979`)</li></ul> |

### ADR 0001 acceptance criteria

| # | Criterion | State |
|---|---|---|
| 1 | Conversion: one transaction, boundary links, events, ON_REQUEST, resource policy | Met (Wave 2a; refresh restarts inner nodes, as on load: documented) |
| 2 | Round trip: inline fixtures → v2 → identical execution; ComfyUI fixtures load, edit, save and **validate** | Partly met: execution and the exact document round trip are tested; **validation against ComfyUI's schema is not run yet** |
| 3 | Identity: guids, slot ids, inner node ids, inserted copies | Met (stable across save and load; inserts link or fork as decided in W3-1). Path ids are step 9 (3b) |
| 4 | Execution: data, events and ON_REQUEST across nested boundaries, browser and Node runner | Met in Jest and the browser. The runner loads definitions (policy test); no runner run test with definitions yet |
| 5 | Compatibility: mixed documents; older readers keep `definitions` | Met (the inline format writes both) |

## Left open

- **ComfyUI schema probe:**
  - This needs ComfyUI_frontend's `workflowSchema.ts` (GPL-3.0, local and never committed) and `zod@4`, as `experiments/comfy-interop/README.md` describes.
  - Both downloads wait for the user's approval.
  - After the probe passes:
    - `LiteGraph.subgraph_format` flips to `"definitions"`;
    - ADR 0001 is accepted;
    - criterion 2 is closed.
- **A runner run test** that pushes a definitions document and checks its outputs (criterion 4).
- **3b and 3c** as planned: open button and breadcrumb, interface editing, promoted widgets, path ids, components and blueprints, the SA test port.
