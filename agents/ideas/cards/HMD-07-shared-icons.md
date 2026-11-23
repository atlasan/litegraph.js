# HMD-07: Shared native, SVG and emoji icon support

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

Offer one icon representation for node titles, slots, palettes and panels: native canvas-drawn symbols, SVG assets and text/emoji. “Native” is ambiguous; canvas symbols are a candidate, while OS/system icons would need clarification. Provide useful built-ins, simple node/pack declarations, consistent size/alignment, theme colour where applicable and readable fallbacks. Preserve existing glyph and loaded-image title support.

## What it would look like here

**[I]** Design sketch for consideration; checked existing foundations and source links are in the area document.

Propose a serializable icon ID/descriptor with host-managed caching, plus adaptation for existing runtime image objects. SVG needs an explicit asset-loading and sanitization policy; avoid script, external-resource and remote-fetch surprises. Evaluate bundled assets first and check icon-set licences before reuse. Emoji are convenient but their appearance and metrics vary by platform.

## Smallest experiment

Render the same native symbol, local SVG and emoji in a title, slot and panel; inspect zoom, dark/light contrast, loading failure, headless import and save/reload fallback.

## Open questions

Registry versus pack-owned assets, descriptor format, colour inheritance and acceptable native/emoji portability.

## Related ideas

HMD-05 and X-02 (host asset services).

## Prior art

The repository's current implementations are the starting point; see the [checked foundations](../landscape/human-feedback-usability.md#existing-foundations-checked). No external code reuse is proposed.

## History

- 2026-11-23: captured as an idea on `LG/dev_hmd_examples_nodes_icons`; not promoted to a plan.

- 2026-11-23: promoted into the [accepted first-pass plan](../../plans/2026-11-23-hmd-usability-first-pass.md); broader contracts remain deferred.
