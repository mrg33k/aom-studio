# Truth Contracts - Last Conversation

## 2026-07-14

The user authorized a recurring ten-minute loop. First complete the truth-contract architecture work, then audit the Corner CV6 app screen by screen and tool by tool against each surface's intended user goal and begin fixing the highest-impact gaps with the same verified loop.

Guardrails: preserve logins and worlds, use a worktree, update BUILD before code edits, test each round, do not deploy or run destructive migrations without explicit approval, and never silently merge `q` with `qa`.

The user clarified that this is a practical product-quality mission, not a technical glance. Corner should feel simple, easy, very clean, snappy, and dependable. Frequent small breaks are the central problem. Each run must attempt real end-to-end workflows, capture friction and interruptions, simplify the experience, and verify the user's goal is actually completed.

## 2026-07-14 - Delegated CV6 product audit round

Mission path: `corner:truth-contracts`.

Goal attempted: open `/dashboard`, land in CV6, orient from Home, open current work, and move across Files, Email, Tracker, Command, and Scribe on desktop and mobile.

Audit findings ranked by frequency x severity x impact:

1. P0: direct `/dashboard` in Vite resolved to stale `dashboard.html`, which mounted `src/dashboard/main.jsx`/CornerV3 instead of the main router/CornerCV6. The visible user state was "Corner. Loading your workspace..." forever, so the primary workflow could not start.
2. P0: in safe local/no-Supabase mode, CV6 Home stayed on "Gathering your rooms..." because `useHome()` required a `worldId` even when no Supabase client exists.
3. P1: the auth gate could rely on a Supabase auth listener/session read that never settles, creating the same permanent loading trap instead of Login or CV6.
4. P2: local Vite API requests for Files/Review return serverless source text, causing offline/error states and console JSON parse noise; the shell stays navigable.
5. P2: some mobile sibling tool headers have visual menu/search icons without the same accessible labels as Home.

Fix shipped: `dashboard.html` now mounts the main app router (`#root` + `/src/main.jsx`) so `/dashboard` shares the CV6 route truth; `AuthGuard` resolves the initial Supabase session directly and uses a watchdog to avoid indefinite loading; `useHome()` no longer blocks forever on `worldId` when Supabase is absent.

Verification: started Vite in safe no-Supabase mode, ran `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` (2 passed: desktop/mobile CV6 journey), then ran `npm run build` successfully. No deploy, push, schema/data migration, secret rotation, or external message send.

## 2026-07-14 - Delegated mobile sibling controls audit

Mission path: `corner:truth-contracts`.

Goal attempted: from mobile CV6 Home, open Search, use the drawer to visit each sibling tool, and always have an obvious accessible way back to drawer/search without guessing or relying on hidden implementation selectors.

Audit findings ranked by frequency x severity x impact:

1. P1: Chat, Files/Organize, Tracker, Command, Settings, Scribe, and Review template headers used bare icon `div[data-action]` controls for Search/Menu/Back-style actions. They looked tappable but lacked consistent button semantics, keyboard activation, and accessible names.
2. P2: Home and Email already exposed labeled mobile controls, so sibling screens felt inconsistent even when the visual pattern was similar.
3. P2: local Vite-only API requests can still create offline/JSON parse states in data-heavy panels; this remains lower priority for the shell/navigation workflow because the sibling journey stays usable.

Fix shipped: normalized CV6 template action controls centrally in `src/dashboard/cv6kit/templateEngine.js`. Non-native `data-action` controls now receive button role/focusability, common labels such as Search/Menu/Back/Profile, and Enter/Space activation through the shared renderer instead of per-template patches.

Verification: restarted Vite in safe no-Supabase mode, ran `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` (2 passed, including role-based mobile Search/Menu interactions across sibling tools), then ran `npm run build` successfully. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.
