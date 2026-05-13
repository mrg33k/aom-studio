# CV4 Dashboard Handoff Document

**Date:** 2026-05-04  
**Status:** Static HTML/CSS prototype ready for React conversion  
**Prototype Location:** `/aom-studio/src/dashboard/cv4-explore/`  
**Test via:** `python3 -m http.server 8765` from cv4-explore directory, then open `http://localhost:8765/index.html`  

---

## Overview

CV4 is the next evolution of Corner's dashboard. This document maps all CV3 features into CV4's new architecture, documents design additions, and provides step-by-step migration guidance for React conversion.

**Key principles preserved:**
- All CV3 features and functionality intact
- Mobile-first responsive design (390px base → 768px tablet → 1440px desktop)
- Dark frame color system with AOM brand palette
- Agent routing, world selection, skill commands, phone recording
- Real-time task/project state via Supabase

**Key architecture changes:**
- Three-column desktop layout (left sidebar agents/projects, center chat/tasks, right sidebar activity)
- User message pinned to top of chat area (vs scrolling naturally)
- Unified CSS custom properties system (tokens.css)
- Proper responsive cascade (mobile base + desktop overrides, not mobile-only)
- Static HTML/CSS foundation (no React wiring yet)

---

## Files & Folder Structure

```
aom-studio/src/dashboard/cv4-explore/
├── index.html                 # Master entry point — all 4 demo views
├── styles/
│   ├── tokens.css             # Design token system (colors, typography, spacing, layout)
│   ├── mobile.css             # 390px mobile-first base styles
│   └── desktop.css            # 1440px desktop + tablet overrides
└── HANDOFF.md                 # This file
```

---

## CV3 Feature Inventory → CV4 Mapping

### Navigation & Header (CV3: lines 479–622)

| CV3 Component | CV3 Role | CV4 Location | CV4 Status | Notes |
|---|---|---|---|---|
| Nav row 1 (44px) | Logo, world selector, action buttons | `index.html` + `mobile.css .nav-row1` | ✓ Mapped | Logo, world selector preserved; buttons styled consistently |
| Nav row 2 (36px) | Chat/Tasks tabs, stats | `index.html` + `mobile.css .nav-row2` | ✓ Mapped | Tabs with active underline, badge counts on Tasks tab |
| AomLogo | Logo component | `index.html` `.nav-logo` | ✓ Mapped | Placeholder; bind to real AomLogo.jsx on React conversion |
| WorldSelector | World/tenant switch | `index.html` `.world-selector` | ✓ Mapped | Styled with accent green dot; logic binds to real component on React |
| GlobalCallButton | Voice call initiation | `index.html` `.action-btn.call` | ✓ Mapped | Bind to real GlobalCallButton.jsx on React |
| BellIcon + NotificationsPanel | Notification center | `index.html` `.action-btn.bell` (demo) | ⚠ Design pending | Popup position/styling documented; awaits NotificationsPanel component audit |
| Phone icon + PhoneRecordingOverlay | Call recording | `index.html` `.action-btn.phone` + overlay | ✓ Mapped | Styling + overlay structure in place; bind to real PhoneRecordingOverlay.jsx |
| UserAvatar | User profile menu | `index.html` `.action-btn.avatar` | ✓ Mapped | Bind to real UserAvatar.jsx |
| Tab component | Chat/Tasks switcher | `mobile.css .nav-row2, desktop.css` | ✓ Mapped | Active state underline (accent green), badge counts |
| Badge component | Unread/active counts | `mobile.css, desktop.css` | ✓ Mapped | Styling exists; bind to real Badge.jsx |

### Chat Panel (CV3: ChatPanel.jsx — referenced but not in this file)

