import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import { motion, AnimatePresence, useMotionValue, animate as fmAnimate } from 'framer-motion'
import {
  MessageSquare, Send, X, ChevronUp, ChevronDown,
  Activity, AlertTriangle, CheckCircle2, Clock, Loader2,
  Pause, Eye, Zap, GitCommit, Terminal, Maximize2, Minimize2,
  ListTodo, FolderKanban, Calendar, Plus, ArrowLeft, Map as MapIcon,
  ZoomIn, ZoomOut, Home, LayoutDashboard, Gamepad2, Command,
  ArrowRight, Coffee, Play, ChevronLeft, ChevronRight,
  BookmarkPlus, History, ScanEye, Film, CalendarCheck, Radar,
  CalendarDays, Sparkles, Users, Search, Folder,
  CornerDownLeft, Copy, RotateCcw, Reply, Building2, FileText, BarChart3,
} from 'lucide-react'
import { GRID_SPEC, ROOM_MAP, AGENTS, ALL_ROOMS, PROJECTS } from './gridSpec.js'
import {
  ROOM_TARGETS as IMAGE_ROOM_TARGETS,
  DIAMOND_CLIP, DIAMOND_CLIP_WIDE,
  ZOOM_PRESETS, IMAGES as OFFICE_IMAGES,
  WAVE_ORDER as ROOM_WAVE_ORDER,
  getWaveDelay as getRoomWaveDelay,
} from './officeLayouts/default.js'
import { createChatConnection, CONNECTION_TYPE } from './chatConnection.js'
import { renderFurniture } from './FurnitureRenderer.jsx'
import { useWebSocket, WS_STATE } from './useWebSocket.js'
// GHOST KILL: AnimatedAgentCharacter, CharacterAnimationStyles, CanvasRoom all REMOVED
// Only CanvasOffice (3-layer system) renders characters now
import CanvasOffice from './CanvasOffice.jsx'
// CrossyBackground: replaced with CSS hex grid (Three.js city scene removed)
import { useDataPipe } from './hooks/useDataPipe.js'
import TaskContextMenuShared, { TaskPriorityBar, TaskNoteIndicator, handleTaskContextAction } from './components/TaskContextMenu.jsx'
import FloatingActionButton from './components/FloatingActionButton.jsx'
import BoardView from './BoardView.jsx'
import briefsIndex from '../data/briefs-index.json'
import { supabase, mapSupabaseMsg } from './lib/supabase.js'
import { getCurrentUser, signOut as authSignOut, onAuthStateChange } from './lib/auth.js'
import FilesTab from './FilesTab.jsx'
import { getClientId, setClientIdFromUser } from './lib/clientConfig.js'
import { marked } from 'marked'

const ChecklistMode = lazy(() => import('./ChecklistMode.jsx'))
const MegaboardMode = lazy(() => import('./MegaboardMode.jsx'))
const GameHUD = lazy(() => import('./GameHUD.jsx'))

// ---- ERROR BOUNDARY (prevents relay message crashes from killing the dashboard) ----
class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.warn('[Corner] Chat render error caught:', error, info?.componentStack?.slice(0, 200))
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 20, textAlign: 'center', color: '#6B8AB0',
          fontFamily: "'Inter', sans-serif", fontSize: 14,
        }}>
          <div style={{ marginBottom: 8, color: '#EF4444', fontWeight: 700 }}>Chat render error</div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 8, padding: '8px 16px', color: '#60A5FA',
              cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ---- MODE CONFIG -----------------------------------------------------------
const MODES = {
  game: { id: 'game', label: 'GAME', icon: MapIcon, key: '1', path: '/dashboard' },
  checklist: { id: 'checklist', label: 'CHECKLIST', icon: ListTodo, key: '2', path: '/dashboard/checklist' },
  megaboard: { id: 'megaboard', label: 'MEGABOARD', icon: LayoutDashboard, key: '3', path: '/dashboard/megaboard' },
}

// ---- CONFIG ----------------------------------------------------------------
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || 'aomhq'
const PALETTE = GRID_SPEC.colorPalette
const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
// Conversation API: local Vite middleware on localhost, Vercel serverless on production
const CONV_API_BASE = IS_LOCAL ? '/api/local/conversations' : '/api/conversations'
// Relay send: local middleware on localhost, Vercel serverless on production
const RELAY_SEND_URL = IS_LOCAL ? '/api/local/relay-send' : '/api/relay'
const DEFAULT_AGENT = 'elon' // Patrik's main agent - camera starts here

// ---- POWERUP MENU CONFIG ----
const POWERUPS = [
  { id: 'htt', name: 'Hold That Thought', slash: '/htt', icon: BookmarkPlus, color: '#D97706', subtitle: 'park an idea' },
  { id: 'gbit', name: 'Time Travel', slash: '/gbit', icon: History, color: '#7C3AED', subtitle: 'search history' },
  { id: 'eyes', name: 'Eyes & Ears', slash: '/eyes-and-ears', icon: ScanEye, color: '#0D9488', subtitle: 'analyze media' },
  { id: 'resolve', name: 'Push to Resolve', slash: '/push-to-resolve', icon: Film, color: '#DC2626', subtitle: 'send to resolve' },
  { id: 'plan', name: 'Plan My Day', slash: '/plan-my-day', icon: CalendarCheck, color: '#16A34A', subtitle: 'daily planner' },
  { id: 'status', name: 'Status Radar', slash: '/status', icon: Radar, color: '#3B82F6', subtitle: 'system scan' },
  { id: 'calendar', name: 'Calendar', slash: '/calendar', icon: CalendarDays, color: '#EA580C', subtitle: 'quick access' },
  { id: 'wash', name: 'Wash Face', slash: '/wash-your-face', icon: Sparkles, color: '#CA8A04', subtitle: 'cleanup run' },
  { id: 'council', name: 'Council', slash: '/council', icon: Users, color: '#9333EA', subtitle: 'agent brief' },
  { id: 'look', name: 'Look', slash: '/look', icon: Search, color: '#06B6D4', subtitle: 'visual search' },
  { id: 'social-post', name: 'Social Post', slash: '/social-post', icon: MessageSquare, color: '#0EA5E9', subtitle: 'draft a post' },
  { id: 'double-check', name: 'Double Check', slash: '/double-check', icon: CheckCircle2, color: '#22C55E', subtitle: 'QA gate' },
  { id: 'cage-match', name: 'Cage Match', slash: '/cage-match', icon: Zap, color: '#F97316', subtitle: 'build both, keep best' },
  { id: 'health-check', name: 'Health Check', slash: '/health-check', icon: Activity, color: '#10B981', subtitle: 'system health' },
  { id: 'invoice', name: 'Invoice', slash: '/invoice', icon: FileText, color: '#6366F1', subtitle: 'generate invoice' },
  { id: 'pitch-deck', name: 'Pitch Deck', slash: '/pitch-deck', icon: LayoutDashboard, color: '#8B5CF6', subtitle: 'build a deck' },
  { id: 'email-drafter', name: 'Email Drafter', slash: '/email-drafter', icon: Send, color: '#F59E0B', subtitle: 'draft email' },
  { id: 'storyboard', name: 'Storyboard', slash: '/storyboard', icon: Film, color: '#EC4899', subtitle: 'visual storyboard' },
  { id: 'punch-list', name: 'Punch List', slash: '/punch-list', icon: ListTodo, color: '#14B8A6', subtitle: 'task manager' },
  { id: 'masterplan', name: 'Masterplan', slash: '/masterplan', icon: MapIcon, color: '#7C3AED', subtitle: 'strategic plan' },
  { id: 'outreach', name: 'Outreach', slash: '/outreach', icon: Users, color: '#EF4444', subtitle: 'cold outreach' },
  { id: 'roi-calc', name: 'ROI Calculator', slash: '/roi-calc', icon: BarChart3, color: '#059669', subtitle: 'calculate ROI' },
  { id: 'supersaiyan', name: 'Super Saiyan', slash: '/supersaiyan', icon: Zap, color: '#FBBF24', subtitle: 'full power mode' },
  { id: 'snapshot', name: 'Snapshot', slash: '/snapshot', icon: ScanEye, color: '#0284C7', subtitle: 'capture state' },
  { id: 'weekly-report', name: 'Weekly Report', slash: '/weekly-report', icon: BarChart3, color: '#4F46E5', subtitle: 'weekly summary' },
  { id: 'skill-gap-scan', name: 'Skill Gap Scan', slash: '/skill-gap-scan', icon: Radar, color: '#7C3AED', subtitle: 'find the gaps' },
  { id: 'client-onboarding', name: 'Client Onboarding', slash: '/client-onboarding', icon: Users, color: '#0EA5E9', subtitle: 'onboard client' },
  { id: 'ship-it', name: 'Ship It', slash: '/ship-it', icon: GitCommit, color: '#22C55E', subtitle: 'deploy now' },
  { id: 'wd40', name: 'WD-40', slash: '/wd40', icon: Sparkles, color: '#D97706', subtitle: 'iterate to great' },
  { id: 'brand-refresh', name: 'Brand Refresh', slash: '/brand-refresh', icon: ScanEye, color: '#EC4899', subtitle: 'refresh brand' },
  { id: 'quick-fix', name: 'Quick Fix', slash: '/quick-fix', icon: Zap, color: '#F59E0B', subtitle: 'fast patch' },
  { id: 'say-it-better', name: 'Say It Better', slash: '/say-it-better', icon: MessageSquare, color: '#06B6D4', subtitle: 'rewrite copy' },
  { id: 'do-research', name: 'Research', slash: '/do-research', icon: Search, color: '#3B82F6', subtitle: 'deep research' },
]

// ---- POWERUP MENU COMPONENT ----
function PowerupMenu({ isOpen, onToggle, onActivate, selectedSkills, isMobile, isNightMode, hideTrigger }) {
  const panelRef = useRef(null)
  const [particles, setParticles] = useState([])

  // Close on click outside (desktop only)
  useEffect(() => {
    if (!isOpen || isMobile) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onToggle(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, isMobile, onToggle])

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onToggle(!isOpen)
      }
      if (isOpen && e.key === 'Escape') {
        e.preventDefault()
        onToggle(false)
      }
      // Number keys 1-0 activate powerups when menu is open
      if (isOpen && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const num = e.key === '0' ? 10 : parseInt(e.key)
        if (num >= 1 && num <= 10) {
          e.preventDefault()
          const pu = POWERUPS[num - 1]
          if (pu) handleActivate(pu)
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onToggle]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleActivate = useCallback((powerup) => {
    // Particle burst
    const newParticles = Array.from({ length: 4 }, (_, i) => ({
      id: `${powerup.id}-${Date.now()}-${i}`,
      color: powerup.color,
      angle: (Math.PI * 2 * i) / 4 + Math.random() * 0.5,
    }))
    setParticles(newParticles)
    setTimeout(() => setParticles([]), 500)

    // Toggle this skill in the selected list -- menu stays open for multi-select
    onActivate(powerup)
    // Do NOT call onToggle(false) -- user explicitly closes the menu
  }, [onActivate])

  return (
    <div ref={panelRef} style={{ position: 'relative', flexShrink: 0, ...(hideTrigger ? { width: 0, height: 0, overflow: 'visible' } : {}) }}>
      {/* Trigger Button -- hidden when hideTrigger is true (mobile dual-purpose button) */}
      {!hideTrigger && (
      <motion.button
        onClick={() => onToggle(!isOpen)}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        whileTap={{ scale: 0.92 }}
        aria-label={isOpen ? 'Close powerup menu' : 'Open powerup menu'}
        style={{
          width: 44, height: 44, borderRadius: 14,
          background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
          border: '2px solid rgba(124, 58, 237, 0.4)',
          boxShadow: '0 2px 12px rgba(124, 58, 237, 0.25)',
          color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          transition: 'box-shadow 200ms ease',
          animation: isOpen ? 'none' : 'powerupPulse 3s ease-in-out infinite',
          position: 'relative',
          zIndex: 2,
        }}
        onMouseEnter={e => { if (!isMobile) e.currentTarget.style.boxShadow = '0 4px 20px rgba(124, 58, 237, 0.4)' }}
        onMouseLeave={e => { if (!isMobile) e.currentTarget.style.boxShadow = '0 2px 12px rgba(124, 58, 237, 0.25)' }}
      >
        <Sparkles size={20} />
      </motion.button>
      )}

      {/* Particle burst on activation */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ scale: 0.3, opacity: 1, x: 22, y: 22 }}
            animate={{
              scale: 0,
              opacity: 0,
              x: 22 + Math.cos(p.angle) * 40,
              y: 22 + Math.sin(p.angle) * 40,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 8, height: 8, borderRadius: '50%',
              background: p.color,
              pointerEvents: 'none',
              zIndex: 3,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile scrim */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => onToggle(false)}
                style={{
                  position: 'fixed', inset: 0,
                  background: 'rgba(0, 0, 0, 0.3)',
                  zIndex: 149,
                }}
              />
            )}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 28,
              }}
              role="menu"
              aria-label="Powerup skills menu"
              style={{
                // Mobile: fixed to viewport so it never causes page scroll
                // Desktop: absolute relative to trigger button
                position: isMobile ? 'fixed' : 'absolute',
                ...(isMobile ? {
                  bottom: 80, // above the chat input bar
                  left: 16,
                  right: 16,
                  width: 'auto',
                } : {
                  bottom: 'calc(100% + 8px)',
                  left: 0,
                  width: 320,
                }),
                maxHeight: isMobile ? '60vh' : 480,
                overflowY: 'auto',
                background: 'rgba(15, 23, 42, 0.97)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '2px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 16,
                boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.5), 0 -2px 12px rgba(124, 58, 237, 0.15)',
                zIndex: 200,
                transformOrigin: isMobile ? 'bottom center' : 'bottom left',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                height: 40, padding: '0 14px',
                borderBottom: '1px solid rgba(59, 130, 246, 0.12)',
              }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12, fontWeight: 700,
                  color: '#6B8AB0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  POWERUPS
                </span>
                <button
                  onClick={() => onToggle(false)}
                  aria-label="Close powerup menu"
                  style={{
                    width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none',
                    color: '#6B7280', cursor: 'pointer',
                    borderRadius: 8,
                    padding: 6,
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Single-column scrollable list of ALL skills */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: 10,
              }}>
                {POWERUPS.map((pu, idx) => (
                  <PowerupTile
                    key={pu.id}
                    powerup={pu}
                    index={idx}
                    onActivate={handleActivate}
                    isMobile={isMobile}
                    isSelected={selectedSkills?.some(s => s.id === pu.id) || false}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CSS animation for idle pulse */}
      <style>{`
        @keyframes powerupPulse {
          0%, 100% { box-shadow: 0 2px 12px rgba(124, 58, 237, 0.25); }
          50% { box-shadow: 0 2px 12px rgba(124, 58, 237, 0.15); }
        }
      `}</style>
    </div>
  )
}

// ---- POWERUP TILE ----
function PowerupTile({ powerup, index, onActivate, isMobile, isSelected }) {
  const [pressed, setPressed] = useState(false)
  const [flashing, setFlashing] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipTimer = useRef(null)
  const Icon = powerup.icon

  const handleClick = () => {
    setFlashing(true)
    setTimeout(() => setFlashing(false), 200)
    onActivate(powerup)
  }

  const handleMouseEnter = () => {
    if (isMobile) return
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 500)
  }
  const handleMouseLeave = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current)
    setShowTooltip(false)
  }

  const bgColor = isSelected
    ? `${powerup.color}22`
    : flashing
      ? `${powerup.color}66`
      : pressed
        ? `${powerup.color}1A`
        : 'rgba(59, 130, 246, 0.04)'

  const borderColor = isSelected
    ? `${powerup.color}80`
    : flashing
      ? `${powerup.color}80`
      : pressed
        ? `${powerup.color}4D`
        : 'rgba(59, 130, 246, 0.08)'

  return (
    <motion.button
      role="menuitem"
      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${powerup.name} powerup`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 400, damping: 28 }}
      onClick={handleClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => { setPressed(false); handleMouseLeave() }}
      onMouseEnter={handleMouseEnter}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        minHeight: 44,
        padding: '8px 12px',
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'background 120ms ease, border-color 120ms ease, transform 120ms ease',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        position: 'relative',
        textAlign: 'left',
      }}
    >
      {/* Selected checkmark badge */}
      {isSelected && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          width: 16, height: 16, borderRadius: '50%',
          background: powerup.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Icon container */}
      <div style={{
        width: 32, height: 32,
        borderRadius: 8,
        background: `${powerup.color}26`,
        border: `1.5px solid ${powerup.color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={16} color={powerup.color} strokeWidth={2} />
      </div>

      {/* Label stack -- inline for compact single-column */}
      <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 13, fontWeight: 700,
          color: '#F1F5F9',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.2,
        }}>
          {powerup.name}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 600,
          color: '#6B8AB0',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          flexShrink: 0,
        }}>
          {powerup.slash}
        </div>
      </div>

      {/* Desktop hover tooltip */}
      <AnimatePresence>
        {showTooltip && !isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 8,
              padding: '6px 10px',
              maxWidth: 200,
              whiteSpace: 'nowrap',
              zIndex: 160,
            }}
          >
            <span style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 13, fontWeight: 500,
              color: '#E2E8F0',
            }}>
              {powerup.subtitle}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ---- UNIFIED ROOM LOOKUP (agents + projects) ----
// ROOM_MAP only has GRID_SPEC.rooms (agents + communal). Build a combined lookup
// that also includes project rooms so clicks/sidebar work for ALL rooms on the grid.
const ROOM_LOOKUP = { ...ROOM_MAP }
for (const proj of PROJECTS) {
  if (!ROOM_LOOKUP[proj.slug]) {
    ROOM_LOOKUP[proj.slug] = {
      id: proj.slug,
      name: proj.name,
      agent: proj.slug, // project rooms use their slug as "agent" for chat routing
      role: proj.type === 'special' ? 'Team Channel' : 'Project',
      agentColor: proj.color,
      statusColors: proj.statusColors,
      floor: proj.floor,
      floorColor: proj.floorColor,
      lightColor: proj.lightColor,
      type: proj.type || 'project',
    }
  }
}

// ---- PROJECT CONFIG (from corner-config.json, inlined for zero-fetch) ----
const PROJECT_CONFIG = {
  'ambition-mechanical': {
    name: 'Ambition Mechanical', team: ['bobby', 'alex', 'ash'], lead: 'bobby',
    contextFiles: ['projects/ambition-mechanical/AGENT.md'],
  },
  'corner': {
    name: 'Corner', team: ['bobby', 'elon', 'steve', 'steffen'], lead: 'elon',
    contextFiles: ['projects/corner/messaging-architecture.md'],
  },
  'aom-internal': {
    name: 'AOM Internal', team: ['all'], lead: 'elon',
    contextFiles: ['context/current-priorities.md'],
  },
  'isa-energy': {
    name: 'ISA Energy', team: ['patrik'], lead: 'patrik',
    contextFiles: [],
  },
}

// Map agents to their projects
function getAgentProjects(slug) {
  return Object.entries(PROJECT_CONFIG)
    .filter(([key, p]) => {
      // Skip broadcast channels (team: ['all']) from individual agent views
      if (p.team.includes('all')) return false
      return p.team.includes(slug)
    })
    .map(([key, p]) => ({ key, ...p }))
}

// Extract agent name from [AGENT] prefix in relay messages (e.g., "[ELON] ..." -> "elon")
// relay-respond.py doesn't set an `agent` field, but agents prefix their messages with [NAME].
function extractAgentFromMessage(msg) {
  if (msg.agent) return msg.agent
  if (!msg.message) return null
  const match = msg.message.match(/^\[([A-Z]+)\]/)
  if (!match) return null
  const name = match[1].toLowerCase()
  const known = AGENTS.find(a => a.slug === name || a.name.toLowerCase() === name)
  return known ? known.slug : null
}

// ---- MESSAGE SANITIZER (shared with ChatDashboard) --------------------------
// TODO(steve): DUPLICATED SANITIZER -- This function is a copy-paste of ChatDashboard.jsx:sanitizeRelayMessage. They've drifted slightly in the past. Extract to a shared module (e.g., src/dashboard/utils/sanitize.js) so both files import the same function. One source of truth for message cleaning.
// Strips watchdog preamble, system XML, and other noise from relay messages.
// Returns cleaned text, or null if the entire message is system noise.
function sanitizeRelayMessage(text) {
  if (!text || typeof text !== 'string') return null

  let cleaned = text

  // 1. Filter system XML blocks
  cleaned = cleaned.replace(/<task-notification>[\s\S]*?<\/task-notification>/g, '')
  cleaned = cleaned.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
  cleaned = cleaned.replace(/<available-deferred-tools>[\s\S]*?<\/available-deferred-tools>/g, '')
  // DONE(bobby2): XML REGEX FIXED -- Only strip SPECIFIC system tags, not all lowercase XML. Users can type <b>hello</b> etc. safely now.
  // No generic catch-all. Only these three system tags get stripped (already handled above individually).

  // 2. Strip watchdog preamble patterns (all known variations)
  cleaned = cleaned.replace(/^Patrik sent this via Telegram:\s*/i, '')
  cleaned = cleaned.replace(/^Patrik sent these? messages? via Telegram:\s*/i, '')
  cleaned = cleaned.replace(/You have full project context from CLAUDE\.md\.\s*/g, '')
  cleaned = cleaned.replace(/Respond naturally with the same detail you would on the desktop\.\s*/g, '')
  cleaned = cleaned.replace(/Do not artificially shorten or condense your response\.\s*/g, '')
  cleaned = cleaned.replace(/If (?:the |any )?request(?:s)? needs? calendar,?\s*email,?\s*file changes,?\s*or tool access,?\s*do what you can and note any limitations\.\s*/gi, '')
  cleaned = cleaned.replace(/Do not use em dashes\.\s*Use bullet points over paragraphs\.\s*/g, '')
  cleaned = cleaned.replace(/Address all messages in one response\.\s*/g, '')
  cleaned = cleaned.replace(/IMPORTANT:?\s*these instructions OVERRIDE[\s\S]*?exactly as written\.?\s*/gi, '')
  cleaned = cleaned.replace(/As you answer the user's questions[\s\S]*?following context:\s*/gi, '')
  cleaned = cleaned.replace(/Contents of \/Users\/[\s\S]*?(?=\n\n|\z)/g, '')
  cleaned = cleaned.replace(/# claudeMd[\s\S]*?(?=\n#|\z)/g, '')

  // 3. Strip "Full transcript available at: /private/tmp/..." lines
  cleaned = cleaned.replace(/Full transcript available at:\s*\/\S+/g, '')

  // 4. Strip timestamped message list prefixes from watchdog batches
  cleaned = cleaned.replace(/^-\s*\[\d{4}-\d{2}-\d{2}T[^\]]*\]\s*/gm, '')

  // 5. Strip telegram/relay headers
  cleaned = cleaned.replace(/^=+\s*TELEGRAM MESSAGES?\s*(?:FROM PATRIK)?\s*=+\s*/gim, '')
  cleaned = cleaned.replace(/^=+\s*PENDING MESSAGES?\s*=+\s*/gim, '')

  // 6. Strip Claude Code system prefixes
  cleaned = cleaned.replace(/^(?:Human|Assistant|System):\s*/gm, '')

  cleaned = cleaned.trim()
  if (!cleaned || cleaned.length < 2) return null

  return cleaned
}

// ---- DEDUPLICATION ──────────────────────────────────────────────────────────
// When a message is sent from dashboard, it goes to relay-inbox as source "corner-dashboard".
// The relay hook then echoes it back to terminal as source "terminal" with watchdog preamble.
// This creates duplicate messages. We detect these by comparing cleaned content within 2 seconds.
function deduplicateMessages(messages) {
  const seen = new Map() // normalized content -> first message
  const result = []

  for (const msg of messages) {
    if (!msg.content) { result.push(msg); continue }

    // Normalize content for comparison (lowercase, strip whitespace/punctuation)
    const normalized = msg.content.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normalized.length < 3) { result.push(msg); continue }

    const existing = seen.get(normalized)
    if (existing) {
      // Keep the earlier message (original), skip the echo
      // If timestamps are within 2 seconds, it's a duplicate
      const existingTime = new Date(existing.time).getTime()
      const thisTime = new Date(msg.time).getTime()
      if (Math.abs(existingTime - thisTime) < 2000) {
        // Prefer corner-dashboard source over terminal echo
        if ((msg.source === 'via dashboard' || msg.source === 'corner-dashboard') && existing.source !== 'via dashboard' && existing.source !== 'corner-dashboard') {
          // Replace existing with this one (dashboard source is preferred)
          const idx = result.indexOf(existing)
          if (idx >= 0) result[idx] = msg
          seen.set(normalized, msg)
        }
        continue // skip duplicate
      }
    }

    seen.set(normalized, msg)
    result.push(msg)
  }

  return result
}

// ---- DEMO DATA (production: thriving sample business for prospects) ---------
// Garcia Construction -- believable Phoenix GC using Corner to run operations.
// Shows a living office with active agents, recent commits, and real workflow.
function generateDemoData() {
  const now = new Date()
  const mAgo = (m) => new Date(now - m * 60000).toISOString()
  const hAgo = (h) => new Date(now - h * 3600000).toISOString()
  return {
    agents: [
      { slug: 'patrik', name: 'Patrik', role: 'Owner / CEO', status: 'WORKING', currentTask: 'Reviewing Q1 revenue targets and client pipeline', timeActive: mAgo(12), lastCompletion: { date: 'Today', description: 'Approved Ridgeline Homes proposal ($8.5k)', result: 'Sent to client' } },
      { slug: 'mom', name: 'Mom', role: 'Orchestrator', status: 'WORKING', currentTask: 'Routing Bobby to fix permit tracker after Elmo QA flagged layout shift', timeActive: mAgo(3), lastCompletion: { date: 'Today', description: 'Closed loop: brand refresh deployed', result: 'Live on site' } },
      { slug: 'alex', name: 'Alex', role: 'Strategy / Biz Dev', status: 'DONE', currentTask: '30-day outreach plan for Phoenix GCs delivered', timeActive: null, lastCompletion: { date: 'Today', description: 'Drafted proposal for Mesa Commercial Group', result: '$12k annual retainer' } },
      { slug: 'steve', name: 'Steve', role: 'AI Advisory Lead', status: 'WORKING', currentTask: 'Building ROI calculator for construction vertical audit clients', timeActive: mAgo(45), lastCompletion: { date: 'Yesterday', description: 'Completed AI readiness framework v2', result: 'Published to /system' } },
      { slug: 'steffen', name: 'Steffen', role: 'Creative Director', status: 'DONE', currentTask: 'Brand refresh for Garcia Construction complete', timeActive: null, lastCompletion: { date: 'Today', description: 'Delivered 24 social media templates + brand guide', result: '24 assets' } },
      { slug: 'bobby', name: 'Bobby', role: 'Web Dev', status: 'WORKING', currentTask: 'Building permit tracker dashboard page for Ridgeline Homes', timeActive: mAgo(8), lastCompletion: { date: 'Today', description: 'Deployed Garcia Construction homepage redesign', result: 'garciaconstruction.com' } },
      { slug: 'colton', name: 'Colton', role: 'Backup Builder', status: 'IDLE', currentTask: 'Standing by for Bobby overflow', timeActive: null, lastCompletion: { date: 'Yesterday', description: 'Shared nav + footer components shipped', result: 'Merged to main' } },
      { slug: 'cleo', name: 'Cleo', role: 'Content Production', status: 'WORKING', currentTask: 'Editing project walkthrough video for Mesa Commercial pitch', timeActive: mAgo(22), lastCompletion: { date: 'Today', description: 'Published 3 Instagram reels for Garcia Construction', result: '12.4k views' } },
      { slug: 'tony', name: 'Tony', role: 'Social Media', status: 'WORKING', currentTask: 'Scheduling 14 posts across Instagram and LinkedIn for this week', timeActive: mAgo(5), lastCompletion: { date: 'Today', description: 'Published LinkedIn carousel: "5 Signs Your GC Needs AI"', result: '847 impressions' } },
      { slug: 'jacob', name: 'Jacob', role: 'Outreach', status: 'WORKING', currentTask: 'Sending personalized emails to 15 Phoenix-area general contractors', timeActive: mAgo(18), lastCompletion: { date: 'Yesterday', description: 'Booked discovery call with Ridgeline Homes', result: 'Thursday 2pm' } },
      { slug: 'elmo', name: 'Elmo', role: 'QA Gate', status: 'DONE', currentTask: 'QA pass on Garcia Construction site complete', timeActive: null, lastCompletion: { date: 'Today', description: 'Flagged 3 layout issues on permit tracker page', result: 'Routed to Bobby' } },
      { slug: 'elon', name: 'Elon', role: 'Infrastructure', status: 'IDLE', currentTask: 'Monitoring system health, relay latency at 1.2s', timeActive: null, lastCompletion: { date: 'Today', description: 'Optimized relay polling from 15s to 5s', result: 'Deployed' } },
      { slug: 'paige', name: 'Paige', role: 'Client Success', status: 'DONE', currentTask: 'Client health scan complete', timeActive: null, lastCompletion: { date: 'Today', description: 'Garcia GREEN, Ridgeline YELLOW, Mesa NEW', result: '3 clients tracked' } },
      { slug: 'pixel', name: 'Pixel', role: 'Extension', status: 'IDLE', currentTask: 'Standing by', timeActive: null, lastCompletion: null },
    ],
    throughput: { working: 6, idle: 2, blocked: 0, doneToday: 4, paused: 0, waiting: 0, commitsToday: 23 },
    blockers: [],
    pipelineFeed: [
      { time: mAgo(3), agent: 'mom', description: 'Mom: Route Bobby to fix permit tracker layout shift flagged by Elmo', commitHash: 'a7f2c91', commitUrl: '#', repo: 'CORNER' },
      { time: mAgo(5), agent: 'tony', description: 'Tony: Schedule 14 social posts for Garcia Construction (IG + LinkedIn)', commitHash: 'b3e8d44', commitUrl: '#', repo: 'SOCIAL' },
      { time: mAgo(8), agent: 'bobby', description: 'Bobby: Deploy Garcia Construction homepage redesign with new brand', commitHash: 'c9a1f27', commitUrl: '#', repo: 'GARCIA-WEB' },
      { time: mAgo(12), agent: 'elmo', description: 'Elmo: QA pass complete, 3 issues flagged on permit tracker page', commitHash: 'd5b7e83', commitUrl: '#', repo: 'GARCIA-WEB' },
      { time: mAgo(18), agent: 'jacob', description: 'Jacob: 15 personalized outreach emails sent to Phoenix GCs', commitHash: 'e2c4a96', commitUrl: '#', repo: 'OUTREACH' },
      { time: mAgo(22), agent: 'cleo', description: 'Cleo: Published 3 Instagram reels for Garcia Construction', commitHash: 'f8d1b52', commitUrl: '#', repo: 'CONTENT' },
      { time: mAgo(35), agent: 'steffen', description: 'Steffen: 24 social media templates + updated brand guide delivered', commitHash: 'a1c3e78', commitUrl: '#', repo: 'BRAND' },
      { time: mAgo(45), agent: 'steve', description: 'Steve: ROI calculator for construction vertical in progress', commitHash: 'b4d2f91', commitUrl: '#', repo: 'ADVISORY' },
      { time: hAgo(1), agent: 'alex', description: 'Alex: 30-day outreach plan targeting 45 Phoenix GCs complete', commitHash: 'c7e5a34', commitUrl: '#', repo: 'STRATEGY' },
      { time: hAgo(1.5), agent: 'paige', description: 'Paige: Client health scan #12. Garcia GREEN, Ridgeline YELLOW.', commitHash: 'd9f8b67', commitUrl: '#', repo: 'CLIENTS' },
      { time: hAgo(2), agent: 'bobby', description: 'Bobby: Ridgeline Homes permit tracker page initial build', commitHash: 'e3a2c45', commitUrl: '#', repo: 'RIDGELINE' },
      { time: hAgo(2.5), agent: 'elon', description: 'Elon: Relay polling optimized 15s to 5s, watchdog threshold updated', commitHash: 'f6b4d89', commitUrl: '#', repo: 'INFRA' },
      { time: hAgo(3), agent: 'jacob', description: 'Jacob: Booked discovery call with Ridgeline Homes (Thu 2pm)', commitHash: 'a8c1e23', commitUrl: '#', repo: 'OUTREACH' },
      { time: hAgo(4), agent: 'cleo', description: 'Cleo: Editing Mesa Commercial project walkthrough video', commitHash: 'b2d5f67', commitUrl: '#', repo: 'CONTENT' },
      { time: hAgo(5), agent: 'mom', description: 'Mom: Wave 4 scan complete, all agents healthy, no blockers', commitHash: 'c4e7a91', commitUrl: '#', repo: 'SYSTEM' },
    ],
    lastUpdated: now.toISOString(),
  }
}

const STATUS_CONFIG = {
  WORKING:  { color: '#22C55E', bg: 'rgba(34,197,94,0.15)',  label: 'Active',   pulseColor: '#22C55E' },
  IDLE:     { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', label: 'Idle',     pulseColor: '#6B7280' },
  BLOCKED:  { color: '#EF4444', bg: 'rgba(239,68,68,0.15)',  label: 'Blocked',  pulseColor: '#EF4444' },
  DONE:     { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', label: 'Done',     pulseColor: '#3B82F6' },
  WAITING:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: 'Thinking', pulseColor: '#F59E0B' },
  PAUSED:   { color: '#F97316', bg: 'rgba(249,115,22,0.15)', label: 'Paused',   pulseColor: '#F97316' },
}

// ---- ZOOM DETAIL LEVELS (Steffen c3-room-zoom-spec) -------------------------
// ZOOM LIMITS: Clamped so it never goes past where it looks good.
// Min 0.55 = full building visible, no dot. Max 2.5 = room detail, no pixelation.
const ZOOM_MIN = 0.55
const ZOOM_MAX = 2.5
const ZOOM_LEVELS = {
  OVERVIEW: { min: 0.55, max: 1.0, scale: 0.7, label: 'Overview' },
  NEIGHBORHOOD: { min: 1.0, max: 2.0, scale: 1.6, label: 'Neighborhood' },
  DETAIL: { min: 2.0, max: 2.5, scale: 2.2, label: 'Detail' },
}

function getDetailLevel(zoom) {
  if (zoom < ZOOM_LEVELS.NEIGHBORHOOD.min) return 'overview'
  if (zoom < ZOOM_LEVELS.DETAIL.min) return 'neighborhood'
  return 'detail'
}

// ---- ROOM ADJACENCY MAP (for pathfinding) -----------------------------------
const ROOM_ADJACENCY = {
  patrik:     ['mom', 'steffen'],
  mom:        ['patrik', 'alex', 'main-hall'],
  alex:       ['mom', 'steve', 'main-hall'],
  steve:      ['alex'],
  steffen:    ['patrik', 'main-hall'],
  'main-hall':['mom', 'alex', 'steffen', 'bobby', 'cleo', 'elmo'],
  bobby:      ['main-hall', 'colton'],
  colton:     ['bobby'],
  cleo:       ['main-hall', 'tony'],
  tony:       ['cleo'],
  elmo:       ['main-hall', 'elon', 'jacob'],
  elon:       ['elmo'],
  jacob:      ['elmo'],
}

// BFS shortest path
function findPath(from, to) {
  if (from === to) return [from]
  const visited = new Set([from])
  const queue = [[from]]
  while (queue.length > 0) {
    const path = queue.shift()
    const current = path[path.length - 1]
    const neighbors = ROOM_ADJACENCY[current] || []
    for (const next of neighbors) {
      if (next === to) return [...path, next]
      if (!visited.has(next)) {
        visited.add(next)
        queue.push([...path, next])
      }
    }
  }
  return [from, to] // fallback
}

// Door positions per room (relative to room, in SVG units)
function getDoorPosition(roomId) {
  const room = ROOM_MAP[roomId]
  if (!room) return { x: 40, y: 40 }
  const w = 80 * room.size.cols
  const h = 80 * room.size.rows
  // Door is roughly at the south or east wall opening
  if (room.walls?.south?.includes('door') || room.walls?.south?.includes('open')) return { x: w / 2, y: h - 4 }
  if (room.walls?.east?.includes('door') || room.walls?.east?.includes('open')) return { x: w - 4, y: h / 2 }
  if (room.walls?.north?.includes('door') || room.walls?.north?.includes('open')) return { x: w / 2, y: 4 }
  if (room.walls?.west?.includes('door') || room.walls?.west?.includes('open')) return { x: 4, y: h / 2 }
  return { x: w / 2, y: h - 4 }
}

// ---- CAMERA SYSTEM ---------------------------------------------------------
// Room positions in SVG space (same as IsometricOffice calc)
const CELL_SIZE = 80
function getRoomCenter(roomId) {
  const room = ROOM_MAP[roomId]
  if (!room) return { x: 160, y: 160 }
  const pixelX = (room.position.col / 2) * CELL_SIZE
  const pixelY = room.position.row * CELL_SIZE
  const roomW = CELL_SIZE * (room.size.cols / 2)
  const roomH = CELL_SIZE * room.size.rows
  return {
    x: pixelX + roomW / 2,
    y: pixelY + roomH / 2,
  }
}

// ---- HOOKS -----------------------------------------------------------------
function useIsMobile(bp = 768) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < bp)
  useEffect(() => {
    const c = () => setM(window.innerWidth < bp)
    window.addEventListener('resize', c)
    return () => window.removeEventListener('resize', c)
  }, [bp])
  return m
}

// iPad/tablet: 768-1024px width (not mobile, but needs compressed sidebar header)
function useIsTablet() {
  const [t, setT] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth >= 768 && window.innerWidth <= 1280
  })
  useEffect(() => {
    const c = () => setT(window.innerWidth >= 768 && window.innerWidth <= 1280)
    window.addEventListener('resize', c)
    return () => window.removeEventListener('resize', c)
  }, [])
  return t
}

// Detect PWA standalone mode or mobile to disable heavy Three.js rendering
function useIsMobileOrPWA() {
  return useMemo(() => {
    if (typeof window === 'undefined') return false
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window && window.innerWidth < 1024)
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
    return isMobile || isStandalone
  }, [])
}

function useDashboardData(interval) {
  // Production: serve demo data immediately (thriving Garcia Construction office).
  // Local: fetch real data from local API with 2s polling.
  const demoData = useMemo(() => IS_LOCAL ? null : generateDemoData(), [])
  const [data, setData] = useState(demoData)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(IS_LOCAL) // production starts loaded
  const lastRaw = useRef(null)

  const pollInterval = interval || 2000
  const endpoint = '/api/local/status'

  const fetchData = useCallback(async () => {
    if (!IS_LOCAL) return // Production uses demo data, no fetching
    try {
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error(`${res.status}`)
      const text = await res.text()
      if (text !== lastRaw.current) {
        lastRaw.current = text
        setData(JSON.parse(text))
      }
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    if (!IS_LOCAL) return // No polling on production
    fetchData()
    const timer = setInterval(fetchData, pollInterval)
    return () => clearInterval(timer)
  }, [fetchData, pollInterval])

  // Regenerate demo data timestamps every 60s so "3m ago" stays fresh
  useEffect(() => {
    if (IS_LOCAL) return
    const refreshTimer = setInterval(() => {
      setData(generateDemoData())
    }, 60000)
    return () => clearInterval(refreshTimer)
  }, [])

  return { data, error, loading }
}

function useKeyboardShortcuts({ onToggleHud, onToggleChat, onToggleMinimap, onEscape, onAgentSelect, onToggleAnimations, onZoomIn, onZoomOut, onOverview, onModeSwitch, onCommandPalette, onShowShortcuts }) {
  useEffect(() => {
    const handler = (e) => {
      // Skip if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') { e.target.blur(); onEscape?.() }
        return
      }

      // Cmd+K / Ctrl+K: command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onCommandPalette?.()
        return
      }

      switch (e.key) {
        // Mode switching: 1, 2, 3
        case '1': onModeSwitch?.('game'); break
        case '2': onModeSwitch?.('checklist'); break
        case '3': onModeSwitch?.('megaboard'); break

        case '?': onShowShortcuts?.(); break
        default: break
      }

      switch (e.key.toLowerCase()) {
        case 't': onToggleHud?.(); break
        case 'escape': onEscape?.(); break
        case 'm': onToggleMinimap?.(); break
        case ' ': e.preventDefault(); onToggleAnimations?.(); break
        case '/': e.preventDefault(); onToggleChat?.(); break
        case '=': case '+': onZoomIn?.(); break
        case '-': onZoomOut?.(); break
        case 'o': onOverview?.(); break
        default: break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onToggleHud, onToggleChat, onToggleMinimap, onEscape, onAgentSelect, onToggleAnimations, onZoomIn, onZoomOut, onOverview, onModeSwitch, onCommandPalette, onShowShortcuts])
}

// ---- UTILITIES -------------------------------------------------------------
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

function azTime() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/Phoenix',
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// ---- PASSWORD GATE ---------------------------------------------------------
// DONE(bobby): Password gate visual polish -- building silhouette, animated particles, blue glow, loading state on submit. Brand energy for client first impression.
function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('')
  const [shake, setShake] = useState(false)
  const [entering, setEntering] = useState(false)
  const [focused, setFocused] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (entering) return
    if (pw === DASHBOARD_PASSWORD) {
      setEntering(true)
      sessionStorage.setItem('dash-auth', '1')
      // Brief loading state before entering the office
      setTimeout(() => onAuth(), 800)
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
  }

  // Generate stable star positions once
  const stars = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      left: `${5 + (i * 23.7) % 90}%`,
      top: `${3 + (i * 17.3) % 85}%`,
      size: i % 3 === 0 ? 3 : i % 5 === 0 ? 2.5 : 1.5,
      delay: `${(i * 0.37) % 4}s`,
      duration: `${3 + (i % 4)}s`,
      bright: i % 7 === 0,
    })),
  [])

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, #060A14 0%, #0A1028 40%, #0F1830 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', position: 'relative', overflow: 'hidden',
    }}>
      {/* Animated star field */}
      {stars.map((s, i) => (
        <div key={`star-${i}`} style={{
          position: 'absolute', left: s.left, top: s.top,
          width: s.size, height: s.size, borderRadius: '50%',
          background: s.bright ? 'rgba(100,180,255,0.9)' : 'rgba(200,210,230,0.5)',
          boxShadow: s.bright ? '0 0 6px rgba(100,180,255,0.4)' : 'none',
          animation: `gateStarTwinkle ${s.duration} ease-in-out ${s.delay} infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Building silhouette at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '80%', maxWidth: 600, height: 200, pointerEvents: 'none',
        opacity: 0.08,
      }}>
        {/* Simplified building outline using CSS */}
        <div style={{
          position: 'absolute', bottom: 0, left: '10%', width: '25%', height: '70%',
          background: 'linear-gradient(180deg, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.1) 100%)',
          borderRadius: '4px 4px 0 0',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: '30%', width: '40%', height: '100%',
          background: 'linear-gradient(180deg, rgba(59,130,246,0.35) 0%, rgba(59,130,246,0.12) 100%)',
          borderRadius: '4px 4px 0 0',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, right: '10%', width: '20%', height: '55%',
          background: 'linear-gradient(180deg, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0.08) 100%)',
          borderRadius: '4px 4px 0 0',
        }} />
        {/* Window dots on main building */}
        {[0.35, 0.45, 0.55, 0.65].map((x, col) =>
          [0.2, 0.35, 0.5, 0.65, 0.8].map((y, row) => (
            <div key={`win-${col}-${row}`} style={{
              position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`,
              width: 6, height: 4, borderRadius: 1,
              background: 'rgba(255,183,77,0.25)',
              animation: `gateWindowFlicker ${4 + (col + row) % 3}s ease-in-out ${(col * 0.5 + row * 0.3)}s infinite`,
            }} />
          ))
        )}
      </div>

      {/* Blue ambient glow behind form */}
      <div style={{
        position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%, -50%)',
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 60%)',
        pointerEvents: 'none', animation: 'gateGlowPulse 6s ease-in-out infinite',
      }} />

      {/* Login card */}
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 20 }}
        animate={entering ? { opacity: 0, y: -20, scale: 0.95 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: entering ? 0.5 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%', maxWidth: 380,
          position: 'relative', zIndex: 2,
        }}
        className={shake ? 'animate-shake' : ''}
      >
        {/* Corner branding */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          {/* Building icon */}
          <div style={{ marginBottom: 20 }}>
            <svg width={48} height={48} viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto' }}>
              <rect x={8} y={16} width={14} height={28} rx={2} fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.35)" strokeWidth={1.5} />
              <rect x={26} y={8} width={14} height={36} rx={2} fill="rgba(59,130,246,0.2)" stroke="rgba(59,130,246,0.4)" strokeWidth={1.5} />
              <rect x={12} y={22} width={3} height={3} rx={0.5} fill="rgba(255,183,77,0.5)" />
              <rect x={12} y={28} width={3} height={3} rx={0.5} fill="rgba(255,183,77,0.35)" />
              <rect x={12} y={34} width={3} height={3} rx={0.5} fill="rgba(255,183,77,0.5)" />
              <rect x={30} y={14} width={3} height={3} rx={0.5} fill="rgba(255,183,77,0.5)" />
              <rect x={30} y={20} width={3} height={3} rx={0.5} fill="rgba(255,183,77,0.35)" />
              <rect x={30} y={26} width={3} height={3} rx={0.5} fill="rgba(255,183,77,0.5)" />
              <rect x={30} y={32} width={3} height={3} rx={0.5} fill="rgba(255,183,77,0.35)" />
              <rect x={36} y={14} width={3} height={3} rx={0.5} fill="rgba(255,183,77,0.3)" />
              <rect x={36} y={20} width={3} height={3} rx={0.5} fill="rgba(255,183,77,0.5)" />
              <rect x={36} y={26} width={3} height={3} rx={0.5} fill="rgba(255,183,77,0.3)" />
            </svg>
          </div>

          <div style={{
            color: '#F1F5F9', fontFamily: 'Syne, sans-serif',
            fontSize: 32, fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: 8,
            textShadow: '0 0 40px rgba(59,130,246,0.2)',
          }}>
            CORNER
          </div>
          <div style={{
            color: '#8BA4C4', fontSize: 16, fontWeight: 500,
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '0.02em',
          }}>
            Enter your office
          </div>
        </div>

        {/* Password input with blue glow on focus */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            placeholder="Password" autoFocus disabled={entering}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              width: '100%',
              background: 'rgba(15,27,45,0.8)',
              border: `2px solid ${focused ? 'rgba(59,130,246,0.5)' : 'rgba(59,130,246,0.15)'}`,
              color: '#F1F5F9', padding: '14px 18px',
              fontSize: 16, fontFamily: "'JetBrains Mono', monospace",
              outline: 'none', borderRadius: 10,
              backdropFilter: 'blur(8px)',
              boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.12), 0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.2)',
              transition: 'border-color 200ms ease, box-shadow 200ms ease',
            }}
          />
        </div>

        {/* Enter button */}
        <button type="submit" disabled={entering} style={{
          width: '100%',
          background: entering
            ? 'linear-gradient(135deg, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0.2) 100%)'
            : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          color: 'white', fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.12em', fontSize: 16, padding: '16px',
          border: 'none', cursor: entering ? 'default' : 'pointer',
          borderRadius: 10,
          boxShadow: entering ? 'none' : '0 4px 20px rgba(59,130,246,0.35), 0 2px 8px rgba(0,0,0,0.3)',
          fontFamily: "'Inter', system-ui, sans-serif",
          transition: 'all 200ms ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          {entering ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Opening...
            </>
          ) : (
            'Enter'
          )}
        </button>

        {IS_LOCAL && (
          <div style={{
            textAlign: 'center', marginTop: 16,
            color: '#22C55E', fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.1em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
            LOCAL MODE
          </div>
        )}
      </motion.form>

      {/* Password gate styles */}
      <style>{`
        @keyframes gateStarTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes gateGlowPulse {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes gateWindowFlicker {
          0%, 100% { opacity: 0.3; }
          30% { opacity: 0.7; }
          60% { opacity: 0.2; }
          80% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

// ---- SPRITE STATE MAPPING --------------------------------------------------
// Maps agent status to sprite file state name
// 'speaking' state used when agent is streaming a response in chat
function getSpriteState(status, isSpeaking) {
  if (isSpeaking) return 'speaking'
  switch (status) {
    case 'WORKING':  return 'working'
    case 'WAITING':  return 'thinking'
    case 'DONE':     return 'done'
    case 'BLOCKED':  return 'idle'
    case 'PAUSED':   return 'idle'
    default:         return 'idle'
  }
}

// All sprite PNGs are multi-frame spritesheets. We show just the top-left frame.
// The images are 1024x1024 with frames in a 2x2 or 3x3 grid.
// For the agent character in SVG, we use foreignObject to embed an <img> with
// object-fit + object-position to crop to the first frame.
const SPRITE_AGENTS = ['patrik','mom','alex','steve','steffen','bobby','colton','cleo','tony','jacob','elmo','elon','pixel']

// Room numbers for door signs (from Steffen's cr-doorsign catalog)
const AGENT_ROOM_NUMBERS = {
  patrik: '01', mom: '02', alex: '03', steve: '04', steffen: '05',
  bobby: '06', colton: '07', cleo: '08', tony: '09', jacob: '10',
  elmo: '11', elon: '12', pixel: '13',
}

// Preload idle sprites on mount
function usePreloadSprites() {
  useEffect(() => {
    const states = ['idle', 'working', 'thinking', 'done', 'speaking']
    SPRITE_AGENTS.forEach(a => {
      states.forEach(s => {
        const img = new Image()
        img.src = `/corner/sprites/${a}-${s}.png`
      })
    })
    // Preload hop frames
    SPRITE_AGENTS.forEach(a => {
      ['ground', 'peak', 'landing'].forEach(frame => {
        const img = new Image()
        img.src = `/corner/sprites/hop/${a}-hop-${frame}.png`
      })
    })
    // Preload nameplate + doorsign PNGs
    SPRITE_AGENTS.forEach(a => {
      const np = new Image()
      np.src = `/corner/furniture/nameplates/nameplate-${a}.png`
      const ds = new Image()
      ds.src = `/corner/furniture/doorsigns/cr-doorsign-${a}.png`
    })
  }, [])
}

// ---- AGENT CHARACTER (Pixel Art Sprite) - HTML version for div-based rooms --
function AgentCharacterHTML({ color, status, agentSlug, isSpeaking, roomW, roomH }) {
  const spriteState = getSpriteState(status, isSpeaking)
  const isWorking = status === 'WORKING'
  const isThinking = status === 'WAITING'
  const isDone = status === 'DONE'

  const hasSpriteFile = agentSlug && SPRITE_AGENTS.includes(agentSlug)

  // Character at 22% of room - visible life indicator, room is the star
  const spriteSize = Math.min(roomW, roomH) * 0.22

  if (!hasSpriteFile) {
    return (
      <div style={{
        position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)',
        width: spriteSize * 0.4, height: spriteSize * 0.4, borderRadius: '50%',
        background: color, opacity: 0.9, boxShadow: `0 4px 12px ${color}66`,
      }} />
    )
  }

  const spriteSrc = `/corner/sprites/${agentSlug}-${spriteState}.png`

  return (
    <div style={{
      position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)',
      width: spriteSize, height: spriteSize, pointerEvents: 'none', zIndex: 2,
      animation: isWorking ? 'crossyBounce 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite' : 'none',
    }}>
      {/* Shadow beneath sprite - squashes on bounce */}
      <div style={{
        position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
        width: spriteSize * 0.7, height: spriteSize * 0.15,
        background: 'rgba(0,0,0,0.25)', borderRadius: '50%', filter: 'blur(3px)',
        animation: isWorking ? 'crossyShadow 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite' : 'none',
      }} />

      {/* Sprite image - show first frame from 2x2 spritesheet (top-left quadrant)
          Sprite PNGs are 256x256 with 4 frames in 2x2 grid. Each frame is 128x128.
          We render at 2x container size and overflow:hidden crops to top-left frame.
          Full silhouette shown (no circle clip, no blend mode corruption). */}
      <div style={{
        width: spriteSize, height: spriteSize, overflow: 'hidden', position: 'relative',
      }}>
        {/* Zoom into center of first frame to show character, not dark corners.
            Sprite is 256x256, frame is 128x128. We show frame at 2.6x to zoom into the character. */}
        <img
          src={spriteSrc}
          alt=""
          style={{
            position: 'absolute',
            top: '-30%', left: '-30%',
            width: spriteSize * 2.6,
            height: spriteSize * 2.6,
            maxWidth: 'none',
            imageRendering: 'pixelated',
            display: 'block',
            filter: isWorking ? `drop-shadow(0 0 8px ${color}66)` : 'none',
            transition: 'filter 400ms ease',
          }}
        />
      </div>

      {/* Working glow pulse */}
      {isWorking && (
        <div style={{
          position: 'absolute', inset: -8,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
          animation: 'characterGlow 2s ease-in-out infinite',
        }} />
      )}

      {/* Thinking dots above sprite */}
      {isThinking && (
        <div style={{
          position: 'absolute', top: -12, right: -4,
          display: 'flex', gap: 3,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#F59E0B',
              animation: `dotPulse 0.8s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Done checkmark */}
      {isDone && (
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 18, height: 18, borderRadius: '50%',
          background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(16,185,129,0.4)',
        }}>
          <svg width={10} height={8} viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#FFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  )
}

// Legacy SVG version kept for compatibility
function AgentCharacter({ x, y, color, status, agentSlug, isSpeaking }) {
  const spriteState = getSpriteState(status, isSpeaking)
  const isWorking = status === 'WORKING'
  const isThinking = status === 'WAITING'
  const isDone = status === 'DONE'
  const spriteW = 28
  const spriteH = 28
  const hasSpriteFile = agentSlug && SPRITE_AGENTS.includes(agentSlug)
  if (!hasSpriteFile) {
    return (
      <g>
        <ellipse cx={x} cy={y + 6} rx={5} ry={2} fill="#000" opacity={0.2} />
        <circle cx={x} cy={y - 4} r={6} fill={color} opacity={0.9} />
      </g>
    )
  }
  const spriteSrc = `/corner/sprites/${agentSlug}-${spriteState}.png`
  return (
    <g>
      <ellipse cx={x} cy={y + 8} rx={10} ry={3} fill="#000" opacity={0.15} />
      <foreignObject x={x - spriteW / 2} y={y - spriteH + 4} width={spriteW} height={spriteH} style={{ overflow: 'hidden', pointerEvents: 'none' }}>
        <img src={spriteSrc} alt="" style={{ width: spriteW * 2, height: spriteH * 2, objectFit: 'cover', objectPosition: '0 0', imageRendering: 'pixelated', display: 'block' }} />
      </foreignObject>
      {isWorking && (
        <circle cx={x} cy={y - spriteH / 2 + 4} r={16} fill={color} opacity={0.08}>
          <animate attributeName="r" values="14;18;14" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      {isThinking && (
        <g>{[0, 1, 2].map(i => (
          <circle key={i} cx={x + 10 + i * 4} cy={y - spriteH - 2} r={1.5} fill="#F59E0B" opacity={0.6}>
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="0.8s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
          </circle>
        ))}</g>
      )}
      {isDone && (
        <g>
          <circle cx={x + 12} cy={y - spriteH} r={4} fill="#10B981" opacity={0.8} />
          <path d={`M${x + 10},${y - spriteH} L${x + 12},${y - spriteH + 2} L${x + 15},${y - spriteH - 2}`} fill="none" stroke="#FFF" strokeWidth={1.2} />
        </g>
      )}
    </g>
  )
}

// ---- SPRITE AVATAR (HTML, for chat + sidebar) ------------------------------
function SpriteAvatar({ agentSlug, size = 32, borderColor, style: extraStyle, status }) {
  const hasSpriteFile = agentSlug && SPRITE_AGENTS.includes(agentSlug)
  const agent = AGENTS.find(a => a.slug === agentSlug)
  const color = borderColor || agent?.color || '#6B7280'
  const spriteState = status ? getSpriteState(status, false) : 'idle'

  if (hasSpriteFile) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', border: `2px solid ${color}`,
        overflow: 'hidden', flexShrink: 0, background: '#0A0F1E',
        ...extraStyle,
      }}>
        <img
          src={`/corner/sprites/${agentSlug}-${spriteState}.png`}
          alt=""
          style={{
            width: size * 2,
            height: size * 2,
            objectFit: 'cover',
            objectPosition: '15% 5%',
            imageRendering: 'pixelated',
            display: 'block',
          }}
        />
      </div>
    )
  }

  // Fallback: colored initial circle
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(12, size * 0.35), fontWeight: 700, color, background: `${color}33`,
      flexShrink: 0, ...extraStyle,
    }}>
      {agent?.name?.charAt(0) || '?'}
    </div>
  )
}

// ---- PER-ROOM LIGHTING OVERLAY COLORS (Steffen C2.2 spec 4B) ---------------
const ROOM_LIGHT_OVERLAYS = {
  patrik:    'rgba(255, 216, 122, 0.05)',
  bobby:     'rgba(156, 39, 176, 0.08)',
  elon:      'rgba(76, 175, 80, 0.05)',
  cleo:      'rgba(255, 183, 77, 0.06)',
  steffen:   'rgba(255, 216, 122, 0.07)',
  'main-hall': 'rgba(255, 183, 77, 0.04)',
  elmo:      'rgba(240, 240, 240, 0.06)',
  mom:       'rgba(245, 158, 11, 0.04)',
  alex:      'rgba(59, 130, 246, 0.04)',
  steve:     'rgba(124, 154, 114, 0.04)',
  colton:    'rgba(6, 182, 212, 0.04)',
  tony:      'rgba(236, 72, 153, 0.05)',
  jacob:     'rgba(239, 68, 68, 0.04)',
}

// Rooms that have pixel art room render PNGs
const ROOMS_WITH_RENDERS = [
  'patrik', 'mom', 'alex', 'steve', 'steffen', 'main-hall',
  'bobby', 'colton', 'cleo', 'tony', 'jacob', 'elmo', 'elon',
]

// ---- ROOM TILE (HTML/CSS - uses Gemini renders as backgrounds) -------------
// The renders ARE isometric. No CSS 3D transforms needed. Let the art do the work.
function RoomTile({ room, agent, agentStatus, isHovered, isSelected, onClick, onMouseEnter, onMouseLeave, tileW, tileH, detailLevel, agentAnimation }) {
  if (!room) return null

  const status = agentStatus?.status || 'IDLE'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  const isActive = status === 'WORKING'
  const hasAgent = room.agent !== null
  const agentColor = room.agentColor || '#FFD87A'
  const isAway = agentAnimation?.state === 'away'
  const baseBrightness = isAway ? 0.3 : (isActive ? 1.0 : (status === 'DONE' ? 0.95 : (status === 'IDLE' ? 0.75 : 0.85)))
  const hasRoomRender = ROOMS_WITH_RENDERS.includes(room.id)
  const roomImgSrc = `/corner/rooms/${room.id === 'main-hall' ? 'main-hall' : room.id + '-room'}.png`
  const showAmbient = detailLevel !== 'overview'

  return (
    <div
      onClick={() => hasAgent && onClick?.(room.id)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'relative',
        width: tileW, height: tileH,
        cursor: hasAgent ? 'pointer' : 'default',
        filter: `brightness(${baseBrightness})`,
        transition: 'filter 400ms ease, transform 200ms ease',
        transform: (isHovered && hasAgent) ? 'scale(1.02)' : 'scale(1)',
        zIndex: (isHovered || isSelected) ? 5 : 1,
      }}
    >
      {/* Room render image - the art IS the depth */}
      {hasRoomRender ? (
        <img
          src={roomImgSrc}
          alt={room.name}
          draggable={false}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            display: 'block',
            imageRendering: 'auto',
            borderRadius: 2,
          }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: room.floorColor || '#C4956A',
          borderRadius: 2,
        }} />
      )}

      {/* South + East wall thickness (dark borders for 3D wall effect) */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.35))',
        pointerEvents: 'none', borderRadius: '0 0 2px 2px',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 3,
        background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.25))',
        pointerEvents: 'none', borderRadius: '0 2px 2px 0',
      }} />

      {/* Light spill from windows (warm radial extending outward) */}
      {showAmbient && room.walls?.north?.includes('window') && (
        <div style={{
          position: 'absolute', top: -12, left: '20%', width: '60%', height: 24,
          background: `radial-gradient(ellipse, ${room.lightColor || '#FFD87A'}20 0%, transparent 70%)`,
          pointerEvents: 'none', filter: 'blur(8px)',
        }} />
      )}
      {showAmbient && room.walls?.west?.includes('window') && (
        <div style={{
          position: 'absolute', top: '20%', left: -12, width: 24, height: '60%',
          background: `radial-gradient(ellipse, ${room.lightColor || '#FFD87A'}20 0%, transparent 70%)`,
          pointerEvents: 'none', filter: 'blur(8px)',
        }} />
      )}
      {showAmbient && room.walls?.east?.includes('window') && (
        <div style={{
          position: 'absolute', top: '20%', right: -12, width: 24, height: '60%',
          background: `radial-gradient(ellipse, ${room.lightColor || '#FFD87A'}20 0%, transparent 70%)`,
          pointerEvents: 'none', filter: 'blur(8px)',
        }} />
      )}

      {/* Bobby's purple LED underglow */}
      {room.id === 'bobby' && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%',
          background: `linear-gradient(to top, rgba(156,39,176,${isActive ? 0.25 : 0.12}), transparent)`,
          pointerEvents: 'none', borderRadius: '0 0 2px 2px',
        }} />
      )}

      {/* Agent sprite character - LARGE AND CENTERED (30-40% of room) */}
      {hasAgent && agent && !isAway && (
        <AgentCharacterHTML
          color={agentColor}
          status={status}
          agentSlug={room.id}
          roomW={tileW}
          roomH={tileH}
        />
      )}

      {/* "Away" badge */}
      {isAway && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'rgba(10, 15, 30, 0.9)', border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 12, padding: '4px 12px',
          color: '#F59E0B', fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {agentAnimation?.label || 'Away'}
        </div>
      )}

      {/* Status indicator dot (top-right) */}
      {hasAgent && !isAway && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 8, height: 8, borderRadius: '50%',
          background: isActive ? cfg.color : (room.statusColors?.[status === 'IDLE' ? 'idle' : 'active'] || cfg.color),
          opacity: isActive ? 1 : 0.6,
          boxShadow: isActive ? `0 0 6px ${cfg.color}` : 'none',
          animation: isActive ? 'statusPulse 1.5s ease-in-out infinite' : 'none',
          zIndex: 3,
        }} />
      )}

      {/* Hover/selected glow border */}
      {(isHovered || isSelected) && hasAgent && (
        <div style={{
          position: 'absolute', inset: -2,
          border: `2px solid ${agentColor}`,
          borderRadius: 4,
          opacity: isSelected ? 0.6 : 0.3,
          boxShadow: `0 0 12px ${agentColor}40, inset 0 0 20px ${agentColor}10`,
          pointerEvents: 'none',
          transition: 'opacity 200ms ease',
        }} />
      )}
    </div>
  )
}

// Legacy SVG IsometricRoom kept for fallback
function IsometricRoom({ room, agent, agentStatus, isHovered, isSelected, onClick, cellSize, detailLevel, agentAnimation }) {
  if (!room) return null
  const status = agentStatus?.status || 'IDLE'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  const isActive = status === 'WORKING'
  const hasAgent = room.agent !== null
  const roomW = cellSize * room.size.cols
  const roomH = cellSize * room.size.rows
  const agentColor = room.agentColor || '#FFD87A'
  const isAway = agentAnimation?.state === 'away'
  const baseBrightness = isAway ? 0.25 : (isActive ? 1.0 : (status === 'DONE' ? 1.0 : (status === 'IDLE' ? 0.4 : 0.6)))
  const hasRoomRender = ROOMS_WITH_RENDERS.includes(room.id)
  const roomLightOverlay = ROOM_LIGHT_OVERLAYS[room.id]
  return (
    <g onClick={() => hasAgent && onClick?.(room.id)} style={{ cursor: hasAgent ? 'pointer' : 'default', filter: `brightness(${baseBrightness})`, transition: 'filter 400ms ease' }}>
      {hasRoomRender ? (
        <foreignObject x={0} y={0} width={roomW} height={roomH} style={{ overflow: 'hidden' }}>
          <img src={`/corner/rooms/${room.id === 'main-hall' ? 'main-hall' : room.id + '-room'}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </foreignObject>
      ) : (
        <rect x={0} y={0} width={roomW} height={roomH} fill={room.floorColor || '#C4956A'} />
      )}
      {hasAgent && agent && !isAway && (
        <AgentCharacter x={roomW * 0.55} y={roomH * 0.7} color={agentColor} status={status} agentSlug={room.id} />
      )}
      <rect x={0} y={0} width={roomW} height={roomH} fill="none" stroke={PALETTE.exteriorWalls} strokeWidth={1} />
    </g>
  )
}

// ---- NAMEPLATE (HTML version for div-based layout) -------------------------
function RoomNameplateHTML({ room, agentStatus, isHovered }) {
  if (!room || room.agent === null) return null
  const status = agentStatus?.status || 'IDLE'
  const dotColor = status === 'WORKING' ? (room.statusColors?.active || '#22C55E')
    : status === 'WAITING' ? '#F59E0B'
    : (room.statusColors?.idle || '#6B7280')
  const pulse = status === 'WORKING' || status === 'WAITING'
  const task = agentStatus?.currentTask || ''
  const hasSprite = SPRITE_AGENTS.includes(room.id)

  return (
    <div style={{
      position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 6,
      background: PALETTE.nameplate.background,
      border: `1px solid ${isHovered ? `${room.agentColor}4D` : PALETTE.nameplate.border}`,
      borderRadius: 6, padding: '3px 10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      whiteSpace: 'nowrap', zIndex: 10,
      transition: 'border-color 150ms ease',
    }}>
      {/* Mini sprite avatar */}
      {hasSprite && (
        <div style={{ width: 16, height: 16, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
          <img src={`/corner/sprites/${room.id}-idle.png`} alt=""
            style={{ width: 32, height: 32, objectFit: 'cover', objectPosition: '0 0', imageRendering: 'pixelated' }} />
        </div>
      )}
      {/* Status dot */}
      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0,
        animation: pulse ? `statusPulse ${status === 'WAITING' ? '0.8s' : '1.5s'} ease-in-out infinite` : 'none',
      }} />
      {/* Name */}
      <span style={{
        color: PALETTE.nameplate.text,
        fontSize: 13, fontWeight: isHovered ? 700 : 600,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {room.agent}
      </span>
      {/* Task on hover */}
      {isHovered && task && (
        <span style={{ color: '#8A847C', fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.length > 22 ? task.slice(0, 22) + '...' : task}
        </span>
      )}
    </div>
  )
}

// Legacy SVG nameplate kept for minimap
function RoomNameplate({ room, agentStatus, isHovered, cellSize }) {
  if (!room || room.agent === null) return null
  const status = agentStatus?.status || 'IDLE'
  const dotColor = status === 'WORKING' ? '#22C55E' : '#6B7280'
  const roomW = cellSize * room.size.cols
  return (
    <g>
      <rect x={roomW / 2 - 30} y={-18} width={60} height={16} rx={4} fill={PALETTE.nameplate.background} stroke={PALETTE.nameplate.border} strokeWidth={1} />
      <circle cx={roomW / 2 - 18} cy={-10} r={3} fill={dotColor} />
      <text x={roomW / 2 - 10} y={-7} fill={PALETTE.nameplate.text} fontSize={13} fontWeight={600} fontFamily="Inter, system-ui, sans-serif">{room.agent}</text>
    </g>
  )
}

// ---- ISOMETRIC OFFICE (main game view) - SINGLE IMAGE APPROACH -------------
// Uses office-full-night.png (Crossy Road voxel) as ONE cohesive building.
// No individual room tiles = no double walls. The north star IS the background.
// Interactive click targets, nameplates, and status dots overlay on top.
// C4: Crossy Road bounce energy, viewport-filling, wave animation on load.
// DONE(bobby2): FULL DAYTIME THEME. office-full.png (bright Crossy Road, blue sky, green grass) is DEFAULT. office-full-night.png at 8pm+ AZ only.
// DONE(bobby2): Daytime palette: white glass HUD, light sidebar, #E8F0FA background. Night-only window glows. Matches Steffen's layout-daytime.png target.


// PATRIK DIRECTIVE (line 215): STOP ALL CATALOG/FURNITURE WORK. ALL agent energy goes to 3 things ONLY: (1) Game feel, (2) HUD clean, (3) Map interaction. No furniture, no new packs, no catalog growth until these 3 are SOLID.
// DEPRECATED(engine-swap): LAYERED ROOM SYSTEM -- Was: React component overlays on PNG. REPLACED BY TODO(engine): 2D ENGINE INTEGRATION + LAYERED ROOM RENDERING. Council decision 2026-03-17: proper 2D engine (PixiJS/Phaser) owns the game canvas. Do not build in React/CSS.
// DEPRECATED(engine-swap): ROOM DEPTH + DOMINO WAVE -- Was: CSS parallax per room. REPLACED BY TODO(engine): ENGINE CAMERA + ZOOM SYSTEM (per-room depth offsets + wave-triggered animations). Council decision 2026-03-17. Do not build in React/CSS.
// DONE(bobby): SWAP HITBOX COORDINATES -- officeLayouts/default.js now uses Steffen's warm variant coordinates from room-hitbox-map.json. Ref: Patrik feedback line 212.
// DEPRECATED(engine-swap): PLAYWRIGHT HITBOX VERIFICATION -- Was: Diamond clip-path coordinate testing. REPLACED BY TODO(engine): ENGINE INPUT MANAGER (engine collision bodies / tilemap click detection). Council decision 2026-03-17. Do not build in React/CSS.
// DONE(bobby): MODULAR OFFICE FRAMEWORK -- Extracted to officeLayouts/default.js. Room targets, clip paths, zoom presets, wave order, and image paths in standalone config. Swap image + config = new office skin.
// DONE(bobby): INVISIBLE HOTSPOT MAPPING (OVO approach) -- All diamond SVG outlines REMOVED. Click regions are invisible rectangles matching wall boundaries. Hover = subtle radial glow inside room space. No borders, no outlines, no drawn shapes. Art defines rooms.
// DONE(bobby): ROOM INTERACTION STATES -- Invisible hitboxes (OVO approach), subtle inner glow on hover only. No drawn outlines. Office walls define rooms.
// DONE(bobby): Diamond outlines REMOVED. Invisible rectangular hotspots matching art boundaries. Hover = soft radial glow inside room space.
// Room targets, clip paths, zoom presets, wave order imported from officeLayouts/default.js
//
// ========== NEW ARCHITECTURE TODOs: 2D ENGINE SWAP ==========
// TODO(engine): 2D ENGINE INTEGRATION -- Replace the current React/CSS/SVG game viewport with a proper 2D engine (Phaser, PixiJS, or Excalibur). The engine owns the canvas: room rendering, character animation, camera control, zoom, pan, parallax, click detection. React owns the HUD/sidebar/chat overlays. Communication: engine emits events (roomClicked, agentHovered) that React listens to. React calls engine API (focusRoom, setZoom, spawnAgent). The 70/30 layout stays: engine canvas on the left, React sidebar on the right.
// TODO(engine): LAYERED ROOM RENDERING -- Each room is a multi-layer tilemap or sprite composition: (1) floor layer, (2) wall layer, (3) furniture layer (individual items from the 501-asset catalog), (4) character/agent layer, (5) effects/particle layer. Layers have independent z-depth. Furniture items are engine sprites loaded from Steffen's catalog PNGs. Room config (officeLayouts/default.js) migrates to engine scene data format. Each room = engine scene or sub-scene.
// TODO(engine): SPRITE LAYER COMPOSITING -- All 13 agent characters rendered as engine sprite entities with state-driven animation (idle, walking, working, speaking, done). Steffen's 52-sprite state sheets become engine sprite atlases. Direction support (SE + NW) handled natively by engine sprite flip. Z-ordering automatic via engine depth sort. Character accessories (hats, effects) as child sprites. Replace CharacterAnimations.jsx entirely.
// TODO(engine): ENGINE CAMERA + ZOOM SYSTEM -- Replace CSS transform zoom with engine camera. Exponential zoom (current 0.7x to 1.6x range), pan with drag, room focus with smooth tween. Domino wave breathing effect = per-room tween sequence triggered by engine timer. Pan bounds enforced by engine camera limits. Mobile pinch-to-zoom maps to engine camera.
// TODO(engine): ENGINE INPUT MANAGER -- Replace diamond clip-path hitboxes with engine-native input. Room entities have collision bodies matching their isometric footprint. Click/hover detection via engine physics or shape overlap. Hover glow = engine shader or sprite tint. Agent click = engine event -> React sidebar update. No more manual coordinate mapping.
// TODO(engine): FURNITURE RENDERER MIGRATION -- FurnitureRenderer.jsx (SVG-based) dies entirely. All 501 catalog items become engine sprites with placement coordinates from room config. Clickable, movable, swappable via engine drag system. The IKEA + Etsy marketplace vision maps to an engine asset loader that pulls from the catalog.
// TODO(engine): ENGINE <-> REACT BRIDGE -- Build a clean interface layer. Engine exposes: focusRoom(id), setZoom(level), getAgentPosition(id), on('roomClick', cb), on('agentHover', cb). React exposes: updateAgentStatus(id, status), showNotification(msg). Bridge lives in a dedicated module (e.g., engineBridge.js). GameDashboard mounts the engine canvas into a ref div and communicates only through the bridge.
// ========== END ENGINE SWAP TODOs ==========
//
// ========== PATRIK DIRECTIVES (Pass 25, lines 255-265) ==========
// TODO(bobby): DARK BACKGROUND + SINGLE ROOM FOCUS -- Go back to DARK background. Remove ALL old flat PNG stuff. Just Elon's Canvas room on a dark/night background. Clean slate. Focus ONLY on Elon's room until team votes to scale. If team votes to scale but Patrik disagrees, Patrik is outvoted. But vote must happen as a team. IsometricOffice component below is the OLD multi-room flat PNG approach. CanvasOffice is the NEW Canvas approach. Both should render dark bg + Elon only. Ref: Patrik directive line 255.
// TODO(bobby): ELON WALKING AROUND ROOM = GATE TO SCALING -- Full checklist before adding room 2: (1) Room background right, (2) Furniture sprites right (reskin until style nailed), (3) Click perfect, (4) Hover feels right, (5) Depth looks right, (6) Character placed correctly, (7) Character WALKS AROUND the room. All 7 must pass. Ref: Patrik directive line 265.
// ========== END Pass 25 ==========
//
// ========== PATRIK DIRECTIVES (Pass 26, lines 273-275) ==========
// TODO(bobby): DESKTOP WEB LIVE CONNECTION -- Dashboard on desktop web must have persistent WebSocket connection for instant data updates. Right Now data must be the freshest feed on screen. 2s polling is too slow for "what's happening THIS SECOND." WebSocket push from relay for task completions, agent status changes, new messages. useWebSocket hook already imported. Wire it to Right Now data + HUD task updates. Ref: Patrik feedback line 273 (Right Now freshness) + line 274 (desktop live).
// ========== END Pass 26 ==========
//
// FILE OWNER: Bobby (Canvas team) owns IsometricOffice + CanvasOffice integration. Bobby2 (HUD team) owns GameHUD, sidebar, chat, HUD components.
//
// ---- SINGLE-IMAGE APPROACH: uses office-full.png (Crossy Road voxel, bright daytime) as DEFAULT ------
// Night mode (office-full-night.png) activates at 8pm+ AZ time. isNightMode is passed from parent GameDashboard.
// C4: Building FILLS the viewport. No dead space. Crossy Road bounce energy.
function IsometricOffice({ agentStatus, onRoomClick, onRoomContextMenu, selectedRoom, hoveredRoom, setHoveredRoom, cameraTarget, cameraZoom, isOverview, onZoomChange, agentAnimations, streamingAgent, isNightMode }) {
  // FILL THE VIEWPORT: size based on container, not fixed pixels
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const sizeRef = useRef(null)

  useEffect(() => {
    const measure = () => {
      if (sizeRef.current) {
        const rect = sizeRef.current.getBoundingClientRect()
        setContainerSize({ w: rect.width, h: rect.height })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Daytime: bright Crossy Road office (blue sky, green grass). Night: warm night version.
  const officeImage = isNightMode ? OFFICE_IMAGES.night : OFFICE_IMAGES.day

  // Fill viewport: use the LARGER dimension to ensure no dead space
  // The building image is roughly square, so we scale to cover the viewport
  const IMG_SIZE = Math.max(containerSize.w, containerSize.h, 880) * 1.15

  const rooms = GRID_SPEC.rooms
  const containerRef = useRef(null)

  // Wave animation: track if initial load animation has played
  const [hasLoaded, setHasLoaded] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setHasLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Pan state for click-drag
  // Pan bounds: prevent building from scrolling off screen into blank page
  const MAX_PAN = 600
  const clampPan = (x, y) => ({
    x: Math.max(-MAX_PAN, Math.min(MAX_PAN, x)),
    y: Math.max(-MAX_PAN, Math.min(MAX_PAN, y)),
  })
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const panState = useRef({ dragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0, velX: 0, velY: 0 })
  const roomLongPressRef = useRef(null)
  const momentumRef = useRef(null)

  // Scroll wheel zoom - SNAP between preset levels (no free zoom)
  // Scroll down = zoom out (overview), scroll up = zoom in (detail)
  const scrollCooldownRef = useRef(false)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e) => {
      e.preventDefault()
      // Debounce scroll to prevent rapid toggling
      if (scrollCooldownRef.current) return
      scrollCooldownRef.current = true
      setTimeout(() => { scrollCooldownRef.current = false }, 300)

      onZoomChange?.(z => {
        // Find current preset index
        const currentIdx = ZOOM_PRESETS.findIndex(p => Math.abs(p - z) < 0.2)
        if (e.deltaY > 0) {
          // Scroll down = zoom out (go to lower preset)
          const nextIdx = currentIdx > 0 ? currentIdx - 1 : 0
          return ZOOM_PRESETS[nextIdx]
        } else {
          // Scroll up = zoom in (go to higher preset)
          const nextIdx = currentIdx < ZOOM_PRESETS.length - 1 ? currentIdx + 1 : ZOOM_PRESETS.length - 1
          return ZOOM_PRESETS[nextIdx]
        }
      })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [onZoomChange])

  // Click-drag pan with momentum
  const handleMouseDown = useCallback((e) => {
    if (momentumRef.current) cancelAnimationFrame(momentumRef.current)
    panState.current = { dragging: true, startX: e.clientX - panOffset.x, startY: e.clientY - panOffset.y, lastX: e.clientX, lastY: e.clientY, velX: 0, velY: 0 }
  }, [panOffset])

  const handleMouseMove = useCallback((e) => {
    if (!panState.current.dragging) return
    const newX = e.clientX - panState.current.startX
    const newY = e.clientY - panState.current.startY
    panState.current.velX = e.clientX - panState.current.lastX
    panState.current.velY = e.clientY - panState.current.lastY
    panState.current.lastX = e.clientX
    panState.current.lastY = e.clientY
    setPanOffset(clampPan(newX, newY))
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!panState.current.dragging) return
    panState.current.dragging = false
    let vx = panState.current.velX
    let vy = panState.current.velY
    const decay = () => {
      if (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) return
      vx *= 0.92
      vy *= 0.92
      setPanOffset(prev => clampPan(prev.x + vx, prev.y + vy))
      momentumRef.current = requestAnimationFrame(decay)
    }
    if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
      momentumRef.current = requestAnimationFrame(decay)
    }
  }, [])

  // Reset pan when camera target changes
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 })
  }, [cameraTarget, isOverview])

  // Touch support for mobile pan
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0]
      if (momentumRef.current) cancelAnimationFrame(momentumRef.current)
      panState.current = { dragging: true, startX: t.clientX - panOffset.x, startY: t.clientY - panOffset.y, lastX: t.clientX, lastY: t.clientY, velX: 0, velY: 0 }
    }
  }, [panOffset])

  const handleTouchMove = useCallback((e) => {
    if (!panState.current.dragging || e.touches.length !== 1) return
    const t = e.touches[0]
    const newX = t.clientX - panState.current.startX
    const newY = t.clientY - panState.current.startY
    panState.current.velX = t.clientX - panState.current.lastX
    panState.current.velY = t.clientY - panState.current.lastY
    panState.current.lastX = t.clientX
    panState.current.lastY = t.clientY
    setPanOffset(clampPan(newX, newY))
  }, [])

  // Pinch-to-zoom
  const pinchRef = useRef({ active: false, initialDist: 0, initialZoom: 1 })
  const handleTouchStartPinch = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = { active: true, initialDist: Math.hypot(dx, dy), initialZoom: cameraZoom }
    }
  }, [cameraZoom])

  const handleTouchMovePinch = useCallback((e) => {
    if (e.touches.length === 2 && pinchRef.current.active) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const scale = dist / pinchRef.current.initialDist
      const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinchRef.current.initialZoom * scale))
      onZoomChange?.(() => newZoom)
    }
  }, [onZoomChange])

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2 && pinchRef.current.active) {
      pinchRef.current.active = false
      // Snap to nearest preset after pinch ends
      onZoomChange?.(z => {
        let closest = ZOOM_PRESETS[0]
        let minDist = Math.abs(z - closest)
        for (const p of ZOOM_PRESETS) {
          const d = Math.abs(z - p)
          if (d < minDist) { closest = p; minDist = d }
        }
        return closest
      })
    }
    if (e.touches.length === 0) handleMouseUp()
  }, [handleMouseUp, onZoomChange])

  const detailLevel = getDetailLevel(cameraZoom)
  // Game-native zoom transitions: snappy but smooth, no janky web feel
  const zoomTransition = detailLevel === 'overview'
    ? '0.45s cubic-bezier(0.25, 0.1, 0.25, 1.0)'
    : '0.3s cubic-bezier(0.16, 1, 0.3, 1)'

  // Camera offset centers on the target room using image-space coordinates
  const getRoomCenter = (roomId) => {
    const target = IMAGE_ROOM_TARGETS[roomId]
    if (!target) return { x: IMG_SIZE / 2, y: IMG_SIZE / 2 }
    return {
      x: (target.x + target.w / 2) / 100 * IMG_SIZE,
      y: (target.y + target.h / 2) / 100 * IMG_SIZE,
    }
  }

  const targetPos = getRoomCenter(cameraTarget || DEFAULT_AGENT)
  const cameraOffsetX = isOverview ? 0 : -(targetPos.x - IMG_SIZE / 2)
  const cameraOffsetY = isOverview ? 0 : -(targetPos.y - IMG_SIZE / 2)

  return (
    <div
      ref={(el) => { containerRef.current = el; sizeRef.current = el }}
      style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        cursor: panState.current.dragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={(e) => { handleTouchStart(e); handleTouchStartPinch(e) }}
      onTouchMove={(e) => { handleTouchMove(e); handleTouchMovePinch(e) }}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ground plane: subtle floor beneath the building for depth */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isNightMode
          ? 'radial-gradient(ellipse at 50% 55%, rgba(30, 25, 18, 0.4) 0%, rgba(10, 15, 30, 0.1) 40%, transparent 65%)'
          : 'radial-gradient(ellipse at 50% 55%, rgba(100, 160, 80, 0.15) 0%, rgba(120, 180, 100, 0.05) 40%, transparent 65%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      {/* Window light spill on ground (night only, daytime image has its own lighting) */}
      {isNightMode && (
      <div style={{
        position: 'absolute', left: '25%', top: '55%', width: '50%', height: '30%',
        background: 'radial-gradient(ellipse, rgba(255,183,77,0.04) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0, filter: 'blur(40px)',
      }} />
      )}

      {/* Building container: outer = zoom/pan, inner = breathing float + bounce */}
      <div style={{
        transform: `translate(${panOffset.x + cameraOffsetX * cameraZoom}px, ${panOffset.y + cameraOffsetY * cameraZoom}px) scale(${cameraZoom})`,
        transition: panState.current.dragging ? 'none' : `transform ${zoomTransition}`,
        transformOrigin: 'center center',
        width: IMG_SIZE,
        height: IMG_SIZE,
        zIndex: 1,
      }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        animation: 'buildingFloat 6s ease-in-out infinite',
      }}>
        {/* The full office image - ONE cohesive building. No double walls. */}
        <img
          src={officeImage}
          alt="Corner Office"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            imageRendering: 'auto',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />

        {/* GHOST KILL: Old CanvasRoom wrapper IIFE completely removed */}
        {/* CanvasOffice 3-layer system is the only renderer (mounted at line ~5997) */}

        {/* Interactive room overlays - click targets, nameplates, status */}
        {/* C4: Wave animation on load, Crossy Road bounce on hover, isometric clip-path */}
        {rooms.map((room, roomIndex) => {
          const target = IMAGE_ROOM_TARGETS[room.id]
          if (!target) return null

          const hasAgent = room.agent !== null
          const status = agentStatus[room.id]?.status || 'IDLE'
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
          const isActive = status === 'WORKING'
          const isHovered = hoveredRoom === room.id
          const isSelected = selectedRoom === room.id
          const agentColor = room.agentColor || '#FFD87A'
          const isAway = agentAnimations?.[room.id]?.state === 'away'
          const showNameplate = detailLevel !== 'detail'
          const waveDelay = getRoomWaveDelay(room.id)

          return (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={hasLoaded ? {
                opacity: 1, scale: 1, y: 0,
              } : {}}
              transition={{
                delay: waveDelay,
                type: 'spring',
                stiffness: 380,
                damping: 16,
                mass: 0.6,
              }}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            >
              {/* NAMEPLATE PNG: Steffen's catalog asset, wall-mounted inside room */}
              {/* 128x64 transparent PNG at 2x, centered on back wall ~60% up */}
              {showNameplate && hasAgent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, y: -8 }}
                  animate={hasLoaded ? { opacity: 1, scale: 1, y: 0 } : {}}
                  transition={{ delay: waveDelay + 0.15, type: 'spring', stiffness: 400, damping: 18, mass: 0.6 }}
                  style={{
                    position: 'absolute',
                    left: `${target.x + target.w * 0.2}%`,
                    top: `${target.y + target.h * 0.08}%`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    pointerEvents: 'none', zIndex: 10,
                  }}
                >
                  {/* Nameplate PNG image from catalog */}
                  <div style={{
                    position: 'relative',
                    filter: isActive
                      ? `drop-shadow(0 2px 8px rgba(0,0,0,0.5)) drop-shadow(0 0 12px ${agentColor}30)`
                      : 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
                  }}>
                    <img
                      src={`/corner/furniture/nameplates/nameplate-${room.id}.png`}
                      alt={`${room.agent} nameplate`}
                      draggable={false}
                      style={{
                        width: 80, height: 40,
                        imageRendering: 'auto',
                        display: 'block',
                        transition: 'filter 300ms ease',
                      }}
                    />
                    {/* Status dot overlay on nameplate */}
                    <div style={{
                      position: 'absolute', top: 3, right: 3,
                      width: 7, height: 7, borderRadius: '50%',
                      background: cfg.color,
                      boxShadow: isActive ? `0 0 8px ${cfg.color}, 0 0 3px ${cfg.color}` : `0 0 4px ${cfg.color}60`,
                      animation: isActive ? 'statusPulse 1.5s ease-in-out infinite' : 'none',
                    }} />
                    {/* Active glow border */}
                    {isActive && (
                      <div style={{
                        position: 'absolute', inset: -2,
                        border: `1px solid ${agentColor}30`,
                        borderRadius: 6,
                        animation: 'nameplateGlow 2s ease-in-out infinite',
                        pointerEvents: 'none',
                      }} />
                    )}
                  </div>
                </motion.div>
              )}

              {/* DOOR SIGN PNG: Steffen's catalog asset, outside room entrance */}
              {/* 96x128 vertical sign with room number + agent name + status dot */}
              {showNameplate && hasAgent && AGENT_ROOM_NUMBERS[room.id] && (
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={hasLoaded ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: waveDelay + 0.25, type: 'spring', stiffness: 350, damping: 20, mass: 0.5 }}
                  style={{
                    position: 'absolute',
                    left: `${target.x + target.w - 1.5}%`,
                    top: `${target.y - 1}%`,
                    pointerEvents: 'none', zIndex: 9,
                  }}
                >
                  <div style={{
                    filter: isActive
                      ? `drop-shadow(0 2px 6px rgba(0,0,0,0.4)) drop-shadow(0 0 8px ${agentColor}20)`
                      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  }}>
                    <img
                      src={`/corner/furniture/doorsigns/cr-doorsign-${room.id}.png`}
                      alt={`Room ${AGENT_ROOM_NUMBERS[room.id]}`}
                      draggable={false}
                      style={{
                        width: 28, height: 38,
                        imageRendering: 'auto',
                        display: 'block',
                      }}
                    />
                  </div>
                </motion.div>
              )}

              {/* INVISIBLE HITBOX: No drawn diamond outlines. Office image walls define rooms.
                  Hover effect = subtle inner glow only (OVO approach). */}

              {/* Always-visible agent name label -- anchored below room at overview zoom, hidden at detail zoom */}
              {hasAgent && detailLevel !== 'detail' && (
                <div style={{
                  position: 'absolute',
                  left: `${target.x}%`,
                  top: `${target.y + target.h - 1}%`,
                  width: `${target.w}%`,
                  display: 'flex', justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 11,
                }}>
                  <div style={{
                    background: (isHovered || isSelected)
                      ? 'rgba(10, 18, 35, 0.92)'
                      : 'rgba(10, 18, 35, 0.7)',
                    border: (isHovered || isSelected)
                      ? `1px solid ${agentColor}60`
                      : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    padding: '2px 8px',
                    color: (isHovered || isSelected) ? '#fff' : 'rgba(26,35,50,0.85)',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                    transition: 'background 200ms ease, border-color 200ms ease, color 200ms ease',
                    boxShadow: (isHovered || isSelected)
                      ? `0 0 8px ${agentColor}30`
                      : 'none',
                  }}>
                    {room.agent}
                  </div>
                </div>
              )}

              {/* Click target overlay - INVISIBLE HITBOX with diamond clip-path for isometric hit detection */}
              {/* OVO approach: invisible hotspots matching existing art boundaries */}
              {/* Diamond clip-path prevents overlapping rectangular hitboxes from stealing clicks */}
              <motion.div
                data-room-id={room.id}
                onClick={() => hasAgent && onRoomClick?.(room.id)}
                onContextMenu={(e) => hasAgent && onRoomContextMenu?.(e, room.id)}
                onMouseEnter={() => setHoveredRoom(room.id)}
                onMouseLeave={() => setHoveredRoom(null)}
                onTouchStart={(e) => {
                  if (!hasAgent) return
                  const touch = e.touches[0]
                  const cx = touch ? touch.clientX : 0
                  const cy = touch ? touch.clientY : 0
                  roomLongPressRef.current = setTimeout(() => {
                    onRoomContextMenu?.({ clientX: cx, clientY: cy, preventDefault: () => {} }, room.id)
                  }, 500)
                }}
                onTouchEnd={() => clearTimeout(roomLongPressRef.current)}
                onTouchMove={() => clearTimeout(roomLongPressRef.current)}
                whileHover={hasAgent ? {
                  scale: 1.02,
                  transition: { type: 'spring', stiffness: 500, damping: 12, mass: 0.5 }
                } : {}}
                whileTap={hasAgent ? {
                  scale: 0.97,
                  transition: { type: 'spring', stiffness: 700, damping: 15 }
                } : {}}
                style={{
                  position: 'absolute',
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                  width: `${target.w}%`,
                  height: `${target.h}%`,
                  cursor: hasAgent ? 'pointer' : 'default',
                  pointerEvents: 'auto',
                  clipPath: target.clipPath,
                  zIndex: (isHovered || isSelected) ? 5 : 2,
                  borderRadius: 6,
                  background: (isHovered || isSelected) && hasAgent
                    ? `radial-gradient(ellipse, ${agentColor}30 0%, ${agentColor}08 50%, transparent 80%)`
                    : 'transparent',
                  boxShadow: (isHovered || isSelected) && hasAgent
                    ? `inset 0 0 40px ${agentColor}18`
                    : 'none',
                  transition: 'background 250ms ease, box-shadow 250ms ease',
                }}
              >
                {isAway && (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    background: 'rgba(10, 15, 30, 0.9)', border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 12, padding: '4px 12px',
                    color: '#F59E0B', fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em',
                    zIndex: 6,
                  }}>
                    {agentAnimations?.[room.id]?.label || 'Away'}
                  </div>
                )}

                {isAway && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.55)',
                    pointerEvents: 'none',
                  }} />
                )}

                {hasAgent && !isAway && (
                  <motion.div
                    animate={isActive ? {
                      scale: [1, 1.3, 1],
                    } : {}}
                    transition={isActive ? {
                      repeat: Infinity,
                      duration: 1.5,
                      ease: 'easeInOut',
                    } : {}}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 8, height: 8, borderRadius: '50%',
                      background: cfg.color,
                      opacity: isActive ? 1 : 0.6,
                      boxShadow: isActive ? `0 0 10px ${cfg.color}` : 'none',
                      zIndex: 3,
                    }}
                  />
                )}

                {/* Bobby3: Old floating character REMOVED -- bobble Elon lives on Canvas only */}
              </motion.div>
            </motion.div>
          )
        })}
      </div>
      </div>
    </div>
  )
}

// ---- URL PARSER -- renders clickable links inside chat message text --------
// Configure marked for chat rendering: GFM on, line breaks on, no mangle
marked.setOptions({ gfm: true, breaks: true })

// MarkdownMessage: renders assistant message content as markdown HTML.
// Uses dangerouslySetInnerHTML -- content is agent-generated, not user input.
// User messages stay plain text via renderPlainContent.
function MarkdownMessage({ text, agentColor, streaming }) {
  if (!text || typeof text !== 'string') return null
  // Normalize escaped newlines (relay messages store \n as literal 2-char sequence)
  let normalized = text.replace(/\\n/g, '\n')
  let html
  try {
    html = marked.parse(normalized)
  } catch {
    html = normalized
  }
  return (
    <div
      className="md-msg"
      data-agent-color={agentColor}
      style={{ '--agent-color': agentColor || '#7CB9FF' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// renderPlainContent: for user messages -- splits on URLs, wraps in <a>.
function renderPlainContent(text, accentColor) {
  if (!text || typeof text !== 'string') return null
  const URL_RE = /(https?:\/\/[^\s]+)/g
  const IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g
  const result = []
  let lastIndex = 0
  let match
  IMG_RE.lastIndex = 0
  while ((match = IMG_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(renderPlainContent._renderText(text.slice(lastIndex, match.index), accentColor, result.length))
    }
    result.push(
      <img
        key={`img-${match.index}`}
        src={match[2]}
        alt={match[1] || 'image'}
        style={{
          display: 'block',
          maxWidth: '100%',
          maxHeight: 200,
          borderRadius: 8,
          border: '1px solid rgba(59,130,246,0.25)',
          marginTop: 6,
          objectFit: 'cover',
          cursor: 'pointer',
        }}
        onClick={e => { e.stopPropagation(); window.open(match[2], '_blank') }}
      />
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    result.push(renderPlainContent._renderText(text.slice(lastIndex), accentColor, result.length))
  }
  if (result.length === 0) return text
  if (result.length === 1 && typeof result[0] === 'string') return result[0]
  return result
}
renderPlainContent._renderText = function(text, accentColor, keyOffset) {
  const URL_RE = /(https?:\/\/[^\s]+)/g
  const parts = text.split(URL_RE)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    if (URL_RE.test(part)) {
      URL_RE.lastIndex = 0
      return (
        <a
          key={`url-${keyOffset}-${i}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            color: accentColor ? `${accentColor}EE` : '#7CB9FF',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
            wordBreak: 'break-all',
          }}
        >
          {part}
        </a>
      )
    }
    URL_RE.lastIndex = 0
    return part
  })
}

// ---- RIGHT-CLICK CONTEXT MENU (Figma/VS Code style) -----------------------
// Clean, simple, no modals. Appears at cursor, disappears on click-away.
// Types: 'room', 'task', 'agent', 'project'
function ContextMenu({ type, data, position, onClose, onAction }) {
  const menuRef = useRef(null)

  // Close on click outside or Escape (mousedown for desktop, touchstart for iPad)
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick, { passive: true })
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Prevent going off-screen
  const [adjusted, setAdjusted] = useState(position)
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const newPos = { ...position }
      if (rect.right > window.innerWidth - 8) newPos.x = window.innerWidth - rect.width - 8
      if (rect.bottom > window.innerHeight - 8) newPos.y = window.innerHeight - rect.height - 8
      if (newPos.x < 8) newPos.x = 8
      if (newPos.y < 8) newPos.y = 8
      setAdjusted(newPos)
    }
  }, [position])

  const menuItems = useMemo(() => {
    switch (type) {
      case 'room':
        return [
          { id: 'open-chat', label: 'Open Chat', icon: MessageSquare, accent: true },
          { id: 'send-message', label: 'Send Message', icon: Send },
          { id: 'view-tasks', label: 'View Tasks', icon: ListTodo },
          { divider: true },
          { id: 'set-home', label: 'Set as Home', icon: Home },
        ]
      case 'task':
        return [
          { id: 'done', label: data?.done ? 'Mark Incomplete' : 'Mark Done', icon: CheckCircle2, accent: !data?.done },
          { divider: true },
          { id: 'move', label: 'Move to Project...', icon: FolderKanban },
          { id: 'reassign', label: 'Reassign Agent...', icon: ArrowRight },
          { id: 'priority', label: 'Set Priority', icon: Zap },
          { divider: true },
          { id: 'delete', label: 'Delete Task', icon: X, danger: true },
        ]
      case 'agent':
        return [
          { id: 'chat', label: `Chat with ${data?.name || 'Agent'}`, icon: MessageSquare, accent: true },
          { id: 'assign', label: 'Assign Task', icon: Plus },
          { id: 'status', label: 'View Status', icon: Activity },
          { divider: true },
          { id: 'tasks', label: 'View All Tasks', icon: ListTodo },
          { id: 'completions', label: 'Recent Completions', icon: GitCommit },
        ]
      case 'project':
        return [
          { id: 'add', label: 'Add Task', icon: Plus, accent: true },
          { id: 'expand', label: 'View Tasks', icon: ListTodo },
          { divider: true },
          { id: 'archive', label: 'Archive Pill', icon: ArrowRight },
        ]
      case 'message':
        return [
          { id: 'create-task', label: 'Create Task from Message', icon: Plus, accent: true },
          { id: 'reply', label: 'Reply', icon: Reply },
          { id: 'copy', label: 'Copy Text', icon: Copy },
          { id: 'send-to', label: 'Send to...', icon: Send },
          { divider: true },
          { id: 'resend', label: 'Resend', icon: RotateCcw },
        ]
      default:
        return []
    }
  }, [type, data])

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12, ease: [0.2, 0.9, 0.3, 1] }}
      style={{
        position: 'fixed',
        left: adjusted.x,
        top: adjusted.y,
        zIndex: 200,
        minWidth: 200,
        background: 'rgba(12, 18, 35, 0.96)',
        backdropFilter: 'blur(20px)',
        border: '2px solid rgba(100, 180, 255, 0.18)',
        borderRadius: 10,
        padding: '6px 0',
        boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(100,180,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Type header */}
      {data?.label && (
        <div style={{
          padding: '6px 14px 8px',
          fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
          color: '#4A6080', textTransform: 'uppercase', letterSpacing: '0.12em',
          borderBottom: '1px solid rgba(100,180,255,0.08)',
          marginBottom: 2,
        }}>
          {data.label}
        </div>
      )}

      {menuItems.map((item, i) => {
        if (item.divider) {
          return <div key={`div-${i}`} style={{ height: 1, background: 'rgba(100,180,255,0.08)', margin: '4px 10px' }} />
        }
        const Icon = item.icon
        return (
          <button
            key={item.id}
            onClick={() => { onAction(item.id, data); onClose() }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: item.danger ? '#EF4444' : item.accent ? '#5BB8FF' : '#D0D8E8',
              fontSize: 14, fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'background 80ms ease',
              textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.1)' : 'rgba(100,180,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Icon size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
            {item.label}
          </button>
        )
      })}
    </motion.div>
  )
}

// ---- SEND-TO SMART PICKER ----
// Shows recent agents + search. Appears at message position.
function SendToMenu({ position, onClose, onSelect, currentAgent }) {
  const menuRef = useRef(null)
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  // No persistent recent agents -- use empty array (no localStorage)
  const recentAgents = useMemo(() => {
    return []
  }, [currentAgent])

  // All agents filtered by search
  const filteredAgents = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return AGENTS.filter(a => a.slug !== currentAgent && !recentAgents.some(r => r.slug === a.slug))
    return AGENTS.filter(a =>
      a.slug !== currentAgent &&
      (a.slug.includes(q) || (a.name || '').toLowerCase().includes(q) || (a.role || '').toLowerCase().includes(q))
    )
  }, [search, currentAgent, recentAgents])

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // Close on click outside / Escape (mousedown for desktop, touchstart for iPad)
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick, { passive: true })
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Viewport-clamp position
  const [adjusted, setAdjusted] = useState(position)
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const newPos = { ...position }
      if (rect.right > window.innerWidth - 8) newPos.x = window.innerWidth - rect.width - 8
      if (rect.bottom > window.innerHeight - 8) newPos.y = window.innerHeight - rect.height - 8
      if (newPos.x < 8) newPos.x = 8
      if (newPos.y < 8) newPos.y = 8
      setAdjusted(newPos)
    }
  }, [position])

  const AgentRow = ({ agent }) => (
    <button
      key={agent.slug}
      onClick={() => { onSelect(agent); onClose() }}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
        color: '#D0D8E8', fontSize: 13, fontWeight: 500,
        fontFamily: "'Inter', system-ui, sans-serif", textAlign: 'left',
        transition: 'background 80ms ease',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(100,180,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <SpriteAvatar agentSlug={agent.slug} size={22} borderColor={agent.agentColor || agent.color || '#6B7280'} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#E8ECF0' }}>{agent.name || agent.slug}</div>
        {agent.role && <div style={{ fontSize: 10, color: '#4A6080', fontFamily: "'JetBrains Mono', monospace" }}>{agent.role}</div>}
      </div>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: agent.agentColor || agent.color || '#6B7280', flexShrink: 0 }} />
    </button>
  )

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12, ease: [0.2, 0.9, 0.3, 1] }}
      style={{
        position: 'fixed',
        left: adjusted.x,
        top: adjusted.y,
        zIndex: 210,
        width: 240,
        background: 'rgba(10, 16, 30, 0.97)',
        backdropFilter: 'blur(20px)',
        border: '2px solid rgba(100, 180, 255, 0.18)',
        borderRadius: 10,
        boxShadow: '0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(100,180,255,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '8px 14px 6px',
        fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
        color: '#4A6080', textTransform: 'uppercase', letterSpacing: '0.12em',
        borderBottom: '1px solid rgba(100,180,255,0.08)',
      }}>
        Send to...
      </div>

      {/* Search */}
      <div style={{ padding: '6px 10px' }}>
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agent..."
          style={{
            width: '100%', padding: '6px 10px',
            background: 'rgba(100,180,255,0.06)',
            border: '1px solid rgba(100,180,255,0.15)',
            borderRadius: 6, fontSize: 12, fontWeight: 500,
            color: '#E2E8F0', fontFamily: "'Inter', sans-serif",
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Recent agents (when no search) */}
      {!search && recentAgents.length > 0 && (
        <div>
          <div style={{
            padding: '4px 14px 2px',
            fontSize: 9, fontWeight: 800, color: '#4A6080',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Recent
          </div>
          {recentAgents.map(a => <AgentRow key={a.slug} agent={a} />)}
        </div>
      )}

      {/* Divider if recent + more */}
      {!search && recentAgents.length > 0 && filteredAgents.length > 0 && (
        <div style={{ height: 1, background: 'rgba(100,180,255,0.08)', margin: '2px 10px' }} />
      )}

      {/* All agents / search results */}
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {(!search ? filteredAgents : filteredAgents).slice(0, 12).map(a => <AgentRow key={a.slug} agent={a} />)}
        {filteredAgents.length === 0 && (
          <div style={{
            padding: '10px 14px', fontSize: 12, color: '#4A6080',
            fontFamily: "'Inter', sans-serif", fontStyle: 'italic',
          }}>
            No agents found
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---- MINI-MAP (bottom-left, Steffen HUD spec) with camera indicator --------
function MiniMap({ rooms, agentStatus, selectedRoom, cameraTarget, cameraZoom, isOverview, onRoomClick }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', bottom: 80, left: 16, zIndex: 35,
        width: 160, height: 120,
        background: 'rgba(10, 15, 30, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        padding: 8,
      }}
    >
      {/* Title */}
      <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
        MAP {IS_LOCAL && <span style={{ color: '#4CAF50' }}>LOCAL</span>}
      </div>
      <svg width={144} height={96} viewBox="0 0 320 320">
        {rooms.map(room => {
          const x = (room.position.col / 2) * 80
          const y = room.position.row * 80
          const w = (room.size.cols / 2) * 80
          const h = room.size.rows * 80
          const isActive = agentStatus[room.id]?.status === 'WORKING'
          const isCameraHere = cameraTarget === room.id
          return (
            <g key={room.id}>
              <rect
                x={x} y={y} width={w} height={h}
                fill={room.agentColor || '#4A5568'}
                opacity={isActive ? 0.6 : 0.3}
                stroke={isCameraHere ? '#FDF6EC' : (selectedRoom === room.id ? '#FDF6EC' : 'rgba(255,255,255,0.1)')}
                strokeWidth={isCameraHere ? 3 : (selectedRoom === room.id ? 2 : 0.5)}
                rx={2}
                style={{ cursor: room.agent ? 'pointer' : 'default' }}
                onClick={() => room.agent && onRoomClick(room.id)}
              />
              {/* Camera icon on current room */}
              {isCameraHere && !isOverview && (
                <circle cx={x + w / 2} cy={y + h / 2} r={4} fill="#FDF6EC" opacity={0.9}>
                  <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Agent initial */}
              {room.agent && (
                <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fill="#FDF6EC" fontSize={12} fontWeight={700} opacity={0.5}>
                  {room.agent?.charAt(0)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </motion.div>
  )
}

// ---- NOTIFICATION TOAST (top-right) - Steffen C3 toast spec ----------------
// 4 types: task_complete (green), handoff (blue), error_recovery (yellow), system (gray)
const TOAST_TYPES = {
  task_complete: { accent: '#22C55E', icon: CheckCircle2, autoDismiss: 5000 },
  handoff: { accent: '#3B82F6', icon: ArrowRight, autoDismiss: 5000 },
  error_recovery: { accent: '#F59E0B', icon: AlertTriangle, autoDismiss: 8000 },
  system: { accent: '#6B7280', icon: Terminal, autoDismiss: 4000 },
}

function NotificationToast({ notifications, onDismiss, onClickNotification, queuedCount }) {
  const [hoveredId, setHoveredId] = useState(null)

  return (
    <div style={{
      position: 'fixed', top: 80, left: 16, zIndex: 45,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}
      role="status" aria-live="polite"
    >
      <AnimatePresence>
        {notifications.slice(0, 3).map(n => {
          const toastType = TOAST_TYPES[n.type] || TOAST_TYPES.system
          const accentColor = toastType.accent
          const EventIcon = toastType.icon
          const isHovered = hoveredId === n.id

          return (
            <motion.div
              key={n.id}
              role="alert"
              initial={{ x: -340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -340, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              onClick={() => onClickNotification?.(n)}
              onMouseEnter={() => setHoveredId(n.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                width: 320, cursor: n.type !== 'system' ? 'pointer' : 'default',
                background: 'rgba(10, 15, 30, 0.95)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${accentColor}33`,
                borderLeft: `3px solid ${accentColor}`,
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2)',
                padding: '12px 14px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <SpriteAvatar agentSlug={n.agentSlug} size={24} borderColor={n.agentColor || accentColor} />
                <EventIcon size={14} color={accentColor} />
                <span style={{ color: n.agentColor || accentColor, fontSize: 12, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {n.agentName || 'System'}
                </span>
                <span style={{ marginLeft: 'auto', color: '#6B7280', fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {n.time}
                </span>
                {/* Dismiss button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDismiss?.(n.id) }}
                  aria-label="Dismiss notification"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: isHovered ? '#F0ECE6' : '#4A5060',
                    padding: 2, transition: 'color 150ms',
                  }}
                >
                  <X size={12} />
                </button>
              </div>

              {/* Message */}
              <div style={{
                color: '#F0ECE6', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {n.message}
              </div>

              {/* Dismiss timer progress bar */}
              {!isHovered && (
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: (toastType.autoDismiss || 5000) / 1000, ease: 'linear' }}
                  onAnimationComplete={() => onDismiss?.(n.id)}
                  style={{
                    position: 'absolute', bottom: 0, left: 0,
                    height: 2, background: `${accentColor}4D`,
                    borderRadius: '0 0 8px 8px',
                  }}
                />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Queued toast indicator */}
      {queuedCount > 0 && (
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 12,
          color: '#6B7280', textAlign: 'center', marginTop: 4,
        }}>
          +{queuedCount} more
        </div>
      )}
    </div>
  )
}

// ---- MOBILE MODE TAB BAR (Steffen c3-mobile-layout-spec) --------------------
function MobileModeBar({ currentMode, onModeSwitch }) {
  const modeList = [MODES.game, MODES.checklist, MODES.megaboard]

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 29,
      minHeight: 48,
      background: 'rgba(10, 15, 30, 0.98)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      display: 'flex', alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {modeList.map(mode => {
        const active = currentMode === mode.id
        const Icon = mode.icon
        return (
          <button
            key={mode.id}
            onClick={() => onModeSwitch(mode.id)}
            style={{
              flex: 1, height: 48,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              color: active ? '#3B9EFF' : '#6B7280',
              minWidth: 48, minHeight: 48, // Touch target 44px+ met
            }}
          >
            <Icon size={22} />
            {active && (
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#3B9EFF' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

// Snap points: HIDDEN (off-screen), HALF (~50% screen), FULL (100% screen)
// Anchored to bottom of screen. Animates HEIGHT with spring physics.
// Content (chat input, task lists) always fills the visible area correctly.

function MobileDrawer({
  room, agent, agentStatus, onClose, agentSlug,
  // Chat props (passed through to UnifiedPanel)
  chatMessages, chatInput, onChatInputChange, onSendMessage, streaming, chatLoading,
  allAgentStatus, data, isNightMode, onAddToRightNow, rightNowTasks,
  atMenuOpen, filteredAtOptions, atMenuIndex, onAtSelect, onAtKeyDown, cornerConfig,
  // Powerup props
  powerupOpen, onPowerupToggle, onPowerupActivate, selectedPowerups, onRemovePowerup,
  // Task confirm props
  onDismissMessage, onTaskNotDone,
  // Unread clear: called when user focuses the chat input
  onClearUnread,
  // Snap state (controlled from parent)
  snap, onSnapChange,
}) {
  const sheetRef = useRef(null)
  const dragStartY = useRef(0)
  const dragStartTime = useRef(0)
  const dragStartHeight = useRef(0)
  const isDraggingHandle = useRef(false)
  const [handlePulsed, setHandlePulsed] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [mobileViewportHeight, setMobileViewportHeight] = useState(null)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const preKeyboardSnapRef = useRef(null)

  const agentColor = room?.agentColor || agent?.color || '#6B7280'
  const status = agentStatus?.status || 'IDLE'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE

  // Compute snap heights (sheet height from bottom)
  // MobileModeBar KILLED (Round 2). Sheet sits at bottom directly.
  const getSnapHeights = useCallback(() => {
    const vh = mobileViewportHeight || window.innerHeight
    return {
      hidden: 0,
      half: Math.round(vh * 0.52), // ~52% of viewport
      full: vh, // full viewport height (shrinks to visualViewport when keyboard is open)
    }
  }, [mobileViewportHeight])

  // Motion value for sheet height (start at 0 so it animates UP on first render)
  const sheetHeight = useMotionValue(0)

  // Animate to snap height when snap prop changes
  // Three positions only: hidden (0), half (~52%), full (100%)
  useEffect(() => {
    const heights = getSnapHeights()
    // null snap = closed/hidden
    const target = snap === null ? heights.hidden : (heights[snap] ?? heights.hidden)
    fmAnimate(sheetHeight, target, {
      type: 'spring',
      stiffness: 400,
      damping: 38,
      mass: 0.7,
    })
  }, [snap, mobileViewportHeight]) // eslint-disable-line react-hooks/exhaustive-deps

  // iOS keyboard awareness: auto-snap to FULL when keyboard opens, restore on close
  useEffect(() => {
    if (!window.visualViewport) return
    const handler = () => {
      const vvh = window.visualViewport.height
      const wh = window.innerHeight
      const kbOpen = vvh < wh - 50
      if (kbOpen) {
        // Keyboard just opened
        setMobileViewportHeight(vvh)
        if (!keyboardOpen) {
          // Save current snap so we can restore it when keyboard closes.
          // Only overwrite if onInputFocus hasn't already set the restore target.
          if (preKeyboardSnapRef.current === null) {
            preKeyboardSnapRef.current = snap
          }
          setKeyboardOpen(true)
          // Auto-snap to full so chat input stays visible above keyboard
          onSnapChange('full')
        } else {
          // Keyboard height changed (e.g. predictive bar toggled)
          // Re-animate to new full height
          const newFull = vvh
          fmAnimate(sheetHeight, newFull, {
            type: 'spring', stiffness: 400, damping: 38, mass: 0.7,
          })
        }
      } else {
        // Keyboard closed
        setMobileViewportHeight(null)
        if (keyboardOpen) {
          setKeyboardOpen(false)
          // Restore previous snap point
          const restoreSnap = preKeyboardSnapRef.current || 'half'
          preKeyboardSnapRef.current = null
          onSnapChange(restoreSnap)
        }
      }
    }
    window.visualViewport.addEventListener('resize', handler)
    return () => window.visualViewport.removeEventListener('resize', handler)
  }, [keyboardOpen, snap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Snap to nearest height based on current height + velocity
  const snapToNearest = useCallback((currentHeight, velocityY) => {
    const heights = getSnapHeights()
    let targetSnap

    // velocityY: negative = swiping up (increasing height), positive = swiping down
    if (Math.abs(velocityY) > 400) {
      if (velocityY > 0) {
        // Swiping down (decreasing height)
        targetSnap = snap === 'full' ? 'half' : 'hidden'
      } else {
        // Swiping up (increasing height)
        targetSnap = snap === 'half' ? 'full' : 'half'
      }
    } else {
      // Slow drag: snap to closest
      const dists = [
        { key: 'full', d: Math.abs(currentHeight - heights.full) },
        { key: 'half', d: Math.abs(currentHeight - heights.half) },
        { key: 'hidden', d: Math.abs(currentHeight - heights.hidden) },
      ]
      dists.sort((a, b) => a.d - b.d)
      targetSnap = dists[0].key
    }

    const targetH = heights[targetSnap] ?? heights.hidden
    fmAnimate(sheetHeight, targetH, {
      type: 'spring',
      stiffness: 400,
      damping: 38,
      mass: 0.7,
    })

    if (targetSnap === 'hidden') {
      onClose()
    } else {
      onSnapChange(targetSnap)
    }
  }, [snap, getSnapHeights, sheetHeight, onClose, onSnapChange])

  // One-time pulse glow on drag handle to teach the gesture
  useEffect(() => {
    if (!handlePulsed) {
      const timer = setTimeout(() => setHandlePulsed(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [handlePulsed])

  // Drag handle touch handlers
  const handleDragStart = useCallback((e) => {
    dragStartY.current = e.touches[0].clientY
    dragStartTime.current = Date.now()
    dragStartHeight.current = sheetHeight.get()
    isDraggingHandle.current = true
  }, [sheetHeight])

  const handleDragMove = useCallback((e) => {
    if (!isDraggingHandle.current) return
    e.preventDefault()
    const touch = e.touches[0]
    // Dragging UP (negative deltaY) = increasing height
    const deltaY = touch.clientY - dragStartY.current
    const heights = getSnapHeights()
    const newHeight = Math.max(0, Math.min(heights.full + 30, dragStartHeight.current - deltaY))
    sheetHeight.set(newHeight)
  }, [sheetHeight, getSnapHeights])

  const handleDragEnd = useCallback((e) => {
    if (!isDraggingHandle.current) return
    isDraggingHandle.current = false
    const endY = e.changedTouches[0].clientY
    const totalDelta = endY - dragStartY.current
    const elapsed = Math.max(1, Date.now() - dragStartTime.current)
    const velocityY = (totalDelta / elapsed) * 1000 // px/sec (positive = down)
    snapToNearest(sheetHeight.get(), velocityY)
  }, [sheetHeight, snapToNearest])

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'tasks', label: 'List', icon: ListTodo },
    { id: 'info', label: 'Info', icon: Activity },
  ]

  // At FULL snap, the sheet covers the mode bar so we need safe-area at bottom
  const isFullSnap = snap === 'full'

  // When keyboard is open, position drawer so it sits above the keyboard
  // visualViewport.offsetTop gives the scroll offset from keyboard push
  const kbBottomOffset = keyboardOpen
    ? (window.innerHeight - (window.visualViewport?.height || window.innerHeight))
    : 0

  return (
    <motion.div
      ref={sheetRef}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: keyboardOpen ? kbBottomOffset : (isFullSnap ? 0 : 'env(safe-area-inset-bottom, 0px)'),
        height: sheetHeight,
        zIndex: isFullSnap || keyboardOpen ? 200 : 38,
        background: 'rgba(10, 15, 30, 0.98)',
        borderRadius: (isFullSnap || keyboardOpen) ? 0 : '16px 16px 0 0',
        boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        willChange: 'transform',
      }}
    >
      {/* Drag handle area */}
      <div
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: isFullSnap ? 'calc(10px + env(safe-area-inset-top, 0px)) 0 6px' : '10px 0 6px',
          cursor: 'grab',
          touchAction: 'none',
          flexShrink: 0,
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <div style={{
          width: 48, height: 5, borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.35)',
          boxShadow: !handlePulsed ? '0 0 8px rgba(255, 255, 255, 0.4)' : 'none',
          animation: !handlePulsed ? 'handlePulse 1.5s ease-in-out infinite' : 'none',
        }} />
      </div>

      {/* Agent info header (compact) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '2px 16px 8px', flexShrink: 0,
      }}>
        <SpriteAvatar agentSlug={room?.id} size={36} borderColor={agentColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: '#F1F5F9', fontSize: 16, fontWeight: 700,
            fontFamily: "'Inter', system-ui, sans-serif",
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {agent?.name || room?.agent}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              color: '#6B7280', fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {agent?.role || room?.role}
            </span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: cfg.color, background: cfg.bg,
              padding: '1px 6px', borderRadius: 3,
            }}>
              {cfg.label}
            </span>
          </div>
        </div>
      </div>

      {/* Tab bar (Chat / List / Info) */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid rgba(59, 130, 246, 0.15)',
        flexShrink: 0,
      }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, padding: '10px 0', minHeight: 44,
                fontSize: 13, fontWeight: active ? 800 : 600,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: active ? '#60A5FA' : '#6B8AB0',
                background: active ? 'rgba(59, 130, 246, 0.06)' : 'none',
                border: 'none', cursor: 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif",
                position: 'relative',
                transition: 'color 200ms, background 200ms',
              }}
            >
              <Icon size={14} />
              {tab.label}
              {active && (
                <div style={{
                  position: 'absolute', bottom: -2, left: '20%', right: '20%',
                  height: 2, background: '#3B82F6', borderRadius: 1,
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content (fills remaining height, content is always within visible area) */}
      <div style={{
        flex: 1, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        touchAction: 'auto',
        paddingBottom: isFullSnap ? 'env(safe-area-inset-bottom, 0px)' : 0,
      }}>
        {activeTab === 'chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <UnifiedPanel
              key={`drawer-chat-${agentSlug}`}
              room={room}
              agent={agent}
              agentStatus={agentStatus}
              allAgentStatus={allAgentStatus}
              onClose={onClose}
              onChat={() => {}}
              chatMessages={chatMessages}
              chatInput={chatInput}
              onChatInputChange={onChatInputChange}
              streaming={streaming}
              chatLoading={chatLoading}
              agentSlug={agentSlug}
              isExtended={false}
              onToggleExtend={() => {}}
              isMobile={true}
              atMenuOpen={atMenuOpen}
              filteredAtOptions={filteredAtOptions}
              atMenuIndex={atMenuIndex}
              onAtSelect={onAtSelect}
              onAtKeyDown={onAtKeyDown}
              cornerConfig={cornerConfig}
              data={data}
              activeTab="chat"
              onActiveTabChange={() => {}}
              isNightMode={isNightMode}
              onAddToRightNow={onAddToRightNow}
              rightNowTasks={rightNowTasks}
              onSendMessage={onSendMessage}
              powerupOpen={powerupOpen}
              onPowerupToggle={onPowerupToggle}
              onPowerupActivate={onPowerupActivate}
              selectedPowerups={selectedPowerups}
              onRemovePowerup={onRemovePowerup}
              onDismissMessage={onDismissMessage}
              onTaskNotDone={onTaskNotDone}
              onInputFocus={() => {
                onClearUnread?.(agentSlug)
                if (snap !== 'full') {
                  // Save current snap BEFORE changing so keyboard-close restores correctly
                  preKeyboardSnapRef.current = snap
                  onSnapChange('full')
                }
              }}
            />
          </div>
        )}

        {activeTab === 'tasks' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <UnifiedPanel
              key={`drawer-tasks-${agentSlug}`}
              room={room}
              agent={agent}
              agentStatus={agentStatus}
              allAgentStatus={allAgentStatus}
              onClose={onClose}
              onChat={() => {}}
              chatMessages={[]}
              chatInput=""
              onChatInputChange={() => {}}
              streaming={false}
              chatLoading={false}
              agentSlug={agentSlug}
              isExtended={false}
              onToggleExtend={() => {}}
              isMobile={true}
              data={data}
              activeTab="tasks"
              onActiveTabChange={() => {}}
              isNightMode={isNightMode}
              onAddToRightNow={onAddToRightNow}
              rightNowTasks={rightNowTasks}
              cornerConfig={cornerConfig}
              onInputFocus={() => {
                if (snap !== 'full') {
                  preKeyboardSnapRef.current = snap
                  onSnapChange('full')
                }
              }}
            />
          </div>
        )}

        {activeTab === 'info' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <UnifiedPanel
              key={`drawer-info-${agentSlug}`}
              room={room}
              agent={agent}
              agentStatus={agentStatus}
              allAgentStatus={allAgentStatus}
              onClose={onClose}
              onChat={() => {}}
              chatMessages={[]}
              chatInput=""
              onChatInputChange={() => {}}
              streaming={false}
              chatLoading={false}
              agentSlug={agentSlug}
              isExtended={false}
              onToggleExtend={() => {}}
              isMobile={true}
              data={data}
              activeTab="info"
              onActiveTabChange={() => {}}
              isNightMode={isNightMode}
              onAddToRightNow={onAddToRightNow}
              rightNowTasks={rightNowTasks}
              cornerConfig={cornerConfig}
              onInputFocus={() => {
                if (snap !== 'full') {
                  preKeyboardSnapRef.current = snap
                  onSnapChange('full')
                }
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---- KEYBOARD SHORTCUTS OVERLAY -------------------------------------------
function ShortcutsOverlay({ onClose }) {
  const shortcuts = [
    { key: '1', action: 'Game mode' },
    { key: '2', action: 'Checklist mode' },
    { key: '3', action: 'Megaboard mode' },
    { key: '/', action: 'Focus chat input' },
    { key: 'T', action: 'Toggle Task HUD' },
    { key: 'M', action: 'Toggle mini-map' },
    { key: 'O', action: 'Overview / zoom out' },
    { key: '+/-', action: 'Zoom in / out' },
    { key: 'Scroll', action: 'Scroll wheel zoom' },
    { key: 'Click+Drag', action: 'Pan when zoomed' },
    { key: 'Double-click', action: 'Zoom to detail view' },
    { key: 'Esc', action: 'Close / go back' },
    { key: '?', action: 'Show this overlay' },
    { key: 'Cmd+K', action: 'Command palette' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0C1120', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: 24, width: 360,
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14,
          color: '#FDF6EC', textTransform: 'uppercase', letterSpacing: '0.05em',
          marginBottom: 16,
        }}>
          Keyboard Shortcuts
        </div>
        {shortcuts.map(s => (
          <div key={s.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{
              fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, color: '#A8A29E',
            }}>
              {s.action}
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 12,
              color: '#6B7280', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4, padding: '2px 8px',
            }}>
              {s.key}
            </span>
          </div>
        ))}
        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 16, padding: '10px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, color: '#6B7280', cursor: 'pointer',
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12,
          }}
        >
          Close (Esc)
        </button>
      </motion.div>
    </motion.div>
  )
}

// ---- TASK HUD (top drawer) - aligned to Steffen c2-hud-spec ----------------
function TaskHUD({ data, isOpen, onToggle, selectedAgent, onSelectAgent, onOpenSettings, isMobile, currentMode, onModeSwitch, detailLevel, isNightMode, viewMode, onViewModeSwitch, onResetLayout, onUnstuck, currentUser, onSignOut, rightNowTasks }) {
  const [teamOpen, setTeamOpen] = useState(false)
  const [layoutResetToast, setLayoutResetToast] = useState(false)
  const [unstuckToast, setUnstuckToast] = useState(null) // null | 'loading' | 'done'
  const [teamName, setTeamName] = useState('aom')
  const [editingName, setEditingName] = useState(false)
  const teamRef = useRef(null)
  const [cornerConfig, setCornerConfig] = useState(null)
  const [activeProjectDropdown, setActiveProjectDropdown] = useState(null)
  const projectPillRefs = useRef({})

  // Fetch corner config for project teams
  useEffect(() => {
    fetch('/api/local/file?path=context/corner-config.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCornerConfig(data) })
      .catch(() => {})
  }, [])

  // Close team popout on outside click
  useEffect(() => {
    if (!teamOpen && !activeProjectDropdown) return
    const handler = (e) => {
      if (teamOpen && teamRef.current && !teamRef.current.contains(e.target)) setTeamOpen(false)
      if (activeProjectDropdown) {
        const ref = projectPillRefs.current[activeProjectDropdown]
        if (ref && !ref.contains(e.target)) setActiveProjectDropdown(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [teamOpen, activeProjectDropdown])

  // Team name is in-memory only (no persistence)

  // Agent statuses from data
  const agentStatuses = data?.agents || []
  const getAgentStatus = (slug) => {
    const a = agentStatuses.find(x => x.slug === slug)
    return a?.status || 'IDLE'
  }
  const statusDotColor = { WORKING: '#22C55E', BLOCKED: '#EF4444', DONE: '#3B82F6', WAITING: '#F59E0B', PAUSED: '#F97316', IDLE: '#6B7280' }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 35,
      touchAction: 'auto',
      paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : 0,
      background: isNightMode
        ? 'rgba(15,27,45,0.95)'
        : 'rgba(18, 42, 75, 0.96)',
    }}>
      {/* Top bar */}
      <div style={{
        height: isMobile ? 48 : 52,
        transition: 'background 500ms ease, border-color 500ms ease, box-shadow 500ms ease',
        background: isNightMode
          ? 'linear-gradient(180deg, rgba(15,27,45,0.95) 0%, rgba(15,27,45,0.88) 100%)'
          : 'rgba(18, 42, 75, 0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: isNightMode
          ? '1px solid rgba(59,130,246,0.15)'
          : '2px solid rgba(59, 130, 246, 0.35)',
        boxShadow: isNightMode
          ? '0 2px 12px rgba(0, 0, 0, 0.4)'
          : '0 2px 12px rgba(0,0,0,0.3), 0 1px 0 rgba(59,130,246,0.15)',
        display: 'flex', alignItems: 'center',
        padding: isMobile ? '0 12px' : '0 20px',
        gap: isMobile ? 8 : 12,
        overflowX: isMobile ? 'auto' : 'hidden',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }} className="topbar-scroll">
        {/* Corner. logo */}
        <div style={{
          fontSize: 22, fontWeight: 900,
          color: isNightMode ? '#F1F5F9' : '#60A5FA',
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '0.01em', flexShrink: 0,
        }}>
          Corner<span style={{ color: isNightMode ? '#3B82F6' : '#E85D26' }}>.</span>
        </div>

        {/* LOCAL badge -- subtle dot on mobile, text on desktop */}
        {IS_LOCAL && (
          isMobile ? (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22C55E',
              boxShadow: '0 0 4px rgba(34,197,94,0.5)',
              flexShrink: 0,
            }} />
          ) : (
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: '#22C55E',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 4, padding: '2px 6px',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              fontFamily: "'Inter', sans-serif",
              flexShrink: 0,
            }}>LOCAL</span>
          )
        )}

        {/* DEMO badge (production) */}
        {!IS_LOCAL && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: '#60A5FA',
            background: 'rgba(96,165,250,0.1)',
            border: '1px solid rgba(96,165,250,0.2)',
            borderRadius: 4, padding: '2px 6px',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            fontFamily: "'Inter', sans-serif",
            flexShrink: 0,
          }}>DEMO</span>
        )}

        {/* Team pill */}
        <div ref={teamRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setTeamOpen(!teamOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: teamOpen
                ? (isNightMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)')
                : (isNightMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)'),
              border: teamOpen
                ? (isNightMode ? '2px solid rgba(59,130,246,0.4)' : '2px solid rgba(59,130,246,0.35)')
                : (isNightMode ? '1.5px solid rgba(59,130,246,0.15)' : '1.5px solid rgba(59,130,246,0.2)'),
              borderRadius: 10, padding: '6px 14px',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            {/* Team name */}
            <span style={{
              fontSize: 15, fontWeight: 800,
              color: isNightMode ? '#E2E8F0' : '#E2E8F0',
              fontFamily: "'Inter', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.04em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: isMobile ? 80 : 160,
            }}>
              {teamName}
            </span>
            {/* Plus / chevron icon */}
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
              stroke={isNightMode ? '#94A3B8' : '#8BA4C4'} strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: teamOpen ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 200ms ease' }}
            >
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {/* Team popout */}
          <AnimatePresence>
            {teamOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                  minWidth: 260,
                  background: isNightMode
                    ? 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.95) 100%)'
                    : 'rgba(26,35,50,0.98)',
                  backdropFilter: 'blur(20px)',
                  border: isNightMode ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 12,
                  boxShadow: isNightMode
                    ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)'
                    : '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)',
                  padding: '8px 0',
                  zIndex: 100,
                }}
              >
                {/* Owner at top */}
                <button
                  onClick={() => {
                    if (onSelectAgent) onSelectAgent('patrik')
                    onOpenSettings?.()
                    setTeamOpen(false)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 16px',
                    background: 'transparent',
                    border: 'none', cursor: 'pointer',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isNightMode ? 'rgba(255,255,255,0.04)' : 'rgba(59,130,246,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isNightMode
                      ? 'linear-gradient(135deg, #E85D26, #F59E0B)'
                      : 'linear-gradient(135deg, #3B82F6, #60A5FA)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color: '#1E2A3A',
                    fontFamily: "'Inter', sans-serif",
                    flexShrink: 0,
                  }}>P</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: isNightMode ? '#E2E8F0' : '#E2E8F0',
                      fontFamily: "'Inter', sans-serif",
                    }}>Patrik</div>
                    <div style={{
                      fontSize: 12, fontWeight: 500,
                      color: isNightMode ? '#64748B' : '#6B8AB0',
                      fontFamily: "'Inter', sans-serif",
                    }}>Owner</div>
                  </div>
                  {/* Settings gear */}
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                    stroke={isNightMode ? '#64748B' : '#6B8AB0'} strokeWidth={2}
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>

                {/* Add Agent + Team Settings buttons */}
                <div style={{
                  display: 'flex', gap: 6, padding: '4px 16px 6px',
                }}>
                  <button
                    onClick={() => {
                      console.log('Add Agent clicked')
                      alert('Add Agent coming soon')
                    }}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      padding: '6px 10px', borderRadius: 6,
                      background: isNightMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.1)',
                      border: isNightMode ? '1px solid rgba(59,130,246,0.15)' : '1px solid rgba(59,130,246,0.12)',
                      cursor: 'pointer', transition: 'all 120ms ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = isNightMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isNightMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)' }}
                  >
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                      stroke={isNightMode ? '#60A5FA' : '#3B82F6'} strokeWidth={2.5}
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: isNightMode ? '#60A5FA' : '#3B82F6',
                      fontFamily: "'Inter', sans-serif",
                    }}>Add Agent</span>
                  </button>
                  <button
                    onClick={() => {
                      // Open AOM team chat in sidebar
                      if (onSelectAgent) onSelectAgent('aom')
                      setTeamOpen(false)
                    }}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      padding: '6px 10px', borderRadius: 6,
                      background: isNightMode ? 'rgba(255,255,255,0.03)' : 'rgba(59,130,246,0.04)',
                      border: isNightMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(59,130,246,0.1)',
                      cursor: 'pointer', transition: 'all 120ms ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = isNightMode ? 'rgba(255,255,255,0.06)' : 'rgba(59,130,246,0.06)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isNightMode ? 'rgba(255,255,255,0.03)' : 'rgba(59,130,246,0.04)' }}
                  >
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                      stroke={isNightMode ? '#94A3B8' : '#8BA4C4'} strokeWidth={2}
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: isNightMode ? '#94A3B8' : '#8BA4C4',
                      fontFamily: "'Inter', sans-serif",
                    }}>Team Chat</span>
                  </button>
                </div>

                {/* Divider + team header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px 8px',
                  borderTop: isNightMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(59,130,246,0.1)',
                }}>
                  {editingName ? (
                    <input
                      autoFocus
                      value={teamName}
                      onChange={e => setTeamName(e.target.value.slice(0, 20))}
                      onBlur={() => setEditingName(false)}
                      onKeyDown={e => { if (e.key === 'Enter') setEditingName(false) }}
                      style={{
                        fontSize: 12, fontWeight: 800,
                        color: isNightMode ? '#E2E8F0' : '#E2E8F0',
                        background: isNightMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.1)',
                        border: isNightMode ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(59,130,246,0.2)',
                        borderRadius: 6, padding: '3px 8px',
                        fontFamily: "'Inter', sans-serif",
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        outline: 'none', width: 100,
                      }}
                    />
                  ) : (
                    <span
                      onClick={() => setEditingName(true)}
                      style={{
                        fontSize: 11, fontWeight: 800,
                        color: isNightMode ? '#475569' : '#6B8AB0',
                        fontFamily: "'Inter', sans-serif",
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        cursor: 'pointer',
                      }}
                      title="Click to rename"
                    >
                      {teamName}
                    </span>
                  )}
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: isNightMode ? '#334155' : '#4A6585',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {AGENTS.length}
                  </span>
                </div>

                {/* Agent list */}
                <div style={{ maxHeight: 320, overflowY: 'auto', padding: '0' }}>
                  {AGENTS.map(agent => {
                    const status = getAgentStatus(agent.slug)
                    const dotCol = statusDotColor[status] || '#6B7280'
                    const isSelected = selectedAgent === agent.slug
                    const pendingCount = (rightNowTasks || []).filter(t => t.isDoneAwaitingApproval && t.agent === agent.slug).length
                    return (
                      <button
                        key={agent.slug}
                        onClick={() => {
                          if (onSelectAgent) onSelectAgent(agent.slug)
                          setTeamOpen(false)
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '8px 16px',
                          background: isSelected
                            ? (isNightMode ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.06)')
                            : 'transparent',
                          border: 'none', cursor: 'pointer',
                          transition: 'background 100ms ease',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) e.currentTarget.style.background = isNightMode ? 'rgba(255,255,255,0.04)' : 'rgba(59,130,246,0.06)'
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <SpriteAvatar agentSlug={agent.slug} size={32} borderColor={agent.color} />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{
                            fontSize: 14, fontWeight: 700,
                            color: isNightMode ? '#E2E8F0' : '#E2E8F0',
                            fontFamily: "'Inter', sans-serif",
                          }}>
                            {agent.name}
                          </div>
                          <div style={{
                            fontSize: 12, fontWeight: 500,
                            color: isNightMode ? '#64748B' : '#6B8AB0',
                            fontFamily: "'Inter', sans-serif",
                          }}>
                            {agent.role}
                          </div>
                        </div>
                        {/* Amber badge: pending done tasks awaiting approval */}
                        {pendingCount > 0 && (
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#EAB308',
                            boxShadow: '0 0 6px #EAB308, 0 0 12px rgba(234,179,8,0.5)',
                            flexShrink: 0, marginRight: 4,
                          }} title={`${pendingCount} task${pendingCount > 1 ? 's' : ''} awaiting approval`} />
                        )}
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: dotCol,
                          boxShadow: status === 'WORKING' ? `0 0 6px ${dotCol}` : 'none',
                          flexShrink: 0,
                        }} />
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Project team pills from corner config */}
        {cornerConfig?.projects && Object.entries(cornerConfig.projects)
          .filter(([key]) => key !== 'aom-internal') // skip meta-project
          .map(([projectKey, project]) => {
            const displayName = projectKey.split('-').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ')
            const isDropdownOpen = activeProjectDropdown === projectKey
            const projectAgents = (project.team || [])
              .filter(t => t !== 'all')
              .map(slug => AGENTS.find(a => a.slug === slug))
              .filter(Boolean)
            return (
              <div key={projectKey} ref={el => { projectPillRefs.current[projectKey] = el }} style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={() => {
                    setActiveProjectDropdown(isDropdownOpen ? null : projectKey)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: isDropdownOpen
                      ? (isNightMode ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)')
                      : 'transparent',
                    border: isNightMode ? '1.5px solid rgba(59,130,246,0.15)' : '1.5px solid rgba(59,130,246,0.15)',
                    borderRadius: 10, padding: '6px 12px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={e => {
                    if (!isDropdownOpen) e.currentTarget.style.background = isNightMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)'
                  }}
                  onMouseLeave={e => {
                    if (!isDropdownOpen) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: isNightMode ? '#94A3B8' : '#8BA4C4',
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: '0.02em',
                  }}>
                    {displayName}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: isNightMode ? '#475569' : '#6B8AB0',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {projectAgents.length}
                  </span>
                </button>

                {/* Project team dropdown */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                      style={{
                        position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                        minWidth: 220,
                        background: isNightMode
                          ? 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.95) 100%)'
                          : 'rgba(26,35,50,0.98)',
                        backdropFilter: 'blur(20px)',
                        border: isNightMode ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.2)',
                        borderRadius: 12,
                        boxShadow: isNightMode
                          ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)'
                          : '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)',
                        padding: '8px 0',
                        zIndex: 100,
                      }}
                    >
                      {/* Project header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 16px 8px',
                      }}>
                        <span style={{
                          fontSize: 11, fontWeight: 800,
                          color: isNightMode ? '#475569' : '#6B8AB0',
                          fontFamily: "'Inter', sans-serif",
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                        }}>
                          {displayName}
                        </span>
                        {project.lead && (
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            color: isNightMode ? '#334155' : '#4A6585',
                            fontFamily: "'Inter', sans-serif",
                          }}>
                            Lead: {project.lead}
                          </span>
                        )}
                      </div>

                      {/* Project agent list */}
                      {projectAgents.map(agent => {
                        const status = getAgentStatus(agent.slug)
                        const dotCol = statusDotColor[status] || '#6B7280'
                        return (
                          <button
                            key={agent.slug}
                            onClick={() => {
                              if (onSelectAgent) onSelectAgent(agent.slug)
                              setActiveProjectDropdown(null)
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              width: '100%', padding: '8px 16px',
                              background: selectedAgent === agent.slug
                                ? (isNightMode ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.06)')
                                : 'transparent',
                              border: 'none', cursor: 'pointer',
                              transition: 'background 100ms ease',
                            }}
                            onMouseEnter={e => {
                              if (selectedAgent !== agent.slug) e.currentTarget.style.background = isNightMode ? 'rgba(255,255,255,0.04)' : 'rgba(59,130,246,0.06)'
                            }}
                            onMouseLeave={e => {
                              if (selectedAgent !== agent.slug) e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            <SpriteAvatar agentSlug={agent.slug} size={28} borderColor={agent.color} />
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <div style={{
                                fontSize: 13, fontWeight: 700,
                                color: isNightMode ? '#E2E8F0' : '#E2E8F0',
                                fontFamily: "'Inter', sans-serif",
                              }}>
                                {agent.name}
                              </div>
                              <div style={{
                                fontSize: 11, fontWeight: 500,
                                color: isNightMode ? '#64748B' : '#6B8AB0',
                                fontFamily: "'Inter', sans-serif",
                              }}>
                                {agent.role}
                              </div>
                            </div>
                            <div style={{
                              width: 7, height: 7, borderRadius: '50%',
                              background: dotCol,
                              boxShadow: status === 'WORKING' ? `0 0 6px ${dotCol}` : 'none',
                              flexShrink: 0,
                            }} />
                          </button>
                        )
                      })}

                      {/* Non-agent team members (like ash) */}
                      {(project.team || [])
                        .filter(t => t !== 'all' && !AGENTS.find(a => a.slug === t))
                        .map(memberName => (
                          <div
                            key={memberName}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '8px 16px',
                            }}
                          >
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: isNightMode
                                ? 'linear-gradient(135deg, #475569, #64748B)'
                                : 'linear-gradient(135deg, #94A3B8, #CBD5E1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 800, color: '#1E2A3A',
                              fontFamily: "'Inter', sans-serif",
                              flexShrink: 0,
                            }}>
                              {memberName[0]?.toUpperCase()}
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <div style={{
                                fontSize: 13, fontWeight: 700,
                                color: isNightMode ? '#E2E8F0' : '#E2E8F0',
                                fontFamily: "'Inter', sans-serif",
                                textTransform: 'capitalize',
                              }}>
                                {memberName}
                              </div>
                              <div style={{
                                fontSize: 11, fontWeight: 500,
                                color: isNightMode ? '#64748B' : '#6B8AB0',
                                fontFamily: "'Inter', sans-serif",
                              }}>
                                Team Member
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })
        }

        {/* + New Project button REMOVED -- replaced by FloatingActionButton (FAB) bottom-right */}

        {/* Reset layout button (game view only) -- clears free-drag positions */}
        {(viewMode === 'game' || !viewMode) && (
          <button
            title="Reset room layout"
            onClick={() => {
              onResetLayout?.()
              setLayoutResetToast(true)
              setTimeout(() => setLayoutResetToast(false), 1800)
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 5, flexShrink: 0,
              background: 'transparent',
              border: isNightMode ? '1.5px solid rgba(59,130,246,0.18)' : '1.5px solid rgba(59,130,246,0.22)',
              borderRadius: 8, padding: isMobile ? '5px 8px' : '5px 10px',
              cursor: 'pointer', transition: 'all 150ms ease',
              position: 'relative',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isNightMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.08)'
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = isNightMode ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.22)'
            }}
          >
            <RotateCcw size={13} color={isNightMode ? '#64748B' : '#6B8AB0'} />
            {!isMobile && (
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: isNightMode ? '#64748B' : '#6B8AB0',
                fontFamily: "'Inter', sans-serif",
              }}>
                Reset
              </span>
            )}
            {/* Toast confirmation */}
            <AnimatePresence>
              {layoutResetToast && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: '50%',
                    transform: 'translateX(-50%)',
                    background: isNightMode ? 'rgba(15,23,42,0.95)' : 'rgba(15,23,42,0.92)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: 6, padding: '5px 10px',
                    whiteSpace: 'nowrap', zIndex: 200,
                    fontSize: 12, fontWeight: 600,
                    color: '#60A5FA',
                    fontFamily: "'Inter', sans-serif",
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    pointerEvents: 'none',
                  }}
                >
                  Layout reset
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        )}

        {/* Unstuck button (game view only) -- clears stale active tasks + resets stuck agents */}
        {(viewMode === 'game' || !viewMode) && (
          <button
            title="Unstuck: clear active tasks + reset stuck agents"
            onClick={async () => {
              if (unstuckToast === 'loading') return
              setUnstuckToast('loading')
              try {
                // Call API
                await onUnstuck?.()
                setUnstuckToast('done')
                setTimeout(() => setUnstuckToast(null), 1800)
              } catch {
                setUnstuckToast(null)
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 5, flexShrink: 0,
              background: 'transparent',
              border: isNightMode ? '1.5px solid rgba(234,179,8,0.22)' : '1.5px solid rgba(234,179,8,0.3)',
              borderRadius: 8, padding: isMobile ? '5px 8px' : '5px 10px',
              cursor: unstuckToast === 'loading' ? 'default' : 'pointer',
              transition: 'all 150ms ease',
              position: 'relative',
              opacity: unstuckToast === 'loading' ? 0.6 : 1,
            }}
            onMouseEnter={e => {
              if (unstuckToast === 'loading') return
              e.currentTarget.style.background = isNightMode ? 'rgba(234,179,8,0.1)' : 'rgba(234,179,8,0.08)'
              e.currentTarget.style.borderColor = 'rgba(234,179,8,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = isNightMode ? 'rgba(234,179,8,0.22)' : 'rgba(234,179,8,0.3)'
            }}
          >
            <Zap size={13} color={isNightMode ? '#A16207' : '#CA8A04'} />
            {!isMobile && (
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: isNightMode ? '#A16207' : '#CA8A04',
                fontFamily: "'Inter', sans-serif",
              }}>
                {unstuckToast === 'loading' ? '...' : 'Unstuck'}
              </span>
            )}
            {/* Toast confirmation */}
            <AnimatePresence>
              {unstuckToast === 'done' && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: '50%',
                    transform: 'translateX(-50%)',
                    background: isNightMode ? 'rgba(15,23,42,0.95)' : 'rgba(15,23,42,0.92)',
                    border: '1px solid rgba(234,179,8,0.35)',
                    borderRadius: 6, padding: '5px 10px',
                    whiteSpace: 'nowrap', zIndex: 200,
                    fontSize: 12, fontWeight: 600,
                    color: '#EAB308',
                    fontFamily: "'Inter', sans-serif",
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    pointerEvents: 'none',
                  }}
                >
                  Unstuck!
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User display + sign-out (only when Supabase auth active) */}
        {currentUser && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            {!isMobile && (
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: isNightMode ? '#475569' : '#6B8AB0',
                fontFamily: "'Inter', sans-serif",
                maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {currentUser.email}
              </span>
            )}
            <button
              title="Sign out"
              onClick={onSignOut}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'transparent',
                border: isNightMode ? '1.5px solid rgba(239,68,68,0.2)' : '1.5px solid rgba(239,68,68,0.25)',
                borderRadius: 8, padding: isMobile ? '5px 8px' : '5px 10px',
                cursor: 'pointer', transition: 'all 150ms ease', flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.45)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = isNightMode ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.25)'
              }}
            >
              {/* Log-out icon (arrow right out of box) */}
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                stroke="#F87171" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {!isMobile && (
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: '#F87171',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Sign out
                </span>
              )}
            </button>
          </div>
        )}

        {/* View mode toggle: Game | Board */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: isNightMode ? 'rgba(15,27,45,0.8)' : 'rgba(10,18,35,0.6)',
          border: isNightMode ? '1.5px solid rgba(59,130,246,0.18)' : '1.5px solid rgba(59,130,246,0.25)',
          borderRadius: 10,
          padding: 3,
          gap: 2,
          flexShrink: 0,
        }}>
          {[
            { id: 'game', label: isMobile ? null : 'Game', icon: '⬡' },
            { id: 'board', label: isMobile ? null : 'Board', icon: '⊟' },
          ].map(({ id, label, icon }) => {
            const active = (viewMode || 'game') === id
            return (
              <button
                key={id}
                onClick={() => onViewModeSwitch?.(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 5,
                  padding: isMobile ? '4px 8px' : '4px 12px',
                  borderRadius: 7,
                  background: active
                    ? (isNightMode ? 'rgba(59,130,246,0.22)' : 'rgba(59,130,246,0.18)')
                    : 'transparent',
                  border: active
                    ? (isNightMode ? '1px solid rgba(59,130,246,0.45)' : '1px solid rgba(59,130,246,0.4)')
                    : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.background = isNightMode ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.08)'
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.background = 'transparent'
                }}
              >
                {id === 'game' ? (
                  <Gamepad2
                    size={14}
                    color={active ? '#60A5FA' : (isNightMode ? '#64748B' : '#6B8AB0')}
                  />
                ) : (
                  <FolderKanban
                    size={14}
                    color={active ? '#60A5FA' : (isNightMode ? '#64748B' : '#6B8AB0')}
                  />
                )}
                {!isMobile && (
                  <span style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#60A5FA' : (isNightMode ? '#64748B' : '#6B8AB0'),
                    letterSpacing: '0.02em',
                  }}>
                    {label}
                  </span>
                )}
              </button>
            )
          })}
        </div>

      </div>
    </div>
  )
}

// ---- Task Item Card (Steffen HUD spec) -------------------------------------
function TaskCard({ entry, agentColor, onContextMenu }) {
  const statusBadgeColors = {
    DONE: { bg: 'rgba(16,185,129,0.15)', text: '#10B981' },
    ACTIVE: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
    BLOCKED: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' },
    QUEUED: { bg: 'rgba(217,70,239,0.15)', text: '#D946EF' },
    WORKING: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
  }
  const badge = statusBadgeColors[entry.status] || statusBadgeColors.QUEUED
  const taskText = entry.description || entry.currentTask || entry.text || 'No task'

  return (
    <div style={{
      position: 'relative',
      minHeight: 64, background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: 6, padding: '14px 16px',
      cursor: 'pointer', transition: 'background 150ms ease, border-color 150ms ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault()
          const agentSlug = AGENTS.find(a => a.name?.toLowerCase() === entry.agent?.toLowerCase())?.slug || entry.agent
          onContextMenu(e, { text: taskText, agent: agentSlug, done: entry.status === 'DONE' })
        }
      }}
    >
      <TaskPriorityBar taskText={taskText} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Agent sprite avatar (tiny, 20px) */}
        {entry.agent ? (
          <SpriteAvatar
            agentSlug={AGENTS.find(a => a.name?.toLowerCase() === entry.agent?.toLowerCase())?.slug}
            size={20}
            borderColor={agentColor}
            style={{ marginTop: 2 }}
          />
        ) : (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: agentColor || '#6B7280', marginTop: 4, flexShrink: 0, boxShadow: `0 0 4px ${agentColor || '#6B7280'}4D` }} />
        )}
        {/* Task title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400, fontSize: 14, color: '#F0ECE6', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {entry.description || entry.currentTask || 'No task'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            {entry.agent && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: agentColor || '#6B7280' }}>
                {entry.agent}
              </span>
            )}
            {entry.status && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: badge.text, background: badge.bg, padding: '2px 8px', borderRadius: 3 }}>
                {entry.status === 'WORKING' ? 'ACTIVE' : entry.status}
              </span>
            )}
            {entry.time && (
              <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400, fontSize: 12, color: '#6B7280', marginLeft: 'auto' }}>
                {timeAgo(entry.time)}
              </span>
            )}
          </div>
        </div>
        <TaskNoteIndicator taskText={taskText} style={{ alignSelf: 'center', flexShrink: 0 }} />
      </div>
    </div>
  )
}

function SessionTab({ data }) {
  const feed = data?.pipelineFeed || []
  if (feed.length === 0) return <EmptyTab message="No recent activity" />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {feed.slice(0, 12).map((entry, i) => {
        const agent = AGENTS.find(a => a.slug === entry.agent?.toLowerCase() || a.name === entry.agent)
        return <TaskCard key={i} entry={entry} agentColor={agent?.color} />
      })}
    </div>
  )
}

function ProjectTab({ data }) {
  const agents = data?.agents || []
  const grouped = {
    'Product Build': agents.filter(a => ['bobby', 'colton', 'steffen', 'elmo'].includes(a.slug)),
    'Strategy': agents.filter(a => ['alex', 'steve', 'mom'].includes(a.slug)),
    'Outreach': agents.filter(a => ['jacob', 'tony', 'paige'].includes(a.slug)),
    'Content': agents.filter(a => ['cleo'].includes(a.slug)),
    'Infrastructure': agents.filter(a => ['elon', 'pixel'].includes(a.slug)),
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>{group}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {items.map(a => {
              const specAgent = AGENTS.find(sa => sa.slug === a.slug)
              return <TaskCard key={a.slug} entry={{ ...a, description: a.currentTask, agent: a.name }} agentColor={specAgent?.color} />
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function UpcomingTab() {
  return <EmptyTab message="Upcoming tasks will sync from punch-list.md" />
}

function AddTaskTab() {
  const [selectedAgent, setSelectedAgent] = useState(null)

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Input */}
      <input type="text" placeholder="Add a task for any agent..."
        style={{
          width: '100%', background: 'transparent',
          border: 'none', borderBottom: '2px solid rgba(255, 255, 255, 0.15)',
          color: '#FDF6EC', padding: '12px 0', fontSize: 14,
          fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400,
          outline: 'none',
        }}
        onFocus={e => e.target.style.borderBottomColor = '#E85D26'}
        onBlur={e => e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.15)'}
      />

      {/* Agent pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {AGENTS.filter(a => a.slug !== 'paige' && a.slug !== 'pixel').map(a => {
          const sel = selectedAgent === a.slug
          return (
            <button key={a.slug} onClick={() => setSelectedAgent(sel ? null : a.slug)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 28, padding: '4px 12px', borderRadius: 14,
                background: sel ? `${a.color}26` : 'transparent',
                border: `1px solid ${sel ? `${a.color}4D` : 'rgba(255,255,255,0.08)'}`,
                color: sel ? a.color : '#8A847C',
                fontSize: 12, fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif",
                cursor: 'pointer', transition: 'all 150ms ease',
              }}
            >
              <SpriteAvatar agentSlug={a.slug} size={16} borderColor={a.color} />
              {a.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EmptyTab({ message }) {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: '#6B7280', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {message}
    </div>
  )
}

// ---- CHAT BAR (bottom) - polished v2 with typing indicator, speaking state, smooth transitions
// hideCollapsed: when true, the collapsed bar is hidden (HUD handles inline chat in game mode)
// chatRef: imperative handle for expand() and sendMsg(slug, text)
const ChatBar = React.forwardRef(function ChatBar({ activeAgent, onSelectAgent, agentStatus, isMobile, onSpeaking, bottomOffset = 0, hideCollapsed = false }, chatRef) {
  const [expanded, setExpanded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [messages, setMessages] = useState({}) // per-agent message history
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const connectionRef = useRef(null)
  const relayPollRef = useRef(null)
  const lastOutboxCheckRef = useRef(null)
  const chatTimeoutRef = useRef(null)

  // Clear chat timeout on unmount
  useEffect(() => {
    return () => {
      if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current)
    }
  }, [])

  const currentAgent = activeAgent
    ? AGENTS.find(a => a.slug === activeAgent)
    : AGENTS.find(a => a.slug === 'elon')

  const agentSlug = currentAgent?.slug || 'elon'
  const currentMessages = messages[agentSlug] || []
  const status = agentStatus[agentSlug]?.status || 'IDLE'
  const task = agentStatus[agentSlug]?.currentTask || 'Standing by'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  const agentColor = currentAgent?.color || '#E85D26'

  // Manual scroll to bottom (no auto-scroll -- user controls scroll position)
  const scrollToBottom = useCallback((instant) => {
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTo({
      top: container.scrollHeight,
      behavior: instant ? 'instant' : 'smooth',
    })
  }, [])

  useEffect(() => {
    if (expanded) setTimeout(() => inputRef.current?.focus(), 200)
  }, [expanded])

  // Clean up relay poll on unmount
  useEffect(() => {
    return () => {
      if (relayPollRef.current) clearInterval(relayPollRef.current)
    }
  }, [])

  // Notify parent of speaking state changes (drives game sprite animation)
  const setSpeaking = useCallback((isSpeaking) => {
    setStreaming(isSpeaking)
    onSpeaking?.(agentSlug, isSpeaking)
  }, [agentSlug, onSpeaking])

  const updateMessages = (slug, updater) => {
    setMessages(prev => ({ ...prev, [slug]: updater(prev[slug] || []) }))
  }

  // Format timestamp for display
  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d)) return ''
    const now = new Date()
    const diffMs = now - d
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  // Start polling relay-outbox for EA responses (local mode only)
  const startRelayPoll = (sentTimestamp) => {
    if (relayPollRef.current) clearInterval(relayPollRef.current)
    lastOutboxCheckRef.current = sentTimestamp

    relayPollRef.current = setInterval(async () => {
      try {
        const since = encodeURIComponent(lastOutboxCheckRef.current)
        const res = await fetch(`/api/local/relay-outbox?since=${since}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.messages && data.messages.length > 0) {
          const responses = data.messages.filter(m =>
            m.message && m.source !== 'corner-dashboard' && m.source !== 'corner-websocket'
          )
          if (responses.length > 0) {
            const latest = responses[responses.length - 1]
            updateMessages(agentSlug, prev => {
              const updated = [...prev]
              const lastMsg = updated[updated.length - 1]
              if (lastMsg?.role === 'assistant' && lastMsg.streaming) {
                updated[updated.length - 1] = {
                  ...lastMsg,
                  content: latest.message,
                  streaming: false,
                  time: latest.timestamp || new Date().toISOString(),
                }
              } else {
                updated.push({
                  role: 'assistant',
                  content: latest.message,
                  streaming: false,
                  time: latest.timestamp || new Date().toISOString(),
                })
              }
              return updated
            })
            setSpeaking(false)
            clearChatTimeout()
            lastOutboxCheckRef.current = latest.timestamp
            if (relayPollRef.current) {
              clearInterval(relayPollRef.current)
              relayPollRef.current = null
            }
          }
        }
      } catch {}
    }, 500) // Local + production: 500ms for real-time feel
  }

  // Start 60-second chat timeout. If no response arrives, show offline message.
  const startChatTimeout = (slug) => {
    if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current)
    chatTimeoutRef.current = setTimeout(() => {
      updateMessages(slug, prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant' && last.streaming) {
          updated[updated.length - 1] = {
            ...last,
            content: 'Agent is offline. Message saved.',
            streaming: false,
            time: new Date().toISOString(),
          }
        }
        return updated
      })
      setSpeaking(false)
      if (relayPollRef.current) {
        clearInterval(relayPollRef.current)
        relayPollRef.current = null
      }
    }, 60000) // 60 seconds
  }

  // Clear timeout when a real response arrives (hook into relay poll success)
  const clearChatTimeout = () => {
    if (chatTimeoutRef.current) {
      clearTimeout(chatTimeoutRef.current)
      chatTimeoutRef.current = null
    }
  }

  const sendMessage = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || streaming) return

    const sentTime = new Date().toISOString()
    setInput('')
    // Auto-expand if collapsed
    if (!expanded && !fullscreen) setExpanded(true)
    updateMessages(agentSlug, prev => [...prev, { role: 'user', content: text, time: sentTime }])
    setSpeaking(true)
    updateMessages(agentSlug, prev => [...prev, { role: 'assistant', content: '', streaming: true, time: sentTime }])
    startChatTimeout(agentSlug)

    if (IS_LOCAL) {
      try {
        await fetch('/api/local/relay-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: agentSlug, message: text, source: 'corner-dashboard' }),
        })
        startRelayPoll(sentTime)
      } catch (err) {
        updateMessages(agentSlug, prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last) updated[updated.length - 1] = { ...last, content: `Failed to send: ${err.message}`, streaming: false }
          return updated
        })
        setSpeaking(false)
      }
      return
    }

    // Production mode: use SSE/WebSocket chat connection
    connectionRef.current?.disconnect()

    const conn = createChatConnection(
      (text) => {
        updateMessages(agentSlug, prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant') updated[updated.length - 1] = { ...last, content: last.content + text }
          return updated
        })
      },
      () => {
        updateMessages(agentSlug, prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last) updated[updated.length - 1] = { ...last, streaming: false, time: new Date().toISOString() }
          return updated
        })
        setSpeaking(false)
        clearChatTimeout()
      },
      (error) => {
        updateMessages(agentSlug, prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last) updated[updated.length - 1] = { ...last, content: `Error: ${error}`, streaming: false }
          return updated
        })
        setSpeaking(false)
        clearChatTimeout()
      }
    )

    connectionRef.current = conn
    await conn.send({
      slug: agentSlug,
      message: text,
      history: currentMessages.map(m => ({ role: m.role, content: m.content })),
    })
  }

  // Typing indicator: 3 dots pulsing in agent's color
  const thinkingTexts = ['eloning...', 'crushing it...', 'flexing...', 'plotting...', 'cooking...', 'brewing...', 'scheming...']
  const [thinkingText] = useState(() => thinkingTexts[Math.floor(Math.random() * thinkingTexts.length)])

  const TypingIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 2px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: agentColor, opacity: 0.9,
          animation: `chatTypingDot 1.2s ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
    </div>
  )

  // Streaming cursor
  const StreamingCursor = () => (
    <span style={{
      display: 'inline-block', width: 2, height: '1em',
      background: agentColor, marginLeft: 2,
      verticalAlign: 'text-bottom',
      animation: 'chatCursorBlink 0.8s ease-in-out infinite',
    }} />
  )

  // Imperative handle for HUD inline chat integration
  React.useImperativeHandle(chatRef, () => ({
    expand: () => setExpanded(true),
    sendMsg: (slug, text) => {
      if (!text?.trim()) return
      // Switch agent if needed
      if (slug && slug !== agentSlug) onSelectAgent?.(slug)
      setInput(text)
      // Delay to let state settle, then auto-submit
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} }
        // Set input directly and trigger send
        const sentTime = new Date().toISOString()
        setInput('')
        setExpanded(true)
        updateMessages(slug || agentSlug, prev => [...prev, { role: 'user', content: text, time: sentTime }])
        setSpeaking(true)
        updateMessages(slug || agentSlug, prev => [...prev, { role: 'assistant', content: '', streaming: true, time: sentTime }])
        startChatTimeout(slug || agentSlug)

        if (IS_LOCAL) {
          fetch('/api/local/relay-send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent: slug || agentSlug, message: text, source: 'corner-dashboard' }),
          }).then(() => {
            startRelayPoll(sentTime)
          }).catch(err => {
            updateMessages(slug || agentSlug, prev => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last) updated[updated.length - 1] = { ...last, content: `Failed to send: ${err.message}`, streaming: false }
              return updated
            })
            setSpeaking(false)
          })
        }
      }, 50)
    },
  }), [agentSlug, onSelectAgent, updateMessages, setSpeaking])

  return (
    <div style={{
      position: 'fixed', bottom: fullscreen ? 0 : bottomOffset, left: 0, right: 0,
      zIndex: fullscreen ? 100 : 45,
      display: 'flex', flexDirection: 'column',
      pointerEvents: 'none',
      transition: 'bottom 200ms ease',
    }}>
      <div style={{ pointerEvents: 'auto' }}>
      {/* Expanded / Fullscreen chat panel */}
      <AnimatePresence>
        {(expanded || fullscreen) && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: 20 }}
            animate={{
              height: fullscreen ? '100vh' : (isMobile ? '100vh' : '40vh'),
              opacity: 1, y: 0,
            }}
            exit={{ height: 0, opacity: 0, y: 20 }}
            transition={{
              height: { duration: 0.35, ease: [0.32, 0.72, 0, 1] },
              opacity: { duration: 0.2 },
              y: { duration: 0.25, ease: [0.32, 0.72, 0, 1] },
            }}
            style={{
              background: fullscreen ? PALETTE.background : 'rgba(10, 15, 30, 0.96)',
              backdropFilter: fullscreen ? 'none' : 'blur(24px)',
              borderTop: `1px solid ${agentColor}22`,
              boxShadow: `0 -4px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 ${agentColor}15`,
              borderRadius: fullscreen ? 0 : '16px 16px 0 0',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Drag handle */}
            {!fullscreen && (
              <div
                onClick={() => setFullscreen(true)}
                style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px', cursor: 'pointer' }}
              >
                <div style={{ width: 48, height: 5, borderRadius: 3, background: 'rgba(255, 255, 255, 0.35)' }} />
              </div>
            )}

            {/* Header with agent identity */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 20px', height: fullscreen ? 56 : 44,
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {fullscreen && (
                  <button onClick={() => setFullscreen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}>
                    <ArrowLeft size={18} />
                  </button>
                )}
                <SpriteAvatar agentSlug={agentSlug} size={fullscreen ? 28 : 24} borderColor={agentColor} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: PALETTE.signText, fontSize: fullscreen ? 15 : 14, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.2 }}>
                    {currentAgent?.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: streaming ? agentColor : (status === 'WORKING' ? '#22C55E' : '#6B7280'),
                      animation: streaming ? 'chatTypingDot 1.2s ease-in-out infinite' : (status === 'WORKING' ? 'statusPulse 1.5s ease-in-out infinite' : 'none'),
                    }} />
                    <span style={{ color: '#8A847C', fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif" }}>
                      {streaming ? thinkingText : (status === 'WORKING' ? 'Active' : status === 'WAITING' ? 'Thinking...' : 'Online')}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {streaming && <ChatTimeoutRing streaming={streaming} agentColor={agentColor} agentName={currentAgent?.name} />}
                {!fullscreen && (
                  <button onClick={() => setFullscreen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, borderRadius: 4, transition: 'color 150ms' }}
                    onMouseEnter={e => e.target.style.color = PALETTE.signText} onMouseLeave={e => e.target.style.color = '#6B7280'}>
                    <Maximize2 size={16} />
                  </button>
                )}
                {fullscreen && (
                  <button onClick={() => setFullscreen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, borderRadius: 4, transition: 'color 150ms' }}
                    onMouseEnter={e => e.target.style.color = PALETTE.signText} onMouseLeave={e => e.target.style.color = '#6B7280'}>
                    <Minimize2 size={16} />
                  </button>
                )}
                <button onClick={() => { setExpanded(false); setFullscreen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, borderRadius: 4, transition: 'color 150ms' }}
                  onMouseEnter={e => e.target.style.color = PALETTE.signText} onMouseLeave={e => e.target.style.color = '#6B7280'}>
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div ref={messagesContainerRef} style={{
              flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 20px',
              maxWidth: fullscreen ? 720 : '100%',
              margin: fullscreen ? '0 auto' : 0, width: '100%',
            }}>
              {/* Empty state */}
              {currentMessages.length === 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', minHeight: 120,
                  gap: 12, padding: '24px 0',
                }}>
                  <SpriteAvatar agentSlug={agentSlug} size={48} borderColor={agentColor} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: PALETTE.signText, fontSize: 15, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif" }}>
                      {currentAgent?.name}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4, color: '#6B7280', fontFamily: "'Inter', system-ui, sans-serif" }}>
                      {task}
                    </div>
                  </div>
                </div>
              )}

              {/* Message list */}
              {(() => {
                let lastStreamingIdx = -1
                for (let j = currentMessages.length - 1; j >= 0; j--) {
                  if (currentMessages[j].streaming && !currentMessages[j].content) {
                    lastStreamingIdx = j
                    break
                  }
                }
                return currentMessages.map((msg, i) => {
                  const isUser = msg.role === 'user'
                  const isLastStreaming = msg.streaming && !msg.content && i === lastStreamingIdx
                  return (
                  <motion.div
                    key={`${agentSlug}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
                      marginBottom: 14, alignItems: 'flex-end',
                    }}
                  >
                    {/* Agent avatar */}
                    {!isUser && (
                      <SpriteAvatar agentSlug={agentSlug} size={fullscreen ? 30 : 24} borderColor={agentColor}
                        style={{ marginRight: 8, marginBottom: 18, flexShrink: 0, opacity: msg.streaming ? 1 : 0.85, transition: 'opacity 300ms' }}
                      />
                    )}
                    <div style={{ maxWidth: '75%' }}>
                      <div style={{
                        padding: '10px 14px', fontSize: fullscreen ? 14 : 13,
                        fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.55,
                        ...(isUser
                          ? { background: 'rgba(232,93,38,0.12)', border: '1px solid rgba(232,93,38,0.20)', borderRadius: '14px 4px 14px 14px', color: PALETTE.signText }
                          : { background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
                              border: `1px solid ${msg.streaming ? agentColor + '30' : 'rgba(255, 255, 255, 0.08)'}`,
                              borderRadius: '4px 14px 14px 14px', color: '#F0ECE6', transition: 'border-color 300ms ease' }
                        ),
                      }}>
                        {msg.content && (
                          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {msg.content}
                            {msg.streaming && msg.content && <StreamingCursor />}
                          </div>
                        )}
                        {isLastStreaming && <TypingIndicator />}
                      </div>
                      <div style={{
                        fontSize: 12, color: '#6B728088', marginTop: 4,
                        paddingLeft: isUser ? 0 : 2, paddingRight: isUser ? 2 : 0,
                        fontFamily: "'Inter', system-ui, sans-serif", textAlign: isUser ? 'right' : 'left',
                      }}>
                        {msg.streaming ? '' : formatTime(msg.time)}
                      </div>
                    </div>
                  </motion.div>
                  )
                })
              })()}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <form onSubmit={sendMessage} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', height: 56,
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              flexShrink: 0, background: 'rgba(0, 0, 0, 0.15)',
            }}>
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder={`Message ${currentAgent?.name}...`} disabled={false}
                inputMode="text" enterKeyHint="send"
                autoComplete="off" autoCorrect="off" autoCapitalize="sentences" spellCheck={false}
                style={{
                  flex: 1, background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10, height: 38, padding: '0 16px',
                  color: PALETTE.signText, fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
                  outline: 'none', transition: 'border-color 200ms ease, box-shadow 200ms ease',
                }}
                onFocus={e => { e.target.style.borderColor = `${agentColor}66`; e.target.style.boxShadow = `0 0 0 2px ${agentColor}15` }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.target.style.boxShadow = 'none' }}
              />
              <button type="submit" disabled={!input.trim() || streaming}
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: input.trim() ? agentColor : '#2A3040',
                  color: '#FDF6EC', border: 'none',
                  cursor: input.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 150ms ease, transform 100ms ease, opacity 150ms',
                  opacity: streaming ? 0.5 : 1,
                  transform: input.trim() ? 'scale(1)' : 'scale(0.92)',
                }}>
                {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} style={{ marginLeft: 1 }} />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed chat bar: hidden when HUD has inline chat (game mode) */}
      {!expanded && !fullscreen && !hideCollapsed && (
        <motion.div
          initial={{ y: 56 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        >
          <form onSubmit={sendMessage} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            height: 56, padding: '0 16px',
            background: 'rgba(10, 15, 30, 0.92)',
            backdropFilter: 'blur(16px)',
            borderTop: `1px solid ${agentColor}18`,
            borderBottom: `1px solid rgba(255,255,255,0.04)`,
            boxShadow: '0 -2px 16px rgba(0, 0, 0, 0.35)',
          }}>
            <div onClick={() => setExpanded(true)} style={{ cursor: 'pointer' }}>
              <SpriteAvatar agentSlug={agentSlug} size={32} borderColor={agentColor} />
            </div>
            <div onClick={() => setExpanded(true)} style={{ cursor: 'pointer', flexShrink: 0 }}>
              <span style={{ color: agentColor, fontSize: 13, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif" }}>
                {currentAgent?.name}
              </span>
              {streaming && (
                <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 4, height: 4, borderRadius: '50%', background: agentColor,
                      animation: `chatTypingDot 1.2s ease-in-out ${i * 0.15}s infinite`,
                    }} />
                  ))}
                </div>
              )}
            </div>

            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onFocus={() => setExpanded(true)}
              placeholder={`Message ${currentAgent?.name}...`} disabled={false}
              inputMode="text" enterKeyHint="send"
              autoComplete="off" autoCorrect="off" autoCapitalize="sentences" spellCheck={false}
              style={{
                flex: 1, background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10, height: 36, padding: '0 16px',
                color: PALETTE.signText, fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
                outline: 'none', margin: '0 4px', transition: 'border-color 200ms ease',
              }}
            />

            <button type="submit" disabled={!input.trim() || streaming}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: input.trim() ? agentColor : '#2A3040',
                color: '#FDF6EC', border: 'none',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: streaming ? 0.3 : (input.trim() ? 1 : 0.3),
                transition: 'all 150ms ease',
              }}>
              <Send size={16} />
            </button>

            <button type="button" onClick={() => setExpanded(true)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4,
              transition: 'color 150ms',
            }}
              onMouseEnter={e => e.target.style.color = agentColor}
              onMouseLeave={e => e.target.style.color = '#6B7280'}
            >
              <ChevronUp size={16} />
            </button>
          </form>
        </motion.div>
      )}
      </div>
    </div>
  )
})

// ---- TASKS TAB CONTENT (Task Detail -> Brief Link) -------------------------
// KEY PRODUCT INSIGHT: Task -> Brief -> Action in one click.
// When a task is clicked, load the associated brief from projects/[agent]/.
// Briefs give context: WHY the task exists, WHAT was decided, HOW to act.
const ctxBtnStyle = (isDaytime) => ({
  display: 'block', width: '100%', textAlign: 'left',
  padding: '8px 14px', background: 'none', border: 'none',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  color: isDaytime ? '#E2E8F0' : '#E2E8F0',
  fontFamily: "'Inter', sans-serif",
  transition: 'background 100ms',
})

function TasksTabContent({ task, agentColor, agentSlug, agentStatus, agent, isNightMode, onAddToRightNow, rightNowTasks, punchProjects }) {
  const isDaytime = isNightMode === false
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // Per-agent task list (in-memory only, data comes from Supabase)
  const TASKS_KEY = `corner-tasks-${agentSlug}`
  const [tasks, setTasks] = useState([])
  const [taskInput, setTaskInput] = useState('')
  const [taskCtx, setTaskCtx] = useState(null)
  const taskLongPressRef = useRef(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [dragOverTaskId, setDragOverTaskId] = useState(null) // Track sub-task drop target (drag ON a task)
  const [activeFilter, setActiveFilter] = useState('all')
  const [collapsedSections, setCollapsedSections] = useState({})
  const [selectedTask, setSelectedTask] = useState(null) // Task detail view
  const [expandedTaskId, setExpandedTaskId] = useState(null) // Accordion expand state
  const [collapsedParents, setCollapsedParents] = useState({}) // Track collapsed sub-task groups

  // Per-task context notes (in-memory only, persisted to Supabase)
  const getTaskContext = (_id) => ''
  const saveTaskContext = (id, text) => {
    // Supabase: save context note (fire-and-forget)
    if (!IS_LOCAL) {
      const task = tasks.find(t => t.id === id)
      fetch('/api/dashboard/task-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addContext', taskText: task?.text || '', taskId: id, payload: text }),
      }).catch(() => {})
    }
  }

  // Reset tasks when switching agents (in-memory reset, Supabase fetch below handles reload)
  useEffect(() => {
    setTasks([])
    setTaskCtx(null)
    setActiveFilter('all')
  }, [TASKS_KEY])

  // Load persisted tasks from Supabase on mount (production only)
  useEffect(() => {
    if (IS_LOCAL) return
    fetch(`/api/dashboard/supabase-status?client=${encodeURIComponent(getClientId())}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.tasks) return
        const agentTasks = data.tasks
          .filter(t => t.agent === agentSlug && t.status !== 'done')
          .map(t => ({ id: t.id, text: t.text, done: t.status === 'completed', agent: t.agent }))
        if (agentTasks.length > 0) {
          setTasks(prev => {
            const existingIds = new Set(prev.map(t => String(t.id)))
            const newTasks = agentTasks.filter(t => !existingIds.has(String(t.id)))
            return [...prev, ...newTasks]
          })
        }
      })
      .catch(() => {})
  }, [agentSlug])

  // Close context menu on outside click
  useEffect(() => {
    if (!taskCtx) return
    const handler = () => setTaskCtx(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [taskCtx])

  const addTask = async () => {
    const text = taskInput.trim()
    if (!text) return
    const taskId = `dash-${Date.now()}`
    setTasks(prev => [...prev, { id: taskId, text, done: false, agent: agentSlug }])
    setTaskInput('')

    // Write to Supabase tasks table (real task) + messages (for chat visibility)
    if (!IS_LOCAL) {
      // Create in tasks table for dashboard reads
      fetch('/api/dashboard/agent-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, agent: agentSlug || 'elon', status: 'todo' }),
      }).catch(() => {})
    }
    // Write to messages table for backend visibility (both local and prod)
    try {
      await fetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: agentSlug || 'elon',
          text: `[TASK] ${text}`,
          role: 'user',
          source: 'corner-dashboard-task',
          client_id: getClientId(),
        }),
      })
    } catch {}
  }

  const toggleTask = (id) => {
    const task = tasks.find(t => t.id === id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
    // Supabase: toggle done/undone (fire-and-forget)
    if (!IS_LOCAL && task) {
      fetch('/api/dashboard/task-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', taskText: task.text, taskId: id, payload: !task.done }),
      }).catch(() => {})
    }
  }

  const deleteTask = (id) => {
    const task = tasks.find(t => t.id === id)
    setTasks(prev => prev.filter(t => t.id !== id))
    // Supabase: soft-delete (fire-and-forget)
    if (!IS_LOCAL && task) {
      fetch('/api/dashboard/task-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', taskText: task.text, taskId: id }),
      }).catch(() => {})
    }
  }

  const moveTask = (id, targetAgent) => {
    const taskItem = tasks.find(t => t.id === id)
    if (!taskItem) return
    setTasks(prev => prev.filter(t => t.id !== id))
    // Supabase: reassign to new agent (fire-and-forget)
    if (!IS_LOCAL) {
      fetch('/api/dashboard/task-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reassign', taskText: taskItem.text, taskId: id, payload: targetAgent }),
      }).catch(() => {})
    }
  }

  // Drag and drop reorder + sub-task nesting
  const handleDragStart = (idx) => setDragIdx(idx)
  const handleDragOver = (e, idx, taskId) => {
    e.preventDefault()
    setDragOverIdx(idx)
    // Track when hovering directly over a task card (for sub-task drop)
    setDragOverTaskId(taskId || null)
  }
  const handleDragLeave = () => {
    setDragOverTaskId(null)
  }
  const handleDrop = (idx, targetTaskId) => {
    if (dragIdx === null) { setDragIdx(null); setDragOverIdx(null); setDragOverTaskId(null); return }
    // If dropping ON a different task (not self), make it a sub-task
    if (dragOverTaskId && dragIdx !== idx) {
      const draggedTask = tasks[dragIdx]
      if (!draggedTask || draggedTask.id === targetTaskId) {
        setDragIdx(null); setDragOverIdx(null); setDragOverTaskId(null); return
      }
      // Prevent circular: don't make a parent a sub-task of its own child
      if (draggedTask.parentId === targetTaskId) {
        setDragIdx(null); setDragOverIdx(null); setDragOverTaskId(null); return
      }
      setTasks(prev => prev.map(t => t.id === draggedTask.id ? { ...t, parentId: targetTaskId } : t))
    } else if (dragIdx !== idx) {
      // Normal reorder
      setTasks(prev => {
        const copy = [...prev]
        const [moved] = copy.splice(dragIdx, 1)
        copy.splice(idx, 0, moved)
        return copy
      })
    }
    setDragIdx(null)
    setDragOverIdx(null)
    setDragOverTaskId(null)
  }

  const toggleSection = (key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Build sections from punch-list data + local tasks + right now
  const liveRightNow = rightNowTasks || []
  const projectSections = punchProjects || []

  // Agent's projects (which projects is this agent on?)
  const agentProjects = PROJECTS.filter(p => p.team?.includes(agentSlug))

  // Determine which punch-list sections are relevant to this agent
  const relevantSections = useMemo(() => {
    if (!projectSections.length) return []
    return projectSections.map(section => {
      // Filter tasks to only those assigned to this agent (or unassigned)
      const agentTasks = section.tasks.filter(t =>
        !t.agent || t.agent === agentSlug || t.agent === 'patrik'
      )
      if (agentTasks.length === 0) return null
      return { ...section, tasks: agentTasks }
    }).filter(Boolean)
  }, [projectSections, agentSlug])

  // Count totals for filter pills
  const rightNowCount = liveRightNow.length
  const localOpenCount = tasks.filter(t => !t.done).length
  const totalCount = rightNowCount + localOpenCount + relevantSections.reduce((sum, s) => sum + s.tasks.filter(t => !t.done).length, 0)

  // Filter pill style helper
  const pillStyle = (key, color) => ({
    padding: '5px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 800,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    border: activeFilter === key ? `2px solid ${color}` : '2px solid transparent',
    background: activeFilter === key ? `${color}20` : (isDaytime ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.04)'),
    color: activeFilter === key ? color : (isDaytime ? '#8BA4C4' : '#6B7280'),
    transition: 'all 150ms ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  })

  // Section header render helper
  const renderSectionHeader = (label, count, color, sectionKey, isLive, progressPct) => (
    <div
      onClick={() => toggleSection(sectionKey)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 0', cursor: 'pointer', userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ChevronDown
          size={14}
          style={{
            color: color || (isDaytime ? '#8BA4C4' : '#6B7280'),
            transform: collapsedSections[sectionKey] ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        />
        <span style={{
          fontSize: 12, fontWeight: 900, letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: "'Inter', sans-serif",
          color: color || (isDaytime ? '#E2E8F0' : '#CBD5E1'),
        }}>
          {label}
        </span>
        {isLive && (
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
            background: '#FF6B3D22', color: '#FF6B3D',
            fontFamily: "'Inter', sans-serif",
          }}>
            {count} running
          </span>
        )}
        {!isLive && count > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            background: `${color || '#6B7280'}15`, color: color || '#6B7280',
            fontFamily: "'Inter', sans-serif",
          }}>
            {count} left
          </span>
        )}
      </div>
      {progressPct !== undefined && progressPct !== null && (
        <div style={{
          width: 60, height: 4, borderRadius: 2,
          background: isDaytime ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(100, Math.max(0, progressPct))}%`,
            height: '100%', borderRadius: 2,
            background: color || agentColor,
            transition: 'width 300ms ease',
          }} />
        </div>
      )}
    </div>
  )

  // Task card render helper
  const renderTaskCard = (t, opts = {}) => {
    const { isLive, isQueued, isDoneAwaitingApproval, showAgent, showProject, projectColor, onToggle, onContextMenu: ctxHandler, draggable: isDraggable, idx, sectionName, sectionColor } = opts
    const cardAgent = t.agent ? AGENTS.find(a => a.slug === t.agent || a.id === t.agent) : null

    // Lifecycle colors matching Right Now ticker (per Patrik directive):
    //   Fuchsia (#E91E90) = queued
    //   Orange  (#FF6B3D) = working/active (live)
    //   Amber   (#F59E0B) = done awaiting approval
    //   Green   (#22C55E) = approved/completed
    //   Red     (#EF4444) = rejected/failed
    const lifecycleColor = isQueued
      ? '#E91E90'
      : isDoneAwaitingApproval
        ? '#F59E0B'
        : t.status === 'rejected' || t.status === 'failed'
          ? '#EF4444'
          : t.done && !isDoneAwaitingApproval
            ? '#22C55E'
            : isLive
              ? '#FF6B3D'
              : null // null = fall through to agent/project color

    const cardColor = lifecycleColor || (cardAgent?.agentColor || cardAgent?.color || agentColor)
    const cardKey = t.id || `task-${idx}`
    const isExpanded = expandedTaskId === cardKey
    const isDropTarget = dragOverTaskId === t.id && dragIdx !== null && tasks[dragIdx]?.id !== t.id

    return (
      <div
        key={cardKey}
        draggable={isDraggable && !isExpanded}
        onDragStart={isDraggable && !isExpanded ? () => handleDragStart(idx) : undefined}
        onDragOver={isDraggable && !isExpanded ? (e) => handleDragOver(e, idx, t.id) : undefined}
        onDragLeave={isDraggable && !isExpanded ? handleDragLeave : undefined}
        onDrop={isDraggable && !isExpanded ? () => handleDrop(idx, t.id) : undefined}
        onDragEnd={isDraggable && !isExpanded ? () => { setDragIdx(null); setDragOverIdx(null); setDragOverTaskId(null) } : undefined}
        onContextMenu={ctxHandler}
        onTouchStart={ctxHandler ? (e) => {
          const touch = e.touches[0]
          const cx = touch ? touch.clientX : 0
          const cy = touch ? touch.clientY : 0
          taskLongPressRef.current = setTimeout(() => {
            ctxHandler({ clientX: cx, clientY: cy, preventDefault: () => {} })
          }, 500)
        } : undefined}
        onTouchEnd={ctxHandler ? () => clearTimeout(taskLongPressRef.current) : undefined}
        onTouchMove={ctxHandler ? () => clearTimeout(taskLongPressRef.current) : undefined}
        style={{
          marginBottom: isMobile ? 10 : 6,
          background: isDropTarget
            ? (isDaytime ? `${cardColor}20` : `${cardColor}18`)
            : lifecycleColor
              ? (isDaytime ? `${lifecycleColor}0D` : `${lifecycleColor}08`)
              : t.done
                ? (isDaytime ? 'rgba(59,130,246,0.03)' : 'rgba(255,255,255,0.02)')
                : (isDaytime ? `${cardColor}0A` : `${cardColor}06`),
          border: isDropTarget
            ? `2px dashed ${cardColor}60`
            : lifecycleColor
              ? `1px solid ${lifecycleColor}30`
              : t.done
                ? (isDaytime ? '1px solid rgba(59,130,246,0.06)' : '1px solid rgba(255,255,255,0.03)')
                : `1px solid ${cardColor}18`,
          borderLeft: `3px solid ${cardColor}`,
          borderRadius: 8,
          opacity: dragIdx === idx ? 0.4 : (t.done && !isDoneAwaitingApproval ? 0.45 : 1),
          transition: 'background 150ms, opacity 150ms, border 150ms',
          overflow: 'hidden',
        }}
      >
        {/* --- Card header row (always visible, tap to toggle accordion) --- */}
        <div
          onClick={() => setExpandedTaskId(isExpanded ? null : cardKey)}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: isMobile ? 8 : 10,
            padding: isMobile ? '8px 10px' : '10px 12px',
            minHeight: isMobile ? 44 : undefined,
            cursor: 'pointer',
          }}
        >
          {/* Agent avatar (left column) */}
          {showAgent && cardAgent && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0, minWidth: 32 }}>
              <SpriteAvatar agentSlug={cardAgent.slug || cardAgent.id} size={28} borderColor={cardColor} />
              <span style={{
                fontSize: 9, fontWeight: 700, color: cardColor,
                fontFamily: "'Inter', sans-serif", textTransform: 'uppercase',
                letterSpacing: '0.04em', lineHeight: 1,
              }}>
                {cardAgent.name || cardAgent.agent}
              </span>
            </div>
          )}

          {/* Checkbox (non-live tasks only) */}
          {!isLive && onToggle && (
            <div
              onClick={(e) => { e.stopPropagation(); onToggle(t.id) }}
              style={{
                width: isMobile ? 24 : 20, height: isMobile ? 24 : 20, borderRadius: isMobile ? 6 : 5, flexShrink: 0, marginTop: 1,
                border: t.done ? `2px solid ${cardColor}` : `2px solid ${cardColor}50`,
                background: t.done ? cardColor : `${cardColor}08`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 150ms',
                boxShadow: t.done ? `0 0 6px ${cardColor}30` : 'none',
              }}
            >
              {t.done && (
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          )}

          {/* Task content (right column) */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: isMobile ? 12 : 13, fontWeight: t.done ? 400 : 500, lineHeight: 1.4,
              color: t.done
                ? (isDaytime ? '#6B8AB0' : '#475569')
                : (isDaytime ? '#F1F5F9' : '#E2E8F0'),
              fontFamily: "'Inter', sans-serif",
              textDecoration: t.done ? 'line-through' : 'none',
            }}>
              {t.text}
            </div>
            {/* Badges row -- lifecycle status */}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {isQueued && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                  background: '#E91E90', color: '#FFF',
                  fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em',
                }}>QUEUED</span>
              )}
              {isLive && !isQueued && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                  background: '#FF6B3D', color: '#FFF',
                  fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em',
                }}>LIVE</span>
              )}
              {isDoneAwaitingApproval && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                  background: '#F59E0B', color: '#FFF',
                  fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em',
                }}>REVIEW</span>
              )}
              {(t.status === 'rejected' || t.status === 'failed') && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                  background: '#EF4444', color: '#FFF',
                  fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em',
                }}>REJECTED</span>
              )}
              {showProject && t.project && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                  background: `${projectColor || '#3B82F6'}18`,
                  color: projectColor || '#3B82F6',
                  fontFamily: "'Inter', sans-serif",
                }}>{t.project}</span>
              )}
            </div>
          </div>

          {/* Chevron toggle */}
          <ChevronDown
            size={14}
            style={{
              flexShrink: 0, marginTop: 2,
              color: isDaytime ? '#6B8AB0' : '#475569',
              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 180ms ease',
            }}
          />
        </div>

        {/* --- Accordion body (only when expanded) --- */}
        {isExpanded && (
          <div style={{
            padding: '0 12px 12px 12px',
            background: isDaytime ? 'rgba(10,18,35,0.3)' : 'rgba(0,0,0,0.25)',
            borderTop: isDaytime ? '1px solid rgba(59,130,246,0.1)' : '1px solid rgba(255,255,255,0.04)',
          }}>
            {/* Original prompt */}
            <div style={{ marginTop: 10, marginBottom: 10 }}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isDaytime ? '#4A6585' : '#475569',
                fontFamily: "'Inter', sans-serif",
                marginBottom: 5,
              }}>
                Original Prompt
              </div>
              <div style={{
                fontSize: 12, lineHeight: 1.5,
                color: isDaytime ? '#94B8D8' : '#6B8AB0',
                fontFamily: "'Inter', sans-serif",
                fontStyle: 'italic',
                padding: '6px 8px',
                background: isDaytime ? 'rgba(59,130,246,0.04)' : 'rgba(255,255,255,0.02)',
                borderRadius: 6,
                border: isDaytime ? '1px solid rgba(59,130,246,0.08)' : '1px solid rgba(255,255,255,0.04)',
              }}>
                {t.text}
              </div>
            </div>

            {/* Context notes (editable) */}
            <div style={{ marginBottom: 10 }}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isDaytime ? '#4A6585' : '#475569',
                fontFamily: "'Inter', sans-serif",
                marginBottom: 5,
              }}>
                Context
              </div>
              <TaskContextTextarea
                taskId={t.id}
                isDaytime={isDaytime}
                cardColor={cardColor}
                getTaskContext={getTaskContext}
                saveTaskContext={saveTaskContext}
              />
            </div>

            {/* Agent story (placeholder) */}
            <div>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isDaytime ? '#4A6585' : '#475569',
                fontFamily: "'Inter', sans-serif",
                marginBottom: 5,
              }}>
                Agent Story
              </div>
              <div style={{
                fontSize: 11, lineHeight: 1.5,
                color: isDaytime ? '#4A6585' : '#334155',
                fontFamily: "'Inter', sans-serif",
                fontStyle: 'italic',
                padding: '6px 8px',
                background: isDaytime ? 'rgba(59,130,246,0.02)' : 'rgba(255,255,255,0.01)',
                borderRadius: 6,
                border: isDaytime ? '1px dashed rgba(59,130,246,0.08)' : '1px dashed rgba(255,255,255,0.04)',
              }}>
                Story will appear when task completes
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Determine what to show based on active filter
  const showRightNow = activeFilter === 'all' || activeFilter === 'rightnow'
  const showLocal = activeFilter === 'all' || activeFilter === 'local'
  const showProjectFilter = activeFilter !== 'all' && activeFilter !== 'rightnow' && activeFilter !== 'local'
  const filteredProjectSection = showProjectFilter
    ? relevantSections.find(s => s.section === activeFilter)
    : null

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', position: 'relative' }}>
      {/* Task Detail View (slides in from right) */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            key="task-detail"
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 20, padding: '12px 14px',
              background: isDaytime ? 'rgba(18, 42, 75, 0.98)' : 'rgba(8, 16, 32, 0.98)',
              overflowY: 'auto',
            }}
          >
            {/* Back button */}
            <div
              onClick={() => setSelectedTask(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                padding: '6px 0', marginBottom: 16,
                color: isDaytime ? '#94B8D8' : '#6B8AB0',
                fontSize: 13, fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to list</span>
            </div>

            {/* Agent identity */}
            {(() => {
              const detailAgent = selectedTask._cardAgent
              const detailColor = selectedTask._cardColor || agentColor
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  {detailAgent && (
                    <SpriteAvatar agentSlug={detailAgent.slug || detailAgent.id} size={48} borderColor={detailColor} />
                  )}
                  <div>
                    <div style={{
                      fontSize: 16, fontWeight: 800, color: detailColor,
                      fontFamily: "'Inter', sans-serif", textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>
                      {detailAgent?.name || selectedTask.agent || agentSlug}
                    </div>
                    {agentStatus && (
                      <div style={{
                        fontSize: 11, fontWeight: 600,
                        color: isDaytime ? '#6B8AB0' : '#475569',
                        fontFamily: "'Inter', sans-serif", marginTop: 2,
                      }}>
                        {agentStatus}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Status + project badges */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {selectedTask._isLive && (
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6,
                  background: 'rgba(255,107,61,0.15)', color: '#FF6B3D',
                  border: '1.5px solid rgba(255,107,61,0.3)',
                  fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em',
                }}>LIVE</span>
              )}
              {selectedTask.done && (
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6,
                  background: 'rgba(34,197,94,0.15)', color: '#4ADE80',
                  border: '1.5px solid rgba(34,197,94,0.3)',
                  fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em',
                }}>DONE</span>
              )}
              {!selectedTask.done && !selectedTask._isLive && (
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6,
                  background: `${selectedTask._cardColor || agentColor}15`,
                  color: selectedTask._cardColor || agentColor,
                  border: `1.5px solid ${selectedTask._cardColor || agentColor}30`,
                  fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em',
                }}>OPEN</span>
              )}
              {(selectedTask.project || selectedTask._sectionName) && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                  background: `${selectedTask._sectionColor || '#3B82F6'}15`,
                  color: selectedTask._sectionColor || '#3B82F6',
                  border: `1.5px solid ${selectedTask._sectionColor || '#3B82F6'}25`,
                  fontFamily: "'Inter', sans-serif",
                }}>{selectedTask.project || selectedTask._sectionName}</span>
              )}
            </div>

            {/* Task text (large) */}
            <div style={{
              fontSize: 18, fontWeight: 500, lineHeight: 1.6,
              color: selectedTask.done
                ? (isDaytime ? '#6B8AB0' : '#475569')
                : (isDaytime ? '#F1F5F9' : '#E2E8F0'),
              fontFamily: "'Inter', sans-serif",
              textDecoration: selectedTask.done ? 'line-through' : 'none',
              padding: '16px 14px',
              background: isDaytime ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.03)',
              border: isDaytime ? '1px solid rgba(59,130,246,0.12)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              marginBottom: 20,
            }}>
              {selectedTask.text}
            </div>

            {/* Notes section (placeholder) */}
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isDaytime ? '#6B8AB0' : '#475569',
                fontFamily: "'Inter', sans-serif",
                marginBottom: 8,
              }}>
                Notes
              </div>
              <div style={{
                padding: '12px 14px',
                background: isDaytime ? 'rgba(59,130,246,0.04)' : 'rgba(255,255,255,0.02)',
                border: isDaytime ? '1px solid rgba(59,130,246,0.08)' : '1px solid rgba(255,255,255,0.04)',
                borderRadius: 8,
                fontSize: 14, fontWeight: 400, lineHeight: 1.5,
                color: isDaytime ? '#6B8AB0' : '#475569',
                fontFamily: "'Inter', sans-serif",
                fontStyle: 'italic',
                minHeight: 48,
              }}>
                No notes yet. Tap to add context.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter pills row */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto',
        paddingBottom: 4, WebkitOverflowScrolling: 'touch',
      }}>
        <div
          onClick={() => setActiveFilter('all')}
          style={pillStyle('all', agentColor)}
        >
          ALL {totalCount > 0 ? totalCount : ''}
        </div>
        {rightNowCount > 0 && (
          <div
            onClick={() => setActiveFilter('rightnow')}
            style={pillStyle('rightnow', '#FF6B3D')}
          >
            RIGHT NOW {rightNowCount}
          </div>
        )}
        {/* Project-scoped filter pills */}
        {relevantSections.map(section => {
          const openCount = section.tasks.filter(t => !t.done).length
          if (openCount === 0) return null
          return (
            <div
              key={section.section}
              onClick={() => setActiveFilter(section.section)}
              style={pillStyle(section.section, section.color)}
            >
              {section.name} {openCount}
            </div>
          )
        })}
      </div>

      {/* RIGHT NOW section */}
      {showRightNow && liveRightNow.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {renderSectionHeader('RIGHT NOW', liveRightNow.length, '#FF6B3D', 'rightnow', true)}
          {!collapsedSections.rightnow && liveRightNow.map((t, i) =>
            renderTaskCard(
              { id: t.id || t.taskId || `rn-${i}`, text: t.text || t.task || t.description || 'Running...', agent: t.agent, status: t.status },
              { isLive: !t.isQueued && !t.isDoneAwaitingApproval, isQueued: !!t.isQueued, isDoneAwaitingApproval: !!t.isDoneAwaitingApproval, showAgent: true, idx: i, sectionName: 'Right Now', sectionColor: '#FF6B3D' }
            )
          )}
        </div>
      )}

      {/* Project sections from punch-list */}
      {(activeFilter === 'all' ? relevantSections : (filteredProjectSection ? [filteredProjectSection] : [])).map(section => {
        const openTasks = section.tasks.filter(t => !t.done)
        const doneTasks = section.tasks.filter(t => t.done)
        const total = section.tasks.length
        const doneCount = doneTasks.length
        const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0

        return (
          <div key={section.section} style={{ marginBottom: 12 }}>
            {renderSectionHeader(section.name, openTasks.length, section.color, section.section, false, progressPct)}
            {!collapsedSections[section.section] && openTasks.map((t, i) =>
              renderTaskCard(
                { id: t.id || `pl-${section.section}-${i}`, text: t.text, done: t.done, agent: t.agent, project: section.name },
                { showAgent: !!t.agent && t.agent !== agentSlug, showProject: activeFilter === 'all', projectColor: section.color, idx: i, sectionName: section.name, sectionColor: section.color }
              )
            )}
          </div>
        )
      })}

      {/* Local tasks (per-agent, user-created) */}
      {showLocal && tasks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {renderSectionHeader(
            agent?.name || agentSlug?.toUpperCase() || 'TASKS',
            tasks.filter(t => !t.done && !t.parentId).length,
            agentColor,
            'local',
            false,
            tasks.length > 0 ? Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) : 0
          )}
          {!collapsedSections.local && tasks
            .filter(t => !t.parentId) // Only top-level tasks
            .map((t, idx) => {
              const subTasks = tasks.filter(sub => sub.parentId === t.id)
              const parentCollapsed = collapsedParents[t.id]
              return (
                <div key={t.id || `task-${idx}`}>
                  {renderTaskCard(t, {
                    onToggle: toggleTask,
                    draggable: true,
                    idx: tasks.indexOf(t),
                    onContextMenu: (e) => {
                      e.preventDefault()
                      setTaskCtx({ id: t.id, x: e.clientX, y: e.clientY, text: t.text })
                    },
                  })}
                  {/* Sub-tasks */}
                  {subTasks.length > 0 && (
                    <div>
                      {/* Sub-task toggle */}
                      <div
                        onClick={() => setCollapsedParents(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          paddingLeft: 20, marginBottom: 4, cursor: 'pointer',
                          fontSize: 10, fontWeight: 700, color: isDaytime ? '#6B8AB0' : '#475569',
                          fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}
                      >
                        <ChevronDown size={10} style={{ transform: parentCollapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 150ms' }} />
                        {subTasks.length} sub-task{subTasks.length !== 1 ? 's' : ''}
                      </div>
                      {!parentCollapsed && (
                        <div style={{
                          marginLeft: 16,
                          paddingLeft: 12,
                          borderLeft: `2px solid ${agentColor}30`,
                        }}>
                          {subTasks.map((sub, subIdx) =>
                            <div key={sub.id || `sub-${subIdx}`} style={{ position: 'relative' }}>
                              {/* Connecting dot */}
                              <div style={{
                                position: 'absolute', left: -17, top: 14,
                                width: 6, height: 6, borderRadius: '50%',
                                background: isDaytime ? `${agentColor}60` : `${agentColor}40`,
                                flexShrink: 0,
                              }} />
                              {renderTaskCard(sub, {
                                onToggle: toggleTask,
                                draggable: true,
                                idx: tasks.indexOf(sub),
                                onContextMenu: (e) => {
                                  e.preventDefault()
                                  setTaskCtx({ id: sub.id, x: e.clientX, y: e.clientY, text: sub.text })
                                },
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          }
        </div>
      )}

      {/* Empty state */}
      {totalCount === 0 && tasks.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '24px 0',
          color: isDaytime ? '#4A6585' : '#64748B',
          fontSize: 13, fontFamily: "'Inter', sans-serif",
        }}>
          No tasks yet. Add one below.
        </div>
      )}

      {/* Add task input */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          value={taskInput}
          onChange={e => setTaskInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTask() }}
          placeholder="Add a task..."
          style={{
            flex: 1, padding: '8px 12px',
            background: `${agentColor}08`,
            border: `1.5px solid ${agentColor}22`,
            borderRadius: 8, fontSize: 14, fontWeight: 500,
            color: isDaytime ? '#F1F5F9' : '#E2E8F0',
            fontFamily: "'Inter', sans-serif", outline: 'none',
            caretColor: agentColor,
          }}
        />
        <button
          onClick={addTask}
          style={{
            padding: '8px 14px',
            background: agentColor, border: 'none', borderRadius: 8,
            color: '#FFF', fontSize: 13, fontWeight: 700,
            fontFamily: "'Inter', sans-serif", cursor: 'pointer',
            boxShadow: `0 2px 8px ${agentColor}40`,
          }}
        >
          Add
        </button>
      </div>

      {/* Right-click context menu for tasks */}
      {taskCtx && (
        <div style={{
          position: 'fixed', left: taskCtx.x, top: taskCtx.y, zIndex: 200,
          background: isDaytime ? '#162D52' : 'rgba(15,23,42,0.98)',
          border: isDaytime ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.2)',
          borderRadius: 8, padding: '4px 0', minWidth: 180,
          boxShadow: isDaytime ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          <button onClick={() => {
            setTasks(prev => {
              const idx = prev.findIndex(t => t.id === taskCtx.id)
              if (idx <= 0) return prev
              const copy = [...prev]
              const [item] = copy.splice(idx, 1)
              copy.unshift(item)
              return copy
            })
            setTaskCtx(null)
          }} style={ctxBtnStyle(isDaytime)}>
            Move to Top
          </button>
          <button onClick={() => {
            setTasks(prev => {
              const idx = prev.findIndex(t => t.id === taskCtx.id)
              if (idx < 0 || idx === prev.length - 1) return prev
              const copy = [...prev]
              const [item] = copy.splice(idx, 1)
              copy.push(item)
              return copy
            })
            setTaskCtx(null)
          }} style={ctxBtnStyle(isDaytime)}>
            Move to Bottom
          </button>
          <button onClick={() => {
            const t = tasks.find(x => x.id === taskCtx.id)
            if (t && onAddToRightNow) onAddToRightNow(t)
            setTaskCtx(null)
          }} style={{ ...ctxBtnStyle(isDaytime), color: '#FF6B3D', fontWeight: 700 }}>
            Send to Right Now
          </button>
          <div style={{ height: 1, background: isDaytime ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
          <div style={{
            padding: '6px 14px', fontSize: 11, fontWeight: 700,
            color: isDaytime ? '#6B8AB0' : '#8BA4C4',
            fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>Move to agent</div>
          {AGENTS.filter(a => a.slug !== agentSlug).slice(0, 6).map(a => (
            <button key={a.slug} onClick={() => { moveTask(taskCtx.id, a.slug); setTaskCtx(null) }}
              style={ctxBtnStyle(isDaytime)}
            >
              {a.name}
            </button>
          ))}
          <div style={{ height: 1, background: isDaytime ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
          <button onClick={() => { deleteTask(taskCtx.id); setTaskCtx(null) }}
            style={{ ...ctxBtnStyle(isDaytime), color: '#EF4444' }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ---- TASK CONTEXT TEXTAREA (accordion body, per-task notes) ----------------
// Standalone component so it can keep local state without re-rendering siblings.
function TaskContextTextarea({ taskId, isDaytime, cardColor, getTaskContext, saveTaskContext }) {
  const [value, setValue] = useState(() => getTaskContext(taskId))
  return (
    <textarea
      value={value}
      onChange={e => {
        setValue(e.target.value)
        saveTaskContext(taskId, e.target.value)
      }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      placeholder="Add notes or context..."
      rows={3}
      style={{
        width: '100%', resize: 'vertical',
        padding: '6px 8px',
        background: isDaytime ? 'rgba(59,130,246,0.04)' : 'rgba(255,255,255,0.02)',
        border: isDaytime ? `1px solid ${cardColor}22` : `1px solid ${cardColor}18`,
        borderRadius: 6,
        fontSize: 12, lineHeight: 1.5,
        color: isDaytime ? '#F1F5F9' : '#D0D8E8',
        fontFamily: "'Inter', sans-serif",
        outline: 'none',
        boxSizing: 'border-box',
        caretColor: cardColor,
        userSelect: 'text',
        WebkitUserSelect: 'text',
      }}
    />
  )
}

// ---- SKELETON LOADER (loading placeholder for panel data) -------------------
function SkeletonLine({ width = '100%', height = 14, style: extraStyle }) {
  return (
    <div style={{
      width, height, borderRadius: 4,
      background: 'rgba(100, 180, 255, 0.06)',
      animation: 'skeletonPulse 1.5s ease-in-out infinite',
      ...extraStyle,
    }} />
  )
}

// FIX(bobby2): Removed Math.random() which caused visual chaos every 3s re-render.
// Stable widths per line index: 92%, 88%, 60% pattern.
const SKELETON_WIDTHS = ['92%', '88%', '95%', '85%', '90%', '87%', '93%', '86%']
function SkeletonBlock({ lines = 3, style: extraStyle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...extraStyle }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? '60%' : (SKELETON_WIDTHS[i % SKELETON_WIDTHS.length])} />
      ))}
    </div>
  )
}

function PanelSkeleton({ agentColor }) {
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Agent identity skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <SkeletonLine width={48} height={48} style={{ borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonLine width="55%" height={20} />
          <SkeletonLine width="35%" height={14} />
        </div>
      </div>
      {/* Task skeleton */}
      <div style={{
        padding: '12px 14px',
        background: 'rgba(100,180,255,0.04)',
        border: '1px solid rgba(100,180,255,0.08)',
        borderRadius: 8,
      }}>
        <SkeletonBlock lines={2} />
      </div>
      {/* Stats skeleton */}
      <div style={{ display: 'flex', gap: 16 }}>
        <SkeletonLine width={80} height={12} />
        <SkeletonLine width={60} height={12} />
      </div>
    </div>
  )
}

// ---- CHAT TIMEOUT RING (countdown indicator while waiting for agent response) --
// 60-second SVG ring that fills as time passes. Shows elapsed seconds.
// Turns orange at 30s, red at 50s. Pulses gently to feel alive.
function ChatTimeoutRing({ streaming, agentColor, agentName }) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(null)
  const TIMEOUT = 60 // seconds

  useEffect(() => {
    if (!streaming) {
      setElapsed(0)
      startRef.current = null
      return
    }
    startRef.current = Date.now()
    const tick = setInterval(() => {
      if (!startRef.current) return
      const s = Math.floor((Date.now() - startRef.current) / 1000)
      setElapsed(s)
    }, 1000)
    return () => clearInterval(tick)
  }, [streaming])

  if (!streaming) return null

  const progress = Math.min(elapsed / TIMEOUT, 1)
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  // Color shifts: blue -> orange (30s) -> red (50s)
  const ringColor = elapsed >= 50 ? '#EF4444' : elapsed >= 30 ? '#F59E0B' : (agentColor || '#3B82F6')
  const label = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m${elapsed % 60}s`

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 14px',
      background: `${ringColor}08`,
      border: `1px solid ${ringColor}20`,
      borderRadius: 10,
      animation: 'chatTimeoutPulse 3s ease-in-out infinite',
    }}>
      {/* SVG ring */}
      <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
        <svg width={44} height={44} viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={22} cy={22} r={radius} fill="none" stroke="rgba(100,180,255,0.08)" strokeWidth={3} />
          {/* Progress ring */}
          <circle
            cx={22} cy={22} r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 500ms ease' }}
          />
        </svg>
        {/* Elapsed label centered */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: ringColor,
          fontFamily: "'JetBrains Mono', monospace",
          fontVariantNumeric: 'tabular-nums',
        }}>
          {label}
        </div>
      </div>

      {/* Status text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontSize: 13, fontWeight: 600, color: '#6B8AB0',
          fontFamily: "'Inter', sans-serif",
        }}>
          Waiting for {agentName || 'agent'}...
        </span>
        {elapsed >= 30 && (
          <span style={{
            fontSize: 12, fontWeight: 500, color: elapsed >= 50 ? '#EF4444' : '#F59E0B',
            fontFamily: "'Inter', sans-serif",
          }}>
            {elapsed >= 60 ? `${agentName || 'Agent'} may be busy` : elapsed >= 50 ? 'Response may be delayed' : 'Still processing'}
          </span>
        )}
      </div>

      {/* Bouncing dots */}
      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
        {[0, 1, 2].map(j => (
          <div key={j} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: ringColor,
            opacity: j === 0 ? 0.9 : j === 1 ? 0.55 : 0.25,
            animation: `vegasTypingBounce 1.4s ease-in-out ${j * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

// ---- 4 TOP SQUARES (Steffen spec: top-squares-spec.md) ----
// Box 1: LIVE (green, SVG progress-bar border, pulse dot)
// Box 2: YOUR TODOS (amber, badge energy, checkbox feeling)
// Box 3: CALENDAR (iOS Calendar icon, red header, blue glow)
// Box 4: PROJECT PROGRESS (purple, cycle arrows, crossfade)
// TODO(patrik): CALENDAR BOX REAL DATA -- Wire to Google Calendar MCP. Show NEXT EVENT with time + title.
// TODO(patrik): PROGRESS BORDER CLOCKWISE FILL -- SVG stroke-dashoffset clockwise from top-center.
function TopSquares({ allAgentStatus, workingCount, blockedCount, overallProgress, isNightMode, isDaytime, data, pipeData, rightNowTasksProp }) {
  const [glowBox, setGlowBox] = useState(null)
  const [expandedBox, setExpandedBox] = useState(null)
  const [projectIndex, setProjectIndex] = useState(0)
  const [slideDir, setSlideDir] = useState('right') // for project crossfade direction
  const glowTimerRef = useRef(null)
  const liveBoxRef = useRef(null)
  const [livePerimeter, setLivePerimeter] = useState(400)

  // Measure LIVE box for SVG perimeter calculation
  useEffect(() => {
    if (liveBoxRef.current) {
      const { width, height } = liveBoxRef.current.getBoundingClientRect()
      setLivePerimeter(2 * (width + height) - 8 * 12) // subtract corners (8 * borderRadius)
    }
  }, [])

  // LIVE: use useDataPipe rightNow (real running agents from TASK STARTED/FINISHED)
  // On localhost: useDataPipe is source of truth. Zero running = zero shown.
  // On production: falls back to allAgentStatus demo data.
  const liveAgents = pipeData?.rightNow || []

  // Right Now manual tasks passed in from parent (GameDashboard)
  const rightNowTasks = rightNowTasksProp || []

  const workingAgents = useMemo(() => {
    // Combine live agent tasks + manual Right Now tasks
    // No demo fallback -- only show real data from Supabase/pipe
    const agents = []
    if (liveAgents.length > 0) {
      agents.push(...liveAgents.map(t => ({
        slug: t.agent,
        name: (t.agent || '').charAt(0).toUpperCase() + (t.agent || '').slice(1),
        task: t.text || '',
        isLive: true,
      })))
    }
    // Add manual Right Now tasks
    for (const t of rightNowTasks) {
      agents.push({
        slug: t.agent || 'patrik',
        name: (t.agent || 'patrik').charAt(0).toUpperCase() + (t.agent || 'patrik').slice(1),
        task: t.text || '',
        isLive: false,
        id: t.id,
      })
    }
    return agents
  }, [liveAgents, allAgentStatus, rightNowTasks])

  // LIVE count: workingAgents is already deduped (liveAgents + rightNowTasks, no double-count)
  const liveCount = workingAgents.length

  // YOUR TODOS: real count from useDataPipe (punch-list [Patrik] tags), not blocked agents
  const todoCount = pipeData?.pillCounts?.yourTodos ?? blockedCount ?? 0
  const realPatrikTodos = pipeData?.yourTodos || []

  // PROJECT PROGRESS: stable progress from useDataPipe projectProgress (real punch-list data)
  const projects = useMemo(() => {
    const pp = pipeData?.projectProgress || {}
    const entries = Object.entries(pp).filter(([, v]) => v.total > 0)
    if (entries.length === 0) {
      // Fallback: use demo data agents
      const agents = data?.agents || []
      const working = agents.filter(a => a.status === 'WORKING')
      if (working.length === 0) {
        return [{ name: 'All Clear', progress: 100, estimate: '' }]
      }
      return working.map(a => {
        const name = a.name || a.slug || 'unknown'
        let hash = 0
        for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
        const progress = 30 + Math.abs(hash % 41)
        return { name, task: a.currentTask || 'In progress', progress, estimate: a.timeActive ? 'Active' : '' }
      })
    }
    return entries.map(([section, v]) => {
      const progress = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0
      // Pretty-print section name
      const name = section.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      return { name, progress, estimate: `${v.done}/${v.total} done`, task: `${v.remaining} remaining` }
    }).sort((a, b) => a.progress - b.progress).slice(0, 8)
  }, [pipeData?.projectProgress, data])

  const currentProject = projects[projectIndex % projects.length] || projects[0]

  // Glow animation: fast 80ms on, hold 220ms, fade 400ms
  const triggerGlow = useCallback((boxId) => {
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current)
    setGlowBox(boxId)
    glowTimerRef.current = setTimeout(() => setGlowBox(null), 300)
  }, [])

  const handleBoxClick = useCallback((boxId) => {
    triggerGlow(boxId)
    setExpandedBox(prev => prev === boxId ? null : boxId)
  }, [triggerGlow])

  // Progress border: ratio of live agents to total
  const totalAgents = Math.max(Object.keys(allAgentStatus || {}).length, 1)
  const progressPercent = liveCount > 0 ? Math.min(100, (liveCount / totalAgents) * 100) : 0

  // Day/night accent colors (Steffen spec: darkened accents for white bg contrast)
  const ACCENTS = {
    live:     { night: '#22C55E', day: '#16A34A' },
    todos:    { night: '#F59E0B', day: '#D97706' },
    calendar: { night: '#3B82F6', day: '#2563EB' },
    progress: { night: '#8B5CF6', day: '#7C3AED' },
  }
  const accent = (key) => isNightMode ? ACCENTS[key].night : ACCENTS[key].day

  // Shared tile base styles (Steffen spec: gradient bg, 12px radius -- COMPACT for 1x4 single row)
  const tileBase = (isGlowing, accentColor, hasActiveBorder = false) => ({
    background: isNightMode
      ? 'linear-gradient(180deg, #162236 0%, #131F30 100%)'
      : 'linear-gradient(180deg, #1A3358 0%, #172E50 100%)',
    borderRadius: 10,
    padding: '8px 6px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: 64,
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.08s ease-out',
    boxShadow: isGlowing
      ? `0 0 16px ${accentColor}99, 0 0 40px ${accentColor}33, inset 0 0 12px ${accentColor}1A`
      : (isNightMode
        ? '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)'
        : '0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(59,130,246,0.06)'),
    border: isGlowing
      ? `2px solid ${accentColor}`
      : hasActiveBorder
        ? `2px solid ${accentColor}40`
        : (isNightMode ? '2px solid #1E3A5F' : '2px solid rgba(59,130,246,0.12)'),
  })

  // Steffen spec label: colored per tile, not gray (compact for 1x4 row)
  const labelStyle = (color) => ({
    fontSize: 10, fontWeight: 800, color,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    fontFamily: "'Inter', system-ui, sans-serif",
    marginTop: 2,
  })

  // Steffen spec value: compact for 1x4 row
  const valueStyle = (color) => ({
    fontSize: 20, fontWeight: 900, color,
    fontVariantNumeric: 'tabular-nums', lineHeight: 1,
    fontFamily: "'Inter', system-ui, sans-serif",
  })

  // Idle/zero colors
  const mutedColor = isNightMode ? '#64748B' : '#94A3B8'
  const subtextColor = isNightMode ? '#94A3B8' : '#64748B'

  return (
    <div style={{ flexShrink: 0 }}>
      {/* Keyframes: live pulse + progress border shimmer */}
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes progressBorderShimmer {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* DONE(bobby2): 1x4 single row per Patrik directive "4 squares in one row" */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
        padding: '10px 16px 12px',
      }}>

        {/* BOX 1: LIVE -- Running agents with SVG progress-bar border */}
        <div
          ref={liveBoxRef}
          role="button"
          tabIndex={0}
          aria-label={`Live agents: ${liveCount} running`}
          style={tileBase(glowBox === 'live', accent('live'))}
          onClick={() => handleBoxClick('live')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBoxClick('live') } }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03) translateY(-3px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) translateY(0)' }}
          data-testid="top-square-live"
        >
          {/* SVG progress-bar border (Steffen spec: strokeLinecap round, drop-shadow, perimeter from ref) */}
          {liveCount > 0 && (
            <svg style={{
              position: 'absolute', inset: -1, width: 'calc(100% + 2px)', height: 'calc(100% + 2px)',
              pointerEvents: 'none', zIndex: 2,
            }}>
              <rect
                x="1" y="1"
                width="calc(100% - 2px)" height="calc(100% - 2px)"
                rx="12" ry="12"
                fill="none"
                stroke={isNightMode ? '#22C55E' : '#16A34A'}
                strokeWidth={isNightMode ? '2.5' : '2'}
                strokeLinecap="round"
                strokeDasharray={livePerimeter}
                strokeDashoffset={livePerimeter - (livePerimeter * progressPercent / 100)}
                style={{
                  transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  filter: isNightMode
                    ? 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.4))'
                    : 'drop-shadow(0 0 3px rgba(34, 197, 94, 0.3))',
                  animation: 'progressBorderShimmer 2.5s ease-in-out infinite',
                }}
              />
            </svg>
          )}
          {/* Live pulse dot (8px compact for 1x4) */}
          {liveCount > 0 && (
            <div style={{
              position: 'absolute', top: 6, right: 6,
              width: 8, height: 8, borderRadius: '50%',
              background: accent('live'),
              boxShadow: `0 0 8px ${accent('live')}, 0 0 16px rgba(34, 197, 94, 0.3)`,
              animation: 'livePulse 1.5s ease-in-out infinite',
            }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={14} style={{ color: accent('live') }} />
            <span style={valueStyle(liveCount > 0 ? accent('live') : mutedColor)}>{liveCount}</span>
          </div>
          <span style={labelStyle(liveCount > 0 ? accent('live') : (isNightMode ? '#475569' : '#94A3B8'))}>LIVE</span>
        </div>

        {/* BOX 2: YOUR TODOS -- Amber/gold, badge energy */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`Your todos: ${todoCount} items`}
          style={tileBase(glowBox === 'todos', accent('todos'), todoCount > 0)}
          onClick={() => handleBoxClick('todos')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBoxClick('todos') } }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03) translateY(-3px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) translateY(0)' }}
          data-testid="top-square-todos"
        >
          {/* Static amber notification dot (no animation, badge energy) */}
          {todoCount > 0 && (
            <div style={{
              position: 'absolute', top: 6, right: 6,
              width: 8, height: 8, borderRadius: '50%',
              background: accent('todos'),
              boxShadow: `0 0 8px rgba(245, 158, 11, 0.6)`,
            }} />
          )}
          {/* Subtle checkmark overlay when zero */}
          {todoCount === 0 && (
            <CheckCircle2 size={36} style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              color: accent('todos'), opacity: 0.05,
            }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={14} style={{ color: accent('todos') }} />
            <span style={valueStyle(todoCount > 0 ? accent('todos') : mutedColor)}>{todoCount}</span>
          </div>
          <span style={labelStyle(todoCount > 0 ? accent('todos') : (isNightMode ? '#475569' : '#94A3B8'))}>TODOS</span>
        </div>

        {/* BOX 3: CALENDAR -- iOS Calendar icon, red header, blue glow */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Calendar: No events"
          style={tileBase(glowBox === 'calendar', accent('calendar'))}
          onClick={() => handleBoxClick('calendar')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBoxClick('calendar') } }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03) translateY(-3px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) translateY(0)' }}
          data-testid="top-square-calendar"
        >
          {/* iOS Calendar icon (32x32 compact for 1x4, red gradient header) */}
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: isNightMode ? '#1E293B' : '#1A2332',
            border: isNightMode ? '1.5px solid #334155' : '1.5px solid rgba(59,130,246,0.2)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}>
            <div style={{
              height: 10, background: 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 6, fontWeight: 800, color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Inter', system-ui, sans-serif" }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </span>
            </div>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 14, fontWeight: 900, color: isNightMode ? '#F1F5F9' : '#E8ECF0',
                fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1,
              }}>
                {new Date().getDate()}
              </span>
            </div>
          </div>
          <span style={labelStyle(isNightMode ? '#64748B' : '#94A3B8')}>SCHEDULE</span>
        </div>

        {/* BOX 4: PROJECT PROGRESS -- Purple, cycle arrows with crossfade */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`Project progress: ${currentProject.name} ${currentProject.progress}%`}
          style={tileBase(glowBox === 'project', accent('progress'))}
          onClick={() => handleBoxClick('project')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBoxClick('project') } }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03) translateY(-3px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) translateY(0)' }}
          data-testid="top-square-project"
        >
          {/* Chevron arrows inside (compact for 1x4, ChevronLeft/Right 12px) */}
          {projects.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setSlideDir('left'); setProjectIndex(i => (i - 1 + projects.length) % projects.length) }}
                style={{
                  position: 'absolute', left: 2, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  color: isNightMode ? '#475569' : '#6B8AB0', display: 'flex', zIndex: 3,
                  borderRadius: 4, transition: 'background 0.15s ease, color 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = isNightMode ? '#E2E8F0' : '#E2E8F0'; e.currentTarget.style.background = 'rgba(139,92,246,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.color = isNightMode ? '#475569' : '#6B8AB0'; e.currentTarget.style.background = 'none' }}
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSlideDir('right'); setProjectIndex(i => (i + 1) % projects.length) }}
                style={{
                  position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  color: isNightMode ? '#475569' : '#6B8AB0', display: 'flex', zIndex: 3,
                  borderRadius: 4, transition: 'background 0.15s ease, color 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = isNightMode ? '#E2E8F0' : '#E2E8F0'; e.currentTarget.style.background = 'rgba(139,92,246,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.color = isNightMode ? '#475569' : '#6B8AB0'; e.currentTarget.style.background = 'none' }}
              >
                <ChevronRight size={12} />
              </button>
            </>
          )}
          {/* Project content with crossfade (AnimatePresence, compact for 1x4) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProject.name}
              initial={{ opacity: 0, x: slideDir === 'right' ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideDir === 'right' ? -10 : 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
            >
              {/* Progress percentage as the main number */}
              <span style={{
                fontSize: 18, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
                fontFamily: "'Inter', system-ui, sans-serif",
                color: isNightMode ? '#A78BFA' : '#7C3AED',
                lineHeight: 1,
              }}>
                {currentProject.progress}%
              </span>
              <span style={labelStyle(isNightMode ? '#64748B' : '#94A3B8')}>PROGRESS</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ---- EXPANDED SECTIONS (below squares, above tab bar) ---- */}
      <AnimatePresence>
        {expandedBox === 'live' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.15, delay: 0.05 } }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '10px 20px 14px',
              borderBottom: '2px solid rgba(59,130,246,0.08)',
              background: isNightMode ? 'rgba(34,197,94,0.03)' : 'rgba(34,197,94,0.02)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: accent('live'), textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
                Right Now
              </div>
              {workingAgents.length === 0 ? (
                <div style={{ fontSize: 14, fontStyle: 'italic', color: isNightMode ? '#475569' : '#6B8AB0', fontFamily: "'Inter', sans-serif" }}>All agents idle</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {workingAgents.map(a => (
                    <div key={a.slug}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        handleSidebarTaskContextMenu(e, { text: a.task || a.name, agent: a.slug, done: false })
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px', borderRadius: 8,
                        background: isNightMode ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.03)',
                        cursor: 'default', position: 'relative',
                      }}
                    >
                      <TaskPriorityBar taskText={a.task || a.name} />
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', background: '#22C55E', flexShrink: 0,
                        animation: 'livePulse 1.5s ease-in-out infinite',
                      }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: isNightMode ? '#E2E8F0' : '#E2E8F0', fontFamily: "'Inter', sans-serif" }}>
                        {a.name}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: isNightMode ? '#64748B' : '#6B8AB0', fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {a.task}
                      </span>
                      <TaskNoteIndicator taskText={a.task || a.name} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {expandedBox === 'todos' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.15, delay: 0.05 } }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '10px 20px 14px',
              borderBottom: '2px solid rgba(59,130,246,0.08)',
              background: isNightMode ? 'rgba(245,158,11,0.03)' : 'rgba(245,158,11,0.02)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: accent('todos'), textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
                Your TODOs
              </div>
              {realPatrikTodos.length === 0 ? (
                <div style={{ fontSize: 14, fontStyle: 'italic', color: isNightMode ? '#475569' : '#6B8AB0', fontFamily: "'Inter', sans-serif" }}>No Patrik TODOs. All clear.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {realPatrikTodos.slice(0, 8).map((t, i) => (
                    <div key={i}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        handleSidebarTaskContextMenu(e, { text: t.text, agent: t.agent || 'patrik', done: t.done || false, projectSection: t.projectSection })
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px', borderRadius: 8,
                        background: isNightMode ? 'rgba(245,158,11,0.05)' : 'rgba(245,158,11,0.03)',
                        cursor: 'default', position: 'relative',
                      }}
                    >
                      <TaskPriorityBar taskText={t.text} />
                      <CheckCircle2 size={14} style={{ color: accent('todos'), flexShrink: 0 }} />
                      {t.projectColor && (
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%', background: t.projectColor, flexShrink: 0,
                        }} />
                      )}
                      <span style={{ fontSize: 13, fontWeight: 500, color: isNightMode ? '#E2E8F0' : '#E2E8F0', fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {t.text}
                      </span>
                      <TaskNoteIndicator taskText={t.text} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {expandedBox === 'calendar' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.15, delay: 0.05 } }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '10px 20px 14px',
              borderBottom: '2px solid rgba(59,130,246,0.08)',
              background: isNightMode ? 'rgba(59,130,246,0.03)' : 'rgba(59,130,246,0.02)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: accent('calendar'), textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
                Schedule
              </div>
              <div style={{ fontSize: 14, fontStyle: 'italic', color: isNightMode ? '#475569' : '#6B8AB0', fontFamily: "'Inter', sans-serif" }}>
                No events today. Calendar API will connect here.
              </div>
            </div>
          </motion.div>
        )}

        {expandedBox === 'project' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.15, delay: 0.05 } }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '10px 20px 14px',
              borderBottom: '2px solid rgba(59,130,246,0.08)',
              background: isNightMode ? 'rgba(139,92,246,0.03)' : 'rgba(139,92,246,0.02)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: accent('progress'), textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
                Active Projects
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {projects.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 8,
                    background: i === (projectIndex % projects.length)
                      ? (isNightMode ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)')
                      : (isNightMode ? 'rgba(139,92,246,0.04)' : 'rgba(139,92,246,0.02)'),
                    border: i === (projectIndex % projects.length) ? '1px solid rgba(139,92,246,0.2)' : '1px solid transparent',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isNightMode ? '#E2E8F0' : '#E2E8F0', fontFamily: "'Inter', sans-serif", minWidth: 50 }}>
                      {p.name}
                    </span>
                    <div style={{
                      flex: 1, height: 5, borderRadius: 3,
                      background: isNightMode ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)',
                        width: `${p.progress}%`,
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isNightMode ? '#A78BFA' : '#7C3AED', fontFamily: "'Inter', sans-serif", minWidth: 32, textAlign: 'right' }}>
                      {p.progress}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---- SIDEBAR PUNCH-LIST PARSER (lightweight, for useDataPipe in sidebar) ----
// Bobby2: The sidebar needs a real parser so useDataPipe can compute yourTodos, projectProgress,
// and finishThese from the same punch-list.md data that GameHUD uses. This ensures one source of truth.
// Simpler than GameHUD's parsePunchList (no CLIENT_SUBSECTION_MAP needed for sidebar counts).
function parsePunchListSidebar(markdown) {
  if (!markdown) return { projects: [], todayTasks: [] }
  const lines = markdown.split('\n')
  const projects = []
  const todayTasks = []
  let currentSection = ''
  let currentProject = null

  const SECTION_MAP = {
    'RIGHT NOW':     { name: 'Right Now', section: 'rightnow',     color: '#FF6B3D' },
    'YOUR TODOS':    { name: 'Your TODOs', section: 'your-todos', color: '#EF4444' },
    'FINISH THESE':  { name: 'Finish These', section: 'finish-these', color: '#6B8AB0' },
    'CHECKING IN':   { name: 'Finish These', section: 'finish-these', color: '#6B8AB0' },
    'SCHEDULE':      { name: 'Schedule',  section: 'schedule',    color: '#FF6B3D' },
    'TODAY':         { name: 'Schedule',  section: 'schedule',    color: '#FF6B3D' },
    'CORNER':        { name: 'Corner',    section: 'corner',      color: '#3B9EFF' },
    'PRODUCT':       { name: 'Corner',    section: 'corner',      color: '#3B9EFF' },
    'DASHBOARD':     { name: 'Corner',    section: 'corner',      color: '#3B9EFF' },
    'AMBITION':      { name: 'Ambition',  section: 'ambition',    color: '#F59E0B' },
    'AOM SITE':      { name: 'AOM Site',  section: 'aom-site',    color: '#5BB8FF' },
    'GO-TO-MARKET':  { name: 'Advisory',  section: 'gtm',         color: '#7C9A72' },
    'OUTREACH':      { name: 'Outreach',  section: 'outreach',    color: '#EF4444' },
    'CLIENT DEADLINE':{ name: 'Deadlines', section: 'deadlines',  color: '#F97316' },
    'INFRASTRUCTURE':{ name: 'Infra',     section: 'infra',       color: '#4CAF50' },
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').trim()
      const sectionUpper = currentSection.toUpperCase()
      if (sectionUpper.startsWith('CLIENT') || sectionUpper.startsWith('AGENTS')) {
        currentProject = null
        continue
      }
      let matched = null
      for (const [key, config] of Object.entries(SECTION_MAP)) {
        if (sectionUpper.startsWith(key)) { matched = config; break }
      }
      if (matched) {
        const existing = projects.find(p => p.section === matched.section)
        if (existing) { currentProject = existing }
        else { currentProject = { ...matched, tasks: [] }; projects.push(currentProject) }
      } else { currentProject = null }
      continue
    }
    if (currentProject && trimmed.startsWith('- [')) {
      const isDone = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')
      const lastBracket = trimmed.match(/\[([A-Za-z]+)\][\s]*$/)
      let agent = null
      if (lastBracket) {
        const name = lastBracket[1].toLowerCase()
        if (name === 'patrik') agent = 'patrik'
        else if (name === 'ash') agent = 'ash'
        else {
          const found = AGENTS.find(a => a.name.toLowerCase() === name || a.slug === name)
          if (found) agent = found.slug
        }
      }
      let text = trimmed.replace(/^- \[[ xX]\]\s*/, '').replace(/~~([^~]+)~~/, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([A-Za-z]+(?:\s*(?:--|[+])\s*[^\]]*)?)\]\s*$/, '').trim()
      if (text.length > 80) text = text.slice(0, 77) + '...'
      const task = { text, done: isDone, agent, raw: trimmed }
      currentProject.tasks.push(task)
      if (currentProject.section === 'schedule' && !isDone) {
        todayTasks.push({ ...task, project: 'Schedule' })
      }
    }
  }
  return { projects: projects.filter(p => p.tasks.length > 0), todayTasks }
}

// ---- UNIFIED RIGHT PANEL (Vegas sidebar - Steffen visual target match) ------
// Matches: vegas-sidebar-isolated.png, chat-view-full.png
// Blue glass sidebar. 64px avatar, status dot, quick stats pills, tab bar with glow.
// Chat: avatars on both sides, source label pills, system notification inline, typing dots.
//
// DONE(bobby): Chat timeout indicator -- countdown ring when waiting for agent response (60s). Shows elapsed time + animated SVG ring.
// DONE(bobby): Agent activity log -- INFO tab now shows recent commits/completions per agent from pipeline feed. Filterable, with commit hashes and timestamps.
// TODO(patrik): Client projects in HUD -- sidebar should show client project status for the selected agent [SURVIVES: Sidebar is React UI overlay. Engine-independent.]
// TODO(patrik): PILL ARCHITECTURE -- Below the 4 top squares, project pills auto-populate from context (Ambition, Corner, ISA, KOHRS, etc). System routes tasks to the right project bucket. Pills overflow with LEFT/RIGHT ARROWS to scroll (not wrap). SEARCH BAR at top = instant pill add. Project pills are the PROJECT level. The 4 top squares are the WORKFLOW level. Ref: bobby/last-conversation.md item 15.
// TODO(patrik): TASKS IN MULTIPLE PILLS -- A task like "Bobby: chat cleanup" can appear in BOTH "Corner" project pill AND "Right Now" org pill simultaneously. Tasks aren't exclusive to one bucket. They exist wherever they're relevant. Ref: bobby/last-conversation.md item 15b.
// TODO(patrik): ARCHIVE PILL -- Completed tasks don't show inline in each category. Instead: small "Archive" link at bottom of each pill's task list. "Archived" is its own PILL with an accordion organized by month, day, and year. Simple expandable sections. If you can't find your task, search it. Ref: bobby/last-conversation.md item 16.
// DONE(bobby2): RIGHT-CLICK CONTEXT MENU ON SIDEBAR TASKS -- Unified shared TaskContextMenu at src/dashboard/components/TaskContextMenu.jsx. 7 actions: Mark Done, Assign Agent, Add to Right Now, Move to Project, Set Priority, Add Context (inline input), Delete (two-click confirm). Day/night palette swap, submenu slide-left, viewport-aware positioning. Wired to sidebar expanded sections (Right Now, Your TODOs). Full spec: projects/steffen/right-click-menu-spec.md.
// TODO(patrik): DATA SYNC RULE -- ALL data syncs to proper place automatically. Pills are LIVE VIEWS: task completed removes from Right Now + adds to completed feed + updates project pill progress. TODO checked off drops Your TODOs count + archives it. Calendar event passes auto-checks in Schedule. Agent starts/finishes updates LIVE box. 3s polling keeps everything fresh. No data in only one place. Ref: bobby/last-conversation.md Data Sync Rule.
// TODO(patrik): CHAT VISUAL TARGET -- Chat design target is NOT the sidebar spec mockup. The approved targets are: projects/steffen/visual-target/hud/dream-chat-v1.png and projects/steffen/visual-target/chat-view-full.png. Bobby should match THOSE, not generic bubbles. Ref: bobby/last-conversation.md Chat Design Note.
// DONE(bobby2): isNightMode passed to GameHUD. Bottom HUD flips to white/vibrant blue in daytime. Ref: Patrik feedback Pass 22.
// ---- OWNER NOTES (persistent notes for Patrik's profile) ----
function OwnerNotes({ isNightMode, onAddToRightNow }) {
  const isDaytime = isNightMode === false
  const [notes, setNotes] = useState([])
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  // Notes are in-memory only (no persistence)

  const addNote = () => {
    const text = input.trim()
    if (!text) return
    setNotes(prev => [{ id: Date.now(), text, ts: new Date().toISOString(), pinned: false }, ...prev])
    setInput('')
    inputRef.current?.focus()
  }

  const deleteNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const togglePin = (id) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n))
  }

  // Sort: pinned first, then by time
  const sorted = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.id - a.id
  })

  const formatTime = (ts) => {
    try {
      const d = new Date(ts)
      const now = new Date()
      const diff = now - d
      if (diff < 60000) return 'just now'
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch { return '' }
  }

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState(null)

  useEffect(() => {
    if (!ctxMenu) return
    const handler = () => setCtxMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [ctxMenu])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Notes list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {sorted.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            color: isDaytime ? '#6B8AB0' : '#8BA4C4',
            fontSize: 14, fontFamily: "'Inter', sans-serif",
          }}>
            Your notes will appear here.
          </div>
        )}
        {sorted.map(note => (
          <div
            key={note.id}
            onContextMenu={(e) => {
              e.preventDefault()
              setCtxMenu({ id: note.id, x: e.clientX, y: e.clientY, text: note.text })
            }}
            style={{
              padding: '10px 14px',
              marginBottom: 8,
              background: note.pinned
                ? (isDaytime ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.08)')
                : (isDaytime ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)'),
              border: note.pinned
                ? (isDaytime ? '1px solid rgba(59,130,246,0.15)' : '1px solid rgba(59,130,246,0.2)')
                : (isDaytime ? '1px solid rgba(59,130,246,0.15)' : '1px solid rgba(255,255,255,0.05)'),
              borderRadius: 8,
              cursor: 'default',
            }}
          >
            <div style={{
              fontSize: 14, fontWeight: 500, lineHeight: 1.5,
              color: isDaytime ? '#E2E8F0' : '#E2E8F0',
              fontFamily: "'Inter', sans-serif",
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {note.pinned && <span style={{ color: '#3B82F6', marginRight: 6, fontSize: 12 }}>PINNED</span>}
              {note.text}
            </div>
            <div style={{
              fontSize: 12, fontWeight: 500, marginTop: 6,
              color: isDaytime ? '#6B8AB0' : '#8BA4C4',
              fontFamily: "'Inter', sans-serif",
            }}>
              {formatTime(note.ts)}
            </div>
          </div>
        ))}
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div style={{
          position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 200,
          background: isDaytime ? '#162D52' : 'rgba(15,23,42,0.98)',
          border: isDaytime ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.2)',
          borderRadius: 8, padding: '4px 0', minWidth: 160,
          boxShadow: isDaytime ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          {[
            { label: ctxMenu.pinned ? 'Unpin' : 'Pin to top', action: () => togglePin(ctxMenu.id) },
            { label: 'Send to Right Now', action: () => {
              const note = notes.find(n => n.id === ctxMenu.id)
              if (note && onAddToRightNow) onAddToRightNow({ id: note.id, text: note.text, agent: 'patrik' })
            } },
            { label: 'Delete', action: () => deleteNote(ctxMenu.id), color: '#EF4444' },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => { item.action(); setCtxMenu(null) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 14px', background: 'none', border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                color: item.color || (isDaytime ? '#E2E8F0' : '#E2E8F0'),
                fontFamily: "'Inter', sans-serif",
                transition: 'background 100ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDaytime ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{
        padding: '12px 16px',
        borderTop: isDaytime ? '1px solid rgba(59,130,246,0.15)' : '1px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 8,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote() } }}
          placeholder="Write a note..."
          style={{
            flex: 1,
            padding: '10px 14px',
            background: isDaytime ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)',
            border: isDaytime ? '1.5px solid rgba(59,130,246,0.2)' : '1.5px solid rgba(59,130,246,0.15)',
            borderRadius: 8,
            fontSize: 14, fontWeight: 500,
            color: isDaytime ? '#E2E8F0' : '#E2E8F0',
            fontFamily: "'Inter', sans-serif",
            outline: 'none',
          }}
        />
        <button
          onClick={addNote}
          style={{
            padding: '10px 16px',
            background: '#3B82F6',
            border: 'none', borderRadius: 8,
            color: '#1E2A3A', fontSize: 14, fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#2563EB'}
          onMouseLeave={e => e.currentTarget.style.background = '#3B82F6'}
        >
          Add
        </button>
      </div>
    </div>
  )
}

// DONE(bobby+bobby2): Sidebar seamless column -- sidebar is ONE continuous full-height column. Chat input at bottom of sidebar. ChatBar removed. GameHUD constrained to game viewport width.
// DONE(bobby2): Chat visual polish -- compact stat pills, Trello depth bubbles, source labels deduped, TODAY separator. Pixel-matching chat-view-full.png.
// DONE: Pan bounds -- constrain camera panning so the building stays in view (Pass 10, clampPan + MAX_PAN)
// DONE: Demo data mode -- generateDemoData() for production, demo chat messages, demo checklist
function UnifiedPanel({ room, agent, agentStatus, allAgentStatus, onClose, onChat, chatMessages, onSendMessage, chatInput, onChatInputChange, streaming, chatLoading, agentSlug, punchListData, isExtended, onToggleExtend, isMobile, isTablet, data, activeTab, onActiveTabChange, isNightMode, onAddToRightNow, rightNowTasks, atMenuOpen, filteredAtOptions, atMenuIndex, onAtSelect, onAtKeyDown, cornerConfig, powerupOpen, onPowerupToggle, onPowerupActivate, selectedPowerups, onRemovePowerup, onInputFocus, onSelectAgent, onSelectProject, selectedProject, onMessageContextMenu, onGoOverview, onCenterCamera, externalReplyTo, onClearExternalReply, onSendFileToChat, onDismissMessage, onTaskNotDone }) {
  const status = agentStatus?.status || 'IDLE'
  const task = agentStatus?.currentTask || 'Standing by'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  const agentColor = room?.agentColor || agent?.color || '#6B7280'
  const setActiveTab = onActiveTabChange || (() => {})
  // Sidebar day/night palette (matches HUD pattern from GameHUD.jsx)
  const isDaytime = isNightMode === false
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const isNearBottomRef = useRef(true)
  const isUserTypingRef = useRef(false)
  const userJustSentRef = useRef(false)
  const prevMessageCountRef = useRef(0)
  const [showNewMsgIndicator, setShowNewMsgIndicator] = useState(false)
  const [agentSwitcherOpen, setAgentSwitcherOpen] = useState(false)
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false)
  const switcherRef = useRef(null)
  // Reply-to state: { id, content } | null
  const [replyTo, setReplyTo] = useState(null)
  // Consume external reply (set by context menu "Reply" action in GameDashboard)
  useEffect(() => {
    if (externalReplyTo) {
      setReplyTo(externalReplyTo)
      onClearExternalReply?.()
    }
  }, [externalReplyTo]) // eslint-disable-line react-hooks/exhaustive-deps
  // Confirmation box carousel index -- resets when agent changes or task count drops
  const [confirmIndex, setConfirmIndex] = useState(0)
  const confirmDoneCount = (rightNowTasks || []).filter(t => t.isDoneAwaitingApproval && t.agent === agentSlug).length
  useEffect(() => { setConfirmIndex(0) }, [agentSlug, confirmDoneCount]) // eslint-disable-line react-hooks/exhaustive-deps
  // Track which task is currently animating the approve glow+fade (keyed by taskId or text)
  const [approvingTaskId, setApprovingTaskId] = useState(null)
  // Track which task is currently animating the deny/reject red glow+fade
  const [denyingTaskId, setDenyingTaskId] = useState(null)
  // Optimistic removal: keys removed from UI immediately on approve/deny
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState(new Set())
  // Failed task keys: shown with error badge so user can retry
  const [failedTaskIds, setFailedTaskIds] = useState(new Set())
  // Long-press timer for message context menu (mobile)
  const msgLongPressRef = useRef(null)

  // Close switcher dropdowns on outside click
  useEffect(() => {
    if (!agentSwitcherOpen && !projectSwitcherOpen) return
    const handleClick = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setAgentSwitcherOpen(false)
        setProjectSwitcherOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [agentSwitcherOpen, projectSwitcherOpen])

  // Conversations default to latest (scroll to bottom).
  // On first load or agent switch: snap to bottom.
  // On new message: scroll to bottom ONLY if already at bottom.
  // User scrolls up: stay there, show "New messages" if needed.
  useEffect(() => {
    if (!messagesContainerRef.current || activeTab !== 'chat') return
    const el = messagesContainerRef.current
    const newCount = chatMessages?.length || 0
    const prevCount = prevMessageCountRef.current
    const isNewMessage = newCount > prevCount
    prevMessageCountRef.current = newCount

    if (isNewMessage) {
      if (isNearBottomRef.current || userJustSentRef.current) {
        // At bottom or user just sent: follow the conversation
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight
        })
        userJustSentRef.current = false
      } else {
        setShowNewMsgIndicator(true)
      }
    }
  }, [chatMessages, activeTab])

  // Snap to bottom on agent switch or first chat open
  useEffect(() => {
    if (!messagesContainerRef.current || activeTab !== 'chat') return
    const el = messagesContainerRef.current
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
    isNearBottomRef.current = true
    setShowNewMsgIndicator(false)
    prevMessageCountRef.current = chatMessages?.length || 0
  }, [agentSlug, activeTab])

  // Working agents count -- use REAL data from useDataPipe (agent-notifications.md TASK STARTED/FINISHED)
  // Bobby2: Full pipeData passed to TopSquares so sidebar uses same persistent truth as HUD pills
  const pipeData = useDataPipe(parsePunchListSidebar)
  const { rightNow: liveAgents, pillCounts: pipeCounts } = pipeData
  // Use real data everywhere -- no demo fallback on production
  const workingCount = liveAgents?.length ?? 0
  const blockedCount = pipeCounts?.yourTodos ?? 0
  const doneCount = Object.values(allAgentStatus || {}).filter(a => a?.status === 'DONE').length
  const totalAgents = Object.keys(allAgentStatus || {}).length || 13
  const overallProgress = totalAgents > 0 ? Math.round(((workingCount + doneCount) / totalAgents) * 100) : 0

  // Format chat timestamp to HH:MM AM/PM
  const formatChatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d)) return ''
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  // Format source label for display
  const formatSource = (source) => {
    if (!source) return null
    const s = source.toLowerCase().replace(/^via\s+/, '')
    if (s === 'dashboard' || s === 'corner-dashboard') return 'VIA DASHBOARD'
    if (s === 'telegram') return 'VIA TELEGRAM'
    if (s === 'terminal' || s === 'cli') return 'VIA TERMINAL'
    if (s.startsWith('via ')) return s.toUpperCase()
    return `VIA ${s.toUpperCase()}`
  }

  // Detect system notifications (commits, completions) in messages
  const isSystemNotification = (msg) => {
    if (!msg.content) return false
    const c = msg.content.toLowerCase()
    return c.includes('committed ') || c.includes('commit ') || (c.includes('pushed') && c.includes('commit'))
  }

  // DONE(steffen): Sidebar width switched from vw to % for consistent 70/30 on all screen sizes.
  return (
    <div
      style={{
        ...(isMobile
          ? { flex: 1, width: '100%', minWidth: 0, maxWidth: '100%' }
          : { flex: isExtended ? '0 0 65%' : '0 0 30%', width: isExtended ? '65%' : '30%', minWidth: 300, maxWidth: isExtended ? '65%' : '40%' }
        ),
        flexShrink: 0,
        height: '100%',
        background: isNightMode
          ? 'linear-gradient(180deg, #0C1829 0%, #0F1B2D 30%, #111E33 100%)'
          : 'linear-gradient(180deg, rgba(20,40,70,0.97) 0%, rgba(24,48,82,0.96) 50%, rgba(20,40,70,0.97) 100%)',
        borderLeft: isMobile ? 'none' : (isNightMode
          ? '2px solid rgba(59, 130, 246, 0.35)'
          : '2px solid rgba(59, 130, 246, 0.35)'),
        display: 'flex', flexDirection: 'column',
        boxShadow: isMobile ? 'none' : (isNightMode
          ? '-6px 0 30px rgba(0,0,0,0.6), -1px 0 0 rgba(59,130,246,0.1)'
          : '-8px 0 32px rgba(0,0,0,0.4), -1px 0 0 rgba(59,130,246,0.15)'),
        transition: 'width 250ms ease, background 500ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow at top */}
      <div style={{
        position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
        width: 300, height: 120,
        background: isNightMode
          ? 'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)'
          : 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ---- PANEL NAV BAR ---- */}
      {/* [City] [<] Agent Name [>] [Home] -- compact 36px top nav */}
      {!isMobile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          height: 36, flexShrink: 0,
          borderBottom: isNightMode ? '1px solid rgba(59,130,246,0.12)' : '1px solid rgba(59,130,246,0.18)',
          background: isNightMode ? 'rgba(9,15,28,0.6)' : 'rgba(16,34,62,0.5)',
          paddingLeft: 4, paddingRight: 4,
        }}>
          {/* City / Overview icon */}
          <button
            onClick={() => onGoOverview?.()}
            title="City overview"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, color: isNightMode ? '#4A6080' : '#6B8AB0',
              transition: 'color 120ms, background 120ms', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#60A5FA'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = isNightMode ? '#4A6080' : '#6B8AB0'; e.currentTarget.style.background = 'none' }}
          >
            <Building2 size={16} />
          </button>

          {/* Prev agent arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              const idx = AGENTS.findIndex(a => a.slug === (room?.id || agentSlug))
              const prev = AGENTS[(idx - 1 + AGENTS.length) % AGENTS.length]
              if (prev) onSelectAgent?.(prev.slug)
            }}
            title="Previous agent"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              width: 28, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, color: isNightMode ? '#4A6080' : '#6B8AB0',
              fontSize: 16, lineHeight: 1, flexShrink: 0,
              transition: 'color 120ms, background 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#60A5FA'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = isNightMode ? '#4A6080' : '#6B8AB0'; e.currentTarget.style.background = 'none' }}
          >&#8249;</button>

          {/* Agent/Project name (center) with optional pending-approval badge */}
          <div style={{
            flex: 1, textAlign: 'center',
            fontSize: 12, fontWeight: 700,
            fontFamily: "'Inter', system-ui, sans-serif",
            color: isNightMode ? '#C8D8EC' : '#D4E2F4',
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            paddingLeft: 4, paddingRight: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {agent?.name || room?.agent || agentSlug}
            </span>
            {confirmDoneCount > 0 && activeTab !== 'chat' && (
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: '#EAB308',
                boxShadow: '0 0 5px #EAB308, 0 0 10px rgba(234,179,8,0.5)',
              }} title={`${confirmDoneCount} task${confirmDoneCount > 1 ? 's' : ''} awaiting approval`} />
            )}
          </div>

          {/* Next agent arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              const idx = AGENTS.findIndex(a => a.slug === (room?.id || agentSlug))
              const next = AGENTS[(idx + 1) % AGENTS.length]
              if (next) onSelectAgent?.(next.slug)
            }}
            title="Next agent"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              width: 28, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, color: isNightMode ? '#4A6080' : '#6B8AB0',
              fontSize: 16, lineHeight: 1, flexShrink: 0,
              transition: 'color 120ms, background 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#60A5FA'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = isNightMode ? '#4A6080' : '#6B8AB0'; e.currentTarget.style.background = 'none' }}
          >&#8250;</button>

          {/* Home / center camera icon */}
          <button
            onClick={() => onCenterCamera?.()}
            title="Center camera on room"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, color: isNightMode ? '#4A6080' : '#6B8AB0',
              transition: 'color 120ms, background 120ms', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#60A5FA'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = isNightMode ? '#4A6080' : '#6B8AB0'; e.currentTarget.style.background = 'none' }}
          >
            <Home size={16} />
          </button>
        </div>
      )}

      {/* ---- AGENT CARD ---- */}
      {/* Hidden on mobile: mobile overlay header already shows agent info */}
      {/* Tablet (iPad 768-1280px): single 40px row -- avatar 28px + name + status dot only, nothing else */}
      {/* Desktop: chunky game-scale 64px avatar */}
      <div style={{
        padding: isTablet ? '4px 12px' : '20px 24px',
        background: isNightMode
          ? 'linear-gradient(180deg, rgba(59,130,246,0.06) 0%, transparent 100%)'
          : 'linear-gradient(180deg, rgba(59,130,246,0.12) 0%, transparent 100%)',
        borderBottom: isNightMode ? '2px solid rgba(59,130,246,0.15)' : '2px solid rgba(59,130,246,0.25)',
        flexShrink: 0,
        minHeight: isTablet ? 40 : undefined,
        display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: isTablet ? 8 : 16,
      }}>
        {/* Avatar with status dot */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <SpriteAvatar agentSlug={room?.id} size={isTablet ? 28 : 64} borderColor={agentColor}
            status={status}
            style={{
              borderWidth: isTablet ? 1 : 3,
              boxShadow: isTablet ? `0 0 8px ${agentColor}20` : `0 0 20px ${agentColor}30, 0 0 40px ${agentColor}10`,
            }}
          />
          {/* Status dot */}
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: isTablet ? 8 : 18, height: isTablet ? 8 : 18, borderRadius: '50%',
            background: cfg.color,
            border: isNightMode
              ? `${isTablet ? 1 : 3}px solid #0F1B2D`
              : `${isTablet ? 1 : 3}px solid #142846`,
            boxShadow: `0 0 ${isTablet ? 3 : 8}px ${cfg.color}`,
          }} />
        </div>

        {/* Name + role/status -- stacked on desktop, inline on tablet */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: isTablet ? 6 : 0, flexWrap: isTablet ? 'nowrap' : undefined }}>
          {/* Quick-switch arrows + name block */}
          {isTablet ? (
            // Tablet: arrows inline with name
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, maxWidth: 130 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const idx = AGENTS.findIndex(a => a.slug === (room?.id || agentSlug))
                  const prev = AGENTS[(idx - 1 + AGENTS.length) % AGENTS.length]
                  if (prev) onSelectAgent?.(prev.slug)
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                  color: isDaytime ? '#6B8AB0' : '#8BA4C4',
                  fontSize: 14, lineHeight: 1, flexShrink: 0,
                  display: 'flex', alignItems: 'center',
                }}
                title="Previous agent"
              >&#8249;</button>
              <div style={{
                color: isNightMode ? '#F1F5F9' : '#E8ECF0',
                fontSize: 13,
                fontWeight: 900,
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '0.01em', lineHeight: 1.1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: 80,
              }}>
                {agent?.name || room?.agent}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const idx = AGENTS.findIndex(a => a.slug === (room?.id || agentSlug))
                  const next = AGENTS[(idx + 1) % AGENTS.length]
                  if (next) onSelectAgent?.(next.slug)
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                  color: isDaytime ? '#6B8AB0' : '#8BA4C4',
                  fontSize: 14, lineHeight: 1, flexShrink: 0,
                  display: 'flex', alignItems: 'center',
                }}
                title="Next agent"
              >&#8250;</button>
            </div>
          ) : (
            // Desktop: name row with arrows, then subtitle below
            <div style={{ width: '100%', marginBottom: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const idx = AGENTS.findIndex(a => a.slug === (room?.id || agentSlug))
                    const prev = AGENTS[(idx - 1 + AGENTS.length) % AGENTS.length]
                    if (prev) onSelectAgent?.(prev.slug)
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                    color: isDaytime ? '#6B8AB0' : '#8BA4C4',
                    fontSize: 18, lineHeight: 1, flexShrink: 0,
                    display: 'flex', alignItems: 'center',
                    opacity: 0.7, transition: 'opacity 120ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.7' }}
                  title="Previous agent"
                >&#8249;</button>
                <div style={{
                  color: isNightMode ? '#F1F5F9' : '#E8ECF0',
                  fontSize: 22,
                  fontWeight: 900,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: '0.01em', lineHeight: 1.1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  flex: 1,
                }}>
                  {agent?.name || room?.agent}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const idx = AGENTS.findIndex(a => a.slug === (room?.id || agentSlug))
                    const next = AGENTS[(idx + 1) % AGENTS.length]
                    if (next) onSelectAgent?.(next.slug)
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                    color: isDaytime ? '#6B8AB0' : '#8BA4C4',
                    fontSize: 18, lineHeight: 1, flexShrink: 0,
                    display: 'flex', alignItems: 'center',
                    opacity: 0.7, transition: 'opacity 120ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.7' }}
                  title="Next agent"
                >&#8250;</button>
              </div>
              {/* Current task subtitle */}
              {(() => {
                const activeTask = liveAgents?.find(t => t.agent === agentSlug)
                const subtitle = activeTask?.text || (status === 'WORKING' ? 'Active' : 'Idle')
                return (
                  <div style={{
                    fontSize: 10, fontStyle: 'italic', color: '#8BA4C4',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: '100%', marginTop: 2, lineHeight: 1.3,
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}>
                    {subtitle}
                  </div>
                )
              })()}
            </div>
          )}
          {!isTablet && (
            <div style={{
              color: agentColor, fontSize: 13, fontWeight: 700,
              fontFamily: "'Inter', system-ui, sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginTop: 2, width: '100%',
            }}>
              {agent?.role || room?.role}
            </div>
          )}
          {/* Status badge pill -- always visible but smaller on tablet */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: isTablet ? 3 : 5,
            marginTop: isTablet ? 0 : 6,
            fontSize: isTablet ? 9 : 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            borderRadius: 4, padding: isTablet ? '1px 5px' : '2px 8px',
            flexShrink: 0,
            ...(status === 'WORKING' ? { color: '#16A34A', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }
              : status === 'BLOCKED' ? { color: '#DC2626', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }
              : status === 'DONE' ? { color: '#60A5FA', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }
              : { color: '#6B7280', background: 'rgba(107,114,128,0.1)', border: '1px solid rgba(107,114,128,0.2)' }),
          }}>
            <span style={{
              width: isTablet ? 4 : 5, height: isTablet ? 4 : 5, borderRadius: '50%',
              background: status === 'WORKING' ? '#16A34A' : status === 'BLOCKED' ? '#DC2626' : status === 'DONE' ? '#2563EB' : '#6B7280',
              flexShrink: 0,
            }} />
            {status === 'WORKING' ? 'ACTIVE' : status || 'IDLE'}
          </div>
          {/* Stat counts -- desktop only, hidden on tablet to save space */}
          {!isTablet && (
            <div style={{ display: 'flex', gap: 12, marginTop: 6, width: '100%' }}>
              <span style={{
                fontSize: 14, fontWeight: 700, color: isDaytime ? '#8BA4C4' : '#6B8AB0',
                fontFamily: "'Inter', system-ui, sans-serif",
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#22C55E', fontVariantNumeric: 'tabular-nums' }}>
                  {agentStatus?.buildCount || workingCount || 0}
                </span>
                builds
              </span>
              <span style={{
                fontSize: 14, fontWeight: 700, color: isDaytime ? '#8BA4C4' : '#6B8AB0',
                fontFamily: "'Inter', system-ui, sans-serif",
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#60A5FA', fontVariantNumeric: 'tabular-nums' }}>
                  {agentStatus?.taskCount || 0}
                </span>
                tasks
              </span>
            </div>
          )}
        </div>

        {/* Extend/collapse -- hidden on tablet to save header space */}
        {!isTablet && (
        <button onClick={onToggleExtend} title={isExtended ? 'Collapse panel' : 'Expand panel'}
          style={{
            background: isDaytime ? 'rgba(59,130,246,0.18)' : 'rgba(100,180,255,0.06)',
            border: isDaytime ? '1px solid rgba(59,130,246,0.15)' : '1px solid rgba(100,180,255,0.1)',
            borderRadius: 8, cursor: 'pointer', color: isExtended ? '#E85D26' : (isDaytime ? '#6B8AB0' : '#6B7280'),
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms ease', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = isDaytime ? '#E2E8F0' : '#EDF2FA'; e.currentTarget.style.background = isDaytime ? 'rgba(59,130,246,0.18)' : 'rgba(100,180,255,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.color = isExtended ? '#E85D26' : (isDaytime ? '#6B8AB0' : '#6B7280'); e.currentTarget.style.background = isDaytime ? 'rgba(59,130,246,0.18)' : 'rgba(100,180,255,0.06)' }}
        >
          {isExtended ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        )}
      </div>

      {/* ---- 4 TOP SQUARES (interactive, alive -- replaces stat pills) ---- */}
      {/* Hidden on mobile and tablet: saves vertical space, agent info in header */}
      {!isMobile && !isTablet && (
        <TopSquares
          allAgentStatus={allAgentStatus}
          workingCount={workingCount}
          blockedCount={blockedCount}
          overallProgress={overallProgress}
          isNightMode={isNightMode}
          isDaytime={isDaytime}
          data={data}
          pipeData={pipeData}
          rightNowTasksProp={rightNowTasks}
        />
      )}

      {/* ---- AGENT + PROJECT SWITCHER (replaces static "Talking to" indicator) ---- */}
      {/* Click the agent name to switch who you're talking to. Click project to scope the context. */}
      {/* Hidden on mobile AND tablet -- saves ~30px of vertical space on iPad */}
      <div ref={switcherRef} style={{
        display: (isMobile || isTablet) ? 'none' : 'flex', alignItems: 'center', gap: 6,
        padding: '6px 16px',
        borderBottom: isNightMode ? '1px solid rgba(59,130,246,0.08)' : '1px solid rgba(59,130,246,0.12)',
        flexShrink: 0, position: 'relative',
      }}>
        <MessageSquare size={12} style={{ color: isDaytime ? '#6B8AB0' : '#8BA4C4', flexShrink: 0 }} />
        <span style={{
          fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
          textTransform: 'uppercase', letterSpacing: '0.1em',
          color: isDaytime ? '#6B8AB0' : '#8BA4C4',
        }}>to:</span>

        {/* Agent selector button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setAgentSwitcherOpen(o => !o); setProjectSwitcherOpen(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: agentSwitcherOpen ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.06)',
              border: `1px solid ${agentSwitcherOpen ? 'rgba(59,130,246,0.35)' : 'rgba(59,130,246,0.15)'}`,
              borderRadius: 4, padding: '3px 8px 3px 8px',
              cursor: 'pointer', transition: 'all 150ms ease',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: agentColor, flexShrink: 0 }} />
            <span style={{
              fontSize: 11, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
              textTransform: 'uppercase', letterSpacing: '0.08em', color: agentColor,
            }}>{agent?.name || room?.agent || agentSlug}</span>
            <ChevronDown size={10} style={{ color: isDaytime ? '#6B8AB0' : '#8BA4C4', flexShrink: 0 }} />
          </button>
          {agentSwitcherOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
              background: isNightMode ? '#0F1B2D' : '#142846',
              border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6,
              minWidth: 160, maxHeight: 280, overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {AGENTS.map(a => {
                const isSelected = a.slug === agentSlug
                const aPendingCount = (rightNowTasks || []).filter(t => t.isDoneAwaitingApproval && t.agent === a.slug).length
                return (
                  <button key={a.slug} onClick={(e) => {
                    e.stopPropagation()
                    onSelectAgent?.(a.slug)
                    setAgentSwitcherOpen(false)
                  }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', background: isSelected ? 'rgba(59,130,246,0.15)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderBottom: '1px solid rgba(59,130,246,0.08)',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(59,130,246,0.08)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color || '#6B7280', flexShrink: 0 }} />
                    <span style={{
                      fontSize: 12, fontWeight: isSelected ? 800 : 600,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      color: isSelected ? (a.color || '#60A5FA') : '#94A3B8',
                      textTransform: 'capitalize',
                    }}>{a.name}</span>
                    {aPendingCount > 0 && (
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginLeft: 'auto',
                        background: '#EAB308',
                        boxShadow: '0 0 5px #EAB308, 0 0 10px rgba(234,179,8,0.4)',
                      }} title={`${aPendingCount} task${aPendingCount > 1 ? 's' : ''} awaiting approval`} />
                    )}
                    {isSelected && !aPendingCount && <CheckCircle2 size={12} style={{ color: '#60A5FA', marginLeft: 'auto' }} />}
                    {isSelected && aPendingCount > 0 && <CheckCircle2 size={12} style={{ color: '#60A5FA' }} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Project selector button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setProjectSwitcherOpen(o => !o); setAgentSwitcherOpen(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: projectSwitcherOpen ? 'rgba(59,130,246,0.10)' : 'transparent',
              border: `1px solid ${projectSwitcherOpen ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.10)'}`,
              borderRadius: 4, padding: '3px 8px',
              cursor: 'pointer', transition: 'all 150ms ease',
            }}
          >
            <Folder size={10} style={{ color: isDaytime ? '#6B8AB0' : '#8BA4C4', flexShrink: 0 }} />
            <span style={{
              fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
              color: selectedProject ? '#60A5FA' : (isDaytime ? '#6B8AB0' : '#8BA4C4'),
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{selectedProject ? (PROJECTS.find(p => p.slug === selectedProject)?.name || selectedProject) : 'Project'}</span>
            <ChevronDown size={10} style={{ color: isDaytime ? '#6B8AB0' : '#8BA4C4', flexShrink: 0 }} />
          </button>
          {projectSwitcherOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
              background: isNightMode ? '#0F1B2D' : '#142846',
              border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6,
              minWidth: 180, maxHeight: 260, overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {/* None option */}
              <button onClick={(e) => { e.stopPropagation(); onSelectProject?.(null); setProjectSwitcherOpen(false) }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', background: !selectedProject ? 'rgba(59,130,246,0.15)' : 'transparent',
                border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(59,130,246,0.08)',
                transition: 'background 100ms ease',
              }}
              onMouseEnter={e => { if (selectedProject) e.currentTarget.style.background = 'rgba(59,130,246,0.08)' }}
              onMouseLeave={e => { if (selectedProject) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 12, color: !selectedProject ? '#60A5FA' : '#94A3B8', fontWeight: !selectedProject ? 700 : 500, fontFamily: "'Inter', system-ui, sans-serif" }}>No project</span>
                {!selectedProject && <CheckCircle2 size={12} style={{ color: '#60A5FA', marginLeft: 'auto' }} />}
              </button>
              {PROJECTS.filter(p => !p.hidden).map(p => {
                const isSelected = selectedProject === p.slug
                return (
                  <button key={p.slug} onClick={(e) => {
                    e.stopPropagation()
                    onSelectProject?.(p.slug)
                    setProjectSwitcherOpen(false)
                  }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', background: isSelected ? 'rgba(59,130,246,0.15)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderBottom: '1px solid rgba(59,130,246,0.08)',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(59,130,246,0.08)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                    <span style={{
                      fontSize: 12, fontWeight: isSelected ? 800 : 600,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      color: isSelected ? (p.color || '#60A5FA') : '#94A3B8',
                    }}>{p.name}</span>
                    {isSelected && <CheckCircle2 size={12} style={{ color: p.color || '#60A5FA', marginLeft: 'auto' }} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ---- TAB BAR (3 tabs: Live / List / Info) ---- */}
      {/* Hidden on mobile: MobileDrawer has its own tab bar */}
      {/* Tablet: compressed to ~32px height to maximize chat space */}
      <div style={{
        display: isMobile ? 'none' : 'flex',
        borderBottom: isNightMode ? '2px solid rgba(59,130,246,0.12)' : '2px solid rgba(59,130,246,0.18)',
        flexShrink: 0,
        position: 'relative',
      }}>
        {(agentSlug === 'patrik'
          ? [
              { id: 'notes', label: 'NOTES', key: 'N' },
              { id: 'tasks', label: 'LIST', key: 'L' },
              { id: 'info', label: 'INFO', key: 'I' },
            ]
          : [
              { id: 'chat', label: 'CHAT', key: 'L' },
              { id: 'tasks', label: 'LIST', key: 'T' },
              { id: 'info', label: 'INFO', key: 'I' },
              { id: 'files', label: 'FILES', key: 'F' },
            ]
        ).map(tab => {
          const active = activeTab === tab.id
          return (
            <motion.button
              key={tab.id}
              onClick={() => {
                if (activeTab === tab.id) {
                  // Already on this tab, toggle expand/collapse
                  onToggleExtend?.()
                } else {
                  setActiveTab(tab.id)
                }
              }}
              whileHover={{ y: -2, background: active ? 'none' : 'rgba(59,130,246,0.04)', transition: { type: 'spring', stiffness: 500, damping: 12 } }}
              whileTap={{ scale: 0.92, y: 2, transition: { type: 'spring', stiffness: 600, damping: 18 } }}
              style={{
                flex: 1, textAlign: 'center',
                padding: isMobile ? '12px 0' : isTablet ? '7px 0' : '14px 0',
                minHeight: isMobile ? 44 : isTablet ? 32 : 'auto',
                fontSize: isMobile ? 13 : isTablet ? 11 : 16, fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: active ? (isNightMode ? '#F1F5F9' : '#60A5FA') : (isNightMode ? '#475569' : '#6B8AB0'),
                cursor: 'pointer',
                position: 'relative',
                background: 'none', border: 'none',
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: 'color 200ms, background 200ms',
              }}
            >
              {/* Active tab glow background */}
              {active && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%',
                  background: 'linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.06) 100%)',
                  pointerEvents: 'none',
                }} />
              )}
              {/* Active tab blue bar */}
              {active && (
                <motion.div
                  layoutId="vegas-tab-glow"
                  style={{
                    position: 'absolute', bottom: -2, left: 8, right: 8,
                    height: 3, borderRadius: '3px 3px 0 0',
                    background: '#3B82F6',
                    boxShadow: '0 0 12px rgba(59,130,246,0.6), 0 0 24px rgba(59,130,246,0.2)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: (isMobile || isTablet) ? 0 : 6 }}>
                {tab.label}
                {tab.key && !isMobile && !isTablet && (
                  <span style={{
                    background: isDaytime ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.06)',
                    border: isDaytime ? '1px solid rgba(59,130,246,0.18)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    padding: '1px 4px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    fontWeight: 600,
                    color: isDaytime ? '#6B8AB0' : '#8BA4C4',
                    lineHeight: 1.2,
                  }}>
                    {tab.key}
                  </span>
                )}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* ---- TAB CONTENT ---- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* NOTES TAB (owner profile - persistent notes) */}
        {activeTab === 'notes' && (
          <OwnerNotes isNightMode={isNightMode} onAddToRightNow={onAddToRightNow} />
        )}

        {/* CHAT TAB (matches chat-view-full.png) */}
        {activeTab === 'chat' && (
          <ChatErrorBoundary>
          <>
            {/* Messages area -- flex: 1 + minHeight: 0 is critical for flex scroll to work */}
            <div ref={messagesContainerRef} onScroll={() => {
              const el = messagesContainerRef.current
              if (!el) return
              const threshold = 80
              isNearBottomRef.current = (el.scrollHeight - el.scrollTop - el.clientHeight) < threshold
              if (isNearBottomRef.current) setShowNewMsgIndicator(false)
            }} style={{
              flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '16px 20px',
              display: 'flex', flexDirection: 'column', gap: 14,
              position: 'relative',
            }}>
              {chatLoading && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', gap: 10, padding: '24px 0',
                }}>
                  <div style={{ color: isDaytime ? '#6B8AB0' : '#8BA4C4', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>
                    Loading conversation...
                  </div>
                </div>
              )}
              {!chatLoading && (!chatMessages || chatMessages.length === 0) && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', gap: 10, padding: '24px 0',
                }}>
                  <SpriteAvatar agentSlug={room?.id} size={48} borderColor={agentColor} />
                  <div style={{ color: isDaytime ? '#E8ECF0' : '#F1F5F9', fontSize: 16, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
                    {agent?.name || 'Agent'}
                  </div>
                  <div style={{ color: isDaytime ? '#6B8AB0' : '#8BA4C4', fontSize: 14, fontFamily: "'Inter', sans-serif", textAlign: 'center' }}>
                    Start a conversation with {agent?.name || 'this agent'}.
                  </div>
                </div>
              )}
              {/* TODAY separator -- hidden during loading to prevent stale data flash */}
              {!chatLoading && chatMessages && chatMessages.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  margin: '4px 0 8px',
                }}>
                  <div style={{ flex: 1, height: 1, background: isDaytime ? 'rgba(59,130,246,0.18)' : 'rgba(100,180,255,0.1)' }} />
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: isDaytime ? '#6B8AB0' : '#8BA4C4',
                    textTransform: 'uppercase', letterSpacing: '0.12em',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>TODAY</span>
                  <div style={{ flex: 1, height: 1, background: isDaytime ? 'rgba(59,130,246,0.18)' : 'rgba(100,180,255,0.1)' }} />
                </div>
              )}
              {!chatLoading && chatMessages && chatMessages.map((msg, i) => {
                if (!msg || typeof msg !== 'object') return null // guard: skip null/malformed msgs
                const isUser = msg.role === 'user'
                // Only show source label on first message in a consecutive sequence from the same source
                const prevMsg = i > 0 ? chatMessages[i - 1] : null
                const isSameSource = prevMsg && prevMsg.role === msg.role && formatSource(prevMsg.source) === formatSource(msg.source)
                const sourceLabel = isSameSource ? null : formatSource(msg.source)
                const isNotif = !isUser && isSystemNotification(msg)

                // ---- TASK CONFIRM CARD (Vegas vibes) ----
                // Agent marked a task done -> special card with CHECK / MINUS buttons
                if (msg.isTaskConfirm) {
                  return (
                    <div key={msg.id || i} style={{
                      margin: '8px 0',
                      background: isDaytime
                        ? 'linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(99,102,241,0.06) 100%)'
                        : 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(99,102,241,0.10) 100%)',
                      border: isDaytime ? '1.5px solid rgba(59,130,246,0.35)' : '1.5px solid rgba(99,102,241,0.40)',
                      borderLeft: '3px solid #3B82F6',
                      borderRadius: 12,
                      padding: '12px 16px',
                      boxShadow: isDaytime
                        ? '0 2px 12px rgba(59,130,246,0.15), 0 1px 3px rgba(0,0,0,0.15)'
                        : '0 2px 16px rgba(59,130,246,0.22), 0 1px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#3B82F6',
                          boxShadow: '0 0 8px #3B82F6, 0 0 16px rgba(59,130,246,0.5)',
                          flexShrink: 0,
                          animation: 'vegasTypingBounce 2s ease-in-out infinite',
                        }} />
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: isDaytime ? '#3B82F6' : '#60A5FA',
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}>Task Complete</span>
                        {msg.time && (
                          <span style={{ marginLeft: 'auto', fontSize: 10, color: isDaytime ? '#6B8AB0' : '#8BA4C4', fontFamily: "'JetBrains Mono', monospace" }}>
                            {formatChatTime(msg.time)}
                          </span>
                        )}
                      </div>
                      {/* Task text */}
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: isDaytime ? '#1E293B' : '#E2E8F0',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        lineHeight: 1.4, marginBottom: 12,
                        padding: '8px 12px',
                        background: isDaytime ? 'rgba(255,255,255,0.6)' : 'rgba(15,27,45,0.6)',
                        borderRadius: 8,
                        border: isDaytime ? '1px solid rgba(59,130,246,0.15)' : '1px solid rgba(99,102,241,0.20)',
                      }}>
                        {msg.taskText || msg.content?.replace('Task marked done: ', '').replace('\n\nConfirmed done or needs more work?', '') || msg.content}
                      </div>
                      {/* Buttons */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {/* CHECK -- confirmed done */}
                        <button
                          onClick={() => onDismissMessage?.(msg.id)}
                          style={{
                            flex: 1, padding: '10px 16px',
                            background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                            border: '1.5px solid rgba(34,197,94,0.5)',
                            borderRadius: 10, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            color: '#FFFFFF', fontSize: 14, fontWeight: 800,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            boxShadow: '0 2px 8px rgba(22,163,74,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                            transition: 'transform 80ms ease, box-shadow 80ms ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(22,163,74,0.5), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(22,163,74,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Done
                        </button>
                        {/* MINUS -- not done, rerun */}
                        <button
                          onClick={() => onTaskNotDone?.(msg.id, msg.taskText || '')}
                          style={{
                            flex: 1, padding: '10px 16px',
                            background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                            border: '1.5px solid rgba(239,68,68,0.5)',
                            borderRadius: 10, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            color: '#FFFFFF', fontSize: 14, fontWeight: 800,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            boxShadow: '0 2px 8px rgba(220,38,38,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                            transition: 'transform 80ms ease, box-shadow 80ms ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(220,38,38,0.5), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(220,38,38,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Rerun
                        </button>
                      </div>
                    </div>
                  )
                }

                // System notification inline (commit messages, etc.)
                if (isNotif && !msg.streaming) {
                  return (
                    <div key={msg.id || i} style={{
                      margin: '4px 0',
                      background: isDaytime
                        ? 'linear-gradient(180deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.02) 100%)'
                        : 'linear-gradient(180deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.04) 100%)',
                      border: isDaytime ? '1px solid rgba(34,197,94,0.22)' : '1px solid rgba(34,197,94,0.18)',
                      borderLeft: '3px solid #22C55E',
                      borderRadius: 10,
                      padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 10,
                      boxShadow: isDaytime ? '0 1px 3px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.15), 0 1px 2px rgba(34,197,94,0.08)',
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#22C55E', boxShadow: '0 0 6px #22C55E',
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 14, fontWeight: 600, color: isDaytime ? '#8BA4C4' : '#6B8AB0',
                        fontFamily: "'Inter', sans-serif", flex: 1,
                      }}>
                        <strong style={{ color: agentColor, fontWeight: 800 }}>{agent?.name || 'Agent'}</strong> {msg.content}
                      </span>
                      {msg.time && (
                        <span style={{ fontSize: 12, color: isDaytime ? '#6B8AB0' : '#8BA4C4', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>
                          {formatChatTime(msg.time)}
                        </span>
                      )}
                    </div>
                  )
                }

                // Ambient message: compact, muted inline status update from agents
                // Think Slack channel energy: "Bobby: pushed HUD commit, testing now"
                if (msg.ambient && !msg.streaming) {
                  const ambientAgent = AGENTS.find(a => a.slug === msg.source) || agent
                  const ambientColor = ambientAgent?.color || '#6B7280'
                  return (
                    <div key={msg.id || i} style={{
                      margin: '2px 0',
                      padding: '6px 12px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      opacity: 0.7,
                    }}>
                      <SpriteAvatar agentSlug={ambientAgent?.slug || msg.source} size={20} borderColor={ambientColor} />
                      <span style={{
                        fontSize: 13, fontWeight: 500, color: isDaytime ? '#8BA4C4' : '#6B8AB0',
                        fontFamily: "'Inter', sans-serif", flex: 1,
                        fontStyle: 'italic',
                      }}>
                        <span style={{ color: ambientColor, fontWeight: 700, fontStyle: 'normal' }}>{ambientAgent?.name || msg.source}</span>{' '}
                        {msg.content}
                      </span>
                      {msg.time && (
                        <span style={{ fontSize: 10, color: isDaytime ? '#6B8AB0' : '#8BA4C4', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatChatTime(msg.time)}
                        </span>
                      )}
                    </div>
                  )
                }

                return (
                  <div key={msg.id || i}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      flexDirection: isUser ? 'row-reverse' : 'row',
                      position: 'relative',
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      onMessageContextMenu?.(e, msg)
                    }}
                    onTouchStart={(e) => {
                      clearTimeout(msgLongPressRef.current)
                      const touch = e.touches[0]
                      const cx = touch ? touch.clientX : window.innerWidth / 2
                      const cy = touch ? touch.clientY : window.innerHeight / 2
                      msgLongPressRef.current = setTimeout(() => {
                        onMessageContextMenu?.({ clientX: cx, clientY: cy, preventDefault: () => {}, _msgLongPress: true }, msg)
                      }, 500)
                    }}
                    onTouchEnd={() => clearTimeout(msgLongPressRef.current)}
                    onTouchMove={() => clearTimeout(msgLongPressRef.current)}
                  >
                    {/* Avatar -- 36px with colored ring per Steffen target */}
                    {isUser ? (
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        border: '3px solid #F59E0B',
                        background: '#F59E0B',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, color: '#1E2A3A',
                        flexShrink: 0,
                        boxShadow: '0 0 12px rgba(245,158,11,0.4), 0 2px 4px rgba(0,0,0,0.2)',
                      }}>
                        P
                      </div>
                    ) : (
                      <SpriteAvatar agentSlug={room?.id} size={36} borderColor={agentColor}
                        status={status}
                        style={{
                          flexShrink: 0,
                          borderWidth: 3,
                          boxShadow: `0 0 12px ${agentColor}40, 0 2px 4px rgba(0,0,0,0.2)`,
                        }}
                      />
                    )}

                    {/* Message content */}
                    <div style={{ maxWidth: '80%' }}>
                      {/* Name + timestamp above bubble */}
                      {!msg.streaming && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          marginBottom: 3, padding: '0 2px',
                          flexDirection: isUser ? 'row-reverse' : 'row',
                        }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: isUser ? '#F59E0B' : agentColor,
                            fontFamily: "'Inter', system-ui, sans-serif",
                          }}>
                            {isUser ? 'Patrik' : (agent?.name || agentSlug)}
                          </span>
                          {msg.time && (
                            <span style={{
                              fontSize: 11, color: '#4A6080',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>
                              {formatChatTime(msg.time)}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Reply-to preview inside bubble if this message has a reply_to */}
                      {msg.reply_to && chatMessages && (() => {
                        const parent = chatMessages.find(m => m.id === msg.reply_to)
                        if (!parent) return null
                        return (
                          <div style={{
                            borderLeft: `3px solid ${agentColor}80`,
                            paddingLeft: 8, marginBottom: 6,
                            color: '#8BA4C4', fontSize: 11,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            opacity: 0.8,
                          }}>
                            {(parent.content || '').slice(0, 80)}{(parent.content || '').length > 80 ? '...' : ''}
                          </div>
                        )
                      })()}
                      <div
                        className="msg-bubble"
                        style={{
                          padding: '8px 12px',
                          borderRadius: 12,
                          fontSize: 13, fontWeight: 500, lineHeight: 1.4,
                          fontFamily: "'Inter', system-ui, sans-serif",
                          ...(isUser
                            ? {
                                background: '#1a3a5c',
                                border: '1px solid rgba(59,130,246,0.3)',
                                color: '#fff',
                                borderBottomRightRadius: 3,
                              }
                            : {
                                background: '#0F1B2D',
                                border: `1px solid ${msg.streaming ? agentColor + '40' : 'rgba(255,255,255,0.08)'}`,
                                color: '#F1F5F9',
                                borderBottomLeftRadius: 3,
                              }
                          ),
                          position: 'relative',
                        }}>
                        {msg.content && typeof msg.content === 'string' && (
                          isUser ? (
                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {renderPlainContent(msg.content, '#7CB9FF')}
                            </div>
                          ) : (
                            <div style={{ wordBreak: 'break-word', position: 'relative' }}>
                              <MarkdownMessage text={msg.content} agentColor={agentColor} streaming={msg.streaming} />
                              {msg.streaming && msg.content && <span style={{ display: 'inline-block', width: 2, height: '1em', background: agentColor, marginLeft: 2, verticalAlign: 'text-bottom', animation: 'chatCursorBlink 0.8s ease-in-out infinite' }} />}
                            </div>
                          )
                        )}
                        {msg.streaming && !msg.content && (
                          <div style={{ display: 'flex', gap: 5, padding: '4px 0', alignItems: 'center' }}>
                            {[0, 1, 2].map(j => (
                              <div key={j} style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: agentColor,
                                opacity: j === 0 ? 0.9 : j === 1 ? 0.55 : 0.25,
                                animation: `vegasTypingBounce 1.4s ease-in-out ${j * 0.2}s infinite`,
                              }} />
                            ))}
                          </div>
                        )}
                        {/* Hover Reply button */}
                        {!msg.streaming && msg.content && (
                          <button
                            className="msg-reply-btn"
                            onClick={() => setReplyTo({ id: msg.id || `msg-${i}`, content: msg.content })}
                            style={{
                              display: 'none', // shown via CSS hover on parent
                              position: 'absolute',
                              ...(isUser ? { left: -32 } : { right: -32 }),
                              top: '50%', transform: 'translateY(-50%)',
                              background: 'rgba(15,27,45,0.9)',
                              border: '1px solid rgba(100,180,255,0.2)',
                              borderRadius: 6, width: 26, height: 26,
                              cursor: 'pointer', color: '#8BA4C4',
                              alignItems: 'center', justifyContent: 'center',
                              padding: 0,
                            }}
                          >
                            <CornerDownLeft size={13} />
                          </button>
                        )}
                      </div>
                      {/* Meta row: source pill only (timestamp moved above) */}
                      {!msg.streaming && sourceLabel && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          marginTop: 3, padding: '0 4px',
                          flexDirection: isUser ? 'row-reverse' : 'row',
                        }}>
                          {sourceLabel && (
                            <span style={{
                              fontSize: 9, fontWeight: 500, color: isDaytime ? '#8BA4C4' : '#6B8AB0',
                              letterSpacing: '0.06em',
                              fontFamily: "'JetBrains Mono', monospace",
                              opacity: isDaytime ? 0.5 : 0.4,
                              textTransform: 'lowercase',
                            }}>
                              {sourceLabel.toLowerCase()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {/* Timeout ring + typing indicator with label */}
              {streaming && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 0' }}>
                  <SpriteAvatar agentSlug={room?.id} size={30} borderColor={agentColor}
                    status={status}
                    style={{ flexShrink: 0, boxShadow: `0 0 8px ${agentColor}33`, marginTop: 4 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 24 }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {[0, 1, 2].map(j => (
                          <div key={j} style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: agentColor,
                            animation: `vegasTypingBounce 1.4s ease-in-out ${j * 0.2}s infinite`,
                          }} />
                        ))}
                      </div>
                      <span style={{
                        fontSize: 13, color: isDaytime ? '#8BA4C4' : '#6B8AB0', fontStyle: 'italic', fontWeight: 500,
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}>
                        {(() => {
                          const streamMsg = chatMessages?.find?.(m => m.streaming)
                          const phase = streamMsg?.streamPhase || 'typing'
                          if (phase === 'busy') return `${agent?.name || 'Agent'} may be busy. Message delivered.`
                          if (phase === 'processing') return `${agent?.name || 'Agent'} is processing...`
                          return `${agent?.name || 'Agent'} is typing...`
                        })()}
                      </span>
                    </div>
                    <ChatTimeoutRing
                      streaming={streaming}
                      agentColor={agentColor}
                      agentName={agent?.name}
                    />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* Scroll to bottom button (subtle, always available) */}
            {chatMessages?.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0', flexShrink: 0 }}>
                <button
                  onClick={() => {
                    messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' })
                    isNearBottomRef.current = true
                    setShowNewMsgIndicator(false)
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: isDaytime ? '#4A6585' : '#A0B4CC',
                    padding: '2px 8px', borderRadius: 4,
                    fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                    display: 'flex', alignItems: 'center', gap: 4,
                    transition: 'color 100ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = isDaytime ? '#60A5FA' : '#60A5FA'}
                  onMouseLeave={e => e.currentTarget.style.color = isDaytime ? '#4A6585' : '#A0B4CC'}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            )}
            {/* New messages indicator */}
            {showNewMsgIndicator && (
              <div style={{ position: 'relative', zIndex: 10 }}>
                <button
                  onClick={() => {
                    messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' })
                    setShowNewMsgIndicator(false)
                    isNearBottomRef.current = true
                  }}
                  style={{
                    position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                    background: '#3B82F6', color: '#fff',
                    fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                    padding: '4px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                    letterSpacing: '0.04em',
                  }}
                >
                  New messages
                </button>
              </div>
            )}
          </>
          </ChatErrorBoundary>
        )}

        {/* TASKS TAB -- Task Detail -> Brief Link (KEY INSIGHT: Task -> Brief -> Action in one click) */}
        {activeTab === 'tasks' && (
          <TasksTabContent
            task={task}
            agentColor={agentColor}
            agentSlug={agentSlug}
            agentStatus={agentStatus}
            agent={agent}
            isNightMode={isNightMode}
            onAddToRightNow={onAddToRightNow}
            rightNowTasks={rightNowTasks}
            punchProjects={pipeData?.punchData?.projects || []}
          />
        )}

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {/* Skeleton loading when no agent data yet */}
            {!agentStatus && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <SkeletonLine width={100} height={12} style={{ marginBottom: 10 }} />
                  <div style={{ padding: '10px 14px', background: isDaytime ? 'rgba(59,130,246,0.08)' : 'rgba(100,180,255,0.04)', borderRadius: 8, border: isDaytime ? '2px solid rgba(59,130,246,0.15)' : '1px solid rgba(100,180,255,0.08)' }}>
                    <SkeletonBlock lines={3} />
                  </div>
                </div>
                <div>
                  <SkeletonLine width={60} height={12} style={{ marginBottom: 10 }} />
                  <SkeletonLine width="80%" height={16} />
                  <SkeletonLine width="95%" height={14} style={{ marginTop: 8 }} />
                </div>
                <div>
                  <SkeletonLine width={70} height={12} style={{ marginBottom: 10 }} />
                  <SkeletonLine width={120} height={32} style={{ borderRadius: 6 }} />
                </div>
              </div>
            )}

            {/* Latest Result */}
            {agentStatus && agentStatus?.latestResult && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Latest Result</div>
                <div style={{
                  padding: '10px 14px',
                  background: isDaytime ? 'rgba(59,130,246,0.08)' : `${agentColor}08`,
                  border: isDaytime ? '1px solid rgba(59,130,246,0.15)' : `1px solid ${agentColor}20`,
                  borderRadius: 8,
                }}>
                  <div style={{ color: isDaytime ? '#A0B4CC' : '#F0ECE6', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.5 }}>
                    {agentStatus.latestResult}
                  </div>
                </div>
              </div>
            )}

            {/* Room info */}
            {agentStatus && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Room</div>
              <div style={{ color: isDaytime ? '#A0B4CC' : '#F0ECE6', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif" }}>{room?.name || 'Unknown'}</div>
              {room?.personality && (
                <div style={{ color: isDaytime ? '#8BA4C4' : '#6B8AB0', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", marginTop: 6, fontStyle: 'italic', lineHeight: 1.5 }}>{room.personality}</div>
              )}
            </div>
            )}

            {/* Project memberships (Vegas-style mini pills) */}
            {agentStatus && (() => {
              const agentProjects = PROJECTS.filter(p => p.team?.includes(agentSlug))
              if (agentProjects.length === 0) return null
              return (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Projects</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {agentProjects.map(p => (
                      <button
                        key={p.slug}
                        onClick={() => {}}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 20,
                          background: `${p.color}18`,
                          border: `1.5px solid ${p.color}60`,
                          color: p.color, fontSize: 11, fontWeight: 800,
                          fontFamily: "'Inter', system-ui, sans-serif",
                          letterSpacing: '0.04em', textTransform: 'uppercase',
                          cursor: 'pointer', transition: 'all 150ms',
                          boxShadow: `0 0 8px ${p.color}15, inset 0 0 6px ${p.color}08`,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${p.color}30`; e.currentTarget.style.boxShadow = `0 0 12px ${p.color}30, inset 0 0 8px ${p.color}12` }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${p.color}18`; e.currentTarget.style.boxShadow = `0 0 8px ${p.color}15, inset 0 0 6px ${p.color}08` }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Data source */}
            {IS_LOCAL && agentStatus && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Data Source</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4CAF50' }} />
                  <span style={{ color: '#4CAF50', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>Local (2s poll)</span>
                </div>
              </div>
            )}

            {/* Status */}
            {agentStatus && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: cfg.bg, borderRadius: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
                <span style={{ color: cfg.color, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase' }}>{cfg.label}</span>
              </div>
            </div>
            )}

            {/* Recent Activity Log (filtered pipeline feed for this agent) */}
            {(() => {
              const feed = data?.pipelineFeed || []
              const agentFeed = feed.filter(f => f.agent === room?.id).slice(0, 8)
              if (agentFeed.length === 0) return null
              return (
                <div>
                  <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Recent Activity</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {agentFeed.map((entry, idx) => {
                      const desc = entry.description?.replace(/^[A-Za-z]+:\s*/, '') || ''
                      const commitShort = entry.commitHash?.slice(0, 7) || ''
                      return (
                        <div key={idx} style={{
                          padding: '8px 12px',
                          background: isDaytime ? 'rgba(59,130,246,0.06)' : 'rgba(100,180,255,0.03)',
                          border: isDaytime ? '2px solid rgba(59,130,246,0.15)' : '1px solid rgba(100,180,255,0.06)',
                          borderLeft: `3px solid ${agentColor}40`,
                          borderRadius: 6,
                          display: 'flex', flexDirection: 'column', gap: 4,
                        }}>
                          <div style={{
                            color: isDaytime ? '#A0B4CC' : '#D0D8E8', fontSize: 13,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            lineHeight: 1.4,
                          }}>
                            {desc}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {commitShort && (
                              <span style={{
                                fontSize: 12, fontWeight: 600,
                                color: isDaytime ? '#16A34A' : '#22C55E',
                                fontFamily: "'JetBrains Mono', monospace",
                                background: isDaytime ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.08)',
                                border: isDaytime ? '1px solid rgba(34,197,94,0.12)' : '1px solid rgba(34,197,94,0.15)',
                                borderRadius: 4, padding: '1px 6px',
                                display: 'flex', alignItems: 'center', gap: 4,
                              }}>
                                <GitCommit size={10} />
                                {commitShort}
                              </span>
                            )}
                            {entry.repo && (
                              <span style={{
                                fontSize: 12, fontWeight: 600, color: isDaytime ? '#6B8AB0' : '#8BA4C4',
                                fontFamily: "'JetBrains Mono', monospace",
                              }}>
                                {entry.repo}
                              </span>
                            )}
                            {entry.time && (
                              <span style={{
                                fontSize: 12, fontWeight: 500, color: isDaytime ? '#6B8AB0' : '#8BA4C4',
                                fontFamily: "'Inter', sans-serif",
                                marginLeft: 'auto',
                              }}>
                                {timeAgo(entry.time)}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* Projects this agent belongs to */}
            {(() => {
              const projects = getAgentProjects(agentSlug)
              if (!projects.length) return null
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Projects</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {projects.map(p => {
                      const leadAgent = AGENTS.find(a => a.slug === p.lead)
                      return (
                        <div key={p.key} style={{
                          padding: '10px 12px',
                          background: isDaytime ? 'rgba(59,130,246,0.06)' : 'rgba(100,180,255,0.03)',
                          border: isDaytime ? '1px solid rgba(59,130,246,0.12)' : '1px solid rgba(100,180,255,0.06)',
                          borderRadius: 8,
                        }}>
                          <div style={{
                            color: isDaytime ? '#E8ECF0' : '#F1F5F9', fontSize: 14, fontWeight: 800,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            marginBottom: 6,
                          }}>
                            {p.name}
                          </div>
                          {/* Lead */}
                          {leadAgent && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: isDaytime ? '#6B8AB0' : '#8BA4C4', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lead:</span>
                              <SpriteAvatar agentSlug={p.lead} size={18} borderColor={leadAgent.color} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: leadAgent.color, fontFamily: "'Inter', sans-serif" }}>{leadAgent.name}</span>
                            </div>
                          )}
                          {/* Team */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isDaytime ? '#6B8AB0' : '#8BA4C4', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 2 }}>Team:</span>
                            {p.team.filter(t => t !== 'all').map(slug => {
                              const ta = AGENTS.find(a => a.slug === slug)
                              if (!ta) return <span key={slug} style={{ fontSize: 11, color: isDaytime ? '#8BA4C4' : '#8BA4C4', fontFamily: "'Inter', sans-serif" }}>{slug}</span>
                              return <SpriteAvatar key={slug} agentSlug={slug} size={20} borderColor={ta.color} />
                            })}
                            {p.team.includes('all') && <span style={{ fontSize: 11, color: isDaytime ? '#8BA4C4' : '#8BA4C4', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>All agents</span>}
                          </div>
                          {/* Context files */}
                          {p.contextFiles.length > 0 && (
                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {p.contextFiles.map(f => (
                                <span key={f} style={{
                                  fontSize: 11, fontWeight: 600, color: isDaytime ? '#60A5FA' : '#60A5FA',
                                  fontFamily: "'JetBrains Mono', monospace",
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* FILES TAB */}
        {activeTab === 'files' && (
          <FilesTab
            agentSlug={agentSlug}
            clientId={null}
            isNightMode={isNightMode}
            onSendFileToChat={onSendFileToChat}
          />
        )}

        {/* Checklist and Megaboard tabs removed. Use full-screen mode switching instead. */}

      </div>

      {/* ---- PINNED TASK CONFIRMATION BOX ---- */}
      {/* Sits between the tab content and the chat input. Always visible when the agent has
          done tasks awaiting approval -- not sorted chronologically with messages.
          Multiple done tasks stack here. Zero done tasks = nothing rendered. */}
      {activeTab === 'chat' && (() => {
        const doneTasks = (rightNowTasks || []).filter(t =>
          t.isDoneAwaitingApproval && t.agent === agentSlug &&
          !optimisticallyRemovedIds.has(t.taskId || t.text)
        )
        if (doneTasks.length === 0) return null
        const safeIndex = Math.min(confirmIndex, doneTasks.length - 1)
        const t = doneTasks[safeIndex]
        const total = doneTasks.length
        const callTaskAction = (taskId, taskText, action) => {
          const key = taskId || taskText
          // 1. Optimistically remove from UI immediately
          setOptimisticallyRemovedIds(prev => new Set([...prev, key]))
          // Clear any prior failure badge for this key
          setFailedTaskIds(prev => { const n = new Set(prev); n.delete(key); return n })
          // 2. Fire animation in background (non-blocking)
          const runAnim = async () => {
            if (action === 'approve') {
              setApprovingTaskId(key)
              await new Promise(r => setTimeout(r, 300))
              setApprovingTaskId(key + '__fadeout')
              await new Promise(r => setTimeout(r, 250))
              setApprovingTaskId(null)
            } else if (action === 'reject') {
              setDenyingTaskId(key)
              await new Promise(r => setTimeout(r, 300))
              setDenyingTaskId(key + '__fadeout')
              await new Promise(r => setTimeout(r, 250))
              setDenyingTaskId(null)
            }
          }
          runAnim()
          // 3. Fire API in background -- re-add card with error badge on failure
          fetch('/api/dashboard/task-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, taskId, taskText, agent: agentSlug, clientId: getClientId() }),
          })
            .then(res => {
              if (!res.ok) throw new Error('non-ok')
              pipeData?.refetch?.()
            })
            .catch(() => {
              // Error recovery: restore card with failure badge
              setOptimisticallyRemovedIds(prev => { const n = new Set(prev); n.delete(key); return n })
              setFailedTaskIds(prev => new Set([...prev, key]))
            })
        }
        const handleClarify = (taskText) => {
          const prefix = `Re: "${taskText}" -- `
          // Switch to chat tab (if not already) so the input is visible
          setPanelActiveTab('chat')
          // Pre-fill via React state (instant, no DOM hack needed)
          setPanelChatInput(prefix)
          // Also focus the input after a tick so it's rendered + scrolled into view
          requestAnimationFrame(() => {
            const input = document.querySelector('[data-panel-chat-input]')
            if (input) input.focus()
          })
        }
        return (
          <div style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderTop: '1px solid rgba(100,180,255,0.12)',
            display: 'flex', flexDirection: 'column', gap: 8,
            background: 'linear-gradient(180deg, rgba(8,16,32,0.55) 0%, transparent 100%)',
          }}>
            {(() => {
              const cardKey = t.taskId || t.text
              const isGlowing = approvingTaskId === cardKey
              const isFadingOut = approvingTaskId === cardKey + '__fadeout'
              const isDenyGlowing = denyingTaskId === cardKey
              const isDenyFadingOut = denyingTaskId === cardKey + '__fadeout'
              const hasFailed = failedTaskIds.has(cardKey)
              const cardClass = isGlowing ? 'task-approving' : isFadingOut ? 'task-approved' : isDenyGlowing ? 'task-denying' : isDenyFadingOut ? 'task-denied' : ''
              return (
            <motion.div
              key={cardKey}
              className={cardClass}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              style={{
                background: 'rgba(8,16,32,0.92)',
                border: hasFailed ? '1.5px solid rgba(239,68,68,0.65)' : '1.5px solid rgba(100,180,255,0.22)',
                borderLeft: hasFailed ? '3px solid rgba(239,68,68,0.85)' : '3px solid rgba(100,180,255,0.55)',
                borderRadius: 12,
                padding: '12px 16px',
                boxShadow: hasFailed
                  ? '0 -4px 32px rgba(239,68,68,0.10), 0 2px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(239,68,68,0.08)'
                  : '0 -4px 32px rgba(100,180,255,0.06), 0 2px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(100,180,255,0.08)',
                position: 'relative', overflow: 'hidden',
              }}>
              {/* Inner glow strip */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: hasFailed
                  ? 'linear-gradient(90deg, transparent 0%, rgba(239,68,68,0.35) 40%, rgba(239,68,68,0.35) 60%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, rgba(100,180,255,0.28) 40%, rgba(100,180,255,0.28) 60%, transparent 100%)',
                pointerEvents: 'none',
              }} />
              {/* Header row: dot + label + (error badge if failed) + (arrows + counter if multiple) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: hasFailed ? '#EF4444' : '#F59E0B',
                  boxShadow: hasFailed
                    ? '0 0 8px rgba(239,68,68,0.8), 0 0 16px rgba(239,68,68,0.4)'
                    : '0 0 8px rgba(245,158,11,0.8), 0 0 16px rgba(245,158,11,0.4)',
                  flexShrink: 0,
                  animation: 'statusPulse 2s ease-in-out infinite',
                }} />
                <span style={{
                  fontSize: 10, fontWeight: 700, color: hasFailed ? '#F87171' : '#8BA4C4',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                  flex: 1,
                }}>{hasFailed ? 'FAILED -- TAP TO RETRY' : 'AWAITING REVIEW'}</span>
                {total > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => setConfirmIndex(i => (i - 1 + total) % total)}
                      style={{
                        width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(100,180,255,0.18)',
                        cursor: 'pointer', background: 'rgba(100,180,255,0.08)',
                        color: '#8BA4C4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, lineHeight: 1, padding: 0,
                        transition: 'background 80ms ease, border-color 80ms ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(100,180,255,0.18)'; e.currentTarget.style.borderColor = 'rgba(100,180,255,0.35)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(100,180,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(100,180,255,0.18)' }}
                      aria-label="Previous task"
                    >&#8249;</button>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: '#4A6080',
                      fontFamily: "'JetBrains Mono', monospace",
                      minWidth: 28, textAlign: 'center',
                    }}>{safeIndex + 1}/{total}</span>
                    <button
                      onClick={() => setConfirmIndex(i => (i + 1) % total)}
                      style={{
                        width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(100,180,255,0.18)',
                        cursor: 'pointer', background: 'rgba(100,180,255,0.08)',
                        color: '#8BA4C4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, lineHeight: 1, padding: 0,
                        transition: 'background 80ms ease, border-color 80ms ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(100,180,255,0.18)'; e.currentTarget.style.borderColor = 'rgba(100,180,255,0.35)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(100,180,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(100,180,255,0.18)' }}
                      aria-label="Next task"
                    >&#8250;</button>
                  </div>
                )}
              </div>
              {/* Task text -- data readout panel */}
              <div style={{
                fontSize: 14, fontWeight: 500, color: '#EDF2FA',
                fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 1.5, marginBottom: 10,
                padding: '8px 12px',
                background: 'rgba(100,180,255,0.04)',
                borderRadius: 8,
                border: '1px solid rgba(100,180,255,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(100,180,255,0.06)',
                position: 'relative',
              }}>
                <span style={{
                  position: 'absolute', top: -8, left: 10,
                  fontSize: 9, fontWeight: 700, color: '#3B9EFF',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: 'rgba(8,16,32,0.92)', padding: '0 4px',
                }}>task</span>
                {t.text}
              </div>
              {/* Buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                {/* Approve */}
                <motion.button
                  onClick={() => callTaskAction(t.taskId, t.text, 'approve')}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  style={{
                    flex: 1, padding: '8px 10px',
                    background: 'rgba(22,163,74,0.18)',
                    border: '1.5px solid rgba(34,197,94,0.45)',
                    borderRadius: 9, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    color: '#4ADE80', fontSize: 12, fontWeight: 800,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    boxShadow: '0 0 12px rgba(34,197,94,0.15), inset 0 1px 0 rgba(34,197,94,0.12)',
                    letterSpacing: '0.04em',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Approve
                </motion.button>
                {/* Deny */}
                <motion.button
                  onClick={() => callTaskAction(t.taskId, t.text, 'reject')}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  style={{
                    flex: 1, padding: '8px 10px',
                    background: 'rgba(220,38,38,0.18)',
                    border: '1.5px solid rgba(239,68,68,0.40)',
                    borderRadius: 9, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    color: '#F87171', fontSize: 12, fontWeight: 800,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    boxShadow: '0 0 12px rgba(239,68,68,0.15), inset 0 1px 0 rgba(239,68,68,0.10)',
                    letterSpacing: '0.04em',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Deny
                </motion.button>
                {/* Clarify */}
                <motion.button
                  onClick={() => handleClarify(t.text)}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  style={{
                    flex: 1, padding: '8px 10px',
                    background: 'rgba(59,158,255,0.15)',
                    border: '1.5px solid rgba(59,158,255,0.35)',
                    borderRadius: 9, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    color: '#5BB8FF', fontSize: 12, fontWeight: 800,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    boxShadow: '0 0 12px rgba(59,158,255,0.12), inset 0 1px 0 rgba(100,180,255,0.10)',
                    letterSpacing: '0.04em',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Clarify
                </motion.button>
              </div>
            </motion.div>
              )
            })()}
          </div>
        )
      })()}

      {/* Chat input -- rendered as SIBLING of the tab content div, OUTSIDE overflow:hidden.
          This fixes the iPhone half-drawer clipping bug: at 52% snap the overflow:hidden
          content area clips the input. Moving it here makes it a bottom-anchored flex item
          of UnifiedPanel's outer flex column, always visible at any snap height.
          Only shown when activeTab === 'chat'. Desktop sidebar is unaffected (same behavior). */}
      {activeTab === 'chat' && (
        <div
          onTouchStart={isMobile ? () => onInputFocus?.() : undefined}
          style={{
          padding: '16px 20px',
          paddingBottom: isMobile ? 'max(16px, env(safe-area-inset-bottom, 16px))' : 16,
          borderTop: isNightMode ? '2px solid rgba(59,130,246,0.12)' : '2px solid rgba(59,130,246,0.18)',
          background: isNightMode
            ? 'linear-gradient(180deg, transparent 0%, rgba(15,27,45,0.5) 100%)'
            : 'transparent',
          flexShrink: 0,
        }}>
          {/* Reply-to banner */}
          {replyTo && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 8, padding: '6px 10px',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 8,
              fontSize: 12, color: '#8BA4C4',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              <CornerDownLeft size={12} color="#4A8FD4" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Replying to: {(replyTo.content || '').slice(0, 60)}{(replyTo.content || '').length > 60 ? '...' : ''}
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#4A6080', padding: 0, lineHeight: 1,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <X size={13} />
              </button>
            </div>
          )}
          {/* Selected skill badges -- shown above input when skills are queued */}
          {selectedPowerups && selectedPowerups.length > 0 && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 6,
              marginBottom: 8,
            }}>
              {selectedPowerups.map(skill => (
                <div
                  key={skill.id}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px 3px 6px',
                    background: `${skill.color}20`,
                    border: `1px solid ${skill.color}50`,
                    borderRadius: 20,
                    fontSize: 10, fontWeight: 700,
                    color: skill.color,
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: 9, opacity: 0.75 }}>/</span>
                  {skill.slash.replace('/', '')}
                  <button
                    type="button"
                    onClick={() => onRemovePowerup?.(skill.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: skill.color, padding: 0, lineHeight: 1,
                      display: 'flex', alignItems: 'center',
                      opacity: 0.7,
                      marginLeft: 2,
                    }}
                    aria-label={`Remove ${skill.name} skill`}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 0 : 10 }}>
          {/* Powerup menu: desktop shows full trigger button. Mobile: trigger is embedded inside the input on the left. */}
          <PowerupMenu
            isOpen={powerupOpen || false}
            onToggle={(v) => onPowerupToggle?.(v)}
            onActivate={(powerup) => onPowerupActivate?.(powerup)}
            selectedSkills={selectedPowerups || []}
            isMobile={isMobile}
            isNightMode={isNightMode}
            hideTrigger={isMobile}
          />
          <form onSubmit={(e) => {
            isUserTypingRef.current = false
            onSendMessage(e, replyTo?.id)
            setReplyTo(null)
          }} style={{ position: 'relative', flex: 1 }}>
            {/* @ autocomplete dropdown (floats above input) */}
            {atMenuOpen && filteredAtOptions && filteredAtOptions.length > 0 && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, right: 0,
                marginBottom: 6,
                background: isNightMode ? '#1A2744' : '#1E2A3A',
                border: isNightMode ? '2px solid rgba(59,130,246,0.3)' : '2px solid rgba(59,130,246,0.2)',
                borderRadius: 12,
                boxShadow: isNightMode
                  ? '0 -8px 32px rgba(0,0,0,0.5), 0 -2px 8px rgba(59,130,246,0.15)'
                  : '0 -8px 32px rgba(0,0,0,0.4), 0 -2px 8px rgba(59,130,246,0.15)',
                maxHeight: 240, overflowY: 'auto',
                zIndex: 100,
                padding: '6px 0',
              }}>
                <div style={{
                  padding: '4px 14px 8px',
                  fontSize: 11, fontWeight: 700, color: isNightMode ? '#475569' : '#6B8AB0',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  Switch to...
                </div>
                {filteredAtOptions.map((opt, i) => (
                  <div
                    key={opt.slug}
                    onMouseDown={(ev) => { ev.preventDefault(); onAtSelect?.(opt) }}
                    onMouseEnter={() => {}}
                    style={{
                      padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer',
                      background: i === atMenuIndex
                        ? (isNightMode ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.06)')
                        : 'transparent',
                      transition: 'background 100ms ease',
                    }}
                  >
                    {/* Color dot */}
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: opt.color,
                      boxShadow: `0 0 6px ${opt.color}40`,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 800,
                        color: isNightMode ? '#F1F5F9' : '#E8ECF0',
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}>
                        {opt.name}
                        {opt.type === 'project' && (
                          <span style={{
                            marginLeft: 8, fontSize: 11, fontWeight: 600,
                            color: '#F59E0B', background: 'rgba(245,158,11,0.1)',
                            border: '1px solid rgba(245,158,11,0.2)',
                            borderRadius: 4, padding: '1px 6px',
                          }}>
                            PROJECT
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 12, fontWeight: 600,
                        color: isNightMode ? '#64748B' : '#6B8AB0',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        marginTop: 1,
                      }}>
                        {opt.role}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: isNightMode ? '#475569' : '#4A6585',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      @{opt.slug}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {/* Mobile: powerup trigger icon on the LEFT inside the input */}
            {isMobile && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onPowerupToggle?.(!powerupOpen) }}
                aria-label={powerupOpen ? 'Close powerup menu' : 'Open powerup menu'}
                style={{
                  position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                  width: 32, height: 32, borderRadius: 8,
                  background: powerupOpen
                    ? 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)'
                    : 'transparent',
                  border: powerupOpen
                    ? '1.5px solid rgba(124,58,237,0.6)'
                    : '1.5px solid rgba(124,58,237,0.3)',
                  color: powerupOpen ? '#FFF' : 'rgba(124,58,237,0.7)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms ease',
                  zIndex: 2,
                  flexShrink: 0,
                }}>
                <Sparkles size={15} />
              </button>
            )}
            <input type="text" data-panel-chat-input value={chatInput || ''} onChange={e => {
                isUserTypingRef.current = true
                onChatInputChange?.(e.target.value)
                if (powerupOpen) onPowerupToggle?.(false)
              }}
              onKeyDown={e => {
                // @ autocomplete keyboard navigation
                if (atMenuOpen && filteredAtOptions && filteredAtOptions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    onAtKeyDown?.('down')
                    return
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    onAtKeyDown?.('up')
                    return
                  }
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault()
                    onAtSelect?.(filteredAtOptions[atMenuIndex] || filteredAtOptions[0])
                    return
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    onAtKeyDown?.('escape')
                    return
                  }
                }
                if (e.key === 'Enter') isUserTypingRef.current = false
              }}
              placeholder={`Talk to ${agent?.name || 'agent'}... (type @ to switch)`} disabled={false}
              style={{
                width: '100%',
                background: isNightMode ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)',
                border: isNightMode ? '2px solid rgba(59,130,246,0.2)' : '2px solid rgba(59,130,246,0.15)',
                borderRadius: 12,
                // Mobile: extra left padding to clear the powerup icon button
                padding: isMobile ? '14px 56px 14px 48px' : '14px 56px 14px 18px',
                fontSize: 18, fontWeight: 400,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: isNightMode ? '#F1F5F9' : '#E2E8F0',
                outline: 'none',
                transition: 'border-color 200ms ease, box-shadow 200ms ease',
                // iOS Safari: override parent userSelect:none so text can be selected/typed
                userSelect: 'text',
                WebkitUserSelect: 'text',
                // Allow normal tap behavior (focus + keyboard) even under parent touchAction:manipulation
                touchAction: 'manipulation',
                // Remove gray tap flash on iOS
                WebkitTapHighlightColor: 'transparent',
              }}
              onFocus={e => {
                isUserTypingRef.current = true
                e.target.style.borderColor = agentColor + '88'
                e.target.style.boxShadow = `0 0 0 3px ${agentColor}25, 0 0 16px ${agentColor}15`
                onInputFocus?.()
              }}
              onBlur={e => {
                setTimeout(() => { isUserTypingRef.current = false }, 300)
                e.target.style.borderColor = 'rgba(59,130,246,0.2)'
                e.target.style.boxShadow = 'none'
              }}
            />
            {/* Send button: always sends on both mobile and desktop */}
            <button
              type="submit"
              disabled={false}
              style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                width: 44, height: 44, borderRadius: 12,
                background: chatInput?.trim()
                  ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                  : 'rgba(59,130,246,0.12)',
                border: chatInput?.trim()
                  ? '2px solid rgba(59,130,246,0.6)'
                  : '2px solid rgba(59,130,246,0.2)',
                color: '#FFF',
                cursor: chatInput?.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: chatInput?.trim() ? '0 3px 12px rgba(59,130,246,0.3)' : 'none',
                transition: 'all 150ms ease',
              }}>
              {streaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
          </div>{/* end powerup + form flex row */}
        </div>
      )}
    </div>
  )
}

// ---- CAMERA CONTROLS (floating, right side) --------------------------------
function CameraControls({ cameraZoom, setCameraZoom, isOverview, setIsOverview, cameraTarget, setCameraTarget, onHomeRoom, panelVisible, isMobile, drawerOpen }) {
  const btnSize = isMobile ? 44 : 32
  const iconSize = isMobile ? 20 : 16
  return (
    <div style={{
      position: 'absolute', top: isMobile ? 60 : 16, right: panelVisible ? 396 : 16, zIndex: 32,
      transition: 'right 300ms ease, opacity 200ms ease',
      display: 'flex', flexDirection: 'column', gap: 4,
      background: 'rgba(10,15,30,0.85)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: 4,
      opacity: (isMobile && drawerOpen) ? 0 : 1,
      pointerEvents: (isMobile && drawerOpen) ? 'none' : 'auto',
    }}>
      {/* Zoom in (snap to next preset) */}
      <button onClick={() => setCameraZoom(z => {
          const idx = ZOOM_PRESETS.findIndex(p => Math.abs(p - z) < 0.3)
          const nextIdx = idx >= 0 && idx < ZOOM_PRESETS.length - 1 ? idx + 1 : ZOOM_PRESETS.length - 1
          return ZOOM_PRESETS[nextIdx]
        })}
        title="Zoom in (+)"
        style={{
          width: btnSize, height: btnSize, background: 'transparent', border: 'none',
          color: '#A0A0A0', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 150ms, background 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#FDF6EC'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#A0A0A0'; e.currentTarget.style.background = 'transparent' }}
      >
        <ZoomIn size={iconSize} />
      </button>

      {/* Zoom level label: ALL (overview) or ROOM (detail) -- hidden on mobile (icon-only) */}
      {!isMobile && (
        <span style={{ color: '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', padding: '2px 0' }}>
          {cameraZoom <= 0.9 ? 'ALL' : 'ROOM'}
        </span>
      )}

      {/* Zoom out (snap to previous preset) */}
      <button onClick={() => setCameraZoom(z => {
          const idx = ZOOM_PRESETS.findIndex(p => Math.abs(p - z) < 0.3)
          const nextIdx = idx > 0 ? idx - 1 : 0
          return ZOOM_PRESETS[nextIdx]
        })}
        title="Zoom out (-)"
        style={{
          width: btnSize, height: btnSize, background: 'transparent', border: 'none',
          color: '#A0A0A0', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 150ms, background 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#FDF6EC'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#A0A0A0'; e.currentTarget.style.background = 'transparent' }}
      >
        <ZoomOut size={iconSize} />
      </button>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '2px 4px' }} />

      {/* Home / go to main agent */}
      <button onClick={onHomeRoom}
        title={`Go to ${DEFAULT_AGENT} (H)`}
        style={{
          width: btnSize, height: btnSize, background: 'transparent', border: 'none',
          color: cameraTarget === DEFAULT_AGENT && !isOverview ? '#E85D26' : '#A0A0A0',
          cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 150ms, background 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <Home size={iconSize} />
      </button>

      {/* Overview toggle */}
      <button onClick={() => setIsOverview(o => !o)}
        title="Overview (O)"
        style={{
          width: btnSize, height: btnSize, background: isOverview ? 'rgba(232,93,38,0.15)' : 'transparent', border: 'none',
          color: isOverview ? '#E85D26' : '#A0A0A0',
          cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 150ms, background 150ms',
        }}
        onMouseEnter={e => { if (!isOverview) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { if (!isOverview) e.currentTarget.style.background = 'transparent' }}
      >
        <MapIcon size={iconSize} />
      </button>
    </div>
  )
}

// ---- MAIN GAME DASHBOARD ---------------------------------------------------
export default function GameDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('dash-auth') === '1')
  const [currentUser, setCurrentUser] = useState(null)
  const [hudOpen, setHudOpen] = useState(false)

  // Load Supabase user on mount + watch for auth state changes.
  // Derives client_id from user metadata (world field) for multi-tenant data isolation.
  // Also sets window.__cornerClientId for child components (e.g. TaskContextMenu) that
  // can't import getClientId directly without circular deps.
  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) {
        setCurrentUser(user)
        setClientIdFromUser(user)
      }
      window.__cornerClientId = getClientId()
    })
    const unsubscribe = onAuthStateChange((session) => {
      const user = session?.user || null
      setCurrentUser(user)
      setClientIdFromUser(user)
      window.__cornerClientId = getClientId()
    })
    return unsubscribe
  }, [])

  const handleSignOut = useCallback(async () => {
    await authSignOut()
    sessionStorage.removeItem('dash-auth')
    window.location.href = '/login'
  }, [])

  // Right Now tasks: wire to useDataPipe (real-time from task-status.jsonl + agent-notifications.md)
  // Live data from server -- no localStorage
  const pipeData = useDataPipe(parsePunchListSidebar)
  const rightNowTasks = pipeData?.rightNow || []
  const addToRightNow = useCallback((task) => {
    if (!task) return
    console.log('[addToRightNow] task:', task)
    // Local task-assign for local mode
    if (IS_LOCAL) {
      try {
        fetch('/api/local/task-assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: task.text,
            agent: task.agent || undefined,
            project: task.projectSection || undefined,
            blocked: task.agent === 'patrik',
          }),
        }).then(() => {
          // Refetch pipe data so Right Now updates immediately
          pipeData?.refetch?.()
        }).catch(() => {})
      } catch {}
    } else {
      // 3. Production: Supabase API calls
      const rawId = task.taskId || task.id
      const isSupabaseUuid = rawId && typeof rawId === 'string' && /^[0-9a-f-]{36}$/i.test(rawId)
      const taskParam = isSupabaseUuid
        ? `id=${encodeURIComponent(rawId)}`
        : `agent=${encodeURIComponent(task.agent || 'elon')}`
      console.log('[addToRightNow] PATCH param:', taskParam, 'rawId:', rawId, 'isUuid:', isSupabaseUuid)
      fetch(`/api/dashboard/agent-status?table=tasks&${taskParam}&status=active`, { method: 'PATCH' })
        .then(r => {
          console.log('[addToRightNow] task PATCH status:', r.status)
          pipeData?.refetch?.()
        })
        .catch(err => console.warn('[addToRightNow] task PATCH failed:', err))
      fetch(`/api/dashboard/agent-status?slug=${encodeURIComponent(task.agent || 'elon')}&status=active&current_task=${encodeURIComponent(task.text || '')}`, { method: 'PATCH' }).catch(() => {})
      fetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: task.agent || 'elon', text: `[PROMOTE] ${task.text}`, role: 'user', source: 'corner-dashboard-task', client_id: getClientId() }),
      }).catch(() => {})
    }
  }, [pipeData])
  const removeFromRightNow = useCallback((id) => {
    // For future: removal logic
  }, [])
  // HMR state recovery: restore selected room + tab from sessionStorage if HMR just reloaded
  const [selectedRoom, setSelectedRoom] = useState(() => {
    const saved = sessionStorage.getItem('corner-selected-room')
    return saved || DEFAULT_AGENT
  })
  const [hoveredRoom, setHoveredRoom] = useState(null)
  const [chatAgent, setChatAgent] = useState(() => {
    const saved = sessionStorage.getItem('corner-selected-room')
    return saved || DEFAULT_AGENT
  })
  // Selected project for chat scoping (null = no project, slug = project context)
  const [selectedProject, setSelectedProject] = useState(null)
  const [showMinimap, setShowMinimap] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showRelayDebug, setShowRelayDebug] = useState(false) // Toggle with Ctrl+Shift+D
  const [relayDebugData, setRelayDebugData] = useState(null)
  const [panelVisible, setPanelVisible] = useState(true) // Panel shown by default
  const [panelExtended, setPanelExtended] = useState(false) // Extended sidebar width
  // Mobile drawer state: null = hidden, 'half' = 50% screen, 'full' = 100% screen
  const [drawerSnap, setDrawerSnap] = useState(null)
  const drawerOpen = drawerSnap === 'half' || drawerSnap === 'full'
  const [panelActiveTab, setPanelActiveTab] = useState(() => sessionStorage.getItem('corner-panel-tab') || 'chat') // Sidebar active tab, HMR-safe

  // Panel chat state (for unified panel inline chat)
  const [panelChatInput, setPanelChatInput] = useState('')
  // Powerup menu state
  const [powerupOpen, setPowerupOpen] = useState(false)
  const powerupPendingRef = useRef(null) // slash command to auto-submit (legacy single-skill path)
  // Multi-select powerup skills: array of skill objects (from POWERUPS)
  const [selectedPowerups, setSelectedPowerups] = useState([])
  // @ routing: corner config + autocomplete state
  const [cornerConfig, setCornerConfig] = useState(null)
  const [atMenuOpen, setAtMenuOpen] = useState(false)
  const [atMenuFilter, setAtMenuFilter] = useState('')
  const [atMenuIndex, setAtMenuIndex] = useState(0)
  // Fetch corner config for @ routing
  useEffect(() => {
    if (!IS_LOCAL) {
      setCornerConfig({
        active_agents: ['elon', 'bobby', 'steve', 'steffen', 'alex', 'jacob', 'cleo'],
        agents: {
          elon: { role: 'Systems Lead' }, bobby: { role: 'Web Dev' }, steve: { role: 'AI Advisory Lead' },
          steffen: { role: 'Creative Director' }, alex: { role: 'Strategy' }, jacob: { role: 'Outreach' },
          cleo: { role: 'Content' }, tony: { role: 'Social Media' }, paige: { role: 'Client Tracking' },
        },
        projects: {},
      })
      return
    }
    fetch('/api/local/file?path=context/corner-config.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCornerConfig(data) })
      .catch(() => {})
  }, [])

  // Build @ autocomplete options from cornerConfig
  const atOptions = useMemo(() => {
    if (!cornerConfig) return []
    const opts = []
    const agentEntries = cornerConfig.agents || {}
    for (const [slug, info] of Object.entries(agentEntries)) {
      const matchAgent = AGENTS.find(a => a.slug === slug)
      opts.push({
        type: 'agent',
        slug,
        name: matchAgent?.name || slug.charAt(0).toUpperCase() + slug.slice(1),
        role: info.role || matchAgent?.role || '',
        color: matchAgent?.color || '#6B7280',
        aliases: info.aliases || [`@${slug}`],
      })
    }
    const projectEntries = cornerConfig.projects || {}
    for (const [key, info] of Object.entries(projectEntries)) {
      opts.push({
        type: 'project',
        slug: key,
        name: key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        role: `Team: ${(info.team || []).join(', ')}`,
        color: '#F59E0B',
        aliases: info.aliases || [`@${key}`],
        team: info.team || [],
        lead: info.lead || null,
      })
    }
    return opts
  }, [cornerConfig])

  // Filter @ options based on typed text after @
  const filteredAtOptions = useMemo(() => {
    if (!atMenuOpen || !atOptions.length) return []
    const q = atMenuFilter.toLowerCase()
    if (!q) return atOptions
    return atOptions.filter(opt =>
      opt.slug.includes(q) ||
      opt.name.toLowerCase().includes(q) ||
      opt.aliases.some(a => a.replace('@', '').includes(q))
    )
  }, [atMenuOpen, atMenuFilter, atOptions])

  // Handle @ input parsing
  const handleAtInputChange = useCallback((value) => {
    setPanelChatInput(value)
    const atMatch = value.match(/@(\S*)$/)
    if (atMatch) {
      setAtMenuOpen(true)
      setAtMenuFilter(atMatch[1])
      setAtMenuIndex(0)
    } else {
      setAtMenuOpen(false)
      setAtMenuFilter('')
    }
  }, [])

  // Handle @ autocomplete selection
  const handleAtSelect = useCallback((option) => {
    const targetSlug = option.type === 'project' ? (option.lead || option.slug) : option.slug
    const targetRoom = ROOM_MAP[targetSlug]
    if (targetRoom && targetRoom.agent !== null) {
      setSelectedRoom(targetSlug)
      setCameraTarget(targetSlug)
      setIsOverview(false)
      setPanelVisible(true)
      setPanelActiveTab('chat')
    }
    const cleaned = panelChatInput.replace(/@\S*$/, '').trim()
    setPanelChatInput(cleaned)
    setAtMenuOpen(false)
    setAtMenuFilter('')
  }, [panelChatInput])

  // Handle @ menu keyboard navigation
  const handleAtKeyDown = useCallback((direction) => {
    if (direction === 'down') {
      setAtMenuIndex(prev => Math.min(prev + 1, (filteredAtOptions?.length || 1) - 1))
    } else if (direction === 'up') {
      setAtMenuIndex(prev => Math.max(prev - 1, 0))
    } else if (direction === 'escape') {
      setAtMenuOpen(false)
      setAtMenuFilter('')
    }
  }, [filteredAtOptions])
  // Demo chat messages for production (shows a sample conversation)
  const demoChatMessages = useMemo(() => {
    if (IS_LOCAL) return {}
    const now = new Date()
    const mAgo = (m) => new Date(now - m * 60000).toISOString()
    return {
      _all: [
        { role: 'user', content: 'What\'s the status on the Garcia Construction homepage?', time: mAgo(45), source: 'via dashboard', targetAgent: 'bobby' },
        { role: 'assistant', content: 'Garcia Construction homepage is LIVE. Deployed 30 minutes ago with Steffen\'s new brand assets. All pages responsive, Lighthouse score 94. Elmo QA passed with zero critical issues. The permit tracker page is next -- building that now for Ridgeline Homes.', time: mAgo(44), source: 'bobby' },
        { role: 'user', content: 'Great work. How\'s the outreach pipeline looking?', time: mAgo(30), source: 'via dashboard', targetAgent: 'jacob' },
        { role: 'assistant', content: '15 personalized emails sent to Phoenix-area GCs today. Response rate tracking at 12% (industry avg is 3%). Booked a discovery call with Ridgeline Homes for Thursday 2pm. Alex\'s 30-day plan targets 45 total contractors this month.', time: mAgo(29), source: 'jacob' },
        { role: 'user', content: 'What did Elmo flag on the permit tracker?', time: mAgo(15), source: 'via dashboard', targetAgent: 'elmo' },
        { role: 'assistant', content: 'QA found 3 issues: (1) Layout shift on mobile when permit list exceeds 10 items, (2) Date picker overlaps the header at 768px, (3) Missing loading skeleton on first page load. All non-critical. Routed to Bobby. Fix ETA: within the hour.', time: mAgo(14), source: 'elmo' },
      ],
    }
  }, [])
  // Per-agent chat history: server files are source of truth
  // Always start empty. Server files load on agent switch.
  const [agentChats, setAgentChats] = useState({})
  // Convenience: current agent's messages
  const panelMessages = agentChats[selectedRoom] || { _all: [] }
  const setPanelMessages = useCallback((updater) => {
    setAgentChats(prev => {
      const agentKey = selectedRoom || '_default'
      const current = prev[agentKey] || { _all: [] }
      const updated = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, [agentKey]: updated }
    })
  }, [selectedRoom])
  const [panelStreaming, setPanelStreaming] = useState(false)
  const [panelChatLoading, setPanelChatLoading] = useState(false)

  // NO localStorage for chats. Server conversation files are the only source of truth.
  // Messages sent from dashboard write to server via relay-send.
  // Messages loaded on agent switch via /api/local/conversations.

  // Ref for CanvasOffice imperative handle (triggerCelebration)
  const canvasOfficeRef = useRef(null)

  // Safe sort for messages: handles missing/invalid timestamps without NaN crashes
  const safeTimeSort = useCallback((a, b) => {
    const ta = a?.time ? new Date(a.time).getTime() : 0
    const tb = b?.time ? new Date(b.time).getTime() : 0
    // If either is NaN (invalid date), push it to the end
    if (isNaN(ta) && isNaN(tb)) return 0
    if (isNaN(ta)) return 1
    if (isNaN(tb)) return -1
    return ta - tb
  }, [])

  // Safe setPanelMessages wrapper: validates messages before updating state
  // Prevents React crash from malformed relay data (missing fields, bad timestamps)
  const safePanelUpdate = useCallback((updater) => {
    try {
      setPanelMessages(prev => {
        try {
          const safePrev = prev && prev._all ? prev : { _all: [] }
          const result = updater(safePrev)
          // Validate _all array: every item must have role + content
          if (result?._all) {
            result._all = result._all.filter(m =>
              m && typeof m.role === 'string' && (typeof m.content === 'string' || m.streaming)
            )
          }
          return result
        } catch (err) {
          console.warn('[Corner] Panel message update failed:', err)
          return prev // Return unchanged state on error
        }
      })
    } catch (err) {
      console.warn('[Corner] setPanelMessages failed:', err)
    }
  }, [setPanelMessages])
  const panelRelayPollRef = useRef(null)
  // Background outbox polling state
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadAgents, setUnreadAgents] = useState({}) // { agentSlug: count }
  const bgOutboxPollRef = useRef(null)
  const lastBgOutboxCheckRef = useRef(null)
  // Per-agent last-seen timestamp for background unread polling
  const unreadLastSeenRef = useRef({}) // { agentSlug: isoTimestamp }

  // Cleanup all polls on unmount
  useEffect(() => {
    return () => {
      if (panelRelayPollRef.current) clearInterval(panelRelayPollRef.current)
      if (bgOutboxPollRef.current) clearInterval(bgOutboxPollRef.current)
    }
  }, [])

  // Background outbox polling DISABLED
  // Server conversation files are the source of truth.
  // Dashboard reloads from server on agent switch.
  // TODO: Re-enable with proper per-agent routing when conversation system is stable.
  /*
  // On localhost: 500ms for near-instant response display
  useEffect(() => {
    if (!IS_LOCAL) return

    // Initialize the last check timestamp if not already set by history load
    const initBgPoll = async () => {
      if (lastBgOutboxCheckRef.current) return // already set by history load
      try {
        const res = await fetch('/api/local/relay-outbox')
        if (res.ok) {
          const data = await res.json()
          const msgs = (data.messages || []).filter(m => m.source !== 'corner-dashboard' && m.source !== 'corner-websocket')
          if (msgs.length > 0) {
            lastBgOutboxCheckRef.current = msgs[msgs.length - 1].timestamp
          } else {
            lastBgOutboxCheckRef.current = new Date().toISOString()
          }
        }
      } catch {}
    }
    initBgPoll()

    bgOutboxPollRef.current = setInterval(async () => {
      if (!lastBgOutboxCheckRef.current) return
      // Skip when panelRelayPoll is handling a send response (prevents race condition
      // where both polls pick up the same message and cause duplicate/misordered entries)
      if (panelRelayPollRef.current) return
      try {
        const since = encodeURIComponent(lastBgOutboxCheckRef.current)
        const res = await fetch(`/api/local/relay-outbox?since=${since}`)
        if (!res.ok) return
        const data = await res.json()
        const newMsgs = (data.messages || []).filter(m =>
          m.message && m.source !== 'corner-dashboard' && m.source !== 'corner-websocket'
        )
        if (newMsgs.length > 0) {
          const latest = newMsgs[newMsgs.length - 1]
          lastBgOutboxCheckRef.current = latest.timestamp

          // Route each response to the CORRECT agent's chat, not just the currently selected one
          setAgentChats(prev => {
            const updated = { ...prev }
            for (const msg of newMsgs) {
              if (!msg.message) continue
              const cleaned = sanitizeRelayMessage(msg.message)
              if (!cleaned) continue
              const agentSlug = extractAgentFromMessage(msg)
              if (!agentSlug) continue // Skip messages without a clear agent -- don't pollute any chat
              const agentKey = agentSlug
              const current = updated[agentKey] || { _all: [] }
              const allMsgs = [...(current._all || [])]
              // Dedup
              if (msg.id && allMsgs.some(m => m.id === msg.id)) continue
              if (!msg.id && allMsgs.some(m => m.content === msg.message && m.role === 'assistant')) continue
              allMsgs.push({
                role: 'assistant',
                content: cleaned,
                time: msg.timestamp || new Date().toISOString(),
                source: agentSlug || 'system',
                id: msg.id || `bg-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
                ambient: msg.ambient === true || msg.ambient === 'true',
              })
              allMsgs.sort(safeTimeSort)
              updated[agentKey] = { ...current, _all: deduplicateMessages(allMsgs) }
            }
            return updated
          })

          // Count unread if panel is closed
          if (!panelVisible) {
            setUnreadCount(prev => prev + newMsgs.length)
          }

          // Clear streaming state
          setPanelStreaming(false)
        }
      } catch {}
    }, 500) // Local: 500ms for near-instant relay response display

    return () => {
      if (bgOutboxPollRef.current) clearInterval(bgOutboxPollRef.current)
    }
  }, [panelVisible])
  */

  // Background unread poller: production only, polls all visible agents every 5s
  // Detects new assistant messages for agents that are NOT currently selected
  // and increments their unread count to trigger the room hex notification dot.
  const selectedRoomRef = useRef(selectedRoom)
  useEffect(() => { selectedRoomRef.current = selectedRoom }, [selectedRoom])

  useEffect(() => {
    if (IS_LOCAL) return // Local uses file poll which already populates agentChats

    const POLL_AGENTS = AGENTS.map(a => a.slug)
    // Seed last-seen timestamps at "now" so only genuinely new messages trigger unread
    const seedTs = new Date().toISOString()
    POLL_AGENTS.forEach(slug => {
      if (!unreadLastSeenRef.current[slug]) {
        unreadLastSeenRef.current[slug] = seedTs
      }
    })

    const bgPoll = setInterval(async () => {
      const active = selectedRoomRef.current
      // Only check agents that are NOT the currently active room
      const toCheck = POLL_AGENTS.filter(slug => slug !== active)
      if (!toCheck.length) return

      for (const slug of toCheck) {
        const since = unreadLastSeenRef.current[slug] || seedTs
        try {
          const res = await fetch(
            `/api/dashboard/supabase-messages?agent=${encodeURIComponent(slug)}&limit=5&client=${encodeURIComponent(getClientId())}`
          )
          if (!res.ok) continue
          const data = await res.json()
          const msgs = (data?.messages || []).filter(
            m => m.role === 'assistant' && m.timestamp > since
          )
          if (msgs.length > 0) {
            // Advance watermark to the latest message we've seen
            unreadLastSeenRef.current[slug] = msgs[msgs.length - 1].timestamp
            setUnreadAgents(prev => ({
              ...prev,
              [slug]: (prev[slug] || 0) + msgs.length,
            }))
          }
        } catch {
          // Fail silently -- this is a best-effort background check
        }
      }
    }, 5000) // 5s cadence: responsive without hammering Supabase

    return () => clearInterval(bgPoll)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear unread when panel is opened
  useEffect(() => {
    if (panelVisible) {
      setUnreadCount(0)
    }
  }, [panelVisible])

  // Track unread messages per agent: increment when assistant messages arrive for non-active agents
  // Used by CanvasOffice to show notification dots on room hexes
  const prevAgentChatCountsRef = useRef({})
  useEffect(() => {
    const newUnread = {}
    for (const [agentSlug, chat] of Object.entries(agentChats)) {
      const msgs = chat?._all || []
      const assistantMsgs = msgs.filter(m => m.role === 'assistant' && !m.streaming)
      const prevCount = prevAgentChatCountsRef.current[agentSlug] || 0
      const currCount = assistantMsgs.length
      if (currCount > prevCount && agentSlug !== selectedRoom) {
        // New messages arrived for a background agent
        newUnread[agentSlug] = (currCount - prevCount)
      }
      prevAgentChatCountsRef.current[agentSlug] = currCount
    }
    if (Object.keys(newUnread).length > 0) {
      setUnreadAgents(prev => {
        const updated = { ...prev }
        for (const [slug, count] of Object.entries(newUnread)) {
          updated[slug] = (updated[slug] || 0) + count
        }
        return updated
      })
    }
  }, [agentChats, selectedRoom])

  // Clear unread for the active agent when user switches to it
  useEffect(() => {
    if (selectedRoom) {
      setUnreadAgents(prev => {
        if (!prev[selectedRoom]) return prev
        const updated = { ...prev }
        delete updated[selectedRoom]
        return updated
      })
      prevAgentChatCountsRef.current[selectedRoom] = (agentChats[selectedRoom]?._all || []).filter(m => m.role === 'assistant' && !m.streaming).length
      // Advance watermark so background poller doesn't re-trigger for already-seen messages
      unreadLastSeenRef.current[selectedRoom] = new Date().toISOString()
    }
  }, [selectedRoom]) // eslint-disable-line react-hooks/exhaustive-deps

  // Callback: clear unread for a specific agent slug (used by chat input focus + room click)
  const clearUnreadForRoom = useCallback((slug) => {
    if (!slug) return
    setUnreadAgents(prev => {
      if (!prev[slug]) return prev
      const updated = { ...prev }
      delete updated[slug]
      return updated
    })
    unreadLastSeenRef.current[slug] = new Date().toISOString()
  }, [])

  // DONE(bobby2): RELAY MESSAGE CRASH FIX -- safePanelUpdate() wraps all setPanelMessages calls with try/catch + field validation. safeTimeSort() handles NaN timestamps. All relay message pushes validate .message exists and default .time/.id. Malformed relay data can no longer crash React render cycle.
  // DONE(bobby): HMR STATE PRESERVATION -- Key dashboard state (selectedRoom, panelActiveTab) persists to sessionStorage on change, restores on HMR reload. Auth already in sessionStorage. Mode already in localStorage. Chat messages reload from relay history on reconnect. Bobby commits no longer reset which agent Patrik was talking to.

  // Background INBOX polling DISABLED (Wave 6: single source of truth)
  // Conversations API is now the ONLY read source for chat messages.
  // relay-inbox is write-only (dashboard sends go there, then get written to conversation files).
  // This eliminates the dual-source race condition that caused message flicker:
  // inbox poll (500ms) would add messages, then conversations poll (3s) would replace them.

  // Load FULL relay conversation history (all sources) when panel opens
  // The relay is a unified conversation channel. Show everything so terminal,
  // Telegram, and dashboard messages all appear in the chat.
  // DONE(bobby): TERMINAL MESSAGES VERIFIED -- relay-hook.sh writes every UserPromptSubmit to relay-inbox.jsonl with source:"terminal" (lines 75-93). Vite middleware reads both App Support + repo inbox paths. Background inbox poll (500ms) picks up terminal messages with "via terminal" label. Code path confirmed correct. Terminal messages appear in dashboard chat alongside Telegram and dashboard messages.
  // TODO(bobby): ONE CONVERSATION STREAM (COUNCIL MODEL) -- Relay is THE source of truth. ALL messages from Patrik (terminal, dashboard, telegram) + ALL agent responses = ONE chronological list. No separation by source or device. Two sides: Patrik (right) and agents (left), interleaved by timestamp. COUNCIL: all agents share one stream. User switches driving agent by saying "talk to [agent]" or clicking one. That agent steps forward in the SAME thread with full context. No separate per-agent chats. Everyone listens, only driving agent speaks. Add search over unified stream. Ref: Patrik directives lines 144, 186, 190. [SURVIVES: Relay/data architecture. Engine-independent.]
  // DONE(bobby): AMBIENT COUNCIL CHAT RENDERING -- Messages with ambient:true flag render as compact muted inline status updates (smaller font, italic, no avatar expansion, 20px mini avatar). Ambient flag carried through history loader and background outbox poll. REMAINING: agents need to actually WRITE ambient messages to relay-outbox with ambient:true flag. That's a relay-side change, not dashboard. Ref: Patrik feedback Pass 21.
  // TODO(bobby): TYPING INDICATOR -- Show "[Agent] is typing..." with agent avatar + countdown ring while an agent is composing a response. iMessage dots energy. Shows WHICH agent (Bobby = purple dots, Elon = green). Write a "typing" signal to relay when agent starts generating. Dashboard picks up and shows animated dots. Council feels ALIVE. Ref: Patrik feedback lines 221-222. [SURVIVES: Chat UI animation. Engine-independent.]
  // DONE(bobby2): CHAT SCROLL STAY AT BOTTOM (SIDEBAR) -- Ported ChatDashboard fix (isUserTypingRef, userJustSentRef, prevMessageCountRef) to sidebar chat. No more scroll yanking while user types. Ref: Patrik feedback line 248, 261.
  // DONE(bobby2): JANKY CHAT CLEANUP -- (1) Watchdog system prompt stripped by expanded sanitizeRelayMessage (7 new regex patterns). Ghost messages filtered by watchdog-responded status. (2) Typing indicator separated into standalone block with animated dots. (3) Source labels muted to 9px/#78716C/25% opacity. Deduplication added for relay echo messages. Ref: Patrik feedback line 249. REMAINING: see TODO(steve) about overly aggressive XML regex that may eat user content.
  // DONE(bobby2): CHAT BUBBLE CONTRAST FIX -- Daytime bubbles now solid warm gray (#EDF2F7) with dark text (#1E293B). Agent bubbles get colored left border (3px agent color). Patrik avatar now orange (#F59E0B) with white P per dream-hud-v1.png. Night mode unchanged (dark translucent). All text readable in both modes.
  // Initial relay history load DISABLED (Wave 6: single source of truth)
  // The conversations API (selectedRoom useEffect below) is now the ONLY source for chat data.
  // relay-inbox + relay-outbox are no longer read for display. They remain write targets only.
  // This eliminates the dual-source race: relay files could return different message sets than
  // conversation files, causing appear/disappear flicker every 3 seconds.

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState(null) // { type, data, position: {x, y} }

  // Task right-click context menu state (separate from room/agent context menu)
  const [taskContextMenu, setTaskContextMenu] = useState(null) // { position: {x,y}, task }

  // Message context menu state
  const [msgContextMenu, setMsgContextMenu] = useState(null) // { position: {x,y}, msg }
  // Send-to smart picker state
  const [sendToMenu, setSendToMenu] = useState(null) // { position: {x,y}, msg }
  // Pending reply: set by context menu "Reply" action, consumed by UnifiedPanel
  const [pendingReplyMsg, setPendingReplyMsg] = useState(null) // { id, content } | null
  // Pending pill expand: set by "Add Task" on project context menu, consumed by GameHUD
  const [expandPillSection, setExpandPillSection] = useState(null)
  // Hidden pills: in-memory only (no persistence)
  const [hiddenPills, setHiddenPills] = useState([])

  // Handle message right-click / long-press
  const handleMessageContextMenu = useCallback((e, msg) => {
    e.preventDefault?.()
    const x = e._msgLongPress ? window.innerWidth / 2 - 110 : e.clientX
    const y = e._msgLongPress ? window.innerHeight / 2 - 60 : e.clientY
    setMsgContextMenu({ position: { x, y }, msg })
  }, [])

  // Recent agents tracking removed (no localStorage)

  // Checkbox state for task context menu actions (in-memory only)
  const [sidebarCheckedTasks, setSidebarCheckedTasks] = useState({})

  // Handle task right-click on sidebar items
  const handleSidebarTaskContextMenu = useCallback((e, task) => {
    e.preventDefault()
    setTaskContextMenu({ position: { x: e.clientX, y: e.clientY }, task })
  }, [])

  // Task context menu action handler
  const handleSidebarContextAction = useCallback((action, task, payload) => {
    handleTaskContextAction(action, task, payload, setSidebarCheckedTasks)
    // FIX 2: When a task is marked done, inject a confirmation message into chat
    if (action === 'toggle' && !task.done) {
      const confirmMsg = {
        role: 'assistant',
        content: `Task marked done: "${task.text}"\n\nConfirmed done or needs more work?`,
        time: new Date().toISOString(),
        source: 'corner-task-confirm',
        id: `confirm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        isTaskConfirm: true,
        taskText: task.text,
      }
      setAgentChats(prev => {
        const agent = task.agent || selectedRoom || 'elon'
        const current = prev[agent] || { _all: [] }
        return { ...prev, [agent]: { _all: [...(current._all || []), confirmMsg] } }
      })
    }
  }, [selectedRoom])

  // C3: MODE STATE
  const [currentMode, setCurrentMode] = useState(() => {
    // Check URL only, default to 'game'
    const path = window.location.pathname
    if (path.includes('/checklist')) return 'checklist'
    if (path.includes('/megaboard')) return 'megaboard'
    return 'game'
  })

  // VIEW MODE: 'game' = isometric canvas, 'board' = Trello/kanban columns
  const [viewMode, setViewMode] = useState('game')
  const handleViewModeSwitch = useCallback((mode) => {
    setViewMode(mode)
  }, [])

  // CAMERA STATE: start in overview to see the full building
  const [cameraTarget, setCameraTarget] = useState(DEFAULT_AGENT)
  const [cameraZoom, setCameraZoom] = useState(0.7)
  const [isOverview, setIsOverview] = useState(true)

  // Time-based theme: 7pm-7am = dark mode, 7am-7pm = day mode. Arizona time (UTC-7, no DST).
  const getIsNight = () => {
    const azHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix', hour: 'numeric', hour12: false }))
    return azHour >= 19 || azHour < 7
  }
  const [isNightMode, setIsNightMode] = useState(getIsNight)
  useEffect(() => {
    const check = () => setIsNightMode(getIsNight())
    const timer = setInterval(check, 60000)
    return () => clearInterval(timer)
  }, [])

  // HMR state persistence: save key state so hot reloads from Bobby commits don't reset the UI
  useEffect(() => {
    sessionStorage.setItem('corner-selected-room', selectedRoom || '')
  }, [selectedRoom])

  // On agent switch: clear stale data immediately, show loading, then fetch fresh conversation.
  // Production: reads from Supabase messages table (fast, no GitHub rate limits).
  // Local: reads from filesystem via /api/local/conversations.
  useEffect(() => {
    setPanelStreaming(false)
    if (panelRelayPollRef.current) {
      clearInterval(panelRelayPollRef.current)
      panelRelayPollRef.current = null
    }
    if (!selectedRoom) return

    setPanelChatLoading(true)
    setAgentChats(prev => ({ ...prev, [selectedRoom]: { _all: [] } }))

    const room = selectedRoom // capture for async safety

    if (!IS_LOCAL) {
      // PRODUCTION: load chat history via Vercel proxy (bypasses Supabase JS client issues)
      fetch(`/api/dashboard/supabase-messages?agent=${encodeURIComponent(room)}&limit=100&client=${encodeURIComponent(getClientId())}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          const msgs = (data?.messages || [])
            .filter(m => !m.agent || m.agent === room) // guard: only show messages belonging to this agent
            .map(m => ({
              id: m.id, role: m.role || 'assistant', content: m.text || '',
              time: m.timestamp || '', source: m.source || 'supabase',
            })).filter(m => m.content && !m.content.startsWith('[SESSION LOG]'))
          console.log(`[Corner] Proxy: loaded ${msgs.length} msgs for ${room}`)
          setAgentChats(prev => ({ ...prev, [room]: { _all: msgs } }))
          setPanelChatLoading(false)
        })
        .catch(() => loadFromGitHub(room))
    } else {
      // LOCAL or no Supabase client: filesystem API
      loadFromGitHub(room)
    }

    function loadFromGitHub(slug) {
      const roomMeta = ROOM_LOOKUP[slug]
      const isProject = roomMeta?.type === 'project' || roomMeta?.type === 'special' || slug === 'aom'
      const convTarget = slug === 'aom' ? 'aom-internal' : slug
      const convType = isProject ? 'project' : 'agent'
      fetch(`${CONV_API_BASE}?target=${convTarget}&type=${convType}&limit=50`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          const msgs = (data?.messages || []).map(m => ({
            role: m.role || (m.sender === 'patrik' ? 'user' : 'assistant'),
            content: m.text || '',
            time: m.timestamp || '',
            source: m.source || 'file',
            id: m.id || `file-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          })).filter(m => m.content && !m.content.startsWith('[SESSION LOG]'))
          console.log(`[Corner] GitHub: loaded ${msgs.length} msgs for ${slug}`)
          setAgentChats(prev => ({ ...prev, [slug]: { _all: msgs } }))
          setPanelChatLoading(false)
        })
        .catch(() => {
          setAgentChats(prev => ({ ...prev, [slug]: { _all: [] } }))
          setPanelChatLoading(false)
        })
    }
  }, [selectedRoom])

  // Chat message updates: Supabase Realtime on production, polling on localhost.
  //
  // PRODUCTION path (Supabase Realtime):
  //   Subscribe to INSERT events on messages table filtered by agent slug.
  //   New assistant messages push in instantly -- no polling delay, no GitHub rate limits.
  //
  // LOCAL path (file poll):
  //   Keep existing 1.5s poll of /api/local/conversations (file-backed, fast).
  useEffect(() => {
    if (!selectedRoom) return

    // --- PRODUCTION: Poll via Vercel proxy (bypasses Supabase JS client WebSocket issues) ---
    if (!IS_LOCAL) {
      const room = selectedRoom
      let lastSeenTs = new Date().toISOString()

      const poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/dashboard/supabase-messages?agent=${encodeURIComponent(room)}&limit=20&client=${encodeURIComponent(getClientId())}`)
          if (!res.ok) return
          const data = await res.json()
          const newMsgs = (data?.messages || [])
            .filter(m => m.timestamp > lastSeenTs && (!m.agent || m.agent === room)) // all roles: assistant + user from terminal/telegram
          if (newMsgs.length) {
            lastSeenTs = newMsgs[newMsgs.length - 1].timestamp
            setAgentChats(prev => {
              const current = prev[room]?._all || []
              let updated = [...current]
              let changed = false
              for (const row of newMsgs) {
                const msg = { id: row.id, role: row.role || 'assistant', content: row.text || '', time: row.timestamp, source: row.source || 'supabase' }
                if (!updated.some(m => m.id === msg.id)) {
                  if (row.role !== 'user') updated = updated.filter(m => !m.streaming)
                  updated.push(msg)
                  changed = true
                }
              }
              if (!changed) return prev
              // Sort by timestamp so terminal/telegram user messages appear in correct order
              updated.sort(safeTimeSort)
              return { ...prev, [room]: { _all: updated } }
            })
            if (newMsgs.some(m => m.role === 'assistant')) setPanelStreaming(false)
          }
        } catch {}
      }, 3000)

      return () => clearInterval(poll)
    }

    // --- LOCAL: file-backed poll ---
    const pollRoomMeta = ROOM_LOOKUP[selectedRoom]
    const isProj = pollRoomMeta?.type === 'project' || pollRoomMeta?.type === 'special' || selectedRoom === 'aom'
    const pollTarget = selectedRoom === 'aom' ? 'aom-internal' : selectedRoom
    const pollType = isProj ? 'project' : 'agent'
    const poll = setInterval(() => {
      fetch(`${CONV_API_BASE}?target=${pollTarget}&type=${pollType}&limit=50`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!data?.messages?.length) return
          setAgentChats(prev => {
            const currentMsgs = (prev[selectedRoom]?._all || []).filter(m => !m.streaming)
            const serverMsgs = data.messages.map(m => ({
              role: m.role || (m.sender === 'patrik' ? 'user' : 'assistant'),
              content: m.text || '',
              time: m.timestamp || '',
              source: m.source || 'file',
              id: m.id || `file-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
            })).filter(m => m.content && !m.content.startsWith('[SESSION LOG]'))

            // MERGE instead of replace: keep local-only optimistic messages
            const serverIds = new Set(serverMsgs.map(m => m.id))
            const serverContentKeys = new Set(serverMsgs.map(m => `${m.role}:${m.content?.slice(0, 80)}`))
            const localOnly = currentMsgs.filter(m => {
              if (m.id && serverIds.has(m.id)) return false
              const contentKey = `${m.role}:${m.content?.slice(0, 80)}`
              if (serverContentKeys.has(contentKey)) return false
              const msgTime = m.time ? new Date(m.time).getTime() : 0
              return Date.now() - msgTime < 10000
            })

            const merged = [...serverMsgs, ...localOnly].sort(safeTimeSort)

            if (serverMsgs.length > currentMsgs.filter(m => !m.id?.startsWith('dash-') || serverIds.has(m.id)).length) {
              setPanelStreaming(false)
            }
            if (merged.length === currentMsgs.length && serverMsgs.length === currentMsgs.length) return prev
            return { ...prev, [selectedRoom]: { _all: merged } }
          })
        })
        .catch(() => {})
    }, 1500)
    return () => clearInterval(poll)
  }, [selectedRoom, safeTimeSort])

  useEffect(() => {
    sessionStorage.setItem('corner-panel-tab', panelActiveTab || 'chat')
  }, [panelActiveTab])

  // C3 Step 8: Agent death/error animation state
  // { [agentSlug]: { state: 'away'|'leaving'|'returning', label: 'Away'|'Reconnecting...', x, y } }
  const [agentAnimations, setAgentAnimations] = useState({})

  // C3: Streaming state tracking (for speaking sprite)
  const [streamingAgent, setStreamingAgent] = useState(null)

  // Chat bar ref for HUD inline chat integration
  const chatBarRef = useRef(null)

  const { data, error, loading } = useDashboardData()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet() // iPad/tablet (768-1024px): compress sidebar profile header
  const disableThreeJs = useIsMobileOrPWA() // Kill Three.js on mobile/PWA for performance

  // C3: WebSocket connection
  const wsHook = useWebSocket({
    enabled: true,
    onEvent: useCallback((event) => {
      // Handle WebSocket events for notifications
      if (event.type === 'task_complete' || event.type === 'handoff' || event.type === 'error_recovery') {
        const agentSlug = event.agent || event.from_agent
        const agent = AGENTS.find(a => a.slug === agentSlug)
        setNotifications(prev => [{
          id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: event.type,
          agentSlug,
          agentName: agent?.name || agentSlug,
          agentColor: agent?.color,
          message: event.message || event.task || `${event.type.replace(/_/g, ' ')}`,
          time: 'just now',
          timestamp: event.timestamp,
        }, ...prev].slice(0, 10))
      }

      // C3 Step 8: Agent death/error animations
      if (event.type === 'error_recovery') {
        const agentSlug = event.agent
        if (event.status === 'disconnected') {
          // Agent leaves: animate walk-out, then set to "away"
          setAgentAnimations(prev => ({
            ...prev,
            [agentSlug]: { state: 'away', label: 'Away' },
          }))
        } else if (event.status === 'reconnecting') {
          setAgentAnimations(prev => ({
            ...prev,
            [agentSlug]: { ...(prev[agentSlug] || {}), state: 'away', label: 'Reconnecting...' },
          }))
        } else if (event.status === 'reconnected') {
          // Agent returns: clear away state after a short delay for walk-back feel
          setTimeout(() => {
            setAgentAnimations(prev => {
              const next = { ...prev }
              delete next[agentSlug]
              return next
            })
          }, 1800)
        }
      }

      // Track streaming agent for speaking sprite
      if (event.type === 'agent_state_change') {
        if (event.state === 'speaking') setStreamingAgent(event.agent)
        else if (event.state === 'idle' || event.state === 'done') {
          if (streamingAgent === event.agent) setStreamingAgent(null)
        }
      }
    }, [streamingAgent]),
  })

  // Preload all idle sprites for instant display
  usePreloadSprites()

  // Mode switching handler: modes live in sidebar tabs on desktop.
  // On mobile: modes switch full-screen views via currentMode state.
  // Game is always the main viewport. Keys 1/2/3 switch the sidebar tab (desktop).
  const handleModeSwitch = useCallback((mode) => {
    setCurrentMode(mode)
    if (mode === 'game') {
      // Key 1: switch sidebar to chat tab
      setPanelActiveTab('chat')
    } else if (mode === 'checklist') {
      // Key 2: switch sidebar to checklist tab, open + extend panel
      setPanelActiveTab('checklist')
      setPanelVisible(true)
      setPanelExtended(true)
    } else if (mode === 'megaboard') {
      // Key 3: switch sidebar to megaboard tab, open + extend panel
      setPanelActiveTab('megaboard')
      setPanelVisible(true)
      setPanelExtended(true)
    }
    // Close HUD drawer
    setHudOpen(false)
  }, [])

  // URL-based agent selection
  useEffect(() => {
    const path = window.location.pathname
    const agentMatch = path.match(/\/dashboard\/agent\/(.+)/)
    if (agentMatch) {
      const slug = agentMatch[1]
      setSelectedRoom(slug)
      setChatAgent(slug)
      setCameraTarget(slug)
    }
    const checklistMatch = path.match(/\/dashboard\/checklist\/(.+)/)
    if (checklistMatch) {
      setPanelActiveTab('checklist')
      setPanelVisible(true)
      setPanelExtended(true)
    }
    const megaMatch = path.match(/\/dashboard\/megaboard\/agent\/(.+)/)
    if (megaMatch) {
      setPanelActiveTab('megaboard')
      setPanelVisible(true)
      setPanelExtended(true)
    }
  }, [])

  // Update URL based on mode and selected agent
  useEffect(() => {
    if (currentMode === 'game') {
      if (chatAgent) {
        window.history.replaceState(null, '', `/dashboard/agent/${chatAgent}`)
      } else {
        window.history.replaceState(null, '', '/dashboard')
      }
    }
  }, [chatAgent, currentMode])

  // Agent status lookup
  const agentStatus = useMemo(() => {
    if (!data?.agents) return {}
    const map = {}
    for (const a of data.agents) map[a.slug] = a
    return map
  }, [data])

  // When overview mode changes, adjust zoom (Steffen spec: 0.7x overview, 1.6x neighborhood)
  useEffect(() => {
    if (isOverview) {
      setCameraZoom(0.7)
    } else {
      setCameraZoom(1.6)
    }
  }, [isOverview])

  const handleRoomClick = (roomId) => {
    // Use ROOM_LOOKUP which includes both agent rooms and project rooms
    const room = ROOM_LOOKUP[roomId]
    if (!room) return
    // Skip communal rooms (main-hall, cafe, growth-zone) which have agent === null
    // but allow project rooms (type === 'project') through
    if (room.agent === null && room.type !== 'project') return

    // Always move camera to clicked room
    setCameraTarget(roomId)
    setIsOverview(false)

    // Always switch chat agent and show the panel
    setChatAgent(roomId)
    setPanelVisible(true)

    if (roomId === selectedRoom) {
      // Already selected: zoom to Level 3 (detail)
      setCameraZoom(ZOOM_MAX)
      // On mobile, promote drawer: null -> half, half -> full
      if (isMobile && drawerSnap === 'half') {
        setDrawerSnap('full')
      } else if (!drawerSnap) {
        setDrawerSnap('half')
      }
    } else {
      // First click: zoom to Level 2 (neighborhood)
      setCameraZoom(1.6)
      setSelectedRoom(roomId)
      // On mobile, open the bottom sheet drawer to half position
      if (isMobile) {
        setDrawerSnap('half')
      }
    }
  }

  const handleChat = (roomId) => {
    setChatAgent(roomId)
    setSelectedRoom(roomId)
    setCameraTarget(roomId)
    setIsOverview(false)
    setPanelVisible(true)
    // On mobile, open drawer to half position
    if (isMobile) {
      setDrawerSnap('half')
    }
  }

  const handleHomeRoom = () => {
    setCameraTarget(DEFAULT_AGENT)
    setIsOverview(false)
    setCameraZoom(1.6)
    setSelectedRoom(DEFAULT_AGENT)
    setPanelVisible(true)
  }

  // ---- SHARED SEND MESSAGE HANDLER (used by both desktop sidebar and mobile drawer) ----
  const handlePanelSendMessage = useCallback(async (e, replyToId) => {
    e?.preventDefault()
    setAtMenuOpen(false)
    setAtMenuFilter('')
    let text = panelChatInput?.trim()
    if (!text || panelStreaming) return
    // @ prefix routing: "@bobby fix the nav" switches to Bobby, sends "fix the nav"
    const atPrefixMatch = text.match(/^@(\S+)\s*(.*)$/)
    if (atPrefixMatch) {
      const atTarget = atPrefixMatch[1].toLowerCase()
      const remainingText = atPrefixMatch[2]?.trim() || ''
      const matchedOption = atOptions.find(opt =>
        opt.slug === atTarget ||
        opt.name.toLowerCase() === atTarget ||
        opt.aliases.some(a => a.replace('@', '') === atTarget)
      )
      if (matchedOption) {
        const targetSlug = matchedOption.type === 'project' ? (matchedOption.lead || matchedOption.slug) : matchedOption.slug
        const targetRoom = ROOM_LOOKUP[targetSlug]
        if (targetRoom && targetSlug !== selectedRoom) {
          setSelectedRoom(targetSlug)
          setCameraTarget(targetSlug)
          setIsOverview(false)
          setPanelActiveTab('chat')
        }
        text = remainingText
        if (!text) {
          setPanelChatInput('')
          return
        }
      }
    }
    setPanelChatInput('')
    // Append selected powerup skills to message text, then clear selection
    if (selectedPowerups.length > 0) {
      const skillsList = selectedPowerups.map(s => s.slash).join(', ')
      text = `${text}\n\nSkills: ${skillsList}`
      setSelectedPowerups([])
      setPowerupOpen(false)
    }
    const sentTime = new Date().toISOString()
    const localId = `dash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setAgentChats(prev => {
      const current = prev[selectedRoom] || { _all: [] }
      const msgs = [...(current._all || []), {
        role: 'user', content: text, time: sentTime,
        source: 'via dashboard', id: localId,
        ...(replyToId ? { reply_to: replyToId } : {}),
      }, {
        role: 'assistant', content: '', streaming: true,
        time: sentTime, id: `thinking-${localId}`,
      }]
      return { ...prev, [selectedRoom]: { _all: msgs } }
    })
    setPanelStreaming(true)
    // Mobile: auto-snap drawer to full when user sends a message (they're in a conversation now)
    if (isMobile && drawerSnap !== 'full') {
      setDrawerSnap('full')
    }
    // Send message via relay (local Vite middleware or Vercel serverless)
    if (IS_LOCAL) {
      const sendBody = { agent: selectedRoom, message: text, source: 'corner-dashboard', ...(replyToId ? { reply_to: replyToId } : {}) }
      if (atPrefixMatch) {
        const matchedOpt = atOptions.find(opt =>
          opt.slug === atPrefixMatch[1].toLowerCase() ||
          opt.name.toLowerCase() === atPrefixMatch[1].toLowerCase() ||
          opt.aliases.some(a => a.replace('@', '') === atPrefixMatch[1].toLowerCase())
        )
        if (matchedOpt && matchedOpt.type === 'project') {
          sendBody.project = matchedOpt.slug
        }
      }
      fetch('/api/local/relay-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendBody),
      }).catch(() => {})
    } else {
      // Production: send via Vercel proxy (writes to Supabase with service key server-side)
      const agent = selectedRoom
      try {
        const res = await fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent, text, role: 'user', source: 'corner-dashboard', client_id: getClientId(), ...(replyToId ? { reply_to: replyToId } : {}) }),
        })
        if (!res.ok) throw new Error(`Send failed: ${res.status}`)
        // Response arrives via poll (3s interval)
        // Set agent to active -- visual feedback that message was received
        fetch(`/api/dashboard/agent-status?slug=${encodeURIComponent(agent)}&status=active&current_task=${encodeURIComponent('Responding to message...')}`, { method: 'PATCH' }).catch(() => {})
        // Auto-idle after 60s if no real task update changes the status first
        setTimeout(() => {
          fetch(`/api/dashboard/agent-status?slug=${encodeURIComponent(agent)}&status=stuck`, { method: 'PATCH' }).catch(() => {})
        }, 60000)
      } catch (err) {
        setAgentChats(prev => {
          const current = prev[agent]?._all || []
          const thinkingIdx = current.findIndex(m => m.id === `thinking-${localId}`)
          if (thinkingIdx === -1) return prev
          const updated = [...current]
          updated[thinkingIdx] = { id: `resp-${localId}`, role: 'assistant', content: `Error: ${err.message}`, time: new Date().toISOString() }
          return { ...prev, [agent]: { _all: updated } }
        })
        setPanelStreaming(false) // Clear streaming on send error so ring doesn't spin forever
      }
      // Note: setPanelStreaming(false) is NOT called on success here.
      // Polling clears streaming state when a real assistant response arrives (lines 8004, 8045).
      // Clearing immediately after POST would kill the thinking indicator within milliseconds.
    }
  }, [panelChatInput, panelStreaming, selectedRoom, atOptions, isMobile, drawerSnap, selectedPowerups])

  // Powerup v2: toggle skill in selectedPowerups (multi-select, menu stays open)
  const handlePowerupActivate = useCallback((powerup) => {
    setSelectedPowerups(prev => {
      const already = prev.some(s => s.id === powerup.id)
      return already ? prev.filter(s => s.id !== powerup.id) : [...prev, powerup]
    })
  }, [])

  // Clear powerup pending ref on mount (legacy safety net)
  useEffect(() => { powerupPendingRef.current = null }, [])

  // Right-click context menu on rooms
  const handleRoomContextMenu = useCallback((e, roomId) => {
    e.preventDefault()
    const room = ROOM_LOOKUP[roomId]
    if (!room) return
    if (room.agent === null && room.type !== 'project' && room.type !== 'special') return
    const isProjectRoom = room.type === 'project' || room.type === 'special'
    const label = isProjectRoom ? (room.name || roomId) : `${room.agent}'s Room`
    setContextMenu({
      type: 'room',
      data: { roomId, agent: room.agent, label, isProject: isProjectRoom },
      position: { x: e.clientX, y: e.clientY },
    })
  }, [])

  // Context menu action dispatcher
  const handleContextAction = useCallback((actionId, data) => {
    switch (actionId) {
      // Room context menu actions (right-click / long-press on hex rooms)
      case 'open-chat':
        if (data?.roomId) {
          handleChat(data.roomId)
          setPanelActiveTab('chat')
          setPanelVisible(true)
        } else if (data?.slug) {
          handleChat(data.slug)
          setPanelActiveTab('chat')
          setPanelVisible(true)
        }
        break
      case 'send-message':
        if (data?.roomId) {
          handleChat(data.roomId)
          setPanelActiveTab('chat')
          setPanelVisible(true)
          // Focus the chat input after panel opens
          setTimeout(() => {
            const input = document.querySelector('[data-panel-chat-input]')
            if (input) input.focus()
          }, 150)
        }
        break
      case 'view-tasks':
        if (data?.roomId) {
          setSelectedRoom(data.roomId)
          setCameraTarget(data.roomId)
          setIsOverview(false)
          setPanelVisible(true)
          setPanelActiveTab('tasks')
        }
        break
      case 'set-home':
        // Home room is not persisted (no localStorage)
        break
      // Legacy / other menu types
      case 'chat':
        if (data?.roomId) { handleChat(data.roomId); setPanelVisible(true) }
        else if (data?.slug) { handleChat(data.slug); setPanelVisible(true) }
        break
      case 'zoom':
        if (data?.roomId) {
          setCameraTarget(data.roomId)
          setSelectedRoom(data.roomId)
          setCameraZoom(ZOOM_MAX)
          setIsOverview(false)
        }
        break
      case 'tasks':
        handleModeSwitch('checklist')
        break
      case 'activity':
      case 'status':
      case 'completions':
        if (data?.roomId) {
          setSelectedRoom(data.roomId)
          setCameraTarget(data.roomId)
          setIsOverview(false)
        }
        break
      case 'assign':
        break
      case 'add':
        // Open the pill's task panel in GameHUD so user can type a task
        if (data?.section || data?.name) {
          setExpandPillSection(data.section || data.name)
        }
        break
      case 'archive':
        // Hide pill until user re-enables it (in-memory only)
        if (data?.section) {
          setHiddenPills(prev => [...prev.filter(s => s !== data.section), data.section])
        }
        break
      case 'expand':
        handleModeSwitch('checklist')
        break
      default:
        break
    }
  }, [handleModeSwitch])

  // Message context menu action handler
  const handleMsgContextAction = useCallback((actionId, data) => {
    const msg = data
    switch (actionId) {
      case 'copy':
        if (msg?.content) {
          try { navigator.clipboard.writeText(msg.content) } catch {}
        }
        break
      case 'create-task': {
        if (!msg?.content) break
        const taskText = msg.content.slice(0, 120)
        // Supabase: create task from chat message (fire-and-forget)
        if (!IS_LOCAL) {
          fetch('/api/dashboard/agent-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: taskText, agent: selectedRoom || 'elon', status: 'todo' }),
          }).catch(() => {})
        }
        break
      }
      case 'reply':
        // Set pending reply -- UnifiedPanel picks this up via externalReplyTo prop
        if (msg?.content) {
          setPendingReplyMsg({ id: msg.id || `msg-${Date.now()}`, content: msg.content })
          setPanelActiveTab('chat')
        }
        break
      case 'send-to': {
        // Show the SendToMenu picker at the context menu position
        const pos = msgContextMenu?.position || { x: window.innerWidth / 2 - 120, y: window.innerHeight / 2 - 100 }
        setSendToMenu({ position: pos, msg })
        break
      }
      case 'resend':
        if (msg?.content && msg?.role === 'user') {
          setPanelChatInput(msg.content)
          setPanelActiveTab('chat')
        }
        break
      default:
        break
    }
  }, [selectedRoom, msgContextMenu])

  // Send file from Files tab to chat as inline image message
  const handleSendFileToChat = useCallback((file) => {
    if (!file?.url) return
    const imgMd = `![${file.name}](${file.url})`
    setPanelChatInput(prev => prev ? prev + '\n' + imgMd : imgMd)
    setPanelActiveTab('chat')
  }, [])

  // Task confirm: dismiss a message card by ID (check button = confirmed)
  const handleDismissMessage = useCallback((msgId) => {
    setAgentChats(prev => {
      const agent = selectedRoom || 'elon'
      const current = prev[agent]?._all || []
      return { ...prev, [agent]: { _all: current.filter(m => m.id !== msgId) } }
    })
  }, [selectedRoom])

  // Task confirm: minus button = send rerun message + dismiss
  const handleTaskNotDone = useCallback((msgId, taskText) => {
    // Dismiss the card
    setAgentChats(prev => {
      const agent = selectedRoom || 'elon'
      const current = prev[agent]?._all || []
      return { ...prev, [agent]: { _all: current.filter(m => m.id !== msgId) } }
    })
    // Send the rerun message via the input pipeline
    const rerunMsg = `Task not done: "${taskText}" -- Rerun with a new approach.`
    const sentTime = new Date().toISOString()
    const localId = `rerun-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const agent = selectedRoom || 'elon'
    setAgentChats(prev => {
      const current = prev[agent] || { _all: [] }
      return { ...prev, [agent]: { _all: [...(current._all || []), { role: 'user', content: rerunMsg, time: sentTime, source: 'via dashboard', id: localId }, { role: 'assistant', content: '', streaming: true, time: sentTime, id: `thinking-${localId}` }] } }
    })
    setPanelStreaming(true)
    if (IS_LOCAL) {
      fetch('/api/local/relay-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent, message: rerunMsg, source: 'corner-dashboard' }) }).catch(() => {})
    }
  }, [selectedRoom])

  // Mini-map room click -> move camera
  const handleMinimapRoomClick = (roomId) => {
    setCameraTarget(roomId)
    setSelectedRoom(roomId)
    setIsOverview(false)
    setCameraZoom(1.6)
  }

  // Notification management
  const handleDismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const visibleNotifications = notifications.slice(0, 3)
  const queuedNotificationCount = Math.max(0, notifications.length - 3)

  // Keyboard shortcuts
  const agentSlugs = AGENTS.filter(a => ROOM_MAP[a.slug]).map(a => a.slug)
  useKeyboardShortcuts({
    onToggleHud: () => setHudOpen(h => !h),
    onToggleChat: () => {
      // Focus chat or open it
    },
    onToggleMinimap: () => setShowMinimap(m => !m),
    onEscape: () => {
      if (showShortcuts) { setShowShortcuts(false); return }
      // Mobile drawer: step down snap positions (full -> half -> hidden)
      if (isMobile && drawerOpen) {
        if (drawerSnap === 'full') { setDrawerSnap('half'); return }
        setDrawerSnap(null); return
      }
      // Panel is always visible, Escape just collapses extended mode
      if (panelExtended) { setPanelExtended(false); return }
      if (cameraZoom > 2.0) { setCameraZoom(1.6); return }
      if (selectedRoom) { setSelectedRoom(null); setIsOverview(true); return }
      setHudOpen(false)
    },
    onAgentSelect: null, // Removed: 1-9 now used for mode switching
    onZoomIn: () => setCameraZoom(z => {
      const idx = ZOOM_PRESETS.findIndex(p => Math.abs(p - z) < 0.3)
      const nextIdx = idx >= 0 && idx < ZOOM_PRESETS.length - 1 ? idx + 1 : ZOOM_PRESETS.length - 1
      return ZOOM_PRESETS[nextIdx]
    }),
    onZoomOut: () => setCameraZoom(z => {
      const idx = ZOOM_PRESETS.findIndex(p => Math.abs(p - z) < 0.3)
      const nextIdx = idx > 0 ? idx - 1 : 0
      return ZOOM_PRESETS[nextIdx]
    }),
    onOverview: () => setIsOverview(o => !o),
    onModeSwitch: handleModeSwitch,
    onCommandPalette: () => { /* Command palette: future C3.1 */ },
    onShowShortcuts: () => setShowShortcuts(s => !s),
  })

  // Listen for toast click navigation (HUDNotifications dispatches 'corner-navigate-agent')
  useEffect(() => {
    const handler = (e) => {
      const slug = e.detail?.agentSlug
      if (slug && ROOM_LOOKUP[slug]) {
        setCameraTarget(slug)
        setSelectedRoom(slug)
        setChatAgent(slug)
        setIsOverview(false)
      }
    }
    window.addEventListener('corner-navigate-agent', handler)
    return () => window.removeEventListener('corner-navigate-agent', handler)
  }, [])

  // Ctrl+Shift+D: Toggle relay debug overlay
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setShowRelayDebug(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Fetch relay debug data when debug panel is open (poll every 5s)
  useEffect(() => {
    if (!showRelayDebug || !IS_LOCAL) return
    const fetchDebug = () => {
      fetch('/api/local/relay-debug')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setRelayDebugData(data) })
        .catch(() => {})
    }
    fetchDebug()
    const interval = setInterval(fetchDebug, 5000)
    return () => clearInterval(interval)
  }, [showRelayDebug])

  if (!authed) {
    return <PasswordGate onAuth={() => setAuthed(true)} />
  }

  // TODO(bobby): DREAM HUD TARGET -- Steffen designing ONE definitive HUD visual target from ALL Patrik feedback. When delivered, pixel-match it exactly. Key specs: (1) NO bottom bar (top bar + sidebar ONLY), (2) sidebar full height, seamless column, chat input at bottom, (3) 70/30 layout (game/sidebar), (4) project pills scrollable in top bar, category labels (CLIENT/PROJECT/OUTREACH), (5) stat pills compact, (6) Vegas energy sidebar (blue glass, glow tabs), (7) chat matching chat-view-full.png (chronological, avatars, source labels), (8) top bar: Corner. logo + stat pills + search + notifications, NO mode switcher, (9) SimCity + Trello DNA, (10) daytime bright palette, (11) nothing hiding, everything visible. This is THE north star. No interpretation. Build the picture. Ref: Patrik directive lines 170-182. [SURVIVES: HUD layout spec. The 70/30 split becomes engine-canvas/React-sidebar. Layout logic stays, game viewport becomes engine canvas.]
  // DONE(bobby): RELAY CHAT SPLIT-BRAIN FIX -- sender attribution fixed. Dashboard now reads from App Support outbox (where relay-respond.py writes). Messages from relay-inbox = role "user" (right side, P avatar). Messages from relay-outbox = role "assistant" (left side, agent avatar). extractAgent() for proper source names. Commit b7be6a7.
  // DONE: Viewport overflow -- 100vw lock on outer + inner containers (commit 637b79c). 70/30 flex split verified.
  // DONE: Elon commit 637b79c verified clean, no conflicts with Bobby's 9ec8b81 chain.
  return (
    <div style={{
      position: 'fixed', inset: 0,
      width: '100vw', maxWidth: '100vw',
      background: currentMode === 'game' ? '#0A0D1A' : (isNightMode ? PALETTE.background : '#141E30'),
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif',
      transition: 'background 500ms ease',
      overscrollBehavior: 'none',
      // Mobile: 'manipulation' allows input focus + tap events while still preventing double-tap zoom.
      // Desktop: 'none' prevents accidental scroll/swipe on canvas. Input focus works fine on desktop.
      touchAction: isMobile ? 'manipulation' : 'none',
      // Suppress iOS text selection on long-press (FIX 3, Wave 5)
      // NOTE: inputs/textareas override this locally with userSelect:'text' so typing still works.
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'none',
      userSelect: 'none',
    }}>
      {/* Task HUD (top) - compact at detail zoom level per Steffen spec */}
      <TaskHUD data={data} isOpen={hudOpen} onToggle={() => setHudOpen(!hudOpen)} selectedAgent={selectedRoom} onSelectAgent={(slug) => { setSelectedRoom(slug); setCameraTarget(slug); setIsOverview(false) }} onOpenSettings={() => setPanelActiveTab('notes')} isMobile={isMobile} currentMode={currentMode} onModeSwitch={handleModeSwitch} detailLevel={getDetailLevel(cameraZoom)} isNightMode={isNightMode} viewMode={viewMode} onViewModeSwitch={handleViewModeSwitch} onResetLayout={() => canvasOfficeRef.current?.resetLayout()} onUnstuck={async () => { await fetch('/api/dashboard/unstuck', { method: 'POST' }); pipeData?.refetch?.() }} currentUser={currentUser} onSignOut={handleSignOut} rightNowTasks={rightNowTasks} />

      {/* Mobile floating notification badges -- KILLED per Patrik Round 2. Noise that distracts from real work. */}

      {/* Board view: Trello/kanban mode -- shown when viewMode === 'board', hides game canvas */}
      {viewMode === 'board' && (
        <BoardView pipeData={pipeData} isMobile={isMobile} isNightMode={isNightMode} />
      )}

      {/* Main content area -- game + sidebar side by side (flex row) */}
      {/* GameHUD is position:fixed so no bottom padding needed on mobile -- removed to fix black gap */}
      <div style={{ flex: 1, display: viewMode === 'board' ? 'none' : 'flex', overflow: 'hidden', width: '100%', maxWidth: '100%', paddingTop: isMobile ? 'calc(48px + env(safe-area-inset-top, 0px))' : 52, paddingBottom: 0, transition: 'padding-top 200ms ease' }}>
          {/* GAME VIEWPORT: flex fills remaining space, sidebar is fixed width */}
            <div style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
              {/* Dark background for game viewport. Hex grid lines are drawn on canvas (moves with camera). */}
              {currentMode === 'game' && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundColor: '#0A0F1A' }} />
              )}
              <CanvasOffice
                ref={canvasOfficeRef}
                agentStatus={agentStatus}
                onRoomClick={handleRoomClick}
                selectedRoom={selectedRoom}
                hoveredRoom={hoveredRoom}
                setHoveredRoom={setHoveredRoom}
                isNightMode={isNightMode}
                drawerSnap={drawerSnap}
                isMobile={isMobile}
                initialFocusRoom={isMobile ? DEFAULT_AGENT : null}
                unreadAgents={unreadAgents}
                onOpenChat={(roomId) => {
                  handleChat(roomId)
                  setPanelActiveTab('chat')
                  setPanelVisible(true)
                }}
                onSendMessage={(roomId) => {
                  handleChat(roomId)
                  setPanelActiveTab('chat')
                  setPanelVisible(true)
                  setTimeout(() => {
                    const input = document.querySelector('[data-panel-chat-input]')
                    if (input) input.focus()
                  }, 150)
                }}
                onViewTasks={(roomId) => {
                  setSelectedRoom(roomId)
                  setCameraTarget(roomId)
                  setIsOverview(false)
                  setPanelVisible(true)
                  setPanelActiveTab('tasks')
                }}
                onSetAsHome={(_roomId) => {
                  // Home room not persisted (no localStorage)
                }}
              />

              {/* SimCity floating stats overlay (bottom-left of game viewport) */}
              {!isMobile && (
                <div style={{
                  position: 'absolute', bottom: 16, left: 16, zIndex: 10,
                  background: isNightMode ? 'rgba(15,27,45,0.8)' : 'rgba(26,35,50,0.85)',
                  border: isNightMode ? '1px solid rgba(59,130,246,0.15)' : '1.5px solid rgba(59,130,246,0.25)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  display: 'flex', gap: 12, alignItems: 'center',
                  backdropFilter: 'blur(8px)',
                  pointerEvents: 'none',
                  opacity: cameraZoom > 2.5 ? 0 : 1,
                  transition: 'opacity 300ms ease, background 500ms ease',
                  boxShadow: isNightMode ? 'none' : '0 2px 8px rgba(0,0,0,0.3)',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#16A34A', fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {Object.values(agentStatus).filter(a => a?.status === 'WORKING').length} Active
                  </span>
                  <span style={{ color: isNightMode ? 'rgba(59,130,246,0.3)' : '#4A6585' }}>|</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {Object.values(agentStatus).filter(a => a?.status === 'BLOCKED').length} Blocked
                  </span>
                </div>
              )}

              {/* Camera controls REMOVED per Patrik directive. Zoom/home/overview via keyboard only. */}

              {/* Ambient vignette overlay for Elon room focus (dark bg, subtle server-green glow) */}
              {currentMode === 'game' && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {/* Subtle green server glow */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', width: 300, height: 300,
                  transform: 'translate(-50%, -50%)',
                  background: 'radial-gradient(circle, rgba(76,175,80,0.04) 0%, transparent 60%)',
                  borderRadius: '50%', animation: 'windowLight 20s ease-in-out infinite',
                }} />
                {/* Vignette for depth */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(ellipse at 50% 45%, transparent 40%, rgba(0,0,0,0.3) 100%)',
                }} />
              </div>
              )}
            </div>

          {/* SIDEBAR PANEL: always visible on desktop, sits beside game viewport */}
          {/* TODO(patrik): Mobile sidebar -- map squished on mobile. Sidebar needs mobile-responsive breakpoint. On mobile: sidebar should stack below or become a bottom-sheet drawer, not disappear entirely. Currently hidden via !isMobile guard. [SURVIVES: Responsive layout. Engine canvas auto-scales, sidebar logic stays.] */}
          {/* TODO(steffen-design): Mobile bottom-sheet drawer UX -- design the swipe-up drawer for mobile. Should show: agent name/status at peek height, chat on half-pull, full panel on full-pull. Reference Steffen's c3-mobile-layout-spec.md. The notification cards currently overlap the bottom bar on mobile. [SURVIVES: Mobile UI design. Engine-independent.] */}
          {!isMobile && selectedRoom && (selectedRoom === 'aom' || ROOM_LOOKUP[selectedRoom]) && (
            <UnifiedPanel
              key={selectedRoom}
              room={ROOM_LOOKUP[selectedRoom]}
              agent={AGENTS.find(a => a.slug === selectedRoom) || PROJECTS.find(p => p.slug === selectedRoom)}
              agentStatus={agentStatus[selectedRoom]}
              allAgentStatus={agentStatus}
              onClose={() => {}} // Panel always visible, no-op
              onChat={handleChat}
              chatMessages={panelMessages._all || []}
              chatInput={panelChatInput}
              onChatInputChange={handleAtInputChange}
              streaming={panelStreaming}
              chatLoading={panelChatLoading}
              agentSlug={selectedRoom}
              isExtended={panelExtended}
              onToggleExtend={() => setPanelExtended(e => !e)}
              isMobile={isMobile}
              isTablet={isTablet}
              atMenuOpen={atMenuOpen}
              filteredAtOptions={filteredAtOptions}
              atMenuIndex={atMenuIndex}
              onAtSelect={handleAtSelect}
              onAtKeyDown={handleAtKeyDown}
              cornerConfig={cornerConfig}
              data={data}
              activeTab={panelActiveTab}
              onActiveTabChange={setPanelActiveTab}
              isNightMode={isNightMode}
              onAddToRightNow={addToRightNow}
              rightNowTasks={rightNowTasks}
              onSendMessage={handlePanelSendMessage}
              powerupOpen={powerupOpen}
              onPowerupToggle={setPowerupOpen}
              onPowerupActivate={handlePowerupActivate}
              selectedPowerups={selectedPowerups}
              onRemovePowerup={(id) => setSelectedPowerups(prev => prev.filter(s => s.id !== id))}
              onSelectAgent={(slug) => { setSelectedRoom(slug); setCameraTarget(slug); setIsOverview(false) }}
              onSelectProject={setSelectedProject}
              selectedProject={selectedProject}
              onMessageContextMenu={handleMessageContextMenu}
              onGoOverview={() => { setIsOverview(true) }}
              onCenterCamera={() => { if (selectedRoom) { setCameraTarget(selectedRoom); setIsOverview(false) } }}
              externalReplyTo={pendingReplyMsg}
              onClearExternalReply={() => setPendingReplyMsg(null)}
              onSendFileToChat={handleSendFileToChat}
              onDismissMessage={handleDismissMessage}
              onTaskNotDone={handleTaskNotDone}
              onInputFocus={() => clearUnreadForRoom(selectedRoom)}
            />
          )}
      </div>

      {/* Mini-map removed - camera lock makes it unnecessary */}

      {/* Game HUD (Sims x Chaart) - bottom strip with project pills + agent status */}
      {/* Wrapped in a container that constrains fixed positioning to the game viewport only.
          transform creates a new containing block, so GameHUD's position:fixed becomes relative to this container.
          On desktop with sidebar visible: HUD only covers game area, not sidebar.
          HIDDEN on mobile when drawer is open (pills vs drawer mutual exclusion).
          HIDDEN in board view mode. */}
      {viewMode !== 'board' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: (!isMobile && selectedRoom && ROOM_LOOKUP[selectedRoom]) ? (panelExtended ? '65%' : '30%') : 0,
          zIndex: 40,
          transition: 'right 250ms ease, bottom 200ms ease, opacity 200ms ease',
          pointerEvents: 'none',
          opacity: (isMobile && drawerOpen) ? 0 : 1,
        }}>
        <div style={{ position: 'relative', width: '100%', height: 0, transform: 'translateZ(0)', pointerEvents: (isMobile && drawerOpen) ? 'none' : 'auto' }}>
        <Suspense fallback={null}>
          <GameHUD
            agentStatus={agentStatus}
            throughput={data?.throughput}
            onAgentClick={(slug) => {
              setCameraTarget(slug)
              setSelectedRoom(slug)
              setChatAgent(slug)
              setIsOverview(false)
              setCameraZoom(1.6)
            }}
            onAgentContextMenu={(e, slug) => {
              e.preventDefault()
              const agent = AGENTS.find(a => a.slug === slug)
              setContextMenu({
                type: 'agent',
                data: { slug, name: agent?.name, label: agent?.name || slug },
                position: { x: e.clientX, y: e.clientY },
              })
            }}
            onProjectContextMenu={(e, project) => {
              e.preventDefault()
              setContextMenu({
                type: 'project',
                data: { ...project, label: project.name },
                position: { x: e.clientX, y: e.clientY },
              })
            }}
            isMobile={isMobile}
            isTablet={isTablet}
            chatAgent={chatAgent}
            onChatSubmit={(slug, text) => {
              // Route chat to sidebar: select the agent and switch to chat tab
              setChatAgent(slug)
              setSelectedRoom(slug)
              setPanelActiveTab('chat')
              if (text) {
                setPanelChatInput(text)
              }
            }}
            onExpandChat={() => {
              // Focus sidebar chat
              setPanelActiveTab('chat')
            }}
            onNavigateToAgent={(slug) => {
              // Navigate to agent's room + open chat
              setCameraTarget(slug)
              setSelectedRoom(slug)
              setChatAgent(slug)
              setIsOverview(false)
              setCameraZoom(1.6)
              setPanelActiveTab('chat')
            }}
            onClarify={(slug, taskText) => {
              // Navigate to agent chat + pre-fill input with task context
              setCameraTarget(slug)
              setSelectedRoom(slug)
              setChatAgent(slug)
              setIsOverview(false)
              setCameraZoom(1.6)
              setPanelActiveTab('chat')
              setPanelChatInput(`Re: "${taskText}" -- `)
              requestAnimationFrame(() => {
                const input = document.querySelector('[data-panel-chat-input]')
                if (input) input.focus()
              })
            }}
            isNightMode={isNightMode}
            expandPillSection={expandPillSection}
            onExpandPillHandled={() => setExpandPillSection(null)}
            hiddenPills={hiddenPills}
          />
        </Suspense>
        </div>
        </div>
      )}

      {/* Mobile mode tab bar: KILLED per Patrik Round 2 directive. Mode switching via top bar only. */}
      {/* {isMobile && <MobileModeBar currentMode={currentMode} onModeSwitch={handleModeSwitch} />} */}

      {/* Mobile fullscreen Checklist/Megaboard overlays */}
      {isMobile && currentMode === 'checklist' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 45,
          paddingTop: 48, paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: isNightMode ? '#0A0D1A' : '#141E30',
          overflow: 'hidden',
          touchAction: 'auto',
        }}>
          <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>Loading...</div>}>
            <ChecklistMode agentStatus={agentStatus} isMobile={isMobile} data={data} />
          </Suspense>
        </div>
      )}
      {isMobile && currentMode === 'megaboard' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 45,
          paddingTop: 48, paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: isNightMode ? '#0A0D1A' : '#141E30',
          overflow: 'hidden',
          touchAction: 'auto',
        }}>
          <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>Loading...</div>}>
            <MegaboardMode agentStatus={agentStatus} data={data} isMobile={isMobile} />
          </Suspense>
        </div>
      )}

      {/* Drawer backdrop scrim (dims map when drawer is open) */}
      {isMobile && drawerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: drawerSnap === 'full' ? 0.6 : 0.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => { setDrawerSnap(null); setSelectedRoom(null); setIsOverview(true) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 37,
            background: '#000',
            touchAction: 'none',
          }}
        />
      )}

      {/* Mobile/tablet bottom sheet drawer (iOS-style, 3 snap points) */}
      {(isMobile) && drawerOpen && selectedRoom && ROOM_LOOKUP[selectedRoom] && (
        <MobileDrawer
          key={`drawer-${selectedRoom}`}
          room={ROOM_LOOKUP[selectedRoom]}
          agent={AGENTS.find(a => a.slug === selectedRoom) || PROJECTS.find(p => p.slug === selectedRoom)}
          agentStatus={agentStatus[selectedRoom]}
          agentSlug={selectedRoom}
          onClose={() => { setDrawerSnap(null); setSelectedRoom(null); setIsOverview(true) }}
          snap={drawerSnap}
          onSnapChange={setDrawerSnap}
          chatMessages={panelMessages._all || []}
          chatInput={panelChatInput}
          onChatInputChange={handleAtInputChange}
          onSendMessage={handlePanelSendMessage}
          streaming={panelStreaming}
          chatLoading={panelChatLoading}
          allAgentStatus={agentStatus}
          data={data}
          isNightMode={isNightMode}
          onAddToRightNow={addToRightNow}
          rightNowTasks={rightNowTasks}
          atMenuOpen={atMenuOpen}
          filteredAtOptions={filteredAtOptions}
          atMenuIndex={atMenuIndex}
          onAtSelect={handleAtSelect}
          onAtKeyDown={handleAtKeyDown}
          cornerConfig={cornerConfig}
          powerupOpen={powerupOpen}
          onPowerupToggle={setPowerupOpen}
          onPowerupActivate={handlePowerupActivate}
          selectedPowerups={selectedPowerups}
          onRemovePowerup={(id) => setSelectedPowerups(prev => prev.filter(s => s.id !== id))}
          onMessageContextMenu={handleMessageContextMenu}
          externalReplyTo={pendingReplyMsg}
          onClearExternalReply={() => setPendingReplyMsg(null)}
          onDismissMessage={handleDismissMessage}
          onTaskNotDone={handleTaskNotDone}
          onClearUnread={clearUnreadForRoom}
        />
      )}

      {/* Notification toasts */}
      <NotificationToast
        notifications={visibleNotifications}
        onDismiss={handleDismissNotification}
        onClickNotification={(n) => {
          handleDismissNotification(n.id)
          if (n.agentSlug) {
            setChatAgent(n.agentSlug)
            setSelectedRoom(n.agentSlug)
            setCameraTarget(n.agentSlug)
            if (currentMode !== 'game') handleModeSwitch('game')
          }
        }}
        queuedCount={queuedNotificationCount}
      />

      {/* Unread message badge (floating, visible when sidebar panel is closed) */}
      {unreadCount > 0 && !panelVisible && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: 'fixed', bottom: isMobile ? 82 : 80, right: 20, zIndex: 50,
            minWidth: 44, height: 44, borderRadius: 22,
            background: '#E85D26',
            color: '#FFF', fontFamily: "'Inter Tight', sans-serif", fontWeight: 900, fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '0 14px',
            boxShadow: '0 4px 20px rgba(232,93,38,0.4), 0 0 0 2px rgba(232,93,38,0.2)',
            cursor: 'pointer',
            animation: 'chatBadgePulse 2s ease-in-out infinite',
          }}
          onClick={() => {
            // Open sidebar panel for the agent with most unread, switch to chat tab
            const topAgent = Object.entries(unreadAgents).sort((a, b) => b[1] - a[1])[0]
            if (topAgent) {
              setSelectedRoom(topAgent[0])
              setPanelVisible(true)
              setPanelActiveTab('chat')
            }
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <MessageSquare size={16} />
          {unreadCount}
        </motion.div>
      )}

      {/* Floating Action Button -- bottom-right, above HUD, expands upward */}
      {(viewMode === 'game' || !viewMode) && (
        <FloatingActionButton isNightMode={isNightMode} isMobile={isMobile} onRoomCreated={() => pipeData?.refetch?.()} />
      )}

      {/* ChatBar REMOVED per Patrik directive: chat ONLY lives in the sidebar.
          Bottom HUD should NOT have a message input. Sidebar is the only place to chat.
          The ChatBar component still exists in the codebase for potential mobile reuse. */}

      {/* Right-click context menu (rooms/agents/projects) */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            key={`ctx-${contextMenu.position.x}-${contextMenu.position.y}`}
            type={contextMenu.type}
            data={contextMenu.data}
            position={contextMenu.position}
            onClose={() => setContextMenu(null)}
            onAction={handleContextAction}
          />
        )}
      </AnimatePresence>

      {/* Right-click context menu (task items in sidebar) */}
      <AnimatePresence>
        {taskContextMenu && (
          <TaskContextMenuShared
            key={`task-ctx-${taskContextMenu.position.x}-${taskContextMenu.position.y}`}
            position={taskContextMenu.position}
            task={taskContextMenu.task}
            onClose={() => setTaskContextMenu(null)}
            onAction={handleSidebarContextAction}
            isNightMode={isNightMode}
            projects={pipeData?.punchData?.projects || []}
          />
        )}
      </AnimatePresence>

      {/* Right-click context menu (chat messages) */}
      <AnimatePresence>
        {msgContextMenu && (
          <ContextMenu
            key={`msg-ctx-${msgContextMenu.position.x}-${msgContextMenu.position.y}`}
            type="message"
            data={msgContextMenu.msg}
            position={msgContextMenu.position}
            onClose={() => setMsgContextMenu(null)}
            onAction={(actionId, data) => { handleMsgContextAction(actionId, data); if (actionId !== 'send-to') setMsgContextMenu(null) }}
          />
        )}
      </AnimatePresence>

      {/* Send-to smart destination picker */}
      <AnimatePresence>
        {sendToMenu && (
          <SendToMenu
            key={`send-to-${sendToMenu.position.x}-${sendToMenu.position.y}`}
            position={sendToMenu.position}
            currentAgent={selectedRoom}
            onClose={() => setSendToMenu(null)}
            onSelect={(targetAgent) => {
              const msg = sendToMenu.msg
              if (!msg?.content) return
              // Switch to target agent and prefill input with forwarded message
              const targetSlug = targetAgent.slug
              const targetRoom = ROOM_LOOKUP[targetSlug]
              if (targetRoom || targetSlug) {
                setSelectedRoom(targetSlug)
                setCameraTarget(targetSlug)
                setIsOverview(false)
                setPanelActiveTab('chat')
                // Prefill chat with forwarded message (quoted)
                setPanelChatInput(`> ${msg.content.slice(0, 200)}`)
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Keyboard shortcuts overlay */}
      <AnimatePresence>
        {showShortcuts && (
          <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
        )}
      </AnimatePresence>

      {/* Relay Debug Overlay (Ctrl+Shift+D) */}
      {showRelayDebug && relayDebugData && (
        <div style={{
          position: 'fixed', top: 60, right: 16, zIndex: 9999,
          background: 'rgba(0,0,0,0.92)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8, padding: 16, maxWidth: 480, maxHeight: 'calc(100vh - 120px)',
          overflow: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: '#E5E7EB', backdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#FFD87A' }}>RELAY DEBUG</span>
            <button onClick={() => setShowRelayDebug(false)} style={{
              background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 16,
            }}>x</button>
          </div>

          {/* Pipeline Issues */}
          {relayDebugData.pipeline?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>Pipeline Issues</div>
              {relayDebugData.pipeline.map((issue, i) => (
                <div key={i} style={{
                  padding: '4px 8px', marginBottom: 2, borderRadius: 4, fontSize: 10,
                  background: issue.level === 'warn' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.1)',
                  color: issue.level === 'warn' ? '#EF4444' : '#60A5FA',
                  border: `1px solid ${issue.level === 'warn' ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.2)'}`,
                }}>{issue.message}</div>
              ))}
            </div>
          )}

          {/* Hooks Status */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>Hooks</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <span style={{ color: '#9CA3AF' }}>Active Persona:</span>
              <span style={{ color: '#FFD87A' }}>{relayDebugData.hooks?.activePersona || 'none'}</span>
              <span style={{ color: '#9CA3AF' }}>Auto-Responding:</span>
              <span style={{ color: relayDebugData.hooks?.autoResponding ? '#EF4444' : '#10B981' }}>
                {relayDebugData.hooks?.autoResponding || 'false'}
              </span>
              <span style={{ color: '#9CA3AF' }}>Pending Prompt:</span>
              <span style={{ color: relayDebugData.hooks?.pendingUserPrompt ? '#F59E0B' : '#10B981' }}>
                {relayDebugData.hooks?.pendingUserPrompt ? 'YES' : 'no'}
              </span>
            </div>
          </div>

          {/* Relay Stats */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>Relay Files</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <span style={{ color: '#9CA3AF' }}>main.jsonl:</span>
              <span>{relayDebugData.relay?.main?.totalMessages || 0} msgs</span>
              <span style={{ color: '#9CA3AF' }}>aom-internal:</span>
              <span>{relayDebugData.relay?.['aom-internal']?.totalMessages || 0} msgs</span>
              <span style={{ color: '#9CA3AF' }}>Inbox pending:</span>
              <span style={{ color: relayDebugData.relay?.inbox?.pending > 0 ? '#EF4444' : '#10B981' }}>
                {relayDebugData.relay?.inbox?.pending || 0}
              </span>
              <span style={{ color: '#9CA3AF' }}>Outbox total:</span>
              <span>{relayDebugData.relay?.outbox?.total || 0}</span>
            </div>
          </div>

          {/* Agent Conversation Files */}
          <div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
              Agent Conversations ({Object.values(relayDebugData.agents || {}).filter(a => a.totalMessages > 0).length}/{Object.keys(relayDebugData.agents || {}).length} active)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(relayDebugData.agents || {}).map(([slug, info]) => {
                const statusColor = info.status === 'EMPTY' ? '#EF4444' : info.status === 'LOW' ? '#F59E0B' : '#10B981'
                return (
                  <div key={slug} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '3px 6px',
                    background: info.status === 'EMPTY' ? 'rgba(239,68,68,0.08)' : 'transparent',
                    borderRadius: 3, borderLeft: `3px solid ${statusColor}`,
                  }}>
                    <span style={{ width: 70, color: statusColor, fontWeight: 600 }}>{slug}</span>
                    <span style={{ color: '#9CA3AF', minWidth: 50 }}>{info.totalMessages} msgs</span>
                    <span style={{ color: '#6B7280', fontSize: 9 }}>
                      {info.totalMessages > 0 ? `${info.userMessages}u/${info.assistantMessages}a` : ''}
                    </span>
                    <span style={{ color: '#6B7280', fontSize: 9, marginLeft: 'auto' }}>
                      {info.totalMessages > 0 && info.sources ? Object.keys(info.sources).join(', ') : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Timestamp */}
          <div style={{ marginTop: 8, fontSize: 9, color: '#6B7280', textAlign: 'right' }}>
            Updated: {new Date(relayDebugData.timestamp).toLocaleTimeString()} (5s poll)
          </div>
          <div style={{ marginTop: 4, fontSize: 9, color: '#4B5563', textAlign: 'center' }}>
            Ctrl+Shift+D to close
          </div>
        </div>
      )}

      {/* Error / connection indicator */}
      {error && (
        <div style={{
          position: 'fixed', bottom: isMobile ? 92 : 80, left: showMinimap ? 192 : 16,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#EF4444', fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
          padding: '6px 12px', borderRadius: 4, zIndex: 50,
          transition: 'left 200ms ease',
        }}>
          {IS_LOCAL ? 'Local file read failed. Is AOM-EA accessible?' : 'Status update failed. Showing cached data.'}
        </div>
      )}

      {/* WebSocket connection indicator */}
      {wsHook.isReconnecting && (
        <div style={{
          position: 'fixed', bottom: isMobile ? 92 : 80,
          right: 16, zIndex: 50,
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          color: '#F59E0B', fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
          padding: '6px 12px', borderRadius: 4,
        }}>
          WebSocket reconnecting...
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div style={{ position: 'fixed', inset: 0, background: PALETTE.background, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader2 size={24} style={{ color: '#FFD87A', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#6B7280', fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {IS_LOCAL ? 'Loading from local files...' : 'Loading your office...'}
            </span>
          </div>
        </div>
      )}

      {/* GHOST KILL: CharacterAnimationStyles REMOVED -- old CSS injection for dust/speech no longer needed */}

      {/* Global styles */}
      <style>{`
        @keyframes windowLight {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.04; }
          50% { transform: translate(20px, -10px) scale(1.1); opacity: 0.06; }
        }
        @keyframes buildingFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          15% { transform: translateY(-2px) scale(1.001, 0.999); }
          30% { transform: translateY(-4px) scale(0.999, 1.002); }
          50% { transform: translateY(-5px) scale(1.001); }
          70% { transform: translateY(-3px) scale(0.999, 1.001); }
          85% { transform: translateY(-1px) scale(1.001, 0.999); }
        }
        /* Crossy Road bounce energy: idle bob with squash/stretch */
        @keyframes crossyShadow {
          0%, 100% { transform: translateX(-50%) scaleX(1); opacity: 0.25; }
          30% { transform: translateX(-50%) scaleX(0.6); opacity: 0.15; }
          50% { transform: translateX(-50%) scaleX(0.5); opacity: 0.1; }
          85% { transform: translateX(-50%) scaleX(1.15); opacity: 0.3; }
        }
        @keyframes crossyBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-3px) scale(1.003, 0.997); }
          50% { transform: translateY(-5px) scale(0.998, 1.003); }
          75% { transform: translateY(-2px) scale(1.002, 0.998); }
        }
        /* Crossy Road hop: rooms hop on status change -- MORE BOUNCE */
        @keyframes crossyHop {
          0% { transform: translateY(0) scaleY(1) scaleX(1); }
          10% { transform: translateY(-10px) scaleY(1.1) scaleX(0.93); }
          25% { transform: translateY(2px) scaleY(0.88) scaleX(1.06); }
          40% { transform: translateY(-5px) scaleY(1.05) scaleX(0.97); }
          55% { transform: translateY(1px) scaleY(0.96) scaleX(1.02); }
          70% { transform: translateY(-2px) scaleY(1.02) scaleX(0.99); }
          85% { transform: translateY(0) scaleY(0.99) scaleX(1.005); }
          100% { transform: translateY(0) scaleY(1) scaleX(1); }
        }
        /* Pill bounce for project cards in HUD - Crossy Road style */
        @keyframes pillBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-3px) scale(1.02); }
          60% { transform: translateY(-1px) scale(0.99); }
        }
        @keyframes handlePulse { 0%,100%{box-shadow:0 0 6px rgba(255,255,255,0.2)} 50%{box-shadow:0 0 14px rgba(255,255,255,0.6)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes dotPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes awayPulse { 0%,100%{opacity:0.8} 50%{opacity:1.0} }
        @keyframes dustDrift {
          0% { transform: translateY(0) translateX(0); opacity: 0.03; }
          50% { transform: translateY(-8px) translateX(4px); opacity: 0.06; }
          100% { transform: translateY(-16px) translateX(-2px); opacity: 0; }
        }
        @keyframes particleFloat {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          25% { transform: translate(8px, -12px) scale(1.2); opacity: 0.6; }
          50% { transform: translate(-4px, -20px) scale(0.8); opacity: 0.4; }
          75% { transform: translate(6px, -8px) scale(1.1); opacity: 0.5; }
        }
        .ambient-particle {
          pointer-events: none;
          will-change: transform, opacity;
        }
        @keyframes characterGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes statusPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }
        /* Nameplate subtle float */
        @keyframes nameplateFloat {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-1px); }
        }
        /* Steffen modern nameplate glow on active agents */
        @keyframes nameplateGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
        @keyframes chatTypingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes vegasTypingBounce {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
          60% { transform: translateY(0); }
        }
        @keyframes chatBadgePulse { 0%, 100% { box-shadow: 0 4px 20px rgba(232,93,38,0.4), 0 0 0 2px rgba(232,93,38,0.2); } 50% { box-shadow: 0 4px 24px rgba(232,93,38,0.6), 0 0 0 4px rgba(232,93,38,0.15); } }
        @keyframes chatCursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes chatTimeoutPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.15); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.3); }
        .hud-scroll::-webkit-scrollbar { width: 6px; }
        .hud-scroll::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.15); border-radius: 3px; }
        /* PWA safe areas */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
        }
        /* Touch action for game viewport */
        .game-viewport { touch-action: none; }
        /* Top bar scroll: hide scrollbar on mobile */
        .topbar-scroll::-webkit-scrollbar { display: none; }
        .topbar-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        /* FIX 3 Wave 5: Allow text selection in inputs/textareas despite root user-select:none */
        input, textarea, [contenteditable="true"] {
          -webkit-touch-callout: default !important;
          -webkit-user-select: text !important;
          user-select: text !important;
        }
        /* Message bubble hover: show reply button */
        .msg-bubble:hover .msg-reply-btn {
          display: flex !important;
        }
        /* Markdown message rendering inside assistant bubbles */
        .md-msg {
          font-size: 13px;
          line-height: 1.6;
          color: #F1F5F9;
          font-family: 'Inter', system-ui, sans-serif;
          word-break: break-word;
        }
        .md-msg p {
          margin: 0 0 8px 0;
        }
        .md-msg p:last-child {
          margin-bottom: 0;
        }
        .md-msg strong, .md-msg b {
          color: #fff;
          font-weight: 700;
        }
        .md-msg em, .md-msg i {
          font-style: italic;
          color: #CBD5E1;
        }
        .md-msg h1, .md-msg h2, .md-msg h3, .md-msg h4 {
          color: #fff;
          font-weight: 700;
          margin: 10px 0 6px 0;
          line-height: 1.3;
        }
        .md-msg h1 { font-size: 16px; }
        .md-msg h2 { font-size: 15px; }
        .md-msg h3 { font-size: 14px; }
        .md-msg h4 { font-size: 13px; }
        .md-msg ul, .md-msg ol {
          margin: 4px 0 8px 0;
          padding-left: 18px;
        }
        .md-msg ul { list-style-type: disc; }
        .md-msg ol { list-style-type: decimal; }
        .md-msg li {
          margin: 3px 0;
          line-height: 1.5;
          color: #F1F5F9;
        }
        .md-msg li::marker {
          color: var(--agent-color, #7CB9FF);
          opacity: 0.7;
        }
        .md-msg code {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          padding: 1px 5px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 12px;
          color: #93C5FD;
          word-break: break-all;
        }
        .md-msg pre {
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          padding: 10px 12px;
          margin: 8px 0;
          overflow-x: auto;
          max-height: 300px;
        }
        .md-msg pre code {
          background: transparent;
          border: none;
          padding: 0;
          font-size: 12px;
          color: #CBD5E1;
          word-break: normal;
          white-space: pre;
        }
        .md-msg blockquote {
          border-left: 3px solid var(--agent-color, #7CB9FF);
          margin: 6px 0;
          padding: 4px 10px;
          color: #8BA4C4;
          font-style: italic;
          background: rgba(255,255,255,0.03);
          border-radius: 0 4px 4px 0;
        }
        .md-msg a {
          color: var(--agent-color, #7CB9FF);
          text-decoration: underline;
          text-underline-offset: 2px;
          word-break: break-all;
        }
        .md-msg hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.1);
          margin: 10px 0;
        }
        .md-msg table {
          border-collapse: collapse;
          width: 100%;
          margin: 8px 0;
          font-size: 12px;
        }
        .md-msg th {
          background: rgba(255,255,255,0.08);
          color: #fff;
          font-weight: 600;
          padding: 5px 8px;
          border: 1px solid rgba(255,255,255,0.1);
          text-align: left;
        }
        .md-msg td {
          padding: 4px 8px;
          border: 1px solid rgba(255,255,255,0.07);
          color: #CBD5E1;
        }
        .md-msg tr:nth-child(even) td {
          background: rgba(255,255,255,0.03);
        }
        /* Approve animation: green glow flash then fade+slide out */
        @keyframes approveGlow {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0); border-color: rgba(234,179,8,0.45); }
          25%  { box-shadow: 0 0 0 6px rgba(34,197,94,0.5), 0 0 24px rgba(34,197,94,0.4); border-color: rgba(34,197,94,0.9); }
          60%  { box-shadow: 0 0 0 10px rgba(34,197,94,0.2), 0 0 40px rgba(34,197,94,0.25); border-color: rgba(34,197,94,0.7); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); border-color: rgba(34,197,94,0.3); }
        }
        @keyframes approveFadeOut {
          0%   { opacity: 1; transform: translateY(0) scaleY(1); max-height: 200px; }
          100% { opacity: 0; transform: translateY(-8px) scaleY(0.92); max-height: 0; padding: 0; margin: 0; }
        }
        .task-approving {
          animation: approveGlow 300ms ease-out forwards;
        }
        .task-approved {
          animation: approveFadeOut 250ms ease-in forwards;
          overflow: hidden;
          pointer-events: none;
        }
        /* Deny animation: red glow flash then fade+slide out */
        @keyframes denyGlow {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0); border-color: rgba(234,179,8,0.45); }
          25%  { box-shadow: 0 0 0 6px rgba(239,68,68,0.5), 0 0 24px rgba(239,68,68,0.4); border-color: rgba(239,68,68,0.9); }
          60%  { box-shadow: 0 0 0 10px rgba(239,68,68,0.2), 0 0 40px rgba(239,68,68,0.25); border-color: rgba(239,68,68,0.7); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); border-color: rgba(239,68,68,0.3); }
        }
        @keyframes denyFadeOut {
          0%   { opacity: 1; transform: translateY(0) scaleY(1); max-height: 200px; }
          100% { opacity: 0; transform: translateY(-8px) scaleY(0.92); max-height: 0; padding: 0; margin: 0; }
        }
        .task-denying {
          animation: denyGlow 300ms ease-out forwards;
        }
        .task-denied {
          animation: denyFadeOut 250ms ease-in forwards;
          overflow: hidden;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
