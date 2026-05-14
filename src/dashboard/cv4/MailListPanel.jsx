// CV4 MailListPanel — renders today's real-human emails in the right rail.
//
// Replaces TasksPanelCv4 when activeTool === 'mail'. Polls
// /api/dashboard/mail/list every 30s while visible, 5min when hidden — no
// model tokens are burned by the refresh (Gmail API call only). Clicking
// an email fires onSelectMail so CornerV4 can attach it to the EA chat.

import { useEffect, useRef, useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'

const POLL_VISIBLE_MS = 30_000
const POLL_HIDDEN_MS = 5 * 60_000

export default function MailListPanel({ selectedMailId, onSelectMail }) {
  const [emails, setEmails] = useState([])
  const [mode, setMode] = useState('loading') // loading | live | not-connected | error
  const [errorDetail, setErrorDetail] = useState('')
  const [lastFetched, setLastFetched] = useState(null)
  const timerRef = useRef(null)
  const inflightRef = useRef(false)

  const load = async ({ silent } = {}) => {
    if (inflightRef.current) return
    inflightRef.current = true
    if (!silent) setMode(m => (m === 'live' ? m : 'loading'))
    try {
      const r = await authFetch('/api/dashboard/mail/list')
      if (r.status === 401) {
        const body = await r.json().catch(() => ({}))
        if (body?.error === 'not-authenticated') { setMode('error'); setErrorDetail('not-authenticated') }
        else { setMode('error'); setErrorDetail(body?.error || 'unauthorized') }
        return
      }
      if (!r.ok) {
        setMode('error')
        setErrorDetail(`HTTP ${r.status}`)
        return
      }
      const body = await r.json()
      if (body.mode === 'not-connected') { setMode('not-connected'); setEmails([]); return }
      setEmails(Array.isArray(body.emails) ? body.emails : [])
      setMode('live')
      setLastFetched(Date.now())
    } catch (e) {
      setMode('error')
      setErrorDetail(e.message || 'fetch-failed')
    } finally {
      inflightRef.current = false
    }
  }

  useEffect(() => {
    load()
    const schedule = () => {
      const ms = document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS
      timerRef.current = setTimeout(async () => {
        await load({ silent: true })
        schedule()
      }, ms)
    }
    schedule()
    const onVisibility = () => {
      if (!document.hidden) {
        if (timerRef.current) clearTimeout(timerRef.current)
        load({ silent: true })
        schedule()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div data-cv4-mail-panel style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', fontFamily: "'Inter', sans-serif",
    }}>
      <Header
        count={emails.length}
        mode={mode}
        lastFetched={lastFetched}
        onRefresh={() => load()}
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {mode === 'loading' && <Loading />}
        {mode === 'not-connected' && <NotConnected />}
        {mode === 'error' && <ErrorState detail={errorDetail} onRetry={() => load()} />}
        {mode === 'live' && emails.length === 0 && <EmptyState />}
        {mode === 'live' && emails.length > 0 && (
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

function Header({ count, mode, lastFetched, onRefresh }) {
  const summary = mode === 'live'
    ? `${count} ${count === 1 ? 'message' : 'messages'} today`
    : mode === 'not-connected' ? 'Gmail not connected'
    : mode === 'loading' ? 'Loading…'
    : 'Couldn\'t reach Gmail'
  return (
    <div style={{
      padding: '12px 14px 10px',
      borderBottom: '1px solid ' + C.border,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: C.dim,
          letterSpacing: '0.10em', textTransform: 'uppercase',
          fontFamily: "'JetBrains Mono', monospace",
        }}>Mail</span>
        <span style={{
          fontSize: 12, color: C.text2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{summary}</span>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        title={lastFetched ? `Last refreshed ${new Date(lastFetched).toLocaleTimeString()}` : 'Refresh'}
        aria-label="Refresh mail"
        style={{
          width: 26, height: 26, borderRadius: 6, flexShrink: 0,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: C.muted, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
          <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
        </svg>
      </button>
    </div>
  )
}

function MailRow({ email, active, onClick }) {
  const fromName = email.from?.name || email.from?.email || '(unknown)'
  const when = formatWhen(email.date)
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        data-active={active ? 'true' : 'false'}
        style={{
          width: '100%', textAlign: 'left',
          display: 'flex', flexDirection: 'column', gap: 4,
          padding: '10px 14px',
          background: active ? 'rgba(16,185,129,0.10)' : 'transparent',
          border: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          borderLeft: active ? `2px solid ${C.accent}` : '2px solid transparent',
          cursor: 'pointer', color: 'inherit',
          fontFamily: "'Inter', sans-serif",
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          {email.unread && (
            <span aria-label="unread" style={{
              width: 6, height: 6, borderRadius: '50%',
              background: C.accent, flexShrink: 0,
              marginRight: -2,
            }} />
          )}
          <span style={{
            fontSize: 13, fontWeight: email.unread ? 700 : 600, color: C.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, minWidth: 0,
          }}>{fromName}</span>
          <span style={{
            fontSize: 10, color: C.muted, flexShrink: 0,
            fontFamily: "'JetBrains Mono', monospace",
          }}>{when}</span>
        </div>
        <div style={{
          fontSize: 12, fontWeight: email.unread ? 600 : 500, color: C.text2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{email.subject}</div>
        {email.snippet && (
          <div style={{
            fontSize: 11, color: C.muted,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.35,
          }}>{email.snippet}</div>
        )}
      </button>
    </li>
  )
}

function Loading() {
  return (
    <div style={{ padding: '24px 14px', color: C.muted, fontSize: 12 }}>
      Pulling today's mail…
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ padding: '32px 18px', color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
      Inbox zero for today. Anything new from a real person lands here automatically.
    </div>
  )
}

function NotConnected() {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const onConnect = async () => {
    setErr('')
    setBusy(true)
    try {
      // Fetch with Authorization header so the JWT reaches /oauth/start —
      // a plain <a href> top-level nav 401s because no JWT is attached.
      // Mirror the IntegrationsModal connect() pattern.
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
  return (
    <div style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>
        Mail needs your Gmail account. Connect it once and today's real-human mail will appear here.
      </div>
      <button
        type="button"
        onClick={onConnect}
        disabled={busy}
        style={{
          alignSelf: 'flex-start',
          padding: '6px 12px',
          fontSize: 12, fontWeight: 600,
          borderRadius: 8,
          background: 'rgba(16,185,129,0.15)',
          border: `1px solid ${C.accent}`,
          color: C.accent,
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >{busy ? 'Connecting…' : 'Connect Gmail'}</button>
      {err && (
        <div style={{ fontSize: 11, color: '#f87171', fontFamily: "'JetBrains Mono', monospace" }}>{err}</div>
      )}
    </div>
  )
}

function ErrorState({ detail, onRetry }) {
  return (
    <div style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, color: C.text2 }}>Couldn't reach Gmail.</div>
      {detail && (
        <div style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>{detail}</div>
      )}
      <button
        type="button"
        onClick={onRetry}
        style={{
          alignSelf: 'flex-start',
          padding: '6px 12px',
          fontSize: 12, fontWeight: 600,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: C.text2, cursor: 'pointer',
        }}
      >Retry</button>
    </div>
  )
}

function formatWhen(ts) {
  if (!ts) return ''
  const now = Date.now()
  const d = new Date(ts)
  const diff = now - ts
  if (diff < 60_000) return 'now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86400_000) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
