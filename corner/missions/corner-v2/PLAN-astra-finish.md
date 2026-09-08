Current tick: loop tick 12. Next action: fire Round 1, the five-project Walk 4 in Patrik's logged-in Chrome.

Each numbered round below is one loop firing.

# Astra finish plan

## 1. Walk 4: score the live system without fixing it mid-walk

- **Owner:** Claude by hand
- **Inputs:** `corner/missions/corner-v2/GOAL-chat-knows-every-project.md`; `corner/missions/corner-v2/rounds/GOAL-walk-3.md`; `corner/missions/corner-v2/rounds/R53-chat-combined-asks-and-siblings.md`; `corner/missions/corner-v2/STATUS.md`
- **Exact gate:** In Patrik's logged-in Chrome on `https://aheadofmarket.com/dashboard`, ask all four acceptance questions in Wolfpack, Ambition, Kraken Corps, Aom, and AZ Tech Council. Record the answer text, screenshots, file-open time, and reply time. Every project must score at least 7/8; every pull-up must open the Visual Window with a working dashboard link within 5 seconds; every reply must land within 15 seconds; no answer may invent or mis-date a fact or expose a filesystem path. Do not repair a miss during this firing.
- **Evidence file:** `corner/missions/corner-v2/rounds/GOAL-walk-4.md`
- **Step cap:** 140
- **Still off carry-forward:** Every miss, including a content miss, goes verbatim into Round 2. Threads remain uncleared. Native, shared view state, desktop companion, G7, and the punch-list closeout remain open.

## 2. Close every Walk 4 miss and recover the missing Ambition deed

- **Owner:** Codex
- **Inputs:** `corner/missions/corner-v2/rounds/GOAL-walk-4.md`; `corner/missions/corner-v2/GOAL-chat-knows-every-project.md`; `corner/missions/corner-v2/rounds/R53-chat-combined-asks-and-siblings.md`; `corner/missions/corner-v2/punch-list.md`; `../corner/missions/gateway/rounds/G6-videos-open-and-honest-attribution.md`
- **Exact gate:** Each failed Walk 4 assertion has a reproducer and a scoped fix. The 2026-09-07 6:20 PM Ambition captions delivery is traced to source evidence and appears once as an Ambition ledger deed with its real time, or the evidence file proves why no such deed can honestly be written. Kraken Corps and AZ Tech Council remain explicitly honest when no newer deed exists. Run the bridge, gateway, hook, or Convex tests touched by the fixes; all must pass. Live proof is limited to the e2e design thread.
- **Evidence file:** `corner/missions/corner-v2/rounds/R54-chat-walk-4-repairs.md`
- **Step cap:** 350
- **Still off carry-forward:** No score changes until Round 3 re-proves them in Patrik's Chrome. C020 remains assigned to Round 13. The five project threads remain uncleared.

## 3. Re-prove Walk 4 after the repair round

- **Owner:** Claude by hand
- **Inputs:** `corner/missions/corner-v2/rounds/GOAL-walk-4.md`; `corner/missions/corner-v2/rounds/R54-chat-walk-4-repairs.md`; `corner/missions/corner-v2/GOAL-chat-knows-every-project.md`
- **Exact gate:** Re-run all four questions on all five projects, not only the prior misses, with the same score, truth, path, 5-second open, and 15-second reply gates as Round 1. Append a dated re-proof section and fresh screenshots/timings. If any project remains below 7/8, insert another numbered repair firing followed by another full re-proof firing before Round 4.
- **Evidence file:** `corner/missions/corner-v2/rounds/GOAL-walk-4.md`
- **Step cap:** 140
- **Still off carry-forward:** Test A is not closed until the clean rerun. No native or desktop work advances past its next listed firing while this gate is red.

## 4. Clear all five chats and run Test A from empty

- **Owner:** Claude by hand
- **Inputs:** `corner/missions/corner-v2/GOAL-chat-knows-every-project.md`; `corner/missions/corner-v2/rounds/GOAL-walk-4.md`; `corner/missions/corner-v2/rounds/R54-chat-walk-4-repairs.md`
- **Exact gate:** Call `clearThread` on the Wolfpack, Ambition, Kraken Corps, Aom, and AZ Tech Council project threads, verify each is empty, then ask all four questions again in each clean thread. Every project must still score at least 7/8 with no invented or mis-dated fact, no filesystem path, a working Visual Window link and open within 5 seconds, and a reply within 15 seconds. A failure inserts a numbered repair plus full clean re-run before Round 5.
- **Evidence file:** `corner/missions/corner-v2/rounds/GOAL-clean-rerun.md`
- **Step cap:** 180
- **Still off carry-forward:** Test A closes only when this file is green. Tests B and C, C020, and the punch-list reconciliation remain open.

