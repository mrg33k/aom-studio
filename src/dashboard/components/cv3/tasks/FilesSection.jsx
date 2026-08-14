// FilesSection -- per-project + all-projects file viewers
// R2a (Apr 16, 2026): extracted from TasksPanel.jsx
// R3a (Apr 17, 2026): reads from TasksPanelContext instead of props
import { useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

export function getFileTypeInfo(filename) {
  const ext = String(filename || '').split('.').pop().toLowerCase()
  if (['md', 'markdown'].includes(ext)) return { color: C.accent, type: 'markdown' }
  if (ext === 'pdf') return { color: '#F87171', type: 'pdf' }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return { color: C.blue, type: 'image' }
  if (['mp4', 'mov', 'webm', 'avi'].includes(ext)) return { color: C.purple, type: 'video' }
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return { color: C.teal, type: 'audio' }
  if (['fig', 'sketch', 'psd', 'ai', 'xd'].includes(ext)) return { color: C.pink, type: 'design' }
  if (['xlsx', 'xls', 'csv'].includes(ext)) return { color: C.green, type: 'spreadsheet' }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) return { color: C.yellow, type: 'archive' }
  return { color: C.muted, type: 'generic' }
}

export function FileTypeChip({ filename }) {
  const { color, type } = getFileTypeInfo(filename)
  const icons = {
    markdown:    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    pdf:         <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    image:       <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    video:       <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill={color} stroke={color} strokeWidth="1"/></svg>,
    audio:       <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
    design:      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    spreadsheet: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
    archive:     <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
    generic:     <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  }
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
      background: color + '1F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icons[type] || icons.generic}
    </div>
  )
}

