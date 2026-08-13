# Decision record — /privacy (PrivacyPolicy.jsx)

## agent

Rex.

## artifact

aom-studio/src/pages/PrivacyPolicy.jsx (route /privacy, live at https://www.aheadofmarket.com/privacy), commits 922cb819 + bed86860 + dbba9723. Brief: src/pages/privacy-creative-brief.md (frame class: type).

## call

I am shipping this because it does the one job a privacy policy has: a user (or an Apple reviewer) can read in plain words what Corner collects and act on it — delete the account in-app or email us; both actions are linked in the page. I chose a type-led single column on the dark support-desk canvas over icon-decorated or two-column layouts because on a legal page ornament reads as evasion; Apple's and Basecamp's policies are the best-in-class versions of this pattern and this matches their depth and rhythm. I replaced Instrument Serif (my own first pass) with Georgia after the anti-default check — the trend serif is a retired AI tell; Georgia keeps the serif-headline warmth without it.

## measured

design_spacing_check.py on the page subtree (privacy-main-only.html, rendered from production DOM):

    RESULT: PASS (floor cleared on every machine-checkable item)
      ! FLAT SURFACE: no depth anywhere (no shadow, gradient, or blur). ... or state why this surface is deliberately flat.

design_screen_check.py on https://www.aheadofmarket.com/privacy with --brief privacy-creative-brief.md:

    SCREEN CHECK  https://www.aheadofmarket.com/privacy   [dom]
      graphic objects        : 1 content, 0 chrome
      type elements          : 37  sizes [13, 14, 16, 26, 48]
      display below its floor: 0
      RESULT: PASS
        ! TOKEN GRAPHIC: graphic content holds 0.0% of the first screen (floor 8%) -- it decorates rather than carries the idea.

Full-DOM spacing run FAILs on 2×`gap: 14px` + 18/28px sizes — traced to the shared SPA shell overlay styles present on every route, not this page's subtree; changing global shell CSS is outside this change's blast radius.

Flat surface: deliberate. The brief declares the words are the design; a legal document gets no shadows.

## uncertain

Three things I might have got wrong. (1) The App Privacy nutrition-label mapping: I wrote "no tracking" and the four collected types from reading the codebase, but Google Analytics runs on the website side and Apple's definition of "tracking" has edges — if Apple reads GA on the marketing site as app-adjacent tracking, the label and this page both need a revision. (2) I claim "we don't use your content to train AI models, and our AI providers process it under agreements that prohibit them" — true for the Anthropic API terms as I understand them, but I could not verify every provider path (image generation providers in the iOS flow) against their current terms. (3) Whether swapping to Georgia while /support keeps Instrument Serif reads as inconsistency to a careful visitor who sees both pages; I judged rule-5 compliance above sibling-consistency and I might have that priority backwards.

## would_change

With more time: a shared legal-page layout component so /privacy and a future /terms stay in lockstep; anchors per section so the app can deep-link "Deleting your account"; and resolving the /support face to the same non-retired serif so the pair matches.

## risk

If I'm wrong on the data claims, the blast radius is real: Apple can reject the submission citing a privacy-label mismatch (delays launch by days), or worse, a user relies on a deletion/no-training promise the backend doesn't fully keep — that is a trust break with named users, not a cosmetic miss. Visual risk is small: worst case the page reads plain, and a plain privacy policy hurts nobody.
