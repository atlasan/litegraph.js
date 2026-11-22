# Panels and widgets: value types, graph options, node details

> **Date** 2026-11-22 · **Kind** plan · **Status** done, merged into `LG/dev` · **Base** `LG/dev` @ `9926717`

This plan gives litegraph one way to edit a value of a given type, whether on the canvas, in a panel, in a setting or in a subgraph input, and rebuilds the two side panels on top of it:

- **Value types:** a registry that maps each type to its canvas widget, its panel editor, default options, coercion, validation, formatting, a label, a description and examples. Hosts can extend it, override it, and customize it at every level: type, editor, widget class, node class, property, and node instance.
- **Graph options panel:** Graph, Canvas and Settings tabs, with labels, tooltips, descriptions, categories, search, sorting and a "modified only" filter.
- **Node details panel:** a header and collapsible sections (General, Properties, Widgets, Inputs and Outputs, Execution, Advanced), an editor that fits each value, live refresh, follow selection, and one undo step per edit.

The existing panel API, element ids, CSS classes, node hooks and widget objects keep working. Why now: Wave 6 added an execution model, node execution declarations, execution state and about 30 settings, and the panels show almost none of it. Today a type maps to a widget in four separate places, each by hand.

## Branch

`LG/dev_panel_and_widget`, cut from `LG/dev` at `9926717`. This is a parallel line of work, not a wave. It merges back into `LG/dev` when `npm run check` passes, with the usual split into `feat:`/`fix:`/`docs:` commits followed by a `build:` commit. It does not depend on the [event integration plan](2026-11-22-event-integration.md). Live refresh uses today's `graph.events`, which that plan keeps.

## Context

Today the panel code lives in [`src/lgraphcanvas.js`](../../src/lgraphcanvas.js) and the canvas widgets in [`src/widgets.js`](../../src/widgets.js) (see the [codebase map](../memories/codebase/README.md)).

**Panels**
- **`createPanel(title, options)`** builds a `div.litegraph.dialog` with header, content, alt-content and footer, and has the methods `addWidget(type, name, value, options, callback)`, `addHTML`, `addButton`, `addSeparator`, `clear`, `close`, `toggleAltContent` and `toggleFooterVisibility`.
  - `addWidget` edits only `boolean`, `string`/`number` (a contenteditable span) and `enum`/`combo` (a ContextMenu); `code` opens `inner_showCodePad`.
  - Any other type is shown but cannot be edited. In the bundled nodes that affects `vec3` (6 uses), `color` (4), `text` (3), `array` (1), and the `resource`/`texture` widgets.
  - `min`, `max`, `step` and `precision` are ignored, so a number can be set to any value or to `NaN`.
- **The graph options panel** shows the execution model combo with its description, the "Apply the model's node modes" button, one on/off row for each of the 25 raw names in `LiteGraph.availableCanvasOptions` (sorted A–Z, with no label, tooltip or grouping), and a "Render mode" combo. Changes apply to this canvas only and are never persisted.
- **The node details panel** shows the type and description, inserted with `innerHTML` (markup in a type or `desc` is injected), then Title, Mode, Color (a name combo), the properties, and Delete.
  - Edits use `beforeChange`/`afterChange`, not `graph.transact`.
  - Widgets, slots, pack, source, lifecycle, capabilities, execution declaration and execution state are not shown.
- **Settings:** `LiteGraph.settings` ([`src/settings.js`](../../src/settings.js)) holds about 30 definitions, and no UI lists or edits them.
- **Hooks hosts rely on:** the canvas `onShowNodePanel` callback; the node hooks `onAddPropertyToPanel(name, panel, value, info, fUpdate)`, `onShowCustomPanelInfo(panel)` and `onGetPropertyInfo`; `static "@prop"` and `widgets_info`; `canvas.node_panel`, `canvas.options_panel`, `NODEPANEL_IS_OPEN` and `OPTIONPANEL_IS_OPEN`; the ids `#node-panel` and `#option-panel`; and the classes `.settings`, `.property`, `.property_name`, `.property_value` and `.bool-on`.
- **No tests** cover either panel.

