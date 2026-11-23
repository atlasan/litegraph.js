# Node pin states, mode 4 as Bypass, exec slots on the edges

> **Date** 2026-11-23 · **Kind** plan · **Status** done except D (debugger notes) · **Base** `LG/dev` @ `96c8cba`

The node pin (the top-left title box) shows each node's mode and run state, and has a quick menu. Mode 4 becomes BYPASS, as in ComfyUI, and ON_REQUEST moves to 5. The built-in `onTrigger` / `onExecuted` slots can sit on the node edges, and are created by default under the `ancestors` model. The step debugger is analysed and deferred. Every visual change is opt-in. This is parallel work: three tracks on `LG/dev_HMD_*` branches, no wave number.

## Context

The user's direction of 2026-11-23 asked for five things:
- pin colour, border and shape by mode and state;
- a right-click quick menu on the pin;
- the graph's own mode shown on the canvas;
- custom placement for the exec slots, and creating them automatically under `ancestors`;
- a debugger.

**State of the code at `96c8cba`** (see the [codebase map](../memories/codebase/README.md)):
- **Pin:** drawn inline in `drawNodeShape` (`src/lgraphcanvas.js:4967-5033`), with one fill chain:
  - execution status, then `boxcolor`, then a mode colour gated by `node_box_coloured_by_mode`, then a 2-frame flash;
  - no border, and the shape follows only `node.shape`.
- **Right-click on the pin** opens the full node menu.
- **The graph's model** (`root.config.execution`) appears only in the options panel.
- **Exec slots** are appended to the slot list and drawn in a body row as arrows. That is decided by their name (`:4450`, `:4551`), and nothing tests the helpers.
- **The auto-create flag** `do_add_triggers_slots` is off, and only editor presets turn it on.
- **Mode 4** means ON_REQUEST here and BYPASS in ComfyUI. Comfy imports turn it into NEVER plus `extra.comfy_bypassed` ([D5](roadmap.md)).

**Related ideas:**
- FLW-07, exec pins per document: promoted by track B;
- FLW-08, graph profiles;
- FLW-16, the flow debugger, with USE-34 and USE-42;
- GRP-03, group modes.

**User decisions (2026-11-23):**
- **Exec slots:** opt-in and configurable. An anchor (left / center / top / …) plus an offset in canvas units or `%`.
  - Default on horizontal nodes: an arrow centred on the line between title and body, at both horizontal ends.
  - Default on vertical nodes: `onTrigger` just above the pin, `onExecuted` at the bottom at the same horizontal offset.
- **Mode 4 becomes BYPASS, and ON_REQUEST moves to 5.** This is a refactor with a migration, accepted because few saved workflows use the ancestors technique.
- **The debugger** is deferred, and documented first.
- **The pin is opt-in.** Expand the existing system; propose which parts are native and which are extensions.

## Native or extension

| Piece | Where |
|---|---|
| `BYPASS = 4`, `ON_REQUEST = 5`, document migration, pass-through execution | core |
| ComfyUI mode mapping | `comfy_interop.js` |
| Exec-slot marker, geometry, layout spec, setting; the `exec_slots` rule per model | core |
| Pin geometry and hit test, `drawNodePin`, pin style registry (built-in `classic`), `node.last_run_time`, the `node-pin` menu location | core, small |
| Mode-and-state pin style, quick pin menu and its commands | extension `node_pin` |
| Graph status chip (model, running or stopped, click to switch) | extension `graph_status` |
| Step debugger | deferred: research record and [FLW-16](../ideas/catalog.md) card |

## Scope

- **In:** tracks A, B and C below, the debugger research record, and the docs and records for each.
- **Out:**
  - the debugger implementation;
  - graph profiles (FLW-08);
  - group modes (GRP-03), which can reuse BYPASS later;
  - changing the meaning of other mode numbers.

## Steps

