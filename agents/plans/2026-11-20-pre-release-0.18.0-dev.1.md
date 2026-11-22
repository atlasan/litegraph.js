# Pre-release 0.18.0-dev.1

> **Date** 2026-11-20 · **Kind** plan · **Status** accepted · **Base** `LG/dev` @ `5b8c25e`

**Outcome:** the first testable dev pre-release, `0.18.0-dev.1`, published as an annotated git tag on `master`, with no GitHub release page and no npm publish. It contains every planned wave (0–5) and closes the loose ends found by the audit below. The user chose the version name, the channel, and the decision to include the Wave 5 apps move (last).

## Audit of the waves (2026-11-20)

| Wave | State | Open planned work |
|---|---|---|
| 0 Safety | Done, in `master` | Runtime advisories (D7): 12 findings (10 high). They come from nested `ws` < 8.20.2 under `engine.io`, `engine.io-client`, `socket.io-adapter` and `osc` |
| 1 Platform | Done, in `master` | The CallbackHandler / `LGraphEventTarget` single pipe (carried over in Wave 1). It is not in any wave plan; deferred, listed below |
| 2 Authoring core | Done, in `master` | Carried to Wave 4: DragAndScale listeners, RenderLink classes, split title drawing (H2), reroutes across subgraph boundaries. Still open: the dead Ctrl+group-drag path |
| 3 Subgraphs | Done, in `master` | A file picker for blueprints in the editor (`insertBlueprint` is API only) |
| 4 Ecosystem | 4a done (`LG/dev`) | 4b–4e as in the [Wave 4 plan](2026-11-20-wave4-ecosystem-workspace.md), and right-click on a placeholder's body (4a record) |
| 5 Repository and packaging | Proposed | Packaging truthfulness, a CI check that the builds are fresh, docs, and the apps move |
| Housekeeping | n/a | Merged branches and the stale `wave0-verify` worktree (only on request) |

## Steps

| # | Step | Where | Acceptance check |
|---|---|---|---|
| 1 | D7: upgrade the runtime dependencies that carry the advisories, to releases at least two weeks old, after reading their changelogs | here | `npm audit --omit=dev` shows no high findings; `npm run check`; runner and OSC integration tests |
| 2 | Loose ends: remove the dead Ctrl+group-drag path or make it work; a blueprint file picker in the editor; right-click on a placeholder's body | here | Jest; browser |
| 3 | Wave 4b–4e, as planned | Wave 4 session | its records; each part merged into `LG/dev` |
| 4 | Wave 5 plan, then packaging truthfulness, the CI build-freshness check, and docs (README, getting started, architecture) | here | `npm pack` contents; CI step; links checked |
| 5 | Wave 5 apps move (editor, tester, runner into their own homes), after step 3 lands | here | every app starts; browser and runner checks; Jest and integration tests |
| 6 | Release checks: `npm run check` on a clean clone; editor, tester and runner smoke tests in the browser; `npm pack` installed into a scratch project (ESM and CJS); the ComfyUI probes | here | release execution record |
| 7 | Version `0.18.0-dev.1` (`package.json`, `LiteGraph.VERSION` source); `CHANGES.md` sections collected under the release; release PR `LG/dev` → `master`; annotated tag `v0.18.0-dev.1` on the merge commit | here | the user approves the push, the PR merge and the tag push |

## Deferred, not in this pre-release

These are not part of any accepted plan:
- the single event pipe (Wave 1 carry-over);
- the ideas in the Wave 3 plan §11 (`graph/map`, live sync, IO rails);
- the roadmap's Deferred list.

## History

- 2026-11-22: steps 1–6 done and the version bumped ([record](../executions/2026-11-22-pre-release-0.18.0-dev.1.md)); step 7 (push, PR, tag) waits for the user. The single tester controller is deferred.
- 2026-11-20: proposed and accepted. The user asked to finish the planned actions and cut a first dev pre-release, and chose the version `0.18.0-dev.1`, a tag only, and the apps move included last.
