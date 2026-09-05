# R1-ios-fix — sign-in CPU + scrim shipped (P005, P031); P006, P007 wired pending tour

Date: 2026-09-05 (~12:30 PM Phoenix). Worker headless, repo `AOM-EA/aom-studio` on `main`.
Brief: R1-ios-fix (P005, P031, P006, P007). Gate behaviour from R0b unchanged.

## Verdict

P005 and P031 are fixed and proven with frames + numbers below. P006 and P007 are
wired, build green, unit tests green — but proving them needs a signed-in tour
(frame `16-review` / `20-background-work`), so both are `fixed-pending-tour (R1)`.

## P005 — sign-in CPU 56% -> ~12-15% (target met)

**Cause.** Every frame redrew ~1500 live `Text` views on the main thread
(`TimelineView(.animation)` = every display refresh), and `sample` showed each
draw re-running CoreText typesetting + software raster through RenderBox
(`ResolvedStyledText.StringDrawing` -> `__NSStringDrawingEngine` ->
`TLine::DrawGlyphs`, ~2050 weight on the main thread in 5 s). The ember path
additionally re-resolved its `Text` per gold cell per frame.

**Change** (`ios-native/Corner/Views/ASCIIBackground.swift`,
`ios-native/Corner/Views/SignInView.swift`):
- `TimelineView(.periodic(from: .now, by: 1/12))` (ASCIIBackground.swift:121,142)
  instead of `.animation`. 12 fps moves the fastest noise term 0.3 cells/frame —
  the drift still visibly flows.
- `GlyphAtlas` (ASCIIBackground.swift:35): each ramp glyph rasterized ONCE per
  tint (CoreGraphics, 13pt semibold SF Mono to mirror the SwiftUI font) and
  cached process-wide keyed by ember color; frames are image blits. Same
  typeface/size, same cell origins, same opacities. Plain CoreGraphics (not
  `ImageRenderer`) so there are no actor-isolation requirements.
- Dropped `.drawingGroup()` (ASCIIBackground.swift:147): with cheap blits the
  per-frame off-screen flatten cost more than it saved.
- Mesh blobs 30 -> 15 fps (`SignInView.swift:279`, orbits are ~0.1 Hz —
  visually identical); both backgrounds render a static frame when
  `scenePhase != .active` or `accessibilityReduceMotion` is on
  (ASCIIBackground.swift:129, SignInView.swift:258). Mesh deliberately still
  animates under `-screenTour` (R0b's verified behaviour kept).
- Deliberately NOT done: skipping unchanged cells (wrong for `Canvas` — it has
  no retained backing, a skipped cell would go blank, not stay).

**Verified.** iPhone 17 Pro simulator, app at rest on the sign-in screen, no
`-screenTour` flag, settled 45 s+ (R0b's exact `top`/`sample` method):
- Before: `ps` 55.6%, `top` 61.3%; 5 s `sample` ~2050 main-thread weight in
  `drawField` (full CoreText per cell per frame).
- After (final build): `top -l 8` settled readings
  `7.5, 12.4, 11.6, 14.8, 14.5, 14.0, 14.8` — all <= 15% (max 14.8).
  5 s `sample`: `drawField` weight 2051 -> 255, main thread mostly parked in
  `mach_msg`. Raw samples: `/tmp/sample-before.txt`, `/tmp/sample-after3.txt`
  (scratch, not committed). Host load swung 7-18 during the session, so the
  honest reading is a settled band of ~8-15%, max observed 14.8.
- `00-signin-empty` from the tour run below still shows the full field
  (ramp, gather, embers) — the atlas blits reproduce the old look.
- Unit tests: `xcodebuild test ... -only-testing:CornerTests` — **308 passed,
  0 failures**.

## P031 — scrim behind the form (fixed)

**Cause.** Labels, fields, and the error strip sat directly on the live glyph
field, densest exactly behind the form.

**Change** (`SignInView.swift:96-114`): the form column gets `Theme.s4` padding
and a background of two rounded rectangles (radius 22) — a blurred twin
(padded -10, blur 18) feathering the edge plus a solid `bg.opacity(0.8)` core
over the already-dimmed centre. Wordmark and INVITE ONLY styling untouched;
field fully visible above and below.

**Verified.** Opened all three sign-in frames on both devices:
- 17 Pro `00`: form sits on a calm dark rounded panel with a soft feathered
  edge; the glyph field flows visibly above and below it.
- 17 Pro `01c`: the red error strip reads on the clean surface, email retained.
- SE `00` / `01c` / `01`: same; the error strip wraps to two lines on the
  320 pt screen but stays fully readable on the scrim.
- Evidence: `ios-native/deliverables/screen-tour/20260905-122414/iphone-17-pro/00-signin-empty.png`,
  `.../01c-signin-rejected.png`, and
  `ios-native/deliverables/screen-tour/20260905-122826/iphone-se-3rd-generation/00-signin-empty.png`,
  `.../01-signin-filled.png`, `.../01c-signin-rejected.png`.

## P006 — waiting row wired (fixed-pending-tour)

`RoomListView.swift:651`: `if review.waitingCount > 0 { waitingRow }` at the
top of the Tools section (mirrors the `emailRow` gating idiom: render only when
meaningful, so a permanent zero never becomes ignored furniture). `waitingRow`
itself (`:668`, identifier `waiting-card`) untouched. Build green. Needs a
signed-in tour: frame `16-review` must show the row when the queue is non-empty
and hide it when empty.

## P007 — Background Work Done button (fixed-pending-tour)

`BackgroundWorkView.swift:291,312-316`: `@Environment(\.dismiss)` plus a
`.toolbar { ToolbarItem(.topBarTrailing) { Button("Done") { dismiss() } } }` —
the exact pattern from `NotificationsView.swift:108-112` and
`AccountView.swift:103-107`. Build green. Needs a signed-in tour: frame
`20-background-work` must show Done.

## Tour runs (this round)

`scripts/screenshot-tour.sh "iPhone 17 Pro"` ->
`ios-native/deliverables/screen-tour/20260905-122414/` (3 frames, manual path,
`launch_to_signin_ms=34549`, `signin_tap_to_reject_ms=22280`, inline rejection
shown, 23 MISSING for `credentials` — same wall as R0b, `.tour.env` untouched).
`scripts/screenshot-tour.sh "iPhone SE (3rd generation)"` ->
`ios-native/deliverables/screen-tour/20260905-122826/` (same 3 + same tail).
`test exit 65` on every leg is the designed credentials-stop XCTFail. No
password printed or written anywhere; no message/room/password touched.

## Off-list touches

None in app code. `xcodegen generate` re-ran before the build; `Corner.xcodeproj`
has no diff (no project change needed).

## New bar-fails seen in the frames (one line each)

- 17 Pro `01`: with a field focused the form rides up and the lower half goes
  near-empty (the bottom field mask eats the glyphs there) — carried over from
  R0b's ride-up note, still true with the scrim.
- SE `01c`: the tour email at 16 pt spans nearly the full scrim width — fits,
  but a longer real address would touch the feathered edge.
- 17 Pro `00`: the password prompt dots still read as a pre-filled password at
  a glance (R0b note, unchanged).
- SE `01`: INVITE ONLY sits tight under the scrim's bottom edge where the
  feather meets the field — legible, but the gap is smaller than on 17 Pro.
