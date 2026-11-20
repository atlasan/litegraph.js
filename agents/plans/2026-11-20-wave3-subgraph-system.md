# Wave 3: subgraph system (proposal)

> **Date** 2026-11-20 · **Kind** plan · **Status** proposed · **Base** `LG/dev` @ `0443d77`

**Outcome:** one lean subgraph system for litegraph.
- A **definition** is a reusable graph with an interface.
- It is used three ways:
  - a **subgraph node** embeds a running copy;
  - a **function node** calls it;
  - a **component** registers it as a node type.
- Documents store definitions in ComfyUI's `definitions.subgraphs` shape, so subgraphs travel to ComfyUI and back.
- Execution stays litegraph's own: nested graphs, events and ON_REQUEST, all unchanged.

We take ComfyUI's document format and its authoring ideas, not its class tree. The design leaves room for higher-order use (map, call-by-reference) without building it now.

## 1. Context

### Today ([codebase map](../memories/codebase/README.md), `src/subgraph.js`)

| Piece | What it does | Limits |
|---|---|---|
| `graph/subgraph` (`Subgraph`) | Owns an inline inner `LGraph` (`node.subgraph`, serialized inline). Each run copies inputs into `subgraph.inputs[name]`, calls `runStep()` and reads `subgraph.outputs[name]`. An event input calls `subgraph.onAction(name)`, which reaches the `GraphInput` with that name. An event `GraphOutput` calls `graph.trigger(name)`, which reaches `onSubgraphTrigger`, which reaches the outer `triggerSlot` | Copies are independent. The interface is matched by **name** only, so a rename means remove plus add, and outer links break |
| `graph/input` / `graph/output` | Boundary nodes, one per interface slot. `properties {name, type, value}`. They add, rename, retype and remove entries in `graph.inputs` / `graph.outputs` (insertion order is the interface order) | There is no slot id, and order is implicit |
| `graph/function` (`NodeFunction`) | Reuses a subgraph by **node id in the same graph**: copies the host's slots, writes `input.hard_coded_value` (read by `getInputData`), calls `host.doExecute()` and reads `host.getOutputData` | Work in progress: debug `console.error`, a dead `refresh` button (`bind` without a call), event outputs not wired, shares the host's runtime state, cannot reach other graphs |
| Convert / unpack (Wave 2a) | `graph.convertToSubgraph(nodes)` / `unpackSubgraph(node)`, one undo step each | n/a |
| Canvas | `openSubgraph` / `closeSubgraph` with `_graph_stack` and view restore; title shows the path | No breadcrumb clicks and no open button |
| Widget inputs (Wave 1) | `input.widget = {name}`: a widget's value is fed by a link when linked (`getWidgetValue`, `isWidgetLinked`) | n/a |
| Runner policy (`headless/graphrunner/nodePolicy.js`) | Recursive denylist over inline `node.subgraph` | **Does not inspect `definitions.subgraphs`**: a denied node inside a definition would pass (see §8) |
| History | Snapshot per graph. An inner graph has its own history; transactions are per graph | n/a |

### ComfyUI and the MIT standalone (SA) at `ea0e1a8`

These were read as references. [ADR 0001](../memories/decisions/0001-subgraph-document-format.md) has option B chosen. The [relationship study](../memories/research/ecosystem-study/2026-11-18-comfyui-litegraph-relationship.md) has the details.

- **Document:**
  - The root holds `definitions.subgraphs[]`.
  - A definition is a full graph plus `id` (guid), `name`, `inputNode` / `outputNode` (`{id: -10|-20, bounding}`), and ordered `inputs` / `outputs` (`{id: uuid, name, type: string, linkIds, label?, localized_name?}`). It may also carry `widgets` (`[{id, name}]`), `revision`, `config` and `extra`.
  - Links inside it use `origin_id: -10` (from interface input *i*: `origin_slot: i`) and `target_id: -20`.
  - An instance node is `{type: <definition id>, inputs, outputs, widgets_values, ...}`, with slots matched to the interface **by index**.
