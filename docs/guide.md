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
| `ON_REQUEST` (4) | Only when a downstream node asks for fresh input: `getInputData(slot, false, true)` |

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

## Editing, undo and selection

**Undo:** wrap programmatic edits in a transaction so they undo as one step. Undo history is recorded when `LiteGraph.actionHistory_enabled` is set (the editor defaults set it).

```js
graph.transact("Add pair", () => { graph.add(a); graph.add(b); a.connect(0, b, 0); });
```

**Selection:** `canvas.selectedItems` covers nodes, groups and reroutes. `selectItem`, `moveSelected`, `deleteSelected` and `groupSelected` are one undo step each.

**Subgraphs:** `graph.convertToSubgraph(nodes)` turns nodes into a subgraph node. It creates one input per outside source and one output per inside source, and event links become event ports. `graph.unpackSubgraph(node)` reverses it. Both are one undo step, and both are in the node menu ("Convert to subgraph", "Unpack subgraph").

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

## Saving and loading

```js
const data = graph.serialize();    // JSON-safe; version 0.4, compatible with ComfyUI's layout
graph.configure(data);             // emits "configuring" (cancelable), then "configured"
```

Typed events (`graph.events.on("changed", …)`) and [callback handlers](callbacks.md) report changes.
