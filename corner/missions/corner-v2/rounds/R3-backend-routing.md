# R3 — backend routing: routing, provenance reads, confirmed cross-Project writes, hardened ledger, v2Workspace façade

Worker: BUILDER, backend plan Task 5 + plan "Interfaces" `v2Workspace` signatures.
Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
`codex/corner-v2-integration`, base `e19156f`. Commit for this round:
**`49d2a5a feat: add v2 routing provenance and confirmed writes`** (7 files, +1842/−3).

Pre-reads: `LOOP.md` (hard lines), `rounds/R2-backend-spine.md` (spine function
names, `tests/v2/setup.ts` identity trick), backend plan Task 5 + Interfaces block,
spec "Conversation routing", "Agent brains", "Cross-Project work",
"Activity ledger", "Error and safety behavior".

## Step 0 — starting state

```bash
git log --oneline -3
# e19156f feat: add corner v2 desktop workspace shell
# 44f18cb test: preserve corner v2 reference and workspace contract
# 45b33e7 feat: add v2 project mission thread spine
git status --short   # (empty at start)
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner
head -1 .env.local
# Deployment used by `npx convex dev`
```

Target is the rehearsal deployment, never `neat-pony-216`. No `npm run build`
run (desktop worker owns `dist/`); used `npx tsc --noEmit` + `npx convex dev --once`.

## Step 1 — tables (in `convex/v2Schema/routing.ts`)

Replaced the R2 `{}` placeholder with the brief's two tables verbatim
(`routeDecisions` + `by_world_created`/`by_block`, `crossProjectConfirmations` +
`by_actor_created`). `payloadHash` is FNV-1a 32-bit hex over
`action + "\n" + change`, computed in the mutation — no `createHash`, no Node imports.

```bash
npx convex dev --once   # after all implementation, first try
# ✔ Added table indexes:
#   [+] crossProjectConfirmations.by_actor_created   actorUserId, createdAt, _creationTime
#   [+] routeDecisions.by_block   blockId, _creationTime
#   [+] routeDecisions.by_world_created   worldId, createdAt, _creationTime
# ✔ 23:54:09 Convex functions ready! (5.51s)
```

No retry needed: no foreign-file type error this round. (Uncommitted files from
the MAPPING/VISUAL workers — `convex/v2Threads.ts`, `convex/v2Migrations.ts`,
`convex/v2Mapping.ts`, mapping/history tests — were present in the worktree
throughout; none blocked the push.)

## Step 2 — tests first (FAIL before implementation)

