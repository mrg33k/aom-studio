import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { signInWithPassword } from '../dashboard/lib/auth.js'

// Landing page a new user hits from the invite link.  Previews the invite,
// collects a password, posts to /api/accept-invite, then signs them in and
// drops them into /dashboard where the EA onboarding takes over.
export default function AcceptInvite() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [state, setState] = useState('loading') // loading | ready | error | submitting | accepted
  const [invite, setInvite] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error'); setErrMsg('No invite token in link.')
      return
    }
    fetch(`/api/accept-invite?token=${encodeURIComponent(token)}`)
      .then(async r => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
        return body
      })
      .then(body => {
        setInvite(body)
        setDisplayName((body.email || '').split('@')[0])
        setState('ready')
      })
      .catch(err => { setState('error'); setErrMsg(err.message) })
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (state === 'submitting') return
    setErrMsg('')
    if (password.length < 8) { setErrMsg('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setErrMsg('Passwords do not match.'); return }

    setState('submitting')
    try {
      const r = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, display_name: displayName.trim() }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)

      // Sign the user in and hand off to the dashboard.  EA onboarding runs there.
      const { error: signInErr } = await signInWithPassword(invite.email, password)
      if (signInErr) throw signInErr
      setState('accepted')
      setTimeout(() => navigate('/dashboard', { replace: true }), 800)
    } catch (err) {
      setState('ready')
      setErrMsg(err.message || 'Something went wrong.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#040810',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#F1F5F9',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.04em' }}>
            Corner<span style={{ color: '#10B981' }}>.</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
            You've been invited.
          </div>
        </div>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.1)',
              borderTop: '2px solid #10B981',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }} />
            Checking invite…
          </div>
        )}

        {state === 'error' && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', borderLeft: '3px solid #EF4444',
            padding: '14px 16px', fontSize: 13, color: '#F87171',
          }}>
            {errMsg || 'This invite link is no longer valid.'}
          </div>
        )}

        {state === 'accepted' && (
          <div style={{ textAlign: 'center', color: '#10B981', fontSize: 14, fontWeight: 600 }}>
            Welcome in. Loading your workspace…
          </div>
        )}

        {(state === 'ready' || state === 'submitting') && invite && (
          <form onSubmit={handleSubmit} noValidate>
            <div style={{
              marginBottom: 24, padding: '12px 14px',
              background: 'rgba(16,185,129,0.06)',
              borderLeft: '3px solid #10B981',
              fontSize: 13, color: 'rgba(255,255,255,0.8)',
            }}>
              Invited as <strong style={{ color: '#F1F5F9' }}>{invite.email}</strong>
              {invite.world_slug ? <> · joining <strong>{invite.world_slug}</strong></> : null}
            </div>

            {errMsg && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', borderLeft: '3px solid #EF4444',
                padding: '10px 14px', marginBottom: 20,
                fontSize: 12, color: '#F87171',
              }}>
                {errMsg}
              </div>
            )}

            <Label>Your name</Label>
            <Input
              value={displayName}
              onChange={v => setDisplayName(v)}
              placeholder="Jane Smith"
              autoComplete="name"
            />

            <Label style={{ marginTop: 20 }}>Choose a password</Label>
            <Input
              type="password"
              value={password}
              onChange={v => setPassword(v)}
              placeholder="Min 8 characters"
              autoComplete="new-password"
            />

            <Label style={{ marginTop: 20 }}>Confirm password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={v => setConfirm(v)}
              placeholder="Repeat password"
              autoComplete="new-password"
            />

            <button type="submit" disabled={state === 'submitting'} style={{
              marginTop: 32, width: '100%',
              padding: '14px 18px',
              background: state === 'submitting'
                ? 'rgba(16,185,129,0.2)'
                : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 700, color: '#fff',
              cursor: state === 'submitting' ? 'not-allowed' : 'pointer',
              letterSpacing: '-0.01em',
              boxShadow: state === 'submitting' ? 'none'
                : '0 8px 32px rgba(16,185,129,0.25), 0 0 0 1px rgba(16,185,129,0.1)',
            }}>
              {state === 'submitting' ? 'Accepting…' : 'Accept invite'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function Label({ children, style }) {
  return (
    <label style={{
      display: 'block', fontSize: 11, fontWeight: 600,
      color: 'rgba(255,255,255,0.4)',
      marginBottom: 6, letterSpacing: '0.1em', textTransform: 'uppercase',
      ...style,
    }}>{children}</label>
  )
}

function Input({ value, onChange, type = 'text', placeholder, autoComplete }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      style={{
        width: '100%', background: 'none', border: 'none',
        borderBottom: '2px solid rgba(255,255,255,0.1)',
        padding: '10px 0', fontSize: 18, fontWeight: 600,
        color: '#F1F5F9', fontFamily: "'Inter', sans-serif",
        letterSpacing: '-0.01em', outline: 'none',
      }}
      onFocus={e => { e.target.style.borderBottomColor = '#10B981' }}
      onBlur={e => { e.target.style.borderBottomColor = 'rgba(255,255,255,0.1)' }}
    />
  )
}
