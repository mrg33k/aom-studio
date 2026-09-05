# Brief R2-ios — tour reaches every screen (P037) + home/room/error fixes (P033, P034, P035, P036)

Mission path: `corner:corner-smooth-loop`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-smooth-loop/`
Read `LOOP.md`, then `punch-list.md` (rows P033–P037 are yours; P006/P007 are `fixed-pending-tour` and
your tour run will prove them), then `rounds/R1-ios-fix.md`. Write your report to `rounds/R2-ios.md`.

You are a headless worker, the BUILDER. Nobody will answer questions.

## Where things are

- Repo: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio` (git, `main`, pushed). Work on `main`.
  Commit with pathspecs (`git commit -m "…" -- <paths>`), never `git add -A`. Never push. Never commit
  `.tour.env`, `build/`, `deliverables/`.
- App: `ios-native/Corner/`. Tour: `ios-native/CornerUITests/ScreenTour.swift`; runner
  `ios-native/scripts/screenshot-tour.sh [device …]`. `.tour.env` now holds a WORKING account (Patrik's, a
  temporary password): sign-in succeeds, the tour reaches home. Never print it.
- Latest evidence: `ios-native/deliverables/screen-tour/20260905-124320/iphone-se-3rd-generation/first-attempt/`
  (18 frames captured, 7 MISSING) and the exported set at `/tmp/se-first.76Gt/named/` if it still exists.
- The REST backend (`https://www.aheadofmarket.com/api/*`) is currently DOWN with `402 Payment required`
  (Vercel billing, outside your scope). Review, Files, Tracker and Email will show their error state; that
  is expected and is exactly what P034 is about. Convex-backed screens (home, rooms, chat) work.
- Simulators: `iPhone 17 Pro`, `iPhone SE (3rd generation)`, `iPad Pro 13-inch (M5)`.

## Items, in this order

**P037 Tour reaches every screen** (`ScreenTour.swift`, `screenshot-tour.sh`). Facts from the SE run:
- `08-room`: `room-row` not found because the list had been scrolled to the bottom (04) and the top rows
  are unrendered in the lazy list. Fix: scroll back to the top (swipe down or `scrollToTop`) and wait for
  the first `room-row` before tapping; or tap any currently visible `room-row`.
- `14-files`, `15-tracker`: Files and Tracker live in the top-right menu (identifier `home-menu` ->
  items "Files", "Tracker"), not in the list. Open the menu and tap the item. Same menu holds
  "Notifications", "Background work", "Theme: …", "Settings".
- `16-review`: the waiting card only shows when the review queue is non-empty (P006). Capture the Tools
  area anyway as `16-review` and mark `16-review-EMPTY` (not MISSING) when the card is absent; if present,
  tap it. With the backend down it may also show an error state; capture whatever is there.
- `17-email`: the Email card is the first card on home ("Email", subtitle "You're all caught up"),
  identifier `email-card` on the button. Scroll to top first, then tap it.
- `21-theme-light`: open the menu, tap "Theme: …" and pick Light explicitly (read `RoomListView.swift`
  for how the theme menu is built); capture home; then restore the original theme name you read in 06.
- Runner: retry with the AUTO_SIGNIN path ONLY when `02-home` was never captured. MISSING frames are a
  result, not a failure; exit code stays 0 when frames were produced. Also fix the SE status bar: apply
  `xcrun simctl status_bar … override` after the device reports booted and again right before the test
  (the SE run still showed "Carrier").
- After the fix, run on `iPhone 17 Pro` first and confirm 00–22 all exist (or `-EMPTY`), then all three.

**P036! "+ New" chip clipped on iPhone SE** (`RoomListView.swift:352-406`). Make the filter chip row
horizontally scrollable with an edge fade and pin "+ New" outside the scrolling row so it is always fully
visible on 320 pt. Evidence: `02-home` on SE and 17 Pro.

**P033 Composer placeholder truncates** (`HomeComposerView.swift`, placeholder string). Shorten to
"Type a task or a question" (or size it to fit); never ellipsize a placeholder. Evidence: `02-home` on
SE.

**P034! Raw JSON error in four layouts** (`ReviewQueueView.swift`, `OrganizeView.swift`,
`TrackerView.swift`, `EmailView.swift`, `RoomListView.swift` settings "Workspace rooms did not load",
`Services/CornerAPI.swift`). Build ONE `OfflineStateView` (icon, one plain sentence, "Try again") and use
it on all five; map `APIError` to plain sentences ("Corner can't reach the server right now." for 5xx /
402 / timeouts, "You need to sign in again." for 401, otherwise "Something went wrong."). Never render a
raw JSON string. Email hides the auto-reply status card while the inbox is unavailable. Evidence: frames
14–17 with the backend down (it is, today).

**P035 Room opens short then jumps** (`ChatView.swift` initial scroll / composer inset, `ScrollBrain`).
Account for the composer height in the thread's bottom inset before the first scroll so the initial
position is already correct. Evidence: `08-room` captured at 1 s and again at 5 s must be identical in
scroll position (add the second capture as `08b-room-settled` and compare programmatically: same
bottom-most bubble frame).

For each item update `punch-list.md`: `fixed (R2)` + `evidence: <absolute png path>`. P006 and P007:
if their frames now prove them, flip to `fixed (R2)` with evidence; if not, say what you saw.

## Steps

1. Read the files named above and the SE first-attempt log:
   `…/20260905-124320/iphone-se-3rd-generation/first-attempt/iphone-se-3rd-generation.build.log`.
2. P037 first. Build (`xcodegen generate && xcodebuild build-for-testing … -derivedDataPath build/tour`),
   run on iPhone 17 Pro, open every frame, fix until 00–22 exist.
3. Then P036, P033, P034, P035. Unit tests must stay green (`-only-testing:CornerTests`, ~308).
4. Final: `scripts/screenshot-tour.sh` with all three devices. Open every frame on every device.
5. Update `BUILD.md` (R2-ios block) and `last-conversation.md`.
6. Commit on `main` with pathspecs: the Swift files you touched, `ios-native/Corner.xcodeproj` if
   regenerated, `ios-native/scripts/screenshot-tour.sh`, `corner/missions/corner-smooth-loop/`. Message:
   `fix(corner:corner-smooth-loop): R2 iOS tour reaches every screen; P033 P034 P035 P036`. Never push.

## Report `rounds/R2-ios.md`

Per item: cause, change (file:line), evidence path. Per device: frame list, `-EMPTY`/MISSING with reason,
timing numbers. Unit-test count. First-impressions list for every frame you opened that still fails the
bar (one line each, no fixes): this feeds R3.

## Hard rules

Never send a message, create a real room, delete, or change a password. Never print or write the
password. Never edit `ScreenshotCapture.swift`, `SharedBackendAcceptance.swift`, or anything outside
`ios-native/` and the mission folder. Never `git add -A`, never push. Shut down simulators you booted.
