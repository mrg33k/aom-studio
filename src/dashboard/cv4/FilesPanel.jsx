// FilesPanel.jsx — CV4 Files tab (corner:right-menu R6)
//
// Layout (top → bottom inside the Files accordion tab):
//   CATEGORY FILTERS — All · Docs · Media · Sheets · PDFs
//   BREADCRUMB       — / > missions > website
//   FILE BROWSER     — folder tree (missions as folders, files inside)
//     inline viewer: images/video/audio open below the clicked row
//
// Data sources:
//   1. /api/dashboard/project-files?slug={slug}  — disk-based canon + research (local only)
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

function fileCategory(kind) {
  if (['video', 'audio', 'image'].includes(kind)) return 'media'
  if (['pdf'].includes(kind)) return 'pdfs'
  if (['spreadsheet'].includes(kind)) return 'sheets'
  return 'docs'  // text, doc, file, tape, canon, research-drop
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
    default:            return '≡'
  }
}

function kindColor(kind) {
  switch (kind) {
    case 'video':  return '#f59e0b'
    case 'audio':  return '#8b5cf6'
    case 'image':  return '#10b981'
    case 'pdf':    return '#ef4444'
    case 'spreadsheet': return '#22c55e'
    default:       return C.muted
  }
}

// ── Category filter row ─────────────────────────────────────────────────────

const CATS = [
  { key: 'all',    label: 'All'   },
  { key: 'docs',   label: 'Docs'  },
  { key: 'media',  label: 'Media' },
  { key: 'sheets', label: 'Sheets'},
  { key: 'pdfs',   label: 'PDFs'  },
]

function CategoryFilters({ active, onChange }) {
  return (
    <div style={{
      display: 'flex',
      gap: 3,
      padding: '8px 12px',
      borderBottom: '1px solid ' + C.border,
    }}>
      {CATS.map(cat => (
        <button
          key={cat.key}
          onClick={() => onChange(cat.key)}
          style={{
            flex: 1,
            padding: '5px 0',
            background: active === cat.key ? 'rgba(16,185,129,0.10)' : 'transparent',
            border: '1px solid ' + (active === cat.key ? 'rgba(16,185,129,0.35)' : C.border),
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 9,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: active === cat.key ? C.accent : C.muted,
            fontFamily: "'JetBrains Mono', monospace",
            transition: 'all 120ms ease',
            whiteSpace: 'nowrap',
          }}
        >{cat.label}</button>
      ))}
    </div>
  )
}

// ── Breadcrumb ──────────────────────────────────────────────────────────────

function Breadcrumb({ path, onNavigate }) {
  if (!path || path.length === 0) return null
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '5px 12px',
      fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace",
      color: C.muted,
      flexWrap: 'wrap',
    }}>
      <span
        onClick={() => onNavigate(-1)}
        style={{ cursor: 'pointer', color: C.text2 }}
      >📁 /</span>
      {path.map((segment, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: C.border }}>›</span>
          <span
            onClick={() => onNavigate(i)}
            style={{
              cursor: i < path.length - 1 ? 'pointer' : 'default',
              color: i < path.length - 1 ? C.text2 : C.text,
            }}
          >{segment}</span>
        </span>
      ))}
    </div>
  )
}

// ── Empty states ────────────────────────────────────────────────────────────

function EmptyState({ text }) {
  return (
    <div style={{
      fontSize: 11,
      color: C.muted,
      padding: '8px 12px',
      fontStyle: 'italic',
      fontFamily: "'Inter', sans-serif",
      lineHeight: 1.5,
    }}>{text}</div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: '4px 0', opacity: 0.3 }} />
}

// ── Inline viewer ───────────────────────────────────────────────────────────

