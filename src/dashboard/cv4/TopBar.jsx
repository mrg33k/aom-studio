// CV4 TopBar — editorial breadcrumb + Tasks pill + avatar.
// Voice / phone / bell collapsed into an overflow popover so the bar reads quiet.

import { useState, useRef, useEffect } from 'react'
import { useCornerAuth, useCornerData, useCornerNav } from '../CornerContext.jsx'
import UserAvatar from '../components/cv3/UserAvatar.jsx'
import GlobalCallButton from '../components/cv3/voice/GlobalCallButton.jsx'
import NotificationsPanel from '../components/cv3/NotificationsPanel.jsx'

function MoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function TasksIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

export default function TopBar({
  onTogglePhoneRecording,
  isPhoneRecording,
  isPhoneTranscribing,
  onToggleRightRail,
  rightRailOpen,
  activeTaskCount,
}) {
  const { currentUser, worldId } = useCornerAuth()
  const { agents = [], inboxItems = [] } = useCornerData()
  const { selectedAgent, conversationTarget, handleSelectAgent } = useCornerNav()
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifReadAt, setNotifReadAt] = useState({})
  const overflowRef = useRef(null)
  const notifRef = useRef(null)

  // Click outside to close
  useEffect(() => {
    function onDocClick(e) {
      if (overflowOpen && overflowRef.current && !overflowRef.current.contains(e.target)) {
        setOverflowOpen(false)
      }
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [overflowOpen, notifOpen])

  const notifItems = (inboxItems || []).filter((item) =>
    item.agent && (!notifReadAt[item.agent] || item.timestamp > notifReadAt[item.agent])
  )

  const conversationLabel = conversationTarget?.name || selectedAgent?.name || 'Home'

  return (
    <header data-testid="cv4-topbar" className="cv4-topbar">
      {/* Breadcrumb — workspace dot + italic display title */}
      <div className="cv4-topbar__crumb">
        <span className="cv4-topbar__world">{worldId || '...'}</span>
        <span className="cv4-topbar__sep" />
        <span className="cv4-topbar__title">{conversationLabel}</span>
      </div>

      {/* Actions */}
      <div className="cv4-topbar__actions">
        {/* Tasks pill (primary, sticks around) */}
        <button
          onClick={onToggleRightRail}
          data-testid="cv4-toggle-rail"
          data-open={rightRailOpen ? 'true' : 'false'}
          className="cv4-tasks-pill"
          title={rightRailOpen ? 'Hide tasks' : 'Show tasks'}
        >
          <TasksIcon />
          <span>Tasks</span>
          {activeTaskCount > 0 && (
            <span className="cv4-tasks-pill__count">{activeTaskCount}</span>
          )}
        </button>

        {/* Voice — live call (component renders its own surface) */}
        <GlobalCallButton />

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="cv4-iconbtn"
            aria-label="Notifications"
          >
            <BellIcon />
            {notifItems.length > 0 && (
              <span className="cv4-iconbtn__badge">
                {notifItems.length > 99 ? '99+' : notifItems.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <NotificationsPanel
              items={notifItems}
              agents={agents}
              onSelectAgent={(agent) => {
                handleSelectAgent(agent)
                setNotifOpen(false)
                if (agent?.slug) {
                  setNotifReadAt((prev) => ({ ...prev, [agent.slug]: new Date().toISOString() }))
                }
              }}
              onMarkAllRead={() => {
                const now = new Date().toISOString()
                setNotifReadAt((prev) => {
                  const next = { ...prev }
                  for (const item of notifItems) next[item.agent] = now
                  return next
                })
                setNotifOpen(false)
              }}
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>

        {/* Overflow — phone recording + future actions */}
        <div className="relative" ref={overflowRef}>
          <button
            onClick={() => setOverflowOpen((o) => !o)}
            className="cv4-iconbtn"
            data-active={overflowOpen ? 'true' : 'false'}
            data-recording={isPhoneRecording ? 'true' : 'false'}
            aria-label="More actions"
          >
            <MoreIcon />
          </button>
          {overflowOpen && (
            <div className="cv4-popover" role="menu">
              <button
                role="menuitem"
                className="cv4-popover__item"
                onClick={() => {
                  setOverflowOpen(false)
                  onTogglePhoneRecording()
                }}
                disabled={isPhoneTranscribing}
              >
                <span className="cv4-popover__item__icon">
                  <PhoneIcon />
                </span>
                <span>{isPhoneRecording ? 'Stop recording' : 'Record a call'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Avatar */}
        <UserAvatar user={currentUser} />
      </div>
    </header>
  )
}
