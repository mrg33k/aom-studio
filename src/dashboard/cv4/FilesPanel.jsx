// FilesPanel.jsx — CV4 Files tab (corner:right-menu R6)
//
// Layout (top → bottom inside the Files accordion tab):
//   CATEGORY FILTERS — All · Docs · Media · Sheets · PDFs
//   BREADCRUMB       — / > missions > website
//   FILE BROWSER     — folder tree (missions as folders, files inside)
//     inline viewer: images/video/audio open below the clicked row
//
// Data sources:
//   1. /api/dashboard/files?type=images&prefix={world}/{slug}/  — Supabase Storage uploads
//   2. /api/dashboard/files?type=uploads&client={world}[&project={slug}]  — chat-uploaded
//      files (RAG-tunnel storage, surfaced via the messages table). Added R79-f14
//      so screenshots dropped in chat appear under the Media filter.
//   3. /api/dashboard/files?type=text&client={world}  — text_files / scaffold MDs
//   4. /api/dashboard/project-files?slug={slug}  — disk-based files inside the
//      project + mission folders (canon + research drops + ANY deliverable an
//      agent creates in the mission home). Added R79-f15 (2026-05-25) so files
//      agents write to disk during a session appear automatically — no upload
//      step required. Bodies fetch via /api/dashboard/project-file?path=&raw=1
//      which streams the bytes with the right Content-Type.

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'
import { supabase } from '../lib/supabase.js'
import { useCornerAuth } from '../CornerContext.jsx'
import { FileContextMenu, useLongPress, useIsMobile } from '../components/cv3/ContextMenuVariants.jsx'
import useChatDispatch from '../components/cv3/useChatDispatch.js'
import ProjectFileReader from './ProjectFileReader.jsx'

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

