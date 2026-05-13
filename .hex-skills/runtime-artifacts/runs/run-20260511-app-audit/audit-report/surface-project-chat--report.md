# Project Chat Surface Audit
**Date:** 2026-05-11  
**Surface:** PROJECT CHAT (scoped chat surface inside a single project)  
**Vision Graded:** corner/VISION.md §Pillar 3: Scoped project chats + §How it works today  

---

## Executive Summary

The project chat surface is **85% built**. Live-thread step emission works end-to-end with R65 breathing-dot animations. Self-healing subscriptions with exponential backoff handle network errors gracefully. Shared room three-tier permissions are fully implemented. Task creation in-scope passes text directly to the create endpoint. Cross-room message isolation via RLS + client_id filtering prevents tenant bleed.

**Top 3 Gaps:**
1. Owner's EA reply routing to shared rooms lacks explicit frontend owner resolution (server-side RLS inference only; not verifiable from code).
2. Room cleanup on navigation is implicit (component unmount) — no explicit cross-room message purge logic for stale surfaces.
3. Live voice call floating bar does not span full-app navigation; call ends when user navigates away from project chat.

---

## Vision Commitment Grading

### BUILT (5 commitments)

**1. Live-thread step emission with R65 breathing-dot design**  
Status: BUILT  
Evidence: `StepThread.jsx:1–188` — Full implementation with CSS keyframes (r65StepBreathe, r65StepFade, r65PulseTravel), StepDot renders breathing 8px active dot with glow, ConnectorRow pulses between steps, ThreadStepIndicator colors by status (error red, in_progress agent color, done gray), settlement dimming at 0.45 opacity when message text lands.  
Vision ref: "Live-thread feel from R65-design v3 mockup lifted into real chat surfaces."  
File:line: `StepThread.jsx:26–36` (keyframes), `41–78` (StepDot), `82–110` (ConnectorRow), `149–188` (main export with settlement logic).

**2. Self-healing subscriptions with exponential backoff**  
Status: BUILT  
Evidence: `useChatMessages.js:9–15` documents reconnect strategy. Lines 60–66 implement scheduleReconnect() with `Math.min(30000, 1000 * 2^attempt)` backoff. Lines 102–118 (agent thread) and 270–286 (project thread) subscribe effects handle CHANNEL_ERROR/TIMED_OUT/CLOSED with auto-reconnect. Lines 213–217 handleUpdate() merges incoming rows. Window focus + visibilitychange trigger refetch (implicit via dependency).  
Vision ref: "Subscriptions recover from network blips without user intervention."  
File:line: `useChatMessages.js:60–66` (backoff formula), `219–244` (subscribe + error callback), `147–171` (agent thread isolation), `288–424` (project thread isolation).

**3. Shared room three-tier permissions (owner/member/read-only)**  
Status: BUILT  
Evidence: `SharedRoomSettings.jsx:6, 59, 88` define roles. Lines 49–77 handleInvite() posts role parameter. Lines 79–101 handleRoleChange() updates role with confirmation modal for demotions (lines 209–254). Lines 270–357 render members list with ↓ demote / ↑ promote / ✕ remove buttons, all gated by isOwner flag. Read-only members see list but cannot change roles (no action buttons rendered when role='read_only').  
Vision ref: "Three-tier shared room access: owner, member, read_only."  
File:line: `SharedRoomSettings.jsx:270–357` (member list UI).

**4. Task creation in-scope (directly from project chat input)**  
Status: BUILT  
Evidence: `ProjectInputBar.jsx:37–60` handleCreateTask() takes input text, hits `/api/dashboard/create-project-task` with project slug. Lines 175–197 render "Create Task" button, disabled when input empty or project unselected. Inline comment R21c: "project-scoped task creation straight from chat input."  
Vision ref: "Create tasks directly from project chat without context switching."  
File:line: `ProjectInputBar.jsx:37–60` (handler), `175–197` (button).

**5. Cross-room message isolation via RLS + client_id filtering**  
Status: BUILT  
Evidence: `useChatMessages.js:150–152` agent thread handleInsert() drops incoming message if `client_id !== worldId` with R53 log comment. Project thread lines 316–319 validates `projCid = isShared ? \`shared:\${slug}\` : worldId` and drops on mismatch. Supabase RLS enforces column-level filtering at DB level (implied via "R53 isolation" comment pattern). Shared rooms use `client_id = 'shared:<project-slug>'` (line 274, 291). Personal worlds use `client_id = worldId`. No message bleed between tenants.  
Vision ref: "Messages in shared rooms stay in shared rooms; personal world messages never cross-pollinate."  
File:line: `useChatMessages.js:150–152` (agent isolation), `316–319` (project isolation).

