import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPassword, getCurrentUser } from '../dashboard/lib/auth.js'

// ── Particle field config ───────────────────────────────────────────────────
const PARTICLE_COUNT = 80
const CONNECTION_DIST = 120
const SPEED = 0.3

function createParticles(w, h) {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * SPEED,
    vy: (Math.random() - 0.5) * SPEED,
    r: Math.random() * 1.5 + 0.5,
  }))
}

function ParticleCanvas() {
  const canvasRef = useRef(null)
  const particles = useRef([])
  const raf = useRef(null)
  const mouse = useRef({ x: -999, y: -999 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h
    particles.current = createParticles(w, h)

    const handleResize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
      particles.current = createParticles(w, h)
    }
    window.addEventListener('resize', handleResize)

    const handleMouse = (e) => { mouse.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', handleMouse)

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const pts = particles.current
      const mx = mouse.current.x
      const my = mouse.current.y

      // Update positions
      for (const p of pts) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0
      }

      // Draw connections
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.15
            ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.stroke()
          }
        }
        // Mouse interaction: glow connections near cursor
        const mdx = pts[i].x - mx
        const mdy = pts[i].y - my
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy)
        if (mdist < 150) {
          const alpha = (1 - mdist / 150) * 0.4
          ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(pts[i].x, pts[i].y)
          ctx.lineTo(mx, my)
          ctx.stroke()
        }
      }

      // Draw particles
      for (const p of pts) {
        const mdx = p.x - mx
        const mdy = p.y - my
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy)
        const glow = mdist < 150 ? (1 - mdist / 150) * 0.6 : 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r + glow * 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(16, 185, 129, ${0.3 + glow})`
        ctx.fill()
      }

      raf.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouse)
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
      minHeight: '100vh', background: '#060A14',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <ParticleCanvas />
      <style>{`
        @keyframes loaderPulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } }
        @keyframes loaderBar { 0% { width: 0%; } 100% { width: 100%; } }
      `}</style>
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{
          fontSize: 28, fontWeight: 800, color: '#F8FAFC',
          letterSpacing: '-0.02em', marginBottom: 32,
        }}>
          Corner<span style={{ color: '#10B981' }}>.</span>
        </div>
        {/* Loader bar */}
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
        <div style={{
          fontSize: 13, color: '#475569', fontWeight: 500,
          fontFamily: "'Inter', sans-serif",
        }}>
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
      // Show loading screen while dashboard loads
      setSigningIn(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
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

  // Post-login loading state
  if (signingIn) return <LoadingScreen />

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060A14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes cornerFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cornerFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes borderGlow { 0%, 100% { border-color: rgba(16,185,129,0.08); } 50% { border-color: rgba(16,185,129,0.2); } }
        * { box-sizing: border-box; }
        input::placeholder { color: #334155; }
      `}</style>

      {/* Animated particle background */}
      <ParticleCanvas />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 380,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* Glass card */}
        <div style={{
          background: 'rgba(6, 10, 20, 0.7)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20,
          padding: '48px 36px 40px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
          animation: 'borderGlow 6s ease-in-out infinite',
        }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              fontSize: 32, fontWeight: 800,
              color: '#F8FAFC',
              letterSpacing: '-0.03em',
              animation: 'cornerFloat 4s ease-in-out infinite',
            }}>
              Corner<span style={{ color: '#10B981' }}>.</span>
            </div>
            <div style={{
              marginTop: 8, fontSize: 13, fontWeight: 500,
              color: '#475569', letterSpacing: '0.02em',
            }}>
              Your AI command center
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 12, padding: '10px 14px', marginBottom: 20,
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
                display: 'block', fontSize: 12, fontWeight: 600,
                color: '#64748B', marginBottom: 8, letterSpacing: '0.04em',
                textTransform: 'uppercase',
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
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '13px 16px',
                  fontSize: 15, fontWeight: 400,
                  color: '#F1F5F9',
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                  transition: 'border-color 250ms ease, box-shadow 250ms ease, background 250ms ease',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(16,185,129,0.4)'
                  e.target.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.06)'
                  e.target.style.background = 'rgba(255,255,255,0.04)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.background = 'rgba(255,255,255,0.03)'
                }}
              />
            </div>
            <div style={{ marginBottom: 32 }}>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: '#64748B', marginBottom: 8, letterSpacing: '0.04em',
                textTransform: 'uppercase',
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
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '13px 16px',
                  fontSize: 15, fontWeight: 400,
                  color: '#F1F5F9',
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                  transition: 'border-color 250ms ease, box-shadow 250ms ease, background 250ms ease',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(16,185,129,0.4)'
                  e.target.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.06)'
                  e.target.style.background = 'rgba(255,255,255,0.04)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.background = 'rgba(255,255,255,0.03)'
                }}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%',
              padding: '14px 20px',
              background: loading
                ? 'rgba(16,185,129,0.3)'
                : 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none',
              borderRadius: 12,
              fontSize: 15, fontWeight: 600,
              color: '#FFFFFF',
              fontFamily: "'Inter', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '-0.01em',
              transition: 'all 200ms ease',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(16,185,129,0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Invite-only notice */}
        <div style={{
          marginTop: 24, textAlign: 'center',
          fontSize: 11, color: '#1E293B',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Invite only
        </div>
      </div>
    </div>
  )
}
