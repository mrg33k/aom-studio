import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPassword, getCurrentUser } from '../dashboard/lib/auth.js'

// ── Animated gradient mesh background ───────────────────────────────────────
function MeshBackground() {
  const canvasRef = useRef(null)
  const raf = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h
    let t = 0

    const handleResize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
    }
    window.addEventListener('resize', handleResize)

    const draw = () => {
      t += 0.003
      ctx.clearRect(0, 0, w, h)

      // Deep space base
      ctx.fillStyle = '#040810'
      ctx.fillRect(0, 0, w, h)

      // Orbiting gradient blobs
      const blobs = [
        { cx: w * 0.3 + Math.sin(t * 0.7) * w * 0.15, cy: h * 0.25 + Math.cos(t * 0.5) * h * 0.1, r: Math.max(w, h) * 0.4, color: 'rgba(16, 185, 129, 0.07)' },
        { cx: w * 0.7 + Math.cos(t * 0.6) * w * 0.12, cy: h * 0.7 + Math.sin(t * 0.8) * h * 0.15, r: Math.max(w, h) * 0.35, color: 'rgba(6, 95, 70, 0.08)' },
        { cx: w * 0.5 + Math.sin(t * 1.1) * w * 0.2, cy: h * 0.5 + Math.cos(t * 0.9) * h * 0.2, r: Math.max(w, h) * 0.3, color: 'rgba(52, 211, 153, 0.04)' },
        { cx: w * 0.15 + Math.cos(t * 0.4) * w * 0.08, cy: h * 0.8 + Math.sin(t * 0.6) * h * 0.1, r: Math.max(w, h) * 0.25, color: 'rgba(16, 185, 129, 0.05)' },
      ]

      for (const b of blobs) {
        const grad = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, b.r)
        grad.addColorStop(0, b.color)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      }

      // Subtle noise/grain overlay via tiny dots
      if (Math.random() > 0.7) {
        for (let i = 0; i < 30; i++) {
          const x = Math.random() * w
          const y = Math.random() * h
          ctx.fillStyle = `rgba(16, 185, 129, ${Math.random() * 0.03})`
          ctx.fillRect(x, y, 1, 1)
        }
      }

      raf.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  )
}

// ── Loading screen after sign-in ────────────────────────────────────────────
function LoadingScreen() {
  const [dots, setDots] = useState('')
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: '#040810',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <MeshBackground />
      <style>{`
        @keyframes loaderBar { 0% { width: 0%; } 100% { width: 100%; } }
      `}</style>
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{
          fontSize: 36, fontWeight: 800, color: '#F8FAFC',
          letterSpacing: '-0.03em', marginBottom: 40,
        }}>
          Corner<span style={{ color: '#10B981' }}>.</span>
        </div>
        <div style={{
          width: 200, height: 2, background: 'rgba(255,255,255,0.06)',
          borderRadius: 2, overflow: 'hidden', margin: '0 auto 16px',
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #10B981, #34D399)',
            borderRadius: 2,
            animation: 'loaderBar 2s ease-in-out infinite',
          }} />
        </div>
        <div style={{ fontSize: 14, color: '#475569', fontWeight: 500 }}>
          Loading your workspace{dots}
        </div>
      </div>
    </div>
  )
}

// ── Login page ──────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)
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
      setSigningIn(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div style={{ minHeight: '100vh', background: '#040810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.06)', borderTop: '2px solid rgba(255,255,255,0.4)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (signingIn) return <LoadingScreen />

  const inputStyle = (focused) => ({
    width: '100%',
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${focused ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 0,
    padding: '12px 0',
    fontSize: 22,
    fontWeight: 700,
    color: '#F1F5F9',
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '-0.02em',
    outline: 'none',
    transition: 'border-color 300ms ease',
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: '#040810',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes loginFadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes logoFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes dotPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.15); font-weight: 500; }
      `}</style>

      <MeshBackground />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 400,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            fontSize: 48, fontWeight: 800,
            color: '#F8FAFC',
            letterSpacing: '-0.04em',
            animation: 'logoFloat 5s ease-in-out infinite',
          }}>
            Corner<span style={{ color: '#10B981' }}>.</span>
          </div>
          <div style={{
            marginTop: 10, fontSize: 15, fontWeight: 500,
            color: 'rgba(255,255,255,0.25)', letterSpacing: '0.01em',
          }}>
            Your AI command center
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            borderLeft: '3px solid #EF4444',
            padding: '10px 14px', marginBottom: 32,
            fontSize: 13, color: '#F87171', fontWeight: 500, lineHeight: 1.4,
            fontFamily: "'Inter', sans-serif",
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignIn} noValidate>
          <div style={{ marginBottom: 36 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600,
              color: emailFocused ? '#10B981' : 'rgba(255,255,255,0.3)',
              marginBottom: 4, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              transition: 'color 300ms ease',
              fontFamily: "'Inter', sans-serif",
            }}>Email</label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="you@company.com"
              autoComplete="email"
              style={inputStyle(emailFocused)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </div>
          <div style={{ marginBottom: 48 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600,
              color: passFocused ? '#10B981' : 'rgba(255,255,255,0.3)',
              marginBottom: 4, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              transition: 'color 300ms ease',
              fontFamily: "'Inter', sans-serif",
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Enter password"
              autoComplete="current-password"
              style={inputStyle(passFocused)}
              onFocus={() => setPassFocused(true)}
              onBlur={() => setPassFocused(false)}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%',
            padding: '16px 20px',
            background: loading
              ? 'rgba(16,185,129,0.2)'
              : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            border: 'none',
            borderRadius: 14,
            fontSize: 16, fontWeight: 700,
            color: '#FFFFFF',
            fontFamily: "'Inter', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.01em',
            transition: 'all 250ms ease',
            boxShadow: loading ? 'none' : '0 8px 32px rgba(16,185,129,0.3), 0 0 0 1px rgba(16,185,129,0.1)',
          }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Invite-only */}
        <div style={{
          marginTop: 40, textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#10B981',
            animation: 'dotPulse 2s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 11, color: 'rgba(255,255,255,0.2)',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Invite only
          </span>
        </div>
      </div>
    </div>
  )
}
