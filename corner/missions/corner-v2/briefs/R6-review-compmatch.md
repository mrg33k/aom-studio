# Brief R6-review-compmatch — measure the built desktop against the design export, every state, with numbers (REVIEWER, read-only)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (the WD-40 directive's gate 1 is your job), `punch-list.md`, and the R2-R6 desktop
reports in `rounds/`. Write your report to `rounds/R6-review-compmatch.md`.

You are a headless REVIEWER. You change nothing in the repo (sandbox on). You may write only your
report, throwaway scripts under `/tmp`, and PNGs into
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/rounds/evidence/`.
Nobody will answer questions.

## Where things are, exactly

- Built app: worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`. Start the
  offline stand-in the e2e harness uses (read `playwright.config.ts` `webServer` for the exact
  command; it is `npm run audit:vite` or similar on :5173) and drive it with Playwright from a
  `/tmp` script. Kill it when done (`lsof -ti :5173 | xargs kill`).
- Design: `docs/design-reference/corner-v2/Corner v2.dc.html` (self-contained; open via `file://`).
  Its sidebar footer "State" switcher reaches Work / New / Setup / Login (HANDOFF section 5). Inside
  Work: the Aster thread with artifacts (PDF, site, photo, video, YouTube, code), Preview/Context,
  Review with pins, the lightbox. Setup has six steps. Also `ArtifactStage.dc.html` for stage-only
  states.

## What to measure (all at 1440x900, dark; then repeat the layout rows at 1240 and 1000)

For each pair (design state ↔ built route/state), screenshot both to `rounds/evidence/R6-cm-<state>-design.png`
and `-built.png`, then measure with `getBoundingClientRect` / `getComputedStyle` and write one table
row per property: `state | element | property | design | built | delta | verdict`.

States and elements:

1. **Work / project conversation**: sidebar width; sidebar header height; search field height;
   "+ New" and "Project +" button heights; RECENT row height; project row height; mission row
   height and indent; project mark size; needs-you dot size and colour; footer row height;
   conversation pane width; conversation header height; breadcrumb font size; status dot;
   avatar size; name font size/weight; time font family; agent body font size/line-height; user
   bubble radius, fill, font size; question row padding/radius/selected fill/selected border;
   "Suggested" tag; steps card check circle size and progress bar height; file card height, badge
   size, name font family/size; composer radius, border, min height, send button size; visual
   pane width; visual header height; Preview/Context font size and underline thickness; Review
   button height; full-screen and more button sizes; title font size; file strip chip height and
   selected border; stage width/height and the media fit.
2. **Work / mission conversation**: same as 1 for the header and thread (mission path).
3. **Review mode with 3 pins** (PDF): pin diameter, pin fill, selected pin colour, checklist header
   font, row height, marker font family, per-row × size, "Send N changes" button height, carry-on
   button height, composer border colour while notes are pending (`--accent`).
4. **Photo (portrait) open**: visual pane width (the aspect formula), stage height.
5. **Site open**: browser chrome height, Interact toggle, viewport toggle.
6. **Video open**: control bar height, scrubber, pin markers.
7. **Code open**: header, line-number gutter width, +/− colours.
8. **Context view**: section headings, row heights.
9. **Lightbox**: overlay colour, close button size and focus.
10. **Notifications popover**: `left`, `bottom`, width, row height.
11. **Settings** (each of the five sections): column width, heading sizes, row heights, toggle
    size.
12. **Setup** (each of six steps): column width, eyebrow size, headline size, progress segment
    height/count, Back/Continue heights, lock note.
13. **Login**: column width, provider row heights, email field height, Continue height.
14. **Empty home**: headline size, sub size, icon row heights, hairlines.
15. **Layout at 1240 and 1000**: pane widths, header heights, side-by-side review; at 999 the
    fallback (sheet present after the open button).

Verdict rules: `|delta| ≤ 1px` or a colour within 2/255 per channel = PASS; otherwise FAIL with the
built `file:line` (find it with `rg` in `src/v2`) and the one-line CSS change that would fix it.
Anti-aliasing and text rendering differences are not diffs. A missing element is a FAIL. A design
element that is prototype-only (the State switcher, "Explore a sample workspace") is EXEMPT and
listed as such.

## Report `rounds/R6-review-compmatch.md`

The full table; a "FAIL summary" section listing every FAIL as a new punch item in the
`punch-list.md` format (`P1xx | screen | what | design | built | file:line | R7 | open`) — you do
not edit `punch-list.md`, the orchestrator does; the evidence PNG paths; the exact scripts you ran
(paths under `/tmp`). No opinions on taste; numbers only.

## Hard rules

Never edit any file in the worktree. Never run `git` write commands. Never run `npx convex`. Never
push, deploy, or install. Kill the dev server when done.
