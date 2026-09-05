# Brief R0-ios — build the native screen tour and run it on three simulators

Mission path: `corner:corner-smooth-loop`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-smooth-loop/`
Read `LOOP.md` in that folder first (2 minutes). It is the contract for this work.

You are a headless worker. Nobody will answer questions. If you hit a hard blocker, write it in your
report (see step 8) and stop. Do not guess at a mission, it is the one above. Do not invent scope.

## Where things are

- Repo: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio` (git, branch `main`). Work directly on
  `main` in this shared checkout. Do NOT create a branch or worktree. Other people's uncommitted files exist
  in this checkout; never stage them (never `git add -A`, never `git add .`; only add the exact paths listed
  in step 9).
- Native app: `ios-native/` inside that repo. Xcode 26.3 is installed. `xcodegen` is at `/opt/homebrew/bin/xcodegen`.
  Spec: `ios-native/project.yml`. Project: `ios-native/Corner.xcodeproj` (committed; regenerate with
  `cd ios-native && xcodegen generate` after adding a source file, and commit the regenerated project).
- App sources: `ios-native/Corner/` (SwiftUI). Screens: `Views/SignInView.swift`, `Views/SetPasswordView.swift`,
  `Views/RootView.swift` (gate: SignIn -> SetPassword -> NavigationStack with `RoomListView` root; routes
  `.room / .review / .organize / .tracker / .email` in `Services/AppRouter.swift`), `Views/RoomListView.swift`
  (home: search chip, "New room" button, sections Agents / Projects / Recent / Email / Tools, a Menu with
  "Files", "Tracker", "Theme: …", "Settings"; sheets for settings, notifications, new room, voice, background
  work), `Views/ChatView.swift` (a room), `Views/ReviewQueueView.swift`, `Views/OrganizeView.swift`,
  `Views/TrackerView.swift`, `Views/EmailView.swift`, `Views/AccountView.swift`, `Views/NotificationsView.swift`,
  `Views/NewRoomSheet.swift`, `Views/RoomFilesView.swift`, `Views/RoomSettingsView.swift`,
  `Views/BackgroundWorkView.swift`, `Views/SessionHistoryView.swift`, `Views/IntegrationsView.swift`.
- Existing accessibility identifiers (only five in the whole app): `room-list-screen`, `room-row`,
  `chat-screen`, `chat-composer`, `send`. Existing accessibility labels you can use: "New room",
  "Corner", "Settings", "Files", "Tracker", "Email, N need you", "Close", "Clear and close search",
  "Start Corner Voice conversation". Read `RoomListView.swift` and `ChatView.swift` to find the rest.
- Existing UI tests to copy patterns from (do not modify them): `ios-native/CornerUITests/ScreenshotCapture.swift`
  (sign-in flow: `app.textFields.firstMatch`, `app.secureTextFields.firstMatch`, button "Sign in", an
  interruption monitor for system alerts) and `ios-native/CornerUITests/SharedBackendAcceptance.swift`
  (reads credentials from the environment).
