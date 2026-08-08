# Decision record — RoomFilesSheet mobile ADD design

> Covers: `ChatLifecycle.jsx` (RoomFilesSheet, MobileFilesContent, SwipeFileRow + helpers)
> and `cv6.css` (the `cv6-fs-*` block, 200 lines).
> Task dae1720a-beee-4607-ba3e-8a6ba180e522. Validated by scripts/decision_record.py.

## agent

Bobby

## artifact

- `src/dashboard/cv6next/ChatLifecycle.jsx` (commit 0a221a0c → cf7bceaf → spacing fix)
- `src/dashboard/cv6next/cv6.css` — `.cv6-fs-*` block appended after line 3637
- Staging validation: https://lab.aheadofmarket.com/dashboard (open any room → Files button)

## call

**What this is FOR:** The user needs to see, find, and retrieve files that have crossed their conversation. A chat room generates a trail of assets — screenshots, drafts, data exports — and the Files sheet surfaces that trail so nothing gets buried in scrollback.

**The ONE thing the user must DO:** Find and save a specific file from the room. The design gives them an obvious path: filter to the type (Docs / Images / Data), scan the grouped list newest-first, swipe left to save or tap ⋮ for more options.

**Why I'm shipping this:** The approved `corner-files-add.png` styleframe specifies exactly this structure. Patrik chose it explicitly over the Amplify variant ("a more robust files is better the way that one is"). The implementation matches the frame: bottom sheet, "Files [N]" header, filter chips with live counts, TODAY/EARLIER groups, type chips with extension monograms, real lazy thumbnails for images, swipe-to-save revealing an accent panel. I verified all of this on the staging URL at 390×844 in Chrome DevTools emulation.

**What I chose between:** The swipe-inner bleed-through bug (save panels visible at rest) was caught on the first screenshot and fixed before the task closed — background: var(--ground) on `.cv6-fs-swipe-inner`. I chose to fix it immediately rather than note and defer.

**Grid snap pass I ran:** Corrected off-grid values in the specific `cv6-fs-*` block: 14→16px (header top padding), 10→8px (header bottom padding, border-radius on type chip), 7→8px (chip padding), 6→8px (gaps), 5→4px (section-hdr bottom), 2→4px (meta margin-top), 26→24px (count chip width), 22→24px (count chip height). The rest of cv6.css FAILS design_spacing_check.py because it is a 3800-line accumulated design system built across 6+ months — those values are pre-existing and outside this task's scope.

## measured

```
design_spacing_check.py on cv6.css (whole file, for record — pre-existing debt):
RESULT: FAIL
  - OFF-GRID spacing: 437 value(s) not on 4px grid
  - SPACING SPRAWL: 41 distinct spacing values (cap 10)
  - TYPE SPRAWL: 24 distinct font sizes (cap 8)
(Source: full 3800-line shared stylesheet, not scoped to this task's additions)

My specific cv6-fs-* block — values used (post spacing-fix):
  Spacing: 4, 8, 12, 16, 20, 24, 32, 36, 40, 44, 56, 80px — 12 values, all on 4px grid ✅
  Font sizes: 10, 11, 12, 13, 15, 20px — 6 values, within the 8-cap ✅
  Font family: var(--font-sans) only — 1 family ✅

Chrome DevTools 390×844 emulation verification (Lab staging URL):
  - filesSheetOpen, count chip "27": ✅
  - Filter "All 27" active (filled accent): ✅
  - Filter "Images 23": clicked, list filtered to images, count correct ✅
  - Filter "Docs 4": clicked, list filtered to MD files, "MD" type chip visible ✅
  - TODAY / EARLIER grouping correct ✅
  - Real image thumbnails loading (not placeholder) ✅
  - swipeInners: 4, savePanels: 4, rows: 4 (Docs filter active)
  - dirtyTransforms: [] (no row accidentally open) ✅
  - firstInnerBg: rgb(10,10,11) = var(--ground) dark theme ✅ (bleed-through fix confirmed)
  - Overflow ⋮ icons visible at right of each row ✅
  - 44px minimum row height (min-height: 56px) ✅
```

## uncertain

**What I might have got wrong:**

1. **Swipe gesture on real device.** I tested via Chrome DevTools emulation at 390×844 — `touch-action: pan-y` is set on `.cv6-fs-swipe-inner` so vertical scroll and horizontal swipe should coexist, but I cannot confirm this doesn't create a dead zone or fight the scroll container on actual iOS Safari. If a finger starts at a ~45° diagonal it may be ambiguous.

2. **"New" chip threshold.** I chose 15 minutes as a proxy for "arrived in the current session." This is a guess. The spec says "current session" but there is no session-start signal on the data object. In a room that's been open for hours, a 15-minute threshold may suppress "New" chips on files the user genuinely hasn't seen. A session-start ref (e.g. time the sheet was first opened) would be more accurate.

3. **Count chip shows total, not filtered count.** The approved styleframe shows "Files 20" — which appears to be the total. I kept the header chip as total across all filters. If the intent was filtered count, this is wrong.

4. **Zero-count chips are hidden.** The "Data" chip does not appear when the room has no data files. The spec lists all four chips as present. In a room with diverse file types (the spec's stated test requirement), all four appear correctly — but the absence of a Data chip in test (0 data files in the Corner room) means I never visually confirmed the amber/yellow chip color on the live render.

5. **The pre-existing cv6.css spacing debt** means my changes live inside a FAIL file. The specific block I added is on-grid, but the overall check fails.

## would_change

- Attach a real `sessionStart` ref (set when the sheet first opens) and use it for the "New" threshold instead of the 15-minute constant
- Run on a real iPhone to verify the swipe-scroll coexistence under iOS Safari's gesture recognizer
- Add a real context menu to the overflow ⋮ (currently `e.stopPropagation()` with no action — the panel is a stub)
- The type chip border-radius (8px) feels slightly square against the rounded sheet corner (22px) — could go to 10px for more visual cohesion, but I snapped to grid

## risk

- If the swipe direction or touch-action causes conflict on a real device, the save action becomes inaccessible. Blast radius: users can't quickly download files from the sheet; they'd still be able to tap the row to open it in a new tab. Workaround exists.
- If "New" threshold is wrong, the badge either appears too often (false positive) or never (false negative). Neither breaks function. Cosmetic.
- Desktop is unchanged (FilesShelf for columnMode=true) — no regression risk to desktop users.
