# Brief R3-backend-mapping — Karen's mapping manifest, immutable history links, and Node-side checksums (backend plan Tasks 3 + 4)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines), `rounds/R1-backend-reconcile.md` (Karen's real inventory, step 9), and
`rounds/R2-backend-spine.md` (exact spine tables and function names). Write your report to
`rounds/R3-backend-mapping.md`: every command with its output.

You are a headless worker, the BUILDER for backend plan Tasks 3 and 4, run as ONE task because Task 4
depends on Task 3's manifest and both edit `convex/v2Migrations.ts`. Nobody will answer questions.

Plan: Tasks 3 and 4 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-backend-foundation.md`.
Spec: "Existing data and source control facts", "Target data model", "Verification and acceptance
→ Backend" in `docs/superpowers/specs/2026-09-05-corner-v2-reorganization-design.md`.

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`. `.env.local` selects the REHEARSAL deployment `dev:adjoining-tiger-87`
  (a full copy of live, expires 2026-09-10). `grep CONVEX_DEPLOYMENT .env.local` before any
  `npx convex` command and paste it; it must never say `neat-pony-216`.
- Two other workers run in this worktree at the same time: ROUTING (edits `convex/v2Schema/routing.ts`,
  `v2Routing.ts`, `v2CrossProject.ts`, `v2Ledger.ts`, `v2Workspace.ts`, `ledger.ts`,
  `tests/v2/routing-and-access.test.ts`) and VISUAL (edits `convex/v2Schema/visual.ts`, `v2Visual.ts`,
  `v2VisualWindow.ts`, `tests/v2/visual-state.test.ts`). You never touch those files. Your files:
  `convex/v2Mapping.ts` (new), `convex/v2Migrations.ts`, `convex/v2Threads.ts` (only to ADD
  functions; do not change existing signatures), `scripts/v2-verify.mjs` (new),
  `tests/v2/karen-mapping.test.ts`, `tests/v2/history-reconciliation.test.ts`,
  `docs/superpowers/migrations/karen-v2-mapping.json`. Nothing else. Concurrency: (a) do not run
  `npm run build` (use `npx tsc --noEmit -p tsconfig.json` + `npx convex dev --once`); (b) `npx
  convex dev --once` bundles all of `convex/`, so it can fail on a type error in a file you do not
  own; if so wait 60 seconds and retry, up to 8 times, note it, never edit that file; (c) `npm test`
  may show failures in `routing-and-access` or `visual-state` (other workers mid-edit); your gate is
  `npm test -- tests/v2/karen-mapping.test.ts tests/v2/history-reconciliation.test.ts
  tests/v2/projects-and-tenancy.test.ts`; report the full-suite line as observed; (d) on
  `index.lock` wait 10 s and retry up to 5 times; never delete the lock; (e) never `git add` a path
  you did not create or edit. HEAD is `45b33e7`.
- Spine tables from R2 (`convex/v2Schema/spine.ts`): `missions`, `threads`, `messageLinks`,
  `legacyRoomLinks`, `v2MigrationRuns`, `v2Cutovers`, `threadBlocks`. Spine functions
  (`convex/v2Projects.ts`): `ensureGeneral`, `createProject`, `createMission`, `ensureThread`, `get`,
  `getMission`, `listNavigation`. Legacy `projects` table now has optional `isGeneral`, `tint`,
  `mark`, `brandRules`. Read `rounds/R2-backend-spine.md` for the exact arg names before calling any.
