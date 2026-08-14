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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'
import { getUserWorld } from '../lib/clientConfig.js'
import { MailThreadContextMenu, useIsMobile, useLongPress } from '../components/cv3/ContextMenuVariants.jsx'
import useChatDispatch from '../components/cv3/useChatDispatch.js'

const MENU = {
  bodyFont: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  displayFont: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  monoFont: "'JetBrains Mono', monospace",
  amber: 'var(--c-yellow)',
}

// Five tabs that read well in a 300px-wide rail. Mirrors the canonical
// Mail Room buckets, dropping THREADS + PROSPECTS for space — those still
// exist on the API and can be added later if needed.
const BUCKETS = [
  { slug: 'awaiting-reply', label: 'Awaiting' },
  { slug: 'today',          label: 'Today' },
  { slug: 'clients',        label: 'Clients' },
  { slug: 'sent',           label: 'Sent' },
  { slug: 'all',            label: 'All' },
]
// R14 — default to AWAITING (matches original MailListPanel). TODAY is the
// most aggressive filter (today-only sender) and is empty on most days,
// which made the rail look broken on first open even though the connection
// was live.
const DEFAULT_BUCKET = 'awaiting-reply'
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
 {/* R20, "Mail" label dropped because the parent TreeSection's
            chevron header provides the section title. The hero is now
            a Connect Gmail CTA with the reason subline. */}
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
          <span style={{
            fontFamily: MENU.bodyFont, fontSize: 14, fontWeight: 600,
            letterSpacing: '-0.005em', lineHeight: 1.1,
            color: C.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{busy ? 'Connecting…' : 'Connect Gmail'}</span>
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
  const dispatchToChat = useChatDispatch()
  const isMobile = useIsMobile()
  const [ctxMenu, setCtxMenu] = useState(null)
  const closeCtxMenu = useCallback(() => setCtxMenu(null), [])
  const openMailMenu = useCallback((x, y, email) => {
    setCtxMenu({ x, y, thread: {
      id: email.id, threadId: email.threadId || email.thread_id,
      subject: email.subject, from: email?.from?.name || email?.from?.email || email?.from || '',
      unread: !!email.unread,
    } })
  }, [])
  const handleAgentPrompt = useCallback(async (text) => {
    closeCtxMenu()
    const r = await dispatchToChat(text)
    if (!r?.ok) console.warn('[Mail] chat dispatch failed', r)
  }, [dispatchToChat, closeCtxMenu])
  const tRef = useCallback((t) => '`' + (t.subject || t.threadId || t.id) + '`', [])
  const tEnvelope = useCallback((t) => (
    'Gmail-ID: ' + (t.id || '?') + '\n' +
    'Thread-ID: ' + (t.threadId || '?') + '\n' +
    'Subject: ' + (t.subject || '(no subject)') + '\n' +
    'From: ' + (t.from || 'unknown')
  ), [])
  const handleReply = useCallback((t) => handleAgentPrompt(
    'Draft a reply to this mail thread.\n\n' + tEnvelope(t) + '\n\n' +
    'Read the full thread first via `scripts/mail-read.py --id ' + (t.id || '<gmail-id>') + '` (and `mail-search.py` if you need more history with this sender).\n\n' +
 'Then draft the reply in plain English. Show it to me here in this chat before sending, do NOT call mail-send.py until I say "send it".\n\n' +
    'Work /007 in this chat.'
  ), [handleAgentPrompt, tEnvelope])
  const handleForward = useCallback((t) => handleAgentPrompt(
    'Draft a forward of this mail thread.\n\n' + tEnvelope(t) + '\n\n' +
    'Read the thread via `scripts/mail-read.py --id ' + (t.id || '<gmail-id>') + '`. Ask me who to send it to and any framing note before drafting. Then write the forward body and show it to me here before sending.\n\n' +
    'Work /007 in this chat.'
  ), [handleAgentPrompt, tEnvelope])
  const handleSummarize = useCallback((t) => handleAgentPrompt(
    'Summarize this mail thread for me in plain English.\n\n' + tEnvelope(t) + '\n\n' +
    'Read it via `scripts/mail-read.py --id ' + (t.id || '<gmail-id>') + '`. Tell me: (1) what they want in one sentence, (2) any deadlines or constraints, (3) what I should do next.\n\n' +
    'Work /007 in this chat.'
  ), [handleAgentPrompt, tEnvelope])
  const handleToggleRead = useCallback(async (t) => {
    closeCtxMenu()
    // Endpoint TBD — log for now so we can wire when /api/dashboard/mail/mark-read lands.
    console.warn('[Mail] toggle-read endpoint not yet wired', t.id)
  }, [closeCtxMenu])
  const handleArchive = useCallback(async (t) => {
    closeCtxMenu()
    console.warn('[Mail] archive endpoint not yet wired', t.id)
  }, [closeCtxMenu])
  const handleSnooze = useCallback(async (t) => {
    closeCtxMenu()
    console.warn('[Mail] snooze endpoint not yet wired', t.id)
  }, [closeCtxMenu])

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
    <div data-cv4-left-mail style={{ margin: '2px 2px 12px' }}>
 {/* R20, internal "Mail" label removed because the parent
          TreeSection ("MAIL" chevron header) IS the section title now.
          What remains: the active account email + "Add another" button. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '2px 4px 6px',
        gap: 8,
      }}>
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
                onContextMenu={(ev) => { ev.preventDefault(); openMailMenu(ev.clientX, ev.clientY, e) }}
                onLongPress={openMailMenu}
              />
            ))}
          </ul>
        )}
      </div>
          {ctxMenu && (
        <MailThreadContextMenu
          open x={ctxMenu.x} y={ctxMenu.y} thread={ctxMenu.thread} projects={[]}
          mobile={isMobile} onClose={closeCtxMenu}
          onReply={handleReply} onForward={handleForward}
          onToggleRead={handleToggleRead} onArchive={handleArchive}
          onSnooze={handleSnooze} onMoveTo={() => closeCtxMenu()}
        />
      )}
      </div>
  )
}

function BucketTabs({ active, onChange, counts }) {
  // R18 — labels no longer uppercase + zero letter-spacing + slightly bigger
  // font so all five fit in the ~280px rail without truncation. Patrik
  // flagged "Awaiting especially" was being ellipsized to "AWAITI…".
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
              padding: '5px 3px',
              background: isActive ? 'rgba(234,179,8,0.18)' : 'transparent',
              border: 'none', borderRadius: 4,
              color: isActive ? C.text : C.muted,
              cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              letterSpacing: 0,
              fontFamily: MENU.bodyFont,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              overflow: 'hidden',
              lineHeight: 1.15,
            }}
            title={`${b.label}${count != null ? ` · ${count}` : ''}`}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {b.label}
            </span>
            {count != null && count > 0 && (
              <span style={{
                fontSize: 9, color: isActive ? C.text : C.dim, fontWeight: 600,
                fontFamily: MENU.monoFont,
              }}>{count > 99 ? '99+' : count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function PaperclipMicro() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  )
}

function MailRow({ email, active, onClick, onContextMenu, onLongPress }) {
  const longPressHandlers = useLongPress(onLongPress ? (x, y) => onLongPress(x, y, email) : null)
  // R14 hotfix — /api/dashboard/mail/list returns `from` as
  // { name, email } (object), not the historical "Name <addr>" string. The
  // earlier .match() call threw "h.match is not a function" and crashed
  // CornerV4 the moment any populated bucket rendered, which never
  // happened in pre-R14 screenshots because TODAY was always empty.
  const from = useMemo(() => {
    const f = email?.from
    if (f && typeof f === 'object') return f.name || f.email || ''
    if (typeof f === 'string') {
      const m = f.match(/^\s*"?([^"<]+?)"?\s*<.+>\s*$/)
      return m ? m[1].trim() : f.trim()
    }
    return email?.from_name || ''
  }, [email?.from, email?.from_name])
  const subject = email?.subject || '(no subject)'
  const previewRaw = typeof email?.snippet === 'string'
    ? email.snippet
    : (typeof email?.preview === 'string' ? email.preview : '')
  const preview = previewRaw.replace(/\s+/g, ' ').trim()
  return (
    <li
      data-cv4-mail-row
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      onContextMenu={onContextMenu}
      {...(longPressHandlers || {})}
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
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 600,
        color: C.text,
        minWidth: 0,
        fontFamily: MENU.bodyFont,
      }}>
        <span style={{
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
 }}>{from || ', '}</span>
        {email?.hasAttachments && (
          <span
            title="Has attachment"
            aria-label="Has attachment"
            style={{ color: MENU.amber, display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            <PaperclipMicro />
          </span>
        )}
      </div>
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