// Corner C3: Megaboard RPG Mode
// The power-user view. Party screen, quest log, mission feed.
// Design: Steffen's c3-megaboard-mode-spec.md
// Pokemon party screen meets business intelligence. Dark RPG theme.
// TODO(steffen-design): Party card polish -- HP/XP bars need consistent sizing. Agent portraits should use Steffen's latest state sprites (idle, working, done). Level badge positioning varies across cards. [SURVIVES: Megaboard is a data/UI panel, not a rendered game view. Portrait sprites may come from engine atlas but layout logic stays.]
// TODO(steffen-design): Quest log visual design -- entries are text-heavy. Consider adding agent color bars on the left edge of each quest entry for quick scanning. IN PROGRESS / DONE badges need more visual contrast. [SURVIVES: Pure UI/data panel. No engine dependency.]

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, GitCommit, ArrowRight, AlertTriangle, Terminal,
  ChevronLeft, ChevronRight, ChevronDown, Filter,
} from 'lucide-react'
import { AGENTS } from './gridSpec.js'
import { supabase } from './lib/supabase.js'

// Sprite avatar -- fallback used before Supabase resolves (or if unavailable)
const SPRITE_AGENTS_FALLBACK = new Set(['patrik','mom','alex','steve','steffen','bobby','colton','cleo','tony','jacob','elmo','elon','pixel'])

// Generate 2-letter initials from agent name.
// Multi-word: first letter of first + first letter of last word ("John Smith" -> "JS").
// Single word: first 2 letters uppercase ("Bobby" -> "BO", "Mark" -> "MA").
function getInitials(name) {
  if (!name) return '??'
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function SpriteAvatar({ agentSlug, size = 32, borderColor, style: extraStyle, spriteAgents = SPRITE_AGENTS_FALLBACK }) {
  const hasSpriteFile = agentSlug && spriteAgents.has(agentSlug)
  const agent = AGENTS.find(a => a.slug === agentSlug)
  const color = borderColor || agent?.color || '#6B7280'

  if (hasSpriteFile) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', border: `2px solid ${color}`,
        overflow: 'hidden', flexShrink: 0, background: '#070B14',
        ...extraStyle,
      }}>
        <img
          src={`/corner/sprites/${agentSlug}-idle.png`}
          alt=""
          style={{
            width: size * 2, height: size * 2,
            objectFit: 'cover', objectPosition: '15% 5%',
            imageRendering: 'pixelated', display: 'block',
          }}
        />
      </div>
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(10, size * 0.28), fontWeight: 700, color: '#FFFFFF',
      background: color, flexShrink: 0, letterSpacing: '0.02em',
      ...extraStyle,
    }}>
      {getInitials(agent?.name || agentSlug || '?')}
    </div>
  )
}

// Megaboard color system
const MB = {
  bg: '#070B14',
  card: '#0C1120',
  cardHover: '#111828',
  cardActive: '#141E30',
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  borderMedium: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#F0ECE6',
  textSecondary: '#8A847C',
  textMuted: '#4A5060',
  gold: '#C9A84C',
  orange: '#E85D26',
  hpGreen: '#22C55E',
  hpYellow: '#F59E0B',
  hpRed: '#EF4444',
  hpEmpty: '#1A2030',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const now = new Date()
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

// HP Bar component
function HPBar({ percent, label = 'HP' }) {
  const color = percent > 70 ? MB.hpGreen : percent > 40 ? MB.hpYellow : MB.hpRed
  const showPulse = percent < 20

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 12,
        color: MB.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em',
        width: 20, flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{
        flex: 1, height: 8, borderRadius: 4, background: MB.hpEmpty,
        overflow: 'hidden', position: 'relative',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            height: '100%', borderRadius: 4, background: color,
            opacity: showPulse ? undefined : 1,
          }}
        >
          {showPulse && (
            <div style={{
              width: '100%', height: '100%', borderRadius: 4, background: color,
              animation: 'hpPulse 2s ease-in-out infinite',
            }} />
          )}
        </motion.div>
      </div>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 12,
        color, width: 32, textAlign: 'right', flexShrink: 0,
      }}>
        {percent}%
      </span>
    </div>
  )
}

