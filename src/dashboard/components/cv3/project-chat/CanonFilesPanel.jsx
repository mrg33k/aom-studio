// CanonFilesPanel -- read-only reader for a project's canonical MDs.
// Surfaces: VISION / RESEARCH / BUILD / CONTEXT / last-conversation.
// last-conversation.md is shown with an explicit "agent's notes" label + tint.
// R79-f1 MVP slice.
import { useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { useChatCore, useChatSettingsCtx } from '../chat/ChatPanelContext.jsx'

const CANON_ENTRIES = [
  { filename: 'VISION.md',            label: 'Vision',                   color: '#A78BFA' },
  { filename: 'RESEARCH.md',          label: 'Research',                 color: '#6EE7B7' },
  { filename: 'BUILD.md',             label: 'Build',                    color: '#FBBF24' },
  { filename: 'CONTEXT.md',           label: 'Context',                  color: '#60A5FA' },
  { filename: 'last-conversation.md', label: 'What the agent remembers', color: '#F9A8D4', isTape: true },
]

export default function CanonFilesPanel() {
  const { selectedProject, worldId } = useChatCore()
  const { setCanonFilesOpen } = useChatSettingsCtx()

  const [selectedFile, setSelectedFile] = useState(null)
  const [fileHtml, setFileHtml] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [hoveredRow, setHoveredRow] = useState(null)

  const projectSlug = selectedProject?.slug
  if (!projectSlug) return null

  async function openFile(entry) {
    setSelectedFile(entry)
    setFileHtml('')
    setFileLoading(true)
    try {
      let url = `/api/dashboard/file-content?project=${encodeURIComponent(projectSlug)}&filename=${encodeURIComponent(entry.filename)}`
      if (worldId) url += `&client_id=${encodeURIComponent(worldId)}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setFileHtml(data.content || '')
      } else if (res.status === 404) {
        setFileHtml('<p style="color:#94A3B8;font-family:\'Inter\',sans-serif;font-size:14px">This file hasn\'t been created yet.</p>')
      } else {
        setFileHtml('<p style="color:#94A3B8;font-family:\'Inter\',sans-serif;font-size:14px">File not available.</p>')
      }
    } catch {
      setFileHtml('<p style="color:#94A3B8;font-family:\'Inter\',sans-serif;font-size:14px">Failed to load file.</p>')
    }
    setFileLoading(false)
  }

  // ── Article viewer overlay ─────────────────────────────────────────────────
  if (selectedFile) {
    return (
      <div
        data-testid="canon-file-viewer"
        style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: selectedFile.isTape ? 'rgba(8,12,24,0.99)' : C.bg,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 20px 14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => { setSelectedFile(null); setFileHtml('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              minWidth: 44, minHeight: 44,
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, padding: '0 8px', borderRadius: 8,
              fontFamily: "'Inter', sans-serif", fontSize: 13,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = C.text }}
            onMouseLeave={e => { e.currentTarget.style.color = C.muted }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            {selectedFile.isTape && (
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'rgba(249,168,212,0.1)',
                border: '1px solid rgba(249,168,212,0.25)',
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 9, fontWeight: 700, color: '#F9A8D4',
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.07em', textTransform: 'uppercase',
                marginBottom: 4,
              }}>
                Agent's notes to itself
              </div>
            )}
            <div style={{
              fontSize: 15, fontWeight: 700, color: C.text,
              fontFamily: "'Inter', sans-serif",
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {selectedFile.label}
            </div>
            <div style={{ fontSize: 11, color: C.dim, fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
              {projectSlug}
            </div>
          </div>

          <button
            onClick={() => setCanonFilesOpen(false)}
            title="Close"
            style={{
              width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.muted, flexShrink: 0,
            }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '28px 32px 56px',
          background: selectedFile.isTape ? 'rgba(249,168,212,0.025)' : 'transparent',
        }}>
          {fileLoading ? (
            <div style={{ color: C.dim, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Loading…</div>
          ) : (
            <div
              data-testid="canon-file-content"
              className="briefing-summary-body article"
              style={{ maxWidth: 760 }}
              dangerouslySetInnerHTML={{ __html: fileHtml }}
            />
          )}
        </div>
      </div>
    )
  }

  // ── File list ──────────────────────────────────────────────────────────────
  return (
    <div
      data-testid="canon-files-panel"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,14,28,0.97)',
        flexShrink: 0,
      }}
    >
      {/* Panel header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px 8px',
      }}>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span style={{
          fontSize: 10, fontWeight: 700, color: C.muted,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          fontFamily: "'Inter', sans-serif",
        }}>
          Project Docs
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setCanonFilesOpen(false)}
          title="Close docs panel"
          style={{
            width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.muted,
          }}
        >
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* File rows */}
      <div style={{ padding: '0 8px 10px' }}>
        {CANON_ENTRIES.map((entry, idx) => {
          const isLast = idx === CANON_ENTRIES.length - 1
          const isHov = hoveredRow === entry.filename
          return (
            <div
              key={entry.filename}
              data-testid={`canon-file-${entry.filename}`}
              onClick={() => openFile(entry)}
              onMouseEnter={() => setHoveredRow(entry.filename)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                height: 42, padding: '0 8px',
                cursor: 'pointer',
                borderRadius: 7,
                background: entry.isTape
                  ? isHov ? 'rgba(249,168,212,0.08)' : 'rgba(249,168,212,0.03)'
                  : isHov ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.12s',
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={entry.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>

              <span style={{
                flex: 1, fontSize: 13,
                fontWeight: entry.isTape ? 400 : 500,
                color: entry.isTape ? '#F9A8D4' : C.text,
                fontFamily: "'Inter', sans-serif",
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {entry.label}
              </span>

              {entry.isTape ? (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: '#F9A8D4',
                  fontFamily: "'Inter', sans-serif",
                  background: 'rgba(249,168,212,0.1)',
                  border: '1px solid rgba(249,168,212,0.2)',
                  borderRadius: 4,
                  padding: '2px 5px',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  Tape
                </span>
              ) : (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: C.dim,
                  fontFamily: "'JetBrains Mono', monospace",
                  flexShrink: 0,
                }}>
                  {entry.filename}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
