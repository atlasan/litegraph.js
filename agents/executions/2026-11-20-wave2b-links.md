# Wave 2b: links and pointer

> **Date** 2026-11-20 · **Kind** execution · **Status** final · **Base** `LG/wave2_links` @ `187c85e` · **Plan** [Wave 2: authoring core](../plans/2026-11-20-wave2-authoring-core.md)

Part 2b of Wave 2 delivered steps 5–7 of the plan on `LG/wave2_links`, cut from `LG/dev` @ `109fba7`:

5. link dragging: snap to a slot, lifecycle events, drag from a reroute or a link center, quick connect
6. node, group and link drags as `CanvasPointer` gestures; floating reroutes
7. node badges, title buttons, group header toggle

Four selection and drag bugs were found and fixed along the way (see Changes). Together with [2a](2026-11-20-wave2a-authoring.md), this completes Wave 2 apart from the items under Left open.

## Changes

- `6c8babd` `feat:` link dragging:
  - `LinkConnector.findTargetSlot` picks a compatible free slot first. A drop on a node body and its highlight use the same slot (`LiteGraph.snap_link_to_slot`, default on).
  - `link-drag-start` and `link-drag-end` (outcome `connected`, `rejected`, `dropped` or `cancelled`) are canvas events.
  - Shift-drag from a reroute starts a new link routed through it; Shift-click still adds the reroute to the selection.
  - Dragging a link's center marker moves the link; a click opens the link menu.
  - `canvas.showLinkReleaseAction(action, dropped, e)`.
  - `quick_connect` extension: the settings `LiteGraph.LinkRelease.Action` / `ShiftAction` (context-menu, search-box, none) and the command `litegraph.link.chainSelection`.
  - fix: a click owned by a gesture handler no longer clears the selection on release, so clicking a reroute keeps it selected.
- `e068f09` `feat:` gestures:
  - `_dragNodesGesture`, `_dragGroupGesture` (move or resize) and `_linkDragGesture` / `_dropLink`, one transaction per drag. A press on a slot released without a drag cancels the link.
  - The legacy move and up paths stay for code that sets `node_dragged` or `connecting_*` directly (the subgraph IO panel does).
  - fix: pressing an already selected node kept only that node, or toggled it off with Shift, so a multi-selection could not be dragged. A press now keeps the selection; a click without a drag applies the usual change.
  - fix: clicking a group title kept the group selected only until release.
- `c067b23` `feat:` floating reroutes:
  - `LGraph.floating_links` models ComfyUI 0.4 `floatingLinks`, which were kept verbatim before. Their reroutes are written with `floating: {slotType}`.
  - Disconnecting a routed link keeps its chain, attached to the end that remains (`LiteGraph.keep_floating_reroutes`, default on). Nothing is kept when another link still uses the reroutes.
  - `graph.routeLink(link, parentId)` re-attaches a chain; moves, cancelled moves and links started from a reroute use it.
  - Floating links are drawn dashed. Subgraph conversion and unpack leave none behind.
- `a04b2b7` `feat:` node badges and title buttons:
  - `LiteGraph.nodeBadges` providers and `node.badges`. Built-in id and source badges are off by default.
  - `node.addTitleButton` / `removeTitleButton`, and `onTitleButtonClick`.
- `d70da22` `feat:` group header toggle, lifecycle badges, reroutes in the selection:
  - The group header toggle mutes and unmutes the group's nodes (`LiteGraph.Group.HeaderToggle`, default on).
  - Deprecated and experimental badges (`LiteGraph.Node.LifecycleBadge`, default on).
  - Selected reroutes move with node and reroute drags.
  - fix: a reroute drag lost the movement inside the drift tolerance.
- `84473cb` `fix:` badges that would cover the title text are left out (found in the browser).
- Each `feat:` / `fix:` commit has a `build:` commit after it.

## Verification

| Check | Result |
|---|---|
| `npm run check` | lint clean, 12 builds, strict types, **389/389 Jest** (up from 361), 92/92 integration, package check |
| New tests | `test/pointer-gestures.test.js` (24): whole gestures driven through `processMouseDown/Move/Up` on a jsdom canvas (snap, events, reroute and link-center drags, quick connect, node, group and link gestures, floating chains on the canvas, badges, title buttons, group toggle, reroute multi-select). `test/reroutes.test.js` (+4): the floating-link model |
| Browser `editor_build.html`: drag from the Const output onto the Abs body | connected to Abs `in`; `link-drag-end` reported `connected`; Watch shows 9 |
| Browser: click the ★ title button on Abs | ran once; the node did not move |
| Browser: click the group header toggle | all three nodes set to mode NEVER; the toggle is drawn hollow |
| Browser: Shift-drag the Watch input link to empty space | Watch input free; the reroute is kept as a floating chain on the Abs output, drawn dashed, serialized with `floating: {slotType: "output"}`; the quick-connect menu opened |
| Browser: Shift-drag from the floating reroute onto the Watch input | link Abs → Watch through the reroute; floating link gone; Watch shows 9 |
| Browser: select Const and Abs, drag Abs | both moved by (60, 80); the selection was kept; Watch did not move |

## Left open

- **DragAndScale's own listeners and the canvas pointer flags** (`pointer_is_down`, `last_mouse_dragging`) are not yet folded into `CanvasPointer`. Node, group, reroute and link drags no longer depend on them.
- **RenderLink classes** (the standalone's per-link render objects) were not ported; links still render through `renderLink` / `renderLinkPath`.
- **Reroutes on links that cross a subgraph boundary** are dropped by conversion and unpack, as before 2b. Carrying them onto the new outer links is a follow-up.
- **Group drag with Ctrl** was meant to move the group without its nodes. The press starts a box selection instead, as before 2b; the code path is kept, but no gesture reaches it.
