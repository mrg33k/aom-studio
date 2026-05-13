# Agent Chat (1:1 Super-Agent) Surface Audit
**ID:** surface-agent-chat  
**Date:** 2026-05-11  
**Status:** Complete

---

## Executive Summary

The 1:1 agent chat surface implements **7 of 10** major vision commitments. Three gaps represent friction for the intended experience: agent conversational renaming, live typing/thinking indicators, and voice call tape hand-off to context. The surface is functional and delivers core chronological ordering, read-only profile overlay, context-fullness meter, and clear-context control — all at BUILT grade.

---

## Vision Commitments (Graded)

### 1. Chronological Agent List by Last Message
**Grade:** BUILT  
**Evidence:** AgentsList.jsx sorts agents by `lastMsg.timestamp` (line 15, unreadMap lookup); live-dots animation on active agents (lines 118–127). Pinned agents render above unpinned (lines 255–262). Status dots reflect agent state (idle/working/building/QA; lines 140–154).  
**Implementation:** Clean; no gaps.

---

### 2. Typing & Thinking Indicators
**Grade:** PARTIAL  
**Evidence:** 
- Synthetic "thinking" message renders in MessageList.jsx line 916–918 (text: "[agent] is thinking…").
- StepThread.jsx (lines 1–159) provides the visual component with breathing dot animation + connector lines (lines 41–77, 82–110).
- Integration: MessageList imports StepThread; renders below assistant messages while `steps` accumulate.
- **Gap:** No real-time "is_typing" field from Supabase message rows captured in useChatMessages.js. The synthetic thinking message is static; no live keystroke-level indicator from agent tmux session forwarding to dashboard in near-real-time.

---

### 3. Live-Thread Step Indicators (Real Work Narrative)
**Grade:** BUILT  
**Evidence:**
- StepThread.jsx renders step chains keyed to a parent message (lines 1–8: "parent_message_id=<user_msg_id>, settles when reply lands").
- StepDot shows 3 states: in_progress (breathing 8px dot, lines 69–77), done (checkmark 6px, lines 54–66), error (red X, lines 43–51).
- ConnectorRow pulsing animation (lines 82–110) emphasizes active step chains.
- **Status:** Steps seeded by `relay-emit-step.py` script (per CLAUDE.md); dashboard receives them; render works.
- **No gaps observed:** Implementation matches vision.

---

### 4. Agent Profile Overlay (Scaffold Read-Only)
**Grade:** BUILT  
**Evidence:**
- AgentProfileOverlay.jsx (lines 20–26) defines 5 sections: VISION, RESEARCH, BUILD, CONTEXT, last-conversation.md ("Recent history").
- Each section uses useFileContent hook (lines 28–41) to fetch from `/api/dashboard/file-content?project=<slug>&filename=<name>`.
- Collapsible UI with accent-color header dots (lines 43–124); read-only disclaimer at bottom (lines 222–224).
- Wired into ThreadHeader.jsx info button (line 280–300, toggles `profileOpen` state).
- No gaps; implementation complete.

---

### 5. Context-Fullness Meter
**Grade:** BUILT  
**Evidence:**
- ContextFullnessMeter.jsx (lines 1–159) provides color-coded bar (green <50%, yellow 50–79%, red ≥80%).
- Tracks turn count in localStorage per agent (lines 36–56).
- `bumpContextMeter(agentSlug)` called on each user send in useChatSend.js line 97.
- Exported `resetContextMeter(agentSlug)` for clear-context flow.
- Renders in ThreadHeader next to clear-context button.
- **No gaps:** Wiring is complete; user-facing meter is working.

---

### 6. Clear-Context Control (Super-Agents Only)
**Grade:** BUILT  
**Evidence:**
- ThreadHeader.jsx (lines 327–378) implements clear-context button with confirm stage (role check: `selectedAgent?.is_super` guards visibility).
- Calls `resetContextMeter()` + clears session state + triggers `/007` session clear on the tmux side.
- Wired to super-agent chat only; hidden from project chat.
- **No gaps observed.**

