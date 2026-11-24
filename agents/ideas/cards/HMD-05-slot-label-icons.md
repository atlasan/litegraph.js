# HMD-05: Optional slot label icons and compact labels

> **Date** 2026-11-23 · **Kind** idea · **Status** promoted · **Base** `LG/dev` @ `d47f5ef`

| Field | Value |
|---|---|
| Purpose | P9 P10 (see [purposes](../purposes.md)) |
| Kind | core |
| Area | [Human feedback and checked foundations](../landscape/human-feedback-usability.md) |
| Inspiration | Direct human feedback in the Codex chat, 2026-11-23; preserved in the area document |
| License of the inspiration | Own concept; reuse class: —; check any future third-party assets/code before reuse |
| Effort | M |
| Maturity | promoted (bounded first pass) |
| Depends on | Related ideas below; no implementation dependency accepted yet |
| Last reviewed | 2026-11-23 |

## Why

Propose optional slot `label_icon` metadata, drawn before the label by default when supplied. Explore text, icon+text and icon-only presentation through an explicit option or node preference, including small nodes. Preserve the underlying slot name and type; expose both on hover and in the slot context menu, with a keyboard-accessible equivalent. Missing or unsupported icons fall back to readable text.

## What it would look like here

**[I]** Design sketch for consideration; checked existing foundations and source links are in the area document.

Keep precedence explicit (slot override, node preference, canvas default is a candidate). Include text measurement, input/output alignment, widget sockets, vertical and exec slots, collapsed nodes, hit targets and serialization/types in the eventual contract. Icons must not replace connector shapes or type validation.

## Smallest experiment

Mock both sides of a compact node using the same slots in all three modes; check legibility, tooltip/menu disclosure and unchanged link anchors.

## Open questions

Exact option names, whether compact mode is automatic or explicit, and persistence versus canvas-only presentation.

## Related ideas

HMD-07 (shared icon representation), X-08 (accessibility).

## Prior art

The repository's current implementations are the starting point; see the [checked foundations](../landscape/human-feedback-usability.md#existing-foundations-checked). No external code reuse is proposed.

## History

- 2026-11-23: captured as an idea on `LG/dev_hmd_examples_nodes_icons`; not promoted to a plan.

- 2026-11-23: promoted into the [accepted first-pass plan](../../plans/2026-11-23-hmd-usability-first-pass.md); broader contracts remain deferred.
