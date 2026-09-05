# R2-web-fix — P008–P014 closed, each with the test that keeps it closed (corner:corner-smooth-loop)

Date: 2026-09-05. Repo `corner-convex` on `main` (`8455154` + commits below, never pushed).
Headless builder, no questions asked. Reviewer reads PNGs concurrently (never edits);
no baseline was deleted without a regenerated replacement in the same step.

## 0. Final suite (two consecutive plain runs, both green)

- Run 1: `npm run e2e`: **131 passed, 19 skipped, 0 failed (2.3 min)**
- Run 2: `npm run e2e`: **131 passed, 19 skipped, 0 failed (2.3 min)**
- The 19 skips are the same brief-scoped skips as R1 (17 × `iphone-se` theme-matrix,
  2 × non-SE long-wrapping shot). Thresholds untouched (`maxDiffPixelRatio: 0.01`),
  no test skipped/deleted/renamed, no tolerance changed. `npx tsc --noEmit` clean.
- Suite grew 125 → 131 tests: +2 upload (chip assertion inside the existing test +
  new failure test), +1 auth sent-card, +3 `settings-signout.png` shots (one per
  project, inside the extended settings test).

## 1. P008! Email tab row clips on phones — fixed (R2)

- Cause: the tab row was a plain non-wrapping flex div, so Refresh clipped and
  Connect Gmail sat off-viewport at 320–390 px with no way to reach it.
- Change (`src/routes/Email.tsx:489`): the row is now `className="chips-row"` —
  the exact pattern Home uses (`Home.tsx` filter chips): `overflow-x: auto`, no
  scrollbar, right-edge fade (`src/polish.css:42-43,139`). All chips keep their
  styles; Refresh/Connect Gmail are reachable by horizontal scroll.
- Test: `email › inbox list` — carve-out removed (full `layoutContract()`), plus
  `Connect Gmail` is `scrollIntoViewIfNeeded()` + asserted visible (screenshot
  taken before the scroll so the baseline shows the natural state). Carve-outs
  also removed from `email › compose modal` and `themes everywhere › email — light/glass`.
- Evidence: `/Users/aom-inhouse/aom-studio-transfer/corner-convex/e2e/__screenshots__/iphone-15-pro/email-inbox.png`
  (Connect Gmail peeks at the faded right edge — reads as scrollable).
- Baselines regenerated: `email-inbox.png`, `email-compose.png`, `email-light.png`,
  `email-glass.png` (iphone-15-pro); `email-inbox.png`, `email-compose.png`
  (iphone-se). `email-detail.png` (no tab row) and desktop email shots (no
  overflow at 1440 px) are intentionally untouched.

## 2. P013! Tool follow-up echo — fixed (R2)

- Cause: the follow-up summary posted via `messages:sendMessage` with the
  signed-in user id, rendering as a USER bubble; the room agent then answered
  its own summary ("Got it — …Found 3 emails…").
- Change (`src/routes/Chat.tsx:48,178`): the follow-up now goes through
  `messages:agentReply` with the room's agent slug (`room?.specialist ?? "corner"`)
  and text-only (no `userMessage`, so `convex/messages.ts:233-267` — read, not
  edited — sends it verbatim: `userId: null`, agent bubble, no chained dispatch
  since the text carries no @mentions and autonomous dispatch needs
  `userMessage`). `handleRetry` (`:111-127`) retries follow-up failures through
  `agentReply` so they stay agent bubbles; user-send retry path unchanged. The R1
  failure UI is kept for both.
- Test: `room › tool working indicator and result card` — asserts exactly one
  `.msg-row` contains "Found 3 emails", that it hosts `.msg-agent`, waits past
  the 1.4 s echo window, and re-asserts the count is still 1.
- Evidence: `/Users/aom-inhouse/aom-studio-transfer/corner-convex/e2e/__screenshots__/iphone-15-pro/room-tool.png`
  (summary is a Corner agent bubble; the "Got it — please check my inbox" bubble
  below is the stand-in's pre-existing generic auto-reply to the user's own send,
  not an echo of the summary).
- Baselines regenerated: `room-tool.png` (all three projects).

## 3. P009 Files chip overflow — fixed (R2)

- Cause: room-picker chips rendered full titles in a wrapping flex row with no
  truncation; the Wolfpack chip overflowed 320–390 px viewports.
- Change (`src/routes/Files.tsx:33-34`): same `chips-row` pattern as P008, plus
  per-chip `maxWidth: "14ch"` with ellipsis and `title={r.title}` carrying the
  full name.
