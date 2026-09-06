# R1 — backend reconcile: report

Worker: BUILDER, backend plan Task 1. All work in
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`
(branch `codex/corner-v2-integration`).

## Outcome

Done, all three commits landed, rehearsal deployment holds the full live
copy. Gate results: `npm test` 58/58, `npm run build` clean,
`npm run parity:v2` 56/56 tables + 291/291 functions, e2e 51 passed / 0
skipped, inventory gate passed (21 ledger rows, `karens-world` present).

- Merge commit: `827ef9e` — reconcile live backend with main's UI
- Parity commit: `2f5bda0` — live backend parity contract
- Rehearsal commit: `611249e` — rehearsal deployment from the live export
- Rehearsal deployment: `patrik-matheson:corner:dev/corner-v2-rehearsal-20260905`
  (backing id `dev:adjoining-tiger-87`, `https://adjoining-tiger-87.convex.cloud`)
- Backup ZIP: `/Users/aom-inhouse/CornerBackups/corner-neat-pony-216-2026-09-05.zip`
  — 14,109,813 bytes, 128 entries,
  SHA-256 `5c7be963af726cbbe141efa38fe8a9944725b48e44a3029809f7130d9ef106ad`
- Karen's real counts: **365 messages** (plan sentinel holds exactly), 16 rooms
  = 6 project + 6 mission + 4 agent. Mission rooms whose `project` string
  matches no project room title (3, not fixed): listed under step 9.

## Deviations from the brief (all intentional, none touch a safety line)

1. Rehearsal deployment was created during step 3, not step 8, with
   `--expiration "in 5 days"` instead of `"in 14 days"`. Two reasons:
   `npx convex codegen` (convex 1.44) refuses to run without a selected
   deployment (`No CONVEX_DEPLOYMENT set`), and there was no `_generated/`
   dir, so `npm run build` could not pass before the merge commit without
   one. And `"in 14 days"` is rejected by the API for dev deployments:
   `InvalidExpiresAt: expiresAt cannot be more than 5 days in the future`.
   So step 8 skips creation (already exists) and only verifies/imports.
2. `npx convex codegen --typecheck disable` (codegen also pushed functions
   to the then-empty rehearsal deployment; code only, no data).
3. `scripts/v2-schema-parity.mjs` additionally matches destructured
   `export const { ... } = ...` exports. Required: the only such line in
   `convex/` is `export const { auth, signIn, signOut, store, isAuthenticated }
   = convexAuth(...)` (auth.ts), and without it the live identifiers
   `auth.js:signIn/signOut/store/isAuthenticated` would falsely report as
   missing. Everything else matches the brief's two patterns exactly.
4. `tests/v2/source-parity.test.ts` has one extra first line,
   `import { expect, it } from "vitest";` — the repo runs vitest with
   globals off and every existing test file imports from vitest; the plan
   snippet alone throws `it is not defined`. Test body is verbatim.
5. `npm run lint` fails pre-existing (no `eslint.config.*` on either
   branch; verified via `git ls-tree`). Not a merge problem, not fixed.
6. `convex/v2Inventory.ts` `summary` takes an OPTIONAL `roomIds` scope and
   `scripts/v2-rehearse.mjs` counts messages in room chunks (40 rooms,
   halved on budget errors). A single Convex execution may read 16MB but
   the AOM world holds 43,723 messages (~32MB uncompressed), so the
   briefed single no-arg execution physically cannot count them (observed
   failure pasted under step 9). No-arg call returns the full structure
   with `messages: 0` + `pendingRooms`; the written inventory artifact has
   the specified shape with exact counts.
7. `totals.ledger` (21) is a deployment-wide collect, while per-world
   `ledger` stays slug-matched per the brief (16 for `aom`). 5 rows carry
   `world: "smoke"`, matching no world (world-value counts only, no row
   contents printed anywhere).
8. Manifest `functions` = 291 identifiers: the 296-entry live spec minus 5
   identifier-less `HttpAction` route entries (path-based, no
   `module.js:export` form).

## Step 1 — resolve the merge

Starting state confirmed the brief: 5 conflicted paths
(`package.json`, `package-lock.json`, `src/App.tsx`, `src/routes/Chat.tsx`,
`src/routes/Home.tsx`).

