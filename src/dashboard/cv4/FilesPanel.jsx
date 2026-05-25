// FilesPanel.jsx — CV4 Files tab (corner:right-menu R5)
//
// Layout (top → bottom inside the Files accordion tab):
//   MEDIA SECTION — uploaded video/audio/images for this project, sorted by type
//   FILE BROWSER  — all files (mission docs + research + uploads), clickable in-panel
//
// In-panel viewer opens inline below the clicked file row:
//   images   → <img>
//   audio    → <audio> player
//   video    → <video> player
//   PDFs     → <iframe>
//   markdown → fetched + rendered as plain text
//   other    → download link
//
// Data sources:
//   1. /api/dashboard/project-files?slug={slug}  — disk-based canon + research docs
//   2. /api/dashboard/files?type=images&prefix={world}/{slug}/  — Supabase Storage uploads

import { useEffect, useState, useCallback } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'
import { useCornerAuth } from '../CornerContext.jsx'

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

function fileExt(name) {
  return (name || '').split('.').pop().toLowerCase()
}

function fileKind(name) {
  const ext = fileExt(name)
  if (['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext)) return 'audio'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic'].includes(ext)) return 'image'
  if (['pdf'].includes(ext)) return 'pdf'
  if (['md', 'txt'].includes(ext)) return 'text'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'spreadsheet'
  if (['docx', 'doc'].includes(ext)) return 'doc'
  return 'file'
}

function kindIcon(kind) {
  switch (kind) {
    case 'video':       return '▶'
    case 'audio':       return '♫'
    case 'image':       return '◻'
    case 'pdf':         return '⊡'
    case 'text':        return '≡'
    case 'spreadsheet': return '⊞'
    case 'doc':         return '⊟'
    default:            return '○'
  }
}

function kindColor(kind) {
  switch (kind) {
    case 'video':  return '#f59e0b'
    case 'audio':  return '#8b5cf6'
    case 'image':  return '#10b981'
    default:       return C.muted
  }
}

// ── Section label ──────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      textTransform: 'uppercase',
      fontSize: 10,
      fontWeight: 700,
      color: C.muted,
      letterSpacing: '0.12em',
      padding: '16px 12px 6px',
      fontFamily: "'Inter', sans-serif",
    }}>{children}</div>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{
      fontSize: 11,
      color: C.muted,
      padding: '4px 12px 8px',
      fontStyle: 'italic',
      fontFamily: "'Inter', sans-serif",
    }}>{text}</div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: '4px 0', opacity: 0.3 }} />
}

// ── In-panel viewer ────────────────────────────────────────────────────────

