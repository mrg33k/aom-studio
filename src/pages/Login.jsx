import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPassword, getCurrentUser } from '../dashboard/lib/auth.js'
import { useThemeMode } from '../dashboard/hooks/useThemeMode.js'

const DARK = {
  bgBase:     '#040810',
  bgGrad:     ['#06090F', '#040810'],
  text:       '#F8FAFC',
  textMuted:  'rgba(255,255,255,0.30)',
  textDim:    'rgba(255,255,255,0.18)',
  fieldLine:  'rgba(255,255,255,0.10)',
  divider:    'rgba(255,255,255,0.06)',
  accent:     '#10B981',
  accent2:    '#34D399',
  blobs: [
    'rgba(16,185,129,0.07)',
    'rgba(6,95,70,0.08)',
    'rgba(52,211,153,0.04)',
    'rgba(16,185,129,0.05)',
  ],
  errBg:      'rgba(239,68,68,0.08)',
  errFg:      '#F87171',
  buttonText: '#FFFFFF',
}
const LIGHT = {
  bgBase:     '#F2EFE8',
  bgGrad:     ['#FAF7F0', '#E8E2D4'],
  text:       '#1A1F2C',
  textMuted:  'rgba(26,31,44,0.55)',
  textDim:    'rgba(26,31,44,0.38)',
  fieldLine:  'rgba(26,31,44,0.16)',
  divider:    'rgba(26,31,44,0.10)',
  accent:     '#0E8F66',
  accent2:    '#10B981',
  blobs: [
    'rgba(255,180,120,0.18)',
    'rgba(255,205,140,0.16)',
    'rgba(180,210,255,0.14)',
    'rgba(14,143,102,0.10)',
  ],
  errBg:      'rgba(220,38,38,0.08)',
  errFg:      '#B91C1C',
  buttonText: '#FFFFFF',
}

