# ComfyUI LiteGraph core: feature harvest

> **Date** 2026-11-19 · **Kind** research · **Status** final

Source reading only, nothing executed. Feeds the [feature harvest plan](../../../plans/2026-11-19-feature-harvest-and-priorities.md) and the [roadmap](../../../plans/roadmap.md).

**Snapshots:**
- **SA** = the archived MIT standalone [Comfy-Org/litegraph.js](https://github.com/Comfy-Org/litegraph.js) @ `ea0e1a8` (0.17.2, 2025-08-05). It may be adapted module by module, with attribution.
- **FE** = [Comfy-Org/ComfyUI_frontend](https://github.com/Comfy-Org/ComfyUI_frontend) @ `4f26f4d` (2026-11-19). It is a design reference only: the root is GPL-3.0, and the provenance of post-merge changes in `src/lib/litegraph` is ambiguous (see the [relationship study](2026-11-18-comfyui-litegraph-relationship.md) §2).

**Columns and labels:**
- **MIT** says whether the feature already existed in SA.
- **Value** is the value for a general-purpose library.
- [I] marks an inference.

**Already in this fork when the harvest was made:**
- `canvaspointer.js` (state only)
- `linkconnector.js` (new, move and cancel)
- `reroute.js` (model only)
- typed events
- `LGraph.state` counters, graph id and revision
- transactions
- high-DPI support
- `extensions/comfy_interop.js`

**Missing from the fork at that time:** widget classes, badges, title buttons, link markers, group children tracking, floating links, minimap, and BYPASS.

## 1. Subgraphs

| Feature | Where | How it works | MIT | Value |
|---|---|---|---|---|
| `Subgraph extends LGraph` | SA `subgraph/Subgraph.ts` | A definition is a graph that holds a `rootGraph`, an `inputNode`/`outputNode`, and add/rename/remove methods for inputs and outputs. The root holds `_subgraphs: Map<UUID, Subgraph>`. | yes | high (matches [ADR 0001](../../decisions/0001-subgraph-document-format.md) option B) |
| Serialization | SA `LGraph.ts:1600-1690` | `definitions.subgraphs` lists only the definitions in use. An instance node's `type` is the definition UUID. | yes | high |
| IO nodes | SA `SubgraphInputNode.ts`, `SubgraphOutputNode.ts`, `EmptySubgraphInput.ts` | Virtual boundary bars. Links attach to the reserved ids `-10` and `-20`. Dropping a link on the empty slot creates a new IO slot. | yes | high |
| IO slot identity | SA `SubgraphSlotBase.ts`; FE `SubgraphNode._rebindInputSubgraphSlots` | SA binds host inputs to definition slots **by name**. FE binds by object reference, then by name+type signature, then by name, which survives renames. | partial | high (re-implement the FE rule) |
| `convertToSubgraph(items)` | SA `LGraph.ts:1400`, `subgraphUtils.ts` (`getBoundaryLinks`, `mapSubgraphInputsAndLinks`, …) | Classifies boundary links (including through reroutes), clones the items into a definition, creates one IO slot per outer source, and rewires the outside. | yes | high |
| Unpack | FE `subgraph/unpackSubgraph.ts`, `LGraph.unpackSubgraph` | Re-materialises the inner nodes with fresh ids. Targets that cannot be resolved are handled explicitly. | **no** | high (re-implement) |
| Promoted widgets | SA `SubgraphNode.#setWidget` (copy model); FE `widgetValueStore`, `proxyWidgets` | The instance gets a copy of the inner widget. FE adds per-instance value ownership. | partial | high |
| Navigation | SA `openSubgraph` (cancellable events); FE breadcrumbs and per-graph viewport (app code) | | partial | med |
| Execution flattening | SA `subgraph/ExecutableNodeDTO.ts` | Path ids `"1:2:3"`; inputs are resolved through boundaries and bypass, with a recursion guard. | yes | med (inspector, runner allowlist) |
| Tests | SA `test/subgraph/*`: 14 files with fixture builders | | yes | high, as acceptance cases |

## 2. Widgets

| Feature | Where | How it works | MIT | Value |
|---|---|---|---|---|
| Class hierarchy | SA `widgets/BaseWidget.ts`, `BaseSteppedWidget`, Boolean, Button, Combo, Knob, Number, Slider and Text widgets; `LegacyWidget`; `widgetMap.toConcreteWidget` | `addWidget` returns a class instance. Old `{draw, mouse}` objects keep working through `LegacyWidget`. | yes | **high**: replaces the two `switch(w.type)` blocks in `lgraphcanvas.js` |
| Layout | SA `LGraphNode.#arrangeWidgets`, `utils/spaceDistribution.ts` | `computeLayoutSize()` returns min/max heights, and the leftover height is distributed between widgets. | yes | high |
| Hit testing | SA `LGraphNode.getWidgetOnPos` + `CanvasPointer` callbacks | | yes | high |
| Widget-input sockets | SA `isWidgetInputSlot`, `getSlotFromWidget`, `#arrangeWidgetInputSlots` | An input with `widget: {name}` is drawn on its widget's row. When it is linked, the widget is disabled and the link value wins. Dragging a link over the widget highlights the input. | yes | high |
| DOM widgets | FE `scripts/domWidget.ts` (`hideOnZoom`, placeholder at low quality) | | no | med (our `html.js` overlay covers the base) |
| Values | SA positional `widgets_values`; FE name-based recovery | | partial | med |
| Math in number entry | FE `utils/mathParser.ts` | | no | low–med |

## 3. Linking and reroutes

| Feature | Where | MIT | Value |
|---|---|---|---|
| Full `LinkConnector` | SA `canvas/LinkConnector.ts` (860 lines): start a drag from an output/input/reroute/link segment; move input links; shift-drag moves all links of an output; `dropLinks` → `dropOnNode`/`dropOnReroute`/`dropOnIoNode`/`dropOnNothing`; typed events | yes | high |
| RenderLink classes | SA `ToInputRenderLink`, `ToOutputRenderLink`, `MovingInputLink`, `MovingOutputLink`, `FloatingRenderLink`, … | yes | high |
| Reroutes | SA `Reroute.ts` (778 lines): parent chains, `linkIds`/`floatingLinkIds`, `findSourceOutput`, spline control points, slot hover | yes | high |
| Floating links | SA `LGraph.floatingLinks`, `connectFloatingReroute` | yes | med |
| Snap and highlight while dragging | SA `LGraphCanvas.ts:2890-2955`: snaps to the hovered slot, then the widget row, then the first compatible input | yes | high |
| Connect to a compatible slot | SA `findConnectByTypeSlot`, `connectByType`, `canConnectTo` | yes | med |
| Link markers and render modes | SA `LinkMarkerShape`, `LinkRenderType`; `measure.findPointOnCurve` | yes | med |
| Hidden/labelled links, marquee link selection | FE `canvas/linkVisibility.ts`, `linkBadges.ts`, `linkSelection.ts` | no | med |
| Link dedup and repair | FE `linkDeduplication.ts`, `remintLinkRemap.ts` | no | med (our `validateLinks` covers the basics) |

## 4. Rendering

| Feature | Where | MIT | Value |
|---|---|---|---|
| Low-quality threshold from font size | FE `LGraphCanvas.ts:815-940` (DPR-aware, cached) | no | high, cheap |
| Geometry helpers | SA `infrastructure/Rectangle.ts`, `measure.ts`, `draw.ts` | yes | high |
| Viewport animation | SA `DragAndScale.fitToBounds` / `animateToBounds` | yes | med |
| Badges, title buttons, icons, split title drawing | SA `LGraphBadge.ts`, `LGraphButton.ts`, `LGraphIcon.ts`, `drawTitleBox`/`drawTitleText` | yes | high |
| Snap guide | SA `drawSnapGuide` | yes | med |
| Minimap | FE `renderer/extensions/minimap` (app code) | no | med |
| Vue nodes, Yjs layout store | FE | no | ignore (app architecture) |

## 5. Groups, layout, selection

| Feature | Where | MIT | Value |
|---|---|---|---|
| Group children | SA `LGraphGroup.recomputeInsideNodes`: a node belongs when its centre is inside; groups belong when fully inside; parents are drawn first | yes | high |
| Auto-fit | SA `resizeTo(objects, padding)`, `addNodes` | yes | high |
| Align and distribute | SA `utils/arrange.ts` | yes | med |
| Snap to grid | SA `Positionable.snapToGrid`, `LiteGraph.alwaysSnapToGrid` | yes | med |
| One selection model | SA `interfaces.ts` `Positionable`, `canvas.selectedItems: Set`, `processSelect` | yes | **high** (enabler) |
| Pointer gesture pattern | SA `CanvasPointer.ts`: per-gesture callbacks are assigned at pointerdown. FE adds the `reduceGesture.ts` state machine, pointer capture and trackpad detection. | yes (FE extras no) | high |
| Clipboard | SA `copyToClipboard` / `_pasteFromClipboard`, including links, reroutes and subgraphs; Ctrl+Shift+V reconnects inputs | yes | high |
| Delete keeps links | SA `connectInputToOutput` | yes | med |

## 6. Node types and registry

| Feature | Where | MIT | Value |
|---|---|---|---|
| Registration hooks | SA `onNodeTypeRegistered`, `onNodeTypeReplaced` | yes | med (both now present in this fork) |
| Definition metadata | FE `static nodeData {deprecated, experimental, dev_only, …}` | no | med (done: `static def`, `LiteGraph.getNodeDefinition`) |
| Slot classes | SA `node/NodeSlot.ts`, `NodeInputSlot`, `NodeOutputSlot` | yes | med–high |
| BYPASS mode | SA `LGraphEventMode.BYPASS = 4` | yes | **collides** with our mode 4 (ON_REQUEST); interop mapping only |

## 7. Infrastructure

| Feature | Where | MIT | Value |
|---|---|---|---|
| Typed, cancellable events | SA `CustomEventTarget.ts`; FE adds node lifecycle names (`node:added`, `node:property:changed`, …) | yes | done here; add the FE event names |
| Undo | FE `scripts/changeTracker.ts`: snapshot queue and order-insensitive `graphEqual` | no | med (borrow the "modified" comparison only) |
| Schema versioning | SA `types/serialisation.ts` (0.4 and v1) | yes | done (interop) |
| `pos`/`size` write guard | FE `externalWriteGuards.ts` | no | low–med |
| `warnDeprecated` | SA `utils/feedback.ts` | yes | med, cheap |
| Tests | SA: 37 vitest files. FE: 158 vitest files and 251 Playwright spec dirs | yes | port the cases, not the harness |

## Top 15 for a general-purpose fork

1. Widget class hierarchy, including `LegacyWidget` (SA, MIT).
2. Widget-input sockets (SA, MIT).
3. One `Positionable` selection model (SA, MIT).
4. `CanvasPointer` callback-assignment pattern (SA, MIT).
5. Full `LinkConnector` with RenderLink classes (SA, MIT).
6. Subgraph definitions, IO nodes and `convertToSubgraph` (SA, MIT).
7. Unpack subgraph (FE: re-implement).
8. Host-slot rebinding by id, then signature, then name (FE: re-implement).
9. Clipboard with links, reroutes and subgraphs, plus Ctrl+Shift+V (SA, MIT).
10. Group children, nesting and auto-fit (SA, MIT).
11. Floating links and reroute slots (SA, MIT).
12. Snap and highlight to a compatible slot (SA, MIT).
13. Badges, title buttons and icons (SA, MIT).
14. Low-quality threshold from font size (FE: re-implement).
15. Geometry utilities, animated fit, `distributeSpace`, `arrange` (SA, MIT).

**Ignore:** Vue nodes, the Yjs layout store, ECS id reminting, snapshot undo, Vue-only widget stubs, and BYPASS as mode 4.

**Porting route [I].** Adapt module by module into ES6 classes with attribution, as was done for `reroute.js` and `linkconnector.js`. The leaf modules are almost directly portable: widgets, `Rectangle`, `measure`, `arrange`, `spaceDistribution`, badges and `CanvasPointer`. The subgraph code and `LinkConnector` depend on the slot classes and the `Positionable` model, so port those first.
