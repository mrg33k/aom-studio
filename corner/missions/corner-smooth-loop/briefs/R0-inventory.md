# Brief R0-inventory — the complete Corner feature inventory, both platforms

Mission path: `corner:corner-smooth-loop`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-smooth-loop/`
Read `LOOP.md` there first. You write exactly two files: `features.md` (overwrite the stub) and
`rounds/R0-inventory.md`. You change nothing else and you do not commit.

You are a headless worker. Nobody will answer questions.

## Sources (read all of them)

Web app: `/Users/aom-inhouse/aom-studio-transfer/corner-convex/src/` (routes, components, `polish.css`,
`App.tsx`/router), `/Users/aom-inhouse/aom-studio-transfer/corner-convex/FRONTEND-AUDIT.md`,
`/Users/aom-inhouse/aom-studio-transfer/corner-convex/e2e/visual.spec.ts` (existing tests; each `test(...)`
name is a coverage entry), `/Users/aom-inhouse/aom-studio-transfer/corner-convex/scripts/audit/` (the
offline stand-in: what data/states it can produce).

Native app: `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/ios-native/Corner/Views/*.swift`
(every screen and sheet), `Services/AppRouter.swift` (routes), `ios-native/README.md`,
`/Users/aom-inhouse/aom-studio-transfer/corner-convex/NATIVE-IOS-AUDIT.md`.

## Output 1: `features.md`

One markdown table, one row per user-facing feature or distinct state. Columns exactly:

`| id | area | feature | web entry path | native entry path | expected behaviour | states to check | web test | native tour step | shot web | shot native |`

- `id`: `F001`… stable, never renumber later.
- `area`: one of Sign-in, Home, Room, Composer, Files, Review, Organize, Tracker, Email, Settings, Account,
  Notifications, Theme, Search, New room, Voice, Background work, Navigation, Errors, Widgets/Live Activity.
- `web entry path`: URL plus the click path, e.g. `/ -> menu -> Settings`; write `web: n/a` if the feature
  does not exist on web. `native entry path`: screen plus tap path, e.g. `Home -> Tools -> Tracker`; `native:
  n/a` if absent.
- `expected behaviour`: one sentence, what a person sees happen.
- `states to check`: comma list from empty / loading / error / long text / keyboard up / light theme / glass
  theme / iPad width / rotation / offline, only the ones that apply.
- `web test`: the exact `test(...)` title from `e2e/visual.spec.ts` that covers it, or `none`.
- `native tour step`: `none` for now (the tour is being built in parallel).
- `shot web`, `shot native`: leave empty.

Group rows by area in the order above. Aim for completeness over brevity: every button, sheet, menu item,
gesture, badge, empty state and error state a person can reach counts. Mark platform-only features clearly.
Below the table add a section `## Feel checks (judge by hand)`: the interactions whose quality a screenshot
cannot prove (transition timing, keyboard avoidance, pull-to-refresh, haptics, scroll restore, first paint
after sign-in, streaming reply cadence), one line each with where to try them on each platform.

## Output 2: `rounds/R0-inventory.md`

Counts: total features; web features with a test; native features (tour coverage is 0 this round);
features that exist on one platform only (list them, this is a parity list Patrik will care about);
the 10 biggest coverage gaps ranked by how visible a break would be to a daily user; and any place where
the two audits disagree with what the code actually does (cite file:line).

## Rules

- Read code, do not run it. Do not start servers, simulators or builds; other workers are using them.
- Do not edit any file except the two named. Do not commit. Do not push.
