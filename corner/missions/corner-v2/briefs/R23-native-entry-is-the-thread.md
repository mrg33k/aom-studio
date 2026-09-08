# Brief R23-native-entry-is-the-thread — the app opens into the conversation and navigates through the drawer; the "home tree" page retires (P070)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `punch-list.md` row **P070** (yours), `rounds/R19-native-design-vs-simulator.md`
(the gate you must keep green: `node tools/native-design-vs-sim.mjs` from the mission folder; creds
handoff pattern; the home tree "has no Mobile-flow frame"), and HANDOFF §4.
Write your report to `rounds/R23-native-entry-is-the-thread.md`: every command with its output.

You are a headless worker, BUILDER for the native iOS app (SwiftUI). Nobody will answer questions.

## The defect, as Patrik sees it (6:40 PM on the attached iPhone 16e)

The app opens on a page the design never drew: a "Corner" header with headset / search / menu
circles, a "Message Corner…" bar, and a WORKSPACE list of every project with its missions
(`RoomListView` home tree). The design's Mobile flow has no such page: the app opens INTO a
conversation (nav bar: project line above the centred title, status dot; the pill composer with
paperclip, commands chip, Record, round send) and every navigation happens through the drawer
(84% width, logo + close, New / Project +, Record a call, Recent, Projects with missions, identity +
bell + gear). This first screen is why the phone "looks nothing like the design" before a single tap.

## Build

1. **Entry = the last active conversation.** On launch (signed in), open the last thread the person
   had open (`navigation.lastRoomID` / thread id); if none, General's thread. No intermediate page.
   Cold start with a stale or foreign thread id falls back to General, never to an error.
2. **The drawer is the navigation.** Everything the home tree offered (project list, missions,
   New mission, search, settings) lives in `V2DrawerView` per the design; if the drawer lacks any
   of it (search, the `+` per project, Files rows), add it there in the design's rows. The
   headset / search / menu circle header goes away with the page.
3. **Retire the home tree from the product path.** Keep `RoomListView` compiled only if legacy
   rooms need it (`/room/*` archive); it must not be reachable as a home. Fixture / tour arguments
   (`-v2FixtureUITest`, `-screenTour`, `-v2SkipSetup`) keep working: land on the fixture thread.
4. **Sign-in and setup unchanged**: `SignInView` → (first run) `V2Onboarding` → the thread.
5. **Tests**: update `CornerV2FlowUITests` / `ScreenTour` / `CompMatchUITests` / `DesignMatchUITests`
   for the new entry; add `testLaunchOpensLastThreadNotATree` and `testDrawerCarriesEveryHomeAction`.
   Full unit suite (376+) and the four UI suites green (run UI suites alone: under load the runner
   dies with "signal kill"); `node tools/native-design-vs-sim.mjs` exit 0 with the thread and drawer
   pairs re-shot.

## Hard lines

Stage scoped paths + regenerated `project.pbxproj`; commit on aom-studio (HEAD `0fa988ac` or
later); never push; never install to a device; do not edit the web worktree; simulators only
(the iPhone 16e `0A05C9AA-…` is attached to Patrik's panel — you may use it, he is watching).
Report: before/after screenshots of the entry (`rounds/evidence/R23-native-entry-{before,after}.png`),
gates table, commits, "still off and why" (empty is the goal).

## Also yours (found on the attached simulator at 6:37 PM, `punch-list.md`)

- **P071** the thread nav title says "Aster / Spring launch deck" under the "Aster" line: title = mission
  name only, project on the line above (HANDOFF §4).
- **P072** under the PDF page the review sheet is white to the bottom; the design's sheet ground is
  `--surface` with the status line on it.
- **P073** the gate reported close / tabs / Review / Send as MISSING on the sheet screens while the
  screenshots show them: make the element read wait for the sheet to settle (or retry the dump once)
  so the gate reads what the picture shows. Prove it with two consecutive full runs at 63/63.
