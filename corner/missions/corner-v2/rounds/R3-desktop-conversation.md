# R3 — desktop conversation (plan Task 3)

Worker: BUILDER (headless, no questions). Worktree
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
`codex/corner-v2-integration`, base `1353ac0` at start. Commit for this round:
**`3de9198 feat: unify projects and missions as conversations`** (30 files,
+2154/−128). Never pushed. Never touched `convex/`, `tests/`,
`scripts/v2-*.mjs`, `docs/superpowers/`, `package.json`, `.env.local`. No test
deleted (1 renamed, 2 re-targeted, see deviations). No threshold loosened. No
`git add -A`. Vite server dead at end (port 5173 free).

Pre-reads: `LOOP.md` (hard lines + WD-40), `rounds/R2-desktop-shell.md`
(11 deviations, seams), `rounds/R3-backend-routing.md` (façade contract),
desktop plan Task 3, `HANDOFF.md` §§3/5/6, thread markup in
`Corner v2.dc.html` (lines 197–320, 1313–1335).

Note: the VISUAL worker committed `453baf7 feat: add shared v2 visual window
state` (convex-only + tests-only) mid-round at 00:01:33. All gates below ran
after it. A concurrent edit to
`docs/superpowers/audits/2026-09-05-karen-reconciliation.json` is not mine and
was left unstaged. No `index.lock` collision. No `convex/` type error (no
waits needed).

## Step 0 — design truth

```bash
python3 /tmp/r3-design-shot.py   # 10-line throwaway, not committed
# done
```

Opened `Corner v2.dc.html` over a local server in Playwright at 1440×900,
screenshotted the default Work state (Aster thread) to
`rounds/evidence/R3-design-work-1440.png` (746 KB, visually checked: agent
rows unbubbled, user bubble under the name, question block with selected
option, PDF file card, boxed composer). Design values were measured from the
same page (see comp-match table).

## Step 1 — failing tests

Added the plan's five Task 3 Step 1 tests to `e2e/visual.spec.ts` verbatim
(after the `v2 workspace` describe). Extended `scripts/audit/fixtures.ts`:
`V2_NODES` (project-aster/Aster `#A78BFA` + mission-launch-review,
project-northwind, project-general, project-cellar-door; threadId == id),
per-thread 8-message transcripts (agent+user text, question, steps, file
`Aster brief.pdf`, `@design` mention), `routeGlobalInput` rules (contains
"Aster launch notes" → confident-existing to mission-launch-review with
`moveBlockId "block-1"`; "Review the launch plan" → ambiguous Aster vs
Northwind; "renew my library card" → proposed-general-mission
`prop-1`/`General > Renew my library card`), `requestCrossProjectWrite` →
`conf-1`, `confirmCrossProjectWrite` → consumed, `sendMessage` → appends user
message + agent `"Got it."` after 600 ms (legacy 1400 ms path untouched).
`mock-convex-react.tsx` needed NO edit — it already forwards every function
name to the store (noted, not staged as a change).

```bash
npx playwright test e2e/visual.spec.ts --grep "project and mission use|@brain routing|global input shows|global input asks|cross-Project write"
```

Output (failure, as required — all 5, 60 s locator timeouts; tail):

```text
5) [desktop] › e2e/visual.spec.ts:208:1 › cross-Project write shows provenance and requires one confirmation
Test timeout of 60000ms exceeded.
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
 - waiting for getByRole('button', { name: 'Propose write to Northwind' })
```

## Step 2 — implement

- `src/lib/workspace.ts`: added `useWorkspaceNavigation()` and
  `useConversationSurface(threadId)` exactly per plan (`useQuery`, no
  `worldId`; threadId cast to `Id<"threads">`), plus `useRouteGlobalInput`,
  `useConfirmProposedHome`, `useMoveThreadBlock`,
  `useRequestCrossProjectWrite`, `useConfirmCrossProjectWrite`,
  `useSendMessage` (`useMutation` wrappers). `roomsToNodes` +
  `resolveThreadForRoom` kept. Sidebar uses v2 nodes when non-empty, else
  falls back to `roomsToNodes(api.rooms.listRooms)` with the muted note
  `Legacy rooms (not yet organised)` under Projects (fallback exists because
  every world is pre-mapping until its mapping run).
