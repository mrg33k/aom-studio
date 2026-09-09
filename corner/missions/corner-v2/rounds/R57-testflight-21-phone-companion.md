# Round 9 — TestFlight 21 + the phone companion (2026-09-08, Claude by hand)

Ships R8 (native view-state publish, agent window events, website-as-video band) as TestFlight build 21.

## Commit shipped
- aom-studio `2804c824` (R56 native companion); `ios-native` clean at that commit → clean worktree at the
  ship commit.

## Ship gate (once, at the ship commit)
- Erased the app on the two allowed sims only — iPhone 17 Pro `971E7446…`, "iPhone 16e (tests)" `4818124A…`.
  Never Patrik's 16e `0A05C9AA…`.
- **Units: `CornerTests` 562/562** (536 carried + 26 new `R56ViewStateTests`) — run by the R8 builder at
  `2804c824`, the exact ship commit (ios-native unchanged since).
- **Native design gate: 65/65, exit 0** (`node tools/native-design-vs-sim.mjs --screens
  thread,home,eye-full,eye-facetime,eye-hidden,sheet-half,sheet-full`), once at this commit.
- Touched UI suites green: R56ViewState 5/5, R43HomeFirstAndEye 5/5, VisualWindow 8/8, DesignMatch 5/5.
  R8 caught and fixed 3 reds first (a 5 s mirror tick that blocked the consume path — would have shipped a
  dead feature with green units; band geometry 16:9; the raise test's shape).

## Archive → export → upload → attach
- `xcodebuild archive` Release, generic iOS, `CURRENT_PROJECT_VERSION=21` → ARCHIVE SUCCEEDED, `CFBundleVersion=21`.
- `xcodebuild -exportArchive` with `ExportOptions-AppStore.plist` → Corner.ipa (6.08 MB).
- `xcrun altool --upload-app` → UPLOAD SUCCEEDED with no errors (19:20).
- `python3 tools/testflight-attach.py 21`: build 21 `id=dec33364-0b3d-479f-9b59-37fee4f401bb` state=VALID
  (19:22) → attach to Corner testers HTTP 204 → beta review submission HTTP 201, **WAITING_FOR_REVIEW**.

## Not green from the simulator alone (Patrik-owned, external)
The plan says do NOT call this gate green from simulator evidence alone. The **on-TestFlight-build** recording
of the eye's FaceTime/full/hidden cycle, the agent file-open, the move-on minimize/close, the horizontal
website review, and a reply that correctly states the current view needs build 21 installed on a device (or a
tester) — that waits on Apple's beta review + Patrik's install. Simulator evidence is R8's four PNGs
(agent-minimize, agent-raise, website-band FaceTime + full). Apple beta review is the external wait, recorded
not hidden.

## Notes
- Simulators only; nothing installed to a device; never pushed.
- R8 flagged before ship: the website band is now 16:9 (374×210) vs R43's 281-tall stage — a one-metric change
  if Patrik prefers the taller stage; and the native transport mirrors view state on a ~5 s tick (no socket),
  so the agent minimize/raise lands ≤ ~5 s after the write.
