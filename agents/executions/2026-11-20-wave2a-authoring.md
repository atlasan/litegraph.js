# Wave 2a: authoring operations

> **Date** 2026-11-20 · **Kind** execution · **Status** final · **Base** `LG/wave2_authoring` @ `aaafc2d` · **Plan** [Wave 2: authoring core](../plans/2026-11-20-wave2-authoring-core.md)

Part 2a of Wave 2 delivered steps 1–4 of the plan on `LG/wave2_authoring`, cut from `LG/dev` @ `3aaf2e8`:

1. subgraph conversion and unpack
2. group authoring
3. clipboard fragments
4. ranked node search with filters

Three latent bugs were fixed along the way (see Changes). Part 2b (links and pointer) is next.

## Changes

- `22474f2` `docs:` Wave 2 plan.
- `8436ba6` `feat:` `LGraph.convertToSubgraph` / `unpackSubgraph` (`Subgraph.buildFromNodes` / `unpack`):
  - one input per outside source, one output per inside source; event ports
  - pass-through links bridged on unpack
  - one undo step each, rolled back on failure (B2, B3)
- `a797b24` `feat:`
  - `LGraphGroup.resizeTo` (after the MIT standalone), `fitToContents`, `setNodesMode`
  - group menu: "Fit to contents" and "Mode for all nodes"
  - `canvas.groupSelected()` and Ctrl+G
  - "Add Group" undoable
- `215cecb` `feat:`
  - `serializeSelection()` / `insertFragment()`: groups and reroute chains (shared reroutes rebuilt once), Ctrl+Shift+V reconnects inputs from unselected nodes, the older clipboard format still pastes, the clipboard falls back to memory
  - fix: copying left a stale `_relative_id` on nodes
- `20c2703` `feat:`
  - `src/nodesearch.js` (`LiteGraph.nodeSearch`): every word must match; ranking runs exact, title prefix, whole word, word prefix, alias, substring, description; filters `i:` `o:` `c:` `s:`; definition filters (deprecated hidden behind a setting) used by the search box
  - fix: `registerNodeAndSlotType` stored `undefined` for a class or type string
- `65a693b` `fix:` "Convert to subgraph" is offered again in the node menu (it had been commented out while the conversion was broken), and "Convert selection to subgraph" in the canvas menu.
- Each `feat:` / `fix:` commit has a `build:` commit after it.

## Verification

| Check | Result |
|---|---|
| `npm run check` | lint clean, 12 builds, strict types, **361/361 Jest** (up from 344), 92/92 integration, package check |
| New tests | `test/subgraph-authoring.test.js` (6): data flow, fan-out, events, unpack and pass-through, undo, rollback. `test/node-search.test.js` (4). `test/groups-history.test.js` (+2). `test/selection.test.js` (+5): group selected, fragments, Ctrl+Shift+V, stale ids, the older format |
| Browser `editor_build.html`: right-click a node, "Convert to subgraph" | subgraph node with `in`/`out`; Const −9 → subgraph → Watch shows 9; history entry `convertToSubgraph` |
| Browser: "Unpack subgraph", then undo | `math/abs` back with links intact (Watch 4); undo restores the subgraph node |
| Browser: search box | `watch` ranks `basic/watch` first; `abs c:math` → `math/abs`; `watch c:math` → nothing; `operation` lists the `*/operation` types first |
| Browser: Ctrl+G on two selected nodes | one group enclosing both; history entry `groupSelected` |

## Left open

- **Part 2b** (plan steps 5–7): LinkConnector features and link-drag events, quick-connect, pointer migration, floating reroutes, badges and title buttons.
- **Slot filters:** `i:` / `o:` rely on declared `def` slots or the slot-type registry. Outputs are recorded only with `auto_load_slot_types`, so types without a `def` and never created yet do not match `o:`.
- **Group drag** still uses the legacy pointer path (part 2b).
