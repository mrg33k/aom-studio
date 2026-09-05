# R0-web — web E2E true on this Mac (corner:corner-smooth-loop)

Date: 2026-09-05. Repo `corner-convex` @ `9b6a159` (main). Worker did steps 1–6 of brief R0-web.

## 1. Result

`npm run e2e`: **36 passed** (was 8 passed / 28 failed). Baselines regenerated on this Mac,
one harness fix in `e2e/visual.spec.ts`. No threshold/tolerance/test changes, no `src/` changes.

## 2. Failure classification (all 28)

Method per screenshot: identical dimensions check, Playwright `*-diff.png` review (diffs show
only red text-glyph edges, never boxes/borders/backgrounds), plus a Gaussian-blur(6) layout
comparison of actual vs expected — residual differences only on text-dense rows, hotspots
crop-compared side by side (mention pill, header avatar, chips, welcome text: same elements,
same position, same colours, only glyph-edge AA differs).

One systematic non-AA delta: the topbar profile avatar renders accent-blue on this Mac but
was dark in exactly one committed baseline (`iphone-15-pro/not-found.png`; the desktop and
SE not-found baselines are blue, as is all current output). Committed CSS is unambiguous —
`src/polish.css:146` forces `.topbar .ib.av` to `var(--accent)` — so the current render is
correct and that baseline was a stale/transient capture (same geometry, verified by crop).
No product bug; recorded here as the reason that baseline changed.

| # | test | project | failing shot | cause | action |
|---|---|---|---|---|---|
| 1 | rooms list | 15 Pro | home.png | A | regen baseline |
| 2 | rooms list | SE | home.png | A | regen baseline |
| 3 | filter chips | 15 Pro | home-agents.png | A | regen baseline |
| 4 | filter chips | SE | home-agents.png | A | regen baseline |
| 5 | composer typed | 15 Pro | home-composer-typed.png | A | regen baseline |
| 6 | composer typed | SE | home-composer-typed.png | A | regen baseline |
| 7 | menu + palette | 15 Pro | home-menu.png | A | regen baseline |
| 8 | menu + palette | SE | home-menu.png | A | regen baseline |
| 9 | loading state | SE | home-loading.png | A | regen baseline |
| 10 | home row colour | 15 Pro | layoutContract (composer +8) | harness race, see §3 | settle-wait fix; shot then A → regen `room.png` |
| 11 | home row colour | SE | layoutContract (composer +5) | harness race, see §3 | settle-wait fix; shot then A → regen `room.png` |
| 12 | home row colour | desktop | layoutContract (composer +8) | harness race, see §3 | settle-wait fix (`room.png` matched as-is) |
| 13 | send→reply | 15 Pro | room-mention.png | A | regen baseline |
| 14 | send→reply | SE | room-mention.png | A | regen baseline |
| 15 | send→reply | desktop | room-mention.png | A | regen baseline |
| 16 | empty welcome | 15 Pro | room-empty-welcome.png | A | regen baseline |
| 17 | empty welcome | SE | room-empty-welcome.png | A | regen baseline |
| 18 | files sheet | 15 Pro | room-files-sheet.png | A | regen baseline |
| 19 | files sheet | SE | room-files-sheet.png | A | regen baseline |
| 20 | files sheet | desktop | room-files-sheet.png | A | regen baseline |
| 21 | light theme | 15 Pro | home-light.png | A | regen baseline |
| 22 | light theme | SE | home-light.png | A | regen baseline |
| 23 | light theme | desktop | room-light.png (home-light matched as-is) | A | regen baseline |
| 24 | glass theme | 15 Pro | home-glass.png | A | regen baseline |
| 25 | glass theme | SE | home-glass.png | A | regen baseline |
| 26 | glass theme | desktop | room-glass.png (home-glass matched as-is) | A | regen baseline |
| 27 | unknown route | 15 Pro | not-found.png | A + stale transient avatar (see above) | regen baseline |
| 28 | unknown route | SE | not-found.png | A | regen baseline |

Paired second shots refreshed in the same update (never reached pre-update because the test
stops at the first mismatch; each verified A by old-vs-new-baseline blur analysis or the same
AA signature): `home-projects.png` ×2 phones (hotspot crop = chip text AA, identical chips),
`home-palette.png` ×2 phones (blur-6 residual ~nil), `room-after-reply.png` ×3 projects,
`room-light.png` / `room-glass.png` ×2 phones.

A = anti-aliasing / font-hinting only, same layout/elements/colours. **Zero (B).** Ratios 0.02–0.06,
all same-pixel-size pairs.

## 3. Composer finding (the 3 `composer docked to the bottom` failures)

