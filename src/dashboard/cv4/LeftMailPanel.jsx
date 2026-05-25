// CV4 LeftMailPanel — Mail Room in the left rail (R10, 2026-05-25).
//
// Two states:
//   - Disconnected: amber "Connect Gmail" rectangle (the R9 hero look).
//     Clicking it kicks /api/integrations/oauth/start?slug=gmail; the user
//     comes back to /cv4?google_oauth=success and CornerV4 fires the
//     "Google Calendar + Gmail connected." toast.
//   - Connected: compact 5-tab bucket selector (Today · Awaiting · Clients ·
//     Sent · All) over the email list. Clicking an email calls onSelectMail
//     which CornerV4 pins as a chat-chip on the EA conversation.
//
// Replaces the standalone MailHero from R9 and the right-rail MailListPanel
// mount in CornerV4. Mail lives in the left rail full-stop.

import { useEffect, useMemo, useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'
import { getUserWorld } from '../lib/clientConfig.js'

const MENU = {
  bodyFont: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  displayFont: "'Instrument Serif', Georgia, serif",
  monoFont: "'JetBrains Mono', monospace",
  amber: 'var(--c-yellow)',
}

// Five tabs that read well in a 300px-wide rail. Mirrors the canonical
// Mail Room buckets, dropping THREADS + PROSPECTS for space — those still
// exist on the API and can be added later if needed.
const BUCKETS = [
  { slug: 'today',          label: 'Today' },
  { slug: 'awaiting-reply', label: 'Awaiting' },
  { slug: 'clients',        label: 'Clients' },
  { slug: 'sent',           label: 'Sent' },
  { slug: 'all',            label: 'All' },
]
const DEFAULT_BUCKET = 'today'
const LIST_MAX_HEIGHT = '46vh'

export default function LeftMailPanel({ selectedMailId, onSelectMail }) {
  const [mode, setMode] = useState('loading')   // 'loading' | 'disconnected' | 'connected' | 'error'
  const [connection, setConnection] = useState(null)
  const [activeBucket, setActiveBucket] = useState(DEFAULT_BUCKET)
  const [emails, setEmails] = useState([])
  const [counts, setCounts] = useState({})
  const [loadingList, setLoadingList] = useState(false)
  // R12 — surface the OAuth callback's reason on the hero subline so the user
  // sees WHY we're showing the Connect prompt (most common: they skipped
  // "Select all" on Google's granular consent and we threw the row away).
  const [oauthReason] = useState(() => {
    if (typeof window === 'undefined') return ''
    const p = new URLSearchParams(window.location.search)
    if (p.get('integrations') === 'error') return p.get('reason') || ''
    return ''
  })

  // ── load connections ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await authFetch('/api/dashboard/mail/connections')
        if (cancelled) return
        if (!r.ok) { setMode('error'); return }
        const body = await r.json()
        const list = Array.isArray(body?.connections) ? body.connections : []
        if (list.length === 0) { setMode('disconnected'); return }
        const workspaceId = getUserWorld() || 'personal'
        const key = `cv4.mail.activeConnection.${workspaceId}`
        const lastId = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
        const restored = list.find(c => c.id === lastId) || list[0]
        setConnection(restored)
        setMode('connected')
      } catch {
        if (!cancelled) setMode('error')
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ── load bucket counts whenever connection appears ──────────────────────
  useEffect(() => {
    if (!connection?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await authFetch(`/api/dashboard/mail/buckets?connection_id=${encodeURIComponent(connection.id)}`)
        if (cancelled || !r.ok) return
        const body = await r.json()
        if (body?.mode === 'not-connected') {
          setMode('disconnected')
          return
        }
        setCounts(body?.counts || {})
      } catch { /* soft-fail */ }
    })()
    return () => { cancelled = true }
  }, [connection?.id])

  // ── load active bucket's emails ─────────────────────────────────────────
  useEffect(() => {
    if (!connection?.id || !activeBucket) return
    let cancelled = false
    setLoadingList(true)
    ;(async () => {
      try {
        const r = await authFetch(`/api/dashboard/mail/list?connection_id=${encodeURIComponent(connection.id)}&bucket=${encodeURIComponent(activeBucket)}`)
        if (cancelled) return
        if (!r.ok) { setEmails([]); return }
        const body = await r.json()
        setEmails(Array.isArray(body?.emails) ? body.emails : [])
      } catch {
        if (!cancelled) setEmails([])
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    })()
    return () => { cancelled = true }
  }, [connection?.id, activeBucket])

  if (mode === 'loading' || mode === 'error') {
    return <ConnectHero state={mode} oauthReason={oauthReason} />
  }
  if (mode === 'disconnected') {
    return <ConnectHero state="disconnected" oauthReason={oauthReason} />
  }

  return (
    <ConnectedPanel
      connection={connection}
      bucket={activeBucket}
      onBucket={setActiveBucket}
      counts={counts}
      emails={emails}
      loading={loadingList}
      selectedMailId={selectedMailId}
      onSelectMail={onSelectMail}
    />
  )
}

