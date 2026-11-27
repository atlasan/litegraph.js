# Next priorities after 0.18.0-dev.2

> **Date** 2026-11-25 · **Kind** plan · **Status** accepted (Tier 1 done except step 6) · **Base** `LG/dev` @ `a14c29a`

This plan orders what is still open after the `0.18.0-dev.2` pre-release. Tier 1 leads to a stable `0.18.0`. Tier 2 makes the library's structure match its package contract (0.19). Tier 3 extends the extension and settings platform. Tier 4 connects the library to other projects. Tier 5 is the 0.20 removal of the legacy paths. Each step is a separate track or wave branch from `LG/dev`, keeps the existing compatibility rules (deprecate with a logged shim first, remove no earlier than 0.20), and ends with `npm run check` and a local CI proof.

## Context

- **Done and released:** Waves 0–7 and the flows, panels, node pin, examples, launcher and group tracks ([roadmap](roadmap.md)). This covers every Phase 0–2 item and most Phase 3–4 items of the [11-18 review](2026-11-18-repo-review-and-roadmap.md).
- **Open items on file:** the [state audit of 2026-11-23](../audits/2026-11-23-state-audit.md): D-4, DEC-1 to DEC-5, N-1 to N-12.
- **Checked again on `a14c29a`** (by reading the code; the gate was not run because `node_modules` was not installed in this checkout):
  - The core bundle still includes the canvas. `src/lgraph.js:3` imports `LGraphCanvas`, and `src/litegraph.js:5`, `:8` and `:9` import `LGraphCanvas`, `DragAndScale` and `ContextMenu`. `build/litegraph.core.js:9755` contains `export class LGraphCanvas`.
  - `eslint.config.js:16` still sets `"no-undef": 0`. Only `tools/tests/undeclared-names.test.mjs` runs that rule.
  - `src/lgraphcanvas.js` has 10,087 lines and 31 uses of `active_canvas`.
  - `build.py` still produces the bundles by concatenation with 16 `re.sub` rewrites.
  - There is no classic-script (global `LiteGraph`) bundle. `webglstudio.js` still vendors LiteGraph 0.4 (`editor/js/extra/litegraph.js`).
  - Nothing is published to npm.
- **Related ideas:** USE-09, X-01, X-03, X-04, X-10, X-11, X-12, X-13, GRP-07, NUN-01, NUN-06, the WGS family, and launcher candidates C-1 to C-5.

## Scope

- **In:** ordering and acceptance checks for the open items above.
- **Out:** the roadmap's Deferred list (TypeScript migration, renderer change, async scheduler, graph tabs, remote pack registry, virtual links, app mode). Each still needs its own proposal.

## Steps

### Tier 1: stable 0.18.0

| # | Step | Acceptance check |
|---|---|---|
| 1 | Take DEC-1 to DEC-5 and record them in the roadmap's open-decisions table and in decision records where they are durable | **Done (user, 2026-11-25):** DEC-1 deferred; DEC-2 → [0007](../memories/decisions/0007-hook-handled-rule.md); DEC-3 → [0005](../memories/decisions/0005-porting-style.md), [0006](../memories/decisions/0006-node-metadata.md); DEC-4 → [0008](../memories/decisions/0008-legacy-compatibility-scope.md); DEC-5 flows step 4 accepted, steps 5–7 later |
| 2 | Call scopes (D-4, flows step 4, FLW-01 to FLW-04): per-call freshness for ON_REQUEST, random, time and state readers across loop iterations and Sequence branches; one call id; property edits inside a call are seen | Regression tests for the event flows audit findings 1–4 fail before the change and pass after; the examples test stays green under every model |
| 3 | Browser smoke test of the built bundles in the gate (USE-09): load `editor_build.html` headless, create, link and drag nodes, reroute, search insert with Enter, undo | `npm run check` (or a `check:browser` step in `ci:local --full`) fails on a page error or a failed scripted interaction |
| 4 | Validated loader for untrusted graphs (X-04), shared by the editor and the runner: type allowlist hook, size and coordinate bounds, unknown runtime fields dropped, a structured report | Runner integration test: an oversized or malformed graph is refused with a report; existing fixtures and examples load unchanged |
| 5 | Wave 7 leftovers (N-1): hook and event doc tables generated from the declarations; one-time deprecation logs for `callbacks_handlers`, `cb_handler`, `callbackhandler_setup` and the remaining legacy names; plus [decision 0007](../memories/decisions/0007-hook-handled-rule.md): `LiteGraph.Hooks.StrictHandled` and its one-time warnings | The generated tables match the declarations (a freshness test); each deprecated name logs once in a test; `test/hook-results.test.js` covers strict mode |
| 6 | Launcher on Windows and macOS; npm publish decision and `0.18.0` release checks | Records of the wrapper runs; `ci:local --full` proof on the release commit; tag only after approval |

