# R3 — backend mapping: Karen's mapping manifest, immutable history links, Node-side checksums

Worker: BUILDER, backend plan Tasks 3 + 4 (one task; Task 4 depends on Task 3's
manifest, both edit `convex/v2Migrations.ts`). Worktree
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
`codex/corner-v2-integration`. Commit for this round:
**`1353ac0 feat: require reviewed legacy room mapping and link immutable history`**
(landed on top of ROUTING's `49d2a5a`, which appeared mid-round; no conflicts).

Pre-reads: `LOOP.md` (hard lines), `rounds/R1-backend-reconcile.md` (Karen's
inventory, step 9), `rounds/R2-backend-spine.md` (spine tables + function
names), backend plan Tasks 3 + 4, spec sections as briefed.

## Outcome

Done. `planWorld` reports all 16 Karen rooms with 3 unresolved; `approveManifest`
enforces the reviewed manifest; `applyWorldMigration` linked **286** messages
across 9 mapped rooms (6 projects, 3 missions, 9 threads), archived 7 rooms,
writes one ledger row per apply, and is idempotent (second apply inserts 0).
`reconcile` reports `source=365 linked=286 duplicates=0 unlinkedArchived=79
threads=9 projects=6 missions=3`. `scripts/v2-verify.mjs` recomputes the ZIP
checksums from the Thread API: `checksumMatches: true (9/9)`. Gates: gate
files 11/11, full suite 80/80, `tsc` clean, `convex dev --once` clean,
`parity:v2` 56/56 + 291/291.

The brief's Step 6 says "links 292 messages". The correct number is **286**:
365 − 73 agent-room messages − 6 messages in the 3 archived unresolved rooms =
286. The brief subtracted the agent rooms but forgot the unresolved rooms are
also archived and unlinked (per its own mapping decisions 3–4 and Step 4.4).
Implementation follows the rules (only `mapped` rooms get links), not the
arithmetic. Ledger proof: first apply wrote
"Linked 286 messages across 9 rooms for karens-world."

## Step 0 — starting state

```bash
git log --oneline -3
# e19156f feat: add corner v2 desktop workspace shell
# 44f18cb test: preserve corner v2 reference and workspace contract
# 45b33e7 feat: add v2 project mission thread spine
git status --short   # (empty at start)
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner
```

Target is rehearsal throughout; `.env.local` never named `neat-pony-216`.
Karen agent-room ids fetched read-only for the manifest (ids + titles only):

```bash
npx convex data rooms --limit 2000 --format jsonArray > /tmp/rooms.json
# jn7eq05xyfp557n6by8nt5czhh8dre9z | agent | 'ea'
# jn72arc9zdgbxxhayzfwt3jhfd8dsn5t | agent | 'elon'
# jn71d8rsw9x1y59zb1ga2mca2s8dsyh4 | agent | 'project:eagle-s-welding'
# jn7b4aa2zyp1q7y3d0m6fkbrvn8drvdy | agent | 'steffen'
```

Agent-room message counts from the same read: 4 + 58 + 9 + 2 = 73, as briefed.

## Step 1 — failing mapping test, then passing

Created `tests/v2/karen-mapping.test.ts` (edge-runtime, synthetic 16-room Karen
mirror, small counts, structural asserts). Required failure before
implementation:

```bash
npm test -- tests/v2/karen-mapping.test.ts tests/v2/history-reconciliation.test.ts
#  FAIL  tests/v2/history-reconciliation.test.ts [ ... ]
#  FAIL  tests/v2/karen-mapping.test.ts [ ... ]
# Error: Failed to load url ../../convex/v2Mapping (resolved id: ../../convex/v2Mapping)
#   Does the file exist?
#  Test Files  2 failed (2)
#       Tests  no tests
```

After implementing `convex/v2Mapping.ts` + `scripts/v2-verify.mjs` (hash-test
import target), 5/7 passed with two instructive failures:

```bash
#  FAIL  tests/v2/history-reconciliation.test.ts > adds no duplicate links on a second migration
# Error: Approved mapping manifest required
#     at requireApproved convex/v2Migrations.ts:49:47
#  FAIL  tests/v2/karen-mapping.test.ts > blocks apply while any room is unresolved
# AssertionError: expected [Function] to throw error including
#   'Mapping manifest has unresolved rooms' but got 'Approved mapping manifest required'
```

Root causes, both fixed at the cause: (1) apply rejected re-apply on an
`applied` run, but the brief requires the second apply to succeed with zero
inserts — the gate now accepts `approved` or `applied` (re-apply is the
idempotency path); (2) the test inserted a second `v2MigrationRuns` row instead
of patching planWorld's row, so `by_run.first()` found the planned one — the
test now patches (upsert, never a second row). After:

```bash
npm test -- tests/v2/karen-mapping.test.ts tests/v2/history-reconciliation.test.ts
#  Test Files  2 passed (2)
#       Tests  7 passed (7)
```

## Step 2 — failing history test, then passing

Created `tests/v2/history-reconciliation.test.ts` (same seed shape; qbo-cleanup
enriched with a reply, an attachment, and an agent message; manifest built
in-test with a tiny FNV-1a helper, registered via `approveManifest`). It failed
in the same pre-implementation run as Step 1 (missing `convex/v2Mapping`) and
passes now — order/time/author/reply/attachments read-through verified against
`by_room_created`, second apply all-zeros, `messages` rows deep-equal before
and after apply. Included the Step 5.2 unit test in `karen-mapping.test.ts`:
Convex `canonicalJson`/`fnv1a64Hex` vs the Node copies agree on a fixture
(including unicode).

## Step 3 — `convex/v2Mapping.ts` (new)

`planWorld({ workspaceId, runId, dryRun })` (owner|admin): loads all `rooms` in
the world via `by_world`; per room counts messages/files via `by_room`;
`project` → `mapped`, `agent` → `legacy_archive`, `mission` → `mapped` iff its
`project` string equals exactly one project room's title (else `unresolved`
with token-overlap candidates, possibly empty). Never maps on title
similarity. Upserts `v2MigrationRuns` (`state: "planned"`, full report).
`approveManifest({ workspaceId, runId, manifest })`: shape validation, rejects
`unresolved` (`"Mapping manifest has unresolved rooms"`), rejects agent-room
mapping and dangling mission parents, records the export sha from the manifest
on first approval and enforces it after (`"Source export SHA mismatch"`),
stores FNV-1a-64 hex of the canonical JSON on the run, `state: "approved"`.

