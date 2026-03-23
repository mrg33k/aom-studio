// AgentInfoTab.jsx
// Info tab for the agent sidebar panel.
// Shows the agent's knowledge base: skills, process, strengths, gaps, best work, execution recipes.
// Populated from agentKnowledge.js (sourced from AGENT.md + latest-result.md + journal).

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Zap, Shield, BookOpen, Star, AlertTriangle, GitBranch } from 'lucide-react'
import { getAgentKnowledge } from '../agentKnowledge.js'

// ---- Status config ---------------------------------------------------------------

const STATUS_CONFIG = {
  WORKING:  { color: '#22C55E', label: 'Working',  glow: true  },
  IDLE:     { color: '#6B7280', label: 'Idle',     glow: false },
  BLOCKED:  { color: '#EF4444', label: 'Blocked',  glow: false },
  STUCK:    { color: '#EF4444', label: 'Stuck',    glow: false },
  DONE:     { color: '#3B82F6', label: 'Done',     glow: false },
  WAITING:  { color: '#F59E0B', label: 'Waiting',  glow: false },
  PAUSED:   { color: '#F97316', label: 'Paused',   glow: false },
  STALLED:  { color: '#F59E0B', label: 'Stalled',  glow: false },
}

// ---- Agent Header (sticky, above scroll) -----------------------------------------

