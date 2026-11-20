# LiteGraph-TSX: architecture, lineage, and adoption study

> **Date** 2026-11-01 · **Kind** research · **Status** final · **Base** litegraph.tsx `1220df17`

This report uses primary GitHub metadata, pinned source, roadmap, release notes, and issue discussions fetched during this study. It is a source assessment, not a successful build or browser acceptance claim. Local comparison point: `3b3957d7f87ad54cc282370e627c8d83993cec4d`.

## Main conclusion

LiteGraph-TSX is valuable as a modernization experiment and a record of migration decisions. Its verified default branch is an ES-module JavaScript/class refactor with Vite, Vitest, JSDoc, declarations, and preliminary CSS token work. It is **not evidence of a completed TypeScript implementation, React editor, or production-ready successor**. This fork has since developed execution, dependency, cleanup, callback, and distribution contracts that TSX does not provide. Study individual ideas and branch experiments; do not replace the current core wholesale.

## 1. Repository identity and maintenance evidence

| Reference | Snapshot observed | Meaning |
| --- | --- | --- |
| [`litegraph-tsx/litegraph.tsx`](https://github.com/litegraph-tsx/litegraph.tsx) | Default `main`: [`1220df17a10a3b4e816a395917a316491af2b24d`](https://github.com/litegraph-tsx/litegraph.tsx/commit/1220df17a10a3b4e816a395917a316491af2b24d), 2024-07-29 | Primary source snapshot for this report; repository metadata says not archived. |
| `PreRelease` | [`130a3cf015d84b2205117dbfc33a825a33223f06`](https://github.com/litegraph-tsx/litegraph.tsx/commit/130a3cf015d84b2205117dbfc33a825a33223f06), 2024-07-22 | Earlier build/migration stage, not a more recent mainline. |
| `atlasan_tsx/pre_release` | [`a4d27159e60126a7147c9d2214a7e62838ce5a22`](https://github.com/litegraph-tsx/litegraph.tsx/commit/a4d27159e60126a7147c9d2214a7e62838ce5a22), 2024-07-22 | Relevant shared lineage; mouse-event adjustment work. |
| `drjkl/settings` | [`aca0978e158ee3f27254820146581858fe9e0556`](https://github.com/litegraph-tsx/litegraph.tsx/commit/aca0978e158ee3f27254820146581858fe9e0556), 2024-07-21 | More aggressive separation of registry, styles, settings, events, and utilities. |
| Other experiment heads | `drjkl/even-more-cycles`: `651bbab586ec5789bf162cd5481961dbd9ba4c90`; `drjkl/still-going-in-circles`: `a001fa1be78e9494bfc146f20698c78ab46ab3a9` | Event/utility extraction experiments from July 2024. |

The [branches API](https://api.github.com/repos/litegraph-tsx/litegraph.tsx/branches?per_page=100) and [default-branch commits](https://api.github.com/repos/litegraph-tsx/litegraph.tsx/commits?per_page=3) were checked, rather than inferring current activity from stars or an updated README. No newer default-branch commit was returned. This does not establish that every related personal fork is inactive.

The [README](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/README.md) frames the project around modernization before additional features. Daniel's [May 2025 explanation](https://github.com/litegraph-tsx/litegraph.tsx/issues/32#issuecomment-2878213419) describes his compatibility-oriented modernization work and subsequent divergence into other forks, including Atlasan's more feature-oriented work. This is useful lineage evidence, not a guarantee of API compatibility.

The returned [v0.6.0-alpha release](https://github.com/litegraph-tsx/litegraph.tsx/releases/tag/v0.6.0-alpha) explicitly describes an unfinished intermediate release, constructor/global migration shims, and known defects. Its warnings concern that earlier release; do not automatically assign every listed defect to the later main snapshot.

## 2. Architecture and migration strategy

Main splits the core into `LGraph`, `LGraphNode`, `LGraphCanvas`, `LLink`, groups, context menus, pointer events, and related classes. The [LiteGraph singleton](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/src/core/litegraph.js) still owns registries, settings, utility functions, and compatibility attachments. Class files and explicit imports improve navigability, but class splitting alone does not produce independent runtime/editor packages or remove cyclic dependencies.

The [`drjkl/settings` branch](https://github.com/litegraph-tsx/litegraph.tsx/tree/aca0978e158ee3f27254820146581858fe9e0556/src/core) is particularly worth studying: `nodes.js` holds `LGraphNodeRegistry`; `events.js`, `settings.js`, `styles.js`, and `utilities.js` extract responsibilities from the singleton. Its `litegraph.js` imports and assembles those modules into a compatibility surface. This is a useful **facade over smaller modules** pattern. It remains an experimental branch, and its event constants still lack this fork's `ON_REQUEST` mode.

The [roadmap](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/ROADMAP.md) describes migration stages: modules, globals with deprecation warnings, classes, logging, types, and stabilization. The transferable idea is staged compatibility with named stopping points and consumer examples. The current fork already has classes and modules; repeating that conversion is unnecessary. The next useful boundary is separating registry/runtime concerns from editor and optional node catalogs while retaining a stable facade.

## 3. TypeScript, build, and tests: what is actually present

The [package](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/package.json) identifies version `0.6.2`, declares `type: module`, ships a manually maintained declaration file, and provides Vite/Vitest/typecheck commands. Source tree inspection found JavaScript core/node/editor files, a TypeScript Vite configuration, and a `.d.ts`; it does not support describing this as a React/TSX component implementation.

The normal [tsconfig](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/tools/tsconfig.json) uses `allowJs: true`, `checkJs: false`, `strict: false`, and `skipLibCheck: true`. The [strict-named config](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/tools/tsconfig.strict.json) enables `checkJs` but still explicitly sets `strict: false`. TypeScript completion and stabilization remain unchecked in the roadmap. An available typecheck script is not evidence that strict checking passes.

The [Vite configuration](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/vite.config.ts) specifies library builds in ESM, CJS, and IIFE formats. This is a promising alternative to this fork's regex-based concatenator. However, package metadata points `main` to `build/litegraph.core.js`, whereas the inspected Vite configuration emits named files under `build/dist`. Treat packaging as a mismatch to reproduce, not a ready-to-copy recipe. Consumer imports also use bundler aliases; [issue #13](https://github.com/litegraph-tsx/litegraph.tsx/issues/13) records the integration friction for consumers without Vite.

The inspected [test file](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/src/litegraph.test.js) contains 12 registration/unregistration tests. [CI](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/.github/workflows/unit-tests.yml) configures Node 20, installation, build, and tests. No fresh execution or remote green result is asserted here. This is substantially narrower evidence than this fork's current execution, mutation, cleanup, declarations, network, and runner fixtures.

## 4. Execution and lifecycle compatibility

The [TSX graph runner](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/src/core/LGraph.js#L228) retains synchronous tick execution and dependency ordering. Several source differences directly matter to this fork:

- `limit = limit || nodes.length` means zero cannot express a zero-node step.
- The non-catching loop calls `doExecute`, while the catching loop calls `onExecute` directly; the wrappers do not have identical participation across branches.
- `iteration` increments once after the outer loop, rather than per completed cycle of `runStep(n)`.
- [Node execution/action wrappers](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/src/core/LGraphNode.js#L787) call user hooks directly and clear execution flags after those calls, without the local fork's corresponding `finally` recovery.
- Deferred actions call `onAction` directly and clear the queue after iterating it. They do not implement the local callback-aware draining contract.

The inspected TSX files do not contain this fork's node readiness state, `whenReady`, awaitable resource cleanup, prioritized `CallbackHandler` composition, or `ON_REQUEST` ancestor-refresh contract. These are substantive behavioral differences, not merely renamed files. Preserve [local lifecycle invariants](../../../../docs/development.md) when importing any execution-adjacent change.

## 5. Editor, search, subgraphs, and styling

TSX retains the Canvas2D editor and DOM search dialog. Its [search implementation](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/src/core/LGraphCanvas.js#L6197) supports input/output type filters, connection-aware insertion, extras, and generic fallback results. That is useful lineage for current behavior, but not evidence of a new component-based search system or a mature command palette.

Its [subgraph implementation](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/src/nodes/base.js#L24) embeds an `LGraph` in a node and maps graph inputs/outputs through callbacks. [Navigation](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/src/core/LGraphCanvas.js#L238) uses a graph stack; closing resets the pan offset and zoom. This is conventional nested graph support, not sufficient evidence for reusable versioned definitions, instance override policies, exposed internal widgets, or ComfyUI-style empowered subgraphs. [Issue #33](https://github.com/litegraph-tsx/litegraph.tsx/issues/33) reports duplicate graph-input deletion affecting the port; it is a test lead, not a reproduced failure in this study.

The last commits introduce [CSS custom properties](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/css/litegraph.css) and begin connecting canvas colors to them. This is a strong idea for consistent canvas/DOM theming, but implementation is partial. Numeric dimensions and many styles remain JavaScript settings.

There is also a concrete boundary hazard: [`getStyleProperty`](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/src/core/litegraph.js#L1066) defaults to `window.document.documentElement`, and module-level `LGraphCanvas.link_type_colors` initialization calls it. Source inspection therefore predicts a plain Node import needs a DOM shim or a change; the README's general Node support claim is not sufficient. A future design should resolve DOM theme tokens in the editor adapter, retain non-DOM defaults in core, and avoid DOM reads during runtime module initialization.

The [logging proxy](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/src/core/Console.js) targets `globalThis.console` and assigns methods on that target when its level changes. Despite its comment about a local override, those assignments affect the underlying global object. Adopt scoped logging as an idea; do not port this implementation unchanged.

## 6. Adoption decisions

| Candidate | Decision | Practical next step and acceptance evidence |
| --- | --- | --- |
| Separate registry/settings/styles/utilities behind a legacy facade | Adapt | Design imports that keep the runtime DOM-free; verify public export parity and two independent graph consumers. Use the `drjkl/settings` branch as a design reference. |
| Vite or another module-aware builder | Adapt | Prototype in isolation; preserve current core/full/Node exports, CJS/ESM consumers, declarations, optional runtime integrations, and package-content checks. |
| CSS tokens shared by canvas and DOM | Adapt | Resolve tokens per editor host with cache invalidation and core defaults; verify theme switching, two differently themed editors, and headless import. |
| Staged migration shims and examples | Adopt the process | Document supported compatibility surface and intentional changes; make warnings actionable and non-repetitive. |
| Full TSX core replacement | Avoid | Would discard local semantics and stabilization; modern syntax alone is not an upgrade guarantee. |
| Mainline execution/action wrappers | Avoid wholesale port | Reproduce any individually interesting change against local event, readiness, mutation, and cleanup fixtures. |
| Existing singleton logging proxy | Avoid unchanged | Use a wrapper that retains original methods and never mutates the global console. |
| TSX search/subgraph UI as the main UX destination | Defer | Treat as lineage/reference; study ComfyUI's more developed concepts independently. |
| Automatic TypeScript conversion | Defer | First define public contracts and module boundaries; evaluate checkJs or incremental TS conversion against strict consumer fixtures. |

## 7. Reuse and unresolved questions

The pinned [LICENSE](https://github.com/litegraph-tsx/litegraph.tsx/blob/1220df17a10a3b4e816a395917a316491af2b24d/LICENSE) contains MIT terms and Javi Agenjo/Daniel Lewis notices, despite repository metadata classifying it as `NOASSERTION`. For actual copied portions, retain applicable notices and check the specific file and bundled assets/dependencies; this report copies no implementation.

Follow-up experiments should be bounded:

1. Reproduce clean build and actual package import behavior from the pinned snapshot; separate metadata defects from source execution defects.
2. Run a tiny headless import fixture to confirm the theme initialization hazard.
3. Compare the `drjkl/settings` module boundary proposal with a local dependency graph; determine which changes truly remove cycles and which just relocate singletons.
4. Test subgraph navigation state preservation, duplicate port ownership, and nested event payloads before borrowing related code.
5. Use published consumer fixtures to evaluate a module-aware builder without changing runtime behavior.

No broad TSX build, browser test, package publication check, or exhaustive audit of all related forks was performed. The verified snapshot and source differences are sufficient to position TSX as a targeted modernization reference; adoption requires the corresponding experiment above.