- Karen's world: `k17480zy9719gsc6tm83s6hjdx8drg9z` (slug `karens-world`). 365 messages, 0 files.
  Rooms (from `docs/superpowers/audits/2026-09-05-rehearsal-inventory.json`):

  Project rooms (6): `eagle-s-welding` (65 msgs), `aheadofmarket` (7), `ambition-mechanical-services`
  (132), `passive-income` (6), `karens-world-main` (2), `transmisiones-garcia-s` (3).

  Mission rooms (6): `qbo-cleanup` → project `eagle-s-welding` (8); `family` → `karens-world-main`
  (14); `truepath-solution` `jn7av9apkjykrev8y6f73kcz8s8ds8bm` → `karens-world-main` (49);
  `assigned-to-from-dashboard-file-service-refriger` `jn7c562mtj44vbpk78328d78rx8drbhs` → project
  string `agent-work` (3, no such project); `assigned-to-from-dashboard-file-service-refriger`
  `jn788zz89be5rgb33kpwm197658drm7f` → project string equals its own title (2, no such project);
  `truepath-solution` `jn79j8tbpxbrs0rm9wy5wydzbx8dshyp` → project string `truepath-solution` (1, no
  such project).

  Agent rooms (4, 73 msgs total): listed by the inventory query as `kind: "agent"`.

## Mapping decisions (made by the orchestrator under Patrik's WD-40 directive; record them, do not re-decide)

The plan's manifest is "human-approved". Patrik's standing rule is that the loop does not stop for
his call; the orchestrator approved these on his behalf at 2026-09-05 11:20 PM Phoenix and they are
listed in the mission ledger for him to overrule. Approver string in the manifest:
`"orchestrator:claude on Patrik's WD-40 directive, 2026-09-05T23:20:00-07:00"`.

1. Each of the 6 project rooms → one `projects` row (slug = room title, name = room title
   humanised: `eagle-s-welding` → "Eagle's Welding", `aheadofmarket` → "Ahead of Market",
   `ambition-mechanical-services` → "Ambition Mechanical Services", `passive-income` → "Passive
   Income", `karens-world-main` → "Karen's World", `transmisiones-garcia-s` → "Transmisiones
   Garcia's") + its Thread, `state: "mapped"`. `karens-world-main` is a normal Project, NOT General;
   General is created separately by `ensureGeneral` and stays empty.
2. `qbo-cleanup` → Mission under `eagle-s-welding`; `family` → Mission under `karens-world-main`;
   `truepath-solution` (49 msgs, `jn7av9…`) → Mission under `karens-world-main`. `state: "mapped"`.
3. The three unresolved mission rooms (`jn7c562…`, `jn788zz…`, `jn79j8t…`) → `state:
   "legacy_archive"` with reasons `"parent 'agent-work' is not a project"`, `"self-referential
   parent; duplicate of jn7c562…"`, `"self-referential parent; superseded by the 49-message
   truepath-solution mission"`. They stay searchable; nothing is deleted.
4. The 4 agent rooms → `state: "legacy_archive"`, reason `"agent room; v2 has no agent rooms"`.
5. Karen's messages in mapped rooms (292) get `messageLinks`; the 73 in archived rooms stay
   reachable through the room, unlinked.

## Step 1 — failing mapping test (`tests/v2/karen-mapping.test.ts`, `// @vitest-environment edge-runtime`)

Seed a synthetic "Karen" in convex-test (`tests/v2/setup.ts`) whose rooms mirror the real shapes
above: 6 project rooms, 6 mission rooms with the same `project` strings, 4 agent rooms, and at least
one message per room (use small numbers; assert on structure, not on 365). Then:

1. `plans every room and reports the unresolved ones`: `planWorld({ workspaceId, runId:
   "karen-rehearsal", dryRun: true })` returns `report.rooms.length === 16`, exactly 3 rooms with
   `state: "unresolved"` and their `candidates` arrays, 4 `legacy_archive` (agent), 9 `mapped`
   (6 project + 3 mission), `source.messages` equal to the seeded total, `unresolvedCount: 3`, and
   writes a `v2MigrationRuns` row with `dryRun: true`.
2. `blocks apply without an approved manifest`: `applyWorldMigration({ workspaceId, runId:
   "karen-rehearsal", manifestSha256: "not-approved" })` rejects with `"Approved mapping manifest
   required"`.
3. `blocks apply while any room is unresolved`: with a manifest whose sha matches but that still
   lists one `unresolved` → rejects with `"Mapping manifest has unresolved rooms"`.

Run it; paste the failure.

## Step 2 — failing history test (`tests/v2/history-reconciliation.test.ts`, edge-runtime)

Using the same seed plus an approved manifest built in the test (see Step 4 for the shape; compute
its sha with a tiny FNV-1a helper in the test, and register it via `approveManifest`):

1. `preserves order, time, author, reply, attachment references`: after `applyWorldMigration`,
   `reconcile({ runId })` returns `{ sourceMessages: N, linkedMessages: M, duplicateMessageIds: [],
   unlinkedArchivedMessages: N - M, threads: 9, projects: 6, missions: 3 }` where M is the message
   count of mapped rooms; and for one mapped room, `v2Threads.listThreadMessages({ threadId })`
   returns the same ids in the same `createdAt` order as `messages.by_room_created`, each carrying
   `replyTo`, `attachments`, `userName`, `agentSlug`, `role` unchanged (read-through, never copied).
2. `adds no duplicate links on a second migration`: second `applyWorldMigration` → `insertedMessageLinks:
   0`, `insertedProjects: 0`, `insertedMissions: 0`, `insertedThreads: 0`.
3. `never patches a source message`: snapshot every `messages` row before apply; after apply every
   row is deep-equal to its snapshot.

Run it; paste the failure.

## Step 3 — implement `convex/v2Mapping.ts`

- `planWorld({ workspaceId, runId, dryRun })` mutation (`requireWorkspaceMember`, role owner|admin):
  loads every `rooms` row in the world (`by_world`); for each computes `{ roomId, title, kind,
  project (raw string), messages (count via `by_room`, paginate 500 at a time), files (count
  via `files.by_room`), candidates: [{ projectRoomId, title, reason }], state }`. Rules: `kind:
  "project"` → `mapped` (as project); `kind: "agent"` → `legacy_archive`; `kind: "mission"` →
  `mapped` if `project` string equals exactly one project room's title (candidate = that room),
  else `unresolved` with candidates = project rooms whose title shares a token with the mission
  title or project string (may be empty). Never infer parentage from title similarity into
  `mapped`. Writes `v2MigrationRuns` `{ runId, worldId, dryRun, state: "planned", report }`
  (upsert by runId). Returns the report.
- `approveManifest({ workspaceId, runId, manifest })` mutation: validates the manifest shape
  (below), rejects if any `decision.state === "unresolved"`, rejects if `manifest.sourceExportSha256`
  does not equal the run's recorded export sha (set from the arg on first call; the real one is
  `5c7be963af726cbbe141efa38fe8a9944725b48e44a3029809f7130d9ef106ad`), stores `manifestSha256`
  (FNV-1a-64 hex of the canonical JSON: keys sorted, no whitespace) on the run row, and marks
  `state: "approved"`.

