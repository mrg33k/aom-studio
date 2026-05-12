import { useEffect, useState } from 'react'

const REGISTRY_BASE = process.env.NEXT_PUBLIC_TEMPLATE_REGISTRY_URL || 'http://127.0.0.1:7777'

// Tiny client for the template registry daemon (scripts/template-registry.py).
// One slug per hook call. Polls infrequently; the daemon itself re-scans on
// file change within 5 seconds, so a 10s client poll is plenty.
export function useTemplate(slug, { pollMs = 10_000 } = {}) {
  const [template, setTemplate] = useState(null)
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!slug) return

    let cancelled = false
    async function fetchOnce() {
      try {
        const res = await fetch(`${REGISTRY_BASE}/api/templates/${encodeURIComponent(slug)}`)
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

// Returns the full registry (all templates). For pages that need the list,
// not a single slug. Same daemon, same poll cadence.
export function useTemplateRegistry({ pollMs = 10_000 } = {}) {
  const [registry, setRegistry] = useState(null)
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchOnce() {
      try {
        const res = await fetch(`${REGISTRY_BASE}/api/templates`)
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
