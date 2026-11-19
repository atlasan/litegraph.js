# Ideas docspace

Started 2026-11-19. **Living.** This is a database of feature and integration ideas for this fork. It is grouped by *purpose* (what people build with node graphs) and informed by how other projects use litegraph and its neighbours.

**This is not the production pipeline.** Nothing here is planned, scheduled or promised:
- The [roadmap](../../planning/roadmap.md) and [planning/](../../planning/README.md) hold accepted work.
- This folder is upstream of the first step there (*idea*).
- Ideas move into `planning/` only by a deliberate promotion (see [Lifecycle](#lifecycle)). Adding ideas here never changes the roadmap.

## How to read it

| Start with | What it answers |
|---|---|
| [purposes.md](purposes.md) | What are node graphs used for, and which ideas serve each purpose? |
| [catalog.md](catalog.md) | **The database:** one row per idea, with ID, purpose, kind, effort, maturity and license class |
| [landscape/](#landscape-investigations) | The investigations behind the ideas, one document per area |
| [cards/](#cards) | Ideas that outgrew a row: design sketches, open questions, experiments |

## State on 2026-11-19

**Contents:**
- **201 ideas**: 7 cross-cutting, 45 from other litegraph users, 55 from the ComfyUI world, 10 WebGLStudio, 6 nunuStudio, 22 for 3D libraries, 34 for JS libraries and 22 for the Bun runner.
- **Maturity:** 139 seed, 58 sketched, 2 investigated (with cards), 1 promoted and 1 parked.

**What each area found:**
- **Census of litegraph users:** 40 projects across 9 purposes. Four projects left litegraph for Rete because it lacked:
  - a reliable change event
  - type rejection at connect time
  - DOM node bodies

  Wave 1 addresses the first; see X-03.
- **ComfyUI world:** widgets are typed *value schemas* with renderers that can be replaced. Comfy API v2 is the reference for a public runner API ([X-01](cards/X-01-runner-public-api.md)).
- **WebGLStudio:** archived. LiteScene's MIT graph patterns are still useful: graph components, locator properties, shared graph templates, graph materials.
- **nunuStudio:** has a node-graph stub with empty bodies. Its main value for this fork is as a reference for hosting litegraph in a 3D editor.
- **3D libraries:** glTF **KHR_interactivity** is ratified and maps almost one-to-one onto litegraph; it is the strongest 3D interop idea ([3D-01](cards/3D-01-gltf-khr-interactivity.md)). three.js archived its TSL node editor, which leaves room for one.
- **Bun:** 1.4.4 provides server, pub/sub, SQLite, SQL, Redis, S3, secrets, cron and single-binary builds. It has **no permission model**, so the runner's sandbox must come from the OS ([BUN-01](cards/BUN-01-process-runner-on-bun.md)).

**Suggested next investigations [I]:**
- P5 devices and IoT (only 7 ideas so far).
- Accessibility and touch.
- Measured performance of large graphs.
- A deeper licence check of the `adapt` candidates before any of them is promoted.

## Landscape investigations

| Document | Area | Question it answers |
|---|---|---|
| [litegraph-census.md](landscape/litegraph-census.md) | Other litegraph users | Who builds on litegraph, for which purpose, and what did they add on top? |
| [comfyui-world.md](landscape/comfyui-world.md) | ComfyUI ecosystem | Which widgets, integrations and customizations beyond the [ecosystem study](../../docs/development/ecosystem-study/README.md) are worth generalizing? |
| [webglstudio-litescene.md](landscape/webglstudio-litescene.md) | WebGLStudio, litescene, litegl | How did litegraph's original 3D home use graphs, and what can be revived? |
| [nunustudio.md](landscape/nunustudio.md) | nunuStudio | How could litegraph become the logic and material graph of a three.js editor? |
| [3d-libraries.md](landscape/3d-libraries.md) | three.js, Babylon.js, glTF interactivity and others | Which 3D node systems can we learn from, import, export or drive? |
| [js-libraries.md](landscape/js-libraries.md) | Audio, devices, data, ML, LLM, collaboration and more | Which JS libraries make good node families, widgets or runtimes? |
| [bun-process-runner.md](landscape/bun-process-runner.md) | Bun runtime, durable workflows | What would a Bun-powered process designer and runner look like? |

## Cards

Ideas with a design sketch get a card in `cards/`, named `<ID>-<slug>.md` and copied from [_template.md](_template.md). A card links back to its area document and catalog row.

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
| `X` | Cross-cutting platform ideas that several areas need |

Hook IDs `H1`–`H10` refer to the monkey-patch hooks in the [feature harvest plan](../../planning/plans/261119_feature_harvest_and_priorities.md#3-the-monkey-patch-signal-hooks-core-must-own). Wave numbers refer to the [roadmap](../../planning/roadmap.md).

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
seed → sketched → investigated → ready ──promote──► planning/ (idea → proposal → plan)
                         │
                         └──► parked / rejected (kept, with a reason)
```

To promote an idea:
1. Write a proposal in `planning/plans/`.
2. Set the idea's maturity to `promoted`, with a link to that proposal.
3. Leave the idea here. The roadmap decides whether the proposal becomes a wave item.

## Maintenance

- **New idea:** add a row to [catalog.md](catalog.md) and an entry in its area document. Write a card only when the idea needs more than a paragraph.
- **New area:** add a landscape document and an ID prefix in the table above.
- **Re-checking sources:** re-verify licenses and activity before promoting an idea, because snapshots age.
