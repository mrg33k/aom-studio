# R35 — chat step-first: the first block lands fast, every turn measured (C006 residual)

Worker: headless builder, chat lane round seven. Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R33-chat-images-and-instant.md`, `rounds/LEDGER.md`
(DBG-5, R26+PROD REDEPLOY), `punch-list.md` C006. Report: this file.

Verdict: pickup is now 0.3-0.9 s on every turn (1 s fast-query poll, live on
production), the step still writes before the pack build and the brain call,
and every turn prints its full stage split. Pack is 0.7 s warm on Ambition;
Wolfpack packs stay 3.1-3.5 s (cold notes on turn 1, then thread-size-bound
reads the 40-cap cannot shrink client-side). First visible block from send:
2.9 / 3.1 / 8.3 / 9.3 s -- the two misses are backend step-write latency
(4 s vs the usual ~1 s; measured 0.3 s per mutation minutes later), not
pickup. DBG-6 holds **7/8** with no test noise. Unit suite **111/111**.
Live chat suite on production **10 passed, 1 skipped (test 8, by design)**.
Service restarted **once**, healthy on contract `r33-2`.

Rule compliance: nothing pointed at `neat-pony-216` (all URLs below are
`brilliant-scorpion-163`); `room-bridge`/`sse-bridge` untouched; no
email/Telegram; no `src/`/`ios-native/` edits; no env values printed
anywhere; test bridges on :3102 (live) / :3105 (fake), both terminated after
their runs (the :3099 foreign bridge is R24's, untouched); production writes
this round (all labelled or disclosed): the DBG-6 tester questions + turns on
Wolfpack/Ambition, two "Probing step write latency" probe runs (§8.4), R35
probe missions under Aster in the e2e personal world; no other thread was
answered. One service restart (`kickstart -k`), healthy now; scoped commit,
nothing pushed.

## 1. Step before everything (already the order, now measured)

Verified in code, not just asserted: `_answer_one` writes `startRun` +
first step (`begin_turn`) BEFORE `context_pack` and before the brain call
(R31 put it there; R35 keeps it and times it). The only read before the step
is the one surface fetch that identifies the fresh block. Per-turn log line:

`[r35] timing thread=… pickup_s=… step_s=… pack_s=… model_s=… sentence_s=… done_s=…`

`pickup_s` = poll time minus the user block's server `createdAt`; all other
stages count from the poll. The old `[r31] timing` line is replaced.

## 2. One-second poll, cached tree, faster pack

- **Poll at 1 s.** New knob `R25_POLL_S` (default 1.0; an explicit
  `R33_FAST_POLL_S` env is still honoured). `poll_interval()` returns
  `min(R25_TICK_S, R25_POLL_S)` while the fast query answers, `R25_TICK_S`
  otherwise. Fallback is used only while the fast query errors (probe every
  tick on masked Server Errors, 300 s negative cache only on
  not-found-shaped answers -- unchanged R33 behavior, unit-pinned).
- **Tree cache.** `sweep()` serves the cached nav for `R35_TREE_S` (default
  60 s) and refreshes early when the service marks it dirty; every finished
  turn marks it dirty (a turn always mutates: run + events). The fallback
  tick rides the same cache instead of sweeping every tick.
- **Pack.** Project notes cached per project for 5 min (`R35_NOTES_S`);
  surface + ledger + visual + project detail fetched in 4 parallel threads
  over the raw client with `allow_refresh=False` (auth loss falls back to
  one serial locked call each -- the R31 sweep pattern, so the single-use
  refresh token never races); surface window capped to the last 40 blocks
  (`R35_SURFACE_CAP`).

## 3. Timing table, before / after (per stage, seconds)

Before = R26 row + R35 session-start log lines (`step_s=0.6-1.6` after
pickup, pickup on the 15 s tick or 1.5 s fast poll). After = DBG-6 service
lines, same code that now serves production:

| stage | before | Q1 Wolf | Q2 Wolf | Q3 Amb | Q4 Amb |
|---|---|---|---|---|---|
| pickup (block → poll) | ≤15 (tick) / ~1.5 | 0.4 | 0.9 | 0.3 | 0.7 |
| step write (2 mutations) | unmeasured | 4.2 | 4.0 | 1.2 | 1.4 |
| pack build | 1.5-4 | 3.5 | 3.1 | 0.7 | 0.7 |
| model (muse) | 6-17 | 12.0 | 6.0 | 5.9 | 8.9 |
| first block, user side | 6-9.5 | 8.3 | 9.3 | 3.1 | 2.9 |
| first sentence, user side | 20-48 | 23.3 | 17.9 | 10.0 | 12.5 |
| done, user side | 23-50 | 40 | 31 | 22 | 27 |

Pack ≤ 1 s warm holds on Ambition (0.7). Wolfpack Q2 stayed 3.1 s with warm
notes: the reads are thread-size-bound (the 40-cap slices client-side after
a full-surface fetch). A real cap needs a server-side limit on
`getConversationSurface` -- backend change, out of scope for this round
(commits were scoped to `scripts/` + mission + `e2e/chat.spec.ts`).

The 4 s Wolfpack step writes are transient backend latency, not the
mechanism: the same two mutations timed ~0.3 s each on both threads minutes
later (§8.4). Typical first-block arithmetic is now
pickup(≤1) + step(~1) + web poll/render(~1-2) ≈ 3 s; Q3/Q4 landed 3.1/2.9 s.

## 4. DBG-6 transcript + scores (against FACTS.md)

Same four questions, tester account, production dashboard, restarted R35
service. Full replies in `/tmp/dbg-run6.json`.

- **Q1 Wolfpack latest** (first 8.3 s, done 40 s): site live at
  wolfpackcompanies.com, contract signed by Ross and closed, waiting on the
  draft approval; sources named (thread + notes), ledger honestly empty of
  fresh rows, no run noise. **2/2.**
- **Q2 Wolfpack next** (9.3 s / 31 s): Ross shoot-dates follow-up +
  approval-or-edits ask. "Saved in Gmail Drafts" still unconfirmed (fourth
  round running -- the sure thing is still the FILE draft). **1.5/2.**
- **Q3 Ambition brand kit** (3.1 s / 22 s): v2 kit quoted exactly (navy
  `#1B2A4A`, red `#C41E3A`, ivory, amber-numbers-only, Barlow 800/900 +
  Inter, square navy cards, 6–8px red left stripe, never orange), video
  uses v2 "not the attached brand-guidelines.md", footage path + Drive
  account. **2/2.**