Manifest shape (`docs/superpowers/migrations/karen-v2-mapping.json`):

```json
{
  "workspaceId": "k17480zy9719gsc6tm83s6hjdx8drg9z",
  "workspaceSlug": "karens-world",
  "runId": "karen-rehearsal",
  "sourceExportSha256": "5c7be963af726cbbe141efa38fe8a9944725b48e44a3029809f7130d9ef106ad",
  "generatedAt": "<ISO>",
  "approver": "orchestrator:claude on Patrik's WD-40 directive, 2026-09-05T23:20:00-07:00",
  "decisions": [
    { "roomId": "jn72nqepe2f2denqspbyk2zzsn8drdfh", "title": "eagle-s-welding", "kind": "project", "state": "mapped", "as": "project", "projectSlug": "eagle-s-welding", "projectName": "Eagle's Welding", "reason": "project room" },
    { "roomId": "jn79x3nx7hspcagc3mb4d82sc18dr5ar", "title": "qbo-cleanup", "kind": "mission", "state": "mapped", "as": "mission", "parentRoomId": "jn72nqepe2f2denqspbyk2zzsn8drdfh", "missionSlug": "qbo-cleanup", "missionName": "QBO cleanup", "reason": "project string matches eagle-s-welding" },
    { "roomId": "jn7c562mtj44vbpk78328d78rx8drbhs", "title": "assigned-to-from-dashboard-file-service-refriger", "kind": "mission", "state": "legacy_archive", "reason": "parent 'agent-work' is not a project" }
  ]
}
```

