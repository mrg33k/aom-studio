# Brief R32-native-wiring — the phone uses the backend it now has: reply-to, clear chat, attachments as artifacts, run state (P081), and a walk on the simulator

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R28-native-composer-parity.md` (§5 backend rows, §6 still off — the round you
extend; its 14 ComposerParity UI tests + the four suites + `tools/native-design-vs-sim.mjs` stay green),
`punch-list.md` row **P081**. Deployed on the clone now: `v2Native.send` accepts `replyTo {messageId,
sender, snippet}` (stored on the block payload, returned by `threadEvents`/surface), `mode`, `model`,
`clientEventId` (dedupe), `imageTool`; `v2Workspace.clearThread({threadId})` (rows at or before
`clearedAt` leave the surface); `v2Native.runsForThread({threadId})` (open runs + last done);
`v2Visual.createArtifact` + `files:generateUploadUrl` (the web's upload path: POST bytes → storageId →
artifact → tab); `v2Native.threadsWithNewUserBlocks`. Report: `rounds/R32-native-wiring.md`.

You are a headless worker, BUILDER for the native iOS app (SwiftUI). Nobody will answer questions.

- **P081 first**: "working" from run state: after send, the status dot + an "<driver> is on it…" line
  (design's step animation) until the first agent block; `runsForThread` drives the nav status
  (open run = Working, none = Ready); 45 s quiet notice, never silence. UI test on the fixture; live
  proof on the demo thread (the :3099 demo brain answers the e2e account's Aster / Spring launch deck).
- **Reply-to as a block field**: send `replyTo` (drop the inline `> sender: snippet` text), render the
  quote from the payload, tap-to-jump to the quoted message.
- **Clear chat** → confirm → `v2Workspace.clearThread`; the thread empties; copy no longer view-local.
- **Attachments**: staged photos/files/camera upload through `files:generateUploadUrl` → `createArtifact`
  (kind by MIME, `createdBy: "user"`) → the tab opens; the send carries no bytes. Retry per file; the
  outbox never blocks on a failed upload.
- **Image tool**: the pending `photo` artifact (`meta.status: generating`) painted by the bridge's
  upgrade must render on the phone once `storageId` lands (poll `artifacts` while a tab is pending).
- **Multiline entry**: Return sends; Shift+Return (hardware) / the mic-row "newline" affordance gives a
  newline — pick the design-consistent one and lock it.
- **iPad column**: run ComposerParity + the design gate on `iPad Pro 13-inch (M5)` too.

Gates: 400+ unit, the five UI suites alone (under load the runner dies with "signal kill"),
`node tools/native-design-vs-sim.mjs` exit 0 twice (the design thread on the e2e account has a message
+ PDF now; probe missions archived). Stage scoped paths + regenerated `project.pbxproj`; commit on
aom-studio; never push; never install to a device; simulators only. Report: rows before/after with
PNGs, gates, commits, "for the orchestrator" (phone reinstall; backend asks), "still off and why".
