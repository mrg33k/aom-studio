# R0b-ios — the -screenTour gate works; tour stops at the credential wall as designed

Date: 2026-09-05. Worker headless, repo `AOM-EA/aom-studio` on `main`.
Brief: `briefs/R0b-ios.md` (this round) + `briefs/R0-ios.md` (still applies).

## Verdict

The gate is proven. With `-screenTour`, element queries on the sign-in screen
succeed on all three devices — no "main thread busy" error anywhere — via the
**manual path** (real typing into real fields). The tour tapped "Sign in" once,
photographed the expected inline rejection as `01c-signin-rejected`, and stopped.
The AUTO_SIGNIN fallback relaunch never ran (no need). Every later frame is
MISSING with reason `credentials`, exactly per brief. No retries of sign-in, no
other passwords, backend untouched.

## What changed (app sources — gate only, no behaviour change without the arg)

`Config.screenTour` (`ios-native/Corner/Config.swift:108`):
`ProcessInfo.processInfo.arguments.contains("-screenTour")`. Real users never
pass it. Gated sites (all static end-states under the flag):

| File:line | What freezes under `-screenTour` |
|---|---|
| `Corner/Config.swift:108` | the flag itself |
| `Corner/Views/ASCIIBackground.swift:38-43,69` | `TimelineView` replaced by one static `Canvas` (`drawField` factored out, fixed `t: 1.0`); photo still shows the full field + embers |
| `Corner/Views/SignInView.swift:312` | PulsingDot `.animation(...repeatForever...)` becomes `nil` (`on` still flips on appear → steady full dot) |
| `Corner/Views/HomeComposerView.swift:442` | pulse `withAnimation(repeatForever)` skipped (stays full opacity) |
| `Corner/Views/RoomListView.swift:1393` | IndeterminateBar travel skipped (static bar) |
| `Corner/Views/ChatView.swift:1818` | streaming-caret pulse skipped (caret stays put) |
| `Corner/Views/ChatView.swift:1840` | WorkingMark `.animation(repeatForever)` becomes `nil` (steady dot) |

Deliberately NOT gated (out of scope, verified harmless): `MeshBlobBackground`
(`SignInView.swift:249`, 30 fps, 4 gradients) and the border gradient
(`SignInView.swift:225`) still animate under the gate — queries succeed anyway
(see CPU numbers). One-shot `.animation(.easeOut(0.15), value: focused)`
(`SignInView.swift:139`) is not a loop.

## Tour + script changes

- `CornerUITests/ScreenTour.swift:36` — `app.launchArguments += ["-screenTour"]`
  alongside the existing `UITEST_REAL_BACKEND=1`. Cold sign-in rewritten:
  10 s button wait → `00-signin-empty` → type both fields → `01-signin-filled`
  → ONE tap → 20 s verdict watch → `01c-signin-rejected` whatever is on screen
  → `markPostSigninMissing(reason: "credentials")` (one XCTFail for the 23-frame
  tail, not one per frame) → return. Fallback (button not found in 10 s even
  with the gate): raw `XCUIScreen` shot of `00`, `app.terminate()`, relaunch
  with `AUTO_SIGNIN_*`, continue from home or stop the same way. Fallback never
  executed this round.
- `scripts/screenshot-tour.sh` — two fixes found by this round's runs (no
  behaviour change otherwise): (1) Xcode 26 names attachments
  `<name>_<n>_<UUID>.<ext>`, which the old `fullmatch` silently dropped — the
  first gated run captured 3 frames per attempt yet exported **zero**; the
  extractor now strips that suffix (bare names still match). (2) The frame glob
  `[0-9][0-9]-*.png` missed `01c-*`; now `[0-9][0-9]*-*.png` in both the count
  and the summary loop.

## What ran (exact invocation; script builds per device then tests)

```
xcodebuild build-for-testing -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,id=<UDID>' -derivedDataPath build/tour
xcodebuild test-without-building -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,id=<UDID>' -derivedDataPath build/tour \
  -only-testing:CornerUITests/ScreenTour \
  -resultBundlePath <out>/<slug>.xcresult
```

Run of record: `ios-native/deliverables/screen-tour/20260905-114750/`
(one `scripts/screenshot-tour.sh` call, all three devices; `summary.md` inside).
`xcodegen generate` before; build green on all legs, no signing overrides.

