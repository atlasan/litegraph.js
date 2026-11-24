# Editor examples audit

> **Date** 2026-11-23 · **Kind** audit · **Status** final · **Base** `LG/dev` @ `d47f5ef`

**Scope:** the 34 entries of `apps/editor/examples/index.json` (20 listed, 14 hidden `wip`), before the 0.18.0-dev.2 release. The manifest covers every file in the folder.

**Who and how:** a side session of the release session, in the real editor (`apps/editor/editor_build.html`, Chromium browser pane, 1024×768 page).
- **Listed examples:** loaded from the **Demo** menu, then Play (2–3 s), Stop and Step clicked, and the Button nodes or `call` widgets clicked where the example has them.
- **Hidden `wip` examples:** loaded with `graph.load`, run 0.9 s with `graph.start()`, then three `runStep` calls.
- **Probe:** a throwaway script injected into the page recorded:
  - `console.error`/`warn`, `window.onerror` and rejections;
  - `checkExecution()` under the document's model, and again on a copy set to `ancestors` after `applyExecutionModelModes()`;
  - each node's `size` against `computeSize()` (with the canvas's real text measurement);
  - overlapping node boxes (title bar included);
  - the observers (Watch, Console, Log, Progress, Plot) and drivers (Button, Trigger, Timer, widgets) present.

## Summary

- **Execution model:** no example file has `config.execution`, so **every example loads as `legacy`** (the editor shows the "Legacy (global flags)" chip). None states which model it is written for.
- **`checkExecution()`:** clean for all listed examples, under `legacy` and under `ancestors` with the model's modes applied. Only `wip` files have issues (`all-nodes` 3, `testing-objects-adv` 2, `testing-objects` 1).
- **Node sizes:** 19 of the 20 listed examples have nodes smaller than `computeSize()`: 177 of 362 nodes. Most are 1–40 px short in height, so the last widget or slot row is clipped. `copypaste` has 23 clipped titles. Positions and sizes are stored as `{"0":x,"1":y,"2":0,…}` objects (old Float32Array serialisation) in 26 of the 34 files.
- **Observability:** 7 listed examples have no Watch, Console or plot on their result (`copypaste`, `autoconnect`, `audio-delay`, `audio-reverb`, `image-fade`, `features`, `benchmark`). 3 of the examples that log only write to the browser console (`while-console`, `random-console`, `check-frame-value`), invisible in the editor.
- **Drivers:** most event examples start from a Button; `random-console` and `subgraph` from a Timer only.
- **Missing basics:** there is no small example for values and math, for FOR/WHILE/Sequence with a Button and a Watch, for strings, for objects, or for dataflow, realtime, stepped and reactive flows.

## Findings per example

Columns: nodes (inner nodes included), nodes smaller than `computeSize`, overlapping pairs, what was seen when running.

