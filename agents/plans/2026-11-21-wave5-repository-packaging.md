# Wave 5: repository organization and packaging

> **Date** 2026-11-21 · **Kind** plan · **Status** accepted · **Base** `LG/dev` @ `5466b92`

**Outcome:** the package says truthfully what it needs and what it exposes, CI proves that the committed builds are fresh, the docs let a tester start, and the editor, tester and runner apps live in `apps/`. This is the last wave before the [pre-release 0.18.0-dev.1](2026-11-20-pre-release-0.18.0-dev.1.md).

## Context

The sources are the [11-18 repository review](2026-11-18-repo-review-and-roadmap.md) (phases 2 and 5) and the [workspace plan](2026-11-01-workspace-structure-and-memory.md). Wave 4 (4b–4e) runs in parallel in its own session.

**What the 2026-11-21 inventory found:**
- **Runtime `dependencies`** has 19 entries. Five are squatted npm placeholders: `fs`, `http`, `path`, `vm` and `child_process`. The code requires the Node built-ins of those names, which resolve first.
  - Unused: `osc` (`osc-js` is the one in use) and `uglifyjs`.
  - App-only: `dotenv` and `winston` (runner).
  - Used by node types of the Node bundle:
    - sys nodes: `chalk`, `diskusage`, `node-os-utils`, `node-windows`, `ps-list`;
    - network nodes: `osc-js`, `socket.io`, `socket.io-client`, `ws`;
    - LibraryManager: `node-fetch`.
  - `js-beautify` moved to `devDependencies` with D7.
- **Exports** have the `./build/*` and `./build_node/*` wildcards.
- **`build.py`** puts `editor/js/defaults_debug.js` into the full builds.
- **CI** (`.github/workflows/validate.yml`) runs `npm run check` but does not check that `build/` is fresh.
- **Apps:**
  - editor shell: `editor/` and the `editor.js` dev server;
  - tester: `editor_tester/`;
  - runner: `headless/graphrunner/`.

## Decisions (user, 2026-11-21)

| ID | Decision |
|---|---|
| W5-1 | **Explicit exports list.** Keep `.`, `./core`, `./node`, `./css/*` and `./package.json`, and list each current artifact path explicitly. No wildcards. The sys nodes stay in the Node bundle, where the runner denylist guards them |
| W5-2 | **Optional integrations.** Remove the placeholders, `osc` and `uglifyjs`. The integrations used by node types become `optionalDependencies`, and a missing one is reported by name. App-only packages become `devDependencies`. The library itself needs nothing |
| W5-3 | **Old URLs keep working.** After the move to `apps/`, the dev servers map `/editor/…` and the old runner and tester paths to the new homes. `npm run editor`, `graphrunner` and `start` are unchanged |

## Steps

| # | Part | Step | Acceptance check |
|---|---|---|---|
| 1 | 5a | Dependencies per W5-2. Every `require` of an optional integration is lazy or guarded, and a node that needs a missing package reports which one and how to install it | `npm pack --dry-run` manifest; `npm ls`; integration tests that run without the optional packages (module resolution stubbed); `npm run check` |
| 2 | 5a | Exports per W5-1; `check:build` checks the map against the artifacts | `check:build` fails on an unlisted artifact or a wildcard; ESM/CJS consumer test |
| 3 | 5a | Library builds without `defaults_debug.js`. The editor page still gets its defaults (the app loads them) | `grep` on `build/` is empty; editor in the browser |
| 4 | 5b | CI: `npm run build` followed by `git diff --exit-code build build_node`, also as `npm run check:fresh` | The workflow runs it; a stale build fails it locally |
| 5 | 5b | Docs: README rewrite (install, the ESM/CJS entries, editor and runner quick start, links), `docs/getting-started.md`, `docs/architecture.md` (modules, graph/canvas/runtime, subgraphs, packs, extensions) | Links checked; the commands in the docs work |
| 6 | 5c | After Wave 4 lands: move the apps to `apps/editor`, `apps/tester` and `apps/runner` (one commit each); one app defaults module; one tester controller (`app.js` and `ui-manager.js` merged); old URLs mapped (W5-3) | Each app starts; browser checks of the editor and tester; runner integration tests; `npm run check` |

## Risks

- **Moving files under parallel work:** step 6 waits until 4e is merged into `LG/dev`.
- **Optional dependencies:** a consumer who relied on transitive installs of `socket.io` and the like now has to install them. `CHANGES.md` lists them, and the node reports name the package.

## History

- 2026-11-21: proposed and accepted. The user answered W5-1 to W5-3 as recommended.
