# WebGLStudio, LiteScene and litegl

Date: 2026-11-19. Status: **investigation**, living. Ideas `WGS-01`–`WGS-10`.

**Question:** litegraph was born inside jagenjo's WebGLStudio, a browser 3D editor built on LiteScene (engine) and litegl (WebGL wrapper). How did that stack use graphs? What can this fork revive, given that it still ships litegl-based node families (`glshaders.js`, `gltextures.js`, `glfx.js`)?

## 1. Status and licenses

| Repository | License | Last activity | State |
|---|---|---|---|
| [webglstudio.js](https://github.com/jagenjo/webglstudio.js) | MIT | Archived 2026-07-14 | README says it was abandoned and moved to [onedit.org](https://www.onedit.org/); no public OnEdit source found [I] |
| [litescene.js](https://github.com/jagenjo/litescene.js) | MIT | 2020-08-02 (the `LS.` namespace was renamed to `ONE.`) | Dormant |
| [litegl.js](https://github.com/jagenjo/litegl.js) | MIT text (derived from lightgl.js); GitHub reports NOASSERTION | 2026-07-24, merged "Typescript conversion" (#15) | Active-ish; may diverge from our vendored `editor/js/libs/litegl.js` [I] |
| [rendeer.js](https://github.com/jagenjo/rendeer.js) | MIT | 2025-05-22 | Low activity; no litegraph code |

**Reuse class:** `adapt`, with attribution.

## 2. How LiteScene used litegraph

Sources: `src/graph/`, `src/components/graphComponents.js`, `src/resources/graphCode.js`, `src/materials/graphMaterial.js` in [litescene.js](https://github.com/jagenjo/litescene.js/tree/master/src), and the [graphs guide](https://github.com/jagenjo/litescene.js/blob/master/guides/graphs.md).

| Concept | What it did |
|---|---|
| **GraphComponent** | A component on a scene node that owns an `LGraph`; `graph.getScene()` returns the scene. Its `on_event` chooses when the graph runs: start, update, render, beforeRenderScene, afterRenderScene or trigger. It serializes as `{graph_data or from_file, graph_properties, on_event}`. |
| **FXGraphComponent** | Post-processing as a graph. Nodes in `fx.js`: fxstack, histogram, motionBlur, volumetric_light, SSAO, depth reprojection, depth-aware upscale. |
| **GraphCode resource** (`*.GRAPH.json`) | A shared graph template, never executed itself, typed `LOGIC_GRAPH` or `SHADER_GRAPH`. Many components can reference one file; its properties are exposed per instance. |
| **GraphMaterial** | Loads a `SHADER_GRAPH` and derives uniforms and editable properties (float, vec, color, texture) from the graph. Generates shader code through `LiteGraph.Shaders`, plus lighting outputs (`LGraphShaderPhong` taking an albedo/normal/specular bundle). |
| **Scene nodes** | `scene/scene`, `scene/node`, `scene/component`, `scene/transform`, `scene/material`, `scene/time`, `scene/frame`… and **`scene/property`**, which reads or writes any property through a locator string (node / component / property). |
| **Events as slots** | A component's `getActions()` / `onAction()` become action slots; `LEvent.trigger(component, "finished")` becomes an event output. |
| **Editor UX** | Drag a component icon onto the graph to create its node. Drag the small "animation circle" beside any inspector property to create a property node. Graph widget, timeline and animation modules are in [webglstudio editor/js](https://github.com/jagenjo/webglstudio.js/tree/master/editor/js). |
| **Pipeline nodes** | `pipeline/scene_renderer`, `frame_context`, `deferred`, `applyIrradiance`. |

## 3. What this fork already has

- `glshaders.js`: `LiteGraph.Shaders` plus 17 `shader::*` nodes and `texture/shaderGraph`. This is the same system LiteScene extended.
- 41 types in `gltextures.js` and 5 in `glfx.js`.
- `threejs.js`: 22 types, three.js 0.172 loaded through the LibraryManager.
- No worker or OffscreenCanvas preview path.

## 4. What is dead, and what can be revived

**Dead:** LiteScene as an engine, the WebGLStudio editor, and its WebGL1-era renderer.

**Alive:** the *patterns*. They are engine-agnostic and map onto three.js, Babylon or any host that owns a scene [I].

| ID | Idea | Purpose | Kind | Effort | Notes |
|---|---|---|---|---|---|
| WGS-01 | **Locator property node**: one node gets or sets any scene property by path; generalizes `threejs/ObjectPropertiesGet/Set` | P3 | node | S | Path stability on rename; compare with the glTF JSON pointer (3D-04) |
| WGS-02 | **Graph component with `on_event` modes**: a graph attached to a scene object runs on start, update, render or trigger | P3 | ext | M | Generalized host contract; see NUN-01 and 3D-14 |
| WGS-03 | **Shared graph templates (GraphCode)**: one graph file instanced by many objects, with per-instance properties | P3, P10 | core | M | Overlaps Wave 3 subgraph definitions and blueprints; feed in as a use case |
| WGS-04 | **Drag a scene object or inspector property onto the canvas** to create its node | P3, P10 | ext | S | Needs a host outliner or inspector; uses `canvas.insertFragment` (H6) |
| WGS-05 | **Object actions and events as slots**: a convention plus a dynamic-slot helper exposing a host object's methods and events | P3 | core | S | Discoverability |
| WGS-06 | **Graph material**: uniforms and properties derived from a shader graph and shown in the host inspector | P2 | ext | M | Applies to `glshaders` today, TSL later (3D-05) |
| WGS-07 | **Revive shader lighting outputs** (Phong, then PBR) for `LiteGraph.Shaders` | P2 | node | M | Tied to litegl; may conflict with the TSL direction |
| WGS-08 | **FX graph nodes**: SSAO, motion blur, depth-aware upscale, volumetric light, for `gltextures` / `glfx` | P2 | node | M | Needs depth textures and camera matrices from a host |
| WGS-09 | **Timeline and animation-track panel**: keyframe tracks drive graph inputs | P3, P4 | ext | L | Pairs with KHR `animation/*` (3D-01) |
| WGS-10 | **litegl upstream check**: compare the vendored `editor/js/libs/litegl.js` with upstream's TypeScript conversion; decide whether to pin, update or replace it (regl or twgl, 3D-19) | P2 | runtime | S | Decision input for every GL family |

## 5. Open questions

- Should the GL families stay on litegl or move to three.js/TSL? WGS-06 to WGS-08 depend on the answer, so it decides whether those ideas are worth doing.
- Can GraphCode-style shared templates become a concrete use case for [ADR 0001](../../../docs/development/decisions/0001-subgraph-document-format.md)?