- Test: `themes everywhere › files — *` — carve-out removed (full contract), plus
  Wolfpack chip asserts `title` ≈ full name and `scrollWidth > clientWidth`
  (i.e. it really truncates).
- Evidence: `/Users/aom-inhouse/aom-studio-transfer/corner-convex/e2e/__screenshots__/iphone-15-pro/files-light.png`
  (single scroll row, truncated labels, fade at the right edge).
- Baselines regenerated: `files-dark.png`, `files-light.png`, `files-glass.png`
  (iphone-15-pro and desktop).

## 4. P010 Light-theme headings — fixed (R2)

- Cause (probed live, not guessed): nothing inside `.shell` ever binds `color`
  to the theme token — `body` sets `color: var(--fg)` but `body` sits outside
  the `[data-cv6][data-theme]` scope, so bare `h1.t-24` (font-size only) inherits
  the dark `--fg` (#E9E9EC) on all themes and washes out on light.
- Change (`src/index.css:277`): `.t-24` gains `color: var(--fg)`. `--fg` is
  redefined per theme on the shell, so light gets #18181B (verified
  `rgb(24, 24, 27)` in-browser) while dark/glass resolve to exactly the colour
  they inherited before — no dark/glass change (their baselines pass
  unmodified: `tracker-dark/glass`, `notifications-dark/glass`, `files-dark/glass`
  on desktop untouched by this item).
- First attempt used `var(--ink)` and failed visibly: `--ink: var(--fg)` is
  declared on `:root`, where `var()` substitutes against `:root`'s own dark
  `--fg` — aliases do not re-resolve per theme. `var(--fg)` used directly is the
  correct "theme ink token" (`--ink`/`--text` are aliases of it).
- Test: `themes everywhere › {files,tracker,notifications} — *` asserts the
  heading colour differs from the shell ground on every theme.
- Evidence: `/Users/aom-inhouse/aom-studio-transfer/corner-convex/e2e/__screenshots__/iphone-15-pro/tracker-light.png`
  ("Tracker" now reads; same fix visible in files/notifications light shots).
- Baselines regenerated (light only, per brief): `tracker-light.png`,
  `notifications-light.png` (iphone-15-pro and desktop); `files-light.png`
  (both, shared with P009). Dark/glass for tracker/notifications: verified
  unchanged.

## 5. P011 Settings sign-out — fixed (R2)

- Cause: sign-out existed only in the drawer menu; Settings (where people look)
  had profile + theme + integrations only. Usage readout skipped per brief
  (needs backend data).
- Change (`src/routes/Settings.tsx:222-235`): `Sign out (email)` card-row button
  at the bottom, same `.card` row shape as the drawer's sign-out row
  (`App.tsx:194`), wired to the identical behaviour (`clearSession()` +
  `nav("/auth")`).
- Test: `settings › profile, theme picker, integrations` asserts the row is
  visible, photographs it scrolled into view (`settings-signout.png` — the row
  sits below the fold so the existing dark/light/glass frames are pixel-identical
  and correctly NOT regenerated), clicks it, and asserts the app lands on
  `/auth` with the sign-in form. (Side fix in the same test: the two
  `hello@aom-inhouse.com` assertions now use `{ exact: true }` — the new row's
  "Sign out (…)" text made the old selector strict-mode-ambiguous.)
- Evidence: `/Users/aom-inhouse/aom-studio-transfer/corner-convex/e2e/__screenshots__/iphone-15-pro/settings-signout.png`.
- Baselines regenerated: none of the existing settings shots (verified
  pixel-identical — row is below the fold); added `settings-signout.png` (all
  three projects).

## 6. P012 Upload feedback — fixed (R2)

- Cause: `handleAttach` uploaded silently — success showed nothing above the
  composer, failure threw an unhandled rejection.
- Change (`src/routes/Chat.tsx:69,192-210,434-468`): `handleAttach` now sets an
  `uploadNotice`. Success → `Added to room files: <name>` chip above the
  composer with an accent `View` link opening the files sheet, auto-dismissed
  after 6 s (timer cleared on unmount/re-upload). Failure (non-OK status or
  thrown error) → `Upload failed, tap to retry` in `var(--error)`, same
  transparent-button pattern as the R1 send-failure line, holding the `File` so
  a tap retries the same bytes. Chip text truncates with ellipsis (320 px safe).
  `Composer.tsx` itself needed no change (it already forwards the file).
