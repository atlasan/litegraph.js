# Development

Setup, the validation gate and the package contracts. The full stabilization record, including acceptance runs and screenshots, is in [agents/executions](../agents/executions/README.md). Working rules are in [AGENTS.md](../AGENTS.md).

## Setup

Requires Node.js 22 (pinned in `.nvmrc`), Python 3, and preferably Bun.

- **Node through nvm:** `nvm install` once, then `nvm use` in each shell (both read `.nvmrc`). Jest and the integration tests run on Node, so the gate always needs it.
- **Bun as the preferred runner:** `bun run <script>` runs the package scripts (they still call Node where they say `node`), and the apps and the launcher run on Bun (`npm run editor:bun`, `graphrunner:bun`, `./lg.sh`). Bun is advisory in the local CI (`--bun`).
- **Install with npm:** `package-lock.json` is the lock file, so install with `npm ci`; don't commit a `bun.lock`.

```sh
nvm use                  # Node 22 from .nvmrc
npm ci --ignore-scripts
bun run check            # the gate (or npm run check): run before every commit that touches code
bun run editor:bun       # http://127.0.0.1:8000/  (editor_build.html loads the extensions)
bun run graphrunner:bun  # http://127.0.0.1:3000/
```

| Command | What it does |
|---|---|
| `npm run check` | Lint, builds, type checks, Jest, integration, package, browser smoke, and execution parity |
| `npm run check:browser` | The [browser smoke test](#browser-smoke-test): `editor_build.html` in a headless Firefox, driven by pointer and key input. Skipped (exit 0) when no Firefox is found |
| `npm run check:execution-parity` | [Browser and Node execution parity](#browser-and-node-execution-parity) across the built editor and Node runner. Requires Firefox. |
| `npm run build` | Builds the current source into the ignored package at `.lg/local-build/` |
| `npm run build:classic` | Builds the separate [classic browser script](#classic-browser-script) |
| `npm run check:classic` | Builds that script and checks the globals and a running graph. Included in `npm run check` |
| `npm run build:milestone` | Regenerates the tracked compatibility snapshot at an agreed milestone |
| `npm test` / `npm run test:integration` | Jest (`test/`) / node:test (`tools/tests/`) |
| `npm run check:fresh` | Rebuilds locally and compares the tracked bundle paths against the local build |
| `npm run check:all` | `check` plus the milestone snapshot comparison |
| `npm run ci:local` | The [local CI](#local-ci): the workflow's steps in a clean clone of a commit, with a proof report. Run it before a merge into `LG/dev` or a PR to `master` |
| `npm run ci:github` | The switch for the GitHub workflow (off by default): `-- status`, `-- on`, `-- off` |
| `npm run check:types` | Strict ESM and CJS consumers against `src/litegraph.d.cts`, plus export parity with the built modules |
| `npm run lint` | ESLint, with warnings (the gate fails on errors only) |
| `npm run docs` | JSDoc from `src/` into [docs/api](api/index.html); the plugin `docs/jsdoc-ts-types.cjs` turns TypeScript-style types JSDoc cannot parse into `function` / `Object` / `*` and keeps the original in the description |

`--ignore-scripts` skips native integration bindings. Browser GPU, audio and MIDI nodes, and external services, are outside the gate.

## Browser smoke test

`tools/browser/smoke.mjs` (`npm run check:browser`) serves the editor in-process on a free port and opens `/editor/editor_build.html` in a headless Firefox through WebDriver BiDi (`tools/browser/firefox-bidi.mjs`: Node's built-in `WebSocket`, no npm dependency, nothing downloaded). Each step checks the graph and fails on any uncaught page error, `console.error` or failed request:

1. the page loads with an empty graph;
2. `build/litegraph.js` and `build/litegraph.full.js` load as modules in a blank tab and run a two-node graph;
3. two nodes are created, then linked by dragging an output to an input;
4. a node is dragged by its title (the expected position follows the grid alignment);
5. a reroute is added from the link menu, then dragged;
6. a double click opens the search box, its input has the focus, `watch` is typed and Enter inserts the first result;
7. Ctrl+Z five times, each back to the state before the step (the test turns `actionHistory_enabled` on; the page keeps it off).

| Setting | Effect |
|---|---|
| `LG_FIREFOX=/path/to/firefox` | The executable. Otherwise `firefox`, `firefox-esr`, ... on the `PATH`, then the usual install places. A wrong path fails the run |
| `LG_BROWSER_SMOKE=0` | Skip |
| `LG_BROWSER_SMOKE=require` | No Firefox is a failure instead of a skip |
| `--verbose` | Firefox's output and the page's console |

A snap Firefox (Ubuntu) gets its throwaway profile under `~/snap/firefox/common/`, because it cannot see the host's `/tmp`. Firefox is closed through BiDi `browser.close` first, signals only as a fallback. A run takes about 15 s, about half of it Firefox starting.

## Browser and Node execution parity

With Node 22 and Firefox available, run:

```sh
npm run build
npm run check:execution-parity
npm run check:execution-parity -- --json ../execution-parity-report.json
```

Use `LG_FIREFOX` to select the executable. Choose a new report path outside the worktree. The JSON report (schema 2) contains the traces and stopped checkpoints for each fixture by host.

- [Branch and Counter](../tools/execution-parity/branch-counter.json) emits `1` on the first start, `2` after stop/start, and `1` after reopening.
- [Linked WaitAll](../tools/execution-parity/linked-wait-all.json) verifies two live instances of one saved definition. Pending inputs survive stop/start in their own instance. Reopening clears the pending inputs and counters.
- [Linked deferred actions](../tools/execution-parity/linked-deferred-actions.json) runs under `step`, `strict`, and the default `legacy` flags. A normal stop/start delivers each queued action once. Reopening a stopped snapshot or explicitly clearing the queues before restart delivers none.

The cases check paused inspection when the saved model is unavailable. The browser comparison follows `LG_BROWSER_SMOKE` in the validation gate. Node checks still run when Firefox is skipped. Local CI reports which hosts ran. [Execution parity plan](../agents/plans/2026-11-27-browser-node-execution-parity.md)

## Local CI

GitHub CI is kept but switched off (roadmap D10); the local CI is the proof for merges and releases. `tools/ci/ci.mjs` (`npm run ci:local -- ...`, or `./lg.sh ci ...`) checks out a commit into a clean clone under the git-ignored `.lg/ci/work/`, runs the steps of `.github/workflows/validate.yml` there, and writes a report. It never touches the working tree it is started from, so uncommitted changes are not tested: commit first.

```sh
npm run ci:local                          # HEAD: npm ci --ignore-scripts, npm run check, snapshot guard
npm run ci:local -- LG/dev my-branch -j 2 # several refs at once, each in its own clone
npm run ci:local -- --full                # plus npm audit, the packed install, the ComfyUI probes, Bun
npm run ci:local -- list                  # recent runs; show [run] --md|--json|--summary; clean
```

| Step | What it runs | Flag |
|---|---|---|
| `clone` | `git clone --local`, `checkout --detach <commit>`; the checkout must be clean | always |
| `install` | `npm ci --ignore-scripts --prefer-offline` (the shared npm cache) | always |
| `check` | `npm run check`; the Jest, node:test and browser smoke counts are read from the log | always |
| `snapshot` | Verifies that validation left the tracked bundle directories untouched. Older refs keep their original `fresh` check. | always |
| `audit` | `npm audit --omit=dev` (needs the network) | `--audit` |
| `pack` | `npm pack` from the local build package, installed with `--omit=optional` into an empty project: ESM `.`, `/core`, a deep import; CJS `.` and `/node`; the version; `allow_scripts` false; `definitions`; `ancestors`; a graph run; `src/` not exported; no dependencies (`tools/ci/pack-smoke.mjs`) | `--pack` |
| `comfy` | the ComfyUI probes from the git-ignored `experiments/comfy-interop/` (schema and content), copied into the clone; skipped when absent | `--comfy` |
| `bun` | `bun test tools/tests` and the launcher on Bun; **advisory**: reported, never fails the run (one `library-manager` case is known to fail on Bun) | `--bun` |

Each run has its own clone, `TMPDIR` and state, with `CI=true` and no npm settings inherited from an outer `npm run`; the tests use free ports (`listen(0)`), so runs can go in parallel (`--jobs N`, default 2). A passing run removes its clone; a failing one keeps it for inspection (`--keep` / `--no-keep` decide).

**Report:** `.lg/ci/runs/<sha>-<time>/` holds `report.json` (commit and tree, ref, branches, clean flag, host, Node, npm, Python, git and Bun versions, each step's exit code, duration, counts and log sha256, the runner's own commit and hash), `report.md` (paste it into a PR body, an issue or a comment), `summary.txt` and `logs/`. The summary is one line, usable as a commit trailer:

```
Local-CI: pass 1a2b3c4 node22.23.4 jest 1016/1016 int 151/151 browser 9/9 snapshot ok
```

`browser 9/9` is the browser smoke test inside `check`; `browser skip` means the machine had no Firefox, so that run did not exercise the browser. Commits from before the test show no `browser` token.

- `--note` (or `ci.mjs note [run]`) appends the summary as a git note under `refs/notes/ci`; `git log --notes=ci` shows it. Notes are local: the tool never pushes them (`git push origin refs/notes/ci` does, by hand).
- `--pr N` / `--issue N` (or `ci.mjs comment [run] --pr N`) print the `gh pr comment N --body-file report.md` command; only `--post` runs it. Posting is outward-facing: agents ask the user first.

### The GitHub workflow switch

`.github/workflows/validate.yml` runs its job only when the repository variable `LG_GITHUB_CI` is `on`. Unset (the default), pushes and pull requests show the check as skipped and use no runner minutes. A manual run (`workflow_dispatch`: the Actions tab's "Run workflow", or `gh workflow run validate.yml`) always runs, whatever the switch.

```sh
npm run ci:github -- status    # gh variable list
npm run ci:github -- on        # gh variable set LG_GITHUB_CI --body on
npm run ci:github -- off       # gh variable delete LG_GITHUB_CI
```

`on` and `off` change a repository setting (they need `gh auth` with admin rights on the repository); `--dry-run` prints the command, `--repo OWNER/NAME` picks another repository, `LG_CI_GH` another `gh`. Only the repository owner switches it; agents never do. Keep the workflow's steps and the runner's core steps the same.

## Classic browser script

Run `npm run build:classic` to generate `.lg/classic-build/litegraph.classic.js` from the same sources and standard node catalog as the browser ESM build. The classic artifact has a separate output directory from the package and tracked milestone builds. Serve it as a regular script before a host that reads LiteGraph from the browser global.

The script exposes `LiteGraph`, `LGraph`, `LGraphNode`, `LGraphCanvas`, `LGraphGroup`, `LLink`, `LGraphTexture`, `ContextMenu`, `CurveEditor`, and `DragAndScale`. Load one LiteGraph build per page. Where host scripts provide gl-matrix or LiteGL, load those first. WebGLStudio provides both. Script evaluation stays disabled by default.

For WebGLStudio, test the bundled runtime and the generated script as separate deployments using the host's `test/legacy-compat/verify.mjs` command. See the [compatibility targets](compatibility.md#targets) for the legacy document scope.

## Milestone builds

`npm run build` creates a packable copy of the package at `.lg/local-build/`. The editor and Node runner use it when present and retain their existing browser URLs. A clean checkout can still use the checked-in snapshot. Direct imports from the repository root, git installs, and plain `npm pack` at the root use the snapshot. To pack current sources, use `npm pack ./.lg/local-build --ignore-scripts --pack-destination <artifact-directory>` after building.

Refresh the compatibility snapshot at an agreed milestone after the full validation pass. Make the version decision first so the package manifest, lockfile, and runtime version agree.

```sh
npm run check
npm run build:milestone
npm run check:fresh
git diff --stat -- build build_node
```

Review the snapshot changes with the milestone. After the milestone commit exists, run `npm run ci:local -- --full` on that exact commit. A release can use the tarball from a clean build of the approved tag, with its checksum and versioned release notes.

## Entry points

| Import | Contents |
|---|---|
| `@litegraph/litegraph` | Graph classes and the standard node catalog |
| `@litegraph/litegraph/core` | Graph classes only, initialized and ready for registration |
| `@litegraph/litegraph/node` | Adds Node-only nodes (`sys`, `process`, `network`); CommonJS under both import styles |
| `build/litegraph.js` | Browser bundle |

All three package entries support ESM and CommonJS (`moduleResolution: "NodeNext"`). Prefer named imports: the historical ESM default export is `LibraryManager`.

Importing directly from `src/` requires initialization after the classes load (`src/init_litegraph.js`). Bundles initialize themselves.

```js
import { LiteGraph, LGraph } from '@litegraph/litegraph';
const graph = new LGraph();
graph.add(LiteGraph.createNode('basic/const'));
await graph.whenReady();
graph.runStep();
```

**Versions:** `LiteGraph.VERSION` equals the package version (`0.18.0-dev.2`); `build.py --update-version` keeps them in step. Identify development builds by branch and commit. A release needs an explicit version decision.

**Scripts:** `LiteGraph.allow_scripts` is off in every bundle (since Wave 5a no library build includes editor defaults; `check:build` enforces it). The editor app turns it on for its own pages; the runner keeps it off unless `RUNNER_ALLOW_SCRIPTS=1`.

## Contracts

### Initialization

- `createNode()` is synchronous.
- Each node exposes `ready` (a Promise), `initialization_state` (`loading`, `ready` or `error`) and `initialization_error`.
- Libraries listed in a node's `libraries` / `requiredLibraries` load before `onPostConstruct`. `onAdded` and `configure` must not assume they are loaded.
- `graph.whenReady()` waits for every node, including nodes in nested subgraphs.
- `startAsync()` resolves `true` once the graph has started, or `false` if `stop()` or `clear()` cancelled the start.
- A dependency failure rejects startup.
- `runStep()` skips nodes that are still loading or have failed.

### Execution

- `runStep(n)` advances `iteration` once per cycle.
- **Actions:** deferred actions drain through `actionDo`. Actions queued while a node is draining its queue run in the next cycle.
- **ON_REQUEST:** ancestors refresh in dependency order. An optional guard breaks synchronous event cycles.
- **Errors:** an error stops the graph. `LiteGraph.throw_errors` decides whether it propagates.

### Cleanup

- `stop()`, `clear()` and `remove()` start cleanup immediately.
- `stopAsync()`, `clearAsync()`, `removeAsync()` and `whenIdle()` also wait for cleanup hooks that return a Promise.
- Cleanup continues past hooks that throw. One error is rethrown; several are combined into an `AggregateError`.

### Edits and undo

- Wrap user edits in `graph.transact(label, fn)`, so that each one is one undo step.
- `beforeChange` / `afterChange` are hooks only.

### Platform

Introduced in Wave 1:
- **Registries:** `LiteGraph.commands`, `keybindings`, `settings` and `menus`.
- **Extensions:** `LiteGraph.registerExtension` (with disposal).
- **Widgets:** `LiteGraph.registerWidgetType`.
- **Node definitions:** `static def`, `getNodeDefinition`, `declareCapabilities`.
- **Libraries:** `describeLibraries()` and `probeLibraries()`.

[CHANGES.md](../CHANGES.md) lists them.

## Graph runner

`apps/runner` (formerly `headless/graphrunner`) executes graphs pushed from its browser page. Each graph runs in its own worker. The runner binds to loopback by default. Settings are in `.env.example`: `WORKFLOWS_DIR`, `RUNNER_ALLOWED_HOSTS`, `RUNNER_DENY_TYPES`, `RUNNER_ALLOW_SYS`.

**Security:**
- **Connections:** the WebSocket accepts only same-origin pages and the runner's own host names.
- **Node types:** workflows containing shell, file-write, process or service, or remote-library nodes are refused at any subgraph depth (`nodePolicy.js`).
- **Scripts:** script evaluation is off.
- **Documents:** every workflow is validated before it is built (`LiteGraph.validateGraphData`, strict): oversized or malformed workflows are refused with a report, and runtime-only fields are dropped.
- **Trusted use:** `RUNNER_ALLOW_SYS=1` lifts the node-type and script restrictions.
- **Not covered:** there is no authentication. Treat workflows as trusted programs. Decision D1 in the [roadmap](../agents/plans/roadmap.md) covers stricter defaults.

Requests have the form `{type, data, requestId?}`. Replies echo `requestId`.

| Request | Payload | Response |
|---|---|---|
| `open_graph` | `file` | `graph_opened` |
| `control_graph` | `graphId`, `action`: start / stop / status / clear. A stop may include `dropQueued: true`. | `graph_status` |
| `update_graph` | `graphId`, `serializedGraph` | `graph_updated` |
| `request_sync` | `graphId` | `graph_sync` |
| `unload_graph` | `graphId` | `graph_status: unloaded` |
| `get_active_graphs` / `stop_all_graphs` | — | `active_graphs` |

Broadcasts, without a request: `graph_status`, `active_graphs`, `console {graphId, level, message}`, and `execution_state {graphId, message}`. The message is the shared execution-state shape (`LiteGraph.ExecutionState`, protocol `v: 1`): `{v, kind: status | progress | error | reset, path, status, value?, max?, message?, time}`, one per change of a node's state; `path` is the node's path ("3:7" inside a subgraph). An editor applies one with `graph.applyExecutionState(message)`; the runner page does so for the open workflow and keeps the states per workflow (`apps/runner/public/execution-view-state.js`), so a tab switch redraws them. Nodes run by actions or pulls send `running` then `done`.

An ordinary stop retains deferred actions. A stop with `dropQueued: true` removes actions already queued in the graph and its nested instances, even if the graph is already stopped. It keeps the loaded document and node state.

A failed request answers `{type: "error", data: {message, report?}, requestId}`. `report` is present when the validated loader refused the workflow (`open_graph`, `update_graph`): every workflow is checked by `LiteGraph.validateGraphData` in strict mode, with the node-type policy as its type hook, before it is built. The report lists each issue with its `code`, JSON `path` and `message`; the limits are the `LiteGraph.Loader.*` settings ([guide](guide.md#untrusted-documents)).

Edits are applied in memory only; nothing is written back to the workflow file.

## Editor and tester

| Page | Notes |
|---|---|
| `apps/editor/index.html` | Loads `src/` modules without the extensions |
| `apps/editor/editor_build.html` | Loads the built bundle with extensions, commands and key bindings |
| `apps/tester/` | Generates per-node scenarios, with optional performance and stress runs. Coverage counts node types, not code |
