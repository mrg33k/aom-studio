// BlockedTasksSection -- blocked task cards (dismiss only; no retry/insights)
// feat(corner:failed-task-hygiene): R1 dashboard section [task 07a67ac2]
import { C } from '../../../lib/cv3Colors.js'
import { authFetch } from '../../../lib/authFetch.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

const BLOCKED_COLOR = '#F59E0B'
const BLOCKED_BG = 'rgba(245,158,11,0.05)'
const BLOCKED_BORDER = 'rgba(245,158,11,0.15)'
const BLOCKED_BORDER_EXPANDED = 'rgba(245,158,11,0.3)'

export default function BlockedTasksSection() {
  const {
    filteredBlocked,
    refreshTasks,
    expandedTask,
    toggleTaskExpand,
    openTaskMenu,
    startTaskLongPress,
    cancelTaskLongPress,
  } = useTasksPanelCtx()

  if (!filteredBlocked || filteredBlocked.length === 0) return null

  return (
    <div data-testid="blocked-section" style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2
          data-testid="task-column-header"
          data-column="blocked"
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: BLOCKED_COLOR,
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1,
          }}
        >
          Blocked
        </h2>
        <button
          onClick={async () => {
            for (const t of filteredBlocked) {
              await authFetch('/api/dashboard/task-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss', taskId: t.id }) })
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
      {filteredBlocked.map((t) => {
        const blockedReason = (t.metadata?.blocked_reason || '').trim()
        const suggestedRoute = (t.metadata?.suggested_route || '').trim()
        const isExpanded = expandedTask === t.id
        return (
          <div
            key={t.id}
            data-test-id="task-card-blocked"
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
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              background: BLOCKED_BG,
              border: isExpanded ? `1px solid ${BLOCKED_BORDER_EXPANDED}` : `1px solid ${BLOCKED_BORDER}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 15, fontWeight: 700,
                  color: 'rgba(240,244,255,0.6)',
                  lineHeight: 1.25,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: isExpanded ? 'normal' : 'nowrap',
                }}>
                  {t.title || t.text || 'Untitled task'}
                </div>
                {blockedReason && (
                  <div
                    data-test-id="blocked-task-reason"
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#FDE68A',
                      lineHeight: 1.4,
                      marginTop: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {blockedReason}
                  </div>
                )}
                {isExpanded && suggestedRoute && (
                  <div
                    data-test-id="blocked-task-route"
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'rgba(240,244,255,0.55)',
                      lineHeight: 1.4,
                      marginTop: 6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 800, color: BLOCKED_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Route</span>
                    {suggestedRoute}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    await authFetch('/api/dashboard/task-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss', taskId: t.id }) })
                    refreshTasks()
                  }}
                  style={{ fontSize: 11, fontWeight: 600, color: C.dim, cursor: 'pointer', padding: '4px 8px', background: 'none', border: 'none', WebkitTapHighlightColor: 'transparent' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
