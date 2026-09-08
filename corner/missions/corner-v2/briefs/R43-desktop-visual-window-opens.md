# Brief R43-desktop-visual-window-opens — when the Visual Window opens, the thread keeps its place and the composer keeps its shape

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R41-desktop-follow-the-reply.md` (the round you extend), `punch-list.md` rows
**L034-L036**. Tree: `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration` (HEAD `06df502`, clean;
production = this tree). Report: `rounds/R43-desktop-visual-window-opens.md`.

You are a headless worker, BUILDER for the desktop web app. Nobody will answer questions.

## What the orchestrator saw on production at 6:01 AM (`/tmp/img-walk-50s.png`)
An image ask on the Wolfpack thread. The image landed in the Visual Window at ~30 s (pipeline fine). But
the moment the window opened and the thread column narrowed:
- **L034** the R41 pin released: a "↓ New messages" pill sits over the last row, which is cut off under the
  composer. The layout shift (column width change) moved the scroll position, the pin read "user scrolled
  up", and the follow stopped. A layout shift is not a user scroll: re-measure and keep the pin.
- **L035** the composer wrapped: paperclip, sparkle, Record, the "Wolfpack" label, then the send arrow on a
  second row. At the narrow column the pill must compact (icon-only Record, drop the target label into the
  placeholder) — the send button never wraps, at 1440, 1280 and 1024.
- **L036** the image stage footer reads "Add pages: slots are static this round." — meaningless to Patrik.
  Replace with the design's image-stage footer (or nothing); if the stage has page slots, say what they do
  in five plain words.

## Build
1. Pin survives layout shifts: observe the thread column's width (ResizeObserver) and the Visual Window
   open/close; on a size change while pinned, scroll to the end again without raising the pill.
2. Composer compaction below a measured width (container query or ResizeObserver, not viewport): one row
   always; the send button is the last item and never wraps; trays still fit.
3. Footer copy per the design export for the photo stage.
4. e2e (offline stand-in): open a thread pinned at the bottom → open an artifact tab → assert the newest row
   is fully above the composer and no pill; resize the column to 420px → assert the composer is one row and
   the send button is inside the pill.

Gates: lint 0 errors, tsc clean, vitest (202+), offline e2e (`PW_PORT=5174`, `--output e2e/results-orch`,
ONCE at the end — native UI suites share the machine), `npm run test:design` 0/0 on your preview
(`LIVE_BASE_URL`, prebuilt deploy with `VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud` and
`VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site`), live suite 11 pass / 0 fail. Commit on
`corner-v2-integration` with scoped paths; never `--prod`; never touch `neat-pony-216`; no `convex/` edits.
Report: before/after PNGs at 1440 with the window open, gates, commits, "for the orchestrator", "still off".
