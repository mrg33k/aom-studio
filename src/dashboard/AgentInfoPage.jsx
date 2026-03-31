// AgentInfoPage.jsx -- Agent profile page with skills, personality, and recipes
// Route: /dashboard/agent/:slug/info
// Dark navy theme, agent color as accent throughout

import { useParams, useNavigate } from 'react-router-dom'
import agentProfiles from '../data/agent-profiles.js'

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

export default function AgentInfoPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const agent = agentProfiles.find(a => a.slug === slug?.toLowerCase())

  if (!agent) {
    return (
      <div style={{ minHeight: '100vh', background: '#060A12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ color: '#EF4444', fontSize: 48 }}>?</div>
        <div style={{ color: '#94A8C8', fontSize: 16 }}>Agent "{slug}" not found.</div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ marginTop: 8, padding: '8px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F0F4FF', cursor: 'pointer', fontSize: 14 }}
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  const rgb = hexToRgb(agent.color)

  return (
    <div style={{ minHeight: '100vh', background: '#060A12', color: '#F0F4FF', fontFamily: "'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

      {/* Back nav */}
      <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 10 }}>
        <button
          onClick={() => navigate(`/dashboard/agent/${slug}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px',
            background: 'rgba(10,16,32,0.85)',
            backdropFilter: 'blur(12px)',
            border: `1px solid rgba(${rgb}, 0.25)`,
            borderRadius: 10,
            color: '#94A8C8', cursor: 'pointer', fontSize: 13,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F0F4FF'; e.currentTarget.style.borderColor = `rgba(${rgb}, 0.5)` }}
          onMouseLeave={e => { e.currentTarget.style.color = '#94A8C8'; e.currentTarget.style.borderColor = `rgba(${rgb}, 0.25)` }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Dashboard
        </button>
      </div>

      {/* Hero */}
      <div style={{
        position: 'relative',
        padding: '80px 32px 48px',
        background: `linear-gradient(160deg, rgba(${rgb}, 0.18) 0%, rgba(${rgb}, 0.04) 50%, transparent 100%)`,
        borderBottom: `1px solid rgba(${rgb}, 0.15)`,
        overflow: 'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: -60, left: -60,
          width: 300, height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${rgb}, 0.12) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
          {/* Avatar circle */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: `linear-gradient(135deg, rgba(${rgb}, 0.3) 0%, rgba(${rgb}, 0.1) 100%)`,
            border: `2px solid rgba(${rgb}, 0.5)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: agent.color,
            marginBottom: 20,
            boxShadow: `0 0 32px rgba(${rgb}, 0.2)`,
          }}>
            {agent.name.charAt(0)}
          </div>

          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: agent.color, marginBottom: 8, fontWeight: 600 }}>
            {agent.role}
          </div>

          <h1 style={{ fontSize: 48, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {agent.name}
          </h1>

          {/* Accent line under name */}
          <div style={{ width: 48, height: 3, borderRadius: 2, background: agent.color, marginTop: 16, marginBottom: 0 }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px 80px' }}>

        {/* What I Do */}
        <section style={{ marginBottom: 48 }}>
          <SectionLabel color={agent.color}>What I Do</SectionLabel>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: '#C8D8F0', margin: 0, fontWeight: 400 }}>
            {agent.description}
          </p>
        </section>

        {/* Personality callout */}
        <section style={{ marginBottom: 48 }}>
          <div style={{
            padding: '18px 24px',
            background: `rgba(${rgb}, 0.08)`,
            border: `1px solid rgba(${rgb}, 0.2)`,
            borderLeft: `3px solid ${agent.color}`,
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: agent.color, marginBottom: 8, fontWeight: 600 }}>
              Personality
            </div>
            <p style={{ fontSize: 15, color: '#94A8C8', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
              "{agent.personality}"
            </p>
          </div>
        </section>

        {/* Skills */}
        <section style={{ marginBottom: 52 }}>
          <SectionLabel color={agent.color}>Skills</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {agent.skills.map(skill => (
              <span key={skill} style={{
                padding: '7px 16px',
                background: `rgba(${rgb}, 0.1)`,
                border: `1px solid rgba(${rgb}, 0.25)`,
                borderRadius: 100,
                fontSize: 13, fontWeight: 500,
                color: agent.color,
                letterSpacing: '0.01em',
                cursor: 'default',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = `rgba(${rgb}, 0.2)`; e.currentTarget.style.borderColor = `rgba(${rgb}, 0.5)` }}
                onMouseLeave={e => { e.currentTarget.style.background = `rgba(${rgb}, 0.1)`; e.currentTarget.style.borderColor = `rgba(${rgb}, 0.25)` }}
              >
                /{skill}
              </span>
            ))}
          </div>
        </section>

        {/* Recipes */}
        <section>
          <SectionLabel color={agent.color}>Recipes</SectionLabel>
          <p style={{ fontSize: 13, color: '#506480', marginBottom: 20, marginTop: -8 }}>
            Common tasks {agent.name} handles out of the box.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {agent.recipes.map((recipe, i) => (
              <RecipeCard key={i} recipe={recipe} color={agent.color} rgb={rgb} />
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}

function SectionLabel({ color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 4, height: 16, borderRadius: 2, background: color }} />
      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#506480' }}>
        {children}
      </h2>
    </div>
  )
}

function RecipeCard({ recipe, color, rgb }) {
  return (
    <div
      style={{
        padding: '18px 20px',
        background: '#0A1020',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex', gap: 16, alignItems: 'flex-start',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `rgba(${rgb}, 0.07)`
        e.currentTarget.style.borderColor = `rgba(${rgb}, 0.2)`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = '#0A1020'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 1,
        background: `rgba(${rgb}, 0.12)`,
        border: `1px solid rgba(${rgb}, 0.2)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7H11M8 4L11 7L8 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF8', marginBottom: 4 }}>
          {recipe.title}
        </div>
        <div style={{ fontSize: 13, color: '#506480', lineHeight: 1.55 }}>
          {recipe.description}
        </div>
      </div>
    </div>
  )
}