| CV3 Component | CV3 Role | CV4 Location | CV4 Status | Notes |
|---|---|---|---|---|
| Message list (column-reverse) | Chat history | `mobile.css .chat-history, desktop.css` | ✓ Mapped | Layout preserved; user messages flex-end, agent messages flex-start |
| User message bubble | Pinned to top | `mobile.css .user-message-pinned` | ✓ **NEW** | Critical addition: user message always appears at viewport top, not in scroll history |
| Agent reply chain | Steps below user msg | `mobile.css .agent-reply-chain, .step-item` | ✓ **NEW** | Visualizes live agent thinking; step indicator pulses on in_progress |
| Message styling | Agent vs user colors | `mobile.css .message-text` | ✓ Mapped | Agent: var(--c-s2) bg; User: elon-blue; both have rounded corners |
| Timestamp display | Per-message timing | `mobile.css .message-timestamp` | ✓ Mapped | var(--fs-xs) var(--c-muted) |
| Input bar | Message compose | `mobile.css .input-bar` | ✓ Mapped | 52px height, rounded 26px pill, focus state shows accent glow |
| Input actions | Attach, commands, send | `mobile.css .input-bar buttons` | ✓ Mapped | SVG icons for attach (paperclip), commands (>), send (arrow) |
| Commands modal | Slash command palette | `index.html .commands-modal` | ✓ Mapped | Full modal layout with skill list; styled per CV3 |
| Phone overlay | Recording UI | `index.html .phone-overlay-demo` | ✓ Mapped | Demo structure; bind to real PhoneRecordingOverlay.jsx |

### Tasks Panel (CV3: TasksPanel.jsx — referenced but not in this file)

| CV3 Component | CV3 Role | CV4 Location | CV4 Status | Notes |
|---|---|---|---|---|
| Task list greeting | Narrative intro | `index.html .tasks-greeting` | ✓ Mapped | "You have X active projects and Y tasks..." |
| Project cards | Task/mission display | `index.html .project-card` | ✓ Mapped | Card grid with hover states, colored status badges |
| Project card header | Title + agent avatar | `mobile.css .project-card-header` | ✓ Mapped | Agent avatar + card title + project status badges |
| Status badge | Task status indicator | `mobile.css .status-badge` | ✓ Mapped | Colored dot + label (e.g., "In Progress", "Complete") |
| Project description | Body text | `mobile.css .project-card-desc` | ✓ Mapped | Paragraph of gray text; max-width enforced on desktop |

### Overlays & Modals (CV3: lines 742–843)

| CV3 Component | CV3 Role | CV4 Location | CV4 Status | Notes |
|---|---|---|---|---|
| Commands palette modal | Skill picker | `index.html .commands-modal` | ✓ Mapped | Position: fixed, backdrop blur, overlay stops propagation |
| Phone recording overlay | Recording state + transcript | `index.html .phone-overlay-demo` | ✓ Mapped | Demo shows structure; real component binds on React |
| Toast notification | Task completion feedback | `mobile.css .toast` (styles) | ✓ Mapped | Positioning at bottom-center, auto-dismiss |
| Floating call bar | Live call indicator | `desktop.css .floating-call-bar` | ✓ Mapped | Sticky bar showing active call state |

### Unbuilt Features (from VISION.md + VISION-pending-updates.md) — Designed in CV4

| Feature | Purpose | CV4 Location | Status | Notes |
|---|---|---|---|---|
| Left sidebar (desktop) | Agent/project quick-nav | `desktop.css .sidebar-left` | ✓ **NEW** | 280px fixed width, scrollable agent + project list with active highlight |
| Right sidebar (desktop) | Live activity feed | `desktop.css .sidebar-right` | ✓ **NEW** | 320px fixed width, shows recent activity (task updates, mentions, new messages) |
| Article reader | File/doc viewer | Not yet in CV4 | ⚠ Next phase | Will be separate modal; design pending detailed interaction spec |
| Conversational create | Project creation dialog | Not yet in CV4 | ⚠ Next phase | Multi-step creation flow with agent guidance; design pending |
| Stale-project nudge | Project re-engagement card | Mapped to .project-card with badge | ⚠ Partial | Card styling done; action button behavior (archive, resume) pending |
| Skill recommendation | New skill discovery card | (pending) | ⚠ Future | Discovery surface to be determined |

---

## Design Token System (tokens.css)

**Why CSS custom properties:**
- Single source of truth for all colors, spacing, typography
- Scoped to :root; no naming conflicts with React class names
- Easy to theme (dark/light modes, future multitenancy)
- Reduces Tailwind config complexity in long term
- Tree-shakeable if build tooling supports it

**Token Categories:**

