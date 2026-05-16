// CV4 MailRoom — dedicated chat room for a single email.
// corner:cv4-tools-mail R5 (2026-05-15).
//
// Replaces center column when activeTool==='mail' and mailRoomOpen is true.
// Top: pinned email header (collapsible body). Bottom: existing ChatPanel,
// keyed by email id so opening different emails feels like distinct rooms.

import { useEffect, useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'
import ChatPanel from '../components/cv3/ChatPanel.jsx'

export default function MailRoom({ email, onBack }) {
  const [activeConnection, setActiveConnection] = useState(null)
  useEffect(() => {
    let canceled = false
    async function run() {
      try {
        const r = await authFetch('/api/dashboard/mail/connections')
        if (!r.ok) return
        const body = await r.json()
        const list = Array.isArray(body?.connections) ? body.connections : []
        if (canceled) return
        const ws = getUserWorld() || 'personal'
        const key = `cv4.mail.activeConnection.${ws}`
        const lastId = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
        const picked = list.find(c => c.id === lastId) || list[0] || null
        setActiveConnection(picked)
      } catch {
        // ignore — surface stays hidden
      }
    }
    run()
    return () => { canceled = true }
  }, [])
  const [expanded, setExpanded] = useState(false)
  const [body, setBody] = useState(null)
  const [bodyLoading, setBodyLoading] = useState(false)
  const [bodyErr, setBodyErr] = useState('')

  useEffect(() => {
    if (!expanded || body || !email?.id) return
    let cancelled = false
    setBodyLoading(true); setBodyErr('')
    authFetch(`/api/dashboard/mail/get?id=${encodeURIComponent(email.id)}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j?.error || `HTTP ${r.status}`)
        }
        return r.json()
      })
      .then((j) => { if (!cancelled) setBody(j) })
      .catch((e) => { if (!cancelled) setBodyErr(e.message || 'fetch-failed') })
      .finally(() => { if (!cancelled) setBodyLoading(false) })
    return () => { cancelled = true }
  }, [expanded, body, email?.id])

  if (!email) return null

  const fromName = email.from?.name || email.from?.email || '(unknown)'
  const fromEmail = email.from?.email || ''
  const when = email.date ? new Date(email.date).toLocaleString([], {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }) : ''

  return (
    <div data-cv4-mail-room style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', minHeight: 0,
    }}>
      <div style={{
        flexShrink: 0, borderBottom: '1px solid ' + C.border,
        background: 'rgba(234,179,8,0.04)', padding: '12px 18px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button type="button" onClick={onBack}
            aria-label="Back to Mail Room" title="Back to Mail Room"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: C.text2, cursor: 'pointer', flexShrink: 0,
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#eab308',
            letterSpacing: '0.10em', textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
          }}>Mail Room</span>
          <span style={{ flex: 1 }} />
          {when && (
            <span style={{
              fontSize: 11, color: C.muted,
              fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
            }}>{when}</span>
          )}
        </div>
        <div style={{
          fontSize: 17, fontWeight: 600, color: C.text, lineHeight: 1.3,
          fontFamily: "'Instrument Serif', 'Inter', serif", marginBottom: 6,
        }}>{email.subject || '(no subject)'}</div>
        {activeConnection?.account_email && (
          <div style={{
            fontSize: 11, color: C.muted, marginTop: 4, marginBottom: 4,
            fontFamily: "'JetBrains Mono', monospace",
          }}>sending from {activeConnection.account_email}</div>
        )}
        <div style={{
          fontSize: 12, color: C.text2,
          display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 600 }}>{fromName}</span>
          {fromEmail && fromEmail !== fromName && (
            <span style={{ color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
              {`<${fromEmail}>`}
            </span>
          )}
        </div>
        <button type="button" onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          style={{
            marginTop: 10, padding: 0, background: 'none', border: 'none',
            color: C.muted, fontSize: 11, cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.04em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}>
            <polyline points="9 6 15 12 9 18"/>
          </svg>
          {expanded ? 'Hide message' : 'Show message'}
        </button>
        {!expanded && email.snippet && (
          <div style={{
            marginTop: 8, fontSize: 12, color: C.muted, lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{email.snippet}</div>
        )}
        {expanded && (
          <div style={{
            marginTop: 10, maxHeight: 240, overflowY: 'auto',
            padding: 12, background: 'rgba(0,0,0,0.20)',
            border: '1px solid ' + C.border, borderRadius: 8,
            fontSize: 13, color: C.text2, lineHeight: 1.55,
            whiteSpace: 'pre-wrap', fontFamily: "'Inter', sans-serif",
          }}>
            {bodyLoading && <span style={{ color: C.muted }}>Loading message…</span>}
            {bodyErr && (
              <span style={{ color: '#f87171', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{bodyErr}</span>
            )}
            {!bodyLoading && !bodyErr && body && (body.text || body.snippet || '(empty body)')}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <ChatPanel key={`mail-room-${email.id}`} />
      </div>
    </div>
  )
}
