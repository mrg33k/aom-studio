# Brief R39-desktop-surface-window — the web reads the newest 200 rows, not the whole thread, and shows earlier ones on demand

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R38-desktop-pixel-pass.md` (the round you extend), `punch-list.md` row **L030**,
`rounds/LEDGER.md` rows R37 → DBG-8. Tree: `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`
(HEAD `9e08a8c`, clean; production = this tree). Backend already deployed: `getConversationSurface`
accepts `limit` (1-200) and windows BOTH legacy links and blocks to the newest N, trimmed after the
merge (Wolfpack: 2.85 s / 1430 rows without it, 0.6 s / 40 rows with it). Report:
`rounds/R39-desktop-surface-window.md`.

You are a headless worker, BUILDER for the desktop web app. Nobody will answer questions.

- **Pass `limit` from every web reader.** `src/lib/workspace.ts` (`useConversationSurface` or its
  caller at line ~232) and `src/v2/VisualWindow.tsx:382` subscribe with no limit, so every new row on a
  big thread recomputes a 3 s query for every open tab and the first paint of the agent's step waits
  behind it (user-side first signal 6 s on Wolfpack while the service writes it at 0.6 s). Default 200.
- **"Earlier messages" affordance** at the top of the conversation when the window is full (exactly
  200 rows came back): a quiet row per the design's type scale, click → the reader raises its limit
  by 200 (state in the URL or component, not the backend). Scroll position holds when rows prepend.
  If the design export has no such row, draw it as a muted single line in the thread's left gutter
  rhythm and say so in the report — no new visual language.
- **The Visual Window reader** needs only artifacts/tabs from the surface; if it reads the surface
  just for those, pass `limit: 1` (or switch it to `v2Visual` artifact queries if one already exists)
  so it never pays for the thread.
- **Prove it on Wolfpack-sized data**: a fixture thread with 1,500 rows in the offline suite (seed via
  the existing helpers), an e2e that the first agent step paints within 1.5 s of arrival, and a live
  measurement on production's tester thread (read-only: sign in as `/tmp/corner-v2-e2e.env`'s account,
  time the subscription's first result with and without the window in the browser console; no sends
  on AOM project threads).
- **Native**: note in "for the orchestrator" what the iOS reader passes today (it reads the same query);
  do not edit native.

Gates: lint 0 errors, tsc clean, vitest (195+), offline e2e (`PW_PORT=5174`, `--output e2e/results-orch`,
ONCE at the end — a native UI run shares the machine), `npm run test:design` 0/0 on your preview
(`LIVE_BASE_URL`, prebuilt deploy with `VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud`
and `VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site`), live suite 11 pass / 0 fail.
Commit on `corner-v2-integration` with scoped paths; never `--prod`; never touch `neat-pony-216`; no
`convex/` edits (if the backend needs something, write the ask). Report: before/after numbers, PNGs
of the "earlier messages" row, gates, commits, "for the orchestrator", "still off and why".
