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

### R3 — Mobile polish and launch QA

Test every template across phone, tablet, laptop, and wide desktop sizes; verify navigation, forms, calls, email links, accessibility, reduced motion, metadata, redirects, and performance.

**Status:** queued.

### R4 — Independent production launch

Create a separate Vercel project at no added fixed project fee, publish an approval preview, connect `wolfpackcompanies.com` only after approval, update GoDaddy DNS, and verify the canonical domain while preserving the AOM-hosted path as rollback coverage.

**Status:** queued.
