// R14e-4: owner's personal todos -- renders tasks in the tasks table where
// `agent` matches tenants.owner_slug (e.g. 'patrik' for the 'aom' tenant).
// Source of truth: useDataPipe -> CornerContext.data -> useTasksPanel.personalTodos.
// Hidden when there are no owner tasks (collapses cleanly; no placeholder).
import { C } from '../../../lib/cv3Colors.js'
import { LIFECYCLE } from './lifecycle.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

export default function PersonalTodosSection() {
  const { personalTodos, ownerSlug } = useTasksPanelCtx()
  if (!ownerSlug) return null
  const todos = Array.isArray(personalTodos) ? personalTodos : []
  if (todos.length === 0) return null

  return (
    <div style={{ marginBottom: 28 }} data-testid="personal-todos">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <h2 style={{
          fontSize: 18,
          fontWeight: 800,
          color: C.text,
          letterSpacing: '-0.02em',
          margin: 0,
          lineHeight: 1,
        }}>
          Your Todos
        </h2>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: LIFECYCLE.queued,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {todos.length}
        </span>
      </div>
      {todos.map((t) => (
        <div
          key={t.taskId || t.text}
          data-task-id={t.taskId || ''}
          data-owner-task="true"
          style={{
            padding: '14px 18px',
            marginBottom: 8,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${LIFECYCLE.queued}10, ${LIFECYCLE.queued}05)`,
            border: `1px solid ${LIFECYCLE.queued}20`,
            fontSize: 14,
            color: C.text,
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}
