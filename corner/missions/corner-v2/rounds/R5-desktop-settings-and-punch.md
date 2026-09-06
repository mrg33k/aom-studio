# R5 — desktop settings and punch (plan Task 5 + P001–P011)

Worker: BUILDER (headless, no questions). Worktree
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
`codex/corner-v2-integration`, base `64ddc48` at start. Commit for this round:
**`4129ce5 feat: move workspace settings and notifications into sidebar`**
(56 files, +2842/−1042). Never pushed. Never touched `convex/`, `tests/`,
`scripts/v2-*.mjs`, `docs/superpowers/`, `package.json`, `.env.local`. No test
deleted (several re-targeted, see deviations). No threshold loosened. No
`git add -A`. Vite server dead at end (port 5173 refused). No `convex/` type
error and no `index.lock` collision, so no wait/retry was needed. No BACKEND
collision observed.

Pre-reads: `LOOP.md` (hard lines + WD-40), `punch-list.md` (P001–P012),
`rounds/R3-desktop-conversation.md`, `rounds/R4-desktop-visual-window.md`,
desktop plan Task 5, `HANDOFF.md` §§3/5/6, thread/markup in
`Corner v2.dc.html` (sidebar lines 60–140, composer 330–400, settings 604–700,
popover 1060–1080, login 1113–1145, onboarding 1145–1277, empty home 200–240,
computed values 1636–1937).

## Step 0 — design truth

```bash
python3 /tmp/r5-design-shots.py   # throwaway, not committed
# SHOT R5-design-work
# MEASURE work: {'rowCount': 16, 'recentH': 38, 'buttons': [{'t': 'New', 'h': 40, 'w': 121}, {'t': 'Project', 'h': 40, 'w': 123}], 'dotCount': 7, 'dotBg': 'rgb(251, 191, 36)'}
# SHOT R5-design-notifs
# MEASURE popover: {'found': True, 'w': 320, 'h': 291, 'x': 14, 'y': 557}
# SHOT R5-design-new
# SHOT R5-design-setup-0 .. setup-5
# MEASURE onboarding: {'headline': 36, 'segH': 4, 'segCount': 6, 'continueH': 56}
# SHOT R5-design-login
# MEASURE login: {'ssoH': [72, 72, 72], 'emailH': 56}
# done
```

One hiccup: the Setup overlay covers the sidebar State tabs, so the script
clicks "Skip for now" (force) before switching to Login. All 11 PNGs visually
checked and kept as `rounds/evidence/R5-design-*.png`. Design values mined
from the same file: mission dot `DOT = {live: success, blocked: warn,
done/ready: faint}` with 7px dots; project mark 24px rounded-6 one letter;
header mark 24px + crumb 14.5px + status 13.5px/8px dot; composer input 14.5px
`Tell <project> what to make next`, Record chip 28px, project label 11px;
popover fixed 320px at left:14 bottom:52; settings rail 200px + content;
onboarding OB order Connect→Import→Invite→Permissions→Look→First project
with the exact headlines/bodies/footnotes used verbatim; login SSO 72px +
email/continue 56px; empty-home rows to obSteps 1/0/5.

## Part B Step 1 — failing test (verbatim from plan Task 5 Step 1)

Added after the `v2 workspace` describe in `e2e/visual.spec.ts`:

```bash
npx playwright test e2e/visual.spec.ts --grep "desktop footer owns notifications"
```

Output (failure, as required):

```text
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
 - waiting for getByRole('button', { name: 'Notifications' })
...
1 failed
  [desktop] › e2e/visual.spec.ts:157:1 › desktop footer owns notifications and hides old service screens
```

The two link assertions already held (no Email/Tracker links on `/c/*`);
the click timed out because the footer bell did not exist.

## Part A — punch items (design / before / after / evidence)

Measured built values via Playwright on `/c/project-aster` at 1440×900
(`/tmp/r5-built-evidence.py`, not committed):

