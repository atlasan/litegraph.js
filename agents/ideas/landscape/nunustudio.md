# nunuStudio

> **Updated** 2026-11-19 · **Kind** idea area · **Status** living

Ideas `NUN-01`–`NUN-06`.

**Question:** how could litegraph become the logic and material graph of [nunuStudio](https://github.com/tentone/nunuStudio), a three.js-based web 3D editor? What does that teach about hosting litegraph inside any 3D editor?

## 1. Facts

- **License and activity:** MIT, about 2.2k stars. Last commit 2025-10-22 (v0.98.47). It pins **three 0.119.0** and cannon-es 0.9.1. In practice it is in maintenance [I].
- **Runtime** (`source/core/`):
  - Objects: Program, Scene, cameras, lights, meshes, particles, physics, spine, sprite, text, audio, XR.
  - Resources and a ResourceManager.
  - Animation, post-processing and loaders.
- **Editor** (`source/editor/`): its own DOM component framework, with per-object inspectors and material editors ([tree](https://github.com/tentone/nunuStudio/tree/master/source)).
- **Serialization:** three.js-style `toJSON`. [`ObjectLoader.js`](https://github.com/tentone/nunuStudio/blob/master/source/core/loaders/ObjectLoader.js) switches on `data.type` (about 50 cases, including `"NodeScript"`).
- **Scripts:** [`Script`](https://github.com/tentone/nunuStudio/blob/master/source/core/objects/script/Script.js) hooks are `initialize`, `update(delta)`, `dispose`, `onMouseOver`, `onResize` and `onAppData`, with three include modes. A `PythonScript` also exists.
- **An unfinished node system:**
  - [`NodeScript`](https://github.com/tentone/nunuStudio/blob/master/source/core/objects/script/NodeScript.js) holds a graph from escher.js, tentone's own MIT canvas library.
  - `initialize`, `update` and `dispose` are `// TODO`. Only `BaseNode` and `OperationNode` exist, and `KeyboardEventNode` is empty.
  - The [NodeEditor tab](https://github.com/tentone/nunuStudio/blob/master/source/editor/gui/tab/node-editor/NodeEditor.js) only renders a viewport.

## 2. Integration design

```
nunuStudio object tree                      litegraph
──────────────────────                      ─────────
LiteGraphScript (Group subclass) ── owns ──► LGraph
  toJSON → { graph: graph.serialize() }     configure(graph) on load
  initialize()  ─────────────────────────►  graph.start()
  update(delta) ─────────────────────────►  graph.runStep()
  dispose()     ─────────────────────────►  graph.stop()
  program, scene, this ──── exposed to ──►  nunu/* scene nodes
Editor: NodeEditor tab ─── hosts ────────►  LGraphCanvas
Material editor ── compiles graph to ────►  THREE.ShaderMaterial (r119: no TSL)
```

**[I]** nunuStudio is best treated as a **host-integration reference and a demo target**, not a dependency. Its pinned three r119 is far from the fork's three 0.172 nodes, and upstream is semi-dormant.

## 3. Ideas

| ID | Idea | Purpose | Kind | Effort | Notes |
|---|---|---|---|---|---|
| NUN-01 | **`LiteGraphScript` object** for nunuStudio: an `ObjectLoader` case, lifecycle mapping, scene exposure | P3 | app | M | An external integration package or example, not core |
| NUN-02 | **NodeEditor tab hosting `LGraphCanvas`**, with nunu's inspector driving node properties | P3, P10 | app | M | DOM framework interop; canvas resize and dispose (B10 is fixed) |
| NUN-03 | **Graph → `ShaderMaterial` material editor** | P2 | io | L | r119 limits; reuse `LiteGraph.Shaders` code generation |
| NUN-04 | **three.js version adapter**: `threejs/*` nodes resolve the three instance from the host instead of the manifest, so r119 and 0.17x hosts can coexist | P3 | core | M | API differences across releases; also helps 3D-14 to 3D-16 |
| NUN-05 | **Generic "host scene" contract**: a small interface (get scene, find object, subscribe to lifecycle) that nunuStudio, the three.js editor, A-Frame and R3F adapters all implement | P3 | core | M | Shared by WGS-02, 3D-14, 3D-15, 3D-16 |
| NUN-06 | **Upstream offer**: propose filling nunu's `NodeScript` stub with litegraph as a PR | P3 | app | S | Depends on the maintainer's interest; ask first |

## 4. Open questions

- Is a running nunuStudio demo worth the effort, or is NUN-05 (the host contract) the real deliverable?
- Should escher.js graphs import into litegraph? Probably not; there is little content [I].
