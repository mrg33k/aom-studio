// FilesPanel.jsx — CV4 Files tab (corner:right-menu R6)
//
// Layout (top → bottom inside the Files accordion tab):
//   CATEGORY FILTERS — All · Docs · Media · Sheets · PDFs
//   BREADCRUMB       — / > missions > website
//   FILE BROWSER     — folder tree (missions as folders, files inside)
//     inline viewer: images/video/audio open below the clicked row
//
// Data sources (post-R79-f23 Leg 2 R3, three sources):
//   1. rag-server /list-chat-files  — single source of truth for per-chat
//      uploads. Walks the active chat's Uploads/ folder AND merges legacy
//      flat-root attachments from the messages table (R79-f23 Leg 2 R0/R1/R4).
//   2. /api/dashboard/project-files?slug={slug}  — disk-based files inside the
//      project + mission folders (canon + research drops + ANY deliverable an
//      agent creates in the mission home). Added R79-f15 (2026-05-25). Bodies
//      fetch via /api/dashboard/project-file?path=&raw=1 which streams the
//      bytes with the right Content-Type.
//   3. /api/dashboard/files?type=text&client={world}  — text_files / scaffold
//      MDs (events-table mirror; secondary to projectFilesP for canon docs).
//
// Retired sources:
//   • /api/dashboard/files?type=images  — Supabase Storage bucket reader,
//     retired R79-f23 Leg 2 R3 (2026-05-30). Pillar 7 forbids user files in
//     Supabase. Bucket holds only stale canon-MD mirrors + one mp4 already
//     surfaced by projectFilesP. See research/2026-05-30-r3-storage-bucket-audit.md.
//   • /api/dashboard/files?type=uploads  — chat-upload metadata filter,
//     retired R79-f23 Leg 2 R2 (2026-05-30). Functionality moved to source #1
//     via the new rag-server walk endpoint + legacy-attachment merge.

