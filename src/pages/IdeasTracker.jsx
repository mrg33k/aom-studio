import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, Plus, Pencil, Check, ArrowLeft } from 'lucide-react'
import ideasData from '../data/ideas.json'

/* ================================================================== */
/*  IDEAS TRACKER / BRAIN MAP                                          */
/*  Steffen's Design Spec: Neural network visualization                */
/*  Route: /ideas                                                      */
/* ================================================================== */

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

// ── Layout: Force-directed-ish initial placement ─────────────────────
function computeNodePositions(ideas) {
  const positions = {}
  const cx = 600
  const cy = 420
  // Visible bounds within 1200x900 viewBox with padding
  const PAD = 60
  const MIN_X = PAD
  const MAX_X = 1200 - PAD
  const MIN_Y = PAD + 60 // extra top padding for filter bar
  const MAX_Y = 900 - PAD

  // Place in concentric rings based on status priority
  const statusOrder = { active: 0, shipped: 1, growing: 2, seed: 3, parked: 4 }
  const sorted = [...ideas].sort((a, b) => (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4))

  sorted.forEach((idea, i) => {
    const ring = statusOrder[idea.status] || 3
    const baseRadius = 70 + ring * 80
    const angleOffset = (ring * 0.7) + (i * 0.3)
    const nodesInRing = sorted.filter(s => statusOrder[s.status] === ring).length
    const indexInRing = sorted.filter((s, j) => j < i && statusOrder[s.status] === ring).length
    const angle = (indexInRing / Math.max(nodesInRing, 1)) * Math.PI * 2 + angleOffset
    const jitter = (Math.sin(i * 7.3) * 30)

    positions[idea.id] = {
      x: cx + Math.cos(angle) * (baseRadius + jitter),
      y: cy + Math.sin(angle) * (baseRadius + jitter),
    }
  })

  // Simple force repulsion pass
  for (let iter = 0; iter < 50; iter++) {
    const ids = Object.keys(positions)
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = positions[ids[i]]
        const b = positions[ids[j]]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = 120
        if (dist < minDist && dist > 0) {
          const force = (minDist - dist) / dist * 0.3
          a.x -= dx * force
          a.y -= dy * force
          b.x += dx * force
          b.y += dy * force
        }
      }
    }
  }

  // Clamp all nodes to visible bounds
  const ids = Object.keys(positions)
  for (const id of ids) {
    positions[id].x = Math.max(MIN_X, Math.min(MAX_X, positions[id].x))
    positions[id].y = Math.max(MIN_Y, Math.min(MAX_Y, positions[id].y))
  }

  return positions
}

function getNodeSize(progress) {
  return Math.round(36 + (progress * 0.28))
}

