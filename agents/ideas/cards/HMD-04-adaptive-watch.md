# HMD-04: Adaptive watch and structured-value inspection

> **Date** 2026-11-23 · **Kind** idea · **Status** promoted · **Base** `LG/dev` @ `d47f5ef`

| Field | Value |
|---|---|
| Purpose | P6 P9 P10 (see [purposes](../purposes.md)) |
| Kind | node |
| Area | [Human feedback and checked foundations](../landscape/human-feedback-usability.md) |
| Inspiration | Direct human feedback in the Codex chat, 2026-11-23; preserved in the area document |
| License of the inspiration | Own concept; reuse class: —; check any future third-party assets/code before reuse |
| Effort | L |
| Maturity | promoted (bounded first pass) |
| Depends on | Related ideas below; no implementation dependency accepted yet |
| Last reviewed | 2026-11-23 |

## Why

Explore one “magic” auto display plus explicit display presets on canonical `basic/watch`: boolean state, scalar, multiline text, array summary and expandable structured object. Choose a renderer from declared slot type and observed value; show a visible mismatch when they disagree. Keep declared type, observed type and validation result distinct. Auto presentation must not silently coerce values or change connection compatibility. Allow a manual display override and bounded fit-to-content with stable size limits.

## What it would look like here

**[I]** Design sketch for consideration; checked existing foundations and source links are in the area document.

Handle missing input, `null`, `undefined`, empty and large collections, cycles, changing shapes and unsupported values. Prefer bounded previews and explicit expansion; do not invoke arbitrary getters while inspecting objects. Schema validation is optional where a schema exists; without one, report only the checks actually performed.

## Smallest experiment

A display-selection table and static previews for those cases, including a declared-number input receiving an object. Compare whether several presets suffice before adding new node types.

## Open questions

Renderer priority, schema source, resize policy, refresh cost and persistence of view state versus runtime values.

## Related ideas

USE-01 (runtime watches), HMD-03, the existing value/text/tree registry. More watch experiences need not mean more duplicate watch types.

## Prior art

The repository's current implementations are the starting point; see the [checked foundations](../landscape/human-feedback-usability.md#existing-foundations-checked). No external code reuse is proposed.

## History

- 2026-11-23: captured as an idea on `LG/dev_hmd_examples_nodes_icons`; not promoted to a plan.

- 2026-11-23: promoted into the [accepted first-pass plan](../../plans/2026-11-23-hmd-usability-first-pass.md); broader contracts remain deferred.
