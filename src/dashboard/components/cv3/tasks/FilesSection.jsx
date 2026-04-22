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
    <div style={{ marginTop: 24, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 32, gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif" }}>
          Files
        </span>
        <span style={{
          fontSize: 11, color: C.text2, fontFamily: "'Inter', sans-serif",
          background: C.dim + '40', padding: '2px 7px', borderRadius: 10,
          opacity: loading || allBriefs.length > 0 ? 1 : 0,
        }}>
          {loading ? '…' : allBriefs.length}
        </span>
        <div style={{ flex: 1 }} />
        <button
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
              key={slug}
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
  const [hoverBrief, setHoverBrief] = useState(null)
  const [attachBtnHover, setAttachBtnHover] = useState(false)

  const totalCount = briefs.length + attachments.length
  const hasBriefs = briefs.length > 0
  const hasAttachments = attachments.length > 0
  const showSubLabels = hasBriefs && hasAttachments

  const subLabelStyle = {
    fontSize: 9, fontWeight: 700, color: C.dim,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    marginBottom: 6, fontFamily: "'Inter', sans-serif",
  }

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
            background: C.dim + '40', padding: '2px 7px', borderRadius: 10,
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
        <div style={{ maxHeight: isOpen ? 800 : 0, overflow: 'hidden', transition: 'max-height 0.2s ease' }}>
          <div style={{ padding: '12px 0 4px' }}>

            {/* Empty state */}
            {!loading && !hasBriefs && !hasAttachments && (
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

            {/* Briefs row */}
            {hasBriefs && (
              <div style={{ marginBottom: hasAttachments ? 14 : 4 }}>
                {showSubLabels && <div style={subLabelStyle}>Briefs</div>}
                <div style={{
                  display: 'flex', gap: 8,
                  overflowX: isMobile ? 'auto' : 'visible',
                  flexWrap: isMobile ? 'nowrap' : 'wrap',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                }}>
                  {briefs.map((brief, idx) => {
                    const slug = brief.slug || (brief.filename || '').replace('.md', '') || String(idx)
                    const title = brief.title || brief.filename || 'Brief'
                    const agent = brief.agent || ''
                    const date = brief.dateFormatted || (brief.created_at ? new Date(brief.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')
                    const isHov = hoverBrief === (brief.id || idx)
                    return (
                      <div
                        key={brief.id || idx}
                        role="button"
                        tabIndex={0}
                        onClick={() => onBriefClick && onBriefClick(brief)}
                        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onBriefClick && onBriefClick(brief)}
                        onMouseEnter={() => setHoverBrief(brief.id || idx)}
                        onMouseLeave={() => setHoverBrief(null)}
                        style={{
                          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          width: isMobile ? 160 : 200,
                          minWidth: isMobile ? 160 : 200,
                          height: isMobile ? 72 : 80,
                          borderRadius: 10, flexShrink: 0,
                          background: isHov ? C.s3 : C.s2,
                          border: isHov ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.08)',
                          padding: '10px 12px 10px 15px',
                          cursor: 'pointer', position: 'relative', overflow: 'hidden',
                          transition: 'background 0.15s ease, border-color 0.15s ease',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: C.accent, borderRadius: '10px 0 0 10px' }} />
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          {date && <span style={{ fontSize: 10, color: C.dim, fontFamily: "'Inter', sans-serif" }}>{date}</span>}
                        </div>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'Inter', sans-serif",
                          lineHeight: 1.3, overflow: 'hidden',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis',
                        }}>
                          {title}
                        </div>
                        {agent && !isMobile && (
                          <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {agent}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Attachments list */}
            {hasAttachments && (
              <div>
                {showSubLabels && <div style={subLabelStyle}>Attachments</div>}
                {attachments.map((file, idx) => {
                  const filename = file.name || file.filename || 'File'
                  const sizeBytes = file.size || (file.content ? new Blob([file.content]).size : null)
                  const isLast = idx === attachments.length - 1
                  const isRowHov = hoveredRow === (file.id || idx)
                  return (
                    <div
                      key={file.id || idx}
                      onClick={() => handleAttachmentClick(file)}
                      onMouseEnter={() => setHoveredRow(file.id || idx)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        height: 40, padding: '0 4px', cursor: 'pointer', borderRadius: 6,
                        background: isRowHov ? 'rgba(255,255,255,0.03)' : 'transparent',
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
                      {(isMobile || isRowHov) && (
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
            )}
          </div>
        </div>

        {/* Bottom separator (between Files block and tasks below) */}
        <div style={{ height: 1, background: C.border, marginTop: isOpen ? 12 : 6 }} />
      </div>
    </>
  )
}
