# Brief R59-native-visual-fixes — Patrik's phone review (2026-09-08 eve), the visible half must look right

Mission: `corner:corner-v2` (native lane). Folder: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`.
Read `LOOP.md`, `rounds/R42-native-cv6-composer-bubbles-loader.md`, `rounds/R43-native-home-first-and-eye.md`,
`rounds/R56-native-view-state-and-website-video.md`, `SPEC-visual-window-companion.md`.
Automated runs: iPhone 17 Pro `971E7446-…`, "iPhone 16e (tests)" `4818124A-…` — NEVER Patrik's 16e `0A05C9AA-…`.
Report: `rounds/R59-native-visual-fixes.md`. This is Patrik's DIRECT review of the installed TestFlight build —
he is the gate; match what he asked, then ship build 22.

You are a headless worker, BUILDER for the native iOS app (SwiftUI). Nobody will answer questions.

## Patrik's list (verbatim intent, in his order)
1. **Composer is wrong.** It must be the SAME composer as the earlier builds: the **command button** (in our
   CV6 styling), the **Plan and Work** toggle, the **model button**, the **attachment button**, and the
   **send button** — all present, all styled. Restore the full composer row (this has regressed before —
   R42 was supposed to hold it).
2. **Blue box behind the composer, tucked underneath — looks like a glitch.** Remove/fix it (likely the
   composer glow/backdrop rendering as a hard blue box instead of a soft tinted gradient).
3. **Files don't load on iPhone.** Pull-ups / documents do not open. Make files open on the phone (the
   gateway `/gateway/open` + the phone document reader; markdown must render, not QuickLook plain text).
4. **The FaceTime box should be TALLER.** Patrik marked it in red. This reverses R56's 16:9 374×210 band —
   he wants the taller stage (R43 was ~281 tall). Make the FaceTime/website box taller per his marks; update
   the gate anchor + metric to the taller height, not 16:9.
5. **Move the Review button** to where Patrik's arrow points (get his annotation). **The context window's top
   tabs must be ONLY "Preview" and "Context"** — remove any other tabs up there.
6. **Menu logo bigger; the New and Project buttons smaller.** Rebalance the top-nav sizing (logo up, the two
   buttons down).
7. **Agent messages look like a mess of unstyled text — no box, no styling.** Restore the agent message
   bubble styling (the CV6 bubble: name/time, body 15/22, the card/box). This is a major "looks broken"
   regression.

## From the annotated screenshots (Patrik, 7:02-7:31 PM — read these, they pin the intent)
- **#3 files don't load** = the Visual Window shows the RAW ARTIFACT ID ("0e2558f3-…-64f6ae385ea3" over the
  word "data") instead of the document. The tab opens; the reader renders the id, not the content. The phone
  document reader must render the file (markdown/html as a real reader, like desktop's Dracula reader), never
  the id string. This is the top functional break.
- **#4 FaceTime box** is a SMALL black empty rectangle top-right ("AOM — Brand Guidel…" header over black).
  Patrik's red box wants it much TALLER (about half the screen) AND it must render the doc content, not black.
  This reverses R56's 16:9 374×210 — taller stage, content-filled.
- **#5 tabs + review:** the context window's top row currently shows **Preview · Context · Review · ✕**.
  It must show ONLY **Preview · Context** (+ the ✕). The "Review" affordance MOVES DOWN to the content as a
  **"Leave a review"** button (Patrik's arrow points from the top "Review" down to the file area; he wrote
  "leave a review"). The "Opened <title> in the Visual Window - <url>" agent line is crossed out — don't dump
  the raw URL line in the thread; the open is Visual-Window chrome, not a message.
- **#7 agent messages:** user messages ARE styled (blue bubble); AGENT messages are bare plain text with no
  bubble/box/card. Restore the agent message bubble (name/time header + the card). This is the biggest
  "looks broken."
- **#6 nav:** the "Corner" wordmark/logo top-center is too small (make it bigger); New/Project not shown here
  but per Patrik make them smaller relative to the logo.
- **#1 composer** (home + thread): shows only a sparkle + mic + send. Missing the command button (CV6 style),
  Plan/Work toggle, model button, attachment button. Restore the full row.
- **#2 blue box:** a hard blue rectangle/gradient peeks below the composer pill (bottom of screen) — the glow
  is rendering as a boxy blue block, not a soft tinted fade. Fix or remove.
- **Meta (for the guard):** R43/R8 shipped GREEN design gates + UI suites with ALL of the above broken. The
  gate/suite coverage missed the composer row, the agent bubble, and the document-renders-content check. The
  regression anchors this round MUST assert these exact states so a green gate can never again hide them.

## Code pointers (diagnosed by the orchestrator)
- **#7 agent bubble:** the v2 thread renders each message through `V2EventRow` (`Corner/Views/ChatView.swift:3512`),
  NOT through `MessageBubbleView` — which already has the correct agent bubble (avatar + name in agent color +
  frosted `agentBubble` surface + hairline border + left accent bar, `MessageBubbleView.swift:91-108,145-192`).
  Restore that bubble treatment in `V2EventRow`'s agent branch (mirror MessageBubbleView; do not just call it —
  it's the legacy row). User rows already read as styled bubbles.
- **#1 composer** lives in ChatView's v2 composer (search the composer/GlobalInput area); the earlier CV6
  composer row (command + Plan/Work + model + attachment + send) is the target — check `V2CV6Polish.swift` and
  `R42-native-cv6-composer` for the ratified shape.
- **#3 document render / #4 FaceTime:** the native Visual Window / document reader (VisualWindow + the reader
  view) shows the artifact id instead of the file; the FaceTime PiP is `V2FaceTimeWindow.swift`.

## How to work
- Get Patrik's annotated screenshots (the red marks / arrow) before guessing #4 and #5 geometry — ask via
  the handoff channel or match the described intent; do not invent a placement.
- **Regression guard (Patrik's zoom-out):** for the composer (command menu + Plan/Work + model + attachment
  + send) and the agent message bubble, add standing UI-test/design anchors that FAIL if any piece
  disappears again. These have regressed repeatedly — a guard per piece is the point of this round.
- Gates (targeted): units; the composer/entry/message/Visual-Window UI suites you touch + yours; one
  `node tools/native-design-vs-sim.mjs` pass on the 390 test sim. The FULL suite + design gate run once
  before the orchestrator ships build 22.
- Stage scoped paths + regenerated `project.pbxproj`; commit on aom-studio; never push; never install to a
  device; simulators only. Report: before/after PNGs for every item, gates, commit, "for the orchestrator",
  "still off".
