# LiteGraph pipeline and priorities

> **Date** 2026-11-27 · **Kind** review · **Status** current · **Base** `LG/dev` @ `6d65e20`

[Roadmap](roadmap.md) · [Original milestone plan](2026-11-25-next-priorities-after-0.18.0-dev.2.md) · [All idea cards and catalog entries](../ideas/catalog.md) · [Prior integration proof](../executions/2026-11-27-dev-plan-merge.md)

## Work in order

| Priority | Task | Status and dependencies | Evidence to close |
|---|---|---|---|
| Done | Integrate the classic browser build and host-driven execution into `LG/dev` | Merged at `6d65e20`. Track downstream changes in their own repositories. | [Full clean-clone proof](../executions/2026-11-27-host-pipeline-merge.md). |
| 0.18 release | Verify the quick-start wrappers on Windows and macOS, LCH-01 | Implemented. Native Windows and macOS evidence pending. Can run independently of host and library-structure work. | One report per OS with runtime selection, launch, browser open, restart and shutdown. |
| 0.18 release | Release distribution, D12 / RD-4 | Decided. Distribute through a Git tag and release artifacts. | Verify the tarball and its entry points with a local packed-install check. |
| 0.18 release | Validate the exact release candidate | After the candidate and milestone snapshot are agreed. Optional ComfyUI and Bun steps have separate outcomes in the report. | `npm run ci:local -- <candidate> --full`, snapshot, version and changelog check, approval for the Git tag. |
| 0.19 next | Add a headless entry, revised Tier 2 step 7 | Loader already merged. Preserve the existing `./core` contract. | Execute a saved graph without canvas imports. Check ESM, CommonJS and types for the headless entry and `./core`. |
| 0.19 later | Split canvas seams, N-10 (step 9) | Browser smoke exists. Use small input, renderer, widget and menu changes with the host fixture checks. | Browser interactions and host fixtures pass after each move. |
| 0.19 later | Replace build concatenation with explicit imports and esbuild (step 10) | After the headless entry. Coordinate with the canvas track and classic build, which also affect bundle inputs. | Package and type consumers, classic globals, snapshot workflow and bundle sizes verified. |
| 0.19–0.20 | Pack enable/disable and compatibility range, N-9 (step 11) | Planned. | Disabling removes registered contributions, enabling restores them, and incompatible versions are reported. |
| 0.19–0.20 | Settings profiles and property presets, X-12/X-11 (step 12) | Planned. Coordinate with graph profiles on the document boundary. | Profile round trip and one undo step per preset. |
| 0.19–0.20 | Graph change stream and external-model reconciliation, X-03 (step 13) | Planned. | A sample host and the canvas stay in sync in both directions. |
| 0.19–0.20 | Movable and dockable panels, X-13 (step 14) | Planned. | Browser verifies layout persistence across reload. |
| Later | Versioned LiteGraph Runner API and health endpoint, X-01/X-10 (step 17) | Planned [runner API card](../ideas/cards/X-01-runner-public-api.md). | Contract tests and existing runner safety behavior. |
| Decision | C# port, D13 (step 18) | Choose archive or shared graph-schema conformance. | Decision record and a conformance test if retained. |
| On hold | Drop legacy execution or deprecated flags, D11 (step 19) | User decision keeps legacy with no removal date. Strict hook handling is available as an opt-in. | Reopen only on a future decision. |

## Launcher and ComfyUI verification

**LCH-01 is the source-checkout launcher for LiteGraph's demo apps.** From the repository, use `./lg.sh start editor` on macOS or Linux and `.\lg.bat start editor` in Windows PowerShell (or `lg.bat start editor` in cmd). Both wrappers call `tools/lg/lg.mjs`. They choose Bun first and fall back to Node, with `LG_RUNTIME` available to select one. The editor server serves the editor, tester and docs. The runner is a separate app. Native smoke should check `help`, start, `status --json`, `open editor`, logs, restart and stop, including the OS-specific browser launch and process cleanup. Record the OS, shell, runtime, commit and results. [Launcher card](../ideas/cards/LCH-01-cross-os-launcher.md) · [Implementation record](../executions/2026-11-23-launcher-and-bun.md)

**ComfyUI probes are offline workflow JSON tests.** `probe_subgraphs.mjs` validates 0.4 and 1.0 data against ComfyUI's schema, including export, import/export and edits. `probe_subgraph_content.mjs` compares content across the round trip, including definitions, instances, links, ports and node data. LiteGraph uses placeholders for Comfy node types to preserve data without running their implementations. The probes run under Node with a local pinned schema, workflow fixtures and Zod. They use no Comfy backend, HTTP API or frontend library swap. The regular Jest gate includes in-repo interop tests. Run the supplementary comparison with `npm run ci:local -- <ref> --comfy` once the ignored inputs are present, or use `--full`. The host integration run skipped this step. The historical probe reported 79/79 schema cases and zero content differences across 41 fixtures. [Fixture instructions](../../experiments/comfy-interop/README.md) · [Historical results](../executions/2026-11-20-wave3a-schema-probe.md)

