# Room Checklists — Mission Context

**Mission path:** `corner:room-checklists`
**Status:** DONE
**Started:** 2026-07-21

## Current state

Corner already has an agent-owned per-room goal checklist. This mission introduces a
separate user-owned notebook so personal notes never mutate or impersonate the agent's
work plan. The UI enters from the shared CV6 composer and Play delegates to the room's
existing send-message function.

## Product decisions

- Multiple lists per room, each with a title and collapsed state.
- List items are plain user text with open/done state.
- Play sends exactly the item text as a user message; it does not silently delete it.
- Sharing requires a target room and explicit Copy or Move confirmation.

## Shipped result

R1 is deployed on the CV6 lab surface. The user notebook is durable per room,
independent from agent goal steps, available from every full composer, and verified
through the complete CV6 browser regression suite. The production route remains behind
Corner authentication; no auth bypass was introduced for testing.

R2 removes glass translucency from the working composer and checklist layers while
keeping the surrounding glass theme. The mobile list header, rows, inputs, and sharing
controls now have a roomier solid treatment without moving the verified bottom anchor.

R3 gives every checklist icon action a fixed circular target and prevents the nested
list grid from overflowing the composer. Collapsed and expanded mobile states now keep
all header, list, and item controls round, unsqueezed, and fully visible.
