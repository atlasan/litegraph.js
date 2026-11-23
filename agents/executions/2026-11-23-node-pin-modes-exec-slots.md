# Node pin, modes and exec slots (tracks A–C)

> **Date** 2026-11-23 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `96c8cba` · **Plan** [node pin states, mode 4 as Bypass, exec slots on the edges](../plans/2026-11-23-node-pin-modes-exec-slots.md)

Three tracks of the plan ran one after another on `LG/dev_HMD_*` branches. Each was merged into `LG/dev` with `--no-ff` after `npm run check` and a browser check passed.
- **A:** mode 4 became BYPASS (as in ComfyUI) and ON_REQUEST moved to 5, with a migration on load ([decision 0004](../memories/decisions/0004-mode-4-bypass.md)).
- **B:** the built-in exec slots can sit on the node edges, and dropping an event link creates them under `ancestors`.
- **C:** the node pin shows the mode and run state and has a quick menu, and a chip shows the graph's execution model.

Track D (the debugger analysis) was proposed as its own session and is not part of this record.

## Changes

**A, `LG/dev_HMD_modes`** (merged as `37b3caf`):
- `0339465` `feat:`:
  - **Constants:** `BYPASS = 4`, `ON_REQUEST = 5`, `MODES_VERSION = 2`.
  - **Pass-through:** `ExecutionEngine.passThrough` / `bypassSource` in `doExecute`, `actionDo`, both delivery paths, step turns and pulls.
  - **Migration:** `LGraph.migrateModes` in root `configure`, with the markers `litegraph_version` and `litegraph_modes`, and the setting `LiteGraph.Compat.UnmarkedMode4`.
  - **ComfyUI:** mode 4 is native.
  - **Tool:** `tools/migrate-modes.mjs` migrated the test fixtures.
- `01b53cd` `chore:` editor examples migrated.
- `97f67cc`, `0be6a83` `docs:`.
- `d76db6d` `build:`.

**B, `LG/dev_HMD_exec_slots`** (merged as `2c21b0b`):
- `7876b55` `feat:`:
  - **Marker:** `slot.exec` and `LGraphNode.isExecSlot`.
  - **Layouts:** `LiteGraph.execSlotLayouts`, setting `LiteGraph.Node.ExecSlotLayout` (`rows` or `edges`), anchors plus offsets.
  - **Geometry:** one function, `getExecSlotPos`, used by connection positions, rows, sizes, link directions, arrows and hit tests. Vertical nodes keep the pin column for it.
  - **Creation:** `ExecutionEngine.execSlotsFor` and the model rule `exec_slots`, with the setting `LiteGraph.Node.ExecSlots`.
  - **Fix:** the node menu threw when a `getMenuOptions` hook returned a short list.
- `fa62ac6` `docs:`.
- `2b81247` `build:`.

**C, `LG/dev_HMD_node_pin`:**
- `feat:` (this merge):
  - **Core:** `drawNodePin`, `isOverNodePin`, the pin style registry, `node.last_run_time`, the `"node-pin"` menu location.
  - **Extensions:** `node_pin` (the `modes` style, quick menu, commands with Ctrl+B and Ctrl+M) and `graph_status` (the chip).
  - **Editor:** both on by default.
- `docs:` and `build:` follow.

## Verification

| Check | Result |
|---|---|
| `npm run check`, track A | Pass: 954 Jest, 134 integration, 12 builds. Execution goldens unchanged except the migrated mode numbers (48 lines) |
| `npm run check`, track B | Pass: 967 Jest, 134 integration, 12 builds |
| `npm run check`, track C | Pass: 978 Jest, 134 integration, 12 builds |
| Browser, A: `editor_build.html` | Pass:<br>- the Mode menu lists Always, On Event, Never, On Trigger, Bypass, On Request;<br>- a const 3 into a multiply by 10 gives 30, and 3 when the multiply is bypassed;<br>- `node_execution_modes.JSON` loads its counter as On Request, and an old-numbered copy of it is migrated |
| Browser, B | Pass:<br>- `edges` puts the arrows on the title/body line at both ends;<br>- an event link dropped on a node created `onTrigger` and switched it to On Trigger, and the trigger ran it and fed `onExecuted`;<br>- on a vertical node the arrows sit above the pin and at the bottom, and the other slots leave that column;<br>- real mouse drags onto the left-edge slot and onto the slot above the pin connected (the second needed the half-slot margin added during the check) |
| Browser, C | Pass:<br>- six distinct pins by mode;<br>- right-click on the pin → quick menu → Bypass set the mode;<br>- Mode ▸ → On Request;<br>- the chip shows "Ancestors (pull)", and its menu switched to Step and started the graph: green dot and border, run glow on the Timer and Counter pins.<br>The chip menu first showed the model descriptions, because ContextMenu renders `title`; fixed before the commit. Console: only MIDI permission errors |

## Left open

- **D:** the debugger depth analysis and the FLW-16 card, proposed as their own session.
- **Unmarked files from builds older than 2026-11-18** load mode 4 as BYPASS until `LiteGraph.Compat.UnmarkedMode4` or the tool is used.
- **The `modes` pin ignores `node_box_coloured_*`;** those flags feed only `classic`.
- **The pre-release `0.18.0-dev.2`** was checked at `ce8c231`. `LG/dev` now holds this track too, so the release either tags the checked commit or repeats its checks.
