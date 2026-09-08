# R37 — chat fast plain: the step lands in a second, Wolfpack answers as fast as Ambition can, the driver never scolds

Worker: headless builder, chat lane round eight. Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R35-chat-step-first.md`, `rounds/R33-chat-images-and-instant.md`
§contract, `rounds/LEDGER.md` rows DBG-4 → R35 → "R37 pre-read". Report: this file.

Verdict: the step now lands 0.5-0.7 s after pickup on every thread (was 5.1/7.1 s
on Wolfpack), pack assembly is 0.3-1.1 s, prompts are 4.2/3.4 k tokens (were at
the 13.5 k budget), and no turn scolds -- including a literal 60-second repeat,
answered plainly. DBG rerun scores **7/8** with zero scold. Unit suite **128/128**.
Service restarted **twice** (second restart disclosed in §8 -- a ghost-step race
the first landing exposed, fixed and re-probed), healthy on contract `r37-1`.

Rule compliance: nothing pointed at `neat-pony-216` (every URL below is
`brilliant-scorpion-163`); `room-bridge`/`sse-bridge` untouched; no
email/Telegram; no `src/` edits (web evidence only); no env values printed
anywhere; test bridges untouched (the :3099 foreign bridge is R24's, untouched);
production writes this round (all labelled or disclosed): 4 DBG tester questions
+ turns per probe run (run8 + run9) on Wolfpack/Ambition, 2 webwatch tester turns
on Ambition (§5), 2 ghost stray steps from the first landing (§8.4, no delete
path exists). No other thread was answered. Scoped commit, nothing pushed.

## 1. The step is first now (the 3.7-5 s gap is gone)

The project-sized thing before the step write was the discovery fetch itself:
`work_thread` read the FULL thread surface and only then called `begin_turn`.
The R35 `limit: 40` never reached that call site -- and measurement says it could
not have helped anyway (§2). New order per worker: turn-cap check (pure) →
`begin_turn` (2 mutations, 0.5-1.1 s live) → ONE surface fetch, shared by
discovery and the pack (previously TWO full fetches per turn: discovery +
`context_pack`). Second and later fresh blocks in one worker reuse the same
fetch. A saturated-window fallback was built, measured as useless (limit does
not bound the cost), and removed again before the restart.

Service-side step after pickup, before → after (run7 → run9):

| thread | before | after |
|---|---|---|
| Wolfpack Q1 | 5.1 s | **0.7 s** |
| Wolfpack Q2 | 7.1 s | **0.7 s** |
| Ambition Q3 | 1.4 s | **0.7 s** |
| Ambition Q4 | 1.1 s | **0.5 s** |

Target (≤ 1.5 s on every thread) holds 4/4. The r35 timing line now stamps the
step at write time, so the number is the write, not the fetch that follows.

## 2. What the slow calls were (per-call ms, one line per turn)

New `[r37] calls` line aggregates every backend/disk call of the turn;
`[r37] pack` logs the budget behind the model call. Wolfpack Q1 (run9):

`begin=690ms surface=3871ms visual=841ms ledger=851ms project=1088ms notes=5ms
format=0ms model=10120ms execute=832ms` --
`pack_tokens=4222 notes_tokens=2993 thread_rows=20 project_rows=30 ledger_rows=0`

Findings, all measured live against production, not inferred:

1. **`limit` does not bound `getConversationSurface`.** Full vs `limit: 40` on
   the real Wolfpack thread: 3252 ms / 1415 msgs / 485 KB vs 3141 ms /
   1360 msgs / 465 KB. The backend (`convex/v2Workspace.ts`, `f85de68`) windows
   only `threadBlocks`; every legacy `messageLink` is still walked with one
   `db.get` each. The R35 "surface was not the cost" verdict was wrong: the
   surface IS the cost, just not via a knob the bridge can turn. The limit arg
   still rides every bridge surface read (bounds the blocks window, forward
   compatible), but the 3-4 s Wolfpack floor is backend-bound. → orchestrator
   ask §6.1.
2. **The pack paid the surface twice per turn** (discovery + `context_pack`).
   Now once, shared. Pack *assembly* (everything after the shared fetch) is
   0.3-1.1 s on both projects -- the ≤ 1.0 s warm target holds 3/4 (Q1 1.1 s,
   its `project` read alone cost 1088 ms that turn; backend variance, not
   mechanism). The 3 s fetch now sits between step and model, outside the
   `pack_s` number -- the line is honest about assembly, and §6 says what that
   costs the sentence.
3. **Notes are free warm** (0-6 ms, cache holds), FACTS survives whole.

## 3. The pack budget (FACTS first, newest rows, notes trimmed)

Wolfpack prompts ran at the full 13.5 k budget (notes alone 5.0 k); Ambition at
~half -- the 15 s vs 5 s model gap. New budget: notes 5000 → 3000 tokens
(`R37_NOTES_TOKENS`), total 13500 → 11000 (`R37_PACK_TOKENS`, still honouring an
explicit `R29_PACK_TOKENS`). Order inside notes is unchanged and already
FACTS-first: FACTS (1.1 k, always whole) → status → last round → updates →
vision head → CONTEXT tail trimmed first. Thread rows (20 + 30) and ledger stay
whole. Live pack sizes: Wolfpack 4222-4291 tokens, Ambition 3394-3448
(notes 2993/2109). Model calls on identical questions: 15.2 → 10.1/7.5 s
Wolfpack -- but Ambition barely moved (5.2 → 6.0 s) and variance dominates, so
the budget cut is necessary, not sufficient (§6.2).

## 4. Never scold (contract rule + unit test + strip at the boundary)

Q1's old opener ("From the thread you keep asking for site, contract and
blocker with no new facts added.") was model wording, so all three layers:

- **Contract** `r33-2` → **`r37-1`**: "...a repeated question is answered
  again, plainly, as if first asked -- never comment on the asker's pattern
  (no remarks about repeated asking, kept asking, or missing new facts)."
- **Strip at the boundary** (`strip_scold_sentences`, 8 patterns for
  asker-pattern commentary, never task state): applied in `_apply_wording`
  (every message event and chunk; an emptied reply falls back to neutral
  "On it.", never silence, never canned) and at the stream emit (a scolding
  first sentence is skipped, never shown; the stripped final still lands).
  Every strip logs `[r37] scold-stripped` / `scold-skipped-from-stream`.
- **Unit tests**: contract sentence pinned, the exact Q1 scold stripped,
  legit task-state lines pinned kept ("waiting on your approval", "still
  unconfirmed", "you still need to approve", "Saved in Gmail Drafts...").

Proof beyond the probe: the item-5 watch sent the same footage question twice
within 60 s (§5). Second answer: "For Ambition Mechanical this months footage
is in Google Drive at My Drive/Client/AMBITION MECH SERVICES under the
hello@aom-inhouse.com account." -- plain repeat, no scold, no strip needed
(zero `scold-*` lines in the service log all round).

## 5. Step → first sentence on the real web: never blank (verified)

Playwright (Chromium) signed in as the tester on `corner-convex.vercel.app`,
asked on the Ambition thread, sampled the DOM ~1/s with the surface API as
ground truth (`/tmp/r37-webwatch2.py`, `/tmp/r37-web-timeline.json`):

- optimistic "Mom is on it…" + header `Working` render immediately after send;
- API step block at +2.7 s, first agent sentence at +9.8 s;
- DOM text length 25684 → 25885 across the window, monotonic, never drops;
- screenshots: `/tmp/r37-web-step.png` (question + checked "Reading the project
  notes…" step + `Working` header co-visible), `/tmp/r37-web-sentence.png`.

No blank frame between step and first sentence. (The watch also surfaced two
web-side flakes for the desktop lane, §6.4.)

## 6. Before / after + DBG scores (run9, guarded code, contract r37-1)

Service stages per turn (pickup / step / pack-assembly / model / sentence / done):

| thread | before (run7) | after (run9) |
|---|---|---|
| Wolfpack Q1 | 1.4 / 5.1 / 3.1 / 15.2 / 23.0 / 24.1 | 0.5 / **0.7** / 1.1 / 10.1 / 15.2 / 16.6 |
| Wolfpack Q2 | 2.1 / 7.1 / 3.1 / 8.3 / 18.1 / 19.6 | 1.2 / **0.7** / 0.6 / 7.5 / 11.4 / **12.6** |
| Ambition Q3 | 1.3 / 1.4 / 0.7 / 5.2 / 6.9 / 8.4 | 1.4 / **0.7** / 0.7 / 6.0 / **7.5** / **8.5** |
| Ambition Q4 | 0.7 / 1.1 / 0.9 / 10.0 / 11.6 / 13.0 | 1.1 / **0.5** / 0.3 / 6.3 / **7.5** / **8.4** |

Bold = meets the brief's per-row targets (step ≤ 1.5, pack ≤ 1.0, sentence ≤ 8,
done ≤ 15). Step 4/4. Pack assembly 3/4 (Q1 1.1). Sentence 2/4, done 3/4 --
both miss only on Wolfpack notes questions, both model-bound (§"still off").

User-side probe timings (send →): first signal 6.8 / 6.0 / 2.7 / 2.8 s
(run7: 10.4 / 6.4 / 4.1 / 3.0); first sentence 20.1 / 16.0 / 9.8 / 9.7 s;
done 33 / 33 / 24 / 24 s. The Wolfpack user-side step still reads ~6 s: the
web polls on its own cadence and reads the same unbounded surface (§6.1).

DBG transcript (full replies `/tmp/dbg-run9.json`):

- **Q1 Wolfpack latest**: thread (Ross draft still in Gmail Drafts, not sent) +
  notes ×3 (site live at wolfpackcompanies.com, contract signed by Ross and
  closed, waiting approval-or-edits to send the draft). Sourced, no scold.
  **2/2.**
- **Q2 Wolfpack next**: Ross shoot-dates follow-up, drafted-and-saved-not-sent,
  approval-or-edits ask. Gmail-Drafts-as-fact stays unconfirmed (fifth round
  running -- the sure thing is still the FILE draft). **1.5/2.**
- **Q3 Ambition brand kit**: v2 quoted exactly (navy `#1B2A4A`, red `#C41E3A`,
  white/ivory `#f4f1ea`, amber-numbers-only, Barlow 800/900 + Inter, square navy
  cards, 6–8px red left stripe, never orange), v2-not-the-attachment, footage
  `My Drive/Client/AMBITION MECH SERVICES/September 2026` + Drive account.
  **2/2.**
