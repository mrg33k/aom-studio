# Brief R1-backend-reconcile — reconcile the two histories, back up live, stand up the rehearsal deployment

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` there first (the hard lines are not optional). Write your report to
`rounds/R1-backend-reconcile.md` in that folder: every command you ran, with its output pasted.

You are a headless worker, the BUILDER for backend plan Task 1. Nobody will answer questions. If a step
cannot be completed, write exactly what happened in the report and stop; do not improvise around a
safety line.

The plan you are executing: Task 1 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-backend-foundation.md`
(read the Global Constraints section and Task 1). The product spec is beside it in `docs/superpowers/specs/`.

## Where things are, exactly

- Integration worktree: `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`, created from `main` at `11df05a`. **A merge of
  `origin/codex/convex-multi-agent` is already in progress there** (`git merge --no-commit --no-ff` was
  run). `git status` shows 5 conflicted paths: `package.json`, `package-lock.json`, `src/App.tsx`,
  `src/routes/Chat.tsx`, `src/routes/Home.tsx`. Everything under `convex/` merged clean (main never
  touched `convex/` since the merge base, so `convex/` is exactly the source branch's).
- Main checkout: `/Users/aom-inhouse/aom-studio-transfer/corner-convex`. READ ONLY for you, except for
  copying two files out of it (step 2). Its `.env.local` points at the LIVE deployment. Never edit it,
  never run `npx convex` commands from inside it.
- Live deployment: `neat-pony-216` (team `patrik-matheson`, project `corner`). It holds Karen's real
  data. The only commands you may run against it are `npx convex export`, `npx convex function-spec`,
  and `npx convex data` (read). Anything else against it is forbidden, including `--select`.
- Convex CLI is already authenticated on this Mac (`~/.convex/config.json`). Installed `convex` package
  in the main checkout is 1.44.0; the worktree has no `node_modules` yet.
- The live function spec has already been captured for you at
  `corner-v2-integration/docs/superpowers/audits/2026-09-05-live-function-spec.json` (296 functions).
  Live facts verified tonight: `ledger` has exactly 21 rows; `worlds` has 7 rows; Karen's workspace is
  the `worlds` row with slug `karens-world` (`_id` `k17480zy9719gsc6tm83s6hjdx8drg9z`), which has
  5 or 6 `rooms` with `kind: "project"`, 6 with `kind: "mission"`, 2 with `kind: "agent"`. The plan
  says 365 messages for Karen; you verify the real number in step 8 and report it, whatever it is.

## Step 1 — resolve the merge (keep main's UI, take the source branch's backend)

Decision already made by the orchestrator: the UI that ships is `main`'s (it is what is live and what was
polished all day today); the backend that ships is the source branch's (it matches the live deployment).
The desktop UI is being replaced by a later plan anyway.

In `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`:

```bash
git checkout --ours -- src/App.tsx src/routes/Chat.tsx src/routes/Home.tsx package-lock.json
git add src/App.tsx src/routes/Chat.tsx src/routes/Home.tsx package-lock.json
```

`package.json`: resolve by hand to the UNION. Keep main's scripts (`e2e`, `e2e:update`, `audit:vite`),
add the source branch's dependencies `@auth/core` and `@convex-dev/auth` (exact ranges as in the conflict
hunk), keep `@playwright/test` AND add `@types/node`. Then change `"convex": "^1.23.0"` to
`"convex": "^1.44.0"`. Add `"@edge-runtime/vm": "^5.0.0"` to devDependencies (convex-test needs it).
Add these four scripts:

```json
"backup:v2-live": "node scripts/v2-export-live.mjs",
"rehearse:v2": "node scripts/v2-rehearse.mjs",
"verify:v2": "node scripts/v2-verify.mjs",
"parity:v2": "node scripts/v2-schema-parity.mjs"
```

Then remove the source-only UI files that main's `App.tsx` does not import (confirm with `grep -rn` in
`src/` that nothing imports them before removing each):
`src/components/ChatDesktop.tsx`, `src/components/AppErrorBoundary.tsx`,
`src/components/KeyboardShortcutsOverlay.tsx`, `src/cv6-desktop.css`. If `src/lib/agents.ts` is imported
by nothing, remove it too; if something imports it, keep it. Use `git rm --cached` + `rm` for each.

Check the auto-merged files that both branches touched: `src/lib/auth.tsx`, `src/main.tsx`,
`src/index.css`, `src/components/Composer.tsx`, `src/components/CommandPalette.tsx`, `src/routes/Auth.tsx`,
`src/routes/Email.tsx`, `src/routes/Files.tsx`, `src/routes/Notifications.tsx`, `src/routes/Settings.tsx`,
`src/routes/Tracker.tsx`. For each, `git diff main -- <file>`; if the merge pulled in source-branch UI
changes that main's version had deliberately replaced (imports of the removed components, `cv6-*`
classes, `ChatDesktop`), restore main's version with `git checkout main -- <file>`. The rule: `src/` should
end up as main's `src/` plus nothing that references a removed file.