```bash
git checkout --ours -- src/App.tsx src/routes/Chat.tsx src/routes/Home.tsx package-lock.json
git add src/App.tsx src/routes/Chat.tsx src/routes/Home.tsx package-lock.json
git status --short | grep -E '^(UU|AA|DD)'
# output: UU package.json   (only package.json left unmerged)
```

`package.json` resolved by hand to the union (scripts kept + 4 v2 scripts,
`@auth/core` + `@convex-dev/auth` kept, `convex` → `^1.44.0`,
`@playwright/test` + `@types/node` + `@edge-runtime/vm`). Conflict-marker
check after: `grep -rn '^<<<<<<<\|^>>>>>>>' package.json src convex` →
nothing (exit 1).

Removal-candidate import check (before removing each):

```bash
grep -rn "from.*lib/agents\|lib/agents" src/   # 8 importers -> KEEP agents.ts
grep -rn 'ChatDesktop\|AppErrorBoundary\|KeyboardShortcutsOverlay\|cv6-desktop' src/ --include='*.tsx' --include='*.ts' | grep -v '^src/components/KeyboardShortcutsOverlay.tsx\|^src/components/AppErrorBoundary.tsx'
# output: only src/main.tsx lines (import AppErrorBoundary, import cv6-desktop.css, JSX use)
```

`git show main:src/main.tsx` has neither import — both came from the source
branch — so `src/main.tsx` was restored (`git checkout main -- src/main.tsx`).
Origin check: `ChatDesktop.tsx`, `AppErrorBoundary.tsx`,
`KeyboardShortcutsOverlay.tsx`, `cv6-desktop.css` exist on
`origin/codex/convex-multi-agent` but NOT on `main` (source-only);
`agents.ts`, `cv6-base.css`, `cv6-screens.css` exist on both.

```bash
git rm --cached -- src/components/ChatDesktop.tsx src/components/AppErrorBoundary.tsx src/components/KeyboardShortcutsOverlay.tsx src/cv6-desktop.css
rm -- src/components/ChatDesktop.tsx src/components/AppErrorBoundary.tsx src/components/KeyboardShortcutsOverlay.tsx src/cv6-desktop.css
```

Auto-merged files, `git diff main --numstat`: `src/lib/auth.tsx` 27/6,
`src/main.tsx` 9/0 (restored), `src/components/Composer.tsx` 98/7, all
others (index.css, CommandPalette, Auth, Email, Files, Notifications,
Settings, Tracker) identical to main. Kept the merged `auth.tsx` (session
self-heal via `worlds.resolveForSession`, no removed-file refs) and merged
`Composer.tsx` (mention autocomplete, no removed-file refs); kept merged
`src/lib/agents.ts` (imported by 8 files). After: only remaining
`ChatDesktop` string in `src/` is a comment in main's own `cv6-base.css:511`.
`git add package.json`; no `UU` paths left.

## Step 2 — copy the two live files

```bash
cp /Users/aom-inhouse/aom-studio-transfer/corner-convex/convex/cleanupTest.ts convex/cleanupTest.ts
cp /Users/aom-inhouse/aom-studio-transfer/corner-convex/convex/migrateLegacy.ts convex/migrateLegacy.ts
ls -la convex/cleanupTest.ts convex/migrateLegacy.ts
# -rw-r--r--@ 1 aom-inhouse  staff  2545 Sep  5 22:52 convex/cleanupTest.ts
# -rw-r--r--@ 1 aom-inhouse  staff  7513 Sep  5 22:52 convex/migrateLegacy.ts
```

Main checkout untouched otherwise (no edits, no convex commands from it).

## Step 3 — install, generate, build, test, lint, e2e

```bash
npm install   # last lines:
# added 221 packages, and audited 222 packages in 6s
# 47 packages are looking for funding / run `npm fund` for details
# 7 vulnerabilities (5 moderate, 1 high, 1 critical)
```

`npx convex codegen` initially failed (`No CONVEX_DEPLOYMENT set, run
`npx convex dev``) — no `_generated/` existed and it is gitignored, so the
rehearsal deployment was created here (see deviation 1):

