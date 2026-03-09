import React, { useState } from 'react'
import { ArrowLeft, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/* ------------------------------------------------------------------ */
/*  Ambition Mechanical Brand Guidelines v2                            */
/*  Same framework as AOM brand/v4: scrolling, dark-light rhythm       */
/*  Industrial patterns, comprehensive type + spacing systems          */
/*  Fonts: Barlow Condensed (display) + Inter (body)                   */
/*  Logo: untouched. Expanding the visual language around it.          */
/* ------------------------------------------------------------------ */

/* ================================================================== */
/*  GOOGLE FONTS                                                       */
/* ================================================================== */

const fontLink = document.createElement('link')
fontLink.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap'
fontLink.rel = 'stylesheet'
if (!document.querySelector('link[href*="Barlow+Condensed"]')) {
  document.head.appendChild(fontLink)
}

/* ================================================================== */
/*  DESIGN TOKENS                                                      */
/* ================================================================== */

const C = {
  // Navy scale
  navy950: '#070b1e',
  navy900: '#0a0e2a',
  navy800: '#111638',
  navy700: '#1a1f45',
  navy600: '#1a237e',
  navy500: '#283593',
  navy400: '#3949ab',
  navy300: '#5c6bc0',
  // Red scale
  red700: '#991b1b',
  red600: '#b91c1c',
  red500: '#dc2626',
  red400: '#ef4444',
  red300: '#f87171',
  // Flame
  flame500: '#ea580c',
  flame400: '#f97316',
  // Neutrals
  white: '#ffffff',
  offWhite: '#f8fafc',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  neutral900: '#111111',
  neutral950: '#0a0a0a',
  // Borders
  navyBorder: 'rgba(57,73,171,0.25)',
  navyBorderLight: 'rgba(57,73,171,0.12)',
  whiteBorder: 'rgba(255,255,255,0.10)',
  whiteBorderHover: 'rgba(255,255,255,0.18)',
}

const F = {
  display: "'Barlow Condensed', sans-serif",
  body: "'Inter', system-ui, sans-serif",
}

/* ================================================================== */
/*  UTILITIES                                                          */
/* ================================================================== */

function CopyHex({ hex, light }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(hex); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      title="Copy hex"
    >
      <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'inherit' }}>{hex}</span>
      {copied ? <Check size={12} /> : <Copy size={12} style={{ opacity: 0.4 }} />}
    </button>
  )
}

function Badge({ children, color = C.red500, style: s = {} }) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: F.display,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color,
      border: `1px solid ${color}`,
      borderRadius: 100,
      padding: '4px 14px',
      lineHeight: 1.4,
      ...s,
    }}>{children}</span>
  )
}

function SectionHeader({ num, title, subtitle, dark = false }) {
  const textColor = dark ? C.white : C.navy600
  const mutedColor = dark ? C.gray400 : C.gray500
  return (
    <div style={{ marginBottom: 48, position: 'relative' }}>
      <span style={{
        fontFamily: F.display,
        fontSize: 120,
        fontWeight: 800,
        lineHeight: 1,
        color: dark ? 'rgba(255,255,255,0.04)' : 'rgba(220,38,38,0.06)',
        position: 'absolute',
        top: -50,
        left: -10,
        userSelect: 'none',
        pointerEvents: 'none',
        textTransform: 'uppercase',
      }}>{String(num).padStart(2, '0')}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Badge color={C.red500} style={{ borderColor: C.red500 }}>Section {num}</Badge>
      </div>
      <h2 style={{
        fontFamily: F.display,
        fontSize: 'clamp(32px, 5vw, 56px)',
        fontWeight: 800,
        color: textColor,
        lineHeight: 1.0,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        margin: 0,
      }}>{title}</h2>
      {subtitle && (
        <p style={{
          fontFamily: F.body,
          fontSize: 16,
          color: mutedColor,
          marginTop: 8,
          maxWidth: 560,
          lineHeight: 1.6,
        }}>{subtitle}</p>
      )}
    </div>
  )
}

function DarkSection({ children, style: s = {} }) {
  return (
    <section style={{
      background: C.navy900,
      padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
      color: C.white,
      ...s,
    }}>{children}</section>
  )
}

function LightSection({ children, style: s = {} }) {
  return (
    <section style={{
      background: C.white,
      padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
      color: C.gray700,
      ...s,
    }}>{children}</section>
  )
}

function OffWhiteSection({ children, style: s = {} }) {
  return (
    <section style={{
      background: C.offWhite,
      padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
      color: C.gray700,
      ...s,
    }}>{children}</section>
  )
}

function MaxWidth({ children, style: s = {} }) {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', ...s }}>{children}</div>
  )
}

function Card({ children, dark = false, style: s = {} }) {
  return (
    <div style={{
      background: dark ? C.navy800 : C.white,
      borderRadius: 16,
      padding: 32,
      border: `1px solid ${dark ? C.navyBorder : C.gray200}`,
      ...s,
    }}>{children}</div>
  )
}

function CodeBlock({ code, label, dark = false }) {
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${dark ? C.navyBorder : C.gray200}` }}>
      {label && (
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${dark ? C.navyBorder : C.gray200}`, backgroundColor: dark ? C.navy800 : C.offWhite }}>
          <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.18em', color: C.gray500, textTransform: 'uppercase' }}>{label}</span>
        </div>
      )}
      <div style={{ padding: 16, overflowX: 'auto', backgroundColor: dark ? C.navy900 : C.white }}>
        <pre style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: dark ? C.gray300 : C.gray700, margin: 0 }}>{code}</pre>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  SVG PATTERNS: INDUSTRIAL / MECHANICAL                              */
/* ================================================================== */

function PatternBlueprintGrid({ color = C.navy400, opacity = 0.12, size = 200 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.navyBorder}`, background: C.navy800, position: 'relative' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="blueprint-grid" patternUnits="userSpaceOnUse" width="40" height="40">
            <rect x="0" y="0" width="40" height="40" fill="none" stroke={color} strokeWidth="0.5" opacity={opacity} />
            <rect x="0" y="0" width="20" height="20" fill="none" stroke={color} strokeWidth="0.25" opacity={opacity * 0.5} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#blueprint-grid)" />
      </svg>
    </div>
  )
}

function PatternDuctwork({ color = C.navy400, opacity = 0.1, size = 200 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.navyBorder}`, background: C.navy800, position: 'relative' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="ductwork" patternUnits="userSpaceOnUse" width="60" height="60">
            <line x1="0" y1="30" x2="60" y2="30" stroke={color} strokeWidth="2" opacity={opacity} />
            <line x1="30" y1="0" x2="30" y2="60" stroke={color} strokeWidth="2" opacity={opacity} />
            <rect x="20" y="20" width="20" height="20" rx="2" fill="none" stroke={color} strokeWidth="1" opacity={opacity * 1.5} />
            <circle cx="30" cy="30" r="4" fill="none" stroke={color} strokeWidth="0.75" opacity={opacity} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ductwork)" />
      </svg>
    </div>
  )
}

function PatternCrossHatch({ color = C.gray300, opacity = 0.08, size = 200 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.navyBorder}`, background: C.navy800, position: 'relative' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="amb-crosshatch" patternUnits="userSpaceOnUse" width="16" height="16">
            <line x1="0" y1="0" x2="16" y2="16" stroke={color} strokeWidth="0.75" opacity={opacity * 4} />
            <line x1="16" y1="0" x2="0" y2="16" stroke={color} strokeWidth="0.75" opacity={opacity * 4} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#amb-crosshatch)" />
      </svg>
    </div>
  )
}

function PatternDiagonalLines({ color = C.red500, opacity = 0.12, size = 200 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.navyBorder}`, background: C.navy800, position: 'relative' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="amb-diag" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="12" stroke={color} strokeWidth="1.5" opacity={opacity * 3} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#amb-diag)" />
      </svg>
    </div>
  )
}

