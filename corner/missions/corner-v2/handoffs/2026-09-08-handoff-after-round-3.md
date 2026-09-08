# Handoff — Corner v2, what's left (2026-09-08, 11:30 AM Phoenix; loop stopped after Astra Round 3)

Written by Claude when Patrik stopped the loop. Whoever picks this up (Patrik, Astra/Codex, a fresh Claude
session): read `STATUS.md`, `PLAN-astra-finish.md`, and this file; nothing else is required to start.

## Where it stands
- **Chat (test A) is one firing from closing.** Re-proof this morning, as Patrik on aheadofmarket.com/dashboard:
  Wolfpack 8 · Ambition 8 · Kraken 7 · Aom 8 · AZ Tech 7.5 (of 8). Evidence: `rounds/GOAL-walk-4.md`.
  Production chat = contract `r53-1` (`AOM-EA/scripts/v2-team-bridge.py`, launchd `com.aom-ea.corner-v2-bridge`
  :3100; demo bridge :3099 on the e2e design thread). Backend = Convex clone `brilliant-scorpion-163`,
  corner-v2-integration `691be77`. Gateway `AOM-EA/scripts/gateway/corner-gateway.py` (:3110) at AOM-EA
  `01894114e`: uncapped id map, published weekly reports as pull-up links, sibling facts, one opening step.
- **Native:** TestFlight build 19 (R42: CV6 composer, command card, thread rows, loader, glow; commit
  `7c3c3c21` on aom-studio) is submitted and WAITING_FOR_REVIEW; build 18 is on Patrik's phone.
- **Desktop:** production = the R43 tree; R44 (artifact links + composer glow) not started.
- **Plan:** `PLAN-astra-finish.md` (15 rounds). Rounds 1-3 done. Round 4 next.

## Known issues (as of 11:30 AM)
- **Phone documents** render through QuickLook (HTML fine, markdown as plain text). Needs the desktop's reader
  look: `src/v2/markdown.ts` (`renderDocument`: rendered markdown, dates as words, metadata header → one
  "Updated …" line) and the calm Dracula palette in `visual-window.css` (`.v2-doc-pane--dark/--light`,
  `.v2-doc-reader`), light option = Alucard, toggle stored as `v2-doc-theme`.
- **Pull-up scoring counts the project's own name.** "Kraken Corps logo review sheet" opened "Kraken Corps --
  Project Context" (2 of 5 tokens = 0.4 ≥ the 0.34 bar). Drop the subject's name tokens from the query in
  `pullup_tokens` (bridge) and `overlapScore` (`convex/lib/stateCard.ts`), then that ask is an honest miss.
- **Big videos never open.** The 85 MB Elephante cut breaks the Convex upload; the gateway needs the ffmpeg
  720p ≤ 20 MB preview (C020, G7).
- **Internal notes read like internal notes.** The reader makes words readable; it cannot rewrite "Option D
  (General Contractors page, 200)". If documents are for Patrik or clients, the writing rule belongs in
  `WRITING-RULES.md` / the agents' brief, not the renderer.
- **Thin ledgers:** Kraken Corps and AZ Tech Council have nothing logged since Aug 25 (backfill found no
  relevant sessions); "latest" reads honest but empty until real work is logged there.
- **Codex** is out of usage credits until ~1:25 PM Sep 8; Codex-owned rounds fall to Claude by hand until then.
- **Wolfpack week 6 draft** auto-sends Friday Sep 12 at noon with "Look forward to talking this morning" in the
  intro, to Ross only (Robert and Brian are not on the recipient list). Patrik edits it in the /reports editor.
- **Walk tooling:** the Claude-in-Chrome extension dropped once mid-batch (Sep 8, 8:15 AM) and re-sent three
  Ambition questions; keep walk batches to one project.

## Do next, in order (each = one visible round)
1. **Round 4 — clear + clean re-run (test A).** Call `clearThread` on the Wolfpack, Ambition, Kraken Corps, Aom,
   AZ Tech Council project threads (the bridge's `v2Workspace` has it; thread ids are in the dashboard URLs:
   Wolfpack `vd73p369…`, Ambition `vd70rphf…`, Kraken `vd72vb3k…`, Aom `vd79n1s3…`, AZ Tech `vd79662p…`),
   verify each is empty, ask the four questions again in Patrik's Chrome, grade, write
   `rounds/GOAL-clean-rerun.md`. ≥ 7/8 everywhere closes test A. One known soft spot to fix first or accept:
   "pull up the Kraken Corps logo review sheet" opens the project context doc because the project's own
   name words count toward the 0.34 match bar — drop the subject's name tokens from the pull-up score
   (`pullup_tokens` / `overlapScore` in bridge + `convex/lib/stateCard.ts`).
