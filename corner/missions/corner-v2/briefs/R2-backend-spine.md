# Brief R2-backend-spine — Workspace, Project, Mission, Thread, General (backend plan Task 2)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` first (hard lines), then `rounds/R1-backend-reconcile.md` (what R1 built and the real
Karen counts). Write your report to `rounds/R2-backend-spine.md`: every command with its output pasted.

You are a headless worker, the BUILDER for backend plan Task 2. Nobody will answer questions.

Plan: Task 2 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-backend-foundation.md`.
Spec: `docs/superpowers/specs/2026-09-05-corner-v2-reorganization-design.md` beside it. Read both
"Core hierarchy", "Target data model", and the plan's Global Constraints before writing a line.

## Where things are, exactly

- Worktree: `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`, HEAD `611249e`. Its `.env.local` selects the REHEARSAL deployment
  `dev:adjoining-tiger-87` (R1 created it; expires 2026-09-10). Run
  `grep CONVEX_DEPLOYMENT .env.local` before any `npx convex` command and paste it: it must say
  `adjoining-tiger-87`, never `neat-pony-216`.
- R1 facts you can rely on (`rounds/R1-backend-reconcile.md`): `npm test` = 58 tests green,
  `npm run parity:v2` = 56/56 tables + 291/291 functions, `files` table has 0 rows deployment-wide,
  Karen's world `k17480zy9719gsc6tm83s6hjdx8drg9z` has 6 project rooms, 6 mission rooms, 4 agent
  rooms, 365 messages. `npm run lint` fails on every branch (no eslint config ever existed): skip it.
- A DESKTOP worker is running in this same worktree at the same time, editing `src/`, `e2e/`,
  `index.html`, `public/`, `scripts/audit/`. Concurrency rules: (a) do NOT run `npm run build` (it
  writes `dist/`, which the other worker's Playwright run also writes); use
  `npx tsc --noEmit -p tsconfig.json` for the app typecheck and `npx convex dev --once` for the Convex
  typecheck + push instead. (b) if `git commit` fails with `index.lock`, wait 10 seconds and retry, up
  to 5 times; never delete the lock file. (c) never `git add` a path you did not create or edit.
- You are the ONLY worker allowed to edit `convex/schema.ts` in this round. A desktop worker is editing
  `src/` at the same time; never touch `src/`, `e2e/`, `playwright.config.ts`, `scripts/audit/`.
- `convex/lib/viewer.ts` already has `requireViewer`, `requireMembership`, `membershipRole`,
  `resolveWorld`. `convex/projects.ts` is the legacy project registry (slug, worldId, worldSlug, name,
  isActive, archived; indexes `by_slug`, `by_world`, `by_world_slug`). `convex/missions.ts` is only
  mission FOLDERS (`missionFolders` table). The `worlds` table is the Workspace; the API and UI call it
  a Workspace but the table name stays `worlds` and ids stay `v.id("worlds")`.
- Auth: `@convex-dev/auth`. `getAuthUserId(ctx)` reads `identity.subject` formatted
  `"<usersId>|<sessionId>"`. In convex-test, `t.withIdentity({ subject: \`${userId}|test-session\` })`
  therefore signs in as that user.

## One correction to the plan, decided by the orchestrator

The plan's Task 2 Step 1 test snippet says General "rejects direct General messages". That snippet is
STALE. The spec and the plan's own Global Constraints (updated later, they win) say: **General has a
normal direct Project conversation. A message deliberately sent while General is open stays in General.**
Only an unscoped one-off arriving through global routing becomes a *proposed* Mission under General
(that is Task 5, not yours). So: do NOT write a test that rejects direct General messages. Instead test
that General is created once, is idempotent, and cannot be renamed, moved, archived, or deleted.

## Step 1 — schema layout so three workers can add tables without sharing a file

Create the folder `convex/v2Schema/` with three files:

- `convex/v2Schema/spine.ts` exporting `export const spineTables = { ...defineTable entries... }`
  (your tables, below).
- `convex/v2Schema/routing.ts` exporting `export const routingTables = {}` (empty; a later worker fills it).
- `convex/v2Schema/visual.ts` exporting `export const visualTables = {}` (empty; a later worker fills it).

In `convex/schema.ts`, import all three and spread them at the END of `defineSchema({ ... })`, after
`clientEngine`:

```ts
import { spineTables } from "./v2Schema/spine";
import { routingTables } from "./v2Schema/routing";
import { visualTables } from "./v2Schema/visual";
// ...
  clientEngine: defineTable({...}).index("by_client", ["client"]),
  ...spineTables,
  ...routingTables,
  ...visualTables,
});
```

Add the optional fields to the existing `projects` table in `schema.ts` (all optional, nothing else
changes): `mark: v.optional(v.string())`, `tint: v.optional(v.string())`, `brandRules:
v.optional(v.any())`, `isGeneral: v.optional(v.boolean())`. Add index `.index("by_world_general",
["worldId", "isGeneral"])` on `projects`.

`spineTables` (exact fields; add nothing else):

```ts
missions: defineTable({
  projectId: v.id("projects"),
  worldId: v.id("worlds"),
  slug: v.string(),
  name: v.string(),
  goal: v.optional(v.string()),
  summary: v.string(),                 // "" when new
  status: v.union(v.literal("live"), v.literal("blocked"), v.literal("ready"), v.literal("done")),
  steps: v.array(v.object({ label: v.string(), done: v.boolean() })),
  agentBinding: v.optional(v.string()),
  folderId: v.optional(v.id("missionFolders")),
  archived: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_project", ["projectId"]).index("by_project_slug", ["projectId", "slug"]).index("by_world", ["worldId"]),

threads: defineTable({
  ownerType: v.union(v.literal("project"), v.literal("mission")),
  worldId: v.id("worlds"),
  projectId: v.id("projects"),
  missionId: v.optional(v.id("missions")),
  createdAt: v.number(),
}).index("by_project", ["projectId"]).index("by_mission", ["missionId"]).index("by_world", ["worldId"]),

messageLinks: defineTable({
  messageId: v.id("messages"),
  threadId: v.id("threads"),
  sortCreatedAt: v.number(),
  sortMessageId: v.string(),
  linkedAt: v.number(),
}).index("by_message", ["messageId"]).index("by_thread_sort", ["threadId", "sortCreatedAt", "sortMessageId"]),

legacyRoomLinks: defineTable({
  roomId: v.id("rooms"),
  worldId: v.id("worlds"),
  projectId: v.optional(v.id("projects")),
  missionId: v.optional(v.id("missions")),
  threadId: v.optional(v.id("threads")),
  state: v.union(v.literal("mapped"), v.literal("unresolved"), v.literal("legacy_archive")),
  reason: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),
  runId: v.optional(v.string()),
}).index("by_room", ["roomId"]).index("by_world_state", ["worldId", "state"]).index("by_thread", ["threadId"]),

v2MigrationRuns: defineTable({
  runId: v.string(),
  worldId: v.optional(v.id("worlds")),
  sourceExportSha256: v.optional(v.string()),
  dryRun: v.boolean(),
  state: v.string(),                    // planned | applied | verified | failed
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  report: v.any(),
}).index("by_run", ["runId"]),

v2Cutovers: defineTable({
  worldId: v.id("worlds"),
  mode: v.union(v.literal("legacy"), v.literal("v2_dual_write"), v.literal("v2_primary")),
  runId: v.optional(v.string()),
  reason: v.optional(v.string()),
  updatedAt: v.number(),
}).index("by_world", ["worldId"]),
```

## Step 2 — tests first (they must fail before Step 3)

Create `tests/v2/setup.ts`:

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
export const modules = import.meta.glob("../../convex/**/*.ts");
export function makeT() { return convexTest(schema, modules); }
export async function seedUserWorld(t: any, email: string, worldSlug: string) {
  return await t.run(async (ctx: any) => {
    const userId = await ctx.db.insert("users", { email, name: email.split("@")[0], color: "#5B9BFF" });
    const worldId = await ctx.db.insert("worlds", { name: worldSlug, ownerId: userId, slug: worldSlug });
    await ctx.db.insert("memberships", { userId, worldId, role: "owner", createdAt: Date.now() });
    return { userId, worldId };
  });
}
export const asUser = (t: any, userId: string) => t.withIdentity({ subject: `${userId}|test-session` });
```

Create `tests/v2/projects-and-tenancy.test.ts` with `// @vitest-environment edge-runtime` as line 1.
Tests (use `api.v2Projects.*` from `../../convex/_generated/api`):

1. `gives each Project and Mission exactly one different Thread`: as Karen, `createProject({ workspaceId,
   name: "Aster" })` returns `{ projectId, threadId }`; `createMission({ projectId, name: "Ship home
   page" })` returns `{ missionId, threadId }`; the two threadIds differ; calling an internal helper
   that tries to insert a second thread for that mission throws `"Mission already has a thread"`
   (expose it as `api.v2Projects.ensureThread` taking `{ ownerType, projectId, missionId? }` and make
   it idempotent: returns the existing thread id, and throws only when asked to CREATE a duplicate via
   `{ ..., createDuplicate: true }` which exists for this test alone and is documented as such).
2. `creates General once and keeps it immutable`: `ensureGeneral({ workspaceId })` twice returns the
   same `projectId`; `get({ projectId })` shows `isGeneral: true`, `slug: "general"`, `name: "General"`;
   `renameProject`, `archiveProject`, `deleteProject`, and `moveMission`-out-of-General-into-General
   style operations on it each throw `"General cannot be changed"`.
3. `denies Karen data to Ben's separate Workspace`: seed Ben with his own world; as Ben,
   `get({ projectId: karenProjectId })` rejects with `"Project access denied"`; as Ben,
   `listNavigation({ workspaceId: karenWorldId })` rejects with `"Not a member of this world"`.
4. `direct General messages stay in General`: as Karen, `appendText({ threadId: generalThreadId, text:
   "one-off" })` resolves and `listThreadMessages({ threadId: generalThreadId })` returns one item whose
   text is `"one-off"` (implement `appendText` minimally in `convex/v2Threads.ts` as a typed text block
   stored in a NEW `messages` row with `worldId`, `roomId` omitted... NO: `messages.roomId` is required
   and is `v.id("rooms")`. So for this round `appendText` stores the block in the `messages` table only
   if a legacy room exists for the thread; otherwise it inserts into a new spine table
   `threadBlocks` — add it to `spineTables`:
   `threadBlocks: defineTable({ threadId: v.id("threads"), worldId: v.id("worlds"), kind:
   v.union(v.literal("text"), v.literal("question"), v.literal("steps"), v.literal("file"),
   v.literal("artifact"), v.literal("routing"), v.literal("system")), authorType:
   v.union(v.literal("user"), v.literal("agent"), v.literal("system")), authorId: v.optional(v.string()),
   agentSlug: v.optional(v.string()), payload: v.any(), createdAt: v.number() })
   .index("by_thread_created", ["threadId", "createdAt"])`.
   `listThreadMessages` merges `messageLinks` (legacy, ordered by `by_thread_sort`) and `threadBlocks`
   (new) into one list sorted by createdAt; this round only `threadBlocks` will have rows.)

Run `npm test -- tests/v2/projects-and-tenancy.test.ts`. It must FAIL (modules missing). Paste it.

## Step 3 — implement

`convex/lib/viewer.ts` — add (keep everything already there):

```ts
export async function requireWorkspaceMember(ctx, worldId) // requireViewer + requireMembership; returns { viewer, role }
export async function requireProjectAccess(ctx, projectId) // loads project; if viewer is a member of project.worldId -> ok (same-Workspace reads never need a grant); else if a projectAccess row exists for one of the viewer's worlds -> ok with role; else throw new Error("Project access denied")
```

`convex/v2Types.ts` — validators + TS types for `WorkspaceNode` (`{ kind: "project" | "mission",
projectId, missionId?, threadId, name, slug, path, isGeneral, tint?, mark?, status?, unread: 0 }`),
`ThreadBlock`, `MissionStatus`. Export `v2` validator objects so other v2 modules import from here.

`convex/v2Projects.ts` — queries/mutations, all authenticated through `requireWorkspaceMember` /
`requireProjectAccess`; args use `workspaceId: v.id("worlds")`:

- `ensureGeneral({ workspaceId })` mutation: find `projects` by `by_world_general` (worldId,
  isGeneral=true); if none, insert `{ slug: "general", worldId, worldSlug: world.slug, name: "General",
  isGeneral: true, isActive: true, archived: false, createdAt, updatedAt }` and its Thread. Returns
  `{ projectId, threadId }`. Concurrency: after inserting, re-query; if two exist, keep the oldest and
  delete the newer one you just made (only ever delete a row you inserted in this same call).
- `createProject({ workspaceId, name, tint?, mark? })`: slugify name (reuse the slugify in
  `convex/projects.ts`; export it from there if it is not exported); reject `"general"` slug; reject a
  duplicate slug in the world with `"Project already exists"`; insert project + Thread. Returns
  `{ projectId, threadId, slug }`.
- `createMission({ projectId, name, goal? })`: `requireProjectAccess`; slug unique per project;
  insert mission + Thread. Returns `{ missionId, threadId, slug }`. Creating a Mission inside General is
  ALLOWED (that is how one-offs live) — only changing General itself is forbidden.
- `ensureThread({ ownerType, projectId, missionId?, createDuplicate? })`: idempotent; throws
  `"Mission already has a thread"` / `"Project already has a thread"` on `createDuplicate: true`.
- `get({ projectId })` query: project + its thread id + mission list.
- `getMission({ missionId })` query.
- `listNavigation({ workspaceId })` query: every non-archived project in the world (General first,
  then by name), each with its missions (non-archived, by updatedAt desc), as `WorkspaceNode[]`
  flattened parent-then-children; `path` is `"Project"` or `"Project > Mission"`.
- `renameProject`, `archiveProject`, `deleteProject` (delete = archive + `archived: true`; never a
  hard delete this round), `renameMission`, `archiveMission`, `moveMission({ missionId,
  targetProjectId })`: each throws `"General cannot be changed"` when the project is General (for
  moveMission: when the source project is General AND the mission is being moved OUT it is allowed;
  renaming/archiving/deleting General itself is what is forbidden — write this rule in a comment).
- `getCutover({ workspaceId })` in `convex/v2Migrations.ts`: returns the `v2Cutovers` row or
  `{ mode: "legacy" }`. `setCutover` is NOT written this round.

`convex/v2Threads.ts` — `appendText({ threadId, text })` (user block, `authorType: "user"`,
`authorId: viewer.userId`), `listThreadMessages({ threadId })` as described in Step 2 test 4. Access via
the thread's `worldId` -> `requireWorkspaceMember`.

Rules: every handler resolves identity from `ctx.auth`; nothing accepts a client-asserted userId. Use
`v.id(...)` for every id arg. No `any`-typed args. No `createHash`, no `Date.now()` arithmetic used as a
sequence.

## Step 4 — gates

```bash
grep CONVEX_DEPLOYMENT .env.local
npm test -- tests/v2/projects-and-tenancy.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npx convex dev --once
npm run parity:v2
```

All green. `npm run parity:v2` proves every legacy table and function is still present after your
schema edit. `npx convex dev --once` pushes to the rehearsal deployment; if it refuses because existing
`projects` rows violate the new optional fields, that is impossible by construction (all optional) — if
it happens anyway paste the error and stop.

Then, still against the rehearsal deployment, prove General on Karen's real workspace:

```bash
npx convex run v2Projects:ensureGeneral '{"workspaceId":"k17480zy9719gsc6tm83s6hjdx8drg9z"}'
```

This will FAIL with "Not signed in" because `npx convex run` has no user identity. That is the correct
result and proves the guard. Paste it. Do not add a key/bypass to make it pass.

## Step 5 — commit

```bash
git add convex/schema.ts convex/v2Schema convex/lib/viewer.ts convex/v2Types.ts convex/v2Projects.ts convex/v2Threads.ts convex/v2Migrations.ts tests/v2/setup.ts tests/v2/projects-and-tenancy.test.ts
git commit -m "feat: add v2 project mission thread spine"
git log --oneline -3 && git status
```

`git status` must show nothing of yours unstaged. Do not stage `src/` changes (another worker's).

## Report `rounds/R2-backend-spine.md`

Per step: commands + output. The failing test run, then the passing one. The parity line. The `npx convex
run` guard failure. The commit hash. Every place you deviated from this brief and why. Any legacy
function whose behaviour you had to change (there should be none).

## Hard rules

Never edit `src/`, `e2e/`, `scripts/audit/`, `playwright.config.ts`, `docs/superpowers/plans/`,
`docs/superpowers/specs/`. Never run anything against `neat-pony-216`. Never edit `.env.local`. Never
`git add -A`. Never push. Never hard-delete a row that existed before your call. Never add a key-based
auth bypass to a v2 function.
