// CanonFilesPanel -- read-only reader for a project's canonical MDs.
// Surfaces: VISION / RESEARCH / BUILD / CONTEXT / last-conversation.
// last-conversation.md is shown with an explicit "agent's notes" label + tint.
// R79-f1 MVP slice.
import { useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { useChatCore, useChatSettingsCtx } from '../chat/ChatPanelContext.jsx'

// Article typography for the file viewer overlay. Mirrors TasksPanel's
// .briefing-summary-body.article rules so the canon reader has real
// document hierarchy (28/22/17 headings, 15px body, 1.75 line-height,
// quiet code blocks, indented lists). Without this, marked output falls
// back to UA defaults — black text, no spacing, dead on a dark surface.
function CanonArticleStyles() {
  return (
    <style>{`
      .briefing-summary-body {
        font-family: 'Inter', sans-serif;
        word-break: break-word;
      }
      .briefing-summary-body strong { font-weight: 700; color: #F1F5F9; }
      .briefing-summary-body em { font-style: italic; color: #94A3B8; }
      .briefing-summary-body a {
        color: #60a5fa;
        text-decoration: underline;
        text-underline-offset: 2px;
        text-decoration-color: rgba(96,165,250,0.3);
      }
      .briefing-summary-body code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.85em;
        background: rgba(255,255,255,0.06);
        border-radius: 4px;
        padding: 1px 5px;
      }
      .briefing-summary-body.article {
        font-size: 15px;
        color: #CBD5E1;
        line-height: 1.75;
      }
      .briefing-summary-body.article h1 { font-size: 28px; margin: 0 0 18px 0; letter-spacing: -0.02em; font-weight: 700; color: #F1F5F9; line-height: 1.25; }
      .briefing-summary-body.article h2 { font-size: 22px; margin: 32px 0 12px 0; letter-spacing: -0.01em; padding-top: 4px; font-weight: 700; color: #F1F5F9; line-height: 1.3; }
      .briefing-summary-body.article h3 { font-size: 17px; margin: 22px 0 10px 0; font-weight: 700; color: #F1F5F9; line-height: 1.35; }
      .briefing-summary-body.article h4 { font-size: 15px; margin: 18px 0 8px 0; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
      .briefing-summary-body.article p { margin: 0 0 14px 0; line-height: 1.75; }
      .briefing-summary-body.article ul,
      .briefing-summary-body.article ol { margin: 8px 0 16px 0; padding-left: 24px; }
      .briefing-summary-body.article li { margin-bottom: 8px; line-height: 1.7; }
      .briefing-summary-body.article li > p { margin: 0 0 6px 0; }
      .briefing-summary-body.article hr { margin: 24px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1); }
      .briefing-summary-body.article blockquote {
        border-left: 4px solid rgba(255,255,255,0.15);
        margin: 14px 0;
        padding: 8px 16px;
        color: #94A3B8;
      }
      .briefing-summary-body.article pre {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 8px;
        padding: 14px 16px;
        margin: 12px 0 16px 0;
        overflow-x: auto;
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        line-height: 1.55;
      }
      .briefing-summary-body.article pre code {
        background: transparent;
        padding: 0;
        font-size: inherit;
        color: #CBD5E1;
      }
      .briefing-summary-body.article table {
        border-collapse: collapse;
        width: 100%;
        margin: 12px 0 18px 0;
        font-size: 13px;
      }
      .briefing-summary-body.article th,
      .briefing-summary-body.article td {
        border: 1px solid rgba(255,255,255,0.08);
        padding: 8px 12px;
        text-align: left;
      }
      .briefing-summary-body.article th {
        background: rgba(255,255,255,0.04);
        color: #F1F5F9;
        font-weight: 600;
      }
    `}</style>
  )
}

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
        <CanonArticleStyles />
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
          background: selectedFile.isTape ? 'rgba(249,168,212,0.025)' : 'transparent',
        }}>
          {fileLoading ? (
            <div style={{ padding: '28px 32px', color: C.dim, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Loading…</div>
          ) : (
            <div
              data-testid="canon-file-content"
              className="briefing-summary-body article"
              style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px 64px' }}
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
