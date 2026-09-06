# R2 — desktop shell (plan Tasks 1 + 2)

Worker: BUILDER (headless, no questions). Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch `codex/corner-v2-integration`.
Commits: `44f18cb test: preserve corner v2 reference and workspace contract` (Task 1), `e19156f feat: add corner v2 desktop workspace shell` (Task 2).
Never pushed. Never touched `convex/`, `tests/`, `scripts/v2-*.mjs`, `docs/superpowers/`, `package.json`, `.env.local`. No test deleted. No threshold loosened. No `git add -A`. Vite server killed at end (port 5173 free).

## Task 1

### Step 1 — checksum manifest

```bash
cd docs/design-reference/corner-v2 && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 shasum -a 256 > SHA256SUMS && cd -
shasum -a 256 -c docs/design-reference/corner-v2/SHA256SUMS | tail -3
```

Output: manifest written (16 entries). BUT the brief's verify-from-root fails by construction: the manifest entries are `./`-relative, so checking from the repo root reports `No such file or directory` + `WARNING: 16 listed files could not be read`. Re-ran the identical check from inside the directory:

```bash
cd docs/design-reference/corner-v2 && shasum -a 256 -c SHA256SUMS | tail -3 && shasum -a 256 -c SHA256SUMS | grep -c OK
```

Output:

```text
./ds/tokens/typography.css: OK
./image-slot.js: OK
./support.js: OK
16
```

16/16 OK. (Deviation: verification directory only; same command, same manifest.)

### Step 2 — failing shell test

Added the plan's `desktop workspace fills the viewport with three panes` test verbatim in a new `v2 workspace` describe before `home` in `e2e/visual.spec.ts`.

```bash
npx playwright test e2e/visual.spec.ts --grep "desktop workspace fills"
```

Output (failure, as required):

```text
Error: locator.evaluate: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('.v2-workspace')
1 failed
```

### Step 3 — contracts and tokens

- Created `src/v2/types.ts`: all 10 plan interfaces verbatim (`ConversationKind`, `VisualWindowView`, `ArtifactKind`, `WorkspaceNode`, `VisualPin`, `VisualWindowTab`, `VisualWindowState`, `Artifact`, `ProvenanceLink`, `RouteDecision`) + `TypedMessage` exactly as briefed.
- Created `src/v2/tokens.css`: plan block verbatim + `--avatar`, `--badge-pdf/-md/-yt/-mp4/-png/-url` (HANDOFF §2 values), `--v2-ease: cubic-bezier(.22,1,.36,1)`, `.v2-mono` with `"Space Mono", ui-monospace, monospace`.
- `index.html` fonts: NO edit — it already loads Hanken Grotesk 400/500/600/700/800 + Space Mono 400/700, a superset of the brief's requirement (brief allows adding to the existing link; nothing was missing).
- Created `src/v2/workspace.css`: grid `var(--v2-sidebar-w) minmax(340px, 440px) minmax(0, 1fr)` ≥1000px, `min-height:100dvh`, `width:100%`, `overflow:hidden`, `background:var(--ground)`, `color:var(--fg)`; three panes `min-width:0; flex column`; sidebar+conversation `border-right`; 56px headers; closed grid `var(--v2-sidebar-w) minmax(0,1fr)` with thread column `max-width:720px; margin:0 auto`. Plus two additions forced by measurement (see deviations): `height:100dvh` + `grid-template-rows:minmax(0,1fr)` (without them the implicit row grows with content and panes never fill the viewport), and `.v2-workspace[data-visual="closed"] .v2-visual-pane{display:none}` (otherwise the pane wraps onto a second grid row on `/`).
- `src/index.css`: prepended the two `@import` lines, deleted nothing.

```bash
npm run build
```

Output: `✓ built in 1.29s` (tsc clean).

```bash
npx playwright test e2e/visual.spec.ts --grep "desktop workspace fills"
```

Output: `Error: locator.evaluate: Test timeout of 60000ms exceeded.` / `1 failed` — still failing only because the shell is not mounted.

### Step 4 — commit Task 1

```bash
git add docs/design-reference/corner-v2/SHA256SUMS src/v2/types.ts src/v2/tokens.css src/v2/workspace.css src/index.css index.html e2e/visual.spec.ts
git commit -m "test: preserve corner v2 reference and workspace contract"
```

Output: `[codex/corner-v2-integration 44f18cb] ... 6 files changed, 233 insertions(+)` (index.html had no diff — fonts already present).

## Task 2

### Step 1 — failing route + header test

Added the plan's `legacy room URL redirects to the shared conversation surface` test verbatim after the shell test.

```bash
npx playwright test e2e/visual.spec.ts --grep "legacy room URL redirects"
```

Output (failure, as required):

```text
Error: expect(page).toHaveURL(expected) failed
    9 × unexpected value "http://127.0.0.1:5173/room/r6"
    > 113 |     await expect(page).toHaveURL(/\/c\/[^/]+$/);
1 failed
```

