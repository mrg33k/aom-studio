import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/* ------------------------------------------------------------------ */
/*  Valor to Victory — Brand Guidelines v1                             */
/*  Sections 1–4: Hero, Colors, Typography, Logo Usage                 */
/*  Fonts: Playfair Display (display) + Source Sans 3 (body)           */
/*  Brand: ValorC06 — Forest Green + Honor Gold                        */
/* ------------------------------------------------------------------ */

/* ================================================================== */
/*  DESIGN TOKENS                                                      */
/* ================================================================== */

const C = {
  // Green scale
  forestGreen: '#1B4332',
  deepGreen: '#2D6A4F',
  midGreen: '#40916C',
  lightGreen: '#74C69D',
  // Gold scale
  honorGold: '#C9931A',
  brightAmber: '#F4B942',
  palGold: '#F8E4A0',
  // Neutrals
  warmCream: '#F5F0E8',
  creamDark: '#EDE4D0',
  warmWhite: '#FDFAF5',
  brownDark: '#2C1810',
  // Text
  textDark: '#1A1208',
  textMid: '#3D2B1A',
  textLight: '#7A6040',
  // Borders / overlays
  greenBorder: 'rgba(27,67,50,0.20)',
  greenBorderLight: 'rgba(27,67,50,0.10)',
  creamBorder: 'rgba(237,228,208,0.8)',
  whiteBorder: 'rgba(255,255,255,0.10)',
}

const F = {
  display: "'Playfair Display', serif",
  label: "'Source Sans 3', sans-serif",
  body: "'Source Sans 3', sans-serif",
  serif2: "'Libre Baskerville', serif",
  mono: 'monospace',
}

/* ================================================================== */
/*  UTILITIES                                                          */
/* ================================================================== */

function CopyHex({ hex }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(hex); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      title="Copy hex"
    >
      <span style={{ fontFamily: F.mono, fontSize: 12, color: 'inherit' }}>{hex}</span>
      {copied ? <Check size={11} color={C.honorGold} /> : <Copy size={11} style={{ opacity: 0.35 }} />}
    </button>
  )
}

function Badge({ children, color = C.honorGold, bg = 'transparent', style: s = {} }) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: F.label,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color,
      background: bg,
      border: `1px solid ${color}`,
      borderRadius: 100,
      padding: '4px 14px',
      lineHeight: 1.4,
      ...s,
    }}>{children}</span>
  )
}

function SectionHeader({ num, title, subtitle, dark = false }) {
  const textColor = dark ? C.warmCream : C.forestGreen
  const mutedColor = dark ? 'rgba(245,240,232,0.55)' : C.textLight
  const accentColor = dark ? C.brightAmber : C.honorGold
  return (
    <div style={{ marginBottom: 48, position: 'relative' }}>
      <span style={{
        fontFamily: F.display,
        fontSize: 120,
        fontWeight: 900,
        lineHeight: 1,
        color: dark ? 'rgba(255,255,255,0.03)' : 'rgba(27,67,50,0.05)',
        position: 'absolute',
        top: -50,
        left: -10,
        userSelect: 'none',
        pointerEvents: 'none',
      }}>{String(num).padStart(2, '0')}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Badge color={accentColor} style={{ borderColor: accentColor }}>Section {String(num).padStart(2, '0')}</Badge>
      </div>
      <h2 style={{
        fontFamily: F.display,
        fontSize: 'clamp(28px, 4.5vw, 52px)',
        fontWeight: 900,
        color: textColor,
        lineHeight: 1.05,
        letterSpacing: '-0.01em',
        margin: 0,
      }}>{title}</h2>
      {subtitle && (
        <p style={{
          fontFamily: F.body,
          fontSize: 15,
          color: mutedColor,
          marginTop: 10,
          maxWidth: 580,
          lineHeight: 1.65,
        }}>{subtitle}</p>
      )}
    </div>
  )
}

function DarkSection({ children, style: s = {}, ...rest }) {
  return (
    <section style={{
      background: C.forestGreen,
      padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
      color: C.warmCream,
      ...s,
    }} {...rest}>{children}</section>
  )
}

function LightSection({ children, style: s = {}, ...rest }) {
  return (
    <section style={{
      background: C.warmWhite,
      padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
      color: C.textDark,
      ...s,
    }} {...rest}>{children}</section>
  )
}

function CreamSection({ children, style: s = {}, ...rest }) {
  return (
    <section style={{
      background: C.warmCream,
      padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
      color: C.textDark,
      ...s,
    }} {...rest}>{children}</section>
  )
}

function MaxWidth({ children, style: s = {} }) {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', ...s }}>{children}</div>
  )
}

function GoldStrip({ height = 3 }) {
  return (
    <div style={{
      width: '100%',
      height,
      background: `linear-gradient(90deg, ${C.honorGold}, ${C.brightAmber} 50%, transparent)`,
    }} />
  )
}

function GreenStrip({ height = 3 }) {
  return (
    <div style={{
      width: '100%',
      height,
      background: `linear-gradient(90deg, ${C.deepGreen}, ${C.forestGreen} 50%, transparent)`,
    }} />
  )
}

/* ================================================================== */
/*  NAV SECTIONS                                                       */
/* ================================================================== */

const NAV_SECTIONS = [
  { id: 'section-hero', num: '00', label: 'Overview' },
  { id: 'section-logo', num: '01', label: 'Logo' },
  { id: 'section-colors', num: '02', label: 'Colors' },
  { id: 'section-type', num: '03', label: 'Typography' },
]

