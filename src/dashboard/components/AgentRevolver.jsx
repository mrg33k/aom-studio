// AgentRevolver.jsx
// Extracted from GameHUD.jsx (god file split 2/6)
// Contains: PlumbobClipDef, AgentPortrait, AgentRoster, SPRITE_AGENTS
//
// DO NOT modify GameHUD.jsx -- this is a pure extraction.
// Wire up: import { PALETTE, HUD, useStatusDot } from './HUDConstants.jsx' once that file is created.

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Pause, Clock, X, Users } from 'lucide-react'
import { AGENTS } from '../gridSpec.js'
import { PALETTE, HUD, useStatusDot } from './HUDConstants.jsx'
import { supabase } from '../lib/supabase.js'

// ---- SIMS PLUMBOB SVG CLIP PATH (the iconic diamond shape) ------------------
export function PlumbobClipDef({ id, size }) {
  const w = size
  const h = size
  const cx = w / 2
  const topPoint = h * 0.02
  const shoulderY = h * 0.22
  const maxWidth = w * 0.48
  const bottomY = h * 0.72

  return (
    <defs>
      <clipPath id={id}>
        <path d={`
          M ${cx} ${topPoint}
          L ${cx + maxWidth} ${shoulderY}
          L ${cx + maxWidth} ${bottomY}
          Q ${cx + maxWidth} ${h * 0.98}, ${cx} ${h * 0.98}
          Q ${cx - maxWidth} ${h * 0.98}, ${cx - maxWidth} ${bottomY}
          L ${cx - maxWidth} ${shoulderY}
          Z
        `} />
      </clipPath>
    </defs>
  )
}

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

// ---- SPRITE AGENTS (who has a sprite image in /corner/sprites/) ----------------
const SPRITE_AGENTS_FALLBACK = ['patrik','mom','alex','steve','steffen','bobby','colton','cleo','tony','jacob','elmo','elon','pixel']
export const SPRITE_AGENTS = SPRITE_AGENTS_FALLBACK // keep export for external consumers

// Module-level cache: one fetch shared across all AgentPortrait/AgentRoster instances
let _spriteCache = null
let _spriteFetching = false
const _spriteListeners = new Set()

function _fetchSpriteAgents() {
  if (_spriteCache || _spriteFetching || !supabase) return
  _spriteFetching = true
  supabase
    .from('agent_status')
    .select('slug')
    .eq('has_sprite', true)
    .then(({ data, error }) => {
      _spriteFetching = false
      if (!error && data && data.length > 0) {
        _spriteCache = data.map(r => r.slug)
        _spriteListeners.forEach(fn => fn(_spriteCache))
      }
    })
}

function useSpriteAgents() {
  const [agents, setAgents] = useState(_spriteCache || SPRITE_AGENTS_FALLBACK)
  useEffect(() => {
    if (_spriteCache) { setAgents(_spriteCache); return }
    _spriteListeners.add(setAgents)
    _fetchSpriteAgents()
    return () => _spriteListeners.delete(setAgents)
  }, [])
  return agents
}

// ---- AGENT PORTRAIT (LARGER: 52px desktop, plumbob shape, blue idle ring) ---

