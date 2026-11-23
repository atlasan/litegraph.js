# Event handling: CallbackHandler, typed events and legacy callbacks

> **Date** 2026-11-22 · **Kind** audit · **Status** final · **Base** `LG/dev` @ `a5604d8`

**What was reviewed:** every way litegraph lets outside code react to, or change, what the library does. This covers the legacy `onX` properties, the `CallbackHandler` hooks, the typed events (`graph.events` and `canvas.events`) and the internal single-slot channels.

**By whom:** a Claude Code session, read-only, at the user's request ("investigate, audit and explain the custom event handling, which surely needs complete integration").

**How:**
- Read `src/callbackhandler.js`, `src/eventtarget.js`, `src/extensionregistry.js` and every call site.
- Ran probes against the committed `build_node/litegraph.core.cjs` (Node v22.23.4). The scripts and their output are inline below.

The integration proposal that follows from this audit is [2026-11-22-event-integration](../plans/2026-11-22-event-integration.md).

## 1. Why there are three systems

| Channel | Origin | Why it exists |
|---|---|---|
| **Legacy `onX` properties** (`node.onExecute = fn`, `canvas.onNodeSelected = fn`) | Upstream litegraph | The original extension model. There is one function per name, and the caller reads its return value (for example `onConnectInput` returning `false` vetoes, `onMouseDown` returning `true` captures). A second assignment silently replaces the first, so two extensions can't both hook the same point. |
| **`CallbackHandler`** (`src/callbackhandler.js`) | This fork, May 2024 (`a8bbe40`, `050767b`, `4a33664`: "intended to replace direct (single) assignment of callbacks") | Several handlers per name, ordered by priority, able to veto or override the result. The legacy `onX` keeps working as the *default* handler. It was retrofitted onto almost every `onX` call site. |
| **Typed events** (`src/eventtarget.js`, `graph.events`, `canvas.events`) | 2026-11-18 (`59d06e3`), modelled on Comfy-Org/litegraph.js `CustomEventTarget` (MIT) | Observe-only notifications with stable payloads: `on` / `once` / `off`, `{once, signal}`, an unsubscribe function, optional `cancelable`, and listener errors isolated from the library. Added for Waves 1–6 (history, selection, links, execution state, the runner). |
| **Internal channels** | Several waves | `graph.onGraphChanged()` (≈ 40 sites) is the change and history engine that feeds `changed` and `graph-changed`. `LinkConnector.onEvent` is a one-slot bridge to canvas events. `keybindings.onUserLayerChange` and settings `onChange` are the others. |

