# Room Checklists — Mission Context

**Mission path:** `corner:room-checklists`
**Status:** IN PROGRESS
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
