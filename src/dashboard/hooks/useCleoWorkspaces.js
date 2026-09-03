// useCleoWorkspaces -- the /cleo-workspaces index and detail pages.
//
// corner:retire-supabase (2026-09-03): reads the Convex cleoWorkspaces table
// (cleoWorkspaces:list for the index, cleoWorkspaces:get for one slug) instead
// of the /api/dashboard/cleo-workspaces route over the Supabase events table.
// Both reads are live subscriptions on the Convex socket, so a workspace that
// changes on the Mac shows up here without a poll. The workspace object the
// pages read (name, client_name, status, deliverable_count, last_touched,
// brief_md, ...) is the row's `data` payload with the row's own fields on top.

import { useState, useEffect } from 'react'
import { getClientId } from '../lib/clientConfig.js'
import { convexQuery, convexWorldId } from '../cv6next/data/convexClient.js'
import { subscribeConvex } from './useDataPipe.js'

function shapeWorkspace(row) {
  if (!row) return null
  const data = row.data && typeof row.data === 'object' ? row.data : {}
  return {
    ...data,
    id: row._id || data.id || row.slug,
    slug: row.slug || data.slug,
    name: data.name || row.title || row.slug,
    status: row.status || data.status,
    last_touched: data.last_touched || (row.updatedAt ? new Date(row.updatedAt).toISOString() : null),
  }
}

export function useCleoWorkspaces({ clientFilter, statusFilter } = {}) {
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const worldId = convexWorldId(getClientId())

    // The list row carries slug/title/status only; the fields the index cards
    // read live in each row's data payload, so hydrate every slug once per
    // list change. Workspaces number in the tens, not thousands.
    const hydrate = async (rows) => {
      const list = Array.isArray(rows) ? rows : []
      const full = await Promise.all(list.map((r) =>
        convexQuery('cleoWorkspaces:get', { slug: r.slug }).then((row) => shapeWorkspace(row || r)).catch(() => shapeWorkspace(r)),
      ))
      if (cancelled) return
      let out = full.filter(Boolean)
      if (clientFilter) {
        const q = String(clientFilter).toLowerCase()
        out = out.filter((w) => w.client_name && String(w.client_name).toLowerCase().includes(q))
      }
      if (statusFilter) out = out.filter((w) => w.status === statusFilter)
      setWorkspaces(out)
      setLoading(false)
    }

    convexQuery('cleoWorkspaces:list', { worldId })
      .then(hydrate)
      .catch((err) => { if (!cancelled) { setError(err?.message || 'Could not load workspaces'); setLoading(false) } })

    const stop = subscribeConvex('cleoWorkspaces:list', { worldId }, (rows) => { hydrate(rows).catch(() => {}) })
    return () => { cancelled = true; stop() }
  }, [clientFilter, statusFilter])

  return { workspaces, loading, error }
}

export function useCleoWorkspace(slug) {
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) return undefined
    let cancelled = false
    setLoading(true)
    setError(null)

    convexQuery('cleoWorkspaces:get', { slug })
      .then((row) => {
        if (cancelled) return
        if (!row) setError('Workspace not found')
        else setWorkspace(shapeWorkspace(row))
        setLoading(false)
      })
      .catch((err) => { if (!cancelled) { setError(err?.message || 'Could not load workspace'); setLoading(false) } })

    const stop = subscribeConvex('cleoWorkspaces:get', { slug }, (row) => { if (!cancelled && row) setWorkspace(shapeWorkspace(row)) })
    return () => { cancelled = true; stop() }
  }, [slug])

  return { workspace, loading, error }
}
