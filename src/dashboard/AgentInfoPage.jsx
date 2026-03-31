// AgentInfoPage.jsx -- Agent profile page with Steffen-quality polish
// Route: /dashboard/agent/:slug/info
// Dark navy theme, agent color as accent, glassmorphism cards, animated hero

import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import agentProfiles from '../data/agent-profiles.js'

// Per-agent taglines -- fun, memorable, on-brand
const TAGLINES = {
  bobby:   'Ship it or it didn\'t happen.',
  gary:    'If it\'s not on the board, it doesn\'t exist.',
  elon:    'The fix is three layers deeper than you think.',
  steffen: 'Your font choice is wrong. I can prove it.',
  steve:   'I already have a slide for that.',
  cleo:    'The hook is already in the footage.',
  jacob:   'No cold email if there\'s a warm angle.',
  tony:    'Every caption is the one that tips the algorithm.',
  alex:    'The pattern is there. You just can\'t see it yet.',
  elmo:    'It looks fine on desktop. I\'ll find where it breaks.',
  pixel:   'I\'ve already watched every clip. Ask me anything.',
  rex:     'Already knew. Was about to bring it up.',
}

// Icon lookup for recipe cards (first keyword match wins)
const RECIPE_ICON_MAP = [
  ['council',    '🏛️'],
  ['hand',       '🤝'],
  ['unstick',    '🔓'],
  ['capture',    '📌'],
  ['fix',        '🔧'],
  ['bug',        '🐛'],
  ['iterate',    '🔄'],
  ['screenshot', '📸'],
  ['batch',      '📦'],
  ['health',     '💊'],
  ['score',      '📊'],
  ['review',     '👁️'],
  ['report',     '📋'],
  ['audit',      '🔍'],
  ['snapshot',   '💾'],
  ['clean',      '🧹'],
  ['onboard',    '🚀'],
  ['brand',      '🎨'],
  ['design',     '✏️'],
  ['thumbnail',  '🖼️'],
  ['mood',       '🎭'],
  ['spec',       '📐'],
  ['research',   '🔬'],
  ['pitch',      '📈'],
  ['roi',        '💰'],
  ['calculator', '🧮'],
  ['sharpen',    '⚡'],
  ['cut',        '✂️'],
  ['catalog',    '🗄️'],
  ['video',      '🎬'],
  ['color',      '🎨'],
  ['transform',  '🪄'],
  ['outreach',   '📬'],
  ['email',      '✉️'],
  ['track',      '📊'],
  ['follow',     '🔁'],
  ['competitor', '🕵️'],
  ['analyze',    '📉'],
  ['package',    '📦'],
  ['market',     '📡'],
  ['schedule',   '📅'],
  ['caption',    '💬'],
  ['social',     '📱'],
  ['calendar',   '🗓️'],
  ['posting',    '📤'],
  ['deal',       '🤝'],
  ['plan',       '🗺️'],
  ['scan',       '🔭'],
  ['search',     '🔍'],
  ['reorganize', '📁'],
  ['index',      '🗃️'],
  ['write',      '✍️'],
  ['performance','🚀'],
  ['build',      '🏗️'],
  ['page',       '📄'],
  ['full',       '🗂️'],
  ['run',        '⚡'],
]

