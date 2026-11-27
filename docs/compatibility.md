# Compatibility charter

What this library stays compatible with, how far, and how a change that touches compatibility is made. The scope is set by [decision 0008](../agents/memories/decisions/0008-legacy-compatibility-scope.md); the execution side by [decision 0002](../agents/memories/decisions/0002-execution-models.md) and the mode numbers by [decision 0004](../agents/memories/decisions/0004-mode-4-bypass.md).

## Targets

| Target | What is kept | How it is checked |
|---|---|---|
| **This library's API** (`@litegraph/litegraph`, ESM and CJS entries) | Every exported name and documented behaviour within a minor version; changes go through deprecation (below) | `check:types` (strict consumers, export parity), `check:build`, Jest and the integration tests |
| **Saved documents of this library** | Every document saved by an earlier version loads. Version markers (`litegraph_version`, `litegraph_modes`, `config.execution`) decide how it is read, and migrations run on load (`LGraph.migrateModes`, node-type replacement mappings) | The examples test, the migration tests, `tools/migrate-modes.mjs --check` |
| **The original LiteGraph API** (jagenjo's, up to 0.4-era projects) | The old global names in a classic-script bundle (planned, Tier 4 of the [next priorities](../agents/plans/2026-11-25-next-priorities-after-0.18.0-dev.2.md)), the `onX` callback properties, and old execution behaviour through the `legacy` execution model. Old behaviour beyond that (quirks, bugs since fixed) is **not** reproduced | The `legacy` golden snapshots; webglstudio graphs as fixtures once the classic bundle exists |
| **ComfyUI workflows** (schema 0.4 and version 1) | Import and export through the `comfy_interop` extension: subgraph definitions (`definitions.subgraphs`), reroutes, mode numbers 0–4, groups. ComfyUI's backend semantics (prompt execution, Python node types) are out of scope | The ComfyUI probes in the git-ignored, local `experiments/comfy-interop/`, run by `npm run ci:local -- <ref> --comfy` (skipped when absent), and the interop Jest tests |
| **nunuStudio** | A new integration developed alongside LiteGraph. Both projects can adapt, with compatible LiteGraph additions where the host needs them. | Active investigation. Capture a representative host project and verify authoring, execution, save and reopen. |
| **WebGLStudio** | Full compatibility with the legacy host is the goal, including the globals, callbacks and execution behaviour its existing projects depend on. | Active investigation. Exercise existing projects in WebGLStudio and compare loading, editing, execution and save/reopen against its bundled LiteGraph. Record differences as fixtures. |
| **Other legacy hosts** | The original-API target above applies. | Add host fixtures as integrations are evaluated. |

## Package baseline

On Linux, `f5c5437` passed full local CI. A separate comparison with `v0.18.0-dev.2` found all 17 package export paths and all previous runtime export names across the 12 bundles. The existing `./core` entry keeps its ESM, CommonJS and TypeScript contract, including canvas exports. Headless support is planned as an additional entry. [CI baseline and remaining coverage](../agents/plans/roadmap.md#integration-baseline)

## Rules for changes

1. **Deprecate, don't break.** A name or behaviour being replaced keeps working, logs once per process when used, and is listed in `CHANGES.md` with its replacement. Removal needs its own decision; `legacy` and the deprecated execution flags have **no removal date** (decision 0008).
2. **Prefer a setting to a switch.** When a stricter or different behaviour is wanted, add it behind a named setting (for example `LiteGraph.Hooks.StrictHandled`, decision 0007), and name that setting in every warning or refusal it causes.
3. **Documents carry their semantics.** A change in how saved data is read adds a marker and a migration on load, never a silent reinterpretation. Files a marker cannot classify get a setting (`LiteGraph.Compat.*`) and a rewrite tool.
4. **Use the constants.** Code and docs use `LiteGraph.BYPASS`, `LiteGraph.ON_REQUEST` and the other constants, never their numbers.
5. **Present the trade-off; the human decides.** A compatibility cost (a renumbering, a behaviour change for new graphs, a dropped target) is written down with its options in a plan or decision record and decided by the maintainer, as decisions 0002, 0004 and 0008 were.
6. **Every target has a check.** A target without an automated check is marked *planned* in the table above until it gets one.

## Upgrade notes

Each release's upgrade notes are at the top of its section in [CHANGES.md](../CHANGES.md).
