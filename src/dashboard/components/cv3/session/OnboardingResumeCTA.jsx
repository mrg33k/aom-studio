// R75-d2: "Continue onboarding" CTA — appears in chat headers when
// has_completed_onboarding=false and a mid-flow checkpoint exists in localStorage.
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase.js'

export default function OnboardingResumeCTA() {
  const navigate = useNavigate()
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Sync gate: only proceed if there is a saved checkpoint and voice
    // onboarding hasn't been marked complete locally.
    if (!localStorage.getItem('ob-resume-state')) return
    if (localStorage.getItem('corner-onboarded') === 'true') return
    if (!supabase) return

    supabase.auth.getUser().then(({ data: { user } }) => {
      const meta = user?.user_metadata || {}
      if (meta.has_completed_onboarding !== true) setShow(true)
    }).catch(() => {})
  }, [])

  if (!show) return null

  return (
    <button
      data-testid="ob-resume-cta"
      title="Resume your onboarding flow"
      onClick={() => navigate('/onboarding/voice', { state: { resume: true } })}
      style={{
        height: 26,
        padding: '0 10px',
        borderRadius: 14,
        flexShrink: 0,
        background: 'rgba(110, 231, 183, 0.12)',
        border: '1px solid rgba(110, 231, 183, 0.35)',
        color: '#6EE7B7',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#6EE7B7',
          boxShadow: '0 0 6px #6EE7B7',
          flexShrink: 0,
        }}
      />
      Continue onboarding
    </button>
  )
}
