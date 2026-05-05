# LR-4a Research: Phone Parity (Gemini call produces same scaffolds as text path)

**Date:** 2026-05-05
**Round:** LR-4a — Phone parity (sub-round of LR-4)
**Mission:** corner:launch-readiness
**Type:** Research → small implementation pass

> Mirror of the mission research note. Lives in aom-studio because the
> worker pre-tool-use hook blocks writes into AOM-EA. Will be re-mirrored
> into `corner/missions/launch-readiness/research/` from an AOM-EA-side
> commit.

---

## 1. What "phone parity" means after LR-2 + LR-3 shipped

LR-2 (2026-05-05) wired the three-question voice onboarding flow inside
`src/pages/OnboardingVoice.jsx`. As each answer lands, the page writes
directly to Supabase:

- Q1 → `supabase.auth.updateUser({ workspace_name })`
- Q2 → `supabase.auth.updateUser({ work_areas: [...] })` (recipe-flask seed)
- Q3 → `supabase.from('projects').insert(...)` + `POST /api/dashboard/scaffold-project`
- DONE → `has_completed_onboarding=true`

LR-3 (2026-05-05) added `ea-scaffold-batch` + `scaffold_projects_batch`
multi-ask scaffolding inside the EA chat flow.

So for LR-4a, "produces the same scaffolds + chat-room landings as the text
path" means: a Gemini live call ending in the EA room must land its
transcript/summary in the EA's relay-inbox the same way a typed dashboard
message would, so the EA's tmux Claude Code session can act on it (multi-ask
scaffolding included) using the LR-3 batch path.

## 2. Current state — what already works

### 2.1 voice-handoff.js (R28, guaranteed delivery)

`POST /api/dashboard/voice-handoff` accepts any agent slug — no allowlist.
On call end the dashboard `await`s a POST that writes one row to `messages`
with `role='user', source='voice-handoff', agent=<slug>`, body = preamble +
full transcript. Fires for **every** agent including `ea`. ✓

### 2.2 voice-summary.js (Haiku-richer summary, fire-and-forget)

`POST /api/dashboard/voice-summary` summarises the transcript with Haiku
4.5 and writes one `messages` row with `source='voice-summary'`. **Today
gated by `TERMINAL_AGENTS = {'elon', 'gary'}`** — a POST with `agent='ea'`
returns 400. The dashboard mirrors this set in
`src/dashboard/components/VoiceChat.jsx` to decide whether to fire the
summary path at all.

This is the central gap.

### 2.3 supabase-listener.py — already symmetric

`handle_message()` already lists both `voice-handoff` and `voice-summary`
in `allowed_sources`:

```python
allowed_sources = ("dashboard", "web", "corner-dashboard",
                   "corner-dashboard-task", "queued-followup",
                   "voice-summary", "voice-handoff")
```

After the source check, the handler does:

1. `_append_voice_call_to_tape(agent, text, source, record)` for both voice
   sources (R75-b4).
2. `_get_tmux_session_for_agent(agent, client_id)` — for `agent='ea'` this
   resolves the per-tenant client-EA session out of `CLIENT_EA_SESSIONS`.
3. `inbox_slug = agent_registry.inbox_slug_for(agent, client_id)`.
4. `write_to_relay_inbox(text, msg_id, "corner-dashboard", agent_slug=inbox_slug, project=project_slug, client_id=client_id)`.

This is the **same final path** a typed dashboard message takes. The relay
entry is written to `relay-inbox-<slug>.jsonl`; the watchdog pokes the EA's
tmux when idle; the EA's Claude Code session reads the inbox via its
UserPromptSubmit hook and processes the body. The body contains the
`[VOICE CALL HANDOFF -- room=<agent>...]` preamble, so the EA can
distinguish source if it cares.

**No injection of "onboarding intent" exists in supabase-listener.py
today** — Phase 2 of LR-1+2 was paused (Patrik allowlist gate, see
CONTEXT.md). LR-2 chose to do all onboarding work in the frontend
(OnboardingVoice.jsx). So the spec line "ensure onboarding-intent injection
covers voice-handoff source" is moot in the listener: there is no
text-only injection branch to make symmetric. Voice and text already
travel the same code path.

### 2.4 EA tmux + multi-ask scaffolding (LR-3)

Once a voice-handoff/voice-summary message lands in `relay-inbox-ea.jsonl`,
the EA's Claude Code session sees the full transcript or summary in its
prompt and can call `scaffold_projects_batch` (LR-3) the same way it does
for typed multi-ask messages. No further routing change is required for
multi-project parity — the LR-3 tool surface is agnostic to source.

## 3. Required changes for LR-4a

Single-purpose: bring the `ea` agent into `TERMINAL_AGENTS` so the
Haiku-richer summary path also fires for EA voice calls.

1. `aom-studio/api/dashboard/voice-summary.js`
   - `TERMINAL_AGENTS`: `{'elon', 'gary'}` → `{'elon', 'gary', 'ea'}`
   - Update the comment that names the mirror set.

