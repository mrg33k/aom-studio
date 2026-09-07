# R40 — native window-and-scroll: newest 200, bottom landing, web quotes

`corner:corner-v2` · BUILDER (native iOS) · 2026-09-07 · mission
`corner/missions/corner-v2/` · extends R32 (its §Still off: no autoscroll-to-bottom; plus P082, L030-native).

Backend taken as deployed on the clone (`brilliant-scorpion-163`): `v2Native.threadEvents`
takes `limit` (newest N) and reads `after` off the indexes (`6ed6de7`); native text blocks
carry `replyTo {messageId, sender, snippet}` (`a4fc532`).

## Rows before → after

Windowed first load (L030-native).
Before: the phone's first load asked for everything — on the tester's Wolfpack thread that
was a 2,945 ms / 1,488-row read before first paint, re-read in full on every foreground.
After: first load asks `limit: 200` (`ConvexEndpoint.v2ThreadEvents` passes `limit: 200`
when there is no `after`; polls keep `after` and never pass a limit). "Earlier messages"
offers at the top when exactly the window's rows came back (the web's `v2-earlier` twin:
12.5px semibold faint, centred, quiet) and grows the window +200 per tap with the scroll
held on the previously-first row; a failed expansion reverts so the row stays for retry.
Read-only measurement on the tester's Wolfpack thread this round: full 2,945 ms / 1,488
rows → `limit: 200` 727 ms / 200 rows → `limit: 400` 1,072 ms → `after` 281 ms / 168 rows.
Evidence: `R40-earlier-expanded` (flow UI), unit (endpoint args, start-200, full/partial
window, expand+merge, failure-revert, reset, refresh-keeps-window).

Bottom landing + new-messages pill (R32 §Still off, L032-native).
Before: a fresh launch rested at the top of a long thread, so live delays looked like
missing messages; nothing followed, no pill.
After: first paint snaps to the bottom; every send pins there (the model bumps
`sendSequence` on all send paths — composer, option taps, review carry-on — and the
view pins on it); arrivals while scrolled up raise the R22-style "New messages" pill
(tap re-pins) and never yank the read. The follow is keyed on the newest/first row id
(`V2FollowState`), never on count — the web's R41 root cause, unit-pinned: constant
count + new newest id still follows; same newest id never moves.
Evidence: unit (first-paint snap, R41-trap, pill, pin, unpin, reopen), flow UI
(expansion leaves the thread; landing/pill by construction of the same path).

Cross-device quotes.
Before: the client re-attached the just-sent quote to the matching server event by
exact-text match (`pendingQuotes`/`reattachQuotes`) because `threadEvents` blocks did
not carry `replyTo`.
After: the server field is the only source of truth — decode from the text block
(`ThreadEvent.replyQuote`, pinned since R32) renders it, the echo carries it for the
instant paint, the re-attach is deleted. A server event with no `replyTo` stays
quoteless even on exact-text match (unit-pinned).
Proof web → phone: quoted Paige on the design thread as the e2e account through the
web's own `v2Native:send` (`threadId` + `replyTo`); the stored block carries
`replyTo {messageId, sender, snippet}` top-level; the phone renders the quote card on
the quoted bubble (`R40-web-quote-on-phone.png`, throwaway `R40QuoteProofUITests`,
deleted before commit). The demo brain answered the proof send (3 Paige rows below
it); the proof row + card sit above them. One write, disclosed; the row stays on the
design thread like R32's probe rows.

P082 — tab chrome at rest.
Before: every sheet tab showed a `×` at rest (`R40-P082-before-sim402.png`, from
`/tmp/sim402.png`).
After: icon + label only; close by swipe-to-delete on the tab or the long-press
"Close Tab" menu (iOS idiom), never a visible ×. The gate carries a `forbidden:
["visual-close"]` anchor on sheet-half + sheet-full (fails on the pre-fix strip,
passes now); `testTabStripShowsNoCloseAtRest` locks it in the suite (no close chrome
at rest, long-press still closes).
Evidence: gate sheet-half/sheet-full rows, `R19-native-sheet-half-sim-390.png` pair.

iPad column.
ComposerParity + R32Wiring green on `iPad Pro 13-inch (M5)`.

## Gates

- Unit: `CornerTests` 486/486 green on the 390 sim (465 carried + 20 new
  `R40NativeWindowTests` + 1 new quoteless test in `R32NativeWiringTests`).
- UI, each suite alone (the runner dies with "signal kill" under load):
  CompMatch 45 (1 skip), DesignMatch 5 (2 skip), VisualWindow 8/8 (incl. new
  P082 test), CornerV2Flow 12/12 (incl. new Earlier test), ComposerParity
  14/14, R32Wiring 8/8 — 0 failures everywhere.
