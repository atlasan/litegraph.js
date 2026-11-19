# Survey: UIs built on litegraph, and the behaviors worth generalizing

Date: 2026-11-19. Status: **research report**. I read shallow clones of the source and did not run anything. This complements the [custom-node UI pattern catalog](comfyui-custom-node-ui.md), which covers rgthree, Custom-Scripts, KJNodes, VideoHelperSuite and Easy-Use. [I] marks an inference.

"No license" means no license was found, so the repository is reference-only.

## Sample

| Repo @ commit | License | Status |
|---|---|---|
| chrisgoringe/cg-use-everywhere @`ffc99037` | Apache-2.0 | active |
| ltdrdata/ComfyUI-Impact-Pack @`51b170a9` | GPL-3 | active |
| Trung0246/ComfyUI-0246 @`d09cb3fe` | MIT | stale |
| crystian/ComfyUI-Crystools @`2f18256c` | MIT | active |
| Nuked88/ComfyUI-N-Sidebar @`bddcfb6d` | MIT | stale |
| 11cafe/comfyui-workspace-manager @`dfc92186` | MIT | stale |
| cubiq/ComfyUI_essentials @`9d9f4bed` | MIT | trivial JS |
| phineas-pta/comfyui-auto-nodes-layout @`bc0c8cf0` | Unlicense (bundles dagre MIT, **ELK EPL-2.0**, cola MIT) | active |
| niknah/quick-connections @`12fc2b61` | MIT | active; **also runs on vanilla litegraph** |
| OliverCrosby/Comfyui-Minimap @`dad932d8` | no license | dead |
| SKBv0/ComfyUI_LinkFX @`478947e1` | no license | active |
| Ding-sl/ComfyUI-LinkSpotlight @`8fa15af8` | MIT | active |
| EnragedAntelope/ComfyUI-TraceLinks @`c4de0a37` | MIT | active |
| yawiii/comfyui_group_assistant @`a233ed5d` | GPL-3 | paused |
| Tenney95/ComfyUI-NodeAligner @`4a891a11` | GPL-3 | active |
| mmoalem/comfyui-focus-mode @`fbd45af7` | no license | small |
| space-nuko/ComfyBox @`abd31401` | GPL-3 | dead |
| mcmonkeyprojects/SwarmUI @`d347f306` | MIT | active |
| space-nuko/litegraph.ts @`29a7877f` | MIT | dormant |
| gausszhou/litegraph | no license | 2026-07 |
| akhenakh/bentoviz | MIT | WIP |
| AdamantLife/LiteGraph-VariadicNode | GPL-3 | small |
| rgthree-comfy @`bc48c6aa`, ComfyUI-Custom-Scripts @`609f3afa` (things the first catalog missed) | MIT | active |

## A. ComfyUI custom-node UIs

- **cg-use-everywhere: broadcast ("virtual") links.**
  - A sender feeds every unconnected input of a matching type.
  - Senders can be restricted by regex on the title, input name or group, by same/different group or colour, and by priority. A tie means no connection, and the input is flagged.
  - Implicit links are drawn on demand or animated, and widgets fed this way are greyed.
  - On export, real links are inserted temporarily and then restored. The patches go into `drawNode`, `drawConnections` and `onDrawForeground`.
  - Hooks needed: a **virtual-links API**, an **extra-links provider**, a **serialize/export transform** and a **widget "driven by link"** state.
- **Impact-Pack (behaviour only).**
  - An execution status pill with a progress bar.
  - Wildcard `*` slots adopt the upstream type, and the type propagates through switch nodes.
  - It sniffs `new Error().stack` to tell *why* a connection changed. Hook needed: a **reason argument on connection callbacks**.
  - Combo options are refreshed asynchronously.
- **ComfyUI-0246.**
  - Highway/Junction: slots generated from a text spec (**schema-driven slot sets**).
  - A Hub that proxies widgets from other nodes.
  - A home-grown `hijack()` interception framework: a strong signal that plugins need an **ordered, vetoable interception** mechanism.
