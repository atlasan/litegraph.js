# Human feedback usability: first implementation

> **Date** 2026-11-24 · **Kind** execution · **Status** final · **Base** `LG/dev_hmd_usability` @ `e81bd8a` · **Plan** [accepted first pass](../plans/2026-11-23-hmd-usability-first-pass.md)

Implemented the prioritized HMD feedback in the existing editor and library. The feedback branch and accepted plan were merged into `LG/dev` at `e81bd8a`; implementation ran on `LG/dev_hmd_usability`. Delivery separates source/docs from generated distributions, then merges the implementation into `LG/dev`.

## Changes

- `NodePalette.starterPreview`: definition-only live pack/category inventory, descriptions/usage, marked missing-description suggestions and explicit skip reasons. `insertStarter`: available nodes in three-column category groups below existing content, one transaction with rollback for unexpected failures, no wiring or playback. Reports constructor failures, refuses running/read-only graphs. Existing editor gets scope selection, preview, refresh and JSON metadata export.
- Six new essentials graphs and manifest guides: boolean value/actions, structured auto watch, text watch, linked number widget fallback, bypass and slot labels. Forty manifest entries in total, six with instructional guides. Demo selection shows a collapsible text-only explanation; toolbar scrolls at narrow widths without overlapping playback controls.
- Boolean: toggle aliases and usage, true/false widget/output feedback, authoritative saved-property/widget agreement. Linked `basic/const` widgets use incoming data without overwriting the local fallback.
- Canonical Watch adds opt-in `auto`: declared/observed types, simple known-type mismatch notice, missing-input distinction, cycle/accessor markers, depth/entry/text limits and clipped rendering. No coercion/schema-validation claims; legacy displays/defaults remain.
- Optional slot string glyphs/emoji, display mode precedence (slot → node property → canvas), shared sizing/drawing labels and original socket name/type in context menus. Existing node-title icon support is retained.
- Reference docs, coverage matrix, codebase map, roadmap and changelog updated. No new dependencies or third-party code.

## Review and corrections

Reviewed existing foundations before implementation; the plan records scope and future contracts. Implementation review caught and corrected a canvas declaration placed on the singleton, a toolbar collision at narrow widths, boolean on/off text that did not express true/false, and an example whose constant widget covered its slot icon. The final slot lesson uses two Watch inputs so both label modes are actually visible.

Generator capability filtering is best effort based on declared metadata, not a sandbox for third-party constructors. The inventory is deliberately disconnected. Missing metadata remains an explicit suggestion in the preview/export, not an automatic edit to pack source. These limits are documented in [the examples reference](../../docs/examples.md).

## Verification

| Check | Result |
|---|---|
| `npm run check` (final, with loopback access) | Pass: lint, all 12 builds, strict/isolated type consumers and runtime export parity, 56 Jest suites / 986 tests / 45 snapshots, 140 node:test integration checks, package/build checks |
| New focused Jest coverage | 8 tests: preview/filter/skip/failure/live-registry behaviour, append/round-trip/undo/refusals, boolean save/action agreement, linked number fallback, bounded watch/type mismatch, slot modes/round-trip, starter panel and text-only example help |
| Examples | Six new output snapshots; all visible examples pass the existing loading/execution checks |
| Browser `/editor/editor_build.html`, port 8011 | Basic pack preview: 25 types; insertion: 25 nodes, 0 skipped; grouped inventory visibly rendered |
| Browser metadata export | Downloaded JSON parsed: `litegraph-starter-metadata`, 25 entries, `pack: litegraph/basic` |
| Browser displays and layout | Structured Watch + explanation, boolean true/false presentation, glyph+text and icon-only Watch labels, original socket name/type menu; toolbar checked at 1280 and 849px widths; no captured console errors |
| Authored changes | Relative file links and `git diff --check` pass |

The first full sandbox run passed types and all Jest checks but could not run the four local-server integration suites. The final complete gate ran with loopback access and passed; the earlier restriction was environmental.

Browser evidence: [starter panel](evidence/2026-11-24-hmd-usability/starter-panel.jpg), [explained automatic Watch](evidence/2026-11-24-hmd-usability/editor-watch.jpg). Screenshots establish rendered readability/layout that data tests cannot prove.

## Left open

SVG asset loading/registry and OS-native icons; schema validation/full inspection and data-driven sizing; automatic wiring/AI recipes; metadata write-back and generated-workflow reconciliation; further common-node upgrades and wider explained example coverage. These remain ideas under the plan's deferred scope; this implementation does not add another runner shell.
