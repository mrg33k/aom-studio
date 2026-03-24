import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

/* ------------------------------------------------------------------ */
/*  Included Health Brand Kit                                          */
/*  Client brand reference for AOM video production team              */
/*  Fonts: Syne (headlines) + Space Grotesk (body) + JetBrains Mono  */
/*  Client accent: #0012e7 (electric cobalt)                          */
/*  AOM system accent: #E85D26 (orange) for dividers + system UI     */
/* ------------------------------------------------------------------ */

/* ================================================================== */
/*  DESIGN TOKENS                                                      */
/* ================================================================== */

const C = {
  // System (AOM dark theme)
  night: '#0C0C0C',
  nightCard: '#151515',
  nightBorder: 'rgba(255,255,255,0.10)',
  nightBorderHover: 'rgba(255,255,255,0.20)',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
  aomOrange: '#E85D26',

  // Included Health brand
  ihBlue: '#0012e7',
  ihBlueDark: '#000db5',
  ihBlueLight: '#3344ff',
  ihBlueFaint: 'rgba(0,18,231,0.08)',
  ihBlueFaintHover: 'rgba(0,18,231,0.14)',
  ihBlueBorder: 'rgba(0,18,231,0.25)',
  ihDark: '#1b1b1a',
  ihGray: '#919ea6',
  ihWhite: '#ffffff',
}

const F = {
  headline: '"Syne", sans-serif',
  body: '"Space Grotesk", sans-serif',
  mono: '"JetBrains Mono", monospace',
}

/* ================================================================== */
/*  NAV SECTIONS                                                       */
/* ================================================================== */

const NAV_SECTIONS = [
  { id: 'section-overview', num: '01', label: 'Overview' },
  { id: 'section-colors', num: '02', label: 'Colors' },
  { id: 'section-type', num: '03', label: 'Type' },
  { id: 'section-logo', num: '04', label: 'Logo' },
  { id: 'section-voice', num: '05', label: 'Voice' },
  { id: 'section-visual', num: '06', label: 'Visual' },
  { id: 'section-messaging', num: '07', label: 'Messaging' },
  { id: 'section-application', num: '08', label: 'Application' },
]

/* ================================================================== */
/*  UTILITIES                                                          */
/* ================================================================== */

function CopyHex({ hex, light = false }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(hex)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        color: light ? 'rgba(255,255,255,0.7)' : C.textMuted,
      }}
      title="Copy hex"
    >
      <span style={{ fontFamily: F.mono, fontSize: 13, color: 'inherit' }}>{hex}</span>
      {copied
        ? <Check size={12} color={C.aomOrange} />
        : <Copy size={12} style={{ opacity: 0.4 }} />}
    </button>
  )
}

function MonoLabel({ children }) {
  return (
    <span style={{
      fontFamily: F.mono,
      fontSize: 10,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: C.textMuted,
    }}>
      {children}
    </span>
  )
}

function OrangeDivider() {
  return (
    <div style={{
      width: 48,
      height: 2,
      background: C.aomOrange,
      margin: '12px 0 20px',
      borderRadius: 1,
    }} />
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <MonoLabel>{children}</MonoLabel>
      <OrangeDivider />
    </div>
  )
}

function SectionTitle({ children, light = true }) {
  return (
    <h2 style={{
      fontFamily: F.headline,
      fontSize: 'clamp(32px, 4vw, 52px)',
      fontWeight: 800,
      color: light ? C.textLight : C.ihDark,
      lineHeight: 1.05,
      margin: '0 0 20px',
      letterSpacing: '-0.01em',
    }}>
      {children}
    </h2>
  )
}

function BlueDivider() {
  return (
    <div style={{
      width: 48,
      height: 2,
      background: C.ihBlue,
      margin: '12px 0 20px',
      borderRadius: 1,
    }} />
  )
}

