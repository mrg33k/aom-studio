# R2 — backend spine: Workspace, Project, Mission, Thread, General

Worker: BUILDER, backend plan Task 2. Worktree
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
`codex/corner-v2-integration`, base `611249e`. Commit for this round:
**`45b33e7 feat: add v2 project mission thread spine`**.

Pre-reads: `LOOP.md` (hard lines), `rounds/R1-backend-reconcile.md` (58
tests green, parity 56/56 + 291/291, rehearsal `dev:adjoining-tiger-87`),
backend plan Task 2 + its Global Constraints, spec "Core hierarchy",
"Target data model", "General" (direct General conversation stays in
General; only unscoped global-routing one-offs become proposed Missions —
Task 5, not here).

## Step 0 — starting state

```bash
git log --oneline -3
# 611249e chore: v2 rehearsal deployment from the live export
# 2f5bda0 chore: live backend parity contract for v2 rehearsal
# 827ef9e chore: reconcile live backend (codex/convex-multi-agent) with main's UI for v2 integration
git status --short   # (empty)
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner
```

Target is the rehearsal deployment, never `neat-pony-216`. Auth check
before relying on the brief's test identity trick — `getAuthUserId` splits
the subject on `|` and returns the user id with no session lookup:

```bash
grep -n -A 25 "async function getAuthUserId" node_modules/@convex-dev/auth/dist/server/implementation/index.js
# export async function getAuthUserId(ctx) {
#     const identity = await ctx.auth.getUserIdentity();
#     if (identity === null) {
#         return null;
#     }
#     const [userId] = identity.subject.split(TOKEN_SUB_CLAIM_DIVIDER);
#     return userId;
# }
```

So `t.withIdentity({ subject: \`${userId}|test-session\` })` signs in as that
user. Verified by the passing tests, not just by reading.

## Step 1 — schema layout

Created `convex/v2Schema/spine.ts` (`export const spineTables`, exact
fields from the brief plus the `threadBlocks` table from Step 2 test 4),
`convex/v2Schema/routing.ts` (`export const routingTables = {}`),
`convex/v2Schema/visual.ts` (`export const visualTables = {}`).

`convex/schema.ts`: added the three imports, the four optional fields on
`projects` (`mark`, `tint`, `brandRules`, `isGeneral`), the
`by_world_general` index on `["worldId", "isGeneral"]`, and the three
spreads at the END of `defineSchema`, after `clientEngine`. No other legacy
table touched. Diff:

```diff
+import { spineTables } from "./v2Schema/spine";
+import { routingTables } from "./v2Schema/routing";
+import { visualTables } from "./v2Schema/visual";
+    mark: v.optional(v.string()),
+    tint: v.optional(v.string()),
+    brandRules: v.optional(v.any()),
+    isGeneral: v.optional(v.boolean()),
+    .index("by_world_slug", ["worldId", "slug"])
+    .index("by_world_general", ["worldId", "isGeneral"]),
+  ...spineTables,
+  ...routingTables,
+  ...visualTables,
```

## Step 2 — tests first (FAIL before implementation)

Created `tests/v2/setup.ts` and
`tests/v2/projects-and-tenancy.test.ts` (line 1 is
`// @vitest-environment edge-runtime`) verbatim to the brief's four tests.