function AgentHeader({ knowledge, agentSlug, agentColor, agentStatus, isDaytime }) {
  const status = agentStatus?.status || 'IDLE'
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  const accent = agentColor || '#6B7280'
  const name = knowledge?.name || (agentSlug ? agentSlug.charAt(0).toUpperCase() + agentSlug.slice(1) : 'Agent')
  const role = knowledge?.role || ''

  return (
    <div style={{
      padding: '14px 16px 12px',
      borderBottom: `1px solid ${isDaytime ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.06)'}`,
      background: isDaytime
        ? `linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(${hexToRgb(accent)},0.03) 100%)`
        : `linear-gradient(135deg, rgba(${hexToRgb(accent)},0.08) 0%, transparent 100%)`,
      flexShrink: 0,
    }}>
      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {/* Color stripe / avatar indicator */}
        <div style={{
          width: 28, height: 28,
          borderRadius: 8,
          background: `${accent}22`,
          border: `1.5px solid ${accent}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            color: accent,
            fontSize: 13,
            fontWeight: 800,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              color: isDaytime ? '#D4E0EE' : '#F0ECE6',
              fontSize: 15,
              fontWeight: 800,
              fontFamily: "'Inter', system-ui, sans-serif",
              lineHeight: 1.2,
            }}>
              {name}
            </span>
            {/* Status badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 7px',
              borderRadius: 20,
              background: `${sc.color}14`,
              border: `1px solid ${sc.color}30`,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: sc.color,
                flexShrink: 0,
                boxShadow: sc.glow ? `0 0 5px ${sc.color}` : 'none',
              }} />
              <span style={{
                color: sc.color,
                fontSize: 9,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                {sc.label}
              </span>
            </div>
          </div>
          {role && (
            <div style={{
              color: '#6B7280',
              fontSize: 11,
              fontFamily: "'Inter', system-ui, sans-serif",
              marginTop: 1,
            }}>
              {role}
            </div>
          )}
        </div>
      </div>

      {/* Superpower line */}
      {knowledge?.superpower && (
        <div style={{
          marginTop: 8,
          padding: '7px 10px',
          borderRadius: 6,
          background: isDaytime ? 'rgba(59,130,246,0.06)' : `${accent}0A`,
          borderLeft: `2px solid ${accent}50`,
        }}>
          <div style={{
            color: isDaytime ? '#B8CCE0' : '#C8D4E0',
            fontSize: 12,
            fontFamily: "'Inter', system-ui, sans-serif",
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}>
            {knowledge.superpower}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Stats row -------------------------------------------------------------------

function StatsRow({ knowledge, accentColor, isDaytime }) {
  const accent = accentColor || '#6B7280'
  const stats = [
    { label: 'Skills',   value: knowledge?.skills?.length ?? 0,          warn: false },
    { label: 'Recipes',  value: knowledge?.executionRecipes?.length ?? 0, warn: false },
    { label: 'Best',     value: knowledge?.bestWork?.length ?? 0,         warn: false },
    { label: 'Gaps',     value: knowledge?.gaps?.length ?? 0,             warn: true  },
  ]
  return (
    <div style={{ display: 'flex', gap: 5, padding: '10px 16px', flexShrink: 0 }}>
      {stats.map(({ label, value, warn }) => (
        <div key={label} style={{
          flex: 1,
          padding: '7px 4px',
          borderRadius: 7,
          background: warn && value > 0 ? 'rgba(239,68,68,0.07)' : `${accent}0A`,
          border: `1px solid ${warn && value > 0 ? 'rgba(239,68,68,0.18)' : `${accent}18`}`,
          textAlign: 'center',
        }}>
          <div style={{
            color: warn && value > 0 ? '#EF4444' : accent,
            fontSize: 17,
            fontWeight: 800,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1,
          }}>
            {value}
          </div>
          <div style={{
            color: '#6B7280',
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginTop: 3,
          }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Section header with collapse toggle -----------------------------------------

function SectionHeader({ label, icon: Icon, isOpen, onToggle, accentColor, isDaytime }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        width: '100%',
        background: 'none',
        border: 'none',
        padding: '0 0 7px 0',
        cursor: 'pointer',
      }}
    >
      {Icon && <Icon size={11} color={accentColor} style={{ flexShrink: 0, opacity: 0.8 }} />}
      <span style={{
        flex: 1,
        color: '#6B7280',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        textAlign: 'left',
      }}>
        {label}
      </span>
      {isOpen
        ? <ChevronDown size={12} color={accentColor} />
        : <ChevronRight size={12} color={accentColor} />
      }
    </button>
  )
}

// ---- Pill chip (for skills) -------------------------------------------------------

function SkillPill({ name, accentColor }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 9px',
      borderRadius: 20,
      background: `${accentColor}14`,
      border: `1.5px solid ${accentColor}40`,
      color: accentColor,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>
      /{name}
    </span>
  )
}

// ---- Bullet item ------------------------------------------------------------------

function BulletItem({ text, accentColor, isDaytime, isWarning }) {
  const color = isWarning ? '#EF4444' : accentColor
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{
        width: 4, height: 4, borderRadius: '50%',
        background: color,
        flexShrink: 0,
        marginTop: 7,
        opacity: isWarning ? 0.9 : 0.6,
      }} />
      <span style={{
        color: isWarning
          ? (isDaytime ? '#E07070' : '#F09090')
          : (isDaytime ? '#A0B4CC' : '#C8D4E0'),
        fontSize: 13,
        fontFamily: "'Inter', system-ui, sans-serif",
        lineHeight: 1.5,
      }}>
        {text}
      </span>
    </div>
  )
}

// ---- Process step ----------------------------------------------------------------

function ProcessStep({ step, index, accentColor, isDaytime }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{
        color: accentColor,
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        flexShrink: 0,
        marginTop: 3,
        opacity: 0.65,
        minWidth: 18,
      }}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <span style={{
        color: isDaytime ? '#A0B4CC' : '#C8D4E0',
        fontSize: 13,
        fontFamily: "'Inter', system-ui, sans-serif",
        lineHeight: 1.5,
      }}>
        {step}
      </span>
    </div>
  )
}

// ---- Execution recipe card -------------------------------------------------------

function RecipeCard({ recipe, accentColor, isDaytime, isOpen, onToggle }) {
  return (
    <div style={{
      borderRadius: 8,
      border: `1px solid ${isDaytime ? 'rgba(59,130,246,0.12)' : `${accentColor}1A`}`,
      overflow: 'hidden',
      marginBottom: 6,
    }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 11px',
          background: isDaytime ? 'rgba(59,130,246,0.06)' : `${accentColor}08`,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: 8,
        }}
      >
        <span style={{
          color: isDaytime ? '#D4E0EE' : '#E8ECF4',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {recipe.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{
            color: '#6B7280',
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {recipe.steps.length}s
          </span>
          {isOpen
            ? <ChevronDown size={12} color={accentColor} />
            : <ChevronRight size={12} color={accentColor} />
          }
        </div>
      </button>
      {isOpen && (
        <div style={{ padding: '8px 11px 10px', background: isDaytime ? 'rgba(59,130,246,0.03)' : 'rgba(0,0,0,0.10)' }}>
          {recipe.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: i < recipe.steps.length - 1 ? 6 : 0 }}>
              <span style={{
                minWidth: 17, height: 17,
                borderRadius: '50%',
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
                color: accentColor,
                fontFamily: "'JetBrains Mono', monospace",
                flexShrink: 0,
                marginTop: 2,
              }}>
                {i + 1}
              </span>
              <span style={{
                color: isDaytime ? '#A0B4CC' : '#C8D4E0',
                fontSize: 12,
                fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 1.5,
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

// ---- Best work item ---------------------------------------------------------------

function BestWorkItem({ text, isDaytime }) {
  return (
    <div style={{
      padding: '7px 11px',
      background: isDaytime ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.04)',
      border: `1px solid ${isDaytime ? 'rgba(34,197,94,0.14)' : 'rgba(34,197,94,0.10)'}`,
      borderLeft: '2.5px solid rgba(34,197,94,0.45)',
      borderRadius: 6,
    }}>
      <span style={{
        color: isDaytime ? '#A0B4CC' : '#C8D4E0',
        fontSize: 12,
        fontFamily: "'Inter', system-ui, sans-serif",
        lineHeight: 1.5,
      }}>
        {text}
      </span>
    </div>
  )
}

// ---- Owns line -------------------------------------------------------------------

function OwnsRow({ text, accentColor, isDaytime }) {
  return (
    <div style={{
      display: 'flex',
      gap: 6,
      alignItems: 'flex-start',
      padding: '6px 10px',
      borderRadius: 6,
      background: isDaytime ? 'rgba(59,130,246,0.04)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isDaytime ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.05)'}`,
    }}>
      <span style={{
        color: accentColor,
        fontSize: 9,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginTop: 2,
        flexShrink: 0,
        opacity: 0.8,
      }}>
        Owns
      </span>
      <span style={{
        color: isDaytime ? '#8BA4C4' : '#8BA4C4',
        fontSize: 12,
        fontFamily: "'Inter', system-ui, sans-serif",
        lineHeight: 1.5,
      }}>
        {text}
      </span>
    </div>
  )
}