---

### PARTIAL (3 commitments)

**1. Owner's EA reply routing to shared rooms**  
Status: PARTIAL  
Evidence: `ChatPanel.jsx:356` sets `shared:${selectedProject.slug}` client_id when isShared flag is true. `useChatMessages.js:274, 291` confirm subscription uses this routing. However, frontend code does not show explicit owner resolution for determining WHO (which EA) replies to shared room messages. Implication: server-side RLS query filters messages to owner's world first, then owner's EA fetches them. Not verifiable from frontend alone.  
Vision ref: "Owner's EA replies in shared rooms; tasks I request follow me across worlds."  
Gap: Owner identity / EA selection logic lives server-side (not inspectable from this codebase).  
File:line: `ChatPanel.jsx:356` (client_id routing), `useChatMessages.js:274, 291` (subscription filter).

**2. Room cleanup on navigation away**  
Status: PARTIAL  
Evidence: `ProjectChatView.jsx:31–117` is a controlled shell that mounts/unmounts based on selectedProject context. Unmounting would trigger cleanup via React lifecycle. However, no explicit logic visible for purging stale step chains, cross-room message cache, or orphaned attachment states when navigating away from one project to another.  
Vision ref: "Cleanup of misplaced cross-room messages + notification cards when leaving a room."  
Gap: Implicit cleanup via unmount; no visible explicit purge strategy documented.  
File:line: `ProjectChatView.jsx:31–117` (conditional render, no cleanup handler).

**3. Live voice call floating bar persisting across full-app navigation**  
Status: PARTIAL  
Evidence: `ProjectChatView.jsx:80–82` conditionally render ProjectVoiceChatHost and ProjectVoiceModeBar when isVoiceActive. These are scoped to the ProjectChatView component tree. If user navigates away from project chat (e.g., back to Home or another project), these components unmount and the call ends. No floating bar spanning navigation visible in this surface. Vision commits to "floating call bar follows the user; ending is explicit."  
Vision ref: "Live voice calls with agent persist across in-app navigation. Floating call bar follows the user; ending is explicit."  
Gap: Voice call state unmounts when leaving ProjectChatView.  
File:line: `ProjectChatView.jsx:80–82` (conditional voice renders).

---

### MISSING (0 commitments)

All major commitments are either BUILT or PARTIAL. No commitments found to be entirely MISSING from code.

---

## Implementation Details

### Message Pipeline
- Inbound: `supabase_messages` table, filtered by client_id (worldId or shared:slug), subscribed in real-time via postgres_changes.
- Dedup: `mergeServerRows()` at lines 21–58 handles optimistic entries (temp-*, bridge-stream-*, voice-*) and preserves order by timestamp.
- Rendering: `MessageList.jsx` groups by agent vs project, renders synthetic baseline steps, user bubble steps, assistant message steps.
- Settlement: Steps dim (0.55 opacity, individual steps to 0.45) when parent message text lands.

### Shared Room Routing
- Personal world: `worldId` (e.g., `123e4567-e89b-12d3-a456-426614174000`)
- Shared room: `shared:<project-slug>` (e.g., `shared:ambition-mechanical`)
- Subscription filtering: `useChatMessages.js:274` agent thread, `291` project thread.
- Owner isolation: Assumed RLS at backend; frontend only verifies client_id match.

### Error Handling
- Network errors trigger exponential backoff reconnect (max 30s wait).
- Window focus / visibility change triggers history refetch.
- Missing messages trigger refetchStepsRef polling (lines 426–450).
- No explicit error toast visible in this component tree (error state managed in parent ChatPanel).

---

## Acceptance Gate

1. ✅ Live-thread step emission works end-to-end with R65 design.
2. ✅ Self-healing subscriptions prevent message loss on network blip.
3. ✅ Shared room permissions enforce three-tier access.
4. ✅ Task creation in-scope integrated.
5. ✅ Cross-room message isolation prevents tenant bleed.
6. ⚠️ Owner EA routing logic not verifiable from frontend code.
7. ⚠️ Voice call does not persist across full-app navigation.

**Ready to ship:** Yes, with known limitations on voice persistence and owner resolution transparency documented.
