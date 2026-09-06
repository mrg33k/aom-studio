# R10 — backend native gaps: six contract gaps closed, reads subscribable

Worker: BUILDER. Mission `corner:corner-v2`.
Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
`codex/corner-v2-integration`, base `6d26920`. Commit for this round:
**`3bea983 feat: close native contract gaps and make v2 reads subscribable`**
(9 files, +468/−69). No push, per hard rules.

Pre-reads: `LOOP.md` (hard lines + WD-40), `rounds/R9-backend-native-contract.md`
(Deviations + "What the native client needs…", six numbered gaps).

## Step 0 — starting state

```bash
git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD && grep CONVEX_DEPLOYMENT .env.local
# codex/corner-v2-integration
# 6d26920
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner
git status --short   # (empty at start)
```

Rehearsal deployment throughout; `neat-pony-216` never touched. No `npm run
build` (used `npx tsc` + `npx convex dev --once`). None of the cutover
worker's files touched (`v2Compatibility`, `v2Migrations`, `scripts/v2-verify`,
`tests/v2/cutover`, `compat-fixtures`, `surface-artifacts`, `.gitignore`).
`src/`, `e2e/`, `schema.ts` untouched — the one schema addition went through
`convex/v2Schema/visual.ts` as required.

## Step 1 — failing tests first (all six gaps)

Added 6 tests to `tests/v2/native-contract.test.ts`, 1 to
`tests/v2/routing-and-access.test.ts` (add-only), 1 to
`tests/v2/visual-state.test.ts` (add-only), and added `"decisionId":
"route-decision-1"` to the fixture route. First run after the test-only change:

```bash
npm test -- tests/v2/native-contract.test.ts tests/v2/routing-and-access.test.ts tests/v2/visual-state.test.ts
#  ❯ tests/v2/visual-state.test.ts (11 tests | 1 failed)
#    × looking events record the run brain and surface the agent label
#  ❯ tests/v2/routing-and-access.test.ts (12 tests | 1 failed)
#    × routeGlobalInput carries decisionId on every variant; proposalId equals decisionId
#  ❯ tests/v2/native-contract.test.ts (18 tests | 8 failed)
#    × send to an open thread appends and returns the fixture RouteDecision shape
#    × send without a thread routes globally and honors a preferred project
#    × unscoped send returns a decisionId that confirmProposal accepts and creates the General mission
#    × labels agent-opened tabs from the looking run's brain
#    × openVisualTab keeps the client title for legacy and tool tabs, artifact title wins
#    × submitReview returns pin ids keyed by clientId
#    × artifacts resolve sourceURL from storage when src/liveUrl are absent
#    × reads are subscribable queries: null before ensure, DTOs after ensureWorkspace
#  Test Files  3 failed (3)
#       Tests  10 failed | 31 passed (41)
```

(The two pre-existing route-shape tests fail on the new fixture `decisionId`
key until the implementation lands; every other failure is its gap's new
test.)

## Gap 1 — `RouteDecision.decisionId`

Failing tests: `routeGlobalInput carries decisionId on every variant`
(desktop, all four variants, `proposalId === decisionId` for both proposal
kinds, plus `confirmProposedHome({ proposalId })` still creates); `unscoped
send returns a decisionId that confirmProposal accepts…` (native `send`
one-off → `needsCreationConfirmation: true` + `decisionId` →
`confirmProposal` creates the General mission, verified via
`v2Projects.listNavigation`).

Changes:

- `convex/v2Workspace.ts:40,48,55,62` — `decisionId: v.string()` on all four
  `desktopDecision` variants (additive field).
- `convex/v2Workspace.ts:94,107,123` — `toDesktopDecision` returns
  `decisionId: String(internal.decisionId)` on confident/ambiguous, and
  `decisionId: proposalId` (same value) on both proposal kinds.
- `convex/v2Native.ts:532,564,581,595` — `routeDecisionFromInternal` returns
  `decisionId` on the existing/clarification/mission-proposal/project-proposal
  branches.
- `convex/v2Native.ts:655` — thread-scoped `send` inserts the same
  `routeDecisions` row the routing core would store (destination `existing`,
  confidence 1) minus the routing block, so the decision carries an id
  without appending a second event (the +1-event assertion still holds).
- `convex/contract/v2.native.fixture.json` — route gains `"decisionId":
  "route-decision-1"`.

Side effect (intended, reported): thread-scoped native sends now leave a
block-less `routeDecisions` row, so the desktop `getConversationSurface`
banner can surface for that thread with `moveBlockId: null` (the banner
already handles a null block id; Move stays hidden).

