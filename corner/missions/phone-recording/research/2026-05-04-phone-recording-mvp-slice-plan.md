# Phone Recording Mode — PR0 MVP Slice Plan
**Date:** 2026-05-04  
**Round:** PR0-research  
**Status:** Complete — awaiting Patrik review before PR1 queues

---

## Executive summary

The foundation already exists. `useTelephone.js` implements the core MediaRecorder → transcribe → post-to-agent loop and is mounted at CornerV3 level today. Its phone icon lives on the home INPUT BAR (bottom), not the top-right nav area the vision calls for. The MVP slice is therefore: **move the entry point to the nav area and wrap it in a dedicated recording surface** — the transcription backend doesn't change, the audio storage doesn't change, the events table row doesn't change. One new component file plus targeted edits to CornerV3.

---

## Current state of useTelephone (what already ships)

| Capability | Status |
|---|---|
| MediaRecorder capture (`audio/webm`) | ✅ Live — `src/dashboard/hooks/useTelephone.js` |
| Audio upload to `phone-audio` Supabase bucket | ✅ Live |
| Transcription via `/api/dashboard/v2-transcribe-audio` (Gemini Flash) | ✅ Live |
| `events` table row (`event_type: 'phone_transcript'`) | ✅ Live |
| Routes to single super-agent via `[telephone transcript]` prefix | ✅ Live |
| Phone icon on home INPUT BAR (bottom, inline with composer) | ✅ Live |
| Recording persists across Home/Tasks/Chat tab navigation | ✅ Live |

**What's missing vs. the vision:**

| Gap | Notes |
|---|---|
| Phone icon in TOP-RIGHT nav area (Row 1 or as dedicated entry) | Spec says top-right; current is bottom input bar |
| Dedicated recording surface / overlay (not an inline button) | Vision implies a deliberate long-form mode, not a stealth toggle |
| Content routing to multiple projects/missions | Core vision differentiator; not in useTelephone |
| Speaker diarization | Post-MVP |
| Multi-mission spawn | Post-MVP |

---

## Recording state model

```
IDLE
  │ user taps phone icon in nav
  ↓
RECORDING  — mic captured, elapsed timer, pulsing record indicator
  │ user taps stop (or RecordingOverlay stop button)
  ↓
TRANSCRIBING  — spinner, "Transcribing…" label, mic released
  │ /api/dashboard/v2-transcribe-audio resolves
  ↓
ROUTING  — PR4+ only: transcript → project classifier
  ↓                    (PR1 skips to DONE directly)
DONE  — transcript on home tape; overlay closes; success toast
  │ (if empty audio)
  ↓
ERROR  — "No speech detected" or transcription failure message
```

Each state maps to UI shown inside `PhoneRecordingOverlay.jsx`.

---

## Smallest demoable slice (PR1 scope)

**Two files changed, one file new. No new API endpoints. No new DB schema.**

### What PR1 delivers
1. Phone icon added to nav Row 1 right side (next to `BellIcon`, before `UserAvatar`)
2. Clicking the icon opens `PhoneRecordingOverlay` — a full-screen dark overlay with:
   - Pulsing red record dot + elapsed timer (mm:ss)
   - Large "Stop" button
   - "Transcribing…" spinner after stop
   - Transcript preview text (first 200 chars) on success
3. On transcript: same dispatch as today — `[telephone transcript]` → rex / selectedAgent, lands on home tape
4. The inline phone button on the home input bar is **removed** (PhoneRecordingOverlay replaces it entirely)
5. No routing, no diarization, no multi-mission spawn — those are PR4/PR5

This is the minimum that demos the "tap phone → see recording surface → transcript lands" experience.

---

## Concrete file paths

### New file (PR1 creates)

| File | Purpose |
|---|---|
| `src/dashboard/components/cv3/phone-recording/PhoneRecordingOverlay.jsx` | Full-screen recording surface — state display (IDLE/RECORDING/TRANSCRIBING/DONE/ERROR), stop button, transcript preview. Reads state from `useTelephone` hook passed as props. |