**ComfyUI follow-up work** is Tier 4 step 16. GRP-07 audits 0.4/1.0 reroutes, including old Reroute nodes and reroutes inside subgraphs. C-3 surveys custom nodes for widget and authoring ideas. Record round-trip fixtures for GRP-07 and a research record for C-3. Live Comfy API integration and replacing the frontend's LiteGraph have no accepted task in this pipeline. The [ComfyUI landscape](../ideas/landscape/comfyui-world.md) tracks ecosystem ideas.

## Proposal audit and delivery order

[Commit `f838107`](https://github.com/atlasan/litegraph.js/commit/f8381078c70d2ca0a06071434e5bc819fd0c452c) is the sole unique commit on `LG/dev_priorities_refresh`. GitHub reports it one commit ahead and 44 behind the prior integration baseline `3c1c1ec`, with common ancestor `a14c29a`. It adds documentation and data. Its historical inventory contains 276 ideas, 15 cards, and 273 node types. The 11 IDs absent from `LG/dev` were reconciled into the current catalog. The original [full idea inventory](https://github.com/atlasan/litegraph.js/blob/f8381078c70d2ca0a06071434e5bc819fd0c452c/agents/audits/2026-11-25-idea-inventory.md), [JSON snapshot](https://github.com/atlasan/litegraph.js/blob/f8381078c70d2ca0a06071434e5bc819fd0c452c/agents/audits/2026-11-25-capability-inventory.json), and [proposal](https://github.com/atlasan/litegraph.js/blob/f8381078c70d2ca0a06071434e5bc819fd0c452c/agents/plans/2026-11-25-priority-refresh.md) remain available at the audited SHA.

| Audit group | Current disposition and next evidence |
|---|---|
| T1, scoped freshness (proposal A) | **Delivered.** Same-call property edits, scopes, volatile values and refresh now have regression coverage. Keep the large-graph benchmark (DEV-02) as follow-up evidence. [Call scopes execution](../executions/2026-11-25-call-scopes.md) |
| T2, confidence and cleanup (proposal C) | **Browser baseline delivered.** Built-editor smoke and browser/Node trace parity are in the gate. Visual fixtures (DEV-03) and the tester controller (DEV-08) remain candidates. Hook docs and deprecation diagnostics (DEV-07) shipped. |
| T3, author-ready packs (proposal B) | **Best bounded new proposal for editor users.** Add example fit (HMD-08), usage and static slots for representative Basics/events nodes, and one template with an expected result and one-step undo. Rechecking the current registry produced 273/273 constructs, 89 execution declarations, nine usage entries, zero static slot declarations and zero pack templates. Keep the initial scope small enough to validate metadata preview without constructing nodes. |
| T4, lifecycle and custom events | **Proposed.** Start/tick/stop and named calls (FLW-05/06) can build on the existing execution and listener work. Prove event order, cross-subgraph lookup, restart and cleanup before adding dispatchers or Catch/Complete (FLW-20). A profile API is independent. |
| T5, document profiles | **Proposed.** Save a profile over existing models, mode/UI defaults, palette and templates (FLW-08/24). Prove undo and save/load parity. Choose how to store a profile and handle an unavailable name. Keep host settings profiles under X-12. |
| T6, accessible and configurable authoring | **Mixed.** Settings/presets and dockable panels have milestone slots. Mixed selection inspection (X-14) and keyboard access (X-08) need separate slices. For inspection, prove mixed values and a single undo step for a shared property edit. |
| T7, loader and runner | **Loader delivered.** The broader run contract and health endpoint remain step 17. Define run identity, resource limits and authorization with contract tests for any expanded exposure. |
| T8, pack and host interfaces | **Proposed.** Use the bounded pack work to settle metadata, then test one schema-generated pack in editor and runner. Host services, format adapters and slot/widget conversion (X-19) are separate ideas. |
| T9, execution diagnostics | **Proposed.** Start with a bounded node/path/scope trace using the dispatch tap and execution state. Prove nested scopes, errors and listener disposal. The FLW-16 debugger remains a catalog entry and a breakpoint design still needs a proposal. |
| T10, domain projects | **Choose by use case.** The two 3D hosts already have a named track. glTF interactivity, durable orchestration and data/device/MCP adapters need their own end-to-end targets. |

## Portability decisions

- **Unavailable saved model.** The opener keeps the requested model name, permits inspection and pauses execution. Browser/Node parity now covers start gating, reopen and selecting an available model. The earlier assessment's missing-model and cross-host lifecycle findings are covered by the merged parity work. [Parity plan](2026-11-27-browser-node-execution-parity.md)
- **Directional type contract.** Outputs declare possible emissions and inputs declare accepted types. The current LiteGraph matcher still accepts a wire when the type sets overlap. The current build accepts `number|string` into `number` and rejects `string` into `number`. A strict portable verdict remains a proposal. Choose an initial validation surface and decide how to present existing wires after an operation changes its output signature. Operation-aware declarations, related variants and visible converters can use that decision. [Connection matcher](../../src/litegraph.js)
- **Transport and execution.** Review saved-document fidelity, runtime effects and host capabilities independently. ComfyUI workflow round trips and the two 3D hosts give the current fixtures. Rete, Node-RED, Blueprint and VL remain research targets for specific structure or execution comparisons.

## Parallel host tracks

| Track | Evidence already recorded | Next acceptance work |
|---|---|---|
| WebGLStudio and classic build (step 15) | The browser harness compares the bundled and current classic runtime for logic, inline and external graphs, FX, desktop player, mobile startup/playback and the offline ZIP. | Pin the host integration and obtain broader shareable projects. Give mobile with the file server, reverse export to the old bundled runtime, and shader compilation their own fixtures. [Execution](../executions/2026-11-27-classic-browser-webglstudio.md) |
| nunuStudio (step 15, NUN-01/02) | Prototype-format import, object bindings, graph tab, Play/Stop, Escher save/reopen and the exported preview have Playwright coverage. | Pin the host integration and exercise more prototype projects. Material work follows representative lifecycle fixtures. NUN-06, offering the integration upstream, is a separate idea. [Execution](../executions/2026-11-27-nunustudio-litegraph.md) |
| Shared 3D behavior | Proposed after both host bindings work. | Run one shared graph with a parameter and event binding in each host. Compare ordered effects, save/reopen and Play. Explore shader and deeper FX work after this baseline. [Host milestones](2026-11-27-legacy-projects-and-editor-integration.md) |

## Cards, proposals and open decisions

- **Flows.** Reference, examples and call scopes (FLW-01–04, FLW-14, FLW-22–23) are done. Proposed next sequence is lifecycle and custom events (FLW-05/06), graph profiles and profile-aware palette (FLW-08/24, reusing the implemented FLW-07 exec pin support), then per-profile examples and docs (N-11). The debugger (FLW-16) and glTF interactivity (3D-01) remain separate proposals. [Flows direction](2026-11-22-flows-direction.md) · [Flow cards](../ideas/README.md#cards)
- **Groups and launchers.** GRP-01's body-pan/title-drag behavior and C-4's compatibility charter are implemented. GRP-02–06/08 (group nesting, modes, styling, comments, drag/resize, actions), LCH-04/06–09 (doctor, executable, profiles, completion, watch), and C-5 (concept docs) remain candidates. [Groups catalog](../ideas/catalog.md#groups-notes-and-reroutes-grp) · [Launcher catalog](../ideas/catalog.md#launcher-and-command-line-lch)
- **Editor and tooling backlog.** N-2 (undo default) needs a decision. N-3 and N-5–N-9 cover tester consolidation, palette undo, link labels, narrow toolbar, badge space and additional status/picker work. Generated node references stay local under D9. Moving generated API documentation, housekeeping of merged refs and optional worktrees, and the remaining [deferred roadmap items](roadmap.md#deferred-each-needs-its-own-proposal) have no active release slot. [State audit](../audits/2026-11-23-state-audit.md)
- **Broader idea cards.** HMD-01–05 cover the delivered examples and usability work in part. HMD-06's workflow generator has a starter pass, with validation, wiring and reconciliation still candidate work. HMD-07 covers shared icon assets. BUN-01 describes a separate process designer/runner. [Usability execution](../executions/2026-11-24-hmd-usability-first-pass.md) · [Ideas index](../ideas/README.md)
- **Decisions to return to.** D13 C# and the behavior supported by reverse export to old host runtimes remain open. D9 generated node-reference publishing, D11 legacy retirement and any async hook proposal remain deferred. D10 keeps local CI as the merge proof. [Decision table](roadmap.md#open-decisions)

## Branch reference

GitHub identifies `f838107` as the tip of `LG/dev_priorities_refresh`. The API lists no separate branch named `solo`. The current catalog incorporates the 11 backlog IDs from the review, and this document records which proposed work subsequently shipped and which decisions remain open.
