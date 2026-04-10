// useTasks.js -- Architecture v2 task queue hook
//
// Source of truth: Supabase `tasks` table (realtime subscription).
// Events table is the audit log -- this hook does NOT read from events.
//
// Right Now bar rule: ONLY tasks with status = 'building' or 'qa'.
// Clears on completion (status -> done/failed), NOT on timeout.
//
// Returns:
//   queued        -- tasks with status 'queued' | 'classifying' | 'planning'
//   rightNow      -- tasks with status 'building' | 'qa'  (ONLY these, hard rule)
//   done          -- tasks with status 'done' | 'failed' | 'superseded'
//   allTasks      -- raw sorted array
//   loading       -- boolean
//   error         -- error string or null
//   refresh       -- manual refetch fn
//
// Ordering: priority DESC, sort_order ASC NULLS LAST, created_at ASC
// This matches the index idx_tasks_sort in the migration.

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getClientId } from '../lib/clientConfig'

// ── Constants ────────────────────────────────────────────────────────────────

// Right Now bar: ONLY tasks in these statuses. Zero tolerance for anything else.
const RIGHT_NOW_STATUSES = new Set(['building', 'qa'])

// Queued pipeline statuses (not yet building)
const QUEUED_STATUSES = new Set(['queued', 'classifying', 'planning'])

// Terminal statuses (completed section)
const DONE_STATUSES = new Set(['done', 'failed'])

// Max tasks to fetch (guard against runaway queries)
// Must be high enough to cover all active + recent done tasks
const MAX_TASKS = 500

// ── Helpers ──────────────────────────────────────────────────────────────────

function sortTasks(tasks) {
  const normalized = tasks.map(t => ({ ...t, text: t.title || t.text }))
  return [...normalized].sort((a, b) => {
    // Priority: higher first
    if (b.priority !== a.priority) return b.priority - a.priority
    // Sort order: lower first (explicit position). Nulls go last.
    const aOrder = a.sort_order ?? Infinity
    const bOrder = b.sort_order ?? Infinity
    if (aOrder !== bOrder) return aOrder - bOrder
    // Tiebreak: oldest first
    return new Date(a.created_at) - new Date(b.created_at)
  })
}

// Format a task for the Right Now bar pill
function toRightNowPill(task) {
  return {
    id:            task.id,
    title:         task.title,
    status:        task.status,
    agentIdentity: task.agent_identity || null,
    priority:      task.priority,
    startedAt:     task.started_at || null,
    qaScore:       task.qa_score || null,
    // Derived fields for display
    isLive:        task.status === 'building',
    isQA:          task.status === 'qa',
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTasks() {
  const [allTasks, setAllTasks]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState(null)

  // Stable ref for the realtime channel so cleanup doesn't re-render
  const channelRef = useRef(null)
  // Unique channel name per hook instance (avoid name collisions when mounted multiple times)
  const channelIdRef = useRef(`tasks-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)

  const fetchTasks = useCallback(async ({ silent = false } = {}) => {
    if (!supabase) {
      if (!silent) setError('Supabase not configured')
      setLoading(false)
      return
    }

    try {
      const clientId = getClientId()
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('client_id', clientId)
        .order('priority',   { ascending: false })
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
        .limit(MAX_TASKS)

      if (fetchError) {
        // On silent refetch (reconnect), don't wipe existing state
        if (!silent) setError(fetchError.message)
        setLoading(false)
        return
      }

      // Only update if we got data -- never wipe existing tasks with empty response
      if (data && data.length > 0) {
        setAllTasks(sortTasks(data))
        setError(null)
      } else if (!silent) {
        // Initial load can legitimately be empty
        setAllTasks([])
        setError(null)
      }
    } catch (err) {
      // On silent refetch, preserve existing state
      if (!silent) setError(err?.message || 'Unknown error fetching tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  // Realtime update handler: merge incoming row change into local state
  const handleRealtimeChange = useCallback((payload) => {
    const { eventType, new: newRow, old: oldRow } = payload

    // Guard against malformed payloads (Safari can send weird things on reconnect)
    if (!eventType) return

    setAllTasks(prev => {
      let updated

      if (eventType === 'INSERT' && newRow?.id) {
        const exists = prev.some(t => t.id === newRow.id)
        updated = exists ? prev : [...prev, newRow]
      } else if (eventType === 'UPDATE' && newRow?.id) {
        const exists = prev.some(t => t.id === newRow.id)
        updated = exists ? prev.map(t => t.id === newRow.id ? newRow : t) : [...prev, newRow]
      } else if (eventType === 'DELETE' && oldRow?.id) {
        updated = prev.filter(t => t.id !== oldRow.id)
      } else {
        return prev
      }

      return sortTasks(updated)
    })
  }, [])

  useEffect(() => {
    if (!supabase) return

    // Initial fetch
    fetchTasks()

    // Subscribe to realtime changes on the tasks table (scoped by client_id)
    const clientId = getClientId()
    const channel = supabase
      .channel(channelIdRef.current)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `client_id=eq.${clientId}` },
        handleRealtimeChange,
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchTasks({ silent: true })
        }
      })

    channelRef.current = channel

    // Safari/iPad kills WebSockets when tab backgrounds.
    // Refetch when user returns to the tab.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchTasks({ silent: true })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Fallback poll every 30s -- catches gaps from dropped realtime connections
    const pollInterval = setInterval(() => {
      fetchTasks({ silent: true })
    }, 30000)

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(pollInterval)
    }
  }, [fetchTasks, handleRealtimeChange])

  // ── Derived views ───────────────────────────────────────────────────────────

  // Right Now bar: ONLY building or qa. Hard rule. No exceptions.
  const rightNow = allTasks
    .filter(t => RIGHT_NOW_STATUSES.has(t.status))
    .map(toRightNowPill)

  // Task queue: not yet building
  const queued = allTasks.filter(t => QUEUED_STATUSES.has(t.status))

  // Completed section: done or failed (most recent first)
  const done = allTasks
    .filter(t => DONE_STATUSES.has(t.status))
    .sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at))

  return {
    allTasks,
    rightNow,
    queued,
    done,
    loading,
    error,
    refresh: fetchTasks,
  }
}

// ── Standalone Right Now hook ─────────────────────────────────────────────────
// Lightweight version for components that only need the Right Now bar.
// Uses same realtime channel pattern but only watches building/qa rows.

export function useRightNowTasks() {
  const { rightNow, loading, error, refresh } = useTasks()
  return { rightNow, loading, error, refresh }
}
