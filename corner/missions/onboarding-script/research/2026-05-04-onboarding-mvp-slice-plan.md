# Onboarding Script — OB0 MVP Slice Plan
**Date:** 2026-05-04  
**Round:** OB0-research  
**Status:** Complete — awaiting Patrik review before OB1 queues

---

## Executive summary

The three-question voice onboarding exists as a new route (`/onboarding/voice`) that reuses the already-mature voice infrastructure (VoiceChat, audioUtils, useVoiceChat) plus the StepThread UI primitive. The smallest end-to-end demoable slice is a single new file — `src/pages/OnboardingVoice.jsx` — plus a one-line route addition in `src/main.jsx`. Nothing else needs to be built or changed for the demo.

---

## Question state model

```
INTRO
  │ user speaks / EA greets
  ↓
Q1_LISTENING  — "What's your workspace called?"
  │ voice answer captured + EA repeats back
  ↓
Q1_CONFIRMED  — narration: "Setting up <workspace> as your home base..."
  ↓
Q2_LISTENING  — "What kinds of work do you do?"
  │ voice answer captured + EA patterns to skill category
  ↓
Q2_CONFIRMED  — narration: "Adding <domain> tools to your toolkit..."
  ↓
Q3_LISTENING  — "What's the first thing you want help with?"
  │ voice answer captured
  ↓
Q3_CONFIRMED  — narration: "Creating <project> as your first project. Your EA is reading the brief now..."
  ↓
SCAFFOLDING   — StepThread shows 3 live steps (workspace → EA → project)
  ↓
DONE          — "Your command center is ready." → redirect /dashboard
```

Each state transition is driven by a voice transcript event (or fallback: text submit). The state machine lives as a `useReducer` in `OnboardingVoice.jsx`.

---

## EA narration script (per-step speech lines)

| After | EA speaks | UI change concurrent with speech |
|-------|-----------|-----------------------------------|
| Q1 confirmed | "Setting up [workspace] as your home base." | Workspace badge appears in nav mock |
| Q2 confirmed | "Adding [domain] tools to your toolkit." | Domain icon row appears |
| Q3 confirmed | "Scaffolding [first-thing] as your first project. Your EA is reading the brief now." | Project card appears in mock panel |
| SCAFFOLDING step 1 done | (silent — StepThread shows "Workspace created") | StepThread dot turns green |
| SCAFFOLDING step 2 done | "Your EA is online." | Second dot turns green |
| SCAFFOLDING step 3 done | "You're ready. Welcome to your command center." | Third dot turns green → redirect |

Speech is delivered via Gemini Live through the existing VoiceChat voice path, or via browser `speechSynthesis` as a lightweight fallback. If the user has muted, narration text still renders visually.

---

## Domain pattern-matching (Q2 → skill category)

| Spoken keywords | Maps to | Icon |
|-----------------|---------|------|
| video, film, footage, edit | `video` | 🎬 |
| brand, design, visual, logo | `brand` | 🎨 |
| code, dev, build, software | `code` | 💻 |
| sales, outreach, leads, pipeline | `sales` | 📈 |
| ops, admin, scheduling, calendar | `ops` | ⚙️ |
| (no match) | `general` | ⭐ |

Pattern matching runs client-side with a simple keyword array lookup — no LLM call needed. Multiple domains can match; store as an array in state.

---

## Post-Q3 scaffolding actions

These happen in SCAFFOLDING state. Three steps, visible in StepThread:

**Step 1 — workspace metadata**  
`PATCH supabase.auth.updateUser({ data: { workspace_name, world, onboarded: true, domains } })`  
Sets the slug and marks onboarding complete. Existing AuthGuard reads `meta.onboarded` to decide route.

**Step 2 — EA agent row**  
`POST /api/dashboard/create-agents` with `[{ name: "<workspace> EA", role: "ea", type: "ea" }]`  
Reuses existing endpoint at `api/dashboard/create-agents.js:1`. EA naming follows `corner:ea-naming` doctrine — default `"{workspace} EA"`.