## 5. Build native R43: home first, distinct cards, eye modes, and stable follow

- **Owner:** one Muse Spark 1.3 builder
- **Inputs:** `corner/missions/corner-v2/briefs/R43-native-home-first-and-eye.md`; `corner/missions/corner-v2/rounds/R41-native-home-welcome.md`; `corner/missions/corner-v2/rounds/R42-native-cv6-composer-bubbles-loader.md`; `corner/missions/corner-v2/SPEC-visual-window-companion.md`; `corner/missions/corner-v2/punch-list.md` rows P083 and P094-P097
- **Exact gate:** P097 cold/long-background entry lands on home while deep links still land on their thread; P096 shows three distinct subjects with onboarding padding; the eye cycles FaceTime -> full -> hidden and persists per thread; an agent artifact opened while hidden restores FaceTime; opening or closing the window never releases a pinned native thread. Units, only the home/entry/Visual Window/touched UI suites, and one `node tools/native-design-vs-sim.mjs` pass on the 390 test simulator are green. Evidence includes launch-to-home and all three eye-mode PNGs. Commit locally; never push or install to a device.
- **Evidence file:** `corner/missions/corner-v2/rounds/R43-native-home-first-and-eye.md`
- **Step cap:** 450
- **Still off carry-forward:** Shared backend view state and the phone website-as-video treatment remain for Rounds 7-8. Full native suites and TestFlight remain for Round 6.

## 6. Run the native ship gate and publish TestFlight 20

- **Owner:** Claude by hand
- **Inputs:** `corner/missions/corner-v2/rounds/R43-native-home-first-and-eye.md`; `corner/missions/corner-v2/briefs/R43-native-home-first-and-eye.md`; `corner/missions/corner-v2/handoffs/2026-09-08-astra-finish-plan.md`
- **Exact gate:** From a clean worktree at the R43 commit, erase the app and `cv6-theme` default on the allowed test simulators, run the complete native unit/UI suite once and the native design gate once, then archive Release as build 20. Upload succeeds, Apple reports VALID, build 20 is attached to `Corner testers`, and beta review is submitted. Record the commit, archive result, delivery id, App Store state, and final simulator screenshots.
- **Evidence file:** `corner/missions/corner-v2/rounds/R54-testflight-20.md`
- **Step cap:** 220
- **Still off carry-forward:** TestFlight review latency is recorded, not hidden. Phone website-as-video, shared awareness, desktop companion, G7, and final closeout remain open.

## 7. Add authoritative per-thread view state and agent-driven window events

- **Owner:** Codex
- **Inputs:** `corner/missions/corner-v2/SPEC-visual-window-companion.md`; `corner/missions/corner-v2/rounds/R43-native-home-first-and-eye.md`; `corner/missions/corner-v2/rounds/R53-chat-combined-asks-and-siblings.md`; `corner/missions/corner-v2/punch-list.md` rows C010 and C016
- **Exact gate:** The production-clone backend stores one authenticated `viewState {threadId, mode, tabId, page, scroll}` per thread; permitted clients can write it and foreign tenants cannot. The bridge pack names the exact current view and available indexed files. File mention emits/open-selects the artifact before the claim; a true move-on emits the close/minimize event. Backend v2 tests and `python3 scripts/test_v2_team_bridge.py` are green, the deploy targets only `brilliant-scorpion-163`, and one labelled design-thread turn proves open, narration from current state, then move-on close. C010 is either proven closed with owner-only cleanup and no production ghosts or fixed here.
- **Evidence file:** `corner/missions/corner-v2/rounds/R55-backend-view-state-and-agent-window.md`
- **Step cap:** 450
- **Still off carry-forward:** Native and web clients still need to publish every mode/tab/page/scroll change. Website presentation and desktop multi-chat remain open.

## 8. Wire native shared awareness and website-as-video

- **Owner:** one Muse Spark 1.3 builder
- **Inputs:** `corner/missions/corner-v2/SPEC-visual-window-companion.md`; `corner/missions/corner-v2/rounds/R43-native-home-first-and-eye.md`; `corner/missions/corner-v2/rounds/R55-backend-view-state-and-agent-window.md`; `corner/missions/corner-v2/punch-list.md` rows P094-P095 and C016
- **Exact gate:** Native publishes mode, selected tab, page, and scroll changes to the thread view state and consumes agent open/close events without polling races. A website renders its desktop page as a scrollable horizontal 16:9 view about one-third of the vertical phone in FaceTime/full modes. A labelled design-thread conversation proves that the reply names what the phone is showing, opens a mentioned file, and minimizes/closes it on move-on. Units, only touched native UI suites, and one native design-gate pass on the 390 test simulator are green.
- **Evidence file:** `corner/missions/corner-v2/rounds/R56-native-view-state-and-website-video.md`
- **Step cap:** 450
- **Still off carry-forward:** The complete native ship gate and TestFlight 21 remain for Round 9. The desktop half of Test B remains open.

