# R43 — desktop visual window opens (L034–L036): the thread keeps its place and the composer keeps its shape

Mission `corner:corner-v2`. Worktree `corner-v2-integration`, branch
`codex/corner-v2-integration`, commit `73f211d` (scoped, 8 files,
+328/−20, not pushed). Preview:
https://corner-v2-integration-ibz5d5gus-aheads-projects-d2a4c70f.vercel.app
(bundle `index-9XCnvGkz.js`, served = built; bundle references
`brilliant-scorpion-163` 1×, `neat-pony-216` 0× — prebuilt deploy,
`VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud` +
`VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site`, never
`--prod`). `convex/` untouched. `neat-pony-216` untouched.

Reads first: `LOOP.md`, `rounds/R41-desktop-follow-the-reply.md` (extended),
the brief's walk shot (`/tmp/img-walk-50s.png`, copied to `rounds/evidence/`
as `R43-before-50s-production.png`, the before-half of the pair below).

## Root cause (one sentence each)

- **L034:** opening the Visual Window narrows the thread column mid-turn, and
  in production that shift aborted the arrival's in-flight smooth pin —
  freezing the gap ref unpinned though nobody scrolled — so the next arrival
  raised the pill over a last row sitting under the composer. Proven with an
  instrumented scroll trace (temporary logging, removed after): the shift
  fires a scroll event mid-flight, the gap samples read ≥120, `atBottomRef`
  sticks false, the step's follow effect takes the pill branch.
- **L035:** at the photo/pdf splits the bar's min-content (~280px: paperclip
  + command chip + 77px Record + agent label + send) exceeds the ~240px pill,
  so the send wrapped to its own row. R18's tightening was ~3px short on
  real text, which is why production still wrapped after R18.
- **L036:** the photo and document stage footers carried this round's
  placeholder copy ("Add pages slots are static this round.") instead of the
  design's per-kind empty hints.

## What shipped

- **Pin survives layout shifts** (`src/v2/ConversationSurface.tsx`): a
  `userUpRef` that is set ONLY by an upward scroll the person drove (our own
  pins only ever travel down, so a decreasing scrollTop is never ours) —
  never by arrivals, reflows, or aborted smooth flights. The thread column's
  WIDTH is observed (ResizeObserver; height moves on every arrival and must
  never re-pin by itself) plus the Visual Window open/close; on a size change
  with `userUp` false the view re-pins instantly with no pill, and the
  shift's own scroll event is ignored for one frame (either callback order
  reads as still pinned). A reader mid-thread is never yanked. The follow
  effect now pins on `atBottom || !userUp`: a frozen-unpinned gap after an
  aborted flight still follows instead of pilling; send / pill-click / mount
  all clear `userUp`.
