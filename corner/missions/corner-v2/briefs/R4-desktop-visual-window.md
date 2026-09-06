# Brief R4-desktop-visual-window — Preview/Context views, durable ordered tabs, ArtifactStage with pins, review checklist, lightbox (desktop plan Task 4)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md` (hard lines + WD-40), `rounds/R3-desktop-conversation.md` (the surface you build
beside; its seams and fixtures), `rounds/R3-backend-visual.md` (the façade you consume, its 4
deviations, and how tab positions work). Write your report to `rounds/R4-desktop-visual-window.md`:
every command with its output.

You are a headless worker, the BUILDER for desktop plan Task 4. Nobody will answer questions.

Plan: Task 4 of
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/superpowers/plans/2026-09-05-corner-v2-desktop-web.md`.
Visual truth: `docs/design-reference/corner-v2/HANDOFF.md` sections 3 ("Visual pane header",
"Body"), 6 ("Visual Window behaviors", "Artifact kinds"), and `ArtifactStage.dc.html` (its props,
the stage measurement with `ResizeObserver`, pin rendering, the control bar for timed media, the
site browser chrome with Interact + viewport toggle, the code diff view). Before writing CSS, open
`Corner v2.dc.html` in Playwright at 1440x900, click into the Aster thread's PDF and photo and site
artifacts, and screenshot each stage state; keep them as `rounds/evidence/R4-design-stage-*.png`.

## Where things are, exactly

- Worktree `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
  `codex/corner-v2-integration`. HEAD includes `453baf7` (visual backend) and the R3 desktop commit.
  `npm run e2e` desktop-only, offline stand-in (`scripts/audit/mock-convex-react.tsx` +
  `fixtures.ts`). `npm run lint` has no config; skip.
- Façade (`convex/v2VisualWindow.ts`, read the file for exact arg validators and the
  `VisualWindowState` it returns from `sessionStateCore`): `getSession({ threadId })`, `openTab({
  threadId, kind, targetId })` (`kind` `"email"|"tracker"` → tool tab; `targetId` starting
  `legacy:` → synthesised legacy file; else artifact id), `closeTab`, `reorderTab({ threadId, tabId,
  toOrdinal })`, `setActiveTab`, `setView({ threadId, view })`, `setReview({ threadId, tabId,
  reviewing })`, `addPin({ threadId, tabId, xPct, yPct, page, timecodeMs, codeLine, body })`,
  `updatePin({ pinId, body, status })`, `removePin({ pinId })`. Also `v2Visual.listPins({ tabId })`,
  `v2Visual.sendChecklist({ threadId, tabId })`, `v2Visual.carryOn({ threadId })`,
  `v2Visual.artifactsForThread({ threadId })`, `v2Visual.setTabPosition({ tabId, page?,
  timecodeMs?, codeLine?, siteViewport? })`, `v2Visual.markTabError({ tabId, error })`. The
  conversation surface's `artifacts` array may still be `[]` until the R4 backend worker lands its
  fix; read artifacts from `v2Visual.artifactsForThread` directly and say so.
- A BACKEND worker may be editing `convex/` at the same time (cutover work). You never touch
  `convex/`, `tests/`, `scripts/v2-*.mjs`, `docs/superpowers/`, `package.json`, `.env.local`. If
  `npm run build` fails on a type error inside `convex/`, wait 60 s and retry up to 8 times. On
  `index.lock` wait 10 s, retry up to 5 times. Never `git add` a path you did not create or edit.

## The visual contract (design values; measure them in the design HTML and match within 1px)

- Pane header 56px: underlined tabs Preview / Context (15px, 2px underline `--fg` on the active,
  `--muted` text otherwise), Review button 36px (`--accent` fill + white text when on, `--chip`
  when off; reads "Review · N" when off with N pins), full-screen button, kebab. `role="tab"` +
  `aria-selected` on the two view buttons exactly as the plan's Task 4 Step 3.
