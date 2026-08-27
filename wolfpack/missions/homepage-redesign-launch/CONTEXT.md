# Wolfpack Homepage Redesign Launch — Mission Context

**Mission path:** `wolfpack:homepage-redesign-launch`
**What it is:** Redesign, mobile polish, lead capture, hosting separation, and production cutover for Wolfpack Companies.
**Status:** IN PROGRESS
**Scaffolded:** 2026-08-27

## Current state

The approved homepage direction is `Wolfpack Evolution B v2`. The feedback archive also supplies shared header/footer comps and individual comps for the service index, hydro jetting, property managers, general contractors, and Scottsdale; these define reusable template families for the remaining 27 pages. The current site at `wolfpackcompanies.com` is a GoDaddy Websites + Marketing site, while the newer static site is available under AOM at `/wolfpack-site/`.

Patrik approved a separate Vercel project, with no fixed added project fee, so Wolfpack releases remain isolated from AOM releases. Current GoDaddy images must be archived before cutover. Website requests must be delivered to both `Service@wolfpackcompanies.com` and `hello@aom-inhouse.com`; the existing local-only fake success behavior is prohibited. DNS changes require an approved preview and a verified rollback path.
