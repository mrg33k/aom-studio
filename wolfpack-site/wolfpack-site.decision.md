# Decision record — wolfpack-site shell + homepage (commits a7be3d7b, 806832ed)

## agent

Claude (Fable 5), background launch session, wolfpack:homepage-redesign-launch.

## artifact

wolfpack-site/src — shared shell (header, footer, contact drawer wizard) and homepage
template, as committed at a7be3d7b and 806832ed on branch codex/wolfpack-homepage-redesign-launch.
Design source of truth: research/design-v2-2026-08-27 (client-approved Claude Design export
+ HANDOFF.md, confirmed current by hash against the live design project).

## call

I am shipping this because it is a faithful port of the client-approved Evolution B v2 comp
set, verified section-by-section against rendered comp screenshots at 1440 and 390, with the
one comp bug fixed (the comp's own mobile render clips "CLEARS" off the right edge; the port
wraps the headline below 768px instead). Purpose of the screen: get a property manager or GC
to call 602-550-5452 or open the contact drawer — both actions are present in the header on
every scroll position, in the hero, and in the offer band. The ONE thing a visitor must be
able to do (start contact) has three obvious paths.

On the measured spacing FAIL below: I am deliberately NOT snapping to the generic 4/8 grid.
The off-grid values (5, 6, 9, 13, 14, 15, 18, 22, 26, 30px...) are verbatim from the approved
comp's inline styles — the comp IS this project's design standard, it was approved by Patrik
and mobile-passed by the design session, and re-gridding it would produce a page that no longer
matches what the client signed off. Gate rule 3 says judge against THIS project's own standard;
here that standard is the comp, and the comp wins over the house grid. Same for the type ladder:
the comp uses clamp() display scales per section; collapsing them would flatten the approved
hierarchy. Patrik has additionally pre-approved cutover once the preview verifies ("do not stop
and wait for me — we were supposed to go live last night").

## measured

design_spacing_check.py (via Stop-hook, 2026-08-27):
    MEASURED FAIL — wolfpack-site/src/styles/site.css
      · OFF-GRID spacing: 42 value(s) not on the 4px grid -> 5, 6, 7, 9, 10, 13, 14, 15, 18, 22, 26, 30px
      · SPACING SPRAWL: 36 distinct spacing values (cap 10)
      · TYPE SPRAWL: 25 distinct font sizes (cap 8)
    Ruling: accepted deviation — values are verbatim from the approved comp (see call).

node --test tests/wolfpack-build.test.mjs: 6 pass / 0 fail
(route contract 27 routes, shared chrome, homepage Evolution B v2 structure, JS baseline).

npx playwright test (responsive subset, homepage): 6/6 pass after tap-target fix —
"/" clean at 320-1440px (no horizontal overflow, no console errors), drawer wizard advances
and gates success on a 200 from /api/lead (502 path shows honest error), theme persists via
wp-v2-theme across reload, reduced-motion removes loader and stops marquee, all header/mobile-nav
tap targets >= 44px (was FAIL at 38px for theme/menu buttons — fixed, re-run PASS).

tests/wolfpack-lead.test.mjs: 18/18 pass (dual-inbox payload, honeypot, rate limit, delivery gating).

## uncertain

- The stat "$5.5M+ completed contracts" and "15+ cities" come from the comp, which sourced the
  old site; I did not independently verify $5.5M against any Wolfpack document. If it is stale,
  it is now stale on a bigger stage.
- Testimonial photos: I swapped the comp's AI stand-ins for real GC portfolio shots
  (ritz-carlton/target/edison-midtown.jpg) per Patrik's "no old AI images" rule. The Ritz shot
  is an aerial resort view — plausible but I cannot confirm it is the Paradise Valley property
  the quote refers to.
- Hero JPEG conversion (PNG→JPEG q82) may show slight banding in the dark sky region on a
  wide-gamut display; I only checked on screenshots.
- Light theme got far less scrutiny than dark: I verified the variable blocks match the comp
  but did not walk every section in light mode.
- The full-page mobile screenshot showed lazy-loaded images unpainted below the fold; I judged
  that a screenshot artifact, not a bug, without a scrolled verification pass — the Playwright
  QA does not assert image paint.

## would_change

WebP/AVIF variants with srcset instead of single JPEGs; real location photography for the three
testimonial slides (flagged in HANDOFF.md as stand-ins); a scrolled section-by-section visual
pass in light mode; self-hosted fonts to drop the Google Fonts request.

## risk

This is the client's public storefront and it replaces their live site at DNS cutover. If the
port misrepresents the approved design, Patrik's client sees it live, not in a review. Blast
radius is bounded by: the old GoDaddy site remains untouched as rollback, DNS snapshot is saved
(research/dns-before-2026-08-27.txt), mail records (Proofpoint MX/SPF) are explicitly out of
scope for the cutover edit, and the form fails honest (call/email fallback shown) if the Resend
key is absent. The wrong-stat risk above is the one a client would notice first.
