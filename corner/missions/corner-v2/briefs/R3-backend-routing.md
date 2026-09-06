# Brief R3-backend-routing — routing, provenance reads, confirmed cross-Project writes, hardened ledger, and the v2Workspace façade (backend plan Task 5)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines), then `rounds/R2-backend-spine.md` (the exact function names and tables the
spine exposes). Write your report to `rounds/R3-backend-routing.md`: every command with its output.

You are a headless worker, the BUILDER for backend plan Task 5 plus the `v2Workspace` façade the
desktop plan consumes. Nobody will answer questions.

Plan: Task 5 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-backend-foundation.md`
and the "Interfaces" block at the top of that plan (the `v2Workspace` signatures). Spec sections
"Conversation routing", "Agent brains", "Cross-Project work", "Activity ledger", "Error and safety
behavior" in `docs/superpowers/specs/2026-09-05-corner-v2-reorganization-design.md`.

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`. `.env.local` selects the REHEARSAL deployment; `head -1 .env.local`
  before any `npx convex` command, paste it, it must not say `neat-pony-216`.
- Your schema file is `convex/v2Schema/routing.ts` ONLY (export `routingTables`). Do not open
  `convex/schema.ts` or `convex/v2Schema/spine.ts` or `convex/v2Schema/visual.ts` for editing. Another
  worker owns `visual.ts` and `convex/v2Visual.ts` + `convex/v2VisualWindow.ts` this round; a third
  owns `convex/v2Mapping.ts`, `convex/v2Migrations.ts`, `convex/v2Threads.ts`. You never edit those.
- Existing: `convex/ledger.ts` (append/latest/subjects/issueToken/revokeToken/listTokens; `world` is a
  slug string; reads are OPEN today; append accepts key | token | signed-in user | open-when-no-key),
  `convex/lib/viewer.ts` (`requireViewer`, `requireWorkspaceMember`, `requireProjectAccess` from R2),
  `convex/v2Projects.ts` (`ensureGeneral`, `createProject`, `createMission`, `listNavigation`, `get`,
  `getMission`), `convex/v2Threads.ts` (`appendText`, `listThreadMessages`; `threadBlocks` table with
  `kind` including `"routing"`), `convex/v2Types.ts`.
- Live ledger has 21 rows and one active `ledgerTokens` row (a Mac Stop hook, world `aom`). Both must
  keep working exactly as today for the `aom` world writer. Never print a token.
- HEAD is `45b33e7` (R2 spine). Spine functions as shipped (`convex/v2Projects.ts`): `ensureGeneral`,
  `createProject`, `createMission`, `ensureThread`, `get`, `getMission`, `listNavigation`,
  `renameProject`, `archiveProject`, `deleteProject`, `renameMission`, `archiveMission`,
  `moveMission`; (`convex/v2Threads.ts`): `appendText`, `listThreadMessages`; (`v2Migrations.ts`):
  `getCutover`. `slugify` is exported from `convex/projects.ts`. Read their arg names in the files.
- FOUR workers share this worktree right now (you, MAPPING, VISUAL, and a DESKTOP worker in `src/`).
  Concurrency rules: (a) never run `npm run build`; use `npx tsc --noEmit -p tsconfig.json` and
  `npx convex dev --once`. (b) `npx convex dev --once` bundles the whole `convex/` folder, so it can
  fail on a type error in a file you do not own (`v2Mapping.ts`, `v2Migrations.ts`, `v2Threads.ts`,
  `v2Visual.ts`, `v2VisualWindow.ts`, `v2Schema/visual.ts`); if the error is in a file you do not
  own, wait 60 seconds and retry, up to 8 times, and note it in the report; never edit that file.
  (c) `npm test` may show failures in test files you do not own (`karen-mapping`,
  `history-reconciliation`, `visual-state`); your gate is `npm test -- tests/v2/routing-and-access.test.ts
  tests/v2/projects-and-tenancy.test.ts`; report the full-suite line as observed without touching
  foreign files. (d) on `index.lock` wait 10 s and retry up to 5 times; never delete it. (e) never
  `git add` a path you did not create or edit.

## Step 1 — tables (in `convex/v2Schema/routing.ts`)

