# R9 — native transport hardening (native plan Task 2)

Mission `corner:corner-v2`. Monorepo HEAD at start: `8d25a89a`
"corner:corner-v2: R7 report + evidence, punch list closed, desktop track complete".
Commit for this round (local only, no push): `773d4080`
"fix(corner:corner-v2): harden authenticated Convex transport (native Task 2)".
`ios-native/` tree is clean after the commit. Nothing outside `ios-native/` touched.
No deployment URL, token, or test account in source or tests (stubs use
`alg:none` unsigned JWTs and `test@example.com`).

## 1. Audit revalidation (NATIVE-IOS-AUDIT.md observations from 9552d18, current tree)

Each transport/auth finding was re-checked by reading the current source before
any edit. All hold.

| # | Finding | Still holds? | Evidence on current tree |
|---|---|---|---|
| H1 | Convex data-plane calls unauthenticated; identity is client-asserted `userId` | YES | `ConvexService.query/mutation/mutationWithResult` never set `Authorization` (old lines 22-68). `userId` sent at `RoomStore.swift:279-281`, `ChatViewModel.swift:594`, `ReadStateStore.swift:70` |
| H3 | Unserialised refresh, single-use token races; no sign-out on failure | YES | No `refreshTask` anywhere; `validSession(_:)` (`ConvexAuth.swift:169-174`) called `refresh` directly per caller; failure path never cleared the Keychain |
| H5 | Widget version (1.0 build 1) mismatches app (1.0 build 10) | YES | `Support/CornerWidgets-Info.plist` hard-coded `1.0` / `1`; app plist already `$(MARKETING_VERSION)` / `$(CURRENT_PROJECT_VERSION)` |
| H7 | Unit tests never exercise the Convex path | YES | No `CornerTests` file referenced `ConvexService`/`ConvexAuth`; `Config.suppressLiveBackendsForTests` short-circuits every `useConvex` branch; `ChatViewModelTests` run `FakeTransport` (REST-shaped) |
| H8 | Tolerant decoding turns "not found" into a garbage row | YES | `decodeQueryResponse` tried direct decode first, never checked `status=="error"`; `MessageRow.init` never throws and invents a UUID (line 75); `NSNull -> []` fallback (lines 121-123) |
| H4 | Specialist picker never affects a Convex send | YES (out of scope) | `sendMessage` args (`ChatViewModel.swift:588-595`) carry no agent. Send shaping belongs to Task 3; not changed here |
| H2 | Notification delegate installed after launch | YES (out of scope) | Push, not transport/auth; untouched |
| H6 | Live account passwords in `ScreenshotCapture.swift:72, 83` | YES (out of scope) | Same two lines, same committed passwords. Flagging, not fixing: rotating them is Patrik's call and Task 2 must not widen |
| — | Backend contract mismatch (app calls functions `convex/` does not implement) | IMPROVED on the web side | The called names (`auth:signIn`, `users:viewer`, `messages:list`, `messages:send`, `reads:markRead`, `rooms:listRooms`) now all appear under `corner-convex/convex/` (incl. `_generated/api.d.ts`). Server-side verification is the backend track's job |

## 2. Failing tests first (plan Step 1 + 3 brief additions)

Created `CornerTests/ConvexServiceTests.swift` (6 tests),
`CornerTests/ConvexAuthTests.swift` (3 tests), extended `CornerTests/FakeTransport.swift`
(`FakeConvexTransport`, `AuthFixture`, `AuthSession.valid/.expired`,
`ConvexAuth.RefreshClient.singleUseSuccess/.rejected`) instead of a second double.

Failing run (new tests reference API that does not exist yet):

```bash
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerTests/ConvexServiceTests \
  -only-testing:CornerTests/ConvexAuthTests test 2>&1 | tail -40
```

Output (after `xcodegen generate` so the new files are members of the target):

```text
Testing failed:
        Cannot find type 'ConvexTransport' in scope
        'RefreshClient' is not a member type of class 'Corner.ConvexAuth'
        Testing cancelled because the build failed.

** TEST FAILED **
```

