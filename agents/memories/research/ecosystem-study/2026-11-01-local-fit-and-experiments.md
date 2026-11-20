# Local fit and progressive experiment proposals

> **Date** 2026-11-01 · **Kind** research · **Status** final · **Base** `3b3957d`

Local source baseline: `3b3957d7f87ad54cc282370e627c8d83993cec4d`. This research runs alongside a separate baseline assessment whose uncommitted tester and runner work is outside this report. Proposed designs below are not implemented APIs.

The most promising direction is to strengthen LiteGraph as a general-purpose graph workspace: meaningful reusable components, efficient authoring, inspectable execution, and extensions that compose. ComfyUI provides concrete examples of a sophisticated authoring environment; LiteGraph-TSX provides a related modularization experiment. Neither should replace this fork's execution and lifecycle contracts without a separate compatibility investigation.

## Local capabilities and gaps

| Area | Inspected local behavior | Implication |
| --- | --- | --- |
| Search | `showSearchBox` implements multi-term substring matching over node type names, slot-type filtering, generic fallbacks, and search extras | Improve ranking, descriptions, preview, and interaction on top of existing type-aware search; do not describe contextual filtering as entirely missing |
| Extensions | Prioritized callbacks can coexist with legacy direct callbacks; keyboard, renamer, and autoconnect examples subscribe to canvas hooks | A contribution registry and owned disposal can build on existing machinery |
| Subgraphs | Nested `LGraph`, explicit graph input/output nodes, inline serialization, event forwarding, nested execution and cleanup | Existing executable components are a useful foundation, but need a stronger authoring and interface model |
| Selection conversion | `Subgraph.buildFromNodes` is unfinished and references an unbound `node` variable | Selection-to-component is a concrete functional gap, not simply visual polish |
| DOM overlays | HTML node helper owns DOM, canvas subscriptions, visibility during nested navigation, and removal/reinsertion | A reusable widget host can generalize this lifecycle instead of introducing another independent overlay mechanism |
| History | Graph snapshots and before/after-change hooks exist | Complex operations need an explicit transaction boundary and rollback/undo behavior before adding more editing surfaces |
| Execution | `runStep` and `doExecute` execute synchronously; readiness and cleanup expose asynchronous barriers | Keep continuous/event execution distinct from any future async workflow scheduler |
| Distribution | Main/core/Node entry points, ESM/CJS artifacts, shared declaration identity | A new UI shell should remain optional; the current `/core` also exports canvas-related classes and is not a renderer-free package |