**Type to widget, today:**
- `LGraphNode.addWidget(type)` looks up `LiteGraph.widget_types[type]`. An unknown type becomes a plain object that draws nothing unless it brings its own `draw`. So `addWidget("int")`, `addWidget("color")` and `addWidget("vec3")` render nothing.
- `getPropertyInfo` has a `// THINK: should map porpertyType, widgetType, basic_nodeType` note and maps only `widget: "combo"` to `enum`.
- `GraphInput.updateType` (`src/subgraph.js`) switches its value widget by hand: number, boolean or string, otherwise nothing.
  - **Bug:** it assigns `value_widget.type = "toggle"`. But the widget is a `NumberWidget` instance, and `widgetImplementation` uses an instance's own class, so a boolean input still draws and behaves as a number.
- The canvas's `inner_value_change` coerces only `"number"`.
- `onShowMenuNodeProperties` parses typed values by hand for each type.

**Related ideas:**
- [CFY-47](../ideas/catalog.md) (panel contributions): the section part is delivered here.
- [X-02](../ideas/catalog.md) (host services).
- [X-11](../ideas/catalog.md) (property presets) and [X-12](../ideas/catalog.md) (settings export, import and profiles): follow-ups.
- [FLW-22/FLW-23](../ideas/cards/FLW-22-node-reference-and-examples.md) (node reference): its proposed `def.usage` is shown in the node panel header when present; it is not defined here.
- X-13 (movable, dockable and configurable panels): added by this plan as the follow-up the panel shell prepares for.

Design reference only (GPL, no code): the ComfyUI frontend's settings dialog and its widget-per-input-type mapping.

## Decisions

All accepted on 2026-11-22.

| # | Decision |
|---|---|
| P1 | The options panel uses **tabs** (Graph, Canvas, Settings) with **one search across all of them**. |
| P2 | Canvas options are saved only on request: **"Save as defaults"** writes `LiteGraph.Canvas.Defaults` (json), and new canvases apply it. Nothing is saved automatically. |
| P3 | Follow selection is **off in the library and on in the Editor**, with a pin button in the panel header. |
| P4 | Editors are **native `<input>`/`<select>`/`<textarea>`** elements, wrapped in the existing `.property_value` element. |
| P5 | **Label-drag scrubbing** for numbers: hold Shift for fine steps, the whole drag is one undo step, and it is off for `readonly`. |
| P6 | No wave: the branch is `LG/dev_panel_and_widget` (see Branch). |
| P7 | **One value-type registry** drives the canvas widgets, the panel editors and settings, in place of mappings for each consumer. The existing `widget_types` registry stays, and value types point into it. |

## Design: value types ("widget for type")

### Registry

`src/valuetypes.js` exports `ValueTypeRegistry`. `LiteGraph.valueTypes` is created by `setupPlatform()`.

```js
LiteGraph.registerValueType("percent", {
    base: "number",                 // inherits every field it does not give; options are merged
    aliases: ["PERCENT"],
    label: "Percentage",
    description: "A number from 0 to 100.",
    examples: ["50", "12.5"],
    widget: "slider",               // canvas widget type (LiteGraph.widget_types)
    editor: "slider",               // panel editor (LiteGraph.panel_editors)
    options: { min: 0, max: 100, step: 1, unit: "%" },
    default: 0,                     // or () => value
    coerce: (value, options) => …,  // normalize a typed or picked value (string → number, clamp)
    validate: (value, options) => null | "message",
    format: (value, options) => "50 %",
    parse: (text, options) => 50,
});
```

- **`register(name, def, {replace})`** returns a disposer.
  - Names are matched without regard to case, and aliases are included.
  - Replacing a registered type (built-ins included) needs `replace: true`. The disposer restores the previous definition.