- **SA runtime:**
  - A definition is a single shared `Subgraph extends LGraph`; every `SubgraphNode` instance points at it.
  - Execution flattens instances into `ExecutableNodeDTO`s with path ids `"12:5:3"`.
  - Promotion is link-based: an interface input linked to an inner **widget input** gives the instance a copy of that widget, whose value feeds the input.
  - About 2,600 lines in 12 classes; 14 test files with 224 tests.

### Why a different runtime from SA

Our nested runtime already carries events, actions and ON_REQUEST across the boundary, and the function node needs isolated runs. A flattened DTO executor would replace all of that and add only flattening. We keep the runtime and make the **document** ComfyUI's.

## 2. Principles

1. **One definition model, three uses.** No parallel class tree: the subgraph node, the function node and components share one registry and one load/save path.
2. **The document is ComfyUI's; the runtime is ours.** Load and save are pure JSON transforms (`src/subgraphdefs.js`). They work the same in the browser, the Node runner and the interop extension.
3. **Instances are isolated at runtime and shared on disk.** Each use runs its own copy (state, timers and events are per instance). Linked uses share one definition document.
4. **Identity is stable:**
   - definition guid;
   - interface slot ids;
   - inner node ids;
   - path ids for nested addressing.
5. **Safe defaults, clear opt-ins:**
   - A copy is linked inside a document; anything from outside it is copied (W3-1).
   - Recursion is refused with a named error.
   - The runner checks every definition.
   - `LiteGraph.subgraph_format` lets a writer stay inline for older readers.
6. **Small surface.**
   - One new module (`src/subgraphdefs.js`, target ≤ 500 lines).
   - A smaller `subgraph.js`, since `NodeFunction` is rewritten as about 60 lines on top of `Subgraph`.
   - Thin hooks in `LGraph`, `LGraphCanvas`, the interop extension and the runner.

## 3. Model

| Concept | Runtime | Document |
|---|---|---|
| **Definition** | A plain JSON document in `rootGraph.subgraphs: Map<id, definition>`. It is the source; instances are built from it | One `definitions.subgraphs[]` entry, ComfyUI shape |
| **Interface** | `definition.inputs` / `outputs` (ordered, `id` uuid); inside the instance graph, one `graph/input` / `graph/output` per slot with `properties.slot_id` | `inputs` / `outputs` + `-10` / `-20` links |
| **Subgraph node** `graph/subgraph` | `properties.subgraph_id`; `node.subgraph` is its own runtime `LGraph`, built from the definition | `{id, type: <definition id>, pos, size, inputs, outputs, widgets_values, mode, ...}` (no `subgraph` field) |
| **Function node** `graph/function` | A `Subgraph` subclass: `call` action input plus a `done` event output around the interface; runs its copy only when called | `{type: "graph/function", properties: {subgraph_id}, ...}` |
| **Component** (3c) | `LiteGraph.registerSubgraphType(type, definition)` registers a definition as a node type (search, palette, menus). An instance links to a copy kept in the document, with `source: {type, revision}` | The definition copy plus `extra.litegraph.source` |
| **Path id** | `node.getPath()`: `"3:7:2"` from the root; `rootGraph.resolvePath(path)` | not stored |

### 3.1 Definition JSON (as written)

