# R3 — backend visual: thread-owned artifacts, shared Visual Window session, durable tabs, pins, checklists, runs, replayable events, v2VisualWindow facade

Worker: BUILDER, backend plan Task 6 + `v2VisualWindow` facade. Worktree
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
`codex/corner-v2-integration`. Commit for this round:
**`453baf7 feat: add shared v2 visual window state`**.

Pre-reads: `LOOP.md` (hard lines), `rounds/R2-backend-spine.md` (spine
function names, `tests/v2/setup.ts` trick), backend plan Task 6 + Interfaces
block, spec "Shared Visual Window" / "Review" / "Agent brains" / "Error and
safety behavior", HANDOFF section 6.

## Step 0 — starting state

```bash
git log --oneline -3
# 49d2a5a feat: add v2 routing provenance and confirmed writes
# e19156f feat: add corner v2 desktop workspace shell
# 44f18cb test: preserve corner v2 reference and workspace contract
git status --short
#  M convex/v2Migrations.ts        (mapping worker, untouched)
#  M convex/v2Threads.ts           (mapping worker, untouched)
# ?? convex/v2Mapping.ts           (mapping worker, untouched)
# ?? docs/superpowers/audits/2026-09-05-karen-reconciliation.json
# ?? docs/superpowers/migrations/
# ?? scripts/v2-verify.mjs
# ?? tests/v2/history-reconciliation.test.ts
# ?? tests/v2/karen-mapping.test.ts
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner
```

Rehearsal deployment, never `neat-pony-216`. While I worked, the mapping
worker landed `1353ac0 feat: require reviewed legacy room mapping and link
immutable history`; all gates below ran against that tree and my commit sits
on top of it. No file I do not own was edited.

## Step 1 — tables (in `convex/v2Schema/visual.ts`)

Replaced the R2 placeholder (`export const visualTables = {};`) with the
brief's eight tables verbatim: `artifacts` (11-kind union,
`by_thread`/`by_legacy_file`/`by_previous`), `visualSessions` (`by_thread`),
`visualTabs` with the artifact/tool target union
(`by_thread_position`/`by_thread_state`), `pins` with ordinal 1..4
(`by_thread`/`by_artifact_version`/`by_tab`), `checklists`
(`by_thread_status`), `checklistItems` (`by_checklist`/`by_pin`), `runs`
(`by_thread_created`/`by_status`), `agentEvents` with server-assigned `seq`
(`by_run_event`/`by_run_seq`). No other schema file touched.

## Step 2 — tests first (FAIL before implementation)

Wrote `tests/v2/visual-state.test.ts` (line 1
`// @vitest-environment edge-runtime`): Karen fixture (world, Aster project +
thread, photo artifact with `src`, pdf artifact with `meta.pages: 3`) plus
the brief's 9 tests and one extra facade/legacy test (test 10).

```bash
npm test -- tests/v2/visual-state.test.ts
#  FAIL  tests/v2/visual-state.test.ts > keeps tabs ordered and shared ...
#  Error: Could not find module for: "v2Visual"
#   ... (same "Could not find module" at all 10 tests via seedVisual :16)
#  Test Files  1 failed (1)
#       Tests  10 failed (10)
```

Required failure: all 10 fail because `convex/v2Visual.ts` does not exist.

## Step 3 — implementation

