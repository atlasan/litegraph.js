# Wave 5a–5b: packaging, CI build freshness, docs

> **Date** 2026-11-21 · **Kind** execution · **Status** final · **Base** `LG/wave5b_ci_docs` · **Plan** [Wave 5](../plans/2026-11-21-wave5-repository-packaging.md), for the [pre-release 0.18.0-dev.1](../plans/2026-11-20-pre-release-0.18.0-dev.1.md)

Parts 5a and 5b of Wave 5, with the pre-release's D7 and loose-end fixes that came before them. Wave 4 ran in parallel in its own session; 5c (the apps move) waits for 4e.

## Changes

- `17e357a` `fix:` **D7, runtime advisories from 12 to 0:**
  - `engine.io` 6.6.11 and `engine.io-client` 6.6.7 are pinned by overrides, as the newest fixed releases at least two weeks old.
  - Also: `socket.io-adapter` 2.5.8, `socket.io-parser` 4.2.7, `brace-expansion` 2.1.7 / 1.1.21 (overrides), and the nested `ws` 8.21.3.
  - `js-beautify` moves to devDependencies (only `build.py` uses it).
  - The release notes were read: bug and security fixes only, nothing breaking.
- `fix:` loose ends, on `LG/release_loose_ends`:
  - Ctrl+drag on a group title moves the group without its nodes. This was a path from Wave 2b that no gesture reached.
  - "Insert subgraph › From file…" with `canvas.pickBlueprintFile`.
  - Right-click on a missing node's body was checked in the browser: it works, so the note in the 4a record does not reproduce.
- `1c3a38d` `feat:` **5a, truthful packaging:**
  - **Dependencies:** no required dependencies. The squatted placeholders (`fs`, `http`, `path`, `vm`, `child_process`), `osc` and `uglifyjs` are removed. The integrations used by node types are `optionalDependencies`, and the runner-only `dotenv` and `winston` are devDependencies.
  - **Missing packages:** a missing optional package is named with its install command, and Node 18+ `fetch` is used before `node-fetch`.
  - **Exports:** each artifact is listed by its path; the wildcards are gone.
  - **No debug defaults in builds:** full builds no longer include `editor/js/defaults_debug.js`. It had turned on `LiteGraph.allow_scripts`, debug logging and the editor's UX flags for every consumer of a full bundle.
  - **Build check:** `check:build` enforces all of this.
- 5b on `LG/wave5b_ci_docs`:
  - **CI:** `npm run check:fresh`, and a CI step `git diff --exit-code -- build build_node` after `npm run check`.
  - **Docs:** `docs/getting-started.md` (install, entries, browser and Node examples, save and load, apps) and `docs/architecture.md` (builds, layers, graph model, execution, subgraphs, platform, safety defaults). The README covers ESM loading, optional packages, the pre-release status and the new features. `development.md` and `AGENTS.md` link the new pages.

## Verification

| Check | Result |
|---|---|
| `npm audit --omit=dev` | 0 vulnerabilities (was 12: 10 high, 2 moderate) |
| `npm run check` after each part | 522 → 523 Jest; after merging Wave 4b, 535 Jest and 95 integration tests; 12 builds; exports and dependency checks |
| `check:fresh` | passes on the committed builds; a build edited by hand makes it fail (exit 1) |
| Getting-started Node example | runs as written (`watch.value = 1`); `/core` contains the canvas, as documented |
| Doc links | none broken in README, getting-started or architecture |
| Browser `editor_build.html` | missing node: the body right-click opens the node menu (the loose-end check) |

## Left open

- **5c**, the apps move (W5-3: old URLs keep working), after Wave 4e lands in `LG/dev`.
- **The full-build behaviour change** goes in the release notes: consumers who relied on `defaults_debug.js` (scripts on, debug logging) now set those flags themselves.