function getGlowStyle(category, status, intensity) {
  const cat = CATEGORY_COLORS[category] || CATEGORY_COLORS.product
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.seed
  const i = intensity !== undefined ? intensity : cfg.intensity
  const r = cat.glowRgb

  const inner = status === 'parked' ? 4 : i >= 0.8 ? 8 : i >= 0.4 ? 6 : 4
  const mid = status === 'parked' ? 12 : i >= 0.8 ? 24 : i >= 0.4 ? 18 : 12
  const outer = status === 'parked' ? 24 : i >= 0.8 ? 48 : i >= 0.4 ? 36 : 24

  return `0 0 ${inner}px rgba(${r}, ${(0.30 * i).toFixed(2)}), 0 0 ${mid}px rgba(${r}, ${(0.15 * i).toFixed(2)}), 0 0 ${outer}px rgba(${r}, ${(0.06 * i).toFixed(2)})`
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

    @keyframes particleMove {
      0% { offset-distance: 0%; }
      100% { offset-distance: 100%; }
    }

    .ideas-tracker-scrollbar::-webkit-scrollbar { width: 4px; }
    .ideas-tracker-scrollbar::-webkit-scrollbar-track { background: #141412; }
    .ideas-tracker-scrollbar::-webkit-scrollbar-thumb { background: #292524; border-radius: 2px; }
    .ideas-tracker-scrollbar::-webkit-scrollbar-thumb:hover { background: #44403C; }
  `
  document.head.appendChild(style)
}

// ── Node Component ───────────────────────────────────────────────────
function IdeaNode({
  idea, pos, isHovered, isConnected, isDimmed, isFiltered,
  onClick, onMouseEnter, onMouseLeave, canvasScale
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

  return (
    <g
      style={{ cursor: 'pointer', transition: 'opacity 300ms ease' }}
      opacity={nodeOpacity}
      onClick={() => onClick(idea)}
      onMouseEnter={() => onMouseEnter(idea.id)}
      onMouseLeave={onMouseLeave}
    >
      {/* Touch target */}
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
          strokeWidth={1}
          opacity={0.4}
          style={{
            animation: 'firingBurst 800ms ease-out forwards',
            transformOrigin: `${pos.x}px ${pos.y}px`,
          }}
        />
      )}

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
        style={{
          filter: stagnant ? 'saturate(0.6)' : 'none',
          ...pulseStyle,
        }}
      />

      {/* Glow overlay (separate for box-shadow equivalent in SVG) */}
      <circle
        cx={pos.x} cy={pos.y} r={size / 2}
        fill={cat.glow}
        opacity={cfg.intensity * 0.3}
        style={{
          filter: `blur(${cfg.intensity >= 0.8 ? 12 : cfg.intensity >= 0.4 ? 8 : 4}px)`,
          ...pulseStyle,
        }}
      />

      {/* Status badge */}
      {showLabel && (
        <g style={{ transition: 'opacity 150ms ease' }}>
          <rect
            x={pos.x - 24} y={pos.y - size / 2 - 18}
            width={48} height={14}
            rx={2} fill="rgba(0,0,0,0.6)"
          />
          <text
            x={pos.x} y={pos.y - size / 2 - 8}
            textAnchor="middle"
            fill={STATUS_COLORS[idea.status]}
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              fontSize: '8px',
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
            fontSize: '15px',
            transition: 'opacity 150ms ease',
            pointerEvents: 'none',
          }}
        >
          {idea.title.length > 16 ? idea.title.slice(0, 14) + '...' : idea.title}
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
  const ux = dx / len
  const uy = dy / len

  // Shorten line ends to not overlap nodes
  const s = { x: source.x + ux * 24, y: source.y + uy * 24 }
  const t = { x: target.x - ux * 24, y: target.y - uy * 24 }

  const id = `line-${sourceIdea?.id}-${type}-${Math.random().toString(36).slice(2, 6)}`

  return (
    <g style={{ transition: 'opacity 300ms ease' }} opacity={strokeOpacity}>
      <line
        x1={s.x} y1={s.y} x2={t.x} y2={t.y}
        stroke={strokeColor}
        strokeWidth={style.width}
        strokeDasharray={style.dash === 'none' ? undefined : style.dash}
        style={type === 'depends' ? { animation: 'dashScroll 4000ms linear infinite' } : {}}
      />
      {style.arrow && (
        <polygon
          points={`${t.x},${t.y} ${t.x - ux * 8 - uy * 4},${t.y - uy * 8 + ux * 4} ${t.x - ux * 8 + uy * 4},${t.y - uy * 8 - ux * 4}`}
          fill={strokeColor}
        />
      )}
    </g>
  )
}

// ── Detail Panel ─────────────────────────────────────────────────────
function DetailPanel({ idea, ideas, positions, onClose, onNavigate, isMobile, isTablet }) {
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
              fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#78716C',
            }}>
              {idea.category}
            </span>
          </div>
          {!isMobile && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#78716C', padding: 8, transition: 'color 150ms',
            }}
              onMouseEnter={e => e.target.style.color = '#F5F0EB'}
              onMouseLeave={e => e.target.style.color = '#78716C'}
            >
              <X size={24} />
            </button>
          )}
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
          fontSize: 15, lineHeight: 1.5, color: '#A8A29E',
          marginTop: 8, marginBottom: 0,
          ...(showMore ? {} : {
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }),
        }}>
          {idea.description}
        </p>
        {idea.description.length > 120 && (
          <button onClick={() => setShowMore(!showMore)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 13,
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
              fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
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
                  fontSize: 14, lineHeight: 1.4,
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
              fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
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
                    fontSize: 13, color: '#F5F0EB', flex: 1,
                  }}
                    onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.target.style.textDecoration = 'none'}
                  >
                    {conn.idea.title}
                  </span>
                  <span style={{
                    fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
                    fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase',
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
              fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#78716C',
            }}>OWNER</div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
              fontSize: 11, color: '#A8A29E', marginTop: 4,
            }}>{idea.owner}</div>
          </div>
          <div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#78716C',
            }}>CREATED</div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
              fontSize: 11, color: '#A8A29E', marginTop: 4,
            }}>{idea.created}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#78716C',
            }}>LAST ACTIVITY</div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
              fontSize: 11, color: '#A8A29E', marginTop: 4,
            }}>{idea.lastActivity} ({timeAgo(idea.lastActivity)})</div>
          </div>
        </div>
        <div style={{ borderBottom: '1px solid #292524' }} />

        {/* Notes */}
        {idea.notes && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#78716C', marginBottom: 12,
            }}>NOTES</div>
            <div style={{
              background: '#1A1A17', border: '1px solid #292524', borderRadius: 2,
              padding: 12, fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 14, lineHeight: 1.5, color: '#A8A29E', minHeight: 80,
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
          e.target.style.borderColor = '#44403C'
          e.target.style.color = '#A8A29E'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.target.style.borderColor = '#292524'
          e.target.style.color = '#78716C'
        }
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
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
              fontSize: 8, color: '#78716C', background: 'none',
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
              fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
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
              fontSize: 9, color: '#78716C', letterSpacing: '0.15em',
              marginBottom: 12,
            }}>STATUS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {statusChips.map(s =>
                renderChip(s, statusFilters.includes(s), STATUS_COLORS[s], () => onToggleStatus(s))
              )}
            </div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              fontSize: 9, color: '#78716C', letterSpacing: '0.15em',
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
                fontSize: 9, color: '#78716C', background: 'none',
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
    fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
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
                fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
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
                  fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
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
              e.target.style.background = '#D14E1C'
              e.target.style.boxShadow = '0 0 16px rgba(232,93,38,0.15)'
            }
          }}
          onMouseLeave={e => {
            if (form.title.trim()) {
              e.target.style.background = '#E85D26'
              e.target.style.boxShadow = 'none'
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
            onMouseEnter={e => e.target.style.color = '#EF4444'}
            onMouseLeave={e => e.target.style.color = '#78716C'}
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
  const [ideas, setIdeas] = useState(ideasData)
  const [selectedIdea, setSelectedIdea] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [statusFilters, setStatusFilters] = useState([])
  const [categoryFilters, setCategoryFilters] = useState([])
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [editIdea, setEditIdea] = useState(null)

  // Canvas state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const didPanRef = useRef(false)
  const svgRef = useRef(null)
  const containerRef = useRef(null)

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

  // Inject responsive CSS
  useEffect(() => {
    const id = 'ideas-tracker-responsive'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
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
        .ideas-add-btn { width: 36px !important; height: 36px !important; border-radius: 50% !important; padding: 0 !important; justify-content: center !important; }
      }
      @media (min-width: 768px) {
        .ideas-filter-mobile { display: none !important; }
      }
    `
    document.head.appendChild(style)
  }, [])

  // Compute positions
  const positions = useMemo(() => computeNodePositions(ideas), [ideas])

  // Connected ids for hovered node
  const connectedIds = useMemo(() => {
    if (!hoveredId) return new Set()
    const idea = ideas.find(i => i.id === hoveredId)
    if (!idea) return new Set()
    const ids = new Set()
    // Outgoing connections
    idea.connections?.forEach(c => ids.add(c.targetId))
    // Incoming connections
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

  // Pan handlers
  const handleMouseDown = useCallback((e) => {
    setIsPanning(true)
    didPanRef.current = false
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return
    didPanRef.current = true
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
  }, [isPanning, panStart])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Touch pan
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setIsPanning(true)
      didPanRef.current = false
      setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y })
    }
  }, [pan])

  const handleTouchMove = useCallback((e) => {
    if (!isPanning || e.touches.length !== 1) return
    didPanRef.current = true
    const touch = e.touches[0]
    setPan({ x: touch.clientX - panStart.x, y: touch.clientY - panStart.y })
  }, [isPanning, panStart])

  // Zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => Math.min(3, Math.max(0.3, s * delta)))
  }, [])

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
    if (pos) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        setPan({
          x: rect.width / 2 - pos.x * scale,
          y: rect.height / 2 - pos.y * scale,
        })
      }
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
  }, [editIdea])

  const handleDelete = useCallback((id) => {
    setIdeas(prev => prev.filter(i => i.id !== id))
    setSelectedIdea(null)
    setEditIdea(null)
  }, [])

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

  // Compute canvas width
  const canvasWidth = (selectedIdea || showAddPanel || editIdea) && isDesktop
    ? 'calc(100vw - 400px)' : '100vw'

  // Build connection data
  const allConnections = useMemo(() => {
    const conns = []
    ideas.forEach(idea => {
      idea.connections?.forEach(conn => {
        if (positions[idea.id] && positions[conn.targetId]) {
          conns.push({
            sourceId: idea.id,
            targetId: conn.targetId,
            type: conn.type,
            sourceIdea: idea,
          })
        }
      })
    })
    return conns
  }, [ideas, positions])

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: '#0C0C0C', display: 'flex', position: 'relative',
      fontFamily: '"Space Grotesk", sans-serif',
    }}>
      {/* Accessible heading - visually hidden */}
      <h1 style={{
        position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
        overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap',
        borderWidth: 0, zIndex: 1,
      }}>
        AOM Ideas Tracker
      </h1>
      {/* Canvas area */}
      <div
        ref={containerRef}
        style={{
          flex: 1, width: canvasWidth, height: '100vh',
          position: 'relative', overflow: 'hidden',
          cursor: isPanning ? 'grabbing' : 'grab',
          transition: 'width 250ms ease-out',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
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
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
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

        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          style={{
            width: '100%', height: '100%',
            position: 'absolute', top: 0, left: 0,
          }}
          viewBox={isMobile ? "0 0 1200 900" : "0 0 1200 900"}
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={`translate(${pan.x / scale}, ${pan.y / scale}) scale(${scale})`}
             style={{ transformOrigin: '600px 420px' }}>

            {/* Connections */}
            {allConnections.map((conn, i) => {
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
                canvasScale={scale}
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
          positions={positions}
          onClose={() => setSelectedIdea(null)}
          onNavigate={handleNavigate}
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
    </div>
  )
}
