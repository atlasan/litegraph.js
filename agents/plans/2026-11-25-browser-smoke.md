# Browser smoke test of the built bundles (USE-09)

> **Date** 2026-11-25 · **Kind** plan · **Status** done · **Base** `LG/dev` @ `a1eb082`

A scripted headless run of `apps/editor/editor_build.html` that fails on any page error or failed interaction, run by `npm run check` (and so by `npm run ci:local`). Interactive behaviour (dragging, reroutes, search focus, undo) has so far been checked only by hand, and the canvas split (Tier 2, step 9 of the [next-priorities plan](2026-11-25-next-priorities-after-0.18.0-dev.2.md)) needs this test first.

## Context

- Idea USE-09 in the [catalog](../ideas/catalog.md); Tier 1 step 3 of the [next-priorities plan](2026-11-25-next-priorities-after-0.18.0-dev.2.md#execution-tracks-dependencies-and-coordination), track `LG/dev_browser_smoke`.
- `apps/editor/editor_build.html` is the page with the extensions, commands and key bindings (see the gotcha in `AGENTS.md`). Its editor runs on the `src/` modules; it also loads `build/litegraph.js`. Both share one global `LiteGraph` object (`src/litegraph.js` stores the instance on `globalThis`).
- The editor server (`apps/editor/server.js`) exports `createEditorApp()`, so a test can serve the page on a free port in-process.
- The Jest tests run in jsdom, which has no 2D context and no layout. They cannot check pointer hit testing, focus or the DOM menus.
- This machine has Firefox 141 as a snap (with `geckodriver`) and a Playwright Chromium in `~/.cache/ms-playwright`. No Chrome or Chromium is on the PATH.

## Choosing the browser driver

| Option | Install | Browsers | Trade-offs |
|---|---|---|---|
| **Raw WebDriver BiDi to Firefox (chosen)** | none: Node 22's built-in `WebSocket` and the system Firefox | Firefox (any build since about 129; BiDi is on by default) | About 250 lines of our own (`tools/browser/firefox-bidi.mjs`). Firefox only: Chrome speaks BiDi only through chromedriver or a mapper. The BiDi commands used (`session.new`, `browsingContext.*`, `script.evaluate`, `input.performActions`, `log`/`network` events, `browser.close`) are in the W3C spec and stable in Firefox. |
| puppeteer-core with `browser: 'firefox'` | one dev dependency with about 10 transitive ones (`chromium-bidi`, `ws`, `devtools-protocol`, `debug`, ...) | the system Firefox or Chrome | A richer API, but a fast-moving dependency tree to vet (the two-week and changelog rule each upgrade) for the handful of commands we need. |
| playwright-core | one dev dependency | only Playwright's own patched builds (a 100–300 MB download per browser and version) | A browser download is an install the user must approve, and the clean-clone CI would depend on a cache outside the repository. |
| selenium-webdriver with geckodriver | a dev dependency and a driver binary | Firefox, Chrome | WebDriver classic over HTTP plus BiDi; more pieces for the same result. |

**Recommendation, taken:** raw BiDi to the system Firefox. No new dependency, nothing downloaded, and the test still covers real pointer and key input (BiDi input actions are dispatched as native events). If Chrome coverage is wanted later, chromedriver (BiDi through `webSocketUrl: true`) can sit behind the same small client.

**Snap Firefox:** a confined snap cannot see the host's `/tmp`, so the profile goes under `~/snap/firefox/common/lg-browser-smoke-*`. It is removed after the run. Under some confinement setups the caller may not signal the snap (seen here from the agent's shell: `kill` gets "Permission denied"), so the client ends Firefox with BiDi `browser.close` first and uses signals only as a fallback. Startup takes about 7 s.

## Where it runs

- `npm run check:browser` (`node tools/browser/smoke.mjs`, `--verbose` for page logs).
- Last step of `npm run check`, so `bun run check` and the `check` step of `npm run ci:local` run it. It ran reliably in clean clones here (repeated and parallel runs), so it is **required**, not behind an opt-in `--browser` flag.
- No Firefox: it prints `browser smoke: skipped: <why>` and exits 0, so the gate stays usable. `LG_BROWSER_SMOKE=require` turns that into a failure; `LG_BROWSER_SMOKE=0` skips; `LG_FIREFOX` picks the executable (a wrong path fails).
- `tools/ci` parses the result line into the report: `browser 9/9`, `browser skip` or `browser FAIL n/m` in the `Local-CI:` summary, and a detail in `report.md`. Logs from older commits without the line show no browser token.

## Scope

- In: the BiDi client, the smoke test, the `check:browser` script, the CI summary, unit tests for the plumbing, docs.
- Out: Chrome support; screenshots and visual diffs; more pages (the tester, the mobile page); fixing the findings below (separate work).

## Steps

| # | Step | Acceptance check |
|---|---|---|
| 1 | This plan with its index row | the row in [plans/README](README.md) |
| 2 | `tools/browser/firefox-bidi.mjs` and `tools/browser/smoke.mjs`: load the page; the built bundles in a blank tab; create two nodes and link them by dragging; drag a node; add a reroute from the link menu and drag it; open the search box with a double click, check the input has the focus, type, insert with Enter; undo with Ctrl+Z five times, each back to the previous state | `npm run check:browser` passes 9/9; a broken `Reroute.move` makes it fail; no Firefox makes it skip |
| 3 | `check:browser` in `npm run check`; the browser count in the local CI summary; tests (`tools/tests/browser-smoke.test.mjs`, `ci.test.mjs`) | `bun run check`, `npm run ci:local -- HEAD` |
| 4 | Docs: `docs/development.md` (commands, local CI), `CHANGES.md`, the roadmap and the USE-09 catalog row | read through |

## Risks and open questions

- Firefox updates may change timings: the test waits on page conditions, not fixed sleeps, except two documented pauses (the 250 ms search refresh and a pause longer than the 300 ms double-click window).
- The editor page sets `LiteGraph.actionHistory_enabled = false`; the test turns it on to test Ctrl+Z. The page default is unchanged.
- **Findings for later work** (recorded in the execution record): importing `build/litegraph.full.js` into the editor page registers its nodes into the shared `LiteGraph` and, with the editor's `auto_load_slot_types`, instantiates every type, so the MIDI nodes request WebMIDI access (a console error in Firefox, a permission prompt in Chrome). Also, a canvas press within 300 ms and 6 px of the previous canvas click counts as a double click even when a DOM menu was clicked in between; on a fresh reroute that removes it.

## History

- 2026-11-25: proposed and accepted in the track session (driver chosen by the recommendation above).
- 2026-11-27: done on `LG/dev_browser_smoke`; see the [execution record](../executions/2026-11-25-browser-smoke.md).
