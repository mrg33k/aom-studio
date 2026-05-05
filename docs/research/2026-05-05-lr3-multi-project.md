# LR-3 Research: Multi-Project + Mission via One Conversation

**Date:** 2026-05-05
**Round:** `corner:launch-readiness` LR-3
**Task:** d04a859b-8d76-491d-9a8b-be494f13676c
**Mission home:** `corner/missions/launch-readiness/` (AOM-EA repo). Research lives here in the implementation repo because the worker is scoped to aom-studio; cross-link from the mission BUILD.md.

---

## 1. What "done" demands

> User describes 3 distinct work areas in one conversation; EA decides existing-project vs. new for each, scaffolds where needed, lands related chat in the right room. Confirmation should be batched / natural (not 3 separate confirm prompts).
>
> Acceptance gate: seeded conversation transcript with 3 distinct asks → run through EA → assert 3 project folders + at least one mission folder per, with VISION/CONTEXT stubs filled with the user's description.

Two pieces:
1. **Plumbing.** A single primitive that scaffolds N projects + at least one mission per. No N×6 round-trips, no N separate confirm prompts.
2. **Intent.** The EA must know to *parse* a multi-ask message, batch the scaffold, narrate it as one motion, not three.

---

## 2. State at HEAD (2026-05-05, after LR-2 ship)

| Building block | Where | Notes |
|---|---|---|
| Project scaffold (6 stubs → events) | `api/dashboard/scaffold-project.js` | Idempotent. Tenant-gated via `verifyTenant`. Stamps `payload.tenant_id`. One project per call. |
| Mission scaffold (Russian-doll) | `api/dashboard/scaffold-mission.js` | Same pattern. `agent` key is `parent_slug:mission_slug`. |
| LR-2 voice onboarding | `src/pages/OnboardingVoice.jsx` | Q3 → ONE project insert + ONE scaffold-project call. Hard single-project bias by design. |
| EA system prompt | `api/dashboard/ea-system-prompt.js` | R78-p1 already has `# ACTIVE PROJECTS` + `# NOVEL TOPIC ROUTING`. Single-topic flow. No multi-ask handling. |
| Dispatch agent tools | `api/dashboard/chat.js` | `write_task`, `check_task`. Tool-use loop ready. EA isn't in `DISPATCH_AGENTS` (it goes through chat-bridge → tmux). |
| EA chat path | `api/dashboard/chat-bridge.js` | Persists to Supabase + relays to local bridge → tmux. EA tmux has bash + curl, can call any endpoint. |

Gaps for LR-3:
- **No batch primitive.** Three projects = three POSTs to `/scaffold-project` + three POSTs to `/scaffold-mission`. Tolerable but every caller (EA tmux, chat.js dispatcher, future onboarding-multi) duplicates the orchestration + slug derivation.
- **No multi-ask intent in EA prompt.** The current "NOVEL TOPIC ROUTING" block is single-topic. A user who lists three work areas in one breath gets either three serial confirmations or (worse) one of them silently dropped.
- **Mission-first compliance is best-effort.** `super-agent-mission-first.md` says no work in a project without a mission home. The scaffold today creates the project box but no default mission — drift waiting to happen.

---

## 3. Design

### 3a. New endpoint: `POST /api/dashboard/ea-scaffold-batch`

