# R40 — chat health and voice: health tells the truth, the service heals itself, the driver stops prefixing

Worker: headless builder, chat lane round nine. Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R37-chat-fast-plain.md`, `rounds/LEDGER.md` row
"CHAT OUTAGE (found + hotfixed)", `punch-list.md` row **C011**. Code: AOM-EA
`scripts/v2-team-bridge.py` + `scripts/test_v2_team_bridge.py`. Production
backend `brilliant-scorpion-163` throughout; `neat-pony-216` never touched.
Report: this file (uncommitted, for the orchestrator to pick up).

Verdict: `/health` now reddens (degraded after 3 failed discovery ticks,
heals on the first good one), any 401 in any path funnels through one
serialized bare re-sign-in (backoff 2 s → 30 s, dead after 10), startup
listens in ~4.3 s with the 169-thread grounding sweep moved to a background
warmer (169/169 in ~21 s), the "From the project notes …" every-sentence tic
is gone by contract (each source cited at most once — proven against the
03:15 old-build tic quoted in §4) with a boundary dedup that never had to
fire. Probe quality **7/8**, zero scold, zero repeated opener, zero post-
restart 401s. Unit suite **138/138** (129 + 9 R40, plain `python3`).
Committed AOM-EA `1fbb84131` (scoped paths only, nothing pushed). Service
restarted **twice** (second disclosed in §8 — the first restart's own anomaly
demanded the merge fix), healthy on contract **`r40-1`**. The demo bridge
is back on the pinned thread on the same build.

Rule compliance: every URL below is `brilliant-scorpion-163`; no client-
facing sends; production writes this round (all labelled or disclosed): 5
tester questions + answers on the Wolfpack/Ambition project threads (Q1, Q2,
Q3, Q4, one Q1 rerun), one second-client bot sign-in (new session only, no
writes, §3), read-only surface/nav/runs/fast-query reads. Scoped commit,
nothing pushed.

## 1. Gates

- `python3 scripts/test_v2_team_bridge.py` = **138/138** (129 existing
  untouched and green + 9 new R40: contract cite-once, dedup pure, voice
  boundary, health degrade/heal, tick-recovers-after-401, 10-fails-go-dead,
  counter round-trip + merge, shell floor/ready, setup makes no per-thread
  reads). New-test lines: all `PASS test_r40_*` (§7).
- Probe on production after restart (contract `r40-1`): no 401s in the log
  since restart (0 post-restart `HTTP Error 401`, 0 tick errors); step
  **0.7 s on all 5 turns** (≤ 1.5 ✓✓✓✓✓); first sentence 8.1 / 7.8 / 8.7 ✓
  but **18.8 / 14.2 ✗ on Wolfpack-latest** (≤ 10); done 9.6 / 9.2 / 10.7 ✓
  but **20.4 / 15.5 ✗ on Wolfpack-latest** (≤ 15). Both misses are pure
  model time (§6). Quality **7/8** ✓, zero scold ✓, zero repeated opener ✓.
- Demo bridge restarted on the same build afterwards, pinned
  (`R20_THREAD=vd7f0v4dn3kjjx9qnt9acryemn8dyr95`, env from
  `/tmp/r21-live-bridge.envlist`): `:3099` health shows the pinned thread,
  paige, live, contract `r40-1`, handled 57 preserved.

## 2. Before / after

| # | Before | After (this round) |
|---|---|---|
| 1 | `/health` = `{"status": "ok", …}` always (green through the 37-min 401 outage) | `status` + `lastOkTickAt` + `lastTickError` + `failedTicks`; `degraded` after 3 consecutive failed discovery ticks, `ok` on the first good one |
| 2 | 401 on unlocked paths (`allow_refresh=False`) raised without healing; concurrent 401s raced refresh/sign-in; a dead session sat green forever | Any 401 (locked or not) → one serialized bare password re-sign-in (token cleared, single-use refresh never raced); backoff 2 s → 30 s max; 10 in a row → `ConvexAuthDead` → exit 1 for a clean launchd restart |
| 3 | Deploy invalidated the session; recovery unproven | Second-client sign-in does NOT invalidate (negative result, §3); dead-bearer recovery 3.7 s and dead-bearer+dead-refresh recovery 4.0 s proven live on production with the final code |
| 4 | DBG-8 Q1 opened every sentence with "From the project notes" | Contract: cite each source at most once, never the same opener twice; boundary `dedup_repeated_openers` + `_voice` backstop (never fired — the model obeyed); Q1 reply cites ledger/thread/notes exactly once each |
| 5 | `turnsLastHour` read 1 while ~12 turns fell in the hour (R37 §8.5); silent save failures; last-writer-wins clobber | Round-trip + merge-on-save (writers compose, never clobber) + loud save failures + prune-on-append + pid-tagged state line; live count 3 → 8 across the probe; restart #2 loaded exactly what was there |
| 6 | Startup ≈ 3 min before `listening` (per-thread describe + full baseline) | Sweep shells scopes (nav floor, zero per-thread reads); background warmer readies 169/169 in ~21 s; `[r40] startup` line: `sign_in_s=0.4 tree_s=3.9 scopes=169 listen_s=4.3 warmer=background` |

## 3. Deploy-resilience simulation (brief item 3)

Second-client sign-in as the bot at 11:25:08 UTC succeeded — and changed
nothing: zero 401s in the service log in the following 45 s, health stayed
`ok`/`failedTicks 0`/`lastTickError null` with a fresh `lastOkTickAt`. So a
second password session does **not** invalidate the first; Convex Auth
password sessions are independent, and the deploy-invalidation mechanism is
server-side (session-secret rotation on deploy is the standing hypothesis).
I must not deploy, so that half is untestable by me — stated plainly.

What I proved instead, live on production with the final R40 code (throwaway
client, tester account — bot and service untouched):

- poisoned bearer, valid refresh → healed in **3.7 s** (refresh path);
- poisoned bearer + poisoned refresh (the true deploy shape) → healed in
  **4.0 s** via the serialized bare password re-sign-in, streak reset to 0.

Both well under the 30 s bar. Unit level: fake transport 401s twice then
succeeds → `tick_fast` fails once (`failedTicks 1`, `lastTickError` carries
the 401, one sign-in total, no restart) then recovers (`failedTicks 0`,
`lastOkTickAt` set) — §7.

## 4. Voice: the tic and its death

The 03:15 old-build Q1 (still on the Wolfpack thread, pre-R40) is the
disease specimen — one reply, three sentences, all three opening identically:

> "From the project notes the site is live at wolfpackcompanies.com. From
> the project notes the contract is signed by Ross and closed. From the
> project notes we are waiting on your approval …"

Tonight's Q1 (contract `r40-1`, same question, same thread):

> "From the ledger, Wolfpack shows no added rows. Site is live at
> wolfpackcompanies.com. The Ross shoot dates draft is still unsent in Gmail
> Drafts, from the thread. Contract is signed by Ross and closed, and we
> await your approval to send it, from the project notes."

Ledger/thread/notes cited exactly once each; no opener repeats; no scold —
and the rerun was a *literal repeat question* (identical text, 5 min later),
answered plainly as if first asked. The `[r40] opener-stripped` boundary
never fired all night (zero lines in the log): the contract fixed the
behavior, the formatter is a backstop. Q2–Q4 likewise cite at most once and
never repeat an opener (full texts in `/tmp/dbg-run12.json` + §5 rerun).

## 5. Probe (run12 + Q1 rerun) and scores

Service stages per turn (pickup / step / pack / model / sentence / done):

| row | stages | user-side first / sentence / done |
|---|---|---|
| Q1 Wolfpack latest | 0.5 / **0.7** / 0.6 / 17.9 / 18.8 / 20.4 | 6.1 / — (probe 12 s-quiet timeout beat the 18.8 s model) / 19 |
| Q2 Wolfpack next | 5.0 / **0.7** / 0.7 / 6.6 / **8.1** / **9.6** | 6.3 / 6.3 / 30 (window smear, see below) |
| Q3 Ambition brand | 0.3 / **0.7** / 0.5 / 6.9 / **7.8** / **9.2** | 2.9 / 10.0 / 23 |
| Q4 Ambition shipped | 0.6 / **0.7** / 0.4 / 8.0 / **8.7** / **10.7** | 2.9 / 11.0 / 25 |
| Q1 rerun | 0.8 / **0.7** / 0.7 / 12.9 / 14.2 / 15.5 | 2.8 / 17.0 / 38 |

Bold = meets the brief's per-row targets. Step 5/5. Sentence/done 3/5 —
both misses are Wolfpack-latest model time (§6).

Attribution note (mine, disclosed): Q1's two text blocks landed at +20.9 s,
after its probe row closed, so the probe swept Q1's tail into Q2's row.
True texts were recovered from the backend per-thread (timestamps above);
scores use the true texts. Q2's own answer is its two 11:27:16 blocks.

DBG transcript (true texts, `/tmp/dbg-run12.json` + rerun):

- **Q1 Wolfpack latest** (turn-A texts): ledger honestly empty, site live,
  Ross draft unsent, contract signed-and-closed, approval wait. Cites once
  each, no scold, no tic. **2/2.**
- **Q2 Wolfpack next**: Ross shoot-dates follow-up, drafted-and-saved-not-
  sent, approval-or-edits ask. Gmail-Drafts-as-fact still bare (standing
  open). **1.5/2.**
- **Q3 Ambition brand kit**: v2 quoted exactly (navy `#1B2A4A`, red
  `#C41E3A`, ivory `#f4f1ea`, amber-numbers-only, Barlow 800/900 + Inter,
  square navy cards, 6–8 px red left stripe, never orange), v2-not-the-
  attachment, footage `My Drive/Client/AMBITION MECH SERVICES/September
  2026` + Drive account. **2/2.**
