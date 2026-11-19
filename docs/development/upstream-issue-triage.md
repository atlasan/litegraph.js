# Upstream issue triage (jagenjo/litegraph.js)

Checked on 2026-11-19 against branch `LG/bug_test_fixes`. The upstream repository had
132 open issues. About 80 are questions, feature requests or support threads and were not
examined beyond their title. The 50 that describe a defect were checked against this fork:
by reading the code and, where possible, by running a reproduction against
`build/litegraph.js` or in the editor.

Regression tests for every fixed item are in `tools/tests/upstream-issues.test.mjs`
(plus `undeclared-names.test.mjs` for the strict-mode class of bugs). Each of them fails on
the code before the fix.

## Fixed here

| Issue | Problem | Fix |
|---|---|---|
| [#530](https://github.com/jagenjo/litegraph.js/issues/530) | `connect()` called `onBeforeConnectInput` with the node instead of the slot, ignored a plain numeric return, and kept the input from the original slot. | The hook gets the slot and may return another index (plain or `{return_value}`) or `false` to refuse. The input is re-read after a redirect. (`src/lgraphnode.js`) |
| [#529](https://github.com/jagenjo/litegraph.js/issues/529) | Cloning a subgraph containing a subgraph with `use_uuids` threw `reassignGraphUUIDs is not defined`. | Recurses through `this.reassignSubgraphUUIDs`, merges with `Object.assign`, and returns the id map. (`src/subgraph.js`) |
| [#528](https://github.com/jagenjo/litegraph.js/issues/528) | `cloneObject(obj, target)` copied a shorter array over a longer one, so removed inputs came back on clone/configure. | Arrays are truncated to the source length. Objects still merge. (`src/litegraph.js`) |
| [#527](https://github.com/jagenjo/litegraph.js/issues/527) | `events/waitAll` fired after the first input because it sized its flags by `outputs`. | Sized by `inputs`. (`src/nodes/events.js`) |
| [#481](https://github.com/jagenjo/litegraph.js/issues/481) | `configure()` passed the link index instead of the output slot to `onConnectionsChange`. The inner loop shadowed `i`. | Renamed the inner index. (`src/lgraphnode.js`) The other half of the issue (null `link_info` from broken data) is as upstream explained. |
| [#430](https://github.com/jagenjo/litegraph.js/issues/430) | `graph.clear()` left the node panel open: `sendActionToCanvas` dropped every action sent without arguments (`clear`, `checkPanels`) and crashed on a single non-array argument. | Takes no arguments, one value or a list. The canvas `clear()` closes panels. (`src/lgraph.js`, `src/lgraphcanvas.js`) |
| [#475](https://github.com/jagenjo/litegraph.js/issues/475) | Numpad Enter added a newline in property fields. | Checks `e.key` instead of `e.code`. (`src/lgraphcanvas.js`) |
| [#457](https://github.com/jagenjo/litegraph.js/issues/457) | Link arrows and flow dots used the spline formula in LINEAR and STRAIGHT modes, so they sat off the line. | `computeConnectionPoint` walks the same polyline `renderLink` draws. |
| [#451](https://github.com/jagenjo/litegraph.js/issues/451) | `graph.add()` replaced any size with `computeSize()`. This also shrank 29 node types that declare their own size (e.g. `graphics/frame` 200×200 → 70×30). | Only nodes on the generic default size are auto-sized. Other sizes are kept and only grown to fit. **Visible change:** node classes are drawn at their declared size again (e.g. `basic/const` is 180 wide, not 140). |
| [#377](https://github.com/jagenjo/litegraph.js/issues/377) | Text widgets displayed at most 30 characters. | The value is trimmed to the space beside the label, with an ellipsis (`LGraphCanvas.fitText`). |
| [#361](https://github.com/jagenjo/litegraph.js/issues/361) and related | Undeclared variables throw in ES-module strict mode. The graph Options panel crashed (`panel`), and so did html event nodes (`action`), jQuery nodes (`elements`), `logic/while`, `watch` expansion, `subgraph.buildFromNodes`, the curve editor and more. The Options panel also needed `LiteGraph.availableCanvasOptions`, which only an extension defined. | Declared or corrected each name. `availableCanvasOptions` now has a default in core. `tools/tests/undeclared-names.test.mjs` runs ESLint `no-undef` over `src` with browser globals. |
| [#332](https://github.com/jagenjo/litegraph.js/issues/332) | The gamepad node only redrew on mouse moves. | Marks the canvas dirty when it reads a pad. |
| [#307](https://github.com/jagenjo/litegraph.js/issues/307) | Dragging a link showed the previous drag's highlighted slot. The output highlight never updated (missing `!`) and used the input's shape. | Highlights are cleared when a drag ends or is cancelled. The output branch is fixed and uses its own slot shape. |
| [#296](https://github.com/jagenjo/litegraph.js/issues/296) | Pinned nodes could still be dragged and resized. | Pinned nodes are skipped when dragging and can't be resized. Deleting is unchanged (`block_delete` exists for that). |
| [#266](https://github.com/jagenjo/litegraph.js/issues/266) | `addInputs("foo")` made a slot named `"f"` of type `"o"`. | A single string is one slot name. |
| [#191](https://github.com/jagenjo/litegraph.js/issues/191) | Hidden widgets of a collapsed node could still be clicked. | `processNodeWidgets` ignores collapsed nodes. |
| [#111](https://github.com/jagenjo/litegraph.js/issues/111) | Cloning a subgraph dropped inputs added to the outer node and reordered slots. | Clone keeps the serialized slots, without their links. |
| [#91](https://github.com/jagenjo/litegraph.js/issues/91) | Slider widgets ignored `options.step`. | Snaps to `min + k·step`. |

Found while triaging (no upstream issue):

- `graph.getNodeOnPos()` reversed the node list in place on every call, so the top-most of two overlapping nodes alternated between calls.
- `canvas.deselectNode()` left the node in `selected_nodes`, so a later delete or drag still acted on it.
- `LiteGraph.unregisterNodeType()` deleted `Nodes["Function"]` instead of the class entry.
- `LGraphNode.MAX_CONSOLE` was undefined, so `node.console` grew forever. `trace()` also threw on a node outside a graph.

## Already fixed in this fork

#508 (`filtered_extra`), #497 (HiDPI links), #490 (HTTP request url input), #476, #343, #301 and #58 (zoom/touch offsets when the canvas isn't at 0,0), #461 (bare `clamp` under ESM), #426, #420 (const 0 deserializes), #394 (spawn position), #383 and #322 (bundler imports; real ES exports), #327 (wheel event writes), #272, #268 (pointer events only), #236 (double tap detection), #144 and #93 (subgraph slots follow inner I/O nodes), #112 (button fires once).

## Not changed

| Issue | Status |
|---|---|
| [#468](https://github.com/jagenjo/litegraph.js/issues/468) | Below 0.5 zoom the background image is skipped by design. Set `clear_background_color` if the plain fill looks too dark. |
| [#513](https://github.com/jagenjo/litegraph.js/issues/513) | The search box is scaled with the zoom on purpose (upstream behaviour). |
| [#472](https://github.com/jagenjo/litegraph.js/issues/472) | Pointer mapping assumes the canvas backing size matches its CSS size times `pixel_ratio`, which `resize()` maintains. Use `resize()` rather than setting `width`/`height` by hand. |
| [#295](https://github.com/jagenjo/litegraph.js/issues/295) | `clip_area` clips the title and collapsed nodes. Not changed yet: it needs a visual check of every node shape. |
| [#147](https://github.com/jagenjo/litegraph.js/issues/147) | `onSelectionChange` fires for the deselect and again for the select. Upstream considers this intended. |
| [#66](https://github.com/jagenjo/litegraph.js/issues/66) | Inputs refreshed before actions: available as `LiteGraph.refreshAncestorsOnActions` (off by default). |
| #281, #450, #428, #518, #491 | Usage questions or feature requests (widget values need `serialize_widgets`; the wheel listener must stay non-passive to prevent page scroll). |
| #417 | Vue-specific click problem. Likely the old ESM `clamp` error (#461, fixed); needs a Vue setup to confirm. |
