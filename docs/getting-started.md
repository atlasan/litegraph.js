# Getting started

This page takes you from install to a running graph, in the browser and in Node.js. The [guide](guide.md) covers each feature in depth, and [architecture](architecture.md) explains how the pieces fit together.

## Install

```sh
npm install @litegraph/litegraph
```

The library has no required dependencies. Node types that talk to the outside world rely on optional packages, which npm installs by default:

| Package | Used by |
|---|---|
| `socket.io`, `socket.io-client`, `ws`, `osc-js` | network nodes |
| `ps-list`, `diskusage`, `node-os-utils`, `node-windows`, `chalk` | system nodes in the Node bundle |
| `node-fetch` | only before Node.js 18 |

If you install with `--omit=optional`, a node that needs one of these packages reports its name and the install command.

## Entries

| Import | Contents |
|---|---|
| `@litegraph/litegraph` | Classes, canvas and the node catalog (ESM and CommonJS) |
| `@litegraph/litegraph/core` | Classes and canvas, without the node catalog |
| `@litegraph/litegraph/node` | Adds the Node.js-only nodes and the optional editor and extensions (CommonJS) |
| `@litegraph/litegraph/build/<file>`, `/build_node/<file>` | One of the 12 committed bundles, by its path |
| `@litegraph/litegraph/css/litegraph.css` | Canvas, menu and panel styles |

The bundles initialize themselves when imported.

## In the browser

```html
<link rel="stylesheet" href="node_modules/@litegraph/litegraph/css/litegraph.css">
<canvas id="graph" width="1024" height="720"></canvas>
<script type="module">
    import { LiteGraph, LGraph, LGraphCanvas } from "./node_modules/@litegraph/litegraph/build/litegraph.js";

    const graph = new LGraph();
    new LGraphCanvas("#graph", graph);
    const value = LiteGraph.createNode("basic/const");
    const watch = LiteGraph.createNode("basic/watch");
    value.pos = [100, 100];
    watch.pos = [350, 100];
    graph.add(value);
    graph.add(watch);
    value.connect(0, watch, 0);
    graph.start();
</script>
```

The bundles are ES modules, so load them with `type="module"` (a classic `<script src>` will not work).

## In Node.js

```js
const { LiteGraph, LGraph } = require("@litegraph/litegraph");

const graph = new LGraph();
const value = LiteGraph.createNode("basic/const");
const watch = LiteGraph.createNode("basic/watch");
graph.add(value);
graph.add(watch);
value.connect(0, watch, 0);
graph.runStep();
console.log(watch.value); // the const's value
```

To run a saved document, call `graph.configure(JSON.parse(text))`, then `await graph.whenReady()`, then `graph.start()` or `graph.runStep()`. The examples in `headless/examples/` load documents this way.

## Save and load

- `graph.serialize()` returns the document and `graph.configure(data)` loads it.
- Subgraphs are saved in ComfyUI's `definitions.subgraphs` form (`LiteGraph.subgraph_format = "definitions"`). Use `"inline"` if older builds of this library must read the file.
- ComfyUI workflows go through the interop extension (`src/extensions/comfy_interop.js`).

## The apps in this repository

```sh
npm ci --ignore-scripts
npm run editor        # editor:  http://127.0.0.1:8000/editor/editor_build.html (also /apps/editor/...)
npm run graphrunner   # runner:  http://127.0.0.1:3000/
npm start             # both
```

- **Apps:** the editor, tester and runner live in `apps/editor`, `apps/tester` and `apps/runner`; their old URLs and the old `headless/graphrunner/server/index.js` path keep working.
- **Editor:** `editor_build.html` loads the bundle with the extensions, and `index.html` loads `src/` directly.
- **Runner:** runs each graph in its own worker.
  - It only accepts its own page (Origin and Host checks).
  - It refuses dangerous node types; the refusal names the setting that allows them, for example `RUNNER_ALLOW_TYPES=@host-read`.
  - Script evaluation stays off unless `RUNNER_ALLOW_SCRIPTS=1`.

## Next steps

- **Building nodes:** the [guide](guide.md) covers widgets, events and callbacks, subgraphs and function nodes, components, packs and extensions.
- **Callbacks:** [callbacks](callbacks.md) lists the hooks and their priorities.
- **Contributing:** [development](development.md) covers the setup and the `npm run check` gate.
