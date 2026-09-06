# R4 — backend cutover: compatibility bridge, reversible gates, AOM run, production clone

Worker: BUILDER, backend plan Task 7 + AOM workspace mapping run. Worktree
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
`codex/corner-v2-integration`. Commit for this round:
**`184c576 feat: add reversible v2 cutover gates and the production clone`**
(12 files, +13052/−124, on top of desktop `3bea983`; no push).

Pre-reads: `LOOP.md`, `rounds/R3-backend-mapping.md`,
`rounds/R3-backend-routing.md`, `rounds/R3-backend-visual.md`, backend plan
Task 7 + Final Verification Checklist.

## Outcome

Done. `v2Compatibility` bridge (legacy-shaped reads/writes in both modes),
seven recorded cutover gates with key-gated script twins, chunked per-room /
per-200-message apply + seal, manifest generator, 18-test old-client fixture
suite, AOM mapped on rehearsal (845 rooms / 43,723 messages → 47 projects,
0 missions, 8,630 links, checksum 47/47), both workspaces in `v2_dual_write`
on rehearsal AND on the new production clone
(`patrik-matheson:corner-v2-production:production`,
`https://brilliant-scorpion-163.convex.cloud`). Gates: 144/144 tests, `tsc`
clean, `convex dev --once` clean, `parity:v2` 56/56 + 291/291.
`neat-pony-216` untouched (reads/export only — actually zero live calls this
round; every command targeted rehearsal or the clone).

## Step 0 — starting state

```bash
git log --oneline -3
# 6d26920 feat: expose authenticated Corner v2 native contract
# ad31c07 fix: close corner v2 desktop punch list (comp-match round)
# e439eb6 refactor: retire legacy corner mobile presentation
git status --short   # (empty at start)
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner
```

## Step 1 — failing cutover tests, then passing

Wrote `tests/v2/cutover.test.ts` (edge-runtime, `tests/v2/setup.ts` seed:
owner + world + project room + 2 messages + mapped project/thread/link triple
+ approved-run row with manifest). Required failure before implementation:

```bash
npx vitest run tests/v2/cutover.test.ts
#  FAIL (6 failed): Expected a Convex function exported from module
#  "v2Migrations" as `recordGate`, but there is no such export. (+ no v2Compatibility module)
#  Test Files  1 failed (1)
#       Tests  6 failed (6)
```

Two test-side fixes during implementation (both mine, not product): dual-write
link arithmetic 4→3 (2 seed + 0 legacy + 1 dual), and `sendRoomMessage`
called with `{roomId, text}` and no `userId` per the brief — the bridge
resolves the author from the session instead. After:

```bash
npx vitest run tests/v2/cutover.test.ts
#  Test Files  1 passed (1)
#       Tests  6 passed (6)
```

(The "Errors 2 errors" alongside are convex-test's missing scheduler: the
legacy send's `dispatchMessage` enqueue rejects outside the tx. The mutation
itself succeeds; production unaffected. Same noise appears in the compat
suite; see Step 5 for how the gate handles it.)

## Step 2 — implementation

- `convex/messages.ts`: extracted `sendMessageCore` (identical row write +
  scheduler registration); `sendMessage` delegates. Tolerates null `userId`
  (anonymous device-UUID-shaped rows, as before).
- `convex/v2Compatibility.ts` (new): `getRoomThread` (JWT membership, with
  documented `resolveViewer` fallback — the ONE v2 read that tolerates it;
  returns only ids + the same rows `messages.list` returns; archived rooms get
  `threadId: null` + legacy list, never an error), `sendRoomMessage`
  (no-auth like `messages.sendMessage`, shared core, links the new row in
  non-legacy modes), `listRoomsForWorkspace` (strict JWT; legacy rows +
  `threadId` on mapped ones).
