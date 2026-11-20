# Executions

What was done and how it was verified. Plans say what *will* happen; executions record what *did*. New records start from the [execution template](../_templates/execution.md).

## Index

| Date | Record | Status |
|---|---|---|
| 2026-11-01 | [Baseline validation](2026-11-01-baseline-validation.md): setup, contracts, editor, tester and runner acceptance | final |
| 2026-11-01 | [Readiness checklist](2026-11-01-readiness-checklist.md): verified foundation and remaining acceptance work | snapshot |

## Waves

| Wave | Branches | Record |
|---|---|---|
| 0 Safety | `LG/wave0_safety` ([PR #5](https://github.com/atlasan/litegraph.js/pull/5)) | [roadmap](../plans/roadmap.md#wave-0-safety-and-correctness-done), [review](../audits/2026-11-19-wave0-pr5-review.md), `CHANGES.md` |
| 1 Platform | `LG/wave1_platform`, `LG/wave1_finish` | [roadmap](../plans/roadmap.md#wave-1-platform-layer-done), `CHANGES.md` |

From Wave 2 on, each wave gets a dated execution record: what changed, the gate result, browser checks, and what was left open.

**Evidence:** capture screenshots or logs only when they prove something a test cannot. Store them in `evidence/YYYY-MM-DD-topic/`, next to the record that cites them. The 2026-10 screenshots were dropped as outdated.