- **Q4 Ambition shipped/queued**: schema + buyer-question FAQs + clips
  01–03 redo, queued missions real, `R1 Vision interview` still unflagged.
  **1.5/2.**
- **Q1 rerun**: same facts, cites "From the thread" once + "Project notes
  confirm" once, plain repeat, no scold. Timing only.

**Total 7/8** (Q1 2, Q2 1.5, Q3 2, Q4 1.5). Zero scold. Zero repeated opener.

## 6. Why Wolfpack-latest misses sentence/done (mechanism evidence, not excuse)

Pack identical across the slow and fast turns on the same thread
(`pack_tokens` 4271–4326, notes 2993, thread/project/ledger rows 20/30/0);
bridge spans identical (begin ~0.7 s, surface ~0.55 s); `/r20/state`
`liveCalls` show every turn single-pass, single-attempt, zero violations,
same brain (mom) and backend (muse-spark): `latest` 17.9 s / 12.9 s vs
`generic` 6.6 / 6.9 / 8.0 s. The latest slot's longer synthesis generation
is slower on Muse tonight (DBG-8 ran the same slot at 6.5–7.3 s). No bridge
lever moves it — this is R37 §9.2 again, now with receipts. The gate miss
is real and reported as such.

## 7. Fake-401 test output (brief item 2, unit half)

