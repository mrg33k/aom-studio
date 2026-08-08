# Room and Chat Reliability — 90-Day Audit

**Mission:** `corner:truth-contracts`

**Window:** 2026-05-10 through 2026-08-08

**Question:** Why do rooms fail to respond or make chat behave strangely, and which
repairs may a background Corner steward perform safely?

## Executive finding

The failures are not primarily an intelligence problem. They are a missing turn-level
reliability contract. A user message currently crosses several loosely connected
systems—composer, message writer, room identity, runner, heartbeat/progress, reply
writer, room reader, and React renderer—without one durable receipt that proves which
stage succeeded. When one stage fails, the UI often has to infer what happened.

The 417 chat/room-adjacent history entries found by the broad audit filter are **not 417
incidents**. After collapsing follow-up fixes, reverts, and visual work, the recurring
reliability evidence fits five root-cause families. Keyword evidence density in commit
subjects was: 57 write/send, 40 identity/scope/routing, 37 realtime/stale/render, 28
dead/no-op control, and 10 explicit crash/blank-screen entries. These groups overlap
and are directional, not production incident counts.

## Ranked failure families

### 1. Turn accepted by the UI but not durably accepted by the system — P0

This is the closest match to “the room did not respond.” The strongest incident was
the 2026-07-28 through 2026-07-30 total typed-chat outage: the client sent
`sender_role=human`, while the production constraint allowed `user`; every composer
write returned 400 even though reads and the surrounding interface remained alive
(`172965f3`). Earlier and adjacent fixes show the same contract class: the composer did
not actually send (`8cb6942c`), failed local sends looked successful (`f83f7735`), and
some secondary surfaces cleared drafts before awaiting a successful receipt.

**Current gap:** `useRoomThread.send` correctly requires an HTTP success and retains the
main rich-composer draft on failure, but there is no durable outbox/correlation record.
Some parallel send surfaces still have their own success semantics; for example,
`CatchUpModal` calls `send(t)` and immediately clears its draft without awaiting the
result.

**Detection:** every user turn must receive a message id and canonical room id; a
read-after-write check must find that id in the same room. A failed POST, missing id,
or missing read-back is an immediate contract incident—not “agent thinking.”

### 2. Writer and reader disagree about which room owns a message — P0

Room-key drift repeatedly made valid rows appear nowhere, in the wrong room, or in more
than one room. Evidence includes mission messages leaking into project chat
(`a4f11721`), an empty room retaining the previous room's thread (`b3faa8fe`), and the
July 17 P0 in which writers stamped fake/bare mission ids while readers expected
canonical ids (`62813b31`; pinned by `supabase-messages-room-drift.test.js`). The front
door also ignored its router response entirely and used insufficient recency, making
correct rooms look unavailable or randomly selected (`0aaca1ed`).

**Current gap:** read-side rescue arms preserve legacy/drifted rows, but the system
still lacks one canonical room-key service used by every writer, reader, router, file
shelf, and worker handoff. Rescue logic prevents disappearance; it does not prove that
new rows can no longer drift.

**Detection:** compare the writer's returned `room_id`, the canonical key derived from
the visible room, and the room reader that should return the row. A reply present in the
tenant feed but absent from its intended room is a room-identity incident, not a reason
to rerun the work.

### 3. Work was persisted but dispatch or response lifecycle went silent — P0

The UI has a three-minute client backstop for a turn with no steps or reply, and live
process truth has a 90-second heartbeat TTL. Those are useful signals, but they are not
joined to a specific user message in one state machine. “Working” and room response can
therefore diverge: a runner may never claim the turn, a process may die after claiming,
or a reply may land without a settled marker.

The existing `/api/dashboard/unstuck` endpoint is unsafe for autonomous use. It marks
**all** active tasks in the tenant done, resets **all** working/stuck agents to idle,
and emits a restart for three hardcoded agents. This destroys evidence and can falsely
complete unrelated work. `task-action` contains a better pattern—tenant-scoped stale
task reclaim—but it is still task-wide rather than correlated to one chat turn.

**Detection:** a persisted turn should move through `accepted → claimed → heartbeat →
replied → settled`. Missing claim, stale heartbeat, reply-without-settle, and
settle-without-reply are different incidents with different repairs.

