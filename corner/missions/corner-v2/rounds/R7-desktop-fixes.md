# R7 — desktop punch-list close-out (P016–P019 + P101–P109)

BUILDER, headless. Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`,
branch `codex/corner-v2-integration`, base `e439eb6` (R6).
Note: `rounds/R6-review-compmatch.md` does not exist in the mission folder; the reviewer FAILs
are the punch-list rows owned by R7 (P016–P019, P101–P109). I treated the punch table's
`design` column as the proposed fix, re-measured every value against the live design file
(`docs/design-reference/corner-v2/Corner v2.dc.html` at 1440x900, default Work state) before
applying, and measured built before/after with `getBoundingClientRect`/`getComputedStyle`.

## Per-item results (design | built before → built after)

- P016 — thumbs removed. Before: `.v2-stage-thumbs` present, 10 `.v2-stage-thumb` buttons.
  After: 0 (`design — | built after 0`). Change: deleted the strip JSX in the PdfStage footer
  (`src/v2/ArtifactStage.tsx`, was ~L473-484) and the `.v2-stage-thumbs/.v2-stage-thumb` rules
  (`src/v2/visual-window.css`, was L438-460). Footer is now hint + Expand only.
  Test: `R7 P016+P017` asserts zero matches for `.v2-stage-thumbs, .v2-pdf-thumbs, .v2-stage-thumb`.
  Evidence: `rounds/evidence/R7-P016-1440.png` (page renders, arrows on stage edges).
- P017 — footer label + card count. Before: hint `scrollWidth 66 > clientWidth 64` (clipped 2px),
  footer `Page 1 of 10` vs card `PDF · 10 pages` (agree only after load; fixture fallback said 3).
  After: `66 | 66`, label `Page 1 of 10`, card `PDF · 10 pages`.
  The reviewer's "file has 9" is wrong: `public/fixtures/aster-brief.pdf` contains 10 `/Page`
  objects (`/Count 10`), pdf.js reports `numPages 10`, and the page content's own "1/9" footer is
  the playbook's printed numbering, not the PDF page count. Fixed properly: footer `Page 1 of 10`.
  Changes: `.v2-stage-hint { flex: none; white-space: nowrap }` + `.v2-stage-bar .v2-stage-hint
  { margin-right: auto }` (label left, Expand docks right) in `src/v2/visual-window.css:449-463`;
  `scripts/audit/fixtures.ts:191` artifact `pages: 3 → 10`; new `pdfPageCache` + `usePdfPageCount`
  in `src/v2/ArtifactStage.tsx:15-45`, recorded on doc load (`:401`), read by conversation file
  cards via `FileMeta`/`fileExtra` (`src/v2/ConversationSurface.tsx`, `FileCardItem`/`FileMeta`
  ~L173-196, wiring ~L423-431, L487-513) — live pdf.js count wins, fixture meta is the fallback.
  Test: `R7 P016+P017` asserts `/^Page \d+ of \d+$/`, `scrollWidth === clientWidth`, card
  `/^PDF · \d+ pages?$/` with equal numbers. Evidence: `rounds/evidence/R7-P017-1440.png`.
- P018 — 999 grid collapse. Before: pane 232px, grid `232px 367px 399px` (three tracks).
  After: pane 999px = viewport, grid `999px`; thread `max-width 720px` centred.
  Root cause was NOT the 999 block (it already said `1fr`): the unguarded portrait/square
  `:has` rules at the top of `visual-window.css` outrank it. Change: wrapped them in
  `@media (min-width: 1000px)` (`src/v2/visual-window.css:14-27`); drawer is now
  `position: fixed, width: 84%, animation slidefromleft .3s` with `@keyframes slidefromleft`
  (16px per HANDOFF motion) plus a `prefers-reduced-motion` guard
  (`src/v2/workspace.css:1526-1561`); settings panel joins the 999 `1fr` collapse
  (`workspace.css:1537-1544`). Measured drawer open at 999: 839px (=84%), fixed, `slidefromleft`.
  Test: `R7 P018+P019` asserts pane width equals `innerWidth` at 999. Evidence: `R7-P018-999.png`.
- P019 — sheet stage. Before: stage 1239px tall (canvas blew it out), no handle, arrows centred
  on media+footer. After half: sheet top 198px (=22% of 900), stage 292px (≈240+50+borders),
  media 240px with canvas inside; full: top 34px, stage 452px (≈400+50); Expand/arrow overlap
  false in both. Changes: `data-sheet` half/full state + grab handle (`data-testid="sheet-handle"`,
  CSS-hidden on desktop) in `src/v2/VisualWindow.tsx:21-25,169-179`; sheet insets, stage
  `min-height: calc(240px + 50px)` / `(400px + 50px)` (timed media +160) and the
  `.v2-pdf-wrap { flex: 1 1 0; min-height: 240/400px }` cap (taller pages scroll inside the wrap;
  aspect capped by the existing contain-fit) in `src/v2/workspace.css:1582-1630`;
  footer exactly 50px and arrows re-centred on the media above it
  (`top: calc(50% - 25px)` + `translateY(-50%)`, `src/v2/visual-window.css:406-411,432-446`).
  Test: `R7 P018+P019` asserts non-zero stage height, visible canvas, handle toggles
  `data-sheet`, full > half, no Expand/arrow overlap.
  Evidence: `R7-P019-half-999.png`, `R7-P019-full-999.png` (both inspected: handle, stage, footer).
- P101 — search: `9px | 11px → 9px`; `rgba(255,255,255,.05) | rgb(29,36,48) → rgba(255,255,255,.05)`.
  `src/v2/workspace.css:118-123`. Evidence: `R7-P101-1440.png`.
- P102 — row radius: `8px | 10px → 8px`. `.v2-nav-row`, `workspace.css:171-176`. `R7-P102-1440.png`.
- P103 — title weights. Reviewer right about the flagged 400 case (recent rows); design measurement
  showed the full map: recent 500, project 500, mission 400, files 400 (13.5px). Applied all four:
  `.v2-nav-row.v2-nav-recent { font-weight: 500 }` (doubled class: the generic
  `button.v2-nav-row { font: inherit }` reset otherwise wins), `.v2-nav-project 600 → 500`,
  `.v2-nav-mission 500 → 400`, files/new-mission `500 → 400` (`workspace.css:181-185,236-240,253-267,300-304`).
  After: recent 500, project 500, mission 400, files 400. `R7-P103-1440.png`.
- P104 — Files/New-mission indent: `x=30 w=241 | x=8 w=263 → x=30 w=241`.
  `.v2-nav-row.v2-nav-files/.v2-nav-row.v2-new-mission-row { margin-left: 22px;
  width: calc(100% - 22px); padding: 0 10px }` (`workspace.css:253-267`); Files title lands at
  x=65 = design. Mission rows keep their R6-tested `padding-left: 22px` (see Deviations).
  `R7-P104-1440.png`.
- P105 — Review OFF: `transparent | surface-2 → transparent`; muted text; `9px | 10px → 9px`
  (36px height and 14px size already match; ON state untouched).
  `src/v2/workspace.css:1499-1510`. `R7-P105-1440.png`.
- P106 — composer input: `14.5px | 14px → 14.5px` (inline style on the textarea).
  `src/components/Composer.tsx:236`. `R7-P106-1440.png`.
- P107 — Record chip: `77x28 r7 | 87x32 r8 → 78x28 r7` (|delta| 1px, inside the gate).
  `height 28px; padding: 0 8px; gap: 5px; radius: 7px`, `src/v2/conversation.css:503-509`.
  `R7-P107-1440.png`.
- P108 — Working status: `13.5px + --success | 12px muted → 13.5px + success (#34D399 =
  rgb(52,211,153) = design)`, via `data-status` on the header (`src/v2/WorkspaceShell.tsx:212`,
  `workspace.css:609-625`); other states stay muted. `R7-P108-1440.png`.
- P109 — footer name: `14px | 14px` — no change needed; already correct (R6 P015 set it).
  Pinned by the new test. `R7-P109-1440.png`.

## Gates

```
$ npm run lint
✖ 11 problems (0 errors, 11 warnings)          # same 11 pre-existing exhaustive-deps warnings as R6
$ npm run build
✓ built in 1.76s
$ npm test
Test Files  11 passed (11) / Tests 90 passed (90)
$ npm run e2e
65 passed (2.8m)                               # 62 prior + 3 new R7 tests, zero skips, zero failures
```

No baseline regenerated: all 62 pre-existing tests (incl. screenshots) pass unmodified on the new
pixels. `git status` shows only the ten edited source/test/fixture files; no orphans, no collateral.

## Deviations

- `rounds/R6-review-compmatch.md` is absent; worked from the punch-list R7 rows (the FAIL table).
- P017 reviewer value `Page 1 of 9` rejected with measurement: the fixture PDF has 10 pages
  (10 `/Page` objects, `/Count 10`, pdf.js `numPages 10`); shipped `Page 1 of 10`.
- P104: first attempt (22px container indent + 10px row padding) matched the design exactly
  (mission x=30, titles 57/65) but broke the existing `padding-left: 22px` mission-row assertion.
  Per the never-rewrite-tests rule I kept mission rows untouched and indented only the flagged
  Files/New-mission boxes via margin (x=30 w=241, Files title 65 = design). Mission rows stay at
  R6 geometry (design says x=30) — flagged for a future round, not silently changed.
- Commit adds `src/components/Composer.tsx` (P106) alongside the brief's pathspec; the brief's
  `git add src/v2 …` does not cover it.
- Probe specs lived in `e2e/r7-*-tmp.spec.ts` during the round and were deleted; `/tmp` copies
  kept out of the repo. Evidence PNGs live in the mission folder (not committed to the worktree).
- `convex/`, `tests/`, `scripts/v2-*.mjs`, `docs/superpowers/`, `.env.local`, `package.json`
  untouched. No backend type errors and no `index.lock` met, so no retry paths triggered.

## Commit

```
$ git add src/v2 src/components/Composer.tsx e2e/visual.spec.ts scripts/audit/fixtures.ts e2e/__screenshots__/desktop
$ git commit -m "fix: close corner v2 desktop punch list (comp-match round)"
$ git log --oneline -3 && git status
```
