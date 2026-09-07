# R31 — chat fast and honest: first sentence in 20 s, never a promise, attachments read, own runs never "news" (C004–C008)

Worker: headless builder, chat lane round five. Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R29-chat-grounding.md`, `rounds/LEDGER.md` (DBG-1, DBG-2),
`punch-list.md` rows C004–C008. Report: this file.

Verdict: all five rows fixed and proven. Unit suite **74/74 green**
(`python3 scripts/test_v2_team_bridge.py`). Live chat suite on production:
**9 passed, 1 skipped** (test 8, same skip as R25/R29) on contract `r21-3`,
plus an earlier 9-pass run on the pre-fix code. DBG rerun of the same four
questions on the restarted service: **7/8** (DBG-2 was 4.5, DBG-1 was 2).
Service restarted **twice** (second restart disclosed below — a deterministic
crash the DBG rerun itself exposed; the fix is committed and verified).

Rule compliance: nothing pointed at `neat-pony-216` (import-time refusal
kept); `room-bridge`/`sse-bridge` untouched; no email/Telegram; no
`src/`/`ios-native/` edits; service env/bot identity untouched; test ports
3101/3102/3105 used for my runs only, all down now (3105's 60-second incident
is disclosed in §8); production service never stopped except the two
`kickstart -k` restarts below; no `git add -A`; nothing pushed. Test
passwords only in `/tmp/corner-v2-aom-tester.env` and
`/tmp/corner-v2-e2e.env` (values never appear below).

## 0. What runs where (as this report lands)

| Process | Port | State |
|---|---|---|
| `com.aom-ea.corner-v2-bridge` (production service) | 3100 | running on the final code, contract `r21-3`, 169 threads |
| test bridges (3101/3102/3105, this round) | — | all terminated after their green runs |
| stale foreign bridge, PID 9029 (:3099) | 3099 | not mine, untouched (known since R25) |

Production writes this round (all labelled or disclosed): the R31 suite
probes under Aster (fresh missions per attempt: "R31 fast honest probe",
"R31 suite probe" ×5, "R31 containment probe" ×4, e2e account); the DBG-3
tester questions + their turns on Wolfpack/Ambition; **5 duplicate mom
turns on the Wolfpack thread (§8, my bug)**. No other thread was answered.

## 1. Timing split before → after (C006)

Measured end to end on Wolfpack (pack build, adapter, block writes):

| Stage | Before (R29 code) | After (R31 code) |
|---|---|---|
| pickup (message → bridge starts the turn) | ~50–70 s: `tick()` ran `threadEvents` **serially** over 169 threads (~0.4 s × 169 ≈ 60 s per sweep) | parallel sweep (`R25_SWEEP_WORKERS=16`, refresh-safe); observed from-send firstSignal 13–34 s |
| pack build | 1.5–4 s (surface 2.9 s cold / 1.5 s warm, ledger 0.4, visual 0.3, project 0.4, notes ~0; 6914 tokens) | unchanged by R31 (attachments add ≤1500 tokens, still under budget) |
| first visible agent block | **with the reply** (no early step): DBG-2 firstSignal 65–80 s | **0.6–0.8 s after pickup** on all 8 suite turns (`begin_turn`: startRun + "Reading the project notes…" before pack/brain) |
| model time (29k-char Wolfpack prompt) | muse 9.5 s / $0; muse-minimal 4.9 s / $0; claude 8.1 s / $0.29 | same adapters; suite turns 6–13 s |
| first sentence | with the reply, 68–83 s from send | pickup+6.8–17.5 s (suite log); DBG 13–34 s from send |
| done | 68–83 s from send | pickup+8.3–35.6 s (suite); DBG 23–46 s from send |

Backend decision by measurement (same full Wolfpack prompt):
muse-default 9.5 s/$0, muse-minimal 4.9 s/$0, claude stream-json 8.1 s/$0.29.
Default stays **muse** (faster first sentence AND $0 marginal); Steffen
stays on claude via `R21_BACKENDS_JSON`; cost stays visible in `liveCalls`
(cost_usd) and the per-turn log line. No service env change needed.
`R21_MUSE_EFFORT` knob added, unset = server default (reliability over the
one-off 4.9 s minimal reading).

Why not true in-place streaming: the backend has no edit/update event API
(`startRun`/`appendEvent`/`finishRun` only; no backend deploy in this
round's scope), so sentences land as blocks: the first sentence as its own
block, the rest appended. Two live defects were found and fixed on the way:
(1) splitting the raw JSON stream printed envelope garbage — emission now
requires a parseable `reply`, else the validated reply is split [first |
rest] at completion; (2) the streamed sentence was written twice — chunks
now drop the already-emitted first sentence (unit-pinned).

## 2. The four gates

- **C004 (own runs are not news):** `ledger_latest` drops every
`is_run_noise` row (stored `kind: "run"` OR Started/Finished/Cancelled/a-run-failed
text — the backend writes these as `kind: "did"` with no quiet flag, so the
filter is read-side; the bridge itself never writes run-kind rows).
`latest_body` double-filters. Wolfpack: 11 rows → 1 signal (Sept 3 research
filing); later 21 → 1 as my own turns added noise. DBG Q1 contains zero run
mentions. Backend follow-up tabled: quiet flag / `kind: "run"` on
startRun/finishRun.
- **C005 (never ends on a promise):** contract `r21-3` bans
"I will … now / next / report back" as the closing line — fatal
(`promise-close`), retry once named, then whole-turn fallback. A read need
(a step naming it + the reply admitting it) earns a **second pass** with the
read text (attachments first, then ledger re-read), max 3 passes, all inside
the one run. Unit: promiser fails once then complies (`retried_from`
recorded); stubborn promiser → fallback; reader gets exactly 2 passes with
the attachment text in prompt 2; cap pinned at 3. The answer slot now names
the decided title exactly (live fix: the brain said "buyers", the suite
needs "Buyers").
- **C006 (fast and visible):** §1 + new live-only e2e test 10 (first block
≤ 20 s and is the early step, first sentence ≤ 45 s, done ≤ 90 s, no
report-back promise) — green. Suite-side preopened runs keep every existing
structure assertion (test 1 still sees exactly [step, question]).
- **C007 (attachments in the pack):** section (g), newest first, ~4k chars
each (max 3, 1500-token budget; pack total 13500). Shapes: `payload.files`,
"Attached file:" text lines (the actual Ambition case — the file has no
bytes on the message), thread artifacts, filename mentions in the user text.
Names resolve against the project Mac folder; **only .md/.txt/.pdf are read**
(§8 is why); pdfs via `pdftotext`; remote URLs gated by extension/content-type.
Ambition pack: `(g)` carries brand-guidelines.md at 4000 chars; unit test
pins its real colours (#1a237e/#f97316) and rules (Barlow).

## 3. DBG rerun transcript + scores (against FACTS.md)

Same four questions, tester account, production dashboard, restarted service.
Full replies in `/tmp/dbg-run3.json`; shots `rounds/evidence/DBG3-*.png`.

- **Q1 Wolfpack latest** (firstSignal 26.5 s, done 42.1 s): ledger (Sept 3
filing, no runs) + thread (063ba05 live, Aug 19 15-item push not live, GBP
hero sync open on upload) + notes (site live at wolfpackcompanies.com,
contract signed by Ross and closed, waiting: shoot-dates approval + GA setup
+ mobile QA). **2/2.**
- **Q2 Wolfpack next** (34.5 s / 46.0 s): Ross shoot-dates follow-up +
approval-or-edits ask + GBP upload close. "Saved in Gmail Drafts" is
brain-said (only prior brain replies mention Gmail; the sure thing is the
FILE draft) — flagged for Patrik. **1.5/2.**
- **Q3 Ambition brand kit** (24.9 s / 34.8 s): v2 kit quoted exactly (navy
#1B2A4A, red #C41E3A, white, ivory, amber-numbers-only, Barlow 800/900 +
Inter, square navy cards, 6–8px red left stripe, never orange), attachment
quoted AND flagged wrong, footage path + Drive account. **2/2.** This is the
C007 proof.
- **Q4 Ambition shipped/queued** (13.2 s / 23.0 s): PR4 AEO schema + 5 FAQs +
address flag, example.com live, queued missions named, zero noise. "Social
clips 01–03 redo with v5 notes" is verifiable only from prior brain replies
(self-reinforcing) — flagged. **1.5/2.**

**Total 7/8** (DBG-2 4.5, DBG-1 2). Pre-fix run (`/tmp/dbg-run3-fallback.json`):
both Wolfpack turns fell back ("I couldn't finish that turn") — §8.

## 5. Commits (scoped paths only, nothing pushed)

- AOM-EA `e74926903`: bridge R31 (early step, streaming, r21-3 + passes,
attachments, run filter, FACTS-first, parallel sweep, answer-fact) + 19 new
unit tests; both FACTS.md. AOM-EA `503e1279c`: null/binary fix + shared
live_calls (74/74).
- Web worktree `4be3d38`: `e2e/chat.spec.ts` (test 10 timing, test 9
preopened containment, test 5 generic reword).
- aom-studio (this file + `rounds/evidence/R21-reply-*-r31{k,h}.txt`,
`R20-chat-*.png`, `DBG3-*.png`): below. NOT committed anywhere:
`punch-list.md` — my C004–C008 flips are in the worktree uncommitted (R29
precedent: the file carries other lanes' rows, the orchestrator takes it).

## 6. For Patrik (confirm, never guess)

1. Ross shoot-dates email: a FILE draft exists
(`wolfpack-ross-email-draft.md`, not sent). "Saved in Gmail Drafts" comes
only from prior brain replies (self-reinforcing) — is there a Gmail draft?
2. "Social clips 01–03 redo with v5 notes" shipped — same self-reinforcement;
what actually shipped for Ambition this week?
3. GA on Wolfpack: installed yet, or still the open urgent item?
4. Contract signed DATE (known: Ross signed, confirmed by 8/29).
5. Lead attribution: open, or already wired into GA/outreach?
6. September footage: which month folder?
7. Please ignore 5 mom turns on the Wolfpack thread at 06:03–06:04 — mine
(§8), answering stale tester blocks, not news.

## 7. Verification record

- `python3 scripts/test_v2_team_bridge.py`: **74/74** (50 R20/R21/R29 + 24 R31:
contract, promise gate + retry + stubborn fallback, 2 passes + cap,
readback, attachments incl. live Ambition colours, FACTS, run-noise,
sentence/preopened, parsers + chunks + no-dup, binary gate, null strip,
shared live_calls, abandon, answer-fact, serial-fallback).
- Live suite on production (`LIVE_BASE_URL=https://corner-convex.vercel.app`,
test bridges :3101/:3102, R31 code): **9 passed, 1 skipped (test 8) in
3.3 m** on a clean probe; per-call record first-attempt ok; wording gate
re-verified over all 8 `-r31k` reply files (13–90 words, zero em-dashes, zero
"as an AI"); suite turn splits §1. Earlier `-r31h` run: 9 passed on the same
code before the null fix.
- DBG-3: §3. Two service restarts total (one planned, one for the §8 crash
fix); health + contract `r21-3` + 169 threads verified after each.

