# 3D-01: glTF KHR_interactivity import (and export)

| Field | Value |
|---|---|
| Purpose | P3 Scene and game logic (see [purposes](../purposes.md)) |
| Kind | io + node family (`khr/*`) |
| Area | [3D libraries and standards](../landscape/3d-libraries.md) |
| Inspiration | [KHR_interactivity specification](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_interactivity/Specification.adoc); [Babylon Flow Graph import/export](https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF/khrInteractivity); [Khronos authoring tool](https://github.com/KhronosGroup/glTF-InteractivityGraph-AuthoringTool) |
| License of the inspiration | Spec: Khronos. Authoring tool and Babylon: Apache-2.0, `adapt` with NOTICE. Test assets: no license shown, so do not vendor them |
| Effort | L for import; L for export (3D-02); M for the conformance runner (3D-03) |
| Maturity | investigated |
| Depends on | 3D-04 (pointer nodes), 3D-12 (three.js upgrade), NUN-05 (host scene contract) |
| Last reviewed | 2026-11-19 |

## Why

glTF is the common 3D delivery format. KHR_interactivity makes behavior part of that format: a node graph stored in the glTF file, which any conforming engine can run. Babylon already converts it to and from its Flow Graph, and Needle exports Unity Visual Scripting to it.

A web editor that reads and writes these graphs would be useful to everyone producing interactive glTF. litegraph's model is close to the specification:
- flow sockets correspond to event/action slots
- value sockets correspond to data slots
- configuration corresponds to properties

## What it would look like here

- **`khr/*` node family:**
  - One node type per declaration op, covering `math/*`, `flow/*`, `event/*`, `variable/*`, `pointer/*`, `animation/*` and `debug/log`.
  - Generated from a table rather than written by hand [I].
- **Importer:** `importKhrInteractivity(gltfJson, {host})` builds an `LGraph`.
  - `types` and `variables` become graph variables.
  - `nodes[].flows` become event links, `nodes[].values` become data links or widget values, and `configuration` becomes properties.
- **Exporter (3D-02):**
  - Restricted to `khr/*` nodes.
  - Rejects cycles in data, arbitrary script nodes and unsupported types, and reports each problem on the offending node.
- **Runtime:**
  - Flow semantics are synchronous, run-to-completion; `setDelay` and `onTick` need timers.
  - Event dispatch is driven by the host (start, tick, select).
- **Host binding:** `pointer/*` resolves JSON pointers (`/nodes/3/translation`) against a host scene through the host contract (NUN-05). three.js is the first host.
- **Conformance (3D-03):** a `node:test` harness runs the Khronos test assets, fetched locally and not committed, with Babylon or the Khronos engine as the oracle.

## Prior art

- **Babylon** converts on import and exports back, with options `autoStart`, `parseOnly` and `strictValidation`.
- **The Khronos authoring tool** includes a JS engine that reports 2615 of 2622 subtests passing.
- **behave-graph** is the dormant ancestor (ISC).

## Open questions

- Should `khr/*` execution use the existing event-slot machinery, or a separate interpreter that only uses litegraph for editing? The interpreter would be more exact; the slots would be more integrated [I].
- Mapping between object-model pointers and three.js: who owns it, the importer or the host?
- Should the exporter round-trip unknown extensions, as `comfy_interop.js` does for Comfy JSON?
- Spec errata after ratification: pin a specification commit.

## Smallest experiment

`experiments/khr-interactivity/`:
1. Import three of the simplest test assets (a math chain, `flow/branch`, `event/onStart` + `debug/log`).
2. Run them headless with a stub host.
3. Compare the log output with the expected values.

No three.js is needed for this step.

## History

- 2026-11-19: created from the 3D libraries investigation.
