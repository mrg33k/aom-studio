# Brief R5-desktop-settings-and-punch — sidebar/header comp-match fixes (P001-P011), notifications popover, WorkspaceSettings, six-step onboarding, hidden service routes (desktop plan Task 5 + punch list)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40), `punch-list.md` (P001-P012, yours are P001-P011; P012 waits
for Task 6), `rounds/R3-desktop-conversation.md` and `rounds/R4-desktop-visual-window.md` (what the
surface and Visual Window are now). Write your report to `rounds/R5-desktop-settings-and-punch.md`:
every command with its output.

You are a headless worker, the BUILDER for desktop plan Task 5 plus the punch list. Nobody will
answer questions.

Plan: Task 5 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-desktop-web.md`.
Visual truth: `docs/design-reference/corner-v2/HANDOFF.md` sections 3 (sidebar), 5 (states,
onboarding steps, login, empty home, settings sections, notifications popover geometry) and the
design HTML. Screenshot the design in the Work, New, Setup (each of the 6 steps), and Login states
at 1440x900 first; keep them as `rounds/evidence/R5-design-*.png`.

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`. HEAD includes the R4 desktop commit ("feat: add durable corner
  visual window"). `npm run e2e` desktop-only, offline stand-in. `npm run lint` has no config; skip.
- A BACKEND worker may be editing `convex/` at the same time. You never touch `convex/`, `tests/`,
  `scripts/v2-*.mjs`, `docs/superpowers/`, `package.json`, `.env.local`. If `npm run build` fails on
  a type error inside `convex/`, wait 60 s and retry up to 8 times. On `index.lock` wait 10 s, retry
  up to 5 times. Never `git add` a path you did not create or edit.
- Existing screens you move, not rewrite: `src/routes/Settings.tsx` (profile, theme, integrations),
  `src/routes/Notifications.tsx`, `src/routes/Onboarding.tsx` (role/goal steps today),
  `src/routes/Email.tsx`, `src/routes/Tracker.tsx` (stay compiled, become unlinked).

## Part A — punch list P001-P011 (measure design, match within 1px, evidence per item)

Fix each item in `punch-list.md` P001-P011 exactly as the "design" column says, in
`src/v2/WorkspaceSidebar.tsx`, `src/v2/ConversationSurface.tsx` (header + composer only),
`src/v2/VisualWindow.tsx` (P009 if the R4 worker did not already add full-screen + kebab; check
first), `src/lib/workspace.ts` (P011: `recent` = the 5 most recently active conversations by
`lastActivityAt`, missions and projects mixed, never a duplicate of a pinned project), and the
v2 CSS files. Row heights: recent 38px, project 40px, mission 36px, indent 22px; "+ New" is
`--accent` fill 40px full width and opens the composer of the current conversation focused
(design: "New mission" flow; this round it focuses the composer and pre-fills nothing);
"Project +" opens the same create-project path the sidebar `+` uses. Mission status dot from
`WorkspaceNode.status` (`live` → `--success`, `blocked` → `--warn`, else `--faint`); the façade
already returns it, if not, derive `live` when `lastActivityAt` is within 24h. The `Files · N` row
counts the project's artifacts (from `v2Visual.artifactsForThread` of the project thread) and
opens the Visual Window Context view. `+ New mission` row calls `v2Projects.createMission` after
an inline name input (Enter to create, Escape to cancel). Chevrons collapse/expand a project;
persist per project in `localStorage`. Conversation header: 24px avatar (agent mark or project
mark), breadcrumb `Project / Mission` on one line (15px, project `--muted`, mission `--fg`), the
`Working` / `Ready` / `Needs you` status at the right (12px, dot in `--success` / `--faint` /
`--warn`) from the newest run status or needs-you flag; remove the arrow icon button. Composer:
placeholder `Tell <name> what to make next`, a `Record` chip (mic icon, 32px; click shows a
2-second toast "Live Scribe is coming"), the agent label `--faint` 12px left of the send button.
After each item, update its row in `punch-list.md` to `fixed (R5)` with the evidence PNG path.

## Part B — Task 5 (plan steps verbatim)

1. Failing test from the plan's Task 5 Step 1 (`desktop footer owns notifications and hides old
   service screens`). Paste the failure.
2. `src/v2/NotificationsPopover.tsx`: anchored to the sidebar footer bell, `left:14px;
   bottom:52px; width:320px`, list from the existing notifications query, "mark read" clears the
   dot; bell shows a 7px `--warn` dot when unread > 0. `src/v2/WorkspaceSettings.tsx` at
   `/settings` inside the shell (sidebar stays; the settings page fills the conversation + visual
   area as one column, 620px max): sections Profile (name, avatar, team list + invite, "First
   run" buttons), Environment (connections with Connected/Connect rows for Gmail, Drive, Figma,
   Slack, GitHub using the existing integrations query for real state; projects in scope; secrets
   placeholder), Permissions (Draft, Send, Publish, File toggles stored in `preferences`),
   Notifications (toggles stored in `preferences`), Appearance (Dark / Light / Glass picker that
   sets the stored preference; only Dark is tuned, say so in the UI copy). Gear in the footer opens
   `/settings`.
3. Remove `/email`, `/tracker`, `/notifications` routes and their links from `main.tsx` and
   `App.tsx`; keep the components and Convex modules compiled and unlinked. Settings → Environment
   shows email and tracker connection state with a muted line "Opens in the Visual Window once
   its renderer ships".
4. `src/routes/Onboarding.tsx` → the six steps from HANDOFF section 5, 620px centred column,
   eyebrow, 36px headline, step label, 4px progress segments (six), 56px Back / Continue, lock note,
   "You can change these later in Settings". Connect (rows with Connected/Connect, real state from
   integrations), Import (copy prompt to clipboard, paste box, "found N projects" heuristic = count
   lines starting with `#` or `-`), Invite (emails list, copy link = the existing invites mutation),
   Permissions (the four toggles), Look (Dark / Light / Glass), First project (name + first goal →
   `v2Projects.createProject` then `createMission` with the goal as the mission name, then
   navigate to the mission's `/c/<threadId>`). Login screen (`/auth`): keep the working form, restyle
   to the design's 620px column with the Google / Apple / SSO rows (non-functional rows are
   disabled with a tooltip "Not connected yet"; the email + password form stays the real path).
   Empty home (`/` when the workspace has no projects): the design's "Welcome to Corner." with the
   three 64px-icon rows linking to setup step 2, step 1, step 6, and "Explore a sample workspace"
   (disabled, tooltip).

## Gates

```bash
npm run build
npx playwright test e2e/visual.spec.ts --grep "desktop footer owns notifications|profile, theme picker, integrations|sign-in form"
npm run e2e
```

Full suite green, zero skips. Baselines: `/`, `/c/*`, `/settings*`, `/auth`, onboarding change by
design; list each. Evidence to `rounds/evidence/`: `R5-sidebar-1440.png`, `R5-header-composer-1440.png`,
`R5-notifications-1440.png`, `R5-settings-<section>-1440.png` ×5, `R5-onboarding-<step>-1440.png` ×6,
`R5-login-1440.png`, `R5-empty-home-1440.png`. Comp-match table (design vs built, measured): sidebar
row heights ×3, button heights, popover box, settings column width, onboarding headline size,
progress segment height, Continue height. Every mismatch over 1px fixed before commit.

## Commit

```bash
git add src/v2/NotificationsPopover.tsx src/v2/WorkspaceSettings.tsx src/v2/WorkspaceSidebar.tsx src/v2/ConversationSurface.tsx src/v2/VisualWindow.tsx src/v2/workspace.css src/v2/conversation.css src/v2/visual-window.css src/lib/workspace.ts src/main.tsx src/App.tsx src/routes/Settings.tsx src/routes/Onboarding.tsx src/routes/Auth.tsx src/routes/Home.tsx e2e/visual.spec.ts scripts/audit/fixtures.ts scripts/audit/mock-convex-react.tsx e2e/__screenshots__/desktop
git commit -m "feat: move workspace settings and notifications into sidebar"
```

Then commit `punch-list.md` updates in the MISSION folder is not your job (the orchestrator commits
that repo); just edit the file.

## Report `rounds/R5-desktop-settings-and-punch.md`

Per item P001-P011: design value, built value before, built value after, evidence path. Per Task 5
step: commands + output. Baselines regenerated. Deviations. Placeholders.

## Hard rules

Never edit `convex/`, `tests/`, `package.json`, `.env.local`, `docs/superpowers/`, legacy CSS.
Never delete `Email.tsx`, `Tracker.tsx`, `Notifications.tsx`. Never delete a test or loosen a
threshold. Never `git add -A`. Never push. Kill the vite server when done.
