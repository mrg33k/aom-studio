import { useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'

// Chip + preview modal for large pastes in the chat composer.
// Threshold: > 15 lines OR > 1000 chars → triggers chip instead of inline paste.
// Usage: <PasteChipBar chips={pasteChips} onRemove={removePasteChip} />
export function PasteChipBar({ chips, onRemove }) {
  const [previewChip, setPreviewChip] = useState(null)
  if (!chips.length) return null

  return (
    <>
      {chips.map(chip => (
        <div
          key={chip.id}
          style={{
            maxWidth: 560,
            margin: '0 auto 6px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 8px 5px 10px',
            borderRadius: 10,
            background: 'rgba(96,165,250,0.08)',
            border: '1px solid rgba(96,165,250,0.22)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <button
            onClick={() => setPreviewChip(chip)}
            title="Click to preview pasted text"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="9" y="2" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            <span style={{ fontSize: 12, color: C.blue, fontWeight: 500 }}>
              Pasted Text +{chip.lineCount} lines
            </span>
          </button>
          <button
            onClick={() => onRemove(chip.id)}
            title="Remove pasted text"
            style={{
              width: 20, height: 20,
              background: 'none', border: 'none',
              borderRadius: '50%',
              color: C.muted,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, lineHeight: 1,
              padding: 0, flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}

      {previewChip && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div
            onClick={() => setPreviewChip(null)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div style={{
            position: 'relative',
            width: 'min(660px, 90vw)',
            maxHeight: '72vh',
            background: C.bg2,
            border: '1px solid ' + C.border2,
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          }}>
            <div style={{
              padding: '13px 16px',
              borderBottom: '1px solid ' + C.border,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.blue,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.02em',
              }}>
                Pasted Text · {previewChip.lineCount} lines · {previewChip.text.length.toLocaleString()} chars
              </span>
              <button
                onClick={() => setPreviewChip(null)}
                style={{
                  background: 'none', border: 'none',
                  color: C.muted, cursor: 'pointer',
                  fontSize: 20, padding: '0 2px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <pre style={{
              flex: 1,
              overflow: 'auto',
              padding: '14px 16px',
              margin: 0,
              fontSize: 12,
              lineHeight: 1.65,
              color: C.text2,
              fontFamily: "'JetBrains Mono', monospace",
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {previewChip.text}
            </pre>
          </div>
        </div>
      )}
    </>
  )
}

// Returns true when paste text should collapse to a chip.
// Threshold: > 15 lines OR > 1000 chars (OR logic — either is enough).
export function shouldChipPaste(text) {
  if (!text) return false
  if (text.length > 1000) return true
  if (text.split('\n').length > 15) return true
  return false
}
