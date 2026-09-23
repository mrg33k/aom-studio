# Decision record — public/home-v4/index.html (2026-09-22 rounds: analytics events, A/B hero order, help-section logo, industry stacks cut to four)

## agent

Claude Fable 5.1, in Patrik's terminal session, 2026-09-22.

## artifact

`aom-studio/public/home-v4/index.html` as committed in `b11990b0` (analytics + A/B + help logo) and `8f6590ea` (industry stacks cut to four films each, Keep it Cut moved to Technology). Live at https://www.aheadofmarket.com/ (both `?ab=a` and `?ab=b`).

## call

I am shipping this because every change is either invisible (event tracking) or a data swap inside a layout Patrik already approved this week, plus one new element he asked for by name (the Ahead of Market logo above "How we can help you", built from the same monogram + wordmark as the nav brand). The A/B variant b re-orders two existing sections; the hero keeps its scroll behaviour because the scroll math is now hero-relative, the nav brand stays put, and on phones the duplicate logo is hidden and the hero clears the nav. I looked at both variants on desktop and phone locally and on the live domain before calling it done. The industry lineup (four per section) is my best-judgment cut from the media plan ratings and Patrik's own earlier picks; he is the gate on taste and swaps are one line each.

What lost: keeping Cynshine Pilates in Restaurants (not a restaurant), keeping the four older VIEWPOINT white-label pieces in Technology (2023-24, weakest of the set), keeping two films from the same client in one stack.

## measured

`python3 scripts/design_spacing_check.py aom-studio/public/home-v4/index.html` (2026-09-22):

```
  real font families      : 3  ['inter', 'inter tight', 'space grotesk']
  depth signals           : 53  (shadow/gradient/blur)
  lazy neutrals           : none
  placeholder copy        : none
  near-full-height bands  : 13  (>=80vh/svh/dvh)
  scroll-reveal hints     : 89
  RESULT: FAIL
    - OFF-GRID spacing: 146 value(s) not on the 4px grid -> 1.6, 2.2, 2.4, 2.9, 3.5, 4.8, 5.6, 6.4, 7.2, 7.4, 8.8, 9.6, 10, 11.2, 12.8, 13.6, 14.4, 15.2, 17.6, 18.4, 19.2, 20.8, 22.4, 25.6, 28.8, 35.2, 38.4, 41.6, 70.4px
    - SPACING SPRAWL: 56 distinct spacing values (cap 10).
    - TYPE SPRAWL: 29 distinct font sizes (cap 8).
    ! DENSITY RISK: 13 near-full-viewport-height band(s).
    ! SCROLL-REVEAL detected (89 opacity:0 / observer hint(s)).
```

This FAIL predates this round: the page is the Claude Design v4 export with fluid `clamp()`/rem spacing, and the same numbers show on every backup since `tmp/home-v4.index.backup-063221.html`. Nothing in this round added a spacing or type value. The full-height bands and scroll reveals are the page's design (one screen per section, reveals on scroll); each section was scrolled into view and checked on desktop and at 375px in this session, on the live domain.

Live checks this round (built-in browser, https://www.aheadofmarket.com/): variant roll ~50/50 over 20 samples; `?ab=b` renders `Pipeline, Hero, Two parts` with `[data-helplogo]` present; plain reload keeps the stored variant; industry stacks render exactly four cards each with the "See all 4 … films" button.

## uncertain

- The A/B variant is assigned client-side after load, so a visitor on variant b sees the hero-first document for a frame or two before the swap. I did not measure that flash on a slow phone; it may be visible on 3G.
- Variant b's hero on phones now pads under the nav; I checked one width (375). At 320 or with large text settings the quiz rows may crowd the top.
- The "strongest four" per industry is my judgment from ratings and picks, not a viewing of every candidate this session. AZ Cleantech is a placeholder seat until Included Health lands; Gitex Dubai or the ISA System Performance demo may be stronger to Patrik's eye.
- Keep it Cut is labelled "Recruiting Film" on its card, which reads odd under Technology.
- The page still fails the 4px-grid and type-ladder checks. I chose not to re-space a design Patrik locked this week to satisfy a machine rule; a sharper eye may still find rhythm drift between the new help-logo block and the heading below it.

## would_change

Collapse the page to one rem spacing scale and a six-step type ladder in a dedicated pass with Patrik watching, since it touches every section. Pre-render the variant server-side (or set it in a cookie read by an edge rewrite) so variant b never flashes hero-first. Replace AZ Cleantech with the Included Health summit film once it is on gumlet. Re-label Keep it Cut's card ("Hiring Film").

## risk

If the variant swap breaks on some browser, half of visitors see the "How we can help" section first with the hero scroll effects mis-timed; the lead form and films still work, and `?ab=a` forces the safe layout. If a lineup pick is wrong, a prospect sees a weaker film in one industry stack; it is a one-line swap. The tracking is additive: if gtag fails, the page behaves as before.
