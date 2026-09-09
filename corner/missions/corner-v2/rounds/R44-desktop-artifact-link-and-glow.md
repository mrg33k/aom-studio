# R44 — desktop artifact link and glow (L037): a link opens straight to the file, and the composer gets its glow back

Mission `corner:corner-v2`. Worktree `corner-v2-integration`, branch
`codex/corner-v2-integration`, commit `cf9118c` (scoped, 5 files,
+210/−1, not pushed). Preview:
https://corner-v2-integration-gvwq2yzv7-aheads-projects-d2a4c70f.vercel.app
(bundle `index-BCRPsjdn.js`, served = built; bundle references
`brilliant-scorpion-163` 1×, `neat-pony-216` 0× — prebuilt deploy,
`VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud` +
`VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site`, never
`--prod`). `convex/` untouched. `neat-pony-216` untouched.

Reads first: `LOOP.md`, `rounds/R43-desktop-visual-window-opens.md` (extended),
`punch-list.md` L037, gateway G3 §5.4 (the desktop ask) + the G3 brief §5 F3/F4,
the CV4 `GlassBackdrop.jsx` (feel, not code).

## Root cause (one sentence each)

- **Link:** nothing read the query string — `/c/<threadId>` routed by
  pathname only (`App.tsx` splits on `/c/`), so a `?artifact=` link landed
  on the thread with the file unopened, exactly the G3 §5(4) gap.
- **Glow:** the v2 composer never had it — no tinted backdrop element
  exists anywhere in `src/` (only full-viewport CV4/CV6 backdrops), so
  L037/P093 stood open on both platforms.

## What shipped

