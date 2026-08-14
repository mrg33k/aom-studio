// FailedTasksSection -- failed task cards + per-task failure insights panel
// R2a (Apr 16, 2026): extracted from TasksPanel.jsx
// R3a (Apr 17, 2026): reads from TasksPanelContext instead of props
// PF1-recover (2026-05-04): split into "Recovering" (auto-requeued) + "Needs you" piles
import { C } from '../../../lib/cv3Colors.js'
import { authFetch } from '../../../lib/authFetch.js'
import { LIFECYCLE } from './lifecycle.js'
import { ResultPreview } from './ResultPreview.jsx'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

export default function FailedTasksSection() {
  const {
    filteredFailed,
    refreshTasks,
    expandedTask,
    toggleTaskExpand,
    openTaskMenu,
    startTaskLongPress,
    cancelTaskLongPress,
    toggleInsights,
    insightsOpen,
    insightsLoading,
    insightsError,
    insightsData,
    threadLoading,
    taskThread,
    handleRequeueFailedTask,
    handleRetryFailedTask,
    retryingTaskIds,
  } = useTasksPanelCtx()

  if (filteredFailed.length === 0) return null

  // PF1-recover: split tasks into auto-recovering (already requeued) vs hard failures
  const recovering = filteredFailed.filter(t => t.metadata?.auto_recovering === true)
  const needsYou = filteredFailed.filter(t => !t.metadata?.auto_recovering)

  return (
    <div data-testid="failed-section" style={{ marginBottom: 36 }}>
      {/* Recovering pile: auto-requeued tasks, shown with amber "re-queuing" badge */}
      {recovering.length > 0 && (
        <div style={{ marginBottom: needsYou.length > 0 ? 24 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2
              data-testid="task-column-header"
              data-column="recovering"
              style={{ fontSize: 18, fontWeight: 800, color: '#F59E0B', letterSpacing: '-0.02em', margin: 0, lineHeight: 1 }}
            >
              Recovering
            </h2>
            <button
              onClick={async () => {
                for (const t of recovering) {
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
          {recovering.map(t => (
            <div
              key={t.id}
              data-test-id="task-card-recovering"
              data-task-id={t.id}
              style={{
                padding: '14px 18px',
                marginBottom: 8,
                borderRadius: 12,
                background: 'rgba(245,158,11,0.05)',
                border: '1px solid rgba(245,158,11,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(240,244,255,0.45)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title || t.text || 'Untitled task'}
                </div>
                {(t.error || t.metadata?.failure_reason) && (
                  <div style={{ fontSize: 11, color: 'rgba(245,158,11,0.6)', lineHeight: 1.4, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(t.error || t.metadata?.failure_reason || '').trim()}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Re-queuing</span>
                <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11 }}>|</span>
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
          ))}
        </div>
      )}

      {/* Needs you pile: hard failures requiring human attention */}
      {needsYou.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2
              data-testid="task-column-header"
              data-column="failed"
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: LIFECYCLE.failed,
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1,
              }}
            >
              {recovering.length > 0 ? 'Needs you' : 'Failed'}
            </h2>
            <button
              onClick={async () => {
                for (const t of needsYou) {
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
          {needsYou.map((t) => {
        const qa = t.qa_score || t.qaScore
        const agent = t.agent_identity || t.agentIdentity
        const failureReason = (t.error || t.metadata?.failure_reason || '').trim()
        const isRetrying = retryingTaskIds instanceof Set && retryingTaskIds.has(t.id)
        return (
          <div
            key={t.id}
            data-test-id="task-card-failed"
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
                {failureReason && (
                  <div
                    data-test-id="failed-task-reason"
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#FCA5A5',
                      lineHeight: 1.4,
                      marginTop: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: expandedTask === t.id ? 'pre-wrap' : 'nowrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {failureReason}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  {agent && <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(240,244,255,0.25)' }}>{agent}</span>}
                  {qa && <span style={{ fontSize: 11, fontWeight: 700, color: LIFECYCLE.failed }}>QA {qa}/10</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button
                  data-test-id={`failed-task-retry-${t.id}`}
                  disabled={isRetrying}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isRetrying) return
                    handleRetryFailedTask(t)
                  }}
                  style={{ fontSize: 11, fontWeight: 700, color: isRetrying ? 'rgba(34,197,94,0.5)' : '#22C55E', cursor: isRetrying ? 'default' : 'pointer', padding: '4px 8px', background: 'none', border: 'none', WebkitTapHighlightColor: 'transparent' }}
                >
                  {isRetrying ? 'Retrying…' : 'Retry'}
                </button>
                <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11 }}>|</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRequeueFailedTask(t)
                  }}
                  style={{ fontSize: 11, fontWeight: 600, color: 'rgba(240,244,255,0.45)', cursor: 'pointer', padding: '4px 8px', background: 'none', border: 'none', WebkitTapHighlightColor: 'transparent' }}
                >
                  In chat
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
                    await authFetch('/api/dashboard/task-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss', taskId: t.id }) })
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
 {insightsData[t.id].qaScore != null ? `${insightsData[t.id].qaScore}/10` : '·'}
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
    </div>
  )
}