- **Crystools.** A global progress bar where clicking centres the canvas on the running node. Editor-only "show any" nodes that are not serialized: an **editor-only node flag**.
- **N-Sidebar.** A docked node palette: drag a type onto the canvas (touch works too), pinned favourites, fuzzy search, custom categories and a hover preview. Hooks needed: **drop node type at a client point**, an **offscreen node preview** and a catalog query.
- **workspace-manager.** Inserting a saved workflow at the drop point works by **hijacking the clipboard in localStorage and then calling `pasteFromClipboard`**. Hook needed: `canvas.insertFragment(data, pos)`. Its dirty tracking is guessed from keystrokes; a reliable **graph-changed / dirty** event would replace that.
- **auto-nodes-layout.**
  - Offers dagre, ELK and cola layouts.
  - It writes `pos` directly, with no undo, and ignores groups, ports and reroutes.
  - Hook needed: a **layout adapter** that exports `{nodes, edges with ports, groups}` and applies the positions in one transaction, optionally scoped to the selection.
- **quick-connections** (MIT, runs on vanilla litegraph).
  - While dragging a link, it overlays boxes listing the compatible slots of nearby nodes.
  - It also draws "circuit board" orthogonal routes around nodes.
  - Hooks needed: the **link-drag lifecycle** with candidate queries, and a **link router/painter split**.
- **Link visibility plugins:**
  - LinkSpotlight: dims links not touching the selection; selecting a group spotlights its contents.
  - TraceLinks: dims links by type and shows a legend.
  - LinkFX: animated and "physics" wires.
  - One **link style resolver** `(link, ctx) → {visible, alpha, color, width, dash, animate}` would cover all of them.
- **Minimaps.**
  - The OliverCrosby minimap polls with `setInterval`.
  - The FE minimap has a data source and a decoration-layer registry.
  - Hooks needed: **graph-changed and viewport-changed events**, plus decoration layers.
- **Groups and layout tools:**
  - Group Assistant: explicit membership, auto-fit, nesting, and Shift to suppress drop-into-group.
  - NodeAligner: row- and column-aware align and distribute, equal sizes.
  - Comfy `groupOptions.ts`: "Add group for selected", set the mode of every node in a group, and `resizeTo`, contributed through `getCanvasMenuItems`.
- **Focus and app modes:**
  - focus-mode: temporary relocation, everything else hidden, restored on exit.
  - Comfy linear mode.
  - SwarmUI: graph input nodes become a parameter form.
  - ComfyBox: drag-and-drop UI built from the graph.
  - Hooks needed: an **exposed-parameter interface** and a **view filter** that does not mutate saved positions.
- **rgthree (missed earlier):**
  - Mode relay/repeater: mute/bypass propagates along connections.
  - Mute toggles in group headers.
  - Bookmark nodes, with hotkeys.
  - **Link fixer** (`check()`/`fix()`), which became our `validateLinks`.
  - Auto-nested combo menus.
  - "Queue only this output".
- **pysssss (missed earlier):**
  - Snap-to-grid with guides.
  - Middle-click on a slot adds its default node.
  - Workflow image export with embedded JSON.
  - Per-type widget defaults.
  - Better combos.

## B. Other litegraph users and forks

- **jagenjo upstream:** last commit 2024-01-08 (deferred actions). Nothing new.
- **space-nuko/litegraph.ts** (MIT): a TS port with core and node packages split apart, and the canvas split into `_Events`, `_Rendering` and `_UI`. Value: precedent for a module split.
- **gausszhou/litegraph** (no license): a monorepo with per-domain node packages. Its TODO lists i18n and auto-arrange.
- **ComfyBox** (GPL): subclasses `LGraphCanvas`. Templates bundle nodes, links, a UI container and metadata. Frontend-only logic nodes.
- **SwarmUI** (MIT): embeds Comfy in an iframe and needs `comfyAggressiveMouseUp()`. Lesson: use **pointer capture** and provide a host-level `cancelInteraction()`.
- **bentoviz** (MIT): node types generated from **JSON Schema**.
- **LiteGraph-VariadicNode** (GPL): `addVarInput` / `addVarOutput` grow and shrink slots on connect.

