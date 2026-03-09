import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Copy, Check } from 'lucide-react'

/* ================================================================== */
/*  GOOGLE FONT LOADER                                                 */
/* ================================================================== */

// Inject Barlow Condensed + Inter via Google Fonts
const fontLink = document.createElement('link')
fontLink.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap'
fontLink.rel = 'stylesheet'
if (!document.querySelector('link[href*="Barlow+Condensed"]')) {
  document.head.appendChild(fontLink)
}

/* ================================================================== */
/*  OG BRAND DATA                                                      */
/* ================================================================== */

const ogColors = {
  primary: [
    { name: 'Navy Blue', hex: '#1a237e', role: 'Primary Brand', usage: 'Logo core, headlines, primary backgrounds. The foundation color.' },
    { name: 'Navy Dark', hex: '#0d1642', role: 'Deep Background', usage: 'Hero sections, dark panels, overlay backgrounds.' },
    { name: 'Navy Mid', hex: '#283593', role: 'Supporting Blue', usage: 'Secondary panels, active states, depth layers.' },
    { name: 'Navy Light', hex: '#3949ab', role: 'Interactive', usage: 'Hover states, links, interactive elements.' },
  ],
  accent: [
    { name: 'Ambition Red', hex: '#dc2626', role: 'Primary Accent', usage: 'CTAs, flame elements, energy, urgency. The heat in the brand.' },
    { name: 'Red Light', hex: '#ef4444', role: 'Hover Red', usage: 'Hover states, lighter accent moments.' },
    { name: 'Red Dark', hex: '#b91c1c', role: 'Pressed Red', usage: 'Pressed/active states, deep emphasis.' },
    { name: 'Flame Orange', hex: '#ea580c', role: 'Warm Accent', usage: 'Gradient endpoints, flame transitions. Bridging red to warmth.' },
  ],
  supporting: [
    { name: 'Steel Gray', hex: '#374151', role: 'Supporting Neutral', usage: 'Body text on light, borders, dividers.' },
    { name: 'Warm Gray', hex: '#6b7280', role: 'Secondary Text', usage: 'Captions, muted labels, secondary info.' },
    { name: 'Light Gray', hex: '#d1d5db', role: 'Body on Dark', usage: 'Primary readable text on dark backgrounds.' },
    { name: 'Ice White', hex: '#f1f5f9', role: 'Light Surface', usage: 'Light mode backgrounds, cards, breathing space.' },
  ],
  backgrounds: [
    { name: 'Midnight', hex: '#0a0e2a', role: 'Page Background', usage: 'Primary dark background. Tinted navy, not pure black.' },
    { name: 'Deep Navy', hex: '#111638', role: 'Card Surface', usage: 'Cards, panels, elevated surfaces on dark.' },
    { name: 'Charcoal Navy', hex: '#1a1f45', role: 'Elevated Surface', usage: 'Inputs, modals, elevated panels.' },
    { name: 'Pure White', hex: '#ffffff', role: 'White', usage: 'Logo text, high contrast elements, reversed type.' },
  ],
}

const ogTypeScale = [
  { role: 'Display / Hero', font: 'Barlow Condensed', weight: '800 (ExtraBold)', size: '72-96px', tracking: '0.04em', lh: '0.92', notes: 'ALL CAPS always. Maximum impact. Used for hero moments and section headers.' },
  { role: 'H1 / Section Title', font: 'Barlow Condensed', weight: '700 (Bold)', size: '48-64px', tracking: '0.03em', lh: '1.0', notes: 'ALL CAPS. Primary section headers.' },
  { role: 'H2 / Sub-section', font: 'Barlow Condensed', weight: '600 (SemiBold)', size: '32-40px', tracking: '0.02em', lh: '1.1', notes: 'ALL CAPS. Sub-sections and card titles.' },
  { role: 'H3 / Card Title', font: 'Barlow Condensed', weight: '600 (SemiBold)', size: '24-28px', tracking: '0.02em', lh: '1.2', notes: 'ALL CAPS or sentence case.' },
  { role: 'Body', font: 'Inter', weight: '400 (Regular)', size: '15-16px', tracking: 'Normal', lh: '1.65', notes: 'Clean and readable. Max width 640px for comfort.' },
  { role: 'Body Small', font: 'Inter', weight: '400 (Regular)', size: '13-14px', tracking: '0.01em', lh: '1.6', notes: 'Cards, descriptions, secondary text.' },
  { role: 'Labels / Kickers', font: 'Barlow Condensed', weight: '600 (SemiBold)', size: '11-12px', tracking: '0.2em', lh: '1.2', notes: 'UPPERCASE always. Tiny section labels, metadata.' },
  { role: 'Captions', font: 'Inter', weight: '500 (Medium)', size: '10-11px', tracking: '0.15em', lh: '1.4', notes: 'UPPERCASE. Photo credits, timestamps, tags.' },
]

const ogVoiceAttributes = [
  { attr: 'Capable', yes: 'We handle commercial HVAC across every phase. All makes, all models.', no: 'We try our best to service most kinds of air conditioning systems.' },
  { attr: 'Direct', yes: '24/7 emergency dispatch. Call (480) 600-2942.', no: "Please don't hesitate to reach out whenever is convenient!" },
  { attr: 'Credible', yes: 'Licensed ROC #320923. Established 2002. 500+ projects completed.', no: "We're one of the top HVAC companies around!" },
  { attr: 'Grounded', yes: 'Built on precision, driven by integrity.', no: "We're the BEST and most AMAZING HVAC company!!!" },
  { attr: 'Human', yes: 'Our crew shows up. Every time.', no: 'Our team of dedicated professionals strives for excellence.' },
]

/* ================================================================== */
/*  WEB BRAND DATA (existing Bobby content)                            */
/* ================================================================== */

const primaryColors = [
  { name: 'Sky Blue', hex: '#0ea5e9', token: 'secondary-500', role: 'Primary Brand', usage: 'Links, highlights, chips, kickers. The dominant brand color.' },
  { name: 'Sky Blue Light', hex: '#38bdf8', token: 'secondary-400', role: 'Hover / Accent', usage: 'Hover states, accent text, logo "Mechanical" wordmark.' },
  { name: 'Sky Blue Dark', hex: '#0284c7', token: 'secondary-600', role: 'Interactive', usage: 'Buttons, interactive elements, CTAs.' },
  { name: 'Sky Blue Deepest', hex: '#0369a1', token: 'secondary-700', role: 'Pressed', usage: 'Pressed states, deep accents.' },
]

const accentColors = [
  { name: 'Red', hex: '#dc2626', token: 'accent-500', role: 'Primary CTA', usage: 'CTA buttons, urgent elements, headline underlines.' },
  { name: 'Red Light', hex: '#ef4444', token: 'accent-400', role: 'Hover Accent', usage: 'Hover accents, gradients.' },
  { name: 'Red Dark', hex: '#b91c1c', token: 'accent-600', role: 'Button BG', usage: 'Button backgrounds.' },
  { name: 'Red Deepest', hex: '#991b1b', token: 'accent-700', role: 'Pressed', usage: 'Pressed states.' },
]

const bgColors = [
  { name: 'Near-black', hex: '#0a0a0a', token: 'dark-950', role: 'Page BG', usage: 'Page background, hero overlays.' },
  { name: 'Charcoal', hex: '#111111', token: 'dark-900', role: 'Card Surface', usage: 'Cards, panels, sections.' },
  { name: 'Dark Gray', hex: '#1a1a1a', token: 'dark-800', role: 'Elevated', usage: 'Inputs, elevated panels, hover states.' },
]

const textColors = [
  { name: 'Body Text', hex: '#d1d5db', role: 'Primary Text', usage: 'Primary readable text on dark backgrounds.' },
  { name: 'Muted Text', hex: '#9ca3af', role: 'Secondary', usage: 'Secondary info, descriptions.' },
  { name: 'Subtle Text', hex: '#6b7280', role: 'Tertiary', usage: 'Kickers, captions, timestamps.' },
]

