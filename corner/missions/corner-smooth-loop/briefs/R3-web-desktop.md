# Brief R3-web-desktop — make the suite desktop-only, then close the desktop punch items

Mission path: `corner:corner-smooth-loop`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-smooth-loop/`
Read `LOOP.md` (note the scope decision: web is DESKTOP ONLY), then `punch-list.md`, then
`rounds/R2-web-review.md` (how each item was seen) and `rounds/R2-web-fix.md` (what the last builder
changed, especially the tool follow-up path). Write your report to `rounds/R3-web-desktop.md`.

You are a headless worker, the BUILDER. Nobody will answer questions.

## Where things are

- Repo: `/Users/aom-inhouse/aom-studio-transfer/corner-convex` (git, `main` at `d2db18d`, clean, pushed).
  Work on `main`. Stage only what you changed (never `git add -A`/`.`). Never push. Never touch `convex/`
  (read it if you need to understand a function; never edit it). Never deploy.
- Harness: `npm run e2e`. Spec `e2e/visual.spec.ts`. Baselines `e2e/__screenshots__/<project>/`.
  Stand-in switches in `scripts/audit/fixtures.ts` and `scripts/audit/mock-convex-react.tsx`. Tokens in
  `src/index.css` (`--fg` is the theme ink; `--ink`/`--text` are `:root` aliases that do NOT re-resolve
  per theme, so use `var(--fg)` directly). Theme tokens live on `.shell[data-theme]` (`src/App.tsx:112`).
- Kill a leftover server with `lsof -ti :5173 | xargs kill`.

## Part 0 — desktop only (do this first, one commit)

Patrik's decision (2026-09-05): "Web should be desktop only." Remove the `iphone-15-pro` and
`iphone-se` projects from `playwright.config.ts`. Delete `e2e/__screenshots__/iphone-15-pro/` and
`e2e/__screenshots__/iphone-se/` entirely. In `e2e/visual.spec.ts` remove every project-conditional
(`test.skip(...)` on project name, SE-only tests, phone-only carve-outs); the long-wrapping test becomes a
desktop test (keep it, it still proves no sideways scroll). Keep the `desktop` project at 1440x900.
Then `npm run e2e` must be green with ZERO skips. Report the test count before and after.
Commit: `test(corner:corner-smooth-loop): R3 web suite is desktop only (Patrik 2026-09-05)`.

## Part 1 — desktop punch items, in this order

**P015! + P030! Notifications** (`src/routes/Notifications.tsx:27-30`). Drop the raw `· {n.type}` (or map
to human labels: mention -> "Mention", turn_complete -> "Finished", file -> "File"); replace
`toLocaleString()` with the relative age the Home rows use ("2m", "3h", "Yesterday"); titles in
`var(--fg)`, second line muted, unread rows semibold. Assert: no row text matches `/turn_complete|_/`
and no row contains a 4-digit year. Regenerate `notifications-*.png`.

**P016! Settings Light does nothing on its own page** (`src/routes/Settings.tsx:22-29` writes
`html[data-theme]`; tokens read `.shell[data-theme]`). Route the picker through the same setter the
drawer uses so the page re-themes instantly. Assert the shell's `data-theme` and the page background
change when Light is picked. Regenerate `settings-light.png`.

**P021! Tool follow-up garbles/echoes** (`src/routes/Chat.tsx`, follow-up path as changed in R2). Fix the
stray quote/bullet at the start of the summary text; assert exactly ONE agent bubble carries the summary
and no user-styled duplicate appears; regenerate `room-tool.png`.

**P023! Composer covers the last agent row** (`src/polish.css:38` `.home-scroll` bottom padding). Pad
the scroll region by the composer's real height (CSS var set from the composer's measured height, or a
safe constant equal to the composer block); assert the last `.agent-card` bottom sits above the composer
top after scrolling to the end. Regenerate `home-agents.png`.

**P026! Auth logo mark invisible on light** (`src/routes/Auth.tsx:105,127`): `var(--fg)`. Regenerate
`auth-light.png`.

**P017 Tracker roadmap copy** (`src/routes/Tracker.tsx:23`): user-facing subtitle, note moves to a code
comment. **P018 Tracker light colours** (`Tracker.tsx:29-31` literals -> tokens so all three statuses
read on light). Regenerate `tracker-*`.

**P019** (`src/routes/Email.tsx:201`) "via Arcade Gmail.SendEmail" -> "via Arcade · Gmail".
**P020** Cc control (`Email.tsx:153`): visible on desktop with `flex: none`. **P027** Back-to-inbox band
(`Email.tsx:232`): page surface token, not near-black. **P032** inbox sender collapses to "Sa…": give the
sender a minimum width (~9ch) and truncate the subject first. Regenerate `email-*`.

**P022 Faded agent bubble** (`src/routes/Chat.tsx:313`, `startsWith("temp-")` also catches
`temp-fail-*`): only pending optimistic bubbles fade. Regenerate `room-send-failed.png`.

**P028 Palette bisects the ROOMS eyebrow on desktop** (`src/components/CommandPalette.tsx:95-103`):
start the panel below the section header or dim the background while open. Regenerate
`home-palette.png`, `palette-query.png`, `palette-empty.png`.

For each: fix the cause inside the existing component language, add or extend the test so it cannot come
back silently, regenerate only the baselines your change intentionally alters (list them), run the full
suite green, then update the row in `punch-list.md`: `status` -> `fixed (R3)` +
`evidence: <absolute png path>`. If an item needs a product decision, `needs-patrik (<reason>)`.

## Report `rounds/R3-web-desktop.md`

Part 0 counts. Per item: cause, change (file:line), test title, evidence path, baselines regenerated.
Two consecutive green `npm run e2e` lines (zero skips). Off-list touches and why. New bar-fails seen in
new desktop frames, one line each.

## Commit

On `main`, scoped paths. Part 0 as one commit; then one commit per item or tight group:
`fix(corner:corner-smooth-loop): R3 P0xx <what changed>`. Never push.

## Hard rules

Never loosen thresholds or tolerances, never skip/delete tests except the phone-project removals in
Part 0, never delete a baseline without a regenerated replacement except the two phone folders, never
touch `convex/`, never deploy, never edit outside `corner-convex/` except `punch-list.md` and your report.
Kill the dev server when done.
