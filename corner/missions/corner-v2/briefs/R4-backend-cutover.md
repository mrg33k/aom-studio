# Brief R4-backend-cutover — compatibility bridge, reversible cutover gates, AOM mapping run, production clone (backend plan Task 7)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40), `rounds/R3-backend-mapping.md` (how apply/verify work and the
script-only key), `rounds/R3-backend-routing.md`, `rounds/R3-backend-visual.md`. Write your report to
`rounds/R4-backend-cutover.md`: every command with its output.

You are a headless worker, the BUILDER for backend plan Task 7 plus the AOM workspace mapping run
(same machinery as Karen's). Nobody will answer questions.

Plan: Task 7 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-backend-foundation.md`
and its Final Verification Checklist. Spec: "Existing data and source control facts" (production
deployment paragraph), "Error and safety behavior", "Delivery order" steps 6-8.

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`. `.env.local` selects the REHEARSAL deployment `dev:adjoining-tiger-87`
  (expires 2026-09-10). `grep CONVEX_DEPLOYMENT .env.local` before every `npx convex` command and
  paste it. `CORNER_V2_MIGRATION_KEY` is set on the rehearsal deployment; load it into your shell with
  `export CORNER_V2_MIGRATION_KEY="$(npx convex env get CORNER_V2_MIGRATION_KEY | tail -1)"`; never
  print it.
- Backup ZIP `/Users/aom-inhouse/CornerBackups/corner-neat-pony-216-2026-09-05.zip`, sha
  `5c7be963af726cbbe141efa38fe8a9944725b48e44a3029809f7130d9ef106ad`. Live `neat-pony-216`: export,
  function-spec, data reads only. Never `import`, `deploy`, `dev`, `run`, `env set`, `--select`
  against it.
- Shipped so far: `v2Projects`, `v2Threads`, `v2Routing`, `v2CrossProject`, `v2Ledger`,
  `v2Workspace`, `v2Mapping` (`planWorld`, `approveManifest`), `v2Migrations` (`getCutover`,
  `applyWorldMigration`, `reconcile`, key-gated `scriptApprove/scriptApply/scriptReconcile/
  scriptListThread`), `v2Visual` + `v2VisualWindow` (if `rounds/R3-backend-visual.md` exists; else
  wait 10 minutes and re-check, up to 6 times, before starting Step 3), `scripts/v2-verify.mjs`
  (`--run-id --mapping [--apply]`, Karen only today). Karen's rehearsal migration is applied and
  verified (365 / 286 / 9 threads).
- A DESKTOP worker may be editing `src/` and `e2e/` at the same time. You never touch `src/`,
  `e2e/`, `scripts/audit/`, `package.json`, `docs/superpowers/plans|specs`. Never run `npm run
  build`; use `npx tsc --noEmit -p tsconfig.json` + `npx convex dev --once`. On `index.lock` wait
  10 s, retry up to 5 times. Never `git add` a path you did not create or edit.

## Step 1 — failing cutover tests (`tests/v2/cutover.test.ts`, edge-runtime)

Seed via `tests/v2/setup.ts`. Tests:

1. `refuses cutover until every gate is green`: `activateCutover({ workspaceId, runId })` rejects
   with `"V2 cutover gate failed: <comma-separated failed gate names>"` listing every failed gate
   (`exportVerified`, `mappingApproved`, `reconciliationMatches`, `sentinelHolds`,
   `compatibilityPasses`, `ledgerPreserved`, `noLegacyScheduler`) when none are recorded.
2. `activates dual write once all gates are recorded green`: after `recordGate` for each →
   `mode: "v2_dual_write"`, a `v2Cutovers` row, and a ledger `decided` row.
3. `rolls back reads without deleting v2 rows`: `rollbackCutover({ workspaceId, reason })` →
   `getCutover` returns `legacy`; `threads`, `messageLinks`, `legacyRoomLinks` counts unchanged;
   ledger row `decided` with `supersedes` pointing at the activation row's id.
4. `compat bridge resolves rooms both ways`: in `legacy` mode `v2Compatibility.getRoomThread({
   roomId })` returns `{ mode: "legacy", threadId: null, roomId, messages: <legacy list> }`; in
   `v2_dual_write` a mapped room returns `{ mode, threadId, messages: <linked, read-through> }` and
   an archived room returns `threadId: null` with the legacy list (never an error).
5. `dual write mirrors a room send into the thread`: in dual-write, `v2Compatibility.sendRoomMessage({
   roomId, text })` inserts the legacy `messages` row AND a `messageLinks` row for it; in `legacy`
   mode it inserts only the legacy row; in both modes the legacy row is identical in shape to what
   `messages.send` writes today (read `convex/messages.ts` `send` to mirror its fields: `roomId`,
   `worldId`, `text`, `status: "sent"`, `role: "user"`, `userId`, `userName`, `createdAt`,
   `clientMessageId`, `source`).
6. `v2_primary needs seven days of dual write`: `promotePrimary({ workspaceId })` rejects with
   `"v2_primary requires 7 days of dual-write reconciliation"` until the activation row is 7 days
   old (fake timers) AND the latest `reconcile` matched.

Run; paste the failure.

## Step 2 — implement

- `convex/v2Compatibility.ts`: `getRoomThread` (query; authenticated through
  `requireWorkspaceMember` on the room's world; for the shipped desktop seam it MUST also accept
  the legacy client-supplied identity path via `resolveViewer` from `lib/viewer.ts`, because the
  current web build sends no JWT on some calls; document that this is the ONE v2 read that tolerates
  `resolveViewer`, and that it returns only ids and the same rows `messages.list` already returns),
  `sendRoomMessage` (mutation; same auth as `messages.send`, delegates to it, then in dual-write
  links the new row). `listRoomsForWorkspace({ workspaceId })` → for old clients: legacy `rooms`
  rows unchanged, plus `threadId` on mapped ones.
- `convex/v2Migrations.ts` additions: `recordGate({ workspaceId, runId, gate, passed, evidence })`
  (owner|admin, and a `scriptRecordGate` key-gated twin for the verify script), `activateCutover`,
  `rollbackCutover`, `promotePrimary`, `gateStatus({ workspaceId, runId })` query. Gates and how
  the verify script proves each: `exportVerified` (ZIP sha matches manifest), `mappingApproved`
  (run state approved + sha), `reconciliationMatches` (checksumMatches true, duplicates 0),
  `sentinelHolds` (Karen: source 365), `compatibilityPasses` (Step 4 fixture run green),
  `ledgerPreserved` (deployment ledger count ≥ 21 and the 21 original ids still present: read them
  from the ZIP's `ledger/documents.jsonl`), `noLegacyScheduler` (no `routines` row `enabled: true`
  whose `roomId` belongs to the workspace; report which exist).
- `scripts/v2-verify.mjs`: add `--workspace <worldId>` (default Karen's), `--gates` (records all
  seven with evidence via `scriptRecordGate`), `--activate` (calls `scriptActivateCutover` — add it,
  key-gated), `--rollback`, `--status`. Add `--generate-manifest <path>` which writes a manifest
  from `scriptPlanWorld` (add, key-gated) using these rules, then stops for review: project rooms
  with `humanMessageCount === 0` or `archived: true` → `legacy_archive` ("scaffolding: no human
  messages" / "archived room"); duplicate project titles → the one with the most messages is
  `mapped`, the rest `legacy_archive` ("duplicate of <roomId>"); mission rooms → `mapped` only when
  `project` equals exactly one MAPPED project room's title, else `legacy_archive` ("parent
  '<project>' is not a mapped project"); agent rooms → `legacy_archive`; `approver` =
  `"orchestrator:claude on Patrik's WD-40 directive, <ISO now>"`. Names: humanise slugs
  (`kraken-corps` → "Kraken Corps").

## Step 2b — one façade gap left by R3

`convex/v2Workspace.getConversationSurface` returns `artifacts: []` with a TODO. Fill it: call
`v2Visual`'s `artifactsForThread` core (import the helper the VISUAL worker exported; if it only
exists as a query, extract its body into an exported `artifactsForThreadCore(ctx, threadId)` in
`convex/v2Visual.ts`, keeping the query) and map to the desktop `Artifact` shape (`{ id, kind,
title, version, src, liveUrl }`, legacy synthesised ones keep their `legacy:` ids). Add one test to
`tests/v2/routing-and-access.test.ts`? NO, that is the routing worker's file and it is committed;
add `tests/v2/surface-artifacts.test.ts` instead: a thread with one created artifact and one legacy
file returns two artifacts from the façade.

## Step 3 — old-client compatibility fixtures (`tests/v2/compat-fixtures.test.ts`)

Read `ios/` (the small adapter stub) and `src/routes/Chat.tsx` + `src/routes/Home.tsx` on `main`
(`git show main:src/routes/Chat.tsx`) to list every Convex function the shipped web and iOS
clients call (`rooms.listRooms`, `rooms.getRoom`, `messages.list`, `messages.send`,
`messages.listWithAttachments`, `files.*`, `users.*`, `worlds.*`, `notifications.*`, `reads.*`,
`turns.*`, `email.*`, `tracker.*`, plus whatever else you find; paste the list). For each, a test
that calls it through convex-test in `legacy` and `v2_dual_write` mode against a seeded room and
asserts the response shape is identical between modes (deep-equal after stripping `_creationTime`
and ids). This is the `compatibilityPasses` gate.

## Step 4 — AOM workspace mapping on the rehearsal copy

```bash
grep CONVEX_DEPLOYMENT .env.local
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-rehearsal --generate-manifest docs/superpowers/migrations/aom-v2-mapping.json
```

Paste the summary line the script prints (counts per decision state; never room contents). Then
apply and verify twice:

```bash
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-rehearsal --mapping docs/superpowers/migrations/aom-v2-mapping.json --apply
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-rehearsal --mapping docs/superpowers/migrations/aom-v2-mapping.json --apply
```

Expected: first run links every message of every mapped room (tens of thousands; chunk per room,
and per 200 messages inside a room via `scriptApplyRoom({ runId, roomId, cursor })` if a single
room exceeds limits, the biggest room has 5,977), second run inserts 0, `checksumMatches: true`.
The AOM source sha is computed from the ZIP the same way as Karen's. If any single room cannot be
verified, list it and stop; do not skip silently.

## Step 5 — gates on the rehearsal copy, then activate dual write there

```bash
npm test
npx tsc --noEmit -p tsconfig.json
npx convex dev --once
npm run parity:v2
node scripts/v2-verify.mjs --workspace k17480zy9719gsc6tm83s6hjdx8drg9z --run-id karen-rehearsal --mapping docs/superpowers/migrations/karen-v2-mapping.json --gates
node scripts/v2-verify.mjs --workspace k17480zy9719gsc6tm83s6hjdx8drg9z --run-id karen-rehearsal --activate
node scripts/v2-verify.mjs --workspace k17480zy9719gsc6tm83s6hjdx8drg9z --run-id karen-rehearsal --status
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-rehearsal --mapping docs/superpowers/migrations/aom-v2-mapping.json --gates
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-rehearsal --activate
```

Both workspaces end in `v2_dual_write` on the rehearsal copy. Paste each output.

## Step 6 — production clone

First look, then decide, then paste:

```bash
npx convex deployment list 2>&1 | head -30
```

If the `corner` project already has a production deployment, report what it holds (`npx convex
data worlds --prod --limit 10`); do NOT import over it. Then, per the plan, create the separate
project and its production deployment (a second Convex project on the same team; no paid plan is
selected or required; if the CLI asks to upgrade a plan, STOP and report):

```bash
npx convex project create corner-v2-production
npx convex deployment create patrik-matheson:corner-v2-production:production --type prod
```

Then write a second env file for it, `.env.production-clone` (untracked; add it to `.gitignore`
if `.env.*` is not already ignored; paste `git check-ignore .env.production-clone`), and run
everything below with `--deployment` pointing at it OR by exporting `CONVEX_DEPLOYMENT` for the
command (never edit `.env.local`):

```bash
npx convex import /Users/aom-inhouse/CornerBackups/corner-neat-pony-216-2026-09-05.zip --deployment <prod-clone> --replace-all -y
CONVEX_DEPLOYMENT=<prod-clone> npx convex deploy -y
CONVEX_DEPLOYMENT=<prod-clone> npx convex env set CORNER_V2_MIGRATION_KEY "$(openssl rand -hex 16)"
```

Then repeat Steps 4 and 5 against the clone (both workspaces: generate-manifest is NOT re-run;
reuse the two committed manifests; apply twice; gates; activate). Paste every output. Record the
clone's deployment name and URL in the report. `neat-pony-216` untouched throughout.

## Step 7 — commit

```bash
git add convex/v2Compatibility.ts convex/v2Migrations.ts scripts/v2-verify.mjs tests/v2/cutover.test.ts tests/v2/compat-fixtures.test.ts docs/superpowers/migrations/aom-v2-mapping.json docs/superpowers/audits/2026-09-05-aom-reconciliation.json docs/superpowers/audits/2026-09-06-production-clone.json .gitignore
git commit -m "feat: add reversible v2 cutover gates and the production clone"
git log --oneline -3 && git status
```

`docs/superpowers/audits/2026-09-06-production-clone.json` = deployment name, URL, import counts,
both workspaces' reconcile results and cutover modes, gate statuses.

## Report `rounds/R4-backend-cutover.md`

Per step: commands + output; failing then passing; the compat function list; the AOM manifest
summary (counts by state, the duplicate-title groups, the scaffolding count); both apply runs on both
deployments; gate statuses; the production clone facts; commit hash; deviations.

## Hard rules

Never touch `neat-pony-216` beyond reads/export. Never edit `.env.local`. Never print a key or
token. Never delete a source row. Never `import` over a deployment that already holds data other
than the rehearsal and the fresh clone. Never accept a paid-plan prompt. Never edit `src/`, `e2e/`,
`docs/superpowers/plans|specs`. Never `git add -A`. Never push.
