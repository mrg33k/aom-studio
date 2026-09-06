# R12 — backend AOM missions (project-field rule) + scheduler-noise cleanup + stray deployment

Worker: BUILDER. Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`,
branch `codex/corner-v2-integration`, base `184c576`.
Run id `aom-r12`. Approver string as before
(`orchestrator:claude on Patrik's WD-40 directive, <ISO now>`).

## Outcome

Done. 121 of 302 AOM missions now map (were 0), via the evidence-chosen
`project-field` rule; rehearsal AND production clone
(`patrik-matheson:corner-v2-production:production` =
`prod:brilliant-scorpion-163`) both applied twice, checksums 168/168 threads,
7/7 gates green, both workspaces still `v2_dual_write`.
`npm test` ends exit 0 with zero unhandled errors (was 4).
Stray `lovable-weasel-178` verified empty (8 tables, zero rows); no CLI delete
exists, so dashboard steps below and nothing was touched.
`neat-pony-216` untouched (zero calls against it this round).
Applied `aom-v2-mapping.json` never overwritten (new `aom-v2-mapping.r12.json`).

## Part A — why zero missions mapped, with evidence

New `scripts/v2-mission-parents.mjs` reads the backup ZIP's
`rooms/documents.jsonl` (+ `messages/documents.jsonl` for counts) for the AOM
world and scores FOUR matchers separately against the R4 manifest's 47 MAPPED
projects:

```bash
node scripts/v2-mission-parents.mjs --rows 30
# missions=302 projects=88 mappedProjects=47 workspace=k1798fjd7haec6r0ywkqzv5j858cgahm
# matcher | exactly-one-mapped | several-mapped | none-mapped
# exact-title | 0 | 0 | 302
# slug-title | 202 | 0 | 100
# project-field | 213 | 0 | 89
# manifest-slug | 202 | 0 | 100
# missions with humanMessageCount===0 (scaffolding): 172/302
# distinct mission project strings: 97
```

Matchers: (1) `projectRoom.title === mission.project`; (2)
`slugify(title) === slugify(project)`; (3) project room's own `project` field
equals the mission's `project` string; (4) mission `project` equals a mapped
project's `slug` in the R4 manifest.

**Chosen rule: matcher 3, `project-field`** (`--mission-matcher project-field`;
default stays `exact-title`). Why:

- Mission `project` values are legacy slugs (`corner`, `aom`, `None`,
  `agent-*`); project room titles are humanised (`Corner`, `Ahead of Market`).
  Disjoint namespaces, so exact-title resolves 0/302. This confirms R4's
  archive-all was correct under its rule, not a data problem.
- `slug-title` and `manifest-slug` agree exactly (202/0/100) — expected, since
  manifest slugs are `slugify(winner titles)`.
- `project-field` is a strict superset (213/0/89). The only diffs are the 11
  `project='aheadofmarket.com'` missions: the mapped `Ahead of Market` room
  declares its own `project` field as `aheadofmarket.com`, and the missions'
  `legacyRoomId`s read `aom:mission:aheadofmarket.com:<slug>` — two
  independent witnesses that the slug namespace, not the title, is the parent
  link. Biggest win in the set: `Summerschool` (396 human, 2,697 messages).
- `several-mapped` is 0 under every matcher, so the stay-archived-on-several
  clause never triggers on this data (implemented anyway, with candidates
  listed in the reason).
- Scaffolding filter (`humanMessageCount === 0` → archive) removes 92 of the
  213, leaving **121 newly mapped missions** (202→120 and 213→121 restricted
  to humans; verified in-script).

Two structural findings the brief did not anticipate, both load-bearing:

1. **12 duplicate (parent, missionSlug) groups** among human missions (e.g.
   two `Outreach` under Aom with 209+187 humans, two `Bridge` under Corner,
   three `Aerospace Booth Flyer` under Az Tech Council). Siblings sharing one
   slug would share one v2 thread, breaking per-thread checksums and
   double-counting reconcile. Fix: roomId-ordered `-2`/`-3` suffixes (13 rooms;
   titles unchanged). Archiving losers instead would strand thousands of
   real messages; the brief's archive clauses (scaffolding, several-parents)
   do not cover this case.
2. **Remap was impossible**: every newly mapped mission was archived under
   `aom-rehearsal`, and `scriptApplyRoom` skipped any room with a link row
   (the mapped path then threw `has no linked thread`). Fix in
   `convex/v2Migrations.ts` (chunked script path only): a stale
   archive-link from an earlier run is adopted (`reuseLinkRow` patch to
   mapped + new ids + current runId), keeping one row per room in `by_room`.
   Already-mapped project rows are never touched.

