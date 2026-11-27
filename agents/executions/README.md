# Executions

What was done and how it was verified. Plans say what *will* happen; executions record what *did*. New records start from the [execution template](../_templates/execution.md).

## Index

| Date | Record | Status |
|---|---|---|
| 2026-11-27 | [Development plan integration](2026-11-27-dev-plan-merge.md) into `LG/dev` | final, full local CI passed on `9308cea` |
| 2026-11-27 | [Browser and Node execution parity verification](2026-11-27-browser-node-execution-parity.md) | final |
| 2026-11-27 | [Tier 1 integration](2026-11-27-tier1-integration.md): loader, hook deprecations, call scopes and browser smoke merged into `LG/dev`; only records and minified bundles conflicted; stale `docs/callbacks.md` (new `load-report` event) regenerated; Jest 1151, integration 170 | final |
| 2026-11-25 | [Validated loader for untrusted graphs](2026-11-25-graph-loader.md): `LiteGraph.validateGraphData` (`src/graphloader.js`) with `LiteGraph.Loader.*` limits, runtime fields dropped, link checks and a type hook; the runner refuses failing workflows with a structured report; `graph.load()` and the Editor drop validate in repair mode; branch `LG/dev_graph_loader` | final; not merged |
| 2026-11-25 | [Hooks: generated doc tables, deprecation logs and strict "handled"](2026-11-25-hooks-deprecations.md): `npm run docs:callbacks` and its freshness test, `cb_handler` / `callbacks_handlers` / `callbackhandler_setup` log once, `LiteGraph.Hooks.StrictHandled` with `CallbackHandler.handledAt` on 8 sites and a strict-mode snapshot column (decision 0007); `Local-CI: pass 9b75f27`; branch `LG/dev_hooks_deprecations` | final |
| 2026-11-25 | [Call scopes and pure semantics](2026-11-25-call-scopes.md): flows step 4 (D-4): call scopes per frame, event, Sequence output, loop iteration and function call; `pure: "volatile"`; property version; `refresh` input; `volatile-loop-input`; audit findings 1–4 fixed; `benchmark.json` 40% faster under `ancestors`; branch `LG/dev_flows_call_scopes` | final; `Local-CI: pass cc2a532` |
| 2026-11-25 | [Browser smoke test of the built bundles](2026-11-25-browser-smoke.md) (USE-09): `editor_build.html` in a headless Firefox through WebDriver BiDi (no dependency), 9 checked steps with pointer and key input, in `npm run check`, skipped without Firefox; four findings (shared `LiteGraph` and MIDI, double click across a menu, search Enter before refresh, snap signals); `Local-CI: pass c5dfb77 ... browser 9/9 fresh ok`; branch `LG/dev_browser_smoke` | final |
| 2026-11-25 | [`no-undef` in the lint config, and the compatibility charter](2026-11-25-lint-charter.md): `no-undef` an error with browser/Node/provided globals (`globals` dev dependency), undeclared-names test guards the config, `docs/compatibility.md` (targets, checks, six rules; decision 0008, C-4); branch `LG/dev_lint_charter` | final |
| 2026-11-24 | [Pre-release 0.18.0-dev.2: push and merge](2026-11-24-release-0.18.0-dev.2-merge.md): `LG/dev` pushed, local CI `--full` proofs posted on PR #11, PR merged into `master` as `0bdeff3`, branches aligned; GitHub checks skipped by the gate; tagged `v0.18.0-dev.2` | final |
| 2026-11-24 | [Local CI and the gated GitHub workflow](2026-11-24-local-ci.md): `tools/ci/ci.mjs` (`npm run ci:local`, `lg ci`) in clean clones under `.lg/ci/`, parallel runs, optional audit/pack/ComfyUI/Bun steps, proof reports and `Local-CI:` summaries; workflow kept, gated on `LG_GITHUB_CI`; two parallel `--full` runs pass; branch `LG/dev_HMD_ci` | final |
| 2026-11-24 | [Group UX](2026-11-24-groups-ux.md): group body drag pans (title bar or Alt moves, `LiteGraph.Group.BodyDrag`), title size by zoom (`LiteGraph.Group.TitleScale`, 12–48 px), header toggle capped and clear of the title, space panning fixed (the space key threw in the keybinding lookup) and moved onto the gesture path (N-4); branch `LG/dev_HMD_groups` | final |
| 2026-11-24 | [Human feedback usability first pass](2026-11-24-hmd-usability-first-pass.md): starter pack/section inventories, six explained examples, boolean/auto-watch improvements and glyph slots; full gate and browser acceptance | final |
| 2026-11-23 | [HMD-06 starter workflow clarification](2026-11-23-hmd06-starter-workflow-clarification.md): auto workflow generator as an existing editor/runner feature; whole-section/pack coverage, organization and metadata suggestions, expanding packs | final; ideas only |
| 2026-11-23 | [Human feedback usability intake](2026-11-23-human-feedback-usability-intake.md): seven idea sketches for examples, common base nodes, adaptive watches, slot icons and an editor-based workflow builder; branch `LG/dev_hmd_examples_nodes_icons` | final; ideas only |
| 2026-11-23 | [Editor examples polish](2026-11-23-editor-examples.md): explicit models, fitted nodes and notes on every example; Basics and one example per flow category (11 new, 4 rewritten); stricter examples test; 6 library fixes; branch `LG/dev_HMD_examples` | final |
| 2026-11-23 | [Node pin, modes and exec slots](2026-11-23-node-pin-modes-exec-slots.md): mode 4 = BYPASS and ON_REQUEST = 5 with a migration and pass-through; exec slots on the node edges, created under `ancestors`; pin styles by mode and state, pin quick menu, graph status chip; branches `LG/dev_HMD_modes`, `LG/dev_HMD_exec_slots`, `LG/dev_HMD_node_pin` | final; track D (debugger) separate |
| 2026-11-23 | [Launcher and Bun commands](2026-11-23-launcher-and-bun.md): `lg.sh` / `lg.bat` and `tools/lg/` on Bun or Node (start, stop, restart, status, open, logs, info, menu), apps on Bun, `"node"` node types run on Bun, editor serves `/docs`; tests on Node and Bun | final; Windows and macOS not run |
| 2026-11-23 | [State audit fixes before the release](2026-11-23-audit-fixes.md): D-5 `triggerInput` through the engine, D-6 `executionModel` setter, D-8 `o:`/`i:` probe, library badges, `npm run docs` exits 0; D-7 not reproducible | final |
| 2026-11-23 | [Pre-release 0.18.0-dev.2](2026-11-23-pre-release-0.18.0-dev.2.md): records hygiene, D-1 to D-3 fixed, version, release checks (clean clone, packed install, ComfyUI probes, browser) | final; released ([step 6](2026-11-24-release-0.18.0-dev.2-merge.md)) |
| 2026-11-22 | [Wave 7: the deferred items](2026-11-22-wave7-deferred.md): per-site result snapshot, hook/event order golden, `fireHookThenEvent` (events skipped after a veto), dispatch tap, typed hook maps and check, `objectOf` menu sites | final |
| 2026-11-22 | [Panels and widgets](2026-11-22-panels-and-widgets.md): value types (type → canvas widget and panel editor), colour and vector widgets, options panel tabs, node details panel, panel editors and sections; branch `LG/dev_panel_and_widget`, merged into `LG/dev` | final |
| 2026-11-22 | [Flows track, examples](2026-11-22-flows-examples.md): examples manifest, Demo menu by category, `packs.listTemplates()`, examples test, audit finding 10 fixed (example and first-value pull) | final |
| 2026-11-22 | [Flows track, declarations](2026-11-22-flows-declarations.md): pure, ticks and ON_EVENT defaults for 36 more types (86 of 273), volatile types commented, host `actionDo` pulls under `ancestors` | final |
| 2026-11-22 | [Wave 7: event integration, the core](2026-11-22-wave7-event-core.md): one listener core for hooks and typed events, compatible `onX`, fast path, isolated errors, `LiteGraph.events`, `ctx.listen`, E12/E13 fixed | final |
| 2026-11-22 | [Flows track, reference](2026-11-22-flows-reference.md): `npm run docs:nodes` node reference, pack descriptions, `def.usage`, descriptions for every bundled type, catalog test of 273 types | final |
| 2026-11-22 | [Pre-release 0.18.0-dev.1](2026-11-22-pre-release-0.18.0-dev.1.md): all planned waves done, release checks (clean clone, packed install, probes, browser), version bump | final; never tagged, superseded by 0.18.0-dev.2 |
| 2026-11-22 | [Wave 5c: apps move](2026-11-22-wave5c-apps-move.md): apps/, vendor/, old URLs kept, one defaults module, runner prefix fix | final |
| 2026-11-22 | [Wave 6e: deprecations, docs, Wave 6 summary](2026-11-22-wave6e-polish.md): legacy flags deprecated (one log per flag, removal no earlier than 0.20), guide Execution and Events rewritten, decision 0002 | final |
| 2026-11-22 | [Wave 6d: graph info, event-run reporting, runner](2026-11-22-wave6d-graphinfo-runner.md): execution model in the graph info, `execution-state` for action and pull runs, runner overlay and parity | final |
| 2026-11-22 | [Wave 6c: node execution declarations](2026-11-22-wave6c-declarations.md): `static def.execution`, `declareNodeExecution`, mode checks, the model's default mode | final |
| 2026-11-22 | [Wave 6b: execution engine and models](2026-11-22-wave6b-engine.md): `ExecutionEngine`, model registry (`ancestors`, `step`, `strict`, `event`), `config.execution`, `legacy` paths | final |
| 2026-11-22 | [Wave 6a: characterization and event fixes](2026-11-22-wave6a-ensure.md): characterization matrix, golden snapshots, flag-independent event fixes | final |
| 2026-11-21 | [Wave 5a–5b: packaging, CI, docs](2026-11-21-wave5ab-packaging-ci-docs.md): dependency advisories, no required dependencies, explicit exports, no debug defaults in builds, build freshness in CI, getting started and architecture docs | final |
| 2026-11-21 | [Wave 4e: catalog and boundaries](2026-11-21-wave4e-catalog-boundaries.md): one watch node, network and process renames with mappings, jQuery file removed, reroutes across subgraph boundaries; Wave 4 complete | final |
| 2026-11-20 | [Integrate LG/dev and align master](2026-11-20-integrate-dev-and-master.md): joined the records and runner lines, then opened PR #8 to `master` | final |
| 2026-11-20 | [Wave 4d: layout and palette](2026-11-20-wave4d-layout-palette.md): auto-layout adapter (dagre on demand, layered, ELK), node palette API and Editor panel | final |
| 2026-11-20 | [Wave 4c: links and view](2026-11-20-wave4c-links-view.md): RenderLink and routers, link styles, minimap, pan as a pointer gesture | final |
| 2026-11-20 | [Wave 4b: workspace state and execution](2026-11-20-wave4b-workspace.md): change stream, dirty flag, draft autosave, execution-state protocol, overlays and title icons | final |
| 2026-11-20 | [Wave 4a: packs and missing nodes](2026-11-20-wave4a-packs.md): pack manifests and registry, builtin packs, provenance stamping, missing-nodes report and panel, replacement mappings | final |
| 2026-11-20 | [Wave 3c: components](2026-11-20-wave3c-components.md): registered subgraph components with updates, blueprints, 43 SA acceptance cases; Wave 3 complete | final |
| 2026-11-20 | [Wave 3b: subgraph authoring](2026-11-20-wave3b-subgraph-authoring.md): breadcrumb, subgraph commands, interface editing, promoted widgets, path ids | final |
| 2026-11-20 | [Wave 3a: schema probe](2026-11-20-wave3a-schema-probe.md): ComfyUI schema validation (79/79), content kept, definitions by default, ADR 0001 accepted | final |
| 2026-11-20 | [Wave 3a: subgraph definitions](2026-11-20-wave3a-subgraph-definitions.md): ComfyUI-form definitions, registry, linked instances, function node, runner policy, interop | final; probe closed in the next record |
| 2026-11-20 | [Wave 2a: authoring operations](2026-11-20-wave2a-authoring.md): subgraph convert/unpack, groups, clipboard fragments, ranked search | final |
| 2026-11-20 | [Wave 2b: links and pointer](2026-11-20-wave2b-links.md): link snapping and events, quick connect, drags as pointer gestures, floating reroutes, badges and title buttons | final |
| 2026-11-01 | [Baseline validation](2026-11-01-baseline-validation.md): setup, contracts, editor, tester and runner acceptance | final |
| 2026-11-01 | [Readiness checklist](2026-11-01-readiness-checklist.md): verified foundation and remaining acceptance work | snapshot |

