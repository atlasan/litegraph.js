# FLW-08: graph profiles

| Field | Value |
|---|---|
| Purpose | P10 The host itself; P2 Graphics; P3 Scene logic; P4 Audio; P9 Education (see [purposes](../purposes.md)) |
| Kind | core hook + ext (editor UI) |
| Area | [execution flows](../landscape/execution-flows.md) |
| Inspiration | UE's separate graph editors per purpose (Blueprint, Material, Anim, Behavior Tree); Unity Script and State Graphs; TouchDesigner operator families |
| License of the inspiration | design reference only (proprietary) |
| Effort | M |
| Maturity | sketched (the user chose profiles as the way flow types reach users, 2026-11-22) |
| Depends on | Wave 6 (`config.execution`, `setExecutionModel`, `applyExecutionModelModes`); FLW-07 (exec pins per document); FLW-24 (palette) |
| Last reviewed | 2026-11-22 |

## Why

- **The pieces of a flow style are scattered.** Wave 6 gives each document an execution model, but the rest of a flow style is global:
  - exec pins (`do_add_triggers_slots`, `src/litegraph.js:237`);
  - the execution badge (`LiteGraph.Node.ExecutionBadge`);
  - which node families make sense;
  - the editor presets (`apps/editor/js/defaults.js:67`), which are per page, not per document.
- **What users need:** one named choice per document that sets all of it, the way UE opens a Material in a material editor and a Blueprint in a Blueprint editor, while keeping LiteGraph's "mixed" default.

## What it would look like here

- **The registry:** `LiteGraph.registerGraphProfile(name, {title, description, execution, node_modes, ui, packs, palette, template})`.
- **On the document:** `config.profile` on the root graph. `graph.setProfile(name)` is one undo step: it sets `config.execution` and applies the profile's mode defaults through `applyExecutionModelModes`.
- **No profile:** a document without one is `custom`, which changes nothing, so old documents are unaffected.

| Profile | Model | For | Mode defaults | UI | Palette |
|---|---|---|---|---|---|
| `mixed` (default) | `ancestors` | General use: events, realtime, data | node declarations | badge on | everything |
| `blueprint` | `ancestors` | Event scripting (UE Blueprints) | pure → ON_REQUEST, others ON_EVENT | exec pins on; lifecycle and custom-event nodes first | events, logic, math, strings, objects |
| `dataflow` | `ancestors`, no ticks | Materials, shaders, data pipelines | all pure → ON_REQUEST | event slots hidden; "needs cook" badge (FLW-13) | math, strings, shader, texture, data |
| `realtime` | `step` | Audio, video, WebGL, animation | ALWAYS; `ticks` sources | tick badge; FPS | audio, graphics, gltextures, glfx, midi |
| `stepped` | `strict` | Simulations, deterministic runs, teaching | ALWAYS, once per frame | Step button emphasized; frame counter | everything except realtime sources |
| `reactive` | `event` | UI, forms, IoT; no frame loop | ON_EVENT | badge on | widgets, html, network, events |

**Where users meet it:**
- the graph Options panel ("Profile", next to "Execution model");
- the editor's New graph action;
- the example manifest (FLW-22), where every example names its profile;
- the runner, which reads `config.profile` only for the model (no UI).

## Prior art

- **UE:** separate editors per graph type, each with its own node set and execution ([materials](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-materials), [anim graphs](https://dev.epicgames.com/documentation/en-us/unreal-engine/graphing-in-animation-blueprints-in-unreal-engine)).
- **Unity:** Script Graph against State Graph ([graph types](https://docs.unity3d.com/Packages/com.unity.visualscripting@1.9/manual/vs-graph-types.html)).
- **X-12:** settings profiles for the host. FLW-08 is the per-document variant; X-12 stays for user settings.

## Open questions

- **Storage:** does a profile store only its name, with the registry supplying the rest (proposed: small documents, upgradable), or a snapshot of its settings (portable to hosts without the profile)?
- **Changing the profile after edits:** re-apply the mode defaults (one undo step), or only for nodes still on their default mode (proposed)?
- **Subgraphs:** inherit the root's profile (proposed), or allow one per subgraph? A `dataflow` subgraph inside a `blueprint` document resembles a material inside a Blueprint.
- **Packs:** can a pack register its own profiles (e.g. an audio pack's `realtime-audio`)? Proposed: yes, through the registry.

## Smallest experiment

`registerGraphProfile` plus `setProfile` as an extension in `experiments/flw-profiles/`, with `mixed`, `blueprint` and `dataflow` only. In `editor_build.html`: switch a document between them, check that undo restores the model and the modes, and that the palette filters.

## History

- 2026-11-22: created. The user chose "graph profiles" for showing flow types to users.
