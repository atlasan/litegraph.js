# Wave 3b: subgraph authoring

> **Date** 2026-11-20 · **Kind** execution · **Status** final · **Base** `LG/wave3b_authoring` @ `0183351` · **Plan** [Wave 3: subgraph system](../plans/2026-11-20-wave3-subgraph-system.md)

Part 3b of Wave 3 delivered plan steps 6–9 on `LG/wave3b_authoring`, cut from `LG/dev` @ `f073f79`:
- 6: navigation and commands;
- 7: interface editing by slot id;
- 8: promoted widgets;
- 9: path ids.

The browser check found two bugs, both fixed: the subgraph path never showed, and a promoted Input node showed the wrong value. An existing `node-error` bug was also fixed.

## Changes

- `e9c033d` `feat:` breadcrumb, commands, interface editing (steps 6–7):
  - **Breadcrumb:** the path of open subgraphs at the top of the canvas. A click on an outer level calls `closeSubgraphTo(level)`, which commits each subgraph it leaves. The existing ▼ title button already opens subgraph and function nodes.
  - **Commands:** the `subgraph_tools` extension adds `litegraph.subgraph.open`, `close`, `closeAll`, `convert`, `unpack`, `makeUnique` and `removeUnusedDefinitions`, plus the helpers `unusedDefinitionIds` and `removeUnusedDefinitions`.
  - **Exposing slots:** inside a subgraph, the link release menu offers "Add subgraph input/output" (`Subgraph.exposeSlot`).
  - **Reordering:** "Move up/down in the interface" on `graph/input` / `graph/output` (`moveInterfaceSlot`). Outer links follow, and linked instances follow by slot id.
  - **Unique names:** an interface name that is already used is refused, and the name widget is reset.
- `e04866d` `feat:` promoted widgets and path ids (steps 8–9):
  - **Promotion:** an interface input linked to an inner widget input shows that widget on the subgraph or function node. The value belongs to the instance (`widgets_values`) and is written into the inner widget and its property, so it also reaches nodes that read their property. A link into the input wins over the widget.
  - **Defaults:** instance serialization restores the inner widget's default, so the definition never takes an instance's value.
  - **API and menu:** `promoteWidget`, `unpromoteWidget` and `isWidgetPromoted`; "Promote/Unpromote widget" in the node menu inside a subgraph.
  - **ComfyUI values:** ComfyUI instances apply their stored `widgets_values`. When nothing is promoted, the values are kept verbatim.
  - **Commit on leave:** the canvas now commits on leave only after an edit (the inner revision moved), so values written while running or by promotion are not committed.
  - **Path ids:** `LGraphNode.getPath()` (for example `"3:7:2"`) and `LGraph.resolvePath(path)`.
  - **Errors:** `node-error` reports the innermost failing node and its path, also on outer graphs. Before this, `node` was always `false`: `nodes_executing` is a map by id, not a list. `doExecute` now attaches the failing node to the error.
  - **Display:** the node panel shows the path inside subgraphs, and the runner logs `Node error at <path> (<type>)`.
- `407e051` `fix:` (found in the browser):
  - The subgraph path, and the old title before it, was painted under the background fill and never showed. It is now drawn on the front canvas.
  - A `graph/input`'s Value widget now follows its `value` property.
- Each `feat:` / `fix:` commit has a `build:` commit after it.

## Verification

| Check | Result |
|---|---|
| `npm run check` | lint clean, 12 builds, strict types, **438/438 Jest** (up from 423), 94/94 integration, package check |
| New tests | <ul><li>`subgraph-editing` (8): breadcrumb layout and click (commits), all commands, `exposeSlot` reaching a linked instance, unique names, reorder with links and propagation, refused duplicate names, the link release menu entry, path ids and the resolver, a nested error reported with its path</li><li>`subgraph-promotion` (7): promote, per-instance values with the definition default, a link wins, unpromote, ComfyUI `widgets_values`, function node value offset, the menu entries</li><li>`subgraph-linked` (+1): leaving without an edit commits nothing</li></ul> |
| ComfyUI probes, rerun after promotion | schema 79/79; content 0 of 41 fixtures with a difference. Promotion briefly lost the stored values of instances without promotions; the probe caught it and it was fixed before the commit |
| Browser `editor_build.html` (real clicks) | <ul><li>Const 2 → Watch, converted to "Two".</li><li>A double-click opens it; the breadcrumb "Root › Two" shows (after the fix).</li><li>Right-click Const, then "Promote widget "value"": an Input node feeds the widget, now disabled, and the interface lists `value`.</li><li>A click on "Root" goes back.</li><li>"Two" shows the promoted `value` widget (2). A click on its arrow gives 3, Step, and Watch shows 3.</li><li>The save has instance `widgets_values: [3]` and the definition default 2</li></ul> |

## Left open

- **3c (components and blueprints) and the SA test port** (plan steps 10–12).
- The ComfyUI `widgets` list (ExposedWidget) is kept verbatim but not used; promotion is link-based, as in SA.
- **Promoted widgets on ComfyUI placeholder nodes:** placeholders have no widgets, so such instances keep their values as data only.