// Agent Character Card (Party Screen)
function AgentCard({ agent, status, onClick, isMobile, spriteAgents }) {
  const [isHovered, setIsHovered] = useState(false)
  const isActive = status?.status === 'WORKING'
  const currentTask = status?.currentTask || 'Idle'

  // Utilization: for C3 MVP, derive from status
  // Active = 85%, Done = 60%, Idle = 20%, Blocked = 10%
  const utilization = status?.status === 'WORKING' ? 85
    : status?.status === 'DONE' ? 60
    : status?.status === 'BLOCKED' ? 10
    : status?.status === 'WAITING' ? 50
    : 20

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(agent.slug)}
      style={{
        width: isMobile ? 160 : '100%',
        height: 140, flexShrink: isMobile ? 0 : undefined,
        background: isHovered ? MB.cardHover : MB.card,
        border: `1px solid ${isActive && isHovered ? `${agent.color}33` : MB.borderSubtle}`,
        borderRadius: 10, padding: 14, cursor: 'pointer',
        transition: 'all 150ms ease',
        boxShadow: isActive && isHovered ? `0 0 12px ${agent.color}14` : 'none',
        scrollSnapAlign: isMobile ? 'start' : undefined,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      {/* Top row: identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SpriteAvatar agentSlug={agent.slug} size={36} borderColor={agent.color} spriteAgents={spriteAgents} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700, fontSize: 16,
            color: MB.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {agent.name}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 12,
            color: MB.textSecondary, textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            {agent.role}
          </div>
        </div>
        {/* Level badge (placeholder) */}
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 12,
          color: MB.gold, background: `${MB.gold}1A`,
          border: `1px solid ${MB.gold}33`,
          borderRadius: 4, padding: '2px 6px', flexShrink: 0,
        }}>
          LV --
        </span>
        {/* Status dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: isActive ? agent.color : status?.status === 'DONE' ? MB.hpGreen : status?.status === 'BLOCKED' ? MB.hpRed : '#6B7280',
        }}>
          {isActive && (
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: agent.color,
              animation: 'megaDotPulse 1.5s ease-in-out infinite',
            }} />
          )}
        </div>
      </div>

      {/* HP Bar */}
      <HPBar percent={utilization} />

      {/* Current quest */}
      <div style={{
        fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400, fontSize: 12,
        color: currentTask === 'Idle' || currentTask === 'Standing by' ? MB.textMuted : MB.textPrimary,
        fontStyle: currentTask === 'Idle' || currentTask === 'Standing by' ? 'italic' : 'normal',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        <span style={{ color: MB.textMuted }}>{'> '}</span>
        {currentTask.length > 40 ? currentTask.slice(0, 40) + '\u2026' : currentTask}
      </div>
    </motion.div>
  )
}

// Quest Log Item
function QuestItem({ quest, onClick, spriteAgents }) {
  const [isHovered, setIsHovered] = useState(false)
  const agent = AGENTS.find(a => a.slug === quest.agentSlug || a.name?.toLowerCase() === quest.agent?.toLowerCase())

  const statusColors = {
    WORKING: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'IN PROGRESS' },
    WAITING: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'QUEUED' },
    BLOCKED: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', label: 'BLOCKED' },
    IDLE: { bg: 'rgba(107,114,128,0.15)', text: '#6B7280', label: 'QUEUED' },
    DONE: { bg: 'rgba(16,185,129,0.15)', text: '#10B981', label: 'DONE' },
  }
  const status = statusColors[quest.status] || statusColors.IDLE

  return (
    <div
      onClick={() => onClick?.(quest.agentSlug)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '12px 14px',
        borderBottom: `1px solid ${MB.borderSubtle}`,
        display: 'flex', gap: 10, cursor: 'pointer',
        background: isHovered ? MB.cardHover : 'transparent',
        transition: 'background 100ms ease',
      }}
    >
      <SpriteAvatar agentSlug={agent?.slug} size={24} borderColor={agent?.color} spriteAgents={spriteAgents} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400, fontSize: 13,
          color: MB.textPrimary,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', lineHeight: 1.4, wordBreak: 'break-word',
        }}>
          {quest.text}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 12,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            color: agent?.color || '#6B7280',
          }}>
            {agent?.name || quest.agent}
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 12,
            textTransform: 'uppercase',
            color: status.text, background: status.bg,
            padding: '1px 6px', borderRadius: 3,
          }}>
            {status.label}
          </span>
          {quest.time && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 400, fontSize: 12,
              color: MB.textMuted,
            }}>
              {timeAgo(quest.time)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Mission Feed Event
function FeedEvent({ event }) {
  const eventIcons = {
    task_complete: { icon: CheckCircle2, color: MB.hpGreen },
    commit: { icon: GitCommit, color: '#3B82F6' },
    handoff: { icon: ArrowRight, color: MB.hpYellow },
    error_recovery: { icon: AlertTriangle, color: MB.hpRed },
    system: { icon: Terminal, color: '#6B7280' },
  }

  const iconInfo = eventIcons[event.type] || eventIcons.system
  const Icon = iconInfo.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '6px 0', minHeight: 32,
        borderBottom: '1px solid rgba(255,255,255,0.02)',
      }}
    >
      <Icon size={16} color={iconInfo.color} style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{
        fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400, fontSize: 12,
        color: MB.textSecondary, flex: 1, minWidth: 0,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', lineHeight: 1.45, wordBreak: 'break-word',
      }}>
        {event.description || event.message}
      </span>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 400, fontSize: 12,
        color: MB.textMuted, flexShrink: 0, marginTop: 1,
      }}>
        {timeAgo(event.time || event.timestamp)}
      </span>
    </motion.div>
  )
}

