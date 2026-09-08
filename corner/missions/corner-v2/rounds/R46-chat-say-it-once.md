# R46 — chat say-it-once: the disclosure lands as one block, never two

Worker: headless builder, chat lane round thirteen. Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R45-chat-armed-title-and-hedge-once.md`,
`rounds/R44-chat-honest-image-reply.md` §2, `punch-list.md` row **C014**.
Code: AOM-EA `scripts/v2-team-bridge.py` (HEAD `175648337`, contract `r46-1`) +
`scripts/test_v2_team_bridge.py` (161/161, plain `python3`, never `-s`).
Production `brilliant-scorpion-163` throughout; `neat-pony-216` never
touched. Report: this file.

Verdict: the 7:20 AM design-thread stutter is gone by boundary, proven
live — the model wrote the paraphrase second block again on the proof turn
and the new boundary dropped it before it reached the thread. One image ask
on the design thread → step 0.7 s, done 12.5 s, exactly ONE disclosure block,
new "Image study — R46 walk" tab active in the Visual Window. Unit suite
**161/161** (154 existing untouched-green + 7 new R46). Committed AOM-EA
(scoped paths only, nothing pushed). Production restarted **once**, healthy
on contract **`r46-1`**. Demo bridge restarted afterwards on the same build,
pinned.

Rule compliance: every URL below is `brilliant-scorpion-163`; one
client-visible send this round (the labelled R46 walk image ask on the e2e
design thread via the demo bridge); zero sends on Patrik's
Wolfpack/Ambition threads — the probe stayed off. Scoped commits, nothing
pushed.

## 1. Before / after

Before (`r45-1`, 7:20 AM walk, `/tmp/img2-walk-45s.png`): image ask → two
consecutive Paige blocks saying the same thing — the disclosure, then its
paraphrase ("What I made instead is a typeset study…"). Patrik reads that
as a stutter.

After (`r46-1`, this proof's walk turn on the design thread
`vd7f0v4dn3kjjx9qnt9acryemn8dyr95`):

> "I couldn't reach the image model (no credits), so I made a typeset study
> with the brief on your brand colours. It's in the Visual Window. Add
> Higgsfield credits and I'll render the real hero."

One block. No second bubble. The new artifact on the thread: title
`"Image study — R46 walk: make an image for the Spring deck hero…"`,
`kind: photo`, active tab. Full texts in `/tmp/r46-walk.json`; screenshot
`rounds/evidence/R46-design-thread-proof-1440.png` (thread shows ask → step
→ the single disclosure; Visual Window shows the new study tab rendered).

The dropped second block (service log, verbatim):

> "What's in the Visual Window is a typeset study for the Aster Spring deck
> hero, the brief set in type on your brand colours. Add Higgsfield credits
> and I'll render the real sunrise stage shot."

## 2. What changed (contract diff `r45-1` → `r46-1`)

- Version pin + every R31/R33/R35/R37/R40/R42/R44/R45 rule stays verbatim
  (unit-pinned; the six `r45-1` version asserts bumped to `r46-1` as a
  deliberate contract bump, R42/R45 precedent).
- New pure boundary `drop_duplicate_blocks` (+ `duplicate_block_overlap`):
  consecutive agent text blocks must each add something — a block whose
  content-token overlap with the previous kept block is ≥ 0.6 (Simpson
  coefficient after lowercasing + glue-word strip) is dropped, first kept.
  Calibrated: the brief's stutter pair scores 0.611 (dropped), a legit
  fact + next-step pair scores 0.0 (kept), "First bit."/"Second bit."
  scores 0.5 (kept, so the R31 streaming tests pass unmodified).
- Wired at every layer the stutter can form: `live_word_run` chunk split
  (streamed rest vs the already-emitted first sentence; no-stream
  first/rest), `_apply_wording` chunk expansion (including dropping the
  placeholder message when the streamed first stands alone), and the
  `_answer_image` clean list (including an artifact-only plan when the
  streamed disclosure is already on the thread). `image_plan_for` omits the
  message event on a blank reply. `[r46] duplicate-block-dropped` /
  `duplicate-rest-dropped` logging on every fire.
- Contract words: the image slot task says the disclosure ONCE in one
  message block (a follow-up may only add what happens next); global RULES
  requires consecutive message blocks to each add something.

## 3. Gates

- `python3 scripts/test_v2_team_bridge.py` = **161/161** (154 existing
  green unmodified, 7 new R46: stutter-pair drop, legit-pair survival,
  artifact-only plan, `_apply_wording` chunk drop, streamed-rest drop with
  placeholder removal, distinct-rest survival, contract wording). Tail:
  `PASS test_r46_*` × 7, `all tests passed`.
- Proof turn (`/tmp/r46-proof.py` → `/tmp/r46-walk.json`): ask sent 14:28:56
  UTC; step "Generating the image…" +0.9 s; single disclosure block +12 s;
  run `done`, `open: []`; new photo tab active. Service log:
  `step_s=0.7 done_s=12.5`, one `[r46] duplicate-block-dropped` (the §1
  paraphrase) and one `[r44] image-reply-rewritten why=scene-claim` (the
  model's first block carried a scene claim; the R44 backstop rewrote it to
  the disclosure, then R46 dropped the paraphrase — both backstops fired on
  one turn, contract + formatter agreeing).
- Health after the restart: production `ok`/`r46-1`/`failedTicks 0`
  (`lastTickError null`); demo `:3099` pinned thread, paige, live,
  contract `r46-1`, handled 59 → 60 (my turn only). Zero 401s in the demo
  log. Screenshot eyeballed: one Paige text block, study tab rendered.

## 4. For the orchestrator

1. **Both backstops fired, nothing to tune.** The contract ("say it ONCE")
   did not prevent this model's paraphrase; the boundary caught it. No
   false-positive signal anywhere: the distinct-rest unit test and the
   154 existing tests pin the survivor shapes.
2. **Known truncation tradeoff, accepted.** When a *streamed* first
   sentence is followed by a rest that overlaps it ≥ 0.6 as a whole, the
   rest is dropped whole — a stuttering model can lose the disclosure's
   tail (location + credits ask) instead of landing it. Deliberate: the
   round's bug is the stutter, and the surviving head ("no credits,
   typeset study, the brief") is standalone-true beside the honestly
   titled tab. My first unit attempt caught this shape mid-build
   (stream emits sentence-one, not block-one); the committed test pins
   the real streaming behavior.
3. **No-stream split is sentence-grained.** `reply_chunks` are
   [first-sentence | rest], so a whole-[A|B] pair only co-occurs at the
   `_apply_wording` / plan layers — all covered, plus the pure-function
   pin on the brief's exact sentences.
4. Suggested next chat item: nothing structural from this lane; the Q1
   double-source-naming note (R45 §5) and the standing `R1 Vision
   interview` unflagged row are still the open nits, both orchestrator-side.

## 5. Still off and why

- **Done 12.5 s, model time.** Arithmetic: pickup + pack + step 0.7 +
  model ~11 s single-pass Muse. The model-time half is the R40 still-off,
  unchanged. (First block at +12 s — no 15 s gate on image turns, R44 §5.3
  class: render + upload + model.)
- **Demo handled 59 → 60**: exactly my proof turn, no stray. Production
  `turnsLastHour 13` at restart is other-lane traffic, untouched by me.
- **`R1 Vision interview` still unflagged** in queued rows (standing Q4
  half-point, R42 §6.3 class) — not this lane.

## 6. Incidents (mine, all disclosed)

1. **One production restart, as briefed.** 14:28 UTC via `launchctl
   kickstart -k` on HEAD `175648337`; health `ok`/`r46-1`/`failedTicks
   0` immediately after. No second restart.
2. **My probe missed sign-in on the first run** (`threadEvents: Server
   Error` — unauthenticated workspace read, the L004 mask). Tester-side
   bug: added the explicit `cx.sign_in()` the bridge itself does at
   startup. No send was made before the fix; the ask went out once, on the
   retry.
3. **My screenshot script fought ESM resolution** (`playwright` import
   from /tmp, then top-level await in CJS). Kept the script in /tmp,
   wrapped in `main()`, ran with NODE_PATH — repo untouched, evidence PNG
   is the only new repo file besides this report.
4. **No other thread was answered.** The proof turn completed (`done`,
   `open: []`); `removeStrayStep` not needed.
