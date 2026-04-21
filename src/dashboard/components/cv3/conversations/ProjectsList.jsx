// Projects list section -- one button per project, last preview message,
// and a live-dots indicator when the project has an active task. Extracted
// verbatim from ConversationsView during R2e split.
import { C } from '../../../lib/cv3Colors.js'
import { formatChatTime } from '../shared.jsx'

export default function ProjectsList({
  sortedProjects,
  projectPreviews,
  activeProjectSlugs,
  setInlineProject,
  setMessages,
  setSelectedAgent,
  onSelectProject,
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: C.muted,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span>Projects</span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: C.muted,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 8, padding: '1px 6px',
          letterSpacing: '0.02em',
        }}>
          {sortedProjects.length}
        </span>
      </div>
      {sortedProjects.length === 0 ? (
        <div style={{
          fontSize: 13, color: C.muted,
          padding: '20px 0', textAlign: 'center',
        }}>
          No projects yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sortedProjects.map(project => {
            const pColor = project.color || '#6B8AB0'
            const pPreview = projectPreviews[`project:${project.slug}`]
            return (
              <button
                key={project.id || project.slug}
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
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                  stroke="rgba(80,100,128,0.4)" strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
