# Event integration: one core, two faces

> **Date** 2026-11-22 · **Kind** plan · **Status** done; async hooks need their own proposal (decision 0007) (see History) · **Base** `LG/dev` @ `a5604d8`

**Outcome:** the legacy `onX` callbacks, the CallbackHandler hooks and the typed events run on **one listener engine**, and today's code keeps working unchanged.
- **Hooks** stay the **intercept** face: priority, veto and return values.
- **Typed events** stay the **observe** face: isolated listeners and stable payloads.
- Every point that has both fires them in **one documented order**.
- The engine fixes the two robustness defects and makes a dispatch with no listener nearly free.
- It adds one listening vocabulary for extensions and tooling.

**Why now:**
- The merge was planned in Wave 1, carried to Wave 2 and set aside in Wave 6.
- The [event handling audit](../audits/2026-11-22-event-handling.md) found high-severity defects on the hook side (E1, E2), a ≈ 32× dispatch cost on draw and execute paths (E4), and the two channels drifting apart (E5–E7).

## Context

**Today** (details and evidence in the [audit](../audits/2026-11-22-event-handling.md)):

| Channel | Where | Role |
|---|---|---|
| CallbackHandler | `src/callbackhandler.js`, glue copied in `litegraph.js`, `lgraph.js`, `lgraphnode.js`, `lgraphgroup.js`, `lgraphcanvas.js` | 164 call sites, 102 hook names |
| Typed events | `src/eventtarget.js`, `graph.events`, `canvas.events` | 32 types |
| Extension registry | `src/extensionregistry.js` | Bridges both channels to disposal |

Where they sit in the code: the [codebase map](../memories/codebase/README.md). The user-facing reference: [callbacks.md](../../docs/callbacks.md).

**Origin:**
- [Feature harvest](2026-11-19-feature-harvest-and-priorities.md) §4.1 and §5, idea H10: "one prioritised, vetoable pipe that also dispatches typed events; legacy `on*` stays as the default callback".
- [Roadmap](roadmap.md), Wave 1 carry-over.
- The [Wave 6 plan](2026-11-22-events-execution.md) put it out of scope.

**Related ideas:** USE-34 (per-node execution trace, which needs a cheap tap), CFY-31 (namespaced runner → editor events), WGS-05 (object actions and events as slots), USE-18 (host-protected nodes, which need a veto hook).

**Not the same layer:** FLW-05 and FLW-06 (lifecycle nodes, custom events and dispatchers *inside* a graph) were being drafted in a parallel session when this was written. Those are **graph-level** named events that travel along EVENT/ACTION links. This plan covers the **API-level** events that code and extensions listen to. The two meet in one place only: a FLW-06 refusal (`no-event`, `unbound`) would be reported through this engine as `event-dropped`.

**Decided with the user (2026-11-22):**
- The target is **"one core, two faces"**. Making typed events the only public API was the alternative; it was not chosen.
- This record is a proposal. No engine code is written until it is accepted.
- **Keep compatibility as much as possible,** with a unified and powerful implementation.

## Design

### 1. The core: one listener store

A `ListenerStore` in `src/eventtarget.js` (a source file listed in `build.py`). Both faces use it:

| Feature | Behaviour | Fixes |
|---|---|---|
| Entries | `{id, fn, priority, seq, once, is_default, phase, signal}`. Ordered by priority, highest first, then by registration order: the same order as today's stable sort | |
| Copy-on-write | Every add or remove builds a new array. A dispatch iterates the array it started with, so a listener added during a dispatch runs from the next dispatch | E1 |
| Error isolation | Each call is wrapped, and an error goes to the owner's `onError` (`LiteGraph.log_error` by default) while the chain continues. For hooks, the first error is rethrown **after the chain ends** when `LiteGraph.throw_errors` is true, which is the default. A failure that was loud stays loud | E2 |
| Fast path | No store, or no entry for the name, means no allocation and no info object. The hook face calls `def_cb` directly. Target: dispatching a name with no listener costs ≤ 2× a direct call | E4 |
| Disposal | `add` returns the numeric id, as today; `options.signal` and `store.disposer(id)` are added. `has(name)`, `count(name)` and `names()` let code inspect the store | E10 |
| Quiet | Unregistering is logged at `debug` level, not `info` or `warn` | E10 |
| Tap | An optional `ListenerStore.tap(fn)` per process sees `{owner, name, phase, ms, error}` for every dispatch. When no tap is set, the cost is one null check. This is the base for USE-34 and a devtools panel | |

