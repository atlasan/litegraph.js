# LCH-01: Cross-OS launcher

| Field | Value |
|---|---|
| Purpose | P10 Host and editor (see [purposes](../purposes.md)); also P9 Education (a first run without npm knowledge) |
| Kind | app |
| Area | [Launcher and command line](../landscape/launcher-cli.md) |
| Inspiration | Wrapper scripts (`./gradlew`, `./x.py`), pm2 and foreman (named processes, state, logs), create-vite (menus) |
| License of the inspiration | Concepts only; no code reuse |
| Effort | M |
| Maturity | promoted ([plan](../../plans/2026-11-23-launcher-and-bun.md)) |
| Depends on | Nothing; LCH-03 (Bun runtime) and BUN-16 (runtime adapter) build on it |
| Last reviewed | 2026-11-23 |

## Why

Starting the apps needs `npm install`, then one terminal per `npm run …` script, and nothing tells you what is running, on which port, or how to stop it from another terminal. The user asked for one friendly entry point on every OS, preferring Bun when it is installed (finding 1 of 2026-11-23).

## What it would look like here

```
lg.sh / lg.bat            thin wrappers: LG_RUNTIME, else bun, else node, else install hints
  └─ tools/lg/lg.mjs      one helper, runs on Bun and Node, no dependencies
       ├─ core.mjs        arguments, runtime choice, config (ports), app table
       ├─ state.mjs       state folder, pid records, alive and health checks, spawn and stop
       └─ term.mjs        colours (off without a TTY, NO_COLOR, --no-color), menu
.lg/                      git-ignored: run/<app>.json, logs/<app>.log, config.json (optional)
```

- **Commands:** `start [app|all]`, `stop [app|all]`, `restart [app|all]`, `status [--json]`, `info`, `open <editor|tester|runner|docs>`, `logs <app>`, `help`. Without arguments on a terminal: a menu that loops until quit. Without a terminal: help and status.
- **Apps:** `editor` (`apps/editor/server.js`, port 8000; also serves the tester and `/docs`), `runner` (`apps/runner/server/index.js`, port 3000). `tester` and `docs` are pages of the editor server.
- **Runtime of the apps:** the launcher's own runtime; `--runtime node|bun` or `LG_RUNTIME` overrides it. The npm scripts keep Node.
- **Ports:** defaults, then `.lg/config.json`, then `LG_EDITOR_PORT` / `LG_RUNNER_PORT`. A busy port is refused with the setting that changes it.
- **Security:** the runner starts with the same environment rules as `npm run graphrunner`; the launcher adds no opt-in.

## Prior art

- Gradle and Maven wrappers keep the shell part tiny and put the logic in one implementation [I].
- pm2 keeps a pid, a log and a status per named process; overmind and foreman read a process table [I].

## Open questions

- Should `open` start a stopped server, or ask first? (Plan: start it, and say so.)
- A Python fallback was declined by the user (2026-11-23): without Bun or Node the wrappers print install hints.

## Smallest experiment

Done on 2026-11-23: both apps run under `bun` 1.4.4 without changes (see the [area document](../landscape/launcher-cli.md)).

## History

- 2026-11-23: created from the user's findings; promoted to the [launcher and Bun plan](../../plans/2026-11-23-launcher-and-bun.md).
