# Handoff — Corner v2 iPhone review + session shipped work (2026-09-09)

**Source:** Patrik, reviewing the iPhone app (TestFlight **build 27** — build 28
is uploaded but not yet attached to testers, so a few of his items are already
fixed in 28 and just haven't reached his phone; flagged inline).
**Mission:** `corner:corner-v2`. **Repos:** iOS = `mrg33k/aom-studio`
(`ios-native/`); backend/desktop = `mrg33k/corner-convex`
(`codex/corner-v2-integration`, `convex/` + `src/v2/`); brain/hooks/skills =
`mrg33k/AOM-EA`.

This handoff has two halves: **A** = Patrik's punch list (what to build next),
**B** = what shipped this session and where.

---

## A. Patrik's iPhone punch list

Each item: what he sees → what it should do → where it lives → status.

### 1. Home "Get back to project" is not intelligent
- **Sees:** the first-run home shows 3 options — *Get back to Corner*, *Import
  context*, *Connect Tools*. "Get back to project" is dumb.
- **Should:** show a **recommended next action** = the actual logical next step
  for that project, and **remind the user where they were.** Not a generic
  "resume."
- **Where:** `ios-native/Corner/Views/V2HomeWelcome.swift` (the 3-option home) +
  `HomeComposerView.swift`. The "recommended next step" should come from the
  project's derived state card / ledger (the same "living state card" the
  gateway VISION describes), not be hand-written.
- **Status:** net-new.

### 2. "Import context" needs the full copy-prompt → paste → ingest flow
- **Sees:** clicking *Import context* doesn't do the real thing.
- **Should:** open a box with **"Copy instructions"** — the instructions are a
  ready-made prompt the user pastes into *their own LLM of choice*; it asks that
  LLM to export everything we want about them, in the format we want. It must
  feel friendly and effortless: click copy, go paste, come back. The box's next
  screen is a **"Paste it in"** button. On paste, Corner spins up a conversation
  that **ingests** the pasted data, **saves it in our organized format**, spins
  up **projects/missions** if needed, and **offers to get started.**
- **Where:** native entry in `V2HomeWelcome.swift`. The export prompt + the
  normaliser already exist in `AOM-EA/scripts/onboard_import.py`
  (`EXTRACTION_PROMPT` + `normalize()`) — wire the native box to that prompt for
  copy, and the paste path to the ingest → save → spin-up flow.
- **Status:** net-new UI; the prompt/normaliser backend exists (R67 item 4a).

### 3. Checklist button does nothing
- **Sees:** the composer's Checklist button is dead.
- **Should:** let the user **build a checklist message and send it to the
  agent.**
- **Where:** `ios-native/Corner/Views/ChatView.swift` (composer options row) +
  `V2ComposerExtras.swift` + `RoomChecklistPanelView.swift`.
- **Status:** net-new (the button was placed but not wired).

### 4. File opens should be a Step, never a message
- **Sees:** "Opening Wolfpack week 5" shows as a **Step** (good), but once open it
  posts a **message**: "Opened Wolfpack Week 5" with a huge link attached — feels
  bad.
- **Should:** just show **"Opened Wolfpack Week 5" as a Step** — no message, no
  raw link. **True for ALL file opens.**
- **Where:** `ios-native/Corner/Views/CommandsMenuState.swift` /
  `ChatView.swift` (open path). Ties to the standing rule *opened = rendered on
  the stage, not a tab+link* — the confirmation belongs in the step lane, not as
  a chat message with a URL.
- **Status:** net-new.

### 5. Connect buttons (Gmail / GitHub / Outlook) say "needs attention" and do nothing
- **Sees:** tapping *Connect* → "needs attention," no login, nothing happens.
- **Should:** actually **log us in / connect through a clean, tested flow.**
- **Where:** `ios-native/Corner/Views/V2ConnectionsSheet.swift` +
  `V2ArcadeConnectStore` → `arcade:initiateAuth` / `arcade:checkAuth` in
  `corner-convex/convex/arcade.ts`.
