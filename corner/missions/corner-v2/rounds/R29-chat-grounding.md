# R29 — chat grounding: the brain knows the project (C001, C002, C003)

Worker: headless builder, chat lane round four. Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R25-chat-production-bridge.md`, `punch-list.md` rows C001–C003,
`scripts/v2-team-bridge.py` (`context_pack` / `format_context_pack` / `r21-1` contract).
Report: this file.

Verdict: all three rows fixed and proven. Unit file **50/50 green**
(`python3 scripts/test_v2_team_bridge.py`). Chat suite live mode on production:
**8 passed, 1 skipped** (test 8, needs a second driver pass — same skip as R25),
contract `r21-2`, 9/9 live calls first-attempt, zero fallbacks. Service restarted
once at the end on this code and healthy.

Rule compliance: nothing pointed at `neat-pony-216` (import-time refusal kept,
both unit-tested modes); `room-bridge`/`sse-bridge` untouched; no email/Telegram;
no `src/` or `ios-native/` edits; service env/bot identity untouched; test ports
3101/3102 used for my runs only, all down now; production service never stopped
(one `kickstart -k` at the end); no `git add -A`; nothing pushed. Test passwords
only in `/tmp/corner-v2-e2e.env` and `/tmp/corner-v2-bridge-bot.env` (0600, values
never appear below).

## 0. What runs where (as this report lands)

| Process | Port | State |
|---|---|---|
| `com.aom-ea.corner-v2-bridge` (production service) | 3100 | running on the new code (restarted once, §7) |
| live suite bridge (this round, R29 code) | 3101 | terminated after the green run |
| fake bridge (this round, R29 code) | 3102 | terminated after the green run |

Production writes this round (all labelled probes): `R29 grounding probe`,
`R29 grounding probe 2`, `R29 containment probe`, `R29 containment probe 2`
(their turns + ledger rows; probe 2 is the green-run proof thread, kept live
like R25's probe E). No other thread was answered by any of my bridges. The
Wolfpack replay (§4) was read-only: queries + Mac files only, zero writes
(no `sendMessage`, no events, no ledger appends — verified by code path).

## 1. Context pack v2 (C003)

`Bridge.context_pack` now assembles, in order, each section token-capped so the
pack stays under ~12k tokens (`PACK_TOKEN_BUDGET`, ~4 chars/token):

- (a) project Mac files (budget 5000): `CONTEXT.md`, `BUILD.md` last `###` round
  + freshest `**Status:**` line, `VISION.md` first 40 lines, weekly updates
  (`<slug>/updates/` or the project's `##` section of
  `corner/users/aom/weekly-update-ledger.md`). Matched by slug/title
  (`find_project_dir`); no folder → fallback line, and a startup table lists
  every project without one.
- (b) project thread's last 30 messages (budget 2500), via `v2Projects:get`
  → project `threadId` → surface read, even when the turn is in a mission
  thread (when the turn IS the project thread, (b) reuses the window).
- (c) mission list with goals/status (budget 500).
- (d) this thread's last N (budget 2000, existing).
- (e) ledger rows workspace-scoped for the project, newest first (budget 1500):
  `v2Ledger:latest` with subjects `[projectSlug]` (limit 30), no thread filter.
  Writes still carry `[projectSlug, missionSlug]`, so old rows keep matching.
  `latest_decided` still thread-filters for the exact decided fact.
- (f) Visual Window state (budget 500, existing).

New pure helpers, all unit-tested with a fixture project folder:
`load_project_notes`, `project_notes_text`, `find_project_dir`,
`projects_missing_folders`, `estimate_tokens`/`cap_text`, `render_msg_line`,
`latest_body`, plus `Bridge.ledger_subjects` / `ledger_latest` /
`project_detail` / `thread_messages`.

Startup tables (printed, not stored): test bridges print one grounding line
(`[r29] grounding: project='Aster' folder=MISSING (thread+ledger only)` —
observed on both test bridges); the service prints `N/M projects have Mac
folders` plus each missing title.

## 2. "Latest" contract r21-1 → r21-2