function fileKind(name, mime) {
  const ext = fileExt(name)
  if (['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext)) return 'audio'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic'].includes(ext)) return 'image'
  if (['pdf'].includes(ext)) return 'pdf'
  if (['md', 'txt'].includes(ext)) return 'text'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'spreadsheet'
  if (['docx', 'doc'].includes(ext)) return 'doc'
  // Fallback to mime type when the extension is missing or unrecognized
  // (chat uploads sometimes arrive with quirky filenames but trustworthy mime).
  if (mime && typeof mime === 'string') {
    if (mime.startsWith('image/')) return 'image'
    if (mime.startsWith('video/')) return 'video'
    if (mime.startsWith('audio/')) return 'audio'
    if (mime === 'application/pdf') return 'pdf'
  }
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

function FileViewer({ file, onClose, onLinkClick }) {
  const [textContent, setTextContent] = useState(null)
  const [loadingText, setLoadingText] = useState(false)
  const [expanded, setExpanded] = useState(false)
  // R10-11: treat any .md / .txt / no-extension file as text. Old `fileKind`
  // returns 'file' for "VISION" (no extension) which silently skipped the
  // viewer load and rendered blank. Use a wider text detection here.
  const rawKind = fileKind(file.name)
  const looksLikeText = rawKind === 'text' || rawKind === 'file' || /\.(md|txt|json|yaml|yml|csv|log)$/i.test(file.name)
  const kind = looksLikeText ? 'text' : rawKind
  // R79-f5: render markdown bodies via the article-style ProjectFileReader
  // so links inside become clickable and onLinkClick can route in-place.
  // .md / no-extension canon files (VISION, CONTEXT, BUILD, RESEARCH, tape)
  // all qualify. .txt / .json / .yaml / .csv / .log stay in the raw pre
  // view because they're not authored markdown.
  const looksLikeMd = kind === 'text' && (
    /\.md$/i.test(file.name) ||
    !/\.[a-z0-9]+$/i.test(file.name)  // no extension → canon file
  )
  const url = file.url

  useEffect(() => {
    if (kind !== 'text') return
    // R10-11: inline content (passed by FilesPanel for canon rows) skips any
    // network round-trip — list response already includes the body.
    if (file.inlineContent != null) {
      setTextContent(file.inlineContent)
      setLoadingText(false)
      return
    }
    // For storage-served text files: GET the URL as raw text.
    //
    // R79-f15 (2026-05-25): use authFetch for same-origin /api/dashboard/* URLs
    // because verifyTenant expects a Bearer token from localStorage (not a
    // cookie). Plain fetch with credentials:'include' returns 401 here. For
    // off-origin URLs (Supabase Storage, RAG tunnel) keep the cookie path.
    setLoadingText(true)
    // Same-origin /api/dashboard/* needs the Bearer token (verifyTenant reads it
    // from Authorization, not from a cookie that we don't set). Off-origin URLs
    // (rag tunnel project-file-raw, Supabase Storage) don't need credentials,
    // and sending credentials with a wildcard CORS Allow-Origin triggers a
    // preflight failure — so we explicitly drop credentials in that case.
    const isLocalApi = typeof url === 'string' && url.startsWith('/api/dashboard/')
    const doFetch = isLocalApi ? authFetch(url) : fetch(url)
    doFetch
      .then(r => r.ok ? r.text() : 'Could not load file.')
      .then(t => {
        // Some endpoints wrap content in JSON; try parsing first.
        try {
          const j = JSON.parse(t)
          setTextContent(j?.content ?? j?.text ?? t)
        } catch {
          setTextContent(t)
        }
        setLoadingText(false)
      })
      .catch(() => { setTextContent('Could not load file.'); setLoadingText(false) })
  }, [url, kind, file.inlineContent])

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
        {kind === 'text' && !looksLikeMd && (
          <div style={{ padding: expanded ? '16px 20px' : '8px 12px', fontSize: expanded ? 13 : 11, color: C.text2, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {loadingText ? 'Loading…' : (textContent || '')}
          </div>
        )}
        {kind === 'text' && looksLikeMd && (
          loadingText
            ? <div style={{ padding: '12px', color: C.muted, fontSize: 12 }}>Loading…</div>
            : (
              <ProjectFileReader
                content={textContent || ''}
                kind={/last-conversation/i.test(file.name) ? 'tape'
                      : /\/research\//.test(file.relativePath || '') ? 'research-drop'
                      : 'canon'}
                name={file.name}
                lastModified={file._ts ? new Date(file._ts).toISOString() : ''}
                onLinkClick={onLinkClick}
              />
            )
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
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12, alignItems: 'center' }}>
            <a
              href={url}
              download={file.name}
              title="Download"
              style={{
                fontSize: 12, color: C.text2, textDecoration: 'none',
                padding: '6px 12px', border: `1px solid ${C.border2 || C.border}`, borderRadius: 6,
                fontFamily: "'Inter', sans-serif",
              }}
            >Download</a>
            <button
              onClick={() => setExpanded(false)}
              title="Collapse"
              aria-label="Collapse to inline viewer"
              style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
            >⤡</button>
            <button
              onClick={onClose}
              title="Close"
              aria-label="Close viewer"
              style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
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
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8, alignItems: 'center' }}>
          <a
            href={url}
            download={file.name}
            title="Download"
            style={{
              fontSize: 10, color: C.text2, textDecoration: 'none',
              padding: '3px 8px', border: `1px solid ${C.border2 || C.border}`, borderRadius: 4,
              fontFamily: "'Inter', sans-serif",
            }}
          >Download</a>
          <button
            onClick={() => setExpanded(true)}
            title="Expand to full view"
            aria-label="Expand viewer"
            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: '0 3px', lineHeight: 1 }}
          >⤢</button>
          <button
            onClick={onClose}
            title="Close"
            aria-label="Close viewer"
            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, padding: '0 3px', lineHeight: 1 }}
          >✕</button>
        </div>
      </div>
      <ContentBody maxH={240} />
    </div>
  )
}

// ── Single file row ─────────────────────────────────────────────────────────