One entry per Karen room (16). Generate it from the REAL rehearsal inventory (`npx convex run
v2Mapping:planWorld` cannot run unsigned, so build the manifest from
`docs/superpowers/audits/2026-09-05-rehearsal-inventory.json` plus the 4 agent room ids you fetch
with `npx convex data rooms --limit 2000` filtered to Karen's worldId and `kind: "agent"`; paste only
ids and titles, never `lastMessageText`).

## Step 4 — implement apply + reconcile in `convex/v2Migrations.ts` and `v2Threads.ts`

- `applyWorldMigration({ workspaceId, runId, manifestSha256 })` mutation (owner|admin): requires
  run `state: "approved"` and matching sha, else `"Approved mapping manifest required"`; if the
  stored manifest still has `unresolved` → `"Mapping manifest has unresolved rooms"`. Then, in
  batches (one room per call is fine; loop client-side in `scripts/v2-verify.mjs` via
  `applyWorldMigrationRoom({ runId, roomId })` if a single call would exceed limits; document
  which you chose):
  1. Project rooms → `projects` row if none with that slug in the world (`by_world_slug`), Thread
     via `v2Projects.ensureThread` semantics, `legacyRoomLinks` `{ state: "mapped", projectId,
     threadId, runId }`.
  2. Mission rooms → `missions` row under the parent project (slug unique per project), Thread,
     `legacyRoomLinks` mapped.
  3. Archived rooms → `legacyRoomLinks` `{ state: "legacy_archive", reason, runId }` only.
  4. For every mapped room, every `messages` row (paginate `by_room_created`, 200 per page) gets
     ONE `messageLinks` row `{ messageId, threadId, sortCreatedAt: message.createdAt,
     sortMessageId: String(message._id), linkedAt }` if none exists (`by_message`). Source rows are
     NEVER patched, copied, or deleted.
  5. Counters returned: `insertedProjects`, `insertedMissions`, `insertedThreads`,
     `insertedMessageLinks`, `archivedRooms`, `skippedExisting`. Run row → `state: "applied"`,
     `completedAt`.
  6. One ledger row per apply (`kind: "did"`, `who: "corner:migration"`, `surface: "corner:v2"`,
     `world: <slug>`, `subjects: ["corner-v2-migration"]`, `what: "Linked <n> messages across <m>
     rooms for <workspace>."`, `links: ["run:<runId>"]`), appended via a direct
     `ctx.db.insert("ledger", …)` using `normalizeWhat` from `convex/ledger.ts`.
- `reconcile({ runId })` query: per mapped room, `sourceMessages` (by_room count) vs
  `linkedMessages` (by_thread_sort count); `duplicateMessageIds` (any messageId with >1 link);
  totals; `threads`, `projects`, `missions` created by this run; `unlinkedArchivedMessages`.
- `v2Threads.listThreadMessages` (exists from R2): confirm it reads `messageLinks` via
  `by_thread_sort` and returns the SOURCE message fields read-through (text, attachments, replyTo,
  userName, agentSlug, role, createdAt, reactions) merged with `threadBlocks`; if R2 only stubbed the
  legacy branch, complete it here without changing the signature.

## Step 5 — `scripts/v2-verify.mjs` (Node; the only place SHA-256 is computed)

`node scripts/v2-verify.mjs --run-id karen-rehearsal --mapping docs/superpowers/migrations/karen-v2-mapping.json [--apply]`

1. Refuses to run if `.env.local` names `neat-pony-216`.
2. Reads the manifest; computes SHA-256 (`node:crypto`) of the backup ZIP and asserts it equals
   `manifest.sourceExportSha256`; computes the manifest's FNV-1a-64 canonical hash the same way the
   Convex code does (share the tiny function by copying it; keep them byte-identical and add a unit
   test that both produce the same hash for a fixture).
