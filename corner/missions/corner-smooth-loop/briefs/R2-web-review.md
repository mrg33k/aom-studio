# Brief R2-web-review — fresh eyes on every web frame, write the punch list

Mission path: `corner:corner-smooth-loop`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-smooth-loop/`
Read `LOOP.md` first, then `punch-list.md` (so you do not re-report P001–P014), then
`/Users/aom-inhouse/aom-studio-transfer/corner-convex/FRONTEND-AUDIT.md` (the static audit; check its
open items against the pictures), then `features.md` (the web rows tell you what each frame is supposed
to show).

You are a headless worker, the REVIEWER. You look, you judge, you write. You do not fix, you do not
commit, and you do not edit anything except your own report. A builder is editing the repo at the same
time; ignore any file that changes under you and never start the dev server.

## Frames to review

All PNGs under `/Users/aom-inhouse/aom-studio-transfer/corner-convex/e2e/__screenshots__/`:
`desktop/` (1440x900), `iphone-15-pro/` (393x852), `iphone-se/` (320x568). About 35 named states, most
in all three sizes. Open EVERY file with your file viewer. Compare the same state across the three sizes;
most breaks are a difference between sizes.

## The bar

One question per frame: **would Patrik have to come back and mention this?** He is the founder and uses
the app daily. He notices: clipped or wrapped text, misaligned rows, inconsistent spacing, type under
11 px, low-contrast labels, overlapping elements, controls hanging off the edge, empty areas that should
hold content, placeholder or debug text, a spinner where content should already be, a composer not
docked, tap targets under 44 px, the wrong theme colour on one element, a sheet at the wrong height,
inconsistent corner radii, icons of mixed weight, two different greys for the same thing, a screen that
looks unfinished next to its neighbours.

He does NOT care about anti-aliasing, things only a ruler would find, or anything that needs a new
feature to fix.

## What to write: `rounds/R2-web-review.md`

1. A table of NEW items in punch-list format, ids continuing from `P015`:
   `| id | platform | screen | what is wrong | why it fails the bar | file:line | proposed fix | status |`
   - `screen`: the frame name and size (e.g. `email-inbox / iphone-se`).
   - `file:line`: grep `corner-convex/src` for the code that draws it and cite the real place.
   - `proposed fix`: one concrete sentence.
   - `status`: `open`. Put `!` after the id for anything hit in the first 60 seconds of use (sign-in,
     home, opening a room, typing).
   - Do not repeat P001–P014. If you see the same defect elsewhere, reference the existing id in a
     "also seen" note under the table instead.
2. A "clean" list: frames you reviewed and found nothing wrong with (so the orchestrator knows they were
   looked at).
3. Frame count reviewed per size, number of new items, the five worst in one line each.
4. Any frame that is MISSING, blank, or shows the wrong screen, with the likely cause.
5. Audit cross-check: which `FRONTEND-AUDIT.md` items are visibly still present in the frames, by audit
   number, one line each.

## Rules

- Look at every frame. If you did not open it, you did not review it.
- No fixes, no commits, no edits outside your report. Do not start servers or builds.
