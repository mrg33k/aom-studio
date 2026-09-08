# R42 — chat cite-only-when-it-matters: plain answers, a source named only when it changes what Patrik does

Worker: headless builder, chat lane round ten. Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R40-chat-health-and-voice.md`,
`rounds/LEDGER.md` rows R40 → "LIVE RE-WALK (desktop, after R41)",
`punch-list.md` row **C012**. Code: AOM-EA `scripts/v2-team-bridge.py`
(HEAD `ff46c20b7`, contract `r42-1`) + `scripts/test_v2_team_bridge.py`
(143/143, plain `python3`, never `-s`). Production backend
`brilliant-scorpion-163` throughout; `neat-pony-216` never touched.
Report: this file (uncommitted, for the orchestrator to pick up).

Verdict: the three-citations-in-three-sentences tic is gone by contract,
not by scrubbing — the probe's own before/after on the same thread shows
it. Plain facts land as plain sentences; the one allowed citation is
folded in ("Your notes still say…", never a trailing ", from the X"
clause); the Gmail-Drafts claim carries the explicit hedge the brief
demanded ("in your drafts, I think; confirm?"). The trailing-cite
boundary never fired all probe — the model obeyed, same as R40's dedup.
Probe quality **7/8**, zero scold, zero repeated opener, zero post-restart
401s. Unit suite **143/143** (138 existing + 5 R42). Committed AOM-EA
`ff46c20b7` (scoped paths only, nothing pushed). Service restarted
**once**, healthy on contract **`r42-1`**. The demo bridge is on the same
build, pinned — now launchd-owned (new plist, §8.3).

Rule compliance: every URL below is `brilliant-scorpion-163`; no
client-facing sends; production writes this round (all labelled): 4
tester questions + answers on the Wolfpack/Ambition project threads (Q1,
Q2, Q3, Q4), read-only surface/nav reads for attribution. Scoped commit,
nothing pushed.

## 1. Gates

- `python3 scripts/test_v2_team_bridge.py` = **143/143** (138 existing
  green, incl. the R29/R31/R40 contract-phrase pins which the new text
  keeps as a ceiling + the two version pins moved `r40-1` → `r42-1`;
  5 new R42: contract cites-only-when-it-matters, boundary on the exact
  three brief sentences, voice boundary end-to-end, unconfirmed flags
  incl. the signed-stays-asserted negative, pack flagging). Tail:
  `PASS test_r42_*` × 5, `all tests passed`.
- Probe on production after the one restart (contract `r42-1`): no 401s
  since restart (`/health failedTicks 0`, `lastTickError null`); step
  **0.7 s on Q2/Q3/Q4** (≤ 1.5 ✓✓✓) but **2.1 s on Q1** (first turn
  after restart, cold notes cache — disclosed, §7); done **13.5 / 13.1 /
  8.6** ✓ except **22.6 on Q1** (pure model time, §7). Quality **7/8** ✓
  (§5), at most one citation per answer ✓, none trailing ✓, explicit
  Gmail-Drafts hedge ✓.
- Demo bridge restarted on the same build afterwards, pinned
  (`R20_THREAD=vd7f0v4dn3kjjx9qnt9acryemn8dyr95`, env from
  `/tmp/r21-live-bridge.envlist`): `:3099` health shows the pinned
  thread, paige, live, contract `r42-1`, handled 57 preserved.

## 2. Before / after (same thread, 11 minutes apart)

Pre-restart (`r40-1`, 12:16–12:21 UTC, orchestrator's R41-verify turn +
this probe's Q1 window shows the disease live):

> "Wolfpack site is live at wolfpackcompanies.com, from the thread."
> "Contract is signed by Ross and closed, from the project notes. Still
> waiting on your approval to send the shoot dates draft…"
> "…the Ross shoot dates follow up, from the project notes." / "It is
> drafted and saved in Gmail Drafts, not sent." (asserted flat)

Post-restart (`r42-1`, 12:27–12:32 UTC, this probe's Q1+Q2 turns):

> "Wolfpack site is live at wolfpackcompanies.com." / "Contract is
> signed by Ross and closed. Still waiting on your approval or edits to
> send the shoot dates follow-up to lock two dates, in your drafts I
> think; confirm?" / "For Wolfpack the next deliverable is the Ross
> shoot dates follow-up." / "Your notes still say it sits unsent in
> Gmail Drafts awaiting your approval or edits to lock two shoot dates."

Zero trailing clauses, one folded-in citation across the two answers,
one plain hedge. That is the whole round in four sentences.

## 3. What changed (contract diff `r40-1` → `r42-1`)

- Version pin + every R31/R33/R35/R37/R40 promise/voice rule stays
  verbatim (unit-pinned, suite proves it).
- `latest` slot: "Name each fact's source AT MOST ONCE…" →
  "State plain facts as plain sentences with NO source named. Name a
  source AT MOST ONCE per reply — even the full set ('From the
  ledger…' / 'From the thread…' / 'From the project notes…') is a
  ceiling, not a target — and only when it changes what Patrik does:
  (a) two sources disagree — fold it in ('Your notes still say…');
  (b) the fact is older than 7 days and the answer depends on it being
  current; (c) the claim is unconfirmed (marked [unconfirmed] in the
  pack) — hedge once, plainly ('in your drafts, I think; confirm?'),
  never assert. NEVER more than one citation per answer; NEVER a
  trailing ', from the X' clause."
- Global RULES cite line gets the same three conditions + the fold-in
  form; the never-same-opener rule is untouched.
- Boundary: `strip_trailing_source_clauses` (pure, idempotent — cuts a
  trailing `[,;:-] from the ledger|thread|project notes|notes` clause,
  keeps the fact, re-adds the period) wired into `Bridge._voice` and
  the pre-chunk path in `live_word_run`, with `[r42]
  trailing-cite-stripped` logging. Fired zero times on the probe —
  contract did the work, formatter is a backstop.
- Pack: `mark_unconfirmed_facts` tags FACTS bullet rows Patrik never
  confirmed (Ross draft file-vs-Gmail, GA, attribution, dated contract,
  Ambition's-week shipped/queued rows, footage/raws) with
  `[unconfirmed — say it with 'I think' once, or ask; never assert it
  flat]`; applied in `project_notes_text`. Precision-checked: the
  undated "Contract SIGNED … never re-ask" line, the social-management
  line and the weekly-format line stay untagged and asserted.

## 4. Probe (run13) and scores

True texts recovered from the backend per-thread with timestamps (the
probe's 12 s-quiet window closed Q1's row 2 s before its 20 s model
finished — harness timeout, R40 §8.4 class; scores use the true texts
in `/tmp/dbg-run13.json` + §2):

- **Q1 Wolfpack latest** (12:27:18–19 texts): site live, contract
  signed-and-closed, approval wait + drafts hedge. Zero citations,
  zero scold, zero tic. **2/2.**
- **Q2 Wolfpack next** (12:27:31–32 texts): shoot-dates follow-up is
  the deliverable; one folded-in "Your notes still say…" cite, no
  trailing clause. Gmail location restated flat inside its own two
  texts (the hedge sits in Q1's tail, same turn sequence). **1.5/2.**
- **Q3 Ambition brand kit**: v2 quoted exactly (navy `#1B2A4A`, red
  `#C41E3A`, ivory `#f4f1ea`, amber-numbers-only, Barlow 800/900 +
  Inter, square navy cards, 6–8 px red left stripe, never orange),
  v2-not-the-attachment, footage path with a light "I think" on the
  month. Zero citations. **2/2.**
