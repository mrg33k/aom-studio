# Decision record — Corner iOS chat screen (2026-09-13 touch-through round)

## agent

Claude Fable 5.1, working the 2026-09-13 iOS touch-through session with Patrik.

## artifact

- `Corner/Views/ChatView.swift` (nav bar: avatar bubble centred above the title; composer option row: three equal chips)
- `Corner/Models/CornerV2DTO.swift` (general project displays as "Assistant")
- `Corner/Views/V2ConnectionsSheet.swift` (Connect flow, failure reason in row)
- ios-native commits a1f14f1f, b4e78e57, c8059624

## call

I am shipping this because every change is a direct instruction from Patrik in this session
("General never worked with my brain, change it to Assistant", "every chat needs a bubble image
centered above the name", "three equally sized and spaced buttons"), each was built in real
SwiftUI, launched on the iPhone 17 Pro simulator against the real backend, and each was looked
at on screen after the build. What this screen is FOR: sending a message to the room's agent
and getting a reply. The ONE thing the user must be able to do: type and send. That path was
exercised end to end twice (second message answered in seconds after the bridge fix).
What lost: an in-app SFSafariViewController for OAuth (kept UIApplication.open, smaller change,
already the established pattern here).

## measured

Build (xcodebuild, iPhone 17 Pro sim), last run:
```
exit=0
```
Website API with the phone's Convex token after the repoint deploy:
```
{"room":"general","lists":[]}
HTTP 200
```
Bridge health after restart:
```
{"status": "ok", "mode": "service", "backend": "https://brilliant-scorpion-163.convex.cloud", ... "email": "bridge@aom-inhouse.com", "threads": 170
```
Bridge unit tests (scripts/test_v2_team_bridge.py, direct run): 88 PASS before a pre-existing
`No module named 'PIL'` stop in an unrelated renderer test.
Arcade action for the signed-in user:
```
patrikmatheson@gmail.com -> {'status': 'completed', 'authUrl_len': 0, 'authId': 'ac_3HsZ…'}
```
Simulator screenshots taken after each build: "Assistant" title with "AS" bubble, three equal
chips, checklist panel with no error, Gmail row "Connected".
design_spacing_check / design_screen_check do not cover SwiftUI; the Stop-hook sweep's FAILs
are all archived HTML under `archives/room-cleanup-2026-08-14/` and `tmp/`, untouched here.

## uncertain

- The header grew from 52pt to 84pt to fit the bubble. I did not measure it against the
  Claude Design source file for the chat header; the design may want a smaller bubble (24pt)
  and a 72pt bar. Patrik has not seen it on his own phone yet.
- The avatar shows initials "AS" for Assistant. Patrik asked for a "bubble image"; initials
  on a tint may not be what he pictured, and there is no real image source wired for projects.
- The three chips are equal width only because each has `maxWidth: .infinity`; on the iPad
  width they will stretch very wide. Not checked on iPad.
- Fixture rooms in UI tests still name the general project "General"; any UI test asserting
  the visible title "General" will now fail on the real-backend path. Not run tonight.
- Gmail reads "Available" until Connect is tapped because the sheet never probes Arcade on
  open. That is a lie of omission on first open.
- The eye / Visual Window still renders nothing on iPhone. I toggled it four times and saw
  no window; I did not find the cause.

## would_change

Probe Arcade status when the connections sheet opens; ask Patrik for the bubble source (project
image vs initials) and match the header to the design file at 1x; add a real-backend
touch-through UI test that fails when a reply does not arrive within 60s, so the bridge
brain-dead-but-green state can never pass a round again; fix the Visual Window on iPhone.

## risk

If the header height is wrong, every chat on Patrik's phone looks off tomorrow morning and he
notices immediately; revert is one commit. If the "Assistant" rename collides with a UI test,
CI on ios-native goes red, nobody outside sees it. If the Convex repoint is wrong for some
website route I did not test, that route 401s for Patrik on the web dashboard; the env-var
override still wins over the code default, so the rollback is setting one variable.
