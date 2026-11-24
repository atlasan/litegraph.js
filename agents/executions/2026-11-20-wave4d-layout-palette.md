# Wave 4d: layout and palette

> **Date** 2026-11-20 · **Kind** execution · **Status** final · **Base** `LG/wave4d_layout` @ `d6e0298` · **Plan** [Wave 4: ecosystem and workspace](../plans/2026-11-20-wave4-ecosystem-workspace.md)

Part 4d delivered plan steps 15–16 on `LG/wave4d_layout`, cut from `LG/dev` @ `d4b04af`: the auto-layout adapter with dagre loaded on demand (W4-3) and the node palette as a core API plus an Editor panel (W4-7).

## Changes

- `8ac84cc` `feat:` auto-layout and node palette:
  - **`src/layout.js`, `LiteGraph.layout`:** engines `dagre` (library key `dagre`, loaded with `LibraryManager.waitForLib`; adapter over `graphlib`), `layered` (built in: longest-path ranks, no dependency), `LayoutRegistry.elkEngine(elk)` for elkjs. `buildModel` gives boxes with titles and the links in scope.
  - **`graph.autoLayout({engine, nodes, direction, spacing})`:** one `transact`; selection anchored at its top-left; pinned nodes stay; reroutes and wholly-moved groups follow; a library that cannot load is refused with the way out (install it, or `layered`). Setting `LiteGraph.Layout.Engine`; `LiteGraph.registerBuiltinLibraries()` registers dagre 3.1.3 (pinned CDN URL in the browser, `@dagrejs/dagre` in Node).
  - **`src/palette.js`, `LiteGraph.palette`:** groups by pack and category, search through `nodeSearch`, favourites and recent types as settings, previews (cached; no node is built for audio, WebGL, MIDI or system types), `insert` (one undo step, selects, records).
  - **Canvas:** `processDrop` inserts a node for `LGraphCanvas.NODE_DRAG_MIME` data.
  - **Editor:** "Nodes" button and `NodePalettePanel` (search, ☆ favourites filter, Recent, previews on hover, drag or double-click to insert; setting `LiteGraph.Editor.Palette`).
  - **Command** `litegraph.layout.auto` in the `view_tools` extension and the canvas menu.
  - **Dependency:** `@dagrejs/dagre` 3.1.3 as an exact development dependency (MIT; published 2026-10-24, graphlib 4.0.6 2026-10-23). Release notes and commits read: v2 kept the IIFE build with the `dagre` global and added ESM; v3 is ESM-first (`type: module`) with per-cluster direction and dynamic graphs; 3.1.x fixes edge routes and parallel edges.
- `d6e0298` `build:` regenerated distributions.

## Verification

| Check | Result |
|---|---|
| `npm run check` | lint clean, 12 builds, strict types and export parity (`LayoutRegistry`, `NodePalette`; `NodePalettePanel` in the Node bundle), **553/553 Jest** (up from 546), **96/96 integration** (up from 95) |
| New tests | <ul><li>`layout-palette.test.js` (7): dagre and layered order a chain left to right without overlaps, one undo step restores; selection scope, anchor, pinned node, reroute and group; ELK adapter, unknown engine, unloadable library message; the command; palette groups, search, favourites, recent limit; preview, insert with undo, a drop on the canvas</li><li>`tools/tests/layout.test.mjs`: the built bundle loads `@dagrejs/dagre` on first `autoLayout` and arranges a chain</li></ul> |
| Browser, `editor_build.html` (port 8001, real clicks) | <ul><li>"Nodes" opens the palette grouped by pack; typing "watch" filters to Watch, WatchA, WatchValue.</li><li>☆ → ★ on Watch; dragging Watch onto the canvas inserts it under the pointer, selected; Recent lists it.</li><li>Hover shows a preview of WatchValue with its slots (its position was off by the list offset; fixed).</li><li>Canvas menu "Arrange all nodes": dagre loads from the CDN and lays Const → A + B → Watch out left to right; Ctrl+Z restores the previous positions in one step.</li></ul> |

## Left open

- A Ctrl+Z typed in the palette's search box undoes the text, not the graph (the panel keeps its keys); click the canvas first.
- The palette panel overlays the left part of the canvas rather than resizing it.
- The editor page does not enable undo history by default (`LiteGraph.actionHistory_enabled`), as before.
