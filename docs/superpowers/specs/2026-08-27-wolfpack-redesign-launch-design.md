# Wolfpack Redesign and Launch Design

**Date:** 2026-08-27
**Mission:** `wolfpack:homepage-redesign-launch`
**Canonical domain:** `https://wolfpackcompanies.com`

## Outcome

Replace Wolfpack's GoDaddy Websites + Marketing site with a production-ready, independently deployed site that follows the approved feedback package across all 27 existing pages. The site must retain each page's useful content and search intent, work cleanly across phone through wide desktop sizes, send real leads to both required inboxes, and preserve the old site's images before DNS cutover.

## Approved visual direction

`Wolfpack Evolution B v2.dc.html` is the homepage source of truth. Its identity is a dark industrial field, Wolfpack blue as the single active accent, condensed Archivo display typography, Inter body copy, IBM Plex Mono utility labels, strong job photography, visible project proof, and direct commercial-plumbing language. The design's signature is the combination of oversized condensed statements with real work imagery and documented before/after proof.

The supplied `Wolf Header` and `Wolf Footer` comps define the shared shell. The supplied service index, hydro jetting, property manager, general contractor, and Scottsdale comps define the inner-page families. The implementation will preserve those choices instead of inventing a competing design system.

## Page families

The 27 current routes will be generated or assembled from shared source partials so site-wide updates do not require hand-editing every file.

1. **Homepage:** the approved Evolution B v2 composition, with real links and production-safe interactions.
2. **Service index:** the supplied services composition, routing visitors to the individual service pages.
3. **Service detail:** hydro jetting is the fully articulated flagship. Drain cleaning, air compressor installation, backflow testing, water heaters and boilers, under-slab leak detection, emergency response, and maintenance-related content reuse the same visual grammar while keeping service-specific proof, copy, metadata, and imagery.
4. **Audience pages:** property managers and general contractors each follow their supplied specialized comp because their jobs, objections, and proof differ.
5. **City pages:** Scottsdale defines the reusable city structure. The remaining city routes keep unique city names, titles, descriptions, headings, nearby-city links, and any useful local wording.
6. **Contact and utility pages:** contact keeps the shared shell and provides the clearest call, email, and request paths without pretending an unsent request succeeded.

## Asset preservation and selection

Before DNS changes, crawl the current GoDaddy page and every reachable same-site page, collect all image source and responsive-source URLs, download the highest practical resolution of each unique image, and record the source URL plus local filename in a manifest. Keep this archive separate from the curated production assets so preservation does not automatically bloat the live site.

Import the feedback package's approved brand and job imagery. Production pages will use only selected, compressed versions with explicit dimensions and useful alternative text. Existing live-site images will be available to fill factual gaps or restore anything the new package omitted, but generated explorations will not be treated as documentary proof where a real project photo is required.

## Shared behavior

- One responsive header, service navigation, mobile menu, emergency-call action, theme behavior, footer, and lead form across all routes.
- Internal links resolve at the root domain on Wolfpack production and remain testable in the retained AOM fallback copy.
- Phone links use `602-550-5452`; email links use `Service@wolfpackcompanies.com` unless a section explicitly explains the AOM copy recipient.
- Motion is restrained, does not hide core content before JavaScript runs, and is disabled when the visitor requests reduced motion.
- Keyboard focus, menu state, dialog focus, labels, contrast, and tap targets are launch requirements.

## Lead delivery

Every request form posts to a server endpoint rather than storing the submission only in the browser. The endpoint validates and bounds fields, rejects obvious automated spam, applies basic rate limiting, and sends one lead notification to both `Service@wolfpackcompanies.com` and `hello@aom-inhouse.com`. The message includes the visitor's contact details, selected need, source page, timestamp, and referring URL when available.

The browser shows success only after the endpoint confirms accepted delivery. On failure, the form keeps the entered values and shows a direct call and email fallback. Secrets remain server-side. The endpoint will be tested without sending uncontrolled messages to third parties.

## Mobile polish contract

Each template family will be checked at representative widths around 320, 360, 390, 430, 768, 1024, 1280, and 1440 pixels. The pass covers headline wrapping, minimum readable copy, image crops, section rhythm, sticky elements, menu and dialog reachability, horizontal overflow, card stacking, before/after labels, footer density, form keyboards, safe-area spacing, and 44-pixel interaction targets.

The mobile result is not a shrunken desktop page. Dense desktop comparisons and galleries will become clear vertical sequences, proof stays near the claim it supports, and the emergency call path remains reachable without obscuring content.

## Search, performance, and continuity

Preserve or improve each route's title, description, canonical URL, primary heading, service/city wording, image alternative text, and internal links. Produce a sitemap and robots policy for the canonical domain. Add redirects for any GoDaddy URLs discovered during the archive so existing links do not become dead ends.

Compress and size images for their display roles, preload only the true above-the-fold asset, lazy-load below-the-fold media, avoid layout shifts, and keep JavaScript small. Verification will include broken links, missing assets, console errors, form failure/success states, responsive screenshots, and a production build.

## Hosting and release

Create a separate Vercel project for Wolfpack from this repository so Wolfpack and AOM deployments are isolated. The project has no fixed added project fee; its usage joins the team's normal allowance. The AOM-hosted `/wolfpack-site/` path remains available as rollback coverage, but it is not the canonical production URL.

Release sequence:

1. Archive GoDaddy images and record current URLs before any DNS change.
2. Build and verify the redesigned site locally.
3. Deploy the isolated Vercel project to a preview URL.
4. Obtain Patrik's explicit preview approval.
5. Add and verify `wolfpackcompanies.com` and `www.wolfpackcompanies.com` on the Wolfpack Vercel project.
6. Change only the required GoDaddy DNS records, preserving mail-related records.
7. Verify TLS, apex/`www` canonical behavior, every critical route, images, lead delivery, metadata, redirects, and mobile rendering on the real domain.
8. Keep the prior DNS values and the AOM fallback path recorded for rollback.

## Safety boundaries

- Do not change DNS before preview approval.
- Do not delete or replace MX, SPF, DKIM, DMARC, or other mail records during the website cutover.
- Do not claim a lead was received unless the server accepted delivery.
- Do not deploy unrelated dirty-worktree changes.
- Do not use the GoDaddy site or the AOM fallback path as final production proof after cutover.

## Acceptance

The mission is complete when all 27 routes use the approved design families, all template families pass mobile and desktop QA, current GoDaddy images are archived with a manifest, forms deliver to both inboxes, the isolated Vercel preview is approved, the GoDaddy domain points to the verified Wolfpack project without disrupting email, and the canonical domain passes the release checklist.
