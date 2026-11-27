# LiteGraph host support and pipeline integration

> **Date** 2026-11-27 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `6d65e20` · **Plan** [Pipeline and priorities](../plans/2026-11-27-pipeline-priority-review.md)

The merge integrates the classic browser build, host-driven start, and their tests and records. The conflict resolution kept the previous integration proof and the current priority links. `LG/dev` advanced to the tested merge. Both downstream repositories have their own project and runtime fixtures.

## Verification

Clean-clone run `6d65e20-20261127T174510Z` used Node 22.23.5 and Firefox 141.0.

```text
Local-CI: pass 6d65e20 node22.23.5 jest 1152/1152 int 172/172 browser 9/9 execution parity 5/5 snapshot ok audit 0 pack 9/9 comfy skip bun 169/172 (advisory)
```

The required suite included the classic build smoke test. The tracked milestone bundles stayed at their prior bytes. The optional workflow interoperability probes skipped because their local inputs were absent. Bun reported three advisory failures, matching the preceding integration proof. A Linux quick-start smoke started the editor on Bun, confirmed the HTTP route, restarted on Node, confirmed the docs route and stopped the process.

The priority audit compared GitHub's `f838107` documentation branch with the integration baseline, recounted all catalog IDs and used the node-reference harness for current metadata counts. It carries the 11 backlog IDs into the current catalog and links the historical snapshot at its commit.