### Colors
```css
/* Dark Frame (CV3 baseline) */
--c-bg: #06090F               /* Page background */
--c-bg2: #0B1018              /* Secondary surface */
--c-s1, --c-s2, --c-s3        /* Surface layers */
--c-border, --c-border2       /* Dividers at 4%, 8% opacity white */
--c-text: #F1F5F9             /* Primary text */
--c-text2: #94A3B8            /* Secondary text */
--c-muted: #475569            /* Muted labels */
--c-dim: #334155              /* Very muted */
--c-accent: #10B981           /* Action green */
--c-accent2: #34D399          /* Lighter green */

/* AOM Brand Colors */
--aom-cream: #FDF6EC          /* Light UI option */
--aom-orange: #E85D26         /* Primary action (light mode) */
--aom-gold: #C9A84C           /* Accent (light mode) */
--aom-night: #0C0C0C          /* Alt dark bg */
--aom-surface: #1A1A17        /* Alt surface */

/* Agent colors */
--agent-rex: #10B981          /* Green */
--agent-elon: #60A5FA         /* Blue */
--agent-bobby: #EAB308        /* Yellow */
--agent-cleo: #F472B6         /* Pink */
```

### Typography (Golden Ratio, φ = 1.618)
```css
--fs-2xs: 9px                 /* Tiny labels */
--fs-xs: 10px                 /* Small caps */
--fs-sm: 12px                 /* Role labels */
--fs-base: 14px               /* Body text */
--fs-md: 16px                 /* Default body */
--fs-lg: 20px                 /* Agent names, titles */
--fs-xl: 26px                 /* Section headers */
--fs-2xl: 34px                /* Page titles */
--fs-3xl: 42px                /* Display */

--lh-tight: 1.2               /* Headings */
--lh-body: 1.5                /* Body text */
--lh-loose: 1.7               /* Spacious paragraphs */

--ls-tight: -0.02em           /* Headlines */
--ls-normal: 0                /* Body */
--ls-caps: 0.08em             /* Uppercase labels */
--ls-mega: 0.12em             /* Large caps */

--ff-headline: 'Syne'          /* Bold, geometric */
--ff-body: 'Space Grotesk'     /* Friendly, readable */
--ff-mono: 'JetBrains Mono'    /* Code, timestamps */
```

### Spacing Scale
```css
--sp-xs: 4px    --sp-sm: 8px    --sp-md: 12px    --sp-lg: 16px
--sp-xl: 20px   --sp-2xl: 24px  --sp-3xl: 32px   --sp-4xl: 40px --sp-5xl: 48px
```

### Layout Heights (Fixed Nav)
```css
--nav-row1: 44px              /* Logo, world, buttons */
--nav-row2: 36px              /* Chat/Tasks tabs */
--nav-total: 80px             /* Combined */
--input-bar: 52px             /* Message compose */
```

### Breakpoints
```css
--bp-mobile: 390px            /* Base width */
--bp-tablet: 768px            /* Tablet landscape */
--bp-desktop: 1440px          /* Desktop full width */
```

---

## Layout Architecture

### Mobile (390px base, mobile.css)

**Single column, full-height flex layout:**

```
┌─────────────────────┐
│   Nav Row 1 (44px)  │  Logo, world selector, buttons
├─────────────────────┤
│   Nav Row 2 (36px)  │  Chat/Tasks tabs
├─────────────────────┤
│                     │
│   User Message      │  Pinned to top: flex layout with avatar + bubble
│                     │
├─────────────────────┤
│                     │
│   Agent Reply Chain │  Steps with green dot indicators
│   (scrollable)      │  Each step: in_progress (pulse) → done
│                     │
├─────────────────────┤
│   Chat History      │  Scrollable flex column-reverse (newest at bottom)
│   (scrollable)      │  Agent messages flex-start, user flex-end
│                     │
├─────────────────────┤
│   Input Bar (52px)  │  Rounded pill, attach/commands/send buttons
└─────────────────────┘
```

**Sidebars hidden:** `.sidebar-left { display: none }` / `.sidebar-right { display: none }`

### Tablet (768px–1439px, desktop.css media queries)

**Single column, same as mobile:** Sidebars still hidden, layout stretches to tablet width but structure unchanged.