```jsonc
{
  "id": "6f1c…", "version": 1, "revision": 4, "name": "Blur",
  "description": "", "category": "image",               // optional, kept verbatim
  "state": { "lastNodeId": 7, "lastLinkId": 9, "lastGroupId": 0, "lastRerouteId": 0 },
  "inputNode":  { "id": -10, "bounding": [0, 100, 120, 60] },
  "outputNode": { "id": -20, "bounding": [600, 100, 120, 40] },
  "inputs":  [{ "id": "a1…", "name": "image",  "type": "IMAGE", "linkIds": [3] },
              { "id": "a2…", "name": "trigger", "type": "event", "litegraph_type": -1, "linkIds": [4] }],
  "outputs": [{ "id": "b1…", "name": "image",  "type": "IMAGE", "linkIds": [8] }],
  "widgets": [],
  "nodes": [ /* inner nodes, graph/input and graph/output removed */ ],
  "links": [ { "id": 3, "origin_id": -10, "origin_slot": 0, "target_id": 5, "target_slot": 0, "type": "IMAGE" }, … ],
  "groups": [], "reroutes": [], "config": {},
  "extra": { "litegraph": { "io": { "a1…": { "pos": [40, 100], "value": 0, "title": "Input" }, … } } }
}
```

- `-10` / `-20` links replace the `graph/input` / `graph/output` nodes on disk. The nodes' layout, default value and title go to `extra.litegraph.io[slot_id]`, so a round trip through our editor is lossless.
- **Event ports:** ComfyUI interface types are strings, so they are written as `type: "event"` + `litegraph_type: -1`. On load, `litegraph_type` wins, and a bare `"event"` also maps to `LiteGraph.EVENT`.
- **Links inside a definition** are always objects (the version 1 link form). The loader also accepts arrays.
- **Nested definitions** are flattened into the root's `definitions.subgraphs`, as ComfyUI writes them. On load, a nested `definitions` block inside a definition is accepted too.

### 3.2 Runtime ids for boundary nodes

Materializing a definition creates `graph/input` node *i* with id `-(1000 + i)` and `graph/output` node *j* with id `-(2000 + j)`:
- These ids never collide with stored node ids, and they are never written.
- `LGraph.add` keeps any id except `-1`.
- `-10` / `-20` stay free for ComfyUI's meaning.

## 4. Algorithms

### 4.1 Save: inline runtime → definitions (`toDefinitions(doc)`)

1. Walk the serialized root depth-first. For each `graph/subgraph` / `graph/function` node with an inline `subgraph`:
   - recurse into it first (inner definitions are processed before outer ones);
   - then build its definition `D` from the inner graph, as follows.
2. **Interface:**
   - The interface order is the inner graph's `inputs` / `outputs` order.
   - Each `graph/input` node gives `{id: slot_id ?? new uuid, name, type}`.
   - A slot id written back to the node is stable from then on.
3. **Links:**
   - A link from a `graph/input` node (output 0) becomes `origin_id: -10, origin_slot: i`.
   - A link into a `graph/output` node becomes `target_id: -20, target_slot: j`.
   - Each rewritten id is added to the slot's `linkIds`.
   - Then the IO nodes are removed from `nodes`, and their layout goes to `extra.litegraph.io`.
4. **`inputNode.bounding`** is the box around the `graph/input` nodes; it defaults to the left of the content. `outputNode.bounding` is the same for the outputs.
5. **Identity and sharing:**
   - The id is the node's `properties.subgraph_id`, or a new uuid assigned once.
   - Instances that share an id but whose `D` differs (canonical JSON comparison) are **forked**: every distinct content after the first gets a new id.
   - The fork is reported: `graph` event `subgraph-forked {from, to, nodeIds}`. This is a safety net: linked editing (§4.3) keeps instances equal.
6. **Instance node:**
   - `type = D.id`;
   - drop `subgraph`;
   - keep `properties.subgraph_id`, ComfyUI ignores it;
   - `inputs` / `outputs` in interface order;
   - function nodes keep `type: "graph/function"`.
7. **Unused definitions are kept:**
   - those that came from the loaded document;
   - those added by insert or a component.
   - "Remove unused" is an explicit command.

### 4.2 Load: definitions → inline runtime (`toInline(doc)`, run in `LGraph.configure` before nodes are created)

1. Collect the definitions:
   - the root `definitions.subgraphs`, plus nested ones;
   - an id defined twice: the first one wins, and a warning is logged.