### Tier 2: library structure (0.19)

| # | Step | Acceptance check |
|---|---|---|
| 7 | A core build without the canvas: remove the canvas imports from `lgraph.js` and from the core path of `litegraph.js` (a registry hook or duck typing for the one `instanceof`) | `check:build` asserts that `litegraph.core.*` contains no `LGraphCanvas`, `ContextMenu` or `DragAndScale`; the runner and the Node tests run on the core bundle |
| 8 | `no-undef` in `eslint.config.js` with the browser and Node globals; the separate test becomes redundant | `npm run lint` reports 0 `no-undef` errors |
| 9 | Split `lgraphcanvas.js` (N-10) along its seams: input, renderer, widget host, menus, search and dialogs; use the canvas instance instead of `active_canvas` in new and moved code | No module over about 3k lines; the type and consumer gates pass; the browser smoke test (step 3) passes |
| 10 | Explicit imports in the concatenation-scope files, then esbuild in place of the `re.sub` pipeline in `build.py` | All 12 bundles keep their exports (`check:types`, `check:build`); the size difference is recorded |

### Tier 3: extensions and configuration (0.19–0.20)

| # | Step | Acceptance check |
|---|---|---|
| 11 | Enable or disable a pack without a reload (N-9); check a pack's `requires.litegraph` range when it registers | Test: disabling a pack disposes its nodes' registrations, extensions and menus, and re-enabling restores them; an incompatible range is refused with a message |
| 12 | Settings export, import and profiles (X-12); property presets per node type (X-11) | Round-trip test of a profile; a preset applied to a node is one undo step |
| 13 | A documented graph-change stream and an external-model reconcile mode (X-03) | A sample app keeps an external model and the canvas in sync in both directions, in a test |
| 14 | Movable and dockable panels with saved layouts (X-13) | Browser check; the layout survives a reload with `persistPlatformState` |

### Tier 4: other projects

[Legacy project compatibility and 3D editor integration](2026-11-27-legacy-projects-and-editor-integration.md) details the downstream checks for step 15 and the WebGLStudio and nunuStudio follow-up work.

| # | Step | Acceptance check |
|---|---|---|
| 15 | A classic-script bundle that exposes the global `LiteGraph` and the old names, for webglstudio (WGS) and nunuStudio (NUN-01, NUN-06) | webglstudio's saved graphs load and run as fixtures in a test |
| 16 | ComfyUI: reroute round-trip audit (GRP-07) and the custom-node survey (launcher candidate C-3) | Round-trip tests for ComfyUI 0.4 and 1.0 reroutes; a research record |
| 17 | Public, versioned runner API with a health endpoint (X-01, X-10) | API contract tests; the runner's security invariants still hold |
| 18 | The C# port (`csharp/`): archive it, or keep it only as a check against a shared JSON Schema for saved graphs | A decision recorded; if kept, a schema conformance test |

### Tier 5: 0.20

| # | Step | Acceptance check |
|---|---|---|
| 19 | **On hold (DEC-4, user 2026-11-25: keep `legacy` for now, decide later).** If taken up: remove the `legacy` execution paths and flags, and make the "handled" rule uniform (D8, pending DEC-2), only after step 5's logs have shipped in a release | CHANGES upgrade notes; a `legacy` document gives a clear migration message |

### Housekeeping (only on request)

The 11 old remote branches (deleting them changes the shared remote), extra worktrees and merged local branches (N-12), and one tester controller (N-3).

## Execution: tracks, dependencies and coordination

**Order.** Tier 1 steps 2–5 don't depend on each other and touch different files, so they run in parallel as sessions. Step 8 (`no-undef`) and the compatibility charter (decision 0008, C-4) are small and run in the coordinating session. Tier 2 waits: step 9 (canvas split) needs step 3's browser smoke test, step 10 (esbuild) needs step 7, and step 7 is started once the step 4 loader (which also edits `src/lgraph.js`) has merged.