- Body: 20px title, then the file strip (icon chips 34px, `--surface` fill, selected border
  `rgba(255,255,255,.28)`, horizontal scroll with edge fades + arrows when clipped), then the stage.
  The file strip IS the tab bar: one chip per open tab (`data-testid="visual-tab"`,
  `data-active`), each chip has an activate area, an `×` close (visible on hover and when active,
  always in the DOM as a button "Close <title>"), and deterministic "Move <title> left/right"
  buttons (visually small chevrons on hover; always in the DOM with those exact accessible names).
- Status line under the strip when the agent is looking: `Looking at <title> · <why>` in
  `--muted` 13px (from `getSession().looking`).
- Stage: fits media by width or height using the measured box (`ResizeObserver`); reports its
  natural aspect through a callback that sets `data-aspect="portrait|square|landscape|fill"` on
  `.v2-visual-pane`; portrait/square narrows the pane per the plan's Step 5 CSS; landscape and
  fill-type take the width.
- Pins: numbered 24px circles, `--accent` fill, white number; selected pin white fill `--accent`
  number; done pins `--success`. Max 4 per artifact version; a fifth click shows a 2-second toast
  "Four pins is the limit" and does nothing. Click on the stage in review mode → pin at x/y %
  (+ page for pdf/deck, + timecode for video/youtube, + line for code). Click a pin → selects it
  and focuses its composer row.
- Composer takeover in review mode (HANDOFF section 3 "Composer"): the conversation composer
  becomes the checklist: header "Notes on <file>" + Clear; one row per pin (ordinal, its
  page/time marker in `Space Mono`, an input placeholder "What should change here?", a per-row ×);
  the send button reads "Send N changes"; "Nothing to change, carry on" ghost button posts
  `carryOn`. Sending calls `sendChecklist`, then sets review off ONLY after the mutation resolves
  (plan Step 4). The checklist message renders in the thread as the canonical numbered list
  (`1. [p2] Move the primary action above the fold`).
- Renderers this release: pdf (`<iframe src>` with page arrows and page-aware pins), deck +
  document (wireframe pages like the design, `Add pages` slots may be static), site (`<iframe>`
  inside browser chrome with Interact toggle passing pointer events through and desktop/mobile
  viewport toggle that calls `setTabPosition({ siteViewport })`), photo (`<img>`, natural aspect on
  load), video (`<video>` with a custom control bar, scrubber with pin markers, "Pin moment"),
  youtube (IFrame API, shared clock with the control bar), code (diff view with header, line
  numbers, +/−, line pins). `file`, `email`, `tracker`: the retained-tab unavailable state
  (`data-testid="visual-deferred-renderer"`) with the title, one plain sentence ("The Email view
  opens here once it is built."), and a "Retry" + "Open in Context" pair. An `error` on the tab
  shows the same stage with the error text and Retry (which re-calls `openTab`).
- Context view: lists the thread's files (from artifacts), connections (existing
  `integrations.listForUser`-style query the app already uses; read Settings.tsx for the hook),
  permissions (static toggles from the design, non-functional this round, say so), and the
  cross-Project provenance links from the surface query.
- Lightbox: fixed `.v2-visual-lightbox` mounting the same stage; focus moves to its close button;
  Escape closes lightbox first, then any overlay, and never navigates away from `/c/:threadId`
  (extend the App keyboard handler).

## Step 1 — failing tests