export function formatFileSize(bytes) {
  if (!bytes) return null
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1048576).toFixed(1)}MB`
}

export const PROJECT_LABELS = {
  'corner': 'Corner',
  'ambition-mechanical': 'Ambition',
  'aom-website': 'AOM Website',
  'arsenal-directory': 'Arsenal',
  'sourcing-directory': 'Sourcing',
}

export function AllFilesSection() {
  const {
    allBriefs: briefsFromCtx,
    allBriefsLoading: loading,
    allBriefsOpen: isOpen,
    setAllBriefsOpen,
    allBriefsLimit: limit,
    setAllBriefsLimit,
    handleBriefClick: onBriefClick,
  } = useTasksPanelCtx()
  const onToggle   = () => setAllBriefsOpen(v => !v)
  const onShowMore = () => setAllBriefsLimit(prev => prev + 25)

  const [hoveredRow, setHoveredRow] = useState(null)
  const allBriefs = briefsFromCtx || []
  const visible = allBriefs.slice(0, limit)
  const hasMore = allBriefs.length > limit

  return (
    <div
      data-testid="all-files"
      aria-expanded={isOpen ? 'true' : 'false'}
      style={{ marginTop: 24, marginBottom: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: 32, gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif" }}>
          Files
        </span>
        <span style={{
          fontSize: 11, color: C.text2, fontFamily: "'Inter', sans-serif",
          background: C.chipBg, padding: '2px 7px', borderRadius: 10,
          opacity: loading || allBriefs.length > 0 ? 1 : 0,
        }}>
          {loading ? '…' : allBriefs.length}
        </span>
        <div style={{ flex: 1 }} />
        <button
          data-testid="all-files-toggle"
          onClick={onToggle}
          style={{
            width: 24, height: 24, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
            background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg
            width={14} height={14} viewBox="0 0 24 24" fill="none"
            stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
      <div style={{ height: 1, background: C.border }} />

      <div style={{ maxHeight: isOpen ? 99999 : 0, overflow: 'hidden', transition: 'max-height 0.25s ease' }}>
        {loading && (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>Loading...</span>
          </div>
        )}
        {!loading && allBriefs.length === 0 && (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: C.muted, fontFamily: "'Inter', sans-serif" }}>No briefs yet</span>
          </div>
        )}
        {!loading && visible.map((brief, idx) => {
          const slug = brief.slug || String(idx)
          const title = brief.title || brief.filename || 'Brief'
          const date = brief.dateFormatted || brief.updated_at || ''
          const project = brief.project || ''
          const projectLabel = PROJECT_LABELS[project] || project || ''
          const isLast = idx === visible.length - 1 && !hasMore
          const isHov = hoveredRow === slug
          return (
            <div
              key={`${project}::${slug}::${idx}`}
              data-testid={`all-files-entry-${project || 'unknown'}-${slug}`}
              data-project={project || ''}
              data-filename={brief.filename || title || ''}
              onClick={() => onBriefClick && onBriefClick(brief)}
              onMouseEnter={() => setHoveredRow(slug)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                height: 44, padding: '0 4px',
                cursor: 'pointer', borderRadius: 6,
                background: isHov ? 'rgba(255,255,255,0.03)' : 'transparent',
                borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                transition: 'background 0.15s ease',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={{
                flex: 1, fontSize: 13, fontWeight: 500, color: C.text,
                fontFamily: "'Inter', sans-serif",
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
              }}>{title}</span>
              {projectLabel && (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: C.dim,
                  background: 'rgba(255,255,255,0.06)', padding: '2px 6px',
                  borderRadius: 6, flexShrink: 0, fontFamily: "'Inter', sans-serif",
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>{projectLabel}</span>
              )}
              {date && (
                <span style={{ fontSize: 11, color: C.dim, fontFamily: "'Inter', sans-serif", flexShrink: 0, minWidth: 42, textAlign: 'right' }}>{date}</span>
              )}
            </div>
          )
        })}
        {!loading && hasMore && (
          <div
            onClick={onShowMore}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
            style={{
              textAlign: 'center', padding: '10px 0', fontSize: 12, fontWeight: 600,
              color: C.muted, cursor: 'pointer', borderRadius: 6, marginTop: 4,
              background: 'rgba(255,255,255,0.03)', transition: 'background 0.15s ease',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Show more ({allBriefs.length - limit} remaining)
          </div>
        )}
      </div>
      <div style={{ height: 1, background: C.border, marginTop: isOpen ? 12 : 6 }} />
    </div>
  )
}

export function ProjectFilesSection() {
  const {
    taskIsMobile: isMobile,
    taskFilesOpen: isOpen,
    setTaskFilesOpen,
    taskBriefs: briefs,
    taskAttachments: attachments,
    taskFilesLoading: loading,
    handleBriefClick: onBriefClick,
  } = useTasksPanelCtx()
  const onToggle = () => setTaskFilesOpen(v => !v)

  const [lightbox, setLightbox] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  const [attachBtnHover, setAttachBtnHover] = useState(false)

  const totalCount = briefs.length + attachments.length
  const hasBriefs = briefs.length > 0
  const hasAttachments = attachments.length > 0

  // R37a: collapse to a single-column row list matching AllFilesSection.
  // Briefs + attachments render as one continuous list, briefs first.
  const rowEntries = [
    ...briefs.map((b, idx) => ({ kind: 'brief', data: b, key: b.id || `b-${idx}` })),
    ...attachments.map((f, idx) => ({ kind: 'attachment', data: f, key: f.id || `a-${idx}` })),
  ]

  const handleAttachmentClick = (file) => {
    const { type } = getFileTypeInfo(file.name || file.filename || '')
    if (type === 'image') { setLightbox({ url: file.url || '', type: 'image' }); return }
    if (type === 'video') { setLightbox({ url: file.url || '', type: 'video' }); return }
    if (type === 'pdf') { window.open(file.url || '', '_blank'); return }
    const a = document.createElement('a')
    a.href = file.url || file.content || ''
    a.download = file.name || file.filename || 'file'
    a.click()
  }

  return (
    <>
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {lightbox.type === 'image' ? (
            <img src={lightbox.url} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
          ) : (
            <video src={lightbox.url} controls autoPlay onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
          )}
        </div>
      )}

      <div
        data-testid="task-drawer-files"
        aria-expanded={isOpen ? 'true' : 'false'}
        style={{ marginBottom: 16 }}
      >
        {/* Header strip */}
        <div style={{ display: 'flex', alignItems: 'center', height: 32, gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif" }}>
            Files
          </span>
          <span style={{
            fontSize: 11, color: C.text2, fontFamily: "'Inter', sans-serif",
            background: C.chipBg, padding: '2px 7px', borderRadius: 10,
            opacity: loading || totalCount > 0 ? 1 : 0,
          }}>
            {loading ? '…' : totalCount}
          </span>
          <div style={{ flex: 1 }} />
          {!isMobile && (
            <button
              title="Attach file to project"
              onMouseEnter={() => setAttachBtnHover(true)}
              onMouseLeave={() => setAttachBtnHover(false)}
              style={{
                width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                background: attachBtnHover ? 'rgba(255,255,255,0.06)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s ease',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
          )}
          <button
            data-testid="project-files-toggle"
            onClick={onToggle}
            style={{
              width: 24, height: 24, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
              background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg
              width={14} height={14} viewBox="0 0 24 24" fill="none"
              stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>

        {/* Separator below header */}
        <div style={{ height: 1, background: C.border }} />

        {/* Collapsible body */}
        <div style={{ maxHeight: isOpen ? 99999 : 0, overflow: 'hidden', transition: 'max-height 0.25s ease' }}>
          {loading && (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>Loading...</span>
            </div>
          )}

          {!loading && rowEntries.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0 20px', gap: 4 }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <div style={{ fontSize: 13, color: C.muted, fontFamily: "'Inter', sans-serif", marginTop: 4 }}>No files yet</div>
              <div style={{ fontSize: 12, color: C.dim, fontFamily: "'Inter', sans-serif", textAlign: 'center', lineHeight: 1.4 }}>
                Drop a brief or attach<br/>files from chat
              </div>
            </div>
          )}

          {!loading && rowEntries.map((entry, idx) => {
            const isLast = idx === rowEntries.length - 1
            if (entry.kind === 'brief') {
              const brief = entry.data
              const slug = brief.slug || (brief.filename || '').replace('.md', '') || String(idx)
              const title = brief.title || brief.filename || 'Brief'
              const date = brief.dateFormatted || brief.updated_at
                || (brief.created_at ? new Date(brief.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')
              const project = brief.project || ''
              const projectLabel = PROJECT_LABELS[project] || project || ''
              const filename = brief.filename || `${slug}.md`
              const isHov = hoveredRow === entry.key
              return (
                <div
                  key={entry.key}
                  data-testid={`project-files-entry-${filename}`}
                  data-filename={filename}
                  data-project={project || ''}
                  data-source={brief.source || 'brief'}
                  onClick={() => onBriefClick && onBriefClick(brief)}
                  onMouseEnter={() => setHoveredRow(entry.key)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    height: 44, padding: '0 4px',
                    cursor: 'pointer', borderRadius: 6,
                    background: isHov ? 'rgba(255,255,255,0.03)' : 'transparent',
                    borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                    transition: 'background 0.15s ease',
                  }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span style={{
                    flex: 1, fontSize: 13, fontWeight: 500, color: C.text,
                    fontFamily: "'Inter', sans-serif",
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                  }}>{title}</span>
                  {projectLabel && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: C.dim,
                      background: 'rgba(255,255,255,0.06)', padding: '2px 6px',
                      borderRadius: 6, flexShrink: 0, fontFamily: "'Inter', sans-serif",
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{projectLabel}</span>
                  )}
                  {date && (
                    <span style={{ fontSize: 11, color: C.dim, fontFamily: "'Inter', sans-serif", flexShrink: 0, minWidth: 42, textAlign: 'right' }}>{date}</span>
                  )}
                </div>
              )
            }
            // attachment
            const file = entry.data
            const filename = file.name || file.filename || 'File'
            const sizeBytes = file.size || (file.content ? new Blob([file.content]).size : null)
            const isHov = hoveredRow === entry.key
            return (
              <div
                key={entry.key}
                data-testid={`project-files-entry-${filename}`}
                data-filename={filename}
                data-source="attachment"
                onClick={() => handleAttachmentClick(file)}
                onMouseEnter={() => setHoveredRow(entry.key)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  height: 44, padding: '0 4px',
                  cursor: 'pointer', borderRadius: 6,
                  background: isHov ? 'rgba(255,255,255,0.03)' : 'transparent',
                  borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                  transition: 'background 0.15s ease',
                }}
              >
                <FileTypeChip filename={filename} />
                <span style={{
                  flex: 1, fontSize: 13, fontWeight: 500, color: C.text, fontFamily: "'Inter', sans-serif",
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                }}>
                  {filename}
                </span>
                {sizeBytes != null && (
                  <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
                    {formatFileSize(sizeBytes)}
                  </span>
                )}
                {(isMobile || isHov) && (
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                )}
              </div>
            )
          })}
        </div>

        {/* Bottom separator (between Files block and tasks below) */}
        <div style={{ height: 1, background: C.border, marginTop: isOpen ? 12 : 6 }} />
      </div>
    </>
  )
}

// Distinct SVG icons (one per canon file) — used by both project-canon
// and mission-scaffold rows so the 5 caps files are visually distinct
// across the app.
export const CANON_ICONS = {
  VISION: (color) => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  BUILD: (color) => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  CONTEXT: (color) => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/>
      <line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  ),
  RESEARCH: (color) => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M9 2h6"/>
      <path d="M10 2v6.5L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 8.5V2"/>
    </svg>
  ),
  ROADMAP: (color) => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  ),
  LAST_CONVERSATION: (color) => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  FOLDER: (color) => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
}

// R51 — MissionScaffoldSection (2026-04-22 session 18).
// Renders the six canonical scaffold files FOR THE CURRENT MISSION as a
// single-column list: VISION / RESEARCH / BUILD / CONTEXT /
// last-conversation / research (the directory). Click a row → opens that
// file via the same /api/dashboard/file-content endpoint the project
// drawer uses. Missing files render with "not yet created" affordance —
// the scaffold is the SHAPE users see even when files are stubs.
//
// Only renders when activeMissionPath is set. R39-4 shipped the
// breadcrumb + drill-in plumbing; R51 fills the file surface inside a
// drilled-in mission.
const MISSION_SCAFFOLD_ENTRIES = [
  { filename: 'VISION.md',             label: 'Vision',           color: '#A78BFA', iconKey: 'VISION' },
  { filename: 'RESEARCH.md',           label: 'Research',         color: '#6EE7B7', iconKey: 'RESEARCH' },
  { filename: 'BUILD.md',              label: 'Build',            color: '#FBBF24', iconKey: 'BUILD' },
  { filename: 'CONTEXT.md',            label: 'Context',          color: '#60A5FA', iconKey: 'CONTEXT' },
  { filename: 'last-conversation.md',  label: 'Last conversation', color: '#F9A8D4', iconKey: 'LAST_CONVERSATION' },
  { filename: 'research/',             label: 'research/',        color: '#94A3B8', isDir: true, iconKey: 'FOLDER' },
]

export function MissionScaffoldSection() {
  const {
    activeMissionPath,
    handleBriefClick,
  } = useTasksPanelCtx()
  const [hoveredRow, setHoveredRow] = useState(null)
  const [isOpen, setIsOpen] = useState(true)
  if (!activeMissionPath) return null

  const onClickRow = (entry) => {
    if (entry.isDir || !handleBriefClick) return
    handleBriefClick({
      project: activeMissionPath,
      filename: entry.filename,
      source: 'scaffold',
 title: `${entry.label}, ${activeMissionPath}`,
    })
  }

  return (
    <div
      data-testid="mission-scaffold"
      data-mission-path={activeMissionPath}
      aria-expanded={isOpen ? 'true' : 'false'}
      style={{ marginBottom: 16 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: 32, gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif" }}>
          Scaffold
        </span>
        <span style={{
          fontSize: 11, color: C.text2, fontFamily: "'Inter', sans-serif",
          background: C.chipBg, padding: '2px 7px', borderRadius: 10,
        }}>
          {MISSION_SCAFFOLD_ENTRIES.length}
        </span>
        <div style={{ flex: 1 }} />
        <button
          data-testid="mission-scaffold-toggle"
          onClick={() => setIsOpen(v => !v)}
          style={{
            width: 24, height: 24, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
            background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg
            width={14} height={14} viewBox="0 0 24 24" fill="none"
            stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>

      <div style={{ height: 1, background: C.border }} />

      <div style={{ maxHeight: isOpen ? 99999 : 0, overflow: 'hidden', transition: 'max-height 0.25s ease' }}>
        {MISSION_SCAFFOLD_ENTRIES.map((entry, idx) => {
          const isLast = idx === MISSION_SCAFFOLD_ENTRIES.length - 1
          const isHov = hoveredRow === entry.filename
          return (
            <div
              key={entry.filename}
              data-testid={`mission-scaffold-entry-${entry.filename}`}
              data-filename={entry.filename}
              data-is-dir={entry.isDir ? 'true' : 'false'}
              onClick={() => onClickRow(entry)}
              onMouseEnter={() => setHoveredRow(entry.filename)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                height: 44, padding: '0 4px',
                cursor: entry.isDir ? 'default' : 'pointer',
                borderRadius: 6,
                background: isHov ? 'rgba(255,255,255,0.03)' : 'transparent',
                borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                transition: 'background 0.15s ease',
              }}
            >
              {(CANON_ICONS[entry.iconKey] || CANON_ICONS.FOLDER)(entry.color)}
              <span style={{
                flex: 1, fontSize: 13, fontWeight: 500, color: C.text,
                fontFamily: "'Inter', sans-serif",
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
              }}>{entry.label}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, color: C.dim,
                fontFamily: "'JetBrains Mono', monospace",
                flexShrink: 0,
              }}>{entry.filename}</span>
            </div>
          )
        })}
      </div>

      <div style={{ height: 1, background: C.border, marginTop: isOpen ? 12 : 6 }} />
    </div>
  )
}

// R39-3 — missions as first-class list inside the per-project drawer.
// Data comes from /api/dashboard/missions?project=<slug>; each mission is a
// sub-project keyed by agent='<parent>:<mission>' in the scaffold events.
// Clicking a row drills into the mission mini Command Center (R39-4 wires
// the handler; R39-3 ships the row + testids).
export function ProjectMissionsSection({ onMissionClick: onMissionClickProp }) {
  const {
    taskMissions: missions,
    taskMissionsLoading: loading,
    setActiveMissionPath,
  } = useTasksPanelCtx()
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredRow, setHoveredRow] = useState(null)
  const handleMissionClick = onMissionClickProp || ((m) => setActiveMissionPath(m.path))

  if (!loading && missions.length === 0) return null

  const dotColor = '#60A5FA'

  return (
    <div
      data-testid="task-drawer-missions"
      aria-expanded={isOpen ? 'true' : 'false'}
      style={{ marginBottom: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: 32, gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif" }}>
          Missions
        </span>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: dotColor,
          boxShadow: `0 0 6px ${dotColor}88`, flexShrink: 0,
          opacity: missions.length ? 1 : 0.3,
        }} />
        <div style={{ flex: 1 }} />
        <button
          data-testid="project-missions-toggle"
          onClick={() => setIsOpen(v => !v)}
          style={{
            height: 22, padding: '0 8px',
            borderRadius: 6, border: `1px solid ${C.border2}`,
            background: 'transparent', color: C.text2,
            fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif",
            cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase',
          }}
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>

      {isOpen && (
        <div style={{ padding: '4px 2px 8px' }}>
          {!loading && missions.map((m, idx) => {
            const isLast = idx === missions.length - 1
            const date = m.updated_at
              ? new Date(m.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : ''
            const isHov = hoveredRow === m.path
            return (
              <div
                key={m.path}
                data-testid={`project-missions-entry-${m.slug}`}
                data-mission-slug={m.slug}
                data-mission-path={m.path}
                data-file-count={m.file_count}
                onClick={() => handleMissionClick(m)}
                onMouseEnter={() => setHoveredRow(m.path)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  height: 44, padding: '0 4px',
                  cursor: 'pointer', borderRadius: 6,
                  background: isHov ? 'rgba(255,255,255,0.03)' : 'transparent',
                  borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                  transition: 'background 0.15s ease',
                }}
              >
                <svg
                  width={14} height={14} viewBox="0 0 24 24" fill="none"
                  stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="2" fill={C.accent} />
                </svg>
                <span style={{
                  flex: 1, fontSize: 13, fontWeight: 500, color: C.text,
                  fontFamily: "'Inter', sans-serif",
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                }}>{m.name}</span>
                {m.file_count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: C.dim,
                    background: 'rgba(255,255,255,0.06)', padding: '2px 6px',
                    borderRadius: 6, flexShrink: 0, fontFamily: "'Inter', sans-serif",
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{m.file_count} {m.file_count === 1 ? 'file' : 'files'}</span>
                )}
                {date && (
                  <span style={{ fontSize: 11, color: C.dim, fontFamily: "'Inter', sans-serif", flexShrink: 0, minWidth: 42, textAlign: 'right' }}>{date}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// R39-4 — breadcrumb for the mission mini Command Center.
// Renders at the top of the drawer body when activeMissionPath is set.
// Each segment is clickable: clicking a segment pops back to that depth.
// The "Back" button goes up exactly one level.
function titleFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function MissionBreadcrumb() {
  const {
    activeProject,
    activeMissionPath,
    setActiveMissionPath,
  } = useTasksPanelCtx()
  if (!activeMissionPath) return null
  const missionSegments = activeMissionPath.startsWith(activeProject + ':')
    ? activeMissionPath.slice(activeProject.length + 1).split(':')
    : activeMissionPath.split(':')

  const segments = [
    { label: titleFromSlug(activeProject), path: '' },
    ...missionSegments.map((slug, i) => ({
      label: titleFromSlug(slug),
      path: `${activeProject}:${missionSegments.slice(0, i + 1).join(':')}`,
    })),
  ]

  return (
    <div
      data-testid="mission-breadcrumb"
      data-mission-path={activeMissionPath}
      style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
        marginTop: 8, marginBottom: 8,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <button
        data-testid="mission-back"
        onClick={() => {
          const next = segments[segments.length - 2]?.path ?? ''
          setActiveMissionPath(next)
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          height: 24, padding: '0 8px',
          fontSize: 11, fontWeight: 600, color: C.muted,
          background: 'rgba(255,255,255,0.04)',
          border: 'none', borderRadius: 6, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em',
        }}
        title="Back one level"
      >
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back
      </button>
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1
        return (
          <span key={seg.path || 'root'} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && (
              <span style={{ color: C.dim, fontSize: 11 }}>›</span>
            )}
            <button
              data-testid={`mission-breadcrumb-segment-${i}`}
              data-segment-path={seg.path}
              onClick={() => setActiveMissionPath(seg.path)}
              style={{
                fontSize: 12, fontWeight: isLast ? 700 : 500,
                color: isLast ? C.text : C.text2,
                background: 'none', border: 'none', padding: 0,
                cursor: isLast ? 'default' : 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
              disabled={isLast}
            >{seg.label}</button>
          </span>
        )
      })}
    </div>
  )
}

// R52 — ProjectCanonSection (2026-05-13).
// The single file-shape projects show by default. Top: five canonical
// CAPS files (VISION/BUILD/CONTEXT/RESEARCH/ROADMAP), each with a
// distinct icon. Below: Missions/ and Files/ as collapsible folders
// containing the existing sections.
//
// Only renders when activeProject is a real slug (not 'all') and we
// are NOT drilled into a mission. Drilled-in views still use
// MissionScaffoldSection.
const PROJECT_CANON_ENTRIES = [
  { filename: 'VISION.md',   label: 'Vision',   color: '#A78BFA', iconKey: 'VISION' },
  { filename: 'BUILD.md',    label: 'Build',    color: '#FBBF24', iconKey: 'BUILD' },
  { filename: 'CONTEXT.md',  label: 'Context',  color: '#60A5FA', iconKey: 'CONTEXT' },
  { filename: 'RESEARCH.md', label: 'Research', color: '#6EE7B7', iconKey: 'RESEARCH' },
  { filename: 'ROADMAP.md',  label: 'Roadmap',  color: '#FB923C', iconKey: 'ROADMAP' },
]

function CanonRow({ entry, projectSlug, isLast, onClick }) {
  const [hov, setHov] = useState(false)
  const icon = CANON_ICONS[entry.iconKey] || CANON_ICONS.FOLDER
  return (
    <div
      data-testid={`project-canon-entry-${entry.filename}`}
      data-filename={entry.filename}
      data-project={projectSlug}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        height: 44, padding: '0 4px',
        cursor: 'pointer', borderRadius: 6,
        background: hov ? 'rgba(255,255,255,0.03)' : 'transparent',
        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
        transition: 'background 0.15s ease',
      }}
    >
      {icon(entry.color)}
      <span style={{
        flex: 1, fontSize: 13, fontWeight: 500, color: C.text,
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
      }}>{entry.label}</span>
      <span style={{
        fontSize: 10, fontWeight: 600, color: C.dim,
        fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
      }}>{entry.filename}</span>
    </div>
  )
}

function FolderDisclosure({ label, color, count, testid, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const folderIcon = CANON_ICONS.FOLDER
  return (
    <div data-testid={testid} aria-expanded={open ? 'true' : 'false'} style={{ marginTop: 6 }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          height: 40, padding: '0 4px',
          cursor: 'pointer', borderRadius: 6,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {folderIcon(color)}
        <span style={{
          flex: 1, fontSize: 13, fontWeight: 600, color: C.text,
          fontFamily: "'Inter', sans-serif",
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
        }}>{label}</span>
        {typeof count === 'number' && (
          <span style={{
            fontSize: 11, color: C.text2, fontFamily: "'Inter', sans-serif",
            background: C.chipBg, padding: '2px 7px', borderRadius: 10,
            flexShrink: 0,
          }}>{count}</span>
        )}
        <svg
          width={14} height={14} viewBox="0 0 24 24" fill="none"
          stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease', flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div style={{
        maxHeight: open ? 99999 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.25s ease',
        paddingLeft: 18,
      }}>
        {open && children}
      </div>
    </div>
  )
}

export function ProjectCanonSection() {
  const {
    activeProject,
    activeMissionPath,
    handleBriefClick,
    taskMissions,
    taskBriefs,
    taskAttachments,
  } = useTasksPanelCtx()

  // Hide unless a real project is active and no mission is drilled in.
  if (activeMissionPath) return null
  if (!activeProject || activeProject === 'all') return null

  const onClickCanon = (entry) => {
    handleBriefClick?.({
      project: activeProject,
      filename: entry.filename,
      source: 'canon',
 title: `${entry.label}, ${activeProject}`,
    })
  }

  const missionCount = Array.isArray(taskMissions) ? taskMissions.length : 0
  const filesCount = (Array.isArray(taskBriefs) ? taskBriefs.length : 0) + (Array.isArray(taskAttachments) ? taskAttachments.length : 0)

  return (
    <div
      data-testid="project-canon"
      data-project={activeProject}
      style={{ marginBottom: 16 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: 32, gap: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
          letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif",
        }}>
          Files
        </span>
      </div>
      <div style={{ height: 1, background: C.border }} />

      {PROJECT_CANON_ENTRIES.map((entry, i) => (
        <CanonRow
          key={entry.filename}
          entry={entry}
          projectSlug={activeProject}
          isLast={i === PROJECT_CANON_ENTRIES.length - 1}
          onClick={() => onClickCanon(entry)}
        />
      ))}

      <FolderDisclosure
        label="Missions"
        color="#60A5FA"
        count={missionCount}
        testid="project-canon-missions-folder"
      >
        <ProjectMissionsSection />
      </FolderDisclosure>

      <FolderDisclosure
        label="Files"
        color="#94A3B8"
        count={filesCount}
        testid="project-canon-files-folder"
      >
        <ProjectFilesSection />
      </FolderDisclosure>
    </div>
  )
}