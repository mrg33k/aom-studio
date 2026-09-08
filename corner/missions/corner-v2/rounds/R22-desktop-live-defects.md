# R22 — desktop live defects L010–L013 (fixed and locked)

Mission `corner:corner-v2`. Builder for the desktop web, headless, no questions asked.
Worktree `corner-v2-integration`, branch `codex/corner-v2-integration`, never pushed.
Final preview: **https://corner-v2-integration-4ncpfi4nz-aheads-projects-d2a4c70f.vercel.app**
Commit: `b62ff33` (17 files, on top of `9ec05be`; brief allowed HEAD `9c46546` or later).

All four rows reproduced on the live preview first (R18 preview `…-q2agw9a23-…`,
test account from `/tmp/corner-v2-e2e.env`), fixed in `src/v2/*`, one offline test
per row in `e2e/visual.spec.ts`, redeployed, all gates green.

## L010 — long threads arrive scrolled past the last message (blank arrival view)

Before (live `…-q2agw9a23-…`, thread `vd78v5tf…`, 7 messages):
`{"msgCount": 7, "scrollTop": 824, "scrollMax": 828, "lastMsgBottom": -40,
"lastMsgAboveFold": 940}` — scrolled to max, last message 940px above the fold.
Evidence `rounds/evidence/R22-live-before-L010-arrival.png` (blank thread, composer only).

Root cause: `V2Thread` called `bottomRef.scrollIntoView()` with default
`block:"start"` on every render-count change. The thread carries 70vh of bottom
padding (HANDOFF §6 fresh-turns), so the anchor sits ~630px above the content
bottom and every scroll overshoots into the padding void.

Fix (`src/v2/ConversationSurface.tsx`, `src/v2/conversation.css`): the scroll
container is now anchor-driven — arrival pins with `block:"end"` (newest in
view, no overshoot); streaming re-pins only while pinned (anchor within 120px
below the viewport bottom); scrolled-up arrivals never yank and instead raise a
`[data-testid="new-messages"]` accent pill ("↓ New messages", token-styled)
that re-pins on tap. Reduced-motion keeps `behavior:"auto"`.

After (live `…-4ncpfi4nz-…`, same thread):
`{"msgCount": 7, "scrollTop": 297, "scrollMax": 929, "lastMsgBottom": 487}` —
newest message mid-viewport on arrival.
Evidence `rounds/evidence/R22-live-after-L010-arrival.png`.
Offline lock: `R22 desktop live defects / L010` in `e2e/visual.spec.ts`
(arrival + streaming pin + scrolled-up pill + pill re-pin, behind the new
`audit_long_thread` fixture flag in `scripts/audit/fixtures.ts`).

## L011 — step-only events paint as blank rows

Before: R20/R21 bridge `step` events carry `{label}` only (`step_ev()` in
`scripts/v2-team-bridge.py`; backend `appendEventCore` stores the payload
verbatim as a `steps`-kind block), including the `FALLBACK_STEP` containment
"I couldn't finish that turn.". The client rendered `<StepsCard>` only when
`payload.steps` was an array, so every step-only turn — including the fallback —
painted avatar + name + time with no text. Live thread shows the same blank-row
class (`blankRowNames: ["System", "System"]` — see Still-off §4 for those two).

Fix (`src/v2/ConversationSurface.tsx` `stepsFor()`): any `steps`-kind payload
normalizes to card rows — `steps` array as before (string entries tolerated),
else the single `label` as one done row, so the label and the fallback always
paint; a `steps` kind with neither renders no card (no blank card either).

After: offline lock `L011` asserts the bridge-exact labels
("Reading the Aster brand kit and past threads", "I couldn't finish that turn.")
are visible and zero `.v2-msg` rows lack
`.v2-agent-text/.v2-user-bubble/.v2-options/.v2-steps/.v2-file`. Live has no
step-only turn on an reachable thread to screenshot (bridge threads unknown),
so live evidence is the after-thread shot `R22-live-after-L011-thread.png`
plus the offline lock against the exact bridge payload shapes.

## L012 — file-card titles in monospace

Before (live): `.v2-file-name` computed
`fontFamily: "Space Mono", ui-monospace, monospace; fontSize: 13px; fontWeight: 600`
(2 cards). Evidence `rounds/evidence/R22-live-before-L012-cards.png`.

Fix (`src/v2/conversation.css`): title is now the regular sans at 14.5px/600 —
exactly the design export's desktop card (`Corner v2.dc.html`: 40px badge r8,
`font-size:14.5px;font-weight:600` title, 12.5px `--muted` meta, kebab; card
60px r12 surface/hair). Note: brief text said "14/600"; the export template
says 14.5px — implemented the export value. Badge/meta/kebab already matched.

After (live): `fontFamily: "Hanken Grotesk", system-ui, -apple-system,
sans-serif; fontSize: 14.5px; fontWeight: 600`.
Evidence `rounds/evidence/R22-live-after-L010-arrival.png` (sans titles
"r22-walkthrough.mp4", "aster-brief.pdf" visible above the composer).
Offline lock: `L012` (sans family, 14.5/600, badge + muted meta + kebab).

## L013 — local video paints a ~60px strip; stage must be the full media area

Before (live, uploaded `r22-walkthrough.mp4` opened as a tab):
`{kind: video, stage: {h: 51}, frame: {h: 0}, video: null, bar: {h: 49}}` —
51px stage, 0px frame, control bar only.
Evidence `rounds/evidence/R22-live-before-L013-video.png`.

Root cause: `.v2-review-layout` (parent of every stage) had no `flex`, so the
stage sized to content height — and video/photo/youtube media are
absolute-fit (zero intrinsic contribution), leaving only the in-flow control
bar. PDF worked by accident (canvas has intrinsic size). Same collapse class
covers photo (`img` absolute) and youtube (`iframe` absolute).