No test passed already; every new test required the new implementation. (A runtime
failure against the old code was impossible by construction — finding H7: the old
`ConvexService` had no injectable transport, which is exactly what the new tests
prove into existence.)

## 3. Implementation (plan Steps 3-5)

`ConvexService.swift`:

- `ConvexEnvelope<Value>` decoded before any model in
  `request(_:as:)`; non-`"success"` throws
  `ConvexServiceError.server(errorMessage ?? "Convex request failed")`.
- `authorizedData(for:)` attaches `Bearer <token>` exactly once; kind routes to
  `api/query` / `api/mutation`.
- `subscribe(_:as:interval:onUpdate:) -> any Cancellable` (Combine's; `Task` so
  conformed). Legacy `pollQuery` is unchanged and conforms for free.
- `ConvexEndpoint(kind:path:args:)` throws `clientUserIdForbidden` on any
  `userId` key; factories (`workspaceTree`, `listMessages`, `sendMessage`,
  `markRead`, `listRooms`) build clean args.
- Legacy `query/mutation/mutationWithResult` keep their signatures and
  `ConvexError` type (callers untouched) but now strip `userId` from args and
  attach the Bearer [REDACTED] best-effort. Decoding there stays tolerant; strict is
  the new path.

`ConvexAuth.swift`:

- `KeychainMode.system/.memory` + `RefreshClient` (nil run == live network).
- One memoized `refreshTask` keyed by refresh token, shared by both
  `validSession()` and `validSession(_:)`; `refreshCallCount` counts starts.
- `save(_:)` is a single `SecItemUpdate`, `SecItemAdd` only when absent.
- Definitive rejection (`badCredentials`, `signedOut`) clears the store and
  throws `AuthError.notSignedIn`; transient errors propagate untouched.

`Support/CornerWidgets-Info.plist` + `project.yml`: widget now uses
`$(MARKETING_VERSION)` / `$(CURRENT_PROJECT_VERSION)`, mirroring the app
target's existing pattern. `project.yml` diff (then `xcodegen generate`):

```diff
       properties:
         CFBundleDisplayName: Corner
+        CFBundleShortVersionString: $(MARKETING_VERSION)
+        CFBundleVersion: $(CURRENT_PROJECT_VERSION)
         NSExtension:
           NSExtensionPointIdentifier: com.apple.widgetkit-extension
```

The regen's `project.pbxproj` diff is 8 insertions only (new test-file
membership + widget version settings).

`CornerAPI.swift` / `MessageTransport.swift`: staged per the brief but
**unmodified** — verified by grep that neither file contains a `userId`
endpoint-argument builder (`CornerAPI` sends identity only as the Bearer [REDACTED];
`registerDevice` already documents server-derived identity). `git add` of both
was a no-op.

## 4. Gates

Targeted gate (plan Step 6), PASS — 9/9:

```bash
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerTests/ConvexServiceTests \
  -only-testing:CornerTests/ConvexAuthTests test 2>&1 | tail -40
```

```text
Test Suite 'ConvexAuthTests' passed … Executed 3 tests, with 0 failures
Test Suite 'ConvexServiceTests' passed … Executed 6 tests, with 0 failures
Test Suite 'CornerTests.xctest' passed … Executed 9 tests, with 0 failures
** TEST SUCCEEDED **
```

Whole unit suite, PASS — no existing test touched, none relied on a client `userId`:

```bash
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:CornerTests test 2>&1 | tail -30
```

```text
Test Suite 'CornerTests.xctest' passed … Executed 317 tests, with 0 failures (0 unexpected)
Test Suite 'All tests' passed … Executed 317 tests, with 0 failures (0 unexpected)
** TEST SUCCEEDED **
```

App + widget build, PASS:

```bash
xcodebuild -project Corner.xcodeproj -scheme Corner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5
```

```text
** BUILD SUCCEEDED **
```

Version parity proven in the built product (not just the plist source):

