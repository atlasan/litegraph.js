# HMD-06: Editor-based workflow builder and runner

> **Date** 2026-11-23 · **Kind** idea · **Status** sketched · **Base** `LG/dev` @ `d47f5ef`

| Field | Value |
|---|---|
| Purpose | P8 P9 P10 (see [purposes](../purposes.md)) |
| Kind | app |
| Area | [Human feedback and checked foundations](../landscape/human-feedback-usability.md) |
| Inspiration | Direct human feedback in the Codex chat, 2026-11-23; preserved in the area document |
| License of the inspiration | Own concept; reuse class: —; check any future third-party assets/code before reuse |
| Effort | L |
| Maturity | sketched |
| Depends on | Related ideas below; no implementation dependency accepted yet |
| Last reviewed | 2026-11-23 |

## Why

Reuse the app editor with an integrated workflow-generation panel and a run/inspect path. Interpret “app runner” here as an editor-based authoring and execution experience; whether this is an editor mode or a separate app shell remains open. Start by selecting a goal, nodes or packs, then show concise compatible recipe choices, suggested settings and a graph preview. Let the user adjust before inserting or replacing a graph, then run through the appropriate existing host.

## What it would look like here

**[I]** Design sketch for consideration; checked existing foundations and source links are in the area document.

Read registered definitions, pack manifests/templates and available descriptions first; derive categories or suggested groups only when supported by metadata or topology. Mark inferred descriptions, groups and settings as suggestions. Best effort means reporting missing metadata or ambiguous connections and offering choices, rather than inventing executable wiring. Start with deterministic curated recipes and typed compatibility; AI generation is an optional future question, not a prerequisite.

## Smallest experiment

One panel for “boolean → watch” and one structured-data recipe: select packs, inspect detected metadata, adjust suggested settings, preview, insert in one `graph.transact`, undo once, save/reload, then execute on a supported host. Reuse panel, palette, template and layout infrastructure. Keep proposals local until applied; no execution as a side effect of preview.

Keep Origin/Host checks, recursive node policy and script lockdown in the run path. Show missing packs/capabilities and policy refusals with their existing explanations; generation must not change runner opt-ins.

## Open questions

App shell versus editor mode, meaning of a user goal, template composition rules, incomplete-metadata fallback, host selection and editable group/description metadata.

## Related ideas

HMD-01/02 (recipes and explanations), X-05 (schema-generated packs, a different problem), X-01 (runner API), USE-05 (application split). Choose shared infrastructure before introducing another editor implementation.

## Prior art

The repository's current implementations are the starting point; see the [checked foundations](../landscape/human-feedback-usability.md#existing-foundations-checked). No external code reuse is proposed.

## History

- 2026-11-23: captured as an idea on `LG/dev_hmd_examples_nodes_icons`; not promoted to a plan.
