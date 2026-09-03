# Wolfpack Homepage Redesign Launch — Last Conversation

## 2026-08-27 — Scope and launch approach approved

Patrik asked to get Wolfpack live at `wolfpackcompanies.com`, using the supplied redesign across the entire site and completing a mobile polish pass before launch. He confirmed that `Wolfpack Evolution B v2` is the newest homepage direction and that the package's page-specific designs should become templates for cities, services, and the other page families.

The current GoDaddy site's images must all be downloaded before the switch. Contact requests must be sent to both `Service@wolfpackcompanies.com` and `hello@aom-inhouse.com`; the current implementation only stores a lead in the visitor's browser and is not acceptable for launch.

Patrik approved hosting Wolfpack as a separate Vercel project sourced from this repository. The project itself does not add a fixed monthly fee; normal pooled usage still applies. The release sequence is archive, rebuild, mobile and functional QA, separate-project preview, Patrik approval, GoDaddy DNS cutover, canonical-domain verification, and retention of the AOM path as rollback coverage.

Patrik reviewed the written design and said to proceed. The implementation plan now lives at `docs/superpowers/plans/2026-08-27-wolfpack-redesign-launch.md`; it divides the work into nine testable tasks and preserves a hard approval gate between the Vercel preview and GoDaddy DNS changes.

## 2026-08-27 — GoDaddy image archive preserved

The live GoDaddy site was crawled with Playwright before DNS changes. The archive at `research/godaddy-2026-08-27/` contains 21 unique image files (1,371,215 bytes) from 2 same-origin pages; each manifest entry has a source URL, all discovered variants, MIME type, byte count, and SHA-256 hash. Focused archive tests pass, manifest hashes and MIME types were rechecked, and no archived file exceeds 90 MB.

## 2026-08-27 — Archive Fix Round 1

Review found that a nonempty placeholder `srcset` suppressed GoDaddy's real `data-srcsetlazy` URLs. Discovery now collects both attributes independently, and the archive was rebuilt from scratch. The corrected manifest contains 36 unique image files (5,136,814 bytes); a live read-only comparison confirmed all 15 distinct lazy GoDaddy asset keys are represented, with no missing lazy asset. Hash, MIME type, byte-size, and 90 MB cap checks pass.

## 2026-08-27 — Isolated static-site scaffold

Added `wolfpack-site/` as the deployable Node ESM boundary without changing `public/wolfpack-site/`. It has 27 exact route records, a stable `buildSite({ outDir })` and `renderPage(page, site)` contract, shared CSS/JavaScript/assets output, and generated `404.html`, `robots.txt`, and `sitemap.xml`. Focused build tests pass and the production build emits all 27 `index.html` route files.

## 2026-08-27 — Task 2 route contract fix

The route test now uses the literal required 27-slug list and asserts the complete `buildSite` result paths. A mutation check confirmed a renamed route and a non-`index.html` inner output both fail the focused test; the valid implementation and all 27 expected paths pass.

---

2026-08-27 ~04:10 — Background Claude session (service page family, R5). Built the 7 service detail pages (hydro-jetting, drain-cleaning, air-compressor, backflow-testing, water-heaters, leak-detection, emergency) plus the services overview from the Hydro Jetting / Services comps. New files: src/templates/service.mjs, src/templates/service-index.mjs, src/data/services.mjs; svc2- CSS appended; 8 routes got kind + unique titles/descriptions in pages.mjs; 6 tests appended (12/12 pass). All copy verbatim from public/wolfpack-site sources; only the new numbered work photos + pipe before/afters used. Air-compressor's live benefit cards/steps were drain-cleaning duplicates, so that page omits them (flagged for real copy later). Overview grid adds an Air Compressor card (missing from the live grid) so all 7 services + property-managers + general-contractors are linked. Verified via Playwright screenshots desktop+mobile, no overflow/console errors. Commit 560d01a4 (also carries a concurrent agent's 44px tap-target fix in site.css header buttons). Not committed: mission-file updates, other agents' unrelated worktree changes.