| Example | Nodes | Small | Overlap | Run in the editor | Verdict |
|---|---|---|---|---|---|
| `lg-docs` What is LiteGraph | 5 | 3 | 0 | No errors; button counts, sum watched. 27 text groups carry the notes; long ones overflow their group ("A web canvas based pixel dream"). The five nodes sit far from the notes. | Keep; resize, `ancestors`, move the nodes into a captioned group. |
| `node-execution-modes` | 19 | 11 | 0 | No errors; the four DO groups work. Group captions overflow ("OnRequest mode", the two notes). Teaches mode semantics that depend on the model. | Keep; `legacy` explicitly (it shows the legacy mode behaviour), say so in the description. |
| `check-frame-value` | 9 | 9 | 0 | No errors; "click me" sets a variable, IF reads it. The result goes only to `events/log` (browser console). | Keep; `ancestors` (its point), add Watch. |
| `while-console` | 32 | 20 | 0 | Click: only `whileSTART` logged; the loop's console output never appears in the editor; 13 variable nodes, one 2184×1027 group. A stored Console `msg` of 200 characters of junk. Unreadable at any zoom. | Rewrite as a small WHILE example (same id). |
| `random-console` | 6 | 6 | 0 | **Wrong:** logs 0.46 and 0.68 on the "true" branch of `rand > 0.7`. Under `legacy`, Rand (ALWAYS) runs again before Console reads it, so the logged value is not the one compared. Output only in the browser console. | Fix: `ancestors`, Rand ON_REQUEST, Watch on the value. |
| `features` | 10 | 4 | 0 | No errors. Demo node slots, shapes and widgets; the Log Event goes to the browser console. | Keep; resize, captions. |
| `benchmark` | 55 | 20 | 0 | No errors; four copies of `features` plus a plot. | Keep (ui, advanced); resize. |
| `copypaste` | 29 | 0 | 0 | No errors; 23 Number nodes wired into three 23-slot nodes, 23 clipped titles. Unclear purpose (a stress test of slot types). | Move to `wip` or remove (asked). |
| `autoconnect` | 10 | 10 | 0 | No errors. The instructions are group titles that overflow their groups. Needs the autoconnect extension (`editor_build.html` only). | Keep; resize, shorter captions plus a text note. |
| `html-nodes` | 29 | 22 | 0 | No errors; 5 "click me" buttons; most watches show `undefined` until clicked. | Keep; resize, captions per part. |
| `subgraph` | 11 | 9 | 0 | No errors; time passes through the subgraph to a Watch, a 2 s timer counts. | Keep; resize, `ancestors`. |
| `check-subgraph` | 32 | 12 | 0 | No errors; DO sends an event through FUNC1, watches update. Long red link across the canvas. | Keep; resize, `ancestors`. |
| `function-replication` | 24 | 1 | 2 | No errors; the `call` widget runs a function (1 → 2); 3 of 4 watches stay `undefined` until called; Watch nodes overlap the function nodes. | Keep; lay out, Watch placement. |
| `audio` | 16 | 10 | 0 | No errors; Play/Stop buttons, analyser and plot. 5 debug warnings "LGAudio onConnectionsChange skip cheking INPUT" on load. | Keep; resize. |
| `audio-delay` | 7 | 3 | 0 | Same 5 warnings; no Play or Stop; knobs titled "Knob". | Keep; label the knobs. |
| `audio-reverb` | 6 | 1 | 0 | No errors; no Play or Stop. | Keep; resize. |
| `midi-generation` | 31 | 21 | 0 | "Failed to get MIDI access" (no Web MIDI permission in the pane, expected); otherwise runs, plots notes. | Keep; resize; `needs: midi`. |
| `image-fade` | 12 | 9 | 0 | No errors; fades two images in a Frame. | Keep; resize. |
| `websocket-client` | 10 | 5 | 0 | "WS connection error" every 3 s without a server (expected). **Bug:** after loading another example the removed node keeps reconnecting. Watches overlap links. | Keep; fix the reconnect bug. |
| `cdn-libraries` | 9 | 1 | 0 | No errors until its buttons fetch from a CDN (network). | Keep. |
| `wip` (14 files) | — | — | — | `all-nodes`, `testing-jquery`, `testing-osc-*`, `three-moving-cube` have missing node types; the rest load and run with network errors only. Hidden from the menu. | Leave hidden. |

## Library findings

| # | Severity | Finding | Evidence (`path:line`) | Since |
|---|---|---|---|---|
| 1 | medium | A removed `network/websocket` node reconnects forever: `disconnectSocket()` sets `_ws = null` before the `close` event, and the `onclose` handler reconnects when `!this._ws`. Loading another example leaves a socket retrying every 3 s. | `src/nodes/network.js:220-231`, `:233-241` | Fixed in `dae2397` |
| 2 | low | Debug output on every button click: `console.warn("DBG","WidgetButton","onMouseDown",this)`. | `src/nodes/interface.js:64` | Fixed in `dae2397` |
| 3 | low | Debug warning on loading audio graphs: "LGAudio onConnectionsChange skip cheking INPUT", once per connection. | `src/nodes/audio.js:163` | Fixed in `dae2397` |

## Verdict

The examples load and mostly run, but none states its execution model, half the nodes are clipped, results often go to the browser console, and one example (`random-console`) shows a wrong result under its implicit `legacy` model. The fixes and the new examples are recorded in the [execution record](../executions/2026-11-23-editor-examples.md).