First 30 evidence rows
(`roomId | title | project | humanCount | msgs | exact | slug | field | slug`):

```text
jn700qwzy2vjw6yqz9tpw354f18ckhkt | Smoothness Blitz | corner | 0 | 25 | - | Corner + Corner | Corner + Corner | Corner
jn701kbw8yva690w2wb3yj528h8ckfzc | What Project Does Live In | agent-work | 1 | 2 | - | - | - | -
jn701p0bjw95qeej2gj9g7etq18ckvd8 | Lab R55 Supa 1781653626 6 | lab-r55-supa-1781653626-6 | 0 | 3 | - | - | - | -
jn702ycaj5bhnqpgyh00x42x2d8ckwm0 | Cancer Is A Fungus Baking Soda Treatment This Is H | barbara-o-neill | 1 | 3 | - | Barbara O Neill | Barbara O Neill | Barbara O Neill
jn7032p6q14bmsg1sxznrr7s4n8ck5gj | Ai Office Hours | aom | 4 | 10 | - | Aom + AOM | Aom + AOM | Aom
jn703c3xv5vbcdnf3n79cz2hbn8cjfsy | Lab R55 Supa 1781653611 6 | lab-r55-supa-1781653611-6 | 0 | 2 | - | - | - | -
jn703ypba5h632jd7tcrrzacss8ck9tc | Lab R55 Supa 1781653611 4 | lab-r55-supa-1781653611-4 | 0 | 1 | - | - | - | -
jn7053j1b93k4pg5ace3d61zb98cknbg | Nabi 2026 Shoot | nabi | 1 | 9 | - | Nabi | Nabi | Nabi
jn705rspnf7vhr51c1wm5zcww98cjr08 | Website | aztacoboys | 0 | 2 | - | Aztacoboys | Aztacoboys | Aztacoboys
jn706fyxdensch68ckexvj3yw98cj6bw | Left Menu | corner | 21 | 89 | - | Corner + Corner | Corner + Corner | Corner
jn708d7a4nwtnznyzh30g070w18cjb5r | Cg Kitchen | kohrs | 0 | 80 | - | Kohrs | Kohrs | Kohrs
jn70ba8w4phnbfxhctt66pq1cd8cjvm8 | Andocia Deal | aom | 3 | 8 | - | Aom + AOM | Aom + AOM | Aom
jn70ebnt11wxgyxcb5ttnpqpwx8ck6jv | Corner Ui Cv4 | corner | 4 | 58 | - | Corner + Corner | Corner + Corner | Corner
jn70nc7797hhda2p5x4rgjpywh8ckte1 | Lab R55 Supa 1781653789 5 | lab-r55-supa-1781653789-5 | 0 | 2 | - | - | - | -
jn70p5w6667k54bpzvs53j5px18cjh41 | General Followups | corner | 4 | 20 | - | Corner + Corner | Corner + Corner | Corner
jn70p79kb9wattb0h2vxw7fsv18ckapb | Followups | corner | 10 | 20 | - | Corner + Corner | Corner + Corner | Corner
jn70rm2kfbrcvvkv0386eqs4e18cjxe0 | Lab R55 Supa 1781654146 4 | lab-r55-supa-1781654146-4 | 0 | 2 | - | - | - | -
jn70rs9bdtvcp6wv1rs7hjtzf98ck6fd | Room Switcher | corner | 2 | 4 | - | Corner + Corner | Corner + Corner | Corner
jn70xd20dpjfaja7zrj0r2b10n8cjc8a | Agent Recovery Logic | aom-ea | 0 | 1 | - | AOM EA + Aom Ea | Aom Ea | Aom Ea
jn7127v82p321cmts7ny2cw7n98ck56d | Masterclass Pitch Deck | conrad-foundation | 0 | 34 | - | Conrad Foundation | Conrad Foundation | Conrad Foundation
jn713446pmbv7gvyc20jzmra5x8ckztw | Lab R55 Supa 1781653595 6 | lab-r55-supa-1781653595-6 | 0 | 2 | - | - | - | -
jn719cmh9zaakjt8kctwtxxbq18ckacs | Gemini Workers | corner | 7 | 30 | - | Corner + Corner | Corner + Corner | Corner
jn71ahw6d2theexz5kgfjt954s8ckh8d | Website Rebuild | kraken-corps | 0 | 130 | - | Kraken Corps + Kraken Corps | Kraken Corps + Kraken Corps | Kraken Corps
jn71c7x6t9xk8xydvr2na0k8rd8cj0ez | Summerschool | aheadofmarket.com | 396 | 2697 | - | Aheadofmarket.com | Aheadofmarket.com + Ahead of Market | -
jn71fn8j3v7pxc1qqcgac8gyjn8ck4hr | Theme And Density | corner | 1 | 2 | - | Corner + Corner | Corner + Corner | Corner
jn71hggvwbnrwe7qn84pbdag7n8cknad | Billing June 15 | corner | 0 | 25 | - | Corner + Corner | Corner + Corner | Corner
jn71hma3zk95gnshhd0hfjtqh98cjscz | Attachments | corner | 2 | 4 | - | Corner + Corner | Corner + Corner | Corner
jn71hns7zcyk3eyzjs1f4vxzdh8cjydw | Native Ios | corner | 2 | 19 | - | Corner + Corner | Corner + Corner | Corner
jn71pr5vqebdvv0fyxxf2emyb98ckvxw | Photo Bank | photo-bank | 1 | 16 | - | - | - | -
jn71r0qn8sdwjv5chtmwjsz3g58cjq75 | Outreach | aom | 209 | 259 | - | Aom + AOM | Aom + AOM | Aom
```

