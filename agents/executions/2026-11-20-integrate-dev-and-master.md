# Integrate LG/dev and align master

> **Date** 2026-11-20 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `bcff521` · **Plan** [roadmap](../plans/roadmap.md#branch-model)

Two lines of work had diverged.

| Line | Where | What it held |
|---|---|---|
| Records | local `LG/dev` | the `agents/` workspace reorganisation and the ideas catalog (`LG/docs_ideas`), not yet pushed |
| Runner policy | `origin/LG/dev` | the runner work of PRs #6 and #7, with its records |
| Master | `master` | Waves 0, #6 and #7 only; no Wave 1 and no records |

The run merged `origin/LG/dev` into `LG/dev` and resolved two record conflicts. It then regenerated the distributions, merged `origin/master` so that `master` became an ancestor of `LG/dev`, and pushed. Finally it opened [PR #8](https://github.com/atlasan/litegraph.js/pull/8) to bring `master` level with `LG/dev`.

## Changes

- `d660e46` merge `origin/LG/dev` into `LG/dev`. It had two conflicts, both in records:
  - `agents/audits/2026-11-19-wave0-pr5-review.md`: kept the newer follow-up text from #6/#7, and pointed its roadmap link at `agents/plans/`.
  - `agents/plans/roadmap.md`: the D1 row. Kept the decided text and rewrote the audit and ADR links for the new paths.
- `bcff521` merge `origin/master` into `LG/dev`. It brought only the PR #7 merge commit and changed no content.
- Local `master` fast-forwarded to `e9b2750` (`origin/master`).
- [PR #8](https://github.com/atlasan/litegraph.js/pull/8): `LG/dev` → `master`.

## Verification

| Check | Result |
|---|---|
| `npm run build` on the merged tree | the text-merged `build/` and `build_node/` were byte-identical to a fresh build |
| `npm run check` | lint clean, 12 builds, strict types, 344/344 Jest, 92/92 integration, package check |
| Relative links in `agents/`, `docs/*.md`, `AGENTS.md`, `README.md`, `CHANGES.md` | all resolve, apart from the placeholders in `agents/_templates/` |
| Old locations (`planning/`, `docs/development/`) | gone; the renames followed the moved files |
| `git merge-base --is-ancestor origin/master LG/dev` | true |

## Left open

- PR #8 merges into `master` once CI passes.
- The `.claude/worktrees/wave0-verify-607984` worktree (on `LG/runner_deny_d1`, already merged) can be removed once its session is archived.
- Merged feature branches can be pruned, on request: `LG/wave0_safety`, `LG/wave1_platform`, `LG/wave1_finish`, `LG/docs_ideas`, `LG/runner_deny_servers`, `LG/runner_deny_d1`, `claude/wave0-verify-607984`.
