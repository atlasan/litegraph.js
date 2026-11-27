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

- **`static def`** feeds the search box and `LiteGraph.getNodeDefinition(type)`. It accepts `display_name`, `description`, `usage` (a short how-to), `category`, `search_aliases`, `capabilities`, `deprecated`, `experimental`, `hidden`, `inputs`, `outputs` and `execution`.
- **Node reference:** `npm run docs:nodes` writes `docs/nodes/` from the registry: a README with the packs, one page per pack (type, title, description, slots as `name:type`, execution declarations, usage) and `nodes.json` for tools. The pages are generated locally and not committed (roadmap decision D9). Run `npm run build` first, because the tool reads `build/litegraph_nodejs.full.js`.
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

`graph.runStep()` runs one cycle (a **frame**); `graph.start(interval)` runs frames continuously. Nodes run in topological order: nodes with no inputs first, ties broken by `priority`. Data written with `setOutputData` is stored on the link and read with `getInputData`.

**Modes** (`node.mode`) say when a node runs:

| Mode | Runs |
|---|---|
| `ALWAYS` (0) | Every frame |
| `ON_EVENT` (1) | Only when an action reaches it |
| `NEVER` (2) | Never (muted) |
| `ON_TRIGGER` (3) | When an event arrives on its trigger input (`onTrigger`) |
| `BYPASS` (4) | Its code never runs; it acts as a wire (below) |
| `ON_REQUEST` (5) | Only when a node downstream needs its value (a pull) |

**Bypass** is ComfyUI's mode 4.
- **Data:** a bypassed node gives each data output the value of the input whose type fits, taking the input at the same index first, then the first input of a fitting type. An output with no fitting input gets `undefined`.
- **Events:** an event that reaches it goes on to its connected event outputs, at once in every execution model.
- **What does not run:** its own code (`onExecute`, `onAction`) and `onStart`.
- **Modes:** BYPASS is valid under every model, like NEVER.

**Mode numbering 2.** Before 2026-11-23, ON_REQUEST was 4 here ([decision 0004](../agents/memories/decisions/0004-mode-4-bypass.md)). Saved documents carry `litegraph_modes: 2`, and `configure` renumbers older ones:
- a document with `litegraph_version` but no `litegraph_modes` was written by this library before the change, so its 4 becomes 5;
- a document with neither (ComfyUI, upstream litegraph) keeps 4 as BYPASS. For files saved by builds older than 2026-11-18, set `LiteGraph.Compat.UnmarkedMode4` to `"on_request"`, or rewrite them with `node tools/migrate-modes.mjs --unmarked=on_request file.json`.

### Execution models

How events are delivered and when ON_REQUEST nodes run is chosen **per document**, in the root graph's `config.execution` (it applies to all subgraphs):

| Model | Delivery | Data refresh | Use it for |
|---|---|---|---|
| `ancestors` | immediate | before an action, a trigger and an ALWAYS node's turn, the target's ON_REQUEST inputs are pulled | **The default for new graphs.** Loops, logic and event flows with a steady frame |
| `step` | actions to nodes that have an `onExecute` wait for the node's turn in the next frame | none | The old core default |
| `strict` | like `step` | none | Each node executes at most once per frame |
| `event` | immediate | none | Pure push wiring |
| `legacy` | from the global flags | from the global flags | Documents saved without the field, exactly as before |

```js
graph.executionModel;                 // "ancestors"
graph.setExecutionModel("step");      // one undo step
graph.applyExecutionModelModes();     // the model's declared default modes, one more undo step
LiteGraph.registerExecutionModel("mine", { delivery: "immediate", refresh: "ancestors", frame_pull: true });
```

**The ancestors frame.** In each frame, before an ALWAYS node runs, its ON_REQUEST inputs are pulled. When a pulled node runs again depends on what it declares (see call scopes below):
- **Deterministic** (`pure: true`): only when one of its inputs has newer data (`setOutputData` stamps a data version on the links), one of its properties changed, or the graph was edited. It keeps its value across frames and calls.
- **Volatile** (`pure: "volatile"`) **and undeclared** ON_REQUEST nodes: once per **call scope**, and again on newer input data or a property edit.

