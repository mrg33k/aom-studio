import { useState, useEffect } from 'react'
import { C } from '../../../lib/cv3Colors.js'

// Get time-of-day bucket (5am boundaries)
function getTimeOfDay() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 22) return 'evening'
  return 'night'
}

function getHeaderText(timeOfDay) {
  const headers = {
    morning: "Morning, Patrik. Here's what's open.",
    afternoon: 'Back at it, Patrik. Few things waiting.',
    evening: "Evening, Patrik. Let's close these out.",
    night: 'Still here, Patrik? Couple quick ones waiting.',
  }
  return headers[timeOfDay] || headers.afternoon
}

export default function CutsceneOverlay({ items = [], onAction, onClose }) {
  const [visibleItems, setVisibleItems] = useState(items)
  const [minimized, setMinimized] = useState(false)
  const timeOfDay = getTimeOfDay()

  useEffect(() => {
    setVisibleItems(items)
  }, [items])

  // Remove item from visible list (animate out)
  const handleAction = async (itemId, actionType) => {
    setVisibleItems(prev => prev.filter(item => item.id !== itemId))
    if (onAction) {
      await onAction(itemId, actionType)
    }
  }

  // Close overlay if no items left
  useEffect(() => {
    if (visibleItems.length === 0 && items.length > 0) {
      setTimeout(() => onClose?.(), 300)
    }
  }, [visibleItems, items, onClose])

  if (visibleItems.length === 0) return null

  // Minimized state: show status row
  if (minimized) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 250,
        padding: '8px 16px',
        background: `linear-gradient(to bottom, ${C.bg}, rgba(17,24,39,0.7))`,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 1200,
          margin: '0 auto',
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: C.text2,
            fontFamily: "'Inter', sans-serif",
          }}>
            {visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'} waiting
          </span>
          <button
            onClick={() => setMinimized(false)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              background: 'rgba(16,185,129,0.1)',
              border: `1px solid rgba(16,185,129,0.2)`,
              borderRadius: 6,
              color: C.accent,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(16,185,129,0.15)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(16,185,129,0.1)'
            }}
          >
            Expand
          </button>
        </div>
      </div>
    )
  }

  // Full overlay
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setMinimized(true)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 240,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Overlay container */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 500,
          background: C.s1,
          border: `1px solid ${C.border2}`,
          borderRadius: 20,
          boxShadow: '0 20px 64px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 20px 16px',
            borderBottom: `1px solid ${C.border}`,
          }}>
            <span style={{
              fontSize: 16,
              fontWeight: 600,
              color: C.text,
              fontFamily: "'Inter', sans-serif",
            }}>
              {getHeaderText(timeOfDay)}
            </span>
            <button
              onClick={() => setMinimized(true)}
              title="Minimize"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'none',
                border: `1px solid ${C.border2}`,
                color: C.muted,
                cursor: 'pointer',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `rgba(255,255,255,0.05)`
                e.currentTarget.style.borderColor = C.border
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.borderColor = C.border2
              }}
            >
              ×
            </button>
          </div>

          {/* Items scroll container */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
          }}>
            {visibleItems.map((item, idx) => (
              <CutsceneItem
                key={item.id}
                item={item}
                onAction={handleAction}
                isLast={idx === visibleItems.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function CutsceneItem({ item, onAction, isLast }) {
  const projectName = item.metadata?.project_name || 'Unknown Project'
  const preview = item.text?.substring(0, 80) || 'Waiting for input'

  return (
    <div style={{
      padding: '12px',
      marginBottom: isLast ? 0 : '8px',
      background: C.s2,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      animation: 'slideIn 0.3s ease-out',
    }}>
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Item header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: '10px',
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(16,185,129,0.1)',
          border: `1px solid rgba(16,185,129,0.2)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: C.accent }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: C.text,
            fontFamily: "'Inter', sans-serif",
            marginBottom: '2px',
          }}>
            Project: {projectName}
          </div>
          <div style={{
            fontSize: 11,
            color: C.muted,
            fontFamily: "'Inter', sans-serif",
          }}>
            Elon checking in
          </div>
        </div>
      </div>

      {/* Preview */}
      <div style={{
        fontSize: 12,
        color: C.text2,
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1.4,
        marginBottom: '12px',
        paddingLeft: '42px',
      }}>
        {preview}
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        paddingLeft: '42px',
      }}>
        <button
          onClick={() => onAction(item.id, 'archive')}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 600,
            background: 'rgba(239,68,68,0.1)',
            border: `1px solid rgba(239,68,68,0.2)`,
            borderRadius: 8,
            color: '#EF4444',
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: "'Inter', sans-serif",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
          }}
        >
          Archive
        </button>
        <button
          onClick={() => onAction(item.id, 'tell_more')}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 600,
            background: 'rgba(16,185,129,0.1)',
            border: `1px solid rgba(16,185,129,0.2)`,
            borderRadius: 8,
            color: C.accent,
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: "'Inter', sans-serif",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(16,185,129,0.15)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(16,185,129,0.1)'
          }}
        >
          Tell me more
        </button>
        <button
          onClick={() => onAction(item.id, 'leave_it')}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 600,
            background: 'rgba(107,114,128,0.1)',
            border: `1px solid rgba(107,114,128,0.2)`,
            borderRadius: 8,
            color: C.text2,
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: "'Inter', sans-serif",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(107,114,128,0.15)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(107,114,128,0.1)'
          }}
        >
          Leave it
        </button>
      </div>
    </div>
  )
}
