import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Copy, Check, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toPng } from 'html-to-image'

/* ------------------------------------------------------------------ */
/*  Ambition Mechanical Brand Guidelines v2                            */
/*  Scrolling dark-light rhythm layout, industrial patterns             */
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

function DarkSection({ children, style: s = {}, ...rest }) {
  return (
    <section style={{
      background: C.navy900,
      padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
      color: C.white,
      ...s,
    }} {...rest}>{children}</section>
  )
}

function LightSection({ children, style: s = {}, ...rest }) {
  return (
    <section style={{
      background: C.white,
      padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
      color: C.gray700,
      ...s,
    }} {...rest}>{children}</section>
  )
}

function OffWhiteSection({ children, style: s = {}, ...rest }) {
  return (
    <section style={{
      background: C.offWhite,
      padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
      color: C.gray700,
      ...s,
    }} {...rest}>{children}</section>
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
/*  NAV SECTIONS                                                       */
/* ================================================================== */

const NAV_SECTIONS = [
  { id: 'section-logo', num: '01', label: 'Logo' },
  { id: 'section-colors', num: '02', label: 'Colors' },
  { id: 'section-type', num: '03', label: 'Type' },
  { id: 'section-spacing', num: '04', label: 'Spacing' },
  { id: 'section-patterns', num: '05', label: 'Patterns' },
  { id: 'section-components', num: '06', label: 'Components' },
  { id: 'section-layout', num: '07', label: 'Layout' },
  { id: 'section-photo', num: '08', label: 'Photo' },
  { id: 'section-voice', num: '09', label: 'Voice' },
  { id: 'section-tailwind', num: '10', label: 'Tailwind' },
  { id: 'section-social', num: '11', label: 'Social' },
]

/* ================================================================== */
/*  DOWNLOAD BUTTON                                                    */
/* ================================================================== */

function DownloadButton({ targetRef, filename, label = 'Download PNG', small = false, style: s = {} }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = useCallback(async () => {
    if (!targetRef.current || downloading) return
    setDownloading(true)
    try {
      // Wait for fonts to be ready
      await document.fonts.ready
      const dataUrl = await toPng(targetRef.current, { pixelRatio: 2, cacheBust: true })
      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }, [targetRef, filename, downloading])

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: small ? 4 : 8,
        fontFamily: F.display,
        fontWeight: 600,
        fontSize: small ? 10 : 12,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        background: downloading ? C.gray500 : C.red500,
        color: C.white,
        border: 'none',
        padding: small ? '6px 12px' : '10px 20px',
        borderRadius: 8,
        cursor: downloading ? 'not-allowed' : 'pointer',
        transition: 'background 200ms ease',
        ...s,
      }}
      onMouseEnter={e => { if (!downloading) e.currentTarget.style.background = C.red400 }}
      onMouseLeave={e => { if (!downloading) e.currentTarget.style.background = C.red500 }}
    >
      <Download size={small ? 10 : 14} />
      {downloading ? 'EXPORTING...' : label}
    </button>
  )
}

function DownloadOverlay({ targetRef, filename }) {
  const [downloading, setDownloading] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleDownload = useCallback(async (e) => {
    e.stopPropagation()
    if (!targetRef.current || downloading) return
    setDownloading(true)
    try {
      await document.fonts.ready
      const dataUrl = await toPng(targetRef.current, { pixelRatio: 2, cacheBust: true })
      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }, [targetRef, filename, downloading])

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'absolute', top: 8, right: 8, zIndex: 5, opacity: hovered ? 1 : 0, transition: 'opacity 200ms ease' }}
    >
      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 6,
          background: downloading ? C.gray500 : C.red500,
          color: C.white,
          border: 'none',
          cursor: downloading ? 'not-allowed' : 'pointer',
          padding: 0,
          transition: 'background 200ms ease',
        }}
        title={`Download ${filename}`}
      >
        <Download size={12} />
      </button>
    </div>
  )
}

/* ================================================================== */
/*  QUICK NAV BAR                                                      */
/* ================================================================== */

