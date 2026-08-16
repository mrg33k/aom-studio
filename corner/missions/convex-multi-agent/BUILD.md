# Convex Multi-Agent — Mission Build Plan

**Started:** 2026-08-15
**Mission path:** `corner:convex-multi-agent`

### R1 — Research and live-state audit

Research current Convex multi-agent dispatch patterns and reproduce the iOS
flash-then-empty-room failure against the actual deployed Convex projects.

**Status:** complete — confirmed iOS pointed at the overwritten test deployment,
while the data-bearing Corner deployment is `neat-pony-216`; foreground catch-up
also replaced Convex rows with Supabase rows.

### R2 — Durable Convex message-to-agent loop

Make each user-message mutation durably enqueue an idempotent dispatch, select
one to three relevant agents, execute them with room context, and persist replies.

**Status:** shipped to `neat-pony-216` — transactional scheduling, idempotent
dispatches, one-to-three specialist routing, grounded sequential replies,
duplicate-contribution suppression, and a guaranteed first responder are live.
The active roster now uses Bobby, Steffen, and the real Corner team personas.

### R3 — Production web Convex thread

Replace the production CV6 room thread read/send path with reactive Convex calls.

**Status:** implementation complete, production deploy pending — CV6 now resolves
canonical room handles and uses reactive Convex queries/mutations only for room
messages. A production-mode 2,616-module bundle completed successfully.

### R4 — Native and cross-surface acceptance

Verify room history and sends in iOS, then prove identical rows appear on web.

**Status:** native acceptance complete; web UI parity remains — build 17 is valid
in App Store Connect. A signed-in simulator sent
`IOS-CONVEX-TEST-20260815-1022`; Convex persisted it and Bobby's linked reply
1.38 seconds later, and the second signed-in simulator rendered both rows
reactively. Leaving/reopening the room retained history without the former
flash-then-empty failure.

### R5 — WD-40 reliability rounds

Exercise retries, duplicate delivery, stale subscriptions, routing, ordering, and
recovery until the shared pipeline is solid.

**Status:** in progress — migrated 45,221 nonblank text messages and 651 legacy
room IDs with stable deduplication and no file metadata. Acceptance tests proved
room grounding, routing completion, abstention, and the guaranteed first reply.
Production web is live on `aheadofmarket.com/dashboard`; signed-in native/web
parity remains the final WD-40 check.

### R6 — Room-list query pressure

Remove the per-room last-message lookup from `rooms:listRooms`, maintain compact
room preview fields transactionally with message writes, and backfill existing
rooms before measuring the live query again.

**Status:** complete — deployed transactional preview maintenance and backfilled
675 active rooms in bounded batches. The live query fell from 1,351 to 676
document reads, response bytes returned to 398,549 after removing duplicate
preview fields, and the temporary migration secret was removed.

### R7 — Resident-agent context bridge

Replace the remaining Supabase listener/reply persistence path with a Convex
consumer so selected resident agents can inspect current repositories and
deployments, then post string-only replies back to the originating Convex room.

**Status:** blocked on runtime topology, not Convex transport — a fresh live
Convex send received one correctly threaded Bobby reply in under five seconds,
but Bobby truthfully lacked deploy context. The running SSE bridge only has
`elon`, `studio`, `rex`, `gary`, and `arsenal-ea` sessions; Bobby and Steffen are
not registered resident sessions, so silently mapping their identities would be
incorrect. The internal Convex agent loop remains live while this is resolved.

### R8 — Canonical duplicate-room resolution

Ensure project-scoped mission handles resolve to the project-qualified legacy
room before the historical projectless fallback, so web and native open the
thread containing the actual project history.

**Status:** complete — the resolver now prefers the project-qualified ID and
`listRooms` collapses historical aliases while normalizing the project field.
Live verification returns 647 canonical rooms (down from 676 raw rows) and one
AOM Website entry pointing to `aom:mission:aom:aom-website` on both surfaces.

### R9 — Consolidate native/legacy room aliases

Create one canonical document identity per semantic room and preserve all
history from its legacy/native aliases, including project rooms and the
preexisting Convex seed rooms.

**Status:** needs a deliberate data merge — simulator acceptance exposed three
Ahead of Market project documents (`aheadofmarket`, `aheadofmarket.com`, and a
Convex-native `Ahead of Market`) plus duplicate native/legacy Feed and Home
missions. The current rail shows duplicate cards and 288 agent / 151 project
counts. Transport is healthy, but destructive room deletion would strand
message history and related references; merge aliases before pruning rows.
