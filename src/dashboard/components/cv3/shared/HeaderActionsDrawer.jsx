// HeaderActionsDrawer -- R46 (2026-04-22 session 18), rearranged R60 (session 20).
//
// Consolidates every secondary action icon in a chat header into a single
// drawer button on the right that expands LEFTWARD. One style, one layout,
// every chat surface.
//
// R60 (session 20): phone icon moves INTO the drawer (no longer a primary
// outside slot); context meter moves OUTSIDE the drawer via the new
// `outsideWhenClosed` slot, which renders only when the drawer is closed.
// The outside slot is the only always-on indicator the user glances at;
// everything else is an action and lives inside the drawer (VISION
// "drawer-vs-outside split: phone inside, context meter outside").
//
// Usage:
//   <HeaderActionsDrawer
//     testid="thread-header-drawer"
//     outsideWhenClosed={<ContextFullnessMeter agentSlug={...} />}
//   >
//     <button>...</button>
//   </HeaderActionsDrawer>
//
// Testid contract:
//   [data-testid="<testid>"] on the drawer container
//   [data-testid="<testid>-toggle"] on the toggle button
//   [data-testid="<testid>-tray"] on the expanded action tray (only present
//                                 when open)
//   [data-testid="<testid>-outside"] on the outside-when-closed wrapper
//                                 (only present when closed + outside given)
//   [data-open] reflects the open/closed state on the container.

import { useEffect, useRef, useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'

export default function HeaderActionsDrawer({ testid, children, title = 'Actions', outsideWhenClosed = null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onEsc(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div
      ref={ref}
      data-testid={testid}
      data-open={open ? 'true' : 'false'}
      style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
    >
      {open && (
        <div
          data-testid={testid ? `${testid}-tray` : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            paddingRight: 4,
            animation: 'cornerDrawerSlide 140ms ease-out',
          }}
        >
          {children}
        </div>
      )}
      {!open && outsideWhenClosed && (
        <div
          data-testid={testid ? `${testid}-outside` : undefined}
          style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          {outsideWhenClosed}
        </div>
      )}
      <button
        data-testid={testid ? `${testid}-toggle` : undefined}
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close actions' : title}
        aria-label={open ? 'Close actions' : title}
        aria-expanded={open ? 'true' : 'false'}
        style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: open ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
          color: open ? C.text : C.muted,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {open ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="19" cy="12" r="1.7" />
          </svg>
        )}
      </button>
      <style>{`
        @keyframes cornerDrawerSlide {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
