# Flows track: node reference, declaration pass, examples library

> **Date** 2026-11-22 · **Kind** plan · **Status** accepted · **Base** `LG/dev` @ `b6bcc1d`

This plan delivers steps 1 to 3 of the [flows direction](2026-11-22-flows-direction.md):
- a node reference generated from the registry;
- execution declarations for the node types that have none;
- an examples library that the editor's Demo menu is built from.

They come first because the user wants new engine features (call scopes, lifecycle events, profiles) to land on documented nodes and runnable examples. None of the three depends on [Wave 7](2026-11-22-event-integration.md).

## Context

- **Evidence:** the [event flows audit](../audits/2026-11-22-event-flows-audit.md):
  - §2: the registry; 244 of 293 types declare no execution needs.
  - §3: the examples under each model.
  - Findings 5, 10, 11 and 12.
- **Ideas promoted:**
  - FLW-23 (node reference, absorbs USE-06);
  - FLW-22 (examples library).

  Both are on one [card](../ideas/cards/FLW-22-node-reference-and-examples.md).
- **APIs used:**
  - `LiteGraph.describeNodeType` / `listNodeDefinitions` / `declareNodeExecution` (`src/litegraph.js:384`);
  - `LiteGraph.packs` (`src/packs.js`): manifests with `description` and `templates[]`;
  - the execution engine (`src/execution.js`).
- **Codebase map:** [codebase](../memories/codebase/README.md).

## User decisions (2026-11-22)

| Question | Decision |
|---|---|
| Wave number | **None.** This is a parallel track, not a milestone. It runs on temporary branches `LG/dev_flows_reference`, `LG/dev_flows_declarations` and `LG/dev_flows_examples`, each cut from `LG/dev` and merged back when done. Numbered waves are kept for milestone build-and-verify passes. |
| Generated `docs/nodes/` | **Postponed.** `npm run docs:nodes` writes the pages locally; `docs/nodes/` is git-ignored. It is not committed, not generated in CI and not in `check:fresh`. Committing or generating in CI is a later decision (roadmap D9). |
| Where examples come from | **The app manifest and the packs' `templates[]`.** The Demo menu merges `apps/editor/examples/index.json` with the templates of the active packs. |

## Scope

**In:**
- `tools/node-reference.mjs` and `npm run docs:nodes`.
- A `description` on every builtin pack, `def.usage`, and descriptions for undescribed node types.
- A catalog test.
- Declarations (`pure`, `ticks`, default modes) for the undeclared types in audit §2.
- `apps/editor/examples/index.json`, the Demo menu built from it plus the pack templates, and an examples test.
- Audit finding 10, investigated.

**Out:**
- A `volatile` declaration kind and call scopes. These are step 4 (FLW-01, FLW-02). Volatile nodes stay ALWAYS and get a code comment.
- Graph profiles (FLW-08). The `profile` field of the manifest names the intended profile now; profiles come in step 6.
- New examples per flow category (step 7). This plan catalogs the existing ones.
- `threejs.js` and `device.js`, which no bundle includes.

## Steps

| # | Step | Acceptance check |
|---|---|---|
| A1 | **Catalog loader and reference builder.** `tools/node-reference.mjs`:<ul><li>loads `build/litegraph_nodejs.full.js` (every bundled pack) with gl-matrix and stubbed DOM and Web Audio;</li><li>creates each type to read its slots;</li><li>`buildReference(LiteGraph)` returns the JSON and the Markdown pages.</li></ul>The CLI writes `docs/nodes/README.md`, one page per pack and `nodes.json`. | `npm run docs:nodes` writes the files; a reviewer reads them |
| A2 | **Pack descriptions and `def.usage`.** Every builtin `packs.open(...)` gets a `description`. `describeNodeType` returns `usage`. Every bundled type has a non-empty description. | `test/node-definitions.test.js`: `usage` is passed through |
| A3 | **Catalog test.** `tools/tests/node-catalog.test.mjs`:<ul><li>every registered type is created;</li><li>only types that declare the `audio` or `webgl` capability may fail without a browser;</li><li>every type has a title and a description, and every pack has a description;</li><li>the reference JSON lists each registered type once, with its definition's fields.</li></ul> | `npm run test:integration` |
| B1 | **Declaration pass**, pack by pack: `pure` for deterministic nodes, `ticks` for time- and history-based nodes, default modes for stateful ones. Volatile nodes stay ALWAYS, with a comment that points to FLW-02. | Declaration counts in the execution record; `checkExecution` is clean on the examples after the model's node modes are applied (C3) |
| B2 | **Compatibility.** | `test/execution-golden.test.js` snapshots unchanged; any changed `ancestors` result has a test and a reason |
| C1 | **Manifest.** `apps/editor/examples/index.json` with `{id, file, title, description, category, profile, flow, tags, packs, level}` for every example file:<ul><li>categories: `flows/*`, `subgraphs`, `ui`, `audio`, `graphics`, `network`, `3d`, `wip`;</li><li>`LiteGraph.packs.listTemplates()` returns the templates of the active packs in the same shape.</li></ul> | `test/packs.test.js` (templates); C3 checks the manifest's files |
| C2 | **Demo menu.** Built from the manifest and the pack templates, with `<optgroup>`s per category; `wip` hidden. Example paths are unchanged, so old URLs keep working. | Browser check on `editor_build.html` with real clicks |
| C3 | **Examples test.** `tools/tests/examples.test.mjs`. Every non-`wip` example:<ul><li>loads without missing nodes;</li><li>`checkExecution()` is clean after the model's modes are applied;</li><li>runs N steps;</li><li>its outputs match a stored snapshot.</li></ul> | `npm run test:integration` |
| C4 | **Audit finding 10** (`ancestors/check_subgraph` drops 3 events as `refreshing`): find the cause, then fix it or record it. | A test, or a recorded reason |
| D | **Docs.** A guide pointer to `docs/nodes/`, `CHANGES.md`, the codebase map, one execution record per part, and the roadmap track row. | Links resolve |

## Risks and open questions

- **Browser-only packs:** audio and WebGL nodes cannot run in Node. With stubs they create and show their slots; behaviour is checked in a browser only.
- **Declarations change how `ancestors` runs:**
  - A node declared `pure` gets ON_REQUEST from "Apply the model's node modes".
  - A declared default mode changes new nodes under the non-legacy models.

  Saved documents keep their modes, so `legacy` goldens must not move.
- **Snapshot churn:** example output snapshots are rewritten only on purpose. Volatile outputs (time, random) are left out of the snapshot.

## History

- 2026-11-22: accepted; promoted from the flows direction plan (steps 1–3). The user chose a named track instead of a wave number, deferred committing `docs/nodes/`, and chose examples from the manifest and the pack templates.
