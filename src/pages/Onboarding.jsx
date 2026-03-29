import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../dashboard/lib/supabase.js'

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

const INDUSTRIES = [
  { id: 'construction', label: 'Construction', icon: '🏗️' },
  { id: 'real-estate',  label: 'Real Estate',  icon: '🏠' },
  { id: 'marketing',    label: 'Marketing',    icon: '📣' },
  { id: 'tech',         label: 'Tech',         icon: '⚡' },
  { id: 'healthcare',   label: 'Healthcare',   icon: '❤️' },
  { id: 'legal',        label: 'Legal',        icon: '⚖️' },
  { id: 'finance',      label: 'Finance',      icon: '📊' },
  { id: 'restaurant',   label: 'Restaurant',   icon: '🍽️' },
  { id: 'retail',       label: 'Retail',       icon: '🛍️' },
  { id: 'other',        label: 'Other',        icon: '✦' },
]

const TEAM_SIZES = [
  { id: 'solo',  label: 'Just me' },
  { id: 's',     label: '2-5'     },
  { id: 'm',     label: '6-15'    },
  { id: 'l',     label: '16-50'   },
  { id: 'xl',    label: '50+'     },
]

const ROLE_TEMPLATES = [
  { slug: 'system-manager',  name: 'System Manager',  role: 'Infrastructure',     icon: '⚙️', color: '#60A5FA', defaultName: 'Alex'    },
  { slug: 'builder',         name: 'Builder',          role: 'Web Dev / Build',    icon: '🔨', color: '#34D399', defaultName: 'Bobby'   },
  { slug: 'content-creator', name: 'Content Creator',  role: 'Content Production', icon: '🎬', color: '#A78BFA', defaultName: 'Cleo'    },
  { slug: 'designer',        name: 'Designer',         role: 'Brand / Design',     icon: '✏️', color: '#F472B6', defaultName: 'Steffen' },
  { slug: 'strategist',      name: 'Strategist',       role: 'Strategy / Biz Dev', icon: '🎯', color: '#FBBF24', defaultName: 'Max'     },
  { slug: 'sales',           name: 'Sales',            role: 'Sales / Growth',     icon: '💰', color: '#38BDF8', defaultName: 'Jordan'  },
  { slug: 'outreach',        name: 'Outreach',         role: 'Outreach',           icon: '📧', color: '#FB923C', defaultName: 'Jacob'   },
  { slug: 'social-media',    name: 'Social Media',     role: 'Social Media',       icon: '📱', color: '#4ADE80', defaultName: 'Nova'    },
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

// Compact horizontal tile (age, team size)
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

// Icon tile for "I am a" row
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

// Industry grid tile
function IndustryTile({ item, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? 'rgba(232,93,38,0.1)' : 'rgba(255,255,255,0.03)',
        border: `2px solid ${selected ? '#E85D26' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10,
        padding: '12px 4px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        transition: 'all 140ms ease',
        position: 'relative',
        minHeight: 72,
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        color: selected ? '#F1F5F9' : '#94A3B8',
        textAlign: 'center',
        lineHeight: 1.2,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {item.label}
      </span>
      {selected && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          width: 11, height: 11,
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

// Role card with color theming
function RoleCard({ role, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? `${role.color}14` : 'rgba(255,255,255,0.03)',
        border: `2px solid ${selected ? role.color : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 12,
        padding: '16px 8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        transition: 'all 140ms ease',
        minHeight: 102,
        position: 'relative',
      }}
    >
      <span style={{ fontSize: 24, lineHeight: 1 }}>{role.icon}</span>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: selected ? '#F1F5F9' : '#94A3B8',
        textAlign: 'center',
        lineHeight: 1.2,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {role.name}
      </div>
      <div style={{
        fontSize: 9,
        color: selected ? role.color : '#475569',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontFamily: "'Inter', system-ui, sans-serif",
        textAlign: 'center',
        lineHeight: 1.2,
      }}>
        {role.role}
      </div>
      {selected && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          width: 14, height: 14,
          background: role.color, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, color: '#fff', fontWeight: 900,
        }}>
          ✓
        </div>
      )}
    </button>
  )
}

// --- MAIN ---

