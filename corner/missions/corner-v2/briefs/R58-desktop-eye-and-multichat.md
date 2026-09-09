# Brief R58-desktop-eye-and-multichat — the eye on every desktop chat, and condensed multi-chat with one context window

Mission: `corner:corner-v2` (desktop lane). Folder: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`.
Read `LOOP.md`, `SPEC-visual-window-companion.md` (Patrik's spec), `rounds/R55-backend-view-state-and-agent-window.md`,
`rounds/R44-desktop-artifact-link-and-glow.md` (the desktop round you extend), `punch-list.md` rows **L038** and **C016**.
Tree: `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration` (HEAD after the R44-desktop commit).
Report: `rounds/R58-desktop-eye-and-multichat.md`.

You are a headless worker, BUILDER for the desktop web app. Nobody will answer questions.

## Backend already shipped (do NOT edit `convex/`; live on `brilliant-scorpion-163`)
- `v2Visual.setViewState({threadId, mode: facetime|full|hidden, tabId, page, scroll})` and `getSession`
  (returns `mode`, `activeTab`, `scroll`). The bridge narrates "BOTH LOOKING AT …" and writes `mode=hidden`
  on move-on; opens arrive as `v2Visual.openTab`.

## Build
1. **The eye on every chat (L038).** Top-right of every desktop chat, an eye icon. Tap once → FaceTime mode
   (a compact floating preview of the active tab, top-right, draggable within the pane); tap again → the full
   context preview (today's Visual Window). Mode persists per thread via `setViewState mode`. The client
   publishes mode/tab/page/scroll (debounced) and consumes the agent's open (`openTab` → raise + focus) and
   minimize (`mode=hidden` → collapse) without polling races; the next reply already names the current view
   (pack `BOTH LOOKING AT`), so verify a reply speaks to the open tab/page.
2. **Condensed multi-chat (L038, ≤ 8).** The person can condense several chats (max eight) and use them at
   once. Exactly ONE chat owns the context window at a time; opening its context window covers every OTHER
   chat but NOT the active conversation; closing it restores access to the others. Switching the owning chat
   moves the single context window. Keep it keyboard- and screen-reader reachable.
3. e2e (offline stand-in): the eye cycles FaceTime → full and persists; publishing writes view state; an
   agent `mode=hidden` collapses the window; exactly one context window across ≤ 8 condensed chats; closing
   it restores the others.
4. **Regression guard (Patrik's zoom-out, 2026-09-08 — "stop running in circles").** The desktop front end
   has silently lost features between rounds (the composer command menu + Plan button vanished twice,
   including in the design files). Add a standing e2e/vitest assertion for every composer feature this build
   relies on — at minimum the composer **command menu** and **Plan button** must have a test that fails if
   they disappear. A restored feature is not done until a guard makes it impossible to drop silently.

Gates: lint 0 errors, tsc clean, vitest, focused offline e2e (`PW_PORT=5174`, `--output e2e/results-orch`,
ONCE at the end), `npm run test:design` 0/0 on your preview (prebuilt deploy,
`VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud`,
`VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site`), live suite 11 pass / 0 fail. Commit scoped
on `corner-v2-integration`; never `--prod`; no `convex/` edits. Report: before/after PNGs (eye modes, the one
context window over condensed chats), gates, commits, "for the orchestrator", "still off".