function FileViewer({ file, onClose }) {
  const [textContent, setTextContent] = useState(null)
  const [loadingText, setLoadingText] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const kind = fileKind(file.name)
  const url = file.url

  useEffect(() => {
    if (kind !== 'text') return
    setLoadingText(true)
    // /api/local/file returns {path, content, lastModified} — extract .content
    fetch(url)
      .then(r => r.json())
      .then(j => { setTextContent(j.content || ''); setLoadingText(false) })
      .catch(() => { setTextContent('Could not load file.'); setLoadingText(false) })
  }, [url, kind])

  // Shared content renderer — used both inline and in the expanded overlay
  function ContentBody({ maxH }) {
    const bodyStyle = maxH ? { maxHeight: maxH, overflow: 'auto' } : { flex: 1, overflow: 'auto' }
    return (
      <div style={bodyStyle}>
        {kind === 'image' && (
          <img src={url} alt={file.name} style={{ width: '100%', display: 'block' }} />
        )}
        {kind === 'video' && (
          <video src={url} controls style={{ width: '100%', display: 'block', maxHeight: expanded ? '80vh' : 200 }} />
        )}
        {kind === 'audio' && (
          <div style={{ padding: '10px' }}>
            <audio src={url} controls style={{ width: '100%' }} />
          </div>
        )}
        {kind === 'pdf' && (
          <iframe src={url} style={{ width: '100%', height: expanded ? '80vh' : 220, border: 'none', display: 'block' }} title={file.name} />
        )}
        {kind === 'text' && (
          <div style={{ padding: expanded ? '16px 20px' : '8px 12px', fontSize: expanded ? 13 : 11, color: C.text2, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {loadingText ? 'Loading…' : (textContent || '')}
          </div>
        )}
        {(kind === 'spreadsheet' || kind === 'doc' || kind === 'file') && (
          <div style={{ padding: '10px', textAlign: 'center' }}>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-block',
              padding: '7px 14px',
              background: C.accent,
              color: '#000',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              textDecoration: 'none',
              fontFamily: "'Inter', sans-serif",
            }}>Open {file.name}</a>
          </div>
        )}
      </div>
    )
  }

  // ── Expanded full-screen overlay ────────────────────────────────────────────
  if (expanded) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,10,20,0.95)',
        backdropFilter: 'blur(16px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: '1px solid ' + C.border,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 13, color: C.text, fontFamily: "'Inter', sans-serif",
            fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {file.name}
          </span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
            <button
              onClick={() => setExpanded(false)}
              title="Collapse"
              style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
            >⤡</button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: '0 0 0 4px', lineHeight: 1 }}
            >✕</button>
          </div>
        </div>
        {/* Full-height content */}
        <ContentBody />
      </div>
    )
  }

  // ── Inline compact viewer ────────────────────────────────────────────────────
  return (
    <div style={{
      margin: '0 8px 6px',
      borderRadius: 5,
      background: 'rgba(15,23,42,0.6)',
      border: '1px solid ' + C.border,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 10px',
        borderBottom: '1px solid ' + C.border,
      }}>
        <span style={{ fontSize: 11, color: C.text2, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
          <button
            onClick={() => setExpanded(true)}
            title="Expand to full view"
            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1 }}
          >⤢</button>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: '0 0 0 4px', lineHeight: 1 }}
          >✕</button>
        </div>
      </div>
      <ContentBody maxH={240} />
    </div>
  )
}

// ── Single file row ─────────────────────────────────────────────────────────

function FileRow({ file, isActive, onClick, indent = 0 }) {
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
          gap: 7,
          padding: `5px 12px 5px ${12 + indent * 10}px`,
          cursor: 'pointer',
          background: isActive ? 'rgba(16,185,129,0.06)' : 'transparent',
          borderLeft: isActive ? '2px solid ' + C.accent : '2px solid transparent',
          transition: 'background 120ms',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.s1 }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
      >
        {/* Type icon tile */}
        <div style={{
          width: 16,
          height: 16,
          borderRadius: 2,
          background: 'rgba(51,65,85,0.25)',
          border: '1px solid ' + C.border,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 8,
          color,
        }}>{icon}</div>

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
        {file.size && !file.age && (
          <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
            {file.size}
          </span>
        )}
      </div>
      {isActive && (
        <FileViewer file={file} onClose={onClick} />
      )}
    </>
  )
}

// ── Folder header (mission slug) ────────────────────────────────────────────

