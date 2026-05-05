# CV4 v2 Component Inventory

**Status:** Live inventory during build (2026-05-04)  
**Branch:** `cv4-explore-v2`  
**Canonical source:** CV3 JSX files at `src/dashboard/components/cv3/`

## Overview

CV4 v2 is a faithful 1:1 port of CV3 into static hand-authored HTML + CSS. This inventory tracks:
1. Every CV3 component and its responsibility
2. The v4 equivalent (HTML file location)
3. Ports completed, in-progress, pending
4. Design delta vs CV3

---

## Core Views (Top-Level Surfaces)

### 1. ConversationsView
**File:** `src/dashboard/components/cv3/ConversationsView.jsx` (480 LOC)  
**Responsibility:** Home surface. Greeting + search bar + agent list + project list + EA hero card.  
**Key subcomponents:**
- GreetingHero (rotating greeting + live-dot)
- HomeSearchBar (search with real-time filtering)
- EaHeroCard (EA intro card, pinnable)
- AgentsList (pinned + unpinned agents, drag-to-reorder)
- ProjectsList (pinned + unpinned projects, chronologically sorted by last message)
- HomeStateFeed (activity overview, optional state display)
- HandoffNudge (clear session reminder)
- SearchResults (when search query >= 2 chars: Messages, Tasks, Agents, Projects filtered)
- CallInProgressBanner (shows when voice call is active)

**V4 equivalent:** `views/home.html` (composes components from `components/`)  
**Status:** PENDING  
**Design notes:**
- Hero greeting rotates through 7 strings; MUST now use time-variant to pick morning/afternoon/evening/night strings (R74-time-aware)
- Live-dot glow effect
- Pin/unpin universal affordance in three-dot menus
- Drag-to-reorder within lists (JS required)

---

### 2. ThreadView
**File:** `src/dashboard/components/cv3/ThreadView.jsx` (80 LOC)  
**Responsibility:** 1:1 agent chat surface. Composes thread header, message list, input bar, voice/recording controls, files panel, settings.  
**Key subcomponents:**
- ThreadHeader (agent name/info + settings button + profile toggle)
- MessageList (message history with step thread + context menu)
- ThreadInputBar (text input + attachments)
- VoiceChatHost (audio state mgmt)
- VoiceModeBar (toggle voice mode)
- RecordingStatusBar (shows recording in progress)
- FilesPanel (right-side project files/docs)
- ThreadSettingsModal (config, clear session button, context-fullness meter)
- AgentProfileOverlay (agent bio + capabilities)
- RecipesBookOverlay (available recipes/skills)
- HandoffNudge (clear session reminder)

**V4 equivalent:** `views/chat-1on1.html`  
**Status:** PENDING  
**Design notes:**
- User message pins to top, agent chain below (VISION pillar 1)
- Step thread UI (breathing dots for in_progress, settled dots for done)
- Message status labels (pending, sent, failed)
- Right-click context menu (copy, edit, delete, follow-up options)

---

### 3. TasksPanel
**File:** `src/dashboard/components/cv3/TasksPanel.jsx` (850+ LOC split across 9 task section components)  
**Responsibility:** Task queue + project briefing surface. Shows task sections: active, waiting, blocked, done, failed. Includes project cards, living paragraph, weekly stats.  
**Key subcomponents (all in `tasks/` folder):**
- ActiveTasksSection (queued + in_progress)
- WaitingTasksSection (needs_input, needs_verification)
- BlockedTasksSection (blocked by dependency)
- DoneTasksSection (completed tasks)
- FailedTasksSection (failed)
- ForemanTasksSection (foreman-owned tasks)
- PersonalTodosSection (owner personal todos)
- FilesSection (AllFiles, ProjectFiles, ProjectMissions, MissionBreadcrumb, MissionScaffold)
- ProjectBriefingCard (living paragraph + stats per project)
- WeeklyStatsCard (top-level weekly summary)
- TaskInputBar (new task input + slash-command autocomplete)
- CreateProjectModal (conversational project creation)
- LivingParagraphCard (the narrative roundup per project)
- TaskDrawerProjectSummary (in-drawer project context)
- TaskDrawerFileFAQ (file reading inside task drawer)
- ResultPreview (task result rendering)