function FileRow({ file, isActive, onClick, onContextMenu, onLongPress, indent = 0, onLinkClick }) {
  const longPressHandlers = useLongPress(
    onLongPress ? (x, y) => onLongPress(x, y, file) : null
  )
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
        onContextMenu={onContextMenu}
        {...(longPressHandlers || {})}
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
        <FileViewer file={file} onClose={onClick} onLinkClick={onLinkClick} />
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

// R10-9 rewrite: real folder tree from Supabase Storage paths + text_files.
// Recursive list returns every file with a relativePath; we build a nested
// tree client-side. Folders collapse / expand. Category filter dims the
// tree to matching kinds only (keeps folder skeleton so structure stays
// legible). Patrik 2026-05-25: "we want to see the real structure subfolders
// and all."

// ── Tree builder ──────────────────────────────────────────────────────────
// Input: [{ name, relativePath, url, ...}, ...]
// Output: nested folder tree:
//   { children: Map<folderName, node>, files: [] }
function buildTree(items) {
  const root = { children: new Map(), files: [] }
  for (const item of items) {
    const parts = (item.relativePath || item.name || '').split('/').filter(Boolean)
    if (parts.length === 0) continue
    let node = root
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!node.children.has(part)) node.children.set(part, { children: new Map(), files: [] })
      node = node.children.get(part)
    }
    node.files.push({ ...item, displayName: parts[parts.length - 1] })
  }
  return root
}

// Total file count (recursive) — for empty-state + folder header counts.
function countFiles(node, filterFn) {
  let count = filterFn ? node.files.filter(filterFn).length : node.files.length
  for (const child of node.children.values()) count += countFiles(child, filterFn)
  return count
}

// ── Folder/file tree renderer ─────────────────────────────────────────────
function TreeNode({name, node, depth, openFolders, toggleFolder, activeFile, onFileClick, filterFn, pathKey, onFileContextMenu, onFileLongPress, onLinkClick}) {
  const isOpen = openFolders.has(pathKey)
  const fileCount = countFiles(node, filterFn)

  // Don't render empty folders (after filter)
  if (filterFn && fileCount === 0) return null

  return (
    <>
      <FolderRow
        label={name}
        fileCount={fileCount}
        isOpen={isOpen}
        onClick={() => toggleFolder(pathKey)}
      />
      {isOpen && (
        <>
          {[...node.children.entries()].map(([childName, childNode]) => (
            <TreeNode
              key={pathKey + '/' + childName}
              name={childName}
              node={childNode}
              depth={depth + 1}
              openFolders={openFolders}
              toggleFolder={toggleFolder}
              activeFile={activeFile}
              onFileClick={onFileClick}
              filterFn={filterFn}
              pathKey={pathKey + '/' + childName}
              onFileContextMenu={onFileContextMenu}
              onFileLongPress={onFileLongPress}
              onLinkClick={onLinkClick}
            />
          ))}
          {node.files.filter(filterFn || (() => true)).map(f => (
            <FileRow
              key={f.url}
              file={{ ...f, name: f.displayName || f.name }}
              isActive={activeFile?.url === f.url}
              onClick={() => onFileClick(f)}
              onContextMenu={onFileContextMenu ? (e) => onFileContextMenu(e, f) : undefined}
              onLongPress={onFileLongPress}
              indent={depth + 1}
              onLinkClick={onLinkClick}
            />
          ))}
        </>
      )}
    </>
  )
}

