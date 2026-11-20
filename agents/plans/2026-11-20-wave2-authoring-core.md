# Wave 2: authoring core

> **Date** 2026-11-20 · **Kind** plan · **Status** accepted · **Base** `LG/dev` @ `3aaf2e8`

This wave makes the everyday authoring operations work properly: turning a selection into a subgraph and back, working with groups, copying and pasting whole fragments, finding nodes, and dragging links. It builds on the Wave 1 platform (commands, transactions, selection, `CanvasPointer`). Several of these operations were broken or missing; "Convert to subgraph" threw and left an orphan node.

## Context

- **Roadmap:** [Wave 2](roadmap.md#wave-2-authoring-core-next). Sources:
  - the feature harvest ([plan](2026-11-19-feature-harvest-and-priorities.md))
  - the Comfy core harvest ([research](../memories/research/))
  - the open bugs B2 and B3 in the [fork inventory](../audits/2026-11-19-fork-inventory.md)
- **Where the code lives:** see the [codebase map](../memories/codebase/README.md). `src/subgraph.js`, `src/lgraphgroup.js`, the clipboard and search code in `src/lgraphcanvas.js`, `src/linkconnector.js`, `src/canvaspointer.js`.
- **Decisions:** D2 (the subgraph format, [ADR 0001](../memories/decisions/0001-subgraph-document-format.md)) stays open. This wave works on the current inline model, so its result informs D2. D3: code from the MIT standalone is adapted with attribution.

The wave is split into two branches. The first can land without the second.

| Part | Branch | Content |
|---|---|---|
| 2a authoring operations | `LG/wave2_authoring` | subgraphs, groups, clipboard, search |
| 2b links and pointer | `LG/wave2_links` | LinkConnector features, link-drag events, quick-connect, pointer migration, floating reroutes, badges |

## Scope

- In (2a):
  - subgraph conversion and unpack
  - group fit, "group selected" and mode for the whole group
  - copy and paste of groups and reroutes, `insertFragment`, Ctrl+Shift+V
  - search filter prefixes, ranking, and a definition-filter registry
- In (2b):
  - snap and highlight to a compatible slot
  - shift-drag moves all links of an output
  - drag from a reroute or a link segment
  - `dropped-on-canvas` search filtered by type
  - link-drag lifecycle events, and quick-connect as an extension
  - node, group and link dragging on `CanvasPointer`
  - floating reroutes
  - node badges and title buttons
- Out:
  - subgraph v2 definitions (Wave 3)
  - link routing and minimap (Wave 4)
  - TypeScript and renderer changes

## Steps

| # | Step | Acceptance check |
|---|---|---|
| 1 | `LGraph.convertToSubgraph(nodes)` / `unpackSubgraph(node)` on the inline model: one input per outside source, one output per inside source, event ports, internal links kept, pass-through links bridged; one undo step; rolled back on failure (B2, B3) | `test/subgraph-authoring.test.js`: data flow, fan-out, events, unpack, undo, rollback; menu checked in the browser |
| 2 | Groups: `resizeTo(items, padding)` and fit to contents, "Group selected", set the mode of every node in a group; group operations are one undo step | Jest tests; browser check of the group menu |
| 3 | Clipboard: copy and paste keep groups and reroutes; `canvas.insertFragment(data, pos)`; Ctrl+Shift+V keeps inputs that come from unselected nodes | Jest round trip: paste equals copy (ids remapped, links intact); browser check |
| 4 | Search: `i:` `o:` `c:` `s:` filters, ranking (exact, prefix, word, alias, description), a definition-filter registry that hides deprecated and experimental nodes behind settings | Jest tests on a query corpus; browser check |
| 5 | (2b) LinkConnector features and link-drag events, quick-connect extension | Jest plus browser |
| 6 | (2b) Pointer migration (node, group and link drag), floating reroutes | Jest plus browser; no change in existing behaviour tests |
| 7 | (2b) Badges and title buttons | Jest plus browser |

Each step: `npm run check`, a `feat:` commit and a `build:` commit. At the end of each part, an execution record and the roadmap updated.

## Risks and open questions

- **Conversion and resources:** conversion removes and recreates nodes, so `onRemoved`/`onAdded` run. Nodes holding resources (HTML overlays, sockets) restart. That is the documented cost of the inline model (ADR 0001).
- **Pointer migration** touches the busiest code in `lgraphcanvas.js`. It is done one gesture at a time, and the legacy paths stay until each gesture is covered.
- **Search ranking** changes result order. The filter prefixes only apply when typed, so plain searches keep working.

## History

- 2026-11-20: accepted with the start of Wave 2; step 1 implemented on `LG/wave2_authoring`.
