# Brief R9-backend-native-contract — the authenticated native façade that serves the exact Swift DTO shapes, plus the shared fixture and contract test (native plan Task 1)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40), `rounds/R3-backend-routing.md`, `rounds/R3-backend-visual.md`,
`rounds/R3-backend-mapping.md` (what the core modules expose). Write your report to
`rounds/R9-backend-native-contract.md`: every command with its output.

You are a headless worker, the BUILDER for native plan Task 1. Nobody will answer questions.

Plan: Task 1 and the "Shared native interfaces" block of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-native-ios.md`
(lines 69-249). The Swift structs there are the contract: your JSON must decode into them
field-for-field.

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`, HEAD `ad31c07` or later. `.env.local` → rehearsal deployment
  `dev:adjoining-tiger-87`; `grep CONVEX_DEPLOYMENT .env.local` before any `npx convex` command.
  Never touch `neat-pony-216`.
- Core modules (read them; they are the source of every field): `convex/v2Projects.ts`
  (`listNavigation`, `ensureGeneral`, `get`, `getMission`), `convex/v2Threads.ts`
  (`listThreadMessages`: legacy linked messages + `threadBlocks`), `convex/v2Routing.ts` (`route`,
  `confirmProposal`), `convex/v2CrossProject.ts`, `convex/v2Ledger.ts` (`latest`),
  `convex/v2Visual.ts` (`sessionStateCore`, `openTabCore`, `closeTabCore`, `artifactsForThread`,
  pins/checklists), `convex/v2Workspace.ts` + `convex/v2VisualWindow.ts` (the DESKTOP façades:
  same core, different field names; do not change them, do not make native call them).
- Another worker may be editing `convex/v2Compatibility.ts`, `convex/v2Migrations.ts`,
  `scripts/v2-verify.mjs`, `tests/v2/cutover.test.ts` (the cutover round). You never touch those.
  Your files: `convex/v2Native.ts` (new), `convex/contract/v2.native.fixture.json` (new),
  `convex/contract/v2.native.contract.test.ts` (new), `tests/v2/native-contract.test.ts` (new),
  `ios/ConvexClient.swift` + `ios/README.md` (this repo's stub docs, per the plan's file map).
  Concurrency: never `npm run build` (use `npx tsc --noEmit -p tsconfig.json` + `npx convex dev
  --once`); on a type error in a file you do not own wait 60 s and retry up to 8 times; on
  `index.lock` wait 10 s, retry up to 5; never `git add` a path you did not create or edit.

## Step 1 — fixture + failing tests

`convex/contract/v2.native.fixture.json`: a hand-written example of every DTO in the plan's
Swift block, exactly as the façade will return it: `{ workspace: WorkspaceSummary, thread: Thread,
events: ThreadEvent[], visualTabs: VisualWindowTab[], artifacts: Artifact[], pins: ReviewPin[],
route: RouteDecision, ledger: LedgerItem[], confirmation: CrossProjectWriteConfirmation }`. One
`general` project, one `standard` project with one mission, events by `user` and `agent` (with
`agentLabel`), blocks of every `ThreadBlock` case (tagged `{ "type": "text", "value": "..." }`,
`{ "type": "question", "id", "text", "options": [...] }`, `steps`, `success`, `snag`, `artifact`,
`checklist`), tabs `tab-pdf-1` and `tab-email-1`, pins with each `PinAnchor` case tagged
`{ "type": "point" | "time" | "line", ... }`. Dates as ISO-8601 strings.

`convex/contract/v2.native.contract.test.ts`: the plan's test verbatim (Step 1), plus one
assertion per DTO that every non-optional Swift field is present with the right JSON type (write a
tiny schema table in the test; no library).

`tests/v2/native-contract.test.ts` (`// @vitest-environment edge-runtime`, uses
`tests/v2/setup.ts`): seed Karen with General + a project + a mission + a few blocks + one artifact
+ one open tab + one pin + one route decision + one ledger row; then call every `v2Native.*`
function and assert its return deep-equals the SHAPE of the fixture (same keys, same JSON types,
tagged enums spelled exactly as in the fixture); Ben gets `"Not a member of this world"`.

Run both files; paste the failures.

## Step 2 — implement `convex/v2Native.ts`

Authenticated (viewer → `homeWorld`) façade with these functions, each returning the plan's DTO
JSON:

- `workspaceTree({})` → `WorkspaceSummary` `{ id, name, generalProjectID, projects: [{ id,
  workspaceID, name, kind: "standard" | "general", tintHex, needsAttention, threadID, missions: [{
  id, projectID, title, status, threadID }] }] }` (call `ensureGeneral` first so General always
  exists).
