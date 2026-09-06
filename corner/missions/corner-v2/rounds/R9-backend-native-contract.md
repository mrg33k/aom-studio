# R9 — backend native contract: authenticated v2Native façade + fixture + contract tests + iOS stub docs

Worker: BUILDER, native plan Task 1 + "Shared native interfaces" block
(plan lines 69–249; Swift structs are the contract).
Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
`codex/corner-v2-integration`, base `ad31c07`. Commit for this round:
**`6d26920 feat: expose authenticated Corner v2 native contract`**
(8 files, +1790/−195). No push, per hard rules.

Pre-reads: `LOOP.md` (hard lines + WD-40), `rounds/R3-backend-routing.md`
(scoring rules, `routeCore`/`confirmProposalCore`), `rounds/R3-backend-visual.md`
(tab/artifact/pin/checklist cores), `rounds/R3-backend-mapping.md`
(`listThreadMessagesCore` read-through), core modules `v2Projects`,
`v2Threads`, `v2Routing`, `v2CrossProject`, `v2Ledger`, `v2Visual`,
`v2Workspace`, `v2VisualWindow`, `lib/viewer`.

## Step 0 — starting state

```bash
git log --oneline -5
# ad31c07 fix: close corner v2 desktop punch list (comp-match round)
# e439eb6 refactor: retire legacy corner mobile presentation
# 4129ce5 feat: move workspace settings and notifications into sidebar
# 64ddc48 feat: add durable corner visual window
# 3de9198 feat: unify projects and missions as conversations
git status --short   # (empty at start)
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner
ls convex/v2*.ts convex/contract/ tests/v2/ ios/
# convex/contract/: No such file or directory
# convex: v2CrossProject v2Inventory v2Ledger v2Mapping v2Migrations v2Projects
#   v2Routing v2Threads v2Types v2Visual v2VisualWindow v2Workspace
# ios/: ConvexClient.swift Package.swift.snippet README.md
# tests/v2/: history-reconciliation karen-mapping projects-and-tenancy
#   routing-and-access setup source-parity visual-state
```

Rehearsal deployment throughout; `neat-pony-216` never touched. No `npm run
build` (used `npx tsc` + `npx convex dev --once`). No file owned by the
cutover worker touched (`v2Compatibility`, `v2Migrations`, `scripts/v2-verify`,
`tests/v2/cutover`).

## Step 1 — fixture + failing tests

Wrote `convex/contract/v2.native.fixture.json` (full text pasted at the end of
this report): one `general` + one `standard` project (Aster, one `live`
mission "Ship home page"), user + labeled-agent events, all 7 `ThreadBlock`
cases, tabs `tab-pdf-1` + `tab-email-1`, all 3 `PinAnchor` cases, one
`RouteDecision`, one `LedgerItem`, one confirmation. Dates are ISO-8601.

Wrote `convex/contract/v2.native.contract.test.ts` (plan Step-1 test plus a
per-DTO schema table, no library) and `tests/v2/native-contract.test.ts`
(edge-runtime, `tests/v2/setup.ts` seed: General + Aster + mission + user text
+ agent question/steps/artifact blocks + 1 pdf artifact + 1 open tab @ page 2
+ 1 pin + 1 route decision + 1 ledger row; shape-asserts every `v2Native.*`
return against the fixture; Ben rejected).

First run (required failure):

```bash
npm test -- convex/contract/v2.native.contract.test.ts tests/v2/native-contract.test.ts
#  ✓ convex/contract/v2.native.contract.test.ts (9 tests) 5ms
#  ❯ tests/v2/native-contract.test.ts (12 tests | 12 failed) 143ms
#  FAIL ... > workspaceTree returns the fixture WorkspaceSummary shape ...
#  Error: Could not find module for: "v2Native"
#  ... (same for all 12 tests)
#  Test Files  1 failed | 1 passed (2)
#       Tests  12 failed | 9 passed (21)
```

