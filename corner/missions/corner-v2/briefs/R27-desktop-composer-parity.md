# Brief R27-desktop-composer-parity — everything the CV6 composer did, inside the v2 composer (web)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R18-desktop-design-match.md` §"composer" (what the commands chip already
does: Work/Plan, Model, Specialist, Files, Generate an image, slash commands), and keep its gate
green (`LIVE_BASE_URL=<preview> npm run test:design`). Report: `rounds/R27-desktop-composer-parity.md`.

You are a headless worker, BUILDER for the desktop web. Nobody will answer questions.

## Patrik, 7:15 PM

"the composer we had for cv6 should have carried over it held a lot of composer functionality."
Chat is the core product: "the user needs to be able to request almost anything I would and the team
starts getting to work." The composer is where that starts.

## The CV6 composer, control by control (source of truth)

`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/src/dashboard/cv6next/Cv6FullComposer.jsx`,
`Cv6InputBar.jsx`, `IntakeComposer.jsx`. Read all three before writing a line. Controls found there:
"Attach and upload files" (multi-file, drag-drop, paste-image), "Commands" menu with "Back to
commands" submenus ("Response mode" Work/Plan, Model, Specialist, "Files"), slash commands
(`/` opens the palette, `/clear` with "Confirm clearing this chat", `/integrations`), "Cancel reply"
(reply-to a message: quote + thread), "Talk aloud" (spoken replies + checklist playback
`onPlayChecklistItem/List`), voice input (dictation with `onTranscript`/`onVoiceChange`/
`onVolumeChange` and a live level meter), "Stop generating images" (image generation with a stop),
"Send", draft persistence per room, @mentions with chips (`composer-chip`). Anything else you find
in those files counts too; list every control in a table (CV6 control → v2 status → where).

## Build (inside the design's composer: pill, paperclip, commands chip, Record, agent label, round send)

Every control above works in the v2 composer with the design's look: attach (multi + drag-drop +
paste), commands menu (existing) + submenu back, slash palette (existing) + `/clear` with confirm
+ `/integrations` → settings/environment, reply-to (hover/kebab "Reply" on a message → quote chip
in the composer → the sent block carries `replyTo`), Talk aloud toggle (speech synthesis of the
driver's replies; checklist playback), dictation (existing Record → live level meter + transcript
into the field), Generate an image (the existing menu item must actually produce an artifact tab:
call the image-gen path the backend/bridge offers; if none exists on the clone, the item creates a
run with a `step` "Generating…" and the bridge/backend contract to fulfil it goes in the report as a
backend row), stop button while generating, drafts per thread (localStorage keyed by threadId),
@mention chips. Keyboard: Enter sends, Shift+Enter newline, Esc cancels reply/closes menu, `/` opens
the palette, Cmd+K opens search. Every behaviour has an offline test in `e2e/visual.spec.ts`
(stand-in) and the design gate stays 0 rows off (the composer's metrics are locked there).

## Gates and hard lines

`npm run lint` 0 errors, `npx vitest run`, `PW_PORT=5174 npx playwright test --output e2e/results-orch`
(desktop), `LIVE_BASE_URL=<your preview> npm run test:design`, live suite no worse than
8 pass / 2 skip. Redeploy previews with `VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud npx vercel build --yes && npx vercel deploy --prebuilt --yes`.
Stage scoped paths; commit on `codex/corner-v2-integration`; never push; no `convex/` edits (write
backend needs in the report); never 5173/5177/3099. Report: the control table with before/after,
gates, commits, preview URL, backend rows, "still off and why" (empty is the goal).
