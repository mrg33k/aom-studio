import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../dashboard/lib/supabase.js'

// ---- Agent templates for Step 3 ----
const AGENT_TEMPLATES = [
  { slug: 'elon',    name: 'Elon',    role: 'Infrastructure',       desc: 'Owns the systems that keep everything running.',          color: '#60A5FA' },
  { slug: 'bobby',   name: 'Bobby',   role: 'Web Dev',              desc: 'Builds every page, feature, and frontend.',               color: '#34D399' },
  { slug: 'steffen', name: 'Steffen', role: 'Brand / Design',       desc: 'Visual identity, design specs, asset library.',           color: '#F472B6' },
  { slug: 'cleo',    name: 'Cleo',    role: 'Content Production',   desc: 'Video edits, reels, motion graphics.',                    color: '#A78BFA' },
  { slug: 'alex',    name: 'Alex',    role: 'Strategy / Biz Dev',   desc: 'Growth plan, offer architecture, GTM.',                   color: '#FBBF24' },
  { slug: 'steve',   name: 'Steve',   role: 'AI Advisory',          desc: 'AI audit product, client demos, coaching.',               color: '#38BDF8' },
  { slug: 'jacob',   name: 'Jacob',   role: 'Outreach',             desc: 'Cold email, lead generation, follow-ups.',                color: '#F87171' },
  { slug: 'tony',    name: 'Tony',    role: 'Social Media',         desc: 'Schedule posts, manage platforms, engage.',               color: '#4ADE80' },
  { slug: 'paige',   name: 'Paige',   role: 'Client Success',       desc: 'Tracks delivery, health, and client happiness.',          color: '#E879F9' },
  { slug: 'elmo',    name: 'Elmo',    role: 'QA',                   desc: 'Tests everything before it ships.',                       color: '#FB923C' },
  { slug: 'mom',     name: 'Mom',     role: 'Orchestrator',         desc: 'Coordinates the whole team. Nothing gets dropped.',       color: '#F59E0B' },
  { slug: 'colton',  name: 'Colton',  role: 'Backup Builder',       desc: 'Overflow developer when Bobby needs support.',            color: '#86EFAC' },
]

// ---- Office style options for Step 4 ----
const OFFICE_STYLES = [
  {
    id: 'warm-night',
    label: 'Warm Night',
    desc: 'Golden light, dark corners. Creative energy.',
    bg: 'linear-gradient(135deg, #1A0F0A 0%, #2A1A0E 50%, #1A1005 100%)',
    accent: '#E85D26',
    preview: ['#4A2510', '#6B3A1C', '#3A1E0C', '#5A2E14'],
  },
  {
    id: 'bright-day',
    label: 'Bright Day',
    desc: 'Open, airy. High energy and clarity.',
    bg: 'linear-gradient(135deg, #0A1628 0%, #0F2040 50%, #081428 100%)',
    accent: '#3B82F6',
    preview: ['#1A3A6A', '#1E4A8A', '#122A50', '#183460'],
  },
  {
    id: 'minimal',
    label: 'Minimal',
    desc: 'Clean slate. Let the work speak.',
    bg: 'linear-gradient(135deg, #0A0A0A 0%, #141414 50%, #0A0A0A 100%)',
    accent: '#94A3B8',
    preview: ['#1A1A1A', '#222222', '#161616', '#1E1E1E'],
  },
]

