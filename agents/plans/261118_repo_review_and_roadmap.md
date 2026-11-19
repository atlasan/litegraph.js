# LiteGraph.js: repository review and roadmap proposal

Date: 2026-11-18. Branch `claude/litegraph-study-baseline` at `8a8d952` (same commit as `codex/litegraph-study-stabilization`). Status: **proposal**. Nothing in this document has been implemented. Evidence labels: **[V]** means verified by running it or reading the exact lines; **[I]** means inferred from code.

## 1. Where we are

### History in four eras

| Era | Period | What happened |
|---|---|---|
| Upstream | 2011–2024 | jagenjo's LiteGraph; merge-base `0555a2f` (2024-01-08) for the old branches |
| Modernization | 2024 | ES6 classes and modules, pointer events, lint cleanup, versions 0.8–0.10; the litegraph-tsx experiments live on 2024 branches |
| atlasan features | Jan–Apr 2025 | LibraryManager, socket.io, OSC, UDP, three.js, nodejs_sys, graph runner, event switch |
| Agent documentation and tester | Sep 2025 | `agents/` autodoc passes (37 files); editor tester v0 (`f7f0c4a` = local `master`) |
| Stabilization | 2026-10-30 → 11-01 | 15 disciplined fix/build commits: readiness, cleanup, runner/tester lifecycle, ESM/CJS declarations, lint gate, CI. Plus `8a8d952 reco` (ecosystem study and planning) on 11-18 |

