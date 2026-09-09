# Round R59 — Patrik's phone punch list, fixed by hand + verified on the sim (2026-09-08, Claude)

Patrik reviewed the installed TestFlight build (20/21) on his iPhone and marked 7 native UI defects with red
annotations (3 screenshots in `rounds/evidence/R59-patrik-*.jpg`). He is the gate. Every fix was made by hand
and verified against his red marks on the iPhone 17 Pro simulator — NOT trusted to the design gate, which had
shipped green with all 7 broken. Ships as TestFlight build 22.

## The 7, each verified on the sim

1. **Composer row restored (his #1).** Plan/Work toggle, Model button, and Attach are back as VISIBLE controls
   in a row above the pill (they had regressed into the sparkle menu). The sparkle command chip, mic, and send
   stay in the pill. Drives the same per-thread state as the command card (`v2CommandsState` adapter), so they
   never drift. `ChatView.swift` — `v2ComposerControlsRow`; in-pill paperclip removed (moved to the row).
   Verified: row shows `Work · Auto · 📎` on home and in-thread.
2. **Blue box glitch gone (his #2).** The composer glow rendered as a hard-edged blue rectangle tucked under
   the pill (the old mask kept the bottom edge solid). Replaced with a soft radial bloom that feathers on every
   edge. `V2CV6Polish.swift` — `V2ComposerGlow`. Verified: soft fade, no box.
3. **Documents load (his #3, the top functional break).** Documents routed to QuickLook, which showed an
   extension-less markdown file's id over "data". New `DocumentReaderView` — a clean big-text Dracula reader
   (no line numbers, no raw syntax) with an Alucard light toggle; HTML documents render in a sandboxed
   WKWebView. `.document` now routes here, not QuickLook. Verified: "AOM — Brand Guidelines" renders its
   heading, bold, bullets, subheads in both Dracula and Alucard.
4. **FaceTime box taller (his #4).** 110×160 → 134×224 (his red box), so a document preview is legibly tall,
   not a black sliver. `V2FaceTimeWindow.swift` — `V2FaceTimeMetrics`. Verified: the PDF cover + pager fill the
   taller box; combined with #3 a document fills it instead of black.
5. **Review moved off the top tabs (his #5).** The header is now ONLY `Preview · Context · ×`. The review
   affordance dropped to a **"Leave a review"** button under the file (his arrow + note). `VisualWindowHost.swift`
   — `ReviewToggleButton` removed from the phone header; new `LeaveAReviewButton` in content. The iPad column
   keeps its toggle. Verified: top row is Preview·Context·×; Leave a review sits under the stage.
6. **Menu rebalanced (his #6).** Drawer logo 16 → 26; New/Project buttons 48 → 38 tall. `V2DrawerView.swift`.
   Verified: the logo leads, the buttons read as actions.
7. **Agent message bubbles restored (his #7, the biggest "looks broken").** The v2 thread rendered agent text
   as bare ink (R42 P092 "unbubbled") while user text had a bubble — the asymmetry read as broken. Agent text
   now wears the CV6 bubble: frosted surface + hairline + left accent bar, mirroring `MessageBubbleView`.
   `ChatView.swift` — `V2BlockView` agent `.text` branch. Verified: Paige's messages sit in bubbles.

## Regression guards (Patrik's zoom-out — "stop running in circles")
The gate had been blind to the composer row, the agent bubble, and the document-renders-content check. New
standing anchors that FAIL if any piece drops again:
- `ComposerParityUITests.testComposerControlRowPresent` — mode + model + attach + command + send all present
  without typing; the mode toggle flips. `testAttachMenu` — attach is always visible now (was hidden-until-typing).
- `R19ShootScreens.testShoot15Document` — the document renders (`visual-stage-document` present), `leave-a-review`
  present, `review-toggle` MISSING (the header carries no Review tab).
- `CompMatchUITests.testP046ReviewToggle` — asserts the header has no `review-toggle` and Leave-a-review opens
  the panel.
- `DocumentReaderParsingTests` (units) — `DocumentMarkdown.blocks` + `DocumentText.looksLikeHTML` pinned.
- Fixture: a markdown `artifact-doc-1` seeded under `-v2SeedVisual` so the reader always has real bytes.

## Gates (targeted, per the 8:30 PM rule)
- **Units: CornerTests 566/566, 0 failures** (updated `.document`→`.document` renderer map, FaceTime 134×224
  metric; +4 new `DocumentReaderParsingTests`).
- **Touched UI suites green:** ComposerParity (control-row guard + attach) 2/2; CompMatch (review moved) 2/2;
  R19 document shooter 1/1 (`visual-stage-document` painted, `leave-a-review` present, `review-toggle` MISSING).
- Debug build for the 971E7446 sim: BUILD SUCCEEDED. New file registered in `project.pbxproj`.

## For the orchestrator (ship + follow-ups)
- Ship as TestFlight build 22 (`CURRENT_PROJECT_VERSION=22`) — full archive/export/upload/attach at the commit.
- **Not native — bridge follow-up:** Patrik crossed out the "Opened <title> in the Visual Window - <url>" agent
  line in the thread (his #5 note). That raw-URL line is written server-side by the chat bridge, not the app.
  Fix in `scripts/v2-team-bridge.py` so an open is Visual-Window chrome, not a thread message with a raw URL.

## Still off
- The pixel design gate (`native-design-vs-sim.mjs`) compares against stale reference PNGs for the composer,
  thread, sheet, FaceTime, and drawer — all intentionally changed this round. Per the standing rule (Patrik is
  the gate, no automated design gate), ship was NOT blocked on it; all 7 were verified against his red marks.
  The reference PNGs want re-capturing before the pixel gate is meaningful on these screens again.