### 4. Realtime/poll state makes healthy data look broken — P1

Repeated incidents include thread scroll jumping on realtime rebind (`878d0f08`), the
selected pane remounting every 2.5 seconds because agent status polls rebuilt selection
(`93601ef6`), mobile live-tail regressions (`acdf3020`), and duplicate/misattributed
file groups (`63eafb95`). These failures make a functioning room feel unstable and can
hide or misattribute the reply.

**Detection:** compare API truth with rendered truth after a room switch and a poll.
Test three thread shapes—empty, dense history, and active work—on phone and desktop.
The currently open room, draft, scroll intent, and newest message id must survive an
unchanged poll.

### 5. Optional UI changes can crash the entire room surface — P1/P0 blast radius

On August 6 a swipe callback temporal-dead-zone error blanked the dashboard at every
screen size (`d3dcd244`). On August 7 room/action-item work triggered React invariant
#300, and attempted “disable” fixes introduced new conditional-hook violations before
the clean code was restored (`eaee69e1` through `bd45d83d`). A separate project tap
crashed into the boundary (`8f976a46`). These are less frequent than write/identity
failures but have a larger immediate blast radius.

**Detection:** after every CV6 release, synthetically open representative empty,
project, mission, direct-agent, dense-history, and active-work rooms at phone and
desktop breakpoints. Treat a boundary screen, blank body, React invariant, or uncaught
console error as a release failure.

## The correct steward model

Create one durable `turn_receipt` per user message:

1. `accepted` — canonical room key and persisted message id confirmed.
2. `claimed` — exact runner/task/process claims the turn.
3. `heartbeat` — the claimed process is still alive.
4. `replied` — a correlated reply row exists.
5. `visible` — the intended room reader returns that reply.
6. `settled` — work ended and the UI cleared its active state.

The background steward checks overdue stages and acts only on the exact receipt. It
must never infer completion from a generic agent status or repair a missing visible
reply by rerunning already-completed work.

## Safe automatic repairs (initial authority)

- Preserve and restore the exact draft when a write receipt fails.
- Retry an idempotent message write once when no message id was created.
- Refresh the exact room query, reconnect its subscription, and invalidate only that
  room's client cache when API truth and rendered truth differ.
- Wake the runner once for a persisted, unclaimed turn.
- Requeue only the exact correlated task after its heartbeat expires, using the same
  idempotency key and a strict retry cap.
- Clear only the exact stale presentation/status row after proving no live process and
  no active correlated task exist.
- Use canonical read rescue for a drifted room key and open an incident receipt; do not
  rewrite historical rows automatically.
- Disable a pre-registered optional feature flag when its synthetic room-open check
  crashes, leaving core chat available.

Every repair writes a receipt containing detection evidence, action, retry count, and
verification result. One failed repair escalates; it does not loop.

## Approval-required repairs

- Marking any task complete, deleting/moving messages, or rewriting historical room
  identity.
- Schema/constraint changes, migrations, permission changes, or tenant membership.
- Generated code changes and production deployment until the steward has a separate
  tested deployment policy.
- Broad restarts, bulk queue changes, or the current `/unstuck` behavior.
- Any external send, publish, purchase, credential, or destructive action.

## Recommended implementation sequence

1. **Turn receipts and observability:** add correlation/idempotency ids and stage times;
   instrument every main and secondary composer path.
2. **Room health endpoint:** report exact stuck stage and evidence without mutating.
3. **Scoped repair broker:** allow only refresh, wake-once, exact-task requeue, and exact
   stale-status reset; audit every call.
4. **Synthetic room matrix:** phone/desktop checks for direct, project, mission, empty,
   dense, and active rooms on every release.
5. **Steward loop:** run every few minutes, repair low-risk overdue stages, and post one
   concise receipt to the affected room plus a system reliability ledger.
6. **Retire broad unstuck:** replace it with per-turn recovery; keep any emergency bulk
   operation manual and explicitly confirmed.

## Evidence limits

The repository and mission records provide unusually specific root-cause history, but
the available Vercel runtime log window did not retain a complete 90-day request corpus.
Therefore this audit ranks recurring root-cause evidence and known outage severity; it
does not claim exact production incident rates. The turn-receipt layer is also what will
make the next 90-day report quantitatively exact.
