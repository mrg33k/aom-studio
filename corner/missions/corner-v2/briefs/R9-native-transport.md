# Brief R9-native-transport — harden the native Convex transport before any v2 UI (native plan Task 2)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40). Write your report to `rounds/R9-native-transport.md`: every
command with its output.

You are a headless worker, the BUILDER for native plan Task 2. Nobody will answer questions.

Plan: Task 2 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-native-ios.md`
(lines 250-341). Regression checklist to revalidate first:
`/Users/aom-inhouse/aom-studio-transfer/corner-convex/NATIVE-IOS-AUDIT.md` (observations from
`9552d18`; confirm each transport/auth finding still holds on the current tree before you change it,
and list which do and do not).

## Where things are, exactly

- Native repo: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/ios-native` (inside the
  aom-studio git repo; `git -C /Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio log
  --oneline -1` shows the monorepo HEAD). `ios-native/` is clean. XcodeGen `project.yml` →
  `Corner.xcodeproj` (regenerate with `xcodegen generate` only if you change `project.yml`; paste
  the diff). Files: `Corner/Services/ConvexService.swift`, `Corner/Services/ConvexAuth.swift`,
  `Corner/Services/CornerAPI.swift`, `Corner/Services/MessageTransport.swift`,
  `CornerTests/FakeTransport.swift` (an existing test double; read it and extend it rather than
  inventing a second one), `Support/CornerWidgets-Info.plist`.
- Simulators on this Mac: `iPhone 17 Pro`, `iPhone SE (3rd generation)`, `iPad Pro 13-inch (M5)`,
  all iOS 26.3. Build/test:
  `xcodebuild -project Corner.xcodeproj -scheme Corner -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:CornerTests/ConvexServiceTests -only-testing:CornerTests/ConvexAuthTests test 2>&1 | tail -40`
  (use `xcpretty` only if installed; otherwise `tail`). One Xcode DerivedData: do not run two
  xcodebuilds at once.
- A separate worker is editing the web repo; you never touch anything outside `ios-native/` and
  your report. Never push (Patrik has no push access to this repo anyway; commits stay local).
  Stage only the files the plan's Step 7 lists.

## Step 1 — the failing tests (plan Step 1, verbatim)

Create `CornerTests/ConvexServiceTests.swift` and `CornerTests/ConvexAuthTests.swift` with the
plan's two tests plus: `testMutationRejectsClientUserIdArgument` (constructing an endpoint with a
`userId` argument must be impossible at the type level or throw), `testErrorEnvelopeNeverProducesFallbackRow`
(a `.errorEnvelope` for `listMessages`-style calls yields a thrown error, not an empty array),
`testRefreshRejectionClearsKeychainAndThrowsNotSignedIn`. Run; paste the failures (they must fail
against the current implementation for the reasons the plan states; if one passes already, say so
and keep it).

## Step 2 — implement (plan Steps 3-5)

- `ConvexService`: `ConvexEnvelope<Value>` decoding before any model; `request(_:as:)` with the
  access token added once in `authorizedData(for:)`; subscriptions expose a `Cancellable`;
  strict decoding (`errorMessage` surfaces as `ConvexServiceError.server`). Remove `userId` from
  every endpoint argument builder in `CornerAPI.swift`/`MessageTransport.swift`; where the legacy
  server still needs it for a compatibility call, the server derives it from the token (the web
  side has `resolveViewer` for exactly this), so the client stops sending it.
- `ConvexAuth`: one memoized `refreshTask`, atomic Keychain replacement, definitive sign-out on
  refresh rejection (`AuthError.notSignedIn`).
- `Support/CornerWidgets-Info.plist` + `project.yml`: `$(MARKETING_VERSION)` /
  `$(CURRENT_PROJECT_VERSION)` for app and widget parity.

## Step 3 — gates

Run the plan's Step 6 command; PASS. Then the whole unit suite:
`xcodebuild -project Corner.xcodeproj -scheme Corner -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:CornerTests test 2>&1 | tail -30`
(existing tests must still pass; if one fails because it relied on a client `userId`, fix the TEST
to the new contract and say so). Then a plain build for the app + widget:
`xcodebuild -project Corner.xcodeproj -scheme Corner -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5`.

## Step 4 — commit (plan Step 7)

```bash
git -C /Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio add ios-native/Corner/Services/ConvexService.swift ios-native/Corner/Services/ConvexAuth.swift ios-native/Corner/Services/CornerAPI.swift ios-native/Corner/Services/MessageTransport.swift ios-native/Support/CornerWidgets-Info.plist ios-native/project.yml ios-native/Corner.xcodeproj ios-native/CornerTests/ConvexServiceTests.swift ios-native/CornerTests/ConvexAuthTests.swift ios-native/CornerTests/FakeTransport.swift
git -C /Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio commit -m "fix(corner:corner-v2): harden authenticated Convex transport (native Task 2)"
```

## Report `rounds/R9-native-transport.md`

Audit revalidation table; failing then passing runs; the whole-suite line; the build line; the
list of call sites that stopped sending `userId`; deviations.

## Hard rules

Never edit outside `ios-native/`. Never push. Never run two xcodebuilds at once. Never put a
deployment URL, token, or test account in source or tests. Never `git add -A`.
