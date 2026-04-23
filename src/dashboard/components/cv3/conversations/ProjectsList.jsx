// Projects list section -- one button per project, last preview message,
// and a live-dots indicator when the project has an active task. Extracted
// verbatim from ConversationsView during R2e split. R58 (session 20)
// adds a universal pin/unpin menu + a "Pinned Projects" section that
// renders above the main list.
import { C } from '../../../lib/cv3Colors.js'
import { formatChatTime } from '../shared.jsx'
import PinMenu from './PinMenu.jsx'

function ProjectRow({ project, projectPreviews, activeProjectSlugs, setInlineProject, setMessages, setSelectedAgent, onSelectProject, isPinned, onPin, onUnpin, onReorder }) {
  const pColor = project.color || '#6B8AB0'
  const pPreview = projectPreviews[`project:${project.slug}`]

  const handleContextMenu = (e) => {
    e.preventDefault(); e.stopPropagation()
    const trigger = e.currentTarget.querySelector(`[data-testid="pin-menu-trigger-project-${project.slug}"]`)
    if (trigger) trigger.click()
  }

  const handleDragStart = (e) => {
    e.dataTransfer?.setData('text/x-aom-project-slug', project.slug)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e) => {
    if (e.dataTransfer?.types?.includes('text/x-aom-project-slug')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }
  const handleDrop = (e) => {
    const fromSlug = e.dataTransfer?.getData('text/x-aom-project-slug')
    if (fromSlug && fromSlug !== project.slug) {
      e.preventDefault()
      onReorder?.(fromSlug, project.slug)
    }
  }

  return (
    <div
      onContextMenu={handleContextMenu}
      draggable={typeof onReorder === 'function'}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ position: 'relative' }}
    >
      <button
        data-testid={`project-card-${project.slug}`}
        data-project-slug={project.slug}
        onClick={() => {
          setInlineProject(project)
          setMessages([])
          setSelectedAgent(null)
          onSelectProject?.(project)
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', padding: '12px 14px',
          paddingRight: 46,
          borderRadius: 14,
          background: C.s1,
          border: `1px solid ${C.border}`,
          cursor: 'pointer', textAlign: 'left',
          transition: 'all 200ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = C.s2
          e.currentTarget.style.borderColor = C.border2
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = C.s1
          e.currentTarget.style.borderColor = C.border
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = ''
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${pColor}44, ${pColor}22)`,
          border: `1px solid ${pColor}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 12, height: 12, borderRadius: 3,
            background: pColor,
            boxShadow: `0 0 8px ${pColor}55`,
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{
              fontSize: 13, fontWeight: 700, color: C.text,
              fontFamily: "'Inter', sans-serif",
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {project.name}
            </span>
            <span style={{
              fontSize: 10, color: C.dim,
              fontFamily: "'JetBrains Mono', monospace",
              flexShrink: 0,
            }}>
              {pPreview?.timestamp ? formatChatTime(pPreview.timestamp) : ''}
            </span>
          </div>
          {(activeProjectSlugs.has(project.slug)) ? (
            <div style={{ marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 3, background: C.accentBg, border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '3px 8px' }}>
              {[0, 0.18, 0.36].map((delay, i) => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: C.accent, animation: `cv3LiveDot 1.2s ease-in-out ${delay}s infinite` }} />
              ))}
            </div>
          ) : (
            <div style={{
              fontSize: 12, color: C.muted, marginTop: 2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              fontFamily: "'Inter', sans-serif",
            }}>
              {pPreview?.text || 'No messages yet'}
            </div>
          )}
        </div>
      </button>
      <div style={{ position: 'absolute', top: 10, right: 12, zIndex: 1 }}>
        <PinMenu
          kind="project"
          slug={project.slug}
          isPinned={isPinned}
          onPin={onPin}
          onUnpin={onUnpin}
        />
      </div>
    </div>
  )
}

export default function ProjectsList({
  sortedProjects,
  projectPreviews,
  activeProjectSlugs,
  setInlineProject,
  setMessages,
  setSelectedAgent,
  onSelectProject,
  pinnedSlugs,
  pinProject,
  unpinProject,
  reorderProject,
}) {
  const pinned = (sortedProjects || []).filter(p => pinnedSlugs && pinnedSlugs.has(p.slug))
  const rest = (sortedProjects || []).filter(p => !(pinnedSlugs && pinnedSlugs.has(p.slug)))

  const renderRow = (project) => (
    <ProjectRow
      key={project.id || project.slug}
      project={project}
      projectPreviews={projectPreviews}
      activeProjectSlugs={activeProjectSlugs}
      setInlineProject={setInlineProject}
      setMessages={setMessages}
      setSelectedAgent={setSelectedAgent}
      onSelectProject={onSelectProject}
      isPinned={!!(pinnedSlugs && pinnedSlugs.has(project.slug))}
      onPin={pinProject}
      onUnpin={unpinProject}
      onReorder={reorderProject}
    />
  )

  return (
    <div style={{ marginBottom: 24 }}>
      {pinned.length > 0 && (
        <div data-testid="pinned-projects-section" style={{ marginBottom: 18 }}>
          <SectionHeader label="Pinned Projects" count={pinned.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pinned.map(renderRow)}
          </div>
        </div>
      )}
      <SectionHeader label="Projects" count={rest.length} />
      {rest.length === 0 ? (
        <div style={{
          fontSize: 13, color: C.muted,
          padding: '20px 0', textAlign: 'center',
        }}>
          No projects yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rest.map(renderRow)}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ label, count }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: C.muted,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      marginBottom: 10,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span>{label}</span>
      <span style={{
        fontSize: 10, fontWeight: 600, color: C.muted,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 8, padding: '1px 6px',
        letterSpacing: '0.02em',
      }}>
        {count}
      </span>
    </div>
  )
}