## Waves

| Wave | Branches | Record |
|---|---|---|
| 0 Safety | `LG/wave0_safety` ([PR #5](https://github.com/atlasan/litegraph.js/pull/5)) | [roadmap](../plans/roadmap.md#wave-0-safety-and-correctness-done), [review](../audits/2026-11-19-wave0-pr5-review.md), `CHANGES.md` |
| 1 Platform | `LG/wave1_platform`, `LG/wave1_finish` | [roadmap](../plans/roadmap.md#wave-1-platform-layer-done), `CHANGES.md` |
| 2a Authoring operations | `LG/wave2_authoring` | [execution](2026-11-20-wave2a-authoring.md), [plan](../plans/2026-11-20-wave2-authoring-core.md) |
| 2b Links and pointer | `LG/wave2_links` | [execution](2026-11-20-wave2b-links.md), [plan](../plans/2026-11-20-wave2-authoring-core.md) |
| 3a–3c Subgraph system | `LG/wave3_subgraphs`, `LG/wave3b_authoring`, `LG/wave3c_components` ([PR #10](https://github.com/atlasan/litegraph.js/pull/10)) | [3a](2026-11-20-wave3a-subgraph-definitions.md), [probe](2026-11-20-wave3a-schema-probe.md), [3b](2026-11-20-wave3b-subgraph-authoring.md), [3c](2026-11-20-wave3c-components.md), [plan](../plans/2026-11-20-wave3-subgraph-system.md) |
| 4a Packs and missing nodes | `LG/wave4a_packs` | [execution](2026-11-20-wave4a-packs.md), [plan](../plans/2026-11-20-wave4-ecosystem-workspace.md) |
| 4b Workspace state and execution | `LG/wave4b_workspace` | [execution](2026-11-20-wave4b-workspace.md), [plan](../plans/2026-11-20-wave4-ecosystem-workspace.md) |
| 4c Links and view | `LG/wave4c_links` | [execution](2026-11-20-wave4c-links-view.md), [plan](../plans/2026-11-20-wave4-ecosystem-workspace.md) |
| 4d Layout and palette | `LG/wave4d_layout` | [execution](2026-11-20-wave4d-layout-palette.md), [plan](../plans/2026-11-20-wave4-ecosystem-workspace.md) |
| 4e Catalog and boundaries | `LG/wave4e_catalog` | [execution](2026-11-21-wave4e-catalog-boundaries.md), [plan](../plans/2026-11-20-wave4-ecosystem-workspace.md) |
| 5a–5b Packaging, CI, docs | `LG/wave5a_packaging`, `LG/wave5b_ci_docs` | [execution](2026-11-21-wave5ab-packaging-ci-docs.md), [plan](../plans/2026-11-21-wave5-repository-packaging.md) |
| 5c Apps move | `LG/wave5c_apps` | [execution](2026-11-22-wave5c-apps-move.md), [plan](../plans/2026-11-21-wave5-repository-packaging.md) |
| 6a Event characterization and fixes | `LG/wave6a_ensure` | [execution](2026-11-22-wave6a-ensure.md), [plan](../plans/2026-11-22-events-execution.md) |
| 6b Execution engine and models | `LG/wave6b_engine` | [execution](2026-11-22-wave6b-engine.md), [plan](../plans/2026-11-22-events-execution.md) |
| 6c Node execution declarations | `LG/wave6c_declarations` | [execution](2026-11-22-wave6c-declarations.md), [plan](../plans/2026-11-22-events-execution.md) |
| 6d Graph info, reporting, runner | `LG/wave6d_graphinfo` | [execution](2026-11-22-wave6d-graphinfo-runner.md), [plan](../plans/2026-11-22-events-execution.md) |
| 6e Deprecations, docs, Wave 6 summary | `LG/wave6e_polish` | [execution](2026-11-22-wave6e-polish.md), [plan](../plans/2026-11-22-events-execution.md), [decision 0002](../memories/decisions/0002-execution-models.md) |
| 7 Event integration | `LG/wave7_events`, `LG/dev_events_deferred` | [core](2026-11-22-wave7-event-core.md), [deferred](2026-11-22-wave7-deferred.md), [review](../audits/2026-11-22-wave7-review.md), [plan](../plans/2026-11-22-event-integration.md) |
| Track: flows | `LG/dev_flows_reference`, `LG/dev_flows_declarations`, `LG/dev_flows_examples` | [reference](2026-11-22-flows-reference.md), [declarations](2026-11-22-flows-declarations.md), [examples](2026-11-22-flows-examples.md), [plan](../plans/2026-11-22-flows-reference-examples.md) |
| Track: panels and widgets | `LG/dev_panel_and_widget` | [execution](2026-11-22-panels-and-widgets.md), [plan](../plans/2026-11-22-panels-options-node-details.md) |

From Wave 2 on, each wave gets a dated execution record: what changed, the gate result, browser checks, and what was left open.

**Evidence:** capture screenshots or logs only when they prove something a test cannot. Store them in `evidence/YYYY-MM-DD-topic/`, next to the record that cites them. The 2026-10 screenshots were dropped as outdated.