export default function Onboarding() {
  const navigate = useNavigate()
  const TOTAL_STEPS = 5  // steps 0-3 + launch (4)

  // Step 0: Who are you
  const [ageRange, setAgeRange] = useState(null)
  const [whoType, setWhoType]   = useState(null)

  // Step 1: Your world
  const [industry, setIndustry] = useState(null)
  const [teamSize, setTeamSize] = useState(null)

  // Step 2: First agent
  const [selectedRole, setSelectedRole] = useState(null)
  const [agentName, setAgentName]       = useState('')

  // Step 3: Context (first text inputs)
  const [worldName, setWorldName]               = useState('')
  const [businessContext, setBusinessContext]   = useState('')
  const [priorities, setPriorities]             = useState(['', '', ''])

  // UI
  const [step, setStep]         = useState(0)
  const [animating, setAnimating] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError]       = useState('')

  const worldInputRef = useRef(null)

  // On mount: check if user already has a world. If so, skip onboarding entirely.
  // Exception: QA mode forces onboarding even for existing users -- don't auto-redirect.
  useEffect(() => {
    async function checkExistingWorld() {
      if (!supabase) return
      // In QA mode, we want to show onboarding regardless of existing world
      if (sessionStorage.getItem('corner-qa-active') === 'true') return
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const meta = user?.user_metadata || {}
        // If metadata already has a world slug, they were onboarded before
        if (meta.world && meta.world.trim()) {
          localStorage.setItem('corner-onboarded', 'true')
          navigate('/dashboard', { replace: true })
          return
        }
        // Check if they have any agents in the DB (metadata write might have failed)
        const { data } = await supabase.from('agent_status').select('id, client_id').limit(1)
        if (data && data.length > 0) {
          // Self-heal metadata
          await supabase.auth.updateUser({
            data: { onboarded: true, has_completed_onboarding: true, world: data[0].client_id }
          }).catch(() => {})
          localStorage.setItem('corner-onboarded', 'true')
          navigate('/dashboard', { replace: true })
        }
      } catch {
        // Can't check, proceed with onboarding normally
      }
    }
    checkExistingWorld()
  }, [navigate])

  useEffect(() => {
    if (step === 3) {
      const t = setTimeout(() => worldInputRef.current?.focus(), 320)
      return () => clearTimeout(t)
    }
  }, [step])

  function canAdvance() {
    if (step === 0) return ageRange && whoType
    if (step === 1) return industry && teamSize
    if (step === 2) return selectedRole && agentName.trim()
    if (step === 3) return worldName.trim()
    return false
  }

  function goNext() {
    if (animating || !canAdvance()) return
    setAnimating(true)
    setTimeout(() => { setStep(s => s + 1); setAnimating(false) }, 210)
  }

  function goBack() {
    if (animating || step === 0) return
    setAnimating(true)
    setTimeout(() => { setStep(s => s - 1); setAnimating(false) }, 210)
  }

  function handleRoleSelect(r) {
    setSelectedRole(r)
    // Auto-fill name if empty or was a default from another role
    const wasDefault = ROLE_TEMPLATES.some(rt => rt.defaultName === agentName)
    if (!agentName.trim() || wasDefault) {
      setAgentName(r.defaultName)
    }
  }

  const isQaMode = sessionStorage.getItem('corner-qa-active') === 'true'

  async function handleLaunch() {
    if (finishing) return
    setFinishing(true)
    setError('')

    const worldSlug  = toSlug(worldName) || 'my-world'

    // AOM GUARD: NEVER overwrite AOM world. If current user is AOM, force QA mode.
    let currentWorld = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      currentWorld = user?.user_metadata?.world
    } catch {}
    if (currentWorld === 'aom' && !isQaMode) {
      // AOM user hit onboarding without QA mode -- this would overwrite their world. Block it.
      setError('AOM world is protected. Use QA mode from the world switcher to test onboarding.')
      setFinishing(false)
      return
    }
    const agentSlug  = toSlug(agentName) || 'my-agent'
    const roleChoice = selectedRole || ROLE_TEMPLATES[0]

    try {
      if (supabase) {
        // QA Mode: skip the "already has world" check -- always create fresh
        if (!isQaMode) {
          // Check if this user already has a world (prevents duplicate creation)
          const { data: existing } = await supabase
            .from('agent_status')
            .select('id, client_id')
            .limit(1)

          if (existing && existing.length > 0) {
            // User already has a world. Update metadata and go to dashboard.
            await supabase.auth.updateUser({
              data: { onboarded: true, has_completed_onboarding: true, world: existing[0].client_id }
            }).catch(() => {})
            localStorage.setItem('corner-onboarded', 'true')
            navigate('/dashboard', { replace: true })
            return
        }
        } // end if (!isQaMode)

        // QA Mode: write to QA world, do NOT touch user metadata
        // Normal Mode: write to new world + update user metadata
        const targetClientId = isQaMode ? `qa-${worldSlug}` : worldSlug

        if (!isQaMode) {
          const { error: metaErr } = await supabase.auth.updateUser({
            data: {
              world:                    worldSlug,
              has_completed_onboarding: true,
              onboarded:                true,
              age_range:                ageRange,
              who_type:                 whoType,
              industry:                 industry,
              team_size:                teamSize,
              business_context:         businessContext.trim(),
              priorities:               priorities.filter(p => p.trim()),
            },
          })
          if (metaErr) console.error('[Onboarding] metadata error:', metaErr)
        }

        // Write agent to Supabase (QA uses qa- prefix, normal uses world slug)
        await supabase.from('agent_status').insert([{
          slug:      agentSlug,
          name:      agentName.trim() || agentSlug,
          role:      roleChoice.role,
          status:    'idle',
          client_id: targetClientId,
          color:     roleChoice.color,
          type:      'agent',
        }]).catch(e => console.error('[Onboarding] agent_status error:', e))

      } else {
        localStorage.setItem('corner-onboarded', 'true')
        localStorage.setItem('corner-world', worldSlug)
        localStorage.setItem('corner-agent-name', agentName.trim())
      }

      localStorage.setItem('corner-onboarded', 'true')
      // QA Mode: mark this round as completed so AuthGuard lets us through to dashboard
      if (isQaMode) {
        sessionStorage.setItem('corner-qa-completed', 'true')
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('[Onboarding] error:', err)
      setError('Something went wrong. Please try again.')
      setFinishing(false)
    }
  }

  const worldSlug = toSlug(worldName)

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1.5px solid rgba(59,130,246,0.2)',
    borderRadius: 10,
    padding: '14px 16px',
    fontSize: 16,
    fontWeight: 500,
    color: '#F1F5F9',
    fontFamily: "'Inter', system-ui, sans-serif",
    outline: 'none',
    display: 'block',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  }

  const onFocusInput = e => {
    e.target.style.borderColor = 'rgba(59,130,246,0.5)'
    e.target.style.boxShadow   = '0 0 0 3px rgba(59,130,246,0.08)'
  }
  const onBlurInput = e => {
    e.target.style.borderColor = 'rgba(59,130,246,0.2)'
    e.target.style.boxShadow   = 'none'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #060A14 0%, #0A0F1E 50%, #080C16 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 16px 40px',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* QA Mode: Return to AOM bar */}
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
              sessionStorage.removeItem('corner-world-override')
              try { sessionStorage.removeItem('corner-world-override') } catch {}
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

      {/* Back button */}
      {step > 0 && step < TOTAL_STEPS - 1 && (
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

      {/* Step dots */}
      {step < TOTAL_STEPS - 1 && (
        <div style={{ position: 'absolute', top: 32, right: 28, zIndex: 10 }}>
          <StepDots current={step} total={TOTAL_STEPS - 1} />
        </div>
      )}

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%',
        maxWidth: (step === 2 || step === 1) ? 640 : 500,
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 210ms ease, transform 210ms ease',
      }}>

        {/* ---- STEP 0: WHO ARE YOU ---- */}
        {step === 0 && (
          <div>
            <div style={stepLabel}>Step 1 of 4</div>
            <h2 style={heading}>Who are you?</h2>
            <p style={sub}>No typing -- just tap to select.</p>

            {/* Row 1: Age range */}
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

            {/* Row 2: I am a */}
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

        {/* ---- STEP 1: YOUR WORLD ---- */}
        {step === 1 && (
          <div>
            <div style={stepLabel}>Step 2 of 4</div>
            <h2 style={heading}>Your world.</h2>
            <p style={sub}>What industry are you in?</p>

            {/* Industry grid 5x2 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8,
              marginBottom: 24,
            }}>
              {INDUSTRIES.map(ind => (
                <IndustryTile
                  key={ind.id}
                  item={ind}
                  selected={industry === ind.id}
                  onClick={() => setIndustry(ind.id)}
                />
              ))}
            </div>

            {/* Team size */}
            <div style={sectionHead}>Team size</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 36 }}>
              {TEAM_SIZES.map(ts => (
                <FlatTile
                  key={ts.id}
                  label={ts.label}
                  selected={teamSize === ts.id}
                  onClick={() => setTeamSize(ts.id)}
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

        {/* ---- STEP 2: FIRST AGENT ---- */}
        {step === 2 && (
          <div>
            <div style={stepLabel}>Step 3 of 4</div>
            <h2 style={heading}>Your first agent.</h2>
            <p style={sub}>Pick a role. We'll suggest a name.</p>

            {/* Role grid 4x2 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
              marginBottom: 24,
            }}>
              {ROLE_TEMPLATES.map(r => (
                <RoleCard
                  key={r.slug}
                  role={r}
                  selected={selectedRole?.slug === r.slug}
                  onClick={() => handleRoleSelect(r)}
                />
              ))}
            </div>

            {/* Agent name - auto-fills, editable */}
            {selectedRole && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ ...sectionHead, marginBottom: 8 }}>Agent name</div>
                <input
                  type="text"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  placeholder="Enter a name"
                  maxLength={24}
                  style={inputStyle}
                  onFocus={onFocusInput}
                  onBlur={onBlurInput}
                />
              </div>
            )}

            {!selectedRole && <div style={{ marginBottom: 32 }} />}

            <button
              onClick={goNext}
              disabled={!canAdvance()}
              style={canAdvance() ? primaryBtn : disabledBtn}
            >
              Next
            </button>
          </div>
        )}

        {/* ---- STEP 3: CONTEXT (first text inputs) ---- */}
        {step === 3 && (
          <div>
            <div style={stepLabel}>Step 4 of 4</div>
            <h2 style={heading}>Name your world.</h2>
            <p style={sub}>And give {agentName.trim() || 'your agent'} some context.</p>

            {/* World name */}
            <input
              ref={worldInputRef}
              type="text"
              value={worldName}
              onChange={e => setWorldName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && worldName.trim()) worldInputRef.current?.blur() }}
              placeholder="e.g. Apex Roofing"
              maxLength={32}
              style={{ ...inputStyle, marginBottom: worldName.trim() ? 8 : 20 }}
              onFocus={onFocusInput}
              onBlur={onBlurInput}
            />
            {worldName.trim() && (
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 18, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                world: <span style={{ color: '#60A5FA' }}>{worldSlug}</span>
              </div>
            )}

            {/* About your business */}
            <textarea
              value={businessContext}
              onChange={e => setBusinessContext(e.target.value)}
              placeholder="What do you do? What are you focused on right now? (optional)"
              maxLength={500}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, marginBottom: 20 }}
              onFocus={onFocusInput}
              onBlur={onBlurInput}
            />

            {/* Top 3 priorities */}
            <div style={{ ...sectionHead, marginBottom: 10 }}>Top 3 priorities</div>
            {[0, 1, 2].map(i => (
              <input
                key={i}
                type="text"
                value={priorities[i]}
                onChange={e => { const next = [...priorities]; next[i] = e.target.value; setPriorities(next) }}
                placeholder={`Priority ${i + 1}${i > 0 ? ' (optional)' : ''}`}
                maxLength={80}
                style={{ ...inputStyle, marginBottom: 10 }}
                onFocus={onFocusInput}
                onBlur={onBlurInput}
              />
            ))}

            <div style={{ marginTop: 24 }}>
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

        {/* ---- STEP 4: LAUNCH ---- */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72,
              borderRadius: '50%',
              background: 'rgba(232,93,38,0.12)',
              border: '2px solid rgba(232,93,38,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 28px',
              fontSize: 28,
            }}>
              ◈
            </div>

            <h2 style={{
              fontSize: 'clamp(28px, 5vw, 44px)',
              fontWeight: 900,
              color: '#F1F5F9',
              letterSpacing: '-0.02em',
              margin: '0 0 12px',
            }}>
              {worldName.trim() || 'Your Corner'} is ready.
            </h2>

            <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 32px', lineHeight: 1.6 }}>
              {agentName.trim()} &middot; {selectedRole?.role || 'Agent'} &middot;{' '}
              <span style={{ fontFamily: 'monospace', color: '#475569' }}>{worldSlug}</span>
            </p>

            {/* Summary chips */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
              {selectedRole && (
                <div style={chip(selectedRole.color)}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: selectedRole.color,
                    display: 'inline-block', marginRight: 6,
                  }} />
                  {agentName.trim()}
                </div>
              )}
              {industry && (
                <div style={chip('#60A5FA')}>
                  {INDUSTRIES.find(i => i.id === industry)?.icon}{' '}
                  {INDUSTRIES.find(i => i.id === industry)?.label}
                </div>
              )}
              {priorities.filter(p => p.trim()).slice(0, 2).map((p, i) => (
                <div key={i} style={chip('#334155')}>
                  {p.length > 32 ? p.slice(0, 30) + '…' : p}
                </div>
              ))}
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8, padding: '10px 14px',
                marginBottom: 20,
                fontSize: 13, color: '#F87171',
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
              {finishing ? 'Launching...' : 'Launch your Corner'}
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
  opacity: 0.6,
}

function chip(color) {
  return {
    padding: '4px 12px',
    borderRadius: 100,
    background: `${color}18`,
    border: `1px solid ${color}40`,
    fontSize: 11,
    fontWeight: 600,
    color: color,
    letterSpacing: '0.04em',
    display: 'inline-flex',
    alignItems: 'center',
  }
}