2. Detect cycles: a definition reachable from itself through instance nodes or function `subgraph_id`s is a cycle.
   - The nodes that close the cycle become error nodes (`has_errors`, `last_serialization` kept).
   - `configured.detail.error` is set.
3. For each node whose `type` is a definition id:
   - it becomes `{...node, type: "graph/subgraph", properties: {..., subgraph_id: id}, subgraph: materialize(D)}`;
   - its outer `inputs` / `outputs` keep their order and their links;
   - instance input *i* is interface input *i*.
4. **`materialize(D)`** is the inverse of §4.1:
   - it creates the IO nodes with `properties {name, type, value, slot_id}`, laid out from `extra.litegraph.io`, else stacked inside `inputNode.bounding` / `outputNode.bounding`;
   - it rewrites `-10` / `-20` links to the IO node ids (§3.2);
   - it recurses for nested instances.
5. **Old documents:**
   - An inline `subgraph` with no `subgraph_id` gets a new id at load and is registered as a private definition; it is written as a definition on the next save in definitions format.
   - Old `graph/function` nodes with `func_subgraph_id = <host node id>` migrate to the host's `subgraph_id`.
6. The root registry `rootGraph.subgraphs` holds every definition, including unused ones. Nested graphs reach it through `graph.rootGraph`, a new getter that walks `_subgraph_node.graph`.

### 4.3 Editing linked instances

- **Opening** an instance (`openSubgraph`) edits that instance's runtime graph, as today.
- **Commit** happens when you leave (`closeSubgraph`), on `subgraphNode.commitDefinition()`, or after a convert / interface-edit command:
  1. `D' = toDefinition(runtime graph)`.
  2. If `D'` equals the registry entry, nothing happens.
  3. Otherwise `rootGraph.transact("editSubgraph", …)`:
     - registry ← `D'` (`revision + 1`);
     - each other linked instance runs `refreshFromDefinition()`.
  4. Undo at the root restores every instance, because the root snapshot holds them inline.
- **`refreshFromDefinition()`:**
  - The instance keeps its outer links (matched by slot id, then name, then index) and its promoted values (§4.5).
  - It runs `onStop` on its old runtime graph, then replaces the graph.
  - Resource policy: inner nodes restart, as on load. This is documented and tested.
- **`Make unique`** gives an instance a new definition id (a copy of its current definition).

### 4.4 Function calls

`graph/function` is a `Subgraph` subclass:
- **Slots:** `call` (action) + interface inputs → interface outputs + `done` (event).
- **Mode:** it does not run on graph steps.
- **On `call`:**
  1. Push the input values (the link value, or the promoted value).
  2. `runtime.runStep(1)`.
  3. Pull the outputs.
  4. `triggerSlot("done")`.
- Inner event outputs pass through, as for the subgraph node.
- **Its runtime copy** belongs to the function node and is reused across calls, so state such as counters persists within one function node (W3-2).
- **Picking a definition:** a combo lists the registry by `name`. Picking one relinks (§4.3 rules), and the slots refresh by slot id.
- **Recursion:**
  - It is refused when picking.
  - At load it is refused by §4.2.2.
  - At run time a depth guard applies (`LiteGraph.subgraph_max_depth`, default 32), with a named error.

### 4.5 Promoted widgets (link-based, as in SA)

- **What is promoted:** an interface input linked to an inner widget input (`input.widget = {name}`). The instance shows a widget of the same kind, named after the interface input, with the inner widget's options.
- **Who owns the value:** the instance owns it (`widgets_values`).
- **How the value flows:** while the outer input is unlinked, `Subgraph.onExecute` pushes the widget value as the input value. Otherwise the link wins and the widget is disabled (the existing `isWidgetLinked` behaviour).
- **The command** `Promote widget` (inner widget context menu):
  1. adds a `graph/input` of the widget's type;
  2. links it to the widget's input (converting the widget to a widget input when needed);
  3. commits.
  - `Unpromote` reverses it.
- ComfyUI's `widgets` list is kept verbatim. It is not used at runtime; SA does not use it either.

