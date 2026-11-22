# Panels and widgets: value types, options panel, node details panel

> **Date** 2026-11-22 · **Kind** execution · **Status** final · **Base** `LG/dev_panel_and_widget` @ `9926717` · **Plan** [panels and widgets](../plans/2026-11-22-panels-options-node-details.md)

This record covers the plan's steps 1 to 7 on the parallel branch `LG/dev_panel_and_widget` (not a wave). The work added:
- value types, one registry from a type to its canvas widget and panel editor;
- two new canvas widgets: colour and vector;
- the shared widget write path;
- the panel shell and its editors;
- the rebuilt options panel and node details panel;
- panel contributions, docs and a browser check.

Nothing is merged into `LG/dev` yet.

## Changes

- `723e3c4` `docs:` plan accepted (P1–P5 as recommended, P6 no wave, P7 value types); X-13 added to the catalog.
- `a6e66ce` `feat:` value types (`src/valuetypes.js`):
  - `addWidget` resolves value types; `ColorWidget` and `VectorWidget` are new;
  - number drags keep an unrounded copy;
  - new `widgetImplementation` rules;
  - `applyWidgetValue`;
  - `GraphInput.setValueWidgetType`;
  - the property dialog parses through value types.
- `c61d707` `feat:` `src/panels.js` (`PanelBuilder`, `PanelHost`, editors):
  - the Graph, Canvas and Settings options panel and the node details panel;
  - `registerPanelEditor` and `registerPanelSection`, with `ctx.panels` and `ctx.valueTypes` in extensions;
  - the panel CSS (`--lg-panel-*`);
  - declarations.
- `670a3be` `fix:` issues found in the browser check:
  - widgets from another library copy;
  - `[hidden]` rows;
  - label wrapping;
  - read-only values as text;
  - canvas option order;
  - the Editor's follow-selection default;
  - `PORT` in `apps/editor/server.js`.
- `docs:` the guide (widgets by value type, the Value types and Panels sections), `callbacks.md` (side panel methods), `CHANGES.md`, the codebase map, the roadmap, the plan status and this record.
- `build:` regenerated `build/` and `build_node/`.

## Verification

- **`npm run check`** passed on the final tree: lint, the 12 builds, strict types and export parity, Jest (45 suites, 841 tests), node:test integration (99), and the package check.
- **New tests:**
  - `test/valuetypes.test.js` (8): aliases, base merging, replace and restore, coercion and validation for every built-in type, `resolveEditor`, `resolveWidgetClass`.
  - `test/widgets.test.js`, 7 added:
    - int, colour and vec3 widgets;
    - int drag;
    - `applyWidgetValue`;
    - vector drag and typed component;
    - colour picker with alpha;
    - a changed type, own legacy draw, and a widget from another library copy;
    - a `graph/input` switched to boolean, with its value kept.
  - `test/panels.test.js` (23):
    - every compatibility-contract item and each editor;
    - search, counts, highlight, sort, modified filter, collapse memory;
    - options tabs, categories, host-added options, search across tabs, extension settings, one undo step for a model change, canvas defaults;
    - node panel: text-only header (an `<img onerror>` description is not run), sections, one undo step per edit and per drag, `beforeChange`/`afterChange`, `onAddPropertyToPanel`, `onShowCustomPanelInfo`, `block_delete`, live refresh, follow selection, slot links, a node class that does not extend `LGraphNode`;
    - contributed sections removed when the extension is disposed.
- **Browser check** in `apps/editor/editor_build.html`, served from this worktree on port 8011 (`PORT=8011 node apps/editor/server.js`; port 8000 was taken by the main checkout):
  - **Canvas widgets:** a node with `slider`, `int`, `color` and `vec3` widgets draws all four. Before the `670a3be` fix, the int widget threw and the rest were not drawn, because the page loads the bundle and the src modules side by side.
  - **Node panel** (double click):
    - header, General, Properties with Transform and Look subsections, Widgets, Inputs with a link button, Outputs, and the collapsed Execution and Advanced sections;
    - typing 12 in `count` updated the canvas widget;
    - with action history on, one panel edit added one history entry.
  - **Options panel:**
    - the Graph tab shows the model and its description, and the document facts as text;
    - the Canvas tab shows categorized switches with labels;
    - searching "badge" showed five settings rows under a "Settings" heading, dimmed the other tabs and highlighted the matches.
  - **Layout:** the dock switch moved the panel to the right and saved `LiteGraph.Panel.Side`. In a 380 px container the panel took 360 px.
  - **Console:** no errors except the expected Web MIDI permission errors.

## Notes and limits

- **Undo in the Editor:** it runs with `LiteGraph.actionHistory_enabled` off, so Ctrl+Z does nothing there, for panel edits or any other. With history on, a panel edit is one entry. Undo restores what `serialize` captured: a node without `serialize_widgets` gets its widget defaults back.
- **Phone widths:** the Editor page has no viewport meta, so a phone renders it 980 px wide. The panel's narrow layout was checked in a narrowed container instead.
- **Not done:** the options panel was opened through `showShowGraphOptionsPanel()` (the canvas menu entry calls the same method; the menu item was seen). The `resource` picker hook (`options.pick`) is covered by type and editor tests only, with no host picker.
- **Follow-ups:** movable, floating and stacked panels and saved layouts (X-13); multi-node editing; property presets (X-11); settings profiles (X-12); a light theme on the `--lg-panel-*` variables.
