# ComfyUI world: widgets, integrations, customizations

Date: 2026-11-19. Status: **investigation**, living. Ideas `CFY-01`–`CFY-55`.

**Question:** the ComfyUI ecosystem has thousands of custom-node packs and dozens of integrations. Beyond what the [ecosystem study](../../memories/research/ecosystem-study/README.md) already covers, which patterns should a *general-purpose* litegraph host support?

**Not repeated here** (see the study for these):
- rgthree, pysssss, KJ comparer/SetGet, VHS, Easy-Use, Use-Everywhere, Impact, 0246, Crystools, N-Sidebar, workspace-manager, layout and link plugins.
- Registry basics, the extension/command/keybinding/settings registries, the execution WebSocket events and locale sidecars.

**License rule:**
- ComfyUI core and frontend, including every ADR cited here, are **GPL-3.0: design reference only (`ref`)**.
- Packs are marked per row.
- Licenses were checked at the repository root only, not for bundled libraries (for example, AlekPet bundles Ace and fabric.js).

## Headline findings

1. **Widgets are value schemas.** Comfy's V3 backend schema ([`_io.py`](https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_api/latest/_io.py)) declares typed values with defaults and a `socketless` flag: `COLOR`, `COLORS`, `CURVE`, `RANGE`, `BOUNDING_BOX(ES)`, `IMAGECOMPARE`, `VIDEO_EDIT`, `HISTOGRAM`, `MultiCombo`, `Webcam`, `RemoteOptions`, `UploadType`. The frontend maps each one to a renderer ([composables](https://github.com/Comfy-Org/ComfyUI_frontend/tree/main/src/renderer/extensions/vueNodes/widgets/composables)). **The value schema is the contract; the renderer can be replaced.** This fits our `registerWidgetType` and `static def`.
2. **Comfy API v2 is a model for driving a graph from outside** ([SDK design](https://docs.comfy.org/development/api-development/sdks-design.md)):
   - durable job IDs and idempotent submission
   - poll-first status
   - an SSE stream that sends a full snapshot on connect and on each progress
   - content-addressed assets
   - additive-only changes within a version

   It is the best reference for our runner's public API ([card X-01](../cards/X-01-runner-public-api.md)).
3. **The frontend's ADR collection is a dated design record** of hard UI problems: theme tokens, keymap conflicts, widget sizing, menu identity, UI layers, agent editing. The code is GPL, but the decisions transfer.

## A. Widgets

| ID | Idea | Inspiration (license) | Effort | Notes |
|---|---|---|---|---|
| CFY-01 | **Value-schema widget catalogue**: each widget type declares a serializable value shape, a default and `socketless`; renderers are swappable | Comfy V3 schema (`ref`) | M | Extends `static def` and `registerWidgetType`; the umbrella for CFY-02 to CFY-08 |
| CFY-02 | **Curve widget**: `{points, interpolation}` drawn on the canvas; the same evaluator runs headless | [mtb curve_widget.js](https://github.com/melMass/comfy_mtb/blob/main/web/curve_widget.js) (**MIT, adapt**); Comfy `CURVE` (`ref`) | S | This fork has `curveeditor.js`; unify the two |
| CFY-03 | **Points and path widget** with an optional background-image provider (upstream image) | KJNodes spline editor (`ref`), Olm CurveEditor (custom terms, `ref`) | M | — |
| CFY-04 | **Range widget**: dual thumb `{min, max}`, gradient track, optional midpoint | Comfy `RANGE` (`ref`) | S | — |
| CFY-05 | **Colour, palette and vecN widgets** sharing one numeric-drag implementation | [Jovimetrix](https://github.com/Amorano/Jovimetrix) (**MIT**); Comfy `COLOR(S)` (`ref`) | M | — |
| CFY-06 | **Bounding-box list widget** over an image source; a per-input `component` override | Comfy `BOUNDING_BOX(ES)` (`ref`) | M | Overlaps JS-32 annotation widget |
| CFY-07 | **Multi-select combo** with chips, as an option on the combo widget | Comfy `MultiCombo` (`ref`) | S | — |
| CFY-08 | **Async options provider** for combos: route or function, cache key, TTL, retries, refresh button; the runner can serve options | Comfy `RemoteOptions` (`ref`) | M | Impact-Pack's async refresh is the same need |
| CFY-09 | **Viewer as a UI-only extension**: A/B wipe, difference, pixel probe and gallery, fed from the context menu with no node | [NukeViewer](https://github.com/maxsarlijagit/ComfyUI-NukeViewer) (**MIT**) | M | Non-node panels matter |
| CFY-10 | **Timeline / keyed-segment widget**: value is a list of keyed segments; `features` toggles sub-editors | [WanKeyframeBuilder](https://github.com/ckinpdx/ComfyUI-WanKeyframeBuilder) (**MIT**); Comfy `VIDEO_EDIT` (`ref`) | L | Pairs with WGS-09 |
| CFY-11 | **Capture and upload widget family** (file, webcam, microphone) over one `uploadAsset(blob) → ref` service | Comfy upload, webcam and record-audio widgets (`ref`) | M | Needs X-02 host services |
| CFY-12 | **Widget value as an asset reference**: the graph stores an id; heavy state lives in a side store | [AlekPet PainterNode](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/PainterNode) (**MIT**) | M | Core of X-02 |
| CFY-13 | **Modal editor contract**: `openEditor(kind, input) → Promise<result>`; the host applies the result in one `graph.transact` | [Comfy MASKEDITOR-0001](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/docs/adr/MASKEDITOR-0001-reusable-editor-and-host-ownership.md) (`ref`) | M | Part of X-02 |
| CFY-14 | **Per-widget blob store with reference-count GC** and widget-scoped undo | [LayerForge](https://github.com/Azornes/Comfyui-LayerForge) (**MIT**) | M | Undo must reconcile with graph history |
| CFY-15 | **3D viewport widget** with model adapters; "manipulate in 3D, emit a scalar or string" | [qwenmultiangle](https://github.com/jtydhr88/ComfyUI-qwenmultiangle) (**MIT**); Comfy Load3D (`ref`) | L | Shares code with 3D-17 |
| CFY-16 | **Keypoint-graph widget**: named points plus edges (poses, rigs, landmarks) | [AlekPet PoseNode](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/PoseNode), [3dPoseEditor](https://github.com/hinablue/ComfyUI_3dPoseEditor) (**MIT**) | M | Feeds JS-26 MediaPipe output |
| CFY-17 | **Code widget** with a lazy-loaded editor, tied to `allow_scripts` | [AlekPet IDENode](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/blob/master/web_alekpet_nodes/ide_node.js) (**MIT**) | M | Same as JS-14; runner policy applies |
| CFY-18 | **Sanitized markdown service** (`renderMarkdown()` always sanitizes) and a markdown note node | [mtb Note Plus](https://github.com/melMass/comfy_mtb/blob/main/web/note_plus.js) (**MIT**) | S | Part of X-02 |
| CFY-19 | **Annotation layer and guided tours** anchored to node and widget ids | [NKD Notes](https://github.com/Nekodificador/ComfyUI-NKD-Notes) (`ref`) | M | Education (P9) |
| CFY-20 | **Completion provider hook** on text widgets, with several sources and priorities | [Autocomplete-Plus](https://github.com/newtextdoc1111/ComfyUI-Autocomplete-Plus) (**MIT**) | M | Prompts, expressions, SQL |
| CFY-21 | **XY pad widget**; number widgets whose output type follows their precision | mxToolkit (`ref`) | S | — |
| CFY-22 | **Human-in-the-loop await**: the runner pauses with `await_input`; the editor answers with a choice, mask or text | [cg-image-filter](https://github.com/chrisgoringe/cg-image-filter) (**Apache-2.0**) | M | Same mechanism as BUN-07 approval |
| CFY-23 | **Host file and folder picker** service callable from any widget | [FileBrowserAPI](https://github.com/GalactusX31/ComfyUI-FileBrowserAPI) (**MIT**) | S | Part of X-02 |
| CFY-24 | **Output history and gallery panel** driven by execution events | [mtb imageFeed](https://github.com/melMass/comfy_mtb/blob/main/web/imageFeed.js), [SmartGallery](https://github.com/biagiomaf/smart-comfyui-gallery) (**MIT**) | M | Pairs with BUN-08 executions panel |
| CFY-25 | **Display-only widgets** (chart, histogram) that serialize nothing | Comfy `WidgetChart` / `HISTOGRAM` (`ref`) | S | `serialize: false`; see JS-10 |
| CFY-26 | **Embedded app as editor widget** (iframe or DOM app, e.g. a waveform editor) | [AudioMass](https://github.com/jtydhr88/ComfyUI-AudioMass) (no license, `none`) | M | Isolation and messaging contract |

## B. Integrations and protocols

| ID | Idea | Inspiration (license) | Effort | Notes |
|---|---|---|---|---|
| CFY-27 | **Runner public API v2**: durable jobs, idempotent submit, poll-first, snapshot SSE, versioned and additive ([card X-01](../cards/X-01-runner-public-api.md)) | [Comfy API v2](https://docs.comfy.org/api-reference/v2/jobs/live-event-stream-sse.md); [comfy-api-proxy](https://github.com/Comfy-Org/comfy-api-proxy) (**MIT**) | L | Merges into X-01 |
| CFY-28 | **Content-addressed assets**: existence check by hash before upload; dedupe widget assets | [v2 assets](https://docs.comfy.org/api-reference/v2/assets/existence-check-for-a-blob-by-blake3-hash.md) | M | Part of X-02 |
| CFY-29 | **Two serializations**: the editor document (`graph.serialize()`) and an execution plan (`graph.toExecutionPlan()`) for runners | [Save vs API format](https://docs.comfy.org/development/api-development/workflow-api-format.md) | M | Relates to the ADR 0001 resolver |
| CFY-30 | **Graph provenance embedded in outputs** (PNG text, WebP EXIF, MP4 tags); dropping a file restores its graph | [workflow metadata](https://docs.comfy.org/development/api-development/workflow-metadata.md) | M | One reader/writer per container |
| CFY-31 | **Open, namespaced runner → editor events** beyond the fixed lifecycle events | [custom messages](https://docs.comfy.org/development/comfyui-server/comms_messages.md) | S | Extends the runner protocol |
| CFY-32 | **`/features` capability handshake** and a `/userdata` key-value store on the runner | [routes](https://docs.comfy.org/development/comfyui-server/comms_routes.md) | S | — |
| CFY-33 | **Node definitions as a cross-host contract**: export `listNodeDefinitions()` so other editors (Blender, a CLI) can render our nodes | BlenderAI-node (`ref`) | M | Builds on Wave 1 node definitions |
| CFY-34 | **Graph ↔ code round trip**: a text form of a graph that people and LLMs can write | [ComfyScript](https://github.com/Chaoses-Ib/ComfyScript) (**MIT**) | L | Pairs with JS-19 schemas |
| CFY-35 | **Exporter registry**: `exportAs(format)` for code, execution plan, image, KHR, BPMN… | [ComfyUI-to-Python](https://github.com/pydn/ComfyUI-to-Python-Extension) (**MIT**) | S | Hosts 3D-02, BUN-21, BUN-22 |
| CFY-36 | **Pluggable output sinks and an asset/model manifest** on the runner (S3, webhook, base64) | [Salad comfyui-api](https://github.com/SaladTechnologies/comfyui-api) (**MIT**) | M | Bun S3 (BUN-18) |
| CFY-37 | **App manifest node**: an editor-only node marks exposed inputs and outputs; the graph becomes a form-based app | [mixlab AppInfo](https://github.com/MixLabPro/comfyui-mixlab-nodes) (**MIT**); ViewComfy, comfyui-deploy (`ref`) | L | Roadmap lists "app mode" as deferred; this is input for its proposal |
| CFY-38 | **Host-application plugins** (Krita, Photoshop, GIMP) driving a runner through the app manifest; inline binary I/O, no temporary files | Krita AI Diffusion (`ref`), [Charlweed GIMP](https://github.com/Charlweed/gimp_comfyui) (**MIT**) | L | Needs CFY-37 and X-01 |
| CFY-39 | **Streaming frame-processor mode**: a graph processes a live video stream per frame (WebRTC) | [comfystream](https://github.com/livepeer/comfystream) (**MIT**) | L | TouchDesigner bridges show the demand |
| CFY-40 | **Distributed regions**: marker nodes split a graph into regions dispatched to worker runners | [ComfyUI-Distributed](https://github.com/robertvoy/ComfyUI-Distributed), [NetDist](https://github.com/city96/ComfyUI_NetDist) (**Apache-2.0**) | XL | — |
| CFY-41 | **Editor commands and the runner as MCP tools**; the command registry is already the tool surface | [comfyui-mcp](https://github.com/artokun/comfyui-mcp) (**MIT**), [Copilot](https://github.com/ATH-MaaS/ComfyUI-Copilot) (**MIT**) | M | Same family as JS-02 |
| CFY-42 | **Agent edit policy**: agents edit through `transact`, insert near the viewport, and the human document wins on conflict | [CRDT-AUTHORITY-0035](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/docs/adr/CRDT-AUTHORITY-0035-human-canvas-authority-and-draft-reconciliation.md) (`ref`) | M | Pairs with JS-16 multiplayer |
| CFY-43 | **Template pack format**: JSON, thumbnails, bundles, a manifest with hashes | [workflow_templates](https://github.com/Comfy-Org/workflow_templates) (**MIT**) | S | Feeds the Wave 4 pack manifest |
| CFY-44 | **Graph-declared asset dependencies** (`graph.extra.requires`) with a fetch step | [ModelFetcher](https://github.com/KoLt-Real/ComfyUI-ModelFetcher) (**Apache-2.0**) | M | Better than parsing notes |

## C. Customizations

| ID | Idea | Inspiration (license) | Effort | Notes |
|---|---|---|---|---|
| CFY-45 | **Small theme token set with fallbacks**, mapped onto `LiteGraph.*_COLOR`, keeping the old globals as aliases | [THEME-TOKENS-0044](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/docs/adr/THEME-TOKENS-0044-palettes-own-a-small-theme-token-set.md) (`ref`) | M | Roadmap's "visual tokens" |
| CFY-46 | **Palettes as pack assets** | [everforest](https://github.com/Ilonis/everforest-ComfyUI) (**MIT**) | S | Needs CFY-45 |
| CFY-47 | **Panel contributions** (`render(container)` / `destroy()`), toasts with ids, and provenance on every contribution | Comfy ExtensionManager (`ref`) | M | Extends `registerExtension` |
| CFY-48 | **Key-binding conflict and prefix validation**; focus decides which owner handles a key | [KEYBINDINGS-0054](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/docs/adr/KEYBINDINGS-0054-conflict-free-keymaps-and-native-focus-ownership.md) (`ref`) | S | Extends Wave 1 keybindings |
| CFY-49 | **Stable ids on menu items**, so contributions can replace or suppress them | [NODE-MENU-0001](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/docs/adr/NODE-MENU-0001-action-identity-for-menu-assembly.md) (`ref`) | S | Extends Wave 1 menus |
| CFY-50 | **Owned UI layers**: named overlay layers instead of z-index fights among DOM widgets | [UI-LAYERS-0045](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/docs/adr/UI-LAYERS-0045-owned-stacking-contexts.md) (`ref`) | S | — |
| CFY-51 | **Resizable widget rows** saved in properties; a visible fallback when a widget type is unknown | [WIDGET-LAYOUT-0057](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/docs/adr/WIDGET-LAYOUT-0057-user-sized-widget-heights-are-widget-intent.md) (`ref`) | M | — |
| CFY-52 | **Late extension loading when idle**: queue late registrations and apply them in one batch | [EXTENSION-LOADING-0048](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/docs/adr/EXTENSION-LOADING-0048-late-custom-nodes-turn-on-after-the-editor-opens.md) (`ref`) | S | — |
| CFY-53 | **i18n hook** for display names, menus and search | AIGODLIKE Translation (`none`) | M | i18n sidecars are already in the [harvest catalog](../../plans/261119_feature_harvest_and_priorities.md#43-node-types-and-registry); locales are in the Wave 4 pack manifest |
| CFY-54 | **Gestures**: shake a node to detach it, swap a node in place keeping its links, auto-fill connections | KJNodes (`ref`) | M | Build on `CanvasPointer` gesture handlers |
| CFY-55 | **Pack manifest extras**: an editor version range (`requires.editor`) and platform tags | [registry spec](https://docs.comfy.org/registry/specifications) | S | Feeds the Wave 4 pack manifest |

## Priority view

These are the agent's judgment, marked [I]:
1. **Value-schema widgets** (CFY-01 to CFY-08), starting from the MIT canvas curve (CFY-02).
2. **Runner protocol** (CFY-27 to CFY-32), consolidated in [X-01](../cards/X-01-runner-public-api.md).
3. **Host services for widgets** (CFY-11 to CFY-13, CFY-18, CFY-23, CFY-28, CFY-47), consolidated as X-02.
4. **Human-in-the-loop await** (CFY-22) and the **app manifest node** (CFY-37).
5. **Key-binding validation** (CFY-48) and **theme tokens** (CFY-45).
