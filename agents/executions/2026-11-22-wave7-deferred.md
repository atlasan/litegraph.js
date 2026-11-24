# Wave 7: the deferred items (snapshot, order golden, hook → event helper, tap, hook typing)

> **Date** 2026-11-22 · **Kind** execution · **Status** final · **Base** `LG/dev_events_deferred` from `LG/dev` @ `455a33c` · **Plan** [event integration](../plans/2026-11-22-event-integration.md)

The items that the [Wave 7 core](2026-11-22-wave7-event-core.md) left open, under the same requirement: legacy litegraph and other projects assign `onX` directly, so every `onX` contract stays as it is.

What changed:
- The result rules of every call site are pinned by a snapshot, and the order of every paired point by a golden, both committed before any code change.
- Points that fire a hook and a typed event go through one helper. It skips the event when the hook vetoed (open decision 3).
- A process-wide dispatch tap gives the execution trace (USE-34) its timings.
- Hook names are typed per host, and `check-types` fails on an undeclared one.
- The menu sites read results through one helper, with identical behaviour.

## Changes

- `f56af58` `test:` the baseline, before any change:
  - **`test/hook-results.test.js`:** 32 sites that read a hook result. Each one is driven through its legacy `onX` with `true`, `1`, `{return_value: true}`, `{return_value: 1}` and `false`; the menu and slot-list sites also get `[list]`, `{return_value: [list]}` and `{return_value: null}`. The snapshot records "default" when the site behaved as with no result, otherwise what changed.
  - **`test/hook-order.test.js`:** 18 cases covering the pairs of the [audit](../audits/2026-11-22-event-handling.md) §3 table, the Wave 7 pairs (type registration, construct hooks) and the vetoes of `onPropertyChanged`, `onConnectInput` and `onConnectOutput`. Each case records handler +1, the legacy `onX`, handler −1 and every typed event of the graph, canvas and LiteGraph targets (`"*"`), with events after the task marked "later".
- `d70ba35` `feat:` `CallbackHandler.fireHookThenEvent(owner, name, args, emitter, type, detail, {veto})`:
  - **Behaviour:** the hook chain (with `owner[name]` as the default), then the event. A `veto` result skips the event, and so does a detail function that returns `null`.
  - **Sites:** `setProperty`, the property dialog, the five selection sites (through a module function, because `deselectNode.call(canvasLike, node)` must keep working, as an integration test showed), `onNodeTypeRegistered` / `onNodeTypeReplaced`, and `on_lgraph_construct` / `on_lgraphcanvas_construct`.
  - **Payload:** `selection-changed` always carries `items`.
- `dcdff1f` `feat:` the dispatch tap, `LiteGraph.setDispatchTap(fn)`, stored as `ListenerList.tap`:
  - **Hooks:** `CallbackHandler.run` checks `ListenerList.tap !== null` first; unset, that is the only cost.
  - **Events:** `LGraphEventTarget.dispatch` reads the tap once per dispatch, which happens only when someone listens.
  - **The tap is guarded** (`ListenerList.tapping`): its own dispatches are not reported, and a throwing tap is logged.
- `2f60586` `feat:` typing and menus:
  - **Hook maps** in `litegraph.d.cts`: `LiteGraphHooks`, `LGraphHooks`, `LGraphNodeHooks`, `LGraphCanvasHooks` and `LGraphGroupHooks`. `CallbackHost<H>` gives `registerCallbackHandler` and `onHook` a typed overload; the `string` overload stays.
  - **`check-types`:** it fails on a dispatched hook name missing from the maps, and it now also reads the events fired through the helper.
  - **Consumer test:** inferred arguments, plus a `@ts-expect-error` that proves the inference.
  - **`CallbackHandler.objectOf(result, fallback, arrays)`** replaces the 8 hand-written `return_value` menu sites in `lgraphcanvas.js`.
- `docs:` CHANGES, `callbacks.md` (the both-faces table, the tap, the typed maps, `objectOf`), the codebase map, the roadmap (Wave 7 rows, D8), the plan History and this record.
- `build:` regenerated distributions.

## Order golden: changes and their reasons

Only step 9 changed the golden. Both changes are in the property dialog (`showEditPropertyValue`):

| Case | Before | After | Reason |
|---|---|---|---|
| `onPropertyChanged` (dialog) | `changed`, `graph-changed`, then the hook; no `node-property-changed` | hook, `node-property-changed`, `changed`, `graph-changed` | Parity with `setProperty`: the event follows the hook. The history entry is recorded after the hook, so it contains the value the hook kept |
| `onPropertyChanged` vetoed (dialog) | `changed`, `graph-changed`, then the hook | the hook only | Decision 3: a veto skips the event. A vetoed edit no longer leaves an undo step that the revert contradicts |

The other 16 cases are identical, and so is the result snapshot through every commit.

**Pairs that are not adjacent keep their event in place:** `node-added`, `node-removed`, `configured`, `widget-changed`, `subgraph-opened` / `-closed` and `execution-step`. The golden shows that each already fires the hook chain, then `onX`, then the event. Between the two, the library records history, sizes the node or switches the canvas graph. Moving the event next to the hook would show listeners that half-done state, and would reorder `changed` / `graph-changed` for no gain. The audit paired `execution-step` with `onAfterStep`; inside `runStep` its pair is `onExecuteStep`.

