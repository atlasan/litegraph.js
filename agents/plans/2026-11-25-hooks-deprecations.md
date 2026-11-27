# Hooks: generated doc tables, deprecation logs and strict "handled"

> **Date** 2026-11-25 · **Kind** plan · **Status** accepted · **Base** `LG/dev_hooks_deprecations` from `LG/dev` @ `a5e2875`

Step 5 of the [next priorities](2026-11-25-next-priorities-after-0.18.0-dev.2.md): close the two Wave 7 leftovers (state audit N-1) and implement [decision 0007](../memories/decisions/0007-hook-handled-rule.md). The hook and typed-event tables in `docs/callbacks.md` become generated from the declarations, the old hook-registry names log once, and `LiteGraph.Hooks.StrictHandled` makes every "handled" site strict on request. Nothing changes for code that does not opt in, apart from one-time log lines ([decision 0008](../memories/decisions/0008-legacy-compatibility-scope.md): deprecations only log).

## Context

- Wave 7 ([plan](2026-11-22-event-integration.md), [deferred record](../executions/2026-11-22-wave7-deferred.md)) put hooks and typed events on `ListenerList` ([decision 0003](../memories/decisions/0003-event-pipe.md)). Its step 13 (deprecations) and the generated tables of step 14 stayed open.
- The hook maps (`LiteGraphHooks`, `LGraphHooks`, `LGraphNodeHooks`, `LGraphCanvasHooks`, `LGraphGroupHooks`) and the event maps (`LiteGraphEventMap`, `LGraphEventMap`, `LGraphCanvasEventMap`) in `src/litegraph.d.cts` are already checked against `src/` by `tools/check-types.mjs`. The tables in `docs/callbacks.md` are hand-written copies of them.
- `test/hook-results.test.js` pins what each of 32 result-reading sites makes of `true`, `1`, `{return_value: true}`, `{return_value: 1}`, `false` and list results.
- Codebase map: [callbacks and events](../memories/codebase/README.md).

## Design

### 1. Generated tables

- `tools/hook-docs.mjs` parses the seven interfaces in `src/litegraph.d.cts` and renders, between `<!-- generated:… -->` markers in `docs/callbacks.md`:
  - **hooks:** one table per host, `Group | Hook | Handler arguments (after info)`; the group comes from the `// …` comment lines in the map;
  - **events:** one table per target, `Event | Detail | Notes`; the notes come from the `/** … */` comments.
- `npm run docs:callbacks` rewrites the blocks; `--check` fails when they are stale.
- **Freshness test** (`tools/tests/hook-docs.test.mjs`, in `test:integration`): the committed page equals a fresh render, and the parse finds every name `check-types` finds.

### 2. Deprecation logs

**Names:** `callbacks_handlers` (a `CallbackHandler`'s registry), `cb_handler` (a hook host's registry, read or assigned) and `callbackhandler_setup()`, the names of the event integration plan's step 13.

- Each keeps working exactly as before: `cb_handler` still creates and returns the same handler and stays assignable; `callbacks_handlers` returns the live per-name record (entries replaced by plain `{last_id, handlers}` objects keep working).
- The first use of each name in a process logs one `LiteGraph.log_warn("deprecated", …)` line that names the replacement. The library itself stops using the three names (it keeps the registry in `_cb_handler` / `_lists`), so only outside code triggers the log.
- `.d.cts`: `@deprecated` on the three members.
- **Replacements:** `registerCallbackHandler` / `onHook` / `unregisterCallbackHandler` / `hasCallbackHandlers` on the host; `LiteGraph.setDispatchTap` for tracing instead of wrapping `cb_handler.processCallbackHandlers`; nothing for `callbackhandler_setup()` (the registry is created when first needed).
- **Not deprecated:** the `CallbackHandler` class, listed in the event plan's compatibility rule 7. It is the documented home of the result helpers (`is`, `handled`, `valueOf`, `objectOf`, `fireHookThenEvent`) and stays a public export.

### 3. `LiteGraph.Hooks.StrictHandled`

- A setting (`LiteGraph.settings`, defined in `setupPlatform`), `false` by default.
- **Sites:** the snapshot shows 8 sites where a truthy value other than `true` can decide "handled":
  - node `onMouseDown`, `onDblClick`, `onDropItem` and the canvas `onDropItem` on a node (`CallbackHandler.handled`);
  - canvas `onDropItem` on the background, node `onDropFile`, canvas `onShowNodePanel` (`!!valueOf`);
  - node `onAddPropertyToPanel` (any truthy result, or a truthy `return_value`).
- They read their result through one helper, `CallbackHandler.handledAt(name, result, legacy)`:
  - `true` or `{return_value: true}` is handled in both modes (no setting read);
  - otherwise, with the setting on, not handled;
  - otherwise the site's `legacy` rule decides, and when it says handled, one `log_warn("hooks", …)` per hook name per process names the setting and the migration (`return true` or `{return_value: true}`).
- **Already strict, unchanged:** the 9 `is(r, true)` sites (keys, drawing, search box). **Not "handled" rules, unchanged:** vetoes (`is(r, false)`), the slot redirect of `onBeforeConnectInput`, the menu and slot-list results (`objectOf`), `onGetPropertyInfo` and the `onSerialize` warning.
- **Strict-mode column:** `test/hook-results.test.js` records each site a second time with the setting on; the snapshot then shows, for each site, what strict mode changes (only the 8 sites above, and only for `1` and `{return_value: 1}`).

## Scope

- In: the three parts above, their tests, `.d.cts`, `docs/callbacks.md`, `CHANGES.md` (with the upgrade note for extension authors), the roadmap Wave 7 row and D8, the codebase map.
- Out: flipping the default (a later release, decision 0007); `node.events` and async hooks (decision 0007: no); removing anything (decision 0008).

## Steps

| # | Step | Acceptance check |
|---|---|---|
| 1 | This plan, its index row | — |
| 2 | Tests first: the strict-mode column and the one-time warning in `hook-results`; the one-time deprecation logs; the doc-table freshness test | They fail on the base for the new reasons only |
| 3 | `feat:` the generator and generated blocks; the deprecation accessors; the setting and `handledAt` at the 8 sites | `bun run check` passes; the default-mode snapshot is unchanged |
| 4 | `docs:` `callbacks.md` prose, `.d.cts` notes, `CHANGES.md`, roadmap, codebase map | Docs review |
| 5 | `build:` regenerated distributions; merge the latest `LG/dev`; `npm run ci:local -- HEAD`; execution record | `Local-CI: pass …` |

## Risks and open questions

- **Log noise from deprecated reads:** code that reads `cb_handler` in a loop logs once only. Tests that exercise the old names expect the line.
- **`callbacks_handlers` moves from an own field to an accessor:** `Object.keys(handler)` no longer lists it. Nothing in the repository or in the known consumers enumerates a handler.
- **The setting needs `LiteGraph.settings`:** before `setupPlatform`, the site reads the default (`false`), the same as `ExecutionEngine.setting`.

## History

- 2026-11-25: written and accepted with the step (the recommended option for each design choice).
