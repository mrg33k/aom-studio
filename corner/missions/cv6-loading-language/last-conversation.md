## 2026-07-14 - R1 unified loading language

Claude/EA asked for one branded fullscreen loading language across Corner CV6, with a wordmark-first `Corner.` reveal, token-only theme support, reduced-motion fallback, mobile safe areas, and a 10s honesty watchdog.

Built `src/dashboard/cv6kit/FullscreenLoading.jsx`, added shared `.cv6-loading*` CSS to `cv6kit/kit.css` and `cv6next/cv6.css`, replaced the shared template loading fragment, added a template-level watchdog in `TemplateScreen`, and wired the primitive into app boot, Suspense fallback, Tracker, Files, Command, Review, Support, and file-opening placeholders. Empty/error/unconfigured branches were left intact.

Verification: `npm run build` passed. `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed, 2 tests. A standalone browser theme probe was blocked by macOS sandbox launch permissions, but the implementation uses the existing CV6 token/theme selectors for dark, light, and glass.

## 2026-07-14 - R2 theme-correct first paint

Claude ran the visual pass and found two defects: the boot loader ignored persisted light/glass theme and cold-started as a black void until the JS bundle mounted.

Fixed by adding a pre-React static loader shell to `index.html` for dashboard-style routes and to `dashboard.html`, reading `localStorage.cv6-theme` in a tiny head script before first paint, and initializing/removing that shell from `FullscreenLoading` when React takes over. The static shell is intentionally non-animated; the React primitive remains the animated version.

Verification: `git diff --check` passed. `npm run build` passed. The practical audit command completed locally, but external visual/browser verification remains with Claude.