function getRecipeIcon(title) {
  const lower = title.toLowerCase()
  for (const [keyword, icon] of RECIPE_ICON_MAP) {
    if (lower.includes(keyword)) return icon
  }
  return '▶'
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  )
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// Inject CSS keyframes once
let keyframesInjected = false
function injectKeyframes() {
  if (keyframesInjected) return
  keyframesInjected = true
  const style = document.createElement('style')
  style.id = 'agent-info-keyframes'
  style.textContent = `
    @keyframes agentGradientShift {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes agentPulseOrb {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50%       { opacity: 0.9; transform: scale(1.08); }
    }
    @keyframes agentFadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `
  document.head.appendChild(style)
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AgentInfoPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  useEffect(() => { injectKeyframes() }, [])

  const agent = agentProfiles.find(a => a.slug === slug?.toLowerCase())

  if (!agent) {
    return (
      <div style={{
        minHeight: '100vh', background: '#060A12',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ color: '#EF4444', fontSize: 48 }}>?</div>
        <div style={{ color: '#94A8C8', fontSize: 16 }}>Agent "{slug}" not found.</div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: 8, padding: '8px 20px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: '#F0F4FF', cursor: 'pointer', fontSize: 14,
          }}
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  const rgb     = hexToRgb(agent.color)
  const tagline = TAGLINES[agent.slug] || ''

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060A12',
      color: '#F0F4FF',
      fontFamily: "'Inter', 'SF Pro Display', 'Helvetica Neue', sans-serif",
    }}>

      {/* Back nav */}
      <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 20 }}>
        <BackButton slug={slug} navigate={navigate} rgb={rgb} />
      </div>

      {/* ── Hero ────────────────────────────────── */}
      <div style={{
        position: 'relative',
        padding: isMobile ? '72px 20px 48px' : '96px 48px 64px',
        overflow: 'hidden',
      }}>

        {/* Animated gradient layer */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg,
            rgba(${rgb}, 0.26) 0%,
            rgba(${rgb}, 0.08) 45%,
            transparent 80%)`,
          backgroundSize: '200% 200%',
          animation: 'agentGradientShift 7s ease infinite',
          pointerEvents: 'none',
        }} />

        {/* Pulsing orb */}
        <div style={{
          position: 'absolute', top: -100, left: -60,
          width: 480, height: 480, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${rgb}, 0.13) 0%, transparent 68%)`,
          animation: 'agentPulseOrb 6s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Bottom divider gradient */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent 0%, rgba(${rgb}, 0.35) 40%, rgba(${rgb}, 0.35) 60%, transparent 100%)`,
        }} />

        <div style={{
          maxWidth: 720, margin: '0 auto', position: 'relative',
          animation: 'agentFadeUp 0.45s ease both',
        }}>

          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: `linear-gradient(145deg, rgba(${rgb}, 0.4) 0%, rgba(${rgb}, 0.12) 100%)`,
            border: `2px solid rgba(${rgb}, 0.6)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 800, color: agent.color,
            marginBottom: 24,
            boxShadow: `0 0 0 8px rgba(${rgb}, 0.06), 0 0 48px rgba(${rgb}, 0.28)`,
            fontFamily: "'Inter', sans-serif",
          }}>
            {agent.name.charAt(0)}
          </div>

          {/* Role label */}
          <div style={{
            fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: agent.color, marginBottom: 10, fontWeight: 600,
          }}>
            {agent.role}
          </div>

          {/* Name */}
          <h1 style={{
            fontSize: isMobile ? 34 : 42,
            fontWeight: 800, margin: 0,
            letterSpacing: '-0.025em', lineHeight: 1.08,
          }}>
            {agent.name}
          </h1>

          {/* Tagline */}
          {tagline && (
            <div style={{
              marginTop: 10,
              fontSize: isMobile ? 14 : 16,
              color: '#7A94B8',
              fontStyle: 'italic',
              fontWeight: 400,
              letterSpacing: '0.01em',
            }}>
              {tagline}
            </div>
          )}

          {/* Accent rule */}
          <div style={{
            width: 52, height: 3, borderRadius: 2, marginTop: 22,
            background: `linear-gradient(90deg, ${agent.color} 0%, transparent 100%)`,
          }} />

        </div>
      </div>

      {/* ── Content ─────────────────────────────── */}
      <div style={{
        maxWidth: 720, margin: '0 auto',
        padding: isMobile ? '36px 20px 88px' : '52px 48px 108px',
      }}>

        {/* What I Do */}
        <section style={{
          marginBottom: isMobile ? 44 : 60,
          animation: 'agentFadeUp 0.45s ease 0.1s both',
        }}>
          <SectionLabel color={agent.color} rgb={rgb}>What I Do</SectionLabel>
          <p style={{
            fontSize: 17, lineHeight: 1.72, color: '#C8D8F0',
            margin: 0, fontWeight: 400,
          }}>
            {agent.description}
          </p>
        </section>

        {/* Personality -- speech bubble */}
        <section style={{
          marginBottom: isMobile ? 44 : 60,
          animation: 'agentFadeUp 0.45s ease 0.18s both',
        }}>
          <SectionLabel color={agent.color} rgb={rgb}>Personality</SectionLabel>
          <PersonalityBubble agent={agent} rgb={rgb} />
        </section>

        {/* Skills */}
        <section style={{
          marginBottom: isMobile ? 44 : 60,
          animation: 'agentFadeUp 0.45s ease 0.26s both',
        }}>
          <SectionLabel color={agent.color} rgb={rgb}>Skills</SectionLabel>
          <SkillsGrid skills={agent.skills} color={agent.color} rgb={rgb} isMobile={isMobile} />
        </section>

        {/* Recipes */}
        <section style={{ animation: 'agentFadeUp 0.45s ease 0.34s both' }}>
          <SectionLabel color={agent.color} rgb={rgb}>Recipes</SectionLabel>
          <p style={{
            fontSize: 13, color: '#4A6080', marginBottom: 18, marginTop: -8,
          }}>
            Common tasks {agent.name} handles out of the box.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12 }}>
            {agent.recipes.map((recipe, i) => (
              <RecipeCard key={i} recipe={recipe} color={agent.color} rgb={rgb} isMobile={isMobile} />
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function BackButton({ slug, navigate, rgb }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={() => navigate(`/dashboard/agent/${slug}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px',
        background: 'rgba(8, 13, 28, 0.88)',
        backdropFilter: 'blur(14px)',
        border: `1px solid rgba(${rgb}, ${hovered ? 0.5 : 0.22})`,
        borderRadius: 10,
        color: hovered ? '#F0F4FF' : '#7A94B8',
        cursor: 'pointer', fontSize: 13,
        transition: 'all 0.2s',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Dashboard
    </button>
  )
}

