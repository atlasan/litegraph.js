# Wave 7 review: the event core

> **Date** 2026-11-22 · **Kind** audit · **Status** final · **Base** `LG/wave7_events` @ `88d44aa` (the `feat:` commit; fixes in `0f5bf77`)

**What was reviewed:** the Wave 7 change ([plan](../plans/2026-11-22-event-integration.md), [record](../executions/2026-11-22-wave7-event-core.md)), meaning commit `88d44aa`, against `b6bcc1d`.

**By whom:** an independent review agent spawned by the implementing session. It was given the code and the intent but not the implementer's conclusions. It read the code with `git show` and edited nothing in the repository.

**How:**
- **Differential fuzz:** the old and new `processCallbackHandlers` were run side by side on 60,000 random scenarios. The fuzz is sensitive: changing `>=` to `>`, or `< 0` to `<= 0`, each produced thousands of mismatches.
- **Case analysis** of every replaced result check.
- **Probes:** ESM import order, the six `build_node` bundles, and `tsc` against the declarations.

The implementing session then fixed the findings, ran the full gate and repeated the browser check.

## Findings

| # | Severity | Finding | Evidence (`path:line` at `88d44aa`) | Since |
|---|---|---|---|---|
| 1 | medium | **`cb_handler` was created lazily, so direct reads broke.** `new LGraph().cb_handler` was `undefined` (LGraphNode: `false`) until a handler was registered. Code that reads `x.cb_handler.callbacks_handlers` or calls `x.cb_handler.registerCallbackHandler` threw | `src/callbackhandler.js:166-167`; constructors no longer call `callbackhandler_setup()` | Fixed in `0f5bf77`. `cb_handler` is a prototype getter and setter that creates the handler on first read; dispatching alone still allocates nothing. `callbacks_handlers[name]` exists only for names that had a handler registered (in `CHANGES.md`) |
| 2 | low–medium | **`onAddPropertyToPanel`: a legacy callback that returns an object** (for example the element from `panel.addWidget`) no longer counted as handled, so the default widget was added twice | `src/lgraphcanvas.js:9203-9206` | Fixed in `0f5bf77`. Any truthy legacy result counts as handled; a `{return_value}` object counts by its value. A test covers it |
| 3 | low | **Declarations did not match the runtime:**<br>- the `CallbackHandler` interface inherited `onHook`, which the class did not have;<br>- `events.once("*")` had no overload | `src/litegraph.d.cts:2142`, `:1392` | Fixed in `0f5bf77`. `CallbackHandler.onHook` was added, there is a `once("*")` overload, and `cb_handler` is declared on hosts but not on `CallbackHandler` |
| 4 | low | **Removed listeners stayed attached to their `AbortSignal`,** so a long-lived signal kept them alive. Typed events already did this before Wave 7 | `src/eventtarget.js:32` | Fixed in `0f5bf77`. `remove()` detaches the entry. A test counts adds and removes |
| 5 | low | **A re-entrant dispatch could run a `once` / `call_once` handler twice.** The old code did this too | `src/callbackhandler.js:129-131`; `src/eventtarget.js:127` | Fixed in `0f5bf77`. A handler whose removal fails is skipped. Tests cover hooks and typed events |
| 6 | low | **An explicit `priority: undefined` sorted first** in the old code (a `NaN` comparison, which depends on the engine); it now counts as 0 | `src/eventtarget.js:29` | Kept. The new order is the documented one |

**Suspicions that were acted on** (none was reproduced as a failure):
- An overridden `cb_handler.processCallbackHandlers` (a tracing wrapper) was bypassed. **Now honoured.**
- `on()` kept the caller's options object, so later changes to it altered the listener. **It is now copied.**
- A `callbacks_handlers[name]` replaced by a plain object made the next registration throw. **The plain object is now adopted.**
- A `"*"` listener turns on reports that are skipped when nobody listens. **Documented in `callbacks.md`.**

**Checked and correct:**
- **Fuzz:** no difference between old and new `processCallbackHandlers` in return identity, ids, call order, `this`, the `on_result` sequence and the `info` contents.
- **Result checks:** every replacement at the 21 sites is exactly equivalent, except for the two intended fixes (E12, E13).
- **Load order:** every import order is safe, and so is the order of the concatenated bundles.
- **Registered classes** that don't extend LGraphNode receive the hook methods.
- **Edge cases of typed events:** `once` with `"*"`, `off("*")`, an already aborted signal, priority order.
- **`ctx.listen`** routes every hook name dispatched in `src/`.
- **`check-types`** covers every `_emit` call.

## Verification after the fixes (`0f5bf77`, on top of `LG/dev` merged as `c104933`)

| Check | Result |
|---|---|
| `npm run check` | Pass: 843 Jest (44 suites), 103 integration, 12 builds, types, declared events |
| Benchmark, alternating against `LG/dev`'s old `build_node` | No handler: 299–457 → 95–101 ns per dispatch. 1 handler: 481–516 → 235–313 ns. 5 handlers: 764–936 → 462–506 ns. `runStep` on `benchmark.json`: about 10% faster. The machine was busier than in the first run |
| Browser: `editor_build.html` | Pass: 7 extensions; a directly replaced `onExecute` ran in `runStep`; a real mouse drag fired a registered `onNodeMoved` hook once. Console errors: only MIDI permission prompts. The page mixes `build/litegraph.js` with `src/` modules, so its graph comes from a different copy of the classes than `LiteGraph.CallbackHandler`; this was already the case before Wave 7 |

## Verdict

The compatibility requirement holds:
- an assigned `onX` stays the default callback, with the same arguments, `this`, return values and order;
- `cb_handler` is readable and assignable on every host, as before;
- ids stay numeric.

The one remaining difference, `callbacks_handlers[name]` existing only for names that had a handler, is listed in `CHANGES.md`. The branch is ready to merge into `LG/dev`. Follow-ups stay in the [roadmap](../plans/roadmap.md) (Wave 7, D8).
