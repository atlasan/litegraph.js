# Callback handlers

Every classic `onX` callback can also be handled by **several registered handlers**, ordered by priority. The plain property (`node.onExecute = …`) keeps working, and acts as the *default* handler. Source: `src/callbackhandler.js`.

For new code, prefer **typed events** where one exists, for example `graph.events.on("node-added", fn)`; the list is at the end of this page. Use a hook when you need to intercept: veto, override a result, or draw.

Hooks and typed events run on one listener core, `ListenerList` in `src/eventtarget.js` (Wave 7, [plan](../agents/plans/2026-11-22-event-integration.md), [audit](../agents/audits/2026-11-22-event-handling.md)).

**Behaviour of the hook chain:**
- **No handler registered:** dispatching only calls the `onX` property, so the cost is close to a direct call.
- **Errors:** a handler that throws does not stop the chain. The remaining handlers and the default still run, then the first error is rethrown to the caller; later errors are logged.
- **Registering inside a handler:** the new handler runs from the next dispatch.
- **Synchronous only:** a Promise returned by a handler is not awaited, and its `prevent_default` is ignored.

## API

The object you register on is `LiteGraph`, a graph, a node, a canvas or a group:

```js
const id = node.registerCallbackHandler("onExecute", function (info, ...args) {
    // `this` is the node; info = {name, id, current_return_value, data, results_chain}
    return { return_value: 42, result_priority: 1 };
}, { priority: 1 });

node.unregisterCallbackHandler("onExecute", id);

// or keep a disposer
const off = node.onHook("onExecute", (info, param) => { /* … */ }, { once: true });
off();
```

`hasCallbackHandlers(name)` tells whether any handler is registered.

| Option | Default | Meaning |
|---|---|---|
| `priority` | `0` | Higher runs first. The default callback runs after the handlers with priority ≥ 0 and before the negative ones |
| `is_default` | `false` | The handler is skipped when another handler prevents the default |
| `call_once` / `once` | `false` | Unregister after the first call |
| `signal` | | An `AbortSignal`; aborting unregisters the handler |

A handler may return a plain value, or an object with these fields:

| Field | Effect |
|---|---|
| `return_value` | Proposed result |
| `result_priority` | The result replaces the current one only if this is at least the current result's priority. Plain values count as `0` |
| `prevent_default` | Skip the default callback and the `is_default` handlers |
| `stop_replication` | Stop calling the remaining handlers |

To read a result the way the library does:

