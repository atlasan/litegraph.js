# Wave 4a: packs and missing nodes

> **Date** 2026-11-20 · **Kind** execution · **Status** final · **Base** `LG/wave4a_packs` @ `c7bae51` · **Plan** [Wave 4: ecosystem and workspace](../plans/2026-11-20-wave4-ecosystem-workspace.md)

Part 4a delivered plan steps 1–5 on `LG/wave4a_packs`, cut from `LG/dev` @ `03a6dab` (the accepted plan): pack manifests and the registry, builtin packs per node family (W4-6), provenance stamping (W4-1), the missing-nodes report, and replacement mappings with an offered replace and `auto` replacement on load (W4-2).

## Changes

- `b37a705` `feat:` packs, provenance, missing nodes and replacement mappings:
  - **`src/packs.js` (new), `LiteGraph.packs`:**
    - `register(manifest, setup)` validates the manifest, checks `requires.litegraph` with a small range matcher (`*`, partial, `>=` `>` `<=` `<` `=`, `^`, `~`, `||`), and runs `setup`. Types registered meanwhile belong to the pack, and so do types listed in `nodes`. The disposer unregisters them.
    - An incompatible pack is refused with a message naming `LiteGraph.Packs.AllowIncompatible`; with it on, the pack is recorded as `incompatible` and its `setup` does not run. `LiteGraph.Packs.Disabled` lists packs whose `setup` does not run.
    - `index(manifests)`: known packs that are not installed (metadata only). `packOf`, `typesOf`, `findPackForType`, `describe`.
    - `getNodeDefinition(type).pack`; `LiteGraph.refreshNodeDefinition`.
  - **Builtin packs:** each built node file opens and closes a `litegraph/<family>` pack (`builtin: true`, never stamped); `graph/*` types are `litegraph/core`.
  - **Stamping:** `createNode` sets `properties.pack` / `pack_ver` for non-builtin packs (`LiteGraph.Packs.Stamp`); a loaded node keeps its stored stamp.
  - **Missing nodes:** `graph.getMissingNodes({deep})` (pack from the stamp, the index or ComfyUI's `cnr_id` / `aux_id` / `ver`; replacement; paths inside subgraphs). The root graph emits `missing-nodes {report, reason}`; `reason` is `"history"` or `"rollback"` when undo or a failed transaction reloads the graph. Placeholders show their missing type as the title and still save without one.
  - **Replacement:** `LiteGraph.registerNodeReplacement(mapping)` (inputs, outputs, properties, widgets, `set`, `auto`, `reason`); `graph.replaceNode(node, mapping | type)` and `graph.replaceNodes({filter, deep})`, each one undo step per graph, event `node-replaced`. The node keeps its id, position, title, colours, mode and flags; link objects move to the mapped slots, so link ids and reroutes survive; links the mapping cannot place are removed and returned as `dropped`. A placeholder whose type has been registered since loading is rebuilt as that type. `auto` mappings apply during `configure` without an undo step or a revision change and are listed in `configured {replaced}` (`LiteGraph.Packs.AutoReplace`).
  - **UI (`src/extensions/node_packs.js`, full builds):** the missing-nodes panel, which the Editor opens after a load (setting `LiteGraph.Nodes.ShowMissingOnLoad`; not on undo or redo); it says which links a replacement removed. Commands `litegraph.nodes.showMissing`, `litegraph.nodes.replaceMissing`, `litegraph.nodes.replace`, and "Replace with …" / "Rebuild as …" in the node menu.
  - **Runner:** `assertAllowedGraph(data, isRegistered, {replacedType})` accepts a renamed type only when the type it loads as is registered, and checks that type against the denylist; the worker passes the `auto` mappings.
- `c7bae51` `build:` regenerated distributions.

## Verification

| Check | Result |
|---|---|
| `npm run check` | lint clean, 12 builds, strict types and export parity (`PackRegistry`; `nodePacksExtension`, `registerExtension_nodePacks`, `showMissingNodesPanel` in the Node bundle), **522/522 Jest** (up from 489 after Wave 3), **95/95 integration** (up from 94), package check |
| New tests | <ul><li>`packs.test.js` (33): version ranges (16 cases); setup attribution and disposal; manifest `nodes` before and after registration; incompatible refused naming the setting; disabled; invalid manifests; index; builtin packs unstamped; stamping and stored stamps; report from stamp, index and ComfyUI with nested paths and one `load` event; no event for a clean document; replacement keeps id, title, link ids, mapped values, runs, and one undo restores the placeholder (reason `history`); dropped link reported and removed; `auto` on load and the setting; rebuild after late registration; refusals; commands and node menu; placeholder title</li><li>`runner-security.test.mjs`: a renamed type loads only through a registered target, and cannot load a denied one</li></ul> |
| Browser, `editor_build.html` (port 8001, real clicks) | <ul><li>A document with `acme/old` (stamped acme@1.0.0), `far/thing` (indexed pack) and `KSamplerX` (`cnr_id`) opens the missing-nodes panel with all three sources.</li><li>"Replace 1 node" replaces `acme/old` by `acme/scale`: the links stay, Step shows 20 (4 × `k` 5), and the panel says what was replaced.</li><li>Ctrl+Z restores the placeholder with its links, without reopening the panel.</li><li>Right-click on a placeholder title shows "Replace with acme/scale", which works the same.</li><li>Found and fixed during the check: an output whose name the mapping did not cover was dropped silently in the panel (now listed), and placeholders were titled "undefined" (now the type).</li></ul> |

Port 8000 was taken by an editor serving the main checkout, so this worktree was served on 8001 with the same static layout.

## Left open

- **Body right-click on a placeholder** opens no menu (title right-click does); not changed here.
- **Pack enable/disable at runtime** needs a reload: `Disabled` is read when a pack registers. Builtin packs cannot be disabled until Wave 5 splits the catalog.
- **4b–4e** are next (see the [roadmap](../plans/roadmap.md#wave-4-ecosystem-and-workspace-accepted)); 4e will register `auto` mappings for the catalog renames.