3. Pulls Karen's source rows straight from the backup ZIP (`rooms/documents.jsonl`,
   `messages/documents.jsonl` filtered by her worldId), sorts canonically (room id, then message
   `createdAt`, then `_id`), builds per-room canonical JSON of `{ _id, roomId, createdAt, userId,
   userName, agentSlug, role, replyTo, text, attachments: [storageIds sorted] }`, SHA-256 per room
   and overall. Prints `source: rooms=16 messages=365 sha=<…>`.
4. Without `--apply`: runs `npx convex run` cannot be used (unsigned). So the script talks to the
   rehearsal deployment through a Convex HTTP client authenticated as Karen? NO — there is no
   test-user credential to use. Instead: the script drives the migration through an INTERNAL
   mutation exposed only for scripts, `v2Migrations.scriptApply` / `v2Migrations.scriptReconcile`,
   which require `process.env.CORNER_V2_MIGRATION_KEY` to equal the arg `key` (set the env var on
   the REHEARSAL deployment only with `npx convex env set CORNER_V2_MIGRATION_KEY <random 32 hex>`;
   never on live; never print the value in the report; the script reads it from
   `CORNER_V2_MIGRATION_KEY` in the shell). These two functions are the ONLY key-gated v2 functions
   and exist solely for migration scripts; say so in a comment.
5. `--apply`: calls `scriptApprove` (manifest), then `scriptApply` per room, then `scriptReconcile`,
   then re-reads every linked thread through `scriptListThread` and recomputes the same per-room
   canonical hashes from what the Thread API returns; asserts equality with the ZIP-derived hashes
   and prints `checksumMatches: true`; writes
   `docs/superpowers/audits/2026-09-05-karen-reconciliation.json`.
6. Exit 1 on any mismatch, any unresolved room, or `duplicateMessageIds.length > 0`.

## Step 6 — gates

```bash
grep CONVEX_DEPLOYMENT .env.local
npm test -- tests/v2/karen-mapping.test.ts tests/v2/history-reconciliation.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npx convex dev --once
npm run parity:v2
npx convex env set CORNER_V2_MIGRATION_KEY "$(openssl rand -hex 16)"
node scripts/v2-verify.mjs --run-id karen-rehearsal --mapping docs/superpowers/migrations/karen-v2-mapping.json --apply
node scripts/v2-verify.mjs --run-id karen-rehearsal --mapping docs/superpowers/migrations/karen-v2-mapping.json --apply
```

Expected: first apply links 292 messages across 9 mapped rooms, creates 6 projects, 3 missions, 9
threads, archives 7 rooms, `checksumMatches: true`; second apply inserts 0 of everything and still
`checksumMatches: true`. Paste both outputs in full (minus any key). Then paste
`npx convex data legacyRoomLinks --limit 50` (ids and states only).

## Step 7 — commit

```bash
git add convex/v2Mapping.ts convex/v2Migrations.ts convex/v2Threads.ts scripts/v2-verify.mjs tests/v2/karen-mapping.test.ts tests/v2/history-reconciliation.test.ts docs/superpowers/migrations/karen-v2-mapping.json docs/superpowers/audits/2026-09-05-karen-reconciliation.json
git commit -m "feat: require reviewed legacy room mapping and link immutable history"
git log --oneline -3 && git status
```

## Report `rounds/R3-backend-mapping.md`

Per step: commands + output; both failing runs then passing; the two apply runs; parity; commit
hash; the exact 16 decisions as applied; deviations and why.

## Hard rules

Never edit any file owned by the ROUTING or VISUAL workers (listed above), `convex/schema.ts`,
`convex/v2Schema/*`, `convex/v2Projects.ts` signatures, `src/`, `docs/superpowers/plans|specs/`,
`.env.local`. Never run anything against `neat-pony-216`. Never `env set` on live. Never patch,
copy, or delete a source `messages`/`rooms`/`files` row. Never map an unresolved room by title
similarity. Never print the migration key or a ledger token. Never `git add -A`. Never push.
