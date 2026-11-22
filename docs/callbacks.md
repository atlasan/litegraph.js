# Callback handlers

Every classic `onX` callback can also be handled by **several registered handlers**, ordered by priority. The plain property (`node.onExecute = …`) keeps working, and acts as the *default* handler. Source: `src/callbackhandler.js`.

For new code, prefer **typed events** where one exists, for example `graph.events.on("node-added", fn)`; the list is at the end of this page. Merging the two systems into one ordered pipe is planned for Wave 2.

## API

The object you register on is `LiteGraph`, a graph, a node, a canvas or a group:

```js
const id = node.registerCallbackHandler("onExecute", function (info, ...args) {
    // `this` is the node; info = {name, id, current_return_value, data, results_chain}
    return { return_value: 42, result_priority: 1 };
}, { priority: 1 });

node.unregisterCallbackHandler("onExecute", id);
```

| Option | Default | Meaning |
|---|---|---|
| `priority` | `0` | Higher runs first. The default callback runs after the handlers with priority ≥ 0 and before the negative ones |
| `is_default` | `false` | The handler is skipped when another handler prevents the default |
| `call_once` | `false` | Unregister after the first call |

A handler may return a plain value, or an object with these fields:

| Field | Effect |
|---|---|
| `return_value` | Proposed result |
| `result_priority` | The result replaces the current one only if this is at least the current result's priority. Plain values count as `0` |
| `prevent_default` | Skip the default callback and the `is_default` handlers |
| `stop_replication` | Stop calling the remaining handlers |

## Hooks by class

Generated from the `processCallbackHandlers("…")` call sites in `src/`. Regenerate with:

```sh
grep -ohE '\.processCallbackHandlers\(\s*"\w+"' src/*.js
```

| Class | Hooks |
|---|---|
| `LiteGraph` | `onNodeTypeRegistered`, `onNodeTypeReplaced`, `on_lgraph_construct`, `on_lgraphnode_construct`, `on_lgraphcanvas_construct` |
| `LGraph` | Lifecycle: `onConfigure`, `onSerialize`, `on_change`, `onBeforeChange`, `onAfterChange`<br>Execution: `onBeforeStep`, `onExecuteStep`, `onAfterStep`, `onAfterExecute`, `onPlayEvent`, `onStopEvent`, `onTrigger`<br>Nodes and links: `onNodeAdded`, `onNodeRemoved`, `onConnectionChange`, `onNodeConnectionChange`<br>Graph I/O: `onInputAdded`, `onInputRemoved`, `onInputRenamed`, `onInputTypeChanged`, `onOutputAdded`, `onOutputRemoved`, `onOutputRenamed`, `onOutputTypeChanged`, `onInputsOutputsChange`<br>Menus: `onGetNodeMenuOptions` |
| `LGraphNode` | Lifecycle: `onNodeCreated`, `onPostConstruct`, `onAdded`, `onRemoved`, `onConfigure`, `onSerialize`, `onResize`, `onBounding`, `onPropertyChanged`, `onGetPropertyInfo`<br>Execution: `onExecute`, `onAction`, `onAfterExecuteNode`, `onAfterActionedNode`<br>Slots: `onInputAdded`, `onInputRemoved`, `onOutputAdded`, `onOutputRemoved`, `onBeforeConnectInput`, `onConnectInput`, `onConnectOutput`, `onConnectionsChange`, `onGetInputs`, `onGetOutputs`, `onNodeInputAdd`, `onNodeOutputAdd`<br>Pointer and keys: `onMouseDown`, `onMouseUp`, `onMouseMove`, `onMouseEnter`, `onMouseLeave`, `onDblClick`, `onDrag`, `onMoved`, `onSelected`, `onDeselected`, `onInputClick`, `onInputDblClick`, `onOutputClick`, `onOutputDblClick`, `onKeyDown`, `onKeyUp`, `onDropItem`, `onDropFile`, `onDropData`, `onWidgetChanged`<br>Drawing: `onDrawBackground`, `onDrawForeground`, `onDrawCollapsed`, `onDrawTitle`, `onDrawTitleBar`, `onDrawTitleBox`, `onDrawTitleText`<br>Menus: `getMenuOptions`, `getExtraMenuOptions`, `getSlotMenuOptions`, `onMenuNodeInputs`, `onMenuNodeOutputs` |
| `LGraphCanvas` | Lifecycle: `onClear`, `onOpenSubgraph`, `onCloseSubgraph`, `onShowNodePanel`, `onSearchBoxSelection`<br>Drawing: `onRender`, `onRenderBackground`, `onDrawBackground`, `onDrawForeground`, `onDrawOverlay`, `onDrawLinkTooltip`<br>Input: `onMouseDown`, `onKeyDown`, `onDropItem`<br>Selection and moves: `onNodeSelected`, `onNodeDeselected`, `onSelectionChange`, `onNodeMoved`, `onNodeDblClicked`, `onGroupMoving`, `onGroupMoved`, `onGroupResized`<br>Menus: `getMenuOptions`, `getExtraMenuOptions` |

`LGraphGroup` has a handler registry but fires no hooks of its own.

## Typed events

`graph.events` and `canvas.events` (`src/eventtarget.js`) provide `on(type, fn, {once, signal})`, which returns an unsubscribe function. A listener that throws is logged and does not stop the others.

| Target | Events |
|---|---|
| Graph | `configuring` (cancelable), `configured`, `node-added`, `node-removed`, `changed`, `link-connected`, `link-removed`, `reroute-added`, `reroute-removed`, `node-property-changed`, `widget-changed`, `execution-step`, `node-error`, `execution-state`, `event-dropped` (a refused event: `{node, path, reason, setting?, message}`; reasons `reentry`, `refreshing`, `no-handler`, `mode`, `stopped-queue`, `max-passes`, `max-depth`, `cycle`, `once-per-frame`), `execution-model-changed`, `execution-check` (after a root load: `{report: {model, issues}, reason}`) |
| Canvas | `link-dropped-on-empty` (cancelable), `selection-changed`, `subgraph-opened`, `subgraph-closed`, `disposed` |