- **`get(name)`** returns the resolved definition, with the base chain merged and cached, or `null`.
- **`resolveEditor(info, value)`** returns `{editor, options, type}`. Candidates are tried in order: `info.widget`, then `info.type`, then `typeof value`.
  - A candidate that names a registered editor is used directly.
  - Otherwise the candidate is looked up as a value type, and that type's `editor` is used.
  - If nothing matches, the result is `readonly`.
  - Options are merged as `type.options`, then `info`, so the property's own info wins.
- **`resolveWidgetClass(type)`** returns `{cls, options}`: `widget_types[type]` if registered, otherwise the value type's `widget`.
- **`coerce(type, value, options)`**, **`validate(…)`** and **`format(…)`** are helpers that do nothing for unknown types.

### Built-in value types

| Type | Aliases | Canvas widget | Panel editor | Default options and behaviour |
|---|---|---|---|---|
| `boolean` | `bool`, `toggle`, `BOOLEAN` | toggle | boolean (switch) | `"false"`, `""` and `0` coerce to `false` |
| `number` | `float`, `double`, `FLOAT` | number | number | `precision: 3`. Typed arithmetic is allowed (`evaluateMathExpression`). min/max clamp. NaN is refused |
| `int` | `integer`, `INT` | number | number | base `number`, `step: 1`, `precision: 0`, rounded |
| `string` | `str`, `STRING` | text | string | single line |
| `text` | `multiline`, `textarea` | text (multiline) | text (auto-height textarea) | base `string` |
| `enum` | `combo`, `COMBO`, `select` | combo | combo (native select; filterable when there are more than 12 entries) | `values`: an array, a `{label: value}` map, or a function |
| `color` | `colour`, `COLOR` | **color** (new) | color (swatch, picker, `node_colors` presets, alpha, clear) | `#rrggbb` or `#rrggbbaa`; other CSS colours are kept as typed |
| `vec2`, `vec3`, `vec4` | `VEC2` … | **vector** (new: N drag fields) | vector (N number inputs) | arrays of numbers of length N; `min`, `max`, `step` and `precision` apply to each component |
| `array` | `list` | text (JSON) | json | must be an array |
| `object` | `dict`, `json` | text (JSON) | json | the parse error is shown inline, and the old value is kept |
| `code` | | text (multiline) | code (the existing code pad, Ctrl+Enter to assign) | |
| `resource` | `file`, `url`, `texture`, `image` | text | resource (string, plus an optional `options.pick(ctx)` host hook that adds a "…" button) | base `string` |
| `slider` | | slider | slider (range plus number) | base `number`; needs `min`/`max` (default 0..1) |
| `event`, `action` | | — | readonly | no value |

Anything else is shown by the `readonly` editor: a formatted value, with a tooltip saying that no editor is registered for the type.

### Customization levels

From the broadest to the narrowest, each one wins over the one before it:
1. **A type:** `registerValueType(name, def)`, or `registerValueType("number", {...}, {replace: true})` to change a built-in type everywhere (for example to make every `number` a slider).
2. **An editor:** `LiteGraph.registerPanelEditor(name, editor)`.
3. **A canvas widget class:** `LiteGraph.registerWidgetType(name, cls)`, which already exists.
4. **A node class:** `widgets_info[prop]`, `static "@prop"`, `properties_info` (`addProperty(name, value, type, info)`), and `static def.inputs` slot info.
5. **A node instance:** `onGetPropertyInfo(name)` and `onAddPropertyToPanel(...)`, which already exist; `info.widget` and `info.editor` per property.

### Editor contract

```js
LiteGraph.registerPanelEditor("color", {
    create(ctx) {            // ctx: {doc, name, value, options, info, type, readonly, panel, target,
                             //       commit(value), preview(value), describe(text)}
        …
        return { element, set(value) {…}, focus() {…}, destroy() {…} };  // focus and destroy are optional
    },
});
```