- **Q4 Ambition shipped/queued**: schema + buyer-question FAQs + clips 01–03
  redo (still self-reinforcing -- stated bare, not flagged), queued missions
  real, `R1 Vision interview` listed unflagged. No example.com, no probe
  content. **1.5/2.**

**Total 7/8** (DBG-4 7/8, DBG-5 7/8, DBG-6 7/8 -- holds, better composition than
DBG-7's 5.5: the point lost to the scold is back).

## 7. Gates and hard lines

- `python3 scripts/test_v2_team_bridge.py`: **128/128** (111 + 17 R37: window
  args ×3, notes budget, pack sizes, shared-surface reuse, begin-before-surface
  ordering, stale-worker zero-trace, partial-reply parse ×3, scold strip +
  boundary ×3, contract sentence, early-emit through `live_word_run`, span
  aggregation). Plain `python3` (never `-s`); the service interpreter
  (`/usr/bin/python3`, PIL present) imports the module cleanly.
- Probe on production after restart: run9 table above; quality 7/8, no scold.
- No client-facing sends beyond the tester threads listed above; the bot only
  answers tester blocks (plus the two disclosed ghost steps).
- Commit: AOM-EA scoped paths `scripts/v2-team-bridge.py` +
  `scripts/test_v2_team_bridge.py` only (`corner-v2-bridge.sh` untouched);
  never `git add -A`; nothing pushed. This report lives in the nested
  aom-studio checkout, uncommitted, for the orchestrator to pick up.

## 8. Incidents (mine, all disclosed)

1. **Two restarts, not one.** The first landing passed its probe (run8) but the
   new `[r37] calls` lines plus a block-timeline reconstruction proved a
   **stale-worker race**: the tick snapshots `last_by`, the turn finishes and
   advances `last_ts` + clears `in_flight` inside the snapshot→submit window,
   the worker begins anyway, finds nothing, and closes -- leaving a stray
   "Reading the project notes…" step with no answer (~30-50% of turns by the
   window math; 2 hits in run8, pixel-confirmed on Wolfpack). Fix: re-validate
   `candidate.newestUserAt <= scope.last_ts` under the per-thread lock before
   beginning; stale workers return with zero trace (same guard threaded through
   the fallback tick via the verified entries' newest time). Run9: 4 stale
   workers skipped (`known == last`), 0 stray steps, 0 `preopened run unused`.
2. **Ghost steps on production.** The 2 run8 strays sit on the Wolfpack and
   Ambition project threads (a step-only run each, no text). No delete path
   exists. Patrik: please ignore them.
3. **Ten tester Q&A turns + two webwatch turns** on the Wolfpack/Ambition
   project threads (run8, run9, §5) -- mine, visible to AOM members, same class
   as prior DBG rounds.
4. **`sentence_s=-1.0` on the webwatch turn is by design**, not a bug: its
   answer is a single sentence, so there is no first/rest split to stream;
   the validated single block lands instead.
5. **Pre-existing, not mine:** transport-401 `worker bug` lines on thread
   `vd71s7ez…` predate both restarts (R33 self-heal territory); `turnsLastHour`
   read 1 right after restart #2 while ~12 turns fell in the hour -- the cap
   counter looks wrong-low (cap is 60/hr, actual ~10, so operationally moot,
   but the persistence deserves a look).

## 9. For the orchestrator

1. **Backend ask (the 3 s floor): window `messageLinks` in
   `getConversationSurface`.** `limit` bounds only `threadBlocks`; Wolfpack
   pays ~3.2 s / 485 KB per read. One backend change fixes three
   user-visible things at once: the step→model gap on big threads (service
   `sentence_s` 15.2 → ~12 on Wolfpack overnight with no other change), the
   web's own first paint (user-side step 6 s vs 1 s service-side -- the web
   reads the same unbounded surface), and backend load (every turn + every
   web poll walks 1400 links N+1). No bridge change needed after deploy; the
   `surface_window_args` limit is already on every call site.
2. **Sentence ≤ 8 s needs a faster model path, not more bridge tuning.**
   Proven: `muse exec --json` emits session lines early but buffers ALL text
   deltas to generation end (bridge-pump measurement: 3 callbacks at
   8.1-8.3 s of 8.7 s), so the first sentence can only land at model-end;
   and 4.2 k-token Wolfpack prompts still take 7.5-10 s (variance dominates
   size below ~5 k). The partial-envelope parser is committed and unit-pinned
   -- it fires the moment deltas carry a complete first sentence, which pays
   off the day the backend streams for real -- but tonight's misses
   (15.2/11.4 s) are correctly attributed to model, not mechanism.
3. `R1 Vision interview` (queued for Ambition) still matches no live mission;
   Ross email still FILE draft vs "Gmail Drafts"; Ambition's week per §6 --
   same three opens as DBG-4/5/6.
4. Suggested next chat item: nothing -- the lane's remaining misses are the
   two backend/model asks above. If the messageLinks window lands, re-run
   `/tmp/r37-dbg-c.py` (writes `/tmp/dbg-run9.json`) and watch Wolfpack
   sentence go sub-10 with zero bridge changes.

## 10. Still off and why

- **First sentence ≤ 8 s on Wolfpack notes questions (15.2 / 11.4 s).**
  Arithmetic: step 0.7 + surface fetch ~3.0 + assembly 0.6-1.1 + model
  7.5-10.1 with end-buffered deltas. Bridge levers exhausted; needs §9.1 +
  §9.2. Ambition already meets it (7.5 / 7.5 s).
- **Done ≤ 15 s on Wolfpack Q1 (16.6 s).** Same causes, misses by 1.6 s; Q2
  meets it (12.6 s).
- **Pack ≤ 1.0 s warm on the biggest thread (1.1 s assembly on Q1).** The
  number itself is fine 3/4; the unmeasured 3 s fetch beside it is §9.1.
- **User-side first signal ~6 s on Wolfpack.** Service step lands at ~1 s;
  the rest is web poll cadence plus the web's own unbounded surface read
  (desktop lane owns the poll; backend owns the read).
