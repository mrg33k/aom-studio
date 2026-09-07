# R32 — native wiring: the phone uses the backend it now has

`corner:corner-v2` · BUILDER (native iOS) · 2026-09-07 · mission
`corner/missions/corner-v2/` · extends R28 (its §5 backend rows stay
landed; its §6 "still off" is what this round works) · closes P081.

Backend taken as deployed on the clone (`brilliant-scorpion-163`, verified
by reading it, never by writing outside the e2e live proof):
`v2Native.send` takes `replyTo {messageId, sender, snippet}`, `mode`,
`model`, `clientEventId` (dedupe), `imageTool`;
`v2Workspace.clearThread` (`clearedAt` hides rows from the surface);
`v2Native.runsForThread` (`{open, lastDone}`, ms-epoch `createdAt`);
`v2Visual.createArtifact` + `files:generateUploadUrl`;
`v2Native.threadsWithNewUserBlocks` (deployed; the phone needs nothing
from it — read, not wired).

## Rows before → after

P081 — run state ("working" from run state).
Before: after send, nothing until the reply landed; the nav dot read
mission status only; a dark stretch said nothing.
After: the send raises `"<driver> is on it…"` (8px success pulsing dot,
13px muted — the web `v2-working-line` twin) until the first new agent
event; `runsForThread` (5s poll + immediate on send) drives the nav dot
(open run = Working, none = Ready; a send awaiting its first agent block
also reads Working); past 45s with no reply the line goes still
(`"<driver> is taking a while — the reply will land here."`, dot rests) —
never silence. New-agent arrival is id-based; a send fired mid-load is
additionally newness-gated so the first refresh's old rows cannot end the
wait (`V2WorkingLine.ends(on:)`, `loadedAtSend`).
Evidence: `R32-working-line.png`, `R32-working-quiet.png` (fixture),
`R32-live-working.png` + `R32-live-replied.png` (clone, e2e Spring thread,
Paige answered both turns), `R32NativeWiringTests` (driver/quiet/ends
rules, line lifecycle, runs decoding of the exact live bytes),
`R32WiringUITests/testWorkingLineAndNavDot` + `testQuietNotice`.

Reply-to as a block field.
Before: the quote rode the text as `> sender: snippet`.
After: the send carries bare text + `replyTo {messageId, sender, snippet}`
(stored on the block payload — server-verified on the surface after the
live proof); the message renders the quote card from the payload with
tap-to-jump (`ScrollViewReader.scrollTo`, no-op when the quoted row is
gone); the echo carries the quote and the model re-attaches it to the
matching server event on every merge, so the card survives refreshes;
retries re-send the same `replyTo` with the same `clientEventId`.
Evidence: `R32-reply-quote.png` (card, bare `answer r28` text),
surface `payload.replyTo` for the live quoted send, unit
(reattach/retry/raw-block lift + encode-omission), UI (render + jump).

