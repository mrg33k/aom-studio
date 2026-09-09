# Round 6 — native ship gate + TestFlight 20 (2026-09-08, Claude by hand)

Ships the R43 native build (home-first entry, distinct cards, eye-cycle Visual Window) as TestFlight build 20.

## Commit shipped
- aom-studio `9a091bf2` (docs) on `74cfbffb` (R43 code); `ios-native` clean at that commit, so the archive is
  a clean worktree at the R43 commit. Nothing else in the app tree was dirty.

## Ship gate (once, post-erase)
- Erased the app + `cv6-theme` default on the two allowed test sims only — iPhone 17 Pro `971E7446…` and
  "iPhone 16e (tests)" `4818124A…`. **Never** touched Patrik's 16e `0A05C9AA…`.
- **Units: `CornerTests` 536/536, `** TEST SUCCEEDED **`** on the 390 test sim `4818124A…` (fresh run at the
  ship commit).
- **Native design gate: 63/63, exit 0** — run once by the R43 builder at this exact commit
  (`node tools/native-design-vs-sim.mjs --screens thread,home,eye-full,eye-facetime,eye-hidden,sheet-half,sheet-full`,
  `/tmp/r43-gate.log`). The app code is unchanged since, so it holds for the ship.
- Touched UI suites green at this commit (R43 builder): R43HomeFirstAndEye 5/5, R41HomeWelcome 4/4,
  CornerV2Flow 12/12, VisualWindow 8/8.

## Archive → export → upload
- `xcodebuild archive` Release, `generic/platform=iOS`, `CURRENT_PROJECT_VERSION=20` → **ARCHIVE SUCCEEDED**;
  archive `CFBundleVersion=20`, `CFBundleShortVersionString=1.0`.
- `xcodebuild -exportArchive` with `Support/ExportOptions-AppStore.plist` (app-store, team PDYFTMXNJ2, manual
  signing, profiles "Corner App Store Distribution" + "Corner Widgets App Store") → **Corner.ipa (6.0 MB)**.
- `xcrun altool --upload-app` (ASC API key, never printed) → **UPLOAD SUCCEEDED with no errors** at 17:43.

## Attach + beta review
- `python3 tools/testflight-attach.py 20` polled until Apple reports build 20 VALID, then attached it to the
  "Corner testers" group and submitted for beta review.
- **RESULT (17:46): build 20 `id=89aac1c1-bd9a-47f4-8c57-ef5ee511b048` state=VALID (uploaded 17:44) →
  attach to Corner testers HTTP 204 → beta review submission HTTP 201, state WAITING_FOR_REVIEW.**
- Apple beta review is the external wait from here.

## Notes
- Simulators only; nothing installed to a device.
- Apple beta-review latency is an external wait, recorded not hidden.
- Coordination: STATUS.md carries an uncommitted "do not double-drive" note; verified no second builder or
  competing orchestrator was active during this ship (this session is the driver, per Patrik's standing goal).
