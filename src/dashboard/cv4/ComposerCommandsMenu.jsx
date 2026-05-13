// CV4 composer "Commands" menu — vertical popover that rises from the
// Commands button next to Attach on the left of the composer pill.
//
// Replaces the CV3 inert chevron button (`onClick={() => {}}`) on /cv4 only.
// First option: Image generation, which expands into Gemini / Ideogram /
// OpenAI choices. Picking a tool calls setSelectedImageTool() — the chip
// then appears (ImageGenPicker still owns the chip render) and the next
// send routes to /api/dashboard/image-gen. Cleared on send by useChatSend.
//
// R5.1 Phase G.

import { useState, useRef, useEffect } from 'react'
import { C } from '../lib/cv3Colors.js'
import { IMAGE_TOOLS } from '../components/cv3/shared/ImageGenPicker.jsx'

export default function ComposerCommandsMenu({
  open,
  setOpen,
  setSelectedImageTool,
}) {
  const wrapRef = useRef(null)
  const [view, setView] = useState('root')

  useEffect(() => {
    if (!open) {
      setView('root')
      return
    }
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, setOpen])

  return (
    <div
      ref={wrapRef}
      data-testid="cv4-commands-menu-trigger"
      style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}
    >
      <button
        type="button"
        title="Commands"
        data-testid="cv4-commands-menu-button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: open ? 'rgba(99,102,241,0.10)' : 'none',
          border: 'none',
          color: open ? '#A5B4FC' : C.muted,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.15s',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 17l6-6-6-6"/><line x1="12" y1="19" x2="20" y2="19"/>
        </svg>
      </button>

      {open && (
        <div
          data-testid="cv4-commands-menu-popover"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            minWidth: 260,
            background: C.s1,
            border: '1px solid ' + C.border2,
            borderRadius: 14,
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
            padding: 6,
            zIndex: 50,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {view === 'root' && (
            <>
              <MenuHeader>Commands</MenuHeader>
              <MenuRow
                icon={<ImageIcon />}
                label="Image generation"
                detail="Gemini · Ideogram · OpenAI"
                hasSubmenu
                onClick={() => setView('image-gen')}
                testid="cv4-commands-image-gen"
              />
            </>
          )}
          {view === 'image-gen' && (
            <>
              <MenuHeader onBack={() => setView('root')}>Image generation</MenuHeader>
              {IMAGE_TOOLS.map(tool => (
                <MenuRow
                  key={tool.id}
                  icon={<ImageIcon />}
                  label={tool.name}
                  detail={tool.detail}
                  onClick={() => {
                    setSelectedImageTool(tool.id)
                    setOpen(false)
                  }}
                  testid={`cv4-commands-image-gen-${tool.id}`}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MenuHeader({ children, onBack }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 10px 8px',
    }}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 18, height: 18, borderRadius: '50%',
            background: 'none', border: 'none', color: C.muted,
            cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      )}
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: C.dim,
      }}>{children}</span>
    </div>
  )
}

function MenuRow({ icon, label, detail, hasSubmenu, onClick, testid }) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px',
        background: 'none', border: 'none', borderRadius: 8,
        color: C.text, cursor: 'pointer', textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.muted, flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        {detail && (
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail}</span>
        )}
      </span>
      {hasSubmenu && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      )}
    </button>
  )
}

function ImageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="M21 15l-5-5-9 9" />
    </svg>
  )
}