---
2026-08-27 — R6 background session (Claude): shipped the final 18 routes — property-managers, general-contractors, 15 city pages (Scottsdale comp template + src/data/cities.mjs), and the contact page (no comp; inline lead form reusing the drawer structure, posting to /api/lead with honeypot; page script hands data-lead-form back to the drawer so both forms work). 43/43 tests pass, new `npm run check:links` verifies 2,414 internal refs, Playwright-verified 1440+390 on 4 routes (screenshots /tmp/wolfpack-r6/). Substitution: comp's 13-backflow-a image does not exist, used work/13-backflow-b.jpg. GC grid min 260→300px to avoid orphan cells at 1440. Commits 7e6a9d50 (+ docs hash commit). All 27 routes now render real bodies; next queued rounds: R3 mobile polish QA, R4 launch.

## 2026-08-27 — Launch session (Claude Code background, taking over from Codex)
Wolfpack redesign is LIVE at https://wolfpackcompanies.com. Codex Tasks 1-2 inherited; this
session shipped shell (a7be3d7b), homepage (806832ed), lead API (8d1ee4b3), service family
(560d01a4), audience/city/contact (7e6a9d50), QA harness + decision record (38e05f25),
QA green (2e51575a). Cutover: GoDaddy apex A -> 76.76.21.21 via browser with Patrik's SMS
verify; cert force-issued; all 27 routes 200; mail DNS untouched. Open: RESEND_API_KEY.

## 2026-08-27 ~10:30 AM Phoenix — R8 mobile polish from Patrik's phone review

Patrik reviewed the live site on his phone and sent three screenshots: mono typefaces must go
entirely, the tiny eyebrows and numbered-section labels are too small, the mobile header is
squished (theme toggle + edge-bleeding call block + clipped service-rail strip), and the hero
wolf watermark renders vertically stretched. Root cause of the stretch: the global
`img { max-width: 100% }` caps the watermark's width at the viewport while its height stays
88% of the hero.

Shipped R8 in the worktree (commits 45adc071, 3c3f5f3a, pushed to origin): all ~30 IBM Plex
Mono styles replaced with Archivo labels/numbers or quiet Inter at 12-16px, IBM Plex Mono
dropped from the font load, mobile header rebuilt (wordmark back, theme toggle moved into the
menu, compact call button, service rail hidden on phones), and all three watermarks made
aspect-safe with deliberate mobile sizes. Playwright-verified at 390 and 320 wide, 43/43 tests.

NOT LIVE YET: the session's permission classifier blocked `vercel --prod` and the Vercel MCP.
Deploy command for whoever picks this up:
`cd .codex/worktrees/homepage-redesign-launch/wolfpack-site && vercel --prod --yes`

Update ~10:33 AM: Patrik granted the Vercel permission ("do it" / "go"); deployed to
production and aliased to wolfpackcompanies.com. Live checks green: no mono anywhere,
watermark aspect-true, clean mobile header, zero overflow. R8 is live.

Update ~10:50 AM: R9 shipped live — index numbers removed site-wide (process steps kept),
home hero eyebrow gone, hero fully centered including stats. Plus a real fix: immutable-cached
site.css/site.js now get content-hash URLs, so redeploys actually reach returning visitors.

Update ~1:45 PM: OG share image live — brand-recipe generation (real refs, letter-perfect
livery) + real logo/wordmark composite, 1200x630, og:*/twitter tags on all 27 routes,
content-hash versioned. Verified serving live.

---

## 2026-09-03 — R11: Google review button in the top bar (rex, background session)

Patrik asked for a top-bar option where customers invited by link can leave a Google
review — standout, Google-official, straight to the review form. Pulled the live place
ID from Maps (ChIJWViif6VtK4cRNK7_zrcm320) and verified the writereview URL opens the
Wolfpack rate-and-review dialog. Added three placements in shell.mjs + site.css:
desktop white pill (real G mark, gold stars, "5.0 rated") beside the call CTA, mobile
full-width white strip under the header (non-sticky by design), mobile-menu entry.
Built, 43/43 tests, deployed `vercel --prod`, live-verified desktop + 390px on
wolfpackcompanies.com. GA tracks clicks via the existing handler (button_click with
link_url = writereview URL).
