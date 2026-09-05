# Brief R0b-ios — unblock the screen tour: the app's main thread never idles under XCUITest

Mission path: `corner:corner-smooth-loop`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-smooth-loop/`
Read `LOOP.md`, then `briefs/R0-ios.md` (the original brief; everything in it still applies), then
`rounds/R0-ios.md` if it exists (the previous worker's report). Write your report to `rounds/R0b-ios.md`.

You are a headless worker. Nobody will answer questions.

## What is already there (from R0-ios; verify, do not redo)

- `ios-native/CornerUITests/ScreenTour.swift` (the tour), `ios-native/scripts/screenshot-tour.sh`
  (the 3-device runner), 13 `.accessibilityIdentifier(...)` additions in `Corner/Views/*.swift`,
  `Corner.xcodeproj` regenerated. Check `git status` and `git log -3` in
  `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio` to see what is committed vs. still dirty.
- Output attempts under `ios-native/deliverables/screen-tour/2026*/`. None produced frames.

## The blocker, precisely

Every run dies with XCTest error code 6:
`Unable to perform work on main run loop, process main thread busy for 30.0s` (and earlier
`Timed out while evaluating UI query`). XCUITest takes an accessibility snapshot on the app's main
thread; if that thread never idles, no query can succeed, including `waitForExistence`.

Cause in the app: `Corner/Views/ASCIIBackground.swift:37-38` is `TimelineView(.animation) { Canvas … }`,
a full-screen canvas redrawn every frame on the sign-in screen (thousands of glyphs per frame on a
simulator without GPU acceleration). Plus `repeatForever` pulses: `SignInView.swift:310` (PulsingDot),
and per the audit also in HomeComposerView, RoomListView and ChatView (grep `repeatForever`). The
canvas is the one that saturates the thread; the pulses keep it from ever being idle.

The app already has UI-test hooks: `Corner/CornerApp.swift:67` signs in automatically when
`AUTO_SIGNIN_EMAIL` / `AUTO_SIGNIN_PASSWORD` are in the launch environment, and
`Corner/Config.swift:100-102` suppresses live backends under tests unless `UITEST_REAL_BACKEND=1`.

## What to change (scope for this round, nothing more)

1. **One launch-argument gate in the app.** Add to `Corner/Config.swift`:
   `static let screenTour = ProcessInfo.processInfo.arguments.contains("-screenTour")`.
   Use it in exactly these places:
   - `ASCIIBackground`: when `Config.screenTour`, render ONE static frame (no `TimelineView`; draw the
     canvas once with a fixed time value) so the sign-in screen still looks right in the photo.
   - Every `repeatForever` animation (SignIn PulsingDot, HomeComposer, RoomList, Chat): when
     `Config.screenTour`, do not start the animation (static end state).
   No other behaviour changes. Real users never pass the argument.
2. **The tour launches with the gate and the real backend:**
   `app.launchArguments += ["-screenTour"]`, `app.launchEnvironment["UITEST_REAL_BACKEND"] = "1"`.
   Keep the manual sign-in path (typing into the fields) as the primary path so the tour photographs
   the real sign-in screen; if element queries on the sign-in screen still time out even with the gate,
   fall back to: capture `00-signin-empty` with a raw `XCUIScreen.main.screenshot()` (no element query
   needed), then relaunch with `AUTO_SIGNIN_EMAIL`/`AUTO_SIGNIN_PASSWORD` in `launchEnvironment` and
   continue from the home screen. Say in the report which path ran.
3. **Terminate, do not reuse:** `app.terminate()` before any relaunch; the Keychain session persists,
   which is fine (the tour's auth branch handles a surviving session).

## Credentials status: KNOWN BAD. Do not spend attempts on sign-in.

The orchestrator verified directly against `neat-pony-216` that BOTH test accounts in
`ScreenshotCapture.swift` return `InvalidSecret`. Patrik has been asked for a working tour account.
Until `.tour.env` changes, the tour cannot get past the sign-in screen. So this round proves the gate:

- With `-screenTour`, element queries on the sign-in screen must succeed (`app.textFields.firstMatch`
  within 10 s, no "main thread busy" error). Photograph `00-signin-empty` and `01-signin-filled` via
  real element interaction, and record the launch-to-sign-in-screen timing.
- Then tap "Sign in" ONCE, wait up to 20 s, and photograph whatever appears as `01c-signin-rejected`
  (expected: the inline "did not match" error). This frame is the evidence for the credential blocker
  and also a real screen worth reviewing.
- Stop there. Mark every later frame MISSING with reason `credentials`. Do not retry sign-in, do not
  try other passwords, do not touch the backend.
- Also `sample` the app process for 5 s on the sign-in screen with and without `-screenTour` and put
  both CPU percentages in the report (the R0 worker measured ~57% without the gate).

## Then finish what can be finished

- `xcodegen generate`, build-for-testing on iPhone 17 Pro, run the script on iPhone 17 Pro, open every
  PNG produced and check it is a real frame. Then run all three devices in one script call.
- Report `rounds/R0b-ios.md`: exact xcodebuild invocation, per device the frame list and MISSING steps,
  timing numbers, which sign-in path ran, every app source line you changed (file:line) with the gate,
  and the first-impressions list (one line per thing that looks wrong or unfinished in the frames).
- Update `BUILD.md` (R0b block, status) and `last-conversation.md`.
- Commit on `main` with only: `ios-native/CornerUITests/ScreenTour.swift`,
  `ios-native/scripts/screenshot-tour.sh`, `ios-native/Corner.xcodeproj`, the `ios-native/Corner/**.swift`
  files you touched, and `corner/missions/corner-smooth-loop/`. Message:
  `feat(corner:corner-smooth-loop): R0b native screen tour runs — -screenTour gate on ambient animation`.
  Never push, never `git add -A`, never commit `.tour.env`, `build/` or `deliverables/`.

## Hard rules (unchanged)

Never send a message, create a real room, delete, or change a password. Never print or write the
password. Never edit `ScreenshotCapture.swift`, `SharedBackendAcceptance.swift`, or anything outside
`ios-native/` and the mission folder. A MISSING frame is a valid result; do not loosen steps to pass.