| # | Step | Acceptance check |
|---|---|---|
| A1 | **Mode constants:** `BYPASS = 4`, `ON_REQUEST = 5`; `NODE_MODES` and `NODE_MODES_COLORS` with 6 entries | Tests on the constants; every `LiteGraph.ON_REQUEST` use is unchanged |
| A2 | **Migration in `LGraph.configure`** (root and subgraph definitions), logged once with a count:<br>- a document written by this runtime before the change (`litegraph_version` older than the cutoff): 4 becomes 5;<br>- an unmarked document: 4 stays BYPASS, unless the setting `LiteGraph.Compat.UnmarkedMode4` is `"on_request"`;<br>- `tools/migrate-modes.mjs` migrates files on disk, including the repo's 9 examples and fixtures | Migration matrix tests; execution goldens unchanged |
| A3 | **Bypass execution:** `ExecutionEngine.passThrough`, in the legacy and non-legacy paths:<br>- data goes from the input whose type matches, preferring the same index;<br>- events are forwarded to the EVENT outputs;<br>- the node passes through on its step turn and when pulled;<br>- BYPASS is valid under every model | Pass-through tests per model |
| A4 | **ComfyUI interop:**<br>- 4 imports as BYPASS, and older `comfy_bypassed` lists are honoured;<br>- BYPASS exports as 4, and ON_REQUEST as ALWAYS plus `litegraph_mode: 5`;<br>- an old marker `litegraph_mode: 4` reads as 5 | Round-trip tests |
| A5 | **Rules and records:**<br>- `AGENTS.md` mode rule;<br>- decision 0004, superseding D5;<br>- `CHANGES.md` breaking note;<br>- codebase map | Docs match the code |
| B1 | **Exec-slot marker:** `slot.exec`, and `LiteGraph.isExecSlot` (older saves recognised by name and helper flags; the Branch node's own `onTrigger` is not caught). Slot indices never change | Helper tests, saved indices unchanged |
| B2 | **Layout:** setting `LiteGraph.Node.ExecSlotLayout`:<br>- `"rows"` (default), `"edges"`, or an object of anchors plus offsets (units or `%`);<br>- a per-node override;<br>- one geometry function used by `getConnectionPos`, the row counts, the sizes, drawing and the hit test | Position tests for both orientations; hit and drop tests |
| B3 | **Auto-create per model:**<br>- a rule `exec_slots` (true for `ancestors`);<br>- setting `LiteGraph.Node.ExecSlots` (`auto` / `on` / `off`);<br>- an explicit `do_add_triggers_slots` still wins;<br>- a refused ON_TRIGGER is reported, not silent | `connect(..., -1)` tests per model |
| C1 | **Core pin:**<br>- `drawNodePin` and `isOverNodePin`;<br>- the style registry with `classic`, matching today's chain;<br>- setting `LiteGraph.Node.PinStyle`;<br>- `node.last_run_time`;<br>- right-click on the pin opens the `node-pin` menu location (the node menu when nothing is contributed) | Classic colours equal today's; routing tests |
| C2 | **Extension `node_pin`:**<br>- the `modes` style: shape and colour per mode, plus state rings for running, recent run, error and queued;<br>- commands to set the mode, toggle bypass, toggle mute, run and show info (one undo step each);<br>- the pin menu | Command tests; browser check |
| C3 | **Extension `graph_status`:** a chip with the model title and the run state, and a click menu to switch the model or start and stop | Model switch test; browser check |
| C4 | **Defaults:** off in the library, on in the editor | Editor-defaults test |
| D1 | **Debugger depth analysis:**<br>- engine facts, options (native debug flag, record and replay, generators, Worker + `Atomics.wait`), events and API sketch, UI design, donors;<br>- the FLW-16 card | Record and card written; deferred on the roadmap |

**Order:**
- A goes first.
- B runs after A on its own branch, because it shares `lgraphnode.js` and `execution.js` with A.
- C needs A's BYPASS.
- D is docs only and runs in parallel.

**Branches:** `LG/dev_HMD_modes`, `LG/dev_HMD_exec_slots`, `LG/dev_HMD_node_pin`, each merged into `LG/dev` with `--no-ff` after `npm run check`.

## Risks and open questions

- **Unmarked fork documents** from before 2026-11-18 (no `litegraph_version`) that used mode 4 as ON_REQUEST now load it as BYPASS. The setting and `tools/migrate-modes.mjs` cover them, and the CHANGES note says so.
- **Older litegraph builds** reading a new document see mode 5 as unknown. They have no ON_REQUEST either.
- **Edge slots outside the node box** (the top slot of a vertical node) need a hit-test margin.
- **Bypass pass-through between types** that match only loosely (`*`, `""`) takes the first compatible input, the same index first.

## History

- 2026-11-23: proposed and accepted; the user decided the exec-slot geometry, the mode renumbering, deferring the debugger, and opt-in visuals.
- 2026-11-23: tracks A, B and C done and merged into `LG/dev` ([record](../executions/2026-11-23-node-pin-modes-exec-slots.md)).
  - **Changes during the work:**
    - nodes with exec slots on the edges get a half-slot hit-test margin, because a drop above the pin was missed;
    - vertical nodes keep the pin column free;
    - the pin style registry lives on `LiteGraph`, because pages mixing the bundle and `src/` load two copies of the classes.
  - **D (the debugger notes)** was proposed as its own session.
