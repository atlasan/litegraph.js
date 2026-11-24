# Editor examples polish

> **Date** 2026-11-23 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `d47f5ef` · **Audit** [editor examples](../audits/2026-11-23-editor-examples.md)

The editor examples were audited in the browser ([audit](../audits/2026-11-23-editor-examples.md)), then fixed on `LG/dev_HMD_examples`. Every listed example now states its execution model with the model's node modes applied, has nodes at least as large as `computeSize()`, and carries a note (a group whose title explains it). Four examples were rewritten because they were wrong or unreadable, eleven were added, and the examples test was made stricter. Six library bugs found on the way were fixed with tests.

**User decisions (2026-11-23, in the session):**
- The ten proposed new examples and the WHILE rewrite: yes.
- "Copy and paste" stays: it is the example of a feature, explained by its group texts. Each feature, extension and pack should get its own guide; recorded as idea FLW-28.
- "Node execution modes": expanded to what is new (BYPASS, NEVER, the models), for the user to review.

## Changes

- `dae2397` `fix:` a removed WebSocket node no longer reconnects; the button and audio debug warnings are gone (`cd16fb4` `build:`); `a3e33dc` `build:` for the second fix.
- `f8e69be` `fix:`:
  - `applyExecutionModelModes()` marks a changed subgraph instance as edited, so the definition saved with the document carries the new modes (before, they were lost on save);
  - `basic/jsonparse` parses on its action before the graph ran and sets its object output before `done`;
  - `widget/toggle` and `widget/combo` set their value output before their change event (needed under the `event` model);
  - `widget/number` shows the decimals of its step after loading; `widget/hslider` outputs its value before it was drawn;
  - group titles wrap inside the group and clear of the header toggle;
  - tests: `test/network-websocket.test.js`, `test/interface-nodes.test.js`, `test/base-nodes.test.js`, one case each in `test/execution-models.test.js` and `test/canvas-lifecycle.test.js`.
- `8e09e1b` `feat:`: the examples, the manifest, the stricter test and its snapshot, these records.

**Examples:**

| Kind | Examples |
|---|---|
| New: Basics | Widgets to Watch, Button counter and watch, Sequence and branch, FOR loop, Strings, Objects and JSON |
| New: flows | Numbers and math (dataflow), Realtime wave (realtime), Stepped accumulate (`strict`), Reactive form (`event`) |
| Rewritten (same id and file) | `while-console` (WHILE loop, now in Basics), `node-execution-modes` (six boxes: Always, On event, On trigger, On request, Never, Bypass; a note on the models), `check-frame-value` (the variable was never set), `random-console` (moved to event scripting; Watch and Counter instead of console only) |
| Polished | `lg-docs`, `features`, `benchmark` (spread out), `copypaste`, `autoconnect`, `html-nodes`, `subgraph`, `check-subgraph`, `function-replication`, `audio`, `audio-delay` (knobs named), `audio-reverb`, `midi-generation` (`needs: midi`), `image-fade` (an unconnected button removed), `websocket-client`, `cdn-libraries` |
| Removed | none; the 14 hidden `wip` files are unchanged |

**How:** the examples were built and resized in the editor page itself, so `computeSize()` used the canvas's real text measurement. Throwaway scripts (not committed) loaded each original file, set the model, applied its modes, fitted nodes and groups, added the note, and wrote the file back through a local dev-only receiver. The new examples were built with `LiteGraph.createNode` and `connect` in the page.

**Editor convention found:** `apps/editor/js/defaults.js` sets `allow_multi_output_for_events = false`, so an event output links to one input. The examples fan events out with a Sequence instead.

## Verification

| Check | Result |
|---|---|
| `npm run check` (before `f8e69be`) | exit 0: 989 Jest (57 suites), 145 integration, 12 builds, types and package checks |
| `node --test tools/tests/examples.test.mjs` | 33 pass: 30 listed examples, manifest, menu, flow categories |
| Browser, `editor_build.html`, each new example | Built in the page; Play, Step and real clicks: Button counter (+1 ×3, −1 → Watch 20), Reactive form (combo arrow, toggle → Watches L and true without Play), Stepped accumulate (Step ×3 → 6, 3, 3), FOR (Run → 5 iterations, index 5), WHILE (Run → 5 rounds), Objects (Parse → Ada, keys, new year), Node execution modes (all six boxes as their notes say) |
| Browser, Demo menu after saving | "FOR loop": Run clicked, Index and Rounds show 5; "Timer, random and branch": Play 6 s, last hit 0.798 > threshold 0.7, threshold shown as 0.7 |

## Left open

- **The editor does not fit the view to a loaded example:** on a small window the right part of a wide example is off screen. A "fit view" on load (or a stored view per example) would help.
- **Guides per feature, extension and pack:** idea FLW-28.
- **The `wip` examples** stay hidden and unpolished; several need node types that are not bundled (jQuery, OSC, three.js nodes).
- **Node sizes in the test** use the Node fallback text estimate, not the canvas measurement; the examples were sized to fit both.
- **Watch shows objects as `[object Object]`** in its default display; the examples use the `tree` display for objects, which hides the node title.
