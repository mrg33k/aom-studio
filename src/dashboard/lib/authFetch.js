// Wrap window.fetch to attach the current Supabase session's access_token as
// an Authorization: Bearer header. Used by dashboard callers of /api/dashboard/*
// endpoints that enforce tenant isolation via aom-studio/api/_lib/verifyTenant.js.
//
// If supabase isn't configured (localhost without env), or no session is active,
// the request goes out without an Authorization header — the endpoint will
// reject with 401, which is the correct outcome.
import { supabase } from './supabase.js'

function notifyRateLimited(url, response) {
  try {
    const h = response?.headers
    let retryAfter = null
    if (h?.get) {
      const v = h.get('retry-after') || h.get('Retry-After')
      if (v) {
        const n = Number(v)
        if (Number.isFinite(n)) retryAfter = n
        else {
          const d = Date.parse(v)
          if (Number.isFinite(d)) retryAfter = Math.max(0, Math.round((d - Date.now()) / 1000))
        }
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('corner:rate-limited', {
        detail: { url: String(url || ''), retryAfter, status: 429, at: Date.now() },
      }))
    }
  } catch {}
}

function notifyAuthRefreshNeeded(reason, detail = {}) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('corner:auth-refresh-needed', {
        detail: { reason, ...detail, at: Date.now() },
      }))
    }
  } catch {}
}

export async function authFetch(url, opts = {}) {
  let token = null
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession()
      token = data?.session?.access_token || null
    } catch {
      token = null
    }
  }
  const headers = { ...(opts.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { ...opts, headers })
  // TOP-20 #15: 429 handling — re-check limit on account switch and auto-respawn
  // via supabase.auth.onAuthStateChange (RateLimitBanner). Surface a banner with
  // a Retry button instead of silently failing the turn.
  if (res && res.status === 429) notifyRateLimited(url, res)
  // TOP-20 #17: 404 after Google profile click — transient auth mismatch. The
  // session may be for the old Google account while the UI already switched.
  // Signal that an auth refresh is needed so listeners can call refreshSession()
  // and retry once before showing a 404.
  if (res && res.status === 404 && String(url || '').includes('/api/')) {
    notifyAuthRefreshNeeded('404-after-profile-click', { url: String(url || ''), status: 404 })
  }
  if (res && res.status === 401) {
    notifyAuthRefreshNeeded('401-unauthorized', { url: String(url || ''), status: 401 })
  }
  return res
}
