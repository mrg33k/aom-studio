# Brief R<N>-<platform>-review — look at every frame, write the punch list

Mission path: `corner:corner-smooth-loop`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-smooth-loop/`
Read `LOOP.md` first, then `features.md`, then the current `punch-list.md`, then the audit for your platform
(`corner-convex/FRONTEND-AUDIT.md` for web, `corner-convex/NATIVE-IOS-AUDIT.md` for native).

You are a headless worker. Nobody will answer questions. You are the REVIEWER this round: you look, you
judge, you write. You do not fix anything and you do not commit.

## Frames to review

<FRAME_PATHS>   (the orchestrator fills this in: absolute folder(s) with the PNGs from the latest run,
                 plus the run's summary/report path)

Open EVERY PNG with your file viewer. Do not skip any. Look at each one for at least the items below.
Frames come in device sets; compare the same frame across devices (small phone vs large phone vs iPad
or desktop) because most breaks show up as a difference between them.

## The bar

One question per frame: **would Patrik have to come back and mention this?** He is the founder and he
uses the app daily. He notices: clipped or wrapped text, misaligned rows, inconsistent spacing, type
under 11 pt, low-contrast labels, overlapping elements, controls hanging off the edge, empty areas that
should hold content, placeholder or debug text, a spinner where content should already be, a header
that scrolls away when it should stay, a composer not docked to the keyboard, a tap target under 44 pt,
the wrong theme colour on one element, a sheet that opens at the wrong height, a status bar or safe area
ignored, iPad content stretched full-width, inconsistent corner radii, icons of mixed weight, two
different greys for the same thing.

He does NOT care about: pixel-level anti-aliasing, things only a designer with a ruler would see,
anything that needs a new feature to fix.

## What to write

Append rows to `punch-list.md` (do not remove or edit existing rows; add new ids continuing the sequence):

`| id | platform | screen | what is wrong | why it fails the bar | file:line | proposed fix | status |`

- `id`: `P<NNN>`, continuing from the highest existing id.
- `screen`: the frame name and device (e.g. `08-room / iphone-se`).
- `what is wrong`: one plain sentence a non-engineer understands.
- `why it fails the bar`: which of the things above it triggers.
- `file:line`: find the source that draws it (grep the repo; cite the real file and line).
- `proposed fix`: one sentence, concrete.
- `status`: `open`.
- Rank: put a `!` after the id for anything Patrik would hit in the first 60 seconds of use (sign-in,
  home, opening a room, typing).

Then write `rounds/R<N>-<platform>-review.md`: frame count reviewed per device, number of new items,
the five worst in one line each, and any frame that is MISSING or broken (blank, launch screen, wrong
screen) with the likely cause.

## Rules

- Look at every frame. If you did not open it, you did not review it.
- No fixes, no commits, no edits outside `punch-list.md` and your report.
- Do not start servers, builds or simulators.
