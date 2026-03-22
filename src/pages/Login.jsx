import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPassword, signUp, getCurrentUser } from '../dashboard/lib/auth.js'

// ---- Login / Sign-up / Force Password Change for Corner dashboard ----

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const emailRef = useRef(null)

  // If already authed, redirect to dashboard
  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) navigate('/dashboard', { replace: true })
      else setCheckingSession(false)
    })
  }, [navigate])

  // Focus email on mount
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
      const { user, error: authError } = await signInWithPassword(email.trim(), password)
      if (authError) {
        setError(authError.message || 'Invalid email or password.')
        setLoading(false)
        return
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setSuccess('')
    if (!email.trim()) { setError('Email is required.'); return }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      const { user, error: authError } = await signUp(email.trim(), password)
      if (authError) {
        setError(authError.message || 'Sign-up failed.')
        setLoading(false)
        return
      }
      if (user && !user.confirmed_at) {
        setSuccess('Check your email to confirm your account before signing in.')
        setLoading(false)
        setMode('signin')
        return
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0A0F1A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid #E85D26', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const isSignUp = mode === 'signup'

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, #060A14 0%, #0A1028 45%, #0F1830 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 300,
        background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 420,
        background: 'rgba(15,23,42,0.92)',
        border: '1.5px solid rgba(59,130,246,0.2)',
        borderRadius: 16,
        padding: '40px 36px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.08)',
      }}>
        {/* Logo / header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 32, fontWeight: 900,
            color: '#F1F5F9',
            letterSpacing: '0.01em',
            marginBottom: 8,
          }}>
            Corner<span style={{ color: '#E85D26' }}>.</span>
          </div>
          <div style={{
            fontSize: 14, fontWeight: 400,
            color: '#64748B',
          }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </div>
        </div>

        {/* Success message */}
        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20,
            fontSize: 13, color: '#10B981', fontWeight: 500,
            lineHeight: 1.4,
          }}>
            {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20,
            fontSize: 13, color: '#F87171', fontWeight: 500,
            lineHeight: 1.4,
          }}>
            {error}
          </div>
        )}

        {/* Sign In / Sign Up form */}
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} noValidate>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="you@example.com"
                autoComplete="email"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'rgba(232,93,38,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,38,0.12)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(59,130,246,0.2)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'rgba(232,93,38,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,38,0.12)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(59,130,246,0.2)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <button type="submit" disabled={loading} style={primaryBtnStyle(loading)}>
              {loading
                ? (isSignUp ? 'Creating account...' : 'Signing in...')
                : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

        {/* Mode toggle */}
        <div style={{
          marginTop: 20, textAlign: 'center',
          fontSize: 13, color: '#475569',
        }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={() => { setMode(isSignUp ? 'signin' : 'signup'); setError(''); setSuccess('') }}
            style={{
              background: 'none', border: 'none', padding: 0,
              color: '#60A5FA', cursor: 'pointer', fontWeight: 600,
              fontSize: 13, fontFamily: 'inherit',
              textDecoration: 'underline', textUnderlineOffset: 2,
            }}
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes cornerLoginSpin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}

// ---- Shared styles ----

const labelStyle = {
  display: 'block',
  fontSize: 12, fontWeight: 600,
  color: '#94A3B8',
  marginBottom: 6,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1.5px solid rgba(59,130,246,0.2)',
  borderRadius: 8,
  padding: '11px 14px',
  fontSize: 14, fontWeight: 400,
  color: '#F1F5F9',
  fontFamily: "'Inter', system-ui, sans-serif",
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
}

const primaryBtnStyle = (loading) => ({
  width: '100%',
  padding: '12px 20px',
  background: loading ? 'rgba(232,93,38,0.4)' : 'linear-gradient(135deg, #E85D26, #C44B1C)',
  border: 'none',
  borderRadius: 8,
  fontSize: 14, fontWeight: 700,
  color: '#FFFFFF',
  fontFamily: "'Inter', system-ui, sans-serif",
  cursor: loading ? 'not-allowed' : 'pointer',
  letterSpacing: '0.02em',
  transition: 'all 150ms ease',
  boxShadow: loading ? 'none' : '0 4px 16px rgba(232,93,38,0.3)',
})
