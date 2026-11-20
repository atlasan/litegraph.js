# Wave 4: ecosystem and workspace

> **Date** 2026-11-20 · **Kind** plan · **Status** accepted · **Base** `LG/dev` @ `b52d6e7`

**Outcome:** litegraph becomes a workspace that third-party packs can target and that users can trust with their work.
- **Packs:** node packs declare themselves with a manifest. Documents remember where each node came from, a missing type gives an actionable report, and renamed or deprecated types are replaced through mappings written as data.
- **Workspace state:** the editor knows when a document is modified, keeps a draft, and shows what the runner (or the in-page loop) is doing on each node: status, progress, error.
- **View:** links get a style resolver and a router plug-in, the canvas gets a minimap, and the remaining Wave 2 pointer and drawing carry-overs are finished.
- **Authoring aids:** an auto-layout command and a node palette.
- **Catalog:** the built-in node catalog is cleaned up, with old names kept loadable through the replacement mappings.

Now, because Wave 3 settled the document format, and every item here either reads it (provenance, missing nodes, replacements, dirty flag) or draws on top of it (overlays, minimap, layout).

## Context

What exists ([codebase map](../memories/codebase/README.md)):

| Piece | Today | Gap this wave closes |
|---|---|---|
| Node definitions | `static def` + statics → `LiteGraph.getNodeDefinition` (`src/litegraph.js:357`), `declareCapabilities` per family, `source` field | No owner: nothing says which pack a type belongs to |
| Libraries | `LibraryManager.describeLibraries` / `probeLibraries` (`src/librarymanager.js:529`) | No layer above libraries that groups nodes, extensions and libraries |
| Missing types | `LGraph._configure` makes a plain `LGraphNode` placeholder with `last_serialization` and `has_errors` (`src/lgraph.js:2383`); it round-trips unchanged (`src/lgraphnode.js:345`) | No list, no hint where to get the type, no way to swap it |
| Events | Typed events (`link-connected`, `node-error {node, path}`, `execution-step`, `selection-changed` …); `graph.revision`; `transact(label, fn)` | No single `graph-changed {kind}`, no `viewport-changed`, no saved/modified state (H9) |
| Execution | `runStep` emits `execution-step` and `node-error`; the runner sends its own messages ([development.md](../../docs/development.md#graph-runner)); `node.getPath()` / `graph.resolvePath()` | The editor and the runner speak different shapes; nothing is drawn on the node |
| Drawing | `drawNode` draws the title in one piece; title buttons and badges (`getNodeTitleDecorations`); links drawn by `renderLink` | No per-link style, no router, no minimap, no status overlays |
| Pointer | Drags are `CanvasPointer` gestures (Wave 2b) | `DragAndScale` still binds its own listeners |

Related ideas: H1 (link style resolver, router split), H2 (node adornments), H9 (change events and dirty flag), USE-07 (recent-nodes palette), CFY-55 (manifest extras), CFY-30 (provenance in outputs, later). Carry-overs from Wave 2: DragAndScale listeners into `CanvasPointer`, RenderLink classes, split title drawing with icons (H2), reroutes across subgraph boundaries. Decision D6 (split the catalog once the manifest exists) is answered by W4-6.

## Principles

- **Data first.** Manifests, replacement mappings, execution-state messages and link styles are plain JSON, so the runner, the editor and tests share them.
- **Safe defaults, named opt-ins.** Nothing loads code from a manifest; a pack's code is whatever the page or runner already imported. Every automatic behaviour (stamping, auto-replacement, autosave) has a setting, and each refusal names it.
- **One undo step** for every bulk edit: replace, layout, palette insert.
- **No new hard dependency in the core bundle.** Layout engines load through `LibraryManager`.
- **Provenance:** code adapted from `Comfy-Org/litegraph.js` @ `ea0e1a8` (MIT) only, with attribution; the ComfyUI frontend and ComfyUI-Manager are design references.

## Parts

| Part | Theme | Items |
|---|---|---|
| **4a** | Packs and missing nodes | Pack manifest and registry, built-in packs, provenance stamping, missing-nodes report, replacement mappings and the replace command |
| **4b** | Workspace state and execution | `graph-changed` / `viewport-changed` (H9), dirty flag, draft autosave, shared execution-state protocol, node status / progress / error overlays, split title drawing with icons (H2) |
| **4c** | Links and view | RenderLink classes, link style resolver, link router plug-in, minimap with decoration layers (H1, H9), DragAndScale listeners folded into `CanvasPointer` |
| **4d** | Layout and palette | Auto-layout adapter (dagre built in, ELK optional), node palette with drag-to-canvas, favourites and preview |
| **4e** | Catalog and boundaries | Catalog cleanup through replacement mappings, reroutes across subgraph boundaries |

4a comes first because 4e's renames use its mappings and 4d's palette groups by pack. 4b and 4c are independent of each other.

## 4a: packs and missing nodes

### Model

**Manifest** (plain JSON; ComfyUI-Manager's `pyproject` fields and the FE extension registry are the design references):

```json
{
  "id": "acme-audio",
  "version": "1.2.0",
  "title": "Acme audio nodes",
  "description": "…",
  "requires": { "litegraph": ">=0.10.0" },
  "nodes": ["acme/osc", "acme/filter"],
  "extensions": ["acme.audio-tools"],
  "libraries": ["tone"],
  "templates": [], "locales": [], "docs": "https://…",
  "repository": "https://…", "license": "MIT"
}
```

- `LiteGraph.packs` (`PackRegistry`, `src/packs.js`):
  - `register(manifest, setup?)`: validates, then runs `setup(ctx)` with registration attribution: every type registered during `setup` belongs to the pack, as does every type listed in `nodes`. Returns a disposer that unregisters the pack's types.
  - `index(manifests)`: known packs that are **not** installed (no code). Used only to say where a missing type comes from.
  - `get(id)`, `list()`, `packOf(type)`, `describe()` (manifest plus state: `active`, `disabled`, `incompatible`, `indexed`).
  - `requires.litegraph` is checked against `LiteGraph.VERSION` with a small range matcher (`>=`, `<`, `^`, `~`, exact, `*`). An incompatible pack is refused unless setting `LiteGraph.Packs.AllowIncompatible` is on; the error names the setting.
  - Setting `LiteGraph.Packs.Disabled` (list of ids): a disabled pack is recorded but its `setup` does not run.
- `getNodeDefinition(type).pack` → `{id, version}` or `null`.
- **Built-in packs** (W4-6): each standard node file declares a pack `litegraph/<family>` (`builtin: true`). They stay in the core build; only the declaration is new.

**Provenance stamping** (W4-1): when a node of a non-builtin pack is created, `properties.pack = id` and `properties.pack_ver = version` are set (not overwritten on load). Setting `LiteGraph.Packs.Stamp` (default true).

**Missing-nodes report:** `graph.getMissingNodes({deep})` → one entry per missing type:

```js
{ type, count, nodes: [{id, path}], pack: {id, version, source: "stamp" | "index" | "comfy"} | null,
  replacement: {type, auto} | null }
```

- Reads our stamp, then the pack index, then ComfyUI's `cnr_id` / `aux_id` / `ver`.
- `deep: true` (the default) walks subgraphs, so paths come from `node.getPath()`.
- `configure` emits `missing-nodes {report}` on the root graph when the report is not empty.

**Replacement mappings** (FE `nodeReplacement` is the design reference):

```js
LiteGraph.registerNodeReplacement({
  old_type: "basic/watch_old", new_type: "basic/watch",
  inputs:  { "in": "value" },          // old name or index → new name or index
  outputs: { 0: 0 },
  properties: { "precision": "decimals" },
  widgets: { 0: 1 },                    // widgets_values positions
  set: { properties: { mode: "auto" } },// fixed values on the new node
  auto: false,                          // W4-2
  reason: "renamed in 0.11"
})
```

- `LGraph.replaceNode(node, mapping?)` and `LGraph.replaceNodes(filter)`: one `transact`, keeping id, position, size, title, colours, mode, and the mapped links and values. Unmapped linked slots are reported, not dropped silently: the result lists them, and the links are removed.
- Works on missing placeholders (from `last_serialization`) and on live nodes of a deprecated type.
- `auto: true` mappings apply during `configure`, before nodes are created, so they cost no undo step; each is listed in `configured {replaced}`. Setting `LiteGraph.Packs.AutoReplace` (default true) turns this off.
- Command `litegraph.nodes.replaceMissing`, a node menu entry "Replace with <type>", and an editor dialog listing the report.

### Steps

| # | Step | Acceptance check |
|---|---|---|
| 1 | `src/packs.js`: `PackRegistry`, range matcher, attribution during `setup`, `index`, settings `LiteGraph.Packs.*`; `getNodeDefinition().pack`; types in `litegraph.d.cts` | Jest `packs.test.js`: register with setup attributes types; manifest `nodes` attribute pre-registered types; disposer unregisters; incompatible refused with the setting named, allowed with it; disabled pack's setup does not run; index resolves without code |
| 2 | Built-in packs `litegraph/<family>` declared per node file | Jest: every registered type of the standard build has a pack; `describe()` lists the families; serialization of built-in nodes is unchanged (no stamp) |
| 3 | Provenance stamping on create | Jest: a pack node gets `pack`/`pack_ver`; a loaded node keeps its stored stamp; setting off → no stamp |
| 4 | Missing-nodes report and `missing-nodes` event | Jest: report from stamp, index and ComfyUI `cnr_id`; nested subgraph paths; event fires once on configure; no event for a clean document |
| 5 | Replacement mappings, `replaceNode(s)`, `auto` on load, command, node menu, editor dialog | Jest: links and values mapped; one undo step restores the placeholder; unmapped linked slot reported; `auto` applied at load and listed; setting off keeps the placeholder. Browser (`editor_build.html`): load a document with a missing type, see the report, replace, undo |

## 4b: workspace state and execution

- **Change stream (H9):** `graph-changed {kind, node?, link?, reason}` on the root graph, kinds `node-added`, `node-removed`, `link`, `property`, `widget`, `layout`, `group`, `reroute`, `subgraph`, `configure`; coalesced per `transact`. Canvas `viewport-changed {offset, scale}` from `DragAndScale`.
- **Dirty flag:** `graph.isModified`, `graph.markSaved()`, event `modified-changed`. Widget edits count; selection and viewport do not. The editor title shows `•`.
- **Draft autosave** (W4-5): the editor writes the serialized document to the settings storage adapter (key `litegraph.draft.<doc id>`) after changes, debounced; on load it offers to restore a newer draft. Setting `LiteGraph.Editor.Autosave` (default on in the editor), `…AutosaveDelay`.
- **Execution-state protocol** (W4-4): one versioned message shape for the runner and the in-page loop: `{v: 1, kind: "status" | "progress" | "error" | "reset", path, status: "queued" | "running" | "done" | "error" | "skipped", value?, max?, message?, time}`. `LiteGraph.ExecutionState` builds and applies messages; `graph.applyExecutionState(msg)` resolves `path` with `resolvePath`. `runStep` emits them as event `execution-state`; the runner forwards the same shape over its socket (the existing messages stay for one wave).
- **Overlays and title split (H2):** `drawNode` draws the title through `drawNodeTitle` (box, icon, text, decorations) so packs can set `def.icon`; status pill, progress bar and error outline drawn from `node.execution_state`; setting `LiteGraph.Canvas.ExecutionOverlays`.

| # | Step | Acceptance check |
|---|---|---|
| 6 | `graph-changed`, `viewport-changed` | Jest: each kind fires once per edit and once per transaction |
| 7 | Dirty flag and `modified-changed` | Jest: edit → modified; `markSaved` → clean; undo back to the saved revision → clean |
| 8 | Draft autosave and restore offer | Jest with a storage stub; browser: edit, reload, restore |
| 9 | Execution-state protocol, `runStep` emission, runner forwarding | Jest; integration: runner sends `status` and `error` with a path inside a subgraph |
| 10 | Title split with icons; overlays | Jest (drawing stub counts); browser: running, done, error shown, cleared by `reset` |

## 4c: links and view

- **RenderLink classes:** `RenderLink` (from a link, a floating link or a drag) carries `{start, end, startDir, endDir, color, type, path}`; `renderLink` draws one. Port of the standalone's `LinkConnector` render pieces at `ea0e1a8`, with attribution.
- **Style resolver (H1):** `LiteGraph.linkStyles.register(name, (link, ctx) → {visible, alpha, color, width, dash, label, animate})`; resolvers compose in order. Built-ins: spotlight (links of the selection stay bright), dim by type, hidden, labelled. Setting `LiteGraph.Canvas.LinkStyles` (list of active names).
- **Router plug-in:** `LiteGraph.linkRouters.register(name, (renderLink, ctx) → path)`; built-ins `spline`, `straight`, `linear` move into it, `links_render_mode` selects one. A routed (obstacle-avoiding) router stays a later idea ("link routing as default" is deferred).
- **Minimap:** `MiniMap` (a small canvas drawn from `graph` bounds), viewport rectangle, click/drag to pan; decoration layers (`minimap.addLayer(fn)`) for selection, errors and execution state. Redraws on `graph-changed` and `viewport-changed`, not on a timer.
- **Pointer:** `DragAndScale` stops binding its own listeners; wheel, pan and pinch go through `CanvasPointer`.

| # | Step | Acceptance check |
|---|---|---|
| 11 | RenderLink classes; routers moved into `linkRouters` | Jest: same paths as before for the three modes; browser: links unchanged |
| 12 | Link style resolver and built-ins | Jest: composition, hidden links skip drawing and hit testing; browser: spotlight |
| 13 | Minimap with layers | Jest (no timer, redraw counts); browser: pan by drag on the minimap |
| 14 | DragAndScale listeners into `CanvasPointer` | Existing pointer and dispose tests pass; Jest: no listener left after `dispose()`; browser: wheel zoom, pan, pinch |

## 4d: layout and palette

- **Auto-layout adapter** (W4-3): `LiteGraph.layout.register(name, engine)`; engine `dagre` (library `dagre` through `LibraryManager`, loaded on first use), `elk` as an optional plugin with the same adapter. `graph.autoLayout({engine, scope: "selection" | "all", direction})` moves nodes, groups (fitted after) and reroutes in **one transaction**. Command `litegraph.layout.auto`.
- **Node palette** (W4-8): a core data API `LiteGraph.palette` (categories by pack and category, search through `nodeSearch`, favourites in setting `LiteGraph.Palette.Favorites`, recent list), and an editor DOM panel with drag-to-canvas and a preview drawn from the definition (slots, title, icon) on an offscreen canvas.

| # | Step | Acceptance check |
|---|---|---|
| 15 | Layout adapter, dagre engine, command | Jest with a fake engine: one undo step, selection scope leaves others in place; integration in Node with `dagre` installed as a dev dependency |
| 16 | Palette API and editor panel | Jest: favourites persist through settings; browser: drag a node from the palette onto the canvas, star it, reload |

## 4e: catalog and boundaries

- **Catalog cleanup** (through 4a mappings, `auto: true`): one watch node; `jquery` folded into `html` (or left out of the build); one network naming scheme; consistent category roots. Each rename gets a mapping so old documents load.
- **Reroutes across subgraph boundaries:** `convertToSubgraph` / `unpackSubgraph` keep the reroute chain on the side where its points are, split at the boundary.

| # | Step | Acceptance check |
|---|---|---|
| 17 | Catalog cleanup with mappings | Jest: every old type name loads into the new type; integration fixtures from `tools/tests/fixtures` still run |
| 18 | Reroutes across subgraph boundaries | Jest: convert and unpack keep reroutes on both sides; one undo step |

## Settings and flags

| Name | Default | Purpose |
|---|---|---|
| `LiteGraph.Packs.Stamp` | true | Stamp `pack` / `pack_ver` on nodes of non-builtin packs |
| `LiteGraph.Packs.AutoReplace` | true | Apply `auto: true` replacement mappings on load |
| `LiteGraph.Packs.AllowIncompatible` | false | Register packs whose `requires.litegraph` does not match |
| `LiteGraph.Packs.Disabled` | `[]` | Pack ids whose `setup` does not run |
| `LiteGraph.Editor.Autosave`, `…AutosaveDelay` | on, 2000 ms | Draft autosave (4b) |
| `LiteGraph.Canvas.ExecutionOverlays` | true | Status, progress and error overlays (4b) |
| `LiteGraph.Canvas.LinkStyles` | `[]` | Active link style resolvers (4c) |
| `LiteGraph.Palette.Favorites` | `[]` | Palette favourites (4d) |

## Security (runner)

- A manifest is data: `register` never fetches or evaluates code; `index` stores only metadata.
- The runner keeps `nodePolicy.js` (including definitions), Origin/Host checks and the script lockdown. Replacement on load runs **before** the policy check sees the document, so an `auto` mapping cannot turn an allowed type into a denied one without being refused: the policy checks the document after replacement too (step 5 adds an integration test).
- Execution-state messages carry paths and messages, never node data values.

## Decisions

All seven were decided by the user on 2026-11-20, as recommended.

| ID | Question | Decision (2026-11-20) |
|---|---|---|
| W4-1 | Provenance: where and for which nodes? | `properties.pack` / `properties.pack_ver`, only for nodes of non-builtin packs, never overwritten on load. ComfyUI's `cnr_id` / `aux_id` / `ver` are read for the report, not written |
| W4-2 | Replacement mappings on load: automatic or offered? | **Offered** by default (report, command, dialog); mappings marked `auto: true` (our own renames) apply at load and are listed. Setting `LiteGraph.Packs.AutoReplace` |
| W4-3 | dagre: bundled or loaded? | **Loaded on demand** through `LibraryManager` (key `dagre`); the adapter is in core, no new hard dependency; ELK is an optional plugin on the same adapter |
| W4-4 | Execution-state protocol: one shape for runner and editor? | **Yes**, versioned `v: 1` messages keyed by path; the runner's current messages stay one wave for compatibility |
| W4-5 | Draft autosave: where and how restored? | Editor only, through the settings storage adapter, debounced; on load **offer** to restore a newer draft, never restore silently |
| W4-6 | D6, the built-in catalog: split into packs now? | **Declare** each node family as a builtin pack in 4a (metadata only); the physical split of files and bundles moves to Wave 5 packaging |
| W4-7 | Palette: canvas-drawn or DOM? | Data API in core; the panel is DOM in the editor shell (full builds), like the search box |

## Risks and open questions

- **Attribution during `setup`** depends on synchronous registration. Async setups attribute only the types listed in `nodes`; documented and tested.
- **Replacement of live nodes** can break node-specific state (timers, HTML widgets). `replaceNode` calls `onRemoved` on the old node first, the same as delete.
- **Version source:** the range check needs `LiteGraph.VERSION` to be the package version (Wave 0 B15); a pre-release suffix compares as lower.
- **Overlay cost** (4b): drawing overlays for every visible node each frame; measured on a 1,000-node fixture.
- **dagre maintenance** (4d): `dagre` 0.8.5 is old but stable; `@dagrejs/dagre` is the maintained fork. Choose at 4d after the changelog review; both satisfy the two-week rule.
- **Router change** (4c) risks small visual differences; step 11 compares paths numerically before and after.

## Implementation notes (4a)

Corrections made while building; the [4a execution record](../executions/2026-11-20-wave4a-packs.md) has the details.
- **Runner check before loading:** instead of re-checking after replacement, `assertAllowedGraph` takes `replacedType` and checks the type an `auto` mapping loads as, before any node is constructed.
- **Builtin attribution** uses `packs.open(manifest)` / `packs.close(id)` around each node file, the same mechanism `register(manifest, setup)` uses.
- **`missing-nodes {reason}`:** undo, redo and transaction rollbacks reload the graph, so the event says why it fired; the Editor opens its panel only for `"load"`.
- **A placeholder whose type is registered later** is rebuilt as that type by `replaceNode` / `replaceNodes` (identity mapping).

## Implementation notes (4b)

- **Code edits without a history entry** (`setProperty`, widget values set by code) are reported by `graph-changed` once per microtask and make the document modified; recorded changes report synchronously.
- **Draft key:** one key per editor (`litegraph.editor.draft`), since a fresh editor graph has a new id after a reload; the draft stores the document id.
- **Runner messages:** the existing `console` messages stay; `execution_state` is added beside them.

## History

- 2026-11-20: 4b done: steps 6–10 ([record](../executions/2026-11-20-wave4b-workspace.md)).
- 2026-11-20: 4a done: steps 1–5 ([record](../executions/2026-11-20-wave4a-packs.md)).
- 2026-11-20: accepted; W4-1 to W4-7 decided as recommended (stamp `pack`/`pack_ver` on non-builtin nodes, replacements offered with `auto` for own renames, dagre loaded on demand, one v1 execution-state shape, autosave with a restore offer, builtin packs declared now and split in Wave 5, palette as core API plus editor panel).
- 2026-11-20: proposed.
