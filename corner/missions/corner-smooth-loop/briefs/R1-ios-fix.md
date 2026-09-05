# Brief R1-ios-fix — sign-in screen for real users (P005, P031) plus P006, P007

Mission path: `corner:corner-smooth-loop`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-smooth-loop/`
Read `LOOP.md`, then `punch-list.md` (rows P005, P006, P007, P031 are yours), then `rounds/R0b-ios.md`
(the gate, the CPU numbers, the run-of-record frames). Write your report to `rounds/R1-ios-fix.md`.

You are a headless worker, the BUILDER. Nobody will answer questions.

## Where things are

- Repo: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio` (git, `main`, pushed at `c2bc09d6`).
  Work on `main`. Stage only what you changed plus the mission folder (never `git add -A`/`.`). Never
  push. Never commit `.tour.env`, `build/`, `deliverables/`.
- App: `ios-native/Corner/`. Tour: `ios-native/CornerUITests/ScreenTour.swift`; runner
  `ios-native/scripts/screenshot-tour.sh "<device name>"` (builds, runs, exports frames to
  `ios-native/deliverables/screen-tour/<stamp>/<slug>/`). The tour currently stops at the sign-in
  rejection because `.tour.env` holds a rejected password; that is expected and NOT yours to fix. Frames
  `00-signin-empty`, `01-signin-filled`, `01c-signin-rejected` are still produced on every run, which is
  enough to verify P005 and P031.
- Simulators: `iPhone 17 Pro`, `iPhone SE (3rd generation)`, `iPad Pro 13-inch (M5)`. Use
  `xcrun simctl` and `sample <pid> 5` / `top -pid <pid> -l 3` for CPU, exactly as R0b did.
- Run-of-record frames to compare against: `ios-native/deliverables/screen-tour/20260905-114750/`.

## Items

**P005! Sign-in screen burns ~56% CPU for real users** (`Corner/Views/ASCIIBackground.swift`,
`TimelineView(.animation)` + a `Canvas` drawing ~1500 glyphs per frame; plus `MeshBlobBackground` at
30 fps in `SignInView.swift:249`). Target: the app at rest on the sign-in screen (no `-screenTour` flag)
sits at **15% CPU or less** on the iPhone 17 Pro simulator, and the field still visibly flows (this is a
brand element; do not remove it, do not make it look choppy). Approaches, combine as needed:
`TimelineView(.periodic(from: .now, by: 1.0/20))` or `.animation(minimumInterval:)` to cap the frame
rate; resolve the ramp glyphs once (cache `GraphicsContext.ResolvedText` per character outside the
per-cell loop); skip drawing cells whose level did not change between frames only if that stays simple;
`.drawingGroup()` on the canvas; pause both backgrounds when the scene is not `.active`
(`scenePhase`); honour `accessibilityReduceMotion` by rendering the static frame. Prove it: `sample`
and `top` before/after on the sign-in screen, numbers in the report, and the `00-signin-empty` frame
from a tour run must still show the field.

**P031! Glyph field runs through the form** (`SignInView.swift` form column; `ASCIIBackground.swift`
centre scrim / gather bias). Put a soft opaque scrim behind the form column (blur material or ~80%
ground with a feathered edge) so EMAIL/PASSWORD labels, the fields, and the red error strip sit on a
clean surface, while the field stays visible above and below the form. Keep the wordmark and INVITE ONLY
as they are. Prove it: `00-signin-empty` and `01c-signin-rejected` from a tour run on iPhone 17 Pro and
iPhone SE (3rd generation); open them and describe what the scrim looks like.

**P006 "Waiting on you" row never inserted** (`RoomListView.swift:663` `waitingRow`). Wire it into the
Tools section (or wherever the design places it; read how `emailCard` is inserted and mirror that) so it
appears when the review queue is non-empty and hides when empty. The identifier `waiting-card` already
exists. Verification needs a signed-in tour (frame `16-review`); write the code, build it, and mark the
row `fixed-pending-tour (R1)` with the file:line.

**P007 Background Work sheet has no Done button** (`BackgroundWorkView.swift`). Add a toolbar Done
button like the other sheets (see `NotificationsView.swift` / `AccountView.swift` for the pattern).
Same verification note as P006: `fixed-pending-tour (R1)`.

For P005/P031 update the rows in `punch-list.md` to `fixed (R1)` + `evidence: <absolute png path>`.

## Steps

1. Read the four files above and `rounds/R0b-ios.md`. Do P005 first.
2. Build: `cd ios-native && xcodegen generate && xcodebuild build-for-testing -project Corner.xcodeproj
   -scheme Corner -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath build/tour`.
   Fix compile errors. Unit tests: `xcodebuild test -project Corner.xcodeproj -scheme Corner -destination
   'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:CornerTests -derivedDataPath build/tour`
   must stay green (there are ~300 tests; report the pass count).
3. Measure P005 before/after as described. Then run `scripts/screenshot-tour.sh "iPhone 17 Pro"` and
   `scripts/screenshot-tour.sh "iPhone SE (3rd generation)"`, open the three sign-in frames per device.
4. Update `BUILD.md` (R1-ios block) and `last-conversation.md`.
5. Commit on `main`: the `ios-native/Corner/**.swift` files you touched, `ios-native/Corner.xcodeproj`
   if regenerated, and `corner/missions/corner-smooth-loop/`. Message:
   `fix(corner:corner-smooth-loop): R1 iOS P005 P031 sign-in CPU + scrim; P006 P007 wired`. Never push.

## Report `rounds/R1-ios-fix.md`

Per item: cause, change (file:line), how verified, evidence path. CPU before/after numbers. Unit-test
pass count. Anything touched off-list and why. New bar-fails you saw in the frames (one line each).

## Hard rules

Never send a message, create a room, delete, or change a password. Never print or write the password.
Never edit `ScreenshotCapture.swift`, `SharedBackendAcceptance.swift`, or anything outside `ios-native/`
and the mission folder. Never `git add -A`, never push. Shut down simulators you booted.