```ts
routeDecisions: defineTable({
  worldId: v.id("worlds"),
  sourceThreadId: v.optional(v.id("threads")),
  inputText: v.string(),
  brain: v.optional(v.string()),
  destination: v.union(v.literal("existing"), v.literal("clarification"), v.literal("proposal")),
  projectId: v.optional(v.id("projects")),
  missionId: v.optional(v.id("missions")),
  threadId: v.optional(v.id("threads")),
  proposal: v.optional(v.object({ kind: v.union(v.literal("mission"), v.literal("project")), parentProjectId: v.optional(v.id("projects")), name: v.string(), reason: v.string() })),
  alternatives: v.array(v.object({ threadId: v.id("threads"), path: v.string(), score: v.number() })),
  reason: v.string(),
  confidence: v.number(),
  actorUserId: v.id("users"),
  blockId: v.optional(v.id("threadBlocks")),
  createdAt: v.number(),
  movedAt: v.optional(v.number()),
  movedToThreadId: v.optional(v.id("threads")),
  confirmedAt: v.optional(v.number()),
}).index("by_world_created", ["worldId", "createdAt"]).index("by_block", ["blockId"]),

crossProjectConfirmations: defineTable({
  worldId: v.id("worlds"),
  sourceThreadId: v.id("threads"),
  targetThreadId: v.id("threads"),
  actorUserId: v.id("users"),
  action: v.string(),
  change: v.string(),
  payloadHash: v.string(),
  expiresAt: v.number(),
  consumedAt: v.optional(v.number()),
  createdAt: v.number(),
}).index("by_actor_created", ["actorUserId", "createdAt"]),
```

`payloadHash` is computed in the mutation from `action + "\n" + change` with a small pure JS hash
(FNV-1a 32-bit, hex) — no `createHash`, no Node imports in Convex functions.

## Step 2 — tests first: `tests/v2/routing-and-access.test.ts` (`// @vitest-environment edge-runtime`)

Use `tests/v2/setup.ts` from R2 (`makeT`, `seedUserWorld`, `asUser`). Seed Karen with world
`karens-world`, `ensureGeneral`, two projects "Aster" and "Northwind", one mission "Ship home page"
under Aster, and Ben with his own world. Tests:

1. `keeps selected homes direct`: `route({ sourceThreadId: missionThreadId, text: "Continue" })` →
   `destination: "existing"` with `threadId === missionThreadId`.
2. `honors an explicit project name`: `route({ workspaceId, text: "Northwind: draft the brief" })` →
   `existing`, Northwind's thread, `confidence >= 0.9`.
3. `proposes an unscoped one-off under General without creating it`: `route({ workspaceId, text:
   "Renew passport" })` → `destination: "proposal"`, `proposal.kind: "mission"`,
   `proposal.parentProjectId === generalProjectId`; `listNavigation` shows General with ZERO missions.
4. `asks when two homes tie`: seed messages so both Aster and Northwind mention "brand color"; `route({
   workspaceId, text: "brand color" })` → `destination: "clarification"`, `alternatives.length === 2`.
5. `only confirmProposal creates`: after test 3's decision, `confirmProposal({ decisionId })` creates
   the Mission under General and returns `{ projectId, missionId, threadId }`; calling it again throws
   `"Proposal already confirmed"`.
6. `same-Workspace reads carry provenance and log learned`: as Karen, `readFacts({ sourceThreadId:
   asterThreadId, query: "brand color" })` returns items each with `{ sourceProjectId, sourceThreadId,
   sourceKind, sourceId, label }` and afterwards `ledger:latest({ world: "karens-world" })` has one new
   `kind: "learned"` row whose `subjects` include both project slugs.
7. `cross-Workspace read needs a grant`: as Ben, `readFacts` against Karen's thread throws
   `"Project access denied"`; after `projects:grantAccess` for Ben's world it succeeds.
8. `write confirms once`: as Karen, `requestCrossProjectWrite({ sourceThreadId: asterThreadId,
   targetThreadId: northwindThreadId, action: "update brief", change: "Set primary to #5B9BFF" })`
   returns `{ confirmationId, expiresAt }`; `confirmCrossProjectWrite({ confirmationId })` succeeds and
   the Northwind thread gains a block whose payload references the change and Aster's thread gains a
   linked-summary block; a second `confirmCrossProjectWrite` with the same id throws
   `"Cross-project write confirmation required"`; a confirmation older than `expiresAt` (advance the
   clock with `vi.useFakeTimers` / `vi.setSystemTime`) throws the same.
9. `ledger read is scoped`: as Ben, `v2Ledger.latest({ workspaceId: karenWorldId })` throws `"Not a
   member of this world"`; as Karen it returns the rows.
10. `legacy token writer still works`: insert a `ledgerTokens` row for world `aom` in the test and call
    the EXISTING `ledger.append` with that token; it succeeds exactly as before.