// ---- Divider ---------------------------------------------------------------------

function Divider({ isDaytime }) {
  return (
    <div style={{
      height: 1,
      background: isDaytime ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.04)',
      margin: '10px 0',
    }} />
  )
}

// ---- Hex to RGB helper -----------------------------------------------------------

function hexToRgb(hex) {
  if (!hex || !hex.startsWith('#')) return '107,114,128'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

// ---- Main component ---------------------------------------------------------------

export default function AgentInfoTab({
  agentSlug,
  agentColor,
  agentStatus,
  isNightMode,
  latestResult,
}) {
  const isDaytime = isNightMode === false
  const accent = agentColor || '#6B7280'
  const knowledge = getAgentKnowledge(agentSlug)

  // Section open/close state
  const [open, setOpen] = useState({
    skills: true,
    strengths: true,
    gaps: false,
    process: false,
    recipes: false,
    bestWork: false,
    latestResult: false,
  })
  const toggle = (key) => setOpen(prev => ({ ...prev, [key]: !prev[key] }))

  // Recipe open state (per recipe)
  const [openRecipes, setOpenRecipes] = useState({})
  const toggleRecipe = (i) => setOpenRecipes(prev => ({ ...prev, [i]: !prev[i] }))

  if (!knowledge) {
    // Fallback for agents without a knowledge entry
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AgentHeader knowledge={null} agentSlug={agentSlug} agentColor={accent} agentStatus={agentStatus} isDaytime={isDaytime} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ color: isDaytime ? '#A0B4CC' : '#6B7280', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
            Knowledge base coming soon.
          </div>
          {latestResult && (
            <div style={{ marginTop: 16 }}>
              <div style={{ color: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
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
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ---- STICKY HEADER: name, role, status, superpower ---- */}
      <AgentHeader knowledge={knowledge} agentSlug={agentSlug} agentColor={accent} agentStatus={agentStatus} isDaytime={isDaytime} />

      {/* ---- STATS ROW ---- */}
      <StatsRow knowledge={knowledge} accentColor={accent} isDaytime={isDaytime} />

      {/* ---- OWNS ROW (always visible, no collapse) ---- */}
      {knowledge.owns && (
        <div style={{ padding: '0 16px 10px' }}>
          <OwnsRow text={knowledge.owns} accentColor={accent} isDaytime={isDaytime} />
        </div>
      )}

      {/* ---- SCROLLABLE BODY ---- */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 16px' }}>

        {/* ---- SKILLS ---- */}
        {knowledge.skills && knowledge.skills.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <SectionHeader label="Skills" icon={Zap} isOpen={open.skills} onToggle={() => toggle('skills')} accentColor={accent} isDaytime={isDaytime} />
            {open.skills && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingBottom: 4 }}>
                {knowledge.skills.map(skill => (
                  <SkillPill key={skill} name={skill} accentColor={accent} />
                ))}
              </div>
            )}
          </div>
        )}

        {knowledge.skills && knowledge.skills.length > 0 && <Divider isDaytime={isDaytime} />}

        {/* ---- STRENGTHS ---- */}
        {knowledge.strengths && knowledge.strengths.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <SectionHeader label="Strengths" icon={Star} isOpen={open.strengths} onToggle={() => toggle('strengths')} accentColor={accent} isDaytime={isDaytime} />
            {open.strengths && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingBottom: 4 }}>
                {knowledge.strengths.map((s, i) => (
                  <BulletItem key={i} text={s} accentColor={accent} isDaytime={isDaytime} />
                ))}
              </div>
            )}
          </div>
        )}

        {knowledge.strengths && knowledge.strengths.length > 0 && <Divider isDaytime={isDaytime} />}

        {/* ---- GAPS ---- */}
        {knowledge.gaps && knowledge.gaps.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <SectionHeader label="Gaps" icon={AlertTriangle} isOpen={open.gaps} onToggle={() => toggle('gaps')} accentColor={accent} isDaytime={isDaytime} />
            {open.gaps && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingBottom: 4 }}>
                {knowledge.gaps.map((g, i) => (
                  <BulletItem key={i} text={g} accentColor={accent} isDaytime={isDaytime} isWarning />
                ))}
              </div>
            )}
          </div>
        )}

        {knowledge.gaps && knowledge.gaps.length > 0 && <Divider isDaytime={isDaytime} />}

        {/* ---- PROCESS ---- */}
        {knowledge.process && knowledge.process.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <SectionHeader label="Process" icon={GitBranch} isOpen={open.process} onToggle={() => toggle('process')} accentColor={accent} isDaytime={isDaytime} />
            {open.process && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingBottom: 4 }}>
                {knowledge.process.map((step, i) => (
                  <ProcessStep key={i} step={step} index={i} accentColor={accent} isDaytime={isDaytime} />
                ))}
              </div>
            )}
          </div>
        )}

        {knowledge.process && knowledge.process.length > 0 && <Divider isDaytime={isDaytime} />}

        {/* ---- EXECUTION RECIPES ---- */}
        {knowledge.executionRecipes && knowledge.executionRecipes.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <SectionHeader label="Execution Recipes" icon={BookOpen} isOpen={open.recipes} onToggle={() => toggle('recipes')} accentColor={accent} isDaytime={isDaytime} />
            {open.recipes && (
              <div style={{ paddingBottom: 4 }}>
                {knowledge.executionRecipes.map((recipe, i) => (
                  <RecipeCard
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

        {knowledge.executionRecipes && knowledge.executionRecipes.length > 0 && <Divider isDaytime={isDaytime} />}

        {/* ---- BEST WORK ---- */}
        {knowledge.bestWork && knowledge.bestWork.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <SectionHeader label="Best Work" icon={Star} isOpen={open.bestWork} onToggle={() => toggle('bestWork')} accentColor={accent} isDaytime={isDaytime} />
            {open.bestWork && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingBottom: 4 }}>
                {knowledge.bestWork.map((item, i) => (
                  <BestWorkItem key={i} text={item} isDaytime={isDaytime} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- LATEST RESULT (from live data) ---- */}
        {latestResult && (
          <>
            <Divider isDaytime={isDaytime} />
            <div style={{ marginBottom: 10 }}>
              <SectionHeader label="Latest Result" isOpen={open.latestResult} onToggle={() => toggle('latestResult')} accentColor={accent} isDaytime={isDaytime} />
              {open.latestResult && (
                <div style={{
                  padding: '9px 12px',
                  background: isDaytime ? 'rgba(59,130,246,0.07)' : `${accent}08`,
                  border: isDaytime ? '1px solid rgba(59,130,246,0.14)' : `1px solid ${accent}18`,
                  borderRadius: 8,
                }}>
                  <div style={{
                    color: isDaytime ? '#A0B4CC' : '#F0ECE6',
                    fontSize: 12,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {latestResult}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
