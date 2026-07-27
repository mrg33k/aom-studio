// AgentInfoTab.jsx
// Info tab for the agent sidebar panel.
// Shows polished agent profile (tagline, personality, skills) + knowledge base
// (strengths, gaps, process, best work, execution recipes).
// Data: agentKnowledge.js + agent-profiles.js

import React, { useState, useCallback, useEffect } from 'react'
import { ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react'
import { getAgentKnowledge } from '../agentKnowledge.js'
import agentProfiles from '../../data/agent-profiles.js'
import { getClientId } from '../lib/clientConfig'
import { authFetch } from '../lib/authFetch.js'

// ---- Per-agent taglines -------------------------------------------------------

const TAGLINES = {
  bobby:   "Ship it or it didn't happen.",
  gary:    "If it's not on the board, it doesn't exist.",
  elon:    "The fix is three layers deeper than you think.",
  steffen: "Your font choice is wrong. I can prove it.",
  steve:   "I already have a slide for that.",
  cleo:    "The hook is already in the footage.",
  jacob:   "No cold email if there's a warm angle.",
  tony:    "Every caption is the one that tips the algorithm.",
  alex:    "The pattern is there. You just can't see it yet.",
  elmo:    "It looks fine on desktop. I'll find where it breaks.",
  pixel:   "I've already watched every clip. Ask me anything.",
  rex:     "Already knew. Was about to bring it up.",
}

// ---- Recipe icon lookup -------------------------------------------------------

const RECIPE_ICON_MAP = [
  ['council', '🏛️'], ['hand', '🤝'], ['unstick', '🔓'], ['capture', '📌'],
  ['fix', '🔧'], ['bug', '🐛'], ['iterate', '🔄'], ['screenshot', '📸'],
  ['batch', '📦'], ['health', '💊'], ['score', '📊'], ['review', '👁️'],
  ['report', '📋'], ['audit', '🔍'], ['snapshot', '💾'], ['clean', '🧹'],
  ['onboard', '🚀'], ['brand', '🎨'], ['design', '✏️'], ['thumbnail', '🖼️'],
  ['mood', '🎭'], ['spec', '📐'], ['research', '🔬'], ['pitch', '📈'],
  ['roi', '💰'], ['calculator', '🧮'], ['sharpen', '⚡'], ['cut', '✂️'],
  ['catalog', '🗄️'], ['video', '🎬'], ['color', '🎨'], ['transform', '🪄'],
  ['outreach', '📬'], ['email', '✉️'], ['track', '📊'], ['follow', '🔁'],
  ['competitor', '🕵️'], ['analyze', '📉'], ['package', '📦'], ['market', '📡'],
  ['schedule', '📅'], ['caption', '💬'], ['social', '📱'], ['calendar', '🗓️'],
  ['posting', '📤'], ['deal', '🤝'], ['plan', '🗺️'], ['scan', '🔭'],
  ['search', '🔍'], ['reorganize', '📁'], ['index', '🗃️'], ['write', '✍️'],
  ['performance', '🚀'], ['build', '🏗️'], ['page', '📄'], ['full', '🗂️'],
  ['run', '⚡'],
]

function getRecipeIcon(title) {
  const lower = title.toLowerCase()
  for (const [keyword, icon] of RECIPE_ICON_MAP) {
    if (lower.includes(keyword)) return icon
  }
  return '▶'
}

// ---- Hex to RGB helper --------------------------------------------------------

function hexToRgb(hex) {
  if (!hex || !hex.startsWith('#')) return '107, 114, 128'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

// ---- Inject keyframes once ---------------------------------------------------

let keyframesInjected = false
function injectKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return
  keyframesInjected = true
  if (document.getElementById('agent-info-keyframes')) return
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
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `
  document.head.appendChild(style)
}

// ---- Stats bar ---------------------------------------------------------------

function StatsBar({ knowledge, agentStatus, accentColor }) {
  const status = agentStatus?.status || 'IDLE'
  const statusColor = status === 'ACTIVE' ? '#22C55E' : status === 'STUCK' ? '#EF4444' : '#6B7280'
  const stats = [
    { label: 'Skills', value: knowledge.skills?.length ?? 0 },
    { label: 'Recipes', value: knowledge.executionRecipes?.length ?? 0 },
    { label: 'Work', value: knowledge.bestWork?.length ?? 0 },
    { label: 'Gaps', value: knowledge.gaps?.length ?? 0, warn: true },
  ]
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 20,
        background: `${statusColor}12`, border: `1px solid ${statusColor}30`,
        marginBottom: 10,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: statusColor,
          flexShrink: 0, boxShadow: status === 'ACTIVE' ? `0 0 6px ${statusColor}` : 'none',
        }} />
        <span style={{
          color: statusColor, fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
        }}>
          {status}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {stats.map(({ label, value, warn }) => (
          <div key={label} style={{
            flex: 1, padding: '8px 4px', borderRadius: 8, textAlign: 'center',
            background: warn && value > 0 ? 'rgba(239,68,68,0.07)' : `${accentColor}0A`,
            border: `1px solid ${warn && value > 0 ? 'rgba(239,68,68,0.2)' : `${accentColor}1A`}`,
          }}>
            <div style={{
              color: warn && value > 0 ? '#EF4444' : accentColor,
              fontSize: 18, fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
            }}>
              {value}
            </div>
            <div style={{
              color: '#6B7280', fontSize: 9,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', marginTop: 3,
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Section header with collapse toggle -------------------------------------

function SectionHeader({ label, isOpen, onToggle, accentColor }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        width: '100%', background: 'none', border: 'none',
        padding: '0 0 8px 0', cursor: 'pointer', marginBottom: 0,
      }}
    >
      <span style={{
        flex: 1, color: '#6B7280', fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.12em', textAlign: 'left',
      }}>
        {label}
      </span>
      {isOpen
        ? <ChevronDown size={13} color={accentColor} />
        : <ChevronRight size={13} color={accentColor} />
      }
    </button>
  )
}

// ---- Skill pill with glow hover ----------------------------------------------

function SkillPill({ name, accentColor, rgb }) {
  const [hovered, setHovered] = useState(false)
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 20,
        background: hovered ? `rgba(${rgb}, 0.22)` : `${accentColor}14`,
        border: `1.5px solid ${hovered ? `rgba(${rgb}, 0.65)` : `${accentColor}40`}`,
        color: hovered ? '#F0F4FF' : accentColor,
        fontSize: 11, fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.04em', whiteSpace: 'nowrap',
        cursor: 'default', transition: 'all 0.18s',
        boxShadow: hovered ? `0 0 14px rgba(${rgb}, 0.28), 0 0 0 1px rgba(${rgb}, 0.08)` : 'none',
      }}
    >
      /{name}
    </span>
  )
}

// ---- Bullet item -------------------------------------------------------------

function BulletItem({ text, accentColor, isDaytime }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: accentColor, flexShrink: 0,
        marginTop: 6, opacity: 0.7,
      }} />
      <span style={{
        color: isDaytime ? '#A0B4CC' : '#C8D4E0',
        fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.5,
      }}>
        {text}
      </span>
    </div>
  )
}

// ---- Personality speech bubble -----------------------------------------------

function PersonalityBubble({ agent, rgb, accentColor }) {
  return (
    <div style={{ position: 'relative', paddingBottom: 14, animation: 'agentFadeUp 0.4s ease 0.1s both' }}>
      <div style={{
        padding: '16px 18px 14px',
        background: `linear-gradient(135deg, rgba(${rgb}, 0.1) 0%, rgba(${rgb}, 0.03) 100%)`,
        border: `1px solid rgba(${rgb}, 0.25)`,
        borderRadius: 12,
        backdropFilter: 'blur(8px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative quote mark */}
        <div style={{
          position: 'absolute', top: 4, left: 10,
          fontSize: 48, lineHeight: 1,
          color: `rgba(${rgb}, 0.15)`,
          fontFamily: 'Georgia, serif', fontWeight: 700,
          pointerEvents: 'none', userSelect: 'none',
        }}>
          "
        </div>
        <p style={{
          fontSize: 13, color: '#C0D4EC',
          margin: 0, lineHeight: 1.65,
          paddingTop: 10, paddingLeft: 6,
          fontStyle: 'italic', fontWeight: 400,
        }}>
          {agent.personality}
        </p>
        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: `1px solid rgba(${rgb}, 0.12)`,
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            background: `rgba(${rgb}, 0.18)`,
            border: `1px solid rgba(${rgb}, 0.4)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: accentColor,
          }}>
            {agent.name.charAt(0)}
          </div>
          <span style={{ fontSize: 11, color: accentColor, fontWeight: 600, letterSpacing: '0.05em' }}>
            {agent.name}
          </span>
        </div>
      </div>
      {/* Bubble tail */}
      <div style={{
        position: 'absolute', bottom: 6, left: 24,
        width: 0, height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: `7px solid rgba(${rgb}, 0.25)`,
      }} />
    </div>
  )
}

