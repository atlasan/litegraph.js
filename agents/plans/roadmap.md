# Roadmap: waves

> **Updated** 2026-11-25 · **Kind** roadmap · **Status** living; launcher track done; Waves 0–3 done and in `master`; Waves 4–6 done in `LG/dev`; Wave 7 done in `LG/dev`, its two leftovers (generated doc tables, deprecation logs) and decision 0007 done on `LG/dev_hooks_deprecations`; flows and panels tracks done in `LG/dev`; pre-release `0.18.0-dev.2` released: merged into `master` (`0bdeff3`, PR #11) and tagged `v0.18.0-dev.2` ([plan](2026-11-23-pre-release-0.18.0-dev.2.md))

This is the single place for the current status of planned work.

- **Design reasoning and idea catalog:** [feature harvest and priorities](2026-11-19-feature-harvest-and-priorities.md).
- **Evidence:** [ecosystem study](../memories/research/ecosystem-study/README.md) and [audits](../audits/README.md).
- **Next priorities (proposed 2026-11-25):** [next priorities after 0.18.0-dev.2](2026-11-25-next-priorities-after-0.18.0-dev.2.md), five tiers from a stable 0.18.0 to the 0.20 removals.
- **Open items, classified:** the [state audit of 2026-11-23](../audits/2026-11-23-state-audit.md) (FIX D-4 to D-8, DECISION DEC-1 to DEC-5, NICE N-1 to N-12). D-5, D-6 and D-8 are fixed and D-7 was not reproducible ([record](../executions/2026-11-23-audit-fixes.md)); D-4 is flows step 4, done on `LG/dev_flows_call_scopes` ([record](../executions/2026-11-25-call-scopes.md)).

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
| 7 | Event integration (one core, two faces) | **Done**; the two leftovers (generated doc tables, deprecation logs) and `LiteGraph.Hooks.StrictHandled` (decision 0007) done on `LG/dev_hooks_deprecations` ([plan](2026-11-25-hooks-deprecations.md), [record](../executions/2026-11-25-hooks-deprecations.md)), merged into `LG/dev` from `LG/wave7_events` and `LG/dev_events_deferred` ([plan](2026-11-22-event-integration.md), [audit](../audits/2026-11-22-event-handling.md), [record](../executions/2026-11-22-wave7-event-core.md)): hooks and typed events on `ListenerList`, compatible `onX` API. The deferred items (snapshot and order golden, hook → event helper, tap, hook typing) are done on `LG/dev_events_deferred`, merged into `LG/dev` ([record](../executions/2026-11-22-wave7-deferred.md)); see [Wave 7](#wave-7-event-integration-done) |
| Track | Panels and widgets: value types, options and node panels | **Done**, merged into `LG/dev` ([plan](2026-11-22-panels-options-node-details.md), [record](../executions/2026-11-22-panels-and-widgets.md)); see [Panels and widgets track](#panels-and-widgets-track) |
| Track | Node pin, modes and exec slots | **Done** except D ([plan](2026-11-23-node-pin-modes-exec-slots.md)): A (mode 4 = BYPASS, ON_REQUEST = 5, [decision 0004](../memories/decisions/0004-mode-4-bypass.md)) merged into `LG/dev` from `LG/dev_HMD_modes`; B (exec slots: layouts, per-model creation) merged from `LG/dev_HMD_exec_slots`; C (pin styles and quick menu, graph status chip) merged from `LG/dev_HMD_node_pin`; D (debugger notes) proposed as its own session; see [Node pin track](#node-pin-modes-and-exec-slots-track) |
| Track | Editor examples polish | **Done**, merged into `LG/dev` from `LG/dev_HMD_examples` ([audit](../audits/2026-11-23-editor-examples.md), [record](../executions/2026-11-23-editor-examples.md)): every example states its execution model, fits its nodes and explains itself; 11 new examples (basics and one per flow category); a stricter examples test; 6 library fixes |
| Track | Launcher and Bun commands (`lg.sh` / `lg.bat`) | **Done**, merged into `LG/dev` from `LG/dev_HMD_launcher` ([plan](2026-11-23-launcher-and-bun.md), [record](../executions/2026-11-23-launcher-and-bun.md)); see [Launcher track](#launcher-track) |
| Track | Group UX: body drag, title size, header toggle, space panning | **Done**, merged into `LG/dev` from `LG/dev_HMD_groups` ([record](../executions/2026-11-24-groups-ux.md)): the body pans and the title bar or Alt moves (`LiteGraph.Group.BodyDrag`), titles 12–48 px on screen (`LiteGraph.Group.TitleScale`), a capped node-pin-like toggle clear of the title, space panning fixed and on the gesture path (audit N-4) |
| Track | Next priorities, Tier 1 ([plan](2026-11-25-next-priorities-after-0.18.0-dev.2.md#execution-tracks-dependencies-and-coordination)) | **Done in `LG/dev` (2026-11-27)**, except step 6 (launcher on Windows/macOS, npm decision D12): decisions 0005–0008 and the nvm/Bun environment; `no-undef` and the compatibility charter ([record](../executions/2026-11-25-lint-charter.md)); call scopes, D-4 ([record](../executions/2026-11-25-call-scopes.md), decision 0009); browser smoke test, USE-09 ([record](../executions/2026-11-25-browser-smoke.md)); validated loader, X-04 ([record](../executions/2026-11-25-graph-loader.md)); hook deprecations and `StrictHandled`, N-1 / decision 0007 ([record](../executions/2026-11-25-hooks-deprecations.md)). Integration: [record](../executions/2026-11-27-tier1-integration.md). Next: Tier 2 step 7 (core without the canvas) |
| Release | Pre-release `0.18.0-dev.2`: everything on `LG/dev` | **Merged into `master` (2026-11-24)** as `0bdeff3` from [atlasan/litegraph.js#11](https://github.com/atlasan/litegraph.js/pull/11), after a local CI `--full` proof on the head ([record](../executions/2026-11-24-release-0.18.0-dev.2-merge.md))and tagged `v0.18.0-dev.2` (annotated, pushed). **Released.** Before: steps 2–5 done and merged into `LG/dev` ([plan](2026-11-23-pre-release-0.18.0-dev.2.md), [record](../executions/2026-11-23-pre-release-0.18.0-dev.2.md)); release checks rerun on `LG/dev` @ `ce8c231` after the [audit fixes](../executions/2026-11-23-audit-fixes.md), and again on the final `LG/dev` @ `3c2ada2` on 2026-11-24, browser included (see the plan's History); push, PR and tag wait for approval; supersedes `0.18.0-dev.1`, which was never tagged; see [Pre-releases](#pre-releases) |

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

**Left open at the time:** the advisories on `socket.io-parser`, `engine.io` and `osc`. They were fixed with D7 (`17e357a`, 12 findings to 0) before the 0.18.0-dev.1 checks. Decision D1 is settled, see below.

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
- Collapsing CallbackHandler and `LGraphEventTarget` into a single pipe. Both are bridged through the extension context today, and the main points emit typed events. **Not done in Wave 2, and out of scope in Wave 6. Core done in [Wave 7](#wave-7-event-integration-done).**

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
- **CI:** check that `build/` is fresh (`git diff --exit-code`). Since 2026-11-24 local (D10): `npm run ci:local`, with proof reports; the workflow is kept, gated off.
- **Documentation:** README, getting-started, architecture docs; generated API docs out of the authored tree. **Not done:** the generated API is still in `docs/api/` (see the [state audit](../audits/2026-11-23-state-audit.md) §3); it is regenerated for 0.18.0-dev.2 (D-3).
- **Applications:** move the editor, tester and runner apps into their own homes; one defaults module; one tester controller (**not done**: N-3).

## Pre-releases

- **0.18.0-dev.1** ([plan](2026-11-20-pre-release-0.18.0-dev.1.md), [record](../executions/2026-11-22-pre-release-0.18.0-dev.1.md)): Waves 4 and 5, D7 and the loose ends were done and the version was bumped on `LG/release_0.18.0-dev.1`. It was **never pushed or tagged**, and is **superseded** by 0.18.0-dev.2.
- **0.18.0-dev.2** ([plan](2026-11-23-pre-release-0.18.0-dev.2.md)): everything on `LG/dev` (Waves 0–7, the flows and panels tracks; since 2026-11-24 also the editor examples, launcher, node pin and modes, and group UX tracks, folded into its `CHANGES.md` section), from the [state audit](../audits/2026-11-23-state-audit.md). Records hygiene, three pre-release fixes (D-1 to D-3), version and release checks on `LG/dev_release_0.18.0-dev.2`. **Done** and merged into `LG/dev` ([record](../executions/2026-11-23-pre-release-0.18.0-dev.2.md)). Pushed and merged into `master` on 2026-11-24 (`0bdeff3`, PR #11, [record](../executions/2026-11-24-release-0.18.0-dev.2-merge.md)); tagged `v0.18.0-dev.2` the same day.

## Wave 6: events and execution models (done)

[Plan](2026-11-22-events-execution.md) (accepted 2026-11-22; open decisions 3–8 adopted as recommended; forced pulls are memoized per frame and call). One branch per part, merged into `LG/dev`:

| Part | Items | Status |
|---|---|---|
| 6a | Characterization matrix and golden snapshots; B5, B9, B10, B11, B13, B15, B16, B17 | **Done** on `LG/wave6a_ensure`, merged into `LG/dev` ([record](../executions/2026-11-22-wave6a-ensure.md)) |
| 6b | `src/execution.js` engine and model registry; `config.execution`; the `ancestors` semantics; boundaries; `event-dropped`; `strict` and `event` | **Done** on `LG/wave6b_engine`, merged into `LG/dev` ([record](../executions/2026-11-22-wave6b-engine.md)) |
| 6c | `static def.execution`; mode validity; flow-node rewrites; `checkExecution` and the badge | **Done** on `LG/wave6c_declarations`, merged into `LG/dev` ([record](../executions/2026-11-22-wave6c-declarations.md)) |
| 6d | Graph info model combo; `execution-state` for action and pull runs; runner page overlay; runner parity | **Done** on `LG/wave6d_graphinfo`, merged into `LG/dev` ([record](../executions/2026-11-22-wave6d-graphinfo-runner.md)) |
| 6e | Deprecations; docs; decision record | **Done** on `LG/wave6e_polish`, merged into `LG/dev` ([record](../executions/2026-11-22-wave6e-polish.md), [decision 0002](../memories/decisions/0002-execution-models.md)) |

## Wave 7: event integration (done)

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
| 7a | Characterization: hook semantics, results with and without handlers, E1/E2 regressions, a benchmark baseline (`test/hook-pipeline.test.js`); the per-site result snapshot (`test/hook-results.test.js`) and the order golden (`test/hook-order.test.js`) | **Done** (snapshot and golden on `LG/dev_events_deferred`, merged) |
| 7b | `ListenerList` (the plan's `ListenerStore`) and the `installHooks` mixin; copy-on-write, error isolation, fast path, disposers | **Done** |
| 7c | `CallbackHandler.is` / `handled` / `valueOf` (the plan's `hookResult`) on 21 sites, each keeping its rule; panel hook bypasses; E12 and E13 fixed; `objectOf` on the 8 menu-array sites | **Done** (menu sites on `LG/dev_events_deferred`, merged) |
| 7d | Selection parity; `LiteGraph.events`; group events; `fireHookThenEvent` (hook → `onX` → event, event skipped after a veto) | **Done** (helper on `LG/dev_events_deferred`, merged) |
| 7e | `ctx.listen`, `events.on("*")`, `priority`; the emitted-versus-declared event check; docs; decision [0003](../memories/decisions/0003-event-pipe.md); the dispatch tap; typed hook maps and the declared-hooks check | **Done** (tap and typing on `LG/dev_events_deferred`, merged) |
| 7f | The leftovers (N-1 in the [state audit](../audits/2026-11-23-state-audit.md)): hook and event tables in `docs/callbacks.md` generated from the maps (`npm run docs:callbacks`, freshness test); one-time deprecation logs for `cb_handler`, `callbacks_handlers`, `callbackhandler_setup`. Plus decision [0007](../memories/decisions/0007-hook-handled-rule.md): `LiteGraph.Hooks.StrictHandled` and `CallbackHandler.handledAt` on the 8 lenient sites | **Done** on `LG/dev_hooks_deprecations` ([plan](2026-11-25-hooks-deprecations.md), [record](../executions/2026-11-25-hooks-deprecations.md)) |

Open decisions: see D8 below and the [plan](2026-11-22-event-integration.md#open-decisions-each-with-a-recommendation).

## Flows track: reference, declarations, examples

[Plan](2026-11-22-flows-reference-examples.md) (accepted 2026-11-22). These are steps 1–3 of the [flows direction](2026-11-22-flows-direction.md), from the [event flows audit](../audits/2026-11-22-event-flows-audit.md). It is parallel work, so it has no wave number.

| Part | Branch | Items | Status |
|---|---|---|---|
| Reference | `LG/dev_flows_reference` | `npm run docs:nodes` (`tools/node-reference.mjs`) → `docs/nodes/` (local, not committed: D9); pack descriptions; `def.usage`; catalog test | **Done** ([record](../executions/2026-11-22-flows-reference.md)) |
| Declarations | `LG/dev_flows_declarations` | `pure` / `ticks` / default modes for the undeclared types; volatile nodes stay ALWAYS until FLW-02 | **Done** ([record](../executions/2026-11-22-flows-declarations.md)) |
| Examples | `LG/dev_flows_examples` | `apps/editor/examples/index.json`, pack `templates[]`, Demo menu by category, examples test, audit finding 10 | **Done** ([record](../executions/2026-11-22-flows-examples.md)) |
| Examples polish | `LG/dev_HMD_examples` | Explicit models, sizes, notes, Watch/Button controls; Basics category and one example per flow category; stricter test ([audit](../audits/2026-11-23-editor-examples.md)) | **Done** ([record](../executions/2026-11-23-editor-examples.md)) |
| Call scopes (step 4, D-4) | `LG/dev_flows_call_scopes` | One scope id per frame, outer call, Sequence output, loop iteration and function call; `pure: "volatile"`; property version; `refresh` input; `volatile-loop-input` (FLW-01 to FLW-04, FLW-14; audit findings 1–4; [plan](2026-11-25-call-scopes.md), [decision 0009](../memories/decisions/0009-call-scopes.md)) | **Done on the branch, waiting for the merge** ([record](../executions/2026-11-25-call-scopes.md); `Local-CI: pass cc2a532`) |

**Step 4 (call scopes, D-4) accepted (user, 2026-11-25, DEC-5)** as step 2 of the [next priorities](2026-11-25-next-priorities-after-0.18.0-dev.2.md); implemented on `LG/dev_flows_call_scopes`. Steps 5–7 (lifecycle and custom events, profiles, flow docs) stay proposed until step 4 lands. Step 5 can now build on Wave 7's listener core (in `LG/dev`).

## Panels and widgets track

[Plan](2026-11-22-panels-options-node-details.md) accepted 2026-11-22; done on `LG/dev_panel_and_widget` and **merged into `LG/dev`**. It is parallel work, so it has no wave number ([record](../executions/2026-11-22-panels-and-widgets.md)):
- value types ("widget for type");
- `ColorWidget` and `VectorWidget`;
- the options panel (Graph, Canvas and Settings tabs);
- the node details panel;
- panel editors and sections.

Follow-ups: movable, dockable and configurable panels (X-13), multi-node editing, property presets (X-11), settings profiles (X-12).

## Launcher track

[Plan](2026-11-23-launcher-and-bun.md) accepted 2026-11-23 from the user's findings of that day; parallel work on `LG/dev_HMD_launcher_intake` (records) and `LG/dev_HMD_launcher` (code), both merged into `LG/dev` ([record](../executions/2026-11-23-launcher-and-bun.md)):
- `lg.sh` / `lg.bat` → `tools/lg/lg.mjs` on Bun or Node: start, stop, restart, status, open, logs, info, menu; state in `.lg/`.
- The apps run on Bun (`npm run editor:bun`, `graphrunner:bun`); `"node"` runtime declarations match Bun.
- The editor server serves `/docs`.

Open: a Windows and macOS check of the wrappers; ideas LCH-04 and LCH-06 to LCH-09. Candidates for later plans from the same findings (C-1 to C-5): ComfyUI groups and reroutes, group UI, a ComfyUI custom-node survey, a compatibility charter, concept docs from a survey of visual programming systems.

## Node pin, modes and exec slots track

[Plan](2026-11-23-node-pin-modes-exec-slots.md) accepted 2026-11-23 from the user's direction of that day. It is parallel work on `LG/dev_HMD_*` branches.

**A, modes (done, `LG/dev_HMD_modes`):**
- **Numbering:** `BYPASS = 4` (as in ComfyUI) and `ON_REQUEST = 5`, with [decision 0004](../memories/decisions/0004-mode-4-bypass.md) superseding D5.
- **Bypass execution:** pass-through via `ExecutionEngine.passThrough`.
- **Migration:**
  - `LGraph.migrateModes` runs on load, keyed on the `litegraph_version` / `litegraph_modes` markers;
  - the setting `LiteGraph.Compat.UnmarkedMode4` covers unmarked files;
  - `tools/migrate-modes.mjs` rewrites files;
  - the examples and fixtures are migrated.
- **ComfyUI interop:** mode 4 is native.

**B, exec slots (done, `LG/dev_HMD_exec_slots`):**
- the `onTrigger` / `onExecuted` slots placed by anchor and offset (setting `LiteGraph.Node.ExecSlotLayout`: `rows` by default, or `edges`; registered layouts);
- one geometry for links, rows, sizes and hit tests;
- the model rule `exec_slots`, on for `ancestors` (FLW-07 promoted);
- the setting `LiteGraph.Node.ExecSlots`.

**C, pin (done, `LG/dev_HMD_node_pin`):**
- **Core:**
  - `drawNodePin`, `isOverNodePin`;
  - the pin style registry (`LiteGraph.registerNodePinStyle`, setting `LiteGraph.Node.PinStyle`, `classic` built in);
  - `node.last_run_time`;
  - the `"node-pin"` menu location, with the setting `LiteGraph.Node.TitleQuickMenu`.
- **`node_pin` extension:** the `modes` style (a shape and colour per mode, state rings, a run glow), the quick menu, and the node mode commands (Ctrl+B bypass, Ctrl+M mute).
- **`graph_status` extension:** the execution model chip, with a menu to switch the model and to start or stop.
- **Editor:** both are on.

**D, debugger (deferred):** a research record and the FLW-16 card.

## Human feedback usability track

**Done** ([plan](2026-11-23-hmd-usability-first-pass.md), [execution](../executions/2026-11-24-hmd-usability-first-pass.md)), authorized 2026-11-23 and verified 2026-11-24. Feedback intake on `LG/dev_hmd_examples_nodes_icons`, then implementation on `LG/dev_hmd_usability`, merged into `LG/dev`: pack/section starter workflows in the existing editor, six explained examples, boolean and bounded auto-watch improvements, optional glyph/emoji slot labels. SVG asset management, schema validation, automatic wiring and generated-workflow reconciliation stay deferred. This is a named track, not a wave.

## Deferred (each needs its own proposal)

Virtual/broadcast links, link routing as default, app mode / published parameters, graph tabs, remote pack registry, TypeScript migration, renderer change, async workflow scheduler.

## Open decisions

**Two B-series:** `B1`–`B15` are the bugs of the [11-18 review](2026-11-18-repo-review-and-roadmap.md) (Wave 0's "B10 dispose"); `B1`–`B17` in Wave 6a are the findings of the [Wave 6 plan](2026-11-22-events-execution.md) ("6a: B10, B11, B15"). The same number names different items; cite the source with the ID.

| # | Question | Recommendation |
|---|---|---|
| D1 | Should the runner also deny host-reading `sys/*` nodes, `mysql/*`, network servers and outbound request nodes ([review finding 3](../audits/2026-11-19-wave0-pr5-review.md))? | **Decided (2026-11-19, [PR #6](https://github.com/atlasan/litegraph.js/pull/6) + [PR #7](https://github.com/atlasan/litegraph.js/pull/7)):** all of them are denied by default, grouped in families (`@commands`, `@file-write`, `@host-read`, `@servers`, `@outbound`, `@databases`, `@remote-code`) and re-allowed with `RUNNER_ALLOW_TYPES` (types, prefixes or `@family`). Principle: safe by default, with each restriction liftable by a named setting that its refusal message names. |
| D2 | When should [ADR 0001](../memories/decisions/0001-subgraph-document-format.md) be decided (definitions, option B)? | **Decided 2026-11-20: option B**, with the litegraph runtime kept (see the [Wave 3 plan](2026-11-20-wave3-subgraph-system.md)); ADR **accepted** after the 3a schema probe |
| D3 | Porting style for SA modules | **Decided (user, 2026-11-25):** adapt module by module into ES6 with attribution ([decision 0005](../memories/decisions/0005-porting-style.md)) |
| D4 | Node metadata direction | **Decided (user, 2026-11-25):** `static def` is the stored format; `defineNodeType` later as a factory that produces it ([decision 0006](../memories/decisions/0006-node-metadata.md)) |
| D5 | Mode 4: ON_REQUEST here vs BYPASS in Comfy | **Superseded** 2026-11-23 by [decision 0004](../memories/decisions/0004-mode-4-bypass.md): BYPASS = 4 (as in ComfyUI), ON_REQUEST = 5, documents migrated on load (the D5 part of DEC-3 is settled) |
| D6 | Large built-in node catalog | **Decided 2026-11-20 (W4-6):** each family is declared as a builtin pack in 4a; the physical split into files and bundles is Wave 5 |
| D7 | Upgrading the remaining runtime dependencies with advisories | **Done** (`17e357a`, 12 findings to 0; [5a–5b record](../executions/2026-11-21-wave5ab-packaging-ci-docs.md)): releases at least 2 weeks old, after a changelog review |
| D8 | Wave 7: the error policy for hooks; making the rule for "handled" uniform; events after a veto; per-node `node.events`; wildcard scope; async hooks ([plan](2026-11-22-event-integration.md#open-decisions-each-with-a-recommendation)) | **Error policy decided (2026-11-22):** a handler error never stops the chain, and the first one is always rethrown after it (independent of `throw_errors`, so `runStep` still reports `node-error`). `"*"` per target, observe only: done. **Events after a veto decided (2026-11-22, as recommended):** a vetoing hook skips its typed event (`fireHookThenEvent`). Still open, with the plan's recommendations: making "handled" uniform in 0.20, no `node.events`, no async hooks. **Decided 2026-11-25 (user, DEC-2, [decision 0007](../memories/decisions/0007-hook-handled-rule.md)):** strict "handled" behind `LiteGraph.Hooks.StrictHandled` with one-time warnings and no removal date; no `node.events`; async hooks only with their own proposal. **The setting is implemented** (Wave 7 part 7f, off by default) |
| D9 | Generated node reference `docs/nodes/`: commit it (GitHub renders it, `check:fresh` guards it) or generate it in CI only ([plan](2026-11-22-flows-reference-examples.md#user-decisions-2026-11-22)) | **Postponed (user, 2026-11-22):** generated locally with `npm run docs:nodes` and git-ignored; no CI. Propose again when the reference has settled. **Deferred again (user, 2026-11-25, DEC-1)** |
| D11 | DEC-4: when to remove the `legacy` execution paths and deprecated flags ([decision 0002](../memories/decisions/0002-execution-models.md) says no earlier than 0.20) | **Keep for now (user, 2026-11-25)**, no removal date; old-API scope = the old global names in a classic-script bundle plus the `legacy` model, stated in a compatibility charter ([decision 0008](../memories/decisions/0008-legacy-compatibility-scope.md)). Tier 5 of the [next priorities](2026-11-25-next-priorities-after-0.18.0-dev.2.md) is on hold |
| D12 | Publish to npm (`@litegraph/litegraph`) or stay git-tag only (RD-4) | **Open**: scope ownership, `build/` in git, the packed-install check |
| D13 | The C# port in `csharp/`: archive, or keep as a check against a shared saved-graph JSON Schema | **Open** |
| D10 | Continuous integration: GitHub Actions or local | **Decided (user, 2026-11-24): local CI; GitHub CI kept but gated off.** The local CI (`npm run ci:local`, `tools/ci/`, [plan](2026-11-24-local-ci.md)) runs the workflow's steps in clean clones, in parallel, with proof reports (`Local-CI: pass <sha> ...`), before merges into `LG/dev` and PRs to `master`. `.github/workflows/validate.yml` stays, its job gated on the repository variable `LG_GITHUB_CI` = `on` (unset by default); only the user switches it (`npm run ci:github -- on|off`); a manual run (`workflow_dispatch`) always runs. No PR Auto-fix |
