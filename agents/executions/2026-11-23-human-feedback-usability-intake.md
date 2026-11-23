# Human feedback: examples, base nodes, icons and workflow authoring

> **Date** 2026-11-23 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `d47f5ef`

Captured the user's feedback as seven sketched ideas on `LG/dev_hmd_examples_nodes_icons`, following the ideas lifecycle. No implementation plan was requested or accepted; the roadmap and product reference/release documents need no feature update for this intake.

## Changes

- Preserved the feedback in the [area document](../ideas/landscape/human-feedback-usability.md), with source anchors for the existing example manifest, boolean node, watch displays, node-title icons, slots, panels and runner policy.
- Added HMD-01–HMD-07 to the catalog, with individual cards covering the design, existing related ideas, open questions and bounded experiments.
- Indexed the new area and ID prefix; recounted the entire catalog, correcting previously stale totals: 264 ideas, 177 seed, 68 sketched, 6 investigated, 12 promoted and 1 parked.

## Verification

| Check | Result |
|---|---|
| Catalog IDs and maturity totals | 264 unique IDs; seven new HMD rows, all sketched |
| Relative file links in changed records and new cards | All targets exist |
| `git diff --check` | Pass |
| `npm run check` | Not run: documentation-only intake; no source, runtime, dependency or generated distribution changes |

## Left open

The questions and experiments in each card remain ideas. Promote deliberately into a dated proposal before implementation. “Native” icons and editor mode versus a separate runner shell remain unresolved interpretations.