2. **Round 5 — R43 native (Muse builder), then TestFlight 20.** Brief: `briefs/R43-native-home-first-and-eye.md`.
   Launch: `cd aom-studio/corner/missions/corner-v2 && ./run-worker.sh briefs/R43-native-home-first-and-eye.md xhigh 450`
   (one builder at a time; check file activity + child processes every 20 min; idle 20 min = kill, finish by
   hand). Targeted gates only; the full set once before the ship. Ship recipe: clean worktree at the commit →
   archive Release with `CURRENT_PROJECT_VERSION=20` → export (`Support/ExportOptions-AppStore.plist`) →
   `xcrun altool --upload-app` → `python3 tools/testflight-attach.py 20`.
3. Rounds 6-15 as written in `PLAN-astra-finish.md` (view state → phone companion → TestFlight 21 → desktop
   R44 → desktop eye/multi-chat → production → G7 → punch-list → final acceptance).

## Added 10:05 AM — documents did not render on desktop (Patrik's catch)
Every md/html document opened as a wireframe on desktop until R55 (`src/v2/ArtifactStage.tsx` DocStage + `src/v2/markdown.ts`, deployed). Grading rule from now on: a pull-up counts as opened only when the content is visible on the stage — screenshot the stage, not the tab list. On the phone, documents go through QuickLook (HTML renders; markdown shows as plain text): fold a markdown renderer into the native rounds, matching the desktop's Dracula reader (R57: rendered markdown via `src/v2/markdown.ts` renderMarkdown inside `.v2-doc-reader`, palettes `.v2-doc-pane--dark/--light` in `visual-window.css`, 21px sans, no line numbers; R58 `renderDocument` also turns ISO dates into words and a metadata header into an "Updated …" line; Alucard light toggle stored as `v2-doc-theme`). The phone reader must do the same: people, not machines, read these.

## Things to know before touching anything
- **Codex (Astra) usage limit** was hit at 9:21 AM (753k tokens on R54); it resets ~1:25 PM. Rounds owned by
  Codex before then fall to Claude by hand. Run it with:
  `codex exec -s workspace-write -c 'sandbox_workspace_write.network_access=true' -C aom-studio --add-dir AOM-EA --add-dir corner-v2-integration --add-dir /tmp "<prompt>"`.
- **Never** write to the live Convex `neat-pony-216` (the reports store there is read-only for us), never push
  aom-studio, never print keys/tokens (KIE `~/.config/kie-api-key.env`, ledger `~/.config/corner/ledger.env`,
  ASC `~/.config/appstoreconnect.env`, deploy key `/tmp/r18-deploy-key`). Automated native runs only on the
  test simulators (17 Pro `971E7446…`, "iPhone 16e (tests)" `4818124A…`); Patrik's 16e `0A05C9AA…` is his panel.
  No sends on Patrik's project threads except labelled walks as him; proofs on the design thread
  (`tools/design-thread-walk.py "<text>"`). KIE.ai is the only image generator. Never modify Patrik's connectors.
- **Chrome walks:** the Claude-in-Chrome extension dropped once mid-batch and re-sent three Ambition questions
  (8:15 AM duplicates in that thread). Keep batches to one project.
- **Ledger rules:** infra work tags `corner`, never a client; mistakes get a `Correction:` row with
  `links: ["ledger:<id>"]`, never a delete. Cards rebuild with `projectCards:rebuild {token, world, subject}`
  (token read from the env file in Python, never on a command line).

## Health checks (30 seconds)
`curl -s 127.0.0.1:3100/health` (contract r53-1, failedTicks 0) · `curl -s 127.0.0.1:3099/health` ·
`curl -s 127.0.0.1:3110/health` (ok, token_present) · `python3 scripts/test_v2_team_bridge.py` (240) ·
`python3 scripts/gateway/tests/test_gateway.py` (105) · `cd corner-v2-integration && npx vitest run tests/v2/` (178).
Restart: `launchctl kickstart -k gui/$(id -u)/com.aom-ea.corner-v2-bridge` (and `…-demo-bridge`, `…corner-gateway`).

## Patrik's own list
- Wolfpack week 6 draft in the /reports editor auto-sends **Friday Sep 12 at noon** with the intro "Look forward to
  talking this morning" — edit that line before then. Recipients there = Ross only; add Robert and Brian if
  they should get it (week 5 went to Ross only on Sep 4).
- Disable the unused desktop connectors (agent memory, Context7, DaVinci Resolve, Chrome DevTools, Playwright
  MCP, iMessage); confirm the seven hedged facts; APNS key; delete `lovable-weasel-178`; revoke the three old
  deploy keys; macOS 26.6.2 → Xcode 26.6 only for direct phone installs.
