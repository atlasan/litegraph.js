# LiteGraph.js: workspace structure and project memory

## 1. Foundation and current state

Organize the repository around **LiteGraph.js as a shared foundation**, surrounded by applications, extensions, integrations, and utilities that can evolve at different speeds. Give users, contributors, and coding agents clear entry points into the same maintained knowledge.

The inspection found:

| Area | Current state |
|---|---|
| Git | Clean working tree at `3b3957d`; stabilization branch is 12 commits ahead of local `master`. Remote freshness was not rechecked. |
| Library | Graph execution, canvas, registry, callbacks, initialization, and library loading are interconnected. They should remain one package during the organizational migration. |
| Surrounding modules | Editor, browser tester, worker runner, node integrations, examples, and an experimental C#/Unity implementation already exist. |
| Direction | Compatibility, extensibility, execution improvements, and tooling are recurring intentions. There is no single maintained direction document. |
| Planning | Ideas are scattered across TODOs, historical analysis, improvement proposals, and recent readiness notes. Some old proposals describe already-implemented work as missing. |
| Documentation | Current development notes contain useful evidence but combine setup, contracts, limitations, history, and planning. Generated API HTML dates from May 2024. |
| Validation | This inspection passed 71 core/DOM tests, strict TypeScript checks, and the lint error gate. Network tests and package verification encountered sandbox `EPERM` restrictions; the complete gate was not revalidated. |

Seven source modules are outside the builder’s inclusion lists, including the options panel, Three.js, OSC/UDP helpers, and MySQL nodes. Documentation must distinguish **present in source**, **included in a distribution**, and **verified in a runtime**.

This is a proposal only; no repository files have been changed.

## 2. Workspace and module organization

Use this target layout, retaining established distribution paths:

```text
/
├── README.md                 Project identity and navigation
├── CONTRIBUTING.md           Contributor entry point
├── AGENTS.md                 Concise agent working instructions
├── src/                      LiteGraph library, nodes, extensions, types
├── css/                      Public library styles
├── build/                    Existing browser distributions
├── build_node/               Existing CommonJS distributions
├── apps/
│   ├── editor/
│   ├── tester/
│   └── runner/
├── packages/                 Reusable extractions, when justified
├── integrations/
│   └── unity/                Existing experimental C# implementation
├── examples/
│   ├── browser/
│   ├── node/
│   └── workflows/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── types/
│   └── fixtures/
├── tools/                    Build, validation, documentation, dev servers
├── docs/
│   ├── getting-started/
│   ├── guides/
│   ├── reference/
│   ├── architecture/
│   ├── contributing/
│   └── history/
├── planning/
│   ├── README.md             Work index
│   ├── direction.md          Principles and intended capabilities
│   ├── roadmap.md            Linked workstreams and milestones
│   ├── ideas/
│   ├── proposals/
│   └── plans/
└── experiments/              Bounded executable investigations
```

Create directories only when they contain real material.

**Keep the library cohesive.** Initially preserve its source layout, initialization order, package identity, and root publishing manifest. Document internal subsystems without pretending they are independently consumable packages. In particular, the current `/core` entry point includes canvas-related classes; do not redefine it silently as a renderer-free runtime.

**Give applications clear ownership.** Move the editor shell, tester, and runner into their respective application homes. The reusable `Editor` class remains library code. Move application defaults out of ambiguous locations, explicitly preserving any defaults currently included in full builds.

**Separate supporting material by purpose.**

- Examples teach usage; regression fixtures prove behavior.
- Integrations connect LiteGraph to another environment.
- Experiments answer a stated question and record a result.
- Tools maintain the repository.
- Packages expose reusable capabilities to multiple consumers.

Keep node-owned assets with their source and application-owned assets with their application. Preserve existing served asset URLs through explicit route mappings where moves would otherwise break them. Retain third-party license notices.

**Extract packages only against concrete criteria:** a real consumer outside the original application, a defined public interface, explicit dependencies, independent validation, and a release rationale. Tester utilities, runner utilities, and optional node catalogs are candidates—not automatic commitments. Introduce npm workspaces when the first actual extraction requires them; retain one lockfile.

## 3. Documentation and planning model

The repository is authoritative. Chats and GitHub issues can provide context and discussion, but accepted decisions and active plans must be understandable from a checkout.

### Documentation describes what exists

Provide three short entry routes:

- **Use LiteGraph:** install, create a graph, embed a canvas, author a node, run headlessly.
- **Develop LiteGraph:** setup, module map, checks, compatibility, contribution and release workflow.
- **Work with agents:** repository navigation, source/generated boundaries, validation commands, and links to relevant plans.

Use one canonical home for each subject:

| Content | Home |
|---|---|
| First successful workflows | Getting started |
| Task-oriented instructions | Guides |
| API, node/runtime catalog, package exports, runner protocol | Reference |
| Execution model, dependency boundaries, extension model | Architecture |
| Accepted architectural decisions | Architecture decision records |
| Development, testing, packaging, releases | Contributing |
| Dated investigations and superseded proposals | History |
| Intentions and unfinished work | Planning |

Split the current development overview along these boundaries. Preserve dated investigation reports as evidence, rather than continuing to append current instructions to them.

Each maintained module overview should state its purpose, entry points, dependencies, runtime requirements, validation coverage, limitations, and related plans. The node catalog must record distribution inclusion separately from runtime support and test evidence.

Generate JSDoc into an ignored output directory outside authored documentation. Keep source comments authoritative for API generation. Archive the existing generated snapshot with its date, update its entry link, and preserve accessible navigation to the replacement reference. Publishing a new documentation site is a separate deployment decision.

### Planning describes what may change

Use a small, explicit lifecycle:

**Idea → proposal → accepted plan → completed work**

Items may also be deferred, rejected, or superseded.

- **Idea:** problem or opportunity, motivation, source, related module.
- **Proposal:** alternatives, tradeoffs, compatibility impact, recommendation.
- **Plan:** accepted outcome, implementation boundaries, dependencies, acceptance checks, current status.
- **Decision record:** a durable architectural choice and its consequences.

Use stable filenames such as `0012-node-runtime-catalog.md`. Status belongs in the record; indexes link to it rather than maintaining another copy. Small fixes need no proposal.

The roadmap groups workstreams—library, canvas/editor, nodes/integrations, extensions, runner, tester, developer experience—without imposing a product hierarchy. Include only accepted work as commitments; keep speculative possibilities visibly separate.

Migrate old analysis and improvement documents into history with their provenance intact. Triage useful ideas individually against current code. Do not promote historical timelines, enterprise ambitions, or “validated” labels into current commitments.

## 4. Workspace management and migration

Implement the organization in four reviewable increments:

1. **Establish navigation and project memory.** Add the entry documents, direction, module map, planning index, and record templates. Reconcile TODOs and readiness notes into linked records; preserve historical originals.
2. **Separate maintained documentation from generated output.** Split the development guide, establish reference ownership, relocate historical analysis, and repair links. Leave forwarding pages at previously documented Markdown locations.
3. **Relocate applications and supporting material.** Move one subsystem at a time, updating imports, worker paths, static routes, example references, build inputs, and tests together. Consolidate the duplicate development-server implementations while preserving launch commands.
4. **Evaluate reusable extractions.** Record candidate boundaries and their evidence. Package extraction requires its own accepted proposal and is outside the organizational migration.

For ongoing work:

- Use one branch per coherent change; use separate worktrees when concurrent work needs isolation.
- Record the intended result and acceptance checks before substantial implementation.
- Update behavior documentation with the change that makes it true.
- Keep temporary logs, local workflows, generated docs, and machine-specific settings ignored.
- Attach durable evidence only when it establishes an acceptance result.
- Close plans with validation evidence and links to resulting documentation.
- Keep agent guidance short and referential; avoid duplicate agent-specific architecture documents.

Existing `agents/` reports become historical project material. A root `AGENTS.md` supplies operational instructions; module-specific instructions are added only when a module genuinely needs different rules.

## 5. Compatibility and acceptance

**Public interfaces remain unchanged during reorganization:** package names and exports, ESM/CommonJS behavior, declaration identity, graph JSON, node identifiers, callback semantics, initialization, and cleanup contracts. Existing launch commands and documented development URLs continue to work through wrappers or route aliases.

Keep the current builder and distribution policy during the move. Bundler replacement, TypeScript migration, version alignment, and independent releases are separate proposals.

Acceptance requires:

- A new reader can find usage, contribution instructions, architecture, active work, and historical evidence from the root README.
- Every existing subsystem has an identified home and a truthful maturity/validation description.
- Historical claims cannot be mistaken for current guarantees.
- Internal documentation links resolve; generated output cannot overwrite authored pages.
- The full validation gate passes in an environment permitting its subprocess and network checks.
- Package contents, all twelve distributions, and strict ESM/CommonJS consumers remain valid after moves.
- Editor and tester URLs load; graph editing and save/reload work; runner lifecycle and resource-release checks pass.
- Existing graph fixtures preserve node identities and serialization behavior.
- No framework migration, package split, publication, or speculative feature implementation is bundled into the organizational change.

The result should be a workspace where **each component has a clear home, each claim has an evidence level, and each intention has an explicit status**—while retaining room for LiteGraph’s surrounding ecosystem to grow.
