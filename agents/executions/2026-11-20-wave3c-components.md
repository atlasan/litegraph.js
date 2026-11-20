# Wave 3c: components, blueprints, SA acceptance port

> **Date** 2026-11-20 · **Kind** execution · **Status** final · **Base** `LG/wave3c_components` @ `0e50ba3` · **Plan** [Wave 3: subgraph system](../plans/2026-11-20-wave3-subgraph-system.md)

Part 3c delivered plan steps 10–12 on `LG/wave3c_components`, cut from `LG/dev` @ `2603571`. This completes Wave 3:
- 10: components;
- 11: blueprints;
- 12: the standalone's subgraph tests adapted as acceptance cases.

## Changes

- `e983299` `feat:` components and blueprints:
  - **Components:** `LiteGraph.registerSubgraphType(type, definition, {revision, title, category, definitions})` registers a definition as a node type. It shows in search, slot filters and menus, and a definition that contains itself is refused. The class (`Subgraph.componentClass`) builds its inner graph from the definition.
  - **In documents:** inserting a component gives the document its definition, and instances link to it. Documents save them as plain subgraph instances with `properties.component = {type, revision}`, so they load without the registration.
  - **Updates:** a newer registered revision brings:
    - an "update" badge (setting `LiteGraph.Subgraph.UpdateBadge`);
    - "Update from <type>" in the node menu;
    - the command `litegraph.subgraph.updateFromSource`.
    `Subgraph.updateFromSource` refreshes every linked instance as one undo step.
  - **Blueprints:**
    - `LGraph.insertDefinition(definition | id, {pos, linked, definitions})` inserts a copy with a new id by default, or a linked instance. Nested definitions identical to the document's are shared; differing ones get new ids, with their references remapped.
    - `LGraph.insertBlueprint(json)` takes a definition, or a document with `definitions.subgraphs`.
    - "Insert subgraph" in the canvas menu lists each document definition, linked or as a copy.
- `962dfa8` `test:` 43 acceptance cases adapted from Comfy-Org/litegraph.js @ `ea0e1a8` (MIT), `test/subgraph/*`, each named after its source:
  - Files covered: Subgraph, SubgraphNode, SubgraphIO, SubgraphEdgeCases, SubgraphSerialization, subgraphSerialization, subgraphUtils, SubgraphNode.titleButton, SubgraphMemory.
  - Deliberate differences, listed in the file header:
    - unused definitions are kept until the remove command;
    - there is no flattened DTO executor;
    - the IO-node class tree is not ported.
  - fix found by the port: a loaded definition's empty `linkIds` are filled from its `-10`/`-20` links, and missing `version`, `name`, `widgets` and IO boxes get defaults. The registry writes definitions back as loaded, so the gaps would have been saved as they were.
- Each `feat:` / `test:` commit has a `build:` commit after it.

## Verification

| Check | Result |
|---|---|
| `npm run check` | lint clean, 12 builds, strict types, **489/489 Jest** (up from 438), 94/94 integration, package check |
| New tests | <ul><li>`subgraph-components` (8): node definition and search, linked instances saved as plain instances and loaded after unregistering, update badge, command and undo, refused recursion, nested component, blueprint copy/linked, nested sharing and remapping, the canvas menu</li><li>`sa-subgraph-port` (43)</li></ul> |
| ComfyUI probes, after the normalization change | schema 79/79; content 0 of 41 fixtures with a difference |
| Browser `editor_build.html` (real clicks) | <ul><li>`demo/square` registered (revision 1); search finds it.</li><li>Two instances are linked: Const 4 gives 16 and 16.</li><li>After registering revision 2 (`+`), both show the green "update" badge.</li><li>Right-click on the canvas: "Insert subgraph" lists "Square" and "Square (copy)".</li><li>Right-click on an instance, then "Update from demo/square": both badges go, and Step gives 8 and 8</li></ul> |

## Left open

- **Wave 3 is complete.** Ideas that came up are in plan §11: higher-order `graph/map`, live sync while editing, IO rails, and reroutes across subgraph boundaries.
- **A file picker for blueprints** in the editor UI: `insertBlueprint` is API only.