### 4.6 Path ids and resolver

- `node.getPath()` joins the ids from the root: `"3:7:2"`.
- `rootGraph.resolvePath("3:7:2")` returns the node or `null`.
- Paths show up in:
  - the runner's error and progress messages;
  - the inspector;
  - `link-drag-*` / `changed` event details, when the graph is nested.

## 5. Canvas and authoring

- **Opening a subgraph:**
  - an "open" title button on subgraph and function nodes (Wave 2b title buttons);
  - double click still opens it;
  - a clickable breadcrumb (root › Blur › Sharpen), drawn where the path title is now.
- **Interface editing** inside a subgraph:
  - Dropping a link on empty space offers "Add subgraph input/output" (a quick-connect release action). It creates the IO node and the link.
  - Rename, retype and reorder through the IO node's properties and the context menu ("Move up/down").
  - All of these are matched by slot id, so outer links survive.
- **Insert subgraph** submenu:
  - It lists the registry: insert linked, or insert a copy.
  - From a file, it always inserts a copy.
- **Commands:**
  - `litegraph.subgraph.open`, `.close`
  - `.convert` (exists), `.unpack` (exists)
  - `.makeUnique`
  - `.promoteWidget`, `.unpromoteWidget`
  - `.removeUnusedDefinitions`
  - `.insert`

## 6. Settings and flags

| Name | Default | Purpose |
|---|---|---|
| `LiteGraph.subgraph_format` | `"inline"` during 3a; `"definitions"` once step 5's checks pass | Writer format. `"inline"` keeps documents readable by older builds |
| `LiteGraph.subgraph_max_depth` | 32 | Nesting and recursion guard for configure and calls |
| setting `LiteGraph.Subgraph.PasteLinked` | true (W3-1) | Paste and duplicate inside a document share the definition. Off: they copy |

## 7. Files

| File | Change |
|---|---|
| `src/subgraphdefs.js` (new) | `toDefinitions`, `toInline`, `materialize`, `toDefinition(graph)`, `canonical`, `findCycles`, `usedDefinitionIds`, `newSlotId`. Pure functions, no DOM |
| `src/subgraph.js` | Changes: <ul><li>`Subgraph`: `subgraph_id`, `commitDefinition`, `refreshFromDefinition`, `makeUnique`, promoted widget feeding, open title button.</li><li>`GraphInput` / `GraphOutput`: `slot_id`.</li><li>`NodeFunction` rewritten as a `Subgraph` subclass.</li></ul> |
| `src/lgraph.js` | Changes: <ul><li>`subgraphs` registry.</li><li>`rootGraph` getter.</li><li>`configure` calls `toInline`; `serialize` (root only) calls `toDefinitions` per `subgraph_format`.</li><li>`resolvePath`.</li></ul> |
| `src/lgraphnode.js` | `getPath()`; `hard_coded_value` / `hard_coded_output` removed once the function node no longer uses them |
| `src/lgraphcanvas.js` | Breadcrumb hit test; `closeSubgraph` commits; insert submenu; widget menu entries |
| `src/clipboard` (inside `lgraphcanvas.js`) | Copied fragments carry the definitions they use. Pasting into another document copies them (W3-1) |
| `src/extensions/comfy_interop.js` | Placeholders and mode mapping inside definitions; the link form inside definitions follows the export version |
| `headless/graphrunner/nodePolicy.js` | Checks **every** `definitions.subgraphs[*].nodes` (used or not), plus function `subgraph_id` targets; the depth counts definition nesting |
| `src/litegraph.d.cts`, `build.py` | New exports and module order (`subgraphdefs.js` before `subgraph.js`) |
| `docs/guide.md`, `CHANGES.md`, codebase map, ADR 0001 | Updated with each part; ADR 0001 is accepted at the end of 3a |

## 8. Security (runner)

