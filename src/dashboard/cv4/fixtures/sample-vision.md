---
mission: files-in-app
parent_project: corner
status: opened 2026-04-25
---

# Files in App — Mission Vision

**Source of truth for this mission.** Inherits from `Corner` but scoped to the work this mission carries. Paired with this mission's `BUILD.md`. VISION = what/why, BUILD = how/when.

Mission path: `corner:files-in-app`

---

## North star

**A user opens a project, taps Files, and reads the project — VISION, RESEARCH, BUILD, CONTEXT, last-conversation, dated research MDs — like a published article. Clean typography. Big margins. Scrollable. The agent's accumulated thinking becomes legible to the user without leaving the room.**

This is the bridge between "the agent has been working" (live in chat) and "the agent's thinking is durable" (the project's MD canon). Today the canon lives on disk, invisible to the user.

---

## Update 2026-05-19 (Patrik, scope expansion)

> *"I would like for you and other agents/rooms/missions to be able to send screenshots, actually that's part of files. Also did we make the bullet-proof file browser? Currently there's no way to view attachments, mds and other files created during sessions. Files don't update very fast either, especially structural changes."*

Three shifts ratified, expanding the MVP envelope:

1. **Attachments are bi-directional.** Agents send screenshots and generated files into chat the same way users upload to agents. Both sides of the conversation can attach. New pillar 8.
2. **Non-MD files come INTO the reader's scope.** Screenshots, attachments, agent-generated outputs created during sessions are visible in the Files surface — not just the canonical MD canon. Pillar 1 stays the "right files, not all files" principle, but the right list now includes session artifacts. Old "What's OUT" carve-out for non-MD files is retired.
3. **Structural-change freshness is a first-class concern.** When a new mission gets scaffolded, a new research drop lands, or a new screenshot drops mid-session, the file tree reflects it fast — sub-second, not "next refresh." Pillar 4 already names live-update; the gap today is that *structure* (the tree itself, not just file body) lags. The mission inherits this gap.

New pillar 8 spec lives below. BUILD rounds for these three shifts will be added in the next BUILD update.

---

## Pillars

### 1. The right files, not all files

Project/mission canonical surfaces only:

- `VISION.md` — what/why
- `RESEARCH.md` — index + dated MDs in `research/`
- `BUILD.md` — round plan
- `CONTEXT.md` — current state
- `last-conversation.md` — the tape (shown, labeled — see Pillar 1a)
- `research/<dated>.md` — individual research drops

Plus mission-scoped variants of each. **Out of scope:** the file system itself (no PDFs, no transcripts, no screenshots — those are a different surface). Scope creep here kills the mission; this is a focused reader, not a Dropbox.

**Explicitly hidden from the reader (locked 2026-04-28):** `PHONEBOOK.md`, `history.md`, `rules.md`, `decisions.md`, `archive/*`, `vision-qa/*`. They stay on disk — agents need them — but they're internal navigation/history, and surfacing them dilutes the "what is this project / what's its state / what have we learned / how do we ship" story to nothing. The hidden list is a doctrine commitment, not a render-time guess.

**`last-conversation.md` is visible but explicitly labeled (locked 2026-04-28).** The agent's tape is shown to the user with an explicit label — *"What the agent remembers"* / *"Agent's notes to itself"* — so the user sees the EA's working memory without the EA drifting into writing-for-the-user (which would corrupt the tape's job). Showing it raw was rejected (B2); hiding it ("the agent's brain is private") was rejected (B1). The label is the whole solution. Render rules: same article typography as canon, but with a "draft / agent's notes" header chip and a subtle background tint so it's instantly distinguishable. Read-only across the board. Source memory: `project_files_surface_scope.md`.

### 2. Article-style rendering, not raw markdown

- Helvetica / SF body, generous line-height, real margins, max ~70ch column.
- Headings have hierarchy and air. Code blocks are quiet (mono, soft tint).
- Lists, tables, blockquotes look intentional, not stack-overflow.
- Match the AOM site aesthetic Patrik calls "landing in heaven" (`feedback_site_design_heaven`). Not a wiki, not a docs page — an article you'd want to read.

### 3. One reader, every project

The same component renders any project's any file. No per-project branches in the reader. Customization belongs in the file content, not the renderer.

### 4. Live, not snapshot

When an agent updates `last-conversation.md` mid-work, the open Files reader picks up the change without a refresh. The chain in the chat shows "Updated tape," and the article re-renders. Tape becomes a living document.

**Left-menu refresh affordance (added 2026-05-18).** The Files entry in the project's left menu carries an explicit refresh capability — so a user looking at the file list can pull-to-refresh / tap-to-refresh and pick up newly added research drops, CONTEXT updates, or freshly scaffolded mission docs without re-navigating into the project. Live push is the default (per above), but manual refresh is the floor: if the watcher hiccups or the user lands on a stale list, one tap pulls the current tree. Surface is the file list in the left menu, not the open article (article live-refresh is already covered above).

### 5. Tenant-correct out of the gate

Files belong to a project; projects belong to a tenant. The reader inherits the same RLS guarantees as the rest of Corner. Ben opens Sourcing → he sees Sourcing's VISION/etc. Patrik in AOM cannot see Ben's files except through legitimate cross-tenant primitives (shared rooms — and even there, only what's explicitly shared).

### 6. Hygiene obligation (because canon is now user-visible)

Once VISION/CONTEXT/RESEARCH/BUILD are user-visible, the system must keep them honest. CONTEXT auto-refresh, VISION ratification stays explicit, RESEARCH index updates on every research drop. The super-agent owns this for projects assigned to it (per `project_agents_vs_projects_distinction.md`). Refresh is event-driven, never per-project polling (per `feedback_idle_projects_zero_resources.md`). Stale canon is a bug — the reader exposes it on sight.

### 7. Storage primitive lives next door (locked 2026-04-28, extended 2026-05-02)

User storage is a sister concern that lives inside this mission rather than its own mission. Both the reader and the storage primitive concern "the user's files surface." Storage gets its own BUILD rounds; the reader stays scoped to canonical MD.

- **Free tier:** 5GB total per user. Signed-URL upload (Vercel payload path retired). Quota enforced pre-flight; per-user, not per-world. Source memory: `project_user_storage_quota.md`.
- **Paid tier (locked 2026-05-02):** 100GB per user as the default upgrade; expandable beyond 100GB on request — no hard ceiling baked into the schema.
- **BYO-source is the preferred big-file path (locked 2026-05-02).** For video archives, raw footage, and large datasets, the canonical workflow is "user keeps the source on their cloud (Dropbox / Drive / S3); workers read from the source server-side; outputs land in the user's quota." Free users are restricted to BYO-source for any single asset >5GB. We do NOT optimize for bringing big files **onto** AOM infrastructure as the default — paid users with 100GB+ have that path, but it costs us money and we should keep BYO-source as the front-and-center suggestion in copy + UI.
- **Team-approval gate for >quota uploads (locked 2026-05-02).** A paid user attempting an upload that would push them over their 100GB tier triggers the **team-approval flow primitive**: agent posts to the AOM team channel with the action + rationale + approve/deny control; an admin decides; agent narrates the result back to the originating room. Same pattern is used for money/spend, irreversible operations, public-facing publishes — generic, not bespoke. Source memories: `project_user_storage_quota.md`, `project_team_approval_flow_primitive.md`.

### 8. Bi-directional attachments + session artifacts in the file browser (added 2026-05-19)

The chat is a two-way surface for files.

- **User → agent:** drop image / doc / file into chat. Lands at `~/Documents/Corner/files/<world>/<file>`. Inbox entry carries the `[Local path: …]` hint. Agent reads the file directly. (Shipped 2026-05-19, commit `64e49ce73`.)
- **Agent → user:** agent attaches a screenshot or generated file to its reply. Same on-disk store. Renders in the chat bubble the way user uploads render — preview, click-to-open, downloadable. The same primitive supports any agent/room/mission attaching outbound: Rex sharing a screenshot of a verification, Cleo sharing a rendered video frame, Steffen sharing a mood board.
- **Browser scope expansion:** the Files surface shows session artifacts alongside canonical MD. A user can scroll through the project's screenshots, the agent's generated assets, attached uploads, and the canonical MDs in one place. Filter by type (MD / image / file). The "right files" principle still holds — project/mission scoped, tenant-correct — but the right list now includes what the conversation produced, not only what was authored as canon.
- **Structural freshness:** when a new mission gets scaffolded mid-session, the project's file tree updates within seconds. When a research drop lands in `research/`, it appears in the list before the user has to refresh. When a screenshot lands in `screenshots/YYYY-MM-DD/`, the day's folder appears or refreshes. Tree-level live update, not just file-body live update. The current symptom Patrik named: tree lags hard on structural changes; today's behavior is the bug this pillar fixes.

---

## The flow (concrete)

```
Ben (in arsenal/sourcing room):
  taps "Files" tab
  sidebar: VISION · RESEARCH · BUILD · CONTEXT · Tape · research/ (collapsed)
  taps VISION
  body: rendered article — title big, sections clear, links intra-project
  scrolls, reads, taps RESEARCH
  body re-renders — list of research drops with dates and one-line hooks
  taps a dated MD
  body: that single research article
```

The agent's chain shows "I'm updating the tape" mid-task. The Files tab's tape entry pulses. Ben taps it; the open article reflows with the new content.

---

## Scope (what's IN)

- **File source:** the canonical 6 + research/ for projects and missions inside `projects/<slug>/` and `projects/<slug>/missions/<m>/`.
- **Multi-tenant:** files for a project the user's tenant doesn't own → not visible. Shared rooms / explicit grants surface their respective project files only.
- **Live updates:** filesystem watcher → push to dashboard so the open reader re-renders.
- **Article-style render:** typography, link handling, intra-mission navigation (clicking a `BUILD.md` line that says "see research/2026-04-25-foo.md" opens that file in the reader).
- **Mission/project switcher:** within the Files tab, a way to navigate between active missions for the project.
- **Mobile-friendly:** Patrik consumes most things on phone; the reader works there.

## Scope (what's OUT)

- **Editing.** Read-only. Edits happen via the agent's tools, not user typing in the reader.
- ~~**Non-MD files** (PDFs, images, transcripts, screenshots) — out of MVP scope.~~ **Retired 2026-05-19.** Non-MD files (screenshots, attachments, agent-generated artifacts) are now IN scope per Pillar 8. They surface in the same Files browser alongside canonical MD.
- **Search across all projects.** Within-mission link nav is enough for now; global search is its own piece.
- **Comments / annotation.** Not yet.
- **Diff / history view.** Useful future, not MVP.

---

## Why this is a mission (not a round)

- Touches: filesystem watcher / read API on the AOM-EA host, Vercel function or socket bridge, the dashboard's Files tab UI, intra-link routing, the reader's typography/aesthetic system, RLS-aware project-file access.
- Multiple rounds across at least three layers (storage/IO, dashboard UI, the typography pass).
- Is product-quality work. Patrik named it as one of the 4 things blocking 95% launch readiness.

---

## Dependencies

- **`corner:tenant-isolation`** — files inherit the project's tenant boundary. The render path's RLS check piggybacks on `projects` policies. So that mission's R77-t2 (projects RLS) should land before files goes live to users beyond AOM. (R77-t3 shared-rooms membership ✅ done 2026-04-25, migration 026 — files surfaced inside a shared room now inherit correct visibility.)
- **`corner:self-healing-chats`** R76-s3 (worker step emission) — the "tape pulses when agent updates it" experience benefits from the live-step infrastructure but is not blocked by it.

Recommended order: tenant-isolation R77-t2 (projects RLS — last hard dependency) → files-in-app research (R79-f0) → files-in-app build rounds. Files research can run in parallel since it doesn't touch the dependent layers yet.

---

## Cross-reference

- Sister missions: `corner:tenant-isolation`, `corner:self-healing-chats`, `corner:project-from-chat`, `corner:launch-mvp`.
- Existing primitives: project artifact structure (`.claude/rules/project-mission-structure.md`), per-project research index (`RESEARCH.md`), the tape pattern (`.claude/rules/write-your-story.md`).
- Earlier groundwork: Rex's 2026-04-16 push to add a Files section per project — Steffen design spec at `docs/design-specs/project-files-section.md` (in aom-studio repo). Builder task `0a8f2e6b` was queued; status TBD when this mission opens. R79 supersedes that one-off and lands it as a mission.
- Doctrine: `feedback_site_design_heaven`, `feedback_public_quality_bar`, `feedback_clean_modern_no_pixel`.

---

## Change log

- **2026-04-25** — Scaffolded after Patrik named the 4 things blocking 95% launch: tenant isolation, shared rooms, files in-app, live chain. Files scope clarified to the canonical mission/project MDs (VISION/RESEARCH/BUILD/CONTEXT/last-conversation), not arbitrary files. Article-style rendering called out as the design north star.
- **2026-04-28** — Foundational decisions (wd40 R2) folded in: explicit hidden list (PHONEBOOK/history/rules/decisions/archive/vision-qa), tape labeled-visible ("agent's notes to itself"), hygiene obligation pillar, storage primitive folded into the mission (5GB free/user, signed-URL upload, per-user folder). Source memories: `project_files_surface_scope.md`, `project_user_storage_quota.md`, `feedback_idle_projects_zero_resources.md`.
- **2026-05-02** — Batch 2 (wd40 R3-docs) folded in: paid tier 100GB default + expandable; **BYO-source is the preferred big-file path** (free users restricted to BYO for single assets >5GB); **team-approval flow primitive** gates uploads that would push a paid user over their tier. Pillar 7 expanded; BUILD.md round R79-f7 storage-primitive scope upgraded; new round R79-f9 for the team-approval flow. Source memories: `project_user_storage_quota.md` (updated), `project_team_approval_flow_primitive.md`.
- **2026-05-18** — Left-menu refresh idea captured into Pillar 4. The Files entry in the project's left menu should expose an explicit refresh affordance (pull-to-refresh / tap-to-refresh) so users can manually pick up new research drops or canon updates if the live watcher hiccups. Live push remains the default; manual refresh is the floor. Surface is the left-menu file list, distinct from the article-level live update already specified.