function FadeUp({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}

function Card({ children, style: s = {} }) {
  return (
    <div style={{
      background: C.nightCard,
      border: `1px solid ${C.nightBorder}`,
      borderRadius: 16,
      padding: 28,
      ...s,
    }}>
      {children}
    </div>
  )
}

function BlueCard({ children, style: s = {} }) {
  return (
    <div style={{
      background: C.ihBlueFaint,
      border: `1px solid ${C.ihBlueBorder}`,
      borderRadius: 16,
      padding: 28,
      ...s,
    }}>
      {children}
    </div>
  )
}

/* ================================================================== */
/*  QUICK NAV                                                          */
/* ================================================================== */

function QuickNav({ activeSection, showNav }) {
  const navRef = useRef(null)

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 54
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    if (!navRef.current || !activeSection) return
    const activeBtn = navRef.current.querySelector(`[data-section="${activeSection}"]`)
    if (activeBtn) {
      const nav = navRef.current
      nav.scrollTo({
        left: activeBtn.offsetLeft - nav.offsetWidth / 2 + activeBtn.offsetWidth / 2,
        behavior: 'smooth',
      })
    }
  }, [activeSection])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: 'rgba(12,12,12,0.96)',
      borderBottom: `1px solid ${C.nightBorder}`,
      backdropFilter: 'blur(16px)',
      transform: showNav ? 'translateY(0)' : 'translateY(-100%)',
      transition: 'transform 280ms ease',
    }}>
      <div
        ref={navRef}
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
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
                fontFamily: F.mono,
                fontWeight: isActive ? 700 : 500,
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: isActive ? C.textLight : C.textMuted,
                background: 'none',
                border: 'none',
                borderBottom: isActive ? `2px solid ${C.ihBlue}` : '2px solid transparent',
                padding: '14px 14px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 200ms ease, border-color 200ms ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = C.textLight }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.textMuted }}
            >
              <span style={{ color: isActive ? C.ihBlue : 'rgba(138,132,124,0.5)', marginRight: 4, fontSize: 10 }}>
                {sec.num}
              </span>
              {sec.label}
            </button>
          )
        })}
      </div>
      <style>{`[data-quicknav]::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
}

/* ================================================================== */
/*  COLOR DATA                                                         */
/* ================================================================== */

const COLORS = [
  {
    name: 'Electric Cobalt',
    hex: '#0012e7',
    role: 'Primary Brand Blue',
    usage: 'CTAs, headlines, primary UI elements',
    light: true,
  },
  {
    name: 'Dark Cobalt',
    hex: '#000db5',
    role: 'Blue — Hover / Pressed',
    usage: 'Hover states, pressed buttons',
    light: true,
  },
  {
    name: 'White',
    hex: '#ffffff',
    role: 'Background / Reverse Text',
    usage: 'Primary background, text on dark surfaces',
    light: false,
  },
  {
    name: 'Ink',
    hex: '#1b1b1a',
    role: 'Dark Text',
    usage: 'Body copy, headlines on white',
    light: true,
  },
  {
    name: 'Slate',
    hex: '#919ea6',
    role: 'Secondary Text / Gray',
    usage: 'Captions, metadata, secondary UI',
    light: true,
  },
]

const GRADIENT_EXAMPLES = [
  {
    name: 'Blue to White',
    gradient: 'linear-gradient(135deg, #0012e7 0%, #3344ff 40%, #ffffff 100%)',
    usage: 'Section transitions, hero overlays',
  },
  {
    name: 'Soft Blue Wash',
    gradient: 'linear-gradient(180deg, rgba(0,18,231,0.06) 0%, rgba(255,255,255,0) 100%)',
    usage: 'Gentle section backgrounds',
    dark: true,
  },
  {
    name: 'Blue Depth',
    gradient: 'linear-gradient(135deg, #000db5 0%, #0012e7 50%, #3344ff 100%)',
    usage: 'Bold hero backgrounds',
    light: true,
  },
]

/* ================================================================== */
/*  VOICE DATA                                                         */
/* ================================================================== */

const VOICE_DOS = [
  'Warm and human — write like you care',
  'Confident without being corporate',
  'Data-backed — use the numbers (>4% trend reduction, etc.)',
  'Inclusive language — "everyone" not "patients"',
  'Action-oriented CTAs that move people forward',
  '"We\'re raising the standard" energy',
]

const VOICE_DONTS = [
  'No cold clinical language or medical jargon',
  'No empty corporate speak ("synergize", "leverage")',
  'No fear-based messaging about health',
  'No small print that buries the benefit',
  'No exclusionary or assumption-heavy language',
  'No generic "Contact us today!" filler',
]

const MESSAGING_PILLARS = [
  {
    pillar: 'Access',
    description: 'Healthcare when you need it, how you need it. Virtual + in-person. No waiting, no barriers.',
    proof: 'Virtual care on-demand, 24/7',
  },
  {
    pillar: 'Answers',
    description: 'Cut through the complexity. AI + EQ — data intelligence plus human empathy.',
    proof: 'AI-driven recommendations, human advocacy',
  },
  {
    pillar: 'Advocacy',
    description: 'Someone in your corner. Navigating the system so you don\'t have to.',
    proof: '>4% reduction in healthcare trend in year one',
  },
]

/* ================================================================== */
/*  APPLICATION NOTES DATA                                             */
/* ================================================================== */

const VIDEO_SPECS = [
  {
    element: 'Title Cards',
    guidance: 'Clean white background. Included Health blue (#0012e7) for the wordmark. Bold sans-serif headline. Tagline in slate gray (#919ea6). No clutter.',
  },
  {
    element: 'Lower Thirds',
    guidance: 'White background strip, blue left accent bar (4px). Name in dark ink (#1b1b1a), title in slate (#919ea6). Soft fade-in from left.',
  },
  {
    element: 'End Screens',
    guidance: 'IH blue (#0012e7) full-bleed or white with blue CTA block. "Designed to treat you better.™" tagline. Logo center. URL below.',
  },
  {
    element: 'B-Roll Overlays',
    guidance: 'Soft blue vignette on footage transitions. Text in white, minimum 18px. Keep overlays at 60-70% opacity max.',
  },
  {
    element: 'Interview Setup',
    guidance: 'Warm, natural environment. Avoid clinical/hospital look. Confident but relaxed framing. Eye level or slight upward angle.',
  },
  {
    element: 'Motion Graphics',
    guidance: 'Clean, purposeful animation. Blue color as accent only. Stats should animate in (count-up style). No flashy or distracting effects.',
  },
]

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function IncludedHealthBrand() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(null)
  const [showNav, setShowNav] = useState(false)

  // Inject Google Fonts
  useEffect(() => {
    if (!document.querySelector('link[href*="Syne"]')) {
      const link = document.createElement('link')
      link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
  }, [])

  // IntersectionObserver for nav
  useEffect(() => {
    const heroEl = document.getElementById('hero-section')
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
    <div style={{ background: C.night, minHeight: '100vh', fontFamily: F.body }}>
      <QuickNav activeSection={activeSection} showNav={showNav} />

      {/* ============================================================ */}
      {/* HERO                                                         */}
      {/* ============================================================ */}
      <section
        id="hero-section"
        style={{
          background: C.night,
          padding: 'clamp(64px, 10vw, 112px) clamp(24px, 5vw, 80px) clamp(64px, 8vw, 96px)',
          borderBottom: `1px solid ${C.nightBorder}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Back link */}
          <button
            onClick={() => navigate('/brands')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.textMuted,
              fontFamily: F.mono,
              fontSize: 12,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 48,
              padding: 0,
              transition: 'color 200ms ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = C.textLight}
            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
          >
            <ArrowLeft size={14} />
            Back to Brands
          </button>

          <FadeUp>
            <MonoLabel>Client Brand Kit</MonoLabel>
            <OrangeDivider />
            <h1 style={{
              fontFamily: F.headline,
              fontSize: 'clamp(48px, 7vw, 88px)',
              fontWeight: 800,
              color: C.textLight,
              lineHeight: 1.0,
              margin: '0 0 24px',
              letterSpacing: '-0.02em',
            }}>
              Included Health
            </h1>
            <p style={{
              fontFamily: F.body,
              fontSize: 'clamp(17px, 2vw, 20px)',
              color: C.textMuted,
              lineHeight: 1.65,
              maxWidth: 600,
              margin: '0 0 48px',
            }}>
              Personalized all-in-one healthcare — virtual care, navigation, and advocacy
              for employers, health plans, unions, and the public sector.
            </p>

            {/* Metadata row */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 32,
            }}>
              {[
                { label: 'Client', value: 'Included Health, Inc.' },
                { label: 'Industry', value: 'Healthcare Technology' },
                { label: 'HQ', value: 'San Francisco, CA' },
                { label: 'Employees', value: '1,700+' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 16, fontWeight: 600, color: C.textLight }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>

          {/* IH Blue accent band */}
          <FadeUp delay={0.15}>
            <div style={{
              marginTop: 56,
              padding: '20px 24px',
              background: C.ihBlueFaint,
              border: `1px solid ${C.ihBlueBorder}`,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: C.ihBlue,
                flexShrink: 0,
              }} />
              <p style={{
                fontFamily: F.body,
                fontSize: 16,
                color: C.textMuted,
                margin: 0,
                lineHeight: 1.5,
              }}>
                <span style={{ color: C.ihBlue, fontWeight: 600 }}>Designed to treat you better.™</span>
                {' '}Access. Answers. Advocacy. We're raising the standard of healthcare for everyone.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 01 BRAND OVERVIEW                                            */}
      {/* ============================================================ */}
      <section
        id="section-overview"
        style={{
          background: C.nightCard,
          padding: 'clamp(56px, 8vw, 96px) clamp(24px, 5vw, 80px)',
          borderBottom: `1px solid ${C.nightBorder}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeUp>
            <SectionLabel>01 — Brand Overview</SectionLabel>
            <SectionTitle>Who They Are</SectionTitle>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 48 }}>
            <FadeUp delay={0.05}>
              <Card>
                <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.ihBlue, marginBottom: 12 }}>
                  The Company
                </div>
                <p style={{ fontFamily: F.body, fontSize: 16, color: C.textLight, lineHeight: 1.65, margin: 0 }}>
                  Included Health formed in 2021 from the merger of Grand Rounds and Doctor On Demand — bringing together two category leaders in healthcare navigation and virtual care into one unified platform.
                </p>
              </Card>
            </FadeUp>

            <FadeUp delay={0.1}>
              <Card>
                <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.ihBlue, marginBottom: 12 }}>
                  What They Do
                </div>
                <p style={{ fontFamily: F.body, fontSize: 16, color: C.textLight, lineHeight: 1.65, margin: 0 }}>
                  A personalized all-in-one healthcare platform serving employers, health plans, unions, and the public sector. Virtual care, expert second opinions, navigation, and real human advocacy — all in one place.
                </p>
              </Card>
            </FadeUp>

            <FadeUp delay={0.15}>
              <Card>
                <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.ihBlue, marginBottom: 12 }}>
                  The Approach
                </div>
                <p style={{ fontFamily: F.body, fontSize: 16, color: C.textLight, lineHeight: 1.65, margin: 0 }}>
                  AI + EQ — artificial intelligence meets emotional intelligence. Data-driven decisions backed by genuine human care. Healthcare without the headaches, complexity stripped away.
                </p>
              </Card>
            </FadeUp>
          </div>

          {/* Key stats */}
          <FadeUp delay={0.2}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 1,
              background: C.nightBorder,
              border: `1px solid ${C.nightBorder}`,
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              {[
                { stat: '>4%', label: 'Reduction in healthcare trend\nin year one' },
                { stat: '2021', label: 'Formed via Grand Rounds\n+ Doctor On Demand merger' },
                { stat: '1,700+', label: 'Employees\nSan Francisco, CA' },
                { stat: '2024', label: 'Fast Company Most\nInnovative Company' },
              ].map(({ stat, label }) => (
                <div key={stat} style={{ background: C.night, padding: '28px 24px' }}>
                  <div style={{
                    fontFamily: F.headline,
                    fontSize: 'clamp(28px, 4vw, 40px)',
                    fontWeight: 800,
                    color: C.ihBlue,
                    lineHeight: 1,
                    marginBottom: 8,
                  }}>
                    {stat}
                  </div>
                  <div style={{
                    fontFamily: F.body,
                    fontSize: 14,
                    color: C.textMuted,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                  }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 02 COLOR PALETTE                                             */}
      {/* ============================================================ */}
      <section
        id="section-colors"
        style={{
          background: C.night,
          padding: 'clamp(56px, 8vw, 96px) clamp(24px, 5vw, 80px)',
          borderBottom: `1px solid ${C.nightBorder}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeUp>
            <SectionLabel>02 — Color Palette</SectionLabel>
            <SectionTitle>Brand Colors</SectionTitle>
            <p style={{ fontFamily: F.body, fontSize: 17, color: C.textMuted, lineHeight: 1.65, maxWidth: 560, margin: '0 0 48px' }}>
              Electric cobalt is the core. Clean, confident, and distinctly Included Health.
              Click any hex to copy.
            </p>
          </FadeUp>

          {/* Main swatches */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
            {COLORS.map((color, i) => (
              <FadeUp key={color.hex} delay={i * 0.05}>
                <div
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: `1px solid ${C.nightBorder}`,
                    cursor: 'pointer',
                    transition: 'transform 200ms ease, box-shadow 200ms ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,18,231,0.2)`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Swatch */}
                  <div style={{
                    height: 120,
                    background: color.hex,
                    position: 'relative',
                    border: color.hex === '#ffffff' ? `1px solid ${C.nightBorder}` : 'none',
                  }} />
                  {/* Info */}
                  <div style={{ background: C.nightCard, padding: '16px 16px' }}>
                    <div style={{ fontFamily: F.headline, fontSize: 16, fontWeight: 700, color: C.textLight, marginBottom: 4 }}>
                      {color.name}
                    </div>
                    <div style={{ fontFamily: F.mono, fontSize: 11, color: C.textMuted, marginBottom: 8, letterSpacing: '0.05em' }}>
                      {color.role}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <CopyHex hex={color.hex} />
                    </div>
                    <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMuted, marginTop: 8, lineHeight: 1.5 }}>
                      {color.usage}
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          {/* Gradient examples */}
          <FadeUp delay={0.2}>
            <div style={{ marginBottom: 16 }}>
              <MonoLabel>Gradient Examples</MonoLabel>
              <OrangeDivider />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {GRADIENT_EXAMPLES.map((g, i) => (
                <div key={g.name} style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: `1px solid ${C.nightBorder}`,
                }}>
                  <div style={{ height: 96, background: g.gradient }} />
                  <div style={{ background: C.nightCard, padding: '14px 16px' }}>
                    <div style={{ fontFamily: F.headline, fontSize: 15, fontWeight: 700, color: C.textLight, marginBottom: 4 }}>
                      {g.name}
                    </div>
                    <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
                      {g.usage}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>

          {/* AOM note */}
          <FadeUp delay={0.25}>
            <div style={{
              marginTop: 40,
              padding: '20px 24px',
              background: 'rgba(232,93,38,0.06)',
              border: `1px solid rgba(232,93,38,0.2)`,
              borderRadius: 12,
            }}>
              <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.aomOrange, marginBottom: 8 }}>
                AOM Production Note
              </div>
              <p style={{ fontFamily: F.body, fontSize: 16, color: C.textMuted, margin: 0, lineHeight: 1.6 }}>
                In AOM video deliverables, IH Blue (#0012e7) is the CLIENT accent. AOM's orange (#E85D26) does NOT appear in Included Health content — it's an internal system color only. Keep brand colors pure.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 03 TYPOGRAPHY                                                */}
      {/* ============================================================ */}
      <section
        id="section-type"
        style={{
          background: C.nightCard,
          padding: 'clamp(56px, 8vw, 96px) clamp(24px, 5vw, 80px)',
          borderBottom: `1px solid ${C.nightBorder}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeUp>
            <SectionLabel>03 — Typography</SectionLabel>
            <SectionTitle>Type Recommendations</SectionTitle>
            <p style={{ fontFamily: F.body, fontSize: 17, color: C.textMuted, lineHeight: 1.65, maxWidth: 560, margin: '0 0 48px' }}>
              Included Health uses a clean modern sans-serif system. Bold, confident headers with standard body weights. No condensed or slab serifs — this brand lives in clarity.
            </p>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 48 }}>
            {[
              {
                label: 'Display / Hero',
                weight: 'Bold 700–800',
                size: '48–88px',
                usage: 'Page titles, video title cards, hero moments',
                sample: 'Healthcare Without the Headaches',
                sampleSize: 28,
                sampleWeight: 800,
              },
              {
                label: 'Section Header',
                weight: 'Semibold 600',
                size: '32–48px',
                usage: 'Section titles, video lower third names, chapter headers',
                sample: 'Access. Answers. Advocacy.',
                sampleSize: 22,
                sampleWeight: 600,
              },
              {
                label: 'Body / Subhead',
                weight: 'Regular 400',
                size: '16–20px',
                usage: 'Body copy, video subtitles, slide descriptions',
                sample: 'Raising the standard of healthcare for everyone.',
                sampleSize: 17,
                sampleWeight: 400,
              },
              {
                label: 'Labels / Metadata',
                weight: 'Medium 500',
                size: '12–14px',
                usage: 'Job titles, kickers, timestamps, captions',
                sample: 'VP of Benefits • Included Health',
                sampleSize: 14,
                sampleWeight: 500,
              },
            ].map((t, i) => (
              <FadeUp key={t.label} delay={i * 0.07}>
                <Card>
                  <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.ihBlue, marginBottom: 16 }}>
                    {t.label}
                  </div>
                  <div style={{
                    fontFamily: '"Inter", "Helvetica Neue", sans-serif',
                    fontSize: t.sampleSize,
                    fontWeight: t.sampleWeight,
                    color: C.textLight,
                    lineHeight: 1.2,
                    marginBottom: 20,
                    letterSpacing: '-0.01em',
                  }}>
                    {t.sample}
                  </div>
                  <div style={{ borderTop: `1px solid ${C.nightBorder}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { k: 'Weight', v: t.weight },
                      { k: 'Size', v: t.size },
                      { k: 'Usage', v: t.usage },
                    ].map(({ k, v }) => (
                      <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                        <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, flexShrink: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{k}</span>
                        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textLight, lineHeight: 1.4 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </FadeUp>
            ))}
          </div>

          {/* Typography rule */}
          <FadeUp delay={0.25}>
            <div style={{
              padding: '24px 28px',
              background: C.ihBlueFaint,
              border: `1px solid ${C.ihBlueBorder}`,
              borderRadius: 12,
            }}>
              <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.ihBlue, marginBottom: 12 }}>
                Type Rule for Video
              </div>
              <p style={{ fontFamily: F.body, fontSize: 16, color: C.textLight, margin: 0, lineHeight: 1.65 }}>
                Minimum 18px for any on-screen text in video. Lower thirds: name in bold (700), title in regular (400), same clean sans-serif. No decorative or script fonts. This brand earns trust through clarity.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 04 LOGO USAGE                                                */}
      {/* ============================================================ */}
      <section
        id="section-logo"
        style={{
          background: C.night,
          padding: 'clamp(56px, 8vw, 96px) clamp(24px, 5vw, 80px)',
          borderBottom: `1px solid ${C.nightBorder}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeUp>
            <SectionLabel>04 — Logo Usage</SectionLabel>
            <SectionTitle>The Wordmark</SectionTitle>
            <p style={{ fontFamily: F.body, fontSize: 17, color: C.textMuted, lineHeight: 1.65, maxWidth: 560, margin: '0 0 48px' }}>
              Included Health uses a clean modern sans-serif wordmark. No icon — the name carries the brand. Treat it with precision.
            </p>
          </FadeUp>

          {/* Logo presentations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 48 }}>
            {[
              { bg: C.ihWhite, textColor: C.ihBlue, label: 'Primary — On White' },
              { bg: C.ihBlue, textColor: C.ihWhite, label: 'Reversed — On Blue' },
              { bg: C.ihDark, textColor: C.ihWhite, label: 'On Dark' },
            ].map((variant, i) => (
              <FadeUp key={variant.label} delay={i * 0.08}>
                <div style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: `1px solid ${C.nightBorder}`,
                }}>
                  <div style={{
                    background: variant.bg,
                    padding: '48px 32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{
                      fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
                      fontSize: 28,
                      fontWeight: 700,
                      color: variant.textColor,
                      letterSpacing: '-0.01em',
                    }}>
                      Included Health
                    </span>
                  </div>
                  <div style={{
                    background: C.nightCard,
                    padding: '12px 16px',
                    fontFamily: F.mono,
                    fontSize: 11,
                    color: C.textMuted,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}>
                    {variant.label}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          {/* Do's and Don'ts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <FadeUp delay={0.1}>
              <Card>
                <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 16 }}>
                  Do
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'Use the full wordmark on clean backgrounds',
                    'Maintain clear space equal to the height of the "I" on all sides',
                    'Use approved color combinations only',
                    'Scale proportionally — never stretch or squish',
                    'Use white version on brand blue backgrounds',
                  ].map(item => (
                    <li key={item} style={{ fontFamily: F.body, fontSize: 16, color: C.textMuted, lineHeight: 1.5 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </FadeUp>

            <FadeUp delay={0.15}>
              <Card>
                <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#f87171', marginBottom: 16 }}>
                  Don't
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'Don\'t outline or add drop shadows to the logo',
                    'Don\'t place on busy or low-contrast backgrounds',
                    'Don\'t use unofficial color variations',
                    'Don\'t add tagline in the same text block as the logo',
                    'Don\'t use the logo smaller than 80px wide on screen',
                  ].map(item => (
                    <li key={item} style={{ fontFamily: F.body, fontSize: 16, color: C.textMuted, lineHeight: 1.5 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 05 VOICE & TONE                                              */}
      {/* ============================================================ */}
      <section
        id="section-voice"
        style={{
          background: C.nightCard,
          padding: 'clamp(56px, 8vw, 96px) clamp(24px, 5vw, 80px)',
          borderBottom: `1px solid ${C.nightBorder}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeUp>
            <SectionLabel>05 — Voice & Tone</SectionLabel>
            <SectionTitle>How to Write for IH</SectionTitle>
            <p style={{ fontFamily: F.body, fontSize: 17, color: C.textMuted, lineHeight: 1.65, maxWidth: 560, margin: '0 0 48px' }}>
              Warm, confident, empathetic. Anti-corporate-speak. Data-backed but human. People are tired of cold healthcare language — Included Health speaks like a trusted friend who happens to know medicine.
            </p>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>
            <FadeUp delay={0.05}>
              <Card style={{ borderColor: 'rgba(74,222,128,0.15)' }}>
                <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 20 }}>
                  Say This
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {VOICE_DOS.map(item => (
                    <div key={item} style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      background: 'rgba(74,222,128,0.05)',
                      borderRadius: 8,
                      border: '1px solid rgba(74,222,128,0.1)',
                    }}>
                      <span style={{ color: '#4ade80', fontSize: 16, flexShrink: 0, marginTop: 1 }}>+</span>
                      <span style={{ fontFamily: F.body, fontSize: 16, color: C.textLight, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </FadeUp>

            <FadeUp delay={0.1}>
              <Card style={{ borderColor: 'rgba(248,113,113,0.15)' }}>
                <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#f87171', marginBottom: 20 }}>
                  Not This
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {VOICE_DONTS.map(item => (
                    <div key={item} style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      background: 'rgba(248,113,113,0.05)',
                      borderRadius: 8,
                      border: '1px solid rgba(248,113,113,0.1)',
                    }}>
                      <span style={{ color: '#f87171', fontSize: 16, flexShrink: 0, marginTop: 1 }}>–</span>
                      <span style={{ fontFamily: F.body, fontSize: 16, color: C.textMuted, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </FadeUp>
          </div>

          {/* Brand voice attributes */}
          <FadeUp delay={0.15}>
            <div style={{ marginBottom: 20 }}>
              <MonoLabel>Voice Attributes</MonoLabel>
              <OrangeDivider />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { attr: 'Warm', desc: 'Caring without being sappy. Real human empathy.' },
                { attr: 'Confident', desc: 'Know-your-stuff energy. Not arrogant, just capable.' },
                { attr: 'Clear', desc: 'Plain language always. Healthcare is complex — the words shouldn\'t be.' },
                { attr: 'Empathetic', desc: 'People dealing with healthcare stress need to feel understood.' },
                { attr: 'Data-backed', desc: 'Proof matters. Use the numbers when you have them.' },
                { attr: 'Human', desc: 'Avoid "clinical" at all costs. Talk like a trusted friend.' },
              ].map((item, i) => (
                <div key={item.attr} style={{
                  padding: '18px 20px',
                  background: C.night,
                  border: `1px solid ${C.nightBorder}`,
                  borderRadius: 10,
                }}>
                  <div style={{ fontFamily: F.headline, fontSize: 18, fontWeight: 700, color: C.ihBlue, marginBottom: 6 }}>
                    {item.attr}
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 14, color: C.textMuted, lineHeight: 1.5 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 06 VISUAL STYLE                                              */}
      {/* ============================================================ */}
      <section
        id="section-visual"
        style={{
          background: C.night,
          padding: 'clamp(56px, 8vw, 96px) clamp(24px, 5vw, 80px)',
          borderBottom: `1px solid ${C.nightBorder}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeUp>
            <SectionLabel>06 — Visual Style</SectionLabel>
            <SectionTitle>Photography Direction</SectionTitle>
            <p style={{ fontFamily: F.body, fontSize: 17, color: C.textMuted, lineHeight: 1.65, maxWidth: 560, margin: '0 0 48px' }}>
              Real people in real moments. Warm, natural light. Healthcare integrated into everyday life — not a sterile hospital. Diverse, authentic, optimistic.
            </p>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 48 }}>
            {[
              {
                title: 'Subject',
                icon: '👤',
                points: [
                  'Diverse representation across age, race, body type',
                  'Real expressions — genuine smiles, thoughtful looks',
                  'People in their environment, not posed studio shots',
                  'Both individuals and families/community',
                ],
              },
              {
                title: 'Lighting',
                icon: '☀️',
                points: [
                  'Warm, natural light whenever possible',
                  'Golden hour or soft window light preferred',
                  'No harsh clinical fluorescent lighting',
                  'Soft shadows, no blown-out whites',
                ],
              },
              {
                title: 'Composition',
                icon: '📐',
                points: [
                  'Relaxed, candid framing over posed',
                  'Eye level or slight upward angle for interviews',
                  'Leave breathing room — don\'t crowd the frame',
                  'Integrate environment: home, workplace, outdoors',
                ],
              },
              {
                title: 'What to Avoid',
                icon: '🚫',
                points: [
                  'No stock-photo sterile white backgrounds',
                  'No stethoscopes or hospital props unless essential',
                  'No overly dramatic lighting or heavy color grading',
                  'No inauthenticity — viewers can smell it',
                ],
              },
            ].map((section, i) => (
              <FadeUp key={section.title} delay={i * 0.07}>
                <Card>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 20 }}>{section.icon}</span>
                    <div style={{ fontFamily: F.headline, fontSize: 18, fontWeight: 700, color: C.textLight }}>
                      {section.title}
                    </div>
                  </div>
                  <ul style={{ margin: 0, padding: '0 0 0 0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {section.points.map(pt => (
                      <li key={pt} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: C.ihBlue,
                          flexShrink: 0,
                          marginTop: 8,
                        }} />
                        <span style={{ fontFamily: F.body, fontSize: 15, color: C.textMuted, lineHeight: 1.55 }}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </FadeUp>
            ))}
          </div>

          {/* Color grading note */}
          <FadeUp delay={0.2}>
            <div style={{
              padding: '24px 28px',
              background: C.ihBlueFaint,
              border: `1px solid ${C.ihBlueBorder}`,
              borderRadius: 12,
            }}>
              <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.ihBlue, marginBottom: 12 }}>
                Color Grading for Video
              </div>
              <p style={{ fontFamily: F.body, fontSize: 16, color: C.textLight, margin: 0, lineHeight: 1.65 }}>
                Warm tones, slightly lifted shadows. Skin tones should be accurate and flattering. Avoid cold/teal looks — this brand lives in warmth. Slight contrast boost is fine. No heavy stylized grades that pull from realism.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 07 KEY MESSAGING                                             */}
      {/* ============================================================ */}
      <section
        id="section-messaging"
        style={{
          background: C.nightCard,
          padding: 'clamp(56px, 8vw, 96px) clamp(24px, 5vw, 80px)',
          borderBottom: `1px solid ${C.nightBorder}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeUp>
            <SectionLabel>07 — Key Messaging</SectionLabel>
            <SectionTitle>What to Feature</SectionTitle>
            <p style={{ fontFamily: F.body, fontSize: 17, color: C.textMuted, lineHeight: 1.65, maxWidth: 560, margin: '0 0 48px' }}>
              The tagline, mission, and proof points. Use these in video titles, graphics, and presentation materials.
            </p>
          </FadeUp>

          {/* Tagline + Mission */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 48 }}>
            <FadeUp delay={0.05}>
              <div style={{
                background: C.ihBlue,
                borderRadius: 16,
                padding: '36px 32px',
              }}>
                <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
                  Tagline
                </div>
                <div style={{
                  fontFamily: '"Inter", "Helvetica Neue", sans-serif',
                  fontSize: 'clamp(22px, 3vw, 32px)',
                  fontWeight: 700,
                  color: C.ihWhite,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}>
                  Designed to treat you better.™
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.1}>
              <div style={{
                background: C.night,
                border: `1px solid ${C.nightBorder}`,
                borderRadius: 16,
                padding: '36px 32px',
              }}>
                <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 16 }}>
                  Mission
                </div>
                <div style={{
                  fontFamily: F.body,
                  fontSize: 18,
                  fontWeight: 500,
                  color: C.textLight,
                  lineHeight: 1.55,
                }}>
                  "Access. Answers. Advocacy. We're raising the standard of healthcare for everyone."
                </div>
              </div>
            </FadeUp>
          </div>

          {/* Three pillars */}
          <FadeUp delay={0.1}>
            <div style={{ marginBottom: 20 }}>
              <MonoLabel>The Three Pillars</MonoLabel>
              <OrangeDivider />
            </div>
          </FadeUp>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 48 }}>
            {MESSAGING_PILLARS.map((p, i) => (
              <FadeUp key={p.pillar} delay={i * 0.07}>
                <Card>
                  <div style={{
                    fontFamily: F.headline,
                    fontSize: 36,
                    fontWeight: 800,
                    color: C.ihBlue,
                    lineHeight: 1,
                    marginBottom: 12,
                  }}>
                    {p.pillar}
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 16, color: C.textLight, lineHeight: 1.65, margin: '0 0 16px' }}>
                    {p.description}
                  </p>
                  <div style={{
                    padding: '8px 12px',
                    background: C.ihBlueFaint,
                    border: `1px solid ${C.ihBlueBorder}`,
                    borderRadius: 8,
                    fontFamily: F.mono,
                    fontSize: 12,
                    color: C.ihBlue,
                  }}>
                    {p.proof}
                  </div>
                </Card>
              </FadeUp>
            ))}
          </div>

          {/* Proof points */}
          <FadeUp delay={0.2}>
            <div style={{ marginBottom: 20 }}>
              <MonoLabel>Proof Points for Video Graphics</MonoLabel>
              <OrangeDivider />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { stat: '>4%', label: 'Reduction in healthcare trend in year one' },
                { stat: 'AI + EQ', label: 'Artificial intelligence meets emotional intelligence' },
                { stat: '2024', label: 'Fast Company Most Innovative Company' },
                { stat: '2026', label: 'BIG Innovation Award — Dot AI' },
                { stat: '1,700+', label: 'Employees serving millions of members' },
                { stat: 'All-in-One', label: 'Virtual care, navigation, advocacy unified' },
              ].map(({ stat, label }) => (
                <div key={stat} style={{
                  padding: '20px 20px',
                  background: C.night,
                  border: `1px solid ${C.nightBorder}`,
                  borderRadius: 10,
                }}>
                  <div style={{ fontFamily: F.headline, fontSize: 24, fontWeight: 800, color: C.ihBlue, marginBottom: 6 }}>
                    {stat}
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 08 APPLICATION NOTES                                         */}
      {/* ============================================================ */}
      <section
        id="section-application"
        style={{
          background: C.night,
          padding: 'clamp(56px, 8vw, 96px) clamp(24px, 5vw, 80px)',
          borderBottom: `1px solid ${C.nightBorder}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeUp>
            <SectionLabel>08 — Application Notes</SectionLabel>
            <SectionTitle>AOM Video Production</SectionTitle>
            <p style={{ fontFamily: F.body, fontSize: 17, color: C.textMuted, lineHeight: 1.65, maxWidth: 560, margin: '0 0 48px' }}>
              Specific guidance for applying the Included Health brand to AOM's video deliverables. Title cards, lower thirds, end screens, and event coverage.
            </p>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 48 }}>
            {VIDEO_SPECS.map((spec, i) => (
              <FadeUp key={spec.element} delay={i * 0.06}>
                <Card>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{
                      width: 4,
                      minHeight: 36,
                      background: C.ihBlue,
                      borderRadius: 2,
                      flexShrink: 0,
                      alignSelf: 'stretch',
                    }} />
                    <div>
                      <div style={{ fontFamily: F.headline, fontSize: 18, fontWeight: 700, color: C.textLight, marginBottom: 8 }}>
                        {spec.element}
                      </div>
                      <p style={{ fontFamily: F.body, fontSize: 16, color: C.textMuted, margin: 0, lineHeight: 1.65 }}>
                        {spec.guidance}
                      </p>
                    </div>
                  </div>
                </Card>
              </FadeUp>
            ))}
          </div>

          {/* Quick reference color bar */}
          <FadeUp delay={0.2}>
            <div style={{ marginBottom: 20 }}>
              <MonoLabel>Quick Reference — Video Color Bar</MonoLabel>
              <OrangeDivider />
            </div>
            <div style={{
              display: 'flex',
              borderRadius: 12,
              overflow: 'hidden',
              border: `1px solid ${C.nightBorder}`,
              height: 64,
            }}>
              {COLORS.map(c => (
                <div
                  key={c.hex}
                  style={{ flex: 1, background: c.hex, position: 'relative', cursor: 'pointer' }}
                  title={`${c.name} — ${c.hex}`}
                  onClick={() => navigator.clipboard.writeText(c.hex)}
                >
                  {c.hex === '#ffffff' && (
                    <div style={{ position: 'absolute', inset: 0, border: `1px solid ${C.nightBorder}` }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex',
              marginTop: 8,
            }}>
              {COLORS.map(c => (
                <div key={c.hex} style={{ flex: 1, textAlign: 'center', paddingTop: 4 }}>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: '0.05em' }}>
                    {c.hex}
                  </span>
                </div>
              ))}
            </div>
          </FadeUp>

          {/* Event context note */}
          <FadeUp delay={0.25}>
            <div style={{
              marginTop: 40,
              padding: '24px 28px',
              background: C.ihBlueFaint,
              border: `1px solid ${C.ihBlueBorder}`,
              borderRadius: 12,
            }}>
              <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.ihBlue, marginBottom: 12 }}>
                Event Context — Client Summit
              </div>
              <p style={{ fontFamily: F.body, fontSize: 16, color: C.textLight, margin: '0 0 16px', lineHeight: 1.65 }}>
                AOM delivered a 3-day production at Included Health's Client Summit. Deliverables include a 60-90s hype reel, 10-15 executive interviews, full session recordings, and b-roll. All brand guidance in this kit applies to those deliverables.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {[
                  'Hype reel: 60-90s, IH blue titles, upbeat pacing',
                  'Interviews: warm setup, eye level, no hospital props',
                  'Session recordings: clean lower thirds, IH wordmark',
                  'B-roll: diverse attendees, real moments, warm light',
                  'Raw delivery: Frame.io with camera LUTs included',
                ].map(note => (
                  <div key={note} style={{
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 8,
                    fontFamily: F.body,
                    fontSize: 13,
                    color: C.textMuted,
                    lineHeight: 1.5,
                  }}>
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOOTER                                                       */}
      {/* ============================================================ */}
      <section style={{
        background: C.nightCard,
        padding: 'clamp(40px, 6vw, 64px) clamp(24px, 5vw, 80px)',
        borderTop: `1px solid ${C.nightBorder}`,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <div style={{ fontFamily: F.headline, fontSize: 18, fontWeight: 700, color: C.textLight, marginBottom: 4 }}>
              Included Health Brand Kit
            </div>
            <div style={{ fontFamily: F.body, fontSize: 14, color: C.textMuted }}>
              Produced by AOM (Ahead of Market) · aheadofmarket.com
            </div>
          </div>
          <button
            onClick={() => navigate('/brands')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: `1px solid ${C.nightBorder}`,
              cursor: 'pointer',
              color: C.textMuted,
              fontFamily: F.mono,
              fontSize: 12,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '10px 20px',
              borderRadius: 8,
              transition: 'color 200ms ease, border-color 200ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = C.textLight
              e.currentTarget.style.borderColor = C.nightBorderHover
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = C.textMuted
              e.currentTarget.style.borderColor = C.nightBorder
            }}
          >
            <ArrowLeft size={14} />
            All Brand Kits
          </button>
        </div>
      </section>
    </div>
  )
}
