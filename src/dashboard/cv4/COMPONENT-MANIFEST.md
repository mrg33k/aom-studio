# CV4 Component Manifest

## SAFE-TO-RENDER (No Context, No Providers, No Fetch)

Ordered simplest-first. All components can render standalone with provided props.

### 1. MailChip.jsx — MailChip (PIECE)

**Props:**
- `email` (REQUIRED) — object with shape `{ from: { name: string, email: string } }`
- `onClear` (REQUIRED) — callback: `(email) => void`

**Sample Props:**
```js
{
  email: { from: { name: "alice@acme.com", email: "alice@acme.com" } },
  onClear: () => {}
}
```

**States:**
1. Normal state — renders email chip with clear button
2. Multiple chips — render 3 chips in a row to test layout

---

### 2. MissionChip.jsx — MissionChip (PIECE)

**Props:**
- `mission` (optional) — object with `title`, `slug`, or null
- `onClear` (REQUIRED) — callback: `() => void`

**Sample Props (with mission):**
```js
{
  mission: { title: "corner:integrations", slug: "corner-integrations" },
  onClear: () => {}
}
```

**Sample Props (null state):**
```js
{
  mission: null,
  onClear: () => {}
}
```

**States:**
1. Mission selected — shows title + close button
2. Empty (null) — shows placeholder text
3. With long slug — test truncation

---

### 3. SkillsBadge.jsx — SkillsBadge (PIECE)

**Props:**
- `open` (REQUIRED) — boolean
- `onToggle` (REQUIRED) — callback: `() => void`

**Sample Props (closed):**
```js
{
  open: false,
  onToggle: () => {}
}
```

**Sample Props (open):**
```js
{
  open: true,
  onToggle: () => {}
}
```

**States:**
1. Closed (collapsed badge)
2. Open (expanded shelf)

---

### 4. BucketSection.jsx — BucketSection (PIECE)

**Props:**
- `slug` (REQUIRED) — string, e.g. "pinned-agents"
- `label` (REQUIRED) — string, e.g. "Pinned Agents"
- `count` (REQUIRED) — number
- `open` (REQUIRED) — boolean
- `onToggle` (optional) — callback: `() => void`
- `loading` (optional) — boolean, default false
- `children` (REQUIRED) — JSX

**Sample Props (collapsed, loaded):**
```js
{
  slug: "pinned-agents",
  label: "Pinned Agents",
  count: 3,
  open: false,
  onToggle: () => {},
  loading: false,
  children: <div>Agent list here</div>
}
```

**Sample Props (expanded, loading):**
```js
{
  slug: "pinned-agents",
  label: "Pinned Agents",
  count: 3,
  open: true,
  onToggle: () => {},
  loading: true,
  children: <div>Skeleton loaders</div>
}
```

**States:**
1. Collapsed, count shows — click to expand
2. Expanded with content
3. Loading spinner in open state

---

### 5. ProjectFileReader.jsx — ProjectFileReader (PIECE)

**Props:**
- `content` (optional) — markdown string
- `kind` (optional) — 'canon' | 'tape' | 'research-drop'
- `name` (optional) — string, e.g. "VISION.md"
- `lastModified` (optional) — ISO date string or readable date
- `onLinkClick` (optional) — callback: `(href) => void`

**Sample Props (canon file):**
```js
{
  content: "# corner:integrations\n\n**Status:** IN PROGRESS\n\nBuild real-time Slack sync...",
  kind: "canon",
  name: "VISION.md",
  lastModified: "2026-06-15T14:32:00Z",
  onLinkClick: (href) => console.log("Clicked:", href)
}
```

**Sample Props (tape):**
```js
{
  content: "Session 2026-06-15: Fixed ChatWaveBackground bloom on dark theme. Synced uiKit with CommandDeck. Next: MailRoom header.",
  kind: "tape",
  name: "last-conversation.md",
  lastModified: "2 hours ago"
}
```

**States:**
1. Canon (VISION/BUILD/CONTEXT) — formal header + body
2. Tape (last-conversation) — agent notes
3. Empty content — no-file state
4. Long content — scroll behavior

---

### 6. MailAccountSwitcher.jsx — MailAccountSwitcher (PIECE)

**Props:**
- `connections` (REQUIRED) — array of connection objects `{ id, email, provider, displayName? }`
- `active` (REQUIRED) — the currently selected connection object
- `onChange` (REQUIRED) — callback: `(connection) => void`
- `workspaceId` (optional) — string
- `workspaceName` (optional) — string
- `onShared` (optional) — callback: `(action) => void`

**Sample Props:**
```js
{
  connections: [
    { id: "conn-1", email: "alice@acme.com", provider: "gmail", displayName: "Personal" },
    { id: "conn-2", email: "alice@work.com", provider: "microsoft", displayName: "Work" }
  ],
  active: { id: "conn-1", email: "alice@acme.com", provider: "gmail", displayName: "Personal" },
  onChange: (conn) => console.log("Switched to:", conn.email),
  workspaceName: "AOM"
}
```

**States:**
1. Single connection active
2. Multiple connections, switch between them
3. With workspace label

---

