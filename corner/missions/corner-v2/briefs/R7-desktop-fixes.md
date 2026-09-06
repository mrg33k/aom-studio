# Brief R7-desktop-fixes — close every open punch item (P016-P019 + the comp-match reviewer's FAILs)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40), `punch-list.md` (every row with status `open` is yours),
`rounds/R6-review-compmatch.md` (the reviewer's measured FAIL table; each FAIL is also a punch row),
and `rounds/R6-desktop-legacy-quarantine.md`. Write your report to `rounds/R7-desktop-fixes.md`.

You are a headless worker, the BUILDER. Nobody will answer questions.

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`, HEAD `e439eb6` or later. `npm run lint` (eslint flat config, exits
  0 today), `npm run build`, `npm test` (90), `npm run e2e` (62, desktop 1440x900, offline stand-in).
  Legacy CSS is gone; all styling lives in `src/v2/*.css`. Design: `docs/design-reference/corner-v2/`.
- A BACKEND worker may be editing `convex/` and `tests/` at the same time. Never touch `convex/`,
  `tests/`, `scripts/v2-*.mjs`, `docs/superpowers/`, `.env.local`, `package.json`. If `npm run build`
  fails on a type error inside `convex/`, wait 60 s and retry up to 8 times. On `index.lock` wait
  10 s, retry up to 5 times. Never `git add` a path you did not create or edit.

## The work

For each `open` row in `punch-list.md`, in id order:

- P016: remove the thumbnail strip under the PDF stage (design has page arrows on the stage and the
  `Page N of M` + Expand footer only). If you believe thumbnails add value, you are wrong for this
  round: match the design.
- P017: footer label never clips (`flex:none; white-space:nowrap`); the file card's page count comes
  from pdf.js `numPages` once loaded (fixture metadata is a fallback until then), so card and footer
  agree.
- P018: at `max-width:999px` the workspace grid is `grid-template-columns: minmax(0,1fr)` with the
  sidebar as an off-canvas drawer (`position:fixed`, 84% width, `slidefromleft .3s` per HANDOFF
  section 4) and the thread column `max-width:720px` centred; measure the conversation pane width at
  999 (must equal the viewport) and paste it.
- P019: the sheet renders the stage: media height 240 (half) / 400 (full) capped by aspect, plus
  chrome 50 (or 160 for timed media) per HANDOFF section 4; handle toggles half/full; Expand and the
  page arrow never overlap (arrows sit on the stage edges, Expand in the footer). Evidence at 999
  with the PDF open in half and full.
- Every reviewer FAIL row (P1xx): apply the one-line fix the reviewer proposed unless it is wrong;
  if wrong, fix it properly and say why. Re-measure after each and paste `design | built after`.

Rule for all: measure before and after with `getBoundingClientRect` / `getComputedStyle` in a
Playwright snippet; a fix is done when `|delta| ≤ 1px`. Add or extend a test for each item so it
cannot silently regress (P018: pane width equals viewport at 999; P019: sheet stage has non-zero
height with a canvas or img inside; P016: no `.v2-pdf-thumbs` element; P017: label text matches
`/^Page \d+ of \d+$/` and is not clipped (`scrollWidth === clientWidth`)).

## Gates

```bash
npm run lint
npm run build
npm test
npm run e2e
```

All green, zero skips. Evidence per item to `rounds/evidence/R7-<id>-<w>.png`. Update every fixed
row in `punch-list.md` to `fixed (R7) <evidence path>`.

## Commit

```bash
git add src/v2 e2e/visual.spec.ts scripts/audit/fixtures.ts e2e/__screenshots__/desktop
git commit -m "fix: close corner v2 desktop punch list (comp-match round)"
git log --oneline -3 && git status
```

## Report `rounds/R7-desktop-fixes.md`

Per item: before/after measurements, the change (`file:line`), the test added, evidence path.
Gate outputs. Deviations.

## Hard rules

Never edit `convex/`, `tests/`, `package.json`, `docs/superpowers/`, `.env.local`. Never delete a
test or loosen a threshold. Never `git add -A`. Never push. Kill the vite server when done.