So two consumers of one pure node run it once, and a loop body re-runs exactly the pure nodes that depend on the index. ALWAYS nodes are never re-run by a pull; they give this frame's value (an ALWAYS node that never ran yet gives its first value). A pulled node gets no `param`, and an event fired while it is pulled is dropped (`refreshing`): event emitters cannot be ON_REQUEST. `getInputData(slot, true)` is a pull too: memoized for ON_REQUEST origins; under the other models it runs the origin under the same rules. A node that changes an output object in place must call `setOutputData` again, or consumers keep their memo.

**Call scopes.** Outside `legacy` every run belongs to a call scope, with an id such as `call_3/7.s1/5.i2`:
- a **root scope** per frame (`frame_N`) and per event chain started outside a step (`call_N`: a click, a timer, a network message);
- a **child scope** per Sequence output (`<id>.sK`, from the `branches` declaration), per loop iteration of FOR, ForEach and WHILE (`<id>.iK`; WHILE evaluates its condition in the iteration's scope), and per `graph/function` call (`<id>.fK`).

Inside one scope every consumer of a volatile node sees the same value; the next iteration or Sequence output gets a new one. `options.action_call` is the scope id (one call id; `ExecutionEngine.scopeId` reads it). A loop or a custom node opens a scope per iteration with `ExecutionEngine.iterate(node, k, fn)`.

**Property edits.** `setProperty` bumps the node's property version, so the next pull in the same call sees the edit. A direct write to `node.properties` is seen at the next pull by a deterministic node (it compares its property values), but within one call scope only `setProperty` is seen.

**Regenerating a value: the refresh input.** An ON_REQUEST node's Inputs menu offers **Refresh** outside `legacy`: an ACTION input (`refresh: true`; `ExecutionEngine.addRefreshInput(node)`) that runs the node again now and restamps its outputs, so pure nodes downstream follow at their next pull. Use it for a deterministic node that reads outside state, instead of making it ALWAYS.

**Where the model comes from.**
- A document with `config.execution` runs under that model; a document without it loads as `legacy` and is saved without it.
- `new LGraph()` and new Editor documents use `LiteGraph.default_execution_model` (`"ancestors"`) and save it.
- A project that assigns any legacy flag (`use_deferred_actions`, `refreshAncestorsOnActions`, `refreshAncestorsOnTriggers`, `ensureUniqueExecutionAndActionCall`, `ensureNodeSingleExecution`, `ensureNodeSingleAction`, `preventAncestorRecalculation`) gets `legacy` for new graphs, unless it sets `default_execution_model` itself. The flags are deprecated: each logs once when assigned, and they are removed no earlier than 0.20.
- **Opt out** with one line: `LiteGraph.default_execution_model = "legacy";`.

**Graph info:** with `LiteGraph.showCanvasOptions` (on in the Editor) the canvas menu offers "Options (execution: <model>)": an "Execution model" combo (one undo step) and, when nodes differ from the model's declared defaults, "Apply the model's node modes (N)" (another undo step; never automatic).

### Declaring a node's execution needs

Optional; undeclared types are valid everywhere and start ALWAYS.

```js
class MyLoop {
  static def = { execution: {
    emit: "immediate",            // its events are delivered now, with a refresh, in every model but legacy
    immediate_inputs: ["break"],  // these action inputs are never queued
    loop: true,                   // checkExecution reports it without a body
    modes: [LiteGraph.ALWAYS, LiteGraph.ON_EVENT, LiteGraph.NEVER],  // valid modes (NEVER always is)
    models: { strict: false },    // not valid under "strict"
    default_mode: LiteGraph.ON_EVENT,  // the mode new nodes get outside legacy
  } };
}
LiteGraph.declareNodeExecution(["my/add", "my/mul"], { pure: true });  // ON_REQUEST by default under "ancestors"
LiteGraph.declareNodeExecution(["my/now"], { pure: "volatile" });      // ON_REQUEST, once per call scope
LiteGraph.getNodeDefinition("events/timer").execution;  // { ticks: true, modes: [0, 2], ... }
```

- `pure: true`: safe to re-run; new nodes are ON_REQUEST under `ancestors`. Declared by the math, math3d, logic and string packs, and the basic constants and conversions (`basic/const`, `boolean`, `string`, `data`, `array`, `length`, `not`).
- `pure: "volatile"`: reads the time, randomness or outside state; new nodes are ON_REQUEST under `ancestors` and give a new value per call scope (frame, event, loop iteration, Sequence output). Declared by `math/rand`, `math/formula` (its `TIME`) and `basic/time`. A volatile node saved in ALWAYS mode keeps it: one value per frame, shared by every reader (no `pure-always` warning, and "Apply the model's node modes" leaves it).
- `branches: true`: each event output opens a child call scope (Sequence).
- `ticks: true`: needs the step loop; a pull never re-runs it. Declared by Timer, Delay, `math/average`, `tendTo`, `spikes`, `accumulate`, `audio/adsr` and the two texture smoothers.
- Nodes that only react to events default to ON_EVENT outside `legacy`: `events/once`, `waitAll`, `filter`, `log`, `basic/alert`.
- **Other volatile nodes stay undeclared, so ALWAYS,** until they are checked in a browser: outside state or widgets (`basic/object`, `objects/evaluate`, `widget/*`, `input/gamepad`, …). An undeclared node set ON_REQUEST by hand runs once per call scope. `basic/variable` is not pure: with its input connected it writes. The node reference (`npm run docs:nodes`) shows every type's declaration.
- **Host calls:** `node.actionDo(action)` from your code is an event entry. Under `ancestors` it pulls the node's ON_REQUEST inputs first, as a delivered event does. Calling `node.onAction(...)` directly bypasses the engine.
- `changeMode`, the node panel, the Mode menu and the group's "Mode for all nodes" refuse a mode the type declares invalid. The refusal (`node.mode_refusal`) names `LiteGraph.Execution.AllowAnyMode`, the setting that lifts it; a group lists the nodes it skipped. `LiteGraph.getValidNodeModes(node)`.
- A new node of a declared type gets its model's default mode when it is added; a loaded node keeps its stored mode.
- `graph.checkExecution()` returns `{model, issues}`: an invalid model or mode, a `ticks` node that is not stepped (also inside a non-ALWAYS subgraph node), an ON_REQUEST event emitter, a loop without a body, a pure node left ALWAYS, and a loop input that comes from a volatile ON_REQUEST node (`volatile-loop-input`: the loop reads it once, while a body that reads it again gets a new value per iteration). A root graph emits `execution-check {report}` after loading when someone listens; the setting `LiteGraph.Node.ExecutionBadge` (on in the Editor) shows the issues as node badges.

### Loops

FOR, ForEach and WHILE deliver their body immediately in every model but `legacy`, fire `completed` when done, and stop within the loop on `break`. Each iteration is a call scope. Under `ancestors`, compute the loop's data with pure ON_REQUEST nodes: deterministic ones re-run only when the loop changed their inputs, volatile ones (`math/rand`) once per iteration.

```js
const graph = new LGraph();                                  // ancestors
const add = (type, props = {}) => {
  const node = LiteGraph.createNode(type);
  Object.assign(node.properties, props);
  graph.add(node);
  return node;
};
const start = add("basic/const", { value: 0 });
const count = add("basic/const", { value: 3 });
const loop = add("logic/CycleFOR");                          // ON_EVENT (declared default)
const double = add("math/operation", { OP: "*", B: 2 });     // pure: ON_REQUEST
const store = add("basic/data_store");
start.connect(0, loop, 0);  count.connect(0, loop, 1);
loop.connect(1, double, 0);                                  // index -> A
double.connect(0, store, 0);                                 // pulled before each body action
loop.connect(0, store, 1);                                   // body: assign
loop.actionDo("do");                                         // or wire a button or a Timer to "do": stores 0, 2, 4
store.properties.data;                                       // 4; double ran once per index
```

A WHILE that reaches `properties.cycleLimit` with its condition still true reports it (`event-dropped`, setting `properties.cycleLimit`). WHILE is not valid under `strict`, which forbids re-running the condition in a frame.

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

- **Delivery** follows the document's model: immediate under `ancestors` and `event` (the target's ON_REQUEST inputs pulled first under `ancestors`); under `step` and `strict`, an action to a node that has an `onExecute` waits for its turn in the next frame (`graph.stop({dropQueued: true})` clears that queue). An input named `onTrigger` (or an ON_TRIGGER node without `onAction`) runs the node's `onExecute`.
- **Exec slots** are any node's built-in `onTrigger` input (an event there runs `onExecute`) and `onExecuted` output (fired after the node executed or ran an action).
  - **How they are made:** `node.addOnTriggerInput()` / `addOnExecutedOutput()` append them, so the indices of the other slots never change, and mark them with `slot.exec`.
  - **Creating them on drop:** dropping an event link on a node's body creates them and switches the node to ON_TRIGGER (a type that refuses that mode keeps its mode and still gets `onTrigger`). This happens under the `ancestors` model (the model rule `exec_slots`), or when `LiteGraph.do_add_triggers_slots` is assigned true. The setting `LiteGraph.Node.ExecSlots` (`auto` / `on` / `off`) overrides both.
  - **Where they sit:** the setting `LiteGraph.Node.ExecSlotLayout`.
    - `rows` (default): in the slot rows, as before.
    - `edges`: arrows without labels on the line between title and body, at both ends; on a vertical node (`horizontal` slots), `onTrigger` above the pin and `onExecuted` at the bottom in the same column. The other slots keep their rows.
    - Your own layout: `LiteGraph.registerExecSlotLayout(name, {normal, vertical})`, where each slot is `{x, y, dx, dy, dir}`. Anchors are `left` / `center` / `right` / `pin` and `top` / `title` / `body` / `middle` / `bottom`; offsets are in canvas units or `"N%"`. `LiteGraph.exec_slot_layout`, `node.exec_slot_layout` or a class's static `exec_slot_layout` pick one.
