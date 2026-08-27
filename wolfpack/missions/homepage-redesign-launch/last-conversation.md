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
