# Brief R41-native-home-welcome — the phone's home is a welcome screen with three things to get started on, drawn from the ledger

Mission: `corner:corner-v2` (native lane). Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R40-native-window-and-scroll.md` (the round you extend), the desktop design's
"new" screen `rounds/evidence/R18-new-design.png` (logo mark centred, "Welcome to Corner.", one sub line,
three rows: icon + title + sub + chevron, a quiet link under them), and Patrik's sketch: `/tmp/patrik-home-sketch.png`
if present, else this description. Tree: aom-studio `ios-native` (HEAD after the orchestrator's fixes:
login logo whole, Record a call removed, drawer opaque, footer "You"). Backend: production
`brilliant-scorpion-163`; `ledger:latest {world, subject?, limit}` (organization ledger — after R48 it filters
run noise; until then filter /^(Started|Finished) a corner-v2-chat run|^(Opened|Closed|Pinned) / yourself),
`v2Workspace:getNavigation` (projects + missions), `v2Native:threadEvents`. Report:
`rounds/R41-native-home-welcome.md`. Automated runs target the iPhone 17 Pro sim
`971E7446-394B-4EF6-9796-8D9D1F916994`, the 390-class test sim "iPhone 16e (tests)" `4818124A-CCAF-4386-9970-85F17A660AC7`, and `iPad Pro 13-inch (M5)` — NEVER the iPhone 16e
`0A05C9AA-9835-4C66-BF7A-9B4CF15AD80D` (Patrik's panel).

You are a headless worker, BUILDER for the native iOS app (SwiftUI). Nobody will answer questions.

## Patrik, 11:20 AM (his sketch on the empty General thread)
- Crossed out the "General" nav title. Patrik's clarification (11:27 AM): **leave the nav as it is** (hamburger
  left, the logo stays where it lives today) — on the home screen the nav simply shows no "General" title.
  **Add the logo to the home screen body for presentation**: the whole logo asset `CornerLogo` (~24pt tall,
  ink) centred at the top of the content column, exactly like the desktop "new" screen's centred mark above
  "Welcome to Corner." — it is part of the welcome, not a nav change.
- Crossed out the empty-state chat bubble + "No messages yet — say something" → gone.
- Drew: an illustration (a light, friendly mark — reuse the app's own visual language, no stock art), then
  **"Welcome NAME"** (the account's first name; "Welcome" alone when there is none — never an email), then
  **three full-width suggestion cards** stacked, then the composer as today ("Tell General what to make next").
- "This should feel like a welcome screen with suggestions on what to get started on based on the ledger,
  since it's our home screen. Desktop has a good version of this in the design."

## Build
1. **Home = the General thread when it has no messages** (and the app's entry when the last thread was
   General). Nav: unchanged layout, no title on home. Content column, top to bottom: centred logo,
   illustration, "Welcome <first name>", three cards — scrolls as one column; the composer stays docked.
2. **Suggestions from the ledger.** Read `ledger:latest` for the world (limit 60), drop noise, group by
   subject, take the three freshest subjects with a real item; each card = project name (from navigation)
   as title, the newest ledger sentence as the sub line (trimmed to one line), a chevron; tap → opens that
   project's thread with the composer pre-filled "Pick up where we left off on <project>." (not sent).
   With fewer than three subjects, fill with the desktop's onboarding rows in order (Bring in your context ·
   Connect where the work lives · Start your first project). With none, the three onboarding rows.
3. **Cards match the design rows**: 56pt icon tile, title 15 semibold, sub 13 muted, chevron; 12pt gap; the
   card surface on `ground`, hairline, 12pt radius — the same rhythm the drawer uses. No new colours.
4. **Unit tests** on the suggestion builder (noise dropped, grouping, freshest-three, fill order, name
   rule: never an email or a "+" string). **UI test** on the fixture: logo centred, welcome line, three cards,
   no "No messages yet"; and the design gate `tools/native-design-vs-sim.mjs` gets a `home` screen with
   anchors for the centred logo in the content column (not the nav), the welcome line, and three cards.
5. **Live proof** on the 17 Pro sim as the e2e account (`/tmp/r19-diag-env.json` handoff already used by
   the gate): screenshot `rounds/evidence/R41-home-live.png` with real ledger-driven cards.

Gates: units, the UI suites alone (CompMatch, DesignMatch, VisualWindow, CornerV2Flow, ComposerParity,
R32Wiring + yours), `node tools/native-design-vs-sim.mjs` exit 0 twice, iPad column. Stage scoped paths +
regenerated `project.pbxproj`; commit on aom-studio; never push; never install to a device; simulators only
(never the 16e). Report: before/after PNGs, gates, commit, "for the orchestrator" (phone reinstall), "still off".