### Branch state [V]
- This branch is **16 commits ahead of local `master`** and has never been merged back.
- `origin/master` has one commit that is **not on this branch**: `667ac48` (PR #2). It fixes the `_slot` used-before-definition bug in the slot context menu. That bug really throws: right-clicking any slot raises a TypeError. `git merge-tree` shows it merges cleanly.
- There are 11 stale remote branches. None needs a whole-branch merge (see §4).

### Health gate [V]
`npm run check` passes:
- 0 lint errors
- 12 distributions built (the rebuild is deterministic, so the tree stays clean)
- strict TypeScript ESM/CJS consumers pass
- 71/71 Jest tests and 48/48 integration tests pass

**However:**
- **1,787 ESLint warnings** in `src/` (mostly stylistic, plus 118 `no-unused-vars`).
- **`no-undef` is disabled** in `eslint.config.js:16`. That is exactly why the undefined-variable bugs below survived a "green" gate.

### Recent working areas (churn since 2025-01) [V]
`lgraphnode.js` (23 commits), `litegraph.js` (15), the network nodes (21 across two files), `lgraphcanvas.js` (10), `librarymanager.js` (8), runner/tester, and `test/` plus `tools/tests/` (all new).

## 2. Findings (prioritized)

### P0: Security
1. **The graph runner allows remote code execution from any web page** (localhost, but cross-origin) [V parts, I full chain].
   - The runner binds `127.0.0.1:3000`.
   - Its WebSocket (`headless/graphrunner/server/wsHandler.js:9`) has **no Origin check and no token**. Browsers don't apply CORS to WebSockets.
   - The worker loads `litegraph_nodejs.full.cjs`, which registers `sys/runCommand` (`child_process.exec`, `nodejs_sys.js:328`) and `sys/fileWrite`/`fileDelete`.
   - `update_graph` accepts any graph made of registered types.
   - Any site the developer visits could push and start a graph that runs shell commands.
2. **`server.js` serves `src/`, `build/` and `editor/` on all interfaces** (`listen(8000)` with no host). It is unused because `npm run editor` uses `editor.js`.
3. **`npm audit`:** 35 vulnerabilities (3 critical, all in dev/transitive packages). Runtime-only: 12 vulnerabilities, mainly `ws` 8.18 (the fix is 8.23, semver-minor).
4. **LibraryManager:**
   - `npmInstall` builds a shell string from package names (`librarymanager.js:393`).
   - `vm.runInNewContext` is used as if it were a sandbox (it is not one).
   - `waitAllLibrariesLoaded` polls forever when a library fails.

### P1: Correctness bugs
| # | Bug | Location | Evidence |
|---|---|---|---|
| B1 | Slot right-click menu throws (`_slot` hoisted as undefined) | `lgraphcanvas.js:9060` | V. Already fixed on `origin/master` |
| B2 | `Subgraph.buildFromNodes` throws `node is not defined`; the method is a stub anyway | `subgraph.js:437`, 425–491 | V |
| B3 | "Convert to subgraph" leaves an orphan empty subgraph node behind | `lgraphcanvas.js:8750` | V |
| B4 | Cloning nested subgraphs with `use_uuids` throws (bare `reassignGraphUUIDs`, `.assign` on a plain object) | `subgraph.js:397–399` | V |
| B5 | The `param_bind` missing-property warning itself throws (undefined `outputData`) | `lgraphnode.js:1208` | V |
| B6 | CallbackHandler: `result_priority` is ignored (`cbResPriority` is never updated), the default callback still runs after `stop_replication`, and `call_once` handlers can run twice | `callbackhandler.js:130,236–245` | V (repro scripts) |
| B7 | `setCanvas` on a new element leaves events bound to the old one | `lgraphcanvas.js:377` | V (code) |
| B8 | `canvas.tabindex` should be `tabIndex`, so the canvas gets no keyboard focus without HTML help | `lgraphcanvas.js:389` | V |
| B9 | No `pointercancel` handling; listeners are removed from the global `document` rather than `ref_window.document` | `lgraphcanvas.js:703,1610` | V (code) |
| B10 | `LGraphCanvas` has no `dispose()`; the editor's multiview and mini-window leak render loops and listeners | `litegraph-editor.js:282,305` | V (code) |
| B11 | `closeSubgraph` discards its own centring; the parent view is never saved | `lgraphcanvas.js:338` | V |
| B12 | Search box: `beforeChange` without a matching `afterChange` on failure; the refresh timer is never cleared | `lgraphcanvas.js:7311,7186` | V |
| B13 | `options_panel` patches a static method, but the canvas calls the instance method, so the patch has no effect | `options_panel.js:52` | V |
| B14 | The constructor creates the callback handler twice | `lgraphcanvas.js:39,160` | V |
| B15 | `build.py --update-version` regex never matches; the version is inconsistent (`package.json` 0.10.10, `VERSION="a0.11.1"`, `CHANGES.md` stops at 0.9) | `build.py`, `litegraph.js:22` | V |

### P1: Architecture debt
- **The `/core` build is not core.** `lgraph.js:3` imports `LGraphCanvas` for a single `instanceof`, and `litegraph.js:5-8` imports the canvas, ContextMenu and DragAndScale. The `logs-and-code-style` branch has a 2024 decoupling attempt worth using as a reference.
- **`LiteGraph` is a process-global configuration** (`use_uuids`, `throw_errors`, deferred actions). Graphs and tests leak settings into each other.
- **History is whole-graph snapshots** with no transactions. Paste N nodes and you get N entries. Renames and arrow-key moves bypass history. This blocks every "one operation = one undo" feature.
- **`LGraphCanvas.active_canvas` is a global** that routes the search box, prompt and all static menu callbacks. Multiple canvases are ambiguous.
- **`lgraphcanvas.js` is one 9.3k-line class.** Natural seams:
  - input (622–2181)
  - renderer (2874–5030)
  - widget host (5032–5527)
  - menus (5712–6795, 8534–9230)
  - search and dialogs (6899–8130)
  - navigation (244–350)
- **`start()` returns either `undefined` or a Promise**; callers that don't `await` lose initialization errors.

### P2: Build and packaging
- `build.py` concatenates files and uses regexes to strip imports and to convert ESM to CJS.
  - Six source files (`global.js`, `llink.js`, `socketio.js`, `nodejs_only/*`) depend on shared concatenation scope, so a bundler is **not** a drop-in today.
  - The path to esbuild: add explicit imports and one entry module per distribution. The existing `check-build` and `check-types` gates prove parity.
- **Committed build output:**
  - 307 of 1,342 commits touch `build/`.
  - The 8 recent build commits churned about 120k lines.
  - CI never checks that the committed build is fresh.
- **Runtime `dependencies` is bloated (20 entries):**
  - Squatted placeholders: `fs`, `http`, `path`, `vm`, `child_process`, `uglifyjs@2`.
  - Unused: `chalk`. Build-only: `js-beautify`.
  - Optional integrations that should be `optional`/`peer` dependencies: `socket.io`, `osc`, `ps-list`, `node-windows`, …
- The `./build/*` and `./build_node/*` export wildcards make every artifact public API, including the Node build that contains `sys/runCommand`.
- The README `<script src=litegraph.js>` example is wrong, because the ESM build is not classic-script loadable.
- `build/litegraph.full.*` ships `editor/js/defaults_debug.js`.

### P2: Tests (gaps)
No coverage for:
- `buildFromNodes`, `clone()` with UUIDs, `GraphInput`/`GraphOutput` retyping
- `LGraphGroup`
- CallbackHandler priority semantics
- the undo history
- `computeExecutionOrder` with cycles
- `use_uuids` mode, `param_bind`, and malformed `configure()` input

Tests touch only the `math/*` and `basic/*` node families.

### P3: Node catalog
- **High value, keep investing:** base, events, math, logic, strings, html, libraries/LibraryManager, nodejs_network.
- **Unshipped work in progress:** threejs (21 nodes, 1.1k lines), device, browser OSC.
- **Dead or abandoned:**
  - `libraries/udp.js` (registers nothing; uses `require` inside ESM)
  - `nodejs_mysql` (IIFE style, root/plaintext password defaults)
  - `jquery` (duplicates html)
  - `glfx`
- **`nodejs_sys`:** imports `node-linux-systemd`, which is missing from `package.json`. The shell and file nodes should be opt-in, not part of the default Node build.

### P3: Docs and hygiene
- **README is still upstream's:** wrong package name, `utils/server.js`, "no dependencies", jagenjo URL.
- **Stale or overlapping material:**
  - `TODO.md` and `CHANGES.md` are stale.
  - `agents/` holds 37 overlapping AI-written documents (600 KB).
  - The generated JSDoc in `docs/` dates from May 2024.
- **Dead files:**
  - `server.js`
  - `headless/graphrunner/server/logger.js`
  - `.eslintignore` (ignored by flat config)
  - `csharp/` (untouched since 2023; unreferenced)
  - `nodejs/test_node_*.cjs`
- `.git` is 68 MB because of `imgs/webglstudio.gif` (12 MB), `video.webm` and `impulse.wav`.
- Untracked empty `.aws/`, `.agents/` and `.codex/` directories should be added to `.gitignore`.

### Other repositories
- The ecosystem study (`docs/development/ecosystem-study/`) already covers litegraph-tsx, ComfyUI core/frontend and five custom-node repos with pinned sources. Its direction still stands: **commands/extensions → contextual search → subgraph authoring → widget host → execution inspector**.
- Comfy upstream fixes worth reproducing: pointer-up after simple click (`3b0718d5`), registration/text-measurement performance (`30d0b292`), atomic slot-default tables (`e9540be1`), nested subgraph duplicate inputs (`a01bca62`).
- Sibling repos in `~/Documents` don't consume this library.

## 3. Proposed roadmap

Ordered by dependency. Each phase is one or more reviewable PRs. Sizes: S = under a day, M = a few days, L = a week or more.

### Phase 0: Land and secure the baseline (S, do now)
1. Merge `origin/master` (B1 fix) into this branch, then open a PR from this branch to `master`. Sixteen good commits are currently stranded on a side branch.
2. **Runner lockdown:**
   - Check the WebSocket Origin against the runner's own origin.
   - Add a per-launch token printed to the console (or loopback-only use plus Origin).
   - Add a runner node allowlist that excludes `sys/runCommand`/`fileWrite`/`fileDelete` unless `RUNNER_ALLOW_SYS=1`.
   - Add an integration test that a foreign Origin is rejected.
3. Delete `server.js`, the dead runner `logger.js` and `.eslintignore`. Bump `ws` to 8.23 or later and run `npm audit fix` for non-breaking fixes.
4. Add `.aws/`, `.agents/` and `.codex/` to `.gitignore`.

### Phase 1: Make the gate catch real bugs (S–M)
1. Re-enable `no-undef` with `globals.browser` plus `globals.node`, and declare `LiteGraph` where it is used as a concatenation-scope global. Fix B2/B4/B5 as they surface.
2. Fix B6 (CallbackHandler semantics) and add a test for each of priority, `result_priority`, `prevent_default`, `stop_replication` and `call_once`.
3. Fix the B7–B14 canvas bugs. Add `LGraphCanvas.dispose()` and use it in the editor's multiview.
4. Add a build-freshness step to CI: `git diff --exit-code build build_node`.
5. Run `lint:fix` for the stylistic warnings in a single mechanical commit. Keep it separate so blame stays usable.
6. Add tests for groups, history, `use_uuids`, `computeExecutionOrder` cycles and malformed `configure()`.

### Phase 2: Packaging truthfulness (M)
1. Clean up dependencies: remove placeholders and `chalk`, move `js-beautify` to dev, and move integrations to `optionalDependencies` with LibraryManager reporting their absence clearly. Add `node-linux-systemd` or drop its use.
2. Replace the export wildcards with an explicit export map. Ship the sys/file nodes as an opt-in entry (`./node/sys`).
3. Reconcile the version (one source of truth; fix the `--update-version` regex), update `CHANGES.md` for 0.10/0.11, and rewrite the README install and usage sections.
4. Decide whether to keep committing `build/`. Recommendation: keep it for now (consumers load it directly from git) but enforce freshness in CI. Revisit after esbuild.

### Phase 3: Core/canvas separation and transactions (M–L), the prerequisite for UX work
1. Remove the `LGraphCanvas` import from `lgraph.js` (duck typing or a registry hook) and the canvas imports from the core path of `litegraph.js`. Add a check that `litegraph.core.*` contains no `class LGraphCanvas`.
2. **Transaction API:**
   - `graph.beginTransaction(label)` / `commit()` / `rollback()` grouping `onGraphChanged` snapshots into one history entry.
   - Route paste, delete, rename, arrow-move and search-insert through it.
3. Replace `active_canvas` routing in static menu callbacks with an explicit canvas argument (keep the static shim for compatibility).
4. Make `start()` always return a Promise (document it as a behavior note).
5. Add explicit imports to the six concatenation-scope files. This unlocks a later esbuild switch, validated by the existing parity gates.

### Phase 4: Authoring experiments, following the ecosystem study's order (each M; subgraphs L)
1. **Commands and disposable contributions.**
   - `canvas.commands.register(id, run, {when, keybinding})`, plus menu contributions that return disposables.
   - Wrap CallbackHandler ids in owner scopes.
   - Port `renamer` and `keyboard_helper` (turn their debug logging off) as proofs.
   - Let extensions pre-empt built-in keys, and skip textarea/contenteditable targets.
2. **Contextual search:** split the matcher (7480–7660) from the DOM, add ranking, aliases and descriptions from static metadata, keyboard insertion as one transaction, and re-enable insert-on-link (6531).
3. **Subgraph authoring:**
   - Rewrite `buildFromNodes` with boundary-link detection, interface creation and atomic move (respecting `onRemoved` resource ownership), plus unpack.
   - Save and restore the view per graph level (fixes B11).
   - Promote controls later.
   - Copy-on-insert templates before any linked definitions.
4. **Widget host:** generalize the `nodes/html.js` lifecycle (persistent vs transient state, dispose, zoom-aware placement, focus styles).
5. **Execution inspector:** observation records with a graph-revision identity, per-node last value, error and timing; worker-to-editor identity mapping for the runner.

### Phase 5: Repository organization (M), per `261101_workspace_structure_and_memory.md`
- Root `AGENTS.md`/`CONTRIBUTING.md`.
- Move `agents/` into `docs/history/`.
- Archive the 2024 JSDoc and generate into an ignored directory.
- Move the apps under `apps/{editor,tester,runner}` one at a time.
- Unify the tester's duplicated renderers (`app.js` vs `ui-manager.js`).
- Move large media to LFS or remove it.

### Phase 6: Node catalog decisions (S each)
- Ship or park threejs and device (if shipped, add them to `build.py` with a smoke fixture).
- Delete or rewrite `udp.js`, `nodejs_mysql` and `jquery`; decide whether `glfx` survives.
- Add per-node runtime capability metadata, which the readiness checklist already calls for.

### ComfyUI track (C0–C4)
See [the ComfyUI LiteGraph relationship report](../memories/research/ecosystem-study/comfyui-litegraph-relationship.md#6-proposed-plan).

**Status 2026-11-18, branch `LG/comfy_donor`:**
- **C0–C3: implemented with tests.**
  - Portable save format.
  - Ten ported fixes, including high DPI.
  - The `ComfyInterop` extension.
  - `CanvasPointer`.
  - Graph id, revision and state.
  - Transactions.
  - `LinkConnector`.
  - Reroutes.
  - Typed events.
- **C4: proposed** as [decision 0001](../memories/decisions/0001-subgraph-document-format.md), to be decided with subgraph authoring.
- **Not yet verified:** interactive browser behaviour (dragging, reroute editing, high-DPI rendering, search-box Enter and focus).
- **C0 (serializer hygiene):** belongs in Phase 1. It also fixes the `use_uuids` debug default that ships in the full builds.
- **C1 (shared-ancestry fixes):** pairs with Phase 1.
- **C3 (design ports):** feeds Phase 3/4.
- **C4 (subgraph format):** decided together with Phase 4.3.

### Deferred, needing their own proposals
TypeScript migration, renderer change (Vue/DOM nodes), async workflow scheduler, linked component definitions, package split, publishing the runner beyond trusted local use.

## 4. Branch cleanup proposal

| Branch | Action |
|---|---|
| `forwardcompatible`, `atl_feature_global`, `atl_group_improve`, `tsx_feature_logger`, `prs` | Delete; content is already in master or superseded |
| `atlasan/mergedfixes`, `atlasan_tsx/pre_release` | Tag `archive/*`, then delete (tsx architecture) |
| `logs-and-code-style` | Tag `archive/*`; keep as a reference for Phase 3 decoupling |
| `atlasan/fixes_bis` | Tag; salvage the `LGraphAudio.connect` null-guard idea (`fe0c6c1`) by hand |
| `pulls` | Tag (history), then delete |
| `bad_tester_agent_gone_wild` | Tag, then delete; the stabilization branch is the disciplined redo |
| `codex/litegraph-study-stabilization` | Delete after this branch merges; it is identical to this branch |

Remote deletion is outward-facing and needs explicit approval before it is done.

## 5. Acceptance for this plan

- **Phase 0:** a WebSocket from a foreign Origin is rejected in a test; `sys/*` is unavailable in the runner by default; the branch is merged to `master`.
- **Phase 1:** `no-undef` is on with zero errors; every B-item has a regression test or a browser check noted in `readiness.md`.
- **Phase 3:** the core build has no canvas classes; paste of N nodes = 1 undo entry; consumer and type gates still pass.
- **Phase 4:** each experiment meets the acceptance question in `261101_litegraph_ecosystem_study.md`.