```text
MEASURE sidebar/header/composer: {'recentH': 38, 'projH': 40, 'missH': 36,
'btnNewH': 40, 'btnProjH': 40, 'dotH': 7, 'dotBg': 'rgb(251, 191, 36)',
'markW': 24, 'markH': 24, 'markRadius': '6px', 'chevW': 16, 'headH': 56,
'hmarkH': 24, 'crumbSize': '15px', 'statusSize': '12px', 'statusText': 'Working',
'recH': 32, 'agentSize': '12px', 'agentColor': 'rgb(98, 98, 107)',
'placeholder': 'Tell Aster what to make next', 'filesH': 36,
'filesLabel': 'Files, 8 items', 'newMH': 36}
MEASURE popover: {'found': True, 'w': 320, 'h': 159, 'left': '14px', 'bottom': '52px', 'x': 14}
MEASURE settings col: 620
MEASURE onboarding: {'headline': '36px', 'segH': 4, 'segCount': 6, 'contH': 56, 'colW': 620}
```

| id | design | built before | built after | evidence |
|---|---|---|---|---|
| P001 | two 40px buttons in a row under search (New = accent fill) | nothing between search and RECENT | `.v2-btn-new` accent 40px + `.v2-btn-project` 40px, flex row, gap 8; New focuses `#composer-input` (falls back to most-recent thread), Project + reuses the sidebar `+` handler | `rounds/evidence/R5-sidebar-1440.png` |
| P002 | status dot before mission title (design markup 7px; punch column says 6px) | 22px two-letter monogram circle | 7px dot (`missionStatus()`: needsYou→`--warn`, active <24h→`--success`, else `--faint`); monogram gone. Punch says 6px, design measures 7px — built 7px (Δ0 to design, within 1px of punch) | `rounds/evidence/R5-sidebar-1440.png` |
| P003 | `Files · N` folder row 36px + muted `+ New mission` row under missions | absent | `Files, 8 items` row 36px (count from `v2Visual.artifactsForThread` of the project thread; Aster = 6 artifacts + 2 tools) opening the Visual Window Context view; `New mission` row with inline input (Enter→`v2Projects.createMission`→navigate, Escape→cancel) | `rounds/evidence/R5-sidebar-1440.png` |
| P004 | chevron right 16px `--faint`, amber dot left of chevron | no chevron, always expanded | 16px chevron (rotates 90° when open), needs dot before it; collapse persisted per project in `localStorage v2-sidebar-collapsed` | `rounds/evidence/R5-sidebar-1440.png` |
| P005 | recent = 16px doc icon `--muted`, 38px rows | 22px monogram circle | 16px doc SVG, 38px, still `<button>`s (R3 single-link contract kept) | `rounds/evidence/R5-sidebar-1440.png` |
| P006 | project = 24px rounded-square tint mark, one letter | 22px circle, two letters | 24×24 radius 6px, first letter 11px/700 (measured `markRadius: 6px`) | `rounds/evidence/R5-sidebar-1440.png` |
| P007 | avatar 24px + `Project / Mission` one line (15px, muted/fg) + Working/Ready/Needs-you 12px right; no arrow button | stacked path-over-title, no avatar, arrow icon button | 24px mark + one-line crumb (15px) + status 12px (`headerStatus()`: needsYou→Needs you/`--warn`, active <2min→Working/`--success`, else Ready/`--faint`); arrow removed — the fixture-only propose-write trigger now renders only with `audit_propose_write=1` (see deviations) | `rounds/evidence/R5-header-composer-1440.png` |
| P008 | Record chip 32px left of send, agent label `--faint` 12px, placeholder `Tell <name> what to make next` | no Record, no label, `Message <title>` | Record chip 32px (click → 2s toast "Live Scribe is coming"), label 12px `#62626b`, placeholder `Tell Aster what to make next` (project name; parent project for missions) | `rounds/evidence/R5-header-composer-1440.png` |
| P009 | two 36px icon buttons beside Review | already shipped by R4 — verified: Expand ⤢ + kebab (Open in Context menu), `.v2-visual-icon-btn` 36×36, visible in evidence top-right | no change needed | `rounds/evidence/R5-sidebar-1440.png` |
| P010 | bell + gear beside identity | identity only | 30×30 footer buttons (16px icons); bell `aria-label="Notifications"` with 7px `--warn` dot when unread>0 (fixture: 2 unread); gear links `/settings`; popover measured 320px at left:14 bottom:52 | `rounds/evidence/R5-notifications-1440.png` |
| P011 | recent = last-active conversations, not the project list | recent = all nodes incl. General twice | `recentConversations()` in `src/lib/workspace.ts`: top 5 by `lastActivityAt`, missions+projects mixed, pinned General excluded (fixture recent: Aster, Launch review, Northwind, Cellar Door) | `rounds/evidence/R5-sidebar-1440.png` |