function FileViewer({ file, onClose }) {
  const [textContent, setTextContent] = useState(null)
  const [loadingText, setLoadingText] = useState(false)
  const kind = fileKind(file.name)
  const url = file.url

  useEffect(() => {
    if (kind !== 'text') return
    setLoadingText(true)
    fetch(url)
      .then(r => r.text())
      .then(t => { setTextContent(t); setLoadingText(false) })
      .catch(() => { setTextContent('Could not load file.'); setLoadingText(false) })
  }, [url, kind])

  return (
    <div style={{
      margin: '0 8px 8px',
      borderRadius: 6,
      background: 'rgba(15,23,42,0.6)',
      border: '1px solid ' + C.border,
      overflow: 'hidden',
    }}>
      {/* Close bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        borderBottom: '1px solid ' + C.border,
      }}>
        <span style={{ fontSize: 11, color: C.text2, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: '0 0 0 8px', flexShrink: 0 }}
        >✕</button>
      </div>

      {/* Content */}
      <div style={{ maxHeight: 260, overflow: 'auto' }}>
        {kind === 'image' && (
          <img src={url} alt={file.name} style={{ width: '100%', display: 'block' }} />
        )}
        {kind === 'video' && (
          <video src={url} controls style={{ width: '100%', display: 'block', maxHeight: 220 }} />
        )}
        {kind === 'audio' && (
          <div style={{ padding: '12px 10px' }}>
            <audio src={url} controls style={{ width: '100%' }} />
          </div>
        )}
        {kind === 'pdf' && (
          <iframe src={url} style={{ width: '100%', height: 240, border: 'none', display: 'block' }} title={file.name} />
        )}
        {kind === 'text' && (
          <div style={{ padding: '10px 12px', fontSize: 11, color: C.text2, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {loadingText ? 'Loading…' : (textContent || '')}
          </div>
        )}
        {(kind === 'spreadsheet' || kind === 'doc' || kind === 'file') && (
          <div style={{ padding: '12px', textAlign: 'center' }}>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: C.accent,
              color: '#000',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              fontFamily: "'Inter', sans-serif",
            }}>Download {file.name}</a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Media chip (compact tile for images/video/audio) ──────────────────────

function MediaChip({ file, isActive, onClick }) {
  const kind = fileKind(file.name)
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 72,
        height: 56,
        borderRadius: 6,
        border: '1px solid ' + (isActive ? C.accent : C.border),
        background: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(15,23,42,0.4)',
        cursor: 'pointer',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        transition: 'border-color 120ms',
      }}
    >
      {kind === 'image' ? (
        <img src={file.url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <>
          <span style={{ fontSize: 18, color: kindColor(kind) }}>{kindIcon(kind)}</span>
          <span style={{ fontSize: 9, color: C.muted, marginTop: 2, fontFamily: "'JetBrains Mono', monospace", textAlign: 'center', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 68 }}>
            {file.name.replace(/\.[^.]+$/, '').slice(0, 12)}
          </span>
        </>
      )}
    </div>
  )
}

// ── File browser row ───────────────────────────────────────────────────────

function FileRow({ file, isActive, onClick }) {
  const kind = fileKind(file.name)
  const icon = kindIcon(kind)
  const color = kindColor(kind)
  const displayName = file.name
    .replace(/\.md$/, '')
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')

  return (
    <>
      <div
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          cursor: 'pointer',
          background: isActive ? 'rgba(16,185,129,0.06)' : 'transparent',
          borderLeft: isActive ? '2px solid ' + C.accent : '2px solid transparent',
          transition: 'background 120ms',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.s1 }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ fontSize: 12, color, flexShrink: 0, width: 14, textAlign: 'center' }}>{icon}</span>
        <span style={{
          flex: 1, minWidth: 0,
          fontSize: 12,
          fontWeight: 500,
          color: C.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          fontFamily: "'Inter', sans-serif",
        }}>{displayName}</span>
        {file.age && (
          <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
            {file.age}
          </span>
        )}
      </div>
      {isActive && (
        <FileViewer file={file} onClose={onClick} />
      )}
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function FilesPanel({ projectSlug }) {
  const { worldId } = useCornerAuth()
  const [docFiles, setDocFiles] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeFile, setActiveFile] = useState(null)

  const world = worldId || 'aom'

  const handleFileClick = useCallback((file) => {
    setActiveFile(prev => (prev?.name === file.name && prev?.url === file.url) ? null : file)
  }, [])

  useEffect(() => {
    if (!projectSlug) return
    let cancelled = false
    setLoading(true)
    setDocFiles([])
    setUploadedFiles([])

    // Fetch 1: disk-based canon + research docs
    const docsPromise = authFetch(`/api/dashboard/project-files?slug=${encodeURIComponent(projectSlug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(body => {
        if (cancelled || !body) return
        const all = []
        // Project-level files
        for (const f of (body.files || [])) {
          all.push({
            name: f.name,
            url: `/api/local/file?path=${encodeURIComponent(f.path)}`,
            age: relativeAge(f.last_modified),
            kind: f.kind,
            section: 'project',
          })
        }
        // Mission files
        for (const m of (body.missions || [])) {
          for (const f of (m.files || [])) {
            all.push({
              name: `${m.slug}/${f.name}`,
              url: `/api/local/file?path=${encodeURIComponent(f.path)}`,
              age: relativeAge(f.last_modified),
              kind: f.kind,
              section: m.slug,
            })
          }
        }
        if (!cancelled) setDocFiles(all)
      })
      .catch(() => {})

    // Fetch 2: Supabase Storage uploads for this project
    const uploadsPromise = authFetch(`/api/dashboard/files?type=images&prefix=${encodeURIComponent(world + '/' + projectSlug + '/')}`)
      .then(r => r.ok ? r.json() : null)
      .then(body => {
        if (cancelled || !body) return
        const files = (body.files || []).map(f => ({
          name: f.name,
          url: f.url,
          age: relativeAge(f.date),
          kind: fileKind(f.name),
          section: 'uploaded',
        }))
        if (!cancelled) setUploadedFiles(files)
      })
      .catch(() => {})

    Promise.all([docsPromise, uploadsPromise]).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [projectSlug, world])

  if (!projectSlug) {
    return <EmptyState text="Open a project to see files." />
  }

  if (loading) {
    return <EmptyState text="Loading…" />
  }

  // Split uploaded files into media vs others
  const mediaFiles = uploadedFiles.filter(f => ['video', 'audio', 'image'].includes(f.kind))
  const uploadedDocs = uploadedFiles.filter(f => !['video', 'audio', 'image'].includes(f.kind))

  // All browser files: docs first, then non-media uploads
  const browserFiles = [...docFiles, ...uploadedDocs]

  const hasMedia = mediaFiles.length > 0
  const hasBrowser = browserFiles.length > 0

  if (!hasMedia && !hasBrowser) {
    return <EmptyState text="No files yet." />
  }

  return (
    <div>
      {/* ── MEDIA SECTION ──────────────────────────── */}
      {hasMedia && (
        <>
          <SectionLabel>Media</SectionLabel>
          <div style={{
            display: 'flex',
            gap: 6,
            padding: '0 12px 12px',
            overflowX: 'auto',
            flexWrap: 'nowrap',
          }}>
            {mediaFiles.map(f => (
              <MediaChip
                key={f.url}
                file={f}
                isActive={activeFile?.url === f.url}
                onClick={() => handleFileClick(f)}
              />
            ))}
          </div>
          {activeFile && ['video', 'audio', 'image'].includes(fileKind(activeFile.name)) && (
            <FileViewer file={activeFile} onClose={() => setActiveFile(null)} />
          )}
          <Divider />
        </>
      )}

      {/* ── FILE BROWSER ───────────────────────────── */}
      {hasBrowser && (
        <>
          <SectionLabel>Files</SectionLabel>
          {browserFiles.map(f => (
            <FileRow
              key={f.url}
              file={f}
              isActive={activeFile?.url === f.url && !['video', 'audio', 'image'].includes(fileKind(f.name))}
              onClick={() => handleFileClick(f)}
            />
          ))}
        </>
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}