One call. N projects. Each project always gets at least one mission scaffolded (default `first-brief` if the caller doesn't name one) — closes the mission-first gap from LR-5 ahead of time, intentionally, because the EA is the obvious enforcement point and a hollow project box is the exact drift the rule was written to prevent.

Request:
```jsonc
POST /api/dashboard/ea-scaffold-batch
{
  "tenant": "world-slug",
  "workspace_name": "Patrik's Studio",      // optional, used in stub copy
  "items": [
    {
      "name": "Video production",
      "description": "Long-form research videos and brand films.",
      "mission": { "name": "Q4 reel", "description": "Edit + publish 3 clips by EOQ." }
    },
    {
      "name": "Sales outreach",
      "description": "Cold→warm pipeline for AOM."
    },
    {
      "name": "Recipe SaaS",
      "description": "Side project: recipe planner with shopping-list export."
    }
  ]
}
```

Response (per-item, partial-failure-safe):
```jsonc
{
  "ok": true,
  "tenant": "world-slug",
  "results": [
    { "ok": true, "slug": "video-production", "name": "Video production",
      "project_files": 6, "mission_slug": "q4-reel", "mission_files": 6 },
    { "ok": true, "slug": "sales-outreach",   "project_files": 6,
      "mission_slug": "first-brief", "mission_files": 6 },
    { "ok": true, "slug": "recipe-saas",      "project_files": 6,
      "mission_slug": "first-brief", "mission_files": 6 }
  ]
}
```

Behaviour:
- `verifyTenant` once at the top — one user, one JWT, even for many things.
- For each item: slugify name (loose, then validate against `^[a-z][a-z0-9-]*$`), best-effort `INSERT INTO projects` (idempotent against duplicate slug), upsert the 6 project stubs, then upsert the 6 mission stubs (default `first-brief` if not provided).
- Partial failures surfaced row-by-row; never roll back successful scaffolds.

Why a separate endpoint (vs. extending scaffold-project):
- `scaffold-project` is single-shot by contract, used by the OnboardingVoice flow and direct curl. Don't risk breaking the LR-2 path.
- LR-3 is "multi" by definition; a different surface keeps the contract honest.
- The EA can curl this from tmux today, AND chat.js can expose it as a structured tool tomorrow — same primitive.

### 3b. Update `ea-system-prompt.js` — multi-ask handling

Extend the existing `# NOVEL TOPIC ROUTING` block with a multi-ask clause:

> When the user lists more than one distinct work area in a single message,
> don't ask three separate confirmations. Engage with all three together,
> then propose the batch in one card: *"Sounds like three threads — X, Y, Z.
> Want me to spin all three up so we can keep them separate from day one?"*
> If they say yes, call `scaffold_projects_batch` with all three at once.

Single-topic path stays intact. EA has the active-project list in its prompt — it should match each ask against the existing list before proposing new ones (existing-vs-new decision is already implicit in the current prompt; the multi-ask clause inherits it).

### 3c. Add `scaffold_projects_batch` to `chat.js` TOOLS

Dispatcher agents (`elon`, `gary`, `mom`) — and any future EA-via-chat.js routing — get a structured tool that wraps the new endpoint. EA tmux can curl directly with the service-role key.

### 3d. Mission-first enforcement

Bake into the endpoint: every project gets a mission, no skip flag. The system invariant the doctrine demands becomes a property of the only conversational scaffold path. LR-5's broader "every touched project has a mission" sweep still has work — but the new-project surface is closed.

---

## 4. Acceptance gate

`tests/lr3-multi-project.test.mjs` — node script that:

1. Requires `STAGE_URL` (defaults to localhost:3000) + `STAGE_JWT` for auth.
2. POSTs a 3-item payload (with one item providing a custom mission, two falling back to default `first-brief`).
3. Reads back `events` rows for `event_type='scaffold_file'` with each project slug as `agent` → asserts 6 files each.
4. Reads back `events` rows for each `${slug}:${mission_slug}` agent path → asserts 6 files each.
5. Asserts the user-supplied description appears verbatim in the project's VISION.md and CONTEXT.md stubs.
6. Cleanup: DELETE inserted rows by their ids.

When `STAGE_URL` / `STAGE_JWT` are absent, the script falls back to a handler-level dry-run that imports the route handler, invokes it with mock req/res, and walks the in-process Supabase fetch calls (matches `rightclick-menus.test.mjs`'s pattern of failing soft when env is missing).

---

## 5. Cross-mission notes

- **LR-5 (mission-files protocol enforced):** the batch endpoint hard-enforces mission-per-project, ahead of LR-5's broader sweep. Log under LR-5 punchlist that "new-project surface is closed; remaining work is touched-project enforcement (workers landing in pre-existing project boxes that lack missions)."
- **LR-1+2 (onboarding):** future onboarding-multi flow (where Q3 accepts multiple asks) can call this endpoint directly. Out of LR-3 scope but the primitive is reusable.
- **tenant-isolation:** the batch endpoint reuses `verifyTenant` exactly as scaffold-project / scaffold-mission do. No new RLS surface.
- **launch-mvp / project-from-chat:** R78-p1 ("novel topic routing in EA prompt") gets the multi-ask extension. Same prompt file, additive change.

---

## 6. Files this round will touch

| File | Change |
|---|---|
| `api/dashboard/ea-scaffold-batch.js` | NEW — multi-project + mission batch endpoint |
| `api/dashboard/ea-system-prompt.js` | Extend NOVEL TOPIC ROUTING with multi-ask clause |
| `api/dashboard/chat.js` | Add `scaffold_projects_batch` to TOOLS + executor |
| `tests/lr3-multi-project.test.mjs` | NEW — node script gate |
| AOM-EA `corner/missions/launch-readiness/BUILD.md` | Mark LR-3 done (cross-repo edit, done from a separate session — see commit message) |

No DB migrations, no schema changes, no breakage to LR-2's OnboardingVoice flow.
