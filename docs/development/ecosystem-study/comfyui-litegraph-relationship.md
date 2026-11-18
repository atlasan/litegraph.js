# ComfyUI's LiteGraph and this fork: relationship, interoperability, and options

**Date:** 2026-11-18.

**Sources:**
- This fork: `claude/litegraph-study-baseline` @ `8a8d952`.
- Comfy standalone: [Comfy-Org/litegraph.js](https://github.com/Comfy-Org/litegraph.js) @ `ea0e1a8` (0.17.2, archived 2025-08-05).
- Comfy current: [ComfyUI_frontend](https://github.com/Comfy-Org/ComfyUI_frontend) @ `e10b6bf97d` (`src/lib/litegraph`, `packages/graph-model`, `docs/adr`).

**Labels:** **[V]** means verified by reading the source, running git, or running a probe. **[I]** means inferred.

This complements the [UX-focused ComfyUI report](comfyui-core-frontend.md). That report asks *what can we learn from Comfy's editor*. This one asks *what is the relationship between the codebases, and what should we import, sync, derive, fork, or join*.

## Answer in one paragraph

ComfyUI's LiteGraph and ours share a jagenjo ancestor (`b3862e9`, 2023-12-05) and roughly half their method names. They are now different products:
- **Theirs** is a TypeScript canvas/editor layer being dissolved into a GPL-3.0 Vue app. Its graph state is moving into Pinia stores and a Yjs layout document, execution happens in the Python backend, and Comfy itself says it is "the only known user" ([DEPS-LITEGRAPH-0001](https://github.com/Comfy-Org/ComfyUI_frontend/blob/e10b6bf97d/docs/adr/DEPS-LITEGRAPH-0001-integrate-litegraph-into-the-frontend.md)).
- **Ours** is an MIT general-purpose library whose value is its execution engine (events/actions, ON_REQUEST, Node.js workers, readiness/cleanup) and its node library.

**Joining, forking onto, or continuously syncing with Comfy is not viable.** The productive relationship has three parts:
1. Hand-port shared-ancestry bug fixes and selected designs, sourcing code only from the MIT standalone.
2. Make our graph JSON *interoperable* with Comfy's format through serializer hygiene plus an optional adapter.
3. Keep tracking Comfy's ADRs as a design reference.

## 1. Provenance and history

| Item | Finding |
|---|---|
| Common ancestor with ours | `b3862e9` (Javi Agenjo, 2023-12-05) [V] |
| Divergence since | Comfy standalone 1,003 commits; ours 573 [V] |
| Comfy standalone life | Fork from 2023-04 (comfyanonymous), TypeScript/Vite conversion 2024-10 (`142c22e`), built-in nodes and editor removed 2024-08 (`704b8e2`), old subgraph removed 2025-02, archived 2025-08-05 at 0.17.2 [V] |
| Integration into frontend | Git subtree, merge `86509bda43` (2025-08-05); "No more semantic versioning"; standalone to be archived [V] |
| Current velocity | 444 commits to `src/lib/litegraph` in 12 months by 32 authors, accelerating (Sep 2026: 92, Oct: 61, Nov to the 18th: 34) [V] |
| Published artefacts | `@comfyorg/litegraph` frozen at 0.17.2. Only `@comfyorg/comfyui-frontend-types` (GPL) is published now. `@comfyorg/graph-model` is `private: true` with no license field [V] |

## 2. Licensing: the constraint that shapes every option

- **Comfy standalone repo:** MIT ("Copyright (C) 2013 by Javi Agenjo"). No other headers and no CLA. **Safe to adapt with attribution.** [V]
- **ComfyUI_frontend root:** `GPL-3.0-only`. [V]
- **`src/lib/litegraph/LICENSE`:**
  - Still MIT, untouched since the subtree add. [V]
  - Of the 159 current non-test files, 81 were inherited and 78 were added after the merge. [V]
  - Inherited core files have been heavily rewritten since. For example, `LGraphCanvas.ts` has +3,566/−2,761 lines since the merge. [V]
- **MIT-origin files moved into `packages/graph-model` (no license):** `interfaces.ts`, `globalEnums.ts`, `serialisation.ts` and others were moved there and mixed with GPL app files (PR #22053, 2026-10-28). [V]
- **Consequence (not legal advice):** whether post-merge changes in `src/lib/litegraph` are MIT or GPL-3.0 is **ambiguous**. Anything in `packages/*` defaults to the repository's GPL context. [I]

**Provenance rule for this fork:**
- Copy or adapt code only from Comfy-Org/litegraph.js at or before `ea0e1a8`, or from frontend files as they stood at merge `86509bda43`.
- Record the source commit and MIT attribution in the commit message and a NOTICE entry.
- Treat newer frontend code and `packages/*` as **read-for-ideas only**; reimplement independently.

## 3. Differences

### Focus
| | This fork | Comfy |
|---|---|---|
| Purpose | General-purpose dataflow library, browser and Node | Editor for one app (diffusion workflows) |
| Execution | In-process: `runStep`, events/actions, ON_REQUEST, deferred actions, worker runner | Python backend; frontend flattens subgraphs (`ExecutableNodeDTO`). `runStep` survives but is barely maintained (FIXME at `LGraph.ts:466`), and ON_REQUEST is "Not impl." [V] |
| Node library | ~300 built-in nodes (math, events, audio, MIDI, GL, HTML, network, nodejs_sys) | None. Types come from the backend's `object_info` [V] |
| State model | Mutable classes plus a global `LiteGraph` | Moving to Pinia stores (`linkStore`, `layoutStore`, `widgetValueStore`, …), Yjs layout document, ECS-style IDs ([ECS-0008](https://github.com/Comfy-Org/ComfyUI_frontend/blob/e10b6bf97d/docs/adr/ECS-0008-entity-component-system.md), CRDT-LAYOUT-*) [V] |
| Language/build | JS ES modules, Python concatenation into 12 ESM/CJS distributions | TypeScript, Vite, pnpm monorepo |
| Rendering | Canvas 2D only | Canvas plus Vue node renderer sharing a presentation boundary (CANVAS-0052) [V] |
| Compatibility promise | Library API (ESM/CJS, `.d.ts`) | Extension API inside the app only (`window.LiteGraph`, `contextMenuCompat`, deprecation windows) [V] |

### Capabilities
**Only in Comfy** (standalone and later) [V]:
- Reroutes and floating links
- `LinkConnector` drag state machine
- `CanvasPointer` (click drift, double-click, capture)
- Subgraphs v2: definitions, `SubgraphInput`/`OutputNode`, conversion and unpack, promoted widgets
- Widget classes, with `LegacyWidget` for old-style objects
- Slot classes
- Typed cancellable events (`CustomEventTarget`, `*EventMap`)
- `LGraphState` counters, graph UUID and `revision`
- Links as a `Map` behind an index proxy
- `Rectangle` and `measure.ts`
- Badges, title buttons and icons
- High-DPI rendering
- BYPASS mode
- Grouped (compound) undo
- An extensive Vitest suite (158 test files in `src/lib/litegraph`)

**Only in ours** [V]:
- ON_REQUEST pull execution
- Event/action engine maintained and tested
- CallbackHandler prioritized hooks
- LibraryManager dynamic dependencies
- `whenReady`/`clearAsync` readiness and cleanup contracts
- Headless Node build and worker runner
- Node-side network and system nodes
- The browser node tester
- The built-in node library
- Graph-level I/O
- Property binding

**API overlap** (method names) [V]:

| Class | Shared names | Share of ours | Share of Comfy's |
|---|---|---|---|
| LGraphCanvas | 85 | 69% | 57% |
| LGraphNode | 65 | 66% | 45% |
| LGraph | 36 | 47% | 55% |
| LiteGraph global | 17 | 35% | 77% |

Of the 2023 ancestor's methods, both forks still keep 66/88 (canvas), 64/70 (node) and 36/54 (graph). Signatures for `registerNodeType`, `createNode`, `addInput`, `getInputData`, `trigger` and `onExecute` still match [V]. Ordinary node classes written against the original LiteGraph API therefore port between the two with modest effort [I].

### Semantic collisions [V]
- **Mode 4:** ours is `ON_REQUEST`, Comfy's is `BYPASS`. A graph moved either way silently changes behaviour.
- **`version` field:**
  - Comfy reads array links **only when `version === 0.4`**: standalone `LGraph.ts:1735` and current `LGraph.ts:3021`.
  - Ours writes `version: "a0.11.1"`. Comfy therefore treats our file as version 1, calls `LLink.create(array)`, and **loses every link**.
- **Subgraphs:**
  - Ours: inline `nodes[].subgraph`, node type `graph/subgraph`.
  - Comfy: root `definitions.subgraphs[]`, an instance whose `type` is the definition GUID, IO nodes, and `-10`/`-20` link endpoints.

## 4. Interoperability: empirical results

Method: Comfy's current `workflowSchema.ts` run verbatim under zod 4 against 5 real Comfy 0.4 fixtures, 2 synthetic version 1 fixtures, and 3 graphs built in our library. Scripts are in [experiments/comfy-interop](../../../experiments/comfy-interop/README.md). [V]

### Comfy → ours (`LGraph.configure`)
- **What loads:** no throws, but `configure` reports an error. All nodes load (7/7 … 9/9). All links load, including version 1 object links. Groups and `widgets_values` are kept.
- **Unknown types:** become inert `LGraphNode` placeholders that re-emit `last_serialization`. Consequences:
  - **Edits to them are silently lost.**
  - Disconnecting leaves **dangling link references** in the saved file.
- **Lost on re-save:**
  - `version` (becomes `"a0.11.1"`)
  - group `bounding` (written as a `{"0":…}` object), group `locked`/`id`/`flags`
  - top-level `id`, `revision`, `state`, `reroutes`, `floatingLinks`, `definitions`. `configure` copies them onto the graph object, but `serialize` never writes them back.
- After a version 1 load, `last_node_id = 0`, so new nodes collide or switch ID scheme.

### Ours → Comfy (zod validation)
- **Full builds fail** on 7–8 issues. `editor/js/defaults_debug.js:46` sets `LiteGraph.use_uuids = true` inside **both shipped full builds**, so node and link IDs become UUID strings where Comfy requires integer link IDs. **This is a bug in our distributions regardless of Comfy.**
- **With integer IDs and `version: 0.4`:** event and subgraph graphs **pass**; the basic graph fails only on group `bounding`.
- **Comfy would still ignore our inline subgraph** (it's passthrough data) and cannot execute our node types without a node-pack bridge [I].

### Adapter prototype
`comfy_adapter.mjs` is about 70 lines.
- **On import:** registers a `comfy/<Type>` placeholder per unknown type and stashes unmodelled node and graph keys.
- **On export:** rebuilds 0.4 or version 1.

**Results:**
- All 7 fixtures round-trip with no configure error, and all outputs pass zod, including after a node move and a link disconnect.
- One fixture is byte-identical. The others differ only in float32 `pos` rounding and recomputed `order`.

## 5. Options evaluated

| Option | What it would mean | Verdict |
|---|---|---|
| **Join** (contribute to Comfy and adopt their library) | Use the ComfyUI_frontend litegraph as our base | **No.** It is not published, coupled to Pinia/Vue/Yjs app stores (44 files import the app; core classes all do), GPL context, Comfy-only roadmap, no ON_REQUEST or Node runtime |
| **Fork onto Comfy standalone 0.17.2** | Rebase our features onto their MIT TypeScript code | **Not now.** A dry-run merge gives 44 conflicts with modify/delete on every core and node file. It is a dead upstream, so we would own all of it. Mode 4 clash. Our engine, node library and Node build would all need reimplementation. Revisit **only** as a candidate base if we decide on a TypeScript migration (compare with litegraph-tsx then) |
| **Sync** (track the frontend continuously) | Periodic merges or cherry-picks | **No.** About 50 commits a month of architecture-driven churn, files leaving the MIT directory, ambiguous license for new code |
| **Derive/import** (hand-port fixes and designs) | Reimplement selected behaviour, adapting MIT standalone code where useful | **Yes.** Highest value per effort; see §6 |
| **Interoperate** (format bridge) | Our files load in Comfy, and Comfy files round-trip through ours | **Yes**, in two layers: serializer hygiene in core (cheap, fixes our own bugs) plus an optional `comfy-interop` extension |
| **Converge selectively** | Adopt Comfy's *document shapes* where we lack one (subgraph definitions, reroutes in `extra.linkExtensions`, `state`) | **Decide later**, at subgraph-authoring time; it makes interop nearly free and gives us a battle-tested schema |

## 6. Proposed plan

Phase names refer to the [repository roadmap](../../../planning/plans/261118_repo_review_and_roadmap.md). Sizes: S = under a day, M = a few days, L = a week or more.

### C0: Serializer hygiene, in core (S). Fixes our own bugs first.
1. Stop shipping `editor/js/defaults_debug.js` in full builds, or at least stop it setting `use_uuids`.
2. Serialize `version: 0.4` (numeric schema version) and move the library version to `extra.litegraph_version`. Accept both on load.
3. Write `pos`, `size` and group `bounding` as plain arrays, not Float32Array objects.
4. Preserve unknown top-level keys on round-trip, in an explicit `_foreign` passthrough written back by `serialize`.
5. Placeholder (missing-type) nodes: apply edits (pos, title, links) onto `last_serialization` instead of discarding them, and remove dangling link references.
6. After loading without `last_node_id`, set the counters to `max(id) + 1`.

**Acceptance:** our basic, events and subgraph graphs validate against Comfy's 0.4 schema in a CI probe (zod as a dev dependency, schema fetched rather than vendored). Existing fixtures are unchanged.

### C1: Port shared-ancestry fixes (S–M)
Each item is confirmed still present in ours [V]:
- `pos` setter `new Float32Array(10,10)` (`lgraphnode.js:191`)
- `pin()` without a graph (`:2723`)
- Number widget prompt ignores min/max (`lgraphcanvas.js` ~5448)
- `NODE_DEFAULT_SHAPE` ignored (`:4177`)
- Search Enter uses `innerHTML` (`:7176`)
- Synchronous search focus on Firefox (`:7291`)
- Unrounded context-menu scale (`contextmenu.js:356`)
- **High-DPI rendering** (no `devicePixelRatio` anywhere)
- Zoom centre page offset (`dragandscale.js:210`)
- Boolean sort comparator in `getGroupOnPos` (`lgraph.js:1113`)

Comfy commits for reference: `e25c210 a0b50dc c5db2d8 11ce8e0 49a3e31 6f121fc 0b161c1 49944a0 2a39b21`. Add a test per fix.

### C2: Optional `comfy-interop` extension (M)
- Productionize the adapter as `src/extensions/comfy_interop.js`, outside core builds.
- Map mode 4 explicitly (Comfy BYPASS ↔ our NEVER-plus-passthrough or a marker; our ON_REQUEST → a Comfy property and mode 0).
- Render `widgets_values` as read-only widgets.
- Export 0.4 and version 1.

### C3: Design ports from the MIT standalone (M each, prioritized)
1. **`CanvasPointer`.** Fixes our `pointercancel` gap and click/drag ambiguity.
2. **`LGraphState` counters, graph UUID and `revision`.** Needed for the execution inspector's revision identity.
3. **Grouped undo.** Comfy's compound undo informs our transaction API.
4. **`LinkConnector` state machine.** Before contextual search insertion.
5. **Reroutes and floating links**, stored compatibly in `extra.reroutes`/`linkExtensions`.
6. **Typed cancellable events alongside CallbackHandler.**

### C4: Subgraph format decision (L, bundled with roadmap Phase 4.3)
- Evaluate adopting Comfy's `definitions.subgraphs` shape (GUID definitions, IO nodes, `-10`/`-20` endpoints) as our subgraph version 2 format, keeping inline loading for old files.
- Reference: the standalone `src/subgraph/*` (MIT, as of `ea0e1a8`).
- Benefits: bidirectional subgraph interop, and a schema others already validate.
- Risks: our event/action routing through subgraph IO, and ON_REQUEST across boundaries.

### Ongoing: a design watch, not a sync
- Review ComfyUI_frontend ADRs quarterly: CRDT, ECS, keybindings, widget lifecycle, menu identity.
- Record ideas as planning ideas, not ports.
- Do not depend on `@comfyorg/*` packages.

## 7. Open questions
- Do we want our graphs to *run* in ComfyUI? That needs a ComfyUI custom-node pack mapping our types, which is a separate product decision. Or is load/view/edit interop enough?
- Should the mode-4 collision be resolved in our format (for example a `mode_semantics` marker) rather than only in the adapter?
- If a TypeScript migration is ever approved, which base: incremental conversion of ours, the Comfy standalone (MIT, richer canvas), or litegraph-tsx?