- **Q4 Ambition shipped/queued** (2.9 s / 27 s): PR schema + FAQs + clips
  redo (still self-reinforcing -- stated, not flagged), queued missions
  real, `R1 Vision interview` listed unflagged. **No example.com, no probe
  content: the C009 leak stays closed.** **1.5/2.**

**Total 7/8** (DBG-4 7/8, DBG-5 7/8 -- holds). The `r33-2` self-reinforcement
rule (contract only: anything ONLY earlier brain replies say is flagged
`unconfirmed in our notes` or dropped, never stated) did not visibly bite
in this sample -- Q4 states the clips redo and the R1 item bare. A
bridge-side gate for it needs semantic claim tracking; tabled, not built.

## 5. Two real defects the suite run exposed (both fixed)

1. **Seed skipped on the R20_THREAD path.** `Bridge.setup()` returns early
   when `R20_THREAD` is set, before `ensure_artifact()` -- so a probe
   chosen by id has no deck artifact, a looking ask has nothing to open,
   and chat test 6 fails deterministically (first R35 suite run: 5 passed,
   test 6 failed with "Opened the Aster deck…" text and zero tabs).
   Fix: seed on that path too (unit-pinned; verified live -- the fresh
   probe carried the site artifact before the re-run).
2. **Streamed first sentences bypassed the C001 gate.** The emit lands
   during the brain call, before `execute_plan` scrubs the wording, so the
   claim above reached the thread with no event behind it (the run's own
   log proves the gate never saw it). Fix: `gate_stream_for_plan` scrubs
   the streamed sentence against the skeleton (`plan_has_visual_event`,
   now shared with `enforce_ui_claims`); an emptied sentence emits a
   neutral "On it." while chunk reconciliation still appends the rest
   exactly once (unit-pinned ×3).

## 6. Gates and hard lines

- `python3 scripts/test_v2_team_bridge.py`: **111/111** (100 R33 + 11 R35:
  1 s poll knob, contract rule, surface cap ×2, parallel reads, pack-query
  auth fallback, notes memo, tree cache, visual-event predicate, stream
  gate, thread-path seed).
