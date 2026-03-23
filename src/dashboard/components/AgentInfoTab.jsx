// AgentInfoTab.jsx
// Info tab for the agent sidebar panel.
// Shows the agent's knowledge base: skills, process, strengths, gaps, best work, execution recipes.
// Populated from agentKnowledge.js (sourced from AGENT.md + latest-result.md + journal).

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Activity } from 'lucide-react'
import { getAgentKnowledge } from '../agentKnowledge.js'

// ---- Stats bar (computed from knowledge data + live agentStatus) ------------------

const STATUS_COLORS = {
  WORKING:  '#22C55E',
  IDLE:     '#6B7280',
  BLOCKED:  '#EF4444',
  STUCK:    '#EF4444',
  DONE:     '#3B82F6',
  WAITING:  '#F59E0B',
  PAUSED:   '#F97316',
  STALLED:  '#F59E0B',
}

function StatsBar({ knowledge, agentStatus, accentColor, isDaytime }) {
  const status = agentStatus?.status || 'IDLE'
  const statusColor = STATUS_COLORS[status] || '#6B7280'
  const stats = [
    { label: 'Skills', value: knowledge.skills?.length ?? 0 },
    { label: 'Recipes', value: knowledge.executionRecipes?.length ?? 0 },
    { label: 'Work', value: knowledge.bestWork?.length ?? 0 },
    { label: 'Gaps', value: knowledge.gaps?.length ?? 0, warn: true },
  ]
  return (
    <div style={{ marginBottom: 14 }}>
      {/* Status badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 20,
        background: `${statusColor}12`,
        border: `1px solid ${statusColor}30`,
        marginBottom: 10,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: statusColor,
          flexShrink: 0,
          boxShadow: status === 'WORKING' ? `0 0 6px ${statusColor}` : 'none',
        }} />
        <span style={{
          color: statusColor,
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}>
          {status}
        </span>
      </div>
      {/* Stat chips */}
      <div style={{ display: 'flex', gap: 6 }}>
        {stats.map(({ label, value, warn }) => (
          <div key={label} style={{
            flex: 1,
            padding: '8px 4px',
            borderRadius: 8,
            background: warn && value > 0 ? 'rgba(239,68,68,0.07)' : `${accentColor}0A`,
            border: `1px solid ${warn && value > 0 ? 'rgba(239,68,68,0.2)' : `${accentColor}1A`}`,
            textAlign: 'center',
          }}>
            <div style={{
              color: warn && value > 0 ? '#EF4444' : accentColor,
              fontSize: 18,
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
    </div>
  )
}

// ---- Section header with collapse toggle ----------------------------------------

function SectionHeader({ label, isOpen, onToggle, accentColor, isDaytime }) {
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
        padding: '0 0 8px 0',
        cursor: 'pointer',
        marginBottom: 0,
      }}
    >
      <span style={{
        flex: 1,
        color: '#6B7280',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        textAlign: 'left',
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

// ---- Pill chip (for skills) -------------------------------------------------------

function SkillPill({ name, accentColor, isDaytime }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
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

function BulletItem({ text, accentColor, isDaytime }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: accentColor,
        flexShrink: 0,
        marginTop: 6,
        opacity: 0.7,
      }} />
      <span style={{
        color: isDaytime ? '#A0B4CC' : '#C8D4E0',
        fontSize: 13,
        fontFamily: "'Inter', system-ui, sans-serif",
        lineHeight: 1.5,
      }}>
        {text}
      </span>
    </div>
  )
}

// ---- Execution recipe card --------------------------------------------------------

function RecipeCard({ recipe, accentColor, isDaytime, isOpen, onToggle }) {
  return (
    <div style={{
      borderRadius: 8,
      border: `1px solid ${isDaytime ? 'rgba(59,130,246,0.12)' : `${accentColor}20`}`,
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
          padding: '9px 12px',
          background: isDaytime ? 'rgba(59,130,246,0.06)' : `${accentColor}08`,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{
          color: isDaytime ? '#D4E0EE' : '#E8ECF4',
          fontSize: 13,
          fontWeight: 700,
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
                minWidth: 18, height: 18,
                borderRadius: '50%',
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
                color: accentColor,
                fontFamily: "'JetBrains Mono', monospace",
                flexShrink: 0,
                marginTop: 1,
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
    identity: true,
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

  const sectionDivider = (
    <div style={{
      height: 1,
      background: isDaytime ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.05)',
      margin: '12px 0',
    }} />
  )

  if (!knowledge) {
    // Fallback for agents without a knowledge entry
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ color: isDaytime ? '#A0B4CC' : '#6B7280', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
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

      {/* ---- STATS BAR ---- */}
      <StatsBar knowledge={knowledge} agentStatus={agentStatus} accentColor={accent} isDaytime={isDaytime} />

      {sectionDivider}

      {/* ---- IDENTITY ---- */}
      <div style={{ marginBottom: 12 }}>
        <SectionHeader label="Identity" isOpen={open.identity} onToggle={() => toggle('identity')} accentColor={accent} isDaytime={isDaytime} />
        {open.identity && (
          <div style={{ paddingBottom: 4 }}>
            {/* Superpower highlight box */}
            <div style={{
              padding: '10px 14px',
              background: isDaytime ? 'rgba(59,130,246,0.08)' : `${accent}0C`,
              border: isDaytime ? `1px solid rgba(59,130,246,0.2)` : `1px solid ${accent}30`,
              borderLeft: `3px solid ${accent}`,
              borderRadius: 8,
              marginBottom: 10,
            }}>
              <div style={{
                color: isDaytime ? '#D4E0EE' : '#F0ECE6',
                fontSize: 13,
                fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 1.6,
                fontStyle: 'italic',
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

      {sectionDivider}

      {/* ---- SKILLS ---- */}
      {knowledge.skills && knowledge.skills.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="Skills" isOpen={open.skills} onToggle={() => toggle('skills')} accentColor={accent} isDaytime={isDaytime} />
          {open.skills && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 4 }}>
              {knowledge.skills.map(skill => (
                <SkillPill key={skill} name={skill} accentColor={accent} isDaytime={isDaytime} />
              ))}
            </div>
          )}
        </div>
      )}

      {(knowledge.skills && knowledge.skills.length > 0) && sectionDivider}

      {/* ---- STRENGTHS ---- */}
      {knowledge.strengths && knowledge.strengths.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="Strengths" isOpen={open.strengths} onToggle={() => toggle('strengths')} accentColor={accent} isDaytime={isDaytime} />
          {open.strengths && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
              {knowledge.strengths.map((s, i) => (
                <BulletItem key={i} text={s} accentColor={accent} isDaytime={isDaytime} />
              ))}
            </div>
          )}
        </div>
      )}

      {(knowledge.strengths && knowledge.strengths.length > 0) && sectionDivider}

      {/* ---- GAPS ---- */}
      {knowledge.gaps && knowledge.gaps.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="Gaps" isOpen={open.gaps} onToggle={() => toggle('gaps')} accentColor={accent} isDaytime={isDaytime} />
          {open.gaps && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
              {knowledge.gaps.map((g, i) => (
                <BulletItem key={i} text={g} accentColor="#EF4444" isDaytime={isDaytime} />
              ))}
            </div>
          )}
        </div>
      )}

      {(knowledge.gaps && knowledge.gaps.length > 0) && sectionDivider}

      {/* ---- PROCESS ---- */}
      {knowledge.process && knowledge.process.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="Process" isOpen={open.process} onToggle={() => toggle('process')} accentColor={accent} isDaytime={isDaytime} />
          {open.process && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
              {knowledge.process.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{
                    color: accent,
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 2,
                    opacity: 0.7,
                  }}>
                    {String(i + 1).padStart(2, '0')}
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
              ))}
            </div>
          )}
        </div>
      )}

      {(knowledge.process && knowledge.process.length > 0) && sectionDivider}

      {/* ---- EXECUTION RECIPES ---- */}
      {knowledge.executionRecipes && knowledge.executionRecipes.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="Execution Recipes" isOpen={open.recipes} onToggle={() => toggle('recipes')} accentColor={accent} isDaytime={isDaytime} />
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

      {(knowledge.executionRecipes && knowledge.executionRecipes.length > 0) && sectionDivider}

      {/* ---- BEST WORK ---- */}
      {knowledge.bestWork && knowledge.bestWork.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader label="Best Work" isOpen={open.bestWork} onToggle={() => toggle('bestWork')} accentColor={accent} isDaytime={isDaytime} />
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
                    fontSize: 12,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    lineHeight: 1.5,
                  }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- LATEST RESULT (from live data) ---- */}
      {latestResult && (
        <>
          {sectionDivider}
          <div style={{ marginBottom: 12 }}>
            <SectionHeader label="Latest Result" isOpen={open.latestResult} onToggle={() => toggle('latestResult')} accentColor={accent} isDaytime={isDaytime} />
            {open.latestResult && (
              <div style={{
                padding: '10px 14px',
                background: isDaytime ? 'rgba(59,130,246,0.08)' : `${accent}08`,
                border: isDaytime ? '1px solid rgba(59,130,246,0.15)' : `1px solid ${accent}20`,
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
  )
}
