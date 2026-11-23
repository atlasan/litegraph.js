# Human feedback: examples and everyday authoring, first pass

> **Date** 2026-11-23 · **Kind** plan · **Status** accepted · **Base** `LG/dev_hmd_examples_nodes_icons` @ `6036090`

Deliver the highest-value bounded improvements from HMD-01–07: explainable examples, a pack/section starter generator in the existing editor, clearer boolean behaviour, adaptive value inspection and optional glyph slot labels. The user authorized review, a plan, merge of the feedback into `LG/dev`, and prioritized implementation on 2026-11-23.

## Context and review

The [codebase map](../memories/codebase/README.md), [feedback area](../ideas/landscape/human-feedback-usability.md) and seven linked cards identify existing foundations. Review confirms the example manifest/menu, `NodePalette`, node definitions, canonical watch display registry and editor panels already provide the right extension points. HMD-06's clarification governs: generate initial coverage workflows for contributors, pack creators and users, with all nodes in a selected section/pack. Keep the current app identity.

## Scope and priorities

1. **HMD-06:** preview definitions without constructing nodes; choose pack/category; insert supported, low-side-effect nodes once each in readable category groups; show descriptions and missing-description suggestions; export the reviewed inventory metadata. Report unsupported/capability-sensitive nodes and creation failures. Use one transaction, retain existing graph content and never auto-run. Refresh the scope from the live registry each time, so expanding packs can seed a fresh starter.
2. **HMD-01/02:** six focused, annotated examples covering boolean, structured watch, text watch, widget inputs, bypass and slot icons; show example descriptions, instructions, expected results and relevant settings in a concise collapsible editor explanation panel. Keep manifest-driven discovery and pack templates working.
3. **HMD-03/04:** improve boolean description, toggle search aliases, explicit true/false feedback and property/widget agreement without changing its type or action contract. Add opt-in `auto` watch display with bounded, cycle-safe, getter-free structured previews, observed-type/declared-type feedback and no coercion. Existing value/text/tree displays and saved defaults remain compatible.
4. **HMD-05/07, partial:** optional string glyph/emoji `label_icon`; text/icon+text/icon-only preferences at slot, node and canvas levels, with text fallback and original name/type in the slot context menu. Use the same label text for measurement and drawing. Existing title glyph/image support remains the icon foundation.

## Deferred deliberately

SVG loading/sanitization and an icon asset registry; OS-native icons; schema-based watch validation and a full object inspector; auto-fitting node sizes while data changes; automatic wiring/AI recipes; metadata write-back into pack source; reconciliation of generated graphs with later pack changes; additional runner application shells. Existing runner policies stay intact. Other base nodes can follow once this first pass has concrete feedback.

## Steps

| # | Step | Acceptance check |
|---|---|---|
| 1 | Record review/scope, index and roadmap track; merge feedback branch into `LG/dev` | Documentation links valid; merge contains cards and this plan |
| 2 | Implement starter inventory service and editor panel on `LG/dev_hmd_usability` | Registry-only preview; filters, skipped nodes, grouped insertion, metadata export, round-trip and one-step undo tested |
| 3 | Improve boolean and add bounded auto watch | Property/action/save agreement; cycle/accessor/large-data limits and type mismatch checks |
| 4 | Add glyph slot labels and six explained examples | Drawing/measurement/serialization coverage; examples load/run with expected output snapshots |
| 5 | Update reference docs, changelog, map, roadmap and execution record; validate | `npm run check`; browser editor smoke check; no source/declared-export drift |
| 6 | Commit source/docs, then generated distributions separately; integrate into `LG/dev` | Clean tree, committed builds, implementation and remaining work recorded |

## Risks and decisions

- Creating arbitrary pack nodes may open devices or external services. Preview uses definitions only; first-pass insertion excludes capability-sensitive types and explicitly marks incomplete coverage. Constructor failures are reported rather than silently omitted.
- Node descriptions are author-provided data: render as text, label inferred suggestions, export without editing pack definitions.
- A disconnected inventory is useful documentation, not an automatically executable recipe. State that visibly.
- Glyph-only labels are opt-in; context-menu disclosure retains the original name/type. Full keyboard slot navigation remains X-08.
- No new dependencies or borrowed third-party code are needed.

## History

- 2026-11-23: reviewed and accepted under the user's instruction to prioritize and implement; future contracts explicitly deferred.