Two fixes found by evidence review before commit: mission rows showed
both the status dot and a needs-you dot (design has only the status dot —
needs dot removed); the "Legacy rooms" note rendered in the doubly-empty
state (now gated on rooms existing).

## Part B Steps 2–7 — commands + output

Step 2 (failure) is above. Steps 3–5 are the implementation:

- `src/v2/NotificationsPopover.tsx` (new): fixed `left:14px; bottom:52px;
  width:320px`, lists `notifications:getNotifications`, per-row "mark read"
  clears the dot, "Mark all read" header action, Escape/veil close.
- `src/v2/WorkspaceSettings.tsx` (new): `/settings` inside the shell —
  `App.tsx` routes `/settings*` to `WorkspaceShell panel="settings"`
  (sidebar stays, settings fills conversation+visual as one 620px column;
  measured `settings col: 620`). Sections Profile (name+Save, avatar, team =
  session owner + `invites:list` rows + invite via `invites:create`,
  First-run buttons, Sign out), Environment (Gmail/Drive/Figma/Slack/GitHub
  Connected/Connect from `arcade:listIntegrations`; projects in scope from
  v2 nav; email+tracker state + muted "Opens in the Visual Window once its
  renderer ships."; secrets placeholder), Permissions (Draft/Send/Publish/
  File toggles → `users:setPrefs` merge + localStorage mirror),
  Notifications (4 toggles, same store), Appearance (Dark/Light/Glass cards
  with lowercase accessible names, sets theme + stored preference; copy says
  only Dark is tuned). Gear in the footer links `/settings`.
- `src/main.tsx`: `/email`, `/tracker`, `/notifications` routes + imports
  removed. `Email.tsx`, `Tracker.tsx`, `Notifications.tsx`, `convex/email.ts`,
  `convex/tracker.ts` untouched and still compiled.
- `src/App.tsx`: topbar Email link, `NotificationsBell`, drawer Tracker/
  Email/Notifications cards removed; legacy `.main` 560px cap lifted for
  `/onboarding` + `/auth` (their 620px columns); shell `data-theme` now
  follows `useAppTheme` (was hardcoded dark).
- `src/routes/Settings.tsx`: thin wrapper selecting initial section
  (`/settings/integrations` → environment); controls moved to
  `WorkspaceSettings`. `src/routes/Onboarding.tsx`: six design steps verbatim
  (Connect/Import/Invite/Permissions/Look/First project), 620px column,
  eyebrow, 36px headline, step label, six 4px segments, 56px Back/Continue
  (`Take me to Corner` last), per-step lock note, later-in-Settings note;
  Import heuristic counts lines starting with `#`/`-`; Invite copy-link uses
  `invites:create` URL; step 6 calls `v2Projects.createProject` then
  `createMission` (goal as mission name) then navigates `/c/<threadId>`;
  `?step=N` deep-link for the empty home; rooms-exist skip restored (see
  deviations). `src/routes/Auth.tsx`: same working email/Google flow,
  restyled to the 620px column with 72px Google/Apple/SSO rows (Apple/SSO
  disabled, tooltip "Not connected yet") + 56px email/Continue; sent card,
  `#email`, `.auth-wrap`, `auth-mark` testid kept. `src/routes/Home.tsx`:
  empty home is the design's three 64px rows (Import step→`?step=1`, Connect
  →`?step=0`, First project→`?step=5`) + disabled "Explore a sample
  workspace" with tooltip.
- Fixtures (`scripts/audit/fixtures.ts`, mock needed no edit): Aster
  `lastActivityAt` = 60s ago (header reads Working); `v2Projects:
  createProject/createMission` (append V2_NODES, return threadIds);
  `invites:create/list`; `users:setPrefs` (merge store);
  `audit_empty_v2` evidence-only flag for the v2 empty home (no test sets
  it; P012 untouched).

