# Brief R<N>-<platform>-fix — close punch-list items, each with the test that keeps it closed

Mission path: `corner:corner-smooth-loop`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-smooth-loop/`
Read `LOOP.md` first, then `punch-list.md`.

You are a headless worker. Nobody will answer questions. You are the BUILDER this round.

## Your items

<ITEM_IDS>   (the orchestrator lists the punch-list ids assigned to you this round, highest priority first)

Work them in the order given. For each item:

1. Reproduce it: open the frame named in the row and find the code at the cited `file:line` (verify the
   citation; if it is wrong, find the real place and correct the row).
2. Fix the cause, not the symptom. Prefer the smallest change that makes the screen right on every device
   in the set. Do not restyle neighbouring things "while you are there".
3. Add or extend the test that would catch it coming back:
   - web: a `test(...)` in `corner-convex/e2e/visual.spec.ts` (an assertion in the layout contract, or a
     screenshot test for the state). Regenerate ONLY the baselines your change intentionally alters,
     with `npx playwright test --update-snapshots --grep "<test title>"`, and say which in the report.
   - native: a step (or an assertion) in `ios-native/CornerUITests/ScreenTour.swift` so the tour photographs
     the fixed state; a frame name added there is the regression check.
4. Re-run the harness (`npm run e2e` for web; `scripts/screenshot-tour.sh "<one device>"` for native
   while iterating, then all three devices once at the end). Open the new frame(s) and confirm with your
   own eyes that the item is gone on every device.
5. Update the row: `status` -> `fixed (R<N>)`, and append `evidence: <absolute path to the frame>`.

If an item cannot be fixed without a product decision (it needs new design, new copy, or a feature),
set `status` -> `needs-patrik (<one-line reason>)` and move on. Do not invent a design.

## Commit

Repo: <REPO_PATH>. Work on `main` in the shared checkout; never a branch, never a worktree, never
`git add -A`/`git add .`, never push, never stash. Stage exactly the paths you changed plus the mission
folder (`corner/missions/corner-smooth-loop/` if the repo is aom-studio; otherwise the orchestrator
commits the mission files). One commit per item or per tight group, message
`fix(corner:corner-smooth-loop): R<N> <item ids> <what changed>`.

## Report

`rounds/R<N>-<platform>-fix.md`: per item: cause in one line, the change (file:line), the test added,
the evidence frame path, and the final harness summary line(s). List anything you touched that was not
on your list and why.

## Rules

- Never loosen a test, threshold, or tolerance to make it pass. Never delete a baseline without a
  regenerated replacement. Never skip a test.
- Never send a chat message, create a real room, delete data, or change account settings. Never print
  or commit credentials.
- Never touch `convex/`, never deploy, never change files outside your repo except the mission folder.
- Kill any dev server you started (`lsof -ti :5173 | xargs kill`) and shut down simulators you booted.