// ---- Profile recipe card (visual, from agent-profiles data) ------------------

function ProfileRecipeCard({ recipe, accentColor, rgb }) {
  const [hovered, setHovered] = useState(false)
  const icon = getRecipeIcon(recipe.title)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 14px',
        background: hovered ? `rgba(${rgb}, 0.08)` : 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${hovered ? `rgba(${rgb}, 0.3)` : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 10,
        cursor: 'pointer', transition: 'all 0.2s',
        display: 'flex', gap: 11, alignItems: 'flex-start',
        boxShadow: hovered ? `0 4px 18px rgba(${rgb}, 0.08)` : 'none',
        marginBottom: 6,
      }}
    >
      {/* Emoji icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: hovered ? `rgba(${rgb}, 0.2)` : `rgba(${rgb}, 0.09)`,
        border: `1px solid rgba(${rgb}, ${hovered ? 0.32 : 0.18})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, transition: 'all 0.2s',
        boxShadow: hovered ? `0 0 10px rgba(${rgb}, 0.18)` : 'none',
      }}>
        {icon}
      </div>
      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#E8EFF8',
          marginBottom: 3, lineHeight: 1.35,
        }}>
          {recipe.title}
        </div>
        <div style={{ fontSize: 12, color: '#4A6080', lineHeight: 1.5 }}>
          {recipe.description}
        </div>
      </div>
      {/* Run badge */}
      <div style={{
        flexShrink: 0, alignSelf: 'center',
        padding: '4px 9px',
        background: hovered ? `rgba(${rgb}, 0.16)` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? `rgba(${rgb}, 0.42)` : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 5,
        fontSize: 10, fontWeight: 600,
        color: hovered ? accentColor : '#4A6080',
        letterSpacing: '0.07em', textTransform: 'uppercase',
        transition: 'all 0.2s', whiteSpace: 'nowrap',
        fontFamily: "'Inter', sans-serif",
      }}>
        Run
      </div>
    </div>
  )
}