export default function FilesPanel({ projectSlug }) {
  const { worldId } = useCornerAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeFile, setActiveFile] = useState(null)
  const [activeCat, setActiveCat] = useState('all')
  // R3 — right-click + long-press context menu
  const [ctxMenu, setCtxMenu] = useState(null) // { x, y, file } | null
  const isMobile = useIsMobile()
  // Folder open-state keyed by tree path ("" = root, "foo/bar" = nested)
  const [openFolders, setOpenFolders] = useState(new Set(['']))

  // R79-f4 — Realtime refresh trigger. Bumped by the watcher subscription
  // below; the main fetch useEffect depends on it so a bump re-runs the
  // four parallel fetches without resetting `activeFile` (we don't want to
  // boot the user out of an open viewer just because a sibling file landed).
  const [refreshTick, setRefreshTick] = useState(0)
  const refreshDebounceRef = useRef(null)
  const bumpRefresh = useCallback(() => {
    // 800ms debounce coalesces bursts (multi-file copies, mass canon syncs).
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
    refreshDebounceRef.current = setTimeout(() => {
      setRefreshTick((t) => t + 1)
      refreshDebounceRef.current = null
    }, 800)
  }, [])

  const world = worldId || 'aom'

  const handleFileClick = useCallback((file) => {
    setActiveFile(prev => (prev?.name === file.name && prev?.url === file.url) ? null : file)
  }, [])

  const handleCatChange = useCallback((cat) => {
    setActiveCat(cat)
    setActiveFile(null)
  }, [])

  const toggleFolder = useCallback((key) => {
    setOpenFolders(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // R3 — open ctx menu from right-click (desktop) or long-press (mobile)
  const openCtxMenu = useCallback((x, y, file) => {
    setCtxMenu({ x, y, file })
  }, [])
  const closeCtxMenu = useCallback(() => setCtxMenu(null), [])
  const handleFileContextMenu = useCallback((e, file) => {
    e.preventDefault()
    openCtxMenu(e.clientX, e.clientY, file)
  }, [openCtxMenu])

  // Action handlers — agent-routed (Research/Summarize/Pull quotes) drop into
  // active chat via useChatDispatch. Copy path is direct utility. Reveal jumps
  // to the file's mission home in the file panel.
  const dispatchToChat = useChatDispatch()
  const handleAgentPrompt = useCallback(async (text) => {
    closeCtxMenu()
    const r = await dispatchToChat(text)
    if (!r?.ok) console.warn('[FilesPanel] chat dispatch failed', r)
  }, [dispatchToChat, closeCtxMenu])
  const handleCtxReveal = useCallback((file) => {
    closeCtxMenu()
    // Reveal = expand the mission folder + scroll the row into view if mission known.
    const m = file?.mission || file?.mission_slug
    if (m) try { setOpenFolders(prev => new Set([...prev, m, ''])) } catch (_) {}
  }, [closeCtxMenu])
  const handleCtxCopyPath = useCallback(() => { closeCtxMenu() }, [closeCtxMenu])

  // R79-f5 — intra-mission link routing. When the user clicks a link inside
  // a rendered MD body, resolve the href against the active file's relative
  // path and swap activeFile to the matching loaded file. External links
  // (http/https) are already routed in ProjectFileReader to open in a new
  // tab, so we never see them here.
  const handleLinkClick = useCallback((href) => {
    if (!activeFile || typeof href !== 'string' || !href) return
    // Strip the hash so we can fall back to in-file scroll for pure anchors.
    const hashIdx = href.indexOf('#')
    const cleanHref = hashIdx >= 0 ? href.slice(0, hashIdx) : href
    const anchor = hashIdx >= 0 ? href.slice(hashIdx + 1) : null
    // Pure anchor (#section) — keep the current file, attempt in-place scroll.
    if (!cleanHref && anchor) {
      try {
        const article = document.querySelector('[data-cv4-reader-body]')
        const el = article && (article.querySelector(`#${CSS.escape(anchor)}`)
                              || [...article.querySelectorAll('h1,h2,h3,h4,h5,h6')]
                                  .find(h => (h.textContent || '').trim().toLowerCase()
                                    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === anchor))
        if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } catch (_) {}
      return
    }
    // Resolve the cleanHref against the active file's directory.
    let segs
    if (cleanHref.startsWith('/')) {
      segs = cleanHref.replace(/^\/+/, '').split('/')
    } else {
      segs = (activeFile.relativePath || '').split('/').slice(0, -1)
      for (const part of cleanHref.split('/')) {
        if (part === '' || part === '.') continue
        if (part === '..') { segs.pop(); continue }
        segs.push(part)
      }
    }
    const resolvedPath = segs.join('/')
    // Match priorities: exact relativePath > suffix '/'+path > exact name.
    const target =
      files.find(f => f.relativePath === resolvedPath) ||
      files.find(f => (f.relativePath || '').endsWith('/' + resolvedPath)) ||
      files.find(f => f.name === resolvedPath || f.name === resolvedPath.split('/').pop())
    if (target) {
      setActiveFile(target)
      // Anchor handling after the body has had time to render — kept simple,
      // a 200ms delay matches the typical mount cost for the new reader.
      if (anchor) {
        setTimeout(() => {
          try {
            const article = document.querySelector('[data-cv4-reader-body]')
            const el = article && [...article.querySelectorAll('h1,h2,h3,h4,h5,h6')]
              .find(h => (h.textContent || '').trim().toLowerCase()
                .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === anchor)
            if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          } catch (_) {}
        }, 200)
      }
    } else if (typeof console !== 'undefined' && console.warn) {
      console.warn('[FilesPanel] link did not resolve', { href, resolved: resolvedPath, fromFile: activeFile.relativePath })
    }
  }, [activeFile, files])

  // R79-f4 + R79-f12 — live updates.
  //
  // The rag-server watcher (scripts/rag-server.py) emits three kinds of
  // signals into Supabase that the FilesPanel cares about:
  //   1. messages INSERT with metadata.auto_share=true — a non-canon file
  //      landed (screenshot, deliverable, attachment). [R79-f4-a]
  //   2. events INSERT with event_type=canon_changed — VISION / CONTEXT /
  //      BUILD / RESEARCH / last-conversation got edited in this project
  //      or one of its missions. [R79-f4-b]
  //   3. events INSERT with event_type=tree_changed — a new mission was
  //      scaffolded, or a dated `research/` / `screenshots/` folder was
  //      created/removed. [R79-f12]
  //
  // On any of those, we debounce-coalesce 800ms then bump refreshTick so
  // the main fetch useEffect below re-runs. No new tables, no polling.
  useEffect(() => {
    if (!world) return
    const channelName = `files-panel-${world}-${projectSlug || 'all'}`
    const channel = supabase.channel(channelName)
      // f4-a — auto-share message rows
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `client_id=eq.${world}`,
        },
        (payload) => {
          const m = payload?.new?.metadata
          if (!m?.auto_share) return
          // When the panel is scoped to a project, ignore rows for other
          // projects so we don't refetch on every world-wide auto-share.
          if (projectSlug && payload.new.project && payload.new.project !== projectSlug) return
          bumpRefresh()
        },
      )
      // f4-b — canon edits
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: 'event_type=eq.canon_changed',
        },
        (payload) => {
          const p = payload?.new?.payload
          if (projectSlug && p?.project && p.project !== projectSlug) return
          bumpRefresh()
        },
      )
      // f12 — tree structure changes (new mission scaffolded, etc.)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: 'event_type=eq.tree_changed',
        },
        (payload) => {
          const p = payload?.new?.payload
          if (projectSlug && p?.project && p.project !== projectSlug) return
          bumpRefresh()
        },
      )
      .subscribe()

    return () => {
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current)
        refreshDebounceRef.current = null
      }
      supabase.removeChannel(channel)
    }
  }, [world, projectSlug, bumpRefresh])

  // R79-f4: track the (world, projectSlug) the panel was loaded with so we
  // only wipe `files` / `activeFile` when the scope actually changes. A
  // refreshTick bump (live-update) refetches without booting the user out
  // of an open viewer or flashing the loading state.
  const scopeKeyRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    const scopeKey = `${world}::${projectSlug || ''}`
    const scopeChanged = scopeKeyRef.current !== scopeKey
    scopeKeyRef.current = scopeKey
    if (scopeChanged) {
      setLoading(true)
      setFiles([])
      setActiveFile(null)
    }

    // Project-scoped if a project is selected, else all world files.
    const prefix = projectSlug ? `${world}/${projectSlug}/` : `${world}/`

    // Recursive Supabase Storage walk (every file under prefix with full path).
    const uploadsP = authFetch(`/api/dashboard/files?type=images&recursive=1&prefix=${encodeURIComponent(prefix)}`)
      .then(r => r.ok ? r.json() : null)
      .then(body => (body?.files || []).map(f => ({
        name: f.name,
        relativePath: f.relativePath || f.name,
        url: f.url,
        age: relativeAge(f.date),
        kind: fileKind(f.name),
        size: f.size,
        _ts: f.date ? new Date(f.date).getTime() : 0,
      })))
      .catch(() => [])

    // Chat-uploaded files (RAG-tunnel storage, mined from the messages table).
    // R79-f14 (2026-05-25): screenshots dropped in chat now appear under the
    // Media filter without waiting on a tunnel-list endpoint or a storage
    // migration.
    const chatUploadsP = authFetch(
      `/api/dashboard/files?type=uploads&client=${encodeURIComponent(world)}${projectSlug ? `&project=${encodeURIComponent(projectSlug)}` : ''}`
    )
      .then(r => r.ok ? r.json() : null)
      .then(body => (body?.files || []).map(f => ({
        name: f.name,
        relativePath: f.relativePath || f.name,
        url: f.url,
        age: relativeAge(f.date),
        kind: fileKind(f.name, f.mime),
        size: f.size,
        mime: f.mime,
        _ts: f.date ? new Date(f.date).getTime() : 0,
      })))
      .catch(() => [])

    // text_files / scaffold MDs (mission canon: VISION/CONTEXT/BUILD/RESEARCH).
    // These live under the project slug as their client_id. R10-11: use the
    // real filename path (e.g. "research/README.md") instead of wrapping under
    // a virtual "canon/" folder — the filename IS the structure. Also stash the
    // inline content so FileViewer can render it without a broken re-fetch.
    const textP = authFetch(`/api/dashboard/files?type=text&client=${encodeURIComponent(world)}`)
      .then(r => r.ok ? r.json() : null)
      .then(body => (body?.files || body || []).map(f => {
        const proj = f.client_id || f.project || f.project_slug || null
        const filename = f.filename || f.name || 'untitled.md'
        const relativePath = projectSlug
          ? filename                          // already relative to project root
          : `${proj || 'unknown'}/${filename}`
        const leafName = filename.split('/').pop()
        return {
          name: leafName,
          relativePath,
          url: `text://${proj || 'unknown'}/${filename}`,  // synthetic; FileViewer reads inline content
          inlineContent: f.content || '',
          age: relativeAge(f.updated_at || f.created_at),
          kind: fileKind(leafName),
          size: null,
          textProject: proj,
          _ts: (f.updated_at || f.created_at) ? new Date(f.updated_at || f.created_at).getTime() : 0,
        }
      }))
      .catch(() => [])

    // R79-f15 (2026-05-25): disk files inside the project + mission home. This
    // is what catches files an agent creates with Write/Bash directly on disk
    // (decks, exports, screenshots dropped into a mission's deliverables/
    // folder, etc.). The endpoint walks the project + mission trees and
    // emits one entry per non-hidden file. We map every entry to a
    // /api/dashboard/project-file?path=&raw=1 URL so the FileViewer can show
    // images / pdfs inline and offer a click-through for other binaries.
    // R79-f15: build the file URL using the rag tunnel directly so that
    // <img>/<video>/<iframe>/<a> can fetch bytes without auth headers (the
    // browser can't add a Bearer header to a direct asset load). Same trust
    // posture as the existing /files/<world>/<file> chat-attachment route —
    // rag-server applies the hidden-segment filter. Text-mode FileViewer can
    // still use authFetch when it wants the Vercel-proxied path.
    const RAG_TUNNEL = 'https://rag.aheadofmarket.com'
    const fileUrlFor = (fullPath) => `${RAG_TUNNEL}/project-file-raw?path=${encodeURIComponent(fullPath)}`

    const projectFilesP = projectSlug
      ? authFetch(`/api/dashboard/project-files?slug=${encodeURIComponent(projectSlug)}`)
          .then(r => r.ok ? r.json() : null)
          .then(body => {
            if (!body) return []
            const out = []
            // Project-root files: relativePath is just the filename (or
            // relative_path from the API for nested deliverables).
            for (const f of (body.files || [])) {
              const rel = f.relative_path || f.name
              const fullPath = f.path
              if (!fullPath) continue
              out.push({
                name: f.name,
                relativePath: rel,
                url: fileUrlFor(fullPath),
                age: relativeAge(f.last_modified),
                kind: fileKind(f.name),
                size: null,
                _ts: f.last_modified ? new Date(f.last_modified).getTime() : 0,
                fromDisk: true,
              })
            }
            // Mission files: prefix relativePath with missions/<slug>/ so the
            // tree groups them under the mission folder.
            for (const m of (body.missions || [])) {
              for (const f of (m.files || [])) {
                const inner = f.relative_path || f.name
                const rel = `missions/${m.slug}/${inner}`
                const fullPath = f.path
                if (!fullPath) continue
                out.push({
                  name: f.name,
                  relativePath: rel,
                  url: fileUrlFor(fullPath),
                  age: relativeAge(f.last_modified),
                  kind: fileKind(f.name),
                  size: null,
                  _ts: f.last_modified ? new Date(f.last_modified).getTime() : 0,
                  fromDisk: true,
                  missionSlug: m.slug,
                })
              }
            }
            return out
          })
          .catch(() => [])
      : Promise.resolve([])

    Promise.all([uploadsP, textP, chatUploadsP, projectFilesP]).then(([uploads, texts, chatUploads, diskFiles]) => {
      if (cancelled) return
      // Project-scope text files (skip ones tagged for other projects).
      const scopedTexts = projectSlug
        ? texts.filter(t => !t.textProject || t.textProject === projectSlug)
        : texts
      // Dedupe by relativePath — Storage uploads (freshly mirrored) shadow
      // the events-table scaffold rows that carry the same canonical filename.
      // Storage uploads come first, then chat uploads (RAG tunnel), then text
      // scaffolds. We dedupe on URL primarily (chat uploads have unique RAG
      // URLs) and on normalized name (so an upload named CONTEXT.md doesn't
      // double-render alongside the scaffold).
      const seen = new Set()
      const seenUrls = new Set()
      // Order matters: storage > chat uploads > disk files > scaffold rows.
      // Disk files (R79-f15) cover the same canonical paths as the scaffold
      // rows for VISION/CONTEXT/BUILD/RESEARCH, but with fresher mtimes and
      // real on-disk locations — they win the dedup so the viewer reads the
      // file the agent actually wrote to.
      const merged = [...uploads, ...chatUploads, ...diskFiles, ...scopedTexts].filter(f => {
        if (!f.url) return false
        if (seenUrls.has(f.url)) return false
        seenUrls.add(f.url)
        const key = f.relativePath || f.name || f.url
        // Normalize: events scaffold might be 'CONTEXT', upload is 'CONTEXT.md'.
        const norm = key.toLowerCase().replace(/\.(md|txt|json|yaml|yml)$/, '')
        if (seen.has(norm)) return false
        seen.add(norm)
        return true
      })
      setFiles(merged)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [projectSlug, world, refreshTick])

  const tree = useMemo(() => buildTree(files), [files])
  const filterFn = activeCat === 'all'
    ? null
    : (f) => fileCategory(f.kind) === activeCat

  const visibleCount = filterFn ? countFiles(tree, filterFn) : files.length

  return (
    <div>
      <CategoryFilters active={activeCat} onChange={handleCatChange} />

      {loading && <EmptyState text="Loading…" />}

      {!loading && files.length === 0 && (
        <EmptyState text={projectSlug
          ? `No files in ${projectSlug} yet. Upload from chat to see them here.`
          : 'No files yet. Upload from chat to see them here.'} />
      )}

      {!loading && files.length > 0 && visibleCount === 0 && (
        <EmptyState text={`No ${activeCat} files${projectSlug ? ` in ${projectSlug}` : ''}.`} />
      )}

      {/* Top-level files (no folder) */}
      {!loading && tree.files.filter(filterFn || (() => true)).map(f => (
        <FileRow
          key={f.url}
          file={{ ...f, name: f.displayName || f.name }}
          isActive={activeFile?.url === f.url}
          onClick={() => handleFileClick(f)}
          onContextMenu={(e) => handleFileContextMenu(e, f)}
          onLongPress={openCtxMenu}
          indent={0}
          onLinkClick={handleLinkClick}
        />
      ))}

      {/* Folder tree */}
      {!loading && [...tree.children.entries()].map(([name, child]) => (
        <TreeNode
          key={name}
          name={name}
          node={child}
          depth={0}
          openFolders={openFolders}
          toggleFolder={toggleFolder}
          activeFile={activeFile}
          onFileClick={handleFileClick}
          filterFn={filterFn}
          pathKey={name}
          onFileContextMenu={handleFileContextMenu}
          onFileLongPress={openCtxMenu}
          onLinkClick={handleLinkClick}
        />
      ))}

      {activeFile && (
        <FileViewer file={activeFile} onClose={() => setActiveFile(null)} onLinkClick={handleLinkClick} />
      )}

      <FileContextMenu
        open={!!ctxMenu}
        x={ctxMenu?.x || 0}
        y={ctxMenu?.y || 0}
        file={ctxMenu?.file || null}
        mobile={isMobile}
        onClose={closeCtxMenu}
        onAgentPrompt={handleAgentPrompt}
        onCopyPath={handleCtxCopyPath}
        onReveal={handleCtxReveal}
      />

      <div style={{ height: 16 }} />
    </div>
  )
}
