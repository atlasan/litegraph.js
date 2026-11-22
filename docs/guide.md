# Guide

How to use the library. For the API reference, see [api/](api/index.html) (generated). For hooks, see [callbacks.md](callbacks.md). For setup and contracts, see [development.md](development.md).

## The pieces

| Class | Role |
|---|---|
| `LGraph` | The container: nodes, links, groups, reroutes; execution; serialization; undo |
| `LGraphNode` | Base of every node. Registration copies its methods onto your class, so you do not have to extend it |
| `LGraphCanvas` | Draws a graph on a `<canvas>` and handles interaction |
| `Editor` | Optional shell around a canvas: buttons, live mode, multiview (full builds) |

## Getting started

```html
<link rel="stylesheet" href="css/litegraph.css">
<canvas id="c" width="1024" height="720"></canvas>
<script type="module">
  import { LiteGraph, LGraph, LGraphCanvas } from "./build/litegraph.js";
  const graph = new LGraph();
  new LGraphCanvas("#c", graph);
  const a = LiteGraph.createNode("basic/const");
  const b = LiteGraph.createNode("basic/watch");
  graph.add(a); graph.add(b);
  a.connect(0, b, 0);
  graph.start();
</script>
```

Bundles initialize themselves. If you import from `src/`, call `LiteGraph.initialize()` after the classes load. Node.js usage is covered in [development.md](development.md#entry-points).

## Defining a node

```js
class Sum {
  static title = "Sum";
  static def = { description: "Adds two numbers", search_aliases: ["add", "plus"] };
  constructor() {
    this.addInput("A", "number");
    this.addInput("B", "number");
    this.addOutput("A+B", "number");
    this.addProperty("precision", 1);
  }
  onExecute() {
    this.setOutputData(0, (this.getInputData(0) ?? 0) + (this.getInputData(1) ?? 0));
  }
}
LiteGraph.registerNodeType("math/my_sum", Sum);
```

- **`static def`** feeds the search box and `LiteGraph.getNodeDefinition(type)`. It accepts `display_name`, `description`, `category`, `search_aliases`, `capabilities`, `deprecated`, `experimental`, `hidden`, `inputs` and `outputs`.
- **Classic statics** still work: `title`, `desc`, `title_color`, `shape`, `priority`, `skip_list`.
- **`LiteGraph.wrapFunctionAsNode(type, fn, inputTypes, outputType)`** turns a plain function into a node.
- **Optional libraries:** list them in `this.libraries` / `this.requiredLibraries`. The node's `ready` promise settles once they are loaded.

**Node fields:**

| Field | Purpose |
|---|---|
| `size` | `[w, h]` of the body, below the title |
| `properties` | User-editable values; serialized |
| `flags` | User state: `collapsed`, `pinned`, `allow_interaction`… |
| `shape` | `LiteGraph.BOX_SHAPE`, `ROUND_SHAPE` or `CARD_SHAPE` |
| `resizable`, `horizontal`, `clip_area`, `widgets_up`, `widgets_start_y` | Layout |

**Slots:**
- `node.inputs[i]` and `node.outputs[i]` hold `{name, type, link | links, label?, dir?, color_on?, color_off?}`.
- An input has at most one link. An output can have many.

## Execution

`graph.runStep()` runs one cycle; `graph.start(interval)` runs cycles continuously.

**Order:** topological. Nodes with no inputs run first; ties are broken by `priority`.

**What runs depends on `node.mode`:**

| Mode | Runs |
|---|---|
| `ALWAYS` (0) | Every step |
| `ON_EVENT` (1) | Only when an action reaches it |
| `NEVER` (2) | Never |
| `ON_TRIGGER` (3) | When an event arrives on its trigger input |
| `ON_REQUEST` (4) | Only when a downstream node asks for fresh input: `getInputData(slot, true, true)` (`force_update` re-runs the producer, `refresh_tree` first refreshes its ancestors) |

Mode 4 means ON_REQUEST here, and BYPASS in ComfyUI. `comfy_interop.js` maps between the two.

Data written with `setOutputData` is stored on the link and read with `getInputData`.

**Readiness:** `await graph.whenReady()` waits for every node that is still loading its dependencies.

## Events and actions

Event outputs fire actions on connected inputs:

```js
class Player {
  constructor() {
    this.addInput("play", LiteGraph.ACTION);
    this.addOutput("finished", LiteGraph.EVENT);
  }
  onAction(action, data) {
    if (action === "play") this.start();
  }
  onExecute() {
    if (this.done) this.triggerSlot(0);   // fires "finished"
  }
}
```

Built-in `events/*` nodes delay, count, filter and sequence events.

## Widgets

```js
this.addWidget("slider", "Gain", 0.5, (v) => {}, { min: 0, max: 1 });
this.addWidget("combo", "Mode", "red", null, { values: ["red", "green"], property: "mode" });
this.addWidget("number", "Size", 4, null, { min: 1, max: 64, step: 1, socket: true });
```

| Built-in type | Value |
|---|---|
| `number` | Drag or type a number. Arithmetic is allowed, through a safe parser |
| `slider` | A number with a slider |
| `combo` (alias `enum`) | Choose from `values` (an array or a `{label: value}` object) |
| `text` (alias `string`) | Short text |
| `toggle` (alias `boolean`) | On / off |
| `button` | Runs its callback |

**Options:** `property` binds the widget to `node.properties[name]`. Set `this.serialize_widgets = true` to save widget values.

**Widget input:** `socket: true` (or `node.addWidgetInput(widget)`) puts an input on the widget's row. While that input is linked, the widget is disabled and `node.getWidgetValue(widget)` returns the linked value.

**Custom types:** extend `BaseWidget`, implement `draw(ctx, node, width, y, H, env)` and `onPointer(event, env)`, then call `LiteGraph.registerWidgetType("mytype", MyWidget)`.

## Drawing and interaction

`onDrawBackground(ctx, canvas)` and `onDrawForeground(ctx, canvas)` draw in node coordinates: `(0, 0)` is the top-left of the body. Only the foreground is drawn in live mode.

**Pointer and key hooks:**
- `onMouseDown(e, pos, canvas)`: return `true` to consume the event.
- Also `onMouseMove`, `onMouseUp`, `onMouseEnter`, `onMouseLeave`, `onDblClick`, `onKeyDown` and `onKeyUp`.

**Link tooltips:** give the output value a `toToolTip()` method to replace `[Object]`.

**Dragging links:**
- Dropping a link on a node body connects it to the slot that is highlighted while you hover: a compatible free slot first. `LiteGraph.snap_link_to_slot = false` turns this off.
- Shift-drag from an output moves all its links. Shift-drag from a linked input moves that link.
- Dragging a link's center marker moves the link; clicking the marker opens the link menu.
- Shift-drag from a reroute starts a new link routed through it.
- The canvas emits `link-drag-start` and `link-drag-end` (`outcome`: `connected`, `rejected`, `dropped` or `cancelled`), and `link-dropped-on-empty`, which is cancelable.

```js
canvas.events.on("link-drag-end", (e) => console.log(e.detail.outcome, e.detail.link));
```

**Floating reroutes:** when a link that runs through reroutes is removed, its reroutes stay, attached to the end that remains. They are drawn dashed, saved as ComfyUI `floatingLinks`, and you can Shift-drag from them to connect again. Set `LiteGraph.keep_floating_reroutes = false` to drop them with the link.

**Dragging nodes and reroutes:** pressing a selected node or reroute keeps the selection, so the drag moves all of it, selected reroutes included. A click without a drag selects just that item. Each drag is one undo step.

**Badges and title buttons:**

```js
node.badges = [{ text: "v2" }];                                       // or functions of the node
LiteGraph.nodeBadges.register((node) => node.mode === 2 ? { text: "muted" } : null);
node.addTitleButton({ name: "run", text: "▶", onClick: (node, canvas) => node.trigger("run") });
```

Badges that would cover the title text are left out; buttons are always drawn.

| Setting | Default | Shows |
|---|---|---|
| `LiteGraph.Node.IdBadge` | off | the node id |
| `LiteGraph.Node.SourceBadge` | off | the node source, when it is not core |
| `LiteGraph.Node.LifecycleBadge` | on | "deprecated" / "experimental" |
| `LiteGraph.Group.HeaderToggle` | on | a toggle in group titles that mutes and unmutes the group's nodes |

## Editing, undo and selection

**Undo:** wrap programmatic edits in a transaction so they undo as one step. Undo history is recorded when `LiteGraph.actionHistory_enabled` is set (the editor defaults set it).

```js
graph.transact("Add pair", () => { graph.add(a); graph.add(b); a.connect(0, b, 0); });
```

**Selection:** `canvas.selectedItems` covers nodes, groups and reroutes. `selectItem`, `moveSelected`, `deleteSelected` and `groupSelected` are one undo step each.

**Subgraphs:** `graph.convertToSubgraph(nodes)` turns nodes into a subgraph node. It creates one input per outside source and one output per inside source, and event links become event ports. `graph.unpackSubgraph(node)` reverses it. Both are one undo step, and both are in the node menu ("Convert to subgraph", "Unpack subgraph").

**Subgraph definitions:** every subgraph node uses a *definition* (`node.properties.subgraph_id`), kept in the root graph's registry `graph.subgraphs`. Copies of a subgraph node in one document share their definition:
- Edit one (open it, change it, leave it) and the others follow, as one undo step; outer links stay, matched by slot id.
- "Make unique" in the node menu gives a node its own definition.
- Pasting content whose definition id is already known but whose content differs creates a new definition instead of replacing the known one.

| Setting or flag | Default | Effect |
|---|---|---|
| `LiteGraph.subgraph_format` | `"definitions"` | `"definitions"`: the ComfyUI form, where instances reference `definitions.subgraphs`. `"inline"`: instances keep their inner graph as well, so builds older than 0.10.x Wave 3 can still run them (`graph.serialize({format})` chooses per call) |
| `LiteGraph.subgraph_max_depth` | 32 | Nesting limit when loading definitions, and the call depth of function nodes |
| `LiteGraph.Subgraph.PasteLinked` | on | Pasted or duplicated subgraph nodes share their definition; off: each gets a copy |

**Working inside subgraphs:**
- **Navigation:** the ▼ title button or a double click opens a subgraph. The path at the top ("Root › Outer › Inner") is clickable: a click on an outer level leaves down to it.
- **Interface:** inside a subgraph, dropping a link from a slot on empty space offers "Add subgraph input" or "Add subgraph output". `graph/input` and `graph/output` nodes have "Move up/down in the interface", and a name already used by another slot is refused. Outer links follow renames and reorders, and so do the other linked instances.
- **Promoted widgets:** "Promote widget" in an inner node's menu shows that widget on the subgraph node. Its value belongs to that instance, and a link into the input overrides it. The definition keeps the inner widget's default.
- **Commands:** the `subgraph_tools` extension adds `litegraph.subgraph.open`, `close`, `closeAll`, `convert`, `unpack`, `makeUnique` and `removeUnusedDefinitions`.
- **Paths:** `node.getPath()` addresses a node from the root ("3:7:2"), and `graph.resolvePath(path)` finds it. `node-error` events carry the innermost failing node and its `path`.

**Components and blueprints:**
- **Components:** `LiteGraph.registerSubgraphType("my/blur", definition, {revision: 1})` makes a definition a node type: it shows in search and menus, and inserting it gives the document the definition.
- **Saving:** documents save components as plain subgraph instances (`properties.component`), so a document opens where the component is not registered.
- **Updates:** registering a higher revision shows an "update" badge on older instances. "Update from my/blur" (or `litegraph.subgraph.updateFromSource`) refreshes every linked instance as one undo step.
- **Blueprints:** `graph.insertDefinition(definition)` inserts a copy with a new id; `{linked: true}` with a document definition id shares it instead. `graph.insertBlueprint(json)` takes a definition or a whole document with `definitions.subgraphs`. The canvas menu's "Insert subgraph" lists the document's definitions.

**Function nodes:** `graph/function` calls a definition of the document. Pick it in the node's `function` combo; `call` (action input or button) pushes the inputs, runs it once, pulls the outputs and fires `done`. Each function node keeps its own state between calls. A function cannot call a definition it is inside of.

**Groups:** `group.resizeTo(items)` and `group.fitToContents()` change a group's size; `group.setNodesMode(mode)` sets the mode of every node inside. The group menu offers "Fit to contents" and "Mode for all nodes".

**Clipboard and fragments:** `canvas.serializeSelection()` returns a fragment: nodes, their links, reroute chains and the selected groups. `canvas.insertFragment(fragment, pos)` inserts it with fresh ids as one undo step, so snippets and templates use the same path as paste.

**Search:** every word must match, and results are ranked from best to weakest match: exact, prefix, whole word, alias, description. Filters can be added to the words:

| Filter | Keeps nodes |
|---|---|
| `i:number` | with an input of that type |
| `o:string` | with an output of that type |
| `c:math` | in that category or a subcategory |
| `s:core` | from that source |

Deprecated nodes are hidden unless the setting `LiteGraph.Search.ShowDeprecated` is on. `LiteGraph.nodeSearch.registerFilter(...)` adds more filters, and `LiteGraph.nodeSearch.search(text)` runs the same search without the UI.

**Default keys:**

| Key | Action |
|---|---|
| Ctrl+Z / Ctrl+Y | Undo / redo |
| Ctrl+A | Select all |
| Ctrl+C, Ctrl+V | Copy, paste |
| Ctrl+Shift+V | Paste, keeping links from unselected nodes |
| Delete | Delete selection |
| Space + drag | Pan |
| Ctrl/Shift + click | Add to selection |

With the bundled extensions (full builds, or `editor_build.html`), these keys are added:

| Key | Action |
|---|---|
| `a` | Autoconnect |
| F2 | Rename |
| Arrows | Move the selection |
| Shift+→ | Search and connect |
| Tab / Shift+Tab | Walk connected nodes |
| `f` | Focus the selection |
| Ctrl+G | Group the selection |

The `quick_connect` extension adds:
- The settings `LiteGraph.LinkRelease.Action` and `LiteGraph.LinkRelease.ShiftAction` (`context-menu`, `search-box` or `none`). They choose what a link released on empty space opens, where `LiteGraph.release_link_on_empty_shows_menu` is on.
- The command `litegraph.link.chainSelection`, which connects the selected nodes left to right.

Users can rebind keys through `LiteGraph.keybindings`.

## Extensions

```js
LiteGraph.registerExtension({
  name: "my.tools",
  setup(ctx) {
    ctx.commands.register({ id: "my.tools.hello", label: "Hello", run: () => console.log("hi") });
    ctx.keybindings.add({ combo: "ctrl+h", commandId: "my.tools.hello" });
    ctx.menus.register("canvas", () => [{ command: "my.tools.hello" }]);
    ctx.onEvent(graph, "node-added", (e) => {});              // typed event on a graph or canvas
    ctx.onCanvas((canvas, c) => c.on("onKeyDown", (info, e) => {}));  // every canvas, now and later
  },
});
```

- **Disposal:** everything registered through `ctx` is removed when the extension is unregistered.
- **Mutating commands:** `mutatesGraph: true` on a command makes each run one undo step.
- **Settings:** `ctx.settings.define({ id, default, bind })` declares a user setting. `LiteGraph.persistPlatformState()` keeps settings and user key bindings across reloads.

## Changes, saved state and execution state

```js
graph.events.on("graph-changed", (e) => e.detail.kinds);   // ["node-added"], ["link"], ["layout"], ...
graph.events.on("modified-changed", (e) => e.detail.modified);
graph.isModified;  graph.markSaved();  graph.markModified();
canvas.events.on("viewport-changed", (e) => e.detail.scale);
```

- **`graph-changed`** fires once per recorded change (one per transaction). Edits from code that record no history entry (`setProperty`, a widget value set by code) are reported once, after the current step. A change inside a subgraph also reaches the root graph with kind `"subgraph"`. A load reports `kind: "configure"`.
- **Modified:** a loaded document is clean; any change makes it modified; `markSaved()` cleans it, and undo back to the saved revision cleans it too. The Editor shows "• modified" and prefixes the page title.
- **Draft autosave (Editor):** the modified document is written to `localStorage` (`litegraph.editor.draft`) 2 s after the last change; after a reload the Editor offers to restore it and never restores silently. Settings `LiteGraph.Editor.Autosave`, `LiteGraph.Editor.AutosaveDelay`; `DraftAutosave` is usable on its own.

**Execution state** (`LiteGraph.ExecutionState`, protocol `v: 1`): one message shape for the page and the runner.

```js
{ v: 1, kind: "status" | "progress" | "error" | "reset", path: "3:7", status: "running", value: 2, max: 4, message, time }
graph.events.on("execution-state", (e) => e.detail.message);  // root graph
node.reportProgress(2, 4);  node.setExecutionStatus("running");  node.setExecutionStatus(null);
graph.applyExecutionState(messageFromRunner);
```

`runStep` sends one `done` per node (not per step) and an `error` with the failing node's path; `start()` sends a `reset`. An error in an event chain outside a step (an action from a widget, the canvas or `trigger`) is reported the same way: `node-error {error, node, path}` on the root graph and an `error` state on the failing node; it is then rethrown to the caller. The runner broadcasts the same messages as `execution_state`. The canvas draws them: a coloured title box, an outline while running or failed, a progress bar, and the error text (setting `LiteGraph.Canvas.ExecutionOverlays`). A node or definition `icon` (a glyph or an image) is drawn before the title.

## Links and the view

```js
// routers: how a link runs ("spline", "linear", "straight" built in; canvas.link_router picks one by name)
LiteGraph.linkRouters.register("diagonal", {
  path(ctx, rl, offsety) { ctx.moveTo(rl.a[0], rl.a[1]); ctx.lineTo(rl.b[0], rl.b[1]); },
  point(rl, t) { return [rl.a[0] + (rl.b[0] - rl.a[0]) * t, rl.a[1] + (rl.b[1] - rl.a[1]) * t]; },
});
canvas.link_router = "diagonal";

// styles: how a link looks right now; active ones compose in order
LiteGraph.linkStyles.register("errors-red", (rl) => rl.link?.error ? { color: "#e44", width: 4 } : null);
LiteGraph.settings.set("LiteGraph.Canvas.LinkStyles", ["spotlight", "errors-red"]);

const minimap = canvas.showMinimap();       // or the canvas menu / Alt+M
minimap.addLayer("bookmarks", (ctx, map) => { const [x, y] = map.toMap([0, 0]); ctx.fillRect(x, y, 3, 3); });
```

- **Built-in styles:** `spotlight` (links of the selection stay bright, the rest fade), `dim-by-type` (while connecting, or for `canvas.link_type_focus`), `hidden` (`link.hidden`, or types in `LiteGraph.Canvas.HiddenLinkTypes`; not drawn and not clickable), `labelled` (the link's label or type). A style returns `{visible, alpha, color, width, dash, label}`; `alpha` multiplies and `visible: false` wins.
- **Minimap:** redraws on graph, viewport, selection and execution-state events (no timer); a click or drag centres the view; layers `selection` and `execution` are built in. Setting `LiteGraph.Canvas.Minimap` remembers it.
- **Pointer:** panning (left drag on empty canvas, middle drag) is a `CanvasPointer` gesture; `DragAndScale` binds no listeners for a canvas, and `unbindEvents()` removes the ones a standalone `bindEvents` added.

## Layout and the node palette

```js
await graph.autoLayout();                                   // every node, engine from LiteGraph.Layout.Engine ("dagre")
await graph.autoLayout({ nodes: selected, engine: "layered", direction: "TB", spacing: { node: 40, rank: 80 } });
LiteGraph.layout.register("elk", LiteGraph.layout.constructor.elkEngine(new ELK()));   // elkjs, optional
```

- **One undo step** per layout; a selection keeps its top-left corner; pinned nodes stay; reroutes between moved nodes follow; groups made only of moved nodes are fitted.
- **dagre** (`@dagrejs/dagre` 3.1.3) is loaded on first use through the LibraryManager (browser: pinned CDN URL; Node: `npm install @dagrejs/dagre`). When it cannot load, the error says so and names the `layered` engine, which needs nothing.
- **Command** `litegraph.layout.auto` ("Arrange all nodes" / "Arrange selected nodes" in the canvas menu).

**Palette** (`LiteGraph.palette`): `groups({query, favoritesOnly})` (by pack, then category), `list`, `toggleFavorite` (setting `LiteGraph.Palette.Favorites`), `recent()` (`LiteGraph.Palette.Recent`), `preview(type)` and `insert(canvas, type, pos)` (one undo step). A DOM element dragged onto the canvas with the data type `LGraphCanvas.NODE_DRAG_MIME` (the value is a node type) inserts that node where it is dropped. The Editor's "Nodes" button opens a palette panel with search, favourites, recent types, previews on hover, and drag-to-canvas (setting `LiteGraph.Editor.Palette`).

## Renamed node types

The catalog cleanup (0.18) renamed some types. Documents with the old names load as the new ones (automatic replacement mappings, setting `LiteGraph.Packs.AutoReplace`), and runner settings still accept the old names.

| Old | New |
|---|---|
| `basic/watch_advanced` | `basic/watch` with `display: "text"` |
| `watch/value` | `basic/watch` with `display: "tree"` |
| `server/network/websocketserver` | `network/server/websocket` |
| `nodejs/network/SocketIO_server`, `…/OSC_server`, `…/UDP_server`, `…/osc_bridge` | `network/server/socketio`, `…/osc`, `…/udp`, `…/osc_bridge` |
| `network/SocketIO` | `network/socketio` |
| `server/process/NodeProcessInfo` | `sys/processInfo` |
| `jquery/*` (never built; the file was removed) | `jquery/select` is offered as `html/dom_selector` |

Converting nodes to a subgraph keeps reroutes: points inside the selection move into the subgraph, the others stay on the outside links; unpacking joins them again.

## Packs and missing nodes

A pack is a manifest (plain JSON) for a group of node types. The code is whatever you already imported; node types registered inside `setup` belong to the pack.

```js
const dispose = LiteGraph.packs.register(
  { id: "acme-audio", version: "1.2.0", requires: { litegraph: ">=0.10" } },
  () => LiteGraph.registerNodeType("acme/filter", Filter),
);
LiteGraph.getNodeDefinition("acme/filter").pack; // { id: "acme-audio", version: "1.2.0", builtin: false }
LiteGraph.packs.index([{ id: "far", version: "3.0.0", nodes: ["far/thing"] }]); // known, not installed
```

- **Built-in packs:** every built-in node file is a builtin pack `litegraph/<family>` (`litegraph/math`, …).
- **Provenance:** new nodes of non-builtin packs get `properties.pack` and `properties.pack_ver`; a loaded node keeps what it was saved with.
- **Missing types:** a node of an unregistered type loads as a placeholder that saves back unchanged. `graph.getMissingNodes()` lists them by type, with the pack they come from (stamp, index, or ComfyUI's `cnr_id`) and a registered replacement. The root graph emits `missing-nodes {report, reason}` after loading, and the Editor shows the report.
- **Replacements as data:**

```js
LiteGraph.registerNodeReplacement({
  old_type: "acme/old", new_type: "acme/scale",
  inputs: { x: "value" }, outputs: { y: "out" }, properties: { factor: "k" },
  set: { properties: { mode: "log" } },
  auto: false, // true: replaced while loading (our own renames)
});
graph.replaceNode(node);   // one undo step; keeps id, title, links and mapped values
graph.replaceNodes();      // every placeholder that can be replaced or rebuilt
```

A linked slot the mapping cannot place is removed and listed in `dropped`. Commands: `litegraph.nodes.showMissing`, `litegraph.nodes.replaceMissing`, `litegraph.nodes.replace` (also in the node menu).

| Setting | Default | Effect |
|---|---|---|
| `LiteGraph.Packs.Stamp` | true | Stamp nodes of non-builtin packs |
| `LiteGraph.Packs.AutoReplace` | true | Apply `auto: true` replacements while loading |
| `LiteGraph.Packs.AllowIncompatible` | false | Register a pack whose `requires.litegraph` does not match (refused otherwise, naming this setting) |
| `LiteGraph.Packs.Disabled` | `[]` | Pack ids whose `setup` does not run |
| `LiteGraph.Nodes.ShowMissingOnLoad` | true | The Editor opens the missing-nodes panel after a load |

## Saving and loading

```js
const data = graph.serialize();    // JSON-safe; version 0.4, compatible with ComfyUI's layout
graph.configure(data);             // emits "configuring" (cancelable), then "configured"
```

Typed events (`graph.events.on("changed", …)`) and [callback handlers](callbacks.md) report changes.
