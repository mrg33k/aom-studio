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

### R2 — 2026-09-28 — Phone-sized cards, thumbnail covers, big logos (Patrik's notes)
- Covers are now YouTube-style thumbnails of each client's most social moment, built by
  `build_covers.py` (this folder): Ambition = crane day (chiller on the hook), Wolfpack = hydro jetting,
  Oak Street = fire before/after with Tim's face, Kody = his "dry heat" frame (kept as is, Patrik liked it).
  Ambition and Wolfpack covers come from their photo libraries, not from the three picked reels; re-run the
  script on a real frame once those clips are on gumlet.
- Cards are phones: bezel, 9:16 screen, height = viewport minus the header (max 44rem), in a swipe rail with
  arrow buttons on desktop. The free-clips form is the last phone ("Your show here").
- Logos sit large and centered in a brand-color header band on every card; Kody got a KR + "Arizona Living"
  wordmark (he has no logo file). Overlay header logo enlarged to match.
- Rechecked at 1440×900 and 390×844: phones fit whole on desktop, rail scrolls to the form, overlay opens.

**Status:** R2 pushed to `clips-packages`; still awaiting clip ids before merge.

### R3 — 2026-09-28 — Covers in each brand's own reel design, true phone proportions, live background
Patrik: Ambition/Wolfpack looked alike (same blocky names), logos sat in a plain black band, the section
background was flat, and the cards still felt short.
- Covers are now 1080x2340 (a phone screen, 9:19.5), each in that client's own reel system with the logo
  placed where the system puts it: Ambition = its GPT reel plate (halftone navy, red torn strip) with the badge as
  a sticker on the footage; Wolfpack = its paper/Archivo/blue look with the full-colour logo as a masthead;
  Oak Street = logo masthead over the fire before/after; Kody = Arizona Living wordmark over his real frame
  (his looping clip plays exactly over that frame on the card).
- The black logo band is gone. The bottom of each phone is an Instagram-style account row (round avatar,
  name, kind · 3 clips, play button in the client's accent), neutral platform type so brand type stays in the art.
- Phones are 9:19.5 with a notch and sized to the viewport under a one-line header; background is the four
  covers blurred and drifting, so the section carries the clients' colours.

**Status:** R3 pushed to `clips-packages`; still awaiting clip ids before merge.