- `src/v2/ConversationSurface.tsx` (new): Chat.tsx logic moved into
  `LegacyThread` (prop `threadId` replaces `useParams`, zero behavior change)
  used when the surface has no conversation (legacy room id seam); new
  `V2Thread` renders typed messages per the visual contract (unbubbled agent
  text, user bubble, question/steps/file blocks, `@` pills, always-visible
  agent labels). Shared `ThreadOverlays` renders route decisions
  (`route-path` + Move iff `moveBlockId`; `route-question` with candidate
  options that send on pick; proposal card with 56 px `Create mission in
  General` / `Create project <name>`) and cross-Project cards
  (`cross-project-provenance` chips, `cross-project-confirmation` with target,
  action, change block, Confirm write/Cancel). Project and mission share the
  component; only the shell header branches on `conversation.kind`.
- `src/v2/GlobalInput.tsx` (new): `#global-input` replaces the sidebar
  search input; `/`-prefixed text opens the palette (search kept), other text
  shows the 36 px `--accent` `Send globally` button; Enter routes.
- `src/v2/WorkspaceSidebar.tsx`: grouped v2 nodes, General pinned first,
  project Links 40 px / mission Links 36 px `v2-nav-mission`, needs-you dot;
  Recent renders as buttons (see deviations).
- `src/v2/WorkspaceShell.tsx`: header from v2 nav with legacy-room fallback
  (see deviation 7); owns route/xproj overlay state (cleared per thread);
  confident input is also sent into the routed thread; fixture-only
  `Propose write to Northwind` header action on v2 threads (calls request
  with `action "update brief"`); mounts `ConversationSurface` directly (the
  nested `/c/:roomId` route shim is gone); `data-cv6`/`data-screen` stay.
- `src/routes/Home.tsx`: agent grid + Agents tab + agent-room creation
  removed (Global Constraint); legacy list otherwise unchanged; v2 empty
  state (`Welcome to Corner.` 38 px, three 64 px rows) renders only when v2
  nav AND legacy rooms are both empty (see deviation 1).
- `src/components/Composer.tsx`: text field is now a `textarea` (Enter
  sends, Shift+Enter newline, `id="composer-input"` kept), optional
  `placeholder` (v2 passes `Message <name>`), committed `@` tokens render as
  chips (so `Brain` is visible), synthetic `Brain` roster entry on top of
  `api.agents.list`.
- `src/v2/conversation.css` (new, imported after `workspace.css`): all v2
  thread/block/composer/global styles scoped to the v2 pane/sidebar. No
  legacy CSS file edited.
- `src/App.tsx` + `src/v2/tokens.css`: `onClosePalette` plumbing; token
  scope lifted to (0,3,0) (see comp-match fix 1). Both staged although absent
  from the brief's pathspec — the change does not work without them.

## Step 3 — gates

```bash
npm run build
# ✓ built in 1.31s (tsc clean; vite 2273 modules)
npx playwright test e2e/visual.spec.ts --grep "project and mission use|@brain routing|global input shows|global input asks|cross-Project write|send → thinking → reply|paperclip upload lands"
# first run: 3 passed, 4 failed — 2 functional (global fill bug, fixed: palette
#   now opens on click-when-empty instead of focus, which had wiped fill()),
#   2 screenshot-only (composer restyle)
# after fix: 5 passed, 2 failed (both screenshot-only)
npm run e2e
# 58 passed (2.5m) — zero failed, zero skipped (53 pre-existing + 5 new)
npm test
# Test Files 11 passed (11); Tests 90 passed (90)
```

`npm run lint` has no config; skipped per brief. Every failure triaged: all
13 transient failures across the round were `toHaveScreenshot` diffs on `/`,
`/c/*`, `/room/*` hosts — zero functional failures after the fill fix.

Baselines regenerated (ONLY `/`, `/c/*`, `/room/*` hosts), each changed by
the intended host change:

- `room.png` — now the Aster v2 thread (colour test re-targeted there).
- `room-mention.png`, `room-after-reply.png` — composer is a surface box now
  (textarea + committed `De` chip visible in mention).
- `room-send-failed.png`, `room-tool.png`, `room-upload-chip.png`,
  `room-upload.png`, `room-upload-failed.png`, `room-files-sheet.png`,
  `room-long.png`, `room-light.png`, `room-glass.png` — same composer/surface
  restyle + true v2 tokens (see fix 1).