### Modified files (PR1 touches)

| File | Change |
|---|---|
| `src/dashboard/CornerV3.jsx` | (1) Add `<PhoneIcon>` button next to `BellIcon` in nav Row 1 right area (line ~480). (2) Mount `<PhoneRecordingOverlay>` conditionally (`isRecording \|\| isTranscribing`). (3) Remove existing inline phone button from home input bar (line ~679–700). |

### Reused files (no changes needed)

| File | What it provides |
|---|---|
| `src/dashboard/hooks/useTelephone.js` | MediaRecorder lifecycle, transcription, dispatch — zero changes for PR1 |
| `api/dashboard/v2-transcribe-audio.js` | Server-side Gemini Flash transcription — already handles `audio/webm` |
| Supabase `phone-audio` bucket | Audio storage — already provisioned |
| Supabase `events` table | `phone_transcript` event logging — already live |
| `src/dashboard/lib/cv3Colors.js` (`C`) | Color tokens for overlay styling |

### Files to READ for context (not change)

| File | Why |
|---|---|
| `src/dashboard/CornerV3.jsx:458–530` | Nav Row 1/Row 2 layout — understand where icon slots live |
| `src/dashboard/CornerV3.jsx:678–700` | Existing inline phone button — this is what PR1 removes |
| `src/dashboard/components/cv3/shared/HeaderActionsDrawer.jsx` | Drawer pattern used in chat headers — reference for icon tray design if top-right area evolves |
| `src/dashboard/hooks/useTelephone.js` | Full implementation — PR1 reuses without changes |
| `src/dashboard/providers/LiveCallProvider.jsx` | Live-call ownership model — phone recording must coexist (separate state, no conflict) |

---

## Coexistence with live-call

`useTelephone` is independent of `LiveCallProvider` — it owns its own `MediaRecorder` and does not touch Gemini WebSocket state. They can run simultaneously without conflict today. PR1 does not change this.

For PR4+ (routing), a coordination rule may be needed: "if a live-call is active, offer to end it before starting a phone recording." That decision is deferred.

---

## PR4 routing model (preview — not in PR1)

When routing lands, the post-stop flow becomes:

```
transcript text
  → POST /api/dashboard/phone-routing  (new endpoint)
      body: { text, worldId }
      returns: [{ projectSlug, missionSlug, confidence }]
  → for each route: post '[telephone transcript]' to that project's tape
  → if confidence < threshold: land on home tape as fallback
```

Routing logic (can start as Gemini Flash prompt, not a trained model):
- Mentions a known project name → route to that project's tape
- Mentions "new project" / "let's add this" → trigger project-from-chat flow (separate mission)
- Action items ("we should X", "I'll follow up") → queue tasks under matched project
- No match → home tape (same as today)

---

## Out-of-MVP items

| Item | Deferred to |
|---|---|
| Content routing to multiple projects | PR4 |
| Speaker diarization | PR3 |
| Multi-mission spawn from one recording | PR5 |
| "Add as project" trigger from transcript | PR4 routing |
| Real-time transcription during recording | Out of scope (post-stop is sufficient) |
| Live conversational voice | Sibling mission `corner:live-call` |
| Recording surface on mobile (native app) | Out of scope entirely |
| Playback of recorded audio inside the overlay | Out of scope for PR1 |

---

## Open questions for Patrik before PR1

1. **Overlay vs. modal vs. sheet:** PR1 assumes a full-screen dark overlay (like a phone dialer). Alternative: a bottom sheet that slides up over the existing nav. Which feels more intentional for "I'm about to record a meeting"?

2. **Input bar phone button:** PR1 removes it (replaced by the nav icon). Is that the right call, or should both entry points coexist temporarily during rollout?

3. **Routing endpoint timing:** Should PR4 routing live inside a new API endpoint (`/api/dashboard/phone-routing`) or extend the existing `/api/dashboard/v2-transcribe-audio` response with a `routes` field? Cleaner as a separate endpoint, but bundling avoids an extra round-trip.