- `convex/v2Migrations.ts`: `recordGate`/`scriptRecordGate` (owner|admin;
  gates stored on `run.report.gates` — no schema change),
  `activateCutover`/`scriptActivateCutover` (all-seven-green else
  `V2 cutover gate failed: <comma-joined>`; upserts `v2Cutovers` +
  ledger `decided` row, activation id stashed on the run),
  `rollbackCutover`/`scriptRollbackCutover` (mode→legacy only, ledger
  `decided` with `supersedes` → activation id; rows never deleted),
  `promotePrimary` (7-day activation age + `reconciliationMatches` gate +
  live clean reconcile, else the brief's error),
  `gateStatus`/`scriptGateStatus`, `scriptPlanWorld` (light room inventory —
  see deviation 1), `scriptApplyRoom` (`{runId, roomId, cursor, limit}`,
  structure-then-chunk via `applyRoomCore(..., {linkMessages:false})`),
  `scriptSealApply` (state→applied + single ledger row from script totals),
  `scriptReconcileRoom`, `scriptLedgerCheck`, `scriptSchedulerCheck`.
- `convex/v2Mapping.ts`: extracted `planWorldCore` (product path unchanged)
  + `planWorldRoomsCore` (room rows only incl. `humanMessageCount`/`archived`,
  no per-room message collects).
- `scripts/v2-verify.mjs`: `--workspace` (default Karen's),
  `--generate-manifest <path>` (plan → rules → write → stop for review),
  chunked `--apply` (approve → per-room/per-200 `scriptApplyRoom` loop →
  per-room reconcile aggregation → checks → seal → per-thread checksums →
  `--audit <path>`), `--gates` (seven `scriptRecordGate` calls incl. a live
  compat-suite subprocess), `--activate`, `--rollback`, `--status`,
  `--env-file` (default `.env.local`).

## Step 2b — façade artifacts gap

`getConversationSurface` now calls `artifactsForThreadCore` (imported from
`v2Visual.ts`, query kept) and maps to the desktop `Artifact` shape
(`{id, kind, title, version, src, liveUrl}`, `legacy:` ids kept).
New `tests/v2/surface-artifacts.test.ts` (NOT the routing worker's file):
one created photo artifact + one legacy file → two façade artifacts:

```bash
npx vitest run tests/v2/surface-artifacts.test.ts
#  Test Files  1 passed (1)
#       Tests  1 passed (1)
```

## Step 3 — compat fixtures (`tests/v2/compat-fixtures.test.ts`, 18 tests)

Shipped-client inventory (the brief's list, verified against the sources):
web `Chat.tsx`@main uses `(api as any).messages?.getThread`,
`rooms?.getRoom`, `files?.getFiles`, `turns?.getTurn`,
`messages?.sendMessage`, `messages?.agentReply`,
`files?.generateUploadUrl`, `files?.uploadFile`, `arcade?.executeTool`;
web `Home.tsx`@main uses `rooms?.listRooms` (+`{worldId, filter:"all"}`),
`agents?.list`, `rooms?.createRoom`, `messages?.sendMessage`
(Home also hardcodes the AOM workspace id
`k1798fjd7haec6r0ywkqzv5j858cgahm` as FALLBACK_WORLD);
iOS legacy string-key contract lives in `convex/messages.ts`+`rooms.ts`
(`messages:list`, `messages:send`, slug-or-id worlds, `reads.markRead`
with `lastReadAt`). Covered per function in legacy vs `v2_dual_write`
(deep-equal after stripping `_creationTime`/`_id`):
rooms.listRooms/getRoom/createRoom, messages.list/getThread/getMessage/
listWithAttachments/sendMessage, files.getFiles, turns.getTurn, agents.list,
users.getUser/getByEmail, worlds.list, notifications.getNotifications/getUnread/
markRead, reads.readState/markRead, tracker.list, email.getConnectionStatus.
Excluded (need live creds/storage/action runtime; cutover never touches
them): files.generateUploadUrl/uploadFile, arcade.executeTool, email sends.

```bash
npx vitest run tests/v2/compat-fixtures.test.ts
#  Test Files  1 passed (1)
#       Tests  18 passed (18)
```

## Step 4 — AOM mapping on the rehearsal copy

```bash
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-rehearsal --generate-manifest docs/superpowers/migrations/aom-v2-mapping.json
# manifest: rooms=845 messages=43723 mapped=47 legacy_archive=798 duplicateGroups=6 scaffolding=39 -> docs/superpowers/migrations/aom-v2-mapping.json
#   duplicate title 'Brand': jn730j2..., jn7bv1...
#   duplicate title 'Corner': jn7b40..., jn7b9s...
#   duplicate title 'Daily Research': jn75ga..., jn7awe...
#   duplicate title 'Kraken Corps': jn702c..., jn73kh...
#   duplicate title 'New Room': jn76ap..., jn7dsv...
#   duplicate title 'Wolfpack': jn772d..., jn7aft..., jn7e8t...
# stopping for review: inspect the manifest before --apply
```

Manifest review (offline against the ZIP): 455 agent + 302 mission + 41
project archives; 47 projects mapped, **0 missions mapped** — verified that
NO mission `project` string exactly equals any project title (all are
lowercase slugs like `corner`/`aom`, `None`, `agent-*`), so the brief's
strict rule archives all 302 with `parent '<p>' is not a mapped project`.
Every duplicate winner is the highest-message room (Corner 3383, Wolfpack
1320, Kraken Corps 76, Daily Research 28; the all-scaffolding 'Brand' group
archives both). No mapped room has 0 messages or uncounted humans. No
live/ZIP room drift. `approver: orchestrator:claude on Patrik's WD-40
directive, <ISO now>`; `sourceExportSha256` = the backup sha.

```bash
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-rehearsal --mapping docs/superpowers/migrations/aom-v2-mapping.json --audit docs/superpowers/audits/2026-09-05-aom-reconciliation.json --apply
# FIRST:  manifest: decisions=845 fnv1a64=44a9766556fde2e9
#         backup: sha256=5c7be963...106ad (matches manifest)
#         source: rooms=845 messages=43723 sha=4f730821...
#         approve: runId=aom-rehearsal sha=44a9766556fde2e9
#         apply: projects=47 missions=0 threads=47 links=8630 archived=798 skipped=0
#         reconcile: source=43723 linked=8630 duplicates=0 unlinkedArchived=35093 threads=47 projects=47 missions=0
#         sealed: runId=aom-rehearsal state=applied
#         checksumMatches: true (threads verified 47/47)
# SECOND: apply: projects=0 missions=0 threads=0 links=0 archived=0 skipped=845
#         reconcile: (same 43723/8630/0/35093)  checksumMatches: true (47/47)
#         wrote docs/superpowers/audits/2026-09-05-aom-reconciliation.json
```

No room failed verification; nothing skipped silently (35,093 unlinked =
agent-room + archived-mission + scaffolding messages, per the rules).

## Step 5 — gates + dual write on rehearsal

```bash
npm test
#  Test Files  16 passed (16)
#       Tests  144 passed (144)
npx tsc --noEmit -p tsconfig.json   # exit 0
npx convex dev --once               # ✔ Convex functions ready!
npm run parity:v2
# tables: 56/56 present
# functions: 291/291 present
node scripts/v2-verify.mjs --workspace k17480zy9719gsc6tm83s6hjdx8drg9z --run-id karen-rehearsal --mapping docs/superpowers/migrations/karen-v2-mapping.json --gates
# gate exportVerified/mappingApproved/reconciliationMatches/sentinelHolds/compatibilityPasses/ledgerPreserved/noLegacyScheduler: passed=true (×7)
# status: mode=legacy allGreen=true failed=(none)
node scripts/v2-verify.mjs --workspace k17480zy9719gsc6tm83s6hjdx8drg9z --run-id karen-rehearsal --activate
# activate: mode=v2_dual_write runId=karen-rehearsal
# status: mode=v2_dual_write allGreen=true failed=(none)
node scripts/v2-verify.mjs --workspace k17480zy9719gsc6tm83s6hjdx8drg9z --run-id karen-rehearsal --status
# status: mode=v2_dual_write allGreen=true failed=(none)
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-rehearsal --mapping docs/superpowers/migrations/aom-v2-mapping.json --audit docs/superpowers/audits/2026-09-05-aom-reconciliation.json --gates
# seven passed=true; status: mode=legacy allGreen=true
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-rehearsal --mapping docs/superpowers/migrations/aom-v2-mapping.json --audit docs/superpowers/audits/2026-09-05-aom-reconciliation.json --activate
# activate: mode=v2_dual_write runId=aom-rehearsal
# status: mode=v2_dual_write allGreen=true failed=(none)
```

Both workspaces end in `v2_dual_write` on rehearsal. (`--audit` on the AOM
pair is a required deviation — the default audit path is Karen's, and
`reconciliationMatches` evidence must come from the workspace's own audit.)

## Step 6 — production clone

`npx convex deployment list` does not exist in CLI 1.44 (`error: unknown
command 'list'`). Looked instead with reads: the `corner` project already
has a prod deployment, `descriptive-flamingo-718` (has functions; only
`function-spec` reads used — never written to). Per the plan, a SEPARATE
project was created (no plan-upgrade prompt at any point):

```bash
npx convex project create corner-v2-production
# ✔ Created project corner-v2-production in team patrik-matheson
npx convex deployment create patrik-matheson:corner-v2-production:production --type prod
# ✔ Created new prod deployment:
# ▌ [Production] patrik-matheson:corner-v2-production:production (dashboard: https://dashboard.convex.dev/t/patrik-matheson/corner-v2-production/brilliant-scorpion-163)
# ▌ └─ https://brilliant-scorpion-163.convex.cloud
```

`.env.production-clone` written (untracked; added to `.gitignore` since only
`.env.local` was ignored):
`git check-ignore .env.production-clone` → `.env.production-clone` (ignored).
`.env.local` untouched throughout (verified after every create).

```bash
CONVEX_DEPLOYMENT=prod:brilliant-scorpion-163 npx convex data worlds --limit 5
# There are no documents in this table.   (pre-import empty probe)
npx convex import /Users/aom-inhouse/CornerBackups/corner-neat-pony-216-2026-09-05.zip --deployment patrik-matheson:corner-v2-production:production --replace-all -y
# ✔ Imported "messages" (44,088 documents) … ✔ Added 104964 documents. (✔ Imported "_storage" (0 files))
CONVEX_DEPLOYMENT=prod:brilliant-scorpion-163 npx convex data worlds --limit 10
# karens-world (k17480…), aom (k1798f…), demo, Onboarding QA, … present
```

Deploy detour (deviation 3): `CONVEX_DEPLOYMENT=prod:brilliant-scorpion-163
npx convex deploy -y` printed `Deployed Convex functions to
https://lovable-weasel-178.convex.cloud` — a NEW empty prod holding my code
(zero data rows, verified) — NOT the clone (clone `function-spec` showed
`functions: []`). Fixed with a deploy key (secret redirected to
`/tmp/clone-deploy-key`, never printed):

```bash
npx convex deployment token create clone-deploy-key --deployment patrik-matheson:corner-v2-production:production > /tmp/clone-deploy-key
CONVEX_DEPLOY_KEY="$(cat /tmp/clone-deploy-key | tail -1)" npx convex deploy -y
# ✔ Deployed Convex functions to https://brilliant-scorpion-163.convex.cloud
npx convex function-spec --deployment patrik-matheson:corner-v2-production:production | grep -c scriptApplyRoom/…
# 4 (all new script/cutover functions present)
npx convex env set CORNER_V2_MIGRATION_KEY "$(openssl rand -hex 16)" --deployment patrik-matheson:corner-v2-production:production
# ✔ Successfully set CORNER_V2_MIGRATION_KEY (on prod deployment brilliant-scorpion-163)
```

Clone migration (committed manifests reused; `--env-file
.env.production-clone`; clone audits to `/tmp`, then merged into the
committed clone audit):

```bash
# karen #1: apply: projects=6 missions=3 threads=9 links=286 archived=7 skipped=0
#           reconcile: source=365 linked=286 duplicates=0 unlinkedArchived=79 threads=9 projects=6 missions=3
#           sealed … checksumMatches: true (threads verified 9/9)
# karen #2: apply: … links=0 … skipped=16; same reconcile; checksumMatches: true (9/9)
# aom   #1: apply: projects=47 missions=0 threads=47 links=8630 archived=798 skipped=0
#           reconcile: source=43723 linked=8630 duplicates=0 unlinkedArchived=35093 threads=47 projects=47 missions=0
#           checksumMatches: true (threads verified 47/47)
# aom   #2: apply: … links=0 … skipped=845; same reconcile + checksum
# karen --gates: seven passed=true; --activate: mode=v2_dual_write (allGreen)
# aom   --gates: seven passed=true; --activate: mode=v2_dual_write (allGreen)
```

Clone facts: name `brilliant-scorpion-163`,
URL `https://brilliant-scorpion-163.convex.cloud`, reference
`patrik-matheson:corner-v2-production:production`; import 104,964 docs /
44,088 messages / 0 storage files; both workspaces reconciled, checksummed,
gated, and in `v2_dual_write` (see committed
`docs/superpowers/audits/2026-09-06-production-clone.json`).
`neat-pony-216` and corner prod `descriptive-flamingo-718` untouched.

## Step 7 — commit

```bash
git add convex/v2Compatibility.ts convex/v2Migrations.ts convex/messages.ts convex/v2Mapping.ts scripts/v2-verify.mjs tests/v2/cutover.test.ts tests/v2/compat-fixtures.test.ts tests/v2/surface-artifacts.test.ts docs/superpowers/migrations/aom-v2-mapping.json docs/superpowers/audits/2026-09-05-aom-reconciliation.json docs/superpowers/audits/2026-09-06-production-clone.json .gitignore
git commit -m "feat: add reversible v2 cutover gates and the production clone"
# [codex/corner-v2-integration 184c576] feat: add reversible v2 cutover gates and the production clone
#  12 files changed, 13052 insertions(+), 124 deletions(-)
git log --oneline -3 && git status
# 184c576 feat: add reversible v2 cutover gates and the production clone
# 3bea983 feat: close native contract gaps and make v2 reads subscribable
# 6d26920 feat: expose authenticated Corner v2 native contract
# (clean)
```

No push, per hard rules.

## Deviations (all load-bearing, none silent)

1. **16MB function budget**: AOM (43,723 msgs) blows per-function reads, so
   planning/reconcile/apply/seal are all chunked — `scriptPlanWorld` returns
   room rows only (counts joined from the ZIP script-side),
   `scriptReconcileRoom` per room, `scriptApplyRoom` per 200 messages,
   `scriptSealApply` takes script-computed totals. Same code paths serve
   Karen (verified identical numbers to R3: 365/286/9).
2. **Zero AOM missions mapped**: strict brief rule — no mission `project`
   string exactly equals a mapped project title (all slugs/`None`/`agent-*`).
   All 302 archive with the brief's reason; history preserved, nothing
   deleted. Case-insensitive matching would map many, but the brief (and
   Task 3's "never infer parentage") says exact.
3. **Deploy detour**: unscoped `npx convex deploy` provisioned empty prod
   `lovable-weasel-178` with R4 code instead of targeting the clone (CLI
   1.44 has no `deployment list` and `deploy` takes no `--deployment`).
   Clone got its code via a deploy key instead. The stray holds zero data
   rows; live is untouched. Needs a dashboard decision (keep as spare or
   delete); deploy key file lives at `/tmp/clone-deploy-key` (name
   `clone-deploy-key`, revokable).
4. **Compat gate subprocess** runs vitest with
   `--dangerouslyIgnoreUnhandledErrors`: convex-test's missing scheduler
   makes the legacy send's enqueue reject outside the tx (exit 1 despite
   18/18 passing). Real test failures still fail the gate. Full `npm test`
   runs unflagged and passes.
5. **Commit pathspec**: added my extra touched files (`messages.ts`,
   `v2Mapping.ts`, `surface-artifacts.test.ts`); `v2Workspace.ts` (Step 2b)
   is absent because the desktop worker's concurrent `3bea983` committed
   byte-identical content first — verified via `git show HEAD` + green
   suite, not re-staged. `docs/.../karen-reconciliation.json` unmodified
   (clone audits went to `/tmp`, merged into the clone audit file).
6. **AOM pairs need `--audit <aom path>`** (default is Karen's file) and
   `--env-file .env.production-clone` on clone runs (script defaults to
   `.env.local`).
