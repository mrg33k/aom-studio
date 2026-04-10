// useProjects.js -- Project data hook (Supabase-backed)
//
// Fetches active projects from the Supabase `projects` table.
// Maps DB rows to the Project shape used by ProjectCard and CornerV3.
//
// Returns { isLoading, isError, projects } where projects is an array of Project objects.
// Shape: { id, name, slug, is_active, color, section, tasks, isClient }

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
    // Fields not stored in DB — provide safe defaults
    section:   'general',
    tasks:     [],
    isClient:  false,
  }
}

export function useProjects() {
  const [isLoading, setIsLoading] = useState(true)
  const [isError,   setIsError]   = useState(false)
  const [projects,  setProjects]  = useState([])

  useEffect(() => {
    let cancelled = false

    if (!supabase) {
      // No Supabase configured (local dev without env vars)
      setIsLoading(false)
      return
    }

    const clientId = getClientId()

    // Fetch owned projects + shared projects (via project_access) in parallel
    Promise.all([
      supabase
        .from('projects')
        .select('id, slug, name, color, is_active')
        .eq('is_active', true)
        .eq('client_id', clientId)
        .order('name'),
      supabase
        .from('project_access')
        .select('project_id, projects(id, slug, name, color, is_active)')
        .eq('client_id', clientId),
    ]).then(([ownedResult, sharedResult]) => {
        if (cancelled) return
        if (ownedResult.error && sharedResult.error) {
          setIsError(true)
          setIsLoading(false)
          return
        }
        const owned = (ownedResult.data || [])
        const shared = (sharedResult.data || [])
          .map(r => r.projects)
          .filter(p => p && p.is_active)
        // Deduplicate by id (a project could be both owned and shared)
        const seen = new Set()
        const all = []
        for (const p of [...owned, ...shared]) {
          if (!seen.has(p.id)) { seen.add(p.id); all.push(p) }
        }
        all.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        setProjects(all.map(mapRow))
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return { isLoading, isError, projects }
}