## C. Non-litegraph editors (ideas only)

- **Rete.js v2:** every feature is a plugin over **one ordered, vetoable signal pipe**. This is the cleanest model for evolving CallbackHandler.
- **Baklava.js:** ports and widgets are **one interface concept**; the model, engine and view are separate.
- **Node-RED:** a palette manager, subflows with an instance UI, **link-in/link-out nodes**, per-node **status**, context stores, disabled nodes, clipboard fragments.
- **Blender:** frames with explicit membership, the cut-link gesture, mute as pass-through, a group interface panel, lazy-connect.
- **Unreal Blueprints:** comment boxes that move their contents, pure nodes, **collapse selection to a function**, knots, split/merge pins, find references, breakpoints.

## Core hooks plugins keep monkey-patching

| # | Patched today | Core API that would replace the patch |
|---|---|---|
| H1 | `renderLink`, `drawConnections` (5 repos) | link style resolver; router/painter split; extra-links provider |
| H2 | `drawNode`, `drawFrontCanvas`, `onDrawForeground` | node adornments (badges, status, progress); dim factor |
| H3 | `drawGroups`, `LGraphGroup.move` / `recomputeInsideNodes` | `onDrawGroup`, group title widgets, membership policy |
| H4 | `getCanvasMenuOptions`, `getExtraMenuOptions`, replacing `ContextMenu` | menu contribution registry; auto-nesting |
| H5 | `processMouseDown`/`Up`, `connecting_links` | link-drag lifecycle events, `findCompatibleSlots` |
| H6 | `pasteFromClipboard`, localStorage hijack | `insertFragment(data, pos)`; paste events |
| H7 | `serialize` / `configure` wraps | `onBeforeSerialize(ctx) → restore`; load migrations |
| H8 | stack sniffing, patched `connectByType` | `reason` on connection callbacks; wildcard type policy |
| H9 | `setInterval` polling, keystroke dirty guesses | `graph-changed{kind}`, `viewport-changed`, reliable dirty flag |
| H10 | home-made `hijack()` | one ordered, vetoable, async-aware pipe |

## Top 15 behaviours

1. Link style resolver with spotlight/dim (LinkSpotlight, TraceLinks; MIT).
2. Link-drag lifecycle with quick-connect candidates (quick-connections; MIT).
3. Insert a fragment at a position; snippets and templates with metadata.
4. Pluggable auto-layout that is undoable and can be scoped to the selection (dagre built in, ELK optional).
5. Virtual/broadcast links with restrictions, priority, visualisation and "materialise".
6. Link integrity check and repair (done: `LGraph.validateLinks`).
7. Node status/badge/progress API fed by execution events.
8. Docked node palette with drag-to-canvas, favourites and preview.
9. Minimap with decoration layers, driven by events.
10. Group upgrades: membership, auto-fit, header toggles, set mode for the whole group.
11. Grid-aware align/distribute and snap guides.
12. Published parameters, app mode and a focus view.
13. Wildcard type propagation and variadic slots, with change reasons.
14. Schema → node-type factory.
15. Bookmarks, follow-execution navigation, and mode relay along connections.

**Lower priority:** animated wires, image export, auto-nested combos, partial "run this output".

## Licensing

| License | Repos | Use |
|---|---|---|
| MIT | quick-connections, LinkSpotlight, TraceLinks, rgthree, pysssss, N-Sidebar, workspace-manager, Crystools, SwarmUI, bentoviz | code reusable with attribution |
| Apache-2.0 | Use-Everywhere | reusable; keep its NOTICE |
| GPL-3 | Impact, Group Assistant, NodeAligner, ComfyBox, VariadicNode, ComfyUI_frontend app code | behaviour reference only |
| none found | OliverCrosby minimap, LinkFX, focus-mode, gausszhou | ideas only |
| EPL-2.0 | ELK | optional plugin only |