**`installHooks(Class)`** is a single mixin that replaces the five copies of `callbackhandler_setup` (E8). It creates the store lazily and gives `LiteGraph`, `LGraph`, `LGraphNode`, `LGraphGroup` and `LGraphCanvas` identical prototype methods.

### 2. The hook face (intercept)

**Kept exactly as they are:**
- `registerCallbackHandler(name, fn, {priority, is_default, call_once})` still returns a numeric id, and `call_once` stays as an alias of `once`.
- `unregisterCallbackHandler(name, id)` still returns a boolean.
- `processCallbackHandlers(name, {def_cb, on_result}, ...args)` keeps:
  - its signature and its raw return value: `null` when no one returned a value, otherwise the value or object that won;
  - the handler order and the point where `def_cb` runs;
  - the `info` argument and the `this` binding;
  - `result_priority`, `prevent_default`, `stop_replication` and `is_default`.

**Added:**
- `obj.onHook(name, fn, opts)` returns a disposer.
- `LiteGraph.hookResult(r, rule)` turns any hook result into `{value, handled, prevented, stopped, raw}`. The rule is `"strict"` (`=== true`), `"truthy"` or `"value"`. All 164 call sites switch to it, **each keeping the rule it uses today** (E3).
- `docs/callbacks.md` gets a generated table, one row per hook: its arguments, what its result means and its rule.

**Also:**
- Hooks are documented as synchronous; a Promise result is ignored (E9).
- The direct calls listed in E11 go through `processCallbackHandlers`.
- `onGraphChanged` is documented as internal. In debug mode, overriding it on an instance logs a warning that names `graph.events.on("changed")`.
- `CallbackHandler` stays exported (`LiteGraph.CallbackHandler`, `.d.cts`) as a facade over the store. `ob_ref` stays, and `callbacks_handlers` becomes a deprecated read-only view, for code that reads it directly.

### 3. The event face (observe)

**Kept:**
- `LGraphEventTarget` keeps `on`, `once`, `off`, `has` and `dispatch`, with the same `LGraphEvent` shape, the `cancelable` rule and the `{once, signal}` options; it moves onto `ListenerStore`.
- `_emit` still allocates nothing when no one listens.
- Every event name and payload that exists today stays the same.

**A single order wherever a point has both faces** (E5): intercept hooks with priority ≥ 0 → the legacy `onX` (default) → hooks with negative priority → the **typed event**.
- The event fires only when the hook chain did not veto. A veto is `prevent_default`, a `false` result where the hook's rule treats `false` as a veto, or a cancelable event's `preventDefault()`.
- `onPropertyChanged` → `node-property-changed` already works this way. It becomes the template, and a helper `fireHookThenEvent(owner, hookName, eventTarget, eventType, detail, args)` keeps the sites uniform.
- `onSelectionChange` also fires for group and reroute selection (`lgraphcanvas.js:2880`, `:2894`).

**Coverage** (E6), added on top:
- `LiteGraph.events`:
  - `node-type-registered`, `node-type-replaced` and `node-type-unregistered`;
  - `canvas-created` and `graph-created`, the typed counterparts of the `on_lgraph*_construct` hooks.
- Graph events for groups (`group-added`, `group-removed`, `group-changed {kind: move|resize|title|color|mode}`) and `reroute-moved`.
- `LGraphGroup` fires its own `onMoved`, `onResize` and `onTitleChanged` hooks. Otherwise it is the only host whose registry nothing fires.
- `slot-added` and `slot-removed` on the graph, paired with `onInputAdded`, `onOutputAdded`, `onInputRemoved` and `onOutputRemoved`.

**Hook-only by design:** drawing, pointer, keys and menus stay hooks. They are intercept points on hot paths, and a typed copy would add cost without making new things possible.

### 4. One vocabulary on top (additive)

**`ctx.listen(target, name, fn, opts)` in the extension context.**
- It routes by name: `onCamelCase` → hook face; `kebab-case` → event face.
- It is tracked for disposal.
- `ctx.on`, `ctx.onTarget`, `ctx.onEvent` and `ctx.onCanvas` stay as they are.

**`target.events.on("*", fn)`.**
- A wildcard observer per target, for tooling: devtools, the trace (USE-34) and a runner relay (CFY-31).
- It observes only, so it cannot veto, and it is checked only when it exists.

### 5. Typing and docs

