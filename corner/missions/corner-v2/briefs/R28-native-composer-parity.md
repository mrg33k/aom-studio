# Brief R28-native-composer-parity — everything the CV6 composer did, inside the v2 pill (iOS)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R19-native-design-vs-simulator.md` §5 (the commands chip as built),
`rounds/R24-native-send-and-sheet.md` (send/question fixes to build on), `briefs/R27-desktop-composer-parity.md`
(the control table the web is building: the phone must match it one for one), and the native mirror
of CV6's composer that already exists in `Corner/Views/ChatView.swift` legacy path (`commandsMenu`,
dictation via `SpeechService`, Talk aloud, image generator sheet, files sheet, reply). Report:
`rounds/R28-native-composer-parity.md`.

You are a headless worker, BUILDER for the native iOS app (SwiftUI). Nobody will answer questions.

## Build

Every CV6 control inside the design's 50pt pill (paperclip, commands chip, Record, round send):
attach (photos/files/camera, multiple), commands menu (existing chip) with Work/Plan, Model,
Specialist, Files, Generate an image (produces an artifact tab or a "Generating…" run), slash
commands (`/` in the field opens the same menu as a sheet; `/clear` with confirm), reply-to (swipe or
long-press a message → quote chip), Talk aloud (AVSpeech of driver replies + checklist playback),
dictation (existing Record → live level meter in the pill), stop while generating, drafts per thread
(disk, survives relaunch), @mention chips. Keyboard/accessibility: Return sends, the chip and every
control has an accessibility label, VoiceOver order matches the design's reading order.
The pill's metrics stay the design's (R19 locks). iPad column composer gets the same controls.

## Gates and hard lines

376+ unit, the four UI suites alone, `node tools/native-design-vs-sim.mjs` exit 0 twice; a UI test
per control in `CornerUITests/ComposerParityUITests.swift`. Stage scoped paths + regenerated
`project.pbxproj`; commit on aom-studio; never push; never install to a device; simulators only.
Report: the control table (CV6 → iOS status → evidence PNG), gates, commits, "still off and why".
