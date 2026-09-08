# Brief R26-desktop-live-walk — what the orchestrator saw on the live desktop with a real brain (L016, L017, L020, L021)

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R27-desktop-composer-parity.md` (the round before you; keep its tests and the
design gate green), `punch-list.md` rows **L016, L017, L020, L021** (yours), and the evidence
`rounds/evidence/WALK-web-0{3,6,8}-*.png`. Report: `rounds/R26-desktop-live-walk.md`.

You are a headless worker, BUILDER for the desktop web. Nobody will answer questions.

- **L021** (first): the moment a message is sent, the header flips to "Working" and an optimistic
  "<driver> is on it…" line with the design's step animation appears under the message; the first
  agent block replaces it; if nothing arrives in 45 s the line becomes the design's quiet notice
  (never silence). Header status comes from run state (`v2Visual` runs: open run = Working, none =
  Ready), not from the last event's age.
- **L016** "Working" never sticks after `done`.
- **L017** an artifact-only thread shows the design's empty-state copy; artifacts live in the
  Visual Window strip; file cards render inline only next to the message that produced them.
- **L020** review mode replaces the composer with the checklist (design: "Pins become a checklist in
  the composer"); leaving review restores the composer.

Reproduce each on production (`https://www.aheadofmarket.com/dashboard`, which redirects to
`corner-convex.vercel.app`; test account `/tmp/corner-v2-e2e.env`, never in a report; the demo
bridge on :3099 answers that account's Aster / Spring launch deck thread), fix, offline test per row,
redeploy a preview (prebuilt with the clone URL), `npm run test:design` 0 rows, live suite no worse
than 8 pass / 2 skip, commit scoped, never push, no `convex/` edits, ports 5174/results-orch.
Report: before/after per row, gates, commits, preview URL.

- **L022** (added 11:25 PM): the steps card shows a green completed check the instant "Reading the
  project notes…" appears; while the run is open the current step needs the design's in-progress
  state (pulsing dot), the check only on completion. Evidence `rounds/evidence/DBG4-web-03-ambition-brand.png`.
