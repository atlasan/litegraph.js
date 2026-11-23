# FLW-05 and FLW-06: lifecycle nodes, custom events and dispatchers

| Field | Value |
|---|---|
| Purpose | P3 Scene and game logic, P9 Education, P4 Audio (see [purposes](../purposes.md)) |
| Kind | node family + core hook (an event registry on the root graph) |
| Area | [execution flows](../landscape/execution-flows.md) |
| Inspiration | UE Blueprints (BeginPlay, Tick, EndPlay, Custom Events, Event Dispatchers); glTF KHR_interactivity (`event/onStart`, `event/onTick`, `event/send`/`receive`); Pd `send`/`receive` |
| License of the inspiration | UE: proprietary, design reference only. KHR: open standard. Babylon.js FlowGraph: Apache-2.0, adaptable with attribution. Pd: BSD-3 |
| Effort | M |
| Maturity | sketched |
| Depends on | Wave 6 (execution models, `_dispatchEvent`, `event-dropped`); Wave 7 event integration, done (the listener engine that dispatchers should run on, [plan](../../plans/2026-11-22-event-integration.md)); FLW-01 (a new scope per event entry); FLW-08 (the blueprint profile) |
| Last reviewed | 2026-11-22 |

## Why

- **Lifecycle:** `graph.start` and `stop` already send `onStart`/`onStop` to the nodes (`src/lgraph.js:486`, `:577`). No node turns them into an event line, so a user cannot write "on start, do X" without code.
- **Pause:** `onPause`/`onUnpause` are defined by the audio nodes (`src/nodes/audio.js:331`) but never sent.
- **Named events:** these exist only as subgraph IO (`graph.onAction(name)`, `graph.trigger`). There is no way to call a named event from elsewhere in the document, or to bind several handlers to one event at runtime.

These are the gaps between this fork and an event-scripting editor (Blueprints, Unity Script Graph, KHR_interactivity).

## What it would look like here

**Lifecycle sources** (`events` pack; `emit: "immediate"`; valid under every model except `legacy`, where they still work but are undeclared):

| Node | Fires | Outputs | UE | KHR |
|---|---|---|---|---|
| `events/on_start` | once on `graph.start`, and in a subgraph when its parent starts | `then` | BeginPlay | `event/onStart` |
| `events/on_tick` | every step | `then`, `dt`, `time`, `frame` | Tick | `event/onTick` |
| `events/on_stop` | on `graph.stop` | `then`, `reason` | EndPlay | — |
| `events/on_pause`, `events/on_resume` | `graph.pause()` / `resume()` (to add) | `then` | (pause) | — |

**Custom events** (the registry lives on the root graph; lookup is the current graph first, then up to the root):

| Node | Role | UE | KHR |
|---|---|---|---|
| `events/custom_event` | A named entry point. Its parameters, declared in properties, become typed outputs | Custom Event | `event/receive` |
| `events/call_event` | Calls an event by name. Its parameters become inputs; outputs `then` after the handlers return | Call (custom event) | `event/send` |
| `events/dispatcher` | A named multicast: `bind`, `unbind`, `unbind_all` and `call` actions; outputs `bound` count | Event Dispatcher | — |
| `events/bind_event` | Binds a custom event (by name) to a dispatcher at runtime | Bind Event to | — |

**How they run:**
- Each external call opens a new scope (FLW-01) through `_dispatchEvent` (`src/lgraphnode.js:1060`), so errors are reported as `node-error` with the node's path.
- A call to a missing event, or to a dispatcher with no bindings, is reported as `event-dropped` with the new reasons `no-event` and `unbound`, which name the event.
- Names and declared parameters are saved. Runtime bindings are not; they are rebuilt by the graph's own `on_start` line.
- The editor gets an "Assign" helper, as in UE: from a dispatcher, create a `bind_event` and a matching `custom_event` in one undo step.

## Prior art

- UE: [custom events](https://dev.epicgames.com/documentation/en-us/unreal-engine/custom-events-in-unreal-engine), [event dispatchers](https://dev.epicgames.com/documentation/en-us/unreal-engine/event-dispatchers-in-unreal-engine).
- KHR_interactivity: `event/onStart`, `event/onTick` and `event/send`/`receive` over an `events` array ([Babylon typedoc](https://doc.babylonjs.com/typedoc/interfaces/_babylonjs_loaders.GLTF2.InteractivityEvent)). Names alike make [3D-01](3D-01-gltf-khr-interactivity.md) close to a mapping table.
- Pd `send`/`receive`: global names, depth-first delivery ([manual](https://msp.ucsd.edu/Pd_documentation/x2.htm)).

## Open questions

- **Name scope:** root-wide with a local-first lookup (proposed), or local to a graph and its children only?
- **Order of several handlers:** binding order (UE) or node order? Binding order is proposed, recorded in the dispatcher.
- **`on_tick` under `event`** (no frame loop): driven by `graph.start`'s timer, or invalid there?
- **Parameters:** typed slots declared in properties (proposed), or inferred from the first `call_event`?

## Smallest experiment

Write `events/on_start` and `events/custom_event`/`call_event` as an external pack in `experiments/flw-events/`, using only the public API (`graph.events`, `_dispatchEvent`). Then a Jest test: `on_start` → `call_event("hit")` → `custom_event("hit")` → Watch, under `ancestors`, with the same test across a subgraph boundary.

## History

- 2026-11-22: created from the [event flows audit](../../audits/2026-11-22-event-flows-audit.md) and the donor survey.
