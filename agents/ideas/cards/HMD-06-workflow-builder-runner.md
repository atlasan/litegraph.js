# HMD-06: Editor-based workflow builder and runner

> **Date** 2026-11-23 · **Kind** idea · **Status** promoted · **Base** `LG/dev_hmd_examples_nodes_icons` @ `5085614`

| Field | Value |
|---|---|
| Purpose | P9 P10 (see [purposes](../purposes.md)) |
| Kind | app |
| Area | [Human feedback and checked foundations](../landscape/human-feedback-usability.md) |
| Inspiration | Direct human feedback and scope clarification in the Codex chat, 2026-11-23; preserved in the area document |
| License of the inspiration | Own concept; reuse class: —; check any future third-party assets/code before reuse |
| Effort | L |
| Maturity | promoted (bounded first pass) |
| Depends on | Existing editor/runner, node definitions and pack metadata; related ideas below |
| Last reviewed | 2026-11-23 |

## Why

Help repository contributors, node-pack creators and users quickly seed base workflows covering the nodes available in a section or pack. Adding and arranging those nodes manually makes it harder to explore a pack, document it and keep examples current as it expands.

Keep the current editor/runner identity: the auto workflow generator is a feature of that application. The user's clarification retains the editor/runner name and allows expanding the existing app; the concrete need here is generating an initial workflow from a selected collection of nodes.

## What it would look like here

**[I]** Design sketch for consideration; checked existing foundations and source links are in the area document.

A concise, interactive panel lets the user select a node section/category, one or more packs, or a subset of their nodes. “Add all nodes in this section” is the basic operation. Preview the included types, unavailable types and suggested organization, then create a starter workflow or insert it into the current graph in one undoable operation.

Read registered definitions and pack metadata first. Instantiate the selected available types, arrange them clearly, and propose groups, headings, descriptions and initial settings. Suggest additional metadata where it is absent or inconsistent, distinguishing source metadata from inferred suggestions. Let users review those suggestions and save or export them for pack documentation and future starter workflows; the exact metadata format remains open.

A first workflow can be an organized inventory of nodes, with explanations and useful defaults. Offer example connections or small demonstrative chains only where known templates or adequate metadata support them; an inventory need not be fully connected or executable. Keep coverage visible when some nodes cannot be created in the current host, so a partial result does not look complete.

Cover current packs and support expanding packs: compare a generated starter's covered types with the selected registry scope and offer to add newly available types. Preserve user edits and identify renamed or unavailable types for review. Explore regenerating a fresh starter versus updating an existing one before choosing a persistence contract.

## Prior art

Use the repository's existing editor panels, node definitions, pack manifests/templates and layout infrastructure; see the [checked foundations](../landscape/human-feedback-usability.md#existing-foundations-checked). Existing runner execution and policy remain the run path for workflows that can be executed. No external code reuse is proposed.

## Open questions

- What defines a section: category prefix, pack section metadata, or a user-selected group of types?
- Where should suggested descriptions, groups and metadata be saved so pack authors can reuse them?
- Should generated coverage metadata live in the graph, a companion manifest, or both?
- How should updates add new types while preserving manual layout, annotations and examples?
- Which metadata or curated templates justify proposing connections and settings?

## Smallest experiment

Select the basic pack or one of its sections in the existing editor, preview its type list, and generate an organized starter with one instance of each available type. Propose group labels, descriptions and missing metadata for review. Apply in one `graph.transact`, undo once, and save/reload the result. Report skipped types with reasons.

Then expand the selected registry scope with one additional type and preview the coverage difference. Demonstrate adding that type without losing a manual annotation. Confirm that the saved starter is useful as a first pack example even where nodes remain unconnected.

## Related ideas

HMD-01 (example coverage), HMD-02 (explanations), FLW-22/23 (examples manifest and node reference), X-05 (schema-generated packs). HMD-06 consumes existing node definitions to seed workflows; X-05 generates node definitions from external schemas.

## History

- 2026-11-23: captured as an idea on `LG/dev_hmd_examples_nodes_icons`; not promoted to a plan.
- 2026-11-23: user clarified the primary feature: add all nodes of a section/pack to an initial workflow, propose organization/descriptions/metadata, and support current and expanding packs. Retained the editor/runner name as requested; the generator is one of its features.

- 2026-11-23: promoted into the [accepted first-pass plan](../../plans/2026-11-23-hmd-usability-first-pass.md); broader contracts remain deferred.
