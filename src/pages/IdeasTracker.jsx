import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, Plus, Pencil, Check, ArrowLeft, Phone } from 'lucide-react'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from 'd3-force'
import ideasData from '../data/ideas.json'

/* ================================================================== */
/*  IDEAS TRACKER / BRAIN MAP                                          */
/*  D3.js force simulation + neural network visualization              */
/*  Route: /ideas                                                      */
/* ================================================================== */

const STORAGE_KEY = 'aom_ideas_data'

function loadIdeas() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) { /* ignore */ }
  return ideasData
}

function saveIdeas(ideas) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas)) } catch (e) { /* ignore */ }
}

// ── Color System ─────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  product:        { fill: '#2D1509', glow: '#E85D26', glowRgb: '232,93,38' },
  revenue:        { fill: '#2D2209', glow: '#D4A843', glowRgb: '212,168,67' },
  system:         { fill: '#1A2617', glow: '#7C9A72', glowRgb: '124,154,114' },
  content:        { fill: '#1F1D1A', glow: '#F5F0EB', glowRgb: '245,240,235' },
  'side-project': { fill: '#1A1918', glow: '#78716C', glowRgb: '120,113,108' },
}

const STATUS_COLORS = {
  seed:    '#78716C',
  growing: '#7C9A72',
  active:  '#E85D26',
  shipped: '#D4A843',
  parked:  '#44403C',
}

const STATUS_CONFIG = {
  seed:    { intensity: 0.20, opacity: 0.70, pulseSpeed: 4000, pulseRange: [0.6, 1.0] },
  growing: { intensity: 0.40, opacity: 0.85, pulseSpeed: 3000, pulseRange: [0.7, 1.0] },
  active:  { intensity: 0.80, opacity: 1.00, pulseSpeed: 2500, pulseRange: [0.85, 1.0] },
  shipped: { intensity: 0.60, opacity: 1.00, pulseSpeed: 0, pulseRange: [1, 1] },
  parked:  { intensity: 0.10, opacity: 0.50, pulseSpeed: 0, pulseRange: [1, 1] },
}

const CONNECTION_STYLES = {
  feeds:    { dash: 'none', width: 1.5, arrow: true },
  related:  { dash: 'none', width: 1, arrow: false },
  depends:  { dash: '4 4', width: 1.5, arrow: true },
  competes: { dash: '2 3', width: 1, arrow: false },
}

function getNodeSize(progress) {
  return Math.round(36 + (progress * 0.28))
}

function isStagnant(idea) {
  if (idea.status === 'parked' || idea.status === 'shipped') return false
  const last = new Date(idea.lastActivity)
  const now = new Date()
  const days = (now - last) / (1000 * 60 * 60 * 24)
  return days > 7
}