## Step 4 — apply + reconcile (`convex/v2Migrations.ts`, `v2Threads.ts`)

- `applyWorldMigration({ workspaceId, runId, manifestSha256 })`: requires
  approved run + matching sha (`"Approved mapping manifest required"`),
  re-checks for `unresolved` (`"Mapping manifest has unresolved rooms"`).
  Single call applies the whole manifest (project decisions first): projects
  via `by_world_slug`, missions per-project slug, threads idempotent,
  `legacyRoomLinks` mapped/archived, one `messageLinks` row per mapped message
  (`by_message` dedupe), source rows never touched. Returns
  `insertedProjects/Missions/Threads/MessageLinks, archivedRooms,
  skippedExisting`. Run → `applied`; one ledger row via direct insert using
  `normalizeWhat` (`kind: "did"`, `who: "corner:migration"`).
  `applyWorldMigrationRoom({ runId, roomId })` covers one room (no ledger row;
  ledger is per full apply). Documented choice: single full call (286 links fit
  one mutation); per-room exists for larger worlds.
- `reconcile({ runId })` query returns exactly `{ sourceMessages,
  linkedMessages, duplicateMessageIds, unlinkedArchivedMessages, threads,
  projects, missions }`.
- `v2Threads.listThreadMessages`: same signature; legacy branch completed to
  full read-through (`messageId, roomId, userId, userName, agentSlug, role,
  replyTo, text, attachments, reactions` from the source row + `threadBlocks`
  merge, ordered by `(sortCreatedAt, sortMessageId)` so ties match
  `by_room_created`). Core extracted for the script entry point.
- `scriptApprove/scriptApply/scriptReconcile/scriptListThread`: the ONLY
  key-gated v2 functions, solely for migration scripts (said in a comment);
  `CORNER_V2_MIGRATION_KEY` compared against the deployment env, never printed.