(Full 302-row output re-runnable via the script; `+` joins multiple candidate
rooms, `-` none. Note `Aom + AOM` / `Corner + Corner`: two same-slug rooms,
only one MAPPED — mapped-level score stays exactly-one.)

## Manifest + applies

`--mission-matcher project-field` added to `scripts/v2-verify.mjs`
`--generate-manifest` (default stays `exact-title`; unknown names throw).
New `tests/v2/mission-matcher.test.ts` (6 tests: default stability,
project-field mapping, scaffolding, several-archive with candidates listed,
`-2` disambiguation order, unknown-matcher throw).

```bash
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-r12 --generate-manifest docs/superpowers/migrations/aom-v2-mapping.r12.json --mission-matcher project-field
# manifest: rooms=845 messages=43723 mapped=168 legacy_archive=677 duplicateGroups=6 scaffolding=39 missionMatcher=project-field -> docs/superpowers/migrations/aom-v2-mapping.r12.json
#   duplicate title 'Brand': jn730j2..., jn7bv1... (same 6 groups as R4)
#   [... 6 identical groups ...]
# stopping for review: inspect the manifest before --apply
```

Offline review of the NEW file (applied `aom-v2-mapping.json` untouched):
same 845 rooms; 47 mapped projects byte-identical to R4; 121 mapped
missions, every parent mapped, zero duplicate (parent, slug), 13
disambiguated; archived = 172 scaffolding + 5 `parent 'null'` (incl.
Support Desk ×2 with 72+120 humans — no parent, stays archived) + 4
dead-slug parents (`agent-work`, `photo-bank`, `health-app`, `agent-hooks`;
the Agent Hooks project room itself is scaffolding).
Manifest fnv1a64 `7f2bf673f5d9b140`; `sourceExportSha256` = backup sha.

Rehearsal (`dev:adjoining-tiger-87`), run `aom-r12`:

```bash
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-r12 --mapping docs/superpowers/migrations/aom-v2-mapping.r12.json --audit docs/superpowers/audits/2026-09-06-aom-r12-reconciliation.json --apply
# FIRST:  manifest: decisions=845 fnv1a64=7f2bf673f5d9b140
#         backup: sha256=5c7be963...106ad (matches manifest)
#         source: rooms=845 messages=43723 sha=4f730821...
#         approve: runId=aom-r12 sha=7f2bf673f5d9b140
#         apply: projects=0 missions=121 threads=121 links=16013 archived=0 skipped=0
#         reconcile: source=43723 linked=16013 duplicates=0 unlinkedArchived=27710 threads=168 projects=47 missions=121
#         sealed: runId=aom-r12 state=applied
#         checksumMatches: true (threads verified 168/168)
#         wrote docs/superpowers/audits/2026-09-06-aom-r12-reconciliation.json
# SECOND: apply: projects=0 missions=0 threads=0 links=0 archived=0 skipped=121
#         (same reconcile + 168/168; audit rewritten)
# THIRD (after skipped-counter fix, re-pushed functions): apply: projects=0 missions=0 threads=0 links=0 archived=0 skipped=845
#         (same reconcile + 168/168)
```

Zero inserts on re-runs; zero duplicate links; zero changes to the 47
projects (insert counters 0; their link rows untouched, still `aom-rehearsal`).
Integrity arithmetic across both runs: 8,630 (project links, R4) + 16,013
(mission links, R12) = 24,643 linked of 43,723; 19,080 archived-unlinked
(35,093 − 16,013 newly mapped). `threads=168` counts rooms with threads under
either run id (run-scoped `linked` counts only `aom-r12` links — see
deviations).

