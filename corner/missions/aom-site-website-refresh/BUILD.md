# Ahead of Market Website Refresh — Mission Build Plan

**Started:** 2026-08-27
**Mission path:** `aom-site:website-refresh`

## Rounds

### R1 — Handoff translation and mobile polish

**Status:** shipped and verified on canonical production

The Claude handoff is a self-contained interactive homepage with a floating dock, portfolio cards, detail overlays, and a mobile breakpoint. The current `/` route renders `HomeR6Baby`; the target is to preserve the existing route ecosystem and brief modal while replacing only the public homepage experience.

Implemented:

- Added `AOMStudioHome` as the new `/` route.
- Added six local portfolio cards using existing AOM project imagery.
- Added mobile-first swipeable rail, arrow controls, menu dialog, keyboard Escape close, and project detail overlays.
- Reused the existing `BriefModal` for all work-with-us CTAs.
- Verified focused homepage test, production build, local asset resolution, zero horizontal overflow at 390px and 1440px, and mobile overlay dismissal.
- Published the validated release to the configured `aom-studio` Vercel project and confirmed the new main bundle is served at `https://aheadofmarket.com/` and `https://www.aheadofmarket.com/`.
