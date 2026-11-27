# Classic browser build and WebGLStudio compatibility

> **Date** 2026-11-27 · **Kind** execution · **Status** final · **Base** `LG/dev_plan` @ `f80ca96` and WebGLStudio `feature/lfs-opt-in` @ `e4e3ab9`

The initial [legacy-project milestones](../plans/2026-11-27-legacy-projects-and-editor-integration.md) now have a separate classic build and two-runtime browser verification. The classic build comes from the same browser sources and node catalog as the ESM entry. It publishes the globals the host uses before LiteScene loads. Its output lives in `.lg/classic-build/`. Package builds and milestone snapshots retain their existing paths.

WebGLStudio kept its bundled LiteGraph as the control. Its graph and shader inspectors now signal that they handled the double-click. The graph widget lets the canvas handle its own keys, and the shared WebGL canvas measures characters outside its font atlas without throwing. The mobile page respects the same file-server opt-in as the desktop editor. Player export stops requesting files once the ZIP contents are ready.

## Verification

- LiteGraph's `npm run check` passed on Node 22.23.5 and Firefox 141.0, using the installed Firefox executable directly. Jest passed 1,151 tests, integration passed 172 tests, Firefox smoke passed 9 checks, and browser/Node execution parity passed 5 cases. The gate includes `check:classic` for global identity, execution, and duplicate-load refusal.
- `node tools/check-build.mjs --snapshot` confirmed that all 12 existing module artifacts match the tracked milestone bytes.
- WebGLStudio's `node test/legacy-compat/verify.mjs <litegraph.classic.js> [chromium executable]` passed with both the bundled and classic scripts. The inputs were a scene with inline logic and FX and an external `GraphCode`, all serialized using WebGLStudio's bundled runtime. The browser checked scene updates, save/reopen, metadata, FX viewport pixels, graph keyboard input, both inspector hooks, scene-node drops, and shared WebGL canvas drawing.
- The same browser command checked desktop player execution, mobile startup and playback through the player API with the file server off, and offline playback from the ZIP exported by each pipeline. Each ZIP contained the exact LiteGraph script selected by its editor deployment.

## Remaining coverage

Broader existing projects, mobile file-server sessions, legacy shader-material compilation, and export of newer execution semantics to the older runtime require their own fixtures. Both repositories retain uncommitted changes for review.
