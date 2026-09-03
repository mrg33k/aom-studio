# Decision record — hero photo rotation + emergency machine swap (R12–R13)

## agent

Rex (background session, 2026-09-03).

## artifact

`wolfpack-site/src/templates/home.mjs`, `src/styles/site.css`, `src/build.mjs`,
`src/assets/hero/*.jpg` (5 new), `src/assets/work/20-emergency-b.jpg` (replaced),
commits f67685e9 + 7b69db02. Live on wolfpackcompanies.com.

## call

I am shipping this because both changes answer direct feedback with real
material. The hero's job is unchanged — get a PM to request a walkthrough — and
the CTAs stay the most contrasted elements; what changed is that the backdrop
now actually shows the company. Five real photos from the Aug 22 shoot rotate
per load; the light theme previously buried the photo (55% opacity under a
78–98% cream gradient — effectively a blank wall, which was the complaint) and
now runs the photo at full opacity under a light top wash that still ramps to
96% at the bottom where the text sits. Crew centering was measured with
gridlines, not eyeballed, after my first eyeballed pass overshot — all five
groups now sit at 50%±1.5%. The emergency image swap replaces an AI-invented
flimsy drain machine the client explicitly called a "POS" with a heavy-duty
steel-cage drum rig, generated with the established Wolfpack brand recipe
(multi-ref, real livery, no invented brand lettering). What lost: showing the
real Aug 22 machine photos on /emergency/ — their real unit is a small red
cart that would undercut the exact "serious rig" impression the client asked
for, and the page's night-scene set would break with daylight photos.

## measured

Test suite after all changes: `tests 43 · pass 43 · fail 0` — PASS.
Build: `Built 27 Wolfpack routes` — PASS.
Centering (1000px grid overlays, group bbox midpoint vs 500px line): before
fix 57.5–58.8% on four images; after single-pass RAW recrop all four straddle
500px (measured ≈49–51.5%), owners-fleet untouched at 49.8%.
Rotation distribution (200 in-page draws of the shipped picker):
`{"full-team-fleet":46,"crew-hivis-wide":32,"owners-fleet":33,"fleet-lineup-wide":41,"crew-hivis-tight":48}` — even, PASS.
Live production probes: hero URLs versioned
(`hero/crew-hivis-wide.jpg?v=55486e13c6` etc. on all 5), new emergency image
serving (`20-emergency-b.jpg?v=0c2eaf9bcd`, HTTP 200, 419,929 bytes), photo
loaded on live page (`naturalWidth 2400`, opacity 0.62 dark / 1 light,
mobile height 125% applied). Screenshots verified at 1440x900 (both themes)
and 390x844 (both themes, menu open/closed) locally and live.
Cache-bust: every /assets file now sha1-versioned by `registerAssetVersions`
(walk of assets tree) — verified `?v=` on brand, hero, work images in dist.

## uncertain

The centering measurements are mine off 1000px grid overlays — ±1.5% at best,
and Patrik has not yet re-approved the recentered set live (his last live look
was the overshot version he flagged). The regenerated emergency image's truck
sub-line ("PLUMBING | SERVICE | INSTALL" and the small line under the phone)
is mushy at pixel zoom — invisible at page display size, but a print or zoom
use would show it. And I read the client's "Stryker" as "heavy-duty pro rig"
after confirming no such drain brand exists; if they meant a specific machine
they own or covet, the new drum may still be wrong in their eyes.

## would_change

Get the client's actual machine inventory photographed on the next shoot and
replace both emergency images with real gear. Add a build-time centering probe
(face/person detection on hero assets) so crop drift is caught by machine, not
by Patrik. Regenerate the emergency image once more with a text-fidelity pass
if it ever gets used above ~800px display width.

## risk

Client-facing on the two highest-traffic pages of a live client site. If a
rotation photo reads off-center on Patrik's or Ross's screen, it undermines the
"we fixed it" message twice in one day — mitigated by measured (not eyeballed)
crops and versioned URLs so no one is looking at a stale cached image. If the
client dislikes the new machine, it is one asset swap + redeploy, five minutes.
The asset-versioning change touches every image URL on the site; if the
version query broke anything it would show as sitewide 404s — verified live
200s on hero, work, and brand images after deploy.
