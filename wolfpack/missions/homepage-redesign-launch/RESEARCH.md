# Wolfpack Homepage Redesign Launch — Mission Research

**Started:** 2026-08-27

## 2026-08-27 — Design package inventory

- Source archive: `/Users/aom-inhouse/Downloads/Homepage redesign feedback.zip`.
- Homepage direction: `Wolfpack Evolution B v2.dc.html`.
- Shared comps: `Wolf Header.dc.html` and `Wolf Footer.dc.html`.
- Page-family comps: `Services.dc.html`, `Hydro Jetting.dc.html`, `Property Managers.dc.html`, `General Contractors.dc.html`, and `Scottsdale.dc.html`.
- Supplied media includes brand assets, current project photography, before/after pipe images, and image-generation explorations.
- Desktop and mobile renders were inspected before planning. The mobile comps need a deliberate polish pass for headline fit, grid stacking, sticky navigation, tap targets, and image crops.

## 2026-08-27 — Existing site and hosting

- `https://wolfpackcompanies.com` currently resolves to GoDaddy Websites + Marketing (`Server: DPS/2.0.0`) and serves images primarily from GoDaddy's image CDN.
- The replacement source contains 27 static pages under `public/wolfpack-site/` and 33 local media files before importing the feedback package or current-site archive.
- The current request form does not transmit a lead. It writes data to the visitor's `localStorage` and then shows a success panel.
- The replacement currently uses `/wolfpack-site/` URL prefixes, which must be made canonical-domain safe without breaking the retained AOM rollback copy.

## 2026-08-27 — Vercel cost check

- A project itself has no added fixed monthly charge on the existing Vercel team.
- Pro permits unlimited projects and bills pooled infrastructure usage; the Wolfpack static site should remain within existing usage unless traffic or optional add-ons materially increase.

## 2026-08-27 — GoDaddy image preservation archive

- Archived the live GoDaddy site from `https://wolfpackcompanies.com/` before any DNS change.
- Archive path: `wolfpack/missions/homepage-redesign-launch/research/godaddy-2026-08-27/`.
- Captured 36 unique image files from 2 same-origin navigation pages, totaling 5,136,814 bytes.
- `manifest.json` records source URLs, discovered responsive variants, MIME types, byte counts, and SHA-256 hashes for every archived file.
- Fix Round 1 verified all 15 distinct live `data-srcsetlazy` GoDaddy asset keys are represented in the regenerated manifest; no lazy asset is missing.
