# R4 — desktop visual window (plan Task 4)

Worker: BUILDER (headless, no questions). Worktree
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`, branch
`codex/corner-v2-integration`, base `3de9198` at start. Commit for this round:
**`64ddc48 feat: add durable corner visual window`** (15 files, +2900/−52).
Never pushed. Never touched `convex/`, `tests/`, `scripts/v2-*.mjs`,
`docs/superpowers/`, `package.json`, `.env.local`. No test deleted, no
threshold loosened. No `git add -A`. Vite server dead at end (port 5173
refused). No `convex/` type error and no `index.lock` collision, so no
wait/retry was needed.

Pre-reads: `LOOP.md` (hard lines + WD-40), `rounds/R3-desktop-conversation.md`
(seams/fixtures), `rounds/R3-backend-visual.md` (façade + tab positions),
desktop plan Task 4, `HANDOFF.md` §§3/6, `ArtifactStage.dc.html` (props, stage
measurement, pin rendering, timed-media control bar, site chrome, code diff).

## Step 0 — design truth

Opened `Corner v2.dc.html` over a local throwaway server in Playwright at
1440×900 (script in `/tmp`, not committed), clicked the Aster thread's file
strip chips, screenshotted each stage state to `rounds/evidence/`:

```bash
python3 /tmp/r4-design-shots.py
# SHOT R4-design-stage-pdf
# SHOT R4-design-stage-photo
# SHOT R4-design-stage-site
```

All three visually checked: PDF pane (title, chip strip, page thumbs,
`click through`, Expand), photo pane (grapefruit image, `+ Add pages`,
Expand), site pane (browser chrome with `en.wikipedia.org/wiki/Coffee`, live
Wikipedia iframe, Desktop/Mobile toggle, Expand). Bonus (not required):
`R4-design-stage-review.png` (review mode with a dropped pin). Default state
shows the youtube artifact (`Reference · Aster 2025 film`).

Design values measured in the design HTML (Playwright, shadow-piercing):

- Pane header 56px; Preview tab 15px/600 with 2px solid `--fg` underline
  (`rgb(233,233,236)`); Context muted.
- Review button (off): 36px high, 14px/600, 1px `--divider` border,
  transparent fill.
- File strip chips: `height:34px`, radius 8, 13px/500; selected
  `bg var(--surface-2)` + `border rgba(255,255,255,.28)`; unselected
  `bg var(--surface)` + `var(--hair)` (from `Corner v2.dc.html:427,1769`).
- Stage title 20px. Pins 24×24 (`--accent` fill/white number; selected white
  fill/dark number `rgb(11,15,20)`, measured on a dropped pin).
- Aspect rule (`Corner v2.dc.html:1780-1804`): `portrait = asp < 1.05`,
  `paneWidth = clamp(max(340px,40vw), stageH*asp+30px, 60vw)` where
  `stageH = 100vh-150px` (wide) else `100vh-262px`. Square photo at 1440 →
  pane 864px wide (60vw cap hit).

## Step 1 — failing tests

Extended `scripts/audit/fixtures.ts` (only file; `mock-convex-react.tsx`
needed NO edit — it already forwards every function name to the store):
`V2_ARTIFACTS` on `project-aster` (`Aster brief.pdf` pdf/3 pages →
`/fixtures/aster-brief.pdf`; `launch-site` site → `about:blank`; `hero.png`
photo → generated 900×1400 `/fixtures/hero-portrait.png`; `walkthrough.mp4`
video → ffmpeg 2 s clip; `hero.tsx` code; `broken.pdf` with `broken: true`),
`V2_TOOLS` (`email: Print deadline`, `tracker: Landing page`, served inside
`artifactsForThread` so every file list offers `Open <title>`), and
`v2VisualWindow.*` + `v2Visual.*` cases mirroring the backend (durable across
`page.reload()`: the fixture session persists in `localStorage` keyed
`v2visual:<threadId>`; counters reseed past persisted ids on load — this is a
fixture-only durability shim; real durability is `convex/v2Visual.ts`).
Assets: repo PDF copied to `public/fixtures/aster-brief.pdf` (792,315 B),
PNG generated with a zlib script (900×1400 verified), MP4 via
`ffmpeg -f lavfi color+sine` (23,218 B).

```bash
cp "docs/design-reference/corner-v2/assets/Day 1 - The 2026 Playbook - v2.pdf" public/fixtures/aster-brief.pdf
ffmpeg -y -loglevel error -f lavfi -i "color=c=0x1d2430:s=640x360:d=2:r=30" -f lavfi -i "sine=frequency=440:duration=2" -pix_fmt yuv420p -shortest public/fixtures/walkthrough.mp4
```

Added the plan's five Task 4 Step 1 tests to `e2e/visual.spec.ts` verbatim,
plus `unavailable artifact keeps its tab and offers retry` (opens
`broken.pdf`; asserts the tab stays in the strip and a `Retry` button is
visible).

```bash
npx playwright test e2e/visual.spec.ts --grep "Visual Window opens ordered|Visual Window closes and reorders|Preview and Context persist|Email and Tracker open|review pin becomes|unavailable artifact keeps"
# 6 failed (required failure; representative lines):
# - waiting for getByRole('button', { name: 'Open launch-site' })
# - waiting for getByRole('tab', { name: 'Context' })
# - waiting for getByRole('button', { name: 'Open email: Print deadline' })
# - expect(locator).toHaveAttribute expected failed / element(s) not found
```

## Step 2 — implement

- `src/v2/VisualWindow.tsx` (new): `role="tab"` Preview/Context calling
  `setView` (not tabs); file strip = the tab bar (`data-testid="visual-tab"`,
  `data-active`, activate + always-in-DOM `Close <title>` (hover/active
  visible) + always-in-DOM `Move <title> left/right` chevrons); Review 36px
  (`--accent` fill when on, `Review · N` when off with N pins); full-screen +
  kebab (`Open in Context` menu); `Looking at <title> · <why>` status line;
  Context view (files with `Open <title>`, connections via the same
  `api.arcade.listIntegrations` query `Settings.tsx` uses, static permission
  toggles, provenance from the surface query); lightbox (fixed
  `.v2-visual-lightbox`, same stage, close-button autofocus).
- `src/v2/ArtifactStage.tsx` (new): `ResizeObserver` box measurement +
  natural-aspect callback (`data-aspect` on the pane); pdf (iframe + page
  arrows/thumbs + page-aware pins), deck/document (wireframe + static Add
  pages), site (browser chrome, Interact passthrough toggle, Desktop/Mobile
  toggle → `setTabPosition({ siteViewport })`, `srcDoc` demo when liveUrl is
  `about:blank`), photo (`img`, natural aspect on load), video (`video` +
  custom bar, scrubber with pin markers, `Pin moment`), youtube (embed,
  guarded), code (diff header/line numbers/+/- with strikethrough, line pins);
  `file`/`email`/`tracker` deferred stage (`visual-deferred-renderer`,
  title + `The <Kind> view opens here once it is built.` + Retry + Open in
  Context); tab `error` renders the error text + Retry (re-calls `openTab`).
- `src/v2/visual-window.css` (new, imported after `conversation.css`):
  header/title/strip/pins (24px, `--accent`, selected white, done
  `--success`)/checklist/toast/lightbox styles; portrait/square pane
  narrowing via grid `:has()` columns (the host is a grid, so the plan's
  flex rule is expressed as grid columns with the same clamp); review-layout
  breakpoints verbatim.
- `src/v2/lightbox.ts` (new): external lightbox store so `App` Escape closes
  it first.
- `src/lib/workspace.ts`: `useVisualSession`, `useThreadArtifacts`
  (artifacts come from `v2Visual.artifactsForThread`; the surface query's
  array is still `[]` until the backend fix), `useTabPins`,
  `useVisualMutations` (9 façade functions + `sendChecklist`, `carryOn`,
  `artifactsForThread` read, `setTabPosition`, `markTabError`).
- `src/v2/WorkspaceShell.tsx`: mounts `<VisualWindow threadId />`; pane
  closed placeholder when there is no thread; local preview/context state
  removed (server `view` owns it).
- `src/v2/ConversationSurface.tsx`: transcript file cards + a thread-files
  stack (files not already inline, so every `Open <title>` name is unique)
  call `openTab`; review-mode composer takeover (`Notes on <file>` + Clear
  which removes the pins, per-pin ordinal + Space Mono page/time marker +
  `What should change here?` input committing via `updatePin` on change +
  per-row ×, `Send N changes` disabled until one body is filled,
  `Nothing to change, carry on` ghost; send awaits `sendChecklist` then sets
  review off ONLY after it resolves; checklist renders in-thread as
  `1. [p1] …` / `1. [00:02] …`).
- `src/App.tsx`: Escape closes lightbox first, then palette/menu, and never
  navigates away from `/c/:threadId` (the old `nav("/")` is gone).
- `src/index.css`: `visual-window.css` import after `conversation.css`.

Two functional bugs found by the gate and fixed: (1) `Open Aster brief.pdf`
resolved to 2 elements (inline card + files row) → the row now skips titles
already shown inline; (2) `layoutContract` failed — the files row scrolled
past the viewport (`button.v2-file right=1546`) → the row is a vertical stack
of full-width cards. Three visual fixes from evidence review: stage bar
`margin-top:auto` (it rode at the top under absolute media), Review 14px to
match design, 9px badge text in the files stack (`TRACKER` overflowed).

## Step 3 — gates

```bash
npm run build
# ✓ built in 1.3x s (tsc clean throughout; one self-made type error fixed)
npx playwright test e2e/visual.spec.ts --grep "Visual Window opens ordered|Visual Window closes and reorders|Preview and Context persist|Email and Tracker open|review pin becomes|unavailable artifact keeps|send → thinking → reply"
# 7 passed (after the two fixes above; send test's room-mention.png regenerated, see baselines)
npm run e2e
# 64 passed (2.8m) — zero failed, zero skipped (58 pre-existing + 6 new)
npm test
# Test Files 11 passed (11); Tests 90 passed (90)
```

`npm run lint` has no config; skipped per brief.

Baselines regenerated (ONLY `/c/*` hosts, each changed by the open visual
pane — new header buttons/title and, on v2 threads, the files stack):

- `room-mention.png` — visual header now has Review/Expand/kebab + `Preview`
  title + dashed empty stage (conversation/sidebar pixels identical, verified
  side-by-side).

`room.png` needed NO regen (fails were layout-only; passes within tolerance).
No other baseline moved.

Evidence (`rounds/evidence/`, all 1440×900, visually checked):
`R4-visual-pdf-1440.png`, `R4-visual-photo-portrait-1440.png` (pane narrowed),
`R4-visual-site-1440.png`, `R4-visual-video-1440.png` (00:00/00:02 bar),
`R4-visual-code-1440.png`, `R4-review-pins-1440.png` (3 pins + checklist
composer), `R4-visual-context-1440.png`, `R4-visual-deferred-email-1440.png`,
`R4-lightbox-1440.png`. Probe-verified beyond screenshots: 5th pin shows the
2 s `Four pins is the limit` toast; `Send 4 changes` posts `1. [p1] …` to the
thread and review flips off only after resolve; lightbox Escape closes and
stays on `/c/project-aster`; PDF serves `200 application/pdf` (its dark paint
is headless Chromium's plugin surface, not the app — iframe `src` contract).

Comp-match table (design measured in `Corner v2.dc.html`, built on
`/c/project-aster`, both at 1440×900):

| attribute | design | built | Δ |
|---|---|---|---|
| pane header height | 56px | 56px | 0 |
| tab underline thickness | 2px `--fg` | 2px solid (fg, active) | 0 |
| Review button size | 36px h, 14px | 36px h, 14px | 0 |
| chip size | 34px h | 34px h | 0 |
| chip selected border | `rgba(255,255,255,.28)` | same | 0 |
| stage title size | 20px | 20px | 0 |
| pin diameter | 24px | 24×24px | 0 |
| portrait pane width @1440 | 864px (square, 60vw cap) | 576px (portrait, 40vw floor) | formula-identical, aspect differs |

Portrait rule is formula-matched: both sides compute
`clamp(max(340px,40vw), stageH·asp+30px, 60vw)`; the numbers differ only
because the artifacts differ (design square 1:1 hits the 60vw cap, fixture
portrait 900:1400 hits the 40vw floor: `max(340,576)=576`).

## Step 4 — commit

```bash
git add src/v2/VisualWindow.tsx src/v2/ArtifactStage.tsx src/v2/visual-window.css src/v2/WorkspaceShell.tsx src/v2/ConversationSurface.tsx src/lib/workspace.ts src/index.css src/App.tsx e2e/visual.spec.ts scripts/audit/fixtures.ts scripts/audit/mock-convex-react.tsx public/fixtures e2e/__screenshots__/desktop
# plus src/v2/lightbox.ts (new file the commit needs; absent from the brief's pathspec, like R3's App.tsx/tokens.css)
git commit -m "feat: add durable corner visual window"
# [codex/corner-v2-integration 64ddc48] 15 files changed, 2900 insertions(+), 52 deletions(-)
git log --oneline -3 && git status
# 64ddc48 feat: add durable corner visual window
# 3de9198 feat: unify projects and missions as conversations
# 453baf7 feat: add shared v2 visual window state
# (clean)
```

`mock-convex-react.tsx` listed but unedited (no-op add). Never pushed.

## Deviations from the brief (every one)

1. Review with no open tab opens the thread's first file and arms review on
   it — otherwise the header action is dead on a fresh thread and the
   verbatim pin test (no `Open` step) cannot pass.
2. Pane narrowing uses grid `:has()` columns with the design's exact clamp
   (host is a grid; the plan's flex rule would be dead code).
3. No `git add` of `src/v2/lightbox.ts` was specified; staged anyway — the
   commit is broken without it.
4. Thread files render as a vertical stack (not a horizontal strip) so
   `layoutContract`'s no-offscreen rule holds.
5. `Clear` removes the tab's pins (keeps review on); `carryOn` sets review
   off after resolve; pin selection/focus is local + `selectedPinId` from the
   session (no facade select mutation exists).

## Still placeholder (one line each)

- Deck/document renderers are wireframes; `Add pages` slots static.
- Site `about:blank` renders a `srcDoc` demo page (fixture-only path).
- Youtube renderer is embed + guarded API (no fixture artifact, offline).
- Permissions toggles are local-only, labeled static in Context.
- `looking` status line implemented, unexercised (fixture sets no `looking`).
- Legacy `legacy:` tabs resolve to the deferred file renderer.
- Checklist rows track the active tab only; pins survive send (agent resolves
  them via `review_progress`, backend-owned).