- **Status:** the buttons **render in build 28** (R67) and `arcade.ts` is fixed
  (browser UA, correct endpoints). But the live connect can't complete until the
  **corner-convex prod deploy** runs (Patrik's, classifier-gated) AND the OAuth
  round-trip is tested end-to-end. So: deploy first, then test the full flow;
  "needs attention → nothing" is expected until then.

### 6. No instructions to download the desktop companion app
- **Should:** the app should tell the user how to **get the desktop companion**
  (the machine-side runner that actually executes tools / reads the activity
  log).
- **Where:** net-new UI (home / connections / onboarding). The companion itself
  is specced but unbuilt — see `AOM-EA/corner/missions/gateway/COMPANION-SPEC.md`
  (3 decisions still Patrik's).
- **Status:** net-new; blocked partly on the companion existing.

### 7. Messaging "General" failed: "I couldn't finish that turn"
- **Sees:** messaged General, it read the project notes, and on the next step
  said **"I couldn't finish that turn."**
- **Should:** finish the turn. This is a real failure in the chat pipeline when
  reading project notes.
- **Where:** the chat bridge `AOM-EA/scripts/v2-team-bridge.py` (the pack build /
  turn loop) + the toolless brain path. Reproduce with a General message that
  triggers a project-notes read; capture the error.
- **Status:** net-new **bug** (highest priority — it's a hard failure).

### 8. "General" is a bad concept/name — the homescreen should morph into a project
- **Sees:** "General" feels too stiff; unsure what to do about it.
- **Should:** the **homescreen is a catchall.** When a user types there, the
  agent should **either attach the message to an existing project or offer to
  create one**, and **the room changes in front of their eyes with their last
  messages carried over.** (Patrik: "ask me questions about this if it's not
  clear.")
- **Where:** `V2HomeWelcome.swift` / `HomeComposerView.swift` → the room
  resolution logic (which project a home message lands in) + the transition
  animation carrying the thread over.
- **Status:** net-new. **OPEN QUESTION for Patrik:** the *name/replacement* for
  "General" (he's undecided), and confirm the morph behavior (does the home
  thread physically become the project room, or fork into it?).

### 9. Command menu: "Files in this conversation" clicks to nowhere + no model indicator
- **Sees:** *Files in this conversation* goes nowhere; also no sign of which
  model is in use or that it changed.
- **Should:** (a) Files opens the file list / Visual Window; (b) the command menu
  **shows the current model** and gives a **clear indicator when it actually
  changes.**
- **Where:** `ios-native/Corner/Views/CommandsMenuState.swift` +
  `ChatView.swift` (command menu) + `ChatViewModel.swift` (model state).
- **Status:** (a) the empty-sheet case was addressed in **build 28** (R63:
  no-tabs → Organize) — verify on 28; if it still dead-ends, re-open. (b) the
  **model indicator + change confirmation is net-new.**

### 10. "Generate an image" is only a description — needs full options
- **Sees:** the generate-image entry is just descriptive text.
- **Should:** present **full options** (the real generation controls).
- **Where:** `ios-native/Corner/Views/CommandsMenuState.swift` /
  `V2ComposerExtras.swift` / `ChatViewModel.swift`. Back it with the KIE pipeline
  (`AOM-EA/.agents/skills/kie/`) — which now does **image AND video** (Kling 3.0
  default); options should cover aspect, model, and (per the billing decision)
  surface that gen is metered/paid for walk-in users.
- **Status:** net-new UI; KIE backend ready (image always; video wired this
  session).

---

## B. What shipped this session, and where

All committed and pushed (0 unpushed across all three repos). Not yet *live* =
waiting on a Patrik-gated action, noted per item.

| What | Where | State |
|---|---|---|
| **Login/onboarding entrance animation** (staggered rise + brand glow, respects Reduce Motion) | `aom-studio/ios-native/Corner/Views/SignInView.swift` (+ `.decision.md`) | Built, sim-verified, decision-signed. **Shipped as TestFlight build 28** (uploaded). **Not live** until Patrik runs `corner/missions/corner-v2/tools/testflight-attach.py 28`. |
| **Ledger summarizer loop fix** (was writing garbage 8× over 14h; now skips its own template before the model runs) | `AOM-EA/scripts/hooks/ledger-append.py` | Fixed, verified on a 60-loop poison transcript, pushed to master. Live (it's a hook). |
| **KIE video generation** (Kling 3.0 default, t2v + i2v; reuses the image pipeline) | `AOM-EA/.agents/skills/kie/pipeline/kie.py` + `SKILL.md` | Wiring verified (mocked); pushed. A real render needs KIE credits (Patrik). |
| **Desktop-web port** of the composer + doc-loading fixes (Attach-left / Context+Checklist centered; HTML + extension-less docs render) | `corner-convex` `codex/corner-v2-integration` (commit 502b949) | Pushed. **Not live** until the prod deploy (Patrik). |
| **Arcade connect backend fix** (browser UA for Cloudflare-1010, correct authorize/status/execute endpoints) | `corner-convex/convex/arcade.ts` | Pushed. Live email/tool execute needs the prod deploy. |
| **Item-3 tool correction** (Hyperframes = HTML video; KIE = all gen; Higgsfield = internal lane, retiring) | `AOM-EA/.claude/playbooks/short-form-video.md`, `.agents/skills/higgsfield-generate/SKILL.md` (routing banner) | Pushed. |
| **Specs** for the two unbuilt items | companion: `AOM-EA/corner/missions/gateway/COMPANION-SPEC.md`; live-design: `aom-studio/corner/missions/corner-v2/LIVE-DESIGN-SPEC.md` | Written; each names the Patrik decisions the build waits on. |

### The three Patrik-gated actions that unblock the above
1. **Attach build 28** → `python3 aom-studio/corner/missions/corner-v2/tools/testflight-attach.py 28` (classifier-gated for me).
2. **Prod deploy** → `cd corner-v2-integration && CONVEX_DEPLOYMENT=prod:brilliant-scorpion-163 npx convex deploy -y` (lights up Gmail connect + the web fixes).
3. **KIE credits** (for real image/video generation).

---

## C. Open questions for Patrik (before building A)
1. **General/homescreen (item 8):** the name/replacement, and the exact morph —
   does the home thread *become* the project room, or fork into it, carrying the
   last messages?
2. **Import context (item 2):** confirm the target "organized format" for the
   ingested profile (is `onboard_import.py`'s current schema right?).
3. **Priority order:** item 7 ("couldn't finish that turn") is a hard failure —
   treat as P0? And is item 5 (real connect flow) blocked-until-deploy acceptable
   for now, or should a mock/tested flow ship first?
