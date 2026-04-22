// R14e-4: viewer's personal todos -- renders tasks in the tasks table where
// `agent` matches the current viewer's slug inside this tenant. Source of
// truth: useCurrentUserSlug(currentUser, worldId) → CornerContext.data →
// useTasksPanel.personalTodos (pre-filtered by slug upstream).
// Hidden when viewer has no slug in this tenant or when list is empty.
// "Your Todos" in a team tenant means YOUR own, not the team's.
import { C } from '../../../lib/cv3Colors.js'
import { LIFECYCLE } from './lifecycle.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

export default function PersonalTodosSection() {
  const { personalTodos, currentUserSlug } = useTasksPanelCtx()
  if (!currentUserSlug) return null
  const todos = Array.isArray(personalTodos) ? personalTodos : []
  // Always render the container when a viewer slug is known. Empty state
  // collapses visually (zero-height, no title) but the testid remains
  // attached so acceptance + future tooling can observe "viewer known,
  // just nothing to do." Presence of data-count=0 means "empty by design."
  if (todos.length === 0) {
    return (
      <div
        data-testid="personal-todos"
        data-viewer-slug={currentUserSlug}
        data-count="0"
        style={{ display: 'none' }}
      />
    )
  }

  return (
    <div
      style={{ marginBottom: 28 }}
      data-testid="personal-todos"
      data-viewer-slug={currentUserSlug}
      data-count={todos.length}
    >
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
