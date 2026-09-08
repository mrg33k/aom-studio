# Handoff to Astra (Codex) — make the finishing plan for Corner v2

Written 2026-09-08 by Claude (the orchestrator session that ran the 2026-09-07 loop). Astra's job: read this,
read the compass files, and write **`corner/missions/corner-v2/PLAN-astra-finish.md`**: the ordered rounds
that take Corner v2 from where it is tonight to "done", each with an owner (Claude by hand / one Muse Spark
1.3 builder / Codex), a step cap, its gate, and its evidence file. Plan first; nobody builds from this
handoff until Patrik says go.

## Definition of done (Patrik's pick, unchanged)
- **A. Chat knows every project.** As Patrik in his Chrome on aheadofmarket.com/dashboard, for Wolfpack,
  Ambition, Kraken Corps, Aom, AZ Tech Council: latest / next + waiting / a fact / "pull up <file>" → each
  project ≥ 7 of 8, no fabricated or mis-dated fact, no filesystem path ever, the file opens in the Visual
  Window with a working link within 5 s and the reply within 15 s. Then every project chat cleared
  (`clearThread`) and the four questions re-asked from empty: still ≥ 7 of 8.
- **B. Visual Window companion** (`SPEC-visual-window-companion.md`). Phone: eye icon cycles FaceTime →
  full → hidden; a file the agent talks about opens, moving on closes it; a website reviews as a horizontal
  video on the vertical phone. Desktop: eye icon, condensed multi-chat (≤ 8) with one context window. The
  agent knows what both surfaces are looking at (view state in its pack).
- **C. Styled per the design files** on phone and desktop, shipped to TestFlight and production.

## Where we are (2026-09-08, 12:30 AM)
- **Chat (lane 1) is nearly there.** Walk 3 scores: Wolfpack 8/8 · Ambition 7.5/8 · Kraken 6.5/8 · Aom 6/8
  (8/8 on the re-proof after R53) · AZ Tech 6.5/8. Evidence: `rounds/GOAL-walk-3.md`. Production chat
  contract `r53-1` (`scripts/v2-team-bridge.py`, launchd `com.aom-ea.corner-v2-bridge` :3100; demo bridge
  :3099 pinned to the e2e design thread). Backend clone `brilliant-scorpion-163` at corner-v2-integration
  `2eab0de`+. Web production = R43 tree.
- **Native:** TestFlight build 19 (R42: CV6 composer pill, command card, thread rows, living loader,
  composer glow; commit `7c3c3c21` on aom-studio) submitted 9:56 PM, WAITING_FOR_REVIEW. Build 18 (R41 home
  welcome) is on Patrik's phone.
