# Examples and starter workflows

The editor's **Demo** menu lists examples by category. Choose one to load it and show a collapsible explanation at the bottom left. The six essentials lessons include steps, an expected result and relevant settings. Older examples and pack templates show their existing descriptions. Selecting another example replaces the current graph; save or download your work first.

Use `npm run editor` and open `/editor/editor_build.html` for the extensions and key bindings. **Step** runs one graph cycle; **Play** runs continuously. Network and audio examples have external prerequisites; an organized inventory of arbitrary nodes is not necessarily a runnable graph.

## Essentials lessons

| Lesson | What to try | Expected result |
|---|---|---|
| Boolean: value and toggle action | Step, edit the boolean widget, or click Toggle | The watched boolean follows the stored value; each action inverts it |
| Watch: structured values | Step, edit the JSON, compare auto/value/tree displays | Auto shows declared and observed type plus a bounded object preview |
| Watch: multiline text | Step, change the string or Watch font size | Three readable lines with adjustable presentation |
| Widget input: linked value | Step, then disconnect the linked number input | Output is 7 while linked and returns to the saved local value 2 when disconnected |
| Bypass: pass a value through | Step with ABS bypassed, then choose Always and Step | Output changes from -3 to 3 |
| Slot icons: readable and compact | Compare glyph+text and glyph-only; right-click the socket | Original names/types remain available; watched value is 42 |

The source graphs are in `apps/editor/examples/essentials/`. Their manifest entries in `apps/editor/examples/index.json` carry `guide.steps`, `guide.expected` and `guide.settings`. The editor renders this metadata as plain text. Pack templates retain the existing `description` field.

## Coverage and next additions

| Feature | Current example coverage | Remaining opportunity |
|---|---|---|
| Boolean values/actions, watch displays and linked widget fallback | Six essentials lessons above | More common-node recipes and boundary cases |
| Execution modes and ancestors/event flows | Node execution modes; Event chain reads fresh values; WHILE loop; Timer, random and branch | Focused explanations for every execution model |
| Subgraphs and function nodes | Subgraph; Events across subgraph boundaries; Function nodes | Explain promoted widgets, linked definitions and updates |
| Editor widgets, clipboard and autoconnect | Node features; Copy and paste; Autoconnect extension | Focused groups/reroutes, panels and undo lessons |
| Audio, MIDI, graphics, network | Existing category examples | Broader per-pack examples with explicit environment prerequisites |
| Current and expanding node packs | Starter workflow tool enumerates the live registry | Curated connected examples and updates to edited generated graphs |

The integration suite loads every visible example and checks execution declarations. Runnable examples step under `ancestors` and compare link-value snapshots; network/audio examples load and check without contacting services. `npm run test:integration` runs these checks. The six essentials also have focused interaction checks in Jest and browser acceptance recorded under `agents/executions/`.

## Generate a starter from a section or pack

Click **Starter workflow** in the existing editor. Choose a **Node pack**, a **Section**, or their intersection. The preview lists every registered type in scope, its description/usage, and any reason it will be skipped. Missing descriptions receive clearly marked starter suggestions. The tool does not construct nodes during preview.

**Add nodes to workflow** inserts one available node of each type, in rows grouped by category, below your current content. It creates no connections, starts no playback and preserves existing nodes. Stop a running graph first. Insertion is one undo step; as with other edits, a fresh graph needs an earlier saved history entry to have an undo baseline.

**Export metadata** downloads the current scope and entries as JSON (`litegraph-starter-metadata`, version 1), including proposed descriptions and skip reasons. The graph's normal Save/Download controls save the generated workflow itself. **Refresh packs** reads the live registry again after a pack registers new types; generate a fresh starter to explore the expanded pack. Updating a manually edited starter in place remains future work.

Hidden/deprecated types, subgraph interface types, unsupported types and nodes declaring device/DOM/network or other individual-setup capabilities are reported as skipped. Constructors that fail are reported after insertion; unexpected graph insertion failures roll the operation back. Capability filtering depends on the pack's declarations and does not sandbox third-party constructors. The runner's existing execution policy remains authoritative when a graph is sent to it.

For embedders, `LiteGraph.palette.starterPreview({pack, category})` returns metadata without constructing nodes; `insertStarter(canvas, {pack, category})` returns `{nodes, skipped, entries}`. Pack and category filters are optional; categories include descendants. The UI remains part of the existing editor/runner direction, with no new runner shell or automatic wiring contract.