### Desktop (1440px+, desktop.css)

**Three-column CSS grid layout:**

```css
.page {
  display: grid;
  grid-template-columns: 280px 1fr 320px;    /* Left nav | Center canvas | Right activity */
  grid-template-rows: auto auto 1fr;
  height: 100vh;
}

.nav { grid-column: 1 / -1; }                /* Spans full width */
.sidebar-left { grid-column: 1; grid-row: 2 / -1; }
.main-content { grid-column: 2; grid-row: 2 / -1; }
.sidebar-right { grid-column: 3; grid-row: 2 / -1; }
```

**Left sidebar (280px, .sidebar-left):**
- Fixed width
- Scrollable agent + project list
- `.agent-item` and `.project-item` with hover/active states
- Active item: background var(--c-s2), border var(--c-accent)
- Badge count: 20px circle, background var(--c-accent), centered count

**Center canvas (1fr, .main-content):**
- Chat or Tasks view fills available space
- Same internal structure as mobile (user msg pinned, agent steps, history, input)
- Message bubbles max-width 60% (narrower to feel less stretched)

**Right sidebar (320px, .sidebar-right):**
- Fixed width
- Scrollable activity feed
- `.sidebar-right-section` groups (Recent, @Mentions, Updates)
- `.activity-item` with type label, title, brief description
- Styling: background var(--c-s1), border var(--c-border), border-radius 8px

---

## Responsive Design Cascade

**File load order (mobile-first):**

1. `tokens.css` — Design tokens (colors, typography, spacing, animations)
2. `mobile.css` — 390px base styles (single column, no sidebars, full-width flex)
3. `desktop.css` — @media (min-width: 1440px) overrides (three-column grid, sidebars visible)

**Why this order:**
- Mobile styles are the foundation (90% of users, simplest layout)
- Desktop overrides are additive (flex → grid, hide sidebars → show sidebars)
- No mobile-specific media queries needed (mobile is default)
- Smaller CSS payload for mobile devices (only load desktop grid rules if viewport matches)

**Breakpoint strategy:**
- `390px`: Base mobile width (minimum viable viewport)
- `768px`: Tablet landscape (flex layout, slight spacing increases)
- `1440px`: Desktop (grid, sidebars, full three-column)
- Future: `2560px` for ultra-wide (not yet defined)

---

## New Design Primitives (CV4 Additions)

### 1. User Message Pinned to Top

**Problem:** In CV3, user messages scroll naturally in the message list. If user is scrolled far down in history, they can't see their own message, making the chat feel disconnected.

**Solution:** User message always appears at viewport top (below nav), with agent steps below it, and scrollable history below that.

**Implementation:**

```html
<div class="chat-container">
  <div class="user-message-pinned">
    <div class="avatar">P</div>
    <div class="message-bubble">Hey Elon, what's the status on the brand refresh?</div>
    <span class="message-timestamp">2m ago</span>
  </div>
  
  <div class="agent-reply-chain">
    <div class="step-item">
      <span class="step-indicator in_progress"></span>
      <span class="step-text">Reading the brand's CONTEXT</span>
    </div>
  </div>
  
  <div class="chat-history">
    <!-- scrollable older messages -->
  </div>
</div>
```

**CSS:**
```css
.user-message-pinned {
  flex: 0 0 auto;              /* Never shrinks */
  padding: var(--sp-lg);
  background: var(--c-s1);
  border-bottom: 1px solid var(--c-border);
  display: flex;
  gap: var(--sp-md);
  align-items: flex-start;
}

.message-bubble {
  flex: 1;
  background: #60A5FA;         /* Elon blue */
  color: white;
  border-radius: 12px;
  padding: var(--sp-md) var(--sp-lg);
}

.agent-reply-chain {
  flex: 0 0 auto;              /* Never shrinks */
  padding: var(--sp-lg);
  background: var(--c-bg2);
  gap: var(--sp-md);
  display: flex;
  flex-direction: column;
}

.step-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--c-accent);
  flex-shrink: 0;
}

.step-indicator.in_progress {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.chat-history {
  flex: 1;
  overflow-y: auto;            /* Scrollable */
  display: flex;
  flex-direction: column-reverse;
}
```