Source anchors: [search implementation](../../../../src/lgraphcanvas.js#L7019), [callback handler](../../../../src/callbackhandler.js), [extensions](../../../../src/extensions/keyboard_helper.js), [subgraphs](../../../../src/subgraph.js), [HTML lifecycle](../../../../src/nodes/html.js), [execution and history](../../../../src/lgraph.js), [node execution](../../../../src/lgraphnode.js#L931), and [distribution contracts](../../../../docs/development.md).

### Bounded executable observation

A Node probe imported the checked-in `build/litegraph.js`, created `basic/const` and `graph/subgraph`, added both to a graph, and called `subgraph.buildFromNodes([constant])`. It produced `ReferenceError: node is not defined`; cleanup then completed through `clearAsync()`. The source at `src/subgraph.js` uses `ids[node.id] = nodes[i]` without declaring `node` in that loop, and the rest of the method contains unfinished conversion steps. Fixing that reference alone would not establish a complete conversion algorithm.

This was a focused probe, not a rerun of the baseline gate. No source or generated artifact was changed.

## The important boundaries

### Document, execution, and presentation state

Three kinds of state need separate ownership:

- **Document state:** nodes, links, configuration, component interfaces, and intentional saved layout.
- **Execution state:** current values, pending work, errors, timings, and run identity.
- **Presentation state:** selection, navigation, open inspectors, transient previews, and focus.

Some view preferences should persist, such as a comparer orientation. A video element, observer, temporary URL, or running request should not become graph JSON. Rich widgets are easier to maintain when they declare which state is saved and which resources must be disposed.

The runner already separates an executing worker graph from the editor preview. A future inspector must communicate whether a displayed value belongs to a local preview, a worker, a previous run, or an obsolete graph revision. Serialization alone is not a live-value transport.

### Subgraph document structure and node identity

The local representation stores a nested graph inside its node. ComfyUI's current implementation introduces more explicit definitions, interfaces, promoted controls, and application identity mapping; details are in the [ComfyUI report](2026-11-01-comfyui-core-frontend.md).

ComfyUI's developer documentation distinguishes local node IDs, execution paths, and UI locator IDs. That is a useful conceptual distinction, but its exact ID encoding is not automatically suitable for this runtime. A local inspector should resolve a structured graph path and node identity through one service, rather than letting every extension invent a string convention. [ComfyUI identity documentation](https://github.com/Comfy-Org/docs/blob/8d7322cf43d0db34a2de6f71e4a05e6c943073fb/custom-nodes/js/subgraphs.mdx)

Blueprint reuse needs its own policy. ComfyUI's user guide says nodes inserted from a blueprint can be edited independently. A reusable template is therefore not evidence of automatically linked instances or version migration. For this fork, decide explicitly between copy-on-insert templates and linked definitions. Start with copy-on-insert if the immediate need is reusable snippets; introduce linked components only with versioning and migration semantics. [ComfyUI blueprint behavior](https://github.com/Comfy-Org/docs/blob/8d7322cf43d0db34a2de6f71e4a05e6c943073fb/interface/features/subgraph.mdx)

### Commands and graph transactions

Menus, shortcuts, toolbars, search, and extensions should invoke the same operation for a shared action. For example, “convert selection to subgraph” should have one implementation and one undo entry, regardless of where it is invoked.

The operation must determine boundary links, construct interfaces, preserve internal links and payload semantics, update selection, and either complete or restore a coherent graph. Runtime resource ownership makes this harder than moving drawing objects. During conversion, removal hooks must not accidentally destroy resources that are being transferred without a defined restart policy.

ComfyUI documents that removal can occur during restructuring, and recommends cleanup for subgraph listeners. Its newer menu API also replaces direct menu monkey patches with contribution hooks. These are useful reasons to make lifecycle and command ownership explicit here. [Subgraph lifecycle](https://github.com/Comfy-Org/docs/blob/8d7322cf43d0db34a2de6f71e4a05e6c943073fb/custom-nodes/js/subgraphs.mdx), [context menu contributions](https://github.com/Comfy-Org/docs/blob/8d7322cf43d0db34a2de6f71e4a05e6c943073fb/custom-nodes/js/context-menu-migration.mdx)

## Proposed sequence

This is a dependency order for small experiments, not a commitment to a large rewrite. Complete relevant baseline acceptance first; read the other reports before selecting implementation scope.

### Experiment 1: Commands and disposable contributions

**Outcome:** independently authored shortcuts, menu items, and inspectors can coexist and be removed cleanly.

Introduce a narrow host interface with extension identity, declared capabilities, command registration, scoped callbacks, and disposal. Preserve the existing callback API. A registration should return a disposable handle or contribute to an owner-controlled cleanup scope. Configuration changes and graph mutations need different APIs from read-only inspection.

First migrate only the renamer extension as a demonstration. Provide the same command from a keyboard shortcut and menu. Do not introduce npm workspaces or a framework dependency to prove this behavior.

Acceptance:

- Register, unregister, and register again without duplicate handlers or menu entries.
- Two extensions contribute independently; unloading one preserves the other.
- The command observes the active nested graph and ignores text-entry keystrokes.
- Renaming produces one undoable change and preserves legacy callback behavior.

### Experiment 2: Contextual search with an insertion transaction

**Outcome:** a user dragging from a slot can find, understand, and insert the next useful operation.

Separate the search index from the search UI. Index metadata without constructing every node: title, aliases, category, description, input/output types, runtime support, and extension origin. Preserve unknown and wildcard types without presenting them as proven compatible.

Compare exact-title, prefix, token, and fuzzy matching using a fixed query corpus. Show why a result is relevant, expose port information, support keyboard selection, and keep incompatible candidates visibly separate when offered. Favorites and recent choices should be optional preferences rather than hidden changes to graph semantics.

Acceptance:

- Search from both input and output directions, insert into an existing link, and cancel without changing the graph.
- Insertion creates one undo entry; undo and redo restore original endpoint identities.
- Search does not initialize hardware or network nodes to obtain metadata.
- Keyboard focus remains usable at different zoom levels and after closing the panel.
- Measure median and p95 query time with a synthetic large catalog; set a target after collecting a baseline rather than inventing current performance numbers.

### Experiment 3: Subgraph authoring and a public component interface

**Outcome:** select a useful part of a graph, turn it into a component, and operate its important controls from outside.

Start with a simple data-only selection and reversible conversion. Then add event links, nested selections, promoted controls, and resource-bearing nodes in separate increments. Treat display labels separately from stable port identity so renaming or reordering an interface cannot silently reconnect the wrong ports.

A promoted widget should describe a binding to an inner property or control, including type, default, constraints, and serialization policy. Avoid copying arbitrary live widget objects. Define how a promoted control interacts with an externally connected input: which value wins, what is displayed, and whether the control remains editable.

Acceptance:

- Convert and unpack while preserving external boundary links and internal behavior.
- Rename/reorder ports, save/reload, clone, nest twice, and undo/redo each operation.
- Preserve event payload and action identity across boundaries.
- Loading/failed inner nodes and pending cleanup remain visible to graph lifecycle barriers.
- Test duplicate local IDs across different nested graphs, UUID mode, missing node types, and interface evolution.
- Navigation restores the parent view, selection, and keyboard focus predictably.

### Experiment 4: Widget host and a rich preview reference

**Outcome:** extensions can provide a useful image comparer, waveform, table, or media preview through a consistent lifecycle.

Generalize the existing HTML overlay helper into a host contract: mount, update, resize, visibility, focus, and dispose. Keep the rendering technology behind that interface. Canvas drawing remains appropriate for lightweight graph elements; DOM widgets can supply rich controls. Framework adapters can follow actual consumer needs.

Use one image comparer as the first reference. The [custom-node report](2026-11-01-comfyui-custom-node-ui.md) identifies concrete examples of state separation, async request guards, and media cleanup.

Acceptance:

- Rapid input changes cannot display an older request as the latest result.
- Repeated node removal/reinsertion, nested navigation, and canvas-host movement do not accumulate listeners or elements.
- Save/reload retains chosen view settings without embedding transient media objects.
- Hidden previews release or suspend unnecessary work according to their declared policy.
- Controls have labels, visible focus, and usable keyboard behavior; canvas zoom does not make DOM hit targets disagree with their visual position.

### Experiment 5: Execution inspector across editor and runner

**Outcome:** a user can explain why a node ran, why it is waiting, and whether an output belongs to the current run.

Represent execution observations as records containing graph revision, graph/node identity, run identity, event cause, timing, status, and bounded value summaries. Keep transport and renderer independent. Handle unavailable values and resource handles explicitly rather than serializing arbitrary runtime objects.

Acceptance:

- Inspect equivalent observations from local stepping and worker execution.
- Recognize loading, initialization failure, execution failure, stopped state, and disconnected runner state.
- Graph replacement invalidates obsolete observations; reconnect does not imply continuity that the worker cannot establish.
- Instrumentation can be disabled and its runtime overhead measured.

## Longer-term directions to keep open

| Direction | Evidence needed before committing |
| --- | --- |
| TypeScript source migration | Module-by-module type coverage, preserved public declarations, build parity, consumer compatibility; TSX is a reference, not a ready migration |
| New renderer or framework shell | Prototype measurements and accessibility/UX gains against the current canvas; preserve the embedding API |
| Linked component definitions | Stable identity, dependency tracking, explicit update policy, schema migration, and editable-instance semantics |
| Async workflow execution | Completion, cancellation, concurrency, backpressure, stale-result, and error contracts separate from readiness/cleanup |
| Extension/package catalog | Metadata, compatibility ranges, distribution/runtime support, provenance, and a useful authoring experience for a small number of real contributors |
| AI-assisted graph editing | Stable commands, validated graph mutations, structural diff, reversible transactions, and clear execution effects |

## Decision criteria

Prioritize a proposal when it reduces a demonstrated user difficulty, reuses existing local contracts, improves more than one application, has a bounded validation path, and can be delivered without forcing unrelated migrations. A mature ecosystem is evidence that a pattern deserves study; it does not establish portability, correctness in this runtime, or compatibility with other extensions.

Prefer independent implementation of a behavioral pattern when source depends heavily on ComfyUI application services. For actual source reuse, record file-level provenance and license, retain applicable notices, and review the intended distribution. The local project is MIT; the studied repositories do not all share one license.
