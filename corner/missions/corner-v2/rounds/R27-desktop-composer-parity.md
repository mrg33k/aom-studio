# R27 — desktop composer parity (everything the CV6 composer did, inside the v2 composer)

Mission `corner:corner-v2`. Worktree `corner-v2-integration`, branch
`codex/corner-v2-integration` (never pushed). Preview:
https://corner-v2-integration-pdsbytecw-aheads-projects-d2a4c70f.vercel.app
(VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud,
VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site).

Source of truth read before writing a line:
`src/dashboard/cv6next/Cv6FullComposer.jsx` (725 lines),
`Cv6InputBar.jsx` (569), `IntakeComposer.jsx` (146) — paths in the
`AOM-EA/aom-studio` checkout. Design gate from R18 kept green throughout.

## Gates (all run in the worktree, 2026-09-06/07)

| command | output |
|---|---|
| `npm run lint` | 0 errors, 11 warnings (all pre-existing lines: CommandPalette, NotificationsBell, auth, Auth, Email, Home, Onboarding, ConversationSurface:1163 legacy FAB effect). Zero warnings point at R27 lines. |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | 21 files, 171 passed (was 163 in R18: +6 composer-commands incl. 2 new, +4 talk-aloud incl. voice test) |
| `PW_PORT=5174 npx playwright test --output e2e/results-orch` (desktop) | 103 passed, 0 failed — twice in a row on fresh servers (87 pre-existing + 16 new R27) |
| `LIVE_BASE_URL=<preview> npm run test:design` | exit 0 — `R18 visual gate: 0 screens failing, 0 UI rows failing.` |
| `LIVE_BASE_URL=<preview> npx playwright test --project live` | 9 passed, 2 skipped (bar was 8/2) |

Deploys: one build+deploy this round (`…-pdsbytecw-…`, above). No `convex/`
edits; no 5173/5177/3099 (e2e on 5174 only); nothing pushed.

## Control table (CV6 control → v2 status → where)