**V4 equivalent:** `views/tasks.html`  
**Status:** PENDING  
**Design notes:**
- Task status lifecycle: Right Now / To Do / Schedule / Inbox / Done (colored pills)
- Accordion-style brief expansion (click to reveal context inline)
- Project pills filter tasks per project
- Living paragraph is the narrative north star (not template synthesis)
- Weekly stats show cross-project summary
- Stale-project-nudge card with action buttons (R75-c1) — MUST render action_buttons UI

---

### 4. ProjectChatView
**File:** `src/dashboard/components/cv3/ProjectChatView.jsx` (similar to ThreadView but project-scoped)  
**Responsibility:** Scoped chat for a specific project. Loads project context (CONTEXT.md, VISION.md) and routes to EA with that context loaded.  
**Key subcomponents:**
- ProjectChatHeader (project name + settings + info + search)
- ProjectInputBar (text input + task creation in-scope)
- ProjectSearchBar + ProjectSearchResults (search project files)
- ProjectFilesPanel (VISION/CONTEXT/BUILD/RESEARCH tree for this project)
- CanonFilesPanel (view mode for MD files)
- ProjectSettingsModal (project-specific config)
- ProjectRecordingStatusBar (recording in-scope)
- ProjectVoiceChatHost + ProjectVoiceModeBar (voice in project context)
- MessageList (same as thread, but project-scoped)

**V4 equivalent:** `views/project-chat.html`  
**Status:** PENDING  
**Design notes:**
- Project context loads automatically (no manual briefing)
- Task creation button in input bar routes to task creation modal
- Files panel shows project canon (VISION/CONTEXT/BUILD/RESEARCH as tree with expand/collapse)
- Conversation history scrolls beneath user message pin

---

## Foundational UI Components (Reusable)

### Conversation Surfaces

**HomeSearchBar** → `components/search-bar-home.html`
- Real-time search, >= 2 chars triggers filtered results
- Debounced filtering across Messages / Tasks / Agents / Projects / Files

**SearchResults** → `components/search-results.html`
- Four-column result grid: Messages / Tasks / Agents / Projects
- Project label on cross-project hits
- Click routes to target (agent chat, task, project chat, etc.)

**GreetingHero** → `components/greeting-hero.html`
- Rotating greeting strings (7 base + time-of-day variants for morning/afternoon/evening/late-night)
- Live-dot glow effect
- Hero typography (clamp font size)

**EaHeroCard** → `components/ea-hero-card.html`
- EA intro card: name + bio + quick-action buttons (Start Chat, View Skills)
- Pin/unpin button in three-dot menu
- Visual card container with subtle background

**AgentsList** → `components/agents-list.html`
- Pinned agents at top, unpinned below
- Each agent card: avatar + name + last message preview + online status
- Three-dot pin/unpin menu
- Drag-to-reorder within list (requires JS)
- Click routes to 1:1 chat

**ProjectsList** → `components/projects-list.html`
- Pinned projects at top, unpinned below
- Chronologically sorted by last message (default) or dragged order
- Each project card: icon + name + last message preview + timestamp + task count
- Three-dot pin/unpin menu
- Click routes to project chat

**HomeStateFeed** → `components/home-state-feed.html`
- Optional: real-time activity log (messages, tasks completed, agents active)
- Appears below EA hero if opted-in

**CallInProgressBanner** → `components/call-in-progress-banner.html`
- Fixed banner at top when voice call is active
- Shows agent name + call duration + end call button
- Appears above GreetingHero

### Thread/Chat Components

