import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPassword, getCurrentUser } from '../dashboard/lib/auth.js'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [mounted, setMounted] = useState(false)
  const emailRef = useRef(null)

  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) navigate('/dashboard', { replace: true })
      else {
        setCheckingSession(false)
        setTimeout(() => setMounted(true), 50)
      }
    })
  }, [navigate])

  useEffect(() => {
    if (!checkingSession && emailRef.current) emailRef.current.focus()
  }, [checkingSession])

  const handleSignIn = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    if (!email.trim()) { setError('Email is required.'); return }
    if (!password) { setError('Password is required.'); return }
    setLoading(true)
    try {
      const { error: authError } = await signInWithPassword(email.trim(), password)
      if (authError) {
        setError(authError.message || 'Invalid email or password.')
        setLoading(false)
        return
      }
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div style={{ minHeight: '100vh', background: '#060A14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.06)', borderTop: '2px solid rgba(255,255,255,0.4)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060A14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes cornerFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cornerGlow { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.8; } }
        @keyframes cornerSpin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
        pointerEvents: 'none',
        animation: 'cornerGlow 8s ease-in-out infinite',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 400,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            fontSize: 28, fontWeight: 800,
            color: '#F8FAFC',
            letterSpacing: '-0.02em',
          }}>
            Corner<span style={{ color: '#10B981' }}>.</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 20,
            fontSize: 13, color: '#F87171', fontWeight: 500, lineHeight: 1.4,
            fontFamily: "'Inter', sans-serif",
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignIn} noValidate>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 500,
              color: '#64748B', marginBottom: 8,
              fontFamily: "'Inter', sans-serif",
            }}>Email</label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="you@company.com"
              autoComplete="email"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 15, fontWeight: 400,
                color: '#F1F5F9',
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
                transition: 'border-color 200ms ease, box-shadow 200ms ease',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.08)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 500,
              color: '#64748B', marginBottom: 8,
              fontFamily: "'Inter', sans-serif",
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Your password"
              autoComplete="current-password"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 15, fontWeight: 400,
                color: '#F1F5F9',
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
                transition: 'border-color 200ms ease, box-shadow 200ms ease',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.08)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%',
            padding: '13px 20px',
            background: loading ? 'rgba(16,185,129,0.3)' : '#10B981',
            border: 'none',
            borderRadius: 10,
            fontSize: 15, fontWeight: 600,
            color: '#FFFFFF',
            fontFamily: "'Inter', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.01em',
            transition: 'all 200ms ease',
          }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Invite-only notice */}
        <div style={{
          marginTop: 32, textAlign: 'center',
          fontSize: 12, color: '#334155',
          fontFamily: "'Inter', sans-serif",
        }}>
          Invite only
        </div>
      </div>
    </div>
  )
}
