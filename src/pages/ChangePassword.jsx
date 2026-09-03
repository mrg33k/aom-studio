import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, updatePassword, isTempPassword } from '../dashboard/lib/auth.js'
import { useThemeMode } from '../dashboard/hooks/useThemeMode.js'
import {
  DARK, LIGHT, FONT,
  MeshBackground, ASCIIBackground, CenterScrim, CornerMarks,
} from './login-visuals.jsx'

// Forced password change for seeded accounts (users.mustChangePassword).
// corner:retire-supabase R3: auth:changePassword sets the new password without
// the old one while the flag is set, and clears the flag server-side.
// Visual treatment matches Login.jsx: same emerald-on-navy brand moment,
// same animated background, same component language.

export default function ChangePassword() {
  const navigate = useNavigate()
  const { isLight } = useThemeMode()
  const palette = isLight ? LIGHT : DARK
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [newFocused, setNewFocused] = useState(false)
  const [confirmFocused, setConfirmFocused] = useState(false)
  const newRef = useRef(null)

  useEffect(() => {
    getCurrentUser().then(user => {
      if (!user) {
        navigate('/login', { replace: true })
      } else if (!isTempPassword(user)) {
        // Not a temp-password account: skip to dashboard
        navigate('/dashboard', { replace: true })
      } else {
        setCheckingSession(false)
        setTimeout(() => setMounted(true), 50)
      }
    })
  }, [navigate])

  useEffect(() => {
    if (!checkingSession && newRef.current) newRef.current.focus()
  }, [checkingSession])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { error: pwErr } = await updatePassword(newPassword)
      if (pwErr) {
        setError(pwErr.message || 'Failed to update password.')
        setLoading(false)
        return
      }
      // auth:changePassword already cleared mustChangePassword on the server.
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div style={{
        minHeight: '100vh', background: palette.bgBase,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          border: `1.5px solid ${palette.divider}`,
          borderTop: `1.5px solid ${palette.textMuted}`,
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  const inputStyle = (focused) => ({
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${focused ? palette.accent : palette.fieldLine}`,
    borderRadius: 0,
    padding: '8px 0 10px',
    fontSize: 16,
    fontWeight: 500,
    color: palette.text,
    fontFamily: FONT,
    letterSpacing: '-0.01em',
    outline: 'none',
    transition: 'border-color 220ms ease',
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: palette.bgBase,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      fontFamily: FONT,
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder { color: ${palette.textDim}; font-weight: 400; }
      `}</style>

      <MeshBackground palette={palette} />
      <ASCIIBackground palette={palette} />
      <CenterScrim palette={palette} />
      <CornerMarks color={palette.fieldLine} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 320,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* Wordmark — left-aligned, matching login */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 22, fontWeight: 600,
            color: palette.text,
            letterSpacing: '-0.02em',
          }}>
            Corner<span style={{ color: palette.accent2 }}>.</span>
          </div>
          <div style={{
            marginTop: 6, fontSize: 10, fontWeight: 600,
            color: palette.textMuted,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>
            Choose your password
          </div>
        </div>

        {error && (
          <div style={{
            background: palette.errBg,
            borderLeft: `2px solid ${palette.errFg}`,
            padding: '8px 12px', marginBottom: 18,
            fontSize: 12, color: palette.errFg, fontWeight: 500, lineHeight: 1.4,
            fontFamily: FONT,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block', fontSize: 9, fontWeight: 700,
              color: newFocused ? palette.accent2 : palette.textMuted,
              marginBottom: 8, letterSpacing: '0.14em',
              textTransform: 'uppercase',
              transition: 'color 220ms ease',
              fontFamily: FONT,
            }}>New Password</label>
            <input
              ref={newRef}
              type="password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setError('') }}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              style={inputStyle(newFocused)}
              onFocus={() => setNewFocused(true)}
              onBlur={() => setNewFocused(false)}
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: 'block', fontSize: 9, fontWeight: 700,
              color: confirmFocused ? palette.accent2 : palette.textMuted,
              marginBottom: 8, letterSpacing: '0.14em',
              textTransform: 'uppercase',
              transition: 'color 220ms ease',
              fontFamily: FONT,
            }}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError('') }}
              placeholder="Same password again"
              autoComplete="new-password"
              style={inputStyle(confirmFocused)}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%',
            padding: '13px 16px',
            background: loading
              ? `${palette.accent}33`
              : `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accent2} 100%)`,
            border: 'none',
            borderRadius: 10,
            fontSize: 15, fontWeight: 600,
            color: palette.buttonText,
            fontFamily: FONT,
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
                Updating
              </span>
            ) : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