Merging the first three into "one prioritised, vetoable pipe that also dispatches typed events" was planned in the [feature harvest](../plans/2026-11-19-feature-harvest-and-priorities.md) (§4.1 and §5, H10). It was carried over from Wave 1 to Wave 2 ([roadmap](../plans/roadmap.md)) and then put out of scope in [Wave 6](../plans/2026-11-22-events-execution.md#scope). It never happened.

## 2. How each one works

### A hook: `obj.processCallbackHandlers(name, {def_cb}, ...args)`

1. **Registration** (`registerCallbackHandler(name, fn, {priority = 0, is_default, call_once})`, `callbackhandler.js:27-56`) pushes `{id, priority, callback, data: opts}` and sorts the array by priority, highest first. It returns a numeric id per name. `unregisterCallbackHandler(name, id)` filters the array into a new one.
2. **Dispatch** (`:92-255`):
   - Handlers with priority ≥ 0 run first, in order.
   - When the first negative-priority handler is reached, or at the end, the **default callback** `def_cb` runs: the legacy `onX` property, called with `this` = owner.
   - The negative-priority handlers run last.
   - Each handler is called as `fn.call(owner, info, ...args)`, where `info = {name, id, current_return_value, data, results_chain}`.
3. **Results** (`checkStepRet`, `:176-200`):
   - A handler returns either a plain value or an object `{return_value, result_priority, prevent_default, stop_replication}`.
   - The kept result changes when the new result's `result_priority` is ≥ the current one. Plain values count as 0, so with equal priorities the last one wins, and the legacy default overrides priority-0 handlers.
   - `prevent_default` skips `def_cb` and every handler registered with `is_default`.
   - `stop_replication` stops the chain, the default included.
4. **Return value:** the kept result, which is either a raw value or a handler's whole result object. The caller interprets it (§4, E3).
5. **Glue:** `LiteGraph`, `LGraph`, `LGraphNode`, `LGraphGroup` and `LGraphCanvas` each create a `CallbackHandler(this)` and forward the three methods to it (E8).

### A typed event: `target._emit(type, detail, options)`

1. `graph.events` and `canvas.events` are created lazily (`lgraph.js:40-43`, `lgraphcanvas.js:621-624`).
2. `_emit` dispatches only when `events.has(type)`, so nothing is allocated when nobody listens (`lgraph.js:46-60`, `lgraphcanvas.js:626-628`).
3. `LGraph._emit` also adds the change *kind* (`node`, `link`, `property`, …) to the pending `graph-changed` batch, unless the change is part of a recorded transaction.
4. `dispatch` builds an `LGraphEvent {type, detail, target, cancelable, defaultPrevented}`.
5. It iterates a **snapshot** of the listeners (`eventtarget.js:78`) and catches each listener's error, reporting it through `onError` (`:79-85`). The listener's return value is ignored, and `preventDefault()` works only for `cancelable` events (`configuring`, `link-dropped-on-empty`).

### Who uses what

| Consumer | Channel |
|---|---|
| `ExtensionRegistry` (`extensionregistry.js:96-139`) | Both. `ctx.on`, `ctx.onTarget` and `ctx.onCanvas` are hooks (the registry wraps the ids into disposers); `ctx.onEvent` is a typed event. |
| `extensions/autoconnect.js` | `onMouseDown` hook |
| `extensions/quick_connect.js`, `view_tools.js` | `link-dropped-on-empty` event, `onCanvas` |
| `minimap.js`, `litegraph-editor.js`, `apps/runner/graphRunners/graphRunner.js` | Typed events only |

## 3. What each one covers

**Hooks:** 164 call sites, 102 names.

| File | Sites | Names |
|---|---|---|
| `lgraphcanvas.js` | 87 | 60 |
| `lgraph.js` | 37 | 27 |
| `lgraphnode.js` | 35 | 22 |
| `litegraph.js` | 3 | 3 |
| `subgraph.js`, `extensions/keyboard_helper.js` | 1 each | 1 each |

They cover everything: lifecycle, execution (`onExecute`, `onAction` on every run), slots and links, pointer and keys, and drawing (`onDrawForeground`, `onDrawBackground` and the title hooks, for every node on every frame). The full list is in [callbacks.md](../../docs/callbacks.md).

**Typed events:** 32 emitted types on two targets.
- **Graph:** `configuring`, `configured`, `changed`, `graph-changed`, `modified-changed`, `node-added`, `node-removed`, `node-replaced`, `node-property-changed`, `widget-changed`, `link-connected`, `link-removed`, `reroute-added`, `reroute-removed`, `missing-nodes`, `subgraph-definition-changed`, `subgraph-forked`, `execution-step`, `execution-state`, `node-error`, `event-dropped`, `execution-model-changed`, `execution-check`.
- **Canvas:** `selection-changed`, `viewport-changed`, `subgraph-opened`, `subgraph-closed`, `link-dropped-on-empty`, `link-drag-start`, `link-drag-end`, `blueprint-error`, `disposed`.

**Where the two meet (the same moment, two channels):**

| Hook | Typed event | Relationship |
|---|---|---|
| `onNodeAdded` (`lgraph.js:1194`) | `node-added` (`:1206`) | The hook runs first; the event runs after `onGraphChanged` |
| `onNodeRemoved` (`:1297`) | `node-removed` (`:1301`) | Both are deferred through `cleanup`, hook first |
| `onConfigure` (`lgraph.js:2960`) | `configured` (`:2971`) | Hook first |
| `onPropertyChanged` (`lgraphnode.js:516`) | `node-property-changed` (`:525`) | The hook can veto by returning `false`; the event fires only if the value really changed. **This is the right pattern.** |
| `onWidgetChanged` (`lgraphcanvas.js:6170`) | `widget-changed` (`:6181`) | Hook first |
| `onSelectionChange` (`lgraphcanvas.js:2766`, `:2789`, `:2832`) | `selection-changed` (`:2769`, `:2792`, `:2835`, **`:2880`, `:2894`**) | Selecting a group or a reroute emits the event but **not** the hook |
| `onOpenSubgraph` / `onCloseSubgraph` (`:328`, `:357`) | `subgraph-opened` / `subgraph-closed` (`:336`, `:378`) | The hook result is ignored, so it is not a veto |
| `onAfterStep` (`lgraph.js:518`, `:532`) | `execution-step` | Hook first |

**Only one side exists:**
- Hooks only: node-type registration (`onNodeTypeRegistered` and `onNodeTypeReplaced`, with no `LiteGraph`-level event target), pointer and keys, drawing, menus, slot add and remove, and the execution callbacks.
- Events only: execution state and errors, `event-dropped`, history (`changed`, `modified-changed`), reroutes, missing nodes, subgraph definitions, the link-drag lifecycle and the viewport.
- `LGraphGroup` has a handler registry but **fires no hook**.
- Groups, reroutes and links have no event target of their own.

## Findings

| # | Severity | Finding | Evidence (`path:line`) | Since |
|---|---|---|---|---|
| E1 | high | **Registering during dispatch re-runs handlers, or hangs.** `register` sorts the live array in place (`:52`) while `processCallbackHandlers` iterates it with `for…of` (`:201`). A handler that registers a higher-priority handler once is run again; one that registers on every call loops forever (probe P2). `unregister` is safe, because it replaces the array. | `callbackhandler.js:52`, `:201`, `:233` | Fixed in `88d44aa` (Wave 7: copy-on-write `ListenerList`) |
| E2 | high | **A throwing hook aborts the chain and propagates** into the draw loop, `doExecute`, pointer and key handling. The default `onX` and the later handlers do not run (probe P1). Typed events catch the error and report it, and the other listeners still run. | `callbackhandler.js:233` vs `eventtarget.js:79-85` | Fixed in `88d44aa` (Wave 7: errors isolated, the first rethrown after the chain; D8) |
| E3 | medium | **The result shape is not normalised.** `buildRetObj` is an empty TODO (`:160`), and `processCallbackHandlers` returns either a raw value or a handler's object. Each call site unwraps it its own way:<br>- `onDblClick` and `onMouseDown` count a *truthy* `return_value` as handled (`lgraphcanvas.js:1259`, `:1273`);<br>- `onKeyDown`, `onRenderBackground`, `onDrawTitleBar` and `onSearchBoxSelection` need `=== true` (`:2356`, `:4175`, `:4945`, `:8156`);<br>- `onGetInputs` accepts an array or a `return_value` object (`:6795`);<br>- `onBeforeConnectInput` reads `return_value` as a slot redirect (`lgraphnode.js:2550`).<br>The same handler result can mean "handled" at one hook and not at another. | listed lines | Mostly fixed in `88d44aa` (`CallbackHandler.is` / `handled` / `valueOf` at 21 sites) and `2f60586` (`objectOf` at the menu sites); a uniform "handled" rule is open (D8, no earlier than 0.20) |
| E4 | medium | **Cost on hot paths.** Every dispatch allocates the options object, an argument slice, three closures and an info object, even when no handler is registered, and it creates an empty `{last_id, handlers}` entry for each name on each instance (`:106-108`). Drawing dispatches about 8 hooks per node per frame, and execution dispatches `onExecute` and `onAfterExecuteNode` per node per step. Probe P3: **243 ns per dispatch, against 7.5 ns for a direct call (≈ 32×)**. | probe P3; `callbackhandler.js:92-121` | Fixed in `88d44aa` (Wave 7 fast path; no-handler dispatch 279–424 → 46–130 ns) |
| E5 | medium | **The order between paired hooks and events is undocumented and not uniform** (table in §3). Selecting a group or reroute emits `selection-changed` without `onSelectionChange`. Whether an event fires after a veto depends on the site: `onPropertyChanged` gates its event, `onOpenSubgraph` ignores its hook's result. | `lgraphcanvas.js:2880`, `:2894`, `:328-336`; `lgraphnode.js:516-526` | Fixed in `88d44aa` (group and reroute selection hooks) and `d70ba35` (`fireHookThenEvent`: one order, event skipped after a veto) |
| E6 | medium | **Gaps in typed-event coverage:**<br>- No `LiteGraph`-level target, so type registration can only be hooked.<br>- No group, reroute or link targets.<br>- Pointer and keys are hook-only.<br>- `LGraphGroup` owns a registry that nothing fires. | `lgraphgroup.js:24-42`; `litegraph.js:865-870` | Mostly fixed in `88d44aa` (`LiteGraph.events`, group events; reroute events on the graph); pointer and keys stay hook-only |
| E7 | medium | **Docs and typings drift:**<br>- [callbacks.md](../../docs/callbacks.md) lists 22 of the 32 typed events and says the merge is "planned for Wave 2"; so does the [codebase map](../memories/codebase/README.md) (Execution section).<br>- The `.d.cts` event maps have no `blueprint-error`.<br>- Hook names are typed as `string` (`litegraph.d.cts:2090`), so a misspelled hook never fires and nothing reports it. | `lgraphcanvas.js:6673`; `litegraph.d.cts:1393`, `:1435`, `:2090` | Fixed in `88d44aa` (callbacks.md, map, declared-events check) and `2f60586` (typed hook-name maps, declared-hooks check) |
| E8 | low | **The glue is copied in five classes and behaves differently in each:**<br>- `LiteGraph` replaces its own methods with instance fields inside `callbackhandler_setup` (`litegraph.js:351-358`).<br>- `LGraphNode` and `LGraphGroup` create the registry lazily.<br>- `LGraph` and `LGraphCanvas` create it eagerly; the canvas has commented-out lazy code.<br>- `registerCallbackHandler` is an instance field (`callbackhandler.js:27`), so every registry gets its own copy of the function. | `litegraph.js:351-371`, `lgraph.js:223-235`, `lgraphnode.js:185-200`, `lgraphgroup.js:27-42`, `lgraphcanvas.js:185-203` | Fixed in `88d44aa` (one `installHooks` mixin) |
| E9 | low | **Async results are ignored.** A handler that returns a Promise has its `prevent_default` and `return_value` silently ignored (probe P1). `opts.on_result` (`:178`) exists only to collect async cleanup. Hooks are synchronous, but the docs don't say so. | `callbackhandler.js:178` | Open: async hooks need their own proposal (D8) |
| E10 | low | **Ergonomics:**<br>- `register` returns an id per name, with no disposer, no `signal` and no `has()`. The extension registry has to wrap the ids (`extensionregistry.js:96-101`).<br>- `unregister` logs at `info` on every success and at `warn` on a miss (`callbackhandler.js:71`, `:79`). | listed lines | Fixed in `88d44aa` (`onHook` disposers, `once`, `signal`; no logs on unregister) |
| E11 | low | **Direct calls bypass the hooks:** `onAddPropertyToPanel`, `onShowCustomPanelInfo`, `onSearchBox`, title `button.onClick`, and `ExecutionEngine.enterBoundary` → `node.onExecute?.()` on `graph/input` nodes. `graph.onGraphChanged` looks like an overridable `onX` callback, but it is the history engine: overriding it breaks undo. | `lgraphcanvas.js:9226`, `:9235`, `:8320`, `:5927`; `execution.js:310`; `lgraph.js:3064` | Partly fixed in `88d44aa` (the two panel hooks are dispatched); `onSearchBox`, title buttons, `enterBoundary` and `onGraphChanged` unchanged |

**What already works and must be kept:**
- the priority, veto and default-callback model, with the Wave 0 B6 fixes (`result_priority`, `stop_replication`, `call_once`), pinned by `test/callback-handler.test.js`;
- typed events: `_emit` allocates nothing when nobody listens, listener errors are isolated, `{signal}` and unsubscribe functions, cancelable events, and the `graph-changed` batching;
- the extension registry's tracked disposal across both channels.

## Probes

**P1 and P2: edge cases**

```js
// node -e, cwd = repo root
const {LiteGraph} = require("./build_node/litegraph.core.cjs"); const CH = LiteGraph.CallbackHandler;
// P1a: throwing handler
const h1 = new CH({}); const o1 = [];
h1.registerCallbackHandler("e", () => { throw new Error("x"); }, {priority: 1});
h1.registerCallbackHandler("e", () => o1.push("after"));
try { h1.processCallbackHandlers("e", {def_cb: () => o1.push("default")}); } catch { /* o1 is [] */ }
// P2a: register once during dispatch
const h2 = new CH({}); const o2 = []; let once = false;
h2.registerCallbackHandler("e", () => { o2.push("a"); if (!once) { once = true; h2.registerCallbackHandler("e", () => o2.push("new-hi"), {priority: 9}); } }, {priority: 1});
h2.registerCallbackHandler("e", () => o2.push("b"));
h2.processCallbackHandlers("e", {});            // o2 = a,a,b
// P1b: async prevent_default
const h3 = new CH({}); const o3 = [];
h3.registerCallbackHandler("e", async () => ({prevent_default: true}));
h3.processCallbackHandlers("e", {def_cb: () => o3.push("default")}); // default still ran
```

Output: `{"throw": "propagates; ran=[]", "register_during_once": "a,a,b", "async_prevent_ignored": true}`. Three dispatches of names with no handlers left 3 empty entries in `callbacks_handlers`.

**P2b, registering on every call:** `h.registerCallbackHandler("e", () => h.registerCallbackHandler("e", () => {}, {priority: 9}), {priority: 1}); h.processCallbackHandlers("e", {});` under `timeout 5` gave exit `124`. It never returned.

**P3, cost:** one million calls, second (warm) round. `n.onExecute(1, {})` directly vs `n.processCallbackHandlers("onExecute", {def_cb: n.onExecute}, 1, {})` on a node with no registered handler: `{"calls":1000000,"direct_ms":7.5,"via_handler_ms":242.7,"ns_per_dispatch":243}`.

As a rough scale: 500 nodes × 8 draw hooks × 60 fps is 240k dispatches a second, about 58 ms of each second (≈ 6% of a 60 fps budget) spent on dispatch alone.

## Verdict

The *model* is sound and worth keeping: CallbackHandler provides prioritised intercept and veto, typed events provide isolated observation with stable payloads, and the extension registry already ties both to disposal. The *implementation* is split and uneven:
- the hook side has two high-severity robustness defects (E1, E2);
- results are unwrapped differently at each site (E3);
- every dispatch costs about 30× a direct call (E4);
- the two sides overlap without a defined order (E5), cover different areas (E6) and are documented and typed only in part (E7).

Complete integration should follow **one core, two faces** without breaking any of today's contracts:
- one listener engine for both channels;
- the hook API stays the *intercept* face;
- typed events stay the *observe* face;
- a fixed order: hooks → legacy `onX` → event, with the event fired only when nothing vetoed.

The proposal is [2026-11-22-event-integration](../plans/2026-11-22-event-integration.md), proposed as Wave 7 in the [roadmap](../plans/roadmap.md). This record is not edited afterwards, except for the **Since** column.