function PatternHexBolts({ color = C.navy400, opacity = 0.1, size = 200 }) {
  const s = 16
  const h = Math.sqrt(3) * s
  return (
    <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.navyBorder}`, background: C.navy800, position: 'relative' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex-bolts" patternUnits="userSpaceOnUse" width={s * 2} height={h}>
            {[0, 1].map(col => {
              const cx = col * s * 1.5 + s * 0.5
              const cy = col % 2 === 0 ? h * 0.25 : h * 0.75
              const pts = Array.from({ length: 6 }).map((_, i) => {
                const a = (60 * i - 30) * (Math.PI / 180)
                return `${cx + 6 * Math.cos(a)},${cy + 6 * Math.sin(a)}`
              }).join(' ')
              return <polygon key={col} points={pts} fill="none" stroke={color} strokeWidth="0.75" opacity={opacity * 2} />
            })}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-bolts)" />
      </svg>
    </div>
  )
}

function PatternPipeRun({ color = C.red500, opacity = 0.08, size = 200 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.navyBorder}`, background: C.navy800, position: 'relative' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="pipe-run" patternUnits="userSpaceOnUse" width="80" height="80">
            <line x1="0" y1="20" x2="40" y2="20" stroke={color} strokeWidth="3" opacity={opacity * 3} strokeLinecap="round" />
            <line x1="40" y1="20" x2="40" y2="60" stroke={color} strokeWidth="3" opacity={opacity * 3} strokeLinecap="round" />
            <line x1="40" y1="60" x2="80" y2="60" stroke={color} strokeWidth="3" opacity={opacity * 3} strokeLinecap="round" />
            <circle cx="40" cy="20" r="4" fill="none" stroke={color} strokeWidth="1.5" opacity={opacity * 2} />
            <circle cx="40" cy="60" r="4" fill="none" stroke={color} strokeWidth="1.5" opacity={opacity * 2} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pipe-run)" />
      </svg>
    </div>
  )
}

