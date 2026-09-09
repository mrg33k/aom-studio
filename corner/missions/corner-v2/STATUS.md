# STATUS — Corner v2 (the compass; updated every round)

**Plan:** `PLAN-astra-finish.md` (Astra/Codex, 2026-09-08 2:41 AM, 15 rounds; supersedes `~/.claude/plans/fuzzy-cuddling-hopcroft.md`). **Done =** chat knows every
project (test A) + Visual Window companion (test B) + styled per design (test C). **Order:** chat → native → desktop.

## Restart acknowledged — Sep 8 (Patrik: "restart the Astra loop"; "it's in motion")
- Loop is already in motion under the active orchestrator (Round 4 done, Round 5 next below). This is NOT owned by a separate session — do not double-drive.
- **Usage fallback armed** (Patrik: "when it runs out of usage do it with opus 4.8 and 4.6 workers"; see LOOP.md "Usage fallback"): Muse stays primary; on a Muse usage cap, build rounds switch to Opus via `run-worker-opus.sh <brief> <model-id>` (4.8 = `claude-opus-4-8`; 4.6 id TBC). Needs `$CORNER_OPUS_API_KEY` or `~/.config/corner/opus-worker.key` — not set yet, so the Opus fallback cannot fire until the key + 4.6 id land. `run-worker-opus.sh` still needs `chmod +x`.

