# Trading Agent Dashboard Integration Notes

This document maps the data needed to render an agent conversation card in Corner dashboard v3.

## Goal

If the trading agent should appear in the dashboard conversations list, it needs to conform to the same data shape already used by:

- `src/dashboard/components/cv3/AgentCard.jsx`
- `src/dashboard/components/cv3/ConversationsView.jsx`
- `src/dashboard/hooks/useDataPipe.js`
- `api/dashboard/supabase-status.js`

The UI currently derives agent card content from three Supabase-backed sources:

1. `agent_status` for identity + live status
2. `messages` for last message preview and recency
3. derived unread counts based on message history in the current thread

## Required agent card fields

### 1. `slug`
- **Why the card needs it:** stable identity key for selection, routing, pinning, muting, unread lookup, and message grouping.
- **Primary source:** `agent_status.slug`
- **Used in UI:**
  - `AgentCard.jsx` for color fallback via `agentColors[agent.slug]`
  - `ConversationsView.jsx` for `unreadMap[agent.slug]`, `unreadCounts[agent.slug]`, favorites, and mute state

### 2. `display_name` / `name`
- **Why the card needs it:** the visible title on the card and the avatar initial.
- **Primary source:** `agent_status.name`
- **Mapped prop name in UI:** `agent.name`
- **Used in UI:**
  - `AgentCard.jsx` displays `agent.name`
  - initial avatar letter is derived from `(agent.name || '?')[0]`

### 3. `status`
- **Why the card needs it:** badge text and status dot color.
- **Primary source:** `agent_status.status`
- **Supported examples seen in UI:** `idle`, `building`, `qa`, `queued`, `working`
- **Mapped prop name in UI:** `agent.status`
- **Used in UI:**
  - `AgentCard.jsx` converts to uppercase and renders `Idle`, `Building`, or `Online`
  - `ConversationsView.jsx` derives labels like `Building`, `QA`, `Queued`, `Online`, `Idle`

### 4. `role`
- **Why the card needs it:** fallback preview when there are no recent messages.
- **Primary source:** `agent_status.role`
- **Mapped prop name in UI:** `agent.role`
- **Used in UI:**
  - `AgentCard.jsx` shows `agent.role || 'No recent messages'` when there is no `lastMessage`

### 5. `color`
- **Why the card needs it:** avatar background color.
- **Primary source:** `agent_status.color`
- **Mapped prop name in UI:** `agent.color`
- **Fallback behavior:** if missing, the UI falls back to `agentColors[agent.slug]` or `#60A5FA`

### 6. `image_url` / `sprite_path`
- **Why the card needs it:** optional avatar photo instead of color + initial.
- **Expected UI prop name:** `agent.sprite_path`
- **Storage note:** this field is expected by `AgentCard.jsx`, but it is **not included** in the current `api/dashboard/supabase-status.js` agent mapping.
- **Implication for integration:** if the trading agent needs a photo avatar, the status payload must expose a URL as `sprite_path`.

### 7. `last_message_preview`
- **Why the card needs it:** second line preview text.
- **Primary source:** latest row in `messages` for that agent
- **Column:** `messages.text`
- **Derived in code:** `useDataPipe.js` builds inbox items from the newest message per `msg.agent`
- **Mapped prop shape in UI:** `lastMessage.text`
- **Preview formatting rule:** preview is truncated to 80 chars in `buildInboxItems()`

### 8. `last_message_at`
- **Why the card needs it:** timestamp shown at the top-right of the card.
- **Primary source:** latest row in `messages` for that agent
- **Column:** `messages.timestamp`
- **Mapped prop shape in UI:** `lastMessage.timestamp`
- **Formatting rule:** rendered through `formatChatTime(...)`

### 9. `unread_count`
- **Why the card needs it:** unread badge on the right side.
- **Source type:** derived, not a single stored column
- **Underlying table:** `messages`
- **Derived from:** whether assistant messages are newer than the latest dashboard user message for the same `agent`
- **Mapped prop in UI:** separate `unreadCount` prop passed into `AgentCard.jsx`
- **Important:** current unread logic comes from message history, not from a persisted `unread_count` column

### 10. `updated_at`
- **Why the card may need it:** useful for sorting and freshness checks; already included in the agent payload returned by the status API.
- **Primary source:** `agent_status.updated_at`
- **Mapped prop name in UI:** `agent.updatedAt`

## Supabase table-to-field mapping

