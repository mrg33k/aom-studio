# CV4 v2 Agent Infrastructure Requirements

**Status:** Phase 3 (WD40)  
**Last updated:** 2026-05-05  
**Owner:** Steffen (design), Bobby (web), Elon (system)

---

## Overview

This document outlines the backend/agent infrastructure required to make CV4 v2 a fully-functional dashboard. The UI is static HTML/CSS; the following features require real system integration.

---

## Priority 1: Chat Panel (Thread Input Bar)

### Voice Recording → Transcript → Message

**UI Surface:** `thread-input-bar.html` — Voice button toggles recording mode  
**Current State:** Button exists, toggleVoice() is a stub  
**What Needs to Exist:**

1. **VoiceRecorder API (Browser)**
   - Namespace: `window.VoiceRecorder`
   - startRecording() → returns Promise
   - stopRecording() → returns { blob, duration, mimeType }
   - Error cases: permission denied, unsupported browser

2. **Voice Blob → Transcript (Backend)**
   - POST `/api/voice-transcript`
   - Input: multipart/form-data with audio blob
   - Output: `{ text: "...", confidence: 0-1, duration: seconds }`
   - Provider: Deepgram, AssemblyAI, Whisper, or in-house STT
   - Error handling: fallback to "Could not transcribe" message

3. **Message Send Integration**
   - After transcript returns, auto-populate textarea with transcript text
   - User can edit before sending
   - OR: auto-send if confidence > 0.95 (UX decision needed)

**Agent Responsibility:**
- Elon: Route to agent that owns current project/context
- System: Attach voice metadata (duration, confidence, source: voice) to message record

---

### File Upload → Attach → Message

**UI Surface:** `thread-input-bar.html` — Attach button reveals drop zone  
**Current State:** File drop zone exists, file input change handler is a stub  
**What Needs to Exist:**

1. **File Upload Handler**
   - POST `/api/upload` (or `/api/files`)
   - Input: multipart/form-data with `files[]`
   - Output: `[{ name, size, url, type, uploadedAt }]`
   - Max file size: TBD (default 10MB?)
   - Supported types: PDF, docx, txt, md, images (jpg/png), video (mp4), audio (mp3)

2. **File Metadata in Message**
   - Files attached to message store as: `{ files: [{ name, url, size, type }] }`
   - Message payload includes file metadata before send

3. **File Preview/Download**
   - Urls must be signed (Supabase URL + signed expiry OR direct Vercel CDN)
   - Files visible in chat message as inline attachments (thumbnail for images, link for documents)

**Agent Responsibility:**
- System: Store files in Supabase Files or Discord/Vercel CDN
- Agent: Retrieve file context if needed (pdf-to-text, image-to-description for vision models)

---

## Priority 2: Message Rendering + Step Threads

### Message List Component

**UI Surface:** `components/message-list.html`  
**Current State:** Component exists, mock messages hardcoded, no real data source  
**What Needs to Exist:**

1. **Message History API**
   - GET `/api/messages?agent=elon&limit=50&offset=0`
   - Output: `[{ id, role, text, status, timestamp, files?, steps?, replyTo? }]`
   - Filters: by agent, by project, search query, date range

2. **Message Status Lifecycle**
   - pending → sent → delivered → read
   - UI reflects status: spinner → checkmark → eye-icon
   - If failed: red X + retry button

3. **Step Thread Rendering**
   - Message can have `steps: [{ index, text, status: 'in_progress'|'done', timestamp }]`
   - Each step renders as: dot (breathing animation if in_progress, static if done) + text
   - Dot colors: green (accent) if in_progress/done, gray (muted) if pending

**Agent Responsibility:**
- Elon: Emit steps via relay-emit-step.py as work happens
- System: Store steps in message record, fetch with history query

---

## Priority 3: Task Queuing + Status

### Tasks View

**UI Surface:** `views/tasks.html`  
**Current State:** Layout exists, filtering tabs exist, mock task cards  
**What Needs to Exist:**

1. **Task History API**
   - GET `/api/tasks?status=active|waiting|done&project=X&agent=Y`
   - Output: `[{ id, title, status, assignee, project, dueDate, briefText, result? }]`

2. **Task Status Lifecycle**
   - right-now → to-do → scheduled → inbox → done
   - Pill colors: red (right-now), yellow (to-do), blue (scheduled), gray (inbox), green (done)
   - Click task → reveal brief text (accordion expand)

3. **Task Result Rendering**
   - If status = done and result exists: `{ type: 'text'|'link'|'image'|'video', payload: '...', summary: '...' }`
   - Render based on type (text in code block, link as card, image as preview, video as embed)

4. **Stale Project Nudge Card**
   - If project unactivefor 7+ days: show card with action buttons (resume, archive)
   - Dismiss button removes card (sets flag in project record)

**Agent Responsibility:**
- System: Query task table, sort by status + date
- Elon: Emit task status updates as work changes
- Foreman: Orchestrate task dependencies (blocked by X)

---

## Priority 4: Persistent Navigation Chrome

### Global App Shell

**UI Surface:** Missing (currently each view is standalone)  
**Current State:** Not implemented  
**What Needs to Exist:**

1. **Desktop Left Sidebar (240px fixed)**
   - Agent list (pinned + unpinned)
   - Project list (chronologically sorted by last message)
   - Drag-to-reorder within each section
   - Click agent/project → navigate to chat view with context pre-loaded