### 7. CatchupModal.jsx — CatchupModal (COMPONENT)

**Props:**
- `isOpen` (REQUIRED) — boolean
- `notifications` (REQUIRED) — array of notification objects
- `onClose` (REQUIRED) — callback: `() => void`
- `onReply` (REQUIRED) — callback: `(id, text) => void`
- `onSkip` (REQUIRED) — callback: `(id) => void`
- `onLoadContext` (optional) — callback: `(id) => void`
- `onOpenRoom` (optional) — callback: `(roomId) => void`

**CatchupNotification shape:**
```js
{
  id: string,
  senderName: string,
  senderInitials: string,
  senderType: "user" | "agent" | "system",
  roomName: string,
  timeAgo: string,
  badgeType: "mention" | "task" | "message",
  messagePreview: string,
  suggestedReplies: string[]
}
```

**Sample Props (closed):**
```js
{
  isOpen: false,
  notifications: [],
  onClose: () => {},
  onReply: () => {},
  onSkip: () => {}
}
```

**Sample Props (mention notification):**
```js
{
  isOpen: true,
  notifications: [
    {
      id: "notif-1",
      senderName: "Patrik",
      senderInitials: "PM",
      senderType: "user",
      roomName: "corner:rules-consolidation",
      timeAgo: "2m ago",
      badgeType: "mention",
      messagePreview: "@AI: can you review the new playbook structure?",
      suggestedReplies: ["I'll review it now", "Can you give me 30 min?"]
    }
  ],
  onClose: () => {},
  onReply: (id, text) => console.log(id, text),
  onSkip: (id) => console.log("Skipped:", id)
}
```

**States:**
1. Modal closed
2. Single mention notification
3. Task notification with badge
4. Multiple notifications in queue

---

### 8. ChatWaveBackground.jsx — ChatWaveBackground (PIECE)

**Props:**
- `chatKey` (optional) — string for hue hashing
- `theme` (optional) — 'dark' | 'light', default 'dark'

**Sample Props (dark theme):**
```js
{
  chatKey: "corner:integrations",
  theme: "dark"
}
```

**Sample Props (light theme):**
```js
{
  chatKey: undefined,
  theme: "light"
}
```

**States:**
1. Dark theme — additive glow, breathing wave
2. Light theme — deep ink + softer bloom
3. Different chatKey — hue shift in background

---

### 9. HomeView.jsx — HomeView (VIEW)

**Props:**
- `user` (REQUIRED) — object with `name`, `initials`, `email`
- `worldId` (REQUIRED) — string
- `agents` (optional) — array of agent objects `{ slug, name, initials, status }`
- `projectRooms` (optional) — array of project objects `{ slug, name, emoji, status, unread }`
- `onSelectAgent` (REQUIRED) — callback: `(agentSlug) => void`
- `onSelectProject` (REQUIRED) — callback: `(projectSlug) => void`
- `onOpenSearch` (optional) — callback: `() => void`
- `needsYou` (optional) — array of `{ key, label, detail, onOpen }`

**Sample Props:**
```js
{
  user: { name: "Patrik", initials: "PM", email: "patrik@aheadofmarket.com" },
  worldId: "world-1",
  agents: [
    { slug: "elon", name: "Elon", initials: "E", status: "idle" },
    { slug: "studio", name: "Studio", initials: "S", status: "running" }
  ],
  projectRooms: [
    { slug: "corner", name: "Corner", emoji: "⚱", status: "in-progress", unread: 0 },
    { slug: "brandon", name: "Brandon Wiley", emoji: "🎬", status: "in-progress", unread: 3 }
  ],
  onSelectAgent: (slug) => console.log("Agent:", slug),
  onSelectProject: (slug) => console.log("Project:", slug)
}
```

**States:**
1. Empty (no agents, no projects) — onboarding view
2. Agents + projects populated
3. With unread badges
4. With "needs you" banner

---

### 10. AttachedSkillChip.jsx — AttachedSkillChip (PIECE)

**Props:**
- `projectSlug` (REQUIRED) — string
- `missionSlug` (REQUIRED) — string

**Sample Props:**
```js
{
  projectSlug: "corner",
  missionSlug: "corner-integrations"
}
```

**States:**
1. Skill attached, show removal button
2. Loading state while removing
3. Error state if skill doesn't exist

---

## NEEDS-PROVIDERS (Context, Hooks, API, or Fetch Dependencies)

Reason each cannot render standalone in a gallery.

---

### 1. ComposerCommandsMenu.jsx — ComposerCommandsMenu

**Reason:** Requires custom hooks `useChatCore`, `useChatMessagesCtx`, `useChatRecordingCtx`, `useChatSettingsCtx`. Cannot render without a context provider wrapping them.

---

### 2. ContextNav.jsx — CV4ContextNav

**Reason:** Requires many context-dependent callbacks and state props (tab, onSwitchTab, agents, projects, onSelectAgent, onSelectProject, etc.). Must be mounted inside a parent that manages this full state.

---

### 3. Drawer.jsx — CV4Drawer

**Reason:** Requires complex parent state (agents, projectRooms, notifItems, selectedAgentSlug, selectedProjectSlug, etc.). Used for main navigation; needs full CornerContext and auth state.

