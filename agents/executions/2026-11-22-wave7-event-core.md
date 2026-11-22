# Wave 7: event integration, the core

> **Date** 2026-11-22 · **Kind** execution · **Status** final · **Base** `LG/wave7_events` from `LG/dev` @ `b6bcc1d` · **Plan** [event integration](../plans/2026-11-22-event-integration.md)

Hooks (CallbackHandler) and typed events now run on one listener core, `ListenerList` in `src/eventtarget.js`. The work followed the [plan](../plans/2026-11-22-event-integration.md), with the user's direction: "the legacy litegraph and other projects use direct replacement of the common `.onX` functions … keep compatibility high … concise, elegant, best effort".

Every `onX` contract is kept:
- an assigned `onX` (on the instance, on the prototype, or `LiteGraph.onX`) is still the default callback of the chain;
- ids stay numeric;
- `processCallbackHandlers` returns the same values;
- `callbacks_handlers[name].handlers` keeps its shape.

## Changes

- `88d44aa` `feat:` the core and its uses:
  - **Core and mixin:**
    - `ListenerList`: copy-on-write, priority, `signal`;
    - `CallbackHandler.run`, which only calls `onX` when no handler is registered and isolates errors, rethrowing the first one after the chain;
    - `installHooks` on `LiteGraph`, `LGraph`, `LGraphNode`, `LGraphGroup` and `LGraphCanvas`, with the registry created on first registration;
    - `onHook`, `hasCallbackHandlers`, and the `once` and `signal` options.
  - **Results:** `CallbackHandler.is`, `handled` and `valueOf`, migrated at 21 call sites, each keeping its rule.
  - **Events:**
    - `LiteGraph.events`: `node-type-registered`, `node-type-replaced`, `node-type-unregistered`, `graph-created` and `canvas-created`;
    - `group-added` and `group-removed`;
    - `"*"` listeners and listener `priority`;
    - `ctx.listen` in the extension context.
  - **Hooks:**
    - selecting or deselecting a group or reroute fires `onSelectionChange`;
    - the node panel's `onAddPropertyToPanel` and `onShowCustomPanelInfo` are dispatched as hooks.
  - **Fixes:** E12 (a drop on a node without `onDropItem` threw) and E13 (mouse down ran the `onClear` hook instead of `onMouse`).
  - **Build and checks:**
    - `build.py` puts `eventtarget.js` and `callbackhandler.js` before `litegraph.js`, because the bundles concatenate the files in order;
    - `check-types` fails when an emitted event is not declared. It found `link-drag-start` and `link-drag-end` missing from the canvas map.
  - **Tests:** `test/hook-pipeline.test.js` (34 tests).
- `docs:` `callbacks.md`, `CHANGES.md`, the codebase map, the roadmap, the plan's History, decision [0003](../memories/decisions/0003-event-pipe.md) and this record.
- `build:` regenerated distributions.

## Verification

| Check | Result |
|---|---|
| `npm run check` | Pass: 837 Jest (44 suites; 803 before plus 34 new), 99 integration, 12 builds, type consumers, export parity, declared events |
| Compatibility | All existing hook, event and extension tests pass unchanged (`callback-handler`, `typed-events`, `platform`, `html-lifecycle`, `async-cleanup` and the rest). New tests cover: direct `onX` replacement before and after registering handlers, prototype and `LiteGraph.onX` defaults, and the same return values with and without handlers for `undefined`, `null`, `false`, `0`, `true`, strings and objects |
| Benchmark, 3 alternating rounds against `LG/dev`'s `build_node` (Node v22.23.4) | No handler: 279–424 → 46–130 ns per dispatch. 1 handler: 336–407 → 192–213 ns. 5 handlers: 514–553 → 292–353 ns. `runStep` on `benchmark.json` (51 nodes): 0.142–0.168 → 0.119–0.143 ms per step |
| Browser: `editor_build.html` (worktree served on port 8017) | Pass:<br>- 7 extensions loaded;<br>- `LiteGraph.events` "*" saw `node-type-registered`;<br>- group select and deselect fired the hook twice and the event twice;<br>- a drop on a node returned `false` and did not throw;<br>- an `onExecute` replaced directly ran in `runStep`;<br>- a real mouse drag in the Features demo fired a registered `onNodeMoved` hook once.<br>The only console errors are MIDI permission prompts, unrelated |

## After review

The [Wave 7 review](../audits/2026-11-22-wave7-review.md) found no semantic difference in `processCallbackHandlers` over 60,000 fuzzed scenarios. It found 5 compatibility edges, fixed in `0f5bf77`:
- `cb_handler` is readable again;
- a legacy `onAddPropertyToPanel` that returns an object still counts as handled;
- `once` handlers no longer run twice when a handler dispatches the same name again;
- removed listeners are detached from their `AbortSignal`;
- the declarations match the runtime.

`LG/dev` (the flows track) was merged in as `c104933`. After both, `npm run check` passes: 843 Jest, 103 integration, 12 builds. The browser check was repeated and passed.

## Left open

These are also in the [roadmap](../plans/roadmap.md), Wave 7 and D8:
- the per-site result snapshot and the order golden (plan steps 2–3);
- one order for paired hooks and events, and skipping the event after a veto (step 9);
- the dispatch tap for the execution trace (USE-34);
- typed hook-name maps;
- generated doc tables;
- the `return_value` sites that read menu arrays, which still unwrap by hand;
- making the rule for "handled" uniform, no earlier than 0.20;
- async hooks.