2. **Mobile Sticky Header**
   - Breadcrumb: home > [agent name] (if in chat) or home > [project name] (if in project-chat)
   - Back button to home
   - Menu button (three-dot) → drawer with agent/project list

3. **Route State Management**
   - window.appState = { view: 'home'|'chat'|'project-chat'|'tasks', agentId?, projectId? }
   - URL routing: /home, /chat/:agentId, /project/:projectId/chat, /tasks
   - Back button navigates to previous route

4. **Chat Context Persistence**
   - Agent/project selected in sidebar stays visible while scrolling messages
   - Scroll position restored on re-navigate to same agent
   - Message list auto-scrolls to latest on new message arrival

**Agent Responsibility:**
- Elon: Manage route state, broadcast "user opened agent X"
- System: Push new messages to client, trigger message list scroll
- Daemon: Update agent/project list as activity changes

---

## Priority 5: Real-Time Message Updates

### WebSocket / Polling for Live Messages

**UI Surface:** Message list auto-updates when new messages arrive  
**Current State:** No live connection, mock submit shows canned response  
**What Needs to Exist:**

1. **WebSocket Connection**
   - Connect to `/ws/messages?agent=elon` (subscribe to agent's message stream)
   - On message event: append to message list, scroll to latest
   - On disconnect: fall back to polling

2. **Polling Fallback (if no WebSocket)**
   - GET `/api/messages?agent=elon&since=<lastMessageTimestamp>`
   - Poll every 2 seconds for new messages
   - Coalesce duplicates, preserve order

3. **User Typing Indicator**
   - If user typing: emit "typing" event
   - UI shows "Agent is typing…" with ellipsis animation
   - Agent responds with message → dismiss typing indicator

**Agent Responsibility:**
- Agent system: Emit 'message:new' event when message arrives from agent
- Elon: Route message to correct agent, broadcast back to UI

---

## Priority 6: Voice Call Integration

### Live Voice Call Floating Bar

**UI Surface:** Floating call bar (bottom-right on desktop, sticky on mobile)  
**Current State:** Not implemented in cv4-explore-v2  
**What Needs to Exist:**

1. **Voice Call API**
   - POST `/api/calls/start` → returns { callId, signalToken, iceServers }
   - Uses WebRTC (Twilio, Daily, or custom TURN server)
   - UI: start call button → shows live call bar with timer + hangup

2. **Call State Sync**
   - Call persists across navigation (floating bar follows)
   - Ending call clears the bar
   - Call recording (optional, Patrik's vision)

**Agent Responsibility:**
- System: Route incoming call to correct agent
- Agent: Answer call, stream audio/text

**Status for Phase 3:** Not yet designed for CV4. Placeholder only.

---

## Cross-Cutting Concerns

### Authentication & Authorization

- All API calls include auth headers (JWT or session cookie)
- RLS rules in Supabase restrict visibility per user
- Agent endpoints require user context (user_id from token)

### Error Handling

- API errors return `{ error: "...", code: "...", details: "..." }`
- UI catches errors, shows toast: "Failed to load messages. Retry?"
- Retry logic with exponential backoff (3 attempts)

### Rate Limiting & Cost

- Voice transcription: rate-limit per user (e.g., 10/min)
- File uploads: quota per user (5GB/month)
- WebSocket: max concurrent connections per user (2)

### Analytics & Logging

- All user actions (send message, upload file, start call) logged to `events` table
- Agent actions (emit step, route message) logged separately
- Dashboard tracks success/failure rates

---

## Implementation Roadmap (Suggested)

| Phase | Priority | Feature | Est. Effort |
|-------|----------|---------|------------|
| 4 | 1 | Voice recording + transcript API | 3 days |
| 4 | 1 | File upload + storage | 2 days |
| 4 | 2 | Message history API + real-time updates | 3 days |
| 5 | 3 | Task queuing + result rendering | 2 days |
| 5 | 4 | Persistent navigation chrome | 4 days |
| 6 | 5 | WebSocket message stream | 2 days |
| 6 | 6 | Voice call integration (design TBD) | TBD |
| 6 | 7 | Cut-scene overlay (data API) | 1 day |

---

## Design Decisions Pending Patrik Approval

1. **Voice message auto-send vs. edit-first?**
   - Auto-send if confidence > 0.95, else show for edit
   - OR: always show for user confirmation before send
   - **Impacts:** UX flow, transcript API contract

2. **File storage location?**
   - Supabase Files bucket (direct download URLs)
   - Vercel Blob (with signed expiry)
   - Discord webhook (for demo, not production)
   - **Impacts:** cost, privacy, integration complexity

3. **Real-time transport?**
   - WebSocket (persistent, lower latency, higher server cost)
   - Polling (higher latency, stateless, lower cost)
   - Server-Sent Events (hybrid, one-way)
   - **Impacts:** message freshness, concurrent connections

4. **Voice call scope?**
   - Record all calls (Deepgram post-processing)
   - Record only agents (post-call summary)
   - No recording (privacy-first)
   - **Impacts:** features, cost, legal

---

## Sign-Off

**Steffen (design):** Phase 3 chat button redesign ships; all infrastructure gaps documented above.  
**Bobby (web):** Ready to implement Phase 4 priorities (voice, files, messaging).  
**Elon (system):** Routing and event emission model ready; awaiting backend decisions (voice provider, file storage).
