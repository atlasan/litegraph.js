# Roadmap: waves

> **Updated** 2026-11-20 · **Kind** roadmap · **Status** living; Waves 0–3 done and in `master`; Wave 4 done in `LG/dev`

This is the single place for the current status of planned work.

- **Design reasoning and idea catalog:** [feature harvest and priorities](2026-11-19-feature-harvest-and-priorities.md).
- **Evidence:** [ecosystem study](../memories/research/ecosystem-study/README.md) and [audits](../audits/README.md).

## Branch model

| Branch | Role |
|---|---|
| `master` | Released baseline. It changes only through reviewed PRs. |
| `LG/dev` | **Progressive integration branch.** Every finished wave (or part of one) lands here first. Docs, plans and audits are kept current here. |
| `LG/wave<N>_<topic>` | One branch per wave or coherent change, cut from `LG/dev` and merged back after `npm run check` passes. Wave 4: `LG/wave4a_packs`, `LG/wave4b_workspace`, `LG/wave4c_links`, `LG/wave4d_layout`, `LG/wave4e_catalog` (merged into `LG/dev`). |
| `LG/wave0_safety` | [PR #5](https://github.com/atlasan/litegraph.js/pull/5), merged into `master` on 2026-11-19. |
| `LG/runner_deny_servers` | [PR #6](https://github.com/atlasan/litegraph.js/pull/6) (safe runner defaults with clear opt-ins), merged into `master` and `LG/dev` on 2026-11-19. |
| `LG/runner_deny_d1` | [PR #7](https://github.com/atlasan/litegraph.js/pull/7) (rest of D1 denied, family opt-ins), merged into `master` and `LG/dev` on 2026-11-20. |
| `LG/dev` → `master` | [PR #10](https://github.com/atlasan/litegraph.js/pull/10) (Wave 3) was merged into `master` on 2026-11-20 as `18f5545` after CI passed; `LG/dev` was fast-forwarded to the same commit. Earlier: [PR #9](https://github.com/atlasan/litegraph.js/pull/9) (Wave 2) as `768f176`, [PR #8](https://github.com/atlasan/litegraph.js/pull/8) (Wave 1) as `35c7e4f`. |

Each change keeps the `docs` / `fix` or `feat` / `build` commit split, and regenerates `build/` and `build_node/` with `npm run build`.

## Status at a glance

| Wave | Theme | Status |
|---|---|---|
| 0 | Safety and correctness | **Done**: [PR #5](https://github.com/atlasan/litegraph.js/pull/5) merged into `master`; follow-up [PR #6](https://github.com/atlasan/litegraph.js/pull/6) merged into `master` and `LG/dev` |
| 1 | Platform layer | **Done** (`LG/wave1_platform` + `LG/wave1_finish`), merged into `LG/dev` and `master` ([PR #8](https://github.com/atlasan/litegraph.js/pull/8)) |
| 2 | Authoring core (standalone ports) | **Done**: 2a (subgraphs, groups, clipboard, search) on `LG/wave2_authoring` and 2b (links, pointer gestures, floating reroutes, badges) on `LG/wave2_links`, both merged into `LG/dev` and `master` ([PR #9](https://github.com/atlasan/litegraph.js/pull/9)). See the [plan](2026-11-20-wave2-authoring-core.md). |
| 3 | Subgraph v2 and components | **Done**: 3a definitions, function node, interop ([record](../executions/2026-11-20-wave3a-subgraph-definitions.md), [probe](../executions/2026-11-20-wave3a-schema-probe.md)); 3b authoring ([record](../executions/2026-11-20-wave3b-subgraph-authoring.md)); 3c components, blueprints, SA port ([record](../executions/2026-11-20-wave3c-components.md)); merged into `LG/dev` and `master` ([PR #10](https://github.com/atlasan/litegraph.js/pull/10)). See the [plan](2026-11-20-wave3-subgraph-system.md). |
| 4 | Ecosystem and workspace features | **Done**: 4a packs and missing nodes ([record](../executions/2026-11-20-wave4a-packs.md)), 4b workspace state and execution ([record](../executions/2026-11-20-wave4b-workspace.md)), 4c links and view ([record](../executions/2026-11-20-wave4c-links-view.md)), 4d layout and palette ([record](../executions/2026-11-20-wave4d-layout-palette.md)), 4e catalog and boundaries ([record](../executions/2026-11-21-wave4e-catalog-boundaries.md)), all merged into `LG/dev`. See the [plan](2026-11-20-wave4-ecosystem-workspace.md) |
| 5 | Repository organization and packaging | **Done**: 5a packaging and 5b CI/docs ([record](../executions/2026-11-21-wave5ab-packaging-ci-docs.md)), 5c apps move ([record](../executions/2026-11-22-wave5c-apps-move.md)); in `LG/dev`. One tester controller deferred |

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

## Wave 2: authoring core (done)

**2a** ([execution record](../executions/2026-11-20-wave2a-authoring.md)): subgraph conversion and unpack (B2, B3), group fit / mode / group-selected, clipboard fragments with groups and reroutes plus `insertFragment`, and ranked search with `i:` `o:` `c:` `s:` and definition filters.

**2b** ([execution record](../executions/2026-11-20-wave2b-links.md)):
- link dragging: snap and highlight to a compatible slot, `link-drag-start` / `link-drag-end` events (H5), drag from a reroute or a link center, and the `quick_connect` extension (link-release actions, chain selection)
- node, group and link drags as `CanvasPointer` gestures, with a multi-selection drag that works
- floating reroutes (ComfyUI `floatingLinks` modelled); reroutes move with the selection
- node badges (id, source, lifecycle), title buttons, the group header toggle

**Carried over** (to Wave 4, with the link style resolver):
- Folding DragAndScale's own listeners and the canvas pointer flags into `CanvasPointer`.
- RenderLink classes, and split title drawing with icons (H2).
- Carrying reroutes across a subgraph boundary on conversion and unpack.

## Wave 3: subgraph v2 and components (done)

ADR 0001 (D2): option B, accepted 2026-11-20 after 3a. Plan: [Wave 3: subgraph system](2026-11-20-wave3-subgraph-system.md) (accepted; decisions W3-1–W3-6 taken).

- Definitions (`definitions.subgraphs`), virtual IO nodes (`-10`/`-20`) and stable slot ids.
- Promoted widgets with host-owned values; host-slot rebinding by id, then signature, then name.
- Path ids and the `ExecutableNodeDTO`-style resolver for the inspector.
- SA's 14 subgraph test files ported as acceptance cases.
- Blueprints: insert as a copy; linked instances only as an explicit later choice.

## Wave 4: ecosystem and workspace (done)

Plan: [Wave 4: ecosystem and workspace](2026-11-20-wave4-ecosystem-workspace.md) (accepted; decisions W4-1–W4-7 taken).

| Part | Items | Status |
|---|---|---|
| 4a | **Pack manifest** (`id`, `version`, `requires.litegraph`, nodes, extensions, libraries, templates, locales) and registry, builtin packs per family (D6), provenance stamping, a missing-nodes report on load, **replacement mappings as data** | **Done** on `LG/wave4a_packs`, merged into `LG/dev` ([record](../executions/2026-11-20-wave4a-packs.md)) |
| 4b | `graph-changed` / `viewport-changed` (H9), **dirty flag** and draft autosave, **shared execution-state protocol** between the editor and the runner, node status / progress / error overlays, split title drawing with icons (H2, carried over) | **Done** on `LG/wave4b_workspace`, merged into `LG/dev` ([record](../executions/2026-11-20-wave4b-workspace.md)) |
| 4c | RenderLink classes (carried over), **link style resolver** (spotlight, dim by type, hidden or labelled links), link router plug-in, **minimap** with decoration layers (H1, H9), DragAndScale listeners into `CanvasPointer` (carried over) | **Done** on `LG/wave4c_links`, merged into `LG/dev` ([record](../executions/2026-11-20-wave4c-links-view.md)) |
| 4d | **Auto-layout adapter** (dagre loaded on demand, ELK optional; one transaction; selection scope), **node palette** with drag-to-canvas, favourites and a preview | **Done** on `LG/wave4d_layout`, merged into `LG/dev` ([record](../executions/2026-11-20-wave4d-layout-palette.md)) |
| 4e | **Catalog cleanup** (one watch node, `jquery` → `html`, one network naming scheme, category roots) through 4a mappings; reroutes across subgraph boundaries (carried over) | **Done** on `LG/wave4e_catalog`, merged into `LG/dev` ([record](../executions/2026-11-21-wave4e-catalog-boundaries.md)) |

## Wave 5: repository organization and packaging (done)

From the [workspace plan](2026-11-01-workspace-structure-and-memory.md) and the 11-18 roadmap phases 2 and 5:

- **Packaging truthfulness:** an exports map without `./build/*` wildcards, real runtime dependencies, no `defaults_debug.js` in library builds.
- **CI:** check that `build/` is fresh (`git diff --exit-code`).
- **Documentation:** README, getting-started, architecture docs; generated API docs out of the authored tree.
- **Applications:** move the editor, tester and runner apps into their own homes; one defaults module; one tester controller.

## Pre-release 0.18.0-dev.1

[Plan](2026-11-20-pre-release-0.18.0-dev.1.md) (accepted 2026-11-20): finish Waves 4 and 5, D7 and the loose ends, then tag `v0.18.0-dev.1` on `master` (tag only).

## Deferred (each needs its own proposal)

Virtual/broadcast links, link routing as default, app mode / published parameters, graph tabs, remote pack registry, TypeScript migration, renderer change, async workflow scheduler.

## Open decisions

| # | Question | Recommendation |
|---|---|---|
| D1 | Should the runner also deny host-reading `sys/*` nodes, `mysql/*`, network servers and outbound request nodes ([review finding 3](../audits/2026-11-19-wave0-pr5-review.md))? | **Decided (2026-11-19, [PR #6](https://github.com/atlasan/litegraph.js/pull/6) + [PR #7](https://github.com/atlasan/litegraph.js/pull/7)):** all of them are denied by default, grouped in families (`@commands`, `@file-write`, `@host-read`, `@servers`, `@outbound`, `@databases`, `@remote-code`) and re-allowed with `RUNNER_ALLOW_TYPES` (types, prefixes or `@family`). Principle: safe by default, with each restriction liftable by a named setting that its refusal message names. |
| D2 | When should [ADR 0001](../memories/decisions/0001-subgraph-document-format.md) be decided (definitions, option B)? | **Decided 2026-11-20: option B**, with the litegraph runtime kept (see the [Wave 3 plan](2026-11-20-wave3-subgraph-system.md)); ADR **accepted** after the 3a schema probe |
| D3 | Porting style for SA modules | Adapt module by module into ES6 with attribution (as for `reroute.js`/`linkconnector.js`) |
| D4 | Node metadata direction | Hybrid (`static def` today); add `defineNodeType` later |
| D5 | Mode 4: ON_REQUEST here vs BYPASS in Comfy | Keep BYPASS as interop only; a native bypass mode would be a new number (5) |
| D6 | Large built-in node catalog | **Decided 2026-11-20 (W4-6):** each family is declared as a builtin pack in 4a; the physical split into files and bundles is Wave 5 |
| D7 | Upgrading the remaining runtime dependencies with advisories | Upgrade to releases at least 2 weeks old, after a changelog review |
