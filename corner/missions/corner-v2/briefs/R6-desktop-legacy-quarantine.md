# Brief R6-desktop-legacy-quarantine — v2 desktop visual matrix, legacy presentation removal, `/` selects a conversation, pdf.js stage (desktop plan Task 6 + P012 + P013)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40), `punch-list.md` (P012, P013 are yours), and the R2-R5 desktop
reports in `rounds/` (what exists, which seams remain). Write your report to
`rounds/R6-desktop-legacy-quarantine.md`: every command with its output.

You are a headless worker, the BUILDER for desktop plan Task 6. Nobody will answer questions.

Plan: Task 6 and the Final acceptance checklist of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-desktop-web.md`.
Layout truth: `docs/design-reference/corner-v2/HANDOFF.md` section 3 (breakpoints `wide` ≥ 1240,
`sideBy` ≥ 1000) and the plan's Global Constraints.

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`. HEAD includes the R5 desktop commit ("feat: move workspace settings
  and notifications into sidebar"). `npm run e2e` desktop-only, offline stand-in. `npm run lint`
  has no eslint config on any branch: the plan's `npm run lint` gate is satisfied by adding a minimal
  flat config `eslint.config.js` (typescript-eslint recommended + react-hooks, ignore `dist`,
  `convex/_generated`, `e2e/results`) and getting it to exit 0 on `src/` only; do not lint `convex/`
  (another worker's) — paste the config and the run.
- A BACKEND worker may be editing `convex/` and `tests/` at the same time. You never touch
  `convex/`, `tests/`, `scripts/v2-*.mjs`, `docs/superpowers/`, `.env.local`. `package.json`: you MAY
  add `pdfjs-dist` and eslint devDependencies (paste the diff); nothing else. If `npm run build`
  fails on a type error inside `convex/`, wait 60 s and retry up to 8 times. On `index.lock` wait 10
  s, retry up to 5 times. Never `git add` a path you did not create or edit.

## Step 1 — viewport matrix tests first (plan Task 6 Step 1, verbatim)

Add the `corner v2 desktop visual contract` suite with the four cases (1440, 1240, 1000, 999) and
the portrait + landscape artifact tests exactly as the plan says. `wide` (≥1240) vs `sideBy`
(1000-1239) differ per HANDOFF: at `sideBy` the review layout is still side-by-side but the
conversation column is at its 340px minimum and the file strip collapses its labels to icons; at
999 the pane is absent until the artifact button opens the sheet. Run them; they must pass BEFORE
any deletion (this proves v2 selectors own the layout). Paste the run. If any fails, fix the v2 CSS
(not legacy) until it passes, and list what you changed.

## Step 2 — P012: `/` selects a conversation

`/` (authenticated): if `useWorkspaceNavigation()` has nodes, navigate (replace) to the most
recently active node's `/c/<threadId>`; if empty, the v2 empty home from R5. This retires the legacy
Home room-list tests: for each existing e2e test that boots `/` expecting the legacy room list,
either rewrite it against `/c/<threadId>` (if it tests behaviour that still exists: send, retry,
upload, palette, escape) or delete it (if it tests the room list / agent grid / filter chips that no
longer exist). List every test touched with the reason. Keep `home-empty` (now the v2 empty home).

## Step 2b — P014 + P015 (sidebar, from the orchestrator's R5 review)

P014: only the ACTIVE project (the one containing the open conversation) is expanded by default;
every other project collapses to its 40px row with a right-pointing chevron (`›`, 16px `--faint`)
and its needs-you dot to the left of the chevron; clicking the row's chevron toggles it (persist
per project in `localStorage` as R5 did); opening a conversation inside a collapsed project expands
that project and leaves the others alone. Measure against the design's Work state (Aster expanded,
Northwind and Cellar Door collapsed). P015: the footer shows the person's name (from the viewer's
`name`, else the email's local part title-cased) at 14px `--fg`, with the email as the row's
`title` tooltip. Update both rows in `punch-list.md` with evidence
`rounds/evidence/R6-sidebar-collapsed-1440.png`.

## Step 3 — P013: pdf.js stage

Replace the `<iframe>` PDF renderer with `pdfjs-dist` canvas rendering (one page at a time, page
arrows, text layer optional, pins positioned over the canvas box so `xPct/yPct` stay page-relative;
worker file served from `public/` or via the Vite `?url` import). Headless, CI, and Chrome must
draw the same pixels. Re-take `rounds/evidence/R6-visual-pdf-1440.png` showing page 1 of the Aster
brief with two pins on it.

## Step 4 — quarantine manifest and removal (plan Task 6 Steps 3-5)

Create `src/legacy/README.md` with the plan's exact table. Then delete the six legacy stylesheet
imports from `src/index.css`, delete `src/cv6-base.css`, `src/cv6-home.css`, `src/cv6-chat.css`,
`src/cv6-files.css`, `src/cv6-screens.css`, `src/polish.css`, `src/components/FilePreview.tsx`,
`src/routes/Chat.tsx`, and remove the `data-cv6`/`data-screen` attributes the R2 shell added to the
root (they only existed to keep legacy styles working). Anything in `src/` that still imports a
deleted file gets its styles moved into the scoped `src/v2/*.css` (Auth, Settings, Onboarding,
Email, Tracker, Notifications keep compiling; `Email.tsx`/`Tracker.tsx`/`Notifications.tsx` stay
in the tree, unlinked). Then:

```bash
rg -n "cv6-|FilePreview|from \"\./routes/Chat\"|from \"\./cv6|data-cv6|data-screen" src
```

must print nothing (exit 1).

## Step 5 — gates (plan Task 6 Step 6)

```bash
npm run lint
npm run build
npx playwright test
```

Every desktop test passes, zero skips. Regenerate only intentionally changed baselines, inspect each
in `e2e/__screenshots__/desktop/`, list them with one line each, re-run to a clean pass. Evidence:
`rounds/evidence/R6-matrix-wide-1440.png`, `R6-matrix-wide-boundary-1240.png`,
`R6-matrix-sideby-1000.png`, `R6-matrix-fallback-999.png` (sheet open), `R6-visual-pdf-1440.png`,
`R6-home-redirect-1440.png`.

Then walk the plan's Final acceptance checklist item by item and write PASS/FAIL with the evidence
or command that proves it; a FAIL is fixed in this round, not reported.

## Step 6 — commit

```bash
git add src/index.css src/legacy/README.md src/v2 src/routes src/main.tsx src/App.tsx e2e/visual.spec.ts e2e/__screenshots__/desktop playwright.config.ts package.json package-lock.json eslint.config.js public
git rm src/cv6-base.css src/cv6-home.css src/cv6-chat.css src/cv6-files.css src/cv6-screens.css src/polish.css src/components/FilePreview.tsx src/routes/Chat.tsx
git commit -m "refactor: retire legacy corner mobile presentation"
git log --oneline -3 && git status
```

## Report `rounds/R6-desktop-legacy-quarantine.md`

Matrix run before deletion; P012 test list; pdf.js approach; the `rg` proof; lint config + run;
final full-suite line; baselines regenerated; the acceptance checklist with PASS lines; deviations.
Update P012 and P013 rows in `punch-list.md` to `fixed (R6)` with evidence paths.

## Hard rules

Never edit `convex/`, `tests/`, `scripts/v2-*.mjs`, `docs/superpowers/`, `.env.local`. Never delete
`Email.tsx`, `Tracker.tsx`, `Notifications.tsx`, `convex/email.ts`, `convex/tracker.ts`. Never
delete a test that covers behaviour that still exists. Never loosen a threshold. Never `git add
-A`. Never push. Kill the vite server when done.