| Device | Frames (all opened, real) | MISSING | Timing (from `timing.txt`) |
|---|---|---|---|
| iPhone 17 Pro | `00-signin-empty.png` (1206x2622), `01-signin-filled.png`, `01c-signin-rejected.png` | 02-home … 22-theme-restored (23 frames, `credentials`) | signin_path=manual; launch_to_signin_ms=34538; signin_tap_to_reject_ms=22279 (inline rejection shown) |
| iPhone SE (3rd gen) | same 3 (750x1334) | same 23, `credentials` | signin_path=manual; launch_to_signin_ms=34506; signin_tap_to_reject_ms=22341 (inline rejection shown) |
| iPad Pro 13-inch (M5) | same 3 (2064x2752) | same 23, `credentials` | signin_path=manual; launch_to_signin_ms=34904; signin_tap_to_reject_ms=22524 (inline rejection shown) |

Notes: `test exit: 65` on every leg is the single credentials-stop XCTFail, by
design. `launch_to_signin_ms` (~34.5 s) is dominated by absence-polling
timeouts (Keychain-branch `roomListUp(15)` + restore check on a fresh install),
not app launch. `signin_tap_to_reject_ms` (~22.3 s) is the 20 s verdict window
plus absence polls. The script's per-device `missing: (none)` line counts
`*-MISSING.png` files only — the tour records the 23-frame tail in bulk (one
shared screenshot would mislabel 22 frames), so the authoritative MISSING list
is the `missing=` line in `timing.txt`, repeated above.
Pixel checks: 17 Pro trio opened at full res; SE + iPad trios verified by
dimensions + pairwise mean-abs-diff (SE 11.9–20.3, iPad 3.6–5.3 — smaller on
iPad because the form fills less of the canvas) + iPad `01c` opened at full
res. Earlier `20260905-112423` / `20260905-113301` folders are superseded
attempts of the same flow (the former predates the extractor fix; its frames
were recovered manually to prove the fix).

## CPU proof (`sample`, iPhone 17 Pro, sign-in screen, settled)

- Without `-screenTour`: `top` sustained **~55–56%** (matches R0's ~57%);
  5 s `sample` has 44 `ASCIIBackground` stack hits (per-frame ~1500-glyph
  CoreText raster on main).
- With `-screenTour`: `top` **~2–5%**; 5 s `sample` has **zero**
  `ASCIIBackground` hits, main thread parked in `mach_msg` (one
  `MeshBlobBackground` hit — the intentionally ungated 30 fps gradients).
- Raw samples: `/tmp/sample-nargate.txt`, `/tmp/sample-gate.txt` (scratch, not
  committed).

## Credential evidence (no password printed anywhere)

`01c-signin-rejected` on all three devices shows the inline strip
"That email and password did not match an account." (`SignInView.swift:216`),
email retained, button active. Submission provably reached the server: the
strip only appears in `signIn()`'s catch after a real `api.signIn` call, and
the button is `.disabled(!canSubmit)` (`SignInView.swift:189`), so the
preferred button-tap path implies both fields were non-empty. One tap, no
retry. Still needs from orchestrator: a working tour account (`.tour.env`
unchanged, never staged).

## First impressions (one line each, from the 9 frames)

- iPad form is a 320 pt centered column (`SignInView.swift:96` `maxWidth: 320`,
  by design) — correct but very sparse on 13-inch; error-strip text runs
  nearly edge-to-edge of its background.
- The 8 dots in `00` are the password *prompt* (`••••••••`,
  `SignInView.swift:85`) — at a glance they read as a pre-filled password.
- The form rides up ~140 px when a field focuses (`01` vs `00` on 17 Pro) with
  no software keyboard visible in the shot — confirm the ride is smooth, not a
  jump, on device (Track 2, sign-in feel).
- After rejection the password row reads empty although the code clears it
  only on success (`SignInView.swift:211`) — verify whether dots are merely
  subtle or state is lost (retyping after a typo would annoy).
- Static `-screenTour` backdrop photographs well (embers + density intact) —
  the gate preserves the marketing look.
- iPad status-bar override renders "9:41 AM Sat Sep 5" while iPhones show
  "9:41" — script cosmetic, expected platform difference, not an app issue.
- Residual ~4% CPU under the gate is the ungated mesh/border timelines — fine
  for snapshots now; gate them too only if a later screen needs deeper idle.

## Next

Working tour account → rerun `scripts/screenshot-tour.sh` unchanged; the tour
will walk 02–22 as written (fallback + Keychain paths intact). Suggested
follow-ups (not done here): log real launch-to-paint separately from
absence-poll timeouts; consider skipping the script's AUTO_SIGNIN bootstrap
retry when attempt 1 already produced frames (with bad creds it only burns
~2.5 min/device — both attempts this round produced identical frames).
