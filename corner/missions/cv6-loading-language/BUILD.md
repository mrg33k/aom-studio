# CV6 Loading Language - Mission Build Plan

**Started:** 2026-07-14
**Mission path:** `corner:cv6-loading-language`

## Rounds

### R1 - Unified fullscreen loading language

**User goal:** Replace inconsistent Corner CV6 not-fully-loaded states with one intentional branded fullscreen loading language.

**Design gate:**

- Brand: Corner, the CV6 surface of the AOM dashboard.
- Font: Hanken Grotesk via the CV6 `--font-sans` token.
- This design is unmistakably Corner because it is built from CV6 tokens only: `--ground`, `--surface`, `--surface-2`, `--fg`, `--muted`, `--faint`, `--hair`, `--divider`, `--chip`, `--accent`, and `--accent-weak`.
- It renders through the existing theme attribute model for dark, light, and glass. The primitive accepts `data-theme` and has no hardcoded theme-breaking panel colors.
- Motion intention: wordmark-first reveal, `Corner.` in Hanken Grotesk, with a quiet progress rail that feels determinate without lying about exact progress. No generic spinner and no bouncing dots.
- Loading promise: the user should read "the app is alive and almost here," then the animation exits as soon as real state settles.
- Honesty rule: this appears only for genuine loading states. Empty, error, offline, unconfigured, and settled local-dev states keep their own treatments. A 10s watchdog changes the copy and stops the loop instead of animating forever.
- Mobile rule: safe-area padding is built into the primitive so full-viewport loading does not collide with iPhone top/bottom insets or jump on viewport changes.

**What was broken:**

- App entry showed an unbranded inline spinner.
- CV6 shared template loading used a small spinner/skeleton fragment with per-screen text like "Gathering your rooms…".
- Kit screens had inline spinner blocks for Tracker, Files, Command, and Review, producing a cheaper visual vocabulary than the rest of CV6.

**What this round is building:**

- Add one shared `FullscreenLoading` primitive in `src/dashboard/cv6kit/`.
- Add token-only `.cv6-loading*` CSS to `cv6kit/kit.css` and `cv6next/cv6.css`.
- Replace template shared loading with the new primitive markup.
- Wire app auth/Suspense boot and CV6 kit screen-level loading states through the same visual language.
- Preserve truth-contract settle behavior for Files, Tracker, Command, and Review.

**Verification:**

- `npm run build` passed.
- `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed, 2 tests.
- Old production loading strings were swept from `src/main.jsx`, `src/dashboard/cv6next`, and `src/dashboard/cv6kit`; only the audit assertions for retired tracker copy remain.
- Focused standalone Playwright theme probe was blocked by macOS sandbox browser-launch permissions: `bootstrap_check_in ... Permission denied (1100)`. Theme support was implemented through the existing dark/light/glass token variables and `data-app-theme` / `data-theme` selectors.

**Status:** shipped and verified for build plus existing CV6 practical audit.

### R2 - Theme-correct first paint

**User goal:** Fix boot-time defects from Claude's visual pass: no dark flash for light/glass users, and no black void before the JS bundle mounts.

**What was broken:**

- The React boot loader had no CV6 ancestor on first render, so it initialized dark even when `localStorage.cv6-theme` was `light` or `glass`.
- The document painted before the JS bundle loaded, so throttled cold starts showed a solid black screen before React mounted the branded loader.

**What changed:**

- `index.html` now has a tiny head script for dashboard-style routes (`/dashboard`, `/cvg`, `/cv6`) that reads persisted `cv6-theme` before first paint and sets `data-app-theme`.
- `dashboard.html` gets the same pre-React theme read and static loader shell.
- Both entry documents inline a static, non-animated `Corner.` loader card and rail using the same dark/light/glass token values.
- `FullscreenLoading` now initializes from persisted `cv6-theme` when no theme ancestor exists yet.
- The React loader removes `#cv6-boot-loader` in a layout effect so the static shell hands off to the animated primitive without lingering.

**Verification:**

- `git diff --check` passed.
- `npm run build` passed.
- `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` completed locally, but final visual/browser verification remains Claude's external pass per request.

**Status:** shipped for external visual rerun.