## Step 5 — `scripts/v2-verify.mjs`

Refuses `neat-pony-216`; asserts backup ZIP sha equals
`manifest.sourceExportSha256`; FNV-1a-64 canonical hash (byte-identical copy,
proven equal by the unit test); canonical per-room SHA-256 from the ZIP
(`{ _id, roomId, createdAt, userId, userName, agentSlug, role, replyTo, text,
attachments: [storageIds sorted] }`, sorted by room, `createdAt`, `_id`).
Dry run:

```bash
node scripts/v2-verify.mjs --run-id karen-rehearsal --mapping docs/superpowers/migrations/karen-v2-mapping.json
# manifest: decisions=16 fnv1a64=c6f10f121a704b88
# backup: sha256=5c7be963af726cbbe141efa38fe8a9944725b48e44a3029809f7130d9ef106ad (matches manifest)
# source: rooms=16 messages=365 sha=eef8e1fc4b9f385477c30a176641be8fbb6d944aa9c2d399ade305f08e3f61a4
# verify (no --apply): backup, manifest, and source checksums ok
```

`--apply` drives rehearsal over the Convex HTTP API with the key from the
shell. Convex and Node manifest hashes agree (`c6f10f121a704b88` both sides).

## Step 6 — gates

```bash
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner
npm test -- tests/v2/karen-mapping.test.ts tests/v2/history-reconciliation.test.ts tests/v2/projects-and-tenancy.test.ts
#  Test Files  3 passed (3)
#       Tests  11 passed (11)
npm test
#  Test Files  10 passed (10)
#       Tests  80 passed (80)
npx tsc --noEmit -p tsconfig.json        # exit 0 (convex/tsconfig.json also exit 0)
npx convex dev --once
# ✔ Convex functions ready! (passed every time, first try; no retries needed)
npm run parity:v2
# tables: 56/56 present
# functions: 291/291 present
npx convex env set CORNER_V2_MIGRATION_KEY "$(openssl rand -hex 16)"   # rehearsal only; value never printed
```

First `--apply` (full output captured on the re-runs below; the first run's
apply line was cut by log tailing, but its effect is proven by the ledger and
reconcile): approve ok, all 286 links created. Ledger evidence
(`npx convex data ledger`, `who=corner:migration`):

```text
2026-09-06T06:55:55Z | Linked 286 messages across 9 rooms for karens-world. | kind: did | world: karens-world | subjects: ['corner-v2-migration']
2026-09-06T06:56:00Z | Linked 0 messages across 9 rooms for karens-world.
2026-09-06T06:56:41Z | Linked 0 messages across 9 rooms for karens-world.
2026-09-06T06:56:55Z | Linked 0 messages across 9 rooms for karens-world.
```

Two further `--apply` runs in full (key rotated per run, single shell each):

```bash
node scripts/v2-verify.mjs --run-id karen-rehearsal --mapping docs/superpowers/migrations/karen-v2-mapping.json --apply
# manifest: decisions=16 fnv1a64=c6f10f121a704b88
# backup: sha256=5c7be963af726cbbe141efa38fe8a9944725b48e44a3029809f7130d9ef106ad (matches manifest)
# source: rooms=16 messages=365 sha=eef8e1fc4b9f385477c30a176641be8fbb6d944aa9c2d399ade305f08e3f61a4
# approve: runId=karen-rehearsal sha=c6f10f121a704b88
# apply: projects=0 missions=0 threads=0 links=0 archived=0 skipped=16
# reconcile: source=365 linked=286 duplicates=0 unlinkedArchived=79 threads=9 projects=6 missions=3
# checksumMatches: true (threads verified 9/9)
# wrote docs/superpowers/audits/2026-09-05-karen-reconciliation.json
```

Second run identical (`links=0`, `checksumMatches: true (9/9)`). A `--apply`
without the key in the shell correctly refuses
(`CORNER_V2_MIGRATION_KEY is not set in the shell`).

`npx convex data legacyRoomLinks --limit 50` (ids + states): 16 rows —
9 `mapped` (6 project, 3 mission, all with thread links), 7 `legacy_archive`
with the manifest reasons, archived rooms carrying no project/mission/thread.
Karen's `projects` rows are exactly the 6 slugs with the briefed names, none
General; her `messages` count is still 365 (source untouched).

