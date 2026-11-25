# 0007: The "handled" rule for hooks, node events and async hooks

> **Date** 2026-11-25 · **Kind** decision · **Status** accepted (roadmap D8 sub-decisions; DEC-2 in the [state audit](../../audits/2026-11-23-state-audit.md)); complements [0003](0003-event-pipe.md)

## Context

[Decision 0003](0003-event-pipe.md) put hooks and typed events on one listener core and settled the error policy, events after a veto and the wildcard scope. Three of the [event integration plan](../../plans/2026-11-22-event-integration.md#open-decisions-each-with-a-recommendation)'s open decisions stayed open:

1. **"Handled":** each of the 21 hook call sites keeps its own rule (any truthy value, exactly `true`, or `return_value`), named by `CallbackHandler.is` / `handled` / `valueOf`.
2. **Per-node `node.events`.**
3. **Async hooks** that the library awaits.

In parallel, [DEC-4](../../plans/roadmap.md#open-decisions) keeps the `legacy` paths with no removal date, so a breaking switch in 0.20 no longer fits.

## Decision

User, 2026-11-25, as recommended:

1. **"Handled" becomes strict through a setting, not a removal.**
   - A setting `LiteGraph.Hooks.StrictHandled` (`false` by default) makes every site use the strict rule: `=== true` or `return_value === true`.
   - When it is off, a site where a truthy non-`true` value decided the outcome logs a one-time warning per hook, naming the setting.
   - The default may flip in a later release, with a `CHANGES.md` note; there is no removal date.
2. **No `node.events`.** Node events stay on the graph's emitter with `{node}` in the payload. Reconsider only if WGS-05 (object events as slots) needs per-node subscriptions.
3. **No async hooks now.** Awaiting inside `configure` or `serialize` would make synchronous APIs asynchronous. A separate proposal is needed when a consumer requires it.

## Consequences

- Implemented together with the Wave 7 leftover deprecation logs (state audit N-1) on one track, because both touch `src/callbackhandler.js` and the per-site rules.
- The per-site snapshot test (`test/hook-results.test.js`) gains a strict-mode column.
- Extension authors get a clear migration path: return `true` (or `{return_value: true}`).