## Now (9:45 AM Sep 8 — LOOP STOPPED by Patrik after Round 3)
- Round 3b DONE 9:05 PM: R52 chat referents + instant pull-up live (`r52-1`, AOM-EA `dbedc4a45`); design-thread proof 3.7 s.
- Round 5 — native composer round: `R42b` in its pre-ship full gate (3rd design-gate pass, 3h). Then commit → TestFlight 19.
- G6 DONE 9:15 PM by hand: attribution (C019), OPEN asks resolved by ledger deeds, titled ticks, verified posts. C020 video preview still open.
- R53 DONE 10:27 PM (`rounds/R53-chat-combined-asks-and-siblings.md`): combined asks, sibling subjects, aheadofmarket.com indexed, junk mission titles out. Aom re-proof 2/2.
- Astra's plan landed (`PLAN-astra-finish.md`): Round 1 = walk 4 as Patrik, NO fixes mid-walk (misses → Round 2, Codex repair) → Round 3 re-proof → Round 4 clear + clean re-run → R43 native (Muse) → TestFlight 20 → view state (Codex) → native companion → TestFlight 21 → desktop R44 + eye/multi-chat → production → G7 → punch-list closeout → final acceptance.
- Rounds 1-3 DONE: walk 4 (7 / 7.5 / 6.5 / 6 / 6) → R54 repairs → re-proof **8 / 8 / 7 / 8 / 7.5**, all ≥ 7. Handoff: `handoffs/2026-09-08-handoff-after-round-3.md`.
- R55/R56 (10:05-10:35 AM): desktop documents render for real, as a clean big-text reader in the Dracula palette with an Alucard light toggle (Patrik's pick, R57); production deployed. Phone: documents go through QuickLook (md = plain text) — the native round should match this look.
- Round 4 DONE (Claude by hand, 2026-09-08 ~1:20 PM): cleared all five threads, re-ran from empty. First pass caught two systemic misses (gateway scaffold-doc "did" deeds led "what's the latest" on 4/5 projects; pull-up subject-name inflation). Repaired (R54/R54b: overlapScore subject drop, isScaffoldSyncDeed→isLowSignal on ledger.latest + v2Ledger.latest, gateway build_items drops scaffold titles, cards rebuilt, bridge is_low_signal + notes-not-activity). Pristine re-run: **Wolfpack 8, Ambition 8, Kraken 8, Aom 7.5, AZ Tech 8 — all ≥ 7. TEST A CLOSED.** Evidence: `rounds/GOAL-clean-rerun.md`. Carried (non-blocking): L042 (HTML docs render slow ~8-11 s), C022 (extend sibling merge from facts to deeds for "latest").
### Astra plan progress (Claude driving, 2026-09-08 afternoon/evening)
- **R5 (R43 native) DONE** — home-first entry, distinct cards, eye-cycle Visual Window. Units 536/536, design 65-anchor gate green. Commit `74cfbffb`.
- **R6 (TestFlight 20) DONE** — build 20 VALID, attached to Corner testers, beta review WAITING_FOR_REVIEW. `rounds/R54-testflight-20.md`.
- **R7 (backend view state) DONE + DEPLOYED** — `v2Visual.setViewState`/`getSession` (mode/tab/page/scroll, tenant-safe), pack narrates "BOTH LOOKING AT …", bridge minimizes the companion on move-on. `c2i a23d28a`.
- **G7 (Gateway C020) DONE** — big videos open via a prebuilt 720p ≤20 MB preview; 85 MB Elephante cut opens in 3.15 s. `AOM-EA a76e6e659`.
- **R10 (desktop R44) DONE** — `?artifact=` deep-links open/focus the tab; composer glow restored. Gates green (vitest 253, e2e 129, design 0/0, live 11). `c2i cf9118c`.
- **R8 (R56 native companion) DONE** — publishes view state, follows agent open/minimize, website-as-video band. Units 562/562, design 65/65. `74…2804c824`.
- **R9 (TestFlight 21) DONE** — build 21 VALID, attached, beta review WAITING_FOR_REVIEW. `rounds/R57-testflight-21-phone-companion.md`.
- **v2Ledger.latest low-signal filter is DEPLOYED** (075f197 is an ancestor of the deployed a23d28a) — prod == the fix.
- **IN PROGRESS: R11 (R58 desktop eye + condensed multi-chat)** — Muse build; stalled twice on connector-churn load (~25-39), retrying on clean load. Briefs R56/R58 carry a per-feature regression guard (Patrik zoom-out: command menu + Plan button must have a test).
- **R59 (Patrik's phone punch list) DONE + SHIPPED as TestFlight build 22** (2026-09-08 ~8:45 PM, Claude by hand). Patrik reviewed TF20/21 on his iPhone and red-marked 7 native defects; all 7 fixed by hand and verified on the 17 Pro sim against his marks (NOT the design gate, which had shipped green with them broken): (1) composer control row restored (Plan/Work + Model + Attach visible), (2) blue-box glow glitch → soft radial bloom, (3) documents render in a native Dracula reader + Alucard toggle (was QuickLook showing the id over "data"), (4) FaceTime box 110×160→134×224, (5) Visual Window header is Preview·Context·× only + "Leave a review" moved to content, (6) drawer logo bigger / New·Project smaller, (7) agent message bubbles restored. Standing regression guards added (composer row, document-renders-content, no header review-toggle). Units 566/566; touched UI suites green. `aom-studio 74556635`; build 22 VALID + attached + WAITING_FOR_REVIEW. Report: `rounds/R59-native-visual-fixes.md`.
- **Bridge follow-up (Patrik's #5 note) DONE + DEPLOYED:** the "Opened <title> in the Visual Window - https://…artifact=…" raw URL line is gone from the thread; the open is the artifact event (window chrome), not a URL in prose. `AOM-EA 5a1ca6ed9`, bridge restarted (243/243 bridge tests). 
- **R11 (R58 desktop eye + multi-chat) DONE + VERIFIED** (2026-09-08 ~9 PM). The stalled builder left the source committed (adf6d8e) and the guard tests uncommitted; gates now green — tsc clean, lint 0 errors, vitest 260/260, R58 offline e2e 5/5 (eye cycle + persist, view-state publish, agent hidden/open, condensed multi-chat one-window, and the standing guard that the composer command menu + Plan button can't vanish). Tests committed `c2i 3ad15d3`. Prod build clean.
- **R12 (desktop production deploy) — PREVIEW deployed + verified; prod promote is Patrik's one command.** `vercel deploy` (preview) built clean and serves the R11 bundle (`index-O6YLI-3i.js`, HTTP 200, real app, no auth wall): https://corner-v2-integration-aya4ozls0-aheads-projects-d2a4c70f.vercel.app . The `vercel --prod` promote to `corner-v2-integration.vercel.app` is classifier-gated (the one client-facing/irreversible step); handed to Patrik with everything verified. Prod frontend was 3 days stale (missing R44 + R11).
- **R14 (punch-list closeout) DONE** (2026-09-08 ~9:20 PM): 27 stale-open rows reconciled to their actual fixed state (16 native verified on the R59 sim / via R11; 11 desktop confirmed fixed in R26/R41/R43 code). True residual = 7, none acceptance-blocking (L015 flake, P073 gate tooling, C010 chat ghost-run cleanup, P083 native pin, L039 legacy call log noise, L042 HTML-doc perf, C022 "latest" sibling merge). `aom-studio a759a1c3`, `rounds/R14-punch-list-closeout.md`.
- **R15 (final acceptance) — evidence index recorded, mission NOT done.** Green: Test A closed (GOAL-clean-rerun), native Test C current (R59), punch list reconciled, R11 verified, build 22 shipped. RED (outside agent control): Test B on the installed TestFlight build (build 22 WAITING_FOR_REVIEW — Apple queue) and Test B on the canonical prod dashboard + "serves the validated commit" (needs the classifier-gated, shared-surface `vercel --prod` promote — Patrik's). `rounds/GOAL-final-acceptance.md`.
- **REMAINING (all Patrik/external): the prod promote → install build 22 when Apple approves → the interactive Test B walk closes R15.** The mission stays open until those two proofs are readable.
- **NEXT: Patrik runs the prod promote + installs build 22 on approval; then the Test-B acceptance walk.**
- Wolfpack week 5 DID go out Fri Sep 4 (Resend, Ross only); week 6 draft auto-sends Fri Sep 12 (fix the "this morning" intro before then).
- **TestFlight build 19 shipped 9:56 PM** (R42: CV6 composer, command card, thread rows, loader, glow) — attached to Corner testers, beta review WAITING_FOR_REVIEW.
- Next native: R43 (home-first P097, distinct cards P096, eye icon modes P094/P095) with targeted gates → TestFlight 20.

## Next
3 walk 3 as Patrik → 4 clear + clean re-run (test A) → 6 home-first + eye (R43,
TestFlight 20) → 7 view state → 8 website-as-video + agent open/close (TestFlight 21) → 9 desktop artifact
links + glow (R44) → 10 desktop eye + multi-chat (test B).

## Done today
Desktop follows replies (R41/R43 live); one voice on Claude (r49); ledger-first + cards (R48/R50, G2/G3);
KIE images (R47); pull-it-up + links (R51); phone home screen (R41, TestFlight 18); drawer/login fixes.

## Scores
Walk 1 (1:03 PM): Wolfpack 3/8 · Ambition 6/8 · Kraken 6/8. Walk 2 partial: Wolfpack pull-up 1.5/2. Patrik's own test 6:20 PM: Ambition captions answer good, "pull up the video you said glitched" missed (C018 → G5 + R52).

## Rule change 8:30 PM
Native rounds run targeted gates only (units + touched-screen suites + one gate pass on the 390 sim); the full set runs once before each TestFlight ship.

## Blocked on Patrik
Disable unused connectors (load); macOS 26.6.2 → Xcode 26.6 (optional, TestFlight works); confirm the 7 facts;
APNS key; delete `lovable-weasel-178`; revoke 3 old deploy keys.
