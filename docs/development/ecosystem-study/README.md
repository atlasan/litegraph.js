# LiteGraph ecosystem study and development directions

Research date: 2026-11-01. Status: first source-based research pass complete; implementation and comparative browser validation remain follow-on work. The [saved plan](../../../planning/plans/261101_litegraph_ecosystem_study.md) tracks scope and next steps.

**The strongest opportunity is to combine this fork's general-purpose execution with a more capable authoring environment: reusable subgraph interfaces, contextual discovery, rich inspection, and extensions with clear ownership.** ComfyUI provides detailed examples of these interactions. LiteGraph-TSX provides a related modernization experiment. Their useful ideas need different adoption strategies; neither is a drop-in upgrade for this fork.

## Read progressively

| Step | Report | What it answers |
| --- | --- | --- |
| 1 | This synthesis | What matters across the projects, and what direction follows? |
| 2 | [LiteGraph-TSX](litegraph-tsx.md) | What modernization exists, what remains experimental, and which patterns transfer? |
| 3 | [ComfyUI core and frontend](comfyui-core-frontend.md) | How do empowered subgraphs, search, rendering, and extension services work? |
| 4 | [Custom-node UI patterns](comfyui-custom-node-ui.md) | What can rgthree, Custom-Scripts, KJNodes, VideoHelperSuite, and Easy-Use teach us? |
| 5 | [Local fit and experiments](local-fit-and-experiments.md) | How can this fork adopt the useful behavior while preserving its contracts? |

## What changed in our understanding

### LiteGraph-TSX is a modernization reference with unfinished boundaries

The verified main snapshot remains `1220df17` from 2024-07-29. It consists largely of ES-module JavaScript and classes with Vite/Vitest tooling, declarations, and preliminary CSS tokens. Its strict-named configuration still has `strict: false`. An experimental branch separates registry, settings, styles, and utilities behind a compatibility facade. These are useful design references, but not evidence of a completed TypeScript or React migration. [Pinned package](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/package.json), [type configuration](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/tools/tsconfig.strict.json).

The adoption opportunity is module-aware tooling and clearer responsibilities. The compatibility cost is substantial around this fork's callbacks, on-request execution, dependency readiness, cleanup, and package contracts. Preserve those behaviors while evaluating any modernization.

### Modern ComfyUI is a coordinated application architecture

Comfy's standalone LiteGraph README directs development into the frontend monorepo. Current graph code interacts with application stores, schemas, services, and a private graph-model workspace. Search, breadcrumbs, panels, Vue node rendering, and extension services sit outside or across the legacy canvas boundary. [Migration decision](https://github.com/Comfy-Org/ComfyUI_frontend/blob/834cce976e330fedaa7f85f5aab930d7b8a205e8/docs/adr/DEPS-LITEGRAPH-0001-integrate-litegraph-into-the-frontend.md).

The lesson is to coordinate graph behavior and UI ownership deliberately. Better styling alone will not deliver promoted controls, meaningful search, reliable undo, or extension compatibility. Conversely, these behaviors do not all require an immediate renderer migration.

### Empowered subgraphs are an interface-design capability

The important gain is that users can build an abstraction and make it usable: expose selected controls, name ports, preserve context while navigating, inspect outputs, and reuse the result. Comfy's current source separates host-owned input values from display-only preview exposure. Its documented blueprints create independently editable copies; that should not be confused with automatic propagation of later edits to all instances. [Subgraph implementation](https://github.com/Comfy-Org/ComfyUI_frontend/blob/834cce976e330fedaa7f85f5aab930d7b8a205e8/src/lib/litegraph/src/subgraph/SubgraphNode.ts), [blueprint documentation](https://github.com/Comfy-Org/docs/blob/8d7322cf43d0db34a2de6f71e4a05e6c943073fb/interface/features/subgraph.mdx).

For this fork, component interfaces can evolve while retaining inline nested graphs initially. Shared definitions, linked instances, and migrations should be explicit later decisions. The local selection-conversion helper currently fails a bounded executable probe and is unfinished, so conversion requires functional work before UI polish.

### Custom-node UI is a pattern library and a compatibility case study

The sampled repositories show useful solutions for group controls, reroutes, dynamic slots, finding existing nodes, text completion, comparison widgets, media previews, and parameter-driven layouts. They also contain adapters for changing frontend generations, private APIs, and prototype patches. A generic host should turn repeated needs into supported services instead of requiring every extension to repeat those patches. See the [pinned pattern catalog](comfyui-custom-node-ui.md).

