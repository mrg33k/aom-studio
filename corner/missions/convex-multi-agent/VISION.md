# Convex Multi-Agent — Mission Vision

**Mission path:** `corner:convex-multi-agent`

Move Corner room messaging and team-agent collaboration onto one Convex-backed
realtime pipeline shared by native iOS and the production web dashboard.

The north star is simple: a message sent from iOS or web appears identically on
both surfaces and prompts one to three relevant specialists to contribute useful,
contextual answers without Supabase message storage, canned acknowledgements,
duplicates, or missing history.

## Constraints

- Convex is the only message store and realtime source.
- Room routing uses real room and message context.
- Agent replies return to the same room.
- iOS and web share the same Convex document identifiers.
- Message payloads are strings only; testing sends no client emails.