// ---- Hex shape preview SVG ----
function HexPreview({ businessName, color = '#3B82F6' }) {
  const displayName = businessName.trim() || 'Your Business'
  const shortName = displayName.length > 12 ? displayName.slice(0, 12) + '…' : displayName
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg viewBox="0 0 120 104" width={120} height={104} style={{ filter: `drop-shadow(0 0 16px ${color}40)` }}>
        <path
          d="M60 4 L116 34 L116 70 L60 100 L4 70 L4 34 Z"
          fill={`${color}14`}
          stroke={color}
          strokeWidth={2}
        />
        <text
          x="60" y="48"
          textAnchor="middle"
          fill={color}
          fontSize="10"
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="0.04em"
          style={{ textTransform: 'uppercase' }}
        >
          {shortName.length > 7 ? shortName.slice(0, 7) : shortName}
        </text>
        {shortName.length > 7 && (
          <text
            x="60" y="62"
            textAnchor="middle"
            fill={color}
            fontSize="10"
            fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif"
            letterSpacing="0.04em"
          >
            {shortName.slice(7)}
          </text>
        )}
        <text
          x="60" y="76"
          textAnchor="middle"
          fill={`${color}80`}
          fontSize="8"
          fontFamily="Inter, system-ui, sans-serif"
        >
          CORNER
        </text>
      </svg>
      <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
        {displayName}
      </div>
    </div>
  )
}

// ---- Progress dots ----
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