- **`commit(value)`** is final: it coerces and validates, then applies the value as one undo step.
- **`preview(value)`** applies a value live during a drag or scrub. The first preview opens a transaction and `commit` closes it, so the whole drag is one undo step.
- **`set(value)`** lets the panel push an outside change (live refresh) without rebuilding the row.

### Consumers

- **`LGraphNode.addWidget(type, …)`** uses `resolveWidgetClass` when `type` is not a registered widget type. `w.type` keeps the name that was asked for (`"int"`, `"color"`), so serialization and host code still see it. The type's default options are merged under the caller's options.
- **`widgetImplementation(widget)`** follows the same resolution and gains two rules:
  - a `BaseWidget` instance of a **built-in** class whose `type` was changed afterwards uses the class of its new type (this fixes `GraphInput`);
  - a plain-object widget with its **own** `draw` keeps the legacy path, so a host's custom `"color"` or `"vector"` object widget is not taken over by the new classes.
- **One shared write path:** the canvas's `inner_value_change` becomes `LGraphCanvas.applyWidgetValue(node, widget, value, {event, pos})`, which uses `valueTypes.coerce` instead of the `"number"`-only case. The panel's Widgets section calls the same method, so the callbacks, `onWidgetChanged`, the bound property, history and the `widget-changed` event behave the same from either place.
- **`GraphInput.updateType` / `GraphOutput`** replace the value widget with the widget of the input's type (any value type, not just number, boolean and string), keeping its value through `coerce`.
- **The panel editors** (properties, widgets, settings, canvas options) all go through `resolveEditor`.
- **`onShowMenuNodeProperties`** parses typed values with the type's `parse`/`coerce`, so `vec3` can be typed as `1, 2, 3`.
- **`getPropertyInfo`** is unchanged: it keeps its sources and its `combo` → `enum` mapping. The value type is resolved by `resolveEditor`, so the shared info objects of node classes are not modified.

## Design: panels

- **`src/panels.js`** contains:
  - `PanelBuilder`, the shell. It adds sections (collapsible, with a count and a remembered state), a toolbar (search, sort, modified only, expand or collapse all), tabs, rows, notes, a resize handle, the dock side, Escape to close, and focus handling.
  - The editors registry and the built-in editors.
  - The row anatomy: a label (`info.label`, or the name split into words), a tooltip (`info.tooltip`), a "?" toggle that shows `description` and `examples`, the editor, a modified marker, reset to default, and a validation message.
  
  `createPanel` returns a `PanelBuilder` element and keeps every method it has today. `addWidget` is implemented with the editors.
- **Placement:** one `PanelHost` places every panel (`place(panel, {side})`; left or right today).
  - The dock side, width and collapsed sections are remembered as settings: `LiteGraph.Panel.Side`, `LiteGraph.Panel.Width`, `LiteGraph.Panel.Collapsed` (json), `LiteGraph.Panel.FollowSelection` and `LiteGraph.Panel.PropertySort`.
  - Floating, movable, stacked or tabbed panels and saved layouts (X-13) can later be added to `PanelHost` without touching the panels themselves.