// ── DISCONNECTED HERO ───────────────────────────────────────────────────
// Clicking starts the OAuth round-trip: /api/integrations/oauth/start?slug=gmail
// → window.location to body.authUrl → return to /cv4?integrations=connected
// (or ?integrations=error&reason=...) → CornerV4 toast fires.
function ConnectHero({ state, oauthReason }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const onClick = async () => {
    if (state === 'loading' || busy) return
    setBusy(true)
    setErr('')
    try {
      const r = await authFetch('/api/integrations/oauth/start?slug=gmail')
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${r.status}`)
      }
      const body = await r.json()
      if (body?.authUrl) {
        window.location.href = body.authUrl
        return
      }
      throw new Error('no authUrl returned')
    } catch (e) {
      setErr(e.message || 'failed')
      setBusy(false)
    }
  }

  // R12 — the "scope-insufficient" reason gets its own subline so the user
  // knows to tick "Select all" on Google's granular consent next time.
  const scopeBlocked = (oauthReason || '').startsWith('scope-insufficient')
  const sub = state === 'loading'
    ? 'Checking your connection…'
    : state === 'error'
      ? 'Couldn’t reach Gmail · click to retry'
      : scopeBlocked
        ? 'Reconnect · tick "Select all"'
        : 'Inbox · Connect Gmail'

  return (
    <div style={{ margin: '6px 2px 10px' }}>
      <button
        type="button"
        data-cv4-mail-hero
        data-state={state}
        onClick={onClick}
        disabled={busy || state === 'loading'}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '11px 12px',
          background: 'rgba(234,179,8,0.04)',
          border: '1px solid rgba(234,179,8,0.20)',
          borderRadius: 8,
          cursor: busy || state === 'loading' ? 'wait' : 'pointer',
          textAlign: 'left',
          minWidth: 0,
          transition: 'background 0.12s, border-color 0.12s',
          opacity: busy || state === 'loading' ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (busy || state === 'loading') return
          e.currentTarget.style.background = 'rgba(234,179,8,0.08)'
          e.currentTarget.style.borderColor = 'rgba(234,179,8,0.35)'
        }}
        onMouseLeave={(e) => {
          if (busy || state === 'loading') return
          e.currentTarget.style.background = 'rgba(234,179,8,0.04)'
          e.currentTarget.style.borderColor = 'rgba(234,179,8,0.20)'
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 6,
          background: 'rgba(234,179,8,0.18)',
          border: '1px solid rgba(234,179,8,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: MENU.amber,
          flexShrink: 0,
        }}>
          <MailIcon />
        </div>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
          <span style={{
            fontFamily: MENU.bodyFont, fontSize: 16, fontWeight: 600,
            letterSpacing: '-0.005em', lineHeight: 1.1,
            color: C.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{busy ? 'Connecting…' : 'Mail'}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, color: C.dim,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            fontFamily: MENU.monoFont,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{sub}</span>
        </span>
      </button>
      {err && (
        <div style={{
          marginTop: 4, padding: '4px 10px',
          fontSize: 10, color: '#f87171',
          fontFamily: MENU.monoFont,
        }}>{err}</div>
      )}
    </div>
  )
}

// ── CONNECTED PANEL ─────────────────────────────────────────────────────
function ConnectedPanel({ connection, bucket, onBucket, counts, emails, loading, selectedMailId, onSelectMail }) {
  const headerEmail = connection?.account_email
  // R10-4: token-expired heuristic — when the connected panel shows zero
  // counts across every bucket AND no emails in the active list, the token is
  // likely stale. Surface a Reconnect button so Patrik can re-OAuth without
  // hunting through settings.
  const totalCount = Object.values(counts || {}).reduce((a, b) => a + (Number(b) || 0), 0)
  const looksStale = totalCount === 0 && !loading && emails.length === 0

  async function kickOAuth() {
    try {
      const r = await authFetch('/api/integrations/oauth/start?slug=gmail')
      if (!r.ok) return
      const body = await r.json()
      if (body?.authUrl) window.location.href = body.authUrl
    } catch { /* swallow */ }
  }

  return (
    <div data-cv4-left-mail style={{ margin: '6px 2px 12px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 4px 6px',
        gap: 8,
      }}>
        <span style={{
          fontFamily: MENU.bodyFont, fontSize: 16, fontWeight: 600,
          letterSpacing: '-0.005em', lineHeight: 1.1,
          color: C.text,
          flexShrink: 0,
        }}>Mail</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1, justifyContent: 'flex-end' }}>
          {headerEmail && (
            <span title={headerEmail} style={{
              fontSize: 10,
              color: C.text2,
              fontFamily: MENU.monoFont,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: '0 1 auto',
              minWidth: 0,
            }}>{headerEmail}</span>
          )}
          <button
            type="button"
            onClick={kickOAuth}
            title="Add another email account"
            aria-label="Add another email account"
            style={{
              background: 'none',
              border: '1px solid ' + C.border,
              borderRadius: 4,
              color: C.muted,
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: MENU.monoFont,
              flexShrink: 0,
              lineHeight: 1.2,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.muted }}
            onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border }}
          >+</button>
        </div>
      </div>

      {looksStale && (
        <button
          type="button"
          onClick={kickOAuth}
          style={{
            display: 'block', width: '100%',
            margin: '2px 0 8px',
            padding: '8px 10px',
            background: 'rgba(234,179,8,0.06)',
            border: '1px solid rgba(234,179,8,0.28)',
            borderRadius: 6,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: MENU.bodyFont,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(234,179,8,0.10)'
            e.currentTarget.style.borderColor = 'rgba(234,179,8,0.42)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(234,179,8,0.06)'
            e.currentTarget.style.borderColor = 'rgba(234,179,8,0.28)'
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>Looks like Mail needs to reconnect</div>
          <div style={{ fontSize: 10, color: C.muted, fontFamily: MENU.monoFont, letterSpacing: '0.04em' }}>
            CLICK TO RE-AUTHORIZE GMAIL
          </div>
        </button>
      )}

      <BucketTabs active={bucket} onChange={onBucket} counts={counts} />

      <div style={{
        marginTop: 6,
        maxHeight: LIST_MAX_HEIGHT,
        overflowY: 'auto',
        overflowX: 'hidden',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 6,
        background: 'rgba(255,255,255,0.015)',
      }}>
        {loading && (
          <div style={{ padding: '10px 12px', color: C.muted, fontSize: 11, fontFamily: MENU.bodyFont }}>
            Loading…
          </div>
        )}
        {!loading && emails.length === 0 && (
          <div style={{ padding: '10px 12px', color: C.muted, fontSize: 11, fontStyle: 'italic', fontFamily: MENU.bodyFont }}>
            Nothing here yet.
          </div>
        )}
        {!loading && emails.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {emails.map(e => (
              <MailRow
                key={e.id}
                email={e}
                active={selectedMailId === e.id}
                onClick={() => onSelectMail?.(e)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function BucketTabs({ active, onChange, counts }) {
  return (
    <div data-cv4-mail-tabs style={{
      display: 'flex', gap: 2,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 6, padding: 2,
    }}>
      {BUCKETS.map(b => {
        const isActive = active === b.slug
        const count = counts?.[b.slug] ?? null
        return (
          <button
            key={b.slug}
            type="button"
            onClick={() => onChange(b.slug)}
            data-active={isActive ? 'true' : 'false'}
            style={{
              flex: 1, minWidth: 0,
              padding: '5px 2px',
              background: isActive ? 'rgba(234,179,8,0.18)' : 'transparent',
              border: 'none', borderRadius: 4,
              color: isActive ? C.text : C.muted,
              cursor: 'pointer',
              fontSize: 9.5, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              fontFamily: MENU.monoFont,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              overflow: 'hidden',
            }}
            title={`${b.label}${count != null ? ` · ${count}` : ''}`}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {b.label}
            </span>
            {count != null && count > 0 && (
              <span style={{
                fontSize: 8, color: isActive ? C.text : C.dim, fontWeight: 600,
              }}>{count > 99 ? '99+' : count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function MailRow({ email, active, onClick }) {
  const from = useMemo(() => {
    const raw = email?.from || email?.from_name || ''
    if (!raw) return ''
    // "Name <addr>" → "Name". Plain "addr@x" stays.
    const m = raw.match(/^\s*"?([^"<]+?)"?\s*<.+>\s*$/)
    return m ? m[1].trim() : raw.trim()
  }, [email?.from, email?.from_name])
  const subject = email?.subject || '(no subject)'
  const preview = (email?.snippet || email?.preview || '').replace(/\s+/g, ' ').trim()
  return (
    <li
      data-cv4-mail-row
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      style={{
        padding: '7px 10px',
        cursor: 'pointer',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        background: active ? 'rgba(234,179,8,0.10)' : 'transparent',
        display: 'flex', flexDirection: 'column', gap: 2,
        minWidth: 0, overflow: 'hidden',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        fontSize: 11, fontWeight: 600,
        color: C.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontFamily: MENU.bodyFont,
      }}>{from || '—'}</div>
      <div style={{
        fontSize: 11, color: C.text2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontFamily: MENU.bodyFont,
      }}>{subject}</div>
      {preview && (
        <div style={{
          fontSize: 10, color: C.dim,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: MENU.bodyFont,
        }}>{preview}</div>
      )}
    </li>
  )
}

function MailIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <polyline points="3 7 12 13 21 7"/>
    </svg>
  )
}
