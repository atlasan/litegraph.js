# 3D libraries and standards

> **Updated** 2026-11-19 · **Kind** idea area · **Status** living

Ideas `3D-01`–`3D-22`. The glTF interactivity design is in [card 3D-01](../cards/3D-01-gltf-khr-interactivity.md).

**Question:** which 3D libraries and standards have node or graph systems that litegraph can learn from, import, export or drive?

**Starting point in this fork:**
- `threejs.js` has 22 types on three.js **0.172**. The latest is r187 (0.187.0, 2026-10-30).
- `glshaders.js`, `gltextures.js` and `glfx.js` run on litegl.
- `geometry.js` has 14 types and `math3d.js` has 15.
- There is no offscreen preview path.

## 1. Survey

| Library | License | Graph concept | Integration idea |
|---|---|---|---|
| **three.js TSL / NodeMaterial** | MIT ([repo](https://github.com/mrdoob/three.js)) | TSL builds node shaders in JS (`Fn`, `uniform`, `texture`, `compute()`) and compiles to WGSL or GLSL. NodeMaterial has slots (`colorNode`, `positionNode`, `normalNode`, `outputNode`…), and nodes serialize. Sunag's visual node editor was **archived in r183**, and ScriptableNode was removed ([TSL wiki](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language), [r183](https://github.com/mrdoob/three.js/releases/tag/r183)). | A litegraph → TSL compiler that emits node objects, not strings. It would fill the gap left by the archived editor. |
| **three.js editor** | MIT | No graph. Per-object scripts with init, start, stop, key, pointer and update events ([app.js](https://github.com/mrdoob/three.js/blob/dev/editor/js/libs/app.js)). | Graph-as-script: graph JSON in `object.userData` plus a small player shim [I]. |
| **Babylon.js**: Node Material, Node Geometry, Node Render Graph, Flow Graph | Apache-2.0 ([repo](https://github.com/BabylonJS/Babylon.js)) | NME since v4.1 ([doc](https://doc.babylonjs.com/features/featuresDeepDive/materials/node_material)). Node Geometry is a procedural mesh pipeline with serialize and parse ([doc](https://doc.babylonjs.com/features/featuresDeepDive/mesh/nodeGeometry)). Frame Graph / Node Render Graph (9.0) is a DAG of render tasks ([concepts](https://doc.babylonjs.com/features/featuresDeepDive/frameGraph/frameGraphBasicConcepts/)). Flow Graph is a behavior graph that imports and exports KHR_interactivity ([doc](https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF/khrInteractivity)). | NME and Node Geometry JSON importers. Frame-graph task model for a render-pipeline family. Babylon as a KHR_interactivity conformance oracle. |
| **glTF KHR_interactivity** | Khronos specification | Ratified ([spec](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_interactivity/Specification.adoc); [press, 2026-07-16](https://www.khronos.org/news/press/gltf-interactivity-extension-submitted-for-ratification)). A JSON DAG with `types`, `variables`, `events`, `declarations` and `nodes{declaration, values, flows, configuration}`. 103 `math/*` ops plus `event/*`, `flow/*` (branch, sequence, for, while, doN, multiGate, waitAll, throttle, setDelay, switch), `pointer/get/set/interpolate` (JSON-pointer object model), `variable/*`, `animation/*`, `debug/log`. | **First-class import and export target**: flows map to event/action slots, values to data slots. See [card 3D-01](../cards/3D-01-gltf-khr-interactivity.md). |
| **Khronos InteractivityGraph Authoring Tool** | Apache-2.0 ([repo](https://github.com/KhronosGroup/glTF-InteractivityGraph-AuthoringTool)); Needle fork adds a three.js engine ([fork](https://github.com/needle-tools/glTF-InteractivityGraph-AuthoringTool)) | React authoring tool plus the JS "BasicBehaveEngine"; [PR #127](https://github.com/KhronosGroup/glTF-InteractivityGraph-AuthoringTool/pull/127) reports 2615/2622 subtests passing. | Reference semantics and test harness; code can be adapted with NOTICE. |
| **behave-graph** | ISC ([repo](https://github.com/bhouston/behave-graph)) | The behavior-graph engine that KHR_interactivity grew out of; dormant since 2023. | Design reference only. |
| **PlayCanvas** | Engine MIT; editor frontend MIT since 2025-07 ([blog](https://blog.playcanvas.com/playcanvas-editor-frontend-is-now-open-source/)); [pcui-graph](https://github.com/playcanvas/pcui-graph) MIT | ESM script components with typed attributes; pcui-graph for node UIs. | Bridge script attributes to node slots [I]; pcui-graph as a UI comparison. |
| **A-Frame** | MIT ([repo](https://github.com/aframevr/aframe)) | ECS with schema-typed components. | Nodes generated from component schemas; an `<a-entity litegraph="src:…">` component [I]. |
| **react-three-fiber** | MIT ([repo](https://github.com/pmndrs/react-three-fiber)); koota ECS ISC | Declarative scene; `useFrame` loop. | `<LiteGraphBehavior graph={json}/>` stepping in `useFrame`; ECS trait get/set nodes [I]. |
| **OGL**, **regl**, **twgl** | Unlicense, MIT, MIT | Minimal WebGL, no graph. | Light preview renderer in node bodies; possible replacement backend for the litegl families [I]. |
| **Filament**, **model-viewer** | Apache-2.0 | Renderer; `<model-viewer>` web component. | A model-viewer widget node: glTF preview, camera and variant as inputs [I]. |
| **Needle Engine** | **Not open source** ([EULA](https://needle.tools/eula/)) | Exports Unity Visual Scripting as KHR_interactivity. | Interop through files only; no code reuse. |
| **cables.gl** | MIT ([cables](https://github.com/cables-gl/cables)) | Op-based dataflow with trigger and value ports; `op.schema.json` documents ops. | Compare trigger-port semantics and op documentation schema. |
| **Godot visual shaders** | MIT ([docs](https://docs.godotengine.org/en/stable/tutorials/shaders/visual_shaders.html)) | Per-stage graphs (vertex, fragment, light), expression node, per-node preview. | Design comparison for shader authoring. |

## 2. Ideas

| ID | Idea | Purpose | Kind | Effort | Risks |
|---|---|---|---|---|---|
| 3D-01 | **KHR_interactivity import**: glTF behavior graphs become litegraph graphs in a `khr/*` family ([card](../cards/3D-01-gltf-khr-interactivity.md)) | P3 | io | L | Exact semantics: synchronous flow, `setDelay`, the pointer object model |
| 3D-02 | **KHR_interactivity export**: a palette restricted to spec ops, with validation | P3 | io | L | litegraph allows cycles and arbitrary JS; the spec requires a DAG |
| 3D-03 | **KHR conformance runner** in `node:test` over the Khronos test assets; Babylon or the Khronos engine as an oracle | P3 | runtime | M | The [test assets](https://github.com/KhronosGroup/glTF-Test-Assets-Interactivity) show no license; do not vendor them |
| 3D-04 | **glTF JSON-pointer nodes**: `pointer/get`, `set`, `interpolate` on a loaded three.js glTF | P3 | node | M | Mapping pointer paths to three.js objects |
| 3D-05 | **litegraph → TSL compiler**: a `tsl/*` family whose output node assigns `material.colorNode` and others | P2 | io | XL | TSL API changes per release; needs 3D-12 |
| 3D-06 | **TSL uniform widgets**: live sliders driving `uniform()` without recompiling | P2 | widget | S | Depends on 3D-05 |
| 3D-07 | **Render-pipeline family**: compose passes as a DAG of tasks (Babylon Frame Graph, LiteScene `pipeline.js`) | P2 | node | L | Scope |
| 3D-08 | **Babylon NME JSON importer** into `glshaders` or `tsl` nodes, to reuse the NME snippet corpus | P2 | io | L | Block coverage; Apache NOTICE if code is reused |
| 3D-09 | **Procedural mesh family** after Babylon Node Geometry: instance on vertices or faces, set attributes | P2, P3 | node | M | Performance on large meshes |
| 3D-10 | **Offscreen preview in node bodies**: a worker with OffscreenCanvas renders texture, material and mesh thumbnails, transferred as ImageBitmap | P2, P10 | widget | L | No shared GPU context; Safari |
| 3D-11 | **WebGPU texture preview widget** | P2 | widget | M | Readback cost |
| 3D-12 | **three.js upgrade** 0.172 → current, and a `three/webgpu` entry in the library manifest | P2, P3 | runtime | S | API breaks in the 22 `threejs/*` nodes |
| 3D-13 | **Scene-inspector nodes**: traverse, find by name or tag, children, bounds, raycast | P3 | node | S | — |
| 3D-14 | **three.js editor bridge**: export a graph as a player-compatible script wrapper | P3 | io | M | The editor evaluates scripts from strings; check the runner policy |
| 3D-15 | **A-Frame adapter**: graph per entity; nodes from component schemas | P3 | app | M | Maintenance per framework; implements NUN-05 |
| 3D-16 | **React-three-fiber adapter**: graph stepped in `useFrame`; ECS trait nodes | P3 | app | M | Same as 3D-15 |
| 3D-17 | **model-viewer widget node**: glTF preview and AR handoff | P3, P9 | widget | S | DOM overlay sync with zoom |
| 3D-18 | **Trigger-port conventions and op documentation schema**, after cables.gl | P10 | core | S | — |
| 3D-19 | **regl or twgl backend** as a replacement for litegl in the GL families | P2 | runtime | L | Rewrites 60+ node types; see WGS-10 |
| 3D-20 | **Per-stage shader subgraphs and an expression node**, after Godot | P2 | node | M | — |
| 3D-21 | **PlayCanvas script-attribute bridge** | P3 | app | M | Editor backend is proprietary |
| 3D-22 | **Physics in the scene graph**: pairs JS-30 (Rapier, cannon-es) with three.js objects | P3 | node | M | Fixed timestep versus graph timing |

## 3. Directions worth deciding

1. **KHR_interactivity first** (3D-01 to 3D-04). It is a ratified, engine-neutral standard whose model is close to litegraph's. Babylon and the Khronos engine already give two reference implementations. It is the strongest **interop** candidate in this area [I].
2. **Shader direction:** keep litegl families (WGS-06 to WGS-08), or move to TSL (3D-05)? TSL is the maintained path in three.js, and its node editor is gone, which leaves room for one [I].
3. **Host contract** (NUN-05) before framework adapters (3D-14 to 3D-16 and 3D-21).
