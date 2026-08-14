import React, { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

// TOP-20 #15 — Rate-limit false alarms: "They'll tell me that we hit the limit,
// but I've already changed my account" (13 msgs / 7 days). The old UI had no
// 429 handling at all — no banner, no retry, and switching Google accounts never
// re-checked whether the limit still applied to the new account. This banner
// fixes that with: 429 detection via `corner:rate-limited` (emitted by authFetch),
// a manual Retry, and automatic re-check + auto-respawn when the account switches
// via supabase.auth.onAuthStateChange.

function readRetryAfter(headers) {
  try {
    const v = headers?.get?.('retry-after') || headers?.get?.('Retry-After')
    if (!v) return null
    const n = Number(v)
    if (Number.isFinite(n)) return n
    const d = Date.parse(v)
    if (Number.isFinite(d)) return Math.max(0, Math.round((d - Date.now()) / 1000))
    return null
  } catch { return null }
}

export default function RateLimitBanner({ onRetry }) {
  const [state, setState] = useState(null) // { url, retryAfter, at }
  const lastUserIdRef = useRef(null)

  // Listen for 429s emitted by authFetch
  useEffect(() => {
    const onRateLimited = (e) => {
      const detail = e?.detail || {}
      setState({
        url: detail.url || '',
        retryAfter: detail.retryAfter ?? null,
        at: Date.now(),
        status: 429,
      })
    }
    window.addEventListener('corner:rate-limited', onRateLimited)
    return () => window.removeEventListener('corner:rate-limited', onRateLimited)
  }, [])

  // Re-check limit on account switch and auto-respawn via onAuthStateChange
  useEffect(() => {
    if (!supabase?.auth?.onAuthStateChange) return undefined
    // Seed last user id
    supabase.auth.getSession().then(({ data }) => {
      lastUserIdRef.current = data?.session?.user?.id || null
    }).catch(() => {})
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      const nextId = session?.user?.id || null
      const prevId = lastUserIdRef.current
      const switched = prevId && nextId && prevId !== nextId
      const signedIn = event === 'SIGNED_IN' && switched
      const tokenRefreshed = event === 'TOKEN_REFRESHED'

      // Auth refresh on account switch (#17) — ensure the new session is hydrated
      if (switched) {
        try { await supabase.auth.refreshSession().catch(() => {}) } catch {}
        // Clear the stale rate-limit banner — the new account has its own quota
        if (state) {
          setState(null)
          window.dispatchEvent(new CustomEvent('corner:rate-limit-cleared', { detail: { reason: 'account-switched' } }))
        }
        // Auto-respawn: re-check limit for the new account
        // Emit a retry so any pending turn can respawn without manual tap
        window.dispatchEvent(new CustomEvent('corner:rate-limit-retry', { detail: { reason: 'account-switched', auto: true } }))
        if (onRetry) {
          try { onRetry({ reason: 'account-switched', auto: true }) } catch {}
        }
      } else if (tokenRefreshed && state) {
        // Token refresh may have cleared the limit — opportunistically re-check
        window.dispatchEvent(new CustomEvent('corner:rate-limit-retry', { detail: { reason: 'token-refreshed', auto: true } }))
      }

      lastUserIdRef.current = nextId

      // Also handle the generic SIGNED_IN case for first login (no previous id)
      if (event === 'SIGNED_IN' && !prevId && nextId) {
        lastUserIdRef.current = nextId
      }
    })
    return () => sub?.subscription?.unsubscribe?.()
  }, [state, onRetry])

  const handleRetry = useCallback(() => {
    const detail = { reason: 'manual-retry', at: Date.now() }
    window.dispatchEvent(new CustomEvent('corner:rate-limit-retry', detail))
    if (onRetry) {
      try { onRetry(detail) } catch {}
    }
    // Hide banner immediately — if the retry still 429s, authFetch will re-raise it
    setState(null)
  }, [onRetry])

  const handleDismiss = useCallback(() => setState(null), [])

  if (!state) return null

  const retryLabel = state.retryAfter != null && state.retryAfter > 0
    ? `Retry in ${state.retryAfter}s`
    : 'Retry'

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="rate-limit-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: 'rgba(251, 191, 36, 0.12)',
        border: '1px solid rgba(251, 191, 36, 0.35)',
        borderRadius: 10,
        color: 'var(--fg, #fff)',
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: '#FBBF24',
          flex: 'none',
        }}
      />
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ fontWeight: 700 }}>Rate limit reached</strong>
        <span style={{ color: 'var(--muted, #a1a1aa)', marginLeft: 6 }}>
          — {state.retryAfter != null ? `try again in ${state.retryAfter}s or switch accounts.` : 'switch accounts or try again.'}
        </span>
      </span>
      <button
        type="button"
        onClick={handleRetry}
        data-testid="rate-limit-retry"
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid rgba(251,191,36,0.45)',
          background: '#FBBF24',
          color: '#000',
          fontWeight: 700,
          fontSize: 12,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {retryLabel}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss rate limit notice"
        style={{
          padding: '6px 8px',
          borderRadius: 8,
          border: '1px solid var(--hair, rgba(255,255,255,0.1))',
          background: 'transparent',
          color: 'var(--muted, #a1a1aa)',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Dismiss
      </button>
    </div>
  )
}

// Helper for non-React callers: dispatch a 429 event from authFetch
export function notifyRateLimited(url, response) {
  try {
    const retryAfter = readRetryAfter(response?.headers)
    window.dispatchEvent(new CustomEvent('corner:rate-limited', {
      detail: { url: String(url || ''), retryAfter, status: 429, at: Date.now() },
    }))
  } catch {}
}
