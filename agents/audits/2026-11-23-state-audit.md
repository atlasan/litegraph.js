# State audit: what is done, what is open, release readiness

> **Date** 2026-11-23 · **Kind** audit · **Status** final · **Base** `LG/dev` @ `ecbe017` (same as `origin/LG/dev`; `master` @ `18f5545`; no tags)

**What was reviewed:** the whole project state after Waves 6 and 7, the flows track and the panels track. That covers:
- the roadmap, every plan, execution record, audit and decision, and the ideas catalog;
- the known defects, rechecked in the code;
- release readiness.

**By whom and how:** the main session with three read-only subagents:
- one read the records;
- one rechecked each known defect in the code;
- one started a clean-clone gate run. It was stopped after `npm ci` by plan mode, so the gate results come from the release checks in the [0.18.0-dev.2 plan](../plans/2026-11-23-pre-release-0.18.0-dev.2.md), not from this audit.

The user then chose the release scope and the pre-release fixes (§4).

## 1. Delivered (in `LG/dev`)

| Work | State | Records |
|---|---|---|
| Waves 0–3 | done, in `master` (PR #5–#10) | [roadmap](../plans/roadmap.md) |
| Waves 4–5 | done | 4a–4e, 5a–5c records |
| Wave 6, execution models | done | [6e summary](../executions/2026-11-22-wave6e-polish.md), [verification](2026-11-22-wave6-verification.md) |
| Wave 7, event integration | done, except generated doc tables and deprecation logs | [core](../executions/2026-11-22-wave7-event-core.md), [deferred](../executions/2026-11-22-wave7-deferred.md), [review](2026-11-22-wave7-review.md) |
| Flows track: node reference, declarations, examples | done (steps 1–3 of the [flows direction](../plans/2026-11-22-flows-direction.md)) | [plan](../plans/2026-11-22-flows-reference-examples.md) |
| Panels track: value types, options and node panels | merged (`7bf953c`); `src/panels.js`, `src/valuetypes.js`, declared in `src/litegraph.d.cts` | [plan](../plans/2026-11-22-panels-options-node-details.md) |

**Runner security invariants are all in place:**
- the denylist and family opt-ins (`apps/runner/nodePolicy.js:25-104`);
- the script gate (`nodePolicy.js:88-89`, applied at `graphRunners/graphRunner.js:12`);
- the Host and Origin checks (`server/security.js:18-92`, `server/index.js:10`, `server/wsHandler.js:13-17`).

**Version:** `0.18.0-dev.1` in `package.json:3`, `src/litegraph.js:72` and the builds.

**Static counts** (from a grep in the clone, not a test run):
- 51 Jest and 20 node:test files;
- no `.skip`, `.todo`, `.failing`, `xit` or `xdescribe` markers;
- 99 `TODO|FIXME|XXX|HACK` in `src` and `apps` (33 of them in `lgraphcanvas.js`);
- one `console.log` added since `master`, the console node's intended output (`src/nodes/base.js:1089`).

## 2. Open items

Classes:
- **MUST:** blocks the release, or a correctness or security bug.
- **FIX:** a known defect.
- **NICE:** polish.
- **IDEA:** not planned.
- **DECISION:** needs the user.

### Release
| ID | Item | Class | Sources |
|---|---|---|---|
| R1 | Release scope: `LG/dev` now holds Waves 6–7, flows and panels under a version and a `CHANGES.md` heading that describe Waves 0–5 | DECISION → decided: `LG/dev` as **0.18.0-dev.2** | [dev.1 plan](../plans/2026-11-20-pre-release-0.18.0-dev.1.md) step 7; roadmap |
| R2 | No PR to `master` and no tag; `CHANGES.md:143` claims a tag that does not exist | MUST | `git tag` (empty); `CHANGES.md:141-143` |
| R3 | The release checks ran on `LG/release_0.18.0-dev.1` (557 Jest / 97 integration); `LG/dev` is 69 commits further on | MUST | [dev.1 record](../executions/2026-11-22-pre-release-0.18.0-dev.1.md) |
| R4 | Four "Unreleased" sections sit above the release heading. The upgrade notes miss the `ancestors` default, the Wave 7 handler-error policy, `onShowNodePanel` returning `false`, and the new APIs | MUST | `CHANGES.md:4`, `:30`, `:71`, `:99`, `:149-157` |

### Defects
| ID | Item | Class | Evidence |
|---|---|---|---|
| D-1 | The editor turns scripts back on after the presets turn them off: `code.js` runs after `defaults.js` and sets `allow_scripts = true` at top level, which overrides `mobile` and `event_based` | FIX (security hygiene; pre-release) | `apps/editor/js/code.js:49`; `apps/editor/js/defaults.js:8`, `:81`, `:93`; load order `index.html:20`, `:43` |
| D-2 | `editor_event_based.html` is broken: classic `<script>` tags load ES modules, and it needs a missing jQuery file | FIX (pre-release) | `apps/editor/editor_event_based.html:18`, `:25-52` |
| D-3 | Generated `docs/api/*.html` is stale (last built 2026-11-20; shows the legacy flag code, no execution models) | FIX (pre-release) | `docs/api/lgraph.js.html`, `lgraphnode.js.html`, `litegraph.js.html` |
| D-4 | Call scopes: ON_REQUEST random, time and state readers are stale across loop iterations and Sequence branches; a property edit inside a call is not seen; two call ids | FIX (after the release: flows step 4, FLW-01..04) | [event flows audit](2026-11-22-event-flows-audit.md) findings 1–4; `src/execution.js:40`, `:157-168` |
| D-5 | `graph.triggerInput` finds nodes by title and calls `onTrigger` directly, bypassing the engine | FIX | `src/lgraph.js:1718-1723` |
| D-6 | `graph.executionModel` has a getter only; assigning it is silently ignored | FIX | `src/lgraph.js:2553-2555` |
| D-7 | The first right-click after a node drag opens no canvas menu | FIX | [6e record](../executions/2026-11-22-wave6e-polish.md) |
| D-8 | The `o:` search filter misses types without `def` | FIX (minor) | 2a record |

### Polish
| ID | Item | Class | Evidence |
|---|---|---|---|
| N-1 | Wave 7 leftovers: hook and event doc tables generated from the declarations; deprecation logs for `callbacks_handlers`, `cb_handler`, `callbackhandler_setup` | NICE | [event-integration plan](../plans/2026-11-22-event-integration.md) step 13; `src/callbackhandler.js:25-100` |
| N-2 | Undo history off in the default editor page | NICE / DECISION | `apps/editor/js/defaults.js:39` |
| N-3 | One tester controller (flow B `app.runTests` has no caller) | NICE | `apps/tester/js/app.js:564-588`; `ui-manager.js:415-485` |
| N-4 | Space-key panning uses the legacy `dragging_canvas` path | NICE | `src/lgraphcanvas.js:2276-2279`, `:2366-2368` |
| N-5 | The palette overlays the canvas; Ctrl+Z in its search box undoes text | NICE | `src/litegraph-editor.js:569` |
| N-6 | Long link-type labels are not shortened (`fitText` exists) | NICE | `src/linkrender.js:204-207`; `src/lgraphcanvas.js:5672` |
| N-7 | Toolbar Download button squeezed at narrow widths | NICE | `apps/editor/js/code.js:63`; `css/litegraph-editor.css:32-45` |
| N-8 | Execution badge dropped when the title leaves no room | NICE | 6e record |
| N-9 | Other UI items: a "running and errors only" status setting; pack enable/disable needs a reload; the panel `resource` picker has no host picker | NICE | 4b, 4a, panels records |
| N-10 | `lgraphcanvas.js` is over 10k lines | NICE | fork inventory §4.8; panels plan risks |
| N-11 | Usage text for more node types; builtin packs ship no `templates[]`; no dataflow, realtime or reactive examples | NICE | flows records; flows direction step 7 |
| N-12 | Housekeeping: 8 extra worktrees under `.claude/worktrees/`, about 35 merged local branches | NICE (only on request) | `git worktree list`; `git branch --merged` |

### Decisions
| ID | Item | Recommendation on file |
|---|---|---|
| DEC-1 | D9: commit `docs/nodes/` or generate it in CI only. Today it is git-ignored (`.gitignore:25`), so nothing checks that it is fresh | open |
| DEC-2 | D8's sub-decisions: a uniform "handled" rule (0.20, a warning from 0.19), per-node `node.events` (no), async hooks (own proposal) | see the roadmap D8 row |
| DEC-3 | D3–D5: recommendations never marked decided | roadmap |
| DEC-4 | When to remove the `legacy` paths (no earlier than 0.20) | [decision 0002](../memories/decisions/0002-execution-models.md) |
| DEC-5 | Whether to accept flows direction steps 4–7 (scopes, lifecycle and custom events, profiles, examples per profile) | [flows direction](../plans/2026-11-22-flows-direction.md) |

### Ideas (not planned)
- **Flows:** FLW-05 to FLW-21, FLW-24 ([execution flows](../ideas/landscape/execution-flows.md)).
- **Panels follow-ups:** X-13, multi-node editing, X-11, X-12, light theme, Monaco, group and reroute panels, slot↔widget conversion.
- **Subgraphs:** `graph/map`, live sync and IO rails (Wave 3 plan §11); ComfyUI placeholders' promoted widgets.
- **Readiness checklist leftovers:** runner race coverage, persistent drafts, legacy signature audit.
- **The roadmap's Deferred list.**
- **Investigated ideas** 3D-01, BUN-01 and FLW-01..04. No catalog row is `ready`.

## 3. Inconsistencies in the records

| Where | What is wrong |
|---|---|
| Plan headers and `agents/plans/README.md` | Wave 2 header says "accepted" (done). The index has Wave 5 and the pre-release as "in progress", events-execution as "accepted", and event integration as "core done" |
| Roadmap | <ul><li>Header and status table: no panels row.</li><li>Wave 0 "left open: advisories" and the D7 row: stale (D7 done, `17e357a`).</li><li>"Pushing `LG/dev`" waits: but `LG/dev` is pushed.</li><li>The Wave 7 heading says "done, two items deferred" while 7e says "mostly done".</li><li>D3–D5 are not marked decided.</li><li>Wave 5's "generated API docs out of the authored tree" was never done.</li></ul> |
| Audit **Since** columns | Never updated:<ul><li>[event handling](2026-11-22-event-handling.md) E1–E11 (fixed by Wave 7);</li><li>[fork inventory](2026-11-19-fork-inventory.md) B2, B3 (Wave 2a), C4 (ADR 0001), §3.1 (Wave 7) and §4 items 4 and 6 (Waves 2 and 5);</li><li>[event flows audit](2026-11-22-event-flows-audit.md) findings 5, 10, 11, 12 (flows track).</li></ul> |
| Stale "left open" lines in dated records | <ul><li>The dev.1 record lists "the runner page does not draw node states": fixed in 6d (`apps/runner/public/app.js:373-384`).</li><li>The 4a record lists "body right-click on a placeholder": not reproducible (`ff67788`).</li></ul> |
| `agents/ideas/README.md:25` | Says 64 sketched and 1 promoted; the catalog now has 62 sketched and 4 promoted |
| FLW-05 card | Says "proposed Wave 7" (it is done) |
| `agents/executions/README.md` | No dated rows for 6a–6e; the Waves table lacks 3, 5, 7, flows and panels; the 2026-11-01 rows are out of order |
| Dead anchors | <ul><li>`executions/2026-11-20-wave4a-packs.md:37` → `roadmap.md#wave-4-ecosystem-and-workspace-accepted`;</li><li>`plans/2026-11-22-flows-direction.md:22` → `roadmap.md#wave-7-event-integration-proposed`.</li></ul> |
| ID collision | The B1–B15 series of the [11-18 review](../plans/2026-11-18-repo-review-and-roadmap.md) and the B1–B17 series of the [Wave 6 plan](../plans/2026-11-22-events-execution.md) are both used in the roadmap (Wave 0 "B10 dispose" against 6a "B10, B11, B15") |

No relative link in `agents/**/README.md` or the roadmap is broken, and every record file is indexed.

## 4. Decisions taken with this audit (user, 2026-11-23)

- **Release:** ship everything on `LG/dev` as **`0.18.0-dev.2`**. `0.18.0-dev.1` was never tagged and is superseded.
- **Before the release:** fix D-1 (editor `allow_scripts`), D-2 (`editor_event_based.html`) and D-3 (stale `docs/api`). Correct the records (§3) and resolve R2–R4.
- **After the release:** D-4 (flows step 4) and the other FIX items.

The plan is the [0.18.0-dev.2 pre-release plan](../plans/2026-11-23-pre-release-0.18.0-dev.2.md).

## Verdict

**What holds up:** the code is in good shape. Every wave and track is delivered and merged, the runner's security invariants hold, and no test is skipped or marked as failing.

**What is behind:**
- **The release process:** `master` is three waves and two tracks behind, there is no tag, and the version and `CHANGES.md` describe less than what would ship.
- **The records:** they have drifted (§3).

Three small defects should not ship (D-1 to D-3). The largest open correctness item, stale call scopes (D-4), is understood and planned; it is not a regression.
