# R38 — desktop pixel pass (L027–L029): production details the gate did not see

Mission `corner:corner-v2`. Worktree `corner-v2-integration`, branch
`codex/corner-v2-integration`, commit `9be9463` (scoped, not pushed).
Preview: https://corner-v2-integration-hcv22vmj1-aheads-projects-d2a4c70f.vercel.app
(`VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud`,
`VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site`,
prebuilt deploy — `vercel build` then `vercel deploy --prebuilt`, never
`--prod`). Backend (`convex/v2Workspace.ts`) is fixed in the worktree but
NOT deployed — no deploy key on this machine (see "for the orchestrator").
`neat-pony-216` untouched.

Reads first: `LOOP.md`, `rounds/R30-desktop-composer-wiring.md` (extended —
its B1/B2, L023–L026 behavior and gates hold, see below), `punch-list.md`
(L027–L029 appended after L030 — the brief's "last row is L026" was stale;
C010/L030 landed concurrently and were left alone).

## Gates (all run in the worktree)

| command | output |
|---|---|
| `npm run lint` | 0 errors, 11 warnings (all pre-existing; verified none point at R38 lines — the nearest is the legacy `auth.tsx` session effect) |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | 25 files, 195 passed (was 187 in R30: +8 R38 — 6 display-name units, 2 surface-label convex-tests) |
| `PW_PORT=5174 npx playwright test --output e2e/results-orch` (desktop) | final run: **118 passed** (115 R30 + 3 R38). First run: 117 + 1 fail — the fail was mine (see §"Still off" 4), fixed, re-ran clean |
| `LIVE_BASE_URL=<preview> npm run test:design` (full 15-screen) | 7 screens failing, 7 UI rows failing — **all 7 are the same row**: `thread.sender-clean` (server-side, needs the convex deploy). Every other new anchor passes live; every pre-existing row still passes (login/setup/new/settings green; site/code SKIP, as before — no UI path without an agent) |
| `LIVE_BASE_URL=<preview> npx playwright test --project live` | 11 passed, 2 skipped (same two pre-existing conditional skips as R30 — 03 needs-you with no question block, 07 deferred with no email/tracker artifact). **07's drag reorder ran before its skip point, so the drag path is live-verified** |

## Before / after per row

- **L027 sender + time** — Before (`R18-work-visual-pdf-live.png` in
  `/tmp/r18-vs-prod/`, crop `rounds/evidence/R38-before-L027-header.png`):
  `corner-v2-e2e+20260906t201253` with `11:26 PM` wrapping to two lines;
  footer `corner-v2-e2e+202…`. After (fresh `R18-work-visual-pdf-live.png`,
  crop `rounds/evidence/R38-after-L027-header.png`): times are `h:mm`
  (`11:26`, `11:27`, `12:16`), single-line, right of the name; footer says
  `You`. Rule implemented once per surface: profile first name when the
  account has one (settings display name, then account name — first token;
  a stored name byte-equal to the account's email local part is the sign-up
  default, not a name, and is rejected like any `@`/`+` label), otherwise
  the viewer's own messages say `You`, anyone else's `Someone`. Server
  (`getConversationSurface`, blocks + legacy links) so web and native agree
  from one fix; client optimistic send + footer use the same rule
  (`firstNameOf`/`viewerLabel` in `src/lib/session.ts`). The leftover dirty
  thread rows on the preview are the OLD backend's labels — they flip to
  `You` on the convex deploy (proven by `surface-labels.test.ts`, which runs
  the real query through convex-test).
- **L028 tab chrome** — Before (`/tmp/prod-tabstrip-zoom.png`): `×`
  half-outside the top-right corner, `‹ ›` hanging below the bottom edge
  onto the strip border. After (`rounds/evidence/R38-after-L028-tabstrip.png`,
  plus the fresh full PNGs): icon + label only at rest; close on hover
  inside the tab's reserved right padding (label shortens 180→150px, tab box
  byte-identical); reorder is a drag onto the target index (same
  `reorderTab`, arrows deleted — `expect(.v2-chip-move).toHaveCount(0)`
  locks it). At rest a tab is exactly the design's. One behavior change with
  a cited reason: the close is `pointer-events: none` at rest, so a click
  test (and a click) must hover the chip first — otherwise the invisible
  control swallows tab clicks (proven while building: an overlay close ate
  the tab-activate click on narrow tabs). Three e2e sites updated to
  hover-first; reorder tests converted to `dragTo`.
- **L029 search** — Before (crop `rounds/evidence/R38-before-L029-search.png`):
  `Search`, no hint. After (crop `rounds/evidence/R38-after-L029-search.png`):
  magnifier + `Search` + right-aligned muted `⌘K`, exactly the design row;
  ⌘K/Ctrl+K focuses the field (verified in e2e with both Meta and Control).
  Two deliberate calls: (1) no `/`-to-focus — the design notes (HANDOFF §7)
  call Search a static field and never mention `/`, so the brief's
  conditional is not met; `/` still opens the palette. (2) `App.tsx`'s
  ⌘K-to-palette toggle is deleted — ⌘K belongs to the field now; the old
  R27 parity test is updated to `/-opens-palette, Cmd+K-focuses-search`.
  The conflict was real: both handlers fired and the palette's autofocus
  stole the field's focus 8ms later (traced with focusin timestamps).

