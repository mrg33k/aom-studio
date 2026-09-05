# R0 — Inventory (2026-09-05)

Mission: `corner:corner-smooth-loop`. Worker brief: read-only inventory, no runs, no commits.
Sources read in full: `src/App.tsx`, `src/main.tsx`, all 10 `src/routes/*`, all 11
`src/components/*`, `src/polish.css`, `src/lib/auth.tsx`, `e2e/visual.spec.ts`,
`FRONTEND-AUDIT.md`, `NATIVE-IOS-AUDIT.md`, `scripts/audit/` (fixtures, mock, run, probe),
`ios-native/Corner/Views/*.swift` (all 30, structural skim + targeted reads of RootView,
SignInView, RoomListView top bar/Tools, ChatView toolbar/action-row/commands menu),
`Services/AppRouter.swift`, `ios-native/README.md`.

## Counts

- Total features: **88** (`F001`–`F088` in `features.md`).
- Web features: **53** (32 shared + 21 web-only). Of those, **18 have a Playwright test**
  (20% of all features; 34% of web features). F075 is covered twice (light + glass).
- Native features: **67** (32 shared + 35 native-only). Tour coverage: **0** (tour harness
  does not exist yet — see disagreements §9).
- Feel checks: 13 lines in `features.md` (timing/haptics/keyboard/scroll that screenshots
  cannot prove).

## Parity list — one platform only (56)

Web-only (21): F002 Google button · F003 invalid-email message · F006 splash loader ·
F009 filter chips · F016 arrow-key row nav · F032 tool result card · F053 Enter-to-send/Escape
semantics · F055 Files page · F056 Files signed-out/no-room copy · F061 Tracker page ·
F065 free compose modal · F066 Connect-Gmail OAuth · F068 web Settings (profile+theme) ·
F069 integrations connect/disconnect · F077 command palette · F078 instant + room create ·
F082 slide-in drawer · F084 onboarding flow · F085 signed-out/no-room guards ·
F086 NotFound pages · F087 missing-env config screen.

Native-only (35): F004 password/credential errors · F007 forced password change · F020 pinned
search · F021 hide-from-Recent swipes · F022 no-workspace notice · F023 waiting-on-you card ·
F024 project→mission grouping · F025 pull-to-refresh · F034 dead-turn states · F040 in-thread
search · F042 image generation · F043 paste chips · F044 room settings sheet · F045 rename ·
F046 share link · F047 clear/history archive · F048 checklists · F049 chat swipe carousel ·
F050 offline cached-thread banner · F054 per-room drafts · F057 review queue + verdict ·
F058 push-to-file · F059/F060 Organize + its signed-out states · F062 tracker boards ·
F067 agent reply drafts · F070 Account sheet · F071 read-only integrations + typed delete ·
F073 phone registration states · F074 push routing · F079 new-room sheet · F080 voice ·
F081 background work · F083 deep links + restore + refusal alert · F088 Live Activity/widget.

Patrik-relevant reading: native is the fuller app (67 vs 53 surfaces). Web has no review
queue, no organize, no boards, no checklists, no room settings/rename/share/clear, no voice,
no background work, no push/Live Activity — all daily-use surfaces on the phone. Conversely
web owns onboarding, Gmail OAuth + free compose, and the instant-create path, none of which
exist natively (native account screen says "connect from the web dashboard").

## 10 biggest coverage gaps (by visibility of a break to a daily user)

1. Native send → thinking → reply (F029/F033): the core loop, zero coverage until the tour lands.
2. Web sign-in form + first paint after sign-in (F001/F006): Track 2 priority one, no test.
3. Native sign-in incl. offline/wrong-password + forced password (F004/F007): auth gate untested.
4. Web home-composer send → room routing (F015): the main creation path, no test.
5. Web email inbox + detail actions + compose (F063–F065): an entire surface, no test.
6. Native review verdict flow (F057): approvals are irreversible, zero coverage.
7. Web integrations connect/disconnect (F069): the "more tools" product promise, no test.
8. Web onboarding launch creating rooms (F084): first-run writes real rooms, no test.
9. Native push tap → room/message focus (F074): pocket-reply delivery is the native app's
   stated reason to exist (`README.md` Why-it-exists), zero coverage.
