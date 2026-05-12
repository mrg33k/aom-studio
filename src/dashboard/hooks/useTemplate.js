import { useEffect, useState } from 'react'

// Two source modes for the template registry:
//
// 1. Daemon mode (local dev): set NEXT_PUBLIC_TEMPLATE_REGISTRY_URL to the
//    template-registry.py HTTP daemon (default port 7777). The hook fetches
//    /api/templates and /api/templates/{slug} directly.
//
// 2. Vercel mode (default, production): no env var. The hook hits the
//    same-origin Vercel function /api/dashboard/template-registry, which
//    reads the latest snapshot pushed to Supabase events by the daemon
//    running on the dev machine.
//
// Both endpoints return the same JSON shape, so the rest of the dashboard
// doesn't care which source is live.
const REGISTRY_BASE = process.env.NEXT_PUBLIC_TEMPLATE_REGISTRY_URL || ''
const DAEMON_MODE = REGISTRY_BASE.length > 0

const REGISTRY_LIST_URL = DAEMON_MODE
  ? `${REGISTRY_BASE}/api/templates`
  : `/api/dashboard/template-registry`

function singleSlugUrl(slug) {
  if (DAEMON_MODE) {
    return `${REGISTRY_BASE}/api/templates/${encodeURIComponent(slug)}`
  }
  return `/api/dashboard/template-registry?slug=${encodeURIComponent(slug)}`
}

export function useTemplate(slug, { pollMs = 10_000 } = {}) {
  const [template, setTemplate] = useState(null)
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!slug) return

    let cancelled = false
    async function fetchOnce() {
      try {
        const res = await fetch(singleSlugUrl(slug))
        if (!res.ok) {
          if (!cancelled) {
            setError(res.status === 404 ? 'not-in-registry' : `http-${res.status}`)
            setLoaded(true)
          }
          return
        }
        const data = await res.json()
        if (!cancelled) {
          setTemplate(data)
          setError(null)
          setLoaded(true)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'fetch-failed')
          setLoaded(true)
        }
      }
    }

    fetchOnce()
    const id = setInterval(fetchOnce, pollMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [slug, pollMs])

  return { template, loaded, error }
}

// fallow-ignore-next-line unused-export
export function useTemplateRegistry({ pollMs = 10_000 } = {}) {
  const [registry, setRegistry] = useState(null)
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchOnce() {
      try {
        const res = await fetch(REGISTRY_LIST_URL)
        if (!res.ok) {
          if (!cancelled) { setError(`http-${res.status}`); setLoaded(true) }
          return
        }
        const data = await res.json()
        if (!cancelled) { setRegistry(data); setError(null); setLoaded(true) }
      } catch (e) {
        if (!cancelled) { setError(e?.message || 'fetch-failed'); setLoaded(true) }
      }
    }
    fetchOnce()
    const id = setInterval(fetchOnce, pollMs)
    return () => { cancelled = true; clearInterval(id) }
  }, [pollMs])

  return { registry, loaded, error }
}