2. `aom-studio/src/dashboard/components/VoiceChat.jsx`
   - `TERMINAL_AGENTS`: `{'elon', 'gary'}` → `{'elon', 'gary', 'ea'}`
   - Comment update.

That is the entire delta — confirms the research note's 2026-04-26
"architecturally near-free" framing.

### What does NOT change

- `voice-handoff.js` — already agent-agnostic.
- `supabase-listener.py` — already routes both voice sources through the
  same handler, with the same tape append + relay-inbox write.
- `agent_registry.py` — `client_ea_sessions()` already keys by
  `(agent='ea', client_id)`; nothing voice-specific to add.

### Note on the brief's "haiku-chat.js" mention

The round brief lists `aom-studio/api/dashboard/haiku-chat.js` as the
file to add `'ea'` to `TERMINAL_AGENTS`. A grep confirms `TERMINAL_AGENTS`
does not exist in `haiku-chat.js` (Bobby-tier dispatcher, unrelated to
voice post-call). The actual home of `TERMINAL_AGENTS` is
`api/dashboard/voice-summary.js` and `src/dashboard/components/VoiceChat.jsx`,
matching `research/2026-04-26-lr12-onboarding-research.md` §5. Following
the research, not the brief filename hint.

## 4. Acceptance gate for LR-4a

Static-source-grep gate (mirrors LR-1 / LR-2 gate style; runs offline; no
real Gemini call required). Lives at
`scripts/accept/LR-4a_phone_parity.py`:

1. `voice-summary.js`: `TERMINAL_AGENTS` includes `'ea'`.
2. `voice-summary.js`: error string still mentions which agents are
   permitted (cosmetic but worth pinning so future drift is visible).
3. `VoiceChat.jsx`: `TERMINAL_AGENTS` includes `'ea'`.
4. `voice-handoff.js`: NOT gated by an agent allowlist (the route handler
   has no equivalent of `TERMINAL_AGENTS.has(agent)` rejection).
5. `supabase-listener.py` (in AOM-EA): `allowed_sources` contains both
   `voice-handoff` and `voice-summary`.
6. `supabase-listener.py`: `_append_voice_call_to_tape` is called for both
   voice sources before the relay-inbox write.
7. `supabase-listener.py`: relay-inbox + tmux routing for `agent='ea'` is
   the same `write_to_relay_inbox` call used for typed dashboard messages
   (no special voice branch).

End-to-end runtime gate (deferred — mirrors the LR-3 batch path live):
walk through a real Gemini voice call ending in the EA room with two
project asks; confirm two `scaffold_projects_batch` events in the events
table within ~60s, with the same shape as a text-path multi-ask. Out of
scope for this round's offline gate.

## 5. Cross-mission flags

### corner:tenant-isolation

The voice-summary handler still uses the service-role key directly. Per
R3 sweep, all dashboard endpoints are getting `verifyTenant`. When that
sweep reaches voice-summary, the new `'ea'` allowlist entry should not
need any extra plumbing — `client_id` is already passed through.

### corner:launch-mvp

The voice-summary system prompt still says "Patrik" explicitly. For
external-user EA calls (post-launch hybrid path per CONTEXT.md (d)), the
prompt should generalise to "the user". Out of scope for LR-4a parity;
log under launch-mvp as a small follow-up.

### corner:launch-readiness · LR-4b

LR-4b (live call persistence — floating call bar, ship-now) builds on
LR-4a. With `'ea'` in `TERMINAL_AGENTS`, the persistence work can assume
the same summary/handoff contract regardless of room.

## 6. Files examined

| File | Path | Finding |
|------|------|---------|
| voice-summary.js | `aom-studio/api/dashboard/voice-summary.js` | TERMINAL_AGENTS allowlist {elon,gary}; needs 'ea' |
| voice-handoff.js | `aom-studio/api/dashboard/voice-handoff.js` | Agent-agnostic; no change |
| VoiceChat.jsx | `aom-studio/src/dashboard/components/VoiceChat.jsx` | Mirrors TERMINAL_AGENTS; gates summary POST; needs 'ea' |
| supabase-listener.py | `AOM-EA/scripts/supabase-listener.py` | allowed_sources covers both voice sources; tape append + relay-inbox already symmetric |
| OnboardingVoice.jsx | `aom-studio/src/pages/OnboardingVoice.jsx` | LR-2 frontend onboarding; not on the post-call path |
| ea-scaffold-batch.js | `aom-studio/api/dashboard/ea-scaffold-batch.js` | LR-3 multi-ask batch scaffold; reachable from EA tmux for any source |
| haiku-chat.js | `aom-studio/api/dashboard/haiku-chat.js` | Bobby tier dispatcher; NOT the voice post-call path. (Brief mentions this file, but TERMINAL_AGENTS lives in voice-summary.js per the source grep.) |