export function AgentPortrait({ slug, size = 58, status = 'IDLE', onClick, onContextMenu, showName = false, index = 0 }) {
  const spriteAgents = useSpriteAgents()
  const statusDot = useStatusDot()
  const agent = AGENTS.find(a => a.slug === slug)
  const cfg = statusDot[status] || statusDot.IDLE
  const color = agent?.color || '#4A6080'
  const isActive = status === 'WORKING'
  const isBlocked = status === 'BLOCKED'
  const isDone = status === 'DONE'
  const isWaiting = status === 'WAITING'
  const isPaused = status === 'PAUSED'
  const hasSpriteFile = slug && spriteAgents.includes(slug)
  const clipId = `plumbob-clip-${slug}`

  const w = size
  const h = size
  const cx = w / 2
  const topPoint = h * 0.02
  const shoulderY = h * 0.22
  const maxWidth = w * 0.48
  const bottomY = h * 0.72

  const outlinePath = `
    M ${cx} ${topPoint}
    L ${cx + maxWidth} ${shoulderY}
    L ${cx + maxWidth} ${bottomY}
    Q ${cx + maxWidth} ${h * 0.98}, ${cx} ${h * 0.98}
    Q ${cx - maxWidth} ${h * 0.98}, ${cx - maxWidth} ${bottomY}
    L ${cx - maxWidth} ${shoulderY}
    Z
  `

  return (
    <motion.div
      onClick={() => onClick?.(slug)}
      onContextMenu={(e) => onContextMenu?.(e, slug)}
      whileHover={{ scale: 1.18, y: -7, rotate: 2, transition: { type: 'spring', stiffness: 500, damping: 10, mass: 0.5 } }}
      whileTap={{ scale: 0.85, y: 3, scaleY: 0.9, scaleX: 1.05, transition: { type: 'spring', stiffness: 700, damping: 15 } }}
      title={`${agent?.name || slug}: ${cfg.label}`}
      style={{
        position: 'relative',
        cursor: 'pointer',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {/* Active agent glow - blue pulse per spec */}
      {isActive && (
        <div style={{
          position: 'absolute', inset: -8,
          background: `radial-gradient(ellipse at center, ${cfg.glow} 0%, transparent 70%)`,
          animation: 'hudActiveGlow 2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Blocked agent red pulse glow */}
      {isBlocked && (
        <div style={{
          position: 'absolute', inset: -6,
          background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.3) 0%, transparent 70%)',
          animation: 'hudBlockedPulse 1.5s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Waiting/thinking amber shimmer */}
      {isWaiting && (
        <div style={{
          position: 'absolute', inset: -5,
          background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.2) 0%, transparent 70%)',
          animation: 'hudWaitingPulse 2.5s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
        <PlumbobClipDef id={clipId} size={size} />

        {/* Background fill inside plumbob */}
        <path d={outlinePath} fill={`${color}20`} />

        {/* Agent sprite image clipped to plumbob shape */}
        {hasSpriteFile ? (
          <image
            href={`/corner/sprites/${slug}-idle.png`}
            x={-size * 0.15}
            y={-size * 0.05}
            width={size * 1.35}
            height={size * 1.35}
            clipPath={`url(#${clipId})`}
            style={{ imageRendering: 'pixelated' }}
            preserveAspectRatio="xMidYMin slice"
          />
        ) : (
          <g clipPath={`url(#${clipId})`}>
            <rect x={0} y={0} width={size} height={size} fill={color} fillOpacity="0.85" />
            <text
              x={cx} y={h * 0.58}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#FFFFFF"
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight="700"
              fontSize={Math.max(10, size * 0.28)}
              letterSpacing="0.02em"
            >
              {getInitials(agent?.name || slug || '?')}
            </text>
          </g>
        )}

        {/* Plumbob outline stroke - status colored, thicker for active states */}
        <path
          d={outlinePath}
          fill="none"
          stroke={cfg.ring}
          strokeWidth={isActive ? 2.8 : isBlocked ? 2.5 : isDone ? 2.2 : 1.8}
          strokeLinejoin="round"
          style={{
            filter: (isActive || isBlocked) ? `drop-shadow(0 0 6px ${cfg.glow})` : isDone ? `drop-shadow(0 0 4px ${cfg.glow})` : 'none',
            transition: 'all 300ms ease',
          }}
        />

        {/* Inner highlight stroke for depth */}
        <path
          d={outlinePath}
          fill="none"
          stroke="rgba(100,180,255,0.1)"
          strokeWidth={0.5}
          strokeLinejoin="round"
          transform={`translate(0.5, 0.5) scale(${(size - 1) / size})`}
          style={{ transformOrigin: 'center' }}
        />
      </svg>

      {/* Status indicator at bottom center - varies by status */}
      {isDone ? (
        /* DONE: green checkmark badge */
        <div style={{
          position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: '#22C55E',
          border: `2px solid ${HUD.panelBgSolid}`,
          boxShadow: '0 0 8px rgba(34,197,94,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={8} color="#FFF" strokeWidth={3} />
        </div>
      ) : isPaused ? (
        /* PAUSED: orange pause bars */
        <div style={{
          position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: '#F97316',
          border: `2px solid ${HUD.panelBgSolid}`,
          boxShadow: '0 0 8px rgba(249,115,22,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Pause size={7} color="#FFF" strokeWidth={3} />
        </div>
      ) : isWaiting ? (
        /* WAITING: amber spinning indicator */
        <div style={{
          position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: '#F59E0B',
          border: `2px solid ${HUD.panelBgSolid}`,
          boxShadow: '0 0 8px rgba(245,158,11,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'hudWaitingSpin 3s linear infinite',
        }}>
          <Clock size={7} color="#FFF" strokeWidth={3} />
        </div>
      ) : (
        /* DEFAULT: status dot */
        <div style={{
          position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)',
          width: 10, height: 10, borderRadius: '50%',
          background: cfg.color,
          border: `2px solid ${HUD.panelBgSolid}`,
          boxShadow: `0 0 8px ${cfg.glow}`,
          animation: isActive ? 'hudStatusPulse 1.5s ease-in-out infinite' : 'none',
        }} />
      )}

      {/* Blocked X badge - top right, LARGER and more visible */}
      {isBlocked && (
        <div style={{
          position: 'absolute', top: -3, right: -3,
          width: 18, height: 18, borderRadius: '50%',
          background: '#EF4444', border: `2px solid ${HUD.panelBgSolid}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 10px rgba(239,68,68,0.6)',
          animation: 'hudBlockedBadge 2s ease-in-out infinite',
        }}>
          <X size={10} color="#FFF" strokeWidth={3} />
        </div>
      )}

      {/* Agent name below portrait (optional) */}
      {showName && agent?.name && (
        <div style={{
          position: 'absolute', top: size + 2, left: '50%', transform: 'translateX(-50%)',
          fontSize: 12, fontWeight: 600, color: cfg.color,
          fontFamily: "'Inter Tight', sans-serif",
          whiteSpace: 'nowrap', textAlign: 'center',
          letterSpacing: '0.01em',
          textShadow: `0 0 8px ${cfg.glow}`,
        }}>
          {agent.name}
        </div>
      )}
    </motion.div>
  )
}

// ---- AGENT ROSTER (Main agent prominent + expand + right-click revolver) ----
// Patrik directive: Show the MAIN agent (Elon) prominently. Expand button to see all.
// Right-click on an agent = paint board / revolver pop-out (fan out in arc).
const DEFAULT_MAIN_AGENT = 'elon'

export function AgentRoster({ agentStatus, onAgentClick, onAgentContextMenu }) {
  const spriteAgents = useSpriteAgents()
  const statusDot = useStatusDot()
  const [expanded, setExpanded] = useState(false)
  const [revolverAgent, setRevolverAgent] = useState(null) // which agent triggered revolver
  const [revolverPos, setRevolverPos] = useState({ x: 0, y: 0 })
  const [searchFilter, setSearchFilter] = useState('')
  const revolverRef = useRef(null)

  const sortedAgents = useMemo(() => {
    const statusPriority = { WORKING: 0, BLOCKED: 1, WAITING: 2, PAUSED: 3, DONE: 4, IDLE: 5 }
    return [...AGENTS]
      .filter(a => a.slug !== 'paige' && a.slug !== 'pixel')
      .sort((a, b) => {
        const sa = agentStatus?.[a.slug]?.status || 'IDLE'
        const sb = agentStatus?.[b.slug]?.status || 'IDLE'
        return (statusPriority[sa] || 5) - (statusPriority[sb] || 5)
      })
  }, [agentStatus])

  const mainAgent = AGENTS.find(a => a.slug === DEFAULT_MAIN_AGENT) || AGENTS[0]
  const mainStatus = agentStatus?.[mainAgent?.slug]?.status || 'IDLE'
  const mainCfg = statusDot[mainStatus] || statusDot.IDLE
  const mainHasSpr = mainAgent && spriteAgents.includes(mainAgent.slug)

  // Close revolver on click outside
  useEffect(() => {
    if (!revolverAgent) return
    const handler = (e) => {
      if (revolverRef.current && !revolverRef.current.contains(e.target)) {
        setRevolverAgent(null)
        setSearchFilter('')
      }
    }
    const keyHandler = (e) => {
      if (e.key === 'Escape') { setRevolverAgent(null); setSearchFilter('') }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [revolverAgent])

  // Right-click handler for revolver pop-out
  const handleRightClick = useCallback((e, slug) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setRevolverPos({ x: rect.left + rect.width / 2, y: rect.top })
    setRevolverAgent(slug)
    setSearchFilter('')
  }, [])

  const filteredAgents = useMemo(() => {
    if (!searchFilter.trim()) return sortedAgents
    const q = searchFilter.toLowerCase()
    return sortedAgents.filter(a => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q))
  }, [sortedAgents, searchFilter])

  return (
    <div style={{
      display: 'flex', gap: 6, alignItems: 'center',
      padding: '0 2px', position: 'relative',
    }}>
      {/* MAIN agent: prominent, 52px plumbob */}
      <motion.div
        onClick={() => onAgentClick?.(mainAgent.slug)}
        onContextMenu={(e) => handleRightClick(e, mainAgent.slug)}
        whileHover={{ scale: 1.12, y: -4, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
        whileTap={{ scale: 0.9, y: 2 }}
        title={`${mainAgent.name}: ${mainCfg.label}`}
        style={{ cursor: 'pointer', position: 'relative', width: 52, height: 52, flexShrink: 0 }}
      >
        {mainStatus === 'WORKING' && (
          <div style={{
            position: 'absolute', inset: -6,
            background: `radial-gradient(ellipse at center, ${mainCfg.glow} 0%, transparent 70%)`,
            animation: 'hudActiveGlow 2s ease-in-out infinite', pointerEvents: 'none',
          }} />
        )}
        <svg width={52} height={52} viewBox="0 0 52 52" style={{ position: 'absolute', inset: 0 }}>
          <PlumbobClipDef id="main-agent-clip" size={52} />
          <path d={`M 26 ${52*0.02} L ${26+52*0.48} ${52*0.22} L ${26+52*0.48} ${52*0.72} Q ${26+52*0.48} ${52*0.98}, 26 ${52*0.98} Q ${26-52*0.48} ${52*0.98}, ${26-52*0.48} ${52*0.72} L ${26-52*0.48} ${52*0.22} Z`} fill={`${mainAgent.color}20`} />
          {mainHasSpr ? (
            <image href={`/corner/sprites/${mainAgent.slug}-idle.png`} x={-52*0.15} y={-52*0.05} width={52*1.35} height={52*1.35} clipPath="url(#main-agent-clip)" style={{ imageRendering: 'pixelated' }} preserveAspectRatio="xMidYMin slice" />
          ) : (
            <rect x={0} y={0} width={52} height={52} fill={mainAgent.color} fillOpacity="0.85" clipPath="url(#main-agent-clip)" /><text x={26} y={52*0.58} textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize={16} letterSpacing="0.02em">{getInitials(mainAgent.name || mainAgent.slug || '?')}</text>
          )}
          <path d={`M 26 ${52*0.02} L ${26+52*0.48} ${52*0.22} L ${26+52*0.48} ${52*0.72} Q ${26+52*0.48} ${52*0.98}, 26 ${52*0.98} Q ${26-52*0.48} ${52*0.98}, ${26-52*0.48} ${52*0.72} L ${26-52*0.48} ${52*0.22} Z`} fill="none" stroke={mainCfg.ring} strokeWidth={2.5} strokeLinejoin="round" style={{ filter: mainStatus === 'WORKING' ? `drop-shadow(0 0 6px ${mainCfg.glow})` : 'none' }} />
        </svg>
        <div style={{
          position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: mainCfg.color,
          border: `2px solid ${HUD.panelBgSolid}`, boxShadow: `0 0 10px ${mainCfg.glow}`,
          animation: mainStatus === 'WORKING' ? 'hudStatusPulse 1.5s ease-in-out infinite' : 'none',
        }} />
      </motion.div>

      {/* Expand button to see all agents -- VEGAS SIZE 36px */}
      <motion.button
        onClick={() => setExpanded(!expanded)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: expanded ? 'rgba(59,158,255,0.15)' : 'rgba(100,180,255,0.06)',
          border: `2px solid ${expanded ? HUD.accent + '44' : HUD.divider}`,
          color: expanded ? HUD.accent : HUD.textMuted,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 150ms ease',
          fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
        }}
        title="Show all agents"
      >
        <Users size={18} />
      </motion.button>

      {/* Expanded: BIGGER 40px portraits for other agents -- VEGAS RULE */}
      <AnimatePresence>
        {expanded && sortedAgents.filter(a => a.slug !== mainAgent.slug).map((agent, idx) => {
          const status = agentStatus?.[agent.slug]?.status || 'IDLE'
          const cfg = statusDot[status] || statusDot.IDLE
          const hasSpr = spriteAgents.includes(agent.slug)
          return (
            <motion.div
              key={agent.slug}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: idx * 0.02 }}
              onClick={() => onAgentClick?.(agent.slug)}
              onContextMenu={(e) => handleRightClick(e, agent.slug)}
              whileHover={{ scale: 1.2, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
              title={`${agent.name}: ${cfg.label}`}
              style={{
                width: 40, height: 40, minWidth: 40, minHeight: 40,
                borderRadius: '50%',
                border: `2.5px solid ${cfg.ring}`,
                overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                background: '#0A0F1E',
                boxShadow: status === 'WORKING' ? `0 0 12px ${cfg.glow}` : status === 'BLOCKED' ? `0 0 10px rgba(239,68,68,0.4)` : 'none',
                animation: status === 'WORKING' ? 'hudMiniDotPulse 2s ease-in-out infinite' : status === 'BLOCKED' ? 'hudMiniDotBlocked 1.5s ease-in-out infinite' : 'none',
                opacity: status === 'IDLE' ? 0.6 : 1,
              }}
            >
              {hasSpr ? (
                <img src={`/corner/sprites/${agent.slug}-idle.png`} alt=""
                  width={60} height={60}
                  style={{ width: 60, height: 60, objectFit: 'cover', objectPosition: '15% 5%', imageRendering: 'pixelated', display: 'block', marginLeft: -8, marginTop: -5 }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#FFFFFF', background: agent.color || '#4A6080', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.02em' }}>
                  {getInitials(agent.name || agent.slug || '?')}
                </div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* REVOLVER POP-OUT (right-click on any agent bubble) */}
      <AnimatePresence>
        {revolverAgent && (
          <motion.div
            ref={revolverRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{
              position: 'fixed',
              left: Math.min(revolverPos.x - 120, window.innerWidth - 260),
              top: revolverPos.y - 260,
              width: 240,
              background: 'rgba(12, 18, 35, 0.97)',
              backdropFilter: 'blur(24px)',
              border: '2px solid rgba(100, 180, 255, 0.2)',
              borderRadius: 14,
              boxShadow: '0 16px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(100,180,255,0.08)',
              zIndex: 200, overflow: 'hidden',
              padding: '8px 0',
            }}
          >
            {/* Search input */}
            <div style={{ padding: '4px 12px 8px' }}>
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Search agents..."
                autoFocus
                style={{
                  width: '100%', height: 36, background: 'rgba(100,180,255,0.06)',
                  border: '1.5px solid rgba(100,180,255,0.15)', borderRadius: 8,
                  padding: '0 12px', color: '#EDF2FA', fontSize: 16,
                  fontFamily: "'Inter', system-ui, sans-serif", outline: 'none',
                }}
              />
            </div>
            {/* Agent list */}
            <div style={{ maxHeight: 200, overflowY: 'auto', padding: '0 4px' }}>
              {filteredAgents.map((agent, i) => {
                const status = agentStatus?.[agent.slug]?.status || 'IDLE'
                const cfg = statusDot[status] || statusDot.IDLE
                const hasSpr = spriteAgents.includes(agent.slug)
                const isSelected = revolverAgent === agent.slug
                return (
                  <motion.button
                    key={agent.slug}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => {
                      onAgentClick?.(agent.slug)
                      setRevolverAgent(null)
                      setSearchFilter('')
                    }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', background: isSelected ? 'rgba(59,158,255,0.12)' : 'none',
                      border: 'none', borderRadius: 8, cursor: 'pointer',
                      transition: 'background 80ms ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(100,180,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(59,158,255,0.12)' : 'none'}
                  >
                    {/* Mini avatar */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', border: `2px solid ${cfg.ring}`,
                      overflow: 'hidden', flexShrink: 0, background: '#0A0F1E',
                    }}>
                      {hasSpr ? (
                        <img src={`/corner/sprites/${agent.slug}-idle.png`} alt=""
                          style={{ width: 46, height: 46, objectFit: 'cover', objectPosition: '15% 5%', imageRendering: 'pixelated', display: 'block', marginLeft: -7, marginTop: -5 }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#FFFFFF', background: agent.color || '#4A6080', letterSpacing: '0.02em', fontFamily: "'Inter', system-ui, sans-serif" }}>
                          {getInitials(agent.name || agent.slug || '?')}
                        </div>
                      )}
                    </div>
                    {/* Name + role */}
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ color: '#EDF2FA', fontSize: 14, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif" }}>{agent.name}</div>
                      <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{agent.role}</div>
                    </div>
                    {/* Status dot */}
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', background: cfg.color,
                      boxShadow: status === 'WORKING' ? `0 0 6px ${cfg.glow}` : 'none',
                      animation: status === 'WORKING' ? 'hudStatusPulse 1.5s ease-in-out infinite' : 'none',
                    }} />
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
