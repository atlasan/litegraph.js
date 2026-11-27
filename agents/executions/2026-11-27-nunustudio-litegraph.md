# LiteGraph scripts in nunuStudio

> **Date** 2026-11-27 · **Kind** execution · **Status** final · **Base** LiteGraph `LG/dev_plan` @ `f80ca96` and nunuStudio `threejs-r187` @ `ef1ec458`

The nunuStudio milestone in the [editor integration plan](../plans/2026-11-27-legacy-projects-and-editor-integration.md) has a concrete host integration. nunuStudio uses a pinned LiteGraph ESM build in the editor and exported runtime. LiteGraph's `start(0, { manual: true })` runs the regular start lifecycle while nunuStudio owns the frame loop. Stop disposes the graph's active lifecycle and drops queued actions.

The project loader opens the earlier `LiteGraphScript` object format. The position graph uses the prototype's `nunu/object` and `nunu/position_set` node IDs. The object node resolves its UUID against the script's scene when it runs, so the same binding works in the editor, its Play clone, and the exported player. The host graph tab uses normal LiteGraph editing and disposes its canvas on close. The Escher `NodeScript` loader retains its own format and parser.

## Verification

- LiteGraph `npm run check` passed, including 1,152 Jest tests, 172 integration tests, nine Firefox smoke checks, and five browser/Node parity cases. The new test covers host-driven starts after asynchronous cleanup.
- WebGLStudio's compatibility harness passed with both its bundled and classic builds after this change.
- nunuStudio passed all 16 Playwright tests and its static checks across 411 files. The integration coverage uses a project reconstructed from the earlier host format. The editor test exercises binding, save/reopen, Play and Stop and plays the actual web ZIP. The standalone test verifies moving the scene object, pausing, stopping, and an Escher save/reopen.

Broader prototype projects and graph materials remain additional fixture and integration work.
