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

### R2 — Correct the homepage to the endless-loop handoff

**Status:** shipped and verified on canonical production

Patrik clarified that the intended handoff is the “Marketing site — endless loop” concept, not a conventional editorial homepage. Replaced the R1 surface with the handoff model: warm-white one-viewport stage, obsidian monochrome cards, automatic drift, wheel and pointer-drag inertia, wraparound positioning, museum label/ticks, teleport dock navigation, and card detail overlays. Focused tests, production build, and browser checks at 390px and 1440px pass. Published the corrected release and confirmed its lazy homepage chunk is served at `https://aheadofmarket.com/`.

### R3 — Align visual details with loop source of truth

**Status:** shipped and verified on canonical production

Ported the handoff’s exact visual rules into the React loop: white graph-paper story/ask grounds, fixed corner tag slots with one filled tag, background-size highlight wipe, staggered bordered option buttons, centered 1fr rail spacing, two-layer active-card ambience, obsidian CTA, and the `05 —— 05` step bar. Fixed pointer drag origin capture and verified the focused homepage tests, production build, and browser behavior at 390px and 1440px. Published the exact commit to the production Vercel project and verified the canonical `www.aheadofmarket.com` assets contain the new loop implementation.

### R4 — Center loop headlines

**Status:** shipped and verified on canonical production

Restored the handoff’s centered headline flow for story cards and kept the ask-card headline independently positioned above its option stack. Verified the result at 390px and 2048px, with story headlines no longer pinned to the lower edge or crossed by corner tags. Published the exact commit to production and confirmed the canonical CSS contains the centered headline rule.

### R5 — Keep mobile ask card readable

**Status:** shipped and verified on canonical production

Moved the mobile card 05 headline above its four option rows so the question remains fully visible. Verified card 05 and the “How it works” story card in live browser checks at 390px, then reran the focused homepage tests and production build. Published the exact commit to production and confirmed the canonical domain returns 200.
