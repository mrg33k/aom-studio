# Ahead of Market Website Refresh — Mission Build Plan

**Started:** 2026-08-27
**Mission path:** `aom-site:website-refresh`

## Rounds

### R17 — Creative feed reset

- Replaced the mixed `/feed` video source with 52 curated examples focused only on creative construction and food videos.
- Split the feed into Construction and Food filters, removed AI, agent, music, and generic workflow lanes from this surface.
- Preserved the snap-scroll video experience and made each card open a YouTube search for the exact example.
- Verified the data shape, inline script syntax, filter rendering, and production build.

**Status:** shipped to `https://aheadofmarket.com/feed`

### R18 — TikTok vertical previews

- Switched feed destinations from YouTube to TikTok search results.
- Kept the 9:16 snap-scroll layout and added a unique branded image preview for every item.
- Verified the two filters, 52-item data set, preview rendering, and production build.

**Status:** shipped to `https://aheadofmarket.com/feed`

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

### R6 — Isolate the slider preview

**Status:** shipped and verified on canonical production

Restored the previous `HomeR6Baby` experience at `/` and moved the endless-loop build to `/slider` while it continues through polish. The slider’s own brand link stays on `/slider`; focused tests, production build, and canonical browser checks for both `/` and `/slider` pass.

### R? — v4 homepage top sections integrated on /v4 (2026-09-18)
Imported the Claude Design "Home - Full Site v4" and ported the first four sections into the React app, behind a preview route so live `/` (HomeR6Baby) is untouched.
- New route: `/v4` -> `src/pages/HomeV4.jsx`.
- Sections: `src/components/homev4/` — HeroV4 (reel crossfade + interactive questionnaire + rotating Google reviews + email capture), BillboardV4, TwoPartsV4, PipelineV4.
- **Content model:** ALL copy/images/links live in ONE file — `src/data/homeV4Content.js`. This is the single edit surface for the marketing team. (Next step per Patrik: optional in-dashboard editor on top of this same file, no rework.)
- Assets: reels reuse `public/videos/reel-*.mp4`; monogram via shared BrandMark; client logo marks in `public/home-v4/assets/logos/`. Billboard collage uses placeholder JPGs from `public/home2026/` until the real v4 photos are pulled from the design project.
- Verified in browser: all 4 sections render; questionnaire runs to the payoff state; reel plays; reviews rotate.
**Status:** in progress — first look ready for Patrik's ship/redo call. Pending: real v4 imagery (collage + case photos), the hero scroll choreography (stinger + parallax) if wanted, remaining sections (Department, Cases, Work, Voices, Contact).

### R? — v4 switched to embedding the REAL design file (2026-09-18)
Patrik reviewed the hand-built React port and flagged it as an "older version" missing the intro animation, questionnaire polish, and the lower sections. Pivoted: `/v4` now serves the ACTUAL Claude Design "Home - Full Site v4" file with its own runtime (`public/home-v4/` = dc.html + React UMD + support.js + _ds_bundle.js), pulled all 28 real photos + reels. Verified: 0 broken images, 13 sections render (Hero→Contact), hero + ISA case match Patrik's references. 4 case photos are stand-ins (came inline, not persisted); nav monogram is a substitute. Next: real 4 photos + exact monogram, self-host React, then lift inline data → editable content file + in-dashboard editor (the original content-control ask).
**Status:** first faithful look ready for Patrik.

### R-2026-09-22c — scroll/eyebrows/icons/forms/modal round live
Commits 5f27a67b (rebased ae8315f0) + 38c274ff. Focus mode releases on scroll-away, iOS scroll containment, eyebrows removed, centered animated department icons (no numbers), industry sections without the gold square + prominent pill buttons, boxed lead forms with plain labels, How-we-can-help request modal, phone hero flush to top. Verified on the live domain at phone size.
**Status:** live. Waiting on Patrik's phone for the iOS bottom-of-page scroll check.