function FolderRow({ label, fileCount, isOpen, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 12px',
        cursor: 'pointer',
        borderLeft: isOpen ? '2px solid rgba(16,185,129,0.35)' : '2px solid transparent',
        background: isOpen ? 'rgba(16,185,129,0.03)' : 'transparent',
        transition: 'background 120ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = isOpen ? 'rgba(16,185,129,0.05)' : 'rgba(30,41,59,0.4)' }}
      onMouseLeave={e => { e.currentTarget.style.background = isOpen ? 'rgba(16,185,129,0.03)' : 'transparent' }}
    >
      <div style={{
        width: 16,
        height: 16,
        borderRadius: 2,
        background: 'rgba(16,185,129,0.10)',
        border: '1px solid rgba(16,185,129,0.25)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 8,
        color: C.accent,
      }}>📁</div>
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: 12,
        fontWeight: 500,
        color: C.accent,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        fontFamily: "'Inter', sans-serif",
      }}>{label}</span>
      <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
        {isOpen ? '▾' : '▸'} {fileCount}
      </span>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function FilesPanel({ projectSlug }) {
  const { worldId } = useCornerAuth()
  const [docFiles, setDocFiles] = useState([])    // { name, url, age, kind, section }
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeFile, setActiveFile] = useState(null)
  const [activeCat, setActiveCat] = useState('all')
  const [openFolders, setOpenFolders] = useState(new Set(['root']))  // open by default
  const [missions, setMissions] = useState([])  // [{slug, files:[]}]

  const world = worldId || 'aom'

  const handleFileClick = useCallback((file) => {
    setActiveFile(prev => (prev?.name === file.name && prev?.url === file.url) ? null : file)
  }, [])

  // Close open viewer when switching category filters (clean load)
  const handleCatChange = useCallback((cat) => {
    setActiveCat(cat)
    setActiveFile(null)
  }, [])

  const toggleFolder = useCallback((slug) => {
    setOpenFolders(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }, [])

  useEffect(() => {
    if (!projectSlug) return
    let cancelled = false
    setLoading(true)
    setDocFiles([])
    setUploadedFiles([])
    setMissions([])

    // Fetch 1: disk-based canon + research docs
    const docsPromise = authFetch(`/api/dashboard/project-files?slug=${encodeURIComponent(projectSlug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(body => {
        if (cancelled || !body) return
        // Root-level files
        const rootFiles = (body.files || []).map(f => ({
          name: f.name,
          url: `/api/local/file?path=${encodeURIComponent(f.path)}`,
          age: relativeAge(f.last_modified),
          kind: fileKind(f.name),
          section: 'root',
        }))
        if (!cancelled) setDocFiles(rootFiles)

        // Mission folders — open all by default so "All" shows full tree
        const missionGroups = (body.missions || []).map(m => ({
          slug: m.slug,
          files: (m.files || []).map(f => ({
            name: f.name,
            url: `/api/local/file?path=${encodeURIComponent(f.path)}`,
            age: relativeAge(f.last_modified),
            kind: fileKind(f.name),
            section: m.slug,
          })),
        }))
        if (!cancelled) {
          setMissions(missionGroups)
          // Open root + every mission folder so the full tree is visible on load
          setOpenFolders(new Set(['root', ...missionGroups.map(m => m.slug)]))
        }
      })
      .catch(() => {})

    // Fetch 2: Supabase Storage uploads
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
    return (
      <div>
        <CategoryFilters active={activeCat} onChange={handleCatChange} />
        <EmptyState text="Select a project to browse its files." />
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <CategoryFilters active={activeCat} onChange={handleCatChange} />
        <EmptyState text="Loading…" />
      </div>
    )
  }

  // All uploads: split media vs docs
  const mediaUploads = uploadedFiles.filter(f => ['video', 'audio', 'image'].includes(f.kind))
  const docUploads   = uploadedFiles.filter(f => !['video', 'audio', 'image'].includes(f.kind))

  // Merge doc uploads into root files
  const rootFiles = [...docFiles, ...docUploads]

  // Flatten all files for counting
  const allFiles = [
    ...rootFiles,
    ...mediaUploads,
    ...missions.flatMap(m => m.files),
  ]

  // Filter by active category
  function matchesCat(file) {
    if (activeCat === 'all') return true
    return fileCategory(file.kind) === activeCat
  }

  const filteredRoot     = rootFiles.filter(matchesCat)
  const filteredMedia    = mediaUploads.filter(matchesCat)
  const filteredMissions = missions.map(m => ({
    ...m,
    files: m.files.filter(matchesCat),
  })).filter(m => m.files.length > 0)

  const hasAnything = allFiles.length > 0
  const hasFiltered = filteredRoot.length > 0 || filteredMedia.length > 0 || filteredMissions.length > 0

  return (
    <div>

      {/* ── CATEGORY FILTERS ──────────────────────────────────── */}
      <CategoryFilters active={activeCat} onChange={handleCatChange} />

      {!hasAnything && (
        <EmptyState text="No files in this project yet." />
      )}

      {hasAnything && !hasFiltered && (
        <EmptyState text={`No ${activeCat} files in this project.`} />
      )}

      {hasFiltered && (
        <>
          {/* ── MEDIA (uploads: video/audio/image) ─────────────── */}
          {filteredMedia.length > 0 && (activeCat === 'all' || activeCat === 'media') && (
            <>
              <div style={{
                textTransform: 'uppercase', fontSize: 9, fontWeight: 700,
                color: C.muted, letterSpacing: '0.12em',
                padding: '10px 12px 5px',
                fontFamily: "'JetBrains Mono', monospace",
              }}>Media</div>
              <div style={{
                display: 'flex',
                gap: 5,
                padding: '0 12px 10px',
                overflowX: 'auto',
                flexWrap: 'nowrap',
              }}>
                {filteredMedia.map(f => (
                  <div
                    key={f.url}
                    onClick={() => handleFileClick(f)}
                    style={{
                      width: 68,
                      height: 52,
                      borderRadius: 5,
                      border: '1px solid ' + (activeFile?.url === f.url ? C.accent : C.border),
                      background: activeFile?.url === f.url ? 'rgba(16,185,129,0.08)' : 'rgba(15,23,42,0.4)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'border-color 120ms',
                    }}
                  >
                    {f.kind === 'image' ? (
                      <img src={f.url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>
                        <span style={{ fontSize: 16, color: kindColor(f.kind) }}>{kindIcon(f.kind)}</span>
                        <span style={{ fontSize: 8, color: C.muted, marginTop: 2, fontFamily: "'JetBrains Mono', monospace", padding: '0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 64, textAlign: 'center' }}>
                          {f.name.replace(/\.[^.]+$/, '').slice(0, 11)}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {activeFile && ['video', 'audio', 'image'].includes(fileKind(activeFile.name)) && mediaUploads.some(f => f.url === activeFile.url) && (
                <FileViewer file={activeFile} onClose={() => setActiveFile(null)} />
              )}
              <Divider />
            </>
          )}

          {/* ── ROOT FILES ─────────────────────────────────────── */}
          {filteredRoot.length > 0 && (
            <>
              <FolderRow
                label={projectSlug}
                fileCount={filteredRoot.length}
                isOpen={openFolders.has('root')}
                onClick={() => toggleFolder('root')}
              />
              {openFolders.has('root') && filteredRoot.map(f => (
                <FileRow
                  key={f.url}
                  file={f}
                  isActive={activeFile?.url === f.url}
                  onClick={() => handleFileClick(f)}
                  indent={1}
                />
              ))}
            </>
          )}

          {/* ── MISSION FOLDERS ────────────────────────────────── */}
          {filteredMissions.map(m => (
            <div key={m.slug}>
              <FolderRow
                label={m.slug}
                fileCount={m.files.length}
                isOpen={openFolders.has(m.slug)}
                onClick={() => toggleFolder(m.slug)}
              />
              {openFolders.has(m.slug) && m.files.map(f => (
                <FileRow
                  key={f.url}
                  file={f}
                  isActive={activeFile?.url === f.url}
                  onClick={() => handleFileClick(f)}
                  indent={1}
                />
              ))}
            </div>
          ))}
        </>
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}