```bash
npx convex deployment create "patrik-matheson:corner:dev/corner-v2-rehearsal-20260905" --type dev --select --expiration "in 14 days"
# ✖ Error ... 400 Bad Request: InvalidExpiresAt: expiresAt cannot be more than 5 days in the future
npx convex deployment create "patrik-matheson:corner:dev/corner-v2-rehearsal-20260905" --type dev --select --expiration "in 5 days"
# (ok) dashboard: https://dashboard.convex.dev/t/patrik-matheson/corner/adjoining-tiger-87
cat .env.local
# # Deployment used by `npx convex dev`
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner
# VITE_CONVEX_URL=https://adjoining-tiger-87.convex.cloud
# VITE_CONVEX_SITE_URL=https://adjoining-tiger-87.convex.site
```

`.env.local` never says `neat-pony-216`.

```bash
npx convex codegen --typecheck disable   # last lines:
# Bundling component schemas and implementations...
# Downloading current deployment state...
# Uploading functions to Convex...
# Generating TypeScript bindings...
# Running TypeScript...
# (convex/_generated/: api.d.ts api.js dataModel.d.ts server.d.ts server.js)

npm run build   # last lines (exit 0):
# /cv6/assets/corner-logo-white.svg referenced in /cv6/assets/corner-logo-white.svg didn't resolve at build time, it will remain unchanged to be resolved at runtime
# /cv6/assets/corner-logo.svg referenced in /cv6/assets/corner-logo.svg didn't resolve at build time, it will remain unchanged to be resolved at runtime
# ✓ 2268 modules transformed.
# dist/index.html                   1.01 kB │ gzip:   0.51 kB
# dist/assets/index-C8xvGN5_.css  215.57 kB │ gzip:  35.43 kB
# dist/assets/index-CU4kVqwd.js   485.69 kB │ gzip: 146.22 kB
# ✓ built in 1.24s

npm test   # last lines (exit 0):
#  ✓ tests/room-identity.test.ts (2 tests) 1ms
#  ✓ tests/ai-novelty.test.ts (2 tests) 2ms
#  ✓ tests/attachments.test.ts (3 tests) 2ms
#  ✓ tests/gauntlet-r1-backend.test.ts (45 tests) 7ms
#  ✓ tests/mentions.test.ts (5 tests) 86ms
#  Test Files  5 passed (5)
#       Tests  57 passed (57)

npm run lint   # PRE-EXISTING FAILURE, not a merge problem:
# Oops! Something went wrong! :(
# ESLint: 9.39.5
# ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
```

`git ls-files | grep -iE 'eslint|prettier'` → empty; same on `main` and on
`origin/codex/convex-multi-agent`. No config ever existed; left as-is.

```bash
lsof -ti :5173 | xargs kill   # leftover server killed first
npm run e2e   # last lines (exit 0):
#   ✓  48 [desktop] › e2e/visual.spec.ts:907:1 › home — empty room list (2.1s)
#   ✓  49 [desktop] › e2e/visual.spec.ts:917:1 › room — loading skeleton (2.0s)
#   ✓  50 [desktop] › e2e/visual.spec.ts:927:1 › room — long wrapping, no sideways scroll (2.3s)
#   ✓  51 [desktop] › e2e/visual.spec.ts:939:1 › unknown route and unknown room are not blank (3.9s)
#   51 passed (2.4m)
```

Zero failures, zero skips. No baseline pixel-diff issue arose.

## Step 4 — commit the merge

```bash
git commit -m "chore: reconcile live backend (codex/convex-multi-agent) with main's UI for v2 integration"
# [codex/corner-v2-integration 827ef9e] chore: reconcile live backend (codex/convex-multi-agent) with main's UI for v2 integration
git log --oneline -3
# 827ef9e chore: reconcile live backend (codex/convex-multi-agent) with main's UI for v2 integration
# 11df05a corner v2: list what the Claude Design export is missing
# e867140 corner v2: preserve the design export and the three implementation plans
git status --short
#  M package-lock.json            (npm install rewrote it; committed in step 6)
# ?? convex/cleanupTest.ts
# ?? convex/migrateLegacy.ts
# ?? docs/superpowers/audits/
```

## Step 5 — parity contract and test (fail first, then pass)

Test created at `tests/v2/source-parity.test.ts` (plan body verbatim plus the
vitest import from deviation 4). First run — required failure (manifest and
helpers did not exist yet):

```bash
npm test -- tests/v2/source-parity.test.ts
#  FAIL  tests/v2/source-parity.test.ts [ tests/v2/source-parity.test.ts ]
# Error: Failed to load url ../../docs/superpowers/audits/2026-09-05-live-backend-parity.json
#   (resolved id: ../../docs/superpowers/audits/2026-09-05-live-backend-parity.json)
#   in /Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/tests/v2/source-parity.test.ts.
#   Does the file exist?
#  Test Files  1 failed (1)
#       Tests  no tests
```

