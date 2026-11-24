# Launcher and Bun commands

> **Date** 2026-11-23 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `ce8c231` · **Plan** [launcher and Bun](../plans/2026-11-23-launcher-and-bun.md)

`lg.sh` and `lg.bat` now start, stop, inspect and open the apps on Bun or Node through one dependency-free helper (`tools/lg/`), with a coloured menu when run without arguments. Both apps already ran under Bun 1.4.4. One library gap surfaced: node types declared `runtime = "node"` were disabled under Bun ("cannot run in bun"), which broke the runner's Node-only nodes there. A `"node"` declaration now also matches Bun. The editor server serves `/docs` and starts from any working directory. Intake of the user's 2026-11-23 findings (step 1) was merged first, as `ce8c231`.

## Changes

- `b21708e` `docs:` intake: `LCH` and `GRP` ideas, area documents, card LCH-01, this plan (branch `LG/dev_HMD_launcher_intake`, merged as `ce8c231`).
- `d92f2f7` `feat:` launcher (`lg.sh`, `lg.bat`, `tools/lg/{lg,core,state,term}.mjs`), `.lg/` ignored, `.gitattributes` (CRLF for `.bat`, LF for `lg.sh`), npm scripts `lg`, `editor:bun`, `graphrunner:bun`; editor server `/docs` and root-relative paths (`createEditorApp`); `LGraphNode.runtimeMatches` (`"node"` matches Bun); tests `tools/tests/launcher.test.mjs` (9) and one Jest case.
- `e64fa1d` `build:` regenerate distributions (`runtimeMatches`).
- This `docs:` commit: getting-started launcher section, README, `CHANGES.md` (Unreleased), roadmap, codebase map, this record.

## Design as built

| Piece | Behaviour |
|---|---|
| Wrappers | `LG_RUNTIME` (bun or node), else `bun`, else `node` on PATH; otherwise install hints and exit 127; an invalid `LG_RUNTIME` exits 2. No Python fallback (user decision). |
| Commands | `start`, `stop`, `restart` (`[editor\|runner\|tester\|docs\|all]`, pages map to the editor server), `status [--json]`, `open <app>` (starts the server when needed), `logs <app> [-n N]`, `info [--json]`, `help`, `version`; aliases `up`, `down`, `st`; usage errors exit 2. |
| Menu | Only on a TTY (stdin and stdout); otherwise help and status. Two-column keys, loop until `q`, Ctrl+D quits; servers keep running after quit. |
| Processes | Detached spawn on the chosen runtime (the launcher's own unless `--runtime` / `LG_RUNTIME`), cwd = repository root, output appended to `.lg/logs/<app>.log`; record `.lg/run/<app>.json` (pid, port, runtime, version, start time); ready when the health path answers (< 500) within `LG_START_TIMEOUT` (20 s), else the log tail is shown and the process is killed. Stop: SIGTERM to the process group, SIGKILL after 5 s; `taskkill /T` on Windows. |
| Status | `running` (live pid, answering), `starting` (live pid, not answering), `other process` (port answers but no live record: refused by `start`, not touched by `stop`), `stopped`; a dead pid's record is removed. |
| Ports | 8000 / 3000; `.lg/config.json` `ports`; `LG_EDITOR_PORT` / `LG_RUNNER_PORT`; a busy port is refused with the setting that changes it. |
| Terminal | Colour: `--color`/`--no-color`, `NO_COLOR`, `FORCE_COLOR`, `TERM=dumb`, TTY. Unicode symbols except on the Linux console and classic Windows consoles (`WT_SESSION`, `TERM_PROGRAM` enable them; `LG_ASCII` forces ASCII). Closed pipes (`lg status \| head`) end quietly. |
| Runner | Same environment as the caller plus `PORT`, `HOST` (127.0.0.1 unless set) and `LOG_FILE` in `.lg/logs/`; Origin/Host checks, `nodePolicy.js` and the script lockdown are untouched. |

## Verification

| Check | Result |
|---|---|
| `npm run check` | pass: 52 Jest suites, 934 tests; 134 node:test tests (21 files); 12 builds; types; package check |
| `node --test tools/tests/launcher.test.mjs` (Node 22.23.4) | 9 pass |
| `bun test tools/tests/launcher.test.mjs` (Bun 1.4.4) | 9 pass |
| `bun test` on each `tools/tests/*.test.mjs` | 133 pass, 1 fail: `library-manager` "browser module loading waits for evaluation", a simulated browser `import()` of a `data:` module with top-level await, which Bun resolves before evaluation finishes. Not on any app path; left open. Before the `runtimeMatches` fix, `runner.test.mjs` failed 2 of 6 under Bun ("Node sys/fileRead cannot run in bun"); now 6 of 6. |
| `lg.sh` selection | test: PATH with only this runtime → that runtime; no runtime → 127 with hints; `LG_RUNTIME=<missing>` → 127; `LG_RUNTIME=deno` → 2 |
| Integration (Node and Bun) | `start editor` on a free port → `running`; `/editor/editor_build.html`, `/apps/tester/index.html`, `/docs/getting-started.md`, `/build/litegraph.js` → 200; `open docs` reuses the server; a second state folder refuses the busy port naming `LG_EDITOR_PORT`; `stop` kills the pid and frees the port |
| Manual, Bun | `./lg.sh start` (editor and runner on Bun), `status`, `/docs/api/index.html` 200, `stop` from a Node launcher (shared state); a runner on Bun refused a foreign Host with 403 and printed its policy |
| Manual, menu in a PTY (`script`) | Bun: unknown choice warns, `q` quits; Node (`LG_RUNTIME=node`): `1` starts both, `2` stops both |
| Editor server from another working directory (`/tmp`) | `/editor/editor_build.html` and `/docs/api/index.html` 200 |

## Left open

- **Windows not run:** `lg.bat`, `taskkill`, `rundll32` browser opening and Unicode detection are written to documented behaviour but untested here (Linux only).
- **macOS not run:** `open` for the browser.
- **`npm run editor` (nodemon) in this worktree** hit the machine's inotify limit (it watches the symlinked `node_modules`); the server it runs was checked directly. Unrelated to this change.
- **Bun:** the `library-manager` `data:` import difference above; the Jest suites were not run under Bun.
- Ideas not built: LCH-04 `doctor`, LCH-06 single binary, LCH-07 profiles, LCH-08 completions, LCH-09 watch mode, `logs --follow`.
- Candidates C-1 to C-5 of the plan (groups and reroutes, group UI, ComfyUI custom nodes survey, compatibility charter, concept docs).
