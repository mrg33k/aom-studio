# Wolfpack Homepage Redesign Launch — Mission Build Plan

**Started:** 2026-08-27
**Mission path:** `wolfpack:homepage-redesign-launch`

## Rounds

### R1 — Lock the approved design and release contract

Turn the approved DreamCanvas feedback package into a written page-template, mobile, lead-delivery, asset-preservation, hosting, and cutover contract.

Design approved and saved in `docs/superpowers/specs/2026-08-27-wolfpack-redesign-launch-design.md`. The executable nine-task plan is saved in `docs/superpowers/plans/2026-08-27-wolfpack-redesign-launch.md` and covers archive, isolated build, shared shell, all page families, real lead delivery, responsive QA, preview, and DNS cutover.

**Status:** shipped.

### R2 — Preserve the current site and build the template system

Archive every image served by the current GoDaddy site, import the approved supplied assets, and rebuild the 27-page static site from shared homepage, city, service, audience, and utility templates without losing page-specific copy or search intent.

Execution workspace: `.Codex/worktrees/homepage-redesign-launch` on branch `codex/wolfpack-homepage-redesign-launch`.

Preservation completed: the live GoDaddy archive is stored at `research/godaddy-2026-08-27/` with 36 unique, hashed image files totaling 5,136,814 bytes from 2 same-origin navigation pages. Fix Round 1 preserves both placeholder `srcset` and real GoDaddy `data-srcsetlazy` candidates, including all 15 live lazy asset keys. The archive helper tests cover responsive variant grouping, largest-variant selection, MIME-derived extensions, active-page loading, GoDaddy's comma-containing `srcset` transforms, lazy-attribute preservation, and external image URL preservation.

**Status:** in progress.

### R2.1 — Scaffold isolated static-site boundary

Shipped the standalone Node static-site project contract: exact 27-route data, a stable `buildSite` / `renderPage` boundary, copied shared assets, sitemap, robots, and 404 artifacts, plus reduced-motion and JavaScript baseline behavior. The existing `public/wolfpack-site/` rollback tree remains untouched.

Focused route/build tests pass and `npm --prefix wolfpack-site run build` emits all 27 route files and required static artifacts.

**Status:** shipped.

### R2.2 — Lock exact route and output paths

Review found that count-and-uniqueness checks could permit a required route to be renamed or replaced. The focused test now asserts the literal 27-route list and exact built paths, with root at `index.html` and every other route at `<slug>/index.html`.

**Status:** shipped.

### R2.3 — Port the approved shared site shell

Build the reusable Wolfpack header, service navigation, mobile menu, theme control, footer, and accessible request dialog from the approved header and footer comps. Keep page bodies deliberately minimal so the later page-family rounds can own them.

Task 3 also owns the tested site-wide phone, service email, and AZ ROC 326629 markup.

2026-08-27 ~03:40 — Handoff: Codex hit its usage limit mid-Task-3; Claude Code (background session) took over the same worktree and branch. Shell markup, CSS, JS, and brand assets are drafted and all 5 focused build tests pass; remaining: apply the Claude Design session's updated mobile rules (burger + full-screen sheet below 860px, horizontal service rail on phones, wordmark drops below 1100px), visual verify, commit. A live claude.ai/design session ("Homepage redesign feedback", 12 pages) finished a mobile-first pass and wrote HANDOFF.md; its files supersede the 01:30 zip comps and are being pulled into research/ next.