Production clone (`--env-file .env.production-clone`, clone key; functions
deployed first via deploy key, verified `Deployed Convex functions to
https://brilliant-scorpion-163.convex.cloud`):

```bash
# CLONE FIRST:  apply: projects=0 missions=121 threads=121 links=16013 archived=0 skipped=724
#               reconcile: source=43723 linked=16013 duplicates=0 unlinkedArchived=27710 threads=168 projects=47 missions=121
#               sealed ... checksumMatches: true (threads verified 168/168); wrote /tmp/r12-clone-audit.json
# CLONE SECOND: apply: projects=0 missions=0 threads=0 links=0 archived=0 skipped=845
#               (same reconcile + 168/168)
```

Identical numbers on both deployments.

Gates + status for `aom-r12` on both (rehearsal `--audit` = committed file,
clone `--audit /tmp/r12-clone-audit.json`):

```bash
# rehearsal --gates: seven passed=true; status: mode=v2_dual_write allGreen=true failed=(none)
# clone     --gates: seven passed=true; status: mode=v2_dual_write allGreen=true failed=(none)
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-r12 --status --mapping docs/superpowers/migrations/aom-v2-mapping.r12.json
# status: mode=v2_dual_write allGreen=true failed=(none) (+ 7 gate lines, all passed=true)
# (same with --env-file .env.production-clone on the clone)
```

## Part B — convex-test scheduler noise (cause fixed, no prod change)

Before (`npm test`, exit 1 — 144 passed but `Errors 4 errors`):

```text
Vitest caught 4 unhandled errors during the test run.
---- Unhandled Rejection ----
Error: Write outside of transaction 10014;_scheduled_functions
 ❯ DatabaseFake._addWrite node_modules/convex-test/dist/index.js:77:19
 ... (×4: 2 "originated in tests/v2/cutover.test.ts", 2 in tests/v2/compat-fixtures.test.ts)
 Test Files  16 passed (16)
      Tests  144 passed (144)
     Errors  4 errors
```

Cause: `sendMessageCore` (and hence `messages.sendMessage` and the compat
bridge `sendRoomMessage`) registers `ctx.scheduler.runAfter(0,
internal.ai.dispatchMessage, …)`. Under convex-test that is a real
`setTimeout(0)`; when it fires after the test transaction closes, the
`_scheduled_functions` bookkeeping patch lands outside any transaction. The
scheduled target is an `internalAction` with no action runtime under
convex-test, so running it is never what a test wants.

Fix (tests only — production code untouched, no test-env branching):
`vi.useFakeTimers()` (restored in `finally`) in the two send tests, so the
0ms callbacks never fire. `finishAllScheduledFunctions(vi.runAllTimers)` was
the wrong tool here — it would *run* the action. Also removed R4's
`--dangerouslyIgnoreUnhandledErrors` mask from the `--gates` compat
subprocess so the gate trips on any future noise (verified the suite passes
unflagged, 18/18).

After (`npm test`, exit 0):

```text
 Test Files  17 passed (17)
      Tests  150 passed (150)
```

Zero `Unhandled` lines. 150 = 144 + 6 new `mission-matcher` tests.

## Part C — stray deployment `lovable-weasel-178`

- `npx convex deployment --help` lists only
  `select | create | token | usage | usage-limits | help` — **no delete/remove
  subcommand**, so per the brief nothing was deleted.
- Emptiness (reads only, `--deployment lovable-weasel-178`): `worlds`,
  `messages`, `rooms`, `ledger`, `projects`, `missions`, `threads`,
  `messageLinks`, `legacyRoomLinks` — all print
  `There are no documents in this table.` Verifiably empty; name is exactly
  `lovable-weasel-178`. (Note: it must be addressed by bare name — a
  `prod:<name>` reference is rejected as reserved-format, and
  `team:project:<name>` 400s.)
- Dashboard steps (not executed): open
  `dashboard.convex.dev/t/patrik-matheson/corner` → Settings → Deployments →
  `lovable-weasel-178` → Delete. Do not touch `neat-pony-216`,
  `descriptive-flamingo-718`, `adjoining-tiger-87`, or
  `brilliant-scorpion-163`.

## Gates (final code)