Clear chat.
Before: `/clear` cleared view-local state only; copy said messages stay.
After: confirm → `v2Workspace.clearThread` → the thread empties on every
device (events/draft/decision/working line drop; queued outbox stays —
unsent text is still the user's); copy is the web's twin ("Start fresh?
This clears the chat on every device. Nothing is deleted — earlier
messages stay in history."); a backend failure changes nothing and raises
the tray retry ("Couldn't clear just now…").
Evidence: `R32-clear-confirm.png`, `R32-clear-empty.png`,
`R32-clear-failed.png`, unit (empties + failure-changes-nothing), UI ×3.

Attachments as artifacts.
Before: staged names rode the send as `[attached: …]`; bytes had no path.
After: staged photos/files/camera read bytes at stage time and upload per
file (`generateUploadUrl` → POST bytes with the file's MIME →
`createArtifact` kind-by-MIME, `createdBy: "user"`, `{size, mimeType}`
meta) → the tab opens in the background (peek bar is the confirmation;
no sheet yank per file) and the chip dismisses. Per-file Retry; a failed
file never blocks the outbox — the send carries no bytes. Upload kind
mapping twins the web's `artifactKindForFile` (incl. `site`/`file` core
names for `createArtifact`).
Evidence: `R32-upload-peek.png`, `R32-upload-retry.png`, unit
(web-path args, retry-alone, send-mid-failure, kinds), UI ×2.

Image tool (pending photo → bridge upgrade → paint).
Before: the Generate path opened a link-less tab that rendered the
broken-link card.
After: Generate creates the pending photo artifact (`status:
"generating"`, no storage — the web `startImageRun` twin), opens its tab,
and polls `artifacts` until the bridge's upgrade lands `sourceURL`; the
tab shows a Generating stage (spinner + prompt) while pending — never the
broken-link card — and paints on arrival. Stop parks the run.
Evidence: `R32-image-pending.png`, `R32-image-painted.png`, unit
(create args, poll-through-pending, pending predicate), UI ×2.

Multiline entry.
Return sends (unchanged); hardware Shift+Return inserts a newline (the
design carries no newline key, so the invisible hardware path is the
design-consistent one — locked by `V2ShiftReturn` + unit test + an
`onKeyPress` bypass around the soft-Return submit detector). Paste
multiline unchanged.

iPad column.
ComposerParity green on `iPad Pro 13-inch (M5)`; thread-screen evidence
`R32-ipad-thread.png` (same composer in the column by construction).

## Gates

- Unit: `CornerTests` 465/465 green on the 390 sim (428 carried + 37 new
`R32NativeWiringTests`).
- UI, each suite alone (the runner dies with "signal kill" under load):
CompMatch 45 (1 skipped), DesignMatch 5 (2 skipped), VisualWindow 7,
CornerV2Flow 11, ComposerParity 14 — all green; new `R32WiringUITests`
8/8 green (working line + nav dot, quiet, clear + clear-failure, staged
upload → tab, failed-upload retry, image pending → painted).
- `node tools/native-design-vs-sim.mjs` exit 0, 66/66 checks pass — TWICE
(first pass 04:0x, second pass 04:3x, same 66/66, 0 open).
- iPad: ComposerParity 14/14 green on `iPad Pro 13-inch (M5)` (UDID
`3BFA26A5…`); R32Wiring 8/8 green there too (one adaptation: no sheet
close on the column layout — the run card stays reachable);
`R32-ipad-thread.png` files the column.
- Live proof (clone, e2e Aster / Spring launch deck, demo brain Paige):
7 sends stored server-side; dot Working→Live on two full turns, both
answered; quote card rendered on the quoted send and `payload.replyTo`
verified on the surface; `R32-live-working.png`, `R32-live-replied.png`.
The working line's live pixels were uncatchable (the brain answers in
1–3 s; the line correctly lives only until the first agent block) —
fixture pixels + code path (set unconditionally in `send()`) cover it.

## Commits

(TBD.)

## For the orchestrator

Phone reinstall. Nothing to install to a device (simulators only, per the
brief); the build is the committed source — reinstall = rebuild + run.

Backend asks.
1. `v2Native:threadEvents` text blocks should carry the stored `replyTo`
(like the v2Workspace surface already passes through). The phone
decodes it when present (pinned), echoes + re-attaches locally until
then — cross-device quotes (web → phone) do not render yet. One-line
change in `toNativeBlocks` + deploy.
2. Nothing else: `runsForThread`, `clearThread`, `generateUploadUrl`,
`createArtifact`, `clientEventId` dedupe all behaved live as specified.
(`threadsWithNewUserBlocks` was not needed on the phone.)

## Still off and why

- Cross-device reply quotes (above): needs backend ask 1; phone side is
landed and pinned.
- The live 45s quiet notice was not observed on the clone (the demo brain
answered every proof turn in seconds); the bound/timer/copy are
fixture-proven (`-v2QuietAfter` exercises the same path) and unit-pinned.
- `imageTool` is not sent on any phone send: the phone has no standing
tool pick (Generate runs immediately, client-driven, like the web's image
menu today). If the bridge ever needs the phone to name a tool on a text
send, that wants a picker first — new UI, not a wire.
- No autoscroll-to-bottom on the live thread (pre-existing R23+ behavior):
a fresh launch rests at the top of a long thread; the live proof had to
scroll to new rows. Left as-is (out of scope), flagged because it makes
live delays look like missing messages.
- The demo brain went dark 07:25–10:23 UTC (four proof sends sat with no
open run, then it answered in seconds). Phone side treats that exactly
right (line → quiet notice); brain uptime is not the phone's row.