## Capability comparison

| Capability | This fork's starting point | Most useful external reference | Proposed direction |
| --- | --- | --- | --- |
| General-purpose execution | Synchronous steps/events, on-request ancestors, Node workers | Compare semantics rather than appearances | Preserve and document local contracts |
| Subgraph authoring | Nested execution and ports; incomplete selection conversion | Comfy conversion/unpack and interface model | Reversible conversion, stable ports, promoted controls |
| Component reuse | Saved nested graph configuration | Comfy blueprints and metadata registration | Copy-on-insert templates first; linked definitions separately |
| Node discovery | Type filtering and multi-term substring matching | Comfy metadata search and result UX | Aliases, descriptions, runtime/provenance metadata, keyboard insertion |
| Existing-node discovery | Canvas navigation and selection | Custom-Scripts finder, nested-aware ecosystem tools | Graph-path index and explicit navigation service |
| Rich controls | Canvas widgets and HTML overlays | KJNodes, rgthree, VideoHelperSuite | Widget lifecycle host with persistent/transient state separation |
| Visual consistency | Canvas settings and CSS | TSX tokens, Comfy design-system direction | Shared tokens with headless-safe defaults |
| Extensions | Prioritized callbacks and example extensions | Comfy contribution services and migration history | Named commands, menus, settings, registration ownership, disposal |
| Link authoring | Connection helpers and autoconnect | rgthree reroute/dynamic-input interactions | Explicit gesture hooks and transactional normalization |
| Inspection | Watch nodes, logs, execution callbacks | Execution-follow and preview patterns | Bounded observations with run/revision/node identity |
| Developer tooling | Existing build and strict consumer gate | TSX module-aware builder; Comfy test structure | Isolated tooling experiments; preserve distribution outputs |
| Accessibility and performance | Specific local interactions validated in baseline notes | Comfy focus/ARIA examples and browser fixtures | Explicit task-based browser checks and measurements |

## Recommended development order

1. **Keep baseline stabilization independent.** Its readiness evidence establishes which contracts can support new features. The study does not overwrite or complete that workstream.
2. **Define a small command and extension ownership layer.** Prove it using an existing extension, then let search, menus, shortcuts, and toolbars share operations.
3. **Improve contextual search as an early user-visible result.** Use metadata rather than constructing nodes; make insertion reversible and keyboard-friendly.
4. **Develop subgraph authoring as the principal capability expansion.** Prove conversion/unpack and interface identity before layering promoted controls, previews, and templates.
5. **Generalize rich widgets and execution inspection.** Build one useful preview through a reusable lifecycle contract; distinguish editor state from worker observations.
6. **Evaluate larger architecture changes against evidence.** A TypeScript migration, renderer change, package extraction, async scheduler, or linked component system each needs its own rationale and acceptance criteria.

This order can be adjusted after the baseline assessment. Navigation state and visual tokens are smaller parallel candidates; shared definitions and virtual links have deeper schema/runtime consequences.

## Questions that require experiments

- Does faster contextual insertion or a reusable component interface remove the larger authoring burden for our intended users?
- Can stable port/control identity be introduced compatibly with existing graph files and dynamically changing slots?
- Which state belongs to a component instance, its definition/template, the editor, or an execution run?
- Can a small DOM widget host provide the desired interaction quality without changing the renderer?
- What extension contribution APIs cover real examples without exposing the whole application singleton?
- Which operations must be atomic for history, event delivery, and resource ownership?

The [experiment proposals](local-fit-and-experiments.md) turn these into acceptance cases rather than speculative deadlines.

## Evidence and scope

The three research tracks inspected primary repositories, official documentation, source, test fixtures, and selected issue/ADR context. Their reports pin snapshots and identify inferences. The custom-node sample covers five repositories by distinct UI patterns; it is not an ecosystem census. Easy-Use's inspected v1 helper is explicitly separated from its default v2 frontend.

No ComfyUI or TSX build/browser run, comparative performance benchmark, comprehensive accessibility test, or direct source port was performed. The local subgraph conversion failure was reproduced with a short Node probe. No runtime implementation files were modified by this study. The separate baseline assessment has its own active edits and validation.

Actual source reuse needs file-level provenance and dependency review. The frontend root, LiteGraph subtree, and custom-node repositories do not all share one license; root metadata alone cannot classify a copied feature. The reports identify known notices and unresolved provenance without treating code copying as a prerequisite for learning from the designs.
