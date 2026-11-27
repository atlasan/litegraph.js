# Validated loader for untrusted graphs

> **Date** 2026-11-25 · **Kind** plan · **Status** accepted · **Base** `LG/dev` @ `a5e2875`

A pure validation pass, `LiteGraph.validateGraphData(data, options)` (module `src/graphloader.js`, exported as `GraphLoader`), checks a serialized graph before any node is constructed. It bounds sizes, counts, nesting and coordinates, drops runtime-only fields, reports malformed links, and asks a type hook about every node type. The runner refuses data that fails, with a structured report. The editor uses it in repair mode when it opens files or receives dropped data. Trusted in-memory `configure()` calls are unchanged. This is Tier 1 step 4 of the [next priorities plan](2026-11-25-next-priorities-after-0.18.0-dev.2.md) (idea X-04, USE-23).

## Context

- **Runner:** `apps/runner` executes pushed graphs. It has Origin/Host checks (`server/security.js`), a recursive node-type denylist with `@family` opt-ins (`nodePolicy.js`, `assertAllowedGraph`, roadmap D1) and a script lockdown. It does not check structure or size: the WebSocket has a 4 MiB `maxPayload`, a workflow file has no limit, and `LGraph.configure` copies every key it finds.
- **Why fields matter:** `LGraph._configure` assigns every top-level key (`this[i] = data[i]`), and `LGraphNode.configure` assigns every node key, calling `configure()` on an existing object (a node key `graph` reconfigures the parent graph). A document can therefore overwrite methods (`runStep`, `onExecute`), runtime state (`_nodes`, `status`, `libraries`) or the prototype (`__proto__`). A pushed graph must not.
- **Existing pieces:** `graph.validateLinks({repair})` checks a *configured* graph; `LGraph.migrateModes` renumbers modes in place; `SubgraphDefs.toInline` materialises `definitions.subgraphs` ([decision 0001](../memories/decisions/0001-subgraph-definitions.md)), whose links use the virtual nodes -10 and -20.
- Codebase map: [codebase](../memories/codebase/README.md).

## Design choices (recommendation taken)

| # | Question | Options | Taken |
|---|---|---|---|
| 1 | Where the pass lives | a. method on `LGraph`; b. own module `src/graphloader.js` with `LiteGraph.validateGraphData` as the entry | **b**: pure JSON in, report out; no graph instance, no canvas, so the core split (step 7) can move it as is |
| 2 | Input mutation | a. sanitise in place; b. return a cleaned deep copy | **b**: the caller's object is never changed; `data` is `null` when the result is not ok, so a refused document cannot be configured by mistake |
| 3 | Modes | a. one mode; b. strict (default) and `repair: true` | **b**: strict refuses any error (runner). Repair (editor) removes malformed links and the slot references to them, resets malformed slot arrays and clamps bad coordinates. Bounds are never repaired: an oversized document is refused in both modes |
| 4 | Runtime-only fields | a. allowlist of document keys; b. denylist of runtime keys | **b**, with an allowlist for the graph's own keys: keys starting with `_`, `__proto__` / `constructor` / `prototype` (at any depth), members of the `LGraph` / node class prototypes, `on[A-Z]…` callbacks, and the known runtime fields (`graph`, `widgets`, `libraries`, `status`, …) are dropped with a warning. Other unknown keys are kept, because ComfyUI and other editors store their own fields and the library round-trips them |
| 5 | Type policy | a. the runner keeps only `assertAllowedGraph`; b. an `allowType(type, context)` hook in the pass; the runner plugs its policy in | **b**, and the runner still calls `assertAllowedGraph` on the cleaned data afterwards (defence in depth, unchanged messages). Instances of a definition id are not asked about; the definition's nodes are |
| 6 | Limits | constants, options, or settings | **settings** `LiteGraph.Loader.*` with defaults in `GraphLoader.DEFAULT_LIMITS`; `options.limits` overrides per call; without a settings registry the defaults apply |
| 7 | Editor wiring | a. validate inside `configure()`; b. a new `graph.configureValidated(data, options)`, used by `graph.load()` (files and URLs) and the Editor's file drop | **b**: `configure()` stays trusted and unchanged, so fixtures, examples and ComfyUI probes load as before. A `load-report` graph event carries the report; the Editor shows it as a notice. Setting `LiteGraph.Loader.OnOpen` (`repair`, `strict`, `off`) picks the mode |
| 8 | Report shape | strings, or structured issues | **structured**: `{ok, repaired, issues: [{severity, code, path, message, node?, limit?, value?}], counts}`; `GraphLoader.formatReport(report)` gives a short text for logs and notices |
| 9 | Malformed and dangling links in strict mode | warning or error | **error** for a malformed entry and a duplicate id; **warning** for a link naming a missing node or a slot past the stored slots, and for a slot reference to a missing link: `configure()` keeps such links inert and `validateLinks` clears them, and two shipped examples (`audio_reverb.json`, `functions/function_replication.JSON`) contain dangling links. Repair removes all of them |