function SectionLabel({ color, rgb, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div style={{
        width: 4, height: 16, borderRadius: 2,
        background: color,
        boxShadow: `0 0 10px rgba(${rgb}, 0.6)`,
      }} />
      <h2 style={{
        margin: 0, fontSize: 11, fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: '#4A6080',
      }}>
        {children}
      </h2>
    </div>
  )
}

function PersonalityBubble({ agent, rgb }) {
  return (
    <div style={{ position: 'relative', paddingBottom: 14 }}>
      <div style={{
        padding: '24px 24px 20px',
        background: `linear-gradient(135deg, rgba(${rgb}, 0.12) 0%, rgba(${rgb}, 0.04) 100%)`,
        border: `1px solid rgba(${rgb}, 0.28)`,
        borderRadius: 16,
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Decorative quote mark */}
        <div style={{
          position: 'absolute', top: 8, left: 14,
          fontSize: 64, lineHeight: 1,
          color: `rgba(${rgb}, 0.18)`,
          fontFamily: 'Georgia, serif',
          fontWeight: 700,
          pointerEvents: 'none', userSelect: 'none',
        }}>
          "
        </div>

        {/* Personality text */}
        <p style={{
          fontSize: 15, color: '#C0D4EC',
          margin: 0, lineHeight: 1.7,
          paddingTop: 16, paddingLeft: 8,
          fontStyle: 'italic', fontWeight: 400,
        }}>
          {agent.personality}
        </p>

        {/* Name tag at bottom */}
        <div style={{
          marginTop: 16, paddingTop: 14,
          borderTop: `1px solid rgba(${rgb}, 0.15)`,
          display: 'flex', alignItems: 'center', gap: 9,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: `rgba(${rgb}, 0.2)`,
            border: `1px solid rgba(${rgb}, 0.45)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: agent.color,
          }}>
            {agent.name.charAt(0)}
          </div>
          <span style={{
            fontSize: 12, color: agent.color,
            fontWeight: 600, letterSpacing: '0.06em',
          }}>
            {agent.name}
          </span>
        </div>
      </div>

      {/* Bubble tail */}
      <div style={{
        position: 'absolute', bottom: 4, left: 32,
        width: 0, height: 0,
        borderLeft: '7px solid transparent',
        borderRight: '7px solid transparent',
        borderTop: `8px solid rgba(${rgb}, 0.28)`,
      }} />
    </div>
  )
}

function SkillsGrid({ skills, color, rgb, isMobile }) {
  return (
    <div style={{
      padding: isMobile ? '16px' : '22px 24px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16,
      backdropFilter: 'blur(6px)',
      display: 'flex',
      flexWrap: 'wrap',
      gap: isMobile ? 8 : 10,
    }}>
      {skills.map(skill => (
        <SkillPill key={skill} skill={skill} color={color} rgb={rgb} />
      ))}
    </div>
  )
}

function SkillPill({ skill, color, rgb }) {
  const [hovered, setHovered] = useState(false)
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-block',
        padding: '7px 15px',
        background: hovered ? `rgba(${rgb}, 0.22)` : `rgba(${rgb}, 0.1)`,
        border: `1px solid ${hovered ? `rgba(${rgb}, 0.65)` : `rgba(${rgb}, 0.28)`}`,
        borderRadius: 100,
        fontSize: 13, fontWeight: 500,
        color: hovered ? '#F0F4FF' : color,
        letterSpacing: '0.02em',
        cursor: 'default',
        transition: 'all 0.2s',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        boxShadow: hovered ? `0 0 18px rgba(${rgb}, 0.32), 0 0 0 1px rgba(${rgb}, 0.08)` : 'none',
      }}
    >
      /{skill}
    </span>
  )
}

function RecipeCard({ recipe, color, rgb, isMobile }) {
  const [hovered, setHovered] = useState(false)
  const icon = getRecipeIcon(recipe.title)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: isMobile ? '14px 16px' : '18px 20px',
        background: hovered ? `rgba(${rgb}, 0.09)` : 'rgba(255, 255, 255, 0.025)',
        border: `1px solid ${hovered ? `rgba(${rgb}, 0.32)` : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 14,
        cursor: 'pointer',
        transition: 'all 0.22s',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        gap: isMobile ? 12 : 16,
        alignItems: 'flex-start',
        boxShadow: hovered ? `0 6px 24px rgba(${rgb}, 0.1)` : 'none',
      }}
    >
      {/* Emoji icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 11, flexShrink: 0,
        background: hovered ? `rgba(${rgb}, 0.22)` : `rgba(${rgb}, 0.1)`,
        border: `1px solid rgba(${rgb}, ${hovered ? 0.35 : 0.2})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
        transition: 'all 0.22s',
        boxShadow: hovered ? `0 0 14px rgba(${rgb}, 0.2)` : 'none',
      }}>
        {icon}
      </div>

      {/* Title + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#E8EFF8',
          marginBottom: 5, lineHeight: 1.4,
        }}>
          {recipe.title}
        </div>
        <div style={{
          fontSize: 13, color: '#4A6080', lineHeight: 1.6,
        }}>
          {recipe.description}
        </div>
      </div>

      {/* Run button -- visual only */}
      {!isMobile && (
        <div style={{
          flexShrink: 0, alignSelf: 'center',
          padding: '5px 12px',
          background: hovered ? `rgba(${rgb}, 0.18)` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hovered ? `rgba(${rgb}, 0.45)` : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 6,
          fontSize: 11, fontWeight: 600,
          color: hovered ? color : '#4A6080',
          letterSpacing: '0.07em', textTransform: 'uppercase',
          transition: 'all 0.22s',
          whiteSpace: 'nowrap',
          fontFamily: "'Inter', sans-serif",
        }}>
          Run
        </div>
      )}
    </div>
  )
}