function QuickNav({ activeSection }) {
  const navRef = useRef(null)

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) {
      const navHeight = 52
      const y = el.getBoundingClientRect().top + window.scrollY - navHeight
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  // Auto-scroll the nav bar to keep active item visible
  useEffect(() => {
    if (!navRef.current || !activeSection) return
    const activeBtn = navRef.current.querySelector(`[data-section="${activeSection}"]`)
    if (activeBtn) {
      const nav = navRef.current
      const btnLeft = activeBtn.offsetLeft
      const btnWidth = activeBtn.offsetWidth
      const navWidth = nav.offsetWidth
      const scrollLeft = nav.scrollLeft
      if (btnLeft < scrollLeft || btnLeft + btnWidth > scrollLeft + navWidth) {
        nav.scrollTo({ left: btnLeft - navWidth / 2 + btnWidth / 2, behavior: 'smooth' })
      }
    }
  }, [activeSection])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: C.navy900,
      borderBottom: `1px solid ${C.navyBorder}`,
      backdropFilter: 'blur(12px)',
    }}>
      <div
        ref={navRef}
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          padding: '0 16px',
        }}
      >
        {NAV_SECTIONS.map((sec) => {
          const isActive = activeSection === sec.id
          return (
            <button
              key={sec.id}
              data-section={sec.id}
              onClick={() => scrollToSection(sec.id)}
              style={{
                fontFamily: F.display,
                fontWeight: isActive ? 700 : 500,
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: isActive ? C.white : C.gray500,
                background: 'none',
                border: 'none',
                borderBottom: isActive ? `2px solid ${C.red500}` : '2px solid transparent',
                padding: '14px 14px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 200ms ease, border-color 200ms ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = C.gray300 }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.gray500 }}
            >
              <span style={{ color: isActive ? C.red500 : C.gray600, marginRight: 4, fontSize: 10 }}>{sec.num}</span>
              {sec.label}
            </button>
          )
        })}
      </div>
      {/* Hide scrollbar */}
      <style>{`
        [data-quicknav]::-webkit-scrollbar { display: none; }
      `}</style>
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
  const [activeSection, setActiveSection] = useState(null)
  const [showNav, setShowNav] = useState(false)

  // Refs for downloadable elements
  const patternRefs = useRef({})
  const componentRefs = useRef({})
  const colorPaletteRef = useRef(null)
  const templateRefs = useRef({})

  // IntersectionObserver for quick nav active state + visibility
  useEffect(() => {
    const heroEl = document.getElementById('hero-section')
    const sectionIds = NAV_SECTIONS.map(s => s.id)

    // Show/hide nav based on hero visibility
    const heroObserver = new IntersectionObserver(
      ([entry]) => setShowNav(!entry.isIntersecting),
      { threshold: 0.1 }
    )
    if (heroEl) heroObserver.observe(heroEl)

    // Track active section
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id)
        }
      },
      { rootMargin: '-60px 0px -60% 0px', threshold: 0.1 }
    )
    sectionIds.forEach(id => {
      const el = document.getElementById(id)
      if (el) sectionObserver.observe(el)
    })

    return () => {
      heroObserver.disconnect()
      sectionObserver.disconnect()
    }
  }, [])

  // Refs for individual downloadable asset pieces (hidden off-screen)
  const pieceRefs = useRef({})

  // Download helper for template full-size renders (transparent background)
  const downloadTemplate = useCallback(async (refKey, filename) => {
    const el = templateRefs.current[refKey] || pieceRefs.current[refKey]
    if (!el) return
    try {
      await document.fonts.ready
      const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true, backgroundColor: null })
      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Template download failed:', err)
    }
  }, [])

  /* ---- Asset download pill button ---- */
  const AssetPill = ({ refKey, filename, label }) => {
    const [dl, setDl] = useState(false)
    const [hov, setHov] = useState(false)
    return (
      <button
        onClick={async () => {
          setDl(true)
          await downloadTemplate(refKey, filename)
          setDl(false)
        }}
        disabled={dl}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: C.navy800, color: C.gray300, fontSize: 11, fontFamily: F.body,
          padding: '4px 10px', borderRadius: 100,
          border: `1px solid ${hov ? C.red500 : C.navyBorder}`,
          cursor: dl ? 'not-allowed' : 'pointer', transition: 'border-color 200ms ease',
          opacity: dl ? 0.6 : 1, whiteSpace: 'nowrap',
        }}
      >
        <Download size={9} />
        {dl ? '...' : label}
      </button>
    )
  }

  /* ---- "Download Assets" label + pills row ---- */
  const AssetRow = ({ pieces }) => (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10, color: C.gray500, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: F.display, fontWeight: 600, marginBottom: 6 }}>Download Assets</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {pieces.map((p, idx) => (
          <AssetPill key={idx} refKey={p.refKey} filename={p.filename} label={p.label} />
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ background: C.navy900, minHeight: '100vh', fontFamily: F.body }}>

      {/* ============================================================ */}
      {/*  HIDDEN OFF-SCREEN PIECE ELEMENTS (for individual downloads) */}
      {/* ============================================================ */}
      <div style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none', opacity: 0 }}>

        {/* === OVERLAY PIECES === */}

        {/* Lower Third pieces */}
        <div ref={el => { pieceRefs.current['overlay-lower-third-accent-bar'] = el }} style={{ width: 4, height: 60, background: C.red500, borderRadius: '2px 0 0 2px' }} />
        <div ref={el => { pieceRefs.current['overlay-lower-third-panel'] = el }} style={{ width: 200, height: 60, background: 'rgba(10, 14, 42, 0.85)', borderRadius: '0 4px 4px 0' }} />
        <div ref={el => { pieceRefs.current['overlay-lower-third-full'] = el }} style={{ display: 'flex' }}>
          <div style={{ width: 4, height: 60, background: C.red500, borderRadius: '2px 0 0 2px' }} />
          <div style={{ width: 200, height: 60, background: 'rgba(10, 14, 42, 0.85)', borderRadius: '0 4px 4px 0' }} />
        </div>

        {/* Location Bar pieces */}
        <div ref={el => { pieceRefs.current['overlay-location-bar-bar'] = el }} style={{ width: 400, height: 48, background: 'rgba(10, 14, 42, 0.70)', borderTop: '1px solid rgba(255,255,255,0.10)' }} />
        <div ref={el => { pieceRefs.current['overlay-location-bar-pin'] = el }} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill={C.red500} stroke="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
        </div>
        <div ref={el => { pieceRefs.current['overlay-location-bar-full'] = el }} style={{ width: 400, height: 48, background: 'rgba(10, 14, 42, 0.70)', borderTop: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill={C.red500} stroke="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
        </div>

        {/* Before/After Labels pieces */}
        <div ref={el => { pieceRefs.current['overlay-before-after-before'] = el }} style={{ background: 'rgba(10, 14, 42, 0.85)', padding: '6px 16px', borderBottom: `2px solid ${C.gray400}`, display: 'inline-block' }} />
        <div ref={el => { pieceRefs.current['overlay-before-after-after'] = el }} style={{ background: 'rgba(10, 14, 42, 0.85)', padding: '6px 16px', borderBottom: `2px solid ${C.red500}`, display: 'inline-block' }} />
        <div ref={el => { pieceRefs.current['overlay-before-after-divider'] = el }} style={{ width: 3, height: 120, background: C.red500 }} />
        <div ref={el => { pieceRefs.current['overlay-before-after-full'] = el }} style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: 'rgba(10, 14, 42, 0.85)', padding: '6px 16px', borderBottom: `2px solid ${C.gray400}` }} />
          <div style={{ background: 'rgba(10, 14, 42, 0.85)', padding: '6px 16px', borderBottom: `2px solid ${C.red500}` }} />
        </div>

        {/* Progress Indicator pieces */}
        <div ref={el => { pieceRefs.current['overlay-progress-panel'] = el }} style={{ background: 'rgba(10, 14, 42, 0.85)', padding: '8px 14px', borderRadius: 8, width: 80, height: 40 }} />
        <div ref={el => { pieceRefs.current['overlay-progress-underline'] = el }} style={{ width: 48, height: 2, background: C.red500 }} />
        <div ref={el => { pieceRefs.current['overlay-progress-full'] = el }} style={{ background: 'rgba(10, 14, 42, 0.85)', padding: '8px 14px', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ width: '60%', height: 2, background: C.red500, margin: '30px auto 0' }} />
        </div>

        {/* Equipment Callout pieces */}
        <div ref={el => { pieceRefs.current['overlay-equipment-callout-panel'] = el }} style={{ background: 'rgba(10, 14, 42, 0.85)', padding: '6px 12px', borderRadius: 4, width: 120, height: 36 }} />
        <div ref={el => { pieceRefs.current['overlay-equipment-callout-connector'] = el }} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.red500 }} />
          <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.40)' }} />
        </div>
        <div ref={el => { pieceRefs.current['overlay-equipment-callout-full'] = el }} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.red500 }} />
          <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.40)' }} />
          <div style={{ background: 'rgba(10, 14, 42, 0.85)', padding: '6px 12px', borderRadius: 4 }} />
        </div>

        {/* ROC Watermark piece (single) */}
        <div ref={el => { pieceRefs.current['overlay-roc-watermark-backdrop'] = el }} style={{ padding: '4px 8px', background: 'rgba(0,0,0,0.25)', borderRadius: 4 }} />

        {/* === REEL PIECES === */}

        {/* Hook Text pieces */}
        <div ref={el => { pieceRefs.current['reel-hook-text-gradient'] = el }} style={{ width: 400, height: 200, background: 'rgba(10, 14, 42, 0.40)' }} />
        <div ref={el => { pieceRefs.current['reel-hook-text-full'] = el }} style={{ width: 400, height: 200, background: 'rgba(10, 14, 42, 0.40)' }} />

        {/* Stat Callout pieces */}
        <div ref={el => { pieceRefs.current['reel-stat-callout-accent-line'] = el }} style={{ width: 48, height: 2, background: C.red500 }} />
        <div ref={el => { pieceRefs.current['reel-stat-callout-kicker-bar'] = el }} style={{ display: 'inline-block', padding: '2px 0' }}>
          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.red500, textTransform: 'uppercase' }}>&nbsp;</div>
        </div>
        <div ref={el => { pieceRefs.current['reel-stat-callout-full'] = el }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 16 }}>
          <div style={{ width: 48, height: 2, background: C.red500, marginTop: 8 }} />
        </div>

        {/* Step Counter pieces */}
        <div ref={el => { pieceRefs.current['reel-step-counter-dots'] = el }} style={{ display: 'flex', gap: 6 }}>
          {[0,1,2,3,4].map(d => (
            <div key={d} style={{ width: 8, height: 8, borderRadius: '50%', background: d === 0 ? C.red500 : 'transparent', border: d === 0 ? 'none' : '1px solid rgba(255,255,255,0.25)', boxShadow: d === 0 ? '0 0 8px rgba(220,38,38,0.5)' : 'none' }} />
          ))}
        </div>
        <div ref={el => { pieceRefs.current['reel-step-counter-gradient'] = el }} style={{ width: 400, height: 200, background: 'linear-gradient(to bottom, transparent, rgba(10,14,42,0.6))' }} />
        <div ref={el => { pieceRefs.current['reel-step-counter-full'] = el }} style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0,1,2,3,4].map(d => (
              <div key={d} style={{ width: 8, height: 8, borderRadius: '50%', background: d === 0 ? C.red500 : 'transparent', border: d === 0 ? 'none' : '1px solid rgba(255,255,255,0.25)', boxShadow: d === 0 ? '0 0 8px rgba(220,38,38,0.5)' : 'none' }} />
            ))}
          </div>
        </div>

        {/* Quote/Testimonial pieces */}
        <div ref={el => { pieceRefs.current['reel-quote-glass-panel'] = el }} style={{ width: 300, height: 100, background: 'rgba(10, 14, 42, 0.60)', backdropFilter: 'blur(12px)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }} />
        <div ref={el => { pieceRefs.current['reel-quote-accent-bar'] = el }} style={{ width: 3, height: 80, background: C.red500 }} />
        <div ref={el => { pieceRefs.current['reel-quote-quote-mark'] = el }} style={{ padding: 8 }}>
          <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 28, color: 'rgba(220,38,38,0.30)' }}>&ldquo;</span>
        </div>
        <div ref={el => { pieceRefs.current['reel-quote-full'] = el }} style={{ background: 'rgba(10, 14, 42, 0.60)', backdropFilter: 'blur(12px)', padding: '16px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${C.red500}`, maxWidth: 300, position: 'relative' }}>
          <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 28, color: 'rgba(220,38,38,0.30)', position: 'absolute', top: -4, left: 12 }}>&ldquo;</span>
        </div>

        {/* CTA End Card pieces */}
        <div ref={el => { pieceRefs.current['reel-cta-end-button'] = el }} style={{ background: C.red500, padding: '8px 24px', borderRadius: 8, display: 'inline-block', boxShadow: '0 4px 20px rgba(220,38,38,0.35)', height: 36 }} />
        <div ref={el => { pieceRefs.current['reel-cta-end-pattern'] = el }} style={{ width: 300, height: 200, position: 'relative' }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="cta-pattern-dl" patternUnits="userSpaceOnUse" width="40" height="40">
                <rect width="40" height="40" fill="none" stroke={C.navy400} strokeWidth="0.5" opacity="0.06" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cta-pattern-dl)" />
          </svg>
        </div>
        <div ref={el => { pieceRefs.current['reel-cta-end-full'] = el }} style={{ width: 300, height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ background: C.red500, padding: '8px 24px', borderRadius: 8, display: 'inline-block', boxShadow: '0 4px 20px rgba(220,38,38,0.35)', height: 36 }} />
        </div>

        {/* === POST PIECES === */}

        {/* Project Showcase pieces */}
        <div ref={el => { pieceRefs.current['post-project-showcase-navy-bar'] = el }} style={{ width: 300, height: 80, background: C.navy900, borderTop: `3px solid ${C.red500}` }} />
        <div ref={el => { pieceRefs.current['post-project-showcase-red-border'] = el }} style={{ width: 300, height: 3, background: C.red500 }} />
        <div ref={el => { pieceRefs.current['post-project-showcase-full'] = el }} style={{ width: 300, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 120, background: C.navy700 }} />
          <div style={{ borderTop: `3px solid ${C.red500}`, padding: '14px 16px', background: C.navy900 }} />
        </div>

        {/* Before/After Split pieces */}
        <div ref={el => { pieceRefs.current['post-before-after-divider'] = el }} style={{ width: 3, height: 200, background: C.red500 }} />
        <div ref={el => { pieceRefs.current['post-before-after-labels'] = el }} style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: 'rgba(10,14,42,0.80)', padding: '4px 10px', borderRadius: '0 4px 4px 0' }} />
          <div style={{ background: 'rgba(10,14,42,0.80)', padding: '4px 10px', borderRadius: '0 4px 4px 0', borderBottom: `2px solid ${C.red500}` }} />
        </div>
        <div ref={el => { pieceRefs.current['post-before-after-bottom-bar'] = el }} style={{ width: 300, padding: '10px 16px', background: C.navy900 }} />
        <div ref={el => { pieceRefs.current['post-before-after-full'] = el }} style={{ width: 300, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', minHeight: 100 }}>
            <div style={{ flex: 1, background: C.navy800 }} />
            <div style={{ width: 3, background: C.red500 }} />
            <div style={{ flex: 1, background: C.navy700 }} />
          </div>
          <div style={{ padding: '10px 16px', background: C.navy900 }} />
        </div>

        {/* Stat Highlight pieces */}
        <div ref={el => { pieceRefs.current['post-stat-highlight-accent-line'] = el }} style={{ width: 48, height: 2, background: C.red500 }} />
        <div ref={el => { pieceRefs.current['post-stat-highlight-pattern'] = el }} style={{ width: 300, height: 200, position: 'relative' }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="stat-crosshatch-dl" patternUnits="userSpaceOnUse" width="16" height="16">
                <line x1="0" y1="0" x2="16" y2="16" stroke={C.gray300} strokeWidth="0.75" opacity="0.12" />
                <line x1="16" y1="0" x2="0" y2="16" stroke={C.gray300} strokeWidth="0.75" opacity="0.12" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#stat-crosshatch-dl)" />
          </svg>
        </div>
        <div ref={el => { pieceRefs.current['post-stat-highlight-full'] = el }} style={{ width: 300, height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.03 }}>
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="stat-xh-dl-full" patternUnits="userSpaceOnUse" width="16" height="16">
                  <line x1="0" y1="0" x2="16" y2="16" stroke={C.gray300} strokeWidth="0.75" />
                  <line x1="16" y1="0" x2="0" y2="16" stroke={C.gray300} strokeWidth="0.75" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#stat-xh-dl-full)" />
            </svg>
          </div>
          <div style={{ width: 48, height: 2, background: C.red500, position: 'relative', zIndex: 1 }} />
        </div>

        {/* Tip/Educational pieces */}
        <div ref={el => { pieceRefs.current['post-tip-educational-red-divider'] = el }} style={{ width: 24, height: 2, background: C.red500 }} />
        <div ref={el => { pieceRefs.current['post-tip-educational-number-watermarks'] = el }} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[1,2,3].map(n => (
            <div key={n} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 12, color: C.red500 }}>{n}.</span>
            </div>
          ))}
        </div>
        <div ref={el => { pieceRefs.current['post-tip-educational-full'] = el }} style={{ width: 280, padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 24, height: 2, background: C.red500, marginTop: 6 }} />
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[1,2,3].map(n => (
              <div key={n} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 12, color: C.red500 }}>{n}.</span>
              </div>
            ))}
          </div>
        </div>

        {/* Crew Spotlight pieces */}
        <div ref={el => { pieceRefs.current['post-crew-spotlight-gradient'] = el }} style={{ width: 300, height: 200, background: `linear-gradient(to bottom, ${C.navy700} 40%, rgba(10,14,42,0.95) 75%)` }} />
        <div ref={el => { pieceRefs.current['post-crew-spotlight-full'] = el }} style={{ width: 300, height: 200, background: `linear-gradient(to bottom, ${C.navy700} 40%, rgba(10,14,42,0.95) 75%)` }} />

        {/* Service Highlight pieces */}
        <div ref={el => { pieceRefs.current['post-service-highlight-accent-line'] = el }} style={{ height: 3, width: 300, background: C.red500 }} />
        <div ref={el => { pieceRefs.current['post-service-highlight-button'] = el }} style={{ background: C.red500, padding: '6px 16px', borderRadius: 6, display: 'inline-block', width: 140, height: 28 }} />
        <div ref={el => { pieceRefs.current['post-service-highlight-full'] = el }} style={{ width: 300, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, background: C.navy800, minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(220,38,38,0.1)' }} />
          </div>
          <div style={{ height: 3, background: C.red500 }} />
          <div style={{ padding: '14px 16px', background: C.navy900, minHeight: 60 }}>
            <div style={{ background: C.red500, padding: '6px 16px', borderRadius: 6, display: 'inline-block', marginTop: 8, width: 140, height: 28 }} />
          </div>
        </div>

        {/* === COVER PIECES === */}

        {/* Project Walkthrough pieces */}
        <div ref={el => { pieceRefs.current['cover-walkthrough-gradient'] = el }} style={{ width: 300, height: 300, background: `linear-gradient(to bottom, ${C.navy700} 0%, transparent 50%, rgba(10,14,42,0.95) 80%)` }} />
        <div ref={el => { pieceRefs.current['cover-walkthrough-progress-bar'] = el }} style={{ width: 120, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', position: 'relative' }}>
          <div style={{ width: '40%', height: '100%', borderRadius: 2, background: C.red500 }} />
        </div>
        <div ref={el => { pieceRefs.current['cover-walkthrough-full'] = el }} style={{ width: 300, height: 300, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${C.navy700} 0%, transparent 50%, rgba(10,14,42,0.95) 80%)` }} />
          <div style={{ position: 'absolute', bottom: 24, left: 24 }}>
            <div style={{ width: 120, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', position: 'relative' }}>
              <div style={{ width: '40%', height: '100%', borderRadius: 2, background: C.red500 }} />
            </div>
          </div>
        </div>

        {/* Day in the Life pieces */}
        <div ref={el => { pieceRefs.current['cover-day-life-gradient'] = el }} style={{ width: 300, height: 300, background: `linear-gradient(to bottom, ${C.navy700} 0%, transparent 45%, rgba(10,14,42,0.92) 75%)` }} />
        <div ref={el => { pieceRefs.current['cover-day-life-full'] = el }} style={{ width: 300, height: 300, background: `linear-gradient(to bottom, ${C.navy700} 0%, transparent 45%, rgba(10,14,42,0.92) 75%)` }} />

        {/* Service Explainer pieces */}
        <div ref={el => { pieceRefs.current['cover-explainer-gradient'] = el }} style={{ width: 300, height: 300, background: `linear-gradient(to bottom, ${C.navy800} 0%, transparent 50%, rgba(10,14,42,0.95) 80%)` }} />
        <div ref={el => { pieceRefs.current['cover-explainer-watch'] = el }} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.red500} strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
        </div>
        <div ref={el => { pieceRefs.current['cover-explainer-full'] = el }} style={{ width: 300, height: 300, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${C.navy800} 0%, transparent 50%, rgba(10,14,42,0.95) 80%)` }} />
          <div style={{ position: 'absolute', bottom: 24, left: 24, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.red500} strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
          </div>
        </div>

        {/* Emergency Callout pieces */}
        <div ref={el => { pieceRefs.current['cover-emergency-red-flash'] = el }} style={{ width: 300, height: 300, background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.12) 0%, transparent 70%)' }} />
        <div ref={el => { pieceRefs.current['cover-emergency-button'] = el }} style={{ background: C.red500, padding: '8px 20px', borderRadius: 8, display: 'inline-block', boxShadow: '0 4px 20px rgba(220,38,38,0.4)', height: 36 }} />
        <div ref={el => { pieceRefs.current['cover-emergency-pulse-ring'] = el }} style={{ width: 60, height: 60, borderRadius: '50%', border: `2px solid rgba(220,38,38,0.3)`, boxShadow: '0 0 20px rgba(220,38,38,0.15)' }} />
        <div ref={el => { pieceRefs.current['cover-emergency-full'] = el }} style={{ width: 300, height: 300, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.12) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)' }}>
            <div style={{ background: C.red500, padding: '8px 20px', borderRadius: 8, display: 'inline-block', boxShadow: '0 4px 20px rgba(220,38,38,0.4)', height: 36 }} />
          </div>
        </div>

      </div>

      {/* Quick Navigation Bar */}
      {showNav && <QuickNav activeSection={activeSection} />}

      {/* ============================================================ */}
      {/*  HERO / COVER                                                 */}
      {/* ============================================================ */}
      <section id="hero-section" style={{
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
      <DarkSection style={{ scrollMarginTop: 52 }} id="section-logo">
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

          {/* Logo download */}
          <div style={{ marginTop: 48 }}>
            <h3 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.white, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 20 }}>Download Logo Assets</h3>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              padding: 32,
              borderRadius: 12,
              background: C.navy800,
              border: `1px solid ${C.navyBorder}`,
              alignItems: 'center',
            }}>
              <a
                href="/ambition-logo.png"
                download="ambition-mechanical-logo.png"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  fontFamily: F.display,
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: C.red500,
                  color: C.white,
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'background 200ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.red400}
                onMouseLeave={e => e.currentTarget.style.background = C.red500}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download PNG
              </a>
              <span style={{ fontFamily: F.body, fontSize: 13, color: C.gray400 }}>
                Primary logo file. Use on dark, light, or navy backgrounds.
              </span>
            </div>
          </div>
        </MaxWidth>
      </DarkSection>

      <PatternStrip variant="navy" height={3} />

      {/* ============================================================ */}
      {/*  02. COLOR SYSTEM                                             */}
      {/* ============================================================ */}
      <LightSection id="section-colors" style={{ scrollMarginTop: 52 }}>
        <MaxWidth>
          <SectionHeader num={2} title="Color System" subtitle="Extracted from the OG logo and expanded into a full web-ready system. Navy anchors. Red energizes. White breathes. Colors are spot on. Do not change them." />

          {/* Primary Navy */}
          <div ref={colorPaletteRef} style={{ background: C.white, padding: 0 }}>
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
          </div>{/* close colorPaletteRef */}

          {/* Download color palette button */}
          <div style={{ marginTop: 16, marginBottom: 0 }}>
            <DownloadButton targetRef={colorPaletteRef} filename="amb-color-palette-v1.png" label="Download Color Palette" small />
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
      <DarkSection id="section-type" style={{ scrollMarginTop: 52 }}>
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
      <OffWhiteSection id="section-spacing" style={{ scrollMarginTop: 52 }}>
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
      <DarkSection id="section-patterns" style={{ scrollMarginTop: 52 }}>
        <MaxWidth>
          <SectionHeader num={5} title="Industrial Patterns" subtitle="Construction-grade textures. Blueprint grids, ductwork motifs, pipe runs, hex bolts. Used as subtle background overlays on dark sections (3-8% opacity). Built for the trades." dark />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 24,
            marginBottom: 48,
          }}>
            {[
              { name: 'Blueprint Grid', slug: 'blueprint-grid', desc: 'Engineering drawing grid. Dark sections, hero backgrounds. 3-5% opacity.', component: <PatternBlueprintGrid size={180} /> },
              { name: 'Ductwork', slug: 'ductwork', desc: 'HVAC duct cross-sections. CTA bands, stats sections. 3-5% opacity.', component: <PatternDuctwork size={180} /> },
              { name: 'Cross Hatch', slug: 'crosshatch', desc: 'Industrial cross-hatch. Subtle texture for any dark surface. 3-5%.', component: <PatternCrossHatch size={180} /> },
              { name: 'Diagonal Lines', slug: 'diagonal-lines', desc: 'Caution-stripe feel. Red accent for dividers. 5-8% opacity.', component: <PatternDiagonalLines size={180} /> },
              { name: 'Hex Bolts', slug: 'hex-bolts', desc: 'Hardware-inspired hexagons. Equipment sections. 3-5% opacity.', component: <PatternHexBolts size={180} /> },
              { name: 'Pipe Run', slug: 'pipe-run', desc: 'Connected piping layout. About section, process flow. 3-5% opacity.', component: <PatternPipeRun size={180} /> },
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
                onMouseEnter={e => { const btn = e.currentTarget.querySelector('[data-dl-btn]'); if (btn) btn.style.opacity = '1' }}
                onMouseLeave={e => { const btn = e.currentTarget.querySelector('[data-dl-btn]'); if (btn) btn.style.opacity = '0' }}
              >
                <div ref={el => { patternRefs.current[p.slug] = el }} style={{ position: 'relative' }}>
                  {p.component}
                  <div data-dl-btn style={{ position: 'absolute', top: 8, right: 8, opacity: 0, transition: 'opacity 200ms ease', zIndex: 5 }}>
                    <button
                      onClick={async () => {
                        const el = patternRefs.current[p.slug]
                        if (!el) return
                        try {
                          await document.fonts.ready
                          const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true })
                          const link = document.createElement('a')
                          link.download = `amb-pattern-${p.slug}-v1.png`
                          link.href = dataUrl
                          link.click()
                        } catch (err) { console.error(err) }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: 6,
                        background: C.red500, color: C.white, border: 'none',
                        cursor: 'pointer', padding: 0,
                      }}
                      title={`Download ${p.name}`}
                    >
                      <Download size={12} />
                    </button>
                  </div>
                </div>
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
      <LightSection id="section-components" style={{ scrollMarginTop: 52 }}>
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
            <div
              ref={el => { componentRefs.current['card-light'] = el }}
              style={{ padding: 32, borderRadius: 12, background: C.white, border: `1px solid ${C.gray200}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'relative' }}
              onMouseEnter={e => { const btn = e.currentTarget.querySelector('[data-dl-btn]'); if (btn) btn.style.opacity = '1' }}
              onMouseLeave={e => { const btn = e.currentTarget.querySelector('[data-dl-btn]'); if (btn) btn.style.opacity = '0' }}
            >
              <div data-dl-btn style={{ position: 'absolute', top: 8, right: 8, opacity: 0, transition: 'opacity 200ms ease', zIndex: 5 }}>
                <button onClick={async () => { const el = componentRefs.current['card-light']; if (!el) return; try { await document.fonts.ready; const d = await toPng(el, { pixelRatio: 2, cacheBust: true }); const a = document.createElement('a'); a.download = 'amb-component-service-card-light-v1.png'; a.href = d; a.click() } catch(e) { console.error(e) } }} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:28,height:28,borderRadius:6,background:C.red500,color:C.white,border:'none',cursor:'pointer',padding:0 }} title="Download"><Download size={12}/></button>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: C.navy600, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <span style={{ color: C.white, fontSize: 20 }}>*</span>
              </div>
              <p style={{ fontFamily: F.display, fontWeight: 600, fontSize: 20, letterSpacing: '0.02em', color: C.navy600, textTransform: 'uppercase' }}>HVAC Installation</p>
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray500, lineHeight: 1.6, marginTop: 8 }}>Commercial and industrial HVAC systems installed to spec, on schedule, without surprises.</p>
              <p style={{ fontSize: 10, color: C.gray400, marginTop: 12, fontFamily: F.display, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Light variant / p-8 / rounded-xl / border-neutral-200</p>
            </div>
            {/* Dark card */}
            <div
              ref={el => { componentRefs.current['card-dark'] = el }}
              style={{ padding: 32, borderRadius: 12, background: C.navy800, border: `1px solid ${C.navyBorder}`, position: 'relative' }}
              onMouseEnter={e => { const btn = e.currentTarget.querySelector('[data-dl-btn]'); if (btn) btn.style.opacity = '1' }}
              onMouseLeave={e => { const btn = e.currentTarget.querySelector('[data-dl-btn]'); if (btn) btn.style.opacity = '0' }}
            >
              <div data-dl-btn style={{ position: 'absolute', top: 8, right: 8, opacity: 0, transition: 'opacity 200ms ease', zIndex: 5 }}>
                <button onClick={async () => { const el = componentRefs.current['card-dark']; if (!el) return; try { await document.fonts.ready; const d = await toPng(el, { pixelRatio: 2, cacheBust: true }); const a = document.createElement('a'); a.download = 'amb-component-service-card-dark-v1.png'; a.href = d; a.click() } catch(e) { console.error(e) } }} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:28,height:28,borderRadius:6,background:C.red500,color:C.white,border:'none',cursor:'pointer',padding:0 }} title="Download"><Download size={12}/></button>
              </div>
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
      <DarkSection id="section-layout" style={{ scrollMarginTop: 52 }}>
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
      <OffWhiteSection id="section-photo" style={{ scrollMarginTop: 52 }}>
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
      <LightSection id="section-voice" style={{ scrollMarginTop: 52 }}>
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
      <DarkSection id="section-tailwind" style={{ scrollMarginTop: 52 }}>
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

      <PatternStrip variant="navy" height={3} />

      {/* ============================================================ */}
      {/*  11. SOCIAL MEDIA TEMPLATES                                    */}
      {/* ============================================================ */}
      <LightSection id="section-social" style={{ scrollMarginTop: 52 }}>
        <MaxWidth>
          <SectionHeader num={11} title="Social Media Templates" subtitle="Steffen's template system for video overlays, reels, static posts, and story covers. Every template uses the Ambition v3 brand system. Navy + Red + White. Barlow Condensed + Inter. Zero deviations." />

          {/* Category 1: Video Walkthrough Overlays */}
          <div style={{ marginBottom: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase' }}>Video Walkthrough Overlays</span>
              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.white, background: C.navy600, padding: '4px 12px', borderRadius: 4 }}>6 Templates</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 260px))', gap: 20 }}>
              {[
                { name: 'Lower Third', slug: 'lower-third', specs: '480x~80px', exportDims: '1080x1920', desc: 'Name + title card over talking-head footage. Navy panel with red left accent bar.', pieces: [
                  { refKey: 'overlay-lower-third-accent-bar', filename: 'amb-overlay-lower-third-accent-bar-v1.png', label: 'Accent Bar' },
                  { refKey: 'overlay-lower-third-panel', filename: 'amb-overlay-lower-third-panel-v1.png', label: 'Panel' },
                  { refKey: 'overlay-lower-third-full', filename: 'amb-overlay-lower-third-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Location Bar', slug: 'location-bar', specs: 'Full width x 56px', exportDims: '1080x1920', desc: 'Establishing shot overlay. Pin icon + location name left, project name right.', pieces: [
                  { refKey: 'overlay-location-bar-bar', filename: 'amb-overlay-location-bar-bar-v1.png', label: 'Bar Shape' },
                  { refKey: 'overlay-location-bar-pin', filename: 'amb-overlay-location-bar-pin-v1.png', label: 'Pin Icon' },
                  { refKey: 'overlay-location-bar-full', filename: 'amb-overlay-location-bar-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Before/After Labels', slug: 'before-after', specs: '120x40px per label', exportDims: '1080x1920', desc: 'Split-screen labels. Gray accent for BEFORE, red accent for AFTER.', pieces: [
                  { refKey: 'overlay-before-after-before', filename: 'amb-overlay-before-after-before-panel-v1.png', label: 'Before Panel' },
                  { refKey: 'overlay-before-after-after', filename: 'amb-overlay-before-after-after-panel-v1.png', label: 'After Panel' },
                  { refKey: 'overlay-before-after-divider', filename: 'amb-overlay-before-after-divider-v1.png', label: 'Divider Line' },
                  { refKey: 'overlay-before-after-full', filename: 'amb-overlay-before-after-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Progress Indicator', slug: 'progress', specs: 'Auto x 44px', exportDims: '1080x1920', desc: 'Top-right corner badge showing DAY/WEEK stage with red underline.', pieces: [
                  { refKey: 'overlay-progress-panel', filename: 'amb-overlay-progress-panel-v1.png', label: 'Panel Shape' },
                  { refKey: 'overlay-progress-underline', filename: 'amb-overlay-progress-underline-v1.png', label: 'Red Underline' },
                  { refKey: 'overlay-progress-full', filename: 'amb-overlay-progress-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Equipment Callout', slug: 'equipment-callout', specs: 'Auto x 36px', exportDims: '1080x1920', desc: 'Connected label pointing at equipment. Red dot anchor, navy panel.', pieces: [
                  { refKey: 'overlay-equipment-callout-panel', filename: 'amb-overlay-equipment-callout-panel-v1.png', label: 'Panel Shape' },
                  { refKey: 'overlay-equipment-callout-connector', filename: 'amb-overlay-equipment-callout-connector-v1.png', label: 'Connector + Dot' },
                  { refKey: 'overlay-equipment-callout-full', filename: 'amb-overlay-equipment-callout-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'ROC Watermark', slug: 'roc-watermark', specs: 'Text only', exportDims: '1080x1920', desc: 'Subtle ROC #320923 text. 35% white opacity. Bottom-right on all project footage.', pieces: [
                  { refKey: 'overlay-roc-watermark-backdrop', filename: 'amb-overlay-roc-watermark-backdrop-v1.png', label: 'Shadow Backdrop' },
                ] },
              ].map((tpl, i) => (
                <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.gray200}` }}>
                  {/* Mini visual mock */}
                  <div ref={el => { templateRefs.current[`overlay-${tpl.slug}`] = el }} style={{
                    background: C.navy900,
                    padding: 24,
                    aspectRatio: '9/16',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'flex-start',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Background pattern */}
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.04 }}>
                      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id={`overlay-grid-${i}`} patternUnits="userSpaceOnUse" width="40" height="40">
                            <rect width="40" height="40" fill="none" stroke={C.navy400} strokeWidth="0.5" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#overlay-grid-${i})`} />
                      </svg>
                    </div>
                    {/* Mock overlay element */}
                    {i === 0 && (
                      <div style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
                        <div style={{ width: 4, background: C.red500, borderRadius: '2px 0 0 2px' }} />
                        <div style={{ background: 'rgba(10, 14, 42, 0.85)', padding: '12px 16px', borderRadius: '0 4px 4px 0' }}>
                          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, color: C.white, textTransform: 'uppercase', letterSpacing: '0.03em' }}>MIKE JOHNSON</div>
                          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gray300 }}>Lead Technician</div>
                        </div>
                      </div>
                    )}
                    {i === 1 && (
                      <div style={{ width: '100%', background: 'rgba(10, 14, 42, 0.70)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={C.red500} stroke="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                          <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 11, color: C.white, textTransform: 'uppercase', letterSpacing: '0.08em' }}>SCOTTSDALE</span>
                        </div>
                        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 12, color: C.white, textTransform: 'uppercase', letterSpacing: '0.03em' }}>DIN TAI FUNG</span>
                      </div>
                    )}
                    {i === 2 && (
                      <div style={{ display: 'flex', gap: 12, position: 'relative', zIndex: 1 }}>
                        <div style={{ background: 'rgba(10, 14, 42, 0.85)', padding: '6px 16px', borderBottom: `2px solid ${C.gray400}` }}>
                          <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 12, color: C.white, textTransform: 'uppercase', letterSpacing: '0.04em' }}>BEFORE</span>
                        </div>
                        <div style={{ background: 'rgba(10, 14, 42, 0.85)', padding: '6px 16px', borderBottom: `2px solid ${C.red500}` }}>
                          <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 12, color: C.white, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AFTER</span>
                        </div>
                      </div>
                    )}
                    {i === 3 && (
                      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>
                        <div style={{ background: 'rgba(10, 14, 42, 0.85)', padding: '8px 14px', borderRadius: 8, textAlign: 'center' }}>
                          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, color: C.white, textTransform: 'uppercase', letterSpacing: '0.03em' }}>DAY 1</div>
                          <div style={{ width: '60%', height: 2, background: C.red500, margin: '4px auto 0' }} />
                        </div>
                      </div>
                    )}
                    {i === 4 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative', zIndex: 1 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.red500 }} />
                        <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.40)' }} />
                        <div style={{ background: 'rgba(10, 14, 42, 0.85)', padding: '6px 12px', borderRadius: 4 }}>
                          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 11, color: C.white, textTransform: 'uppercase', letterSpacing: '0.08em' }}>VRV SYSTEM</div>
                          <div style={{ fontFamily: F.body, fontSize: 9, color: C.gray300 }}>Daikin 3-pipe, 200k BTU</div>
                        </div>
                      </div>
                    )}
                    {i === 5 && (
                      <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 1 }}>
                        <span style={{ fontFamily: F.body, fontWeight: 500, fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>ROC #320923</span>
                      </div>
                    )}
                  </div>
                  {/* Card info */}
                  <div style={{ padding: '16px 20px', background: C.white }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 13, letterSpacing: '0.04em', color: C.navy600, textTransform: 'uppercase' }}>{tpl.name}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: C.white, background: C.navy600, padding: '2px 8px', borderRadius: 4 }}>{tpl.exportDims} 9:16</span>
                    </div>
                    <p style={{ fontFamily: F.body, fontSize: 12, color: C.gray500, lineHeight: 1.5, marginTop: 6 }}>{tpl.desc}</p>
                    <AssetRow pieces={tpl.pieces} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category 2: Text Overlays for Reels */}
          <div style={{ marginBottom: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase' }}>Text Overlays for Reels</span>
              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.white, background: C.red500, padding: '4px 12px', borderRadius: 4 }}>5 Templates</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 260px))', gap: 20 }}>
              {[
                { name: 'Hook Text', slug: 'hook-text', specs: '1080x1920 (9:16)', exportDims: '1080x1920', desc: 'First 1-3 seconds. Large Barlow Condensed text centered. Stops the scroll.', pieces: [
                  { refKey: 'reel-hook-text-gradient', filename: 'amb-reel-hook-text-gradient-v1.png', label: 'Overlay Gradient' },
                  { refKey: 'reel-hook-text-full', filename: 'amb-reel-hook-text-full-v1.png', label: 'Full Frame' },
                ] },
                { name: 'Fact/Stat Callout', slug: 'stat-callout', specs: '1080x1920 (9:16)', exportDims: '1080x1920', desc: 'Big number with kicker above and supporting line below. Odometer animation.', pieces: [
                  { refKey: 'reel-stat-callout-accent-line', filename: 'amb-reel-stat-callout-accent-line-v1.png', label: 'Accent Line' },
                  { refKey: 'reel-stat-callout-kicker-bar', filename: 'amb-reel-stat-callout-kicker-bar-v1.png', label: 'Kicker Bar' },
                  { refKey: 'reel-stat-callout-full', filename: 'amb-reel-stat-callout-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Step Counter', slug: 'step-counter', specs: '1080x1920 (9:16)', exportDims: '1080x1920', desc: 'Progress dots + step label + headline. For how-to and process content.', pieces: [
                  { refKey: 'reel-step-counter-dots', filename: 'amb-reel-step-counter-dots-v1.png', label: 'Progress Dots' },
                  { refKey: 'reel-step-counter-gradient', filename: 'amb-reel-step-counter-gradient-v1.png', label: 'Gradient Overlay' },
                  { refKey: 'reel-step-counter-full', filename: 'amb-reel-step-counter-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Quote/Testimonial', slug: 'quote', specs: '1080x1920 (9:16)', exportDims: '1080x1920', desc: 'Glass panel with red left accent. Quote text with attribution below.', pieces: [
                  { refKey: 'reel-quote-glass-panel', filename: 'amb-reel-quote-glass-panel-v1.png', label: 'Glass Panel' },
                  { refKey: 'reel-quote-accent-bar', filename: 'amb-reel-quote-accent-bar-v1.png', label: 'Accent Bar' },
                  { refKey: 'reel-quote-quote-mark', filename: 'amb-reel-quote-quote-mark-v1.png', label: 'Quote Mark' },
                  { refKey: 'reel-quote-full', filename: 'amb-reel-quote-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'CTA End Card', slug: 'cta-end', specs: '1080x1920 (9:16)', exportDims: '1080x1920', desc: 'Final frame. Logo, tagline, red CTA button, phone number, website, ROC.', pieces: [
                  { refKey: 'reel-cta-end-button', filename: 'amb-reel-cta-end-button-v1.png', label: 'Button Shape' },
                  { refKey: 'reel-cta-end-pattern', filename: 'amb-reel-cta-end-pattern-v1.png', label: 'Pattern BG' },
                  { refKey: 'reel-cta-end-full', filename: 'amb-reel-cta-end-full-v1.png', label: 'Full Layout' },
                ] },
              ].map((tpl, i) => (
                <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.gray200}` }}>
                  {/* Mini visual mock - vertical aspect hint */}
                  <div ref={el => { templateRefs.current[`reel-${tpl.slug}`] = el }} style={{
                    background: C.navy900,
                    padding: 24,
                    aspectRatio: '9/16',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {i === 0 && (
                      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 14, 42, 0.40)' }} />
                        <p style={{ fontFamily: F.display, fontWeight: 800, fontSize: 28, color: C.white, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.0, margin: 0, position: 'relative', zIndex: 1, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
                          THIS CHILLER<br />SERVES <span style={{ color: C.red500 }}>200,000</span><br />SQ FT
                        </p>
                      </div>
                    )}
                    {i === 1 && (
                      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.red500, textTransform: 'uppercase' }}>COMPLETED PROJECTS</div>
                        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 48, color: C.white, letterSpacing: '0.02em', lineHeight: 1.1 }}>500+</div>
                        <div style={{ fontFamily: F.body, fontSize: 12, color: C.gray300 }}>Since 2002 in the Valley</div>
                      </div>
                    )}
                    {i === 2 && (
                      <div style={{ alignSelf: 'flex-start', position: 'relative', zIndex: 1 }}>
                        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.15em', color: C.red500, textTransform: 'uppercase' }}>STEP 1 OF 5</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          {[0,1,2,3,4].map(d => (
                            <div key={d} style={{ width: 8, height: 8, borderRadius: '50%', background: d === 0 ? C.red500 : 'transparent', border: d === 0 ? 'none' : '1px solid rgba(255,255,255,0.25)', boxShadow: d === 0 ? '0 0 8px rgba(220,38,38,0.5)' : 'none' }} />
                          ))}
                        </div>
                        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, color: C.white, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 10 }}>DIAGNOSE THE<br />COMPRESSOR</div>
                      </div>
                    )}
                    {i === 3 && (
                      <div style={{ background: 'rgba(10, 14, 42, 0.60)', backdropFilter: 'blur(12px)', padding: '16px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${C.red500}`, position: 'relative', zIndex: 1, maxWidth: '90%' }}>
                        <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 28, color: 'rgba(220,38,38,0.30)', position: 'absolute', top: -4, left: 12 }}>"</span>
                        <p style={{ fontFamily: F.body, fontWeight: 500, fontSize: 12, color: C.white, fontStyle: 'italic', lineHeight: 1.5, margin: '8px 0 8px 0' }}>They were on-site before sunrise.</p>
                        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 9, color: C.white, textTransform: 'uppercase', letterSpacing: '0.08em' }}>FACILITY MANAGER</div>
                        <div style={{ fontFamily: F.body, fontSize: 9, color: C.gray300 }}>Abraza Senior Living</div>
                      </div>
                    )}
                    {i === 4 && (
                      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                        <img src="/ambition-logo.png" alt="Logo" style={{ width: 60, height: 'auto', marginBottom: 8, opacity: 0.9 }} />
                        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, color: C.white, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 10 }}>COMMERCIAL HVAC<br />YOU CAN COUNT ON</div>
                        <div style={{ background: C.red500, padding: '8px 24px', borderRadius: 8, display: 'inline-block', boxShadow: '0 4px 20px rgba(220,38,38,0.35)' }}>
                          <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 11, color: C.white, textTransform: 'uppercase', letterSpacing: '0.06em' }}>CALL (480) 600-2942</span>
                        </div>
                        <div style={{ fontFamily: F.body, fontSize: 10, color: C.gray300, marginTop: 8 }}>ambitionac.com</div>
                        <div style={{ fontFamily: F.body, fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>ROC #320923</div>
                      </div>
                    )}
                  </div>
                  {/* Card info */}
                  <div style={{ padding: '16px 20px', background: C.white }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 13, letterSpacing: '0.04em', color: C.navy600, textTransform: 'uppercase' }}>{tpl.name}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: C.white, background: C.red500, padding: '2px 8px', borderRadius: 4 }}>{tpl.exportDims} 9:16</span>
                    </div>
                    <p style={{ fontFamily: F.body, fontSize: 12, color: C.gray500, lineHeight: 1.5, marginTop: 6 }}>{tpl.desc}</p>
                    <AssetRow pieces={tpl.pieces} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category 3: Static Social Posts */}
          <div style={{ marginBottom: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase' }}>Static Social Posts</span>
              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.white, background: C.navy600, padding: '4px 12px', borderRadius: 4 }}>6 Templates</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {[
                { name: 'Project Showcase', slug: 'project-showcase', specs: '1080x1080 (1:1)', exportDims: '1080x1080', ratio: '1:1', desc: 'Hero photo top 60%, navy bar bottom 40%. Red top border, kicker + project name + location.', pieces: [
                  { refKey: 'post-project-showcase-navy-bar', filename: 'amb-post-project-showcase-navy-bar-v1.png', label: 'Navy Bar' },
                  { refKey: 'post-project-showcase-red-border', filename: 'amb-post-project-showcase-red-border-v1.png', label: 'Red Top Border' },
                  { refKey: 'post-project-showcase-full', filename: 'amb-post-project-showcase-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Before/After Split', slug: 'before-after', specs: '1080x1080 (1:1)', exportDims: '1080x1080', ratio: '1:1', desc: 'Side-by-side photos with 3px red divider. Navy bottom bar with project name and logo.', pieces: [
                  { refKey: 'post-before-after-divider', filename: 'amb-post-before-after-divider-v1.png', label: 'Divider Line' },
                  { refKey: 'post-before-after-labels', filename: 'amb-post-before-after-labels-v1.png', label: 'Label Panels' },
                  { refKey: 'post-before-after-bottom-bar', filename: 'amb-post-before-after-bottom-bar-v1.png', label: 'Bottom Bar' },
                  { refKey: 'post-before-after-full', filename: 'amb-post-before-after-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Stat Highlight', slug: 'stat-highlight', specs: '1080x1080 (1:1)', exportDims: '1080x1080', ratio: '1:1', desc: 'Big number centered on navy. Kicker, stat, supporting text, red accent line, website.', pieces: [
                  { refKey: 'post-stat-highlight-accent-line', filename: 'amb-post-stat-highlight-accent-line-v1.png', label: 'Accent Line' },
                  { refKey: 'post-stat-highlight-pattern', filename: 'amb-post-stat-highlight-pattern-v1.png', label: 'Pattern BG' },
                  { refKey: 'post-stat-highlight-full', filename: 'amb-post-stat-highlight-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Tip/Educational', slug: 'tip-educational', specs: '1080x1080 (1:1)', exportDims: '1080x1080', ratio: '1:1', desc: 'Navy background. Red kicker, headline, numbered list. Educational content format.', pieces: [
                  { refKey: 'post-tip-educational-red-divider', filename: 'amb-post-tip-educational-red-divider-v1.png', label: 'Red Divider' },
                  { refKey: 'post-tip-educational-number-watermarks', filename: 'amb-post-tip-educational-numbers-v1.png', label: 'Number Watermarks' },
                  { refKey: 'post-tip-educational-full', filename: 'amb-post-tip-educational-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Crew Spotlight', slug: 'crew-spotlight', specs: '1080x1080 (1:1)', exportDims: '1080x1080', ratio: '1:1', desc: 'Full bleed crew photo with gradient overlay. Kicker + headline at bottom.', pieces: [
                  { refKey: 'post-crew-spotlight-gradient', filename: 'amb-post-crew-spotlight-gradient-v1.png', label: 'Gradient Overlay' },
                  { refKey: 'post-crew-spotlight-full', filename: 'amb-post-crew-spotlight-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Service Highlight', slug: 'service-highlight', specs: '1080x1080 (1:1)', exportDims: '1080x1080', ratio: '1:1', desc: 'Photo/icon top, navy bottom. Service name, description, red CTA button.', pieces: [
                  { refKey: 'post-service-highlight-accent-line', filename: 'amb-post-service-highlight-accent-line-v1.png', label: 'Red Accent Line' },
                  { refKey: 'post-service-highlight-button', filename: 'amb-post-service-highlight-button-v1.png', label: 'Button Shape' },
                  { refKey: 'post-service-highlight-full', filename: 'amb-post-service-highlight-full-v1.png', label: 'Full Layout' },
                ] },
              ].map((tpl, i) => (
                <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.gray200}` }}>
                  {/* Mini visual mock - square aspect hint */}
                  <div ref={el => { templateRefs.current[`post-${tpl.slug}`] = el }} style={{
                    background: C.navy900,
                    aspectRatio: '1/1',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {i === 0 && (
                      <>
                        <div style={{ flex: 1, background: C.navy700, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>PROJECT PHOTO</span>
                        </div>
                        <div style={{ borderTop: `3px solid ${C.red500}`, padding: '14px 16px', background: C.navy900 }}>
                          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 9, letterSpacing: '0.2em', color: C.red500, textTransform: 'uppercase' }}>COMMERCIAL HVAC</div>
                          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: C.white, textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: 2 }}>DIN TAI FUNG</div>
                          <div style={{ fontFamily: F.body, fontSize: 10, color: C.gray300, marginTop: 2 }}>Scottsdale Fashion Square</div>
                        </div>
                      </>
                    )}
                    {i === 1 && (
                      <>
                        <div style={{ flex: 1, display: 'flex', minHeight: 100 }}>
                          <div style={{ flex: 1, background: C.navy800, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 8, position: 'relative' }}>
                            <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(10,14,42,0.80)', padding: '4px 10px', borderRadius: '0 4px 4px 0' }}>
                              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 9, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>BEFORE</span>
                            </div>
                          </div>
                          <div style={{ width: 3, background: C.red500 }} />
                          <div style={{ flex: 1, background: C.navy700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 8, position: 'relative' }}>
                            <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(10,14,42,0.80)', padding: '4px 10px', borderRadius: '0 4px 4px 0', borderBottom: `2px solid ${C.red500}` }}>
                              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 9, color: C.white, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AFTER</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ padding: '10px 16px', background: C.navy900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 12, color: C.white, textTransform: 'uppercase' }}>CHILLER REPLACEMENT</span>
                          <img src="/ambition-logo.png" alt="" style={{ height: 18, opacity: 0.7 }} />
                        </div>
                      </>
                    )}
                    {i === 2 && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.03 }}>
                          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <pattern id="stat-crosshatch" patternUnits="userSpaceOnUse" width="16" height="16">
                                <line x1="0" y1="0" x2="16" y2="16" stroke={C.gray300} strokeWidth="0.75" />
                                <line x1="16" y1="0" x2="0" y2="16" stroke={C.gray300} strokeWidth="0.75" />
                              </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#stat-crosshatch)" />
                          </svg>
                        </div>
                        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.red500, textTransform: 'uppercase', position: 'relative', zIndex: 1 }}>COMPLETED PROJECTS</div>
                        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 56, color: C.white, letterSpacing: '0.02em', lineHeight: 1.0, position: 'relative', zIndex: 1 }}>500+</div>
                        <div style={{ fontFamily: F.body, fontSize: 11, color: C.gray300, position: 'relative', zIndex: 1, marginTop: 4 }}>Since 2002. Every phase of commercial mechanical.</div>
                        <div style={{ width: 48, height: 2, background: C.red500, marginTop: 12, position: 'relative', zIndex: 1 }} />
                        <div style={{ fontFamily: F.body, fontSize: 10, color: C.gray400, marginTop: 8, position: 'relative', zIndex: 1 }}>ambitionac.com</div>
                      </div>
                    )}
                    {i === 3 && (
                      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 9, letterSpacing: '0.2em', color: C.red500, textTransform: 'uppercase' }}>HVAC TIP</div>
                        <div style={{ width: 24, height: 2, background: C.red500, marginTop: 6 }} />
                        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 20, color: C.white, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.05, marginTop: 10 }}>3 SIGNS YOUR<br />COMMERCIAL HVAC<br />NEEDS SERVICE</div>
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {['Inconsistent temperatures', 'Unusual rooftop noise', 'Rising energy bills'].map((tip, ti) => (
                            <div key={ti} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 12, color: C.red500 }}>{ti + 1}.</span>
                              <span style={{ fontFamily: F.body, fontSize: 11, color: C.gray300 }}>{tip}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {i === 4 && (
                      <div style={{ flex: 1, background: `linear-gradient(to bottom, ${C.navy700} 40%, rgba(10,14,42,0.95) 75%)`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 20, minHeight: 160 }}>
                        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 9, letterSpacing: '0.2em', color: C.red500, textTransform: 'uppercase' }}>MEET THE CREW</div>
                        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, color: C.white, textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: 4 }}>MEMORIAL TOWER</div>
                        <div style={{ fontFamily: F.body, fontSize: 10, color: C.gray300, marginTop: 2 }}>Project Team</div>
                      </div>
                    )}
                    {i === 5 && (
                      <>
                        <div style={{ flex: 1, background: C.navy800, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 60 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: C.red500, fontSize: 16 }}>*</span>
                          </div>
                        </div>
                        <div style={{ height: 3, background: C.red500 }} />
                        <div style={{ padding: '14px 16px', background: C.navy900, flex: 1 }}>
                          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: C.white, textTransform: 'uppercase', letterSpacing: '0.02em' }}>HVAC/R INSTALLATION</div>
                          <div style={{ fontFamily: F.body, fontSize: 10, color: C.gray300, lineHeight: 1.5, marginTop: 4 }}>Full commercial mechanical from preconstruction to commissioning.</div>
                          <div style={{ background: C.red500, padding: '6px 16px', borderRadius: 6, display: 'inline-block', marginTop: 8 }}>
                            <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 9, color: C.white, textTransform: 'uppercase', letterSpacing: '0.08em' }}>SCHEDULE A CONSULTATION</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Card info */}
                  <div style={{ padding: '16px 20px', background: C.white }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 13, letterSpacing: '0.04em', color: C.navy600, textTransform: 'uppercase' }}>{tpl.name}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: C.white, background: C.navy600, padding: '2px 8px', borderRadius: 4 }}>{tpl.exportDims} {tpl.ratio}</span>
                    </div>
                    <p style={{ fontFamily: F.body, fontSize: 12, color: C.gray500, lineHeight: 1.5, marginTop: 6 }}>{tpl.desc}</p>
                    <AssetRow pieces={tpl.pieces} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category 4: Story/Reel Covers */}
          <div style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, letterSpacing: '0.03em', color: C.navy600, textTransform: 'uppercase' }}>Story / Reel Covers</span>
              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.white, background: C.red500, padding: '4px 12px', borderRadius: 4 }}>4 Templates</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 260px))', gap: 20 }}>
              {[
                { name: 'Project Walkthrough', slug: 'walkthrough', specs: '1080x1920 (9:16)', exportDims: '1080x1920', desc: 'Full bleed photo with gradient. Kicker, project name, stage, optional progress bar.', pieces: [
                  { refKey: 'cover-walkthrough-gradient', filename: 'amb-cover-walkthrough-gradient-v1.png', label: 'Gradient Overlay' },
                  { refKey: 'cover-walkthrough-progress-bar', filename: 'amb-cover-walkthrough-progress-bar-v1.png', label: 'Progress Bar' },
                  { refKey: 'cover-walkthrough-full', filename: 'amb-cover-walkthrough-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Day in the Life', slug: 'day-life', specs: '1080x1920 (9:16)', exportDims: '1080x1920', desc: 'Crew/site photo. "A DAY WITH AMBITION MECHANICAL" stacked headline. Date below.', pieces: [
                  { refKey: 'cover-day-life-gradient', filename: 'amb-cover-day-life-gradient-v1.png', label: 'Gradient Overlay' },
                  { refKey: 'cover-day-life-full', filename: 'amb-cover-day-life-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Service Explainer', slug: 'explainer', specs: '1080x1920 (9:16)', exportDims: '1080x1920', desc: 'Equipment close-up. Question headline ("WHAT IS A VRV SYSTEM?") + description.', pieces: [
                  { refKey: 'cover-explainer-gradient', filename: 'amb-cover-explainer-gradient-v1.png', label: 'Gradient Overlay' },
                  { refKey: 'cover-explainer-watch', filename: 'amb-cover-explainer-watch-v1.png', label: 'Watch Indicator' },
                  { refKey: 'cover-explainer-full', filename: 'amb-cover-explainer-full-v1.png', label: 'Full Layout' },
                ] },
                { name: 'Emergency Callout', slug: 'emergency', specs: '1080x1920 (9:16)', exportDims: '1080x1920', desc: 'Navy bg with red radial glow. "EMERGENCY RESPONSE" headline, time, location, CTA.', pieces: [
                  { refKey: 'cover-emergency-red-flash', filename: 'amb-cover-emergency-red-flash-v1.png', label: 'Red Flash Gradient' },
                  { refKey: 'cover-emergency-button', filename: 'amb-cover-emergency-button-v1.png', label: 'Button Shape' },
                  { refKey: 'cover-emergency-pulse-ring', filename: 'amb-cover-emergency-pulse-ring-v1.png', label: 'Pulse Ring' },
                  { refKey: 'cover-emergency-full', filename: 'amb-cover-emergency-full-v1.png', label: 'Full Layout' },
                ] },
              ].map((tpl, i) => (
                <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.gray200}` }}>
                  {/* Mini visual mock */}
                  <div ref={el => { templateRefs.current[`cover-${tpl.slug}`] = el }} style={{
                    background: C.navy900,
                    padding: 24,
                    aspectRatio: '9/16',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {i === 0 && (
                      <>
                        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${C.navy700} 0%, transparent 50%, rgba(10,14,42,0.95) 80%)` }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.red500, textTransform: 'uppercase' }}>PROJECT UPDATE</div>
                          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, color: C.white, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 4 }}>DIN TAI FUNG</div>
                          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 14, color: C.gray300, textTransform: 'uppercase', marginTop: 2 }}>WEEK 3</div>
                          <div style={{ marginTop: 10, width: 120, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', position: 'relative' }}>
                            <div style={{ width: '40%', height: '100%', borderRadius: 2, background: C.red500 }} />
                          </div>
                        </div>
                      </>
                    )}
                    {i === 1 && (
                      <>
                        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${C.navy700} 0%, transparent 45%, rgba(10,14,42,0.92) 75%)` }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.red500, textTransform: 'uppercase' }}>A DAY WITH</div>
                          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26, color: C.white, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.0, marginTop: 4 }}>AMBITION<br />MECHANICAL</div>
                          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gray400, marginTop: 10 }}>March 12, 2026</div>
                        </div>
                      </>
                    )}
                    {i === 2 && (
                      <>
                        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${C.navy800} 0%, transparent 50%, rgba(10,14,42,0.95) 80%)` }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 20, color: C.white, textTransform: 'uppercase', letterSpacing: '0.03em' }}>WHAT IS A<br />VRV SYSTEM?</div>
                          <div style={{ fontFamily: F.body, fontSize: 11, color: C.gray300, lineHeight: 1.5, marginTop: 6, maxWidth: '90%' }}>Everything you need to know about variable refrigerant volume systems.</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.red500} strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
                            <span style={{ fontFamily: F.body, fontWeight: 500, fontSize: 9, color: C.red500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>WATCH NOW</span>
                          </div>
                        </div>
                      </>
                    )}
                    {i === 3 && (
                      <>
                        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, rgba(220,38,38,0.12) 0%, transparent 70%)` }} />
                        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', alignSelf: 'center' }}>
                          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 24, color: C.white, textTransform: 'uppercase', letterSpacing: '0.04em' }}>EMERGENCY<br />RESPONSE</div>
                          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: C.red500, marginTop: 8 }}>3:00 AM</div>
                          <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 11, color: C.gray300, marginTop: 4 }}>ABRAZA SENIOR LIVING</div>
                          <div style={{ fontFamily: F.body, fontSize: 10, color: C.gray400, marginTop: 4 }}>AC failure. Critical systems at risk.</div>
                          <div style={{ background: C.red500, padding: '8px 20px', borderRadius: 8, display: 'inline-block', marginTop: 10, boxShadow: '0 4px 20px rgba(220,38,38,0.4)' }}>
                            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 11, color: C.white, textTransform: 'uppercase' }}>(480) 600-2942</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Card info */}
                  <div style={{ padding: '16px 20px', background: C.white }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 13, letterSpacing: '0.04em', color: C.navy600, textTransform: 'uppercase' }}>{tpl.name}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: C.white, background: C.red500, padding: '2px 8px', borderRadius: 4 }}>{tpl.exportDims} 9:16</span>
                    </div>
                    <p style={{ fontFamily: F.body, fontSize: 12, color: C.gray500, lineHeight: 1.5, marginTop: 6 }}>{tpl.desc}</p>
                    <AssetRow pieces={tpl.pieces} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Template naming + guardrails */}
          <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            <div style={{ padding: 24, borderRadius: 12, background: C.offWhite, border: `1px solid ${C.gray200}` }}>
              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.gray400, textTransform: 'uppercase' }}>Template Naming Convention</span>
              <code style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, color: C.gray700, marginTop: 12, background: C.white, padding: '12px 16px', borderRadius: 8, border: `1px solid ${C.gray200}`, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{'amb-[type]-[name]-[piece]-[version].[ext]\n\namb-overlay-lower-third-accent-bar-v1.png\namb-overlay-lower-third-full-v1.png\namb-post-stat-highlight-accent-line-v1.png\namb-cover-walkthrough-gradient-v1.png'}</code>
              <p style={{ fontSize: 11, color: C.gray400, marginTop: 8 }}>Types: overlay, post, reel, cover. Pieces: individual assets with transparent backgrounds.</p>
            </div>
            <div style={{ padding: 24, borderRadius: 12, background: C.offWhite, border: `1px solid ${C.gray200}` }}>
              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: C.gray400, textTransform: 'uppercase' }}>Brand Guardrails</span>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'Navy, not black. Dark backgrounds are #0a0e2a.',
                  'Red for action only. CTAs, accents, urgency.',
                  'Barlow Condensed headlines. Inter body. No exceptions.',
                  'ALL CAPS for every headline and label.',
                  'Minimum 16px body text.',
                  '24fps video. Always.',
                  'No stock photography.',
                ].map((rule, ri) => (
                  <li key={ri} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.red500, marginTop: 5, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: C.gray500, lineHeight: 1.5 }}>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </MaxWidth>
      </LightSection>

      <PatternStrip variant="red" height={3} />

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
              Ambition Mechanical Services. Brand Guidelines v2.0
            </span>
          </div>
        </MaxWidth>
      </footer>
    </div>
  )
}