Run the file; it must FAIL. Paste it.

## Step 3 — implement

`convex/v2Routing.ts`:

- `route({ workspaceId?, sourceThreadId?, text, brain? })` mutation (it records a decision). Rules in
  order, exactly as the spec: (1) `sourceThreadId` set → `existing` for that thread; (2) explicit
  reference: text starts with `<Project name>:` or `<Project name> > <Mission name>:` or contains
  `@<brain>` (brain only selects the agent, never the home); (3) score every project + mission thread:
  name/slug token overlap (weight 3), summary/goal overlap (2), last 50 `threadBlocks` text overlap (1),
  `messageLinks`-linked legacy messages' `text` overlap (1, cap 200 rows via `by_thread_sort`), file
  names in legacy `files` for a linked room (1), ledger `subjects` match (2). Normalise: lowercase,
  strip punctuation, drop stop words (`a an the to for of and or in on at is it this that my our`).
  (4) top score ≥ 0.6 × total-possible AND ≥ 1.5 × second → `existing`. (5) top two within 1.5× of each
  other and both ≥ 2 → `clarification` with a one-line `reason` `"Could be <A> or <B>"`. (6) no
  candidate ≥ 2 → `proposal` `{ kind: "mission", parentProjectId: generalProjectId, name: <first 6
  words of text, title-cased>, reason }`. (7) the text reads like a durable concept (≥ 12 words AND
  contains one of `project client launch campaign product brand site app`) → `proposal` `{ kind:
  "project", name }`. Store a `routeDecisions` row; for `existing`, ALSO append a `threadBlocks` row
  of `kind: "routing"` in the destination thread with payload `{ decisionId, path, moveable: true }`
  and set `blockId`. Return the row as `RouteDecision` (spec shape).
- `confirmProposal({ decisionId })`, `moveThreadBlock({ blockId, targetThreadId })` (re-parents the
  routing block AND the user text block that followed it; writes `movedAt`, `movedToThreadId`; appends
  a ledger `decided` row `"Moved <path A> to <path B>"`).
- No mutation here creates a project or mission except `confirmProposal`.

`convex/v2CrossProject.ts`:

- `readFacts({ sourceThreadId, query })` query→ NO: it must log to the ledger, so it is a mutation
  named `readFacts` (document why). `requireWorkspaceMember` on the source thread's world; for each
  OTHER project in the same world (and projects granted to this world via `projectAccess`), search the
  same sources as routing step (3) and return up to 8 `ProvenanceLink`-shaped facts (`{ projectId,
  projectTitle, missionId, missionTitle, sourceKind: "file" | "message" | "artifact" | "ledger",
  sourceId, label, sourceThreadId }`). Append one ledger `learned` row per call (`who` = viewer
  email's local part or name, `surface: "corner:v2"`, `world` = world slug, `subjects` = the slugs of
  source + every borrowed project). Foreign-world projects without a grant → `"Project access
  denied"` (throw, never silent skip).
- `requestCrossProjectWrite({ sourceThreadId, targetThreadId, action, change })`: both threads
  resolved; the target's world must be the same world OR granted with role `editor`; insert
  confirmation with `expiresAt = now + 10 * 60 * 1000`. Ledger `asked` row.
- `confirmCrossProjectWrite({ confirmationId })`: viewer must equal `actorUserId`; unexpired;
  unconsumed; then in ONE mutation: append a `threadBlocks` row in the target (`kind: "system"`,
  payload `{ crossProject: true, fromThreadId, action, change, confirmationId }`), append a linked
  summary block in the source (`kind: "system"`, payload `{ linkedThreadId, summary: "<action> in
  <target path>" }`), set `consumedAt`, ledger `did` row with both project slugs in `subjects` and
  `links: ["thread:<target>"]`. Any failure → `"Cross-project write confirmation required"`.

`convex/v2Ledger.ts` (new, beside the untouched-in-behaviour `convex/ledger.ts`):

- `latest({ workspaceId, subjects?, kind?, since?, limit? })` query: `requireWorkspaceMember`, then
  `ledger.by_world_at` for the world's slug (Karen's world slug is `karens-world`; `aom` stays `aom`).
- `append({ workspaceId, item })` mutation: signed-in member only (no key, no token); same
  normalisation as `ledger.ts` (import and reuse `normalizeWhat`; export `normalizeSubjects` from
  `ledger.ts` if it is not exported — that is the ONLY edit allowed in `ledger.ts` besides step below).
