# R39 — desktop surface window (L030): the web reads the newest 200 rows, not the whole thread

Mission `corner:corner-v2`. Worktree `corner-v2-integration`, branch
`codex/corner-v2-integration`, commit `048c127` (scoped, 8 files, not
pushed). Preview: https://corner-v2-integration-7elnc66cs-aheads-projects-d2a4c70f.vercel.app
(bundle `index-pH6A-D4n.js`, served = built; bundle references
`brilliant-scorpion-163` 1×, `neat-pony-216` 0×, `Earlier messages` 1× —
prebuilt deploy, `VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud`
+ `VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site`, never
`--prod`). `convex/` untouched (two backend asks below).
`neat-pony-216` untouched.

Reads first: `LOOP.md`, `rounds/R38-desktop-pixel-pass.md` (extended — its
L027–L029 behavior and gates hold; design gate below re-proves them),
`punch-list.md` L030, `rounds/LEDGER.md` R37 → DBG-8.

## What shipped

- **Every web reader passes `limit`** (`src/lib/workspace.ts`:
  `useConversationSurface(threadId, limit = SURFACE_WINDOW_DEFAULT = 200)`).
- **Thread pane owns its window** (`src/v2/ConversationSurface.tsx`):
  component state (200 default, +200 per click, reset per thread — state in
  the component, not the backend). The "Earlier messages" row renders at the
  top of the thread when the window is full (`messages.length >= limit`).
  Prepend keeps the scroll position (pre-expansion geometry stashed on
  click, delta re-applied after the new rows render); appends keep the R22
  pin / new-messages-pill behavior (the length effect branches on
  limit-change vs arrival).
- **Cheap readers** — `src/v2/WorkspaceShell.tsx` header status passes
  `limit: 1` (Working/Ready derives from the newest block only);
  `src/v2/VisualWindow.tsx:382` (ContextView) passes `limit: 1` (files come
  from `v2Visual.artifactsForThread`; the surface is only provenance).
- **The row**: the design export has no such row — grepped
  `Corner v2.dc.html` and `HANDOFF.md` for earlier/show-more/load-more: no
  hits — so per the brief it is a muted single line in the thread's own
  rhythm, no new visual language (`conversation.css` `.v2-earlier`: 12.5px,
  `--faint`, centred, hover `--muted`). Said so here as required.
- **Offline proof** — `scripts/audit/fixtures.ts`: the stand-in honors
  `limit` (newest N, no 200 cap so expansion past 200 is provable) plus a
  `project-big` thread with 1,500 rows, flag-gated behind
  `audit_big_thread` (the R22 `audit_long_thread` idiom — see "Still off"
  1 for why the flag exists). `tests/v2/surface-window.test.ts` (3 tests):
  1,500 mixed rows (750 legacy links + 750 blocks) window to the newest
  200 / `limit: 1` returns the newest row / legacy links are windowed too.
  `e2e/visual.spec.ts` "R39 surface window" (2 tests): the big thread
  renders exactly 200 rows with the Earlier row (muted 12.5px lock),
  click → 400 rows with the scroll held far from the bottom; send → agent
  reply paints within 1.5 s.

## Before / after

- Service (orchestrator-measured, LEDGER R35/R37/DBG-8): Wolfpack full read
  2.85 s / 1430 rows; `limit: 40` 0.52–0.62 s; user-side first signal 6.1 s
  Wolfpack / 3.1 s Ambition while the service wrote the step at 0.6–0.9 s —
  the gap was the reader recomputing the full query per tab.
- After: every web subscription is windowed (thread 200, header 1,
  Context 1). New per-tab work per arrival is bounded by the window, not
  the thread.
- Live read-only timing, production clone, tester account
  (`/tmp/corner-v2-e2e.env`), browser-console `fetch` of the same query the
  app subscribes to, tester threads (12 total, biggest "Spring launch deck"
  58 rows): full 171 ms / windowed-200 85 ms / limit-1 127 ms (single
  samples, ±50 ms noise; small threads are all sub-300 ms either way — the
  window is neutral there, decisive on Wolfpack-scale threads per the
  service numbers above). No sends anywhere; no AOM thread touched.
- Offline Wolfpack-scale: 1,500-row thread renders 200 rows; first agent
  step paints within the 1.5 s bound (stand-in reply lands at 600 ms; the
  e2e asserts send→paint < 1500 ms).
- PNGs: `rounds/evidence/R39-earlier-row.png` (the quiet row),
  `R39-earlier-thread-1440.png` (window starts at note 1300 = 1500−200),
  `R39-earlier-expanded-1440.png` (400 rows after one click).

## Gates (all run in the worktree, final tree)