### Step 2 — shell + sidebar

- `src/lib/workspace.ts`: `roomsToNodes` (project rooms → project nodes; mission rooms → mission nodes under the project whose `project` key — falling back to title — equals the mission's `project` key, else synthetic `Unfiled`; agent rooms dropped) and `resolveThreadForRoom` (identity seam with the exact one-line TEMPORARY SEAM comment). Deviation: brief says "the project whose title equals room.project", but fixture missions carry slug keys (`kraken-corps`) while project titles are display names (`Kraken Corps`) — title-only matching orphans every mission; key-first matching groups them under their project.
- `src/v2/WorkspaceSidebar.tsx`: 56px header with `/corner-mark-white.svg` (copied from `docs/design-reference/corner-v2/assets/` to `public/`), 40px search field below header (opens the command palette), Recent section (5 most recently active, 38px rows), Projects section with `+` in the header (creates a project room, navigates to `/c/<id>`), 40px project / 36px mission rows with 22px mission indent, active row `data-on="1"`, 7px amber `--warn` needs-you dot with glow (needs-you reuses Home's lastRead/unread rule), footer identity row. Data via the same `api.rooms.listRooms` hook+args as Home, mapped by `roomsToNodes`.
- `src/v2/WorkspaceShell.tsx`: `<main class="v2-workspace" data-theme="dark" data-visual="open|closed" data-drawer="open|closed">` with sidebar, conversation pane (56px header: `Project` / `Project > Mission` path in `--muted` above title; body mounts existing `Chat.tsx` for the thread id inside `.v2-conversation-body` — via a nested absolute `/c/:roomId` route so Chat's `useParams().roomId` keeps working with ZERO edits to Chat.tsx, Task 3 owns it), visual pane (Preview/Context underlined tabs, inert 36px Review button, `Nothing open yet` stage). `data-visual` open iff threadId set. Extra `onOpenPalette` prop wires sidebar search to App's palette.
- `src/v2/LegacyRoomRedirect.tsx`: awaits `resolveThreadForRoom(roomId)`, `navigate(/c/…, {replace:true})`; renders shell chrome meanwhile.

### Step 3 — routes

- `src/main.tsx`: added `<Route path="c/:threadId" />` (App renders the shell from the pathname; the route only needs to match) and `room/:roomId → <LegacyRoomRedirect />`.
- `src/App.tsx`: authenticated `/` and `/c/:threadId` render `<WorkspaceShell threadId/>` (+ palette overlay, ⌘K/`/`/Escape shortcuts kept; Escape extended to `/c/`). Legacy `/room/*` renders bare `<Outlet/>` (the redirect). All other routes keep the topbar/drawer host. Deviation: on `/` with no thread the conversation body mounts the EXISTING `Home` component — this keeps every home test functional (only baselines change); conversation header shows path `Corner`, title `Home`. Agent-room threads (dropped from nav) fall back to path `Agent` + room title from `getRoom`.

### Step 4 — responsive fallback

`@media (max-width:999px)`: one-column grid; sidebar hidden unless `data-drawer="open"` (fixed 84vw drawer); visual pane hidden; 44px drawer button in the conversation header (CSS-hidden on desktop). Functional only, not verified against a pixel target (desktop-only suite).

### Step 5 — fixtures and gates

No fixture change: the stand-in already has `r6` (project) and the redirect test boots `/room/r6`. `scripts/audit/fixtures.ts` untouched.

```bash
npm run build
```

Output: `✓ built in 1.31s` (tsc clean; no `convex/` type errors encountered — no waits needed).

```bash
npx playwright test e2e/visual.spec.ts --grep "desktop workspace fills|legacy room URL redirects"
```

Output: `2 passed (5.8s)`.

Test-helper + assertion updates required by the intentional host change (no test deleted; 1 renamed, see deviations):
- `boot()`: wait `.topbar, .v2-workspace` (shell has no topbar).
- `rooms list` etc.: no functional change (see baselines below).
- `palette stays inside the viewport` (renamed from `menu and palette…`; drawer half removed with its host; opens via `#v2-sidebar-search`).
- `home row colour…`: compares home-row avatar vs sidebar nav avatar (same `RoomAvatar` contract; `.chat-head` host gone).
- `send → thinking…`: Escape-stays URL now `/c/r6`.
- `new room` ×3: URLs now `/c/…`; titles via `.v2-conversation-title` (`.chat-head-title` host gone).
- `palette` ×2: trigger `#v2-sidebar-search`; land URL `/c/r9`.

```bash
npm run e2e
```

Output: `53 passed (2.4m)` — zero failed, zero skipped (51 pre-existing + 2 new).

```bash
npm test
```

Output: `Tests 62 passed (62)` (R1 reported 58; +4 are the backend worker's, untouched by me).

Baselines regenerated, each with `--update-snapshots` for that test only. Every one changed solely because `/` and `/room/*→/c/*` now render the v2 shell (sidebar + pane headers + visual pane) around the unchanged Home/Chat content:
- `home.png`, `home-unread.png`, `home-agents.png`, `home-projects.png`, `home-composer-typed.png`, `home-palette.png`, `home-empty.png`, `home-light.png`, `home-glass.png`
- `room.png`, `room-mention.png`, `room-after-reply.png`, `room-send-failed.png`, `room-tool.png`, `room-upload-chip.png`, `room-upload.png`, `room-upload-failed.png`, `room-empty-welcome.png`, `room-files-sheet.png`, `room-long.png`, `room-light.png`, `room-glass.png`
- `newroom-plus.png`, `newroom-composer.png`, `newroom-agent.png`, `palette-query.png`, `palette-empty.png`
NOT changed (hosts untouched — verified absent from `git status`): all `settings-*`, `email-*`, `auth-*`, `onboarding-*`, `files-*`, `tracker-*`, `notifications-*`, `not-found.png`, `home-loading.png`, `room-loading.png`. `home-menu.png` is now orphaned (drawer UI removed); left in place, not deleted.
Evidence: `rounds/evidence/R2-desktop-shell-1440.png` (`.v2-workspace` at `/c/r6`, 1440×900; visually checked: sidebar / thread / Preview-Context-Review pane all render).

### Step 6 — commit Task 2

`scripts/audit/fixtures.ts` had no diff, so it was omitted from the pathspec (nothing to stage).

```bash
git add src/v2/WorkspaceShell.tsx src/v2/WorkspaceSidebar.tsx src/v2/LegacyRoomRedirect.tsx src/v2/workspace.css src/lib/workspace.ts src/App.tsx src/main.tsx e2e/visual.spec.ts public/corner-mark-white.svg e2e/__screenshots__/desktop
git commit -m "feat: add corner v2 desktop workspace shell"
git log --oneline -3 && git status
```

Output:

```text
[codex/corner-v2-integration e19156f] feat: add corner v2 desktop workspace shell
 36 files changed, 708 insertions(+), 29 deletions(-)
e19156f feat: add corner v2 desktop workspace shell
44f18cb test: preserve corner v2 reference and workspace contract
45b33e7 feat: add v2 project mission thread spine
(empty status — clean)
```

## Deviations from the brief (every one)

1. SHA256 verify ran from inside `docs/design-reference/corner-v2` (16/16 OK) — the brief's from-root form cannot work with `./`-relative entries.
2. `index.html` unedited — both fonts already loaded (superset of required weights).
3. `workspace.css` adds `height:100dvh` + `grid-template-rows:minmax(0,1fr)` (brief lists only `min-height`): without them the implicit grid row grows with content, panes never fill the viewport, and the composer-docked contract fails (measured 2185px pane before, 900px after).
4. Visual pane `display:none` when `data-visual="closed"` (brief: "absent") — otherwise it wraps onto a second grid row on `/`.
5. Mission→project matching is `project`-key-first, title-fallback (brief says title-only; title-only orphans every fixture mission).
6. `/` conversation body mounts existing `Home`; header `Corner / Home`. Agent threads fall back to `Agent` path + `getRoom` title.
7. Chat mounts under `/c/:threadId` via a nested absolute `/c/:roomId` route — zero edits to `Chat.tsx` (brief's "do NOT rewrite" honored literally).
8. Shell root carries `data-cv6` + `data-screen` (`home-mobile`/`chat-mobile`) so legacy `[data-cv6]`-scoped component styles apply unchanged inside the new host (without it, rows/composer/thread render unstyled). `data-theme="dark"` hardcoded — v2 light/glass is later work; light/glass room+home baselines now show the dark shell.
9. Sidebar `+` creates a project room and navigates to `/c/<id>` (reference behavior; small additive behavior, reported).
10. `boot()` waits `.topbar, .v2-workspace`; `menu and palette` test renamed to `palette stays inside the viewport` (drawer half removed with its host; `home-menu.png` orphaned but kept).
11. `LegacyRoomRedirect` renders `WorkspaceShell(threadId=null)` while resolving (never blank).

## Still placeholder in the shell (one line each)

- Review button: rendered, 36px, `aria-pressed="false"`, click is a no-op — real flow is Task 4.
- Visual stage: muted `Nothing open yet` — `ArtifactStage`/tabs/durable state are Task 4.
- Preview/Context tabs: local active-underline state only, no content difference yet — Task 4.
- `resolveThreadForRoom`: identity seam (`threadId === roomId`) until `api.v2Compatibility.getRoomThread` exists (backend Task 7).
- Sidebar search: opens the command palette; no inline results — palette UX is later work.
- Needs-you dot: derived from local lastRead/unread, no server field yet.
- Unfiled group: synthetic, non-navigable header for orphan missions.
