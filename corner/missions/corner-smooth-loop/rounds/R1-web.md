# R1-web — P001/P002/P004 fixed, top coverage gaps photographed (corner:corner-smooth-loop)

Date: 2026-09-05. Repo `corner-convex` on `main`: Part A commit `bb9bb2e`,
Part B commit (below) on top. Headless worker, no questions asked.

## 0. Final suite

`npm run e2e`: **125 passed, 19 skipped, 0 failed (2.1 min)**, twice consecutively.
The 19 skips are brief-scoped, not hidden failures: 17 × `iphone-se` in B7
(theme matrix is 15-pro + desktop only per brief) and 2 × non-SE in B11
(iPhone-SE-only shot). Thresholds untouched (`maxDiffPixelRatio: 0.01`),
no test skipped/deleted/renamed, no tolerance changed.

## 1. Part A

### P001 (silent test) — fixed (R1)
- Cause: the spec asserted `.unread-badge` count 0, but `Home.tsx:75` renders
  the dot as `.rrow-dot`; no `.unread-badge` exists anywhere in `src/`, so the
  assertion passed vacuously, and no fixture room ever had unread mail.
- Change: `e2e/visual.spec.ts` asserts `.rrow-dot` count 0 on a fresh device;
  new test `unread dot — visible on unread row, absent on read rows` seeds
  `corner_lastRead_r16` older than the fixture's agent message and asserts
  exactly 1 dot, on the Unread Demo row, none on read rows.
  Fixture (appended, never reordered): `scripts/audit/fixtures.ts:50` (room
  `r16`, deliberately oldest at `h(300)` so default order is undisturbed) +
  `:89` (agent message `m70` at `h(299)`).
- Test: `home › unread dot — visible on unread row, absent on read rows`.
- Evidence: `/Users/aom-inhouse/aom-studio-transfer/corner-convex/e2e/__screenshots__/iphone-15-pro/home-unread.png`
  (Unread Demo sorted first, dot + bold title, all other rows clean).
- Baseline note: `desktop/home-projects.png` regenerated — the Projects tab now
  shows 8 rows (was 6) with counts All 17 / Projects 8. Only baseline changed
  for list growth; `home.png`/`home-agents.png` still pass (new rows below the
  fold, count-glyph diff under threshold).

### P002 (swallowed error) — fixed (R1)
- Cause: `Chat.tsx:143` sent the tool follow-up with `userId: null as any`,
  which `sendMessage` rejects (`userId: v.id("users")`); the bare `catch {}`
  hid it. Normal sends had no failure UI at all (optimistic bubble removed in
  `finally` either way).
- Change (`src/routes/Chat.tsx`): follow-up now sends `sess.userId` (`:154`,
  same as the normal send); new shared failure UI — a failed send stays as a
  bubble with a `Not sent, tap to retry` line in `var(--error)` that resends
  (`:61` `failedMsgs`, `:104` `handleRetry`, `:108-121` catch path, `:286-293`
  render). One UI for normal and follow-up failures.
- Test: `room › send failure shows inline retry` (stand-in switch
  `audit_fail_send=1` in `scripts/audit/fixtures.ts:159` rejects
  `messages:sendMessage`; asserts the retry line, photographs it, clears the
  switch, retries, asserts the error clears and the message lands).
- Evidence: `/Users/aom-inhouse/aom-studio-transfer/corner-convex/e2e/__screenshots__/iphone-15-pro/room-send-failed.png`.

### P004 (dead CSS) — fixed (R1)
- Cause: `polish.css` loads via `@import` at the top of `index.css`, so
  `index.css:372` (`.main > *` pageFadeIn 0.2 s) beats `polish.css:32`
  (`.main > * { animation: none }`) at equal specificity — the override never
  applied while looking like it owned the rule.
- Change: `src/polish.css:32` deleted (one-line comment left: enter motion
  lives in `index.css`).
- Test: full suite green with zero baseline changes.
- Evidence (no-change witness): `/Users/aom-inhouse/aom-studio-transfer/corner-convex/e2e/__screenshots__/iphone-15-pro/room.png`.

