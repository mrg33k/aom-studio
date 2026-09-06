# Brief R15-native-visual-window — durable Visual Window tabs with native renderers on iPhone (sheet) and iPad (column), then the review checklist and artifact peek (native plan Tasks 7 + 8, plus P022/P023)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40), `rounds/R14-native-chat-and-ledger.md` ("what Task 7 will
need", the two UI-test findings about identifiers and row labels, the plan-vs-backend table), and
`punch-list.md` rows P022 and P023 (yours). Write your report to `rounds/R15-native-visual-window.md`:
every command with its output.

You are a headless worker, the BUILDER for native plan Tasks 7 and 8. Nobody will answer questions.

Plan: Tasks 7 and 8 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-native-ios.md`
(lines 694-863). Design truth for the iPhone: `docs/design-reference/corner-v2/HANDOFF.md` section
4 (Thread: composer 50px pill + 50px round send, Record inside the pill; artifact peek bar 60px
above the composer with a live thumbnail and change count; Review sheet half = top 22% / full = top
34px via the handle; underlined tabs; stage height = media height 240 half / 400 full capped by
aspect + chrome 50, or 160 for timed media; checklist and Send only in review mode) and section 6
(pins ≤ 4, selected pin white, done pins green, "Send N changes", "Nothing to change, carry on").
Backend JSON wins over the plan's Swift snippets; table every discrepancy.

## Where things are, exactly

- Native repo `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/ios-native`, HEAD
  `1e7e59eb` or later, clean. XcodeGen; one xcodebuild at a time; simulators `iPhone 17 Pro`,
  `iPhone SE (3rd generation)`, `iPad Pro 13-inch (M5)` (the plan says "M4"; use M5, it is what
  exists). Identifiers: leaves only; match rows by label (R14 findings).
- Backend contract (`convex/v2Native.ts` in the web worktree): `visualTabs({ visualSessionId })`
  query (subscribe = poll like `threadEvents`), `openVisualTab({ kind, threadId, artifactId?,
  title, state })` (kind `web`→site, `genericFile`→file map on the server; `title` honoured for
  tool/legacy tabs), `closeVisualTab({ id })`, `artifacts({ threadId })` (sourceURL resolved from
  storage when present), `submitReview({ artifactId, pins: [{ clientId?, anchor, text, isDone }] })`
  → `{ checklistId, pins: [{ clientId, id }] }` (map temp ids to server ids). Tab `state` is a
  string map: `page`, `timecodeMs`, `codeLine`, `siteViewport`, `reviewing`. `Thread.visualSessionID`
  from `threadForProject`/`threadForMission`.
- Rehearsal deployment has live's env vars except `JWT_PRIVATE_KEY` (Patrik's re-run pending);
  check `npx convex env get JWT_PRIVATE_KEY --deployment adjoining-tiger-87 | wc -c` from the web
  worktree (> 1000 = present). Present → run UI tests in rehearsal mode with the demo account;
  absent → fixture mode (`V2_FIXTURE_STUB=1`), and say so. Fixture artifacts: reuse the web
  fixtures' files (`corner-v2-integration/public/fixtures/aster-brief.pdf`, `hero.png`,
  `walkthrough.mp4`) bundled into the test target; a site tab loads a bundled HTML page; a code tab
  renders a bundled `.tsx`; a `broken.pdf` tab has a dead `sourceURL` to prove the recoverable-error
  tab.
- Never push; stage only the plan's listed files (+ regenerated `project.pbxproj`, + the bundled
  fixture files under `CornerTests/Fixtures/`).

## Task 7 (plan Steps 1-7)

Failing tests first: `CornerTests/VisualWindowStoreTests.swift` (plan's two + `close removes only
that tab and keeps order`, `select never calls open`, `relaunch restores tabs, selection and page
from the server session`), `CornerUITests/VisualWindowUITests.swift` (iPhone: open pdf, open site,
both tabs present, reopen pdf keeps site, close pdf leaves site, relaunch restores; iPad: the same
state shows in the column beside the chat; broken artifact shows the retry tab). Then implement:
`VisualWindowStore` (tabs from the server session, `open` appends+selects, `close(id:)` only,
`select` only changes the id, renderer state written back via `state`), `VisualWindowHost` (sheet
with medium/large detents on iPhone; column ≥ 768pt on iPad), `VisualWindowTabBar` (chips with
close, matching the design's file strip), `ArtifactRenderer` dispatch, `PDFArtifactView` (PDFKit),
`QuickLookArtifactView` (QL for genericFile/document/deck), `VideoArtifactView` (AVKit; YouTube
via a `WKWebView` embed of the IFrame API), `WebArtifactView` (sandboxed WKWebView; Interact toggle;
desktop/mobile viewport toggle → `state.siteViewport`), photo (`AsyncImage`/`UIImage`), code (a
monospaced text view with line numbers from the file; line pins), recoverable-error tab. Replace the
`previewFile` sheet model in `ChatView`/`FilePreviewView`/`RootView`/`CornerApp` with the store
(file cards in the thread call `open`). Gate per plan Step 6 (iPhone 17 Pro + iPad Pro 13-inch
(M5)); commit per Step 7 (`feat(corner:corner-v2): add durable native Visual Window tabs`).

## Task 8 (plan Steps 1-6) + P022 + P023

Failing tests first: `CornerTests/ReviewStoreTests.swift` (plan's test + `max four pins per
artifact version`, `ids map from clientId to server id after submit`), UI: add a pin on the PDF at a
point, one on the video at a time, blank note does not send, "Send 2 changes" submits once, peek
shows the count, "Nothing to change, carry on" sends the plain text. Then implement `ReviewStore`
(checklist-only, anchors per renderer, ≤ 4 with a toast), `ReviewPanelView` (notes + Send; half/full
via the handle per HANDOFF §4), `ChatView` composer per P023 (50px pill with Record chip inside +
50px round send; 60px artifact peek bar above it with the active tab's thumbnail and change count,
tapping opens the sheet), and P022 (nav: mission → project name as the 12.5px line above the
title; project → title only). Gate per plan Step 5; commit per Step 6
(`feat(corner:corner-v2): add Corner v2 native review checklist`). Update P022/P023 rows in
`punch-list.md` with evidence paths.

Evidence: `rounds/evidence/R15-native-<step>.png` on iPhone 17 Pro (tabs, sheet half, sheet full
with pins, peek bar, review send) and iPad (column beside chat).

## Report `rounds/R15-native-visual-window.md`

Per task: failing then passing runs on both devices, gate lines, the plan-vs-backend table,
evidence, deviations, what Tasks 9-10 need.

## Hard rules

Never edit outside `ios-native/`. Never push. One xcodebuild at a time. Never use Karen's account
or `neat-pony-216`. Never model the Visual Window as one mutable preview file. Never let any action
close or replace a tab other than the one acted on. Never add an approval button. Never `git add -A`.
