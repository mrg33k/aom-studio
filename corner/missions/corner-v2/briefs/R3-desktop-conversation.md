# Brief R3-desktop-conversation — one typed conversation surface for projects and missions, wired to the v2Workspace façade, styled like the design (desktop plan Task 3)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + the WD-40 directive), `rounds/R2-desktop-shell.md` (what the shell is,
its 11 deviations, the seams), and `rounds/R3-backend-routing.md` (the façade you consume). Write your
report to `rounds/R3-desktop-conversation.md`: every command with its output.

You are a headless worker, the BUILDER for desktop plan Task 3. Nobody will answer questions.

Plan: Task 3 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-desktop-web.md`
(read Global Constraints, "Target file structure and interfaces", Task 3). Visual truth:
`docs/design-reference/corner-v2/HANDOFF.md` section 3 "Chat" and "Composer", and the thread markup
inside `docs/design-reference/corner-v2/Corner v2.dc.html` (search for `TRANSCRIPT`, the message
rows, the question block, the steps card, the file card). Open the design HTML in Playwright at
1440x900 and screenshot the Work state before you write CSS; keep that PNG as
`rounds/evidence/R3-design-work-1440.png` (create with a 10-line throwaway script; do not commit
the script).

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`, HEAD `49d2a5a` or later. `npm run e2e` = 53 desktop tests green
  (offline Convex stand-in: `scripts/audit/mock-convex-react.tsx` + `scripts/audit/fixtures.ts`;
  `boot(page, path)` in `e2e/visual.spec.ts`). `npm test` = vitest. `npm run lint` has no config; skip.
- The shell (R2): `src/v2/WorkspaceShell.tsx`, `src/v2/WorkspaceSidebar.tsx`,
  `src/v2/LegacyRoomRedirect.tsx`, `src/v2/workspace.css`, `src/v2/tokens.css`, `src/v2/types.ts`,
  `src/lib/workspace.ts` (`roomsToNodes`, `resolveThreadForRoom` identity seam). The conversation
  pane currently mounts the OLD `src/routes/Chat.tsx` through a nested `/c/:roomId` route, with
  `data-cv6`/`data-screen` on the shell root so legacy styles still apply. Task 3 replaces that
  body with `ConversationSurface`; the legacy attributes stay until Task 6.
- The façade you consume (`convex/v2Workspace.ts`, committed `49d2a5a`; read the arg validators
  and return shapes in the file, they are the contract): `getNavigation({})`,
  `getConversationSurface({ threadId })`, `routeGlobalInput({ text, brain? })`,
  `confirmProposedHome({ proposalId })`, `moveThreadBlock({ blockId, targetThreadId })`,
  `requestCrossProjectWrite({ sourceThreadId, targetThreadId, action, change })`,
  `confirmCrossProjectWrite({ confirmationId })`, `sendMessage({ threadId, text, brain?,
  clientMessageId? })`. Types in `src/v2/types.ts` (`WorkspaceNode`, `TypedMessage`,
  `RouteDecision`, `ProvenanceLink`).
- TWO backend workers (MAPPING, VISUAL) are editing `convex/` and `tests/v2/` right now. You never
  touch `convex/`, `tests/`, `scripts/v2-*.mjs`, `docs/superpowers/`, `package.json`, `.env.local`.
  If `npm run build` fails on a type error inside `convex/`, wait 60 s and retry up to 8 times, note
  it, never edit the file. On `index.lock` wait 10 s, retry up to 5 times, never delete it. Never
  `git add` a path you did not create or edit.

## The visual contract for the thread (this is what "like the design" means for this round)

From HANDOFF section 3, measured in the design HTML, all inside `.v2-conversation-pane`:

- Thread column `max-width: 720px`, centred, 20px side padding; 70vh bottom padding so a new
  message can scroll to the top of the pane (HANDOFF section 6 "Fresh turns").
- Message row: 32px round avatar (agent = mark with agent tint, user = `--avatar` gradient with
  initial), then a name + time line (name 13px/600 `--fg`, time 12px `--faint`, `Space Mono` for the
  time), then the body.
- Agent text: UNBUBBLED, 15px / 1.6, `--fg`. No card, no coloured left border, no tinted
  background.
- User text: bubble, `--surface-2` fill, 12px radius, 15px, right-aligned block with the same avatar
  row treatment.
- Question block: option rows as radio rows, 12px padding, 12px radius, 1px `--hair`; the
  recommended option carries a small "Suggested" tag; selected row `--accent-weak` fill and
  `--accent` border.
- Steps card: 20px check circles, `--success` when done, 3px progress bar `--accent` on
  `--surface-2`.