- **Deep link** (`src/v2/VisualWindow.tsx`): on mount, when `?artifact=`
  names an artifact on THIS thread, one `v2VisualWindow.openTab`
  (`{threadId, kind, targetId}` → the shared `openTabCore`, the web
  facade of the brief's `v2Visual.openTab`) — it opens the tab when none
  exists, focuses an already-open one, reopens a closed one — plus a
  `setView preview` so the file itself is visible, then the param is
  dropped with `history.replaceState` (no reload). Absent or unknown
  param = today's behaviour (unknown ids clear silently). One-shot guard
  per thread+id; both calls idempotent, so a repeated landing re-focuses
  harmlessly. No `convex/` edits needed — the facade already activates.
- **Reply link (no code):** the agent's pull-up replies already carry
  exactly `https://www.aheadofmarket.com/dashboard/c/<thread>?artifact=<id>`
  (bridge `dashboard_link`, R51/R52 — verified in
  `AOM-EA/scripts/v2-team-bridge.py:1286`, used at `:4938`/`:4968`/`:5002`
  with the `ensure_link_in_reply` guarantee). This round was the missing
  desktop half. The aom-studio redirect keeps the query string —
  curl-verified: `307` →
  `https://corner-convex.vercel.app/c/PROJECTASTER123?artifact=art-hero`.
- **Glow** (`src/components/Composer.tsx`, `src/v2/ConversationSurface.tsx`,
  `src/v2/conversation.css`): a `.v2-composer-glow` div behind the pill —
  140px tall fading upward, `color-mix` tint at the spec's 12–18%, 10s
  drift, `blur(16px)`. Tint = the thread tint (the sidebar avatar colour;
  Aster `#A78BFA` locked in e2e); pulse = `newestAgentBlock.id`, a change
  after mount brightens for exactly 1s (never on mount — history is not
  an arrival); `prefers-reduced-motion` → static tint (JS skips the pulse,
  CSS kills the drift). Absolute + `aria-hidden` + `pointer-events:none`,
  pill/tray/checklist/chips lifted to `z-index:1` (the absolute drop
  overlay untouched) — positioning only, so no gated anchor moves.
- **Offline proof** (`e2e/visual.spec.ts`, "R44 artifact link and glow",
  4 tests): link opens the tab from zero tabs + focuses + clears without
  reload (+ reload keeps today's behaviour); link focuses across existing
  tabs while unknown ids are ignored-and-cleared; glow presence + Aster
  tint var + 130–150px height + 8–12s drift + reduced-motion `none`;
  step/reply arrivals raise `data-pulse="1"`, settling back after a second
  (against the `audit_follow_turn` +2s/+4s turn).
- **No snapshot regeneration:** the glow stayed inside the 1% budget on
  every existing screenshot (`__screenshots__/` clean after the full run).

## Before / after (1440, stand-in)

| | before (`R44-before-composer-no-glow-clip.png`) | after (`R44-after-1440-artifact-link.png`, `R44-after-composer-glow-clip.png`) |
|---|---|---|
| link | `?artifact=` lands on the thread, file unopened | `hero.png` tab open + focused, Preview stage, param gone from URL |
| composer | flat ground behind the pill (R43 production pixels) | soft purple halo hugging the pill, fading upward (peak +19/255 over ground, drift + pulse carry it live) |

## Gates (all run in the worktree / against the preview, final tree)

| command | output |
|---|---|
| `npm run lint` | 0 errors, 11 warnings (all pre-existing, none in R44 lines) |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | 32 files, 253 passed |
| `PW_PORT=5174 npx playwright test --output e2e/results-orch` | **129 passed, 0 failed** (EXIT=0; 125 at R43 + 4 R44) |
| `LIVE_BASE_URL=<preview> npm run test:design` | 0 screens / 0 UI rows failing |
| `LIVE_BASE_URL=<preview> npx playwright test --project live` | 11 passed, 0 failed (2 skipped, R43 pattern) |

TDD note (LOOP hard line 5): all 4 R44 tests fail on the old tree and pass
on the new one (targeted runs to `/tmp`, not the gate dir).

## Commits (scoped, none pushed)

- Worktree `cf9118c` (5 files, +210/−1):
  `src/v2/VisualWindow.tsx` (deep-link effect), `src/components/Composer.tsx`
  (`accent`/`pulseId` props, glow div, 1s pulse), `src/v2/ConversationSurface.tsx`
  (`tint` + `newestAgentId` into both v2 mounts),
  `src/v2/conversation.css` (glow rules, drift, reduced-motion),
  `e2e/visual.spec.ts` (R44 ×4).
- Left alone on purpose: `convex/*`, `.vercel/` (ignored), `dist/`
  (ignored), `e2e/results-*/` (generated), `httprobe.tmp.mjs` (untracked,
  pre-existing, not mine). `e2e/r44-shots.spec.ts` (worktree-temp evidence
  camera) ran twice to `/tmp` output and is deleted.
- Mission folder (this report + `rounds/evidence/R44-after-1440-artifact-link`,
  `R44-after-composer-glow-clip`, `R44-before-composer-no-glow-clip.png`):
  uncommitted, left for the orchestrator (R38/R39/R41/R43 precedent).

## For the orchestrator

1. **Facade, not the literal name.** The brief says `v2Visual.openTab`;
   the web calls `v2VisualWindow.openTab`, which runs the same
   `openTabCore` (verified: it sets `activeTabId` on every path, including
   already-open). No backend change was needed — `convex/` is untouched.
2. **Links light up after the production redeploy.** The 307 lands on
   production `corner-convex.vercel.app`, which is still the R43 tree
   without the handler — the param will sit ignored-but-harmless there
   until Patrik cuts production over, as usual. Preview proves the shape.
3. **General tint, one shade off the app accent.** The brief equates
   "sidebar avatar colour" with "app accent" for General; the code passes
   the thread tint, whose default is `#5B9BFF`, while `--accent` is
   `#3B82F6`. Same family, not the same hex. One-line change in
   `ConversationSurface.tsx` (`accent={tint}` → accent variable) if you
   want General pinned to `--accent` exactly.
4. **Preview `…-gvwq2yzv7-…` is up and green** (design 0/0, live 11/0);
   production redeploy remains Patrik's call. (`vercel pull --yes` was
   needed before `vercel build` again — same as R41.)
5. **Native P093 is still open** and now has a web reference
   implementation: same numbers (140px, 10s, 12–18%, 1s pulse, static on
   Reduce Motion), tint = the drawer mark colour.

## Still off and why (non-empty, all disclosed)

1. The gate e2e ran once on the final tree (EXIT=0, 129 green). Targeted
   R44 runs during development went to `/tmp` (fail-first 4 fail, post-fix
   4 pass); the evidence camera spec is deleted. No snapshot was
   regenerated — verified unnecessary (clean `__screenshots__/`).
2. The pulse fires on any newest-agent-block change — a `steps` arrival
   brightens too, not only text replies. The e2e locks step-then-reply
   brightening as the arrival shape; narrowing to text-only is a one-line
   filter on `pulseId` if the design side wants it.
3. The deep link flips Context → Preview when it opens/focuses. Deliberate
   (the file must be visible, not just the focused chip); say so if links
   should respect a Context view instead.
4. The legacy-room Composer (same file) and the empty-home
   `.home-composer` carry no glow — R6 quarantine and out-of-scope
   respectively. L037 names the thread pill.
5. No live send was made from this round. The after-shots are the offline
   stand-in at 1440, and the before-clip is the same tree with the glow
   hidden (≈ R43 production pixels, which carry no glow by construction).
   Nothing was written anywhere but the worktree, the preview deploy, and
   this mission folder.