The contract file alone first printed `No test files found, exiting with
code 1`: vitest `include` was `src/**` + `tests/**`, so
`convex/contract/*.test.ts` never runs. Fixed by adding
`"convex/contract/**/*.test.ts"` to `vitest.config.ts` (one-line deviation;
without it the brief's own gate command silently skips the contract test).

## Step 2 — implement `convex/v2Native.ts` (new, ~700 lines)

Authenticated façade (viewer → `homeWorld`); no client user id anywhere.
Reuses exported cores: `routeCore`, `confirmProposalCore`, `threadPath`
(v2Routing), `confirmWriteCore` (v2CrossProject), `listThreadMessagesCore`
(v2Threads), `ensureSession`/`threadContext`/`openTabCore`/`closeTabCore`/
`artifactsForThreadCore`/`addPinCore`/`updatePinCore`/`sendChecklistCore`/
`setTabPositionCore`/`setReviewCore` (v2Visual). **Zero core-file edits were
needed**: `ensureGeneral`/`appendText`/`latest` semantics are mirrored inline
on the same tables/rows (same fields, same predicates) instead of cross-
function `api.*` calls, which the convex-test harness rejects and which would
have required more than the allowed one-line core edits.

Functions: `workspaceTree({})`, `threadForProject({projectId})`,
`threadForMission({missionId})`, `threadEvents({threadId, after?})`,
`send({threadId?, text, mentioning, preferredProjectId?})`,
`confirmProposal({decisionId})`, `visualTabs({visualSessionId})`,
`openVisualTab({kind, threadId, artifactId?, title, state})`,
`closeVisualTab({id})`, `artifacts({threadId})`,
`submitReview({artifactId, pins})`, `ledger({workspaceId, after?})`,
`pendingConfirmations({})`, `confirmCrossProjectWrite({id})`.

`workspaceTree`/`threadForProject`/`threadForMission` are **mutations**
(queries cannot write; they create General / the thread / the visual session
when absent). `title` in `openVisualTab` keeps API parity but rows stay
server-titled, like the core. `submitReview` sends every open unsent pin on
the tab (superset), like `sendChecklistCore`.

After implementation:

```bash
npm test -- convex/contract/v2.native.contract.test.ts tests/v2/native-contract.test.ts
#  ✓ convex/contract/v2.native.contract.test.ts (9 tests) 5ms
#  ✓ tests/v2/native-contract.test.ts (12 tests) 221ms
#  Test Files  2 passed (2)
#       Tests  21 passed (21)
```

Two test-side fixes on the way (façade untouched): the seed sets tab page 2
via `setTabPosition` so the live pdf tab carries `state.page` like the
fixture; `assertShape` accepts null both ways for exactly the Swift-Optional
leaves (`missionID mission agentLabel artifactID sourceURL supersedesID`) and
checks block shapes against the fixture's block-shape set (entries regroup
blocks per row, so whole-event equality is the wrong assertion).

## Step 3 — this repo's iOS stub docs

`ios/ConvexClient.swift`: legacy `CornerAPI`/`RoomDTO`/`MessageDTO` surface
replaced with the v2 DTO list (`ProjectKind` … `CrossProjectWriteConfirmation`,
tagged `ThreadBlock`/`PinAnchor` wire shapes in comments) plus the 12-method
`CornerV2API` protocol and "see mrg33k/aom-studio/ios-native for the real
client". No runnable implementation left in this repo.
`ios/README.md`: external checkout path
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/ios-native`,
baseline `924ee7b`, contract test command
`npm test -- convex/contract/v2.native.contract.test.ts tests/v2/native-contract.test.ts`.

## Step 4 — gates (all green)

```bash
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner

npm test -- convex/contract/v2.native.contract.test.ts tests/v2/native-contract.test.ts
#  Test Files  2 passed (2)
#       Tests  21 passed (21)

npm test
#  Test Files  13 passed (13)
#       Tests  111 passed (111)
# (stderr "should not directly call other Convex functions" is pre-existing
# harness chatter: routing-and-access alone prints it 75x on the base tree.)

npx tsc --noEmit -p tsconfig.json          # exit 0
npx tsc --noEmit -p convex/tsconfig.json   # exit 0 (needed resolveJsonModule,
                                           # added one line for the fixture import)

npx convex dev --once
# ▌ [Development] patrik-matheson:corner:dev/corner-v2-rehearsal-20260905
# ✔ 04:08:48 Convex functions ready! (6.24s)

npm run parity:v2
# tables: 56/56 present
# functions: 291/291 present

