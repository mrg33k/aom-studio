# Brief R0-web — make the web E2E suite true on this Mac

Mission path: `corner:corner-smooth-loop`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-smooth-loop/`
Read `LOOP.md` there first. Write your report to `rounds/R0-web.md` in that folder.

You are a headless worker. Nobody will answer questions. Blocked = write it in the report and stop.

## Where things are

- Repo: `/Users/aom-inhouse/aom-studio-transfer/corner-convex` (git, branch `main` at `9b6a159`, up to
  date with origin). Work directly on `main`. Never `git add -A`/`git add .`; stage only the paths you
  changed. Never push. Never touch `convex/` and never deploy anything.
- `npm ci` is done, Playwright Chromium is installed. Config: `playwright.config.ts` (three projects:
  `iphone-15-pro`, `iphone-se`, `desktop`; `maxDiffPixelRatio: 0.01`; the dev server on
  `http://127.0.0.1:5173` is started by the config from `scripts/audit/vite.config.ts`, the offline Convex
  stand-in, so no backend is needed). Spec: `e2e/visual.spec.ts` (has a `layout()` contract helper around
  line 40-55 and screenshot tests). Baselines: `e2e/__screenshots__/<project>/<name>.png`. Last run output:
  `e2e/results/<test>-<project>/` with `*-actual.png`, `*-diff.png`, `error-context.md`, `trace.zip`.
  HTML report: `e2e/report`.
- Context docs: `FRONTEND-AUDIT.md` (issues found by a static audit), `NATIVE-IOS-AUDIT.md` (ignore this round).
- Commands: `npm run e2e`, `npm run e2e:update` (regenerates baselines), `npx playwright test --project=desktop
  --grep "composer"` (subset). If a vite server is left on :5173 from a crashed run, `lsof -ti :5173 | xargs kill`.

## What happened before you

`npm run e2e` on this Mac: 8 passed, 28 failed out of 36.
- 25 failures are `toHaveScreenshot` pixel mismatches in the 0.02–0.04 ratio range against the 0.01
  threshold. The committed baselines were rendered on Linux in another session; this Mac renders text
  differently. Hypothesis: anti-aliasing only, no layout change. You must confirm that per screenshot, not
  assume it.
- 3 failures are the assertion `composer docked to the bottom` from the layout contract
  (`e2e/visual.spec.ts:51`, `Math.abs(r.composer.bottom - r.vh) <= 1`). Find which tests/projects.

## Do this, in order

1. Classify every one of the 28 failures. For each pixel failure open the `*-diff.png` and the `*-actual.png`
   next to the committed baseline with your file viewer (you can view PNGs). Decide: (A) anti-aliasing /
   font-hinting only, same layout, same elements, same colours; or (B) a real difference (element moved,
   missing, wrapped, different colour, scrollbar visible, different size). Record the decision per file in a
   table in your report. If you find any (B), treat it as a bug to understand, not a baseline to overwrite.
2. Debug the 3 `composer docked to the bottom` failures. Read the `layout()` helper and the component (find
   the composer in `src/`, likely `src/routes/*` or `src/components/*`, plus `src/polish.css`). Determine the
   real cause: is the composer genuinely not at the viewport bottom on these device profiles (a product bug,
   e.g. `100vh` vs `100dvh`, safe-area padding, a scrollbar), or is it a harness artefact (headless Chromium
   on macOS reporting a different `innerHeight`, device-emulation viewport vs `visualViewport`)? Fix the real
   cause in `src/` if it is a product bug. If it is a harness artefact, fix the harness/test measurement and
   write the reason as a code comment. You may NOT change `maxDiffPixelRatio`, the `<= 1` tolerance, or
   delete/skip any test.
3. Only after step 1 shows all pixel failures are (A): run `npm run e2e:update` to regenerate baselines on
   this Mac, then `npm run e2e` twice in a row. Both runs must report 36 passed. If anything flakes, find the
   cause (animation not disabled, timing wait, network idle) and fix the test's waiting, not the threshold.
4. Coverage gap list (no building yet, R1 does that). Read `e2e/visual.spec.ts` and `src/` (routes,
   components, `polish.css`) and list every user-facing feature or state with no test: sign-in page (if the
   offline stand-in has one), settings/account, theme switching beyond light/glass, new room flow, file
   upload, mention insertion, message send failure state, empty room list, loading states, long message
   text, keyboard-open composer on mobile, palette results, 404 + unknown room, tablet-width layout, light
   theme on every route. Rank by how likely Patrik would notice a break there.
5. Report `rounds/R0-web.md`: the classification table (test, project, cause A/B, action), the composer
   finding with file:line and the fix, the final two run summaries (copy the `N passed` lines), the ranked
   coverage gaps, and a first-impressions list: one line per thing in the actual screenshots that looks
   wrong or unfinished on any device (clipped text, overlaps, tiny type, poor contrast, misaligned rows,
   anything you would not ship). No fixes for those this round.
6. Commit on `main` with only the paths you changed staged (typically `e2e/__screenshots__/`, `e2e/visual.spec.ts`,
   `src/…`, `playwright.config.ts` if touched). Message:
   `test(e2e): R0 macOS baselines + composer docking — corner:corner-smooth-loop`. Do not push.
   The report file is outside this repo; leave it uncommitted, the orchestrator commits it.

## Hard rules

- No threshold changes, no skipped tests, no deleted baselines without a regenerated replacement.
- Never `git add -A`, never push, never touch `convex/`, never deploy, never edit files outside
  `corner-convex/` except the report in the mission folder.
- Kill the vite server you started when you are done (`lsof -ti :5173 | xargs kill` if it lingers).
