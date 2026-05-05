# LR-2 IMPL: three-question scaffold made real (2026-05-05 decision)

**Mission:** `corner:launch-readiness` LR-2
**Task:** dd2cdc0a-ab87-43bb-a412-0cb4ac616d8f
**Type:** Implementation — real DB writes wired into OnboardingVoice + acceptance gate
**Prior research (in AOM-EA repo):** `corner/missions/launch-readiness/research/2026-04-26-lr12-onboarding-research.md`, `2026-05-04-lr1-greeting-research.md`, `2026-05-04-lr1-impl-gate-transcript.md`

> Brief lives in `aom-studio/docs/briefs/` rather than the mission's `research/` folder
> because this implementation commit is scoped to the `aom-studio` repo. The
> mission's BUILD.md DONE marker + a copy of this note land in AOM-EA in a
> follow-up commit.

---

## Decision: Option C (wizard-first, scaffolding made real)

The 2026-05-04 LR-1 research raised three viable LR-2 paths:

- **A** — keep wizard, keep simulated scaffold (does not satisfy LR-2 acceptance: "populated world at end")
- **B** — remove wizard, run the three questions inside the EA chat thread (VISION-pure, but moves the state machine into the agent loop and depends on the PAUSED Phase 2 listener allowlist gate)
- **C** — keep wizard, write to the DB as each answer lands (additive, smallest path to acceptance)

**Pick C.** The OnboardingVoice page is already shipped UI with the three-question state machine, narration, and step-thread visuals. Acceptance asks for a populated world at the end — workspace named, recipe flask seeded from work-area tags, first project scaffolded with VISION/CONTEXT stubs. Nothing in that gate requires the questions to live inside the EA chat thread. Option B is a future migration; LR-2 itself is the "system comes alive" experience, and that's about scaffolding being real, not about which surface hosts the script.

Patrik's locked constraint (his account/world/rooms must not be touched) is satisfied by OnboardingVoice's existing early-exit at `meta.world || meta.onboarded || localStorage['corner-onboarded']==='true'` — Patrik never lands on the page. The LAUNCH_ONBOARDING_USERS allowlist gate from the 2026-04-26 PAUSED design is for Phase 2 relay-inbox injection (EA chat path), which is a separate workstream that lives in the AOM-EA repo and is not in scope for this LR-2 IMPL commit.

---

## Implementation map

| Step | Where | Write |
|------|-------|-------|
| Q1 confirmed (workspace name) | `OnboardingVoice.jsx` CONFIRM_Q1 effect | `supabase.auth.updateUser({ data: { workspace_name } })` |
| Q2 confirmed (work areas) | `OnboardingVoice.jsx` CONFIRM_Q2 effect | `supabase.auth.updateUser({ data: { work_areas: [<domain slugs>] } })` — seeds the recipe flask state at the user level. The recipes endpoint already filters by `category` (the work-area domain set: video, brand, code, sales, ops). |
| Q3 confirmed (first project) | `OnboardingVoice.jsx` SCAFFOLDING phase | (a) `supabase.from('projects').insert({ name, slug, color, is_active: true, client_id: worldSlug })`. (b) `authFetch('/api/dashboard/scaffold-project', { body: { slug, name, description, tenant: worldSlug } })` — writes the six VISION/RESEARCH/BUILD/CONTEXT/last-conversation/research-README stubs into events. |
| DONE | `OnboardingVoice.jsx` DONE phase | `supabase.auth.updateUser({ data: { onboarded: true, has_completed_onboarding: true } })` — replaces the localStorage-only flip so AuthGuard's DB-side check passes on next login / new device. |

All four are wrapped in best-effort try/catch. A failure does not block the user from reaching the dashboard — the existing localStorage flag still flips on DONE so `/onboarding/voice` won't trap them.

---

## Why writes are best-effort, not blocking

The "system coming alive" experience is real once the user sees the SCAFFOLDING step thread complete. If the projects insert returns 409 (slug taken) or scaffold-project 500s, the localStorage flag still flips and the user lands on `/dashboard`. A second pass (LR-3 or a self-heal nudge) can re-run the scaffold idempotently — `scaffold-project.js` already PATCHes existing rows by `(event_type, agent, payload->>filename)`. Net: no broken state on the unhappy path.

The pre-seeded EA greeting (LR-1, shipped 2026-05-04) remains the user's first message in the EA thread. The greeting text intentionally does not reference the onboarding answers; that coupling is deferred (Option C does NOT migrate the greeting into a post-onboarding rewrite — that's an LR-3 or LR-1+ refinement).

---

## Acceptance gate strategy

Mirror LR-1's static-source-grep gate (`scripts/accept/LR-1_greeting_seeded.py`). End-to-end runtime tests would require creating a real Supabase auth user, which pollutes production and is gated behind LR-final. Source-level checks are sufficient for an IMPL gate because each write is a single-line call against documented Supabase / authFetch APIs — there's no logic to validate at runtime that source inspection can't catch.

Gate file: `scripts/accept/LR-2_onboarding_scaffold.py`. Verifies state-machine ordering, narration, and the four DB writes.

---

## Cross-mission flags

- **`corner:launch-readiness`** — Phase 2 supabase-listener.py allowlist gate (PAUSED) remains the next LR-2/LR-3 prerequisite for EA-chat-thread onboarding. Today's LR-2 ships the wizard surface; the chat-thread surface is a separate AOM-EA commit.
- **`corner:tenant-isolation`** — `scaffold-project.js` already wires verifyTenant + tenant_id stamping (R77 t6). The OnboardingVoice call passes `tenant: worldSlug` from `meta.world`, which matches the JWT's `user_metadata.world`. No new isolation work needed.
- **`corner:files-in-app`** — first project scaffolded by OnboardingVoice should appear in the new user's Files panel immediately; verify on the LR-final dry-run.
- **`corner:project-from-chat`** — the Q3 → projects insert + scaffold-project pattern is the same primitive R78 will reuse from inside the EA chat thread.

---

## Files in this commit

| File | Change |
|------|--------|
| `src/pages/OnboardingVoice.jsx` | wire real Supabase writes for Q1/Q2/Q3/DONE; SCAFFOLDING step thread reflects actual operation |
| `scripts/accept/LR-2_onboarding_scaffold.py` | new acceptance gate, source-level checks |
| `docs/briefs/2026-05-05-lr2-impl-decision.md` | this document |

## Out of scope for this commit (separate AOM-EA commit)

- Mission `BUILD.md` DONE marker for LR-2.
- Mirror of this brief into `corner/missions/launch-readiness/research/`.
- Phase 2 supabase-listener.py allowlist gate (still PAUSED).