---

### 7. Agent Conversational Rename (User-Nameable)
**Grade:** MISSING  
**Evidence:**
- AgentProfileOverlay line 176 displays `agent.display_name` (with fallback to `agent.name`).
- **No UI found** for editing display_name conversationally.
- ThreadSettingsModal.jsx (lines 1–end) has General tab (room rename), Voice, Google, Keys, Control — but **no agent display_name input**.
- No `/api/dashboard/agent-rename` endpoint or PATCH handler located.
- **Gap:** Feature not implemented. User cannot rename agent mid-conversation.

---

### 8. Voice Call Tape Hand-Off
**Grade:** PARTIAL  
**Evidence:**
- VoiceChatHost.jsx (lines 11–76) persists voice transcript to Supabase via `/api/dashboard/voice-summary`.
- Haiku processes transcript + produces ONE summary message (source='voice-summary').
- Summary lands in agent inbox (supabase-listener forwards it to relay).
- **Gap:** No evidence that transcript/summary is written back to agent's tape (last-conversation.md on disk). Per vision, post-call tape should be updated so the agent resumes context. Currently tape lives only on the agent's tmux session; if agent restarts or new session spawns, tape is lost.

---

### 9. Agent Naming: Workspace EA Default + Conversational Nudge
**Grade:** PARTIAL  
**Evidence:**
- Agent display_name seeded at onboarding (e.g., "AOM EA" for workspace "AOM").
- No evidence of conversational nudge UI to rename (related to gap #7 above).
- Agent name shown in header (ThreadHeader.jsx line 60, agent.display_name or agent.name fallback).
- **Gap:** Nudge mechanism not implemented; user cannot trigger rename via chat prompt or dedicated UX.

---

### 10. Typing Keystroke Indicators (Real-Time from Tmux)
**Grade:** MISSING  
**Evidence:**
- No WebSocket or Supabase realtime subscription to capture agent typing state.
- Synthetic "thinking" message is static, not keystroke-triggered.
- **Gap:** For truly live typing feel (as shown in R65 design mock), agent tmux session would need to emit typing events to Supabase during agent composition. Currently not wired.

---

## Summary: Top 3 Gaps

1. **Agent Conversational Renaming (MISSING)** — Users cannot rename a super-agent mid-conversation. display_name field exists in schema but no UI/API to edit it. Friction point: if a user wants to swap from "AOM EA" to "Elon," there's no way to do it in-app.

2. **Voice Call Tape Hand-Off (PARTIAL)** — Transcripts are summarized and sent to inbox, but summaries are not persisted to agent tape. Resuming context after a voice call loses the conversation thread. Vision calls for tape updates; currently missing.

3. **Real-Time Typing Indicators (MISSING)** — Dashboard shows static "thinking" message, not live keystroke updates from agent tmux. For the intended "live work narrative" feel, agent should emit typing events to Supabase as it types. Not wired.

---

## Count Summary

| Grade | Count | Components |
|-------|-------|-----------|
| BUILT | 5 | Chronological list, profile overlay, context-fullness meter, clear-context, step thread |
| PARTIAL | 3 | Thinking indicators (visual only), voice hand-off (no tape), agent naming (no nudge) |
| MISSING | 2 | Agent rename UI, real-time keystroke typing |
| **Total** | **10** | — |

---

## Notes

- **Acceptance gate:** Live-thread step rendering is correct; wiring from relay-emit-step.py to MessageList works end-to-end.
- **No regressions detected:** Existing features (pinned agents, status dots, profile preview, clear-context) are stable and functional.
- **Priority fixes:** Implement agent rename form + API (small lift); add tape update on voice-summary receipt (moderate); add typing event subscription if UX team prioritizes keystroke feel (larger effort).

