# litegraph.js (atlasan fork)

A node-graph library for the browser and Node.js: draw, edit and run graphs of nodes, in the spirit of Unreal Blueprints. This is an unofficial fork of [jagenjo/litegraph.js](https://github.com/jagenjo/litegraph.js). It focuses on general-purpose execution, a modern platform layer and a secured headless runner.

![Node graph](imgs/node_graph_example.png)

## Quick start

```js
import { LiteGraph, LGraph, LGraphCanvas } from "@litegraph/litegraph";

const graph = new LGraph();
new LGraphCanvas("#canvas", graph);          // omit in Node.js
const a = LiteGraph.createNode("basic/const");
const b = LiteGraph.createNode("basic/watch");
graph.add(a); graph.add(b);
a.connect(0, b, 0);
graph.start();
```

The package has three entries:
- `@litegraph/litegraph`: classes and the node catalog
- `/core`: classes only
- `/node`: adds Node-only nodes

Each entry works with ESM and CommonJS. In the browser, the bundles are ES modules: load `build/litegraph.js` with `<script type="module">`, plus `css/litegraph.css`. The library has no required dependencies; the network and system nodes use optional packages that npm installs by default.

**Status:** `0.18.0-dev.2` is the dev pre-release of this line to be tagged, for testers (`0.18.0-dev.1` was never tagged). Start with [getting started](docs/getting-started.md).

To run locally:

```sh
npm ci --ignore-scripts
npm run editor        # http://127.0.0.1:8000/editor/editor_build.html (apps/editor)
npm run graphrunner   # http://127.0.0.1:3000/
```

Or with the launcher (Bun when installed, else Node): `./lg.sh` for a menu, `./lg.sh start`, `./lg.sh open editor`, `./lg.sh status`, `./lg.sh stop`; `lg` on Windows. See [the launcher](docs/getting-started.md#the-launcher).

## What this fork adds

- **Execution:**
  - ON_REQUEST mode, which pulls ancestors on demand.
  - Deferred actions and event-cycle guards.
  - Node readiness with async dependency loading.
  - Awaitable start, stop and cleanup.
- **Platform:**
  - Registries for commands, key bindings, settings and menus.
  - `registerExtension`, which disposes everything an extension added.
  - Typed events.
  - Node definitions with capabilities.
  - A library manifest.
- **Editor:**
  - Widget classes and widget inputs.
  - Unified selection of nodes, groups and reroutes.
  - Reroutes, transactional undo, and pointer gestures.
  - Callback handlers that accept several prioritised handlers per hook.
- **Runner:**
  - `apps/runner` runs each graph in its own worker.
  - It checks Origin and Host, refuses dangerous node types, and keeps scripts locked unless explicitly allowed.
- **Subgraphs:**
  - Definitions in ComfyUI's document form, shared by linked instances.
  - Interface editing, promoted widgets and path ids.
  - `graph/function` calls a definition, and components register definitions as node types.
- **Ecosystem:** packs with provenance, a missing-nodes report and replacement mappings; a shared execution-state protocol for the editor and the runner.
- **Interop:** ComfyUI workflow JSON import and export, subgraphs included (`src/extensions/comfy_interop.js`).
- **Quality gate:** `npm run check` runs lint, 12 builds, strict type consumers, over 500 Jest and integration tests, and a package check; the local CI (`npm run ci:local`) runs it in a clean clone of a commit, checks that the milestone bundles were left untouched, and writes a proof report; the GitHub workflow is kept but off by default.

## Documentation

| For | Read |
|---|---|
| Starting out | [Getting started](docs/getting-started.md), [architecture](docs/architecture.md) |
| Using the library | [Guide](docs/guide.md), [callbacks](docs/callbacks.md), [API](docs/api/index.html) (generated) |
| Developing it | [Development](docs/development.md), [AGENTS.md](AGENTS.md), [CHANGES.md](CHANGES.md) |
| Where it is going | [Roadmap](agents/plans/roadmap.md), [ideas](agents/ideas/README.md) |
| How it works and what we learned | [Codebase map](agents/memories/codebase/README.md), [research](agents/memories/README.md), [audits](agents/audits/README.md) |

## History

| Period | What happened |
|---|---|
| **2022** | Experiments on top of upstream: autoconnect, type-filtered search, Ctrl+Z/Y history, ON_REQUEST mode with ancestor execution, logic and compare nodes |
| **2024** | Class and ES6 refactor, thanks to @daniel-lewis-ab (now [litegraph-tsx](https://github.com/litegraph-tsx/)). Prioritised callback handlers, better debug logging, fuzzy search, keyboard-navigable menus, slot repair on `configure`, nested groups, first extensions |
| **2026** | Stabilization and validation, then the roadmap waves: safety and the runner lockdown (Wave 0), the platform layer (1), authoring ports from the MIT standalone (2), the subgraph system (3), ecosystem and workspace (4), packaging and repository layout (5). See the [roadmap](agents/plans/roadmap.md) |

## Credits

The original library and editor are by **Javi Agenjo** ([jagenjo](https://github.com/jagenjo/litegraph.js)).

Contributors include atlasan, kriffe, rappestad, InventivetalentDev, NateScarlet, coderofsalvation, ilyabesk, gausszhou and daniel-lewis-ab.

Projects built on litegraph include [ComfyUI](https://github.com/comfyanonymous/ComfyUI), WebGLStudio, MOI Elephant and MyNodes; there are [many more](agents/ideas/landscape/litegraph-census.md).

MIT licensed; see [LICENSE](LICENSE).
