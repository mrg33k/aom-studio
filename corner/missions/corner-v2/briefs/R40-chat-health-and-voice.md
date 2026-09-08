# Brief R40-chat-health-and-voice — health tells the truth, the service heals itself, and the driver stops prefixing every sentence

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R37-chat-fast-plain.md` (the round you extend), `rounds/LEDGER.md` rows R37 →
"CHAT OUTAGE (found + hotfixed)", `punch-list.md` row **C011**. Code: AOM-EA `scripts/v2-team-bridge.py`
(HEAD `c772a1652`, the sign-in hotfix) + `scripts/test_v2_team_bridge.py` (129/129, run with plain `python3`,
never `-s`). Service: launch agent `com.aom-ea.corner-v2-bridge` (:3100, wrapper `scripts/corner-v2-bridge.sh`,
log `corner/state/corner-v2-bridge.log`, contract `r37-1`; startup ≈ 3 min before `listening`). Demo bridge
:3099 (Paige, design thread `vd7f0v4dn3kjjx9qnt9acryemn8dyr95`) runs the same script — keep it compatible.
Probe: `/tmp/r38-dbg.py` (four questions, writes `/tmp/dbg-run10.json`; copy → `/tmp/r40-dbg.py` →
`/tmp/dbg-run12.json`). Report: `rounds/R40-chat-health-and-voice.md`. Production backend
`brilliant-scorpion-163`; never `neat-pony-216`.

You are a headless worker, BUILDER for the chat lane. Nobody will answer questions.

## What happened tonight (2026-09-07)
- 3:20 → 3:57 AM: every tick `HTTP 401`, `/health` green the whole time. Cause (fixed in `c772a1652`): the
  expired bearer rode `auth:signIn`. The demo bridge died the same way at ~00:25. A backend deploy
  (`npx convex deploy`) appears to invalidate the bot session — the 401 streaks began right after two deploys.
- The unlocked sweep paths (`allow_refresh=False`: R31 parallel sweep, R33 fast poll) never re-sign-in
  themselves; they rely on "one serial locked call" that did not happen for 37 minutes.

## Build
1. **Health tells the truth (C011).** `/health` carries `lastOkTickAt`, `lastTickError`, `failedTicks`;
   `status` becomes `degraded` after 3 consecutive failed ticks and `ok` again on the first good one.
2. **Self-heal.** On a 401 in ANY path (locked or not), one serialized re-sign-in (bare `auth:signIn`, token
   cleared) with backoff 2 s → 30 s max; a streak of 10 failed re-sign-ins exits non-zero so launchd's
   KeepAlive restarts a clean process. Unit test with a fake transport that returns 401 for N calls then
   succeeds; assert the tick recovers with no restart and the health fields move.
3. **Deploy resilience.** Prove it live: after your changes, run `CONVEX_DEPLOY_KEY=... npx convex deploy`?
   NO — you have no deploy key and must not deploy. Instead simulate: invalidate the session by signing the
   bot in from a second client (Convex Auth single-use refresh) and show the service recovers within 30 s.
4. **Voice: no prefix tic.** DBG-8 Q1: every sentence began "From the project notes …". Rule: cite the source
   once per answer at most (or never, when the answer is plain fact); never the same opener twice in one
   reply. Contract rule + unit test on the boundary formatter.
5. **`turnsLastHour` counter** read 1 while ~12 turns fell in the hour (R37 §8.5) — fix the persistence so
   the cap (60/hr) and the health number are honest.
6. Startup: log a `[r40] startup` line with the phase timings (sign-in, tree, grounding sweep, listen);
   if the grounding sweep is the 3 minutes, make it lazy or parallel so `listening` lands under 30 s.

## Gates
- `python3 scripts/test_v2_team_bridge.py` = 129 + yours, all pass.
- ONE production service restart (contract `r40-1`), then the four-question probe on production: no 401s
  in the log, step ≤ 1.5 s, first sentence ≤ 10 s, done ≤ 15 s on every row, answers ≥ 7/8 by the DBG-4
  scoring, zero scold, zero repeated opener. Restart the :3099 demo bridge on the same build afterwards
  (pinned: `R20_THREAD=vd7f0v4dn3kjjx9qnt9acryemn8dyr95`, env from `/tmp/r21-live-bridge.envlist`).
- No client-facing sends; the bot only answers in the tester's threads. Commit on AOM-EA with scoped paths;
  never `git add -A`. Report: before/after, the fake-401 test output, contract diff, "for the orchestrator",
  "still off and why".
