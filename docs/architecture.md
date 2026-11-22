# Architecture

How the library is put together, for readers who want to change it or build on it. For a file-by-file index, see the [codebase map](../agents/memories/codebase/README.md); for usage, the [guide](guide.md).

## Source and builds

- **Sources:** the library is ES modules in `src/`.
- **Bundles:** `build.py` concatenates them in dependency order into 12 bundles: the same six in each format: core, standard, standard minified, full, full minified, and the Node.js full bundle (which adds the Node-only nodes), as ESM in `build/` and CommonJS in `build_node/`.
- **Committed output:** the bundles are committed. CI rebuilds them and fails when they differ from the sources (`npm run check:fresh`).
- **Exports:** `package.json` maps `.`, `./core` and `./node`, and lists each bundle by its path. Nothing else is exported.
- **Types:** `src/*.d.ts` / `*.d.cts` declare the public API. `npm run check:types` fails when the declared exports and the runtime exports differ.
- **One global:** every bundle shares the global `LiteGraph` singleton (`global.js`), so a page that loads a bundle and `src/` modules gets one `LiteGraph`.

## Layers

```text
platform     commands · key bindings · settings · menus · extensions · packs · node definitions · search
graph        LGraph · LGraphNode · LLink · groups · reroutes · subgraphs and definitions · transactions
execution    runStep · modes (ALWAYS, ON_EVENT, NEVER, ON_TRIGGER, ON_REQUEST) · events · deferred actions
canvas       LGraphCanvas · DragAndScale · CanvasPointer gestures · LinkConnector · widgets · panels
apps         editor (Editor shell) · tester · runner (one worker per graph)
```

The canvas uses the graph; the graph never needs a canvas, which is how the runner and Node scripts work.

## Graph model

- **`LGraph`:** owns nodes, links (by id), groups, reroutes and floating links. It runs the execution loop and records history.
- **`LGraphNode`:** a node type is any class registered with `LiteGraph.registerNodeType`; registration copies `LGraphNode`'s methods onto it, so classes need not extend it. Nodes have:
  - slots, properties and widgets;
  - callbacks (`onExecute`, `onAction`, …) with prioritised handlers ([callbacks](callbacks.md));
  - a readiness state for async dependencies loaded through `LibraryManager`.
- **Transactions and history:** `graph.transact(label, fn)` groups changes into one undo step. History is snapshot-based.
- **Events:** typed events (`graph.events.on(...)`) report changes: nodes, links, properties, widgets, steps, errors (with the failing node's path) and subgraph definitions.

## Execution

A document runs under an **execution model**, named in the root graph's `config.execution` and applied to all its subgraphs (`src/execution.js`, `ExecutionEngine`):

| Model | Delivery | Refresh | Notes |
|---|---|---|---|
| `ancestors` (new graphs) | immediate | ON_REQUEST data ancestors, memo per frame and call | ALWAYS nodes pull their ON_REQUEST inputs each frame |
| `step` | deferred to the node's turn | none | today's core default |
| `strict` | deferred | none | each node executes once per frame |
| `event` | immediate | none | pure push |
| `legacy` | from the global flags | | documents saved without the field |

`runStep` visits nodes in topological order:
1. it delivers queued (deferred) actions;
2. under `ancestors`, it pulls an ALWAYS node's ON_REQUEST inputs;
3. it executes `ALWAYS` nodes.

Events travel along links:
- An `ON_TRIGGER` node (or an `onTrigger` input) runs when triggered.
- An `ON_REQUEST` node runs only when a node downstream needs its value. Under `ancestors` that is a pull before an action, a trigger or an ALWAYS node's turn; it runs again only when an input has newer data (`setOutputData` stamps a data version on the links).
- A refused event (re-entry, a NEVER target, no handler, a limit) emits `event-dropped` with its reason; limits name their setting (`LiteGraph.Execution.MaxEventDepth`, `MaxEventPasses`).

Node types may declare what they need (`static def.execution`: valid models and modes, a default mode, `emit: "immediate"` for loops, `ticks` for timers, `pure` for nodes that are ON_REQUEST under `ancestors`). Mode changes check the declarations; `graph.checkExecution()` reports what does not fit. The model is shown and changed in the graph info (canvas menu "Options"). See [decision 0002](../agents/memories/decisions/0002-execution-models.md).

Mode 4 is ON_REQUEST here; ComfyUI's BYPASS is mapped explicitly by the interop extension.

## Subgraphs

- **Definitions:** a subgraph's content is a *definition*, kept in the root graph's registry `graph.subgraphs`. Documents store definitions in ComfyUI's `definitions.subgraphs` form, with `-10`/`-20` interface links and stable slot ids. `SubgraphDefs` converts between that form and the runtime, as pure JSON.
- **Runtime:** each `graph/subgraph` instance runs its own copy of its definition as a nested graph. `graph/input` and `graph/output` nodes form the boundary, so events and ON_REQUEST cross it.
- **Linked instances:** instances share their definition. Leaving an edited subgraph commits it, and the others refresh, matched by slot id.
- **Promoted widgets** show an inner widget on the instance; the value belongs to the instance.
- **`graph/function`** calls a definition on demand.
- **Components:** `LiteGraph.registerSubgraphType` turns a definition into a node type.
- **Paths:** `node.getPath()` (`"3:7:2"`) and `graph.resolvePath()` address nodes across levels.

## Platform and ecosystem

- **Extensions:** `LiteGraph.registerExtension(def)` adds commands, key bindings, settings, menus and hooks, and removes them all again when it is unregistered.
- **Packs:** `LiteGraph.packs` holds pack manifests (id, version, `requires.litegraph`, nodes). Nodes carry their pack and version. A missing type is reported with its source, and replacement mappings are data that can be applied on load.
- **Search:** `LiteGraph.nodeSearch` ranks node definitions (`LiteGraph.getNodeDefinition`).
- **Execution state:** a versioned message format (`LiteGraph.ExecutionState`) shares node status, progress and errors between the runner and the editor.

## Safety defaults

Every restriction is on by default, can be lifted by a named setting, and says which setting in its refusal:
- **Script evaluation:** off unless `LiteGraph.allow_scripts`; in the runner, `RUNNER_ALLOW_SCRIPTS=1`.
- **Runner:** checks Origin and Host, and refuses dangerous node families at any depth, including inside subgraph definitions (`RUNNER_ALLOW_TYPES`).
- **LibraryManager:** no shell, validated package specs, and remote code only when it is enabled.
- **Packs:** a pack that needs another litegraph version is refused unless `LiteGraph.Packs.AllowIncompatible`.

## Where to look next

- **Codebase map:** [agents/memories/codebase/README.md](../agents/memories/codebase/README.md), file by file.
- **Decisions:** [agents/memories/decisions/](../agents/memories/decisions/), for example ADR 0001 on the subgraph format.
- **Plans and records:** [agents/plans/roadmap.md](../agents/plans/roadmap.md) and [agents/executions/](../agents/executions/README.md).