- **Ledger + cards (the agents' memory):** organization ledger on Convex (`convex/ledger.ts`), gateway daemon
  `scripts/gateway/corner-gateway.py` (:3110, 5-min ticks, files index, `/gateway/open`), Stop hook
  `scripts/hooks/ledger-append.py`. Tonight: OPEN facts resolve against ledger deeds (`resolvedByLedger`),
  corrected/vague rows hidden from readers, infra work never tagged to clients, titled tick sentences,
  dotted project folder `aheadofmarket.com` indexed as `aheadofmarket-com`, site week pages indexed.
- **Compass files:** `STATUS.md` (one screen, current), `GOAL-chat-knows-every-project.md` (test A),
  `SPEC-visual-window-companion.md` (test B), `punch-list.md` (rows C/L/P with status), `rounds/LEDGER.md`
  (every round tonight with commits), `rounds/R5x-*.md` and `rounds/G6-*.md` (reports),
  `~/.claude/plans/fuzzy-cuddling-hopcroft.md` (the approved plan this loop ran).

## What is left (in the order the approved plan runs them)
1. **Walk 4 → clean re-run (test A).** Re-score all five projects (four questions each); fix misses as
   rounds, not side quests; when all ≥ 7/8: `clearThread` on every project thread, re-ask from empty, record
   `rounds/GOAL-walk-4.md` + `GOAL-clean-rerun.md`. Known thin spots: Kraken Corps and AZ Tech Council have
   almost no ledger rows (the backfill found nothing relevant since Aug 10); their "latest" reads honest but
   empty until real work is logged. Ambition's 6:20 PM captions delivery (three files to Google Drive) never
   reached the ledger — find that session's hook run.
2. **Native R43 → TestFlight 20.** Brief exists: `briefs/R43-native-home-first-and-eye.md` (P097 app opens
   on the home screen, never the last thread; P096 three distinct ledger-driven suggestion cards; P094/P095
   eye icon top-right of every chat cycling FaceTime → full → hidden). Targeted gates only (units + touched
   suites + one design-gate pass on the 390 test sim); the full set once before the ship.
3. **Backend view state + agent-driven open/close.** `viewState {threadId, mode, tabId, page, scroll}`
   written by the clients, read into the chat pack (the agent knows what both surfaces show); agent opens a
   file on mention and closes it on move-on; one chat round to narrate through the window.
4. **Website-as-video on the phone → TestFlight 21.** Phone half of B passes.
5. **Desktop R44** (`briefs/R44-desktop-artifact-link-and-glow.md`): `?artifact=<id>` focus links land on
   the artifact; composer glow synced to the chat's color. Then desktop eye icon, FaceTime mode, condensed
   multi-chat with one context window. B passes.
6. **Gateway G7.** Big-video previews (ffmpeg 720p ≤ 20 MB for files over 20 MB; the 85 MB Elephante cut
   still cannot open — C020); `/gateway/open` should reload the index on an unknown id before answering 404;
   the sibling order for pull-ups must keep the site folder first; the tick sentence for site pages.
7. **Punch-list sweep.** `punch-list.md` rows still open (desktop sidebar/visual-window rows P0xx from the
   design compare, chat rows C0xx). Astra decides which ride with which round.

## Rules that stay in force (do not plan around them)
- One Muse builder at a time; step cap ≤ 450; check its file activity and child processes every 20 min;
  idle 20 min = kill and finish by hand. No background watcher tasks. Rounds are visible Claude rounds
  (`/loop`), one per firing, ending with a ledger row + `STATUS.md` + one status line.
- Automated native runs only on the test simulators (17 Pro `971E7446-…`, "iPhone 16e (tests)"
  `4818124A-…`, 17 Pro Max `C261F6F2-…`); Patrik's 16e `0A05C9AA-…` is his viewing panel. Erase app +
  `defaults delete com.aheadofmarket.corner cv6-theme` before suites. No full simulator gate per round.
- Never write to the live Convex `neat-pony-216`; never push aom-studio (commit locally, hand off as files);
  never print keys/tokens (KIE `~/.config/kie-api-key.env`, ledger `~/.config/corner/ledger.env`, ASC
  `~/.config/appstoreconnect.env`, deploy key `/tmp/r18-deploy-key`, read in scripts only).
- No sends on Patrik's project threads except labelled walks as him; proofs go on the e2e design thread
  `vd7f0v4dn3kjjx9qnt9acryemn8dyr95` (`tools/design-thread-walk.py "<text>"`).
- Never modify Patrik's connector/MCP settings; advise only. KIE.ai is the only image generator.
- Chat quality is judged by real conversations on the dashboard and the phone, never by fixtures.

## Recipes that work (copy them, do not rediscover)
- Backend deploy: `cd corner-v2-integration && CONVEX_DEPLOY_KEY="$(tail -1 /tmp/r18-deploy-key)" npx convex deploy -y`;
  tests `npx vitest run tests/v2/` (177 green). Masked "Server Error" → read the function's validators first
  (tonight it was a "/" in a synced title), then `npx convex logs`.
- Web production: `npx vercel link --yes --project corner-convex` → `VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site npx vercel build --prod --yes` → `npx vercel deploy --prebuilt --prod --yes` → relink.
- Chat bridge: edit `scripts/v2-team-bridge.py`, `python3 scripts/test_v2_team_bridge.py` (237 green),
  `launchctl kickstart -k gui/$(id -u)/com.aom-ea.corner-v2-bridge` (+ `…-demo-bridge`), `/health` shows the
  contract. Gateway: `python3 scripts/gateway/tests/test_gateway.py` (102), kickstart
  `com.aom-ea.corner-gateway`, `python3 scripts/gateway/corner-gateway.py --sync-once <subjects>`.
- TestFlight: clean worktree at the commit → `xcodebuild … -configuration Release -archivePath … CURRENT_PROJECT_VERSION=<n> archive`
  → `xcodebuild -exportArchive … Support/ExportOptions-AppStore.plist` → `xcrun altool --upload-app` →
  `python3 tools/testflight-attach.py <n>` (attaches to "Corner testers" and submits beta review once Apple
  reports VALID). Build 19 = tonight; next is 20.
- Cards: `projectCards:rebuild {token, world, subject}` with the ledger token (never on the command line —
  read the env file in Python). Ledger rows: `ledger:append`; a mistake gets a `Correction:` row with
  `links: ["ledger:<id>"]`, never a delete.

## Blocked on Patrik (carry in the plan as such)
Disable the unused desktop connectors (agent memory, Context7, DaVinci Resolve, Chrome DevTools, Playwright
MCP, iMessage — the load and every stalled worker trace back to their churn); confirm the seven hedged
facts; APNS key rotation; delete Convex `lovable-weasel-178`; revoke the three old deploy keys; macOS 26.6.2
→ Xcode 26.6 only if he wants direct phone installs again.

## What the plan must contain
Ordered rounds (numbered, one per loop firing), each with: owner, inputs (brief/spec/report paths), the
exact gate, the evidence file, the step cap, and the "still off" carry-forward. A first line that names the
current tick and the next action. Nothing that re-litigates the definition of done.