- **Hook maps in `.d.cts`:** `LGraphNodeHooks`, `LGraphHooks`, `LGraphCanvasHooks`, `LGraphGroupHooks` and `LiteGraphHooks`. `registerCallbackHandler<K extends keyof Hooks>` gets typed arguments, and an overload with a plain `string` keeps unknown names compiling.
- **`tools/check-types.mjs`** also checks that every `_emit("…")` / `processCallbackHandlers("…")` name in `src/` is declared in the event or hook maps (E7). `blueprint-error` is added.
- **`docs/callbacks.md`:** both tables (hooks, events) are generated by a script from the declarations, so they cannot drift.

## Compatibility rules

1. **Assigning `onX` keeps working** as the default handler, with the same arguments, `this`, return value and position in the chain.
2. **The hook API is unchanged.** `registerCallbackHandler` returns a number, `unregisterCallbackHandler` a boolean, and `processCallbackHandlers` returns the same raw value: `null`, a value or the winning object. Third-party code that unwraps `return_value` keeps working.
3. **Every call site keeps its own rule for "handled".** `hookResult` names the rule; it does not change it. Making the rules uniform is open decision 2, and it would happen no earlier than 0.20.
4. **Typed events are unchanged:** names, payloads, `cancelable`, the error isolation and the no-allocation path. The new events are additions only.
5. **Errors:** under `throw_errors = true`, the default, a throwing hook still throws to the caller, after the rest of the chain has run. With `throw_errors = false`, it is reported and swallowed, as typed events are today. One behaviour changes and goes in `CHANGES.md`: the handlers after the failing one now run.
6. **Registering during a dispatch** takes effect from the next dispatch. Today it re-runs handlers or hangs (E1), so no working code depends on it.
7. **`CallbackHandler`, `cb_handler`, `callbackhandler_setup` and `callbacks_handlers`** stay reachable: deprecated, logged once, and not removed before 0.20.
8. **The mixin** keeps the old method names on every host. `LiteGraph.registerCallbackHandler` works before `initialize()`, as it does today.

## Scope

**In:**
- the core store and the `installHooks` mixin;
- the hook face: `hookResult`, the call-site migration, the E11 bypasses;
- the event face: the order, the parity fixes and the new targets and events;
- `ctx.listen`, wildcard observers and the tap;
- hook typing and `check-types`;
- generated docs; benchmarks; deprecations.

**Out:**
- async hooks (a possible `processCallbackHandlersAsync` for configure and serialize; it needs its own proposal);
- per-node `node.events` targets (node events stay on the graph with `{node}`, see decision 4);
- DOM `EventTarget` interop;
- changing any rule for "handled" (decision 2);
- removing deprecated API.

## Steps

Proposed as **Wave 7**, on branches `LG/wave7<x>_<topic>` cut from `LG/dev`. Every commit passes `npm run check`, and `build/` and `build_node/` are regenerated in their own `build:` commit.

