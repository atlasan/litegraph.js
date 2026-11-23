# Working in this repository

Short operational notes for contributors and coding agents. Keep this file referential: architecture and plans live in the documents it links to.

## Where things are

| Need | Go to |
|---|---|
| Start: install, entries, first graph, apps | [docs/getting-started.md](docs/getting-started.md), [docs/architecture.md](docs/architecture.md) |
| Use the library: guide, callbacks, generated API | [docs/](docs/guide.md) |
| Setup, validation gate, package contracts | [docs/development.md](docs/development.md) |
| The agent workspace: memories, plans, executions, audits, ideas | [agents/](agents/README.md) |
| Current work, waves, open decisions, branch model | [agents/plans/roadmap.md](agents/plans/roadmap.md) |
| Codebase map | [agents/memories/codebase](agents/memories/codebase/README.md) |
| Ideas (not planned work) | [agents/ideas](agents/ideas/README.md) |
| Changes per version | [CHANGES.md](CHANGES.md) |

## Workflow

- **Branches:**
  - `LG/dev` is the progressive integration branch.
  - Parallel work runs on temporary `LG/dev_<topic>` branches cut from it and merged back; it gets a named track on the roadmap, not a wave number.
  - Waves (`LG/wave<N>_<topic>`) are milestones with a build and verification pass.
  - `master` changes only through reviewed PRs.
- **Gate:** run `npm run check` before every commit that touches code. It runs lint, all 12 builds, strict type consumers, Jest, the node:test integration tests and the package check.
- **Generated output:** `build/` and `build_node/` are committed. Regenerate them with `npm run build` and commit them separately (`build: regenerate distributions ...`) after the `fix:` / `feat:` / `docs:` commit.
- **New `src/` modules:**
  - Add them to the file lists in `build.py`, in dependency order.
  - Declare new public exports in `src/litegraph.d.cts`, or `src/litegraph.node.d.cts` for the Node bundle. `check:types` fails when the declared exports and the runtime exports differ.
- **Docs:** update `docs/`, the [roadmap](agents/plans/roadmap.md) and `CHANGES.md` together with the change that makes them true. `docs/` holds only the generated API (`docs/api/`) and the reference pages.

## Records

Write every plan, run, review, research note and idea as a file in [agents/](agents/README.md), never only in chat:

| Record | Where | Template |
|---|---|---|
| Plan or proposal | `agents/plans/YYYY-MM-DD-topic.md` | [plan](agents/_templates/plan.md) |
| What was done, with its checks (one per wave or run) | `agents/executions/YYYY-MM-DD-topic.md` | [execution](agents/_templates/execution.md) |
| Review at a commit | `agents/audits/YYYY-MM-DD-topic.md` | [audit](agents/_templates/audit.md) |
| Research, findings | `agents/memories/research/YYYY-MM-DD-topic.md` | [research](agents/_templates/research.md) |
| Architectural decision | `agents/memories/decisions/NNNN-topic.md` | [decision](agents/_templates/decision.md) |
| Idea | a row in `agents/ideas/catalog.md`; a card when it needs a sketch | [idea card](agents/_templates/idea-card.md) |

- **Name and header:** name records with the date they were written. Start each one with `> **Date** … · **Kind** … · **Status** … · **Base** branch @ commit`.
- **Index:** add a row to the folder's `README.md` in the same commit.
- **Living documents:** the roadmap, the codebase map and the catalog are corrected in place. Dated records are not rewritten; a newer record supersedes them.
- **After code changes:** if a change makes the [codebase map](agents/memories/codebase/README.md) wrong, fix the map in the same change.

The full conventions are in [agents/README.md](agents/README.md).

## Rules

- **Provenance:**
  - Adapt code only from the MIT standalone `Comfy-Org/litegraph.js` at or before `ea0e1a8`, with attribution.
  - The ComfyUI frontend (GPL-3.0, with ambiguous `src/lib/litegraph` changes after the merge) is a design reference only.
  - Check the license of every plugin before reusing anything; see the license tables in the ecosystem study.
- **Dependencies:** pick versions that are at least two weeks old, and read the changelog before upgrading.
- **Runner security:** `apps/runner` executes pushed graphs. Keep the Origin/Host checks, the recursive node-type denylist (`nodePolicy.js`) and the script lockdown (`LiteGraph.allow_scripts` is off unless `RUNNER_ALLOW_SYS=1`).
- **Modes 4 and 5:** mode 4 is BYPASS (as in ComfyUI) and 5 is ON_REQUEST since mode numbering 2 ([decision 0004](agents/memories/decisions/0004-mode-4-bypass.md)). Use the constants, never the numbers. Documents from before are renumbered on load by `LGraph.migrateModes`; `tools/migrate-modes.mjs` rewrites files.

## Gotchas

- `apps/editor/index.html` loads `src/` modules **without** the extensions. Use `apps/editor/editor_build.html` (served at `/editor/...`) to exercise the extensions, commands and key bindings in a browser (`npm run editor`, port 8000).
- **Undo history:** the first saved change on a fresh graph becomes the first history entry; there is no empty baseline. Tests that check "one undo step" need an earlier change first.
- **Edit paths:** use `graph.transact(label, fn)` for anything a user should undo in one step. `beforeChange`/`afterChange` are hooks only; the pointer paths call them asymmetrically.
- **`LGraphCanvas.active_canvas`** is set by pointer down and by keydown. Prefer `this` (the canvas instance) in new code.
- **Node classes:** registered node classes often do **not** extend `LGraphNode`, because registration copies its methods. `x instanceof LGraphNode` is therefore unreliable; use `LGraphCanvas.isNodeItem(x)`.
- **Widgets:** per-type behaviour lives in `src/widgets.js`. Add new types with `LiteGraph.registerWidgetType`; don't add cases to the canvas.
- **New pointer interactions:** assign `this.pointer.onDragStart` / `onDrag` / `onDragEnd` / `finally` at pointer down, as `_dragRerouteGesture` does. The canvas then skips its legacy move handling for that gesture.
- **jsdom tests:**
  - jsdom has no 2D context: stub `HTMLCanvasElement.prototype.getContext` (see `test/canvas-lifecycle.test.js`).
  - `innerText` is not supported.
  - Spy on `LGraphCanvas.prototype.draw` before constructing a rendering canvas.
- **Host header:** Node's `fetch` silently drops a custom `Host` header; use `http.request` to test Host checks.
- **Jest** ignores `.claude/`, where agent worktrees live. Without that, their test copies run twice.
