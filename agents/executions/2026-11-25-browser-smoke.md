# Browser smoke test of the built bundles (USE-09)

> **Date** 2026-11-27 · **Kind** execution · **Status** final · **Base** `LG/dev_browser_smoke` @ `c5dfb77` (from `LG/dev` @ `a1eb082`) · **Plan** [Browser smoke test](../plans/2026-11-25-browser-smoke.md)

Added a headless browser run of `apps/editor/editor_build.html` with real pointer and key input. It is the last step of `npm run check` and runs in the local CI's `check` step. The driver is a minimal WebDriver BiDi client to the system Firefox, so there is no new dependency and nothing to download. Without Firefox the test skips with a message, so the gate stays usable. The record is dated by the plan (2026-11-25); the work finished on 2026-11-27, after a usage-limit pause.

## Changes

- `1405d0e` `docs:` the plan (driver choice and trade-offs) and its index row.
- `c5dfb77` `feat:`
  - `tools/browser/firefox-bidi.mjs`: finds Firefox (`LG_FIREFOX`, the `PATH`, the usual install places) and detects the snap. It starts Firefox headless on a throwaway profile (under `~/snap/firefox/common/` for the snap) with quiet preferences, picks a free port for BiDi, runs a session, and closes with `browser.close` before signals.
  - `tools/browser/smoke.mjs`: 9 checked steps (see the plan); any uncaught error, `console.error` or failed same-origin request fails the step. Settings: `LG_BROWSER_SMOKE=0|require`, `LG_FIREFOX`, `--verbose`.
  - `package.json`: `check:browser`, appended to `check`.
  - `tools/ci`: `parseBrowser`. The summary shows `browser N/N`, `browser skip` or `browser FAIL n/m`, and `report.md` gives the detail. Older logs have no token.
  - Tests: `tools/tests/browser-smoke.test.mjs` (finding Firefox, the snap rule, skip, require, a wrong `LG_FIREFOX`) and parser and summary cases in `tools/tests/ci.test.mjs`.
  - Docs: `docs/development.md` (commands table, a "Browser smoke test" section, the local CI `check` step and summary), `CHANGES.md` (Unreleased, Added), the roadmap Tier 1 row, the USE-09 catalog row (promoted) and the codebase map (`tools/browser/`).
- No `src/` change, so no `build:` commit; `build/` stayed fresh.

**Dependencies:** none added. The client uses Node 22's built-in `WebSocket` (stable since Node 22.4) and the W3C WebDriver BiDi commands that Firefox ships. There was no changelog to read; the alternatives weighed (puppeteer-core, playwright-core, selenium-webdriver) are in the plan.

## Verification

| Check | Result |
|---|---|
| `npm run check:browser` | 9/9 on Firefox 141.0 (snap); about 7 s to start Firefox, about 5 s for the steps |
| Repeated and parallel runs | 5 in a row, then 3 at once: all 9/9. No Firefox process or profile directory left behind |
| The test catches a regression | `Reroute.move` turned into a no-op: `FAIL - drag the reroute: reroute at [430,240], expected [390,350]`, 6/9, exit 1 (the change was reverted) |
| No browser | `PATH` without Firefox: `browser smoke: skipped: no Firefox found on PATH ...`, exit 0. With `LG_BROWSER_SMOKE=require`, or with `LG_FIREFOX` set to a missing file: FAIL, exit 1 |
| `node --test` and `bun test` of `tools/tests/browser-smoke.test.mjs` | 4/4 on both |
| `bun run check` | pass: lint, 12 builds, types, Jest 1016/1016 in 60 suites, integration 164/164, package check, browser smoke 9/9 |
| `npm run ci:local -- HEAD` | `Local-CI: pass c5dfb77 node22.23.5 jest 1016/1016 int 164/164 browser 9/9 fresh ok` (run `c5dfb77-20261127T082556Z`; `report.md`: "browser smoke 9/9 on firefox 141.0" in the `check` step) |

## Findings

Found while writing the test, not fixed here:

1. **The full bundle and the shared `LiteGraph`:** `src/litegraph.js` keeps one `LiteGraph` on `globalThis`. Importing `build/litegraph.full.js` into the editor page therefore registers its node types into the editor's instance. The editor's `auto_load_slot_types = true` then instantiates every type, and the MIDI nodes call `navigator.requestMIDIAccess()`. Firefox logs `Failed to get MIDI access - SecurityError` (WebMIDI needs a site-permission add-on there); Chrome would show a permission prompt. The test now checks the bundles in a blank tab of their own. Two follow-ups are open: MIDI access could wait until the node runs, and two LiteGraph copies on one page could warn.
2. **Double click across a DOM menu:** `CanvasPointer` counts a canvas press within 300 ms and 6 px of the previous canvas click as a double click, even when a DOM menu was clicked in between. The reroute from "Add Reroute" appears where the link center was clicked, so pressing it quickly removes it again (a double click on a reroute removes it). The test pauses longer than the window. A fix could reset the last click when the pointer leaves the canvas, or when a menu opens.
3. **Search box Enter before the refresh:** the result list refreshes 250 ms after the last key, and Enter takes the current first result. Typing fast and pressing Enter can therefore insert a result for the earlier text (the first version of the test read `MAX` after typing `w`). The test waits for the refresh.
4. **Environment:** from the agent's shell (AppArmor label `claude-desktop`), the snap Firefox refuses signals (`kill: Permission denied`). A stuck Firefox can only be closed through BiDi or by the user. One probe instance from the first attempt (started with a `/tmp` profile and `--remote-debugging-port=0`, which never started BiDi) could not be stopped from here; the user can end it with `pkill -f 'profile /tmp/tmp.Kcxt5qyxtj'`. The test always uses a profile the snap can see and a fixed free port.

## Left open

- Chrome or Chromium coverage (chromedriver BiDi behind the same client), and more pages (the tester, the mobile preset).
- Findings 1–3 as candidate fixes. The canvas split (Tier 2, step 9) can now rely on this test.
- The GitHub workflow runs `npm run check` too, so the test would run there (ubuntu-latest ships Firefox) once the workflow is switched on. It has not been tried, because GitHub CI stays off.