- `node tools/native-design-vs-sim.mjs` exit 0, 68/68 checks pass — TWICE.
- iPad (`iPad Pro 13-inch (M5)`): ComposerParity 14/14, R32Wiring 8/8.

## Commits

- `b4ff0945` on aom-studio (never pushed): R40 sources + regenerated
  `project.pbxproj` (xcodegen picks up `V2FollowState.swift` +
  `R40NativeWindowTests.swift`) + R40 evidence PNGs (`R40-P082-before-sim402`,
  `R40-web-quote-on-phone`, `R40-earlier-expanded`) + P082 flip (that one
  line only — the punch-list's sibling-round rows stay uncommitted).
  Scoped paths only; this report follows as the docs commit.
- The live-proof UI test (`R40QuoteProofUITests`, throwaway by design) was deleted
  before the commit; xcodegen re-ran after the delete so the committed pbxproj never
  references it. The `/tmp/r19-diag-env.json` creds handoff was removed after the proof.

## For the orchestrator

Phone reinstall. Nothing to install to a device (simulators only, per the brief); the
build is the committed source — reinstall = rebuild + run.

Reads to expect on the clone: first load `limit: 200` (~0.7 s on Wolfpack today),
polls `after` (~0.3 s), Earlier taps 400/600/… (~1.1 s at 400). No backend ask from
this round — `limit`/`after`/`replyTo` all behaved as specified.

## Still off and why

- Scroll-hold on "Earlier messages" is mechanism-proven (re-anchor to the held first
  id) but not pixel-proven: no AX hook reads scroll offset, so the UI test locks the
  expansion (window grows, thread stays) while the hold itself is code-reviewed, not
  screenshotted.
- The pill was fixture-proven by state (unit) and renders the legacy pill's twin;
  a live long-thread arrival raising it on-device was not screenshotted (needs a
  200+ row live thread + a second writer; the fixture suite covers the logic).
- The design thread keeps this round's proof row (`R40 web->phone quote proof…`
  quoting Paige) plus the demo brain's 3-row answer — user text the cleanup mutation
  cannot remove (`removeStrayStep` covers step cards only). Harmless; disclosed.
- First paint ≈ query + decode/render: the report's ms are the read (server-side);
  client render of 200 rows is bounded by construction (was 1,488).

## R40b finish

`corner:corner-v2` · BUILDER (native iOS) · 2026-09-07 · finishes the R40
round above: its two red UI tests, its PENDING gates, its commit. The R40
tree was kept as found — nothing discarded, nothing rewritten.

Two fixes, both green for the right reason.

1. `testReplyQuote` (ComposerParity): the fixture's `PreviewV2API.send`
   dropped `replyTo` (`_ = replyTo`) while production stores it on the
   sent block and `threadEvents` passes it through since `a4fc532` — and
   R40 deleted the local re-attach, so the card had no source. The
   fixture now echoes `replyTo` onto the sent user event's `replyQuote`
   (both send branches, same non-empty guard as the wire decode): fixture
   parity, not app-to-fixture.
2. `testEarlierMessagesRowExpandsTheWindow` (CornerV2Flow): the app and
   the fixture were innocent — a probe launch showed the thread loaded
   and the row existed after scrolling. The test budgeted 12 swipes to
   climb ~200 lazy rows from a bottom-landed first paint and never
   reached the top. It now swipes up to 30 times (check-after-swipe,
   no dead 3 s waits) and the tap-to-expand second half passes unchanged:
   the +200 re-read returns the same 200, the row leaves, the thread
   stays (`R40-earlier-expanded.png`).

Gates, each suite alone, iPhone 16e sim: units 486/486; CompMatch 45
(1 skip); DesignMatch 5 (2 skip); VisualWindow 8/8; CornerV2Flow 12/12;
ComposerParity 14/14; R32Wiring 8/8 — 0 failures. `node
tools/native-design-vs-sim.mjs` exit 0, 68/68, twice. iPad Pro 13-inch
(M5): ComposerParity 14/14, R32Wiring 8/8.

Commits on aom-studio (never pushed): `b4ff0945` (code scope above) +
this report. A throwaway AX diagnostic test lived for one run to prove
the Earlier row existed and was deleted before the commit; the committed
pbxproj never references it.

Still off and why: the punch-list's sibling-round rows (C012, L031–L036,
C013, P083, C014) and LEDGER.md stay uncommitted — other rounds'
content, not this commit's scope. The P082 punch-list line is staged at
the table's end rather than beside its neighbours (single-line staging
of one shared-hunk table); harmless, flagged so the next full-file
commit can reposition it.
