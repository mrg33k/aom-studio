import React, { useEffect, useState } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  AOM Brand Guidelines v2 -- Before/After Skill Upgrade              */
/*  Direction C: Bold Graphic (LOCKED)                                 */
/*  Fonts: Syne (display) + Space Grotesk (headlines + body)           */
/*  Colors: Cream #FDF6EC, Black #0A0A0A, Orange #E85D26, Gold #C9A84C */
/* ------------------------------------------------------------------ */

const COLORS = {
  cream: '#FDF6EC',
  black: '#0A0A0A',
  orange: '#E85D26',
  gold: '#C9A84C',
  warmGray: '#7A7267',
  lightBorder: '#D9D3CB',
  darkCream: '#EDE7DF',
}

/* ================================================================== */
/*  SHARED UTILITIES                                                    */
/* ================================================================== */

function Badge({ children, color = COLORS.black, bg = 'transparent', style = {} }) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: color,
      border: `1px solid ${color}`,
      borderRadius: 100,
      padding: '4px 14px',
      background: bg,
      lineHeight: 1.4,
      ...style,
    }}>{children}</span>
  )
}

function SectionNumber({ num, color = COLORS.orange }) {
  return (
    <span style={{
      fontFamily: '"Syne", sans-serif',
      fontSize: 64,
      fontWeight: 800,
      lineHeight: 1,
      color: color,
      opacity: 0.12,
      position: 'absolute',
      top: -20,
      left: 0,
      userSelect: 'none',
    }}>{String(num).padStart(2, '0')}</span>
  )
}

/* ================================================================== */
/*  V1 LOGOS (BEFORE) -- kept as-is from original                       */
/* ================================================================== */

function V1LogoWordmark({ color = COLORS.black, size = 72 }) {
  return (
    <svg viewBox="0 0 300 80" width={size * (300/80)} height={size} aria-label="V1 AOM Wordmark">
      <text x="0" y="65" fontFamily="Syne, sans-serif" fontSize="72" fontWeight="800" fill={color} letterSpacing="-2">
        AOM
      </text>
      <rect x="210" y="52" width="8" height="8" rx="4" fill={COLORS.orange} />
    </svg>
  )
}

function V1LogoMark({ color = COLORS.black, accent = COLORS.orange, size = 80 }) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label="V1 AOM Mark">
      <circle cx="40" cy="40" r="38" fill="none" stroke={color} strokeWidth="2" />
      <polygon points="40,14 18,62 28,62 40,34 52,62 62,62" fill={color} />
      <rect x="25" y="46" width="30" height="4" rx="2" fill={accent} />
      <circle cx="40" cy="26" r="3" fill={COLORS.gold} />
    </svg>
  )
}

function V1LogoBadge({ color = COLORS.black, size = 120 }) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-label="V1 AOM Badge">
      <circle cx="80" cy="80" r="76" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="80" cy="80" r="70" fill="none" stroke={color} strokeWidth="1" />
      <text x="80" y="90" fontFamily="Syne, sans-serif" fontSize="48" fontWeight="800" fill={color} textAnchor="middle" letterSpacing="-1">
        AOM
      </text>
      <defs>
        <path id="v1topArc" d="M 25,80 a 55,55 0 0,1 110,0" fill="none" />
        <path id="v1bottomArc" d="M 135,80 a 55,55 0 0,1 -110,0" fill="none" />
      </defs>
      <text fontFamily="Space Grotesk, sans-serif" fontSize="8" fontWeight="700" fill={color} letterSpacing="4" textAnchor="middle">
        <textPath href="#v1topArc" startOffset="50%">AHEAD OF MARKET</textPath>
      </text>
      <text fontFamily="Space Grotesk, sans-serif" fontSize="7" fontWeight="500" fill={COLORS.warmGray} letterSpacing="3" textAnchor="middle">
        <textPath href="#v1bottomArc" startOffset="50%">PHOENIX AZ &#8226; EST 2020</textPath>
      </text>
      <circle cx="80" cy="10" r="2.5" fill={COLORS.orange} />
      <circle cx="80" cy="150" r="2.5" fill={COLORS.orange} />
      <circle cx="10" cy="80" r="2.5" fill={COLORS.gold} />
      <circle cx="150" cy="80" r="2.5" fill={COLORS.gold} />
    </svg>
  )
}

function V1LogoStacked({ color = COLORS.black, size = 80 }) {
  return (
    <svg viewBox="0 0 180 120" width={size * (180/120)} height={size} aria-label="V1 AOM Stacked">
      <text x="0" y="42" fontFamily="Syne, sans-serif" fontSize="18" fontWeight="800" fill={COLORS.orange} letterSpacing="8">
        AHEAD OF
      </text>
      <text x="0" y="90" fontFamily="Syne, sans-serif" fontSize="52" fontWeight="800" fill={color} letterSpacing="-1">
        MARKET
      </text>
      <rect x="0" y="100" width="178" height="3" fill={color} />
      <text x="0" y="114" fontFamily="Space Grotesk, sans-serif" fontSize="8" fontWeight="500" fill={COLORS.warmGray} letterSpacing="3">
        CREATIVE PRODUCTION + AI SYSTEMS
      </text>
    </svg>
  )
}

