import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { marked } from 'marked'
import { C, agentColors } from '../../lib/cv3Colors.js'
import { useCleoWorkspace } from '../../hooks/useCleoWorkspaces.js'

const CLEO = agentColors.cleo  // #F472B6

// ── Markdown helpers ─────────────────────────────────────────────────────────

marked.setOptions({ breaks: true, gfm: true })

function renderMd(source) {
  if (!source) return ''
  return marked.parse(source)
}

// Extract a named ## section from markdown text
function extractSection(md, sectionName) {
  if (!md) return null
  const re = new RegExp(`^##\\s+${sectionName}\\s*$`, 'mi')
  const match = re.exec(md)
  if (!match) return null
  const start = match.index + match[0].length
  const nextSection = md.slice(start).search(/^##\s/m)
  const end = nextSection === -1 ? md.length : start + nextSection
  return md.slice(start, end).trim()
}

// ── Styled markdown block ────────────────────────────────────────────────────

const mdStyles = `
  .cleo-md { color: #94A3B8; font-size: 13px; line-height: 1.7; }
  .cleo-md h1, .cleo-md h2, .cleo-md h3 { color: #F1F5F9; margin: 16px 0 8px; }
  .cleo-md h1 { font-size: 18px; }
  .cleo-md h2 { font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px; }
  .cleo-md h3 { font-size: 13px; }
  .cleo-md p { margin: 0 0 10px; }
  .cleo-md ul, .cleo-md ol { margin: 0 0 10px; padding-left: 20px; }
  .cleo-md li { margin-bottom: 4px; }
  .cleo-md code { background: rgba(255,255,255,0.07); border-radius: 4px; padding: 1px 5px; font-size: 12px; color: #F472B6; }
  .cleo-md pre { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px 14px; overflow-x: auto; margin: 0 0 10px; }
  .cleo-md pre code { background: none; padding: 0; color: #94A3B8; }
  .cleo-md a { color: #60A5FA; text-decoration: underline; }
  .cleo-md strong { color: #F1F5F9; }
  .cleo-md blockquote { border-left: 3px solid rgba(244,114,182,0.4); margin: 0 0 10px; padding-left: 12px; color: #475569; }
  .cleo-md table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
  .cleo-md th, .cleo-md td { border: 1px solid rgba(255,255,255,0.08); padding: 6px 10px; font-size: 12px; }
  .cleo-md th { background: rgba(255,255,255,0.04); color: #F1F5F9; }
`

function MarkdownBlock({ source }) {
  const html = useMemo(() => renderMd(source), [source])
  return (
    <>
      <style>{mdStyles}</style>
      <div
        className="cleo-md"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  )
}

// ── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, accent, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: C.s1,
      border: `1px solid ${C.border2}`,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 14,
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '12px 16px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {accent && (
          <div style={{ width: 3, height: 18, borderRadius: 2, background: accent, flexShrink: 0 }} />
        )}
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>{title}</span>
        <span style={{ fontSize: 12, color: C.muted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Editing Instructions highlight ──────────────────────────────────────────

function EditingInstructions({ briefMd }) {
  const content = extractSection(briefMd, 'Editing Instructions')
 if (!content || content === '' || content === '[Active constraints, every sequence operation in this workspace must respect these.\nEmpty at init; populated when Patrik gives specific editing rules during work.]') {
    return null
  }
  return (
    <div style={{
      background: 'rgba(244,114,182,0.07)',
      border: `1px solid rgba(244,114,182,0.25)`,
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom: 14,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: CLEO, letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>
        Active Editing Constraints
      </div>
      <MarkdownBlock source={content} />
    </div>
  )
}

// ── File tree ────────────────────────────────────────────────────────────────

const FILE_ICONS = {
  video: '🎬', audio: '🎵', image: '🖼', json: '{ }', md: '📝',
  directory: '📁', unknown: '📄',
}

function fileIcon(type) {
  return FILE_ICONS[type] || FILE_ICONS.unknown
}

function FileTreeNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const isDir = node.type === 'directory'
  return (
    <div style={{ paddingLeft: depth > 0 ? 18 : 0 }}>
      <div
        role={isDir ? 'button' : undefined}
        tabIndex={isDir ? 0 : undefined}
        onClick={isDir ? () => setExpanded(o => !o) : undefined}
        onKeyDown={isDir ? e => e.key === 'Enter' && setExpanded(o => !o) : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
          cursor: isDir ? 'pointer' : 'default', outline: 'none',
        }}
      >
        <span style={{ fontSize: 12, flexShrink: 0 }}>
          {isDir ? (expanded ? '▾ 📁' : '▸ 📁') : fileIcon(node.file_type || 'unknown')}
        </span>
        <span style={{ fontSize: 12, color: isDir ? C.text : C.text2 }}>{node.name}</span>
        {isDir && node.count != null && (
          <span style={{ fontSize: 10, color: C.muted }}>{node.count}</span>
        )}
        {!isDir && node.size != null && (
          <span style={{ fontSize: 10, color: C.muted }}>{formatSize(node.size)}</span>
        )}
      </div>
      {isDir && expanded && node.children?.map((child, i) => (
        <FileTreeNode key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1048576).toFixed(1)}MB`
}

function FileTree({ tree }) {
  if (!tree?.length) {
    return <div style={{ fontSize: 12, color: C.muted }}>No file tree available yet.</div>
  }
  return (
    <div style={{ fontFamily: 'monospace' }}>
      {tree.map((node, i) => <FileTreeNode key={i} node={node} />)}
    </div>
  )
}

// ── Media thumbnail / video hover ────────────────────────────────────────────

function MediaThumb({ url, name, mimeType }) {
  const videoRef = useRef(null)
  const isVideo = mimeType?.startsWith('video') || /\.(mp4|mov|webm|m4v)$/i.test(name || '')
  const isAudio = mimeType?.startsWith('audio') || /\.(mp3|wav|aac|m4a)$/i.test(name || '')

  const handleMouseEnter = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [])

  return (
    <div
      onMouseEnter={isVideo ? handleMouseEnter : undefined}
      onMouseLeave={isVideo ? handleMouseLeave : undefined}
      style={{
        width: '100%', aspectRatio: '16/9',
        background: C.bg2, borderRadius: 8, overflow: 'hidden',
        position: 'relative',
      }}
    >
      {isVideo && url ? (
        <video
          ref={videoRef}
          src={url}
          muted
          playsInline
          preload="metadata"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : isAudio ? (
        <div style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <div style={{ fontSize: 24 }}>🎵</div>
          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', padding: '0 8px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {name}
          </div>
          {url && <audio controls src={url} style={{ width: '90%' }} />}
        </div>
      ) : (
        url ? (
          <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <div style={{ fontSize: 20, color: C.muted }}>🎬</div>
            <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', padding: '0 8px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {name}
            </div>
          </div>
        )
      )}
    </div>
  )
}

// ── Render (video player embed) ──────────────────────────────────────────────

function RenderPlayer({ render }) {
  const [playing, setPlaying] = useState(false)
  const ref = useRef(null)
  return (
    <div style={{
      background: C.bg2, borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${C.border2}`,
    }}>
      <div style={{ aspectRatio: '16/9', position: 'relative', background: '#000' }}>
        {render.url ? (
          <video
            ref={ref}
            src={render.url}
            controls
            muted={!playing}
            playsInline
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 12,
          }}>No render URL</div>
        )}
      </div>
      <div style={{ padding: '8px 12px', fontSize: 12, color: C.text2, fontWeight: 600 }}>
        {render.name || 'Render'}
      </div>
    </div>
  )
}

