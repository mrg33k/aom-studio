# Brief R35-chat-step-first — the first agent block lands within 3 s of send, every time (C006 residual), and the six-question score holds

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R33-chat-images-and-instant.md` (the service you extend; `threadsWithNewUserBlocks`
is deployed and answers in 0.3 s), `rounds/LEDGER.md` rows DBG-5 and "R26 (done) + PROD REDEPLOY" (the
timings: first block 6-9.5 s from send after the restart), `punch-list.md` row **C006**. Report:
`rounds/R35-chat-step-first.md`.

You are a headless worker, BUILDER of the chat lane, round seven. Nobody will answer questions.

## Build

1. **Step before everything.** On pickup the service writes the `startRun` + first `step`
   ("Reading the project notes…") BEFORE building the context pack (the pack takes 1.5-4 s today:
   surface 2.9 s cold). Then build the pack. Measure and print, per turn: pickup latency (user block
   `createdAt` → poll), step write latency, pack build, model time, first sentence, done.
2. **Poll at 1 s** with the fast query (`R25_POLL_S` default 1.0 when the fast query is available;
   fall back only when it errors), and cache the workspace tree between sweeps (refresh every 60 s or
   on a mutation the service made itself).
3. **Pack build faster.** Cache the project notes (FACTS/CONTEXT/BUILD) per project for 5 minutes;
   fetch surface + ledger + visual in parallel threads; cap the surface read to the last 40 blocks.
   Target pack ≤ 1 s warm.
4. **Prove it from the user's side**: rerun the four DBG questions with the tester
   (`/tmp/corner-v2-aom-tester.env`; the Playwright pattern in the DBG-1 row / `/tmp/r33-dbg.py`)
   and report, per question, first visible agent block from send (target ≤ 3 s), first sentence
   (≤ 20 s), done (≤ 45 s), and the answer score against FACTS.md (target ≥ 7/8, no self-reinforced
   facts: anything only prior brain replies say is flagged, never repeated as fact — add that rule to
   the contract `r33-2`).
5. Keep 100/100 unit + chat suite live ≥ 10 pass / 1 skip; one service restart at the end.

## Hard lines

Never `neat-pony-216`; never touch `room-bridge`/`sse-bridge`; no email/Telegram; no `src/`/`ios-native/`;
commits scoped (`scripts/`, mission folder, `e2e/chat.spec.ts`); never push. Report: the timing table
before/after per stage, the DBG-6 transcript + score, gates, commits, "for Patrik".