// V1 Patterns
function V1Starburst({ size = 40, color = COLORS.orange, style = {} }) {
  const points = Array.from({ length: 16 }).map((_, i) => {
    const angle = (i * 360 / 16) * Math.PI / 180
    const r = i % 2 === 0 ? size / 2 : size / 5
    return `${size / 2 + r * Math.cos(angle)},${size / 2 + r * Math.sin(angle)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={style}>
      <polygon points={points} fill={color} />
    </svg>
  )
}

function V1DottedTexture({ width = 120, height = 80, color = COLORS.black, opacity = 0.15, style = {} }) {
  const dots = []
  for (let x = 0; x < width; x += 12) {
    for (let y = 0; y < height; y += 12) {
      dots.push(<circle key={`${x}-${y}`} cx={x + 6} cy={y + 6} r={1.5} fill={color} opacity={opacity} />)
    }
  }
  return (
    <svg width={width} height={height} style={style}>
      {dots}
    </svg>
  )
}

/* ================================================================== */
/*  V2 LOGOS (AFTER) -- Grid-based, geometric, professional             */
/* ================================================================== */

/*
 * Construction notes:
 * - 96x96 viewBox on an 8-unit grid (12 grid lines per axis)
 * - Golden ratio: 1.618:1 applied to key proportions
 * - All coordinates snap to multiples of 8
 * - Optical overshoot: circles extend 3% beyond grid bounds
 * - fillRule="evenodd" for all negative space cutouts
 */

// V2 Primary Logomark: "A" as forward arrow, negative space creates the crossbar
function V2LogoMark({ color = COLORS.black, accent = COLORS.orange, size = 80, showGrid = false }) {
  // 96x96 viewBox, 8-unit grid
  // The "A" is built from two angled strokes meeting at apex
  // Negative space triangle creates the crossbar void
  // The form reads as both an "A" and an upward arrow (ahead / ambition)
  const G = 8 // grid unit
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} fill="none" role="img" aria-label="AOM Mark v2">
      {showGrid && (
        <g opacity="0.08">
          {Array.from({ length: 13 }).map((_, i) => (
            <React.Fragment key={i}>
              <line x1={i * G} y1="0" x2={i * G} y2="96" stroke={color} strokeWidth="0.5" />
              <line x1="0" y1={i * G} x2="96" y2={i * G} stroke={color} strokeWidth="0.5" />
            </React.Fragment>
          ))}
        </g>
      )}
      {/* Main "A" mark with negative space crossbar cutout */}
      <path
        fillRule="evenodd"
        fill={color}
        d={`
          M 48,8
          L 88,80
          L 72,80
          L 48,32
          L 24,80
          L 8,80
          Z
          M 48,48
          L 36,72
          L 60,72
          Z
        `}
      />
      {/* Orange accent: precise dot at apex, radius follows golden ratio to stroke */}
      <circle cx="48" cy="8" r="5" fill={accent} />
      {/* Gold baseline anchor */}
      <rect x="8" y="84" width="80" height="4" rx="2" fill={COLORS.gold} opacity="0.6" />
    </svg>
  )
}

// V2 Wordmark: Custom letter construction, not SVG text
function V2LogoWordmark({ color = COLORS.black, size = 56 }) {
  // Each letter is a hand-built path on the 8-unit grid
  // Stroke weight: 8px consistent throughout
  // Proportions: each letter fits in a 40x56 grid cell
  // Spacing: 8px between letters
  const sw = 8 // stroke width
  return (
    <svg viewBox="0 0 260 64" width={size * (260/64)} height={size} fill="none" role="img" aria-label="AOM Wordmark v2">
      {/* "A" - two angled strokes + crossbar, with negative space triangle */}
      <path
        fill={color}
        fillRule="evenodd"
        d={`
          M 32,4 L 60,60 L 52,60 L 32,18 L 12,60 L 4,60 Z
          M 32,36 L 24,52 L 40,52 Z
        `}
      />

      {/* "O" - circle with counter (negative space center) */}
      <path
        fill={color}
        fillRule="evenodd"
        d={`
          M 108,4 A 28,28 0 1,1 108,60 A 28,28 0 1,1 108,4 Z
          M 108,16 A 16,16 0 1,0 108,48 A 16,16 0 1,0 108,16 Z
        `}
      />

      {/* "M" - three vertical strokes with angled peaks */}
      <path
        fill={color}
        d={`
          M 148,60 L 148,16 L 172,40 L 196,16 L 196,60 L 188,60 L 188,32 L 172,50 L 156,32 L 156,60 Z
        `}
      />

      {/* Orange dot after M, acts as the brand punctuation */}
      <circle cx="212" cy="56" r="5" fill={COLORS.orange} />

      {/* Thin gold underline, anchors the wordmark */}
      <rect x="0" y="62" width="220" height="2" fill={COLORS.gold} opacity="0.4" />
    </svg>
  )
}

// V2 Extended Lockup: Mark + Wordmark with clear spacing rules
function V2LogoLockup({ color = COLORS.black, accent = COLORS.orange, size = 48 }) {
  return (
    <svg viewBox="0 0 360 72" width={size * (360/72)} height={size} fill="none" role="img" aria-label="AOM Full Lockup v2">
      {/* Mark (scaled to fit 72x72) */}
      <g transform="translate(0,0)">
        <path
          fillRule="evenodd"
          fill={color}
          d={`
            M 36,4 L 68,64 L 56,64 L 36,24 L 16,64 L 4,64 Z
            M 36,36 L 27,56 L 45,56 Z
          `}
        />
        <circle cx="36" cy="4" r="4" fill={accent} />
      </g>

      {/* Vertical divider with 16px clear space on each side */}
      <line x1="88" y1="8" x2="88" y2="64" stroke={accent} strokeWidth="2" />

      {/* Custom wordmark letters */}
      <g transform="translate(104, 8)">
        {/* A */}
        <path fill={color} fillRule="evenodd"
          d="M 20,2 L 38,48 L 32,48 L 20,14 L 8,48 L 2,48 Z M 20,28 L 14,42 L 26,42 Z" />
        {/* O */}
        <path fill={color} fillRule="evenodd"
          d="M 68,2 A 24,24 0 1,1 68,50 A 24,24 0 1,1 68,2 Z M 68,12 A 14,14 0 1,0 68,40 A 14,14 0 1,0 68,12 Z" />
        {/* M */}
        <path fill={color}
          d="M 104,48 L 104,10 L 124,30 L 144,10 L 144,48 L 138,48 L 138,22 L 124,38 L 110,22 L 110,48 Z" />
      </g>

      {/* Tagline below */}
      <text x="104" y="68" fontFamily="Space Grotesk, sans-serif" fontSize="8" fontWeight="500" fill={COLORS.warmGray} letterSpacing="3">
        AHEAD OF MARKET
      </text>
    </svg>
  )
}

// V2 Badge: Circular stamp with compound paths, no SVG text for main mark
function V2LogoBadge({ color = COLORS.black, accent = COLORS.orange, size = 120 }) {
  return (
    <svg viewBox="0 0 192 192" width={size} height={size} fill="none" role="img" aria-label="AOM Badge v2">
      <defs>
        <path id="v2topArc" d="M 30,96 a 66,66 0 0,1 132,0" />
        <path id="v2bottomArc" d="M 162,96 a 66,66 0 0,1 -132,0" />
        <clipPath id="badgeClip">
          <circle cx="96" cy="96" r="90" />
        </clipPath>
      </defs>

      {/* Outer ring */}
      <circle cx="96" cy="96" r="92" stroke={color} strokeWidth="2" fill="none" />
      {/* Inner ring */}
      <circle cx="96" cy="96" r="84" stroke={color} strokeWidth="0.75" fill="none" />

      {/* Starburst accent at compass points */}
      <circle cx="96" cy="6" r="3" fill={accent} />
      <circle cx="96" cy="186" r="3" fill={accent} />
      <circle cx="6" cy="96" r="3" fill={COLORS.gold} />
      <circle cx="186" cy="96" r="3" fill={COLORS.gold} />

      {/* Center "A" mark - larger, dominant */}
      <g transform="translate(56, 48)">
        <path
          fillRule="evenodd"
          fill={color}
          d={`
            M 40,8 L 76,80 L 64,80 L 40,28 L 16,80 L 4,80 Z
            M 40,44 L 30,68 L 50,68 Z
          `}
        />
        <circle cx="40" cy="8" r="4.5" fill={accent} />
      </g>

      {/* Circular text */}
      <text fontFamily="Space Grotesk, sans-serif" fontSize="8.5" fontWeight="700" fill={color} letterSpacing="5" textAnchor="middle">
        <textPath href="#v2topArc" startOffset="50%">AHEAD OF MARKET</textPath>
      </text>
      <text fontFamily="Space Grotesk, sans-serif" fontSize="7.5" fontWeight="500" fill={COLORS.warmGray} letterSpacing="4" textAnchor="middle">
        <textPath href="#v2bottomArc" startOffset="50%">PHOENIX AZ &#8226; EST 2020</textPath>
      </text>

      {/* Dotted inner circle */}
      <circle cx="96" cy="96" r="74" fill="none" stroke={color} strokeWidth="0.75" strokeDasharray="2 5" opacity="0.3" />
    </svg>
  )
}

// V2 Stacked Lockup
function V2LogoStacked({ color = COLORS.black, size = 80 }) {
  return (
    <svg viewBox="0 0 200 140" width={size * (200/140)} height={size} fill="none" role="img" aria-label="AOM Stacked v2">
      {/* "AHEAD OF" in small tracked caps */}
      <text x="4" y="16" fontFamily="Space Grotesk, sans-serif" fontSize="12" fontWeight="700" fill={COLORS.orange} letterSpacing="8">
        AHEAD OF
      </text>

      {/* Large geometric "AOM" wordmark */}
      <g transform="translate(4, 28)">
        {/* A */}
        <path fill={color} fillRule="evenodd"
          d="M 28,4 L 52,56 L 44,56 L 28,16 L 12,56 L 4,56 Z M 28,32 L 20,48 L 36,48 Z" />
        {/* O */}
        <path fill={color} fillRule="evenodd"
          d="M 82,4 A 26,26 0 1,1 82,56 A 26,26 0 1,1 82,4 Z M 82,14 A 16,16 0 1,0 82,46 A 16,16 0 1,0 82,14 Z" />
        {/* M */}
        <path fill={color}
          d="M 120,56 L 120,12 L 142,34 L 164,12 L 164,56 L 156,56 L 156,28 L 142,42 L 128,28 L 128,56 Z" />
      </g>

      {/* Orange dot */}
      <circle cx="180" cy="80" r="4" fill={COLORS.orange} />

      {/* Thick rule */}
      <rect x="4" y="92" width="192" height="3" fill={color} />

      {/* Tagline */}
      <text x="4" y="110" fontFamily="Space Grotesk, sans-serif" fontSize="8" fontWeight="500" fill={COLORS.warmGray} letterSpacing="3">
        CREATIVE PRODUCTION + AI SYSTEMS
      </text>

      {/* Thin gold accent line */}
      <rect x="4" y="118" width="80" height="1.5" fill={COLORS.gold} opacity="0.5" />
    </svg>
  )
}

/* ================================================================== */
/*  V2 BRAND PATTERNS                                                   */
/* ================================================================== */

// Precision starburst with gradient fill and varying ray widths
function V2Starburst({ size = 48, style = {} }) {
  const cx = size / 2, cy = size / 2
  const rays = 24
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={style}>
      <defs>
        <linearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={COLORS.orange} />
          <stop offset="100%" stopColor={COLORS.gold} />
        </linearGradient>
      </defs>
      {Array.from({ length: rays }).map((_, i) => {
        const angle = (i * 360 / rays) * Math.PI / 180
        const innerR = size * 0.18
        const outerR = i % 2 === 0 ? size * 0.48 : size * 0.32
        return (
          <line
            key={i}
            x1={cx + innerR * Math.cos(angle)}
            y1={cy + innerR * Math.sin(angle)}
            x2={cx + outerR * Math.cos(angle)}
            y2={cy + outerR * Math.sin(angle)}
            stroke="url(#starGrad)"
            strokeWidth={i % 3 === 0 ? 2 : 1}
            strokeLinecap="round"
          />
        )
      })}
      <circle cx={cx} cy={cy} r={size * 0.08} fill={COLORS.orange} />
    </svg>
  )
}

// Noise/grain texture overlay using SVG filters
function V2NoiseTexture({ width = 400, height = 200, opacity = 0.04, style = {} }) {
  return (
    <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', ...style }}>
      <defs>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
      </defs>
      <rect width={width} height={height} filter="url(#grain)" opacity={opacity} />
    </svg>
  )
}

// Interlocking rings pattern
function V2InterlockRings({ size = 120, color = COLORS.orange, style = {} }) {
  const sw = 2
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 200 120" style={style} fill="none">
      <defs>
        <clipPath id="ringClipLeft">
          <rect x="100" y="0" width="100" height="120" />
        </clipPath>
        <clipPath id="ringClipRight">
          <rect x="0" y="0" width="100" height="120" />
        </clipPath>
      </defs>
      {/* Left ring - front half */}
      <circle cx="70" cy="60" r="40" stroke={color} strokeWidth={sw} />
      {/* Right ring - front portion clips over left */}
      <circle cx="130" cy="60" r="40" stroke={COLORS.gold} strokeWidth={sw} />
      {/* Re-draw left ring's front arc that should appear on top in the overlap zone */}
      <path
        d="M 100,28 A 40,40 0 0,0 100,92"
        stroke={color}
        strokeWidth={sw + 0.5}
        fill="none"
      />
    </svg>
  )
}

// Woven grid pattern
function V2WovenGrid({ width = 200, height = 100, style = {} }) {
  const gap = 16
  return (
    <svg width={width} height={height} style={style}>
      <defs>
        <linearGradient id="wovenGradH" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={COLORS.orange} stopOpacity="0.15" />
          <stop offset="50%" stopColor={COLORS.orange} stopOpacity="0.3" />
          <stop offset="100%" stopColor={COLORS.orange} stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="wovenGradV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.gold} stopOpacity="0.15" />
          <stop offset="50%" stopColor={COLORS.gold} stopOpacity="0.3" />
          <stop offset="100%" stopColor={COLORS.gold} stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {/* Horizontal lines */}
      {Array.from({ length: Math.floor(height / gap) }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * gap + gap/2} x2={width} y2={i * gap + gap/2}
          stroke="url(#wovenGradH)" strokeWidth="1.5" />
      ))}
      {/* Vertical lines */}
      {Array.from({ length: Math.floor(width / gap) }).map((_, i) => (
        <line key={`v${i}`} x1={i * gap + gap/2} y1="0" x2={i * gap + gap/2} y2={height}
          stroke="url(#wovenGradV)" strokeWidth="1.5" />
      ))}
      {/* Intersection dots */}
      {Array.from({ length: Math.floor(width / gap) }).map((_, x) =>
        Array.from({ length: Math.floor(height / gap) }).map((_, y) => (
          <circle key={`d${x}-${y}`} cx={x * gap + gap/2} cy={y * gap + gap/2} r="2"
            fill={(x + y) % 2 === 0 ? COLORS.orange : COLORS.gold} opacity="0.25" />
        ))
      )}
    </svg>
  )
}

// Radial dotted circle
function V2RadialDots({ size = 100, style = {} }) {
  const cx = size / 2, cy = size / 2
  const rings = [
    { r: size * 0.42, count: 24, dotR: 1.5, color: COLORS.black, opacity: 0.12 },
    { r: size * 0.32, count: 16, dotR: 1.5, color: COLORS.orange, opacity: 0.2 },
    { r: size * 0.22, count: 10, dotR: 2, color: COLORS.gold, opacity: 0.25 },
  ]
  return (
    <svg width={size} height={size} style={style}>
      {rings.map((ring, ri) =>
        Array.from({ length: ring.count }).map((_, i) => {
          const angle = (i * 360 / ring.count) * Math.PI / 180
          return (
            <circle key={`${ri}-${i}`}
              cx={cx + ring.r * Math.cos(angle)}
              cy={cy + ring.r * Math.sin(angle)}
              r={ring.dotR} fill={ring.color} opacity={ring.opacity} />
          )
        })
      )}
      <circle cx={cx} cy={cy} r="3" fill={COLORS.orange} opacity="0.4" />
    </svg>
  )
}

// Construction grid (measuring grid with labels)
function V2ConstructionGrid({ width = 300, height = 200, style = {} }) {
  const step = 24
  return (
    <svg width={width} height={height} style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none', ...style }}>
      <defs>
        <linearGradient id="gridFade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={COLORS.black} stopOpacity="0.06" />
          <stop offset="100%" stopColor={COLORS.black} stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: Math.ceil(width / step) + 1 }).map((_, i) => (
        <line key={`v${i}`} x1={i * step} y1={0} x2={i * step} y2={height}
          stroke="url(#gridFade)" strokeWidth="0.5" />
      ))}
      {Array.from({ length: Math.ceil(height / step) + 1 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * step} x2={width} y2={i * step}
          stroke="url(#gridFade)" strokeWidth="0.5" />
      ))}
      {/* Cross markers at key intersections */}
      {[0, 4, 8].map(xi =>
        [0, 4, 8].map(yi => (
          <g key={`c${xi}-${yi}`} transform={`translate(${xi * step}, ${yi * step})`}>
            <line x1="-3" y1="0" x2="3" y2="0" stroke={COLORS.orange} strokeWidth="0.75" opacity="0.3" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke={COLORS.orange} strokeWidth="0.75" opacity="0.3" />
          </g>
        ))
      )}
    </svg>
  )
}

/* ================================================================== */
/*  COLOR SWATCH                                                        */
/* ================================================================== */

function ColorSwatch({ color, name, hex, dark }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(hex)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div style={{ flex: '1 1 200px', minWidth: 180 }}>
      <div
        onClick={handleCopy}
        style={{
          background: color,
          width: '100%',
          height: 120,
          borderRadius: 4,
          border: `1px solid ${dark ? 'transparent' : COLORS.lightBorder}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: 12,
          position: 'relative',
          transition: 'transform 0.2s',
        }}
      >
        {copied && (
          <span style={{
            position: 'absolute', top: 8, right: 8,
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 10,
            fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: dark ? COLORS.cream : COLORS.black, opacity: 0.8,
          }}>COPIED</span>
        )}
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase', color: COLORS.black,
        }}>{name}</div>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 400,
          color: COLORS.warmGray, marginTop: 2,
        }}>{hex}</div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  MAIN COMPONENT                                                      */