// ---- Main Onboarding component ----
export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [businessName, setBusinessName] = useState('')
  const [selectedAgents, setSelectedAgents] = useState(['elon', 'bobby', 'mom'])
  const [selectedStyle, setSelectedStyle] = useState('warm-night')
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState('')
  const [animating, setAnimating] = useState(false)
  const inputRef = useRef(null)

  const TOTAL_STEPS = 5

  // Focus input when step 1 appears
  useEffect(() => {
    if (step === 1 && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 350)
    }
  }, [step])

  function goNext() {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setStep(s => s + 1)
      setAnimating(false)
    }, 220)
  }

  function toggleAgent(slug) {
    setSelectedAgents(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    )
  }

  async function handleFinish() {
    if (finishing) return
    setFinishing(true)
    setError('')

    // Save onboarding data to Supabase user_metadata
    if (supabase) {
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            onboarded: true,
            business_name: businessName.trim() || 'My Business',
            selected_agents: selectedAgents,
            office_style: selectedStyle,
          }
        })
        if (updateError) {
          console.error('Onboarding save error:', updateError)
          // Don't block -- still let them in
        }
      } catch (err) {
        console.error('Onboarding Supabase error:', err)
      }
    } else {
      // No Supabase (localhost dev) -- save to localStorage as fallback
      try {
        localStorage.setItem('corner-onboarded', 'true')
        localStorage.setItem('corner-business-name', businessName.trim() || 'My Business')
        localStorage.setItem('corner-selected-agents', JSON.stringify(selectedAgents))
        localStorage.setItem('corner-office-style', selectedStyle)
      } catch (e) { /* ignore */ }
    }

    navigate('/dashboard', { replace: true })
  }

  const currentStyle = OFFICE_STYLES.find(s => s.id === selectedStyle) || OFFICE_STYLES[0]

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, #060A14 0%, #0A0F1E 50%, #080C16 100%)`,
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

      {/* Top ambient glow */}
      <div style={{
        position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(232,93,38,0.06) 0%, transparent 65%)',
      }} />

      {/* Corner wordmark */}
      <div style={{
        position: 'absolute', top: 28, left: 28,
        fontSize: 18, fontWeight: 900, color: '#F1F5F9', letterSpacing: '0.01em',
        zIndex: 10,
      }}>
        Corner<span style={{ color: '#E85D26' }}>.</span>
      </div>

      {/* Step dots */}
      {step > 0 && step < TOTAL_STEPS - 1 && (
        <div style={{ position: 'absolute', top: 32, right: 28, zIndex: 10 }}>
          <StepDots current={step - 1} total={TOTAL_STEPS - 2} />
        </div>
      )}

      {/* Step content */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: step === 2 ? 680 : 480,
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 220ms ease, transform 220ms ease',
      }}>

        {/* ---- STEP 0: Welcome ---- */}
        {step === 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: '#E85D26',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: 20,
            }}>
              Welcome
            </div>
            <h1 style={{
              fontSize: 'clamp(40px, 8vw, 72px)',
              fontWeight: 900,
              color: '#F1F5F9',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              margin: '0 0 20px',
            }}>
              Welcome to Corner.
            </h1>
            <p style={{
              fontSize: 18,
              color: '#64748B',
              fontWeight: 400,
              margin: '0 0 48px',
              lineHeight: 1.5,
            }}>
              Let's set up your workspace.
            </p>
            <button onClick={goNext} style={primaryBtn}>
              Get Started
            </button>
          </div>
        )}

        {/* ---- STEP 1: Name Your Business ---- */}
        {step === 1 && (
          <div>
            <div style={stepLabel}>Step 1 of 4</div>
            <h2 style={stepHeading}>What's your business called?</h2>
            <p style={stepSubtext}>This appears on your office in the game.</p>

            <input
              ref={inputRef}
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && businessName.trim()) goNext() }}
              placeholder="e.g. Apex Roofing"
              maxLength={32}
              style={{
                ...onboardingInput,
                marginBottom: 32,
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(232,93,38,0.6)'
                e.target.style.boxShadow = '0 0 0 3px rgba(232,93,38,0.12)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(59,130,246,0.2)'
                e.target.style.boxShadow = 'none'
              }}
            />

            {/* Hex preview */}
            <div style={{
              display: 'flex', justifyContent: 'center',
              marginBottom: 40,
            }}>
              <HexPreview businessName={businessName} color="#E85D26" />
            </div>

            <button
              onClick={goNext}
              disabled={!businessName.trim()}
              style={businessName.trim() ? primaryBtn : disabledBtn}
            >
              Next
            </button>
          </div>
        )}

        {/* ---- STEP 2: Choose Your Team ---- */}
        {step === 2 && (
          <div>
            <div style={stepLabel}>Step 2 of 4</div>
            <h2 style={stepHeading}>Choose your team.</h2>
            <p style={stepSubtext}>Select the agents who'll work your corner. You can add more later.</p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 10,
              marginBottom: 36,
              marginTop: 24,
            }}>
              {AGENT_TEMPLATES.map(agent => {
                const isSelected = selectedAgents.includes(agent.slug)
                return (
                  <button
                    key={agent.slug}
                    onClick={() => toggleAgent(agent.slug)}
                    style={{
                      background: isSelected
                        ? `${agent.color}18`
                        : 'rgba(255,255,255,0.03)',
                      border: isSelected
                        ? `1.5px solid ${agent.color}70`
                        : '1.5px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: '14px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      position: 'relative',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {/* Checkmark */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 18, height: 18,
                        background: agent.color,
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: '#fff', fontWeight: 900,
                      }}>
                        ✓
                      </div>
                    )}
                    {/* Color dot */}
                    <div style={{
                      width: 8, height: 8,
                      borderRadius: '50%',
                      background: agent.color,
                      marginBottom: 10,
                    }} />
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: isSelected ? '#F1F5F9' : '#94A3B8',
                      marginBottom: 2,
                    }}>
                      {agent.name}
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 500,
                      color: isSelected ? agent.color : '#475569',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>
                      {agent.role}
                    </div>
                    <div style={{
                      fontSize: 12, color: '#475569',
                      lineHeight: 1.4,
                    }}>
                      {agent.desc}
                    </div>
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: '#475569' }}>
                {selectedAgents.length} agent{selectedAgents.length !== 1 ? 's' : ''} selected
              </div>
              <button
                onClick={goNext}
                disabled={selectedAgents.length === 0}
                style={selectedAgents.length > 0 ? primaryBtn : disabledBtn}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP 3: Pick Your Style ---- */}
        {step === 3 && (
          <div>
            <div style={stepLabel}>Step 3 of 4</div>
            <h2 style={stepHeading}>Pick your style.</h2>
            <p style={stepSubtext}>Choose the vibe of your office. You can change this anytime.</p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 40,
              marginTop: 24,
            }}>
              {OFFICE_STYLES.map(style => {
                const isSelected = selectedStyle === style.id
                return (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    style={{
                      background: 'transparent',
                      border: isSelected
                        ? `2px solid ${style.accent}`
                        : '2px solid rgba(255,255,255,0.08)',
                      borderRadius: 14,
                      padding: 0,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      transition: 'all 200ms ease',
                      boxShadow: isSelected ? `0 0 20px ${style.accent}30` : 'none',
                    }}
                  >
                    {/* Preview area */}
                    <div style={{
                      background: style.bg,
                      height: 100,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 6,
                      padding: 10,
                    }}>
                      {style.preview.map((c, i) => (
                        <div key={i} style={{
                          background: c,
                          borderRadius: 6,
                          border: `1px solid ${style.accent}30`,
                        }} />
                      ))}
                    </div>
                    {/* Label */}
                    <div style={{
                      padding: '10px 12px',
                      background: 'rgba(10,15,30,0.8)',
                      textAlign: 'left',
                    }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: isSelected ? '#F1F5F9' : '#94A3B8',
                        marginBottom: 2,
                      }}>
                        {style.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#475569' }}>
                        {style.desc}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <button onClick={goNext} style={primaryBtn}>
              Next
            </button>
          </div>
        )}

        {/* ---- STEP 4: Ready ---- */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            {/* Glow ring */}
            <div style={{
              width: 80, height: 80,
              borderRadius: '50%',
              background: 'rgba(232,93,38,0.12)',
              border: '2px solid rgba(232,93,38,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 28px',
              fontSize: 32,
            }}>
              ◈
            </div>

            <h2 style={{
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 900,
              color: '#F1F5F9',
              letterSpacing: '-0.02em',
              margin: '0 0 12px',
            }}>
              Your Corner is ready.
            </h2>

            <p style={{
              fontSize: 15, color: '#64748B',
              margin: '0 0 36px',
              lineHeight: 1.6,
            }}>
              {businessName.trim() || 'Your Business'} &mdash; {selectedAgents.length} agent{selectedAgents.length !== 1 ? 's' : ''} ready to work.
            </p>

            {/* Summary chips */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              justifyContent: 'center',
              marginBottom: 40,
            }}>
              {selectedAgents.map(slug => {
                const agent = AGENT_TEMPLATES.find(a => a.slug === slug)
                if (!agent) return null
                return (
                  <div
                    key={slug}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 100,
                      background: `${agent.color}18`,
                      border: `1px solid ${agent.color}50`,
                      fontSize: 11, fontWeight: 600,
                      color: agent.color,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {agent.name}
                  </div>
                )
              })}
            </div>

            {/* Office style badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 100,
              background: `${currentStyle.accent}14`,
              border: `1px solid ${currentStyle.accent}40`,
              fontSize: 12, fontWeight: 600,
              color: currentStyle.accent,
              marginBottom: 40,
            }}>
              <span style={{
                width: 8, height: 8,
                borderRadius: '50%',
                background: currentStyle.accent,
                display: 'inline-block',
              }} />
              {currentStyle.label}
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
              onClick={handleFinish}
              disabled={finishing}
              style={finishing ? disabledBtn : {
                ...primaryBtn,
                fontSize: 15,
                padding: '14px 32px',
                boxShadow: '0 8px 32px rgba(232,93,38,0.4)',
              }}
            >
              {finishing ? 'Entering...' : 'Enter your Corner'}
            </button>
          </div>
        )}

      </div>

      {/* Global keyframes */}
      <style>{`
        * { box-sizing: border-box; }
        @keyframes onboardFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ---- Shared styles ----

const stepLabel = {
  fontSize: 11,
  fontWeight: 600,
  color: '#E85D26',
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  marginBottom: 12,
}

const stepHeading = {
  fontSize: 'clamp(24px, 4vw, 38px)',
  fontWeight: 900,
  color: '#F1F5F9',
  letterSpacing: '-0.02em',
  margin: '0 0 8px',
  lineHeight: 1.1,
}

const stepSubtext = {
  fontSize: 14,
  color: '#64748B',
  margin: '0 0 24px',
  lineHeight: 1.5,
}

const onboardingInput = {
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