- File card: 60px tall, 40px coloured badge (`--badge-pdf` etc. from tokens.css), file name in
  `Space Mono` 13px, size in `--muted`, kebab at the right. Clicking it opens the Visual Window tab
  (call `api.v2VisualWindow.openTab` if it exists at build time; if the VISUAL worker has not
  committed it yet, leave a one-line TODO and a no-op, and say so in the report).
- Agent label always visible on agent rows; `@brain` mention chips inline in text render as
  `--accent-weak` pills.
- Composer: 12px radius, 1px `--hair`, `--surface` fill, 44px min height, paperclip left, send
  button 36px round `--accent` right; placeholder "Message <Project or Mission name>"; Enter sends,
  Shift+Enter newline; `id="composer-input"` stays (tests depend on it). Typing `@` opens the
  brain picker (reuse the mention autocomplete already in `src/components/Composer.tsx`; the list
  comes from `api.agents.list` as today); the committed token renders as a chip and the test
  expects the text "Brain" to be visible somewhere in the picker/chip UI.
- Routing banner above the first reply of a globally routed message (`data-testid="route-path"`):
  `Project > Mission` in `--muted` 13px with a 28px "Move" ghost button (`--chip` fill) when
  `moveBlockId` is present. Clarification (`data-testid="route-question"`): the question as a
  question block whose options are the candidates. Proposal: a card with the proposed path and a
  56px-tall primary button "Create mission in General" (or "Create project <name>" for
  `proposed-new-home`).
- Cross-Project write proposal card (`data-testid="cross-project-confirmation"`): target path,
  action, the change text in a `--surface-2` block, a "Confirm write" primary button and a
  "Cancel" ghost; provenance chips (`data-testid="cross-project-provenance"`) `Project > Mission ·
  source label` above borrowed content.
- Global input: a second, single-line field in the sidebar under the search field? NO. The design
  has one composer per conversation and global routing enters through the sidebar's search field
  (⌘K). Implement `#global-input` as the sidebar search field's input (rename its id to
  `global-input`, keep the search behaviour when the text starts with `/`), with a "Send globally"
  button that appears (36px, `--accent`) once the field has text. Route decision UI renders in the
  CURRENT conversation pane.

## Step 1 — failing tests

Add the five tests from the plan's Task 3 Step 1 to `e2e/visual.spec.ts` verbatim. They boot
`/c/project-aster` and expect a mission link "Launch review" leading to `/c/mission-launch-review`.
Extend `scripts/audit/fixtures.ts` + `mock-convex-react.tsx` so the stand-in answers the façade:

- `v2Workspace.getNavigation` → nodes: project `project-aster` ("Aster", tint `#A78BFA`) with
  mission `mission-launch-review` ("Launch review"), project `project-northwind` ("Northwind",
  `#5B9BFF`), project `project-general` ("General", `isGeneral`), project `project-cellar-door`
  ("Cellar Door", `#F472B6`). Each node's `threadId` equals its id (fixture convenience).
- `v2Workspace.getConversationSurface({ threadId })` → conversation node + a transcript of at least
  8 typed messages covering text (agent + user), one question block, one steps card, one file card
  (`Aster brief.pdf`), one message with an `@design` mention; `artifacts: []`;
  `routingBanner: null`; `crossProjectProvenance: []`.
- `v2Workspace.routeGlobalInput`: text containing "Aster launch notes" → `confident-existing` to
  `mission-launch-review` with `path "Aster > Launch review"` and a `moveBlockId`; "Review the
  launch plan" → `ambiguous` with candidates Aster and Northwind; "renew my library card" →
  `proposed-general-mission` with `path "General > Renew my library card"`.
- `v2Workspace.requestCrossProjectWrite` → `{ confirmationId: "conf-1", expiresAt }`;
  `confirmCrossProjectWrite` → `{ confirmationId, consumedAt }`. Add a fixture-only button
  "Propose write to Northwind" in the conversation header's kebab menu (real product: the agent
  proposes; the fixture needs a trigger) that calls the request with `action "update brief"`.
- `v2Workspace.sendMessage` → appends a user message to the fixture transcript and, after 600 ms,
  an agent reply "Got it." (mirrors the existing stand-in's send → thinking → reply behaviour so the
  `send → thinking → reply` and `paperclip upload lands` tests keep passing through the new
  surface; read how the stand-in fakes those today and keep the same timings).

Run `npx playwright test e2e/visual.spec.ts --grep "project and mission use|@brain routing|global
input shows|global input asks|cross-Project write"`; paste the failures.

## Step 2 — implement

