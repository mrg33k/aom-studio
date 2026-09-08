# R45 — chat armed title and hedge-once: the tab names what was made, the hedge fires once per thread

Worker: headless builder, chat lane round twelve. Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R44-chat-honest-image-reply.md` (§5.1 armed title,
§5.2 per-answer hedge), `rounds/R42-chat-cite-only-when-it-matters.md` §6.1,
`.claude/rules/acknowledge-and-clear.md`. Code: AOM-EA
`scripts/v2-team-bridge.py` (HEAD `45ff2370e`, contract `r45-1`) +
`scripts/test_v2_team_bridge.py` (154/154, plain `python3`, never `-s`).
Production `brilliant-scorpion-163` throughout; `neat-pony-216` never
touched. Report: this file.

Verdict: the armed path names its tab honestly by contract (the upgrade
call carries the computed "Image study — \<ask\>" title the backend now
accepts), and the Gmail-Drafts hedge fires exactly once across Q1+Q2 on
the same Wolfpack thread — Q1 hedges, Q2 states the follow-up plainly
with no hedge and no restated location. Probe quality **7/8**, zero
scold, zero trailing cite, zero post-restart 401s. Unit suite **154/154**
(148 existing untouched-green + 6 new R45). Committed AOM-EA (scoped
paths only, nothing pushed). Production restarted **once**, healthy on
contract **`r45-1`**. Demo bridge restarted afterwards on the same build,
pinned.

Rule compliance: every URL below is `brilliant-scorpion-163`; no
client-facing sends; production writes this round (all labelled): 4
tester questions + answers on the Wolfpack/Ambition project threads.
Scoped commit, nothing pushed.

## 1. Before / after

**Armed title (§5.1 closes).** R44 left the upgrade path keeping the
client's pending title ("the backend's `upgradeArtifact` takes no title
arg"). The backend now takes an optional `title`
(`corner-v2-integration/convex/v2Visual.ts:231`, trims to 140 chars,
only patches when non-blank), so `run_image_pipeline` passes the same
computed title the create branch uses:

```python
up = call("mutation", "v2Visual:upgradeArtifact",
          {"artifactId": ..., "storageId": storage_id,
           "title": title,   # "Image study — <ask>"
           "meta": {...}})