Script `plan_turn` and the live `latest` slot now synthesize (e) → (b) → (a) in
freshness order, every fact named by source ("From the ledger… / From the
thread… / From the project notes…"). The exact phrase "nothing in the ledger"
never appears in script output; in live output it is a fatal wording violation
(`nothing-ledger`, retry once with the name, then whole-turn fallback) whenever
the pack has notes or project-thread content. All-empty packs say what the brain
CAN do next ("I can start a first pass the moment you give me the goal…").
Run-bookkeeping rows (`Started/Finished a … run.`) yield to signal rows when
signal exists.

## 3. Gates (C001, C002)

- C001: the contract claims Visual Window / tabs / files / "already up" ONLY
  when the turn opened it. `enforce_ui_claims` runs over every plan in
  `execute_plan`: sentences matching `UI_CLAIM_RES` are stripped without a
  same-turn `looking`/`artifact` event (logged as `[r29] ui-claim-stripped`),
  emptied messages get a neutral rewrite (never silence). Unit-tested with a
  lying fake brain both ways.
- C002: `check_step_label` (3..80 chars, contains a space — one-word steps
  rejected) enforced in `validate_live_slot` as fatal → retry once with the
  violation named (`retried_from` recorded on the call); `validate_question_options`
  (label + one-line sub) enforced over the outgoing skeleton in `live_plan` —
  sub-less options reject the turn to fallback, named. Proven by unit tests
  (flaky stub recovers on attempt 2; sabotaged `QUESTION_OPTIONS` → fallback).

## 4. Proof on Patrik's real project: Wolfpack replay (read-only)

Question replayed: "what's the latest with Wolfpack?" against the live AOM
world (bot creds, queries only) + Mac files. Pack sections + sizes:

| Section | Content | Chars | ~Tokens |
|---|---|---|---|
| (a) project notes | STATUS: blocked on Patrik approving the draft to send… + R10 last round + weekly section (3 sent updates) + VISION head + CONTEXT (cut at budget) | 20007 | 5001 |
| (b) project thread (30) | real history incl. Patrik's "What's the next deliverable…" + @mom's prior ledger-only answer | 4240 | 1060 |
| (c) missions | (none — Wolfpack is migrated, `v2Projects:get` returns 0 missions) | 52 | 13 |
| (d) this thread (20) | same window (turn is in the project thread) | 2814 | 703 |
| (e) ledger (project-scoped, 7 rows) | 6 run-bookkeeping + **Sept 3 "Filed four Phoenix B2B growth research docs…" (no thread link — the old thread-only filter hid this row)** | 566 | 141 |
| (f) visual | no tabs | 43 | 10 |
| TOTAL | | 27844 | 6961 |

BEFORE (old code + old contract, reconstructed from the same rows): thread-only
ledger (6 bookkeeping rows, no decided) → script: "No decisions recorded for
this thread yet. Recent activity: Finished a corner-v2-chat run.; Started a
corner-v2-chat run.; …"; live Mom under r21-1 ("report the latest from the
LEDGER rows above"): "there's nothing in the ledger." The Sept 3 research row,
the thread history, and CONTEXT.md/BUILD.md were all invisible.

AFTER (script wording, deterministic from the pack):

> From the ledger: Filed four Phoenix B2B growth research docs under Wolfpack
> and indexed them from Ambition too. (2026-09-03T21:27:17.348Z). From the
> project thread: [last 3 messages]. From the project notes: latest status is
> blocked on Patrik approving the draft to send (or editing it).

AFTER (live Mom via `muse exec` on the real pack, 7.6 s, $0, first attempt,
zero violations):

> From the ledger, Wolfpack chat runs finished today plus Sep 3 filing of four
> Phoenix B2B docs indexed under Wolfpack and Ambition. From the thread, Week 3
> shipped Aug 17 locked as no-exceptions Fridays, Aug 19 push 9ac8aa8e with
> Robert's 15-item list still not live past 063ba05, and GBP hero export open.
> From the project notes, still blocked on Patrik approving the shoot-dates
> draft.

The Aster side: `v2Projects:get` returns 5 missions (incl. the R29 probes), so
(c) is populated there; Aster has no Mac folder, so (a) is the honest fallback
line — the suite's green test 4 reply shows it working ("From the project notes
there is no Mac folder yet so the ledger and thread are the source").

## 5. Live suite on production: 8 passed, 1 skipped (2.6 m)

Bridges: test-mode R29 code, `R20_BRAIN_MODE=live`, paige→muse / steffen→claude,
ports 3101/3102, fresh probes `R29 grounding probe 2` / `R29 containment probe 2`.
`LIVE_BASE_URL=https://corner-convex.vercel.app TEST_BRIDGE_URL=…/3101
TEST_FAKE_BRIDGE_URL=…/3102 npx playwright test --project chat`:

```
8 passed (2.6m), 1 skipped (test 8, needs R21_COMPARE_THREAD)
```

Per-call record (from `/r20/state`, contract `r21-2`): 9/9 ok first attempt,
zero retries, zero fallbacks — muse driver 4.1–8.5 s ($0), Claude guests 12.7 s
($0.3665) + 11.1 s ($0.3697). Suite Claude spend **$0.7362**. Wording gate
re-verified over all 12 R29 reply evidence files (`R21-reply-*-r29[b].txt`):
13–87 words, zero em-dashes, zero "as an AI", zero "nothing in the ledger".
Test 4's live latest names Buyers with all three sources (evidence
`rounds/evidence/R21-reply-paige-4-r29b.txt`).