const typeRows = [
  { role: 'Hero Headlines', font: 'Inter', weight: 'Black (900)', size: '7xl-8xl', tracking: 'Tighter', lh: '0.92-1.05', notes: 'Maximum impact. Tight leading.' },
  { role: 'Section Headlines', font: 'Inter', weight: 'Extrabold (800)', size: '5xl-6xl', tracking: 'Tight', lh: '1.1', notes: '' },
  { role: 'Sub-headlines', font: 'Inter', weight: 'Bold (700)', size: '3xl-4xl', tracking: 'Tight', lh: '1.2', notes: '' },
  { role: 'Card Titles', font: 'Inter', weight: 'Semibold (600)', size: 'xl', tracking: 'Tight', lh: '1.3', notes: '' },
  { role: 'Body Text', font: 'Inter', weight: 'Light-Regular (300-400)', size: 'base-lg', tracking: 'Normal', lh: '1.6', notes: 'Light weight on hero subheadings.' },
  { role: 'Kickers/Labels', font: 'Inter', weight: 'Semibold (600)', size: 'xs', tracking: '0.18em', lh: '1.2', notes: 'UPPERCASE always.' },
  { role: 'Navigation', font: 'Inter', weight: 'Medium (500)', size: 'sm', tracking: 'Tight', lh: '1.4', notes: '' },
  { role: 'CTAs/Buttons', font: 'Inter', weight: 'Semibold-Bold (600-700)', size: 'sm-base', tracking: 'Normal to tight', lh: '1.4', notes: '' },
]

const voiceAttributes = [
  { attr: 'Confident', yes: 'We handle commercial HVAC systems across every phase.', no: 'We think we can probably help with your HVAC needs.' },
  { attr: 'Direct', yes: '24/7 emergency dispatch. Call (480) 600-2942.', no: "Don't hesitate to reach out if you ever need anything!" },
  { attr: 'Knowledgeable', yes: 'VRV systems, chillers, rooftop units. All makes, all models.', no: 'We fix air conditioners and stuff.' },
  { attr: 'Grounded', yes: 'Built on precision, driven by integrity.', no: "We're the BEST HVAC company in Arizona!!!" },
  { attr: 'Human', yes: 'Our crew shows up. Every time.', no: 'Corporate-speak with no personality' },
]

const toneShifts = [
  { context: 'Website copy', tone: 'Confident, professional, concise', example: 'We prioritize quality over quantity.' },
  { context: 'Social captions', tone: 'Slightly warmer, more casual, still competent', example: 'This Din Tai Fung kitchen buildout is coming together. Week 3 update.' },
  { context: 'Emergency/urgent', tone: 'Direct, no filler', example: '3AM call at Abraza. We were on-site in under an hour.' },
  { context: 'Recruitment', tone: 'Proud, inviting', example: "We're hiring techs who take the work personally." },
  { context: 'Client comms', tone: 'Clear, respectful, zero corporate fluff', example: "Here's where we're at on the project. Next steps below." },
]

/* ================================================================== */
/*  SVG BRAND PATTERNS                                                 */
/* ================================================================== */

function SnowflakePattern({ size = 200, color = '#1a237e', opacity = 0.15 }) {
  // Hexagonal snowflake geometry inspired by the logo's central element
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.4
  const spokes = 6
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: spokes }).map((_, i) => {
        const angle = (i * 60 - 90) * (Math.PI / 180)
        const x2 = cx + r * Math.cos(angle)
        const y2 = cy + r * Math.sin(angle)
        // Branch tips - two sets at different positions along the spoke
        const branchLen = r * 0.3
        const branchAngle1 = angle + 0.55
        const branchAngle2 = angle - 0.55
        // First branch pair at 50%
        const mx1 = cx + r * 0.5 * Math.cos(angle)
        const my1 = cy + r * 0.5 * Math.sin(angle)
        const bx1a = mx1 + branchLen * 0.7 * Math.cos(branchAngle1)
        const by1a = my1 + branchLen * 0.7 * Math.sin(branchAngle1)
        const bx1b = mx1 + branchLen * 0.7 * Math.cos(branchAngle2)
        const by1b = my1 + branchLen * 0.7 * Math.sin(branchAngle2)
        // Second branch pair at 75%
        const mx2 = cx + r * 0.75 * Math.cos(angle)
        const my2 = cy + r * 0.75 * Math.sin(angle)
        const bx2a = mx2 + branchLen * Math.cos(branchAngle1)
        const by2a = my2 + branchLen * Math.sin(branchAngle1)
        const bx2b = mx2 + branchLen * Math.cos(branchAngle2)
        const by2b = my2 + branchLen * Math.sin(branchAngle2)
        return (
          <g key={i} opacity={opacity}>
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <line x1={mx1} y1={my1} x2={bx1a} y2={by1a} stroke={color} strokeWidth={2} strokeLinecap="round" />
            <line x1={mx1} y1={my1} x2={bx1b} y2={by1b} stroke={color} strokeWidth={2} strokeLinecap="round" />
            <line x1={mx2} y1={my2} x2={bx2a} y2={by2a} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
            <line x1={mx2} y1={my2} x2={bx2b} y2={by2b} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
            <circle cx={x2} cy={y2} r={3.5} fill={color} />
          </g>
        )
      })}
      {/* Center hexagon */}
      <polygon
        points={Array.from({ length: 6 }).map((_, i) => {
          const a = (i * 60 - 90) * (Math.PI / 180)
          return `${cx + r * 0.22 * Math.cos(a)},${cy + r * 0.22 * Math.sin(a)}`
        }).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        opacity={opacity * 1.2}
      />
      {/* Inner dot */}
      <circle cx={cx} cy={cy} r={4} fill={color} opacity={opacity * 0.8} />
    </svg>
  )
}

