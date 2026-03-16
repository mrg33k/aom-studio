// Corner C3.2: System Queue Checklist (REAL-TIME SYSTEM STATE)
// Reads from /api/local/system-queue which parses:
//   - context/launch-queue.md (who should be running)
//   - context/active-missions.md (what's actively running)
//   - context/agent-notifications.md (what just completed)
//   - projects/[agent]/latest-result.md (what each agent last delivered)
// Three sections: RUNNING NOW, JUST COMPLETED, UP NEXT.

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, CheckCircle2, ChevronRight, Clock, Flame,
  Loader, Rocket, Zap, Trophy, ArrowRight,
} from 'lucide-react'
import { AGENTS } from './gridSpec.js'

// ---- Sprite avatar (same as other modes) ----
const SPRITE_AGENTS = ['patrik','mom','alex','steve','steffen','bobby','colton','cleo','tony','jacob','elmo','elon','pixel']
const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

function SpriteAvatar({ agentSlug, size = 32, borderColor, style: extraStyle }) {
  const hasSpriteFile = agentSlug && SPRITE_AGENTS.includes(agentSlug)
  const agent = AGENTS.find(a => a.slug === agentSlug)
  const color = borderColor || agent?.color || '#6B7280'

  if (hasSpriteFile) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', border: `2px solid ${color}`,
        overflow: 'hidden', flexShrink: 0, background: '#0A0F1E',
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
      fontSize: Math.max(8, size * 0.35), fontWeight: 700, color, background: `${color}33`,
      flexShrink: 0, ...extraStyle,
    }}>
      {agent?.name?.charAt(0) || '?'}
    </div>
  )
}

// ---- STATUS BADGE ----
const STATUS_CONFIG = {
  BUILDING:    { color: '#3B9EFF', bg: 'rgba(59,158,255,0.12)', icon: Rocket, label: 'BUILDING' },
  WORKING:     { color: '#3B9EFF', bg: 'rgba(59,158,255,0.12)', icon: Activity, label: 'WORKING' },
  RESEARCHING: { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', icon: Loader, label: 'RESEARCHING' },
  TESTING:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: Zap, label: 'TESTING' },
  DESIGNING:   { color: '#EC4899', bg: 'rgba(236,72,153,0.12)', icon: Flame, label: 'DESIGNING' },
  COACHING:    { color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: Trophy, label: 'COACHING' },
  DONE:        { color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: CheckCircle2, label: 'DONE' },
  IDLE:        { color: '#6B7280', bg: 'rgba(107,114,128,0.08)', icon: Clock, label: 'IDLE' },
  MILESTONE:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: Trophy, label: 'MILESTONE' },
  Running:     { color: '#3B9EFF', bg: 'rgba(59,158,255,0.12)', icon: Activity, label: 'RUNNING' },
}

function StatusBadge({ status, style: extraStyle }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.WORKING
  const Icon = config.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 6,
      background: config.bg, border: `1px solid ${config.color}33`,
      fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 10,
      color: config.color, textTransform: 'uppercase', letterSpacing: '0.08em',
      lineHeight: 1, whiteSpace: 'nowrap', flexShrink: 0,
      ...extraStyle,
    }}>
      <Icon size={11} />
      {config.label}
    </span>
  )
}

// ---- DATA HOOK: fetch /api/local/system-queue ----
function useSystemQueue() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const endpoint = IS_LOCAL
        ? '/api/local/system-queue'
        : '/api/dashboard/status' // Vercel fallback
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      if (json.runningNow) {
        setData(json)
      } else {
        setData(null)
      }
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, IS_LOCAL ? 3000 : 60000)
    return () => clearInterval(timer)
  }, [fetchData])

  return { data, loading, refetch: fetchData }
}

// ---- SECTION HEADER ----
function SectionHeader({ icon: Icon, title, count, color, glowing }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '20px 0 12px',
      borderBottom: `1px solid ${color}22`,
      marginBottom: 12,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: `${color}1A`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: glowing ? `0 0 12px ${color}44` : 'none',
      }}>
        <Icon size={16} color={color} />
      </div>
      <span style={{
        fontFamily: "'Inter Tight', 'Space Grotesk', sans-serif",
        fontSize: 14, fontWeight: 900, color: '#EDF2FA',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        flex: 1,
      }}>
        {title}
      </span>
      {count > 0 && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 900,
          fontSize: 12, color: '#FFF', background: color,
          padding: '3px 9px', borderRadius: 8, lineHeight: 1,
          boxShadow: `0 2px 6px ${color}44`,
          minWidth: 24, textAlign: 'center',
        }}>
          {count}
        </span>
      )}
    </div>
  )
}

