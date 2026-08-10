# Corner — native iOS app

**Mission:** `corner:native-ios` · Stage 1 · bundle id `com.aheadofmarket.corner`

The SwiftUI app that replaces the Capacitor shell in `../ios/App` as the App Store
product. Same bundle id on purpose: App Store Connect already holds the record and
build 1, so this binary becomes build 2+ of the *same* app, not a second listing.

## Build it

```bash
brew install xcodegen          # only if you change the file layout
cd ios-native
xcodegen generate              # regenerate after adding/removing/renaming a source file
xcodebuild -scheme Corner -destination 'generic/platform=iOS Simulator' build
xcodebuild -scheme Corner -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test
```

`Corner.xcodeproj` is committed alongside `project.yml`, so a fresh clone opens in
Xcode with no tooling at all. `project.yml` is the source of truth; the checked-in
project is a convenience, and regenerating it is the fix for any drift.

`Package.resolved` is committed too — supabase-swift is pinned to a resolved version
rather than floating on `from: 2.0.0` at every clone.

## Why it exists (the one-paragraph version)

The Capacitor wrap runs the chat thread's realtime socket inside a WKWebView. iOS
suspends the web view when the app backgrounds, the socket dies silently, and replies
that land while the phone is in a pocket are invisible until the app is reopened. No
native code keeps a socket alive in the background either — the correct architecture
is push-driven delivery: **APNs carries the fact that something arrived, the socket is
a foreground accelerator, and on foreground the client reconciles.** That is what this
app is. The audit (`corner/missions/native-ios/research/app-store-and-architecture-audit.md`)
has the rest, including why the wrap would likely have been rejected under 4.2, 2.5.4
and 5.1.1(v).

## The backend contract this app speaks

Nothing server-side changed for Stage 1 beyond what Stage 0 already shipped.

| What | How |
|---|---|
| Auth | supabase-swift, email+password, Keychain session with auto-refresh |
| The world/tenant | the signed-in user's `user_metadata.world` — **never** defaulted |
| History | `GET /api/dashboard/supabase-messages` with the web's exact room params |
| Send | `POST /api/dashboard/supabase-messages` — the ONE write path, JWT as Bearer |
| Live "working" | `GET /api/dashboard/message-steps`, settled on the bridge's own sentinel |
| Rail | `GET /api/dashboard/missions-tree` + `/api/dashboard/projects` |
| Realtime | supabase-swift RealtimeV2, `postgres_changes` INSERT filtered on `room_id` |
| Push registration | `POST /api/push/register-device` (Stage 0) |
| Account deletion | `POST /api/account/delete`, two-step (Stage 0) |
| Room files | same room query + `attachments=1&limit=400` (Stage 2) |
| Review | `GET /api/dashboard/review-queue`, `POST /api/dashboard/review-decision` (Stage 2) |
| Files — picker | `GET /api/dashboard/projects` (no file payload at all) |
| Files — a folder | `GET /api/dashboard/files?type=organize&client=<world>&project=<slug>` |
| Files — Personal | `GET /api/dashboard/files?type=uploads` (uploads only, no mirror) |
| Tracker | `GET/POST /api/dashboard/cv6-bugs`, `GET /api/dashboard/admin-tickets`, `GET/POST /api/dashboard/trackers` |
| Assign | `POST /api/dashboard/supabase-messages` into the agent's room — the row IS the assignment |

**Files asks per project; the web asks for everything.** `type=organize` has always
accepted `project=` and scopes both its mirror read and its upload read by it. The web
omits it and pulls the whole world every 30 seconds — 18,545 rows for `aom`, counted live
on 2026-08-10. On a phone that is the difference between a folder that opens and a folder
that times out on cellular.

**Tracker sends `world`; the web does not.** `authFetch('/api/dashboard/cv6-bugs')` passes
no world and the endpoint defaults to `'aom'`, so every tenant's Tracker on the web reads
AOM's board. The store is per-world server-side (`cm_state.client_id`), so sending the
signed-in world is the only honest reading — and a non-AOM tenant will see their own
(possibly empty) board here next to the web's borrowed one.

**Sending is never a direct PostgREST insert.** Identity stamping, tenant verification,
`room_id` derivation and mission-slug canonicalization all live server-side in the one
write path; bypassing it would recreate the privilege escalation closed on 2026-07-27.

The Supabase key in `Config.swift` is the **anon/publishable** key already shipped in
the web bundle (role claim verified `anon`). The service role key must never appear in
this target.

## Every surface is SwiftUI (Stage 3)

There is no `WKWebView`, no `UIWebView` and no embedded web content anywhere in the app
target — the last of the Capacitor wrap is gone. Run the gate:

```bash
ios-native/scripts/no-webviews.sh
```