```bash
grep CONVEX_DEPLOYMENT .env.local
# CONVEX_DEPLOYMENT=dev:adjoining-tiger-87 # team: patrik-matheson, project: corner
npm test
#  Test Files  17 passed (17) / Tests  150 passed (150), exit 0, zero Unhandled
npx tsc --noEmit -p tsconfig.json   # exit 0
npx convex dev --once               # ✔ Convex functions ready! (rehearsal)
npm run parity:v2
# tables: 56/56 present / functions: 291/291 present
node scripts/v2-verify.mjs --workspace k1798fjd7haec6r0ywkqzv5j858cgahm --run-id aom-r12 --status --mapping docs/superpowers/migrations/aom-v2-mapping.r12.json
# status: mode=v2_dual_write allGreen=true failed=(none)
# (clone via --env-file .env.production-clone: identical)
```

## Deviations (all load-bearing, none silent)

1. **No `--deployment` flag exists in `scripts/v2-verify.mjs`** — unknown args
   are silently ignored, so the brief's `--deployment …` form would have run
   against REHEARSAL. Used `--env-file .env.production-clone` on all clone
   runs (R4 deviation 6 pattern). Recommend adding (or explicitly rejecting)
   `--deployment` in the script.
2. **Remap support** (`convex/v2Migrations.ts`, chunked script path only):
   stale archive-links from an earlier run are adopted via `reuseLinkRow`
   instead of inserting a second row. Side effect: a live re-reconcile of run
   `aom-rehearsal` would now leave those 121 rooms unattributed (its committed
   audit JSON is unchanged). Product single-room apply keeps skip-if-linked.
3. **`skippedExisting` counter**: was same-run-only (re-run showed
   skipped=121 with 724 rooms silent). Now counts every room needing no work;
   re-runs show skipped=845. No write-behavior change.
4. **Slug `-2` suffixes** (13 rooms, 12 groups): only way to keep per-thread
   checksums with duplicate mission titles under one parent.
5. **Karen regen note**: current ZIP+live Karen rooms all carry
   `humanMessageCount: 0`, so regenerating Karen's manifest today maps 0
   under *both* R4 and R12 code — pre-existing drift (its committed manifest
   came from an older script with different reason strings). `exact-title`
   matching semantics are unchanged; the default is still the default.
6. **Clone deploy needed 3 attempts**: twice `Environment variables have
   changed during push` (no env edits by me; names stable), third succeeded
   to `brilliant-scorpion-163`. Deploy key `r12-deploy-key` (token) still
   exists on the clone — revoke-or-keep is an orchestrator call. `.env.local`
   verified untouched after every deploy.
7. **R11 worker concurrent in this worktree** (`R11-native-models-nav`,
   editing `e2e/live.spec.ts` + `playwright.config.ts`): left alone, unstaged,
   uncommitted by me. No file overlap with this round.
8. Clone audit lives at `/tmp/r12-clone-audit.json` (uncommitted scratch, like
   R4's); the committed audit is the rehearsal one. Deploy-key material in
   `/tmp/r12-deploy-key` (secret, never printed).

## Commit

```bash
git add scripts/v2-mission-parents.mjs scripts/v2-verify.mjs docs/superpowers/migrations/aom-v2-mapping.r12.json docs/superpowers/audits/2026-09-06-aom-r12-reconciliation.json tests/v2/mission-matcher.test.ts tests/v2/cutover.test.ts tests/v2/compat-fixtures.test.ts convex/v2Mapping.ts convex/v2Migrations.ts
git commit -m "feat: map AOM missions by slug parent and quiet convex-test scheduler noise"
git log --oneline -3 && git status
```

(`convex/v2Mapping.ts` staged if changed — it was not; kept in the pathspec
as briefed. Test files staged explicitly, not the `tests/v2` directory:
concurrent workers are editing elsewhere in the tree and a directory pathspec
could sweep foreign changes. Everything else foreign (`e2e/live.spec.ts`,
`playwright.config.ts`, `src/*`, …) NOT staged.)

Actual output:

```bash
# [codex/corner-v2-integration c6c0d24] feat: map AOM missions by slug parent and quiet convex-test scheduler noise
#  8 files changed, 12100 insertions(+), 62 deletions(-)
# c6c0d24 feat: map AOM missions by slug parent and quiet convex-test scheduler noise
# 184c576 feat: add reversible v2 cutover gates and the production clone
# 3bea983 feat: close native contract gaps and make v2 reads subscribable
# (remaining tree changes are other workers' — left unstaged)
```

No push, per hard rules.

## Hard rules kept

Applied manifest never overwritten; `neat-pony-216` zero calls; no deployment
deleted; no test-env branch in product code; no `git add -A`; no push.
