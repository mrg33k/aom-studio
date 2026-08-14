import React, { useState, useEffect, useCallback } from 'react'
import ShaderLinesBackground from '../components/ShaderLinesBackground.jsx'

// ─────────────────────────────────────────────────────────────────────────────
// Support Desk — client "speak freely" surface.  Route: /support
// Standalone, no login, no Corner exposure. One open space to speak; send = a
// warm "you've been heard" moment + an access-code status link. Returning with
// ?code=XXX shows the calm status timeline (Heard → Working → With the AOM team
// → Resolved). NOT a chat. Visual DNA: calm cinematic dark canvas, living shader
// lines, zero chrome — the opposite of a support form.
// ─────────────────────────────────────────────────────────────────────────────

const INK_TEXT = '#EDE9DE'        // warm bone
const INK_DIM = 'rgba(237,233,222,0.68)'
const INK_FAINT = 'rgba(237,233,222,0.40)'
const AMBER = '#F59E0B'
const SERIF = '"Instrument Serif", Georgia, serif'
const BODY = '"Hanken Grotesk", system-ui, -apple-system, sans-serif'
const MONO = '"JetBrains Mono", ui-monospace, monospace'

const STATUS_STEPS = [
  { key: 'heard', label: 'Heard' },
  { key: 'working', label: 'Working' },
  { key: 'needs_team', label: 'With the AOM team' },
  { key: 'resolved', label: 'Resolved' },
]

function statusIndex(s) {
  const i = STATUS_STEPS.findIndex((x) => x.key === s)
  return i < 0 ? 0 : i
}

export default function SupportWish() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initialCode = params ? (params.get('code') || '') : ''

  const [mode, setMode] = useState(initialCode ? 'status' : 'speak') // speak | sending | sent | status
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [accessCode, setAccessCode] = useState(initialCode)
  const [statusData, setStatusData] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  const loadStatus = useCallback(async (code) => {
    if (!code) return
    setLoadingStatus(true); setError('')
    try {
      const r = await fetch(`/api/support/wishes?access_code=${encodeURIComponent(code)}`)
      if (!r.ok) { setError("We couldn't find that code. Double-check the link?"); setStatusData(null) }
      else setStatusData(await r.json())
    } catch (e) {
      setError('Something went wrong loading your status. Try again in a moment.')
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    if (initialCode) loadStatus(initialCode)
  }, [initialCode, loadStatus])

  async function send() {
    if (!message.trim()) { setError('Say a little about what you need first.'); return }
    if (!email.trim() || !email.includes('@')) { setError('Add an email so we can reach you.'); return }
    setMode('sending'); setError('')
    try {
      const r = await fetch('/api/support/wish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, message: message.trim() }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.error || 'send failed')
      setAccessCode(d.access_code)
      setMode('sent')
    } catch (e) {
      setError("That didn't go through. Mind trying once more?")
      setMode('speak')
    }
  }

  const wrap = {
    position: 'relative', zIndex: 1, minHeight: '100vh', width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '8vh 24px', boxSizing: 'border-box', fontFamily: BODY, color: INK_TEXT,
  }
  const panel = { width: '100%', maxWidth: 680 }

  return (
    <div style={{ minHeight: '100vh', background: '#06090F' }}>
      <ShaderLinesBackground />
      <div style={wrap}>
        <div style={panel}>
          {mode === 'speak' && (
            <>
              <p style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase',
                color: INK_FAINT, margin: '0 0 22px' }}>AOM Support</p>
              <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(34px, 6vw, 60px)',
                lineHeight: 1.05, margin: '0 0 10px', letterSpacing: '-0.01em' }}>
                What do you need?
              </h1>
              <p style={{ fontSize: 17, lineHeight: 1.5, color: INK_DIM, margin: '0 0 36px', maxWidth: 520 }}>
 Tell us what you're after or what's bugging you, in your own words. We read every one,
                fix what we can, and get back to you.
              </p>

              <textarea
                value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Say it freely…" rows={5} autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box', background: 'transparent',
                  border: 'none', borderBottom: '1px solid rgba(237,233,222,0.18)',
                  color: INK_TEXT, fontFamily: SERIF, fontSize: 'clamp(22px, 3.4vw, 30px)',
                  lineHeight: 1.4, padding: '6px 0 16px', resize: 'none', outline: 'none',
                  minHeight: '34vh',
                }}
              />

              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 26 }}>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)"
                  style={fieldStyle()} />
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email so we can reach you"
                  type="email" style={fieldStyle()} />
              </div>

              {error && <p style={errStyle}>{error}</p>}

              <button onClick={send} style={sendBtn}>Send</button>
              <p style={{ fontSize: 13, color: INK_FAINT, marginTop: 18 }}>
                You'll get an email back, plus a private link to watch where it stands.
                We typically reply within one business day.
              </p>
            </>
          )}

          {mode === 'sending' && (
            <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(30px,5vw,48px)', margin: 0 }}>
              Sending…
            </h1>
          )}

          {mode === 'sent' && (
            <>
              <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(34px,6vw,58px)',
                lineHeight: 1.08, margin: '0 0 14px', letterSpacing: '-0.01em' }}>
                You've been heard.
              </h1>
              <p style={{ fontSize: 18, lineHeight: 1.55, color: INK_DIM, margin: '0 0 30px', maxWidth: 540 }}>
                Thanks for telling us. Someone on our side is already on it, and we'll email you at{' '}
                <span style={{ color: INK_TEXT }}>{email}</span> the moment there's an answer.
              </p>
              <div style={codeCard}>
                <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: INK_FAINT }}>Your status code</span>
                <span style={{ fontFamily: MONO, fontSize: 26, letterSpacing: '0.14em', color: AMBER, marginTop: 6 }}>
                  {accessCode}
                </span>
              </div>
              <a href={`/support?code=${accessCode}`} style={linkBtn}>Watch where it stands →</a>
            </>
          )}

          {mode === 'status' && (
            <StatusView code={accessCode} data={statusData} loading={loadingStatus} error={error} />
          )}
        </div>
      </div>
    </div>
  )
}