## Findings (behaviour kept, recorded by the snapshot)

- A node's `getMenuOptions` uses only `{return_value: [...]}`. **A plain array result is ignored**, though upstream litegraph returns a plain array there. The same holds for `onMenuNodeInputs` / `onMenuNodeOutputs`, the canvas `getExtraMenuOptions` and `getSlotMenuOptions`; `onGetInputs`, `onGetOutputs` and the node's `getExtraMenuOptions` accept both.
- **`{return_value: null}` throws a TypeError** in `onMenuNodeInputs`, `onMenuNodeOutputs` and the node's `getExtraMenuOptions`. Elsewhere it is used as `null`: no slot menu, or `null` appended to the canvas menu.
- **`onShowNodePanel` counted every non-null result as handled,** `false` included. The panels branch (`openNodePanel`, merged into `LG/dev` while this work ran) changed it to `CallbackHandler.valueOf`: `false` now opens the built-in panel. The snapshot caught it when `LG/dev` was merged in, and was updated with that reason; the `onAddPropertyToPanel` driver was adapted to the new panel (`addRow`), with the same rule.
- **`onGetPropertyInfo` uses only object results:** a plain value is ignored.
- **The tap in `editor_build.html`:** the page loads `build/litegraph.js` and `src/` modules together, so the canvas (from `src/`) and `LiteGraph` (from the build) have different `ListenerList` copies. `LiteGraph.setDispatchTap` there reaches only the build's dispatches; the browser check set the `src/` copy directly. This mixing predates Wave 7 (see the [Wave 7 review](../audits/2026-11-22-wave7-review.md)).

## Merge into `LG/dev`

`LG/dev` had moved on to `7bf953c` (panels and widgets). It was merged into this branch first. The only conflicts were the executions index (both rows kept) and the minified bundles (regenerated). The result snapshot then showed the `onShowNodePanel` change above. After the update, `npm run check` passed, and `LG/dev` was fast-forwarded to the branch.

## Verification

| Check | Result |
|---|---|
| `npm run check`, run before each code commit | Pass. The last run, after `2f60586`, gave 881 Jest (47 suites), 125 integration, 12 builds, type consumers, export parity, declared events and declared hooks (baseline before the work: 856 Jest, 125 integration) |
| `check-types` probe | A temporary `x.processCallbackHandlers("onUndeclaredProbe", {})` in `src/lgraphgroup.js` failed with "Hooks dispatched but not declared in a hook map: onUndeclaredProbe"; reverted |
| Integration catch | `tools/tests/upstream-issues.test.mjs` ("deselectNode removes the node from selected_nodes") calls `LGraphCanvas.prototype.deselectNode` on a plain object. A first version that used a canvas method failed there; the module function fixed it |
| Benchmark (scratch `bench.cjs` against a copy of `LG/dev`'s `build_node`, Node v22.23.4, `litegraph.cjs`; load average ≈ 5) | 6 alternating rounds, base → new:<br>- no handler: 160–233 → 142–185 ns per dispatch;<br>- 1 handler: 382–515 → 367–437 ns;<br>- 5 handlers: 588–809 → 563–777 ns;<br>- `runStep` on `benchmark.json` (51 nodes): 0.163–0.203 → 0.159–0.189 ms.<br>Within noise. With a no-op tap set: 369 / 745 / 996 ns, and 0.179 ms per step |
| Browser: `apps/editor/editor_build.html` (worktree served on port 8019) | Pass:<br>- 7 extensions loaded;<br>- a real mouse click on a node in the canvas fired, in order, the registered `onSelectionChange` handler, the assigned `canvas.onSelectionChange` and `selection-changed {nodes: 1, items: 1}`;<br>- the tap reported `onMouseDown`, `onSelectionChange`, `selection-changed` and `onNodeSelected`.<br>Console errors: only the MIDI permission prompts |

The benchmark script, in a scratch directory:

```js
// node bench.cjs <build_node dir>: dispatch with 0, 1 and 5 handlers (2M calls each, warmed),
// then runStep x3000 on apps/editor/examples/benchmark.json; TAP=1 sets a no-op dispatch tap
const { LiteGraph } = require(path.join(dir, 'litegraph.cjs'));
const per = (fn, n) => { for (let i = 0; i < n / 10; i++) fn(); const t = process.hrtime.bigint(); for (let i = 0; i < n; i++) fn(); return Number(process.hrtime.bigint() - t) / n; };
per(() => node.processCallbackHandlers('onExecute', { def_cb: node.onExecute }, 1, {}), 2e6);
```

## Left open

These are also in the [roadmap](../plans/roadmap.md), Wave 7 and D8:
- doc tables generated from the declarations (the hook maps now exist to generate them from);
- step 13, the deprecation logs;
- making the rule for "handled" uniform, no earlier than 0.20; the findings above are inputs to it;
- async hooks.