| Dashboard field | Supabase table | Column | Notes |
|---|---|---|---|
| `slug` | `agent_status` | `slug` | Primary agent identifier used throughout the UI |
| `display_name` / `name` | `agent_status` | `name` | Card title |
| `status` | `agent_status` | `status` | Live presence / pipeline state |
| `role` | `agent_status` | `role` | Fallback preview text |
| `color` | `agent_status` | `color` | Avatar color |
| `updated_at` | `agent_status` | `updated_at` | Included in returned agent object as `updatedAt` |
| `last_message_preview` | `messages` | `text` | Derived from most recent message for `messages.agent = slug` |
| `last_message_at` | `messages` | `timestamp` | Derived from most recent message for `messages.agent = slug` |
| unread basis | `messages` | `role`, `source`, `timestamp`, `agent` | Unread state is computed from message ordering, not stored directly |
| optional avatar URL | likely `agent_status` or customization source | not currently surfaced in status API | UI expects `agent.sprite_path` if available |

## Current data flow in the codebase

### `api/dashboard/supabase-status.js`
This endpoint currently assembles the agent payload from `agent_status` and returns:

```text
slug, name, role, status, currentTask, color, updatedAt
```

It also returns `messages` from the `messages` table. Those are then used client-side to derive previews.

### `src/dashboard/hooks/useDataPipe.js`
This hook:

- fetches `/api/dashboard/supabase-status`
- stores message-derived preview data in `inboxItems`
- returns a normalized `agents` array with:
  - `slug`
  - `name`
  - `role`
  - `status`
  - `color`
  - `updatedAt`

It also builds inbox preview entries shaped like:

```text
{
  agent,
  text,
  timestamp,
  id,
  isUnread,
}
```

### `src/dashboard/components/cv3/ConversationsView.jsx`
The conversations list does not currently render `AgentCard.jsx` directly. It renders inline card markup, but the expected data requirements are effectively the same:

- `item.data` holds the agent object
- `unreadMap[agent.slug]` provides the last message object
- `unreadCounts[agent.slug]` provides unread badge count

So, for integration purposes, the trading agent should still match the `AgentCard.jsx` data shape because that component documents the canonical card contract.

## Expected `AgentCard.jsx` prop structure

`AgentCard.jsx` expects these props:

```text
AgentCard({
  agent,
  lastMessage,
  unreadCount,
  onClick,
  isSelected,
  onCustomize,
  isPinned,
  isMuted,
  onTogglePin,
  onToggleMute,
  onRename,
})
```

### `agent` object shape

```text
{
  slug: string,
  name: string,
  role?: string,
  status?: string,
  color?: string,
  sprite_path?: string,
}
```

### `lastMessage` object shape

```text
{
  agent: string,
  text: string,
  timestamp: string,
  id?: string | number,
  isUnread?: boolean,
}
```

### scalar props

```text
unreadCount: number
isSelected: boolean
isPinned: boolean
isMuted: boolean
```

### handler props

```text
onClick?: (agent) => void
onCustomize?: (agent, actionType) => void
onTogglePin?: (agent) => void
onToggleMute?: (agent) => void
onRename?: (agent) => void
```

## Minimum integration checklist for the trading agent

To make the trading agent show up correctly in the dashboard card model, ensure the following data exists:

- an `agent_status` row with:
  - `slug`
  - `name`
  - `status`
  - `role`
  - `color`
- `messages` rows where:
  - `messages.agent = <trading agent slug>`
  - `messages.text` contains the conversation content
  - `messages.timestamp` is populated
- optional avatar URL exposed as `sprite_path` if a custom photo is needed

## Important implementation note

There is a mismatch today between the extracted `AgentCard.jsx` component and the live conversations list in `ConversationsView.jsx`:

- `AgentCard.jsx` is the reusable card contract
- `ConversationsView.jsx` currently renders agent cards inline instead of importing and using that component

That means the trading agent should satisfy the broader shared data contract, not just a single component call site.

## Recommended canonical payload for a trading agent

```text
agent = {
  slug: 'trading-agent',
  name: 'Trading Agent',
  role: 'Market monitoring and execution support',
  status: 'idle',
  color: '#10B981',
  sprite_path: 'https://...optional-avatar-url...',
  updatedAt: '2026-04-12T12:34:56.000Z'
}

lastMessage = {
  agent: 'trading-agent',
  text: 'Latest market summary or execution update...',
  timestamp: '2026-04-12T12:35:10.000Z',
  id: 'message-id',
  isUnread: false
}

unreadCount = 0
```

This shape matches the current dashboard integration points and is the safest target for a new specialized agent.