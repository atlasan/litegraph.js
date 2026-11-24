# Pre-release 0.18.0-dev.2

> **Date** 2026-11-23 · **Kind** execution · **Status** final; push, PR and tag wait for the user · **Base** `LG/dev_release_0.18.0-dev.2` from `LG/dev` @ `581130f` · **Plan** [Pre-release 0.18.0-dev.2](../plans/2026-11-23-pre-release-0.18.0-dev.2.md)

Steps 2–5 of the plan, on `LG/dev_release_0.18.0-dev.2`: the records were corrected, the three pre-release defects were fixed, the version is `0.18.0-dev.2`, and every release check passed. Step 6 (push, PR, tag) is the user's.

## Changes

- `794fbaf` `docs:` records hygiene, state audit §3:
  - plans index and the Wave 2 plan header;
  - roadmap: panels and release rows, a Pre-releases section, Wave 0 advisories and D7 closed, the Wave 7 heading and 7e agree, D3–D5 pending, Wave 5 leftovers named, a note on the two B-series;
  - **Since** columns: event handling E1–E11, fork inventory (B2, B3, C4, §3.1, §4), event flows findings 5, 10, 11, 12;
  - ideas README counts regenerated from the catalog (237 ideas: 164 seed, 62 sketched, 6 investigated, 4 promoted, 1 parked); the FLW-05 card;
  - executions index: 6a–6e rows, date order, the Waves table for 3, 5, 7 and both tracks;
  - the two dead anchors.
- `5839977` `fix:` D-1: `apps/editor/js/code.js` no longer sets `LiteGraph.allow_scripts = true`; `js/defaults.js` is the only place. `test/editor-defaults.test.js` (2 tests) failed before the fix (`js/code.js` listed) and passes after.
- `c34897d` `fix:` D-2: `editor_event_based.html` loads modules in `index.html`'s order with `js/defaults.js?preset=event_based`, without the missing jQuery file.
- `709c2af` `docs:` D-3: `docs/api` regenerated (88 pages, was 16). The `selectionChanged` helper sat between the `LGraphCanvas` class comment and the class, so JSDoc dropped the class page; the helper now comes first. Event flows finding 13: **Since**.
- `9e06994` `docs:` `CHANGES.md`: one `0.18.0-dev.2` release with the four former Unreleased sections and a pre-release fixes section; upgrade notes (the `ancestors` default and its opt-out, the deprecated legacy flags, the hook error policy, `onShowNodePanel` returning `false`, the new APIs, optional dependencies, a summary of dev.1's notes). The dev.1 section is kept as "never tagged, superseded", without the tag claim. The dev.1 plan's status is superseded; README and `docs/development.md` name the new version.
- `32f385d` `build:` version `0.18.0-dev.2` in `package.json`, `package-lock.json` and `LiteGraph.VERSION`; distributions regenerated. A grep finds `0.18.0-dev.2` in all 16 places and no `0.18.0-dev.1` in the package, `src/` or the builds (`test/fixtures/runner-parity-ancestors.json` keeps the version it was saved with).

## Verification

| Check | Result |
|---|---|
| Link and anchor check over `agents/**` (a script: every relative link and `#anchor`, GitHub heading slugs) | 668 links; 0 broken except 3 placeholder links in `_templates/` (written for the destination folder). The same script on `LG/dev` found both dead anchors |
| Ideas catalog parse (a script over `agents/ideas/catalog.md`) | 237 rows, 237 unique IDs, no malformed row |
| `npm run check` before each code commit (D-1, D-2, D-3, version) | pass each time: 922/922 Jest (50 suites), 125/125 integration, 12 builds, strict types, export parity, declared events and hooks, package check |
| Clean clone of the branch @ `32f385d` (scratch dir): `npm ci --ignore-scripts`, `npm run check`, `npm run check:fresh` | all exit 0: 922/922 Jest, 125/125 integration, 12 builds; the committed builds match a fresh build |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm pack` (21 files, 4.3 MB), installed into an empty project with `--omit=optional` | <ul><li>no dependencies installed (only unmet optional ones);</li><li>ESM `.`, `/core` and the deep `build/litegraph.full.js` import; a graph run (`watch` = 1);</li><li>CJS `.` and `/node`; a subgraph node created;</li><li>`LiteGraph.VERSION` = `0.18.0-dev.2` in all five entries;</li><li>`allow_scripts` false in the full, `.` and Node bundles; `subgraph_format` = `definitions`; `new LGraph().executionModel` = `ancestors` (ESM and CJS);</li><li>`src/` not exported (`ERR_PACKAGE_PATH_NOT_EXPORTED`, ESM and CJS)</li></ul> |
| ComfyUI probes (`experiments/comfy-interop`, git-ignored, copied to a scratch dir against this branch's `build_node` and `src`; Node v22.23.4 `--experimental-strip-types`) | schema: 79/79 pass; content: 0 of 41 fixtures with a difference (26 interface slots appended, as ComfyUI does) |
| Browser, `editor_event_based.html` (`npm run editor` on port 8001, real clicks) | loads; console errors are only the MIDI permission prompt; `allow_scripts` false, `do_add_triggers_slots` true, history on, model `ancestors`; Demo "Timer, random and branch" + Play: runs (61 iterations in 2 s), the console node logs |
| Browser, `editor/editor_build.html` | `LiteGraph.VERSION` = `0.18.0-dev.2`. Demo menu groups: Flows (event scripting, stepped, mixed), Subgraphs and functions, Editor and widgets, Audio and MIDI, Graphics, Network. FOR loop: Button → FOR (start 0, 3 elements) → Console, with `index` → A×B (×2, ON_REQUEST by default) → Console msg; Play and a click on the button logged 0, 2, 4 (the console node prints a falsy `0` as empty). Demo "Subgraph" + Play: Watch reads the time through the subgraph (3.000, then 6.000), the counter counts events through it. A double click on a node opened the node details panel (pack `litegraph/basic 0.18.0-dev.2`). Console errors: MIDI permission only |
| Browser, tester (`/apps/tester/`) | 255 node types discovered; `graph/input` Test: 4/4 passed |
| Browser, runner started through `headless/graphrunner/server/index.js` (port 3001) | connected; `example.json` opened; Start Execution: `running`; the page applied the streamed states (`reset`, then `done` for both nodes) to the drawn graph; Stop All |

## Corrections to earlier records

These dated records are not rewritten; this record supersedes the lines:
- [0.18.0-dev.1 record](2026-11-22-pre-release-0.18.0-dev.1.md), "Left open": the runner page now draws node states (Wave 6d), `editor_event_based.html` is fixed here (D-2), and dev.1 was never tagged.
- [4a record](2026-11-20-wave4a-packs.md), "Left open": the body right-click on a placeholder is not reproducible (state audit, `ff67788`).
- [Fork inventory](../audits/2026-11-19-fork-inventory.md) §4 "LibraryManager: show library state in the node UI": the state audit counts it as done in Wave 5, but no record or `CHANGES.md` entry shows it, so its **Since** stays empty.

## Left open

- **Step 6 of the plan:** push `LG/dev`, the PR `LG/dev` → `master`, the annotated tag `v0.18.0-dev.2`; each needs the user's approval.
- **`npm run docs` exits 1:** JSDoc cannot parse the TypeScript-style type expressions in some tags (182 errors, for example `{() => void}`, `{{a?: T}}`); those tags lose their type, the pages are generated. Not part of `npm run check`.
- **The state audit backlog** after the release: FIX D-4 to D-8, DECISION DEC-1 to DEC-5, NICE N-1 to N-12 (see the [roadmap](../plans/roadmap.md)).