## Step 7 — commit

```bash
git add convex/v2Mapping.ts convex/v2Migrations.ts convex/v2Threads.ts scripts/v2-verify.mjs tests/v2/karen-mapping.test.ts tests/v2/history-reconciliation.test.ts docs/superpowers/migrations/karen-v2-mapping.json docs/superpowers/audits/2026-09-05-karen-reconciliation.json
git commit -m "feat: require reviewed legacy room mapping and link immutable history"
# [codex/corner-v2-integration 1353ac0] feat: require reviewed legacy room mapping and link immutable history
git log --oneline -3
# 1353ac0 feat: require reviewed legacy room mapping and link immutable history
# 49d2a5a feat: add v2 routing provenance and confirmed writes
# e19156f feat: add corner v2 desktop workspace shell
git status --short   # clean
```

No push, per hard rules. Only the briefed paths staged (ROUTING's concurrent
`ledger.ts` / `v2Schema/routing.ts` edits left untouched).

## The 16 decisions as applied

Manifest `docs/superpowers/migrations/karen-v2-mapping.json`
(`workspaceId k17480zy9719gsc6tm83s6hjdx8drg9z`, `runId karen-rehearsal`,
`sourceExportSha256 5c7be963…106ad`, approver
`orchestrator:claude on Patrik's WD-40 directive, 2026-09-05T23:20:00-07:00`,
fnv1a64 `c6f10f121a704b88`): 6 project rooms → projects (slugs = titles; Eagle's
Welding / Ahead of Market / Ambition Mechanical Services / Passive Income /
Karen's World / Transmisiones Garcia's); `qbo-cleanup` → mission under
eagle-s-welding ("QBO cleanup"); `family` and 49-message `truepath-solution` →
missions under karens-world-main; `jn7c562…` → archive ("parent 'agent-work' is
not a project"); `jn788zz…` → archive ("self-referential parent; duplicate of
jn7c562mtj44vbpk78328d78rx8drbhs"); `jn79j8t…` → archive ("self-referential
parent; superseded by the 49-message truepath-solution mission"); 4 agent rooms
(`ea`, `elon`, `project:eagle-s-welding`, `steffen`) → archive ("agent room; v2
has no agent rooms"). `karens-world-main` is a normal project; General was not
created by the migration and stays empty.

## Deviations and why

1. **286 linked, not 292** (see Outcome): the brief's arithmetic forgot the 6
   unresolved-room messages are archived unlinked. Rules followed over numbers.
2. **Per-room `collect()` instead of briefed paginate-N-at-a-time**: Convex
   runtime allows exactly one paginated query per function
   (`This query or mutation function ran multiple paginated queries` — observed
   on rehearsal). Multi-room loops use per-room `collect()` (≤132 docs/room for
   Karen, far under execution limits); the per-room apply variant remains for
   larger worlds.
3. **`scriptApprove` creates the run row when absent**: the script flow has no
   authenticated `planWorld` step (unsigned calls are rejected by design), so
   first approval inserts the run (`dryRun: false`); product `approveManifest`
   still normally follows `planWorld`.
4. **Re-apply on `applied` runs succeeds with zeros** instead of rejecting:
   required by the idempotency test; each apply still appends its ledger row.
5. **`jn788zz…` reason carries the full duplicate id**; the brief's `jn7c562…`
   is display truncation of the same room.
6. **Checksum mismatch on the first two `--apply` runs was a script-side bug**:
   canonicalization used the link row's `_id` instead of `messageId`. Counts
   already matched (65/7/132/6/2/3/8/14/49); fixed in the script (no Convex
   change), then `checksumMatches: true (9/9)`.
7. Concurrency notes: ROUTING committed `49d2a5a` and holds unstaged
   `ledger.ts`/`v2Schema/routing.ts` edits — never touched, never staged.
   `npx convex dev --once` passed first try every time (no type-error retries,
   no `index.lock` collisions). `npm test` full-suite line reported as observed
   (80/80, includes ROUTING's 11 routing-and-access tests).
