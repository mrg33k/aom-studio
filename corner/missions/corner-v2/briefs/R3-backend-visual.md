# Brief R3-backend-visual — Thread-owned artifacts, shared Visual Window session and durable tabs, pins, checklists, runs, replayable agent events, and the v2VisualWindow façade (backend plan Task 6)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines), then `rounds/R2-backend-spine.md` (exact spine function names and
tables). Write your report to `rounds/R3-backend-visual.md`: every command with its output.

You are a headless worker, the BUILDER for backend plan Task 6 plus the `v2VisualWindow` façade the
desktop plan consumes. Nobody will answer questions.

Plan: Task 6 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-backend-foundation.md`
and the `v2VisualWindow` signatures in that plan's Interfaces block. Spec sections "Shared Visual
Window", "Review", "Agent brains" (event set), "Error and safety behavior" in
`docs/superpowers/specs/2026-09-05-corner-v2-reorganization-design.md`. Behaviour reference:
`docs/design-reference/corner-v2/HANDOFF.md` section 6 (Visual Window behaviors, artifact kinds, pins
max 4, Review toggle semantics).

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`. `.env.local` selects the REHEARSAL deployment; `head -1 .env.local`
  before any `npx convex` command, paste it, it must not say `neat-pony-216`.
- Your schema file is `convex/v2Schema/visual.ts` ONLY (export `visualTables`). Never open
  `convex/schema.ts`, `spine.ts`, `routing.ts` for editing. Another worker owns `convex/v2Routing.ts`,
  `v2CrossProject.ts`, `v2Ledger.ts`, `v2Workspace.ts`, `ledger.ts`; a third owns `v2Mapping.ts`,
  `v2Migrations.ts`, `v2Threads.ts`. You never edit those. If you need a helper from `v2Threads.ts`,
  import it; if it does not exist, write your own private helper in your file.
