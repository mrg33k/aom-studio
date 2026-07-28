// CornerFilesPanel — CV4 redesign of the project files surface.
//
// Five canonical files flat at top (VISION/CONTEXT/BUILD/RESEARCH/PHONEBOOK),
// collapsible folder groups below (Project history & rules, missions/,
// research/, archive/, assets/). Mirrors the cv4-explore-v2 prototype at
// components/files-panel.html. Replaces the older CanonFilesPanel.jsx.
// Mission: corner:files-in-app (R-FIP-1, 2026-05-18).
import { useState, useEffect, useMemo } from 'react'
// r7:open-agent-surface — file-content is world-gated now; send the session.
import { authFetch } from '../../../lib/authFetch.js'
import { C } from '../../../lib/cv3Colors.js'
import { useChatCore, useChatSettingsCtx } from '../chat/ChatPanelContext.jsx'

const CANONICAL = [
  { filename: 'VISION.md',    label: 'VISION'    },
  { filename: 'CONTEXT.md',   label: 'CONTEXT'   },
  { filename: 'BUILD.md',     label: 'BUILD'     },
  { filename: 'RESEARCH.md',  label: 'RESEARCH'  },
  { filename: 'PHONEBOOK.md', label: 'PHONEBOOK' },
]
const CANONICAL_NAMES = new Set(CANONICAL.map(c => c.filename))
const HISTORY_GROUP = new Set([
  'history.md', 'last-conversation.md', 'rules.md', 'decisions.md',
])

function timeAgo(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return ''
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}w ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildTree(files) {
  const canonical = new Map()
  const history = []
  const folders = new Map()
  for (const f of files) {
    const name = String(f.filename || '')
    if (!name) continue
    if (name.includes('/')) {
      const [folder, ...rest] = name.split('/')
      const subName = rest.join('/')
      if (!folders.has(folder)) folders.set(folder, [])
      folders.get(folder).push({ ...f, subName })
      continue
    }
    if (CANONICAL_NAMES.has(name)) {
      canonical.set(name, f)
    } else if (HISTORY_GROUP.has(name)) {
      history.push(f)
    } else {
      // Fall-through misc top-level → "Project history & rules" too, so
      // the panel doesn't drop files it doesn't know how to categorize.
      history.push(f)
    }
  }
  const canonicalRows = CANONICAL.map(c => ({
    ...c,
    file: canonical.get(c.filename) || null,
  }))
  const folderRows = []
  if (history.length) {
    folderRows.push({
      name: 'Project history & rules',
      isHistory: true,
      files: history.sort((a, b) => (a.filename || '').localeCompare(b.filename || '')),
    })
  }
  const folderOrder = ['missions', 'research', 'archive', 'assets']
  for (const fname of folderOrder) {
    if (folders.has(fname)) {
      folderRows.push({
        name: `${fname}/`,
        files: folders.get(fname).sort((a, b) => (a.subName || '').localeCompare(b.subName || '')),
      })
    }
  }
  for (const [fname, list] of folders.entries()) {
    if (folderOrder.includes(fname)) continue
    folderRows.push({
      name: `${fname}/`,
      files: list.sort((a, b) => (a.subName || '').localeCompare(b.subName || '')),
    })
  }
  return { canonicalRows, folderRows }
}