npx convex run v2Native:workspaceTree '{}'
# ✖ Failed to run function "v2Native:workspaceTree":
# Error: [Request ID: eab0e071dc93256f] Server Error
# Uncaught Error: Not signed in
#     at requireViewer (../../convex/lib/viewer.ts:35:9)
#     at async handler (../convex/v2Native.ts:336:15)
```

No `index.lock` collision. No foreign-file type error (mine was fixed in-file;
see deviations).

## Step 5 — commit

```bash
git add convex/v2Native.ts convex/contract ios/ConvexClient.swift ios/README.md tests/v2/native-contract.test.ts vitest.config.ts convex/tsconfig.json
git commit -m "feat: expose authenticated Corner v2 native contract"
# [codex/corner-v2-integration 6d26920] feat: expose authenticated Corner v2 native contract
#  8 files changed, 1790 insertions(+), 195 deletions(-)
git log --oneline -3 && git status
# 6d26920 feat: expose authenticated Corner v2 native contract
# ad31c07 fix: close corner v2 desktop punch list (comp-match round)
# e439eb6 refactor: retire legacy corner mobile presentation
# (clean)
```

`vitest.config.ts` + `convex/tsconfig.json` are staged although absent from the
brief's pathspec: both one-liners are required for the brief's own gate
commands to cover the new files. No push, per hard rules.

## Mapping tables (façade behaviour)

Thread author: legacy `agentSlug` set (or `role` present and ≠ `user`) →
`agent`; legacy `role === "user"` (or unslugged, roleless user row) → `user`;
blocks `authorType user` → `user`, else `agent`. Agent label: `agents.by_slug`
title, else capitalized slug (`research` → `Research`), else `userName`, else
`"Agent"`; `null` for user events.

| `threadBlocks.kind` / legacy | native `ThreadEvent.blocks` |
|---|---|
| legacy message | `{type text, value}` + `{type artifact, artifactIDs: ["legacy:<messageId>:<i>"]}` iff attachments |
| `text` | `{type text, value: payload.text}` |
| `question` | `{type question, id, text, options: [{id,title,detail,recommended}]}` (missing option fields default to `""`/`option-<i>`/`false`) |
| `steps` | `{type steps, steps: [{id,label,state}]}` from `payload.steps ?? payload.items` |
| `file` / `artifact` | `{type artifact, artifactIDs: [...]}` |
| `routing` | `{type text, value: "Routed to <path>."}` |
| `system` + `crossProject` | `{type text, value: summary ?? "<action>: <change>"}` |
| other `system` | `{type text, value: summary ?? text ?? "System update."}` |

| core tab/artifact kind | native `kind` | back (`openVisualTab`) |
|---|---|---|
| `document` | `document` | `document` |
| `file` | `genericFile` | `genericFile` → `file` |
| `site` | `web` | `web` → `site` |
| `pdf deck photo video youtube code email tracker` | as-is | as-is |
| unknown string | — (throws `Unsupported tab kind`) | — |

Tool tabs (`email`/`tracker` without `artifactId`) take `state.emailID` /
`state.trackerID` / `state.itemId` as the item; `artifactId: "legacy:…"`
materialises through the visual core like the desktop façade.

| native anchor | visual pin fields |
|---|---|
| `point(page?,x,y)` | `{page?, xPct: x, yPct: y}` |
| `time(seconds,x?,y?)` | `{timecodeMs: seconds*1000, xPct?, yPct?}` |
| `line(number)` | `{codeLine: number}` |

`submitReview` upserts (id set → `updatePinCore` body + `done`/`open`, else
`addPinCore` on the artifact's open tab, opening one if needed), then
`sendChecklistCore`; returns `{checklistId, runId, blockId}`.

`send`: `threadId` set → append + confidence-1 decision for that thread
(`Already in <path>.`). Otherwise `routeCore` on the home world with
`brain = mentioning[0]`; `preferredProjectId` rides an explicit
`"<Project>:"` prefix (routing rule 2, stored text stays original);
`existing` appends the text, `clarification`/`proposal` append nothing.
`destinationThreadID` is `""` for proposals (no thread yet) and the top
alternative for clarifications; project proposals carry a pending placeholder
project (`id: ""`, `threadID: ""`).

| ledger row | `LedgerItem` | confirmation row | `CrossProjectWriteConfirmation` |
|---|---|---|---|
| `what` | `description` | `action` + `change` | `summary: "<action>: <change>"` |
| `who` | `actor` | `expiresAt` (ms) | `expiresAt` (ISO) |
| `subjects` | `subjectIDs` | `sourceThreadId` / `targetThreadId` | `sourceThreadID` / `destinationThreadID` |
| `at` | `createdAt` | — | — |
| `supersedes` | `supersedesID` | — | — |

`ledger` mirrors `v2Ledger.latest` (newest first, 50 rows, 7-day default
window, superseded rows dropped, `after` = exclusive ISO cursor, invalid
falls back to the default window). `pendingConfirmations` lists the viewer's
unexpired, unconsumed confirmations oldest-first.

## Deviations (all forced by repo reality or the plan's own gaps)

1. `vitest.config.ts` + `convex/tsconfig.json` one-liners (see Steps 1/4).
2. Three tree/thread reads are mutations (queries cannot create rows).
3. Fixture `thread` carries an `events` mirror so the plan-verbatim test runs
   unmodified; the live `Thread` DTO has no `events` key (Swift ignores
   unknown keys; the live shape test strips it before comparing).
4. Text blocks use the brief's `{"type":"text","value"}` spelling, not the
   plan Task-3 snippet's `"text"` key.
5. `workspaceTree` skips orphan rows missing a thread instead of throwing
   (direct `threadFor*`/`send` hits still throw `"Thread not found"`).
6. `needsAttention` = desktop `needsYou` (newest block is an agent question);
   `tintHex` defaults to `#3B82F6` (projects store optional `tint`).
