# 0003: One listener core for hooks and typed events

> **Date** 2026-11-22 · **Kind** decision · **Status** accepted

## Context

Three channels let code react to the library:
- the legacy `onX` properties, one function each, which this library and the projects built on it replace directly;
- CallbackHandler hooks, with priority, veto and result merging, where the `onX` property runs as the default callback;
- typed events (`graph.events`, `canvas.events`), which observe only and isolate listener errors.

They overlapped without a defined order, and the hook side had robustness defects:
- registering a handler during a dispatch re-ran handlers or never returned;
- a throwing handler aborted the chain;
- every dispatch cost about 30× a direct call.

Evidence: the [event handling audit](../../audits/2026-11-22-event-handling.md). The [integration plan](../../plans/2026-11-22-event-integration.md) has the full design.

## Options

| Option | For | Against |
|---|---|---|
| A. One core, two faces: hooks intercept, typed events observe, both built on one listener list | Keeps every `onX` and hook contract. Fixes the defects once, for both | Two APIs remain, and the docs must say which one to use |
| B. Typed events only: hooks become cancelable `before-*` events, `registerCallbackHandler` becomes a shim | One API | Breaks result merging and the direct `onX` replacement that legacy projects use. About 160 call sites to rewrite |
| C. Fix in place, keep the two implementations separate | Smallest change | Duplicated listener logic that keeps drifting apart |

## Decision

**A**, chosen by the user, with compatibility first.

`ListenerList` (`src/eventtarget.js`) is the shared core:
- entries are ordered by priority, then by registration;
- every change replaces the list instead of mutating it (copy-on-write);
- it supports `signal`.

`CallbackHandler` and `LGraphEventTarget` both store their listeners in it. `installHooks(Class)` gives `LiteGraph`, `LGraph`, `LGraphNode`, `LGraphGroup` and `LGraphCanvas` the same hook methods.

**The hook chain:**
- When no handler is registered, a dispatch only calls `onX`.
- A handler that throws does not stop the chain. The **first error is always rethrown** after the chain, so callers such as `runStep` still see it and report `node-error`.

**Stays as it was:** assigning `onX`, the numeric ids, the raw return value of `processCallbackHandlers`, and every event name and payload.

## Consequences

- Extensions and legacy code can keep replacing `onX`. New code can use `onHook` (which returns a disposer), `ctx.listen` (both kinds) and `"*"` listeners.
- Read hook results through `CallbackHandler.is`, `handled` and `valueOf`, not by hand.
- Still to do, in the [roadmap](../../plans/roadmap.md) (Wave 7, D8):
  - one order for paired hooks and events, skipping the event after a veto;
  - typed hook names;
  - a dispatch tap for the execution trace;
  - one rule for "handled", no earlier than 0.20.
