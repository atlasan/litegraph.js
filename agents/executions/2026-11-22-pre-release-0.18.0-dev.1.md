# Pre-release 0.18.0-dev.1

> **Date** 2026-11-22 · **Kind** execution · **Status** final; push, PR and tag wait for the user · **Base** `LG/release_0.18.0-dev.1` @ `cf03d8b` · **Plan** [Pre-release 0.18.0-dev.1](../plans/2026-11-20-pre-release-0.18.0-dev.1.md)

The pre-release plan carried out: every planned wave is done, the release checks pass, and the version is `0.18.0-dev.1`.

## What went in since `master` (`18f5545`, Wave 3)

| Step | Record |
|---|---|
| D7: runtime advisories from 12 to 0 | [Wave 5a–5b](2026-11-21-wave5ab-packaging-ci-docs.md) |
| Loose ends: Ctrl+drag on a group title, the blueprint file picker | [Wave 5a–5b](2026-11-21-wave5ab-packaging-ci-docs.md) |
| Wave 4a–4e: packs, workspace state, links and view, layout and palette, catalog cleanup | [4a](2026-11-20-wave4a-packs.md) and the 4b–4e records (Wave 4 session) |
| Wave 5a: no required dependencies, explicit exports, no debug defaults in library builds | [Wave 5a–5b](2026-11-21-wave5ab-packaging-ci-docs.md) |
| Wave 5b: CI build-freshness check, getting-started and architecture docs | [Wave 5a–5b](2026-11-21-wave5ab-packaging-ci-docs.md) |
| Runner prefix fix (an old opt-in had been widened by 4e) and Wave 5c: apps move | [Wave 5c](2026-11-22-wave5c-apps-move.md) |
| `2060049` / `cf03d8b`: version `0.18.0-dev.1`; `CHANGES.md` collected under the release, with upgrade notes | this record |

## Release checks

| Check | Result |
|---|---|
| `npm run check` on the release branch | 557/557 Jest, 97/97 integration, 12 builds, strict types, exports and dependency checks |
| A clean clone of the release branch: `npm ci --ignore-scripts`, `npm run check`, `npm run check:fresh` | passed: 557/557 Jest, 97/97 integration, 12 builds; the committed builds match a fresh build (exit 0) |
| `npm pack`, installed into an empty project with `--omit=optional` | <ul><li>no dependencies installed;</li><li>ESM `.`, `/core` and a deep `build/litegraph.full.js` import, a graph run (`watch` = 1);</li><li>CJS `.` and `/node`, a subgraph created;</li><li>`LiteGraph.VERSION` = `0.18.0-dev.1`; `allow_scripts` false in the full and Node bundles; `subgraph_format` = `definitions`;</li><li>`src/` not exported (`ERR_PACKAGE_PATH_NOT_EXPORTED`)</li></ul> |
| Pack version ranges with the prerelease | semver rules: `>=0.10` and `*` match; `^0.18.0` and `0.18.x` do not (a prerelease is below `0.18.0`) |
| ComfyUI probes (schema and content) | 79/79 valid; 0 of 41 fixtures with a content difference (26 interface slots appended, as ComfyUI does) |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Browser, editor (`/editor/editor_build.html`, real clicks) | `LiteGraph.VERSION` shows `0.18.0-dev.1`. Const 7 → [Subgraph x·x] → Watch; a click on Play: Watch 49, Stop shown, "• modified" shown |
| Browser, runner (started through the old path `headless/graphrunner/server/index.js`) | connected; `example.json` opened, Start Execution: running; Stop All |

## Left open (not part of the plan, or deferred with a reason)

- **One tester controller:** deferred ([5c record](2026-11-22-wave5c-apps-move.md)); it needs its own plan.
- **`editor_event_based.html`:** broken on `master` as well (classic scripts loading ES modules, a missing jQuery file).
- **Editor toolbar:** at a narrow window width the new Nodes button squeezes the Download button (cosmetic).
- **From the Wave 4 records:**
  - Space-key panning still uses the old flag.
  - The palette panel covers the canvas edge.
  - The runner page does not draw node states.
  - Long link-type labels are not shortened.
- **The release itself:** pushing `LG/dev`, the PR to `master`, and the annotated tag `v0.18.0-dev.1` wait for the user's approval.
