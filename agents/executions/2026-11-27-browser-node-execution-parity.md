# Browser and Node execution parity verification

> **Date** 2026-11-27 · **Kind** execution · **Status** final · **Base** `LG/dev` @ `af3b60e` · **Plan** [browser and Node execution parity plan](../plans/2026-11-27-browser-node-execution-parity.md)

The [comparison command](../../tools/execution-parity/check.mjs) runs [Branch and Counter](../../tools/execution-parity/branch-counter.json), [Linked WaitAll](../../tools/execution-parity/linked-wait-all.json), and [Linked deferred actions](../../tools/execution-parity/linked-deferred-actions.json) in the built editor and the Node runner worker. The optional JSON report records ordered resets, node status, effects and stopped checkpoints.

| Check | Result |
|---|---|
| Initial start | Both hosts emitted one effect with value `1`. |
| Stop and start | Both emitted `2`. The execution-state stream reset and the counter kept its state. |
| Reopen and start | Both emitted `1`. A new graph instance reset the counter. |
| Linked WaitAll | Both hosts recorded no effect while the two instances waited on different inputs. The next start completed A. The third left A waiting again and completed B. Reopening repeated that sequence and both counters emitted `1` again. |
| Linked deferred actions | Under `step`, `strict`, and default `legacy`, both instances delivered one effect each after ordinary stop/start. Reopening the stopped snapshot, clearing on stop, and clearing while already stopped all preserved the Stepper position and produced zero effects on the next start. |
| Unavailable model | Both loaded the graph stopped and saved the requested name and wiring. The editor displayed the reason. Browser Play, Step and an explicit node action and the worker Start command produced no execution trace. |
| Replace a running worker graph | Integration coverage verifies that replacing it with an unavailable model leaves the worker stopped. An explicit Start succeeds after replacing it with an available model. |
| Full validation | `npm run check` passed all 12 builds, lint, type and package checks, 1,151 Jest tests, 46 snapshots, 171 integration tests, 9 browser smoke steps and 5 execution parity cases. |

WaitAll's pending input flags previously used the same field as the node initialization promise. The fix gives them separate state. The event-model tests exercise two successive WaitAll cycles across the supported configurations.