2026-08-27 ~04:15 — Shipped at a7be3d7b: shell matches final comps (rail order fixed, footer request button removed, contact drawer rebuilt as the comp's 3-panel wizard, 44px tap targets). Homepage shipped at 806832ed from Evolution B v2 with real GC portfolio photos replacing AI testimonial stand-ins (Patrik: old AI images banned). Lead API shipped at 8d1ee4b3 (18/18 tests, dual inbox, Resend). Vercel project `wolfpack-companies` created + WOLFPACK_LEAD_FROM set; RESEND_API_KEY transfer blocked by permission classifier — asked Patrik to paste it. DNS pre-cutover snapshot saved at research/dns-before-2026-08-27.txt (Proofpoint MX + SPF must be preserved). Patrik pre-approved DNS cutover once preview is verified ("do not stop and wait for me").

**Status:** shipped.

### R3 — Mobile polish and launch QA

Test every template across phone, tablet, laptop, and wide desktop sizes; verify navigation, forms, calls, email links, accessibility, reduced motion, metadata, redirects, and performance.

**Status:** queued.

### R4 — Independent production launch

Create a separate Vercel project at no added fixed project fee, publish an approval preview, connect `wolfpackcompanies.com` only after approval, update GoDaddy DNS, and verify the canonical domain while preserving the AOM-hosted path as rollback coverage.

**Status:** queued.

### R5 — Service page family (7 detail pages + services overview)

Background Claude session in this worktree. Built kind 'service' and 'services' templates from `Hydro Jetting.dc.html` / `Services.dc.html`, copy verbatim from `public/wolfpack-site/<service>/index.html`, new numbered work photos only (old AI images banned). Shipped: `src/templates/service.mjs`, `src/templates/service-index.mjs`, `src/data/services.mjs`, unique metadata for the 8 routes in pages.mjs, svc2- CSS block appended to site.css, 6 appended build tests (12/12 pass). Verified with Playwright screenshots at 1440x1000 and 390x844 (hydro-jetting, services, air-compressor, emergency, water-heaters): zero horizontal overflow, zero console errors, zero banned-image references in dist. Copy-source gap: the live air-compressor page's benefit cards and steps are duplicated drain-cleaning copy, so those sections are omitted on /air-compressor/ (hero, why-intro paragraph, photo, offer remain). Commit 560d01a4.

**Status:** shipped.

### R6 — Audience, city, and contact pages (final 18 routes)

Background Claude session in this worktree. Built the last 4 page kinds: 'property-managers' and 'general-contractors' from their comps, 'city' (all 15 city routes from the Scottsdale comp, copy verbatim from each live city page, unique titles/descriptions per city plus a 3-4 link Nearby row from `src/data/cities.mjs`), and 'contact' (no comp; site design language, live-page copy, and the drawer's need-options + name/company/phone form inline, posting JSON to /api/lead with honeypot + startedAt; a page script yields `data-lead-form` to the drawer before site.js binds, then handles the inline form itself so both work). Shipped: 4 new templates, `src/data/cities.mjs`, pages.mjs metadata for the 18 routes, pm-/gc-/city-/cpage- CSS block, 6 appended build tests (18/18 build tests, 43/43 total), and `src/check-links.mjs` (`npm run check:links` — 2,414 internal refs verified, and it caught the comp's nonexistent `13-backflow-a` image, replaced with `13-backflow-b.jpg`). GC grid minimum raised 260→300px so the 12 project cards always land on 1-4 even columns (comp's 260px left 3 orphan gray cells at 1440). Playwright-verified at 1440x1000 and 390x844 (property-managers, general-contractors, scottsdale, contact): no overflow, no broken images, no console errors, zero banned-image references in dist. GC and offer copy taken verbatim from the live pages where the comp paraphrased (e.g. offer "Bring Wolfpack onto your next project.", full project addresses/scopes). Commit 7e6a9d50.

**Status:** shipped.

### R7 — Launch QA + production deploy + cutover staging

QA green (61/61 responsive across 7 route families x 8 widths, 43/43 unit, 2,414 links resolve, zero banned images) — record at research/qa-2026-08-27.md, signed decision record at wolfpack-site/wolfpack-site.decision.md. Production deployed to Vercel project `wolfpack-companies` (final build incl. contact 320px fix). Deployment URLs are SSO-gated (Vercel Standard Protection; the security-settings change to disable it is user-gated) — custom domain will be public. Domains wolfpackcompanies.com + www attached to the project; Vercel requires apex A 76.76.21.21. Patrik asked to make the two A-record edits in his open GoDaddy tab (extension has no godaddy.com site permission) and to paste RESEND_API_KEY. Monitors armed for DNS flip and key arrival; production acceptance runs automatically after the flip.

**Status:** shipped — LIVE at https://wolfpackcompanies.com (cutover verified 2026-08-27 ~08:25 Phoenix). Sole open item: RESEND_API_KEY paste, then live form test.

### R8 — Patrik's live-site mobile feedback (2026-08-27 ~10:10 AM Phoenix)

Patrik reviewed the live site on his phone (3 screenshots): mono typefaces must go entirely ("it's horrible"), the tiny letterspaced eyebrows/numbered-section labels are too small, the mobile header is squished and not clean (hamburger + theme toggle + edge-bleeding call block + clipped service-rail strip), and the hero background wolf watermark renders vertically stretched on mobile (root cause: global img max-width:100% caps width while height stays 88% of hero — same math threatens both offer-band watermarks). Fix set: replace all ~30 IBM Plex Mono styles with Archivo/Inter at larger sizes, rebuild the mobile header (wordmark back, theme toggle into the menu, compact call button, service rail hidden on mobile), and aspect-safe watermarks.

Shipped in commits 45adc071 (interim lead endpoint, matching live behavior) and 3c3f5f3a
(mono purge / header rebuild / watermark fix). Verified locally at 390x844 + 320px via
Playwright: zero horizontal overflow, watermark aspect 0.852 (= source PNG), menu, footer,
offer band, service hero, and light mode all screenshot-checked; 43/43 unit tests green.
Branch pushed to origin (first push — remote branch is new, so the Vercel project is NOT
git-connected; all prior production deploys were CLI-run from this worktree).

**BLOCKED on deploy:** this session's permission classifier denied `vercel --prod` (twice)
and the Vercel MCP (even read-only get_project). The built + committed fix is NOT live yet.
To ship: `cd .codex/worktrees/homepage-redesign-launch/wolfpack-site && vercel --prod --yes`
(CLI is authed as mrg33k, project link `.vercel/project.json` → wolfpack-companies).

**Status:** shipped — LIVE. Patrik granted the Vercel permission (~10:32 AM Phoenix);
deployed via `vercel --prod` and aliased to wolfpackcompanies.com. Live verification:
zero IBM Plex references in served HTML/CSS, mono font never loads, watermark aspect
0.852, service rail hidden on mobile, zero horizontal overflow at 390px, live-hero
screenshot matches the local QA set.

### R9 — Numbers purge, hero eyebrow removed, centered hero + cache-bust fix (2026-08-27 ~10:50 AM Phoenix)

Patrik's second phone review of the live site: decorative index numbers everywhere are
not needed, the homepage hero eyebrow goes, and the hero content including the stats
should be center-aligned. Removed section-num (14 across all templates), svc-num,
svc-peek-num, work-num, svc2-shot-num, svc2-card-num, and the testimonial counter;
kept the big outlined process-step numbers (real 1-2-3 sequence) and the real stats.
Hero now fully centered at all widths (title, sub, CTAs, stats row).

Also caught and fixed a real launch bug during live verification: site.css/site.js are
served with a one-year immutable Cache-Control header but had unversioned URLs, so
returning visitors kept the old design after every redeploy. asset() now appends a
content-hash query (?v=sha1[:10]) for the two mutable files.

Deployed to production twice (R9, then cache fix); live checks green: versioned CSS
loads, computed hero text-align center, zero number elements, zero overflow at 390px.
Commits: R9 templates/CSS, cache-bust fix + test update.

**Status:** shipped — LIVE.

### R10 — OG share image (2026-08-27 ~1:45 PM Phoenix)

Patrik asked for a "super dope" OG share image, generated and wired in. Followed the
approved brand-image recipe: Nano Banana multi-ref generation (approved hydro-jetting
anchor + Aug 6 shoot truck/crew + door-logo closeup; letter-perfect livery, bright
Phoenix daylight, left third reserved as negative space), then composited the REAL
knockout logo + wordmark with an Archivo headline "Commercial plumbing. Handled." and
Phoenix/24-7/phone sub-line, rendered at 2x and downscaled to 1200x630 JPEG (200KB).
renderHead now emits full og:* + twitter summary_large_image tags on all 27 routes;
og.jpg is content-hash versioned like site.css/site.js. Deployed; live checks: og:image
meta present, https://wolfpackcompanies.com/assets/og.jpg?v=0d6bb414b6 returns 200
image/jpeg and renders the full composite.

**Status:** shipped — LIVE.

### R11 — Google review button in the top bar (2026-09-03)

Patrik: invite customers by sending the site; they tap a standout, Google-official
button in the top bar that takes them straight to leaving a review. Place ID pulled
live from Maps (ChIJWViif6VtK4cRNK7_zrcm320, hex 0x872b6da57fa25859:0x6ddf26b7ceffae34,
verified: writereview URL resolves to the Wolfpack rate-and-review dialog).
Shipped: white pill with the real 4-color G mark + gold ★★★★★ "5.0 rated" next to the
blue call CTA on desktop (compact one-line variant in the 860–1099 band); full-width
white review strip directly under the header row on mobile — non-sticky, sits at the
top where an invited customer lands, scrolls away for browsing prospects; labeled
entry in the mobile menu above the call button. Fixed-white ground in both themes so
it reads as Google's surface. Opens in a new tab; existing GA click handler tracks it
as button_click automatically. 43/43 tests pass, all 27 routes carry it, no overflow
at 390/1000/1440. Deployed via `vercel --prod` and live-verified on
wolfpackcompanies.com (pill at desktop, strip at 390px, versioned CSS served).

**Status:** shipped — LIVE.

### R12 — Hero photo rotation with real team shots (2026-09-03)

Feedback: hero image invisible on the white theme; Patrik wants 4-5 good group
photos shuffling randomly. Culled the 140-shot 2026-08-22 fleet/team shoot
(RW2 raws on SS8TB) via contact sheets, picked 5: two hi-vis crew shots, the
full 10-man team, the widest fleet lineup, and the four owners. Decoded from
RAW to 2400px q72 web JPEGs. Inline picker script chooses one per load
(no-JS fallback = first shot). Light theme: photo to full opacity under a much
lighter wash (was 55% opacity under 78-98% cream — invisible); dark lifted to
.62. Mobile bottom-anchors the photo at 125% so the crew fills the frame, not
the mesquite tree. Patrik approved live ("much better with the full crew").

**Status:** shipped — LIVE.

### R13 — Centered crews, pro cable machine, full asset versioning (2026-09-03)

Patrik: "some of the images are off center. we need them all to be centered."
Measured each hero asset with gridlines: four sat at 57.5-58.8% (first crop
pass overshot). Recropped from RAW in one measured pass; all five groups now
straddle 50%. Client (via Patrik): the /emergency/ cabling machine "should be
more like a Stryker, not that POS" — no Stryker drain brand exists (verified),
read as heavy-duty-pro-rig. Regenerated 20-emergency-b per the brand recipe
(Nano Banana multi-ref: old composition + livery + logo refs): large steel-cage
drum machine, thick coiled cable, no brand lettering, same night scene. Livery
sub-line text slightly mushy at pixel-zoom, invisible at page size. Also found
and fixed a launch-class cache bug: only site.css/js/og.jpg were content-hash
versioned while ALL /assets get a one-year immutable header — replacing any
image under the same filename never reached returning visitors. Now every
asset file is hashed. Test updated (asset URLs may carry ?v=). 43/43.

**Status:** shipped — LIVE. Hero centering awaiting Patrik's live eyeball;
19-emergency-a (page hero, Spartan cart) left as-is — flag if client wants
that one beefed up too.

### R14 — CTA click notifications (2026-09-03)

Patrik wants a notification when someone clicks a call to action. New endpoint
`api/wolfpack-cta.js` on aom-studio (commit 3aaffe2e on main — that project holds
the Resend key): POSTs {cta: call|review, page} email a short heads-up to
hello@aom-inhouse.com only. One email per visitor per CTA per hour, 40/day cap,
CORS-locked to wolfpackcompanies.com. Client: sendBeacon (text/plain to dodge
preflight) on tel: and Google-review clicks, wired in site.js. Verified live
end-to-end: curl from allowed origin returned sent:true (real email delivered),
then a real click on the live site fired both the beacon (200) and GA phone_click.
His second ask — capturing visitor emails from cookies — declined: not technically
possible and a privacy-law violation; offered form-captures and company-level
visitor ID (Leadfeeder-class) as the legit routes.

**Status:** shipped — LIVE.