- `convex/v2Visual.ts` (new): every function loads thread → world and calls
  `requireWorkspaceMember` (Ben gets `"Not a member of this world"`).
  `createArtifact` (version = previous + 1 or 1; retargets open tabs of the
  previous artifact in place), `artifactsForThread` (newest first + synthesised
  `legacy:<fileId>` / `legacy:<messageId>:<index>` rows from the thread's
  `legacyRoomLinks` room, never inserted; `openTab` materialises them with
  `createdBy: "migration"`), `getSession` (desktop `VisualWindowState`,
  creates nothing), `openTab`/`closeTab`/`reorderTab`/`setActiveTab`/`setView`/
  `setReview`/`setTabPosition`/`markTabError`, `addPin` (cap 4 per
  artifact version, turns `reviewEnabled` on, sets `selectedPinId`)/
  `updatePin`/`removePin` (throws `"Pin is in a sent checklist"`)/
  `listPins` (tab's current artifact version only), `sendChecklist` (numbered
  `1. [p2] ...` / `1. [00:02] ...` user text block + `sent` checklist + 4
  items + `queued` run linked both ways + `reviewEnabled=false`, pins stay
  `open`), `carryOn` (user block `"Looks right. Carry on."`, nothing else),
  `startRun` (`running`) / `finishRun` (`done`/`failed`/`cancelled`),
  `appendEvent` (dup → `"Duplicate event"`, `seq` = prior count + 1 read via
  `by_run_seq` desc, side effects for `looking`/`artifact`/`review_progress`/
  `status`/`error`/`message`/`step`/`question`/`ledger`) /
  `listEvents` (seq order, `afterEventId` replays everything after that seq).
  Ledger (`kind: "did"`, `surface`/`source: "corner:v2"`,
  `normalizeWhat`, subjects = project slug + mission slug): open/close tab
  (create/reopen only, activation is a click), add/remove pin, send
  checklist, run start/finish, artifact version. Never ledgered:
  `setActiveTab`, `setView`, `reorderTab`, `updatePin`, `setReview`,
  `setTabPosition`, `markTabError`, `carryOn`.
- `convex/v2VisualWindow.ts` (new): exactly the plan's 11 signatures.
  `openTab({threadId, kind, targetId})` maps `"email"`/`"tracker"` to a tool
  target, `legacy:` ids to materialising artifact targets, anything else to
  `{ kind: "artifact", artifactId: targetId }`. Tab functions return
  `VisualWindowState`; pin functions return `VisualPin`
  (`{ id, ordinal, artifactId, xPct, yPct, page, timecodeMs, body, status }`);
  `removePin` returns null. Shared cores live in `v2Visual.ts` and are
  imported (same pattern as `v2Workspace.ts` importing `v2CrossProject`
  cores); no Convex function calls another Convex function.

## Step 4 — gates (all green)

```bash
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner

npm test -- tests/v2/visual-state.test.ts tests/v2/projects-and-tenancy.test.ts
#  ✓ tests/v2/projects-and-tenancy.test.ts (4 tests) 52ms
#  ✓ tests/v2/visual-state.test.ts (10 tests) 104ms
#  Test Files  2 passed (2)
#       Tests  14 passed (14)
# (stderr noise only: convex-test "should not directly call other Convex
#  functions" warnings; same pre-existing harness chatter as R2.)

npm test
#  ✓ tests/v2/source-parity.test.ts (1 test) 21ms
#  ✓ tests/room-identity.test.ts (2 tests) 1ms
#  ✓ tests/ai-novelty.test.ts (2 tests) 1ms
#  ✓ tests/attachments.test.ts (3 tests) 2ms
#  ✓ tests/gauntlet-r1-backend.test.ts (45 tests) 9ms
#  ✓ tests/v2/projects-and-tenancy.test.ts (4 tests) 85ms
#  ✓ tests/v2/karen-mapping.test.ts (4 tests) 69ms
#  ✓ tests/mentions.test.ts (5 tests) 120ms
#  ✓ tests/v2/history-reconciliation.test.ts (3 tests) 120ms
#  ✓ tests/v2/visual-state.test.ts (10 tests) 175ms
#  ✓ tests/v2/routing-and-access.test.ts (11 tests) 190ms
#  Test Files  11 passed (11)
#       Tests  90 passed (90)

npx tsc --noEmit -p tsconfig.json
# (no output) exit 0

head -1 .env.local
# # Deployment used by `npx convex dev`
npx convex dev --once
# ▌ Developing against deployment:
# ▌ [Development] patrik-matheson:corner:dev/corner-v2-rehearsal-20260905
# ✔ Added table indexes:
#   [+] agentEvents.by_run_event   runId, eventId, _creationTime
#   [+] agentEvents.by_run_seq   runId, seq, _creationTime
#   [+] artifacts.by_legacy_file   legacyFileId, _creationTime
#   [+] artifacts.by_previous   previousArtifactId, _creationTime
#   [+] artifacts.by_thread   threadId, _creationTime
#   [+] checklistItems.by_checklist   checklistId, _creationTime
#   [+] checklistItems.by_pin   pinId, _creationTime
#   [+] checklists.by_thread_status   threadId, status, _creationTime
#   [+] pins.by_artifact_version   artifactId, artifactVersion, _creationTime
#   [+] pins.by_tab   tabId, _creationTime
#   [+] pins.by_thread   threadId, _creationTime
#   [+] runs.by_status   status, _creationTime
#   [+] runs.by_thread_created   threadId, createdAt, _creationTime
#   [+] visualSessions.by_thread   threadId, _creationTime
#   [+] visualTabs.by_thread_position   threadId, position, _creationTime
#   [+] visualTabs.by_thread_state   threadId, state, _creationTime
# ✔ 00:01:23 Convex functions ready! (5.34s)

npm run parity:v2
# > node scripts/v2-schema-parity.mjs
# tables: 56/56 present
# functions: 291/291 present
```

