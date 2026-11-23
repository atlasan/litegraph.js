# Audits

Dated reviews of the code at a stated commit. Each audit records what was true when it was written. Later fixes are noted at its top or in its **Since** column; current status lives in the [roadmap](../plans/roadmap.md). New audits start from the [audit template](../_templates/audit.md).

| Date | Audit | Scope |
|---|---|---|
| 2026-11-23 | [State audit](2026-11-23-state-audit.md) | Whole project after Waves 6–7, flows and panels: delivered work, open items classified (MUST, FIX, NICE, IDEA, DECISION), record inconsistencies, release readiness |
| 2026-11-22 | [Wave 7 review](2026-11-22-wave7-review.md) | Independent review of the event core: differential fuzz against the old CallbackHandler, call-site equivalence; 5 findings fixed in `0f5bf77` |
| 2026-11-22 | [Event flows audit](2026-11-22-event-flows-audit.md) | The event and execution system after Wave 6 by layer, the registry's declarations (49 of 293), the examples under each model, the call-id probe; 13 findings mapped to FLW ideas |
| 2026-11-22 | [Event handling](2026-11-22-event-handling.md) | CallbackHandler, typed events and legacy `onX`: how each works, where they overlap, defects E1–E11 with probes |
| 2026-11-22 | [Wave 6 verification](2026-11-22-wave6-verification.md) | Independent gate, records and browser check of the events and execution wave |
| 2026-11-19 | [Improvements ledger](2026-11-19-improvements-ledger.md) | What happened to each proposal in the 2025 automated wishlists |
| 2026-11-19 | [Fork inventory and gap analysis](2026-11-19-fork-inventory.md) | Every subsystem: maturity, overlaps, unify or expand candidates, risks |
| 2026-11-19 | [PR #5 (Wave 0) review](2026-11-19-wave0-pr5-review.md) | Independent check of the Wave 0 safety branch, including the runner script-node finding |
| 2026-11-19 | [Upstream issue triage](../memories/research/2026-11-19-upstream-issue-triage.md) | 50 upstream defects checked against this fork |
| 2026-11-18 | [Repository review](../plans/2026-11-18-repo-review-and-roadmap.md) | Bugs B1–B15 and P0 items, with a phase plan |
