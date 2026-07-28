import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../dashboard/lib/supabase.js'
import { authFetch } from '../dashboard/lib/authFetch.js'

// Ordered list of integrations the new-user onboarding walks through, one card
// at a time. R1 ships Google (gmail) only; later rounds extend this list.
const ONBOARDING_INTEGRATIONS = [
  {
    slug: 'gmail',
    label: 'Google',
    tagline: 'Read and send email on your behalf.',
    description: 'Connect your Google account so Cleo can draft replies, schedule outreach, and pull context from your inbox.',
    color: '#EA4335',
    initial: 'G',
  },
]

function toSlug(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'my-world'
}

// --- DATA ---

const AGE_RANGES = ['18-25', '26-35', '36-45', '46-55', '55+']

const WHO_OPTIONS = [
  { id: 'owner',      label: 'Business Owner', icon: '🏢' },
  { id: 'employee',   label: 'Employee',        icon: '💼' },
  { id: 'freelancer', label: 'Freelancer',      icon: '🧩' },
  { id: 'student',    label: 'Student',         icon: '🎓' },
  { id: 'other',      label: 'Other',           icon: '○' },
]

// --- COMPONENTS ---

function StepDots({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6,
          height: 6,
          borderRadius: 3,
          background: i === current
            ? '#E85D26'
            : i < current
              ? 'rgba(232,93,38,0.4)'
              : 'rgba(255,255,255,0.12)',
          transition: 'all 300ms ease',
        }} />
      ))}
    </div>
  )
}