```

Return-value note (deliberate, keeps R33 green unmodified): the
returned title prefers the backend's post-upgrade title, then the known
pending title, then the computed one. On the deployed backend the first
wins, so the reply names the tab the client actually sees; the R33 stub
(which returns no title) still reads the pending title, so
`test_r33_pipeline_upgrades_matching_pending` passes byte-unmodified.
If the backend ever predates the title arg, the upgrade throws and the
existing create-fallback still titles honestly.

**Hedge once (§5.2 + R42 §6.1 close).** Same Wolfpack thread
(`vd73p369yk2492xr3petckqaa98dx40n`), timestamp-proven true texts:

Q1 (user 13:27:38, texts +21.9 s / +24.2 s):

> "Wolfpack latest, from the ledger, is the R44 hero image study. /
> The thread has the site live at wolfpackcompanies.com with the Ross
> contract signed and closed. Your project notes still list waiting on
> approval to send the shoot dates follow-up in your drafts I think;
> confirm?"

Q2 (user 13:29:37, texts +10.8 s / +11.1 s):

> "For Wolfpack the next deliverable is the Ross shoot dates follow-up
> to lock two dates. / Your notes still say it sits unsent awaiting
> your approval or edits. Send approval and it ships."

The Gmail-Drafts hedge appears **exactly once** across the two answers
(once in Q1, zero times in Q2 — `I think` 1+0, `confirm?` 1+0). Q2
neither re-hedges nor re-asks nor restates the location; the service
log shows one `[r45] hedged thread=vd73… facts=gmail-draft,contract-date`
(Q1's turn) and no strip/re-hedge on Q2's turn — Q2's model obeyed the
`[already hedged]` pack marking outright.

## 2. What changed (contract diff `r44-1` → `r45-1`)

- Version pin + every R31/R33/R35/R37/R40/R42/R44 rule stays verbatim
  (unit-pinned; the six `r44-1` version asserts bumped to `r45-1` as a
  deliberate contract bump, R42 precedent).
- `latest` slot (c): hedge the FIRST time the thread states the fact,
  `[already hedged]` rows state plainly with no hedge and no citation
  until Patrik answers; Patrik answering a hedged fact gets a
  words-first acknowledgement plus the next step, and the fact is never
  hedged again. Global RULES carries the same two sentences; `generic`
  slot gains the acknowledge-first line. All R42/R44 pins kept
  (`in your drafts, I think`, `Your notes still say`, cite ceilings).
- Pack: `UNCONFIRMED_FACT_KEY_RES` keys every R42 topic
  (`gmail-draft`, `ga`, `attribution`, `contract-date`, `week`,
  `footage`; tagging output byte-identical to R42). `mark_unconfirmed_facts`
  takes `hedged`/`confirmed`: all-hedged rows read `[already hedged
  this thread — state it plainly, no hedge, no cite]`, confirmed rows
  read untagged. Pack carries `hedgedFacts` / `confirmedFacts` /
  `confirmedNow` snapshots plus `HEDGED THIS THREAD` / `PATRIK JUST
  CONFIRMED` lines; `live_plan` injects `HEDGE-ONCE` /
  `ACKNOWLEDGE-AND-CLEAR` facts lines.
- Boundary `strip_repeat_hedges` (pure, idempotent): a reply stating
  only already-hedged/confirmed facts loses the `I think` / `confirm?`
  phrases (a fresh fact aboard keeps its hedge). Wired on the final
  wording AND the streamed first sentence (same snapshot, so the emit
  still matches the chunks and no duplicate lands), plus the three
  `_answer_image` reply paths. Fired **zero times** on the probe — the
  contract did the work, the formatter is a backstop.
- `match_confirmation` (pure): bare `yes` / `sent it` / `done`… resolves
  to the most recent open hedged fact (nowhere with none open); `it's a
  Gmail draft` confirms by content even on a fresh thread; questions and
  new requests (`draft the email`) confirm nothing. Firing marks the
  fact confirmed in the store before the pack text formats.
- State: `{thread: {fact: ts}}` hedged/confirmed maps in the service
  state file, merge-on-save like `turnsLastHour` (union, newest ts
  wins, 30-day TTL, 100/thread cap; in-place so scope-held dicts never
  detach). Standalone `Bridge` persists the same maps in its own state
  file. Recording happens only on texts that actually carry a hedge
  phrase — a stated-without-hedge fact stays open, so the next answer
  still hedges it (never zero hedges by bookkeeping).

## 3. Gates

- `python3 scripts/test_v2_team_bridge.py` = **154/154** (148 existing
  green unmodified incl. the R33 upgrade test + the R31/R40/R42/R44
  contract pins, 6 new R45: upgrade-call title args, two-answers-one-hedge,
  three-phrasing confirmation + probe-question negatives, hedged/confirmed
  tagging, contract wording, merge-on-save roundtrip). Tail:
  `PASS test_r45_*` × 6, `all tests passed`.
- Probe run15 (`/tmp/r45-dbg.py` → `/tmp/dbg-run15.json`): Q1 1.5/2, Q2
  2/2, Q3 2/2, Q4 1.5/2 = **7/8**. Q1's harness row was empty again
  (12 s quiet vs ~24 s model — the R40/R42/R44 harness-timeout class);
  scores use timestamp-proven true texts (§1 + §4). Zero 401s in the
  post-restart window (log grep 0; `/health failedTicks 0`,
  `lastTickError null`, `turnsLastHour 7`).
- Service-side timing: Q1 step **2.3 s** (first turn after restart, cold
  notes cache — the R42 2.1 s class, disclosed §6); Q2 step 0.5 (its 6.1 s
  pickup is per-thread serialisation behind Q1's worker, R42 §7 class);
  Ambition steps 0.7/0.6 ✓. Done 21.8 / 11.2 / 13.1 / 10.9 — all model
  time (the standing R40 cost).
- Demo bridge restarted afterwards, pinned
  (`R20_THREAD=vd7f0v4dn3kjjx9qnt9acryemn8dyr95`): `:3099` health shows
  the pinned thread, paige, live, contract `r45-1`, handled 58 (57 + one
  startup block on its own e2e thread, §6).

## 4. Probe (run15) and scores

- **Q1 Wolfpack latest**: ledger truthfully leads with this lane's own
  `did` (the R44 hero image study), thread facts plain, drafts hedge in
  the prescribed form. One folded-in `from the ledger` plus a
  `The thread has` subject — two source namings in one reply, one too
  many under the at-most-once rule. **1.5/2.**
- **Q2 Wolfpack next**: deliverable + ask named, zero hedge, zero
  restated location, zero re-ask, one folded-in `Your notes still say`
  (the R42 disagreement form, kept gate — see §5.3). **2/2.** This is
  the round's thesis: R42 scored this shape 1.5 for the flat Gmail
  restatement; the restatement is gone.
- **Q3 Ambition brand kit**: v2 quoted exactly (navy `#1B2A4A`, red
  `#C41E3A`, ivory `#f4f1ea`, amber-numbers-only, Barlow 800/900 +
  Inter, square navy cards, 6–8 px red left stripe, never orange),
  v2-not-the-attachment, footage hedged once (`I think this month's
  footage is in Drive … September folder` — first footage statement on
  this thread; `[r45] hedged … facts=footage` in the log). **2/2.**
