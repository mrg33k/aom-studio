import { useEffect, useRef } from 'react'
import { C, agentColors } from '../../lib/cv3Colors.js'
import { formatChatTime } from './shared.jsx'

export default function NotificationsPanel({ items, agents, onSelectAgent, onMarkAllRead, onClose }) {
  const panelRef = useRef(null)

  useEffect(() => {
    function handlePointerDown(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [onClose])

  const agentMap = {}
  for (const a of (agents || [])) {
    if (a.slug) agentMap[a.slug] = a
  }

  return (
    <div ref={panelRef} data-cv4-notifications style={{
      position: 'absolute',
      top: 'calc(100% + 8px)',
      right: 0,
      width: 300,
      background: C.s1,
      border: '1px solid ' + C.border2,
      borderRadius: 14,
      boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
      zIndex: 500,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px 10px',
        borderBottom: '1px solid ' + C.border,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
          Notifications
        </span>
        {items.length > 0 && (
          <button
            onClick={onMarkAllRead}
            style={{
              background: 'none', border: 'none',
              fontSize: 11, fontWeight: 600, color: C.accent2,
              cursor: 'pointer', padding: 0, fontFamily: "'Inter', sans-serif",
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div style={{ maxHeight: 360, overflowY: 'auto', padding: '4px 0' }}>
        {items.length === 0 ? (
          <div style={{
            padding: '22px 14px',
            textAlign: 'center',
            fontSize: 12, color: C.muted,
            fontFamily: "'Inter', sans-serif",
          }}>
            All caught up
          </div>
        ) : items.map(item => {
          const agent = agentMap[item.agent]
          const color = agentColors[item.agent] || C.accent
          return (
            <button
              key={item.id || item.agent}
              onClick={() => { onSelectAgent(agent || { slug: item.agent, name: item.agent }); onClose() }}
              style={{
                width: '100%', textAlign: 'left',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '9px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.s2 }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: color, flexShrink: 0, marginTop: 5,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 6,
                }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: C.text,
                    fontFamily: "'Inter', sans-serif",
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {agent?.name || item.agent} replied
                  </span>
                  <span style={{
                    fontSize: 10, color: C.muted,
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                  }}>
                    {formatChatTime(item.timestamp)}
                  </span>
                </div>
                <div style={{
                  fontSize: 11, color: C.text2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: "'Inter', sans-serif",
                  marginTop: 2,
                }}>
                  {item.text}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