- `issueLocalToken({ workspaceId, label, surface })` / `revokeLocalToken({ workspaceId, tokenTail })`:
  member with role owner|admin only; world = the workspace slug.
- Harden `convex/ledger.ts` minimally: in `latest` and `subjects`, if the caller is signed in and the
  requested `world` is NOT `aom` and the viewer is not a member of the world with that slug → throw
  `"Not a member of this world"`. Unsigned callers keep today's behaviour for `world: "aom"` only (the
  Mac hooks read it unsigned); any other world unsigned → throw. Document this in a comment with the
  date. `append` keeps every current path (key, token, user, open-when-no-key) unchanged.

`convex/v2Workspace.ts` — the authenticated desktop façade, exact signatures from the plan's
Interfaces block. The façade derives the Workspace from the viewer (`homeWorld` in `lib/viewer.ts`),
so it takes NO `workspaceId`:

- `getNavigation({})` → `WorkspaceNode[]` (desktop shape: `{ id, threadId, kind, title, projectId,
  parentProjectId, tint, needsYou, lastActivityAt }`; `needsYou` = the thread's newest block is a
  `question` authored by an agent; `lastActivityAt` = newest block or linked message createdAt).
- `getConversationSurface({ threadId })` → `{ conversation, messages: TypedMessage[], artifacts: [],
  routingBanner, crossProjectProvenance }` where `messages` comes from `v2Threads.listThreadMessages`
  mapped to `TypedMessage` (`{ id, threadId, authorType, authorLabel, agentSlug, kind, payload,
  createdAt }`; legacy linked messages map `role user → "user"`, `agentSlug → "agent"`, else
  `"system"`; `authorLabel` = `userName` or agent title), `routingBanner` = the newest un-moved
  `routeDecisions` row whose `threadId` is this thread and `createdAt` within 24h (as `RouteDecision`
  desktop shape, `kind: "confident-existing"`), `artifacts: []` this round (the visual worker fills it
  next round via `v2Visual`; leave a one-line comment).
- `routeGlobalInput({ text, brain })`, `confirmProposedHome({ proposalId })` (proposalId =
  decisionId), `moveThreadBlock`, `requestCrossProjectWrite`, `confirmCrossProjectWrite` → thin
  wrappers over the modules above, returning the desktop `RouteDecision` shapes (`confident-existing`
  | `ambiguous` | `proposed-general-mission` | `proposed-new-home`).
- `sendMessage({ threadId, text, brain?, clientMessageId? })`: `v2Threads.appendText` plus, if
  `brain` or an `@slug` in text, a `runs`-less placeholder: append an agent `text` block
  `"<brain> is not wired to v2 yet"`? NO — do not fake agent replies. Only append the user block and
  return its id. Agent dispatch is a later round.

## Step 4 — gates

```bash
grep CONVEX_DEPLOYMENT .env.local
npm test -- tests/v2/routing-and-access.test.ts tests/v2/projects-and-tenancy.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npx convex dev --once
npm run parity:v2
```

All green. Paste each. Then prove the ledger on the rehearsal copy still serves the `aom` world
unsigned and refuses another world unsigned:

```bash
npx convex run ledger:latest '{"world":"aom","limit":1}'
npx convex run ledger:latest '{"world":"karens-world","limit":1}'
```

First returns one row; second throws `Not a member of this world`. Paste both.

## Step 5 — commit

```bash
git add convex/v2Schema/routing.ts convex/v2Routing.ts convex/v2CrossProject.ts convex/v2Ledger.ts convex/v2Workspace.ts convex/ledger.ts tests/v2/routing-and-access.test.ts
git commit -m "feat: add v2 routing provenance and confirmed writes"
git log --oneline -3 && git status
```

Stage nothing outside that list.

## Report `rounds/R3-backend-routing.md`

Per step: commands + output. Failing run, passing run, parity line, the two `ledger:latest` runs, commit
hash, deviations. One paragraph on the scoring weights you shipped and one worked example of each of
the three route outcomes with the real scores.

## Hard rules

Never edit `convex/schema.ts`, `convex/v2Schema/spine.ts`, `convex/v2Schema/visual.ts`,
`convex/v2Visual.ts`, `convex/v2VisualWindow.ts`, `convex/v2Mapping.ts`, `convex/v2Migrations.ts`,
`convex/v2Threads.ts`, `convex/v2Projects.ts`, `src/`, `docs/superpowers/`, `.env.local`. Never run
against `neat-pony-216`. Never print a ledger token. Never add a key/bypass to a v2 function. Never
create a project or mission outside `confirmProposal`. Never `git add -A`. Never push.
