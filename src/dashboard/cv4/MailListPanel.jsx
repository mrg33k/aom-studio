// CV4 MailListPanel — renders the Mail rail with 7 collapsible bucket
// filters (R6). Each bucket has its own count + lazy-loaded list. One
// bucket open at a time; AWAITING REPLY expands by default.
//
// R7 wired this panel to multi-account: the active workspace/personal
// Gmail connection drives which inbox the buckets read from.

import { useEffect, useRef, useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'
import { getUserWorld } from '../lib/clientConfig.js'
import MailAccountSwitcher from './MailAccountSwitcher.jsx'
import BucketSection from './BucketSection.jsx'

const POLL_VISIBLE_MS = 30_000
const POLL_HIDDEN_MS = 5 * 60_000

const BUCKETS = [
  { slug: 'awaiting-reply', label: 'AWAITING REPLY' },
  { slug: 'today',          label: 'TODAY' },
  { slug: 'clients',        label: 'CLIENTS' },
  { slug: 'threads',        label: 'THREADS' },
  { slug: 'prospects',      label: 'PROSPECTS' },
  { slug: 'sent',           label: 'SENT' },
  { slug: 'all',            label: 'ALL' },
]
const DEFAULT_BUCKET = 'awaiting-reply'

export default function MailListPanel({ selectedMailId, onSelectMail }) {
  const [mode, setMode] = useState('loading')
  const [errorDetail, setErrorDetail] = useState('')
  const [lastFetched, setLastFetched] = useState(null)
  const [oauthReason, setOauthReason] = useState('')
  const [connections, setConnections] = useState([])
  const [activeConnection, setActiveConnection] = useState(null)
  const [bucketCounts, setBucketCounts] = useState({})
  const [bucketEmails, setBucketEmails] = useState({})
  const [expandedBucket, setExpandedBucket] = useState(DEFAULT_BUCKET)
  const [loadingBucket, setLoadingBucket] = useState(null)
  const timerRef = useRef(null)
  const inflightCountsRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const u = new URL(window.location.href)
    if (u.searchParams.get('integrations') === 'error') {
      const reason = u.searchParams.get('reason') || 'unknown'
      setOauthReason(reason)
    }
  }, [])

  async function loadCounts({ silent } = {}) {
    if (!activeConnection?.id) return
    if (inflightCountsRef.current) return
    inflightCountsRef.current = true
    if (!silent) setMode(m => (m === 'live' ? m : 'loading'))
    try {
      const r = await authFetch(`/api/dashboard/mail/buckets?connection_id=${encodeURIComponent(activeConnection.id)}`)
      if (r.status === 401) {
        const body = await r.json().catch(() => ({}))
        setMode('error'); setErrorDetail(body?.error || 'unauthorized')
        return
      }
      if (!r.ok) {
        setMode('error'); setErrorDetail(`HTTP ${r.status}`)
        return
      }
      const body = await r.json()
      if (body.mode === 'not-connected') { setMode('not-connected'); setBucketCounts({}); return }
      setBucketCounts(body.counts || {})
      setMode('live')
      setLastFetched(Date.now())
    } catch (e) {
      setMode('error'); setErrorDetail(e.message || 'fetch-failed')
    } finally {
      inflightCountsRef.current = false
    }
  }

  async function loadBucket(slug, { force } = {}) {
    if (!activeConnection?.id || !slug) return
    if (!force && bucketEmails[slug]) return
    setLoadingBucket(slug)
    try {
      const r = await authFetch(`/api/dashboard/mail/list?connection_id=${encodeURIComponent(activeConnection.id)}&bucket=${encodeURIComponent(slug)}`)
      if (!r.ok) return
      const body = await r.json()
      setBucketEmails(prev => ({ ...prev, [slug]: Array.isArray(body.emails) ? body.emails : [] }))
    } catch {
      // soft-fail per bucket
    } finally {
      setLoadingBucket(prev => (prev === slug ? null : prev))
    }
  }

  useEffect(() => {
    const workspaceId = getUserWorld() || 'personal'
    async function loadConnections() {
      try {
        const r = await authFetch('/api/dashboard/mail/connections')
        if (!r.ok) return
        const body = await r.json()
        const list = Array.isArray(body?.connections) ? body.connections : []
        setConnections(list)
        const key = `cv4.mail.activeConnection.${workspaceId}`
        const lastId = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
        const restored = list.find(c => c.id === lastId) || list[0] || null
        setActiveConnection(restored)
      } catch { /* ignore */ }
    }
    loadConnections()
  }, [])

  useEffect(() => {
    setBucketEmails({})
    setBucketCounts({})
    setExpandedBucket(DEFAULT_BUCKET)
    if (!activeConnection?.id) return
    loadCounts()
    loadBucket(DEFAULT_BUCKET)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConnection?.id])

  useEffect(() => {
    const schedule = () => {
      const ms = document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS
      timerRef.current = setTimeout(async () => {
        await loadCounts({ silent: true })
        if (expandedBucket) await loadBucket(expandedBucket, { force: true })
        schedule()
      }, ms)
    }
    schedule()
    const onVisibility = () => {
      if (!document.hidden) {
        if (timerRef.current) clearTimeout(timerRef.current)
        loadCounts({ silent: true })
        if (expandedBucket) loadBucket(expandedBucket, { force: true })
        schedule()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConnection?.id, expandedBucket])

  const totalCount = Object.values(bucketCounts).reduce((a, b) => a + (b || 0), 0)
  const headerCount = bucketCounts[expandedBucket] ?? 0

  return (
    <div data-cv4-mail-panel style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', fontFamily: "'Inter', sans-serif",
    }}>
      <Header
        count={headerCount}
        bucketLabel={(BUCKETS.find(b => b.slug === expandedBucket)?.label || '').toLowerCase()}
        mode={mode}
        lastFetched={lastFetched}
        onRefresh={() => {
          loadCounts()
          if (expandedBucket) {
            setBucketEmails(prev => {
              const next = { ...prev }
              delete next[expandedBucket]
              return next
            })
            loadBucket(expandedBucket, { force: true })
          }
        }}
      />
      {activeConnection && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid ' + C.border }}>
          <MailAccountSwitcher
            connections={connections}
            active={activeConnection}
            workspaceId={getUserWorld() || null}
            workspaceName={(getUserWorld() || '').toUpperCase()}
            onChange={(c) => {
              setActiveConnection(c)
              const key = `cv4.mail.activeConnection.${getUserWorld() || 'personal'}`
              if (typeof window !== 'undefined') window.localStorage.setItem(key, c.id)
            }}
            onShared={() => {
              authFetch('/api/dashboard/mail/connections')
                .then(r => r.ok ? r.json() : null)
                .then(body => {
                  const list = Array.isArray(body?.connections) ? body.connections : []
                  setConnections(list)
                  const sameEmail = activeConnection?.account_email
                  const flipped = list.find(c => c.account_email === sameEmail) || list[0] || null
                  setActiveConnection(flipped)
                })
                .catch(() => {})
            }}
          />
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {mode === 'loading' && <Loading />}
        {mode === 'not-connected' && <NotConnected oauthReason={oauthReason} />}
        {mode === 'error' && <ErrorState detail={errorDetail} onRetry={() => loadCounts()} />}
        {mode === 'live' && (
          <div>
            {BUCKETS.map(b => {
              const count = bucketCounts[b.slug] ?? 0
              const open = expandedBucket === b.slug
              const emails = bucketEmails[b.slug] || []
              return (
                <BucketSection
                  key={b.slug}
                  slug={b.slug}
                  label={b.label}
                  count={count}
                  open={open}
                  loading={loadingBucket === b.slug}
                  onToggle={(slug) => {
                    const next = expandedBucket === slug ? null : slug
                    setExpandedBucket(next)
                    if (next) loadBucket(next)
                  }}
                >
                  {emails.length === 0 && !(loadingBucket === b.slug) && (
                    <div style={{ padding: '18px 14px', color: C.muted, fontSize: 12 }}>
                      {totalCount === 0
                        ? 'Nothing here yet.'
                        : `No ${b.label.toLowerCase()} right now.`}
                    </div>
                  )}
                  {loadingBucket === b.slug && (
                    <div style={{ padding: '14px', color: C.muted, fontSize: 12 }}>Loading…</div>
                  )}
                  {emails.length > 0 && (
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
                </BucketSection>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Header({ count, bucketLabel, mode, lastFetched, onRefresh }) {
  const summary = mode === 'live'
    ? `${count} ${count === 1 ? 'message' : 'messages'}${bucketLabel ? ` · ${bucketLabel}` : ''}`
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
      Loading buckets…
    </div>
  )
}

function NotConnected({ oauthReason }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const onConnect = async () => {
    setErr('')
    setBusy(true)
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
  return (
    <div style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>
        Mail needs your Gmail account. Connect it once and your buckets will populate automatically.
      </div>
      {oauthReason && (
        <div style={{
          fontSize: 11, color: '#f87171',
          padding: '8px 10px',
          borderRadius: 6,
          border: '1px solid rgba(248,113,113,0.35)',
          background: 'rgba(248,113,113,0.08)',
          fontFamily: "'JetBrains Mono', monospace",
          wordBreak: 'break-all',
        }}>
          Last connect failed: {oauthReason}
        </div>
      )}
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