10. File preview + verdict both sides (F037 web approve/changes; native share/assign):
    the handoff surface clients see, no test.

## Where the audits disagree with the code (file:line)

1. `FRONTEND-AUDIT.md:3` says the native target "is a README plus a client stub, so there
   is nothing there to audit yet." Wrong: `ios-native` holds 96 Swift source files;
   `Views/ChatView.swift` alone is 2078 lines, `Views/RoomListView.swift` 1587.
2. Web audit P0 §6 (Home mounted behind Chat, `App.tsx:298-303`): fixed.
   `App.tsx:205-208` renders `{pathname==="/"?<Home/>:<Chat/>}` — single mount; only one
   `composer-input` (`Composer.tsx:125`) vs `home-composer-input`; Escape ignores text
   fields (`App.tsx:92-97`).
3. Web audit P0 §5 (palette/FAB off-centre): fixed. `CommandPalette.tsx:97` and
   `Chat.tsx:359` use the motion value `x:"-50%"` instead of a discarded CSS transform.
4. Web audit P0 §3 (doubly-nested composer): fixed. `Chat.tsx:378` renders a bare
   `<Composer/>`; dock metrics live in `polish.css:105-109`.
5. Web audit P1 §9 (blank unknown route / bad-room white-screen): fixed. `main.tsx:60`
   catch-all plus `NotFound.tsx`, `Chat.tsx:164-165` room-null guard, covered by
   `unknown route and unknown room are not blank`.
6. Web audit P1 §10 + its test disagree with the code: the audit says badges are fixed
   and the spec asserts `page.locator(".unread-badge")` count 0 — but `Home.tsx:75`
   renders the dot as `.rrow-dot`. There is no `.unread-badge` selector anywhere in
   `src/`, so the assertion passes vacuously; a badge regression would not fail it.
7. Web audit P1 §11 (filter counts): fixed. `Home.tsx:96` queries once with
   `filter:"all"` (caveat: the Agents chip takes `max(rooms, roster length)`,
   `Home.tsx:193`).
8. Web audit P0 §2 (Home scroll/composer + padding shorthand): fixed as far as R0 can
   tell — no inline `paddingBottom` remains in `Home.tsx` (only `padding:24` in the
   signed-out view, line 175); scrolling/dock owned by `polish.css:37-38,85-89`.
9. `NATIVE-IOS-AUDIT.md:7` presents `ScreenTour.swift` + `scripts/screenshot-tour.sh` as
   the written harness and §3 counts "102 Swift files, ~250 unit tests, 2 UI test files":
   `CornerUITests/` holds only `ScreenshotCapture.swift` + `SharedBackendAcceptance.swift`
   (no `ScreenTour.swift`); `ios-native/scripts/` holds only `no-webviews.sh`;
   source-tree Swift count is 96 (2250 including `build/` DerivedData); `CornerTests/`
   holds 308 `func test…` methods. The tour is correctly "being built in parallel" —
   native tour coverage is 0 through no fault of this round.
10. `ios-native/README.md:143-148` claims "82 tests" (308 counted) and `README.md:77`
    claims every privileged call carries the JWT — the native audit's finding 1
    (client-asserted `userId`, no Authorization header) is carried as claimed, not
    re-verified: `ConvexService.swift` was out of this round's read scope. Confirm in R1.
11. Still present, not a disagreement: web audit P1 §18 — `Chat.tsx:143` still sends the
    tool follow-up with `userId: null as any`, which `sendMessage` rejects; the error is
    still swallowed. Carried to the punch list.
12. Web audit P0 §7 (themes): partially addressed, not verified. `polish.css:126-129`
    re-grounds Light/Glass and `:144-146` fixes header buttons; the light/glass specs
    assert title-vs-card contrast. The deeper token-architecture complaint
    (`:root` vs `.shell[data-theme]`, colour literals) was not re-checked line by line.

## Offline stand-in limits (what R0 could not inventory from code alone)

`scripts/audit/mock-convex-react.tsx:10-15` forces *every* query to `undefined` under
`audit_loading=1` (loading states only); fixtures seed rooms/messages/files/turns/
notifications/integrations/tracker but no error, empty-world, offline, or signed-out
variants. States marked error/offline/empty above need harness or live-backend work
before they are photographable.
