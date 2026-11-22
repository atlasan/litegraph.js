# FLW-22 and FLW-23: examples library and node reference per library

| Field | Value |
|---|---|
| Purpose | P9 Education; P10 The host itself (see [purposes](../purposes.md)) |
| Kind | app (docs tooling) + ext (editor Demo menu) |
| Area | [execution flows](../landscape/execution-flows.md); FLW-23 promotes USE-06 from the [census](../landscape/litegraph-census.md) |
| Inspiration | UE Content Examples; Blender manual pages per node; TouchDesigner's per-operator wiki; ComfyUI example workflows |
| License of the inspiration | design reference only |
| Effort | M |
| Maturity | sketched (the user put this first, 2026-11-22) |
| Depends on | `LiteGraph.describeNodeType`/`listNodeDefinitions` (`src/litegraph.js:384`); packs (`src/packs.js`); FLW-08 for the example profiles |
| Last reviewed | 2026-11-22 |

## Why

- **No node reference:** `docs/` has the generated core API (`docs/api/`, jsdoc) and the guide, but nothing about the node types themselves.
- **No pack descriptions:** the builtin packs have none (`packs.open({id, version, title, builtin})` in each `src/nodes/*.js`).
- **The examples are mostly hidden:**
  - 34 files in `apps/editor/examples/`, of which 11 are in the hard-coded Demo combo (`apps/editor/js/code.js:124`);
  - `node_execution_modes.json` and `ancestors/*` are not listed;
  - none says which flow style it shows.
- **No catalog test:** nothing proves that every registered type creates cleanly.

## What it would look like here

**Node reference (FLW-23):**
- `tools/node-reference.mjs` (`npm run docs:nodes`) loads the registries and writes:
  - `docs/nodes/README.md`: the packs, with descriptions, node counts and flow categories;
  - `docs/nodes/<pack>.md`: one table per category with type, title, description, inputs/outputs (`name:type`), execution (modes, pure/volatile, ticks, loop), and usage;
  - `docs/nodes/nodes.json`: the same, for search and agents (USE-06).
- **Sources:** `describeNodeType` (`description`, `inputs`, `outputs`, `execution`, `pack`, `capabilities`), plus a new optional `def.usage`, and `description` on every `packs.open(...)`.
- **Freshness:** `check:fresh` covers `docs/nodes`, as it does the builds.

**Examples library (FLW-22):**
- **`apps/editor/examples/index.json`** with entries `{id, file, title, description, category, profile, flow, tags, packs, level}`.
  - The categories follow the [flow categories](../landscape/execution-flows.md#flow-categories): `flows/blueprint`, `flows/dataflow`, `flows/realtime`, `flows/stepped`, `flows/reactive`, `flows/mixed`.
  - The topics are `subgraphs`, `ui`, `audio`, `graphics`, `network`, `3d`, and `wip` (hidden).
- **Demo menu:** built from the manifest and grouped by category, replacing the hard-coded list. The old example URLs keep working (rule W5-3).
- **Example sets:**
  - **General:** one per flow category (blueprint door with BeginPlay/Tick/custom event; material preview; audio synth; cellular automaton; form; game loop with UI).
  - **Specific:** per pack, at least one example that uses its main nodes.

**Tests:**
- `test/node-catalog.test.js`: every registered type is created (WebGL and audio stubbed, or skipped by `capabilities`), has a title and description, and matches `nodes.json`.
- `test/examples.test.js`: every non-`wip` example loads, `checkExecution()` reports no issues, it runs N steps without errors, and its outputs are snapshotted.

## Prior art

- **USE-06** (seed): a node reference generated from the registry ([census](../landscape/litegraph-census.md)).
- **The tester app** already creates every node type (`apps/tester/js/test-generator.js`, `analyzeNodeType`); the catalog test can reuse its stubs.
- **CFY-43:** template pack format. The pack manifest's unused `templates[]` field (`src/packs.js`) could carry the examples of a pack.

## Open questions

- **Where the examples live:** in the editor app (today), or in each pack's `templates[]` so third-party packs ship their own? Proposed: both, with the manifest reading the packs' templates as well.
- **Generated docs and the repo:** commit `docs/nodes/` (like the builds) or generate in CI only? Proposed: commit, so GitHub renders them.
- **Browser-only packs:** how far can jsdom go with WebGL and Web Audio stubs, and which types need a browser run instead?

## Smallest experiment

A 50-line script that prints `listNodeDefinitions()` grouped by pack as Markdown for the `math` and `events` packs, to check that `describeNodeType` has enough to make a useful page.

## History

- 2026-11-22: created. The user chose to do the reference and the examples before new engine features.