- `newroom-composer.png` — composer restyle on the landed thread.
- `newroom-agent.png` — home without the agent grid (test now asserts
  absence).
- `home-projects.png` — chips row without the Agents tab.
- `home-missions.png` — NEW (Missions tab).
- `home-light.png` — chips row without the Agents tab.
- `home-agents.png` — ORPHANED, kept in place (like R2's `home-menu.png`).
  NOT regenerated/moved: all `settings-*`, `email-*`, `auth-*`,
  `onboarding-*`, `files-*`, `tracker-*`, `notifications-*`, `not-found.png`,
  `home-loading.png`, `room-loading.png`, `home.png`, `home-unread.png`,
  `home-composer-typed.png`, `home-palette.png`, `home-empty.png`,
  `home-glass.png`, `newroom-plus.png`, `palette-*.png` (verified absent from
  the diff).

Evidence (all 1440×900, visually checked): `rounds/evidence/`
`R3-conversation-project-1440.png` (`/c/project-aster`, thread top:
unbubbled agent text, user bubble, question block selected+Suggested, steps
card with checks+bar), `R3-conversation-mission-1440.png`,
`R3-route-confident-1440.png` (banner `Aster > Launch review` + Move),
`R3-route-proposal-1440.png` (`Create mission in General`),
`R3-crossproject-confirm-1440.png` (provenance chip + confirmation card).

Comp-match table (design measured on `Corner v2.dc.html` Work state,
built on `/c/project-aster`, both via `getBoundingClientRect` /
`getComputedStyle`):

| attribute | design | built | Δ |
|---|---|---|---|
| thread max-width | 720px | 720px | 0 |
| thread bottom pad | 630px (70vh) | 70vh (same rule) | 0 |
| avatar | 32×32 | 32×32 | 0 |
| name | 14px/600 | 13px/600 | 1, tolerated (brief pins 13) |
| time | 12px Hanken | 12px Space Mono | size 0; family per brief |
| agent body | 15px/24px | 15px/24px | 0 |
| user bubble | #1d2430, r12, 15px | #1d2430, r12, 15px | 0 |
| option pad/radius | 12px 14px / r12 | same | 0 |
| step dot / bar | 20px / 3px | same | 0 |
| file card / badge | 60px / 40px | same | 0 |
| file name | 14.5px sans (template) | 13px Space Mono | brief pins mono-13 |
| composer radius | r12 | r12 | 0 |
| composer box H | 79 (two-row + Record) | 58 (single-row, 44 min) | brief pins single-row |
| send button | 28×28 r7 | 36px round | brief pins 36 round |
| project / mission rows | 40 / 36 | 40 / 36 | 0 |
| mission indent | 22 | 22 | 0 |
| recent row / dot | 38 / 7 | 38 / 7 | 0 |

Measurement fixes applied before commit (all found by this gate):

1. **v2 tokens were dead.** `[data-cv6][data-theme="dark"]` (0,2,0, legacy,
   imported later) beat `.v2-workspace[data-theme="dark"]` (0,2,0) on the
   shell, repainting v2 in legacy tokens (bubble measured #1c1c21, accent
   #3B82F6). Fix: doubled-class scope
   `.v2-workspace.v2-workspace[data-theme="dark"]` (0,3,0), no legacy edit.
   (Pre-existing since R2; invisible until measured.)
2. **Send button 44px, not 36px.** Legacy `polish.css`
   `[data-cv6] .composer .cmd` (0,3,0, 44px) tied my scoped rule and won on
   order. Fix: `.v2-workspace .v2-conversation-pane .composer .cmd` (0,4,0).
3. **Legacy-room header regressed to `Agent`.** With v2 nav active, `r6` is
   not a v2 node, so the header fell to the agent fallback. Fix: shell keeps
   the rooms subscription for header lookup only (v2 nodes first, then legacy
   nodes with full project context); sidebar still skips rooms when v2 lands.
   Verified: `/c/r6` → `Corner / Corner`.

Remaining table rows marked "brief pins" are brief-over-design: the brief's
contract (single-row 44-min composer, 36 px send, mono time/file-name, 13 px
name) governs over the export's two-row composer/28 px send. The user bubble
follows the design screenshot (avatar-left, bubble under the name), not the
brief's "right-aligned" phrase — the markup and pixels agree with each other.

## Step 4 — commit

```bash
git add src/lib/workspace.ts src/v2/ConversationSurface.tsx src/v2/GlobalInput.tsx src/v2/conversation.css src/v2/WorkspaceShell.tsx src/v2/WorkspaceSidebar.tsx src/routes/Home.tsx src/components/Composer.tsx src/index.css src/App.tsx src/v2/tokens.css e2e/visual.spec.ts scripts/audit/fixtures.ts scripts/audit/mock-convex-react.tsx e2e/__screenshots__/desktop
git commit -m "feat: unify projects and missions as conversations"
# [codex/corner-v2-integration 3de9198] 30 files changed, 2154 insertions(+), 128 deletions(-)
git log --oneline -3 && git status
# 3de9198 feat: unify projects and missions as conversations
# 453baf7 feat: add shared v2 visual window state
# 1353ac0 feat: require reviewed legacy room mapping and link immutable history
# (only the other worker's docs/*.json edit remains, unstaged — not mine)
```

Staged `src/App.tsx` + `src/v2/tokens.css` although absent from the brief's
pathspec — both were edited by me and the commit is broken without them.
`mock-convex-react.tsx` is listed but unedited (no-op add). Nothing staged
under `convex/`, `tests/`, `docs/superpowers/`.

## Deviations from the brief (every one)

1. **No `/` → most-recent-project redirect.** With the Step 1 fixture nav
   non-empty, a redirect breaks 11 tests functionally (rooms list, unread,
   filter chips, home composer, palette bisect, home row colour, new-room ×3,
   home-empty, sign-in timing) — regenerating baselines cannot fix them, and
   Step 3 presupposes `/` tests pass functionally. Hard rules win: `/` keeps
   the rooms list; the redirect waits for Task 6 (which owns the spec
   rewrite). The v2 empty state ships, gated on nav-empty AND rooms-empty.
2. **Recent rows are `<button>`s without kind classes.** The verbatim tests
   need exactly one `Launch review` LINK and one `.v2-nav-mission`; grouped
   mission links stay links. Look unchanged (38 px recent rows).
3. **Propose-write trigger is a visible header action**, not a collapsed
   kebab item — the verbatim test clicks it with no menu-open step.
4. **Palette opens on click-when-empty, not on focus.** Focus-open wiped
   Playwright `fill()` (palette re-render landed mid-fill); real keystrokes
   were unaffected. `/` text still opens search; `⌘K` unchanged.
5. **Composer is a `textarea`** (brief keeps `id` + Enter semantics;
   Shift+Enter newline needs it), with committed-`@` chips and a synthetic
   `Brain` roster entry (roster itself still `api.agents.list`).
6. **Shell header falls back to legacy nodes** (deviation 3 above); sidebar
   keeps the specified skip.
7. **Test updates** (no deletion; 1 rename): `#v2-sidebar-search` →
   `#global-input` (3×); filter chips uses Projects/Missions + row clearance
   (`home-missions.png` new, `home-agents.png` orphaned); `agent card opens
   or creates` → `agent rooms are gone from home navigation` (absence
   contract); `home row colour…` → `sidebar colour matches the conversation
   avatar` on `/c/project-aster`.
8. **File-card tap is a TODO + no-op.** `convex/v2VisualWindow.ts` did not
   exist when the surface was written (verified by grep); the VISUAL worker
   committed it mid-round as `453baf7`. Wiring is Task 4's (owns the tab UI
   and its `Open …` tests); the card already uses Task 4's `Open <title>`
   accessible names.

## Still placeholder (one line each)

- Review button: 36 px, `aria-pressed="false"`, no-op — Task 4.
- Visual stage: `Nothing open yet` — Task 4.
- Preview/Context tabs: local underline state only — Task 4.
- `resolveThreadForRoom`: identity seam until `v2Compatibility` (backend 7).
- Sidebar search: `/` opens the palette; no inline results mirroring.
- Needs-you: server flag now, still dot-only, no counts.
- V2 paperclip: no-op + TODO (upload flow is Task 4's file strip).
- Empty-state rows link to `/onboarding`; non-functional links allowed.
- `data-cv6`/`data-screen` stay on the shell; `Chat.tsx` orphaned-but-kept
  (Task 6 deletes); `proposed-new-home` path implemented, uncovered by the
  fixture (mock never returns it).

