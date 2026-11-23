# 0004: Mode 4 is BYPASS, ON_REQUEST is 5

> **Date** 2026-11-23 · **Kind** decision · **Status** accepted (supersedes roadmap decision D5)

## Context

**Two meanings of mode 4:**
- This library used mode 4 for ON_REQUEST, a node that runs only when a consumer needs its data. It was added in 2024, and the `ancestors` execution model (Wave 6) is built on it.
- ComfyUI uses 4 for BYPASS: the node passes its inputs on to its outputs, as if it were a wire.

**What D5 decided** ([roadmap](../../plans/roadmap.md)):
- keep BYPASS as interop only, so a ComfyUI import turned it into NEVER and remembered the nodes in `extra.comfy_bypassed`;
- give a native bypass a new number (5).

**Why the user revisited it (2026-11-23):**
- the pin quick menu needs a real Bypass;
- staying close to ComfyUI is worth a renumbering;
- few saved workflows use the ancestors technique yet.

## Options

| Option | For | Against |
|---|---|---|
| A. BYPASS = 5 (D5) | No renumbering; old documents unchanged | ComfyUI's 4 still needs translating both ways; a bypassed node exported to ComfyUI must be remapped; two numbers for one concept across the ecosystem |
| B. Bypass as a node flag | No mode number at all | Not a mode, so the Mode menu, mode colours and declarations cannot show or validate it; ComfyUI stores it as a mode |
| **C. BYPASS = 4, ON_REQUEST = 5** | The same numbers as ComfyUI for modes 0 to 4; no translation; bypass behaves like a mode everywhere | Documents saved with ON_REQUEST = 4 need a migration; older builds do not know mode 5 |

## Decision

**Option C, with a migration that keeps old documents working:**
- **The constants:** `LiteGraph.BYPASS = 4`, `LiteGraph.ON_REQUEST = 5`, `LiteGraph.MODES_VERSION = 2`.
- **The marker:** saved documents carry `litegraph_modes: 2`.
- **The migration:** `LGraph.migrateModes(data)` runs in `configure` for the root graph, its nested subgraphs and its subgraph definitions.
  - **Marked** (`litegraph_modes` 2 or more): nothing changes.
  - **Written by this library before the change** (`litegraph_version` but no `litegraph_modes`): 4 becomes 5, and nodes listed in `extra.comfy_bypassed` go from NEVER to BYPASS.
  - **Unmarked** (ComfyUI, upstream litegraph, other editors): 4 stays BYPASS.
    - The setting `LiteGraph.Compat.UnmarkedMode4` (`"bypass"` by default, `"on_request"`) covers files saved by builds older than 2026-11-18, which wrote no `litegraph_version`.
    - `tools/migrate-modes.mjs` rewrites such files and refuses to guess: unmarked files need `--unmarked`.
- **Pass-through** (`ExecutionEngine.passThrough`):
  - **Data:** a bypassed node gives each data output the value of the input whose type fits. The input at the same index wins, then the first fitting input; with no fitting input the output is `undefined`.
  - **Events:** an event that reaches the node goes on to its connected event outputs at once, in every model.
  - **When it runs:** on its step turn and in pulls.
  - **What it does not run:** its own code (`onExecute`, `onAction`, `onAfterExecuteNode`) and `onStart`.
  - **Modes:** BYPASS is valid under every execution model, like NEVER.
- **ComfyUI interop:**
  - mode 4 imports and exports unchanged;
  - ON_REQUEST exports as ALWAYS with `litegraph_mode: 5`;
  - an old `litegraph_mode: 4` marker reads as ON_REQUEST.

## Consequences

- **Easier:**
  - a ComfyUI round trip no longer translates mode 4;
  - Bypass appears in the Mode menu, the node panel and mode colours with no extra code;
  - group modes (GRP-03) can reuse BYPASS.
- **Harder:**
  - an unmarked file from an old build loads its ON_REQUEST nodes as bypassed until the setting or the tool is used;
  - a document saved now and opened in an older build has mode 5 nodes it does not know.
- **Changed:**
  - `AGENTS.md` (the mode rule), the guide and architecture pages, `comfy_interop.js`;
  - the repo's examples and fixtures, migrated with the tool;
  - the roadmap (D5 superseded);
  - `CHANGES.md`, which carries an upgrade note.