Confirm there are no conflict markers: `grep -rn '^<<<<<<<\|^>>>>>>>' src convex package.json` prints
nothing.

## Step 2 — bring in the two live files that were never committed

The live deployment also runs `cleanupTest.js` and `migrateLegacy.js`, which exist only as untracked files
in the main checkout. Copy them in so parity holds:

```bash
cp /Users/aom-inhouse/aom-studio-transfer/corner-convex/convex/cleanupTest.ts convex/cleanupTest.ts
cp /Users/aom-inhouse/aom-studio-transfer/corner-convex/convex/migrateLegacy.ts convex/migrateLegacy.ts
```

## Step 3 — install, generate, build, test, e2e (all must be green before the merge commit)

```bash
npm install
npx convex codegen
npm run build
npm test
npm run lint
npm run e2e
```

`npm run build` runs `tsc && vite build`; fix type errors at the cause (a missing import from a removed
file means restore main's version of that importer, per step 1). `npm test` runs the five existing test
files (`tests/*.test.ts`); they must pass unchanged. `npm run e2e` is the desktop Playwright suite against
an offline Convex stand-in (`scripts/audit/vite.config.ts`); it must be green with zero skips (kill a
leftover server first: `lsof -ti :5173 | xargs kill`). If e2e baselines fail by anti-aliasing only
(under 5% pixel diff on an otherwise identical frame), that is NOT a merge problem; note it and continue.
Any other e2e failure is a merge problem: find which file the merge changed and restore main's version.

Paste the last 15 lines of each command into the report.

## Step 4 — commit the merge

```bash
git commit -m "chore: reconcile live backend (codex/convex-multi-agent) with main's UI for v2 integration"
```

That is the merge commit; git already knows the paths. Then `git status` must be clean apart from
`docs/superpowers/audits/2026-09-05-live-function-spec.json` (untracked, committed in step 6) and
`.env.local` (created in step 9, never committed).

## Step 5 — write the parity contract and its test (test first, watch it fail)

Create `tests/v2/source-parity.test.ts` exactly as the plan's Task 1 Step 1 shows (import the manifest
JSON and the two helpers). Run `npm test -- tests/v2/source-parity.test.ts`; it must FAIL because the
manifest and the helpers do not exist yet. Paste the failure.

Create `scripts/v2-schema-parity.mjs`. It must export two async functions and also run as a CLI:

- `listSchemaTableNames(schemaPath)`: reads `convex/schema.ts` as text and returns every table name
  declared as `<name>: defineTable(` at two-space indent inside `defineSchema({`. Expected today: 56
  names, the first is `users`, the last is `clientEngine`.
- `listLegacyFunctionNames(convexDir)`: returns `module.js:exportName` identifiers for every exported
  `query`, `mutation`, `action`, `internalQuery`, `internalMutation`, `internalAction`, `httpAction` in
  every `.ts` file directly under `convex/` (skip `convex/lib/`, `convex/_generated/`, `convex/v2Schema/`,
  and any file whose name starts with `v2`). Match `export const <name> = (query|mutation|...)(` and also
  `export const <name> = <otherExportedName>;` aliases (e.g. `projects.ts` has `export const create =
  upsert;` and `export const listAccess = access;`). The identifier format must match the live spec:
  `projects.js:create`.
- CLI mode (`node scripts/v2-schema-parity.mjs`): loads
  `docs/superpowers/audits/2026-09-05-live-backend-parity.json`, computes both lists from the working
  tree, prints `tables: <n>/<n> present`, `functions: <n>/<n> present`, lists every missing item, and
  exits 1 if anything from the manifest is missing.

Create `docs/superpowers/audits/2026-09-05-live-backend-parity.json` with this shape:

```json
{
  "capturedAt": "2026-09-05T22:25:00-07:00",
  "deployment": "neat-pony-216",
  "ledgerCount": 21,
  "tables": [ ...every table name from convex/schema.ts... ],
  "functions": [ ...every identifier from docs/superpowers/audits/2026-09-05-live-function-spec.json, sorted... ]
}
```

Build `functions` from the captured spec (`functions[].identifier`, deduplicated, sorted). Build
`tables` from `listSchemaTableNames`. Then run `npm test -- tests/v2/source-parity.test.ts` and
`npm run parity:v2`: both must pass. If a live function identifier is missing from the working tree,
that is a real reconciliation gap: find the function on `origin/codex/convex-multi-agent` or in the main
checkout's untracked files and bring it in; never drop it from the manifest.

convex-test setup for `tests/v2/`: put `// @vitest-environment edge-runtime` at the top of each
`tests/v2/*.test.ts` file that uses `convexTest`. This first parity test does not use `convexTest`, it
only reads files, so it needs no environment line.

## Step 6 — commit the parity contract

```bash
git add package.json package-lock.json scripts/v2-schema-parity.mjs tests/v2/source-parity.test.ts docs/superpowers/audits/2026-09-05-live-backend-parity.json docs/superpowers/audits/2026-09-05-live-function-spec.json convex/cleanupTest.ts convex/migrateLegacy.ts
git commit -m "chore: live backend parity contract for v2 rehearsal"
```