**ThreadHeader** → `components/thread-header.html`
- Agent avatar + name + online status indicator
- Settings button (opens modal)
- Profile button (opens overlay)
- Optional: agent "thinking" indicator (animated)

**MessageList** → `components/message-list.html`
- User messages pin to top of viewport
- Agent messages below in chronological order (newest first in viewport)
- Older messages scroll beneath
- Each message: avatar + name + timestamp + content + status label
- Step thread rendering (breathing dots for in_progress steps)
- Right-click context menu (copy, edit, delete, follow-up, research)
- Message status: pending (ghost), sent (checkmark), failed (error color)

**StepThread** → `components/step-thread.html`
- Visual chain of steps under an agent message
- Breathing dot (orange) for in_progress step
- Settled dot (gray) for completed step
- Step label (user-friendly copy: "Reading the bakery's CONTEXT")

**ThreadInputBar** → `components/thread-input-bar.html`
- Expandable textarea (grows with content)
- File attachment button (+ preview strip below)
- Send button (disabled while sending)
- Slash-command autocomplete popup (/ triggers skill list)

**VoiceChatHost** → `components/voice-chat-host.html`
- Audio context manager (no visible UI, infrastructure)

**VoiceModeBar** → `components/voice-mode-bar.html`
- Toggle voice mode on/off
- Shows "Voice chat active" when enabled
- Recording indicator if applicable

**RecordingStatusBar** → `components/recording-status-bar.html`
- Fixed bar showing "Recording in progress — 2:34"
- Stop + Pause buttons
- Waveform indicator (animated)

**ThreadSettingsModal** → `components/thread-settings-modal.html`
- Modal dialog (click backdrop to close)
- Config toggles (context injection, research prompts, etc.)
- Clear session button (resets tmux, confirms action)
- Context-fullness meter (percentage bar, color-coded)
- Close button (X)

**AgentProfileOverlay** → `components/agent-profile-overlay.html`
- Full-screen overlay covering thread area
- Agent card: avatar + name + bio + capabilities list
- Skills available + recent activity
- Close button (backdrop click)

**RecipesBookOverlay** → `components/recipes-book-overlay.html`
- Full-screen overlay: list of available skills/recipes
- Each recipe: icon + name + description + "Try it" button
- Search/filter recipes
- Close button

**FilesPanel** → `components/files-panel.html` (thread scope)
- Right-side panel: project canon files (VISION/CONTEXT/BUILD/RESEARCH tree)
- Expandable tree with folder icons
- Click file to read in viewer
- Close button (X)

### Task Queue Components

**TaskInputBar** → `components/task-input-bar.html`
- Text input "Add a new task"
- Slash-command autocomplete (/, then skill list)
- Create project button (launches modal)
- Submit button

**ActiveTasksSection** → `components/active-tasks-section.html`
- Heading: "Right Now" (icon + count)
- List of tasks with queued/in-progress status
- Expandable brief preview (click to expand inline)
- Task card: assignee avatar + title + project pill + priority + "View brief" button

**WaitingTasksSection** → `components/waiting-tasks-section.html`
- Heading: "Waiting for you"
- Tasks with `needs_input` or `needs_verification` status
- "Answer question" / "Verify result" action buttons
- Task card UI same as active

**BlockedTasksSection** → `components/blocked-tasks-section.html`
- Heading: "Blocked" (icon + count)
- Tasks waiting on dependencies
- Each card shows blocking task
- No action (dependency must resolve first)

**DoneTasksSection** → `components/done-tasks-section.html`
- Heading: "Done" (icon + count, collapsible to hide)
- Completed tasks with timestamp
- Task card UI same as active
- Collapsible section (default closed)

**FailedTasksSection** → `components/failed-tasks-section.html`
- Heading: "Failed" (icon + count)
- Failed tasks with error message
- "Retry" button
- Task card UI same as active

