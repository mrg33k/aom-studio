// TasksPanel -- task queue with search, filters, stats, and task creation
// Extracted from CornerV3.jsx
// pipeline-test 2026-04-12 safe_push verification -- do not remove
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { C } from '../../lib/cv3Colors.js'
import { getShippedCardColor } from './shared.jsx'
import { supabase } from '../../lib/supabase.js'
import { createTaskWithRex } from '../../lib/rexTaskClient.js'
import { useProjects } from '../../hooks/useProjects'
import { marked } from 'marked'

// Post-rewire task completion payload format (Apr 14 tape):
//   {type: link|image|video|text|check_external, payload, summary}
// Workers write this via scripts/task-complete.sh. The bash helper stores it
// under metadata.result_payload AND stringifies it into the plain `result`
// column for backwards compatibility. This component prefers metadata and
// falls back to parsing `result`.
function parseResultPayload(task) {
  const meta = task?.metadata
  if (meta && typeof meta === 'object' && meta.result_payload && meta.result_payload.type) {
    return meta.result_payload
  }
  const raw = task?.result
  if (typeof raw !== 'string' || !raw.trim()) return null
  const trimmed = raw.trim()
  if (trimmed[0] !== '{') return null
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && parsed.type) return parsed
  } catch {}
  return null
}

function ResultPreview({ task, isDark }) {
  const payload = parseResultPayload(task)
  const rawResult = task?.result

  // Fall back to the raw string display if we can't parse a typed payload.
  if (!payload) {
    if (!rawResult) return null
    return (
      <div style={{
        fontSize: 12,
        color: isDark ? 'rgba(240,244,255,0.7)' : 'rgba(0,0,0,0.6)',
        lineHeight: 1.5,
        padding: '8px 10px',
        marginBottom: 8,
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        borderRadius: 8,
        fontFamily: "'Inter', sans-serif",
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {rawResult}
      </div>
    )
  }

  const { type, payload: value, summary } = payload
  const box = {
    padding: '10px 12px',
    marginBottom: 8,
    borderRadius: 10,
    background: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.14)',
    border: isDark ? '1px solid rgba(16,185,129,0.28)' : '1px solid rgba(16,185,129,0.32)',
    fontFamily: "'Inter', sans-serif",
  }
  const summaryStyle = {
    fontSize: 11,
    color: isDark ? 'rgba(240,244,255,0.55)' : 'rgba(0,0,0,0.55)',
    marginTop: 6,
    lineHeight: 1.4,
  }

  if (type === 'link') {
    return (
      <div style={box}>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            borderRadius: 6,
            background: 'rgba(16,185,129,0.22)',
            color: isDark ? 'rgba(187,247,208,0.95)' : 'rgba(6,78,59,0.95)',
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 700,
          }}
        >Open link ↗</a>
        <div style={summaryStyle}>{summary || value}</div>
      </div>
    )
  }

  if (type === 'image') {
    return (
      <div style={box}>
        <img
          src={value}
          alt={summary || 'result'}
          style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, display: 'block' }}
        />
        {summary && <div style={summaryStyle}>{summary}</div>}
      </div>
    )
  }

  if (type === 'video') {
    return (
      <div style={box}>
        <video
          src={value}
          controls
          style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 6, display: 'block' }}
          onClick={e => e.stopPropagation()}
        />
        {summary && <div style={summaryStyle}>{summary}</div>}
      </div>
    )
  }

  if (type === 'text') {
    return (
      <div style={box}>
        <pre style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          margin: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          maxHeight: 160,
          overflow: 'auto',
          color: isDark ? 'rgba(240,244,255,0.85)' : 'rgba(0,0,0,0.8)',
        }}>{value}</pre>
        {summary && <div style={summaryStyle}>{summary}</div>}
      </div>
    )
  }

  if (type === 'check_external') {
    return (
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 24, height: 24, borderRadius: 12,
            background: 'rgba(245,158,11,0.22)',
            color: 'rgba(253,230,138,0.95)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800,
            flexShrink: 0,
          }}>!</span>
          <span style={{ fontSize: 12, color: isDark ? 'rgba(240,244,255,0.85)' : 'rgba(0,0,0,0.8)' }}>
            {value}
          </span>
        </div>
        {summary && <div style={summaryStyle}>{summary}</div>}
      </div>
    )
  }

  // Unknown payload type: show the raw string
  return (
    <div style={box}>
      <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
        {rawResult}
      </pre>
    </div>
  )
}

// ── Files Section ─────────────────────────────────────────────────────────────