// ---- RUNNING NOW CARD ----
function RunningCard({ item, index }) {
  const [isHovered, setIsHovered] = useState(false)
  const agent = AGENTS.find(a => a.slug === item.agentSlug)
  const agentColor = agent?.color || '#3B9EFF'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px',
        background: isHovered ? 'rgba(59,158,255,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isHovered ? `${agentColor}33` : 'rgba(255,255,255,0.04)'}`,
        borderRadius: 12,
        marginBottom: 6,
        transition: 'background 100ms ease, border-color 100ms ease',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: agentColor,
        borderRadius: '12px 0 0 12px',
        boxShadow: `0 0 8px ${agentColor}44`,
      }} />

      {/* Avatar */}
      <SpriteAvatar agentSlug={item.agentSlug} size={36} borderColor={agentColor} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{
            fontFamily: "'Inter Tight', 'Space Grotesk', sans-serif",
            fontSize: 15, fontWeight: 800, color: '#F0ECE6',
          }}>
            {item.agent}
          </span>
          <StatusBadge status={item.status} />
        </div>
        <div style={{
          fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: 400,
          color: '#A8A29E', lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.mission}
        </div>
      </div>

      {/* Pulse indicator for active items */}
      {(item.status !== 'DONE' && item.status !== 'IDLE') && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: agentColor,
          boxShadow: `0 0 6px ${agentColor}`,
          animation: 'systemQueuePulse 2s ease-in-out infinite',
          flexShrink: 0,
        }} />
      )}
    </motion.div>
  )
}

// ---- COMPLETED CARD ----
function CompletedCard({ item, index }) {
  const [isHovered, setIsHovered] = useState(false)
  const agent = AGENTS.find(a => a.slug === item.agentSlug)
  const agentColor = agent?.color || '#22C55E'

  // Parse time from timestamp like "2026-03-16 00:47" or "2026-03-16"
  let timeDisplay = item.timestamp || ''
  const timeMatch = timeDisplay.match(/(\d{1,2}:\d{2})/)
  if (timeMatch) {
    timeDisplay = timeMatch[1]
  } else {
    // Just show the date
    const dateMatch = timeDisplay.match(/\d{4}-\d{2}-\d{2}/)
    if (dateMatch) timeDisplay = dateMatch[0].slice(5) // MM-DD
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        background: isHovered ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.01)',
        border: `1px solid ${isHovered ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)'}`,
        borderRadius: 10,
        marginBottom: 4,
        transition: 'background 100ms ease, border-color 100ms ease',
        cursor: 'default',
        opacity: 0.85,
      }}
    >
      {/* Avatar */}
      <SpriteAvatar agentSlug={item.agentSlug} size={28} borderColor={agentColor} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: "'Inter Tight', 'Space Grotesk', sans-serif",
            fontSize: 13, fontWeight: 700, color: '#A8A29E',
          }}>
            {item.agent}
          </span>
          <StatusBadge status={item.type || 'DONE'} />
        </div>
        <div style={{
          fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, fontWeight: 400,
          color: '#78716C', lineHeight: 1.4, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.summary}
        </div>
      </div>

      {/* Timestamp */}
      {timeDisplay && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
          color: '#4A6080', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {timeDisplay}
        </span>
      )}
    </motion.div>
  )
}