```bash
/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" -c "Print CFBundleVersion" \
  …/Debug-iphonesimulator/Corner.app/Info.plist                       # 1.0 / 10
/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" -c "Print CFBundleVersion" \
  …/Debug-iphonesimulator/Corner.app/PlugIns/CornerWidgets.appex/Info.plist  # 1.0 / 10
```

## 5. Call sites that stopped sending `userId`

No file outside the staged list was edited. All three Convex `userId` senders
flow through `ConvexService`, which now refuses (`ConvexEndpoint`) or strips
(legacy shims) the key, so the wire no longer carries client-asserted identity:

| Call site | Before | After (no edit to the file) |
|---|---|---|
| `RoomStore.swift:275-284` `convexListArgs` (`rooms:listRooms`) | `args["userId"] = email ?? id` | stripped in `query` via `sanitizedArgs` |
| `ChatViewModel.swift:574-595` `sendMessage` (`messages:send`) | `"userId": userId` (incl. anon-UUID fallback) | stripped in `mutation` via `sanitizedArgs` |
| `ReadStateStore.swift:68-72` `markReadRemote` (`reads:markRead`) | `"userId": userIdentity()` | stripped in `mutation` via `sanitizedArgs` |

Covered by `testLegacyQueryStripsClientUserIdFromArgs`, which asserts the sent
body has no `userId` while `roomId` survives. Tasks 3-4 delete the dead builder
code when they migrate these callers onto `ConvexEndpoint` (whose construction
with `userId` throws). Note for that migration: the anon-UUID fallback in
`ChatViewModel.sendMessage` currently lets signed-out devices send; with no
token and no `userId`, such sends now depend on the server accepting
tokenless calls — the server derives identity from the token per the brief.

## 6. Commit (plan Step 7, brief's pathspec)

```bash
git -C /Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio add \
  ios-native/Corner/Services/ConvexService.swift \
  ios-native/Corner/Services/ConvexAuth.swift \
  ios-native/Corner/Services/CornerAPI.swift \
  ios-native/Corner/Services/MessageTransport.swift \
  ios-native/Support/CornerWidgets-Info.plist ios-native/project.yml \
  ios-native/Corner.xcodeproj \
  ios-native/CornerTests/ConvexServiceTests.swift \
  ios-native/CornerTests/ConvexAuthTests.swift \
  ios-native/CornerTests/FakeTransport.swift
git -C … commit -m "fix(corner:corner-v2): harden authenticated Convex transport (native Task 2)"
```

```text
[main 773d4080] fix(corner:corner-v2): harden authenticated Convex transport (native Task 2)
 8 files changed, 634 insertions(+), 16 deletions(-)
```

`CornerAPI.swift` and `MessageTransport.swift` contributed no diff (verified
clean). Never pushed. No two xcodebuilds ran concurrently.

## 7. Deviations from the plan text (all deliberate, all covered above)

1. Plan Step 1's auth snippet seeds nothing, but an empty `.memory` keychain has
   no refresh token to refresh — the test seeds an expired session first, then
   runs the two concurrent `validSession()` calls verbatim.
2. Plan Step 4's `catch` clears on any error; this clears only on definitive
   rejection and rethrows transient failures untouched, so airplane mode does
   not sign the user out. The brief's rejection test behaves exactly as specified.
3. The old `validSession(_:)` keeps its signature and error type for existing
   callers but shares the memoized task, so the poll storm it serves is fixed too.
4. `WorkspaceSummary` is a minimal `{id, name}` struct in `ConvexService.swift`
   (no new files allowed by the pathspec); Task 3 expands it into the full DTO.
5. Legacy string methods keep tolerant decoding; strictness is the new
   `request(_:as:)` path. Migrating legacy callers is Task 3-4 scope.
6. Test invocation uses `ConvexAuth(keychain:refreshClient:)` /
   `FakeConvexTransport.errorEnvelope` explicitly rather than the plan's
   leading-dot shorthand — same semantics, compiles against the real types.