**ForemanTasksSection** → `components/foreman-tasks-section.html`
- Heading: "Foreman working on..."
- Autonomous round progress (R67, R68, etc.)
- Progress card: round # + status + "View results" button

**PersonalTodosSection** → `components/personal-todos-section.html`
- Heading: "Your todos"
- Quick checkboxes for personal/admin tasks
- Input to add new todos

**ProjectBriefingCard** → `components/project-briefing-card.html`
- Per-project living paragraph + stats
- Heading: project name + status indicator
- Narrative paragraph (real story, not template)
- "Read more" toggle (expands to full narrative)
- Stats: active tasks / blocked / in-progress

**WeeklyStatsCard** → `components/weekly-stats-card.html`
- Top-level summary card
- Stats: tasks completed this week / in progress / blocked / projects active
- Mini charts (bars or sparklines)

**LivingParagraphCard** → `components/living-paragraph-card.html`
- Narrative roundup (per-project or "All" overview)
- Heading: "This week in [Project]" or "Across all projects"
- Rich text paragraph (composed by narrative agent)
- "Expand" toggle for full details

**CreateProjectModal** → `components/create-project-modal.html`
- Modal dialog (backdrop click closes)
- Three steps: Name / Owner / Initial context
- Conversational UI ("What's the project about?")
- Create button + cancel

**TaskDrawerProjectSummary** → `components/task-drawer-project-summary.html`
- Sidebar drawer: active project context
- Heading: project name
- Recent activity: last 3 messages / latest commit / latest context change
- "View full project" link

**TaskDrawerFileFAQ** → `components/task-drawer-file-faq.html`
- Sidebar drawer: file viewer
- MD file rendered as article-style (full width, generous line-height)
- Heading + metadata (project + file path)
- Close button (X)

**ResultPreview** → `components/result-preview.html`
- Task result card
- Type variants: image / video / text / link / check_external
- Display accordingly
- Click to expand modal

### Notification / Status Components

**NotificationsPanel** → `components/notifications-panel.html`
- Right-side panel (or bottom drawer on mobile)
- Bell icon indicator (dot if unread)
- Notification list: skill recommendations / task completions / @mentions / share invites
- Each notif: icon + title + "Dismiss" button
- Clear all button

**TaskStatusCard** → `components/task-status-card.html`
- Card showing task status: queued / in_progress / done / failed
- Animated status indicator (spinner for in_progress)
- Brief summary text
- Action buttons if applicable

**SuccessRateChip** → `components/success-rate-chip.html`
- Inline chip: "87% success rate" (or similar metric)
- Used in home feed and project cards
- Color-coded (green for good, yellow for warning)

**DocUpdateCard** → `components/doc-update-card.html`
- Card indicating a doc was updated (CONTEXT.md refresh, etc.)
- "Dismiss" or "View" button
- Appears as notification toast or in-feed card

**HandoffNudge** → `components/handoff-nudge.html`
- Small tooltip nudge: "Might be a good moment to write a handoff and clear"
- "Got it" / "Snooze" / "Dismiss" buttons
- Appears after ~10–15 turns of conversation
- Non-blocking

### Modal / Overlay Components

**ThreadSettingsModal** (covered above)
**AgentProfileOverlay** (covered above)
**RecipesBookOverlay** (covered above)
**CreateProjectModal** (covered above)

---

## NEW v4 Foundational Components (Per Brief)

### 1. Cut-Scene Overlay
**Purpose:** Entrance experience narrating what's open (R74-cutscene)  
**File:** `components/cutscene-overlay.html`  
**Content:**
- Semi-transparent dark backdrop (full viewport)
- Center card: "Welcome back, Patrik"
- Items list:
  - Stale projects needing check-in (R75-c1)
  - Tasks with `needs_input` (action buttons: Answer / Defer)
  - Pending approvals (action buttons: Approve / Deny)
  - Unanswered DMs in shared rooms
  - Skill recommendations
  - Recovery narrations
