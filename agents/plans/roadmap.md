# Roadmap: waves

> **Updated** 2026-11-22 · **Kind** roadmap · **Status** living; Waves 0–3 done and in `master`; Waves 4–6 done in `LG/dev`; Wave 7 core done in `LG/dev`; flows track done in `LG/dev`

This is the single place for the current status of planned work.

- **Design reasoning and idea catalog:** [feature harvest and priorities](2026-11-19-feature-harvest-and-priorities.md).
- **Evidence:** [ecosystem study](../memories/research/ecosystem-study/README.md) and [audits](../audits/README.md).

## Branch model

| Branch | Role |
|---|---|
| `master` | Released baseline. It changes only through reviewed PRs. |
| `LG/dev` | **Progressive integration branch.** Every finished wave (or part of one) lands here first. Docs, plans and audits are kept current here. |
| `LG/dev_<topic>` | **Parallel work** (tracks, not milestones): temporary branches cut from `LG/dev` and merged back with `--no-ff` when done. They get a named track on this roadmap, not a wave number. Example: `LG/dev_flows_reference`, `LG/dev_flows_declarations`, `LG/dev_flows_examples`. |
| `LG/wave<N>_<topic>` | Waves are **milestones** with a build and verification pass. One branch per wave part, cut from `LG/dev` and merged back after `npm run check` passes. Wave 4: `LG/wave4a_packs`, `LG/wave4b_workspace`, `LG/wave4c_links`, `LG/wave4d_layout`, `LG/wave4e_catalog` (merged into `LG/dev`). |
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
| 6 | Events and execution models | **Done** (6a–6e merged into `LG/dev`; [plan](2026-11-22-events-execution.md), [summary](../executions/2026-11-22-wave6e-polish.md), [decision 0002](../memories/decisions/0002-execution-models.md)): per-document execution models with `ancestors` as the default, one execution engine, node execution declarations, `legacy` compatibility; see [Wave 6](#wave-6-events-and-execution-models-done) |
| Track | Flows: node reference, declarations, examples | **Done** (in `LG/dev`) ([plan](2026-11-22-flows-reference-examples.md); steps 1–3 of the [flows direction](2026-11-22-flows-direction.md)); see [Flows track](#flows-track-reference-declarations-examples) |
| 7 | Event integration (one core, two faces) | **Core done**, merged into `LG/dev` from `LG/wave7_events` ([plan](2026-11-22-event-integration.md), [audit](../audits/2026-11-22-event-handling.md), [record](../executions/2026-11-22-wave7-event-core.md)): hooks and typed events on `ListenerList`, compatible `onX` API; ordering helper, tap and hook typing deferred; see [Wave 7](#wave-7-event-integration-core-done) |

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
- Collapsing CallbackHandler and `LGraphEventTarget` into a single pipe. Both are bridged through the extension context today, and the main points emit typed events. **Not done in Wave 2, and out of scope in Wave 6. Core done in [Wave 7](#wave-7-event-integration-core-done).**

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

[Plan](2026-11-20-pre-release-0.18.0-dev.1.md) (accepted 2026-11-20): Waves 4 and 5, D7 and the loose ends are **done**, and the version is bumped on `LG/release_0.18.0-dev.1` ([record](../executions/2026-11-22-pre-release-0.18.0-dev.1.md)). Push, the release PR and the tag `v0.18.0-dev.1` wait for approval.

## Wave 6: events and execution models (done)

[Plan](2026-11-22-events-execution.md) (accepted 2026-11-22; open decisions 3–8 adopted as recommended; forced pulls are memoized per frame and call). One branch per part, merged into `LG/dev`:

| Part | Items | Status |
|---|---|---|
| 6a | Characterization matrix and golden snapshots; B5, B9, B10, B11, B13, B15, B16, B17 | **Done** on `LG/wave6a_ensure`, merged into `LG/dev` ([record](../executions/2026-11-22-wave6a-ensure.md)) |
| 6b | `src/execution.js` engine and model registry; `config.execution`; the `ancestors` semantics; boundaries; `event-dropped`; `strict` and `event` | **Done** on `LG/wave6b_engine`, merged into `LG/dev` ([record](../executions/2026-11-22-wave6b-engine.md)) |
| 6c | `static def.execution`; mode validity; flow-node rewrites; `checkExecution` and the badge | **Done** on `LG/wave6c_declarations`, merged into `LG/dev` ([record](../executions/2026-11-22-wave6c-declarations.md)) |
| 6d | Graph info model combo; `execution-state` for action and pull runs; runner page overlay; runner parity | **Done** on `LG/wave6d_graphinfo`, merged into `LG/dev` ([record](../executions/2026-11-22-wave6d-graphinfo-runner.md)) |
| 6e | Deprecations; docs; decision record | **Done** on `LG/wave6e_polish`, merged into `LG/dev` ([record](../executions/2026-11-22-wave6e-polish.md), [decision 0002](../memories/decisions/0002-execution-models.md)) |

## Wave 7: event integration (core done)

[Plan](2026-11-22-event-integration.md) (accepted 2026-11-22), from the [event handling audit](../audits/2026-11-22-event-handling.md). Implemented on `LG/wave7_events`, reviewed ([audit](../audits/2026-11-22-wave7-review.md)) and merged into `LG/dev` ([record](../executions/2026-11-22-wave7-event-core.md)).
- **Target ("one core, two faces"):** the legacy `onX` callbacks, the CallbackHandler hooks and the typed events run on one listener engine. Hooks stay the intercept face and typed events the observe face, fired in one documented order. The API stays compatible.
- **Fixes:**
  - registering during a dispatch re-runs handlers, or hangs (E1);
  - a throwing hook aborts the chain (E2);
  - each call site reads results its own way (E3);
  - a dispatch costs ≈ 32× a direct call (E4);
  - the pairs of hooks and events have no defined order and cover different points (E5, E6);
  - the docs and typings have drifted (E7).
- **Adds:**
  - `LiteGraph.events`;
  - group, reroute and slot events;
  - `ctx.listen`;
  - wildcard observers;
  - a dispatch tap for the trace (USE-34).

| Part | Items | Status |
|---|---|---|
| 7a | Characterization: hook semantics, results with and without handlers, E1/E2 regressions, a benchmark baseline (`test/hook-pipeline.test.js`) | **Done**; the per-site snapshot and the order golden are deferred |
| 7b | `ListenerList` (the plan's `ListenerStore`) and the `installHooks` mixin; copy-on-write, error isolation, fast path, disposers | **Done** |
| 7c | `CallbackHandler.is` / `handled` / `valueOf` (the plan's `hookResult`) on 21 sites, each keeping its rule; panel hook bypasses; E12 and E13 fixed | **Done**; the menu-array sites are unchanged |
| 7d | Selection parity; `LiteGraph.events`; group events. The hook → `onX` → event helper and skipping events after a veto are not done | **Partly done** |
| 7e | `ctx.listen`, `events.on("*")`, `priority`; the emitted-versus-declared event check; docs; decision [0003](../memories/decisions/0003-event-pipe.md). The tap, typed hook maps and generated tables are not done | **Partly done** |

Open decisions: see D8 below and the [plan](2026-11-22-event-integration.md#open-decisions-each-with-a-recommendation).

## Flows track: reference, declarations, examples

[Plan](2026-11-22-flows-reference-examples.md) (accepted 2026-11-22). These are steps 1–3 of the [flows direction](2026-11-22-flows-direction.md), from the [event flows audit](../audits/2026-11-22-event-flows-audit.md). It is parallel work, so it has no wave number.

| Part | Branch | Items | Status |
|---|---|---|---|
| Reference | `LG/dev_flows_reference` | `npm run docs:nodes` (`tools/node-reference.mjs`) → `docs/nodes/` (local, not committed: D9); pack descriptions; `def.usage`; catalog test | **Done** ([record](../executions/2026-11-22-flows-reference.md)) |
| Declarations | `LG/dev_flows_declarations` | `pure` / `ticks` / default modes for the undeclared types; volatile nodes stay ALWAYS until FLW-02 | **Done** ([record](../executions/2026-11-22-flows-declarations.md)) |
| Examples | `LG/dev_flows_examples` | `apps/editor/examples/index.json`, pack `templates[]`, Demo menu by category, examples test, audit finding 10 | **Done** ([record](../executions/2026-11-22-flows-examples.md)) |

Steps 4–7 of the direction plan (call scopes, lifecycle and custom events, profiles, flow docs) stay proposed. Step 5 can now build on Wave 7's listener core (in `LG/dev`).

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
| D8 | Wave 7: the error policy for hooks; making the rule for "handled" uniform; events after a veto; per-node `node.events`; wildcard scope; async hooks ([plan](2026-11-22-event-integration.md#open-decisions-each-with-a-recommendation)) | **Error policy decided (2026-11-22):** a handler error never stops the chain, and the first one is always rethrown after it (independent of `throw_errors`, so `runStep` still reports `node-error`). `"*"` per target, observe only: done. Still open, with the plan's recommendations: making "handled" uniform in 0.20, skipping events after a veto, no `node.events`, no async hooks |
| D9 | Generated node reference `docs/nodes/`: commit it (GitHub renders it, `check:fresh` guards it) or generate it in CI only ([plan](2026-11-22-flows-reference-examples.md#user-decisions-2026-11-22)) | **Postponed (user, 2026-11-22):** generated locally with `npm run docs:nodes` and git-ignored; no CI. Propose again when the reference has settled |
