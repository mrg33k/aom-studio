# Clip Packages — Build Log

### R1 — 2026-09-28 — Package shelf + free-clips form on home-v4
- New `#clips` slide in `public/home-v4/index.html`: headline, free-clips form, four branded package cards.
- Tap a card → full-screen package in the client's color, type and brand board; three clip tiles play in place
  (local mp4 or gumlet embed), Escape/Close to exit, "Get 3 free clips" returns to the form.
- Free-clips form posts to the existing `/api/aom-lead` (intent `free-clips`, link in `notes`); own sent/error state.
- Menu gets a "Clips" item; section tracked as `clips` in section_view/section_time; `clips_pack_open`,
  `clips_play` and `lead_submit` (form `clips`) events.
- Assets in `public/home-v4/assets/clips/`: Kody (GPT board, heat clip 720p 2.6 MB + 80 KB card loop, cover),
  Oak Street (GPT board, fire frame, logo), Ambition (GPT post as board, job photo cover, badge logo), Wolfpack (logo).
- Checked in headless Chromium at 1440×900 and 390×844: renders, cards open, overlay closes, form fits.
  Headless Chromium has no H.264, so actual playback was not verified here.

**Open before merge:** 11 of 12 clips have no file. Each needs a gumlet id (or a local mp4) in `PACKS`:
Ambition ×3, Wolfpack ×3, Oak Street ×3 (fire/TSMC/water), Kody ×2 (cost, summer). Kody's heat clip uses the
30 s look-proof render; swap for the final render if it changed.

**Status:** built, pushed to branch `clips-packages`, awaiting clip ids.
