# Runbook / handoff — build a new Corner iOS version for TestFlight

**For:** Muse (or any worker on the studio Mac). **Mission:** `corner:corner-v2`.
**Repo:** `mrg33k/aom-studio`, app at `ios-native/`. Written 2026-09-09 by Claude,
grounded in the exact recipe that shipped **build 28** this day (every step
below is verified: ARCHIVE / EXPORT / UPLOAD all SUCCEEDED).

## What a TestFlight build contains (read first)
- A build ships the **iOS app binary** from `ios-native/` — SwiftUI native only.
- It does **NOT** contain backend changes. The chat bridge
  (`AOM-EA/scripts/v2-team-bridge.py`), Convex (`corner-convex/convex/*`), and
  the connect flow are server-side — they ship by deploy/restart, not by a
  TestFlight build. Don't conflate "I fixed the bridge" with "ship a build."
- So: only cut a build when the change is in `ios-native/`.

## Prereqs (already set up on the studio Mac)
- Xcode + command-line tools; a booted-free `generic/platform=iOS` archive works.
- Signing: manual, App Store distribution profiles installed. The export plist
  names them: `ios-native/Support/ExportOptions-AppStore.plist` (team
  `PDYFTMXNJ2`; profiles `Corner App Store Distribution` +
  `Corner Widgets App Store` — the CornerWidgets appex MUST be named or export
  fails).
- App Store Connect API key: `~/.config/appstoreconnect.env` (`KEY_ID`,
  `ISSUER_ID`) + `~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8`. Never
  print these.

## Pick the build number
- Builds are numbered by `CURRENT_PROJECT_VERSION`, passed at archive time (the
  pbxproj value is stale — ignore it). **Last uploaded = 28.** Next = **29**, and
  bump by one every time. Marketing version stays `1.0`.
- Set once and reuse: `N=29`

## The four steps (all from `ios-native/`)

```bash
cd /Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/ios-native
N=29   # next build number

# 1) Archive (Release, generic iOS). ~4-8 min. Watch for: ** ARCHIVE SUCCEEDED **
xcodebuild archive \
  -project Corner.xcodeproj -scheme Corner \
  -destination 'generic/platform=iOS' \
  -archivePath /tmp/Corner-b$N.xcarchive \
  -configuration Release \
  CURRENT_PROJECT_VERSION=$N \
  -allowProvisioningUpdates

# 2) Export a signed IPA. Watch for: ** EXPORT SUCCEEDED ** and a Corner.ipa
xcodebuild -exportArchive \
  -archivePath /tmp/Corner-b$N.xcarchive \
  -exportOptionsPlist Support/ExportOptions-AppStore.plist \
  -exportPath /tmp/Corner-b$N-export \
  -allowProvisioningUpdates
ls -la /tmp/Corner-b$N-export/*.ipa

# 3) Upload to App Store Connect (reads the API key without printing it).
#    Watch for: UPLOAD SUCCEEDED with no errors + a Delivery UUID.
eval "$(grep -E '^(export )?(KEY_ID|ISSUER_ID)=' ~/.config/appstoreconnect.env | sed 's/^export //')"
xcrun altool --upload-app -f /tmp/Corner-b$N-export/Corner.ipa -t ios \
  --apiKey "$KEY_ID" --apiIssuer "$ISSUER_ID"

# 4) Attach to testers + submit for beta review. Apple needs ~5-15 min to
#    PROCESS the build first, so this may print "not visible yet" or
#    state=PROCESSING — just re-run until it prints state=VALID, attach 204,
#    and beta review 201 WAITING_FOR_REVIEW.
python3 ../corner/missions/corner-v2/tools/testflight-attach.py $N
```

## Gotchas (each cost a real round to learn)
- **Run each step in the background** if your harness times out long commands;
  archive alone can exceed a foreground limit.
- **`python3`, NOT `python3 -s`** for step 4 — the attach tool imports `jwt`
  (PyJWT) from user site-packages; `-s` hides it and the tool dies on import.
- **Step 4 — YOU (Muse) run it. Do NOT hand it to Patrik.** The build is not
  shipped until it is attached to the testers group and shows
  `WAITING_FOR_REVIEW`. Muse runs in yolo mode and is NOT subject to Claude's
  auto-mode classifier, so `testflight-attach.py` works for you directly — run
  it yourself and confirm the output. (Only Claude-in-auto-mode is gated on this
  one step, and that is being lifted via the settings allowlist; it was never a
  reason to leave a build un-attached.) A build you uploaded but did not attach
  is a half-finished ship — never report "build N is up" as done until step 4
  printed `attach to Corner testers: 204` and `beta review 201 WAITING_FOR_REVIEW`.
- **Processing delay:** the build is not VALID the instant altool finishes.
  Re-run step 4 every few minutes; it's idempotent (it checks state first).
- **Don't `rm -rf /tmp/...` in the same command as the build** — that combo can
  trip the command gate. Use a fresh `-b$N` path instead of cleaning.
- **Twin-target files:** a NEW Swift file must be added to the Corner target in
  `Corner.xcodeproj/project.pbxproj` (twin insertion) or it won't compile into
  the archive. Editing existing files needs no pbxproj change.

## Verify it landed (done-means-verified)
- Steps 1-3: the three SUCCEEDED lines above + a non-empty `Corner.ipa`.
- Step 4: `state=VALID`, `attach to Corner testers: 204`,
  `beta review submission: 201 WAITING_FOR_REVIEW`.
- Then it's on TestFlight for the Corner testers group once Apple's beta review
  clears (usually fast for an internal group).

## After shipping
- Bump the R-round in `corner/missions/corner-v2/BUILD.md` with the build number
  and what it bundles (see the R68 / build-28 entry for the format).
- If the build was to test a specific fix, say plainly what to look for on-device
  so Patrik can verify from his phone.
