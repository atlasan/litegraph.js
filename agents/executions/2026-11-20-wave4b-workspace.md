# Wave 4b: workspace state and execution

> **Date** 2026-11-20 · **Kind** execution · **Status** final · **Base** `LG/wave4b_workspace` @ `129d559` · **Plan** [Wave 4: ecosystem and workspace](../plans/2026-11-20-wave4-ecosystem-workspace.md)

Part 4b delivered plan steps 6–10 on `LG/wave4b_workspace`, cut from `LG/dev` @ `c949e70`: the change stream and viewport event (H9), the dirty flag, draft autosave (W4-5), the execution-state protocol shared with the runner (W4-4), and node overlays with split title drawing and icons (H2).

## Changes

- `105521a` `feat:` workspace state and execution:
  - **`graph-changed {kind, kinds, action, revision, graph}`:** one per recorded change (one per transaction). Typed events name the kinds (`node-added`, `node-removed`, `link`, `property`, `widget`, `reroute`, `subgraph`, `node-replaced`); history actions name the rest (`layout`, `group`, …). Edits from code that record no history entry are reported once in a microtask. A subgraph change also reaches the root with kind `subgraph`. A load reports `configure` with `reason`.
  - **Saved state:** `isModified`, `markSaved`, `markModified`, `modified-changed`. Undo back to the saved revision is clean again.
  - **`viewport-changed`** on the canvas, checked once per drawn frame (no timer).
  - **Draft autosave:** `DraftAutosave` (debounced, only for a modified document, removed on `markSaved`); the Editor offers Restore / Discard for a draft left from an earlier session, shows "• modified" and prefixes the page title. The demo Save, Download and Empty mark the document saved.
  - **Execution state:** `src/executionstate.js` (`LiteGraph.ExecutionState`, messages `{v: 1, kind, path, status, value, max, message, time}`). `runStep` reports one `done` per node and the failing node's `error` with its path; root `start()` reports `reset`; `node.reportProgress`, `node.setExecutionStatus`; `graph.applyExecutionState` for received messages. Paths are computed only when someone listens.
  - **Runner:** workers post `execution-state`; `graphManager.setExecutionStateCallback`; `wsHandler` broadcasts `execution_state {graphId, message}` (documented in `docs/development.md`).
  - **Canvas:** `drawNodeTitleText` (icon from `node.icon` or `def.icon`, then the title), status colour in the title box, `drawNodeExecutionOverlay` (outline while running or failed, progress bar, error text); setting `LiteGraph.Canvas.ExecutionOverlays`.
  - **Order fixes found by the tests:** the add, remove, connect, disconnect and reroute paths emitted their typed event after recording the change; they now note the kind first (`_markChange`) so one change gives one `graph-changed`. A widget bound to a property writes the property before the change is recorded.
- `129d559` `build:` regenerated distributions.

## Verification

| Check | Result |
|---|---|
| `npm run check` | lint clean, 12 builds, strict types and export parity (`ExecutionState`; `DraftAutosave` in the Node bundle), **534/534 Jest** (up from 522), **95/95 integration** |
| New tests | <ul><li>`workspace-state.test.js` (12): kinds per edit and per transaction, code edits coalesced; subgraph bubbling and configure; viewport event; modified flips, undo to saved, load clean, subgraph edits, markModified; draft written after the delay, removed on save, broken draft ignored; protocol create/validate/apply/reset; one `done` per node over three steps, inner error by path, reset on start; progress and status without path cost; icon before title, outline, progress bar width, error text, setting; definition icon</li><li>`runner.test.mjs`: the subgraph workflow broadcasts `reset`, then one `done` for the inner node `2:3`</li></ul> |
| Browser, `editor_build.html` (port 8001, real clicks) | <ul><li>Widget arrow and node drag: "• modified" and "• LiteGraph" title; after 2.5 s a draft with the new value is stored.</li><li>Reload: "Unsaved draft … (2 nodes)" with Restore / Discard; Restore brings the graph back as modified; Save clears the marker and removes the draft.</li><li>`⚙` icon before "Const Number"; "A + B" with `reportProgress(3, 4)` shows a yellow outline and a ¾ bar; Watch with an error shows a red outline and "input out of range"; Play resets them and the nodes turn green (done).</li><li>Fixed during the check: the marker squeezed the header buttons, and the restore bar wrapped; both repositioned.</li></ul> |

## Left open

- A `done` status colours the title box green after a run; there is no setting to show only running and errors.
- The runner page (`headless/graphrunner/public`) does not draw the broadcast states yet; an editor connected to a runner can apply them with `applyExecutionState`.
