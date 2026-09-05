# Brief R2-web-fix — close P008–P014, each with the test that keeps it closed

Mission path: `corner:corner-smooth-loop`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-smooth-loop/`
Read `LOOP.md`, then `punch-list.md` (rows P008–P014 are yours), then `rounds/R1-web.md` §3 (where each
was found and how it was photographed). Write your report to `rounds/R2-web-fix.md`.

You are a headless worker, the BUILDER. Nobody will answer questions. A second worker (the reviewer) is
reading PNGs in `e2e/__screenshots__/` at the same time; it never edits the repo, so you will not
collide, but do not delete or rename baseline files while you work, only add or regenerate.

## Where things are

- Repo: `/Users/aom-inhouse/aom-studio-transfer/corner-convex` (git, `main` at `8455154`, clean, pushed).
  Work on `main`. Stage only what you changed (never `git add -A`/`.`). Never push. Never touch `convex/`.
- Harness: `npm run e2e` (125 passed, 19 brief-scoped skips, ~2.2 min). Spec `e2e/visual.spec.ts`
  (`boot()`, `bootBare()`, `layoutContract()` with two documented carve-outs you will remove).
  Baselines `e2e/__screenshots__/<project>/<name>.png`. Stand-in switches in `scripts/audit/fixtures.ts`
  (`flag()`, `audit_fail_send`, `audit_empty_rooms`, `audit_loading`) and `scripts/audit/mock-convex-react.tsx`.
- App: `src/routes/*`, `src/components/*`, tokens in `src/index.css`, overrides in `src/polish.css`.
- Kill a leftover server with `lsof -ti :5173 | xargs kill`.

## Items, in this order (highest visibility first)

**P008! Email tab row clips on phones** (`src/routes/Email.tsx`). Make the chip row horizontally
scrollable with `overflow-x: auto`, no scrollbar, a right-edge fade so it reads as scrollable, and keep
`Refresh`/`Connect Gmail` reachable by scroll; or wrap to two lines if that looks cleaner at 320 px.
Match the chip row pattern already used on Home (`Home.tsx` filter chips). Remove the email carve-out in
`layoutContract()` and make the three email tests pass the full contract. Regenerate `email-*.png`.

**P013! Tool follow-up echo** (`src/routes/Chat.tsx:154`). The follow-up summary currently posts as a
USER bubble, so the agent answers its own summary. Find how agent messages are written in the stand-in
and the real API (`messages:agentReply` or the equivalent in `convex/messages.ts`; read it, do not edit
it) and post the follow-up as the room agent's message with the agent slug. Keep the R1 failure UI. Update
the `tool working indicator and result card` test so the summary bubble is an agent bubble and no echo
reply appears; regenerate `room-tool.png`.

**P009 Files chip overflow** (`src/routes/Files.tsx`). Truncate room-chip labels with ellipsis (max ~14ch,
`title` attribute with the full name) and let the row scroll like P008. Remove the Files carve-out in
`layoutContract()`. Regenerate `files-*.png`.

**P010 Light-theme headings** (`.t-24` in `src/index.css` or the three routes). Give the heading the
theme's ink token so Files/Tracker/Notifications titles read on light. Regenerate the light baselines
for those three routes only; dark/glass must not change (say so in the report if they do).

**P011 Settings sign-out** (`src/routes/Settings.tsx`). Add a `Sign out` row at the bottom, in the same
row style as the integrations rows, wired to the same sign-out the drawer uses. Extend the settings test:
the row is visible and, when clicked, the app lands on `/auth` (stand-in permitting). Regenerate
`settings-*.png`. Skip the usage readout (needs backend data).

**P012 Upload feedback** (`src/components/Composer.tsx`, `src/routes/Chat.tsx:158`). After a successful
upload, show a small chip above the composer: `Added to room files: <name>` with a `View` link that opens
the files sheet; auto-dismiss after ~6 s. On failure, show `Upload failed, tap to retry` in the error
colour using the same pattern as the R1 send-failure line. Extend `paperclip upload lands in room files`
to assert and photograph the chip (`room-upload-chip.png`), and add a failure case via a new stand-in
switch (`audit_fail_upload=1`).

**P014 "Check your email" pre-empted** (`src/routes/Auth.tsx`). When a magic link was just sent, hold the
card for 900 ms before the existing-session redirect runs, so a fast backend still shows the confirmation.
Add a test that photographs the card (`auth-sent.png`) and then confirms the redirect lands.

For each item: fix the cause, keep the change inside the existing component language, add or extend the
test, regenerate only the baselines your change intentionally alters (list them), run the full suite
green, then update the row in `punch-list.md`: `status` -> `fixed (R2)` + `evidence: <absolute png path>`.
If an item needs a product decision you cannot make, set `needs-patrik (<reason>)` and move on.

## Report `rounds/R2-web-fix.md`

Per item: cause, change (file:line), test title, evidence path, baselines regenerated. Final suite line(s)
from two consecutive `npm run e2e` runs (both must be green). Anything you touched that was not on the
list and why. New bar-fails you noticed in new frames (one line each, no fixes).

## Commit

On `main`, scoped paths only. One commit per item or tight group:
`fix(corner:corner-smooth-loop): R2 P0xx <what changed>`. Never push.

## Hard rules

Never loosen thresholds or tolerances, never skip/delete tests, never delete a baseline without a
regenerated replacement, never touch `convex/`, never deploy, never edit outside `corner-convex/` except
`punch-list.md` and your report. Kill the dev server when done.