function FlatTile({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: selected ? 'rgba(232,93,38,0.1)' : 'rgba(255,255,255,0.03)',
        border: `2px solid ${selected ? '#E85D26' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10,
        padding: '10px 4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 140ms ease',
        minHeight: 44,
        position: 'relative',
      }}
    >
      <span style={{
        fontSize: 12,
        fontWeight: 700,
        color: selected ? '#F1F5F9' : '#94A3B8',
        fontFamily: "'Inter', system-ui, sans-serif",
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      {selected && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          width: 10, height: 10,
          background: '#E85D26', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 6, color: '#fff', fontWeight: 900,
        }}>
          ✓
        </div>
      )}
    </button>
  )
}

function IconTile({ icon, label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: selected ? 'rgba(232,93,38,0.1)' : 'rgba(255,255,255,0.03)',
        border: `2px solid ${selected ? '#E85D26' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10,
        padding: '14px 6px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        transition: 'all 140ms ease',
        minHeight: 78,
        position: 'relative',
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: selected ? '#F1F5F9' : '#94A3B8',
        textAlign: 'center',
        lineHeight: 1.2,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {label}
      </span>
      {selected && (
        <div style={{
          position: 'absolute', top: 5, right: 5,
          width: 12, height: 12,
          background: '#E85D26', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 7, color: '#fff', fontWeight: 900,
        }}>
          ✓
        </div>
      )}
    </button>
  )
}

// Loading spinner
function Spinner() {
  return (
    <div style={{
      width: 40, height: 40,
      border: '3px solid rgba(232,93,38,0.2)',
      borderTop: '3px solid #E85D26',
      borderRadius: '50%',
      animation: 'spinnerSpin 0.8s linear infinite',
      margin: '0 auto',
    }}>
      <style>{`@keyframes spinnerSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// Agent card for Meet Your Team screen
function AgentCard({ agent, index }) {
  const delay = index * 120
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '18px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      animation: `fadeSlideUp 400ms ease ${delay}ms both`,
    }}>
      <style>{`@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${agent.color}22`,
        border: `2px solid ${agent.color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 900, color: agent.color,
        flexShrink: 0,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {agent.name[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', marginBottom: 2 }}>
          {agent.name}
        </div>
        <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.3 }}>
          {agent.role}
        </div>
      </div>
      <div style={{
        fontSize: 10, fontWeight: 600, color: '#475569',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        padding: '4px 8px', borderRadius: 6,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        whiteSpace: 'nowrap',
      }}>
        Ready
      </div>
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const TOTAL_STEPS = 5  // 0: who, 1: architect, 2: creating, 3: meet team, 4: connect integrations

  // Step 0 state
  const [ageRange, setAgeRange] = useState(null)
  const [whoType, setWhoType]   = useState(null)

  // Step 1: Architect-form fields. Replaces the deleted ArchitectChat stub
  // (commit 59acef8, 2026-04-16). Non-LLM — we build `architectPlan` directly
  // from the form values, so onboarding works when Anthropic credits are out
  // or the architect agent isn't wired. Step 2 still calls create-agents,
  // but the architect-LLM-in-the-loop path is no longer required to advance.
  const [userName, setUserName] = useState('')
  const [userBusiness, setUserBusiness] = useState('')
  const [userFocus, setUserFocus] = useState('')
  const [architectPlan, setArchitectPlan] = useState(null)

  // Step 2: Created agents (set after create-agents API completes)
  const [createdAgents, setCreatedAgents] = useState([])
  const [creatingError, setCreatingError] = useState('')

  // Step 4: Integration walkthrough (one card at a time, starting with Google)
  const [integrationIdx, setIntegrationIdx] = useState(0)
  const [connectedSlugs, setConnectedSlugs] = useState({}) // slug -> true
  const [integrationError, setIntegrationError] = useState('')

  // UI state
  const [step, setStep]         = useState(0)
  const [animating, setAnimating] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError]       = useState('')

  const isQaMode = sessionStorage.getItem('corner-qa-active') === 'true'

  // On mount: check if user already has a world
  useEffect(() => {
    async function checkExistingWorld() {
      if (!supabase) return
      if (isQaMode) return
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const meta = user?.user_metadata || {}
        if (meta.world && meta.world.trim()) {
          localStorage.setItem('corner-onboarded', 'true')
          navigate('/dashboard', { replace: true })
          return
        }
        const { data } = await supabase.from('agent_status').select('id, client_id').limit(1)
        if (data && data.length > 0) {
          await supabase.auth.updateUser({
            data: { onboarded: true, has_completed_onboarding: true, world: data[0].client_id }
          }).catch(() => {})
          localStorage.setItem('corner-onboarded', 'true')
          navigate('/dashboard', { replace: true })
        }
      } catch {
        // proceed normally
      }
    }
    checkExistingWorld()
  }, [navigate, isQaMode])

  // Step 2: Auto-run agent creation when we arrive
  useEffect(() => {
    if (step !== 2 || !architectPlan) return
    runCreateAgents()
  }, [step, architectPlan])

  // On mount: hydrate step 4 if the user is returning from an OAuth callback.
  // The callback redirects back to /onboarding?step=4&integrations=connected&slug=<x>
  // (or integrations=error&reason=<x> on failure). Strip the params after reading
  // so a refresh doesn't re-trigger this branch.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const intStep = params.get('step')
    const intStatus = params.get('integrations')
    if (intStep !== '4' || !intStatus) return

    setStep(4)
    if (intStatus === 'connected') {
      const slug = params.get('slug')
      if (slug) {
        setConnectedSlugs(prev => ({ ...prev, [slug]: true }))
        const idx = ONBOARDING_INTEGRATIONS.findIndex(i => i.slug === slug)
        if (idx >= 0) setIntegrationIdx(idx)
      }
      setIntegrationError('')
    } else if (intStatus === 'error') {
      const reason = params.get('reason') || 'unknown'
      setIntegrationError(`Could not connect — ${reason}`)
    }

    // Clean the URL so we don't re-process on refresh
    const clean = window.location.pathname
    window.history.replaceState(null, '', clean)
  }, [])

  async function runCreateAgents() {
    setCreatingError('')
    try {
      // Get client ID from Supabase auth
      let clientId = null
      try {
        const { data: { user } } = await supabase.auth.getUser()
        clientId = user?.id || null
      } catch {}

      const worldSlug = toSlug(
        architectPlan.user_profile?.business ||
        architectPlan.user_profile?.name ||
        'my-world'
      )
      if (!clientId) clientId = isQaMode ? `qa-${worldSlug}` : worldSlug

      // r7:open-agent-surface — /api/onboarding/create-agents requires a
      // verified session now (it writes agent rows and queues a Mac-side plan).
      // The user is already signed in at this point — getUser() above depends
      // on it — so authFetch just carries the token that was always there.
      const res = await authFetch('/api/onboarding/create-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, plan: architectPlan }),
      })

      const data = await res.json()

      if (!res.ok) {
        setCreatingError(data.error || 'Failed to create your team. Please try again.')
        return
      }

      // Update Supabase user metadata
      if (supabase && !isQaMode) {
        await supabase.auth.updateUser({
          data: {
            world: clientId,
            has_completed_onboarding: true,
            onboarded: true,
            who_type: whoType,
            age_range: ageRange,
          }
        }).catch(() => {})
      }

      setCreatedAgents(data.agents || [])

      // Auto-advance to Meet Your Team after a brief moment
      setTimeout(() => {
        setAnimating(true)
        setTimeout(() => { setStep(3); setAnimating(false) }, 210)
      }, 600)

    } catch (err) {
      setCreatingError('Connection issue. Please try again.')
    }
  }

  function canAdvance() {
    if (step === 0) return ageRange && whoType
    if (step === 1) return userName.trim().length > 0 && userBusiness.trim().length > 0
    return false
  }

  function goNext() {
    if (animating || !canAdvance()) return
    if (step === 1 && !architectPlan) {
      // Materialize a minimal architectPlan from the form so step 2 has what
      // it needs. Agents/projects can stay empty — create-agents seeds defaults.
      setArchitectPlan({
        user_profile: {
          name: userName.trim(),
          business: userBusiness.trim(),
          focus: userFocus.trim() || null,
          age_range: ageRange,
          who_type: whoType,
        },
        agents: [],
        projects: [],
      })
    }
    setAnimating(true)
    setTimeout(() => { setStep(s => s + 1); setAnimating(false) }, 210)
  }

  function goBack() {
    if (animating || step === 0) return
    // Don't allow back from step 2 (creating) or step 3
    if (step >= 2) return
    setAnimating(true)
    setTimeout(() => { setStep(s => s - 1); setAnimating(false) }, 210)
  }

  // Step 3 ("Meet your team") → advance to step 4 (Connect integrations).
  function advanceToIntegrations() {
    if (animating) return
    setAnimating(true)
    setTimeout(() => { setStep(4); setAnimating(false) }, 210)
  }

  // Connect the current integration card via OAuth. We hand off to
  // /api/integrations/oauth/start with return_to set to /onboarding?step=4
  // so the callback brings the user back here instead of /dashboard.
  function connectCurrent() {
    const current = ONBOARDING_INTEGRATIONS[integrationIdx]
    if (!current) return
    setIntegrationError('')
    const returnTo = '/onboarding?step=4'
    const url = `/api/integrations/oauth/start?slug=${encodeURIComponent(current.slug)}&return_to=${encodeURIComponent(returnTo)}`
    window.location.href = url
  }

  function skipCurrent() {
    if (animating) return
    setIntegrationError('')
    advanceFromCurrentIntegration()
  }

  function advanceFromCurrentIntegration() {
    if (integrationIdx < ONBOARDING_INTEGRATIONS.length - 1) {
      setIntegrationIdx(idx => idx + 1)
    } else {
      // Last integration — finish onboarding
      finishOnboarding()
    }
  }

  async function finishOnboarding() {
    if (finishing) return
    setFinishing(true)
    setError('')

    // AOM guard
    let currentWorld = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      currentWorld = user?.user_metadata?.world
    } catch {}
    if (currentWorld === 'aom' && !isQaMode) {
      setError('AOM world is protected. Use QA mode to test onboarding.')
      setFinishing(false)
      return
    }

    try {
      localStorage.setItem('corner-onboarded', 'true')
      if (isQaMode) sessionStorage.setItem('corner-qa-completed', 'true')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setFinishing(false)
    }
  }

  const step4current = ONBOARDING_INTEGRATIONS[integrationIdx]
  const step4isConnected = step4current ? !!connectedSlugs[step4current.slug] : false
  const step4total = ONBOARDING_INTEGRATIONS.length
  const step4nextLabel = integrationIdx < step4total - 1 ? 'Next' : (finishing ? 'Entering...' : 'Enter your Corner')
  const step4skipLabel = step4isConnected ? null : 'Skip for now'
  const step4displayError = integrationError || error
  const step4cursorStyle = finishing ? 'not-allowed' : 'pointer'
  const step4advBtnStyle = step4isConnected
    ? (finishing ? disabledBtn : {
        ...primaryBtn,
        fontSize: 14,
        padding: '12px 28px',
        boxShadow: '0 8px 32px rgba(232,93,38,0.4)',
      })
    : {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: 600,
        cursor: step4cursorStyle,
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: '12px 24px',
      }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #060A14 0%, #0A0F1E 50%, #080C16 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: step === 1 ? 'flex-start' : 'center',
      padding: step === 1 ? '100px 16px 40px' : '80px 16px 40px',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* QA Mode banner */}
      {isQaMode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'rgba(59,130,246,0.12)',
          borderBottom: '1px solid rgba(59,130,246,0.2)',
          backdropFilter: 'blur(12px)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#60A5FA' }}>
            QA Testing Mode
          </span>
          <button
            onClick={() => {
              sessionStorage.removeItem('corner-qa-active')
              sessionStorage.removeItem('corner-qa-completed')
              window.location.href = '/dashboard'
            }}
            style={{
              padding: '6px 14px', borderRadius: 8,
              background: 'rgba(59,130,246,0.2)',
              border: '1px solid rgba(59,130,246,0.3)',
              color: '#93C5FD', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >
            Return to AOM
          </button>
        </div>
      )}

      {/* Background hex grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='104'%3E%3Cpath d='M60 2 L118 32 L118 72 L60 102 L2 72 L2 32 Z' fill='none' stroke='rgba(59,130,246,0.06)' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }} />

      {/* Orange ambient glow */}
      <div style={{
        position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(232,93,38,0.06) 0%, transparent 65%)',
      }} />

      {/* Corner wordmark */}
      <div style={{
        position: 'absolute', top: 28, left: 28,
        fontSize: 18, fontWeight: 900, color: '#F1F5F9', letterSpacing: '0.01em', zIndex: 10,
      }}>
        Corner<span style={{ color: '#E85D26' }}>.</span>
      </div>

      {/* Back button (step 0-1 only) */}
      {step === 1 && (
        <button onClick={goBack} style={{
          position: 'absolute', top: 26, left: 112, zIndex: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: '#475569',
          fontFamily: "'Inter', system-ui, sans-serif",
          padding: '4px 8px',
        }}>
          back
        </button>
      )}

      {/* Step dots (steps 0-1 only) */}
      {step < 2 && (
        <div style={{ position: 'absolute', top: 32, right: 28, zIndex: 10 }}>
          <StepDots current={step} total={2} />
        </div>
      )}

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%',
        maxWidth: step === 1 ? 620 : 500,
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 210ms ease, transform 210ms ease',
      }}>

        {/* ---- STEP 0: STAGE SELECTOR ---- */}
        {step === 0 && (
          <div>
            <div style={stepLabel}>Step 1 of 2</div>
            <h2 style={heading}>Who are you?</h2>
            <p style={sub}>No typing -- just tap to select.</p>

            <div style={sectionHead}>Age range</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {AGE_RANGES.map(age => (
                <FlatTile
                  key={age}
                  label={age}
                  selected={ageRange === age}
                  onClick={() => setAgeRange(age)}
                />
              ))}
            </div>

            <div style={sectionHead}>I am a</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 36 }}>
              {WHO_OPTIONS.map(opt => (
                <IconTile
                  key={opt.id}
                  icon={opt.icon}
                  label={opt.label}
                  selected={whoType === opt.id}
                  onClick={() => setWhoType(opt.id)}
                />
              ))}
            </div>

            <button
              onClick={goNext}
              disabled={!canAdvance()}
              style={canAdvance() ? primaryBtn : disabledBtn}
            >
              Next
            </button>
          </div>
        )}

        {/* ---- STEP 1: ARCHITECT FORM (non-LLM) ---- */}
        {step === 1 && (
          <div>
            <div style={stepLabel}>Step 2 of 2</div>
            <h2 style={heading}>Tell us about you.</h2>
            <p style={sub}>Two lines and we'll set up your team.</p>

            <div style={sectionHead}>Your name</div>
            <input
              type="text"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              placeholder="First name"
              autoFocus
              style={textInput}
            />

            <div style={{ ...sectionHead, marginTop: 18 }}>What you do</div>
            <input
              type="text"
              value={userBusiness}
              onChange={e => setUserBusiness(e.target.value)}
              placeholder="Business or role (e.g. boutique law firm)"
              style={textInput}
            />

            <div style={{ ...sectionHead, marginTop: 18 }}>One thing you're focused on (optional)</div>
            <input
              type="text"
              value={userFocus}
              onChange={e => setUserFocus(e.target.value)}
              placeholder="e.g. growing inbound leads"
              style={textInput}
            />

            <div style={{ marginTop: 28 }}>
              <button
                onClick={goNext}
                disabled={!canAdvance()}
                style={canAdvance() ? primaryBtn : disabledBtn}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP 2: CREATING TEAM ---- */}
        {step === 2 && (
          <div style={{ textAlign: 'center' }}>
            <Spinner />
            <h2 style={{ ...heading, marginTop: 28, fontSize: 'clamp(24px, 4vw, 36px)' }}>
              Building your workspace...
            </h2>
            <p style={{ ...sub, marginTop: 8 }}>
              {architectPlan?.user_profile?.name
                ? `Creating agents for ${architectPlan.user_profile.name}'s team.`
                : 'Creating your agents and setting up your workspace.'
              }
            </p>

            {/* Agent preview pills */}
            {architectPlan?.agents && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
                {architectPlan.agents.slice(0, 5).map(agent => (
                  <div key={agent.slug} style={{
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20,
                    fontSize: 12, color: '#64748B',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}>
                    {agent.name}
                  </div>
                ))}
              </div>
            )}

            {creatingError && (
              <div style={{
                marginTop: 24,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8, padding: '10px 14px',
                fontSize: 13, color: '#F87171',
              }}>
                {creatingError}
                <button
                  onClick={runCreateAgents}
                  style={{
                    display: 'block', margin: '10px auto 0',
                    padding: '8px 18px',
                    background: 'rgba(232,93,38,0.2)',
                    border: '1px solid rgba(232,93,38,0.4)',
                    borderRadius: 8, fontSize: 13, color: '#E85D26',
                    cursor: 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---- STEP 3: MEET YOUR TEAM ---- */}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(232,93,38,0.12)',
              border: '2px solid rgba(232,93,38,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 24,
            }}>
              ◈
            </div>

            <h2 style={{
              fontSize: 'clamp(26px, 5vw, 40px)',
              fontWeight: 900, color: '#F1F5F9',
              letterSpacing: '-0.02em', margin: '0 0 8px',
            }}>
              Meet your team.
            </h2>

            <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 28px', lineHeight: 1.6 }}>
              {architectPlan?.user_profile?.name
                ? `${architectPlan.user_profile.name}'s Corner is ready.`
                : 'Your Corner is ready.'
              }
            </p>

            {/* Agent cards */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 10,
              marginBottom: 32, textAlign: 'left',
            }}>
              {createdAgents.map((agent, i) => (
                <AgentCard key={agent.slug || i} agent={agent} index={i} />
              ))}
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8, padding: '10px 14px',
                marginBottom: 20, fontSize: 13, color: '#F87171',
              }}>
                {error}
              </div>
            )}

            <button
              onClick={advanceToIntegrations}
              disabled={animating}
              style={animating ? disabledBtn : {
                ...primaryBtn,
                fontSize: 15,
                padding: '14px 36px',
                boxShadow: '0 8px 32px rgba(232,93,38,0.4)',
              }}
            >
              Continue
            </button>
          </div>
        )}

        {/* ---- STEP 4: CONNECT INTEGRATIONS (one card at a time) ---- */}
        {step === 4 && (() => {
          if (!step4current) return null
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={stepLabel}>
                Connect {integrationIdx + 1} of {step4total}
              </div>
              <h2 style={heading}>Connect {step4current.label}.</h2>
              <p style={sub}>{step4current.description}</p>

              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '28px 24px',
                marginBottom: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: `${step4current.color}22`,
                  border: `2px solid ${step4current.color}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 900, color: step4current.color,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  {step4current.initial}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>
                    {step4current.label}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.4 }}>
                    {step4current.tagline}
                  </div>
                </div>
                {step4isConnected ? (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', borderRadius: 999,
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.35)',
                    fontSize: 13, fontWeight: 600, color: '#4ADE80',
                  }}>
                    <span>✓</span> Connected
                  </div>
                ) : (
                  <button
                    onClick={connectCurrent}
                    style={{ ...primaryBtn, padding: '12px 32px', fontSize: 14 }}
                  >
                    Connect {step4current.label}
                  </button>
                )}
              </div>

              {step4displayError && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 8, padding: '10px 14px',
                  marginBottom: 16, fontSize: 13, color: '#F87171',
                }}>
                  {step4displayError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
                <button
                  onClick={skipCurrent}
                  disabled={finishing}
                  style={{
                    background: 'none', border: 'none',
                    color: '#64748B', fontSize: 13, fontWeight: 600,
                    cursor: step4cursorStyle,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    padding: '10px 16px',
                  }}
                >
                  {step4skipLabel}
                </button>

                <button
                  onClick={advanceFromCurrentIntegration}
                  disabled={finishing}
                  style={step4advBtnStyle}
                >
                  {step4nextLabel}
                </button>
              </div>
            </div>
          )
        })()}

      </div>

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  )
}

// ---- Styles ----

const stepLabel = {
  fontSize: 11,
  fontWeight: 600,
  color: '#E85D26',
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  marginBottom: 12,
}

const heading = {
  fontSize: 'clamp(26px, 4vw, 40px)',
  fontWeight: 900,
  color: '#F1F5F9',
  letterSpacing: '-0.02em',
  margin: '0 0 8px',
  lineHeight: 1.1,
}

const sub = {
  fontSize: 14,
  color: '#64748B',
  margin: '0 0 24px',
  lineHeight: 1.5,
}

const sectionHead = {
  fontSize: 10,
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 10,
  fontFamily: "'Inter', system-ui, sans-serif",
}

const primaryBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 28px',
  background: 'linear-gradient(135deg, #E85D26, #C44B1C)',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  color: '#FFFFFF',
  fontFamily: "'Inter', system-ui, sans-serif",
  cursor: 'pointer',
  letterSpacing: '0.02em',
  boxShadow: '0 4px 16px rgba(232,93,38,0.35)',
  transition: 'all 150ms ease',
}

const disabledBtn = {
  ...primaryBtn,
  background: 'rgba(232,93,38,0.25)',
  boxShadow: 'none',
  cursor: 'not-allowed',
  color: 'rgba(255,255,255,0.4)',
}

const textInput = {
  width: '100%',
  padding: '12px 14px',
  fontSize: 15,
  fontFamily: "'Inter', system-ui, sans-serif",
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#F1F5F9',
  outline: 'none',
  boxSizing: 'border-box',
}
