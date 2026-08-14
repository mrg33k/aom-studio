// DashboardWelcome -- R17a. Invite-accepted users land here when they
// have zero projects. Voice-first intake: phone icon primary, microphone
// secondary. The full intake flow (voice recording -> transcript ->
// scaffold) is R17b/c and sits behind R12 + R13 + R22 + R23. This page
// is the skinned surface that route exists before any of that lands.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../dashboard/lib/supabase.js'
import { getClientId } from '../dashboard/lib/clientConfig.js'

const C = {
  bg: '#0A0F1C',
  text: '#E5E7EB',
  muted: '#94A3B8',
  dim: '#64748B',
  accent: '#10B981',
  accentBg: 'rgba(16,185,129,0.12)',
  phone: '#60A5FA',
  phoneBg: 'rgba(96,165,250,0.12)',
  border: 'rgba(255,255,255,0.06)',
}

// R22c welcome state machine.
const WELCOME_STATES = ['intro', 'voice_intake', 'first_agent', 'skills', 'payment', 'done']
const STORAGE_KEY = 'corner:welcome-state'

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw && WELCOME_STATES.includes(raw)) return raw
  } catch (_) { /* best effort */ }
  return 'intro'
}

function saveState(next) {
  try { window.localStorage.setItem(STORAGE_KEY, next) } catch (_) { /* best effort */ }
}

export default function DashboardWelcome() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [hasProjects, setHasProjects] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [welcomeState, setWelcomeState] = useState(() => loadState())
  const advance = (next) => {
    if (!WELCOME_STATES.includes(next)) return
    setWelcomeState(next)
    saveState(next)
    if (next === 'done') navigate('/dashboard', { replace: true })
  }

  // Redirect to /dashboard if the viewer already has projects -- welcome
  // is a one-shot surface, not a route a returning user lands on.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const clientId = getClientId() || 'aom'
      try {
        const { data: userRes } = await supabase.auth.getUser()
        if (cancelled) return
        if (userRes?.user) {
          const name = userRes.user.user_metadata?.full_name
            || userRes.user.email?.split('@')[0]
            || 'there'
          setDisplayName(name)
        }
        const { data } = await supabase
          .from('projects')
          .select('id')
          .eq('client_id', clientId)
          .limit(1)
        if (cancelled) return
        const projectCount = Array.isArray(data) ? data.length : 0
        setHasProjects(projectCount > 0)
        if (projectCount > 0) navigate('/dashboard', { replace: true })
      } catch {
        if (!cancelled) setHasProjects(false)
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => { cancelled = true }
  }, [navigate])

  if (checking || hasProjects === true) {
    // Loading / redirecting -- keep a minimal shell so the route is never
    // blank and the Playwright gate doesn't race on an empty dom.
    return (
      <div
        data-testid="dashboard-welcome"
        data-state="loading"
        style={{
          minHeight: '100vh',
          background: C.bg,
          color: C.muted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Loading…
      </div>
    )
  }

  return (
    <div
      data-testid="dashboard-welcome"
      data-state="ready"
      style={{
        minHeight: '100vh',
        background: `radial-gradient(circle at 50% 30%, rgba(96,165,250,0.08), transparent 60%), ${C.bg}`,
        color: C.text,
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.accent,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Welcome to Corner
        </div>
        <h1
          data-testid="welcome-headline"
          style={{
            fontSize: 'clamp(28px, 5.5vw, 40px)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            margin: '0 0 14px',
          }}
        >
          {displayName ? `Hey ${displayName}, tell us about your work.` : 'Tell us about your work.'}
        </h1>
        <p
          style={{
            fontSize: 15,
            color: C.muted,
            lineHeight: 1.55,
            maxWidth: 440,
            margin: '0 auto 40px',
          }}
        >
          Start with a call. Tell your EA what you're building, who's on the
          team, and what's most urgent. We'll take notes and scaffold your
          first project from the call.
        </p>

        <div
          data-testid="welcome-state"
          data-state={welcomeState}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}
        >
          {/* Phone primary -- R17a. Large, branded, first-class action. */}
          <button
            data-testid="phone-icon-primary"
            title="Start a call with your EA"
            onClick={() => {
              // R17b/c arrive separately. For now this is the entry point
              // the gate can click; downstream wire-up flows into the
              // intake processor once R22/R23 land.
            }}
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: C.phoneBg,
              border: `2px solid ${C.phone}`,
              color: C.phone,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 32px ${C.phoneBg}`,
              transition: 'transform 150ms ease, box-shadow 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = '' }}
          >
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </button>

          {/* Mic secondary -- R17a. Smaller, muted. Dictation fallback. */}
          <button
            data-testid="mic-icon-secondary"
            title="Type instead"
            onClick={() => { /* R17b hook */ }}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${C.border}`,
              color: C.muted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x={9} y={2} width={6} height={12} rx={3} />
              <path d="M5 10a7 7 0 0014 0" />
              <line x1={12} y1={19} x2={12} y2={22} />
            </svg>
          </button>
        </div>

        {/* R22c: skip affordance advances the welcome state machine instead
            of leaving the page. Each state has its own skip path. */}
        <div
          style={{
            marginTop: 36,
            fontSize: 12,
            color: C.dim,
            letterSpacing: '0.02em',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {welcomeState === 'intro' && (
            <button
              data-testid="skip-voice-intake"
              onClick={() => advance('first_agent')}
              style={{
                background: 'none',
                border: 'none',
                color: C.muted,
                cursor: 'pointer',
                fontSize: 12,
                textDecoration: 'underline',
                fontFamily: "'Inter', sans-serif",
              }}
            >
 Skip, I'll type instead
            </button>
          )}
          {welcomeState === 'first_agent' && (
            <button
              data-testid="skip-first-agent"
              onClick={() => advance('skills')}
              style={{
                background: 'none', border: 'none',
                color: C.muted, cursor: 'pointer',
                fontSize: 12, textDecoration: 'underline',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Skip — use the default EA
            </button>
          )}
          {welcomeState === 'skills' && (
            <button
              data-testid="skip-skills"
              onClick={() => advance('payment')}
              style={{
                background: 'none', border: 'none',
                color: C.muted, cursor: 'pointer',
                fontSize: 12, textDecoration: 'underline',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Skip skills setup
            </button>
          )}
          {welcomeState === 'payment' && (
            <button
              data-testid="skip-payment"
              onClick={() => advance('done')}
              style={{
                background: 'none', border: 'none',
                color: C.muted, cursor: 'pointer',
                fontSize: 12, textDecoration: 'underline',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Skip — stay on free tier
            </button>
          )}

          <button
            data-testid="welcome-skip-to-dashboard"
            onClick={() => { saveState('done'); navigate('/dashboard') }}
            style={{
              background: 'none',
              border: 'none',
              color: C.dim,
              cursor: 'pointer',
              fontSize: 11,
              textDecoration: 'underline',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Or just take me to the dashboard
          </button>
        </div>
      </div>
    </div>
  )
}