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

## 2026-07-14 - Delegated local Files empty-state audit

Mission path: `corner:truth-contracts`.

Goal attempted: from desktop and mobile CV6, open Files and sibling data-heavy tools and understand whether the panel is offline, empty, or loading without misleading data-loss language or broken navigation.

Audit findings ranked by frequency x severity x impact:

1. P1: Files showed "We couldn't load your files / Your connection dropped" in safe local/no-Supabase mode. Evidence came from the desktop probe against `/dashboard?cv6=1`: Vite was serving non-JSON/source for tenant-gated API routes, but the UI presented it as a dropped connection.
2. P2: Mobile Files opens the project picker first; the empty copy appears after tapping "Personal 0 files." That is an extra click, but the state is honest and the Menu/Search controls remain available.
3. P2: Tracker and Command still show loading/empty local states when their live sources are unavailable. They stayed navigable in the sibling workflow and were not the highest-impact fix for this slice.

Fix shipped: `src/dashboard/cv6next/data/useOrganize.js` now treats absent Supabase as an explicit local empty Files mode. It skips tenant-gated Files/projects/uploads/mission-tree API calls, clears those arrays, and marks the panel loaded. Real configured sessions still fetch the mirror and still show real load errors.

Verification: ran `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` (2 passed, with desktop and mobile Files assertions for no dropped-connection banner and the empty workflow), then ran `npm run build` successfully. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - Tracker and Command empty-state audit

Mission path: `corner:truth-contracts`.

Goal attempted: from desktop and mobile CV6, open Tracker and Command in safe local/no-Supabase mode and see stable honest empty states instead of indefinite loading labels.

Audit findings ranked by frequency x severity x impact:

1. P1: Command stayed in `state='loading'` because `useWorldId()` returned `null` when Supabase was absent, so the screen rendered "Gathering your rooms..." instead of the empty ledger.
2. P1: Tracker initialized `status='loading'` / `spaceStatus='loading'` and only settled after tenant-gated API calls that are unavailable in local/no-Supabase mode.
3. P2: Hidden template loading text remains in the DOM after the ready state; the test now asserts visible empty states rather than absence of hidden template strings.

Fix shipped: `src/dashboard/cv6next/data/useCommandTracker.js` now gives local/no-Supabase mode a render-only `aom` world id, skips tenant-gated Command/Tracker polls and writes when Supabase is absent, initializes Tracker boards to empty, and disables create/update actions in no-Supabase mode. The audit spec now asserts Tracker and Command visible empty states on desktop and mobile.

Verification: `npm run build` passed. Claude ran external browser verification with `CV6_AUDIT_BASE=http://127.0.0.1:5199 npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line`; 2 tests passed in 9.6s. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - Review JSON normalization audit

Mission path: `corner:truth-contracts`.

Goal attempted: from desktop and mobile CV6, open Files/Review-backed panels plus sibling tools and keep the workflow understandable when local Vite serves API source/non-JSON bodies instead of real JSON.

Audit findings ranked by frequency x severity x impact:

1. P1: Review-backed data reads logged repeated `Unexpected token '/' ... is not valid JSON` errors for projects, missions-tree, and review-queue. Files still looked usable, but the console made the product appear broken and hid real regressions in noise.
2. P2: The visible desktop and mobile sibling journeys completed through Files, Tracker, Command, Scribe, and Home; the issue was misleading/error-noisy state rather than navigation breakage.
3. P2: Generic local missing-resource 404 console entries remain filtered as non-product noise in the practical audit test.

Fix shipped: `src/dashboard/cv6next/data/useReview.js` now guards read-only Review JSON parsing. Non-JSON successful read responses become empty/unavailable local data instead of thrown parse errors; Review mutation responses remain strict. The CV6 practical audit spec no longer ignores the old `Unexpected token '/'` JSON parse failure.

Verification: desktop and mobile Playwright probes completed the sibling journey without Review parse errors; `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed (2 tests); `npm run build` passed. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.

## 2026-07-14 - Email local workflow audit

Mission path: `corner:truth-contracts`.

Goal attempted: from desktop and mobile CV6, open Email, understand the inbox/campaign state, and return to sibling tools without misleading local errors, stale labels, duplicate empty copy, or broken navigation.

Audit findings ranked by frequency x severity x impact:

1. P1: Mobile Email showed "We couldn't reach your inbox / Your connection dropped" in safe no-Supabase local mode, while desktop Email showed the honest caught-up inbox. Same product state, contradictory meaning.
2. P1: Once the local state settled empty, mobile rendered the caught-up empty block twice because the support inbox template carried its own empty branch and the shared composer injected another.
3. P2: Mobile Email still titled the inbox "Support" even though the shared nav and Email shell present this as Email.

Fix shipped: `src/dashboard/cv6next/data/useSupportInbox.js` now treats absent Supabase as explicit read-only local empty data. `src/dashboard/cv6next/CornerCV6.jsx` can drop embedded state branches before injecting shared states, and mobile Email uses that path to avoid duplicate empty copy. `src/dashboard/cv6next/templates/support-inbox.html` now shows the visible title "Email."

Verification: desktop/mobile Playwright probes completed Email with one caught-up state and no dropped-connection banner; `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line` passed (2 tests with Email assertions); `npm run build` passed. No deploy, push, schema/data migration, secret rotation, external message send, or stored login/world/data mutation.
