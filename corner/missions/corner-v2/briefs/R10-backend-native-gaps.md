# Brief R10-backend-native-gaps — close the six contract gaps the native façade round found, and make every read subscribable

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40) and `rounds/R9-backend-native-contract.md` ("Deviations" and
"What the native client needs that the core cannot provide yet"). Write your report to
`rounds/R10-backend-native-gaps.md`: every command with its output.

You are a headless worker, the BUILDER. Nobody will answer questions.

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`, HEAD `6d26920` or later. `.env.local` → rehearsal
  `dev:adjoining-tiger-87`; `grep CONVEX_DEPLOYMENT .env.local` before any `npx convex`. Never
  touch `neat-pony-216`.
- A CUTOVER worker may be running in this worktree editing `convex/v2Compatibility.ts`,
  `convex/v2Migrations.ts`, `scripts/v2-verify.mjs`, `tests/v2/cutover.test.ts`,
  `tests/v2/compat-fixtures.test.ts`, `tests/v2/surface-artifacts.test.ts`, `.gitignore`. You never
  touch those. Your files: `convex/v2Native.ts`, `convex/v2Routing.ts` (additive only),
  `convex/v2Visual.ts` (additive only), `convex/v2Workspace.ts` (additive only),
  `convex/contract/v2.native.fixture.json`, `tests/v2/native-contract.test.ts`,
  `tests/v2/routing-and-access.test.ts` (add tests only), `tests/v2/visual-state.test.ts` (add
  tests only). Concurrency rules as every backend brief: no `npm run build`; `npx tsc --noEmit -p
  tsconfig.json` + `npx convex dev --once`; foreign type error → wait 60 s, retry ≤ 8; `index.lock`
  → wait 10 s, retry ≤ 5; never `git add` a path you did not edit.

## The six gaps, test-first (add a failing test for each, then fix)

1. **`RouteDecision.decisionId`.** Add `decisionId` (the `routeDecisions` row id) to BOTH the
   desktop `RouteDecision` (`v2Workspace.routeGlobalInput` → every variant, so `proposalId` and
   `decisionId` are the same value for proposals) and the native `RouteDecision`. Native
   `confirmProposal({ decisionId })` already exists; test that a native `send` with an unscoped
   one-off returns `needsCreationConfirmation: true` + a `decisionId` that `confirmProposal`
   accepts and that creates the General mission. Update the fixture.
2. **Tab `agentLabel`.** `visualTabs` rows gain optional `openedByAgent: v.string()` (add to
   `convex/v2Schema/visual.ts`: additive optional field, no index change); `openTabCore` records
   the run's `brain` when `openedBy: "agent"` (the `looking` event path knows the run); desktop
   `VisualWindowTab` gains `agentLabel`; native maps it. Test through the `looking` event.
3. **`openVisualTab.title`.** When the target is a not-yet-materialised legacy ref or a tool tab,
   the client-supplied `title` is stored on the tab row (`title` already exists on `visualTabs`);
   for artifact targets the artifact title wins. Test both.
4. **`submitReview` returns pin ids.** Return `{ checklistId, pins: [{ clientId?, id }] }` so the
   client can map temp ids; accept an optional `clientId` per pin in the args.
5. **`Artifact.sourceURL` from storage.** In `artifactsForThread` (and the native `artifacts`),
   resolve `storageId` → `ctx.storage.getUrl(storageId)` when `src`/`liveUrl` are absent
   (queries may call `ctx.storage.getUrl`). Test with a stored blob in convex-test
   (`t.run(ctx => ctx.storage.store(new Blob([...])))`).
6. **Subscribable reads.** R9 made `workspaceTree`, `threadForProject`, `threadForMission`
   mutations because they create General/visualSessions on demand. Split them: `ensureWorkspace({})`
   (mutation: `ensureGeneral` + ensure the two threads' visual sessions for the caller's
   workspace) and `workspaceTree({})`, `threadForProject`, `threadForMission` as QUERIES that
   return the DTO when the rows exist and `null` (typed) when the workspace was never ensured.
   Native clients call `ensureWorkspace` once after sign-in, then subscribe to the queries.
   `threadEvents` stays a query and is subscribable as-is (Convex reactive queries are the push
   primitive; document that in the report and in `ios/README.md`). Update
   `tests/v2/native-contract.test.ts` accordingly.

## Gates

```bash
grep CONVEX_DEPLOYMENT .env.local
npm test -- tests/v2/native-contract.test.ts convex/contract/v2.native.contract.test.ts tests/v2/routing-and-access.test.ts tests/v2/visual-state.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npx convex dev --once
npm run parity:v2
```

All green; paste each. `npm run e2e` is NOT your gate (desktop unchanged), but if you changed the
desktop `RouteDecision`/`VisualWindowTab` shapes additively, run `npx playwright test --grep
"global input shows|Visual Window opens ordered"` once to prove the additive change broke nothing.

## Commit

```bash
git add convex/v2Native.ts convex/v2Routing.ts convex/v2Visual.ts convex/v2Workspace.ts convex/v2Schema/visual.ts convex/contract/v2.native.fixture.json ios/README.md tests/v2/native-contract.test.ts tests/v2/routing-and-access.test.ts tests/v2/visual-state.test.ts
git commit -m "feat: close native contract gaps and make v2 reads subscribable"
git log --oneline -3 && git status
```

## Report `rounds/R10-backend-native-gaps.md`

Per gap: the failing test, the change (`file:line`), the passing run. Gate outputs. Deviations.

## Hard rules

Never edit the cutover worker's files, `schema.ts` (except the one additive field via
`v2Schema/visual.ts`), `src/`, `e2e/`, `docs/superpowers/plans|specs`, `.env.local`. Never run
against `neat-pony-216`. Never `git add -A`. Never push.
