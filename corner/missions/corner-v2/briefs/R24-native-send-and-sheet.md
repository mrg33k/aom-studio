# Brief R24-native-send-and-sheet — why the phone says "Offline", the cropped PDF, the truncated placeholder (P074, P075, P076)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `punch-list.md` rows **P074, P075, P076** (yours), `rounds/R23-native-entry-is-the-thread.md`
(what just changed in the entry/drawer/nav; keep its gates green), and `rounds/R19-native-design-vs-simulator.md`
§3 (creds handoff; the shell never reaches the on-sim runner). Report: `rounds/R24-native-send-and-sheet.md`.

You are a headless worker, BUILDER for the native iOS app (SwiftUI). Nobody will answer questions.

## Patrik, 7:00 PM, on his iPhone 17 Pro Max with his real account on the production backend

"even in the screen shot the pdf is cut off. the chat on ios is very rough looking and says im offline."

## 0. FIRST: answering a question must land in the thread (P080)

On the live chat (7:12 PM) tapping "Buyers" on the driver's question block did not select the
option or answer in the thread; it went out as a global-routed send and produced a router
clarification card. Core chat is broken until this is fixed: an option tap = select the radio +
send the option text INTO this thread (`threadId` set, no routing), the driver's next turn follows,
the ledger gets the decided row. Same for a typed answer while a question is open. Lock with a UI
test against the fixture and a real-backend check in the report.

## 1. "Offline" (P075) — find the real rejection, then never mislabel it again

`ChatViewModel.send` enqueues every message, and ANY error keeps it queued; `ChatView.v2OfflineBanner`
then says "Offline — N messages waiting" (the reason is discarded in `catch { refreshQueued() }`).
Reproduce on the real backend, NOT in fixture mode: the iPhone 17 Pro simulator (`971E7446-394B-4EF6-9796-8D9D1F916994`,
402 wide; the 16e is Patrik's attached panel and R23 may be using it), signed in as the e2e account
(`/tmp/corner-v2-e2e.env`; use the R19 handoff file pattern or a throwaway in-process test to sign in;
never type the password by hand into a report). Open a real thread (Aster / Spring launch deck), send
a message, and watch: does it land (`threadEvents` echoes it) or queue? Capture the exact error
(`String(describing:)` + any Convex envelope message) in the report. Likely suspects, check each:
`mode` on `v2Native:send` (does the clone's `v2Native.send` accept `mode` after the 6:25 PM deploy? if
not, the field-less fallback must actually fire — prove it with a unit test), `Not a member of this
world` / `Project access denied` for a migrated AOM thread (membership rows on the clone), a stale
thread id, a masked "Server Error" (the clone now sends `ConvexError` data: `Not signed in`,
`Project access denied`, `Thread not found`). Fix the root cause in the app where it is the app's
fault; where it is the backend's, write the exact function + fix needed for the web worktree's
`convex/` (the orchestrator deploys with the key) and make the app degrade to a plain reason meanwhile.
Then the banner: a queued send whose last error is a rejection shows "Not sent, tap to retry" with
the plain reason under the echo bubble (the web's pattern), and "Offline — waiting to send" ONLY when
the last error was a URLError (no network). Store the last error per outbox entry. `replayOutbox` runs
on foreground and on reconnect. Unit tests for both branches.

## 2. The cropped PDF (P074)

In the review sheet the PDF page is cut at the stage edge ("3 THINGS CHANGED" sliced). HANDOFF §6:
stage = media height capped by aspect: a page must aspect-fit inside the stage (whole page visible,
letterboxed on `--surface`), arrows step pages, and the full detent shows the page larger, never
cropped. Same rule for photo. Lock with a UI test that reads the page view's frame vs the stage.

## 3. The truncated placeholder (P076)

At 390 the pill shows "Tell General what to…" because the ✦ Auto chip + mic + send eat the width.
The design's pill shows the full placeholder with Record inside. Make it fit: the commands chip
collapses to its icon while the field is empty and expands (label) once focused/typing, or shorten the
copy per HANDOFF — pick the one that keeps the design's chip metrics; lock with a test that asserts no
truncation at 390 for "Tell Aster what to make next".

## Gates

376+ unit, the four UI suites (run alone: under load the runner dies with "signal kill"),
`node tools/native-design-vs-sim.mjs` exit 0 twice in a row. Stage scoped paths + regenerated
`project.pbxproj`; commit on aom-studio (HEAD = R23's commit or later); never push; never install to a
device; do not edit the web worktree. Report: the real send error verbatim (secrets redacted), root
cause, fix, before/after screenshots for each row, gates table, commits, "for the orchestrator"
(backend changes to deploy, phone reinstall), "still off and why" (empty is the goal).

## Also yours (seen on the live chat, iPhone 17 Pro, 7:09-7:10 PM, `punch-list.md`)

- **P077** thread ground is a gradient glow; the design is flat `--ground`.
- **P078** step-only agent events render as blank rows (web L011 twin): paint the label.
- **P079** an in-thread send shows "Routed to …" as a thread line AND a route banner with Move;
  routing UI belongs to global-input sends only.
