# Groups, notes and reroutes

> **Updated** 2026-11-25 · **Kind** idea area · **Status** living

Ideas `GRP-01`–`GRP-08`. Source: the user's findings of 2026-11-23 (`agents/human_feed/261123_findings_and_ideas.txt`), items 2 and 3. Current delivery is reconciled by the [2026-11-25 audit](../../audits/2026-11-25-capabilities-and-gaps.md): title/body drag and group modes shipped; broader ambitions remain partial.

**Question:** how should groups grow from a coloured rectangle with a title into the organising tool of a graph (frames, comments, bypass regions, nested sections), staying compatible with legacy litegraph, ComfyUI and WebGLStudio documents? And do reroutes hold up against ComfyUI documents?

**Reuse rule:** the ComfyUI frontend is GPL-3.0, so it is a design reference only (`ref`). The standalone `Comfy-Org/litegraph.js` (MIT, at or before `ea0e1a8`) may be adapted with attribution ([AGENTS.md](../../../AGENTS.md#rules)).

## Where the repository is today

These facts are from reading `LG/dev` @ `bb9af60`:
- **`LGraphGroup`** (`src/lgraphgroup.js`): `title`, `bounding`, `color`, `font_size`; unknown fields from other editors (`id`, `flags`, `locked`) are kept for `serialize`. `move`, `resizeTo`, `recomputeInsideNodes`.
- **Canvas** (`src/lgraphcanvas.js`): a click on the title band selects the group, a drag moves it with its nodes (Ctrl moves it without them), the corner triangle resizes it, a header toggle sits at the right end of the title band. Options `groups_title_font`, `groups_title_alignment`, `groups_title_font_size`, `groups_title_wrap` (multiline titles).
- **Reroutes** (`src/reroute.js`, Wave 2b): floating reroutes with parent chains; the document form follows ComfyUI 0.4 (`extra.reroutes`, `extra.linkExtensions`); `comfy_interop.js` maps the versions. Legacy `Reroute` nodes from old graphs still load as nodes.

## Ideas

| ID | Idea | Compatibility notes |
|---|---|---|
| GRP-01 | Title-only drag: only the title band moves a group; a press in the body starts a box selection or pans, as in ComfyUI | Behaviour change: a setting, default to be decided by the user |
| GRP-02 | Nested groups: a containment tree, moving a group moves its child groups, drawing order by depth | Legacy documents have flat groups; nesting can be derived from geometry, so no format change is needed [I] |
| GRP-03 | Group modes: bypass, mute or disable every contained node from the group header | BYPASS = 4 and ON_REQUEST = 5 since decision 0004; use constants and the existing document migration. Group modes already have an API/menu |
| GRP-04 | Group styling: palette colour, title font and size, alignment, a type or kind (frame, note, region) | Store only fields other editors ignore or already know (`font_size`, `color`, `flags`) |
| GRP-05 | Groups as comments: a multiline text body (plain or sanitized markdown), a mode that does not capture nodes | Links CFY-18 (markdown service) |
| GRP-06 | Better drag and resize: handles on every edge and corner, snapping, "fit to nodes", locked groups | ComfyUI stores `flags.pinned`; LiteGraph kept `locked` in unknown fields |
| GRP-07 | Reroute audit: round-trip ComfyUI 0.4 and 1.0 documents with reroutes, legacy `Reroute` nodes, links through reroutes inside subgraphs; add the missing tests | Verification first, fixes after |
| GRP-08 | Group actions: collapse to the title band, select contents, convert to subgraph, align contents | Collapse needs a stored flag; ComfyUI uses `flags.collapsed` [I] |
