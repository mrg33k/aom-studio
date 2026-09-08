# Brief R54-chat-walk-4-repairs — close every walk 4 miss (Astra plan, Round 2)

Mission: `corner:corner-v2` (chat lane + gateway). Owner: Codex. Step cap 350. Read
`rounds/GOAL-walk-4.md` (the misses, numbered), `GOAL-chat-knows-every-project.md`,
`rounds/R53-chat-combined-asks-and-siblings.md`, `../../../../corner/missions/gateway/rounds/G6-videos-open-and-honest-attribution.md`,
`PLAN-astra-finish.md` Round 2. Report: `rounds/R54-chat-walk-4-repairs.md` (before/after per miss, tests run,
"still off"). Commit scoped in each repo; never push aom-studio; never print tokens/keys; live proofs only
on the e2e design thread `vd7f0v4dn3kjjx9qnt9acryemn8dyr95` (`tools/design-thread-walk.py "<text>"`).

Code: gateway `AOM-EA/scripts/gateway/corner-gateway.py` + `gateway_common.py` (+ `tests/test_gateway.py`),
chat bridge `AOM-EA/scripts/v2-team-bridge.py` (+ `test_v2_team_bridge.py`, plain python3), backend
`corner-v2-integration/convex/{projectFiles,projectCards,ledger}.ts` + `convex/lib/stateCard.ts`
(+ `tests/v2/*.test.ts`, `npx vitest run tests/v2/`; deploy ONLY with
`CONVEX_DEPLOY_KEY="$(tail -1 /tmp/r18-deploy-key)" npx convex deploy -y` to brilliant-scorpion-163).
Reports store (read-only for you): `aom-studio/api/_lib/reportsStore.js` (neat-pony `reports:latest`,
`reports:getWeek`), public pages `aom-studio/api/report-page.js` → aheadofmarket.com/<client>/week-N.

## Build (one reproducer + one scoped fix each)
1. Gateway open must resolve any file the backend lists: keep an uncapped `ids` map (id → repo, path, kind,
   name, title) in `corner-gateway-files.json` next to the capped per-subject lists; `/gateway/open` looks the
   id up there (fall back to a fresh walk when missing) before answering 404. Unit test: a file past the
   cap opens. Also stop the doubled "Opening…" step: emit it once per turn.
2. Published weekly reports are pull-up targets: per client (wolfpack, ambition, kohrs, ella) the gateway
   sync adds URL-kind rows "<Client>: Week N" for every published week (read `reports:latest` + `reports:getWeek`
   from neat-pony, read-only), newest first; `/gateway/open` on a URL row creates a `web`/link artifact (no
   upload) that opens in the Visual Window with the dashboard link. "Pull up the latest Wolfpack weekly
   report" → Week 5 (Sep 4). Convex-test + bridge test.
3. Sibling facts in the pack: when the chat's subject has siblings (R53 `sibling_subjects`), the pack's
   (0) STATE CARD section carries the sibling cards' confirmed facts too (marked with the sibling's name),
   capped; "which fonts are banned / what hero format is locked" on Aom answers from aheadofmarket-com's
   FACTS. Also sync `corner/users/aom/projects/aheadofmarket.com/FACTS.md` (create it from the memory rules
   below if absent: hero LOCKED to the MasterClass format; Syne banned; monogram = official logo) so the card
   has them. Bridge test on the Aom pack.
4. Ambition's Sep 7 6:20 PM captions delivery: find the session in `~/.claude/projects/*/` transcripts (grep
   "ELEPHANTE PT2 Title Overlays"), run the Stop hook comprehension on it (`scripts/hooks/ledger-append.py
   --transcript <path> --dry-run` to preview, then post) so one Ambition `did` row with the real time lands.
5. Re-sync files (`corner-gateway.py --sync-once wolfpack ambition-mechanical kraken-corps az-tech-council
   aom aheadofmarket-com`), restart the gateway + bridges (`launchctl kickstart -k gui/$(id -u)/com.aom-ea.corner-gateway`,
   `…corner-v2-bridge`, `…corner-v2-demo-bridge`), and prove on the design thread: a past-the-cap file opens;
   "pull up the latest weekly report" names Week 5 with a link.

## Gates
gateway tests, bridge tests, hook tests, `vitest tests/v2/` all green; the five proofs on the design thread in
the report with timings; zero sends on Patrik's project threads; no score claims (Round 3 re-proves).