| command | output |
|---|---|
| `npm run lint` | 0 errors, 11 warnings (all pre-existing — verified: the one `ConversationSurface` warning is the legacy-thread effect at old line ~1319, not R39 lines) |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | 26 files, 198 passed (was 195: +3 R39) |
| `PW_PORT=5174 npx playwright test --output e2e/results-orch` | **120 passed, 0 failed** (final run on the final tree; see "Still off" 1 for the first run's 1 fail) |
| `LIVE_BASE_URL=<preview> npm run test:design` | 0 screens / 0 UI rows failing (L027–L029 rows green on the R39 tree) |
| `LIVE_BASE_URL=<preview> npx playwright test --project live` | 11 passed, 2 skipped (the two pre-existing conditional skips), 0 failed |

## Commits (scoped, none pushed)

- Worktree `048c127` (8 files, +292/−11): `src/lib/workspace.ts`
  (limit plumbing), `src/v2/ConversationSurface.tsx` (window state +
  Earlier row + scroll hold), `src/v2/WorkspaceShell.tsx` (header limit 1),
  `src/v2/VisualWindow.tsx` (Context limit 1), `src/v2/conversation.css`
  (`.v2-earlier`), `scripts/audit/fixtures.ts` (limit + flag-gated big
  thread), `e2e/visual.spec.ts` (R39 ×2), `tests/v2/surface-window.test.ts`
  (new ×3).
- Left alone on purpose: `convex/*`, `.vercel/`, `e2e/results-*/`
  (generated), `/tmp` probes. Temp e2e specs (`r39-shots`, `r39-probe`,
  `r39-timing`) created, run, deleted — none committed.
- Mission folder (this report + `rounds/evidence/R39-*`): uncommitted, left
  for the orchestrator (R38 precedent).

## For the orchestrator

1. **Native passes no `limit` — it does not read this query at all.** iOS
   reads `v2Native:threadEvents({threadId, after?})`
   (`AOM-EA/aom-studio/ios-native/Corner/Services/CornerV2API.swift`
   `v2ThreadEvents`), which has no `limit` and returns the full entry list
   (`corner-v2-integration/convex/v2Native.ts:536`). A big thread costs the
   phone the same full walk the web just stopped paying. Not edited per the
   brief — suggested ask: window `threadEvents` newest-N behind the `after`
   cursor (or add `limit`), mirroring `getConversationSurface`.
2. **Raise the `getConversationSurface` cap past 200 or add a cursor.**
   The web now asks 400/600/… per Earlier click, but the deployed query
   clamps to 200 (`Math.min(200, …)` in `convex/v2Workspace.ts:266`), so
   the second click re-reads the same 200. Options: allow `limit` to
   ~2000, or add `offset`/`before`. Until then the row stays visible and a
   repeat click is an honest no-op. `convex/` untouched per the brief.
3. Preview `…-7elnc66cs-…` is up and green (design 0/0, live 11/0);
   production redeploy remains Patrik's call as usual. Note: `vercel build`
   needed `vercel pull --yes` first in this session (settings were stale);
   auth itself (`vercel whoami` = mrg33k) worked.

## Still off and why (non-empty, all disclosed)

1. The gate e2e ran twice, not once: the first full run went 119 + 1 fail —
   `room-empty-welcome.png` (2% diff). The fail was mine: the new
   `project-big` fixture node rendered in the v2 sidebar (RECENT + an
   expanded project block) on the legacy `/room/r5` page. Fixed by
   flag-gating the node behind `audit_big_thread` (R22 idiom), solo-verified
   the screenshot green plus the R39 pair, then ran the final full gate
   (120 green). No snapshot was regenerated; the committed PNGs are
   byte-identical to before.
2. A thread with exactly 200 rows total reads as "full", so the Earlier row
   shows once with nothing behind it; the click re-reads the same window.
   Inherent to a newest-N read with no total — accepted per brief.
3. Item "for the orchestrator" 2: expansion past 200 on production waits on
   the backend cap. Offline proves the UI past 200 (400-row expansion
   e2e-green); production proves 200.
4. Live timing above is single-sample per shape on small tester threads
   (the only threads the e2e account can read); Wolfpack-scale user-side
   proof is the DBG-8 6.1 s baseline for the next probe to beat — the
   service-side win (3.1–3.9 s → 0.52–0.57 s Wolfpack surface) already
   landed in DBG-8.
5. `headerStatus` on a windowed header reads the newest 1 row: identical to
   the full read by construction (the verdict only ever reads the newest
   block), but if the newest row arrives while the header subscription is
   between polls, it flips one poll later like every other subscription —
   no new staleness class.