Wrote `tests/v2/routing-and-access.test.ts` (`// @vitest-environment edge-runtime`,
R2 `setup.ts` helpers, Karen/`karens-world` + Aster/Northwind/"Ship home page" +
Ben/`bens-world` fixture, 11 tests: the brief's 10 + one local-token issue/revoke test):

```bash
npm test -- tests/v2/routing-and-access.test.ts
#  ❯ tests/v2/routing-and-access.test.ts (11 tests | 10 failed) ...
#    × keeps selected homes direct → Could not find module for: "v2Routing"
#    × honors an explicit project name → Could not find module for: "v2Routing"
#    ... (same "Could not find module" for v2Routing/v2CrossProject/v2Ledger)
#  Test Files  1 failed (1)
#       Tests  10 failed | 1 passed (11)
```

Required failure. (The 1 pass is test 10, "legacy token writer still works" —
it exercises only the pre-existing `ledger.append` + `ledgerTokens` table, so it
passes before and after; it is a preservation test.)

## Step 3 — implementation

- `convex/v2Routing.ts` — `route` (+ exported `routeCore`), `confirmProposal`
  (+ `confirmProposalCore`), `moveThreadBlock` (+ `moveBlockCore`); shared
  exported helpers `tokenize`, `fnv1aHex`, `threadPath`, `threadNode`,
  `listCandidates` for the façade. Rules in brief order; existing outcomes store
  the `routeDecisions` row, then a `kind: "routing"` block
  `{ decisionId, path, moveable: true }`, then patch `blockId`. Only
  `confirmProposal` inserts projects/missions/threads (second call throws
  `"Proposal already confirmed"`); `moveThreadBlock` re-parents the routing block
  plus the first user text block at/after its `createdAt`, stamps
  `movedAt`/`movedToThreadId` via the `by_block` index, appends one ledger
  `decided` row `"Moved <A> to <B>"`.
- `convex/v2CrossProject.ts` — `readFacts` as a **mutation** (documented in the
  file: every call appends one ledger `learned` row and queries cannot write),
  up to 8 facts, `sourceKind` file|message|artifact|ledger (thread blocks and
  legacy linked messages map to `"message"`), ledger `who` = viewer email local
  part, `surface: "corner:v2"`, `subjects` = source slug + every borrowed project
  slug. `requestCrossProjectWrite` (same-world membership or cross-world
  `editor` grant, `expiresAt = now + 10min`, ledger `asked`) and
  `confirmCrossProjectWrite` (same error `"Cross-project write confirmation
  required"` for unknown/wrong-actor/expired/consumed; one mutation appends the
  target `system` block `{ crossProject: true, fromThreadId, action, change,
  confirmationId }`, the source linked-summary block, `consumedAt`, ledger `did`
  with `links: ["thread:<target>"]`).
- `convex/v2Ledger.ts` — `latest`/`append` (member-only, no key/token/open path;
  reuses `normalizeWhat` + newly-exported `normalizeSubjects` from `ledger.ts`),
  `issueLocalToken`/`revokeLocalToken` (owner|admin, world = workspace slug,
  tail-matched revoke).
- `convex/ledger.ts` — ONLY allowed edits: `normalizeSubjects` exported, plus
  `requireLedgerWorld` gate in `latest` and `subjects` (dated comment): signed-in
  callers may read `aom` as before, any other world requires membership in the
  world with that slug; unsigned callers keep today's behaviour for `aom` only,
  any other world unsigned throws `"Not a member of this world"`. `append`
  untouched (key | token | user | open-when-no-key all preserved).
- `convex/v2Workspace.ts` — façade with homeWorld-derived workspace, no
  `workspaceId` args: `getNavigation` (desktop nodes with `needsYou` =
  newest block is an agent `question`, `lastActivityAt` = newest block/linked
  message), `getConversationSurface` (spine node + `TypedMessage[]` mapped from
  `listThreadMessages` sources with `userName`/agent-title labels +
  24h un-moved `routingBanner` as `confident-existing` + `artifacts: []` with the
  one-line visual-worker comment + empty provenance with comment),
  `routeGlobalInput`/`confirmProposedHome`/`moveThreadBlock`/
  `requestCrossProjectWrite`/`confirmCrossProjectWrite` thin wrappers returning
  the plan's `confident-existing`|`ambiguous`|`proposed-general-mission`|
  `proposed-new-home` shapes, `sendMessage` (user block only + id, no faked agent
  reply). Facade smoke-tested via a scratch convex-test file (since removed):
  nav lists General/Aster/mission/Northwind, surface returns 1 message with null
  banner, `routeGlobalInput("Northwind: draft the brief")` →
  `{ kind: "confident-existing", path: "Northwind" }`, `sendMessage` returns a block id.

## Step 4 — gates (all green)

```bash
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner

npm test -- tests/v2/routing-and-access.test.ts tests/v2/projects-and-tenancy.test.ts
#  Test Files  2 passed (2)
#       Tests  15 passed (15)

npm test
#  Test Files  10 passed (10)
#       Tests  80 passed (80)

npx tsc --noEmit -p tsconfig.json
# (no output) exit 0

npx convex dev --once
# ✔ 23:55:00 Convex functions ready! (4.63s)

npm run parity:v2
# tables: 56/56 present
# functions: 291/291 present
```

One transient (noted, not hidden): the first full-suite run showed 79/80 with
1 failure while the MAPPING worker's uncommitted edits were landing; the next
two full runs were 80/80 with no code change on my side. Gate files were 15/15
throughout. No `index.lock` collision.

Ledger scope proof on the rehearsal copy:

```bash
npx convex run ledger:latest '{"world":"aom","limit":1}'
# [ { "world": "aom", "kind": "learned", "who": "patrik",
#     "what": "Traced hanging fetch, retried with GitHub CLI token, ruled out credentials as root cause.",
#     ... one row ... } ]

npx convex run ledger:latest '{"world":"karens-world","limit":1}'
# ✖ Failed to run function "ledger:latest":
# Error: [Request ID: b299188a058db810] Server Error
# Uncaught Error: Not a member of this world
#     at requireLedgerWorld (../../convex/ledger.ts:72:4)
```

First returns one row (unsigned, as today); second throws exactly
`Not a member of this world`.

## Step 5 — commit

```bash
git add convex/v2Schema/routing.ts convex/v2Routing.ts convex/v2CrossProject.ts convex/v2Ledger.ts convex/v2Workspace.ts convex/ledger.ts tests/v2/routing-and-access.test.ts
git commit -m "feat: add v2 routing provenance and confirmed writes"
# [codex/corner-v2-integration 49d2a5a] feat: add v2 routing provenance and confirmed writes
#  7 files changed, 1842 insertions(+), 3 deletions(-)
git log --oneline -3 && git status
# 49d2a5a feat: add v2 routing provenance and confirmed writes
# e19156f feat: add corner v2 desktop workspace shell
# 44f18cb test: preserve corner v2 reference and workspace contract
# (only other workers' uncommitted files remain: v2Migrations.ts, v2Threads.ts,
#  v2Mapping.ts, karen-mapping/history tests, v2-verify.mjs, migrations/ — untouched)
```

`git show --stat HEAD` confirms exactly the 7 listed files. No push, per hard rules.

## Scoring weights shipped (one paragraph)

Per candidate thread: 3 × shared content tokens with project/mission name+slug,
2 × shared tokens with mission goal+summary, 1 × shared tokens with the last 50
`threadBlocks` payload strings, 1 × shared tokens with up to 200
`messageLinks`-linked legacy message texts (read via `by_thread_sort`), 1 ×
shared tokens with legacy `files` names for rooms linked via `legacyRoomLinks`
`by_thread`, plus a binary +2 when a ledger row in the world's slug both carries
the candidate project/mission slug in `subjects` and shares a token with the
input. Normalisation is lowercase, punctuation stripped, stop words dropped
(`a an the to for of and or in on at is it this that my our`). Thresholds:
existing needs top ≥ 0.6 × (10 × input tokens) and ≥ 1.5 × second; clarification
needs top two within 1.5× and both ≥ 2 (`"Could be <A> or <B>"`, confidence 0.5);
a lone top ≥ 2 at ≥ 1.5 × second routes existing at 0.6 (`"Only <path>
matches."`); otherwise a ≥12-word durable-concept input (keyword in `project
client launch campaign product brand site app`) proposes a Project, else a
Mission under General named from the first 6 title-cased words (confidence 0.4).

## Three worked examples (real scores from convex-test runs)

1. **existing (rule 4):** input `"brand"`, tokens {brand}, total-possible 10.
   Mission thread `Aster > Brand House` (name has "brand", goal "Define brand
   voice", one block "brand color approved"): 3×1 + 2×1 + 1×1 = **6** ≥ 6;
   second best `Aster`/`Northwind` **1** each (one block token). 6 ≥ 1.5×1 →
   `destination: "existing"`, confidence 0.78, reason `"Strongest match for
   Aster > Brand House."`, plus a `routing` block in that thread.
2. **clarification (rule 5):** input `"brand color"` with Aster/Northwind blocks
   `"Our brand color is blue/green"` and a scoreless mission: Aster **2**
   (1×{brand,color}), Northwind **2** — within 1.5×, both ≥ 2 →
   `destination: "clarification"`, `alternatives.length === 2`, reason
   `"Could be Aster or Northwind"`, confidence 0.5, nothing created.
3. **proposal (rule 6):** input `"Renew passport"`: every candidate scores
   **0** → `destination: "proposal"`, `proposal: { kind: "mission",
   parentProjectId: <General>, name: "Renew Passport" }`, confidence 0.4, and
   `listNavigation` still shows General with zero missions until
   `confirmProposal` creates it (second confirm throws `"Proposal already
   confirmed"`).

## Deviations (4, all forced by the brief's own tests)

1. **Test 5 is self-contained:** each test seeds an isolated convex-test DB, so
   "after test 3's decision" is reproduced inside test 5 (route → confirm →
   double-confirm throws) rather than sharing state across tests.
2. **Facts carry both `projectId` and `sourceProjectId`:** Step 2 test 6 demands
   `sourceProjectId`, Step 3's ProvenanceLink shape demands `projectId`; both are
   returned with the same value.
3. **Source gating uses `requireProjectAccess`, not membership-only:** test 7
   needs Ben to get `"Project access denied"` pre-grant AND success post
   `projects:grantAccess` — a membership check would throw `"Not a member of
   this world"` in both cases. Same-world candidates a grant-only reader cannot
   access are skipped; granted foreign projects that deny access throw (never
   silent skip).
4. **Lone-strong-candidate fallthrough** (`top ≥ 2` at `≥ 1.5 × second` →
   existing at 0.6): rules (4)–(6) as written leave e.g. top 7 / second 2
   undecided (found live during verification — first cut returned `proposal`
   for a 7-vs-2 input); spec orders "clearly strongest → existing" above asking,
   so it routes existing. All ten brief tests are unaffected.