- **Subgraphs:** an event entering a subgraph node sees fresh interface data, and a subgraph node in any mode but NEVER delivers its inner events (bounded by `LiteGraph.Execution.MaxEventPasses` and `LiteGraph.subgraph_max_depth`).
- **Refused events** emit `event-dropped {node, path, reason, setting?, message}` on the root graph (when someone listens) and warn once per node: `reentry`, `refreshing`, `no-handler`, `mode` (a NEVER target), `stopped-queue`, `max-passes`, `max-depth` (`LiteGraph.Execution.MaxEventDepth`, 256), `cycle`, `once-per-frame`.
- **Errors** in an event chain outside a step are reported like errors in a step (`node-error` with the path, an `error` state); outside `legacy` they are rethrown only when `LiteGraph.throw_errors`.

Built-in `events/*` nodes delay, count, filter and sequence events; Sequence fires its outputs in slot order in every model but `legacy`.

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
| `color` | A swatch and its text. Click the swatch to open the colour picker (the alpha suffix is kept), or the label to type any CSS colour |
| `vector` | One draggable field per component. It is used for `vec2`, `vec3` and `vec4` |

**Widgets by value type:** `addWidget` also takes any [value type](#value-types). `addWidget("int", "Count", 3)` gives a number widget with `step: 1` that rounds. `addWidget("vec3", "Offset")` starts at `[0, 0, 0]`. `addWidget("INT")`, `addWidget("FLOAT")`, `addWidget("COLOR")` and the other ComfyUI-style names work too. The widget keeps the type name it was given.

**Options:** `property` binds the widget to `node.properties[name]`. Set `this.serialize_widgets = true` to save widget values.

**Widget input:** `socket: true` (or `node.addWidgetInput(widget)`) puts an input on the widget's row. While that input is linked, the widget is disabled and `node.getWidgetValue(widget)` returns the linked value.

**Custom types:** extend `BaseWidget`, implement `draw(ctx, node, width, y, H, env)` and `onPointer(event, env)`, then call `LiteGraph.registerWidgetType("mytype", MyWidget)`.

## Value types

`LiteGraph.valueTypes` says, for each type of value, how it is edited: its canvas widget, its panel editor, default options, coercion, validation, formatting, and the help the panels show. The same entry serves `node.addWidget(type)`, the node panel's property rows, settings, subgraph inputs and the property dialog.

```js
LiteGraph.registerValueType("percent", {
    base: "number",                       // inherits everything else; options are merged
    aliases: ["PERCENT"],
    label: "Percentage",
    description: "A number from 0 to 100.",
    examples: ["50", "12.5"],
    widget: "slider",                     // canvas widget (LiteGraph.widget_types)
    editor: "slider",                     // panel editor (LiteGraph.panel_editors)
    options: { min: 0, max: 100, step: 1, unit: "%" },
});
```

| Type | Aliases | Canvas widget | Panel editor |
|---|---|---|---|
| `boolean` | `bool`, `toggle`, `BOOLEAN` | toggle | switch |
| `number` | `float`, `double`, `FLOAT` | number | number field (arithmetic, arrow keys, drag the label) |
| `int` | `integer`, `INT` | number (`step: 1`, rounded) | number field |
| `slider` | | slider | range and number |
| `string` | `str`, `STRING` | text | text field |
| `text` | `multiline`, `textarea` | text | growing text area (Ctrl+Enter applies) |
| `enum` | `combo`, `COMBO`, `select` | combo | select (with a filter above 12 choices) |
| `color` | `colour`, `COLOR` | color | swatch, picker, text, presets |
| `vec2`, `vec3`, `vec4` | `VEC3`, … | vector | X / Y / Z / W fields |
| `array`, `object` | `list`, `json`, `dict` | text | JSON (a parse error keeps the old value) |
| `code` | | text | the code pad |
| `resource` | `file`, `url`, `texture`, `image` | text | text, plus a "…" button when `options.pick(ctx)` is given |

**Customizing, from the broadest change to the narrowest:**
1. **Change a type everywhere:** `registerValueType("number", {...LiteGraph.getValueType("number"), editor: "slider"}, {replace: true})`. The disposer it returns restores the built-in type.
2. **Change how a type is edited in panels:** `LiteGraph.registerPanelEditor(name, {create(ctx) {...}})` (see [Panels](#panels)).
3. **Change how a type is drawn on the canvas:** `LiteGraph.registerWidgetType(name, cls)`.
4. **For one node class:** use the property info in `addProperty(name, value, type, info)`, `static widgets_info`, or `static "@prop"`.
5. **For one node instance:** use `onGetPropertyInfo(name)` and `onAddPropertyToPanel(...)`.

Extensions register value types as `ctx.valueTypes.register(...)`, and they are removed with the extension.

## Panels

**Node details panel:** double-click a node to open it. It has:
- a header with the type, id, category, pack, deprecated and experimental chips, a warning about missing capabilities, the description and `def.usage`;
- these sections: General (title, mode, colour, shape, collapsed, pinned), Properties, Widgets, Inputs, Outputs (a link selects the node at the other end), Execution (declaration, state, `checkExecution` issues) and Advanced (position, size, colours, JSON).

Each edit is one undo step, and a drag (scrub, slider, colour picker) is one step too. The panel updates when the node changes on the canvas. Its ⌖ button makes it follow the selection (setting `LiteGraph.Panel.FollowSelection`, which is on in the Editor).

**Options panel:** opened with "Options" in the canvas menu (`LiteGraph.showCanvasOptions`). It has three tabs:
- **Graph:** the execution model, with help and document facts.
- **Canvas:** this canvas's options with labels, tooltips and categories (`LGraphCanvas.optionInfo`). "Save canvas as defaults" writes them to `LiteGraph.Canvas.Defaults`, which new canvases apply.
- **Settings:** every `LiteGraph.settings` definition, grouped by category.

**Both panels** have:
- search (across all tabs), sorting (category or declared order, A–Z, modified first), and a "Modified" filter;
- reset to default (↺) and a "?" toggle that shows the description and examples;
- remembered collapsed sections, a resizable width, and a ⇆ button that docks the panel on the other side (settings `LiteGraph.Panel.*`).

**Property info keys** (all optional) are read from `addProperty(name, value, type, info)`, `widgets_info`, `"@prop"` or `onGetPropertyInfo`:

| Key | Effect |
|---|---|
| `label` | Row label (the property name stays the key) |
| `tooltip` | Shown on hover |
| `description`, `examples` | Shown by the row's "?" toggle |
| `min`, `max`, `step`, `precision`, `unit` | Numbers: clamping, arrow and drag steps, display |
| `values` | Choices: an array, a `{label: value}` map, or a function |
| `widget` / `editor` | Pick an editor by name (`"slider"`, `"code"`, a registered one) |
| `readonly` | Shown as text, not editable |
| `multiline`, `placeholder` | Text fields |
| `section`, `order`, `hidden` | Grouping, ordering, hiding in the node panel |
| `default_value` | Enables reset and the modified marker (`addProperty` sets it) |

```js
class Mixer {
    constructor() {
        this.addProperty("gain", 0.5, "number", { min: 0, max: 2, step: 0.01, tooltip: "Output level", description: "Multiplies the mixed signal.", examples: ["0.5", "1.5"] });
        this.addProperty("tint", "#3399ff", "color", { section: "Look" });
        this.addProperty("offset", [0, 0, 0], "vec3", { section: "Transform" });
    }
}
```

**Adding sections:**

```js
LiteGraph.registerPanelSection({
    id: "stats", panel: "node", title: "Stats", order: 10,
    when: (node) => node.inputs?.length > 0,
    render: (section, { panel, node }) => panel.addRow({ name: "inputs", value: node.inputs.length, info: { type: "int", readonly: true } }),
});
```

`panel: "options"` with `tab: "graph" | "canvas" | "settings"`, or a new tab id with `tabTitle`, adds a section to the options panel. Extensions use `ctx.panels.registerSection` and `ctx.panels.registerEditor`.

**Building panels:** `canvas.createPanel(title, options)` keeps the former API (`addWidget`, `addHTML`, `addButton`, `addSeparator`, `clear`, `close`, …) and adds `addRow(spec)`, `addSection`, `addTabs` / `useTab`, `addToolbar`, `addNote`, `applyFilter` and `applySort`. Theme panels with the `--lg-panel-*` CSS variables.

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
| `LiteGraph.Node.LibraryBadge` | on | "loading libraries" while a node waits for its libraries, "library error" (with the message) when they failed |
| `LiteGraph.Group.HeaderToggle` | on | a toggle at the right end of group titles that mutes and unmutes the group's nodes (see Groups) |

**The node pin** is the box at the left of the title. A click there collapses the node.
- **Look:** the setting `LiteGraph.Node.PinStyle` picks a style.
  - `classic` is the default and the look of before: the execution status, the node's `boxcolor`, or a mode colour with `LiteGraph.node_box_coloured_by_mode`, and a flash on runs with `node_box_coloured_when_on`.
  - `modes` comes with the `node_pin` extension and is on in the Editor. Its shapes are:
    - ALWAYS: a green dot
    - ON_EVENT: an orange diamond
    - ON_TRIGGER: a blue triangle
    - ON_REQUEST: a teal ring
    - NEVER: a grey ring with a slash
    - BYPASS: a violet ring with a bar

    A ring shows the run state (running, error, queued), a glow fades after each run (`node.last_run_time`), and a node's `boxcolor` still fills the pin.
  - Your own styles: `LiteGraph.registerNodePinStyle(name, (node, canvas) => ({shape, fill, stroke, glow, mark}))`.
  - A node can still draw its own pin with `onDrawTitleBox`.
- **Quick menu:** a right-click on the pin opens the items contributed to the `"node-pin"` menu location, then "More…" for the full node menu. With nothing contributed, it is the node menu as before. The setting `LiteGraph.Node.TitleQuickMenu` opens the quick menu from the whole title.
- **The `node_pin` extension** contributes:
  - Mode ▸, Bypass, Mute, Rename, Collapse, Run now, Info…;
  - the commands `litegraph.node.setMode`, `toggleBypass` (Ctrl+B), `toggleMute` (Ctrl+M), `collapse`, `run` and `info`. Each acts on the node and the rest of the selection as one undo step, and a refused mode is shown with the setting that lifts it.

**The graph status chip** (the `graph_status` extension, setting `LiteGraph.Canvas.GraphStatus`, on in the Editor) shows the document's execution model and whether the graph runs, at the top left of the canvas. A click opens a menu to switch the model (one undo step) or to start and stop the graph.

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
- **Dragging:**
  - the title bar moves the group with what is inside it (as in ComfyUI); Ctrl on the title moves the group alone;
  - the empty body pans the view, like empty canvas; Alt+drag on the body moves the group; Ctrl+drag on the body box-selects;
  - the corner handle resizes.

  The setting `LiteGraph.Group.BodyDrag` is `pan` (default) or `move`, where a body drag moves the group as in older LiteGraph.
- **Title size:** with `LiteGraph.Group.TitleScale` (on by default) the title stays between `LiteGraph.Group.TitleMinPx` (12) and `TitleMaxPx` (48) pixels on screen: readable when zoomed out, not huge when zoomed in. Off, it scales with the canvas as before. The title band (selection and title drag) follows the drawn size: `canvas.getGroupTitleFontSize(group)`, `getGroupTitleHeight`, `isOverGroupTitle`.
- **Header toggle** (`LiteGraph.Group.HeaderToggle`): a dot like the node pin (a ring when the group's nodes are all muted); a click mutes or unmutes them. It is `LGraphGroup.opts.toggle_size` (10) graph units, at most `toggle_max_px` (14) pixels on screen, and hidden below `toggle_min_px` (6). The title is wrapped and clipped left of it.

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
| Space + move or drag | Pan (also over nodes and groups) |
| Drag on a group's body / title | Pan / move the group (Alt+drag on the body moves it) |
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

`runStep` sends one `done` per node (not per step) and an `error` with the failing node's path; `start()` sends a `reset`. A node run by an action, a trigger or a pull (not its own turn in the step) sends `running` then `done`, once per change. An error in an event chain outside a step (an action from a widget, the canvas or `trigger`) is reported the same way: `node-error {error, node, path}` on the root graph and an `error` state on the failing node; it is then rethrown to the caller. The runner broadcasts the same messages as `execution_state`. The canvas draws them: a coloured title box, an outline while running or failed, a progress bar, and the error text (setting `LiteGraph.Canvas.ExecutionOverlays`). A node or definition `icon` (a glyph or an image) is drawn before the title.

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

- **Built-in packs:** every built-in node file is a builtin pack `litegraph/<family>` (`litegraph/math`, …), with a `description`.
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

**Templates:** a pack can ship example graphs in its manifest's `templates[]`. Each entry is `{id, title, description, category, profile, flow, tags, packs, level}` plus a `url` (relative, http or https) or an inline `data` graph. `LiteGraph.packs.listTemplates()` returns the valid templates of the active packs. The editor's Demo menu lists them in their category, next to the examples of `apps/editor/examples/index.json`, which uses the same fields.

## Saving and loading

```js
const data = graph.serialize();    // JSON-safe; version 0.4, compatible with ComfyUI's layout
graph.configure(data);             // emits "configuring" (cancelable), then "configured"
```

Typed events (`graph.events.on("changed", …)`) and [callback handlers](callbacks.md) report changes.

## Everyday values and inspection

`basic/boolean` is a persistent true/false value with a toggle widget. Its optional `toggle` action input inverts the stored value; it does not turn the boolean output into an event. Search for “toggle”, “bool”, “true” or “false”. The saved value is authoritative if a legacy document's widget value disagrees.

`basic/const` can use a linked widget input (`node.addWidgetInput("value", "number")`). While linked, execution uses the incoming value and the widget is disabled. Disconnecting restores the saved local value; linking never overwrites that fallback.

`basic/watch` keeps its existing `value`, `text` and `tree` displays. Choose `auto` for a declared/observed type summary and a bounded preview of scalars, arrays and objects. Auto reports simple known-type mismatches without coercing the value or rejecting the link. It distinguishes an unconnected input from a connected `undefined` value. It previews own enumerable data properties, marks accessors without invoking them, detects cycles, limits depth/entries/text and clips drawing to the node. Unknown/custom types are displayed without claiming schema validation. Auto gives a small node room when selected; live data never resizes it. Tree inspection still requires the watch pack.

See [Examples and starter workflows](examples.md) for guided lessons and the editor's whole-section/pack inventory generator.

## Glyph slot labels

Slots may declare a `label_icon` string (a glyph or emoji) and optional `label_mode`: `"text"`, `"icon+text"` or `"icon"`.

```js
this.addInput("enabled", "boolean", { label_icon: "◉" });
this.addOutput("result", "number", { label_icon: "🔢", label_mode: "icon" });
this.properties.slot_label_mode = "icon+text"; // optional per-node default
```

Precedence is slot `label_mode`, node `properties.slot_label_mode`, then canvas `slot_label_mode` (default `"icon+text"`). The Canvas options panel exposes **Nodes → Slot labels**. Missing or unsupported icons fall back to text. `LiteGraph.getSlotLabel(node, slot, canvasMode)` supplies the display text used for drawing and minimum-size measurement. Original slot names, types and link anchors stay unchanged; right-click an icon-bearing socket to see its name and type. Widget inputs retain their widget labels and placed exec slots retain their existing arrow presentation.

These are display-only strings, never HTML or asset URLs. Node-title icons continue to accept text/emoji or already loaded image objects through `node.icon` or `static def.icon`. SVG asset loading and an icon registry remain future work.