7. Contract-test callbacks carry `: any` annotations for strict TS; the four
   plan assertions are otherwise untouched.

## What the native client needs that the core cannot provide yet

1. **`RouteDecision` has no `decisionId`.** After `needsCreationConfirmation:
   true` the client cannot call `confirmProposal` — the id lives only in the
   routing core. Either surface it on the DTO or add a native-scoped
   proposal handle.
2. **Tab `agentLabel` is always `null`.** Visual rows record only
   `openedBy: user|agent`, never which agent; agent-opened email tabs (like
   fixture `tab-email-1`) cannot be labeled from core data.
3. **`openVisualTab.title` is ignored.** Titles stay server-derived; a client
   sketch title for a not-yet-materialised artifact has nowhere to live.
4. **`submitReview` returns checklist linkage, not pin ids.** The client cannot
   map its temp pin ids to server ids for later updates.
5. **`Artifact.sourceURL` is `null` unless `src`/`liveUrl` is set.** No storage
   URL resolution happens in the façade.
6. **No `subscribeThread` primitive in scope.** The client polls
   `threadEvents({after})` with the ISO cursor; true push stays external work.

## Fixture (`convex/contract/v2.native.fixture.json`, pasted verbatim)

```json
{
  "workspace": {
    "id": "world-karen-1",
    "name": "karens-world",
    "generalProjectID": "proj-general-1",
    "projects": [
      {
        "id": "proj-general-1",
        "workspaceID": "world-karen-1",
        "name": "General",
        "kind": "general",
        "tintHex": "#8B5CF6",
        "needsAttention": false,
        "threadID": "thread-general-1",
        "missions": []
      },
      {
        "id": "proj-aster-1",
        "workspaceID": "world-karen-1",
        "name": "Aster",
        "kind": "standard",
        "tintHex": "#5B9BFF",
        "needsAttention": true,
        "threadID": "thread-aster-1",
        "missions": [
          {
            "id": "mission-ship-1",
            "projectID": "proj-aster-1",
            "title": "Ship home page",
            "status": "live",
            "threadID": "thread-ship-1"
          }
        ]
      }
    ]
  },
  "thread": {
    "id": "thread-aster-1",
    "ownerType": "project",
    "projectID": "proj-aster-1",
    "missionID": null,
    "visualSessionID": "session-aster-1",
    "events": "<mirror of top-level events, pasted once below>"
  },
  "events": [
    {
      "id": "event-user-1",
      "threadID": "thread-aster-1",
      "author": "user",
      "agentLabel": null,
      "blocks": [{ "type": "text", "value": "Draft the brief for Aster." }],
      "createdAt": "2026-09-05T10:00:00.000Z"
    },
    {
      "id": "event-agent-1",
      "threadID": "thread-aster-1",
      "author": "agent",
      "agentLabel": "Research",
      "blocks": [
        { "type": "text", "value": "I found three competitors." },
        {
          "type": "question",
          "id": "audience",
          "text": "Who is it for?",
          "options": [
            { "id": "buyers", "title": "Buyers", "detail": "Range and timing", "recommended": true },
            { "id": "renters", "title": "Renters", "detail": "Deposit and term", "recommended": false }
          ]
        }
      ],
      "createdAt": "2026-09-05T10:01:00.000Z"
    },
    {
      "id": "event-agent-2",
      "threadID": "thread-aster-1",
      "author": "agent",
      "agentLabel": "Research",
      "blocks": [
        {
          "type": "steps",
          "steps": [
            { "id": "step-1", "label": "Gather sources", "state": "done" },
            { "id": "step-2", "label": "Draft brief", "state": "working" }
          ]
        },
        { "type": "success", "text": "Gathered three sources.", "stepIndex": 0 },
        {
          "type": "snag",
          "text": "The brief needs a call date.",
          "options": [
            { "id": "pick-date", "title": "Pick a date", "detail": "Choose the call date", "recommended": true }
          ]
        }
      ],
      "createdAt": "2026-09-05T10:02:00.000Z"
    },
    {
      "id": "event-user-2",
      "threadID": "thread-aster-1",
      "author": "user",
      "agentLabel": null,
      "blocks": [
        { "type": "artifact", "artifactIDs": ["artifact-1"] },
        { "type": "checklist", "pinIDs": ["pin-1", "pin-2"] }
      ],
      "createdAt": "2026-09-05T10:03:00.000Z"
    }
  ],
  "visualTabs": [
    { "id": "tab-pdf-1", "kind": "pdf", "artifactID": "artifact-1", "openedBy": "user", "state": { "page": "2", "reviewing": "true" } },
    { "id": "tab-email-1", "kind": "email", "artifactID": null, "openedBy": "agent", "agentLabel": "Research", "state": { "reviewing": "false" } }
  ],
  "artifacts": [
    { "id": "artifact-1", "threadID": "thread-aster-1", "title": "Launch brief", "kind": "pdf", "version": 1, "sourceURL": null, "metadata": { "pages": "3", "mime": "application/pdf" } }
  ],
  "pins": [
    { "id": "pin-1", "anchor": { "type": "point", "page": 2, "x": 10.5, "y": 20.25 }, "text": "Raise headline", "isDone": false },
    { "id": "pin-2", "anchor": { "type": "time", "seconds": 2.0, "x": null, "y": null }, "text": "Trim the pause", "isDone": false },
    { "id": "pin-3", "anchor": { "type": "line", "number": 42 }, "text": "Rename this symbol", "isDone": true }
  ],
  "route": {
    "destinationThreadID": "thread-aster-1",
    "project": {
      "id": "proj-aster-1",
      "workspaceID": "world-karen-1",
      "name": "Aster",
      "kind": "standard",
      "tintHex": "#5B9BFF",
      "needsAttention": true,
      "threadID": "thread-aster-1",
      "missions": [
        {
          "id": "mission-ship-1",
          "projectID": "proj-aster-1",
          "title": "Ship home page",
          "status": "live",
          "threadID": "thread-ship-1"
        }
      ]
    },
    "mission": {
      "id": "mission-ship-1",
      "projectID": "proj-aster-1",
      "title": "Ship home page",
      "status": "live",
      "threadID": "thread-ship-1"
    },
    "confidence": 0.78,
    "alternatives": ["thread-north-1"],
    "reason": "Strongest match for Aster > Ship home page.",
    "needsClarification": false,
    "needsCreationConfirmation": false,
    "actor": "karen",
    "createdAt": "2026-09-05T10:06:00.000Z"
  },
  "ledger": [
    { "id": "ledger-1", "workspaceID": "world-karen-1", "kind": "did", "description": "Scoped a ledger row.", "actor": "karen", "surface": "corner:v2", "subjectIDs": ["aster"], "createdAt": "2026-09-05T10:07:00.000Z", "supersedesID": null }
  ],
  "confirmation": {
    "id": "confirm-1",
    "sourceThreadID": "thread-aster-1",
    "destinationThreadID": "thread-north-1",
    "summary": "update brief: Set primary to #5B9BFF",
    "expiresAt": "2026-09-05T10:16:00.000Z"
  }
}
```

(`thread.events` mirrors `events` exactly; only pasted once. The committed
JSON holds both keys plus the full `route.project`/`route.mission` bodies.)