Add the five tests from the plan's Task 4 Step 1 verbatim, plus one: `an unavailable artifact keeps
its tab and offers retry` (fixture artifact `broken.pdf` whose `openTab` sets `error`; assert the
tab stays in the strip and a "Retry" button is visible). Extend the stand-in so
`v2VisualWindow.*` and `v2Visual.*` behave like the backend (durable across `page.reload()`: keep
the fixture session in `localStorage` keyed by threadId so reload reproduces the state; say so in
the report, this is a fixture-only durability shim). Fixture artifacts on `project-aster`:
`Aster brief.pdf` (pdf, 3 pages, use `docs/design-reference/corner-v2/assets/Day 1 - The 2026
Playbook - v2.pdf` copied to `public/fixtures/aster-brief.pdf`), `launch-site` (site, liveUrl
`about:blank`; the stand-in serves a small static HTML page instead), `hero.png` (photo, portrait,
generate a 900x1400 PNG with a script into `public/fixtures/`), `walkthrough.mp4` (video, use the
existing e2e fixture if one exists, else a 2-second generated clip), `hero.tsx` (code diff),
`broken.pdf`, plus tool items "email: Print deadline" and "tracker: Landing page". Buttons "Open
<title>" exist in the conversation's file cards / Context list (the plan's tests click
`getByRole("button", { name: "Open Aster brief.pdf" })`).

Run the seven with `--grep`; paste the failures.

## Step 2 — implement

`src/v2/VisualWindow.tsx`, `src/v2/ArtifactStage.tsx`, `src/v2/visual-window.css` (import from
`src/index.css` after `conversation.css`), `src/lib/workspace.ts` (`useVisualSession(threadId)`,
`useVisualMutations()` wrapping the ten façade mutations + the four `v2Visual` extras,
`useThreadArtifacts(threadId)`), `src/v2/WorkspaceShell.tsx` (mount `<VisualWindow threadId />` in
the visual pane; pane closed state when there is no thread), `src/v2/ConversationSurface.tsx`
(composer takeover in review mode; file card click → `openTab`; checklist message rendering),
`src/App.tsx` (Escape order). Preview and Context are `setView`, not tabs. Opening appends +
activates; selecting only `setActiveTab`; closing only that tab. Never replace or close another tab
from any action.

## Step 3 — gates

```bash
npm run build
npx playwright test e2e/visual.spec.ts --grep "Visual Window opens ordered|Visual Window closes and reorders|Preview and Context persist|Email and Tracker open|review pin becomes|unavailable artifact keeps|send → thinking → reply"
npm run e2e
```

Full suite green, zero skips; regenerate only `/c/*` baselines that the open visual pane changes,
listed one line each.

Evidence to `rounds/evidence/`: `R4-visual-pdf-1440.png`, `R4-visual-photo-portrait-1440.png`
(pane narrowed), `R4-visual-site-1440.png`, `R4-visual-video-1440.png`, `R4-visual-code-1440.png`,
`R4-review-pins-1440.png` (three pins + checklist composer), `R4-visual-context-1440.png`,
`R4-visual-deferred-email-1440.png`, `R4-lightbox-1440.png`. Then the comp-match table: header
height, tab underline thickness, Review button size, chip size, chip selected border, title size,
pin diameter, portrait pane width at 1440 — design vs built, measured, every mismatch over 1px
fixed before commit.

## Step 4 — commit

```bash
git add src/v2/VisualWindow.tsx src/v2/ArtifactStage.tsx src/v2/visual-window.css src/v2/WorkspaceShell.tsx src/v2/ConversationSurface.tsx src/lib/workspace.ts src/index.css src/App.tsx e2e/visual.spec.ts scripts/audit/fixtures.ts scripts/audit/mock-convex-react.tsx public/fixtures e2e/__screenshots__/desktop
git commit -m "feat: add durable corner visual window"
git log --oneline -3 && git status
```

## Report `rounds/R4-desktop-visual-window.md`

Per step: commands + output; failing then passing; full-suite line; baselines regenerated; the
comp-match table with numbers; evidence paths; deviations; placeholders (one line each).

## Hard rules

Never edit `convex/`, `tests/`, `package.json`, `.env.local`, `docs/superpowers/`, legacy CSS. Never
delete a test or loosen a threshold. Never let any action close or replace a tab other than the one
acted on. Never turn review off before the send resolves. Never `git add -A`. Never push. Kill the
vite server when done.