- Each item: icon + title + subtitle + action button
- "Dismiss" button at bottom

### 2. Stale-Project-Nudge Card
**Purpose:** Action card for stale projects (R75-c1 render fix)  
**File:** `components/stale-nudge-card.html`  
**Content:**
- Card: "Still working on [Project]?"
- Subtitle: "No activity since [date]"
- Action buttons: "Keep working" / "Archive" / "Pause"
- Appears in project chat OR cut-scene

### 3. Project-From-Chat Confirmation Card
**Purpose:** Confirm creation when user suggests new project (R78-p2)  
**File:** `components/project-confirm-card.html`  
**Content:**
- Card: "Ready to create a new project: [Project Name]?"
- Action buttons: "Create" / "Cancel"
- Appears in chat thread

### 4. Article-Style File Reader
**Purpose:** Clean MD file reader (R75-e3)  
**File:** `components/article-reader.html`  
**Content:**
- Full-width article container
- Title + metadata (project + path + edit date)
- MD content rendered as rich HTML (headings, lists, code blocks, etc.)
- No sidebar in this modal
- Close button (X)

### 5. Conversational Project Create UI
**Purpose:** Walk user through project creation (R75-c4)  
**File:** `components/conversational-create.html`  
**Content:**
- Modal with three steps:
  1. "What's the project about?" (text input)
  2. "Who owns it?" (agent selector)
  3. "Any initial context?" (optional text)
- Progress indicator (step 1/3, 2/3, 3/3)
- "Create" / "Cancel" buttons

### 6. Shared-Rooms ACL UI
**Purpose:** Manage permissions in shared rooms (R75-d4)  
**File:** `components/shared-room-acl.html`  
**Content:**
- Settings modal in project chat
- Members list with permission rows (each member: name + role selector)
- Role options: owner / member / read-only
- "Add member" button
- "Save" / "Cancel" buttons

### 7. Voice Call UI (Floating Bar)
**Purpose:** Persistent call indicator during long conversations  
**File:** `components/floating-call-bar.html`  
**Content:**
- Fixed floating bar (top-right or center-bottom)
- Shows: agent name + call duration + waveform indicator
- Buttons: "Minimize" / "End call"
- Draggable to reposition
- Persists across navigation

### 8. Phone Recording Overlay
**Purpose:** Interface for phone-mode recording (R74-phone-recording)  
**File:** `components/phone-recording-overlay.html`  
**Content:**
- Large centered recorder UI
- Agent avatar + name
- Big record button (red)
- Timer (0:00 counting up)
- Pause button
- Stop + "Process transcript" button
- Transcript preview below (as it arrives)

### 9. Onboarding Voice UI
**Purpose:** Initial voice setup flow  
**File:** `components/onboarding-voice.html`  
**Content:**
- Modal: "Let's talk about your goals"
- Three questions (per new onboarding script):
  1. "What's your workspace called?"
  2. "What are you working on?"
  3. "What should we do first?"
- Voice input button (red) for each
- Transcript preview + edit button
- "Next question" / "Skip to written" buttons
- Final: "Got it, let's build" button

### 10. World Picker
**Purpose:** Switch between AOM / personal / other org worlds  
**File:** `components/world-picker.html`  
**Content:**
- Modal or dropdown (likely modal on mobile, dropdown on desktop)
- Current world highlighted
- List of available worlds: AOM (with team label) / Personal / [Org names]
- Click to switch
- "Invite to world" button (if applicable)

---

## Color + Typography System

**Colors:** `styles/tokens.css`
- From cv3Colors.js: C.text, C.text2, C.muted, C.accent, C.s1, C.s2, C.border, C.border2, C.dim, C.bg, etc.
- Dark mode baseline (dashboard is dark)
- Semantic tokens for success/error/warning