function QuickNav({ activeSection }) {
  const navRef = useRef(null)

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 52
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

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
      background: C.forestGreen,
      borderBottom: `1px solid ${C.greenBorder}`,
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
                fontFamily: F.label,
                fontWeight: isActive ? 700 : 500,
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: isActive ? C.warmCream : 'rgba(245,240,232,0.45)',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? `2px solid ${C.brightAmber}` : '2px solid transparent',
                padding: '14px 14px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 200ms ease, border-color 200ms ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'rgba(245,240,232,0.75)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'rgba(245,240,232,0.45)' }}
            >
              <span style={{ color: isActive ? C.brightAmber : 'rgba(244,185,66,0.4)', marginRight: 4, fontSize: 9 }}>{sec.num}</span>
              {sec.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  DATA                                                               */
/* ================================================================== */

const colorGroups = {
  primary: [
    {
      name: 'Forest Green',
      hex: '#1B4332',
      role: 'Brand Primary',
      usage: 'Logo foundation, hero backgrounds, nav, footer. The anchor color. Deep, grounded, American.',
    },
    {
      name: 'Deep Green',
      hex: '#2D6A4F',
      role: 'Supporting Green',
      usage: 'Section panels, hover states, secondary backgrounds. Slightly lighter for breathing room.',
    },
    {
      name: 'Mid Green',
      hex: '#40916C',
      role: 'Interactive',
      usage: 'Active states, hover, progress indicators, accents on dark green backgrounds.',
    },
    {
      name: 'Light Green',
      hex: '#74C69D',
      role: 'Subtle Tint',
      usage: 'Dividers, highlights, very light backgrounds. Brings air into dense green sections.',
    },
  ],
  gold: [
    {
      name: 'Honor Gold',
      hex: '#C9931A',
      role: 'Primary Accent',
 usage: 'All key CTAs, logo accents, badge borders, highlight elements. This is the emotional anchor, honor, valor.',
    },
    {
      name: 'Bright Amber',
      hex: '#F4B942',
      role: 'Warm Accent',
      usage: 'Hover states, gradient endpoints, icon accents. Warmer and more energetic than Honor Gold.',
    },
    {
      name: 'Pale Gold',
      hex: '#F8E4A0',
      role: 'Tint / Glow',
      usage: 'Text highlights on dark green, subtle glows, very light tint panels. Sparingly.',
    },
  ],
  neutral: [
    {
      name: 'Warm Cream',
      hex: '#F5F0E8',
      role: 'Primary Light BG',
 usage: 'Alternating sections, card surfaces, warm white alternative. Not clinical white, warm.',
    },
    {
      name: 'Cream Dark',
      hex: '#EDE4D0',
      role: 'Subtle Surface',
      usage: 'Borders on cream, zebra sections, code blocks on light. Adds structure without weight.',
    },
    {
      name: 'Warm White',
      hex: '#FDFAF5',
      role: 'Page Background',
 usage: 'Root background. Slightly warm, this brand is never cold.',
    },
  ],
  text: [
    { name: 'Text Dark', hex: '#1A1208', role: 'Headlines on Light' },
    { name: 'Text Mid', hex: '#3D2B1A', role: 'Body on Light' },
    { name: 'Text Light', hex: '#7A6040', role: 'Secondary / Captions' },
    { name: 'Cream on Dark', hex: '#F5F0E8', role: 'Headlines on Green' },
    { name: 'Muted on Dark', hex: 'rgba(245,240,232,0.55)', role: 'Body on Green' },
  ],
}

const typeScale = [
  {
    role: 'Display / Hero',
    font: 'Playfair Display',
    weight: '900',
    size: 'clamp(3rem, 8vw, 5.5rem)',
    tracking: '-0.01em',
    lh: '1.0',
 notes: 'Maximum dignity. Hero titles, campaign headlines. Sentence case, this is not industrial ALL CAPS.',
    sample: 'Valor to Victory',
  },
  {
    role: 'H1 / Section Title',
    font: 'Playfair Display',
    weight: '700',
    size: 'clamp(2rem, 4vw, 3.25rem)',
    tracking: '-0.01em',
    lh: '1.1',
    notes: 'Primary section headers. Dignified, not shouting.',
    sample: 'The Journey Home Begins Here',
  },
  {
    role: 'H2 / Sub-section',
    font: 'Playfair Display',
    weight: '700',
    size: 'clamp(1.5rem, 2.5vw, 2rem)',
    tracking: 'normal',
    lh: '1.2',
    notes: 'Sub-sections, card group headers. Can mix with Source Sans kickers above.',
    sample: 'VA Loan Guidance',
  },
  {
    role: 'Kicker / Label',
    font: 'Source Sans 3',
    weight: '700',
    size: '11px',
    tracking: '0.18em',
    lh: '1.2',
    notes: 'Section kickers, metadata, tags. ALWAYS uppercase. Gold color on dark, Forest Green on light.',
    sample: 'VETERAN HOMEOWNERSHIP',
  },
  {
    role: 'Body Large',
    font: 'Source Sans 3',
    weight: '400',
    size: '17px',
    tracking: 'normal',
    lh: '1.70',
    notes: 'Hero subheads, intro paragraphs. Max 600px wide for readability.',
    sample: 'Helping veterans achieve the homeownership they have earned through service.',
  },
  {
    role: 'Body',
    font: 'Source Sans 3',
    weight: '400',
    size: '15px',
    tracking: 'normal',
    lh: '1.65',
    notes: 'Standard body copy. Clean, warm, readable. Max 640px.',
    sample: 'From VA loan education to closing day, we walk beside you every step of the way.',
  },
  {
    role: 'Accent / Alt',
    font: 'Libre Baskerville',
    weight: '700',
    size: '13px',
    tracking: '0.06em',
    lh: '1.4',
    notes: 'Pull quotes, decorative callouts, mission statements. Italic available for emotional moments.',
    sample: 'SERVICE. SACRIFICE. HOME.',
  },
  {
    role: 'Buttons',
    font: 'Source Sans 3',
    weight: '600',
    size: '13px',
    tracking: '0.10em',
    lh: '1.2',
    notes: 'UPPERCASE on primary CTAs. Sentence case on ghost/text buttons.',
    sample: 'START YOUR APPLICATION',
  },
]

const logoOptions = [
  {
    num: 'C06',
    name: 'Eagle + Key Shield',
    tag: 'Chosen',
 sub: 'Eagle over ornate key, inside a pointed shield, the primary mark',
    src: '/images/v2v/nobg/c06-nobg.png',
    srcFull: '/images/v2v/nobg/c06.png',
    palette: [
      { hex: '#1B4332', label: 'Forest' },
      { hex: '#C9931A', label: 'Gold' },
      { hex: '#F5F0E8', label: 'Cream' },
    ],
    symbolism: [
 'Eagle atop the mark, freedom, vigilance, American pride',
 'Ornate key, unlocking homeownership, earned access',
 'Shield form, protection through service honored',
 'Green foundation, prosperity, growth, land ownership',
    ],
    typo: 'Playfair Display 900 + Source Sans 3',
  },
  {
    num: 'C01',
 name: 'Eagle + Key Shield, Alt',
    tag: null,
 sub: 'Alternate composition, more vertical, badge-friendly',
    src: '/images/v2v/nobg/c01-nobg.png',
    palette: [
      { hex: '#1B4332', label: 'Forest' },
      { hex: '#C9931A', label: 'Gold' },
      { hex: '#F5F0E8', label: 'Cream' },
    ],
    symbolism: [
 'Shield silhouette, protection, military honor',
 'Eagle portrait, strength, American pride, authority',
 'Key at base, access, earned right to a home',
 'Vertical stack, clean for social profile icons',
    ],
    typo: 'Playfair Display 700 + Source Sans 3 600',
  },
  {
    num: 'C05',
    name: 'The Threshold',
    tag: null,
 sub: 'Open door + eagle + sunlight, the veteran\'s journey home made visual',
    src: '/images/v2v/nobg/c05-nobg.png',
    palette: [
      { hex: '#2D6A4F', label: 'Deep' },
      { hex: '#F4B942', label: 'Amber' },
      { hex: '#F5F0E8', label: 'Light' },
    ],
    symbolism: [
 'Open door, the moment of arrival, new chapter beginning',
 'Sunlight rays through door, hope, warmth after service',
 'Eagle flying through, freedom meets homecoming',
 'Trees at base, roots, stability, finally home',
    ],
    typo: 'Libre Baskerville 700 + Source Sans 3 300',
  },
]

const logoRules = [
  {
    rule: 'Never alter the mark',
    detail: 'No color substitutions, no rotations, no drop shadows, no filters. The ValorC06 mark is locked.',
  },
  {
    rule: 'Minimum clear space',
    detail: 'Equal to the height of the shield on all four sides. No text, icons, or imagery may intrude.',
  },
  {
    rule: 'Minimum size',
    detail: '80px wide for digital. 0.75 inch for print. Below this threshold the detail is lost.',
  },
  {
    rule: 'Approved backgrounds only',
    detail: 'Forest Green, Warm Cream, Warm White, or transparent. Never on busy photography without a solid panel.',
  },
  {
    rule: 'Color version priority',
    detail: 'Full color first. One-color gold on dark green when needed. Never grayscale unless black-and-white print.',
  },
  {
    rule: 'No wordmark modification',
    detail: 'If a wordmark is used with the mark, it must be Playfair Display 900. No font substitutions.',
  },
]

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function ValorBrand() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(null)
  const [showNav, setShowNav] = useState(false)

  // Inject Google Fonts
  useEffect(() => {
    if (!document.querySelector('link[href*="Playfair+Display"]')) {
      const fontLink = document.createElement('link')
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=Source+Sans+3:wght@300;400;600;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap'
      fontLink.rel = 'stylesheet'
      document.head.appendChild(fontLink)
    }
  }, [])

  // IntersectionObserver for nav
  useEffect(() => {
    const heroEl = document.getElementById('section-hero')
    const sectionIds = NAV_SECTIONS.map(s => s.id)

    const heroObserver = new IntersectionObserver(
      ([entry]) => setShowNav(!entry.isIntersecting),
      { threshold: 0.1 }
    )
    if (heroEl) heroObserver.observe(heroEl)

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActiveSection(visible[0].target.id)
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

  return (
    <div style={{ background: C.warmWhite, minHeight: '100vh', fontFamily: F.body }}>

      {/* Quick Navigation */}
      {showNav && <QuickNav activeSection={activeSection} />}

      {/* ============================================================ */}
      {/*  HERO / MASTHEAD                                              */}
      {/* ============================================================ */}
      <section
        id="section-hero"
        style={{
          background: `linear-gradient(160deg, ${C.forestGreen} 0%, #163828 40%, ${C.forestGreen} 100%)`,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle texture overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.025 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="valor-grid" patternUnits="userSpaceOnUse" width="60" height="60">
                <rect x="0" y="0" width="60" height="60" fill="none" stroke="#F4B942" strokeWidth="0.5" />
                <rect x="0" y="0" width="30" height="30" fill="none" stroke="#F4B942" strokeWidth="0.25" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#valor-grid)" />
          </svg>
        </div>

        {/* Radial glow — top right */}
        <div style={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(201,147,26,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <MaxWidth>
          {/* Nav row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 80 }}>
            <button
              onClick={() => navigate('/brands')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none',
                color: 'rgba(245,240,232,0.5)',
                cursor: 'pointer', fontFamily: F.body, fontSize: 14,
                transition: 'color 200ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.warmCream}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,240,232,0.5)'}
            >
              <ArrowLeft size={16} /> Back to Brands
            </button>
            <Badge color={C.brightAmber}>v1.0</Badge>
          </div>

          {/* Logo mark */}
          <div style={{ marginBottom: 48 }}>
            <img
              src="/images/v2v/nobg/c06-nobg.png"
 alt="Valor to Victory, ValorC06 Logo"
              style={{
                width: 'clamp(100px, 18vw, 180px)',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 40px rgba(201,147,26,0.18))',
              }}
            />
          </div>

          {/* Title block */}
          <div style={{ position: 'relative' }}>
            <div style={{ marginBottom: 24 }}>
              <Badge color="rgba(244,185,66,0.6)">Brand Identity System</Badge>
            </div>

            <h1 style={{
              fontFamily: F.display,
              fontSize: 'clamp(56px, 12vw, 160px)',
              fontWeight: 900,
              color: C.warmCream,
              lineHeight: 0.92,
              letterSpacing: '-0.01em',
              margin: 0,
            }}>
              Valor
              <br />
              <span style={{ color: C.brightAmber }}>to Victory</span>
            </h1>

            <p style={{
              fontFamily: F.body,
              fontSize: 16,
              color: 'rgba(245,240,232,0.60)',
              marginTop: 28,
              maxWidth: 500,
              lineHeight: 1.65,
            }}>
              Veteran homeownership. Patriotic warmth, not corporate institution. Green for growth and land. Gold for honor and valor earned.
            </p>

            {/* Meta strip */}
            <div style={{
              display: 'flex', gap: 40, marginTop: 48, flexWrap: 'wrap',
              borderTop: `1px solid ${C.whiteBorder}`, paddingTop: 32,
            }}>
              {[
                { label: 'Client', value: 'Valor to Victory' },
                { label: 'Mission', value: 'Veteran Homeownership' },
                { label: 'Logo', value: 'ValorC06', accent: true },
                { label: 'Version', value: '1.0' },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{
                    fontSize: 10, color: 'rgba(244,185,66,0.55)',
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    marginBottom: 4, fontFamily: F.label, fontWeight: 700,
                  }}>{item.label}</div>
                  <div style={{
                    fontSize: 17, fontWeight: 600,
                    color: item.accent ? C.brightAmber : C.warmCream,
                    fontFamily: F.body,
                  }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div style={{ marginTop: 80, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 2, background: C.honorGold, opacity: 0.6 }} />
            <span style={{
              fontSize: 10, color: 'rgba(245,240,232,0.40)',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              fontFamily: F.label, fontWeight: 700,
            }}>Scroll to explore</span>
          </div>
        </MaxWidth>
      </section>

      <GoldStrip height={3} />

      {/* ============================================================ */}
      {/*  01. LOGO USAGE                                               */}
      {/* ============================================================ */}
      <DarkSection id="section-logo" style={{ scrollMarginTop: 52 }}>
        <MaxWidth>
          <SectionHeader
            num={1}
            title="Logo Usage"
            subtitle="ValorC06 is the chosen mark. It is locked. Everything in this system is designed around it. It does not change."
            dark
          />

          {/* Logo options grid */}
          <div style={{ marginBottom: 64 }}>
            <h3 style={{
              fontFamily: F.label, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: C.brightAmber, marginBottom: 24,
 }}>Logo Options, ValorC06 Chosen</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
              {logoOptions.map((logo, idx) => (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(260px, 320px) 1fr',
                  gap: 40,
                  alignItems: 'start',
                  background: idx === 0 ? 'rgba(244,185,66,0.04)' : 'rgba(255,255,255,0.02)',
                  borderRadius: 16,
                  padding: 32,
                  border: `1px solid ${idx === 0 ? 'rgba(244,185,66,0.20)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  {/* Left: logo displays */}
                  <div>
                    {/* Primary display */}
                    <div style={{
                      background: C.forestGreen,
                      border: `1px solid ${C.greenBorder}`,
                      borderRadius: 10,
                      padding: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 220,
                      marginBottom: 12,
                      position: 'relative',
                    }}>
                      {idx === 0 && (
                        <span style={{
                          position: 'absolute', top: 10, right: 10,
                          background: C.honorGold, color: C.brownDark,
                          fontFamily: F.label, fontSize: 9, fontWeight: 700,
                          letterSpacing: '0.12em', textTransform: 'uppercase',
                          padding: '3px 10px', borderRadius: 3,
                        }}>Chosen</span>
                      )}
                      <img
                        src={logo.src}
                        alt={logo.name}
                        style={{ maxWidth: 180, maxHeight: 180, objectFit: 'contain' }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    </div>

                    {/* Background mockups */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { bg: C.forestGreen, label: 'On Green', border: 'none' },
                        { bg: C.warmCream, label: 'On Cream', border: `1px solid ${C.creamDark}` },
                        { bg: C.honorGold, label: 'On Gold', border: 'none' },
                      ].map((bg, bi) => (
                        <div key={bi} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{
                            background: bg.bg,
                            border: bg.border || 'none',
                            borderRadius: 6,
                            padding: '14px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 64,
                          }}>
                            <img
                              src={logo.src}
                              alt=""
                              style={{ maxWidth: 56, maxHeight: 44, objectFit: 'contain' }}
                              onError={e => { e.target.style.display = 'none' }}
                            />
                          </div>
                          <div style={{
                            fontSize: 9, fontFamily: F.label, fontWeight: 600,
                            letterSpacing: '0.06em', color: 'rgba(245,240,232,0.45)',
                            marginTop: 5, textTransform: 'uppercase',
                          }}>{bg.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Header */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontFamily: F.mono, fontSize: 10,
                          color: 'rgba(244,185,66,0.55)', letterSpacing: '0.08em',
                        }}>{logo.num}</span>
                        <span style={{
                          fontFamily: F.display, fontSize: 20, fontWeight: 700,
                          color: C.warmCream,
                        }}>{logo.name}</span>
                        {logo.tag && (
                          <span style={{
                            background: C.honorGold, color: C.brownDark,
                            fontFamily: F.label, fontSize: 9, fontWeight: 700,
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            padding: '3px 10px', borderRadius: 3,
                          }}>{logo.tag}</span>
                        )}
                      </div>
                      <p style={{ fontFamily: F.body, fontSize: 13, color: 'rgba(245,240,232,0.50)', lineHeight: 1.5 }}>{logo.sub}</p>
                    </div>

                    {/* Palette */}
                    <div>
                      <div style={{
                        fontFamily: F.label, fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.14em',
                        color: 'rgba(244,185,66,0.55)', marginBottom: 10,
                      }}>Palette</div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {logo.palette.map((p, pi) => (
                          <div key={pi} style={{ textAlign: 'center' }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 5,
                              background: p.hex,
                              border: '1px solid rgba(255,255,255,0.08)',
                            }} />
                            <div style={{
                              fontSize: 9, color: 'rgba(245,240,232,0.40)',
                              marginTop: 4, fontFamily: F.label, fontWeight: 600,
                            }}>{p.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Symbolism */}
                    <div>
                      <div style={{
                        fontFamily: F.label, fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.14em',
                        color: 'rgba(244,185,66,0.55)', marginBottom: 10,
                      }}>Symbolism</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {logo.symbolism.map((s, si) => (
                          <li key={si} style={{
                            display: 'flex', alignItems: 'baseline', gap: 8,
                            fontFamily: F.body, fontSize: 13,
                            color: 'rgba(245,240,232,0.70)', lineHeight: 1.6,
                            marginBottom: 4,
                          }}>
 <span style={{ color: C.honorGold, flexShrink: 0 }}>·</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Typography pairing */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid rgba(255,255,255,0.06)`,
                      borderRadius: 8, padding: '14px 16px',
                    }}>
                      <div style={{
                        fontFamily: F.label, fontSize: 9, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.14em',
                        color: 'rgba(244,185,66,0.45)', marginBottom: 8,
                      }}>Type Pairing</div>
                      <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 900, color: C.warmCream, lineHeight: 1.1 }}>
                        Valor to Victory
                      </div>
                      <div style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(245,240,232,0.50)', marginTop: 5 }}>
                        Helping veterans achieve the homeownership they've earned.
                      </div>
                      <div style={{
                        fontFamily: F.serif2, fontSize: 10, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'rgba(244,185,66,0.45)', marginTop: 5,
                      }}>VETERAN HOMEOWNERSHIP MISSION</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logo rules */}
          <div>
            <h3 style={{
              fontFamily: F.display, fontSize: 26, fontWeight: 700,
              color: C.warmCream, marginBottom: 24,
            }}>Logo Rules</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {logoRules.map((item, i) => (
                <div key={i} style={{
                  padding: 24, borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid rgba(255,255,255,0.06)`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.honorGold, flexShrink: 0 }} />
                    <span style={{
                      fontFamily: F.label, fontWeight: 700, fontSize: 12,
                      letterSpacing: '0.06em', color: C.warmCream, textTransform: 'uppercase',
                    }}>{item.rule}</span>
                  </div>
                  <p style={{ color: 'rgba(245,240,232,0.55)', fontSize: 13, lineHeight: 1.65 }}>{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Download row */}
          <div style={{ marginTop: 48 }}>
            <h3 style={{
              fontFamily: F.display, fontSize: 22, fontWeight: 700,
              color: C.warmCream, marginBottom: 20,
            }}>Download Logo Assets</h3>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 16, padding: 28,
              borderRadius: 12, background: 'rgba(255,255,255,0.03)',
              border: `1px solid rgba(255,255,255,0.06)`,
              alignItems: 'center',
            }}>
              {[
                { href: '/images/v2v/nobg/c06-nobg.png', label: 'C06 No BG (PNG)', download: 'valorc06-nobg.png' },
                { href: '/images/v2v/nobg/c06.png', label: 'C06 Full Color (PNG)', download: 'valorc06-full.png' },
                { href: '/images/v2v/nobg/c01-nobg.png', label: 'C01 Alt (PNG)', download: 'valorc01-nobg.png' },
                { href: '/images/v2v/nobg/c05-nobg.png', label: 'Threshold (PNG)', download: 'valor-threshold-nobg.png' },
              ].map((asset, i) => (
                <a
                  key={i}
                  href={asset.href}
                  download={asset.download}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    fontFamily: F.label, fontWeight: 600, fontSize: 12,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: i === 0 ? C.honorGold : 'rgba(255,255,255,0.06)',
                    color: i === 0 ? C.brownDark : C.warmCream,
                    border: `1px solid ${i === 0 ? 'transparent' : 'rgba(255,255,255,0.10)'}`,
                    padding: '10px 20px', borderRadius: 8,
                    cursor: 'pointer', textDecoration: 'none',
                    transition: 'background 200ms ease',
                  }}
                  onMouseEnter={e => { if (i !== 0) e.currentTarget.style.background = 'rgba(255,255,255,0.10)' }}
                  onMouseLeave={e => { if (i !== 0) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {asset.label}
                </a>
              ))}
            </div>
          </div>
        </MaxWidth>
      </DarkSection>

      <GreenStrip height={3} />

      {/* ============================================================ */}
      {/*  02. COLOR SYSTEM                                             */}
      {/* ============================================================ */}
      <LightSection id="section-colors" style={{ scrollMarginTop: 52 }}>
        <MaxWidth>
          <SectionHeader
            num={2}
            title="Color System"
            subtitle="Extracted from the chosen mark and expanded into a full web-ready system. Green anchors. Gold honors. Cream breathes. Do not deviate."
          />

          {/* Why This Palette — brand rationale */}
          <div style={{
            background: C.forestGreen,
            borderRadius: 14,
            padding: '28px 32px',
            marginBottom: 56,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
          }}>
            <div>
              <div style={{
                fontFamily: F.label, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: C.brightAmber, marginBottom: 8,
              }}>Not Navy + Copper</div>
              <p style={{
                fontFamily: F.body, fontSize: 13, color: 'rgba(245,240,232,0.65)',
                lineHeight: 1.65, margin: 0,
              }}>
 That's S3C territory, a trade coalition. V2V is a veteran's journey home. Navy = institutional. Green = growth, land, earned prosperity.
              </p>
            </div>
            <div>
              <div style={{
                fontFamily: F.label, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: C.brightAmber, marginBottom: 8,
              }}>Why Gold, Not Yellow</div>
              <p style={{
                fontFamily: F.body, fontSize: 13, color: 'rgba(245,240,232,0.65)',
                lineHeight: 1.65, margin: 0,
              }}>
                Honor Gold (#C9931A) carries weight and warmth. It's the color of medals, sunsets, and promises kept. Not corporate. Not playful. Dignified.
              </p>
            </div>
          </div>

          {/* Primary — Greens */}
          <div style={{ marginBottom: 56 }}>
            <h3 style={{
              fontFamily: F.label, fontWeight: 700, fontSize: 11,
              letterSpacing: '0.18em', color: C.forestGreen,
              textTransform: 'uppercase', marginBottom: 20,
            }}>Primary / Green Scale</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {colorGroups.primary.map((c, i) => (
                <div key={i}>
                  <div style={{
                    height: 88, borderRadius: 12, background: c.hex,
                    border: '1px solid rgba(0,0,0,0.08)',
                    marginBottom: 10, position: 'relative',
                  }}>
                    <span style={{
                      position: 'absolute', bottom: 8, left: 12,
                      fontFamily: F.mono, fontSize: 10, fontWeight: 700,
                      color: 'rgba(255,255,255,0.65)',
                    }}>{c.hex}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.textDark }}>{c.name}</span>
                    <CopyHex hex={c.hex} />
                  </div>
                  <span style={{
                    display: 'block', fontSize: 10, color: C.textLight,
                    textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 4,
                  }}>{c.role}</span>
                  <p style={{ fontSize: 12, color: C.textLight, lineHeight: 1.55 }}>{c.usage}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gold Accent */}
          <div style={{ marginBottom: 56 }}>
            <h3 style={{
              fontFamily: F.label, fontWeight: 700, fontSize: 11,
              letterSpacing: '0.18em', color: C.honorGold,
              textTransform: 'uppercase', marginBottom: 20,
            }}>Accent / Gold Scale</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {colorGroups.gold.map((c, i) => (
                <div key={i}>
                  <div style={{
                    height: 88, borderRadius: 12, background: c.hex,
                    border: '1px solid rgba(0,0,0,0.08)',
                    marginBottom: 10, position: 'relative',
                  }}>
                    <span style={{
                      position: 'absolute', bottom: 8, left: 12,
                      fontFamily: F.mono, fontSize: 10, fontWeight: 700,
                      color: 'rgba(44,24,16,0.75)',
                    }}>{c.hex}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.textDark }}>{c.name}</span>
                    <CopyHex hex={c.hex} />
                  </div>
                  <span style={{
                    display: 'block', fontSize: 10, color: C.textLight,
                    textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 4,
                  }}>{c.role}</span>
                  <p style={{ fontSize: 12, color: C.textLight, lineHeight: 1.55 }}>{c.usage}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Neutral */}
          <div style={{ marginBottom: 56 }}>
            <h3 style={{
              fontFamily: F.label, fontWeight: 700, fontSize: 11,
              letterSpacing: '0.18em', color: C.textLight,
              textTransform: 'uppercase', marginBottom: 20,
            }}>Neutrals / Cream Scale</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {colorGroups.neutral.map((c, i) => (
                <div key={i}>
                  <div style={{
                    height: 88, borderRadius: 12, background: c.hex,
                    border: `1px solid ${C.creamBorder}`,
                    marginBottom: 10, position: 'relative',
                  }}>
                    <span style={{
                      position: 'absolute', bottom: 8, left: 12,
                      fontFamily: F.mono, fontSize: 10, fontWeight: 700,
                      color: C.textLight,
                    }}>{c.hex}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.textDark }}>{c.name}</span>
                    <CopyHex hex={c.hex} />
                  </div>
                  <span style={{
                    display: 'block', fontSize: 10, color: C.textLight,
                    textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 4,
                  }}>{c.role}</span>
                  <p style={{ fontSize: 12, color: C.textLight, lineHeight: 1.55 }}>{c.usage}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Text Colors */}
          <div style={{ marginBottom: 56 }}>
            <h3 style={{
              fontFamily: F.label, fontWeight: 700, fontSize: 11,
              letterSpacing: '0.18em', color: C.textLight,
              textTransform: 'uppercase', marginBottom: 20,
            }}>Text Colors</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {colorGroups.text.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', borderRadius: 8,
                  background: C.warmCream, border: `1px solid ${C.creamBorder}`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: c.hex,
                    border: '1px solid rgba(0,0,0,0.10)',
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.textDark }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: C.textLight }}>{c.role}</div>
                    <CopyHex hex={c.hex} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Color usage rules */}
          <div style={{
            background: C.warmCream,
            border: `1px solid ${C.creamBorder}`,
            borderRadius: 14, padding: '28px 32px',
          }}>
            <h3 style={{
              fontFamily: F.display, fontSize: 20, fontWeight: 700,
              color: C.forestGreen, marginBottom: 20,
            }}>Color Usage Rules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              {[
                { rule: 'Green leads', detail: 'Forest Green (#1B4332) is always the dominant brand color. Gold accents. Not the other way around.' },
                { rule: 'Never on white', detail: 'Never pure #ffffff backgrounds. Always Warm White (#FDFAF5) or Warm Cream. This brand is never cold or clinical.' },
                { rule: 'Gold for action', detail: 'Honor Gold is for CTAs, badges, highlights, and borders. It signals importance. Use it with restraint.' },
                { rule: 'No color dilution', detail: 'Do not mix in other brand colors (no S3C navy, no AOM red). V2V has its own world. Stay in it.' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.forestGreen, marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: F.label, fontSize: 12, fontWeight: 700, color: C.forestGreen, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.rule}</div>
                    <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6 }}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MaxWidth>
      </LightSection>

      <GoldStrip height={3} />

      {/* ============================================================ */}
      {/*  03. TYPOGRAPHY                                               */}
      {/* ============================================================ */}
      <CreamSection id="section-type" style={{ scrollMarginTop: 52 }}>
        <MaxWidth>
          <SectionHeader
            num={3}
            title="Typography"
 subtitle="Warm serif display. Clean humanist body. This combination reads dignified and approachable, earned authority, not cold institution."
          />

          {/* Font families */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
            marginBottom: 56,
          }}>
            {/* Playfair Display */}
            <div style={{
              background: C.forestGreen,
              borderRadius: 16, padding: 36,
            }}>
              <div style={{
                fontFamily: F.label, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: C.brightAmber, marginBottom: 16,
              }}>Display / Headlines</div>
              <div style={{
                fontFamily: F.display,
                fontSize: 'clamp(32px, 5vw, 56px)',
                fontWeight: 900,
                color: C.warmCream,
                lineHeight: 1.0,
                marginBottom: 12,
              }}>
                Valor to<br />Victory
              </div>
              <div style={{
                fontFamily: F.display, fontSize: 20, fontWeight: 700,
                fontStyle: 'italic', color: 'rgba(245,240,232,0.55)',
                marginBottom: 16,
              }}>
                "Service. Sacrifice. Home."
              </div>
              <div style={{ borderTop: `1px solid rgba(255,255,255,0.10)`, paddingTop: 16 }}>
                <div style={{ fontFamily: F.label, fontSize: 13, fontWeight: 600, color: C.brightAmber, marginBottom: 4 }}>Playfair Display</div>
 <div style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(245,240,232,0.50)' }}>Weights: 700, 900, Roman + Italic</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(245,240,232,0.50)', marginTop: 2 }}>Use: headlines, hero titles, pull quotes</div>
              </div>
            </div>

            {/* Source Sans 3 */}
            <div style={{
              background: C.warmWhite,
              border: `1px solid ${C.creamBorder}`,
              borderRadius: 16, padding: 36,
            }}>
              <div style={{
                fontFamily: F.label, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: C.forestGreen, marginBottom: 16,
              }}>Body / UI</div>
              <div style={{
                fontFamily: F.body, fontSize: 17, fontWeight: 400,
                color: C.textMid, lineHeight: 1.65, marginBottom: 12,
              }}>
                Helping veterans achieve the homeownership they've earned through years of service and sacrifice.
              </div>
              <div style={{
                fontFamily: F.label, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: C.forestGreen, marginBottom: 16,
              }}>
                VETERAN HOMEOWNERSHIP MISSION
              </div>
              <div style={{ borderTop: `1px solid ${C.creamBorder}`, paddingTop: 16 }}>
                <div style={{ fontFamily: F.label, fontSize: 13, fontWeight: 600, color: C.forestGreen, marginBottom: 4 }}>Source Sans 3</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.textLight }}>Weights: 300, 400, 600, 700</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.textLight, marginTop: 2 }}>Use: body, labels, buttons, UI</div>
              </div>
            </div>

            {/* Libre Baskerville — accent */}
            <div style={{
              background: C.warmCream,
              border: `1px solid ${C.creamBorder}`,
              borderRadius: 16, padding: 36,
            }}>
              <div style={{
                fontFamily: F.label, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: C.textLight, marginBottom: 16,
              }}>Accent / Alt Serif</div>
              <div style={{
                fontFamily: F.serif2, fontSize: 22, fontWeight: 700,
                color: C.textDark, lineHeight: 1.2, marginBottom: 12,
              }}>
                Valor to Victory
              </div>
              <div style={{
                fontFamily: F.serif2, fontSize: 14, fontWeight: 400,
                fontStyle: 'italic', color: C.textMid, lineHeight: 1.6, marginBottom: 16,
              }}>
                From service to a place called home. For veterans who have given everything.
              </div>
              <div style={{
                fontFamily: F.serif2, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.10em', textTransform: 'uppercase',
                color: C.textLight,
              }}>VA LOANS · EDUCATION · GUIDANCE</div>
              <div style={{ borderTop: `1px solid ${C.creamBorder}`, paddingTop: 16, marginTop: 16 }}>
                <div style={{ fontFamily: F.label, fontSize: 13, fontWeight: 600, color: C.textDark, marginBottom: 4 }}>Libre Baskerville</div>
 <div style={{ fontFamily: F.body, fontSize: 12, color: C.textLight }}>Weights: 400, 700, Roman + Italic</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.textLight, marginTop: 2 }}>Use: pull quotes, bylines, elegant accents</div>
              </div>
            </div>
          </div>

          {/* Type scale table */}
          <div>
            <h3 style={{
              fontFamily: F.label, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.18em', color: C.forestGreen,
              textTransform: 'uppercase', marginBottom: 24,
            }}>Type Scale</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: `1px solid ${C.creamBorder}`, borderRadius: 14, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '160px 120px 80px 80px 80px 1fr',
                padding: '10px 20px',
                background: C.forestGreen,
                gap: 12,
              }}>
                {['Role', 'Font', 'Weight', 'Size', 'Leading', 'Notes'].map((h, hi) => (
                  <div key={hi} style={{
                    fontFamily: F.label, fontSize: 9, fontWeight: 700,
                    letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: 'rgba(244,185,66,0.7)',
                  }}>{h}</div>
                ))}
              </div>

              {typeScale.map((row, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 120px 80px 80px 80px 1fr',
                  padding: '16px 20px',
                  gap: 12,
                  background: i % 2 === 0 ? C.warmWhite : C.warmCream,
                  borderTop: `1px solid ${C.creamBorder}`,
                  alignItems: 'start',
                }}>
                  <div style={{ fontFamily: F.label, fontSize: 12, fontWeight: 600, color: C.textDark }}>{row.role}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 11, color: C.forestGreen }}>{row.font}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 11, color: C.textLight }}>{row.weight}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 11, color: C.textLight }}>{row.size}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 11, color: C.textLight }}>{row.lh}</div>
                  <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>{row.notes}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Live type samples */}
          <div style={{ marginTop: 56 }}>
            <h3 style={{
              fontFamily: F.label, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.18em', color: C.forestGreen,
              textTransform: 'uppercase', marginBottom: 24,
            }}>Live Samples</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {typeScale.map((row, i) => (
                <div key={i} style={{
                  padding: '24px 32px',
                  background: i % 2 === 0 ? C.warmWhite : C.warmCream,
                  border: `1px solid ${C.creamBorder}`,
                  borderTop: i === 0 ? `1px solid ${C.creamBorder}` : 'none',
                  borderRadius: i === 0 ? '14px 14px 0 0' : i === typeScale.length - 1 ? '0 0 14px 14px' : 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{
                    fontFamily: F.label, fontSize: 9, fontWeight: 700,
                    letterSpacing: '0.18em', textTransform: 'uppercase', color: C.textLight,
                  }}>{row.role} / {row.font} {row.weight}</div>
                  <div style={{
                    fontFamily: row.font === 'Playfair Display'
                      ? F.display
                      : row.font === 'Libre Baskerville'
                      ? F.serif2
                      : F.body,
                    fontSize: row.size,
                    fontWeight: row.weight,
                    letterSpacing: row.tracking,
                    lineHeight: row.lh,
                    color: C.textDark,
                    textTransform: row.role === 'Kicker / Label' || row.role === 'Buttons' ? 'uppercase' : 'none',
                    maxWidth: '700px',
                  }}>{row.sample}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Typography rules */}
          <div style={{
            background: C.forestGreen,
            borderRadius: 14, padding: '28px 32px',
            marginTop: 56,
          }}>
            <h3 style={{
              fontFamily: F.display, fontSize: 22, fontWeight: 700,
              color: C.warmCream, marginBottom: 20,
            }}>Typography Rules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              {[
 { rule: 'Sentence case for Playfair', detail: 'Not all-caps. The warmth of this brand comes from dignified sentence case. ALL CAPS feels military and cold, not the register we want.' },
                { rule: 'Kickers always uppercase', detail: 'Source Sans 3 labels, section kickers, and metadata are ALWAYS uppercase with wide tracking (0.18em+). This is the only place caps live.' },
                { rule: 'Never mix display fonts', detail: 'Playfair + Source Sans 3 is the pairing. Libre Baskerville is accent-only. Do not introduce additional typefaces.' },
                { rule: 'Line length discipline', detail: 'Body text: max 60-65 characters per line (roughly 640px). Playfair display: can be wider. Long lines = harder to read.' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.honorGold, marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: F.label, fontSize: 12, fontWeight: 700, color: C.brightAmber, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.rule}</div>
                    <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.60)', lineHeight: 1.65 }}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MaxWidth>
      </CreamSection>

      <GreenStrip height={3} />

    </div>
  )
}