- **Graph options panel:**
  - **Graph:** the execution model (description, a one-line example, pending modes), document facts (counts, the model's origin), and the graph's title when there is one.
  - **Canvas:** `LGraphCanvas.optionInfo` metadata (label, tooltip, category, type, values) for every option in `availableCanvasOptions`, plus `links_render_mode` and the numeric fields worth exposing, grouped into Rendering, Links, Interaction and Advanced. Names a host adds without metadata go under Other. The footer has "Save as defaults" (P2).
  - **Settings:** every definition, grouped by the category taken from its id, with editors chosen by `type`/`options`. The registry gains optional `description`, `examples`, `min`, `max`, `step`, `order`, `hidden` and `experimental` fields, and the existing definitions get tooltips where their name is unclear.
- **Node details panel:**
  - **Header:** editable title, type, category, pack and version, source, deprecated and experimental chips, id, a missing-capabilities warning, the description as text, and `def.usage` if present.
  - **General:** title, mode (valid modes only; a tooltip says why the others are missing), color, shape, collapsed, pinned.
  - **Properties:** grouped by `info.section`, ordered by `info.order` or A–Z, `info.hidden` respected, and `onAddPropertyToPanel` first.
  - **Widgets:** widgets that no property backs.
  - **Inputs and Outputs:** name, type with its colour, and links. A click selects and centres the linked node.
  - **Execution:** the declaration, the current status, progress and error, and this node's `checkExecution` issues.
  - **Advanced:** id, path, position and size, flags, and the serialized JSON with a copy button.
  - **Footer:** Delete (respects `block_delete`), Center, Copy JSON.
  - **Live refresh** comes from `graph.events`: `node-property-changed`, `widget-changed`, `node-removed` (closes the panel), `execution-state`, and `graph-changed` (debounced). Rows update in place, and the panel rebuilds only when its structure changes.
- **Edits:** each edit runs in `graph.transact(label, fn)`, and `fn` still calls `beforeChange(node)`/`afterChange()`, so hooks that listen to them keep firing.
- **Safety:** document and type data are always set with `textContent`.
- **Contributions:** `LiteGraph.registerPanelSection({id, panel: "node" | "options", tab?, title, order, when(target), render(section, ctx)})` returns a disposer. Extensions get it as `ctx.panels.registerSection`.
- **Styling:** CSS variables (`--lg-panel-*`), an aligned two-column grid, focus rings, and a narrow layout below 420 px. The old classes stay on the same elements.

## Compatibility contract

Each item gets a test.

- `createPanel(title, {closable, window, width, height, onOpen, onClose})` returns an element with `content`, `alt_content`, `footer`, `title_element`, `close()`, `clear()`, `addHTML`, `addButton`, `addSeparator`, `toggleAltContent` and `toggleFooterVisibility`.
- `addWidget(type, name, value, options, callback)`:
  - returns the row, with `.value`, `.options`, `dataset.property` and `dataset.type`;
  - calls `options.callback` and then `callback`, each as `(name, value, options)`;
  - number values stay numbers, and a combo with a `{label: value}` map stores the value.
- `onAddPropertyToPanel` still runs first, `onShowCustomPanelInfo(panel)` runs after the properties, `inner_showCodePad(prop)` works, and the canvas `onShowNodePanel` callback still decides whether the built-in panel opens.
- `canvas.node_panel`, `canvas.options_panel`, `NODEPANEL_IS_OPEN`, `OPTIONPANEL_IS_OPEN`, `#node-panel`, `#option-panel`, `.settings` and the existing CSS classes stay.
- `LiteGraph.showCanvasOptions` and `availableCanvasOptions` keep their meaning.
- `node.addWidget` for every existing widget type returns the same class with the same fields.
- Plain-object widgets with their own `draw`/`mouse` keep the legacy path.
- `widget_types` and `registerWidgetType` are unchanged.
- `beforeChange`/`afterChange` listeners still fire on panel edits.

## Steps

| # | Step | Acceptance check |
|---|---|---|
| 1 | **Value types.** Add `src/valuetypes.js` (in `build.py` after `widgets.js`): the registry, the built-in types, `LiteGraph.valueTypes`, `registerValueType` and the declarations. | `test/valuetypes.test.js`: alias and case lookup, base merging, replace with `replace: true` and restore with the disposer, and coerce/validate/format for each built-in type. |
| 2 | **Canvas widgets for types.** Add `ColorWidget` and `VectorWidget`. `addWidget` and `widgetImplementation` resolve value types (with both new rules). Add `applyWidgetValue`. Make `GraphInput`/`GraphOutput` replace their value widget by type. Parse typed values in the property menu through value types. | Tests: `addWidget("int")` gives a NumberWidget with `step: 1`, keeps `type: "int"` and rounds; `addWidget("color")` and `addWidget("vec3")` draw (spy ctx) and change on pointer; a plain object `{type: "color", draw}` keeps its draw; a GraphInput switched to boolean draws a toggle; the existing widget tests pass. |
| 3 | **Panel shell and editors.** Add `src/panels.js` with `PanelBuilder`, `PanelHost`, `registerPanelEditor`, the built-in editors and the row anatomy. `createPanel` delegates to it. Add the CSS variables and layout, and use `textContent` for all data. | `test/panels.test.js`: every compatibility item; each editor keeps its value type, clamps, refuses NaN, edits one vec3 component, stores the value of a combo map, keeps the old value on a JSON error; unknown types are read-only; a type or `desc` containing `<img onerror>` renders as text. |
| 4 | **Options panel.** The Graph, Canvas and Settings tabs; `LGraphCanvas.optionInfo`; the new settings fields and tooltips; search across tabs, sorting, modified only, collapse state; "Save as defaults". | Tests: a search for "shadow" shows only the two shadow options; "modified only" after one change shows one row; a host-added option appears under Other; an extension's setting appears under its category and disappears when the extension is disposed; collapse state is restored; a model change is one undo step. |
| 5 | **Node details panel.** The header and every section, transact edits, live refresh, follow selection, and the footer. | Tests: one property edit is one undo step (with an earlier change first); a scrub is one step; `beforeChange`/`afterChange` fire; `onAddPropertyToPanel` takes over its property; a class that does not extend `LGraphNode` works; a canvas widget change updates the open panel; follow selection switches nodes; `node-removed` closes the panel; the Execution section lists the issues of an invalid mode. |
| 6 | **Contributions.** `registerPanelSection` and `ctx.panels.registerSection`, with the declarations. | Test: a section renders when `when()` is true, is skipped when it is false, and is gone after the extension is disposed. `check:types` passes. |
| 7 | **Docs and verification.** A guide section (value types, the property info keys, editors, sections, an example node), `callbacks.md`, `CHANGES.md`, the codebase map, a roadmap line for the branch, and catalog row X-13. Run `npm run build` (a separate `build:` commit) and check both panels and the new widgets in `apps/editor/editor_build.html` (`npm run editor`, port 8000) at desktop width and 400 px. Write the execution record. | `npm run check` passes; screenshots are in the execution record. |

## Out of scope (follow-ups)

- movable, floating, stacked and saved panel layouts (X-13);
- multi-node editing;
- property presets (X-11);
- settings export, import and profiles (X-12);
- a light theme;
- a Monaco code editor (JS-15);
- group and reroute panels;
- converting an input slot into a widget and back.

## Risks

- **Size of `lgraphcanvas.js`:** the canvas file is over 10,000 lines. The panel code moves to `panels.js` and keeps the canvas as an explicit parameter, never `LGraphCanvas.active_canvas`.
- **Properties backed by widgets:** a property backed by a widget (`options.property`, or a widget with the same name) is listed once, under Properties.
- **Focus during refresh:** live refresh must not take focus away from the row being edited, so a row being edited ignores outside `set()` calls until it blurs.
- **Type collisions:** a value type named like a host's own widget type. Registered widget types always win over value types, and plain objects with their own `draw` keep it.
- **jsdom:** it has no `innerText` and no 2D context. The code uses `textContent`, and the tests stub `getContext`.

## History

- 2026-11-22: proposed.
- 2026-11-22: accepted. P1–P5 adopted as recommended; no wave (branch `LG/dev_panel_and_widget`); value types ("widget for type") added as P7; movable and configurable panels recorded as follow-up X-13.
- 2026-11-22: implemented on `LG/dev_panel_and_widget`; see the [execution record](../executions/2026-11-22-panels-and-widgets.md). `getPropertyInfo` was left unchanged (see Consumers).
