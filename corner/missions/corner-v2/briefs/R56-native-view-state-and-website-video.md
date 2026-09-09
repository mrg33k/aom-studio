# Brief R56-native-view-state-and-website-video — the phone publishes what it's showing, follows the agent, and shows a website like a horizontal video

Mission: `corner:corner-v2` (native lane). Folder: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`.
Read `LOOP.md`, `SPEC-visual-window-companion.md` (Patrik's spec), `rounds/R43-native-home-first-and-eye.md`
(the eye + Visual Window you extend), `rounds/R55-backend-view-state-and-agent-window.md` and
`rounds/R54-testflight-20.md`, `punch-list.md` rows **P094-P095** and **C016**.
Automated runs: iPhone 17 Pro `971E7446-…`, the 390 test sim "iPhone 16e (tests)" `4818124A-…` — NEVER
Patrik's 16e `0A05C9AA-…`. Report: `rounds/R56-native-view-state-and-website-video.md`.

You are a headless worker, BUILDER for the native iOS app (SwiftUI). Nobody will answer questions.

## Backend already shipped (do NOT edit `convex/`; it is live on `brilliant-scorpion-163`)
- `v2Visual.setViewState({threadId, mode: facetime|full|hidden, tabId, page, scroll})` — authenticated, tenant
  scoped. Writes the per-thread view state. A new tab resets scroll to 0.
- `v2Visual.getSession` now returns `mode`, `activeTab {tabId,title,kind,page,scroll}`, and `scroll`.
- The chat bridge reads this: the pack names "BOTH LOOKING AT: <title> …", and when the person moves on the
  agent calls `setViewState mode=hidden` (the minimize event). Opens still arrive as `v2Visual.openTab`.

## Build
1. **Publish view state (P094/C016).** The native client writes `v2Visual.setViewState` whenever the person
   changes what they are looking at, debounced (~300 ms), no polling races:
   - eye mode change (FaceTime / full / hidden) → `mode`.
   - selecting a tab → `tabId` (scroll resets server-side).
   - turning a page (pdf/deck) → `page`.
   - scrolling a document/site reader → `scroll` (throttled).
2. **Consume the agent's window events (P095/C016).** Subscribe to the thread's visual session:
   - `openTab` / a new active tab from the agent → raise the window in its persisted mode (FaceTime if hidden,
     per R43's agent-driven-open rule) and focus that tab.
   - `mode == "hidden"` written by the agent (the move-on minimize) → the window minimizes without the person
     tapping the eye. No flicker, no fight with a local gesture in flight (last-writer-wins on the person's
     own action within the debounce window).
3. **Website as a horizontal video (P094/P095).** A `site` tab in FaceTime/full mode renders the desktop page
   as a scrollable horizontal 16:9 view about one-third of the vertical phone's height, scrollable inside
   (the desktop width scaled to fit; the person scrolls the page within that band). Not a full-screen browser.
4. Unit + UI tests: view-state publish on each of the four changes; the agent open raises + focuses; the
   agent `mode=hidden` minimizes; the website-video band geometry (≈ 1/3 height, 16:9, scrolls inside). Gate
   anchors for the website-video band and the minimized/raised states.
5. **Regression guard (Patrik's zoom-out, 2026-09-08 — "stop running in circles").** The front end has
   silently lost features between rounds (the composer command menu + Plan button vanished twice). For every
   composer/entry/eye feature this build relies on, add a standing UI-test or design anchor that asserts it
   is still there — at minimum the composer **command menu** and **Plan button** must have a test that fails
   if they disappear. A restored feature is not done until a guard makes it impossible to drop silently.

Gates (targeted, per the 8:30 PM rule): units; ONLY the UI suites covering the screens you touched (the eye /
Visual Window / website tab) + yours; `node tools/native-design-vs-sim.mjs` ONCE on the 390 test sim. No full
suite set, no second pass, no iPad column — the orchestrator runs those once before the TestFlight ship.
Stage scoped paths + regenerated `project.pbxproj`; commit on aom-studio; never push; never install to a
device; simulators only. Report: before/after PNGs (publish, agent-raise, agent-minimize, website band),
gates, commit, "for the orchestrator", "still off".
