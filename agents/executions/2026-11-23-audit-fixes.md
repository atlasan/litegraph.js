# State audit fixes before the release (D-5 to D-8, library badges, `npm run docs`)

> **Date** 2026-11-23 · **Kind** execution · **Status** final · **Base** `LG/dev_audit_fixes` from `LG/dev` @ `bb9af60` · **Plan** [Pre-release 0.18.0-dev.2](../plans/2026-11-23-pre-release-0.18.0-dev.2.md) (follow-up; the user asked for both the left-open items and the FIX backlog except D-4)

The items left open by the [0.18.0-dev.2 checks](2026-11-23-pre-release-0.18.0-dev.2.md) and the [state audit](../audits/2026-11-23-state-audit.md)'s FIX items D-5 to D-8, on a parallel branch merged into `LG/dev` before the release. D-4 (call scopes) stays flows step 4.

## Changes

- `58c0409` `feat:` library badges: "loading libraries" while a node waits for its libraries, "library error" (the message as its title) when they failed; setting `LiteGraph.Node.LibraryBadge`, default on. This closes the [fork inventory](../audits/2026-11-19-fork-inventory.md)'s "show library state in the node UI", which no earlier change had done.
- `c98a6c3` `fix:` D-5: `graph.triggerInput` called `onTrigger` on the nodes with the title, a method no bundled node has, so it threw a TypeError, and it bypassed the engine. It now runs each node with `doExecute(value)` (model rules, execution state, `node-error`), drops NEVER nodes with `event-dropped` (`mode`), and still calls a node's own `onTrigger` method inside the event entry. D-6: assigning `graph.executionModel` calls `setExecutionModel` (one undo step; an unknown name throws); the declaration is no longer `readonly`.
- `33b7ea5` `fix:` D-8: `o:` / `i:` probe a type without `def` slots and without a registry entry once (`new Class()`, cached per class); a throwing constructor leaves the type without slot types.
- `docs:` `npm run docs` exits 0: the JSDoc plugin `docs/jsdoc-ts-types.cjs` replaces the TypeScript-style types catharsis cannot parse (`function`, `Object` or `*`) and keeps the original text in the description; two bare `@returns` tags got a type. `docs/api` regenerated (88 pages). `CHANGES.md`, guide (badge setting), `docs/development.md`, roadmap, this record.
- `build:` regenerated distributions.

## Verification

| Check | Result |
|---|---|
| New tests, failing before their fix | `test/library-badge.test.js` 2 of 3 failed before (the third checks the setting hides badges); `test/graph-api-fixes.test.js` 5 of 6 failed before (the sixth checks a custom `onTrigger`); `test/node-search.test.js` 2 new, both failed before |
| `npm run check` | pass: 933/933 Jest (52 suites), 125/125 integration, 12 builds, strict types, export parity, declared events and hooks, package check |
| `npm run docs` | exit 0, 0 errors (was 182 errors, exit 1); 88 pages |
| Browser, `editor_build.html` (port 8001) | two nodes with a pending and a failed library draw "loading libraries" and "library error" title badges; `LiteGraph.VERSION` `0.18.0-dev.2` |
| D-7, browser, real mouse (`index.html` and `editor_build.html`) | **not reproducible**: a node drag then a right-click on the canvas opened the canvas menu in 4 variants (drag and right-click elsewhere; right-click on the dragged node; with a menu open before the drag; a drag released outside the canvas). No change made |

## Left open

- **D-7:** not reproducible here; reopen with exact steps if it shows again.
- **D-4** (call scopes): flows step 4, after the release.
- **The probe in D-8** constructs a node instance for types without slot information; with `auto_load_slot_types` on (the editor) the registry already has them and nothing is probed.