// ── Animated mesh background ────────────────────────────────────────────────
function MeshBackground({ palette }) {
  const canvasRef = useRef(null)
  const raf = useRef(null)
  const paletteRef = useRef(palette)
  paletteRef.current = palette

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
      const p = paletteRef.current
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = p.bgBase
      ctx.fillRect(0, 0, w, h)
      const positions = [
        { cx: w * 0.3 + Math.sin(t * 0.7) * w * 0.15, cy: h * 0.25 + Math.cos(t * 0.5) * h * 0.1, r: Math.max(w, h) * 0.4 },
        { cx: w * 0.7 + Math.cos(t * 0.6) * w * 0.12, cy: h * 0.7  + Math.sin(t * 0.8) * h * 0.15, r: Math.max(w, h) * 0.35 },
        { cx: w * 0.5 + Math.sin(t * 1.1) * w * 0.2,  cy: h * 0.5  + Math.cos(t * 0.9) * h * 0.2,  r: Math.max(w, h) * 0.3 },
        { cx: w * 0.15 + Math.cos(t * 0.4) * w * 0.08, cy: h * 0.8 + Math.sin(t * 0.6) * h * 0.1,  r: Math.max(w, h) * 0.25 },
      ]
      positions.forEach((b, i) => {
        const grad = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, b.r)
        grad.addColorStop(0, p.blobs[i] || p.blobs[0])
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      })
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
function LoadingScreen({ palette }) {
  const [dots, setDots] = useState('')
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    return () => clearInterval(iv)
  }, [])
  return (
    <div style={{
      minHeight: '100vh', background: palette.bgBase,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <MeshBackground palette={palette} />
      <style>{`@keyframes loaderBar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{
          fontSize: 22, fontWeight: 600, color: palette.text,
          letterSpacing: '-0.02em', marginBottom: 24,
        }}>
          Corner<span style={{ color: palette.accent }}>.</span>
        </div>
        <div style={{
          width: 140, height: 1, background: palette.divider,
          borderRadius: 1, overflow: 'hidden', margin: '0 auto 12px',
        }}>
          <div style={{
            height: '100%', width: '40%',
            background: `linear-gradient(90deg, transparent, ${palette.accent}, transparent)`,
            animation: 'loaderBar 1.6s ease-in-out infinite',
          }} />
        </div>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: palette.textMuted,
        }}>
          Loading{dots}
        </div>
      </div>
    </div>
  )
}

// ── Login page ──────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate()
  const { isLight } = useThemeMode()
  const nativeShell = typeof window !== 'undefined'
    && window.Capacitor?.isNativePlatform?.() === true
  const palette = nativeShell ? DARK : (isLight ? LIGHT : DARK)
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

  // Auto-pick light/dark by local time of day (7am-7pm = light, else dark).
  // Only writes when the user hasn't already set a preference manually —
  // the in-app toggle (when it exists) is the override and must stick.
  const seedAutoTheme = () => {
    try {
      if (localStorage.getItem('themeUserSet') === '1') return
      const h = new Date().getHours()
      const auto = h >= 7 && h < 19 ? 'light' : 'dark'
      localStorage.setItem('theme', auto)
    } catch {}
  }

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
      seedAutoTheme()
      setSigningIn(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200)
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div style={{ minHeight: '100vh', background: palette.bgBase, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${palette.divider}`, borderTop: `1.5px solid ${palette.textMuted}`, animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (signingIn) return <LoadingScreen palette={palette} />

  const inputStyle = (focused) => ({
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${focused ? palette.accent : palette.fieldLine}`,
    borderRadius: 0,
    padding: '8px 0',
    fontSize: 15,
    fontWeight: 500,
    color: palette.text,
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '-0.01em',
    outline: 'none',
    transition: 'border-color 220ms ease',
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: palette.bgBase,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: nativeShell
        ? 'max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom))'
        : '1rem',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes loginFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dotPulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder { color: ${palette.textDim}; font-weight: 400; }
      `}</style>

      <MeshBackground palette={palette} />

      {/* Corner-marker frame — futuristic accent, no chrome */}
      <CornerMarks color={palette.fieldLine} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 320,
        ...(nativeShell ? {
          maxWidth: 350, padding: '32px 24px 28px', borderRadius: 28,
          background: 'linear-gradient(145deg, rgba(20,26,36,0.78), rgba(7,11,18,0.58))',
          border: '1px solid rgba(255,255,255,0.11)',
          boxShadow: '0 26px 80px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.06)',
          backdropFilter: 'blur(28px) saturate(135%)',
          WebkitBackdropFilter: 'blur(28px) saturate(135%)',
        } : {}),
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* Wordmark — small, restrained */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            fontSize: 20, fontWeight: 600,
            color: palette.text,
            letterSpacing: '-0.02em',
          }}>
            Corner<span style={{ color: palette.accent }}>.</span>
          </div>
          <div style={{
            marginTop: 6, fontSize: 10, fontWeight: 600,
            color: palette.textMuted,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>
            AI command center
          </div>
        </div>

        {error && (
          <div style={{
            background: palette.errBg,
            borderLeft: `2px solid ${palette.errFg}`,
            padding: '8px 12px', marginBottom: 18,
            fontSize: 12, color: palette.errFg, fontWeight: 500, lineHeight: 1.4,
            fontFamily: "'Inter', sans-serif",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} noValidate>
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 9, fontWeight: 700,
              color: emailFocused ? palette.accent : palette.textMuted,
              marginBottom: 4, letterSpacing: '0.14em',
              textTransform: 'uppercase',
              transition: 'color 220ms ease',
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
          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: 'block', fontSize: 9, fontWeight: 700,
              color: passFocused ? palette.accent : palette.textMuted,
              marginBottom: 4, letterSpacing: '0.14em',
              textTransform: 'uppercase',
              transition: 'color 220ms ease',
              fontFamily: "'Inter', sans-serif",
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••"
              autoComplete="current-password"
              style={inputStyle(passFocused)}
              onFocus={() => setPassFocused(true)}
              onBlur={() => setPassFocused(false)}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%',
            padding: '11px 16px',
            background: loading
              ? `${palette.accent}33`
              : `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accent2} 100%)`,
            border: 'none',
            borderRadius: 10,
            fontSize: 13, fontWeight: 600,
            color: palette.buttonText,
            fontFamily: "'Inter', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '0.02em',
            transition: 'all 220ms ease',
            boxShadow: loading ? 'none' : `0 6px 22px ${palette.accent}33, 0 0 0 1px ${palette.accent}1A`,
          }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Signing in
              </span>
            ) : 'Sign in'}
          </button>
        </form>

        <div style={{
          marginTop: 22, textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <div style={{
            width: 4, height: 4, borderRadius: '50%',
            background: palette.accent,
            animation: 'dotPulse 2s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 9, color: palette.textMuted,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>
            Invite only
          </span>
        </div>
      </div>
    </div>
  )
}

function CornerMarks({ color }) {
  const len = 14
  const margin = 18
  const stroke = 1
  const mark = (style) => ({
    position: 'fixed', width: len, height: len,
    pointerEvents: 'none', zIndex: 1,
    ...style,
  })
  const line = (orient) => ({
    position: 'absolute', background: color,
    ...(orient === 'h' ? { left: 0, width: '100%', height: stroke } : { top: 0, height: '100%', width: stroke }),
  })
  return (
    <>
      <div style={mark({ top: margin, left: margin })}>
        <div style={{ ...line('h'), top: 0 }} />
        <div style={{ ...line('v'), left: 0 }} />
      </div>
      <div style={mark({ top: margin, right: margin })}>
        <div style={{ ...line('h'), top: 0 }} />
        <div style={{ ...line('v'), right: 0 }} />
      </div>
      <div style={mark({ bottom: margin, left: margin })}>
        <div style={{ ...line('h'), bottom: 0 }} />
        <div style={{ ...line('v'), left: 0 }} />
      </div>
      <div style={mark({ bottom: margin, right: margin })}>
        <div style={{ ...line('h'), bottom: 0 }} />
        <div style={{ ...line('v'), right: 0 }} />
      </div>
    </>
  )
}
