import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { getClientId } from '../lib/clientConfig.js'

export function useCleoWorkspaces({ clientFilter, statusFilter } = {}) {
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (clientFilter) params.set('client', clientFilter)
        if (statusFilter) params.set('status', statusFilter)
        const query = params.toString() ? `?${params}` : ''
        const r = await fetch(`/api/dashboard/cleo-workspaces${query}`)
        const data = await r.json()
        if (!cancelled) {
          if (data.error) setError(data.error)
          else setWorkspaces(data.workspaces || [])
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    // Realtime subscription for live updates
    if (!supabase) return () => { cancelled = true }
    const clientId = getClientId()
    const channel = supabase
      .channel(`cleo-workspaces-${clientId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'video_workspaces',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setWorkspaces(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setWorkspaces(prev => prev.map(w => w.id === payload.new.id ? payload.new : w))
        } else if (payload.eventType === 'DELETE') {
          setWorkspaces(prev => prev.filter(w => w.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [clientFilter, statusFilter])

  return { workspaces, loading, error }
}

export function useCleoWorkspace(slug) {
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const r = await fetch(`/api/dashboard/cleo-workspaces?slug=${encodeURIComponent(slug)}`)
        const data = await r.json()
        if (!cancelled) {
          if (data.error) setError(data.error)
          else setWorkspace(data.workspace || null)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    if (!supabase) return () => { cancelled = true }
    const channel = supabase
      .channel(`cleo-workspace-${slug}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'video_workspaces',
        filter: `slug=eq.${slug}`,
      }, (payload) => {
        if (!cancelled) setWorkspace(payload.new)
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [slug])

  return { workspace, loading, error }
}