`scripts/v2-schema-parity.mjs` created (two exported helpers + CLI mode).
Probing tree-vs-live before writing the manifest found two gaps, both
investigated, neither a reconciliation gap:

1. 5 live spec entries with NO identifier — all `functionType:
   HttpAction` (jwks, openid-configuration, /message, /ledger/append,
   /ledger/latest). Path-based routes have no `module.js:export` form, so
   the plan's `functions[].identifier` formula skips them (deviation 8).
2. `auth.js:isAuthenticated/signIn/signOut/store` — present in the tree at
   `convex/auth.ts:49`
   (`export const { auth, signIn, signOut, store, isAuthenticated } =
   convexAuth(...)`), the ONLY `export const {` in `convex/*.ts`. The
   scanner matches it via the documented destructured-export pattern
   (deviation 3); `auth.js:auth` itself is correctly absent from the live
   spec (unregistered helper) and is the single harmless tree extra.

After the scanner fix: live unique 291, tree 292, MISSING: [].
Schema tables: 56, first `users`, last `clientEngine` — as expected.

Manifest `docs/superpowers/audits/2026-09-05-live-backend-parity.json`
written (`capturedAt 2026-09-05T22:25:00-07:00`, `deployment
neat-pony-216`, `ledgerCount 21`, 56 tables, 291 functions). Then:

```bash
npm test -- tests/v2/source-parity.test.ts
#  ✓ tests/v2/source-parity.test.ts (1 test) 8ms
#  Test Files  1 passed (1)
#       Tests  1 passed (1)
npm run parity:v2
# tables: 56/56 present
# functions: 291/291 present
```

## Step 6 — commit the parity contract

```bash
git add package.json package-lock.json scripts/v2-schema-parity.mjs tests/v2/source-parity.test.ts docs/superpowers/audits/2026-09-05-live-backend-parity.json docs/superpowers/audits/2026-09-05-live-function-spec.json convex/cleanupTest.ts convex/migrateLegacy.ts
git commit -m "chore: live backend parity contract for v2 rehearsal"
# [codex/corner-v2-integration 2f5bda0] chore: live backend parity contract for v2 rehearsal
git log --oneline -3
# 2f5bda0 chore: live backend parity contract for v2 rehearsal
# 827ef9e chore: reconcile live backend (codex/convex-multi-agent) with main's UI for v2 integration
# 11df05a corner v2: list what the Claude Design export is missing
```

## Step 7 — export live, including file storage

`scripts/v2-export-live.mjs` created (refuses overwrite, SHA-256 sidecar via
`node:crypto`, `unzip -l` assertions for `generated_schema.jsonl`,
`_storage/`, one dir per manifest table).

```bash
npm run backup:v2-live
# > node scripts/v2-export-live.mjs
# - Creating snapshot export
# ✔ Created snapshot export at timestamp 1788674307458272890
# ✔ Export is available at https://dashboard.convex.dev/d/neat-pony-216/settings/snapshot-export
# - Downloading snapshot export to /Users/aom-inhouse/CornerBackups/corner-neat-pony-216-2026-09-05.zip
# ✔ Downloaded snapshot export to /Users/aom-inhouse/CornerBackups/corner-neat-pony-216-2026-09-05.zip
# sha256: 5c7be963af726cbbe141efa38fe8a9944725b48e44a3029809f7130d9ef106ad
# entries: 128, bytes: 14109813
# export verified: schema, _storage, and every manifest table present
ls -la /Users/aom-inhouse/CornerBackups/
# total 27568
# drwxr-xr-x@   4 aom-inhouse  staff       128 Sep  5 22:58 .
# drwxr-x---+ 219 aom-inhouse  staff      7008 Sep  5 22:58 ..
# -rw-r--r--@   1 aom-inhouse  staff  14109813 Sep  5 22:58 corner-neat-pony-216-2026-09-05.zip
# -rw-r--r--@   1 aom-inhouse  staff       102 Sep  5 22:58 corner-neat-pony-216-2026-09-05.zip.sha256
```

No `ledgerTokens` contents printed at any point. ZIP lives outside the repo;
`git status` clean of it.

## Step 8 — rehearsal deployment and import (import ONLY here)

