# Wave 4c: links and view

> **Date** 2026-11-20 · **Kind** execution · **Status** final · **Base** `LG/wave4c_links` @ `b92dc7d` · **Plan** [Wave 4: ecosystem and workspace](../plans/2026-11-20-wave4-ecosystem-workspace.md)

Part 4c delivered plan steps 11–14 on `LG/wave4c_links`, cut from `LG/dev` @ `dba0417`: RenderLink classes and link routers (Wave 2 carry-over), the link style resolver (H1), the minimap with decoration layers (H1, H9), and panning moved onto `CanvasPointer` (the DragAndScale carry-over).

## Changes

- `4d072bb` `feat:` links and view:
  - **`src/linkrender.js`:** `RenderLink` (one drawn segment), `LinkRouterRegistry` (`LiteGraph.linkRouters`: `path(ctx, rl, offsety)` and `point(rl, t)`; built-ins `spline`, `linear`, `straight`, named by `links_render_mode` or `canvas.link_router`), `LinkStyleRegistry` (`LiteGraph.linkStyles`: `spotlight`, `dim-by-type`, `hidden`, `labelled`; composition: alpha multiplies, later fields win, `visible: false` wins). The design follows the standalone's RenderLink split (MIT, `ea0e1a8`); no code was copied.
  - **Canvas:** `renderLink` builds a `RenderLink`, resolves the style, and draws through the router; `renderLinkPath` resolves one style per link for all its reroute segments; hidden links are not pushed to `visible_links`, so they are not clickable; `computeConnectionPoint` and `getLinkPolyline` use the router. Settings `LiteGraph.Canvas.LinkStyles`, `LiteGraph.Canvas.HiddenLinkTypes`.
  - **`src/minimap.js`:** `MiniMap` with `addLayer`, built-in layers `selection` and `execution`, redraws on `graph-changed`, `execution-state`, `viewport-changed`, `selection-changed` and subgraph navigation, coalesced per animation frame; click or drag centres the view. `canvas.showMinimap` / `hideMinimap` / `toggleMinimap`; `dispose` removes it.
  - **`src/extensions/view_tools.js`:** `litegraph.canvas.toggleMinimap` (Alt+M; setting `LiteGraph.Canvas.Minimap`) and `litegraph.links.spotlight` / `dimByType` / `labels` / `hidden`, also in the canvas menu with a check mark.
  - **Pointer:** panning (left drag on empty canvas, middle drag) is `_dragCanvasGesture`, a `CanvasPointer` gesture; a click on empty canvas still clears the selection; when a group gesture already owns the pointer only the flag is set, as before. `DragAndScale.bindEvents` uses an AbortController and `unbindEvents()` removes its listeners; the canvas never binds them.
- `b92dc7d` `build:` regenerated distributions.

## Verification

| Check | Result |
|---|---|
| `npm run check` | lint clean, 12 builds, strict types and export parity (`RenderLink`, `LinkRouterRegistry`, `LinkStyleRegistry`, `MiniMap`; view tools in the Node bundle), **546/546 Jest** (up from 535), **95/95 integration** |
| New tests (`link-view.test.js`, 11) | the three routers draw the same path commands as the pre-4c code (reference copy, two link shapes each); a registered router draws and moves the link centre, its disposer restores; style composition; hidden links skipped by `drawConnections` and hit testing; spotlight and labels on the canvas; dim-by-type; style commands toggle the setting; minimap: no timer, two events in one frame, layers, click centres the view, hide; toggle command and dispose; pan as a gesture with a click still deselecting; DragAndScale unbind |
| Browser, `editor_build.html` (port 8001, real clicks) | <ul><li>The canvas menu lists "Show minimap" and the four link styles.</li><li>"Show minimap": the map appears bottom right with the selected node outlined.</li><li>"Link spotlight": with Const Number selected, its link stays bright and the others fade; the menu shows "✓ Link spotlight…".</li><li>"Link labels": "number" and "string" labels at the link centres; clicking empty canvas clears the selection and the spotlight.</li><li>Dragging empty canvas pans (offset −128, −64 for a −100, −50 px drag at this scale); a click on the minimap centres the view there.</li></ul> |

## Left open

- Long type lists ("number,array,object") make wide labels; no truncation yet.
- Space-key panning still uses the legacy `dragging_canvas` move path.
- An obstacle-avoiding router remains a later idea ("link routing as default" is deferred).
