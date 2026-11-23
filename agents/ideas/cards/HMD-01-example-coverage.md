# HMD-01: Broader, intentional example coverage

> **Date** 2026-11-23 · **Kind** idea · **Status** sketched · **Base** `LG/dev` @ `d47f5ef`

| Field | Value |
|---|---|
| Purpose | P9 P10 (see [purposes](../purposes.md)) |
| Kind | app |
| Area | [Human feedback and checked foundations](../landscape/human-feedback-usability.md) |
| Inspiration | Direct human feedback in the Codex chat, 2026-11-23; preserved in the area document |
| License of the inspiration | Own concept; reuse class: —; check any future third-party assets/code before reuse |
| Effort | M |
| Maturity | sketched |
| Depends on | Related ideas below; no implementation dependency accepted yet |
| Last reviewed | 2026-11-23 |

## Why

Build a coverage matrix across features, settings, common nodes, packs and execution models. Separate small, single-concept examples from composed recipes and old WIP graphs. Candidate cases: boolean actions and values, watch displays and structured data, widget inputs, groups/reroutes, subgraphs, modes and migration, execution-model differences, pack templates, panel settings and editor/runner parity. Make prerequisites and supported hosts visible.

## What it would look like here

**[I]** Design sketch for consideration; checked existing foundations and source links are in the area document.

## Smallest experiment

Audit current manifest entries against that matrix, then propose a bounded missing set. Each new example should specify an expected observable result and a repeatable check; network/hardware examples need explicit prerequisites.

## Open questions

How much coverage per pack, which examples are teaching material versus regression fixtures, and who maintains them?

## Related ideas

FLW-22 (existing manifest), FLW-23 (node reference), HMD-02. This is a follow-up, not a second manifest project.

## Prior art

The repository's current implementations are the starting point; see the [checked foundations](../landscape/human-feedback-usability.md#existing-foundations-checked). No external code reuse is proposed.

## History

- 2026-11-23: captured as an idea on `LG/dev_hmd_examples_nodes_icons`; not promoted to a plan.
