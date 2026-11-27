# `no-undef` in the lint config, and the compatibility charter

> **Date** 2026-11-25 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `a5e2875` · **Plan** [next priorities after 0.18.0-dev.2](../plans/2026-11-25-next-priorities-after-0.18.0-dev.2.md) (step 8; decision 0008 / launcher candidate C-4)

The coordinating session's own track on `LG/dev_lint_charter`, run alongside the four Tier 1 sessions:
- `no-undef` is an error in `eslint.config.js`, with browser, Node and provided globals declared;
- the separate undeclared-names test now guards the config instead of duplicating it;
- `docs/compatibility.md` states the compatibility targets and the rules for compatibility changes.

## Changes

- **`eslint.config.js`:**
  - `no-undef` set to 2.
  - Globals from `globals.browser` and `globals.node`, plus the `PROVIDED` list (gl-matrix, litegl, litescene, jQuery, the optional audio/MIDI/OSC/socket.io helpers, `Bun`, `WebTransport`, `graphcanvas`), moved from the test.
  - A `LiteGraph/script-scope` block gives `src/nodes/nodejs_only/**` and `src/nodes/libraries/**` the `LiteGraph`, `LGraph`, `LGraphNode`, `LGraphCanvas` and `LLink` globals. Those files are loaded as plain scripts, and the old test skipped them.
- **`globals` 13.24.0 as a dev dependency.** It was already in the lock as an ESLint dependency, so nothing new is downloaded, and the version is from 2023.
- **`tools/tests/undeclared-names.test.mjs`** now uses ESLint's flat config (`loadESLint({useFlatConfig: true})`; ESLint 8 defaults to eslintrc). It checks two things:
  - that the config reports `no-undef` as an error on a probe;
  - that `src/` has no `no-undef` message.
- **`docs/compatibility.md`:**
  - **Targets:** this library's API and documents, the original LiteGraph API (old global names in a planned classic bundle, `onX`, the `legacy` model), ComfyUI workflows, WebGLStudio and other hosts. Each target names its check.
  - **Six rules:** deprecate, don't break; prefer a setting to a switch; documents carry their semantics; use the constants; present the trade-off and the human decides; every target has a check.
  - Linked from `AGENTS.md`.
- **`CHANGES.md` (`# Unreleased`):** the charter, and `no-undef`.

## Verification

| Check | Result |
|---|---|
| `npx eslint src` | 0 errors (2,374 warnings, unchanged kinds), 0 `no-undef` |
| Probe file with an undeclared name | reported as a `no-undef` error |
| `node --test tools/tests/undeclared-names.test.mjs` | 2/2 pass |
| `bun run check` (nvm Node 22.23.5, Bun 1.4.5) | see the merge commit |
| `npm run ci:local -- LG/dev_lint_charter` | see the merge commit |

## Left open

- The 2,374 stylistic warnings: a separate mechanical `lint:fix` commit, best done after the canvas split (Tier 2, step 9) so it doesn't conflict with the parallel tracks.
- The classic-script bundle that the charter lists as planned (Tier 4, step 15).
