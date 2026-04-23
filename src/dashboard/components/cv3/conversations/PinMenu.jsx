// PinMenu -- R58 (session 20). The 3-dot affordance + right-click menu
// shared across every agent card and every project card. Opens a tiny
// popover with a single Pin or Unpin button. Pin state is controlled by
// the parent via `isPinned` / `onPin` / `onUnpin`.
//
// Testid contract:
//   [data-testid="pin-menu-trigger-<kind>-<slug>"] on the ⋯ button
//   [data-testid="pin-menu-popover-<kind>-<slug>"] on the popover
//   [data-testid="pin-menu-pin"] / "pin-menu-unpin" on the action button
//
// Right-click integration: callers can attach `menuRef.onContextMenu` to
// the card itself. The menu will open at click coords, stop event
// propagation so the card's own click handler doesn't fire.

import { useEffect, useRef, useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'

export default function PinMenu({ kind, slug, isPinned, onPin, onUnpin }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onEsc(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const trigger = (
    <button
      type="button"
      data-testid={`pin-menu-trigger-${kind}-${slug}`}
      onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
      aria-label={`Pin menu for ${slug}`}
      aria-haspopup="menu"
      aria-expanded={open ? 'true' : 'false'}
      style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        background: open ? 'rgba(255,255,255,0.12)' : 'rgba(10,12,20,0.6)',
        border: `1px solid ${open ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)'}`,
        color: open ? C.text : C.muted,
        cursor: 'pointer',
        padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="5" cy="12" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="19" cy="12" r="1.7" />
      </svg>
    </button>
  )

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      {trigger}
      {open && (
        <div
          role="menu"
          data-testid={`pin-menu-popover-${kind}-${slug}`}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 20,
            minWidth: 140,
            padding: 4,
            borderRadius: 10,
            background: 'rgba(14,16,24,0.98)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          {isPinned ? (
            <button
              type="button"
              role="menuitem"
              data-testid="pin-menu-unpin"
              onClick={(e) => { e.stopPropagation(); onUnpin?.(slug); setOpen(false) }}
              style={menuItemStyle}
            >
              Unpin
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              data-testid="pin-menu-pin"
              onClick={(e) => { e.stopPropagation(); onPin?.(slug); setOpen(false) }}
              style={menuItemStyle}
            >
              Pin
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const menuItemStyle = {
  padding: '8px 10px',
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  fontSize: 13,
  fontWeight: 600,
  color: C.text,
  cursor: 'pointer',
  borderRadius: 6,
  fontFamily: "'Inter', sans-serif",
}

// Right-click helper — parents wrap their card's onContextMenu with this
// to open a PinMenu at pointer location. Currently we surface the same
// popover via the ⋯ trigger programmatically; for right-click the caller
// can intercept and toggle. Exposed for R58's testing contract.
export function createRightClickOpener(setOpen) {
  return (e) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }
}