Re-shoots at 1440 (`R18-work-live.png`, `R18-work-visual-pdf-live.png`,
`R18-work-visual-photo-live.png`, all eyeballed against their `-design.png`):
thread times single-line h:mm on all three; tabs icon+label at rest (the
visible × in two shots is the gate mouse resting on the strip after
switching tabs — the hover state, correctly inside the box); search row
matches the design. Remaining delta on all three is the server-label rows
(L027 backend half) plus data (agent replies, counts) — no UI rows.

Gate anchors (all five would have failed before, all five pass after —
measured with the actual gate functions, dirty e2e-shaped session,
`/tmp/r38-anchor-proof.mjs`):

| anchor | pre-fix | fixed |
|---|---|---|
| `sidebar.search-hint` | absent on live | ⌘K = ⌘K |
| `visual.tab-chrome` | outside:Close Aster brief.pdf | inside |
| `thread.sender-clean` | corner-v2-e2e+… | clean |
| `thread.time-format` | 11:23 PM | h:mm |
| `thread.time-singleline` | wrapped:37 | single |

(`wrapped:37` is the production two-line time reproduced to the pixel.)

## Commits (scoped, none pushed)

- Worktree `9be9463` (15 files): `convex/v2Workspace.ts` (label rule),
  `src/lib/session.ts` (helpers), `src/v2/ConversationSurface.tsx`
  (fmtTime, optimistic label), `src/v2/conversation.css` (ellipsis+nowrap),
  `src/v2/WorkspaceSidebar.tsx` (footer via the rule),
  `src/v2/VisualWindow.tsx` + `visual-window.css` (tab chrome + drag),
  `src/v2/GlobalInput.tsx` + `workspace.css` + `src/App.tsx` (search),
  `scripts/design-vs-live.mjs` (5 anchors both sides),
  `e2e/visual.spec.ts` (R38 ×3, keyboard test, hover-first + drag updates),
  `e2e/live.spec.ts` (07 drag), `tests/v2/display-names.test.ts` +
  `tests/v2/surface-labels.test.ts` (new).
- Left alone on purpose: `convex/*` except `v2Workspace.ts`, `.vercel/`,
  `e2e/results-*/` (generated), `/tmp` probes (kept at
  `/tmp/r38-anchor-proof.mjs`, deleted the worktree copies).
- Mission folder (this report, `rounds/evidence/R38-*` crops + refreshed
  `R18-*` gate output, `punch-list.md` L027–L029): **uncommitted, left for
  the orchestrator** — the repo has concurrent uncommitted rows (C010, L030)
  and the gate refreshed the shared R18 evidence; no scope in the brief to
  commit there.

## For the orchestrator

1. **Convex deploy needed (the one thing blocking 0/0).** Deploy the
   worktree's `convex/` to the preview backend (no key on this machine).
   Then `thread.sender-clean` goes green everywhere and the gate reads 0/0
   — the post-deploy label shape is already proven by
   `tests/v2/surface-labels.test.ts` (You/Someone/first-name through the
   real `getConversationSurface`) and the offline anchor proof (5/5 pass).
2. **Native gets L027 free.** It reads `authorLabel` from this same surface,
   so the one server fix covers both — no native change, no native test
   touched.
3. Worktree commit `9be9463` is scoped and unpushed (never `--prod`, never
   touched `neat-pony-216`). Mission files intentionally uncommitted (above).

## Still off and why (non-empty, all disclosed)

1. L027 thread history on the preview still shows the email local part until
   the convex deploy (§"for the orchestrator" 1). The new CSS keeps it to
   one ellipsised line meanwhile — no wrap anywhere.
2. Touch devices: the hover-only close has no tap affordance (no press state
   designed). Desktop-web brief scope; a tap-to-reveal pass would be new UI.
3. Micro-flicker: with a settings display name set but a stale session name,
   the optimistic send can read `You` until the server echo paints the
   profile name. One render beat, self-healing.
4. The offline suite ran twice, not once: the first full run (117+1) caught
   a real interaction — the pre-existing sheet test clicked Close without
   hovering, which hover-only chrome correctly rejects. Fixed the test,
   solo-verified it, then ran the full gate run (118 green). Targeted
   drag/keyboard/R38 probes ran separately on scratch ports beforehand.
5. Tabs rest ~18px wider than the export (the close zone is always reserved
   so the hover close never overlaps the label or eats tab clicks). No width
   row gates it; the alternative — an overlay close — swallowed real tab
   clicks on narrow tabs during this build.
6. `thread.time-singleline` passes at gate width even pre-fix when the
   sender name is short (it guards the wrap property, which only manifests
   with long names — reproduced as `wrapped:37` in the proof). It is a lock,
   not a detector, at 1440.