**Step 3 — first project**  
`POST /api/dashboard/create-agents` with a project-type agent, or direct Supabase insert into `agent_status` with `type: 'project'`.  
Name = Q3 answer (trimmed, sentence-cased). For MVP this is a seeded agent_status row only — no filesystem scaffold needed.

Recipes seeding is deferred to OB3.

---

## Concrete file paths

### New files (OB1 creates)

| File | Purpose |
|------|---------|
| `src/pages/OnboardingVoice.jsx` | Main 3-question voice flow — state machine, question rendering, StepThread wiring |

### Modified files (OB1 touches minimally)

| File | Change |
|------|--------|
| `src/main.jsx` | Add route `path="/onboarding/voice"` → `<OnboardingVoice />`; update AuthGuard redirect for fresh users from `/onboarding` → `/onboarding/voice` (1–2 lines) |

### Reused files (no changes needed)

| File | What it provides |
|------|-----------------|
| `src/dashboard/components/VoiceChat.jsx` | Voice I/O via Gemini Live WebSocket |
| `src/dashboard/hooks/useVoiceChat.js` | WebSocket lifecycle, transcript events |
| `src/dashboard/lib/audioUtils.js` | PCM encode/decode, mic capture, playback queue |
| `src/dashboard/components/cv3/shared/StepThread.jsx` | Animated step dots for scaffolding visualization |
| `api/dashboard/create-agents.js` | Agent + project row creation |

### Existing files to READ (not change) for context

| File | Why |
|------|-----|
| `src/pages/Onboarding.jsx` | Existing 4-step text onboarding — reference only; not replaced in OB1 |
| `src/dashboard/OnboardingGuide.jsx` | Sprite-based guide; may reuse step animation ideas |
| `api/dashboard/create-world.js` | Admin world-creation (NOT used in user self-onboarding) |

---

## Smallest demoable slice (OB1 scope)

**One file, one route. No backend changes required for the demo.**

`src/pages/OnboardingVoice.jsx` contains:
1. A `useReducer` state machine (7 states above)
2. Three voice input captures using `VoiceChat` or a lightweight mic hook from `useVoiceChat`
3. A `StepThread` with 3 steps shown during SCAFFOLDING
4. Narration text rendered as speech AND as visible caption beneath each question
5. Mock/simulated scaffolding (no real API calls) for the demo — real APIs wire in OB3

`src/main.jsx` gets one new route line + one redirect line change.

Estimated: **200–280 lines of JSX** in a single file. No new API endpoints, no DB schema changes, no new dependencies.

---

## Out-of-MVP items (deferred)

| Item | Deferred to |
|------|------------|
| Recipes seeding (post-Q3 "try these first") | OB3 |
| Text-fallback input mode | OB4 |
| Multi-user / org world creation | Out of scope entirely (OB0) |
| Voice-call long-form recording | `corner:phone-recording` mission |
| Skill-catalog recommendations post-onboarding | `corner:living-skill-catalog` mission |
| File-system workspace scaffold (GitHub creation) | OB3 (hooks into existing `onboarding_queue`) |
| Animated UI surface changes (real workspace dropdown appearing) | OB2 polish pass |

---

## Open questions for Patrik before OB1

1. **Voice channel:** The existing `VoiceChat.jsx` uses Gemini Live for bidirectional voice. Is that the right channel for onboarding, or should onboarding use a simpler STT-only approach (browser Web Speech API) to avoid the session-setup latency for brand-new users?
2. **Route strategy:** New `/onboarding/voice` route alongside existing `/onboarding`, or replace the existing `/onboarding` entirely? Replacement is cleaner but risks breaking existing QA flows.
3. **Demo fidelity:** OB1 demo — simulate scaffolding (fake delays + StepThread progression) or wire real API calls immediately? Simulated is faster to ship for a review but fake.