import { useEffect, useState, useCallback, useMemo } from 'react'
import { C } from '../lib/cv3Colors.js'
import { FolderIcon, MissionIcon } from './lib/uiKit.jsx'
import { authFetch } from '../lib/authFetch.js'
import { supabase } from '../lib/supabase.js'
import { useCornerAuth } from '../CornerContext.jsx'
import { FileContextMenu, useLongPress, useIsMobile } from '../components/cv3/ContextMenuVariants.jsx'
import useChatDispatch from '../components/cv3/useChatDispatch.js'

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
      fontFamily: "'Hanken Grotesk', sans-serif",
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
  // R10-11: treat any .md / .txt / no-extension file as text. Old `fileKind`
  // returns 'file' for "VISION" (no extension) which silently skipped the
  // viewer load and rendered blank. Use a wider text detection here.
  const rawKind = fileKind(file.name)
  const looksLikeText = rawKind === 'text' || rawKind === 'file' || /\.(md|txt|json|yaml|yml|csv|log)$/i.test(file.name)
  const kind = looksLikeText ? 'text' : rawKind
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
              fontFamily: "'Hanken Grotesk', sans-serif",
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
            fontSize: 13, color: C.text, fontFamily: "'Hanken Grotesk', sans-serif",
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
                fontFamily: "'Hanken Grotesk', sans-serif",
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
        <span style={{ fontSize: 11, color: C.text2, fontFamily: "'Hanken Grotesk', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              fontFamily: "'Hanken Grotesk', sans-serif",
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

function FileRow({ file, isActive, onClick, onContextMenu, onLongPress, indent = 0, isSelected = false, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const longPressHandlers = useLongPress(
    onLongPress ? (x, y) => onLongPress(x, y, file) : null
  )
  const kind = fileKind(file.name)
  const icon = kindIcon(kind)
  const color = kindColor(kind)
  const displayName = file.name
    .replace(/\.md$/, '')
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')

  // Show checkbox in place of type icon when hovered or selected.
  const showCheckbox = hovered || isSelected

  const bgActive  = isSelected || isActive ? C.accentBg : 'transparent'
  const borderL   = isSelected ? '2px solid ' + C.accent : isActive ? '2px solid ' + C.accent : '2px solid transparent'

  return (
    <>
      <div
        onClick={(e) => {
          // Ctrl/cmd click = toggle selection instead of opening viewer
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); onSelect?.(file, e); return }
          onClick?.()
        }}
        onContextMenu={onContextMenu}
        onMouseEnter={e => {
          setHovered(true)
          if (!isActive && !isSelected) e.currentTarget.style.background = C.s1
        }}
        onMouseLeave={e => {
          setHovered(false)
          if (!isActive && !isSelected) e.currentTarget.style.background = 'transparent'
        }}
        {...(longPressHandlers || {})}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: `5px 12px 5px ${12 + indent * 10}px`,
          cursor: 'pointer',
          background: bgActive,
          borderLeft: borderL,
          transition: 'background 120ms',
        }}
      >
        {/* Checkbox replaces type icon on hover / when selected */}
        {showCheckbox ? (
          <div
            onClick={(e) => { e.stopPropagation(); onSelect?.(file, e) }}
            style={{
              width: 16,
              height: 16,
              borderRadius: 2,
              flexShrink: 0,
              border: '1px solid ' + (isSelected ? C.accent : C.border2),
              background: isSelected ? C.accent : C.s1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 80ms ease',
            }}
          >{isSelected ? '✓' : ''}</div>
        ) : (
          <div style={{
            width: 16,
            height: 16,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.muted,
          }}><MissionIcon /></div>
        )}

        <span style={{
          flex: 1, minWidth: 0,
          fontSize: 12,
          fontWeight: 500,
          color: C.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          fontFamily: "'Hanken Grotesk', sans-serif",
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
        borderLeft: isOpen ? '2px solid ' + C.accent : '2px solid transparent',
        background: 'transparent',
        transition: 'background 120ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = C.s1 }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ color: C.muted, flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.12s' }}>
        <polyline points="9 6 15 12 9 18"/>
      </svg>
      <span style={{ color: C.muted, display: 'inline-flex', flexShrink: 0 }}><FolderIcon open={isOpen} /></span>
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: 12,
        fontWeight: 500,
        color: isOpen ? C.text : C.text2,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        fontFamily: "'Hanken Grotesk', sans-serif",
      }}>{label}</span>
      <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
        {fileCount}
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
function TreeNode({name, node, depth, openFolders, toggleFolder, activeFile, onFileClick, filterFn, pathKey, onFileContextMenu, onFileLongPress, selectedFiles, onSelectFile}) {
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
              selectedFiles={selectedFiles}
              onSelectFile={onSelectFile}
            />
          ))}
          {node.files.filter(filterFn || (() => true)).map(f => (
            <FileRow
              key={f.url}
              file={{ ...f, name: f.displayName || f.name }}
              isActive={activeFile?.url === f.url}
              isSelected={selectedFiles?.has(f.url)}
              onClick={() => onFileClick(f)}
              onContextMenu={onFileContextMenu ? (e) => onFileContextMenu(e, f) : undefined}
              onLongPress={onFileLongPress}
              onSelect={onSelectFile}
              indent={depth + 1}
            />
          ))}
        </>
      )}
    </>
  )
}

