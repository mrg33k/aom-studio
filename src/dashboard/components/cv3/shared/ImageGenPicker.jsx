import { useState, useRef, useEffect } from 'react'
import { C } from '../../../lib/cv3Colors.js'

// Left-side composer button: opens a popover with the three image-gen tools
// we have on hand (Gemini, Ideogram, OpenAI gpt-image-1.5). Picking one pins
// it via setSelectedImageTool — the next send routes to /api/dashboard/image-gen
// instead of chat-bridge. Cleared on send (handled in useChatSend).
//
// States:
//   no tool   → icon-only round button (matches Attach/Commands sizing)
//   tool set  → pill chip with tool name + ✕ to clear
export const IMAGE_TOOLS = [
 { id: 'gemini', name: 'Gemini', detail: 'Imagen 4 / Nano Banana, photoreal, 4K' },
 { id: 'ideogram', name: 'Ideogram', detail: '3.0, typography, posters, in-image text' },
 { id: 'openai', name: 'OpenAI', detail: 'gpt-image-1.5, general, edits, transparent bg' },
]

const TOOL_BY_ID = Object.fromEntries(IMAGE_TOOLS.map(t => [t.id, t]))

export default function ImageGenPicker({ selectedImageTool, setSelectedImageTool, hideTrigger = false }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const active = selectedImageTool ? TOOL_BY_ID[selectedImageTool] : null

  // CV4 hides the standalone trigger (chip-only) — the new commands menu
  // owns tool selection there. Nothing to render when no tool is active.
  if (hideTrigger && !active) return null

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {active ? (
        <div
          data-testid="image-gen-chip"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 30,
            padding: '0 6px 0 10px',
            marginRight: 6,
            borderRadius: 15,
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.35)',
            color: '#FCD34D',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            whiteSpace: 'nowrap',
          }}
        >
          <ImageIcon size={13} />
          <span>{active.name}</span>
          <button
            type="button"
            title="Clear image tool"
            onClick={() => setSelectedImageTool(null)}
            style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'none', border: 'none', color: '#FCD34D',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-testid="image-gen-button"
          title="Generate image"
          onClick={() => setOpen(o => !o)}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: open ? 'rgba(245,158,11,0.10)' : 'none', border: 'none',
            color: open ? '#FCD34D' : C.muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s',
            marginRight: 4,
          }}
        >
          <ImageIcon size={17} />
        </button>
      )}

      {open && !active && (
        <div
          data-testid="image-gen-popover"
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
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: C.dim,
            padding: '6px 10px 8px',
          }}>
            Generate image with
          </div>
          {IMAGE_TOOLS.map(tool => (
            <button
              key={tool.id}
              type="button"
              data-testid={`image-gen-option-${tool.id}`}
              onClick={() => { setSelectedImageTool(tool.id); setOpen(false) }}
              style={{
                width: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: 2,
                padding: '8px 10px',
                background: 'none', border: 'none', borderRadius: 8,
                color: C.text, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>{tool.name}</span>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{tool.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ImageIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="M21 15l-5-5-9 9" />
    </svg>
  )
}