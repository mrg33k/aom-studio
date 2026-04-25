# Chat Reliability Audit — 2026-04-25

**Task:** e4d79611-1447-46fc-bfd6-649fa0bce58a  
**Scope:** Dashboard chat — Elon 1:1 thread + project-scoped rooms  
**Files audited:** chatConnection.js, useChatMessages.js, useChatSend.js, useBridgeStream.js, chat-bridge.js, MessageList.jsx, ThreadView.jsx, useThreadMessageStatus.js, crosspost.js

---

## Architecture summary (as-built)

```
User sends → BridgeConnection.send()
  → POST /api/dashboard/chat-bridge
    → always: writeFallbackToSupabase (persists row + maybe crosspost)
    → if bridge up: forward to local bridge via tunnel → SSE stream back
    → if bridge down: fallback=true, reply arrives via Supabase Realtime
  → UI: optimistic user bubble (temp-id)
  → if !fallback: startBridgeStream → SSE placeholder (bridge-stream-<id>)
  → Supabase Realtime INSERT → handleInsert → dedup + replace temp/bridge-stream
```

Realtime subscriptions:
- **Agent thread:** channel filtered `client_id=eq.${worldId}`, handleInsert drops `msg.project` set
- **Project thread:** channel filtered `client_id=eq.${projCid}`, handleInsert checks `isForThisProject`
- **Steps (R65):** unfiltered events table, client-side agent/project filter
- R74: all three channels auto-reconnect with exponential backoff + refetchHistory on SUBSCRIBED + focus/visibility

---

## Findings — ranked by severity

### SEV-1 HIGH: Silent message loss via auto-project tagging ← FIXED IN THIS COMMIT

**File:** `api/dashboard/chat-bridge.js:38-85` (writeFallbackToSupabase)

`writeFallbackToSupabase` runs on EVERY message (not just fallback path). It called
`detectProjectFromText` for any message where `body.project` is empty — including
agent-thread messages. The fuzzy match scans all active project slugs+names against
the message text using `.includes()`.

**Reproduction:**
- Patrik sends "Tell Bobby about the deadline" in Elon's 1:1 thread
- `detectProjectFromText` matches "Bobby" (project slug) → sets `project='bobby'` on the row
- Row also gets cross-posted to `shared:bobby` project thread
- Agent-thread initial load query filters `.or('project.is.null,project.eq.')` — excludes this row
- Agent-thread realtime handler drops rows with `msg.project` set
- **Message disappears from Elon's thread after page reload.** Only visible while optimistic.

**Fix applied:** Gate fuzzy detection on project-scoped rooms. For agent rooms (room = agent slug),
only honor explicit `[project:slug]` tags — no fuzzy name matching.

---

### SEV-2 MEDIUM: Bridge-stream dedup finds first agent match, not message-ID match

**File:** `useChatMessages.js:175-184` (handleInsert, both agent and project thread)

```js
const bridgeIdx = prev.findIndex(m =>
  typeof m.id === 'string' && m.id.startsWith('bridge-stream-') &&
  m.role === 'assistant' && m.agent === msg.agent
)
```

Finds ANY bridge-stream placeholder for the agent. If two overlapping bridge streams
exist (concurrent tabs, race on reconnect), the Realtime INSERT replaces the wrong
placeholder — leaving one orphaned `bridge-stream-*` entry with stale text and one
missing assistant bubble.

In practice `inFlightSendRef` blocks overlapping sends within a tab. Cross-tab is realistic.

**Recommended fix (R76-a):** Also match `m.id === 'bridge-stream-' + realRow.id` so only the
exact placeholder gets replaced.

---

### SEV-2 MEDIUM: SupabaseConnection.subscribe has no client_id filter

**File:** `chatConnection.js:229-249`

```js
filter: `agent=eq.${slug}`,
```

V2/legacy path (bridge disabled, VITE_V2_CHAT=true) subscribes without tenant isolation.
Currently masked by `BRIDGE_ENABLED=true`. If bridge is ever disabled this is a live
cross-tenant leak.

**Fix (R76-b):** Add `&client_id=eq.${clientId}` to the filter string.

---

### SEV-3 LOW: awaitingResponse typing indicator can spin indefinitely on relay offline

**File:** `useThreadMessageStatus.js:22-25`

`awaitingResponse=true` when last message is user + real ID. If bridge falls back and
relay is offline, typing indicator spins until reply or reload. TypingIndicatorV2
stall-CTA (R73) fires at 45s for bridge-stream path but NOT the fallback/Realtime path.

**Recommended (R76-c):** Add parallel 45s stall CTA when `awaitingResponse && !isAgentTyping`.

---

### SEV-3 LOW: No source allowlist in realtime handleInsert

**File:** `useChatMessages.js` — both handleInsert callbacks

All INSERTs with matching client_id + agent/project pass through regardless of `source`.
Internal probe messages, test rows, Haiku classification echoes would render if they
have the right fields.

**Recommended:** Deny `source` values like `relay-probe`, `test`.

---

### SEV-3 ✅: R74 render-gate confirmed intact (no regression)

**File:** `MessageList.jsx:78`

```js
{messages.filter(m => !(m.source === 'bridge-stream' && m._streaming && !m.text)).map(...
```

Gate is present and correctly hides empty bridge-stream placeholders. No regression.

---

## Punch list

| # | Sev | File:Line | Description | Status |
|---|---|---|---|---|
| 1 | HIGH | chat-bridge.js:44-49 | Auto-project fuzzy match silently drops agent-thread messages | **FIXED** |
| 2 | MED | useChatMessages.js:175 | Bridge-stream dedup uses agent slug, not message ID | R76-a |
| 3 | MED | chatConnection.js:232 | V2 subscribe lacks client_id filter | R76-b |
| 4 | LOW | useThreadMessageStatus.js:22 | No stall CTA for awaitingResponse branch | R76-c |
| 5 | LOW | useChatMessages.js handleInsert | No source denylist for probe/test messages | backlog |
| 6 | ✅ | MessageList.jsx:78 | R74 render-gate intact | no action |

---

## Realtime path — confirmed reliable after R74

- Self-healing exponential backoff: `scheduleReconnect` (1s → 2s → 4s → … → 30s max)
- History refetch on every SUBSCRIBED event (catches any rows missed during downtime)
- Window focus + visibilitychange both trigger refetchHistory — tab-switch recovery works
- Three independent channels (agent, project, steps) each self-heal independently
- No stuck-pending entries in logic; fallback path always calls `onDone()`

---

## Dedup behavior

| Scenario | Mechanism | Status |
|---|---|---|
| Same message ID arrives twice | `if (prev.some(m => m.id === msg.id)) return prev` | ✅ |
| Optimistic temp-user replaced | `findIndex(temp- prefix + role + text)` | ✅ |
| Bridge-stream replaced by real row | `findIndex(bridge-stream- + agent)` | ⚠️ agent-only |
| Voice temp replaced | `findIndex(voice- + source + text + role)` | ✅ |
| Crosspost duplicate on reload | Deterministic PK in crosspost.js | ✅ |
| mergeServerRows on focus | Dedup by id in Map | ✅ |