- **The gap:** a definitions document places nodes outside `node.subgraph`, so today's recursive check misses them.
- **The fix**, in 3a step 2, before the format can be written by default:
  - `nodePolicy` visits every definition;
  - an integration test pushes a document whose only denied node sits inside an unused definition, and the runner must refuse it;
  - a second test puts the denied node behind a function node.
- Origin/Host checks and the script lockdown are unchanged.

## 9. Steps

### 3a: format, registry, linked instances, function node, runner

| # | Step | Acceptance check |
|---|---|---|
| 1 | `subgraphdefs.js` transforms (§4.1, §4.2), slot ids on IO nodes, boundary ids (§3.2) | Jest `subgraph-definitions.test.js`: <ul><li>inline → definitions → inline gives an equal runtime;</li><li>the SA `testSubgraphs.json` definitions load;</li><li>event ports round-trip;</li><li>nested definitions are flattened;</li><li>cycles become error nodes</li></ul> |
| 2 | Registry and `rootGraph`; `configure` / `serialize` hooks; `subgraph_format`; runner policy over definitions | <ul><li>All existing subgraph, execution and async tests pass in both formats (parameterized).</li><li>Integration: denied node in an unused definition → refused; behind a function node → refused</li></ul> |
| 3 | Linked editing: `commitDefinition` on close, `refreshFromDefinition`, `makeUnique`, paste and duplicate per W3-1, fork on save | Jest: <ul><li>edit one of two linked instances, close: both run the new graph; outer links kept; one root undo restores both;</li><li>`makeUnique` diverges;</li><li>paste in the same document is linked; paste into a new graph is copied</li></ul> |
| 4 | Function node rewrite; old `func_subgraph_id` migration; depth guard | Jest: <ul><li>one definition used by a subgraph node and two function nodes;</li><li>`call` → outputs then `done`;</li><li>inner events pass out;</li><li>self-call refused;</li><li>an old document migrates.</li></ul>Browser check in `editor_build.html` |
| 5 | Interop: definitions mapped directly; schema probe; then the default flips to `"definitions"` and ADR 0001 is accepted | <ul><li>`experiments/comfy-interop` probe: our exports, with subgraphs, validate against ComfyUI's schema.</li><li>A ComfyUI subgraph fixture loads, edits, saves and validates.</li><li>`npm run check` passes.</li><li>ADR acceptance criteria 1–5 are checked off in the execution record</li></ul> |

### 3b: authoring

| # | Step | Acceptance check |
|---|---|---|
| 6 | Title button "open", clickable breadcrumb, `subgraph.*` commands | Jest (pointer-gesture harness); browser |
| 7 | Interface editing: add from a link release, rename, retype, reorder; matched by slot id | Jest: outer links survive rename and reorder, also on the other linked instances |
| 8 | Promoted widgets (§4.5) and the promote/unpromote commands | Jest adapted from SA `SubgraphWidgetPromotion`; browser |
| 9 | Path ids and resolver; runner messages and the inspector use them | Jest; integration: a runner error names the path |

### 3c: components

| # | Step | Acceptance check |
|---|---|---|
| 10 | `LiteGraph.registerSubgraphType(type, definition, {revision})`: the definition behaves as a node type (search, palette, `getNodeDefinition`); an instance stores a copy plus `source` | Jest: <ul><li>register, create, save, load without the registration (the copy still works);</li><li>load with a newer revision: an "update available" badge (Wave 2 badge registry) and `subgraph.updateFromSource`</li></ul> |
| 11 | Insert from a file or the registry as a copy (blueprints); remove unused definitions | Jest; browser |
| 12 | SA acceptance port (§10) | the ported suites pass |

## 10. SA tests to adapt (224 tests in 14 files)

