# R28 — native composer parity (everything the CV6 composer did, inside the v2 pill)

`corner:corner-v2`. BUILDER, native iOS app (SwiftUI). Headless, no questions asked.
Mission folder: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Report: `rounds/R28-native-composer-parity.md` (this file).

Read first: `LOOP.md`, `rounds/R19-native-design-vs-simulator.md` §5 (commands chip as built),
`rounds/R24-native-send-and-sheet.md` (send/question fixes built on), `briefs/R27-desktop-composer-parity.md`
(the web's control table — the phone matches it one for one), and the CV6 composer truth
(`src/dashboard/cv6next/Cv6FullComposer.jsx`, `Cv6InputBar.jsx`, `IntakeComposer.jsx` in `AOM-EA/aom-studio`).

## Verdict

Every CV6 composer control now lives in the v2 pill path, locked by 25 new unit tests and 14 new UI
tests (one per control) in `CornerUITests/ComposerParityUITests.swift`. The pill's gated metrics are
untouched: the empty pill at 390 is pixel-identical in layout to R24 (full placeholder, collapsed chip,
mic, 50px send), and all four pre-existing UI suites pass alone. Two R28-scoped discoveries are disclosed
below (the paperclip appears with content, not while empty; container identifiers hide inner buttons).

## 0. Design decision: where the paperclip lives (read this first)

The brief puts four controls in the 50pt pill: paperclip, commands chip, Record, round send. The empty
pill at 390 cannot hold all four with General's placeholder intact — measured: the placeholder needs
201.1pt (R24 TextKit measurement, Hanken 14.5); a compact 30pt clip + spacing leaves ~180pt. Funding it
from locked metrics (mic 36, send 50, outer 21, 14.5px type) is forbidden, and funding it from the R24
spacings re-truncates what P076 fixed.

So the clip joins the pill **once composing begins** (non-empty field or staged files) — the same
state-dependent-pill precedent R24 set with the collapsing chip. Empty pill = R24's exact layout
(P076 green, gate green); first keystroke → clip fades in, exactly when attach becomes relevant.
Eye-proof: `R28-native-stop-generating.png` (sent, empty field, full "Tell General what to make next")
vs `R28-native-reply-chip.png` (pre-fix: quote-armed with clip showing truncated the placeholder —
fixed the same hour by dropping quote-arming from the condition).

## 1. Control table (CV6 → iOS status → evidence PNG)

Evidence PNGs: `rounds/evidence/R28-native-<name>.png` (shot on the 390 iPhone 16e sim, fixture mode).

| CV6 control (R27 web twin) | iOS status | Where | Evidence PNG |
|---|---|---|---|
| Attach: photos, files, camera, multiple | DONE — paperclip in the pill (while composing) → Photo Library (5 max), Choose Files (multi), Camera (guarded; names the unavailability in-sim) | `ChatView.v2Composer` (`v2-attach`), `V2ChatModel.staged` | `R28-native-attach-menu.png` |
| Staged chips, removable | DONE — chips above the pill, × per file | `v2StagedRow` (`v2-staged-row`, `v2-staged-remove-<i>`) | `R28-native-staged-row.png` |
| Staged names ride the send | DONE — `[attached: a, b]` trailer in the sent text (the server stores what the user saw); bytes wait on a backend field (backend row B2) | `V2SendText.build`, `V2ChatModel.send(_:quote:attachments:)` | unit `testSendCarriesQuoteAndAttachmentNames` |
| Commands menu: Work/Plan, Model, Specialist, Files, Generate an image | DONE (existed, kept) + Talk aloud section added (toggle + Read checklist aloud) | shared `commandsMenuContent` + v2-only section in `v2CommandsChip` | `R28-native-commands-talk.png` |
| Generate an image → artifact tab or Generating… run | DONE — prompt in field runs immediately (Generating… run + real `window.open(.photo…)` tab); empty field opens a prompt sheet; Stop parks the run as cancelled, failures keep the prompt with a dismiss | `v2GenerateImage`, `V2ImageRun`, `V2ImagePromptSheet` | `R28-native-image-tab.png`, `R28-native-image-generating.png` |
| Slash: `/` opens the same menu as a sheet | DONE — `/` hints inline (`/plan`… chips), Return submits to the full sheet (all 8 rows, large detent, no scroll) | `v2SlashQuickRow`, `V2SlashSheet` (`v2-slash-sheet`) | `R28-native-slash-sheet.png` |
| `/clear` with confirm | DONE — inline confirm in the sheet AND alert on `/clear`+Return; view-local only (draft, staged, quote), copy says messages stay; server clear is backend row B1 | `v2ClearView`, `v2ShowingClearConfirm` | `R28-native-slash-clear.png` |
| `/integrations` → settings | DONE — slash row + sheet row open Settings (Environment/connections live there) | `v2SlashPick(.integrations)` → `router.showingSettings` | sheet row in `R28-native-slash-sheet.png` |
| Reply-to (quote + thread) | DONE — long-press any message → Reply → quote chip (× cancels) → sent text carries `> sender: snippet`; chip clears on send | `v2ReplyMenu`, `v2ReplyChip`, `V2ReplyQuote` | `R28-native-reply-chip.png` |
| Talk aloud (spoken replies) | DONE — per-thread persisted toggle in the chip menu; each new driver reply speaks once (deduped by event id); disabling stops audio | `V2TalkAloud`, `v2MaybeSpeak` | `R28-native-commands-talk.png` + unit (fake speaker, never audio) |
| Checklist playback | DONE — "Read checklist aloud" in the chip menu (disabled with no sendable pins); reads filled notes numbered | `V2TalkAloud.speakChecklist`, `V2SpeakText.checklistSpeech` | unit `testTalkAloudChecklist` |
| Dictation + live level meter | DONE — existing Record streams (unchanged contract) + 4-bar live meter in the pill from the audio tap (RMS → 0…1, silence reads 0, never NaN) | `SpeechService.level`, `V2LevelMeter` (`v2-dictation-meter`) | `R28-native-dictation-meter.png` |
| Stop generating images | DONE — run-level Stop (parks as cancelled) + Stop-while-sending (amber stop replaces send) | `v2-image-stop`, `v2-composer-stop`, `V2ChatModel.stopSending` | `R28-native-image-generating.png`, `R28-native-stop-generating.png` |
| Stop while generating (send) | DONE — send flight is cancellable; Stop cancels, drops the spinner, ends the activity, re-reads the thread; a late success after Stop is discarded (no entry removal, no verdict); no failure is stamped (no Not-sent banner after a deliberate stop) | `startSend`/`stopSending`, `CancellationError` branch | `testStopCancelsTheFlightQuietly` + `R28-native-stop-generating.png` |
| Drafts per thread (disk, relaunch-safe) | DONE — `v2ComposerDraft.<threadID>` in UserDefaults, saved on change, restored on arrival (setup stash wins), cleared on send/clear; `-v2ResetEntry` wipes them (fresh-thread contract) | `V2ComposerDrafts` | `R28-native-draft-relaunch.png` + `testDraftSurvivesRelaunch` |
| @mention chips | DONE — `@` type-ahead (`brain` + roster), tap commits `@slug `, committed chips removable, parsing reuses `BrainMention`'s tokeniser (chip and wire never disagree) | `v2MentionSuggestionRow`, `v2MentionChipsRow`, `V2Mentions` | `R28-native-mention-chip.png` |
| Return sends | DONE — soft Return sends Slack-style (single typed `\n` reverts + submits; pastes never match; `/` drafts route to slash); hardware Return via `onSubmit`; `submitLabel(.send)` | `v2DraftChanged`, `v2Submit` | `R28-native-return-send.png` |
| A11y labels + VoiceOver order | DONE — every pill control labelled (field "Message", clip, chip, Record both states, Send/Stop, cancel-reply, per-chip removes, meter with % value); `accessibilitySortPriority` 5→1 follows the visual reading order | pill in `v2Composer` | `testAccessibilityLabels` |
| iPad column composer, same controls | DONE by construction — `VisualWindowHost` renders the same `v2Main`/`v2Composer` in the iPad column and the iPhone sheet (no second composer to drift) | `VisualWindowHost` + `v2Main` | code (no iPad sim run this round — stated, not implied) |

Deliberately NOT built (disclosed, with reason):

- **Staged bytes upload**: names ride the send; bytes wait on backend row B2. Uploading nothing while claiming an attach would lie; dropping the names would make attach a no-op.
- **`/model` + `/specialist` inline (no sheet)**: they open the sheet's picker lists (with labeled Back to commands) — a Menu cannot be opened programmatically, and duplicating the pickers inline would fork the one-menu rule.
- **Swipe-to-reply**: long-press covers the brief's "swipe or long-press" (rows live in a ScrollView, not a List — swipe actions need a List; rebuilding the thread as a List is out of scope).
- **Voice picker UI**: default synthesis voice (same call R27 made — a picker ships unverified in a voiceless sim).
- **Image bytes**: the placeholder tab opens with the prompt in state (mirrors R27/B3 — fill path is the backend image worker).

## 2. What changed (files)

- NEW `ios-native/Corner/Views/V2ComposerExtras.swift` — slash palette/filter, reply quotes, mention
  parse/complete/remove, disk drafts, staged names, image runs, send-text builder, speakable text. Pure.
- NEW `ios-native/Corner/Services/V2TalkAloud.swift` — per-thread toggle + AVSpeech replies (once per
  event) + checklist playback, behind a `V2TalkSpeaker` seam (tests use a recording fake).
- `ios-native/Corner/Services/SpeechService.swift` — `@Published level` from the audio tap (RMS → 0…1),
  0 on stop; pure `normalizedLevel`/`meterLevel` (silence→0, NaN→0, ±∞ safe).
- `ios-native/Corner/Views/ChatViewModel.swift` — `V2ChatModel.send(_:quote:attachments:)`
  (quote prefix + `[attached:]` trailer via `V2SendText`), `startSend`/`stopSending` + `isSending`
  (late-success discard, quiet park on cancel), staged add/remove/clear, image-run lifecycle.
- `ios-native/Corner/Views/ChatView.swift` — the v2 pill rebuild: paperclip, meter, Stop, trays above
  the pill (mention hints/chips, slash hints, quote chip, staged, image runs, notices), slash sheet +
  prompt sheet + camera sheet, clear confirm, disk-draft restore/save, speak-on-reply, Return-send,
  reply long-press on rows, Talk section in the v2 chip menu, sort priorities. Legacy path untouched.
- `ios-native/Corner/Services/RoomStore.swift` — fixture `-v2SlowSend=N` stall (sends + visual opens,
  cancellation-aware) for the Stop UI tests. Zero effect at N=0 (default).
- `ios-native/Corner/CornerApp.swift` — `-v2ResetEntry` also wipes `v2ComposerDraft.*` (fresh-thread
  contract; the draft-persistence test relaunches WITHOUT the flag).
- NEW `ios-native/CornerTests/R28ComposerParityTests.swift` — 25 unit tests.
- NEW `ios-native/CornerUITests/ComposerParityUITests.swift` — 14 UI tests, one per control.
- `ios-native/Corner.xcodeproj/project.pbxproj` — regenerated (xcodegen).
- `corner/missions/corner-v2/rounds/evidence/R28-native-*.png` — 13 evidence shots.

## 3. Gates

| Gate | Result |
|---|---|
| Unit (`CornerTests`, 16e) | **428/428 pass** (was 403; +25 R28). Gate needs 376+. |
| `CompMatchUITests` alone, 390 | 45 tests, 0 failures, 1 skipped (`testP061SetupFlow`, pre-existing). |
| `DesignMatchUITests` alone | 5 tests, 0 failures, 2 skipped (pre-existing). |
| `VisualWindowUITests` alone | 7/7. |
| `CornerV2FlowUITests` alone | 11/11. |
| `ComposerParityUITests` (new) alone | **14/14** (one per control). |
| `node tools/native-design-vs-sim.mjs`, run 1 (pre-tour-fix) | exit 1 — **60/66, 6 open, all live-data collisions, zero app-code fails** (full log `/tmp/r28-gate1.log`). See finding 7. |
| same, run 2 (post-tour-fix) | **exit 0 — 66/66 checks pass, 0 open** (full log `/tmp/r28-gate2.log`). |
| same, run 3 (post-tour-fix) | **exit 0 — 66/66 checks pass, 0 open** (full log `/tmp/r28-gate3.log`). |

Thread-screen anchors on live data (run 2): field 213.0, chip 22×32 collapsed, record 36×36, send
50×50, send token exact — the R24 pill budget holds with the R28 controls in the tree.

## 4. Test findings that changed the build (all fixed in-round)

1. **My own disk drafts polluted the suite** (accessibility's "x" leaked into attach/draft tests).
   Fix: `-v2ResetEntry` wipes `v2ComposerDraft.*` + every typing test defensively clears the field.
2. **Container identifiers hide inner buttons** (the R19 finding, re-learned): `v2-image-run`,
   `v2-reply-chip`, and `v2-slash-clear-confirm` containers swallowed their buttons' ids. Fix: ids live
   on leaves only (run asserted via "Generating…" copy, chip via "Replying to", confirm via its copy).
3. **No tappable Return key on this sim** (hardware keyboard attached — `keys["return"]` never
   resolves). Fix: tests submit via `typeText("\n")`, the exact soft-key path (single-`\n` detect).
4. **Image-stop raced the 4s stall** (menu nav + waits ate the window; the run finished before the tap).
   Fix: `-v2SlowSend=30` for that test; Stop cancels out of the stall.
5. **Sheet rows below the fold** (integrations/clear unreachable in a medium sheet). Fix: slash sheet
   is `.large` — all eight rows visible, no scroll.
6. **Quote-arming showed the clip and truncated General's placeholder** (caught on the evidence PNG,
   §0). Fix: clip shows for draft/staged content only.
7. **The gate's own tour measured content and list depth, not UI** (run 1: 60/66). Two measurement
   fixes in `CornerUITests/R19ShootScreens.swift`, thresholds and asserted ids untouched: (a) the thread
   ground sample moved from mid-thread (195,400) — which landed on a live Paige option card (raised
   fill) now that the Spring thread has content again — to the left gutter (10,400), where the 21pt
   content inset guarantees background (same fixed-zone reasoning as the drawer's existing (8,56)
   sample); (b) drawer frames are measured after swiping back to the top — the proof scroll plus the
   R26/R33 probe flood had pushed New/Project+/Record out of the lazy AX tree, so the check tested
   list depth instead of the header. The drawer shot proves the rows render (visible in
   `R19-native-drawer-sim-390.png` while resolving MISSING post-scroll). R19 precedent: gate bugs fixed
   in-round, none in the app. Runs 2–3 exit 0 with every threshold identical.

## 5. Backend rows (no `convex/` edits — contract for the backend)

- **B1 clearThread**: `v2Workspace.clearThread` (or archiveThread) hiding a thread's blocks from the
  surface. Client confirm flow is done; today it clears view-local state only and says so.
- **B2 send attachments**: `v2Native:send` should accept `attachments` (names today ride a trailer;
  bytes have no field). Client stages photos/files/camera (multiple) and names them truthfully.
- **B3 image bytes**: same as R27/B3 — action `v2Images.generate { threadId, prompt, tool }` → bytes to
  storage → upgrade the client's photo artifact (opened with `status:"generating"`, prompt in state).

## 6. Still off and why

- **Gate exit 0 twice**: met — runs 2 and 3 both exit 0, 66/66, back to back on live data.
- **Staged-only empty field truncates General's placeholder** (~2 chars, accepted in §0: staged files
  are content, and the P076 empty-pill lock stays green).
