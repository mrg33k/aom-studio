# Brief R2-desktop-shell — v2 reference checksums, contracts, tokens, and the three-pane WorkspaceShell (desktop plan Tasks 1 + 2)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` first (hard lines). Write your report to `rounds/R2-desktop-shell.md`: every command with
its output pasted.

You are a headless worker, the BUILDER for desktop plan Tasks 1 and 2. Nobody will answer questions.

Plan: Tasks 1 and 2 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-desktop-web.md`
(read Global Constraints, the "Target file structure and interfaces" section, Task 1, Task 2).
Authoritative visual source (ALREADY in the repo, do not re-copy from `/tmp`):
`docs/design-reference/corner-v2/Corner v2.dc.html`, `ArtifactStage.dc.html`, `HANDOFF.md`. Read
`HANDOFF.md` sections 2 (tokens) and 3 (desktop layout) before writing CSS.

## Where things are, exactly

- Worktree: `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`, HEAD `611249e`. `node_modules` installed by R1. `npm run build` =
  `tsc && vite build`. R1 facts (`rounds/R1-backend-reconcile.md`): `npm run e2e` = 51 desktop tests
  green, zero skips, 2.4 minutes; `npm test` = 58 green; `npm run lint` fails on every branch (no
  eslint config ever existed): skip it. `.env.local` points at the rehearsal Convex deployment; you
  never need it (the e2e harness is offline) and you never run `npx convex` anything.
- A BACKEND worker is running in this same worktree at the same time, editing `convex/`, `tests/v2/`.
  Concurrency rules: (a) if `git commit` fails with `index.lock`, wait 10 seconds and retry, up to 5
  times; never delete the lock file. (b) never `git add` a path you did not create or edit. (c) if
  `npm run build` fails on a TYPE error inside `convex/` (not `src/`), that is the other worker
  mid-edit: wait 60 seconds and re-run, up to 5 times, and say so in the report; never edit `convex/`.
- A backend worker is editing `convex/` and `tests/v2/` at the same time. You never touch `convex/`,
  `tests/`, `scripts/v2-*.mjs`, `docs/superpowers/`, `package.json`, `.env.local`. You read `convex/` only
  to understand a query.
- Desktop e2e harness: `npm run e2e` (Playwright, project `desktop` 1440x900 only), spec
  `e2e/visual.spec.ts`, offline Convex stand-in in `scripts/audit/mock-convex-react.tsx` and fixtures in
  `scripts/audit/fixtures.ts` (the `boot(page, path)` helper in the spec loads the app against that
  stand-in). Baselines `e2e/__screenshots__/desktop/`. Kill a leftover server: `lsof -ti :5173 | xargs kill`.
- The current app: `src/App.tsx` hosts a phone-width column (`maxWidth:560`) with a topbar and drawer;
  `src/routes/Home.tsx` is the room list; `src/routes/Chat.tsx` is the room thread; routes in
  `src/main.tsx`. Theme tokens live on `.shell[data-theme]` in `src/index.css`. This all stays working
  in this round; you ADD the v2 shell beside it and switch the authenticated `/` and `/room/:id` routes
  to it. Legacy CSS removal is a later task (Task 6), not yours.

## Task 1

### Step 1 — checksum manifest for the reference (already copied; you only add the manifest)

```bash
cd docs/design-reference/corner-v2 && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 shasum -a 256 > SHA256SUMS && cd -
shasum -a 256 -c docs/design-reference/corner-v2/SHA256SUMS | tail -3
```

### Step 2 — failing shell test

Add the `desktop workspace fills the viewport with three panes` test from the plan's Task 1 Step 2 to
`e2e/visual.spec.ts`, before the existing home suite. Run
`npx playwright test e2e/visual.spec.ts --grep "desktop workspace fills"`; paste the failure
(`.v2-workspace` missing).

### Step 3 — contracts and tokens

Create `src/v2/types.ts` with EXACTLY the interfaces in the plan's "Target file structure and
interfaces" section (`ConversationKind`, `VisualWindowView`, `ArtifactKind`, `WorkspaceNode`,
`VisualPin`, `VisualWindowTab`, `VisualWindowState`, `Artifact`, `ProvenanceLink`, `RouteDecision`).
Also add `TypedMessage` (`{ id, threadId, authorType: "user" | "agent" | "system", authorLabel,
agentSlug: string | null, kind: "text" | "question" | "steps" | "file" | "artifact" | "routing" |
"system", payload: unknown, createdAt: number, pending?: boolean, failed?: boolean }`).

Create `src/v2/tokens.css` with the exact block from the plan's Task 1 Step 4, plus (from HANDOFF.md
section 2): `--avatar`, the file badge colours as `--badge-pdf/-md/-yt/-mp4/-png/-url`, motion
`--v2-ease: cubic-bezier(.22,1,.36,1)`, and `font-family` for `.v2-mono` = `"Space Mono", ui-monospace,
monospace`. Load the two Google fonts (Hanken Grotesk 400/500/600/700, Space Mono 400) via a `<link>` in
`index.html` (one line; if `index.html` already loads fonts, add to that link).

Create `src/v2/workspace.css`: `.v2-workspace` is a CSS grid `var(--v2-sidebar-w) minmax(340px, 440px)
minmax(0, 1fr)` at `min-width:1000px`, `min-height:100dvh`, `width:100%`, `overflow:hidden`,
`background:var(--ground)`, `color:var(--fg)`. Panes: `.v2-sidebar`, `.v2-conversation-pane`,
`.v2-visual-pane`, each `min-width:0; display:flex; flex-direction:column`; sidebar and conversation
have `border-right:1px solid var(--divider)`. Headers `.v2-sidebar-header`, `.v2-conversation-header`,
`.v2-visual-header`: `height:var(--v2-header-h); flex:none; display:flex; align-items:center;
padding:0 16px; border-bottom:1px solid var(--divider)`. When the visual pane is absent
(`.v2-workspace[data-visual="closed"]`), the grid is `var(--v2-sidebar-w) minmax(0,1fr)` and the
conversation thread column is `max-width:720px; margin:0 auto`.

Add `@import "./v2/tokens.css"; @import "./v2/workspace.css";` as the first two lines of
`src/index.css` (before its existing imports; delete nothing).

`npm run build` must pass. Re-run the focused Playwright test; it must still fail only because the
shell is not mounted. Paste both.

### Step 4 — commit Task 1

```bash
git add docs/design-reference/corner-v2/SHA256SUMS src/v2/types.ts src/v2/tokens.css src/v2/workspace.css src/index.css index.html e2e/visual.spec.ts
git commit -m "test: preserve corner v2 reference and workspace contract"
```

## Task 2

### Step 1 — failing route + header test

Add the `legacy room URL redirects to the shared conversation surface` test from the plan's Task 2
Step 1. Run `npx playwright test e2e/visual.spec.ts --grep "legacy room URL redirects"`; paste the
failure.

### Step 2 — shell + sidebar

Create `src/v2/WorkspaceShell.tsx` with the plan's public shape. Add `data-visual="open" | "closed"`
on `.v2-workspace` (open when a `threadId` is set; closed on `/`). Create `src/v2/WorkspaceSidebar.tsx`:
header 56px with the Corner mark (`docs/design-reference/corner-v2/assets/corner-mark-white.svg`; copy it
to `public/corner-mark-white.svg`) and a 40px search field below the header; a "Recent" section and a
"Projects" section with the `+` in the section header; rows 40px project / 36px mission with 22px indent
(HANDOFF section 3); footer with identity row. Data for this round comes from the EXISTING queries the
app already runs (`api.rooms.listRooms` or whatever `src/routes/Home.tsx` uses; read Home.tsx and reuse
the same hook and args) mapped into `WorkspaceNode[]` by a new adapter `src/lib/workspace.ts`:

```ts
export function roomsToNodes(rooms: any[]): WorkspaceNode[]   // kind "project" rooms -> project nodes; kind "mission" rooms -> mission nodes under the project whose title equals room.project (else under a synthetic "Unfiled" project node); kind "agent" rooms are DROPPED (agent rooms are not navigation in v2)
export function resolveThreadForRoom(roomId: string): Promise<string>  // TEMPORARY SEAM: returns roomId until api.v2Compatibility.getRoomThread exists (backend Task 7). One-line comment saying exactly that.
```

Selecting a row navigates to `/c/<threadId>`. The active row has `data-on="1"` (HANDOFF section 1).
Needs-you = 7px amber dot (`--warn`) with glow, never a number.

Conversation pane for this round: header (56px) showing the node's `path` (`Project` or `Project >
Mission`) in `--muted` above the title; body mounts the EXISTING `src/routes/Chat.tsx` component for the
thread id (it still reads rooms by id, and the seam makes threadId === roomId this round) inside
`.v2-conversation-body{flex:1;min-height:0;overflow:auto}`. Do NOT rewrite Chat.tsx; Task 3 does.

Visual pane for this round: header (56px) with underlined tabs "Preview" / "Context" (15px, 2px
underline `--fg` on the active one) and a Review button (36px) that does nothing yet; body is an empty
stage with the muted line "Nothing open yet". Everything real lands in Task 4.

### Step 3 — routes

`src/main.tsx`: add `<Route path="c/:threadId" element={<App />} />`; keep `room/:roomId` but its
element becomes `<LegacyRoomRedirect />` (in `src/v2/LegacyRoomRedirect.tsx`) which awaits
`resolveThreadForRoom(roomId)` then `navigate(\`/c/${threadId}\`, { replace: true })`. `src/App.tsx`:
for authenticated `/` and `/c/:threadId`, render `<WorkspaceShell threadId={threadId ?? null} />`
instead of the topbar + drawer + `maxWidth:560` host. Auth, onboarding, settings, notifications,
email, tracker routes keep their current hosts this round.

### Step 4 — responsive fallback (plan Task 2 Step 5)

`@media (max-width:999px)`: one-column grid; `.v2-sidebar` hidden unless `.v2-workspace[data-drawer="open"]`
(a 44px button in the conversation header toggles it); `.v2-visual-pane` hidden. Functional, not a
pixel target.

### Step 5 — fixtures and gates

Extend `scripts/audit/fixtures.ts` only if the stand-in lacks a room shaped like the ones the sidebar
maps (it has `r6`; the redirect test boots `/room/r6`). Then:

```bash
npm run build
npx playwright test e2e/visual.spec.ts --grep "desktop workspace fills|legacy room URL redirects"
npm run e2e
```

The full suite: existing desktop tests that photograph the OLD `/` and `/room/*` hosts will now see the
v2 shell and their baselines will differ. That is intentional. For each such test: keep the test, update
its baseline with `--update-snapshots` for THAT test only, and list every baseline you regenerated in the
report with one line on what changed. Tests for `/email`, `/tracker`, `/settings`, `/notifications`,
`/auth` must NOT change (their hosts are untouched); if any of those baselines move, you broke
something — find it.

Screenshot evidence: after the suite, run
`npx playwright test e2e/visual.spec.ts --grep "desktop workspace fills"` and copy the resulting
`.v2-workspace` frame (or take one with `page.screenshot` in the test) to
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/rounds/evidence/R2-desktop-shell-1440.png`
(create the folder).

### Step 6 — commit Task 2

```bash
git add src/v2/WorkspaceShell.tsx src/v2/WorkspaceSidebar.tsx src/v2/LegacyRoomRedirect.tsx src/v2/workspace.css src/lib/workspace.ts src/App.tsx src/main.tsx e2e/visual.spec.ts scripts/audit/fixtures.ts public/corner-mark-white.svg e2e/__screenshots__/desktop
git commit -m "feat: add corner v2 desktop workspace shell"
git log --oneline -3 && git status
```

Do not stage anything under `convex/`, `tests/`, `docs/superpowers/` (the other worker's).

## Report `rounds/R2-desktop-shell.md`

Per step: commands + output. Both failing runs, both passing runs, the full-suite line with counts
(zero skips). Baselines regenerated and why. Evidence PNG path. Every deviation from the brief and why.
One line per thing in the shell that is still a placeholder (Review button, empty stage, seam).

## Hard rules

Never edit `convex/`, `tests/`, `package.json`, `.env.local`, `docs/superpowers/`. Never delete a test.
Never loosen a Playwright threshold. Never regenerate a baseline for a route whose host you did not
change. Never `git add -A`. Never push. Never deploy. Kill the vite server when done.