**Advantage:**
- User always sees their latest request at top
- Agent steps (thinking, reading, queuing) appear clearly below
- Chat history below that is discoverable but not blocking
- Works on mobile and desktop

### 2. Three-Column Desktop Layout

**Problem:** Mobile-stretched dashboards feel cluttered on desktop. 1440px width with single column wastes space.

**Solution:** Three fixed-width sidebars (left agents/projects, right activity) with center canvas.

**Dimensions:**
- Left sidebar: 280px (agent + project list)
- Center canvas: 1fr (flexible, grows to available space)
- Right sidebar: 320px (activity feed)
- Total: 280 + 1fr + 320 = ~1600px minimum (comfortable on 1440px+ screens)

**Implementation:**
```css
@media (min-width: 1440px) {
  .page {
    display: grid;
    grid-template-columns: 280px 1fr 320px;
    grid-template-rows: auto 1fr;
    grid-template-areas:
      "nav nav nav"
      "sidebar main activity";
  }
  
  .nav { grid-area: nav; }
  .sidebar-left { 
    grid-area: sidebar;
    display: flex;              /* Show instead of none */
  }
  .main-content { grid-area: main; }
  .sidebar-right { 
    grid-area: activity;
    display: flex;              /* Show instead of none */
  }
}

.sidebar-left,
.sidebar-right {
  flex-direction: column;
  background: var(--c-bg);
  border-right: 1px solid var(--c-border);
  overflow-y: auto;
  scrollbar-width: thin;
}

.agent-item,
.project-item {
  padding: var(--sp-md) var(--sp-lg);
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: background 0.15s;
}

.agent-item:hover,
.project-item:hover {
  background: var(--c-s1);
}

.agent-item.active,
.project-item.active {
  background: var(--c-s2);
  border-left-color: var(--c-accent);
}
```

**Advantage:**
- Quick navigation via left sidebar (no scroll back to top)
- Real-time activity visible on right (no context switching)
- Center canvas feels "native" to desktop (not stretched mobile)
- Scales beautifully to wide monitors (2560px+)

---

## Component Mapping (CV3 → CV4 React Conversion)

When converting to React, preserve these components as-is and wire them to CV4 HTML structures:

### Navigation Components

| CV3 Component | File | CV4 HTML | Conversion Task |
|---|---|---|---|
| AomLogo | components/AomLogo.jsx | `.nav-logo` | Replace placeholder with import; pass no props |
| WorldSelector | components/WorldSelector.jsx | `.world-selector` | Bind currentWorldId, onEnterWorld, onReturnToMyWorld props |
| GlobalCallButton | components/GlobalCallButton.jsx | `.action-btn.call` | Bind onClick to open floating call bar |
| BellIcon | components/BellIcon.jsx | `.action-btn.bell` | Bind count prop, onClick to toggle notif panel |
| NotificationsPanel | components/NotificationsPanel.jsx | Popup below bell | Keep modal structure, bind items + handlers |
| PhoneRecordingOverlay | components/PhoneRecordingOverlay.jsx | Overlay modal | Keep position:fixed structure, bind telephone state |
| UserAvatar | components/UserAvatar.jsx | `.action-btn.avatar` | Bind user + onUserUpdate |
| Tab | components/Tab.jsx | `.nav-row2 .tab` | Keep active underline, bind onClick |
| Badge | components/Badge.jsx | `.tab-badge` | Bind count prop, optional color prop |

### Chat Panel Components

| CV3 Component | File | CV4 HTML | Conversion Task |
|---|---|---|---|
| ChatPanel | components/ChatPanel.jsx | `.main-content` | Wrap .user-message-pinned + .agent-reply-chain + .chat-history |
| Message | components/Message.jsx | `.message-group` | Preserve flex-end/flex-start logic for user/agent |
| UserMessage | (within Message) | `.user-message-pinned` | Separate component; always visible at top |
| AgentReplyChain | (new) | `.agent-reply-chain` | Create new component; render live steps with pulse animation |
| StepItem | (new) | `.step-item` | Create new component; show step indicator + text |
| MessageInput | components/MessageInput.jsx | `.input-bar` | Preserve rounded pill styling, keep actions layout |
| CommandsModal | components/CommandsModal.jsx | `.commands-modal` | Keep position/styling, bind skillsData |