## 9. Publish TestFlight 21 and prove the phone half of Test B

- **Owner:** Claude by hand
- **Inputs:** `corner/missions/corner-v2/rounds/R56-native-view-state-and-website-video.md`; `corner/missions/corner-v2/SPEC-visual-window-companion.md`; `corner/missions/corner-v2/rounds/R54-testflight-20.md`
- **Exact gate:** On clean allowed simulators, the complete native unit/UI suite and native design gate pass once. A clean Release archive becomes build 21; upload succeeds; Apple reports VALID; it is attached to `Corner testers` and submitted for beta review. On the TestFlight build, record the eye's FaceTime/full/hidden cycle, agent file-open, move-on minimize/close, horizontal website review, and a reply that correctly states the current view. Do not call this gate green from simulator evidence alone.
- **Evidence file:** `corner/missions/corner-v2/rounds/R57-testflight-21-phone-companion.md`
- **Step cap:** 240
- **Still off carry-forward:** Apple review or Patrik's install is an explicit external wait if unfinished. Desktop Test B, G7, and final punch-list closure remain open.

## 10. Build desktop R44 and absorb the two remaining small desktop defects

- **Owner:** one Muse Spark 1.3 builder
- **Inputs:** `corner/missions/corner-v2/briefs/R44-desktop-artifact-link-and-glow.md`; `corner/missions/corner-v2/rounds/R43-desktop-visual-window-opens.md`; `../corner/missions/gateway/rounds/G3-cards-tell-the-truth-and-files-open.md`; `corner/missions/corner-v2/punch-list.md` rows L015, L037, and L039
- **Exact gate:** `?artifact=<id>` opens the requested thread, opens/focuses that artifact, then removes the query without reload; the canonical dashboard redirect preserves the query. The per-project composer glow moves and brightens on reply, while reduced motion is static, without shifting a design anchor. L015 explicit-collapse reload survives repeated live attempts, and the v2 shell makes no legacy `rooms:getRoom` call with a thread id. Lint has zero errors, TypeScript is clean, vitest is green, offline e2e runs once on port 5174, the preview design gate is 0/0, and the live suite is 11 pass/0 fail. Commit locally; never deploy production or edit `convex/`.
- **Evidence file:** `corner/missions/corner-v2/rounds/R44-desktop-artifact-link-and-glow.md`
- **Step cap:** 400
- **Still off carry-forward:** Desktop eye modes, shared-state writes, condensed multi-chat, the production deploy, and the manual Test B proof remain open.

## 11. Build the desktop eye, shared awareness, and condensed multi-chat

- **Owner:** one Muse Spark 1.3 builder
- **Inputs:** `corner/missions/corner-v2/SPEC-visual-window-companion.md`; `corner/missions/corner-v2/rounds/R55-backend-view-state-and-agent-window.md`; `corner/missions/corner-v2/rounds/R44-desktop-artifact-link-and-glow.md`; `corner/missions/corner-v2/punch-list.md` rows L038 and C016
- **Exact gate:** Every desktop chat has the top-right eye and can enter FaceTime and full context modes. Up to eight chats can be condensed and used at once; exactly one owns the context window; that window covers the other chats but not the active conversation, and closing it restores access to the others. Desktop publishes mode/tab/page/scroll, consumes agent open/close events, and the next reply identifies the actual current view. Lint, TypeScript, vitest, focused offline e2e, preview design gate 0/0, and live suite 11 pass/0 fail are green. Commit locally; do not deploy production.
- **Evidence file:** `corner/missions/corner-v2/rounds/R58-desktop-eye-and-multichat.md`
- **Step cap:** 450
- **Still off carry-forward:** Production deployment and manual desktop Test B proof remain for Round 12. G7 and punch-list closeout remain open.

## 12. Deploy and prove the desktop companion on production

- **Owner:** Claude by hand
- **Inputs:** `corner/missions/corner-v2/rounds/R44-desktop-artifact-link-and-glow.md`; `corner/missions/corner-v2/rounds/R58-desktop-eye-and-multichat.md`; `corner/missions/corner-v2/SPEC-visual-window-companion.md`; `corner/missions/corner-v2/handoffs/2026-09-08-astra-finish-plan.md`
- **Exact gate:** Build and deploy a clean validated archive to the real `corner-convex` production project with the `brilliant-scorpion-163` URLs, then verify only through `https://aheadofmarket.com/dashboard`. The production design gate is 0/0 and the live suite is 11 pass/0 fail. Manual evidence shows the artifact deep link, project glow, eye modes, eight condensed chats, one context-window owner, agent open/close, and a reply that names the exact current tab/page/scroll. Served assets match the deployed commit.
- **Evidence file:** `corner/missions/corner-v2/rounds/R59-desktop-companion-production.md`
- **Step cap:** 240
- **Still off carry-forward:** G7 and the final punch-list sweep remain open. Any production-only miss becomes its own numbered repair firing before Round 13.