| # | Step | Acceptance check |
|---|---|---|
| **7a: ensure** | | |
| 1 | `test/hook-semantics.test.js` characterizes today's behaviour:<br>- the return value (`null`, `undefined`→`null`, `false`, `true`, objects);<br>- the order and where `def_cb` runs;<br>- `is_default`, `call_once`, `result_priority`, `stop_replication`, `on_result`.<br>E1 and E2 are added as `test.failing`, with their ids | Jest passes |
| 2 | Per-site rule table: a test drives each canvas and node call site that reads a result (`onMouseDown`, `onDblClick`, `onKeyDown`, `onRenderBackground`, `onDrawTitleBar`, `onDrawTitleBox`, `onDrawCollapsed`, `onGetInputs`, `onGetOutputs`, `onMenuNode*`, `onBeforeConnectInput`, `onConnectInput`, `onConnectOutput`, `onPropertyChanged`, `onSerialize`, `onSearchBoxSelection`, `onShowNodePanel`, `onDropItem`, `onDropFile`) with `true`, `1`, `{return_value: true}`, `{return_value: 1}` and `false`, and snapshots whether each was handled | A snapshot is committed. It stays identical through the wave |
| 3 | Order golden: one test per hook and event pair from the audit, recording the sequence of hook, `onX` and event | A snapshot is committed. Only step 9 may change it, with each change justified |
| 4 | `tools/bench/hooks.mjs`: a dispatch with no listener, with 1 listener and with 5; plus `benchmark.json` drawn for 300 frames in jsdom with a stub context, and stepped 1,000 times | Baseline numbers recorded in the execution record |
| **7b: core** | | |
| 5 | `ListenerStore` and `installHooks`. CallbackHandler and `LGraphEventTarget` move onto the store, and the five glue copies are deleted | Every existing test, steps 1–3 unchanged. `check:types` passes |
| 6 | Copy-on-write (E1), error isolation with the rethrow at the end (E2), the fast path (E4), `signal`, disposers, `has`, quiet logs | The E1 and E2 tests pass, P2b returns. Benchmark: no listener ≤ 2× a direct call; draw and step on `benchmark.json` not slower than the baseline |
| **7c: hook face** | | |
| 7 | `LiteGraph.hookResult` and migrating the 164 sites with each one's current rule. A generated hook table (arguments, result, rule) | Step 2's snapshot is identical. A lint rule or grep check finds no hand-written `return_value` unwrapping left in `src/` |
| 8 | Route the E11 bypasses through hooks. The `onGraphChanged` warning in debug mode. Document hooks as synchronous | Tests: a registered `onAddPropertyToPanel` handler runs; overriding `onGraphChanged` warns once in debug |
| **7d: event face** | | |
| 9 | `fireHookThenEvent` at every paired point, with the event skipped after a veto. `onSelectionChange` parity for groups and reroutes | Step 3's golden is updated with a reason for each change. A vetoed `onConnectInput` emits no `link-connected` |
| 10 | `LiteGraph.events` (`node-type-*`, `canvas-created`, `graph-created`); group events and hooks; `reroute-moved`; `slot-added` / `slot-removed` | One test per new event. Moving a group in the browser fires `group-changed {kind: "move"}` once per gesture |
| **7e: vocabulary, typing, docs** | | |
| 11 | `ctx.listen`, `events.on("*")`, `ListenerStore.tap` | Tests: routing by name, disposal of both kinds, the wildcard sees a `node-added`, the tap gives timings. Benchmark unchanged with no tap set |
| 12 | Hook maps in `.d.cts`; `check-types.mjs` compares the emitted and dispatched names with the maps; `blueprint-error` added | `check:types` fails on an undeclared name, shown by a temporary probe; then passes |
| 13 | Deprecations (`callbacks_handlers`, `cb_handler`, `callbackhandler_setup`), each logged once and marked `@deprecated` in `.d.cts`, removal no earlier than 0.20 | A test for the one-time log |
| 14 | Docs:<br>- `callbacks.md` generated (hooks, events, order, rules, errors, synchronous only);<br>- the guide's extension section;<br>- `CHANGES.md` (rule 5, the new events, `ctx.listen`);<br>- the codebase map;<br>- the roadmap;<br>- an execution record per part;<br>- decision record `0003-event-pipe.md` | Docs review. Index rows added in the same commits. A browser check on `editor_build.html`: an extension registered through `ctx.listen` on both kinds, disposed cleanly |

## Risks

- **Hidden dependence on the old result shape:** third parties could rely on the exact object `processCallbackHandlers` returns. Rule 2 keeps it, and step 2's snapshot guards it.
- **Behaviour after an error changes** (rule 5): the handlers after the failing one now run before the rethrow. This is rare, and it is better than what happens today. Documented in `CHANGES.md`, with the test as evidence.
- **Performance:** copy-on-write makes registering slightly more costly, but registration is rare. The wrapper that isolates errors must not cost more than the fast path saves, so step 6 has a benchmark gate.
- **Ordering changes in step 9** may affect listeners that relied on the event coming before something else. The golden (step 3) makes every change explicit, and each one is listed in `CHANGES.md`.
- **Code that reads `callbacks_handlers` directly:** a read-only view, plus a deprecation log.
- **Provenance:** the design is our own. The typed-event shape is already credited to Comfy-Org/litegraph.js (MIT); ComfyUI_frontend is a design reference only.

## Open decisions (each with a recommendation)

1. **Error policy for hooks.** Recommend: isolate, report, and rethrow the first error after the chain when `throw_errors` is true; swallow and report when it is false. Alternative: keep today's abort-on-throw, which fixes E2 for typed-event parity only.
2. **Making the "handled" rule uniform.** Recommend: keep each site's rule in Wave 7 (`hookResult` names it). In 0.20, move to `strict` (`=== true` or `return_value === true`), with a once-per-hook warning from 0.19 when a truthy non-`true` value decided the outcome.
3. **Events after a veto.** Recommend: skip the typed event when a vetoable hook vetoed; always fire it for hooks that cannot veto.
4. **Node-level `node.events`.** Recommend: no. Node events stay on the graph with `{node}` in the payload. Reconsider if WGS-05 (object events as slots) needs per-node subscriptions.
5. **Wildcard scope.** Recommend: `"*"` per target, observe only; no namespace patterns until a consumer needs them.
6. **Async hooks.** Recommend: out of Wave 7. Write a separate proposal if `configure` or `serialize` interception needs awaiting.