| Helper | True for |
|---|---|
| `CallbackHandler.is(r, value)` | `value`, or `{return_value: value}`. Vetoes use `is(r, false)`; `onKeyDown`, the drawing hooks and `onSearchBoxSelection` use `is(r, true)` |
| `CallbackHandler.handled(r)` | `true`, or an object with a truthy `return_value`: the legacy rule of `onMouseDown`, `onDblClick` and `onDropItem` on nodes |
| `CallbackHandler.valueOf(r)` | Returns the `return_value` of an object result, otherwise the result itself. Used for the slot redirect of `onBeforeConnectInput` |
| `CallbackHandler.handledAt(name, r, legacy)` | The "handled" sites whose own rule also accepts other truthy results; see [the "handled" rule](#the-handled-rule-and-litegraphhooksstricthandled) |
| `CallbackHandler.objectOf(r, fallback, arrays)` | Returns the `return_value` of an object result when it is an object (`null` included), with `arrays` also a plain array result; otherwise `fallback`. Used by the menu and slot-list hooks: `getMenuOptions`, `getExtraMenuOptions`, `getSlotMenuOptions`, `onMenuNodeInputs`, `onMenuNodeOutputs`, and (with `arrays`) `onGetInputs`, `onGetOutputs` and the node's `getExtraMenuOptions` |

What each site makes of `true`, `1`, `{return_value: true}`, `{return_value: 1}`, `false` and list results is recorded in `test/__snapshots__/hook-results.test.js.snap`, in both modes of the setting below. For example, a node's `onMouseDown` counts `{return_value: 1}` as handled and `onKeyDown` does not; a node's `getMenuOptions` uses only `{return_value: [...]}`, not a plain array.

## The "handled" rule and `LiteGraph.Hooks.StrictHandled`

**To mark a hook as handled, return `true` or `{return_value: true}`.** Every site accepts these.

Eight sites have an older, looser rule ([decision 0007](../agents/memories/decisions/0007-hook-handled-rule.md)):

| Site | Also counts as handled |
|---|---|
| node `onMouseDown`, `onDblClick`, `onDropItem`; canvas `onDropItem` on a node | an object with a truthy `return_value`, e.g. `{return_value: 1}` |
| canvas `onDropItem` on the background, node `onDropFile`, canvas `onShowNodePanel` | any truthy value, plain or as `return_value` |
| node `onAddPropertyToPanel` | any truthy value; an object counts by its `return_value` when it has one |

The setting `LiteGraph.Hooks.StrictHandled` (in `LiteGraph.settings`, `false` by default) chooses between the two:
- **Off:** each site keeps its rule. When a result other than `true` / `{return_value: true}` decided the outcome, the library logs one warning per hook name, naming the setting.
- **On:** only `true` and `{return_value: true}` count, everywhere.

```js
LiteGraph.settings.set("LiteGraph.Hooks.StrictHandled", true);
```

The other sites already use the strict rule (`onKeyDown`, the drawing hooks, `onSearchBoxSelection`), or read something else: a veto (`false`), a slot redirect, a menu or slot list, property info. The setting does not change them. A later release may turn it on by default, with a note in `CHANGES.md`; nothing is removed.

## Deprecated names

They keep working, with no removal date ([decision 0008](../agents/memories/decisions/0008-legacy-compatibility-scope.md)). The first use of each in a process logs one `deprecated` warning.

| Name | Instead |
|---|---|
| `host.cb_handler` (read or assigned) | `registerCallbackHandler`, `onHook`, `unregisterCallbackHandler`, `hasCallbackHandlers` on the host; `LiteGraph.setDispatchTap` to trace dispatches |
| `handler.callbacks_handlers` | the same host methods |
| `host.callbackhandler_setup()` | nothing: the registry is created when a handler is first registered |

`CallbackHandler` itself is not deprecated: it holds the result helpers above.

## Hooks and typed events at the same point

Where a point has both a hook and a typed event, they fire in one order: the handlers with priority ≥ 0, the legacy `onX`, the handlers with negative priority, and then the typed event. When the hook can veto and does (a `false` result, plain or as `{return_value: false}`), the event does not fire.

| Hook | Event | Veto |
|---|---|---|
| `onPropertyChanged` (`setProperty`, the property dialog) | `node-property-changed` | `false` reverts the value; no event, and the dialog records no history entry |
| `onConnectOutput`, `onConnectInput` | `link-connected` | `false` refuses the link; no event |
| `onSelectionChange` | `selection-changed` | none |
| `onNodeTypeRegistered`, `onNodeTypeReplaced` | `node-type-registered`, `node-type-replaced` | none |
| `on_lgraph_construct`, `on_lgraphcanvas_construct` | `graph-created`, `canvas-created` | none |
| `onNodeAdded`, `onNodeRemoved` | `node-added`, `node-removed` | none; the event follows the history record (`changed`, `graph-changed`) |
| `onConfigure` | `configured` | none |
| `onWidgetChanged` | `widget-changed` | none; the event follows the bound property and the history record |
| `onOpenSubgraph`, `onCloseSubgraph` | `subgraph-opened`, `subgraph-closed` | none; the event follows the canvas switch |
| `onExecuteStep` | `execution-step` | none |

The order is pinned by `test/hook-order.test.js`. Library code fires an adjacent pair with `CallbackHandler.fireHookThenEvent(owner, name, args, emitter, type, detail, {veto})`.

## Dispatch tap

`LiteGraph.setDispatchTap(fn)` sets one process-wide observer, for tracing and profiling. After every hook dispatch and every typed event dispatch it receives `{owner, name, phase, ms, error}`:
- `phase` is `"hook"` or `"event"`, and `ms` is the duration of the whole dispatch (handlers and `onX` included);
- `error` is what the hook chain threw, or the first listener error of an event, otherwise `null`.

```js
const trace = [];
LiteGraph.setDispatchTap((r) => { if (r.name === "onExecute") trace.push([r.owner.id, r.ms]); }); // a per-node execution trace
graph.runStep(1);
LiteGraph.setDispatchTap(null);
```

Dispatches made inside the tap are not reported, and a throwing tap is only logged. With no tap set, a dispatch pays one null check. `setDispatchTap` returns the previous tap.

**Extensions** can register both kinds with `ctx.listen(target, name, fn, opts)`. A hook name (`onX`, `on_x`, `getXMenuOptions`) registers a hook handler; any other name registers a typed listener. Both are removed when the extension is disposed.

## Hooks by class

The hook names and their arguments are declared per class in `src/litegraph.d.cts` (`LiteGraphHooks`, `LGraphHooks`, `LGraphNodeHooks`, `LGraphCanvasHooks`, `LGraphGroupHooks`). In TypeScript, `registerCallbackHandler` and `onHook` infer the handler arguments from them; an unknown name still compiles. `npm run check:types` fails when a hook dispatched in `src/` is missing from the maps.

The tables below are generated from those maps by `npm run docs:callbacks` (`tools/hook-docs.mjs`); `tools/tests/hook-docs.test.mjs` fails when they are stale. The legacy `onX` receives the same arguments without `info`. `graph.sendEventToAllNodes` also dispatches `onStart`, `onStop` and other names to every node.

<!-- generated:hooks:start (npm run docs:callbacks; do not edit by hand) -->

**`LiteGraph`** (`LiteGraphHooks`)

| Group | Hook | Handler arguments, after `info` |
|---|---|---|
|  | `onNodeTypeRegistered` | `type: string, ctor: Function` |
|  | `onNodeTypeReplaced` | `type: string, ctor: Function, previous: Function` |
|  | `on_lgraph_construct` | `graph: LGraph` |
|  | `on_lgraphnode_construct` | `node: LGraphNode` |
|  | `on_lgraphcanvas_construct` | `canvas: LGraphCanvas` |

**`LGraph` (a graph)** (`LGraphHooks`)

| Group | Hook | Handler arguments, after `info` |
|---|---|---|
| Lifecycle and history | `onConfigure` | `data: serializedLGraph` |
|  | `onSerialize` | `data: serializedLGraph` |
|  | `on_change` | `graph: LGraph` |
|  | `onBeforeChange` | `graph: LGraph, info?: any` |
|  | `onAfterChange` | `graph: LGraph, info?: any` |
| Execution | `onPlayEvent` | none |
|  | `onStopEvent` | none |
|  | `onBeforeStep` | none |
|  | `onExecuteStep` | none |
|  | `onAfterStep` | none |
|  | `onAfterExecute` | none |
|  | `onTrigger` | `action: string, param: any, options?: ExecutionOptions` |
|  | `onNodeTrace` | `node: LGraphNode, message: any` |
| Nodes and links | `onNodeAdded` | `node: LGraphNode` |
|  | `onNodeRemoved` | `node: LGraphNode` |
|  | `onConnectionChange` | `node: LGraphNode` |
|  | `onNodeConnectionChange` | `type: number, node: LGraphNode, slot: number, other: LGraphNode \| null, otherSlot: number \| null` |
| Graph inputs and outputs | `onInputAdded` | `name: string, type: string` |
|  | `onInputRemoved` | `name: string` |
|  | `onInputRenamed` | `oldName: string, name: string` |
|  | `onInputTypeChanged` | `name: string, type: string` |
|  | `onOutputAdded` | `name: string, type: string` |
|  | `onOutputRemoved` | `name: string` |
|  | `onOutputRenamed` | `oldName: string, name: string` |
|  | `onOutputTypeChanged` | `name: string, type: string` |
|  | `onInputsOutputsChange` | none |
| Menus | `onGetNodeMenuOptions` | `options: ContextMenuItem[], node: LGraphNode` |

**`LGraphNode` (a node)** (`LGraphNodeHooks`)

| Group | Hook | Handler arguments, after `info` |
|---|---|---|
| Lifecycle | `onNodeCreated` | none |
|  | `onPostConstruct` | none |
|  | `onAdded` | `graph: LGraph` |
|  | `onRemoved` | `graph?: LGraph` |
|  | `onConfigure` | `data: SerializedLGraphNode` |
|  | `onSerialize` | `data: SerializedLGraphNode` |
|  | `onResize` | `size: Vector2` |
|  | `onBounding` | `area: Float32Array \| Vector4` |
|  | `onPropertyChanged` | `name: string, value: any, previous?: any` |
|  | `onGetPropertyInfo` | `name: string` |
| Execution (graph.sendEventToAllNodes dispatches onStart, onStop and other names to every node) | `onStart` | none |
|  | `onStop` | none |
|  | `onExecute` | `param?: any, options?: ExecutionOptions` |
|  | `onAction` | `action: string, param: any, options?: ExecutionOptions, slot?: number` |
|  | `onAfterExecuteNode` | `param?: any, options?: ExecutionOptions` |
|  | `onAfterActionedNode` | `param?: any, options?: ExecutionOptions` |
| Slots and links | `onInputAdded` | `input: INodeInputSlot` |
|  | `onInputRemoved` | `slot: number, input?: INodeInputSlot` |
|  | `onOutputAdded` | `output: INodeOutputSlot` |
|  | `onOutputRemoved` | `slot: number` |
|  | `onBeforeConnectInput` | `slot: number` |
|  | `onConnectInput` | `slot: number, type: string \| number, output: INodeOutputSlot, origin: LGraphNode, originSlot: number` |
|  | `onConnectOutput` | `slot: number, type: string \| number, input: INodeInputSlot, target: LGraphNode, targetSlot: number` |
|  | `onConnectionsChange` | `type: number, slot: number, connected: boolean, link: LLink \| null, slotInfo: INodeInputSlot \| INodeOutputSlot` |
|  | `onGetInputs` | none |
|  | `onGetOutputs` | none |
|  | `onNodeInputAdd` | `value: any` |
|  | `onNodeOutputAdd` | `value: any` |
| Pointer, keys and drop | `onMouseDown` | `event: MouseEvent, pos: Vector2, canvas: LGraphCanvas` |
|  | `onMouseUp` | `event: MouseEvent, pos: Vector2, canvas?: LGraphCanvas` |
|  | `onMouseMove` | `event: MouseEvent, pos: Vector2, canvas: LGraphCanvas` |
|  | `onMouseEnter` | `event: MouseEvent` |
|  | `onMouseLeave` | `event: MouseEvent` |
|  | `onDblClick` | `event: MouseEvent, pos: Vector2, canvas: LGraphCanvas` |
|  | `onDrag` | `offset: Vector2` |
|  | `onMoved` | `node?: LGraphNode, selected?: Record<string, LGraphNode>` |
|  | `onSelected` | none |
|  | `onDeselected` | none |
|  | `onInputClick` | `slot: number, event: MouseEvent` |
|  | `onInputDblClick` | `slot: number, event: MouseEvent` |
|  | `onOutputClick` | `slot: number, event: MouseEvent` |
|  | `onOutputDblClick` | `slot: number, event: MouseEvent` |
|  | `onKeyDown` | `event: KeyboardEvent` |
|  | `onKeyUp` | `event: KeyboardEvent` |
|  | `onDropItem` | `event: DragEvent` |
|  | `onDropFile` | `file: File` |
|  | `onDropData` | `data: string \| ArrayBuffer \| null, filename: string, file: File` |
|  | `onWidgetChanged` | `name: string, value: any, previous: any, widget: IWidget` |
|  | `onTitleButtonClick` | `button: any, canvas: LGraphCanvas, event: MouseEvent` |
| Node panel | `onAddPropertyToPanel` | `name: string, panel: any, value: any, info: any, update: (name: string, value: any) => void` |
|  | `onShowCustomPanelInfo` | `panel: any` |
| Drawing | `onDrawBackground` | `ctx: CanvasRenderingContext2D, canvas: LGraphCanvas, element: HTMLCanvasElement, mouse: Vector2` |
|  | `onDrawForeground` | `ctx: CanvasRenderingContext2D, canvas: LGraphCanvas, element: HTMLCanvasElement` |
|  | `onDrawCollapsed` | `ctx: CanvasRenderingContext2D, canvas: LGraphCanvas` |
|  | `onDrawTitle` | `ctx: CanvasRenderingContext2D` |
|  | `onDrawTitleBar` | `ctx: CanvasRenderingContext2D, titleHeight: number, size: Vector2, scale: number, color: string` |
|  | `onDrawTitleBox` | `ctx: CanvasRenderingContext2D, titleHeight: number, size: Vector2, scale: number` |
|  | `onDrawTitleText` | `ctx: CanvasRenderingContext2D, titleHeight: number, size: Vector2, scale: number, font: string, selected: boolean` |
| Menus | `getMenuOptions` | `canvas: LGraphCanvas` |
|  | `getExtraMenuOptions` | `canvas: LGraphCanvas, options: ContextMenuItem[]` |
|  | `getSlotMenuOptions` | `slot: { input?: INodeInputSlot; output?: INodeOutputSlot; slot: number }` |
|  | `onMenuNodeInputs` | `entries: ContextMenuItem[]` |
|  | `onMenuNodeOutputs` | `entries: ContextMenuItem[]` |

**`LGraphCanvas` (a canvas)** (`LGraphCanvasHooks`)

| Group | Hook | Handler arguments, after `info` |
|---|---|---|
| Lifecycle | `onClear` | none |
|  | `onOpenSubgraph` | `graph: LGraph, previous: LGraph` |
|  | `onCloseSubgraph` | `graph: LGraph, previous: LGraph, node: LGraphNode \| undefined` |
|  | `onShowNodePanel` | `node: LGraphNode` |
|  | `onSearchBoxSelection` | `type: string, event: Event, canvas: LGraphCanvas` |
| Drawing | `onRender` | `element: HTMLCanvasElement, ctx: CanvasRenderingContext2D` |
|  | `onRenderBackground` | `element: HTMLCanvasElement, ctx: CanvasRenderingContext2D` |
|  | `onDrawBackground` | `ctx: CanvasRenderingContext2D, visibleArea: Float32Array` |
|  | `onDrawForeground` | `ctx: CanvasRenderingContext2D, visibleRect: Float32Array \| Vector4` |
|  | `onDrawOverlay` | `ctx: CanvasRenderingContext2D` |
|  | `onDrawLinkTooltip` | `ctx: CanvasRenderingContext2D, link: LLink \| null, canvas?: LGraphCanvas` |
| Input | `onMouse` | `event: MouseEvent` |
|  | `onMouseDown` | `event: MouseEvent` |
|  | `onKeyDown` | `event: KeyboardEvent` |
|  | `onDropItem` | `event: DragEvent` |
| Selection and moves | `onNodeSelected` | `node: LGraphNode` |
|  | `onNodeDeselected` | `node: LGraphNode` |
|  | `onSelectionChange` | `selected: Record<string, LGraphNode>` |
|  | `onNodeMoved` | `node: LGraphNode, selected: Record<string, LGraphNode>` |
|  | `onNodeDblClicked` | `node: LGraphNode` |
|  | `onGroupMoving` | `group: LGraphGroup, dx: number, dy: number` |
|  | `onGroupMoved` | `group: LGraphGroup` |
|  | `onGroupResized` | `group: LGraphGroup` |
| Menus | `getMenuOptions` | none |
|  | `getExtraMenuOptions` | `canvas: LGraphCanvas, options: ContextMenuItem[]` |

**`LGraphGroup` (a group)** (`LGraphGroupHooks`)

| Group | Hook | Handler arguments, after `info` |
|---|---|---|
|  | `onMoved` | none |

<!-- generated:hooks:end -->

**Node panel:** the node panel dispatches `onAddPropertyToPanel(name, panel, value, info, update)` for each property (a handled result replaces the property's row; rows the node adds with `panel.addWidget` or `panel.addRow` go into the Properties section) and calls `onShowCustomPanelInfo(panel)` after its sections. The canvas hook `onShowNodePanel(node)` can open its own panel instead: a handled result skips the built-in one. Sections for every node or for the options panel come from `LiteGraph.registerPanelSection` (see the [guide](guide.md#panels)).

## Typed events

`LiteGraph.events`, `graph.events` and `canvas.events` (`src/eventtarget.js`) provide `on(type, fn, {once, signal, priority})`, which returns an unsubscribe function.
- Listeners run by `priority` (highest first), then in subscription order.
- `on("*", fn)` receives every event of that target, after the listeners of the type. While one is attached, reports that are skipped when nobody listens are built for every event (for example `execution-step`, `missing-nodes`, `execution-check`).
- A listener that throws is logged and does not stop the others.

The tables are generated from the event maps in `src/litegraph.d.cts` (`LiteGraphEventMap`, `LGraphEventMap`, `LGraphCanvasEventMap`); `npm run check:types` fails when an event emitted in `src/` is missing from them. `event-dropped` is emitted by `ExecutionEngine` on the root graph (reasons `reentry`, `refreshing`, `no-handler`, `mode`, `stopped-queue`, `max-passes`, `max-depth`, `cycle`, `once-per-frame`), and `link-drag-start` / `link-drag-end` by the canvas's `LinkConnector`.

<!-- generated:events:start (npm run docs:callbacks; do not edit by hand) -->

**`LiteGraph.events`** (`LiteGraphEventMap`)

| Event | Detail | Notes |
|---|---|---|
| `node-type-registered` | `{ type: string; ctor: Function; previous: Function \| null }` |  |
| `node-type-replaced` | `{ type: string; ctor: Function; previous: Function }` |  |
| `node-type-unregistered` | `{ type: string; ctor: Function }` |  |
| `graph-created` | `{ graph: LGraph }` |  |
| `canvas-created` | `{ canvas: LGraphCanvas }` |  |

**`graph.events`** (`LGraphEventMap`)

| Event | Detail | Notes |
|---|---|---|
| `configuring` | `{ data: Record<string, unknown>; keep_old: boolean }` | before a document loads; mutate detail.data to migrate it, preventDefault() to cancel |
| `configured` | `{ data: Record<string, unknown>; error: boolean; replaced: { id: GraphId; from: string; to: string; dropped: DroppedLink[] }[] }` | replaced: nodes changed by automatic replacement mappings while loading |
| `missing-nodes` | `{ report: MissingNodeReport[]; reason: 'load' \| 'history' \| 'rollback' }` | a document with missing node types loaded (root graph; only when someone listens); reason: "load", or "history" / "rollback" when undo, redo or a failed transaction reloads the graph |
| `node-replaced` | `{ node: LGraphNode; from: string; to: string; dropped: DroppedLink[] }` |  |
| `graph-changed` | `{ kind: GraphChangeKind; kinds: GraphChangeKind[]; action: string; revision: number; graph: LGraph; reason?: 'load' \| 'history' \| 'rollback' }` | one per recorded change (per transaction); from a subgraph also on the root graph with kind "subgraph"; kind "configure" after a load |
| `modified-changed` | `{ modified: boolean }` | isModified changed |
| `execution-state` | `{ message: ExecutionStateMessage; node: LGraphNode \| null; remote?: boolean }` | a node's execution state changed (root graph); remote: applied from a received message |
| `node-added` | `{ node: LGraphNode }` |  |
| `node-removed` | `{ node: LGraphNode }` |  |
| `changed` | `{ action: string; revision: number }` | a saved change (one per transaction) |
| `reroute-added` | `{ reroute: Reroute; link: LLink \| null }` |  |
| `reroute-removed` | `{ reroute: Reroute }` |  |
| `link-connected` | `{ link: LLink; origin: LGraphNode; originSlot: number; target: LGraphNode; targetSlot: number }` |  |
| `link-removed` | `{ link: LLink; origin: LGraphNode \| null; target: LGraphNode \| null }` |  |
| `node-property-changed` | `{ node: LGraphNode; name: string; value: unknown; previous: unknown }` |  |
| `widget-changed` | `{ node: LGraphNode; widget: IWidget; value: unknown; previous: unknown }` |  |
| `execution-step` | `{ iteration: number }` | after each runStep iteration (only dispatched when someone listens) |
| `node-error` | `{ error: unknown; node: LGraphNode \| null; path: string \| null }` | execution stopped on an error; node: the innermost failing node (also inside subgraphs); path: its LGraphNode.getPath() |
| `event-dropped` | `{ node: LGraphNode \| null; path: string \| null; reason: EventDropReason; setting?: string; message: string }` | an event or execution was refused (root graph; only when someone listens); setting names what lifts a limit |
| `execution-model-changed` | `{ model: string }` | setExecutionModel changed the document's model (root graph) |
| `execution-check` | `{ report: ExecutionReport; reason: 'load' \| 'history' \| 'rollback' }` | execution diagnostics after the root graph loads (only when someone listens) |
| `subgraph-definition-changed` | `{ id: string; node: LGraphNode; revision: number }` | a subgraph definition changed by a commit; linked instances were refreshed (root graph) |
| `subgraph-forked` | `{ node: LGraphNode; from: string; to: string; reason: string }` | an instance got its own definition: inserted content differed under the same id, or make unique (root graph) |
| `group-added` | `{ group: LGraphGroup }` |  |
| `group-removed` | `{ group: LGraphGroup }` |  |

**`canvas.events`** (`LGraphCanvasEventMap`)

| Event | Detail | Notes |
|---|---|---|
| `link-dropped-on-empty` | `{ node: LGraphNode; slot: number; output: INodeOutputSlot \| null; input: INodeInputSlot \| null; type: string \| number \| undefined; canvasX: number; canvasY: number; event: PointerEvent }` | a dragged link was released on empty canvas; preventDefault() skips the default menu |
| `subgraph-opened` | `{ graph: LGraph; parent: LGraph \| null }` |  |
| `subgraph-closed` | `{ graph: LGraph; subgraph: LGraph; node: LGraphNode \| null }` |  |
| `selection-changed` | `{ nodes: LGraphNode[]; items: Array<LGraphNode \| LGraphGroup \| Reroute> }` |  |
| `disposed` | `{ canvas: LGraphCanvas }` |  |
| `viewport-changed` | `{ offset: [number, number]; scale: number; visible_area: number[] }` | the view moved or zoomed (checked once per drawn frame) |
| `blueprint-error` | `{ error: unknown; file: unknown }` | a dropped blueprint file could not be inserted |
| `link-drag-start` | `LinkDragDetail & { canvas: LGraphCanvas }` | re-emitted from the canvas LinkConnector |
| `link-drag-end` | `LinkDragDetail & { canvas: LGraphCanvas }` |  |

<!-- generated:events:end -->