Deployment already created in step 3 (deviation 1), so this step verified
and continued. Target proof immediately before the import:

```bash
cat .env.local
# # Deployment used by `npx convex dev`
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner
# VITE_CONVEX_URL=https://adjoining-tiger-87.convex.cloud
# VITE_CONVEX_SITE_URL=https://adjoining-tiger-87.convex.site
npx convex import /Users/aom-inhouse/CornerBackups/corner-neat-pony-216-2026-09-05.zip --replace-all -y
# - Imported "messages" (44,088 documents)
# - Importing "_file_storage"
# ✔ Imported "_storage" (0 files)
# - Importing "_file_storage"
# ✔ Added 104964 documents.
npx convex dev --once
# ✔ 23:00:30 Convex functions ready! (27.86s)
```

Push succeeded — no schema validation failure, schema NOT loosened.
Verify (with `cat .env.local` directly above in the same command, proving
the target is the rehearsal deployment, not live):

```bash
npx convex data ledger --limit 500 | tail -n +3 | grep -c '|'
# 21
npx convex data worlds --limit 100
# _id                                | _creationTime      | name             | ownerId                            | slug
# "k17480zy9719gsc6tm83s6hjdx8drg9z" | 1788487215115.1572 | "Karen's World"  | "jx7ef9x81dzyeserrshm0ttpt58dsw7j" | "karens-world"
# "k174s2cxap0m7mw7609cr0tf858ds666" | 1788455142169.2766 | "Karen"          | "jx7ef9x81dzyeserrshm0ttpt58dsw7j" | "user-jx7ef9x81dzyeserrshm0ttpt58dsw7j"
# "k17085kf8k18skzh43mdh69p118dq8v9" | 1788455142169.2766 | "Onboarding QA"  | "jx7cwf71wv0knx4wk6tam1h8h98dp6t1" | "user-jx7cwf71wv0knx4wk6tam1h8h98dp6t1"
# "k1734zz3xfvkncdv4wazcedvjx8dqthf" | 1788455141914.1045 | "demo"           | "jx7bfw6ey3ggbh81q0xx10dkt98dqtnx" | "demo"
# "k17banyx4gycjz896nk0nv7m358dphxq" | 1788455141460.0518 | "Demo"           | "jx7bfw6ey3ggbh81q0xx10dkt98dqtnx" | "user-jx7bfw6ey3ggbh81q0xx10dkt98dqtnx"
# "k17fhv79ssdp3qrhs8tew7wbws8cngtq" | 1786933711264.2256 | "stranger-probe" | "jx7ea0z2rvkyey5b262x2a8x898cmvx9" | "user-jx7ea0z2rvkyey5b262x2a8x898cmvx9"
# "k1798fjd7haec6r0ywkqzv5j858cgahm" | 1786773471156.7954 | "AOM"            | "jx7bcbabmhdw78vvb62zs6yjk98chv3b" | "aom"
```

21 ledger rows, 7 worlds including `karens-world`
(`k17480zy9719gsc6tm83s6hjdx8drg9z`) — as expected.

## Step 9 — inventory query + rehearse script

`convex/v2Inventory.ts` created (ONE read-only query `summary`, no
mutations, no new indexes; uses `rooms.by_world`, `messages.by_world` /
`by_room`, `files.by_world`, `ledger.by_world_at`). `scripts/v2-rehearse.mjs`
created (refuses live `.env.local`, runs `convex run v2Inventory:summary`,
writes `docs/superpowers/audits/2026-09-05-rehearsal-inventory.json`, gates
on `totals.ledger === 21` + `karens-world`).

Two failures on the way there, both fixed at the cause:

