# HMD-03: Upgrade the everyday base-node experience

> **Date** 2026-11-23 · **Kind** idea · **Status** promoted · **Base** `LG/dev` @ `d47f5ef`

| Field | Value |
|---|---|
| Purpose | P9 P10 (see [purposes](../purposes.md)) |
| Kind | node |
| Area | [Human feedback and checked foundations](../landscape/human-feedback-usability.md) |
| Inspiration | Direct human feedback in the Codex chat, 2026-11-23; preserved in the area document |
| License of the inspiration | Own concept; reuse class: —; check any future third-party assets/code before reuse |
| Effort | M |
| Maturity | promoted (bounded first pass) |
| Depends on | Related ideas below; no implementation dependency accepted yet |
| Last reviewed | 2026-11-23 |

## Why

Review the basic pack starting with boolean/toggle, constants, strings, numbers, arrays and object helpers. Improve names, descriptions, defaults, widget sizing and state feedback consistently. Distinguish a persistent boolean value from a toggle action and from true/false event emission; do not silently change a value node into an event source. Preserve existing type IDs, saved properties and execution declarations, or propose explicit migrations.

## What it would look like here

**[I]** Design sketch for consideration; checked existing foundations and source links are in the area document.

## Smallest experiment

Sketch an improved `basic/boolean` presentation and paired examples for direct editing and action-driven toggling. Before proposing implementation, characterize widget/property/serialized-value agreement, undo behaviour and execution under the supported models.

## Open questions

Which common nodes need visual polish, which need new behaviour, and whether any genuinely separate toggle node is justified.

## Related ideas

HMD-01, HMD-04; use registered widget types for reusable widget behaviour.

## Prior art

The repository's current implementations are the starting point; see the [checked foundations](../landscape/human-feedback-usability.md#existing-foundations-checked). No external code reuse is proposed.

## History

- 2026-11-23: captured as an idea on `LG/dev_hmd_examples_nodes_icons`; not promoted to a plan.

- 2026-11-23: promoted into the [accepted first-pass plan](../../plans/2026-11-23-hmd-usability-first-pass.md); broader contracts remain deferred.