## Verification (whole wave)

- `npm run check` on every commit.
- The step 1–3 snapshots stay identical, except for the documented ordering changes in step 9.
- The benchmark gate in step 6, re-run at the end of the wave.
- Browser checks on `editor_build.html` (`npm run editor`, port 8000):
  - the extensions (autoconnect, quick_connect, view_tools) still work;
  - a `ctx.listen` extension;
  - group move events;
  - drawing performance on `benchmark.json`.

## History

- 2026-11-22: proposed, from the [event handling audit](../audits/2026-11-22-event-handling.md). The target ("one core, two faces") and the compatibility priority were chosen by the user.
- 2026-11-22: accepted by the user ("keep compatibility high … best effort"). Implemented on `LG/wave7_events`, reviewed ([audit](../audits/2026-11-22-wave7-review.md)) and merged into `LG/dev`; see the [execution record](../executions/2026-11-22-wave7-event-core.md).
  - **Done:**
    - the core: `ListenerList`, `installHooks`, copy-on-write, isolated errors, the fast path, `onHook`, `signal`, `once`, `hasCallbackHandlers`;
    - the result helpers, with 21 call sites migrated, each keeping its rule;
    - the E11 panel bypasses;
    - selection parity;
    - `LiteGraph.events`, the group events, `"*"` and `priority`;
    - `ctx.listen`;
    - the emitted-versus-declared check in `check-types`.
  - **Also fixed:** E12 (a drop on a node without `onDropItem` threw) and E13 (mouse down ran the `onClear` hook).
  - **Changed from the design:** open decision 1. The first handler error is **always** rethrown after the chain, whatever `throw_errors` says. Swallowing it would hide `onExecute` errors from `runStep`'s `node-error` report.
  - **Deferred:**
    - steps 2–3: the per-site snapshot and the order golden, replaced by targeted tests in `test/hook-pipeline.test.js`;
    - step 9: `fireHookThenEvent`, and skipping events after a veto (open decision 3);
    - the dispatch tap;
    - the typed hook maps;
    - step 13: deprecation logs. Nothing was deprecated, because every old name keeps working;
    - generated doc tables;
    - the `return_value` sites that read menu arrays.
- 2026-11-22: the deferred items, on `LG/dev_events_deferred`, merged into `LG/dev` ([execution record](../executions/2026-11-22-wave7-deferred.md)):
  - **Steps 2–3:** `test/hook-results.test.js` (32 result-reading sites × 5–8 results) and `test/hook-order.test.js` (18 paired points, with vetoes) were committed before any change.
  - **Step 9:** `CallbackHandler.fireHookThenEvent(owner, name, args, emitter, type, detail, {veto})`, used where the hook and the event are adjacent: `setProperty`, the property dialog, the five selection sites, node type registration, the graph and canvas construct hooks. **Open decision 3 is done as recommended:** a vetoing hook skips its event.
  - **Changed from the design:** points where library state changes between the hook and the event (`node-added`, `node-removed`, `configured`, `widget-changed`, `subgraph-opened` / `-closed`, `execution-step`) keep the event in its place, after the history record or the canvas switch. They already fire hook → `onX` → event, and moving the event would show listeners a half-done state. The audit's `onAfterStep` pair is `onExecuteStep` → `execution-step` inside `runStep`.
  - **Golden changes (2, both in the property dialog):** it now fires `node-property-changed`, and it records its history entry after the hook and none after a veto.
  - **The tap:** `LiteGraph.setDispatchTap(fn)` (`ListenerList.tap`), `{owner, name, phase, ms, error}`; one null check when unset, benchmark within noise.
  - **Typed hook maps** (step 12's hook half) and the declared-hooks check in `check-types`.
  - **The menu `return_value` sites:** `CallbackHandler.objectOf`, identical behaviour.
  - **Still deferred:** generated doc tables, step 13 (deprecation logs), making "handled" uniform (0.20), async hooks.
- 2026-11-25: the leftovers, on `LG/dev_hooks_deprecations` ([plan](2026-11-25-hooks-deprecations.md), [record](../executions/2026-11-25-hooks-deprecations.md)): generated doc tables (`npm run docs:callbacks`), step 13 (the three names log once; `CallbackHandler` itself stays undeprecated, it holds the result helpers), and open decision 2 as [decision 0007](../memories/decisions/0007-hook-handled-rule.md) settled it: `LiteGraph.Hooks.StrictHandled`, off by default, no removal date.
