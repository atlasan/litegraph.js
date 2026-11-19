# Improvements ledger (2025 → 2026)

Reviewed 2026-11-19. The 2025 automated analysis produced eight improvement wishlists, plus three recommendation documents in `analysis/`. This ledger records **what happened to each proposal**. The original texts are in git history (`git show 41d3de5:agents/improvements/`; the folder was removed after this ledger).

**Statuses:**
- **done:** in the code (the path is evidence).
- **roadmap** or **harvest:** planned in the [roadmap](../plans/roadmap.md), or listed in the [harvest plan](../plans/261119_feature_harvest_and_priorities.md).
- **idea:** a row in the [ideas catalog](../ideas/catalog.md).
- **dropped:** with a reason.

New proposals do not go here. Add them to the [ideas docspace](../ideas/README.md).

**Dropped as non-actionable:**
- budgets, team sizes, timelines and phases
- success metrics, risk tables and maintenance cadences
- "microservices" diagrams and "modern stack" lists
- documentation-site tooling (Docusaurus, Algolia, Storybook)

## Build

| Proposal | Now |
|---|---|
| Replace `build.py` with Webpack, Rollup or Vite | **dropped:** `build.py` was hardened (fails on missing tools) and is gated by `check:build`. A bundler or TypeScript migration needs its own rationale (roadmap, deferred) |
| Smaller bundles | **done** (partial): `./core` entry without the node catalog. Tree-shaking was dropped along with the bundler |
| Lint, type check and tests before release | **done:** `npm run check` (ESLint flat config, `check:types`, Jest, node:test, `check:build`) |
| CI | **done:** `.github/workflows/validate.yml` (Node 22, Linux) |
| Version from one source | **done:** `LiteGraph.VERSION` = package version; `build.py --update-version` |
| CI check that `build/` is fresh; truthful runtime dependencies | **roadmap** Wave 5 |
| Source maps; release and publish workflow | **idea** DEV-04, DEV-05 |
| HMR, watch mode, build profiles, caching, Docker, CDN, automated changelog | **dropped:** the build is fast; `CHANGES.md` is written with each change |

## Testing

| Proposal | Now |
|---|---|
| Core graph, node lifecycle, serialization | **done:** `test/` (25 Jest files, 344 tests) |
| Canvas, pointer, selection, widgets, reroutes, link connector | **done:** `test/canvas-*.test.js`, `selection`, `widgets`, `link-connector` |
| Extensions, platform registries, CallbackHandler | **done:** `test/platform*.test.js`, `callback-handler.test.js` |
| Runner, workers, network teardown, security | **done:** `tools/tests/` (16 node:test files, 88 tests) |
| Teardown and leak checks | **done** (partial): `canvas.dispose()`, async cleanup, HTML overlay lifecycle |
| Coverage report | **idea** DEV-01 |
| Large-graph benchmarks and a performance guide | **idea** DEV-02 |
| Visual regression; cross-browser smoke tests | **idea** DEV-03, USE-09 |

## Extensions

| Proposal | Now |
|---|---|
| Fix `options_panel.js`; complete `keyboard_helper` | **done:** the first was removed (Wave 0); the second was rebuilt on commands (Wave 1) |
| Dependencies, unload, persisted configuration | **done:** `def.requires`, the disposer returned by `registerExtension`, `LiteGraph.settings` + `persistPlatformState` |
| Shared state and messaging | **done:** typed events (`LGraphEventTarget`), `LiteGraph.commands` |
| One callback pipe (CallbackHandler + events) | **roadmap** Wave 2 (H10) |
| Version compatibility, marketplace | **roadmap:** Wave 4 pack manifest; remote registry deferred |
| Late or hot loading; validation and sandboxing | **idea** CFY-52; BUN-12, JS-22, X-04 |
| Settings export and profiles; node and extension scaffolder | **idea** X-12, DEV-06 |
| Extension performance monitoring | **dropped:** no third-party ecosystem to measure yet |

## Headless runner

| Proposal | Now |
|---|---|
| Who may connect and run what | **done:** Origin and Host checks, recursive `nodePolicy.js` denylist, `RUNNER_ALLOW_SYS` (Wave 0); stricter preset is decision D1 |
| Environment configuration, logging | **done** (partial): `server/config.js`, winston `logger.js` |
| Validated input graphs, limits, credentials, tokens | **idea** X-04, USE-35, BUN-11, X-01 |
| Health and metrics endpoint | **idea** X-10 |
| Run-state view, debugging | **roadmap** Wave 4 execution-state protocol; **idea** USE-34, USE-42 |
| Queues, caching, parallelism, distribution, databases, S3 | **idea** USE-30, USE-38, USE-02, CFY-40, BUN-17, BUN-18 |
| Docker, Kubernetes, Prometheus, Grafana, TLS, load balancing | **dropped:** localhost development runner; BUN-15 (single binary) is the packaging idea |

## Editor and UI

| Proposal | Now |
|---|---|
| Multi-selection, undo, keyboard navigation, plugin architecture | **done:** `selectedItems`, `graph.transact`, `LiteGraph.keybindings`, `registerExtension` + `LiteGraph.menus` (Wave 1) |
| Rich property editors, schema-driven forms | **done** (partial): `src/widgets.js`, `static def`; **idea** CFY-01 to CFY-05, JS-19 |
| Clipboard with links, grouping, subgraph conversion, search | **roadmap** Waves 2–3 |
| Minimap, visual debugger | **roadmap** Wave 4 |
| Snap, align, zoom to fit | **harvest** §4.6–4.7 |
| Themes, layers, collaboration, history branches | **idea** CFY-45, CFY-50, JS-16, JS-17 |
| Accessibility; touch and mobile | **idea** X-08, X-09 |
| Property presets | **idea** X-11 |
| React or Vue migration | **dropped:** renderer change deferred without a rationale; JS-31 is parked |

## Documentation and developer experience

| Proposal | Now |
|---|---|
| TypeScript declarations | **done:** `src/litegraph.d.cts` with an export-parity check |
| Setup, gate, contracts, security, migration notes | **done:** [docs/development](../../docs/development.md), [AGENTS.md](../../AGENTS.md), `CHANGES.md` |
| Node testing framework | **done:** `editor_tester/` |
| Codebase architecture docs | **done:** [codebase map](../memories/codebase/README.md); README, getting-started and generated API docs moved out of the tree are **roadmap** Wave 5 |
| Node SDK (`defineNodeType`) | **roadmap** decision D4 |
| Templates and examples, node reference, tours | **idea** CFY-43, USE-06, CFY-19 |
| Release and versioning process | **idea** DEV-05 |
| Wiki, video courses, C#/Unity guide | **dropped:** out of scope; whether to keep `csharp/` (untouched since 2023) is a separate decision |
