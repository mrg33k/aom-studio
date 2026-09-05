# Brief R1-web — close P001/P002/P004 and photograph the top coverage gaps

Mission path: `corner:corner-smooth-loop`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-smooth-loop/`
Read, in this order: `LOOP.md`, `punch-list.md`, `rounds/R0-web.md` (§5 coverage gaps, §6 first
impressions), `features.md` (web rows with `web test = none`), `rounds/R0-inventory.md` §"Offline
stand-in limits". Write your report to `rounds/R1-web.md`.

You are a headless worker. Nobody will answer questions. Blocked = write it in the report and stop.

## Where things are

- Repo: `/Users/aom-inhouse/aom-studio-transfer/corner-convex` (git, `main` at `2efc452`, clean, pushed).
  Work directly on `main`. Stage only paths you changed (never `git add -A`/`.`). Never push. Never
  touch `convex/`. Never deploy.
- Harness: `npm run e2e` (36 tests, all green on this Mac as of R0). Config `playwright.config.ts`
  (projects `iphone-15-pro`, `iphone-se`, `desktop`; `maxDiffPixelRatio: 0.01`). Spec
  `e2e/visual.spec.ts` (`boot()`, `layoutContract()`, screenshot tests). Baselines
  `e2e/__screenshots__/<project>/<name>.png`. Offline stand-in: `scripts/audit/vite.config.ts` +
  `scripts/audit/mock-convex-react.tsx` + fixtures in `scripts/audit/` (query params such as
  `audit_loading=1` switch states; read the mock to learn the switches and add new ones as needed).
- App: `src/routes/*` (Home, Chat, Auth, Settings, Email, Files, Tracker, Notifications, Onboarding,
  NotFound), `src/components/*`, `src/lib/auth.tsx`, `src/polish.css`, `src/index.css`.
- Kill a leftover server with `lsof -ti :5173 | xargs kill`.

## Part A — punch-list fixes (do these first, in order)

**P001 (silent test).** `e2e/visual.spec.ts` asserts `.unread-badge` count 0 but the code renders the
unread dot as `.rrow-dot` (`src/routes/Home.tsx:75`). Fix: assert on the real selector, AND add a
fixture room with unread so the positive case exists: the dot is visible on that row, absent on read
rows, and the row is photographed (`home-unread.png`). Read the fixtures in `scripts/audit/` to add the
unread room without disturbing existing baselines (append, do not reorder existing rooms; if a baseline
must change because the list grew, say so in the report and regenerate only that one).

**P002 (swallowed error).** `src/routes/Chat.tsx:143` sends the tool follow-up with `userId: null as
any`, the backend rejects it and the `catch {}` hides it. Fix: pass the signed-in user's id from
`src/lib/auth.tsx` the same way the normal send does, and surface a failure the same way a normal send
failure should (see Part B item 4 for that UI; if no send-failure UI exists yet, build it once and use
it for both). Add a test: a stand-in switch that makes the mutation reject, then assert the inline
failure state is visible and photograph it (`room-send-failed.png`).

**P004 (dead CSS rule).** `src/polish.css:32` `.main > * { animation: none }` never applies because
`src/index.css:372` wins by import order. Decide: the 0.2 s enter fade is intended (it is), so delete
the dead override and leave a one-line comment in polish.css saying the enter motion lives in
index.css. No visual change expected; the suite must stay green without baseline changes.

Update each row in `punch-list.md`: `status` -> `fixed (R1)` + `evidence: <absolute png path>`.

## Part B — coverage (each item = a test + a photographed state + a `features.md` update)

Do as many as you can in order; stop cleanly when you reach ~80% of your step budget and report.
For every new screenshot test: `npx playwright test --update-snapshots --grep "<exact title>"` to
create its baselines, then a full `npm run e2e` at the end must be green. Reuse `boot()`. Name
screenshots `<area>-<state>.png`. Keep each test independent. Add the `states to check` that the
stand-in can produce; if it cannot (needs a real backend), say so in the report rather than faking it.

1. **Sign-in page** (`src/routes/Auth.tsx`, `/auth`): empty, invalid email message, "check your
   email" state, light theme. Plus a **timing measurement**: from `page.goto("/")` (signed-in
   fixture) to the first room row visible, and from `/auth` to the form being interactive; print
   both in the test output (`console.log`) and put the numbers in the report. This is Track 2's
   "sign-in feel" baseline.
2. **New-room flow** (`Home.tsx:140,169,189`): the `+` button, composer-created room, agent room;
   photograph the sheet/modal and the resulting room header.
3. **File upload**: paperclip -> pick a file (use `setInputFiles` on the hidden input) -> the
   attachment chip/preview in the composer, and the sent message with the attachment; make the
   stand-in's `generateUploadUrl`/`uploadFile` succeed offline (return a fake URL).
4. **Send failure state**: a stand-in switch (e.g. `audit_fail_send=1`) that rejects `sendMessage`;
   the UI must show an inline error on the bubble or composer with a retry; photograph it. If no such
   UI exists in the code, build the minimal one: the optimistic bubble stays, gets a small "Not sent,
   tap to retry" line in the error colour, and retry resends. Keep it in the existing component
   language (`src/components/*`, tokens in `index.css`).
5. **Settings** (`src/routes/Settings.tsx`): profile, theme picker, usage, sign-out button, in dark
   and light.
6. **Email tab** (`src/routes/Email.tsx`): inbox list, one detail open, compose modal.
7. **Themes on every route**: dark/light/glass for Files, Settings, Email, Tracker, Notifications,
   Onboarding, Auth (one screenshot each per theme on `iphone-15-pro` and `desktop` only, to keep
   the suite under ~4 minutes).
8. **Palette with a query**: type a room name, results visible, tap the first result navigates;
   empty-results state.
9. **Empty room list** (`Home.tsx:222-224`): a stand-in switch for zero rooms; photograph.
10. **Room loading skeleton** (`MessageSkeleton`): `audit_loading=1` on `/room/r6`; photograph.
11. **Long message wrapping**: fixture message with a 200-char unbroken token and a 1,500-char
    paragraph; assert no horizontal overflow (`scrollWidth <= clientWidth` on the thread) and
    photograph on `iphone-se`.

For each, add/replace the `web test` cell in `features.md` for the matching `F###` rows (find them by
area and name) and fill `shot web` with the baseline path.

## Report `rounds/R1-web.md`

Per Part A item: cause, change (file:line), test, evidence path. Per Part B item: done / not done
(why), test titles added, baseline paths, anything you saw in the new frames that fails the bar
(one line each, no fixes). The two timing numbers from B1. Final `npm run e2e` summary line(s) (must
be green). Suite duration.

## Commit

On `main`, scoped paths only (`e2e/`, `src/`, `scripts/audit/`, `playwright.config.ts` if touched).
One commit for Part A (`fix(corner:corner-smooth-loop): R1 P001 P002 P004 …`) and one for Part B
(`test(corner:corner-smooth-loop): R1 coverage — sign-in, new room, upload, send failure, …`).
Never push. The report and `features.md`/`punch-list.md` live outside the repo; leave them for the
orchestrator.

## Hard rules

- Never loosen a threshold or tolerance, never skip or delete a test, never regenerate a baseline you
  did not intentionally change (say which ones and why).
- Never touch `convex/`, never deploy, never edit outside `corner-convex/` except the mission files named.
- Kill the dev server when done.