`test_r40_tick_recovers_after_401s_without_restart` drives a REAL
`ConvexClient` + `ServiceBridge.tick_fast` with a `_post` fake that 401s
the fast query twice then succeeds (sign-in always works — the deploy shape
with a live password). First tick: one serialized re-sign-in, `failedTicks`
1, `lastTickError` carries the 401, still `ok`. Second tick: `failedTicks`
0, `lastOkTickAt` set, same service object (no restart). And
`test_r40_ten_failed_resignins_raise_dead`: 9 failures raise the original
401; the 10th raises `ConvexAuthDead` (backoff capped at 30.0), which
`service_main` turns into exit 1. Suite tail:

```text
PASS test_r40_contract_cites_source_at_most_once
PASS test_r40_dedup_cuts_repeated_openers_keeps_facts
PASS test_r40_health_degrades_after_3_failed_ticks_and_heals
PASS test_r40_setup_makes_no_per_thread_reads
PASS test_r40_shell_scope_floors_and_readies_without_answering_history
PASS test_r40_sign_in_never_carries_a_bearer
PASS test_r40_ten_failed_resignins_raise_dead
PASS test_r40_tick_recovers_after_401s_without_restart
PASS test_r40_turn_counter_survives_restart
PASS test_r40_voice_boundary_strips_repeat_opener
all tests passed
```

138/138 with plain `python3` (never `-s`).

## 8. Incidents (mine, all disclosed)

1. **Two restarts, not one.** #1 11:18 UTC (r40-1 landing: listen 4.4 s,
   warmer 169/169 in 20.7 s). #2 11:23:44 (ships the merge-on-save +
   pid-tagged state line that restart #1's own anomaly demanded — §5;
   listen 4.3 s, warmer 169/169 in 23.5 s). R37 precedent: disclose, don't
   hide.
