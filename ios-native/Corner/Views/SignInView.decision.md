# Decision record — SignInView (login) entrance animation

## agent

Claude (Opus 4.8), this session, for Patrik. My call, my name on it.

## artifact

`aom-studio/ios-native/Corner/Views/SignInView.swift` — the Corner iOS login /
onboarding screen. This record covers ONE change made this session: the R68
entrance animation (a staggered rise-and-fade of the screen's elements plus a
breathing brand glow). It does NOT re-cover the screen's layout, type, or copy,
which were designed and accepted in R17 (P059–P060) and are untouched here.

## call

I am shipping the entrance because the login/onboarding screen is the first
thing a new user sees and Patrik has said for months it should have "a slick
animation" and never did — a hard cut to a full form reads as unfinished. The
screen is FOR getting an existing user in and a new user started; the ONE thing
they must be able to DO is enter an email and continue (or pick an SSO row).
The animation must never fight that: so the email field and the Continue button
are the surfaces I checked land fully and stay tappable, and the whole sequence
is ~1s and non-blocking (no gate, no overlay).

Design choice: a staggered opacity+rise on a spring (top→bottom, 0.07s step),
reusing the app's own `V2AmbientGlow` motif breathing behind the headline —
NOT a generic slide-in and NOT a new visual language. Two options lost: (a) a
single whole-screen fade — rejected, it reads as a slow load, not a designed
entrance; (b) a horizontal slide — rejected as the AI-default motion. Reduce
Motion renders everything at rest (no offset, no fade, no animation).

## measured

Build (real output):
```
** BUILD SUCCEEDED **   (xcodebuild, iPhone 17 Pro sim, Debug)
```

Type ladder actually used on the screen (grep of SignInView.swift) — 7 text
sizes, under the ≤8 cap:
```
hanken 11.5, 12, 13, 14, 14.5, 15, 25
```
plus 3 icon-glyph sizes (system 14, 16, 17) for the SSO row marks.

Spacing values present on the screen:
```
0 1 8 11 12 13 16 21 22 24 40 50 114 (layout) + 12, 280 (this change)
```
The only values THIS change introduced are the stagger start-offset (12px, on
the 4px grid) and the glow frame height (280px, on grid) with offset −160 (on
grid). The off-grid values (11, 13, 21, 22, 114) are all pre-existing R17
layout, not touched here.

Animation params (SignInView.swift):
```
stagger: .spring(response:0.62, dampingFraction:0.85).delay(index*0.07)
glow:    .easeOut(duration:0.9) on entered; V2AmbientGlow 10s drift loop
reduceMotion: modifier returns content unchanged (rest state)
```

Rendered ground truth (iPhone 17 Pro sim, this build):
- Settled frame `/tmp/login-settled.png`: logo, headline, sub, 3 SSO rows,
  email field, accent Continue, terms all present and aligned; glow behind the
  headline.
- Entrance frames from a launch recording: t≈1.6s shows logo+headline in while
  the SSO rows / button / terms are still absent (mid-stagger); t≈2.0s shows
  every element landed. Confirms the top→bottom sequence, not a whole-screen pop.

NOTE: `design_spacing_check.py` / `design_screen_check.py` cannot run on this
artifact — it is SwiftUI, not HTML. The measured-fail list emitted by the Stop
gate this session is entirely pre-existing files under
`archives/room-cleanup-2026-08-14/…`, `.agents/skills/social-carousels/…`, and
`aheadofmarket.com/…site.css` — none is this screen and none was changed here.

## uncertain

- I verified the entrance on the iPhone 17 Pro SIM only. I did NOT confirm it on
  a physical device or on iPad — spring timing and the glow's brightness can
  read differently on real OLED and at iPad width. Patrik's TestFlight install is
  the real check.
- The glow lands behind the headline (not high behind the logo as the comment
  implies) because the ZStack centers it before the −160 offset; I decided that
  reads well, but a sharper eye might want it anchored higher, tighter to the
  logo. I did not A/B the two positions.
- Reduce Motion: I read the code path (modifier returns content at rest) but did
  NOT capture a Reduce-Motion screenshot to prove no flash of the offset state on
  first layout.
- I did not re-audit the pre-existing off-grid layout spacing (11/13/21/22/114).
  It was accepted in R17; snapping it was out of scope for an animation change,
  but a strict reading of the grid standard would flag it.

## would_change

- Capture a Reduce-Motion frame and a physical-device / iPad pass before calling
  it fully done.
- Consider anchoring the glow higher behind the logo and testing that against the
  current behind-the-headline placement.
- If we ever re-open the login layout, snap the R17 spacing (11/13/21/22) to the
  4/8 scale in the same pass.

## risk

Low blast radius. This is Corner's own internal iOS app on TestFlight (Patrik +
team), not a client-facing site. Worst realistic case: the animation feels slow
or janky on a real device, or (unproven) a one-frame flash of the pre-animation
state under Reduce Motion. Either is a cosmetic first-impression miss on an
internal beta, fixable in a follow-up build — not a data, auth, or client-trust
failure. The email/SSO path itself is unchanged and was already working.
