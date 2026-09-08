# Brief R18-desktop-design-match (v2, 12:25 PM) — design screenshots vs the LIVE desktop web, side by side, fix until they match; and put the composer's command menu back

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `punch-list.md` (rows L001-L007 are today's live findings; P2NN are yours), and
look at `rounds/evidence/R6-cm-work-design.png` next to `rounds/evidence/R6-cm-work-built.png`.
Write your report to `rounds/R18-desktop-design-match.md`: every command with its output, one
difference table per screen.

You are a headless worker, REVIEWER-THEN-BUILDER for the desktop web. Nobody will answer questions.

## Patrik's words (the target)

12:05 PM: "visually looks nothing like what we designed. we need a visual end to end test against the
design claude gave us."
12:22 PM: "You have to take the screenshots from the design and the screenshots from what's live on
desktop web … and compare the two. … same for desktop I figured you could put the composer with the
command menu, plan button etc back easily."

So: NOT the offline stand-in. The comparison is the design export vs the DEPLOYED app on the real
backend, screen by screen, as images a person can put side by side. A previous attempt at this brief
(killed 12:24 PM) started from a fixture; `scripts/design-baselines.mjs` in the worktree is its
half-finished baseline script — reuse what helps, delete what does not.

## Design truth

`/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration/docs/design-reference/corner-v2/`:
`Corner v2.dc.html` (states Work / New / Setup / Login via the sidebar footer "State" switcher;
review mode, notifications popover, settings, kebab menu by clicking), `ArtifactStage.dc.html`
(artifact kinds), `HANDOFF.md` (tokens §2, desktop layout §3, states §5, Visual Window §6),
`SHA256SUMS` (immutable, never edit). Render it with Playwright at 1440×900, device scale 1, fonts
LOADED (find what the export loads; the app must load the same), animations settled. One PNG per
screen: `rounds/evidence/R18-<screen>-design.png`. Screens: `login`, `setup-1`, `setup-6`, `new`
(empty home), `work` (Aster / Spring launch deck), `work-review` (Review on, pins),
`work-visual-<kind>` for every kind the export shows, `notifications`, `settings-profile`,
`settings-appearance`, `sidebar-collapsed`, `global-proposal` if the export has it.

## Live truth

The deployed preview on the production clone (real Convex backend, real auth):
`PREVIEW` = the newest `corner-v2-integration-*.vercel.app` URL in
`rounds/LEDGER.md` / this session (12:20 PM: `https://corner-v2-integration-4kr9szuiz-aheads-projects-d2a4c70f.vercel.app`;
after you change the app, redeploy your own: from the worktree
`VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site npx vercel build --yes && npx vercel deploy --prebuilt --yes`
— a plain `vercel deploy` builds WITHOUT the backend URL; curl the bundle and confirm
`brilliant-scorpion-163` is in it before you trust a preview). Account: `/tmp/corner-v2-e2e.env`
(`CORNER_V2_E2E_EMAIL` / `CORNER_V2_E2E_PASSWORD`; the password never appears in a report, commit,
or caption). If missing, create one through `PREVIEW/auth` (selectors in `e2e/live.spec.ts`
`passwordFlow`) and write the file with mode 0600.

Bring that account as close to the design's Work state as the real app allows, through the app's
own UI (not scripts against the backend): project `Aster` with missions `Spring launch deck`,
`Retail partner one pager`, `Campaign film`; projects `Northwind` and `Cellar Door`; in Spring
launch deck send the design's user messages ("Build the Aster spring launch deck. Eight slides,
their brand kit, first pass tonight.", "Buyers. Keep the film for press."); upload
`public/fixtures/aster-brief.pdf` with the paperclip so the Visual Window has a PDF tab; open the
Review mode and place pins. No agent is wired on the clone, so agent replies, the question block
and the Working status will be missing on live: those are DATA differences, list them once as
"backend gap, not UI", and do not count them.

Screens on live: `rounds/evidence/R18-<screen>-live.png`, same names as the design set, same
1440×900, same fonts loaded, same scroll position.

## The comparison (this is the test)

For every screen produce `rounds/evidence/R18-<screen>-side-by-side.png` (design left, live right,
same scale) and `rounds/evidence/R18-<screen>-diff.png` (pixelmatch, threshold 0.1), and a table:
`element | design (size / position / colour / type) | live | Δ | verdict | data-or-UI`. Then a script
`scripts/design-vs-live.mjs` that does all of the above from two flags (`--design`, `--live`) and
exits non-zero when any UI (not data) row is off by more than 1px / a different token colour /
a different font family or weight / a missing or extra element. `npm run test:design` runs it.
That script is the visual e2e Patrik asked for; it must be re-runnable by the orchestrator in one
command after every future change.

## Fix everything the table says (this is the build)

Every UI row → `P2NN | desktop <screen> | what differs | design | built | file:line | R18 | open`
in `punch-list.md` → fix in `src/v2/*` / `src/lib/*` / `src/v2/*.css` → redeploy → re-shoot →
row `fixed (R18) <evidence>`. Loop until the only rows left are data rows. Keep lint 0, unit 154+,
the `desktop` Playwright project green (update a snapshot only when the app now matches the design,
and name it in the report), and the `live` project (`LIVE_BASE_URL=<preview> npx playwright test
--project live`) no worse than the orchestrator's last run (11 tests; 6 green at 12:20 PM).

## The composer's command menu (Patrik's second point)

Corner's composer always had a command menu and it is gone from both the design export and the v2
build. Put it back in the design's composer (pill with paperclip, Record chip, agent label, round
send): a chip left of Record with the sparkles icon and a live label, opening a menu with
**Work / Plan** (mode toggle; Plan = "Corner will propose a plan first"; persisted per conversation,
sent with the message as `mode`), **Model** (the same options and checkmark the CV6 chip had),
**Specialist** (room default + roster, when the conversation has one), **Files in this
conversation** (opens the project's Files), **Generate an image**. Reference behaviour:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/src/dashboard/cv6next/Cv6InputBar.jsx`,
`Cv6FullComposer.jsx`, `IntakeComposer.jsx` (CV6's composer: attach, command menu, slash commands,
image gen, voice) and the native mirror `ios-native/Corner/Views/ChatView.swift` `commandsMenu`
(sparkles chip: Work/Plan picker, Model submenu, Specialist submenu, Files, Generate an image).
Slash commands (`/plan`, `/model`, `/files`, `/image`) type-ahead in the input like CV6. Look: the
design's chip style (`Record` is the reference: 77×28, radius 7, 12px label) so the composer still
reads as the design with one more chip. Backend: check whether `v2Workspace.sendMessage` accepts a
`mode`; if not, add the optional field in `convex/v2Workspace.ts` + a unit test, but know the
clone cannot be redeployed by you (deploy key pending with Patrik) — the web must degrade cleanly
when the field is unknown. Offline stand-in + `desktop` tests for the menu (open, pick Plan, label
shows Plan, persists across reload, slash command opens the menu).

## Hard lines

- Never edit the design export. Never `git add -A`; stage what you touched. Commit on
  `codex/corner-v2-integration` (HEAD `bded69d` or later; the orchestrator is also committing there —
  `git pull`-free, same checkout, stage scoped paths only). Never push.
- Port 5173 is yours; never 5177 (native worker). Never delete another worker's files.
- No AI judge. The script's exit code and the side-by-sides are the gate; Patrik is the final gate.
- Report: table of screens (design / live / side-by-side / diff paths, UI rows open → fixed, data
  rows), "what changed" with commit hashes and the final preview URL, "still off and why" (empty is
  the goal), "for Patrik" (design vs spec conflicts; anything needing him).