| Step | Track branch | Main files | Depends on | Status |
|---|---|---|---|---|
| 1 | `LG/dev_decisions_tier1` | `agents/`, `docs/development.md`, `AGENTS.md`, `.nvmrc` | — | done (coordinator) |
| 2 | `LG/dev_flows_call_scopes` | `src/execution.js`, `src/lgraphnode.js`, flow nodes, tests | 1 | done, merged 2026-11-27 |
| 3 | `LG/dev_browser_smoke` | `tools/`, `tools/ci/`, `package.json` (dev dependency, if any) | 1 | done, merged 2026-11-27 |
| 4 | `LG/dev_graph_loader` | `src/lgraph.js` (`configure` path), `apps/runner/server/`, tests | 1 | done, merged 2026-11-27 |
| 5 | `LG/dev_hooks_deprecations` | `src/callbackhandler.js`, `tools/` doc tables, `docs/callbacks.md`, tests | 1 | done, merged 2026-11-27 |
| 8 + C-4 | `LG/dev_lint_charter` | `eslint.config.js`, `docs/compatibility.md`, `AGENTS.md` | 1 | done, merged 2026-11-25 |
| 7 | `LG/dev_core_split` | `src/lgraph.js`, `src/litegraph.js`, `build.py`, `tools/check-build.mjs` | 4 merged | next (unblocked) |
| 9, 10 | later tracks | `src/lgraphcanvas.js`, `build.py` | 3, 7 | later |

**Coordination rules for the sessions:**
- Each session works in its own worktree on its track branch, cut from `LG/dev` after step 1 merged.
- Environment: `source ~/.nvm/nvm.sh && nvm use` (Node 22 from `.nvmrc`), Bun on PATH (`~/.bun/bin`), `npm ci --ignore-scripts`, then `bun run check`.
- Commits follow the `docs:` / `fix:` or `feat:` / `build:` split. Before reporting done: merge the latest `LG/dev` into the track branch, regenerate `build/` (conflicts in `build/` and `build_node/` are always resolved by rebuilding, never by hand), run `bun run check` and `npm run ci:local -- HEAD`, and write the execution record.
- Sessions don't merge into `LG/dev`, push, post or switch GitHub CI. The coordinator merges finished tracks into `LG/dev` with `--no-ff`, one at a time, rebuilding `build/` after each merge.
- New dev dependencies need versions at least two weeks old and a changelog read, and are named in the execution record.

## Risks and open questions

- **Step 2** changes values that existing graphs see inside loops. Gate it by execution model: `ancestors` and newer get the fix, while `legacy` keeps the old behaviour.
- **Step 7:** registered node classes often don't extend `LGraphNode`, and other code may rely on the core bundle exporting `LGraphCanvas`. Keep a re-export in the full bundles and document the change.
- **Step 9:** the split touches the most-edited file. Do it in small mechanical PRs, one seam each, after the browser smoke test is in place.
- **Step 10:** dropping the committed `build/` output stays out of scope; it is still committed and checked for freshness.
- **Step 15:** how far legacy compatibility should go (0.4 names only, or also 0.4 behaviour) is a user decision.

## History

- 2026-11-25: proposed. Written from a check of `LG/dev` @ `a14c29a` against the state audit and the roadmap.
- 2026-11-25: decisions from the user. DEC-1 (`docs/nodes/`) deferred. DEC-2 and DEC-3 to be revisited one by one, so no recommendation is marked decided. DEC-4: keep the `legacy` paths for now and decide later, so Tier 5 is on hold. DEC-5: accept flows step 4 (call scopes, step 2 here), steps 5–7 later.
- 2026-11-25: the remaining recommendations accepted by the user and recorded as decisions 0005–0008. Plan accepted; environment set to nvm Node 22 (`.nvmrc`) with Bun preferred; Tier 1 steps 2–5 started as parallel sessions (see Execution).
- 2026-11-27: Tier 1 steps 2–5 done by the four sessions (each resumed once after a usage limit) and merged into `LG/dev` in the order loader → hooks → call scopes → browser smoke; only records and minified bundles conflicted ([integration record](../executions/2026-11-27-tier1-integration.md)). Step 7 is unblocked.
