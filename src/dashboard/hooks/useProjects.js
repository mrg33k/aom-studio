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
    supabase
      .from('projects')
      .select('id, slug, name, color, is_active')
      .eq('is_active', true)
      .eq('client_id', clientId)
      .order('name')
      .then(({ data: rows, error }) => {
        if (cancelled) return
        if (error) {
          setIsError(true)
          setIsLoading(false)
          return
        }
        setProjects((rows || []).map(mapRow))
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return { isLoading, isError, projects }
}