First attempt at this suite FAILED test 4 (timeout waiting for "Buyers") and
found a real defect: the turn's ledger read failed transiently → `except →
[]` → pack without (e) → no `fact` expected → zero violations recorded, yet the
answer missed Buyers. Fixed the root cause: `ledger_latest` retries once after
2 s and degrades loudly (`[r29] ledger read …` log lines), unit-tested
(flaky-once → rows; dead-twice → []). Reads probed 5/5 ok afterwards; the full
rerun on fresh probes is the 8/8 above. The aborted run's tests 1–3 replies
(`-r29` files) still stand as evidence; its probe threads stay archived-eligible.

## 6. Commits (scoped paths only, nothing pushed)

- AOM-EA repo (`fb55b0f3f`): `scripts/v2-team-bridge.py`,
  `scripts/test_v2_team_bridge.py` — exactly these two files (pathspec commit;
  other staged/worktree changes untouched).
- Nested `aom-studio` repo (`8cb1409d`, this file + 12 evidence txts, new files only):
  `corner/missions/corner-v2/rounds/R29-chat-grounding.md`,
  `rounds/evidence/R21-reply-*-r29*.txt`. NOT committed there:
  `punch-list.md` — my C001–C003 status flips are in the worktree, but the file
  also carries 21 uncommitted sibling rows (L015–L021, P069–P081, C004–C006);
  committing it would sweep another lane's in-progress work, so the orchestrator
  takes it with the rest. NOT committed anywhere:
  `corner/state/corner-v2-bridge.env` (quoting-only diff, not mine),
  `e2e/results*/`, `/tmp` scripts.
- Web worktree (`c46a542`): `e2e/chat.spec.ts` only — test 4's script branch now asserts
  the r21-2 synthesis (`from the ledger`) instead of the retired
  `Latest on this deck` canned line.

Observed while committing (not touched): sibling rows C004 (ledger noise),
C005 (turns ending on promises), C006 (Mom latency 83–110 s) are open in the
worktree — a concurrent lane is working the same Wolfpack surface. My
run-bookkeeping skip (§2) overlaps C004's symptom; the rows stay theirs.

## 7. Restart (the one)

After 50 unit + 8/8 suite green:
`launchctl kickstart -k gui/$UID/com.aom-ea.corner-v2-bridge` → service back on
`:3100`, `/health` ok, contract now reports `r21-2`. Bot identity and env
untouched. First sweep took ~3 min (169 threads × `_describe_thread`), during
which `:3100` refused connections — normal, not a crash; verified healthy after.
Startup grounding table live in the log: **40/147 projects have Mac folders**.
Next restart (if any) is the orchestrator's.

Incident seen in the log (pre-existing, not mine): at ~21:48, BEFORE the
restart, the old instance logged a wall of `transport: HTTP Error 401` on every
backend call and never recovered — `ConvexClient.call` only refreshes on
JSON-envelope auth errors, while an HTTP-level 401 raises out of `_post` and
wedges that client until restart. Bot password verified working (fresh sign-in
succeeds), so this was a transient backend 401 blip, not a creds problem — but
any repeat will wedge the service the same way. Recommended follow-up (not this
round): catch HTTP 401 in `call()` and run the refresh/sign-in recovery there.

## 8. Cost per turn now

Pack per turn ≈ 2k tokens (Aster, no folder) to ≈ 7k (Wolfpack, full notes) of
input context. Marginal spend unchanged: muse-driven turns $0; a turn that pages
Claude (Steffen) ≈ $0.37. Worst-case busy hour (60 turns, every one Steffen)
≈ $22; typical mix ≈ $1–2. The grounding adds context, not dollars, on the
default backend map.

## 9. For Patrik

Wolfpack knows its project now. Asking "what's the latest" no longer ends at an
empty ledger — the answer pulls the Sept 3 research filing, the thread, and the
BUILD status, and says which is which. Two honest limits: Wolfpack has no v2
missions yet so the mission list is empty there (it works where missions exist —
Aster shows 5), and CONTEXT.md is 71KB so the brain reads the first ~20KB
(status + latest round + vision head first, never cut). If Mom ever claims the
Visual Window shows something she didn't open, the bridge now deletes the
sentence before it sends and logs it.