- **Multiline entry via the Return key is gone** (Return sends now): multiline arrives via paste
  (documented in code; the brief ordered Return-sends).
- **Reply quotes are inline text, not linked blocks** (`> sender: snippet` the server stores verbatim):
  cross-device/sync-safe by construction, but no tap-to-jump until a `replyTo` block field exists (B-row
  cousin — the web carries the same workaround via `clientMessageId`).
- **iPad column**: same composer by construction (shared `v2Main`), no iPad-sim run this round.
- **Image prompt sheet**: covered by unit + fixture flows, no dedicated UI test (the Generate control's
  UI tests run the with-prompt path).

## 7. Commits (aom-studio, no push)

- R28 commit (this round): v2 pill parity (attach, slash sheet + hints, reply quotes, Talk aloud +
  checklist playback, dictation meter, stop, disk drafts, mention chips, Return-send, image runs,
  a11y order) + V2ChatModel send/stop/stage/runs + fixture `-v2SlowSend` + tour measurement fixes +
  25 unit + 14 UI tests + 13 evidence PNGs + this report. Scoped paths only (below); never pushed.
- Left unstaged on purpose: the gate's re-shot `R19-native-*-sim-*.png` / side-by-sides / diffs
  (gate working output, not R28 evidence — orchestrator decides), and every non-R28 modification
  other workers have in the tree.

Staged paths:

- `ios-native/Corner/Views/V2ComposerExtras.swift` (new)
- `ios-native/Corner/Services/V2TalkAloud.swift` (new)
- `ios-native/Corner/Services/SpeechService.swift`
- `ios-native/Corner/Views/ChatViewModel.swift`
- `ios-native/Corner/Views/ChatView.swift`
- `ios-native/Corner/Services/RoomStore.swift`
- `ios-native/Corner/CornerApp.swift`
- `ios-native/CornerUITests/R19ShootScreens.swift`
- `ios-native/CornerTests/R28ComposerParityTests.swift` (new)
- `ios-native/CornerUITests/ComposerParityUITests.swift` (new)
- `ios-native/Corner.xcodeproj/project.pbxproj` (regenerated)
- `corner/missions/corner-v2/rounds/R28-native-composer-parity.md` (this report)
- `corner/missions/corner-v2/rounds/evidence/R28-native-*.png` (13 files)
