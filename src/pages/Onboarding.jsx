import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../dashboard/lib/supabase.js'

// Role templates -- 6 choices, no AOM-specific data
const ROLE_TEMPLATES = [
  { slug: 'system-manager',  name: 'System Manager',  role: 'Infrastructure',     desc: 'Owns the systems that keep everything running.',  color: '#60A5FA' },
  { slug: 'builder',         name: 'Builder',          role: 'Web Dev / Build',    desc: 'Builds every page, feature, and frontend.',       color: '#34D399' },
  { slug: 'content-creator', name: 'Content Creator',  role: 'Content Production', desc: 'Video edits, reels, motion graphics.',            color: '#A78BFA' },
  { slug: 'designer',        name: 'Designer',         role: 'Brand / Design',     desc: 'Visual identity, design specs, asset library.',   color: '#F472B6' },
  { slug: 'strategist',      name: 'Strategist',       role: 'Strategy / Biz Dev', desc: 'Growth plan, offer architecture, GTM.',           color: '#FBBF24' },
  { slug: 'advisor',         name: 'Advisor',          role: 'Advisory',           desc: 'Client demos, coaching, sales support.',          color: '#38BDF8' },
]

function toSlug(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'my-world'
}

// Progress dots (steps 0-3, launch is 4)
function StepDots({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i === current ? '#E85D26' : i < current ? 'rgba(232,93,38,0.4)' : 'rgba(255,255,255,0.12)',
            transition: 'all 300ms ease',
          }}
        />
      ))}
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  // step 0: world, 1: agent name, 2: role, 3: context+priorities, 4: launch
  const [step, setStep] = useState(0)
  const [worldName, setWorldName]           = useState('')
  const [agentName, setAgentName]           = useState('')
  const [selectedRole, setSelectedRole]     = useState(null)
  const [businessContext, setBusinessContext] = useState('')
  const [priorities, setPriorities]         = useState(['', '', ''])
  const [finishing, setFinishing]           = useState(false)
  const [error, setError]                   = useState('')
  const [animating, setAnimating]           = useState(false)

  const worldInputRef = useRef(null)
  const agentInputRef = useRef(null)
  const TOTAL_STEPS = 5

  // Auto-focus text inputs on step change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 0) worldInputRef.current?.focus()
      if (step === 1) agentInputRef.current?.focus()
    }, 320)
    return () => clearTimeout(timer)
  }, [step])

  function goNext() {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setStep(s => s + 1)
      setAnimating(false)
    }, 210)
  }

  function goBack() {
    if (animating || step === 0) return
    setAnimating(true)
    setTimeout(() => {
      setStep(s => s - 1)
      setAnimating(false)
    }, 210)
  }

  async function handleLaunch() {
    if (finishing) return
    setFinishing(true)
    setError('')

    const worldSlug  = toSlug(worldName) || 'my-world'
    const agentSlug  = toSlug(agentName) || 'my-agent'
    const roleChoice = selectedRole || ROLE_TEMPLATES[0]

    try {
      if (supabase) {
        // 1. Update user metadata -- sets world (client_id) + marks onboarding complete
        const { error: metaErr } = await supabase.auth.updateUser({
          data: {
            world: worldSlug,
            has_completed_onboarding: true,
            onboarded: true,
            business_context: businessContext.trim(),
            priorities: priorities.filter(p => p.trim()),
          },
        })
        if (metaErr) console.error('[Onboarding] metadata error:', metaErr)

        // 2. Insert to agent_status -- this is what the dashboard reads for non-AOM worlds
        const { error: statusErr } = await supabase.from('agent_status').insert([{
          slug:         agentSlug,
          name:         agentName.trim() || agentSlug,
          role:         roleChoice.role,
          status:       'idle',
          client_id:    worldSlug,
          color:        roleChoice.color,
          type:         'agent',
        }])
        if (statusErr) console.error('[Onboarding] agent_status error:', statusErr)

        // 3. Insert to agents table
        await supabase.from('agents').insert([{
          slug:          agentSlug,
          name:          agentName.trim() || agentSlug,
          role:          roleChoice.role,
          client_id:     worldSlug,
          color:         roleChoice.color,
          is_assignable: true,
        }]).then(({ error: agErr }) => {
          if (agErr) console.error('[Onboarding] agents error:', agErr)
        })

        // 4. Insert to rooms table (best effort -- schema may vary)
        await supabase.from('rooms').insert([{
          slug:      agentSlug,
          name:      agentName.trim() || agentSlug,
          client_id: worldSlug,
          type:      'agent',
        }]).then(({ error: roomErr }) => {
          if (roomErr) console.error('[Onboarding] rooms error (non-critical):', roomErr)
        })

      } else {
        // Localhost fallback (no Supabase env vars)
        localStorage.setItem('corner-onboarded', 'true')
        localStorage.setItem('corner-world', worldSlug)
        localStorage.setItem('corner-agent-name', agentName.trim())
      }

      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('[Onboarding] error:', err)
      setError('Something went wrong. Please try again.')
      setFinishing(false)
    }
  }

  const worldSlug = toSlug(worldName)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #060A14 0%, #0A0F1E 50%, #080C16 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background hex grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='104'%3E%3Cpath d='M60 2 L118 32 L118 72 L60 102 L2 72 L2 32 Z' fill='none' stroke='rgba(59,130,246,0.06)' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }} />

      {/* Ambient glow */}
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
          position: 'absolute', top: 26, left: 110, zIndex: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: '#475569',
          fontFamily: "'Inter', system-ui, sans-serif",
          padding: '4px 8px',
        }}>
          back
        </button>
      )}

      {/* Step dots (steps 0-3 only) */}
      {step < TOTAL_STEPS - 1 && (
        <div style={{ position: 'absolute', top: 32, right: 28, zIndex: 10 }}>
          <StepDots current={step} total={TOTAL_STEPS - 1} />
        </div>
      )}

      {/* Content container */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%',
        maxWidth: step === 2 ? 640 : 480,
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 210ms ease, transform 210ms ease',
      }}>

        {/* ---- STEP 0: Name Your World ---- */}
        {step === 0 && (
          <div>
            <div style={labelStyle}>Step 1 of 4</div>
            <h2 style={headingStyle}>Name your world.</h2>
            <p style={subStyle}>Your company name, project, or workspace name.</p>

            <input
              ref={worldInputRef}
              type="text"
              value={worldName}
              onChange={e => setWorldName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && worldName.trim()) goNext() }}
              placeholder="e.g. Apex Roofing"
              maxLength={32}
              style={{ ...inputStyle, marginBottom: worldName.trim() ? 10 : 32 }}
              onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(59,130,246,0.2)'; e.target.style.boxShadow = 'none' }}
            />

            {worldName.trim() && (
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 28, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                world: <span style={{ color: '#60A5FA' }}>{worldSlug}</span>
              </div>
            )}

            <button
              onClick={goNext}
              disabled={!worldName.trim()}
              style={worldName.trim() ? primaryBtn : disabledBtn}
            >
              Next
            </button>
          </div>
        )}

        {/* ---- STEP 1: Name Your First Agent ---- */}
        {step === 1 && (
          <div>
            <div style={labelStyle}>Step 2 of 4</div>
            <h2 style={headingStyle}>Name your first agent.</h2>
            <p style={subStyle}>Your right-hand. What do you want to call them?</p>

            <input
              ref={agentInputRef}
              type="text"
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && agentName.trim()) goNext() }}
              placeholder="e.g. Alex, Nova, Scout"
              maxLength={24}
              style={{ ...inputStyle, marginBottom: 32 }}
              onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(59,130,246,0.2)'; e.target.style.boxShadow = 'none' }}
            />

            <button
              onClick={goNext}
              disabled={!agentName.trim()}
              style={agentName.trim() ? primaryBtn : disabledBtn}
            >
              Next
            </button>
          </div>
        )}

        {/* ---- STEP 2: Pick Role Template ---- */}
        {step === 2 && (
          <div>
            <div style={labelStyle}>Step 3 of 4</div>
            <h2 style={headingStyle}>Pick {agentName.trim() ? `${agentName.trim()}'s` : 'their'} role.</h2>
            <p style={subStyle}>What do they specialize in?</p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
              gap: 10,
              marginBottom: 32,
              marginTop: 8,
            }}>
              {ROLE_TEMPLATES.map(r => {
                const isSelected = selectedRole?.slug === r.slug
                return (
                  <button
                    key={r.slug}
                    onClick={() => setSelectedRole(r)}
                    style={{
                      background: isSelected ? `${r.color}18` : 'rgba(255,255,255,0.03)',
                      border: isSelected ? `2px solid ${r.color}70` : '2px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: '14px 14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      position: 'relative',
                      transition: 'all 140ms ease',
                    }}
                  >
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 18, height: 18,
                        background: r.color,
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: '#fff', fontWeight: 900,
                      }}>
                        ✓
                      </div>
                    )}
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: r.color, marginBottom: 10,
                    }} />
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: isSelected ? '#F1F5F9' : '#94A3B8',
                      marginBottom: 2,
                    }}>
                      {r.name}
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 600,
                      color: isSelected ? r.color : '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 6,
                    }}>
                      {r.role}
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                      {r.desc}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={goNext}
              disabled={!selectedRole}
              style={selectedRole ? primaryBtn : disabledBtn}
            >
              Next
            </button>
          </div>
        )}

        {/* ---- STEP 3: Business Context + Priorities ---- */}
        {step === 3 && (
          <div>
            <div style={labelStyle}>Step 4 of 4</div>
            <h2 style={headingStyle}>About your business.</h2>
            <p style={subStyle}>
              Give {agentName.trim() || 'your agent'} context to work with.
            </p>

            <textarea
              value={businessContext}
              onChange={e => setBusinessContext(e.target.value)}
              placeholder="What do you do, and what are you focused on right now? (optional)"
              maxLength={500}
              rows={4}
              style={{
                ...inputStyle,
                resize: 'vertical',
                lineHeight: 1.6,
                marginBottom: 24,
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(59,130,246,0.2)'; e.target.style.boxShadow = 'none' }}
            />

            <div style={{
              fontSize: 11, fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}>
              Top 3 priorities right now
            </div>

            {[0, 1, 2].map(i => (
              <input
                key={i}
                type="text"
                value={priorities[i]}
                onChange={e => {
                  const next = [...priorities]
                  next[i] = e.target.value
                  setPriorities(next)
                }}
                placeholder={`Priority ${i + 1}${i > 0 ? ' (optional)' : ''}`}
                maxLength={80}
                style={{ ...inputStyle, marginBottom: 10 }}
                onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(59,130,246,0.2)'; e.target.style.boxShadow = 'none' }}
              />
            ))}

            <div style={{ marginTop: 28 }}>
              <button onClick={goNext} style={primaryBtn}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP 4: Launch ---- */}
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
            <div style={{
              display: 'flex', gap: 8, justifyContent: 'center',
              flexWrap: 'wrap', marginBottom: 40,
            }}>
              {selectedRole && (
                <div style={chipStyle(selectedRole.color)}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: selectedRole.color,
                    display: 'inline-block', marginRight: 6,
                  }} />
                  {agentName.trim()}
                </div>
              )}
              {selectedRole && (
                <div style={chipStyle('#60A5FA')}>{selectedRole.name}</div>
              )}
              {priorities.filter(p => p.trim()).slice(0, 2).map((p, i) => (
                <div key={i} style={chipStyle('#334155')}>
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

// ---- Shared styles ----

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#E85D26',
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  marginBottom: 12,
}

const headingStyle = {
  fontSize: 'clamp(26px, 4vw, 40px)',
  fontWeight: 900,
  color: '#F1F5F9',
  letterSpacing: '-0.02em',
  margin: '0 0 8px',
  lineHeight: 1.1,
}

const subStyle = {
  fontSize: 14,
  color: '#64748B',
  margin: '0 0 24px',
  lineHeight: 1.5,
}

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
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  display: 'block',
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

function chipStyle(color) {
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