- A PROVEN simulator build recipe: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/scripts/grade-ios-simulator.sh`
  (uses `xcodebuild build-for-testing` then `test-without-building` with `-derivedDataPath`, and
  `xcrun xcresulttool export attachments --path <xcresult> --output-path <dir>` to pull the PNGs out).
  Read it and reuse its flags. The app target uses manual signing for devices; simulator builds need the
  signing overrides that script uses (or `CODE_SIGNING_ALLOWED=NO`), find what works and keep it.
- Simulators (all iOS 26.3, all currently shut down):
  - `iPhone 17 Pro` udid `971E7446-394B-4EF6-9796-8D9D1F916994`
  - `iPhone SE (3rd generation)` udid `8E53D49F-0780-45E4-A84F-E1F4F0DD075C`
  - `iPad Pro 13-inch (M5)` udid `3BFA26A5-004C-48AE-B994-1062CF4CE8B6`
  Resolve by name at runtime with `xcrun simctl list devices available -j` so the script works on another Mac.
- Credentials: `ios-native/.tour.env` (untracked, gitignored) contains `TOUR_EMAIL=…` and `TOUR_PASSWORD=…`
  for a demo account. Never print the password anywhere (no echo, no report, no commit). The app signs in
  against the REAL backend (Convex deployment neat-pony-216), so the tour must never send a message, never
  create a room, never delete anything, never change account settings. Typing into the composer without
  sending is fine. Opening a "New room" sheet and cancelling is fine. Switching theme is fine only if you
  switch it back at the end.

## Deliverables

### 1. `ios-native/CornerUITests/ScreenTour.swift`

An `XCTestCase` named `ScreenTour` with one test `testTour()`. Requirements:

- `continueAfterFailure = true`. Install an interruption monitor like `ScreenshotCapture.swift` does
  (Allow/Don't Allow/OK/Not Now) so the notifications permission alert never stalls the run.
- Read `TOUR_EMAIL` and `TOUR_PASSWORD` from `ProcessInfo.processInfo.environment`. If either is empty,
  `XCTFail` with a plain message and return. (xcodebuild passes them when the shell exports them prefixed
  `TEST_RUNNER_TOUR_EMAIL` / `TEST_RUNNER_TOUR_PASSWORD`; the prefix is stripped in the runner.)
- Launch the app. Then branch: if `room-list-screen` appears within 15 s, the Keychain session survived and
  sign-in is skipped; note that in the timing attachment. Otherwise wait for the sign-in screen, capture it,
  fill both fields, capture, tap "Sign in", wait up to 90 s for `room-list-screen`. If a "Set password"
  screen shows instead, capture it as `01b-set-password` and `XCTFail("account needs a password; tour cannot
  continue")` and return; do not set one.
- Measure and attach timing: milliseconds from `app.launch()` to the sign-in screen, and from tapping
  "Sign in" to `room-list-screen` existing. Put them in a text attachment named `timing` (also print with
  `NSLog` so they appear in the xcodebuild log).
- Capture helper: `XCUIScreen.main.screenshot()` -> `XCTAttachment`, `lifetime = .keepAlways`, name is the
  frame name below. Frame names are `NN-slug` so they sort.
- Every step is guarded: `waitForExistence(timeout:)` on the element you are about to use. If it is not
  there, capture `NN-slug-MISSING` and `XCTFail("<step>: <element> not found")` and CONTINUE with the next
  step. A missing element is a finding, not a reason to abort.
- Frames to capture, in this order (adapt names if a screen does not exist; do not skip silently):
  00-signin-empty, 01-signin-filled, 02-home (settle 2 s after it exists), 03-home-scrolled (scroll once so
  Projects/Recent/Tools show), 04-home-bottom (scroll to the end: Email card, Tools), 05-search-open (tap the
  search chip, type "a", capture, then clear/close), 06-menu-open (open the Menu that holds Files/Tracker/
  Theme/Settings, capture, dismiss), 07-new-room-sheet (tap "New room", capture, cancel/close it), 08-room
  (tap the first `room-row`, wait for `chat-screen`, settle 3 s), 09-room-scrolled-up (scroll the thread up
  once), 10-room-keyboard (tap `chat-composer`, keyboard visible), 11-room-typed (type "tour draft, not
  sent", capture, then clear the field and dismiss the keyboard; NEVER tap `send`), 12-room-toolbar (open
  whatever the room's toolbar/menu offers: files, settings, history; capture each as 12a/12b/12c and close),
  13-back-home (native back to the room list), 14-files (open Files/Organize via the Tools section or the
  menu), 15-tracker, 16-review (the "waiting"/review card under Tools), 17-email, 18-settings-sheet (menu ->
  Settings; capture; close), 19-notifications-sheet (find the bell/notifications entry on home; capture;
  close), 20-background-work (if there is an entry point; else record MISSING), 21-theme-light (menu ->
  Theme -> pick the light theme; capture home; then switch back to the original theme and capture
  22-theme-restored). On iPad the same sequence applies; do not special-case it.
- Do not use hard-coded normalized coordinates like `ScreenshotCapture.swift` does unless no element query
  works; if you must, say so in a code comment with the reason.
- You MAY add `.accessibilityIdentifier("…")` modifiers to views under `ios-native/Corner/Views/` to make
  the tour reliable (search chip, menu button, new-room button, tools cards, back button, settings sheet,
  notifications). That is the ONLY kind of change allowed in app sources this round. Keep identifiers
  kebab-case and list every one you add in the report.

### 2. `ios-native/scripts/screenshot-tour.sh`

Bash, executable. Usage: `scripts/screenshot-tour.sh [device name …]`; default devices are the three above.
Behaviour:
- `cd` to `ios-native` regardless of the caller's cwd (`cd "$(dirname "$0")/.."`).
- If `TOUR_EMAIL` or `TOUR_PASSWORD` is unset, source `.tour.env` if present; if still unset, exit 2 with a
  one-line message.
- `xcodegen generate` (quiet) so the project matches `project.yml`.
- Output root: `deliverables/screen-tour/<YYYYMMDD-HHMMSS>/`. Per device a slug folder
  (`iphone-17-pro`, `iphone-se-3rd-generation`, `ipad-pro-13-inch-m5`).
- Per device: resolve udid by exact name; boot if needed (`xcrun simctl boot`, then `xcrun simctl bootstatus
  <udid> -b`); `xcrun simctl ui <udid> appearance dark`; clean status bar (`xcrun simctl status_bar <udid>
  override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3`);
  `xcodebuild build-for-testing` once per device family is fine but simplest is once per device;
  then `xcodebuild test-without-building … -only-testing:CornerUITests/ScreenTour -resultBundlePath
  <out>/<slug>.xcresult` with `TEST_RUNNER_TOUR_EMAIL`/`TEST_RUNNER_TOUR_PASSWORD` exported. Use
  `-derivedDataPath build/tour` so it never collides with other builds. Pipe xcodebuild output to
  `<out>/<slug>.build.log`; never to the terminal in full.
- Export attachments from the xcresult into `<out>/<slug>/` and rename each PNG to its attachment name
  (`NN-slug.png`) using the export's `manifest.json`. Write `timing.txt` next to them from the `timing`
  attachment.
- Write `<out>/summary.md`: per device, the list of frames, the MISSING frames, the timing numbers, and the
  xcodebuild exit code. Print the summary path as the last line.
- Exit non-zero only if a build fails or no frames were produced for a device. Missing frames are reported,
  not fatal.
- Shut down the simulators you booted at the end (leave ones that were already booted alone).

### 3. Regenerated `ios-native/Corner.xcodeproj` (via xcodegen) so `ScreenTour.swift` is in the UI test target.

## Steps

1. Read `LOOP.md`, `ScreenshotCapture.swift`, `SharedBackendAcceptance.swift`, `grade-ios-simulator.sh`,
   `RootView.swift`, `RoomListView.swift`, `ChatView.swift`, `SignInView.swift`. Map the element queries you
   will use for each frame BEFORE writing the test.
2. Write `ScreenTour.swift`. Write `screenshot-tour.sh`. `chmod +x` it.
3. `cd ios-native && xcodegen generate`.
4. Compile check first: `xcodebuild build-for-testing` for iPhone 17 Pro. Fix compile errors in your file
   until it builds. Do not "fix" errors by deleting steps.
5. Run the script for `iPhone 17 Pro` only. Open every PNG you produced with your file viewer and confirm it
   is a real frame (not black, not the launch screen, not the same frame repeated). Fix the tour until the
   frames are right. Then run all three devices with one call of the script.
6. If sign-in fails (wrong password, network), report it exactly and stop; do not retry more than twice.
7. Update mission files: append an `R0-ios` block to `BUILD.md` (what shipped, status), one paragraph to
   `last-conversation.md`.
8. Write the report `rounds/R0-ios.md` in the mission folder: the exact xcodebuild invocation that worked;
   per device the output folder and the frame list; the MISSING steps; the timing numbers; every
   accessibility identifier you added (file:line); and a first-impressions list, one line per thing in the
   frames that looks wrong or unfinished (clipped text, overlaps, empty states, tiny type, wrong colours,
   anything you would not ship). No fixes this round, just the list.
9. Commit on `main` with ONLY these paths staged: `ios-native/CornerUITests/ScreenTour.swift`,
   `ios-native/scripts/screenshot-tour.sh`, `ios-native/Corner.xcodeproj`, `ios-native/.gitignore`, any
   `ios-native/Corner/Views/*.swift` you touched, and `corner/missions/corner-smooth-loop/`.
   Message: `feat(corner:corner-smooth-loop): R0 native screen tour — XCUITest + 3-device script`.
   Do NOT push. Do NOT commit `.tour.env`, `build/`, or `deliverables/`.

## Hard rules

- Never send a chat message, never create a room for real, never delete, never change a password.
- Never print or write the password. Never commit `.tour.env`.
- Never edit `ScreenshotCapture.swift`, `SharedBackendAcceptance.swift`, `project.yml` (unless the UI test
  target genuinely needs a setting; if so, say why in the report), or anything outside `ios-native/` and the
  mission folder.
- Never `git add -A`, never `git push`, never `git stash`, never switch branches.
- Do not loosen a step to make it pass; a MISSING frame is a valid result.
