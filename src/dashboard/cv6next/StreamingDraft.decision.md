# Decision record — R-SMOOTHNESS CV6 surfaces (Rounds D-H)

## agent

Rex.

## artifact

The CV6 chat surfaces changed by the R-SMOOTHNESS pass, 2026-08-12, aom-studio commits cb75e4e0, e7218a34, 081b2e57, 6bd21830, 98df890c, f421d2a4, 9ca4ecf9:
StreamingDraft.jsx (new), useStickToBottom.js (new), WorkersBoard.jsx (new), data/roomStatus.js (new), plus edits inside ChatDesktop.jsx, ChatLifecycle.jsx, RoomWorkList.jsx, WorkersShell.jsx, RoomRecoveryNotice.jsx, ActivityDock.jsx.

## intention

What each screen is FOR and the ONE thing the user can DO there, stated before decoration:
- The chat thread's live tail exists so Patrik can SEE the agent working and INTERVENE: the one action is Stop (or answer, when the settle phase hands the floor back). The draft bubble, phase pill, and step card all serve that single intervention decision; the Stop button sits on the live card itself.
- The stuck states exist so the one action is Restart this turn — a button, not a debugging ritual.
- The Background work window exists so the one action is ANSWER the task that is waiting on you: the needs-you section is first, shows the actual question, and takes the answer inline.
None of these screens is display-only; every state change the pass added carries its action in the same surface.

## call

I shipped this because every piece extends an existing, kit-derived surface rather than inventing new visual language: the draft bubble reuses the agent-bubble anatomy and the shared markdown renderer, the pill reuses the astat chip vocabulary, the Stop and Restart controls reuse the quiet-button conventions, and the board reuses WorkersShell's own SectionHeader and Row primitives. The alternative for the board — resurrecting TaskQueueFAB's floating panel with its raw rgba palette — lost because it duplicates a surface and ignores the kit. The alternative for the draft — a separate parallel hook — lost because the engine contract (one engine per room) is the only thing that has kept this thread stable.

## measured

Real output, this session:
- node --test, all ten new/touched suites, final full pass: `tests 43 / pass 43 / fail 0`.
- Served-bytes verification after each deploy (the chain: dashboard HTML -> main-*.js -> CornerCV6-*.js):
  Round E: `chunk: CornerCV6-TDIFDejm.js` grep 'cv6-sc-stop|Restart this turn' -> 1.
  Round F: `chunk: CornerCV6-JOW1f8bV.js` grep 'DEMO_JOB|SAMPLE' -> 0 (fake dock gone from prod bytes).
  Round G: `chunk: CornerCV6-eUNJYb9d.js` grep 'Jump to latest' -> 2.
  Round H: `main-BMtdGvgp.js -> CornerCV6-BhMtprcB.js` grep 'Waiting on you' -> 1.
- Push lane live probe: `{"ok":true,"sent":0,"note":"no subscribed devices"}` (authenticated, world-scoped, zero enrolled devices — enrollment is Patrik's tap).
- bridge-supervisor.py --full: `L1 bridge=OK L2 listener=OK failures=0 classes=none`.
- Screenshots read and judged at 1440 and 390 (rE-desktop-1440.png, rE-mobile-390.png): rail badges, card grid, composer aligned; lab probe pollution found in the rail mid-session and scrubbed (53 message rows + 32 events + 2 stragglers, re-verified zero).
- design_spacing_check.py was not run against these surfaces: it measures standalone HTML artifacts, and these are React components inside the live app shell; the kit's own spacing primitives were reused rather than new values invented. The new CSS added: one caret rule (7px/14px on the type baseline) and inline paddings drawn from existing control conventions (3px 9px on the ghost Stop button follows the kit's small-control pattern).

## uncertain

- The desktop jump-to-latest pill's absolute positioning anchor is my biggest visual doubt: .jumplive positions against the nearest positioned ancestor, and I could not exercise a live scrolled turn to confirm it centers over the thread column rather than drifting toward the viewport center at 1440. If it drifts, it reads as misplaced furniture.
- The draft-to-row swap is contract-tested but not eye-tested: the one paint claim rests on React batching two synchronous emits, and I could not watch a real streamed turn (the bridge flag waits on the ops window). A one-frame double render under load would look like a stutter exactly where smoothness is the promise.
- The interim-row interaction with the draft (5-minute-plus turns) is reasoned, not observed: an interim reply clears the draft, which then re-renders on the next chunk. On a very long turn that could read as the reply flickering away and back.
- The AnswerBox posts the answer into the task's room and assumes the documented needs_input resume path picks it up; I verified the write path, not a full worker-resume round trip.
- The Stop button's disabled 'Stopping…' state has no timeout: if the bridge accepts the stop but the watcher takes the full 10s to settle, the button sits disabled with no progress cue, and I am not sure that reads as working rather than hung.
- 29 pre-existing HTML artifacts elsewhere in the repo fail the measured composition sweep (sticker sheets, wolfpack pages, tmp mockups — none touched this session); I judged them out of scope rather than fixing them, and that is a call someone could disagree with.

## risk

If I am wrong about the pill anchor or the draft swap, the cost is visible jank on the product's main screen — the exact opposite of what this pass sold. Both are one-file fixes with no data risk. If the AnswerBox resume assumption is wrong, a typed answer lands in the right room but the worker stays parked — recoverable, visible in the needs-you section, no silent loss. The Stop path's blast radius was bounded on the bridge side (Round C's ledger); the UI side can at worst show a stale 'Stopping…' label.

## would_change

With another pass I would: watch one real streamed turn end to end at both widths before trusting the swap and the pill anchor (this unlocks the moment Patrik runs the ops window); give 'Stopping…' a 15s honesty timeout that reverts with a "couldn't confirm the stop" strip; and surface the phase vocabulary in the rooms rail for non-open rooms, which means teaching the chat-list API to join receipts — deferred this pass and recorded as such.

## references

- OpenHands' agent state banner and pause control (the running/awaiting-input broadcast this pass's pill vocabulary matches).
- Kortix/Suna's live computer view with tool calls as discrete cards (the step-card-with-glyph read).
- Vercel AI Elements' streaming conversation stack (stick-to-bottom + streaming-safe markdown + stop affordance — the exact trio Rounds D/E/G implement natively).

## signed

Rex, 2026-08-12. My call, my name on it.
