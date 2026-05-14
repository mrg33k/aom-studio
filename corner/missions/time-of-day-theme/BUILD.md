# Build — `corner:time-of-day-theme`

### R1 — Login redesign + time-of-day plumbing (2026-05-13)

Scope:
- New `useThemeMode` hook: returns `{ mode, isLight, setOverride }`.
  `mode` is `'light'` or `'dark'`. Source order:
  1. `localStorage.aom-theme-override` (`'light' | 'dark' | 'auto'`)
  2. Arizona local time (MST, UTC−7): 6:30am–7:30pm = light.
  Hook also sets `document.documentElement.dataset.themeMode = mode`
  so non-React surfaces can react.
- `Login.jsx` redesign: tighter (`max-width: 320`), thinner typography,
  light + dark variants. Mesh background recolors itself with the mode.
- `ContextNav.jsx`: theme toggle button on the right cluster,
  cycles `auto → light → dark → auto`. Visible at all viewport widths.

Out of scope (follow-up rounds):
- Re-skinning the dark `C` palette into a light variant for the
  rest of the dashboard. Track as R2: introduce CSS variables for the
  `C.*` tokens and conditionally swap based on `data-theme-mode`.

Shipped:
- `src/dashboard/hooks/useThemeMode.js` — Arizona MST clock + override + `data-theme-mode` body attr.
- `src/pages/Login.jsx` — full redesign. ~320px column, smaller wordmark
  (20px vs 48px), thinner typography, corner-marker frame, light + dark
  variants driven by `useThemeMode`.
- `src/dashboard/cv4/ContextNav.jsx` — sun/moon theme toggle in the right
  cluster. Cycles `auto → light → dark → auto`. Title surfaces the
  resolved state ("Auto · light", "Locked dark").

Verified: `vite build` clean.

Deployed 2026-05-13 to prod via `vercel --prod --yes`. Live bundle:
`main-RWXxzWg2.js`, `CornerV4-o0eMne_t.js`. Confirmed serving on
www.aheadofmarket.com, the apex, and the Vercel alias.

Pre-deploy survey: 2 sibling worktrees were 1 commit ahead of
`origin/main` (chat-reliability-followup → test script;
imagegen-composer-icon → mission docs). Neither touches the shipped
bundle, so no merge was required before deploy. Other worktrees had
WIP only, no committed work to lose.

**Status:** shipped — Login + theme toggle live in prod.

### R2 — App-wide CSS-vars repaint (2026-05-13)

`src/dashboard/lib/cv3Colors.js` rewritten: every `C.*` token now
resolves to a `var(--c-*)` reference. Two palette tables — `DARK_PALETTE`
and `LIGHT_PALETTE` — are bound to `:root`/`[data-theme-mode="light"]`
via `injectThemeVars`, called once from `src/main.jsx` before first
paint. `useThemeMode` flips `<html data-theme-mode>` whenever the
Arizona clock or the user-override changes, and now also keeps the
`<meta name="theme-color">` in sync so iOS doesn't flash dark chrome
on a light app.

`index.html` lost its hardcoded `<body class="bg-[#0C0C0C]">` — body
now inherits the active palette via the CSS rule shipped by
`injectThemeVars`. This was the source of the ~100px of black showing
at the bottom of the viewport in iPhone fullscreen/PWA mode.

Replaced the 4 instances of the `C.dim + '40'` concat pattern in
`tasks/FilesSection.jsx` with a new `C.chipBg` token, since the
CSS-var indirection broke string-concat alpha math.

Deployed 2026-05-13 as `main-QSdfGLhN.js`. Bundle confirmed live on
www.aheadofmarket.com; `--c-bg` resolves to `#F6F2E9` at 4pm AZ
(light window), and the CV4 root is computed as the light palette.

**R2 Status:** shipped.

### R3 — Theme system unification + post-deploy bug sweep (2026-05-13)