## Step 7 — export live, including file storage (read-only against live)

Create `scripts/v2-export-live.mjs`: runs
`npx convex export --deployment neat-pony-216 --include-file-storage --path /Users/aom-inhouse/CornerBackups/corner-neat-pony-216-2026-09-05.zip`
(after `mkdir -p /Users/aom-inhouse/CornerBackups`), refuses to overwrite an existing ZIP, then computes
SHA-256 with `node:crypto` and writes it to the `.zip.sha256` sidecar, then opens the ZIP (use
`unzip -l`) and asserts it contains `generated_schema.jsonl`, a `_storage/` directory, and one directory
per table in the parity manifest; prints the entry count and byte size. Exit 1 on any missing piece.

Run `npm run backup:v2-live`. Paste the output. Paste `ls -la /Users/aom-inhouse/CornerBackups/`.

The ZIP contains the `ledgerTokens` table with a live secret. Never print row contents from
`ledgerTokens`. The ZIP never enters git (it lives outside the repo; double-check `git status` stays
clean of it).

## Step 8 — create the rehearsal deployment and import ONLY there

From inside the worktree (which has no `.env.local` yet, so `--select` writes a NEW one there and touches
nothing else):

```bash
npx convex deployment create patrik-matheson:corner:dev/corner-v2-rehearsal-20260905 --type dev --select --expiration "in 14 days"
cat .env.local
```

The `.env.local` must now name the rehearsal deployment (it will NOT say `neat-pony-216`). If it does say
`neat-pony-216`, stop and write that in the report. Then:

```bash
npx convex import /Users/aom-inhouse/CornerBackups/corner-neat-pony-216-2026-09-05.zip --replace-all -y
npx convex dev --once
```

(`npx convex dev --once` pushes the reconciled schema + functions to the rehearsal deployment. If the push
fails on a schema validation against imported data, that is a real reconciliation finding: paste the
error verbatim and stop; do not loosen the schema.)

Verify the copy, reading from the rehearsal deployment (no `--deployment` flag needed now that
`.env.local` selects it, but paste `cat .env.local` right before these so the report proves the target):

```bash
npx convex data ledger --limit 500 | tail -n +3 | grep -c '|'
npx convex data worlds --limit 100
```

Expected: 21 ledger rows, 7 worlds including `karens-world`.

## Step 9 — inventory query + rehearse script

Create `convex/v2Inventory.ts` with ONE read-only `query` named `summary` (no args). For every `worlds`
row it returns `{ worldId, slug, name, rooms: { project, mission, agent, other }, messages, files,
ledger }` where `messages` counts `messages` rows whose `roomId` belongs to that world's rooms, `files`
counts `files` rows the same way, and `ledger` counts `ledger` rows whose `world` equals the world slug.
Also return `totals` across the deployment for `rooms`, `messages`, `files`, `ledger`, `worlds`, and a
list `karen.missionRooms[]` of `{ roomId, title, project, messages }` for every `kind: "mission"` room in
`karens-world`, plus `karen.projectRooms[]` `{ roomId, title, project, messages }` for its `kind: "project"`
rooms. Use indexes where they exist (`rooms` has `by_world`; check `convex/schema.ts` for the exact index
names and use them); do not add indexes in this round.

Create `scripts/v2-rehearse.mjs`: runs `npx convex run v2Inventory:summary` (against whatever `.env.local`
selects; the script must REFUSE to run if `.env.local` contains `neat-pony-216`), pretty-prints the
result, writes it to `docs/superpowers/audits/2026-09-05-rehearsal-inventory.json`, and exits 1 if
`totals.ledger !== 21` or `karens-world` is missing.

Run `npx convex dev --once` again (to push the new query), then `npm run rehearse:v2`. Paste the whole
inventory into the report. State Karen's real message count and whether her mission rooms' `project`
strings each match one of her project room titles (list every mismatch; do not fix anything).

## Step 10 — commit and report

```bash
git add scripts/v2-export-live.mjs scripts/v2-rehearse.mjs convex/v2Inventory.ts docs/superpowers/audits/2026-09-05-rehearsal-inventory.json
git commit -m "chore: v2 rehearsal deployment from the live export"
git log --oneline -5
git status
```

`.env.local` must show as untracked or ignored, never staged.

Report `rounds/R1-backend-reconcile.md`: per step, the commands and pasted output; the three commit
hashes; the rehearsal deployment name; the ZIP size and SHA-256; the inventory; Karen's real counts;
the list of mission rooms whose `project` string matches no project room title; every deviation from
this brief and why.

## Hard rules

Never run `import`, `deploy`, `dev`, `run`, `env`, or `--select` against `neat-pony-216`. Never edit
`/Users/aom-inhouse/aom-studio-transfer/corner-convex/.env.local`. Never print a `ledgerTokens` token.
Never commit the ZIP, the `.sha256`, or `.env.local`. Never `git add -A`. Never push. Never delete a
test or loosen a schema to make a push succeed; stop and report instead. Never edit files under
`docs/superpowers/plans/` or `docs/superpowers/specs/`. Kill the vite server when done.