// ---- Execution recipe card (from agentKnowledge, expandable with steps) -----

function ExecutionRecipeCard({ recipe, accentColor, isDaytime, isOpen, onToggle }) {
  return (
    <div style={{
      borderRadius: 8,
      border: `1px solid ${isDaytime ? 'rgba(59,130,246,0.12)' : `${accentColor}20`}`,
      overflow: 'hidden', marginBottom: 6,
    }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '9px 12px',
          background: isDaytime ? 'rgba(59,130,246,0.06)' : `${accentColor}08`,
          border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          color: isDaytime ? '#D4E0EE' : '#E8ECF4',
          fontSize: 13, fontWeight: 700,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {recipe.name}
        </span>
        {isOpen
          ? <ChevronDown size={13} color={accentColor} />
          : <ChevronRight size={13} color={accentColor} />
        }
      </button>
      {isOpen && (
        <div style={{ padding: '8px 12px 10px', background: isDaytime ? 'rgba(59,130,246,0.03)' : 'rgba(0,0,0,0.12)' }}>
          {recipe.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
              <span style={{
                minWidth: 18, height: 18, borderRadius: '50%',
                background: `${accentColor}18`, border: `1px solid ${accentColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: accentColor,
                fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, marginTop: 1,
              }}>
                {i + 1}
              </span>
              <span style={{
                color: isDaytime ? '#A0B4CC' : '#C8D4E0',
                fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.5,
              }}>
                {step}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Editable agent name -----------------------------------------------------

function AgentNameEditor({ agentSlug, currentName, accentColor, isDaytime, onRenamed, isEa }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(currentName || '')
  const [saving, setSaving] = useState(false)

  const save = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === currentName) {
      setEditing(false)
      setDraft(currentName || '')
      return
    }
    setSaving(true)
    try {
      const clientId = getClientId()
      // agent-status PATCH is world-scoped and verified now. A null world would
      // go out as the literal "null" tenant: 403 for a normal member, and a
      // silent match-nothing rename for a super-admin. Bail instead.
      if (!clientId) { setSaving(false); setEditing(false); return }
      // EAs write to display_name (user-provided, sticky); other agents write to name.
      const paramKey = isEa ? 'display_name' : 'name'
      const params = new URLSearchParams({ slug: agentSlug, [paramKey]: trimmed, client_id: clientId })
      // authFetch, not fetch: the endpoint runs verifyTenant on client_id.
      // Membership of that world is the gate, not the super-admin id — Ash and
      // Courtney rename aom agents exactly as Patrik does.
      const resp = await authFetch(`/api/dashboard/agent-status?${params}`, { method: 'PATCH' })
      if (resp.ok) onRenamed?.(trimmed)
    } catch { /* ignore */ }
    setSaving(false)
    setEditing(false)
  }, [agentSlug, draft, currentName, onRenamed, isEa])

  if (!editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{
          color: isDaytime ? '#D4E0EE' : '#F0ECE6',
          fontSize: 18, fontWeight: 800,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {currentName || agentSlug}
        </span>
        <button
          onClick={() => { setDraft(currentName || agentSlug); setEditing(true) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#6B7280', opacity: 0.6 }}
          title="Rename agent"
        >
          <Pencil size={13} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setDraft(currentName || '') } }}
        style={{
          flex: 1,
          background: isDaytime ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${accentColor}50`,
          borderRadius: 6, padding: '5px 10px',
          color: isDaytime ? '#D4E0EE' : '#F0ECE6',
          fontSize: 16, fontWeight: 700,
          fontFamily: "'Inter', system-ui, sans-serif", outline: 'none',
        }}
        disabled={saving}
      />
      <button onClick={save} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#22C55E' }} title="Save">
        <Check size={16} />
      </button>
      <button onClick={() => { setEditing(false); setDraft(currentName || '') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#EF4444' }} title="Cancel">
        <X size={16} />
      </button>
    </div>
  )
}

// ---- Main component ----------------------------------------------------------

export default function AgentInfoTab({
  agentSlug,
  agentColor,
  agentStatus,
  isNightMode,
  latestResult,
  agentDisplayName,
  onAgentRenamed,
}) {
  const isDaytime = isNightMode === false
  const accent = agentColor || '#6B7280'
  const rgb = hexToRgb(accent)
  const knowledge = getAgentKnowledge(agentSlug)
  const profile = agentProfiles.find(a => a.slug === agentSlug?.toLowerCase())
  const tagline = TAGLINES[agentSlug?.toLowerCase()] || ''

  useEffect(() => { injectKeyframes() }, [])

  const [open, setOpen] = useState({
    identity: true,
    skills: true,
    profileRecipes: true,
    strengths: true,
    gaps: false,
    process: false,
    recipes: false,
    bestWork: false,
    latestResult: false,
  })
  const toggle = (key) => setOpen(prev => ({ ...prev, [key]: !prev[key] }))

  const [openRecipes, setOpenRecipes] = useState({})
  const toggleRecipe = (i) => setOpenRecipes(prev => ({ ...prev, [i]: !prev[i] }))

  const divider = (
    <div style={{
      height: 1,
      background: isDaytime ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.05)',
      margin: '12px 0',
    }} />
  )

  if (!knowledge) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {profile && tagline && (
          <div style={{ fontSize: 12, color: '#7A94B8', fontStyle: 'italic', marginBottom: 10 }}>
            {tagline}
          </div>
        )}
        {profile && (
          <PersonalityBubble agent={profile} rgb={rgb} accentColor={accent} />
        )}
        <div style={{ color: isDaytime ? '#A0B4CC' : '#6B7280', fontSize: 13, fontFamily: "'Inter', sans-serif", marginTop: 12 }}>
          Knowledge base coming soon.
        </div>
        {latestResult && (
          <div style={{ marginTop: 16 }}>
            <div style={{ color: '#6B7280', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
              Latest Result
            </div>
            <div style={{
              padding: '10px 14px',
              background: isDaytime ? 'rgba(59,130,246,0.08)' : `${accent}08`,
              border: isDaytime ? '1px solid rgba(59,130,246,0.15)' : `1px solid ${accent}20`,
              borderRadius: 8,
              color: isDaytime ? '#A0B4CC' : '#F0ECE6',
              fontSize: 13, fontFamily: "'Inter', sans-serif", lineHeight: 1.5,
            }}>
              {latestResult}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>

      {/* ---- NAME (editable) ---- */}
      <AgentNameEditor
        agentSlug={agentSlug}
        currentName={agentDisplayName || agentSlug?.charAt(0).toUpperCase() + agentSlug?.slice(1)}
        accentColor={accent}
        isDaytime={isDaytime}
        onRenamed={onAgentRenamed}
        isEa={agentStatus?.is_ea || false}
      />

      {/* ---- TAGLINE ---- */}
      {tagline && (
        <div style={{
          fontSize: 12, color: '#7A94B8',
          fontStyle: 'italic', marginBottom: 14, lineHeight: 1.5,
          animation: 'agentFadeUp 0.35s ease both',
        }}>
          "{tagline}"
        </div>
      )}

      {/* ---- PERSONALITY BUBBLE ---- */}
      {profile?.personality && (
        <>
          <PersonalityBubble agent={profile} rgb={rgb} accentColor={accent} />
          {divider}
        </>
      )}

      {/* ---- IDENTITY ---- */}
      <div style={{ marginBottom: 12 }}>
        <SectionHeader label="Identity" isOpen={open.identity} onToggle={() => toggle('identity')} accentColor={accent} />
        {open.identity && (
          <div style={{ paddingBottom: 4 }}>
            <div style={{
              padding: '10px 14px',
              background: isDaytime ? 'rgba(59,130,246,0.08)' : `${accent}0C`,
              border: isDaytime ? `1px solid rgba(59,130,246,0.2)` : `1px solid ${accent}30`,
              borderLeft: `3px solid ${accent}`,
              borderRadius: 8, marginBottom: 10,
            }}>
              <div style={{
                color: isDaytime ? '#D4E0EE' : '#F0ECE6',
                fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 1.6, fontStyle: 'italic',
              }}>
                {knowledge.superpower}
              </div>
            </div>
            {knowledge.owns && (
              <div style={{ color: isDaytime ? '#8BA4C4' : '#8BA4C4', fontSize: 12, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                <span style={{ color: '#6B7280', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.1em' }}>Owns: </span>
                {knowledge.owns}
              </div>
            )}
          </div>
        )}
      </div>

      {divider}

      {/* ---- SKILLS ---- */}
      {knowledge.skills && knowledge.skills.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="Skills" isOpen={open.skills} onToggle={() => toggle('skills')} accentColor={accent} />
          {open.skills && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 4 }}>
              {knowledge.skills.map(skill => (
                <SkillPill key={skill} name={skill} accentColor={accent} rgb={rgb} />
              ))}
            </div>
          )}
        </div>
      )}

      {knowledge.skills && knowledge.skills.length > 0 && divider}

      {/* ---- PROFILE RECIPES (from agent-profiles.js -- visual cards) ---- */}
      {profile?.recipes && profile.recipes.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="What I Handle" isOpen={open.profileRecipes} onToggle={() => toggle('profileRecipes')} accentColor={accent} />
          {open.profileRecipes && (
            <div style={{ paddingBottom: 4 }}>
              {profile.recipes.map((recipe, i) => (
                <ProfileRecipeCard key={i} recipe={recipe} accentColor={accent} rgb={rgb} />
              ))}
            </div>
          )}
        </div>
      )}

      {profile?.recipes && profile.recipes.length > 0 && divider}

      {/* ---- STRENGTHS ---- */}
      {knowledge.strengths && knowledge.strengths.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="Strengths" isOpen={open.strengths} onToggle={() => toggle('strengths')} accentColor={accent} />
          {open.strengths && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
              {knowledge.strengths.map((s, i) => (
                <BulletItem key={i} text={s} accentColor={accent} isDaytime={isDaytime} />
              ))}
            </div>
          )}
        </div>
      )}

      {knowledge.strengths && knowledge.strengths.length > 0 && divider}

      {/* ---- GAPS ---- */}
      {knowledge.gaps && knowledge.gaps.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="Gaps" isOpen={open.gaps} onToggle={() => toggle('gaps')} accentColor={accent} />
          {open.gaps && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
              {knowledge.gaps.map((g, i) => (
                <BulletItem key={i} text={g} accentColor="#EF4444" isDaytime={isDaytime} />
              ))}
            </div>
          )}
        </div>
      )}

      {knowledge.gaps && knowledge.gaps.length > 0 && divider}

      {/* ---- PROCESS ---- */}
      {knowledge.process && knowledge.process.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="Process" isOpen={open.process} onToggle={() => toggle('process')} accentColor={accent} />
          {open.process && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
              {knowledge.process.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{
                    color: accent, fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                    flexShrink: 0, marginTop: 2, opacity: 0.7,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    color: isDaytime ? '#A0B4CC' : '#C8D4E0',
                    fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.5,
                  }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {knowledge.process && knowledge.process.length > 0 && divider}

      {/* ---- EXECUTION RECIPES (from agentKnowledge -- expandable steps) ---- */}
      {knowledge.executionRecipes && knowledge.executionRecipes.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="Execution Recipes" isOpen={open.recipes} onToggle={() => toggle('recipes')} accentColor={accent} />
          {open.recipes && (
            <div style={{ paddingBottom: 4 }}>
              {knowledge.executionRecipes.map((recipe, i) => (
                <ExecutionRecipeCard
                  key={i}
                  recipe={recipe}
                  accentColor={accent}
                  isDaytime={isDaytime}
                  isOpen={!!openRecipes[i]}
                  onToggle={() => toggleRecipe(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {knowledge.executionRecipes && knowledge.executionRecipes.length > 0 && divider}

      {/* ---- BEST WORK ---- */}
      {knowledge.bestWork && knowledge.bestWork.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="Best Work" isOpen={open.bestWork} onToggle={() => toggle('bestWork')} accentColor={accent} />
          {open.bestWork && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
              {knowledge.bestWork.map((item, i) => (
                <div key={i} style={{
                  padding: '8px 12px',
                  background: isDaytime ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.04)',
                  border: `1px solid ${isDaytime ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)'}`,
                  borderLeft: '3px solid rgba(34,197,94,0.5)',
                  borderRadius: 6,
                }}>
                  <span style={{
                    color: isDaytime ? '#A0B4CC' : '#C8D4E0',
                    fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.5,
                  }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- LATEST RESULT ---- */}
      {latestResult && (
        <>
          {divider}
          <div style={{ marginBottom: 12 }}>
            <SectionHeader label="Latest Result" isOpen={open.latestResult} onToggle={() => toggle('latestResult')} accentColor={accent} />
            {open.latestResult && (
              <div style={{
                padding: '10px 14px',
                background: isDaytime ? 'rgba(59,130,246,0.08)' : `${accent}08`,
                border: isDaytime ? '1px solid rgba(59,130,246,0.15)' : `1px solid ${accent}20`,
                borderRadius: 8,
              }}>
                <div style={{
                  color: isDaytime ? '#A0B4CC' : '#F0ECE6',
                  fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif",
                  lineHeight: 1.6, whiteSpace: 'pre-wrap',
                }}>
                  {latestResult}
                </div>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  )
}
