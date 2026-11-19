# Working in this repository

Short operational notes for contributors and coding agents. Keep this file referential: architecture and plans live in the documents it links to.

## Where things are

| Need | Go to |
|---|---|
| Current work, waves, open decisions, branch model | [planning/roadmap.md](planning/roadmap.md) |
| Plans, decisions and the lifecycle | [planning/README.md](planning/README.md) |
| Setup, validation gate, package contracts | [docs/development/README.md](docs/development/README.md) |
| Research on ComfyUI, LiteGraph-TSX and plugins | [docs/development/ecosystem-study/README.md](docs/development/ecosystem-study/README.md) |
| Dated code reviews | [docs/development/audits/README.md](docs/development/audits/README.md) |
| Changes per version | [CHANGES.md](CHANGES.md) |

## Workflow

- **Branches:**
  - `LG/dev` is the progressive integration branch; cut `LG/wave<N>_<topic>` branches from it and merge them back.
  - `master` changes only through reviewed PRs.
- **Gate:** run `npm run check` before every commit that touches code. It runs lint, all 12 builds, strict type consumers, Jest, the node:test integration tests and the package check.
- **Generated output:** `build/` and `build_node/` are committed. Regenerate them with `npm run build` and commit them separately (`build: regenerate distributions ...`) after the `fix:` / `feat:` / `docs:` commit.
- **New `src/` modules:**
  - Add them to the file lists in `build.py`, in dependency order.
  - Declare new public exports in `src/litegraph.d.cts`, or `src/litegraph.node.d.cts` for the Node bundle. `check:types` fails when the declared exports and the runtime exports differ.
- **Docs:** update the behaviour docs, the [roadmap](planning/roadmap.md) and `CHANGES.md` with the change that makes them true.

## Rules

- **Provenance:**
  - Adapt code only from the MIT standalone `Comfy-Org/litegraph.js` at or before `ea0e1a8`, with attribution.
  - The ComfyUI frontend (GPL-3.0, with ambiguous `src/lib/litegraph` changes after the merge) is a design reference only.
  - Check the license of every plugin before reusing anything; see the license tables in the ecosystem study.
- **Dependencies:** pick versions that are at least two weeks old, and read the changelog before upgrading.
- **Runner security:** `headless/graphrunner` executes pushed graphs. Keep the Origin/Host checks, the recursive node-type denylist (`nodePolicy.js`) and the script lockdown (`LiteGraph.allow_scripts` is off unless `RUNNER_ALLOW_SYS=1`).
- **Mode 4:** mode 4 means ON_REQUEST here and BYPASS in ComfyUI. `comfy_interop.js` maps them explicitly; never reuse 4 for bypass.

## Gotchas

- `editor/index.html` loads `src/` modules **without** the extensions. Use `editor/editor_build.html` to exercise the extensions, commands and key bindings in a browser (`npm run editor`, port 8000).
- **Undo history:** the first saved change on a fresh graph becomes the first history entry; there is no empty baseline. Tests that check "one undo step" need an earlier change first.
- **Edit paths:** use `graph.transact(label, fn)` for anything a user should undo in one step. `beforeChange`/`afterChange` are hooks only; the pointer paths call them asymmetrically.
- **`LGraphCanvas.active_canvas`** is set by pointer down and by keydown. Prefer `this` (the canvas instance) in new code.
- **jsdom tests:**
  - jsdom has no 2D context: stub `HTMLCanvasElement.prototype.getContext` (see `test/canvas-lifecycle.test.js`).
  - `innerText` is not supported.
  - Spy on `LGraphCanvas.prototype.draw` before constructing a rendering canvas.
- **Host header:** Node's `fetch` silently drops a custom `Host` header; use `http.request` to test Host checks.
- **Jest** ignores `.claude/`, where agent worktrees live. Without that, their test copies run twice.