| SA file | Tests | Port | Our target |
|---|---|---|---|
| `subgraphSerialization`, `SubgraphSerialization` | 6 + 14 | **yes** | format round trips, version compatibility, data integrity (step 1, 5) |
| `Subgraph` | 22 | **yes**, the IO management and root-relationship parts | registry, interface add / rename / remove (2, 7) |
| `SubgraphNode` | 32 | **yes**, synchronization, lifecycle, execution | linked instances, refresh, cleanup (3) |
| `SubgraphIO` | 16 | **yes**, boundary connection management | IO nodes and slot ids (7) |
| `SubgraphEdgeCases` | 21 | **yes** | recursion, invalid states, depth (1, 4) |
| `SubgraphWidgetPromotion` | 12 | **yes** | §4.5 (8) |
| `SubgraphNode.titleButton` | 8 | **yes** | open button (6) |
| `subgraphUtils` | 8 | **yes**, `getDirectSubgraphIds` / `findUsedSubgraphIds` | `usedDefinitionIds`, cycles (1) |
| `SubgraphEvents` | 21 | partly: the payload and cancel patterns | our `subgraph-*` graph events |
| `SubgraphSlotConnections` | 15 | partly: drag onto the IO nodes, nested | (7) |
| `ExecutableNodeDTO` | 26 | only the path-id cases | §4.6 (9) |
| `SubgraphMemory` | 18 | partly: listener cleanup on refresh and remove | (3) |
| `SubgraphSlotVisualFeedback` | 5 | no: it covers the skipped IO-node classes | n/a |

Every ported file names its source (`Comfy-Org/litegraph.js` @ `ea0e1a8`, MIT, path) in its header.

## 11. Later (ideas, not in this wave)

These go into the [idea catalog](../ideas/catalog.md) when the plan is accepted:
- **Higher-order nodes:** `graph/map` calls a definition per array item, and a definition reference is a value (`type: "subgraph"`).
- **Live sync while editing** (each change, not on leave).
- **ComfyUI-style IO rails** as an alternative view of the IO nodes.
- **Reroutes across subgraph boundaries:** the Wave 2 carry-over.

## 12. Decisions

| ID | Question | Recommendation |
|---|---|---|
| W3-1 | Paste or duplicate a subgraph node inside one document: linked or a copy? | **Linked** (ComfyUI does this; it is what reuse means). Content from outside the document is always copied. `Make unique` forks. Setting `LiteGraph.Subgraph.PasteLinked` |
| W3-2 | Runtime of linked uses | **One isolated copy per use** (subgraph node or function node); state persists per use |
| W3-3 | Boundary on the canvas | **Keep `graph/input` / `graph/output` nodes**, with slot ids. They support event ports, defaults and free placement. IO rails are a later view |
| W3-4 | `NodeFunction` | **Rebuild as a `Subgraph` subclass** (`call` / `done`), keeping the type `graph/function` and migrating old documents |
| W3-5 | When linked edits propagate | **On leaving the subgraph or on commit**, as one root undo step. Live sync is a later idea |
| W3-6 | Components (3c) in this wave? | **Yes, after 3a/3b**: a definition registered as a node type covers ComfyUI blueprints and goes further |

## 13. Risks and open questions

- **Refresh restarts inner nodes.** Timers, sockets and HTML widgets in other linked instances restart when a definition changes. This is documented, tested, and the same as on load.
- **Nested undo:** each inner graph has its own history. A commit is a root step; undo inside an open subgraph stays local until you leave it. Covered by step 3 tests.
- **UUID mode:** ComfyUI export needs numeric node and link ids inside definitions too. The export refuses with the existing named error.
- **Old readers:** documents with definitions show unknown node types in older builds. Use `subgraph_format: "inline"` to keep them readable.
- **Canonical comparison cost:** canonical JSON of each definition at save. The cost is linear in document size. Measure it on a 1,000-node fixture in step 1.
- **Graph-level `inputs` / `outputs` by name:** the interface still keys runtime values by name, so two IO nodes cannot share a name inside one definition. This is enforced already by `unique()` in convert, and to be added for rename.

## History

- 2026-11-20: proposed after ADR 0001 option B was chosen. The user asked for a lean litegraph-native system built on the function-node idea, open to going beyond ComfyUI, and planned thoroughly before code.