- `threadForProject({ projectId })`, `threadForMission({ missionId })` → `Thread` `{ id, ownerType,
  projectID, missionID, visualSessionID }` (visualSessionID = the `visualSessions` row id, creating
  it if absent, via the visual core).
- `threadEvents({ threadId, after? })` → `ThreadEvent[]`: map `listThreadMessages` output;
  legacy linked messages become `{ author: role user → "user" else "agent", agentLabel, blocks:
  [{ type: "text", value }] (+ `artifact` block when attachments exist) }`; `threadBlocks` map by
  kind (`text`→text, `question`→question, `steps`→steps, `file`/`artifact`→artifact,
  `routing`/`system`→text with the human sentence). `createdAt` ISO.
- `send({ threadId?, text, mentioning: string[], preferredProjectId? })` → `RouteDecision` `{
  destinationThreadID, project: ProjectSummary, mission: MissionSummary | null, confidence,
  alternatives: string[] (thread ids), reason, needsClarification, needsCreationConfirmation,
  actor, createdAt }`: when `threadId` is set it appends via `v2Threads.appendText` and returns a
  decision for that thread (confidence 1); otherwise it calls `v2Routing.route` and, for
  `existing`, appends the text into the destination; for `clarification`/`proposal` it appends
  nothing and sets the flags. `confirmProposal({ decisionId })` passes through.
- `visualTabs({ visualSessionId })` → `VisualWindowTab[]` `{ id, visualSessionID, threadID, kind
  (map `document`→document, `file`→genericFile, `site`→web, others as-is), artifactID, title,
  openedBy, agentLabel, state: { page, timecodeMs, codeLine, siteViewport, reviewing → strings },
  createdAt }`; `openVisualTab({ kind, threadId, artifactId?, title, state })` (kind map back:
  `web`→site, `genericFile`→file), `closeVisualTab({ id })`, `artifacts({ threadId })` →
  `Artifact[]` `{ id, threadID, title, kind, version, sourceURL, metadata: {strings} }`.
- `submitReview({ artifactId, pins: [{ id?, anchor, text, isDone }] })`: upserts pins on the
  artifact's open tab through the visual core, then `sendChecklist`; anchor mapping `point(page,x,y)`
  → `{ page, xPct, yPct }`, `time(seconds,x,y)` → `{ timecodeMs, xPct, yPct }`, `line(number)` →
  `{ codeLine }`.
- `ledger({ workspaceId, after? })` → `LedgerItem[]` `{ id, workspaceID, kind, description (= what),
  actor (= who), surface, subjectIDs (= subjects), createdAt (= at), supersedesID }` via
  `v2Ledger.latest`.
- `pendingConfirmations({})` → `CrossProjectWriteConfirmation[]` `{ id, sourceThreadID,
  destinationThreadID, summary: "<action>: <change>", expiresAt }`; `confirmCrossProjectWrite({
  id })` passes through to `v2CrossProject`.

No client-asserted user ids anywhere. Every function re-uses the core modules; if a core helper
is not exported, export it from its file with a one-line comment (that is the ONLY edit allowed in
a core file, and only in files not owned by the cutover worker).

## Step 3 — this repo's iOS stub docs

`ios/ConvexClient.swift`: replace the legacy `CornerAPI` comment block with the v2 DTO list and
"see mrg33k/aom-studio/ios-native for the real client". `ios/README.md`: the external checkout
path `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/ios-native`, baseline `924ee7b`,
the contract test command `npm test -- convex/contract/v2.native.contract.test.ts
tests/v2/native-contract.test.ts`.

## Step 4 — gates

```bash
grep CONVEX_DEPLOYMENT .env.local
npm test -- convex/contract/v2.native.contract.test.ts tests/v2/native-contract.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npx convex dev --once
npm run parity:v2
npx convex run v2Native:workspaceTree '{}'
```

The last must throw `Not signed in`. Paste everything.

## Step 5 — commit

```bash
git add convex/v2Native.ts convex/contract ios/ConvexClient.swift ios/README.md tests/v2/native-contract.test.ts
git commit -m "feat: expose authenticated Corner v2 native contract"
git log --oneline -3 && git status
```

## Report `rounds/R9-backend-native-contract.md`

Per step: commands + output; the fixture (paste it); the kind/anchor/block mapping tables;
deviations; anything the native client will need that the core cannot provide yet.

## Hard rules

Never edit `v2Workspace.ts`, `v2VisualWindow.ts`, `v2Compatibility.ts`, `v2Migrations.ts`,
`schema.ts`, `src/`, `e2e/`, `docs/superpowers/plans|specs`, `.env.local`. Never run against
`neat-pony-216`. Never accept a client user id. Never `git add -A`. Never push.