1. First push failed Convex's typecheck — self-referential
   `NonNullable<typeof karen>` annotation (3 errors at v2Inventory.ts:84).
   Replaced with an explicit `RoomRow` type. (`npx tsc --noEmit` locally
   passed; Convex's bundler typecheck caught it.)
2. First `npm run rehearse:v2` failed at runtime — the literal no-arg design
   cannot work on this data:

```bash
# [CONVEX ?(v2Inventory:summary)] [WARN] Many documents read in a single function execution (actual: 25945, limit: 32000).
# ✖ Failed to run function "v2Inventory:summary":
# Error: [Request ID: 4f88853a81e936ce] Server Error
# Uncaught Error: Too many bytes read in a single function execution (limit: 16777216 bytes).
#     at async handler (../convex/v2Inventory.ts:49:17)
```

   Verified the Query interface (`node_modules/convex/.../server/query.d.ts`)
   offers only `collect/take/first/unique/paginate` — no server-side count —
   and measured the export ZIP: `messages/documents.jsonl` is 32.6MB
   uncompressed; the AOM world holds 43,723 of the 44,088 messages (Karen's
   world holds exactly 365; 0 orphans; max single room 5,977 msgs ≈ fits).
   Hence deviation 6 (optional `roomIds` scope + chunked counting in the
   script, merged artifact in the specified shape). The gate then caught a
   real data fact — `totals.ledger=16` vs 21 — because 5 rows carry
   `world: "smoke"` (world-value counts only:
   `16 "aom"` / `5 "smoke"`); fixed per deviation 7 (deployment-wide
   `totals.ledger`, per-world counts stay slug-matched). Final run:

```bash
npx convex dev --once
# ✔ 23:07:12 Convex functions ready! (4.45s)
npm run rehearse:v2
# (full JSON below)
# inventory gate passed: 21 ledger rows, karens-world present
```

Whole inventory (`npm run rehearse:v2` stdout =
`docs/superpowers/audits/2026-09-05-rehearsal-inventory.json`):

```json
{
  "worlds": [
    {
      "files": 0,
      "ledger": 16,
      "messages": 43723,
      "name": "AOM",
      "rooms": { "agent": 455, "mission": 302, "other": 0, "project": 88 },
      "slug": "aom",
      "worldId": "k1798fjd7haec6r0ywkqzv5j858cgahm"
    },
    {
      "files": 0, "ledger": 0, "messages": 0, "name": "stranger-probe",
      "rooms": { "agent": 0, "mission": 0, "other": 0, "project": 0 },
      "slug": "user-jx7ea0z2rvkyey5b262x2a8x898cmvx9",
      "worldId": "k17fhv79ssdp3qrhs8tew7wbws8cngtq"
    },
    {
      "files": 0, "ledger": 0, "messages": 0, "name": "Demo",
      "rooms": { "agent": 0, "mission": 0, "other": 0, "project": 0 },
      "slug": "user-jx7bfw6ey3ggbh81q0xx10dkt98dqtnx",
      "worldId": "k17banyx4gycjz896nk0nv7m358dphxq"
    },
    {
      "files": 0, "ledger": 0, "messages": 0, "name": "demo",
      "rooms": { "agent": 0, "mission": 0, "other": 0, "project": 0 },
      "slug": "demo",
      "worldId": "k1734zz3xfvkncdv4wazcedvjx8dqthf"
    },
    {
      "files": 0, "ledger": 0, "messages": 0, "name": "Onboarding QA",
      "rooms": { "agent": 0, "mission": 0, "other": 0, "project": 0 },
      "slug": "user-jx7cwf71wv0knx4wk6tam1h8h98dp6t1",
      "worldId": "k17085kf8k18skzh43mdh69p118dq8v9"
    },
    {
      "files": 0, "ledger": 0, "messages": 0, "name": "Karen",
      "rooms": { "agent": 0, "mission": 0, "other": 0, "project": 0 },
      "slug": "user-jx7ef9x81dzyeserrshm0ttpt58dsw7j",
      "worldId": "k174s2cxap0m7mw7609cr0tf858ds666"
    },
    {
      "files": 0, "ledger": 0, "messages": 365,
      "name": "Karen's World",
      "rooms": { "agent": 4, "mission": 6, "other": 0, "project": 6 },
      "slug": "karens-world",
      "worldId": "k17480zy9719gsc6tm83s6hjdx8drg9z"
    }
  ],
  "totals": { "files": 0, "ledger": 21, "messages": 44088, "rooms": 861, "worlds": 7 },
  "karen": {
    "missionRooms": [
      { "messages": 8, "project": "eagle-s-welding", "roomId": "jn79x3nx7hspcagc3mb4d82sc18dr5ar", "title": "qbo-cleanup" },
      { "messages": 14, "project": "karens-world-main", "roomId": "jn7908n7pxjjezt4tpq774jkgs8dsks6", "title": "family" },
      { "messages": 3, "project": "agent-work", "roomId": "jn7c562mtj44vbpk78328d78rx8drbhs", "title": "assigned-to-from-dashboard-file-service-refriger" },
      { "messages": 2, "project": "assigned-to-from-dashboard-file-service-refriger", "roomId": "jn788zz89be5rgb33kpwm197658drm7f", "title": "assigned-to-from-dashboard-file-service-refriger" },
      { "messages": 49, "project": "karens-world-main", "roomId": "jn7av9apkjykrev8y6f73kcz8s8ds8bm", "title": "truepath-solution" },
      { "messages": 1, "project": "truepath-solution", "roomId": "jn79j8tbpxbrs0rm9wy5wydzbx8dshyp", "title": "truepath-solution" }
    ],
    "projectRooms": [
      { "messages": 65, "project": "eagle-s-welding", "roomId": "jn72nqepe2f2denqspbyk2zzsn8drdfh", "title": "eagle-s-welding" },
      { "messages": 7, "project": "aheadofmarket", "roomId": "jn7340kqhyef8djjthckezjrpx8drmj5", "title": "aheadofmarket" },
      { "messages": 132, "project": "ambition-mechanical-services", "roomId": "jn72dcfz3bp0eb4sqmcx74nfnx8drm69", "title": "ambition-mechanical-services" },
      { "messages": 6, "project": "passive-income", "roomId": "jn741wa8zryfbgspzmmyp79yss8dstkg", "title": "passive-income" },
      { "messages": 2, "project": "karens-world-main", "roomId": "jn7dt9tj1b95v7f98j0ktxhv3s8dsx8e", "title": "karens-world-main" },
      { "messages": 3, "project": "transmisiones-garcia-s", "roomId": "jn79fk7m0aqs1rkg3d8xx4960d8dszev", "title": "transmisiones-garcia-s" }
    ],
    "slug": "karens-world",
    "worldId": "k17480zy9719gsc6tm83s6hjdx8drg9z"
  }
}
```

Karen's real counts: **365 messages** (292 in mission+project rooms, 73 in
her 4 agent rooms) — the plan's 365 sentinel holds exactly. Her rooms: 16 =
6 project + 6 mission + 4 agent (brief estimated "5 or 6 / 6 / 2"). Files:
0 rows deployment-wide. Rooms deployment-wide: 861.