### Tasks Panel Components

| CV3 Component | File | CV4 HTML | Conversion Task |
|---|---|---|---|
| TasksPanel | components/TasksPanel.jsx | `.main-content` | Wrap .tasks-greeting + .tasks-container |
| ProjectCard | components/ProjectCard.jsx | `.project-card` | Preserve card styling; add .active class on hover |
| StatusBadge | components/StatusBadge.jsx | `.status-badge` | Bind status prop, map to color + label |

### Layout Components

| CV3 Component | File | CV4 HTML | Conversion Task |
|---|---|---|---|
| CornerV3 (root) | CornerV3.jsx | `.page` | Refactor to three-column grid layout; wrap content |
| Layout wrapper | (new) | `.page` | Create new component for grid + sidebar logic |
| SidebarLeft | (new) | `.sidebar-left` | Create new component; render agent + project list |
| SidebarRight | (new) | `.sidebar-right` | Create new component; render activity feed |

### Overlays & Modals

| CV3 Component | File | CV4 HTML | Conversion Task |
|---|---|---|---|
| FloatingCallBar | components/FloatingCallBar.jsx | `.floating-call-bar` | Preserve styling; bind to live call state |
| TaskCompletionToast | components/TaskCompletionToast.jsx | `.toast` | Keep position + auto-dismiss; bind message prop |

---

## Step-by-Step React Conversion Guide

### Phase 1: Scaffold (1 day)

1. Create new `CornerV4.jsx` in `src/dashboard/`
2. Copy layout structure from `index.html` (.page, .nav, sidebars, main-content)
3. Import all three CSS files (tokens.css, mobile.css, desktop.css)
4. Create new components: LayoutGrid, SidebarLeft, SidebarRight, AgentReplyChain
5. Wrap existing ChatPanel + TasksPanel components in new layout
6. Verify three-column grid renders on desktop, single column on mobile

### Phase 2: Navigation (1 day)

1. Bind AomLogo, WorldSelector, GlobalCallButton to real components
2. Bind BellIcon + NotificationsPanel (audit NotificationsPanel.jsx styling first)
3. Bind PhoneRecordingOverlay
4. Bind UserAvatar
5. Verify all nav buttons functional

### Phase 3: Chat Panel (1.5 days)

1. Create UserMessagePinned component (always at top)
2. Create AgentReplyChain + StepItem components (live steps with pulse animation)
3. Refactor ChatPanel to use new .user-message-pinned structure
4. Ensure message list is column-reverse (newest at bottom)
5. Test message flow on mobile + desktop

### Phase 4: Sidebars (1 day)

1. Create SidebarLeft component (agent + project list)
2. Fetch current agents + projects from Supabase
3. Bind active state on click (highlight with accent border)
4. Create SidebarRight component (activity feed)
5. Fetch recent activity from Supabase

### Phase 5: Polish (1 day)

1. Verify responsive behavior: mobile (390px), tablet (768px), desktop (1440px)
2. Check all animations (pulse on step, fade on overlays, transitions on hover)
3. Test scroll behavior: sidebars auto-scroll, chat-history preserves position
4. Verify token usage (all colors, spacing, typography from tokens.css)
5. Final QA: no console errors, no missing imports

---

## Open Questions for Dev Team

1. **User message refresh:** Should the user message update if the original message edits? Or is it "pinned until next message sent"?

2. **Agent step chain persistence:** When new user message arrives, should prior step chain scroll into history? Or keep it visible for 30s after completion before removing?

3. **Right sidebar activity feed:** Real-time (new activity appears instantly) or manual refresh (user clicks "check updates")? Suggest real-time via Supabase realtime subscriptions.

4. **Sidebar active state:** When user clicks agent/project in left sidebar, should it switch the main chat view immediately OR open a modal/drawer first? Suggest immediate switch for speed.

6. **Left sidebar agent list:** Fixed height with scroll, or flex to content height? If many agents (50+), scroll is better. Suggest fixed height + auto-scroll to active agent.

---

## Verification Checklist (Before Dev Start)