// Agent Deep-Dive View
function AgentDeepDive({ agent, status, onBack, spriteAgents }) {
  const utilization = status?.status === 'WORKING' ? 85
    : status?.status === 'DONE' ? 60
    : status?.status === 'BLOCKED' ? 10
    : 20

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400, fontSize: 12,
          color: MB.textSecondary, marginBottom: 20,
          padding: 0, transition: 'color 150ms',
        }}
        onMouseEnter={e => e.target.style.color = MB.textPrimary}
        onMouseLeave={e => e.target.style.color = MB.textSecondary}
      >
        <ChevronLeft size={14} />
        Back to Party
      </button>

      {/* Agent header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <SpriteAvatar agentSlug={agent.slug} size={56} borderColor={agent.color} spriteAgents={spriteAgents} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700, fontSize: 22,
              color: MB.textPrimary,
            }}>
              {agent.name}
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 12,
              color: MB.gold, background: `${MB.gold}1A`,
              border: `1px solid ${MB.gold}33`,
              borderRadius: 4, padding: '2px 6px',
            }}>
              LV --
            </span>
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 12,
            color: MB.textSecondary, textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            {agent.role}
          </div>
        </div>
      </div>

      {/* HP + XP bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        <HPBar percent={utilization} label="HP" />
        <HPBar percent={0} label="XP" />
      </div>

      {/* Current Quest */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 12,
          color: MB.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
        }}>
          CURRENT QUEST
        </div>
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400, fontSize: 14,
          color: MB.textPrimary, marginBottom: 4,
        }}>
          {((t) => t.length > 40 ? t.slice(0, 40) + '\u2026' : t)(status?.currentTask || 'Idle')}
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 400, fontSize: 12,
          color: MB.textMuted,
        }}>
          Status: {status?.status || 'IDLE'}
          {status?.timeActive && ` | Started ${timeAgo(status.timeActive)}`}
        </div>
      </div>

      {/* Vitals */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 12,
          color: MB.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
        }}>
          VITALS
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px',
        }}>
          {[
            { label: 'Tasks completed (7d)', value: '--' },
            { label: 'Commits (7d)', value: '--' },
            { label: 'Handoffs received', value: '--' },
            { label: 'Handoffs sent', value: '--' },
            { label: 'Avg task duration', value: '--' },
            { label: 'Uptime (24h)', value: '--' },
          ].map(stat => (
            <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 12,
                color: MB.textMuted, textTransform: 'uppercase',
              }}>
                {stat.label}
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 14,
                color: MB.textPrimary,
              }}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent completions */}
      {status?.lastCompletion && (
        <div>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 12,
            color: MB.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
          }}>
            RECENT COMPLETIONS
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: '#6B7280',
          }}>
            <CheckCircle2 size={14} color={MB.hpGreen} />
            <span style={{ textDecoration: 'line-through' }}>{status.lastCompletion.description}</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: MB.textMuted, marginLeft: 'auto',
            }}>
              {timeAgo(status.lastCompletion.date)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Main Megaboard Mode Component
export default function MegaboardMode({ agentStatus, data, isMobile }) {
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [questFilter, setQuestFilter] = useState('active')
  const [spriteAgents, setSpriteAgents] = useState(SPRITE_AGENTS_FALLBACK)

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('agent_status')
      .select('slug')
      .eq('has_sprite', true)
      .then(({ data: rows, error }) => {
        if (error || !rows?.length) return
        setSpriteAgents(new Set(rows.map(r => r.slug)))
      })
  }, [])

  const agentList = AGENTS.filter(a => a.slug !== 'paige' && a.slug !== 'pixel')

  // Build quests from agent data
  const quests = []
  if (data?.agents) {
    for (const a of data.agents) {
      if (a.currentTask && a.currentTask !== 'Standing by') {
        quests.push({
          agentSlug: a.slug,
          agent: a.name,
          text: a.currentTask,
          status: a.status,
          time: a.timeActive,
        })
      }
    }
  }

  // Filter quests
  const filteredQuests = questFilter === 'all' ? quests
    : questFilter === 'active' ? quests.filter(q => q.status === 'WORKING' || q.status === 'WAITING')
    : questFilter === 'blocked' ? quests.filter(q => q.status === 'BLOCKED')
    : quests

  // Mission feed from pipeline data
  const feed = data?.pipelineFeed || []

  const handleAgentClick = (slug) => {
    setSelectedAgent(slug)
  }

  // If an agent is selected, show deep-dive
  if (selectedAgent) {
    const agent = AGENTS.find(a => a.slug === selectedAgent)
    if (agent) {
      return (
        <div style={{
          height: '100%', overflowY: 'auto', background: MB.bg,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 340px',
          gap: 16,
        }}>
          <AgentDeepDive
            agent={agent}
            status={agentStatus?.[selectedAgent]}
            onBack={() => setSelectedAgent(null)}
            spriteAgents={spriteAgents}
          />
          {/* Quest Log persists on right */}
          {!isMobile && (
            <div style={{ overflowY: 'auto', borderLeft: `1px solid ${MB.borderSubtle}` }}>
              <div style={{ padding: '20px 16px' }}>
                <div style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14,
                  color: MB.gold, textTransform: 'uppercase', letterSpacing: '0.1em',
                  marginBottom: 16,
                }}>
                  QUEST LOG
                </div>
                {quests.map((q, i) => (
                  <QuestItem key={i} quest={q} onClick={handleAgentClick} spriteAgents={spriteAgents} />
                ))}
                {quests.length === 0 && (
                  <div style={{
                    textAlign: 'center', padding: '40px 0',
                    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, color: MB.textSecondary,
                  }}>
                    All quests complete. Your team is idle.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )
    }
  }

  return (
    <div style={{
      height: '100%', overflowY: 'auto', background: MB.bg,
      display: isMobile ? 'flex' : 'grid',
      flexDirection: isMobile ? 'column' : undefined,
      gridTemplateColumns: isMobile ? undefined : '1fr 340px',
      gridTemplateRows: isMobile ? undefined : 'auto 1fr',
      gap: 16, padding: isMobile ? '12px' : '20px 24px',
    }}>
      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Party Screen */}
        <div>
          {/* Section Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: `1px solid ${MB.borderSubtle}`,
            paddingBottom: 12, marginBottom: 16,
          }}>
            <span style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14,
              color: MB.gold, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              PARTY
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 12,
              color: MB.textMuted,
            }}>
              -- XP
            </span>
          </div>

          {/* Agent Cards Grid */}
          {isMobile ? (
            <div style={{
              display: 'flex', gap: 12, overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x mandatory',
              padding: '0 0 8px',
            }}>
              {agentList.map(agent => (
                <AgentCard
                  key={agent.slug}
                  agent={agent}
                  status={agentStatus?.[agent.slug]}
                  onClick={handleAgentClick}
                  isMobile={true}
                  spriteAgents={spriteAgents}
                />
              ))}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
            }}>
              {agentList.map(agent => (
                <AgentCard
                  key={agent.slug}
                  agent={agent}
                  status={agentStatus?.[agent.slug]}
                  onClick={handleAgentClick}
                  isMobile={false}
                  spriteAgents={spriteAgents}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mission Feed */}
        <div>
          {/* Section Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: `1px solid ${MB.borderSubtle}`,
            paddingBottom: 12, marginBottom: 12,
          }}>
            <span style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14,
              color: MB.gold, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              MISSION FEED
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: MB.hpGreen,
                animation: 'megaDotPulse 1.5s ease-in-out infinite',
              }} />
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 12,
                color: MB.hpGreen, textTransform: 'uppercase',
              }}>
                LIVE
              </span>
            </div>
          </div>

          {/* Events */}
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {feed.slice(0, 20).map((event, i) => (
              <FeedEvent key={i} event={event} />
            ))}
            {feed.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '24px 0',
                fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: MB.textSecondary,
              }}>
                No recent events
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Quest Log */}
      <div style={{
        overflowY: 'auto',
        borderLeft: isMobile ? 'none' : `1px solid ${MB.borderSubtle}`,
        gridRow: isMobile ? undefined : '1 / -1',
        gridColumn: isMobile ? undefined : '2',
      }}>
        <div style={{ padding: isMobile ? '0' : '0 16px' }}>
          {/* Section Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <span style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14,
              color: MB.gold, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              QUEST LOG
            </span>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {['all', 'active', 'blocked', 'queued'].map(f => (
              <button
                key={f}
                onClick={() => setQuestFilter(f)}
                style={{
                  padding: '3px 10px', borderRadius: 12,
                  background: questFilter === f ? `${MB.gold}1A` : 'transparent',
                  border: `1px solid ${questFilter === f ? `${MB.gold}33` : MB.borderSubtle}`,
                  color: questFilter === f ? MB.gold : MB.textSecondary,
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 12,
                  textTransform: 'uppercase', cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Quest items */}
          {filteredQuests.map((q, i) => (
            <QuestItem key={i} quest={q} onClick={handleAgentClick} spriteAgents={spriteAgents} />
          ))}
          {filteredQuests.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '40px 0',
              fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, color: MB.textSecondary,
            }}>
              {questFilter === 'all' ? 'All quests complete. Your team is idle.' : `No ${questFilter} quests.`}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes megaDotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
        @keyframes hpPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
