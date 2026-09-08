# Brief R42-native-cv6-composer-bubbles-loader — the phone's composer, command menu, agent rows and loader look like our design, not like iOS defaults

Mission: `corner:corner-v2` (native lane). Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R41-native-home-welcome.md` (the round you extend), `rounds/R28-native-composer-parity.md`
(what the composer carries), `punch-list.md` rows **P089-P092**. Design references (the truth):
`rounds/evidence/R17-native-thread-design.png` (the phone thread at 390: user bubble accent, agent rows = name
12.5 semibold + time 11 muted on one line, body 15/22 ink, 16pt gutters, composer 50pt pill with Record inside
and a 50pt round send), the desktop command menu `rounds/evidence/R27-review-02-commands-menu.png`, the design
export `docs/design-reference/corner-v2/HANDOFF.md` in `/Users/aom-inhouse/aom-studio-transfer/corner-v2-integration`
(tokens: `--surface #161b23`, radii, type scale). Patrik's annotated shots: `/tmp/patrik-composer-menu.png` if
present. Automated runs: iPhone 17 Pro `971E7446-394B-4EF6-9796-8D9D1F916994`, the 390 test sim "iPhone 16e
(tests)" `4818124A-CCAF-4386-9970-85F17A660AC7` (the gate's default), iPad — NEVER `0A05C9AA…` (Patrik's panel).
Report: `rounds/R42-native-cv6-composer-bubbles-loader.md`.

You are a headless worker, BUILDER for the native iOS app (SwiftUI). Nobody will answer questions.

## Patrik, 11:30-11:40 AM (his words, on his panel)
- "This composer and the command menu doesn't have our CV6 styling and it looks weird."
- "The chat bubbles of agents have no styling and don't look like our design."
- On the "Opening project…" spinner card: "This should be an animated transition sequence of the Corner
  logo and maybe some background animation to make it feel alive."

## Build
1. **Command menu = our card, not the system Menu (P090).** Replace the iOS `Menu` (translucent blur, giant
   rounded sheet, SF Symbol rows) with a CV6 popover card anchored above the sparkle chip: solid `raised2`
   surface, hairline border, 12pt radius, 44pt rows, 14.5 medium ink labels, 18pt icons in `inkSoft`, thin
   dividers between the groups, "Model — Auto" with a chevron and the model sub line under it, Plan/Work as
   check rows — the desktop menu's rhythm at phone width (~260pt). No blur, no scrim, dismiss on outside tap.
2. **Composer = the design's pill (P091).** 50pt pill on `surface`, hairline, text 15 placeholder muted, the
   sparkle chip and Record inside the pill as CV6 chips (28pt tall, hairline, icon 15, label hidden at 390),
   the 50pt round accent send outside on the right as drawn. Nothing floats, nothing overlaps, spacing 8/12.
3. **Agent rows and user bubbles = the design (P092).** Measure at 390 against `R17-native-thread-design.png`:
   agent name 12.5 semibold ink + time 11 muted on one line, body 15/22 ink, 16pt gutters, 14pt between rows;
   user bubble accent, 16pt radius, 15/22 white, max width 74 %, time 11 muted right-aligned under it. Type sizes
   are the design's fixed sizes (not Dynamic Type scaled) unless the design says otherwise. Extend the gate's
   thread anchors to these sizes so a drift fails.
4. **Loader = a living Corner mark (P089).** Replace the spinner + "Opening project…" card with the Corner
   logo animating in (mark draws/fades over ~600 ms, wordmark settles), a soft breathing background gradient
   on `ground` (no stock particles), no text; used for cold start and project switches; respects Reduce
   Motion (static mark). Keep it under 1.2 s when the data is ready sooner — never a fake wait.

5. **Composer glow = a soft moving gradient (P093).** Patrik (11:48 AM): "we used to have a background animation
   glow behind the composer that looked like soundwaves out of focus going up, different colors for every chat
   synced to the chat color. I miss that feature… it can just be a soft gradient that moves." Behind the composer
   pill, a blurred gradient band (~140pt tall, fading to `ground` upward) tinted with the project's accent
   (the avatar colour the sidebar uses for that project; General = the app accent), drifting slowly
   (8-12 s loop, ±10 % hue/position), 12-18 % opacity so text stays legible; brighter for a second when a
   reply arrives; Reduce Motion → static tint. Reference the old CV4 `src/dashboard/cv4/GlassBackdrop.jsx`
   for the feel, not the code. Same for the loader's background (item 4): the same gradient breathing.

Gates: units; the UI suites alone (CompMatch, DesignMatch, VisualWindow, CornerV2Flow, ComposerParity,
R32Wiring, R41 home + yours); `node tools/native-design-vs-sim.mjs` exit 0 twice with the new thread anchors;
iPad column. Stage scoped paths + regenerated `project.pbxproj`; commit on aom-studio; never push; never
install to a device; simulators only. Report: side-by-sides (design | sim) per item, gates, commit, "for the
orchestrator" (phone reinstall), "still off and why".
