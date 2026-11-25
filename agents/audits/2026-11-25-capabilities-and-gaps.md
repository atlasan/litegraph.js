# Capability and backlog refresh after 0.18.0-dev.2

> **Date** 2026-11-25 · **Kind** audit · **Status** final · **Base** `LG/dev` @ `a14c29a`

Reviewed by the primary coding-agent session: the full catalog, all 15 card files, landscape/record indexes, the state/examples audits and subsequent executions, current source owners, and shipped registry metadata. Ran a focused execution probe and the existing node-reference construction harness. This is an exhaustive collection with selective implementation verification; it is not an independent full security, browser, hardware or third-party ecosystem audit.

The result is a [complete idea/card inventory](2026-11-25-idea-inventory.md), a [machine-readable node/capability and idea snapshot](2026-11-25-capability-inventory.json), and a [fresh priority proposal](../plans/2026-11-25-priority-refresh.md). The proposal changes no accepted implementation scope.

## Findings

| # | Severity | Finding | Evidence | Since |
|---|---|---|---|---|
| A1 | medium | Same-call property changes still do not invalidate an ON_REQUEST memo. The probe reads `1`, changes the source property to `2`, then reads `1` again; the node runs once. This confirms the existing FLW-04 gap, not a new regression. | `src/execution.js:174`, `src/lgraphnode.js:493`; probe below | Open; proposed T1 |
| A2 | medium | Pack tooling has little metadata to work from: 86/273 shipped types declare execution needs, 9 have usage text, none declares static input/output metadata, and exposed pack templates total zero. Missing declarations are not proof that a type is unsafe or incorrectly scheduled. | `tools/node-reference.mjs:171`, `src/litegraph.js:410`, snapshot `counts` | Open; proposed T3, scope-dependent declarations after T1 |
| A3 | medium | Catalog maturity and implementation have drifted apart. Recent palette, live overlays and group mode/drag support exist despite old seed/sketched entries; HMD cards are promoted for a bounded first pass, not complete in all their ambitions. | `src/palette.js:157`, `apps/runner/public/execution-view-state.js:1`, `src/lgraphcanvas.js:9718`, [HMD execution](../executions/2026-11-24-hmd-usability-first-pass.md) | Reconciled separately in this inventory; existing maturity preserved |
| A4 | low | The ideas README counted 264; the base catalog contains 265 because FLW-28 was added. Eleven older uncatalogued wishes also remained in plans/roadmap/executions. | Base catalog; [collected gaps](../ideas/landscape/remaining-platform-gaps.md) | Now 276 catalog entries, all in the inventory |
| A5 | medium | The codebase map still said full bundles enable scripts, package exports use build wildcards, and old type/test counts. Direct bundle checks show scripts off and no `./build/*` wildcard; source owners confirm the hardened package/runtime contract. | `build.py:130`, `package.json`, bundle probes; snapshot `api` | Living map corrected in this review |
| A6 | low | Older cards assume that models, profile labels, runtime profiles and execution capabilities are interchangeable. Five execution models exist; example `profile`/`flow` labels exist; there is no `registerGraphProfile` runtime API. The realtime example label alone does not imply a new realtime engine. | `src/execution.js:40`, `apps/editor/examples/index.json`, [FLW-08 card](../ideas/cards/FLW-08-graph-profiles.md) | Open; proposed T5 |
| A7 | low | The debugger analysis/card promised by the node-pin plan has not been delivered: no FLW-16 card exists among the 15 cards, and the roadmap explicitly defers track D. Dispatch taps and execution-state overlays are foundations, not breakpoints. | [Node-pin plan](../plans/2026-11-23-node-pin-modes-exec-slots.md), `src/eventtarget.js`, card inventory | Open; research/trace before a pause engine (T9) |

## Measured baseline

These counts come from the committed Node full bundle, with gl-matrix loaded and the existing construction stubs. They are not hardware or service execution claims.

