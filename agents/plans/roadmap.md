# Roadmap: waves

> **Updated** 2026-11-19 · **Kind** roadmap · **Status** living; Wave 1 complete

This is the single place for the current status of planned work.

- **Design reasoning and idea catalog:** [feature harvest and priorities](2026-11-19-feature-harvest-and-priorities.md).
- **Evidence:** [ecosystem study](../memories/research/ecosystem-study/README.md) and [audits](../audits/README.md).

## Branch model

| Branch | Role |
|---|---|
| `master` | Released baseline. It changes only through reviewed PRs. |
| `LG/dev` | **Progressive integration branch.** Every finished wave (or part of one) lands here first. Docs, plans and audits are kept current here. |
| `LG/wave<N>_<topic>` | One branch per wave or coherent change, cut from `LG/dev` and merged back after `npm run check` passes. |
| `LG/wave0_safety` | [PR #5](https://github.com/atlasan/litegraph.js/pull/5), merged into `master` on 2026-11-19. |
| `LG/runner_deny_servers` | [PR #6](https://github.com/atlasan/litegraph.js/pull/6) (safe runner defaults with clear opt-ins), merged into `master` and `LG/dev` on 2026-11-19. |
| `LG/runner_deny_d1` | [PR #7](https://github.com/atlasan/litegraph.js/pull/7) (rest of D1 denied, family opt-ins), merged into `master` and `LG/dev` on 2026-11-20. |
| `LG/dev` → `master` | [PR #8](https://github.com/atlasan/litegraph.js/pull/8) brings `master` level with `LG/dev` (Wave 1, `agents/` workspace, ideas), 2026-11-20. See the [integration record](../executions/2026-11-20-integrate-dev-and-master.md). |

Each change keeps the `docs` / `fix` or `feat` / `build` commit split, and regenerates `build/` and `build_node/` with `npm run build`.

## Status at a glance

| Wave | Theme | Status |
|---|---|---|
| 0 | Safety and correctness | **Done**: [PR #5](https://github.com/atlasan/litegraph.js/pull/5) merged into `master`; follow-up [PR #6](https://github.com/atlasan/litegraph.js/pull/6) merged into `master` and `LG/dev` |
| 1 | Platform layer | **Done** (`LG/wave1_platform` + `LG/wave1_finish`), merged into `LG/dev`; to `master` with [PR #8](https://github.com/atlasan/litegraph.js/pull/8) |
| 2 | Authoring core (standalone ports) | **Next** |
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
- The [independent review](../audits/2026-11-19-wave0-pr5-review.md).

**Left open:** the advisories on `socket.io-parser`, `engine.io` and `osc` (a dependency check is needed first), (decision D1 is now settled, see below).

## Wave 1: platform layer (done)

**Delivered:**
- **Registries:** `LiteGraph.commands`, `keybindings` (default/user/unset layers), `settings` (defaults, migrate, `onChange`, bind onto flags, storage adapter) and `menus` (canvas/node contributions, `{command: id}` items).
- **`LiteGraph.registerExtension`:** tracked disposal of commands, bindings, settings, hooks, menus and typed listeners; disabled list; required extensions; per-canvas hooks.
- **Extensions rebuilt on commands and key bindings:** renamer, autoconnect, keyboard_helper.
- **`LiteGraph.persistPlatformState`:** settings and the user key-binding layer survive reloads; the Editor enables it.
- **Node definitions:**
  - `static def` plus classic statics → `getNodeDefinition` / `listNodeDefinitions`.
  - `declareCapabilities` per node family; `isNodeTypeSupported`.
  - Search box matching titles, aliases and descriptions.
- **Library manifest:** `describeLibraries()` and `probeLibraries()`; object-form registrations everywhere; dead manager code removed.
- **Typed events:** link-connected/removed, node-property-changed, widget-changed, execution-step, node-error, selection-changed.
- **Widget classes** (`src/widgets.js`, `registerWidgetType`) in place of the two `switch` blocks:
  - Plain-object and legacy custom widgets keep working.
  - Number entry uses a safe arithmetic parser (it was `eval`).
  - Text and toggle widgets report correct values.
- **Widget-input sockets:**
  - `addWidgetInput` or `socket: true`: the input sits on the widget's row.
  - The widget is disabled while linked.
  - `getWidgetValue` returns the link value.
  - Dropping a link on the row connects it.
- **Unified selection:**
  - `selectedItems` covers nodes, groups and reroutes.
  - `selectItem`, `moveSelected` and `deleteSelected` are one undo step each.
  - Rectangle selection, Delete and the keyboard moves cover all three.
- **`CanvasPointer` gesture handlers** (`onClick` … `onDragEnd`, `finally`); reroute dragging moved onto them.
- **Undo:** one step per widget gesture, search insert, group drag, keyboard move, rename.

**Evidence:**
- 344 Jest and 88 integration tests.
- Browser checks in `editor_build.html`: widgets through the classes; a link dropped on a widget row; arrow keys, F2, Shift+→; a reroute drag with undo.

**Carried over to Wave 2** (they belong with the standalone ports):
- Moving node, group and link dragging onto the gesture pattern (with the `LinkConnector` port).
- Folding the canvas pointer flags and DragAndScale's own listeners into `CanvasPointer`.
- Collapsing CallbackHandler and `LGraphEventTarget` into a single pipe. Both are bridged through the extension context today, and the main points emit typed events.

## Wave 2: authoring core (next)

Mostly ports from the MIT standalone; each item is M unless noted.

- **Pointer migration** (carried over from Wave 1): node, group and link dragging on `CanvasPointer` handlers; DragAndScale listeners and the canvas pointer flags folded into it.

- **Full `LinkConnector`** with RenderLink classes: shift-drag moves all links, drag from a reroute or link segment, snap and highlight to a compatible slot, `dropped-on-canvas` → search pre-filtered by type.
- **Link-drag lifecycle hooks** (H5) and **quick-connect** candidates as an extension.
- **Clipboard** with links, reroutes, groups and subgraphs; Ctrl+Shift+V; `canvas.insertFragment(data, pos)` (H6).
- **Groups:** children tracking, nesting, `resizeTo` auto-fit, "group selected", header mode toggles, set mode for the whole group.
- **Badges, title buttons and icons**, with split title drawing (H2); node source and lifecycle badges.
- **Subgraph conversion and unpack** on the current inline model (B2/B3), one transaction each.
- **Search:** `i:`/`o:`/`c:`/`s:` filters, ranking, definition-filter registry (deprecated, experimental).
- **Reroutes:** floating reroutes, start a link from a reroute, multi-select.

## Wave 3: subgraph v2 and components (proposed)

Requires deciding [ADR 0001](../memories/decisions/0001-subgraph-document-format.md) (D2).

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

From the [workspace plan](2026-11-01-workspace-structure-and-memory.md) and the 11-18 roadmap phases 2 and 5:

- **Packaging truthfulness:** an exports map without `./build/*` wildcards, real runtime dependencies, no `defaults_debug.js` in library builds.
- **CI:** check that `build/` is fresh (`git diff --exit-code`).
- **Documentation:** README, getting-started, architecture docs; generated API docs out of the authored tree.
- **Applications:** move the editor, tester and runner apps into their own homes; one defaults module; one tester controller.

## Deferred (each needs its own proposal)

Virtual/broadcast links, link routing as default, app mode / published parameters, graph tabs, remote pack registry, TypeScript migration, renderer change, async workflow scheduler.

## Open decisions

| # | Question | Recommendation |
|---|---|---|
| D1 | Should the runner also deny host-reading `sys/*` nodes, `mysql/*`, network servers and outbound request nodes ([review finding 3](../audits/2026-11-19-wave0-pr5-review.md))? | **Decided (2026-11-19, [PR #6](https://github.com/atlasan/litegraph.js/pull/6) + [PR #7](https://github.com/atlasan/litegraph.js/pull/7)):** all of them are denied by default, grouped in families (`@commands`, `@file-write`, `@host-read`, `@servers`, `@outbound`, `@databases`, `@remote-code`) and re-allowed with `RUNNER_ALLOW_TYPES` (types, prefixes or `@family`). Principle: safe by default, with each restriction liftable by a named setting that its refusal message names. |
| D2 | When should [ADR 0001](../memories/decisions/0001-subgraph-document-format.md) be decided (definitions, option B)? | Decide it after Wave 2 conversion and unpack work on the inline model |
| D3 | Porting style for SA modules | Adapt module by module into ES6 with attribution (as for `reroute.js`/`linkconnector.js`) |
| D4 | Node metadata direction | Hybrid (`static def` today); add `defineNodeType` later |
| D5 | Mode 4: ON_REQUEST here vs BYPASS in Comfy | Keep BYPASS as interop only; a native bypass mode would be a new number (5) |
| D6 | Large built-in node catalog | Keep it in core until the pack manifest exists, then split by family |
| D7 | Upgrading the remaining runtime dependencies with advisories | Upgrade to releases at least 2 weeks old, after a changelog review |
