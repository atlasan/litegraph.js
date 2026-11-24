# HMD-02: Examples as readable feature explanations

> **Date** 2026-11-23 · **Kind** idea · **Status** promoted · **Base** `LG/dev` @ `d47f5ef`

| Field | Value |
|---|---|
| Purpose | P9 P10 (see [purposes](../purposes.md)) |
| Kind | app |
| Area | [Human feedback and checked foundations](../landscape/human-feedback-usability.md) |
| Inspiration | Direct human feedback in the Codex chat, 2026-11-23; preserved in the area document |
| License of the inspiration | Own concept; reuse class: —; check any future third-party assets/code before reuse |
| Effort | M |
| Maturity | promoted (bounded first pass) |
| Depends on | Related ideas below; no implementation dependency accepted yet |
| Last reviewed | 2026-11-23 |

## Why

An example browser or editor panel should answer: what does this demonstrate, which nodes and settings matter, what can I change, and what should I see? Use a short introduction, clear graph framing, intentional labels/groups, concise steps and links to node/settings reference. Allow opening a clean copy and resetting the lesson. Keep instructional prose outside execution data unless annotations are deliberately saved.

## What it would look like here

**[I]** Design sketch for consideration; checked existing foundations and source links are in the area document.

## Smallest experiment

Present one existing boolean-to-watch graph with a compact explanation, a highlighted setting and expected output; try it at narrow and wide viewport sizes. Check that a new user can find and explain the behaviour without reading source.

## Open questions

Panel versus tour, where lesson metadata lives, and how explanations stay in sync with graph files.

## Related ideas

HMD-01, FLW-23, CFY-19 (guided tours); reuse the existing manifest and PanelHost.

## Prior art

The repository's current implementations are the starting point; see the [checked foundations](../landscape/human-feedback-usability.md#existing-foundations-checked). No external code reuse is proposed.

## History

- 2026-11-23: captured as an idea on `LG/dev_hmd_examples_nodes_icons`; not promoted to a plan.

- 2026-11-23: promoted into the [accepted first-pass plan](../../plans/2026-11-23-hmd-usability-first-pass.md); broader contracts remain deferred.
