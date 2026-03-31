import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../dashboard/lib/supabase.js'
import ArchitectChat from '../dashboard/ArchitectChat.jsx'

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

// --- MAIN ---

export default function Onboarding() {
  const navigate = useNavigate()
  const TOTAL_STEPS = 4  // 0: who are you, 1: architect chat, 2: creating team, 3: meet your team

  // Step 0 state
  const [ageRange, setAgeRange] = useState(null)
  const [whoType, setWhoType]   = useState(null)

  // Step 1: Architect plan (set when user approves)
  const [architectPlan, setArchitectPlan] = useState(null)

  // Step 2: Created agents (set after create-agents API completes)
  const [createdAgents, setCreatedAgents] = useState([])
  const [creatingError, setCreatingError] = useState('')

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

      const res = await fetch('/api/onboarding/create-agents', {
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
    return false
  }

  function goNext() {
    if (animating || !canAdvance()) return
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

  function handlePlanApproved(plan) {
    setArchitectPlan(plan)
    setAnimating(true)
    setTimeout(() => { setStep(2); setAnimating(false) }, 210)
  }

  async function handleLaunch() {
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

        {/* ---- STEP 1: ARCHITECT CONVERSATION ---- */}
        {step === 1 && (
          <div>
            <div style={{ ...stepLabel, textAlign: 'center', marginBottom: 4 }}>Step 2 of 2</div>
            <h2 style={{ ...heading, textAlign: 'center', marginBottom: 6 }}>Meet your Architect.</h2>
            <p style={{ ...sub, textAlign: 'center', marginBottom: 24 }}>
              They'll learn about you and build the right team.
            </p>
            <ArchitectChat
              stageContext={{ whoType, ageRange }}
              onPlanApproved={handlePlanApproved}
            />
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
              onClick={handleLaunch}
              disabled={finishing}
              style={finishing ? disabledBtn : {
                ...primaryBtn,
                fontSize: 15,
                padding: '14px 36px',
                boxShadow: '0 8px 32px rgba(232,93,38,0.4)',
              }}
            >
              {finishing ? 'Entering...' : 'Enter your Corner'}
            </button>
          </div>
        )}

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
