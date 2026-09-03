# Decision record — Google review button in the Wolfpack top bar (R11)

## agent

Rex (background session, 2026-09-03).

## artifact

`wolfpack-site/src/templates/shell.mjs` + `wolfpack-site/src/styles/site.css`,
commit 26e81e31 — three placements of the Google review CTA
(`https://search.google.com/local/writereview?placeid=ChIJWViif6VtK4cRNK7_zrcm320`):
desktop header pill, mobile review strip, mobile-menu entry. Live on all 27
routes of wolfpackcompanies.com.

## call

I am shipping this because the screen's one job is unchanged and the new element
serves a single obvious action. Intention: a customer Ross invites by link opens
the site and must immediately see one thing to DO — tap and leave a Google
review. On desktop that is a fixed-white pill with the real 4-color G mark and
gold stars sitting beside the blue call CTA; white-on-dark is the highest-contrast
surface in the bar, and borrowing Google's own visual language (white ground,
#DADCE0 border, official G, #FBBC05 stars) is what makes it read "official
Google," which was the explicit brief. On mobile I rejected squeezing a pill into
the 64px top row (squished mobile nav is a known, called-out failure on this
project) and instead gave the CTA its own full-width white strip directly under
the bar — unmissable at landing, and deliberately NON-sticky so a browsing
prospect loses it on scroll instead of paying 40px of viewport forever; the
menu entry covers them. What lost: a sticky strip (permanent viewport tax on the
audience the site actually sells to) and an icon-only G square in the mobile bar
(says "Google," doesn't say "review us").

## measured

Overflow/geometry probe at 1000px (860–1099 compact band), real output:
`{"overflowX":false,"pillVisible":true,"pillRight":842,"callRight":995,"innerW":1000,"headerH":68}` — PASS.
Live-production DOM probe on wolfpackcompanies.com after deploy:
`{"pillHref":"https://search.google.com/local/writereview?placeid=ChIJWViif6VtK4cRNK7_zrcm320","pillTarget":"_blank","pillShown":true,"stripShown":false,"cssVersioned":true}` — PASS
(strip correctly hidden at desktop; shown and screenshot-verified at 390x844x2
emulation, dark and light themes, menu open and closed).
Build + suite: `Built 27 Wolfpack routes` / `tests 43 · pass 43 · fail 0` — PASS.
Coverage: `grep -rl writereview dist --include=*.html | wc -l` → 28 files, 3
placements per page. Review URL behavior verified in a real browser: resolves to
Google sign-in with the Wolfpack rate-and-review dialog as continue target.
Spacing sits on the header's existing values (48px pill height matching
.header-call, 8px block padding, 10px gaps vs the bar's 12/14px rhythm); per this
mission's standing comp-fidelity record, the shipped header's own values are the
standard, not the generic 4/8 grid — no new type sizes outside the existing set
except the shared 10px label size already used by .header-call span.

## uncertain

The 10px uppercase sub-line ("★★★★★ 5.0 rated") is at the floor of legibility
Patrik has flagged before on this site ("small text needs to be legible, not
squished") — it matches .header-call's existing 10px label, but he may still
want it bigger or gone. The fixed-white strip under the mobile bar reads
Google-official, but on the light theme it is white-on-near-white separated only
by hairlines; a sharper eye might call that band washed-out rather than clean.
And I chose non-sticky on mobile on my own judgment of the invite flow — if Ross
expects the button to chase the customer down the page, this is the opposite call.

## would_change

With Ross's input: claim the listing's g.page short name for a human-readable
link, and A/B the strip copy ("Review us on Google" vs "Leave us a review — 30
seconds"). With more time: a dedicated /review route that sets context ("How did
we do?") before handing off to Google, and a GA4 custom event
(review_click) instead of riding the generic button_click.

## risk

Client-facing on every page of a live client site. If the place ID is wrong,
invited customers land on a sign-in loop or the wrong business and Wolfpack
burns real review-ask goodwill — mitigated by resolving the ID from the live
Maps listing and browser-verifying the continue target is the Wolfpack dialog.
If the mobile strip crowds the brand, Ross sees it on his own phone before we
do; the rollback is one commit revert + redeploy, under five minutes.
