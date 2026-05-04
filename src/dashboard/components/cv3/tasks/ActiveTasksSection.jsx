// ActiveTasksSection -- "Right Now" hero list of in-flight tasks
// R2a (Apr 16, 2026): extracted from TasksPanel.jsx
// R3a (Apr 17, 2026): reads from TasksPanelContext instead of props
import { C } from '../../../lib/cv3Colors.js'
import { NeedsVerificationBadge } from '../ContextMenu.jsx'
import { LIFECYCLE } from './lifecycle.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

export default function ActiveTasksSection() {
  const {
    filteredActive,
    expandedTask,
    toggleTaskExpand,
    openTaskMenu,
    startTaskLongPress,
    cancelTaskLongPress,
    taskVerifyIds,
    taskProjects,
    taskThread,
    threadLoading,
  } = useTasksPanelCtx()

  if (filteredActive.length === 0) return null
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <h2
          data-testid="task-column-header"
          data-column="right_now"
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: C.text,
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1,
          }}
        >
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
      {filteredActive.map((t) => {
        const isBuilding = t.status === 'building' || t.status === 'qa' || t.status === 'running'
        const cardColor = isBuilding ? LIFECYCLE.working : LIFECYCLE.queued
        const statusLabel = t.status === 'building' ? 'Building' : t.status === 'running' ? 'Running' : t.status === 'qa' ? 'QA' : t.status === 'planning' ? 'Planning' : t.status === 'classifying' ? 'Classifying' : 'Queued'
        return (
        <div
          key={t.id}
          data-testid="task-card"
          data-task-id={t.id}
          data-task-status={t.status}
          aria-expanded={expandedTask === t.id ? 'true' : 'false'}
          aria-controls={`task-accordion-${t.id}`}
          onClick={() => toggleTaskExpand(t.id)}
          onContextMenu={(e) => openTaskMenu(e, t)}
          onTouchStart={(e) => startTaskLongPress(e, t)}
          onTouchEnd={cancelTaskLongPress}
          onTouchMove={cancelTaskLongPress}
          onTouchCancel={cancelTaskLongPress}
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
                {taskVerifyIds.has(t.id) && (
                  <NeedsVerificationBadge testId={`task-verify-badge-${t.id}`} label="Needs QA" />
                )}
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
          {/* Expandable thread -- R20b accordion surface. */}
          {expandedTask === t.id && (
            <div
              id={`task-accordion-${t.id}`}
              data-testid="task-brief-accordion"
              style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}
            >
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
  )
}