function FlameWavePattern({ width = 400, height = 80, color = '#dc2626', opacity = 0.2 }) {
  // Radiating flame/heat wave motif from the logo's surrounding elements
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {[0, 1, 2, 3].map(i => (
        <path
          key={i}
          d={`M 0,${height * 0.5 + i * 6} Q ${width * 0.12},${height * 0.15 - i * 3} ${width * 0.25},${height * 0.55 + i * 2} Q ${width * 0.38},${height * 0.85 - i * 2} ${width * 0.5},${height * 0.4 - i * 3} Q ${width * 0.62},${height * 0.1 + i * 4} ${width * 0.75},${height * 0.6 + i * 2} Q ${width * 0.88},${height * 0.8 - i * 3} ${width},${height * 0.35 + i * 4}`}
          stroke={color}
          strokeWidth={2.5 - i * 0.5}
          opacity={opacity - i * 0.04}
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

function CircleBadgeFrame({ size = 240, navyColor = '#1a237e', redColor = '#dc2626' }) {
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.46
  const innerR = size * 0.38
  const dotR = 3.5
  const dotDistance = (outerR + innerR) / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={outerR} stroke={navyColor} strokeWidth={2.5} opacity={0.7} />
      <circle cx={cx} cy={cy} r={innerR} stroke={navyColor} strokeWidth={2} opacity={0.5} />
      {/* Separator dots at 3 positions (like logo) */}
      {[0, 120, 240].map((deg, i) => {
        const a = (deg - 90) * (Math.PI / 180)
        return <circle key={i} cx={cx + dotDistance * Math.cos(a)} cy={cy + dotDistance * Math.sin(a)} r={dotR} fill={navyColor} opacity={0.8} />
      })}
      {/* Flame arcs radiating outside */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
        const a1 = ((deg - 8) * Math.PI) / 180
        const a2 = ((deg + 8) * Math.PI) / 180
        const flameR = outerR + 12
        return (
          <path
            key={i}
            d={`M ${cx + outerR * Math.cos(a1)},${cy + outerR * Math.sin(a1)} Q ${cx + flameR * Math.cos((deg * Math.PI) / 180)},${cy + flameR * Math.sin((deg * Math.PI) / 180)} ${cx + outerR * Math.cos(a2)},${cy + outerR * Math.sin(a2)}`}
            stroke={redColor}
            strokeWidth={1.5}
            opacity={0.35}
            fill="none"
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}

function HexagonalGrid({ width = 600, height = 120, color = '#1a237e', opacity = 0.08 }) {
  const hexSize = 20
  const hexW = hexSize * 2
  const hexH = Math.sqrt(3) * hexSize
  const cols = Math.ceil(width / (hexW * 0.75)) + 1
  const rows = Math.ceil(height / hexH) + 1
  const hexPoints = (cx, cy) => {
    return Array.from({ length: 6 }).map((_, i) => {
      const a = (60 * i - 30) * (Math.PI / 180)
      return `${cx + hexSize * Math.cos(a)},${cy + hexSize * Math.sin(a)}`
    }).join(' ')
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => {
          const cx = col * hexW * 0.75
          const cy = row * hexH + (col % 2 === 1 ? hexH / 2 : 0)
          return (
            <polygon
              key={`${row}-${col}`}
              points={hexPoints(cx, cy)}
              fill="none"
              stroke={color}
              strokeWidth={0.5}
              opacity={opacity}
            />
          )
        })
      )}
    </svg>
  )
}

/* ================================================================== */
/*  SHARED HELPERS                                                     */
/* ================================================================== */

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handleCopy} className="ml-2 inline-flex items-center text-[#6b7280] hover:text-[#d1d5db] transition-colors" title="Copy">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

function ColorSwatch({ color, large }) {
  const lightHexes = ['#d1d5db', '#9ca3af', '#ef4444', '#dc2626', '#38bdf8', '#0ea5e9', '#f1f5f9', '#ffffff', '#ea580c']
  const isLight = lightHexes.includes(color.hex)
  return (
    <div className="group">
      <div
        className={`${large ? 'h-24 md:h-32' : 'h-16 md:h-20'} rounded-lg border border-white/10 relative overflow-hidden transition-all duration-300 group-hover:border-white/20`}
        style={{ backgroundColor: color.hex }}
      >
        <span className={`absolute bottom-2 left-3 font-mono text-[10px] font-bold ${isLight ? 'text-[#0a0a0a]' : 'text-[#d1d5db]'} opacity-80`}>
          {color.hex}
        </span>
      </div>
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <span className="text-[#d1d5db] text-sm font-semibold">{color.name}</span>
          <CopyButton text={color.hex} />
        </div>
        {color.token && <span className="font-mono text-[10px] text-[#6b7280] uppercase tracking-[0.2em]">{color.token}</span>}
        <span className="font-mono text-[10px] text-[#6b7280] uppercase tracking-[0.2em] block">{color.role}</span>
        {color.usage && <p className="text-[#9ca3af] text-xs mt-1 leading-relaxed">{color.usage}</p>}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  OG BRAND UPDATE TAB                                                */
/* ================================================================== */

function OGBrandUpdate() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0e2a', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Noise overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.025] mix-blend-overlay">
        <svg width="100%" height="100%">
          <filter id="og-noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#og-noise)" />
        </svg>
      </div>

      {/* ---- HERO ---- */}
      <section className="relative py-20 md:py-32 px-6 md:px-12 max-w-6xl mx-auto overflow-hidden">
        {/* Background snowflake pattern */}
        <div className="absolute top-0 right-0 opacity-30 pointer-events-none" style={{ transform: 'translate(20%, -15%)' }}>
          <SnowflakePattern size={400} color="#283593" opacity={0.12} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-[3px] bg-[#dc2626]" />
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.2em', fontSize: '11px', fontWeight: 600 }} className="uppercase text-[#dc2626]">
              OG Brand System
            </span>
          </div>

          {/* Logo placeholder area */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-10 mb-12">
            <div className="w-52 h-52 md:w-64 md:h-64 rounded-full flex items-center justify-center relative shrink-0" style={{ background: 'radial-gradient(circle, #1a1f45 0%, #111638 40%, #0a0e2a 80%)', border: '2px solid rgba(26, 35, 126, 0.5)', boxShadow: '0 0 60px rgba(26, 35, 126, 0.15), 0 0 120px rgba(26, 35, 126, 0.08), inset 0 0 40px rgba(26, 35, 126, 0.1)' }}>
              <CircleBadgeFrame size={250} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <SnowflakePattern size={60} color="#283593" opacity={0.5} />
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '9px', letterSpacing: '0.2em', color: '#6b7280', marginTop: '6px', textTransform: 'uppercase' }}>
                    Existing Logo
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 'clamp(48px, 8vw, 80px)', letterSpacing: '0.04em', lineHeight: 0.92, color: '#ffffff', textTransform: 'uppercase' }}>
                AMBITION<br />
                <span style={{ color: '#dc2626' }}>MECHANICAL</span><br />
                <span style={{ color: '#9ca3af', fontSize: '0.5em', fontWeight: 600 }}>SERVICES</span>
              </h1>
              <p className="mt-6 max-w-md" style={{ color: '#9ca3af', fontSize: '15px', lineHeight: 1.65 }}>
                The brand system built around the existing Ambition Mechanical Services logo. Navy, red, white. Snowflake and flames. Heating and cooling. Since 2002.
              </p>
            </div>
          </div>

          {/* Flame wave divider */}
          <FlameWavePattern width={600} height={60} color="#dc2626" opacity={0.15} />
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 md:px-12">

        {/* ---- 01. THE LOGO ---- */}
        <section className="py-16 md:py-24" style={{ borderTop: '1px solid rgba(26, 35, 126, 0.3)' }}>
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', color: '#dc2626' }}>01</span>
              <div className="w-6 h-[2px] bg-[#dc2626]" />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>The Logo</span>
            </div>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 48px)', letterSpacing: '0.03em', color: '#ffffff', textTransform: 'uppercase' }}>
              THE MARK STAYS
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: 1.65, marginTop: '12px', maxWidth: '640px' }}>
              The Ambition Mechanical Services logo is a circular badge/seal. It cannot be changed, redrawn, or reinterpreted. Everything in this brand system exists to support it.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 rounded-lg" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.3)' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#1a237e', textTransform: 'uppercase' }}>Logo Anatomy</span>
              <ul className="mt-6 space-y-3">
                {[
                  'Circular badge/seal layout',
                  'Center: Navy blue snowflake with building/cityscape silhouette',
                  'Surrounding: Red/orange flame/heat wave elements radiating outward',
                  'Text curved around circle: "AMBITION" (top), "MECHANICAL" (right), "SERVICES" (bottom-left)',
                  'Bold condensed sans-serif, slightly condensed, all caps',
                  'Small blue dots between words as separators',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#1a237e' }} />
                    <span style={{ color: '#d1d5db', fontSize: '14px', lineHeight: 1.6 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 rounded-lg" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.3)' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>Logo Rules</span>
              <ul className="mt-6 space-y-3">
                {[
                  'Never alter, redraw, or recreate the logo',
                  'Minimum clear space: height of the "A" on all sides',
                  'Minimum size: 48px diameter (digital), 0.5" diameter (print)',
                  'On dark backgrounds: use as-is (navy, red, white)',
                  'On light backgrounds: use as-is or single-color navy version',
                  'Never place on busy photo backgrounds without a solid backing',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-2.5 w-3 h-[1px] shrink-0" style={{ backgroundColor: '#dc2626' }} />
                    <span style={{ color: '#d1d5db', fontSize: '14px', lineHeight: 1.6 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---- 02. COLOR PALETTE ---- */}
        <section className="py-16 md:py-24" style={{ borderTop: '1px solid rgba(26, 35, 126, 0.3)' }}>
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', color: '#dc2626' }}>02</span>
              <div className="w-6 h-[2px] bg-[#dc2626]" />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Color System</span>
            </div>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 48px)', letterSpacing: '0.03em', color: '#ffffff', textTransform: 'uppercase' }}>
              NAVY AND RED
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: 1.65, marginTop: '12px', maxWidth: '640px' }}>
              Extracted from the logo and expanded into a full system. Navy leads. Red brings the heat. The supporting palette makes both feel sophisticated, not clip-art.
            </p>
          </div>

          {/* Primary Navy */}
          <div className="mb-14">
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#283593', textTransform: 'uppercase' }}>Primary / Navy Blue</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {ogColors.primary.map(c => <ColorSwatch key={c.hex} color={c} large />)}
            </div>
          </div>

          {/* Accent Red */}
          <div className="mb-14">
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>Accent / Red & Flame</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {ogColors.accent.map(c => <ColorSwatch key={c.hex} color={c} large />)}
            </div>
          </div>

          {/* Supporting Neutrals */}
          <div className="mb-14">
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Supporting Neutrals</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {ogColors.supporting.map(c => <ColorSwatch key={c.hex} color={c} />)}
            </div>
          </div>

          {/* Backgrounds */}
          <div className="mb-14">
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Backgrounds & Surfaces</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {ogColors.backgrounds.map(c => <ColorSwatch key={c.hex} color={c} />)}
            </div>
          </div>

          {/* Color Ratios */}
          <div className="p-8 rounded-lg" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.3)' }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Color Ratios</span>
            <div className="mt-6 flex gap-1 h-10 rounded-lg overflow-hidden">
              <div className="flex-[55] flex items-center justify-center" style={{ backgroundColor: '#1a237e' }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.1em', color: '#ffffff' }}>55% NAVY</span>
              </div>
              <div className="flex-[20] flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.1em', color: '#1a237e' }}>20% WHITE</span>
              </div>
              <div className="flex-[15] flex items-center justify-center" style={{ backgroundColor: '#dc2626' }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '10px', letterSpacing: '0.1em', color: '#ffffff' }}>15% RED</span>
              </div>
              <div className="flex-[10] flex items-center justify-center" style={{ backgroundColor: '#374151' }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '10px', letterSpacing: '0.1em', color: '#d1d5db' }}>10%</span>
              </div>
            </div>
            <ul className="mt-6 space-y-2">
              {[
                'Navy is the anchor. It appears in backgrounds, headlines, and structural elements.',
                'White is for type, breathing space, and clarity. It keeps navy from becoming heavy.',
                'Red is the energy. CTAs, flame accents, emphasis. It should pop because it\'s rare.',
                'Neutrals fill the gaps. Steel grays for text, warm grays for secondary info.',
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#283593' }} />
                  <span style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.6 }}>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- 03. TYPOGRAPHY ---- */}
        <section className="py-16 md:py-24" style={{ borderTop: '1px solid rgba(26, 35, 126, 0.3)' }}>
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', color: '#dc2626' }}>03</span>
              <div className="w-6 h-[2px] bg-[#dc2626]" />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Typography</span>
            </div>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 48px)', letterSpacing: '0.03em', color: '#ffffff', textTransform: 'uppercase' }}>
              BARLOW CONDENSED + INTER
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: 1.65, marginTop: '12px', maxWidth: '640px' }}>
              The logo's curved text is a bold condensed sans-serif. Barlow Condensed is the closest Google Font match: the proportions, condensed width, and weight all align. Inter handles everything else.
            </p>
          </div>

          {/* Font identification */}
          <div className="p-8 rounded-lg mb-8" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.3)' }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>Font Identification</span>
            <div className="mt-6 grid md:grid-cols-2 gap-8">
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '13px', letterSpacing: '0.1em', color: '#283593', textTransform: 'uppercase', marginBottom: '8px' }}>Logo Text Match</p>
                <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: 1.6 }}>
                  The curved text in the logo ("AMBITION MECHANICAL SERVICES") is a bold condensed sans-serif with slightly narrow proportions and clean terminals. Closest Google Font match: <strong style={{ color: '#ffffff' }}>Barlow Condensed Bold/ExtraBold</strong>.
                </p>
                <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px' }}>
                  Other candidates considered: Oswald (too wide), Bebas Neue (too narrow, no lowercase), Anton (too heavy). Barlow Condensed hits the right balance of condensed width, clean geometry, and weight range.
                </p>
              </div>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '13px', letterSpacing: '0.1em', color: '#283593', textTransform: 'uppercase', marginBottom: '8px' }}>Import Links</p>
                <div className="p-4 rounded" style={{ backgroundColor: '#0a0e2a', fontFamily: 'monospace', fontSize: '11px', color: '#6b7280', lineHeight: 1.8 }}>
                  <span style={{ color: '#dc2626' }}>@import</span> url('https://fonts.googleapis.com/css2?family=<span style={{ color: '#ffffff' }}>Barlow+Condensed</span>:wght@400;500;600;700;800;900');<br />
                  <span style={{ color: '#dc2626' }}>@import</span> url('https://fonts.googleapis.com/css2?family=<span style={{ color: '#ffffff' }}>Inter</span>:wght@300;400;500;600;700;800;900');
                </div>
              </div>
            </div>
          </div>

          {/* Live type specimens */}
          <div className="p-8 rounded-lg mb-8" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.3)' }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Live Specimens</span>
            <div className="mt-8 space-y-8">
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '72px', letterSpacing: '0.04em', lineHeight: 0.92, color: '#ffffff', textTransform: 'uppercase' }}>
                  AMBITION MECHANICAL
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#6b7280', marginTop: '8px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Barlow Condensed ExtraBold 800 / 72px / Tracking 0.04em
                </p>
              </div>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '48px', letterSpacing: '0.03em', lineHeight: 1.0, color: '#ffffff', textTransform: 'uppercase' }}>
                  COMMERCIAL HVAC THAT DELIVERS
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#6b7280', marginTop: '8px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Barlow Condensed Bold 700 / 48px / Tracking 0.03em
                </p>
              </div>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '16px', lineHeight: 1.65, color: '#d1d5db', maxWidth: '640px' }}>
                  Ambition Mechanical Services has been delivering precision HVAC solutions across Arizona since 2002. From preconstruction planning to preventive maintenance, we handle commercial and industrial mechanical systems with the integrity and reliability that our name demands.
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#6b7280', marginTop: '8px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Inter Regular 400 / 16px / Line-height 1.65
                </p>
              </div>
            </div>
          </div>

          {/* Type scale table */}
          <div className="space-y-3">
            {ogTypeScale.map(row => (
              <div key={row.role} className="p-5 rounded-lg flex flex-col md:flex-row md:items-center gap-4" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.2)' }}>
                <div className="flex-1">
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '12px', letterSpacing: '0.15em', color: '#dc2626', textTransform: 'uppercase' }}>{row.role}</p>
                  <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>{row.font} / {row.weight}</p>
                </div>
                <div className="flex gap-4 flex-wrap">
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' }}>Size: {row.size}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' }}>Track: {row.tracking}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' }}>LH: {row.lh}</span>
                </div>
                {row.notes && <p style={{ color: '#4b5563', fontSize: '11px', maxWidth: '300px' }}>{row.notes}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* ---- 04. BRAND PATTERNS & ELEMENTS ---- */}
        <section className="py-16 md:py-24" style={{ borderTop: '1px solid rgba(26, 35, 126, 0.3)' }}>
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', color: '#dc2626' }}>04</span>
              <div className="w-6 h-[2px] bg-[#dc2626]" />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Brand Patterns</span>
            </div>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 48px)', letterSpacing: '0.03em', color: '#ffffff', textTransform: 'uppercase' }}>
              ELEMENTS FROM THE LOGO
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: 1.65, marginTop: '12px', maxWidth: '640px' }}>
              Geometric patterns extracted from the logo's core elements. These make the brand feel like a system, not just a logo on a page.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Snowflake geometry */}
            <div className="p-8 rounded-lg flex flex-col items-center" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.3)' }}>
              <SnowflakePattern size={180} color="#3949ab" opacity={0.6} />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#283593', textTransform: 'uppercase', marginTop: '16px' }}>Snowflake Geometry</span>
              <p style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 }}>
                Six-fold symmetry from the logo's snowflake. Used as background patterns, watermarks, and section dividers.
              </p>
            </div>

            {/* Flame wave */}
            <div className="p-8 rounded-lg flex flex-col items-center" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.3)' }}>
              <div className="h-[180px] flex items-center">
                <FlameWavePattern width={220} height={120} color="#dc2626" opacity={0.55} />
              </div>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase', marginTop: '16px' }}>Heat Wave Motif</span>
              <p style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 }}>
                Radiating wave pattern from the logo's flame elements. Used as section dividers and accent backgrounds.
              </p>
            </div>

            {/* Circle badge */}
            <div className="p-8 rounded-lg flex flex-col items-center" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.3)' }}>
              <div className="h-[180px] flex items-center">
                <CircleBadgeFrame size={170} />
              </div>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase', marginTop: '16px' }}>Circular Badge Frame</span>
              <p style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 }}>
                Double-ring frame with dot separators and flame arcs. Used for badges, stamps, and seal treatments.
              </p>
            </div>
          </div>

          {/* Hexagonal grid pattern */}
          <div className="p-8 rounded-lg" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.3)' }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Hexagonal Grid (Snowflake-derived)</span>
            <div className="mt-4 overflow-hidden rounded-lg">
              <HexagonalGrid width={900} height={100} color="#283593" opacity={0.15} />
            </div>
            <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '12px', lineHeight: 1.5 }}>
              Based on the snowflake's hexagonal symmetry. Used as subtle background textures on printed materials, vehicle wraps, and large-format applications.
            </p>
          </div>
        </section>

        {/* ---- 05. PHOTOGRAPHY DIRECTION ---- */}
        <section className="py-16 md:py-24" style={{ borderTop: '1px solid rgba(26, 35, 126, 0.3)' }}>
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', color: '#dc2626' }}>05</span>
              <div className="w-6 h-[2px] bg-[#dc2626]" />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Photography</span>
            </div>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 48px)', letterSpacing: '0.03em', color: '#ffffff', textTransform: 'uppercase' }}>
              HOW IT LOOKS ON CAMERA
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[
              { label: 'HVAC Equipment', desc: 'Clean shots of rooftop units, chillers, VRV systems, piping. Show the precision of the install. Slightly cool color grade with strong contrast. The equipment should look engineered, not industrial.' },
              { label: 'The Crew', desc: 'Real people doing real work. Hard hats, tools in hand, focused expressions. Shoulder-up portraits for social. Never posed. The candid moment is always stronger.' },
              { label: 'Facilities & Scale', desc: 'Wide shots showing the scope of commercial projects. Intel fabs, hospital systems, restaurant kitchens. The scale tells the credibility story without words.' },
              { label: 'Process & Progress', desc: 'Before/during/after sequences. Piping going in, ductwork being connected, systems coming online. Progress content is the #1 performing format on social.' },
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-lg" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.3)' }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: i < 2 ? '#dc2626' : '#283593', textTransform: 'uppercase' }}>{item.label}</span>
                <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: 1.6, marginTop: '12px' }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-8 rounded-lg" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.3)' }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Color Grade Direction</span>
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              {[
                { param: 'Temperature', value: 'Neutral to slightly cool', note: 'The navy in the brand informs the grade subtly. Never warm/orange.' },
                { param: 'Contrast', value: 'Medium-high', note: 'Clean shadows with detail. Not crushed, not flat.' },
                { param: 'Saturation', value: 'Controlled', note: 'Pulled back 10-15% from natural. Reds stay strong for on-brand moments.' },
              ].map((item, i) => (
                <div key={i}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '12px', letterSpacing: '0.1em', color: '#dc2626', textTransform: 'uppercase' }}>{item.param}</p>
                  <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>{item.value}</p>
                  <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- 06. APPLICATION EXAMPLES ---- */}
        <section className="py-16 md:py-24" style={{ borderTop: '1px solid rgba(26, 35, 126, 0.3)' }}>
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', color: '#dc2626' }}>06</span>
              <div className="w-6 h-[2px] bg-[#dc2626]" />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Applications</span>
            </div>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 48px)', letterSpacing: '0.03em', color: '#ffffff', textTransform: 'uppercase' }}>
              HOW THE BRAND LIVES
            </h2>
          </div>

          {/* Business Card */}
          <div className="mb-10">
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Business Card</span>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Front */}
              <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '3.5/2' }}>
                <div className="w-full h-full p-8 flex flex-col justify-between relative" style={{ backgroundColor: '#1a237e' }}>
                  <div className="absolute top-0 right-0 opacity-10 pointer-events-none" style={{ transform: 'translate(30%, -30%)' }}>
                    <SnowflakePattern size={200} color="#ffffff" opacity={0.3} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ border: '1.5px solid rgba(255,255,255,0.3)' }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dc2626' }} />
                    </div>
                  </div>
                  <div className="relative z-10">
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '18px', letterSpacing: '0.06em', color: '#ffffff', textTransform: 'uppercase' }}>
                      AMBITION MECHANICAL
                    </p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 500, fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                      SERVICES
                    </p>
                  </div>
                </div>
              </div>
              {/* Back */}
              <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '3.5/2' }}>
                <div className="w-full h-full p-8 flex flex-col justify-between" style={{ backgroundColor: '#ffffff' }}>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', color: '#1a237e', textTransform: 'uppercase' }}>
                      MARLON PRIMROSE
                    </p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>
                      OPERATIONS MANAGER
                    </p>
                  </div>
                  <div>
                    <div className="space-y-1">
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#374151' }}>(480) 600-2942</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#374151' }}>info@ambitionmechanical.com</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#374151' }}>Tempe, AZ</p>
                    </div>
                    <div className="mt-3 w-8 h-[2px]" style={{ backgroundColor: '#dc2626' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Wrap */}
          <div className="mb-10">
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Vehicle Wrap Concept</span>
            <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '3/1' }}>
              <div className="w-full h-full relative" style={{ backgroundColor: '#1a237e' }}>
                {/* Hex pattern background */}
                <div className="absolute inset-0 opacity-10">
                  <HexagonalGrid width={1200} height={400} color="#ffffff" opacity={0.3} />
                </div>
                {/* Flame accent strip */}
                <div className="absolute bottom-0 left-0 right-0 h-[15%]" style={{ backgroundColor: '#dc2626' }} />
                {/* Content */}
                <div className="absolute inset-0 flex items-center justify-between px-12">
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 56px)', letterSpacing: '0.04em', color: '#ffffff', textTransform: 'uppercase', lineHeight: 0.95 }}>
                      AMBITION<br />MECHANICAL
                    </p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 500, fontSize: 'clamp(10px, 1.5vw, 16px)', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginTop: '8px' }}>
                      COMMERCIAL HVAC SERVICES
                    </p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 'clamp(14px, 2.5vw, 32px)', letterSpacing: '0.04em', color: '#ffffff' }}>
                      (480) 600-2942
                    </p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(8px, 1vw, 12px)', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>
                      ROC #320923 | EST. 2002
                    </p>
                  </div>
                </div>
                {/* Logo placeholder */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
                  <CircleBadgeFrame size={200} navyColor="#ffffff" redColor="#ffffff" />
                </div>
              </div>
            </div>
          </div>

          {/* Social Media Templates -- Full Kit */}
          <div className="mb-10">
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Social Media Template Kit</span>
            <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px', maxWidth: '640px' }}>
              Five production-ready templates for Cleo and Tony. Each uses the OG brand system (navy, red, white, Barlow Condensed). Swap placeholder content for real project details.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* ---- 1. INSTAGRAM POST: Quote/Stat Overlay 1080x1080 ---- */}
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '10px', letterSpacing: '0.15em', color: '#283593', textTransform: 'uppercase', marginBottom: '8px' }}>Instagram Post / 1080 x 1080</p>
                <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '1/1' }}>
                  <div className="w-full h-full flex flex-col justify-between relative" style={{ backgroundColor: '#0a0e2a' }}>
                    {/* Background snowflake */}
                    <div className="absolute top-0 right-0 opacity-[0.04] pointer-events-none" style={{ transform: 'translate(15%, -15%)' }}>
                      <SnowflakePattern size={280} color="#ffffff" opacity={0.4} />
                    </div>
                    {/* Top bar */}
                    <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: '#dc2626' }} />
                    {/* Kicker */}
                    <div className="p-6 relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#dc2626' }} />
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '9px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>BY THE NUMBERS</span>
                      </div>
                    </div>
                    {/* Center stat */}
                    <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '80px', letterSpacing: '0.02em', color: '#ffffff', lineHeight: 0.85, textTransform: 'uppercase' }}>
                        500+
                      </p>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '18px', letterSpacing: '0.08em', color: '#dc2626', textTransform: 'uppercase', marginTop: '8px' }}>
                        PROJECTS COMPLETED
                      </p>
                      <div className="w-12 h-[2px] mt-4 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>
                        From Intel fabs to restaurant kitchens. 23 years of commercial HVAC precision.
                      </p>
                    </div>
                    {/* Bottom brand bar */}
                    <div className="p-6 relative z-10 flex items-end justify-between">
                      <div>
                        <div className="w-8 h-[2px] mb-3" style={{ backgroundColor: '#dc2626' }} />
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em', color: '#ffffff', textTransform: 'uppercase' }}>
                          AMBITION MECHANICAL
                        </p>
                      </div>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        @ambition_air_conditioning
                      </p>
                    </div>
                  </div>
                </div>
                <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '8px', lineHeight: 1.4 }}>Quote/stat overlay. Use for data points, milestones, or bold claims. ExtraBold number as hero element.</p>
              </div>

              {/* ---- 2. STORY / REEL COVER 1080x1920 ---- */}
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '10px', letterSpacing: '0.15em', color: '#283593', textTransform: 'uppercase', marginBottom: '8px' }}>Story / Reel Cover / 1080 x 1920</p>
                <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: '440px' }}>
                  <div className="w-full h-full flex flex-col justify-end relative" style={{ backgroundColor: '#1a237e' }}>
                    {/* Hex grid background */}
                    <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
                      <HexagonalGrid width={400} height={800} color="#ffffff" opacity={0.2} />
                    </div>
                    {/* Photo area placeholder */}
                    <div className="absolute top-0 left-0 right-0" style={{ height: '55%', background: 'linear-gradient(180deg, rgba(26,35,126,0.2) 0%, #1a237e 100%)' }}>
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 500, fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>PHOTO / VIDEO AREA</span>
                      </div>
                    </div>
                    {/* Top bar with handle */}
                    <div className="absolute top-4 left-5 right-5 flex justify-between items-center z-10">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: '1.5px solid rgba(255,255,255,0.25)' }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#dc2626' }} />
                      </div>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>@ambition_air_conditioning</span>
                    </div>
                    {/* Bottom content */}
                    <div className="relative z-10 p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#dc2626' }} />
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '8px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>3AM EMERGENCY</span>
                      </div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '26px', letterSpacing: '0.03em', color: '#ffffff', textTransform: 'uppercase', lineHeight: 0.95 }}>
                        ABRAZA CHILLER<br />WENT DOWN
                      </p>
                      <div className="w-10 h-[2px] mt-4 mb-3" style={{ backgroundColor: '#dc2626' }} />
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, maxWidth: '240px' }}>
                        On-site in under an hour. System back online by sunrise.
                      </p>
                      {/* Swipe CTA */}
                      <div className="mt-4 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dc2626' }}>
                          <span style={{ color: '#ffffff', fontSize: '10px', lineHeight: 1 }}>&#8593;</span>
                        </div>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>LEARN MORE</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '8px', lineHeight: 1.4 }}>Vertical format with text overlay. Photo fills upper area with gradient fade to navy. Emergency response stories perform best.</p>
              </div>

              {/* ---- 3. BEFORE / AFTER SPLIT 1080x1080 ---- */}
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '10px', letterSpacing: '0.15em', color: '#283593', textTransform: 'uppercase', marginBottom: '8px' }}>Before / After Split / 1080 x 1080</p>
                <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '1/1', position: 'relative' }}>
                  <div className="w-full h-full flex flex-col" style={{ backgroundColor: '#0a0e2a' }}>
                    {/* Top kicker bar */}
                    <div className="py-3 px-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(26,35,126,0.4)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#dc2626' }} />
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '9px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>TRANSFORMATION</span>
                      </div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>DIN TAI FUNG</span>
                    </div>
                    {/* Split area */}
                    <div className="flex-1 flex" style={{ position: 'relative' }}>
                      {/* Left: Before */}
                      <div className="flex-1 flex flex-col p-5" style={{ borderRight: '2px solid #dc2626' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '8px' }}>BEFORE</span>
                        <div className="flex-1 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>IMAGE</span>
                        </div>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '8px', lineHeight: 1.4 }}>Empty kitchen shell, bare ductwork exposed</p>
                      </div>
                      {/* Right: After */}
                      <div className="flex-1 flex flex-col p-5">
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '11px', letterSpacing: '0.15em', color: '#dc2626', textTransform: 'uppercase', marginBottom: '8px' }}>AFTER</span>
                        <div className="flex-1 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>IMAGE</span>
                        </div>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: 1.4 }}>Full HVAC system installed, tested, and running</p>
                      </div>
                      {/* Center badge */}
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '28px', height: '28px', borderRadius: '14px', backgroundColor: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px #0a0e2a, 0 0 12px rgba(220,38,38,0.4)' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '8px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.1em' }}>VS</span>
                      </div>
                    </div>
                    {/* Bottom brand bar */}
                    <div className="py-3 px-5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(26,35,126,0.4)' }}>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.06em', color: '#ffffff', textTransform: 'uppercase' }}>
                        AMBITION MECHANICAL
                      </p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>
                        ROC #320923
                      </p>
                    </div>
                  </div>
                </div>
                <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '8px', lineHeight: 1.4 }}>Split layout for project transformations. Red center divider with VS badge. This is the #1 performing content format in construction.</p>
              </div>

              {/* ---- 4. TESTIMONIAL CARD 1080x1080 ---- */}
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '10px', letterSpacing: '0.15em', color: '#283593', textTransform: 'uppercase', marginBottom: '8px' }}>Testimonial Card / 1080 x 1080</p>
                <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '1/1' }}>
                  <div className="w-full h-full flex flex-col relative" style={{ backgroundColor: '#ffffff' }}>
                    {/* Top red accent bar */}
                    <div className="w-full h-[4px]" style={{ backgroundColor: '#dc2626' }} />
                    {/* Navy sidebar accent */}
                    <div className="absolute left-0 top-[4px] bottom-0 w-[4px]" style={{ backgroundColor: '#1a237e' }} />
                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-center p-8 pl-10">
                      {/* Large quote mark */}
                      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '96px', fontWeight: 900, color: '#1a237e', lineHeight: 0.5, opacity: 0.08, marginBottom: '8px' }}>"</div>
                      {/* Quote text */}
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '20px', letterSpacing: '0.01em', color: '#1a237e', lineHeight: 1.3, maxWidth: '320px', textTransform: 'uppercase' }}>
                        AMBITION DOESN'T JUST FIX SYSTEMS. THEY BUILD RELATIONSHIPS THAT LAST DECADES.
                      </p>
                      {/* Attribution */}
                      <div className="mt-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1a237e' }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '13px', color: '#ffffff' }}>JD</span>
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '13px', letterSpacing: '0.04em', color: '#1a237e', textTransform: 'uppercase' }}>JOHN DOE</p>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#6b7280' }}>Facilities Director, Banner Health</p>
                        </div>
                      </div>
                    </div>
                    {/* Bottom brand bar */}
                    <div className="px-8 py-4 flex items-center justify-between" style={{ borderTop: '1px solid #e5e7eb' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ border: '1.5px solid #1a237e' }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#dc2626' }} />
                        </div>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.06em', color: '#1a237e', textTransform: 'uppercase' }}>
                          AMBITION MECHANICAL
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="w-3 h-3" style={{ color: '#dc2626' }}>
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '8px', lineHeight: 1.4 }}>White background testimonial. Navy sidebar accent, red top bar. Initials avatar. Star rating in bottom bar builds social proof.</p>
              </div>

              {/* ---- 5. QUICK TIP / EDUCATIONAL 1080x1080 ---- */}
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '10px', letterSpacing: '0.15em', color: '#283593', textTransform: 'uppercase', marginBottom: '8px' }}>Quick Tip / Educational / 1080 x 1080</p>
                <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '1/1' }}>
                  <div className="w-full h-full flex flex-col relative" style={{ backgroundColor: '#0a0e2a' }}>
                    {/* Background hex grid */}
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
                      <HexagonalGrid width={500} height={500} color="#283593" opacity={0.3} />
                    </div>
                    {/* Top section with badge + number */}
                    <div className="p-6 flex items-start justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-sm" style={{ backgroundColor: '#dc2626' }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '9px', letterSpacing: '0.15em', color: '#ffffff', textTransform: 'uppercase' }}>PRO TIP</span>
                        </div>
                      </div>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '48px', color: '#1a237e', lineHeight: 0.8, opacity: 0.4 }}>01</span>
                    </div>
                    {/* Title */}
                    <div className="px-6 relative z-10">
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '28px', letterSpacing: '0.03em', color: '#ffffff', textTransform: 'uppercase', lineHeight: 0.95 }}>
                        WHY PREVENTIVE<br />MAINTENANCE<br /><span style={{ color: '#dc2626' }}>SAVES YOU 40%</span>
                      </p>
                    </div>
                    {/* Divider */}
                    <div className="px-6 mt-4 relative z-10">
                      <div className="w-10 h-[2px]" style={{ backgroundColor: '#dc2626' }} />
                    </div>
                    {/* Bullet points */}
                    <div className="flex-1 px-6 mt-4 relative z-10">
                      {[
                        'Extend equipment lifespan by 5-10 years',
                        'Reduce emergency callouts by 60%',
                        'Lower energy costs with optimized systems',
                      ].map((tip, i) => (
                        <div key={i} className="flex items-start gap-3 mb-3">
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '13px', color: '#dc2626', lineHeight: 1.5, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{tip}</span>
                        </div>
                      ))}
                    </div>
                    {/* Bottom brand bar */}
                    <div className="px-6 py-4 flex items-center justify-between relative z-10" style={{ borderTop: '1px solid rgba(26,35,126,0.3)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#dc2626' }} />
                        </div>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '10px', letterSpacing: '0.06em', color: '#ffffff', textTransform: 'uppercase' }}>
                          AMBITION MECHANICAL
                        </p>
                      </div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>SAVE THIS</span>
                    </div>
                  </div>
                </div>
                <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '8px', lineHeight: 1.4 }}>Educational format with numbered tips. ExtraBold headline, numbered bullets. Dark background for feed contrast. "Save this" CTA drives bookmarks.</p>
              </div>

            </div>
          </div>

          {/* Website reference */}
          <div className="p-8 rounded-lg" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.3)' }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Website Application</span>
            <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: 1.6, marginTop: '12px', maxWidth: '640px' }}>
              The live Ambition website at <span style={{ color: '#dc2626' }}>ambition-teal.vercel.app</span> uses a digital-first adaptation of the brand (see "Web Brand" tab). On the website, sky blue replaces navy as the primary digital brand color for screen readability, while the OG navy/red palette anchors all print, physical, and traditional media applications.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { label: 'Print / Physical', colors: ['#1a237e', '#dc2626', '#ffffff'] },
                { label: 'Digital / Web', colors: ['#0ea5e9', '#dc2626', '#0a0a0a'] },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ backgroundColor: '#0a0e2a' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '10px', letterSpacing: '0.15em', color: '#6b7280', textTransform: 'uppercase' }}>{item.label}</span>
                  <div className="flex gap-1">
                    {item.colors.map((c, j) => (
                      <div key={j} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid rgba(107,114,128,0.3)' : 'none' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- 07. VOICE & TONE ---- */}
        <section className="py-16 md:py-24" style={{ borderTop: '1px solid rgba(26, 35, 126, 0.3)' }}>
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', color: '#dc2626' }}>07</span>
              <div className="w-6 h-[2px] bg-[#dc2626]" />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Voice & Tone</span>
            </div>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 48px)', letterSpacing: '0.03em', color: '#ffffff', textTransform: 'uppercase' }}>
              HOW AMBITION TALKS
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: 1.65, marginTop: '12px', maxWidth: '640px' }}>
              Like a crew lead who knows the job inside out and doesn't need to oversell it. Confident, direct, grounded. Technical when it matters. Human always.
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {ogVoiceAttributes.map(v => (
              <div key={v.attr} className="p-6 rounded-lg" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.2)' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '12px', letterSpacing: '0.15em', color: '#dc2626', textTransform: 'uppercase', marginBottom: '12px' }}>{v.attr}</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
                    <span style={{ color: '#d1d5db', fontSize: '14px' }}>"{v.yes}"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#ef4444] shrink-0" />
                    <span style={{ color: '#6b7280', fontSize: '14px', textDecoration: 'line-through' }}>"{v.no}"</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 rounded-lg" style={{ backgroundColor: '#111638', border: '1px solid rgba(26, 35, 126, 0.3)' }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Brand Personality Spectrum</span>
            <div className="mt-6 space-y-4">
              {[
                { left: 'Casual', right: 'Formal', position: 35 },
                { left: 'Playful', right: 'Serious', position: 70 },
                { left: 'Corporate', right: 'Human', position: 75 },
                { left: 'Quiet', right: 'Loud', position: 45 },
                { left: 'Technical', right: 'Simple', position: 40 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#6b7280', width: '72px', textAlign: 'right' }}>{item.left}</span>
                  <div className="flex-1 h-2 rounded-full relative" style={{ backgroundColor: '#0a0e2a' }}>
                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full" style={{ left: `${item.position}%`, backgroundColor: '#dc2626', boxShadow: '0 0 8px rgba(220,38,38,0.4)' }} />
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#6b7280', width: '72px' }}>{item.right}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 text-center" style={{ borderTop: '1px solid rgba(26, 35, 126, 0.3)' }}>
          <FlameWavePattern width={200} height={30} color="#dc2626" opacity={0.2} />
          <div className="flex items-center justify-center gap-3 mt-6 mb-4">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#dc2626', boxShadow: '0 0 8px rgba(220,38,38,0.4)' }} />
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, fontSize: '10px', letterSpacing: '0.3em', color: '#6b7280', textTransform: 'uppercase' }}>
              Ambition Mechanical OG Brand System v1.0
            </span>
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#4b5563' }}>
            Created by Steffen for AOM. March 2026.
          </p>
        </footer>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  WEB BRAND TAB (Bobby's existing content)                           */
/* ================================================================== */

function WebBrandTab() {
  const [activeSection, setActiveSection] = useState('essence')

  const sections = [
    { id: 'essence', label: 'Brand Essence' },
    { id: 'colors', label: 'Colors' },
    { id: 'typography', label: 'Typography' },
    { id: 'visual', label: 'Visual / Video' },
    { id: 'voice', label: 'Voice & Tone' },
    { id: 'social', label: 'Social Media' },
    { id: 'dos-donts', label: "Do's & Don'ts" },
  ]

  const scrollTo = (id) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function SectionHeader({ label, title, subtitle }) {
    return (
      <div className="mb-12">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#0ea5e9] mb-4">{label}</p>
        <div className="w-12 h-[2px] bg-gradient-to-r from-[#dc2626] to-[#0ea5e9] mb-4" />
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white">{title}</h2>
        {subtitle && <p className="text-gray-400 text-base mt-4 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
    )
  }

  function NavDot({ label, id, active, onClick }) {
    return (
      <button
        onClick={() => onClick(id)}
        className={`flex items-center gap-2 group transition-all duration-300 ${active ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
      >
        <span className={`block w-1.5 h-1.5 rounded-full transition-colors ${active ? 'bg-[#0ea5e9]' : 'bg-[#6b7280] group-hover:bg-[#9ca3af]'}`} />
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#9ca3af] hidden lg:block">{label}</span>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#d1d5db] relative">
      {/* Noise overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay">
        <svg width="100%" height="100%">
          <filter id="web-noise"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#web-noise)" />
        </svg>
      </div>

      <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-gradient-to-b from-[#0ea5e9]/10 via-transparent to-[#0ea5e9]/5" />

      <nav className="fixed left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4 hidden md:flex">
        {sections.map(s => (
          <NavDot key={s.id} {...s} active={activeSection === s.id} onClick={scrollTo} />
        ))}
      </nav>

      <section className="relative py-24 md:py-40 px-6 md:px-12 max-w-6xl mx-auto">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0ea5e9] mb-6">Web Brand System</p>
        <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white leading-[0.92]">
          AMBITION<br />
          <span className="text-[#38bdf8]">MECHANICAL</span>
        </h1>
        <p className="text-gray-400 text-lg mt-8 max-w-xl leading-relaxed">
          Digital brand guidelines for Ambition Mechanical Services. Optimized for web and screen.
        </p>
        <div className="flex items-center gap-4 mt-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-[#0a0a0a]/75 backdrop-blur-xl font-mono text-[10px] text-gray-400 uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9] shadow-[0_0_6px_rgba(14,165,233,0.6)]" />
            Draft
          </span>
          <span className="font-mono text-[10px] text-gray-500">Last updated: March 2026</span>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 md:px-12">

        {/* 1. BRAND ESSENCE */}
        <section id="essence" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader label="01 / Brand Essence" title="WHO THEY ARE" subtitle="A commercial and industrial mechanical contractor based in Tempe, AZ. Established 2002. Licensed ROC #320923." />
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0ea5e9] mb-6">What They Stand For</p>
              <p className="text-[#9ca3af] text-sm leading-relaxed mb-4">The name says it. Ambition was born from "a strong passion and desire to excel in the HVAC/R industry."</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {['Honesty', 'Integrity', 'Reliability'].map(v => (
                  <span key={v} className="px-3 py-1.5 rounded-full border border-[#0ea5e9]/30 bg-[#0ea5e9]/10 font-mono text-xs text-[#0ea5e9]">{v}</span>
                ))}
              </div>
            </div>
            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">The Feeling</p>
              <p className="text-[#9ca3af] text-sm leading-relaxed mb-4">Competence you can feel. Not flashy, not corporate-cold. Confident and grounded. When Ambition shows up on a job site, you know the work is going to be done right.</p>
            </div>
            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Positioning</p>
              <p className="text-[#9ca3af] text-sm leading-relaxed">Premium commercial/industrial mechanical. Not competing on price. Competing on precision, responsiveness, and breadth of capability.</p>
            </div>
            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Key Clients</p>
              <div className="flex flex-wrap gap-2">
                {['Intel', 'Banner Health', 'Amazon', 'Honeywell', 'Chase', 'Louis Vuitton', 'Tiffanys', 'Ritz Carlton', 'Apple Store'].map(c => (
                  <span key={c} className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] font-mono text-xs text-gray-400">{c}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="p-8 rounded-2xl border border-white/10 bg-[#1a1a1a]/70 backdrop-blur-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-4">Services</p>
            <div className="flex flex-wrap gap-2">
              {['HVAC/R Installation', 'Service & Repair', 'Refrigeration', 'Energy Management Systems', 'New Construction Mechanical', 'Preconstruction', 'Preventive Maintenance'].map(s => (
                <span key={s} className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-xs text-[#d1d5db]">{s}</span>
              ))}
            </div>
          </div>
        </section>

        {/* 2. COLORS */}
        <section id="colors" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader label="02 / Color System" title="COOL, NOT WARM" subtitle="Dark foundation with sky blue as the dominant brand color. Red is for action and emphasis only." />
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Primary Palette (Sky Blue)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{primaryColors.map(c => <ColorSwatch key={c.hex} color={c} large />)}</div>
          </div>
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Accent Palette (Red)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{accentColors.map(c => <ColorSwatch key={c.hex} color={c} large />)}</div>
          </div>
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Dark Palette (Backgrounds)</p>
            <div className="grid grid-cols-3 gap-6">{bgColors.map(c => <ColorSwatch key={c.hex} color={c} />)}</div>
          </div>
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Text & Neutrals</p>
            <div className="grid grid-cols-3 gap-6">{textColors.map(c => <ColorSwatch key={c.hex} color={c} />)}</div>
          </div>
          <div className="p-8 rounded-2xl border border-white/10 bg-[#1a1a1a]/70 backdrop-blur-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Color Rules</p>
            <ul className="space-y-3">
              {['Background is always dark. Never white backgrounds.', 'Sky blue is dominant. Red is for action only.', 'Blue-to-red gradient used sparingly for special moments.', 'Social: dark bg with sky blue accents. Red only for CTAs.', 'Never equal weight blue and red. One leads.'].map((rule, i) => (
                <li key={i} className="flex items-start gap-3"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0ea5e9] shrink-0" /><span className="text-[#9ca3af] text-sm leading-relaxed">{rule}</span></li>
              ))}
            </ul>
          </div>
        </section>

        {/* 3. TYPOGRAPHY */}
        <section id="typography" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader label="03 / Typography" title="ONE FONT, CLEAR HIERARCHY" subtitle="Inter handles everything. Clean, geometric, highly readable on screens." />
          <div className="space-y-4 mb-16">
            {typeRows.map(row => (
              <div key={row.role} className="p-6 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0ea5e9]">{row.role}</p>
                  <p className="text-[#6b7280] text-xs mt-1">{row.font} / {row.weight}</p>
                </div>
                <div className="flex gap-4 flex-wrap">
                  <span className="font-mono text-[10px] text-[#6b7280]">Size: {row.size}</span>
                  <span className="font-mono text-[10px] text-[#6b7280]">Tracking: {row.tracking}</span>
                  <span className="font-mono text-[10px] text-[#6b7280]">LH: {row.lh}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. VISUAL */}
        <section id="visual" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader label="04 / Visual & Video Style" title="HOW IT LOOKS AND MOVES" subtitle="24fps cinematic. DaVinci Resolve pipeline. Cool-neutral grade." />
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0ea5e9] mb-6">The DNA</p>
              <ul className="space-y-3 text-[#9ca3af] text-sm leading-relaxed">
                <li>24fps across all footage.</li>
                <li>DaVinci Resolve pipeline.</li>
                <li>H.264 at 10-13 Mbps.</li>
              </ul>
            </div>
            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Logo Treatment</p>
              <ul className="space-y-3 text-[#9ca3af] text-sm leading-relaxed">
                <li>Small gradient dot with glow effect.</li>
                <li>"AMBITION" in white, "MECHANICAL" in sky blue.</li>
                <li>Always uppercase. Min clear space: height of "A".</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 5. VOICE */}
        <section id="voice" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader label="05 / Voice & Tone" title="HOW AMBITION TALKS" subtitle="Confident without being arrogant. Technical when it matters. Human always." />
          <div className="mb-12">
            <div className="space-y-3">
              {voiceAttributes.map(v => (
                <div key={v.attr} className="p-6 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm">
                  <p className="font-mono text-xs text-[#0ea5e9] font-bold uppercase tracking-wide mb-3">{v.attr}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" /><span className="text-[#d1d5db] text-sm">"{v.yes}"</span></div>
                    <div className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#ef4444] shrink-0" /><span className="text-[#6b7280] text-sm line-through">"{v.no}"</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-12">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Tone Shifts by Context</p>
            <div className="space-y-3">
              {toneShifts.map(t => (
                <div key={t.context} className="p-4 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm flex flex-col md:flex-row gap-4">
                  <span className="font-mono text-xs text-[#0ea5e9] font-bold uppercase tracking-wide md:w-40 shrink-0">{t.context}</span>
                  <span className="text-[#6b7280] text-sm md:w-56 shrink-0">{t.tone}</span>
                  <span className="text-[#9ca3af] text-sm italic">"{t.example}"</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. SOCIAL */}
        <section id="social" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader label="06 / Social Media" title="PLATFORM PLAYBOOK" subtitle="Dark-themed posts. Sky blue accents. Red for CTAs only." />
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { name: 'Instagram', freq: '3-4x/week', rules: ['Dark-themed posts.', 'Text overlays in Inter.', '8-12 hashtags per post.'] },
              { name: 'TikTok', freq: '3-5x/week', rules: ['Raw, technical, real.', '15-30 second sweet spot.', 'Text overlays required.'] },
              { name: 'LinkedIn', freq: '2-3x/week', rules: ['Most polished voice.', 'Vertical video feed.', 'Tag clients when appropriate.'] },
            ].map(p => (
              <div key={p.name} className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0ea5e9] mb-4">{p.name}</p>
                <p className="font-mono text-[10px] text-[#6b7280] mb-4">{p.freq}</p>
                <ul className="space-y-2 text-[#9ca3af] text-xs leading-relaxed">{p.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        {/* 7. DO'S & DON'TS */}
        <section id="dos-donts" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader label="07 / Content Guidelines" title="DO'S AND DON'TS" subtitle="Quick reference for anyone creating content." />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#22c55e] mb-6">Do</p>
              <ul className="space-y-3">
                {['Show the scale.', 'Show the crew.', 'Tell the project story.', 'Use the emergency response angle.', 'Shoot vertical for social.', 'Add captions to every video.'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" /><span className="text-[#9ca3af] text-sm leading-relaxed">{item}</span></li>
                ))}
              </ul>
            </div>
            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#ef4444] mb-6">Don't</p>
              <ul className="space-y-3">
                {["Don't use warm/orange grading.", "Don't post landscape-only on IG/TikTok.", "Don't mix stock with real footage.", "Don't use generic contractor voice.", "Don't over-design graphics.", "Don't post inconsistently."].map((item, i) => (
                  <li key={i} className="flex items-start gap-3"><span className="mt-2.5 w-3 h-[1px] bg-[#ef4444] shrink-0" /><span className="text-[#9ca3af] text-sm leading-relaxed">{item}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <footer className="py-16 border-t border-white/8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#dc2626] to-[#0ea5e9] shadow-[0_0_8px_rgba(14,165,233,0.4)]" />
            <span className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.3em]">Ambition Mechanical Web Brand v1.0</span>
          </div>
          <p className="font-mono text-[10px] text-gray-600">Created by Bobby for AOM. Status: Draft.</p>
        </footer>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  MAIN PAGE WITH TAB SWITCHER                                        */
/* ================================================================== */

export default function AmbitionBrandGuidelines() {
  const [activeTab, setActiveTab] = useState('og')

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: activeTab === 'og' ? '#0a0e2a' : '#0a0a0a' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-2xl" style={{ backgroundColor: activeTab === 'og' ? 'rgba(10, 14, 42, 0.85)' : 'rgba(10, 10, 10, 0.75)', borderBottom: activeTab === 'og' ? '1px solid rgba(26, 35, 126, 0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
          <Link to="/brands" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={16} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]">All Brands</span>
          </Link>

          {/* Tab Switcher */}
          <div className="flex items-center rounded-lg overflow-hidden" style={{ backgroundColor: activeTab === 'og' ? 'rgba(17, 22, 56, 0.8)' : 'rgba(17, 17, 17, 0.8)', border: activeTab === 'og' ? '1px solid rgba(26, 35, 126, 0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setActiveTab('og')}
              className="px-4 py-2 transition-all duration-300"
              style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 600,
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: activeTab === 'og' ? '#ffffff' : '#6b7280',
                backgroundColor: activeTab === 'og' ? '#1a237e' : 'transparent',
              }}
            >
              OG Brand
            </button>
            <button
              onClick={() => setActiveTab('web')}
              className="px-4 py-2 transition-all duration-300"
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 600,
                fontSize: '11px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: activeTab === 'web' ? '#ffffff' : '#6b7280',
                backgroundColor: activeTab === 'web' ? '#0ea5e9' : 'transparent',
              }}
            >
              Web Brand
            </button>
          </div>

          <span className="font-mono text-[10px] text-gray-500">v1.0</span>
        </div>
      </header>

      {/* Content */}
      {activeTab === 'og' ? <OGBrandUpdate /> : <WebBrandTab />}
    </div>
  )
}
