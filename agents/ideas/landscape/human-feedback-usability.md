# Examples, everyday nodes and workflow authoring

> **Updated** 2026-11-23 · **Kind** idea area · **Status** living · **Base** `LG/dev` @ `d47f5ef`

Ideas `HMD-01`–`HMD-07`, captured on `LG/dev_hmd_examples_nodes_icons`. Source: direct human feedback in the Codex chat on 2026-11-23. These are considerations, not accepted work or a new wave. The sketches below are proposals **[I]**; they do not describe implemented behaviour.

## Feedback preserved

- Examples should cover many more cases and nicely present, document and explain features, settings and nodes.
- Upgrade the base nodes and base node pack, especially common nodes: a basic toggle/boolean and more watch-like experiences, possibly one “magic” viewer that fits its style to simple or structured objects using slot types, detected data types and validation.
- Slots should optionally have a related `label_icon`, before the name or instead of it on small nodes, by option or per-node choice. Keep name and type available through a tooltip or right-click.
- An app runner should reuse the app editor and add a panel that generates workflows from nodes and node packs: interactive, concise, easy, elegant and best effort. Detect metadata, groups and descriptions, suggest settings, then generate workflows.
- **HMD-06 clarification:** retain the current editor/runner identity; an auto workflow generator is one of its features. Help contributors, pack creators and users add all nodes of a selected section or pack to a starter workflow, propose organization, descriptions and additional metadata, and seed base workflows covering current and expanding packs.
- Enable native and SVG icons and/or emoji through an easy, powerful interface.

## Existing foundations checked

| Foundation | Owning source at the base above | Implication |
|---|---|---|
| Example metadata already includes descriptions, categories, profiles, tags, packs and levels | [examples manifest](../../../apps/editor/examples/index.json) | Extend coverage and presentation; FLW-22's manifest work is already promoted |
| Registry metadata is readable without constructing nodes; packs expose templates | [getNodeDefinition](../../../src/litegraph.js:530), [listTemplates](../../../src/packs.js:360) | A starter generator can enumerate selected types from registry/pack metadata and reuse templates where helpful **[I]** |
| `basic/boolean` has a toggle widget and an optional toggle action input | [ConstantBoolean](../../../src/nodes/base.js:89) | Improve the existing node rather than assume the feature is missing |
| One canonical `basic/watch` has value/text/tree displays; tree comes from the watch pack | [Watch](../../../src/nodes/base.js:687), [watch pack](../../../src/nodes/watch.js:3) | Add displays or presets first; avoid undoing the earlier watch consolidation |
| Node titles already draw a text glyph or loaded image | [getNodeIcon / drawNodeTitleText](../../../src/lgraphcanvas.js:5853) | Build a shared icon contract rather than a second title-only renderer **[I]** |
| Public slot metadata has `name`, `type` and optional `label` | [INodeSlot](../../../src/litegraph.d.cts:23) | `label_icon` and its presentation policy would need an explicit contract |
| Reusable editor panels exist; the runner has its own execution UI and policy | [PanelHost](../../../src/panels.js:971), [runner UI](../../../apps/runner/public/app.js), [node policy](../../../apps/runner/nodePolicy.js), [server guards](../../../apps/runner/server/security.js) | Reusing the editor must preserve runner validation and restrictions |

## Idea sketches

Each card records the design, related ideas, open questions and a bounded experiment. Catalog fields are in the [catalog](../catalog.md#human-feedback-examples-nodes-and-authoring-hmd).

| Idea | Consideration |
|---|---|
| [HMD-01](../cards/HMD-01-example-coverage.md) | Broader, intentional example coverage |
| [HMD-02](../cards/HMD-02-explained-examples.md) | Examples as readable feature explanations |
| [HMD-03](../cards/HMD-03-everyday-base-nodes.md) | Upgrade the everyday base-node experience |
| [HMD-04](../cards/HMD-04-adaptive-watch.md) | Adaptive watch and structured-value inspection |
| [HMD-05](../cards/HMD-05-slot-label-icons.md) | Optional slot label icons and compact labels |
| [HMD-06](../cards/HMD-06-workflow-builder-runner.md) | Editor-based workflow builder and runner: auto workflow generator for node sections and packs |
| [HMD-07](../cards/HMD-07-shared-icons.md) | Shared native, SVG and emoji icon support |

## Consideration order, not a delivery plan

**[I]** First inventory examples and common-node friction (HMD-01/03); try one explained example and an adaptive-watch sketch (HMD-02/04). Agree a shared icon representation before slot-specific rendering (HMD-07 → HMD-05). Use selected node definitions and pack metadata to probe the starter-workflow generator in the existing editor/runner (HMD-06). Each experiment needs deliberate promotion into `agents/plans/` before implementation; no roadmap milestone is added by this intake.
