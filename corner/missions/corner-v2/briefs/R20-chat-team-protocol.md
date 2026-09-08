# Brief R20-chat-team-protocol — the third lane: multi-brain chat that works as ONE team, proven by a scripted e2e against the clone

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40), `rounds/LEDGER.md` (newest rows: what is live, what is on the
clone, which preview URL), and the spec
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/specs/2026-09-05-corner-v2-reorganization-design.md`
section "Agent brains" (brains are capabilities inside a conversation; auto-select or `@brain`;
more than one may contribute; every agent message carries a label; `runs` + `agentEvents`).
Write your report to `rounds/R20-chat-team-protocol.md`: every command with its output.

You are a headless worker, BUILDER of the chat lane. Nobody will answer questions.

## Patrik's words (the target), 2026-09-06 1:05 PM

"we need to test chat as our third lane of work. The challenge being, multiple different brains are
options, they all need to stay in sync with the way our system works. last time I checked we had
multiple agents talking in the room but they were not in sync working as a team and all of them were
not up to date no agent was driving they just talked."

Three failures, three assertions. The lane is done when a scripted conversation against the real
backend cannot reproduce any of them.

## The team protocol (build this; the spec left it unwritten)

1. **One driver per conversation.** The Project's agent (the label on the conversation, e.g. Aster)
   owns every turn in that Project's and its Missions' threads. Another brain speaks only when
   (a) the person `@mentions` it, or (b) the driver delegates a bounded task to it. In both cases the
   contribution is labelled with that brain, and the turn returns to the driver, who closes it.
   Two agent messages in a row from different brains without a delegation or a mention is a defect.
2. **One context pack, read before every turn, by every brain.** Assembled by the bridge, not by
   the brain: the Project's CONTEXT (its `corner/users/.../CONTEXT.md` or the v2 project description),
   the ledger's latest rows for that Project/Mission (`v2Ledger.latest`, scoped), the last N thread
   messages including the other brains' contributions, the open Visual Window tabs + active tab +
   review state (`v2VisualWindow.getSession`), and the person's pending asks. A brain that answers
   "what's the latest on X" must answer from the ledger row written a minute ago, not from memory.
3. **Structured turns.** Every agent turn is a `run` with `agentEvents`: `step` (what it is doing),
   `looking` (which tab it is reading), `question` (a threadBlock with options: the UI's question
   block), `artifact` (a new artifact version), `delegate` (to which brain, what task, what came
   back), `done`. Free text alone is not a turn. The web (`ConversationSurface`) and native already
   render question blocks and steps from the façade; wire what the bridge emits to what they read.
4. **The ledger is the sync bus.** Every decision, delegation result, and artifact the driver makes
   is appended (`v2Ledger.append`, scoped token) so the NEXT turn, by any brain, on any device, sees
   it. Nothing lives only in a brain's memory.

## Where the pieces are

- The local agent runtime that answers rooms today: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/scripts/sse-room-bridge.py`
  (+ `bridge-v2-session-server.py`, `openai_room_provider.py`, `corner_convex.py`, `hooks/ledger-append.py`);
  launch agents `com.aom-ea.room-bridge` / `com.aom-ea.sse-bridge` run it against the LIVE
  deployment (`CORNER_CONVEX_URL` env, default `neat-pony-216`). **Never point anything at
  `neat-pony-216` in this round, and never restart those launch agents.** Run your own bridge
  instance for the test with `CORNER_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud` on a
  port that is free (not :3003, not 5173/5177), signed in as the test account below.
- Backend on the clone: `v2Compatibility` (getRoomThread / sendRoomMessage: how a room-shaped
  client reaches v2 threads), `v2Workspace.sendMessage`, `v2Ledger`, `v2Visual`/`v2VisualWindow`,
  `runs`/`agentEvents` tables (`convex/v2Schema/`), `v2Native.ts` (DTO shapes the phone reads).
  You may add backend functions in `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/convex/`
  (new files `v2Runs.ts` / `v2Team.ts` preferred; a unit test each in `tests/v2/`), but the clone
  cannot be redeployed by you (deploy key pending with Patrik): design the bridge so it works with
  the functions already on the clone, and list what the redeploy will add.
- Brains available on this Mac: Claude (the `claude` CLI in the bridge's session server), Muse
  (`~/.local/bin/muse`), OpenAI via `openai_room_provider.py`. Read how each is invoked before you
  choose; the driver is whichever the Project's agent maps to (see
  `corner/users/aom/agents/<slug>/AGENT.md` and `scripts/openai_room_provider.py` for the mapping).
- Test account on the clone: `/tmp/corner-v2-e2e.env` (`CORNER_V2_E2E_EMAIL` /
  `CORNER_V2_E2E_PASSWORD`; never in a report, commit, or caption). Its workspace has projects
  (Harbor Coffee Live, Northwind, …) and threads from the web live suite; the desktop worker (R18)
  is shaping it toward the design's Aster workspace — share it, do not wipe it.

## Deliverable 1: the test (`e2e/chat.spec.ts`, Playwright project `chat`, in the web worktree)

Runs against `LIVE_BASE_URL` (a preview on the clone; newest in the LEDGER) with the test bridge
running. Scripted conversation in one Mission thread, each step an assertion:
1. Person: "Build the Aster spring launch deck. Eight slides, their brand kit, first pass tonight."
   → exactly ONE agent turn, labelled with the Project's driver, structured (at least one `step`
   event, then a `question` block with two options or a `done`). No second brain speaks.
2. Person answers the question block → the driver continues; a ledger row "decided" exists for the
   answer within 10 s (`v2Ledger.latest`).
3. Person: "@<second brain> check the brand kit colours" → ONE labelled contribution from that
   brain, then the driver closes the turn (a `done` or a follow-up from the driver). Order asserted.
4. Person: "what's the latest on this deck?" → the driver's reply contains the fact recorded in
   step 2 (the chosen option), read from the ledger, not invented.
5. Two rapid messages from the person → still one driver, turns serialised (no interleaved
   agent messages from two brains; run ids distinct; each run has a `done`).
6. The Visual Window: the driver's `looking` event opens/focuses a tab the person can see
   (`visual-tab` active), and the status line says what it is looking at.
Every step screenshots to `rounds/evidence/R20-chat-<step>.png`. The suite fails on: two brains
in a row without delegation/mention (defect A), a "latest" answer that lacks the ledger fact
(defect B), an agent message outside a run with a driver label (defect C).

## Deliverable 2: make it pass

The bridge changes for the protocol (driver ownership, context pack, structured runs, delegation,
ledger writes), unit-tested where the logic is pure (`tests/` in AOM-EA for Python:
`python3 -s -m pytest scripts/tests/…` or the repo's existing pattern). Commit in AOM-EA with scoped
paths (`scripts/…`, the mission folder) and in the web worktree for `e2e/chat.spec.ts` and any
`convex/` additions; never `git add -A`; never push aom-studio; AOM-EA and the web worktree may be
pushed by the orchestrator only.

## Hard lines

- Never write to `neat-pony-216`. Never send email or anything client-facing. No Telegram.
- Do not edit `src/` in the web worktree (R18 owns it) or `ios-native/` (R17/R19 own it). If the UI
  cannot render something the protocol emits, write it in the report as a UI row for those rounds.
- One bridge instance, your own port, killed at the end of your run (`pkill -f <your port>` only).
- Report: the six steps with pass/fail before and after, the protocol as implemented (one paragraph
  each for driver / context pack / turns / ledger), commits, what the clone redeploy adds, and
  "for Patrik" (which brain is the driver for AOM's projects today, and any mapping you had to guess).
