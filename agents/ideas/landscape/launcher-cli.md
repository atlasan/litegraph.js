# Launcher and command line

> **Updated** 2026-11-23 · **Kind** idea area · **Status** living

Ideas `LCH-01`–`LCH-09`. Source: the user's findings of 2026-11-23 (`agents/human_feed/261123_findings_and_ideas.txt`), item 1. The design is in [card LCH-01](../cards/LCH-01-cross-os-launcher.md); the accepted work is the [launcher and Bun plan](../../plans/2026-11-23-launcher-and-bun.md).

**Question:** how does someone who just cloned the repository start, stop and inspect the apps (editor, tester, runner, docs) on Linux, macOS and Windows, with Bun when it is installed and Node otherwise, without learning the npm scripts?

## Where the repository is today

These facts are from `LG/dev` @ `bb9af60`:
- **Scripts:** `npm run editor` (nodemon, `apps/editor/server.js`, port 8000), `npm run graphrunner` (nodemon, `apps/runner/server/index.js`, port 3000), `npm start` runs both with `concurrently`.
- **Process control:** none. A server runs in the foreground of its terminal; there is no status, no stop from another terminal and no record of the port in use.
- **Bun:** not mentioned in the scripts. Probe on 2026-11-23 with Bun 1.4.4: `bun apps/editor/server.js` serves the editor, and `bun apps/runner/server/index.js` starts the runner, prints its policy and still refuses a foreign Host header (403). Nothing had to change.
- **Docs:** `docs/` is not served; the generated API is opened as a file.

## What others do [I]

- **Single entry scripts** (`./gradlew`, `./mvnw`, `bin/rails`, `./x.py` in Rust): a checked-in wrapper finds or bootstraps the toolchain, then hands over to one implementation. The wrapper stays tiny; all logic lives in one place.
- **Process managers** (pm2, foreman/overmind, `docker compose`): named processes, pid or socket state, `status` with health, `logs`, `restart`. The launcher needs only the small part: pid files and a health URL per app.
- **Interactive menus** (create-vite, `npm init` wizards): a numbered or arrow-key menu when run without arguments, with a non-interactive form of every action for scripts and CI.

## Ideas

| ID | Idea | Notes |
|---|---|---|
| LCH-01 | Cross-OS launcher: `lg.sh` and `lg.bat` call one JS helper (`tools/lg/`) on Bun, else Node; commands `start`, `stop`, `restart`, `status`, `info`, `open`, `logs`, and a menu without arguments | Card; promoted to the plan |
| LCH-02 | Process state: a pid and port record per app, a health check over HTTP, a log file per app, all under a git-ignored state folder | Part of LCH-01 |
| LCH-03 | Bun as an optional runtime for the apps: the launcher starts them on its own runtime, `--runtime` and `LG_RUNTIME` override; Node stays the default of the npm scripts | Links BUN-16 (runtime adapter) |
| LCH-04 | `lg doctor`: runtimes and versions, `node_modules`, free ports, build freshness (`check:fresh`), runner opt-ins in effect | Seed |
| LCH-05 | `lg logs <app> [--follow]` | Part of LCH-01 (without `--follow`) |
| LCH-06 | The launcher as a single executable (`bun build --compile`) | Links BUN-15 |
| LCH-07 | Launcher profiles: which apps, ports and runner opt-ins (`RUNNER_ALLOW_TYPES`, …) per named profile, kept in a local config file | Seed |
| LCH-08 | Shell completions for bash, zsh, fish and PowerShell | Seed |
| LCH-09 | Watch mode in the launcher (`node --watch` / `bun --watch`) to replace nodemon for the apps | Seed |