| CV6 control (Cv6FullComposer / Cv6InputBar) | Before | After (this round) | Where |
|---|---|---|---|
| Attach and upload files (multi-file input) | single file only | multi-file input + per-file artifact + `Added N files` notice | `src/components/Composer.tsx` (`attachFiles`, `multiple`), `src/v2/ConversationSurface.tsx` (`handleAttachFiles`) |
| Attach via drag-drop | none | drop overlay on the composer (`drop-overlay`) | Composer.tsx drop handlers + `src/v2/conversation.css` (`.v2-drop-overlay`) |
| Attach via paste-image | none | pasted clipboard images attach; text paste unchanged | Composer.tsx `handlePaste` |
| Commands menu: Work/Plan, Model, Specialist, Files | existed | unchanged (still there) | Composer.tsx `.v2-commands-menu` |
| Submenu "Back to commands" | back buttons, unlabeled | all three labeled `Back to commands` | Composer.tsx (3× `aria-label`) |
| Slash palette (`/` type-ahead) | /plan /model /files /image | + `/clear`, + `/integrations` | `src/lib/composerCommands.ts` (`SLASH_COMMANDS`), Composer.tsx `runSlash` |
| `/clear` with "Confirm clearing this chat" | none | confirm bar (Cancel / Clear chat / busy / failure), never clears on the pick | Composer.tsx tray (`v2-clear-confirm`), host `onClearRoom` clears view-local state (see backend B2) |
| `/integrations` → settings/environment | none | slash + menu row both navigate `/settings/integrations` (Environment section) | Composer.tsx, ConversationSurface `handleOpenIntegrations` |
| Cancel reply (reply-to quote + thread) | none | hover/focus Reply on any message → quote chip (`reply-chip`, Esc/× cancels) → sent block carries the quote via `clientMessageId` + local map (persisted per thread) | ConversationSurface (`replyTo`, `replyMap`, `quoteFor`, `V2Message` quote), Composer tray |
| Send (Enter, clear instantly, no double-post) | existed | unchanged + clears the draft | Composer.tsx `send` + `clearComposerDraft` |
| Draft persistence per room | prefs only | `v2-composer-draft:<threadId>`, restore on switch, no cross-thread leak (guard like CV6's `restoringDraftRef`) | `composerCommands.ts` draft helpers, Composer.tsx effects |
| @mentions with chips (`composer-chip`) | existed | unchanged + e2e lock | Composer.tsx (`committed`) |
| Talk aloud toggle (spoken replies) | Record showed a "Live Scribe is coming" toast | commands-menu `Talk aloud` checkbox (speechSynthesis of the driver's newest reply, per-thread persisted, `__cornerSpoken` log); stored `v2-talk-voice` URI honored, default voice otherwise | `src/lib/talkAloud.ts` (new), Composer menu row, ConversationSurface speak effect |
| Checklist playback (`onPlayChecklistItem/List`) | review send flow only | `Read aloud` button on the review checklist (reads filled notes; the send flow is untouched) | ConversationSurface `ReviewChecklist` |
| Voice input dictation (`onTranscript` + live level meter) | toast (same dead end) | Record starts SpeechRecognition (stub-verified wiring in e2e): transcript lands in the field, live meter (`dictation-meter`, `aria-valuenow` from the mic analyser, animated fallback when the mic is denied); graceful notice when unsupported; never leaves mic/recogniser running (unmount + thread-switch cleanup) | Composer.tsx dictation block + tray meter |
| Stop generating images | disarm-× on the armed chip only | run-level Stop (`image-stop`) cancels the run (no tab opens); armed-chip × retained | ConversationSurface image run card + `stopImageRun` |
| Generate an image → artifact tab | armed chip was a dead end | send with an armed tool runs a visible `Generating…` step, then creates a `photo` artifact (`v2Visual.createArtifact`, existing) and opens it (`v2VisualWindow.openTab`, existing) | ConversationSurface `startImageRun` |
| Keyboard: Enter / Shift+Enter / Esc / `/` / Cmd+K | Enter ✓, Shift+Enter ✓, Esc closed slash/mentions only, `/` focused composer, Cmd+K ✓ | Esc cancels reply then closes menu (field, menu, and window levels); `/` outside inputs opens the command palette; Cmd+K unchanged | Composer.tsx, `src/App.tsx` (`/` → palette) |
| Generate-an-image arming + persistence | existed | unchanged | prefs `imageTool` |
| Send-failure honesty (retry line, restore into empty box) | existed (`Not sent, tap to retry`) | unchanged | ConversationSurface |

Deliberate placement notes: the Talk toggle went in the menu, not the bar —
a bar button overflows the 310/296px narrow-split composer, wraps it
(composer 96→128px), and perturbs thread scroll anchoring (proven: 17px
scroll hysteresis → 20kpx screenshot diffs on the review-layout contract;
removing it healed all three). The reply button is an overlay
(`position:absolute`, `pointer-events` gated on hover/focus) so thread row
heights are pixel-identical (measured: namelines 20.6px before/after). The
tray (reply/clear/dictation) renders above the pill, never inside
`.composer-inner`, so the gated composer metrics never move — design gate
confirms 0 rows off.

## Commits (scoped, none pushed)

- `R27 desktop composer parity` — the ten files below and nothing else:
  `src/components/Composer.tsx`, `src/v2/ConversationSurface.tsx`,
  `src/v2/conversation.css`, `src/lib/composerCommands.ts`,
  `src/lib/talkAloud.ts` (new), `src/App.tsx`,
  `scripts/audit/fixtures.ts` (stand-in echoes `clientMessageId`, like the
  real backend stores it), `e2e/visual.spec.ts` (16-test `R27 composer
  parity` describe), `tests/v2/composer-commands.test.ts`,
  `tests/v2/talk-aloud.test.ts` (new).
- Left alone on purpose: `convex/lib/members.ts`, `.gitignore`,
  `tests/v2/aom-members.test.ts`, `httprobe.tmp.mjs`, `e2e/results-*/`
  (another worker's / generated).

## Backend rows (no `convex/` edits per the hard line — contract for the backend)

- **B1 replyTo:** `v2Workspace.sendMessage` should accept
  `replyTo: { messageId, sender, snippet }`, store it on the block payload,
  and return it in `getConversationSurface` payloads. Client workaround
  live now: `clientMessageId` (already a supported arg, stored on the
  payload) + a per-thread `v2-replymap:*` local map. Works same-session and
  across reloads on one device; cross-device/sync needs B1.
- **B2 clear:** `v2Workspace.clearThread` (or archiveThread) that hides a
  thread's blocks from the surface (History view later). Client confirm
  flow is done and calls `onClearRoom`; today that clears view-local state
  only (draft, optimistic, failed) and its copy says exactly that.
- **B3 image bytes:** the clone has no image worker. Fill path ready:
  action `v2Images.generate { threadId, prompt, tool }` → bytes to storage
  → upgrade the client's `status:"generating"` photo artifact (created with
  existing `v2Visual.createArtifact`, opened with existing
  `v2VisualWindow.openTab`) with the `storageId`. Open question for the
  backend: hold artifact creation until bytes arrive (kills the placeholder
  tab), or create-then-upgrade (needs artifact delete for Stop).
- **B4 dictation:** none needed (browser SpeechRecognition; test stubs it).
- **B5 voices:** none needed (client `v2-talk-voice` key; picker UI is a
  client follow-up, see below).

## Still off and why (non-empty, all disclosed)

1. **Long-paste text chips** (CV6 `PasteChipBar`): only *image* paste was
   briefed and built; long text pastes stay inline. Needs a v2 pill design
   call before building.
2. **Voice picker UI**: default synthesis voice only (`v2-talk-voice` is
   honored when set, but nothing sets it yet). Headless Chromium exposes no
   voices, so a picker would ship unverified; the toggle + playback + voice
   honor are verified, the picker waits for a voiced environment.
3. **`/clear` is view-local** until B2 (says so in its own confirm copy).
4. **Generated-image tabs show the wireframe placeholder** until B3 (stage
   handles null-src safely; verified offline).
5. **Reply quotes are per-browser** until B1 (same-device reload safe via
   the persisted map + echoed `clientMessageId`).

## Round notes (for the orchestrator)

- Two real bugs found by the gates, both fixed in-round: (a) the bar talk
  button wrapped narrow composers and shifted thread scroll (anchoring
  hysteresis) — moved to the menu; (b) a bisect revert dropped the user
  branch's quote render — caught by the new reply test, restored, probe
  code removed (verified no `__dbg`/`__pins` remains in `src/`).
- Two e2e infra facts worth keeping: this Chromium ships *both*
  `SpeechRecognition` and `webkitSpeechRecognition` natively (a stub must
  cover both or the component — correctly — prefers native and the stub
  never fires); and `reuseExistingServer` means back-to-back runs share
  stand-in module state — the suite is green on fresh servers twice, which
  is the result reported above.