function getFileTypeInfo(filename) {
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

function FileTypeChip({ filename }) {
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

function formatFileSize(bytes) {
  if (!bytes) return null
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1048576).toFixed(1)}MB`
}

function ProjectFilesSection({ isMobile, isOpen, onToggle, briefs, attachments, loading }) {
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

      <div style={{ marginBottom: 16 }}>
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
                    const href = brief.path || `/briefs/${slug}`
                    const isHov = hoverBrief === (brief.id || idx)
                    return (
                      <a
                        key={brief.id || idx}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
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
                          textDecoration: 'none', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                          transition: 'background 0.15s ease, border-color 0.15s ease',
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
                      </a>
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

// ── End Files Section ──────────────────────────────────────────────────────────

export default function TasksPanel({ queued, rightNow, waiting, done, worldId, refreshTasks, addOptimisticTask, showToast, currentUser, setActiveTab, setActiveConversation, setPrefillMessage }) {
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeProject, setActiveProject] = useState('all')
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [projectName,            setProjectName]            = useState('')
  const [selectedColor,          setSelectedColor]          = useState('#10B981')
  const [shippedLimit,           setShippedLimit]           = useState(50)
  const [projectDefs,            setProjectDefs]             = useState([])  // [{name, slug}]
  const [taskInput,              setTaskInput]              = useState('')
  const [taskInputFocused,       setTaskInputFocused]       = useState(false)
  const [taskSubmitting,         setTaskSubmitting]         = useState(false)
  const [expandedTask,           setExpandedTask]           = useState(null)
  const [taskThread,             setTaskThread]             = useState([])
  const [threadLoading,          setThreadLoading]          = useState(false)
  const [insightsOpen,           setInsightsOpen]           = useState({})
  const [insightsData,           setInsightsData]           = useState({})
  const [insightsLoading,        setInsightsLoading]        = useState({})
  const [insightsError,          setInsightsError]          = useState({})
  const taskInputRef = useRef(null)
  const [isRecording,  setIsRecording]  = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null) // eslint-disable-line no-unused-vars
  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])
  const micStreamRef     = useRef(null)

  // Files section state
  const [taskFilesOpen, setTaskFilesOpen] = useState(false)
  const [taskBriefs, setTaskBriefs] = useState([])
  const [taskAttachments, setTaskAttachments] = useState([])
  const [taskFilesLoading, setTaskFilesLoading] = useState(false)
  const [taskIsMobile, setTaskIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)

  // R2: live project summary card driven by project-summary-daemon events
  // Reads the latest row from the shared `events` table where
  // event_type='project_summary' and agent=<slug>. Polls every 4s while a
  // project pill is selected. Flashes on change.
  const [summaryEvent, setSummaryEvent] = useState(null)
  const [summaryJustUpdated, setSummaryJustUpdated] = useState(false)
  const [summaryNowTick, setSummaryNowTick] = useState(0)

  // Fetch task thread messages when a task is expanded
  const toggleTaskExpand = useCallback(async (taskId) => {
    if (expandedTask === taskId) {
      setExpandedTask(null)
      setTaskThread([])
      return
    }
    setExpandedTask(taskId)
    setThreadLoading(true)
    try {
      const { data } = await supabase
        .from('messages')
        .select('text,timestamp,role,source')
        .eq('agent', `task:${taskId}`)
        .order('timestamp', { ascending: true })
        .limit(30)
      setTaskThread(data || [])
    } catch { setTaskThread([]) }
    setThreadLoading(false)
  }, [expandedTask])

  // Fetch per-task failure insights (QA notes, error, failure-related pipeline events)
  const toggleInsights = useCallback(async (taskId) => {
    const alreadyOpen = !!insightsOpen[taskId]
    if (alreadyOpen) {
      setInsightsOpen(prev => ({ ...prev, [taskId]: false }))
      return
    }
    setInsightsOpen(prev => ({ ...prev, [taskId]: true }))

    // Already loaded -- show cached
    if (insightsData[taskId]) return

    setInsightsLoading(prev => ({ ...prev, [taskId]: true }))
    setInsightsError(prev => ({ ...prev, [taskId]: null }))
    try {
      if (!supabase) throw new Error('Supabase not configured')
      const [taskRes, msgRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('qa_score,qa_notes,error,metadata,attempt_count,result')
          .eq('id', taskId)
          .maybeSingle(),
        supabase
          .from('messages')
          .select('text,timestamp,role,source')
          .eq('agent', `task:${taskId}`)
          .order('timestamp', { ascending: false })
          .limit(40),
      ])
      if (taskRes.error) throw new Error(taskRes.error.message || 'Failed to load task')
      if (msgRes.error) throw new Error(msgRes.error.message || 'Failed to load logs')

      const row = taskRes.data || {}
      const allMsgs = msgRes.data || []
      const failureKeywords = /\b(qa|fail|error|stuck|timeout|reject|retry|denied|exception)\b/i
      const failureLogs = allMsgs
        .filter(m => {
          const src = String(m.source || m.role || '').toLowerCase()
          if (src.includes('qa') || src.includes('error') || src.includes('fail')) return true
          return failureKeywords.test(String(m.text || ''))
        })
        .slice(0, 15)
        .reverse()

      setInsightsData(prev => ({
        ...prev,
        [taskId]: {
          qaScore: row.qa_score ?? null,
          qaNotes: row.qa_notes || '',
          error: row.error || '',
          attemptCount: row.attempt_count || 1,
          resultSummary: row.result || '',
          failureLogs,
          logCount: failureLogs.length,
        },
      }))
    } catch (err) {
      setInsightsError(prev => ({ ...prev, [taskId]: err?.message || 'Failed to load insights' }))
    } finally {
      setInsightsLoading(prev => ({ ...prev, [taskId]: false }))
    }
  }, [insightsOpen, insightsData])

  const { projects: taskProjects } = useProjects()

  // Auto-start runner every time Tasks tab mounts
  useEffect(() => {
    fetch('/api/dashboard/task-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'startRunner' }),
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // R2: poll the latest project_summary event when a project pill is active.
  // The daemon writes new rows on debounce, so polling every 4s picks them up
  // within one beat. We flash the card when the timestamp advances.
  useEffect(() => {
    if (!activeProject || activeProject === 'all') {
      setSummaryEvent(null)
      setSummaryJustUpdated(false)
      return
    }
    let cancelled = false
    let lastSeenTs = null

    // R6 hotfix: events table has RLS on, anon key can't SELECT. Reading
    // the latest project_summary row through a server-side endpoint that
    // uses the service role key instead of a direct supabase-js query.
    const fetchLatest = async () => {
      try {
        const resp = await fetch(`/api/dashboard/project-summary?slug=${encodeURIComponent(activeProject)}`)
        if (cancelled) return
        if (!resp.ok) return
        const data = await resp.json().catch(() => null)
        if (cancelled) return
        const row = data?.event || null
        if (!row) {
          if (lastSeenTs !== null) setSummaryEvent(null)
          lastSeenTs = null
          return
        }
        if (row.timestamp !== lastSeenTs) {
          const wasFirst = lastSeenTs === null
          lastSeenTs = row.timestamp
          setSummaryEvent(row)
          if (!wasFirst) {
            setSummaryJustUpdated(true)
            window.setTimeout(() => setSummaryJustUpdated(false), 1800)
          }
        }
      } catch {
        // swallow — next tick will retry
      }
    }

    fetchLatest()
    const iv = window.setInterval(fetchLatest, 4000)
    return () => { cancelled = true; window.clearInterval(iv) }
  }, [activeProject])

  // Drive the "updated Ns ago" label without re-fetching
  useEffect(() => {
    if (!summaryEvent) return
    const iv = window.setInterval(() => setSummaryNowTick(t => t + 1), 1000)
    return () => window.clearInterval(iv)
  }, [summaryEvent])

  // Mobile breakpoint watcher for the Files section
  useEffect(() => {
    const handleResize = () => setTaskIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load project files when active project changes
  useEffect(() => {
    if (!activeProject || activeProject === 'all') {
      setTaskBriefs([])
      setTaskAttachments([])
      setTaskFilesOpen(false)
      return
    }
    let cancelled = false
    setTaskFilesLoading(true)
    Promise.all([
      fetch(`/api/dashboard/files?type=text&client=${encodeURIComponent(activeProject)}`).then(r => r.ok ? r.json() : { files: [] }).catch(() => ({ files: [] })),
      fetch(`/api/dashboard/files?type=images&prefix=${encodeURIComponent(activeProject)}/`).then(r => r.ok ? r.json() : { files: [] }).catch(() => ({ files: [] })),
      fetch(`/api/dashboard/files?type=briefs&project=${encodeURIComponent(activeProject)}`).then(r => r.ok ? r.json() : { briefs: [] }).catch(() => ({ briefs: [] })),
    ]).then(([textData, imgData, briefsData]) => {
      if (cancelled) return
      const textFiles = textData.files || []
      const textBriefs = textFiles.filter(f => String(f.filename || f.name || '').endsWith('.md'))
      const textAttachments = textFiles.filter(f => !String(f.filename || f.name || '').endsWith('.md'))
      const images = (imgData.files || []).map(f => ({ ...f, filename: f.name }))
      const indexBriefs = briefsData.briefs || []
      const seenSlugs = new Set(indexBriefs.map(b => b.slug).filter(Boolean))
      const mergedBriefs = [...indexBriefs, ...textBriefs.filter(b => !seenSlugs.has(b.slug))]
      setTaskBriefs(mergedBriefs)
      setTaskAttachments([...textAttachments, ...images])
      const hasAny = mergedBriefs.length > 0 || textAttachments.length > 0 || images.length > 0
      setTaskFilesOpen(hasAny)
    }).catch(() => {
      if (!cancelled) { setTaskBriefs([]); setTaskAttachments([]); setTaskFilesOpen(false) }
    }).finally(() => { if (!cancelled) setTaskFilesLoading(false) })
    return () => { cancelled = true }
  }, [activeProject])

  // Instant task maker: submit handler
  const handleTaskSubmit = useCallback(async () => {
    const text = taskInput.trim()
    if (!text || taskSubmitting) return

    setTaskSubmitting(true)
    try {
      const userId   = currentUser?.id || null
      const userName = currentUser?.user_metadata?.full_name || null
      // R5: pass the active project pill (if any) so the task gets the
      // right project + repo_path without Haiku guessing.
      const projectSlug = (activeProject && activeProject !== 'all') ? activeProject : null
      const result = await createTaskWithRex(text, userId, userName, {
        projectSlug,
        clientId: worldId || 'aom',
      })
      setTaskInput('')
      if (result.task) {
        if (addOptimisticTask) addOptimisticTask(result.task)
      } else {
        if (refreshTasks) refreshTasks()
      }
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to create task')
    } finally {
      setTaskSubmitting(false)
    }
  }, [taskInput, taskSubmitting, currentUser, addOptimisticTask, refreshTasks, showToast])

  const handleTaskInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTaskSubmit()
    }
  }, [handleTaskSubmit])

  const toggleVoiceRecording = useCallback(async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      micStreamRef.current = stream
      audioChunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setRecordedBlob(blob)
        console.log('[voice-task] Captured audio blob:', blob, 'size:', blob.size, 'bytes')
        micStreamRef.current?.getTracks().forEach(t => t.stop())
        micStreamRef.current = null
        setIsRecording(false)
      }
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('[voice-task] Mic access error:', err)
    }
  }, [isRecording])

  // Load project definitions from Supabase on mount
  useEffect(() => {
    if (!supabase) return
    supabase.from('projects').select('name,slug').eq('is_active', true).eq('client_id', worldId).order('name')
      .then(({ data }) => {
        if (data) setProjectDefs(data.map(p => ({ name: p.name, slug: p.slug })))
      })
  }, [])

  const active    = [...(rightNow || []), ...(queued || [])]
  const completed = done || []
  const waitingTasks = waiting || []

  const getTaskProject = useCallback((task) => {
    const projectPath = task?.project_path || task?.projectPath || ''
    const normalizedPath = String(projectPath || '').toLowerCase()
    const projectSlug = task?.project_slug || task?.projectSlug || (normalizedPath ? normalizedPath.split('/').filter(Boolean).pop() : '')
    return taskProjects.find((project) => {
      const slug = String(project?.slug || '').toLowerCase()
      const name = String(project?.name || '').toLowerCase()
      return (projectSlug && slug === String(projectSlug).toLowerCase())
        || (normalizedPath && slug && normalizedPath.endsWith(`/${slug}`))
        || (normalizedPath && name && normalizedPath.includes(name))
    }) || null
  }, [taskProjects])

  // Reply input state for waiting tasks
  const [waitingReply, setWaitingReply] = useState({})
  const [waitingReplySending, setWaitingReplySending] = useState({})

  // Project pills from Supabase projects table -- [{name, slug}] with 'all' sentinel
  const projectPills = [{ name: 'All', slug: 'all' }, ...projectDefs]
  // Slug-to-name map for display in summary header etc.
  const slugToName = useMemo(() => Object.fromEntries(projectDefs.map(p => [p.slug, p.name])), [projectDefs])

  // Filter helper -- matches on the task's project field (slug), not title text
  function filterTasks(tasks) {
    return tasks.filter(t => {
      const title  = (t.title || t.text || '').toLowerCase()
      const matchQ = !searchQuery || title.includes(searchQuery.toLowerCase())
      if (activeProject === 'all') return matchQ
      const taskProject = (t.project || '').toLowerCase()
      return matchQ && taskProject === activeProject
    })
  }

  const filteredActive    = filterTasks(active)
  const isDismissed       = t => t.metadata?.dismissed === true
  const filteredFailed    = filterTasks(completed.filter(t => t.status === 'failed' && !isDismissed(t)))
  const filteredCompleted = filterTasks(completed.filter(t => t.status !== 'failed' && !isDismissed(t)))

  // Per-day task counts for M-S bar chart
  const now         = new Date()
  const dayOfWeek   = now.getDay()
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart   = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - daysFromMon)

  const dailyCounts = [0, 0, 0, 0, 0, 0, 0]
  for (const t of completed) {
    const ts = t.completed_at || t.updated_at || t.created_at
    if (!ts) continue
    const date = new Date(ts)
    if (date >= weekStart) {
      const d   = date.getDay()
      const idx = d === 0 ? 6 : d - 1
      dailyCounts[idx]++
    }
  }
  const maxDailyCount = Math.max(...dailyCounts, 1)
  const weekTotal     = dailyCounts.reduce((s, c) => s + c, 0)

  // Weekly stats derived from completed tasks
  const weekCompleted = completed.filter(t => {
    const ts = t.completed_at || t.updated_at || t.created_at
    if (!ts) return false
    return new Date(ts) >= weekStart
  })
  const withQA    = weekCompleted.filter(t => t.qa_score || t.qaScore)
  const avgQA     = withQA.length > 0
    ? (withQA.reduce((s, t) => s + Number(t.qa_score || t.qaScore || 0), 0) / withQA.length).toFixed(1)
    : null
  const passCount = withQA.filter(t => Number(t.qa_score || t.qaScore || 0) >= 8).length
  // Denominator = ALL completed this week. Tasks without QA score = unknown, not pass.
  const passRate  = weekCompleted.length > 0 ? Math.round((passCount / weekCompleted.length) * 100) : null
  const qaRatio   = `${withQA.length}/${weekCompleted.length}`
  const DAY_LABELS    = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const MIN_BAR_H     = 2
  const MAX_BAR_H     = 19

  // Time-based greeting
  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening'

  // Lifecycle colors from design spec
  const LIFECYCLE = {
    queued:   '#E91E90', // fuschia
    working:  '#FF6B3D', // orange
    done:     '#22C55E', // green
    failed:   '#EF4444', // red
    waiting:  '#F59E0B', // yellow/amber
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

      {/* Keyframes for animated progress bars */}
      <style>{`
        @keyframes cv3-progress-sweep {
          0%   { width: 25% }
          50%  { width: 72% }
          100% { width: 25% }
        }
        @keyframes bld {
          0%   { width: 5% }
          50%  { width: 60% }
          100% { width: 90% }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes rec-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5) } 60% { box-shadow: 0 0 0 8px rgba(239,68,68,0) } }
        @keyframes rec-dot { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        @keyframes cv3-summary-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.45); border-color: rgba(16,185,129,0.55) }
          70%  { box-shadow: 0 0 0 12px rgba(16,185,129,0) }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0) }
        }
        @keyframes cv3-summary-dot {
          0%, 100% { opacity: 0.35; transform: scale(1) }
          50%      { opacity: 1;    transform: scale(1.4) }
        }
        .briefing-summary-body {
          font-family: 'Inter', sans-serif;
          word-break: break-word;
        }
        .briefing-summary-body p {
          margin: 0 0 8px 0;
          line-height: 1.65;
        }
        .briefing-summary-body p:last-child { margin-bottom: 0; }
        .briefing-summary-body strong { font-weight: 700; color: #F1F5F9; }
        .briefing-summary-body em { font-style: italic; color: #94A3B8; }
        .briefing-summary-body ul, .briefing-summary-body ol {
          margin: 6px 0 10px 0;
          padding-left: 18px;
        }
        .briefing-summary-body li {
          margin-bottom: 4px;
          line-height: 1.55;
        }
        .briefing-summary-body h1, .briefing-summary-body h2,
        .briefing-summary-body h3, .briefing-summary-body h4 {
          font-weight: 700;
          color: #F1F5F9;
          margin: 12px 0 6px 0;
          line-height: 1.3;
        }
        .briefing-summary-body h1 { font-size: 15px; }
        .briefing-summary-body h2 { font-size: 14px; }
        .briefing-summary-body h3 { font-size: 13px; }
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
        .briefing-summary-body hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.08);
          margin: 12px 0;
        }
        .briefing-summary-body blockquote {
          border-left: 3px solid rgba(255,255,255,0.15);
          margin: 8px 0;
          padding: 4px 12px;
          color: #94A3B8;
        }
        @keyframes rn-glow {
          0%, 100% { opacity: 0.4 }
          50%      { opacity: 1 }
        }
      `}</style>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 24px' }}>

        {/* ── Greeting header ─────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            color: C.text,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            margin: 0,
          }}>
            {greeting}<span style={{ color: C.accent }}>.</span>
          </h1>
          <p style={{
            fontSize: 14,
            fontWeight: 500,
            color: C.muted,
            margin: '6px 0 0',
            lineHeight: 1.4,
          }}>
            {filteredActive.length > 0
              ? `${filteredActive.length} task${filteredActive.length !== 1 ? 's' : ''} in motion`
              : 'All clear'}
            {waitingTasks.length > 0 ? ` · ${waitingTasks.length} need${waitingTasks.length !== 1 ? '' : 's'} input` : ''}
            {filteredCompleted.length > 0 ? ` · ${filteredCompleted.length} done` : ''}
          </p>
        </div>

        {/* ── Search + Project filters ────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          {/* Search input — minimal */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid ' + (searchFocused ? 'rgba(255,255,255,0.1)' : 'transparent'),
            borderRadius: 14,
            padding: '10px 16px',
            transition: 'border-color 0.2s, background 0.2s',
            marginBottom: 12,
          }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
              stroke={C.dim} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: C.text,
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
                  fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
                }}
              >×</button>
            )}
          </div>

          {/* Project filter pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
            {projectPills.map(p => {
              const isActive = activeProject === p.slug
              return (
                <button
                  key={p.slug}
                  onClick={() => setActiveProject(p.slug)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                    border: isActive ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                    color: isActive ? C.accent : C.text2,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >{p.name}</button>
              )
            })}
            <button
              onClick={() => {
                if (!showCreateProjectModal) { setProjectName(''); setSelectedColor('#10B981'); }
                setShowCreateProjectModal(prev => !prev);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 500,
                lineHeight: 1,
                cursor: 'pointer',
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.03)',
                color: C.text2,
                fontFamily: "'Inter', sans-serif",
              }}
            >+</button>
          </div>
        </div>

        {/* Project briefing card — executive snapshot, not dev notes.
            Data: project-summary-daemon → events table → /api/dashboard/project-summary.
            Polls every 4s via useEffect above. */}
        {activeProject && activeProject !== 'all' && (() => {
          const payload = summaryEvent?.payload || null
          const rowTs   = summaryEvent?.timestamp || null
          const rowMs   = rowTs ? Date.parse(rowTs) : null
          const ageSecs = rowMs ? Math.max(0, Math.round((Date.now() - rowMs) / 1000)) : null
          void summaryNowTick
          const ageLabel = ageSecs == null
            ? '—'
            : ageSecs < 5   ? 'just now'
            : ageSecs < 60  ? `${ageSecs}s ago`
            : ageSecs < 3600 ? `${Math.round(ageSecs / 60)}m ago`
            : `${Math.round(ageSecs / 3600)}h ago`
          const openN   = payload?.open_task_count ?? null
          const doneArr = Array.isArray(payload?.recent_completions) ? payload.recent_completions : []
          const summaryText = (payload?.summary_md || '').trim()
          const reasonsArr  = Array.isArray(payload?.reasons) ? payload.reasons : []
          const headerMd = (payload?.context_header_md || '').trim()
          const taglineMatch = headerMd.match(/\*\*What it is:\*\*\s*([^\n]+)/i)
          const tagline = taglineMatch ? taglineMatch[1].trim() : ''
          const activityEntries = Array.isArray(payload?.recent_activity) ? payload.recent_activity : []
          const projectRec  = taskProjects?.find(p => String(p.slug || '').toLowerCase() === activeProject)
          const projColor   = projectRec?.color || '#6B8AB0'
          const projName    = projectRec?.name || slugToName[activeProject] || activeProject

          // Parse summary_md through marked so **bold**, bullets, etc. render as HTML
          const parseSummaryHtml = (md) => {
            if (!md) return ''
            try {
              let html = marked.parse(md, { breaks: true, gfm: true })
              html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              return html
            } catch { return md }
          }

          return (
            <div
              style={{
                marginBottom: 20,
                borderRadius: 16,
                background: C.s1,
                border: `1px solid ${summaryJustUpdated ? 'rgba(16,185,129,0.4)' : C.border2}`,
                animation: summaryJustUpdated ? 'cv3-summary-pulse 1.8s ease-out' : 'none',
                transition: 'border-color 0.3s ease',
                fontFamily: "'Inter', sans-serif",
                overflow: 'hidden',
              }}
            >
              {/* ── Top accent bar ── */}
              <div style={{
                height: 3,
                background: `linear-gradient(90deg, ${projColor}, ${projColor}66)`,
                opacity: summaryJustUpdated ? 1 : 0.6,
                transition: 'opacity 0.3s ease',
              }} />

              <div style={{ padding: '20px 22px 18px' }}>
                {/* ── Header: name + live badge ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tagline ? 6 : 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: projColor,
                      boxShadow: summaryJustUpdated ? `0 0 8px ${projColor}88` : 'none',
                      transition: 'box-shadow 0.3s ease',
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: 18, fontWeight: 800, color: C.text,
                      letterSpacing: '-0.02em',
                    }}>
                      {projName}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: summaryJustUpdated ? C.accent : C.muted,
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: 'color 0.25s ease',
                  }}>
                    {summaryEvent ? (summaryJustUpdated ? 'just updated' : ageLabel) : 'awaiting data'}
                  </span>
                </div>

                {/* ── Tagline ── */}
                {tagline && (
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    color: C.text2,
                    marginBottom: 16,
                    lineHeight: 1.5,
                  }}>
                    {tagline}
                  </div>
                )}

                {/* ── Status strip ── */}
                {summaryEvent && (
                  <div style={{
                    display: 'flex', gap: 8, flexWrap: 'wrap',
                    marginBottom: summaryText ? 16 : 0,
                  }}>
                    {openN != null && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: C.text,
                        padding: '5px 12px', borderRadius: 8,
                        background: `${projColor}18`,
                        border: `1px solid ${projColor}30`,
                        letterSpacing: '-0.01em',
                      }}>
                        {openN} active
                      </span>
                    )}
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: C.accent,
                      padding: '5px 12px', borderRadius: 8,
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.18)',
                      letterSpacing: '-0.01em',
                    }}>
                      {doneArr.length} shipped today
                    </span>
                    {reasonsArr.length > 0 && reasonsArr.map((r, ri) => (
                      <span key={ri} style={{
                        fontSize: 11, fontWeight: 600, color: C.text2,
                        padding: '5px 12px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${C.border2}`,
                      }}>
                        {r}
                      </span>
                    ))}
                  </div>
                )}

                {/* ── Summary body — parsed markdown ── */}
                {summaryText ? (
                  <div
                    className="briefing-summary-body"
                    style={{
                      fontSize: 13, lineHeight: 1.65,
                      color: C.text2,
                    }}
                    dangerouslySetInnerHTML={{ __html: parseSummaryHtml(summaryText) }}
                  />
                ) : (
                  <div style={{
                    fontSize: 13, color: C.dim,
                    padding: '12px 0',
                    lineHeight: 1.5,
                  }}>
                    Waiting for first project event. Summary appears after the next task or message.
                  </div>
                )}

                {/* ── Recent activity ── */}
                {activityEntries.length > 0 && (
                  <div style={{
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: `1px solid ${C.border2}`,
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: C.muted,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      marginBottom: 10,
                    }}>
                      Latest
                    </div>
                    {activityEntries.slice(0, 3).map((entry, i) => {
                      const raw = entry.replace(/^-\s*/, '')
                      const modelMatch = raw.match(/`([^`]+)`/)
                      const taskMatch = raw.match(/_\(task\s+([a-f0-9]+)\)_/)
                      const modelStr = modelMatch ? modelMatch[1] : ''
                      const taskId = taskMatch ? taskMatch[1] : ''
                      let text = raw
                        .replace(/\*\*[^*]+\*\*\s*/, '')
                        .replace(/`[^`]+`\s*/, '')
                        .replace(/\s*_\(task\s+[a-f0-9]+\)_\s*$/, '')
                        .trim()
                      return (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 6,
                          fontSize: 12,
                          color: C.text2,
                        }}>
                          <div style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: i === 0 ? projColor : C.dim,
                            flexShrink: 0,
                          }} />
                          {modelStr && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, color: C.muted,
                              padding: '2px 6px', borderRadius: 4,
                              background: 'rgba(255,255,255,0.05)',
                              fontFamily: "'JetBrains Mono', monospace",
                              flexShrink: 0,
                            }}>
                              {modelStr}
                            </span>
                          )}
                          <span style={{ flex: 1, lineHeight: 1.4 }}>{text}</span>
                          {taskId && (
                            <span style={{
                              fontSize: 9, color: C.dim,
                              fontFamily: "'JetBrains Mono', monospace",
                              flexShrink: 0,
                            }}>
                              {taskId}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* ── Files section ───────────────────────────────────── */}
        {activeProject && activeProject !== 'all' && (
          <ProjectFilesSection
            isMobile={taskIsMobile}
            isOpen={taskFilesOpen}
            onToggle={() => setTaskFilesOpen(prev => !prev)}
            briefs={taskBriefs}
            attachments={taskAttachments}
            loading={taskFilesLoading}
          />
        )}

        {/* ── RIGHT NOW — Hero section ─────────────────────────── */}
        {filteredActive.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
              <h2 style={{
                fontSize: 20,
                fontWeight: 800,
                color: C.text,
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1,
              }}>
                Right Now
              </h2>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: LIFECYCLE.working,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {filteredActive.length}
              </span>
            </div>
            {filteredActive.map((t, i) => {
              const isBuilding = t.status === 'building' || t.status === 'qa'
              const cardColor = isBuilding ? LIFECYCLE.working : LIFECYCLE.queued
              const statusLabel = t.status === 'building' ? 'Building' : t.status === 'qa' ? 'QA' : t.status === 'planning' ? 'Planning' : t.status === 'classifying' ? 'Classifying' : 'Queued'
              return (
              <div
                key={t.id}
                onClick={() => toggleTaskExpand(t.id)}
                style={{
                  padding: '18px 20px',
                  marginBottom: 10,
                  borderRadius: 16,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  background: `linear-gradient(135deg, ${cardColor}12, ${cardColor}06)`,
                  border: `1px solid ${expandedTask === t.id ? cardColor + '40' : cardColor + '18'}`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = `0 12px 32px ${cardColor}15`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = ''
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                {/* Animated top progress bar */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: 3,
                  background: `linear-gradient(90deg, ${cardColor}, ${cardColor}88)`,
                  animation: isBuilding ? 'bld 5s ease-in-out infinite' : 'bld 8s ease-in-out infinite',
                  borderRadius: '16px 16px 0 0',
                  opacity: isBuilding ? 1 : 0.6,
                }} />

                {/* Card content row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      color: C.text,
                      fontSize: 16,
                      fontWeight: 700,
                      lineHeight: 1.25,
                      letterSpacing: '-0.01em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: expandedTask === t.id ? 'normal' : 'nowrap',
                    }}>
                      {t.title || t.text || 'Untitled task'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {/* Status pill */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 10px',
                        borderRadius: 12,
                        background: cardColor + '18',
                        fontSize: 11,
                        fontWeight: 700,
                        color: cardColor,
                        letterSpacing: '0.02em',
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: cardColor,
                          animation: isBuilding ? 'rn-glow 2s ease-in-out infinite' : 'none',
                          flexShrink: 0,
                        }} />
                        {statusLabel}
                      </span>
                      {t.project_id && (() => {
                        const proj = taskProjects.find(p => String(p.id) === String(t.project_id))
                        return proj ? <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: proj.color, flexShrink: 0 }} /> : null
                      })()}
                      {(t.agent_identity || t.agentIdentity) && (
                        <span style={{ color: C.muted, fontSize: 11, fontWeight: 600 }}>
                          {t.agent_identity || t.agentIdentity}
                        </span>
                      )}
                      {t.attempt_count > 1 && (
                        <span style={{ color: C.dim, fontSize: 11, fontWeight: 600 }}>
                          Attempt {t.attempt_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, paddingTop: 2 }}>
                    <div style={{
                      color: cardColor,
                      fontSize: 14,
                      fontWeight: 800,
                      lineHeight: 1,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {t.qa_score || t.qaScore || '...'}
                    </div>
                  </div>
                </div>
                {/* Expandable thread */}
                {expandedTask === t.id && (
                  <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                    {threadLoading ? (
                      <div style={{ fontSize: 12, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>Loading...</div>
                    ) : taskThread.length === 0 ? (
                      <div style={{ fontSize: 12, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>No pipeline events yet.</div>
                    ) : taskThread.map((m, idx) => (
                      <div key={idx} style={{
                        fontSize: 12, color: C.text2, lineHeight: 1.5,
                        padding: '4px 0',
                        fontFamily: "'JetBrains Mono', monospace",
                        borderBottom: idx < taskThread.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      }}>
                        <span style={{ color: C.dim, fontSize: 10 }}>{(m.timestamp || '').slice(11, 19)}</span>
                        {' '}
                        <span>{m.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )})}

          </div>
        )}

        {/* ── This Week — Clean stats ─────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 16,
          padding: '18px 20px',
          marginBottom: 36,
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            color: C.text2,
            margin: '0 0 14px',
            letterSpacing: '-0.01em',
          }}>This Week</h3>

          {/* 7-day bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 36 }}>
            {DAY_LABELS.map((label, i) => {
              const count    = dailyCounts[i]
              const isFuture = i > (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
              const barH     = count > 0 ? Math.round((count / maxDailyCount) * (MAX_BAR_H - MIN_BAR_H)) + MIN_BAR_H : MIN_BAR_H
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 4 }}>
                  <div style={{
                    width: '100%',
                    height: barH,
                    borderRadius: 4,
                    background: isFuture || count === 0 ? 'rgba(255,255,255,0.04)' : C.accent,
                    minHeight: 2,
                    transition: 'height 0.3s ease',
                  }} />
                  <div style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: C.dim,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{label}</div>
                </div>
              )
            })}
          </div>

          {/* Metrics row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, textAlign: 'center', color: C.text }}>{weekTotal}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textAlign: 'center', marginTop: 2 }}>Tasks</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, textAlign: 'center', color: C.text }}>{passRate !== null ? passRate + '%' : '--'}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textAlign: 'center', marginTop: 2 }}>Pass Rate</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, textAlign: 'center', color: C.text }}>{avgQA !== null ? avgQA : '--'}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textAlign: 'center', marginTop: 2 }}>Avg QA</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, textAlign: 'center', color: C.text }}>{qaRatio}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textAlign: 'center', marginTop: 2 }}>QAd</div>
            </div>
          </div>
        </div>

        {/* ── Needs Input ──────────────────────────────────────── */}
        {waitingTasks.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <h2 style={{
              fontSize: 20,
              fontWeight: 800,
              color: LIFECYCLE.waiting,
              letterSpacing: '-0.02em',
              margin: '0 0 16px',
              lineHeight: 1,
            }}>
              Needs Input
            </h2>
            {waitingTasks.map((t) => {
              const agent = t.agent_identity || t.agentIdentity || 'agent'
              const question = t.metadata?.checkpoint?.question || 'Waiting for your input...'
              const replyText = waitingReply[t.id] || ''
              const sending = waitingReplySending[t.id] || false
              return (
                <div
                  key={t.id}
                  style={{
                    padding: '18px 20px',
                    marginBottom: 10,
                    borderRadius: 16,
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.12)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: LIFECYCLE.waiting,
                      padding: '2px 8px', borderRadius: 8,
                      background: 'rgba(245,158,11,0.12)',
                    }}>{agent}</span>
                  </div>
                  <div style={{
                    fontSize: 16, fontWeight: 700,
                    color: 'rgba(240,244,255,0.8)',
                    lineHeight: 1.25,
                    marginBottom: 10,
                  }}>
                    {t.title || t.text || 'Untitled task'}
                  </div>
                  <div style={{
                    fontSize: 14, color: LIFECYCLE.waiting, lineHeight: 1.5,
                    padding: '10px 14px', borderRadius: 12,
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.1)',
                    marginBottom: 12,
                  }}>
                    {question}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setWaitingReply(prev => ({ ...prev, [t.id]: e.target.value }))}
                      onKeyDown={async e => {
                        if (e.key === 'Enter' && replyText.trim() && !sending) {
                          setWaitingReplySending(prev => ({ ...prev, [t.id]: true }))
                          await fetch('/api/dashboard/task-action', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'resume', taskId: t.id, payload: { answer: replyText.trim() } }),
                          })
                          setWaitingReply(prev => ({ ...prev, [t.id]: '' }))
                          setWaitingReplySending(prev => ({ ...prev, [t.id]: false }))
                        }
                      }}
                      placeholder="Reply..."
                      style={{
                        flex: 1, padding: '10px 14px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 12, color: C.text,
                        fontSize: 14, fontFamily: "'Inter', sans-serif",
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={async () => {
                        if (!replyText.trim() || sending) return
                        setWaitingReplySending(prev => ({ ...prev, [t.id]: true }))
                        await fetch('/api/dashboard/task-action', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'resume', taskId: t.id, payload: { answer: replyText.trim() } }),
                        })
                        setWaitingReply(prev => ({ ...prev, [t.id]: '' }))
                        setWaitingReplySending(prev => ({ ...prev, [t.id]: false }))
                      }}
                      disabled={!replyText.trim() || sending}
                      style={{
                        padding: '10px 16px', borderRadius: 12,
                        background: replyText.trim() && !sending ? LIFECYCLE.waiting : 'rgba(255,255,255,0.04)',
                        border: 'none', cursor: replyText.trim() && !sending ? 'pointer' : 'default',
                        color: replyText.trim() && !sending ? '#000' : C.muted,
                        fontSize: 13, fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {sending ? '...' : 'Reply'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Failed ──────────────────────────────────────────── */}
        {filteredFailed.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{
                fontSize: 18,
                fontWeight: 800,
                color: LIFECYCLE.failed,
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1,
              }}>
                Failed
              </h2>
              <button
                onClick={async () => {
                  for (const t of filteredFailed) {
                    await fetch('/api/dashboard/task-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss', taskId: t.id }) })
                  }
                  refreshTasks()
                }}
                style={{ fontSize: 12, fontWeight: 600, color: C.dim, cursor: 'pointer', background: 'none', border: 'none', padding: '4px 0', WebkitTapHighlightColor: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.color = C.muted }}
                onMouseLeave={e => { e.currentTarget.style.color = C.dim }}
              >
                Clear all
              </button>
            </div>
            {filteredFailed.map((t) => {
              const qa = t.qa_score || t.qaScore
              const agent = t.agent_identity || t.agentIdentity
              return (
                <div
                  key={t.id}
                  onClick={() => toggleTaskExpand(t.id)}
                  style={{
                    padding: '18px 20px',
                    marginBottom: 10,
                    borderRadius: 16,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: 'rgba(239,68,68,0.05)',
                    border: expandedTask === t.id ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(239,68,68,0.1)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 700,
                        color: 'rgba(240,244,255,0.6)',
                        lineHeight: 1.25,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: expandedTask === t.id ? 'normal' : 'nowrap',
                      }}>
                        {t.title || t.text || 'Untitled task'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        {agent && <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(240,244,255,0.25)' }}>{agent}</span>}
                        {qa && <span style={{ fontSize: 11, fontWeight: 700, color: LIFECYCLE.failed }}>QA {qa}/10</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const prompt = typeof t.result === 'string' ? t.result.trim() : ''
                          const project = getTaskProject(t)
                          if (!project || !prompt) {
                            if (showToast) showToast('No linked project or prompt found for this failed task.')
                            return
                          }
                          setPrefillMessage(prompt)
                          setActiveConversation(project)
                          setActiveTab('chat')
                        }}
                        style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', cursor: 'pointer', padding: '4px 8px', background: 'none', border: 'none', WebkitTapHighlightColor: 'transparent' }}
                      >
                        Requeue
                      </button>
                      <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11 }}>|</span>
                      <button
                        data-test-id={`failed-task-insights-${t.id}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleInsights(t.id)
                        }}
                        style={{ fontSize: 11, fontWeight: 700, color: insightsOpen[t.id] ? '#F0F4FF' : '#F59E0B', cursor: 'pointer', padding: '4px 8px', background: 'none', border: 'none', WebkitTapHighlightColor: 'transparent' }}
                      >
                        {insightsOpen[t.id] ? 'Hide' : 'Insights'}
                      </button>
                      <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11 }}>|</span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await fetch('/api/dashboard/task-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss', taskId: t.id }) })
                          refreshTasks()
                        }}
                        style={{ fontSize: 11, fontWeight: 600, color: C.dim, cursor: 'pointer', padding: '4px 8px', background: 'none', border: 'none', WebkitTapHighlightColor: 'transparent' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  {/* Per-task Failure Insights panel */}
                  {insightsOpen[t.id] && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        marginTop: 10,
                        borderTop: '1px solid rgba(239,68,68,0.2)',
                        paddingTop: 10,
                        background: 'rgba(0,0,0,0.18)',
                        margin: '10px -16px -14px',
                        padding: '10px 16px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>
                          Failure Insights
                        </span>
                        {insightsData[t.id] && (insightsData[t.id].attemptCount > 1) && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: C.dim, letterSpacing: '0.06em' }}>
                            · {insightsData[t.id].attemptCount} attempts
                          </span>
                        )}
                      </div>
                      {insightsLoading[t.id] ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>
                          <div style={{ width: 10, height: 10, border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          Loading insights...
                        </div>
                      ) : insightsError[t.id] ? (
                        <div style={{ fontSize: 11, color: '#EF4444', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                          <div style={{ marginBottom: 6 }}>Failed to load insights: {insightsError[t.id]}</div>
                          <button
                            onClick={() => toggleInsights(t.id)}
                            style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', cursor: 'pointer', padding: '4px 8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6 }}
                          >
                            Retry
                          </button>
                        </div>
                      ) : insightsData[t.id] ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {/* Top facts row */}
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontSize: 8, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>QA Score</div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#EF4444', fontFamily: "'JetBrains Mono', monospace" }}>
                                {insightsData[t.id].qaScore != null ? `${insightsData[t.id].qaScore}/10` : '—'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 8, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Failure Events</div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#F59E0B', fontFamily: "'JetBrains Mono', monospace" }}>
                                {insightsData[t.id].logCount}
                              </div>
                            </div>
                          </div>

                          {/* QA notes */}
                          {insightsData[t.id].qaNotes ? (
                            <div>
                              <div style={{ fontSize: 8, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>QA Notes</div>
                              <div style={{
                                fontSize: 12, color: 'rgba(240,244,255,0.82)', lineHeight: 1.5,
                                padding: '7px 10px', borderRadius: 8,
                                background: 'rgba(245,158,11,0.08)',
                                border: '1px solid rgba(245,158,11,0.18)',
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                              }}>{insightsData[t.id].qaNotes}</div>
                            </div>
                          ) : null}

                          {/* Error message */}
                          {insightsData[t.id].error ? (
                            <div>
                              <div style={{ fontSize: 8, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Error</div>
                              <div style={{
                                fontSize: 11, color: '#FCA5A5', lineHeight: 1.5,
                                padding: '7px 10px', borderRadius: 8,
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                fontFamily: "'JetBrains Mono', monospace",
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                              }}>{insightsData[t.id].error}</div>
                            </div>
                          ) : null}

                          {/* Failure logs */}
                          <div>
                            <div style={{ fontSize: 8, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Pipeline Logs</div>
                            {insightsData[t.id].failureLogs.length === 0 ? (
                              <div style={{ fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace", fontStyle: 'italic' }}>
                                No failure-related events logged.
                              </div>
                            ) : (
                              <div style={{ maxHeight: 180, overflowY: 'auto', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '6px 8px' }}>
                                {insightsData[t.id].failureLogs.map((m, idx) => (
                                  <div key={idx} style={{
                                    fontSize: 11, color: 'rgba(240,244,255,0.75)', lineHeight: 1.5,
                                    padding: '3px 0',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    borderBottom: idx < insightsData[t.id].failureLogs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                  }}>
                                    <span style={{ color: C.dim, fontSize: 9 }}>{(m.timestamp || '').slice(11, 19)}</span>
                                    {m.source || m.role ? (
                                      <span style={{ color: '#F59E0B', fontSize: 9, fontWeight: 700, marginLeft: 4, textTransform: 'uppercase' }}>
                                        {String(m.source || m.role).slice(0, 8)}
                                      </span>
                                    ) : null}
                                    {' '}
                                    <span>{m.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {!insightsData[t.id].qaNotes && !insightsData[t.id].error && insightsData[t.id].failureLogs.length === 0 ? (
                            <div style={{ fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace", fontStyle: 'italic' }}>
                              No QA notes or failure logs recorded for this task.
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                  {/* Expandable: result summary + thread */}
                  {expandedTask === t.id && (
                    <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                      <ResultPreview task={t} isDark={true} />
                      {threadLoading ? (
                        <div style={{ fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>Loading...</div>
                      ) : taskThread.length === 0 && !t.result ? (
                        <div style={{ fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>No pipeline events.</div>
                      ) : taskThread.map((m, idx) => (
                        <div key={idx} style={{
                          fontSize: 11, color: C.text2, lineHeight: 1.4,
                          padding: '3px 0',
                          fontFamily: "'JetBrains Mono', monospace",
                          borderBottom: idx < taskThread.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        }}>
                          <span style={{ color: C.dim, fontSize: 9 }}>{(m.timestamp || '').slice(11, 19)}</span>
                          {' '}
                          <span>{m.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Done ────────────────────────────────────────────── */}
        {filteredCompleted.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
              <h2 style={{
                fontSize: 20,
                fontWeight: 800,
                color: C.text,
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1,
              }}>
                Done
              </h2>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.dim,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {filteredCompleted.length}
              </span>
            </div>
            {filteredCompleted.slice(0, shippedLimit).map((t, i) => {
              const cardColor = getShippedCardColor(t, i)
              const qa        = t.qa_score || t.qaScore
              const agent     = t.agent_identity || t.agentIdentity
              const project   = t.project_name || t.projectName
              const isFailed     = t.status === 'failed'
              const isDark       = isFailed
              return (
                <div
                  key={t.id}
                  onClick={() => toggleTaskExpand(t.id)}
                  style={{
                    padding: '18px 20px',
                    marginBottom: 10,
                    borderRadius: 16,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    backgroundColor: isFailed ? 'rgba(239,68,68,0.15)' : cardColor,
                    opacity: 1,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.25)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = ''
                    e.currentTarget.style.boxShadow = ''
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: 16, fontWeight: 700,
                        color: isDark ? '#F0F4FF' : '#0A0A0A',
                        lineHeight: 1.25,
                        letterSpacing: '-0.01em',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: expandedTask === t.id ? 'normal' : 'nowrap',
                      }}>
                        {t.title || t.text || 'Untitled task'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
                        {t.project_id && (() => {
                          const proj = taskProjects.find(p => String(p.id) === String(t.project_id))
                          return proj ? <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: proj.color, flexShrink: 0 }} /> : null
                        })()}
                        {agent && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? 'rgba(240,244,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                            {agent}
                          </span>
                        )}
                        {project && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? 'rgba(240,244,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                            {project}
                          </span>
                        )}
                        {!agent && !project && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? 'rgba(240,244,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                            {isFailed ? 'Failed' : 'Done'}
                          </span>
                        )}
                      </div>
                    </div>
                    {qa && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 22, fontWeight: 800,
                          color: isFailed ? LIFECYCLE.failed : 'rgba(0,0,0,0.5)',
                          lineHeight: 1,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          {qa}
                        </div>
                        <div style={{
                          fontSize: 9, fontWeight: 600,
                          color: isDark ? 'rgba(240,244,255,0.25)' : 'rgba(0,0,0,0.25)',
                          textAlign: 'right', marginTop: 3,
                        }}>
                          QA
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Expandable: result summary + thread */}
                  {expandedTask === t.id && (
                    <div style={{ marginTop: 14, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`, paddingTop: 10 }}>
                      <ResultPreview task={t} isDark={isDark} />
                      {threadLoading ? (
                        <div style={{ fontSize: 12, color: isDark ? C.dim : 'rgba(0,0,0,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>Loading...</div>
                      ) : taskThread.length === 0 && !t.result ? (
                        <div style={{ fontSize: 12, color: isDark ? C.dim : 'rgba(0,0,0,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>No pipeline events.</div>
                      ) : taskThread.map((m, idx) => (
                        <div key={idx} style={{
                          fontSize: 12, color: isDark ? C.text2 : 'rgba(0,0,0,0.5)', lineHeight: 1.5,
                          padding: '4px 0',
                          fontFamily: "'JetBrains Mono', monospace",
                          borderBottom: idx < taskThread.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)'}` : 'none',
                        }}>
                          <span style={{ color: isDark ? C.dim : 'rgba(0,0,0,0.25)', fontSize: 10 }}>{(m.timestamp || '').slice(11, 19)}</span>
                          {' '}
                          <span>{m.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {filteredCompleted.length > shippedLimit && (
              <div
                onClick={() => setShippedLimit(prev => prev + 50)}
                style={{
                  padding: '12px 20px', textAlign: 'center',
                  fontSize: 13, fontWeight: 600, color: C.muted,
                  cursor: 'pointer', borderRadius: 14,
                  background: 'rgba(255,255,255,0.03)',
                  marginBottom: 10,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                Show more ({filteredCompleted.length - shippedLimit} remaining)
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {filteredActive.length === 0 && filteredCompleted.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: C.muted, gap: 16, paddingTop: 80 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'rgba(255,255,255,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: '-0.01em', marginBottom: 6 }}>
                {searchQuery || activeProject !== 'all' ? 'No matching tasks' : 'All clear'}
              </div>
              <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5 }}>
                {searchQuery || activeProject !== 'all' ? 'Try a different search or filter' : 'Nothing on your plate right now'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task creation input bar */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px calc(14px + env(safe-area-inset-bottom, 0px))',
        background: C.bg,
        borderTop: '1px solid rgba(255,255,255,0.03)',
      }}>
        {/* Recording indicator */}
        {isRecording && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 8,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#EF4444',
              animation: 'rec-dot 1s ease-in-out infinite',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 12, fontWeight: 700, color: '#EF4444',
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>Recording</span>
          </div>
        )}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: isRecording ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.03)',
          border: '1.5px solid ' + (isRecording ? 'rgba(239,68,68,0.25)' : taskInputFocused ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'),
          borderRadius: 28,
          padding: '6px 6px 6px 18px',
          maxWidth: 560,
          margin: '0 auto',
          boxShadow: isRecording ? '0 0 0 4px rgba(239,68,68,0.04)' : taskInputFocused ? '0 0 0 4px rgba(255,255,255,0.02), 0 8px 32px rgba(0,0,0,0.3)' : 'none',
          transition: 'border-color 0.25s, box-shadow 0.25s, background 0.25s',
        }}>
          <input
            ref={taskInputRef}
            type="text"
            placeholder={isRecording ? 'Listening...' : 'Add a task...'}
            value={taskInput}
            onChange={e => setTaskInput(e.target.value)}
            onFocus={() => setTaskInputFocused(true)}
            onBlur={() => setTaskInputFocused(false)}
            onKeyDown={handleTaskInputKeyDown}
            disabled={isRecording}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: isRecording ? 'rgba(239,68,68,0.5)' : C.text,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {!isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button title="Attach" onClick={() => {}} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'none', border: 'none',
                color: C.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <button title="Commands" onClick={() => {}} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'none', border: 'none',
                color: C.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 17l6-6-6-6"/><line x1="12" y1="19" x2="20" y2="19"/>
                </svg>
              </button>
            </div>
          )}
          {(!taskInput.trim() || isRecording) && (
            <button
              title={isRecording ? 'Stop recording' : 'Voice'}
              onClick={toggleVoiceRecording}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: isRecording ? '#EF4444' : C.accent,
                border: 'none',
                color: '#000', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                animation: isRecording ? 'rec-pulse 1.2s ease-in-out infinite' : 'none',
                transition: 'background 0.2s',
              }}
            >
              {isRecording ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="12" rx="3"/>
                  <path d="M5 10a7 7 0 0014 0"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              )}
            </button>
          )}
          {taskInput.trim() && (
            <button
              title="Create task"
              onClick={handleTaskSubmit}
              disabled={taskSubmitting}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: C.accent, border: 'none',
                color: '#000', cursor: taskSubmitting ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                opacity: taskSubmitting ? 0.6 : 1,
                transition: 'transform 0.15s',
              }}
            >
              {taskSubmitting ? (
                <div style={{
                  width: 14, height: 14,
                  border: '2px solid rgba(255,255,255,0.15)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => { setShowCreateProjectModal(false); setProjectName(''); setSelectedColor('#10B981') }}
        >
          <div
            style={{
              background: C.s1,
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20,
              padding: 28,
              width: 320,
              display: 'flex', flexDirection: 'column', gap: 20,
              boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}>
              New Project
            </div>

            <input
              type="text"
              placeholder="Project name..."
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1.5px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '12px 16px',
                color: C.text,
                fontSize: 15,
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              {['#EAB308', '#22C55E', '#A78BFA', '#F59E0B', '#10B981', '#F97316'].map(color => (
                <div
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: 32, height: 32,
                    borderRadius: '50%',
                    background: color,
                    cursor: 'pointer',
                    border: selectedColor === color ? '2.5px solid #fff' : '2.5px solid transparent',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    outline: selectedColor === color ? '2px solid rgba(255,255,255,0.2)' : 'none',
                    outlineOffset: 3,
                    transition: 'transform 0.15s',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={() => { setShowCreateProjectModal(false); setProjectName(''); setSelectedColor('#10B981') }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'none',
                  color: C.text2,
                  fontFamily: "'Inter', sans-serif",
                  transition: 'background 0.15s',
                }}
              >Cancel</button>
              <button
                onClick={() => setShowCreateProjectModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: C.accent,
                  color: '#fff',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              >Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