```bash
npm test -- tests/v2/projects-and-tenancy.test.ts
# > corner-convex@0.1.0 test
# > vitest run tests/v2/projects-and-tenancy.test.ts
#  RUN  v2.1.9 /Users/aom-inhouse/aom-studio-transfer/corner-v2-integration
#  ❯ tests/v2/projects-and-tenancy.test.ts (4 tests | 4 failed) 9ms
#    × gives each Project and Mission exactly one different Thread 6ms
#      → Could not find module for: "v2Projects"
#    × creates General once and keeps it immutable 1ms
#      → Could not find module for: "v2Projects"
#    × denies Karen data to Ben's separate Workspace 1ms
#      → Could not find module for: "v2Projects"
#    × direct General messages stay in General 1ms
#      → Could not find module for: "v2Projects"
#  FAIL  tests/v2/projects-and-tenancy.test.ts > gives each Project and Mission exactly one different Thread
# Error: Could not find module for: "v2Projects"
#  ❯ node_modules/convex-test/dist/index.js:987:19
#  ❯ getFunctionFromPath node_modules/convex-test/dist/index.js:1356:76
#  ❯ Object.mutationFromPath node_modules/convex-test/dist/index.js:1170:32
#  ❯ Object.mutation node_modules/convex-test/dist/index.js:1204:41
#  ❯ tests/v2/projects-and-tenancy.test.ts:10:19
# (same "Could not find module" failure at [2/4] ensureGeneral :33,
#  [3/4] createProject :58, [4/4] ensureGeneral :67)
#  Test Files  1 failed (1)
#       Tests  4 failed (4)
```

Required failure: all 4 fail because the v2 modules do not exist yet.

## Step 3 — implementation

- `convex/lib/viewer.ts` — added `requireWorkspaceMember(ctx, worldId)`
  and `requireProjectAccess(ctx, projectId)` (same-Workspace membership
  suffices, else a `projectAccess` grant for any of the viewer's worlds,
  else `"Project access denied"`). Everything already there kept.
- `convex/projects.ts` — one-word change: `function slugify` →
  `export function slugify` so `v2Projects` reuses it (see deviation 1).
- `convex/v2Types.ts` — `missionStatus`, `threadBlockKind`,
  `threadBlock`, `workspaceNode` validators + `MissionStatus`,
  `ThreadBlockKind`, `ThreadBlock`, `WorkspaceNode` TS types, all also
  exported as `v2`.
- `convex/v2Projects.ts` — `ensureGeneral` (idempotent via
  `by_world_general`, race guard keeps oldest / deletes only the row made
  in the same call), `createProject` (rejects `"general"` slug, duplicate
  slug → `"Project already exists"`), `createMission` (allowed inside
  General; duplicate slug per project → `"Mission already exists"`),
  `ensureThread` (idempotent; `createDuplicate: true` throws
  `"Mission already has a thread"` / `"Project already has a thread"`,
  documented in a comment as test-only), `get`, `getMission`,
  `listNavigation` (General first, then by name; missions by updatedAt
  desc; `path` is `"Project"` / `"Project > Mission"`), `renameProject`,
  `archiveProject`, `deleteProject` (soft: `archived: true`),
  `renameMission`, `archiveMission`, `moveMission` (into-General throws;
  out-of-General allowed; same-project no-op returns; slug clash in target
  throws; mission + thread follow the move). General rule written in a
  comment at `guardGeneral`/`moveMission` per the brief.
- `convex/v2Threads.ts` — `appendText` (user block into `threadBlocks`
  with `authorId: viewer.userId`), `listThreadMessages` (merges
  `messageLinks` legacy rows ordered by `by_thread_sort` with
  `threadBlocks`, one list sorted by createdAt; text blocks expose
  top-level `text`).
- `convex/v2Migrations.ts` — `getCutover` returns the `v2Cutovers` row or
  `{ mode: "legacy" }`. No `setCutover` this round.

Rules kept: identity only from `ctx.auth`; every id arg is `v.id(...)`;
no `any`-typed args; no `createHash`; no timestamp-sequence logic.

## Step 4 — gates (all green)