- [ ] index.html opens in Chrome and shows demo views (chat, tasks, commands)
- [ ] Mobile view (390px) is single column, sidebars hidden
- [ ] Desktop view (1440px) is three-column, sidebars visible
- [ ] Responsive resize: stretch browser from 390px to 1440px, layout updates smoothly
- [ ] Animations work: step indicator pulses on in-progress, messages fade in, overlays fade out
- [ ] All token colors used correctly (no hardcoded hex values in CSS)
- [ ] Typography scale applied: headings var(--fs-2xl), body var(--fs-md), labels var(--fs-sm)
- [ ] No console errors on load
- [ ] Input bar rounded pill styling visible
- [ ] User message pinned to top (not scrolling)
- [ ] Agent steps render below user message
- [ ] Chat history scrollable below steps

---

## Files & Paths (Quick Reference)

```
/aom-studio/src/dashboard/cv4-explore/
├── index.html                                # Master entry point
├── styles/
│   ├── tokens.css                            # Design tokens (colors, typography, spacing, layout)
│   ├── mobile.css                            # 390px mobile-first base
│   └── desktop.css                           # 1440px desktop + 768px tablet overrides
└── HANDOFF.md                                # This document

Related CV3 files (reference):
├── CornerV3.jsx                              # Current dashboard (to be preserved as fallback)
├── components/
│   ├── ChatPanel.jsx                         # Chat container (reuse in V4)
│   ├── TasksPanel.jsx                        # Tasks container (reuse in V4)
│   ├── AomLogo.jsx
│   ├── WorldSelector.jsx
│   ├── BellIcon.jsx
│   ├── NotificationsPanel.jsx
│   ├── PhoneRecordingOverlay.jsx
│   ├── UserAvatar.jsx
│   ├── Tab.jsx
│   ├── Badge.jsx
│   ├── Message.jsx
│   ├── MessageInput.jsx
│   ├── CommandsModal.jsx
│   ├── ProjectCard.jsx
│   ├── StatusBadge.jsx
│   ├── GlobalCallButton.jsx
│   ├── FloatingCallBar.jsx
│   └── TaskCompletionToast.jsx
└── utilities/
    └── (color, theme, data providers)
```

---

## How to Test Locally

```bash
cd /aom-studio/src/dashboard/cv4-explore
python3 -m http.server 8765

# Then open in Chrome:
# http://localhost:8765/index.html
```

**Demo flow:**
1. Load page, see demo welcome message
2. Click "Chat Demo" link → view 1:1 conversation (user pinned, agent steps, history)
3. Click "Tasks Demo" → view project cards with status badges
4. Resize browser window 390px → 1440px, observe responsive layout

---

## Next Steps (Post-Handoff)

1. **Dev team:** Scaffold CornerV4.jsx with new layout grid
2. **Dev team:** Bind navigation components (AomLogo, WorldSelector, etc.)
3. **Dev team:** Create AgentReplyChain + StepItem components
4. **Dev team:** Refactor ChatPanel for user-pinned-to-top architecture
5. **Dev team:** Create SidebarLeft + SidebarRight components with Supabase data
6. **Dev team:** Test responsive behavior on real devices
8. **Dev team:** Deploy to Vercel, confirm live
9. **Archive:** Move cv4-explore to `src/dashboard/cv4-archive/` once V4 is live in production

---

## Design Principles (For Future Changes)

1. **Mobile-first:** Default to 390px layout, extend up to desktop. Never mobile-stretch.
2. **Token-driven:** All colors, spacing, typography from tokens.css. No hardcoded hex.
3. **User context:** User's latest message always visible at viewport top. History below.
4. **Real-time feedback:** Agent steps show immediately (in-progress pulse → done).
5. **Accessible:** Focus states on all interactive elements, WCAG AA contrast (4.5:1 text, 3:1 headings).
6. **Responsive:** Test at 390px, 768px, 1440px, 2560px before shipping.
7. **Anti-Claude defaults:** No gradient hero text, no unauthorized glassmorphism, no default Inter, no pastel cards, no AI-marble textures. This is a serious tool.

---

**Handoff prepared by:** Steffen (design agent)  
**Date:** 2026-05-04  
**Ready for dev team.** No remaining blockers. Static prototype is a faithful foundation for React conversion.