## 13. Finish Gateway G7

- **Owner:** Codex
- **Inputs:** `../corner/missions/gateway/rounds/G6-videos-open-and-honest-attribution.md`; `corner/missions/corner-v2/rounds/GOAL-walk-3.md`; `corner/missions/corner-v2/rounds/R53-chat-combined-asks-and-siblings.md`; `corner/missions/corner-v2/punch-list.md` row C020
- **Exact gate:** Files over 20 MB receive a prebuilt ffmpeg 720p preview no larger than 20 MB; the 85 MB Elephante cut opens from its dashboard pull-up in at most 5 seconds while the full file stays on the Mac. `/gateway/open` reloads the saved index on an unknown id before returning 404. Sibling pull-up order keeps `aheadofmarket-com` first, site-page ticks name the page, and the Ambition captions deed from Round 2 is visible to card and pack readers. `python3 scripts/gateway/tests/test_gateway.py` is green; the launch agent restarts healthy; live proofs use the design thread except the read-only card/pack check.
- **Evidence file:** `../corner/missions/gateway/rounds/G7-big-video-previews-and-index-reload.md`
- **Step cap:** 400
- **Still off carry-forward:** Only punch-list reconciliation, final production/TestFlight evidence, and Patrik-owned blockers remain.

## 14. Reconcile and close the punch list

- **Owner:** Codex
- **Inputs:** `corner/missions/corner-v2/punch-list.md`; `corner/missions/corner-v2/rounds/R43-native-home-first-and-eye.md`; `corner/missions/corner-v2/rounds/R55-backend-view-state-and-agent-window.md`; `corner/missions/corner-v2/rounds/R56-native-view-state-and-website-video.md`; `corner/missions/corner-v2/rounds/R44-desktop-artifact-link-and-glow.md`; `corner/missions/corner-v2/rounds/R58-desktop-eye-and-multichat.md`; `../corner/missions/gateway/rounds/G7-big-video-previews-and-index-reload.md`
- **Exact gate:** Re-check every row still marked open, stale, or unverified. Rows already proven by R26/R38/R41/R43 are closed only against their named evidence; P083/P094-P097, L015/L037-L039, C010/C016/C020 are closed against the finishing-round evidence. Any real unblocked miss gets one scoped fix and its touched gate inside this cap. At exit there are no unblocked open P/L/C rows and no row is closed by assertion alone.
- **Evidence file:** `corner/missions/corner-v2/rounds/R60-punch-list-closeout.md`
- **Step cap:** 350
- **Still off carry-forward:** Only the final acceptance firing and the explicit Patrik-owned list below remain. A miss too large for this cap inserts one numbered bounded repair before Round 15.

## 15. Final production and TestFlight acceptance

- **Owner:** Claude by hand
- **Inputs:** `corner/missions/corner-v2/GOAL-chat-knows-every-project.md`; `corner/missions/corner-v2/SPEC-visual-window-companion.md`; `corner/missions/corner-v2/rounds/GOAL-clean-rerun.md`; `corner/missions/corner-v2/rounds/R57-testflight-21-phone-companion.md`; `corner/missions/corner-v2/rounds/R59-desktop-companion-production.md`; `corner/missions/corner-v2/rounds/R60-punch-list-closeout.md`; `corner/missions/corner-v2/STATUS.md`
- **Exact gate:** Test A is green from clean threads, Test B is green on the installed TestFlight build and canonical production dashboard, Test C has current native and production design evidence, the punch list has no unblocked open row, and the canonical dashboard serves the exact validated production commit. Record one final evidence index and change mission status only after every cited proof is readable.
- **Evidence file:** `corner/missions/corner-v2/rounds/GOAL-final-acceptance.md`
- **Step cap:** 180
- **Still off carry-forward:** None inside agent control. Do not label the mission done while an acceptance gate is red; add a numbered repair firing and re-run only the affected acceptance firing.

## Blocked on Patrik throughout

- Disable the unused desktop connectors: agent memory, Context7, DaVinci Resolve, Chrome DevTools, Playwright MCP, and iMessage.
- Confirm the seven hedged facts.
- Rotate the exposed APNS key.
- Delete Convex deployment `lovable-weasel-178`.
- Revoke the three old deploy keys.
- Choose whether to update macOS 26.6.2 and Xcode 26.6 for direct phone installs; TestFlight remains the ship path meanwhile.