// ── Finder / Resolve links ───────────────────────────────────────────────────

function OpenLinks({ workspace }) {
  const finderPath = workspace.workspace_path
  const sourcePath = workspace.source_path
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {finderPath && (
        <a
          href={`file://${finderPath}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: C.s2, color: C.text2, textDecoration: 'none',
            border: `1px solid ${C.border2}`,
          }}
        >
          <span>📁</span> Open in Finder
        </a>
      )}
      {sourcePath && (
        <a
          href={`file://${sourcePath}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: C.s2, color: C.text2, textDecoration: 'none',
            border: `1px solid ${C.border2}`,
          }}
        >
          <span>📽</span> Open Source in Finder
        </a>
      )}
    </div>
  )
}

// ── Main detail component ────────────────────────────────────────────────────

export default function CleoWorkspaceDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { workspace, loading, error } = useCleoWorkspace(slug)

  const thumbnails = workspace?.thumbnail_urls || {}
  const renders = workspace?.render_urls || []
  const fileTree = workspace?.file_tree || []

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.text,
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '0 0 80px',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: C.bg, borderBottom: `1px solid ${C.border2}`,
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate('/dashboard/cleo/workspaces')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.text2, fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>←</span> Workspaces
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: CLEO, flexShrink: 0 }} />
          <span style={{
            fontSize: 15, fontWeight: 700, color: C.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {workspace?.name || slug}
          </span>
          {workspace?.client_name && (
            <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>
              {workspace.client_name}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', maxWidth: 900, margin: '0 auto' }}>
        {loading && (
          <div style={{ color: C.muted, fontSize: 14, textAlign: 'center', padding: '60px 0' }}>
            Loading workspace…
          </div>
        )}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, padding: '14px 16px', color: C.red, fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {!loading && !error && workspace && (
          <>
            {/* Editing Instructions — shown first/prominently when populated */}
            <EditingInstructions briefMd={workspace.brief_md} />

            {/* Open in Finder / Resolve */}
            {(workspace.workspace_path || workspace.source_path) && (
              <div style={{ marginBottom: 16 }}>
                <OpenLinks workspace={workspace} />
              </div>
            )}

            {/* Two-column layout on wider screens */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: 0,
            }}>
              {/* Left col */}
              <div>
                {/* BRIEF.md */}
                <SectionCard title="Brief" accent={CLEO}>
                  {workspace.brief_md
                    ? <MarkdownBlock source={workspace.brief_md} />
                    : <div style={{ fontSize: 12, color: C.muted }}>BRIEF.md not yet synced.</div>
                  }
                </SectionCard>

                {/* File tree */}
                <SectionCard title="Directory Tree" accent={C.blue} defaultOpen={false}>
                  <FileTree tree={fileTree} />
                </SectionCard>
              </div>

              {/* Right col */}
              <div>
                {/* PHONEBOOK.md */}
                <SectionCard title="Phonebook" accent={C.teal}>
                  {workspace.phonebook_md
                    ? <MarkdownBlock source={workspace.phonebook_md} />
                    : <div style={{ fontSize: 12, color: C.muted }}>PHONEBOOK.md not yet synced.</div>
                  }
                </SectionCard>
              </div>
            </div>

            {/* Media thumbnails */}
            {Object.keys(thumbnails).length > 0 && (
              <SectionCard title={`Media Previews (${Object.keys(thumbnails).length})`} accent={C.yellow} defaultOpen={true}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 10,
                }}>
                  {Object.entries(thumbnails).map(([name, url]) => (
                    <div key={name}>
                      <MediaThumb url={url} name={name} />
                      <div style={{
                        fontSize: 10, color: C.muted, marginTop: 4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{name}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Renders */}
            {renders.length > 0 && (
              <SectionCard title={`Renders (${renders.length})`} accent={C.green} defaultOpen={true}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 14,
                }}>
                  {renders.map((r, i) => (
                    <RenderPlayer key={i} render={r} />
                  ))}
                </div>
              </SectionCard>
            )}
          </>
        )}

        {!loading && !error && !workspace && (
          <div style={{ color: C.muted, fontSize: 14, textAlign: 'center', padding: '60px 0' }}>
            Workspace <code style={{ color: CLEO }}>{slug}</code> not found.
          </div>
        )}
      </div>
    </div>
  )
}