- `src/lib/workspace.ts`: add `useWorkspaceNavigation()` and `useConversationSurface(threadId)`
  exactly as the plan's Task 3 Step 3 (`useQuery`, no `worldId`), plus `useRouteGlobalInput`,
  `useConfirmProposedHome`, `useMoveThreadBlock`, `useRequestCrossProjectWrite`,
  `useConfirmCrossProjectWrite`, `useSendMessage` (`useMutation` wrappers). Keep `roomsToNodes` and
  `resolveThreadForRoom` for now but the sidebar STOPS using `roomsToNodes` when
  `useWorkspaceNavigation()` returns a non-empty array; when it returns an empty array (a workspace
  with no v2 projects yet, which is every world before its mapping run) fall back to
  `roomsToNodes(api.rooms.listRooms)` and show a one-line muted note under the Projects header:
  "Legacy rooms (not yet organised)". Say in the report that this fallback exists and why.
- `src/v2/ConversationSurface.tsx`: move message query, turn status, send, retry, optimistic
  message, attachment upload from `src/routes/Chat.tsx` into it, reading through
  `useConversationSurface` (typed messages) with the legacy `messages.list`-based path kept as the
  data source when the surface returns no `TypedMessage`s for a `threadId` that is really a legacy
  room id (the seam). Render per the visual contract above. `<GlobalInput />` in the sidebar as
  specified. Project and mission render through the same component, branching only on
  `conversation.kind` for the header path.
- `src/v2/WorkspaceSidebar.tsx`: grouped `WorkspaceNode[]`, project rows 40px, mission links 36px
  with class `v2-nav-mission` and `padding-left: 22px` (the test asserts exactly `22px`), General
  pinned first, needs-you 7px amber dot.
- `src/routes/Home.tsx`: remove the agent-grid; `/` selects the most recently active project
  (navigate to `/c/<threadId>`) or shows the v2 empty state ("Welcome to Corner." 38px centred, the
  three 64px-icon rows from HANDOFF section 5 "Empty home", non-functional links allowed this round).
- `src/components/Composer.tsx`: reuse for the composer; restyle via `.v2-conversation-pane
  .composer` scoped CSS in a new `src/v2/conversation.css` (import it from `src/index.css` after
  `workspace.css`). Do not edit legacy CSS files.

## Step 3 — gates

```bash
npm run build
npx playwright test e2e/visual.spec.ts --grep "project and mission use|@brain routing|global input shows|global input asks|cross-Project write|send → thinking → reply|paperclip upload lands"
npm run e2e
```

Full suite green, zero skips. Baselines for `/` and `/c/*` and `/room/*` will change (the thread
looks different now, by design): regenerate ONLY those and list each with one line on what changed.
Auth, settings, notifications, email, tracker baselines must not move.

Evidence (copy into `rounds/evidence/`): `R3-conversation-project-1440.png` (`/c/project-aster`),
`R3-conversation-mission-1440.png` (`/c/mission-launch-review`), `R3-route-confident-1440.png`
(after the confident routing), `R3-route-proposal-1440.png`, `R3-crossproject-confirm-1440.png`.
Then write a short comp-match table in the report: for the thread, composer, and sidebar rows,
design value vs built value for: avatar size, name size, body size and line-height, user bubble
radius and fill, composer height and radius, project/mission row heights, mission indent. Measure
the built values with `getBoundingClientRect`/`getComputedStyle` in a Playwright snippet; measure the
design values the same way against `Corner v2.dc.html`. Every mismatch over 1px is fixed before
you commit, not listed.

## Step 4 — commit

```bash
git add src/lib/workspace.ts src/v2/ConversationSurface.tsx src/v2/GlobalInput.tsx src/v2/conversation.css src/v2/WorkspaceShell.tsx src/v2/WorkspaceSidebar.tsx src/routes/Home.tsx src/components/Composer.tsx src/index.css e2e/visual.spec.ts scripts/audit/fixtures.ts scripts/audit/mock-convex-react.tsx e2e/__screenshots__/desktop
git commit -m "feat: unify projects and missions as conversations"
git log --oneline -3 && git status
```

Stage nothing under `convex/`, `tests/`, `docs/superpowers/`.

## Report `rounds/R3-desktop-conversation.md`

Per step: commands + output; failing then passing runs; full-suite line; baselines regenerated
and why; the comp-match table with the measured numbers; evidence paths; every deviation and why;
what is still placeholder (one line each).

## Hard rules

Never edit `convex/`, `tests/`, `package.json`, `.env.local`, `docs/superpowers/`, legacy CSS files
(`src/cv6-*.css`, `src/polish.css`). Never delete a test. Never loosen a Playwright threshold. Never
regenerate a baseline for a route whose host you did not change. Never render agent text inside a
bubble or a tinted card (the design has none). Never `git add -A`. Never push. Never deploy. Kill the
vite server when done.
