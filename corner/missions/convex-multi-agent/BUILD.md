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

**Status:** build 17 uploaded and validated by App Store Connect — the native Debug simulator
build also compiles and is installed, but the clean simulator and available
browsers have no authenticated Corner session. A signed-in cross-surface send
remains as the post-release acceptance check.

### R5 — WD-40 reliability rounds

Exercise retries, duplicate delivery, stale subscriptions, routing, ordering, and
recovery until the shared pipeline is solid.

**Status:** in progress — migrated 45,221 nonblank text messages and 651 legacy
room IDs with stable deduplication and no file metadata. Acceptance tests proved
room grounding, routing completion, abstention, and the guaranteed first reply.
Production web is live on `aheadofmarket.com/dashboard`; signed-in native/web
parity remains the final WD-40 check.
