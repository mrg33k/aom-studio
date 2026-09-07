# R41 — native home welcome: General-empty is a ledger-driven welcome screen

`corner:corner-v2` · BUILDER (native iOS) · 2026-09-07 · mission
`corner/missions/corner-v2/` · extends R40 (its native lane) + the desktop
"new" screen (`rounds/evidence/R18-new-design.png`).

Backend taken as deployed on production (`brilliant-scorpion-163`): no
backend changes. `ledger:latest {world, limit}` and
`v2Workspace:getNavigation {}` both behaved as specified (verified by
read-only probe before building — see below). The R48 server-side noise
filter is live on production: `corner-v2-chat` run rows and Visual Window
open/close/pin rows no longer read back; the client still filters the
brief's patterns itself, so an older backend stays clean too.

## Before → after

Before: the General thread with no messages showed the crossed-out
empty-state bubble ("No messages yet — say something.") under a nav titled
"General".

After: that thread IS the home — a welcome screen with three things to get
started on, drawn from the ledger. Nav keeps its layout (hamburger left,
status dot right) and shows no title. Content column, top to bottom:
centred `CornerLogo` asset (~24pt, ink — part of the welcome, not a nav
change), a sparkle-tile illustration in the app's own tile language, the
welcome line, three full-width cards; the composer stays docked with
"Tell General what to make next". Scrolls as one column.

