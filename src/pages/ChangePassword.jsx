import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, updatePassword } from '../dashboard/lib/auth.js'
import { supabase } from '../dashboard/lib/supabase.js'

// Forced password change for admin-created accounts (temp_password: true).
// After success, clears temp_password flag and redirects to dashboard.

export default function ChangePassword() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    getCurrentUser().then(user => {
      if (!user) {
        navigate('/login', { replace: true })
      } else if (user.user_metadata?.temp_password !== true) {
        // Not a temp-password account -- skip to dashboard
        navigate('/dashboard', { replace: true })
      } else {
        setCheckingSession(false)
      }
    })
  }, [navigate])

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
      // Clear temp_password flag from user_metadata
      if (supabase) {
        await supabase.auth.updateUser({
          data: { temp_password: false }
        })
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
        minHeight: '100vh', background: '#0A0F1A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid #E85D26', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

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

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 420,
        background: 'rgba(15,23,42,0.92)',
        border: '1.5px solid rgba(59,130,246,0.2)',
        borderRadius: 16,
        padding: '40px 36px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#F1F5F9', letterSpacing: '0.01em', marginBottom: 8 }}>
            Corner<span style={{ color: '#E85D26' }}>.</span>
          </div>
          <div style={{ fontSize: 14, color: '#64748B' }}>
            Choose a password to continue
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20,
            fontSize: 13, color: '#F87171', fontWeight: 500, lineHeight: 1.4,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setError('') }}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'rgba(232,93,38,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,38,0.12)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(59,130,246,0.2)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError('') }}
              placeholder="Same password again"
              autoComplete="new-password"
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'rgba(232,93,38,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,38,0.12)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(59,130,246,0.2)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <button type="submit" disabled={loading} style={primaryBtnStyle(loading)}>
            {loading ? 'Updating...' : 'Set Password'}
          </button>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>
    </div>
  )
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#94A3B8', marginBottom: 6,
  letterSpacing: '0.02em', textTransform: 'uppercase',
}

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1.5px solid rgba(59,130,246,0.2)',
  borderRadius: 8, padding: '11px 14px',
  fontSize: 14, fontWeight: 400, color: '#F1F5F9',
  fontFamily: "'Inter', system-ui, sans-serif",
  outline: 'none', transition: 'border-color 150ms ease, box-shadow 150ms ease',
}

const primaryBtnStyle = (loading) => ({
  width: '100%', padding: '12px 20px',
  background: loading ? 'rgba(232,93,38,0.4)' : 'linear-gradient(135deg, #E85D26, #C44B1C)',
  border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 700, color: '#FFFFFF',
  fontFamily: "'Inter', system-ui, sans-serif",
  cursor: loading ? 'not-allowed' : 'pointer',
  letterSpacing: '0.02em', transition: 'all 150ms ease',
  boxShadow: loading ? 'none' : '0 4px 16px rgba(232,93,38,0.3)',
})