function StatusView({ code, data, loading, error }) {
  if (loading) return <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 36, margin: 0 }}>Looking…</h1>
  if (error && !data) {
    return (
      <>
        <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(28px,5vw,44px)', margin: '0 0 12px' }}>
          Hmm.
        </h1>
        <p style={{ color: INK_DIM, fontSize: 17 }}>{error}</p>
        <a href="/support" style={linkBtn}>Start a new message →</a>
      </>
    )
  }
  if (!data) return null
  const { wish, updates = [], status_label } = data
  const active = statusIndex(wish.status)
  const responses = updates.filter((u) => u.kind === 'response' && u.body)

  return (
    <>
      <p style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: INK_FAINT, margin: '0 0 18px' }}>Status · {code}</p>
      <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(32px,5.5vw,52px)',
        lineHeight: 1.08, margin: '0 0 8px' }}>{status_label}</h1>
      <p style={{ color: INK_DIM, fontSize: 16, margin: '0 0 36px', fontStyle: 'italic',
        fontFamily: SERIF, maxWidth: 560 }}>"{wish.message}"</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: responses.length ? 38 : 0 }}>
        {STATUS_STEPS.map((step, i) => {
          const done = i < active, current = i === active
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '11px 0' }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: current ? AMBER : done ? 'rgba(237,233,222,0.5)' : 'transparent',
                border: current || done ? 'none' : '1px solid rgba(237,233,222,0.25)',
                boxShadow: current ? `0 0 0 5px rgba(245,158,11,0.16)` : 'none',
              }} />
              <span style={{
                fontSize: 17, color: current ? INK_TEXT : done ? INK_DIM : INK_FAINT,
                fontWeight: current ? 600 : 400,
              }}>{step.label}</span>
            </div>
          )
        })}
      </div>

      {responses.map((r) => (
        <div key={r.id} style={{
          borderLeft: `2px solid ${AMBER}`, padding: '4px 0 4px 18px', marginTop: 18,
          color: INK_TEXT, fontSize: 17, lineHeight: 1.55,
        }}>{r.body}</div>
      ))}
    </>
  )
}

function fieldStyle() {
  return {
    flex: '1 1 220px', minWidth: 0, background: 'transparent',
    border: 'none', borderBottom: '1px solid rgba(237,233,222,0.18)',
    color: INK_TEXT, fontFamily: BODY, fontSize: 16, padding: '8px 0', outline: 'none',
  }
}

const sendBtn = {
  marginTop: 30, background: AMBER, color: '#1A1206', border: 'none',
  fontFamily: BODY, fontSize: 16, fontWeight: 700, letterSpacing: '0.01em',
  padding: '14px 40px', borderRadius: 2, cursor: 'pointer',
}
const linkBtn = {
  display: 'inline-block', marginTop: 26, color: AMBER, textDecoration: 'none',
  fontFamily: BODY, fontSize: 16, fontWeight: 600, borderBottom: `1px solid rgba(245,158,11,0.4)`,
  paddingBottom: 2,
}
const codeCard = {
  display: 'inline-flex', flexDirection: 'column', gap: 2,
  border: '1px solid rgba(237,233,222,0.15)', borderRadius: 4, padding: '16px 22px',
}
const errStyle = { color: '#F0A07A', fontSize: 14, marginTop: 16, marginBottom: 0 }