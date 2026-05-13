// CV4 TopBar — thin breadcrumb + actions row above the chat surface.

import { useState } from 'react'
import { useCornerAuth, useCornerData, useCornerNav } from '../CornerContext.jsx'
import UserAvatar from '../components/cv3/UserAvatar.jsx'
import GlobalCallButton from '../components/cv3/voice/GlobalCallButton.jsx'
import NotificationsPanel from '../components/cv3/NotificationsPanel.jsx'

function BellButton({ count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative flex size-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02] text-aom-text-muted transition-colors hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-aom-text-light"
      aria-label="Notifications"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex size-[18px] min-w-[18px] items-center justify-center rounded-full bg-aom-orange px-1 text-[10px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
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
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifReadAt, setNotifReadAt] = useState({})

  const notifItems = (inboxItems || []).filter((item) =>
    item.agent && (!notifReadAt[item.agent] || item.timestamp > notifReadAt[item.agent])
  )

  // Breadcrumb: worldId / conversation
  const conversationLabel = conversationTarget?.name || selectedAgent?.name || null

  return (
    <header
      data-testid="cv4-topbar"
      className="flex h-[52px] flex-shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0d111a]/80 px-5 backdrop-blur-sm"
    >
      {/* Breadcrumb */}
      <div className="flex min-w-0 items-center gap-2 text-[13px]">
        <span className="font-semibold uppercase tracking-wider text-aom-text-muted">
          {worldId || '...'}
        </span>
        {conversationLabel && (
          <>
            <span className="text-aom-text-muted/50">/</span>
            <span className="truncate font-semibold text-aom-text-light capitalize">
              {conversationLabel}
            </span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <GlobalCallButton />

        <button
          onClick={onTogglePhoneRecording}
          disabled={isPhoneTranscribing}
          title={isPhoneRecording ? 'Stop recording' : 'Phone recording'}
          className={[
            'flex size-9 items-center justify-center rounded-full border transition-colors disabled:opacity-50',
            isPhoneRecording
              ? 'border-red-500/40 bg-red-500/15 text-red-400'
              : 'border-white/[0.06] bg-white/[0.02] text-aom-text-muted hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-aom-text-light',
          ].join(' ')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>

        <div className="relative">
          <BellButton count={notifItems.length} onClick={() => setNotifOpen((o) => !o)} />
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

        <button
          onClick={onToggleRightRail}
          data-testid="cv4-toggle-rail"
          title={rightRailOpen ? 'Hide tasks' : 'Show tasks'}
          className={[
            'flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors',
            rightRailOpen
              ? 'border-aom-orange/40 bg-aom-orange/10 text-aom-orange'
              : 'border-white/[0.08] bg-white/[0.03] text-aom-text-muted hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-aom-text-light',
          ].join(' ')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Tasks
          {activeTaskCount > 0 && (
            <span className="ml-0.5 rounded bg-aom-orange/20 px-1.5 py-0.5 text-[10px] font-bold text-aom-orange">
              {activeTaskCount}
            </span>
          )}
        </button>

        <UserAvatar user={currentUser} />
      </div>
    </header>
  )
}