First-try `convex dev --once`: no foreign-file type error, so no retry was
needed. No `npm run build` (per concurrency rules). No `index.lock`
collision.

Guard proof on the rehearsal deployment (thread id read via the allowed
`npx convex data threads --limit 1`; R2's report names no thread id):

```bash
npx convex run v2VisualWindow:getSession '{"threadId":"td719gdnfhnfev3a5m6k2s4hwd8dxkwm"}'
# ✖ Failed to run function "v2VisualWindow:getSession":
# Error: [Request ID: 9794c02b2ae28e7b] Server Error
# Uncaught Error: Not signed in
#     at requireViewer (../../convex/lib/viewer.ts:35:9)
#     at async requireWorkspaceMember (../../convex/lib/viewer.ts:106:11)
#     at async threadContext (../../convex/v2Visual.ts:34:24)
#     at async handler (../convex/v2VisualWindow.ts:38:32)
```

Correct: keyless CLI identity is rejected at the facade. No bypass added.

## Step 5 — commit

```bash
git add convex/v2Schema/visual.ts convex/v2Visual.ts convex/v2VisualWindow.ts tests/v2/visual-state.test.ts
git commit -m "feat: add shared v2 visual window state"
# [codex/corner-v2-integration 453baf7] feat: add shared v2 visual window state
#  4 files changed, 1701 insertions(+), 2 deletions(-)
git log --oneline -3 && git status
# 453baf7 feat: add shared v2 visual window state
# 1353ac0 feat: require reviewed legacy room mapping and link immutable history
# 49d2a5a feat: add v2 routing provenance and confirmed writes
#  M docs/superpowers/audits/2026-09-05-karen-reconciliation.json  (mapping worker's, unstaged)
```

Staged nothing outside the brief's list. No push (per hard rules).

## Deviations from the brief (4, all forced by gaps in the brief)

1. `pins` has no creator field in the brief's schema, so `"pins the viewer
   created"` cannot be checked; `removePin` enforces the checkable half
   (throws `"Pin is in a sent checklist"` for `sent`/`resolved`, hard-deletes
   the pin plus its open-checklist items otherwise) and ledgers the removal.
2. Added `listPins({ tabId })` to `v2Visual` (not the facade, whose
   signatures stay exactly as planned): test 5's "pins of version 1 are not
   returned for version 2" needs a pins read, and it returns the tab's pins
   for its *current* artifact version, ordinal order.
3. `sendChecklist` with no sendable pins throws `"No open pins to send"`;
   `startRun` creates `running` (the explicit start) while checklist runs are
   `queued`; unknown `afterEventId` in `listEvents` throws `"Event not
   found"` (fail closed, like routing). The brief is silent on all three.
4. `setReview`/`setTabPosition`/`markTabError`/`carryOn` do not ledger (they
   are UI position/mode/error-display writes, same class as the brief's
   no-ledger list); `appendEvent` side effects ledger only through the tab
   open they perform (`looking`) and the `ledger`-type payload.

## How tab positions stay stable through close/reopen/reorder

`position` is a permanent per-row number, never a computed rank: creation
takes max(position)+1 across ALL rows (open and closed), close flips `state`
without touching `position`, reopen keeps the row id but assigns a fresh
max+1 (so it lands at the end, visibly "new" without disturbing others), and
reorder only renumbers the open rows densely 0..n-1 while closed rows keep
their stale numbers out of the way. Worked example from the tests: open A
(pos 0), B (pos 1); close A (row stays pos 0, `closed`); session shows [B];
reopen A (same id, pos 2, session [B, A]); in a fresh three-tab session
[A0, B1, C2], `reorderTab(C, 0)` rewrites to C0, A1, B2 — dense, no gaps, no
row ever deleted.
