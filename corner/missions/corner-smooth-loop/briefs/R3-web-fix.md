# Brief R3-web-fix — close P015–P030 (the fresh-eyes review), each with the test that keeps it closed

Mission path: `corner:corner-smooth-loop`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-smooth-loop/`
Read `LOOP.md`, then `punch-list.md` (rows P015–P030 are yours; P001–P014 are fixed or assigned
elsewhere), then `rounds/R2-web-review.md` (how each was seen; the "also-seen" notes and the unidentified
tinted strip under the room header). Write your report to `rounds/R3-web-fix.md`.

You are a headless worker, the BUILDER. Nobody will answer questions.

## Where things are

- Repo: `/Users/aom-inhouse/aom-studio-transfer/corner-convex` (git, `main`, pushed; the previous
  round's commits are on top of `8455154`). Work on `main`. Stage only what you changed (never
  `git add -A`/`.`). Never push. Never touch `convex/`.
- Harness: `npm run e2e` (must be green before and after you). Spec `e2e/visual.spec.ts`. Baselines
  `e2e/__screenshots__/<project>/<name>.png`. Stand-in switches in `scripts/audit/fixtures.ts` and
  `scripts/audit/mock-convex-react.tsx`. Tokens in `src/index.css` (`--fg`, `--muted`, `--card`, ...),
  overrides in `src/polish.css`. Theme tokens live on `.shell[data-theme]` (`src/App.tsx:112`).
- Kill a leftover server with `lsof -ti :5173 | xargs kill`.

## Items, in this order (first-minute items first)

**P015! + P030! Notifications** (`src/routes/Notifications.tsx:27-30`). Replace the raw `· {n.type}`
with nothing (the title already says what happened) or a human label map (`mention` -> "Mention",
`turn_complete` -> "Finished", `file` -> "File"); replace `toLocaleString()` with the same relative age
the Home rows use ("2m", "3h", "Yesterday"); give titles the ink token and second lines the muted token;
unread rows semibold. Regenerate `notifications-*.png`. Add an assertion: no row text matches
`/turn_complete|_/` and no row contains a 4-digit year.

**P016! Settings Light does nothing** (`src/routes/Settings.tsx:22-29` writes `html[data-theme]`; tokens
read `.shell[data-theme]`). Route the Settings theme picker through the same setter the drawer uses so
the page itself re-themes instantly. Regenerate `settings-light.png`; add an assertion that the shell's
`data-theme` attribute and the page background colour change when Light is picked.

**P021! Tool follow-up garbles/echoes** (`src/routes/Chat.tsx`, around the tool follow-up). Read the
R2-web-fix report first (`rounds/R2-web-fix.md`) because that worker changed this path for P013; build
on its version. Fix the stray quote/bullet in the summary text, make sure exactly ONE agent bubble
carries the summary and no user-styled duplicate appears on desktop, and no echo reply follows.
Update the `tool working indicator and result card` test to assert bubble count and text shape;
regenerate `room-tool.png`.

**P023! Composer covers the last agent row** (`src/polish.css:38` `.home-scroll` bottom padding). Pad the
scroll region by the composer's real height (measure it, or use a CSS var the composer sets) so the last
row clears it on all three sizes. Add a layout assertion: the last `.agent-card` bottom is above the
composer top after scrolling to the end. Regenerate `home-agents.png`.

**P024! Filter chips clip at 320 px** (`src/routes/Home.tsx:191`, `src/polish.css:42-43`). Make the
chips row scrollable with a visible edge fade, and keep counts; assert every chip is reachable by scroll
on `iphone-se`. Regenerate the SE home baselines that change.

**P026! Auth logo mark invisible on light** (`src/routes/Auth.tsx:105,127`). Ink token. Regenerate
`auth-light.png`.

**P017 Tracker roadmap copy** (`src/routes/Tracker.tsx:23`): user-facing subtitle only; note to a code
comment. **P018 Tracker light colours** (`Tracker.tsx:29-31` literals -> tokens). Regenerate `tracker-*`.

**P019 "via Arcade Gmail.SendEmail"** (`src/routes/Email.tsx:201`) -> "via Arcade · Gmail". **P020 Cc
control** (`Email.tsx:153`): `flex: none`, visible on all widths. **P027 Back-to-inbox band**
(`Email.tsx:232`): page surface token. Regenerate `email-*`.

**P022 Faded agent bubble** (`src/routes/Chat.tsx:313` `startsWith("temp-")` also catches
`temp-fail-*`): only pending optimistic bubbles fade. Regenerate `room-send-failed.png`.

**P025 Palette results cut on SE** and **P028 palette bisects the eyebrow** (`src/components/CommandPalette.tsx:95-103`):
cap the list to the viewport with internal scroll, and either start the panel below the section header or
dim the background. Regenerate `home-palette.png`, `palette-query.png`.

**P029 Home composer clips the first glyph on SE** (`src/routes/Home.tsx:257-266`): left padding on the
input; regenerate `home-composer-typed.png` (SE).

**P032 Email sender collapses to one letter** (`src/routes/Email.tsx` inbox row): give the sender a
minimum width (~9ch) and let the subject truncate first, on all sizes; regenerate `email-inbox.png`.

**Unidentified tinted strip under the room header** (room-light / room-glass / room-files-sheet on
iphone-15-pro): find what draws it. If it is a bubble edge clipped under the header, add the header's
surface as an opaque backdrop or clip the thread; if it is chrome, say what and fix. Photograph.

For each item: fix the cause inside the existing component language, add or extend the test so it
cannot come back silently, regenerate only the baselines your change intentionally alters (list them),
run the full suite, then update the row in `punch-list.md`: `status` -> `fixed (R3)` +
`evidence: <absolute png path>`. If an item needs a product decision, `needs-patrik (<reason>)`.

## Report `rounds/R3-web-fix.md`

Per item: cause, change (file:line), test title, evidence path, baselines regenerated. Two consecutive
green `npm run e2e` summary lines. Anything touched off-list and why. New bar-fails in new frames.

## Commit

On `main`, scoped paths only, one commit per item or tight group:
`fix(corner:corner-smooth-loop): R3 P0xx <what changed>`. Never push.

## Hard rules

Never loosen thresholds or tolerances, never skip/delete tests, never delete a baseline without a
regenerated replacement, never touch `convex/`, never deploy, never edit outside `corner-convex/` except
`punch-list.md` and your report. Kill the dev server when done.
