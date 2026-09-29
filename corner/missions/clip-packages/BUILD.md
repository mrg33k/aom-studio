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

### R4 — 2026-09-28 — Ambition and Wolfpack rebuilt as real reels
Patrik: Ambition and Wolfpack still looked bad next to Kody and Oak Street. Cause: those two were real reel frames;
Ambition/Wolfpack were library photos with a layout on top.
- Ambition now uses its real finished reel (`public/videos/ambition-vertical.mp4`, operating-rooms RTU job): the
  12.6 s frame (unit on the crane, deep blue sky, the reel's own "patients" caption) under a masthead cut from its
  GPT reel plate (halftone navy, badge on a red disc), hook "OPERATING ROOMS WENT DOWN." on the plate's own red
  torn strip. The reel is clip 1 of the package (`ambition/rtu.mp4`, 3.4 MB), so Ambition plays today.
  Package is now: that reel, Elephante part two, EWG (Eagle Air Park dropped to keep three).
- Wolfpack is built like one of its reels: blue-glow masthead with the knockout logo, `jet-hero.jpg` full bleed,
  "SEWER LINE, BEFORE & AFTER" hook, and its own before/after sewer-camera shots as round insets.
  Swap for a real Wolfpack reel frame once one is reachable (all Wolfpack video is in Drive, 50 MB+).

**Status:** R4 pushed; 10 clips still need gumlet ids before merge.

### R5 — 2026-09-28 — Headline A/B test, logos clear of the phone earpiece
- Headline is now an A/B test, independent of the hero-order test: a = "Long-form to short-form",
  b = "Your videos, cut by our team". Sticky per browser (localStorage `aom_ab_clips`), `?clipsab=a|b` forces,
  `?clipsab=off` forgets. GA4 user property `exp_clips_head`; every event (section_view/section_time, clips_pack_open,
  clips_play, lead_submit, generate_lead) carries `abc`. The hero test's page_location is untouched.
- Ambition badge (180 px on a red disc) and Wolfpack logo (210 px) shrunk and moved below the earpiece;
  Oak Street logo nudged down to match. Kody unchanged.

**Status:** R5 pushed; 10 clips still need gumlet ids before merge.

### R6 — 2026-09-28 — Ambition cover in its LinkedIn system; new order
- Order is now Kody, Wolfpack, Oak Street, Ambition (Patrik).
- Ambition cover rebuilt in the system of its approved LinkedIn/"Social Posts" series (AOM-EA
  ambition-mechanical/deliverables/social/carousel-field-crew): radial navy #1A2140 -> #0E1426 with the 16 px
  halftone grid, round badge on a white disc under the earpiece, "OPERATING ROOMS" white / "WENT DOWN." red in
  Barlow Condensed, the real reel's crane frame (12.4 s, cropped above the caption band) fading into the navy,
  and the subline "The swap that keeps surgeries running." from the reel's own captions.

**Status:** R6 pushed; 10 clips still need gumlet ids before merge.

### R7 — 2026-09-28 — Every clip gets its own cover
Patrik: every video in the samples needs a cover as good as the package covers, specific to that video.
- `build_covers.py` `clip_covers()` writes `<slug>/c1..c3.jpg` (1080x2340 source, 720x1560 out); c1 = the package cover.
  One template per client system, hook and imagery taken from that clip's own content:
  - Kody (plans + BUILD-READY): heat (real frame) / "Phoenix is affordable, but not dirt cheap" + suburbs under the
    mountains + "Costs are likely to rise" / "Why 55+ communities feel empty every summer" + Sun City + "Before they buy,
    not after." Masthead, serif hook with one gold word, his desk shot, caption bar with one amber word, photo panel.
  - Oak Street (clip plans): fire / "$265 billion reason to watch Phoenix" + TSMC Fab 21 + $265B stat / "Why new homes in
    Arizona save water" + the farms -> now neighborhoods. Logo masthead, slab hook with lime box, Tim on the seam.
  - Wolfpack: sewer before/after / "Toilet won't stop running? The fix: a new diaphragm" (pm-hero) / Vecina restaurant
    plumbing top out with the job list from its LinkedIn draft (new floor drains, fresh copper, 2" gas line, 8 drops).
  - Ambition (reel captions): operating rooms / Élephante "Dirty filters every 3 months" + "Arizona is a very dusty
    place." / EWG "Swamp coolers out. Real AC in." + "New units craned onto the roof." LinkedIn navy system.
- CC BY / BY-SA credit lines are drawn on every stock photo (Kody, Oak Street).
- Clip titles in PACKS now name each video; package-view tiles are phones (9:19.5) so covers show whole; header logo
  hidden on phones (each cover already carries it).
- Covers from library photos (not reel frames): Wolfpack toilet + Vecina, Ambition Élephante + EWG. Swap to real
  frames when those reels are reachable.

**Status:** R7 pushed; 10 clips still need gumlet ids before merge.

### R8 — 2026-09-29 — Production-clean, merged to main
Patrik: "get it done." No Gumlet credentials exist in this environment, so the 10 remaining reels can't be uploaded
from here. Shipped anyway, clean:
- A clip without a video shows its cover only: no "Uploading" badge, no play button, no dead-looking state.
  Kody's dry-heat clip and Ambition's operating-rooms reel play (local mp4s).
- Every waiting clip has `id: ''` in PACKS; pasting its gumlet id puts it live (play button appears automatically).
- QA (headless Chromium, 1440x900 + 390x844, both headline variants): 4 packages + form render, overlay opens/closes
  (Escape), waiting tiles inert, no page errors.

**Status:** merged to main (live). Open: 10 gumlet ids; then re-cover Wolfpack toilet/Vecina and Ambition
Élephante/EWG from real frames.
