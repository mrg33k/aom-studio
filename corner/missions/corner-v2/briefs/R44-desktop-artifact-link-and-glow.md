# Brief R44-desktop-artifact-link-and-glow — a link opens straight to the file, and the composer gets its glow back

Mission: `corner:corner-v2` (desktop lane). Folder: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`.
Read `LOOP.md`, `rounds/R43-desktop-visual-window-opens.md` (the round you extend), `punch-list.md` rows **L037**
and the desktop ask in `corner/missions/gateway/rounds/G3-cards-tell-the-truth-and-files-open.md` §5.4. Tree:
`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration` (HEAD after `c0dc409`; production = R43 tree).
Report: `rounds/R44-desktop-artifact-link-and-glow.md`.

You are a headless worker, BUILDER for the desktop web app. Nobody will answer questions.

## Build
1. **`/c/<threadId>?artifact=<artifactId>`** opens the thread AND focuses that artifact's tab in the Visual
   Window (open it if no tab exists — `v2Visual.openTab` — then clear the param from the URL without a
   reload). Absent param = today's behaviour. The agent's "pull up" replies now carry exactly this link
   (`https://www.aheadofmarket.com/dashboard/c/<thread>?artifact=<id>` → 307 → corner-convex); the aom-studio
   redirect keeps the query string — verify with a curl.
2. **Composer glow (L037).** A soft moving gradient behind the composer pill, tinted with the project's accent
   (the sidebar avatar colour for that project; General = the app accent), ~140px tall fading to the ground
   upward, 8-12 s drift, 12-18 % opacity, a one-second brightening when a reply lands,
   `prefers-reduced-motion` → static tint. Reference the old CV4 `aom-studio/src/dashboard/cv4/GlassBackdrop.jsx`
   for feel, not code. Must not change any gated anchor (run `npm run test:design`).
3. e2e: a link with `?artifact=` lands on the focused tab (offline stand-in); the glow's presence and
   reduced-motion fallback.

Gates: lint 0 errors, tsc clean, vitest, offline e2e (`PW_PORT=5174`, `--output e2e/results-orch`, ONCE at
the end), `npm run test:design` 0/0 on your preview (`LIVE_BASE_URL`, prebuilt deploy with
`VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud` and `VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site`),
live suite 11 pass / 0 fail. Commit scoped on `corner-v2-integration`; never `--prod`; no `convex/` edits.
Report: before/after PNGs, gates, commits, "for the orchestrator", "still off".
