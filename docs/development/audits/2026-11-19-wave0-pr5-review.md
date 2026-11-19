# PR #5 (Wave 0) independent verification

Date: 2026-11-19. Status: **audit**. This is an independent review of [PR #5](https://github.com/atlasan/litegraph.js/pull/5) (`LG/wave0_safety`), made by a separate agent session in its own worktree.

**Follow-up since the review:**
- The two fixes below were merged into `LG/wave1_platform` and `LG/dev`.
- Finding 4 (search insert could not be undone) was fixed in Wave 1.
- PR #5 was merged into `master` on 2026-11-19, together with the two fixes; the review was also posted [on the PR](https://github.com/atlasan/litegraph.js/pull/5#issuecomment-7024003348).
- Finding 3 is partly settled by [PR #6](https://github.com/atlasan/litegraph.js/pull/6), which is merged into `master` and `LG/dev`.
  - `sys/fileRead` and the network server nodes are now denied by default.
  - New opt-ins: `RUNNER_ALLOW_TYPES`, `RUNNER_ALLOW_SCRIPTS`, `RUNNER_ALLOWED_ORIGINS` and `LibraryManager.allowAnyPackageSpec`.
  - Every refusal names the setting that lifts it.
  - [PR #7](https://github.com/atlasan/litegraph.js/pull/7) denies the rest of finding 3 (host inspection, outbound requests, `mysql/*`), grouped into families that `RUNNER_ALLOW_TYPES=@<family>` re-allows. Decision D1 in the [roadmap](../../../planning/roadmap.md) is settled.

Pushed to `LG/wave0_safety` (fast-forward, 7f2c8e3..547e2b3):
- 085ceaa fix: runner Host check accepts IPv6 HOST and default-port Origins
- 547e2b3 fix: runner disables script nodes unless RUNNER_ALLOW_SYS=1
No `src/` changes, so `build/` stays as is (check:build passes).

## Results
- `npm run check`: lint clean, 12 build artefacts, types OK, Jest 311/311, node:test 87/87 (before and after my fixes).
- `npm run build` + `git diff --exit-code build build_node`: fresh.
- CI `validate`: pass (both runs, before my push; a new run is due for 547e2b3).

## Findings
1. HIGH, fixed (547e2b3). Runner RCE through script nodes bypassed the denylist.
   The Node build sets `LiteGraph.allow_scripts = true` (from editor/js/defaults.js, build_node/litegraph_nodejs.full.cjs:49397).
   Repro on 7f2c8e3: `open_graph` → `update_graph` with `{type:'math/formula', properties:{formula:"process.getBuiltinModule('fs').writeFileSync(...)"}}`
   → `control_graph start` → the file is written. `basic/script` and `objects/evaluate` are gated by the same flag.
   Fix: graphRunner.js sets `allow_scripts = scriptsAllowed()` (that is, RUNNER_ALLOW_SYS=1). `geometry/eval` is denied because it compiles without checking the flag.
   runner.test.mjs now asserts that the formula stays inert (verified that it fails when allow_scripts is forced true).
2. LOW, fixed (085ceaa). `HOST=fe80::1` or `RUNNER_ALLOWED_HOSTS=fd00::5` (an unbracketed IPv6 address) never matched the parsed Host `[fe80::1]`, so every request got 403.
   Also, Origin `http://localhost` vs Host `localhost:80` was refused; the comparison now normalises through URL.
3. INFO, debatable, not changed. Node types that are not denied in the runner:
   - `sys/fileRead`, `sys/fileList`, `sys/fileExists`, `sys/processList`, `sys/serviceList`, `sys/info`: read and enumerate host data. The test explicitly allows fileRead.
   - `mysql/*`: SQL with credentials from the workflow.
   - Listening servers: `server/network/websocketserver`, `nodejs/network/{SocketIO_server,OSC_server,UDP_server,osc_bridge}`.
   - `network/httprequest`, `network/websocket`, `basic/file`: SSRF from the runner host.
   Decide whether the runner's threat model includes these; a `RUNNER_DENY_TYPES` preset or an allowlist would close them.
4. INFO, pre-existing, not in the diff. A node inserted from the search box is not undoable.
   lgraphcanvas.js:7626 calls `graph.add(node, false, {doProcessChange:false})`, so no history entry is recorded (with `LiteGraph.actionHistory_enabled = true`, `actionHistoryBack()` after the insert does not remove it).
   The editor also ships with `actionHistory_enabled = false`.
5. INFO. `LibraryManager.isSafePackageSpec` allows `^`. On Windows, execFile with `shell:true` sends it through cmd.exe, where `^` is the escape character: `pkg@^1.2` becomes `pkg@1.2`.
   It changes the version semantics but is not an injection. Node 24 also warns (DEP0190) about args combined with shell:true.

## Reviewed OK (no defect found)
- CallbackHandler: stop_replication/default, result_priority, is_default via `data`, call_once before invoke (the filter replaces the array, so iteration is safe).
  No src/editor/extension code returns stop_replication (keyboard_helper and editor_debug.html have it commented out). autoconnect's call_once still works.
- Removing the second `callbackhandler_setup()`: nothing registers between the two calls in core, so nothing depends on a fresh handler.
- `setCanvas` rebind/unbind, the `canvas.data` handoff, `tabIndex` (keeps an existing attribute), dispose (idempotent, clears active_canvas), the render-loop token (Jest).
- Subgraph view save/restore, including two levels deep (checked in the browser). `getTopGraph` works on a fresh canvas.
- Search-box try/finally and the timer cleared on close.
- LGraphGroup.getBounding: the old version returned nothing and used a node-style title offset. Nested groups now move once and their nodes are not double-moved (move() mutates `group.pos` and does not recurse).
- `validateLinks`: string keys versus numeric ids are handled with `==` and `String()`; it is not type-specific, so event links work; multiple links per output work; duplicate links targeting one input are handled.
- `waitAllLibrariesLoaded`: entries are deleted in finally, so the loop terminates; the race handles the late rejection.

## Browser (editor :8000, runner :3000)
- Multiview on/off: the second canvas is disposed (is_rendering false, listeners unbound), `canvas.data` goes back to the main canvas, and the main canvas stays bound.
  The pane was hidden, so rAF never fired and frame-by-frame rendering could not be observed; the render loop is covered by Jest only.
- Search insert (math/formula) works and the box closes. Undo: see finding 4.
- Subgraph open/close restores offset and scale and selects the subgraph node.
- Runner page connects (`active_graphs` reply). A WebSocket from origin :8000 is refused, and the server logs `Rejected WebSocket connection (origin: http://127.0.0.1:8000…)`.
- HTTP with a foreign Host gets 403; `Host: [::1]:3000` gets 200.