- Existing: `files` table (`roomId`, `worldId`, `name`, `mimeType`, `size`, `storageId?`, `status`),
  `messages.attachments[]` (`storageId?`, `name?`, `url?`, `mime?`), `threads`, `threadBlocks`
  (`kind` includes `"artifact"`, `"steps"`, `"question"`), `legacyRoomLinks` (`roomId` → `threadId`
  once mapped; may be empty this round). Access helpers in `convex/lib/viewer.ts`
  (`requireWorkspaceMember`, `requireProjectAccess`). Ledger: append through `convex/ledger.ts`'s
  exported `normalizeWhat` + a direct `ctx.db.insert("ledger", …)` with `source: "corner:v2"` (do not
  call the routing worker's `v2Ledger` this round; it may not exist yet).
- HEAD is `45b33e7` (R2 spine). Spine functions as shipped (`convex/v2Projects.ts`): `ensureGeneral`,
  `createProject`, `createMission`, `ensureThread`, `get`, `getMission`, `listNavigation`, plus
  rename/archive/delete/move; (`convex/v2Threads.ts`): `appendText`, `listThreadMessages`. Read
  their arg names in the files. `tests/v2/setup.ts` exports `makeT`, `seedUserWorld`, `asUser`.
- FOUR workers share this worktree right now (you, MAPPING, ROUTING, and a DESKTOP worker in `src/`).
  Concurrency rules: (a) never run `npm run build`; use `npx tsc --noEmit -p tsconfig.json` and
  `npx convex dev --once`. (b) `npx convex dev --once` bundles the whole `convex/` folder, so it can
  fail on a type error in a file you do not own (`v2Mapping.ts`, `v2Migrations.ts`, `v2Threads.ts`,
  `v2Routing.ts`, `v2CrossProject.ts`, `v2Ledger.ts`, `v2Workspace.ts`, `v2Schema/routing.ts`); if
  the error is in a file you do not own, wait 60 seconds and retry, up to 8 times, and note it in
  the report; never edit that file. (c) `npm test` may show failures in test files you do not own
  (`karen-mapping`, `history-reconciliation`, `routing-and-access`); your gate is `npm test --
  tests/v2/visual-state.test.ts tests/v2/projects-and-tenancy.test.ts`; report the full-suite line as
  observed without touching foreign files. (d) on `index.lock` wait 10 s and retry up to 5 times;
  never delete it. (e) never `git add` a path you did not create or edit.

## Step 1 — tables (in `convex/v2Schema/visual.ts`)

```ts
artifacts: defineTable({
  threadId: v.id("threads"),
  worldId: v.id("worlds"),
  kind: v.union(v.literal("pdf"), v.literal("deck"), v.literal("document"), v.literal("site"), v.literal("photo"), v.literal("video"), v.literal("youtube"), v.literal("code"), v.literal("file"), v.literal("email"), v.literal("tracker")),
  title: v.string(),
  meta: v.any(),                                   // { mime, size, pages, duration, youtubeId, language, ... }
  storageId: v.optional(v.id("_storage")),
  legacyFileId: v.optional(v.id("files")),
  legacyMessageId: v.optional(v.id("messages")),
  src: v.optional(v.string()),
  liveUrl: v.optional(v.string()),
  version: v.number(),
  previousArtifactId: v.optional(v.id("artifacts")),
  createdBy: v.union(v.literal("user"), v.literal("agent"), v.literal("migration")),
  createdAt: v.number(),
}).index("by_thread", ["threadId"]).index("by_legacy_file", ["legacyFileId"]).index("by_previous", ["previousArtifactId"]),

visualSessions: defineTable({
  threadId: v.id("threads"),
  view: v.union(v.literal("preview"), v.literal("context")),
  activeTabId: v.optional(v.id("visualTabs")),
  selectedPinId: v.optional(v.id("pins")),
  lookingTabId: v.optional(v.id("visualTabs")),
  lookingWhy: v.optional(v.string()),
  updatedAt: v.number(),
}).index("by_thread", ["threadId"]),

visualTabs: defineTable({
  threadId: v.id("threads"),
  target: v.union(
    v.object({ kind: v.literal("artifact"), artifactId: v.id("artifacts") }),
    v.object({ kind: v.literal("tool"), tool: v.union(v.literal("email"), v.literal("tracker")), itemId: v.optional(v.string()) }),
  ),
  title: v.string(),
  position: v.number(),
  state: v.union(v.literal("open"), v.literal("closed")),
  page: v.optional(v.number()),
  timecodeMs: v.optional(v.number()),
  codeLine: v.optional(v.number()),
  siteViewport: v.optional(v.union(v.literal("desktop"), v.literal("mobile"))),
  reviewEnabled: v.boolean(),
  error: v.optional(v.string()),
  openedBy: v.union(v.literal("user"), v.literal("agent")),
  openedAt: v.number(),
  closedAt: v.optional(v.number()),
  updatedAt: v.number(),
}).index("by_thread_position", ["threadId", "position"]).index("by_thread_state", ["threadId", "state"]),

pins: defineTable({
  threadId: v.id("threads"),
  tabId: v.id("visualTabs"),
  artifactId: v.id("artifacts"),
  artifactVersion: v.number(),
  ordinal: v.number(),                              // 1..4 per artifact version
  page: v.optional(v.number()),
  timecodeMs: v.optional(v.number()),
  codeLine: v.optional(v.number()),
  xPct: v.optional(v.number()),
  yPct: v.optional(v.number()),
  body: v.string(),
  status: v.union(v.literal("open"), v.literal("working"), v.literal("done")),
  createdAt: v.number(),
  resolvedAt: v.optional(v.number()),
}).index("by_thread", ["threadId"]).index("by_artifact_version", ["artifactId", "artifactVersion"]).index("by_tab", ["tabId"]),

checklists: defineTable({
  threadId: v.id("threads"),
  artifactId: v.id("artifacts"),
  status: v.union(v.literal("open"), v.literal("sent"), v.literal("resolved")),
  blockId: v.optional(v.id("threadBlocks")),
  runId: v.optional(v.id("runs")),
  createdAt: v.number(),
  sentAt: v.optional(v.number()),
  resolvedAt: v.optional(v.number()),
}).index("by_thread_status", ["threadId", "status"]),

checklistItems: defineTable({
  checklistId: v.id("checklists"),
  pinId: v.id("pins"),
  position: v.number(),
  state: v.union(v.literal("open"), v.literal("working"), v.literal("done")),
}).index("by_checklist", ["checklistId"]).index("by_pin", ["pinId"]),

runs: defineTable({
  threadId: v.id("threads"),
  worldId: v.id("worlds"),
  provider: v.string(),                             // "corner" | "claude" | "muse" | ... adapter name
  brain: v.optional(v.string()),
  status: v.union(v.literal("queued"), v.literal("running"), v.literal("cancelled"), v.literal("done"), v.literal("failed")),
  triggerBlockId: v.optional(v.id("threadBlocks")),
  checklistId: v.optional(v.id("checklists")),
  lastEventId: v.optional(v.string()),
  createdAt: v.number(),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  cancelledAt: v.optional(v.number()),
  error: v.optional(v.string()),
}).index("by_thread_created", ["threadId", "createdAt"]).index("by_status", ["status"]),

agentEvents: defineTable({
  runId: v.id("runs"),
  eventId: v.string(),                              // opaque, adapter-created, unique per run
  afterEventId: v.optional(v.string()),
  type: v.union(v.literal("message"), v.literal("step"), v.literal("question"), v.literal("artifact"), v.literal("looking"), v.literal("status"), v.literal("review_progress"), v.literal("ledger"), v.literal("error")),
  payload: v.any(),
  seq: v.number(),                                  // insertion order within the run, assigned by the server (count of prior events + 1), NOT a timestamp
  createdAt: v.number(),
}).index("by_run_event", ["runId", "eventId"]).index("by_run_seq", ["runId", "seq"]),
```

## Step 2 — tests first: `tests/v2/visual-state.test.ts` (`// @vitest-environment edge-runtime`)

Seed Karen (`tests/v2/setup.ts`), a project + its thread, and two artifacts via `v2Visual.createArtifact`
(kind `photo` with `src`, kind `pdf` with `meta.pages: 3`). Tests:

1. `keeps tabs ordered and shared, activates new tabs, never replaces an old tab`: `openTab(a)` then
   `openTab(b)`; `getSession` → `activeTabId === b.tabId`; open tabs in position order `[a, b]`;
   `openTab(a)` again does NOT create a third tab, it activates `a` (idempotent per target).
2. `close hides but never deletes or reorders`: `closeTab(a)`; open list is `[b]`; the row for `a`
   still exists with `state: "closed"` and its `position` unchanged; `openTab(a)` reopens the same row
   (same id) at the END (new position), state `open`.
3. `reorder keeps a dense order`: three tabs, `reorderTab(c, 0)` → positions `[c, a, b]` with
   `position` values `0,1,2`.
4. `pins cap at four per artifact version and become a checklist`: four `addPin` calls succeed, a
   fifth throws `"Maximum four pins per artifact"`; `sendChecklist({ threadId, tabId })` creates a
   `checklists` row `status: "sent"`, four `checklistItems`, a `threadBlocks` row of `kind: "text"`
   authored by the user whose payload text is the numbered list (`"1. [p2] Raise headline"` format,
   page/timecode prefix per HANDOFF), and a `runs` row `status: "queued"` linked to it; the tab's
   `reviewEnabled` flips to `false`; pins stay `open`.
5. `review progress resolves items and versions the artifact`: `appendEvent(runId, "ev-1",
   { type: "review_progress", pinId, state: "done" })` marks the item + pin `done`; `appendEvent(runId,
   "ev-2", { type: "artifact", artifactId: newVersionId })` where `createArtifact({ ...,
   previousArtifactId: pdf.id })` produced version 2; then the tab for the pdf points at version 2
   (target artifactId updated in place, same tab id) and pins of version 1 are not returned for
   version 2.
6. `events replay after an opaque id and reject duplicates`: three events `ev-1`, `ev-2`, `ev-3`;
   `listEvents({ runId, afterEventId: "ev-1" })` → `["ev-2", "ev-3"]`; `appendEvent(runId, "ev-2",
   …)` again throws `"Duplicate event"`; `listEvents({ runId })` → all three in `seq` order.
7. `looking events drive the session`: `appendEvent(runId, "ev-4", { type: "looking", artifactId,
   why: "Checking hierarchy" })` opens/activates that artifact's tab with `openedBy: "agent"` and sets
   `lookingTabId` + `lookingWhy`; existing tabs untouched.
8. `an unavailable artifact keeps its tab with an error`: `markTabError({ tabId, error: "File not
   found" })` → tab stays `open` with `error` set; `openTab` for it again clears `error`.
9. `Ben cannot see Karen's session`: as Ben, `getSession({ threadId })` throws `"Not a member of this
   world"`.

Run; must FAIL. Paste.

## Step 3 — implement `convex/v2Visual.ts`

All functions `requireWorkspaceMember` on the thread's world (load thread → worldId). Every
meaningful change appends one ledger row (`kind: "did"`, `who` viewer, `surface: "corner:v2"`,
`world` = world slug, `subjects` = [project slug, mission slug if any], `what` one sentence such as
`"Opened <title> in the Visual Window."`). Do NOT ledger `setActiveTab`, `setView`, `reorderTab`, or
`updatePin` body edits (spec: no UI clicks in the ledger); DO ledger open/close tab, add/remove pin,
send checklist, run start/finish, artifact version.

- `createArtifact({ threadId, kind, title, meta?, storageId?, legacyFileId?, legacyMessageId?, src?,
  liveUrl?, previousArtifactId?, createdBy? })`: version = previous.version + 1 or 1; if
  `previousArtifactId`, update every open tab whose target is the previous artifact to point at the new
  one (same tab row). Returns the artifact.
- `artifactsForThread({ threadId })` query: artifacts ordered newest first, plus — if the thread has a
  `legacyRoomLinks` row — one synthesised `file`/`photo`/`pdf`/`video` artifact per legacy `files` row
  and per `messages.attachments[]` with a `storageId` (do not insert; return them with `id:
  "legacy:<fileId or messageId:index>"` and `version: 1`); `openTab` for such an id materialises an
  `artifacts` row first (`createdBy: "migration"`, `legacyFileId` / `legacyMessageId`) then opens it.
  Kind from mime: `application/pdf → pdf`, `image/* → photo`, `video/* → video`, `text/*|*json|*js|*ts →
  code`, else `file`.
- `getSession({ threadId })` query → `VisualWindowState` (desktop shape): `{ threadId, view,
  activeTabId, tabs: VisualWindowTab[] (open only, by position, each `{ id, threadId, kind, targetId,
  title, ordinal, state, artifactVersion, page, timecodeMs, codeLine, siteViewport, reviewing,
  error }`), selectedPinId, looking: { tabId, why } | null }`. Creates nothing; a missing session reads
  as `{ view: "preview", activeTabId: null, tabs: [] }`.
- `openTab({ threadId, target, openedBy? })`: idempotent per target (artifact id, or tool+itemId);
  next position = max(position)+1 among ALL rows (open or closed); activates; ensures a
  `visualSessions` row exists. `closeTab`, `reorderTab({ threadId, tabId, toOrdinal })` (renumber
  open tabs densely; closed rows keep their old numbers), `setActiveTab`, `setView`, `setReview({
  threadId, tabId, reviewing })`, `setTabPosition({ tabId, page?, timecodeMs?, codeLine?,
  siteViewport? })`, `markTabError({ tabId, error })`.
- `addPin({ threadId, tabId, xPct?, yPct?, page?, timecodeMs?, codeLine?, body })`: artifact from the
  tab; count pins for (artifactId, version) < 4 else throw; ordinal = count+1; turns `reviewEnabled`
  on; sets `selectedPinId`. `updatePin({ pinId, body?, status? })`, `removePin({ pinId })` (hard
  delete is allowed for pins the viewer created and that are not yet in a sent checklist; otherwise
  throw `"Pin is in a sent checklist"`).
- `sendChecklist({ threadId, tabId })`: as test 4. `carryOn({ threadId })`: appends the user text
  block `"Looks right. Carry on."` and nothing else.
- `startRun({ threadId, provider, brain?, triggerBlockId?, checklistId? })`, `finishRun({ runId,
  status: "done" | "failed" | "cancelled", error? })`.
- `appendEvent({ runId, eventId, afterEventId?, type, payload })`: reject duplicate `(runId,
  eventId)` via `by_run_event`; `seq` = count of existing events + 1 (read via `by_run_seq` order desc
  take 1); apply side effects per type: `looking` (test 7), `artifact` (test 5), `review_progress`
  (test 5; when every item is done → checklist `resolved`, run stays as is), `status` (`payload.status`
  → run status), `error` (run `failed`, `error` message), `message`/`step`/`question` → append the
  matching `threadBlocks` row (`authorType: "agent"`, `agentSlug` = run.brain) so the conversation
  shows it; `ledger` → append a ledger row from `payload` after `normalizeWhat`. Update
  `runs.lastEventId`.
- `listEvents({ runId, afterEventId? })` query: in `seq` order; if `afterEventId` given, everything
  after that event's seq.

`convex/v2VisualWindow.ts` — façade with EXACTLY the plan's signatures (`getSession`, `openTab({
threadId, kind, targetId })` mapping `kind` `"email"|"tracker"` to a tool target and anything else to
`{ kind: "artifact", artifactId: targetId }` (accepting the `legacy:` ids too), `closeTab`,
`reorderTab`, `setActiveTab`, `setView`, `setReview`, `addPin`, `updatePin`, `removePin`), each
returning the desktop shapes (`VisualWindowState` or `VisualPin` `{ id, ordinal, artifactId, xPct,
yPct, page, timecodeMs, body, status }`).

## Step 4 — gates

```bash
grep CONVEX_DEPLOYMENT .env.local
npm test -- tests/v2/visual-state.test.ts tests/v2/projects-and-tenancy.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npx convex dev --once
npm run parity:v2
```

All green; paste each. Then on the rehearsal copy:

```bash
npx convex run v2VisualWindow:getSession '{"threadId":"<any thread id from rounds/R2-backend-spine.md>"}'
```

Must throw `Not signed in` (proves the guard). Paste it.

## Step 5 — commit

```bash
git add convex/v2Schema/visual.ts convex/v2Visual.ts convex/v2VisualWindow.ts tests/v2/visual-state.test.ts
git commit -m "feat: add shared v2 visual window state"
git log --oneline -3 && git status
```

Stage nothing outside that list.

## Report `rounds/R3-backend-visual.md`

Per step: commands + output; failing then passing runs; parity; the guard run; commit hash;
deviations. One paragraph on how tab positions stay stable through close/reopen/reorder, with a worked
example.

## Hard rules

Never edit `convex/schema.ts`, `convex/v2Schema/spine.ts`, `convex/v2Schema/routing.ts`,
`convex/v2Routing.ts`, `convex/v2CrossProject.ts`, `convex/v2Ledger.ts`, `convex/v2Workspace.ts`,
`convex/ledger.ts`, `convex/v2Mapping.ts`, `convex/v2Migrations.ts`, `convex/v2Threads.ts`,
`convex/v2Projects.ts`, `src/`, `docs/superpowers/`, `.env.local`. Never run against
`neat-pony-216`. Never use a timestamp as an event sequence. Never delete a tab row. Never `git add
-A`. Never push.
