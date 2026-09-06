# Brief R12-backend-aom-missions-and-cleanup — map AOM's 302 mission rooms with an evidence-based rule, silence the convex-test scheduler noise, retire the stray deployment

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40) and `rounds/R4-backend-cutover.md` (the AOM manifest run, its
summary counts, the stray deployment, the gates). Write your report to
`rounds/R12-backend-aom-missions-and-cleanup.md`: every command with its output.

You are a headless worker, the BUILDER. Nobody will answer questions.

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`, HEAD `184c576` or later. `.env.local` → rehearsal
  `dev:adjoining-tiger-87` (expires 2026-09-10). Production clone
  `patrik-matheson:corner-v2-production:production` = `prod:brilliant-scorpion-163` (both
  workspaces in `v2_dual_write`; migration key set there; use `--deployment` for it, never edit
  `.env.local`). `neat-pony-216` stays read-only. Backup ZIP + sha in `~/CornerBackups/`.
- Files: `docs/superpowers/migrations/aom-v2-mapping.json` (the R4 manifest: 47 projects mapped,
  302 missions `legacy_archive` with reason `parent '<x>' is not a mapped project`),
  `docs/superpowers/audits/2026-09-05-aom-reconciliation.json`, `scripts/v2-verify.mjs`,
  `convex/v2Mapping.ts`, `convex/v2Migrations.ts`, `tests/v2/*.test.ts`. A native worker is in
  `ios-native/` (different repo); nobody else is in this worktree. Rules: no `npm run build`; `npx
  tsc --noEmit -p tsconfig.json` + `npx convex dev --once`; never `git add -A`; never push.

## Part A — why zero AOM missions mapped, with evidence

Write `scripts/v2-mission-parents.mjs`: reads the backup ZIP's `rooms/documents.jsonl` for the
AOM world (`k1798fjd7haec6r0ywkqzv5j858cgahm`), and for every `kind: "mission"` room prints
`roomId | title | project string | humanMessageCount | messages` next to the candidate project rooms
under FOUR matchers, each scored separately: (1) exact title, (2) exact slugified title
(`slugify(projectRoom.title) === slugify(mission.project)`), (3) the project room's own `project`
field equals the mission's `project` string, (4) the mission's `project` string equals a mapped
project's `slug` in the R4 manifest. Print a summary: how many missions each matcher resolves to
exactly one MAPPED project, how many to several, how many to none. Paste the summary and the first
30 rows. From that, decide the rule (the orchestrator's guess: matcher 2 or 3 resolves most,
because room titles are humanised while `project` strings are slugs). Missions with
`humanMessageCount === 0` stay archived (scaffolding). Missions resolving to several projects stay
archived with the candidates listed.

Then: add the winning matcher to `scripts/v2-verify.mjs --generate-manifest` as
`--mission-matcher <name>` (default stays `exact-title` so Karen's manifest is reproducible), and
regenerate `docs/superpowers/migrations/aom-v2-mapping.json` as a NEW file
`aom-v2-mapping.r12.json` (never overwrite the applied one; the applied manifest's sha is recorded
on the run rows). Run id `aom-r12`. Approver string as before.

Apply on the REHEARSAL copy first: `--apply` twice; expected: new `missions` rows and new links
only for the newly mapped rooms, zero duplicate links, zero changes to already-mapped projects, all
47 project checksums still match plus the new mission threads verified; second run inserts 0. Then
the same on the production clone with `--deployment patrik-matheson:corner-v2-production:production`.
Paste both summaries. Record gates + status for `aom-r12` on both.

## Part B — convex-test scheduler noise

`npm test` prints "Vitest caught 4 unhandled errors". Find them (`npm test 2>&1 | grep -A12
'Unhandled'`); they come from `ctx.scheduler.runAfter` / `runAt` registrations inside code paths the
cutover and compat tests exercise, rejecting after the test ends. Fix at the cause: in tests, use
convex-test's `t.finishInProgressScheduledFunctions()` / `t.finishAllScheduledFunctions(vi.runAllTimers)`
with fake timers where a scheduled function is expected, or make the production code's scheduler
call conditional on `process.env.NODE_ENV !== "test"`? NO, never branch production code on test env.
Use the convex-test API. `npm test` must end with zero unhandled errors; paste the tail.

## Part C — the stray deployment

`prod:lovable-weasel-178` (project `corner`?) was created by an unscoped `npx convex deploy`. Check
`npx convex deployment --help` for a delete/remove subcommand. If one exists AND the deployment is
verifiably empty (`npx convex data worlds --deployment <ref> --limit 1` returns no rows) AND its name
is exactly `lovable-weasel-178`, delete it and paste the output. If no CLI delete exists, write the
exact dashboard steps in the report and stop; do not touch any other deployment.

## Gates

```bash
grep CONVEX_DEPLOYMENT .env.local
npm test
npx tsc --noEmit -p tsconfig.json
npx convex dev --once
npm run parity:v2
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-r12 --status
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-r12 --status --deployment patrik-matheson:corner-v2-production:production
```

## Commit

```bash
git add scripts/v2-mission-parents.mjs scripts/v2-verify.mjs docs/superpowers/migrations/aom-v2-mapping.r12.json docs/superpowers/audits/2026-09-06-aom-r12-reconciliation.json tests/v2 convex/v2Mapping.ts convex/v2Migrations.ts
git commit -m "feat: map AOM missions by slug parent and quiet convex-test scheduler noise"
git log --oneline -3 && git status
```

## Report `rounds/R12-backend-aom-missions-and-cleanup.md`

The matcher summary table and 30 sample rows; the chosen rule and why; both apply runs on both
deployments (counts); the unhandled-error fix (before/after tails); the stray-deployment outcome;
deviations.

## Hard rules

Never overwrite the applied `aom-v2-mapping.json`. Never touch `neat-pony-216`. Never delete a
deployment other than `lovable-weasel-178`, and only if empty. Never branch product code on a test
env var. Never `git add -A`. Never push.