| Measure | Current value |
|---|---|
| Version / local release baseline | `0.18.0-dev.2`; release/tag recorded complete in the [release record](../executions/2026-11-24-release-0.18.0-dev.2-merge.md) |
| Registry | 273 node types; 273 construct under the reference harness |
| Pack manifests | 27 registered; 25 contain node types in this bundle |
| Execution metadata / usage / static slots | 86 declared / 9 usage / 0 static input and 0 static output declarations |
| Templates exposed through the pack API | 0 |
| Examples | 50 manifest entries: 36 visible, 14 hidden WIP; 6 have structured lesson guides |
| Capabilities (overlapping tags) | browser 117, DOM 22, WebGL 68, MIDI 12, audio 15, network 13, Node 18, sys 13 |
| Main / Node full type counts, gl-matrix present | 255 / 273; without the gl-matrix global the main/full browser bundle registers 247 |
| Existing catalog / cards | 265 IDs at the base commit; 15 card files. This refresh collects 11 stranded wishes: 276 IDs now |
| Delivery assessment across 276 ideas | 15 delivered baselines, 24 partial, 9 open/source-checked, 227 candidates, 1 parked |
| Source TODO markers | 97 `TODO/FIXME/XXX/HACK` lines in `src/` and `apps/`; these are search hits, not 97 confirmed defects |

Every measured node, slot, property summary, capability, pack and execution declaration is in the JSON snapshot. `candidate` is deliberately not a claim that an entire integration was searched and proven absent. Card maturity/reuse labels are preserved from their sources; licence/activity claims in external studies were not reverified online.

## Feature and capability map

| Area | Implemented foundation and owner | Remaining capability |
|---|---|---|
| Graph model and authoring | Transactions/history, unified selection, groups, clipboard, reroutes, search; `src/lgraph*.js`, `src/reroute.js` | Group collapse/notes/locking and coherent multi-item inspection; complete nesting semantics rather than a second group implementation |
| Execution | Five models, declarations, bypass, mode migration, engine error/state reporting; `src/execution.js` | Scope/property invalidation, volatile semantics, lifecycle/custom events, optional profiles |
| Subgraphs | Definitions, stable IO IDs, linked instances, promoted widgets, functions, blueprints; `src/subgraph*.js` | Higher-order map, live sync while editing, IO rails; field/latent/async semantics need separate contracts |
| Extension platform | Commands, keybindings, persistent settings, menus, disposers, one listener core; platform modules | Generated hook docs/deprecation diagnostics, coherent UI ownership, settings/preset UX; existing exports/storage are not a complete profile UI |
| Widgets and panels | Per-type widget registry, value types, colour/vector editors, node/options panels; `src/widgets.js`, `src/valuetypes.js`, `src/panels.js` | Multi-select/group/reroute editors, resource picker host service, richer schemas; floating/stacks/layouts are beyond current side docking |
| Everyday inspection/icons | Boolean polish, bounded auto Watch, glyph slot labels and title glyph/loaded-image support; `src/nodes/base.js`, `LiteGraph.getSlotLabel` | Full schema/object inspection, automatic view-state handling and SVG asset management remain partial |
| Examples and pack creation | Manifest/menu, six structured guides, Basics/flow examples, starter inventories and metadata export; editor app, `src/palette.js` | Guided actions and feature-entry links, fit on load, actual pack templates, author metadata and reconciliation of edited starters |
| Rendering/workspace | Minimap, routers/styles, layout adapters, palette and group UX | Measured large-graph/visual baselines, universal keyboard/ARIA access, touch; tabs/themes are separate UX work |
| Runner | Worker-per-graph, internal HTTP/WS control, execution-state overlay, Host/Origin checks, recursive policy/script gate; `apps/runner/` | Bounded document loader, limits/watchdog, stable external run API and auth policy for any expanded exposure; durable jobs are separate |
| Packaging and quality | Twelve bundles, exports/type parity, tests, clean-clone local CI and proof reports; `build.py`, `tools/ci/` | Repeatable browser/visual checks, perf measurements, selected coverage goals; Bun's recorded one-case integration difference remains advisory |
| Launching and release | Cross-runtime commands/process control and tagged dev.2 release | Windows/macOS acceptance, doctor/profiles/completions if useful; shipping a binary is not a prerequisite for testing the current launcher |
| Domain integrations | Existing graphics/audio/MIDI/network/object/Node packs | 3D interactivity, process durability, AI/MCP/data/device adapters are separate product directions; registry tags/stubs are not proof of live device compatibility |