```bash
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner

npm test -- tests/v2/projects-and-tenancy.test.ts
#  ✓ tests/v2/projects-and-tenancy.test.ts (4 tests) 47ms
#  Test Files  1 passed (1)
#       Tests  4 passed (4)
# (stderr noise only: convex-test "should not directly call other Convex
#  functions" warnings from module loading; pre-existing harness chatter.)

npm test
#  Test Files  7 passed (7)
#       Tests  62 passed (62)

npx tsc --noEmit -p tsconfig.json
# (no output) exit 0

npx convex dev --once
#   [+] legacyRoomLinks.by_thread   threadId, _creationTime
#   [+] legacyRoomLinks.by_world_state   worldId, state, _creationTime
#   [+] messageLinks.by_message   messageId, _creationTime
#   [+] messageLinks.by_thread_sort   threadId, sortCreatedAt, sortMessageId, _creationTime
#   [+] missions.by_project   projectId, _creationTime
#   [+] missions.by_project_slug   projectId, slug, _creationTime
#   [+] missions.by_world   worldId, _creationTime
#   [+] projects.by_world_general   worldId, isGeneral, _creationTime
#   [+] threadBlocks.by_thread_created   threadId, createdAt, _creationTime
#   [+] threads.by_mission   missionId, _creationTime
#   [+] threads.by_project   projectId, _creationTime
#   [+] threads.by_world   worldId, _creationTime
#   [+] v2Cutovers.by_world   worldId, _creationTime
#   [+] v2MigrationRuns.by_run   runId, _creationTime
# ✔ 23:14:36 Convex functions ready! (6.13s)

npm run parity:v2
# > node scripts/v2-schema-parity.mjs
# tables: 56/56 present
# functions: 291/291 present
```

Push accepted the optional `projects` fields with zero validation failures
on the existing rows, as constructed. No `npm run build` run (desktop
worker owns `dist/`; used the two typechecks instead).

Guard proof on Karen's real workspace (rehearsal deployment):

```bash
npx convex run v2Projects:ensureGeneral '{"workspaceId":"k17480zy9719gsc6tm83s6hjdx8drg9z"}'
# ✖ Failed to run function "v2Projects:ensureGeneral":
# Error: [Request ID: 65bf6281773cde69] Server Error
# Uncaught Error: Not signed in
#     at requireViewer (../../convex/lib/viewer.ts:35:9)
#     at async requireWorkspaceMember (../../convex/lib/viewer.ts:106:11)
#     at async handler (../convex/v2Projects.ts:47:4)
```

Correct: keyless CLI identity is rejected. No bypass added.

## Step 5 — commit

One-word `convex/projects.ts` change verified as mine-only before staging
(`git diff` showed only the `export` keyword; `git status` showed no
`src/`/`e2e/`/`scripts/audit/` entries from the desktop worker):

```bash
git add convex/schema.ts convex/v2Schema convex/lib/viewer.ts convex/projects.ts convex/v2Types.ts convex/v2Projects.ts convex/v2Threads.ts convex/v2Migrations.ts tests/v2/setup.ts tests/v2/projects-and-tenancy.test.ts
git commit -m "feat: add v2 project mission thread spine"
# [codex/corner-v2-integration 45b33e7] feat: add v2 project mission thread spine
git log --oneline -3 && git status
# 45b33e7 feat: add v2 project mission thread spine
# 611249e chore: v2 rehearsal deployment from the live export
# 2f5bda0 chore: live backend parity contract for v2 rehearsal
# (status clean — nothing unstaged)
```

No push (per hard rules). No `index.lock` collision occurred; no retry
needed.

## Deviations from the brief (2, both required by the work)

1. Staged `convex/projects.ts` in addition to the brief's `git add` list:
   the brief's Step 3 says to reuse (and export if needed) the slugify in
   `convex/projects.ts`, but Step 5's pathspec omits that file. The
   one-word `export` is needed for the commit to typecheck, so it is
   staged. Nothing else in the file changed; parity unaffected (`export
   function` matches none of the parity scanner patterns).
2. `moveMission` same-project (target == source) returns `{ missionId }`
   as a no-op instead of throwing: moving General → General changes
   nothing, so there is nothing to forbid. Moving a normal mission into
   General throws; moving a General mission out is allowed; both covered
   by tests.

Stale-snippet correction applied as instructed: no test rejects direct
General messages; test 4 proves a direct General message stays in General,
and General immutability (no rename/move-in/archive/delete) is tested.

## Legacy behaviour changes

None. No legacy function edited except the additive `export` keyword on
`slugify` (no call-site change). Parity holds at 56/56 tables +
291/291 functions. No row that existed before this round was hard-deleted;
the only `db.delete` paths remove rows the same call just inserted
(General race guard). No key-based auth bypass added anywhere.