function FileRow({ label, meta, active, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 10px',
        borderRadius: 5,
        cursor: 'pointer',
        background: active ? 'rgba(251,191,36,0.10)'
          : hov ? 'rgba(255,255,255,0.05)' : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <span style={{ fontSize: 13, color: C.text2, width: 18, textAlign: 'center', flexShrink: 0 }}>📄</span>
      <span style={{
        flex: 1, fontSize: 13, fontWeight: 600, color: C.text,
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{label}</span>
      {meta && (
        <span style={{
          fontSize: 11, color: C.muted,
          fontFamily: "'JetBrains Mono', monospace",
          flexShrink: 0,
        }}>{meta}</span>
      )}
    </div>
  )
}

function FolderRow({ folder, open, onToggle, onOpenFile }) {
  const [hov, setHov] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        onClick={onToggle}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 10px', borderRadius: 5,
          cursor: 'pointer',
          background: hov ? 'rgba(255,255,255,0.05)' : 'transparent',
          transition: 'background 0.12s',
          userSelect: 'none',
        }}
        aria-expanded={open ? 'true' : 'false'}
      >
        <span style={{
          fontSize: 10, color: C.muted, width: 14, textAlign: 'center', flexShrink: 0,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          display: 'inline-block',
        }}>▶</span>
        <span style={{
          flex: 1, fontSize: 13, color: C.text2,
          fontFamily: "'Inter', sans-serif",
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontStyle: folder.isHistory ? 'normal' : 'normal',
        }}>{folder.name}</span>
        <span style={{
          fontSize: 11, color: C.muted,
          background: 'rgba(26,36,56,0.5)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 3,
          padding: '1px 6px',
          fontFamily: "'JetBrains Mono', monospace",
          flexShrink: 0,
          minWidth: 22,
          textAlign: 'center',
        }}>{folder.files.length}</span>
      </div>
      {open && (
        <div style={{
          paddingLeft: 22,
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          marginLeft: 17,
          paddingTop: 2, paddingBottom: 2,
        }}>
          {folder.files.map(f => {
            const subName = f.subName || f.filename
            return (
              <div
                key={f.id || f.filename}
                onClick={() => onOpenFile(f)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '5px 10px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12, color: C.text2,
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 11, color: C.muted, width: 14, textAlign: 'center', flexShrink: 0 }}>─</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subName}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CornerFilesPanel() {
  const { selectedProject, worldId } = useChatCore()
  const { setCanonFilesOpen } = useChatSettingsCtx()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [openFile, setOpenFile] = useState(null)
  const [fileHtml, setFileHtml] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [openFolders, setOpenFolders] = useState({})

  const projectSlug = selectedProject?.slug
  const projectName = selectedProject?.name || projectSlug || ''

  useEffect(() => {
    if (!projectSlug) { setFiles([]); return }
    setLoading(true)
    fetch(`/api/dashboard/files?type=text&client=${encodeURIComponent(projectSlug)}`)
      .then(r => r.json())
      .then(data => { setFiles(data.files || []); setLoading(false) })
      .catch(() => { setFiles([]); setLoading(false) })
  }, [projectSlug])

  const { canonicalRows, folderRows } = useMemo(() => buildTree(files), [files])

  async function openFileByName(entry) {
    setOpenFile(entry)
    setFileHtml('')
    setFileLoading(true)
    try {
      const filename = entry.filename || entry.subName || ''
      let url = `/api/dashboard/file-content?project=${encodeURIComponent(projectSlug)}&filename=${encodeURIComponent(filename)}`
      if (worldId) url += `&client_id=${encodeURIComponent(worldId)}`
      const res = await authFetch(url)
      if (res.ok) {
        const data = await res.json()
        setFileHtml(data.content || '')
      } else if (res.status === 404) {
        setFileHtml('<p style="color:#94A3B8;font-family:Inter;font-size:14px">This file hasn\'t been created yet.</p>')
      } else {
        setFileHtml('<p style="color:#94A3B8;font-family:Inter;font-size:14px">File not available.</p>')
      }
    } catch {
      setFileHtml('<p style="color:#94A3B8;font-family:Inter;font-size:14px">Failed to load file.</p>')
    }
    setFileLoading(false)
  }

  if (!projectSlug) return null

  // ── Article reader overlay ──────────────────────────────────────────────
  if (openFile) {
    return (
      <div
        data-testid="canon-file-viewer"
        style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: C.bg,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 20px 14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => { setOpenFile(null); setFileHtml('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              minWidth: 44, minHeight: 44,
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, padding: '0 8px', borderRadius: 8,
              fontFamily: "'Inter', sans-serif", fontSize: 13,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 700, color: C.text,
              fontFamily: "'Inter', sans-serif",
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{openFile.label || openFile.subName || openFile.filename}</div>
            <div style={{ fontSize: 11, color: C.dim, fontFamily: "'Inter', sans-serif", marginTop: 2 }}>{projectName}</div>
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 56px' }}>
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

  // ── Files panel ─────────────────────────────────────────────────────────
  return (
    <div
      data-testid="corner-files-panel"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,14,28,0.97)',
        flexShrink: 0,
        padding: '12px 14px',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 12,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: C.muted,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          fontFamily: "'Inter', sans-serif",
        }}>Files</span>
        <span style={{
          fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace",
        }}>{projectName}</span>
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

      {/* Canonical files (flat) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10 }}>
        {canonicalRows.map(row => (
          <FileRow
            key={row.filename}
            label={row.label}
            meta={row.file ? timeAgo(row.file.updated_at) : ''}
            onClick={() => openFileByName({ filename: row.filename, label: row.label })}
          />
        ))}
      </div>

      {(loading || folderRows.length > 0) && (
        <div style={{
          height: 1, background: 'rgba(255,255,255,0.06)',
          margin: '10px 0 12px',
        }} />
      )}

      {/* Folder rows (collapsed by default) */}
      {loading ? (
        <div style={{ fontSize: 12, color: C.muted, padding: '8px 10px' }}>Loading…</div>
      ) : folderRows.length === 0 ? (
        <div style={{ fontSize: 12, color: C.muted, padding: '8px 10px' }}>No other files yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {folderRows.map(folder => (
            <FolderRow
              key={folder.name}
              folder={folder}
              open={!!openFolders[folder.name]}
              onToggle={() => setOpenFolders(s => ({ ...s, [folder.name]: !s[folder.name] }))}
              onOpenFile={openFileByName}
            />
          ))}
        </div>
      )}
    </div>
  )
}