---

### 4. FilesPanel.jsx — FilesPanel

**Reason:** Uses `useCornerAuth` hook and `useIsMobile` hook. Makes API calls via `authFetch` to fetch project/mission file metadata. Requires CornerContext provider.

---

### 5. RightMenu.jsx — RightMenu

**Reason:** Uses `useCornerAuth` and `useCornerNav` hooks. Renders `FilesPanel` conditionally. Requires CornerContext.

---

### 6. LeftMailPanel.jsx — LeftMailPanel

**Reason:** Manages OAuth state, connection list via `authFetch`, and handles authentication callbacks. API-driven; cannot render in isolation.

---

### 7. MailListPanel.jsx — MailListPanel

**Reason:** Uses `authFetch` to fetch mail messages from API. Supabase-dependent if available. Data-fetching on mount makes it unsafe for gallery.

---

### 8. MailRoom.jsx — MailRoom

**Reason:** Fetches email body via `authFetch` on mount. Requires authenticated API context.

---

### 9. RoutinesPanel.jsx — RoutinesPanel

**Reason:** Uses `authFetch` to fetch routines. API-dependent.

---

### 10. RoutinesBoard.jsx — RoutinesBoard

**Reason:** Fetches routines and routine details via `authFetch` to `/api/dashboard/routines`. Requires authenticated context.

---

### 11. SupportDashboard.jsx — SupportDashboard

**Reason:** Uses `useSupportData` custom hook. Cannot render without the context/hook provider.

---

### 12. SupportInbox.jsx — SupportInbox

**Reason:** Directly uses Supabase client to fetch `messages` table. Requires Supabase context.

---

### 13. TasksPanelCv4.jsx — TasksPanelCv4

**Reason:** Uses `useTasksPanel` hook. No props; renders TasksPanelCv4Body which depends on context provider.

---

### 14. SkillsShelf.jsx — SkillsShelf

**Reason:** Depends on external `skillsData` import (a static data object). If skillsData doesn't exist or is not wired, it will fail. Also may use `authFetch` for dynamic skill list.

---

### 15. SkillsMissionPicker.jsx — SkillsMissionPicker (Conditional)

**Reason:** If `missions` prop is NOT provided, it calls `authFetch` to `/api/dashboard/missions-tree`. Safe only if you provide a full `missions` array; otherwise needs API context.

---

### 16. CommandDeck.jsx — CommandDeck (VIEW)

**Reason:** Fetches data from multiple API endpoints (`/api/dashboard/project-file`, `/api/dashboard/routines`, `/api/dashboard/claude-sessions`). Uses `authFetch`, localStorage, and complex state management. Renders many sub-adapters (HardCallCard, SteeringQuestionCard, RoomStatusCard, StuckSessionCard, KeeperCard). Requires full authenticated context.

---

## Summary

**SAFE components (can render in gallery with props):** 10  
**Pieces (reusable, small):** MailChip, MissionChip, SkillsBadge, BucketSection, ProjectFileReader, MailAccountSwitcher, ChatWaveBackground, AttachedSkillChip  
**Components (complex but self-contained):** CatchupModal  
**Views (screens):** HomeView  

**NEEDS-PROVIDERS:** 16  
**Primary blocker:** CornerContext, useCornerAuth, authFetch (authenticated API), Supabase integration, custom hooks (useChatCore, useChatMessagesCtx, etc.)

---

## Notes for Gallery Implementation

1. **Mock authFetch:** Create a stub that returns resolved promises for NEEDS-PROVIDERS components if you want to test them. Example: `const authFetch = (url) => Promise.resolve({ data: [] })`

2. **uiKit exports (always available):** All components have access to:
   - `DOT` — { running, attention, idle } colors
   - `OVERLAY` — { backdrop, backdropBlur, panelRadius, panelShadow, zBackdrop, zPanel, zLightbox }
   - `StatusDot`, `FolderIcon`, `MissionIcon` — utility components

3. **CV4 Design System (always available):**
   - Fonts: Instrument Serif, Hanken Grotesk, JetBrains Mono
   - Colors: Deep cool-ink background, warm bone text, AOM amber accent
   - Reference: `src/dashboard/cv4-explore-v2/DESIGN.md`, `cv4-explore-v2/INVENTORY.md`

4. **Context dependencies (for NEEDS-PROVIDERS):**
   - `CornerContext` — user, auth, navigation state
   - `useCornerAuth` — current user, auth checks
   - `useCornerNav` — room/project/agent navigation
   - `useChatCore`, `useChatMessagesCtx`, `useChatRecordingCtx`, `useChatSettingsCtx` — chat-specific context
   - `useTasksPanel` — tasks sidebar state
   - `useIsMobile` — breakpoint hook

5. **API stubs (for NEEDS-PROVIDERS in test):**
   - `/api/dashboard/project-file` — fetch file content (VISION, CONTEXT, etc.)
   - `/api/dashboard/routines` — fetch routines list
   - `/api/dashboard/claude-sessions` — fetch active agent sessions
   - `/api/dashboard/missions-tree` — fetch projects/missions hierarchy
