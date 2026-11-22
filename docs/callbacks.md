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
| `CallbackHandler.handled(r)` | `true`, or an object with a truthy `return_value`. Used by `onMouseDown`, `onDblClick` and `onDropItem` on nodes |
| `CallbackHandler.valueOf(r)` | Returns the `return_value` of an object result, otherwise the result itself. Used for slot redirects and for `onDropItem`, `onDropFile` and `onAddPropertyToPanel` |

**Extensions** can register both kinds with `ctx.listen(target, name, fn, opts)`. A hook name (`onX`, `on_x`, `getXMenuOptions`) registers a hook handler; any other name registers a typed listener. Both are removed when the extension is disposed.

## Hooks by class

Generated from the `processCallbackHandlers("…")` call sites in `src/`. Regenerate with:

```sh
grep -ohE '\.processCallbackHandlers\(\s*"\w+"' src/*.js
```

| Class | Hooks |
|---|---|
| `LiteGraph` | `onNodeTypeRegistered`, `onNodeTypeReplaced`, `on_lgraph_construct`, `on_lgraphnode_construct`, `on_lgraphcanvas_construct` |
| `LGraph` | Lifecycle: `onConfigure`, `onSerialize`, `on_change`, `onBeforeChange`, `onAfterChange`<br>Execution: `onBeforeStep`, `onExecuteStep`, `onAfterStep`, `onAfterExecute`, `onPlayEvent`, `onStopEvent`, `onTrigger`, `onNodeTrace`<br>Nodes and links: `onNodeAdded`, `onNodeRemoved`, `onConnectionChange`, `onNodeConnectionChange`<br>Graph I/O: `onInputAdded`, `onInputRemoved`, `onInputRenamed`, `onInputTypeChanged`, `onOutputAdded`, `onOutputRemoved`, `onOutputRenamed`, `onOutputTypeChanged`, `onInputsOutputsChange`<br>Menus: `onGetNodeMenuOptions` |
| `LGraphNode` | Lifecycle: `onNodeCreated`, `onPostConstruct`, `onAdded`, `onRemoved`, `onConfigure`, `onSerialize`, `onResize`, `onBounding`, `onPropertyChanged`, `onGetPropertyInfo`<br>Execution: `onExecute`, `onAction`, `onAfterExecuteNode`, `onAfterActionedNode`<br>Slots: `onInputAdded`, `onInputRemoved`, `onOutputAdded`, `onOutputRemoved`, `onBeforeConnectInput`, `onConnectInput`, `onConnectOutput`, `onConnectionsChange`, `onGetInputs`, `onGetOutputs`, `onNodeInputAdd`, `onNodeOutputAdd`<br>Pointer and keys: `onMouseDown`, `onMouseUp`, `onMouseMove`, `onMouseEnter`, `onMouseLeave`, `onDblClick`, `onDrag`, `onMoved`, `onSelected`, `onDeselected`, `onInputClick`, `onInputDblClick`, `onOutputClick`, `onOutputDblClick`, `onKeyDown`, `onKeyUp`, `onDropItem`, `onDropFile`, `onDropData`, `onWidgetChanged`, `onTitleButtonClick`<br>Panel: `onAddPropertyToPanel`, `onShowCustomPanelInfo`<br>Drawing: `onDrawBackground`, `onDrawForeground`, `onDrawCollapsed`, `onDrawTitle`, `onDrawTitleBar`, `onDrawTitleBox`, `onDrawTitleText`<br>Menus: `getMenuOptions`, `getExtraMenuOptions`, `getSlotMenuOptions`, `onMenuNodeInputs`, `onMenuNodeOutputs` |
| `LGraphCanvas` | Lifecycle: `onClear`, `onOpenSubgraph`, `onCloseSubgraph`, `onShowNodePanel`, `onSearchBoxSelection`<br>Drawing: `onRender`, `onRenderBackground`, `onDrawBackground`, `onDrawForeground`, `onDrawOverlay`, `onDrawLinkTooltip`<br>Input: `onMouse`, `onMouseDown`, `onKeyDown`, `onDropItem`<br>Selection and moves: `onNodeSelected`, `onNodeDeselected`, `onSelectionChange`, `onNodeMoved`, `onNodeDblClicked`, `onGroupMoving`, `onGroupMoved`, `onGroupResized`<br>Menus: `getMenuOptions`, `getExtraMenuOptions` |

`LGraphGroup` has a handler registry but fires no hooks of its own.

## Typed events

`LiteGraph.events`, `graph.events` and `canvas.events` (`src/eventtarget.js`) provide `on(type, fn, {once, signal, priority})`, which returns an unsubscribe function.
- Listeners run by `priority` (highest first), then in subscription order.
- `on("*", fn)` receives every event of that target, after the listeners of the type.
- A listener that throws is logged and does not stop the others.

| Target | Events |
|---|---|
| LiteGraph | `node-type-registered {type, ctor, previous}`, `node-type-replaced`, `node-type-unregistered`, `graph-created {graph}`, `canvas-created {canvas}` |
| Graph | Lifecycle: `configuring` (cancelable), `configured`, `missing-nodes`<br>Changes: `changed`, `graph-changed` (batched kinds, also forwarded to the root), `modified-changed`<br>Nodes and links: `node-added`, `node-removed`, `node-replaced`, `node-property-changed`, `widget-changed`, `link-connected`, `link-removed`, `reroute-added`, `reroute-removed`, `group-added`, `group-removed`<br>Subgraphs: `subgraph-definition-changed`, `subgraph-forked`<br>Execution: `execution-step`, `node-error`, `execution-state`, `event-dropped` (a refused event: `{node, path, reason, setting?, message}`; reasons `reentry`, `refreshing`, `no-handler`, `mode`, `stopped-queue`, `max-passes`, `max-depth`, `cycle`, `once-per-frame`), `execution-model-changed`, `execution-check` (after a root load: `{report: {model, issues}, reason}`) |
| Canvas | `selection-changed`, `viewport-changed`, `subgraph-opened`, `subgraph-closed`, `link-drag-start`, `link-drag-end`, `link-dropped-on-empty` (cancelable), `blueprint-error`, `disposed` |

Regenerate the list of emitted names with:

```sh
grep -rhoE '_emit\??\.?\(\s*"[a-z-]+"' src | grep -oE '"[a-z-]+"' | sort -u
```

`event-dropped` is emitted by `ExecutionEngine` on the root graph, and `link-drag-start` / `link-drag-end` by the canvas's `LinkConnector`.