// ---- UP NEXT CARD ----
function UpNextCard({ item, index }) {
  const [isHovered, setIsHovered] = useState(false)
  const agent = AGENTS.find(a => a.slug === item.agentSlug)
  const agentColor = agent?.color || '#6B7280'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        background: isHovered ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
        border: `1px solid ${isHovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
        borderRadius: 10,
        marginBottom: 4,
        transition: 'background 100ms ease, border-color 100ms ease',
        cursor: 'default',
        opacity: 0.7,
      }}
    >
      {/* Avatar */}
      <SpriteAvatar agentSlug={item.agentSlug} size={28} borderColor={`${agentColor}88`} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: "'Inter Tight', 'Space Grotesk', sans-serif",
            fontSize: 13, fontWeight: 700, color: '#A8A29E',
          }}>
            {item.agent}
          </span>
          <ArrowRight size={12} color="#4A6080" />
        </div>
        <div style={{
          fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, fontWeight: 400,
          color: '#78716C', lineHeight: 1.4, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {item.task}
        </div>
      </div>
    </motion.div>
  )
}

// ---- THROUGHPUT BAR ----
function ThroughputBar({ runningCount, doneCount, queuedCount }) {
  const total = runningCount + doneCount + queuedCount
  if (total === 0) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 16px',
      background: 'rgba(10, 15, 30, 0.5)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B9EFF', boxShadow: '0 0 4px #3B9EFF' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#3B9EFF' }}>
          {runningCount} RUNNING
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#22C55E' }}>
          {doneCount} DONE
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6B7280' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#6B7280' }}>
          {queuedCount} QUEUED
        </span>
      </div>
      {/* Progress bar */}
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', height: '100%',
        }}>
          <div style={{ width: `${(runningCount / total) * 100}%`, background: '#3B9EFF', transition: 'width 300ms ease' }} />
          <div style={{ width: `${(doneCount / total) * 100}%`, background: '#22C55E', transition: 'width 300ms ease' }} />
        </div>
      </div>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, color: '#4A6080',
      }}>
        LOCAL
      </span>
    </div>
  )
}

// ---- EMPTY STATE ----
function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <Activity size={48} color="#4A6080" style={{ margin: '0 auto' }} />
      <div style={{
        fontFamily: "'Inter Tight', Space Grotesk, sans-serif", fontWeight: 800, fontSize: 20,
        color: '#F0ECE6', marginTop: 16, textTransform: 'uppercase',
      }}>
        System Idle
      </div>
      <div style={{
        fontFamily: 'Space Grotesk, sans-serif', fontWeight: 400, fontSize: 14,
        color: '#6B7280', marginTop: 8,
      }}>
        {IS_LOCAL ? 'Waiting for agents to launch...' : 'Connect locally for real-time system state'}
      </div>
    </div>
  )
}

// ---- MAIN CHECKLIST MODE COMPONENT ----
export default function ChecklistMode({ agentStatus, isMobile }) {
  const { data, loading } = useSystemQueue()

  const runningNow = data?.runningNow || []
  const justCompleted = data?.justCompleted || []
  const upNext = data?.upNext || []

  // Count active (not DONE/IDLE) items for throughput
  const activeCount = runningNow.filter(r => r.status !== 'DONE' && r.status !== 'IDLE').length
  const doneCount = justCompleted.length
  const queuedCount = upNext.length

  const isEmpty = runningNow.length === 0 && justCompleted.length === 0 && upNext.length === 0

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Throughput bar */}
      <ThroughputBar
        runningCount={activeCount}
        doneCount={doneCount}
        queuedCount={queuedCount}
      />

      {/* Loading state */}
      {loading && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', color: '#6B7280',
          fontFamily: 'Space Grotesk, sans-serif', fontSize: 14,
        }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />
          Loading system queue...
        </div>
      )}

      {/* Scrollable content */}
      {!loading && (
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: isMobile ? '16px' : '16px 40px',
          maxWidth: isMobile ? '100%' : 800,
          margin: '0 auto', width: '100%',
        }}>
          {isEmpty && <EmptyState />}

          {/* RUNNING NOW */}
          {runningNow.length > 0 && (
            <div>
              <SectionHeader
                icon={Activity}
                title="Running Now"
                count={activeCount}
                color="#3B9EFF"
                glowing={activeCount > 0}
              />
              <AnimatePresence>
                {runningNow.map((item, i) => (
                  <RunningCard key={`${item.agentSlug}-${item.agent}-${i}`} item={item} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* JUST COMPLETED */}
          {justCompleted.length > 0 && (
            <div style={{ marginTop: runningNow.length > 0 ? 8 : 0 }}>
              <SectionHeader
                icon={CheckCircle2}
                title="Just Completed"
                count={justCompleted.length}
                color="#22C55E"
                glowing={false}
              />
              <AnimatePresence>
                {justCompleted.map((item, i) => (
                  <CompletedCard key={`done-${item.agentSlug}-${i}`} item={item} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* UP NEXT */}
          {upNext.length > 0 && (
            <div style={{ marginTop: justCompleted.length > 0 ? 8 : 0 }}>
              <SectionHeader
                icon={ArrowRight}
                title="Up Next"
                count={upNext.length}
                color="#6B7280"
                glowing={false}
              />
              <AnimatePresence>
                {upNext.map((item, i) => (
                  <UpNextCard key={`next-${item.agentSlug}-${i}`} item={item} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Bottom spacer */}
          <div style={{ height: 40 }} />
        </div>
      )}

      <style>{`
        @keyframes systemQueuePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
