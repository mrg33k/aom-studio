// useProjects.js -- Project data hook (Supabase-backed)
//
// Fetches active (non-archived) projects from the Supabase `projects` table.
// Maps DB rows to the Project shape used by ProjectCard and CornerV3.
//
// Returns { isLoading, isError, projects, refetch } where projects is an array
// of Project objects. Shape: { id, name, slug, is_active, color, section, tasks, isClient }
//
// R75-c2: added archived_at IS NULL filter + refetch callback.

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getClientId } from '../lib/clientConfig'

function mapRow(row) {
  return {
    id:        row.id,
    name:      row.name,
    slug:      row.slug,
    is_active: row.is_active,
    color:     row.color || '#6B8AB0',
    isShared:  row.isShared || false,
    // Fields not stored in DB — provide safe defaults
    section:   'general',
    tasks:     [],
    isClient:  false,
  }
}

export function useProjects(worldId) {
  const [isLoading, setIsLoading] = useState(true)
  const [isError,   setIsError]   = useState(false)
  const [projects,  setProjects]  = useState([])
  const [refetchKey, setRefetchKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    if (!supabase) {
      setIsLoading(false)
      return
    }

    const clientId = getClientId()
    setIsLoading(true)

    Promise.all([
      supabase
        .from('projects')
        .select('id, slug, name, color, is_active')
        .eq('is_active', true)
        .is('archived_at', null)
        .eq('client_id', clientId)
        .order('name'),
      supabase
        .from('project_access')
        .select('project_id, projects(id, slug, name, color, is_active)')
        .eq('client_id', clientId),
    ]).then(async ([ownedResult, sharedResult]) => {
        if (cancelled) return
        if (ownedResult.error && sharedResult.error) {
          setIsError(true)
          setIsLoading(false)
          return
        }

        // Fetch which owned projects have project_access entries via server-side API
        // (browser can't query project_access for other users due to RLS)
        const ownedIds = (ownedResult.data || []).map(p => p.id)
        let sharedProjectIds = new Set()
        if (ownedIds.length) {
          try {
            const r = await fetch(`/api/dashboard/project-shared?project_ids=${ownedIds.join(',')}`)
            if (r.ok) {
              const data = await r.json()
              sharedProjectIds = new Set(data.shared || [])
            }
          } catch (_) {}
        }

        // LAB-RAIL (2026-08-14, corner:room-organizer Block 3): hide infrastructure noise
        // even if is_active leaks true — lab/qa/smoke + bridge-smoke never show in user rail.
        const isInfra = (slug) => {
          if (!slug) return false
          const s = slug.toLowerCase()
          return s === 'bridge-smoke' || s.startsWith('lab-') || s.startsWith('qa-') || s.startsWith('smoke-') || s.startsWith('proj-tool-') || s.startsWith('loop-test-')
        }
        const owned = (ownedResult.data || []).filter(p => !isInfra(p.slug)).map(p => ({
          ...p,
          isShared: sharedProjectIds.has(p.id),
        }))
        const shared = (sharedResult.data || [])
          .map(r => r.projects)
          .filter(p => p && p.is_active && !isInfra(p.slug))
          .map(p => ({ ...p, isShared: true }))
        const seen = new Set()
        const all = []
        for (const p of [...owned, ...shared]) {
          if (!seen.has(p.id)) { seen.add(p.id); all.push(p) }
        }
        all.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        if (!cancelled) {
          setProjects(all.map(mapRow))
          setIsLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [worldId, refetchKey])

  const refetch = () => setRefetchKey(k => k + 1)

  return { isLoading, isError, projects, refetch }
}