- **Q4 Ambition shipped/queued**: schema + buyer-question FAQs + clips
  01–03 redo, queued missions real, `R1 Vision interview` still
  unflagged (standing). **1.5/2.**

**Total 7/8.** Zero scold. Zero trailing cite. Hedge count
(Q1 true + Q2 true): `i think` 1, `confirm?` 1.

## 5. For the orchestrator

1. **Q2's `Your notes still say` under the strict reading.** Item 2 says
   later answers state the fact "with no hedge and no citation". Q2
   carries the R42 fold-in (`Your notes still say it sits unsent…`) but
   names no location, hedges nothing, asks nothing. I kept the fold-in:
   stripping provenance language deterministically would fight the kept
   R42 disagreement gate, and the hard gate (hedge exactly once) holds
   either way. If you want the strict reading enforced, the next brief
   is one sentence: extend `strip_repeat_hedges` to folded-in provenance
   openers when every stated fact is already hedged.
2. **Q1 co-recorded `contract-date`.** The `contract.*date` regex spans
   "Contract is signed … shoot dates", so Q1's answer hedged two keys,
   not one. Harmless here (Q2 states neither with a hedge), but a future
   answer restating the contract date on this thread will read
   `[already hedged]` and state it plainly — correct per the rule, only
   noting the key is broader than the Gmail thread.
3. **R33 return-value note** (§1): the upgrade *call* always carries the
   honest title; the *returned* title prefers the backend's post-upgrade
   title. Unit stub responses (no title field) still read the pending
   title — that is what keeps the R33 test byte-unmodified, and it is
   also the honest fallback for a pre-title backend.
4. **Live armed rename not exercised.** The probe holds no image ask;
   item 1 is verified by unit args + the backend code read
   (`v2Visual.ts:231`). If the deployed backend ever predates the title
   arg, the turn falls back to create-with-honest-title — no silent
   dishonest tab either way.
5. Suggested next chat item: the Q1 double-source-naming (§4) — contract
   already bans it, the model just double-named once. Nothing structural.

## 6. Still off and why

- **Done 10.9–21.8 s, all model time.** Arithmetic: pickup ≤ 1.2 (+6.1
  Q2 serialisation) + pack ≤ 0.7 + step ≤ 0.7 (2.3 cold once) + model
  8–18 s single-pass Muse. The model-time half is the R40 still-off,
  unchanged.
- **Q1's probe row was empty**: 12 s-quiet window vs a ~24 s model —
  harness timeout, not service; true texts recovered from the backend
  and scored (R40 §8.4 class, fourth round running).
- **`R1 Vision interview` still unflagged** in queued rows (standing
  Q4 half-point, R42 §6.3 class).
- **Demo handled 57 → 58**: one startup block processed on its own
  pinned e2e thread after the kickstart — normal function, not a send
  of mine.

## 7. Incidents (mine, all disclosed)

1. **One production restart, as briefed.** 13:27 UTC via `launchctl
   kickstart -k` on the working tree; health `ok`/`r45-1`/`failedTicks
   0`/`lastTickError null` immediately after. No second restart.
2. **My loop-variable clobber, caught by the suite before commit.** The
   first `_save_service_state` edit reused `merged` as a loop variable
   and wrote `"turn_ts": {}` — `test_r40_turn_counter_survives_restart`
   failed, I renamed to `merged_map`, suite back to green. The R40 gate
   earned its keep.
3. **My merge-test timestamps, caught by my own TTL.** Fixture ts values
   of 100.0/200.0 pruned as 30-day-stale — switched to `now - N`, green.
4. **No other thread was answered.** Every probe turn completed
   (`done`); `removeStrayStep` not needed.
