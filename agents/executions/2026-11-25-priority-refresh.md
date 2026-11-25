# Repository-wide inventory and priority proposal

> **Date** 2026-11-25 · **Kind** execution · **Status** final · **Base** `LG/dev_priorities_refresh` @ `a14c29a` · **Plan** [priority proposal](../plans/2026-11-25-priority-refresh.md)

Completed the user's new-topic request to recheck and collect ideas, cards, features, capabilities and missing parts, then propose fresh priorities. This is documentation/data work; implementation and merging were not requested for this topic.

## Changes

- [Capability/gap audit](../audits/2026-11-25-capabilities-and-gaps.md): owning source/record evidence, measured metadata, an execution freshness reproduction and reconciled historical gaps.
- [Complete idea inventory](../audits/2026-11-25-idea-inventory.md) and [JSON snapshot](../audits/2026-11-25-capability-inventory.json): all 276 ideas, 15 cards, 273 shipped node records and 27 manifests. Eleven earlier wishes gained catalog rows; existing maturity remained separate from current delivery.
- [Proposal](../plans/2026-11-25-priority-refresh.md): ten groups, dependencies/decisions, deferred directions and three bounded next proposals. It remains `proposed`.
- Corrected living indexes/map: counts, script defaults, build exports, delivered launcher/groups/examples, stale mode-numbering notes and a plan row misplaced under Lifecycle. Dated audits/executions and historical cards were preserved.

## Verification

| Check | Result |
|---|---|
| Existing node-reference harness | 273/273 shipped types construct under its stubs; 27 manifests, 25 node-bearing packs, 86 execution declarations, 9 usage texts, 0 static slot declarations, 0 templates |
| Example manifest | 50 entries, 36 visible, 14 WIP, 6 structured guides |
| Focused source probe | Same-call read/edit/read reproduces `[1,1]` after the property becomes `2`; node executes once |
| Fresh-process bundle imports | Main: 255 with gl-matrix; full: 247 without it; Node full: 265 without it / 273 with it. Script defaults off in the sampled main/full imports |
| Catalog, inventory and JSON consistency | 276 unique IDs, complete one-to-one coverage; 15 cards, 12 landscapes; maturity/delivery/manifest/node counts agree |
| Local Markdown file targets / references | Pass for changed/new Markdown; original catalog/card links checked; path:line references treated as source locations |
| `git diff --check` | Pass |
| Full code gate / local CI | Not rerun: no code or build changes. Latest release proof is explicitly historical in the audit; a merge would require fresh `ci:local` on the committed ref |

## Left open

The user can promote bounded proposals A (scoped freshness), B (Basic/events pack authoring) and C (repeatable editor acceptance), or choose a domain direction. No new wave, dependency adoption, GitHub operation or implementation is implied. Candidate entries are not all individually proven absent; external licences/activity and real-device behaviour need separate verification before adoption.
