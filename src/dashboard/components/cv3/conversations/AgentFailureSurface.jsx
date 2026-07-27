// AgentFailureSurface -- R14a. When an agent's most recent activity is a
// failed task, render a compact strip below the agent card on home:
//   - one-line reason from task.error / task.result
//   - [data-testid=retry-btn] -> POST /api/dashboard/retry-task
//   - [data-testid=insights-chevron] -> expands [data-testid=insights-panel]
//     with the stdout tail from task.result
//
// Traces to VISION "when tasks fail, there's a smooth path to success --
// not a dead end." Same shape for EA hero, non-hero AgentsList rows, and
// any future agent surface -- the component is source-of-truth.
import { useCallback, useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { authFetch } from '../../../lib/authFetch.js'

function truncate(s, n = 140) {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

function tailLines(s, n = 12) {
  return String(s || '').split('\n').slice(-n).join('\n')
}

export default function AgentFailureSurface({ failedTask, onRetried }) {
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState(null)

  const handleRetry = useCallback(async (e) => {
    e.stopPropagation()
    if (!failedTask?.id || retrying) return
    setRetrying(true)
    setRetryError(null)
    try {
      // authFetch, not fetch: retry-task gates on verifyTenant against the
      // failed row's OWN world, so the session has to travel with the request.
      const resp = await authFetch('/api/dashboard/retry-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: failedTask.id }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok || data.error) throw new Error(data.error || `retry failed (${resp.status})`)
      if (typeof onRetried === 'function') onRetried(failedTask, data.newTask)
    } catch (err) {
      setRetryError(err?.message || 'retry failed')
    } finally {
      setRetrying(false)
    }
  }, [failedTask, retrying, onRetried])

  const toggleInsights = useCallback((e) => {
    e.stopPropagation()
    setInsightsOpen(v => !v)
  }, [])

  if (!failedTask) return null
  const reason = failedTask.error || failedTask.reason || failedTask.result_reason || 'Task failed'
  const stdoutTail = failedTask.result || failedTask.stdout_tail || ''

  return (
    <div
      data-testid="agent-failure-surface"
      onClick={(e) => e.stopPropagation()}
      style={{
        marginTop: 8,
        padding: '10px 12px',
        borderRadius: 10,
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.22)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#EF4444',
            flexShrink: 0,
          }}
        />
        <div
          data-testid="task-failure-reason"
          style={{
            flex: 1,
            fontSize: 12,
            color: C.text2,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {truncate(reason, 160)}
        </div>
        <button
          data-testid="retry-btn"
          onClick={handleRetry}
          disabled={retrying}
          style={{
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            color: retrying ? C.muted : '#000',
            background: retrying ? 'rgba(255,255,255,0.08)' : '#F87171',
            border: '1px solid rgba(239,68,68,0.3)',
            cursor: retrying ? 'default' : 'pointer',
            flexShrink: 0,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
        <button
          data-testid="insights-chevron"
          aria-expanded={insightsOpen}
          onClick={toggleInsights}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: C.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            flexShrink: 0,
          }}
        >
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: insightsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms ease' }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      {retryError && (
        <div style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{retryError}</div>
      )}
      {insightsOpen && (
        <pre
          data-testid="insights-panel"
          style={{
            marginTop: 8,
            padding: '8px 10px',
            fontSize: 11,
            lineHeight: 1.45,
            fontFamily: "'JetBrains Mono', monospace",
            color: C.text2,
            background: 'rgba(0,0,0,0.35)',
            border: `1px solid ${C.border2}`,
            borderRadius: 8,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 180,
            overflowY: 'auto',
          }}
        >
          {stdoutTail ? tailLines(stdoutTail, 16) : '(no output captured)'}
        </pre>
      )}
    </div>
  )
}
