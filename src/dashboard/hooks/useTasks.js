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

// ── Shared-slug fetch ────────────────────────────────────────────────────────
// Fetches slugs of all projects that should be subscribed to via shared:slug
// client_ids: projects shared inward (project_access) + owned projects shared outward.

async function fetchSharedSlugs(clientId) {
  if (!supabase || !clientId) return []
  const [ownedResult, sharedResult] = await Promise.all([
    supabase.from('projects').select('id, slug').eq('is_active', true).eq('client_id', clientId),
    supabase.from('project_access').select('projects(slug, is_active)').eq('client_id', clientId),
  ])
  const slugs = new Set()
  const ownedIds = (ownedResult.data || []).map(p => p.id)
  if (ownedIds.length) {
    try {
      const r = await fetch(`/api/dashboard/project-shared?project_ids=${ownedIds.join(',')}`)
      if (r.ok) {
        const { shared = [] } = await r.json()
        const sharedSet = new Set(shared)
        for (const p of (ownedResult.data || [])) {
          if (sharedSet.has(p.id) && p.slug) slugs.add(p.slug)
        }
      }
    } catch (_) {}
  }
  for (const row of (sharedResult.data || [])) {
    const p = row.projects
    if (p && p.is_active && p.slug) slugs.add(p.slug)
  }
  return [...slugs]
}

// ── Constants ────────────────────────────────────────────────────────────────

// Right Now bar: ONLY tasks in these statuses. Zero tolerance for anything else.
const RIGHT_NOW_STATUSES = new Set(['building', 'running', 'qa'])

// Queued pipeline statuses (not yet building)
const QUEUED_STATUSES = new Set(['queued', 'classifying', 'planning'])

// Waiting for human input (skill tasks paused for direction)
const WAITING_STATUSES = new Set(['waiting'])

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
    isLive:        task.status === 'building' || task.status === 'running',
    isQA:          task.status === 'qa',
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTasks(worldId) {
  const [allTasks, setAllTasks]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState(null)

  // Stable ref for the realtime channel so cleanup doesn't re-render
  const channelRef = useRef(null)
  // Refs for shared realtime channels
  const sharedChannelsRef = useRef([])
  // Unique channel name per hook instance (avoid name collisions when mounted multiple times)
  const channelIdRef = useRef(`tasks-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)

  // Shared slugs fetched internally on world change
  const sharedSlugsRef = useRef([])

  const fetchTasks = useCallback(async ({ silent = false } = {}) => {
    if (!supabase) {
      if (!silent) setError('Supabase not configured')
      setLoading(false)
      return
    }

    try {
      const clientId = getClientId()
      // Build list of client_ids to fetch: own world + shared project slugs
      const clientIds = [clientId]
      for (const slug of sharedSlugsRef.current) {
        clientIds.push(`shared:${slug}`)
      }
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .in('client_id', clientIds)
        .order('priority',   { ascending: false })
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
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

  // Optimistic add: immediately inject a task into local state without waiting for realtime
  const addOptimisticTask = useCallback((task) => {
    if (!task) return
    setAllTasks(prev => {
      const exists = prev.some(t => t.id === task.id)
      if (exists) return prev
      return sortTasks([...prev, task])
    })
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
    // Don't fetch until worldId is explicitly provided (prevents fetching with default 'aom')
    if (!worldId) return

    // Clear stale data from previous world on world switch
    setAllTasks([])
    setLoading(true)

    let cancelled = false
    let visibilityHandler = null
    let pollInterval = null

    async function setup() {
      const clientId = getClientId()

      // Fetch shared slugs internally (replaces the useProjects call in CornerV3)
      sharedSlugsRef.current = await fetchSharedSlugs(clientId)
      if (cancelled) return

      // Initial fetch (uses sharedSlugsRef.current)
      await fetchTasks()
      if (cancelled) return

      // Subscribe to realtime changes on the tasks table (scoped by client_id)
      const channelName = `tasks-${clientId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const channel = supabase
        .channel(channelName)
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

      // Subscribe to shared project task changes
      sharedChannelsRef.current = []
      for (const slug of sharedSlugsRef.current) {
        const sharedCid = `shared:${slug}`
        const sharedCh = supabase
          .channel(`tasks-${sharedCid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks', filter: `client_id=eq.${sharedCid}` },
            handleRealtimeChange,
          )
          .subscribe()
        sharedChannelsRef.current.push(sharedCh)
      }

      // Safari/iPad kills WebSockets when tab backgrounds.
      visibilityHandler = () => {
        if (document.visibilityState === 'visible') fetchTasks({ silent: true })
      }
      document.addEventListener('visibilitychange', visibilityHandler)

      // Fallback poll every 30s -- catches gaps from dropped realtime connections
      pollInterval = setInterval(() => fetchTasks({ silent: true }), 30000)
    }

    setup()

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      for (const ch of sharedChannelsRef.current) {
        supabase.removeChannel(ch)
      }
      sharedChannelsRef.current = []
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [fetchTasks, handleRealtimeChange, worldId])

  // ── Derived views ───────────────────────────────────────────────────────────

  // Right Now bar: ONLY building or qa. Hard rule. No exceptions.
  const rightNow = allTasks
    .filter(t => RIGHT_NOW_STATUSES.has(t.status))
    .map(toRightNowPill)

  // Task queue: not yet building
  const queued = allTasks.filter(t => QUEUED_STATUSES.has(t.status))

  // Waiting for human input (skill tasks needing direction)
  const waiting = allTasks.filter(t => WAITING_STATUSES.has(t.status))

  // Completed section: done or failed (most recent first)
  const done = allTasks
    .filter(t => DONE_STATUSES.has(t.status))
    .sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at))

  return {
    allTasks,
    rightNow,
    queued,
    waiting,
    done,
    loading,
    error,
    refresh: fetchTasks,
    addOptimisticTask,
  }
}

// ── Standalone Right Now hook ─────────────────────────────────────────────────
// Lightweight version for components that only need the Right Now bar.
// Uses same realtime channel pattern but only watches building/qa rows.

export function useRightNowTasks() {
  const { rightNow, loading, error, refresh } = useTasks()
  return { rightNow, loading, error, refresh }
}