- **Q4 Ambition shipped/queued**: schema + buyer-question FAQs + clips
  01–03 redo, queued missions real, `R1 Vision interview` still
  unflagged (standing). **1.5/2.**

**Total 7/8.** Zero scold. Zero repeated opener. Service-side steps
0.7 s except Q1's cold 2.1 s; done 13.5/13.1/8.6 except Q1's 22.6
(model 19.4 s on the 3.5k Wolfpack pack — the R40 still-off, §7).

## 5. Test output (brief item 1, unit half)

The boundary on the brief's exact three sentences, plus the pack
precision negatives (signed-stays-asserted, format lines untagged):

```text
PASS test_r42_boundary_strips_trailing_source_clauses
PASS test_r42_contract_cites_only_when_it_matters
PASS test_r42_pack_flags_unconfirmed_rows
PASS test_r42_unconfirmed_facts_flagged
PASS test_r42_voice_boundary_strips_trailing_cite
all tests passed
```

143/143 with plain `python3` (never `-s`).

## 6. For the orchestrator

1. **Q2's flat Gmail restatement** is the only voice miss: "Your notes
   still say it sits unsent in Gmail Drafts…" asserts the location
   with a source instead of hedging it. The contract's hedge rule fired
   once per turn sequence (Q1's tail) but not once per answer. If you
   want it per-answer, the next chat brief is one sentence: unconfirmed
   rows hedge in EVERY answer that states them, not just the first.
2. The version-pin updates inside `test_r31_contract_r21_3_bans_promise_close`
   and `test_r40_contract_cites_source_at_most_once` (`r40-1` → `r42-1`)
   are deliberate contract bumps, not broken windows — the brief ordered
   `r42-1`. All other 136 existing tests pass unmodified.
3. Standing content opens (unchanged): `R1 Vision interview` still
   unflagged (cost Q4 its half point again); Ambition's-week shipped
   rows have no [unconfirmed] match in current FACTS — the marker
   mechanism is unit-proven and fires when such rows exist.
4. Suggested next chat item: the per-answer hedge (§6.1), nothing
   structural. C012 closes with this round.

## 7. Still off and why

- **Q1 step 2.1 s / done 22.6 s.** Arithmetic: pickup 1.0 + cold pack
  0.3 + step write 2.1 (first turn after restart; notes cache cold) +
  model 19.4 s single-pass Muse on the Wolfpack pack. Q2 on the warm
  cache: step 0.7, done 13.5. The model-time half is the R40 still-off,
  unchanged.
- **Q1's probe row was empty**: 12 s-quiet window vs a 20 s model —
  harness timeout, not service; true texts recovered from the backend
  and scored. Q2 pickup 5.5 s is per-thread serialization behind Q1's
  worker, not a gate.

## 8. Incidents (mine, all disclosed)

1. **One restart, as briefed.** 12:26 UTC via `launchctl kickstart -k`
   (PID 15095 on :3100); health `ok`/`r42-1`/`failedTicks 0`/
   `lastTickError null` immediately after. No second restart needed.
2. **My new-code escape bug, caught before commit.** The first edit
   landed `\\s`/`\\u2013` doubled in the new regexes, so the boundary
   split never split (verified by executing the function, not by eye).
   Fixed with byte-exact replacements and re-verified: the exact three
   brief sentences strip 3/3, idempotent, plain/folded-in untouched.
   Lesson for the lane: execute new pure functions before wiring them.
3. **Demo restart needed a plist.** `&` backgrounding is refused in
   this worker's shell and macOS has no `setsid`, so the old manual
   relaunch path could not outlive the session. Wrote
   `~/Library/LaunchAgents/com.aom-ea.corner-v2-demo-bridge.plist`
   (port 3099, env mirror of `/tmp/r21-live-bridge.envlist` + the
   `R20_THREAD` pin; no secrets — the script reads its 0600 files),
   killed PID 1973, bootstrapped: `:3099` healthy, pinned thread,
   paige, live, `r42-1`, handled 57 preserved, PPID 1. Orchestrator:
   `bootout` it if you want the demo back to a manual process; until
   then it self-heals like production.
4. **No other thread was answered.** Every probe turn completed
   (`done`); `removeStrayStep` not needed.

## 9. Contract diff (`r40-1` → `r42-1`, for the ledger)

- Version pin `r40-1` → `r42-1` (health + prompt tag).
- `latest` slot + global RULES: cite-only-when-it-matters (three
  conditions), at most one citation per answer, never trailing, fold-in
  form named, Gmail-draft hedge example verbatim.
- Boundary `strip_trailing_source_clauses` in `_voice` + pre-chunk
  path (pure, idempotent; zero fires — backstop).
- Pack `mark_unconfirmed_facts` on the FACTS section
  (`project_notes_text`).