Mission rooms whose `project` string matches NO project room title (3 —
reported, not fixed, per brief):

- mission `assigned-to-from-dashboard-file-service-refriger`
  (`jn7c562mtj44vbpk78328d78rx8drbhs`, 3 msgs) — `project: "agent-work"`
- mission `assigned-to-from-dashboard-file-service-refriger`
  (`jn788zz89be5rgb33kpwm197658drm7f`, 2 msgs) —
  `project: "assigned-to-from-dashboard-file-service-refriger"`
- mission `truepath-solution` (`jn79j8tbpxbrs0rm9wy5wydzbx8dshyp`, 1 msg) —
  `project: "truepath-solution"`

(The other three mission rooms point at `eagle-s-welding` and
`karens-world-main`, both real project room titles. Note the two
`truepath-solution` missions: a 49-message one under `karens-world-main`
and a 1-message one pointing at a nonexistent `truepath-solution` project.)

## Step 10 — commit and report

```bash
git add scripts/v2-export-live.mjs scripts/v2-rehearse.mjs convex/v2Inventory.ts docs/superpowers/audits/2026-09-05-rehearsal-inventory.json
git commit -m "chore: v2 rehearsal deployment from the live export"
# [codex/corner-v2-integration 611249e] chore: v2 rehearsal deployment from the live export
git log --oneline -5
# 611249e chore: v2 rehearsal deployment from the live export
# 2f5bda0 chore: live backend parity contract for v2 rehearsal
# 827ef9e chore: reconcile live backend (codex/convex-multi-agent) with main's UI for v2 integration
# 11df05a corner v2: list what the Claude Design export is missing
# e867140 corner v2: preserve the design export and the three implementation plans
git status
# (clean)
git check-ignore .env.local && echo env-ignored
# .env.local
# env-ignored
```

`.env.local` is ignored, never staged. Final verification on the finished
tree: `npm test` 6 files / 58 tests passed, `npm run parity:v2` 56/56 +
291/291, `npm run build` clean. No vite server left on :5173 (killed;
`lsof -ti :5173` empty). Never pushed. `docs/superpowers/plans/` and
`docs/superpowers/specs/` untouched. No test deleted, no schema loosened.


