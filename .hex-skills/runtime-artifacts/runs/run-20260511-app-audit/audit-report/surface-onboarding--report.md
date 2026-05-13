# Onboarding Surface Audit Report
**Run ID:** `surface-onboarding` | **Date:** 2026-05-11 | **Target Vision:** VISION.md §Onboarding (ratified 2026-05-02)

## Vision Commitments vs Code

| Commitment | Grade | Evidence | Status |
|---|---|---|---|
| **Voice-first onboarding** | PARTIAL | OnboardingVoice.jsx fully implements (lines 1-525, state machine + Speech Recognition API). Onboarding.jsx does NOT (lines 200+, form-only). App router unclear on which is default. | DRIFTED |
| **Three-question script (fixed order)** | BUILT | OnboardingVoice.jsx lines 88-116: state machine enforces Q1 ("workspace?") → Q2 ("work areas?") → Q3 ("first thing?") sequence. Questions hardcoded, order locked. | BUILT |
| **EA actively narrates + scaffolds** | BUILT | OnboardingVoice.jsx lines 121-127: `narrate()` emits speechSynthesis during flow. Lines 49-78: `scaffoldFirstProject()` creates real project scaffold (workspace + domain detection). Line 264: narration fires during scaffolding. | BUILT |
| **Default EA name "{workspace} EA"** | MISSING | OnboardingVoice.jsx scaffolds project but does NOT set EA name. `scaffoldFirstProject()` (lines 49-78) writes workspace + domains to metadata; EA naming logic not present. | MISSING |
| **Day-one EA only** | PARTIAL | OnboardingVoice.jsx lines 80-85: `markOnboardingComplete()` sets user metadata flags. Onboarding.jsx line 312+: calls `/api/onboarding/create-agents` (plural), suggesting multi-agent creation. Which is active is unknown. | DRIFTED |
| **Workspace name → work areas → first thing flow** | BUILT | OnboardingVoice.jsx: questions map directly (Q1 = workspace name, Q2 = work areas via domain matching, Q3 = first thing). State machine enforces order. | BUILT |

## Top 3 Gaps

1. **Two competing implementations (DRIFTED):** Onboarding.jsx (4-step form, multi-agent) and OnboardingVoice.jsx (3-question voice, EA-only) coexist. App router doesn't specify which is default or active. One must be killed; the other becomes canonical. **Count: 1 critical blocker.**

2. **EA naming unimplemented (MISSING):** OnboardingVoice.jsx scaffolds workspace metadata but does NOT set EA display name to "{workspace} EA". Metadata write is incomplete. **Count: 1 field missing.**

3. **Multi-agent vs EA-only conflict (DRIFTED):** Onboarding.jsx calls `/api/onboarding/create-agents` (plural agents). OnboardingVoice.jsx only marks onboarding complete but doesn't explicitly prevent multi-agent spawn. Day-one EA-only commitment is ambiguous. **Count: 1 behavioral ambiguity.**

---

## Summary

**Commitments Built:** 3/6 (50%)  
**Commitments Partial:** 2/6 (33%)  
**Commitments Missing:** 1/6 (17%)  
**Commitments Drifted:** 2/6 (33%)

The voice-first three-question flow with active narration + scaffolding is architecturally sound in OnboardingVoice.jsx. The critical gap is **router-level ambiguity**: two onboarding surfaces exist, only one aligns with vision, and it's unknown which the app uses. EA naming is a single-field fix. Multi-agent creation during onboarding violates day-one EA-only but may be API-side (unclear from current surface read).

**Immediate Action:** Determine app routing (which onboarding surface is active). Kill the non-vision one. Implement EA name assignment in scaffolding. Verify API doesn't create multi-agents when vision specifies EA-only.