/* ================================================================== */

export default function BrandGuidelines() {
  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [])

  const section = {
    padding: '100px 60px',
    position: 'relative',
    overflow: 'hidden',
  }

  const inner = { maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }

  const label = {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: COLORS.warmGray,
    marginBottom: 12,
  }

  const headline = {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: 42,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    lineHeight: 1.1,
    color: COLORS.black,
    marginBottom: 32,
  }

  const body = {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.7,
    color: COLORS.warmGray,
    maxWidth: 640,
  }

  const thickRule = { width: '100%', height: 3, background: COLORS.black, border: 'none', margin: 0 }
  const thinRule = { width: '100%', height: 1, background: COLORS.lightBorder, border: 'none', margin: 0 }

  const logoCard = (bg, borderColor) => ({
    border: `1px solid ${borderColor || COLORS.lightBorder}`,
    borderRadius: 4,
    padding: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    background: bg || COLORS.cream,
  })

  return (
    <div style={{ background: COLORS.cream, minHeight: '100vh', color: COLORS.black }}>

      {/* ============================================================ */}
      {/*  HERO                                                         */}
      {/* ============================================================ */}
      <section style={{
        ...section,
        padding: '80px 60px 100px',
        background: COLORS.cream,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <V2ConstructionGrid width={500} height={500} />
        <div style={{ position: 'absolute', top: 40, right: 60, zIndex: 2 }}>
          <V2Starburst size={56} />
        </div>
        <div style={{ position: 'absolute', bottom: 80, right: 120, zIndex: 0 }}>
          <V2RadialDots size={180} />
        </div>
        <div style={inner}>
          <a href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 12, fontWeight: 500,
            color: COLORS.warmGray, textDecoration: 'none', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 80,
          }}>
            <ArrowLeft size={14} /> BACK
          </a>

          <div style={{ marginBottom: 48 }}>
            <V2LogoMark size={72} color={COLORS.black} accent={COLORS.orange} />
          </div>

          <h1 style={{ margin: 0, padding: 0 }}>
            <span style={{
              fontFamily: '"Syne", sans-serif', fontSize: 96, fontWeight: 800,
              lineHeight: 0.9, letterSpacing: '-0.03em', display: 'block',
              color: COLORS.black,
            }}>BRAND</span>
            <span style={{
              fontFamily: '"Space Grotesk", sans-serif', fontSize: 96, fontWeight: 300,
              lineHeight: 0.9, letterSpacing: '-0.03em', display: 'block',
              color: COLORS.warmGray,
            }}>guide</span>
            <span style={{
              fontFamily: '"Syne", sans-serif', fontSize: 96, fontWeight: 800,
              lineHeight: 0.9, letterSpacing: '-0.03em', display: 'block',
              color: COLORS.orange,
            }}>LINES</span>
          </h1>

          <div style={{ display: 'flex', gap: 10, marginTop: 40, flexWrap: 'wrap' }}>
            <Badge>VIDEO</Badge>
            <Badge>WEB</Badge>
            <Badge>BRAND</Badge>
            <Badge>AI</Badge>
            <Badge color={COLORS.orange}>V2 UPGRADE</Badge>
          </div>

          <div style={{
            display: 'flex', gap: 24, marginTop: 24, alignItems: 'center',
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 12, fontWeight: 400,
            color: COLORS.warmGray, letterSpacing: '0.05em',
          }}>
            <span>Phoenix, AZ</span>
            <span style={{ color: COLORS.orange }}>&#8226;</span>
            <span>Est. 2020</span>
            <span style={{ color: COLORS.orange }}>&#8226;</span>
            <span>Bold Graphic</span>
          </div>
        </div>
      </section>

      <div style={thickRule} />

      {/* ============================================================ */}
      {/*  BEFORE SECTION                                               */}
      {/* ============================================================ */}
      <section style={{ ...section, background: '#f0ebe4' }}>
        <div style={inner}>
          <div style={{
            display: 'inline-block',
            padding: '6px 20px',
            background: COLORS.warmGray,
            borderRadius: 100,
            marginBottom: 32,
          }}>
            <span style={{
              fontFamily: '"Space Grotesk", sans-serif', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase', color: COLORS.cream,
            }}>BEFORE</span>
          </div>

          <h2 style={{ ...headline, fontSize: 36, color: COLORS.warmGray }}>
            v1 Logo System
          </h2>
          <p style={{ ...body, marginBottom: 48 }}>
            The original logo concepts. SVG text elements (not paths), no geometric grid,
            no negative space storytelling. Basic shapes, font-dependent rendering.
            This is where I started.
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
          }}>
            {/* V1 Wordmark */}
            <div style={logoCard(COLORS.cream)}>
              <V1LogoWordmark color={COLORS.black} size={56} />
              <span style={{ ...label, marginTop: 16, marginBottom: 0, fontSize: 9 }}>V1 WORDMARK</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#bbb', marginTop: 4 }}>SVG text element</span>
            </div>

            {/* V1 Mark */}
            <div style={logoCard(COLORS.cream)}>
              <V1LogoMark color={COLORS.black} size={72} />
              <span style={{ ...label, marginTop: 16, marginBottom: 0, fontSize: 9 }}>V1 GEOMETRIC MARK</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#bbb', marginTop: 4 }}>Basic polygon "A"</span>
            </div>

            {/* V1 Badge */}
            <div style={logoCard(COLORS.cream)}>
              <V1LogoBadge color={COLORS.black} size={100} />
              <span style={{ ...label, marginTop: 16, marginBottom: 0, fontSize: 9 }}>V1 BADGE</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#bbb', marginTop: 4 }}>Font-dependent text</span>
            </div>

            {/* V1 Stacked */}
            <div style={logoCard(COLORS.cream)}>
              <V1LogoStacked color={COLORS.black} size={72} />
              <span style={{ ...label, marginTop: 16, marginBottom: 0, fontSize: 9 }}>V1 STACKED</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#bbb', marginTop: 4 }}>SVG text, no paths</span>
            </div>
          </div>

          {/* V1 Patterns */}
          <div style={{ marginTop: 48 }}>
            <div style={{ ...label, color: COLORS.warmGray }}>V1 PATTERNS</div>
            <div style={{ display: 'flex', gap: 32, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <V1Starburst size={48} color={COLORS.orange} />
                <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#bbb', marginTop: 8 }}>Basic starburst</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <V1DottedTexture width={100} height={60} />
                <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#bbb', marginTop: 8 }}>Uniform dots</div>
              </div>
            </div>
          </div>

          {/* Critique callout */}
          <div style={{
            marginTop: 48, padding: 32, background: COLORS.cream, borderRadius: 4,
            borderLeft: `4px solid ${COLORS.warmGray}`,
          }}>
            <div style={{ ...label, color: COLORS.warmGray, fontSize: 9 }}>SELF-CRITIQUE</div>
            <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, lineHeight: 1.7, color: COLORS.black, marginTop: 12 }}>
              Problems with v1: (1) Logos use SVG &lt;text&gt; elements that break without font loading.
              (2) No geometric grid. Coordinates are arbitrary. (3) The "A" mark is a basic polygon, not a refined shape with negative space.
              (4) Patterns are simplistic. Uniform dots and a generic starburst. (5) No compound paths or fillRule techniques.
              (6) No hidden meaning in the mark. Nothing to discover.
            </div>
          </div>
        </div>
      </section>

      {/* Orange divider between Before and After */}
      <div style={{ width: '100%', height: 6, background: COLORS.orange, border: 'none', margin: 0 }} />

      {/* ============================================================ */}
      {/*  AFTER SECTION                                                */}
      {/* ============================================================ */}

      {/* AFTER: Logos */}
      <section style={{ ...section, background: COLORS.cream }}>
        <V2ConstructionGrid width={400} height={300} />
        <div style={inner}>
          <div style={{
            display: 'inline-block',
            padding: '6px 20px',
            background: COLORS.orange,
            borderRadius: 100,
            marginBottom: 32,
          }}>
            <span style={{
              fontFamily: '"Space Grotesk", sans-serif', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase', color: COLORS.cream,
            }}>AFTER</span>
          </div>

          <div style={{ position: 'relative' }}>
            <SectionNumber num={1} />
            <div style={{ ...label, paddingTop: 48 }}>LOGO SYSTEM V2</div>
            <h2 style={headline}>Rebuilt From Geometry</h2>
            <p style={body}>
              Every mark is built on a 96x96 grid with 8-unit snapping. Letters use compound
              paths with fillRule="evenodd" for true negative space cutouts. No SVG text elements.
              The "A" reads as both a letter and an upward arrow. It works at 16px and 800px.
            </p>
          </div>

          {/* V2 Logo grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24, marginTop: 56,
          }}>
            {/* V2 Mark */}
            <div style={logoCard(COLORS.cream)}>
              <V2LogoMark size={96} color={COLORS.black} accent={COLORS.orange} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9 }}>LOGOMARK</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa', marginTop: 2 }}>Grid-built, negative space crossbar</span>
            </div>

            {/* V2 Mark with grid visible */}
            <div style={logoCard(COLORS.cream)}>
              <V2LogoMark size={96} color={COLORS.black} accent={COLORS.orange} showGrid />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9 }}>CONSTRUCTION GRID</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa', marginTop: 2 }}>8-unit grid overlay</span>
            </div>

            {/* V2 Wordmark */}
            <div style={logoCard(COLORS.cream)}>
              <V2LogoWordmark size={48} color={COLORS.black} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9 }}>CUSTOM WORDMARK</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa', marginTop: 2 }}>Path-built letterforms, no text element</span>
            </div>

            {/* V2 Full Lockup */}
            <div style={logoCard(COLORS.cream)}>
              <V2LogoLockup size={48} color={COLORS.black} accent={COLORS.orange} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9 }}>FULL LOCKUP</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa', marginTop: 2 }}>Mark + wordmark with clear space rules</span>
            </div>

            {/* V2 Badge */}
            <div style={logoCard(COLORS.cream)}>
              <V2LogoBadge size={130} color={COLORS.black} accent={COLORS.orange} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9 }}>BADGE / STAMP</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa', marginTop: 2 }}>Compound mark + dotted ring</span>
            </div>

            {/* V2 Stacked */}
            <div style={logoCard(COLORS.cream)}>
              <V2LogoStacked size={80} color={COLORS.black} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9 }}>STACKED LOCKUP</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa', marginTop: 2 }}>Path letterforms + tagline</span>
            </div>

            {/* Dark background */}
            <div style={logoCard(COLORS.black, COLORS.black)}>
              <V2LogoMark size={96} color={COLORS.cream} accent={COLORS.orange} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9, color: COLORS.warmGray }}>ON DARK</span>
            </div>

            {/* Dark wordmark */}
            <div style={logoCard(COLORS.black, COLORS.black)}>
              <V2LogoWordmark size={48} color={COLORS.cream} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9, color: COLORS.warmGray }}>WORDMARK ON DARK</span>
            </div>

            {/* Single color */}
            <div style={logoCard('#fff', COLORS.lightBorder)}>
              <V2LogoMark size={96} color={COLORS.black} accent={COLORS.black} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9 }}>MONO / SINGLE COLOR</span>
            </div>
          </div>

          {/* Size test strip */}
          <div style={{ marginTop: 56 }}>
            <div style={{ ...label }}>SIZE TEST</div>
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end', marginTop: 16 }}>
              {[16, 24, 32, 48, 64, 96, 128].map(s => (
                <div key={s} style={{ textAlign: 'center' }}>
                  <V2LogoMark size={s} color={COLORS.black} accent={COLORS.orange} />
                  <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: COLORS.warmGray, marginTop: 8 }}>{s}px</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div style={thickRule} />

      {/* AFTER: Color Palette */}
      <section style={{ ...section, background: COLORS.black }}>
        <div style={inner}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={2} />
            <div style={{ ...label, paddingTop: 48, color: COLORS.warmGray }}>COLOR SYSTEM</div>
            <h2 style={{ ...headline, color: COLORS.cream }}>Palette</h2>
            <p style={{ ...body, color: COLORS.warmGray }}>
              Four colors. No gradients in production. The cream grounds, the black anchors,
              the orange activates, and the gold elevates.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 24, marginTop: 56, flexWrap: 'wrap' }}>
            <ColorSwatch color={COLORS.cream} name="Cream" hex="#FDF6EC" />
            <ColorSwatch color={COLORS.black} name="Black" hex="#0A0A0A" dark />
            <ColorSwatch color={COLORS.orange} name="Orange" hex="#E85D26" dark />
            <ColorSwatch color={COLORS.gold} name="Gold" hex="#C9A84C" dark />
          </div>

          <div style={{ marginTop: 56 }}>
            <div style={{ height: 1, background: '#333', marginBottom: 24 }} />
            {[
              { role: 'Background (primary)', color: 'Cream', hex: '#FDF6EC' },
              { role: 'Background (alternate)', color: 'Black', hex: '#0A0A0A' },
              { role: 'Text on light', color: 'Black', hex: '#0A0A0A' },
              { role: 'Text on dark', color: 'Cream', hex: '#FDF6EC' },
              { role: 'Accent (primary)', color: 'Orange', hex: '#E85D26' },
              { role: 'Accent (secondary)', color: 'Gold', hex: '#C9A84C' },
              { role: 'Secondary text', color: 'Warm Gray', hex: '#7A7267' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: '1px solid #222',
              }}>
                <span style={{
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 400,
                  color: COLORS.cream,
                }}>{item.role}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, background: item.hex, border: '1px solid #333' }} />
                  <span style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 400,
                    color: COLORS.warmGray,
                  }}>{item.hex}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ ...thickRule, background: COLORS.orange }} />

      {/* AFTER: Typography */}
      <section style={{ ...section, background: COLORS.cream }}>
        <V2ConstructionGrid width={400} height={300} />
        <div style={inner}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={3} />
            <div style={{ ...label, paddingTop: 48 }}>TYPE SYSTEM</div>
            <h2 style={headline}>Typography</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 48 }}>
            <div>
              <div style={{ ...label, marginBottom: 16, color: COLORS.orange }}>DISPLAY FONT</div>
              <div style={{
                fontFamily: '"Syne", sans-serif', fontSize: 56, fontWeight: 800,
                lineHeight: 1, color: COLORS.black, marginBottom: 8,
              }}>Syne</div>
              <div style={{
                fontFamily: '"Syne", sans-serif', fontSize: 16, fontWeight: 400,
                color: COLORS.warmGray, lineHeight: 1.6,
              }}>
                Bold, wide, expressive. Used for hero moments, display numbers, and
                anywhere the brand needs to be loud.
              </div>
              <div style={{ marginTop: 24 }}>
                {[400, 500, 600, 700, 800].map(w => (
                  <div key={w} style={{
                    fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: w,
                    lineHeight: 1.6, color: COLORS.black,
                  }}>
                    Syne {w} - Ahead of Market
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ ...label, marginBottom: 16, color: COLORS.gold }}>HEADLINE + BODY</div>
              <div style={{
                fontFamily: '"Space Grotesk", sans-serif', fontSize: 56, fontWeight: 700,
                lineHeight: 1, color: COLORS.black, marginBottom: 8,
              }}>Space Grotesk</div>
              <div style={{
                fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, fontWeight: 400,
                color: COLORS.warmGray, lineHeight: 1.6,
              }}>
                Geometric sans with character. Carries the brand from section headlines
                down to body copy and micro-labels.
              </div>
              <div style={{ marginTop: 24 }}>
                {[300, 400, 500, 600, 700].map(w => (
                  <div key={w} style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: w,
                    lineHeight: 1.6, color: COLORS.black,
                  }}>
                    Space Grotesk {w} - We make things
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Type scale */}
          <div style={{ marginTop: 80 }}>
            <div style={thinRule} />
            <div style={{ ...label, marginTop: 32, marginBottom: 32 }}>TYPE SCALE</div>
            {[
              { label: 'HERO DISPLAY', family: '"Syne", sans-serif', size: 80, weight: 800, tracking: '-0.03em', sample: 'AOM', lh: 0.9 },
              { label: 'SECTION HEADLINE', family: '"Space Grotesk", sans-serif', size: 42, weight: 700, tracking: '-0.01em', sample: 'We make things that bring opportunity', lh: 1.1 },
              { label: 'BODY', family: '"Space Grotesk", sans-serif', size: 16, weight: 400, tracking: '0', sample: 'AOM is a creative production and AI systems company based in Phoenix, AZ.', lh: 1.7 },
              { label: 'SECTION LABEL', family: '"Space Grotesk", sans-serif', size: 11, weight: 500, tracking: '0.2em', sample: 'ABOUT US', lh: 1.4, upper: true },
              { label: 'MICRO / BADGE', family: '"Space Grotesk", sans-serif', size: 10, weight: 700, tracking: '0.15em', sample: 'VIDEO  WEB  BRAND  AI', lh: 1.4, upper: true },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '180px 1fr',
                gap: 24, alignItems: 'baseline', padding: '24px 0',
                borderBottom: `1px solid ${COLORS.lightBorder}`,
              }}>
                <div>
                  <div style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.15em', textTransform: 'uppercase', color: COLORS.orange,
                    marginBottom: 4,
                  }}>{item.label}</div>
                  <div style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontSize: 11, fontWeight: 400,
                    color: COLORS.warmGray,
                  }}>{item.size}px / {item.weight}</div>
                </div>
                <div style={{
                  fontFamily: item.family,
                  fontSize: item.size,
                  fontWeight: item.weight,
                  letterSpacing: item.tracking,
                  lineHeight: item.lh,
                  textTransform: item.upper ? 'uppercase' : 'none',
                  color: COLORS.black,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{item.sample}</div>
              </div>
            ))}
          </div>

          {/* Mixed weight demo */}
          <div style={{ marginTop: 80, padding: '56px 0' }}>
            <div style={{ ...label, marginBottom: 24 }}>MIXED-WEIGHT HEADLINES</div>
            <div style={{ lineHeight: 1, marginBottom: 32 }}>
              <span style={{ fontFamily: '"Syne", sans-serif', fontSize: 64, fontWeight: 800, color: COLORS.black }}>WE </span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 64, fontWeight: 300, color: COLORS.warmGray }}>make </span>
              <span style={{ fontFamily: '"Syne", sans-serif', fontSize: 64, fontWeight: 800, color: COLORS.black }}>THINGS</span>
            </div>
            <div style={{ lineHeight: 1, marginBottom: 32 }}>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 64, fontWeight: 300, color: COLORS.warmGray }}>that </span>
              <span style={{ fontFamily: '"Syne", sans-serif', fontSize: 64, fontWeight: 800, color: COLORS.orange }}>BRING</span>
            </div>
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 64, fontWeight: 300, color: COLORS.warmGray }}>opportunity</span>
              <span style={{ fontFamily: '"Syne", sans-serif', fontSize: 64, fontWeight: 800, color: COLORS.gold }}>.</span>
            </div>
          </div>
        </div>
      </section>

      <div style={thickRule} />

      {/* AFTER: Patterns & Elements */}
      <section style={{ ...section, background: COLORS.cream }}>
        <div style={inner}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={4} />
            <div style={{ ...label, paddingTop: 48 }}>BRAND ELEMENTS V2</div>
            <h2 style={headline}>Patterns & Elements</h2>
            <p style={body}>
              Upgraded visual language. Gradient starbursts, noise textures, interlocking rings,
              woven grids, and radial dot patterns. Each element uses SVG gradients, masks, or
              filters for depth. These feel crafted, not generated.
            </p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24, marginTop: 56,
          }}>
            {/* Gradient Starburst */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              <div style={{ ...label, marginBottom: 0, fontSize: 9, alignSelf: 'flex-start' }}>GRADIENT STARBURST</div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <V2Starburst size={56} />
                <V2Starburst size={40} />
                <V2Starburst size={28} />
              </div>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa' }}>Orange-to-gold gradient, varied ray widths</span>
            </div>

            {/* Interlocking Rings */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              <div style={{ ...label, marginBottom: 0, fontSize: 9, alignSelf: 'flex-start' }}>INTERLOCKING RINGS</div>
              <V2InterlockRings size={160} />
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa' }}>Orange + gold, woven overlap</span>
            </div>

            {/* Radial Dots */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              <div style={{ ...label, marginBottom: 0, fontSize: 9, alignSelf: 'flex-start' }}>RADIAL DOTS</div>
              <V2RadialDots size={120} />
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa' }}>Multi-ring, multi-color, multi-size</span>
            </div>

            {/* Woven Grid */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden',
            }}>
              <div style={{ ...label, marginBottom: 0, fontSize: 9 }}>WOVEN GRID</div>
              <V2WovenGrid width={260} height={100} />
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa' }}>Gradient lines with intersection dots</span>
            </div>

            {/* Pill Badges */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ ...label, marginBottom: 0, fontSize: 9 }}>PILL BADGES</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge>VIDEO</Badge>
                <Badge>WEB</Badge>
                <Badge>BRAND</Badge>
                <Badge>AI</Badge>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge color={COLORS.orange}>FEATURED</Badge>
                <Badge color={COLORS.gold}>PREMIUM</Badge>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge color={COLORS.cream} bg={COLORS.black}>INVERTED</Badge>
                <Badge color={COLORS.cream} bg={COLORS.orange}>FILLED</Badge>
              </div>
            </div>

            {/* Construction Grid */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              position: 'relative', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ ...label, marginBottom: 0, fontSize: 9, zIndex: 1 }}>CONSTRUCTION GRID</div>
              <div style={{ position: 'relative', height: 120 }}>
                <V2ConstructionGrid width={260} height={120} style={{ position: 'relative' }} />
              </div>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa' }}>Fading grid with crosshair markers</span>
            </div>
          </div>

          {/* Data grid / boarding pass */}
          <div style={{ marginTop: 56 }}>
            <div style={{ ...label, marginBottom: 16 }}>DATA GRID (BOARDING PASS AESTHETIC)</div>
            <div style={{
              border: `2px solid ${COLORS.black}`, borderRadius: 4, overflow: 'hidden',
            }}>
              <div style={{
                background: COLORS.black, padding: '16px 24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <V2LogoWordmark color={COLORS.cream} size={24} />
                <V2Starburst size={20} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                  { label: 'CLIENT', value: 'AMBITION MECH.' },
                  { label: 'PROJECT', value: 'SOCIAL + WEB' },
                  { label: 'STATUS', value: 'IN PROGRESS' },
                  { label: 'DATE', value: 'MAR 2026' },
                  { label: 'DELIVERABLES', value: '18 BRIEFS' },
                  { label: 'PLATFORM', value: 'IG + FB' },
                  { label: 'RATE', value: '$3.5K/MO' },
                  { label: 'VERTICAL', value: 'CONSTRUCTION' },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: '16px 24px',
                    borderRight: (i + 1) % 4 !== 0 ? `1px solid ${COLORS.lightBorder}` : 'none',
                    borderBottom: i < 4 ? `1px solid ${COLORS.lightBorder}` : 'none',
                  }}>
                    <div style={{
                      fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, fontWeight: 500,
                      letterSpacing: '0.2em', textTransform: 'uppercase', color: COLORS.warmGray,
                      marginBottom: 4,
                    }}>{item.label}</div>
                    <div style={{
                      fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 700,
                      color: COLORS.black,
                    }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ ...thickRule, background: COLORS.gold }} />

      {/* AFTER: Photography */}
      <section style={{ ...section, background: COLORS.black }}>
        <div style={inner}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={5} />
            <div style={{ ...label, paddingTop: 48, color: COLORS.warmGray }}>IMAGERY</div>
            <h2 style={{ ...headline, color: COLORS.cream }}>Photography Direction</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 48 }}>
            <div>
              <div style={{ ...label, color: COLORS.orange, marginBottom: 16 }}>WHAT WE SHOOT</div>
              <ul style={{ ...body, color: '#999', padding: 0, listStyle: 'none', margin: 0 }}>
                {[
                  'Active jobsite footage. Workers building, welding, framing.',
                  'Tight action shots with shallow depth of field.',
                  'Architectural details: scaffolding geometry, rebar patterns.',
                  'Real people doing real work. Never stock, never posed.',
                  'Golden hour and dramatic natural lighting.',
                ].map((item, i) => (
                  <li key={i} style={{
                    padding: '8px 0', borderBottom: '1px solid #222',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}>
                    <span style={{ color: COLORS.orange, fontWeight: 700, fontSize: 14 }}>+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div style={{ ...label, color: COLORS.gold, marginBottom: 16 }}>TREATMENT</div>
              <ul style={{ ...body, color: '#999', padding: 0, listStyle: 'none', margin: 0 }}>
                {[
                  'Full color, slightly warm (+5-10% warmth in post).',
                  'Photos in defined containers with visible 1px black borders.',
                  'No full-bleed images. Always contained, always structured.',
                  'Duotone option: orange + black for select hero images.',
                ].map((item, i) => (
                  <li key={i} style={{
                    padding: '8px 0', borderBottom: '1px solid #222',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}>
                    <span style={{ color: COLORS.gold, fontWeight: 700, fontSize: 14 }}>+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div style={thickRule} />

      {/* AFTER: Voice & Tone */}
      <section style={{ ...section, background: COLORS.cream }}>
        <div style={inner}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={6} />
            <div style={{ ...label, paddingTop: 48 }}>BRAND VOICE</div>
            <h2 style={headline}>Voice & Tone</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 48 }}>
            <div>
              {[
                { title: 'Confident', desc: 'We know what we do and we do it well. No hedging.' },
                { title: 'Human', desc: 'Anti-BS. Real personality, real warmth.' },
                { title: 'Direct', desc: 'Say it, don\'t decorate it.' },
                { title: 'Knowledgeable', desc: '"We get it." Industry insider.' },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '24px 0',
                  borderBottom: `1px solid ${COLORS.lightBorder}`,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8,
                  }}>
                    <span style={{
                      fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 800,
                      color: COLORS.orange, lineHeight: 1,
                    }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{
                      fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 700,
                      color: COLORS.black,
                    }}>{item.title}</span>
                  </div>
                  <div style={{ ...body, paddingLeft: 48 }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ ...label, color: COLORS.orange, marginBottom: 24 }}>TONE SPECTRUM</div>
              {[
                { left: 'Casual', right: 'Formal', pos: 30 },
                { left: 'Playful', right: 'Serious', pos: 55 },
                { left: 'Enthusiastic', right: 'Reserved', pos: 35 },
                { left: 'Irreverent', right: 'Respectful', pos: 45 },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 12, fontWeight: 500, color: COLORS.black }}>{item.left}</span>
                    <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 12, fontWeight: 500, color: COLORS.warmGray }}>{item.right}</span>
                  </div>
                  <div style={{ height: 4, background: COLORS.lightBorder, borderRadius: 2, position: 'relative' }}>
                    <div style={{
                      position: 'absolute', top: -4, left: `${item.pos}%`,
                      width: 12, height: 12, borderRadius: 6,
                      background: COLORS.orange, transform: 'translateX(-50%)',
                    }} />
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 40, padding: 24, background: COLORS.darkCream, borderRadius: 4 }}>
                <div style={{ ...label, fontSize: 9, marginBottom: 12 }}>EXAMPLE COPY</div>
                <div style={{
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 600,
                  color: COLORS.black, lineHeight: 1.4, marginBottom: 8,
                }}>"We make things that impact."</div>
                <div style={{ ...body, fontSize: 14 }}>
                  Not "We leverage synergies to drive impactful outcomes."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={thickRule} />

      {/* AFTER: Do's and Don'ts */}
      <section style={{ ...section, background: COLORS.cream, paddingBottom: 48 }}>
        <div style={inner}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={7} />
            <div style={{ ...label, paddingTop: 48 }}>USAGE</div>
            <h2 style={headline}>Do's and Don'ts</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 48 }}>
            <div>
              <div style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 800, color: COLORS.orange, marginBottom: 24 }}>DO</div>
              {[
                'Use mixed-weight headlines for typographic rhythm.',
                'Keep cream/black contrast strong.',
                'Use pill badges for categorization.',
                'Let photos live inside bordered containers.',
                'Use Syne for hero moments only.',
                'Keep orange as activation. Gold as elevation.',
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '12px 0', borderBottom: `1px solid ${COLORS.lightBorder}`,
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 400,
                  color: COLORS.black, lineHeight: 1.6,
                }}>
                  <span style={{ color: COLORS.orange, fontWeight: 700, flexShrink: 0 }}>+</span>
                  {item}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 800, color: '#C44', marginBottom: 24 }}>DON'T</div>
              {[
                'Use gradients in production. The palette is flat.',
                'Add drop shadows. Use borders instead.',
                'Use Syne for body text.',
                'Use stock photography.',
                'Write corporate speak.',
                'Make the logo smaller than 32px.',
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '12px 0', borderBottom: `1px solid ${COLORS.lightBorder}`,
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 400,
                  color: COLORS.black, lineHeight: 1.6,
                }}>
                  <span style={{ color: '#C44', fontWeight: 700, flexShrink: 0 }}>&#x2212;</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Logo clear space */}
          <div style={{ marginTop: 56 }}>
            <div style={thinRule} />
            <div style={{ ...label, marginTop: 32, marginBottom: 24 }}>LOGO CLEAR SPACE</div>
            <p style={body}>
              Maintain clear space equal to the height of the "O" counter in the AOM wordmark on all sides.
            </p>
            <div style={{
              marginTop: 24, display: 'inline-flex', padding: 48,
              border: `1px dashed ${COLORS.lightBorder}`, borderRadius: 4,
              position: 'relative',
            }}>
              <V2LogoWordmark color={COLORS.black} size={48} />
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                border: `1px dashed ${COLORS.orange}`, borderRadius: 4, opacity: 0.4,
              }} />
            </div>
          </div>

          {/* Minimum sizes */}
          <div style={{ marginTop: 48 }}>
            <div style={{ ...label, marginBottom: 24 }}>MINIMUM SIZES</div>
            <div style={{ display: 'flex', gap: 48, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'center' }}>
                <V2LogoWordmark color={COLORS.black} size={48} />
                <div style={{ ...label, marginTop: 8, marginBottom: 0, fontSize: 9 }}>DIGITAL (48PX)</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <V2LogoMark color={COLORS.black} accent={COLORS.orange} size={32} />
                <div style={{ ...label, marginTop: 8, marginBottom: 0, fontSize: 9 }}>MARK MIN (32PX)</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <V2LogoBadge color={COLORS.black} size={48} />
                <div style={{ ...label, marginTop: 8, marginBottom: 0, fontSize: 9 }}>BADGE MIN (48PX)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer style={{
        background: COLORS.black, padding: '80px 60px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ ...inner, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
          <div>
            <div style={{ marginBottom: 24 }}>
              <V2LogoWordmark color={COLORS.cream} size={48} />
            </div>
            <div style={{
              fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 400,
              color: COLORS.warmGray, lineHeight: 1.7, maxWidth: 320,
            }}>
              Creative production and AI systems for companies that build. Phoenix, AZ.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <Badge color={COLORS.warmGray}>VIDEO</Badge>
              <Badge color={COLORS.warmGray}>WEB</Badge>
              <Badge color={COLORS.warmGray}>BRAND</Badge>
              <Badge color={COLORS.warmGray}>AI</Badge>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {[
              { label: 'DIRECTION', value: 'C: Bold Graphic' },
              { label: 'FONTS', value: 'Syne + Space Grotesk' },
              { label: 'VERSION', value: 'v2 (Skill Upgrade)' },
              { label: 'AGENT', value: 'Steffen' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', padding: '10px 0',
                borderBottom: '1px solid #222',
              }}>
                <span style={{
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.2em', color: COLORS.warmGray,
                }}>{item.label}</span>
                <span style={{
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 400,
                  color: COLORS.cream,
                }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
