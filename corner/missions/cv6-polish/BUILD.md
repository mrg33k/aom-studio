# CV6 Polish - Mission Build Plan

**Started:** 2026-07-15
**Mission path:** `corner:cv6-polish`

## Working protocol (every round)

1. rex writes the round brief; Codex builds headless in the mission worktree
   (`.claude/worktrees/cv6-polish/`), updates this BUILD.md, runs `node --test`,
   `npm run test:tenant-context`, and `npm run build` in its sandbox.
2. Codex CANNOT run browsers; any browser claim from Codex is unverified by definition.
   rex reruns the playwright specs externally (tmux + vite on 127.0.0.1) and screenshots
   both widths before anything lands.
3. rex lands: commit in worktree, merge to main, verify merged main as a separate step,
   push (auto-deploys), `vercel inspect --wait`, probe live URLs, screenshot and look.
4. Visual rounds complete the design gate inline here before code: name the font, the
   brand, and "This design is unmistakably Corner because ___".
5. Spec patterns that survive this repo: `?demo=<surface>` no-auth fixtures mounting the
   real component with seeded data; POST intercepts on bare paths (no `?**`);
   getByRole accessible-name asserts, not getByText.

## Rounds

### R0 - Email records: our own Sent copy on every send path

Backend truth round carried from `corner:truth-contracts` R6 (Patrik approved keeping
our own copy). On every send-success across every agent/worker send path, log the exact
outgoing email body into `support_wish_updates.kind=response` (the app's Sent copy);
Gmail stays the verification source. Manual paths (`api/support/reply.js`,
`api/support/send-staged.js`) already do this; the agent/worker paths do not.
Also correct the stale needs-patrik card that called this already built.

- 2026-07-15 shipped by the EA in the AOM-EA repo: the M27 auto-send timer lane in
  `scripts/support-worker-dispatch.py` was the one remaining path recording a generic
  line; it now reads the staged draft's exact text (action=get, text/plain walk)
  before sending and records that on send-success. Verified via py_compile plus a
  synthetic multipart decode test. needs-patrik card corrected the same pass.

**Status:** shipped (AOM-EA commit, pushed 2026-07-15).

### R1 - Global motion: logo loader, screen transitions, touch feedback

- Replace every generic loading state in CV6 with the Corner logo loader: the mark
  (`public/cv6/assets/corner-logo.svg` / `corner-logo-white.svg`) filling from the
  baseline up in the theme accent, on the theme ground, correct in all three themes.
  One shared component; no per-screen spinner forks. Keep honest loading language
  (`corner:cv6-loading-language` round stands).
- Screen-to-screen transitions: consistent, fast, no white flash, no layout jump when
  moving between the 7 pages (desktop tool switch + mobile drawer navigation).
- Touch feedback baseline: every tappable control gets a visible pressed/active state
  and a minimum 44px hit target on mobile; builds on the R6 template action-control
  normalization in `cv6kit/templateEngine.js`.

Design gate: font stays the CV6 system stack (`--font-sans`/`--font-mono` tokens);
brand is Corner (CV6 design system). This design is unmistakably Corner because the
loader IS the Corner mark itself filling with the theme accent (#3B82F6 family via
`--accent`) on the CV6 ground token, using the same easing vocabulary as the existing
`statPulse`/`spin` motion, and no surface anywhere shows a generic spinner.

Implementation notes (2026-07-15):

- Reworked the shared `FullscreenLoading` / `CornerLogoLoader` primitive around the
  real Corner SVG mask. The base mark uses fixed ink/white per theme and fills upward
  from the baseline in `--accent`; the app-root `data-app-theme` observer keeps live
  dark/light/glass flips correct, and readers retain fixed paper ink/blue.
- Replaced CV6 shared state, Files viewer, media, PDF, DOCX, HTML, Campaign, upload,
  auth-gate, and pre-React boot loading visuals without changing their honest state
  conditions or product language. Agent-work progress indicators remain work status,
  not fake data-load indicators.
- Added one keyed `.cv6-screen-stage` around tool content plus shared drawer entrance
  motion. The stage holds the theme ground and layout slot across desktop and mobile
  tool switches; reduced-motion removes the animation.
- Centralized action press feedback and the mobile 44px minimum target in `cv6.css`.
  `templateEngine.js` now normalizes template actions with `data-cv6-pressed` and an
  `is-pressed` class for the duration of a pointer hold.
- Added the public, tenant-data-free `?demo=global-motion` fixture and
  `tests/cv6-global-motion.spec.mjs` for desktop/mobile loader presence, spinner
  absence, and template pointerdown feedback. Added node coverage for the shared
  static loader markup and press-state helper.

Verification run in the sandbox:

- `node --test tests/cv6-global-motion.test.mjs` — pass (2/2).
- `npm run test:tenant-context` — pass.
- `npm run build` — pass; existing Rollup large-chunk advisory only.
- `git diff --check` — pass.
- Browsers were not run in this sandbox. External Playwright remains required for
  `tests/cv6-global-motion.spec.mjs` and `tests/cv6-practical-audit.spec.mjs`.

Repository note: the brief required `corner/missions/cv6-polish/RESEARCH.md`, but that
file is absent from this worktree; no replacement research content was fabricated.

**Status:** implemented; browser verification pending external run.

- 2026-07-15 EA external verification + critic pass:
  - EA fixed a CSS cascade defect before verification: the fill rule at (0,2,0) lost to
    the base rule's (0,3,0) variant when the loader root carries [data-cv6kit], painting
    the fill --fg instead of the theme accent. Fill selector list now mirrors the base
    list. Also created the missing `src/data/briefs/` dir (cold vite dep-scan fails
    without it in fresh worktrees).
  - External Playwright: cv6-global-motion 4/4 (incl per-theme accent+mask), practical
    audit 2/2, renderer 5/5, previews 2/2. node 2/2, tenant guard, build all green.
  - Steffen design-gate critic pass: PASS ("a real boot moment, not a dressed-up
    spinner"; judged vs Linear/Stripe/Arc/Figma/Vercel boot moments). Applied his top
    queue item same-round: delayed-state detail line lifted --faint to --muted in both
    sheets. Remaining queue (fold into later rounds): audit non-Home mounts to pass
    `compact`; optional wrap-frame cross-fade; optional icon-only fill restraint
    (Patrik taste call); wordmark period question (Patrik brand call: prior boot
    wordmark carried "Corner." with the period; lockup SVGs render "Corner").

**Status:** shipped after external verification + critic pass; landing to main 2026-07-15.

### R2 - Top bar consistency

One shared top bar contract across Home, Chat, Files, Review, Email, Tracker, Command,
Scribe, Settings, Search: same height, same left/right affordance order (back, title,
search, menu, profile), same accessible labels, desktop and mobile. Kill per-screen
drift in `.topbar`/`.mhdr` usage.

Implementation started 2026-07-15. The active CV6 shell already owns one desktop
`.topbar`; mobile tool headers are template-local `.mhdr` instances plus the React
Chat/Search variants. R2 is centralizing their dimensions, focus/touch contract, and
accessible control names without changing data or truth semantics.

Design gate: font stays the CV6 system (`--font-sans`, with the existing mono token
only where the product already uses it); brand is Corner. This design is unmistakably
Corner because every tool now enters through the same fixed ink-ground rhythm: the
Corner brand and centered tool rail at desktop, and one compact title rail with the
single accent reserved for state/focus at mobile.

Implementation notes (2026-07-15):

- Added one shared bar geometry contract in `cv6.css`: 80px desktop, 60px mobile,
  44px controls, uniform padding/background/divider treatment, normalized icon sizes,
  and one accent `:focus-visible` ring. Existing R1 pointer-held feedback and touch
  minimums remain the interaction source of truth.
- Converted the shell desktop tool/search/profile actions to native buttons while
  preserving the existing brand-left, tool-nav-center, theme/search/avatar-right
  furniture. `templateEngine` now assigns the same Search/Menu/Back/Profile accessible
  names even when a glyph control contains visible initials or other text.
- Converged the active mobile templates and React headers on left Back/Menu, flexible
  title/subtitle, then Search/Menu. Existing Chat/Tracker creation actions moved to a
  stable subordinate row instead of competing for title width; Email's existing
  Inbox/Campaign switch is likewise subordinate to the canonical header.
- Wired the formerly inert per-tool Search actions to the real shared search overlay
  in Files/Review, Email, Tracker, Command, Scribe, and Settings. Search itself now
  uses Back + search field + Menu at phone width.
- Relaxed room, rail, drawer, and header-name flex constraints so labels consume the
  available width before ellipsis; redundant phone-width room-status pills yield to
  the real room name without changing row geometry.
- Added `tests/cv6-topbar.spec.mjs` covering five sibling tools at desktop and four at
  390px mobile: equal bar heights, shared accessible names/order, 44px targets,
  visible keyboard focus, available title width, and R1 held-press state. Added node
  coverage for the action-name and CSS geometry contracts.

Verification run in the sandbox:

- `node --test tests/cv6-topbar.test.mjs tests/cv6-global-motion.test.mjs` — pass
  (4/4).
- `npm run test:tenant-context` — pass.
- `node --check tests/cv6-topbar.spec.mjs` — pass.
- Focused esbuild bundle of `src/dashboard/cv6next/CornerCV6.jsx` — pass (used only as
  a syntax/import fallback after the full build was terminated).
- `git diff --check` — pass.
- `npm run build` — attempted repeatedly; Vite reached `transforming` but the sandbox
  terminated the process without a compiler diagnostic (exit 143 on the captured
  run; a 768MB capped retry exited 1 at the same phase). This is not recorded as a
  pass; the EA must rerun the exact command externally before landing.
- Browsers were not run in this sandbox. External Playwright remains required for
  `tests/cv6-topbar.spec.mjs` and `tests/cv6-practical-audit.spec.mjs`.

Repository note: `corner/missions/cv6-polish/RESEARCH.md`, named in the R2 brief, is
still absent from this worktree. VISION and BUILD were read; no research content was
invented to stand in for the missing file.

**Status:** implemented; browser verification pending external run.

- 2026-07-15 EA external verification + critic pass:
  - EA fixed a real accessibility defect Codex introduced: templateEngine stamped
    aria-label="Close" onto any close/cancel action even when the control carries
    visible text, so a button reading "Cancel" was announced as "Close" and specs
    querying by name broke. Stamped names now apply to icon-only controls.
  - EA spec repairs: practical-audit New-project locator made exact (R2's properly
    named tab collided with the title text match), topbar 44px assert allows
    device-pixel float noise, focus-visible test establishes keyboard modality first.
  - External battery: 14 passed, 1 flake (desktop previews image decode under heavy
    machine load; passed on retry and passed clean 13/13 earlier today). Build passed
    externally after the vite-health janitor root fix (see AOM-EA commit: the 30s
    health tick pkill'd every vite on the machine, killing builds all day).
  - Steffen critic: SEND BACK on exactly one straggler (mobile Files header still
    said "Organize"; renamed to Files, re-shot, contract confirmed), chevron flag
    overruled with verified rationale (Notion/Linear title-switcher pattern, carries
    all shared treatments). Queue: openSwitcher aria-label ("Switch board" action
    naming), optional caret rest-presence. Then clean PASS.

**Status:** shipped after external verification + critic pass; landing to main 2026-07-15.

### R3 - Chat feel (Patrik's number one)

Composer and send feel instant (optimistic echo already exists; make focus, key
handling, and scroll-to-new never stutter), room switching fast, day folds smooth,
chips and attachments comfortably tappable, no dead taps. Desktop and mobile.

Builder note: Codex hit its weekly ChatGPT usage cap launching this round (resets
Jul 21; card on Patrik's deck for the buy-credits call). The EA built R3 directly;
the round protocol (external battery + Steffen gate + live verify) is unchanged.

Implementation (2026-07-15, EA):

- Send feel (all three chat surfaces share Cv6FullComposer): the input clears the
  instant a send fires and the caret stays in the box; text is restored only on an
  explicit send failure so nothing typed is ever lost; an in-flight guard makes a
  fast double Enter a no-op (was: input sat full through the POST round-trip and a
  repeat Enter could post twice). Same contract applied to the fallback mini
  composer. Real local no-Supabase mode stays read-only; explicit ?demo= fixtures
  keep the live composer so the send path is browser-testable.
- Room switching: session render cache in useRoomThread — revisiting a room paints
  its last rendered thread instantly (status settles from cache, no loader flash)
  while the normal fetch still runs and the signature guard reconciles any real
  change on top. Render-only, page-scoped; the server thread stays the record.
  'empty' now counts as a settled state so a known-empty room never re-loads.
- Tap comfort: chips and day-fold headers acknowledge presses with the shared
  press vocabulary; on touch, chips extend their hit area to ~44px via an inset
  pseudo-element without changing the 34px visual; reduced-motion guarded.
- Added tests/cv6-chat-feel.spec.mjs: instant-clear + focus retention + exactly
  one POST on fast double Enter (response held open 600ms to expose a missing
  guard), and pressed-state acknowledgment on day-fold headers.

- 2026-07-15 EA external verification + critic pass:
  - Browser proof: fixture now mounts the real rich composer (fullRoom + awaitable
    interceptable send); spec asserts instant clear, focus retention, and exactly
    one POST on fast double Enter with the response held open 600ms. 9/9 with
    renderer + audit suites; press rules asserted at the stylesheet layer (headless
    :active polling is unreliable), behavior checked live after deploy.
  - Steffen critic: PASS ("dead-center on chat feels clunky"; the useRef guard
    called the correct mechanism vs React state). Applied his three quick fixes
    same-round: failure-restore only into a still-empty box (never clobbers new
    keystrokes), the fallback mini composer got the same in-flight guard, chip
    hit-area inset trimmed to -4px so neighbors never overlap at the gap midline.
  - Steffen queue for the next chat iteration: small send queue for rapid distinct
    messages; LRU cap (~20) on the thread cache; aria-expanded/role parity on the
    mobile fold header; scroll anchoring (pin-to-bottom only when at bottom);
    iPhone keyboard-open composer pinning (visualViewport); day-fold height
    animation with scroll preservation; sending/delivered cue on the optimistic
    echo; send/mic button in-flight cue.

**Status:** shipped after external verification + critic pass; landing to main 2026-07-15.

### R4 - Home + Search polish.

Critic queue (Steffen pass, 2026-07-15, Catch Up modal): give "Go to room" real
button chrome to match its role as the escape hatch; right-size the modal to short
threads or seed trigger context at the top so the empty space carries meaning.

### R5 - Files + Review polish.

Critic queue (Steffen pass, 2026-07-15, preview viewers; item 1 is the "fix before
elite" priority):
1. File-type kicker (Web page / Video / Image) on the dark shell sits at the ~3:1
   `--faint` level; lift to 12px `--muted` (>=4.5:1) or drop it (dark-shell branches
   only; the PDF/docx eyebrow rides the light `.doc` paper and is fine).
2. Saved-HTML reader prints the filename twice (fake URL bar + pane header); kill the
   `.burl` text, keep the traffic-light frame.
3. Review's custom video scrubber has no mute/volume; add a mute toggle.
4. "Pin mode: off" pill floats orphaned over page content; icon + clearer label,
   nudge clear of content.
5. Mobile image preview floats in a black void; vertically center it in the media area.
### R6 - Email + Campaign polish.
### R7 - Tracker + Command polish.
### R8 - Scribe + Settings polish.

Per-screen simplification sweeps: remove clutter and extra clicks, honest states,
consistent language, both widths. One coherent high-impact workflow per round.

**Status:** all queued.

### R9 - Notifications v1

Corner currently has no notification system. Design and ship an in-app notification
center: bell + unread badge in the shared top bar, a panel listing real events only
(agent finished work, needs-you items, review handoffs), mark-as-read that survives
reload, backed by real rows (no fake UI, system-level for every tenant, not special to
Patrik). Push/browser notifications are a later round if Patrik wants them.

**Status:** queued.

### R10 - Home, Chat, Email, and Review control pass

Patrik's 2026-07-21 directive: finish the CV6 Home, Chat, Email, and Review surfaces
as one verified product loop. Scope includes circular global controls and the
three-state theme button; full recent-project ordering and desktop multi-chat
columns; real project/mission rename, reclassification, and move controls; the chat
options menu, floating two-row composer, plan/work mode, honest live agent progress,
and room reset-to-history; desktop Email access plus urgency and editable auto-reply
controls; and an in-context Review handoff that turns checklist/pin comments into an
agent message and returns to Chat. The completion bar remains the mission's live-data
contract at 390x844 and 1440 widths, followed by production deployment and live
verification.

Existing uncommitted CV6 work was present at round start, including room settings,
rename/reclassify plumbing, chat lifecycle work, and focused tests. Preserve and audit
that work before extending it; do not claim it as newly verified until the full round
battery passes.

Implementation and local verification (2026-07-21):

- Home now keeps the logo at the right edge on mobile, removes the redundant desktop
  Rooms control, cycles Light/Dark/Glass through one icon, shows every project in live
  activity order, exposes existing rename/move/reclassification actions from recent
  work, and opens independent chat or Email columns at a useful single-column width.
- Chat has a dedicated options menu (General, Access/Invite, History/Clear, and
  Specialist settings), a floating rounded two-row composer, explicit Plan/Work turn
  metadata enforced by the listener, and live progress copy inside the real activity
  bar. Clear Chat writes an archive boundary plus scoped `clear_context`; it never
  deletes messages, files, or project memory.
- Email is reachable from desktop and can live beside chat. Auto-reply now exposes
  holding-note mode/delay, easy-answer mode, tone, instructions, and sign-off; the
  watcher applies those fields to both holding notes and easy answers. Inbox rows and
  detail carry a deterministic 1-10 urgency score.
- Files/Review restored Approve, Dismiss, Request changes, Assign, and Download;
  removed Type/Location; and turns pins, optional checklist items, and typed notes into
  one direct request-changes task. The checklist is a right-side review panel on
  desktop and the existing bottom sheet on mobile. Successful in-room send-back closes
  the review takeover back to the exact chat; failures leave the panel open.
- Added `api/dashboard/room-reset.js` and `tests/cv6-r10-polish.spec.mjs`; updated
  adjacent regression expectations for the intentional Rooms removal and live-progress
  duplication.

Verification:

- `CV6_AUDIT_BASE=http://127.0.0.1:5173 npx playwright test tests/cv6-*.spec.mjs
  --reporter=line --workers=2` — 31/31 passed.
- `npm run build` — passed in 15.27s. Existing unrelated OutreachTracker duplicate-key
  warnings and the existing large-chunk advisory remain.
- `git diff --check`, API `node --check`, and Python `py_compile` for the listener and
  three support-mail workers — passed.
- Captured and visually inspected desktop Home/Review/Email, 390px Home/Chat/History,
  and the narrow independent chat window. The in-app Browser skill could not attach
  because its Node runtime raised `Cannot redefine property: process` twice; local
  Playwright screenshots were used for visual verification instead.

Deployment (2026-07-21):

- Web commit `18f2baf3` and worker commit `7fc4002e0` pushed to their default
  branches. The listener and support-mail watcher were restarted and confirmed
  running with new PIDs.
- Vercel deployment `dpl_3Y5Y1tKU18Amq9XGxjKRf35RkaGj` completed Ready and was
  aliased to `https://lab.aheadofmarket.com`. The deployed CornerCV6 bundle returned
  200 and contains the R10 `Open Email column`, `Clear the current screen?`, and
  `Send Back To Agent` contracts; `/api/dashboard/room-reset` returned the expected
  405 on GET, proving the function is deployed rather than missing.
- An unauthenticated production browser reached the expected Corner sign-in gate.
  A signed production walkthrough remains unclaimed: the in-app browser holding the
  signed session could not attach because of the recorded Node runtime collision.

**Status:** shipped and artifact-verified; signed-in production walkthrough pending browser-tool recovery.

### R11 - One-page columns and mobile interaction corrections

Started 2026-07-21 from the supplied Corner UI-fixes brief. This round corrects
the R10 interpretation of multi-chat and Email: all in-app destinations remain on
one page and open as side-by-side columns or in-place panels, never browser windows
or full-screen route takeovers. It also covers the iPhone safe-area strip, mobile
long-press selection, immediate recent-room rename refresh, Home branding/context
settings, Chat Files + More headers, mobile Gmail-style threads, richer Email
dispatch destinations, and linked room Files behavior.

Scope guard: work stays entirely inside the `aom-studio` repository on `main`.
Parent `AOM-EA` scripts/data/backend are owned by rex and will not be touched.
Changes will be committed in small scoped groups and pushed promptly after their
focused verification. Final acceptance requires the signed robot Chrome at desktop
and mobile widths plus the local CV6 regression/build battery.

Implementation and local verification (2026-07-21):

- A: removed the duplicate shell bottom safe-area reservation, disabled text
  selection/callout on long-press room rows, and made recent-room rename/move/archive
  mutations refetch and re-shape their real project/mission names immediately.
- B: added Project settings to the room context menu and restored the Corner wordmark
  as the mobile Home identity, with a larger desktop mark.
- C: reduced both chat headers to Files + More, moved Search/Room settings/follow
  controls into More, and removed the mobile chat hamburger.
- D: replaced popup windows and Email takeovers with one horizontally scrollable
  page-owned workspace. Rooms dedupe by identity and retain independent live hook and
  composer state; Email appends and focuses like a chat. Email tabs are centered,
  Auto-reply defaults to `Cheers,`, mobile threads use the shared Gmail chain (latest
  expanded, earlier collapsed), and Email dispatch now selects an agent/project/mission,
  carries free-text instructions plus the machine reference, posts to the correct room
  fields, and opens that destination as a column after a successful send.
- E: the desktop/mobile/Home Files shelves remain the same attachment-derived link
  list. Ordinary rows now locate the file in its chat (opening an older folded day when
  needed) instead of downloading a raw blob or opening a new tab; Review-only rows stay
  explicit. In-app attachments, block files/galleries, and document readers remain in
  Review/readers rather than escaping to browser tabs. Explicit external results,
  OAuth, and live-preview destinations remain the documented exception.

Verification and deployment:

- `npm run build` passed. Only the existing unrelated OutreachTracker duplicate-key
  warnings and the existing large-chunk advisory remain.
- `CV6_AUDIT_BASE=http://127.0.0.1:5173 npx playwright test tests/cv6-*.spec.mjs
  --reporter=line --workers=2` passed 31/31. Focused column/Email/Chat/Review coverage
  also passed 6/6 before the full sweep.
- The rendered multi-column workspace screenshot was visually inspected at 1440px.
- Commits `697a73df`, `f032d9c2`, `c8ddddd8`, `ffeb5daa`, and `84c56262` were pushed
  to `main`; the parent/backend repository was not touched.
- Vercel deployment `EP42M5agZkHEBGZA48Xqn7sENzvX` reached Ready and was aliased to
  `https://lab.aheadofmarket.com`. The deployed `CornerCV6-pU5EDFa3.js` bundle was
  fetched from the alias and contains the new `Find in chat`, `Dispatch email`,
  `Open as column`, `Cheers,`, and workspace-column contracts.

Rex handoff: frontend items A1-A3, B1-B2, C1-C2, D0-D4, and E1 are landed and pushed.
No rex-owned AOM-EA/backend/script/data file was changed. The final signed desktop +
390px production walkthrough is still pending because the requested signed robot-Chrome
capability is not installed in this Codex session; local Playwright and production
artifact proof do not substitute for that authentication-only acceptance pass.

**Status:** shipped and artifact-verified; signed robot-Chrome acceptance pending.

### R12 - Production Home load regression

Started 2026-07-21 after the deployed authenticated Home screen rendered the
`This screen hit a snag` boundary. Direct production browser diagnostics confirmed
authentication and the CV6 APIs load successfully, then captured a render-time
`ReferenceError: Cannot access 'Lt' before initialization` after the missions tree
arrives. This round will correct that source-order defect, add a data-loaded Home
regression, rerun the full CV6/build battery, and redeploy before it is marked shipped.

Resolution and verification (2026-07-21):

- Moved `missionLabelClean` ahead of the live recent-mission projection that calls it.
  The initial empty render was safe; the authenticated missions-tree update was the
  first render that entered the broken temporal-dead-zone branch.
- Added `tests/cv6-home-mission-load.test.mjs`, which locks the initialization order
  required by that asynchronous Home refresh.
- `node --test tests/cv6-home-mission-load.test.mjs` passed 1/1.
- `npm run build` passed. The existing unrelated OutreachTracker duplicate-key
  warnings and large-chunk advisory remain.
- `CV6_AUDIT_BASE=http://127.0.0.1:5173 npx playwright test tests/cv6-*.spec.mjs
  --reporter=line --workers=2` passed 31/31.
- Commit `6b2434e1` was pushed to `main`. Vercel deployment
  `56rpRtCYVzrvnAMKzbc7pUun6JRC` reached production and was aliased to
  `https://lab.aheadofmarket.com`.
- Authenticated production Chrome loaded Home after both live missions-tree requests
  at desktop and 390px widths, rendered all 45 projects plus recent mission activity,
  and emitted no Corner render error. The only remaining console error is the existing
  unrelated Apollo tracking-pixel 400.

**Status:** shipped and authenticated-production verified.

### R13 - Mobile bottom spacing and keyboard composer geometry

Started 2026-07-21 from Patrik's iPhone captures. The first defect is a global
150px `.scrbody` composer clearance leaking onto every CV6 page. The second is an
iOS viewport contract: the shell follows `VisualViewport.height` without its
`offsetTop`, the composer keeps the home-indicator inset while the software keyboard
is open, and the 14px chat input permits Safari focus zoom. This round will scope
chat-only clearance, follow the complete visible viewport while editing, suppress the
stale keyboard-time safe-area gap, use a non-zooming mobile input size, and verify both
resting and focused composer geometry before deployment.

Resolution and verification (2026-07-21):

- Scoped the 150px composer clearance to chat rooms so Home, Email, Files,
  Review, Command, and the other sibling screens no longer inherit a false footer.
- The shell now uses the full dynamic viewport at rest. While a text input is
  focused it follows both `VisualViewport.height` and `VisualViewport.offsetTop`,
  then removes WebKit's stale keyboard-time safe-area gap from the composer.
- Raised the chat input to 16px so iOS does not focus-zoom the page.
- Added source-contract and 390px Playwright coverage for sibling-screen padding,
  resting bottom geometry, input size, and the reduced/panned keyboard viewport.
- `node --test tests/cv6-mobile-viewport.test.mjs` passed 1/1; the focused local
  Playwright test passed 1/1; all `tests/cv6-*.spec.mjs` passed 32/32; and the local
  Vite production build passed. Resting and simulated-keyboard screenshots were
  inspected.
- Commit `5846f3ea` was pushed to `main`. Vercel deployment
  `5NbQRNbmNdfnvFNQvNmV5Zw7QdX9` completed and was aliased to
  `https://lab.aheadofmarket.com`; the live `CornerCV6-DLiUu_wX.js` and
  `CornerCV6-hw3-YxEv.css` assets contain the new viewport and scoped-spacing
  contracts. An anonymous production probe correctly stopped at the sign-in gate,
  so a real signed-in iPhone keyboard check remains the final hardware signoff.

**Status:** shipped and automated/deployment verified; signed-in iPhone signoff pending.

### R15 - Mobile bottom chrome removal and chat header icons

Started 2026-07-21 from Patrik's signed-in iPhone screenshot. The composer is still
lifted far above the home indicator by a page-wide bottom box/inset, even though the
text input itself is correctly floating. This round will identify and remove the final
shell or workspace clearance that affects every mobile screen, keep only the minimum
safe home-indicator breathing room, and convert Chat's Files and More word buttons to
accessible circular icons. Verification will measure the composer-to-viewport gap at
390px and exercise both icon actions before deployment.

Local resolution and verification (2026-07-21): the resting fixed app shell now pins
to both physical viewport edges instead of trusting iOS standalone's sometimes-short
`100dvh`; the explicit VisualViewport height remains limited to the keyboard-open
state. The composer consequently reaches the intended bottom safe area on every CV6
screen. Mobile and desktop Chat Files/More actions are icon-only, circular, and keep
their accessible names; mobile matches the shared 44px touch floor on both axes.
Focused viewport/action checks passed 2/2, the R15 source contract passed 1/1, all CV6
Playwright scenarios passed 35/35, the 390px capture was inspected, and the Vite
production build passed with only the existing OutreachTracker duplicate-key and
large-chunk warnings.

**Status:** implementation and local regression verification complete; production deployment pending.

### R14 - Mobile recent-chat scrolling and singular live progress

Started 2026-07-21 from Patrik's mobile follow-up. The Home "Pick up where we left
off" chat rail cannot be scrolled reliably on touch devices. Chat can also render
multiple live progress treatments and leave one attached to an older message instead
of the active bottom edge. This round will restore deliberate mobile scrolling for the
recent-chat rail, consolidate live work to exactly one progress surface per room, keep
that surface after the newest message at the bottom of the transcript, and add mobile
interaction plus progress lifecycle regressions before deployment.

Resolution and verification (2026-07-21):

- Restored native horizontal touch panning on the mobile recent-chat rail while
  retaining vertical Home scrolling and scroll snapping.
- Persisted message blocks now render as settled history, so an old saved
  `active`/`working` step cannot keep a second animated progress bar alive.
- Marked the one current live-work turn explicitly, kept it after the newest
  message, removed the 78vh pending spacer, and made mobile plus desktop follow
  real step updates to the transcript tail while work is active.
- Added a real CDP touch-swipe regression and a deliberately stale historical
  progress fixture. The focused source test passed 1/1, focused Playwright passed
  2/2, all CV6 Playwright scenarios passed 34/34, the Vite production build passed,
  and the mobile live-tail screenshot was inspected.
- Commit `acdf3020` was pushed to `main`. Vercel deployment
  `CL6nDGTP3EgJ72aArTuvKeaiWGMV` completed and was aliased to
  `https://lab.aheadofmarket.com`; live assets `CornerCV6-DDPBPEP3.js` and
  `CornerCV6-Dzmcpowf.css` contain the singular-live-work and two-axis touch
  contracts. A production UI rerun reached the expected sign-in gate, so the
  shipped artifacts are verified and a signed-in iPhone gesture check remains
  the final hardware signoff.

**Status:** shipped and automated/deployment verified; signed-in iPhone signoff pending.