## Limits (settings)

| Setting | Default | Bounds |
|---|---|---|
| `LiteGraph.Loader.MaxNodes` | 10000 | nodes in the whole document (root, inline subgraphs, definitions) |
| `LiteGraph.Loader.MaxLinks` | 50000 | links in the whole document |
| `LiteGraph.Loader.MaxGroups` | 2000 | groups in the whole document |
| `LiteGraph.Loader.MaxDefinitions` | 1000 | subgraph definitions, nested blocks included |
| `LiteGraph.Loader.MaxDepth` | 32 | nesting of inline subgraphs and definition blocks |
| `LiteGraph.Loader.MaxValueDepth` | 64 | nesting of objects and arrays inside any value |
| `LiteGraph.Loader.MaxStringLength` | 1048576 | characters of any one string |
| `LiteGraph.Loader.MaxPropertiesSize` | 4194304 | approximate JSON size of one node's `properties` (and `widgets_values`) |
| `LiteGraph.Loader.MaxDocumentSize` | 67108864 | approximate JSON size of the whole document |
| `LiteGraph.Loader.MaxCoordinate` | 10000000 | absolute value of positions, sizes, group and IO bounds, reroute positions; they must be finite |
| `LiteGraph.Loader.OnOpen` | `repair` | how `graph.load()` and the Editor's drop validate: `repair`, `strict`, `off` |

## Scope

- In: `src/graphloader.js` (`GraphLoader`, `LiteGraph.validateGraphData`), `graph.configureValidated`, `graph.load()` and the Editor drop wiring, the `load-report` event, the runner worker and manager (structured `report` on refusal, through the WebSocket `error` message), the runner's type hook in `nodePolicy.js`, settings, typings, docs, tests.
- Out: validating inside `configure()`; the ComfyUI import command (`comfy_interop`), which keeps its own path (follow-up); the clipboard paste path; `docs/callbacks.md` (edited by the hooks track; the event is documented in the guide and the typings, the callbacks table is a follow-up after both merge).

## Steps

| # | Step | Acceptance check |
|---|---|---|
| 1 | This plan, with its index row | the row in [plans/README.md](README.md) |
| 2 | Tests first: Jest unit tests per bound, field and link rule; runner integration tests (oversized and malformed graphs refused with a report through the manager and the WebSocket); every example and test fixture validates strict | the new tests fail before the implementation |
| 3 | Implement `GraphLoader`, settings, `configureValidated`, load and drop wiring, runner hook and reports | the new tests pass; existing tests unchanged |
| 4 | Typings, `docs/guide.md`, `docs/architecture.md`, `CHANGES.md`, codebase map; `build: regenerate distributions` | `bun run check` |
| 5 | Merge the latest `LG/dev`, rebuild, local CI, execution record | `npm run ci:local -- HEAD` passes; `Local-CI:` line in the [execution record](../executions/2026-11-25-graph-loader.md) |

## Risks and open questions

- **Too strict for real files:** a legitimate document refused by a default limit. Defaults are generous and are settings; the examples-and-fixtures test guards the common case.
- **Unknown fields kept:** foreign keys are kept (bounded and stripped of prototype keys) for round trips. A node class that reads an unexpected instance field could still see one; the denylist covers callbacks, methods and known runtime fields.
- **`src/lgraph.js` overlap:** the core split (step 7) waits for this track; this change adds one method and touches `load()` only.

## History

- 2026-11-25: proposed and accepted (choices above taken as recommended, per the session brief).
- 2026-11-27: choice 9 corrected while implementing: dangling links are warnings in strict mode, after the examples check found two shipped examples with dangling links.
