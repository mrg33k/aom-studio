// DoneTasksSection -- "Done" cards (incl. fail-styled in done feed) + show more
// Extracted from TasksPanel.jsx (R2a)
import { C } from '../../../lib/cv3Colors.js'
import { LIFECYCLE } from './lifecycle.js'
import { getShippedCardColor } from '../shared.jsx'
import { ResultPreview } from './ResultPreview.jsx'

export default function DoneTasksSection({
  filteredCompleted,
  shippedLimit,
  setShippedLimit,
  expandedTask,
  toggleTaskExpand,
  openTaskMenu,
  startTaskLongPress,
  cancelTaskLongPress,
  taskProjects,
  taskThread,
  threadLoading,
}) {
  if (filteredCompleted.length === 0) return null

  return (
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
            data-test-id="task-card-done"
            data-task-id={t.id}
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
  )
}
