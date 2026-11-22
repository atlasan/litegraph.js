# Flows track, examples: manifest, Demo menu, pack templates, examples test, audit finding 10

> **Date** 2026-11-22 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `dab4107` · **Plan** [flows reference and examples](../plans/2026-11-22-flows-reference-examples.md)

Steps C1–C4 of the plan, on `LG/dev_flows_examples`:
- every example file has a manifest entry;
- the editor's Demo menu is built from the manifest and the active packs' templates;
- a test runs every non-wip example;
- audit finding 10 is explained and fixed.

## Changes

- **`apps/editor/examples/index.json`** has 34 entries, one per file. The fields are `id`, `file`, `title`, `description`, `category`, `profile`, `flow`, `tags`, `packs` and `level`, plus `needs` on the 2 network and 3 audio examples. 20 entries are runnable and 14 are `wip`.

  | Category | Examples |
  |---|---|
  | `flows/blueprint` | 2 |
  | `flows/stepped` | 1 |
  | `flows/mixed` | 2 |
  | `subgraphs` | 3 |
  | `ui` | 5 |
  | `audio` | 4 |
  | `graphics` | 1 |
  | `network` | 2 |

  - `flows/dataflow`, `flows/realtime` and `flows/reactive` have no example yet; they come with step 7 of the direction plan.
  - `three/threeJsMovingCube` is `wip`, because `threejs.js` is in no bundle.
- **`apps/editor/js/examples.js`** has no DOM access at import:
  - `fetchExampleManifest`;
  - `exampleGroups(manifest, templates)`: the manifest's category order; hidden and empty categories left out; unknown pack categories last;
  - `fillDemoSelect`: one `<optgroup>` per category.

  `code.js` uses it in place of the 11 hard-coded `addDemo` calls. "Empty" and "autobackup" stay. The example files keep their paths, so old links still work.
- **`LiteGraph.packs.listTemplates()`** (`src/packs.js`, typed as `PackTemplate`):
  - returns the templates of active packs in the manifest's shape;
  - needs an `id` and a `url` (relative, http or https) or inline `data`;
  - skips other entries and disabled packs.

  The Demo menu shows a pack's templates in their category, labelled with the pack.
- **`tools/tests/examples.test.mjs`:**
  - **Manifest coverage:** every file once, with the required fields and known categories.
  - **Menu grouping.**
  - **Per runnable example:** it loads without missing nodes, `checkExecution()` is clean under `ancestors` after `applyExecutionModelModes()`, it runs 5 steps on a fixed clock and seed without errors or dropped events (`no-handler` and `mode` excepted), and its link data matches `tools/fixtures/examples-outputs.json`.
  - **Exceptions:** network and audio examples load and check only.
  - **Environment:** the test runs against `src/` with the editor's demo nodes (`apps/editor/js/demos.js`). It leaves out the WebGL packs, because `vendor/litegl.js` needs a `window` at import and no runnable example uses them.
  - **Snapshot:** rewritten with `UPDATE_EXAMPLE_SNAPSHOTS=1`.
- **`withBrowserStubs`** (`tools/node-reference.mjs`) also stubs `XMLHttpRequest`, so the audio examples' sound loads stay pending.
- **Golden tests:** `test/execution-golden.test.js` reads frozen copies of its 8 examples in `test/fixtures/golden-examples/`, so the examples library can change without moving the compatibility snapshots. The snapshots are unchanged.

## Audit finding 10: `ancestors/check_subgraph` drops 3 events as `refreshing`

1. **The document:** root node 5 (`events/counter`) was saved in ON_REQUEST mode (4), with its `change` and `onExecuted` outputs connected. Each pull ran it, and the events it fired during the pull were dropped. This is rule A4: an event emitter cannot be ON_REQUEST, and `checkExecution` reports it as `on-request-emitter`.
   - **Fix:** the example's counter is now ALWAYS.
2. **The engine:** with the counter ALWAYS, one drop remained. An ALWAYS node that has not run yet is pulled for its first value (Wave 6), and the counter's connected `onExecuted` pin fired inside that pull.
   - **Fix:** `ExecutionEngine.requestOrigins` no longer pulls an ALWAYS node with a connected event output (`emitsEvents`). Like a ticking node, it gives its value at its turn.
   - **Test:** `test/execution-models.test.js`, "an ALWAYS emitter is not pulled for its first value". It failed before the fix with 3 `refreshing` drops.
3. **Result:** the example checks clean and drops nothing under `ancestors`, in the test and in the browser.

## Verification

| Check | Result |
|---|---|
| `npm run check` | lint clean; 12 builds; types parity; 856 Jest (26 golden snapshots unchanged); 125 node:test (22 new); package check |
| `tools/tests/examples.test.mjs` | 22 tests; stable over 3 runs; with the old `check_subgraph` document it fails on `events/counter on-request-emitter` (checked) |
| Browser: `editor_build.html` on port 8001 (`.claude/editor-8001.mjs`, ignored; 8000 was busy) | Demo menu shows 8 groups (event scripting, stepped, mixed, subgraphs, editor and widgets, audio and MIDI, graphics, network), no `wip`. Chose "Timer, random and branch": 6 nodes loaded. Clicked Discard on the draft bar, then Play: the graph ran (timer ticking, branch firing). Chose "Events across subgraph boundaries": 8 nodes; after setting `ancestors` and applying modes, `checkExecution` has no issues and the counter is ALWAYS. Console errors: only the MIDI pack's Web MIDI permission errors |

## Left open

- No example yet for `flows/dataflow`, `flows/realtime` or `flows/reactive`, and none per pack (direction plan step 7).
- Builtin packs ship no `templates[]`; the API and the menu support them.
- The native `<select>` popup does not render in the browser pane, so the options were chosen through the element, which fires the page's `change` handler.
