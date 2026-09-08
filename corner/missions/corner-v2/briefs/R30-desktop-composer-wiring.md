# Brief R30-desktop-composer-wiring — the composer tells the truth and uses the new backend (L023, L024, L025, B1/B2 client wiring)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R27-desktop-composer-parity.md` (what you extend; its 16 e2e + the design gate stay
green), `rounds/R26-desktop-live-walk.md` (the round before you), `punch-list.md` rows **L023, L024, L025**,
and `rounds/R33-chat-images-and-instant.md` if it exists (which image provider is real). Backend now has
(deployed): `v2Workspace.sendMessage.replyTo {messageId, sender, snippet}` stored on the block payload and
returned in `getConversationSurface`; `v2Workspace.clearThread({threadId})` (rows at or before `clearedAt`
leave the surface). Report: `rounds/R30-desktop-composer-wiring.md`.

You are a headless worker, BUILDER for the desktop web. Nobody will answer questions.

- **B1 wiring**: send `replyTo` with the message; render the quote from the block payload (drop the
  local `v2-replymap`); cross-device proof in the live suite (second context sees the quote).
- **B2 wiring**: `/clear` → confirm → `v2Workspace.clearThread`; the surface empties; the copy no longer
  says "view-local".
- **L023** the commands popover never clips: flip above the chip or scroll within the viewport.
- **L024** Model options come from a single source that names the real backends (Claude, Muse, OpenAI
  marked "no credits" while true); "Auto" explains the bridge default in one line.
- **L025** image providers: only the one(s) R33 wired; others hidden or "needs a provider".
- **Optimistic working line** (from R26, keep it consistent) must survive your changes.

Gates: lint 0, vitest, `PW_PORT=5174 npx playwright test --output e2e/results-orch` (103+), design gate
0 rows, live suite ≥ 9 pass / 2 skip; redeploy previews prebuilt with the clone URL; commits scoped;
never push; no `convex/` edits (write backend asks). Report: rows before/after, gates, commits, preview.
- **L026** the reply tray overflows the composer column (`rounds/evidence/R27-review-04-reply-chip.png`):
  same width and insets as the pill, snippet ellipsised.