2. **Restart #1 loaded `turnsLastHour` 1 from a file holding 2**, and the
   file carried saves at 11:17:24 / 11:23:26 / 11:23:34 with **no user
   blocks at those times on any thread** (proven by one indexed
   `threadsWithNewUserBlocks` call: only the probe's own blocks appear) and
   no turn log lines — i.e. direct state touches by another hand during the
   night's chaos, not turns. The old overwrite-save would have let writers
   wipe each other (the R37 "1 while 12" class); the shipped code merges
   (union, pruned, deduped), saves loudly, and tags the writer pid, so the
   class is now harmless and any recurrence is attributable. Restart #2
   loaded exactly what was there (3 → 3); the probe then counted 3 → 8
   live. Orchestrator: if you know who appended live timestamps to
   `service.json` at those three times, I would like the mechanism closed.
3. **Wrong-env demo launch (mine, ~20 s, no writes).** First demo relaunch
   missed the env file (script mode, unpinned thread `vd71d0…`). Its log
   shows setup + listen only, zero turns, handled unchanged at 57 — killed
   it and relaunched with the env file + `R20_THREAD` pin: `:3099` healthy,
   pinned design thread, paige, live, `r40-1`. Both daemons reparented to
   PPID 1 (verified), same detachment as before.
4. **Probe attribution smear** (Q1 tail in Q2's row) — §5, true texts used.
5. **Second-client bot sign-in** (11:25:08, success, new session, zero
   writes) — §3.

No other thread was answered. No ghost steps were created by R40: every
probe turn completed (`done`), and the phantom appends (§8.2) correspond to
no turns, hence no begins, hence no orphan steps. `removeStrayStep` not
needed.

## 9. Contract diff (`r37-1` → `r40-1`)

- Version pin + the R31 promise sentences stay verbatim (unit-pinned).
- `latest` slot: "Name every fact's source …" → "Name each fact's source
  AT MOST ONCE per reply ('From the ledger...' / 'From the thread...' /
  'From the project notes...' — one cite per source; a plain fact needs no
  cite at all); never open two sentences with the same words".
- Global RULES append: "cite a source at most once per answer (or never,
  when the answer is plain fact); never open two sentences with the same
  words."
- Boundary: `dedup_repeated_openers` (pure, idempotent — first occurrence
  keeps its opener, repeats lose the opener clause and keep facts, empties
  dropped, camelCase-guarded recapitalization) applied to the validated
  reply before chunking and in `_apply_wording` via `Bridge._voice`.

## 10. For the orchestrator

1. **Model path for Wolfpack-latest** is the only open timing lever (13–18 s
   single-pass Muse tonight vs 6.5–7.3 at DBG-8, identical packs). Either
   the sentence/done gates go per-slot, or the lane waits for a faster
   model path — R37 §9.2 stands.
2. Standing content opens (unchanged): Gmail-Drafts-as-fact still stated
   bare; `R1 Vision interview` still unflagged.
3. Please identify the service.json writer (§8.2) — or confirm it was your
   own poke; the merge covers it either way.
4. Suggested next chat item: nothing structural — the lane's misses are the
   model ask above. The R33 image-pipeline tests, the R37 ghost pair (C010),
   and the native `limit: 200` (R40-native) are all elsewhere.

## 11. Still off and why

- **First sentence ≤ 10 s / done ≤ 15 s on Wolfpack-latest (18.8/20.4,
  14.2/15.5).** Arithmetic: step 0.7 + surface 0.55 + model 12.9–17.9
  (single-pass, clean, same backend/pack as the 6.6–8.0 s generics).
  Bridge levers exhausted; needs §10.1. Everything else meets its gate.
- **Restart #1's 2 → 1 load** (§8.2): explained as far as the evidence
  goes (no-turn saves ⇒ external touch; merge + pid logging contain it).
- **Q1's first probe row was empty**: the probe's 12 s-quiet window vs an
  18.8 s model — harness timeout, not service; the rerun used a 20 s
  window. Q1 pickup 5.0 s on Q2 is per-thread serialization (Q1's worker
  still held the scope lock), not a gate.