- Live chat suite on production (test bridges :3102 live-muse +
  :3105 fake, R35 code, fresh probes each): full run **9 passed, 1 skipped
  (test 8, by design)** in 3.4 min -- tests 1-6, 10, 11, defects; then
  test 9 alone against the fake bridge **passed** (17.8 s). Combined:
  **10 passed, 1 skipped.** Image test: PNG bytes in 6.6 s, magic
  asserted. Evidence `R21-reply-*-r35b.txt` in `rounds/evidence/`.
- Service: restarted once via `kickstart -k`; health `contract: r33-2`,
  169 threads, `turnsLastHour` preserved across the restart. The restart
  took ~4 min to serve (baseline sweep over 169 threads before listen).
- Worktree untouched (its dirty files are other lanes'); `e2e/chat.spec.ts`
  needed no changes.

## 7. Commits (scoped paths only, nothing pushed)

- AOM-EA (this repo): `scripts/v2-team-bridge.py` (1 s poll, tree cache,
  notes cache, parallel pack, 40-cap, r35 timing, r33-2 rule, stream gate,
  thread-path seed) + `scripts/test_v2_team_bridge.py` (111/111) + this
  file + `rounds/evidence/R21-reply-*-r35b.txt`: commit now (see git log).
- Left alone on purpose: everything else in the working tree (other
  workers' files), `corner/state/*` runtime files, service env/bot
  identity, backend, `src/`, the foreign :3099 bridge, the 11:27 PM `-s`
  bridge process (not mine; does not hold the service lock).

## 8. Incidents (mine, all disclosed)

1. **First suite run failed test 6 on a dirty-by-design probe** (no seed
   -- §5.1, my setup missed it, not the product). Re-ran once on a fresh
   seeded probe: 9/1, plus test 9 separately. One full-suite attempt per
   fresh probe (R31's lesson, re-learned); the dirty probe (`…8dz06z`)
   keeps its 5 turns + 1 unclaimed looking turn under Aster in test
   traffic, invisible on the dashboard.
2. **Two "Probing step write latency" runs** (startRun + step +
   finishRun, tester account) sit on the live Wolfpack and Ambition
   threads -- visible step rows, done runs, no text. Needed for the §3
   split; no delete path exists. Patrik: please ignore them.
3. **One transient 401** on a tester password sign-in mid-round; retry
   seconds later returned 200 (same transport flakiness class as R33
   §8.4). The service's own 401 self-heal was not involved.
4. **My own probe-script bug**: first latency attempt sent a bogus
   `Bearer x` header on the sign-in call (immediate 401, mine, fixed --
   sign-in sends no token).
5. **Restart took ~4 min to serve** (no new log lines, :3100 refused):
   the baseline sweep runs before listen. Verified via process + lock
   inspection, not by touching anything. A second long-lived `-s` bridge
   process (11:27 PM, not mine) is still around; it does not hold the
   service lock -- left alone.

## 9. For the orchestrator

- The ≤ 3 s-every-time tail needs two out-of-scope pieces: a server-side
  window on `getConversationSurface` (Wolfpack-size threads keep packs at
  ~3 s), and the web poll/render interval (bridge delivers the step at
  pickup + ~1 s typical; the rest to first paint is backend + web).
- Suggested next chat item: a bridge-side self-reinforcement gate (§4) if
  the r33-2 prompt sentence does not move the next DBG sample.

## 10. For Patrik (confirm, never guess)

1. Ross shoot-dates email: still FILE draft vs "Gmail Drafts" -- same open
   question, fourth round running.
2. `R1 Vision interview` (listed as queued for Ambition) still matches no
   live mission -- real and renamed, or brain confabulation?
3. "Social clips 01–03 redo with v5 notes" -- same self-reinforcement flag
   as DBG-4/5: what actually shipped for Ambition this week?
4. Please ignore on Wolfpack/Ambition: my 4 DBG-6 tester turns plus two
   "Probing step write latency" step rows (mine, §8.2); and the R35 probe
   missions/artifacts under Aster in test traffic (personal-world only).
5. First-block feel check: Ambition answers now open in ~3 s; Wolfpack
   opens slower when the backend is slow (~8-9 s on 2 of 4 turns tonight)
   -- the service picks up in under a second either way.
