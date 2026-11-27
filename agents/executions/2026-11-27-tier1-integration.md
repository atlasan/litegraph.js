# Tier 1 integration: four tracks merged into `LG/dev`

> **Date** 2026-11-27 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `a1eb082` · **Plan** [next priorities after 0.18.0-dev.2](../plans/2026-11-25-next-priorities-after-0.18.0-dev.2.md#execution-tracks-dependencies-and-coordination)

The coordinating session merged the four Tier 1 track branches into `LG/dev` with `--no-ff`. All four sessions had been stopped once by a usage limit and were resumed in place. Each branch already contained `LG/dev` @ `a1eb082` and had its own passing local CI run.

The integration was first done on a throwaway branch (`tmp/integration_tier1`) and checked there. `LG/dev` was moved to it only after that.

## Changes

| Order | Track | Branch head | Its own Local-CI |
|---|---|---|---|
| 1 | Validated loader (X-04), step 4 | `5cf7421` | `pass 3a685aa ... jest 1116/1116 int 162/162` |
| 2 | Hook deprecations and `StrictHandled` (N-1, decision 0007), step 5 | `bec285f` | `pass 9b75f27 ... jest 1024/1024 int 164/164` |
| 3 | Call scopes (D-4, decision 0009), step 2 | `9906d5b` | `pass cc2a532 ... jest 1043/1043 int 160/160` |
| 4 | Browser smoke test (USE-09), step 3 | `831f3a0` | `pass c5dfb77 ... jest 1016/1016 int 164/164 browser 9/9` |

The loader went first because the core split (step 7) waits on it.

**Conflicts:**
- Only in records (the plan and execution index rows, `CHANGES.md`, the roadmap's Tier 1 row) and in the minified bundles.
- The records were resolved by keeping both sides. The duplicated roadmap row was then replaced by one row.
- `build/` and `build_node/` were regenerated with `npm run build` after each merge, never edited by hand.
- No source file conflicted. `src/lgraph.js`, `src/litegraph.js`, `src/lgraphcanvas.js`, `src/litegraph.d.cts` and `docs/guide.md` merged automatically.

**One fix found only by the combined tree:** the generated tables in `docs/callbacks.md` (from step 5) were stale. They were missing the loader's new `load-report` typed event (step 4). The freshness test `tools/tests/hook-docs.test.mjs` failed as designed, and `npm run docs:callbacks` fixed it.

## Verification

| Check | Result |
|---|---|
| `bun run check` on the combined tree (nvm Node 22.23.5, Bun 1.4.5) | Jest 1151/1151, integration 170/170, 12 builds, types and package checks pass |
| `npm run ci:local` on the integration head | see the `LG/dev` history for the line |

## Left open

- **Tier 1 step 6:** the launcher on Windows and macOS (not possible on this machine), and the npm publish decision (roadmap D12).
- **The call-scopes Refresh menu entry** has not been tried in a browser (call-scopes record).
- **The track worktrees under `.claude/worktrees/` and their branches:** they can be removed once you have looked at the result. Removal is not done automatically.
- **Next:** Tier 2 step 7, the core build without the canvas (now unblocked).