- Where: `e2e/visual.spec.ts:51`, only in test `room › home row colour matches the room header`
  on all 3 projects (gaps measured: +8 / +5 / +8 px, composer **below** the viewport edge).
- Real cause: **harness measurement race, not a product docking bug.** That test is the only one
  that client-side navigates (home → click room row → assert immediately). On mount, `.main > *`
  plays the intentional 0.2 s `pageFadeIn` enter animation (`src/index.css:372`, from
  `translateY(8px)`), so the whole chat column — composer included — is up to 8 px low for
  ~200 ms. Live probes: composer bottom 905–908 at T0, exactly 900 (= vh) from ~+1 s on.
  Steady state is docked on all projects; direct-load room tests never failed.
- Contributing wart (not changed): `src/polish.css:32` (`.main > * { animation: none }`) is dead —
  it loads via `@import` at the top of `src/index.css`, so `index.css:372` later in the same file
  wins at equal specificity. Harmless while the enter animation is intended; flagging so a future
  edit doesn't assume polish.css owns that rule.
- Fix: `e2e/visual.spec.ts` `layoutContract()` now waits (≤5 s, `waitForFunction`) for the
  composer to read docked before measuring, with the reason as a code comment. Tolerance `<= 1`,
  `maxDiffPixelRatio`, and all tests untouched. A genuinely undocked composer still fails: the
  wait times out and the original assertion runs on the real values.
- Not `100vh`/`100dvh`, safe-area, scrollbar, or `visualViewport`: shell is `100dvh`,
  `innerHeight === visualViewport.height` on all projects, safe-area padding is inside the
  composer, no sideways scroll.

## 4. Final runs (post-`e2e:update`)

- `npm run e2e:update` → `36 passed (44.7s)`
- Verify 1 → `36 passed (42.0s)`
- Verify 2 → `36 passed (41.5s)`

No flakes across 5 consecutive full runs. No test-waiting changes needed beyond §3.

## 5. Coverage gaps (ranked by likelihood Patrik notices a break)

1. **Auth / sign-in page** (`src/routes/Auth.tsx`) — zero tests; first thing Patrik touches.
   Offline-capable (mock has local fallback), so testable.
2. **New-room flow** (`Home.tsx:140,169,189` — `+` button, composer-created rooms, agent rooms)
   — zero tests; core loop.
3. **File upload** (paperclip → `generateUploadUrl`/`uploadFile`, `Chat.tsx:158-161`) — only the
   files *sheet* is tested, never an upload; failures silent (`catch {}`).
4. **Message send failure state** — `handleSend` has no error path; offline/denied send is
   untested and has no UI at all.
5. **Settings + integrations** (`Settings.tsx`, incl. avatar/usage/sign-out) — zero tests.
6. **Email tab** (`Email.tsx`, 582 lines, own avatar/row system) — zero tests.
7. **Theme cycle dark→light→glass on every route** — only home+room per theme; Files, Settings,
   Email, Auth, Onboarding, Tracker, Notifications never screenshotted in any theme.
8. **Palette with a query** — palette opens but no search text, no result tap, no empty-results.
9. **Empty room list** (`Home.tsx:222-224` "No rooms yet") — zero tests.
10. **Room loading skeleton** (`MessageSkeleton`, `audit_loading` only covers home) — zero tests.
11. **Long-message wrapping** — seed data contains a long identifier and it wraps, but no
    assertion pins `word-break`/overflow on bubbles.
12. **Keyboard-open composer on mobile** — no test (needs `visualViewport` resize emulation).
13. **Tablet-width layout** — no project between 390 px and 1440 px.
14. **Onboarding, Tracker, Notifications, Files routes** — zero tests each.

## 6. First impressions (viewed this Mac's renders; no fixes this round)

- Desktop `room.png` / `room-empty-welcome.png`: short threads are top-anchored, leaving a
  ~400 px dead void between the last message and the composer — the emptiest screen in the suite.
- Everything else viewed (SE home + room + files sheet, 15 Pro home-light + menu + palette +
  not-found, desktop room-glass) reads clean: no clipped text, no overlaps, contrast and row
  alignment hold on 320 px. Chips-row end-clipping and files-sheet filename ellipsis are
  by-design scroll/truncation patterns, not defects.

## 7. Commit

`test(e2e): R0 macOS baselines + composer docking — corner:corner-smooth-loop` on main, staged
only `e2e/__screenshots__/` (38 regenerated PNGs) + `e2e/visual.spec.ts` (settle-wait + comment).
No push. Report left uncommitted for the orchestrator. Vite server killed (`lsof -ti :5173`).
