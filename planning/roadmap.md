# Roadmap: waves

Living document; last updated 2026-11-19. This is the single place for the current status of planned work.

- **Design reasoning and idea catalog:** [feature harvest and priorities](plans/261119_feature_harvest_and_priorities.md).
- **Evidence:** [ecosystem study](../docs/development/ecosystem-study/README.md) and [audits](../docs/development/audits/README.md).

## Branch model

| Branch | Role |
|---|---|
| `master` | Released baseline. It changes only through reviewed PRs. |
| `LG/dev` | **Progressive integration branch.** Every finished wave (or part of one) lands here first. Docs, plans and audits are kept current here. |
| `LG/wave<N>_<topic>` | One branch per wave or coherent change, cut from `LG/dev` and merged back after `npm run check` passes. |
| `LG/wave0_safety` | [PR #5](https://github.com/atlasan/litegraph.js/pull/5) to `master`, under review. Already merged into `LG/dev`. |

Each change keeps the `docs` / `fix` or `feat` / `build` commit split, and regenerates `build/` and `build_node/` with `npm run build`.

## Status at a glance

| Wave | Theme | Status |
|---|---|---|
| 0 | Safety and correctness | **Done** on `LG/wave0_safety` ([PR #5](https://github.com/atlasan/litegraph.js/pull/5) open), merged into `LG/dev` |
| 1 | Platform layer | **Core done** on `LG/wave1_platform`, merged into `LG/dev`; ports remaining |
| 2 | Authoring core (standalone ports) | Proposed, next |
| 3 | Subgraph v2 and components | Proposed; needs the ADR 0001 decision |
| 4 | Ecosystem and workspace features | Proposed |
| 5 | Repository organization and packaging | Proposed |

## Wave 0: safety and correctness (done)

**Delivered:**
- **Runner lockdown:**
  - Origin and Host checks, including IPv6 and default ports.
  - A recursive node-type denylist.
  - Script nodes disabled unless `RUNNER_ALLOW_SYS=1`.
- **LibraryManager:** no shell, validated package specs, remote server code opt-in, and waiting that ends instead of polling forever.
- **`ws` 8.22.1.**
- **CallbackHandler (B6, B14).**
- **Canvas:**
  - `dispose()` (B10), `setCanvas` (B7), `tabIndex` (B8), subgraph view restore (B11).
  - `getTopGraph`, the render-loop token, and search box changes (B12).
- **Group bounding and nesting.**
- **`LGraph.validateLinks({repair})`.**
- **Version source (B15).**
- **Dead files removed.**

**Evidence:**
- 311 Jest and 87 integration tests.
- Browser checks: editor multiview, search, subgraphs; runner own-origin and cross-origin connections.
- The [independent review](../docs/development/audits/2026-11-19-wave0-pr5-review.md).

**Left open:** the advisories on `socket.io-parser`, `engine.io` and `osc` (a dependency check is needed first), and decision D1 below.

## Wave 1: platform layer (core done)

**Delivered:**
- **Registries:** `LiteGraph.commands`, `keybindings` (default/user/unset layers) and `settings` (defaults, migrate, `onChange`, bind onto flags, storage adapter).
- **`LiteGraph.registerExtension`** with tracked disposal, a disabled list, required extensions and per-canvas hooks.
- **Extensions rebuilt on commands and key bindings:** renamer, autoconnect, keyboard_helper.
- **Node definitions:**
  - `static def` plus classic statics → `getNodeDefinition` / `listNodeDefinitions`.
  - `declareCapabilities` per node family; `isNodeTypeSupported`.
  - Search box matching titles, aliases and descriptions.
- **Undo:** one step per widget gesture, per search-box insert, per group drag, per keyboard move, per rename.
- **Keyboard-opened prompts and the search box** work before any pointer input.

**Evidence:** 325 Jest and 87 integration tests; browser checks in `editor_build.html` (widget drag, F2 rename, Shift+→ insert, group drag, all with undo).

**Remaining in Wave 1** (enablers for Wave 2):

| Item | Source | Effort |
|---|---|---|
| Widget class hierarchy plus `LegacyWidget`; replace the two `switch(w.type)` blocks | SA `widgets/*` (MIT) | M |
| Widget-input sockets (input on the widget row; disabled when linked) | SA `LGraphNode` (MIT) | M |
| `Positionable` selection model (`selectedItems` for nodes, groups, reroutes) | SA `interfaces.ts` (MIT) | M |
| `CanvasPointer` callback-assignment pattern; absorb canvas pointer flags and DragAndScale listeners | SA `CanvasPointer.ts` (MIT) | M |
| Library manifest table (one declarative list of optional dependencies); drop the commented-out manager | inventory | S |
| Merge CallbackHandler and `LGraphEventTarget` into one pipe that also emits typed events; more events (`selection-changed`, `widget-changed`, `link-connected`, …) | inventory, Rete | M |
| Menu contribution registry (`menus.canvas`, `menus.node`) on the extension registry | FE design | S–M |
| Editor: persist settings and the keybinding user layer with the localStorage adapter | Wave 1 | S |

## Wave 2: authoring core (proposed, next)

Mostly ports from the MIT standalone; each item is M unless noted.

- **Full `LinkConnector`** with RenderLink classes: shift-drag moves all links, drag from a reroute or link segment, snap and highlight to a compatible slot, `dropped-on-canvas` → search pre-filtered by type.
- **Link-drag lifecycle hooks** (H5) and **quick-connect** candidates as an extension.
- **Clipboard** with links, reroutes, groups and subgraphs; Ctrl+Shift+V; `canvas.insertFragment(data, pos)` (H6).
- **Groups:** children tracking, nesting, `resizeTo` auto-fit, "group selected", header mode toggles, set mode for the whole group.
- **Badges, title buttons and icons**, with split title drawing (H2); node source and lifecycle badges.
- **Subgraph conversion and unpack** on the current inline model (B2/B3), one transaction each.
- **Search:** `i:`/`o:`/`c:`/`s:` filters, ranking, definition-filter registry (deprecated, experimental).
- **Reroutes:** floating reroutes, start a link from a reroute, multi-select.

## Wave 3: subgraph v2 and components (proposed)

Requires deciding [ADR 0001](../docs/development/decisions/0001-subgraph-document-format.md) (D2).

- Definitions (`definitions.subgraphs`), virtual IO nodes (`-10`/`-20`) and stable slot ids.
- Promoted widgets with host-owned values; host-slot rebinding by id, then signature, then name.
- Path ids and the `ExecutableNodeDTO`-style resolver for the inspector.
- SA's 14 subgraph test files ported as acceptance cases.
- Blueprints: insert as a copy; linked instances only as an explicit later choice.

## Wave 4: ecosystem and workspace (proposed)

- **Pack manifest** (`id`, `version`, `requires.litegraph`, nodes, extensions, libraries, templates, locales), provenance stamping, a missing-nodes report on load, and **replacement mappings as data**.
- **Link style resolver** (spotlight, dim by type, hidden or labelled links), link router plug-in, minimap with decoration layers (H1, H9).
- **Auto-layout adapter:** dagre built in, ELK as an optional plugin; one transaction; can be scoped to the selection.
- **Shared execution-state protocol** between the editor and the runner; node status and progress; error overlays.
- **Node palette** with drag-to-canvas, favourites stored as a setting, and a preview drawn from the definition.
- **Dirty flag** (modified vs saved) and draft autosave.
- **Catalog cleanup:** one watch node, `jquery` → `html`, one network naming scheme, consistent category roots.

## Wave 5: repository organization and packaging (proposed)

From the [workspace plan](plans/261101_workspace_structure_and_memory.md) and the 11-18 roadmap phases 2 and 5:

- **Packaging truthfulness:** an exports map without `./build/*` wildcards, real runtime dependencies, no `defaults_debug.js` in library builds.
- **CI:** check that `build/` is fresh (`git diff --exit-code`).
- **Documentation:** README, getting-started, architecture docs; generated API docs out of the authored tree.
- **Applications:** move the editor, tester and runner apps into their own homes; one defaults module; one tester controller.

## Deferred (each needs its own proposal)

Virtual/broadcast links, link routing as default, app mode / published parameters, graph tabs, remote pack registry, TypeScript migration, renderer change, async workflow scheduler.

## Open decisions

| # | Question | Recommendation |
|---|---|---|
| D1 | Should the runner also deny host-reading `sys/*` nodes, `mysql/*`, network servers and outbound request nodes ([review finding 3](../docs/development/audits/2026-11-19-wave0-pr5-review.md))? | A strict preset by default, with an opt-out per family |
| D2 | When should [ADR 0001](../docs/development/decisions/0001-subgraph-document-format.md) be decided (definitions, option B)? | Decide it after Wave 2 conversion and unpack work on the inline model |
| D3 | Porting style for SA modules | Adapt module by module into ES6 with attribution (as for `reroute.js`/`linkconnector.js`) |
| D4 | Node metadata direction | Hybrid (`static def` today); add `defineNodeType` later |
| D5 | Mode 4: ON_REQUEST here vs BYPASS in Comfy | Keep BYPASS as interop only; a native bypass mode would be a new number (5) |
| D6 | Large built-in node catalog | Keep it in core until the pack manifest exists, then split by family |
| D7 | Upgrading the remaining runtime dependencies with advisories | Upgrade to releases at least 2 weeks old, after a changelog review |