Fix (`src/v2/visual-window.css`): `.v2-review-layout { flex: 1; min-height: 0;
min-width: 0 }` so the stage owns the leftover pane height; the 16:9 media
contain-fits inside (design `ArtifactStage.dc.html`: video/youtube `aspect()
return 0` = "fill whatever you are given"). Sheet (999px) and lightbox chains
already had their own heights and are untouched.

After (live, same thread/video tab): `{stage: {h: 729}, frame: {h: 678},
bar: {h: 49}}` — full media area. Evidence `rounds/evidence/R22-live-after-L013-video.png`.
Offline lock: `L013` (frame/element > 200px and covering the frame ±2px,
element dwarfing the bar, fixture `currentSrc`, photo `hero.png` > 200px;
intrinsic `videoWidth` deliberately NOT asserted — headless Chromium ships no
H.264 decoder so metadata never arrives there; the 640x360 fixture shape is
proven by `ffprobe stream,640,360`).

## Gates

| gate | command | output |
|---|---|---|
| lint | `npm run lint` | 0 errors outside git-ignored `.vercel/output` (4,321 errors all inside it, pre-existing build output; R18 reported 4,342 — count moves with rebuilds). 0 errors in the 5 changed files |
| types | `npx tsc --noEmit` | clean, no output |
| unit | `npx vitest run` | 19 files, 163 tests passed |
| desktop offline | `PW_PORT=5174 npx playwright test --output e2e/results-orch` | **87 passed** (83 prior + 4 new R22), 0 failed |
| design | `LIVE_BASE_URL=<new preview> npm run test:design` | exit 0 — `R18 visual gate: 0 screens failing, 0 UI rows failing.` (13 shootable corpus, 2 SKIP site/code unchanged) |
| live | `LIVE_BASE_URL=<new preview> npx playwright test --project live --output e2e/results-orch` | **8/11**: pass 01, 02, 04, 06, 08, 09, 10, 11; fail 05 (global routing — waits on the backend redeploy per brief), 07 (see Still-off §2); 03 self-skips (no agent wired on clone, in-file condition, untouched) |
| bundle | `curl` each preview JS chunk for `brilliant-scorpion-163` | main chunk `assets/index-CgJpdZXK.js` contains it (1 hit); preview points at the clone, not live |

Deploy: `VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud npx vercel
build --yes && npx vercel deploy --prebuilt --yes` from the worktree →
`https://corner-v2-integration-4ncpfi4nz-aheads-projects-d2a4c70f.vercel.app`
(build 1.84s; `vercel build` output clean).

Screenshot refs: 12 desktop refs re-pinned to the intended UI with
`--update-snapshots` after pixel-review (`corner-v2-wide/-boundary/-side-by`,
`home{,-light,-glass,-palette}.png`, `newroom-{agent,composer}.png`,
`palette-{query,empty}.png`, `room.png`). Every diff was the intended delta
only: thread tail in view instead of the padding void (L010), sans card titles
(L012), stage filling the pane (L013). Verified `corner-v2-wide` actual by eye
(site stage: chrome + full demo page + footer bar, no overlap) before re-pin.
Full suite re-run after re-pin: 87/87.

Punch list: L010, L011, L012, L013 → `fixed (R22)` with evidence paths.

## Commits (branch `codex/corner-v2-integration`, never pushed)

- `b62ff33` — R22: `src/v2/ConversationSurface.tsx` (anchor pinning + pill +
  `stepsFor`), `src/v2/conversation.css` (sans card title + pill),
  `src/v2/visual-window.css` (review-layout flex), `e2e/visual.spec.ts`
  (4 R22 tests), `scripts/audit/fixtures.ts` (`audit_long_thread` extras),
  12 re-pinned desktop refs.

## Still off and why (honest list; the goal was empty)

1. **Live 05 fails** — global routing; waits on the backend redeploy (deploy key
   pending, `convex/` untouched per hard lines). Pre-existing, per brief.
2. **Live 07 fails on `.v2-pin-layer` absence** — proven NOT an R22 regression:
   re-ran 07 alone against the pre-R22 preview (`…-q2agw9a23-…`) on identical
   backend state and it fails identically. Cause: uploaded artifacts
   (pdf/video) on the clone carry `src: null` (storage-URL resolution gap;
   backend, off-limits), so the pdf stage renders footer only with no canvas/
   pin-box. Needs the clone redeploy, not a desktop change. (Side effect: that
   A/B run overwrote `rounds/evidence/R8-live-07-tabs-open.png` with current
   state via the suite's own `shot()` path.)
3. **Uploaded media has `src: null` on the clone** (video element absent even in
   the fixed 729px stage; wireframe fills it instead). Same backend gap as §2;
   offline (real `src`) the video/photo elements fill the frame per the L013 lock.
4. **Two blank `System` rows remain on the live test thread** — not
   step-shaped (`kind` never `steps`), so outside L011's letter; likely
   non-text block kinds the client intentionally doesn't render (looking/status
   surface in the Visual Window, not the thread). Left untouched; flagging for
   the next live-lane round to identify the kinds before anyone paints them.
5. **L011 has no live after-shot of a true step-only turn** — no reachable live
   thread carries bridge step blocks. Locked offline against the exact
   `step_ev`/`FALLBACK_STEP` payload shapes instead.
6. **Design-vs-live script still prints its `R18` gate label** (`R18 visual
   gate: …`) — cosmetic; the gate itself ran against the R22 preview, exit 0.
7. `room.png` offline ref was stale since R5 (`4129ce5`) yet inside the 1%
   tolerance of the clean render — worth knowing, not a defect: the re-pin
   brings it current.