Suggestions: `ledger:latest` for the account's world (limit 60) → drop
noise → group by subject → three freshest subjects that resolve to
navigation → fill the rest with the desktop's onboarding rows in order
(Bring in your context · Connect where the work lives · Start your first
project); none → all three onboarding rows. Each ledger card = project
name from navigation + newest ledger sentence on one line + chevron; tap
opens that project's thread with the composer pre-filled "Pick up where
we left off on \<project\>." (staged as a draft, never sent). A mission
subject resolves to its parent project. A card naming the thread already
showing (General's own card) pre-fills in place.

Cards match the design rows: 56pt tile, 15 semibold title, 13 muted sub,
chevron; 12pt gaps; raised surface on ground, hairline, 12pt radius. No
new colours (ledger tiles reuse project tints, the drawer's pattern).

Live proof (`rounds/evidence/R41-home-live.png`, 17 Pro): logo, "Welcome"
alone (the e2e account's name carries a "+" — the name rule firing), three
real ledger-driven cards, docked composer, no title. The e2e world is a
degenerate single-active-project account, so all three cards resolve to
Aster with different sub-lines (no project dedupe — the brief's literal
algorithm; see Still off 1).

## What shipped (files)

- `ios-native/Corner/Views/V2HomeWelcome.swift` (new): `HomeSuggestion`,
  `HomeSuggestions.build` (pure) + `welcomeFirstName` + `oneLine`,
  `V2HomeModel` (the two reads, failure → onboarding), `V2HomeWelcomeView`.
- `ios-native/Corner/Models/CornerV2DTO.swift`: `V2NavNode` (with the
  backend's `slugify` mirrored as the subject↔title join key) +
  `WorldLedgerItem` (freshness = `atMs`, then `at`).
- `ios-native/Corner/Services/CornerV2API.swift`: `navigation()` +
  `ledgerLatest(world:limit:)` on the protocol, endpoints
  (`v2Workspace:getNavigation`, `ledger:latest`), default impls.
- `ios-native/Corner/Views/ChatView.swift`: `v2ShowingHome` (General
  project, no mission, loadState .empty, nothing queued), nav hides the
  title there, the empty branch renders the welcome there, `v2HomeOpen`
  (stash + `router.open(.project)`; in-place prefill for the current
  thread). Non-General empty threads keep the old notice.
- Fixture + fake: `PreviewV2API.navigation()` (from the tree) +
  `ledgerLatest` ([] unseeded; `-v2SeedHome` serves noise + Aster +
  General + foreign rows); `CornerV2APIFake` handlers for both (records
  `ledgerLatest` world/limit).
- Tests: `CornerTests/R41HomeWelcomeTests.swift` (20: noise, grouping,
  freshest-three, nav skip, resolution incl. orphan fallback and
  project-beats-mission, fill order, name rule, slugify, endpoints, model
  incl. failure→onboarding, wire decode of both DTOs);
  `CornerUITests/R41HomeWelcomeUITests.swift` (4: welcome + centred logo
  + 3 ledger cards + no bubble/title, card tap → Aster thread + prefill
  staged-not-sent, General card in-place, onboarding fill + tap).
- Existing-test updates to the new contract: CornerV2Flow (entry asserts
  home instead of the "General" title ×2; send test reads the title after
  the first message), R32 clear (lands on home, bubble gone), VisualWindow
  subtitle test untouched after re-check (its `-v2SeedVisual` thread is
  non-empty — the welcome only replaces the *empty* General thread).
- Tour + gate: `testShoot11Home` (entry General, waits for 3 cards,
  dumps logo/welcome/cards/composer + `chat-title` for absence + ground
  pixel); gate `home` screen (anchors only, no design PNG — the welcome
  is phone-only): logo, welcome, 3 cards required, `chat-title`
  forbidden, ground token.
- HEAD fallout sync (not R41 scope, required for any green gate):
  `bf2bb115` removed "Record a call" but left two stale references to
  `v2-drawer-record` — dropped from testP055's id list and the gate's
  drawer anchors, the same convention as that commit's own flow-test edit.

My calls (brief-silent, documented): the world read is the account's
world (`CornerAPI.shared.world ?? "aom"`); onboarding taps pre-fill the
composer with starters ("Here's my context: " / "I want to connect my
tools: " / "I want to start a new project: ") since no thread-level
destination exists for them; no project dedupe; home loads once per
visit, no foreground re-read.

## Gates

- Units: `CornerTests` 506/506 green on the 390 sim (486 carried + 20 new).
- UI, each suite alone, 390-class test sim
  (`4818124A-…`, never Patrik's 16e): R41HomeWelcome 4/4, R32Wiring 8/8,
  ComposerParity 14/14, DesignMatch 5 (0 failures), VisualWindow 8/8,
  CornerV2Flow 12/12, CompMatch 45 (1 skip; only P055 failed on the stale
  record row — synced, re-verified green solo).
- `node tools/native-design-vs-sim.mjs` exit 0, 74/74 checks pass — TWICE
  (logs `/tmp/r41-gate2.log`, `/tmp/r41-gate3.log`). Home rows: logo
  110.7×24, welcome, three 348×80 cards, chat-title absent, ground exact.
- iPad Pro 13-inch (M5): ComposerParity 14/14, R32Wiring 8/8.
- Evidence: `R19-native-home-sim-390/402/440.png` (gate), `R41-home-live.png`
  (the 402 shot — 17 Pro `971E7446-…` — copied; provenance: tour
  testShoot11Home). Before: `R18-new-design.png` (desktop reference).

## Commits

On aom-studio, never pushed: the code + tool + evidence commit, then this
report as the docs commit (R40's split). Scoped pathspecs only;
regenerated `project.pbxproj` staged with the sources. Other rounds'
dirty evidence (R41-walk-*, older R19 pairs the gate re-shot) left
untouched.

## For the orchestrator

Phone reinstall. Nothing to install to a device (simulators only); the
build is the committed source — reinstall = rebuild + run.

Reads to expect on production: each visit to an empty General fires one
`ledger:latest {world, limit: 60}` + one `v2Workspace:getNavigation`
(no polling; once per visit). No backend ask from this round — both
endpoints behaved as specified.

Read-only probes used (no writes): sign-in as the e2e account, General
thread read (0 events — home shows live), `getNavigation` (13 nodes),
`ledger:latest` limit 60 on both the account world (aster,
spring-launch-deck, r20-team-protocol-probe, spring resolve to nav) and
`aom` (zero nav matches — the account world is the right read).

## Still off and why

1. Duplicate cards on few-project accounts: the three freshest subjects
   can resolve to one project (live: Aster ×3). The brief's algorithm is
   per-subject with no project dedupe; changing it needs Patrik's call.
2. `r20-bridge` run rows ("Started/Finished a r20-bridge run") escape both
   filters — the brief's regex names only `corner-v2-chat`, and the R48
   server predicate matches it. When newest for a subject they become card
   sub-lines. Suggest extending `isLedgerNoise` server-side (or the brief
   regex); not broadened unilaterally.
3. Home reads once per visit; no foreground refresh (returning to General
   re-reads — cheap enough at 2 small queries).
4. Non-General empty threads keep "No messages yet" (brief scoped home to
   General; the sketch was on General).
5. iPad home not screenshotted (suites green there; same component, phone
   pixels verified).
6. The e2e account's world ledger keeps moving under other workers — the
   live PNG's sentences are today's, not fixtures; the fixture suite pins
   the logic deterministically.