export default function FilesPanel({ projectSlug, missionSlug }) {
  const { worldId } = useCornerAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeFile, setActiveFile] = useState(null)
  const [activeCat, setActiveCat] = useState('all')
 const [query, setQuery] = useState('') // R13, name/path search filter
  // R3 — right-click + long-press context menu
  const [ctxMenu, setCtxMenu] = useState(null) // { x, y, file } | null
  const isMobile = useIsMobile()
  // Folder open-state keyed by tree path ("" = root, "foo/bar" = nested)
  const [openFolders, setOpenFolders] = useState(new Set(['']))
  // R12 — multi-select, + Folder, mutations
  const [selectedFiles, setSelectedFiles] = useState(new Set())  // Set<url>
  const [refetchKey, setRefetchKey] = useState(0)
  const [isAddingFolder, setIsAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showBulkMoveMenu, setShowBulkMoveMenu] = useState(false)

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

  // R12 — mutation handlers ───────────────────────────────────────────────────

  const handleSelectFile = useCallback((file) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(file.url)) next.delete(file.url)
      else next.add(file.url)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedFiles(new Set()), [])

  const handleDelete = useCallback(async (file) => {
    closeCtxMenu()
    const relPath = file.projectRelativePath || file.relativePath
    if (!projectSlug || !relPath || !file.fromDisk) return
    try {
      await authFetch(
        `/api/dashboard/project-file-delete?slug=${encodeURIComponent(projectSlug)}&path=${encodeURIComponent(relPath)}`,
        { method: 'DELETE' }
      )
      setSelectedFiles(prev => { const n = new Set(prev); n.delete(file.url); return n })
      setRefetchKey(k => k + 1)
    } catch (err) {
      console.error('[FilesPanel] delete failed', err)
    }
  }, [projectSlug, closeCtxMenu])

  const handleMove = useCallback(async (file, targetFolder) => {
    closeCtxMenu()
    const relPath = file.projectRelativePath || file.relativePath
    if (!projectSlug || !relPath || !file.fromDisk) return
    const fileName = relPath.split('/').pop()
    const toPath = targetFolder ? `${targetFolder}/${fileName}` : fileName
    if (toPath === relPath) return  // same location, no-op
    try {
      await authFetch('/api/dashboard/project-file-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: projectSlug, from: relPath, to: toPath }),
      })
      setRefetchKey(k => k + 1)
    } catch (err) {
      console.error('[FilesPanel] move failed', err)
    }
  }, [projectSlug, closeCtxMenu])

  const handleBulkMove = useCallback(async (targetFolder) => {
    if (!selectedFiles.size || !projectSlug) return
    const toMove = files.filter(f => f.fromDisk && selectedFiles.has(f.url))
    if (!toMove.length) { clearSelection(); setShowBulkMoveMenu(false); return }
    for (const file of toMove) {
      const relPath = file.projectRelativePath || file.relativePath
      if (!relPath) continue
      const fileName = relPath.split('/').pop()
      const toPath = targetFolder ? `${targetFolder}/${fileName}` : fileName
      if (toPath === relPath) continue
      try {
        await authFetch('/api/dashboard/project-file-move', {
          method: 'POST',
          body: JSON.stringify({ slug: projectSlug, from: relPath, to: toPath }),
        })
      } catch (err) {
        console.error('[FilesPanel] bulk move failed for', relPath, err)
      }
    }
    setShowBulkMoveMenu(false)
    clearSelection()
    setRefetchKey(k => k + 1)
  }, [selectedFiles, files, projectSlug, clearSelection])

  const handleBulkDelete = useCallback(async () => {
    if (!selectedFiles.size || !projectSlug) return
    const toDelete = files.filter(f => f.fromDisk && selectedFiles.has(f.url))
    if (!toDelete.length) { clearSelection(); return }
    if (!window.confirm(`Delete ${toDelete.length} file${toDelete.length > 1 ? 's' : ''}?`)) return
    for (const file of toDelete) {
      const relPath = file.projectRelativePath || file.relativePath
      if (!relPath) continue
      try {
        await authFetch(
          `/api/dashboard/project-file-delete?slug=${encodeURIComponent(projectSlug)}&path=${encodeURIComponent(relPath)}`,
          { method: 'DELETE' }
        )
      } catch (err) {
        console.error('[FilesPanel] bulk delete failed for', relPath, err)
      }
    }
    clearSelection()
    setRefetchKey(k => k + 1)
  }, [selectedFiles, files, projectSlug, clearSelection])

  const handleCreateFolder = useCallback(async (name) => {
    const trimmed = name.trim().replace(/[^a-zA-Z0-9 _-]/g, '').trim()
    if (!trimmed || !projectSlug) return
    // Kebab-case the folder name
    const folderName = trimmed.replace(/\s+/g, '-').toLowerCase()
    const folderPath = missionSlug
      ? `missions/${missionSlug}/${folderName}`
      : folderName
    try {
      await authFetch('/api/dashboard/project-file-mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: projectSlug, path: folderPath }),
      })
      setIsAddingFolder(false)
      setNewFolderName('')
      setRefetchKey(k => k + 1)
    } catch (err) {
      console.error('[FilesPanel] mkdir failed', err)
    }
  }, [projectSlug, missionSlug])


  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFiles([])
    setActiveFile(null)

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

    // R79-f23 Leg 2 R1/R4 (2026-05-30): single source of truth for per-chat
    // uploads. The rag-server /list-chat-files endpoint walks the active
    // chat's Uploads/ folder AND merges legacy flat-root attachments from
    // the messages table (R4 backcompat). Replaced the prior 4-source
    // Promise.all metadata-filter pattern; R2 (also 2026-05-30) deleted
    // the legacy chatUploadsP source + the R79-f20 server-side OR-NULL
    // bandaid that fed it. Uses the rag tunnel + Supabase JWT (same auth
    // posture as /upload-file-binary). Empty list when folder doesn't
    // exist yet — not an error.
    const chatFilesP = projectSlug
      ? (async () => {
          try {
            const { data } = await supabase.auth.getSession()
            const jwt = data?.session?.access_token
            if (!jwt) return []
            const scope = []
            scope.push(`world=${encodeURIComponent(world)}`)
            scope.push(`project=${encodeURIComponent(projectSlug)}`)
            if (missionSlug) scope.push(`mission=${encodeURIComponent(missionSlug)}`)
            const r = await fetch(`${RAG_TUNNEL}/list-chat-files?${scope.join('&')}`, {
              headers: { 'Authorization': `Bearer ${jwt}` },
            })
            if (!r.ok) return []
            const body = await r.json()
            return (body?.files || []).map(f => ({
              name: f.name,
              relativePath: f.name,
              url: `${RAG_TUNNEL}${f.url}`,
              age: relativeAge(f.mtime ? new Date(f.mtime).toISOString() : null),
              kind: fileKind(f.name, f.mime_type),
              size: f.size,
              mime: f.mime_type,
              _ts: f.mtime || 0,
              // Tag so the mission filter below passes them (same posture as
              // chat-upload) and so R2 can drop the legacy sources by tag.
              _source: 'chat-folder',
              missionSlug: missionSlug || null,
            }))
          } catch (_) {
            return []
          }
        })()
      : Promise.resolve([])

    Promise.all([textP, projectFilesP, chatFilesP]).then(([texts, diskFiles, chatFolderFiles]) => {
      if (cancelled) return
      // Project-scope text files (skip ones tagged for other projects).
      const scopedTexts = projectSlug
        ? texts.filter(t => !t.textProject || t.textProject === projectSlug)
        : texts
      // Dedupe by URL primarily (chat folder files carry unique RAG URLs) and
      // on normalized name (so a chat-folder upload named CONTEXT.md doesn't
      // double-render alongside the scaffold row that points at the same
      // canonical filename).
      const seen = new Set()
      const seenUrls = new Set()
      // Order matters: chat-folder files first (source of truth for active
      // chat uploads — walks the per-chat folder AND merges legacy flat-root
      // attachments via the rag-server /list-chat-files endpoint), then
      // disk files (R79-f15 — covers canon MDs at VISION/CONTEXT/BUILD/RESEARCH
      // with fresh mtimes and real on-disk paths plus every deliverable an
      // agent wrote inside the project tree), then scaffold text rows
      // (events-table mirror, secondary to disk).
      const merged = [...chatFolderFiles, ...diskFiles, ...scopedTexts].filter(f => {
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
      // When drilled into a specific mission, filter to only that mission's files
      // and strip the 'missions/<slug>/' prefix so they display at tree root.
      // Always preserve projectRelativePath (unstripped) for API mutation calls.
      let finalFiles = merged.map(f => ({ ...f, projectRelativePath: f.relativePath }))
      if (missionSlug) {
        const prefix = `missions/${missionSlug}/`
        finalFiles = merged
          .filter(f =>
            f.missionSlug === missionSlug ||
            (f.relativePath || '').startsWith(prefix) ||
            // R79-f23 Leg 2 R1: chat-folder reads come pre-scoped from the
            // rag-server /list-chat-files endpoint — any file it returns is
            // in-scope by construction. Tag check lets them pass even
            // without a filesystem path prefix.
            f._source === 'chat-folder'
          )
          .map(f => ({
            ...f,
            projectRelativePath: f.relativePath,   // project-root-relative (full path before stripping)
            relativePath: (f.relativePath || '').startsWith(prefix)
              ? (f.relativePath.slice(prefix.length) || f.name)
              : f.relativePath,
          }))
      }
      setFiles(finalFiles)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [projectSlug, missionSlug, world, refetchKey])

  // R79-f23 Leg 2 (2026-05-30): live refresh when a new attachment-bearing
  // message lands for this chat. Previously, dragging a file into the
  // composer rendered a file card in the bubble but the right-rail Files
  // panel stayed stale until the user hard-refreshed or switched projects.
  // Subscribe to messages.INSERT scoped to the active project; when the row
  // carries metadata.attachment(s), bump refetchKey to re-run the data
  // useEffect above.
  useEffect(() => {
    if (!supabase || !projectSlug) return
    let active = true
    const channel = supabase
      .channel(`files-panel-${projectSlug}-${missionSlug || 'root'}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `project=eq.${projectSlug}`,
        },
        (payload) => {
          if (!active) return
          const msg = payload?.new
          if (!msg) return
          const meta = msg.metadata || {}
          const hasAttachment = !!(
            msg.attachment_url ||
            meta.attachment?.url ||
            (Array.isArray(meta.attachments) && meta.attachments.length)
          )
          if (!hasAttachment) return
          // When drilled into a mission room, ignore project-level uploads.
          // The mission scope tag is written by useChatAttachments at upload time.
          if (missionSlug) {
            const msgMission =
              meta.mission_slug ||
              meta.attachment?.mission_slug ||
              (Array.isArray(meta.attachments) && meta.attachments[0]?.mission_slug)
            if (msgMission && msgMission !== missionSlug) return
          }
          setRefetchKey(k => k + 1)
        },
      )
      .subscribe()
    return () => {
      active = false
      try { supabase.removeChannel(channel) } catch (_) {}
    }
  }, [projectSlug, missionSlug])

  const tree = useMemo(() => buildTree(files), [files])
  const filterFn = activeCat === 'all'
    ? null
    : (f) => fileCategory(f.kind) === activeCat

  const visibleCount = filterFn ? countFiles(tree, filterFn) : files.length

  // Latest — the five newest files across the whole tree, regardless of which
  // folder they live in. The tree below is the catalog; this strip is the
  // story ("what's new since I last looked"). Without it the rail is just the
  // project list a third time.
  const latestFiles = useMemo(() => {
    // Scaffold canon (README/CONTEXT/BUILD/…) updates constantly and says
    // nothing — without this filter "Latest" is five identical filing docs
    // from one project. Deliverables are the story; cap 2 per project so one
    // busy project can't own the whole strip.
    const SCAFFOLD = /^(readme|context|build|vision|research|last-conversation|history|rules|phonebook|agent)(\.|$)/i
    const dated = files.filter(f => (f._ts || 0) > 0 && (!filterFn || filterFn(f))
      && !SCAFFOLD.test(((f.name || '').split('/').pop() || '')))
    dated.sort((a, b) => (b._ts || 0) - (a._ts || 0))
    const perProj = {}
    const picked = []
    for (const f of dated) {
      const proj = (f.relativePath || '').split('/').filter(Boolean)[0] || ''
      perProj[proj] = (perProj[proj] || 0) + 1
      if (perProj[proj] > 2) continue
      picked.push(f)
      if (picked.length === 5) break
    }
    return picked.map(f => {
      const proj = (f.relativePath || '').split('/').filter(Boolean)[0] || ''
      const short = (f.name || '').split('/').pop()
      return { ...f, name: short, age: proj && proj !== short ? proj + ' · ' + (f.age || '') : f.age }
    })
  }, [files, filterFn])

  // R13 — search. When the query is non-empty, we bypass the folder tree and
  // render a flat list of every file whose name OR path contains the query
  // (case-insensitive), still respecting the active category filter. Flat is
  // the right UX for search: the user wants matches surfaced regardless of
  // which folders happen to be expanded.
  const trimmedQuery = query.trim().toLowerCase()
  const searchActive = trimmedQuery.length > 0
  const searchResults = useMemo(() => {
    if (!searchActive) return []
    return files
      .filter(f => {
        if (filterFn && !filterFn(f)) return false
        const hay = `${f.relativePath || ''} ${f.name || ''}`.toLowerCase()
        return hay.includes(trimmedQuery)
      })
      .sort((a, b) => (b._ts || 0) - (a._ts || 0))
    // filterFn is recomputed each render from activeCat; depend on activeCat.
  }, [files, searchActive, trimmedQuery, activeCat]) // eslint-disable-line react-hooks/exhaustive-deps

  // R12 — compute folder paths from the current tree for "Move to" submenu.
  const folders = useMemo(() => {
    const result = []
    function walk(node, prefix) {
      for (const [name] of node.children.entries()) {
        const p = prefix ? `${prefix}/${name}` : name
        result.push(p)
        walk(node.children.get(name), p)
      }
    }
    walk(tree, '')
    return result
  }, [tree])

  return (
    <div style={{ position: 'relative' }}>
      <CategoryFilters active={activeCat} onChange={handleCatChange} />

      {/* R13 — search box */}
      {/* Theme-correct: the old rgba(15,23,42,…) navy block read as a broken
          gray bar on the light theme. Transparent + border matches the
          Explorer's search row; same SVG icon as the rest of the system. */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid ' + C.border,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: 'transparent',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.muted, flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7"/>
          <line x1="21" y1="21" x2="16.5" y2="16.5"/>
        </svg>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveFile(null) }}
          onKeyDown={e => { if (e.key === 'Escape') setQuery('') }}
          placeholder="Search files…"
          style={{
            flex: 1, minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: 0,
            fontSize: 12,
            color: C.text,
            fontFamily: "'Hanken Grotesk', sans-serif",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            title="Clear search"
            aria-label="Clear search"
            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
          >✕</button>
        )}
      </div>

      {/* R12 — + Folder toolbar */}
      {projectSlug && (
        <div style={{
          padding: '4px 12px',
          borderBottom: '1px solid ' + C.border,
          minHeight: 28,
          display: 'flex',
          alignItems: 'center',
        }}>
          {isAddingFolder ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
              <input
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateFolder(newFolderName)
                  if (e.key === 'Escape') { setIsAddingFolder(false); setNewFolderName('') }
                }}
                placeholder="folder name"
                style={{
                  flex: 1, background: 'rgba(30,41,59,0.6)',
                  border: '1px solid ' + C.border, borderRadius: 3,
                  padding: '3px 7px', fontSize: 11, color: C.text,
                  fontFamily: "'Hanken Grotesk', sans-serif", outline: 'none',
                }}
              />
              <button
                onClick={() => handleCreateFolder(newFolderName)}
                style={{ fontSize: 11, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
              >✓</button>
              <button
                onClick={() => { setIsAddingFolder(false); setNewFolderName('') }}
                style={{ fontSize: 13, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
              >✕</button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingFolder(true)}
              style={{
                fontSize: 10, color: C.muted, background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 4,
                fontFamily: "'Hanken Grotesk', sans-serif",
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.text}
              onMouseLeave={e => e.currentTarget.style.color = C.muted}
            >
              + Folder
            </button>
          )}
        </div>
      )}

      {loading && <EmptyState text="Loading…" />}

      {!loading && files.length === 0 && (
        <EmptyState text={missionSlug
          ? `No files in this mission yet.`
          : projectSlug
            ? `No files in ${projectSlug} yet. Upload from chat to see them here.`
            : 'No files yet. Upload from chat to see them here.'} />
      )}

      {!loading && !searchActive && files.length > 0 && visibleCount === 0 && (
        <EmptyState text={`No ${activeCat} files${projectSlug ? ` in ${projectSlug}` : ''}.`} />
      )}

      {/* R13 — search results: flat list, bypasses the folder tree. Shows the
          file's path so duplicates in different folders stay distinguishable. */}
      {!loading && searchActive && files.length > 0 && (
        searchResults.length === 0
          ? <EmptyState text={`No files matching "${query.trim()}".`} />
          : searchResults.map(f => (
              <FileRow
                key={f.url}
                file={{ ...f, name: f.relativePath || f.name }}
                isActive={activeFile?.url === f.url}
                isSelected={selectedFiles.has(f.url)}
                onClick={() => handleFileClick(f)}
                onContextMenu={(e) => handleFileContextMenu(e, f)}
                onLongPress={openCtxMenu}
                onSelect={handleSelectFile}
                indent={0}
              />
            ))
      )}

      {/* Latest — newest files across everything, before the catalog */}
      {!loading && !searchActive && latestFiles.length > 0 && (
        <>
          <div style={{ padding: '8px 12px 2px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>Latest</div>
          {latestFiles.map(f => (
            <FileRow
              key={'latest-' + f.url}
              file={f}
              isActive={activeFile?.url === f.url}
              onClick={() => handleFileClick(f)}
              indent={0}
            />
          ))}
          <div style={{ height: 1, background: C.border, margin: '6px 0 4px' }} />
        </>
      )}

      {/* Top-level files (no folder) */}
      {!loading && !searchActive && tree.files.filter(filterFn || (() => true)).map(f => (
        <FileRow
          key={f.url}
          file={{ ...f, name: f.displayName || f.name }}
          isActive={activeFile?.url === f.url}
          isSelected={selectedFiles.has(f.url)}
          onClick={() => handleFileClick(f)}
          onContextMenu={(e) => handleFileContextMenu(e, f)}
          onLongPress={openCtxMenu}
          onSelect={handleSelectFile}
          indent={0}
        />
      ))}

      {/* Folder tree */}
      {!loading && !searchActive && [...tree.children.entries()].map(([name, child]) => (
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
          selectedFiles={selectedFiles}
          onSelectFile={handleSelectFile}
        />
      ))}

      {activeFile && (
        <FileViewer file={activeFile} onClose={() => setActiveFile(null)} />
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
        onDelete={handleDelete}
        onMove={handleMove}
        folders={folders}
      />

      {/* R12 — Bulk action bar (appears when files are selected) */}
      {selectedFiles.size > 0 && (
        <div style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
          {/* Bulk move folder picker — floats above the bar */}
          {showBulkMoveMenu && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              background: 'rgba(18,22,32,0.98)',
              backdropFilter: 'blur(12px)',
              border: '1px solid ' + C.border,
              borderBottom: 'none',
              borderRadius: '6px 6px 0 0',
              maxHeight: 180,
              overflowY: 'auto',
              fontSize: 11,
              fontFamily: "'Hanken Grotesk', sans-serif",
            }}>
              {[{ label: '/ (project root)', value: '' }, ...folders.map(f => ({ label: f, value: f }))].map(({ label, value }) => (
                <button
                  key={value || '__root'}
                  onClick={() => handleBulkMove(value)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 12px', background: 'none', border: 'none',
                    cursor: 'pointer', color: C.text, fontSize: 11,
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >{label}</button>
              ))}
            </div>
          )}
          <div style={{
            background: 'rgba(10,14,22,0.97)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid ' + C.border,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 11,
            fontFamily: "'Hanken Grotesk', sans-serif",
          }}>
            <span style={{ color: C.text, fontWeight: 500 }}>
              {selectedFiles.size} selected
            </span>
            <span style={{ color: C.border }}>·</span>
            <button
              onClick={() => setShowBulkMoveMenu(v => !v)}
              style={{ color: C.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: 'inherit' }}
            >Move to…</button>
            <button
              onClick={handleBulkDelete}
              style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: 'inherit' }}
            >Delete</button>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => { clearSelection(); setShowBulkMoveMenu(false) }}
              style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}
            >✕</button>
          </div>
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}