# Voice Surface Audit — Corner App

## Summary

The Voice surface implements live call persistence and phone recording modes against the stated vision. Core affordances (floating call bar, explicit end-only, phone icon) are present and functional. Post-processing pipeline (speaker diarization, multi-mission routing) has no visible implementation.

**Top 3 Gaps:**
1. **Speaker diarization (MISSING)** — PhoneRecordingOverlay shows generic "Transcribing…" spinner (line 99); no speaker labels or diarized transcript visible in UI or component structure.
2. **Multi-mission routing (MISSING)** — Phone recording flow does not show logic to spawn multiple missions from a single transcript or parse intent from transcript text.
3. **Post-call transcript routing (MISSING)** — useTelephone hook (CornerV3.jsx:194) triggers recording but no visible handler chains transcript to project/mission assignment or auto-relocation if recorded in wrong room.

---

## Detailed Findings

### BUILT

**Live voice call persistence across navigation**
- File: `src/dashboard/providers/LiveCallProvider.jsx` (lines 1–74)
- Evidence: Provider wraps entire CornerV3 tree (confirmed via grep); session state managed at top level (line 19); VoiceChat component mounted in hidden div when session non-null (lines 54–70), survives all route changes within dashboard context.
- Status: BUILT. Persistence mechanism is sound.

**Floating call bar with agent name, status, mute, end buttons**
- File: `src/dashboard/components/cv3/voice/FloatingCallBar.jsx` (lines 24–96)
- Evidence: Fixed position viewport bottom (lines 27–30: `position: 'fixed', bottom: 0`); agent name rendered (line 50: `{session.agentSlug}`); status labels for connecting/listening/speaking/error (lines 7–12, 52–56); mute button with toggle (lines 59–82); end button (lines 83–94).
- Status: BUILT. All affordances present and functional.

**Explicit end-only behavior (no auto-hangup on nav)**
- File: `src/dashboard/providers/LiveCallProvider.jsx` (lines 31–36)
- Evidence: `endCall()` explicitly sets session to null (line 33); no cleanup tied to route change or unmount. Call persists until user clicks End.
- Status: BUILT. Behavior matches vision.

**Phone recording mode icon in nav**
- File: `src/dashboard/CornerV3.jsx` (lines 601–618)
- Evidence: Phone icon in top-right nav actions, toggles recording overlay visibility (phoneOverlayOpen state, line 192); opens PhoneRecordingOverlay full-screen.
- Status: BUILT. Affordance present.

### PARTIAL

**Phone recording overlay UI states**
- File: `src/dashboard/components/cv3/phone-recording/PhoneRecordingOverlay.jsx` (lines 1–170)
- Evidence: Recording state with pulse + timer (lines 51–86), transcribing state with spinner (lines 89–102), error state with message (lines 105–125), done state with transcript preview (lines 128–143), auto-close after 2s (lines 25–29).
- Gap: Transcript preview truncated to 200 chars (line 140: `{lastTranscript.slice(0, 200)}`); no speaker labels or structured diarization visible.
- Status: PARTIAL. UI states exist; diarization missing.

### MISSING

**Speaker diarization in transcript**
- Vision commitment (from `corner/VISION.md`): "Phone recording mode with speaker diarization and multi-mission routing from single transcript."
- Code search: PhoneRecordingOverlay.jsx shows only generic transcript text (line 140), no speaker field, no label structure, no diarization markers visible.
- Status: MISSING. Zero implementation in UI layer; unclear if backend processes diarization at all.

**Multi-mission routing from single transcript**
- Vision commitment: Same as above.
- Code search: useTelephone hook (CornerV3.jsx:194) manages recording state; no visible routing logic, no project/mission selector, no parsing logic to infer multiple destinations from transcript content.
- Status: MISSING. No component or handler found.

**Auto-relocation if transcript recorded in wrong room**
- Vision commitment (inferred from "multi-mission routing"): Transcript should route to correct project/mission even if recording initiated in wrong context.
- Code search: PhoneRecordingOverlay closes silently after 2s (line 27); lastTranscript state not traced to any downstream action in CornerV3.
- Status: MISSING. No evidence of post-processing handler.

**Post-call summary or transcript archive**
- Vision commitment (from `corner/VISION.md` voice flow): "Agent processes transcript post-call… routes to right project/mission."
- Code search: onToggle/onClose handlers in PhoneRecordingOverlay do not chain to any task/message creation or archive UI.
- Status: MISSING. No visible post-processing pipeline.

---

## Verdict

**Coverage: 4 BUILT, 1 PARTIAL, 4 MISSING (out of 9 vision commitments audited)**

The Voice surface successfully delivers persistent live calls and phone recording affordances — the two primary UX pillars. Post-processing (diarization, intelligent routing, multi-mission spawning) is either incomplete or deferred to a backend service not visible in the frontend code. The gap between "record a call" and "call lands in the right place with speaker labels" is material for a launch product.

Recommended action: Clarify whether diarization + routing are handled server-side (and thus out of scope for this audit) or represent a true feature gap requiring implementation before ship.
