# Room Checklists — Mission Research

**Started:** 2026-07-21

## Initial findings

- The existing `room-goal-steps` store belongs to agent execution plans and must remain separate.
- CV6 has one shared full composer used by room surfaces, making it the correct entry point.
- Room messages already expose a send callback; Play can reuse that path without creating a second chat transport.
- Existing tenant-scoped `cm_state` APIs provide the persistence pattern for a dedicated checklist store.

## Resolved verification questions

- Canonical keys use explicit `agent:`, `project:`, and `mission:` prefixes.
- Checklist mode is capped at `min(52dvh, 470px)` and scrolls internally while the
  composer retains the existing resting and keyboard-open bottom geometry.
- Copy and Move mutate the source and destination within one tenant-state write;
  copied lists and items receive new IDs so later edits do not share references.
