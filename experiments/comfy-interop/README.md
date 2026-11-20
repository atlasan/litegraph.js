# Experiment: ComfyUI graph JSON interoperability

**Question:** can this fork load, edit, and re-save ComfyUI workflow JSON without loss, and can its own graphs validate against ComfyUI's workflow schema?

**Result (2026-11-18):** with the ~70-line `comfy_adapter.mjs` placeholder approach, yes, at the document level. 7 fixtures round-trip with no configure errors, and every exported file passes Comfy's zod schema, including after edits. The only differences are float32 position rounding and recomputed `order`.

Without the adapter, problems run in both directions:
- **Comfy into ours:** imports silently drop v1 state, reroutes, and subgraph definitions. Placeholder nodes ignore edits.
- **Ours into Comfy:** exports fail validation. Comfy also drops every link because our `version` is not `0.4`.

The full analysis is in [ComfyUI LiteGraph relationship study](../../agents/memories/research/ecosystem-study/2026-11-18-comfyui-litegraph-relationship.md).

## Files

| File | Purpose |
|---|---|
| `lg.mjs` | Loads `build_node/litegraph_nodejs.full.cjs`, plus diff helpers |
| `comfy_adapter.mjs` | `importComfy(json)` / `exportComfy(graph, {version})`: registers `comfy/<Type>` placeholders on demand and stashes unmodelled node and graph keys |
| `probe_import.mjs`, `probe_edge.mjs` | Comfy JSON → our `configure` → `serialize` diff; editing hazards |
| `probe_export*.mjs`, `probe_adapter.mjs` | Our graphs and adapter output validated against Comfy's schema |
| `make_v1.mjs` | Builds synthetic version 1 fixtures from a 0.4 fixture |

## Not included, on purpose

`schema/` and `fixtures/` are not committed:
- Comfy's `workflowSchema.ts` comes from the GPL-3.0 ComfyUI_frontend repository (`packages/graph-model`, no license field).
- Some fixtures also come from that repository.

To rerun the probes, fetch them yourself into a local, ignored directory:
- `packages/graph-model/src/workflowSchema.ts` at ComfyUI_frontend `e10b6bf97d`, with its small helper imports stubbed.
- Fixtures from `src/lib/litegraph/src/__fixtures__`.

Then `npm i zod@4` and run with `node --experimental-strip-types`. Our own graphs need no Comfy files.