## Gap 2 — tab `agentLabel`

Failing tests: `looking events record the run brain and surface the agent
label` (row `openedByAgent === "research"`, desktop session tab
`agentLabel === "Research"`, user tab `null`); `labels agent-opened tabs from
the looking run's brain` (native `visualTabs` maps it).

Changes:

- `convex/v2Schema/visual.ts:50` — `visualTabs` gains `openedByAgent:
  v.optional(v.string())`, no index change.
- `convex/v2Visual.ts:368,371` — `openTabCore` takes `openedByAgent`, kept
  only when `openedBy === "agent"`; `:408,416,433` — recorded on create and
  patched onto a re-opened/re-activated same-target row.
- `convex/v2Visual.ts:988` — the `looking` event path passes the run's
  `brain` (`...(run.brain ? { openedByAgent: run.brain } : {})`).
- `convex/v2Visual.ts:91,127` — `sessionStateCore` (desktop
  `VisualWindowTab`) gains `agentLabel` via `agents.by_slug` title, else
  prettified slug, else `null`.
- `convex/v2Native.ts:307` — `nativeTabFor` resolves the same label for the
  native tab.

## Gap 3 — `openVisualTab.title`

Failing test: `openVisualTab keeps the client title for legacy and tool tabs,
artifact title wins` (legacy `legacy:<fileId>` + `"My sketch"`, tool email +
`"Invoice question"`, artifact + `"Wrong title"` → `"Launch brief"`).

Changes:

- `convex/v2Visual.ts:368` — `openTabCore` takes `title?`; artifact targets
  keep the artifact title, legacy refs and tool tabs store the
  client-supplied title when given (fallbacks unchanged).
- `convex/v2Native.ts:750` — `openVisualTab` passes `title: a.title`
  through (the core decides per target kind).

## Gap 4 — `submitReview` returns pin ids

Failing tests: `submitReview returns pin ids keyed by clientId` (new);
updated the pre-existing upsert test's key assertion
(`["blockId","checklistId","runId"]` → `["checklistId","pins"]`).

Changes (`convex/v2Native.ts:802,826,844,857`):

- Args accept `clientId: v.optional(v.string())` per pin.
- Returns `{ checklistId, pins: [{ clientId?, id }] }` in checklist position
  order, covering every pin in the sent checklist (submitted pins carry their
  `clientId`; swept-in pre-existing open pins appear with server `id` only).
  `runId`/`blockId` no longer returned.

## Gap 5 — `Artifact.sourceURL` from storage

Failing test: `artifacts resolve sourceURL from storage when
src/liveUrl are absent` (stored blob via `t.run(ctx =>
ctx.storage.store(new Blob([...])))`, asserts a string URL on both the native
`artifacts` and the desktop `artifactsForThread`, and `null` for the
src-less Live-brief row).

Changes:

- `convex/v2Visual.ts:288` — `artifactsForThreadCore` sets `row.sourceURL =
  row.src ?? row.liveUrl ?? (storageId ? getUrl(storageId) : null) ?? null`
  on every row (real + synthesised legacy), so both reads share it.
- `convex/v2Native.ts:790` — native `artifacts` maps `sourceURL:
  r.sourceURL ?? r.src ?? r.liveUrl ?? null`.

## Gap 6 — subscribable reads

Failing test: `reads are subscribable queries: null before ensure, DTOs after
ensureWorkspace` (fresh user: `workspaceTree` → `null`; `ensureWorkspace`
→ tree with one General; `threadForProject` stable session; `null` again
after the thread row is deleted). Updated the three pre-existing read tests
from `.mutation` to `.query`, and `seedNative` now calls `ensureWorkspace`
once (mirroring the client) so mission threads carry sessions.

Changes (`convex/v2Native.ts:341,414,424,442`):

- `ensureWorkspace({})` mutation: `ensureGeneralInline` + `ensureSession`
  for every project and mission thread in the caller's workspace; returns
  `{ workspaceId, generalProjectId, generalThreadId }`.
- `workspaceTree({})`, `threadForProject`, `threadForMission` are QUERIES:
  DTO when the rows (thread + visual session) exist, `null` (typed) when the
  workspace was never ensured. Access errors are unchanged (`requireProjectAccess`
  still throws; missing mission still throws `"Mission not found"`).
- `threadEvents` stays a query and is subscribable as-is. Push primitive
  documented in the code header (`v2Native.ts:27`) and in `ios/README.md`
  (new "Subscribing" section: ensure once → subscribe to the queries;
  Convex reactive queries re-read on every commit; `after` cursor pages).

