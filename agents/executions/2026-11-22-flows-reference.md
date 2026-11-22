# Flows track, reference: node reference, pack descriptions, catalog test

> **Date** 2026-11-22 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `b6bcc1d` · **Plan** [flows reference and examples](../plans/2026-11-22-flows-reference-examples.md)

Steps A1–A3 of the plan, on `LG/dev_flows_reference`:
- **`npm run docs:nodes`** (`tools/node-reference.mjs`) builds the node reference from the registry.
- **Packs:** every builtin pack has a description.
- **`def.usage`** is passed through `describeNodeType`.
- **Descriptions:** every bundled node type has one.
- **Catalog test:** a node:test file creates all 273 bundled types.

## Changes

- **`tools/node-reference.mjs`:**
  - **`loadCatalog()`:** loads gl-matrix as a global script, then `build/litegraph_nodejs.full.js`, the bundle with every shipped pack.
  - **`withBrowserStubs()`:** sets `window`, `document` (jsdom, with a stub 2D context) and a fake `AudioContext` only while a browser type is constructed, then removes them.
  - **`buildReference(LiteGraph)`:** returns the JSON and the pages, deterministic (code-point order, no dates).
  - **The CLI:** writes `docs/nodes/README.md`, one page per pack with nodes (25) and `nodes.json`.
  - **Slots:** read from `def.inputs`/`def.outputs` when declared, otherwise from one instance.
  - **Execution column:** the flags, plus the default mode per non-legacy model computed with `ExecutionEngine.declaredDefaultMode`.
- **`docs/nodes/` is git-ignored** (roadmap D9, postponed by the user). `check:fresh` and CI are unchanged.
- **`describeNodeType`:** returns `usage` (`def.usage` or a static `usage`). Typed in `NodeDefinition`. Usage text on FOR, ForEach, WHILE, IF, Sequence, Timer, Delay and `graph/function`.
- **Pack descriptions:** all 27 builtin `packs.open(...)` calls, including `litegraph/core` (`src/litegraph.js`) and the two packs that register no types (`watch`, `others`).
- **Node descriptions:** 25 types had none (geometry ×4, `math/spikes`, `math3d/mat4`, `shader::*` ×12, `sys/file*` ×5, `sys/processInfo`, `widget/internal_slider`). Seven titles that were class names now have real titles (Spikes, Process info, File read/write/delete/exists/list).
- **`tools/tests/node-catalog.test.mjs`:**
  - every type is created;
  - every type has a title, a description and a pack;
  - every builtin pack has a description;
  - the reference lists each type once with its definition's fields;
  - one page per pack, linked from the README, with one section per category.
- **Test first:** `test/node-definitions.test.js` checks `usage` (it failed before the change).

## Verification

| Check | Result |
|---|---|
| `npm run check` | lint clean; 12 builds; types parity; 803 Jest (26 golden snapshots unchanged); 103 node:test (4 new); package check |
| `npm run docs:nodes` | 273 types, 25 packs; pages read: README, events, math. FOR, Timer and `math/operation` rows show their slots, declarations and usage |
| Construction without a browser | all 273 bundled types construct with the stubs. Before the stubs: 14 failed (13 audio, `graphics/canvas`) |

## Findings

- **Not bundled:** `threejs.js` and `device.js` are in no bundle, so they are not in the reference. Neither opens a pack. This matches the codebase map's "unbuilt node files".
- **Empty packs:** `litegraph/watch` registers no type of its own, because the watch displays extend `basic/watch` from the basic pack. `litegraph/others` only sets slot-type defaults. Both packs are kept and described; the reference skips packs without nodes.
- **`LGAudio.getAudioContext`** assigns `window.AudioContext` but constructs the global `AudioContext`. The stub sets both.

## Left open

- D9: commit `docs/nodes/` or generate it in CI (postponed).
- Usage text on more node types: the field is ready, and the reference shows it.