/* Full-width pattern strip for section dividers */
function PatternStrip({ variant = 'red', height = 3 }) {
  if (variant === 'red') {
    return <div style={{ width: '100%', height, background: `linear-gradient(90deg, ${C.red500}, ${C.red600} 30%, transparent)` }} />
  }
  return (
    <div style={{ width: '100%', height, overflow: 'hidden' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="strip-navy" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={C.navy400} strokeWidth="1" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#strip-navy)" />
      </svg>
    </div>
  )
}

/* ================================================================== */
/*  DATA                                                               */
/* ================================================================== */

const colorGroups = {
  primary: [
    { name: 'Navy', hex: '#1a237e', token: 'navy-600', role: 'Primary Brand', usage: 'Logo core, hero backgrounds, nav bar, footer. The anchor of the entire brand.' },
    { name: 'Navy Dark', hex: '#0a0e2a', token: 'navy-900', role: 'Deep Background', usage: 'Dark hero sections, dark-mode panels, overlay backgrounds.' },
    { name: 'Navy Mid', hex: '#283593', token: 'navy-500', role: 'Supporting', usage: 'Secondary panels, active states, section backgrounds.' },
    { name: 'Navy Light', hex: '#3949ab', token: 'navy-400', role: 'Interactive', usage: 'Hover states, links, button hover on dark backgrounds.' },
  ],
  accent: [
    { name: 'Ambition Red', hex: '#dc2626', token: 'red-500', role: 'Primary CTA', usage: 'All CTA buttons, flame elements, urgent indicators, headline accents.' },
    { name: 'Red Light', hex: '#ef4444', token: 'red-400', role: 'Hover Red', usage: 'Button hover states, gradient endpoints.' },
    { name: 'Red Dark', hex: '#b91c1c', token: 'red-600', role: 'Pressed Red', usage: 'Pressed/active button states.' },
    { name: 'Flame Orange', hex: '#ea580c', token: 'flame-500', role: 'Warm Accent', usage: 'Gradient bridge from red to warmth. Sparingly.' },
  ],
  light: [
    { name: 'White', hex: '#ffffff', token: 'neutral-white', role: 'Primary Light BG' },
    { name: 'Off-White', hex: '#f8fafc', token: 'neutral-50', role: 'Alternating Light BG' },
    { name: 'Light Gray', hex: '#f3f4f6', token: 'neutral-100', role: 'Card Surface' },
    { name: 'Border Gray', hex: '#e5e7eb', token: 'neutral-200', role: 'Borders' },
  ],
  dark: [
    { name: 'Midnight', hex: '#070b1e', token: 'navy-950', role: 'Deepest Dark' },
    { name: 'Dark Navy', hex: '#0a0e2a', token: 'navy-900', role: 'Dark Section BG' },
    { name: 'Deep Navy', hex: '#111638', token: 'navy-800', role: 'Dark Cards' },
    { name: 'Charcoal', hex: '#1a1f45', token: 'navy-700', role: 'Elevated Dark' },
  ],
  text: [
    { name: 'White', hex: '#ffffff', role: 'Headlines on Dark' },
    { name: 'Navy', hex: '#1a237e', role: 'Headlines on Light' },
    { name: 'Steel', hex: '#374151', role: 'Body on Light' },
    { name: 'Gray', hex: '#6b7280', role: 'Secondary Text' },
    { name: 'Light Gray', hex: '#d1d5db', role: 'Body on Dark' },
    { name: 'Muted', hex: '#9ca3af', role: 'Tertiary on Dark' },
  ],
}

const typeScale = [
  { role: 'Display / Hero', font: 'Barlow Condensed', weight: '800', size: 'clamp(3rem, 8vw, 6rem)', tracking: '0.04em', lh: '0.92', transform: 'uppercase', minMobile: '48px', notes: 'Maximum impact. ALL CAPS always. Hero moments, page titles.' },
  { role: 'H1 / Section', font: 'Barlow Condensed', weight: '700', size: 'clamp(2.5rem, 5vw, 4rem)', tracking: '0.03em', lh: '1.0', transform: 'uppercase', minMobile: '40px', notes: 'Primary section headers. ALL CAPS.' },
  { role: 'H2 / Sub-section', font: 'Barlow Condensed', weight: '600', size: 'clamp(1.75rem, 3.5vw, 2.5rem)', tracking: '0.02em', lh: '1.1', transform: 'uppercase', minMobile: '28px', notes: 'Sub-sections and card group headers.' },
  { role: 'H3 / Card Title', font: 'Barlow Condensed', weight: '600', size: '24px', tracking: '0.02em', lh: '1.2', transform: 'uppercase', minMobile: '20px', notes: 'Card titles, feature headers.' },
  { role: 'Body Large', font: 'Inter', weight: '400', size: '18px / 1.125rem', tracking: 'normal', lh: '1.65', transform: 'sentence', minMobile: '17px', notes: 'Hero subheads, intro paragraphs. Max 640px.' },
  { role: 'Body', font: 'Inter', weight: '400', size: '16px / 1rem', tracking: 'normal', lh: '1.65', transform: 'sentence', minMobile: '15px', notes: 'Standard body. Max 640px for readability.' },
  { role: 'Body Small', font: 'Inter', weight: '400', size: '14px / 0.875rem', tracking: '0.01em', lh: '1.6', transform: 'sentence', minMobile: '13px', notes: 'Card descriptions, secondary text.' },
  { role: 'Labels / Kickers', font: 'Barlow Condensed', weight: '600', size: '11-12px', tracking: '0.2em', lh: '1.2', transform: 'uppercase', minMobile: '11px', notes: 'Section kickers, metadata, tags. RED.' },
  { role: 'Nav Links', font: 'Inter', weight: '500', size: '14-15px', tracking: '0.02em', lh: '1.4', transform: 'sentence', minMobile: '14px', notes: 'Main navigation items.' },
  { role: 'Buttons', font: 'Barlow Condensed', weight: '600-700', size: '14-16px', tracking: '0.08em', lh: '1.2', transform: 'uppercase', minMobile: '14px', notes: 'ALL CAPS on primary CTAs.' },
]

const spacingScale = [
  { token: '4', px: '4px', rem: '0.25rem', usage: 'Micro gaps: icon padding, badge padding' },
  { token: '8', px: '8px', rem: '0.5rem', usage: 'Tight gaps: between label and content, inline elements' },
  { token: '12', px: '12px', rem: '0.75rem', usage: 'Small gaps: between list items, form field gaps' },
  { token: '16', px: '16px', rem: '1rem', usage: 'Base unit: card inner padding (mobile), input padding' },
  { token: '24', px: '24px', rem: '1.5rem', usage: 'Comfortable: card padding, gap between card groups' },
  { token: '32', px: '32px', rem: '2rem', usage: 'Section sub-spacing: between content blocks' },
  { token: '48', px: '48px', rem: '3rem', usage: 'Section header margin-bottom. Content group separation.' },
  { token: '64', px: '64px', rem: '4rem', usage: 'Section padding (mobile). Major content breaks.' },
  { token: '80', px: '80px', rem: '5rem', usage: 'Section padding (tablet). Generous breathing room.' },
  { token: '96-112', px: '96-112px', rem: '6-7rem', usage: 'Section padding (desktop). Full breathing sections.' },
  { token: '128', px: '128px', rem: '8rem', usage: 'Hero top padding. Maximum vertical breathing room.' },
]

const voiceAttributes = [
  { attr: 'Capable', yes: 'We handle commercial HVAC across every phase. All makes, all models.', no: 'We try our best to service most kinds of air conditioning systems.' },
  { attr: 'Direct', yes: '24/7 emergency dispatch. Call (480) 600-2942.', no: "Please don't hesitate to reach out whenever is convenient!" },
  { attr: 'Credible', yes: 'Licensed ROC #320923. Established 2002. 500+ projects completed.', no: "We're one of the top HVAC companies around!" },
  { attr: 'Grounded', yes: 'Built on precision, driven by integrity.', no: "We're the BEST and most AMAZING HVAC company!!!" },
  { attr: 'Human', yes: 'Our crew shows up. Every time.', no: 'Our team of dedicated professionals strives for excellence.' },
]

const toneShifts = [
  { context: 'Website copy', tone: 'Confident, professional, concise', example: 'We prioritize quality over quantity.' },
  { context: 'Social captions', tone: 'Slightly warmer, still competent', example: 'This Din Tai Fung kitchen buildout is coming together. Week 3 update.' },
  { context: 'Emergency / urgent', tone: 'Direct, zero filler', example: '3AM call at Abraza. We were on-site in under an hour.' },
  { context: 'Recruitment', tone: 'Proud, inviting, personal', example: "We're hiring techs who take the work personally." },
  { context: 'Client comms', tone: 'Clear, respectful, no fluff', example: "Here's where we're at on the project. Next steps below." },
]

const componentSpecs = [
  {
    name: 'Primary CTA',
    desc: 'Solid red, uppercase Barlow Condensed. The main action driver.',
    classes: 'bg-red-500 text-white font-display font-semibold uppercase tracking-[0.08em] px-8 py-4 rounded-lg',
    hover: 'bg-red-400, shadow-[0_8px_24px_rgba(220,38,38,0.3)], -translate-y-0.5',
    active: 'bg-red-600, translate-y-0',
  },
  {
    name: 'Secondary CTA',
    desc: 'Navy outline on light. Solid navy on dark.',
    classes: 'border-2 border-navy-600 text-navy-600 font-display font-semibold uppercase tracking-[0.08em] px-8 py-4 rounded-lg',
    hover: 'bg-navy-600, text-white',
    active: 'bg-navy-800',
  },
  {
    name: 'Ghost / Link',
    desc: 'Text-only with subtle underline. Inherits surrounding text color.',
    classes: 'text-navy-600 (light) / text-neutral-300 (dark) font-medium underline-offset-4',
    hover: 'text-red-500',
    active: 'text-red-600',
  },
  {
    name: 'Dark CTA',
    desc: 'For dark backgrounds. White text, red accent on hover.',
    classes: 'bg-white/10 backdrop-blur-sm border border-white/20 text-white font-display font-semibold uppercase tracking-[0.08em] px-8 py-4 rounded-lg',
    hover: 'bg-red-500, border-red-500',
    active: 'bg-red-600',
  },
]

const siteLayout = [
  { section: 'Navigation', bg: 'transparent -> navy-900/95', dark: true, desc: 'Fixed top. Transparent over hero, navy on scroll. Logo left, links center, red CTA right.' },
  { section: 'Hero', bg: 'navy-950 gradient', dark: true, desc: '"We Build The Systems That Keep Business Moving." Big Barlow headline, stats row, red CTA.' },
  { section: 'Services', bg: 'WHITE', dark: false, desc: 'Kicker + Headline + 3-col service cards. Clean, lots of white space.' },
  { section: 'Stats Band', bg: 'navy-900', dark: true, desc: '500+ Projects. 23+ Years. 9 Markets. 24/7 Dispatch. Client logos below.' },
  { section: 'About', bg: 'off-white', dark: false, desc: '2-col: copy left, crew photo right. Company story and values.' },
  { section: 'Projects', bg: 'WHITE', dark: false, desc: 'Project cards with images, category chips, hover lift.' },
  { section: 'CTA Band', bg: 'navy-800', dark: true, desc: '"Ready to solve your next HVAC challenge?" Red CTA. Pattern overlay.' },
  { section: 'Testimonials', bg: 'WHITE', dark: false, desc: 'Client quotes in clean cards. Navy quote marks.' },
  { section: 'Contact', bg: 'off-white', dark: false, desc: '2-col: form + contact info. Credential badge.' },
  { section: 'Footer', bg: 'navy-950', dark: true, desc: '4-col. Red gradient top border. Logo + links + contact + credentials.' },
]

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function AmbitionBrandGuidelinesV2() {
  const navigate = useNavigate()

  return (
    <div style={{ background: C.navy900, minHeight: '100vh', fontFamily: F.body }}>

      {/* ============================================================ */}
      {/*  HERO / COVER                                                 */}
      {/* ============================================================ */}
      <section style={{
        background: `linear-gradient(160deg, ${C.navy950} 0%, ${C.navy800} 40%, ${C.navy900} 100%)`,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-blueprint" patternUnits="userSpaceOnUse" width="60" height="60">
                <rect x="0" y="0" width="60" height="60" fill="none" stroke={C.navy400} strokeWidth="0.5" />
                <rect x="0" y="0" width="30" height="30" fill="none" stroke={C.navy400} strokeWidth="0.25" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-blueprint)" />
          </svg>
        </div>

        <MaxWidth>
          {/* Nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 80 }}>
            <button
              onClick={() => navigate('/brands')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', color: C.gray400,
                cursor: 'pointer', fontFamily: F.body, fontSize: 14,
              }}
            >
              <ArrowLeft size={16} /> Back to Brands
            </button>
            <Badge color={C.red500} style={{ borderColor: C.red500 }}>v2.0</Badge>
          </div>

          {/* Logo */}
          <div style={{ marginBottom: 48 }}>
            <img
              src="/ambition-logo.png"
              alt="Ambition Mechanical Services"
              style={{
                width: 'clamp(140px, 25vw, 240px)',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 40px rgba(220,38,38,0.12))',
              }}
            />
          </div>

          {/* Title */}
          <div style={{ position: 'relative' }}>
            <div style={{ marginBottom: 24 }}>
              <Badge color={C.gray400}>Brand Identity System</Badge>
            </div>

            <h1 style={{
              fontFamily: F.display,
              fontSize: 'clamp(64px, 14vw, 180px)',
              fontWeight: 800,
              color: C.white,
              lineHeight: 0.9,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              margin: 0,
            }}>
              AMBITION
              <br />
              <span style={{ color: C.red500 }}>MECHANICAL</span>
            </h1>

            <div style={{
              display: 'flex', gap: 32, marginTop: 48, flexWrap: 'wrap',
              borderTop: `1px solid ${C.whiteBorder}`, paddingTop: 32,
            }}>
              {[
                { label: 'Client', value: 'Ambition Mechanical' },
                { label: 'Established', value: '2002' },
                { label: 'Industry', value: 'Commercial HVAC' },
                { label: 'Version', value: '2.0', accent: true },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ fontSize: 11, color: C.gray400, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, fontFamily: F.display, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: item.accent ? C.red500 : C.white, fontFamily: F.body }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div style={{ marginTop: 80, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 40, height: 2, background: C.red500 }} />
            <span style={{ fontSize: 11, color: C.gray400, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: F.display, fontWeight: 600 }}>Scroll to explore</span>
          </div>
        </MaxWidth>
      </section>

      <PatternStrip variant="red" height={3} />

      {/* ============================================================ */}
      {/*  01. BRAND MARK                                               */}
      {/* ============================================================ */}
      <DarkSection>
        <MaxWidth>
          <SectionHeader num={1} title="The Logo" subtitle="The Ambition Mechanical logo is locked. It does not change. Everything in this system is designed around it and expands it into a full visual language." dark />

          {/* Logo display */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            marginBottom: 48,
          }}>
            {/* On dark */}
            <div style={{
              background: C.navy800,
              borderRadius: 16,
              padding: 48,
              border: `1px solid ${C.navyBorder}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 220,
            }}>
              <img src="/ambition-logo.png" alt="Logo on dark" style={{ width: 160, height: 'auto', objectFit: 'contain' }} />
              <div style={{ marginTop: 16, fontSize: 11, color: C.gray400, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: F.display, fontWeight: 600 }}>Primary / On Dark</div>
            </div>

            {/* On light */}
            <div style={{
              background: C.white,
              borderRadius: 16,
              padding: 48,
              border: `1px solid ${C.gray200}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 220,
            }}>
              <img src="/ambition-logo.png" alt="Logo on light" style={{ width: 160, height: 'auto', objectFit: 'contain' }} />
              <div style={{ marginTop: 16, fontSize: 11, color: C.gray500, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: F.display, fontWeight: 600 }}>Primary / On Light</div>
            </div>

            {/* On navy solid */}
            <div style={{
              background: C.navy600,
              borderRadius: 16,
              padding: 48,
              border: `1px solid ${C.navyBorder}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 220,
            }}>
              <img src="/ambition-logo.png" alt="Logo on navy" style={{ width: 160, height: 'auto', objectFit: 'contain' }} />
              <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: F.display, fontWeight: 600 }}>On Brand Navy</div>
            </div>
          </div>

          {/* Logo rules */}
          <h3 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.white, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 20 }}>Logo Rules</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 16,
          }}>
            {[
              { rule: 'Do not modify the logo', detail: 'No color changes, no rotations, no stretching, no effects. It stays exactly as the client designed it.' },
              { rule: 'Minimum clear space', detail: 'Equal to the height of the "A" in the wordmark on all sides. No other elements intrude.' },
              { rule: 'Minimum size', detail: '100px wide for digital. 1 inch wide for print. Below that, it becomes unreadable.' },
              { rule: 'Approved backgrounds', detail: 'Dark navy, white, or transparent only. Never on busy photo backgrounds without a solid overlay.' },
            ].map((item, i) => (
              <div key={i} style={{ padding: 24, borderRadius: 12, background: C.navy800, border: `1px solid ${C.navyBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.red500 }} />
                  <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 13, letterSpacing: '0.04em', color: C.white, textTransform: 'uppercase' }}>{item.rule}</span>
                </div>
                <p style={{ color: C.gray400, fontSize: 13, lineHeight: 1.6 }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </MaxWidth>
      </DarkSection>

      <PatternStrip variant="navy" height={3} />

      {/* ============================================================ */}
      {/*  02. COLOR SYSTEM                                             */}
      {/* ============================================================ */}
      <LightSection>
        <MaxWidth>
          <SectionHeader num={2} title="Color System" subtitle="Extracted from the OG logo and expanded into a full web-ready system. Navy anchors. Red energizes. White breathes. Colors are spot on. Do not change them." />

          {/* Primary Navy */}
          <div style={{ marginBottom: 48 }}>
            <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase', marginBottom: 16 }}>Primary / Navy Blue</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {colorGroups.primary.map((c, i) => (
                <div key={i}>
                  <div style={{ height: 80, borderRadius: 12, background: c.hex, border: '1px solid rgba(0,0,0,0.1)', marginBottom: 8, position: 'relative' }}>
                    <span style={{ position: 'absolute', bottom: 8, left: 12, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{c.hex}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.navy600 }}>{c.name}</span>
                    <CopyHex hex={c.hex} />
                  </div>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.gray500 }}>{c.token}</span>
                  <span style={{ display: 'block', fontSize: 10, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{c.role}</span>
                  <p style={{ fontSize: 12, color: C.gray400, marginTop: 4, lineHeight: 1.5 }}>{c.usage}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Accent / Red */}
          <div style={{ marginBottom: 48 }}>
            <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.red500, textTransform: 'uppercase', marginBottom: 16 }}>Accent / Red and Flame</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {colorGroups.accent.map((c, i) => (
                <div key={i}>
                  <div style={{ height: 80, borderRadius: 12, background: c.hex, marginBottom: 8, position: 'relative' }}>
                    <span style={{ position: 'absolute', bottom: 8, left: 12, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{c.hex}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.navy600 }}>{c.name}</span>
                    <CopyHex hex={c.hex} />
                  </div>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.gray500 }}>{c.token}</span>
                  <span style={{ display: 'block', fontSize: 10, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{c.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Light + Dark surfaces side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, marginBottom: 48 }}>
            <div>
              <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, letterSpacing: '0.03em', color: C.gray500, textTransform: 'uppercase', marginBottom: 12 }}>Light Surfaces</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {colorGroups.light.map((c, i) => (
                  <div key={i}>
                    <div style={{ height: 48, borderRadius: 8, background: c.hex, border: '1px solid #e5e7eb', marginBottom: 4 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.navy600 }}>{c.name}</span>
                    <span style={{ display: 'block', fontSize: 10, fontFamily: 'monospace', color: C.gray400 }}>{c.hex}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, letterSpacing: '0.03em', color: C.gray500, textTransform: 'uppercase', marginBottom: 12 }}>Dark Surfaces</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {colorGroups.dark.map((c, i) => (
                  <div key={i}>
                    <div style={{ height: 48, borderRadius: 8, background: c.hex, border: `1px solid ${C.navyBorderLight}`, marginBottom: 4 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.navy600 }}>{c.name}</span>
                    <span style={{ display: 'block', fontSize: 10, fontFamily: 'monospace', color: C.gray400 }}>{c.hex}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Color ratio bar */}
          <div style={{ padding: 24, borderRadius: 12, border: `1px solid ${C.gray200}`, background: C.white }}>
            <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.gray400, textTransform: 'uppercase' }}>Overall Color Ratio</span>
            <div style={{ display: 'flex', gap: 2, height: 40, borderRadius: 8, overflow: 'hidden', marginTop: 12 }}>
              <div style={{ flex: 35, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.white, border: `1px solid ${C.gray200}` }}>
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', color: C.navy600 }}>35% WHITE</span>
              </div>
              <div style={{ flex: 35, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.navy600 }}>
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', color: C.white }}>35% NAVY</span>
              </div>
              <div style={{ flex: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.red500 }}>
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', color: C.white }}>15% RED</span>
              </div>
              <div style={{ flex: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.gray100, border: `1px solid ${C.gray200}` }}>
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', color: C.gray500 }}>15% GRAY</span>
              </div>
            </div>
          </div>

          {/* Color rules */}
          <div style={{ marginTop: 48 }}>
            <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase', marginBottom: 16 }}>Color Rules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {[
                { rule: 'Navy is the primary brand color', detail: 'Headlines on light, dark section backgrounds, nav, footer. When in doubt, use navy.' },
                { rule: 'Red is for action only', detail: 'CTA buttons, accent lines, section dividers. Every red element signals "do something."' },
                { rule: 'White gets navy headlines', detail: 'On light backgrounds: navy headlines (#1a237e), steel body (#374151). Never pure black text.' },
                { rule: 'Dark gets white headlines', detail: 'On navy backgrounds: white headlines, neutral-300 body. Red stays red on both.' },
                { rule: 'Alternate light/dark', detail: 'Page rhythm: dark hero > light services > dark stats > light about > dark CTA > light contact > dark footer.' },
                { rule: 'No sky blue, no pure black', detail: 'Old colors retired. Navy replaces both. The brand is navy + red + white.' },
              ].map((item, i) => (
                <div key={i} style={{ padding: 20, borderRadius: 12, background: C.offWhite, border: `1px solid ${C.gray200}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.red500 }} />
                    <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 13, color: C.navy600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.rule}</span>
                  </div>
                  <p style={{ color: C.gray500, fontSize: 13, lineHeight: 1.6 }}>{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </MaxWidth>
      </LightSection>

      <PatternStrip variant="red" height={3} />

      {/* ============================================================ */}
      {/*  03. TYPOGRAPHY                                               */}
      {/* ============================================================ */}
      <DarkSection>
        <MaxWidth>
          <SectionHeader num={3} title="Typography" subtitle='Barlow Condensed owns all headlines and display moments. Inter handles body text, navigation, and forms. Two fonts. Clear hierarchy. "Old people can read em, young people love em."' dark />

          {/* Live specimens */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 48 }}>
            {/* Hero specimen */}
            <div style={{ padding: 'clamp(32px, 5vw, 64px)', borderRadius: 16, background: `linear-gradient(135deg, ${C.navy950} 0%, ${C.navy800} 100%)`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.03 }}>
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="type-grid" patternUnits="userSpaceOnUse" width="40" height="40">
                      <rect width="40" height="40" fill="none" stroke={C.navy400} strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#type-grid)" />
                </svg>
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.red500, textTransform: 'uppercase' }}>Display / Hero</span>
                <p style={{ fontFamily: F.display, fontWeight: 800, fontSize: 'clamp(48px, 8vw, 96px)', letterSpacing: '0.04em', lineHeight: 0.92, color: C.white, textTransform: 'uppercase', marginTop: 16, marginBottom: 0 }}>
                  WE BUILD THE<br />SYSTEMS THAT KEEP<br /><span style={{ color: C.red500 }}>BUSINESS MOVING</span>
                </p>
                <p style={{ fontFamily: F.display, fontWeight: 500, fontSize: 11, letterSpacing: '0.15em', color: C.gray500, textTransform: 'uppercase', marginTop: 16 }}>
                  Barlow Condensed 800 / clamp(3rem, 8vw, 6rem) / tracking 0.04em / line-height 0.92 / UPPERCASE
                </p>
              </div>
            </div>

            {/* Section headline on light */}
            <div style={{ padding: 'clamp(32px, 5vw, 48px)', borderRadius: 16, background: C.white, border: `1px solid ${C.gray200}` }}>
              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.red500, textTransform: 'uppercase' }}>H1 / Section Title (on light)</span>
              <p style={{ fontFamily: F.display, fontWeight: 700, fontSize: 'clamp(32px, 5vw, 64px)', letterSpacing: '0.03em', lineHeight: 1.0, color: C.navy600, textTransform: 'uppercase', marginTop: 16, marginBottom: 0 }}>
                COMMERCIAL HVAC<br />THAT DELIVERS
              </p>
              <p style={{ fontFamily: F.display, fontWeight: 500, fontSize: 11, letterSpacing: '0.15em', color: C.gray400, textTransform: 'uppercase', marginTop: 12 }}>
                Barlow Condensed 700 / navy-600 / clamp(2.5rem, 5vw, 4rem) / tracking 0.03em
              </p>
            </div>

            {/* Sub-headline + body row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
              <div style={{ padding: 32, borderRadius: 16, background: C.navy800, border: `1px solid ${C.navyBorder}` }}>
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.gray400, textTransform: 'uppercase' }}>H2 / Sub-section</span>
                <p style={{ fontFamily: F.display, fontWeight: 600, fontSize: 'clamp(24px, 3.5vw, 40px)', letterSpacing: '0.02em', lineHeight: 1.1, color: C.white, textTransform: 'uppercase', marginTop: 12, marginBottom: 0 }}>
                  TRUSTED BY<br />INDUSTRY LEADERS
                </p>
                <p style={{ fontFamily: F.display, fontWeight: 500, fontSize: 10, color: C.gray500, marginTop: 8, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Barlow Condensed 600 / clamp(1.75rem, 3.5vw, 2.5rem)
                </p>
              </div>

              <div style={{ padding: 32, borderRadius: 16, background: C.white, border: `1px solid ${C.gray200}` }}>
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.gray400, textTransform: 'uppercase' }}>Body Text</span>
                <p style={{ fontFamily: F.body, fontWeight: 400, fontSize: 16, lineHeight: 1.65, color: C.gray700, maxWidth: 640, marginTop: 12, marginBottom: 0 }}>
                  Ambition Mechanical Services has been delivering precision HVAC solutions across Arizona since 2002. From preconstruction planning to preventive maintenance, we handle commercial and industrial mechanical systems with the integrity and reliability that our name demands.
                </p>
                <p style={{ fontFamily: F.display, fontWeight: 500, fontSize: 10, color: C.gray400, marginTop: 8, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Inter 400 / 16px / line-height 1.65 / max-w 640px
                </p>
              </div>
            </div>

            {/* Kickers, labels, buttons */}
            <div style={{ padding: 32, borderRadius: 16, background: C.navy800, border: `1px solid ${C.navyBorder}` }}>
              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.gray400, textTransform: 'uppercase', display: 'block', marginBottom: 24 }}>Kickers, Labels, Buttons</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-end' }}>
                <div>
                  <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 11, letterSpacing: '0.2em', color: C.red500, textTransform: 'uppercase' }}>OUR SERVICES</span>
                  <p style={{ fontSize: 10, color: C.gray500, marginTop: 4 }}>Kicker: 11px / 0.2em / red-500</p>
                </div>
                <div>
                  <button style={{ fontFamily: F.display, fontWeight: 600, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', background: C.red500, color: C.white, border: 'none', padding: '14px 32px', borderRadius: 8, cursor: 'pointer' }}>
                    GET A QUOTE
                  </button>
                  <p style={{ fontSize: 10, color: C.gray500, marginTop: 4 }}>Button: 14px / 0.08em</p>
                </div>
                <div>
                  <span style={{ fontFamily: F.body, fontWeight: 500, fontSize: 14, letterSpacing: '0.02em', color: C.gray300 }}>About Us</span>
                  <p style={{ fontSize: 10, color: C.gray500, marginTop: 4 }}>Nav: Inter 500 / 14px</p>
                </div>
              </div>
            </div>
          </div>

          {/* Full type scale table */}
          <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.white, textTransform: 'uppercase', marginBottom: 16 }}>Full Type Scale</h3>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.navyBorder}` }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.navy800 }}>
                    {['Role', 'Font', 'Weight', 'Size', 'Tracking', 'LH', 'Min Mobile'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', borderBottom: `1px solid ${C.navyBorder}`, fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.15em', color: C.gray400, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {typeScale.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.navyBorderLight}` }}>
                      <td style={{ padding: '10px 14px', fontFamily: F.display, fontWeight: 600, fontSize: 12, letterSpacing: '0.04em', color: C.red500 }}>{row.role}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: C.gray400 }}>{row.font}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: C.gray400 }}>{row.weight}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: C.gray300 }}>{row.size}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: C.gray400 }}>{row.tracking}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: C.gray400 }}>{row.lh}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: C.red400, fontWeight: 600 }}>{row.minMobile}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Font import */}
          <div style={{ marginTop: 32 }}>
            <CodeBlock dark label="Google Fonts Import" code={`<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">`} />
          </div>
        </MaxWidth>
      </DarkSection>

      <PatternStrip variant="navy" height={3} />

      {/* ============================================================ */}
      {/*  04. SPACING SYSTEM                                           */}
      {/* ============================================================ */}
      <OffWhiteSection>
        <MaxWidth>
          <SectionHeader num={4} title="Spacing System" subtitle="Systematic, not random. Every spacing value maps to a token. Generous vertical padding creates the breathing room that separates good sites from cramped ones." />

          {/* Spacing scale */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.gray200}`, background: C.white, marginBottom: 48 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.offWhite }}>
                    {['Token', 'Pixels', 'Rem', 'Usage'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', borderBottom: `1px solid ${C.gray200}`, fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.15em', color: C.gray400, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {spacingScale.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                      <td style={{ padding: '10px 14px', fontFamily: F.display, fontWeight: 600, fontSize: 13, color: C.navy600 }}>{row.token}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: C.gray700 }}>{row.px}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: C.gray500 }}>{row.rem}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: C.gray500, lineHeight: 1.5 }}>{row.usage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual spacing blocks */}
          <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase', marginBottom: 16 }}>Visual Reference</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap', padding: 32, borderRadius: 12, background: C.white, border: `1px solid ${C.gray200}` }}>
            {[
              { label: '4', h: 4 },
              { label: '8', h: 8 },
              { label: '12', h: 12 },
              { label: '16', h: 16 },
              { label: '24', h: 24 },
              { label: '32', h: 32 },
              { label: '48', h: 48 },
              { label: '64', h: 64 },
              { label: '80', h: 80 },
              { label: '96', h: 96 },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 40, height: s.h, background: `linear-gradient(180deg, ${C.navy600}, ${C.navy400})`, borderRadius: 4, opacity: 0.8 }} />
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.gray400 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Context spacing */}
          <div style={{ marginTop: 48 }}>
            <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase', marginBottom: 16 }}>Context Rules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {[
                { ctx: 'Container', val: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', note: '1280px max. All content sections.' },
                { ctx: 'Section (light)', val: 'py-20 md:py-28', note: 'Generous vertical on white/off-white.' },
                { ctx: 'Section (dark)', val: 'py-16 md:py-24', note: 'Slightly tighter. Dark feels heavier.' },
                { ctx: 'Hero padding', val: 'pt-32 pb-20 md:pt-40 md:pb-24', note: 'Extra top to clear fixed nav.' },
                { ctx: 'Card padding', val: 'p-6 md:p-8', note: 'Internal card spacing.' },
                { ctx: 'Card radius', val: 'rounded-xl (12px)', note: 'All cards and panels.' },
                { ctx: 'Button radius', val: 'rounded-lg (8px)', note: 'All buttons and inputs.' },
                { ctx: 'Grid gap', val: 'gap-6 md:gap-8', note: 'Between cards in grids.' },
                { ctx: 'Section content gap', val: 'gap-12 md:gap-16', note: 'Between major blocks.' },
                { ctx: 'Header to content', val: 'mb-12', note: 'Section header to first content.' },
              ].map((item, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 12, background: C.white, border: `1px solid ${C.gray200}` }}>
                  <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 12, color: C.navy600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.ctx}</span>
                  <code style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, color: C.gray700, marginTop: 4, background: C.gray100, padding: '4px 8px', borderRadius: 4 }}>{item.val}</code>
                  <p style={{ fontSize: 11, color: C.gray400, marginTop: 4 }}>{item.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Responsive breakpoints */}
          <div style={{ marginTop: 48 }}>
            <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase', marginBottom: 16 }}>Responsive Breakpoints</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {[
                { name: 'Mobile', range: '< 640px', cols: '1', notes: 'Single column. Stacked. Hamburger nav. Hero clamps to 3rem.' },
                { name: 'Tablet', range: '640-1024px', cols: '2', notes: 'Two-column grids. Side-by-side CTAs. Hero clamps to 4.5rem.' },
                { name: 'Desktop', range: '1024-1280px', cols: '3', notes: 'Three-column cards. Full nav. Max-w-7xl kicks in.' },
                { name: 'Wide', range: '> 1280px', cols: '3-4', notes: 'Content centered in max-w-7xl. Extra whitespace on sides.' },
              ].map((bp, i) => (
                <div key={i} style={{ padding: 20, borderRadius: 12, background: C.white, border: `1px solid ${C.gray200}` }}>
                  <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', color: C.navy600, textTransform: 'uppercase' }}>{bp.name}</span>
                  <p style={{ fontFamily: 'monospace', fontSize: 12, color: C.red500, marginTop: 4 }}>{bp.range}</p>
                  <p style={{ fontFamily: 'monospace', fontSize: 11, color: C.gray400, marginTop: 2 }}>Grid: {bp.cols} col</p>
                  <p style={{ fontSize: 12, color: C.gray500, marginTop: 6, lineHeight: 1.5 }}>{bp.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </MaxWidth>
      </OffWhiteSection>

      <PatternStrip variant="red" height={3} />

      {/* ============================================================ */}
      {/*  05. PATTERNS                                                 */}
      {/* ============================================================ */}
      <DarkSection>
        <MaxWidth>
          <SectionHeader num={5} title="Industrial Patterns" subtitle="Construction-grade textures. Blueprint grids, ductwork motifs, pipe runs, hex bolts. Used as subtle background overlays on dark sections (3-8% opacity). Different from AOM's patterns. Built for the trades." dark />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 24,
            marginBottom: 48,
          }}>
            {[
              { name: 'Blueprint Grid', desc: 'Engineering drawing grid. Dark sections, hero backgrounds. 3-5% opacity.', component: <PatternBlueprintGrid size={180} /> },
              { name: 'Ductwork', desc: 'HVAC duct cross-sections. CTA bands, stats sections. 3-5% opacity.', component: <PatternDuctwork size={180} /> },
              { name: 'Cross Hatch', desc: 'Industrial cross-hatch. Subtle texture for any dark surface. 3-5%.', component: <PatternCrossHatch size={180} /> },
              { name: 'Diagonal Lines', desc: 'Caution-stripe feel. Red accent for dividers. 5-8% opacity.', component: <PatternDiagonalLines size={180} /> },
              { name: 'Hex Bolts', desc: 'Hardware-inspired hexagons. Equipment sections. 3-5% opacity.', component: <PatternHexBolts size={180} /> },
              { name: 'Pipe Run', desc: 'Connected piping layout. About section, process flow. 3-5% opacity.', component: <PatternPipeRun size={180} /> },
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {p.component}
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 11, letterSpacing: '0.15em', color: C.gray400, textTransform: 'uppercase', marginTop: 12 }}>{p.name}</span>
                <p style={{ fontSize: 11, color: C.gray500, textAlign: 'center', marginTop: 4, lineHeight: 1.5, maxWidth: 200 }}>{p.desc}</p>
              </div>
            ))}
          </div>

          {/* Usage rules */}
          <div style={{ padding: 24, borderRadius: 12, background: C.navy800, border: `1px solid ${C.navyBorder}` }}>
            <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.gray500, textTransform: 'uppercase' }}>Pattern Rules</span>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Patterns appear on DARK sections only. Never on white/light backgrounds.',
                'Maximum opacity: 8%. Most should be 3-5%. Texture, not wallpaper.',
                'One pattern per section. No stacking or combining patterns.',
                'Blueprint Grid is the default. Use others for variety across sections.',
                'Patterns are CSS/SVG, not images. They scale cleanly at any resolution.',
              ].map((rule, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.red500, marginTop: 6, flexShrink: 0 }} />
                  <span style={{ color: C.gray400, fontSize: 13, lineHeight: 1.6 }}>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </MaxWidth>
      </DarkSection>

      <PatternStrip variant="navy" height={3} />

      {/* ============================================================ */}
      {/*  06. COMPONENT LIBRARY                                        */}
      {/* ============================================================ */}
      <LightSection>
        <MaxWidth>
          <SectionHeader num={6} title="Component Library" subtitle="Buttons, cards, badges, service pills, section headers. All styled consistently. Bobby: follow these specs exactly." />

          {/* Buttons */}
          <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase', marginBottom: 16 }}>Button System</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 48 }}>
            {componentSpecs.map((btn, i) => (
              <div key={i} style={{ borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24, padding: 24 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', color: C.red500, textTransform: 'uppercase' }}>{btn.name}</span>
                    <p style={{ fontSize: 13, color: C.gray500, marginTop: 4 }}>{btn.desc}</p>
                    {/* Live preview */}
                    <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {btn.name === 'Primary CTA' && (
                        <>
                          <button style={{ fontFamily: F.display, fontWeight: 600, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', background: C.red500, color: C.white, border: 'none', padding: '14px 32px', borderRadius: 8, cursor: 'pointer' }}>Get a Quote</button>
                          <button style={{ fontFamily: F.display, fontWeight: 600, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', background: C.red400, color: C.white, border: 'none', padding: '14px 32px', borderRadius: 8, cursor: 'pointer' }}>Hover State</button>
                        </>
                      )}
                      {btn.name === 'Secondary CTA' && (
                        <>
                          <button style={{ fontFamily: F.display, fontWeight: 600, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'transparent', color: C.navy600, border: `2px solid ${C.navy600}`, padding: '12px 32px', borderRadius: 8, cursor: 'pointer' }}>See Our Work</button>
                          <button style={{ fontFamily: F.display, fontWeight: 600, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', background: C.navy600, color: C.white, border: '2px solid transparent', padding: '12px 32px', borderRadius: 8, cursor: 'pointer' }}>Hover State</button>
                        </>
                      )}
                      {btn.name === 'Ghost / Link' && (
                        <span style={{ fontFamily: F.body, fontWeight: 500, fontSize: 14, color: C.navy600, textDecoration: 'underline', textUnderlineOffset: 4, cursor: 'pointer' }}>View All Projects</span>
                      )}
                      {btn.name === 'Dark CTA' && (
                        <div style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 8, background: C.navy900 }}>
                          <button style={{ fontFamily: F.display, fontWeight: 600, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.1)', color: C.white, border: '1px solid rgba(255,255,255,0.2)', padding: '12px 32px', borderRadius: 8, cursor: 'pointer' }}>Learn More</button>
                          <button style={{ fontFamily: F.display, fontWeight: 600, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', background: C.red500, color: C.white, border: 'none', padding: '12px 32px', borderRadius: 8, cursor: 'pointer' }}>Hover</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ width: 260, flexShrink: 0, fontSize: 11 }}>
                    <div><span style={{ color: C.gray400 }}>Classes: </span><code style={{ fontFamily: 'monospace', color: C.gray700, fontSize: 10 }}>{btn.classes}</code></div>
                    <div style={{ marginTop: 4 }}><span style={{ color: C.gray400 }}>Hover: </span><code style={{ fontFamily: 'monospace', color: C.gray700, fontSize: 10 }}>{btn.hover}</code></div>
                    <div style={{ marginTop: 4 }}><span style={{ color: C.gray400 }}>Active: </span><code style={{ fontFamily: 'monospace', color: C.gray700, fontSize: 10 }}>{btn.active}</code></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Service Card */}
          <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase', marginBottom: 16 }}>Service Cards</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginBottom: 48 }}>
            {/* Light card */}
            <div style={{ padding: 32, borderRadius: 12, background: C.white, border: `1px solid ${C.gray200}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: C.navy600, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <span style={{ color: C.white, fontSize: 20 }}>*</span>
              </div>
              <p style={{ fontFamily: F.display, fontWeight: 600, fontSize: 20, letterSpacing: '0.02em', color: C.navy600, textTransform: 'uppercase' }}>HVAC Installation</p>
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray500, lineHeight: 1.6, marginTop: 8 }}>Commercial and industrial HVAC systems installed to spec, on schedule, without surprises.</p>
              <p style={{ fontSize: 10, color: C.gray400, marginTop: 12, fontFamily: F.display, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Light variant / p-8 / rounded-xl / border-neutral-200</p>
            </div>
            {/* Dark card */}
            <div style={{ padding: 32, borderRadius: 12, background: C.navy800, border: `1px solid ${C.navyBorder}` }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <span style={{ color: C.red500, fontSize: 20 }}>*</span>
              </div>
              <p style={{ fontFamily: F.display, fontWeight: 600, fontSize: 20, letterSpacing: '0.02em', color: C.white, textTransform: 'uppercase' }}>HVAC Installation</p>
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray400, lineHeight: 1.6, marginTop: 8 }}>Commercial and industrial HVAC systems installed to spec, on schedule, without surprises.</p>
              <p style={{ fontSize: 10, color: C.gray500, marginTop: 12, fontFamily: F.display, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Dark variant / navy-800 / border-navy-600/30</p>
            </div>
          </div>

          {/* Credential Badge + Stat Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 48 }}>
            <div style={{ padding: 32, borderRadius: 12, border: `1px solid ${C.gray200}` }}>
              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.gray400, textTransform: 'uppercase', display: 'block', marginBottom: 16 }}>Credential Badge</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: C.gray100, border: `1px solid ${C.gray200}` }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.red500 }} />
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 11, letterSpacing: '0.15em', color: C.gray700, textTransform: 'uppercase' }}>Licensed ROC #320923</span>
              </div>
              <p style={{ fontSize: 11, color: C.gray400, marginTop: 12 }}>Footer, hero, CTA sections. Red dot + Barlow label. Trust without noise.</p>
            </div>

            <div style={{ padding: 32, borderRadius: 12, background: C.navy900 }}>
              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.gray500, textTransform: 'uppercase', display: 'block', marginBottom: 16 }}>Stat Row</span>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                {[
                  { val: '500+', label: 'Projects' },
                  { val: '23', label: 'Years' },
                  { val: '24/7', label: 'Dispatch' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: F.display, fontWeight: 700, fontSize: 32, letterSpacing: '0.03em', color: C.white, margin: 0 }}>{s.val}</p>
                    <p style={{ fontFamily: F.body, fontWeight: 500, fontSize: 10, letterSpacing: '0.15em', color: C.gray400, textTransform: 'uppercase', marginTop: 4 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section pattern: kicker + headline */}
          <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase', marginBottom: 16 }}>Section Pattern</h3>
          <div style={{ padding: 32, borderRadius: 12, border: `1px solid ${C.gray200}` }}>
            <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 11, letterSpacing: '0.2em', color: C.red500, textTransform: 'uppercase' }}>OUR SERVICES</span>
            <div style={{ width: 32, height: 2, background: C.red500, marginTop: 8 }} />
            <p style={{ fontFamily: F.display, fontWeight: 700, fontSize: 'clamp(24px, 4vw, 40px)', letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase', lineHeight: 1.0, marginTop: 12, marginBottom: 0 }}>COMMERCIAL HVAC SOLUTIONS</p>
            <p style={{ fontFamily: F.body, fontSize: 15, color: C.gray500, lineHeight: 1.65, marginTop: 8, maxWidth: 640 }}>From preconstruction to preventive maintenance, Ambition Mechanical handles every phase of your building's mechanical systems.</p>
            <p style={{ fontSize: 10, color: C.gray400, marginTop: 16, fontFamily: F.display, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pattern: red kicker + 2px line + navy headline + steel body. Used at the top of every section.</p>
          </div>
        </MaxWidth>
      </LightSection>

      <PatternStrip variant="red" height={3} />

      {/* ============================================================ */}
      {/*  07. WEBSITE LAYOUT                                           */}
      {/* ============================================================ */}
      <DarkSection>
        <MaxWidth>
          <SectionHeader num={7} title="Website Layout" subtitle="Section-by-section layout. Bobby: build top to bottom following this. Each section specifies background, content pattern, and visual direction." dark />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 48 }}>
            {siteLayout.map((section, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'stretch', borderRadius: 12, overflow: 'hidden',
                border: section.dark ? 'none' : `1px solid ${C.gray200}`,
              }}>
                <div style={{ width: 4, background: section.dark ? C.navy600 : C.white, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: '16px 20px', background: section.dark ? C.navy800 : C.white, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
                    <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', color: C.red500 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', color: section.dark ? C.white : C.navy600, textTransform: 'uppercase' }}>{section.section}</span>
                  </div>
                  <p style={{ flex: 1, fontSize: 13, color: section.dark ? C.gray300 : C.gray700, lineHeight: 1.6, minWidth: 200 }}>{section.desc}</p>
                  <code style={{ fontFamily: 'monospace', fontSize: 11, color: section.dark ? C.navy300 : C.gray500, background: section.dark ? 'rgba(57,73,171,0.15)' : C.gray100, padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap' }}>{section.bg}</code>
                </div>
              </div>
            ))}
          </div>

          {/* Animation specs */}
          <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.white, textTransform: 'uppercase', marginBottom: 16 }}>Motion Specs</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {[
              { name: 'Scroll Reveal', code: 'opacity 0->1, translateY(24px)->0\n500ms cubic-bezier(0.2,0.65,0.2,1)\nStagger: 60ms/item, max 300ms' },
              { name: 'Card Hover', code: '-translate-y-1, shadow-lg\n300ms ease-out\nNo scale transforms' },
              { name: 'Button Hover', code: 'bg-color + shadow increase\n200ms ease\nOptional: -translate-y-0.5' },
              { name: 'Nav Scroll', code: 'transparent -> navy-900/95\n+ backdrop-blur-xl\n400ms ease' },
            ].map((item, i) => (
              <div key={i} style={{ padding: 20, borderRadius: 12, background: C.navy800, border: `1px solid ${C.navyBorder}` }}>
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 13, letterSpacing: '0.04em', color: C.white, textTransform: 'uppercase' }}>{item.name}</span>
                <code style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, color: C.gray400, background: 'rgba(57,73,171,0.15)', borderRadius: 8, padding: '10px 14px', marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.code}</code>
              </div>
            ))}
          </div>
        </MaxWidth>
      </DarkSection>

      <PatternStrip variant="navy" height={3} />

      {/* ============================================================ */}
      {/*  08. PHOTOGRAPHY                                              */}
      {/* ============================================================ */}
      <OffWhiteSection>
        <MaxWidth>
          <SectionHeader num={8} title="Photography Style" subtitle="Construction photography that builds credibility. Real work, real scale, real people. No stock. No poses. The camera captures what the crew actually does." />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginBottom: 48 }}>
            {[
              { label: 'HVAC Equipment', color: C.red500, desc: 'Clean shots of rooftop units, chillers, VRV systems. Slightly cool color grade, strong contrast. Equipment should look engineered, not generic industrial.' },
              { label: 'The Crew', color: C.red500, desc: 'Real people doing real work. Hard hats, tools in hand, focused. Shoulder-up for social. Never posed. Candid is always stronger.' },
              { label: 'Scale and Space', color: C.navy600, desc: 'Wide shots showing commercial project scope. Intel fabs, hospital systems, restaurant kitchens. Scale tells the credibility story.' },
              { label: 'Progress', color: C.navy600, desc: 'Before/during/after sequences. Piping going in, ductwork connected, systems online. Progress is the #1 performing social format.' },
            ].map((item, i) => (
              <div key={i} style={{ padding: 24, borderRadius: 12, background: C.white, border: `1px solid ${C.gray200}` }}>
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 11, letterSpacing: '0.2em', color: item.color, textTransform: 'uppercase' }}>{item.label}</span>
                <p style={{ fontSize: 14, color: C.gray500, lineHeight: 1.6, marginTop: 8 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Color grade */}
          <div style={{ padding: 24, borderRadius: 12, background: C.white, border: `1px solid ${C.gray200}` }}>
            <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.gray400, textTransform: 'uppercase' }}>Color Grade Direction</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginTop: 16 }}>
              {[
                { param: 'Temperature', value: 'Neutral to slightly cool', note: 'Navy in the brand subtly informs the grade. Never warm/orange.' },
                { param: 'Contrast', value: 'Medium-high', note: 'Clean shadows with detail. Not crushed, not flat.' },
                { param: 'Saturation', value: 'Controlled', note: 'Pulled back 10-15%. Reds stay strong for brand moments.' },
              ].map((item, i) => (
                <div key={i}>
                  <p style={{ fontFamily: F.display, fontWeight: 600, fontSize: 12, letterSpacing: '0.1em', color: C.red500, textTransform: 'uppercase' }}>{item.param}</p>
                  <p style={{ fontFamily: F.body, fontWeight: 600, fontSize: 14, color: C.navy600, marginTop: 4 }}>{item.value}</p>
                  <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </MaxWidth>
      </OffWhiteSection>

      <PatternStrip variant="red" height={3} />

      {/* ============================================================ */}
      {/*  09. VOICE & TONE                                             */}
      {/* ============================================================ */}
      <LightSection>
        <MaxWidth>
          <SectionHeader num={9} title="Voice and Tone" subtitle="Like a crew lead who knows the job inside out and doesn't need to oversell it. Confident, direct, grounded. Technical when it matters. Human always." />

          {/* Voice attributes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 48 }}>
            {voiceAttributes.map((v, i) => (
              <div key={i} style={{ padding: 24, borderRadius: 12, background: C.offWhite, border: `1px solid ${C.gray200}` }}>
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 12, letterSpacing: '0.15em', color: C.red500, textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>{v.attr}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', marginTop: 6, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: C.gray700 }}>"{v.yes}"</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.red400, marginTop: 6, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: C.gray400, textDecoration: 'line-through' }}>"{v.no}"</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tone shifts */}
          <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase', marginBottom: 16 }}>Tone Shifts by Context</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 48 }}>
            {toneShifts.map((shift, i) => (
              <div key={i} style={{ padding: 20, borderRadius: 12, background: C.offWhite, border: `1px solid ${C.gray200}` }}>
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.navy600, textTransform: 'uppercase' }}>{shift.context}</span>
                <p style={{ fontSize: 13, fontWeight: 500, color: C.gray700, marginTop: 8 }}>{shift.tone}</p>
                <p style={{ fontSize: 13, color: C.gray400, marginTop: 8, fontStyle: 'italic' }}>"{shift.example}"</p>
              </div>
            ))}
          </div>

          {/* Hard rules */}
          <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase', marginBottom: 16 }}>Content Hard Rules</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { rule: 'No exclamation marks in headlines', reason: 'Confidence does not need volume.' },
              { rule: 'Never use "solutions" without specifying what', reason: '"HVAC solutions" is meaningless. "Rooftop unit replacement" is specific.' },
              { rule: 'No corporate filler', reason: '"Committed to excellence," "second to none" are banned. Say what you actually do.' },
              { rule: 'Credentials are facts, not boasts', reason: 'State plainly: "Licensed ROC #320923. Established 2002."' },
              { rule: 'Short paragraphs, short sentences', reason: 'This audience scans. 3+ lines = lost them.' },
              { rule: 'CTAs are direct', reason: '"Get a Quote" not "Explore Your Options."' },
              { rule: 'Emergency copy has zero warmth', reason: 'When a chiller goes down at 3AM: "On our way." Not personality.' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 12, border: `1px solid ${C.gray200}` }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: C.red500, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: C.navy600 }}>{item.rule}</p>
                  <p style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>{item.reason}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Personality spectrum */}
          <div style={{ marginTop: 48, padding: 32, borderRadius: 12, background: C.offWhite, border: `1px solid ${C.gray200}` }}>
            <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.gray400, textTransform: 'uppercase' }}>Brand Personality Spectrum</span>
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { left: 'Casual', right: 'Formal', position: 35 },
                { left: 'Playful', right: 'Serious', position: 70 },
                { left: 'Corporate', right: 'Human', position: 75 },
                { left: 'Quiet', right: 'Loud', position: 45 },
                { left: 'Technical', right: 'Simple', position: 40 },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 11, color: C.gray400, width: 72, textAlign: 'right', fontFamily: F.body }}>{item.left}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.gray200, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '50%', left: `${item.position}%`, transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%', background: C.red500, boxShadow: '0 0 8px rgba(220,38,38,0.3)' }} />
                  </div>
                  <span style={{ fontSize: 11, color: C.gray400, width: 72, fontFamily: F.body }}>{item.right}</span>
                </div>
              ))}
            </div>
          </div>
        </MaxWidth>
      </LightSection>

      <PatternStrip variant="red" height={3} />

      {/* ============================================================ */}
      {/*  10. TAILWIND CONFIG                                          */}
      {/* ============================================================ */}
      <DarkSection>
        <MaxWidth>
          <SectionHeader num={10} title="Tailwind Config" subtitle="Drop-in values for tailwind.config.js. Single source of truth for Bobby." dark />

          <CodeBlock dark label="tailwind.config.js extend" code={`// Ambition Mechanical Design Tokens
colors: {
  navy: {
    950: '#070b1e',
    900: '#0a0e2a',
    800: '#111638',
    700: '#1a1f45',
    600: '#1a237e',
    500: '#283593',
    400: '#3949ab',
    300: '#5c6bc0',
  },
  red: {
    700: '#991b1b',
    600: '#b91c1c',
    500: '#dc2626',
    400: '#ef4444',
    300: '#f87171',
  },
  flame: {
    500: '#ea580c',
    400: '#f97316',
  },
},
fontFamily: {
  display: ['Barlow Condensed', 'sans-serif'],
  body: ['Inter', 'system-ui', 'sans-serif'],
},
spacing: {
  // Uses default Tailwind 4px scale
  // Key overrides:
  // Section padding: py-20 (80px) to py-28 (112px)
  // Card padding: p-6 (24px) to p-8 (32px)
  // Grid gaps: gap-6 (24px) to gap-8 (32px)
},
borderRadius: {
  DEFAULT: '8px',   // buttons, inputs
  lg: '8px',        // buttons, inputs
  xl: '12px',       // cards, panels
  '2xl': '16px',    // large cards, hero elements
},`} />
        </MaxWidth>
      </DarkSection>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer style={{
        background: C.navy950,
        borderTop: `3px solid ${C.red500}`,
        padding: '48px clamp(24px, 5vw, 80px)',
      }}>
        <MaxWidth>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.red500, boxShadow: '0 0 8px rgba(220,38,38,0.4)' }} />
              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.25em', color: C.gray500, textTransform: 'uppercase' }}>
                Ambition Mechanical Brand Guidelines v2.0
              </span>
            </div>
            <span style={{ fontFamily: F.body, fontSize: 10, color: C.gray600 }}>
              Created by Steffen for AOM / Bobby. March 2026.
            </span>
          </div>
        </MaxWidth>
      </footer>
    </div>
  )
}
