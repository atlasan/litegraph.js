# Ideas docspace

> **Started** 2026-11-19 · **Kind** index · **Status** living

This is a database of feature and integration ideas for this fork. It is grouped by *purpose* (what people build with node graphs) and informed by how other projects use litegraph and its neighbours.

**This is not the production pipeline.** Entries are candidates unless explicitly linked to accepted plans:
- The [roadmap](../plans/roadmap.md) and [plans/](../plans/README.md) hold accepted work.
- This folder is upstream of the first step there (*idea*).
- Ideas move into `plans/` only by a deliberate promotion (see [Lifecycle](#lifecycle)). Adding ideas here never changes the roadmap.

## How to read it

| Start with | What it answers |
|---|---|
| [purposes.md](purposes.md) | What are node graphs used for, and which ideas serve each purpose? |
| [catalog.md](catalog.md) | **The database:** one row per idea, with ID, purpose, kind, effort, maturity and license class |
| [landscape/](#landscape-investigations) | The investigations behind the ideas, one document per area |
| [cards/](#cards) | Ideas that outgrew a row: design sketches, open questions, experiments |

## State on 2026-11-25

**Contents:**
- **276 ideas** across 13 prefixes: 21 cross-cutting, 45 USE, 55 ComfyUI, 10 WebGLStudio, 6 nunuStudio, 22 3D, 34 JS, 22 Bun, 28 execution flows, 8 repository tooling, 9 launcher, 8 groups and 8 human-feedback ideas.
- **Maturity:** 178 seed, 72 sketched, 6 investigated, 19 promoted and 1 parked (recounted from the catalog).
- **Current delivery:** the [full inventory](../audits/2026-11-25-idea-inventory.md) separately records 15 delivered baselines, 24 partial implementations, 9 open/source-checked items, 227 candidates and 1 parked entry. A promoted card is not necessarily complete.
- **Fresh synthesis:** [capability/gap audit](../audits/2026-11-25-capabilities-and-gaps.md), [priority proposal](../plans/2026-11-25-priority-refresh.md), [machine-readable node and idea snapshot](../audits/2026-11-25-capability-inventory.json). These supersede older summaries for current prioritization; donor/activity/licence claims below remain historical study snapshots.
- **Collected backlog:** eleven earlier wishes now have rows (X-14–X-21, DEV-07/08, HMD-08) in [remaining platform gaps](landscape/remaining-platform-gaps.md); none is accepted implementation work.

**What each area found:**
- **Human feedback (2026-11-23):** seven sketches with current-code anchors, open questions and bounded experiments ([HMD-01–07](landscape/human-feedback-usability.md)); follow-ups to existing example, watch and icon foundations, now promoted for a bounded [first pass](../plans/2026-11-23-hmd-usability-first-pass.md), with future contracts deferred.
- **Census of litegraph users:** 40 projects across 9 purposes. Four projects left litegraph for Rete because it lacked:
  - a reliable change event
  - type rejection at connect time
  - DOM node bodies

  Wave 1 addresses the first; see X-03.
- **ComfyUI world:** widgets are typed *value schemas* with renderers that can be replaced. Comfy API v2 is the reference for a public runner API ([X-01](cards/X-01-runner-public-api.md)).
- **WebGLStudio:** archived. LiteScene's MIT graph patterns are still useful: graph components, locator properties, shared graph templates, graph materials.
- **nunuStudio:** has a node-graph stub with empty bodies. Its main value for this fork is as a reference for hosting litegraph in a 3D editor.
- **3D libraries:** glTF **KHR_interactivity** is ratified and maps almost one-to-one onto litegraph; it is the strongest 3D interop idea ([3D-01](cards/3D-01-gltf-khr-interactivity.md)). three.js archived its TSL node editor, which leaves room for one.
- **Execution flows:** 15 node systems compared (Unreal Engine as the main donor). Their concepts map onto this fork's Wave 6 engine. The gaps are a scope rule for volatile pure nodes ([FLW-01](cards/FLW-01-call-scopes-and-pure-semantics.md)), lifecycle and custom events ([FLW-05](cards/FLW-05-lifecycle-and-custom-events.md)), graph profiles per document ([FLW-08](cards/FLW-08-graph-profiles.md)), and further guided examples. The node reference and examples library shipped ([FLW-22/23](cards/FLW-22-node-reference-and-examples.md)); profiles and lifecycle/scopes remain open.
- **Bun:** 1.4.4 provides server, pub/sub, SQLite, SQL, Redis, S3, secrets, cron and single-binary builds. It has **no permission model**, so the runner's sandbox must come from the OS ([BUN-01](cards/BUN-01-process-runner-on-bun.md)).
- **Launcher (2026-11-23):** both apps already run on Bun 1.4.4 unchanged; process control and a friendly entry point shipped ([LCH-01](cards/LCH-01-cross-os-launcher.md)). Cross-OS acceptance and optional follow-ups remain.
- **Groups, notes and reroutes (2026-11-23):** title/body dragging, capped group controls and space panning shipped; broader nesting, notes, locking, collapse and reroute verification remain partial ([audit](../audits/2026-11-25-capabilities-and-gaps.md)).

**Suggested next investigations [I]:**
- P5 devices and IoT, when selected as a concrete product direction.
- Measured performance of large graphs.
- A deeper licence check of the `adapt` candidates before any of them is promoted.

## Landscape investigations

| Document | Area | Question it answers |
|---|---|---|
| [litegraph-census.md](landscape/litegraph-census.md) | Other litegraph users | Who builds on litegraph, for which purpose, and what did they add on top? |
| [comfyui-world.md](landscape/comfyui-world.md) | ComfyUI ecosystem | Which widgets, integrations and customizations beyond the [ecosystem study](../memories/research/ecosystem-study/README.md) are worth generalizing? |
| [webglstudio-litescene.md](landscape/webglstudio-litescene.md) | WebGLStudio, litescene, litegl | How did litegraph's original 3D home use graphs, and what can be revived? |
| [nunustudio.md](landscape/nunustudio.md) | nunuStudio | How could litegraph become the logic and material graph of a three.js editor? |
| [3d-libraries.md](landscape/3d-libraries.md) | three.js, Babylon.js, glTF interactivity and others | Which 3D node systems can we learn from, import, export or drive? |
| [js-libraries.md](landscape/js-libraries.md) | Audio, devices, data, ML, LLM, collaboration and more | Which JS libraries make good node families, widgets or runtimes? |
| [bun-process-runner.md](landscape/bun-process-runner.md) | Bun runtime, durable workflows | What would a Bun-powered process designer and runner look like? |
| [launcher-cli.md](landscape/launcher-cli.md) | Launcher, command line, process control | How does a fresh clone start, stop and open the apps on every OS, with Bun or Node? |
| [human-feedback-usability.md](landscape/human-feedback-usability.md) | Human feedback: examples, everyday nodes, slot labels/icons and workflow authoring | How can examples explain more, common nodes feel better, and the editor/runner seed starter workflows from whole node sections and packs? |
| [remaining-platform-gaps.md](landscape/remaining-platform-gaps.md) | Eleven wishes collected from earlier plans and records | Which follow-ups had no dedicated catalog row? |
| [groups-annotations.md](landscape/groups-annotations.md) | Groups, comments, reroutes | How should groups grow into frames, comments, bypass regions and nested sections, compatible with ComfyUI and legacy documents? |
| [execution-flows.md](landscape/execution-flows.md) | Unreal Engine, Unity, Blender, Houdini, TouchDesigner, Pd, Node-RED, ComfyUI, Rete, KHR_interactivity and others | How do node systems run their graphs (exec pins, pure values, lifecycles, custom events), and which flow categories and profiles should this fork offer? |

## Cards

Ideas with a design sketch get a card in `cards/`, named `<ID>-<slug>.md` and copied from [idea-card template](../_templates/idea-card.md). A card links back to its area document and catalog row.

## Conventions

### IDs

`<AREA>-<nn>` and never reused, even when an idea is rejected or merged.

| Prefix | Area |
|---|---|
| `USE` | Ideas taken from other litegraph users ([census](landscape/litegraph-census.md)) |
| `CFY` | ComfyUI world ([comfyui-world](landscape/comfyui-world.md)) |
| `WGS` | WebGLStudio, litescene and litegl |
| `NUN` | nunuStudio |
| `3D` | Other 3D libraries and standards |
| `JS` | Other JS libraries |
| `BUN` | Bun process designer and runner |
| `FLW` | Execution flows: events, pure values, lifecycles, profiles, examples and node reference ([execution-flows](landscape/execution-flows.md)) |
| `X` | Cross-cutting platform ideas that several areas need |
| `DEV` | Repository tooling: coverage, benchmarks, release |
| `LCH` | Launcher and command line: `lg.sh` / `lg.bat`, process control, runtimes ([launcher-cli](landscape/launcher-cli.md)) |
| `HMD` | Human feedback: examples, everyday nodes, adaptive watches, slot labels, icons and editor-based workflow authoring ([area](landscape/human-feedback-usability.md)) |
| `GRP` | Groups, notes and reroutes in the editor ([groups-annotations](landscape/groups-annotations.md)) |

Hook IDs `H1`–`H10` refer to the monkey-patch hooks in the [feature harvest plan](../plans/2026-11-19-feature-harvest-and-priorities.md#3-the-monkey-patch-signal-hooks-core-must-own). Wave numbers refer to the [roadmap](../plans/roadmap.md).

### Fields

- **Purpose:** one or more of `P1`–`P10` from [purposes.md](purposes.md).
- **Kind:**
  - `node` (a node family)
  - `widget`
  - `ext` (an extension built on `registerExtension`)
  - `io` (an importer or exporter)
  - `runtime` (an execution host or scheduler)
  - `app` (an application built on the library)
  - `proto` (a wire or file protocol)
  - `core` (needs a core hook or contract)
- **Effort:**
  - `S`: a day or two
  - `M`: about a week
  - `L`: several weeks
  - `XL`: a project of its own
- **Reuse class:** derived from the inspiration's license. The [provenance rule](../../AGENTS.md#rules) applies to everything here.
  - `adapt` (MIT, BSD, Apache-2.0 or similar: code may be adapted with attribution)
  - `ref` (GPL, EPL or other copyleft: design reference only)
  - `none` (no license found: reference only)
- **Maturity:**
  - `seed`: one line, unverified
  - `sketched`: the fit with this fork is described
  - `investigated`: sources checked and a design sketch written, usually as a card
  - `ready`: worth writing a proposal
  - `promoted`: links to the plan or wave that took it
  - `parked`: not now, kept for later
  - `rejected`: with a reason

### Evidence

- Every external claim links its source.
- Pin a commit or version where it matters.
- Mark inferences with **[I]**.
- Write the date in each document's header, and update it when the content is reviewed.

## Lifecycle

```
seed → sketched → investigated → ready ──promote──► plans/ (idea → proposal → plan)
                         │
                         └──► parked / rejected (kept, with a reason)
```

To promote an idea:
1. Write a proposal in `agents/plans/`.
2. Set the idea's maturity to `promoted`, with a link to that proposal.
3. Leave the idea here. The roadmap decides whether the proposal becomes a wave item.

## Maintenance

- **New idea:** add a row to [catalog.md](catalog.md) and an entry in its area document. Write a card only when the idea needs more than a paragraph.
- **New area:** add a landscape document and an ID prefix in the table above.
- **Re-checking sources:** re-verify licenses and activity before promoting an idea, because snapshots age.