function timeAgo(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

// ── CSS Keyframes (injected once) ────────────────────────────────────
const STYLE_ID = 'ideas-tracker-keyframes'
function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

    @keyframes nodePulse {
      0%, 100% { opacity: var(--pulse-min); }
      50% { opacity: var(--pulse-max); }
    }

    @keyframes firingBurst {
      0% { transform: scale(1); opacity: 0.4; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    @keyframes dashScroll {
      to { stroke-dashoffset: -16; }
    }

    .ideas-tracker-scrollbar::-webkit-scrollbar { width: 4px; }
    .ideas-tracker-scrollbar::-webkit-scrollbar-track { background: #141412; }
    .ideas-tracker-scrollbar::-webkit-scrollbar-thumb { background: #292524; border-radius: 2px; }
    .ideas-tracker-scrollbar::-webkit-scrollbar-thumb:hover { background: #44403C; }

    @keyframes slideInRight {
      from { transform: translateX(400px); }
      to { transform: translateX(0); }
    }
    @keyframes slideInBottom {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    @media (max-width: 767px) {
      .ideas-filter-desktop { display: none !important; }
      .ideas-filter-mobile { display: block !important; }
      .ideas-add-label { display: none !important; }
      .ideas-add-btn { width: 44px !important; height: 44px !important; border-radius: 50% !important; padding: 0 !important; justify-content: center !important; }
    }
    @media (min-width: 768px) {
      .ideas-filter-mobile { display: none !important; }
    }
  `
  document.head.appendChild(style)
}

// ── D3 Force Simulation Hook ─────────────────────────────────────────
function useForceSimulation(ideas, width, height) {
  const [positions, setPositions] = useState({})
  const simRef = useRef(null)
  const nodesRef = useRef([])

  useEffect(() => {
    if (!ideas.length || !width || !height) return

    // Build node data. Preserve existing positions if available.
    const prevPositions = {}
    nodesRef.current.forEach(n => { prevPositions[n.id] = { x: n.x, y: n.y } })

    const statusOrder = { active: 0, shipped: 1, growing: 2, seed: 3, parked: 4 }
    const cx = width / 2
    const cy = height / 2

    const nodes = ideas.map((idea, i) => {
      const prev = prevPositions[idea.id]
      if (prev) return { ...idea, x: prev.x, y: prev.y, _idx: i }
      // Initial placement in rings by status
      const ring = statusOrder[idea.status] ?? 3
      const baseRadius = 80 + ring * 70
      const nodesInRing = ideas.filter(s => (statusOrder[s.status] ?? 3) === ring).length
      const indexInRing = ideas.filter((s, j) => j < i && (statusOrder[s.status] ?? 3) === ring).length
      const angle = (indexInRing / Math.max(nodesInRing, 1)) * Math.PI * 2 + ring * 0.7
      return {
        ...idea,
        x: cx + Math.cos(angle) * baseRadius + (Math.random() - 0.5) * 40,
        y: cy + Math.sin(angle) * baseRadius + (Math.random() - 0.5) * 40,
        _idx: i,
      }
    })
    nodesRef.current = nodes

    // Build link data from connections
    const nodeMap = {}
    nodes.forEach(n => { nodeMap[n.id] = n })
    const links = []
    ideas.forEach(idea => {
      (idea.connections || []).forEach(conn => {
        if (nodeMap[conn.targetId]) {
          links.push({
            source: idea.id,
            target: conn.targetId,
            type: conn.type,
          })
        }
      })
    })

    // Kill previous sim
    if (simRef.current) simRef.current.stop()

    const sim = forceSimulation(nodes)
      .force('link', forceLink(links).id(d => d.id).distance(160).strength(0.4))
      .force('charge', forceManyBody().strength(-300).distanceMax(500))
      .force('center', forceCenter(cx, cy).strength(0.05))
      .force('collide', forceCollide().radius(d => getNodeSize(d.progress) / 2 + 30).strength(0.7))
      .force('x', forceX(cx).strength(0.02))
      .force('y', forceY(cy).strength(0.02))
      .alphaDecay(0.02)
      .velocityDecay(0.3)

    sim.on('tick', () => {
      const pos = {}
      nodes.forEach(n => {
        // Clamp to visible bounds
        const pad = 60
        n.x = Math.max(pad, Math.min(width - pad, n.x))
        n.y = Math.max(pad + 56, Math.min(height - pad, n.y))
        pos[n.id] = { x: n.x, y: n.y }
      })
      setPositions({ ...pos })
    })

    simRef.current = sim

    return () => { sim.stop() }
  }, [ideas, width, height])

  // Expose reheat for drag
  const reheat = useCallback(() => {
    if (simRef.current) {
      simRef.current.alphaTarget(0.3).restart()
    }
  }, [])

  const cool = useCallback(() => {
    if (simRef.current) {
      simRef.current.alphaTarget(0)
    }
  }, [])

  const updateNodePosition = useCallback((id, x, y) => {
    const node = nodesRef.current.find(n => n.id === id)
    if (node) {
      node.fx = x
      node.fy = y
    }
  }, [])

  const releaseNode = useCallback((id) => {
    const node = nodesRef.current.find(n => n.id === id)
    if (node) {
      node.fx = null
      node.fy = null
    }
  }, [])

  return { positions, reheat, cool, updateNodePosition, releaseNode }
}

// ── SVG Glow Filters ─────────────────────────────────────────────────
function GlowFilters() {
  return (
    <defs>
      {Object.entries(CATEGORY_COLORS).map(([key, { glow }]) => (
        <filter key={key} id={`glow-${key}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur1" />
          <feFlood floodColor={glow} floodOpacity="0.3" result="color1" />
          <feComposite in="color1" in2="blur1" operator="in" result="glow1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur2" />
          <feFlood floodColor={glow} floodOpacity="0.12" result="color2" />
          <feComposite in="color2" in2="blur2" operator="in" result="glow2" />
          <feMerge>
            <feMergeNode in="glow2" />
            <feMergeNode in="glow1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      ))}
      {/* Arrowhead markers */}
      {Object.entries(CATEGORY_COLORS).map(([key, { glow }]) => (
        <React.Fragment key={`arrows-${key}`}>
          <marker id={`arrow-default-${key}`} viewBox="0 0 10 10" refX="10" refY="5"
            markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#292524" />
          </marker>
          <marker id={`arrow-highlight-${key}`} viewBox="0 0 10 10" refX="10" refY="5"
            markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={glow} />
          </marker>
        </React.Fragment>
      ))}
      <marker id="arrow-default" viewBox="0 0 10 10" refX="10" refY="5"
        markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#292524" />
      </marker>
    </defs>
  )
}

// ── Node Component ───────────────────────────────────────────────────
function IdeaNode({
  idea, pos, isHovered, isConnected, isDimmed, isFiltered,
  onClick, onMouseEnter, onMouseLeave, onDragStart
}) {
  const size = getNodeSize(idea.progress)
  const cat = CATEGORY_COLORS[idea.category] || CATEGORY_COLORS.product
  const cfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.seed
  const stagnant = isStagnant(idea)
  const firingRef = useRef(null)
  const [showBurst, setShowBurst] = useState(false)

  // Firing burst for active nodes
  useEffect(() => {
    if (idea.status !== 'active') return
    const delay = Math.random() * 5000
    const fire = () => {
      setShowBurst(true)
      setTimeout(() => setShowBurst(false), 800)
    }
    const timeout = setTimeout(() => {
      fire()
      firingRef.current = setInterval(fire, 5000 + Math.random() * 5000)
    }, delay)
    return () => {
      clearTimeout(timeout)
      if (firingRef.current) clearInterval(firingRef.current)
    }
  }, [idea.status])

  if (!pos) return null

  let nodeOpacity = cfg.opacity
  if (stagnant) nodeOpacity = 0.65
  if (isDimmed) nodeOpacity = 0.30
  if (!isFiltered) nodeOpacity = 0.15

  const showLabel = idea.status === 'active' || idea.status === 'shipped' || isHovered || isConnected

  const pulseStyle = cfg.pulseSpeed > 0 ? {
    animation: `nodePulse ${stagnant ? 6000 : cfg.pulseSpeed}ms ease-in-out infinite`,
    '--pulse-min': cfg.pulseRange[0],
    '--pulse-max': cfg.pulseRange[1],
  } : {}

  const glowIntensity = stagnant ? cfg.intensity * 0.6 : cfg.intensity

  return (
    <g
      style={{ cursor: 'pointer', transition: 'opacity 300ms ease' }}
      opacity={nodeOpacity}
      onClick={(e) => { e.stopPropagation(); onClick(idea) }}
      onMouseEnter={() => onMouseEnter(idea.id)}
      onMouseLeave={onMouseLeave}
      onMouseDown={(e) => { e.stopPropagation(); onDragStart(e, idea.id) }}
    >
      {/* Invisible touch target (min 44px) */}
      <circle
        cx={pos.x} cy={pos.y} r={Math.max(size / 2, 22)}
        fill="transparent" stroke="none"
      />

      {/* Firing burst */}
      {showBurst && (
        <circle
          cx={pos.x} cy={pos.y} r={size / 2}
          fill="none"
          stroke={cat.glow}
          strokeWidth={2}
          opacity={0.4}
          style={{
            animation: 'firingBurst 800ms ease-out forwards',
            transformOrigin: `${pos.x}px ${pos.y}px`,
          }}
        />
      )}

      {/* Outer glow (SVG blur) */}
      <circle
        cx={pos.x} cy={pos.y} r={size / 2 + 4}
        fill={cat.glow}
        opacity={glowIntensity * 0.15}
        filter={`url(#glow-${idea.category})`}
        style={pulseStyle}
      />

      {/* Shipped ring */}
      {idea.status === 'shipped' && (
        <circle
          cx={pos.x} cy={pos.y} r={size / 2 + 4}
          fill="none" stroke="#D4A843" strokeWidth={2}
        />
      )}

      {/* Main node circle */}
      <circle
        cx={pos.x} cy={pos.y} r={size / 2}
        fill={cat.fill}
        stroke={cat.glow}
        strokeWidth={0.5}
        strokeOpacity={glowIntensity * 0.5}
        style={{
          filter: stagnant ? 'saturate(0.6)' : 'none',
          ...pulseStyle,
        }}
      />

      {/* Inner bright center */}
      <circle
        cx={pos.x} cy={pos.y} r={size / 4}
        fill={cat.glow}
        opacity={glowIntensity * 0.2}
        style={pulseStyle}
      />

      {/* Status badge */}
      {showLabel && (
        <g style={{ transition: 'opacity 150ms ease' }}>
          <rect
            x={pos.x - 32} y={pos.y - size / 2 - 22}
            width={64} height={18}
            rx={2} fill="rgba(0,0,0,0.7)"
          />
          <text
            x={pos.x} y={pos.y - size / 2 - 10}
            textAnchor="middle"
            fill={STATUS_COLORS[idea.status]}
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              fontSize: '10px',
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
            }}
          >
            {idea.status}
          </text>
        </g>
      )}

      {/* Node title */}
      {showLabel && (
        <text
          x={pos.x} y={pos.y + size / 2 + 18}
          textAnchor="middle"
          fill="#F5F0EB"
          style={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            fontSize: '14px',
            transition: 'opacity 150ms ease',
            pointerEvents: 'none',
          }}
        >
          {idea.title.length > 20 ? idea.title.slice(0, 18) + '...' : idea.title}
        </text>
      )}
    </g>
  )
}

// ── Connection Lines ─────────────────────────────────────────────────
function ConnectionLine({ source, target, type, sourceIdea, isHighlighted, isDimmed, isFiltered }) {
  if (!source || !target) return null
  const style = CONNECTION_STYLES[type] || CONNECTION_STYLES.related
  const cat = CATEGORY_COLORS[sourceIdea?.category] || CATEGORY_COLORS.product

  let strokeColor = '#292524'
  let strokeOpacity = isDimmed ? 0.15 : (isFiltered ? 1 : 0.15)
  if (isHighlighted) {
    strokeColor = cat.glow
    strokeOpacity = type === 'related' ? 0.6 : 1
  }

  const dx = target.x - source.x
  const dy = target.y - source.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return null
  const ux = dx / len
  const uy = dy / len

  const sourceSize = getNodeSize(sourceIdea?.progress || 0)
  const s = { x: source.x + ux * (sourceSize / 2 + 4), y: source.y + uy * (sourceSize / 2 + 4) }
  const t = { x: target.x - ux * 28, y: target.y - uy * 28 }

  const markerId = style.arrow
    ? (isHighlighted ? `arrow-highlight-${sourceIdea?.category || 'product'}` : 'arrow-default')
    : undefined

  return (
    <g style={{ transition: 'opacity 300ms ease' }} opacity={strokeOpacity}>
      <line
        x1={s.x} y1={s.y} x2={t.x} y2={t.y}
        stroke={strokeColor}
        strokeWidth={style.width}
        strokeDasharray={style.dash === 'none' ? undefined : style.dash}
        markerEnd={markerId ? `url(#${markerId})` : undefined}
        style={type === 'depends' ? { animation: 'dashScroll 4000ms linear infinite' } : {}}
      />
    </g>
  )
}

// ── Detail Panel ─────────────────────────────────────────────────────
function DetailPanel({ idea, ideas, onClose, onNavigate, onEdit, isMobile, isTablet }) {
  if (!idea) return null
  const cat = CATEGORY_COLORS[idea.category] || CATEGORY_COLORS.product
  const [showMore, setShowMore] = useState(false)

  const panelStyle = isMobile ? {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: '#141412', zIndex: 100,
    animation: 'slideInRight 250ms ease-out',
    overflowY: 'auto',
  } : isTablet ? {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    height: '50vh', background: '#141412',
    borderTop: '1px solid #292524',
    borderRadius: '12px 12px 0 0',
    zIndex: 100, overflowY: 'auto',
    animation: 'slideInBottom 250ms ease-out',
  } : {
    width: 400, height: '100vh', background: '#141412',
    borderLeft: '1px solid #292524',
    overflowY: 'auto', flexShrink: 0,
    animation: 'slideInRight 250ms ease-out',
  }

  const connections = idea.connections || []
  const connectedIdeas = connections.map(c => ({
    ...c,
    idea: ideas.find(i => i.id === c.targetId),
  })).filter(c => c.idea)

  return (
    <div style={panelStyle} className="ideas-tracker-scrollbar">
      {/* Glow bleed on left edge */}
      {!isMobile && !isTablet && (
        <div style={{
          position: 'absolute', left: 0, top: 60, width: 4, height: 120,
          background: `linear-gradient(to bottom, ${cat.glow}4D, transparent)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Tablet handle */}
      {isTablet && (
        <div style={{
          width: 40, height: 4, background: '#292524', borderRadius: 2,
          margin: '12px auto 0',
        }} />
      )}

      <div style={{ padding: isMobile ? 24 : 32 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {isMobile && (
              <button onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#78716C', marginRight: 8, padding: 4,
              }}>
                <ArrowLeft size={20} />
              </button>
            )}
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: STATUS_COLORS[idea.status],
              background: `${STATUS_COLORS[idea.status]}26`,
              padding: '4px 10px', borderRadius: 2,
            }}>
              {idea.status}
            </span>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
              fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#78716C',
            }}>
              {idea.category}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => onEdit(idea)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#78716C', padding: 8, transition: 'color 150ms',
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#F5F0EB'}
              onMouseLeave={e => e.currentTarget.style.color = '#78716C'}
            >
              <Pencil size={16} />
            </button>
            {!isMobile && (
              <button onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#78716C', padding: 8, transition: 'color 150ms',
              }}
                onMouseEnter={e => e.currentTarget.style.color = '#F5F0EB'}
                onMouseLeave={e => e.currentTarget.style.color = '#78716C'}
              >
                <X size={24} />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: '"Syne", sans-serif', fontWeight: 700,
          fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.01em',
          color: '#F5F0EB', margin: 0, marginTop: 16,
        }}>
          {idea.title}
        </h2>

        {/* Description */}
        <p style={{
          fontFamily: '"Space Grotesk", sans-serif', fontWeight: 400,
          fontSize: 16, lineHeight: 1.5, color: '#A8A29E',
          marginTop: 8, marginBottom: 0,
          ...(showMore ? {} : {
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }),
        }}>
          {idea.description}
        </p>
        {idea.description && idea.description.length > 120 && (
          <button onClick={() => setShowMore(!showMore)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 14,
            color: '#E85D26', padding: 0, marginTop: 4,
          }}>
            {showMore ? 'show less' : 'show more'}
          </button>
        )}

        {/* Progress bar */}
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <div style={{
            width: '100%', height: 6, borderRadius: 3,
            background: '#1A1A17', overflow: 'hidden',
          }}>
            <div style={{
              width: `${idea.progress}%`, height: '100%',
              background: cat.glow, borderRadius: 3,
              transition: 'width 400ms ease-out',
            }} />
          </div>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
            fontSize: 12, color: cat.glow, textAlign: 'right', marginTop: 4,
          }}>
            {idea.progress}%
          </div>
        </div>

        {/* Milestones */}
        {idea.milestones && idea.milestones.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#78716C', marginBottom: 12,
            }}>
              MILESTONES
            </div>
            {idea.milestones.map((m, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', height: 32, gap: 12,
                marginBottom: 4,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...(m.done
                    ? { background: cat.glow }
                    : { border: '2px solid #292524', background: 'transparent' }
                  ),
                }}>
                  {m.done && <Check size={10} color="#0C0C0C" strokeWidth={3} />}
                </div>
                <span style={{
                  fontFamily: '"Space Grotesk", sans-serif', fontWeight: 400,
                  fontSize: 16, lineHeight: 1.4,
                  color: m.done ? '#78716C' : '#F5F0EB',
                  textDecoration: m.done ? 'line-through' : 'none',
                }}>
                  {m.text}
                </span>
              </div>
            ))}
            <div style={{ borderBottom: '1px solid #292524', marginTop: 12 }} />
          </div>
        )}

        {/* Connections */}
        {connectedIdeas.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#78716C', marginBottom: 12, marginTop: 24,
            }}>
              CONNECTED TO
            </div>
            {connectedIdeas.map((conn, i) => {
              const connCat = CATEGORY_COLORS[conn.idea.category] || CATEGORY_COLORS.product
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', height: 36, gap: 10,
                  marginBottom: 2, cursor: 'pointer',
                }}
                  onClick={() => onNavigate(conn.idea)}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: connCat.glow, flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontWeight: 500,
                    fontSize: 14, color: '#F5F0EB', flex: 1,
                  }}
                    onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.target.style.textDecoration = 'none'}
                  >
                    {conn.idea.title}
                  </span>
                  <span style={{
                    fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
                    fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: '#78716C',
                  }}>
                    {conn.type}
                  </span>
                </div>
              )
            })}
            <div style={{ borderBottom: '1px solid #292524', marginTop: 12 }} />
          </div>
        )}

        {/* Meta */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '16px 32px', marginTop: 24, marginBottom: 24,
        }}>
          <div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#78716C',
            }}>OWNER</div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
              fontSize: 12, color: '#A8A29E', marginTop: 4,
            }}>{idea.owner}</div>
          </div>
          <div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#78716C',
            }}>CREATED</div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
              fontSize: 12, color: '#A8A29E', marginTop: 4,
            }}>{idea.created}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#78716C',
            }}>LAST ACTIVITY</div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
              fontSize: 12, color: '#A8A29E', marginTop: 4,
            }}>{idea.lastActivity} ({timeAgo(idea.lastActivity)})</div>
          </div>
        </div>
        <div style={{ borderBottom: '1px solid #292524' }} />

        {/* Notes */}
        {idea.notes && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#78716C', marginBottom: 12,
            }}>NOTES</div>
            <div style={{
              background: '#1A1A17', border: '1px solid #292524', borderRadius: 2,
              padding: 12, fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 16, lineHeight: 1.5, color: '#A8A29E', minHeight: 80,
            }}>
              {idea.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Filter Bar ───────────────────────────────────────────────────────
function FilterBar({ statusFilters, categoryFilters, onToggleStatus, onToggleCategory, onClear, onAddClick }) {
  const hasFilters = statusFilters.length > 0 || categoryFilters.length > 0
  const [mobileOpen, setMobileOpen] = useState(false)

  const statusChips = ['seed', 'growing', 'active', 'shipped', 'parked']
  const categoryChips = ['product', 'revenue', 'system', 'content', 'side-project']

  const renderChip = (label, isActive, color, onClick) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
        fontSize: 12, letterSpacing: '0.10em', textTransform: 'uppercase',
        padding: '10px 16px', borderRadius: 2, cursor: 'pointer',
        minHeight: 44,
        background: isActive ? `${color}33` : 'transparent',
        border: `1px solid ${isActive ? color : '#292524'}`,
        color: isActive ? color : '#78716C',
        transition: 'all 150ms ease',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = '#44403C'
          e.currentTarget.style.color = '#A8A29E'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = '#292524'
          e.currentTarget.style.color = '#78716C'
        }
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      <div style={{
        position: 'absolute', top: 130, left: 0, right: 0,
        minHeight: 56, zIndex: 50,
        display: 'flex', alignItems: 'center',
        padding: '6px 24px', gap: 8,
        background: 'rgba(10,10,8,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Desktop/Tablet: inline chips */}
        <div className="ideas-filter-desktop" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          flex: 1, overflowX: 'auto',
        }}>
          {statusChips.map(s =>
            renderChip(s, statusFilters.includes(s), STATUS_COLORS[s], () => onToggleStatus(s))
          )}
          <div style={{ width: 1, height: 24, background: '#292524', margin: '0 8px', flexShrink: 0 }} />
          {categoryChips.map(c =>
            renderChip(c, categoryFilters.includes(c),
              (CATEGORY_COLORS[c] || CATEGORY_COLORS.product).glow,
              () => onToggleCategory(c)
            )
          )}
          {hasFilters && (
            <button onClick={onClear} style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
              fontSize: 11, color: '#78716C', background: 'none',
              border: 'none', cursor: 'pointer', marginLeft: 8,
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              CLEAR
            </button>
          )}
        </div>

        {/* Mobile: filter button */}
        <div className="ideas-filter-mobile" style={{ display: 'none' }}>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: hasFilters ? '#E85D26' : '#78716C',
              background: 'none', border: `1px solid ${hasFilters ? '#E85D26' : '#292524'}`,
              padding: '6px 14px', borderRadius: 2, cursor: 'pointer',
            }}
          >
            FILTER{hasFilters ? ` (${statusFilters.length + categoryFilters.length})` : ''}
          </button>
        </div>

        {/* Add button */}
        <button
          onClick={onAddClick}
          className="ideas-add-btn"
          style={{
            fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
            fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#78716C', background: 'none',
            border: '1px solid #292524',
            padding: '10px 16px', borderRadius: 2, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            minHeight: 44,
            transition: 'all 150ms ease', flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#E85D26'
            e.currentTarget.style.color = '#E85D26'
            e.currentTarget.style.background = 'rgba(232,93,38,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#292524'
            e.currentTarget.style.color = '#78716C'
            e.currentTarget.style.background = 'none'
          }}
        >
          <Plus size={14} />
          <span className="ideas-add-label">ADD IDEA</span>
        </button>
      </div>

      {/* Mobile bottom sheet */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 90,
            }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#141412', borderTop: '1px solid #292524',
            borderRadius: '12px 12px 0 0', zIndex: 91,
            padding: 24, maxHeight: '60vh', overflowY: 'auto',
            animation: 'slideInBottom 250ms ease-out',
          }}>
            <div style={{
              width: 40, height: 4, background: '#292524', borderRadius: 2,
              margin: '0 auto 20px',
            }} />
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 11, color: '#78716C', letterSpacing: '0.15em',
              marginBottom: 12,
            }}>STATUS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {statusChips.map(s =>
                renderChip(s, statusFilters.includes(s), STATUS_COLORS[s], () => onToggleStatus(s))
              )}
            </div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 11, color: '#78716C', letterSpacing: '0.15em',
              marginBottom: 12,
            }}>CATEGORY</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {categoryChips.map(c =>
                renderChip(c, categoryFilters.includes(c),
                  (CATEGORY_COLORS[c] || CATEGORY_COLORS.product).glow,
                  () => onToggleCategory(c)
                )
              )}
            </div>
            {hasFilters && (
              <button onClick={() => { onClear(); setMobileOpen(false) }} style={{
                fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
                fontSize: 11, color: '#78716C', background: 'none',
                border: 'none', cursor: 'pointer', marginTop: 16,
                textTransform: 'uppercase',
              }}>
                CLEAR ALL
              </button>
            )}
          </div>
        </>
      )}
    </>
  )
}

// ── Add/Edit Panel ───────────────────────────────────────────────────
function AddEditPanel({ idea, onSave, onDelete, onClose, isMobile, isTablet }) {
  const isEdit = !!idea
  const [form, setForm] = useState({
    title: idea?.title || '',
    description: idea?.description || '',
    status: idea?.status || 'seed',
    category: idea?.category || 'product',
    owner: idea?.owner || '',
    notes: idea?.notes || '',
  })

  const panelStyle = isMobile ? {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: '#141412', zIndex: 100, overflowY: 'auto',
    animation: 'slideInRight 250ms ease-out',
  } : isTablet ? {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    height: '50vh', background: '#141412',
    borderTop: '1px solid #292524', borderRadius: '12px 12px 0 0',
    zIndex: 100, overflowY: 'auto',
    animation: 'slideInBottom 250ms ease-out',
  } : {
    width: 400, height: '100vh', background: '#141412',
    borderLeft: '1px solid #292524', overflowY: 'auto',
    flexShrink: 0, animation: 'slideInRight 250ms ease-out',
  }

  const inputStyle = {
    width: '100%', background: '#1A1A17',
    border: '1px solid #292524', borderRadius: 2,
    padding: 12, fontFamily: '"Space Grotesk", sans-serif',
    fontSize: 15, color: '#F5F0EB', outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
    fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
    color: '#78716C', display: 'block', marginBottom: 8,
  }

  const statusChips = ['seed', 'growing', 'active', 'shipped', 'parked']
  const categoryChips = ['product', 'revenue', 'system', 'content', 'side-project']

  return (
    <div style={panelStyle} className="ideas-tracker-scrollbar">
      <div style={{ padding: isMobile ? 24 : 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{
            fontFamily: '"Syne", sans-serif', fontWeight: 700,
            fontSize: 28, color: '#F5F0EB', margin: 0,
          }}>
            {isEdit ? idea.title : 'NEW IDEA'}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#78716C', padding: 8,
          }}>
            <X size={24} />
          </button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>TITLE</label>
          <input
            style={inputStyle}
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="What's the idea?"
            onFocus={e => e.target.style.borderColor = '#E85D26'}
            onBlur={e => e.target.style.borderColor = '#292524'}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>DESCRIPTION</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe it..."
            onFocus={e => e.target.style.borderColor = '#E85D26'}
            onBlur={e => e.target.style.borderColor = '#292524'}
          />
        </div>

        {/* Status */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>STATUS</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {statusChips.map(s => (
              <button key={s} onClick={() => setForm({ ...form, status: s })} style={{
                fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
                fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '6px 14px', borderRadius: 2, cursor: 'pointer',
                background: form.status === s ? `${STATUS_COLORS[s]}26` : 'transparent',
                border: `1px solid ${form.status === s ? STATUS_COLORS[s] : '#292524'}`,
                color: form.status === s ? STATUS_COLORS[s] : '#78716C',
              }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>CATEGORY</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categoryChips.map(c => {
              const color = (CATEGORY_COLORS[c] || CATEGORY_COLORS.product).glow
              return (
                <button key={c} onClick={() => setForm({ ...form, category: c })} style={{
                  fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
                  fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '6px 14px', borderRadius: 2, cursor: 'pointer',
                  background: form.category === c ? `${color}33` : 'transparent',
                  border: `1px solid ${form.category === c ? color : '#292524'}`,
                  color: form.category === c ? color : '#78716C',
                }}>
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        {/* Owner */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>OWNER</label>
          <input
            style={inputStyle}
            value={form.owner}
            onChange={e => setForm({ ...form, owner: e.target.value })}
            placeholder="Agent or person name"
            onFocus={e => e.target.style.borderColor = '#E85D26'}
            onBlur={e => e.target.style.borderColor = '#292524'}
          />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 32 }}>
          <label style={labelStyle}>NOTES</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Add notes..."
            onFocus={e => e.target.style.borderColor = '#E85D26'}
            onBlur={e => e.target.style.borderColor = '#292524'}
          />
        </div>

        {/* Save */}
        <button
          onClick={() => onSave(form)}
          disabled={!form.title.trim()}
          style={{
            width: '100%', padding: '14px 0',
            background: form.title.trim() ? '#E85D26' : '#292524',
            color: form.title.trim() ? '#FDF6EC' : '#44403C',
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
            fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em',
            border: 'none', borderRadius: 0, cursor: form.title.trim() ? 'pointer' : 'not-allowed',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => {
            if (form.title.trim()) {
              e.currentTarget.style.background = '#D14E1C'
              e.currentTarget.style.boxShadow = '0 0 16px rgba(232,93,38,0.15)'
            }
          }}
          onMouseLeave={e => {
            if (form.title.trim()) {
              e.currentTarget.style.background = '#E85D26'
              e.currentTarget.style.boxShadow = 'none'
            }
          }}
        >
          {isEdit ? 'SAVE CHANGES' : 'CREATE IDEA'}
        </button>

        {/* Delete (edit mode) */}
        {isEdit && onDelete && (
          <button
            onClick={() => {
              if (window.confirm('Delete this idea?')) onDelete(idea.id)
            }}
            style={{
              width: '100%', marginTop: 12, padding: '10px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600,
              fontSize: 12, textTransform: 'uppercase', color: '#78716C',
              transition: 'color 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#78716C'}
          >
            DELETE IDEA
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Ideas Tracker Page ──────────────────────────────────────────
export default function IdeasTracker() {
  const [ideas, setIdeasRaw] = useState(loadIdeas)
  const [selectedIdea, setSelectedIdea] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [statusFilters, setStatusFilters] = useState([])
  const [categoryFilters, setCategoryFilters] = useState([])
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [editIdea, setEditIdea] = useState(null)

  // Persist ideas to localStorage on every change
  const setIdeas = useCallback((updater) => {
    setIdeasRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveIdeas(next)
      return next
    })
  }, [])

  // Canvas state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const didPanRef = useRef(false)
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 800 })

  // Node dragging
  const [draggingNodeId, setDraggingNodeId] = useState(null)
  const dragStartRef = useRef({ x: 0, y: 0 })

  // Responsive
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const isMobile = windowWidth < 768
  const isTablet = windowWidth >= 768 && windowWidth < 1024
  const isDesktop = windowWidth >= 1024

  // Inject keyframes
  useEffect(() => { injectKeyframes() }, [])

  // Measure canvas size
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasSize({ w: rect.width, h: rect.height })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // D3 Force Simulation
  const { positions, reheat, cool, updateNodePosition, releaseNode } =
    useForceSimulation(ideas, canvasSize.w, canvasSize.h)

  // Connected ids for hovered node
  const connectedIds = useMemo(() => {
    if (!hoveredId) return new Set()
    const idea = ideas.find(i => i.id === hoveredId)
    if (!idea) return new Set()
    const ids = new Set()
    idea.connections?.forEach(c => ids.add(c.targetId))
    ideas.forEach(i => {
      i.connections?.forEach(c => {
        if (c.targetId === hoveredId) ids.add(i.id)
      })
    })
    return ids
  }, [hoveredId, ideas])

  // Filter logic
  const isIdeaFiltered = useCallback((idea) => {
    if (statusFilters.length === 0 && categoryFilters.length === 0) return true
    const statusMatch = statusFilters.length === 0 || statusFilters.includes(idea.status)
    const categoryMatch = categoryFilters.length === 0 || categoryFilters.includes(idea.category)
    return statusMatch && categoryMatch
  }, [statusFilters, categoryFilters])

  // Node drag handlers
  const handleNodeDragStart = useCallback((e, nodeId) => {
    e.preventDefault()
    setDraggingNodeId(nodeId)
    didPanRef.current = false
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragStartRef.current = { x: clientX, y: clientY }
    reheat()
  }, [reheat])

  const handleMouseMove = useCallback((e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    if (draggingNodeId) {
      didPanRef.current = true
      // Convert screen coordinates to SVG coordinates
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const svgX = (clientX - rect.left - pan.x) / scale
        const svgY = (clientY - rect.top - pan.y) / scale
        updateNodePosition(draggingNodeId, svgX, svgY)
      }
      return
    }

    if (isPanning) {
      didPanRef.current = true
      setPan({ x: clientX - panStart.x, y: clientY - panStart.y })
    }
  }, [draggingNodeId, isPanning, panStart, pan, scale, updateNodePosition])

  const handleMouseUp = useCallback(() => {
    if (draggingNodeId) {
      releaseNode(draggingNodeId)
      cool()
      setDraggingNodeId(null)
      return
    }
    setIsPanning(false)
  }, [draggingNodeId, releaseNode, cool])

  // Pan handlers
  const handleCanvasMouseDown = useCallback((e) => {
    if (draggingNodeId) return
    setIsPanning(true)
    didPanRef.current = false
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [pan, draggingNodeId])

  // Touch pan
  const handleTouchStart = useCallback((e) => {
    if (draggingNodeId) return
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setIsPanning(true)
      didPanRef.current = false
      setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y })
    }
  }, [pan, draggingNodeId])

  // Zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const delta = e.deltaY > 0 ? 0.92 : 1.08
    const newScale = Math.min(3, Math.max(0.3, scale * delta))

    // Zoom towards cursor position
    const scaleDiff = newScale / scale
    setPan(prev => ({
      x: mouseX - (mouseX - prev.x) * scaleDiff,
      y: mouseY - (mouseY - prev.y) * scaleDiff,
    }))
    setScale(newScale)
  }, [scale])

  // Double-click reset
  const handleDoubleClick = useCallback((e) => {
    if (e.target.closest('circle') || e.target.closest('text')) return
    setPan({ x: 0, y: 0 })
    setScale(1)
  }, [])

  // Navigate to connected idea
  const handleNavigate = useCallback((idea) => {
    setSelectedIdea(idea)
    const pos = positions[idea.id]
    if (pos && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setPan({
        x: rect.width / 2 - pos.x * scale,
        y: rect.height / 2 - pos.y * scale,
      })
    }
  }, [positions, scale])

  // Add/Edit handlers
  const handleSave = useCallback((formData) => {
    if (editIdea) {
      setIdeas(prev => prev.map(i =>
        i.id === editIdea.id ? { ...i, ...formData, lastActivity: new Date().toISOString().slice(0, 10) } : i
      ))
      setEditIdea(null)
    } else {
      const newIdea = {
        id: `idea-${Date.now()}`,
        ...formData,
        progress: 0,
        created: new Date().toISOString().slice(0, 10),
        lastActivity: new Date().toISOString().slice(0, 10),
        milestones: [],
        connections: [],
      }
      setIdeas(prev => [...prev, newIdea])
      setShowAddPanel(false)
    }
  }, [editIdea, setIdeas])

  const handleDelete = useCallback((id) => {
    setIdeas(prev => prev.filter(i => i.id !== id))
    setSelectedIdea(null)
    setEditIdea(null)
  }, [setIdeas])

  // Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (showAddPanel) setShowAddPanel(false)
        else if (editIdea) setEditIdea(null)
        else if (selectedIdea) setSelectedIdea(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showAddPanel, editIdea, selectedIdea])

  // Build connection data
  const allConnections = ideas.flatMap(idea =>
    (idea.connections || []).filter(conn => positions[idea.id] && positions[conn.targetId]).map(conn => ({
      sourceId: idea.id,
      targetId: conn.targetId,
      type: conn.type,
      sourceIdea: idea,
    }))
  )

  const panelOpen = selectedIdea || showAddPanel || editIdea

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: '#0C0C0C', display: 'flex', flexDirection: 'column',
      position: 'relative',
      fontFamily: '"Space Grotesk", sans-serif',
    }}>
      {/* Nav bar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
        background: 'rgba(12,12,12,0.90)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          maxWidth: 1152, margin: '0 auto', padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <a href="/" style={{
            fontFamily: '"Syne", sans-serif', fontSize: 18, fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '-0.02em',
            color: '#F5F0EB', textDecoration: 'none',
          }}>
            AOM
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="/briefs" style={{
              fontFamily: '"Space Grotesk", sans-serif', fontSize: 16,
              color: '#A89F96', textDecoration: 'none',
            }}>Briefs</a>
            <a href="/book" style={{
              fontFamily: '"Space Grotesk", sans-serif', fontSize: 16,
              color: '#A89F96', textDecoration: 'none',
            }}>Book</a>
            <a href="tel:6023732164" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: '"Space Grotesk", sans-serif', fontSize: 16,
              color: '#A89F96', textDecoration: 'none',
            }}>
              <Phone size={14} /> (602) 373-2164
            </a>
          </div>
        </div>
      </nav>

      {/* Pattern strip (brand consistency) */}
      <div style={{
        position: 'fixed', top: 56, left: 0, right: 0, zIndex: 55,
        height: 2, background: '#E85D26', opacity: 0.6,
      }} />

      {/* Page heading */}
      <h1 style={{
        position: 'fixed', top: 60, left: 0, right: 0, zIndex: 55,
        fontFamily: '"Syne", sans-serif', fontWeight: 800,
        fontSize: isMobile ? 36 : 52, textTransform: 'uppercase',
        letterSpacing: '-0.02em', color: '#F0ECE6',
        textAlign: 'center', margin: 0, padding: '16px 24px 12px',
        background: 'linear-gradient(to bottom, rgba(12,12,12,0.95) 0%, rgba(12,12,12,0.7) 80%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        IDEAS TRACKER
      </h1>

      {/* Main content area */}
      <div style={{ display: 'flex', flex: 1 }}>

      {/* Canvas area */}
      <div
        ref={containerRef}
        style={{
          flex: 1, height: '100vh',
          position: 'relative', overflow: 'hidden',
          cursor: draggingNodeId ? 'grabbing' : isPanning ? 'grabbing' : 'grab',
          transition: panelOpen && isDesktop ? 'flex 250ms ease-out' : undefined,
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Dot grid background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Noise overlay */}
        <svg style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', opacity: 0.03, mixBlendMode: 'overlay',
        }}>
          <filter id="noise-bg">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise-bg)" />
        </svg>

        {/* Filter bar */}
        <FilterBar
          statusFilters={statusFilters}
          categoryFilters={categoryFilters}
          onToggleStatus={(s) => setStatusFilters(prev =>
            prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
          )}
          onToggleCategory={(c) => setCategoryFilters(prev =>
            prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
          )}
          onClear={() => { setStatusFilters([]); setCategoryFilters([]) }}
          onAddClick={() => setShowAddPanel(true)}
        />

        {/* SVG Canvas with D3 force positions */}
        <svg
          ref={svgRef}
          style={{
            width: '100%', height: '100%',
            position: 'absolute', top: 0, left: 0,
          }}
        >
          <GlowFilters />

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>

            {/* Connections */}
            {allConnections.map((conn) => {
              const isHighlighted = hoveredId === conn.sourceId || hoveredId === conn.targetId
              const isDimmed = hoveredId && !isHighlighted
              const sourceFiltered = isIdeaFiltered(conn.sourceIdea)
              const targetIdea = ideas.find(id => id.id === conn.targetId)
              const targetFiltered = targetIdea ? isIdeaFiltered(targetIdea) : true
              const isLineFiltered = sourceFiltered && targetFiltered

              return (
                <ConnectionLine
                  key={`${conn.sourceId}-${conn.targetId}-${conn.type}`}
                  source={positions[conn.sourceId]}
                  target={positions[conn.targetId]}
                  type={conn.type}
                  sourceIdea={conn.sourceIdea}
                  isHighlighted={isHighlighted}
                  isDimmed={isDimmed}
                  isFiltered={isLineFiltered}
                />
              )
            })}

            {/* Nodes */}
            {ideas.map(idea => (
              <IdeaNode
                key={idea.id}
                idea={idea}
                pos={positions[idea.id]}
                isHovered={hoveredId === idea.id}
                isConnected={connectedIds.has(idea.id)}
                isDimmed={hoveredId && hoveredId !== idea.id && !connectedIds.has(idea.id)}
                isFiltered={isIdeaFiltered(idea)}
                onClick={(idea) => {
                  if (!didPanRef.current) {
                    setSelectedIdea(idea)
                  }
                }}
                onMouseEnter={(id) => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
                onDragStart={handleNodeDragStart}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Detail / Add / Edit Panels */}
      {selectedIdea && !showAddPanel && !editIdea && (
        <DetailPanel
          idea={selectedIdea}
          ideas={ideas}
          onClose={() => setSelectedIdea(null)}
          onNavigate={handleNavigate}
          onEdit={(idea) => { setEditIdea(idea); setSelectedIdea(null) }}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      )}

      {showAddPanel && (
        <AddEditPanel
          idea={null}
          onSave={handleSave}
          onClose={() => setShowAddPanel(false)}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      )}

      {editIdea && (
        <AddEditPanel
          idea={editIdea}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditIdea(null)}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      )}

      </div>{/* close main content flex wrapper */}

      {/* Footer */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 55,
        padding: '12px 24px',
        background: 'rgba(12,12,12,0.90)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 16,
          color: '#9A9189',
        }}>
          Ahead of Market (AOM) / Phoenix, AZ
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="/" style={{
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 16,
            color: '#9A9189', textDecoration: 'none',
          }}>Home</a>
          <a href="/system" style={{
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 16,
            color: '#9A9189', textDecoration: 'none',
          }}>The System</a>
          <a href="/briefs" style={{
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 16,
            color: '#9A9189', textDecoration: 'none',
          }}>Briefs</a>
        </div>
      </footer>
    </div>
  )
}
