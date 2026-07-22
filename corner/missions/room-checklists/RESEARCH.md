# Room Checklists — Mission Research

**Started:** 2026-07-21

## Initial findings

- The existing `room-goal-steps` store belongs to agent execution plans and must remain separate.
- CV6 has one shared full composer used by room surfaces, making it the correct entry point.
- Room messages already expose a send callback; Play can reuse that path without creating a second chat transport.
- Existing tenant-scoped `cm_state` APIs provide the persistence pattern for a dedicated checklist store.

## Open verification questions

- Confirm canonical room keys across project, mission, and direct agent rooms.
- Confirm mobile keyboard geometry while checklist mode is open.
- Confirm Copy and Move stay atomic under mocked and live API responses.
