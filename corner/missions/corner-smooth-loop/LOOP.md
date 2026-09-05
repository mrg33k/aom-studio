# Corner Smooth Loop

Started 2026-09-05 (Saturday), 10:45 AM Phoenix. Patrik's brief, verbatim intent:
"Create a flawless end-to-end test for desktop web and native iOS through the simulator, go through every
single feature of Corner visually, make sure it works perfectly. On another track, continuous improvements to
make the app smoother. Opus 5 agents do the work, Fable 5.1 orchestrates. I don't want to come back and talk
about stupid simple fixes, stupid simple visual things, stupid interactions, things that don't feel good when I
log in. Everything should just feel smooth."

## The bar (one question)

For every screen, state, and interaction: **would Patrik have to come back and mention this?**
If yes, it is a punch-list item and it gets fixed in the same round it is found. No "later".

## Surfaces

| Platform | Repo | Harness | Devices |
|---|---|---|---|
| Desktop web | `~/aom-studio-transfer/corner-convex` (main) | `npm run e2e` (Playwright, offline Convex stand-in via `scripts/audit/vite.config.ts`) | desktop 1440x900 only |
| Native iOS | `~/aom-studio-transfer/AOM-EA/aom-studio/ios-native` (main) | `scripts/screenshot-tour.sh` (XCUITest `CornerUITests/ScreenTour.swift`) | iPhone 17 Pro, iPhone SE (3rd generation), iPad Pro 13-inch (M5) |

**Scope decision (Patrik, 2026-09-05, 12:33 PM Phoenix): "Web should be desktop only, iOS should be
simulator only."** No phone-sized browser emulation in the web suite; anything phone-shaped is proven on
the native app in the iOS Simulator. Phone-only web punch items are closed as out of scope.

Reference docs: `corner-convex/FRONTEND-AUDIT.md`, `corner-convex/NATIVE-IOS-AUDIT.md`, `corner-convex/e2e/visual.spec.ts`.

## Two tracks

**Track 1: Prove.** One repeatable tour per platform that visits every feature in `features.md`, exercises it,
and photographs it. A feature is "covered" only when a test exercises it AND a screenshot of it lands in the run
output. Baselines are generated on this Mac (Linux-made baselines never match).

**Track 2: Smooth.** Review every photo and every failure against the bar above plus the two audits. Fix it,
add the test that would have caught it, re-run, commit. Sign-in feel (first paint, spinner timing, token refresh
races, keyboard handling) is Track 2 priority one.

## Roles

- **Orchestrator (Fable 5.1, this session):** briefs agents, verifies claims by looking at output, merges,
  commits/pushes, keeps this ledger, decides what reaches Patrik.
- **Workers (Opus 5, `general-purpose` agents with `model: opus`):** per platform, a *reviewer* (reads every
  frame + failure, writes the ranked punch list with file:line and a proposed fix) and a *builder* (fixes, adds
  coverage, re-runs, reports with evidence paths).
- Web team and iOS team run **in parallel** (separate repos). Inside one repo, reviewer then builder,
  **sequentially** (one dev server on :5173, one Xcode DerivedData).

## Round protocol

1. **Run** both harnesses. Web: `cd corner-convex && npm run e2e`. Native: `cd ios-native && scripts/screenshot-tour.sh`.
2. **Review** (Opus, per platform): every frame and every failure -> `punch-list.md` entries: `id | platform | screen | what is wrong | why it fails the bar | file:line | proposed fix | status`.
3. **Fix** (Opus, per platform): highest-ranked items first. Each fix ships with the test/tour step that catches its regression. Baselines only update for intentional visual change, with the reason in the commit.
4. **Verify** (orchestrator): re-run, open the actual PNGs, confirm green. "Done" = looked at it working.
5. **Commit + push** per repo, scoped paths only (`git add <paths>`, never `-A`).
6. **Ledger**: `rounds/R<n>.md` with what ran, what failed, what shipped, evidence paths, what is next.
7. Repeat. A round with an empty punch list is not a stop: the reviewer then goes one feature deeper
   (edge states: empty, loading, error, long text, keyboard up, rotation, Dynamic Type, light/glass themes).

## What reaches Patrik

Only: a design-direction call, deleting data, money, anything client-facing, or a hard blocker (missing
credentials, push access, Apple signing). Everything else gets fixed and shows up as a line in the round ledger.

## Definition of done for the day

- `features.md` has every feature with a test/tour step on both platforms and a screenshot path from the last run.
- Both harnesses green on this Mac.
- `punch-list.md` has zero open items rated "Patrik would mention this".
- Sign-in -> first useful screen feels immediate on both platforms (measured: time from launch to first room list paint, recorded in the round ledger).

## Orchestrator working notes

- Commit with pathspecs (`git commit -m "…" -- <paths>`), never `git add` + bare `git commit`, while a worker shares the checkout: a bare commit sweeps whatever the worker has staged (happened 2026-09-05 12:36 PM, reworded).
- Patrik (2026-09-05, 12:34 PM): the orchestrator walks the iOS Simulator as the tester (simulator tool, own eyes), then hands Muse exact per-round fix briefs. The XCUITest tour is the repeatable regression photo set, not the review.
