# Launcher and Bun commands

> **Date** 2026-11-23 · **Kind** plan · **Status** accepted · **Base** `LG/dev` @ `bb9af60`

One command on every OS to start, stop, inspect and open the apps: `./lg.sh` and `lg.bat` run one dependency-free JS helper on Bun when it is installed, else on Node, with a coloured menu when called without arguments. The apps run on Bun as well as on Node. This is the user's priority finding of 2026-11-23; it is parallel work (a track, branch `LG/dev_HMD_launcher`), not a wave.

## Context

- **Today:** `npm run editor`, `npm run graphrunner` and `npm start` (nodemon, `concurrently`); no process state, no stop from another terminal, `docs/` not served. See the [codebase map](../memories/codebase/README.md) and the [launcher area](../ideas/landscape/launcher-cli.md).
- **Source:** the user's findings (`agents/human_feed/261123_findings_and_ideas.txt`), item 1. Ideas [LCH-01](../ideas/cards/LCH-01-cross-os-launcher.md) (card), LCH-02, LCH-03, LCH-05; related BUN-15, BUN-16.
- **Probe (2026-11-23, Bun 1.4.4):** `bun apps/editor/server.js` and `bun apps/runner/server/index.js` work unchanged; the runner keeps its Host check (403 for a foreign Host) and prints its policy.

## User decisions (2026-11-23)

| Question | Decision |
|---|---|
| Python fallback | **None.** Wrappers try `LG_RUNTIME`, Bun, Node, then print install hints. One implementation to maintain. |
| Runtime of the apps the launcher starts | **The launcher's own runtime**; `--runtime node|bun` and `LG_RUNTIME` override. npm scripts stay on Node. |
| `open docs` | **Serve `/docs` from the editor server** (read-only static) and open `/docs/api/index.html`. |
| Catalog areas | **New prefixes as needed, lean and documented:** `LCH` (launcher and command line) and `GRP` (groups, notes and reroutes). |

## Scope

- In:
  - `lg.sh`, `lg.bat`, `tools/lg/` (`lg.mjs`, `core.mjs`, `state.mjs`, `term.mjs`), git-ignored `.lg/`.
  - Commands `start`, `stop`, `restart`, `status [--json]`, `info`, `open <editor|tester|runner|docs>`, `logs <app>`, `help`, and the menu.
  - Editor server: paths resolved from the repository root (any working directory), `/docs` route.
  - npm scripts `lg`, `editor:bun`, `graphrunner:bun`.
  - node:test tests run under Node and Bun; docs, `CHANGES.md`, roadmap track row, codebase map, execution record.
- Out:
  - A Python helper (declined).
  - Watch mode, profiles, completions, `doctor`, single binary (LCH-04, LCH-06 to LCH-09).
  - Any change to the runner's security rules: Origin/Host checks, `nodePolicy.js`, script lockdown.

## Steps

| # | Step | Acceptance check |
|---|---|---|
| 1 | Intake: catalog rows `LCH-01`–`LCH-09`, `GRP-01`–`GRP-08`, two area documents, card LCH-01, this plan (branch `LG/dev_HMD_launcher_intake`) | Index rows present; merged into `LG/dev` with `--no-ff` |
| 2 | Helper core: argument parsing, runtime choice, config and ports, app table | node:test unit tests |
| 3 | State and processes: pid records, alive and health checks, detached spawn with a log file, stop (process group on POSIX, `taskkill /T` on Windows), stale records | node:test with short-lived processes only |
| 4 | Terminal: colours (TTY, `NO_COLOR`, `FORCE_COLOR`, `--no-color`), ASCII symbols on old Windows consoles, the menu | Unit tests for the colour rules; menu run by hand |
| 5 | Wrappers `lg.sh` and `lg.bat` | Test of `lg.sh` with a PATH holding only Node, and with no runtime |
| 6 | Editor server: repository-root paths, `/docs` | Integration test: start the editor on a free port through the launcher, fetch `/docs/`, stop it |
| 7 | Docs and records | getting-started, README, `CHANGES.md`, roadmap, codebase map, execution record |

Tests run with `node --test` (in `npm run test:integration`) and with Bun (`bun test`) when it is installed.

## Candidates for later plans (not in this plan)

From the same findings; each needs its own proposal and the user's choices:
- **C-1 ComfyUI groups and reroutes (finding 2):** GRP-01 title-only drag, GRP-07 reroute audit against ComfyUI documents. Branch `LG/dev_HMD_groups`.
- **C-2 Group UI (finding 3):** GRP-02 to GRP-06, GRP-08: nesting, bypass and disable (mode 4 caveat, D5), styling, comment blocks, drag and resize. Same branch or a sibling.
- **C-3 ComfyUI custom nodes deep dive (finding 2):** a survey of the custom node ecosystem for widget, node and UX ideas, as rows in the `CFY` area.
- **C-4 Compatibility charter (finding 4):** one short page that states the compatibility targets (legacy and modern LiteGraph, ComfyUI, WebGLStudio) and the rule "present the trade-off, the human decides", linked from `AGENTS.md`.
- **C-5 Concept docs from a visual programming survey (finding 5):** continue the landscape documents into modular concept pages (graph model, execution, groups, subgraphs, widgets) that say what each system does and what this fork takes.

## Risks and open questions

- **Windows:** `lg.bat`, `taskkill` and the browser opener cannot be run here (Linux only); they are written to the documented behaviour and need a check on Windows.
- **Pid reuse:** a record whose pid was reused by another process could be stopped by mistake; the launcher checks the pid and the port together before it reports `running`, and `stop` names the pid it kills.
- **Bun differences:** Bun has no permission model (BUN-01); running the runner on Bun changes nothing for its denylist, which is the only control on both runtimes.

## History

- 2026-11-23: proposed and accepted with the user's decisions above.
