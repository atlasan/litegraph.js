# Wave 5c: apps move

> **Date** 2026-11-22 · **Kind** execution · **Status** final · **Base** `LG/wave5c_apps` @ `3a48cd7` · **Plan** [Wave 5](../plans/2026-11-21-wave5-repository-packaging.md)

The editor, tester and runner moved into `apps/`, after Wave 4 had landed in `LG/dev` (`c1bf356`). The old URLs and the old runner path keep working (W5-3). A security finding in the Wave 4 rename map was fixed first.

## Changes

- `42d7702` (merge of `LG/release_prefix_fix`) `fix:` old runner type prefixes keep their old meaning.
  - **The problem:** the Wave 4e catalog cleanup mapped `nodejs/network/` and `server/network/` to the whole new prefix `network/server/`. So `RUNNER_ALLOW_TYPES=nodejs/network/` also allowed the WebSocket server, which that prefix had never covered.
  - **The fix:** old prefixes now map to the exact types they covered (`RENAMED_PREFIXES`).
- `ad1a043` `feat:` the move:
  - **Paths:**
    - `editor/` → `apps/editor` (`editor.js` → `apps/editor/server.js`);
    - `editor_tester/` → `apps/tester`;
    - `headless/graphrunner` → `apps/runner`;
    - `editor/js/libs` → `vendor/`.
  - **Old addresses:**
    - The editor server serves `/editor/…` and `/editor_tester/…` as before.
    - Relative paths in the pages resolve from the old and the new URLs.
    - `headless/graphrunner/server/index.js` is a shim that calls `startRunner()`.
  - **The library no longer imports app code:**
    - The GL nodes import litegl from `vendor/`.
    - They use the global `gl` that `GL.create` sets, as the bundles already did.
  - **One editor defaults module:** `js/defaults.js?preset=debug|mobile|event_based` (`applyEditorPreset`) replaces the three copies.
  - **Tester:** the category helper is now one function, and dead code is removed.
  - **fix:** `web_console.js` imported `src/litegraph` without `.js`.
- `3a48cd7` `build:`.

## Verification

| Check | Result |
|---|---|
| `npm run check` | 557/557 Jest, 97/97 integration, 12 builds, exports and dependency checks |
| Servers | The editor server is started from `apps/editor/server.js`. The runner is started through the **old** path `headless/graphrunner/server/index.js` (the shim): it connects and lists the workflows |
| Pages (resources and failures) | <ul><li>`/editor/editor_build.html`, `/apps/editor/editor_build.html`: 61 resources, 0 failed, 264 node types, 7 extensions.</li><li>`/`, `/editor/index.html`, `/apps/editor/index.html`: 66 resources, 0 failed.</li><li>`/editor_tester/`, `/apps/tester/`: 0 failed.</li><li>`editor_debug.html`: 0 failed after the `web_console.js` fix</li></ul> |
| Presets | <ul><li>build: history off, deferred actions on, level -1.</li><li>debug: history on, deferred off, level 4, binding ancestors on.</li><li>mobile: pointer method `pointer`, level 2</li></ul> |
| Runner policy | `RUNNER_ALLOW_TYPES=nodejs/network/` allows `network/server/osc` and refuses `network/server/websocket` (test) |

## Left open

- **One tester controller** (`app.js` and `ui-manager.js`): this is deferred. The two classes run two different test flows:
  - `app.runTests` uses `testFramework` events with per-test rendering;
  - `UIManager` uses `TestRunner` and renders at the end of a run.
  Both write the same stat elements. Merging them changes how the tester behaves, so it needs its own plan and tests. This release only shares the category helper and drops dead code.
- **`editor_event_based.html` does not run**, on `master` either: it loads `src/` ES modules as classic scripts, and `external/jquery-1.6.2.min.js` is not in the repository. It is a legacy demo; to fix or remove later.
- **The editor app sets `allow_scripts = true`** for its pages (`code.js`), whatever the preset. That is an app choice, unchanged.
