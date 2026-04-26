// WaitingTasksSection -- "Needs Input" cards for tasks awaiting user reply
// R2a (Apr 16, 2026): extracted from TasksPanel.jsx
// R3a (Apr 17, 2026): reads from TasksPanelContext instead of props
import { C } from '../../../lib/cv3Colors.js'
import { authFetch } from '../../../lib/authFetch.js'
import { LIFECYCLE } from './lifecycle.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

export default function WaitingTasksSection() {
  const {
    waitingTasks,
    waitingReply,
    setWaitingReply,
    waitingReplySending,
    setWaitingReplySending,
  } = useTasksPanelCtx()

  if (waitingTasks.length === 0) return null

  return (
    <div style={{ marginBottom: 36 }}>
      <h2
        data-testid="task-column-header"
        data-column="inbox"
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: LIFECYCLE.waiting,
          letterSpacing: '-0.02em',
          margin: '0 0 16px',
          lineHeight: 1,
        }}
      >
        Inbox
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
                    await authFetch('/api/dashboard/task-action', {
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
                  await authFetch('/api/dashboard/task-action', {
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
  )
}
