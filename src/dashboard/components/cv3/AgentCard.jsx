// AgentCard -- conversation list card for agents
// Extracted from CornerV3.jsx
import { useState, useRef, useEffect } from 'react'
import { C, agentColors } from '../../lib/cv3Colors.js'
import { formatChatTime } from './shared.jsx'

export default function AgentCard({ agent, lastMessage, unreadCount, onClick, isSelected, onCustomize, isPinned, isMuted, onTogglePin, onToggleMute, onRename }) {
  const [hovered, setHovered] = useState(false)
  const [ctxMenu, setCtxMenu] = useState(null)
  const cardRef = useRef(null)
  const menuBtnRef = useRef(null)
  const bgColor = agent.color || agentColors[agent.slug] || '#60A5FA'
  const agentPhoto = agent.sprite_path && agent.sprite_path.startsWith('http') ? agent.sprite_path : null
  const initial = (agent.name || '?')[0].toUpperCase()
  const statusUpper = agent.status?.toUpperCase()
  const statusColor = statusUpper === 'IDLE' ? C.dim : statusUpper === 'BUILDING' ? C.yellow : C.accent
  const statusLabel = statusUpper === 'IDLE' ? 'Idle' : statusUpper === 'BUILDING' ? 'Building' : 'Online'
  const statusGlow = statusUpper === 'BUILDING' ? '0 0 6px rgba(234,179,8,0.5)' : 'none'

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return
    const handler = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) setCtxMenu(null)
    }
    document.addEventListener('click', handler)
    document.addEventListener('touchstart', handler, { passive: true })
    return () => { document.removeEventListener('click', handler); document.removeEventListener('touchstart', handler) }
  }, [ctxMenu])

  const openMenu = (x, y) => {
    setCtxMenu({ x, y })
  }

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        // Don't navigate if they clicked the menu button
        if (menuBtnRef.current?.contains(e.target)) return
        onClick?.(agent)
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        openMenu(e.clientX, e.clientY)
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 14,
        background: hovered ? C.s2 : C.s1,
        border: `1px solid ${hovered ? C.border2 : isSelected ? 'rgba(16,185,129,0.15)' : C.border}`,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'visible',
        transition: 'background 150ms ease, border-color 150ms ease, transform 120ms ease, box-shadow 120ms ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? '0 6px 20px rgba(0,0,0,0.25)' : 'none',
      }}
    >
      {/* Active accent left bar */}
      {isSelected && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: C.accent }} />
      )}

      {/* 38px circle avatar -- shows photo or color initial */}
      <div style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: agentPhoto ? 'transparent' : bgColor,
        border: agentPhoto ? '1px solid rgba(255,255,255,0.1)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontWeight: 800,
        fontSize: 15,
        color: '#000',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
      }}>
        {agentPhoto
          ? <img src={agentPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initial
        }
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: ctxMenu.y,
            left: ctxMenu.x,
            background: C.s1,
            border: `1px solid ${C.border2}`,
            borderRadius: 10,
            padding: 4,
            zIndex: 99999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: 160,
          }}
        >
          {[
            { label: 'Rename', action: () => { setCtxMenu(null); onRename?.(agent) } },
            { label: isPinned ? 'Unpin' : 'Pin to top', action: () => { setCtxMenu(null); onTogglePin?.(agent) } },
            { label: isMuted ? 'Unmute' : 'Mute', action: () => { setCtxMenu(null); onToggleMute?.(agent) } },
            null,
            { label: 'Change photo', action: () => { setCtxMenu(null); onCustomize?.(agent, 'photo') } },
            { label: 'Generate avatar', action: () => { setCtxMenu(null); onCustomize?.(agent, 'generate') } },
            { label: 'Change color', action: () => { setCtxMenu(null); onCustomize?.(agent, 'color') } },
            null,
            { label: 'Archive', action: () => { setCtxMenu(null); onCustomize?.(agent, 'archive') } },
          ].map((item, idx) => !item ? (
            <div key={`d${idx}`} style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 8px' }} />
          ) : (
            <button key={item.label} onClick={item.action} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '7px 10px',
              background: 'transparent', border: 'none', borderRadius: 6,
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              color: C.text2, fontFamily: "'Inter', sans-serif",
              textAlign: 'left', transition: 'background 0.1s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = C.s2 }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >{item.label}</button>
          ))}
        </div>
      )}

      {/* Info: name + preview */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
            {agent.name}
          </span>
          {lastMessage?.timestamp && (
            <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
              {formatChatTime(lastMessage.timestamp)}
            </span>
          )}
        </div>
        <div style={{
          fontSize: 12,
          color: C.muted,
          marginTop: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: "'Inter', sans-serif",
        }}>
          {lastMessage?.text || agent.role || 'No recent messages'}
        </div>
      </div>

      {/* Right: status + unread count */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3,
          fontSize: 9, fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          color: statusColor,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: statusColor,
            boxShadow: statusGlow,
          }} />
          {statusLabel}
        </div>
        {unreadCount > 0 && (
          <div style={{
            minWidth: 18, height: 18, borderRadius: 9,
            background: C.accent, color: '#000',
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '0 4px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </div>

      {/* menu button -- always visible, right edge */}
      <button
        ref={menuBtnRef}
        onClick={(e) => {
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          openMenu(rect.left - 120, rect.bottom + 4)
        }}
        style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: ctxMenu ? 'rgba(255,255,255,0.08)' : 'transparent',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hovered || ctxMenu ? 1 : 0.5,
          transition: 'opacity 0.15s, background 0.1s',
          padding: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
          <circle cx="12" cy="5" r="1.5" fill={C.muted}/><circle cx="12" cy="12" r="1.5" fill={C.muted}/><circle cx="12" cy="19" r="1.5" fill={C.muted}/>
        </svg>
      </button>
    </div>
  )
}