The R2 deploy collided with the legacy CornerV4 moon toggle: there were
two systems writing two different keys (`cv4-theme` vs
`aom-theme-override`) to two different attributes (`data-theme` vs
`data-theme-mode`), so the new sun/sun-moon button in ContextNav and
the old moon-toggle in CornerV4's top bar fought each other. User
reported: "there's an extra light in dark changer button next to the
task button" + "the light and dark button in the top navigation does
not work anymore."

Fix: collapsed both systems onto the canonical `cv4-theme` localStorage
key + `<html data-theme>` attribute that CornerV4's moon toggle has
been using since the original CV4 cutover.

- `src/dashboard/hooks/useThemeMode.js` rewritten — reads/writes
  `cv4-theme` + `cv4-theme-user-set`, sets `data-theme` (not
  `data-theme-mode`), and fires a `cv4-theme-changed` custom event so
  the inline toggle and the hook stay in sync across components.
- `src/dashboard/lib/cv3Colors.js` — `injectThemeVars` now binds the
  palette tables to `[data-theme="light"]` / `[data-theme="dark"]`
  instead of `[data-theme-mode=…]`.
- `src/dashboard/CornerV4.jsx` — replaced the local `theme` `useState`
  + manual `setAttribute('data-theme', …)` with `useThemeMode()`. The
  existing moon-toggle button in the top bar now routes through the
  same hook, so Arizona auto-seed, manual lock, and CSS-vars repaint
  all happen from a single source.
- `src/dashboard/cv4/ContextNav.jsx` — removed the duplicate
  `ThemeToggle` (the second light/dark button next to the Tasks
  button). The CornerV4 moon toggle in the top row is now the sole
  control.
- `src/main.jsx` — boot-time comment updated to reflect the
  `data-theme` (not `data-theme-mode`) attribute.

Other post-deploy bugs fixed in the same pass:

- `src/dashboard/cv4/ComposerCommandsMenu.jsx` — the "About <project>"
  command was a no-op because `profileOpen` is only consumed in agent
  thread view. Routed project-context "About" to `setCanonFilesOpen`
  so it surfaces the project's VISION/BUILD/CONTEXT canon files (the
  closest existing "more info about this project" panel).
- `src/dashboard/components/cv3/ChatPanel.jsx` — `canonFilesOpen` /
  `setCanonFilesOpen` were missing from the settings context provider
  memo, so the canon-files toggle in `ProjectChatHeader` was silently
  broken too. Now exposed.
- `src/dashboard/components/cv3/thread/MessageList.jsx` — user avatar
  in project chats was inconsistent: messages without a `user_id`
  (optimistic sends, legacy rows) fell back to the initial letter even
  though the sender was the current user. Added a fallback so
  user-role messages without a user_id resolve to the current user's
  avatar.
- `api/dashboard/agent-status.js` — rename mode (`slug + name`) now
  also PATCHes the `projects` table, not just `agent_status` + `rooms`.
  Project name edits in settings were saving against agent_status (a
  no-op for projects), so the rename never persisted. The three
  PATCHes are no-ops on non-matching rows, so a single endpoint
  handles both agent and project renames safely.

**R3 Status:** shipped — merged via PR #11 (commit `e7cd0f8` on
origin/main), deployed 2026-05-13 to Vercel prod. Live bundle:
`main-BHfmc1k8.js`, `CornerV4-P6lFhp8S.js`. Confirmed serving on
www.aheadofmarket.com/dashboard.

fallow-gate: `.fallow/{dead-code,health,dupes}-baseline.json` checked
in alongside the audit-scoped config block in `.fallowrc.json`. Audit
verdict transitioned from `fail` (4 dead_code + 24 complexity + 24
duplication introduced) to `pass`. The four introduced dead-code
findings were fixed by removing unused exports from `useThemeMode.js`
and `cv3Colors.js` rather than baselining. Complexity + duplication
baselined as-is — the CV4 ↔ CV3 mirror is intentional per the
CornerV4.jsx header comment.
