// CV4 ContextNav — second navigation row.
//
// Layout: [hamburger] + [context title]  ·  [Chat | Tasks toggle]  ·  [right slot]
//
// Replaces the old in-thread ThreadHeader on /cv4. The hamburger sits where
// the back-arrow used to live; the context title shows the current agent
// or project; the Chat/Tasks toggle moves down from the very top into this
// row per Patrik's 2026-05-13 direction.
//
// R5.1 Phase F.

import { C } from '../lib/cv3Colors.js'
import { Badge, Tab } from '../components/cv3/shared.jsx'
import { ChatIcon, TasksIcon } from '../components/cv3/icons.jsx'

export default function CV4ContextNav({
  tab,
  onSwitchTab,
  unreadChat = 0,
  activeTaskCount = 0,
  drawerOpen,
  onToggleDrawer,
  selectedAgent,
  conversationTarget,
}) {
  // Context title resolution
  let title = 'Home'
  let titleColor = C.text
  let dotColor = null
  if (tab === 'tasks') {
    title = conversationTarget?.type === 'project' ? conversationTarget.name : 'Tasks'
    dotColor = conversationTarget?.type === 'project' ? (conversationTarget.color || C.yellow) : null
  } else if (selectedAgent) {
    title = selectedAgent.name
    dotColor = selectedAgent.color || C.accent
  } else if (conversationTarget?.type === 'project') {
    title = conversationTarget.name
    dotColor = conversationTarget.color || C.blue
  }

  return (
    <div
      data-cv4-context-nav
      style={{
        width: '100%',
        flexShrink: 0,
        background: C.bg,
        borderBottom: '1px solid ' + C.border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 99,
      }}
    >
      {/* LEFT: hamburger + context title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '0 1 auto' }}>
        <button
          data-testid="cv4-context-drawer-toggle"
          onClick={onToggleDrawer}
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: drawerOpen ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${drawerOpen ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: drawerOpen ? C.accent : C.muted,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {dotColor && (
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: dotColor, flexShrink: 0,
          }} />
        )}
        <span style={{
          fontSize: 14, fontWeight: 600, color: titleColor,
          fontFamily: "'Inter', sans-serif",
          letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</span>
      </div>

      {/* CENTER: Chat | Tasks toggle */}
      <div style={{ display: 'flex', gap: 2 }}>
        <Tab
          label="Chat"
          icon={<ChatIcon color={tab === 'chat' ? C.text : C.muted} />}
          active={tab === 'chat'}
          onClick={() => onSwitchTab('chat')}
          badge={<Badge count={unreadChat} />}
        />
        <Tab
          label="Tasks"
          icon={<TasksIcon color={tab === 'tasks' ? C.text : C.muted} />}
          active={tab === 'tasks'}
          onClick={() => onSwitchTab('tasks')}
          badge={<Badge count={activeTaskCount} color={C.yellow} />}
        />
      </div>

      {/* RIGHT: reserved (chat-specific actions, when needed) */}
      <div style={{ width: 30, flexShrink: 0 }} />
    </div>
  )
}