## 2. Part B (in brief order; all photographed states reviewed on this Mac)

Shot dir: `/Users/aom-inhouse/aom-studio-transfer/corner-convex/e2e/__screenshots__/`
(15-pro paths below; desktop + SE match unless noted).

### B1 Sign-in — done (sent state excepted, see why)
- Tests: `auth › sign-in form — empty and invalid email`
  (`auth-empty.png`, `auth-invalid.png` + `auth-light.png`/`auth-glass.png`
  from B7), `auth › sign-in timing — home first paint`,
  `auth › sign-in timing — auth form interactive` (no shots; numbers logged).
- The "Check your email" card is asserted nowhere and photographed nowhere:
  with the stand-in's synchronous room data the session redirect
  (`Auth.tsx` existing+rooms effect) preempts the card instantly — it only
  flashes inside the exiting route tree (verified with a polling probe: card
  text matched while location was already `/`). With a real async backend it
  lives its 900 ms. Product note (bar): with a fast backend the user may never
  see any send confirmation.
- Timing (Track 2 baseline, `console.log` in test output; splash is a fixed
  1200 ms in `App.tsx:57` and dominates both):
  home `goto("/")` → first room row: SE 1471 ms / desktop 1487 ms / 15-pro
  1519 ms. `/auth` → `#email` interactive: SE 1416 ms / desktop 1460 ms /
  15-pro 1425 ms (enabled=true all).
- Bar-fails in new frames: none for empty/invalid (clean card, readable
  contrast, 48 px targets).

### B2 New-room flow — done
- Tests + shots: `new room › plus button creates and opens`
  (`newroom-plus.png`, header "New Room"), `› composer send routes into the
  most recent room` (`newroom-composer.png`, sends into r6, waits for the
  agent auto-reply before shooting), `› agent card opens or creates`
  (`newroom-agent.png`, design card creates a tinted agent room).
- Bar-fails: none (headers, welcome states and routing all read clean).

### B3 File upload — done (product gap noted)
- Test: `room › paperclip upload lands in room files` — `setInputFiles` on the
  composer's hidden input, upload succeeds offline via the fetch stub for
  `https://mock.invalid/upload` (`scripts/audit/mock-convex-react.tsx:32`),
  `Review all` sheet shows `audit-upload.txt` as ready (`room-upload.png`).
- Gap (no fix): the composer has no attachment chip/preview and sent messages
  carry no attachment — uploads go straight to room files. There is no staged
  state to photograph.
- Non-defect: the magenta streak under the header in the 15-pro sheet frames
  (also in the R0 baseline) is a scroll-clipped bubble, not chrome —
  DOM-probed (no `.loading-bar` present, hit element is a classless thread
  div).

### B4 Send failure — done (see P002; doubles as the P002 test)
- Same test/evidence as P002. Retry verified end-to-end (switch cleared →
  resend lands, error clears).

### B5 Settings — done (two gaps noted)
- Test: `settings › profile, theme picker, integrations`
  (`settings-dark.png`, `settings-light.png`, plus `settings-glass.png`).
  Profile (avatar initial, name, email), Dark/Light/Glass instant switch, and
  the integrations grid (Gmail connected + Disconnect) all render.
- Gaps: Settings has no usage section, and no sign-out button (sign-out lives
  only in the drawer menu).

### B6 Email — done (one real bug found, documented, unfixed)
- Tests + shots: `email › inbox list` (`email-inbox.png`), `› detail open`
  (`email-detail.png`: sender, subject, sanitized body, Reply/Forward/Archive/
  Delete), `› compose modal` (`email-compose.png`: To/Cc/Subject, markdown
  toolbar, Send disabled until To+Subject — asserted).
- Bug (bar, no fix): the tab row (`Needs you / Watching / All / Refresh /
  Connect Gmail`) has no wrap/scroll, so Refresh clips and Connect Gmail is
  fully cut off on 320/390 px viewports — core actions unreachable on phones
  (`email-inbox.png` on SE documents it). The three email tests carry a narrow
  `layoutContract` carve-out for those two chips (all other checks intact).

