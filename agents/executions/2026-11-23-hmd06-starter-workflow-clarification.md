# HMD-06: starter workflow feature clarification

> **Date** 2026-11-23 · **Kind** execution · **Status** final · **Base** `LG/dev_hmd_examples_nodes_icons` @ `5085614`

Applied the user's clarification to the living HMD-06 idea sketch. Keep the existing editor/runner identity and the card name; the auto workflow generator is a feature of that application.

## Changes

- Reframed [HMD-06](../ideas/cards/HMD-06-workflow-builder-runner.md) around adding all nodes in a selected section or pack to an organized initial workflow for contributors, pack creators and users.
- Described suggested groups, descriptions, settings and additional metadata, plus coverage updates as packs expand. Kept unresolved storage/update contracts as questions.
- Linked the corrected scope from the area document, catalog and ideas index. This clarification supersedes the generic recipe/runner interpretation in the [initial intake record](2026-11-23-human-feedback-usability-intake.md); that dated record remains unchanged.

## Verification

| Check | Result |
|---|---|
| Local file links in changed/new documents | Pass |
| Catalog identity and maturity | HMD-06 retained; P9 P10, app, sketched; no count changes |
| `git diff --check` | Pass |
| `npm run check` | Not run: documentation-only clarification |

## Left open

Metadata storage, section selection and updating existing starters remain idea questions. No implementation plan was promoted.