## Reconciled older gaps

| Earlier claim | Current assessment |
|---|---|
| “No tag; no PR; master behind release” | Historical. The [release record](../executions/2026-11-24-release-0.18.0-dev.2-merge.md) supersedes R1–R4 of the state audit |
| State audit D-1/D-2/D-3, D-5/D-6/D-8 | Closed by pre-release and [audit-fix records](../executions/2026-11-23-audit-fixes.md); D-7 was not reproduced there. D-4 remains and is reproduced above |
| No examples for dataflow/realtime/reactive | Closed by [example polish](../executions/2026-11-23-editor-examples.md); broader per-feature/per-pack guides remain FLW-28 |
| Group body dragging and broken space panning | Fixed with settings and browser evidence in [group UX](../executions/2026-11-24-groups-ux.md). Full edge handles/notes/locking remain partial |
| No execution-state view, recent palette, drafts, colour/vector editors | Foundations exist in the current owning sources; broader run history, layout/profile and schema ambitions remain separate |
| Pack `templates[]` and a workflow generator do not exist | Contract/menu and starter inventory exist. The measured gap is zero shipped templates and sparse author metadata, not a missing registry/editor |
| Reroutes across subgraph boundaries are still a Wave 2 carry-over | Delivered in [Wave 4e](../executions/2026-11-21-wave4e-catalog-boundaries.md); a broader reroute conformance audit remains GRP-07 |
| Earlier cards demand a new Bun runtime before runner work | Existing apps run on Node/Bun. A durable process engine and runtime adapter interface are different, still unaccepted work |

The eleven newly catalogued subjects are HMD-08, X-14–X-21 and DEV-07–DEV-08; their source links live in [remaining platform gaps](../ideas/landscape/remaining-platform-gaps.md). Additional non-feature work stays explicit: Windows/macOS acceptance, runner race/leak coverage, generated-doc publication (D9), compatibility charter (USE-36), hook handled/async policy (D8), metadata/porting choices (D3/D4), and the deferred TypeScript/bundler decision. Do not convert every historic TODO into a scheduled feature.

## Verification and limits

- Ran `/tmp/lg-priorities-probe.mjs` using `loadCatalog`/`buildReference` from `tools/node-reference.mjs`. It constructed shipped nodes under the existing harness, enumerated definitions/manifests/examples and reproduced the in-call property issue with a two-node graph and `sink._dispatchEvent`: read, `source.setProperty("value", 2)`, read. Result: `[1,1]`, one execution, final property `2`.
- Separate fresh-process bundle imports measured main-with-gl-matrix `255`, full-without-gl-matrix `247`, both with `allow_scripts=false`. Package inspection excludes `./css/*` when checking for forbidden build export wildcards.
- Source/record review corroborated delivered and partial items; the complete inventory explicitly labels unverified candidate delivery rather than claiming every donor integration is absent.
- Latest recorded full local CI: `Local-CI: pass 2ff8628 node22.23.4 jest 1016/1016 int 159/159 fresh ok audit 0 pack 9/9 comfy 79/79 bun 158/159 (advisory)`. `git diff --name-only 2ff8628 a14c29a` contains documentation/records only. This is existing release evidence, **not a new test run**.
- No code, dependencies, runtime settings, workflows or GitHub settings were changed. The full code gate was not rerun for this documentation-only inventory. Local link/ID/count/coverage validation is recorded with the proposal.

## Verdict

The delivered platform is substantially ahead of its older summaries. The highest-value next work **[I]** is scoped execution correctness, repeatable browser confidence and better pack metadata/guides, followed by lifecycle events and minimal document profiles. Keep external runner contracts bounded and measured; choose a domain direction before committing to durable orchestration, 3D interop or AI integration. The [proposal](../plans/2026-11-25-priority-refresh.md) supplies slices and acceptance checks.