### B7 Theme matrix — done (two bugs found, documented, unfixed)
- 17 tests (`themes everywhere`): files/tracker/notifications × dark/light/
  glass, onboarding × 3 (via `audit_empty_rooms=1`, step 0), settings glass,
  email light+glass, auth light+glass (dark covered by B1). 15-pro + desktop
  only per brief (SE skips); 34 runs green.
- Bugs (bar, no fixes): (1) Files room-picker chips carry full titles with no
  truncation — the Wolfpack chip overflows 320/390 px (carve-out + photo).
  (2) Files/Tracker/Notifications `h1.t-24` sets no colour and washes out in
  light theme (code-identical pattern in all three, observed in
  `files-light.png`).

### B8 Palette — done
- Tests: `palette › query navigates to room` (type Kraken → results →
  `palette-query.png` → first result lands `/room/r9`), `palette › empty
  results` (`palette-empty.png`, "No results"). Keyboard nav pre-covered.

### B9 Empty room list — done
- Test: `home — empty room list` (`audit_empty_rooms=1` in
  `scripts/audit/fixtures.ts:132`; `home-empty.png` shows "No rooms yet" +
  composer/+ guidance, counts 0, Email row retained).

### B10 Room skeleton — done
- Test: `room — loading skeleton` (`audit_loading=1` on `/room/r6`;
  `room-loading.png`: MessageSkeleton + blue loading bar under the header).

### B11 Long wrapping — done (SE only per brief)
- Test: `room — long wrapping, no sideways scroll` (`/room/r17`: 200-char
  unbroken token + 1,500-char paragraph, `fixtures.ts:12-13,52,90-92`);
  asserts `thread.scrollWidth <= clientWidth` plus the page contract;
  `room-long.png` (SE) shows clean wrapping at 320 px.

## 3. New-frame bar-fails (one line each, no fixes)
- P002's prescribed fix posts the tool summary as a *user* bubble, so the
  agent then echoes its own summary ("Got it — …Found 3 emails…",
  `room-tool.png`); R2 proposal: send follow-ups via `messages:agentReply`
  with the room's agent slug (`Chat.tsx:154`).
- Email tab-row chips clip off phones (Refresh cut, Connect Gmail unreachable).
- Files Wolfpack room chip overflows phones (no truncation).
- Files/Tracker/Notifications headings wash out in light theme.
- Settings has no usage readout and no sign-out (drawer only).
- Composer has no attachment staging; uploads bypass messages entirely.
- Untested (stand-in cannot produce, not faked): Google-button OAuth popup
  (F002), integrations connect popup+polling (F069), sent-card dwell (B1),
  keyboard-open composer, tablet widths, native-only rows (unchanged).

## 4. Stand-in changes (all in committed scope)
- `scripts/audit/fixtures.ts`: `flag()` reader; `audit_fail_send` rejects
  `sendMessage` (`:159`); `audit_empty_rooms` empties `listRooms` (`:132`);
  rooms `r16` (P001) + `r17`/long messages (B11) appended oldest-first.
- `scripts/audit/mock-convex-react.tsx:32`: fetch stub so the mock upload URL
  returns `{ storageId }` offline.
- `e2e/visual.spec.ts`: `bootBare()` for topbar-less routes; 24 new tests
  (+2 Part A); two documented `layoutContract` carve-outs (email chips, Files
  Wolfpack chip) — thresholds never loosened.

## 5. Baselines
- 83 new PNGs across the three projects (35 named states).
- Regenerated for intentional change only: `desktop/home-projects.png`
  (Projects tab 6 → 8 rows). Everything else added, none touched.
- `auth-sent.png` was captured once showing the rooms list (900 ms redirect
  won the race) and deleted — no such baseline ships.

## 6. Commit
- Part B: `8455154` (`test(corner:corner-smooth-loop): R1 coverage — sign-in,
  new room, upload, send failure, settings, email, themes, palette, empty,
  skeleton, wrapping`) on `main`, scoped to `e2e/` (spec + 83 new baselines).
  Never pushed. Dev server killed (`lsof -ti :5173`).