- **Measured composer compaction** (`src/components/Composer.tsx`,
  `conversation.css`): a ResizeObserver on the composer's own pixels sets
  `data-compact` below 360px (photo 296 / pdf 310 compact; default 418 and
  closed 417 keep the full bar — measured, not viewport). Compact hides the
  target label (it lives in the placeholder: "Tell \<project\> what to make
  next") and the command-chip text; the send button moved INSIDE
  `.v2-composer-bar` as its last item with `nowrap`, so it can never wrap.
  The agent label also shrinks with ellipsis at all widths, so long project
  names can't push the send down at 418 either.
- **Design footers** (`src/v2/ArtifactStage.tsx`): photo
  "Click the image where something should change.", document
  "Click the document to pin a change." — both verbatim from the export's
  `emptyHint` map. Neither stage has page slots, so no slot copy was needed.
- **Offline proof** (`e2e/visual.spec.ts`, "R43 visual window opens", 2
  tests): L034 opens a photo tab mid-turn (DOM click — a pointer click's
  actionability scroll would re-pin a frame before the shift and mask the
  bug) and asserts the newest row fully above the composer with no pill at
  open/step/reply; L035 asserts one-row geometry (send shares the bar row,
  send inside the pill) plus compact visuals at 1440/1280/1024 photo splits,
  the brief's 420px COLUMN resize (grid override, not viewport), tray fit +
  inset tracking at 420px with `/clear` armed, and both footers (photo via
  tab, document via paperclip `.txt` upload → kind document).
- **Snapshots regenerated** (3 PNGs): `corner-v2-wide/-wide-boundary/
  -side-by-boundary.png`. They were R22-era and already drifting inside the
  1% budget (R26 Ready header, R38 tab-× removal); the R43 rest position
  (+~25px from the re-pin cascade) pushed them over. New baselines verified
  by eye: bottomed thread, Ready header (correct per R26), one-row composer,
  icon+label tabs, no pill.

## Before / after (1440, window open)

| | before (production walk) | after (stand-in `R43-after-1440-window-open.png`) |
|---|---|---|
| thread | `R43-before-50s-production.png`: pill over the last row, row cut under the composer | step + reply fully above the composer, no pill, header Ready |
| composer | send arrow wrapped to its own row | one row: paperclip, sparkle, Record, send — label in the placeholder |
| footer | "Add pages: slots are static this round." | "Click the image where something should change." + Expand |

## Gates (all run in the worktree / against the preview, final tree)

| command | output |
|---|---|
| `npm run lint` | 0 errors, 11 warnings (all pre-existing, none in R43 lines) |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | 27 files, 202 passed |
| `PW_PORT=5174 npx playwright test --output e2e/results-orch` | **125 passed, 0 failed** (EXIT=0; 123 at R41 + 2 R43) |
| `LIVE_BASE_URL=<preview> npm run test:design` | 0 screens / 0 UI rows failing |
| `LIVE_BASE_URL=<preview> npx playwright test --project live` | 11 passed, 0 failed |

TDD note (LOOP hard line 5): both R43 tests fail on the old tree and pass
on the new one. L034 failed as `new-messages count 1, expected 0` on the
post-open step arrival (the exact production symptom); L035 failed on
`data-compact null, expected "1"` plus the design footer text. (One
procedural wrinkle: the L034 fail-first needed a DOM click — see "for the
orchestrator" 1.)

## Commits (scoped, none pushed)

- Worktree `73f211d` (8 files, +328/−20):
  `src/v2/ConversationSurface.tsx` (userUp tracking, width + open/close
  re-pin, follow-effect OR), `src/components/Composer.tsx` (compact RO,
  send-in-bar, record label span), `src/v2/conversation.css` (compact
  rules, label ellipsis), `src/v2/ArtifactStage.tsx` (photo + document
  hints), `e2e/visual.spec.ts` (R43 ×2),
  `e2e/__screenshots__/desktop/corner-v2-{wide,wide-boundary,side-by-boundary}.png`
  (regenerated, verified by eye).
- Note: `f786c47` (R44 backend ask, `convex/v2Visual.ts` only) landed on the
  branch mid-round; it cannot affect the offline suite (stand-in never reads
  `convex/`) and this commit sits on top of it.
- Left alone on purpose: `convex/*`, `.vercel/` (ignored), `dist/`
  (ignored), `e2e/results-*/` (generated), `/tmp` probes (deleted:
  `probe.spec.ts`, `probe2.spec.ts`, `r43-shots.spec.ts` were worktree-temp
  and are gone; logs under `/tmp` only). `httprobe.tmp.mjs` (untracked,
  pre-existing, not mine) untouched.
- Mission folder (this report + `rounds/evidence/R43-before-50s-production`
  and `R43-after-1440-window-open.png`): uncommitted, left for the
  orchestrator (R38/R39/R41 precedent).

## For the orchestrator

1. **Test-hygiene finding (worth keeping):** Playwright pointer clicks
   scroll the target into view first. Clicking "Open hero.png" that way
   re-pinned the thread a frame before the layout shift and the L034 test
   PASSED on the buggy tree. The test uses a DOM `.click()` via evaluate
   (identical React handler path, zero scrolling) with a comment saying why.
   Any future pin/shift test must do the same — a pointer click is not a
   neutral open.
2. **Contract decision — brief parenthetical vs P107 (design law).** The
   brief prescribed "icon-only Record" for the compact pill, but P107
   (R18, gated) locks the Record chip at 77.3x28 on exactly these splits —
   the first preview gate run failed 2/2 rows on it (`composer.record-chip`
   77.3 vs 29). I kept Record full and compact harder on the label side
   (target label + command-chip text hidden), which frees MORE room (bar
   ~198px in a ~240px pill) and passes 0/0. If you would rather have
   icon-only Record anyway, it is a 4-line CSS revert — but then P107's row
   needs rewriting and the design gate stops being green.
3. **Preview `…-ibz5d5gus-…` is up and green** (design 0/0, live 11/0);
   production redeploy remains Patrik's call as usual. (Two preview deploys
   exist — `…-o5ax902u0-…` from the pre-P107-adjustment tree plus this one;
   same recipe, no `--prod` either time.)
4. **1280-closed compacts too, by measurement.** At 1280 the empty visual
   pane squeezes chat to ~340px, so the pill compacts there (Record stays
   full, label hides into the placeholder). Only 1440 is design-gated and it
   keeps the full bar. No gate covers 1280-closed either way; flagging so it
   reads as measured behavior, not drift.
5. **Native may carry the same bug class.** If the iOS thread view follows
   by gap/offset rather than by deliberate-scroll tracking, a sheet open
   (84% drawer, half/full detents) can release its pin the same way. Worth
   one line in the next native brief; not verified here (desktop round).

## Still off and why (non-empty, all disclosed)

1. The gate e2e ran three times on near-final trees, not once: the first
   full run (125 green) preceded the P107 adjustment (CSS + spec only);
   targeted R43 re-runs went green; the final full gate (EXIT=0, 125 green)
   is on the committed tree. No snapshot was regenerated after the P107
   adjustment — verified unnecessary (site-split composers never compact;
   the full run confirms).
2. The regenerated snapshots bake a synthetic rest position (~111px above
   max): Playwright's click actionability scroll completes to a stale target
   after the widen shift (traced: clamp `[1062,1062]` then one tick to 953
   16ms later, identical with scroll anchoring on and off). A human opening
   tabs performs no pre-scroll, so nothing stale exists to complete — the
   human path is what the R43 L034 test locks (pinned, no pill, green 3×).
   If these snapshots ever flap, that cascade is the first suspect.
3. `userUp` keys off scroll DIRECTION (up-moves while unpinned). A wheel
   that lands exactly inside the one-frame shift-suppression window reads as
   shift, not as the person — the pin holds one arrival longer than it
   should. Single-frame race, accepted; the next scroll releases normally.
4. The DocStage footer ("Click the document to pin a change.") rides the
   same fix but has no design-gate row (the gate has no document state); it
   is locked by the R43 e2e upload-then-open path instead.
5. No live send was made from this round (no walk). The after-shot is the
   offline stand-in at 1440, not production pixels. Nothing was written
   anywhere but the worktree, the preview deploys, and this mission folder.
