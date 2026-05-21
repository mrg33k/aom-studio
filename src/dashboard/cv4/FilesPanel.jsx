// CV4 FilesPanel — project canon / tape / research drops / missions tree.
//
// Mission: corner:files-in-app (R79-f3)
// Wires R79-f1 (GET /api/dashboard/project-files + project-file) to R79-f2
// (ProjectFileReader). Mounted as the last section of RightMenu.jsx per the
// VISION pillar update (rail order Missions • Search • Pills • Summary • Pinned
// • Working • Completed • Files).
//
// Reader display mode: fullscreen modal overlay. The right rail is 300–460px —
// too narrow for a 70ch article column — and the center column belongs to
// ChatPanel. The modal mirrors how CornerV4's Commands palette / Phone overlay
// surface (CornerV4.jsx ~1803). Click-outside, ESC, and the × button all close.
//
// Scope: MD-only this round (Decision A in the brief). Non-MD (screenshots,
// attachments, visuals/) land in R79-f11. A placeholder row sits at the bottom
// so the gap is visible-by-design rather than a bug.
//
// Read-only — no edit / delete / upload affordances anywhere here. Uploads
// happen in the chat composer (R79-f13 shipped). Files-on-studio-disk
// substrate per .claude/rules/files-on-studio-disk-never-supabase.md — this
// component doesn't touch storage directly.

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'
import ProjectFileReader from './ProjectFileReader.jsx'

// ── Hidden-name guard (belt-and-suspenders; API already filters) ────────────
const HIDDEN_NAMES = new Set([
  'PHONEBOOK.md', 'history.md', 'rules.md', 'decisions.md',
  'lessons.md', 'manifest.yaml',
])
function isHidden(name) { return HIDDEN_NAMES.has(name) }

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeAge(ts) {
  if (!ts) return ''
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 90) return 'now'
  if (diff < 3600) return Math.round(diff / 60) + 'm'
  if (diff < 86400) return Math.round(diff / 3600) + 'h'
  const days = Math.round(diff / 86400)
  if (days < 7) return days + 'd'
  if (days < 60) return Math.round(days / 7) + 'w'
  return Math.round(days / 30) + 'mo'
}

function displayName(file) {
  if (!file) return ''
  // VISION.md → "VISION"; last-conversation.md → "TAPE"; research drops keep their dated name.
  if (file.kind === 'canon') return file.name.replace(/\.md$/i, '')
  if (file.kind === 'tape')  return 'TAPE'
  return file.name.replace(/\.md$/i, '')
}

function inferReaderKind(file) {
  if (file?.kind === 'tape')          return 'tape'
  if (file?.kind === 'research-drop') return 'research-drop'
  return 'canon'
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 12px 8px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <span style={{
        textTransform: 'uppercase',
        fontSize: 10,
        fontWeight: 700,
        color: C.muted,
        letterSpacing: '0.12em',
      }}>{children}</span>
      {action}
    </div>
  )
}

function FileRow({ file, onOpen, indent = 0 }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(file)}
      style={{
        width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px 6px ' + (12 + indent) + 'px',
        background: 'transparent',
        border: 'none', cursor: 'pointer',
        minHeight: 30,
        color: 'inherit',
        fontFamily: "'Inter', sans-serif",
        transition: 'background 120ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = C.s1 }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: 12,
        fontWeight: file.kind === 'canon' ? 600 : 500,
        color: file.kind === 'tape' ? C.accent : C.text,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        fontFamily: file.kind === 'research-drop'
          ? "'JetBrains Mono', monospace"
          : "'Inter', sans-serif",
      }}>{displayName(file)}</span>
      <span style={{
        fontSize: 10, color: C.muted,
        fontFamily: "'JetBrains Mono', monospace",
        flexShrink: 0,
      }}>{relativeAge(file.last_modified)}</span>
    </button>
  )
}