**Typography:** `styles/base.css`
- Font stack: Inter (system fallback)
- Scale: clamp() for responsive sizing
- Heading sizes: H1 (26–40px), H2 (20px), H3 (16px bold), body (14px), captions (12px)
- Line-height: 1.5 body, 1.08 headings

**Animations:** `styles/animations.css`
- Breathing-dot animation (step thread)
- Sliding transitions (drawer open/close)
- Fade-in/fade-out (overlays)
- Hover states (buttons, links)

**Mobile:** `styles/mobile.css`
- Breakpoint: 390px (iPhone SE)
- Nav collapses to hamburger
- Panels become drawers
- Font size adjustments (clamp)
- Touch-friendly tap targets (44px min)

**Desktop:** `styles/desktop.css`
- Breakpoint: ≥1440px
- Three-column rail (left agents+projects / center active surface / right activity+cut-scene)
- Sidebars fixed + scrollable
- Rich hover states

---

## Navigation Model

**Shell:** `index.html`
- Left sidebar: agents + projects (pinned at top, unpinned below)
- Center: active surface (home / thread / tasks / project-chat / recipes / world-picker / phone-recording)
- Right: activity panel + cut-scene (on ≥1440px)

**File-based routing:**
- Click agent card → navigate to `chat-1on1.html?agent_id=...`
- Click project card → navigate to `project-chat.html?project_id=...`
- Click "Tasks" in sidebar → navigate to `tasks.html`
- Click "Home" → navigate to `home.html`
- Back button uses browser history (native `<a href>` navigation)

**State persistence:**
- Pin order → localStorage (`aom_pinned_agents`, `aom_pinned_projects`)
- Last active surface → localStorage
- Scroll position per view → sessionStorage (reset on page reload)

---

## Port Checklist

### Phase 1: Core Infrastructure
- [ ] `styles/tokens.css` — color + spacing variables
- [ ] `styles/base.css` — typography + layout base
- [ ] `styles/animations.css` — transitions + keyframes
- [ ] `styles/mobile.css` — responsive behavior
- [ ] `styles/desktop.css` — 3-column desktop rail
- [ ] `assets/include.js` — tiny HTML inclusion helper (optional)
- [ ] `index.html` — shell with sidebar + center + right rail

### Phase 2: Home Surface
- [ ] `components/greeting-hero.html`
- [ ] `components/search-bar-home.html`
- [ ] `components/search-results.html`
- [ ] `components/ea-hero-card.html`
- [ ] `components/agents-list.html`
- [ ] `components/projects-list.html`
- [ ] `views/home.html` — compose above

### Phase 3: Thread/Chat Surface
- [ ] `components/thread-header.html`
- [ ] `components/message-list.html`
- [ ] `components/step-thread.html`
- [ ] `components/thread-input-bar.html`
- [ ] `components/voice-chat-host.html` (infra, minimal UI)
- [ ] `components/voice-mode-bar.html`
- [ ] `components/recording-status-bar.html`
- [ ] `components/thread-settings-modal.html`
- [ ] `components/agent-profile-overlay.html`
- [ ] `components/recipes-book-overlay.html`
- [ ] `components/files-panel.html`
- [ ] `views/chat-1on1.html` — compose above

### Phase 4: Tasks Surface
- [ ] `components/task-input-bar.html`
- [ ] `components/active-tasks-section.html`
- [ ] `components/waiting-tasks-section.html`
- [ ] `components/blocked-tasks-section.html`
- [ ] `components/done-tasks-section.html`
- [ ] `components/failed-tasks-section.html`
- [ ] `components/foreman-tasks-section.html`
- [ ] `components/personal-todos-section.html`
- [ ] `components/project-briefing-card.html`
- [ ] `components/weekly-stats-card.html`
- [ ] `components/living-paragraph-card.html`
- [ ] `components/task-drawer-project-summary.html`
- [ ] `components/task-drawer-file-faq.html`
- [ ] `components/result-preview.html`
- [ ] `views/tasks.html` — compose above

