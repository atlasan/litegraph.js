# LiteGraph ecosystem study and development directions

Date: 2026-11-01. Status: first source-based research pass complete; comparative browser validation and implementation experiments remain pending. Implementation decisions remain proposals.

Study this fork, LiteGraph-TSX, ComfyUI's graph library and frontend, and representative custom-node UI extensions to identify useful capabilities, architectural tradeoffs, and a progressive development path. Preserve this fork's general-purpose browser and Node execution while evaluating stronger authoring and inspection experiences.

## Coordination and scope

- The separate baseline assessment owns current-library stabilization, tester and runner fixes, and their verification. This study consumes its published evidence without modifying its source files or declaring its work complete.
- Three parallel research tracks cover LiteGraph-TSX, ComfyUI core/frontend, and custom-node UI patterns. The coordinating track compares local architecture and synthesizes findings.
- Research outputs live in [the ecosystem study folder](../memories/research/ecosystem-study/README.md). This follows the proposed [workspace structure](261101_workspace_structure_and_memory.md) without performing that broader migration.
- No fork replacement, framework migration, package split, dependency installation, publication, or runtime feature implementation is part of this study.

## Questions to answer

1. Which capabilities belong to the graph model, execution runtime, canvas, application shell, or extension ecosystem?
2. What specifically makes ComfyUI subgraphs useful: encapsulation, interfaces, promotion of inner controls, navigation, reusable definitions, identity, and serialization?
3. How do search, menus, keyboard commands, connection assistance, reroutes, previews, and selection tools reduce authoring effort?
4. Which extension contracts make independent contributions compose safely, and where do prototype patches or private APIs cause friction?
5. What does LiteGraph-TSX teach about TypeScript migration, module boundaries, testing, packaging, compatibility, and maintenance?
6. Which custom-node UI patterns transfer to a general-purpose graph library, and which require ComfyUI frontend services or backend contracts?
7. How do schema changes, execution semantics, dependency loading, cleanup, and licensing affect potential adoption?
8. What small experiments can establish value before committing to structural change?

## Progressive study stages

| Stage | Work | Completion evidence |
| --- | --- | --- |
| 1. Map provenance | Identify canonical repositories, migration notices, source revisions, packages, licenses, and relationship to this fork | Source-linked repository map; immutable references where available |
| 2. Compare architecture | Inspect graph representation, execution, serialization, types/build, extension ownership, canvas/application boundaries | Per-track reports identifying actual source paths and distinguishing observation from inference |
| 3. Examine authoring UX | Follow subgraph, search, connection, widget, preview, navigation, and extension patterns through source and tests | Feature ownership matrix; user journeys; explicit browser-validation gaps |
| 4. Sample ecosystem patterns | Inspect representative custom-node repositories by UI pattern, dependency, maintenance, and reuse constraints | Pattern catalog with adopt/adapt/avoid/defer recommendations |
| 5. Synthesize direction | Compare local compatibility costs and capability gains; prioritize experiments | Decision matrix, dependency order, acceptance criteria, unresolved decisions |
| 6. Validate selected experiments | Implement bounded prototypes only as subsequent work; compare behavior and usability with real fixtures | Browser acceptance, execution/serialization regression evidence, measured tradeoffs |

Stages 1–5 form this research pass. Stage 6 is follow-on development, not evidence already obtained.

## Research evidence rules

- Prefer source, official documentation, tests, and issue/PR context over feature lists or popularity counts.
- Record the revision and inspection date. Default-branch observations are snapshots, not guarantees about published releases.
- Distinguish present in source, included in a distribution, documented, covered by tests, and exercised interactively.
- Treat test source as evidence of intended contracts; do not claim tests were executed unless they were.
- Separate visual inspiration, independent implementation, code adaptation, and dependency adoption. Inspect the license of the actual proposed source files before copying.
- Preserve local graph JSON, event payload/action identity, on-request execution, callback composition, readiness, cleanup, and ESM/CommonJS contracts when assessing changes.
- Do not infer general async execution from awaitable initialization, or infer backend execution semantics from a frontend graph editor.

## Initial experiment candidates

These are hypotheses to rank after research, not accepted implementation commitments.

| Candidate | User outcome | Key acceptance question |
| --- | --- | --- |
| Contextual node search | Find a useful next node while connecting a graph | Does insertion preserve the intended connection and support keyboard completion? |
| Subgraph interface and promoted controls | Operate a component without repeatedly opening it | Do nested identity, undo/redo, serialization, and event/data routing remain correct? |
| Extension registration with disposal | Combine independent enhancements predictably | Can an extension unload/reload without duplicate handlers, DOM, or stale settings? |
| Node and execution inspector | Understand values, causes, dependencies, errors, and timings | Can a user explain a stopped, stale, or failing node from visible information? |
| Preview widget host | Add rich visual tools with a coherent lifecycle | Do previews survive resize/navigation/reload and release resources on removal? |
| Reusable component catalog | Find and share meaningful graph fragments | Are component versions, dependencies, interfaces, and migration failures explicit? |

## Research delivery

- [Study index and synthesis](../memories/research/ecosystem-study/README.md)
- [LiteGraph-TSX](../memories/research/ecosystem-study/litegraph-tsx.md)
- [ComfyUI core and frontend](../memories/research/ecosystem-study/comfyui-core-frontend.md)
- [ComfyUI custom-node UI patterns](../memories/research/ecosystem-study/comfyui-custom-node-ui.md)
- [Local fit and experiment proposals](../memories/research/ecosystem-study/local-fit-and-experiments.md)

## Research pass outcome

Stages 1–5 are complete for the defined source-based sample: LiteGraph-TSX main and selected architectural branches, current ComfyUI graph/frontend, and five representative custom-node UI repositories. Reports include pinned sources, observed ownership and compatibility differences, adoption decisions, and proposed acceptance cases. The synthesis recommends incremental commands/extensions, contextual search, subgraph authoring, widget hosting, and execution inspection while retaining local execution contracts.

A local Node probe reproduced the unfinished `Subgraph.buildFromNodes([constant])` path throwing `ReferenceError: node is not defined`. This is documented as a follow-up finding, not fixed in this study. No runtime implementation or generated distribution was changed.

Still open for stage 6: choose a pinned runnable frontend/backend combination for comparative UX observation; inspect Easy-Use's active v2 implementation more deeply if it becomes a reuse candidate; measure representative performance; test keyboard/accessibility behavior; execute schema/runtime compatibility fixtures; and review exact file provenance for any proposed code import. Source tests and documentation are not substitutes for those observations.

The separate baseline assessment retains ownership of its ongoing fixes and current validation evidence.