```bash
npm run build
# ✓ built in 1.3x s (tsc clean every run; no convex/ errors, no index.lock)

npx playwright test e2e/visual.spec.ts --grep "desktop footer owns notifications|profile, theme picker, integrations|sign-in form"
# first: 1 passed, 2 failed — both screenshot-only except a settings
#   strict-mode violation (email text matched 3 nodes: sidebar identity +
#   profile + team row; test now scopes `.v2-set-email`)
# after: 3 passed
```

Full gate:

```bash
npm run e2e
# 58 passed (2.5m) — zero failed, zero skipped
npm test
# Test Files 11 passed (11); Tests 90 passed (90)
```

`npm run lint` has no config; skipped per brief. `npm run build` output:

```text
> tsc && vite build
✓ 2274 modules transformed.
dist/index.html                    1.01 kB
dist/assets/index-1oIaheZE.css   259.53 kB
dist/assets/index-DlxbH_3H.js    519.92 kB
✓ built in 1.34s
```

## Baselines regenerated (intentional, each changed by this round)

`/`, `/c/*`, `/settings*`, `/auth`, onboarding — 38 files under
`e2e/__screenshots__/desktop/`: `room.png room-mention.png
room-after-reply.png room-send-failed.png room-tool.png room-upload*.png
room-files-sheet.png room-long.png room-light.png room-glass.png
room-empty-welcome.png home.png home-projects.png home-missions.png
home-composer-typed.png home-palette.png home-unread.png home-loading.png
home-light.png home-glass.png home-empty.png newroom-*.png palette-*.png
settings-dark/light/glass/signout.png onboarding-dark/light/glass.png
auth-empty/invalid/light/glass.png`. Orphaned (kept in place, R3 precedent):
`email-*.png tracker-*.png notifications-*.png home-agents.png`.
NOT regenerated/verified absent from the diff: `room-loading.png`,
`not-found.png`, `files-*.png`, `auth-sent.png`.

Evidence (`rounds/evidence/`, all 1440×900, visually checked): sidebar,
header-composer, notifications, settings ×5, onboarding ×6, login,
empty-home, plus `R5-design-*` (work, new, setup-0–5, login, notifs).

Comp-match table (design measured in `Corner v2.dc.html`, built measured on
the app, both 1440×900):

| attribute | design | built | Δ |
|---|---|---|---|
| recent row H | 38px | 38px | 0 |
| project row H | 40px | 40px | 0 |
| mission row H | 36px | 36px | 0 |
| New / Project + H | 40 / 40px | 40 / 40px | 0 |
| mission dot | 7px `--warn` (live case) | 7px `rgb(251,191,36)` | 0 |
| project mark | 24px r6 | 24px r6 | 0 |
| chevron | 12px design / 16px punch | 16px | punch value |
| header H / mark | 56 / 24px | 56 / 24px | 0 |
| crumb / status | 14.5 / 13.5px | 15 / 12px | brief pins 15/12 |
| Record chip / agent label | 28px / 11px | 32px / 12px | brief pins 32/12 |
| composer placeholder | Tell Aster… | Tell Aster what to make next | 0 |
| popover box | 320px, x14, bottom 52 | 320px, left 14px, bottom 52px | 0 |
| settings col | 620 max (brief) | 620px | 0 |
| onboarding headline / seg / Continue | 36px / 4px×6 / 56px | 36px / 4px×6 / 56px | 0 |
| login SSO / email+continue | 72 / 56px | 72 / 56px | 0 |

Crumb/status/Record/label rows are brief-over-design (the punch list's own
numbers govern). Every other mismatch over 1px was fixed before commit
(mission double-dot, legacy note, onboarding/auth 560 cap, columns).

## Step 7 — commit