### Phase 5: Project Chat Surface
- [ ] `components/project-chat-header.html`
- [ ] `components/project-input-bar.html`
- [ ] `components/project-search-bar.html`
- [ ] `components/project-search-results.html`
- [ ] `components/project-files-panel.html`
- [ ] `components/canon-files-panel.html`
- [ ] `components/project-settings-modal.html`
- [ ] `views/project-chat.html` — compose above

### Phase 6: New v4 Components
- [ ] `components/cutscene-overlay.html`
- [ ] `components/stale-nudge-card.html`
- [ ] `components/project-confirm-card.html`
- [ ] `components/article-reader.html`
- [ ] `components/conversational-create.html`
- [ ] `components/shared-room-acl.html`
- [ ] `components/floating-call-bar.html`
- [ ] `components/phone-recording-overlay.html`
- [ ] `components/onboarding-voice.html`
- [ ] `components/world-picker.html`

### Phase 7: Utility Components
- [ ] `components/notifications-panel.html`
- [ ] `components/handoff-nudge.html`
- [ ] `components/call-in-progress-banner.html`
- [ ] `components/doc-update-card.html`
- [ ] `components/success-rate-chip.html`
- [ ] `components/task-status-card.html`

### Phase 8: Verification + Polish
- [ ] Desktop 1440px screenshot + review (Gate 4 + 5)
- [ ] Mobile 390px screenshot + review
- [ ] No console errors
- [ ] All buttons clickable + routable
- [ ] Color + typography match AOM brand (Gates 1 + 2)
- [ ] Real data in mockups (Gate 3)

---

## Open Questions

1. **Include.js vs inline HTML:** Should components be fetched via `data-include` markers, or should views inline the full HTML? (Brief says "pick whichever feels lighter" — recommend inlining for v4-explore-v2 to keep it scannable, use include.js only if > 20 lines of repetition.)

2. **State management for UI (pin order, scroll position):** localStorage vs session-scoped? (Recommend localStorage for pin order persistence; sessionStorage for scroll position per tab.)

3. **Drag-to-reorder implementation:** Vanilla JS or a library? (Brief says hand-authored static; recommend vanilla drag-drop with HTML5 API.)

4. **Time-variant greeting strings:** Should they live in JS or be baked into HTML? (Recommend JS in `assets/` — compute time bucket on load, then select greeting string.)

5. **Cut-scene trigger:** On first visit? On every return? After X minutes idle? (Per VISION-pending: should trigger on user return to dashboard + on agent needs-input. Recommend: page load if unread notifications, or user clicks "What's new?" button.)

6. **Desktop 3-column rail:** Fixed width or flex? (Recommend left rail 240px fixed, right rail 280px fixed, center flex; matches Linear/Bloomberg terminal precedent.)

---

## Design Rationale

**Visual target:** Bloomberg terminal × Linear × Notion sidebar. Dense, calm, signal-forward.

**Quality bar (from brief):** must look BETTER than live CV3. V1 attempt was "visually much worse" — this v2 applies AOM brand finish (ultra clean white spacious aheadofmarket.com translated to dashboard dark mode).

**Anti-Claude gates applied:**
- No gradient hero text (greeting rotates in solid white)
- No glassmorphism (cards are flat with subtle borders, dark background)
- No default Inter-only (Inter paired with system mono for code)
- No pastel card grids (cards use semantic dark colors: C.s1, C.s2)
- No marble textures (clean, minimal background)
- No generic blue buttons (buttons inherit from project color scheme)
- No centered hero layout (layout is asymmetric: left nav + center content + right activity)

**Responsive design:** mobile-first assumption; desktop 3-column rail is enhancement (≥1440px).

---

*Last updated: 2026-05-04 (Steffen)*
*Branch: cv4-explore-v2*
*Do not push to main*