The only two UIKit bridges left are `QLPreviewController` (the system's document viewer)
and the share sheet. External destinations — a client's ticket pointing at their own
site, a store URL that would not download — leave for Safari on purpose: the open web is
not a Corner surface and should never wear Corner's chrome.

## Deep links

Every surface is addressable, because a push or a widget that can only ever open a room
can only ever be about a room:

```
corner://room/<percent-encoded room_id>   one conversation   (what apns.js sends today)
corner://review                           the verdict queue
corner://organize   (or corner://files)   the files browser
corner://tracker                          the issue boards
corner://rooms                            the rail (the server's own no-room fallback)
```

They all push onto ONE navigation path, so a deep link and a tap on the rail land in the
same screen in the same state. A `corner://` URL naming a route this build has no screen
for raises an alert rather than doing nothing — a tap that appears to do nothing is what
trains people to stop tapping.

## The three things Stage 1 is actually about

Chat apps are easy to build and easy to build dishonestly. These are the parts that
are not decoration:

1. **A failed send stays on screen and is retryable.** The web drops the optimistic
   echo when the POST fails, so the message the user typed vanishes and the room looks
   like they never sent anything. Here it stays, marked "Not sent", with Retry and
   Discard — and it survives a reload.
2. **A dead turn looks dead.** "Working…" is driven by the agent's real step
   heartbeats and stops on the bridge's `settled` sentinel. After three minutes of
   total silence the spinner does not quietly disappear (which reads as *finished*):
   the row becomes "No reply — this turn stopped" with a Send again action.
3. **Foreground catch-up loses nothing.** On return the subscription is rebuilt and
   the thread is delta-fetched; if the newest row this device holds is missing from
   the standard window, the window is widened before anything is concluded, so a long
   absence cannot produce a thread that silently starts in the middle.

## Layout

```
ios-native/
  project.yml                 XcodeGen spec (source of truth)
  Corner.xcodeproj/           generated, committed
  Support/                    generated Info.plist + entitlements
  Corner/
    Config.swift              endpoints, keys, timings
    CornerApp.swift           @main + AppDelegate (APNs tokens only)
    PrivacyInfo.xcprivacy     truthful manifest — email, name, user content
    Models/                   Room · MessageRow · MessageContent · JSONValue
    Services/                 CornerAPI · MessageTransport · PushService · AppRouter · RoomStore
    Views/                    Root · SignIn · RoomList · Chat(+ViewModel) · MessageBubble · Block · Account · Theme
  CornerTests/                82 tests, incl. a render gallery
```

## Tests

82 tests. The interesting ones run the thread's state machine against failures on
purpose (a send that refuses, a turn that goes silent, a device that missed more than
a window of messages) through `MessageTransport`, the seam that exists so those paths
are *observed* rather than assumed.

`RenderGalleryTests` renders the real views with real row shapes to PNGs
(`CORNER_RENDER_DIR`, else the test host's tmp) so the states that only appear under
failure can be looked at deliberately. It is a gallery, not a snapshot-comparison
suite — no golden files to churn. It already earned its keep once: it caught five
different block fallback cards rendering as the same card.

## App Store posture

- **No `UIBackgroundModes` at all.** The wrap declared `audio` and
  `remote-notification` while implementing neither (audit F3). Alert pushes need no
  background mode; `remote-notification` gets added when a silent lane is actually
  written.
- `aps-environment` expands from `APS_ENVIRONMENT` per configuration — development in
  Debug, production in Release — so sandbox tokens are never offered to the production
  APNs host.
- Truthful `PrivacyInfo.xcprivacy`. The wrap's declared no collected data at all while
  collecting email, name and user content (audit F5).
- Real in-app account deletion (5.1.1(v)), driven by the server's own summary of
  consequences so the on-screen words cannot drift from what the endpoint does.
- Auth stays first-party, so Sign in with Apple is not required (4.8). **That
  exemption dies the moment any OAuth button appears in this app.**
- Push permission is requested after the first agent reply, never at launch, and
  everything works with it refused (4.5.4).

## Known gaps at the end of Stage 1

- **No app icon.** `Assets.xcassets/AppIcon.appiconset` is deliberately empty — a
  store icon is creative-direction work, not something to fabricate here. Simulator
  and device builds are unaffected; App Store validation will require it.
- **Push has never delivered a packet**, because the APNs `.p8` key does not exist in
  the Apple developer portal yet (carried over from Stage 0). The client registers,
  the server no-ops cleanly when unset. The first real send is where a wrong bundle id
  or a sandbox/production mismatch would surface.
- **Only the sign-in screen has been seen running on a simulator.** Every screen past
  auth needs a real Corner account, which this build has never had. They are covered
  by unit tests and by the render gallery, not by a human eye on a live thread.
- `metadata.blocks` is minimum-viable: text, link cards, steps, success/snag, summary,
  code, artifacts, and an honest fallback card for everything else. The full
  vocabulary is Stage 2/4.
- No attachments/upload, no room files panel, no world switching, no search beyond a
  local filter over the rail.