```bash
git add src/v2/NotificationsPopover.tsx src/v2/WorkspaceSettings.tsx src/v2/WorkspaceSidebar.tsx src/v2/ConversationSurface.tsx src/v2/VisualWindow.tsx src/v2/workspace.css src/v2/conversation.css src/v2/visual-window.css src/lib/workspace.ts src/main.tsx src/App.tsx src/routes/Settings.tsx src/routes/Onboarding.tsx src/routes/Auth.tsx src/routes/Home.tsx e2e/visual.spec.ts scripts/audit/fixtures.ts scripts/audit/mock-convex-react.tsx e2e/__screenshots__/desktop src/components/Composer.tsx src/v2/WorkspaceShell.tsx
git commit -m "feat: move workspace settings and notifications into sidebar"
# [codex/corner-v2-integration 4129ce5] 56 files changed, 2842 insertions(+), 1042 deletions(-)
git log --oneline -3 && git status
# 4129ce5 feat: move workspace settings and notifications into sidebar
# 64ddc48 feat: add durable corner visual window
# 3de9198 feat: unify projects and missions as conversations
# (clean)
```

`src/components/Composer.tsx` + `src/v2/WorkspaceShell.tsx` staged although
absent from the brief's pathspec — the punch fixes do not work without them
(same precedent as R3/R4). `VisualWindow.tsx`, `visual-window.css`,
`mock-convex-react.tsx` listed but unedited (no-op adds). `punch-list.md`
edited only (orchestrator commits that repo).

## Deviations from the brief (every one)

1. **Propose-write trigger flag-gated.** P007 removes the header arrow, but
   the R3 test clicks `Propose write to Northwind` with no menu step. The
   trigger stays in the header but renders only with
   `localStorage audit_propose_write=1`; that test boots with the flag.
   Shipped pixels match design; the suite stays green.
2. **P002 dot is 7px, not 6px.** Punch column says 6px; the design measures
   7px (and P004's dots are 7px). Built 7px: Δ0 to design, within 1px of
   the punch value.
3. **P001 buttons are a flex row, not full-width stacked.** Punch design
   column says "two 40px buttons in a row"; the Part A sentence calls New
   "full width". Built the row (flex:1 each), matching design + punch
   column; New focuses the current composer per the brief.
4. **Header status is recency-derived.** No facade run-status field exists
   (`getConversationSurface` returns no runs; turns are room-based).
   needsYou→Needs you, active <2min→Working (home-list rule), else Ready.
   Fixture Aster activity set to 60s so Work state reads Working.
5. **Mission status derived, no type change.** The facade returns no
   `status`; `missionStatus()` derives live<24h (needsYou→blocked) exactly
   per the brief's fallback — no `WorkspaceNode.status` field was added.
6. **Test re-targets (none deleted):** cross-Project boot flag; settings
   `.shell`→`.v2-workspace` + section navigation + scoped email selector;
   email describe→hidden-service contract (routes 404, services in
   settings); tracker/notifications/email themed loops removed (baselines
   orphaned); onboarding/auth copy → new design headlines; avatar-colour
   test → `.v2-project-mark`; auth-mark testid moved to the wordmark.
7. **Onboarding rooms-skip restored.** First rewrite dropped the
   rooms-exist→`/` redirect and the sent-card test caught it (landed on
   `/onboarding` instead of home). Restored verbatim.
8. **Auth keeps magic-link as the real path.** Brief says "the email +
   password form stays the real path" but no password field ever existed;
   the working email-link + Google-email flows are unchanged. No fake
   password added.
9. **Onboarding/settings Look uses Dark/Light/Glass** (the app's theme
   keys), not the design's Ink/Graphite/Plum palette names.

## Still placeholder (one line each)

- Record → "Live Scribe is coming" toast; no audio capture.
- Secrets rows are labels ("Managed outside Corner"); Rotate ships later.
- Sample workspace button disabled with tooltip.
- Apple/SSO rows disabled with "Not connected yet".
- Import creates no projects (heuristic count only); R6+ work.
- Sidebar `+`/Project `+` still create legacy rooms until backend Task 7.
- P012 (`/` auto-select) untouched for Task 6; `audit_empty_v2` is
  evidence-only, no test sets it.
- Light/Glass render with legacy tokens (only Dark tuned); stated in UI.
- Popover rows navigate to legacy `/room/:id` (compat redirect resolves).