- Stand-in (`scripts/audit/mock-convex-react.tsx:39-40`): new `audit_fail_upload=1`
  switch makes the mock upload POST return 500 (same localStorage-flag idiom as
  `audit_fail_send`/`audit_loading`).
- Tests: `room › paperclip upload lands in room files` asserts + photographs the
  chip (`room-upload-chip.png`), then opens the sheet via the View link
  (`room-upload.png`); new `room › paperclip upload failure shows retry` asserts
  the retry line, its error colour (`rgb(248, 113, 113)` = `--error` on dark),
  photographs it (`room-upload-failed.png`), clears the switch, taps retry, and
  asserts the success chip for the same file.
- Evidence: `/Users/aom-inhouse/aom-studio-transfer/corner-convex/e2e/__screenshots__/iphone-15-pro/room-upload-chip.png`.
- Baselines regenerated: `room-upload.png` (all three projects); added
  `room-upload-chip.png`, `room-upload-failed.png` (all three projects).

## 7. P014 "Check your email" pre-empted — fixed (R2)

- Cause: the audit harness defines `VITE_CONVEX_URL`, so `signIn()` takes the
  Convex-mutation path with real awaits; the session state lands in an
  intermediate render while `sent` is still false, and the existing-session
  effect (which re-runs every render — `getSession()` returns a fresh object)
  redirects instantly on the stand-in's synchronous rooms. R1 photographed the
  card text only inside the already-exited tree.
- Change (`src/routes/Auth.tsx:25,28,70,85`): a `sendArmed` ref is set
  synchronously when a send starts (after inline email validation, same message
  as before) and the redirect effect skips while it is armed; disarmed on send
  failure. Applied to both the magic-link and the Google-with-email paths (same
  race, same file). On success the existing 900/800 ms timers navigate as before.
- Test: `auth › sent card shows before the session redirect` fills a valid email,
  submits, asserts the card is visible while the URL is still `/auth`,
  photographs it (`auth-sent.png`), then asserts the redirect lands (timer →
  `/onboarding` → skips straight home since the new session has rooms; asserts
  `/` + first room row). The stale NOTE on the empty/invalid test now points here.
- Evidence: `/Users/aom-inhouse/aom-studio-transfer/corner-convex/e2e/__screenshots__/iphone-15-pro/auth-sent.png`.
- Baselines regenerated: none existing (all pre-existing auth shots pass
  unmodified); added `auth-sent.png` (all three projects).
- Real-backend verification still owed: the 900 ms hold is stand-in-proven; on a
  live backend confirm the card still shows for slow sends (fault noted, not a
  code gap).

## 8. Anything touched that was not on the list, and why

- `e2e/visual.spec.ts` only: P009/P010/P011 assertions inside existing tests,
  the `{ exact: true }` disambiguation (P011 fallout), and the stale-NOTE
  rewording (P014). No other app file touched.
- `handleGoogle` armed with the same `sendArmed` ref (P014): identical race on
  the same effect, one line, same root cause — leaving it would keep the exact
  reported bug one button away.
- `handleAttach` now checks `res.ok` explicitly (P012 failure path needs it;
  previously a non-200 with a JSON body would have proceeded to `uploadFile`).

## 9. New bar-fails noticed in new frames (one line each, no fixes)

- Email sender/subject line truncates the sender to an initial ("S..") at 390 px
  while the subject has room to spare (`email-inbox.png`).
- Tracker issue cards clip long titles on phones ("…Creative", "…Web" cut
  mid-word at the card edge rather than ellipsized, `tracker-light.png`).
- Room sheet rows (`room-upload.png`) show Mint/Share actions in dark text on a
  dark sheet row — same theme-token gap class as P010, one component over.
- `room-tool.png` stacks the follow-up summary above the generic auto-reply, so
  the thread reads answer-then-answer with no visible question in frame.
- `settings-signout.png`: the integrations grid below the fold is a wall of
  identical blue Connect buttons with no hierarchy (pre-existing, newly framed).
- `auth-sent.png`: the sent card has no "wrong email? go back" affordance — a
  typo'd address strands the user for 900 ms plus a manual back-nav.

## 10. Commits (on `main`, scoped paths, never pushed)

- Per item or tight group, message `fix(corner:corner-smooth-loop): R2 P0xx …`.
- Dev server: Playwright-managed (no leftover; `lsof -ti :5173` empty).