function FolderRow({ label, count, open, onToggle, children }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'inherit',
          fontFamily: "'Inter', sans-serif",
          transition: 'background 120ms ease',
          minHeight: 28,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = C.s1 }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <span aria-hidden style={{
          width: 10, textAlign: 'center',
          fontSize: 9, color: C.muted,
          transition: 'transform 150ms ease',
          transform: open ? 'rotate(90deg)' : 'none',
          flexShrink: 0,
        }}>▶</span>
        <span style={{
          flex: 1, minWidth: 0,
          fontSize: 12, fontWeight: 500, color: C.text2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{label}</span>
        <span style={{
          fontSize: 10, color: C.muted,
          fontFamily: "'JetBrains Mono', monospace",
          background: C.chipBg,
          border: '1px solid ' + C.border,
          borderRadius: 3,
          padding: '1px 5px',
          minWidth: 18, textAlign: 'center',
          flexShrink: 0,
        }}>{count}</span>
      </button>
      {open && (
        <div style={{
          paddingTop: 2, paddingBottom: 6,
          marginLeft: 16,
          borderLeft: '1px solid ' + C.border,
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

function EmptyLine({ text }) {
  return (
    <div style={{
      fontSize: 11, color: C.muted,
      padding: '4px 12px 8px',
      fontStyle: 'italic',
      fontFamily: "'Inter', sans-serif",
    }}>{text}</div>
  )
}

// ── Reader modal ────────────────────────────────────────────────────────────

function ReaderModal({ file, content, lastModified, loading, error, onClose, onLinkClick }) {
  // ESC closes the modal.
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!file) return null

  return (
    <div
      data-cv4-files-modal
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 350,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'stretch', justifyContent: 'center',
        padding: 'clamp(12px, 4vh, 48px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 880,
          background: C.bg2,
          border: '1px solid ' + C.border2,
          borderRadius: 14,
          boxShadow: '0 24px 96px rgba(0,0,0,0.65)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid ' + C.border,
          background: C.bg,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: C.dim,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
          }}>File</span>
          <span style={{
            flex: 1, minWidth: 0,
            fontSize: 12, color: C.text2,
            fontFamily: "'JetBrains Mono', monospace",
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{file.path}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: C.text2, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, lineHeight: 1, padding: 0,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '40px 24px', color: C.muted, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
              Loading…
            </div>
          )}
          {error && (
            <div style={{
              padding: '40px 24px', color: '#f87171', fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
            }}>{error}</div>
          )}
          {!loading && !error && content != null && (
            <ProjectFileReader
              content={content}
              kind={inferReaderKind(file)}
              name={file.name}
              lastModified={lastModified || file.last_modified}
              onLinkClick={onLinkClick}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function FilesPanel({ projectSlug }) {
  const [data, setData] = useState(null)           // { project, world, files: [], missions: [] }
  const [mode, setMode] = useState('idle')         // idle | loading | live | error | empty
  const [errorDetail, setErrorDetail] = useState('')
  const [openMissions, setOpenMissions] = useState({})    // { slug: true }
  const [researchOpen, setResearchOpen] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  // Reader modal state
  const [activeFile, setActiveFile] = useState(null)
  const [readerContent, setReaderContent] = useState(null)
  const [readerMtime, setReaderMtime] = useState(null)
  const [readerLoading, setReaderLoading] = useState(false)
  const [readerError, setReaderError] = useState('')
  const inflightPathRef = useRef(null)

  // Fetch tree on mount + when slug / refresh tick changes.
  useEffect(() => {
    if (!projectSlug) {
      setData(null); setMode('idle'); return
    }
    let cancelled = false
    setMode('loading'); setErrorDetail('')
    ;(async () => {
      try {
        const r = await authFetch(`/api/dashboard/project-files?slug=${encodeURIComponent(projectSlug)}`)
        if (cancelled) return
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          setMode('error')
          setErrorDetail(body?.error || `HTTP ${r.status}`)
          return
        }
        const body = await r.json()
        if (cancelled) return
        setData(body)
        const hasAny = (body.files?.length || 0) + (body.missions?.length || 0) > 0
        setMode(hasAny ? 'live' : 'empty')
      } catch (e) {
        if (!cancelled) {
          setMode('error')
          setErrorDetail(e?.message || 'fetch-failed')
        }
      }
    })()
    return () => { cancelled = true }
  }, [projectSlug, refreshTick])

  // Open a file: fetch content + show reader modal.
  const openFile = useCallback(async (file) => {
    if (!file || isHidden(file.name)) return
    setActiveFile(file)
    setReaderContent(null)
    setReaderMtime(null)
    setReaderError('')
    setReaderLoading(true)
    inflightPathRef.current = file.path
    try {
      const r = await authFetch(`/api/dashboard/project-file?path=${encodeURIComponent(file.path)}`)
      // Bail if a newer request superseded this one.
      if (inflightPathRef.current !== file.path) return
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        setReaderError(body?.error || `HTTP ${r.status}`)
        return
      }
      const body = await r.json()
      if (inflightPathRef.current !== file.path) return
      setReaderContent(body.content || '')
      setReaderMtime(body.last_modified || null)
    } catch (e) {
      setReaderError(e?.message || 'fetch-failed')
    } finally {
      setReaderLoading(false)
    }
  }, [])

  const closeReader = useCallback(() => {
    inflightPathRef.current = null
    setActiveFile(null)
    setReaderContent(null)
    setReaderError('')
  }, [])

  // R79-f5 stub — log only; real routing lands in f5.
  const handleLinkClick = useCallback((href) => {
    // eslint-disable-next-line no-console
    console.log('[FilesPanel] internal link click (R79-f5 stub):', href)
  }, [])

  // Partition root files by kind.
  const { canonFiles, tapeFile, rootDrops } = useMemo(() => {
    const files = data?.files || []
    return {
      canonFiles: files.filter(f => f.kind === 'canon' && !isHidden(f.name)),
      tapeFile:   files.find(f => f.kind === 'tape' && !isHidden(f.name)) || null,
      rootDrops:  files.filter(f => f.kind === 'research-drop' && !isHidden(f.name)),
    }
  }, [data])

  const missions = data?.missions || []

  // No project selected: short stub.
  if (!projectSlug) {
    return (
      <>
        <SectionLabel>Files</SectionLabel>
        <EmptyLine text="Open a project to see its files." />
      </>
    )
  }

  return (
    <>
      <SectionLabel
        action={
          <button
            type="button"
            onClick={() => setRefreshTick(t => t + 1)}
            aria-label="Refresh files"
            title="Refresh"
            disabled={mode === 'loading'}
            style={{
              width: 22, height: 22, borderRadius: 5, flexShrink: 0,
              background: 'transparent',
              border: '1px solid ' + C.border2,
              color: C.muted, cursor: mode === 'loading' ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: mode === 'loading' ? 0.5 : 1,
              padding: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
              <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
            </svg>
          </button>
        }
      >Files</SectionLabel>

      {/* Project subtitle */}
      <div style={{
        padding: '0 12px 6px',
        fontSize: 11, color: C.muted,
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{projectSlug}</div>

      {mode === 'loading' && (
        <div style={{ padding: '4px 12px', fontSize: 11, color: C.muted, fontFamily: "'Inter', sans-serif" }}>
          Loading…
        </div>
      )}

      {mode === 'error' && (
        <div style={{ padding: '4px 12px 8px' }}>
          <div style={{ fontSize: 11, color: '#f87171', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
            {errorDetail || 'Could not load files.'}
          </div>
          <button
            type="button"
            onClick={() => setRefreshTick(t => t + 1)}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid ' + C.border2,
              color: C.text2, cursor: 'pointer',
            }}
          >Retry</button>
        </div>
      )}

      {mode === 'empty' && <EmptyLine text="Nothing here yet." />}

      {mode === 'live' && (
        <>
          {/* Canon (flat) */}
          {canonFiles.length === 0 && <EmptyLine text="No canon files yet." />}
          {canonFiles.map(f => (
            <FileRow key={f.path} file={f} onOpen={openFile} />
          ))}

          {/* Tape */}
          {tapeFile && (
            <div data-cv4-files-tape style={{
              marginTop: 4,
              background: 'var(--c-accent-bg, rgba(16,185,129,0.06))',
              borderTop: '1px solid ' + C.border,
              borderBottom: '1px solid ' + C.border,
            }}>
              <FileRow file={tapeFile} onOpen={openFile} />
              <div style={{
                fontSize: 10,
                color: C.muted,
                padding: '0 12px 6px',
                fontStyle: 'italic',
                fontFamily: "'Inter', sans-serif",
              }}>What the agent remembers</div>
            </div>
          )}

          {/* Research drops (folder) */}
          {rootDrops.length > 0 && (
            <FolderRow
              label="research/"
              count={rootDrops.length}
              open={researchOpen}
              onToggle={() => setResearchOpen(v => !v)}
            >
              {rootDrops.map(f => (
                <FileRow key={f.path} file={f} onOpen={openFile} indent={4} />
              ))}
            </FolderRow>
          )}

          {/* Missions */}
          {missions.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{
                padding: '8px 12px 2px',
                fontSize: 10, fontWeight: 700, color: C.muted,
                letterSpacing: '0.10em', textTransform: 'uppercase',
                fontFamily: "'Inter', sans-serif",
              }}>Missions</div>
              {missions.map(m => {
                const visibleFiles = (m.files || []).filter(f => !isHidden(f.name))
                const isOpen = !!openMissions[m.slug]
                return (
                  <FolderRow
                    key={m.slug}
                    label={m.slug}
                    count={visibleFiles.length}
                    open={isOpen}
                    onToggle={() => setOpenMissions(s => ({ ...s, [m.slug]: !s[m.slug] }))}
                  >
                    {visibleFiles.length === 0 && (
                      <EmptyLine text="No files in this mission." />
                    )}
                    {visibleFiles.map(f => (
                      <FileRow key={f.path} file={f} onOpen={openFile} indent={4} />
                    ))}
                  </FolderRow>
                )
              })}
            </div>
          )}

          {/* R79-f11 placeholder — non-MD types coming soon. */}
          <div style={{
            margin: '14px 12px 6px',
            padding: '8px 10px',
            border: '1px dashed ' + C.border2,
            borderRadius: 6,
            fontSize: 11, color: C.muted,
            fontFamily: "'Inter', sans-serif",
            lineHeight: 1.4,
          }}>
            Screenshots and attachments — coming soon (R79-f11).
          </div>
        </>
      )}

      {/* Reader overlay (portal-style modal). Rendered last so it stacks on top. */}
      <ReaderModal
        file={activeFile}
        content={readerContent}
        lastModified={readerMtime}
        loading={readerLoading}
        error={readerError}
        onClose={closeReader}
        onLinkClick={handleLinkClick}
      />
    </>
  )
}