## Step 2 — gates (all green)

```bash
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner

npm test -- tests/v2/native-contract.test.ts convex/contract/v2.native.contract.test.ts tests/v2/routing-and-access.test.ts tests/v2/visual-state.test.ts
#  Test Files  4 passed (4)
#       Tests  50 passed (50)

npm test
#  Test Files  15 passed (15)
#       Tests  126 passed (126)
#       Errors  2 errors
# (the 2 unhandled errors are `_scheduled_functions` writes from the CUTOVER
# worker's in-progress scheduler tests — `tests/v2/cutover.test.ts` /
# `surface-artifacts.test.ts` reproduce them alone, 7 passed / 2 errors, with
# none of my files involved. All 126 tests pass.)

npx tsc --noEmit -p tsconfig.json          # exit 0

npx convex dev --once
# (first two attempts failed on a FOREIGN type error: the cutover worker's
# uncommitted convex/v2Mapping.ts:96,174 dropped `: any` on two `(q)` params.
# Waited 60 s per the brief, retried; third attempt after their fix:)
# ✔ 07:09:24 Convex functions ready! (5.36s)

npm run parity:v2
# tables: 56/56 present
# functions: 291/291 present
```

Desktop unchanged (additive `decisionId`/`agentLabel` only), but per the brief:

```bash
npx playwright test --grep "global input shows|Visual Window opens ordered"
#   ✓  1 [desktop] › e2e/visual.spec.ts › global input shows a confident destination and Move action (2.4s)
#   ✓  2 [desktop] › e2e/visual.spec.ts › Visual Window opens ordered tabs without replacing prior tabs (4.4s)
#   2 passed (8.5s)
```

`npm run e2e` full suite not run (not my gate; desktop unchanged).

## Step 3 — commit

```bash
git add convex/v2Native.ts convex/v2Routing.ts convex/v2Visual.ts convex/v2Workspace.ts convex/v2Schema/visual.ts convex/contract/v2.native.fixture.json ios/README.md tests/v2/native-contract.test.ts tests/v2/routing-and-access.test.ts tests/v2/visual-state.test.ts
git commit -m "feat: close native contract gaps and make v2 reads subscribable"
# [codex/corner-v2-integration 3bea983] feat: close native contract gaps and make v2 reads subscribable
#  9 files changed, 468 insertions(+), 69 deletions(-)
git log --oneline -3 && git status
# 3bea983 feat: close native contract gaps and make v2 reads subscribable
# 6d26920 feat: expose authenticated Corner v2 native contract
# ad31c07 fix: close corner v2 desktop punch list (comp-match round)
# (only the cutover worker's in-progress paths remain dirty: convex/messages.ts,
# convex/v2Mapping.ts, convex/v2Migrations.ts, scripts/v2-verify.mjs, plus
# untracked convex/v2Compatibility.ts and tests/v2/{compat-fixtures,cutover,
# surface-artifacts}.test.ts — never staged, never touched.)
```

(`convex/v2Routing.ts` was in the pathspec but needed no edit — `routeCore`
already returns `decisionId` on every branch — so the commit holds 9 files.
Never `git add -A`, never pushed.)

## Deviations

1. `ensureWorkspace` ensures sessions for ALL project + mission threads in
   the home workspace, not just "the two threads" — the brief's count only
   fits the R9 seed (General + Aster); a sweep covers fresh and populated
   workspaces identically, same idempotent semantics.
2. `threadForMission` still throws `"Mission not found"` for a nonexistent
   mission id (invalid id, not "never ensured"); `null` is reserved for a
   missing thread/session row.
3. `submitReview` drops `runId`/`blockId` from its return per the brief's
   exact `{ checklistId, pins }` shape; the pre-existing test was updated.
4. `ios/ConvexClient.swift` NOT updated (not in my pathspec): Swift
   `RouteDecision` still lacks `decisionId`, `submitReview` still declares
   the old return, and the protocol still implies mutation-style thread
   reads. The external `ios-native` checkout needs a matching pass.
5. `convex/contract/v2.native.contract.test.ts` NOT edited (not in my
   pathspec): it still passes as-is (extra fixture/live keys are allowed),
   but it does not yet assert `decisionId` on the route DTO.
6. Desktop `getConversationSurface` routing banner untouched (brief scoped
   decisionId to `routeGlobalInput` variants); native thread-scoped sends
   now leave a block-less decision row, so that banner can appear with
   `moveBlockId: null` (rendered without the Move action).
