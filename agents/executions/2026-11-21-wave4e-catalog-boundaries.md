# Wave 4e: catalog cleanup and subgraph-boundary reroutes

> **Date** 2026-11-21 · **Kind** execution · **Status** final · **Base** `LG/wave4e_catalog` @ `7dd4ef4` · **Plan** [Wave 4: ecosystem and workspace](../plans/2026-11-20-wave4-ecosystem-workspace.md)

Part 4e delivered plan steps 17–18 on `LG/wave4e_catalog`, cut from `LG/dev` @ `607db15`: the catalog cleanup through 4a's replacement mappings, and reroutes kept across subgraph conversion and unpack (the last Wave 2 carry-over). This completes Wave 4.

## Changes

- `5d4d5a4` `feat:` catalog cleanup and boundary reroutes:
  - **One watch node:** `basic/watch` has a `display` property: `value` (the classic label), `text` (the former `basic/watch_advanced`: multiline text, font options, its menu), `tree` (the former `watch/value` JSON viewer, contributed by `watch.js` as a display). Displays are `Watch.displays` entries; the old classes stay as implementations. `basic/watch_advanced` and `watch/value` are no longer registered; `auto` mappings load them as `basic/watch` with their display and properties.
  - **Network and process names:** `network/server/{websocket, socketio, osc, udp, osc_bridge}` (were `server/network/websocketserver`, `nodejs/network/*`), `network/socketio` (was `network/SocketIO`), `sys/processInfo` (was `server/process/NodeProcessInfo`). The category roots `server/`, `nodejs/` and `watch/` are gone. `auto` mappings keep old documents loading; capabilities are declared on the new names.
  - **jQuery:** `src/nodes/jquery.js` (in no build, needing jQuery) removed, with its script tag in `editor/editor_debug.html`; `jquery/select` is offered (not automatic) as `html/dom_selector`.
  - **Runner policy:** the families use the new names; `RENAMED_TYPES` / `renamedType` map old names, so workflows with old names are checked as the type they load as, and old entries in `RUNNER_ALLOW_TYPES` / `RUNNER_DENY_TYPES` keep working. The worker falls back to this table when no mapping is registered.
  - **Reroutes across the boundary:** `Subgraph.buildFromNodes` keeps the points of crossing links outside the selection's box on the outer links and moves the inside points (and internal links' chains) into the subgraph; `unpack` joins the outer, inner and outer chains again. Reroutes are created without history entries; both stay one undo step.
  - **Fixes found while building:** a document whose placeholders were all replaced automatically still made `configure` return an error, so the runner refused it (4a); a replacement now keeps the node's size; renamed types load without a "Node not found" warning.
- `7dd4ef4` `build:` regenerated distributions.

## Verification

| Check | Result |
|---|---|
| `npm run check` | lint clean, 12 builds, strict types and export parity, **557/557 Jest** (up from 553), **97/97 integration** (up from 96) |
| New tests | <ul><li>`catalog-boundaries.test.js` (4): old watch types load as `basic/watch` (display, font and clip properties, links, size) with no load error and are not saved back; the three displays run and draw; convert keeps reroutes on each side, the subgraph runs (3 × 2 = 6), unpack joins four points in order, two undo steps restore; an internal link's reroute moves inside</li><li>`tools/tests/catalog-renames.test.mjs`: in the Node bundle every renamed type is unregistered, mapped `auto` to a registered type, and an old document loads without error</li><li>`runner-security.test.mjs`: new family names; old workflow names refused as their new names; old allow and deny entries still apply</li><li>`network-lifecycle`, `node-dependencies`, `runner`: the server and process nodes under their new names; the runner workflow with `server/network/websocketserver` and the old `RUNNER_ALLOW_TYPES` entry still runs</li></ul> |
| Browser, `editor_build.html` (port 8001, real clicks) | <ul><li>A document with `basic/watch_advanced` (Courier 18) and `watch/value` loads with no missing-nodes panel: both are `basic/watch`, keep their 200 × 80 and 240 × 160 sizes, and after Step show "7.000" in Courier and the JSON tree.</li><li>A → A + B → Watch with four reroutes: right-click A + B → "Convert to subgraph": the three reroutes outside the node's box stay on the outer links, the one inside moves into the subgraph.</li><li>Fixed during the check: the replaced watch nodes first came back at the default 60 × 30.</li></ul> |

## Left open

- `color/palette`, `input/gamepad` and `litegraph/*` keep their single-type roots; `shader::*` is the shader graph's own namespace.
- The split rule uses the selection's bounding box (20 px margin): a reroute just outside it stays outside.
- **Wave 4 is complete**; the Wave 5 apps move (5c) can start.
