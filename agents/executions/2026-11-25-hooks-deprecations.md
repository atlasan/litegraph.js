# Hooks: generated doc tables, deprecation logs and strict "handled"

> **Date** 2026-11-25 (finished 2026-11-27) · **Kind** execution · **Status** final · **Base** `LG/dev_hooks_deprecations` from `LG/dev` @ `a5e2875`, `LG/dev` @ `a1eb082` merged in · **Plan** [hooks deprecations](../plans/2026-11-25-hooks-deprecations.md)

Step 5 of the [next priorities](../plans/2026-11-25-next-priorities-after-0.18.0-dev.2.md): the Wave 7 leftovers (state audit N-1) and [decision 0007](../memories/decisions/0007-hook-handled-rule.md). The hook and typed-event tables of `docs/callbacks.md` are now generated from `src/litegraph.d.cts`. `cb_handler`, `callbacks_handlers` and `callbackhandler_setup()` keep working and log once. The setting `LiteGraph.Hooks.StrictHandled` (off by default) makes the 8 lenient "handled" sites strict. With it off, they warn once per hook. With the setting off, the behaviour is unchanged: the default-mode result snapshot is identical.

## Changes

- `ff5b5fc` `docs:` the [plan](../plans/2026-11-25-hooks-deprecations.md) and its index row.
- `77b03ae` `feat:` (the tests were written first, and failed only for the missing features; they are committed with the code, so every commit passes the gate):
  - **Tables:** `tools/hook-docs.mjs` (`npm run docs:callbacks`, `--check`).
    - It parses the 5 hook maps and the 3 event maps. `// group` comments become the group column and `/** */` comments the notes; multi-line payload types are joined.
    - It rewrites only the `<!-- generated:hooks|events:start/end -->` blocks of `docs/callbacks.md`.
    - **`tools/tests/hook-docs.test.mjs`:** the page is fresh; the parser finds exactly the names that the regexes of `check-types` find; groups, arguments and notes survive; a stale table is detected; text outside the blocks is kept.
  - **Deprecations** (`src/callbackhandler.js`):
    - **Storage:** the registry lives in `host._cb_handler` and `handler._lists`; library code reaches it through `hookRegistryOf(host)`.
    - **Accessors:** `cb_handler` (get and set), `callbacks_handlers` (get and set, the live record) and `callbackhandler_setup()` log once per name through `LiteGraph.log_warn("deprecated", …)`, naming the replacement.
    - **`initialize()` and `setupPlatform()`** no longer call `callbackhandler_setup()`; the registry is created on first registration.
    - **`CallbackHandler` itself is not deprecated** (the event plan's rule 7 listed it): it holds the result helpers.
  - **StrictHandled:**
    - **The setting** `LiteGraph.Hooks.StrictHandled`, defined in `setupPlatform`; its id is also `CallbackHandler.STRICT_HANDLED`. It is not a new module export, because the bundles export every `export`.
    - **`CallbackHandler.handledAt(name, result, legacy)`:** `true` / `{return_value: true}` → handled, without reading the setting; `null` / `undefined` / `false` → not handled; otherwise, setting on → not handled; setting off → `legacy` decides, and a result it accepts logs `log_warn("hooks", …)` once per hook name. The warning names the setting and says to return `true` or `{return_value: true}`.
    - **Sites:** node `onMouseDown`, `onDblClick`, `onDropItem`, canvas `onDropItem` on a node (`handled`); canvas `onDropItem` on the background, node `onDropFile`, canvas `onShowNodePanel` (`valueOf`); node `onAddPropertyToPanel` (its own rule, `panelRowHandled` in `panels.js`).
    - **Module-level helpers** have prefixed names (`hookWarnOnce`, `describeHookResult`, `HOOK_STRICT_HANDLED`), because the bundles concatenate modules.
  - **Tests:**
    - **`test/hook-results.test.js`:** builds the table in both modes. The default-mode snapshot is unchanged. The strict-mode snapshot lists the cells strict mode changes, and asserts that only `1` / `{return_value: 1}` change, always back to "default", at exactly the 7 rows above. Two more tests cover the once-per-hook warning, and that strict mode and strict results never warn.
    - **`test/hook-deprecations.test.js`:** the library's own paths log nothing, each name logs once and keeps working, and nothing logs twice.
    - **`test/html-lifecycle.test.js`** counts handlers through `_lists`.
  - **Typings:** `@deprecated` on `cb_handler` and `callbacks_handlers`. `callbackhandler_setup()` is now declared (deprecated). `CallbackHandler.STRICT_HANDLED`, `handledAt` and `strictHandled` are declared and used in `tools/types/consumer.mts`.
  - **Generated tables in `docs/callbacks.md`** (hooks: group, name, handler arguments; events: name, payload, notes), plus `package.json` `docs:callbacks`.
- `2bcc289` `docs:` `CHANGES.md` `# Unreleased`: Added (the setting, the generated tables); Changed (the upgrade note for extension authors, the deprecations). Also the roadmap (Wave 7 heading and row done, new part 7f, D8, anchors), the codebase map (init order, `tools/`, hooks, node:test count) and the event plan's status and History.
- `217a9e9` `build:` regenerated distributions.
- `9b75f27` merge of `LG/dev` @ `a1eb082` (`no-undef`, the compatibility charter):
  - **Conflict:** only `CHANGES.md` (both Added and Changed entries kept);
  - **Rebuild:** `npm run build` after the merge changed nothing;
  - **Lint:** passes with `no-undef` as an error.

`docs/callbacks.md` also got a section on the "handled" rule (the 8 sites, the setting, the migration) and one on the deprecated names. The node panel note was corrected: `onAddPropertyToPanel` is dispatched as a hook.

## Strict-mode column (from the snapshot)

| Site | `1` | `{return_value: 1}` |
|---|---|---|
| canvas `onDropItem` (background) | handled → default | handled → default |
| canvas `onShowNodePanel` | handled → default | handled → default |
| node `onAddPropertyToPanel` | handled → default | handled → default |
| node `onDropFile` | handled → default | handled → default |
| node `onDblClick` | (default) | node handled → default |
| node `onDropItem` | (default) | true → default |
| node `onMouseDown` | (default) | drag blocked → default |

`true`, `{return_value: true}`, `false` and the list results are the same in both modes at every site.

**Test fix found on the way:** the menu sites append to the list a hook returns, so building the table twice accumulated entries. `outcome()` now gives each run a `structuredClone` of the result. The default snapshot is unchanged.

## Verification

| Check | Result |
|---|---|
| Tests first | 6 of the 9 new or rewritten Jest tests failed on the base, each for the missing feature; the default-mode snapshot passed |
| `bun run check` before the `feat:` commit | Pass: 1024 Jest, 163 integration, 12 builds, type consumers, export parity, declared events and hooks |
| `bun run check` after merging `LG/dev` | Pass: 1024 Jest (46 snapshots), 164 integration, 12 builds |
| `npm run ci:local -- HEAD` | `Local-CI: pass 9b75f27 node22.23.5 jest 1024/1024 int 164/164 fresh ok` (report `.lg/ci/runs/9b75f27-20261127T082112Z/report.md`) |
| `node tools/hook-docs.mjs --check` | fresh |

No browser check: the change has no UI apart from the setting's row in the settings list.

## Left open

- **Turning `StrictHandled` on by default:** a later release, with a `CHANGES.md` note (decision 0007).
- `apps/editor/editor_debug.html` has a commented-out `LiteGraph.cb_handler.debug = true`; it is harmless and left as it is.
