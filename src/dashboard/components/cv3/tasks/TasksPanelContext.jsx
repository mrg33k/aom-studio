// TasksPanelContext -- local context for the TasksPanel feature slice.
// Introduced in R3a to stop prop-drilling through 11 subcomponents.
// CornerV3 still passes cross-cutting props (user, worldId, task lifecycle
// callbacks) directly to TasksPanel; the hook wraps those + internal state
// into this context so leaves can read with useTasksPanelCtx().
import { createContext, useContext } from 'react'

const TasksPanelCtx = createContext(null)

export function TasksPanelProvider({ value, children }) {
  return <TasksPanelCtx.Provider value={value}>{children}</TasksPanelCtx.Provider>
}

export function useTasksPanelCtx() {
  const ctx = useContext(TasksPanelCtx)
  if (!ctx) {
    throw new Error('useTasksPanelCtx must be used inside <TasksPanelProvider>')
  }
  return ctx
}
