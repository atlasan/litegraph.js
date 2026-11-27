# Validated loader for untrusted graphs

> **Date** 2026-11-25 (finished 2026-11-27) · **Kind** execution · **Status** final · **Base** `LG/dev` @ `a1eb082` · **Plan** [graph loader](../plans/2026-11-25-graph-loader.md) (Tier 1 step 4 of the [next priorities](../plans/2026-11-25-next-priorities-after-0.18.0-dev.2.md); idea X-04)

Branch `LG/dev_graph_loader`. `LiteGraph.validateGraphData(data, options)` (`src/graphloader.js`, exported as `GraphLoader`) checks a serialized graph before any node is constructed and returns `{ok, data, report}`. The runner validates every opened or pushed workflow in strict mode, with its node-type policy as the type hook, and refuses failing data with the structured report. `graph.load()` and the Editor's file drop validate in repair mode and show the report as a notice. `configure()` is unchanged, so fixtures, examples and ComfyUI probes load as before.

## Changes

- **`src/graphloader.js` (new, in `build.py` after `subgraphdefs.js`):**
  - A pre-pass counts nodes, links, groups and definitions over the whole document (inline subgraphs and nested definition blocks included) and the nesting depth. An oversized document is refused before anything is copied.
  - The main pass builds a cleaned deep copy. It bounds strings, value nesting, one node's `properties` / `widgets_values`, the document size and coordinates (node `pos` / `size`, group `bounding`, reroute `pos`, definition IO `bounding`).
  - Runtime-only fields are dropped with a `dropped-field` warning: `_…` keys, `__proto__` / `constructor` / `prototype` at any depth, members of the `LGraph` and node class prototypes, `on[A-Z]…` callbacks, and listed runtime fields (`graph`, `widgets`, `libraries`, `status`, …). Other unknown keys are kept.
  - Links: malformed entries and duplicate ids are errors; dangling links, slots past the stored slots and slot references to missing links are warnings. `repair` removes them, clears the references, resets malformed slot data and clamps coordinates; bounds and refused types are never repaired.
  - `allowType(type, {path, node})` is asked about every node type except instances of a definition id (their definition's nodes are asked about).
  - `GraphLoader.DEFAULT_LIMITS`, `limits()`, `defineSettings()`, `formatReport()`, `failure()`.
- **Settings** `LiteGraph.Loader.MaxNodes`, `MaxLinks`, `MaxGroups`, `MaxDefinitions`, `MaxDepth`, `MaxValueDepth`, `MaxStringLength`, `MaxPropertiesSize`, `MaxDocumentSize`, `MaxCoordinate` and `OnOpen` (`repair` / `strict` / `off`), defined in `LiteGraph.setupPlatform`.
- **`src/lgraph.js`:** `configureValidated(data, {source, repair = true, keep_old, …})` (refused: graph unchanged; emits `load-report {report, ok, source}` when there is something to report); `_configureOpened(text, source)` applies `LiteGraph.Loader.OnOpen` and reports invalid JSON (`bad-json`); `load()` uses it and passes `{ok, error, report}` to its callback. `src/litegraph.js`: `LiteGraph.validateGraphData`.
- **Editor (`src/litegraph-editor.js`):** the file drop goes through `_configureOpened`; a `load-report` listener shows "Not loaded …" or "Loaded … with fixes …" through `showExecutionNotice`.
- **Runner:**
  - `nodePolicy.typePolicy(isRegistered, {env, replacedType})`: the same denylist as `assertAllowedGraph`, as a hook returning `true` or the reason.
  - `graphRunner.js`: validate (strict, `typePolicy`) → on refusal throw with `report` (type refusals keep `assertAllowedGraph`'s message) → `assertAllowedGraph` on the cleaned copy (unchanged) → configure. A failed first load answers the first command (`status: 'error'`, `report`) instead of crashing the worker.
  - `graphManager.js` keeps `report` on rejected commands (`{error, report}`); `wsHandler.js` sends `{type: 'error', data: {message, report}}`.
  - Origin/Host checks, the denylist and the script lockdown are untouched.
- **Typings** (`src/litegraph.d.cts`): `GraphLoader`, `GraphLoaderLimits`, `GraphValidationOptions` / `Issue` / `Report` / `Result`, `ConfigureValidatedResult`, `LiteGraph.validateGraphData`, `LGraph.configureValidated`, `load(url, callback)`, the `load-report` event; used in `tools/types/consumer.mts`.
- **Docs:** `docs/guide.md` ("Untrusted documents", settings table), `docs/architecture.md` (safety defaults), `docs/development.md` (runner security and the error reply), `CHANGES.md` (`# Unreleased`), codebase map, catalog (X-04 and USE-23 promoted), roadmap track row; plan choice 9 corrected (dangling links are warnings, see below).

## Verification

| Check | Result |
|---|---|
| `test/graph-loader.test.js` (new) | 100 tests: each bound (with settings and per-call overrides), runtime fields, non-JSON values and cycles, nodes and links in strict and repair, definitions and `-10`/`-20`, inline subgraph paths, the type hook, `formatReport`, `configureValidated`, `load(Blob)` under each `OnOpen` mode and invalid JSON, `configure()` unchanged, and every example, test fixture and runner workflow (62 files) validating strict with no errors and no dropped field |
| `tools/tests/runner.test.mjs` | new test: a 10001-node workflow (`too-many-nodes`), a malformed link table (`bad-link`, with the dangling link reported), an oversized string on update (old graph kept), runtime fields dropped and the graph still runs, a denied type with the policy's message and the report; WebSocket test: a duplicate node id answers `error` with `data.report` |
| `tools/tests/runner-security.test.mjs` | new test: `typePolicy` refuses what `assertAllowedGraph` refuses (families, allow/deny settings, renamed types) |
| Browser: `/editor/editor_build.html` (in-app browser) | a refused file shows "Not loaded (bad.json): duplicate-node-id …" and leaves the graph as it was; a repairable one loads with "Loaded fixable.json with fixes: dropped-field … dangling-link …", and the node keeps its real `onExecute` |
| `bun run check` | pass: lint, 12 builds, strict type consumers, 1116 Jest (61 suites), 162 integration, package check |
| `npm run ci:local -- HEAD` (clean clone of `3a685aa`) | `Local-CI: pass 3a685aa node22.23.5 jest 1116/1116 int 162/162 fresh ok` |

**Finding while testing:** two shipped examples, `audio_reverb.json` and `functions/function_replication.JSON`, contain dangling links (links to nodes that are not in the graph). `configure()` loads them as inert links. Refusing them would make the runner refuse files the editor ships, so dangling links are warnings in strict mode (plan choice 9 corrected); repair removes them.

## Left open

- **ComfyUI import** (`comfy_interop` import command) still calls `configure()` directly; it could use `configureValidated` once the probes are checked against it.
- **Clipboard paste** of nodes is not validated (it configures single nodes, not documents).
- **`docs/callbacks.md`** lists graph events; `load-report` is declared in the typings and documented in the guide, and goes into the callbacks table after the hooks track (which edits that file) merges.
- The two examples with dangling links could be cleaned (their link-data snapshot would change).
