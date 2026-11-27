# Browser and Node execution parity

> **Date** 2026-11-27 · **Kind** plan · **Status** done · **Base** `LG/dev` @ `af3b60e`

Run the same saved `ancestors` graph in the built browser editor and the Node runner. Compare ordered execution and effect traces across start, stop/start, and reopen. A document with an unavailable saved model must remain inspectable and paused on both hosts.

## Context

The loader preserves the requested model name. The execution gate keeps a document paused when that model is unavailable. The check reuses the existing [editor smoke test's BiDi client](../../tools/browser/firefox-bidi.mjs) and [runner parity test's worker path](../../tools/tests/runner.test.mjs).

## Scenario and acceptance

Use a regular [saved graph](../../tools/execution-parity/branch-counter.json) made from built-in nodes. A timer emits on start. A boolean feeds Branch, which routes to Counter. Counter transforms the event into its current count. Log Event records the count without external effects.

| Check | Expected result on each host |
|---|---|
| Open the saved file | Document ID, node IDs, links and requested model survive opening and saving. |
| Start | One execution reset, then Branch → Counter → Log Event, one effect with value `1`, then completion in reverse order. |
| Stop and start the loaded instance | Same ordered trace with value `2`. The execution display resets while Counter retains instance state. |
| Reopen the original file and start | Same ordered trace with value `1`. A newly loaded graph instance resets Counter. |
| Open the same document with an unavailable model | Same graph structure and saved model name. Report why execution is paused. Start is gated on both hosts; editor Play, Step and direct action dispatch are gated as well. Iteration and trace stay unchanged. |
| Choose an available model | The gate clears and the graph can execute on the next explicit action. Files without a model use the existing legacy behavior. |

## Tooling and extension

Run `npm run check:execution-parity` after building. Add `-- --json path/to/new-report.json` for a versioned machine-readable report. The standalone command requires Firefox. The `npm run check` gate follows the browser smoke settings and runs all cases in Node when Firefox is skipped.

The CLI has separate host adapters and shared scenarios. Each trace retains resets, ordered status transitions for the case's observed paths, and numeric effects. Timing, frame counts and generated call IDs vary by host. For a new case, save a fixture and define its expected sequence and lifecycle operations.

The [linked fixture](../../tools/execution-parity/linked-wait-all.json) uses two instances of one saved definition. Each instance has a WaitAll and a Counter. Three starts prime both instances with different inputs, complete A, then leave A waiting again while completing B. Reopening the original document repeats the sequence without premature effects, and both counters emit `1` again. The check compares instance-qualified paths, the saved definition and links, the stopped state and the next Stepper output. WaitAll's partial input set represents pending work independently of wall-clock timing.

The [deferred-action fixture](../../tools/execution-parity/linked-deferred-actions.json) queues one action in each linked instance while its step loop is disabled. On the next start, a second pulse enables the instances. The two downstream watches confirm each has taken its turn. Compare ordered actions under `step`, `strict`, and the default `legacy` flags. A normal stop retains both actions. Reopening the stopped snapshot preserves the Stepper position and drops both queued actions. Clearing at stop or while already stopped also prevents the two effects, with the Stepper position preserved.

## History

- 2026-11-27: Agreed to compare browser and Node execution, including paused inspection for unavailable saved models.
- 2026-11-27: [Verified both hosts](../executions/2026-11-27-browser-node-execution-parity.md).
- 2026-11-27: Added the linked fixture to the validation gate.