## 8. Incidents (mine, all disclosed)

1. **Envelope-garbage emit:** the first streaming version split the raw JSON
stream and printed a JSON prefix as a message block (seen on :3101).
Fixed: emit only parseable replies; validated [first | rest] split otherwise.
2. **Duplicate first sentence:** streamed sentence + chunk[0] both written.
Fixed: chunks drop the emitted first (unit-pinned); verified absent after.
3. **Null-byte crash (the big one):** "Attached file: *.mov" lines resolved
to real video binaries; 843+ null bytes rode the Wolfpack prompt into the
adapter argv → `embedded null byte` → double failure → fallback on BOTH
Wolfpack DBG turns (the pre-fix run). Fixed (.md/.txt/.pdf only, prompt
null-strip + log, §2) and proven on the exact failing input (test bridge on
the Wolfpack thread: sentence 11–17 s, done ≤ 18.5 s, no fallbacks) before
the second restart. The same run exposed the pre-existing
`live_calls = live_calls[-200:]` rebind detaching service scopes (state hid
per-call records); now in-place.
4. **5 duplicate mom turns on the Wolfpack thread (06:03–06:04):** I pointed
a FRESH test bridge (empty handled set, no baselining in R20 mode) at the
live Wolfpack thread to verify fix 3; it re-answered 5 ancient tester blocks
before I killed it (~60 s). Content is generic acks, provider `r20-bridge`;
no delete path exists — left in place, Patrik note §6.7. Lesson recorded:
fresh test bridges watch probe missions only, never live threads.
5. **-r31b test-1 miss:** backend turn provably correct (step + 2-option
question in 14 s) while the suite timed out — the exact R25-documented
transient read flake; reruns on clean probes pass. Also learned: one
full-suite attempt per fresh probe (a pending question poisons the next
brief; re-runs on dirty probes fail test 1 correctly).
6. **Answer wording:** the brain confirmed with lowercase "buyers"; the suite
needs the exact title. Fixed: the answer slot carries `fact` + MUST-name
wording like latest (unit-pinned).


## 4. C008 seed

`corner/users/aom/projects/wolfpack/FACTS.md` (20 lines) and
`corner/users/aom/projects/ambition-mechanical/FACTS.md` (14 lines — the
brief's `ambition/` is really `ambition-mechanical/`, per its own
find-the-folder note): dated lines, one fact per line, memory sources named
(site live 2026-09-03, GA urgent, contract signed never re-ask, lead
attribution, weekly formats, v2 kit + wrong-guidelines warning, 1350×1080 +
endcard, Drive footage path, Ads consultant, Jobber line, full social since
2026-08-28 …). The pack reads FACTS.md **first** in section (a)
("CHECKED-IN FACTS (answer from these first)"). Unit test pins both files'
presence and first placement.
